import { useEffect } from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useCountUp } from "@/hooks/lab/use-count-up";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 150;
const STROKE = 11;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMF = 2 * Math.PI * RADIUS;

// The hero's animated score ring — <score>/100 with an easing fill + count-up (spec §1).
// `score` is read straight from the report; nothing here recomputes it.
export default function ReportScoreRing({
  score,
  ringColor,
  trackColor,
  scoreTextClass,
}: {
  score: number;
  ringColor: string;
  trackColor: string;
  scoreTextClass: string;
}) {
  const reduceMotion = useReducedMotion();
  const pct = Math.max(0, Math.min(100, score));
  const dashOffset = useSharedValue(reduceMotion ? CIRCUMF * (1 - pct / 100) : CIRCUMF);
  const count = useCountUp(pct);

  useEffect(() => {
    const target = CIRCUMF * (1 - pct / 100);
    dashOffset.value = reduceMotion
      ? target
      : withDelay(250, withTiming(target, { duration: 950, easing: Easing.out(Easing.cubic) }));
  }, [pct, reduceMotion, dashOffset]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: dashOffset.value }));

  return (
    <View
      style={{ width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" }}
      accessibilityRole="image"
      accessibilityLabel={`Final score ${pct} out of 100`}
    >
      <Svg width={SIZE} height={SIZE} style={{ position: "absolute" }} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={trackColor} strokeWidth={STROKE} fill="transparent" />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={ringColor}
          strokeWidth={STROKE}
          fill="transparent"
          strokeDasharray={CIRCUMF}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90, ${SIZE / 2}, ${SIZE / 2})`}
        />
      </Svg>

      <View className="items-center">
        <View className="flex-row items-end">
          <Text className={`text-[40px] leading-[44px] font-black ${scoreTextClass}`}>{count}</Text>
          <Text className="text-[15px] font-bold text-slate-400 mb-1.5 ml-0.5">/100</Text>
        </View>
        <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">Final Score</Text>
      </View>
    </View>
  );
}
