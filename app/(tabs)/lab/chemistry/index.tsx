import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Clock, FlaskConical } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useExperiments } from "@/hooks/use-experiments";
import { PracticalSummaryType } from "@/types/labModuleTypes";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

export default function ChemistryPracticals() {
  const { data: practicals, isLoading, isError, refetch } = useExperiments("Chemistry");

  if (isLoading) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white" edges={["bottom"]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white px-8" edges={["bottom"]}>
        <Text className="text-lg font-amedium text-center text-ink">Couldn&apos;t reach the server</Text>
        <Text className="font-aregular text-muted text-center mt-2 mb-4">
          Check that the backend is running and EXPO_PUBLIC_BACKEND_URL in your .env points to a reachable address.
        </Text>
        <View className="self-stretch">
          <Button label="Retry" onPress={() => refetch()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  if (!practicals || practicals.length === 0) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white px-8" edges={["bottom"]}>
        <FlaskConical size={32} color="#979797" />
        <Text className="font-aregular text-muted text-center mt-3">No Chemistry practicals available yet.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="w-full flex-1 bg-white" edges={["bottom"]}>
      <FlatList
        data={practicals}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }: { item: PracticalSummaryType }) => {
          const goToEquipment = () => router.push(`/(tabs)/lab/chemistry/${item._id}/equipment` as never);
          return (
            <Card onPress={goToEquipment}>
              <View className="flex-row items-start gap-3">
                <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: `${item.thumbnailColor}22` }}>
                  <FlaskConical size={22} color={item.thumbnailColor} />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-amedium text-ink">{item.title}</Text>
                  <Text className="font-aregular text-muted mt-1" numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-2 mt-3">
                <Badge label={item.difficulty} color={item.thumbnailColor} />
                <Badge label={`${item.estimatedTime} min`} icon={Clock} tone="neutral" />
              </View>

              <View className="mt-3">
                <Button label="Start Experiment" onPress={goToEquipment} size="md" />
              </View>
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}
