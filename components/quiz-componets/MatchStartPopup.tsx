import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { BlurView } from "expo-blur";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { Brain, Sparkles, Swords, Zap } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const STEPS = [
  { icon: Swords, text: "Entering the arena…" },
  { icon: Brain, text: "Selecting your questions…" },
  { icon: Zap, text: "Balancing the difficulty…" },
  { icon: Sparkles, text: "Almost ready!" },
];

const RING_SIZE = 130;
const RING_STROKE = 7;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const PENDING_CAP = 0.92;
const PENDING_CLIMB_MS = 20000;

// Blurred "Preparing Match" popup that floats directly on top of VersusIntro
// (no white card -- just the blur itself as the backdrop) -- covers the gap
// between both players readying up and the match's questions actually being
// selected. There's no countdown here: the instant question generation
// finishes, the caller navigates straight to match-session.tsx and this
// unmounts, so the ring just creeps toward 92% for as long as it's shown
// rather than needing its own "complete" state.
export default function MatchStartPopup() {
  const [stepIndex, setStepIndex] = useState(0);
  const [percent, setPercent] = useState(0);
  const fill = useSharedValue(0);

  useEffect(() => {
    const id = setInterval(() => setStepIndex((prev) => (prev + 1) % STEPS.length), 1400);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fill.value = withTiming(PENDING_CAP, { duration: PENDING_CLIMB_MS, easing: Easing.out(Easing.cubic) });
  }, [fill]);

  useAnimatedReaction(
    () => Math.round(fill.value * 100),
    (current, previous) => {
      if (current !== previous) runOnJS(setPercent)(current);
    }
  );

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - fill.value),
  }));

  const { icon: StepIcon, text } = STEPS[stepIndex];

  return (
    <BlurView intensity={35} tint="dark" className="absolute inset-0 items-center justify-center px-10">
      <View className="items-center justify-center" style={{ width: RING_SIZE, height: RING_SIZE }}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: "absolute" }}>
          <Circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
            stroke="rgba(255,255,255,0.2)" strokeWidth={RING_STROKE} fill="transparent"
          />
          <AnimatedCircle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
            stroke={ICON_COLORS.white} strokeWidth={RING_STROKE} fill="transparent"
            strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
            strokeLinecap="round"
            animatedProps={ringProps}
            transform={`rotate(-90, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}
          />
        </Svg>
        <View className="w-[72px] h-[72px] rounded-full bg-white/15 justify-center items-center border-2 border-white/30">
          <StepIcon size={22} color={ICON_COLORS.white} strokeWidth={1.8} />
          <Text className="text-white text-xs font-black mt-1">{percent}%</Text>
        </View>
      </View>

      <Text className="text-white text-lg font-black mt-5 mb-1.5">Preparing Match</Text>
      <Animated.Text
        key={stepIndex}
        entering={FadeIn.duration(250)}
        exiting={FadeOut.duration(150)}
        className="text-white/70 text-xs font-semibold text-center"
      >
        {text}
      </Animated.Text>
    </BlurView>
  );
}
