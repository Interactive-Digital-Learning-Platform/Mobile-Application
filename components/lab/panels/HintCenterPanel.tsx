import { Modal, ScrollView, Text, View } from "react-native";
import { Sparkles, Unlock } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { HintCenterPanelProps } from "@/types/lab";
import Button from "@/components/ui/Button";
import SheetHandle from "@/components/ui/SheetHandle";

const formatTime = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// The single entry point for all AI guidance in the workspace — hints are generated silently
// in the background (mistakes, repeated mistakes, unsafe actions) and queued here rather than
// popping up on their own; the student decides when to open this panel and read them. Help (the
// answer reveal) only appears once helpAvailable is true (hint level 3 already reached for this
// step, enforced server-side too) — never offered as a shortcut around the hint levels.
//
// `notifications` arrives oldest-first (the order hints were actually requested/triggered in) —
// this panel renders them newest-first, since the most recent hint is the one most relevant to
// what the student is stuck on right now.
export default function HintCenterPanel({
  visible,
  notifications,
  onClose,
  onRequestHint,
  requestingHint,
  helpAvailable,
  onRequestHelp,
  requestingHelp,
  helpReveal,
}: HintCenterPanelProps) {
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
              [...notifications].reverse().map((n, i) => (
                <View key={n.id}>
                  {i > 0 && <View className="h-px my-3" style={{ backgroundColor: colors.borderColorLight }} />}
                  <Text className="font-amedium text-xs text-muted">{formatTime(n.timestamp)}</Text>
                  <Text className="font-aregular text-ink mt-1">{n.message}</Text>
                </View>
              ))
            )}

            {helpReveal && (
              <View className="mt-3 p-3 rounded-2xl bg-amber-50">
                <View className="flex-row items-center gap-1.5">
                  <Unlock size={14} color="#92400E" />
                  <Text className="font-amedium text-xs text-amber-900">ANSWER REVEALED</Text>
                </View>
                {helpReveal.equipment.length > 0 && (
                  <Text className="font-aregular text-amber-900 mt-2">
                    Equipment: {helpReveal.equipment.join(", ")}
                  </Text>
                )}
                {helpReveal.chemicals.length > 0 && (
                  <Text className="font-aregular text-amber-900 mt-1">
                    Chemicals: {helpReveal.chemicals.map((c) => c.name).join(", ")}
                  </Text>
                )}
                <Text className="font-aregular text-amber-900 mt-1">{helpReveal.explanation}</Text>
              </View>
            )}
          </ScrollView>

          <View className="mt-4 gap-2">
            <Button
              label={requestingHint ? "Asking..." : "Ask for a Hint"}
              onPress={onRequestHint}
              disabled={requestingHint}
              variant="primary"
            />
            {helpAvailable && !helpReveal && (
              <Button
                label={requestingHelp ? "Revealing..." : "Help — Show Me the Answer"}
                onPress={onRequestHelp}
                disabled={requestingHelp}
                variant="secondary"
              />
            )}
            <Button label="Close" onPress={onClose} variant="secondary" />
          </View>
        </View>
      </View>
    </Modal>
  );
}
