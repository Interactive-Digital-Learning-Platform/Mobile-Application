/**
 * QuizStatusScreen.tsx
 * ─────────────────────────
 * Animated loading screen shown while a quiz is being generated or an
 * existing session is being retrieved. Parameterized by `title` and `steps`
 * so both cases share one implementation instead of two near-identical copies.
 *
 * No back button here on purpose — this screen is a transient in-flight
 * state, not a dead end. If generation/retrieval fails, the flow lands on
 * QuizErrorScreen instead, which is where the way out belongs.
 *
 * The ring is tied to the REAL request state via `isComplete`, not a fixed
 * timer — there's no server-side progress percentage to report (generation
 * is one opaque network call), so while `isComplete` is false the ring
 * climbs toward (but never reaches) 92% with a decelerating curve, the
 * standard "still working" pattern for an operation of unknown duration.
 * The instant `isComplete` flips true it snaps the rest of the way to 100%,
 * and `onComplete` — fired only once that snap animation actually
 * finishes — is the caller's cue to swap away to the real quiz UI. This
 * keeps the ring and the screen transition in sync instead of the ring
 * being cut off mid-fill at a random point, which is what happened when it
 * ran on its own fixed-duration loop independent of the real request.
 */

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

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuizStatusStep {
  icon: LucideIcon;
  text: string;
}

interface QuizStatusScreenProps {
  title: string;
  steps: QuizStatusStep[];
  subject: string;
  difficulty: string;
  /** True once the real generation/retrieval call has actually succeeded. */
  isComplete: boolean;
  /** Fires once the ring's fill-to-100% animation visually finishes — this
   *  is when the caller should swap away to the real quiz UI. */
  onComplete: () => void;
}

// ── Ring geometry ─────────────────────────────────────────────────────────────

const RING_SIZE = 180;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// How far the ring climbs on its own while still waiting for a real result —
// deliberately short of 100% so it never falsely claims to be done.
const PENDING_CAP = 0.92;
const PENDING_CLIMB_MS = 20000;
const COMPLETE_SNAP_MS = 350;

// ── Component ─────────────────────────────────────────────────────────────────

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

  // Step icon/text rotation — purely cosmetic reassurance, not tied to any
  // real backend milestone (the generation call has no sub-step reporting).
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

  // The ring itself — climbs toward PENDING_CAP while waiting, snaps to 100%
  // and reports back only once the real result has actually arrived.
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

  // Mirrors the ring's actual animated value into a JS-rendered percentage,
  // so the number on screen can never drift from what the ring is showing.
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
    <SafeAreaView edges={["top"]} style={{ flex: 1 }} className="bg-primary">
      <LinearGradient
        colors={["#FC6E20", "#FF8F30"]}
        style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 32, paddingHorizontal: 32 }}
      >
        {/* Ring + icon: fixed box so the absolutely-positioned SVG ring has real bounds */}
        <View style={{ width: RING_SIZE, height: RING_SIZE, justifyContent: "center", alignItems: "center" }}>
          <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: "absolute" }}>
            <Circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
              stroke="rgba(255,255,255,0.2)" strokeWidth={RING_STROKE} fill="transparent"
            />
            <AnimatedCircle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
              stroke="#ffffff" strokeWidth={RING_STROKE} fill="transparent"
              strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
              strokeLinecap="round"
              animatedProps={ringProps}
              transform={`rotate(-90, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}
            />
          </Svg>

          {/* Pulsing centre content: step icon + fill percentage */}
          <Animated.View
            style={pulseStyle}
            className="w-[100px] h-[100px] rounded-full bg-white/20 justify-center items-center border-2 border-white/40"
          >
            <StepIcon size={30} color="#fff" strokeWidth={1.8} />
            <Text className="text-white text-base font-black mt-1">{percent}%</Text>
          </Animated.View>
        </View>

        {/* Title + subject/difficulty */}
        <View style={{ alignItems: "center" }}>
          <Text className="text-white text-2xl font-black text-center">
            {title}
          </Text>
          <Text className="text-white/70 text-sm mt-1 font-semibold text-center">
            {subject} · {difficulty}
          </Text>
        </View>

        {/* Animated step pill */}
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

        {/* Dot indicator */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === stepIndex ? 24 : 8,
                height: 8,
                borderRadius: 99,
                backgroundColor: i === stepIndex ? "#fff" : "rgba(255,255,255,0.4)",
              }}
            />
          ))}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}
