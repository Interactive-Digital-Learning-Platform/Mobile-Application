import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, RotateCcw } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";

// Compact bottom action bar (spec §13). "Try Again" routes to the practical's existing info
// screen — the real start of the practical flow; no route is invented.
export default function ReportBottomActions({ experimentId }: { experimentId: string }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row gap-2.5 px-4 pt-2.5 bg-slate-50 border-t border-slate-100"
      style={{ paddingBottom: Math.max(insets.bottom, 10) }}
    >
      <Pressable
        onPress={() => router.replace("/(tabs)/lab/practicals" as never)}
        className="flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-xl bg-white border border-slate-200 min-h-[48px]"
        accessibilityRole="button"
      >
        <ChevronLeft size={16} color={ICON_COLORS.slate600} strokeWidth={2.4} />
        <Text className="text-slate-700 text-[14px] font-bold">Practicals</Text>
      </Pressable>

      <Pressable
        onPress={() => router.replace(`/(tabs)/lab/${experimentId}/info` as never)}
        className="flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-xl bg-primary min-h-[48px]"
        accessibilityRole="button"
      >
        <RotateCcw size={16} color={ICON_COLORS.white} strokeWidth={2.4} />
        <Text className="text-white text-[14px] font-bold">Try Again</Text>
      </Pressable>
    </View>
  );
}
