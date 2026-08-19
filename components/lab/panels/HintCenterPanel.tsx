import { Modal, ScrollView, Text, View } from "react-native";
import { Sparkles } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { HintCenterPanelProps } from "@/types/lab";
import Button from "@/components/ui/Button";
import SheetHandle from "@/components/ui/SheetHandle";

const formatTime = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// The single entry point for all AI guidance in the workspace — hints are generated silently
// in the background (mistakes, repeated mistakes, unsafe actions) and queued here rather than
// popping up on their own; the student decides when to open this panel and read them.
export default function HintCenterPanel({ visible, notifications, onClose, onRequestHint, requestingHint }: HintCenterPanelProps) {
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(15,23,42,0.5)" }}>
        <View className="bg-surface rounded-t-3xl p-5" style={{ maxHeight: "75%" }}>
          <SheetHandle />
          <View className="flex-row items-center gap-2 mb-3">
            <Sparkles size={18} color={colors.primary} />
            <Text className="text-lg font-amedium text-ink">AI Tutor</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
            {notifications.length === 0 ? (
              <Text className="font-aregular text-muted py-4">
                No hints yet — ask below, or keep going and the tutor will chime in if you get stuck.
              </Text>
            ) : (
              notifications.map((n, i) => (
                <View key={n.id}>
                  {i > 0 && <View className="h-px my-3" style={{ backgroundColor: colors.borderColorLight }} />}
                  <Text className="font-amedium text-xs text-muted">{formatTime(n.timestamp)}</Text>
                  <Text className="font-aregular text-ink mt-1">{n.message}</Text>
                </View>
              ))
            )}
          </ScrollView>

          <View className="mt-4 gap-2">
            <Button
              label={requestingHint ? "Asking..." : "Ask for a Hint"}
              onPress={onRequestHint}
              disabled={requestingHint}
              variant="primary"
            />
            <Button label="Close" onPress={onClose} variant="secondary" />
          </View>
        </View>
      </View>
    </Modal>
  );
}
