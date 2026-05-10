import { useEffect } from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { AlertTriangle, LogOut, X } from "lucide-react-native";

interface ExitQuizModalProps {
  visible: boolean;
  answered: number;
  totalQ: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ExitQuizModal({
  visible,
  answered,
  totalQ,
  onCancel,
  onConfirm,
}: ExitQuizModalProps) {
  // Subtle pulse on the warning icon while modal is open
  const scale = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600 }),
          withTiming(1,    { duration: 600 }),
        ),
        -1,
        false,
      );
    } else {
      scale.value = 1;
    }
  }, [visible]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View className="flex-1 justify-center items-center bg-black/60 px-8">
        <View className="bg-white rounded-3xl w-full overflow-hidden shadow-2xl">

          {/* ── Top accent band ── */}
          <View className="bg-primary pt-8 pb-6 items-center px-6">
            <Animated.View
              style={iconStyle}
              className="w-16 h-16 rounded-full bg-white/20 justify-center items-center mb-3"
            >
              <AlertTriangle size={32} color="#fff" strokeWidth={2} />
            </Animated.View>
            <Text className="text-white text-xl font-black">End Quiz?</Text>
            <Text className="text-orange-100 text-sm text-center mt-1">
              The timer keeps running while you decide.
            </Text>
          </View>

          {/* ── Body ── */}
          <View className="px-6 pt-5 pb-6">
            <Text className="text-slate-600 text-sm text-center leading-5 mb-1">
              You've answered{" "}
              <Text className="font-black text-slate-800">{answered}</Text>
              {" "}of{" "}
              <Text className="font-black text-slate-800">{totalQ}</Text>
              {" "}questions.
            </Text>
            <Text className="text-slate-400 text-xs text-center mb-6">
              Your progress will be saved automatically.
            </Text>

            {/* Confirm — End Quiz */}
            <TouchableOpacity
              className="w-full bg-primary flex-row justify-center items-center gap-2 py-4 rounded-2xl mb-3"
              activeOpacity={0.85}
              onPress={onConfirm}
            >
              <LogOut size={18} color="#fff" strokeWidth={2} />
              <Text className="text-white font-black text-base">Yes, End Quiz</Text>
            </TouchableOpacity>

            {/* Cancel — Keep Going */}
            <TouchableOpacity
              className="w-full bg-slate-100 flex-row justify-center items-center gap-2 py-4 rounded-2xl"
              activeOpacity={0.85}
              onPress={onCancel}
            >
              <X size={18} color="#64748b" strokeWidth={2} />
              <Text className="text-slate-600 font-black text-base">Keep Going</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}
