import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Text } from "@/components/ui/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Trophy,
  BarChart2,
  RotateCcw,
  Home,
  ChevronDown,
  ChevronUp,
  AlarmClock,
  Frown,
  Smile,
  Laugh,
  Annoyed,
  Timer,
  Quote,
  CloudOff,
  type LucideIcon,
} from "lucide-react-native";

import AnswerReviewCard    from "@/components/quiz-componets/AnswerReviewCard";
import ConfettiView        from "@/components/quiz-componets/ConfettiView";
import RestartConfirmModal from "@/components/quiz-componets/RestartConfirmModal";
import CircularProgressRing from "@/components/quiz-componets/CircularProgressRing";
import { buildAnswerPayload, fetchMotivationalQuote, fetchQuizSession } from "@/api/quizAPI";
import { useSubmitQuizMutation, useSubmitQuizTimeoutMutation } from "@/hooks/use-quiz";
import type { QuestionOut, QuestionResult, SavedQuizResponse, SubmitQuizResponse } from "@/types/quizModuleTypes";
import { ICON_COLORS } from "@/constants/quizStyles";

interface ScoreTheme {
  heroFrom: string;
  heroTo:   string;
  screenBg: string;
  heroBg:   string;
  pillBg:   string;
  pillText: string;
  label:    string;
  Icon:     LucideIcon;
  iconColor: string;
  tagline:  string;
  confetti: boolean;
}

function getTheme(pct: number, isTimeout: boolean): ScoreTheme {
  if (isTimeout) {
    return {
      heroFrom: "#475569", heroTo: "#1E293B",
      screenBg: "bg-white", heroBg: "bg-slate-700",
      pillBg: "bg-slate-500", pillText: "text-slate-100",
      label: "Time's Up",
      Icon: AlarmClock, iconColor: ICON_COLORS.white,
      tagline: "You ran out of time — keep practising!",
      confetti: false,
    };
  }
  if (pct >= 90) {
    return {
      heroFrom: "#F59E0B", heroTo: "#D97706",
      screenBg: "bg-white", heroBg: "bg-amber-500",
      pillBg: "bg-amber-400", pillText: "text-amber-900",
      label: "Outstanding!",
      Icon: Laugh, iconColor: ICON_COLORS.white,
      tagline: "Perfect mastery — you nailed it!",
      confetti: true,
    };
  }
  if (pct >= 70) {
    return {
      heroFrom: "#10B981", heroTo: "#059669",
      screenBg: "bg-white", heroBg: "bg-emerald-600",
      pillBg: "bg-emerald-500", pillText: "text-emerald-50",
      label: "Great Job!",
      Icon: Smile, iconColor: ICON_COLORS.white,
      tagline: "Solid performance — keep it up!",
      confetti: false,
    };
  }
  if (pct >= 50) {
    return {
      heroFrom: "#3B82F6", heroTo: "#2563EB",
      screenBg: "bg-white", heroBg: "bg-blue-600",
      pillBg: "bg-blue-500", pillText: "text-blue-50",
      label: "Not Bad",
      Icon: Annoyed, iconColor: ICON_COLORS.white,
      tagline: "Halfway there — revise and try again!",
      confetti: false,
    };
  }
  return {
    heroFrom: "#F43F5E", heroTo: "#E11D48",
    screenBg: "bg-white", heroBg: "bg-rose-600",
    pillBg: "bg-rose-500", pillText: "text-rose-50",
    label: "Keep Trying",
    Icon: Frown, iconColor: ICON_COLORS.white,
    tagline: "Don't give up — practice makes perfect!",
    confetti: false,
  };
}

// What this screen needs, from either the submit response or (if that never arrived) the completed session.
interface ResultsData {
  correct_count: number;
  accuracy: number;
  avg_response_time: number | null;
  repeated_correct_count: number;
  repeated_wrong_count: number;
  question_results: QuestionResult[];
}

function fromSubmit(data: SubmitQuizResponse): ResultsData {
  return {
    correct_count: data.correct_count,
    accuracy: data.accuracy,
    avg_response_time: data.avg_response_time,
    repeated_correct_count: data.repeated_correct_count,
    repeated_wrong_count: data.repeated_wrong_count,
    question_results: data.question_results ?? [],
  };
}

// A submit can land on the server even though its response was lost -- the completed session then carries the
// score and, now that it's complete, the answer key.
function fromCompletedSession(session: SavedQuizResponse): ResultsData | null {
  const done = session.completion;
  if (!done) return null;
  return {
    correct_count: done.correct_count,
    accuracy: done.accuracy,
    avg_response_time: null,
    repeated_correct_count: done.repeated_correct_count,
    repeated_wrong_count: done.repeated_wrong_count,
    question_results: session.questions.map((q) => ({
      question_id: q.id, selected_answer: "", correct_answer: q.correct_answer ?? null, is_correct: null,
    })),
  };
}

export default function QuizResultsScreen() {
  const router = useRouter();
  const {
    subject,
    difficulty,
    questionCount,
    timer: timerMinutes,
    sessionId,
    answersJson,
    questionsJson,
    questionTimesJson,
    remainingTime,
    isTimeout,
    submitDataJson,
  } = useLocalSearchParams<{
    subject:         string;
    difficulty:      string;
    questionCount:   string;
    timer:           string;
    sessionId:       string;
    answersJson:     string;
    questionsJson:   string;
    questionTimesJson?: string;
    remainingTime?:  string;
    isTimeout:       string;
    submitDataJson?: string;
  }>();

  const totalQ   = parseInt(questionCount ?? "10");
  const timedOut = isTimeout === "true";

  const answers: Record<number, number> =
    answersJson ? JSON.parse(answersJson) : {};
  const initialSubmit: SubmitQuizResponse | null =
    submitDataJson ? JSON.parse(submitDataJson) : null;
  const [results, setResults] = useState<ResultsData | null>(initialSubmit ? fromSubmit(initialSubmit) : null);
  // Without the submit response there's nothing to grade against: the answer key is only sent after submitting,
  // so a local fallback would show 0%. Recover the real result from the server instead.
  const [recovery, setRecovery] = useState<"idle" | "working" | "failed">(initialSubmit ? "idle" : "working");

  const rawQuestions: QuestionOut[] = questionsJson ? (JSON.parse(questionsJson) as QuestionOut[]) : [];
  // The answer key isn't sent with the questions anymore (so it can't be read before submitting) -- it arrives
  // per question in the submit response, merged in here for the review list.
  const answerKey = new Map((results?.question_results ?? []).map((r) => [r.question_id, r.correct_answer]));
  const questions: QuestionOut[] = rawQuestions.map((q) => ({
    ...q,
    correct_answer: answerKey.get(q.id) ?? q.correct_answer ?? null,
  }));

  const { mutateAsync: submitNormal } = useSubmitQuizMutation();
  const { mutateAsync: submitTimeout } = useSubmitQuizTimeoutMutation();

  const recover = useCallback(async () => {
    setRecovery("working");
    const id = Number(sessionId);
    try {
      // Already completed on the server (only the response was lost)? Use that -- re-submitting would be a 409.
      const saved = await fetchQuizSession(id).catch(() => null);
      const completed = saved ? fromCompletedSession(saved) : null;
      if (completed) {
        setResults(completed);
        setRecovery("idle");
        return;
      }
      const payload = {
        session_id: id,
        answers: buildAnswerPayload(rawQuestions, answers, questionTimesJson ? JSON.parse(questionTimesJson) : {}),
        ended_by: (timedOut ? "timeout" : "submitted") as "timeout" | "submitted",
        remaining_time_at_end: timedOut ? 0 : Number(remainingTime ?? 0),
        repeated_question_ids: [],
      };
      const data = await (timedOut ? submitTimeout(payload) : submitNormal(payload));
      setResults(fromSubmit(data));
      setRecovery("idle");
    } catch {
      setRecovery("failed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, answersJson, questionsJson, questionTimesJson, remainingTime, timedOut]);

  const recoveryStarted = useRef(false);
  useEffect(() => {
    if (results || recoveryStarted.current) return;
    recoveryStarted.current = true;
    recover();
  }, [results, recover]);

  const correctCount  = results?.correct_count ?? 0;
  const accuracy      = results?.accuracy ?? 0;
  const avgTime       = results?.avg_response_time ?? null;
  const skippedCount  = totalQ - Object.keys(answers).length;
  const wrongCount    = Math.max(0, totalQ - correctCount - skippedCount);
  const pct           = Math.round(accuracy);
  const theme         = getTheme(pct, timedOut);

  const repeatedCorrect = results?.repeated_correct_count ?? 0;
  const repeatedWrong   = results?.repeated_wrong_count   ?? 0;
  const hasRepeats      = repeatedCorrect + repeatedWrong > 0;

  const [showReview,  setShowReview]  = useState(false);
  const [showRestart, setShowRestart] = useState(false);

  const [quote,        setQuote]        = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);

  useEffect(() => {
    // Only once there's a real score to react to.
    if (!results) return;
    let cancelled = false;

    fetchMotivationalQuote({
      subject: subject ?? "",
      difficulty: difficulty ?? "medium",
      accuracy: pct,
      correct_count: correctCount,
      total_questions: totalQ,
      is_timeout: timedOut,
    })
      .then((res) => {
        if (!cancelled) setQuote(res.quote);
      })
      .catch(() => {
        // Non-critical — the results screen works fine without a quote.
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results !== null]);

  const heroY   = useSharedValue(-80);
  const heroOp  = useSharedValue(0);
  const statsY  = useSharedValue(60);
  const statsOp = useSharedValue(0);

  useEffect(() => {
    heroOp.value  = withTiming(1, { duration: 100 });
    heroY.value   = withSpring(0, { damping: 16, stiffness: 130 });
    statsOp.value = withDelay(150, withTiming(1, { duration: 200 }));
    statsY.value  = withDelay(150, withSpring(0, { damping: 18, stiffness: 120 }));
  }, []);

  const heroStyle  = useAnimatedStyle(() => ({
    opacity:   heroOp.value,
    transform: [{ translateY: heroY.value }],
  }));
  const statsStyle = useAnimatedStyle(() => ({
    opacity:   statsOp.value,
    transform: [{ translateY: statsY.value }],
  }));

  const handleRestart = () => {
    setShowRestart(false);
    router.replace({
      pathname: "/(main)/quiz/quiz-session",
      params: {
        subject, difficulty, questionCount, timer: timerMinutes,
        resumeSessionId: sessionId,
        restartSession:  "true",
      },
    } as any);
  };

  if (!results) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-white items-center justify-center px-8">
        {recovery === "failed" ? (
          <>
            <View className="w-16 h-16 rounded-full bg-rose-100 items-center justify-center mb-4">
              <CloudOff size={28} color={ICON_COLORS.rose500} strokeWidth={2} />
            </View>
            <Text className="text-slate-800 font-black text-lg text-center mb-1">Couldn&apos;t submit your answers</Text>
            <Text className="text-slate-400 text-sm text-center mb-6">
              Your answers are saved on this screen. Check your connection and try again.
            </Text>
            <TouchableOpacity
              className="bg-primary px-6 py-3.5 rounded-2xl mb-3"
              activeOpacity={0.85}
              onPress={recover}
              accessibilityRole="button"
            >
              <Text className="text-white font-black text-sm">Try again</Text>
            </TouchableOpacity>
            <TouchableOpacity className="px-6 py-3" activeOpacity={0.85} onPress={() => router.replace("/(tabs)/quiz")}>
              <Text className="text-slate-500 font-bold text-sm">Back to Quizzes</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={ICON_COLORS.primary500} />
            <Text className="text-slate-500 text-sm mt-4">Submitting your answers…</Text>
          </>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className={`flex-1 ${theme.screenBg}`}>
      {theme.confetti && <ConfettiView count={100} />}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Animated.View
          style={heroStyle}
          className={`mx-4 mt-5 rounded-3xl overflow-hidden shadow-lg ${theme.heroBg}`}
        >
          {timedOut && (
            <View className="bg-black/20 flex-row items-center justify-center gap-2 py-2.5">
              <Clock size={14} color={ICON_COLORS.white} strokeWidth={2.5} />
              <Text className="text-white text-xs font-black tracking-wide uppercase">
                Session ended by timeout
              </Text>
            </View>
          )}

          <View className="items-center px-6 pt-8 pb-8">
            <View className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/30 justify-center items-center">
              <theme.Icon size={38} color={theme.iconColor} strokeWidth={1.8} />
            </View>

            <Text className="text-white text-2xl font-black mt-4">{theme.label}</Text>
            <Text className="text-white/70 text-sm text-center mt-1 mb-6">{theme.tagline}</Text>

            <CircularProgressRing
              pct={pct}
              correct={correctCount}
              total={totalQ}
              strokeColor={ICON_COLORS.white}
              trackColor="rgba(255,255,255,0.20)"
              textColor={ICON_COLORS.white}
            />

            <View className="flex-row gap-2 mt-6 w-full items-center">
              <View className="flex-1 bg-white/20 rounded-2xl p-3 items-center justify-center">
                <Trophy size={20} color={ICON_COLORS.white} strokeWidth={2} />
                <Text className="text-white font-black text-lg mt-1">{pct}%</Text>
                <Text className="text-white/60 text-[8px] font-semibold uppercase tracking-wide">
                  Accuracy
                </Text>
              </View>

              <View className="flex-1 bg-white/20 rounded-2xl p-3 items-center justify-center">
                <CheckCircle2 size={20} color={ICON_COLORS.white} strokeWidth={2} />
                <Text className="text-white font-black text-lg mt-1">{correctCount}</Text>
                <Text className="text-white/60 text-[8px] font-semibold uppercase tracking-wide">
                  Correct
                </Text>
              </View>

              <View className="flex-1 bg-white/20 rounded-2xl p-3 items-center justify-center">
                <XCircle size={20} color={ICON_COLORS.white} strokeWidth={2} />
                <Text className="text-white font-black text-lg mt-1">{wrongCount}</Text>
                <Text className="text-white/60 text-[8px] font-semibold uppercase tracking-wide">
                  Wrong
                </Text>
              </View>

              {avgTime !== null ? (
                <View className="flex-1 bg-white/20 rounded-2xl p-3 items-center justify-center">
                  <Timer size={20} color={ICON_COLORS.white} strokeWidth={2} />
                  <Text className="text-white font-black text-lg mt-1">
                    {avgTime.toFixed(1)}s
                  </Text>
                  <Text className="text-white/60 text-[8px] font-semibold uppercase tracking-wide">
                    Avg/Q
                  </Text>
                </View>
              ) : skippedCount > 0 ? (
                <View className="flex-1 bg-white/20 rounded-2xl p-3 items-center justify-center">
                  <Clock size={20} color={ICON_COLORS.white} strokeWidth={2} />
                  <Text className="text-white font-black text-lg mt-1">{skippedCount}</Text>
                  <Text className="text-white/60 text-[8px] font-semibold uppercase tracking-wide">
                    Skipped
                  </Text>
                </View>
              ) : null}
            </View>

          </View>
        </Animated.View>

        {hasRepeats && (
          <Animated.View style={statsStyle} className="mx-4 mt-3">
            <View className="bg-violet-50 rounded-2xl px-5 py-4">
              <Text className="text-violet-700 text-xs font-black uppercase tracking-wide mb-3">
                Repeated Questions
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1 bg-emerald-100 rounded-xl p-3 items-center">
                  <Text className="text-emerald-700 font-black text-lg">{repeatedCorrect}</Text>
                  <Text className="text-emerald-600 text-[10px] font-semibold">Got Right</Text>
                </View>
                <View className="flex-1 bg-rose-100 rounded-xl p-3 items-center">
                  <Text className="text-rose-700 font-black text-lg">{repeatedWrong}</Text>
                  <Text className="text-rose-600 text-[10px] font-semibold">Still Wrong</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {questions.length > 0 && (
          <Animated.View style={statsStyle} className="mx-4 mt-4">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowReview((v) => !v)}
              className="rounded-2xl flex-row items-center justify-between px-5 py-5 bg-slate-100"
            >
              <View className="flex-row items-center gap-2">
                <BarChart2 size={18} color={ICON_COLORS.slate800} strokeWidth={2} />
                <Text className="text-slate-600 font-black text-sm">
                  {showReview ? "Hide" : "Show"} Answer Review
                </Text>
              </View>
              {showReview
                ? <ChevronUp   size={18} color={ICON_COLORS.slate400} strokeWidth={2.5} />
                : <ChevronDown size={18} color={ICON_COLORS.slate400} strokeWidth={2.5} />
              }
            </TouchableOpacity>

            {showReview && (
              <View className="mt-3">
                {questions.map((q, i) => (
                  <AnswerReviewCard
                    key={`${q.id}-${i}`}
                    question={q}
                    index={i}
                    userAnswer={answers[i]}
                  />
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {(quoteLoading || quote) && (
          <Animated.View style={statsStyle} className="mx-4 mt-4">
            <View className="bg-primary-400 rounded-2xl px-5 py-5 flex-row items-start gap-3">
              {quoteLoading ? (
                <Text className="flex-1 text-white text-sm ">
                  Generating a little encouragement…
                </Text>
              ) : (
                <Text className="flex-1 text-white text-base">
                  {quote}
                </Text>
              )}
            </View>
          </Animated.View>
        )}

        <Animated.View style={statsStyle} className="mx-4 mt-5 gap-3">
          <TouchableOpacity
            className="w-full bg-primary flex-row justify-center items-center gap-2 py-4 rounded-2xl"
            activeOpacity={0.85}
            onPress={() => setShowRestart(true)}
          >
            <RotateCcw size={18} color={ICON_COLORS.white} strokeWidth={2.2} />
            <Text className="text-white font-black text-base">Restart Quiz</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="w-full bg-slate-100 flex-row justify-center items-center gap-2 py-4 rounded-2xl"
            activeOpacity={0.85}
            onPress={() => router.replace("/(tabs)/quiz")}
          >
            <Home size={18} color={ICON_COLORS.slate600} strokeWidth={2.2} />
            <Text className="text-slate-600 font-black text-base">Back to Quizzes</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <RestartConfirmModal
        visible={showRestart}
        onCancel={() => setShowRestart(false)}
        onConfirm={handleRestart}
        hasCurrentAnswers
      />
    </SafeAreaView>
  );
}
