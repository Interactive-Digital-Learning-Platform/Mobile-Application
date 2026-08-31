import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, Clock3, GraduationCap, Leaf } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { useBiologyVisualizations } from "@/hooks/lab/use-biology-visualizations";
import { BiologyVisualizationSummaryType } from "@/types/lab";
import ConceptVisualizationCard from "@/components/lab/biology/ConceptVisualizationCard";
import UnderstandConceptCard from "@/components/lab/biology/UnderstandConceptCard";
import BiologyHeader from "@/components/lab/biology/BiologyHeader";

type DifficultyFilter = "all" | BiologyVisualizationSummaryType["difficulty"];

const FILTERS: { key: DifficultyFilter; label: string; dot: string }[] = [
  { key: "all", label: "All", dot: "bg-slate-400" },
  { key: "easy", label: "Easy", dot: "bg-emerald-500" },
  { key: "medium", label: "Medium", dot: "bg-amber-500" },
  { key: "hard", label: "Hard", dot: "bg-rose-500" },
];

function StatCell({ value, label, icon: Icon, divider }: { value: string | number; label: string; icon: typeof Leaf; divider?: boolean }) {
  return (
    <View className={`flex-1 items-center px-1 py-1 ${divider ? "border-l border-slate-200" : ""}`}>
      <Icon size={15} color={ICON_COLORS.primary500} strokeWidth={2.2} />
      <Text className="mt-1 text-[20px] font-black text-primary">{value}</Text>
      <Text className="mt-0.5 text-center text-[10px] font-semibold text-slate-400">{label}</Text>
    </View>
  );
}

export default function BiologyConceptCatalog() {
  const { data: visualizations, isLoading, isError, refetch } = useBiologyVisualizations();
  const [filter, setFilter] = useState<DifficultyFilter>("all");

  const items = useMemo(() => visualizations ?? [], [visualizations]);
  const filteredItems = useMemo(
    () => (filter === "all" ? items : items.filter((item) => item.difficulty === filter)),
    [filter, items]
  );
  const grades = useMemo(() => [...new Set(items.flatMap((item) => item.grades))].sort((a, b) => a - b), [items]);
  const gradeValue = grades.length === 0 ? "—" : grades.length === 1 ? `${grades[0]}` : `${grades[0]}–${grades[grades.length - 1]}`;
  const totalMinutes = items.reduce((total, item) => total + (Math.round(item.durationSec / 60) || 1), 0);

  if (isLoading) {
    return (
      <SafeAreaView className="w-full flex-1 items-center justify-center bg-slate-50" edges={["top", "bottom"]}>
        <ActivityIndicator color={ICON_COLORS.primary500} />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="w-full flex-1 bg-slate-50" edges={["top", "bottom"]}>
        <BiologyHeader title="Biology Visualizations" />
        <View className="flex-1 items-center justify-center px-8 pb-16">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-rose-100">
            <Leaf size={28} color={ICON_COLORS.rose500} strokeWidth={1.8} />
          </View>
          <Text className="mb-1 text-center text-base font-black text-slate-800">Couldn&apos;t reach the server</Text>
          <Text className="mb-5 text-center text-sm leading-5 text-slate-500">
            Check that the backend is running and your API gateway URL points to a reachable address.
          </Text>
          <TouchableOpacity className="flex-row items-center gap-2 rounded-2xl bg-primary px-6 py-3" activeOpacity={0.85} onPress={() => refetch()}>
            <Text className="text-sm font-black text-white">Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="w-full flex-1 bg-primary" edges={["top", "bottom"]}>
      <View className="px-5 pb-5 pt-2">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            className="h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/20"
            activeOpacity={0.72}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={22} color={ICON_COLORS.white} strokeWidth={2.6} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[22px] font-black text-white">Biology Visualizations</Text>
            <Text className="mt-0.5 text-[12px] font-medium text-white/75">Watch · Explore · Understand</Text>
          </View>
          <View className="h-[58px] w-[58px] items-center justify-center rounded-full border-2 border-white/40 bg-white/20">
            <Leaf size={25} color={ICON_COLORS.white} strokeWidth={1.9} />
          </View>
        </View>

        <View className="mt-4 flex-row rounded-3xl bg-white px-2 py-3 shadow-sm shadow-black/10">
          <StatCell value={items.length} label="Visualizations" icon={Leaf} />
          <StatCell value={gradeValue} label="Grade range" icon={GraduationCap} divider />
          <StatCell value={`${totalMinutes}m`} label="Learning time" icon={Clock3} divider />
        </View>
      </View>

      <View className="flex-1 overflow-hidden rounded-t-[28px] bg-slate-50">
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 18, paddingBottom: 32, gap: 14, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View className="gap-5">
              <UnderstandConceptCard onPress={() => router.push("/(tabs)/lab/biology/generate" as never)} />

              <View>
                <View className="mb-2.5 flex-row items-end justify-between">
                  <View>
                    <Text className="text-base font-black text-slate-800">Explore visualizations</Text>
                    <Text className="mt-0.5 text-[11px] font-medium text-slate-400">Choose a process and learn it step by step.</Text>
                  </View>
                  <Text className="text-[11px] font-black text-primary">{filteredItems.length} topics</Text>
                </View>

                <View className="flex-row gap-2">
                  {FILTERS.map((item) => {
                    const active = filter === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        onPress={() => setFilter(item.key)}
                        className={`min-h-[38px] flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border px-2 ${
                          active ? "border-primary bg-primary" : "border-slate-200 bg-white"
                        }`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        <View className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white" : item.dot}`} />
                        <Text className={`text-[11px] font-black ${active ? "text-white" : "text-slate-500"}`}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8 pb-16 pt-8">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Leaf size={28} color={ICON_COLORS.primary500} strokeWidth={1.8} />
              </View>
              <Text className="mb-1 text-center text-base font-black text-slate-800">
                {items.length === 0 ? "No visualizations yet" : `No ${filter} topics yet`}
              </Text>
              <Text className="text-center text-sm leading-5 text-slate-500">
                {items.length === 0
                  ? "Use AI Lab Assist above to generate a visualization for any Biology topic."
                  : "Try another difficulty or ask AI Lab Assist to create one."}
              </Text>
            </View>
          }
          renderItem={({ item }: { item: BiologyVisualizationSummaryType }) => (
            <ConceptVisualizationCard
              visualization={item}
              onPress={() => router.push(`/(tabs)/lab/biology/${item._id}` as never)}
            />
          )}
        />
      </View>
    </SafeAreaView>
  );
}
