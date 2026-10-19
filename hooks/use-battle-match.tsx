import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { fetchMatchState } from "@/api/battleAPI";
import { getClerkToken } from "@/api/apiClients";
import { BattleSocketHandle, connectBattleSocket } from "@/api/battleSocket";
import { useUserMeQuery } from "@/hooks/use-quiz";
import { battleKeys } from "@/hooks/use-battle";
import {
  BattleAnswerProgress,
  BattleMatchResult,
  BattleMatchStateResponse,
  BattleQuestionReview,
} from "@/types/battleModuleTypes";
import { BattleWsInboundEvent } from "@/types/battleWsTypes";

export type BattleConnectionStatus = "connecting" | "open" | "reconnecting" | "failed" | "closed";

export interface DisconnectInfo {
  userId: number;
  deadline: string;
  gracePeriodSeconds: number;
}

// A Next/Skip that's been sent but whose next question hasn't arrived yet.
interface PendingMove {
  questionId: number;
  selectedOption: string | null; // null = Skip
  sentAt: number;
}

const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000];
// Re-send a Next/Skip whose reply hasn't come back after this long -- the
// server treats a repeat as harmless and just answers with the current question.
// Longer than the server's own save limit (BATTLE_ANSWER_SAVE_TIMEOUT_SECONDS,
// 20s), which always replies -- saved or "Couldn't save" -- before then; this
// only catches a reply lost on the way back. Shorter, and resends would queue
// up behind a slow save on the server, each one more slow DB work.
const PENDING_MOVE_RESEND_MS = 25000;

// Server clock minus this device's clock, from a server_time stamp -- the
// match countdown runs on the server's clock, not the phone's. Each sample
// reads low by however long that message took to arrive.
function clockOffsetFrom(serverTime: string | null | undefined): number | null {
  if (!serverTime) return null;
  const parsed = Date.parse(serverTime);
  return Number.isNaN(parsed) ? null : parsed - Date.now();
}

function addProgress(prev: BattleAnswerProgress[], order: number, answered: boolean): BattleAnswerProgress[] {
  if (prev.some((p) => p.question_order === order)) return prev;
  return [...prev, { question_order: order, is_correct: null, answered }];
}

// Central stateful hook for one live match, modeled on hooks/use-chat.ts's
// shape (local state/refs, not React Query — a bidirectional live socket
// doesn't fit a query/mutation model). Owns the WS connection lifecycle
// including reconnect-with-backoff, since the backend already fully
// implements server-side grace-period/reconnect handling and a dropped
// socket on a flaky mobile connection is the realistic common case.
export function useBattleMatch(matchId: number | null) {
  const queryClient = useQueryClient();
  const { data: me } = useUserMeQuery();
  const myUserId = me?.id ?? null;

  const [matchState, setMatchState] = useState<BattleMatchStateResponse | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<BattleConnectionStatus>("connecting");
  const [readyUserIds, setReadyUserIds] = useState<Set<number>>(new Set());
  const [disconnectInfo, setDisconnectInfo] = useState<DisconnectInfo | null>(null);
  const [finalResult, setFinalResult] = useState<BattleMatchResult | null>(null);
  // The player's own per-question review, once the match is over.
  const [review, setReview] = useState<BattleQuestionReview[] | null>(null);
  // The server refused this player's last Next/Skip because the match clock
  // had already hit 0:00 -- the results say so.
  const [lastMoveRefusedByTime, setLastMoveRefusedByTime] = useState(false);
  const [initialLoadError, setInitialLoadError] = useState(false);
  // Questions each side has moved past (answered or skipped), for the
  // progress bars -- self-paced, so the two run independently. Seeded from
  // matchState.my_answers/opponent_answers on load/reconnect, then appended
  // to live from `player_progress` events. Never carries correctness.
  const [myProgress, setMyProgress] = useState<BattleAnswerProgress[]>([]);
  const [opponentProgress, setOpponentProgress] = useState<BattleAnswerProgress[]>([]);
  // Server clock minus device clock (ms). Every sample undershoots by its own
  // network delay, so the best estimate is the LARGEST one seen this match --
  // re-syncing from each (slow) Next reply instead used to nudge the countdown
  // back a little after every answer, as if it had paused while saving.
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const bestOffsetRef = useRef<number | null>(null);
  // True from the moment Next/Skip is sent until the next question arrives --
  // the screen locks options and both buttons for that whole window.
  const [isMoving, setIsMoving] = useState(false);

  const socketRef = useRef<BattleSocketHandle | null>(null);
  const pendingMoveRef = useRef<PendingMove | null>(null);
  const currentQuestionIndexRef = useRef<number | null>(null);
  const subjectRef = useRef<string | null | undefined>(null);
  const unmountedRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualCloseRef = useRef(false);
  const connectRef = useRef<() => void>(() => {});
  const authExpiredToastShownRef = useRef(false);
  const reconnectingToastShownRef = useRef(false);

  useEffect(() => {
    currentQuestionIndexRef.current = matchState?.question_index ?? null;
  }, [matchState?.question_index]);

  useEffect(() => {
    subjectRef.current = matchState?.subject;
  }, [matchState?.subject]);

  // Who "me" is for player_progress -- the profile query, or the match state's
  // own my_progress if that query hasn't loaded yet.
  const myIdRef = useRef<number | null>(null);
  useEffect(() => {
    myIdRef.current = myUserId ?? matchState?.my_progress?.user_id ?? null;
  }, [myUserId, matchState?.my_progress?.user_id]);

  // Self-healing fallback for the subject/difficulty/question_count backfill
  // (see the "countdown_started" case below for why it's needed at all):
  // that refetch is a ONE-SHOT reaction to a single WS event, which can be
  // missed entirely (a genuine drop, or this connection attaching/replacing
  // another one right around that moment) with no replay -- if that
  // happens, subject stays null forever via every later status-only spread
  // (match_started/next_question never set it themselves), permanently
  // stranding match-session.tsx on its "waiting for subject" gate even
  // though the match is genuinely active and progressing server-side.
  // Calling this from those same later events closes that gap.
  const backfillSubjectIfMissing = useCallback(() => {
    if (matchId === null || subjectRef.current != null) return;
    fetchMatchState(matchId)
      .then((state) => {
        if (!unmountedRef.current) setMatchState(state);
      })
      .catch(() => {});
  }, [matchId]);

  const syncClock = useCallback((serverTime: string | null | undefined) => {
    const offset = clockOffsetFrom(serverTime);
    if (offset === null) return;
    if (bestOffsetRef.current === null || offset > bestOffsetRef.current) {
      bestOffsetRef.current = offset;
      setServerOffsetMs(offset);
    }
  }, []);

  const clearPendingMove = useCallback(() => {
    pendingMoveRef.current = null;
    setIsMoving(false);
  }, []);

  const sendMove = useCallback((move: PendingMove): boolean => {
    const socket = socketRef.current;
    if (!socket) return false;
    return move.selectedOption === null
      ? socket.sendSkip(move.questionId)
      : socket.sendAnswer(move.questionId, move.selectedOption);
  }, []);

  // Any full snapshot from the server (state_sync, or a REST refetch): the
  // move in flight either already landed (the snapshot has moved on) or it
  // never reached the server -- in which case it's sent again now.
  const applySnapshot = useCallback(
    (state: BattleMatchStateResponse) => {
      setMatchState(state);
      syncClock(state.server_time);
      if (state.review) setReview(state.review);
      // A finished match's snapshot carries the result too -- keep it, so the results popup shows however this
      // screen learned the match ended. Without this, a socket that dropped right before match_finished (and
      // was then rightly not reconnected, the match being over) left "Match over" with no results at all.
      if (state.status === "completed" && state.result) {
        isTerminalRef.current = true;
        const result = state.result;
        setFinalResult((prev) => prev ?? result);
      }
      const pending = pendingMoveRef.current;
      if (!pending) return;
      if (state.status === "active" && state.question?.question_id === pending.questionId) {
        pendingMoveRef.current = { ...pending, sentAt: Date.now() };
        sendMove(pendingMoveRef.current);
      } else {
        clearPendingMove();
      }
    },
    [syncClock, sendMove, clearPendingMove]
  );

  useEffect(() => {
    if (matchState?.my_answers) setMyProgress(matchState.my_answers);
  }, [matchState?.my_answers]);

  useEffect(() => {
    if (matchState?.opponent_answers) setOpponentProgress(matchState.opponent_answers);
  }, [matchState?.opponent_answers]);

  const isTerminal = matchState?.status === "completed" || matchState?.status === "cancelled";
  // The socket that calls onClose was opened by a `connect()` invocation
  // frozen at mount time (see the mount effect below), so its onClose
  // closure permanently sees whatever `isTerminal` was AT THAT TIME (always
  // false) -- not the current value. A ref sidesteps that: any closure
  // holding it reads the live value, not a snapshot.
  const isTerminalRef = useRef(false);
  useEffect(() => {
    isTerminalRef.current = isTerminal;
  }, [isTerminal]);

  const handleEvent = useCallback(
    (event: BattleWsInboundEvent) => {
      switch (event.type) {
        case "state_sync": {
          if (event.state.status === "completed" || event.state.status === "cancelled") {
            isTerminalRef.current = true;
          }
          applySnapshot(event.state);
          if (event.state.status === "completed" && event.state.result) {
            setFinalResult(event.state.result);
          }
          break;
        }
        case "player_ready": {
          // No toast here anymore -- readying up is automatic for both
          // sides the instant a match is found (see queue.tsx), so this
          // fires within moments of every single match rather than
          // signaling anything the player actually did.
          setReadyUserIds((prev) => new Set(prev).add(event.user_id));
          break;
        }
        case "countdown_started": {
          setMatchState((prev) =>
            prev ? { ...prev, status: "countdown", started_at: event.started_at } : prev
          );
          // This connection was opened back while the match was still
          // "waiting" (queue.tsx opens it the instant a match is found, so
          // ready-up can happen there) -- get_match_state() deliberately
          // returns almost nothing for that status (no subject/difficulty/
          // question_count, see battle_gameplay_service.py), and neither
          // this event nor match_started/next_question carry those
          // fields either, so every status transition above was just
          // spreading that gap forward via `...prev` forever. Refetch once,
          // on this FIRST transition out of "waiting", to backfill them for
          // the rest of the match.
          if (matchId !== null) {
            fetchMatchState(matchId)
              .then((state) => {
                if (!unmountedRef.current) setMatchState(state);
              })
              .catch(() => {});
          }
          break;
        }
        case "match_started": {
          // subject/difficulty/question_count come straight off this event
          // (see BattleWsMatchStartedEvent) -- a REST backfill could resolve
          // while the match was still "countdown" server-side, which never
          // had question_count to return.
          syncClock(event.server_time);
          setMatchState((prev) =>
            prev
              ? {
                  ...prev,
                  status: "active",
                  started_at: event.started_at,
                  ends_at: event.ends_at,
                  subject: event.subject,
                  difficulty: event.difficulty,
                  question_count: event.question_count,
                }
              : prev
          );
          backfillSubjectIfMissing();
          break;
        }
        case "next_question": {
          syncClock(event.server_time);
          // Ignore a stale one (e.g. the match-start question 0 arriving after
          // this player already moved on) -- the question only ever moves forward.
          const current = currentQuestionIndexRef.current;
          if (current != null && event.question_index < current) break;
          currentQuestionIndexRef.current = event.question_index;
          setMatchState((prev) =>
            prev
              ? {
                  ...prev,
                  status: prev.status === "completed" ? prev.status : "active",
                  question_index: event.question_index,
                  question: event.question,
                  finished: event.finished,
                  ends_at: event.ends_at,
                }
              : prev
          );
          if (pendingMoveRef.current && event.question?.question_id !== pendingMoveRef.current.questionId) {
            clearPendingMove();
          }
          backfillSubjectIfMissing();
          break;
        }
        case "player_progress": {
          const mine = event.user_id === myIdRef.current;
          (mine ? setMyProgress : setOpponentProgress)((prev) =>
            addProgress(prev, event.question_order, event.answered)
          );
          setMatchState((prev) => {
            if (!prev) return prev;
            const key = mine ? "my_progress" : "opponent_progress";
            const progress = prev[key];
            return progress && progress.answered_count < event.answered_count
              ? { ...prev, [key]: { ...progress, answered_count: event.answered_count } }
              : prev;
          });
          break;
        }
        case "player_disconnected": {
          setDisconnectInfo({
            userId: event.user_id,
            deadline: event.deadline,
            gracePeriodSeconds: event.grace_period_seconds,
          });
          if (event.user_id !== myUserId) {
            Toast.show({ type: "info", text1: "Opponent disconnected", text2: "Waiting for them to reconnect..." });
          }
          break;
        }
        case "player_reconnected": {
          setDisconnectInfo((prev) => (prev?.userId === event.user_id ? null : prev));
          if (event.user_id !== myUserId) {
            Toast.show({ type: "success", text1: "Opponent reconnected" });
          }
          break;
        }
        case "match_finished": {
          // Set synchronously, not just via matchState -> isTerminal ->
          // effect: the server closes this socket right after sending this
          // exact event (see battle_connection_manager.py's close_local),
          // so onClose can fire before React has even re-rendered from the
          // setMatchState below, let alone run the effect that syncs
          // isTerminalRef from it -- that gap is exactly why "Reconnecting"
          // was still firing on every single match completion.
          isTerminalRef.current = true;
          const mine = event.participants.find((p) => p.user_id === myUserId) ?? null;
          const opponent = event.participants.find((p) => p.user_id !== myUserId) ?? null;
          if (mine) {
            setFinalResult({ winner_user_id: event.winner_user_id, end_reason: event.end_reason, me: mine, opponent });
          }
          clearPendingMove();
          // The review is per-player (own answers only), so it isn't part of
          // this shared broadcast -- fetch this player's own copy.
          if (matchId !== null) {
            fetchMatchState(matchId)
              .then((state) => {
                if (!unmountedRef.current && state.review) setReview(state.review);
              })
              .catch(() => {});
          }
          // No toast for an opponent forfeit -- battle-results.tsx now shows
          // "Opponent forfeited the match" directly as the result subtitle,
          // visible for as long as that screen is open instead of a few
          // seconds on this one.
          setMatchState((prev) => (prev ? { ...prev, status: "completed" } : prev));
          break;
        }
        case "match_cancelled": {
          isTerminalRef.current = true;
          setMatchState((prev) => (prev ? { ...prev, status: "cancelled", reason: event.reason } : prev));
          // No toast from this shared hook: queue.tsx tells the player who
          // stays the actual reason (and re-queues them), match-session.tsx
          // shows it on its own cancelled screen, and the player who chose to
          // leave already knows why.
          break;
        }
        case "error": {
          // "Malformed message" is a client-side bug (a bad frame we sent),
          // not something the user can act on -- log only, no toast.
          if (event.detail.startsWith("Malformed message")) {
            console.warn("[BattleWS] Server rejected a malformed message:", event.detail);
          } else if (event.detail.startsWith("Couldn't save your answer")) {
            // Nothing was saved -- send the pending Next/Skip again right away.
            const pending = pendingMoveRef.current;
            if (pending) {
              pendingMoveRef.current = { ...pending, sentAt: Date.now() };
              sendMove(pendingMoveRef.current);
            }
          } else if (event.detail.startsWith("Time's up")) {
            // Reached the server (or finished saving) after the clock hit
            // 0:00 -- not saved; match_finished follows with the result.
            clearPendingMove();
            setLastMoveRefusedByTime(true);
          } else if (event.detail.startsWith("This battle has already ended")) {
            // A Next/Skip that reached the server after the match clock ran
            // out -- expected timing, not a server fault; match_finished follows.
            clearPendingMove();
          } else if (event.detail.startsWith("This is not your current question")) {
            // Out of step with the server -- resync rather than toast.
            clearPendingMove();
            if (matchId !== null) {
              fetchMatchState(matchId)
                .then((state) => {
                  if (!unmountedRef.current) applySnapshot(state);
                })
                .catch(() => {});
            }
          } else {
            Toast.show({ type: "error", text1: "Server error", text2: event.detail });
          }
          break;
        }
        default:
          break;
      }
    },
    [myUserId, matchId, backfillSubjectIfMissing, applySnapshot, syncClock, clearPendingMove, sendMove]
  );

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Shared backoff scheduler: used both when a live socket drops (onClose)
  // and when connect() itself never got as far as opening a socket (e.g.
  // getClerkToken() returned null) — a failed token fetch should retry
  // exactly like a dropped socket, not silently give up with no state
  // change and no way for the UI to know anything went wrong.
  //
  // Never permanently gives up while the match isn't terminal: it climbs
  // RECONNECT_DELAYS_MS then keeps retrying forever at the last (8s)
  // interval, instead of stopping after 4 attempts. A hard stop meant a
  // foreground network blip longer than ~15s left connectionStatus stuck on
  // "closed" with nothing left to retry it -- even once connectivity came
  // back, only an explicit manualRetry() (or an app background/foreground
  // cycle) could recover, which screens like preparing.tsx never surfaced a
  // way to trigger. "closed" is now reserved for isTerminalRef/manual-close,
  // i.e. cases where retrying truly wouldn't help.
  const scheduleReconnect = useCallback(() => {
    if (unmountedRef.current || manualCloseRef.current) return;
    if (isTerminalRef.current) {
      setConnectionStatus("closed");
      return;
    }

    const attempt = reconnectAttemptRef.current;
    const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];

    setConnectionStatus("reconnecting");
    if (!reconnectingToastShownRef.current) {
      reconnectingToastShownRef.current = true;
      Toast.show({ type: "info", text1: "Reconnecting…", text2: "Trying to restore your connection." });
    }
    reconnectAttemptRef.current += 1;
    reconnectTimeoutRef.current = setTimeout(() => {
      if (matchId === null) return;
      fetchMatchState(matchId)
        .then((state) => {
          if (!unmountedRef.current) applySnapshot(state);
        })
        .catch(() => {})
        .finally(() => connectRef.current());
    }, delay);
  }, [matchId, applySnapshot]);

  const connect = useCallback(async () => {
    if (matchId === null || unmountedRef.current) return;

    const token = await getClerkToken();
    if (unmountedRef.current) return;
    if (!token) {
      setConnectionStatus("failed");
      if (!authExpiredToastShownRef.current) {
        authExpiredToastShownRef.current = true;
        Toast.show({
          type: "error",
          text1: "Session expired",
          text2: "Please sign in again to continue this match.",
        });
      }
      scheduleReconnect();
      return;
    }
    authExpiredToastShownRef.current = false;

    setConnectionStatus((prev) => (prev === "open" ? prev : "connecting"));

    socketRef.current = connectBattleSocket(matchId, token, {
      onOpen: () => {
        reconnectAttemptRef.current = 0;
        // Only confirm a reconnect if we'd actually shown "Reconnecting…"
        // for this drop -- reconnectingToastShownRef is only ever true
        // while one is outstanding, so this can't fire on the very first,
        // ordinary connect.
        if (reconnectingToastShownRef.current) {
          Toast.show({ type: "success", text1: "Connected", text2: "Your connection has been restored." });
        }
        reconnectingToastShownRef.current = false;
        setConnectionStatus("open");
      },
      onEvent: handleEvent,
      onError: () => {
        // onclose fires right after in RN's WebSocket implementation; the
        // reconnect decision is made there, not here.
      },
      onClose: () => {
        socketRef.current = null;
        scheduleReconnect();
      },
    });
  }, [matchId, handleEvent, scheduleReconnect]);

  connectRef.current = connect;

  // Resets backoff and retries both the initial REST hydration and the
  // socket connection — covers "initial fetchMatchState failed" and
  // "reconnect attempts exhausted" with one function, since both leave the
  // hook in a state where only an explicit user action should retry.
  const manualRetry = useCallback(() => {
    if (matchId === null) return;
    clearReconnectTimer();
    reconnectAttemptRef.current = 0;
    manualCloseRef.current = false;
    setConnectionStatus("connecting");
    fetchMatchState(matchId)
      .then((state) => {
        if (!unmountedRef.current) {
          applySnapshot(state);
          setInitialLoadError(false);
        }
      })
      .catch(() => {
        if (!unmountedRef.current) setInitialLoadError(true);
      })
      .finally(() => connectRef.current());
  }, [matchId, clearReconnectTimer, applySnapshot]);

  useEffect(() => {
    unmountedRef.current = false;
    manualCloseRef.current = false;
    reconnectAttemptRef.current = 0;
    setMatchState(null);
    setFinalResult(null);
    setReadyUserIds(new Set());
    setDisconnectInfo(null);
    setInitialLoadError(false);
    setReview(null);
    setLastMoveRefusedByTime(false);
    setMyProgress([]);
    setOpponentProgress([]);
    setServerOffsetMs(0);
    bestOffsetRef.current = null;
    pendingMoveRef.current = null;
    currentQuestionIndexRef.current = null;
    setIsMoving(false);

    if (matchId === null) return;

    // Reopening a match the player finished first (from the home screen):
    // start from the copy the home screen has been polling, so the screen
    // opens on the real "all done" card / results at once instead of
    // waiting a round trip. The socket's state_sync and the REST fetch below
    // replace it with fresh state moments later.
    const cached = queryClient.getQueryData<BattleMatchStateResponse>(battleKeys.pendingResult(matchId));
    if (cached?.match_id === matchId) {
      applySnapshot(cached);
      if (cached.status === "completed" && cached.result) {
        isTerminalRef.current = true;
        setFinalResult(cached.result);
      }
    }

    // Connects immediately, in parallel with the REST hydration below --
    // sequencing them (REST then connect, as this used to) leaves a real
    // network-round-trip-sized gap between the OLD screen's socket closing
    // (e.g. queue.tsx unmounting on navigation here) and this one opening.
    // Under any backend load that gap can exceed the server's same-device-
    // reconnect debounce window (BATTLE_DISCONNECT_NOTICE_DEBOUNCE_SECONDS),
    // which reads as a genuine disconnect and fires a spurious "Opponent
    // disconnected/reconnected" toast pair for both players on every single
    // queue -> match-session handoff instead of just an occasional slow one.
    // The WS's own state_sync event delivers the same snapshot moments
    // later regardless, so there's no data-freshness reason to wait.
    connect();
    fetchMatchState(matchId)
      .then((state) => {
        if (!unmountedRef.current) applySnapshot(state);
      })
      .catch(() => {
        if (!unmountedRef.current) setInitialLoadError(true);
      });

    return () => {
      unmountedRef.current = true;
      manualCloseRef.current = true;
      clearReconnectTimer();
      socketRef.current?.close();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // A dropped connection while the app was backgrounded won't fire a socket
  // event to trigger reconnect on its own — re-sync and reconnect as soon
  // as the app returns to the foreground (mirrors quiz-session.tsx's
  // existing AppState-based autosave-flush pattern).
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" || matchId === null || isTerminal) return;
      if (socketRef.current) return;

      clearReconnectTimer();
      reconnectAttemptRef.current = 0;
      fetchMatchState(matchId)
        .then((s) => {
          if (!unmountedRef.current) applySnapshot(s);
        })
        .catch(() => {})
        .finally(() => connect());
    });
    return () => sub.remove();
  }, [matchId, isTerminal, connect, clearReconnectTimer, applySnapshot]);

  // A Next/Skip whose reply never came back (dropped on a flaky connection)
  // is sent again -- harmless, the server answers a repeat with the current
  // question. A reconnect's state_sync covers the case where the socket itself died.
  useEffect(() => {
    if (!isMoving) return;
    const id = setInterval(() => {
      const pending = pendingMoveRef.current;
      if (!pending || Date.now() - pending.sentAt < PENDING_MOVE_RESEND_MS) return;
      pendingMoveRef.current = { ...pending, sentAt: Date.now() };
      sendMove(pendingMoveRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [isMoving, sendMove]);

  // Returns whether the ready message actually went out (socket open) --
  // callers that need to know immediately whether to disable a "Ready"
  // button or show a retry can use this; a false return means nothing was
  // sent at all, not that the server rejected it.
  const sendReady = useCallback((): boolean => {
    return socketRef.current?.sendReady() ?? false;
  }, []);

  // Next (an option) or Skip (null) for the current question. One move at a
  // time: ignored while one is already in flight, so mashing the button sends
  // it once. Returns false if it couldn't be sent at all (socket down) -- the
  // caller keeps the question answerable; nothing is locked.
  const moveOn = useCallback(
    (questionId: number, selectedOption: string | null): boolean => {
      if (pendingMoveRef.current) return true;
      const move = { questionId, selectedOption, sentAt: Date.now() };
      if (!sendMove(move)) return false;
      pendingMoveRef.current = move;
      setIsMoving(true);
      return true;
    },
    [sendMove]
  );

  const forfeit = useCallback(() => {
    socketRef.current?.sendForfeit();
  }, []);

  return {
    matchState,
    connectionStatus,
    readyUserIds,
    disconnectInfo,
    finalResult,
    review,
    lastMoveRefusedByTime,
    initialLoadError,
    myProgress,
    opponentProgress,
    serverOffsetMs,
    isMoving,
    myUserId,
    sendReady,
    moveOn,
    forfeit,
    manualRetry,
  };
}

// Shares ONE useBattleMatch connection across the whole (main)/battle Stack
// (see its _layout.tsx), instead of queue.tsx and match-session.tsx each
// mounting their own useBattleMatch(matchId) for the exact same match+user.
// That duplication was the actual root cause of a WS churn bug: React
// Navigation keeps the outgoing screen mounted through router.replace's
// transition animation, so for that whole window BOTH screens held a live
// socket for the same match. The server force-closes whichever one loses
// that race; the loser's onClose (still mounted, so not a "real" unmount)
// treated that as a drop and auto-reconnected, which force-closed the
// other one right back -- a loop that fired "Opponent
// disconnected/reconnected" for both players on every single handoff. A
// Stack layout, unlike its child screens, never unmounts while navigating
// between siblings inside it, so hosting the one-and-only connection here
// means the queue -> match-session transition never touches the socket at
// all.
const BattleMatchContext = createContext<
  (ReturnType<typeof useBattleMatch> & {
    activeMatchId: number | null;
    setActiveMatchId: (matchId: number | null) => void;
  })
  | null
>(null);

export function BattleMatchProvider({ children }: { children: ReactNode }) {
  const [activeMatchId, setActiveMatchId] = useState<number | null>(null);
  const battleMatch = useBattleMatch(activeMatchId);
  const value = useMemo(
    () => ({ ...battleMatch, activeMatchId, setActiveMatchId }),
    [battleMatch, activeMatchId, setActiveMatchId]
  );
  return <BattleMatchContext.Provider value={value}>{children}</BattleMatchContext.Provider>;
}

export function useBattleMatchContext() {
  const ctx = useContext(BattleMatchContext);
  if (!ctx) {
    throw new Error("useBattleMatchContext must be used within a BattleMatchProvider");
  }
  return ctx;
}
