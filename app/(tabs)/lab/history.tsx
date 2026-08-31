import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { BarChart3, ChevronLeft, ClipboardList, RefreshCw, Trophy } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { useSessionHistory } from "@/hooks/lab/use-lab-session";
import { PAGE_LIMIT } from "@/constants/lab/history.constants";
import { SessionHistoryFilterType, SessionHistoryItemType } from "@/types/lab";
import PracticalHistoryFilterBar from "@/components/lab/PracticalHistoryFilterBar";
import PracticalHistoryListItem from "@/components/lab/PracticalHistoryListItem";

function StatCell({ value, label, icon: Icon, divider }: { value: string | number; label: string; icon: typeof ClipboardList; divider?: boolean }) {
  return (
    <View className={`flex-1 items-center py-1 ${divider ? "border-l border-slate-200" : ""}`}>
      <Icon size={15} color={ICON_COLORS.primary500} strokeWidth={2.2} />
      <Text className="mt-1 text-[20px] font-black text-primary">{value}</Text>
      <Text className="mt-0.5 text-[10px] font-semibold text-slate-400">{label}</Text>
    </View>
  );
}

export default function PracticalHistory() {
  const [filters, setFilters] = useState<SessionHistoryFilterType>({ status: "completed" });
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<SessionHistoryItemType[]>([]);

  const { data, isLoading, isError, isFetching, refetch } = useSessionHistory({ ...filters, page, limit: PAGE_LIMIT });

  useEffect(() => {
    setPage(1);
    setItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    if (!data) return;
    setItems((previous) => (page === 1 ? data.data : [...previous, ...data.data]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const hasMore = data ? items.length < data.pagination.total : false;
  const totalSessions = data?.pagination.total ?? items.length;
  const averageScore = useMemo(
    () => (items.length > 0 ? Math.round(items.reduce((total, item) => total + item.score, 0) / items.length) : null),
    [items]
  );
  const bestScore = useMemo(() => (items.length > 0 ? Math.max(...items.map((item) => item.score)) : null), [items]);

  return (
    <SafeAreaView className="w-full flex-1 bg-primary" edges={["top"]}>
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
            <Text className="text-[22px] font-black text-white">Practical History</Text>
            <Text className="mt-0.5 text-[12px] font-medium text-white/75">Review progress · revisit reports</Text>
          </View>
          <View className="h-[56px] w-[56px] items-center justify-center rounded-full border-2 border-white/40 bg-white/20">
            <ClipboardList size={24} color={ICON_COLORS.white} strokeWidth={1.9} />
          </View>
        </View>

        <View className="mt-4 flex-row rounded-3xl bg-white px-2 py-3 shadow-sm shadow-black/10">
          <StatCell value={totalSessions} label="Sessions" icon={ClipboardList} />
          <StatCell value={averageScore == null ? "—" : `${averageScore}%`} label="Avg score" icon={BarChart3} divider />
          <StatCell value={bestScore == null ? "—" : `${bestScore}%`} label="Best score" icon={Trophy} divider />
        </View>
      </View>

      <View className="flex-1 overflow-hidden rounded-t-[28px] bg-slate-50">
        <PracticalHistoryFilterBar filters={filters} onChange={setFilters} />

        <View className="flex-row items-center justify-between px-4 pb-1 pt-3">
          <View>
            <Text className="text-[15px] font-black text-slate-800">Your sessions</Text>
            <Text className="text-[10px] font-medium text-slate-400">Tap a completed practical to open its report.</Text>
          </View>
          <View className="rounded-full bg-primary/10 px-2.5 py-1">
            <Text className="text-[10px] font-black text-primary">{totalSessions} found</Text>
          </View>
        </View>

        {isLoading && page === 1 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={ICON_COLORS.primary500} />
          </View>
        ) : isError ? (
          <View className="flex-1 items-center justify-center px-8 pb-16">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-rose-100">
              <ClipboardList size={28} color={ICON_COLORS.rose500} strokeWidth={1.8} />
            </View>
            <Text className="mb-1 text-center text-base font-black text-slate-800">Couldn&apos;t reach the server</Text>
            <Text className="mb-5 text-center text-sm leading-5 text-slate-400">Check your connection and try again.</Text>
            <TouchableOpacity className="flex-row items-center gap-2 rounded-2xl bg-primary px-6 py-3" activeOpacity={0.82} onPress={() => refetch()}>
              <RefreshCw size={15} color={ICON_COLORS.white} strokeWidth={2.4} />
              <Text className="text-[13px] font-black text-white">Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item: SessionHistoryItemType) => item._id}
            contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 28, gap: 12, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <PracticalHistoryListItem
                item={item}
                onPress={
                  item.experimentId
                    ? () => router.push(`/(tabs)/lab/${item.experimentId!._id}/report?sessionId=${item._id}` as never)
                    : undefined
                }
              />
            )}
            ListEmptyComponent={
              <View className="mt-16 flex-1 items-center justify-center px-8">
                <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <ClipboardList size={28} color={ICON_COLORS.primary500} strokeWidth={1.8} />
                </View>
                <Text className="mb-1 text-center text-base font-black text-slate-800">No matching sessions</Text>
                <Text className="text-center text-sm leading-5 text-slate-400">Try changing or resetting the filters above.</Text>
              </View>
            }
            ListFooterComponent={
              hasMore ? (
                <TouchableOpacity
                  className="min-h-[46px] items-center justify-center rounded-xl bg-primary/10"
                  activeOpacity={0.8}
                  disabled={isFetching}
                  onPress={() => setPage((current) => current + 1)}
                >
                  {isFetching ? (
                    <ActivityIndicator size="small" color={ICON_COLORS.primary500} />
                  ) : (
                    <Text className="text-[13px] font-black text-primary">Load more sessions</Text>
                  )}
                </TouchableOpacity>
              ) : null
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
