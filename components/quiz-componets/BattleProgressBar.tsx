import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { BattleAnswerProgress } from "@/types/battleModuleTypes";

interface BattleProgressBarProps {
  label: string;
  count: number;
  currentIndex: number;
  answers: BattleAnswerProgress[];
  size?: "md" | "sm";
}

type SegmentState = "correct" | "incorrect" | "skipped" | "current" | "pending";

function segmentState(order: number, currentIndex: number, answers: BattleAnswerProgress[]): SegmentState {
  const answer = answers.find((a) => a.question_order === order);
  if (answer) return answer.is_correct ? "correct" : "incorrect";
  if (order < currentIndex) return "skipped";
  if (order === currentIndex) return "current";
  return "pending";
}

const SEGMENT_CLASS: Record<SegmentState, string> = {
  correct: "bg-emerald-500",
  incorrect: "bg-rose-500",
  skipped: "bg-amber-400",
  current: "bg-primary",
  pending: "bg-slate-200",
};

function Segment({ state, size }: { state: SegmentState; size: "md" | "sm" }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (state !== "current") {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(withSequence(withTiming(0.4, { duration: 500 }), withTiming(1, { duration: 500 })), -1, true);
  }, [state, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      className={`flex-1 rounded-full ${size === "sm" ? "h-1" : "h-2"} ${SEGMENT_CLASS[state]}`}
      style={state === "current" ? pulseStyle : undefined}
    />
  );
}

export default function BattleProgressBar({
  label,
  count,
  currentIndex,
  answers,
  size = "md",
}: BattleProgressBarProps) {
  return (
    <View className="mb-1.5">
      <Text
        className={`font-bold text-slate-400 uppercase tracking-wide mb-1 ${
          size === "sm" ? "text-[9px]" : "text-[10px]"
        }`}
      >
        {label}
      </Text>
      <View className="flex-row gap-1">
        {Array.from({ length: count }, (_, i) => (
          <Segment key={i} state={segmentState(i, currentIndex, answers)} size={size} />
        ))}
      </View>
    </View>
  );
}
