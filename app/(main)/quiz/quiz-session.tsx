import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  AppState,
  StatusBar,
  useWindowDimensions,
  type AppStateStatus,
} from "react-native";
import { Text } from "@/components/ui/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  Easing,
  runOnJS,
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
import { OPTION_LABELS, formatTime, formatMathText } from "@/constants/quizHelpers";
import TimesUpModel from "@/components/quiz-componets/TimesUpModel";
import ExitQuizModal from "@/components/quiz-componets/ExitQuizModal";
import QuizOptionButton from "@/components/quiz-componets/QuizOptionButton";
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
// Each half of the card swap between questions (old card out, new card in).
const CARD_SWAP_HALF_MS = 200;

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

  // Holds the countdown's active setInterval id so it can be stopped the
  // instant the user taps Submit — otherwise it keeps ticking (and can
  // still fire the timeout auto-submit) while the submit request is in
  // flight and this screen is still mounted.
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  // Orange header behind the status bar: light status-bar text while this screen is focused.
  useFocusEffect(
    useCallback(() => {
      const entry = StatusBar.pushStackEntry({ barStyle: "light-content" });
      return () => StatusBar.popStackEntry(entry);
    }, [])
  );

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
    timerIntervalRef.current = id;
    return () => clearInterval(id);
  }, [isReady, timeUp]);

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

  // Card swap between questions (same motion as the 1v1 battle's): going
  // forward, the card slides off to the left and the next one comes in from
  // the right; going back (Previous, or an earlier progress segment), the
  // other way round. Taps are ignored while a swap is running.
  const { width: screenWidth } = useWindowDimensions();
  const cardX = useSharedValue(0);
  const cardSwapStyle = useAnimatedStyle(() => ({ transform: [{ translateX: cardX.value }] }));
  const [swapping, setSwapping] = useState(false);

  const endSwap = useCallback(() => setSwapping(false), []);

  const slideInQuestion = useCallback(
    (next: number, direction: 1 | -1) => {
      setCurrent(next);
      cardX.value = direction * screenWidth;
      cardX.value = withTiming(0, { duration: CARD_SWAP_HALF_MS, easing: Easing.out(Easing.cubic) }, () => {
        runOnJS(endSwap)();
      });
    },
    [cardX, screenWidth, endSwap]
  );

  const navigateTo = (next: number) => {
    if (next === current || swapping) return;
    recordQuestionTime(current);
    const direction = next > current ? 1 : -1;
    setSwapping(true);
    cardX.value = withTiming(
      -direction * screenWidth,
      { duration: CARD_SWAP_HALF_MS, easing: Easing.in(Easing.cubic) },
      (done) => {
        if (done) runOnJS(slideInQuestion)(next, direction);
        else runOnJS(endSwap)();
      }
    );
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
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
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

  const pad2 = (n: number) => String(n).padStart(2, "0");

  return (
    <View className="flex-1 bg-primary-500">
      {/* Two-tone backdrop: a deeper band behind the header that the question card overlaps. */}
      <View
        className="absolute left-0 right-0 top-0 bg-primary-700"
        style={{ height: "44%", borderBottomLeftRadius: 56, borderBottomRightRadius: 56 }}
      />

      {isSubmitting && (
        <View className="absolute inset-0 z-50" pointerEvents="box-only" />
      )}

      <SafeAreaView edges={["top", "bottom"]} className="flex-1">
        {/* Header: back · question counter · timer */}
        <View className="flex-row items-center justify-between px-5 pt-2">
          <TouchableOpacity
            className="w-11 h-11 rounded-2xl bg-white/15 justify-center items-center"
            activeOpacity={0.7}
            onPress={() => setShowExit(true)}
            accessibilityRole="button"
            accessibilityLabel="Exit quiz"
          >
            <ChevronLeft size={22} color={ICON_COLORS.white} strokeWidth={2.75} />
          </TouchableOpacity>

          <Text className="text-white text-[17px] font-black">
            Question {pad2(current + 1)} / {pad2(totalQ)}
          </Text>

          <View
            className={`flex-row items-center gap-1.5 pl-1.5 pr-3 h-11 rounded-full ${
              isLow ? "bg-rose-500" : "bg-white/20"
            }`}
          >
            <View className="w-8 h-8 rounded-full bg-white justify-center items-center">
              <Clock size={16} color={isLow ? ICON_COLORS.rose500 : ICON_COLORS.primary600} strokeWidth={2.75} />
            </View>
            <Text className="text-white text-[16px] font-black tracking-wider">{formatTime(timeLeft)}</Text>
          </View>
        </View>

        {/* Progress: one segment per question, tap to jump. */}
        <View className="mx-5 mt-5 h-2.5 rounded-full bg-black/20 flex-row overflow-hidden">
          {questions.map((_, i) => {
            const isAns  = answers[i] !== undefined;
            const isFlag = flagged.has(i);
            const isCurr = i === current;
            return (
              <TouchableOpacity
                key={i}
                onPress={() => navigateTo(i)}
                hitSlop={{ top: 10, bottom: 10 }}
                style={{ flex: 1, marginHorizontal: 1, borderRadius: 99 }}
                className={
                  isFlag ? "bg-violet-300" :
                  isAns  ? "bg-emerald-400" :
                  isCurr ? "bg-white" : "bg-transparent"
                }
              />
            );
          })}
        </View>
        <View className="flex-row justify-between px-6 mt-2">
          <Text className="text-xs text-white/80 font-semibold">{answered}/{totalQ} answered</Text>
          {flagged.size > 0 && (
            <Text className="text-xs text-white/80 font-semibold">{flagged.size} flagged</Text>
          )}
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
        >
          <View>
            {/* Stacked "deck" edges peeking out under the card. */}
            <View className="absolute rounded-[28px] bg-white/25" style={{ left: 28, right: 28, top: 24, bottom: -22 }} />
            <View className="absolute rounded-[28px] bg-white/45" style={{ left: 14, right: 14, top: 12, bottom: -11 }} />

            <Animated.View style={cardSwapStyle} className="bg-white rounded-[28px] px-5 pt-5 pb-6 shadow-lg shadow-black/15">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center gap-2 mr-3">
                  <Text className="text-[15px] font-medium text-slate-400" numberOfLines={1}>{displaySubject}</Text>
                  {/* Shuffle mode has no difficulty of its own — each subject picks
                      its own independently at generation time — so no difficulty
                      pill is shown here at all when isShuffle. */}
                  {!isShuffle && (
                    <View className={`px-2 py-0.5 rounded-full ${diff.bg}`}>
                      <Text className={`text-[11px] font-bold ${diff.text}`}>{displayDifficulty}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  className={`w-9 h-9 rounded-xl justify-center items-center ${
                    isFlagged ? "bg-violet-100" : "bg-slate-100"
                  }`}
                  activeOpacity={0.7}
                  onPress={toggleFlag}
                  accessibilityRole="button"
                  accessibilityLabel={isFlagged ? "Unflag question" : "Flag question for review"}
                >
                  <Flag
                    size={16}
                    color={isFlagged ? ICON_COLORS.violet600 : ICON_COLORS.slate500}
                    strokeWidth={2.5}
                    fill={isFlagged ? ICON_COLORS.violet100 : "transparent"}
                  />
                </TouchableOpacity>
              </View>

              {isFlagged && (
                <View className="flex-row items-center gap-1 mt-1">
                  <Flag size={11} color={ICON_COLORS.violet600} strokeWidth={2.5} fill={ICON_COLORS.violet100} />
                  <Text className="text-[11px] text-violet-600 font-semibold">Flagged for review</Text>
                </View>
              )}

              {(isShuffle && !!q?.subject) || !!q?.lesson ? (
                <View className="flex-row flex-wrap items-center gap-2 mt-3">
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

              <Text className="mt-3 text-[21px] leading-7 font-black text-slate-800">
                {formatMathText(q?.question ?? "")}
              </Text>

              <View className="gap-3 mt-5">
                {(q?.options ?? []).map((opt, i) => (
                  <QuizOptionButton
                    key={i}
                    variant="card"
                    label={OPTION_LABELS[i]}
                    optionText={opt}
                    isSelected={selectedOpt === i}
                    onPress={() => setAnswers((prev) => ({ ...prev, [current]: i }))}
                  />
                ))}
              </View>
            </Animated.View>
          </View>
        </ScrollView>

        {/* Footer: Previous · Next / Submit */}
        <View className="flex-row items-center gap-3 px-5 pt-2 pb-3">
          {/* Same raised style as Next (bottom "lip", bold label), in white as the secondary action. */}
          <TouchableOpacity
            className={`h-14 px-4 flex-row justify-center items-center gap-1 rounded-2xl bg-white border-b-[5px] border-primary-200 ${
              current === 0 ? "opacity-40" : ""
            }`}
            activeOpacity={0.85}
            disabled={current === 0}
            onPress={() => navigateTo(current - 1)}
          >
            <ChevronLeft size={20} color={ICON_COLORS.primary600} strokeWidth={2.75} />
            <Text className="text-lg font-black text-primary-600">Previous</Text>
          </TouchableOpacity>

          {current < totalQ - 1 ? (
            <TouchableOpacity
              className="flex-1 h-14 flex-row justify-center items-center gap-2 rounded-2xl bg-emerald-400 border-b-[5px] border-emerald-600"
              activeOpacity={0.85}
              onPress={() => navigateTo(current + 1)}
            >
              <Text className="text-lg font-black text-white">Next</Text>
              <ChevronRight size={20} color={ICON_COLORS.white} strokeWidth={2.75} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="flex-1 h-14 flex-row justify-center items-center gap-2 rounded-2xl bg-emerald-400 border-b-[5px] border-emerald-600"
              activeOpacity={0.85}
              disabled={isSubmitting}
              onPress={goToResults}
            >
              {isSubmitting
                ? <ActivityIndicator size="small" color={ICON_COLORS.white} />
                : <BarChart2 size={18} color={ICON_COLORS.white} strokeWidth={2.75} />}
              <Text className="text-lg font-black text-white">
                {isSubmitting ? "Saving…" : "Submit"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

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
    </View>
  );
}
