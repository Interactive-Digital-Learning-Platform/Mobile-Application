/**
 * QuizErrorScreen.tsx
 * ────────────────────
 * Error fallback screen shown when quiz generation fails or returns no questions.
 * Used exclusively by the quiz-session screen.
 */

import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RefreshCw, Database } from "lucide-react-native";

interface QuizErrorScreenProps {
  message: string;
  onRetry: () => void;
  onUseCache?: () => void;
}

export default function QuizErrorScreen({
  message,
  onRetry,
  onUseCache,
}: QuizErrorScreenProps) {
  return (
    <SafeAreaView
      edges={["top"]}
      className="flex-1 bg-white justify-center items-center px-8"
    >
      <View className="w-20 h-20 rounded-full bg-rose-100 justify-center items-center mb-4">
        <Text className="text-4xl">⚠️</Text>
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
          <RefreshCw size={17} color="#fff" strokeWidth={2.5} />
          <Text className="text-white font-black text-base">Try Again</Text>
        </TouchableOpacity>

        {onUseCache && (
          <TouchableOpacity
            className="w-full flex-row justify-center items-center gap-2 bg-slate-100 py-4 rounded-2xl"
            activeOpacity={0.8}
            onPress={onUseCache}
          >
            <Database size={17} color="#475569" strokeWidth={2.5} />
            <Text className="text-slate-600 font-black text-base">Use Saved Questions</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
