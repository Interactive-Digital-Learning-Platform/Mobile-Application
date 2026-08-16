import { ChatHistoryItemProps } from "@/types/chatModuleTypes";
import { History } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

export default function ChatHistoryItem({
  conversation,
  isSelected = false,
  onPress,
}: ChatHistoryItemProps) {
  const title = conversation.title?.trim() || "Untitled conversation";

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={"Open conversation: " + title}
      activeOpacity={0.6}
      onPress={() => onPress?.(conversation)}
      style={[styles.row, isSelected && styles.rowSelected]}
    >
      <History
        size={16}
        strokeWidth={2}
        color={isSelected ? "#FC6E20" : "#94A7B6"}
      />
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[styles.title, isSelected && styles.titleSelected]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    marginHorizontal: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowSelected: {
    backgroundColor: "rgba(252, 110, 32, 0.08)",
  },
  title: {
    flex: 1,
    color: "#16324A",
    fontFamily: "Author-Regular",
    fontSize: 15,
    lineHeight: 19,
  },
  titleSelected: {
    color: "#16324A",
    fontFamily: "Author-Medium",
  },
});
