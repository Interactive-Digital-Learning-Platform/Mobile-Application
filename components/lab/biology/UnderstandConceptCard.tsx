import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Brain, ChevronRight, Sparkles } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import Card from "@/components/ui/Card";

// The "prominent entry point" into AI-generated visualizations — a student who can't find their
// topic in the predefined catalog taps this instead of hitting a dead end.
export default function UnderstandConceptCard({ onPress }: { onPress: () => void }) {
  return (
    <Card onPress={onPress} haptic className="overflow-hidden border border-primary/20 bg-white shadow-sm shadow-primary/10">
      <LinearGradient
        pointerEvents="none"
        colors={["#FFF7F1", "#FFFFFF", "#FFF9F5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
      />
      <Sparkles size={14} color={ICON_COLORS.primary300} style={{ position: "absolute", right: 72, top: 14 }} />
      <View className="flex-row items-center gap-4 py-1">
        <View className="h-[72px] w-[72px] items-center justify-center rounded-full border border-primary/20 bg-white shadow-sm shadow-primary/20">
          <View className="h-[58px] w-[58px] items-center justify-center rounded-full bg-primary/10">
            <Brain size={31} color={ICON_COLORS.primary500} strokeWidth={1.9} />
          </View>
        </View>
        <View className="flex-1">
          <View className="mb-1.5 self-start flex-row items-center gap-1 rounded-full bg-primary/10 px-2 py-1">
            <Sparkles size={11} color={ICON_COLORS.primary500} strokeWidth={2.3} />
            <Text className="text-[9px] font-black uppercase tracking-wide text-primary">AI Lab Assist</Text>
          </View>
          <Text className="text-[17px] font-black text-slate-900">Understand a Concept</Text>
          <Text className="mt-1 text-[12px] font-medium leading-4 text-slate-600" numberOfLines={2}>
            Don&apos;t understand a Biology topic? Ask the lab to explain it visually.
          </Text>
        </View>
        <View className="h-11 w-11 items-center justify-center rounded-full bg-primary">
          <ChevronRight size={22} color={ICON_COLORS.white} strokeWidth={2.7} />
        </View>
      </View>
    </Card>
  );
}
