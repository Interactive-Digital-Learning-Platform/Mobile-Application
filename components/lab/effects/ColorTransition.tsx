import { useEffect } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { ColorTransitionProps } from "@/types/lab";

// Cross-fades from `fromColor` to `toColor` over 800ms whenever the colors change.
export default function ColorTransition({ fromColor, toColor, style }: ColorTransitionProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 800 });
  }, [toColor, progress]);

  const fadeOutStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
  }));
  const fadeInStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  return (
    <>
      <Animated.View style={[style, { backgroundColor: fromColor, position: "absolute" }, fadeOutStyle]} />
      <Animated.View style={[style, { backgroundColor: toColor, position: "absolute" }, fadeInStyle]} />
    </>
  );
}
