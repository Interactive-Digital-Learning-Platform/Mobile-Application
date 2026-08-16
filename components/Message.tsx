import Markdown from "react-native-markdown-display";
import { MessageType } from "@/types/chatModuleTypes";
import { Text, View } from "react-native";
import Animated, {
  SlideInRight,
  SlideInLeft,
} from "react-native-reanimated";
import TypingIndicator from "@/components/chat/TypingIndicator";
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
      {isUser ? (
        <View
          style={{
            maxWidth: "80%",
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
          <Text selectable className="text-md font-aregular text-white text-justify">
            {message.content}
          </Text>
          <Text
            className="w-full text-xs font-aregular text-right text-white"
            style={{ includeFontPadding: false, textAlignVertical: "center" }}
          >
            {timeLabel}
          </Text>
        </View>
      ) : (
          <View
          style={{
          maxWidth: "80%",
          backgroundColor: "#F1F1F1",
          borderTopLeftRadius: 4,
          borderTopRightRadius: 18,
          borderBottomLeftRadius: 18,
          borderBottomRightRadius: 18,
          paddingVertical: 12,
          paddingHorizontal: 12,
          gap: 8,
        }}>
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
          {!isTyping && (
            <Text
              className="w-full text-xs font-alight text-left"
              style={{ includeFontPadding: false, textAlignVertical: "center" }}
            >
              {timeLabel}
            </Text>
          )}
        </View>
      )}
    </Animated.View>
  );
}
