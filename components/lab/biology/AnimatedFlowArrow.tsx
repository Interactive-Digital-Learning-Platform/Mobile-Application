import Animated, { Extrapolation, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { AnimatedFlowArrowProps } from "@/types/lab";

// A directional icon that travels between two points as `timelinePosition` crosses `moveRange`
// — the "arrows showing direction/process" visual language from the reference sample video,
// layered as a plain positioned View over each canvas's static SVG scene rather than baked into
// the SVG itself, so any canvas can reuse it with its own coordinates/icon/color. Opacity fades
// in/out at both ends of `moveRange` so the icon fully disappears once its moment has passed,
// rather than freezing on screen at its last position (Extrapolation.CLAMP would otherwise hold
// the last interpolated value forever past the range).
export default function AnimatedFlowArrow({
  Icon,
  color,
  size = 18,
  timelinePosition,
  moveRange,
  xRange,
  yRange,
  fadePadding = 0.15,
}: AnimatedFlowArrowProps) {
  const [start, end] = moveRange;
  const pad = fadePadding * (end - start);

  const style = useAnimatedStyle(() => {
    const left = interpolate(timelinePosition.value, [start, end], xRange, Extrapolation.CLAMP);
    const top = interpolate(timelinePosition.value, [start, end], yRange, Extrapolation.CLAMP);
    const opacity = interpolate(timelinePosition.value, [start, start + pad, end - pad, end], [0, 1, 1, 0], Extrapolation.CLAMP);
    return { left: `${left}%`, top: `${top}%`, opacity };
  });

  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute" }, style]}>
      <Icon size={size} color={color} />
    </Animated.View>
  );
}
