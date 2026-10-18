import { useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";

// Compact workspace header. The bottom tab bar is already hidden for [experimentId]/* routes
// (see app/(tabs)/_layout.tsx), so this "← Exit" control is how the student leaves an active
// experiment — with a confirm, since the in-progress session is left as-is on the server.
export default function LabExperimentHeader({ title, onExit }: { title: string; onExit: () => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <View className="flex-row items-center gap-2 px-3 py-2.5 bg-white border-b border-slate-100">
      <TouchableOpacity
        className="flex-row items-center gap-1 pl-1 pr-2 py-1.5 rounded-full bg-slate-100"
        activeOpacity={0.7}
        onPress={() => setConfirming(true)}
      >
        <ChevronLeft size={16} color={ICON_COLORS.slate500} strokeWidth={2.5} />
        <Text className="text-[12px] font-bold text-slate-600">Exit</Text>
      </TouchableOpacity>
      <Text className="flex-1 text-[13px] font-bold text-slate-800 text-center mr-14" numberOfLines={1}>
        {title}
      </Text>

      <Modal transparent animationType="fade" visible={confirming} onRequestClose={() => setConfirming(false)}>
        <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: "rgba(15,23,42,0.5)" }}>
          <View className="bg-white rounded-2xl p-5 w-full">
            <Text className="text-base font-black text-slate-800">Leave the experiment?</Text>
            <Text className="text-[13px] text-slate-500 leading-5 mt-1.5">
              Your progress so far is saved. You can pick this practical up again from where you left off.
            </Text>
            <View className="flex-row gap-2 mt-4">
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl items-center border border-slate-200"
                activeOpacity={0.8}
                onPress={() => setConfirming(false)}
              >
                <Text className="text-slate-600 text-sm font-bold">Stay</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl items-center bg-primary"
                activeOpacity={0.85}
                onPress={() => {
                  setConfirming(false);
                  onExit();
                }}
              >
                <Text className="text-white text-sm font-bold">Leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
