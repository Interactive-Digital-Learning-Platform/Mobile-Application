import { fetchSharedChat } from "@/api/chatAPI";
import Message from "@/components/Message";
import { colors } from "@/constants/colors";
import { sharedMessageIndex, sharedMessagesToChat } from "@/utils/chatShare";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ChevronLeft,
  CloudOff,
  Eye,
  Link2Off,
  LucideIcon,
} from "lucide-react-native";
import { useMemo } from "react";
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const isNotFound = (error: unknown) =>
  isAxiosError(error) && error.response?.status === 404;

export default function SharedChatScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, error, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["shared-chat", token],
    queryFn: () => fetchSharedChat(token),
    enabled: Boolean(token),
    staleTime: 60_000,
    // A missing link won't appear on retry; only retry real failures.
    retry: (failureCount, err) => !isNotFound(err) && failureCount < 2,
  });

  const messages = useMemo(
    () => (data ? sharedMessagesToChat(data.messages) : []),
    [data],
  );

  const sharedOn = data
    ? new Date(data.shared_at).toLocaleDateString([], {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  // Opened from a link on a cold start there's nothing to go back to.
  const leave = () =>
    router.canGoBack() ? router.back() : router.replace("/");

  const openSources = (messageID: string) => {
    const index = sharedMessageIndex(messageID);
    if (index == null) return;
    router.push(
      `/(main)/sources/${index}?sharedToken=${encodeURIComponent(token)}` as any,
    );
  };

  return (
    <>
      <StatusBar
        backgroundColor="transparent"
        translucent
        barStyle="dark-content"
      />
      <LinearGradient
        colors={["#7CC7FF", "#A8DAFF", "#ffffff", "#FFFFFF"]}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ flex: 1 }}
      >
        <View className="w-full flex-1 px-4">
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={10}
              onPress={leave}
              style={styles.headerButton}
            >
              <ChevronLeft size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <View className="flex-1 items-center mx-2">
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                className="text-white font-amedium text-xl"
              >
                {data?.title?.trim() || "Shared chat"}
              </Text>
            </View>
            {/* Balances the back button so the title stays centred. */}
            <View style={styles.headerButton} />
          </View>

          {isLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : isError ? (
            isNotFound(error) ? (
              <StatusMessage
                icon={Link2Off}
                title="This link isn't available"
                body="The chat may have been deleted, or its link was turned off."
                actionLabel="Go to Nous"
                onAction={() => router.replace("/")}
              />
            ) : (
              <StatusMessage
                icon={CloudOff}
                title="Couldn't load this chat"
                body="Check your connection and try again."
                actionLabel={isRefetching ? "Retrying…" : "Try again"}
                actionDisabled={isRefetching}
                onAction={() => refetch()}
              />
            )
          ) : (
            <>
              <FlashList
                data={messages}
                keyExtractor={(item) => item.localID}
                renderItem={({ item }) => (
                  <Message
                    message={item}
                    onViewSources={() => openSources(item.id)}
                  />
                )}
                className="w-full flex-1"
                contentContainerClassName="w-full h-auto flex-col justify-start"
                showsVerticalScrollIndicator={false}
              />

              <View style={{ paddingBottom: insets.bottom + 12 }}>
                <View style={styles.footerCard}>
                  <View style={styles.footerIcon}>
                    <Eye size={18} color="#6B7280" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.footerTitle}>Read-only copy</Text>
                    <Text style={styles.footerBody}>
                      {sharedOn ? `Shared on ${sharedOn}` : "Shared with you"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.8}
                    onPress={() => router.replace("/")}
                    style={styles.footerButton}
                  >
                    <Text style={styles.footerButtonLabel}>
                      Start your own chat
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>
      </LinearGradient>
    </>
  );
}

function StatusMessage({
  icon: Icon,
  title,
  body,
  actionLabel,
  actionDisabled = false,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel: string;
  actionDisabled?: boolean;
  onAction: () => void;
}) {
  return (
    <View className="flex-1 justify-center items-center px-6">
      <View style={styles.statusIcon}>
        <Icon size={26} color="#6B7280" />
      </View>
      <Text style={styles.statusTitle}>{title}</Text>
      <Text style={styles.statusBody}>{body}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.8}
        disabled={actionDisabled}
        onPress={onAction}
        style={[styles.statusButton, actionDisabled && { opacity: 0.6 }]}
      >
        <Text style={styles.footerButtonLabel}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  headerButton: {
    width: 32,
    height: 32,
    marginLeft: -6,
    justifyContent: "center",
    alignItems: "center",
  },
  // Same surface as the chat input card, standing in for it on a read-only chat.
  footerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: 28,
    backgroundColor: "#F2F2F2",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 6,
  },
  footerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  footerTitle: {
    color: "#0F172A",
    fontFamily: "Author-Medium",
    fontSize: 15,
    lineHeight: 19,
  },
  footerBody: {
    color: "#6B7280",
    fontFamily: "Author-Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  footerButton: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  footerButtonLabel: {
    color: "#FFFFFF",
    fontFamily: "Author-Medium",
    fontSize: 14,
    lineHeight: 18,
  },
  statusIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F2F2F2",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  statusTitle: {
    color: "#0F172A",
    fontFamily: "Author-Semibold",
    fontSize: 20,
    lineHeight: 26,
    textAlign: "center",
  },
  statusBody: {
    color: "#64748B",
    fontFamily: "Author-Regular",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 6,
  },
  statusButton: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
});
