import { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";

export default function BiologyHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-4 bg-white px-4 py-4">
      <TouchableOpacity
        className="h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white shadow-sm shadow-black/10"
        activeOpacity={0.72}
        onPress={onBack ?? (() => router.back())}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ChevronLeft size={24} color={ICON_COLORS.slate800} strokeWidth={2.6} />
      </TouchableOpacity>

      <View className="flex-1">
        <Text className="text-[22px] font-black leading-7 text-slate-900" numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text className="mt-0.5 text-[13px] font-medium leading-[18px] text-slate-500" numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>

      {right}
    </View>
  );
}
