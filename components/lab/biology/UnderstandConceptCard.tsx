import { Text, View } from "react-native";
import { Brain, ChevronRight } from "lucide-react-native";
import { colors } from "@/constants/colors";
import Card from "@/components/ui/Card";

// The "prominent entry point" into AI-generated visualizations — a student who can't find their
// topic in the predefined catalog taps this instead of hitting a dead end.
export default function UnderstandConceptCard({ onPress }: { onPress: () => void }) {
  return (
    <Card onPress={onPress} className="bg-primary/5 border border-primary/20">
      <View className="flex-row items-center gap-3">
        <View className="w-11 h-11 rounded-full items-center justify-center bg-primary/15">
          <Brain size={22} color={colors.primary} />
        </View>
        <View className="flex-1">
          <Text className="font-amedium text-ink text-base">Understand a Concept</Text>
          <Text className="font-aregular text-muted text-sm mt-0.5">
            Don&apos;t understand a Biology topic? Ask the lab to explain it visually.
          </Text>
        </View>
        <ChevronRight size={18} color="#979797" />
      </View>
    </Card>
  );
}
