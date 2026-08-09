import { View } from "react-native";
import { ClipboardList, ListChecks, CheckCircle2, Percent, Clock } from "lucide-react-native";
import { C, profileStyles as styles } from "./profileTheme";
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
    <View style={[styles.card, { marginBottom: 12 }]}>
      <SectionHeader icon={ClipboardList} label="Performance Summary" />

      {hasAnyData ? (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatTile
              icon={ListChecks}
              iconColor={C.p600}
              iconBg={C.p100}
              label="Attempted"
              value={isPresent(totalQuestionsAttempted) ? totalQuestionsAttempted : "—"}
            />
            <StatTile
              icon={CheckCircle2}
              iconColor="#16A34A"
              iconBg="#DCFCE7"
              label="Correct"
              value={isPresent(totalCorrectAnswers) ? totalCorrectAnswers : "—"}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatTile
              icon={Percent}
              iconColor={C.p600}
              iconBg={C.p100}
              label="Completion"
              value={isPresent(completionRate) ? `${Math.round(completionRate)}%` : "—"}
            />
            <StatTile
              icon={Clock}
              iconColor={C.p600}
              iconBg={C.p100}
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
