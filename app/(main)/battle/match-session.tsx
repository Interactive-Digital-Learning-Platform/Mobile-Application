import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AlertTriangle, Brain, Clock, Sparkles, Swords, WifiOff, X, XCircle, Zap } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { OPTION_LABELS } from "@/constants/quizHelpers";
import { ICON_COLORS } from "@/constants/quizStyles";
import { getLeagueStyle } from "@/constants/battleStyles";
import BattleProgressBar from "@/components/quiz-componets/BattleProgressBar";
import ForfeitModal from "@/components/quiz-componets/ForfeitModal";
import QuizOptionButton from "@/components/quiz-componets/QuizOptionButton";
import QuizStatusScreen, { type QuizStatusStep } from "@/components/loading/QuizStatusScreen";
import { useBattleMatch } from "@/hooks/use-battle-match";
import { useBattleProfileQuery, useForfeitMatchMutation } from "@/hooks/use-battle";

const GENERATING_STEPS: QuizStatusStep[] = [
  { icon: Swords, text: "Entering the arena…" },
  { icon: Brain,  text: "Selecting your questions…" },
  { icon: Zap,    text: "Balancing the difficulty…" },
  { icon: Sparkles, text: "Almost ready!" },
];

export default function BattleMatchSessionScreen() {
  const router = useRouter();
  const { matchId: matchIdStr } = useLocalSearchParams<{ matchId: string }>();
  const matchId = matchIdStr ? parseInt(matchIdStr, 10) : null;

  const {
    matchState,
    connectionStatus,
    disconnectInfo,
    finalResult,
    lastAnswerFeedback,
    initialLoadError,
    ownScore,
    myProgress,
    opponentProgress,
    submitAnswer,
    manualRetry,
  } = useBattleMatch(matchId);

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

  const [showForfeit, setShowForfeit] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [, forceTick] = useState(0);
  // The ring-fill animation in QuizStatusScreen ("generating") needs to
  // visibly finish even if the real match status flips to "countdown"
  // before its animation would — same isSuccess/readyToShowQuiz split
  // quiz-session.tsx uses, so the loading screen never gets cut off mid-fill.
  const [generatingDone, setGeneratingDone] = useState(false);

  const questionDeadlineRef = useRef<number | null>(null);
  const countdownDeadlineRef = useRef<number | null>(null);
  // The server's real countdown budget (matchState.started_at) is computed
  // BEFORE select_battle_questions runs (see _activate_countdown in
  // battle_gameplay_service.py), which can itself take a couple of seconds
  // (AI question generation) -- so by the time countdown_started even
  // reaches this screen, that budget may already be mostly or fully spent,
  // sometimes leaving zero real seconds to visibly count down. This floor
  // guarantees a full "3, 2, 1, GO!" beat is always shown for at least 3
  // real seconds after the generating screen finishes, regardless of how
  // much of the server's own budget it already used.
  const localCountdownFloorRef = useRef<number | null>(null);

  useEffect(() => {
    setSelectedOption(null);
  }, [matchState?.question_index]);

  useEffect(() => {
    if (matchState?.status === "active" && matchState.time_remaining_seconds != null) {
      questionDeadlineRef.current = Date.now() + matchState.time_remaining_seconds * 1000;
    }
  }, [matchState?.question_index, matchState?.status]);

  useEffect(() => {
    if (matchState?.status === "countdown" && matchState.started_at) {
      countdownDeadlineRef.current = new Date(matchState.started_at).getTime();
    }
  }, [matchState?.status, matchState?.started_at]);

  useEffect(() => {
    if (matchState?.status !== "countdown" && matchState?.status !== "active") return;
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [matchState?.status]);

  useEffect(() => {
    if (matchState?.status === "completed" && finalResult) {
      router.replace({
        pathname: "/(main)/battle/battle-results",
        params: {
          subject: matchState.subject ?? "",
          meJson: JSON.stringify(finalResult.me),
          opponentJson: finalResult.opponent ? JSON.stringify(finalResult.opponent) : "",
        },
      } as any);
    }
  }, [matchState?.status, finalResult]);

  const handleBack = () => {
    // "waiting" can't reach this handler -- that status always renders the
    // "generating" early return above instead of the header this button lives in.
    if (matchState?.status === "countdown" || matchState?.status === "active") {
      setShowForfeit(true);
    } else {
      // dismissTo (not replace): this pops the whole battle/queue/match-session
      // stack back to the existing quiz tab screen, instead of just swapping
      // the visible screen and potentially leaving the battle stack mounted
      // in the background -- see battle-results.tsx's Home button for the
      // full rationale.
      router.dismissTo("/(tabs)/quiz");
    }
  };

  const handleForfeitConfirm = () => {
    if (matchId === null) return;
    setShowForfeit(false);
    // No onSuccess navigation here -- the REST response only confirms the
    // forfeit was recorded. The actual transition away from this screen is
    // still driven by the existing WS match_finished handling above (same
    // socket this screen already listens on), which populates finalResult
    // and flips matchState.status to "completed", triggering the effect
    // that navigates to battle-results. This just makes SENDING the
    // forfeit reliable, not the navigation that follows it.
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

  // Both players are already ready by the time this screen is reached (that's
  // exactly what queue.tsx waits for before navigating here), so the real
  // work left is the backend selecting this match's questions -- shown as
  // the same "generating" loading screen practice mode uses, bridging the
  // gap until the "countdown_started" WS event actually flips the status.
  if (!generatingDone) {
    return (
      <QuizStatusScreen
        title="Preparing Match"
        steps={GENERATING_STEPS}
        subject={matchState?.subject ?? "Battle"}
        difficulty={matchState?.difficulty ?? "Adaptive"}
        isComplete={!!matchState && matchState.status !== "waiting"}
        onComplete={() => setGeneratingDone(true)}
      />
    );
  }

  // Unreachable in practice: generatingDone can only flip once isComplete
  // above was true, which itself requires matchState to be non-null -- this
  // is just narrowing the type for everything below.
  if (!matchState) return null;

  const leagueStyle = getLeagueStyle(myLeague);

  // Set once, synchronously during render (not in an effect, which would
  // land a whole tick late and let the "active" branch flash first): the
  // very first render after generatingDone flips true is exactly when this
  // needs to already be in place for countdownEffectiveDeadline below.
  if (localCountdownFloorRef.current === null) {
    localCountdownFloorRef.current = Date.now() + 3000;
  }

  // Whichever deadline is later wins: the server's real one (when there was
  // still budget left to show) or the local floor (when the server's
  // budget was already spent by the time we got here) -- see
  // localCountdownFloorRef's comment above for why the latter is needed.
  const countdownEffectiveDeadline = Math.max(
    countdownDeadlineRef.current ?? 0,
    localCountdownFloorRef.current ?? 0
  );
  const isCountingDown =
    (matchState.status === "countdown" || matchState.status === "active") &&
    Date.now() < countdownEffectiveDeadline;

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
            <View className={`self-center px-2 py-0.5 rounded-full mt-0.5 ${leagueStyle.bg}`}>
              <Text className={`text-[11px] font-bold ${leagueStyle.text}`}>{myLeague}</Text>
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

      {isCountingDown && (() => {
        const secondsLeft = Math.max(0, Math.ceil((countdownEffectiveDeadline - Date.now()) / 1000));
        // The full deadline can be longer than 3 seconds, but the visible
        // "3, 2, 1, GO!" only needs to cover the final stretch -- clamping
        // here means the early part just holds on "3" instead of counting
        // down from the real (larger) duration.
        const display = Math.min(secondsLeft, 3);
        return (
          // Absolutely positioned over the whole screen (not just the flex
          // space below the header) -- the header above takes up its own
          // height, so a plain flex-1 centered View here would center
          // itself within the remaining space, not the true screen center.
          <View className="absolute inset-0 items-center justify-center bg-white">
            <Text className="text-slate-400 font-bold text-lg uppercase tracking-widest mb-4">
              {display > 0 ? "Starting In" : "Get Ready"}
            </Text>
            <Text className="text-primary text-9xl font-black">
              {display > 0 ? display : "GO!"}
            </Text>
          </View>
        );
      })()}

      {matchState.status === "active" && !isCountingDown && (
        <View className="flex-1">
          <View className="mx-4 mt-2 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xs text-slate-400 font-medium">
                Question {(matchState.question_index ?? 0) + 1} / {matchState.question_count}
              </Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-2xl font-black text-slate-800">{ownScore}</Text>
              <Text className="text-[8px] font-bold text-slate-400 uppercase tracking-wide -mt-1">
                Score
              </Text>
            </View>
            <View className="flex-1 flex-row items-center justify-end gap-1">
              <Clock size={13} color={ICON_COLORS.primary500} strokeWidth={3} />
              <Text className="text-sm font-black text-primary">
                {Math.max(
                  0,
                  Math.ceil(((questionDeadlineRef.current ?? Date.now()) - Date.now()) / 1000)
                )}
                s
              </Text>
            </View>
          </View>

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

          <View className="bg-white rounded-2xl py-8 px-4 m-4 border border-slate-100 shadow-sm shadow-black/5">
            <Text className="font-bold text-slate-800 leading-6 text-xl">
              {matchState.question?.question}
            </Text>
          </View>

          <View className="flex-1">
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
              <View className="px-4 gap-2.5">
                {(matchState.question?.options ?? []).map((opt, i) => {
                  const isLocked = !!matchState.has_answered_current_question;
                  return (
                    <QuizOptionButton
                      key={i}
                      label={OPTION_LABELS[i]}
                      optionText={opt}
                      isSelected={selectedOption === opt}
                      disabled={isLocked}
                      onPress={() => {
                        setSelectedOption(opt);
                        if (matchState.question) {
                          submitAnswer(matchState.question.question_id, opt);
                        }
                      }}
                    />
                  );
                })}
              </View>

              {lastAnswerFeedback && matchState.has_answered_current_question && (
                <View
                  className={`mx-4 mt-4 rounded-xl px-4 py-3 ${
                    lastAnswerFeedback.isCorrect ? "bg-emerald-100" : "bg-rose-100"
                  }`}
                >
                  <Text
                    className={`font-black text-sm ${
                      lastAnswerFeedback.isCorrect ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {lastAnswerFeedback.isCorrect
                      ? `Correct! +${lastAnswerFeedback.totalQuestionScore} points`
                      : "Incorrect"}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      <ForfeitModal
        visible={showForfeit}
        onCancel={() => setShowForfeit(false)}
        onConfirm={handleForfeitConfirm}
      />

      {isForfeiting && (
        // Covers the whole screen (not just a modal) from the moment
        // forfeit is confirmed until the WS match_finished handling above
        // navigates away to battle-results -- the live question grid stays
        // interactive/frozen mid-state underneath otherwise, which looks
        // broken during that brief gap.
        <View className="absolute inset-0 items-center justify-center bg-white">
          <ActivityIndicator size="large" color={ICON_COLORS.primary500} style={{ marginBottom: 16 }} />
          <Text className="text-slate-800 font-black text-lg">Ending Match…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
