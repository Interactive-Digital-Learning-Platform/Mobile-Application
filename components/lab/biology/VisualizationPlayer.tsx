import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { cancelAnimation, Easing, runOnJS, useSharedValue, withTiming } from "react-native-reanimated";
import { colors } from "@/constants/colors";
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
      <View className="bg-bg-soft rounded-3xl overflow-hidden" style={{ aspectRatio: 300 / 220 }}>
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

      <View className="mt-4">
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
          <View className="mt-2">
            <Text className="font-amedium text-ink text-sm mb-1">What is happening?</Text>
            <Text className="font-aregular text-muted">{currentStage.explanation}</Text>
          </View>
        )
      )}

      <View className="flex-row gap-2 mt-4">
        <Pressable onPress={handleExplore} className="flex-1 flex-row items-center justify-center gap-2 border border-border rounded-xl py-3">
          <Text className="font-amedium text-ink">Explore</Text>
        </Pressable>
        <Pressable
          onPress={() => setShowLabels((v) => !v)}
          className="flex-1 flex-row items-center justify-center gap-2 border border-border rounded-xl py-3"
        >
          {showLabels ? <EyeOff size={16} color={colors.primaryBlack} /> : <Eye size={16} color={colors.primaryBlack} />}
          <Text className="font-amedium text-ink">Labels</Text>
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
