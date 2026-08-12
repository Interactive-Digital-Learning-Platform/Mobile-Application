import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import Animated, { AnimatedStyle } from "react-native-reanimated";
import { Clock, BarChart2, RotateCcw } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { ViewStyle } from "react-native";

interface TimesUpModalProps {
  timeUp: boolean;
  answered: number;
  totalQ: number;
  restart: () => void;
  isSubmitting: boolean;
  onShowResults: () => void;
  shakeStyle: AnimatedStyle<ViewStyle>;
}

export default function TimesUpModel({
  timeUp,
  answered,
  totalQ,
  restart,
  isSubmitting,
  onShowResults,
  shakeStyle,
}: TimesUpModalProps) {
  return (
    <Modal visible={timeUp} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/50 px-8">
        <Animated.View
          style={shakeStyle}
          className="bg-white rounded-3xl p-8 w-full items-center shadow-2xl"
        >
          <View className="w-16 h-16 rounded-full bg-slate-100 justify-center items-center mb-4">
            <Clock size={30} color={ICON_COLORS.primary500} strokeWidth={2} />
          </View>
          <Text className="text-2xl font-black text-slate-800 mb-1">Time's Up!</Text>
          <Text className="text-sm text-slate-500 text-center mb-6">
            You answered {answered} of {totalQ} questions.
          </Text>

          <TouchableOpacity
            className="w-full bg-primary flex-row justify-center items-center gap-2 py-4 rounded-2xl mb-3"
            activeOpacity={0.85}
            disabled={isSubmitting}
            onPress={onShowResults}
          >
            {isSubmitting
              ? <ActivityIndicator size="small" color={ICON_COLORS.white} />
              : <BarChart2 size={18} color={ICON_COLORS.white} strokeWidth={2} />}
            <Text className="text-white font-black text-base">
              {isSubmitting ? "Saving…" : "Show Results"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`w-full bg-slate-100 flex-row justify-center items-center gap-2 py-4 rounded-2xl ${isSubmitting ? "opacity-40" : ""}`}
            activeOpacity={0.85}
            disabled={isSubmitting}
            onPress={restart}
          >
            <RotateCcw size={18} color={ICON_COLORS.slate500} strokeWidth={2} />
            <Text className="text-slate-600 font-black text-base">Restart Quiz</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}