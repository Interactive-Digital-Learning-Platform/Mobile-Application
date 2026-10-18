import { useEffect } from "react";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

// A ripple across the liquid surface, mounted by the parent for as long as its pour animation
// runs (isPouring) — reads as the physical disturbance of liquid landing, distinct from
// BubbleEffect (tied to heat — a thermal/chemical effect, not a pour one, and shown regardless of
// whether anything was just poured).
export default function WaveEffect() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 300, easing: Easing.inOut(Easing.sin) }), -1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 + progress.value * 0.12 }, { translateY: progress.value * -1.5 }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", top: -3, left: 0, right: 0, height: 6 }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 40 6" preserveAspectRatio="none">
        <Path d="M0 3 Q5 0 10 3 T20 3 T30 3 T40 3" stroke="rgba(255,255,255,0.85)" strokeWidth={1.4} fill="none" />
      </Svg>
    </Animated.View>
  );
}
