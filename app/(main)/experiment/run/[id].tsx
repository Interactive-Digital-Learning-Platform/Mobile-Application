import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import {
  ActivityIndicator, Alert, Pressable, ScrollView, Text, View, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Lightbulb, CheckCircle, XCircle, SkipForward, Play } from "lucide-react-native";
import { fetchExperimentById } from "@/services/experimentService";
import { startSession, logAction, requestHint, completeSession } from "@/services/sessionService";
import { ExperimentType, ExperimentStep } from "@/types";
import MaterialSelector from "@/components/MaterialSelector";
import ExperimentActionGrid from "@/components/ExperimentActionGrid";

const SUBJECT_COLOR: Record<string, string> = {
  Physics: "#4F8EF7", Chemistry: "#E74C3C", Biology: "#27AE60",
};

export default function ExperimentRunner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"preparation" | "execution">("preparation");
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepStartTime, setStepStartTime] = useState(Date.now());
  const [hint, setHint] = useState<{ level: number; text: string } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [stepFeedback, setStepFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [completing, setCompleting] = useState(false);
  const hintAnim = useRef(new Animated.Value(0)).current;

  const { data: experiment, isLoading } = useQuery<ExperimentType>({
    queryKey: ["experiment", id],
    queryFn: () => fetchExperimentById(id!),
    enabled: !!id,
  });

  // Start session when experiment loads
  useEffect(() => {
    if (experiment && !sessionId) {
      startSession(experiment._id).then((s) => {
        setSessionId(s._id);
        setStepStartTime(Date.now());
      });
    }
  }, [experiment]);

  const currentStep: ExperimentStep | undefined = experiment?.steps?.[currentStepIndex];
  const totalSteps = experiment?.steps?.length ?? 0;
  const progress = totalSteps > 0 ? (currentStepIndex / totalSteps) * 100 : 0;
  const subjectColor = SUBJECT_COLOR[experiment?.subject ?? "Physics"] ?? "#4F8EF7";

  const getTimeTaken = () => Math.round((Date.now() - stepStartTime) / 1000);

  const handleToggleMaterial = (material: string) => {
    setSelectedMaterials((prev) =>
      prev.includes(material) ? prev.filter((m) => m !== material) : [...prev, material]
    );
  };

  const handleStartExecution = async () => {
    if (!sessionId) return;
    
    // Log preparation completeness
    const missingMaterials = experiment?.materials?.filter(m => !selectedMaterials.includes(m)) || [];
    const isCorrect = missingMaterials.length === 0;
    
    await logAction(sessionId, {
      stepId: 0, // 0 for preparation
      actionType: isCorrect ? "correct" : "incorrect",
      actionDetail: `Materials selected: ${selectedMaterials.join(", ")}`,
      expectedAction: `Required: ${experiment?.materials?.join(", ")}`,
      timeTaken: getTimeTaken(),
    });

    if (!isCorrect) {
      Alert.alert(
        "Missing Materials",
        `You haven't selected all required materials: ${missingMaterials.join(", ")}. Proceed anyway?`,
        [
          { text: "Go Back", style: "cancel" },
          { text: "Proceed", onPress: () => {
            setPhase("execution");
            setStepStartTime(Date.now());
          }}
        ]
      );
    } else {
      setPhase("execution");
      setStepStartTime(Date.now());
    }
  };

  const handleAction = async (actionLabel: string) => {
    if (!sessionId || !currentStep) return;
    
    const timeTaken = getTimeTaken();
    const expectedDisplay = currentStep.expectedAction
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    
    const isCorrect = actionLabel === expectedDisplay;
    const actionType = isCorrect ? "correct" : "incorrect";

    setStepFeedback(actionType);

    await logAction(sessionId, {
      stepId: currentStep.stepId,
      actionType,
      actionDetail: actionLabel,
      expectedAction: currentStep.expectedAction,
      timeTaken,
    });

    if (isCorrect) {
      setTimeout(async () => {
        setStepFeedback(null);
        setShowHint(false);
        setHint(null);
        if (currentStepIndex + 1 >= totalSteps) {
          await handleComplete();
        } else {
          setCurrentStepIndex((prev) => prev + 1);
          setStepStartTime(Date.now());
        }
      }, 1200);
    } else {
      // Allow retry if incorrect
      setTimeout(() => setStepFeedback(null), 2000);
    }
  };

  const handleSkip = async () => {
    if (!sessionId || !currentStep) return;
    await logAction(sessionId, {
      stepId: currentStep.stepId,
      actionType: "skipped",
      actionDetail: "User skipped step",
      expectedAction: currentStep.expectedAction,
      timeTaken: getTimeTaken(),
    });
    
    if (currentStepIndex + 1 >= totalSteps) {
      await handleComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
      setStepStartTime(Date.now());
    }
  };

  const handleHint = async () => {
    if (!sessionId || !currentStep) return;
    const result = await requestHint(sessionId, currentStep.stepId);
    setHint(result);
    setShowHint(true);
    Animated.spring(hintAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const handleComplete = async () => {
    if (!sessionId || completing) return;
    setCompleting(true);
    try {
      await completeSession(sessionId);
      router.replace(`/(main)/experiment/feedback/${sessionId}`);
    } catch {
      Alert.alert("Error", "Could not complete session. Please try again.");
      setCompleting(false);
    }
  };

  const handleExit = () => {
    Alert.alert("Exit Experiment?", "Your progress will be lost.", [
      { text: "Stay", style: "cancel" },
      { text: "Exit", style: "destructive", onPress: () => router.back() },
    ]);
  };

  if (isLoading || !experiment || !sessionId) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#FC6E20" />
        <Text className="font-amedium text-[#979797] mt-3">Setting up experiment...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f0f5fb]">
      {/* Top Bar */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={handleExit} className="flex-row items-center gap-1">
          <ChevronLeft size={22} color="#0F172A" />
          <Text className="font-amedium text-[#0F172A]">Exit</Text>
        </Pressable>
        <Text className="font-asemibold text-[#0F172A]">
          {phase === "preparation" ? "Preparation" : `Step ${currentStepIndex + 1} of ${totalSteps}`}
        </Text>
        <View className="w-10">
          {phase === "execution" && (
            <Pressable onPress={handleHint} className="flex-row items-center gap-1">
              <Lightbulb size={18} color="#F39C12" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Progress Bar */}
      <View className="mx-4 h-2 bg-[#E3E1E1] rounded-full mb-4">
        <View
          className="h-2 rounded-full"
          style={{ width: `${phase === 'preparation' ? 5 : progress}%`, backgroundColor: subjectColor }}
        />
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {phase === "preparation" ? (
          <MaterialSelector
            allMaterials={experiment.materials || []}
            selectedMaterials={selectedMaterials}
            onToggle={handleToggleMaterial}
            subjectColor={subjectColor}
          />
        ) : (
          <>
            {/* Step Card */}
            <View
              className="bg-white rounded-3xl p-5 mb-6"
              style={{
                borderTopWidth: 4,
                borderTopColor: subjectColor,
                shadowColor: "#000",
                shadowOpacity: 0.07,
                shadowRadius: 12,
                elevation: 4,
              }}
            >
              <View className="flex-row items-center gap-2 mb-3">
                <View
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: subjectColor + "22" }}
                >
                  <Text className="text-xs font-amedium" style={{ color: subjectColor }}>
                    {currentStep?.actionType?.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text className="text-xl font-asemibold text-[#0F172A] mb-3">
                {currentStep?.title}
              </Text>
              <Text className="text-base font-aregular text-[#374151] leading-6">
                {currentStep?.instruction}
              </Text>
            </View>

            {/* Step Feedback Flash */}
            {stepFeedback && (
              <View
                className="rounded-2xl p-4 mb-6 flex-row items-center gap-3"
                style={{ backgroundColor: stepFeedback === "correct" ? "#EEFFF4" : "#FFEEEE" }}
              >
                {stepFeedback === "correct"
                  ? <CheckCircle size={24} color="#27AE60" />
                  : <XCircle size={24} color="#E74C3C" />
                }
                <Text
                  className="font-asemibold text-base flex-1"
                  style={{ color: stepFeedback === "correct" ? "#27AE60" : "#E74C3C" }}
                >
                  {stepFeedback === "correct" ? "Excellent work! Proceeding..." : "That's not the right procedure. Try again or check the hint."}
                </Text>
              </View>
            )}

            {/* Action Grid */}
            {!stepFeedback || stepFeedback === "incorrect" ? (
              <ExperimentActionGrid
                expectedAction={currentStep?.expectedAction || ""}
                onAction={handleAction}
                subject={experiment.subject}
                subjectColor={subjectColor}
              />
            ) : null}

            {/* Hint Panel */}
            {showHint && hint && (
              <Animated.View 
                style={{ 
                  opacity: hintAnim,
                  marginTop: 24,
                  transform: [{ translateY: hintAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] 
                }}
                className="bg-[#FFF8E7] border border-[#F39C12] rounded-2xl p-4 mb-4"
              >
                <View className="flex-row items-center gap-2 mb-2">
                  <Lightbulb size={16} color="#F39C12" />
                  <Text className="font-asemibold text-[#F39C12]">
                    Guided Hint (Level {hint.level})
                  </Text>
                </View>
                <Text className="font-aregular text-[#374151] text-sm leading-5">{hint.text}</Text>
              </Animated.View>
            )}
          </>
        )}

        <View className="h-40" />
      </ScrollView>

      {/* Footer Actions */}
      <View className="absolute bottom-0 left-0 right-0 bg-white/95 px-4 pt-3 pb-8 border-t border-[#E3E1E1]">
        {phase === "preparation" ? (
          <Pressable
            onPress={handleStartExecution}
            className="w-full h-14 rounded-2xl flex-row justify-center items-center gap-2"
            style={{ backgroundColor: subjectColor }}
          >
            <Play size={20} color="white" fill="white" />
            <Text className="text-white text-lg font-asemibold">Start Lab Session</Text>
          </Pressable>
        ) : (
          <View className="flex-row justify-between items-center px-2">
            <Text className="text-[#979797] font-amedium">Not sure? Use a hint</Text>
            <Pressable
              onPress={handleSkip}
              className="flex-row items-center gap-1 py-2 px-4 rounded-xl bg-[#f0f5fb]"
            >
              <Text className="text-[#979797] font-asemibold">Skip Step</Text>
              <SkipForward size={18} color="#979797" />
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
