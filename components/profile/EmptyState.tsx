import { View, Text } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
}

export default function EmptyState({ icon: Icon, message }: EmptyStateProps) {
  return (
    <View className="items-center py-5 px-3">
      <Icon size={22} color={ICON_COLORS.primary300} strokeWidth={1.8} />
      <Text className="text-slate-400 text-xs text-center mt-2 leading-[17px]">
        {message}
      </Text>
    </View>
  );
}
