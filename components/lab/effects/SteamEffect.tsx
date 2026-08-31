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

const Wisp = ({ delay, left }: { delay: number; left: `${number}%` }) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(withTiming(-40, { duration: 1500, easing: Easing.out(Easing.ease) }), -1, false)
    );
    opacity.value = withDelay(delay, withRepeat(withTiming(0, { duration: 1500 }), -1, false));
  }, [delay, translateY, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: 1 + Math.abs(translateY.value) / 80 }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: -6,
          left,
          width: 10,
          height: 14,
          borderRadius: 6,
          backgroundColor: "rgba(255,255,255,0.6)",
        },
        style,
      ]}
    />
  );
};

export default function SteamEffect() {
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0 }} pointerEvents="none">
      <Wisp delay={0} left="28%" />
      <Wisp delay={400} left="56%" />
    </View>
  );
}
