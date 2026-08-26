import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { useBiologyVisualization } from "@/hooks/lab/use-biology-visualizations";
import VisualizationPlayer from "@/components/lab/biology/VisualizationPlayer";

export default function BiologyVisualizationScreen() {
  const { visualizationId } = useLocalSearchParams<{ visualizationId: string }>();
  const { data: visualization, isLoading, isError } = useBiologyVisualization(visualizationId);

  if (isLoading) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white" edges={["bottom"]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (isError || !visualization) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-white px-8" edges={["bottom"]}>
        <Text className="font-aregular text-muted text-center">Couldn&apos;t load this visualization.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="w-full flex-1 bg-white" edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-3 mb-4">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={22} color={colors.primaryBlack} />
          </Pressable>
          <Text className="text-lg font-amedium text-ink flex-1" numberOfLines={1}>
            {visualization.title}
          </Text>
        </View>

        <VisualizationPlayer visualization={visualization} />
      </ScrollView>
    </SafeAreaView>
  );
}
