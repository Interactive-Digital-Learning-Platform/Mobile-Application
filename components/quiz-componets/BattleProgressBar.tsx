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
  // "dark": for a coloured backdrop (the match screen's orange header) -- light label, translucent-dark empty
  // segments and a white current segment. Answer colours are the same in both tones.
  tone?: "light" | "dark";
}

type SegmentState = "correct" | "incorrect" | "skipped" | "current" | "pending";

function segmentState(order: number, currentIndex: number, answers: BattleAnswerProgress[]): SegmentState {
  const answer = answers.find((a) => a.question_order === order);
  if (answer) {
    // Every graded slot gets an entry now, including ones this participant
    // never actually submitted anything for -- `answered` distinguishes
    // that ("skipped", yellow) from an actual wrong answer ("incorrect", red).
    if (!answer.answered) return "skipped";
    return answer.is_correct ? "correct" : "incorrect";
  }
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

const DARK_SEGMENT_CLASS: Record<SegmentState, string> = {
  ...SEGMENT_CLASS,
  correct: "bg-emerald-400",
  current: "bg-white",
  pending: "bg-black/20",
};

function Segment({ state, size, tone }: { state: SegmentState; size: "md" | "sm"; tone: "light" | "dark" }) {
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
      className={`flex-1 rounded-full ${size === "sm" ? "h-1" : "h-2"} ${
        (tone === "dark" ? DARK_SEGMENT_CLASS : SEGMENT_CLASS)[state]
      }`}
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
  tone = "light",
}: BattleProgressBarProps) {
  return (
    <View className="mb-1.5">
      <Text
        className={`font-bold uppercase tracking-wide mb-1 ${tone === "dark" ? "text-white/80" : "text-slate-400"} ${
          size === "sm" ? "text-[9px]" : "text-[10px]"
        }`}
      >
        {label}
      </Text>
      <View className="flex-row gap-1">
        {Array.from({ length: count }, (_, i) => (
          <Segment key={i} state={segmentState(i, currentIndex, answers)} size={size} tone={tone} />
        ))}
      </View>
    </View>
  );
}
