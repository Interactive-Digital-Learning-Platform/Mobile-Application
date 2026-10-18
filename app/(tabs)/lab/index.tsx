import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowRight, BookOpen, ChevronRight, FlaskConical } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { LAB_SUBJECTS, formatGradeRange, gradeRangeAcross } from "@/constants/lab/experiment.constants";
import { useExperimentsBySubject } from "@/hooks/lab/use-experiments";
import { useBiologyVisualizations } from "@/hooks/lab/use-biology-visualizations";
import { useSession, useSessionHistory, useSessionStats } from "@/hooks/lab/use-lab-session";
import Card from "@/components/ui/Card";
import PracticalHistoryListItem from "@/components/lab/PracticalHistoryListItem";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Quiz-tab hero stat strip: three cells, divider rules, big primary number over a muted label.
function StatCell({ value, label, divider }: { value: string | number; label: string; divider?: boolean }) {
  return (
    <View className={`flex-1 items-center py-1 ${divider ? "border-l border-slate-200" : ""}`}>
      <Text className="text-2xl font-bold text-primary">{value}</Text>
      <Text className="text-[11px] font-medium text-slate-400 mt-0.5">{label}</Text>
    </View>
  );
}

function SectionHeading({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View className="flex-row items-center justify-between mb-2">
      <Text className="text-base font-bold text-slate-800">{title}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text className="text-xs font-bold text-primary">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function Lab() {
  const { data: stats } = useSessionStats();
  const { data: inProgress } = useSessionHistory({ status: "in_progress", limit: 1 });
  const { data: recentHistory, isLoading: historyLoading } = useSessionHistory({ status: "completed", limit: 3 });
  const { data: chemistryPracticals, isLoading: chemistryLoading } = useExperimentsBySubject("Chemistry");
  // Used purely to show an accurate "N practicals"/"N visualizations" line on each subject card
  // below, distinct from chemistryPracticals above (which also drives the "Learn Before You
  // Experiment" list, Chemistry-only by design). Biology has no equipment/chemical bench flow, so
  // its count comes from the Concept Visualization catalog instead of useExperimentsBySubject.
  const { data: physicsPracticals } = useExperimentsBySubject("Physics");
  const { data: biologyVisualizations } = useBiologyVisualizations();
  const practicalCountBySubject: Record<string, number | undefined> = {
    Chemistry: chemistryPracticals?.length,
    Physics: physicsPracticals?.length,
    Biology: biologyVisualizations?.length,
  };
  // Real curriculum coverage per subject, derived from each catalog's own `grades` metadata —
  // "" while a catalog is still loading, so the card omits the clause rather than showing a guess.
  const gradeRangeBySubject: Record<string, string> = {
    Chemistry: gradeRangeAcross(chemistryPracticals),
    Physics: gradeRangeAcross(physicsPracticals),
    Biology: gradeRangeAcross(biologyVisualizations),
  };
  const availableSubjects = LAB_SUBJECTS.filter((s) => s.available).length;

  // "Continue Learning" prefers a live in-progress session; if there is none, fall back to the
  // most recently completed practical so a returning student still has a one-tap way back in.
  const inProgressItem = inProgress?.data?.[0] ?? null;
  const continueItem = inProgressItem ?? stats?.lastCompletedPractical ?? null;
  // Not subject-gated — a student's most recent session could be any available subject.
  const continueExperiment = continueItem?.experimentId ?? null;
  const ContinueIcon = LAB_SUBJECTS.find((s) => s.key === continueExperiment?.subject)?.Icon || FlaskConical;
  // Only fetches the full session doc when there is an in-progress one — gives us the Main Step
  // progress ("Step 2 of 4") the history/stats payloads don't carry.
  const { data: activeSession } = useSession(inProgressItem?._id);
  const mainStep = activeSession?.currentTask?.mainStep ?? null;
  const stepProgressPct = mainStep ? Math.round((mainStep.order / mainStep.totalMainSteps) * 100) : null;

  const hasProgress = (stats?.completedCount ?? 0) > 0 || stats?.bestScore != null;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-primary">
      {/* Hero */}
      <View className="px-5 pt-2 pb-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-white text-2xl font-bold">Laboratory</Text>
            <Text className="text-white/80 text-sm font-normal mt-0.5">Explore · Experiment · Understand</Text>
          </View>
          <View className="w-[58px] h-[58px] rounded-full bg-white/20 border-2 border-white/40 items-center justify-center">
            <FlaskConical size={24} color={ICON_COLORS.white} strokeWidth={1.8} />
          </View>
        </View>

        {hasProgress && (
          <View className="flex-row bg-white rounded-2xl mt-4 px-2 py-3 shadow-sm shadow-black/10">
            <StatCell value={stats?.completedCount ?? 0} label="Completed" />
            <StatCell value={stats?.bestScore != null ? `${stats.bestScore}%` : "—"} label="Best Score" divider />
            <StatCell value={availableSubjects} label="Subjects" divider />
          </View>
        )}
      </View>

      {/* Content sheet */}
      <View className="flex-1 bg-white rounded-t-[28px]">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Continue Learning — highest priority for a returning student */}
          {continueExperiment && continueItem && (
            <View className="mb-6">
              <SectionHeading title="Continue Learning" />
              <Card
                haptic
                className="border border-slate-100 shadow-black/10"
                onPress={() => router.push(`/(tabs)/lab/${continueExperiment._id}/equipment` as never)}
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-11 h-11 rounded-xl bg-slate-50 items-center justify-center">
                    <ContinueIcon size={20} color={ICON_COLORS.slate500} strokeWidth={1.8} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
                      {continueExperiment.title}
                    </Text>
                    <Text className="text-[11px] font-medium text-slate-400 mt-0.5" numberOfLines={1}>
                      {continueExperiment.subject}
                      {inProgressItem
                        ? mainStep
                          ? ` · Step ${mainStep.order} of ${mainStep.totalMainSteps}`
                          : " · In progress"
                        : ` · Last score ${continueItem.score}%`}
                    </Text>
                  </View>
                </View>

                {stepProgressPct != null && (
                  <View className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-3">
                    <View className="h-full rounded-full bg-primary" style={{ width: `${stepProgressPct}%` }} />
                  </View>
                )}

                <View className="mt-3 py-2.5 rounded-xl items-center bg-primary">
                  <Text className="text-white text-sm font-bold">
                    {inProgressItem ? "Continue experiment" : "Review practical"}
                  </Text>
                </View>
              </Card>
            </View>
          )}

          {/* Explore Laboratories — primary navigation, kept above the theory shortcuts */}
          <SectionHeading title="Explore Laboratories" />
          <View className="gap-3 mb-6">
            {LAB_SUBJECTS.map(({ key, shortLabel, description, Icon, color, available, unitLabel }) => {
              const count = practicalCountBySubject[key];
              const gradeRange = gradeRangeBySubject[key];
              return (
                <Card
                  key={key}
                  haptic
                  disabled={!available}
                  className="border border-slate-100 shadow-black/10"
                  onPress={
                    available
                      ? () =>
                          router.push(
                            (key === "Biology"
                              ? "/(tabs)/lab/biology"
                              : { pathname: "/(tabs)/lab/practicals", params: { subject: key } }) as never
                          )
                      : undefined
                  }
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-12 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: `${color}1A` }}>
                      <Icon size={22} color={color} strokeWidth={1.8} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-slate-800">{shortLabel}</Text>
                      <Text className="text-[11px] font-medium text-slate-400 mt-0.5" numberOfLines={2}>
                        {description}
                      </Text>
                      {available ? (
                        <Text className="text-[11px] font-semibold mt-1" style={{ color }}>
                          {count ?? 0} {capitalize(unitLabel)}
                          {gradeRange ? ` · ${gradeRange}` : ""}
                        </Text>
                      ) : (
                        <View className="self-start mt-1 px-2 py-0.5 rounded-full bg-slate-100">
                          <Text className="text-[10px] font-bold text-slate-500">Coming soon</Text>
                        </View>
                      )}
                    </View>
                    {available && <ChevronRight size={18} color={ICON_COLORS.slate400} strokeWidth={2.5} />}
                  </View>
                </Card>
              );
            })}
          </View>

          {/* Learn Before You Experiment — compact horizontal carousel below the subjects */}
          <View className="mb-6">
            <SectionHeading
              title="Learn Before You Experiment"
              actionLabel="See all"
              onAction={() => router.push({ pathname: "/(tabs)/lab/practicals", params: { subject: "Chemistry" } } as never)}
            />
            <Text className="text-[11px] font-medium text-slate-400 mb-3 -mt-1">Read the theory before you step into the lab.</Text>

            {chemistryLoading ? (
              <ActivityIndicator color={ICON_COLORS.primary500} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
                {chemistryPracticals?.map((practical) => (
                  <Card
                    key={practical._id}
                    haptic
                    className="w-44 border border-slate-100 shadow-black/10"
                    onPress={() => router.push(`/(tabs)/lab/${practical._id}/info` as never)}
                  >
                    <View className="w-10 h-10 rounded-xl bg-slate-50 items-center justify-center">
                      <BookOpen size={18} color={ICON_COLORS.slate500} strokeWidth={1.8} />
                    </View>
                    <Text className="text-sm font-bold text-slate-800 mt-2" numberOfLines={2}>
                      {practical.title}
                    </Text>
                    <Text className="text-[11px] font-medium text-slate-400 mt-1">{formatGradeRange(practical.grades)}</Text>
                    <View className="flex-row items-center gap-1 mt-2">
                      <Text className="text-[11px] font-bold text-primary">{practical.estimatedTime} min read</Text>
                      <ArrowRight size={12} color={ICON_COLORS.primary500} strokeWidth={2.5} />
                    </View>
                  </Card>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Practical History */}
          <View>
            <SectionHeading title="Practical History" actionLabel="View all" onAction={() => router.push("/(tabs)/lab/history" as never)} />

            {historyLoading ? (
              <ActivityIndicator color={ICON_COLORS.primary500} />
            ) : recentHistory?.data?.length ? (
              <View className="gap-3">
                {recentHistory.data.map((item) => (
                  <PracticalHistoryListItem key={item._id} item={item} />
                ))}
              </View>
            ) : (
              <View className="rounded-2xl border border-slate-100 bg-white p-4">
                <Text className="text-[13px] font-medium text-slate-400 text-center">
                  No completed practicals yet — finish one to see it here.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
