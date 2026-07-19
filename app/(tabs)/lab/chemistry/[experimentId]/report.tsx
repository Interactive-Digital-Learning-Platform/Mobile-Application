import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/colors";
import { useSessionReport } from "@/hooks/use-lab-session";
import CustomButton from "@/components/CustomButton";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View className="mt-5">
    <Text className="text-lg font-amedium mb-2" style={{ color: colors.primaryBlack }}>
      {title}
    </Text>
    {children}
  </View>
);

export default function Report() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { data: report, isLoading, isError, refetch } = useSessionReport(sessionId);

  if (isError) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white px-8" edges={["bottom"]}>
        <Text className="text-lg font-amedium text-center" style={{ color: colors.primaryBlack }}>
          Couldn&apos;t reach the server
        </Text>
        <Pressable onPress={() => refetch()} className="mt-4 px-6 py-3 rounded-xl" style={{ backgroundColor: colors.primaryBlack }}>
          <Text className="text-white font-amedium">Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (isLoading || !report) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white" edges={["bottom"]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="w-full flex-1 bg-white" edges={["bottom"]}>
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <View className="mt-4 p-4 rounded-2xl" style={{ backgroundColor: colors.backgroundLight }}>
          <Text className="text-2xl font-amedium" style={{ color: colors.primaryBlack }}>
            {report.experimentName}
          </Text>
          <Text className="font-aregular text-[#979797] mt-1">{report.subject} Practical</Text>
          <View className="flex-row justify-between mt-3">
            <Text className="font-amedium">Score: {report.score}%</Text>
            <Text className="font-amedium">Time: {Math.round(report.totalTime / 60)} min</Text>
          </View>
        </View>

        <Section title="Final Understanding Assessment">
          <Text className="font-aregular text-[#979797]">{report.finalUnderstandingAssessment}</Text>
        </Section>

        <Section title="AI Feedback">
          <Text className="font-aregular text-[#979797]">{report.aiFeedback.summary}</Text>
        </Section>

        {report.conceptsToImprove.length > 0 && (
          <Section title="Concepts to Improve">
            {report.conceptsToImprove.map((c, i) => (
              <Text key={i} className="font-aregular text-[#979797]">• {c}</Text>
            ))}
          </Section>
        )}

        {report.errorsDetected.conceptual.length > 0 && (
          <Section title="Errors Detected">
            {report.errorsDetected.conceptual.map((e, i) => (
              <View key={i} className="mb-2">
                <Text className="font-amedium text-red-800">{e.description}</Text>
                <Text className="font-aregular text-[#979797]">{e.correctionStrategy}</Text>
              </View>
            ))}
          </Section>
        )}

        <Section title="Procedure Followed">
          {report.procedureFollowed.map((s) => (
            <Text key={s.stepId} className="font-aregular text-[#979797] mb-1">
              {s.stepId}. {s.title}
            </Text>
          ))}
        </Section>

        <Section title="Equipment Used">
          <Text className="font-aregular text-[#979797]">
            {report.equipmentUsed.length > 0 ? report.equipmentUsed.join(", ") : "None logged"}
          </Text>
        </Section>

        <Section title="Chemicals Used">
          <Text className="font-aregular text-[#979797]">
            {report.chemicalsUsed.map((c) => c.name).join(", ") || "None logged"}
          </Text>
        </Section>

        <Section title="Expected Observations">
          {report.observations.map((o, i) => (
            <Text key={i} className="font-aregular text-[#979797]">• {o}</Text>
          ))}
        </Section>

        <View className="h-8" />
      </ScrollView>

      <View className="p-4">
        <CustomButton title="Back to Practicals" handlePress={() => router.replace("/(tabs)/lab/chemistry" as never)} />
      </View>
    </SafeAreaView>
  );
}
