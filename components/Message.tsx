import Markdown from "react-native-markdown-display";
import { MessageType } from "@/types/chatModuleTypes";
import { Text, View } from "react-native";
import Animated, {
  SlideInRight,
  SlideInLeft,
} from "react-native-reanimated";

export default function Message({ message }: { message: MessageType }) {
  return (
    <Animated.View
      entering={
        message.role === "user"
          ? SlideInRight.duration(200)
          : SlideInLeft.duration(200)
      }
      className={`w-full h-auto flex-row ${message.role === "user" ? "justify-end" : "justify-start"} mb-5 `}
    >
      <View className="w-auto flex-col justify-center items-center gap-2 max-w-[80%] bg-slate-200 py-1.5 px-2.5 rounded-xl">
        {message.role === "user" ? (
          <Text className="text-md font-aregular">{message.content}</Text>
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
        <Text
          className={`w-full text-xs font-alight ${message.role === "user" ? "text-right" : "text-left"}`}
        >
          {message.createdAt &&
            message.createdAt.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
        </Text>
      </View>
    </Animated.View>
  );
}
