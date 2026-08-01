import { colors } from "@/constants/colors";
import {
  EllipsisVertical,
  Paperclip,
  Send,
  TextAlignStart,
} from "lucide-react-native";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  StatusBar,
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
        <SafeAreaView
          edges={["left", "right", "bottom"]}
          className="w-full flex-1 px-4"
        >
          <KeyboardAvoidingView
            className="w-full flex-1"
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View className="w-full h-auto flex-row justify-between items-center pt-6">
              <TextAlignStart
                
                size={28}
                color="#ffffff"
              />
              <Text className="text-white font-amedium text-2xl">Kit AI</Text>
              <View className="h-auto flex-row items-right rounded-full -mr-2">
                <EllipsisVertical color="#ffffff" size={28} />
              </View>
            </View>

            <FlashList
              ref={chatRef}
              data={messages}
              keyExtractor={(item) => item.localID}
              renderItem={({ item }) => (
                <Message key={item.id} message={item} />
              )}
              className="w-full flex-1"
              contentContainerClassName="w-full h-auto flex-col justify-start"
              ListHeaderComponent={
                messages.length === 0 ? (
                  <View className="w-full h-auto mb-12 mt-8">
                    <View className="w-full h-auto justify-center items-center">
                      <Text className="w-3/4 text-4xl font-amedium text-center text-[#ffffff]">
                        Hi,{" "}
                        {isLoaded && user?.username
                          ? user?.username?.charAt(0).toUpperCase() +
                            user?.username?.slice(1)
                          : "..."}
                        ! ✦
                      </Text>
                      <Text className="w-full text-4xl font-amedium text-center text-[#ffffff]">
                        How can I assist you?
                      </Text>
                      <Text className="text-xl font-aregular text-[#ffffff] mt-1">
                        Your smart learning assistant is ready
                      </Text>
                    </View>
                    <View className="w-full mt-8 flex-row flex-wrap justify-center gap-x-2 items-center gap-y-4">
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
    </>
  );
}
