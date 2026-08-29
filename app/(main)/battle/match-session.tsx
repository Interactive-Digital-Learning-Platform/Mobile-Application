import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock, Flame, WifiOff, X, XCircle } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { OPTION_LABELS } from "@/constants/quizHelpers";
import { ICON_COLORS } from "@/constants/quizStyles";
import { LEAGUE_STYLES } from "@/constants/battleStyles";
import BattleProgressBar from "@/components/quiz-componets/BattleProgressBar";
import BattleResultsPopup from "@/components/quiz-componets/BattleResultsPopup";
import ForfeitModal from "@/components/quiz-componets/ForfeitModal";
import LeagueBadge from "@/components/quiz-componets/LeagueBadge";
import QuizOptionButton from "@/components/quiz-componets/QuizOptionButton";
import { useBattleMatchContext } from "@/hooks/use-battle-match";
import { battleKeys, useBattleProfileQuery, useForfeitMatchMutation } from "@/hooks/use-battle";

// Must match Quiz-Battle-Service's BATTLE_ANSWER_REVEAL_SECONDS (app/core/
// config.py) -- the server stops accepting/overwriting answers this many
// seconds before a question's window closes (see
// battle_gameplay_service.submit_battle_answer's "already graded" 409).
// Disabling the options client-side at the same instant, rather than only
// once the server's "question_result" reveal actually arrives, avoids a
// last-second tap that's guaranteed to be rejected.
const ANSWER_REVEAL_SECONDS = 5;

// Every non-"answering" state the question card can be in, unified into one
// place -- each maps to a background/border + a small top-right tag,
// exactly the treatment correct/incorrect/time's-up already used, now
// extended to cover the "about to lock" and "locked, awaiting reveal"
// states too instead of those living in separate banners elsewhere on
// the screen.
type QuestionCardState = "answering" | "hurryUp" | "lockedPending" | "correct" | "incorrect" | "timeUp";

const QUESTION_CARD_STYLES: Record<QuestionCardState, { bg: string; border: string; tagBg: string }> = {
  answering: { bg: "bg-white", border: "border-slate-100", tagBg: "" },
  hurryUp: { bg: "bg-amber-100", border: "border-amber-300", tagBg: "bg-amber-500" },
  lockedPending: { bg: "bg-slate-200", border: "border-slate-300", tagBg: "bg-slate-500" },
  correct: { bg: "bg-emerald-100", border: "border-emerald-200", tagBg: "bg-emerald-500" },
  incorrect: { bg: "bg-rose-100", border: "border-rose-200", tagBg: "bg-rose-500" },
  timeUp: { bg: "bg-amber-100", border: "border-amber-200", tagBg: "bg-amber-500" },
};

export default function BattleMatchSessionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { matchId: matchIdStr } = useLocalSearchParams<{ matchId: string }>();
  const matchIdFromParams = matchIdStr ? parseInt(matchIdStr, 10) : null;

  const {
    activeMatchId,
    setActiveMatchId,
    matchState,
    connectionStatus,
    disconnectInfo,
    finalResult,
    lastAnswerFeedback,
    initialLoadError,
    ownScore,
    myProgress,
    opponentProgress,
    revealedQuestionIndex,
    submitAnswer,
    manualRetry,
  } = useBattleMatchContext();

  // Locked once the current question's reveal boundary has fired (server-
  // event-driven, see hooks/use-battle-match.tsx's "question_result"
  // handler) -- not tied to has_answered_current_question anymore, since
  // editable answers mean a selection alone no longer locks anything.
  const isLocked = revealedQuestionIndex === matchState?.question_index;

  // A forfeit (self or opponent) ends the match mid-question -- whatever
  // question was live at that instant is simply abandoned, never graded,
  // so no "question_result" is EVER coming for it. Without this check,
  // finalAnswerRevealed below would wait forever for a reveal that will
  // never arrive, and the results popup would never show at all for a
  // forfeited match. me.result is only ever "forfeit" from MY OWN
  // forfeiting; a win earned because the OPPONENT forfeited still reports
  // as a plain "win" for me, hence checking both sides.
  const matchEndedByForfeit =
    finalResult?.me.result === "forfeit" || finalResult?.opponent?.result === "forfeit";

  // Gates the results popup: either the match ended abruptly with nothing
  // left to grade (matchEndedByForfeit), this connection never tracked a
  // live question_index at all (a reconnect landing directly on an
  // already-"completed" match -- see _build_completed_state, which never
  // carries one to begin with, so there's nothing to wait for), or the
  // live "question_result" for the match's actual FINAL question has
  // already landed (isLocked). Without this, "completed" arriving a beat
  // ahead of that last reveal (a rare event-ordering hiccup, not the
  // normal case -- see _grade_and_reveal_question's timing) would let the
  // popup cover up the final question's own correct/incorrect reveal
  // before the player ever saw it.
  const finalAnswerRevealed = matchEndedByForfeit || matchState?.question_index == null || isLocked;
  const showResultsPopup = matchState?.status === "completed" && !!finalResult && finalAnswerRevealed;

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
    if (hasEnteredLiveMatchRef.current) return;
    if (initialLoadError || matchState?.status === "cancelled") return;
    if (!matchState || matchState.status !== "active" || matchState.subject == null) {
      router.replace({
        pathname: "/(main)/battle/preparing",
        params: { matchId: String(matchId), subject: matchState?.subject ?? "" },
      } as any);
    }
  }, [matchId, matchState, initialLoadError, router]);

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
  // Lighter tint of the player's own league color, standing in for the
  // question card's plain neutral ("answering") background -- falls back
  // to white until the profile query resolves the league, rather than
  // flashing a default league's color. The screen behind it stays plain
  // white so the card keeps clear contrast against it.
  const leagueBg = myLeague ? LEAGUE_STYLES[myLeague].bg : "bg-white";

  const [showForfeit, setShowForfeit] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [, forceTick] = useState(0);

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

  const questionDeadlineRef = useRef<number | null>(null);

  useEffect(() => {
    setSelectedOption(null);
  }, [matchState?.question_index]);

  useEffect(() => {
    if (matchState?.status === "active" && matchState.time_remaining_seconds != null) {
      questionDeadlineRef.current = Date.now() + matchState.time_remaining_seconds * 1000;
    }
  }, [matchState?.question_index, matchState?.status]);

  useEffect(() => {
    if (matchState?.status !== "active") return;
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [matchState?.status]);

  // Recomputed on every render -- the forceTick interval above re-renders
  // this component once a second while active, so this always reflects the
  // current countdown without needing its own effect/state. Disabling
  // options here (client-predicted) rather than only once the server's
  // "question_result" reveal actually arrives avoids a last-second tap
  // that's guaranteed to be rejected with a 409.
  const secondsRemaining = Math.max(
    0,
    Math.ceil(((questionDeadlineRef.current ?? Date.now()) - Date.now()) / 1000)
  );
  const optionsDisabled = isLocked || secondsRemaining <= ANSWER_REVEAL_SECONDS;
  // 3, 2, 1 warning in the last 3 seconds before the lock -- 0 once the
  // lock threshold itself is reached (options already disabled at that
  // point, see optionsDisabled above).
  const secondsUntilLock = Math.max(0, secondsRemaining - ANSWER_REVEAL_SECONDS);

  const questionCardState: QuestionCardState =
    isLocked && lastAnswerFeedback
      ? lastAnswerFeedback.isCorrect
        ? "correct"
        : lastAnswerFeedback.answered
          ? "incorrect"
          : "timeUp"
      : optionsDisabled
        ? "lockedPending"
        : secondsUntilLock > 0 && secondsUntilLock <= 3
          ? "hurryUp"
          : "answering";
  const questionCardTagLabel =
    questionCardState === "hurryUp"
      ? `Locking in ${secondsUntilLock}…`
      : questionCardState === "lockedPending"
        ? "Locked in"
        : questionCardState === "correct"
          ? "Correct"
          : questionCardState === "incorrect"
            ? "Incorrect"
            : questionCardState === "timeUp"
              ? "Time's up"
              : null;

  // Blinks the question card only during the "about to lock" warning --
  // every other state (including the plain locked-in gray) is a steady
  // color, blinking is reserved for the one state that's actively urging a
  // decision.
  const cardBlinkOpacity = useSharedValue(1);
  useEffect(() => {
    if (questionCardState === "hurryUp") {
      cardBlinkOpacity.value = withRepeat(
        withSequence(withTiming(0.5, { duration: 350 }), withTiming(1, { duration: 350 })),
        -1,
        true
      );
    } else {
      cardBlinkOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [questionCardState, cardBlinkOpacity]);
  const cardBlinkStyle = useAnimatedStyle(() => ({ opacity: cardBlinkOpacity.value }));

  // "+N" floats up next to the score header exactly once per graded
  // question -- keyed on revealedQuestionIndex (not lastAnswerFeedback
  // itself) so a reconnect's state_sync hydration of the same already-
  // graded question doesn't replay it. No popup at all for 0 points
  // (wrong/time's-up), since there's nothing being "added" to show.
  const [scoreGain, setScoreGain] = useState<number | null>(null);
  const scoreGainOpacity = useSharedValue(0);
  const scoreGainY = useSharedValue(0);
  useEffect(() => {
    if (revealedQuestionIndex == null || !lastAnswerFeedback || lastAnswerFeedback.totalQuestionScore <= 0) return;
    setScoreGain(lastAnswerFeedback.totalQuestionScore);
    scoreGainOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withDelay(1500, withTiming(0, { duration: 500 }))
    );
    scoreGainY.value = 0;
    scoreGainY.value = withTiming(-22, { duration: 2000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealedQuestionIndex]);
  const scoreGainStyle = useAnimatedStyle(() => ({
    opacity: scoreGainOpacity.value,
    transform: [{ translateY: scoreGainY.value }],
  }));

  // Consecutive-correct count ending at the most recently graded question --
  // scanning myProgress backward from its end mirrors the backend's own
  // _streak_before logic exactly (same "stop at the first non-correct"
  // rule), so this always matches what's actually earning the streak bonus
  // server-side rather than an independent guess.
  let currentStreak = 0;
  for (let i = myProgress.length - 1; i >= 0; i--) {
    if (!myProgress[i].is_correct) break;
    currentStreak++;
  }
  // Matches BATTLE_STREAK_BONUS_TIER1_MIN_STREAK -- the streak badge only
  // appears once it's actually earning a bonus, not for a single correct
  // answer (which isn't a "streak" yet).
  const onStreak = currentStreak >= 2;

  const streakScale = useSharedValue(1);
  useEffect(() => {
    if (!onStreak) return;
    streakScale.value = withSequence(withTiming(1.25, { duration: 150 }), withTiming(1, { duration: 200 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStreak]);
  const streakStyle = useAnimatedStyle(() => ({ transform: [{ scale: streakScale.value }] }));

  useEffect(() => {
    if (matchState?.status === "completed" && finalResult) {
      // Covers both a natural finish and a forfeit -- forfeit doesn't
      // navigate on its own (see handleForfeitConfirm below), it just waits
      // for this same WS-driven "completed" transition. Invalidating here
      // means the history list behind this screen is stale until it's next
      // read, not stale until its 30s staleTime window happens to expire.
      queryClient.invalidateQueries({ queryKey: [...battleKeys.all, "history"] });
      queryClient.invalidateQueries({ queryKey: battleKeys.profile });
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
      // No navigation here anymore -- BattleResultsPopup renders as a Modal
      // over this same screen (see the return below), gated on
      // finalAnswerRevealed so it never covers the final question's own
      // reveal. This screen simply never navigates away on match end.
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

  const handleBack = () => {
    // "active" opens the forfeit confirmation; "completed" (behind the
    // results popup) and "cancelled"/load-error (their own early-return
    // screens above) all just leave via the same dismissTo path.
    if (matchState?.status === "active") {
      setShowForfeit(true);
    } else {
      handleResultsHome();
    }
  };

  const handleForfeitConfirm = () => {
    if (matchId === null) return;
    // Modal stays open (isConfirming below covers the pending state in its
    // own buttons) instead of closing immediately -- the screen behind it
    // still shows the live question grid, so leaving the modal up avoids it
    // being visibly interactive during a forfeit that's already in flight.
    //
    // No onSuccess navigation here -- the REST response only confirms the
    // forfeit was recorded. The actual transition away from this screen is
    // still driven by the existing WS match_finished handling above (same
    // socket this screen already listens on), which populates finalResult
    // and flips matchState.status to "completed", triggering the
    // BattleResultsPopup below (once the final question's own reveal has
    // landed). This just makes SENDING the forfeit reliable, not the
    // popup that follows it.
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
  // rendering the board -- including the final question's own reveal --
  // behind it rather than going blank. Anything else not-yet-"active" is
  // still the one-frame gap before the redirect effect above sends us to
  // preparing.tsx.
  if (!matchState || (matchState.status !== "active" && matchState.status !== "completed") || matchState.subject == null) {
    return null;
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-slate-100 justify-center items-center"
          activeOpacity={0.7}
          onPress={handleBack}
        >
          <X size={18} color={ICON_COLORS.slate500} strokeWidth={2.5} />
        </TouchableOpacity>

        <View className="items-center">
          <Text className="text-md font-black text-slate-800">{matchState.subject}</Text>
          {!!myLeague && (
            <View className="self-center mt-0.5">
              <LeagueBadge league={myLeague} />
            </View>
          )}
        </View>

        <View className="w-9 h-9 items-center justify-center">
          {connectionStatus !== "open" && (
            <WifiOff size={16} color={ICON_COLORS.amber500} strokeWidth={2.5} />
          )}
        </View>
      </View>

      {connectionStatus === "closed" && (
        <View className="bg-rose-100 mx-4 rounded-xl px-3 py-2 mb-2 flex-row items-center gap-2">
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
        <View className="bg-amber-100 mx-4 rounded-xl px-3 py-2 mb-2 flex-row items-center gap-2">
          <WifiOff size={14} color={ICON_COLORS.amber600} strokeWidth={2.5} />
          <Text className="text-amber-700 text-xs font-semibold flex-1">
            Opponent disconnected — waiting for them to reconnect…
          </Text>
        </View>
      )}

      {(matchState.status === "active" || matchState.status === "completed") && matchState.question != null && (
        <View className="flex-1">
          <View className="mx-4 mt-2 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xs text-slate-400 font-medium">
                Question {(matchState.question_index ?? 0) + 1} / {matchState.question_count}
              </Text>
            </View>
            <View className="flex-1 items-center">
              <View className="items-center">
                <Text className="text-2xl font-black text-slate-800">{ownScore}</Text>
                {scoreGain != null && (
                  <Animated.View
                    style={[scoreGainStyle, { position: "absolute", top: -4, alignSelf: "center" }]}
                    pointerEvents="none"
                  >
                    <Text className="text-emerald-500 font-black text-sm">+{scoreGain}</Text>
                  </Animated.View>
                )}
              </View>
              <Text className="text-[8px] font-bold text-slate-400 uppercase tracking-wide -mt-1">
                Score
              </Text>
            </View>
            <View className="flex-1 flex-row items-center justify-end gap-1">
              <Clock size={13} color={ICON_COLORS.primary500} strokeWidth={3} />
              <Text className="text-sm font-black text-primary">{secondsRemaining}s</Text>
            </View>
          </View>

          {onStreak && (
            <Animated.View
              style={streakStyle}
              className="mx-4 mt-1.5 flex-row items-center justify-center gap-1 self-center bg-amber-100 px-2.5 py-1 rounded-full"
            >
              <Flame size={13} color={ICON_COLORS.amber500} strokeWidth={2.5} />
              <Text className="text-amber-600 font-black text-xs">{currentStreak} Streak!</Text>
            </Animated.View>
          )}

          <View className="mx-4 mt-3">
            <BattleProgressBar
              label="You"
              count={matchState.question_count ?? 0}
              currentIndex={matchState.question_index ?? 0}
              answers={myProgress}
              size="md"
            />
            <View className="mt-2">
              <BattleProgressBar
                label="Opponent"
                count={matchState.question_count ?? 0}
                currentIndex={matchState.question_index ?? 0}
                answers={opponentProgress}
                size="sm"
              />
            </View>
          </View>

          <Animated.View
            style={cardBlinkStyle}
            className={`rounded-2xl py-8 px-4 m-4 border shadow-sm shadow-black/5 relative ${
              questionCardState === "answering" ? leagueBg : QUESTION_CARD_STYLES[questionCardState].bg
            } ${QUESTION_CARD_STYLES[questionCardState].border}`}
          >
            {questionCardTagLabel && (
              <View
                className={`absolute -top-2.5 right-4 px-2.5 py-1 rounded-full ${
                  QUESTION_CARD_STYLES[questionCardState].tagBg
                }`}
              >
                <Text className="text-white text-[10px] font-black">{questionCardTagLabel}</Text>
              </View>
            )}
            <Text className="font-bold text-slate-800 leading-6 text-xl">
              {matchState.question?.question}
            </Text>
          </Animated.View>

          <View className="flex-1">
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
              <View className="px-4 gap-2.5">
                {(matchState.question?.options ?? []).map((opt, i) => (
                  <QuizOptionButton
                    key={i}
                    label={OPTION_LABELS[i]}
                    optionText={opt}
                    isSelected={selectedOption === opt}
                    disabled={optionsDisabled}
                    isCorrect={isLocked && lastAnswerFeedback?.correctAnswer === opt}
                    isWrongSelected={
                      isLocked && !lastAnswerFeedback?.isCorrect && selectedOption === opt
                    }
                    onPress={() => {
                      // Editable answers: tapping a different option before
                      // the question locks just resubmits -- skip if it's
                      // already the current selection to avoid a pointless
                      // resubmit that would only push the response-time-for-
                      // scoring later for no reason.
                      if (opt === selectedOption) return;
                      setSelectedOption(opt);
                      if (matchState.question) {
                        submitAnswer(matchState.question.question_id, opt);
                      }
                    }}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      )}

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
          onRematch={handleRematch}
          onHome={handleResultsHome}
        />
      )}
    </SafeAreaView>
  );
}
