import { View } from "react-native";
import { LabReportType, ReportInsights } from "@/types/lab";
import ReportQuickInsights from "../ReportQuickInsights";
import UnderstandingMeterCard from "../UnderstandingMeterCard";
import StudentAchievementCard from "../StudentAchievementCard";
import ChallengeInsightCard from "../ChallengeInsightCard";
import AITutorReviewCard from "../AITutorReviewCard";

// Tab 1 — everything the student should grasp in the first few seconds (spec §17). The score /
// performance / time / active-time live in the persistent hero above the tabs.
export default function OverviewTab({
  report,
  insights,
}: {
  report: LabReportType;
  insights: ReportInsights;
}) {
  return (
    <View className="gap-3.5 pt-3.5">
      <ReportQuickInsights insights={insights.quickInsights} />
      <UnderstandingMeterCard understanding={insights.understanding} />
      <StudentAchievementCard achievements={insights.achievements} />
      {insights.challengeInsight && <ChallengeInsightCard insight={insights.challengeInsight} />}
      {report.aiFeedback?.summary && (
        <AITutorReviewCard
          highlights={insights.tutorHighlights}
          summarySentences={insights.tutorSummarySentences}
          fullReview={report.aiFeedback.summary}
        />
      )}
    </View>
  );
}
