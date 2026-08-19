import { Text, View } from "react-native";
import { FlaskConical } from "lucide-react-native";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { PracticalHistoryListItemProps } from "@/types/lab";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

const scoreTone = (score: number) => (score >= 76 ? "success" : score >= 51 ? "warning" : "danger");

export default function PracticalHistoryListItem({ item, onPress }: PracticalHistoryListItemProps) {
  // experimentId can be null if the practical it points to was deleted/re-seeded after this
  // session was recorded — render a neutral placeholder rather than crashing.
  const experiment = item.experimentId ?? { title: "Practical no longer available", subject: "", thumbnailColor: "#979797" };

  return (
    <Card onPress={onPress} padding="md">
      <View className="flex-row items-start gap-3">
        <View
          className="w-11 h-11 rounded-full items-center justify-center"
          style={{ backgroundColor: `${experiment.thumbnailColor}22` }}
        >
          <FlaskConical size={20} color={experiment.thumbnailColor} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-amedium text-ink" numberOfLines={1}>
            {experiment.title}
          </Text>
          {!!experiment.subject && <Text className="font-aregular text-muted text-sm mt-0.5">{experiment.subject}</Text>}
          <View className="flex-row items-center gap-2 mt-2">
            <Badge label={`${item.score}%`} tone={scoreTone(item.score)} />
            <Text className="font-aregular text-muted text-xs">{formatDate(item.createdAt)}</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}
