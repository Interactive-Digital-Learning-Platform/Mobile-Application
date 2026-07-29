/**
 * QuizStatusScreen.tsx
 * ─────────────────────────
 * Animated loading screen shown while a quiz is being generated or an
 * existing session is being retrieved. Parameterized by `title` and `steps`
 * so both cases share one implementation instead of two near-identical copies.
 */

import { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import type { LucideIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

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
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function QuizStatusScreen({
  title,
  steps,
  subject,
  difficulty,
}: QuizStatusScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const rotation = useSharedValue(0);
  const pulse    = useSharedValue(1);

  useEffect(() => {
    // Animate 0→1 (not 0→360) so each repeat cycle starts cleanly from 0.
    // withRepeat resets to the animation's start value on each cycle;
    // if start==end (e.g. 360→360 after first cycle) nothing moves.
    rotation.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 700 }),
        withTiming(1,    { duration: 700 })
      ),
      -1,
      true
    );

    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 1800);

    return () => {
      cancelAnimation(rotation);
      cancelAnimation(pulse);
      clearInterval(interval);
    };
  }, [steps.length]);

  const spinStyle  = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 360}deg` }],
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
        {/* Ring + icon: fixed 180×180 box so absolute ring has real bounds */}
        <View style={{ width: 180, height: 180, justifyContent: "center", alignItems: "center" }}>
          {/* Rotating ring — absolutely fills the 180×180 box */}
          <Animated.View style={[spinStyle, { position: "absolute", width: 180, height: 180 }]}>
            <View
              style={{
                width: 180,
                height: 180,
                borderRadius: 90,
                borderWidth: 8,
                borderColor: "rgba(255,255,255,0.2)",
                borderTopColor: "#ffffff",
              }}
            />
          </Animated.View>

          {/* Pulsing centre icon */}
          <Animated.View
            style={pulseStyle}
            className="w-[100px] h-[100px] rounded-full bg-white/20 justify-center items-center border-2 border-white/40"
          >
            <StepIcon size={42} color="#fff" strokeWidth={1.5} />
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
