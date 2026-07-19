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

const Bubble = ({ delay, left }: { delay: number; left: number }) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(withTiming(-60, { duration: 1200, easing: Easing.out(Easing.quad) }), -1, false)
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
        {
          position: "absolute",
          bottom: 4,
          left,
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: "rgba(255,255,255,0.8)",
        },
        style,
      ]}
    />
  );
};

export default function BubbleEffect({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <View style={{ position: "absolute", bottom: 0, width: "100%", height: "100%" }} pointerEvents="none">
      <Bubble delay={0} left={12} />
      <Bubble delay={300} left={30} />
      <Bubble delay={600} left={48} />
    </View>
  );
}
