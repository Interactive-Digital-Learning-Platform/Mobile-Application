import { Text, View } from "react-native";
import { ChevronRight, Clock } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { formatGradeRange } from "@/constants/lab/experiment.constants";
import { ConceptVisualizationCardProps } from "@/types/lab";
import Card from "@/components/ui/Card";
import DifficultyBadge from "@/components/quiz-componets/DifficultyBadge";
import BiologyThumbnail from "./BiologyThumbnail";

const topicTone = (animationKey: string) => {
  if (animationKey === "water_cycle") return "bg-blue-50 text-blue-700";
  if (animationKey === "photosynthesis") return "bg-lime-50 text-lime-700";
  if (animationKey === "gas_exchange") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
};

export default function ConceptVisualizationCard({ visualization, onPress }: ConceptVisualizationCardProps) {
  const gradeRange = formatGradeRange(visualization.grades);
  const durationLabel = `${Math.round(visualization.durationSec / 60) || 1} min`;

  return (
    <Card onPress={onPress} haptic padding="sm" className="rounded-3xl border border-slate-100 bg-white shadow-sm shadow-black/10">
      <View className="flex-row gap-3.5">
        <View className="h-[142px] w-[112px] overflow-hidden rounded-[22px]">
          <BiologyThumbnail animationKey={visualization.animationKey} color={visualization.thumbnailColor} />
        </View>

        <View className="min-w-0 flex-1 py-1">
          <View className="flex-row items-start gap-2">
            <View className="min-w-0 flex-1">
              <Text className="text-[17px] font-black leading-[21px] text-slate-900" numberOfLines={2}>
                {visualization.title}
              </Text>
              {!!gradeRange && <Text className="mt-1 text-[12px] font-bold text-slate-500">{gradeRange}</Text>}
            </View>
            <View className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
              <ChevronRight size={19} color={ICON_COLORS.slate800} strokeWidth={2.5} />
            </View>
          </View>

          <Text className="mt-2 text-[12px] leading-[17px] text-slate-600" numberOfLines={3}>
            {visualization.description}
          </Text>

          <View className="mt-2.5 flex-row items-center gap-2">
            <DifficultyBadge difficulty={visualization.difficulty} />
            <View className="flex-row items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
              <Clock size={11} color={ICON_COLORS.slate400} strokeWidth={2} />
              <Text className="text-[11px] font-semibold text-slate-500">{durationLabel}</Text>
            </View>
          </View>

          <View className={`mt-2 self-start rounded-full px-2.5 py-1 ${topicTone(visualization.animationKey).split(" ")[0]}`}>
            <Text
              className={`text-[10px] font-bold ${topicTone(visualization.animationKey).split(" ")[1]}`}
              numberOfLines={1}
            >
              {visualization.syllabusTopic}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}
