import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ClipboardList } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useSessionHistory } from "@/hooks/lab/use-lab-session";
import { PAGE_LIMIT } from "@/constants/lab/history.constants";
import { SessionHistoryFilterType, SessionHistoryItemType } from "@/types/lab";
import PracticalHistoryFilterBar from "@/components/lab/PracticalHistoryFilterBar";
import PracticalHistoryListItem from "@/components/lab/PracticalHistoryListItem";
import Button from "@/components/ui/Button";

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
    <SafeAreaView className="w-full flex-1 bg-white" edges={["bottom"]}>
      <PracticalHistoryFilterBar filters={filters} onChange={setFilters} />

      {isLoading && page === 1 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-lg font-amedium text-center text-ink">Couldn&apos;t reach the server</Text>
          <Text className="font-aregular text-muted text-center mt-2">Check your connection and try again.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item: SessionHistoryItemType) => item._id}
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
          renderItem={({ item }) => <PracticalHistoryListItem item={item} />}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center mt-16">
              <ClipboardList size={32} color="#979797" />
              <Text className="font-aregular text-muted text-center mt-3">No practicals match these filters.</Text>
            </View>
          }
          ListFooterComponent={
            hasMore ? (
              <View className="mt-1">
                <Button label={isFetching ? "Loading..." : "Load more"} onPress={() => setPage((p) => p + 1)} variant="secondary" disabled={isFetching} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
