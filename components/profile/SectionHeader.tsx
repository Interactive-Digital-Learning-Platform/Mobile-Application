import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/AppText";
import type { LucideIcon } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";

interface SectionHeaderProps {
  icon: LucideIcon;
  label: string;
  // Rendered at the far end of the same row (e.g. a count), vertically centred with the title.
  right?: ReactNode;
}

export default function SectionHeader({ icon: Icon, label, right }: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between mb-3.5">
      <View className="flex-row items-center gap-1.5">
        <View className="w-8 h-8 rounded-[10px] bg-primary-100 items-center justify-center">
          <Icon size={14} color={ICON_COLORS.primary500} strokeWidth={2} />
        </View>
        <Text className="text-slate-800 font-black text-xs uppercase tracking-wider">{label}</Text>
      </View>
      {right}
    </View>
  );
}
