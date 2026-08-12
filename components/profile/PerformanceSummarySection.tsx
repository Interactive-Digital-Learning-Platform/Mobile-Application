import { View } from "react-native";
import { ClipboardList, ListChecks, CheckCircle2, Percent, Clock } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import SectionHeader from "./SectionHeader";
import StatTile from "./StatTile";
import EmptyState from "./EmptyState";

interface PerformanceSummarySectionProps {
  totalQuestionsAttempted?: number;
  totalCorrectAnswers?: number;
  completionRate?: number;
  avgResponseTime?: number;
}

function isPresent(value: number | undefined | null): value is number {
  return value !== undefined && value !== null;
}

export default function PerformanceSummarySection({
  totalQuestionsAttempted,
  totalCorrectAnswers,
  completionRate,
  avgResponseTime,
}: PerformanceSummarySectionProps) {
  const hasAnyData =
    isPresent(totalQuestionsAttempted) ||
    isPresent(totalCorrectAnswers) ||
    isPresent(completionRate) ||
    isPresent(avgResponseTime);

  return (
    <View className="bg-white rounded-[18px] p-3.5 border border-slate-100 shadow-sm shadow-black/5 mb-3">
      <SectionHeader icon={ClipboardList} label="Performance Summary" />

      {hasAnyData ? (
        <View className="gap-2.5">
          <View className="flex-row gap-2.5">
            <StatTile
              icon={ListChecks}
              iconColor={ICON_COLORS.primary600}
              iconBgClass="bg-primary-100"
              label="Attempted"
              value={isPresent(totalQuestionsAttempted) ? totalQuestionsAttempted : "—"}
            />
            <StatTile
              icon={CheckCircle2}
              iconColor={ICON_COLORS.emerald600}
              iconBgClass="bg-emerald-100"
              label="Correct"
              value={isPresent(totalCorrectAnswers) ? totalCorrectAnswers : "—"}
            />
          </View>
          <View className="flex-row gap-2.5">
            <StatTile
              icon={Percent}
              iconColor={ICON_COLORS.primary600}
              iconBgClass="bg-primary-100"
              label="Completion"
              value={isPresent(completionRate) ? `${Math.round(completionRate)}%` : "—"}
            />
            <StatTile
              icon={Clock}
              iconColor={ICON_COLORS.primary600}
              iconBgClass="bg-primary-100"
              label="Avg / Question"
              value={isPresent(avgResponseTime) ? `${avgResponseTime.toFixed(1)}s` : "—"}
            />
          </View>
        </View>
      ) : (
        <EmptyState icon={ClipboardList} message="Performance summary will appear once you've completed a quiz." />
      )}
    </View>
  );
}
