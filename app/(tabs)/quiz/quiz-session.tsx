/**
 * quiz-session.tsx
 * ─────────────────
 * Active quiz session screen. Handles three modes:
 *
 *  NEW QUIZ      — no resumeSessionId → calls POST /generate on mount.
 *  RESUME        — resumeSessionId present → loads existing session, restores progress.
 *  RESTART       — resumeSessionId + restartSession="true" → loads same questions,
 *                  ignores completion record, starts from scratch.
 *
 * Questions are frozen into local state once loaded so restart never re-generates.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  AppState,
  type AppStateStatus,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Clock,
  BarChart2,
  BookOpen,
} from "lucide-react-native";

import { getDifficultyStyle } from "@/constants/quizStyles";
import { OPTION_LABELS, formatTime } from "@/constants/quizHelpers";
import TimesUpModel from "@/components/quiz-componets/TimesUpModel";
import ExitQuizModal from "@/components/quiz-componets/ExitQuizModal";
import {
  useGenerateQuizMutation,
  useQuizSessionQuery,
  useSaveQuizProgressMutation,
  useSubmitQuizMutation,
  useSubmitQuizTimeoutMutation,
  quizKeys,
} from "@/src/modules/quiz/quizHooks";
import { useQueryClient } from "@tanstack/react-query";
import { buildDraftAnswers, buildAnswerPayload } from "@/src/modules/quiz/quizApi";
import type { QuestionOut } from "@/src/modules/quiz/types";
import QuizGeneratingScreen from "@/components/loading/QuizGeneratingScreen";
import QuizRetrievingScreen from "@/components/loading/QuizRetrievingScreen";
import QuizErrorScreen      from "@/components/loading/QuizErrorScreen";

// ── Main component ────────────────────────────────────────────────────────────

export default function QuizSession() {
  const router = useRouter();
  const {
    subject,
    lesson,
    difficulty,
    questionCount,
    timer: timerMinutes,
    grade,
    resumeSessionId:      resumeSessionIdStr,
    restartSession:       restartSessionStr,
    excludedQuestionIds:  excludedQuestionIdsStr,
  } = useLocalSearchParams<{
    subject:               string;
    // lesson/difficulty are optional — normally omitted so the backend picks
    // them automatically (AI lesson choice + adaptive difficulty). Only
    // present if some future flow explicitly wants to override them.
    lesson?:               string;
    difficulty?:           string;
    questionCount:         string;
    timer:                 string;
    grade:                 string;
    resumeSessionId?:      string;
    restartSession?:       string;
    excludedQuestionIds?:  string;
  }>();

  const excludedQuestionIds: number[] = excludedQuestionIdsStr
    ? JSON.parse(excludedQuestionIdsStr)
    : [];

  const totalQ       = parseInt(questionCount ?? "10");
  const totalSec     = parseInt(timerMinutes  ?? "10") * 60;
  const isResuming   = !!resumeSessionIdStr;
  const resumeId     = isResuming ? parseInt(resumeSessionIdStr!) : null;
  const isRestartMode = restartSessionStr === "true";

  // ── Resume mode: load existing session ─────────────────────────────────────
  const {
    data:      savedSession,
    isLoading: isLoadingSession,
    error:     sessionError,
  } = useQuizSessionQuery(resumeId);

  // ── Generate quiz mutation (new quiz mode only) ─────────────────────────────
  const {
    mutate:    generateQuiz,
    isPending: isGenerating,
    data:      quizData,
    error:     generateError,
    reset:     resetGenerate,
  } = useGenerateQuizMutation();

  const queryClient = useQueryClient();
  const { mutate: saveProgress } = useSaveQuizProgressMutation();

  // Bust the individual session cache on unmount so the next resume always fetches
  // fresh data from DB (handles swipe-back, modal exit, and submit paths alike).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => {
    if (resumeId) queryClient.removeQueries({ queryKey: quizKeys.session(resumeId) });
  }, []);

  const {
    mutate:    submitNormal,
    isPending: isSubmittingNormal,
    data:      submitNormalData,
  } = useSubmitQuizMutation();

  const {
    mutate:    submitTimeout,
    isPending: isSubmittingTimeout,
    data:      submitTimeoutData,
  } = useSubmitQuizTimeoutMutation();

  const isSubmitting = isSubmittingNormal || isSubmittingTimeout;
  const submitData   = submitNormalData ?? submitTimeoutData;

  // The difficulty actually used — chosen automatically by the backend
  // (adaptive difficulty) unless a route param explicitly overrides it. Only
  // known once generation/resume completes. Lesson is shown per-question
  // instead (each question is independently assigned a random lesson).
  const displayDifficulty = quizData?.difficulty ?? savedSession?.difficulty ?? difficulty ?? "";
  const diff = getDifficultyStyle(displayDifficulty || "medium");

  // Stable flag set at construction: true = new quiz (generate), false = resume (load from DB)
  const [shouldGenerate] = useState(() => !resumeSessionIdStr);

  const triggerGenerate = useCallback((forceCache = false) => {
    generateQuiz({
      grade:                 parseInt(grade ?? "10"),
      subject:               subject ?? "Mathematics",
      // Omitted when not explicitly set — backend auto-picks lesson (AI) and
      // difficulty (accuracy history) instead of trusting a client value.
      lesson:                lesson || undefined,
      difficulty:            difficulty ? (difficulty.toLowerCase() as "easy" | "medium" | "hard") : undefined,
      question_count:        totalQ,
      excluded_question_ids: excludedQuestionIds,
      force_cache:           forceCache,
    });
  }, [grade, subject, lesson, difficulty, totalQ, excludedQuestionIds]);

  const resetForRetry = useCallback(() => {
    resetGenerate();
    generateTriggeredRef.current = false;
    setFrozenQuestions([]);
    setFrozenSessionId(null);
  }, [resetGenerate]);

  // Retry AI generation
  const handleRetry = useCallback(() => {
    resetForRetry();
    triggerGenerate(false);
  }, [resetForRetry, triggerGenerate]);

  // Fallback: user chose to load from the DB question pool after AI failed
  const handleUseCache = useCallback(() => {
    resetForRetry();
    triggerGenerate(true);
  }, [resetForRetry, triggerGenerate]);

  // Fire exactly once on mount in new-quiz mode
  const generateTriggeredRef = useRef(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!shouldGenerate || generateTriggeredRef.current) return;
    generateTriggeredRef.current = true;
    triggerGenerate();
  }, []);

  // ── Frozen quiz state — set once, never cleared, so restart works ──────────
  const [frozenQuestions,  setFrozenQuestions]  = useState<QuestionOut[]>([]);
  const [frozenSessionId,  setFrozenSessionId]  = useState<number | null>(null);

  // Freeze from newly generated quiz
  useEffect(() => {
    if (isResuming || !quizData || frozenQuestions.length > 0) return;
    setFrozenQuestions(quizData.questions ?? []);
    setFrozenSessionId(quizData.session_id ?? null);
  }, [quizData, isResuming]);

  // ── Quiz state ──────────────────────────────────────────────────────────────
  const questions = frozenQuestions;
  const sessionId = frozenSessionId;

  const [current,    setCurrent]    = useState(0);
  const [answers,    setAnswers]    = useState<Record<number, number>>({});
  const [flagged,    setFlagged]    = useState<Set<number>>(new Set());
  const [timeLeft,          setTimeLeft]          = useState(totalSec);
  const [timeUp,            setTimeUp]            = useState(false);
  const [showTimesUpModal,  setShowTimesUpModal]  = useState(false);
  const [showExit,          setShowExit]          = useState(false);

  // Show the modal as soon as the timer expires; keep timeUp=true so the timer never restarts
  useEffect(() => { if (timeUp) setShowTimesUpModal(true); }, [timeUp]);

  // ── Completion redirect: skipped in restart mode ────────────────────────────
  useEffect(() => {
    if (isResuming && !isRestartMode && savedSession?.completion) {
      router.replace("/(tabs)/quiz");
    }
  }, [isResuming, isRestartMode, savedSession]);

  // ── Resume/restart: freeze questions + restore state atomically ─────────────
  const [stateRestored, setStateRestored] = useState(false);
  useEffect(() => {
    if (!isResuming || !savedSession || stateRestored) return;

    setFrozenQuestions(savedSession.questions ?? []);
    setFrozenSessionId(resumeId);

    if (!isRestartMode) {
      // Restore answers from saved draft
      const drafts = savedSession.latest_progress?.draft_answers ?? [];
      const restored: Record<number, number> = {};
      for (const draft of drafts) {
        if (draft.selected_answer == null) continue;
        const qIdx = savedSession.questions.findIndex((q) => q.id === draft.question_id);
        if (qIdx === -1) continue;
        const optIdx = savedSession.questions[qIdx].options?.indexOf(draft.selected_answer) ?? -1;
        if (optIdx !== -1) restored[qIdx] = optIdx;
      }
      setAnswers(restored);
      const rem = savedSession.latest_progress?.remaining_time;
      if (rem != null) setTimeLeft(Math.round(rem));
      // Resume at first unanswered question instead of always starting at Q1
      const firstUnanswered = savedSession.questions.findIndex((_, i) => restored[i] === undefined);
      if (firstUnanswered > 0) setCurrent(firstUnanswered);
    }

    setStateRestored(true);
  }, [isResuming, savedSession, stateRestored, resumeId, isRestartMode]);

  // Ready = questions loaded AND (if resuming) state fully restored
  const isReady = questions.length > 0 && (!isResuming || stateRestored);

  // Per-question time tracking
  const questionStartRef = useRef<number>(Date.now());
  const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({});

  // Debounce ref for autosave
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Guard: fire the submit API only once per session
  const submissionTriggeredRef = useRef(false);

  // Reanimated
  const shakeX   = useSharedValue(0);
  const timerPct = useSharedValue(1);
  const [barWidth, setBarWidth] = useState(0);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const barStyle   = useAnimatedStyle(() => ({ width: timerPct.value * barWidth }));

  // ── Autosave helper ─────────────────────────────────────────────────────────
  const doSaveProgress = useCallback(
    (currentAnswers: Record<number, number>, currentTimes: Record<number, number>, currentTimeLeft: number) => {
      if (!sessionId || questions.length === 0) return;
      saveProgress({
        session_id:            sessionId,
        remaining_time:        currentTimeLeft,
        answered_count:        Object.keys(currentAnswers).length,
        repeated_question_ids: [],
        weak_lessons_hint:     [],
        draft_answers:         buildDraftAnswers(questions, currentAnswers, currentTimes),
      });
    },
    [sessionId, questions, saveProgress]
  );

  // ── Debounced autosave on answer change (both modes) ───────────────────────
  useEffect(() => {
    if (!sessionId || questions.length === 0) return;
    clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      doSaveProgress(answers, questionTimes, timeLeft);
    }, 2000);
    return () => clearTimeout(autosaveTimerRef.current);
  }, [answers]);

  // ── AppState: save on background ────────────────────────────────────────────
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        clearTimeout(autosaveTimerRef.current);
        doSaveProgress(answers, questionTimes, timeLeft);
      }
    };
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [doSaveProgress, answers, questionTimes, timeLeft]);

  // ── Countdown timer — starts only when ready ────────────────────────────────
  useEffect(() => {
    if (!isReady || timeUp) return;
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(id); setTimeUp(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isReady, timeUp]);

  useEffect(() => {
    timerPct.value = withTiming(timeLeft / totalSec, { duration: 900 });
  }, [timeLeft]);

  useEffect(() => {
    if (!timeUp) return;
    shakeX.value = withSequence(
      withTiming(-14, { duration: 55 }), withTiming(14, { duration: 55 }),
      withTiming(-10, { duration: 55 }), withTiming(10, { duration: 55 }),
      withTiming(-6,  { duration: 55 }), withTiming(6,  { duration: 55 }),
      withTiming(0,   { duration: 55 })
    );
  }, [timeUp]);

  // Trigger submission as soon as time runs out so the spinner is ready in TimesUpModal
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!timeUp || submissionTriggeredRef.current || !sessionId || questions.length === 0) return;
    submissionTriggeredRef.current = true;
    clearTimeout(autosaveTimerRef.current);
    doSaveProgress(answers, questionTimes, 0);
    const answerItems = buildAnswerPayload(questions, answers, questionTimes);
    submitTimeout({
      session_id:            sessionId,
      answers:               answerItems,
      ended_by:              "timeout",
      remaining_time_at_end: 0,
      repeated_question_ids: [],
    });
  }, [timeUp]);

  // ── Track time per question ─────────────────────────────────────────────────
  const recordQuestionTime = (fromIndex: number) => {
    const elapsed = (Date.now() - questionStartRef.current) / 1000;
    setQuestionTimes((prev) => ({
      ...prev,
      [fromIndex]: (prev[fromIndex] ?? 0) + elapsed,
    }));
    questionStartRef.current = Date.now();
  };

  const navigateTo = (next: number) => {
    recordQuestionTime(current);
    setCurrent(next);
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const q           = questions[current];
  const isFlagged   = flagged.has(current);
  const isLow       = timeLeft < 60;
  const answered    = Object.keys(answers).length;
  const selectedOpt = answers[current];

  const toggleFlag = () =>
    setFlagged((prev) => {
      const n = new Set(prev);
      n.has(current) ? n.delete(current) : n.add(current);
      return n;
    });

  // Restart reuses frozen questions — no regeneration
  const restart = () => {
    setAnswers({});
    setFlagged(new Set());
    setCurrent(0);
    setTimeLeft(totalSec);
    setTimeUp(false);
    setShowTimesUpModal(false);
    setQuestionTimes({});
    questionStartRef.current = Date.now();
  };

  // Shared navigation helper — called once submission has settled (or errored)
  const navigateToResults = (timedOut: boolean, data?: unknown) => {
    router.push({
      pathname: "/(tabs)/quiz/quiz-results",
      params: {
        subject,
        difficulty: displayDifficulty,
        questionCount,
        timer:             timerMinutes,
        sessionId:         String(sessionId ?? ""),
        answersJson:       JSON.stringify(answers),
        questionTimesJson: JSON.stringify(questionTimes),
        questionsJson:     JSON.stringify(questions),
        isTimeout:         timedOut ? "true" : "false",
        remainingTime:     String(timedOut ? 0 : timeLeft),
        ...(data ? { submitDataJson: JSON.stringify(data) } : {}),
      },
    } as any);
  };

  // Manual submit: save progress, call API, navigate after it settles
  const goToResults = () => {
    if (submissionTriggeredRef.current) return;
    submissionTriggeredRef.current = true;
    recordQuestionTime(current);
    clearTimeout(autosaveTimerRef.current);
    doSaveProgress(answers, questionTimes, timeLeft);
    const answerItems = buildAnswerPayload(questions, answers, questionTimes);
    submitNormal(
      {
        session_id:            sessionId!,
        answers:               answerItems,
        ended_by:              "submitted",
        remaining_time_at_end: timeLeft,
        repeated_question_ids: [],
      },
      {
        onSuccess: (data) => navigateToResults(false, data),
        onError:   ()     => navigateToResults(false),
      },
    );
  };

  // ── Exit: save progress then navigate ──────────────────────────────────────
  const handleExitConfirm = () => {
    setShowExit(false);
    clearTimeout(autosaveTimerRef.current);
    doSaveProgress(answers, questionTimes, timeLeft);
    router.replace("/(tabs)/quiz");
  };

  // ── Loading / Error states ─────────────────────────────────────────────────
  const isLoading = isResuming
    ? (isLoadingSession || !isReady)
    : (isGenerating || (!frozenQuestions.length && !generateError));
  const activeError = isResuming ? sessionError : generateError;

  if (isLoading) {
    // Difficulty/lesson aren't known yet while generating — the AI picks both
    // as part of this same call. "Adaptive" reflects that instead of a guess.
    return shouldGenerate
      ? <QuizGeneratingScreen subject={subject ?? "Quiz"} difficulty="Adaptive" />
      : <QuizRetrievingScreen subject={subject ?? "Quiz"} difficulty="Adaptive" />;
  }

  if (activeError || questions.length === 0) {
    return (
      <QuizErrorScreen
        message={(activeError as Error)?.message ?? "No questions were returned."}
        onRetry={handleRetry}
        onUseCache={!isResuming ? handleUseCache : undefined}
      />
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">

      {/* Block all interaction while the submit API call is in flight */}
      {isSubmitting && (
        <View className="absolute inset-0 z-50" pointerEvents="box-only" />
      )}

      {/* ── Header ── */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white">
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-slate-100 justify-center items-center"
          activeOpacity={0.7}
          onPress={() => setShowExit(true)}
        >
          <ChevronLeft size={18} color="#64748b" strokeWidth={2.5} />
        </TouchableOpacity>

        <View className="items-center justify-center">
          <Text className="text-md font-black text-slate-800">{subject}</Text>
          {/* Lesson varies per question (random by default), so it's shown per-question below, not here */}
          <View className={`self-center px-2 py-0.5 rounded-full mt-0.5 ${diff.bg}`}>
            <Text className={`text-[12px] font-bold ${diff.text}`}>{displayDifficulty}</Text>
          </View>
        </View>

        <TouchableOpacity
          className={`w-9 h-9 rounded-full justify-center items-center ${
            isFlagged ? "bg-violet-100" : "bg-slate-100"
          }`}
          activeOpacity={0.7}
          onPress={toggleFlag}
        >
          <Flag
            size={16}
            color={isFlagged ? "#7C3AED" : "#64748b"}
            strokeWidth={2.5}
            fill={isFlagged ? "#EDE9FE" : "transparent"}
          />
        </TouchableOpacity>
      </View>

      {/* ── Timer bar ── */}
      <View className="mt-4 mx-4 flex-row justify-between items-center">
        <View
          className={`h-2 rounded-full w-[80%] overflow-hidden ${isLow ? "bg-rose-200" : "bg-slate-200"}`}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        >
          <Animated.View
            style={barStyle}
            className={`h-full ${isLow ? "bg-rose-500" : "bg-primary"}`}
          />
        </View>

        <View className="flex-row items-center gap-1">
          <Clock size={14} color={isLow ? "#EF4444" : "#FC6E20"} strokeWidth={3} />
          <Text className={`text-md font-black tracking-widest ${isLow ? "text-rose-500" : "text-[#FC6E20]"}`}>
            {formatTime(timeLeft)}
          </Text>
        </View>
      </View>

      {/* ── Progress dots ── */}
      <View className="flex-row px-4 mt-4 gap-1 flex-wrap">
        {questions.map((_, i) => {
          const isAns  = answers[i] !== undefined;
          const isFlag = flagged.has(i);
          const isCurr = i === current;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => navigateTo(i)}
              style={{ height: 7, flex: 1, minWidth: 8, borderRadius: 99 }}
              className={
                isFlag ? "bg-violet-500" :
                isAns  ? "bg-primary"    :
                isCurr ? "bg-primary/40" : "bg-slate-200"
              }
            />
          );
        })}
      </View>

      {/* ── Counter ── */}
      <View className="flex-row justify-between px-5 mt-3">
        <Text className="text-xs text-slate-400 font-medium">
          Question {current + 1} / {totalQ}
        </Text>
        <Text className="text-xs text-slate-400 font-medium">
          {flagged.size > 0 ? `${flagged.size} flagged  ·  ` : ""}
          {answered}/{totalQ} answered
        </Text>
      </View>

      {/* ── Question card ── */}
      <View className="bg-white rounded-2xl py-[40px] px-4 m-4 border border-slate-100 shadow-sm shadow-black/5">
        {isFlagged && (
          <View className="flex-row items-center gap-1 absolute ps-5 pt-5">
            <Flag size={11} color="#7C3AED" strokeWidth={2.5} fill="#EDE9FE" />
            <Text className="text-[11px] text-[#7C3AED] font-semibold">Flagged for review</Text>
          </View>
        )}
        {/* Each question is independently assigned a random lesson within the
            subject, so it's shown per-question here rather than once in the header. */}
        {!!q?.lesson && (
          <View className="self-start flex-row items-center gap-1 px-2 py-1 rounded-full bg-orange-50 mb-3">
            <BookOpen size={11} color="#FC6E20" strokeWidth={2.5} />
            <Text className="text-[11px] text-primary font-semibold" numberOfLines={1}>
              {q.lesson}
            </Text>
          </View>
        )}
        <Text className="font-bold text-slate-800 leading-6 text-xl">{q?.question}</Text>
      </View>

      {/* ── Options ── */}
      <View className="w-full flex-1 py-2 px-4">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <View className="gap-2.5">
            {(q?.options ?? []).map((opt, i) => {
              const isSelected = selectedOpt === i;
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.8}
                  onPress={() => setAnswers((prev) => ({ ...prev, [current]: i }))}
                  className={`flex-row items-center gap-3 p-4 rounded-2xl border ${
                    isSelected ? "bg-primary border-primary" : "bg-white border-slate-200"
                  }`}
                >
                  <View className={`w-8 h-8 rounded-full justify-center items-center ${
                    isSelected ? "bg-white/25" : "bg-slate-100"
                  }`}>
                    <Text className={`text-md font-black ${isSelected ? "text-white" : "text-slate-600"}`}>
                      {OPTION_LABELS[i]}
                    </Text>
                  </View>
                  <Text className={`flex-1 text-sm font-medium leading-5 ${
                    isSelected ? "text-white" : "text-slate-700"
                  }`}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

        </ScrollView>
      </View>

      {/* ── Nav buttons ── */}
      <View className="flex-row justify-between items-center absolute bottom-0 px-4 py-5 w-full bg-white/90">
        <TouchableOpacity
          className={`w-[49%] flex-row justify-center items-center gap-2 py-3.5 rounded-2xl ${
            current === 0 ? "bg-white border border-slate-200 opacity-40" : "bg-slate-100"
          }`}
          activeOpacity={0.8}
          disabled={current === 0}
          onPress={() => navigateTo(current - 1)}
        >
          <ChevronLeft size={16} color="#64748b" strokeWidth={2.5} />
          <Text className="text-sm font-bold text-slate-600">Previous</Text>
        </TouchableOpacity>

        {current < totalQ - 1 ? (
          <TouchableOpacity
            className="w-[49%] flex-row justify-center items-center gap-2 py-3.5 rounded-2xl bg-primary shadow-sm shadow-primary"
            activeOpacity={0.8}
            onPress={() => navigateTo(current + 1)}
          >
            <Text className="text-sm font-bold text-white">Next</Text>
            <ChevronRight size={16} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="w-[49%] flex-row justify-center items-center gap-2 py-3.5 rounded-2xl bg-emerald-500 shadow-sm shadow-emerald-500"
            activeOpacity={0.8}
            disabled={isSubmitting}
            onPress={goToResults}
          >
            {isSubmitting
              ? <ActivityIndicator size="small" color="#fff" />
              : <BarChart2 size={16} color="#fff" strokeWidth={2.5} />}
            <Text className="text-sm font-bold text-white">
              {isSubmitting ? "Saving…" : "Submit"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Exit modal ── */}
      <ExitQuizModal
        visible={showExit}
        answered={answered}
        totalQ={totalQ}
        onCancel={() => setShowExit(false)}
        onConfirm={handleExitConfirm}
      />

      {/* ── Time's up modal ── */}
      <TimesUpModel
        timeUp={showTimesUpModal}
        answered={answered}
        totalQ={totalQ}
        restart={restart}
        isSubmitting={isSubmitting}
        onShowResults={() => { setShowTimesUpModal(false); navigateToResults(true, submitData); }}
        shakeStyle={shakeStyle}
      />
    </SafeAreaView>
  );
}
