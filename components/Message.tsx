import { MessageType } from "@/types";
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
        <Text className="text-md font-aregular">{message.content}</Text>
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
