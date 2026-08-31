import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Leaf } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { useBiologyVisualization } from "@/hooks/lab/use-biology-visualizations";
import BiologyHeader from "@/components/lab/biology/BiologyHeader";
import VisualizationPlayer from "@/components/lab/biology/VisualizationPlayer";

export default function BiologyVisualizationScreen() {
  const { visualizationId } = useLocalSearchParams<{ visualizationId: string }>();
  const { data: visualization, isLoading, isError } = useBiologyVisualization(visualizationId);

  if (isLoading) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-slate-50" edges={["top", "bottom"]}>
        <ActivityIndicator color={ICON_COLORS.primary500} />
      </SafeAreaView>
    );
  }

  if (isError || !visualization) {
    return (
      <SafeAreaView className="w-full flex-1 bg-slate-50" edges={["top", "bottom"]}>
        <BiologyHeader title="Visualization" />
        <View className="flex-1 justify-center items-center px-8 pb-16">
          <View className="w-16 h-16 rounded-full bg-rose-100 justify-center items-center mb-4">
            <Leaf size={28} color={ICON_COLORS.rose500} strokeWidth={1.8} />
          </View>
          <Text className="text-slate-800 font-black text-base text-center mb-1">Couldn&apos;t load this visualization</Text>
          <Text className="text-slate-500 text-sm text-center leading-5">Go back and try another concept.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="w-full flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <BiologyHeader title={visualization.title} subtitle={visualization.syllabusTopic} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <VisualizationPlayer visualization={visualization} />
      </ScrollView>
    </SafeAreaView>
  );
}
