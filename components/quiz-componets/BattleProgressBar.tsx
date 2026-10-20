import { useEffect } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/AppText";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
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

// No right/wrong colours: a live battle never reveals correctness, so a
// segment only shows how far the player has got.
type SegmentState = "answered" | "skipped" | "current" | "pending";

function segmentState(order: number, currentIndex: number, answers: BattleAnswerProgress[]): SegmentState {
  const answer = answers.find((a) => a.question_order === order);
  if (answer) return answer.answered ? "answered" : "skipped";
  // Moved past but the progress event hasn't landed yet -- still done.
  if (order < currentIndex) return "answered";
  if (order === currentIndex) return "current";
  return "pending";
}

const SEGMENT_CLASS: Record<SegmentState, string> = {
  answered: "bg-sky-500",
  skipped: "bg-amber-400",
  current: "bg-primary",
  pending: "bg-slate-200",
};

const DARK_SEGMENT_CLASS: Record<SegmentState, string> = {
  ...SEGMENT_CLASS,
  answered: "bg-sky-300",
  current: "bg-white",
  pending: "bg-black/20",
};

function Segment({ state, size, tone }: { state: SegmentState; size: "md" | "sm"; tone: "light" | "dark" }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (state !== "current") {
      // Stop the blink and go back to fully solid -- otherwise the segment
      // keeps whatever opacity it was at mid-blink when the player moved on.
      cancelAnimation(pulse);
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
      // Always attached (detaching it left the last animated opacity stuck on
      // the native view); it simply sits at 1 when the segment isn't current.
      style={pulseStyle}
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
