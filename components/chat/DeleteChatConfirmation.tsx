import { History, Trash2 } from "lucide-react-native";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { Easing, Keyframe } from "react-native-reanimated";

type Props = {
  chatTitle?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  // While true both buttons are disabled and the card stays up, so the chat
  // behind it can't be interacted with until the delete actually resolves.
  isDeleting?: boolean;
};

const DESTRUCTIVE = "#E11D48";

const cardEntering = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 12 }, { scale: 0.96 }] },
  100: {
    opacity: 1,
    transform: [{ translateY: 0 }, { scale: 1 }],
    easing: Easing.out(Easing.cubic),
  },
}).duration(220);

// Rendered inside ChatOptionsMenu's Modal rather than as its own Modal, so
// there's never a second Modal opening while the first is still dismissing.
export default function DeleteChatConfirmation({
  chatTitle,
  onCancel,
  onConfirm,
  isDeleting = false,
}: Props) {
  const title = chatTitle?.trim() || "Untitled conversation";

  return (
    <Animated.View
      entering={cardEntering}
      accessibilityViewIsModal
      className="w-full bg-white px-5 pt-6 pb-5"
      style={{
        maxWidth: 380,
        borderRadius: 28,
        borderWidth: 1.5,
        borderColor: "#FFFFFF",
      }}
    >
      <View className="items-center">
        <View className="w-16 h-16 rounded-full bg-[#FFF1F2] justify-center items-center">
          <View className="w-11 h-11 rounded-full bg-[#FFE4E6] justify-center items-center">
            <Trash2 size={22} color={DESTRUCTIVE} />
          </View>
        </View>

        <Text
          accessibilityRole="header"
          className="text-2xl font-asemibold text-[#0F172A] mt-4"
        >
          Delete this chat?
        </Text>
        <Text className="text-[15px] leading-[22px] font-aregular text-[#64748B] text-center mt-1.5 px-2">
          Its messages and any files you attached will be removed for good.
        </Text>
      </View>

      {/* The chat being deleted, drawn like its row in the history sidebar. */}
      <View className="flex-row items-center gap-3 mt-5 px-4 py-3.5 rounded-2xl bg-[#F2F2F2]">
        <History size={16} strokeWidth={2} color="#94A7B6" />
        <Text
          numberOfLines={2}
          className="flex-1 text-[15px] leading-[20px] font-amedium text-[#16324A]"
        >
          {title}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: isDeleting }}
          activeOpacity={0.7}
          onPress={onCancel}
          disabled={isDeleting}
          style={[
            styles.button,
            styles.cancelButton,
            isDeleting && styles.dimmed,
          ]}
        >
          <Text style={[styles.buttonLabel, styles.cancelLabel]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Delete chat"
          accessibilityState={{ disabled: isDeleting, busy: isDeleting }}
          activeOpacity={0.8}
          onPress={onConfirm}
          disabled={isDeleting}
          style={[styles.button, styles.deleteButton]}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Trash2 size={18} color="#FFFFFF" />
          )}
          <Text style={[styles.buttonLabel, styles.deleteLabel]}>
            {isDeleting ? "Deleting…" : "Delete"}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// Buttons use StyleSheet rather than className: their layout and fills have to
// apply reliably, and the rest of this card's className styling doesn't need to.
const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  cancelButton: {
    backgroundColor: "#F2F2F2",
    borderWidth: 1,
    borderColor: "#E3E1E1",
  },
  deleteButton: {
    backgroundColor: DESTRUCTIVE,
  },
  dimmed: {
    opacity: 0.5,
  },
  buttonLabel: {
    fontSize: 16,
    lineHeight: 20,
  },
  cancelLabel: {
    color: "#0F172A",
    fontFamily: "Author-Medium",
  },
  deleteLabel: {
    color: "#FFFFFF",
    fontFamily: "Author-Semibold",
  },
});
