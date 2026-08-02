/**
 * quiz-results.tsx
 * ─────────────────
 * Quiz results screen.
 *
 * Data flow:
 *  1. Receives navigation params from quiz-session:
 *       sessionId, answersJson, questionTimesJson, questionsJson,
 *       isTimeout, remainingTime
 *  2. On mount, calls the correct submit endpoint:
 *     - isTimeout=false → POST /api/v1/quiz/submit (ended_by = "submitted")
 *     - isTimeout=true  → POST /api/v1/quiz/submit-timeout (ended_by = "timeout")
 *  3. Shows server-computed accuracy, correct count, avg response time,
 *     lesson breakdowns, and repeated-question metrics.
 *  4. Falls back to local computation if the backend call fails.
 *  5. Handles 409 (already completed) gracefully.
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
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
  type LucideIcon,
} from "lucide-react-native";

import AnswerReviewCard    from "@/components/quiz-componets/AnswerReviewCard";
import ConfettiView        from "@/components/quiz-componets/ConfettiView";
import RestartConfirmModal from "@/components/quiz-componets/RestartConfirmModal";
import CircularProgressRing from "@/components/quiz-componets/CircularProgressRing";
import type { QuestionOut, SubmitQuizResponse } from "@/src/modules/quiz/types";

/* ─────────────────────────────────────────────── helpers ── */

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
      Icon: AlarmClock, iconColor: "#fff",
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
      Icon: Laugh, iconColor: "#fff",
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
      Icon: Smile, iconColor: "#fff",
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
      Icon: Annoyed, iconColor: "#fff",
      tagline: "Halfway there — revise and try again!",
      confetti: false,
    };
  }
  return {
    heroFrom: "#F43F5E", heroTo: "#E11D48",
    screenBg: "bg-white", heroBg: "bg-rose-600",
    pillBg: "bg-rose-500", pillText: "text-rose-50",
    label: "Keep Trying",
    Icon: Frown, iconColor: "#fff",
    tagline: "Don't give up — practice makes perfect!",
    confetti: false,
  };
}

/* ─────────────────────────────────────────────── screen ── */

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
    isTimeout:       string;
    submitDataJson?: string;
  }>();

  const totalQ   = parseInt(questionCount ?? "10");
  const timedOut = isTimeout === "true";

  // ── Deserialise params ──────────────────────────────────────────────────────
  const answers: Record<number, number> =
    answersJson ? JSON.parse(answersJson) : {};
  const questions: QuestionOut[] =
    questionsJson ? JSON.parse(questionsJson) : [];
  const submitData: SubmitQuizResponse | null =
    submitDataJson ? JSON.parse(submitDataJson) : null;

  // ── Derive display metrics ──────────────────────────────────────────────────
  // Local correctness now works because backend sends correct_answer
  const localCorrect = questions.filter((q, i) => {
    const chosen = answers[i];
    if (chosen === undefined || !q.options || !q.correct_answer) return false;
    return q.options[chosen] === q.correct_answer;
  }).length;

  const correctCount  = submitData?.correct_count  ?? localCorrect;
  const accuracy      = submitData?.accuracy        ?? (totalQ > 0 ? Math.round((localCorrect / totalQ) * 100) : 0);
  const avgTime       = submitData?.avg_response_time ?? null;
  const skippedCount  = totalQ - Object.keys(answers).length;
  const wrongCount    = correctCount > 0
    ? totalQ - correctCount - skippedCount
    : totalQ - localCorrect - skippedCount;
  const pct           = Math.round(accuracy);
  const theme         = getTheme(pct, timedOut);

  // Repeated question metrics
  const repeatedCorrect = submitData?.repeated_correct_count ?? 0;
  const repeatedWrong   = submitData?.repeated_wrong_count   ?? 0;
  const hasRepeats      = repeatedCorrect + repeatedWrong > 0;

  // ── UI state ────────────────────────────────────────────────────────────────
  const [showReview,  setShowReview]  = useState(false);
  const [showRestart, setShowRestart] = useState(false);

  // ── Entrance animations ─────────────────────────────────────────────────────
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
      pathname: "/(tabs)/quiz/quiz-session",
      params: {
        subject, difficulty, questionCount, timer: timerMinutes,
        resumeSessionId: sessionId,
        restartSession:  "true",
      },
    } as any);
  };

  return (
    <SafeAreaView edges={["top"]} className={`flex-1 ${theme.screenBg}`}>
      {theme.confetti && <ConfettiView count={100} />}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Hero card ── */}
        <Animated.View
          style={heroStyle}
          className={`mx-4 mt-5 rounded-3xl overflow-hidden shadow-lg ${theme.heroBg}`}
        >
          {timedOut && (
            <View className="bg-black/20 flex-row items-center justify-center gap-2 py-2.5">
              <Clock size={14} color="#fff" strokeWidth={2.5} />
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
              strokeColor="#ffffff"
              trackColor="rgba(255,255,255,0.20)"
              textColor="#ffffff"
            />

            {/* Stat tiles */}
            <View className="flex-row gap-2 mt-6 w-full items-center">
              <View className="flex-1 bg-white/20 rounded-2xl p-3 items-center justify-center">
                <Trophy size={20} color="#fff" strokeWidth={2} />
                <Text className="text-white font-black text-lg mt-1">{pct}%</Text>
                <Text className="text-white/60 text-[8px] font-semibold uppercase tracking-wide">
                  Accuracy
                </Text>
              </View>

              <View className="flex-1 bg-white/20 rounded-2xl p-3 items-center justify-center">
                <CheckCircle2 size={20} color="#fff" strokeWidth={2} />
                <Text className="text-white font-black text-lg mt-1">{correctCount}</Text>
                <Text className="text-white/60 text-[8px] font-semibold uppercase tracking-wide">
                  Correct
                </Text>
              </View>

              <View className="flex-1 bg-white/20 rounded-2xl p-3 items-center justify-center">
                <XCircle size={20} color="#fff" strokeWidth={2} />
                <Text className="text-white font-black text-lg mt-1">{wrongCount}</Text>
                <Text className="text-white/60 text-[8px] font-semibold uppercase tracking-wide">
                  Wrong
                </Text>
              </View>

              {avgTime !== null ? (
                <View className="flex-1 bg-white/20 rounded-2xl p-3 items-center justify-center">
                  <Timer size={20} color="#fff" strokeWidth={2} />
                  <Text className="text-white font-black text-lg mt-1">
                    {avgTime.toFixed(1)}s
                  </Text>
                  <Text className="text-white/60 text-[8px] font-semibold uppercase tracking-wide">
                    Avg/Q
                  </Text>
                </View>
              ) : skippedCount > 0 ? (
                <View className="flex-1 bg-white/20 rounded-2xl p-3 items-center justify-center">
                  <Clock size={20} color="#fff" strokeWidth={2} />
                  <Text className="text-white font-black text-lg mt-1">{skippedCount}</Text>
                  <Text className="text-white/60 text-[8px] font-semibold uppercase tracking-wide">
                    Skipped
                  </Text>
                </View>
              ) : null}
            </View>

            {!submitData && (
              <View className="mt-4 bg-white/10 rounded-xl px-4 py-2">
                <Text className="text-white/60 text-[11px] text-center">
                  Could not save to server — results shown locally
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Repeated-question metrics ── */}
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

        {/* ── Answer review toggle ── */}
        {questions.length > 0 && (
          <Animated.View style={statsStyle} className="mx-4 mt-4">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowReview((v) => !v)}
              className="rounded-2xl flex-row items-center justify-between px-5 py-5 bg-slate-100"
            >
              <View className="flex-row items-center gap-2">
                <BarChart2 size={18} color="#1e293b" strokeWidth={2} />
                <Text className="text-slate-600 font-black text-sm">
                  {showReview ? "Hide" : "Show"} Answer Review
                </Text>
              </View>
              {showReview
                ? <ChevronUp   size={18} color="#94a3b8" strokeWidth={2.5} />
                : <ChevronDown size={18} color="#94a3b8" strokeWidth={2.5} />
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

        {/* ── Action buttons ── */}
        <Animated.View style={statsStyle} className="mx-4 mt-5 gap-3">
          <TouchableOpacity
            className="w-full bg-primary flex-row justify-center items-center gap-2 py-4 rounded-2xl"
            activeOpacity={0.85}
            onPress={() => setShowRestart(true)}
          >
            <RotateCcw size={18} color="#fff" strokeWidth={2.2} />
            <Text className="text-white font-black text-base">Restart Quiz</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="w-full bg-slate-100 flex-row justify-center items-center gap-2 py-4 rounded-2xl"
            activeOpacity={0.85}
            onPress={() => router.replace("/(tabs)/quiz")}
          >
            <Home size={18} color="#475569" strokeWidth={2.2} />
            <Text className="text-slate-600 font-black text-base">Back to Quizzes</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <RestartConfirmModal
        visible={showRestart}
        onCancel={() => setShowRestart(false)}
        onConfirm={handleRestart}
      />
    </SafeAreaView>
  );
}
