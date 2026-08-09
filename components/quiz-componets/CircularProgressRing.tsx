import { useEffect } from "react";
import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  withDelay,
} from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressRingProps {
  pct: number;
  correct: number;
  total: number;
  strokeColor?: string;
  trackColor?: string;
  textColor?: string;
}

const SIZE        = 136;
const STROKE_W    = 9;
const RADIUS      = (SIZE - STROKE_W) / 2;
const CIRCUMF     = 2 * Math.PI * RADIUS;

export default function CircularProgressRing({
  pct,
  correct,
  total,
  strokeColor = "#ffffff",
  trackColor  = "rgba(255,255,255,0.20)",
  textColor   = "#ffffff",
}: CircularProgressRingProps) {
  // CIRCUMF = fully empty ring, 0 = fully filled ring
  const dashOffset = useSharedValue(CIRCUMF);

  useEffect(() => {
    const target = CIRCUMF * (1 - pct / 100);
    dashOffset.value = withDelay(1000,(withTiming(target, {duration:1000,easing: Easing.out(Easing.cubic),})));
  }, [pct]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
  }));

  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" }}>
      <Svg
        width={SIZE}
        height={SIZE}
        style={{ position: "absolute" }}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
      >
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={trackColor}
          strokeWidth={STROKE_W}
          fill="transparent"
        />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={strokeColor}
          strokeWidth={STROKE_W}
          fill="transparent"
          strokeDasharray={CIRCUMF}
          animatedProps={animatedProps}
          strokeLinecap="round"
          // SVG circles start drawing at 3 o'clock — rotate -90° so the
          // fill starts from the top instead.
          transform={`rotate(-90, ${SIZE / 2}, ${SIZE / 2})`}
        />
      </Svg>

      <View style={{ alignItems: "center" }}>
        <Text style={{ color: textColor, fontSize: 30, fontWeight: "900" }}>
          {pct}%
        </Text>
        <Text style={{ color: textColor, fontSize: 11, fontWeight: "700", opacity: 0.7 }}>
          {correct}/{total}
        </Text>
      </View>
    </View>
  );
}
