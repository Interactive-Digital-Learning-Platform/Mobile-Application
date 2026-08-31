import { Text } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { StageLabelOverlayProps } from "@/types/lab";

// Bold caption over the canvas naming the current stage (e.g. "Evaporation") — the reference
// sample video labels each moment this way rather than relying only on the panel text below.
// Fades in/out at this stage's own boundaries via one formula, reused for every stage.
export default function StageLabelOverlay({ title, stageIndex, timelinePosition }: StageLabelOverlayProps) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      timelinePosition.value,
      [stageIndex, stageIndex + 0.15, stageIndex + 0.85, stageIndex + 1],
      [0, 1, 1, 0],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 12, left: 0, right: 0, alignItems: "center" }, style]}>
      <Text className="text-ink font-abold text-base bg-white/85 px-3 py-1 rounded-full overflow-hidden">{title}</Text>
    </Animated.View>
  );
}
