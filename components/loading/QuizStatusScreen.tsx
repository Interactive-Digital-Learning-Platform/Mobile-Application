// Shared "generating / retrieving quiz" screen — same UI, different title
// and steps depending on the caller. The progress ring is driven by real
// request state (`isComplete`), not a fixed timer: since there's no real
// progress percentage to report, it creeps toward 92% while waiting and
// only snaps to 100% once the request actually finishes, then calls
// `onComplete` so the caller can swap to the real quiz UI in sync with the
// ring instead of cutting the animation off mid-fill.
import { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useAnimatedReaction,
  withSequence,
  withTiming,
  withRepeat,
  cancelAnimation,
  runOnJS,
  Easing,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import type { LucideIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ICON_COLORS } from "@/constants/quizStyles";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface QuizStatusStep {
  icon: LucideIcon;
  text: string;
}

interface QuizStatusScreenProps {
  title: string;
  steps: QuizStatusStep[];
  subject: string;
  difficulty: string;
  isComplete: boolean;
  onComplete: () => void;
}

const RING_SIZE = 180;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const PENDING_CAP = 0.92;
const PENDING_CLIMB_MS = 20000;
const COMPLETE_SNAP_MS = 350;

export default function QuizStatusScreen({
  title,
  steps,
  subject,
  difficulty,
  isComplete,
  onComplete,
}: QuizStatusScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [percent, setPercent] = useState(0);
  const fill  = useSharedValue(0);
  const pulse = useSharedValue(1);

  // Just cosmetic — steps rotate on a timer, not tied to any real backend milestone.
  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 1800);
    return () => clearInterval(stepTimer);
  }, [steps.length]);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 700 }),
        withTiming(1,    { duration: 700 })
      ),
      -1,
      true
    );
    return () => cancelAnimation(pulse);
  }, []);

  useEffect(() => {
    cancelAnimation(fill);
    if (isComplete) {
      fill.value = withTiming(
        1,
        { duration: COMPLETE_SNAP_MS, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(onComplete)();
        }
      );
    } else {
      fill.value = withTiming(PENDING_CAP, {
        duration: PENDING_CLIMB_MS,
        easing: Easing.out(Easing.cubic),
      });
    }
    return () => cancelAnimation(fill);
  }, [isComplete]);

  // Mirrors the ring's animated value into JS state so the % text can't drift from it.
  useAnimatedReaction(
    () => Math.round(fill.value * 100),
    (current, previous) => {
      if (current !== previous) runOnJS(setPercent)(current);
    }
  );

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - fill.value),
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const { icon: StepIcon, text } = steps[stepIndex];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-primary">
      <LinearGradient
        colors={[ICON_COLORS.primary500, "#FF8F30"]}
        style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 32, paddingHorizontal: 32 }}
      >
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

          <Animated.View
            style={pulseStyle}
            className="w-[100px] h-[100px] rounded-full bg-white/20 justify-center items-center border-2 border-white/40"
          >
            <StepIcon size={30} color={ICON_COLORS.white} strokeWidth={1.8} />
            <Text className="text-white text-base font-black mt-1">{percent}%</Text>
          </Animated.View>
        </View>

        <View className="items-center">
          <Text className="text-white text-2xl font-black text-center">
            {title}
          </Text>
          <Text className="text-white/70 text-sm mt-1 font-semibold text-center">
            {subject} · {difficulty}
          </Text>
        </View>

        <Animated.View
          key={stepIndex}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          className="bg-white/20 px-6 py-3 rounded-2xl"
        >
          <Text className="text-white text-sm font-semibold text-center">
            {text}
          </Text>
        </Animated.View>

        <View className="flex-row gap-2">
          {steps.map((_, i) => (
            <View
              key={i}
              className={`h-2 rounded-full ${i === stepIndex ? "w-6 bg-white" : "w-2 bg-white/40"}`}
            />
          ))}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}
