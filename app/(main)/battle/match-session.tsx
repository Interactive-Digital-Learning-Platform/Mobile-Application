import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock, WifiOff, X, XCircle } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { OPTION_LABELS } from "@/constants/quizHelpers";
import { ICON_COLORS } from "@/constants/quizStyles";
import BattleProgressBar from "@/components/quiz-componets/BattleProgressBar";
import ForfeitModal from "@/components/quiz-componets/ForfeitModal";
import LeagueBadge from "@/components/quiz-componets/LeagueBadge";
import QuizOptionButton from "@/components/quiz-componets/QuizOptionButton";
import { useBattleMatchContext } from "@/hooks/use-battle-match";
import { battleKeys, useBattleProfileQuery, useForfeitMatchMutation } from "@/hooks/use-battle";

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
    submitAnswer,
    manualRetry,
  } = useBattleMatchContext();

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

  const questionDeadlineRef = useRef<number | null>(null);

  // A "3,2,1,GO!" beat shown for as long as the match isn't "active" yet
  // (the early return below) -- purely local/cosmetic, not synced to
  // anything real, since queue.tsx already waits for a genuinely active
  // match before ever navigating here and this only ever covers this
  // instance's own brief initial fetch. Holds on "GO!" once it gets there --
  // never loops back to 3 -- so a longer-than-usual gap just sits on "GO!"
  // instead of visibly restarting the count.
  const [countdownValue, setCountdownValue] = useState(3);

  useEffect(() => {
    setCountdownValue(3);
  }, [matchId]);

  useEffect(() => {
    if (matchState?.status === "active" || countdownValue <= 0) return;
    const timer = setTimeout(() => {
      setCountdownValue((v) => v - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdownValue, matchState?.status]);

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
    // Only "active" reaches this handler -- every other status renders one
    // of the early returns above instead of the header this button lives in.
    if (matchState?.status === "active") {
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
    // Modal stays open (isConfirming below covers the pending state in its
    // own buttons) instead of closing immediately -- the screen behind it
    // still shows the live question grid, so leaving the modal up avoids it
    // being visibly interactive during a forfeit that's already in flight.
    //
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

  // queue.tsx always runs all the way through to a genuinely "active" match
  // before it ever navigates here, so in the ordinary case this covers only
  // this instance's own brief initial fetch gap -- shown as the same
  // "3,2,1,GO!" beat either way rather than a separate loading style, since
  // there's no way to tell from in here which case it actually is.
  //
  // Also holds here until matchState.subject has actually arrived, not just
  // status === "active": this connection was opened back while the match
  // was still "waiting" (queue.tsx opens it the instant a match is found),
  // and get_match_state() returns almost nothing for that status -- subject/
  // difficulty/question_count only get backfilled by the countdown_started
  // handler's own REST refetch (see hooks/use-battle-match.tsx). That
  // refetch has the whole countdown phase to land before "active" ever
  // arrives, but trusting timing alone previously showed a live match with
  // a blank subject/league/progress bars if it landed late -- gating on the
  // data itself, not just the status, means a slow refetch just holds the
  // countdown a little longer instead.
  if (!matchState || matchState.status !== "active" || matchState.subject == null) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-slate-400 font-bold text-lg uppercase tracking-widest mb-4">
          {countdownValue > 0 ? "Starting In" : "Get Ready"}
        </Text>
        <Text className="text-primary text-9xl font-black">
          {countdownValue > 0 ? countdownValue : "GO!"}
        </Text>
      </View>
    );
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

      {matchState.status === "active" && (
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
        isConfirming={isForfeiting}
      />
    </SafeAreaView>
  );
}
