import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { BookOpen } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";

export default function QuizLoadingScreen() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white justify-center items-center px-8">
      <Animated.View entering={FadeIn.duration(300)} className="items-center gap-5">
        <View className="w-20 h-20 rounded-full bg-primary-50 justify-center items-center">
          <BookOpen size={34} color={ICON_COLORS.primary500} strokeWidth={1.6} />
        </View>

        <View className="items-center gap-1">
          <Text className="text-slate-800 text-xl font-black text-center">Loading Quiz</Text>
          <Text className="text-slate-400 text-sm text-center">Restoring your session…</Text>
        </View>

        <ActivityIndicator size="large" color={ICON_COLORS.primary500} />
      </Animated.View>
    </SafeAreaView>
  );
}
