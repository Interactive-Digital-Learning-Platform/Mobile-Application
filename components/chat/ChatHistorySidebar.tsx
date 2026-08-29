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
import { LinearGradient } from "expo-linear-gradient";
import {
  MessageCircleDashed,
  SquarePen,
  TriangleAlert,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PAGE_SIZE = 20;
/** Gradient fades out just before the sidebar's vertical center. */
const GRADIENT_HEIGHT_RATIO = 0.48;
const SECTION_ORDER: ChatHistorySectionName[] = ["Today", "Last Week", "Older"];

type StatusKind = "loading" | "error" | "empty";

type SidebarListItem =
  | { type: "status"; id: string; status: StatusKind }
  | ChatHistoryListItem;

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

export default function AIChatSidebar({
  selectedConversationID,
  onConversationPress,
  onNewChatPress,
}: AIChatSidebarProps) {
  const { user, isLoaded } = useUser();
  const [sidebarHeight, setSidebarHeight] = useState(0);

  const userId = user?.id;

  const handleSidebarLayout = (event: LayoutChangeEvent) => {
    setSidebarHeight(event.nativeEvent.layout.height);
  };

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

  const showInitialLoader = !isLoaded || isLoading;

  const items: SidebarListItem[] = useMemo(() => {
    if (showInitialLoader) {
      return [{ type: "status", id: "status-loading", status: "loading" }];
    }
    if (isError) {
      return [{ type: "status", id: "status-error", status: "error" }];
    }
    if (listData.length === 0) {
      return [{ type: "status", id: "status-empty", status: "empty" }];
    }
    return listData;
  }, [listData, showInitialLoader, isError]);

  return (
    <View style={styles.root} onLayout={handleSidebarLayout}>
      {sidebarHeight > 0 ? (
        <LinearGradient
          pointerEvents="none"
          colors={[
            "rgba(124, 199, 255, 0.9)",
            "rgba(124, 199, 255, 0.55)",
            "rgba(124, 199, 255, 0.18)",
            "rgba(124, 199, 255, 0)",
          ]}
          locations={[0, 0.35, 0.7, 1]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[
            styles.gradient,
            { height: sidebarHeight * GRADIENT_HEIGHT_RATIO },
          ]}
        />
      ) : null}

      <SafeAreaView edges={["top", "left", "right"]}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>History</Text>
            <Text style={styles.headerDescription}>Your recent conversations</Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Start a new chat"
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={onNewChatPress}
            style={styles.newChatButton}
          >
            <SquarePen color="#FFFFFF" size={21} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <SafeAreaView edges={["bottom", "left", "right"]} style={styles.body}>
        <FlashList
          data={items}
          extraData={selectedConversationID}
          keyExtractor={(item) => item.id}
          getItemType={(item) => item.type}
          renderItem={({ item }) => {
            if (item.type === "status") {
              if (item.status === "loading") {
                return (
                  <View style={styles.centerState}>
                    <ActivityIndicator color="#FC6E20" size="small" />
                    <Text style={styles.stateText}>Loading conversations…</Text>
                  </View>
                );
              }

              if (item.status === "error") {
                return (
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
                );
              }

              return (
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
              );
            }

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
  gradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
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
    color: "rgba(255, 255, 255, 0.9)",
    fontFamily: "Author-Regular",
    fontSize: 15,
    lineHeight: 19,
  },
  body: {
    flex: 1,
  },
  listContent: {
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
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
