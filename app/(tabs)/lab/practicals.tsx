import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowRight, BookOpen, Check, Clock, FlaskConical } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { LAB_SUBJECTS, experimentIcon, formatGradeRange } from "@/constants/lab/experiment.constants";
import { useExperiments } from "@/hooks/lab/use-experiments";
import { useSessionHistory } from "@/hooks/lab/use-lab-session";
import { PracticalSummaryType } from "@/types/lab";
import LabHeader from "@/components/lab/LabHeader";
import DifficultyBadge from "@/components/quiz-componets/DifficultyBadge";

const GRADE_FILTERS = ["All", "Grade 10", "Grade 11", "Completed"] as const;
type GradeFilter = (typeof GRADE_FILTERS)[number];

export default function SubjectPracticals() {
  // Defaults to Chemistry so a stale/missing param (or a link written before this screen took a
  // subject) doesn't silently 404 — every LAB_SUBJECTS card now passes its own key explicitly.
  const { subject: subjectParam } = useLocalSearchParams<{ subject?: string }>();
  const subject = subjectParam || "Chemistry";
  const subjectMeta = LAB_SUBJECTS.find((s) => s.key === subject);

  const { data: practicals, isLoading, isError, refetch } = useExperiments(subject);
  // Per-practical progress, built from history already exposed by these hooks — no new endpoint.
  const { data: completedHist } = useSessionHistory({ subject, status: "completed", limit: 50 });
  const { data: inProgressHist } = useSessionHistory({ subject, status: "in_progress", limit: 50 });

  const [filter, setFilter] = useState<GradeFilter>("All");

  const progressByExperiment = useMemo(() => {
    const map: Record<string, { bestScore: number | null; inProgress: boolean }> = {};
    for (const s of completedHist?.data ?? []) {
      const id = s.experimentId?._id;
      if (!id) continue;
      const prev = map[id]?.bestScore ?? null;
      map[id] = { bestScore: prev == null ? s.score : Math.max(prev, s.score), inProgress: map[id]?.inProgress ?? false };
    }
    for (const s of inProgressHist?.data ?? []) {
      const id = s.experimentId?._id;
      if (!id) continue;
      map[id] = { bestScore: map[id]?.bestScore ?? null, inProgress: true };
    }
    return map;
  }, [completedHist, inProgressHist]);

  if (isLoading) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-slate-50" edges={["top", "bottom"]}>
        <ActivityIndicator color={ICON_COLORS.primary500} />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="w-full flex-1 bg-slate-50" edges={["top", "bottom"]}>
        <LabHeader title={subjectMeta?.label || `${subject} Laboratory`} />
        <View className="flex-1 justify-center items-center px-8 pb-16">
          <View className="w-16 h-16 rounded-full bg-rose-100 justify-center items-center mb-4">
            <FlaskConical size={28} color={ICON_COLORS.rose500} strokeWidth={1.8} />
          </View>
          <Text className="text-slate-800 font-black text-base text-center mb-1">Couldn&apos;t reach the server</Text>
          <Text className="text-slate-500 text-sm text-center leading-5 mb-5">
            Check that the backend is running and your API gateway URL points to a reachable address.
          </Text>
          <TouchableOpacity
            className="bg-primary flex-row items-center gap-2 px-6 py-3 rounded-2xl"
            activeOpacity={0.85}
            onPress={() => refetch()}
          >
            <Text className="text-white font-black text-sm">Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const items = practicals ?? [];
  const filtered = items.filter((it) => {
    if (filter === "Grade 10") return it.grades?.includes(10);
    if (filter === "Grade 11") return it.grades?.includes(11);
    if (filter === "Completed") return progressByExperiment[it._id]?.bestScore != null;
    return true;
  });

  return (
    <SafeAreaView className="w-full flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <LabHeader
        title={subjectMeta?.label || `${subject} Laboratory`}
        subtitle="Choose a practical to learn the theory or start experimenting."
      />

      {items.length > 3 && (
        <View className="flex-row gap-2 px-4 pt-1 pb-2 bg-white border-b border-slate-100">
          {GRADE_FILTERS.map((f) => {
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                className={`px-3 py-1.5 rounded-xl border ${active ? "border-primary bg-primary/10" : "border-slate-200 bg-white"}`}
                activeOpacity={0.8}
                onPress={() => setFilter(f)}
              >
                <Text className={`text-xs font-semibold ${active ? "text-primary" : "text-slate-600"}`}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 16, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center px-8 pb-16">
            <View className="w-16 h-16 rounded-full bg-primary/10 justify-center items-center mb-4">
              <FlaskConical size={28} color={ICON_COLORS.primary500} strokeWidth={1.8} />
            </View>
            <Text className="text-slate-800 font-black text-base text-center mb-1">Nothing here yet</Text>
            <Text className="text-slate-500 text-sm text-center leading-5">
              {items.length === 0
                ? `No ${subject} practicals are available for your grade yet.`
                : "No practicals match this filter."}
            </Text>
          </View>
        }
        renderItem={({ item }: { item: PracticalSummaryType }) => {
          const Icon = experimentIcon(item);
          const goToEquipment = () => router.push(`/(tabs)/lab/${item._id}/equipment` as never);
          const prog = progressByExperiment[item._id];
          const curriculum = [formatGradeRange(item.grades), item.lesson].filter(Boolean).join(" · ");

          return (
            <View
              className="bg-white p-4"
              style={{
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: "#E2E8F0",
                borderLeftWidth: 4,
                borderLeftColor: `${item.thumbnailColor}99`,
                shadowColor: "#0F172A",
                shadowOpacity: 0.06,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: 2,
              }}
            >
              <View className="flex-row items-start gap-3">
                <View
                  className="w-12 h-12 rounded-xl justify-center items-center mt-0.5"
                  style={{ backgroundColor: `${item.thumbnailColor}1A` }}
                >
                  <Icon size={22} color={item.thumbnailColor} strokeWidth={1.8} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-slate-800">{item.title}</Text>
                  {!!curriculum && (
                    <Text className="text-[11px] font-medium text-slate-500 mt-0.5">{curriculum}</Text>
                  )}
                </View>
              </View>

              <Text className="text-[13px] text-slate-500 mt-2 leading-[18px]" numberOfLines={2}>
                {item.description}
              </Text>

              <View className="flex-row items-center flex-wrap gap-2 mt-3">
                <DifficultyBadge difficulty={item.difficulty} />
                <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100">
                  <Clock size={11} color={ICON_COLORS.slate400} strokeWidth={2} />
                  <Text className="text-[11px] font-semibold text-slate-500">{item.estimatedTime} min</Text>
                </View>
                {prog?.bestScore != null ? (
                  <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100">
                    <Check size={11} color={ICON_COLORS.emerald600} strokeWidth={3} />
                    <Text className="text-[11px] font-bold text-emerald-700">Completed · {prog.bestScore}%</Text>
                  </View>
                ) : prog?.inProgress ? (
                  <View className="px-2 py-0.5 rounded-full bg-amber-100">
                    <Text className="text-[11px] font-bold text-amber-700">In progress</Text>
                  </View>
                ) : null}
              </View>

              <View className="flex-row items-center gap-2 mt-3">
                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200"
                  activeOpacity={0.8}
                  onPress={() => router.push(`/(tabs)/lab/${item._id}/info` as never)}
                >
                  <BookOpen size={15} color={ICON_COLORS.slate500} strokeWidth={2} />
                  <Text className="text-slate-600 text-sm font-bold">Learn First</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-row items-center gap-1 py-2.5 px-5 rounded-xl bg-primary"
                  activeOpacity={0.85}
                  onPress={goToEquipment}
                >
                  <Text className="text-white text-sm font-bold">Start Practical</Text>
                  <ArrowRight size={15} color={ICON_COLORS.white} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
