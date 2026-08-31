import { Pressable, View } from "react-native";
import Animated, { Extrapolation, interpolate, SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { VisualizationTimelineProps } from "@/types/lab";

function StageFill({ timelinePosition, stageIndex }: { timelinePosition: SharedValue<number>; stageIndex: number }) {
  const style = useAnimatedStyle(() => ({
    width: `${interpolate(timelinePosition.value, [stageIndex, stageIndex + 1], [0, 100], Extrapolation.CLAMP)}%`,
  }));
  return <Animated.View className="h-full bg-primary rounded-full" style={style} />;
}

// Stage dots doubling as a scrubber — tapping any dot jumps to that stage (spec section 7's
// "timeline should allow the student to move between stages"). The current stage's dot fills
// continuously via `timelinePosition` instead of just switching on/off, so the student can see
// how far through the current stage the animation is.
export default function VisualizationTimeline({
  totalStages,
  currentStageIndex,
  timelinePosition,
  onJumpToStage,
}: VisualizationTimelineProps) {
  return (
    <View className="flex-row items-center gap-1.5">
      {Array.from({ length: totalStages }, (_, i) => i).map((i) => {
        const isDone = i < currentStageIndex;
        const isCurrent = i === currentStageIndex;
        return (
          <Pressable key={i} onPress={() => onJumpToStage(i)} className="flex-1" hitSlop={6}>
            <View
              className={`h-1.5 rounded-full overflow-hidden ${
                isDone ? "bg-emerald-500" : isCurrent ? "bg-primary/20" : "bg-slate-200"
              }`}
            >
              {isCurrent && <StageFill timelinePosition={timelinePosition} stageIndex={i} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
