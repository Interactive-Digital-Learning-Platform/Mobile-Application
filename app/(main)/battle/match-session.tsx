import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StatusBar, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Text } from "@/components/ui/AppText";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Home,
  SkipForward,
  WifiOff,
  X,
  XCircle,
} from "lucide-react-native";
import Toast from "react-native-toast-message";
import { OPTION_LABELS, formatMathText } from "@/constants/quizHelpers";
import { ICON_COLORS } from "@/constants/quizStyles";
import { LEAGUE_STYLES } from "@/constants/battleStyles";
import BattleProgressBar from "@/components/quiz-componets/BattleProgressBar";
import BattleResultsPopup from "@/components/quiz-componets/BattleResultsPopup";
import ForfeitModal from "@/components/quiz-componets/ForfeitModal";
import LeagueBadge from "@/components/quiz-componets/LeagueBadge";
import QuizOptionButton from "@/components/quiz-componets/QuizOptionButton";
import { useBattleMatchContext } from "@/hooks/use-battle-match";
import { battleKeys, useBattleProfileQuery, useForfeitMatchMutation } from "@/hooks/use-battle";
import { clearPendingBattleResult, setPendingBattleResult } from "@/hooks/use-pending-battle-result";
import type { BattleQuestionPublic } from "@/types/battleModuleTypes";

// The question card's states -- each maps to a background/border + a small
// top-right tag. No right/wrong states: correctness is only shown in the
// end-of-match review. A save in progress has no state of its own: the card
// stays put (options locked, spinner on the button), and the card swap below
// is what shows it went through.
type QuestionCardState = "answering" | "timeUp";

const QUESTION_CARD_STYLES: Record<QuestionCardState, { bg: string; border: string; tagBg: string; tag: string | null }> = {
  answering: { bg: "bg-white", border: "border-white", tagBg: "", tag: null },
  timeUp: { bg: "bg-amber-100", border: "border-amber-200", tagBg: "bg-amber-500", tag: "Time's up" },
};

// What the question card is showing -- trails the live state by the length
// of the swap animation, so the old question can slide out first.
type ShownCard = { index: number; question: BattleQuestionPublic | null; finished: boolean };

// Each half of the card swap (old card out, new card in).
const CARD_SWAP_HALF_MS = 200;

// The match clock turns red for its last 30 seconds.
const LOW_TIME_SECONDS = 30;

export default function BattleMatchSessionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { matchId: matchIdStr, view } = useLocalSearchParams<{ matchId: string; view?: string }>();
  // Opened from the home screen ("Show Results" / the opponent-finished
  // toast) to wait for or see a battle this player already finished.
  const viewingResults = view === "results";
  const matchIdFromParams = matchIdStr ? parseInt(matchIdStr, 10) : null;

  const {
    activeMatchId,
    setActiveMatchId,
    matchState,
    connectionStatus,
    disconnectInfo,
    finalResult,
    review,
    lastMoveRefusedByTime,
    initialLoadError,
    myProgress,
    opponentProgress,
    serverOffsetMs,
    isMoving,
    moveOn,
    manualRetry,
  } = useBattleMatchContext();

  const showResultsPopup = matchState?.status === "completed" && !!finalResult;

  // The normal path (queue.tsx -> here) already has this set on the shared
  // connection before this screen ever mounts -- this only matters for a
  // cold start directly on this route (e.g. app relaunched mid-match and
  // Expo Router restores the last URL), where the shared context hasn't
  // seen a matchId yet and needs seeding from the route param instead.
  useEffect(() => {
    if (activeMatchId == null && matchIdFromParams != null) {
      setActiveMatchId(matchIdFromParams);
    }
  }, [activeMatchId, matchIdFromParams, setActiveMatchId]);
  const matchId = activeMatchId ?? matchIdFromParams;

  // Latches once this screen has genuinely rendered the live battle at
  // least once -- after that, NOTHING bounces the player back to
  // preparing.tsx, ever. Before this point, `matchState` briefly being
  // null/non-active/subject-less is the legitimate cold-start gap (app
  // relaunched mid-match, Expo Router restores this URL before the shared
  // connection catches up); after it, the match is genuinely underway and a
  // "Preparing Match" screen reappearing would be a bug, not recovery --
  // e.g. this used to also fire on the natural "active" -> "completed"
  // transition (only "cancelled" was excluded), racing the redirect below
  // against the results popup that now shows on "completed" instead.
  // Any post-start problem must be handled in place by THIS screen (see the
  // connectionStatus banner further down) instead of navigating away.
  const hasEnteredLiveMatchRef = useRef(false);

  // No loading state rendered here at all -- if the match isn't fully ready
  // yet (status "active" AND subject already backfilled -- see preparing.tsx's
  // own comment for why both are required), bounce to preparing.tsx instead
  // and let IT own showing "Preparing Match" until it is, then send us back.
  // The normal path (queue.tsx -> preparing.tsx -> here) never actually hits
  // this -- it only fires for a cold start directly on this route (app
  // relaunched mid-match, Expo Router restores the last URL) where the
  // shared connection hasn't caught up yet. Skipped entirely once either of
  // the two dedicated terminal branches below (load error / cancelled) are
  // showing -- those own their own UI, not a bounce to preparing.tsx.
  useEffect(() => {
    if (matchId === null) return;
    if (matchState?.status === "active" && matchState.subject != null) {
      hasEnteredLiveMatchRef.current = true;
    }
    // Already finished (or over) -- nothing to prepare, stay to wait/see results.
    if (hasEnteredLiveMatchRef.current || viewingResults) return;
    if (initialLoadError || matchState?.status === "cancelled") return;
    if (!matchState || matchState.status !== "active" || matchState.subject == null) {
      router.replace({
        pathname: "/(main)/battle/preparing",
        params: { matchId: String(matchId), subject: matchState?.subject ?? "" },
      } as any);
    }
  }, [matchId, matchState, initialLoadError, router, viewingResults]);

  // REST, not the match WS's fire-and-forget sendForfeit -- same reliability
  // rationale as queue.tsx's forfeit flow (a plain request/response
  // round-trips before anything else happens, unlike a WS send that could
  // silently drop). Matters even more here since confirming forfeit now
  // covers the whole screen with a blocking "Ending Match…" overlay --
  // isPending drives that overlay directly, and a failed send surfaces as a
  // toast + the overlay coming back down, rather than leaving the player
  // staring at a spinner that never resolves.
  const { mutate: forfeitMatchMutation, isPending: isForfeiting } = useForfeitMatchMutation();

  const { data: battleProfile } = useBattleProfileQuery();
  const myLeague = battleProfile?.subjects.find((s) => s.subject === matchState?.subject)?.league;
  // Lighter tint of the player's own league color, behind the subject +
  // league badge at the top of the question card -- falls back to plain
  // slate until the profile query resolves the league, rather than
  // flashing a default league's color.
  const leagueBg = myLeague ? LEAGUE_STYLES[myLeague].bg : "bg-slate-100";

  const [showForfeit, setShowForfeit] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [, forceTick] = useState(0);

  // Orange header behind the status bar: light status-bar text while this screen is focused.
  useFocusEffect(
    useCallback(() => {
      const entry = StatusBar.pushStackEntry({ barStyle: "light-content" });
      return () => StatusBar.popStackEntry(entry);
    }, [])
  );

  // Nothing else ever closed this modal once the forfeit was confirmed --
  // isForfeiting flips back to false as soon as the REST call settles, but
  // showForfeit stayed true, leaving the forfeiting player stuck staring at
  // "Forfeit Match?" with its own two buttons fighting the results popup
  // (also a Modal) for the screen instead of ever seeing it. The match
  // reaching "completed" -- via this forfeit or any other path -- is exactly
  // the signal that this confirmation is no longer relevant.
  useEffect(() => {
    if (matchState?.status === "completed") setShowForfeit(false);
  }, [matchState?.status]);

  // Which button started the move in flight, for its spinner.
  const [movingWith, setMovingWith] = useState<"next" | "skip" | null>(null);

  // The card swap: once the server confirms a Next/Skip and hands out the
  // next question, the current card slides off to the left and the new one
  // slides in from the right (or the "all done" card, after the last one).
  // Only ever on that confirmation -- never on the tap -- so the motion
  // itself means "saved and moved on". Skip and Next look identical.
  const { width: screenWidth } = useWindowDimensions();
  const cardX = useSharedValue(0);
  const cardAnimStyle = useAnimatedStyle(() => ({ transform: [{ translateX: cardX.value }] }));
  const [shownCard, setShownCard] = useState<ShownCard | null>(null);
  const [swapping, setSwapping] = useState(false);
  const shownCardRef = useRef<ShownCard | null>(null);
  const incomingCardRef = useRef<ShownCard | null>(null);
  const liveIndex = matchState?.question_index ?? 0;
  const liveQuestion = matchState?.question ?? null;
  const liveFinished = matchState?.finished === true;

  const showCard = useCallback((card: ShownCard) => {
    shownCardRef.current = card;
    setShownCard(card);
  }, []);

  const finishSwap = useCallback(() => setSwapping(false), []);

  const slideIn = useCallback(() => {
    const card = incomingCardRef.current;
    if (!card) return;
    showCard(card);
    cardX.value = screenWidth;
    cardX.value = withTiming(0, { duration: CARD_SWAP_HALF_MS, easing: Easing.out(Easing.cubic) }, (done) => {
      if (done) runOnJS(finishSwap)();
    });
  }, [cardX, screenWidth, showCard, finishSwap]);

  const hasMatchState = matchState != null;

  useEffect(() => {
    // Nothing loaded yet -- don't put up a placeholder card that the first
    // real snapshot would then "move on" from.
    if (!hasMatchState) return;
    const incoming: ShownCard = { index: liveIndex, question: liveQuestion, finished: liveFinished };
    incomingCardRef.current = incoming;
    const shown = shownCardRef.current;
    // Only a real move on from a question that was actually on screen gets
    // the swap. Everything else just shows the card: the first load
    // (including reopening a match to check on the opponent, which lands
    // straight on the "all done" card), or the same question refreshed by a
    // reconnect's snapshot.
    const movedOnFromQuestion =
      shown != null && shown.question != null && !shown.finished && incoming.index > shown.index;
    if (!movedOnFromQuestion) {
      if (
        !shown ||
        shown.index !== incoming.index ||
        shown.finished !== incoming.finished ||
        shown.question?.question_id !== incoming.question?.question_id
      ) {
        showCard(incoming);
      }
      return;
    }
    setSwapping(true);
    cancelAnimation(cardX);
    cardX.value = withTiming(-screenWidth, { duration: CARD_SWAP_HALF_MS, easing: Easing.in(Easing.cubic) }, (done) => {
      if (done) runOnJS(slideIn)();
    });
    // liveQuestion's identity changes with every snapshot; its id is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMatchState, liveIndex, liveQuestion?.question_id, liveFinished, cardX, screenWidth, showCard, slideIn]);

  // A new card on screen: fresh selection.
  useEffect(() => {
    setSelectedOption(null);
    setMovingWith(null);
  }, [shownCard?.index]);

  useEffect(() => {
    if (!isMoving) setMovingWith(null);
  }, [isMoving]);

  // Re-render twice a second while active so the match clock ticks.
  useEffect(() => {
    if (matchState?.status !== "active") return;
    const id = setInterval(() => forceTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, [matchState?.status]);

  // The match clock runs on the server's time (offset from server_time),
  // not the phone's, so both players count down the same clock -- it keeps
  // running whatever either of them is doing, including while an answer saves.
  const endsAtMs = matchState?.ends_at ? Date.parse(matchState.ends_at) : NaN;
  const computedSecondsLeft = Number.isNaN(endsAtMs)
    ? null
    : Math.max(0, Math.ceil((endsAtMs - (Date.now() + serverOffsetMs)) / 1000));
  // Never let a clock re-sync make it tick back up.
  const lowestSecondsLeftRef = useRef<{ endsAt: number; seconds: number } | null>(null);
  let secondsLeft = computedSecondsLeft;
  if (computedSecondsLeft != null) {
    const lowest = lowestSecondsLeftRef.current;
    if (lowest && lowest.endsAt === endsAtMs) secondsLeft = Math.min(lowest.seconds, computedSecondsLeft);
    lowestSecondsLeftRef.current = { endsAt: endsAtMs, seconds: secondsLeft as number };
  }
  const timeUp = matchState?.status === "active" && secondsLeft === 0;

  const finished = matchState?.finished === true;
  const questionCount = matchState?.question_count ?? 0;
  const opponentDone = matchState?.opponent_progress?.answered_count ?? opponentProgress.length;
  const locked = isMoving || swapping || timeUp || matchState?.status !== "active";
  const cardQuestion = shownCard?.question ?? null;
  const cardDone = shownCard?.finished === true || cardQuestion == null;
  // Straight from the server, which knows how the match ended -- not worked
  // out here from progress this screen may only partly have seen (e.g.
  // results opened later from the home screen carry no progress at all).
  const endedByTime = finalResult?.end_reason === "time_up";
  const questionCardState: QuestionCardState = timeUp ? "timeUp" : "answering";
  const cardStyle = QUESTION_CARD_STYLES[questionCardState];

  const handleMove = (option: string | null) => {
    const question = matchState?.question;
    // Only the question actually on screen (not one still sliding in).
    if (!question || locked || question.question_id !== cardQuestion?.question_id) return;
    // Sent once; options and both buttons stay locked until the server has
    // saved it and handed out the next question.
    if (moveOn(question.question_id, option)) {
      setMovingWith(option === null ? "skip" : "next");
    } else {
      Toast.show({ type: "error", text1: "Not connected", text2: "Reconnecting — try again in a moment." });
    }
  };

  useEffect(() => {
    if (matchState?.status === "completed" && finalResult) {
      // Covers both a natural finish and a forfeit -- forfeit doesn't
      // navigate on its own (see handleForfeitConfirm below), it just waits
      // for this same WS-driven "completed" transition. Invalidating here
      // means the history list behind this screen is stale until it's next
      // read, not stale until its 30s staleTime window happens to expire.
      queryClient.invalidateQueries({ queryKey: [...battleKeys.all, "history"] });
      queryClient.invalidateQueries({ queryKey: battleKeys.profile });
      queryClient.invalidateQueries({ queryKey: battleKeys.analytics });
      // battleKeys.queueStatus is a single GLOBAL cache key, not scoped to
      // this screen -- left alone, it still holds {status:"matched",
      // match_id: <this now-completed match>}. A fresh queue.tsx mounted
      // later (tapping "Next Match") would read that stale entry on its very
      // FIRST render, before its own mount effect gets a chance to clear it,
      // briefly resolving matchId back to this dead match and reconnecting
      // its WS -- see queue.tsx's handleLeaveMatchConfirm for the same fix
      // on the self-forfeit path; this covers the natural-finish/opponent-
      // forfeit path that one didn't.
      queryClient.removeQueries({ queryKey: battleKeys.queueStatus, exact: true });
      // No navigation here -- BattleResultsPopup renders as a Modal over
      // this same screen (see the return below).
    }
  }, [matchState?.status, finalResult, queryClient]);

  const handleRematch = () => {
    if (matchState?.subject) {
      router.replace({ pathname: "/(main)/battle/queue", params: { subject: matchState.subject } } as any);
    }
  };

  // dismissTo (not replace): this pops the whole battle/queue/match-session
  // stack back to the existing quiz tab screen, instead of just swapping the
  // visible screen and potentially leaving the battle stack mounted in the
  // background -- a later re-entry into battle for a different subject
  // could otherwise resume inside this same stale stack.
  const handleResultsHome = () => router.dismissTo("/(tabs)/quiz");

  // Finished every question but the opponent is still playing: free to go
  // home and wait there -- the server doesn't count this as a disconnect, and
  // the Online tab shows "Show Results" until these results are opened.
  const handleWaitAtHome = () => {
    if (matchId !== null) {
      setPendingBattleResult({ matchId, subject: matchState?.subject ?? "" });
    }
    handleResultsHome();
  };

  // Seen (or nothing to see) -- the Online tab goes back to matchmaking.
  useEffect(() => {
    if (matchId === null) return;
    if (showResultsPopup || matchState?.status === "cancelled") clearPendingBattleResult(matchId);
  }, [matchId, showResultsPopup, matchState?.status]);

  const handleBack = () => {
    // "active" opens the forfeit confirmation -- unless this player has
    // already finished, then it's just "wait at home"; "completed" (behind
    // the results popup) and "cancelled"/load-error (their own early-return
    // screens above) all just leave via the same dismissTo path.
    if (matchState?.status === "active" && finished) {
      handleWaitAtHome();
    } else if (matchState?.status === "active") {
      setShowForfeit(true);
    } else {
      handleResultsHome();
    }
  };

  const handleForfeitConfirm = () => {
    if (matchId === null) return;
    // Modal stays open (isConfirming below covers the pending state in its
    // own buttons) instead of closing immediately -- the screen behind it
    // still shows the live question, so leaving the modal up avoids it
    // being visibly interactive during a forfeit that's already in flight.
    //
    // No onSuccess navigation here -- the REST response only confirms the
    // forfeit was recorded. The actual transition away from this screen is
    // still driven by the existing WS match_finished handling above (same
    // socket this screen already listens on), which populates finalResult
    // and flips matchState.status to "completed", triggering the
    // BattleResultsPopup below. This just makes SENDING the forfeit
    // reliable, not the popup that follows it.
    forfeitMatchMutation(matchId, {
      onError: (error) => {
        Toast.show({
          type: "error",
          text1: "Couldn't forfeit",
          text2: error instanceof Error ? error.message : "Check your connection and try again.",
        });
      },
    });
  };

  if (!matchState && initialLoadError) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <View className="bg-rose-100 w-16 h-16 rounded-full items-center justify-center mb-4">
          <AlertTriangle size={28} color={ICON_COLORS.rose500} strokeWidth={2} />
        </View>
        <Text className="text-slate-800 font-black text-lg text-center mb-1">
          Couldn&apos;t Load Match
        </Text>
        <Text className="text-slate-400 text-sm text-center mb-6">
          Check your connection and try again.
        </Text>
        <TouchableOpacity
          className="bg-primary px-6 py-3.5 rounded-2xl mb-3"
          activeOpacity={0.85}
          onPress={manualRetry}
        >
          <Text className="text-white font-black text-sm">Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="px-6 py-3.5 rounded-2xl"
          activeOpacity={0.85}
          onPress={() => router.dismissTo("/(tabs)/quiz")}
        >
          <Text className="text-slate-500 font-bold text-sm">Back to Quiz</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (matchState?.status === "cancelled") {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <View className="bg-rose-100 w-16 h-16 rounded-full items-center justify-center mb-4">
          <XCircle size={28} color={ICON_COLORS.rose500} strokeWidth={2} />
        </View>
        <Text className="text-slate-800 font-black text-lg text-center mb-1">Match Cancelled</Text>
        <Text className="text-slate-400 text-sm text-center mb-6">
          {matchState.reason ?? "This match could not be started."}
        </Text>
        <TouchableOpacity
          className="bg-primary px-6 py-3.5 rounded-2xl"
          activeOpacity={0.85}
          onPress={() => router.dismissTo("/(tabs)/quiz")}
        >
          <Text className="text-white font-black text-sm">Back to Quiz</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // "completed" stays here too now (not just "active") -- the results
  // popup renders as a Modal in front of this same screen (see the return
  // below) instead of navigating to a separate route, so this screen keeps
  // rendering the board behind it rather than going blank. Until there's a
  // match to show -- still loading (e.g. reopened from the home screen with
  // nothing cached), or the brief gap before the redirect effect above sends
  // a not-yet-"active" match to preparing.tsx -- show the battle backdrop
  // with a spinner rather than nothing (a blank white screen).
  if (!matchState || (matchState.status !== "active" && matchState.status !== "completed") || matchState.subject == null) {
    return (
      <View className="flex-1 bg-primary-500">
        <View
          className="absolute left-0 right-0 top-0 bg-primary-700"
          style={{ height: "46%", borderBottomLeftRadius: 56, borderBottomRightRadius: 56 }}
        />
        <SafeAreaView className="flex-1">
          <View className="px-5 pt-2">
            <TouchableOpacity
              className="w-11 h-11 rounded-2xl bg-white/15 justify-center items-center"
              activeOpacity={0.7}
              onPress={() => router.dismissTo("/(tabs)/quiz")}
              accessibilityRole="button"
              accessibilityLabel="Leave"
            >
              <X size={20} color={ICON_COLORS.white} strokeWidth={2.75} />
            </TouchableOpacity>
          </View>
          <View className="mx-5 mt-16 rounded-[28px] px-5 py-10 bg-white shadow-lg shadow-black/15 items-center">
            <ActivityIndicator color={ICON_COLORS.primary500} />
            <Text className="text-slate-500 text-sm font-semibold mt-3">Loading your match…</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const clock = secondsLeft == null ? "--:--" : `${Math.floor(secondsLeft / 60)}:${pad2(secondsLeft % 60)}`;
  const timerLow = matchState.status === "active" && secondsLeft != null && secondsLeft <= LOW_TIME_SECONDS;

  return (
    <View className="flex-1 bg-primary-500">
      {/* Two-tone backdrop: a deeper band behind the header that the question card overlaps (same as Practice). */}
      <View
        className="absolute left-0 right-0 top-0 bg-primary-700"
        style={{ height: "46%", borderBottomLeftRadius: 56, borderBottomRightRadius: 56 }}
      />

      <SafeAreaView edges={["top", "bottom"]} className="flex-1">
        {/* Header: forfeit · question counter · connection + match clock */}
        {/* Equal-width side slots keep the counter centred whatever is on each side. */}
        <View className="flex-row items-center px-5 pt-2">
          <View className="flex-1 items-start">
            <TouchableOpacity
              className="w-11 h-11 rounded-2xl bg-white/15 justify-center items-center"
              activeOpacity={0.7}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel={matchState.status === "active" ? "Forfeit match" : "Leave match"}
            >
              <X size={20} color={ICON_COLORS.white} strokeWidth={2.75} />
            </TouchableOpacity>
          </View>

          <Text className="text-white text-[17px] font-black text-center">
            {cardQuestion != null && !cardDone
              ? `Question ${pad2((shownCard?.index ?? 0) + 1)} / ${pad2(questionCount)}`
              : matchState.subject}
          </Text>

          <View className="flex-1 flex-row items-center justify-end gap-2">
            {connectionStatus !== "open" && (
              <View className="w-8 h-8 rounded-full bg-white justify-center items-center">
                <WifiOff size={15} color={ICON_COLORS.amber500} strokeWidth={2.5} />
              </View>
            )}
            <View
              className={`flex-row items-center gap-1.5 pl-1.5 pr-3 h-11 rounded-full ${
                timerLow ? "bg-rose-500" : "bg-white/20"
              }`}
              accessibilityLabel={`Match time left ${clock}`}
            >
              <View className="w-8 h-8 rounded-full bg-white justify-center items-center">
                <Clock size={16} color={timerLow ? ICON_COLORS.rose500 : ICON_COLORS.primary600} strokeWidth={2.75} />
              </View>
              <Text className="text-white text-[16px] font-black">{clock}</Text>
            </View>
          </View>
        </View>

        {/* Only while there's still a match to reconnect to -- once it's over, there's nothing to miss. */}
        {connectionStatus === "closed" && matchState.status === "active" && (
          <View className="bg-white mx-5 mt-3 rounded-2xl px-3 py-2.5 flex-row items-center gap-2">
            <WifiOff size={14} color={ICON_COLORS.rose500} strokeWidth={2.5} />
            <Text className="text-rose-700 text-xs font-semibold flex-1">
              Connection lost — you may be missing live updates.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={manualRetry}
              className="px-3 py-1.5 rounded-full bg-rose-500"
            >
              <Text className="text-white text-[11px] font-black">Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {disconnectInfo && (
          <View className="bg-amber-100 mx-5 mt-3 rounded-2xl px-3 py-2.5 flex-row items-center gap-2">
            <WifiOff size={14} color={ICON_COLORS.amber600} strokeWidth={2.5} />
            <Text className="text-amber-700 text-xs font-semibold flex-1">
              Opponent disconnected — waiting for them to reconnect…
            </Text>
          </View>
        )}

        <View className="flex-1">
          {/* Both players' progress -- how far each has got, never right/wrong. */}
          <View className="mx-5 mt-4">
            <BattleProgressBar
              label="You"
              count={questionCount}
              currentIndex={matchState.question_index ?? 0}
              answers={myProgress}
              size="md"
              tone="dark"
            />
            <View className="mt-1">
              <BattleProgressBar
                label={`Opponent · ${Math.min(opponentDone, questionCount)}/${questionCount}`}
                count={questionCount}
                currentIndex={opponentDone}
                answers={opponentProgress}
                size="sm"
                tone="dark"
              />
            </View>
          </View>

          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
          >
            <View>
              {/* Stacked "deck" edges peeking out under the card. */}
              <View className="absolute rounded-[28px] bg-white/25" style={{ left: 28, right: 28, top: 24, bottom: -22 }} />
              <View className="absolute rounded-[28px] bg-white/45" style={{ left: 14, right: 14, top: 12, bottom: -11 }} />

              <Animated.View style={cardAnimStyle}>
              {cardDone || cardQuestion == null ? (
                // Out of questions (or out of time) -- waiting for the match to end.
                <View className="rounded-[28px] px-5 py-8 border-2 border-white bg-white shadow-lg shadow-black/15 items-center">
                  <View className="bg-emerald-100 w-14 h-14 rounded-full items-center justify-center mb-3">
                    <CheckCircle2 size={28} color={ICON_COLORS.emerald500} strokeWidth={2.25} />
                  </View>
                  <Text className="text-slate-800 font-black text-lg text-center">
                    {matchState.status === "completed" ? "Match over" : "All done!"}
                  </Text>
                  <Text className="text-slate-500 text-sm text-center mt-1">
                    {matchState.status === "completed"
                      ? "Here are your results."
                      : `Your opponent is still competing (${Math.min(opponentDone, questionCount)}/${questionCount})…`}
                  </Text>
                  {matchState.status === "active" && (
                    <ActivityIndicator className="mt-4" color={ICON_COLORS.primary500} />
                  )}
                  {matchState.status === "active" && finished && (
                    <>
                      <TouchableOpacity
                        className="mt-6 h-12 px-6 flex-row items-center justify-center gap-2 rounded-2xl bg-primary border-b-[4px] border-primary-700"
                        activeOpacity={0.85}
                        onPress={handleWaitAtHome}
                        accessibilityRole="button"
                        accessibilityLabel="Back to home while your opponent finishes"
                      >
                        <Home size={18} color={ICON_COLORS.white} strokeWidth={2.5} />
                        <Text className="text-white font-black text-base">Back to Home</Text>
                      </TouchableOpacity>
                      <Text className="text-slate-400 text-xs text-center mt-2">
                        We&apos;ll let you know when your results are ready.
                      </Text>
                    </>
                  )}
                </View>
              ) : (
                <View
                  className={`rounded-[28px] px-5 pt-5 pb-6 border-2 shadow-lg shadow-black/15 ${cardStyle.bg} ${cardStyle.border}`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className={`flex-row items-center gap-2 pl-3 pr-1 py-1 rounded-full mr-3 flex-shrink ${leagueBg}`}>
                      <Text className="text-[13px] font-semibold text-slate-600" numberOfLines={1}>
                        {matchState.subject}
                      </Text>
                      {!!myLeague && <LeagueBadge league={myLeague} />}
                    </View>
                    {cardStyle.tag && (
                      <View className={`px-2.5 py-1 rounded-full ${cardStyle.tagBg}`}>
                        <Text className="text-white text-[11px] font-black">{cardStyle.tag}</Text>
                      </View>
                    )}
                  </View>

                  <Text className="mt-3 text-[21px] leading-7 font-black text-slate-800">
                    {formatMathText(cardQuestion.question)}
                  </Text>

                  <View className="gap-3 mt-5">
                    {(cardQuestion.options ?? []).map((opt, i) => (
                      <QuizOptionButton
                        key={i}
                        variant="card"
                        label={OPTION_LABELS[i]}
                        optionText={opt}
                        isSelected={selectedOption === opt}
                        disabled={locked}
                        isCorrect={false}
                        isWrongSelected={false}
                        // Free to change until Next -- nothing is sent before then.
                        onPress={() => {
                          if (!locked) setSelectedOption(opt);
                        }}
                      />
                    ))}
                  </View>
                </View>
              )}
              </Animated.View>
            </View>
          </ScrollView>

          {/* Footer: Skip · Next -- same raised styles as Practice's Previous · Next. */}
          {matchState.status === "active" && !cardDone && (
            <View className="flex-row items-center gap-3 px-5 pt-2 pb-3">
              <TouchableOpacity
                className={`h-14 px-4 flex-row justify-center items-center gap-1.5 rounded-2xl bg-white border-b-[5px] border-primary-200 ${
                  locked ? "opacity-40" : ""
                }`}
                activeOpacity={0.85}
                disabled={locked}
                onPress={() => handleMove(null)}
                accessibilityRole="button"
                accessibilityLabel="Skip this question"
              >
                {movingWith === "skip" ? (
                  <ActivityIndicator size="small" color={ICON_COLORS.primary600} />
                ) : (
                  <SkipForward size={18} color={ICON_COLORS.primary600} strokeWidth={2.75} />
                )}
                <Text className="text-lg font-black text-primary-600">Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                // Disabled: a solid muted white rather than the green at low
                // opacity, which read as olive over the orange backdrop.
                className={`flex-1 h-14 flex-row justify-center items-center gap-2 rounded-2xl border-b-[5px] ${
                  locked || selectedOption == null
                    ? "bg-white/25 border-white/10"
                    : "bg-emerald-400 border-emerald-600"
                }`}
                activeOpacity={0.85}
                disabled={locked || selectedOption == null}
                onPress={() => handleMove(selectedOption)}
                accessibilityRole="button"
                accessibilityLabel="Save answer and go to the next question"
              >
                {movingWith === "next" && <ActivityIndicator size="small" color={ICON_COLORS.white} />}
                <Text className="text-lg font-black text-white">{movingWith === "next" ? "Saving…" : "Next"}</Text>
                {movingWith !== "next" && <ChevronRight size={20} color={ICON_COLORS.white} strokeWidth={2.75} />}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>

      <ForfeitModal
        visible={showForfeit}
        onCancel={() => setShowForfeit(false)}
        onConfirm={handleForfeitConfirm}
        isConfirming={isForfeiting}
      />

      {finalResult && (
        <BattleResultsPopup
          visible={showResultsPopup}
          subject={matchState.subject ?? ""}
          me={finalResult.me}
          opponent={finalResult.opponent}
          review={review}
          endedByTime={endedByTime}
          lastAnswerRefused={lastMoveRefusedByTime}
          onRematch={handleRematch}
          onHome={handleResultsHome}
        />
      )}
    </View>
  );
}
