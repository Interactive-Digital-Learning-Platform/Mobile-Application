import { Text, View } from "react-native";
import { FlaskConical } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import Card from "@/components/ui/Card";
import { PracticalHistoryListItemProps } from "@/types/lab";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// Quiz-tab score-pill palette: emerald / amber / rose 100-700 tiers.
const scorePill = (score: number) =>
  score >= 76
    ? { bg: "bg-emerald-100", text: "text-emerald-700" }
    : score >= 51
      ? { bg: "bg-amber-100", text: "text-amber-700" }
      : { bg: "bg-rose-100", text: "text-rose-700" };

export default function PracticalHistoryListItem({ item, onPress }: PracticalHistoryListItemProps) {
  // experimentId can be null if the practical it points to was deleted/re-seeded after this
  // session was recorded — render a neutral placeholder rather than crashing.
  const experiment = item.experimentId ?? { title: "Practical no longer available", subject: "" };
  const pill = scorePill(item.score);

  return (
    <Card onPress={onPress} haptic className="border border-slate-100 shadow-black/10">
      <View className="flex-row items-start gap-3">
        <View className="w-11 h-11 rounded-xl bg-slate-50 justify-center items-center mt-0.5">
          <FlaskConical size={20} color={ICON_COLORS.slate500} strokeWidth={1.8} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
            {experiment.title}
          </Text>
          {!!experiment.subject && (
            <Text className="text-[11px] font-medium text-slate-400 mt-0.5">{experiment.subject}</Text>
          )}
          <View className="flex-row items-center gap-2 mt-2">
            <View className={`px-2 py-0.5 rounded-full ${pill.bg}`}>
              <Text className={`text-[11px] font-bold ${pill.text}`}>{item.score}%</Text>
            </View>
            <Text className="text-[10px] font-medium text-slate-400">{formatDate(item.createdAt)}</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}
