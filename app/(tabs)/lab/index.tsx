import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronRight, FlaskConical, Leaf, Zap } from "lucide-react-native";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

const SUBJECTS = [
  { key: "Chemistry", label: "Chemistry Laboratory", Icon: FlaskConical, color: "#4FA8F7", available: true },
  { key: "Biology", label: "Biology Laboratory", Icon: Leaf, color: "#7CB342", available: false },
  { key: "Physics", label: "Physics Laboratory", Icon: Zap, color: "#F7A94F", available: false },
];

export default function Lab() {
  return (
    <SafeAreaView className="w-full flex-1 bg-white px-4">
      <Text className="text-2xl font-amedium mt-2 mb-1 text-ink">Virtual Science Laboratory</Text>
      <Text className="font-aregular text-muted mb-6">Choose a subject to begin a practical.</Text>

      <View className="gap-4">
        {SUBJECTS.map(({ key, label, Icon, color, available }) => (
          <Card key={key} disabled={!available} onPress={available ? () => router.push(`/(tabs)/lab/${key.toLowerCase()}` as never) : undefined}>
            <View className="flex-row items-center gap-4">
              <View className="w-14 h-14 rounded-full items-center justify-center" style={{ backgroundColor: `${color}22` }}>
                <Icon size={28} color={color} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-amedium text-ink">{label}</Text>
                {available ? (
                  <Text className="font-aregular text-sm text-muted mt-0.5">Tap to view available practicals</Text>
                ) : (
                  <View className="mt-1.5 self-start">
                    <Badge label="Coming soon" tone="neutral" />
                  </View>
                )}
              </View>
              {available && <ChevronRight size={20} color="#979797" />}
            </View>
          </Card>
        ))}
      </View>
    </SafeAreaView>
  );
}
