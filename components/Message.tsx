import Markdown from "react-native-markdown-display";
import { MessageType } from "@/types/chatModuleTypes";
import { Text, View } from "react-native";
import Animated, {
  SlideInRight,
  SlideInLeft,
} from "react-native-reanimated";
import TypingIndicator from "@/components/chat/TypingIndicator";
import MessageAttachment from "@/components/chat/MessageAttachment";
import { chatMarkdownItInstance, chatMarkdownStyle } from "@/constants/markdownStyles";

export default function Message({ message }: { message: MessageType }) {
  const isUser = message.role === "user";
  const isTyping = !isUser && message.isLoading && !message.content;

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
              {message.content}
            </Text>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: "#F1F1F1",
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
            ) : message.isLoading ? (
              <Text selectable className="text-md font-aregular text-justify">
                {message.content}
              </Text>
            ) : (
              <Markdown
                markdownit={chatMarkdownItInstance}
                style={chatMarkdownStyle}
              >
                {message.content}
              </Markdown>
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
