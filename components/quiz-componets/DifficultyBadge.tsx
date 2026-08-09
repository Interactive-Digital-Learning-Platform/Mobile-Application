import { View, Text } from "react-native";
import { getDifficultyStyle } from "@/constants/quizStyles";
import { capitalize } from "@/constants/quizHelpers";

interface DifficultyBadgeProps {
  difficulty: string;
  size?: "sm" | "lg" | "xs";
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
