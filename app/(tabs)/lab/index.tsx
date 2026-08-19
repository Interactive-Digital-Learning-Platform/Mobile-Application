import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowRight, BookOpen, ChevronRight, ClipboardList, FlaskConical, Target, Trophy } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { LAB_SUBJECTS } from "@/constants/lab/experiment.constants";
import { useExperimentsBySubject } from "@/hooks/lab/use-experiments";
import { useSessionHistory, useSessionStats } from "@/hooks/lab/use-lab-session";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LabStatCard from "@/components/lab/LabStatCard";
import PracticalHistoryListItem from "@/components/lab/PracticalHistoryListItem";

export default function Lab() {
  const { data: stats } = useSessionStats();
  const { data: inProgress } = useSessionHistory({ status: "in_progress", limit: 1 });
  const { data: recentHistory, isLoading: historyLoading } = useSessionHistory({ status: "completed", limit: 3 });
  const { data: chemistryPracticals, isLoading: chemistryLoading } = useExperimentsBySubject("Chemistry");

  const continueItem = inProgress?.data?.[0] ?? stats?.lastCompletedPractical ?? null;
  const continueExperiment = continueItem?.experimentId?.subject === "Chemistry" ? continueItem.experimentId : null;

  return (
    <SafeAreaView className="w-full flex-1 bg-white" edges={["bottom"]}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-amedium text-ink">Laboratory Dashboard</Text>
        <Text className="font-aregular text-muted mb-5">Welcome back!</Text>

        {/* Performance Overview */}
        <View className="flex-row gap-3 mb-6">
          <LabStatCard label="Best Score" value={stats?.bestScore != null ? `${stats.bestScore}%` : "—"} icon={Trophy} color="#F7A94F" />
          <LabStatCard
            label="Last Practical"
            value={stats?.lastCompletedPractical ? `${stats.lastCompletedPractical.score}%` : "—"}
            subValue={stats?.lastCompletedPractical?.experimentId?.title}
            icon={Target}
            color="#4FA8F7"
          />
          <LabStatCard label="Completed" value={`${stats?.completedCount ?? 0}`} icon={ClipboardList} color="#7CB342" />
        </View>

        {/* Continue Learning */}
        {continueExperiment && continueItem && (
          <View className="mb-6">
            <Text className="text-lg font-amedium text-ink mb-3">Continue Learning</Text>
            <Card onPress={() => router.push(`/(tabs)/lab/${continueExperiment._id}/equipment` as never)}>
              <View className="flex-row items-center gap-3">
                <View
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{ backgroundColor: `${continueExperiment.thumbnailColor}22` }}
                >
                  <FlaskConical size={22} color={continueExperiment.thumbnailColor} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-amedium text-ink" numberOfLines={1}>
                    {continueExperiment.title}
                  </Text>
                  <Text className="font-aregular text-muted text-sm mt-0.5">Last score: {continueItem.score}%</Text>
                </View>
              </View>
              <View className="flex-row items-center justify-end gap-1 mt-3">
                <Text className="font-amedium text-primary">Continue</Text>
                <ArrowRight size={16} color={colors.primary} />
              </View>
            </Card>
          </View>
        )}

        {/* Practical History */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-amedium text-ink">Practical History</Text>
            <Text className="font-amedium text-primary text-sm" onPress={() => router.push("/(tabs)/lab/history" as never)}>
              View all
            </Text>
          </View>

          {historyLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : recentHistory?.data?.length ? (
            <View className="gap-3">
              {recentHistory.data.map((item) => (
                <PracticalHistoryListItem key={item._id} item={item} />
              ))}
            </View>
          ) : (
            <Card variant="outline">
              <Text className="font-aregular text-muted text-center">No completed practicals yet — finish one to see it here.</Text>
            </Card>
          )}
        </View>

        {/* Learn Before You Experiment */}
        <View className="mb-6">
          <Text className="text-lg font-amedium text-ink mb-1">Learn Before You Experiment</Text>
          <Text className="font-aregular text-muted text-sm mb-3">Read the theory before you step into the lab.</Text>

          {chemistryLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View className="gap-3">
              {chemistryPracticals?.map((practical) => (
                <Card
                  key={practical._id}
                  onPress={() => router.push(`/(tabs)/lab/${practical._id}/info` as never)}
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="w-11 h-11 rounded-full items-center justify-center"
                      style={{ backgroundColor: `${practical.thumbnailColor}22` }}
                    >
                      <BookOpen size={20} color={practical.thumbnailColor} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-amedium text-ink" numberOfLines={1}>
                        {practical.title}
                      </Text>
                      <Text className="font-aregular text-muted text-sm mt-0.5">Grades {practical.grades.join("–")}</Text>
                    </View>
                    <ChevronRight size={18} color="#979797" />
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>

        {/* Subject Cards */}
        <Text className="text-lg font-amedium text-ink mb-3">Subjects</Text>
        <View className="gap-4">
          {LAB_SUBJECTS.map(({ key, label, Icon, color, available }) => (
            <Card
              key={key}
              disabled={!available}
              onPress={available ? () => router.push("/(tabs)/lab/practicals" as never) : undefined}
            >
              <View className="flex-row items-center gap-4">
                <View className="w-14 h-14 rounded-full items-center justify-center" style={{ backgroundColor: `${color}22` }}>
                  <Icon size={28} color={color} />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-amedium text-ink">{label}</Text>
                  {available ? (
                    <Text className="font-aregular text-sm text-muted mt-0.5">
                      {chemistryPracticals?.length ?? 0} practicals · Grade 10–11
                    </Text>
                  ) : (
                    <View className="mt-1.5 self-start">
                      <Badge label="Coming soon" tone="neutral" />
                    </View>
                  )}
                </View>
                {available && <ChevronRight size={20} color="#979797" />}
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
