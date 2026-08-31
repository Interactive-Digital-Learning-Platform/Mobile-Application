import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { useSessionReport } from "@/hooks/lab/use-lab-session";
import { ReportTabKey } from "@/types/lab";
import { deriveReportInsights } from "@/utils/lab/report";
import ReportPerformanceHero from "@/components/lab/report/ReportPerformanceHero";
import ReportTabSwitcher from "@/components/lab/report/ReportTabSwitcher";
import ReportBottomActions from "@/components/lab/report/ReportBottomActions";
import OverviewTab from "@/components/lab/report/tabs/OverviewTab";
import StepJourneyTab from "@/components/lab/report/tabs/StepJourneyTab";
import ImproveTab from "@/components/lab/report/tabs/ImproveTab";

// The "Lab Achievement Report". A persistent performance hero, then three interactive tabs.
// All values come from the backend report payload via deriveReportInsights — see utils/lab/report.ts
// for the field → component mapping. No score is recalculated and no feedback is generated here.
export default function Report() {
  const { sessionId, experimentId } = useLocalSearchParams<{ sessionId: string; experimentId: string }>();
  const { data: report, isLoading, isError, refetch } = useSessionReport(sessionId);

  const [tab, setTab] = useState<ReportTabKey>("overview");

  const insights = useMemo(() => (report ? deriveReportInsights(report) : null), [report]);

  if (isError) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-slate-50 px-8" edges={["top", "bottom"]}>
        <Text className="text-base font-black text-center text-slate-800">Couldn&apos;t load your report</Text>
        <Pressable className="mt-4 bg-primary px-6 py-3 rounded-xl min-h-[44px] justify-center" onPress={() => refetch()}>
          <Text className="text-white text-sm font-bold">Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (isLoading || !report || !insights) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-slate-50" edges={["top", "bottom"]}>
        <ActivityIndicator color={ICON_COLORS.primary500} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="w-full flex-1 bg-slate-50" edges={["top"]}>
      <View className="flex-row items-center gap-3 px-4 py-2.5">
        <Pressable
          className="w-9 h-9 rounded-full bg-white border border-slate-200 justify-center items-center"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={18} color={ICON_COLORS.slate500} strokeWidth={2.5} />
        </Pressable>
        <Text className="text-[13px] font-black uppercase tracking-wide text-primary">Lab Achievement Report</Text>
      </View>

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <ReportPerformanceHero report={report} insights={insights} />

        <View className="mt-4">
          <ReportTabSwitcher value={tab} onChange={setTab} />
        </View>

        <Animated.View key={tab} entering={FadeIn.duration(200)}>
          {tab === "overview" && <OverviewTab report={report} insights={insights} />}
          {tab === "journey" && <StepJourneyTab report={report} insights={insights} />}
          {tab === "improve" && (
            <ImproveTab
              report={report}
              insights={insights}
              sessionId={sessionId ?? ""}
              experimentId={experimentId ?? ""}
            />
          )}
        </Animated.View>
      </ScrollView>

      <ReportBottomActions experimentId={experimentId ?? ""} />
    </SafeAreaView>
  );
}
