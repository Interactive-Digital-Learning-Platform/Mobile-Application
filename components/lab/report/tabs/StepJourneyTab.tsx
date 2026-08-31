import { View } from "react-native";
import { LabReportType, ReportInsights } from "@/types/lab";
import LabJourneyTimeline from "../LabJourneyTimeline";
import GuidanceImpactCard from "../GuidanceImpactCard";
import TimeBreakdownChart from "../TimeBreakdownChart";

// Tab 2 — the experiment as a journey: per-step scores, timing, guidance usage, retries, and
// expandable task detail.
export default function StepJourneyTab({
  report,
  insights,
}: {
  report: LabReportType;
  insights: ReportInsights;
}) {
  return (
    <View className="gap-4 pt-4">
      <LabJourneyTimeline journey={insights.journey} />
      {insights.guidance && <GuidanceImpactCard guidance={insights.guidance} />}
      <TimeBreakdownChart rows={insights.timeBreakdown} report={report} />
    </View>
  );
}
