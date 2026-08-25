import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { BattleAnswerProgress } from "@/types/battleModuleTypes";

interface BattleProgressBarProps {
  label: string;
  count: number;
  currentIndex: number;
  answers: BattleAnswerProgress[];
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

function Segment({ state }: { state: SegmentState }) {
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
      className={`flex-1 h-2 rounded-full ${SEGMENT_CLASS[state]}`}
      style={state === "current" ? pulseStyle : undefined}
    />
  );
}

export default function BattleProgressBar({ label, count, currentIndex, answers }: BattleProgressBarProps) {
  return (
    <View className="mb-1.5">
      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</Text>
      <View className="flex-row gap-1">
        {Array.from({ length: count }, (_, i) => (
          <Segment key={i} state={segmentState(i, currentIndex, answers)} />
        ))}
      </View>
    </View>
  );
}
