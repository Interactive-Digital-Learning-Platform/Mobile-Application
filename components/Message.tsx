import { useMemo } from "react";
import Markdown from "react-native-markdown-display";
import { MessageType } from "@/types/chatModuleTypes";
import { Pressable, Text, View } from "react-native";
import Animated, {
  SlideInRight,
  SlideInLeft,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { ChevronRight, FileText } from "lucide-react-native";
import TypingIndicator from "@/components/chat/TypingIndicator";
import MessageAttachment from "@/components/chat/MessageAttachment";
import { chatMarkdownItInstance, chatMarkdownStyle } from "@/constants/markdownStyles";
import { stripInlineCitations } from "@/utils/chatText";

const ASSISTANT_BUBBLE_BG = "#EEF3FB";
const ASSISTANT_BUBBLE_BORDER = "#E2EAF4";
const SOURCES_ACCENT = "#3C6DB0";

export default function Message({ message }: { message: MessageType }) {
  const router = useRouter();
  const isUser = message.role === "user";

  const sourceCount = message.sources?.length ?? 0;
  const sourceMessageID = message.serverID ?? message.id;
  const showSources =
    !isUser &&
    !message.isLoading &&
    !message.isError &&
    sourceCount > 0 &&
    !sourceMessageID.startsWith("local-");

  const rawBody =
    message.isTranslated && message.translatedContent
      ? message.translatedContent
      : message.content;

  const body = useMemo(
    () =>
      isUser || message.isError ? rawBody : stripInlineCitations(rawBody),
    [isUser, message.isError, rawBody],
  );

  const isTyping = !isUser && message.isLoading && !body;

  const timeLabel = message.createdAt
    ? message.createdAt.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  return (
    <Animated.View
      entering={isUser ? SlideInRight.duration(200) : SlideInLeft.duration(200)}
      className={`w-full h-auto flex-row ${isUser ? "justify-end" : "justify-start"} mb-5`}
    >
      <View style={{ maxWidth: "80%", alignItems: isUser ? "flex-end" : "flex-start" }}>
        {isUser ? (
          <View
            style={{
              backgroundColor: "#FC6E20",
              borderTopLeftRadius: 18,
              borderTopRightRadius: 4,
              borderBottomLeftRadius: 18,
              borderBottomRightRadius: 18,
              paddingVertical: 12,
              paddingHorizontal: 12,
              gap: 8,
            }}
          >
            {message.attachments?.map((att) => (
              <MessageAttachment key={att.localID} attachment={att} onUserBubble />
            ))}
            <Text selectable className="text-md font-aregular text-white text-justify">
              {body}
            </Text>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: ASSISTANT_BUBBLE_BG,
              borderWidth: 1,
              borderColor: ASSISTANT_BUBBLE_BORDER,
              borderTopLeftRadius: 4,
              borderTopRightRadius: 18,
              borderBottomLeftRadius: 18,
              borderBottomRightRadius: 18,
              paddingVertical: isTyping ? 6 : 12,
              paddingHorizontal: isTyping ? 8 : 12,
              gap: 8,
            }}
          >
            {message.attachments?.map((att) => (
              <MessageAttachment
                key={att.localID}
                attachment={att}
                onUserBubble={false}
              />
            ))}
            {isTyping ? (
              <TypingIndicator />
            ) : message.isError ? (
              <Text selectable className="text-md font-aregular text-justify">
                {body}
              </Text>
            ) : (
              <Markdown
                markdownit={chatMarkdownItInstance}
                style={chatMarkdownStyle}
              >
                {body}
              </Markdown>
            )}
            {!isTyping && message.translationFailed && (
              <Text className="text-xs font-alight text-[#8A8A8A]">
                Shown in English — Sinhala translation unavailable.
              </Text>
            )}
            {showSources && (
              <View style={{ flexDirection: "row" }}>
                <Pressable
                  onPress={() =>
                    router.push(`/(main)/sources/${sourceMessageID}` as any)
                  }
                  hitSlop={6}
                  android_ripple={{ color: "rgba(60,109,176,0.22)" }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 5,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    backgroundColor: "rgba(60,109,176,0.10)",
                  }}
                >
                  <FileText size={12} color={SOURCES_ACCENT} />
                  <Text
                    numberOfLines={1}
                    className="text-xs font-amedium"
                    style={{ color: SOURCES_ACCENT, marginHorizontal: 5 }}
                  >
                    View sources
                  </Text>
                  <ChevronRight size={13} color={SOURCES_ACCENT} />
                </Pressable>
              </View>
            )}
          </View>
        )}
        {!isTyping && timeLabel !== "" && (
          <Text
            className={`text-xs ${isUser ? "font-aregular" : "font-alight"} mt-1`}
            style={{ includeFontPadding: false, textAlignVertical: "center" }}
          >
            {timeLabel}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}
