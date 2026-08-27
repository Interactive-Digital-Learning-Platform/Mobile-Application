import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import Toast from "react-native-toast-message";
import { fetchMatchState } from "@/api/battleAPI";
import { getClerkToken } from "@/api/apiClients";
import { BattleSocketHandle, connectBattleSocket } from "@/api/battleSocket";
import { useUserMeQuery } from "@/hooks/use-quiz";
import { BattleAnswerProgress, BattleMatchResult, BattleMatchStateResponse } from "@/types/battleModuleTypes";
import { BattleWsInboundEvent } from "@/types/battleWsTypes";

export type BattleConnectionStatus = "connecting" | "open" | "reconnecting" | "failed" | "closed";

export interface DisconnectInfo {
  userId: number;
  deadline: string;
  gracePeriodSeconds: number;
}

export interface AnswerFeedback {
  isCorrect: boolean;
  baseScore: number;
  speedBonus: number;
  streakBonus: number;
  totalQuestionScore: number;
  responseTimeMs: number;
}

const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000];

// Central stateful hook for one live match, modeled on hooks/use-chat.ts's
// shape (local state/refs, not React Query — a bidirectional live socket
// doesn't fit a query/mutation model). Owns the WS connection lifecycle
// including reconnect-with-backoff, since the backend already fully
// implements server-side grace-period/reconnect handling and a dropped
// socket on a flaky mobile connection is the realistic common case.
export function useBattleMatch(matchId: number | null) {
  const { data: me } = useUserMeQuery();
  const myUserId = me?.id ?? null;

  const [matchState, setMatchState] = useState<BattleMatchStateResponse | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<BattleConnectionStatus>("connecting");
  const [readyUserIds, setReadyUserIds] = useState<Set<number>>(new Set());
  const [disconnectInfo, setDisconnectInfo] = useState<DisconnectInfo | null>(null);
  const [finalResult, setFinalResult] = useState<BattleMatchResult | null>(null);
  const [lastAnswerFeedback, setLastAnswerFeedback] = useState<AnswerFeedback | null>(null);
  const [initialLoadError, setInitialLoadError] = useState(false);
  const [ownScore, setOwnScore] = useState(0);
  // Per-question outcome for each side's progress bar (lockstep play: both
  // players share the same question_index, so these two arrays line up
  // segment-for-segment). Seeded from matchState.my_answers/opponent_answers
  // on load/reconnect, appended to live as answer_acknowledged/
  // opponent_answered events arrive.
  const [myProgress, setMyProgress] = useState<BattleAnswerProgress[]>([]);
  const [opponentProgress, setOpponentProgress] = useState<BattleAnswerProgress[]>([]);

  const socketRef = useRef<BattleSocketHandle | null>(null);
  const answerGuardRef = useRef(false);
  const currentQuestionIndexRef = useRef<number | null>(null);
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
          setMatchState(event.state);
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
          // this event nor match_started/question_started carry those
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
          setMatchState((prev) =>
            prev ? { ...prev, status: "active", started_at: event.started_at, question: null } : prev
          );
          break;
        }
        case "question_started": {
          setMatchState((prev) =>
            prev
              ? {
                  ...prev,
                  status: "active",
                  question_index: event.question_index,
                  question: event.question,
                  time_remaining_seconds: event.time_remaining_seconds,
                  has_answered_current_question: false,
                }
              : prev
          );
          setLastAnswerFeedback(null);
          answerGuardRef.current = false;
          break;
        }
        case "answer_acknowledged": {
          setLastAnswerFeedback({
            isCorrect: event.is_correct,
            baseScore: event.base_score,
            speedBonus: event.speed_bonus,
            streakBonus: event.streak_bonus,
            totalQuestionScore: event.total_question_score,
            responseTimeMs: event.response_time_ms,
          });
          setOwnScore((prev) => prev + event.total_question_score);
          setMatchState((prev) =>
            prev
              ? {
                  ...prev,
                  has_answered_current_question: true,
                  my_progress: prev.my_progress
                    ? { ...prev.my_progress, answered_count: prev.my_progress.answered_count + 1 }
                    : prev.my_progress,
                }
              : prev
          );
          const order = currentQuestionIndexRef.current;
          if (order !== null) {
            setMyProgress((prev) =>
              prev.some((p) => p.question_order === order)
                ? prev
                : [...prev, { question_order: order, is_correct: event.is_correct }]
            );
          }
          break;
        }
        case "opponent_answered": {
          if (event.user_id === myUserId) break;
          setMatchState((prev) =>
            prev
              ? {
                  ...prev,
                  opponent_progress: { user_id: event.user_id, answered_count: event.answered_count },
                }
              : prev
          );
          setOpponentProgress((prev) =>
            prev.some((p) => p.question_order === event.question_order)
              ? prev
              : [...prev, { question_order: event.question_order, is_correct: event.is_correct }]
          );
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
            setFinalResult({ winner_user_id: event.winner_user_id, me: mine, opponent });
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
          // Only the AI-generation-failure case gets a toast here -- it's
          // the one "match_cancelled" reason with no more specific UI of its
          // own. The "opponent left before ready" case is deliberately NOT
          // toasted from this shared hook: both sides' sockets get the same
          // event, but queue.tsx already shows the right message to each --
          // "Opponent left / Looking for a new match" only to the player who
          // stays and auto-requeues, nothing to the one who chose to leave
          // (they're already mid-navigation-away and know they cancelled).
          // A generic toast here fired for BOTH regardless of who cancelled,
          // which is what this comment replaces.
          if (event.reason?.includes("could be generated or found")) {
            Toast.show({
              type: "error",
              text1: "Question generation failed",
              text2: "We couldn't prepare questions for this match. No rating changes applied.",
            });
          }
          break;
        }
        case "error": {
          // "Malformed message" is a client-side bug (a bad frame we sent),
          // not something the user can act on -- log only, no toast.
          if (event.detail.startsWith("Malformed message")) {
            console.warn("[BattleWS] Server rejected a malformed message:", event.detail);
          } else {
            Toast.show({ type: "error", text1: "Server error", text2: event.detail });
          }
          break;
        }
        default:
          break;
      }
    },
    [myUserId, matchId]
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
  const scheduleReconnect = useCallback(() => {
    if (unmountedRef.current || manualCloseRef.current) return;
    if (isTerminalRef.current) {
      setConnectionStatus("closed");
      return;
    }

    const attempt = reconnectAttemptRef.current;
    if (attempt >= RECONNECT_DELAYS_MS.length) {
      setConnectionStatus("closed");
      return;
    }

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
          if (!unmountedRef.current) setMatchState(state);
        })
        .catch(() => {})
        .finally(() => connectRef.current());
    }, RECONNECT_DELAYS_MS[attempt]);
  }, [matchId]);

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
          setMatchState(state);
          setInitialLoadError(false);
        }
      })
      .catch(() => {
        if (!unmountedRef.current) setInitialLoadError(true);
      })
      .finally(() => connectRef.current());
  }, [matchId, clearReconnectTimer]);

  useEffect(() => {
    unmountedRef.current = false;
    manualCloseRef.current = false;
    reconnectAttemptRef.current = 0;
    setMatchState(null);
    setFinalResult(null);
    setReadyUserIds(new Set());
    setDisconnectInfo(null);
    setInitialLoadError(false);
    setOwnScore(0);
    setMyProgress([]);
    setOpponentProgress([]);

    if (matchId === null) return;

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
        if (!unmountedRef.current) setMatchState(state);
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
          if (!unmountedRef.current) setMatchState(s);
        })
        .catch(() => {})
        .finally(() => connect());
    });
    return () => sub.remove();
  }, [matchId, isTerminal, connect, clearReconnectTimer]);

  // Returns whether the ready message actually went out (socket open) --
  // callers that need to know immediately whether to disable a "Ready"
  // button or show a retry can use this; a false return means nothing was
  // sent at all, not that the server rejected it.
  const sendReady = useCallback((): boolean => {
    return socketRef.current?.sendReady() ?? false;
  }, []);

  const submitAnswer = useCallback((questionId: number, selectedOption: string) => {
    if (answerGuardRef.current) return;
    answerGuardRef.current = true;
    socketRef.current?.sendAnswer(questionId, selectedOption);
  }, []);

  const forfeit = useCallback(() => {
    socketRef.current?.sendForfeit();
  }, []);

  return {
    matchState,
    connectionStatus,
    readyUserIds,
    disconnectInfo,
    finalResult,
    lastAnswerFeedback,
    initialLoadError,
    ownScore,
    myProgress,
    opponentProgress,
    myUserId,
    sendReady,
    submitAnswer,
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
