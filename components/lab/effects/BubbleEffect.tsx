import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// `left` is a percentage of the (narrow, vessel-width) parent, so bubbles stay inside the glass
// regardless of how big the equipment box is rendered.
const Bubble = ({ delay, left }: { delay: number; left: `${number}%` }) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(withTiming(-34, { duration: 1200, easing: Easing.out(Easing.quad) }), -1, false)
    );
    opacity.value = withDelay(delay, withRepeat(withTiming(0, { duration: 1200 }), -1, false));
  }, [delay, translateY, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: 1 - opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { position: "absolute", bottom: 2, left, width: 5, height: 5, borderRadius: 2.5, backgroundColor: "rgba(255,255,255,0.85)" },
        style,
      ]}
    />
  );
};

export default function BubbleEffect({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
      <Bubble delay={0} left="16%" />
      <Bubble delay={300} left="46%" />
      <Bubble delay={600} left="72%" />
    </View>
  );
}
