import { colors } from "@/constants/colors";
import { Paperclip, Send, TextAlignStart } from "lucide-react-native";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useUser } from "@clerk/expo";
import { quickActions } from "@/constants/quickActions";
import { MessageType, QuickActionType } from "@/types";
import QuickAction from "@/components/QuickAction";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import { sampleMessages } from "@/constants/messages";
import Message from "@/components/Message";
import { useRef, useState } from "react";

export default function AIChat() {
  const { user, isLoaded } = useUser();
  const chatRef = useRef<FlashListRef<MessageType>>(null);
  const [messages, setMessages] = useState(sampleMessages);
  const [input, setInput] = useState("");

  const handleSendMessage = () => {
    const msg: MessageType = {
      id: "29",
      content: input,
      type: "text",
      role: "user",
      createdAt: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, msg]);
    setInput("");

    setTimeout(() => {
      chatRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  return (
    <LinearGradient
      colors={["#d8e4fa", "#ffffff"]}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView className="w-full flex-1 px-4 pt-4">
        <KeyboardAvoidingView
          className="w-full flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View className="w-full h-auto justify-center items-start">
            <TextAlignStart size={28} color="#323232" />
          </View>

          <FlashList
            ref={chatRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <Message key={item.id} message={item} />}
            className="w-full flex-1"
            contentContainerClassName="w-full h-auto flex-col justify-start"
            ListHeaderComponent={
              messages.length === 0 ? (
                <View className="w-full h-auto mb-12">
                  <View className="w-full h-auto mt-5 justify-center items-center">
                    <Text className="w-3/4 text-4xl font-amedium text-center text-[#323232]">
                      Hello{" "}
                      {isLoaded && user?.username
                        ? user?.username?.charAt(0).toUpperCase() +
                          user?.username?.slice(1)
                        : "..."}
                      , How can I help you...
                    </Text>
                  </View>
                  <View className="w-full mt-8 flex-col justify-start items-center gap-4">
                    {quickActions.map((action: QuickActionType, index) => (
                      <QuickAction
                        key={index}
                        icon={action.icon}
                        title={action.title}
                        prompt={action.prompt}
                      />
                    ))}
                  </View>
                </View>
              ) : null
            }
            ListHeaderComponentStyle={{ width: "100%" }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
          <View className="w-full h-16 flex-row justify-center items-center gap-4 mb-4">
            <View className="flex-1 h-full px-4 rounded-full flex-row justify-center items-center gap-4 bg-white border border-[#E3E1E1]">
              <Paperclip color={"#979797"} />
              <TextInput
                className="text-lg font-amedium w-full flex-1 h-10"
                placeholder="Ask anything..."
                placeholderTextColor="#979797"
                style={{ paddingVertical: 0 }}
                textAlignVertical="center"
                multiline
                onChangeText={(text) => setInput(text)}
                value={input}
              />
            </View>
            <Pressable
              onPress={handleSendMessage}
              className="w-[10%] h-auto justify-center items-center"
            >
              <Send size={25} color={colors.primaryBlack} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
