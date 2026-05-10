/**
 * CircularProgressRing.tsx
 * ─────────────────────────────────────────────────────────────────────
 * An animated SVG ring that fills clockwise from the top according to
 * a 0-100 accuracy percentage. The score text is rendered on top.
 *
 * Uses react-native-svg + react-native-reanimated for a smooth entrance.
 */
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
  /** 0–100 accuracy percentage */
  pct: number;
  /** Number of correct answers */
  correct: number;
  /** Total questions */
  total: number;
  /** Stroke colour for the filled arc (e.g. "#fff") */
  strokeColor?: string;
  /** Stroke colour for the track (background arc) */
  trackColor?: string;
  /** Text colour for the percentage label */
  textColor?: string;
}

const SIZE        = 136;   // px — outer SVG canvas
const STROKE_W    = 9;     // ring thickness
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
  // strokeDashoffset: CIRCUMF = empty ring, 0 = full ring
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
      {/* SVG ring */}
      <Svg
        width={SIZE}
        height={SIZE}
        style={{ position: "absolute" }}
        // Rotate so the gap starts at the top
        viewBox={`0 0 ${SIZE} ${SIZE}`}
      >
        {/* Track (static, faded) */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={trackColor}
          strokeWidth={STROKE_W}
          fill="transparent"
        />
        {/* Filled arc */}
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
          // Start from the top (12 o'clock) by rotating -90°
          transform={`rotate(-90, ${SIZE / 2}, ${SIZE / 2})`}
        />
      </Svg>

      {/* Centre text */}
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
