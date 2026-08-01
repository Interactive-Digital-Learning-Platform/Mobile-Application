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
import { QuickActionType } from "@/types/chatModuleTypes";
import QuickAction from "@/components/QuickAction";
import { FlashList } from "@shopify/flash-list";
import Message from "@/components/Message";
import { chatInputSchema, type ChatInputValues } from "@/schemas/chatSchemas";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Toast from "react-native-toast-message";
import { useChat } from "@/hooks/use-chat";

export default function AIChat() {
  const { user, isLoaded } = useUser();

  const { messages, sendMessage, isSending, chatRef } = useChat();

  const { control, handleSubmit, reset, watch } = useForm<ChatInputValues>({
    resolver: zodResolver(chatInputSchema),
    mode: "onChange",
    defaultValues: {
      message: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const trimmed = values.message.trim();
    if (!trimmed) return;

    reset({ message: "" });

    if (!user?.id) {
      Toast.show({
        type: "error",
        text1: "Not ready",
        text2: "User session is not available yet.",
      });
      return;
    }

    try {
      await sendMessage(values);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Message failed",
        text2: "Unable to reach the AI service." + error,
      });
    }
  });

  const inputValue = watch("message");
  const isSendDisabled = !inputValue?.trim() || isSending;


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
            keyExtractor={(item) => item.localID}
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
              <Controller
                control={control}
                name="message"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="text-lg font-amedium w-full flex-1 h-10"
                    placeholder="Ask anything..."
                    placeholderTextColor="#979797"
                    style={{ paddingVertical: 0 }}
                    textAlignVertical="center"
                    multiline
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={value}
                  />
                )}
              />
            </View>
            <Pressable
              onPress={onSubmit}
              disabled={isSendDisabled}
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
