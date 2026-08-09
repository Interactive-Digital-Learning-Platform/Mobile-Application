import { ChatHistoryItemProps } from "@/types/chatModuleTypes";
import { ChevronRight, FileText, MessageCircle } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

function formatRelativeTime(dateValue: string): string {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ChatHistoryItem({
  conversation,
  isSelected = false,
  onPress,
}: ChatHistoryItemProps) {
  const title = conversation.title?.trim() || "Untitled conversation";
  const isFromNote = Boolean(conversation.filename);
  const timeAgo = formatRelativeTime(conversation.updated_at);

  const metaText = isFromNote
    ? conversation.filename
    : `${conversation.message_count} ${conversation.message_count === 1 ? "message" : "messages"}`;

  const TileIcon = isFromNote ? FileText : MessageCircle;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={"Open conversation: " + title}
      activeOpacity={0.7}
      onPress={() => onPress?.(conversation)}
      style={styles.touchTarget}
    >
      <View style={[styles.card, isSelected && styles.selectedCard]}>
        {isSelected ? <View style={styles.accentBar} /> : null}

        <View
          style={[
            styles.tile,
            isFromNote ? styles.tileNote : styles.tileAsk,
            isSelected && (isFromNote ? styles.tileNoteFilled : styles.tileAskFilled),
          ]}
        >
          <TileIcon
            size={17}
            strokeWidth={2}
            color={
              isSelected ? "#FFFFFF" : isFromNote ? "#2E86C1" : "#FC6E20"
            }
          />
        </View>

        <View style={styles.body}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.title}>
            {title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaTime}>{timeAgo}</Text>
            {metaText ? (
              <>
                <View style={styles.metaDot} />
                <Text numberOfLines={1} style={styles.metaText}>
                  {metaText}
                </Text>
              </>
            ) : null}
          </View>
        </View>

        <ChevronRight size={16} color="#B7C4CF" strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    marginHorizontal: 14,
    marginBottom: 8,
  },
  card: {
    minHeight: 62,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(22, 50, 74, 0.06)",
    shadowColor: "#16324A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  selectedCard: {
    backgroundColor: "#FFF6F0",
    borderColor: "rgba(252, 110, 32, 0.24)",
    shadowOpacity: 0.1,
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 1.5,
    backgroundColor: "#FC6E20",
  },
  tile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tileNote: {
    backgroundColor: "#E4F1FF",
  },
  tileAsk: {
    backgroundColor: "#FFE4D1",
  },
  tileNoteFilled: {
    backgroundColor: "#2E86C1",
  },
  tileAskFilled: {
    backgroundColor: "#FC6E20",
  },
  body: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: "#16324A",
    fontFamily: "Author-Medium",
    fontSize: 15,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaTime: {
    color: "#8CA2B3",
    fontFamily: "Author-Regular",
    fontSize: 12,
    lineHeight: 15,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#C4D1DB",
  },
  metaText: {
    flex: 1,
    color: "#8CA2B3",
    fontFamily: "Author-Regular",
    fontSize: 12,
    lineHeight: 15,
  },
});
