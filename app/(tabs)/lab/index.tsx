import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { FlaskConical, Leaf, Zap } from "lucide-react-native";
import { colors } from "@/constants/colors";

const SUBJECTS = [
  { key: "Chemistry", label: "Chemistry Laboratory", Icon: FlaskConical, color: "#4FA8F7", available: true },
  { key: "Biology", label: "Biology Laboratory", Icon: Leaf, color: "#7CB342", available: false },
  { key: "Physics", label: "Physics Laboratory", Icon: Zap, color: "#F7A94F", available: false },
];

export default function Lab() {
  return (
    <SafeAreaView className="w-full flex-1 bg-white px-4">
      <Text className="text-2xl font-amedium mt-2 mb-1" style={{ color: colors.primaryBlack }}>
        Virtual Science Laboratory
      </Text>
      <Text className="font-aregular text-[#979797] mb-6">Choose a subject to begin a practical.</Text>

      <View className="gap-4">
        {SUBJECTS.map(({ key, label, Icon, color, available }) => (
          <Pressable
            key={key}
            disabled={!available}
            onPress={() => router.push(`/(tabs)/lab/${key.toLowerCase()}` as never)}
            className="flex-row items-center gap-4 p-4 rounded-2xl border"
            style={{ borderColor: colors.borderColorLight, opacity: available ? 1 : 0.5 }}
          >
            <View
              className="w-14 h-14 rounded-full items-center justify-center"
              style={{ backgroundColor: `${color}22` }}
            >
              <Icon size={28} color={color} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-amedium" style={{ color: colors.primaryBlack }}>
                {label}
              </Text>
              <Text className="font-aregular text-sm text-[#979797]">
                {available ? "Tap to view available practicals" : "Coming soon"}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
