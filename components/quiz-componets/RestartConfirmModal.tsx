import { Modal, View, Text, TouchableOpacity } from "react-native";
import { RotateCcw, X } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";

interface RestartConfirmModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function RestartConfirmModal({
  visible,
  onCancel,
  onConfirm,
}: RestartConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View className="flex-1 justify-center items-center bg-black/60 px-10">
        <View className="bg-white rounded-3xl w-full overflow-hidden shadow-2xl">

          <View className="bg-primary pt-7 pb-5 items-center px-6">
            <View className="w-14 h-14 rounded-full bg-white/20 justify-center items-center mb-2">
              <RotateCcw size={28} color={ICON_COLORS.white} strokeWidth={2.2} />
            </View>
            <Text className="text-white text-lg font-black">Restart Quiz?</Text>
            <Text className="text-amber-100 text-xs text-center mt-1">
              Your current answers will be lost.
            </Text>
          </View>

          <View className="px-6 pt-5 pb-6 gap-3">
            <TouchableOpacity
              className="w-full bg-primary flex-row justify-center items-center gap-2 py-4 rounded-2xl"
              activeOpacity={0.85}
              onPress={onConfirm}
            >
              <RotateCcw size={18} color={ICON_COLORS.white} strokeWidth={2} />
              <Text className="text-white font-black text-base">Yes, Restart</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="w-full bg-slate-100 flex-row justify-center items-center gap-2 py-4 rounded-2xl"
              activeOpacity={0.85}
              onPress={onCancel}
            >
              <X size={18} color={ICON_COLORS.slate500} strokeWidth={2} />
              <Text className="text-slate-600 font-black text-base">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
