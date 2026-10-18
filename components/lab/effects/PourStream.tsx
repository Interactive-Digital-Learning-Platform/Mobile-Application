import { useEffect } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

type Point = { x: number; y: number };

// The liquid stream that visually connects a tilted source vessel to the target it's pouring into
// — a thin coloured bar drawn from the source spout to the target rim (bench-local coords), so the
// pour reads as one physical event rather than an animation playing on its own inside the target.
export default function PourStream({ from, to, color }: { from: Point; to: Point; color: string }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(8, Math.hypot(dx, dy));
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withSequence(
      withTiming(1, { duration: 160 }),
      withTiming(1, { duration: 380 }),
      withTiming(0, { duration: 240 })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ rotate: `${angle}deg` }, { scaleX: 0.5 + progress.value * 0.5 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: from.x,
          top: from.y - 2,
          width: length,
          height: 4,
          borderRadius: 2,
          backgroundColor: color,
          transformOrigin: "left center",
        },
        style,
      ]}
    />
  );
}
