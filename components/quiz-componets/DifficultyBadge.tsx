/**
 * DifficultyBadge.tsx
 * ─────────────────────────────────────────────────────────────
 * Reusable pill badge that shows a difficulty level. Accepts any casing
 * (e.g. the backend's lowercase "easy"/"medium"/"hard") and normalizes it.
 * Used in QuizPracticeCard, QuizDetailSheet, and the Profile analytics screen.
 *
 * Usage:
 *   <DifficultyBadge difficulty="Hard" />
 *   <DifficultyBadge difficulty="easy" size="lg" />
 *   <DifficultyBadge difficulty={subject.current_difficulty} size="xs" showDot={false} />
 */
import { View, Text } from "react-native";
import { getDifficultyStyle } from "@/constants/quizStyles";
import { capitalize } from "@/constants/quizHelpers";

interface DifficultyBadgeProps {
  difficulty: string;
  /** "sm" (default) = text-[11px], "lg" = text-xs, "xs" = text-[9px] */
  size?: "sm" | "lg" | "xs";
  /** Show the coloured dot indicator (default true) */
  showDot?: boolean;
}

export default function DifficultyBadge({
  difficulty,
  size = "sm",
  showDot = true,
}: DifficultyBadgeProps) {
  const s = getDifficultyStyle(difficulty);
  const textSize = size === "lg" ? "text-xs" : size === "xs" ? "text-[9px]" : "text-[11px]";

  return (
    <View
      className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full self-start ${s.bg}`}
    >
      {showDot && <View className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />}
      <Text className={`${textSize} font-semibold ${s.text}`}>{capitalize(difficulty)}</Text>
    </View>
  );
}
