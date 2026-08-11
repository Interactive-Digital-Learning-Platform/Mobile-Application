import Markdown from "react-native-markdown-display";
import { MessageType } from "@/types/chatModuleTypes";
import { Text, View } from "react-native";
import Animated, {
  SlideInRight,
  SlideInLeft,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import TypingIndicator from "@/components/chat/TypingIndicator";

export default function Message({ message }: { message: MessageType }) {
  const isUser = message.role === "user";
  const isTyping = !isUser && message.isLoading && !message.content;

  const timeLabel = message.createdAt
    ? message.createdAt.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";

  return (
    <Animated.View
      entering={isUser ? SlideInRight.duration(200) : SlideInLeft.duration(200)}
      className={`w-full h-auto flex-row ${isUser ? "justify-end" : "justify-start"} mb-5`}
    >
      {isUser ? (
        <LinearGradient
          colors={["#FFB37C", "#FC6E20"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            maxWidth: "80%",
            borderRadius: 12,
            paddingVertical: 6,
            paddingHorizontal: 10,
            gap: 8,
          }}
        >
          <Text selectable className="text-md font-aregular text-white">
            {message.content}
          </Text>
          <Text className="w-full text-xs font-alight text-right text-white/80">
            {timeLabel}
          </Text>
        </LinearGradient>
      ) : (
        <View className="w-auto flex-col justify-center items-center gap-2 max-w-[80%] bg-[#F1F1F1] py-1.5 px-2.5 rounded-xl">
          {isTyping ? (
            <TypingIndicator />
          ) : message.isLoading ? (
            <Text selectable className="text-md font-aregular">
              {message.content}
            </Text>
          ) : (
            <Markdown
              style={{
                body: { fontSize: 14, fontFamily: "Author-Regular" },
                paragraph: { marginTop: 0, marginBottom: 0 },
              }}
            >
              {message.content}
            </Markdown>
          )}
          {!isTyping && (
            <Text className="w-full text-xs font-alight text-left">
              {timeLabel}
            </Text>
          )}
        </View>
      )}
    </Animated.View>
  );
}
