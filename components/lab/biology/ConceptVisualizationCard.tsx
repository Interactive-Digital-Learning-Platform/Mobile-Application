import { Text, View } from "react-native";
import { Leaf } from "lucide-react-native";
import { ConceptVisualizationCardProps } from "@/types/lab";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export default function ConceptVisualizationCard({ visualization, onPress }: ConceptVisualizationCardProps) {
  return (
    <Card onPress={onPress}>
      <View className="flex-row items-start gap-3">
        <View
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ backgroundColor: `${visualization.thumbnailColor}22` }}
        >
          <Leaf size={22} color={visualization.thumbnailColor} />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-amedium text-ink">{visualization.title}</Text>
          <Text className="font-aregular text-muted mt-1" numberOfLines={2}>
            {visualization.description}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2 mt-3">
        <Badge label={visualization.difficulty} color={visualization.thumbnailColor} />
        <Badge label={visualization.syllabusTopic} tone="neutral" />
      </View>
    </Card>
  );
}
