import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RefreshCw, Database, ChevronLeft, TriangleAlert } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";


interface QuizErrorScreenProps {
  message: string;
  onRetry: () => void;
  onUseCache?: () => void;
  onBack: () => void;
}

export default function QuizErrorScreen({
  message,
  onRetry,
  onUseCache,
  onBack,
}: QuizErrorScreenProps) {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <View className="px-4 pt-3">
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-slate-100 justify-center items-center"
          activeOpacity={0.7}
          onPress={onBack}
        >
          <ChevronLeft size={18} color={ICON_COLORS.slate500} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <View className="flex-1 justify-center items-center px-8">
        <View className="w-20 h-20 rounded-full bg-rose-100 justify-center items-center mb-4">
          <TriangleAlert size={40} color={ICON_COLORS.rose500} strokeWidth={2.5} />
        </View>

        <Text className="text-slate-800 text-xl font-black text-center">
          Couldn't Generate Quiz
        </Text>

        <Text className="text-slate-500 text-sm text-center mt-2 leading-5">
          {message}
        </Text>

        <View className="w-full mt-8 gap-3">
          <TouchableOpacity
            className="w-full flex-row justify-center items-center gap-2 bg-primary py-4 rounded-2xl"
            activeOpacity={0.8}
            onPress={onRetry}
          >
            <RefreshCw size={17} color={ICON_COLORS.white} strokeWidth={2.5} />
            <Text className="text-white font-black text-base">Try Again</Text>
          </TouchableOpacity>

          {onUseCache && (
            <TouchableOpacity
              className="w-full flex-row justify-center items-center gap-2 bg-slate-100 py-4 rounded-2xl"
              activeOpacity={0.8}
              onPress={onUseCache}
            >
              <Database size={17} color={ICON_COLORS.slate600} strokeWidth={2.5} />
              <Text className="text-slate-600 font-black text-base">Use Saved Questions</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
