/**
 * DifficultyBadge.tsx
 * ─────────────────────────────────────────────────────────────
 * Reusable pill badge that shows a difficulty level with a
 * coloured dot.  Used in QuizPracticeCard and QuizDetailSheet.
 *
 * Usage:
 *   <DifficultyBadge difficulty="Hard" />
 *   <DifficultyBadge difficulty="Easy" size="lg" />
 */
import { View, Text } from "react-native";
import { DIFFICULTY_STYLES, type Difficulty } from "@/constants/quizStyles";

interface DifficultyBadgeProps {
  difficulty: Difficulty;
  /** "sm" (default) = text-[11px], "lg" = text-xs */
  size?: "sm" | "lg";
}

export default function DifficultyBadge({
  difficulty,
  size = "sm",
}: DifficultyBadgeProps) {
  const s = DIFFICULTY_STYLES[difficulty];
  const textSize = size === "lg" ? "text-xs" : "text-[11px]";

  return (
    <View
      className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full self-start ${s.bg}`}
    >
      <View className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      <Text className={`${textSize} font-semibold ${s.text}`}>{difficulty}</Text>
    </View>
  );
}
