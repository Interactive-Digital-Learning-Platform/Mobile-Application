import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Leaf } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useBiologyVisualizations } from "@/hooks/lab/use-biology-visualizations";
import { BiologyVisualizationSummaryType } from "@/types/lab";
import ConceptVisualizationCard from "@/components/lab/biology/ConceptVisualizationCard";
import UnderstandConceptCard from "@/components/lab/biology/UnderstandConceptCard";
import Button from "@/components/ui/Button";

export default function BiologyConceptCatalog() {
  const { data: visualizations, isLoading, isError, refetch } = useBiologyVisualizations();

  if (isLoading) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white" edges={["top", "bottom"]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white px-8" edges={["top", "bottom"]}>
        <Text className="text-lg font-amedium text-center text-ink">Couldn&apos;t reach the server</Text>
        <Text className="font-aregular text-muted text-center mt-2 mb-4">
          Check that the backend is running and EXPO_PUBLIC_API_GATEWAY_URL in your .env points to a reachable address.
        </Text>
        <View className="self-stretch">
          <Button label="Retry" onPress={() => refetch()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  if (!visualizations || visualizations.length === 0) {
    return (
      <SafeAreaView className="w-full flex-1 bg-white px-4" edges={["top", "bottom"]}>
        <View className="flex-1 justify-center gap-4">
          <View className="items-center px-4">
            <Leaf size={32} color="#979797" />
            <Text className="font-aregular text-muted text-center mt-3">No Biology visualizations available yet.</Text>
          </View>
          <UnderstandConceptCard onPress={() => router.push("/(tabs)/lab/biology/generate" as never)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="w-full flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="px-4 pt-4 pb-1">
        <Text className="text-xl font-amedium text-ink">Biology Concept Visualizations</Text>
        <Text className="font-aregular text-muted">Watch how each process actually happens — then explore it yourself.</Text>
      </View>
      <FlatList
        data={visualizations}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 12 }}
        ListHeaderComponent={
          <View className="mb-1">
            <UnderstandConceptCard onPress={() => router.push("/(tabs)/lab/biology/generate" as never)} />
          </View>
        }
        renderItem={({ item }: { item: BiologyVisualizationSummaryType }) => (
          <ConceptVisualizationCard visualization={item} onPress={() => router.push(`/(tabs)/lab/biology/${item._id}` as never)} />
        )}
      />
    </SafeAreaView>
  );
}
