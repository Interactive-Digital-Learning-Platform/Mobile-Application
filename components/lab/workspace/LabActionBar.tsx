import { Text, TouchableOpacity, View } from "react-native";
import { Lightbulb } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";

// Bottom action bar. The primary button's label is contextual — the backend verifies the live
// LabRun, so it's "Check <thing>", never "Mark as Done" (which implied the student's word was
// trusted). The 💡 opens the Hint Center; its badge is the only thing that appears unprompted.
export default function LabActionBar({
  checkLabel,
  onCheck,
  checking,
  checkDisabled,
  onOpenHints,
  unreadHintCount,
}: {
  checkLabel: string;
  onCheck: () => void;
  checking: boolean;
  checkDisabled: boolean;
  onOpenHints: () => void;
  unreadHintCount: number;
}) {
  const disabled = checking || checkDisabled;

  return (
    <View className="flex-row items-center gap-3 px-4 pt-3 pb-2 border-t border-slate-100 bg-white">
      <View style={{ position: "relative" }}>
        <TouchableOpacity
          onPress={onOpenHints}
          activeOpacity={0.7}
          className="w-12 h-12 rounded-xl border border-slate-200 items-center justify-center bg-white"
        >
          <Lightbulb size={20} color={ICON_COLORS.primary500} strokeWidth={2} />
        </TouchableOpacity>
        {unreadHintCount > 0 && (
          <View
            className="absolute items-center justify-center bg-primary rounded-full border-2 border-white"
            style={{ top: -5, right: -5, minWidth: 18, height: 18, paddingHorizontal: 4 }}
          >
            <Text className="text-white font-bold" style={{ fontSize: 10 }}>
              {unreadHintCount > 9 ? "9+" : unreadHintCount}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        onPress={onCheck}
        disabled={disabled}
        activeOpacity={0.85}
        className={`flex-1 py-3.5 rounded-xl items-center ${disabled ? "bg-slate-200" : "bg-primary"}`}
      >
        <Text className={`text-base font-bold ${disabled ? "text-slate-400" : "text-white"}`}>
          {checking ? "Checking…" : checkLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
