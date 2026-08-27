import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";

// Plain white screen header shared by the lab tab's sub-screens (Practicals, History) — matches
// the quiz tab's header treatment (bg-white, slate-100 pill back button, black slate title).
// The lab dashboard uses its own orange hero instead.
export default function LabHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3 bg-white">
      <TouchableOpacity
        className="w-9 h-9 rounded-full bg-slate-100 justify-center items-center"
        activeOpacity={0.7}
        onPress={() => router.back()}
      >
        <ChevronLeft size={18} color={ICON_COLORS.slate500} strokeWidth={2.5} />
      </TouchableOpacity>

      <View className="flex-1">
        <Text className="text-base font-black text-slate-800" numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && <Text className="text-[11px] font-medium text-slate-400 mt-0.5">{subtitle}</Text>}
      </View>

      {right}
    </View>
  );
}
