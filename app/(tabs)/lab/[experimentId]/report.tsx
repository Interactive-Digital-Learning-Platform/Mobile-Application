import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/colors";
import { useSessionReport } from "@/hooks/lab/use-lab-session";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressSteps from "@/components/ui/ProgressSteps";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="mt-4">
    <Text className="text-lg font-amedium mb-2 text-ink">{title}</Text>
    {children}
  </Card>
);

export default function Report() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { data: report, isLoading, isError, refetch } = useSessionReport(sessionId);

  if (isError) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white px-8" edges={["top", "bottom"]}>
        <Text className="text-lg font-amedium text-center text-ink">Couldn&apos;t reach the server</Text>
        <View className="mt-4 self-stretch">
          <Button label="Retry" onPress={() => refetch()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !report) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white" edges={["top", "bottom"]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="w-full flex-1 bg-white" edges={["top", "bottom"]}>
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <View className="mt-4 p-4 rounded-2xl shadow-sm bg-bg-soft">
          <Text className="text-2xl font-amedium text-ink">{report.experimentName}</Text>
          <Text className="font-aregular text-muted mt-1">{report.subject} Practical</Text>
          <View className="flex-row gap-2 mt-3">
            <Badge label={`Score: ${report.score}%`} tone="primary" />
            <Badge label={`Time: ${Math.round(report.totalTime / 60)} min`} tone="neutral" />
          </View>
        </View>

        {report.practicalReference && (
          <Section title="Textbook Reference">
            <Text className="font-amedium text-ink">
              {report.practicalReference.lessonTitle}
              {report.practicalReference.sectionTitle ? ` — ${report.practicalReference.sectionTitle}` : ""}
            </Text>
            <Text className="font-aregular text-muted mt-0.5">
              {report.practicalReference.bookTitle ? `${report.practicalReference.bookTitle} · ` : ""}
              {report.practicalReference.pageStart
                ? report.practicalReference.pageEnd &&
                  report.practicalReference.pageEnd !== report.practicalReference.pageStart
                  ? `pp. ${report.practicalReference.pageStart}–${report.practicalReference.pageEnd}`
                  : `p. ${report.practicalReference.pageStart}`
                : ""}
            </Text>
          </Section>
        )}

        <Section title="Final Understanding Assessment">
          <Text className="font-aregular text-muted">{report.finalUnderstandingAssessment}</Text>
        </Section>

        <Section title="AI Feedback">
          <Text className="font-aregular text-muted">{report.aiFeedback.summary}</Text>
        </Section>

        {report.conceptsToImprove.length > 0 && (
          <Section title="Concepts to Improve">
            {report.conceptsToImprove.map((c, i) => (
              <Text key={i} className="font-aregular text-muted">• {c}</Text>
            ))}
          </Section>
        )}

        {report.followUpReading && report.followUpReading.length > 0 && (
          <Section title="Follow-up Reading">
            {report.followUpReading.map((r, i) => (
              <View key={i} className={i > 0 ? "mt-2" : undefined}>
                <Text className="font-amedium text-ink">
                  {r.lessonTitle}
                  {r.sectionTitle ? ` — ${r.sectionTitle}` : ""}
                </Text>
                <Text className="font-aregular text-muted">
                  {r.bookTitle ? `${r.bookTitle} · ` : ""}
                  {r.pageStart
                    ? r.pageEnd && r.pageEnd !== r.pageStart
                      ? `pp. ${r.pageStart}–${r.pageEnd}`
                      : `p. ${r.pageStart}`
                    : ""}
                </Text>
              </View>
            ))}
          </Section>
        )}

        {report.errorsDetected.conceptual.length > 0 && (
          <Section title="Errors Detected">
            {report.errorsDetected.conceptual.map((e, i) => (
              <View key={i} className="mb-2">
                <Text className="font-amedium text-red-800">{e.description}</Text>
                <Text className="font-aregular text-muted">{e.correctionStrategy}</Text>
              </View>
            ))}
          </Section>
        )}

        <Section title="Procedure Followed">
          {report.procedureFollowed.length > 0 && (
            <View className="mb-3">
              <ProgressSteps totalSteps={report.procedureFollowed.length} currentStep={report.procedureFollowed.length + 1} />
            </View>
          )}
          {report.procedureFollowed.map((s) => (
            <Text key={s.stepId} className="font-aregular text-muted mb-1">
              {s.stepId}. {s.title}
            </Text>
          ))}
        </Section>

        <Section title="Equipment Used">
          <Text className="font-aregular text-muted">
            {report.equipmentUsed.length > 0 ? report.equipmentUsed.join(", ") : "None logged"}
          </Text>
        </Section>

        <Section title="Chemicals Used">
          <Text className="font-aregular text-muted">
            {report.chemicalsUsed.map((c) => c.name).join(", ") || "None logged"}
          </Text>
        </Section>

        <Section title="Expected Observations">
          {report.observations.map((o, i) => (
            <Text key={i} className="font-aregular text-muted">• {o}</Text>
          ))}
        </Section>

        <View className="h-8" />
      </ScrollView>

      <View className="p-4">
        <Button label="Back to Practicals" onPress={() => router.replace("/(tabs)/lab/practicals" as never)} variant="secondary" />
      </View>
    </SafeAreaView>
  );
}
