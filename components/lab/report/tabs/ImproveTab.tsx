import { View } from "react-native";
import { Target } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { LabReportType, ReportInsights } from "@/types/lab";
import { SectionHeading, EmptyNote } from "../primitives";
import LearningMissionCard from "../LearningMissionCard";
import MisconceptionInsightCard from "../MisconceptionInsightCard";
import ReportErrorAccordion from "../ReportErrorAccordion";
import StudyResourceCard from "../StudyResourceCard";
import PersonalizedNoteCard from "../PersonalizedNoteCard";

// Tab 3 — the concrete "what to practise next" actions, ending in the Generate Note step.
export default function ImproveTab({
  report,
  insights,
  sessionId,
  experimentId,
}: {
  report: LabReportType;
  insights: ReportInsights;
  sessionId: string;
  experimentId: string;
}) {
  return (
    <View className="gap-4 pt-4">
      <View>
        <SectionHeading title="Learning Missions" icon={Target} iconColor={ICON_COLORS.primary500} />
        {insights.missions.length > 0 ? (
          <View className="gap-2">
            {insights.missions.map((m) => (
              <LearningMissionCard key={m.key} mission={m} />
            ))}
          </View>
        ) : (
          <EmptyNote>No specific practice areas were flagged — revisit the textbook reference below to consolidate.</EmptyNote>
        )}
      </View>

      {report.misconceptionInsight && report.misconceptionInsight.items.length > 0 && (
        <MisconceptionInsightCard insight={report.misconceptionInsight} />
      )}

      <ReportErrorAccordion errors={insights.errors} />

      <StudyResourceCard report={report} />

      <PersonalizedNoteCard
        sessionId={sessionId}
        experimentId={experimentId}
        experimentName={report.experimentName}
      />
    </View>
  );
}
