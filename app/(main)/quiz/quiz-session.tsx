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
  Brain,
  Zap,
  Sparkles,
  Database,
  RotateCcw,
} from "lucide-react-native";

import { getDifficultyStyle, getSubjectIcon, formatSubjectLabel, ICON_COLORS } from "@/constants/quizStyles";
import { OPTION_LABELS, formatTime } from "@/constants/quizHelpers";
import TimesUpModel from "@/components/quiz-componets/TimesUpModel";
import ExitQuizModal from "@/components/quiz-componets/ExitQuizModal";
import {
  useGenerateQuizMutation,
  useQuizSessionQuery,
  useRetakeQuizSessionMutation,
  useSaveQuizProgressMutation,
  useSubmitQuizMutation,
  useSubmitQuizTimeoutMutation,
  quizKeys,
} from "@/hooks/use-quiz";
import { useQueryClient } from "@tanstack/react-query";
import { buildDraftAnswers, buildAnswerPayload } from "@/api/quizAPI";
import type { QuestionOut } from "@/types/quizModuleTypes";
import QuizStatusScreen, { type QuizStatusStep } from "@/components/loading/QuizStatusScreen";
import QuizErrorScreen      from "@/components/loading/QuizErrorScreen";

const GENERATING_STEPS: QuizStatusStep[] = [
  { icon: Brain,    text: "Analysing your subject…"    },
  { icon: BookOpen, text: "Crafting questions with AI…" },
  { icon: Zap,      text: "Tuning to your difficulty…" },
  { icon: Sparkles, text: "Almost ready!"              },
];

const RETRIEVING_STEPS: QuizStatusStep[] = [
  { icon: Database,  text: "Connecting to server…"    },
  { icon: BookOpen,  text: "Fetching your questions…" },
  { icon: RotateCcw, text: "Restoring your progress…" },
  { icon: Sparkles,  text: "Almost ready!"            },
];

// Handles three modes: new quiz (no resumeSessionId, calls POST /generate on
// mount), resume (resumeSessionId present, loads the existing session and
// restores progress), and restart (resumeSessionId + restartSession="true",
// same questions, but submits into a brand-new *retake* session cloned from
// resumeSessionId via POST /sessions/{id}/retake instead of resubmitting into
// the already-completed one — the backend rejects a second submit against the
// same session_id, and a retake's results (the user has already seen the
// correct answers) must never count toward analytics or adaptive difficulty.
// Questions are frozen into local state once loaded so a restart never
// re-generates them.
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
    shuffle:              shuffleStr,
    subjects:             subjectsStr,
  } = useLocalSearchParams<{
    subject?:              string;
    lesson?:               string;
    difficulty?:           string;
    questionCount:         string;
    timer:                 string;
    grade:                 string;
    resumeSessionId?:      string;
    restartSession?:       string;
    excludedQuestionIds?:  string;
    shuffle?:              string;
    subjects?:             string;
  }>();

  const excludedQuestionIds: number[] = excludedQuestionIdsStr
    ? JSON.parse(excludedQuestionIdsStr)
    : [];

  const isShuffle = shuffleStr === "true";
  const shuffleSubjects: string[] = subjectsStr ? JSON.parse(subjectsStr) : [];

  const totalQ       = parseInt(questionCount ?? "10");
  const totalSec     = parseInt(timerMinutes  ?? "10") * 60;
  const isResuming   = !!resumeSessionIdStr;
  const resumeId     = isResuming ? parseInt(resumeSessionIdStr!) : null;
  const isRestartMode = restartSessionStr === "true";

  const {
    data:      savedSession,
    isLoading: isLoadingSession,
    error:     sessionError,
  } = useQuizSessionQuery(resumeId);

  const {
    mutate:    generateQuiz,
    isPending: isGenerating,
    data:      quizData,
    error:     generateError,
    reset:     resetGenerate,
  } = useGenerateQuizMutation();

  const queryClient = useQueryClient();
  const { mutate: saveProgress } = useSaveQuizProgressMutation();

  // Clear the individual session cache on unmount so the next resume always
  // refetches fresh data instead of reusing whatever was here before (covers
  // swipe-back, modal exit, and submit alike).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => {
    if (resumeId) queryClient.removeQueries({ queryKey: quizKeys.session(resumeId) });
  }, []);

  const {
    mutate:  createRetake,
    error:   retakeError,
    reset:   resetRetake,
  } = useRetakeQuizSessionMutation();

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

  const displayDifficulty = quizData?.difficulty ?? savedSession?.difficulty ?? difficulty ?? "";
  const diff = getDifficultyStyle(displayDifficulty || "medium");
  const displaySubject = formatSubjectLabel(subject) || (isShuffle ? "Shuffled" : "");

  const [shouldGenerate] = useState(() => !resumeSessionIdStr);

  const triggerGenerate = useCallback((forceCache = false) => {
    if (isShuffle) {
      generateQuiz({
        grade:          parseInt(grade ?? "10"),
        shuffle:        true,
        subjects:       shuffleSubjects,
        question_count: totalQ,
        force_cache:    forceCache,
      });
    } else {
      generateQuiz({
        grade:                 parseInt(grade ?? "10"),
        subject:               subject ?? "Mathematics",
        lesson:                lesson || undefined,
        difficulty:            difficulty ? (difficulty.toLowerCase() as "easy" | "medium" | "hard") : undefined,
        question_count:        totalQ,
        excluded_question_ids: excludedQuestionIds,
        force_cache:           forceCache,
      });
    }
  }, [grade, subject, lesson, difficulty, totalQ, excludedQuestionIds, isShuffle, shuffleSubjects, generateQuiz]);

  const resetForRetry = useCallback(() => {
    resetGenerate();
    generateTriggeredRef.current = false;
    setFrozenQuestions([]);
    setFrozenSessionId(null);
    setReadyToShowQuiz(false);
  }, [resetGenerate]);

  const handleRetry = useCallback(() => {
    resetForRetry();
    triggerGenerate(false);
  }, [resetForRetry, triggerGenerate]);

  const handleUseCache = useCallback(() => {
    resetForRetry();
    triggerGenerate(true);
  }, [resetForRetry, triggerGenerate]);

  const generateTriggeredRef = useRef(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!shouldGenerate || generateTriggeredRef.current) return;
    generateTriggeredRef.current = true;
    triggerGenerate();
  }, []);

  // Set the instant the user (or the timeout auto-submit) starts submitting
  // — declared here (rather than down with the other submission logic) so
  // the "already completed" redirect guard below can read it.
  const submissionTriggeredRef = useRef(false);

  const [frozenQuestions,  setFrozenQuestions]  = useState<QuestionOut[]>([]);
  const [frozenSessionId,  setFrozenSessionId]  = useState<number | null>(null);

  // Only flips once QuizStatusScreen's ring has visually finished filling to
  // 100% — the quiz UI doesn't render before that, so the ring never gets
  // cut off mid-fill just because the data happened to arrive in the background.
  const [readyToShowQuiz, setReadyToShowQuiz] = useState(false);

  useEffect(() => {
    if (isResuming || !quizData || frozenQuestions.length > 0) return;
    setFrozenQuestions(quizData.questions ?? []);
    setFrozenSessionId(quizData.session_id ?? null);
  }, [quizData, isResuming]);

  const questions = frozenQuestions;
  const sessionId = frozenSessionId;

  const [current,    setCurrent]    = useState(0);
  const [answers,    setAnswers]    = useState<Record<number, number>>({});
  const [flagged,    setFlagged]    = useState<Set<number>>(new Set());
  const [timeLeft,          setTimeLeft]          = useState(totalSec);
  const [timeUp,            setTimeUp]            = useState(false);
  const [showTimesUpModal,  setShowTimesUpModal]  = useState(false);
  const [showExit,          setShowExit]          = useState(false);

  useEffect(() => { if (timeUp) setShowTimesUpModal(true); }, [timeUp]);

  // Bounces the user away if they land on an ALREADY-completed session (stale
  // link, reopening a finished quiz). Must not fire when `completion` just
  // appeared because WE'RE the ones who submitted it a moment ago — the
  // submit mutation's own cache invalidation refetches this same session
  // query while this screen is still mounted underneath quiz-results, and
  // without the submissionTriggeredRef check that refetch would re-run this
  // effect and replace the results screen we just navigated to.
  useEffect(() => {
    if (
      isResuming && !isRestartMode && savedSession?.completion &&
      !submissionTriggeredRef.current
    ) {
      router.replace("/(tabs)/quiz");
    }
  }, [isResuming, isRestartMode, savedSession]);

  const [stateRestored, setStateRestored] = useState(false);
  const retakeTriggeredRef = useRef(false);

  // Restart clones resumeSessionId into a new retake session server-side
  // (see the mode comment at the top of this file) before the quiz is
  // considered ready — stateRestored only flips once that new session_id
  // comes back, so isReady/isLoading below keep showing the loading screen
  // until then. Called directly (not through the effect below) so tapping
  // "retry" on the error screen re-fires the request without depending on
  // some other prop changing to re-trigger the effect.
  const handleRetryRetake = useCallback(() => {
    if (!resumeId) return;
    resetRetake();
    createRetake(resumeId, {
      onSuccess: (data) => {
        setFrozenSessionId(data.session_id);
        setStateRestored(true);
      },
    });
  }, [resetRetake, createRetake, resumeId]);

  useEffect(() => {
    if (!isResuming || !savedSession || stateRestored) return;

    setFrozenQuestions(savedSession.questions ?? []);

    if (isRestartMode) {
      if (retakeTriggeredRef.current) return;
      retakeTriggeredRef.current = true;
      createRetake(resumeId!, {
        onSuccess: (data) => {
          setFrozenSessionId(data.session_id);
          setStateRestored(true);
        },
      });
      return;
    }

    setFrozenSessionId(resumeId);

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
    const firstUnanswered = savedSession.questions.findIndex((_, i) => restored[i] === undefined);
    if (firstUnanswered > 0) setCurrent(firstUnanswered);

    setStateRestored(true);
  }, [isResuming, savedSession, stateRestored, resumeId, isRestartMode, createRetake]);

  const isReady = questions.length > 0 && (!isResuming || stateRestored);

  const questionStartRef = useRef<number>(Date.now());
  const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({});

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const shakeX   = useSharedValue(0);
  const timerPct = useSharedValue(1);
  const [barWidth, setBarWidth] = useState(0);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const barStyle   = useAnimatedStyle(() => ({ width: timerPct.value * barWidth }));

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

  useEffect(() => {
    if (!sessionId || questions.length === 0) return;
    clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      doSaveProgress(answers, questionTimes, timeLeft);
    }, 2000);
    return () => clearTimeout(autosaveTimerRef.current);
  }, [answers]);

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

  const navigateToResults = (timedOut: boolean, data?: unknown) => {
    router.push({
      pathname: "/(main)/quiz/quiz-results",
      params: {
        subject: displaySubject,
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

  const handleExitConfirm = () => {
    setShowExit(false);
    clearTimeout(autosaveTimerRef.current);
    doSaveProgress(answers, questionTimes, timeLeft);
    router.replace("/(tabs)/quiz");
  };

  const isLoading = isResuming
    ? (isLoadingSession || !isReady)
    : (isGenerating || (!frozenQuestions.length && !generateError));
  const activeError = isResuming ? (sessionError || retakeError) : generateError;
  const isSuccess = !isLoading && !activeError && questions.length > 0;

  const goBackToQuizList = () => router.replace("/(tabs)/quiz");

  if (isLoading || (isSuccess && !readyToShowQuiz)) {
    return shouldGenerate
      ? <QuizStatusScreen title="Generating Quiz" steps={GENERATING_STEPS} subject={displaySubject || "Quiz"} difficulty="Adaptive" isComplete={isSuccess} onComplete={() => setReadyToShowQuiz(true)} />
      : <QuizStatusScreen title="Retrieving Quiz" steps={RETRIEVING_STEPS} subject={displaySubject || "Quiz"} difficulty="Adaptive" isComplete={isSuccess} onComplete={() => setReadyToShowQuiz(true)} />;
  }

  if (activeError || questions.length === 0) {
    return (
      <QuizErrorScreen
        message={(activeError as Error)?.message ?? "No questions were returned."}
        onRetry={isRestartMode ? handleRetryRetake : handleRetry}
        onUseCache={!isResuming ? handleUseCache : undefined}
        onBack={goBackToQuizList}
      />
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">

      {isSubmitting && (
        <View className="absolute inset-0 z-50" pointerEvents="box-only" />
      )}

      <View className="flex-row items-center justify-between px-4 py-3 bg-white">
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-slate-100 justify-center items-center"
          activeOpacity={0.7}
          onPress={() => setShowExit(true)}
        >
          <ChevronLeft size={18} color={ICON_COLORS.slate500} strokeWidth={2.5} />
        </TouchableOpacity>

        <View className="items-center justify-center">
          <Text className="text-md font-black text-slate-800">{displaySubject}</Text>
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
            color={isFlagged ? ICON_COLORS.violet600 : ICON_COLORS.slate500}
            strokeWidth={2.5}
            fill={isFlagged ? ICON_COLORS.violet100 : "transparent"}
          />
        </TouchableOpacity>
      </View>

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
          <Clock size={14} color={isLow ? ICON_COLORS.rose500 : ICON_COLORS.primary500} strokeWidth={3} />
          <Text className={`text-md font-black tracking-widest ${isLow ? "text-rose-500" : "text-primary"}`}>
            {formatTime(timeLeft)}
          </Text>
        </View>
      </View>

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

      <View className="flex-row justify-between px-5 mt-3">
        <Text className="text-xs text-slate-400 font-medium">
          Question {current + 1} / {totalQ}
        </Text>
        <Text className="text-xs text-slate-400 font-medium">
          {flagged.size > 0 ? `${flagged.size} flagged  ·  ` : ""}
          {answered}/{totalQ} answered
        </Text>
      </View>

      <View className="bg-white rounded-2xl py-[40px] px-4 m-4 border border-slate-100 shadow-sm shadow-black/5">
        {isFlagged && (
          <View className="flex-row items-center gap-1 absolute ps-5 pt-5">
            <Flag size={11} color={ICON_COLORS.violet600} strokeWidth={2.5} fill={ICON_COLORS.violet100} />
            <Text className="text-[11px] text-violet-600 font-semibold">Flagged for review</Text>
          </View>
        )}
        {(isShuffle && !!q?.subject) || !!q?.lesson ? (
          <View className="flex-row flex-wrap items-center gap-2 mb-3">
            {isShuffle && !!q?.subject && (() => {
              const SubjectIcon = getSubjectIcon(q.subject);
              return (
                <View className="flex-row items-center gap-1 px-2 py-1 rounded-full bg-violet-50">
                  <SubjectIcon size={11} color={ICON_COLORS.violet600} strokeWidth={2.5} />
                  <Text className="text-[11px] text-violet-600 font-semibold" numberOfLines={1}>
                    {q.subject}
                  </Text>
                </View>
              );
            })()}
            {!!q?.lesson && (
              <View className="flex-row items-center gap-1 px-2 py-1 rounded-full bg-primary-50">
                <BookOpen size={11} color={ICON_COLORS.primary500} strokeWidth={2.5} />
                <Text className="text-[11px] text-primary font-semibold" numberOfLines={1}>
                  {q.lesson}
                </Text>
              </View>
            )}
          </View>
        ) : null}
        <Text className="font-bold text-slate-800 leading-6 text-xl">{q?.question}</Text>
      </View>

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

      <View className="flex-row justify-between items-center absolute bottom-8 px-4 py-5 w-full bg-white/90">
        <TouchableOpacity
          className={`w-[49%] flex-row justify-center items-center gap-2 py-3.5 rounded-2xl ${
            current === 0 ? "bg-white border border-slate-200 opacity-40" : "bg-slate-100"
          }`}
          activeOpacity={0.8}
          disabled={current === 0}
          onPress={() => navigateTo(current - 1)}
        >
          <ChevronLeft size={16} color={ICON_COLORS.slate500} strokeWidth={2.5} />
          <Text className="text-sm font-bold text-slate-600">Previous</Text>
        </TouchableOpacity>

        {current < totalQ - 1 ? (
          <TouchableOpacity
            className="w-[49%] flex-row justify-center items-center gap-2 py-3.5 rounded-2xl bg-primary shadow-sm shadow-primary"
            activeOpacity={0.8}
            onPress={() => navigateTo(current + 1)}
          >
            <Text className="text-sm font-bold text-white">Next</Text>
            <ChevronRight size={16} color={ICON_COLORS.white} strokeWidth={2.5} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="w-[49%] flex-row justify-center items-center gap-2 py-3.5 rounded-2xl bg-emerald-500 shadow-sm shadow-emerald-500"
            activeOpacity={0.8}
            disabled={isSubmitting}
            onPress={goToResults}
          >
            {isSubmitting
              ? <ActivityIndicator size="small" color={ICON_COLORS.white} />
              : <BarChart2 size={16} color={ICON_COLORS.white} strokeWidth={2.5} />}
            <Text className="text-sm font-bold text-white">
              {isSubmitting ? "Saving…" : "Submit"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ExitQuizModal
        visible={showExit}
        answered={answered}
        totalQ={totalQ}
        onCancel={() => setShowExit(false)}
        onConfirm={handleExitConfirm}
      />

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
