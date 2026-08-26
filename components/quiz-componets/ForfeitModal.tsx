import { Modal, Text, TouchableOpacity, View } from "react-native";
import { AlertTriangle, LogOut, X } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";

interface ForfeitModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function ForfeitModal({
  visible,
  onCancel,
  onConfirm,
  title = "Forfeit Match?",
  message = "You'll lose this match and rating points.",
  confirmLabel = "Yes, Forfeit",
  cancelLabel = "Keep Playing",
}: ForfeitModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View className="flex-1 justify-center items-center bg-black/60 px-8">
        <View className="bg-white rounded-3xl w-full overflow-hidden shadow-2xl">
          <View className="bg-rose-500 pt-8 pb-6 items-center px-6">
            <View className="w-16 h-16 rounded-full bg-white/20 justify-center items-center mb-3">
              <AlertTriangle size={32} color={ICON_COLORS.white} strokeWidth={2} />
            </View>
            <Text className="text-white text-xl font-black">{title}</Text>
            <Text className="text-white/80 text-sm text-center mt-1">{message}</Text>
          </View>
          <View className="px-6 pt-5 pb-6">
            <TouchableOpacity
              className="w-full bg-rose-500 flex-row justify-center items-center gap-2 py-4 rounded-2xl mb-3"
              activeOpacity={0.85}
              onPress={onConfirm}
            >
              <LogOut size={18} color={ICON_COLORS.white} strokeWidth={2} />
              <Text className="text-white font-black text-base">{confirmLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="w-full bg-slate-100 flex-row justify-center items-center gap-2 py-4 rounded-2xl"
              activeOpacity={0.85}
              onPress={onCancel}
            >
              <X size={18} color={ICON_COLORS.slate500} strokeWidth={2} />
              <Text className="text-slate-600 font-black text-base">{cancelLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
