import { View, Text } from "react-native";
import { Lightbulb, ArrowRight } from "lucide-react-native";
import type { Recommendation } from "@/types/quizModuleTypes";
import { filterTestSubjects } from "@/constants/quizHelpers";
import { ICON_COLORS } from "@/constants/quizStyles";
import SectionHeader from "./SectionHeader";
import EmptyState from "./EmptyState";

interface RecommendationsSectionProps {
  recommendations?: Recommendation[];
}

const MAX_RECOMMENDATIONS = 3;

export default function RecommendationsSection({ recommendations }: RecommendationsSectionProps) {
  // priority 1 = most important, so ascending sort puts the top pick first
  const visible = filterTestSubjects(recommendations ?? [])
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .slice(0, MAX_RECOMMENDATIONS);

  return (
    <View className="bg-white rounded-[18px] p-3.5 border border-slate-100 shadow-sm shadow-black/5 mb-3">
      <SectionHeader icon={Lightbulb} label="Recommendations" />

      {visible.length > 0 ? (
        <View className="gap-2.5">
          {visible.map((rec, index) => (
            <View
              key={`${rec.subject ?? "general"}-${rec.topic ?? "general"}-${index}`}
              className="bg-primary-50 rounded-[14px] p-3 border border-primary-100"
            >
              <View className="flex-row items-center gap-1.5 mb-1.5">
                <View className="w-5 h-5 rounded-full bg-primary-500 items-center justify-center">
                  <Text className="text-white text-[11px] font-black">{index + 1}</Text>
                </View>
                <Text className="text-xs font-extrabold text-slate-800" numberOfLines={1}>
                  {[rec.subject, rec.topic].filter(Boolean).join(" · ") || "General"}
                </Text>
              </View>
              <Text className="text-xs text-slate-600 leading-[17px] mb-2">
                {rec.reason}
              </Text>
              <View className="flex-row items-center gap-1">
                <ArrowRight size={13} color={ICON_COLORS.primary600} strokeWidth={2.5} />
                <Text className="text-xs font-bold text-primary-600 shrink">
                  {rec.recommended_action}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState icon={Lightbulb} message="Personalized recommendations will appear here as you take more quizzes." />
      )}
    </View>
  );
}
