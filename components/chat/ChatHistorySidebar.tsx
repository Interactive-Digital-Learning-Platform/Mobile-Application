import { fetchUserChats } from "@/api/chatAPI";
import ChatHistoryItem from "@/components/chat/ChatHistoryItem";
import {
  AIChatSidebarProps,
  ChatConversation,
  ChatHistoryListItem,
  ChatHistorySectionName,
} from "@/types/chatModuleTypes";
import { useUser } from "@clerk/expo";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MessageCircleDashed, Plus, TriangleAlert } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PAGE_SIZE = 20;
const SECTION_ORDER: ChatHistorySectionName[] = ["Today", "Last Week", "Older"];

function getSectionName(dateValue: string): ChatHistorySectionName {
  const updatedAt = new Date(dateValue);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);

  if (Number.isNaN(updatedAt.getTime()) || updatedAt < lastWeek) {
    return "Older";
  }
  if (updatedAt >= today) return "Today";
  return "Last Week";
}

function flattenConversations(
  conversations: ChatConversation[],
): ChatHistoryListItem[] {
  const sections = SECTION_ORDER.reduce(
    (groups, title) => {
      groups[title] = [];
      return groups;
    },
    {} as Record<ChatHistorySectionName, ChatConversation[]>,
  );

  conversations.forEach((conversation) => {
    sections[getSectionName(conversation.updated_at)].push(conversation);
  });

  return SECTION_ORDER.flatMap((title) => {
    const sectionConversations = sections[title];
    if (sectionConversations.length === 0) return [];

    return [
      { type: "section" as const, id: "section-" + title, title },
      ...sectionConversations.map((conversation) => ({
        type: "conversation" as const,
        id: conversation.conversation_id,
        conversation,
      })),
    ];
  });
}

/** Warm gradient orb shown whenever there is no real profile photo to load. */
function AvatarGlow() {
  return (
    <LinearGradient
      colors={["#FFC978", "#FC6E20", "#B7350C"]}
      locations={[0, 0.55, 1]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={styles.avatarGlow}
    >
      <LinearGradient
        colors={["rgba(255,255,255,0.85)", "rgba(255,255,255,0)"]}
        start={{ x: 0.15, y: 0.1 }}
        end={{ x: 0.7, y: 0.75 }}
        style={styles.avatarGlowHighlight}
      />
    </LinearGradient>
  );
}

export default function AIChatSidebar({
  selectedConversationID,
  onConversationPress,
  onNewChatPress,
}: AIChatSidebarProps) {
  const { user, isLoaded } = useUser();
  const [avatarFailed, setAvatarFailed] = useState(false);

  const userId = user?.id;

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["ai-conversations", userId],
    queryFn: ({ pageParam }) =>
      fetchUserChats({
        userID: userId!,
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE
        ? undefined
        : allPages.reduce((total, page) => total + page.length, 0),
    enabled: isLoaded && Boolean(userId),
    staleTime: 30_000,
  });

  const listData = useMemo(
    () => flattenConversations(data?.pages.flat() ?? []),
    [data],
  );

  const profileImageUrl = user?.hasImage ? user.imageUrl : undefined;
  const showInitialLoader = !isLoaded || isLoading;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#6CC2FF", "#9AD6FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView edges={["top", "left", "right"]}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>History</Text>
              <Text style={styles.headerDescription}>
                Your recent conversations
              </Text>
            </View>

            <View style={styles.avatarFrame}>
              {profileImageUrl && !avatarFailed ? (
                <Image
                  accessibilityLabel="Your profile picture"
                  source={{ uri: profileImageUrl }}
                  contentFit="cover"
                  transition={150}
                  style={styles.avatar}
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <AvatarGlow />
              )}
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Start a new chat"
            activeOpacity={0.7}
            onPress={onNewChatPress}
            style={styles.newChatButton}
          >
            <Plus color="#FFFFFF" size={19} strokeWidth={2.4} />
            <Text style={styles.newChatText}>New chat</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>

      <SafeAreaView edges={["bottom", "left", "right"]} style={styles.body}>
        {showInitialLoader ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#FC6E20" size="small" />
            <Text style={styles.stateText}>Loading conversations…</Text>
          </View>
        ) : isError ? (
          <View style={styles.centerState}>
            <View style={styles.stateIconFrame}>
              <TriangleAlert size={22} color="#FC6E20" strokeWidth={1.8} />
            </View>
            <Text style={styles.stateTitle}>Couldn’t load history</Text>
            <Text style={styles.stateText} numberOfLines={2}>
              {error instanceof Error ? error.message : "Please try again."}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void refetch();
              }}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <FlashList
            data={listData}
            extraData={selectedConversationID}
            keyExtractor={(item) => item.id}
            getItemType={(item) => item.type}
            renderItem={({ item }) => {
              if (item.type === "section") {
                return (
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{item.title}</Text>
                    <View style={styles.sectionRule} />
                  </View>
                );
              }

              return (
                <ChatHistoryItem
                  conversation={item.conversation}
                  isSelected={
                    item.conversation.conversation_id === selectedConversationID
                  }
                  onPress={onConversationPress}
                />
              );
            }}
            ListEmptyComponent={
              <View style={styles.centerState}>
                <View style={styles.stateIconFrame}>
                  <MessageCircleDashed
                    size={22}
                    color="#FC6E20"
                    strokeWidth={1.8}
                  />
                </View>
                <Text style={styles.stateTitle}>No conversations yet</Text>
                <Text style={styles.stateText}>
                  Your AI chats will appear here.
                </Text>
              </View>
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <ActivityIndicator
                  color="#FC6E20"
                  size="small"
                  style={styles.footerLoader}
                />
              ) : null
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={() => {
              void refetch();
            }}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                void fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.4}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F3F7FC",
    borderRightWidth: 1,
    borderRightColor: "rgba(22, 50, 74, 0.06)",
  },
  header: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingBottom: 20,
    shadowColor: "#16324A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
  },
  headerRow: {
    minHeight: 72,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerCopy: {
    flex: 1,
    paddingRight: 14,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontFamily: "Author-Semibold",
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.2,
  },
  headerDescription: {
    marginTop: 2,
    color: "rgba(255, 255, 255, 0.85)",
    fontFamily: "Author-Regular",
    fontSize: 13,
    lineHeight: 17,
  },
  avatarFrame: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.24)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.85)",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarGlow: {
    width: "100%",
    height: "100%",
  },
  avatarGlowHighlight: {
    width: "100%",
    height: "100%",
  },
  body: {
    flex: 1,
  },
  listContent: {
    paddingTop: 14,
    paddingBottom: 24,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    color: "#FC6E20",
    fontFamily: "Author-Bold",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  sectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(22, 50, 74, 0.08)",
  },
  centerState: {
    flex: 1,
    minHeight: 260,
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  stateIconFrame: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFE4D1",
  },
  stateTitle: {
    color: "#16324A",
    fontFamily: "Author-Semibold",
    fontSize: 16,
    textAlign: "center",
  },
  stateText: {
    marginTop: 5,
    color: "#8CA2B3",
    fontFamily: "Author-Regular",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(252, 110, 32, 0.3)",
  },
  retryText: {
    color: "#FC6E20",
    fontFamily: "Author-Semibold",
    fontSize: 13,
  },
  footerLoader: {
    marginVertical: 18,
  },
  newChatButton: {
    marginHorizontal: 18,
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  newChatText: {
    color: "#FFFFFF",
    fontFamily: "Author-Semibold",
    fontSize: 15,
    lineHeight: 20,
  },
});
