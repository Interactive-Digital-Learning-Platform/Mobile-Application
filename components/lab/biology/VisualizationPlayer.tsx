import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Compass, Eye, EyeOff, Lightbulb } from "lucide-react-native";
import { cancelAnimation, Easing, runOnJS, useSharedValue, withTiming } from "react-native-reanimated";
import { ICON_COLORS } from "@/constants/quizStyles";
import { VisualizationPlayerProps } from "@/types/lab";
import { ProgressStepsCaption } from "@/components/ui/ProgressSteps";
import VisualizationCanvas from "./VisualizationCanvas";
import StageLabelOverlay from "./StageLabelOverlay";
import VisualizationTimeline from "./VisualizationTimeline";
import VisualizationControls from "./VisualizationControls";
import BiologyInfoSheet from "./BiologyInfoSheet";
import VisualizationQuestion from "./VisualizationQuestion";

// Owns all playback state for one visualization. `timelinePosition` is a single continuous
// shared value (0..stages.length) — its integer part is the current stage, its fractional part
// is progress within that stage — driving the canvas animation, the timeline fill, and (via the
// effect below) the JS-side `currentStageIndex` used for stage text/dots/questions.
export default function VisualizationPlayer({ visualization }: VisualizationPlayerProps) {
  const { stages, components, learningQuestions } = visualization;
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [infoSheetVisible, setInfoSheetVisible] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const timelinePosition = useSharedValue(0);

  const currentStage = stages[currentStageIndex];
  const canvasColor =
    visualization.animationKey === "water_cycle"
      ? "#DDF3FF"
      : visualization.animationKey === "photosynthesis"
        ? "#EFF9DE"
        : visualization.animationKey === "gas_exchange"
          ? "#FFF0F3"
          : "#F1F5F9";

  const handleStageComplete = () => {
    setCurrentStageIndex((i) => {
      const next = i + 1;
      if (next >= stages.length) {
        setIsPlaying(false);
        if (learningQuestions.length > 0) setShowQuestion(true);
        return i;
      }
      return next;
    });
  };

  useEffect(() => {
    if (!isPlaying) return;
    const stage = stages[currentStageIndex];
    if (!stage) return;

    const fractional = Math.max(0, Math.min(1, timelinePosition.value - currentStageIndex));
    const remainingMs = stage.durationMs * (1 - fractional);

    timelinePosition.value = withTiming(currentStageIndex + 1, { duration: remainingMs, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(handleStageComplete)();
    });

    return () => {
      cancelAnimation(timelinePosition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentStageIndex]);

  const jumpToStage = (index: number) => {
    cancelAnimation(timelinePosition);
    timelinePosition.value = index;
    setCurrentStageIndex(index);
    setShowQuestion(false);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      cancelAnimation(timelinePosition);
      setIsPlaying(false);
      return;
    }
    if (currentStageIndex >= stages.length - 1 && timelinePosition.value >= stages.length - 0.001) {
      timelinePosition.value = 0;
      setCurrentStageIndex(0);
    }
    setShowQuestion(false);
    setIsPlaying(true);
  };

  const handleReplay = () => {
    cancelAnimation(timelinePosition);
    timelinePosition.value = 0;
    setCurrentStageIndex(0);
    setShowQuestion(false);
    setIsPlaying(true);
  };

  const handleTapComponent = (componentId: string) => {
    cancelAnimation(timelinePosition);
    setIsPlaying(false);
    setSelectedComponentId(componentId);
    setInfoSheetVisible(true);
  };

  const handleExplore = () => {
    cancelAnimation(timelinePosition);
    setIsPlaying(false);
    setSelectedComponentId(components[0]?.componentId ?? null);
    setInfoSheetVisible(true);
  };

  const handleReplayStage = (stageId: number) => {
    const index = stages.findIndex((s) => s.stageId === stageId);
    if (index === -1) return;
    setShowQuestion(false);
    jumpToStage(index);
    setIsPlaying(true);
  };

  return (
    <View className="flex-1">
      <View
        className="overflow-hidden rounded-[28px] border border-white shadow-sm shadow-black/10"
        style={{ aspectRatio: 1.08, backgroundColor: canvasColor }}
      >
        <VisualizationCanvas
          animationKey={visualization.animationKey}
          currentStage={currentStage}
          currentStageIndex={currentStageIndex}
          timelinePosition={timelinePosition}
          activeComponentIds={currentStage?.componentIds ?? []}
          showLabels={showLabels}
          onTapComponent={handleTapComponent}
        />
        {currentStage && <StageLabelOverlay title={currentStage.title} stageIndex={currentStageIndex} timelinePosition={timelinePosition} />}
      </View>

      <View className="mt-3 px-2">
        <VisualizationTimeline
          totalStages={stages.length}
          currentStageIndex={currentStageIndex}
          timelinePosition={timelinePosition}
          onJumpToStage={jumpToStage}
        />
        <ProgressStepsCaption totalSteps={stages.length} currentStep={currentStageIndex + 1} />
      </View>

      <VisualizationControls
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onReplay={handleReplay}
        onStepBack={() => jumpToStage(Math.max(0, currentStageIndex - 1))}
        onStepForward={() => jumpToStage(Math.min(stages.length - 1, currentStageIndex + 1))}
        canStepBack={currentStageIndex > 0}
        canStepForward={currentStageIndex < stages.length - 1}
      />

      {showQuestion && learningQuestions.length > 0 ? (
        <VisualizationQuestion question={learningQuestions[0]} onReplayStage={handleReplayStage} onDone={() => setShowQuestion(false)} />
      ) : (
        currentStage && (
          <View className="mt-4 flex-row items-start gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm shadow-black/5">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-500">
              <Lightbulb size={23} color={ICON_COLORS.white} strokeWidth={2} />
            </View>
            <View className="flex-1">
              <Text className="mb-1 text-xs font-black uppercase tracking-wide text-slate-800">What is happening?</Text>
              <Text className="text-[14px] leading-5 text-slate-600">{currentStage.explanation}</Text>
            </View>
          </View>
        )
      )}

      <View className="mt-4 flex-row gap-2">
        <Pressable onPress={handleExplore} className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white">
          <Compass size={19} color={ICON_COLORS.blue500} strokeWidth={2.3} />
          <Text className="font-black text-slate-800">Explore</Text>
        </Pressable>
        <Pressable
          onPress={() => setShowLabels((v) => !v)}
          className={`h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-2xl border ${
            showLabels ? "border-emerald-400 bg-emerald-50" : "border-emerald-200 bg-white"
          }`}
        >
          {showLabels ? <EyeOff size={19} color={ICON_COLORS.emerald600} /> : <Eye size={19} color={ICON_COLORS.emerald600} />}
          <Text className="font-black text-slate-800">Labels</Text>
        </Pressable>
      </View>

      <BiologyInfoSheet
        visible={infoSheetVisible}
        components={components}
        selectedComponentId={selectedComponentId}
        onClose={() => setInfoSheetVisible(false)}
      />
    </View>
  );
}
