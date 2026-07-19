import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Clock } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useExperiments } from "@/hooks/use-experiments";
import { PracticalSummaryType } from "@/types";

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
        <Text className="text-lg font-amedium text-center" style={{ color: colors.primaryBlack }}>
          Couldn&apos;t reach the server
        </Text>
        <Text className="font-aregular text-[#979797] text-center mt-2 mb-4">
          Check that the backend is running and EXPO_PUBLIC_BACKEND_URL in your .env points to a reachable address.
        </Text>
        <Pressable onPress={() => refetch()} className="px-6 py-3 rounded-xl" style={{ backgroundColor: colors.primaryBlack }}>
          <Text className="text-white font-amedium">Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!practicals || practicals.length === 0) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white px-8" edges={["bottom"]}>
        <Text className="font-aregular text-[#979797] text-center">No Chemistry practicals available yet.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="w-full flex-1 bg-white" edges={["bottom"]}>
      <FlatList
        data={practicals}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }: { item: PracticalSummaryType }) => (
          <Pressable
            onPress={() => router.push(`/(tabs)/lab/chemistry/${item._id}/equipment` as never)}
            className="p-4 rounded-2xl border"
            style={{ borderColor: colors.borderColorLight }}
          >
            <View className="flex-row justify-between items-start">
              <Text className="text-lg font-amedium flex-1" style={{ color: colors.primaryBlack }}>
                {item.title}
              </Text>
              <View className="px-2 py-1 rounded-full" style={{ backgroundColor: `${item.thumbnailColor}22` }}>
                <Text className="text-xs font-amedium" style={{ color: item.thumbnailColor }}>
                  {item.difficulty}
                </Text>
              </View>
            </View>
            <Text className="font-aregular text-[#979797] mt-1" numberOfLines={2}>
              {item.description}
            </Text>
            <View className="flex-row items-center gap-1 mt-2">
              <Clock size={14} color="#979797" />
              <Text className="font-aregular text-xs text-[#979797]">{item.estimatedTime} min</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
