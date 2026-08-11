/**
 * Skeleton.tsx
 * ─────────────────────────────────────────────────────────
 * Reusable pulsing placeholder block for loading states.
 * Use instead of ActivityIndicator whenever the loading UI should mimic
 * the shape of the content it's replacing (lists, cards, stat rows).
 *
 * Usage:
 *   <Skeleton width={120} height={16} />
 *   <Skeleton width="100%" height={72} borderRadius={18} />
 */
import { View, type DimensionValue, type ViewStyle } from "react-native";
import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  color?: string;
  style?: ViewStyle;
}

export default function Skeleton({
  width = "100%",
  height = 14,
  borderRadius = 8,
  color = "#E2E8F0",
  style,
}: SkeletonProps) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1,   { duration: 700 }),
        withTiming(0.5, { duration: 700 })
      ),
      -1,
      true
    );
    return () => cancelAnimation(opacity);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: color },
        animatedStyle,
        style,
      ]}
    />
  );
}
