import { View, Text } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";

interface SectionHeaderProps {
  icon: LucideIcon;
  label: string;
}

export default function SectionHeader({ icon: Icon, label }: SectionHeaderProps) {
  return (
    <View className="flex-row items-center gap-1.5 mb-3.5">
      <View className="w-8 h-8 rounded-[10px] bg-primary-100 items-center justify-center">
        <Icon size={14} color={ICON_COLORS.primary500} strokeWidth={2} />
      </View>
      <Text className="text-slate-800 font-black text-xs uppercase tracking-wider">{label}</Text>
    </View>
  );
}
