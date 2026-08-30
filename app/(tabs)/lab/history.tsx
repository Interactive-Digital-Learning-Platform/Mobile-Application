import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ClipboardList } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { useSessionHistory } from "@/hooks/lab/use-lab-session";
import { PAGE_LIMIT } from "@/constants/lab/history.constants";
import { SessionHistoryFilterType, SessionHistoryItemType } from "@/types/lab";
import LabHeader from "@/components/lab/LabHeader";
import PracticalHistoryFilterBar from "@/components/lab/PracticalHistoryFilterBar";
import PracticalHistoryListItem from "@/components/lab/PracticalHistoryListItem";

export default function PracticalHistory() {
  const [filters, setFilters] = useState<SessionHistoryFilterType>({ status: "completed" });
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<SessionHistoryItemType[]>([]);

  const { data, isLoading, isError, isFetching } = useSessionHistory({ ...filters, page, limit: PAGE_LIMIT });

  // Filters changing resets to page 1 and clears the accumulated list; a page bump appends
  // instead (avoids re-fetching earlier pages just to show one more).
  useEffect(() => {
    setPage(1);
    setItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    if (!data) return;
    setItems((prev) => (page === 1 ? data.data : [...prev, ...data.data]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const hasMore = data ? items.length < data.pagination.total : false;

  return (
    <SafeAreaView className="w-full flex-1 bg-white" edges={["top", "bottom"]}>
      <LabHeader title="Practical History" subtitle={data ? `${data.pagination.total} sessions` : undefined} />
      <PracticalHistoryFilterBar filters={filters} onChange={setFilters} />

      {isLoading && page === 1 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color={ICON_COLORS.primary500} />
        </View>
      ) : isError ? (
        <View className="flex-1 justify-center items-center px-8 pb-16">
          <View className="w-16 h-16 rounded-full bg-rose-100 justify-center items-center mb-4">
            <ClipboardList size={28} color={ICON_COLORS.rose500} strokeWidth={1.8} />
          </View>
          <Text className="text-slate-800 font-black text-base text-center mb-1">Couldn&apos;t reach the server</Text>
          <Text className="text-slate-400 text-sm text-center leading-5">Check your connection and try again.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item: SessionHistoryItemType) => item._id}
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PracticalHistoryListItem
              item={item}
              onPress={
                item.experimentId
                  ? () =>
                      router.push(
                        `/(tabs)/lab/${item.experimentId!._id}/report?sessionId=${item._id}` as never,
                      )
                  : undefined
              }
            />
          )}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center px-8 mt-16">
              <View className="w-16 h-16 rounded-full bg-primary/10 justify-center items-center mb-4">
                <ClipboardList size={28} color={ICON_COLORS.primary500} strokeWidth={1.8} />
              </View>
              <Text className="text-slate-800 font-black text-base text-center mb-1">No matches</Text>
              <Text className="text-slate-400 text-sm text-center leading-5">No practicals match these filters.</Text>
            </View>
          }
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity
                className="py-3 rounded-xl items-center bg-slate-100"
                activeOpacity={0.8}
                disabled={isFetching}
                onPress={() => setPage((p) => p + 1)}
              >
                <Text className="text-slate-700 text-sm font-bold">{isFetching ? "Loading…" : "Load more"}</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
