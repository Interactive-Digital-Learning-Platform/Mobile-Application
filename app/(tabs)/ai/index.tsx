import { colors } from "@/constants/colors";
import {
  EllipsisVertical,
  Mic,
  Plus,
  Send,
  SlidersHorizontal,
  Square,
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
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from "react-native-svg";
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
import { useAttachmentPicker } from "@/hooks/attachments/use-attachment-picker";
import { useAttachmentUpload } from "@/hooks/attachments/use-attachment-upload";
import AttachmentPreviewBar from "@/components/chat/AttachmentPreviewBar";
import AttachmentSourceModal from "@/components/chat/AttachmentSourceModal";
import { Drawer } from "react-native-drawer-layout";
import { useState } from "react";
import ChatHistorySidebar from "@/components/chat/ChatHistorySidebar";
import LanguageSelectorModal from "@/components/chat/LanguageSelectorModal";

export default function AIChat() {
  const { user, isLoaded } = useUser();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const {
    messages,
    conversationID,
    language,
    setLanguage,
    sendMessage,
    isSending,
    chatRef,
    startNewConversation,
    openConversation,
    ensureConversation,
    stopStreaming,
  } = useChat();

  const picker = useAttachmentPicker();
  const upload = useAttachmentUpload(user?.id);

  const [isDrawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [isLangModalOpen, setLangModalOpen] = useState<boolean>(false);
  const [cardSize, setCardSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

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

    const sendable = upload.getSendable();
    upload.reset();

    try {
      await sendMessage(values, sendable?.snapshot);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Message failed",
        text2: "Unable to reach the AI service." + error,
      });
    }
  });

  const handlePickAttachment = async () => {
    if (isSending) return;

    const file = await picker.pick();
    if (!file) return;

    try {
      const cid = await ensureConversation();
      upload.start(file, cid);
    } catch {
      Toast.show({
        type: "error",
        text1: "Couldn't attach file",
        text2: "Unable to prepare the conversation. Try again.",
      });
    }
  };

  const inputValue = watch("message");
  const isUploadingAttachment = upload.attachment?.status === "uploading";
  const isSendDisabled =
    !inputValue?.trim() || isSending || isUploadingAttachment;

  const CARD_RADIUS = 28;
  const BORDER_WIDTH = 2.5;
  const inset = BORDER_WIDTH / 2;
  const cornerBorderPath = cardSize
    ? `M ${cardSize.width / 2} ${inset} L ${CARD_RADIUS + inset} ${inset} A ${CARD_RADIUS} ${CARD_RADIUS} 0 0 0 ${inset} ${CARD_RADIUS + inset} L ${inset} ${cardSize.height / 2}`
    : null;

  return (
    <Drawer
      open={isDrawerOpen}
      onOpen={() => setDrawerOpen(true)}
      onClose={() => setDrawerOpen(false)}
      drawerStyle={{
        width: Math.min(width * 0.86, 320),
        backgroundColor: "transparent",
      }}
      overlayStyle={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
      renderDrawerContent={() => (
        <ChatHistorySidebar
          selectedConversationID={conversationID ?? undefined}
          onNewChatPress={() => {
            upload.reset();
            startNewConversation();
            setDrawerOpen(false);
          }}
          onConversationPress={(conversation) => {
            upload.reset();
            openConversation(conversation.conversation_id);
            setDrawerOpen(false);
          }}
        />
      )}
    >
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
          <SafeAreaView edges={["left", "right"]} className="w-full flex-1 px-4">
            <KeyboardAvoidingView
              className="w-full flex-1"
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View
                className="w-full h-auto flex-row justify-between items-center mb-4"
                style={{ paddingTop: insets.top + 12 }}
              >
                <TextAlignStart
                  size={28}
                  color="#ffffff"
                  onPress={() => setDrawerOpen((prev) => !prev)}
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
              <View style={{ paddingBottom: insets.bottom + 12 }}>
                <View
                  onLayout={(e) =>
                    setCardSize({
                      width: e.nativeEvent.layout.width,
                      height: e.nativeEvent.layout.height,
                    })
                  }
                  style={{
                    borderRadius: CARD_RADIUS,
                    backgroundColor: "#F2F2F2",
                    borderWidth: 1.5,
                    borderColor: "#FFFFFF",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.1,
                    shadowRadius: 14,
                    elevation: 6,
                  }}
                >
                  <View
                    className="w-full overflow-hidden"
                    style={{ borderRadius: CARD_RADIUS }}
                  >
                    <AttachmentPreviewBar
                      attachment={upload.attachment}
                      onRemove={upload.remove}
                      onRetry={upload.retry}
                    />
                    <Controller
                      control={control}
                      name="message"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          className="text-lg font-amedium w-full px-4 pt-4 pb-2"
                          placeholder="Ask anything..."
                          placeholderTextColor="#979797"
                          textAlignVertical="center"
                          multiline
                          onChangeText={onChange}
                          onBlur={onBlur}
                          value={value}
                        />
                      )}
                    />
                    <View className="w-full flex-row justify-between items-center px-3 pb-4 pt-4">
                      <View className="flex-row items-center gap-3">
                        <Pressable
                          onPress={handlePickAttachment}
                          disabled={isSending}
                          className="w-9 h-9 rounded-full bg-white justify-center items-center"
                          style={{ opacity: isSending ? 0.4 : 1 }}
                        >
                          <Plus size={20} color="#6B7280" />
                        </Pressable>
                        <Pressable
                          onPress={() => setLangModalOpen(true)}
                          className="h-9 px-2.5 rounded-full bg-white flex-row items-center gap-1.5"
                        >
                          <SlidersHorizontal size={18} color="#6B7280" />
                          <Text className="text-xs font-amedium text-[#6B7280]">
                            {language === "Sinhala" ? "සිං" : "EN"}
                          </Text>
                        </Pressable>
                      </View>
                      <View className="flex-row items-center gap-3">
                        <Pressable className="w-9 h-9 justify-center items-center">
                          <Mic size={20} color="#6B7280" />
                        </Pressable>
                        <Pressable
                          onPress={isSending ? stopStreaming : onSubmit}
                          disabled={isSending ? false : isSendDisabled}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: colors.primary,
                            justifyContent: "center",
                            alignItems: "center",
                            opacity: !isSending && isSendDisabled ? 0.5 : 1,
                          }}
                        >
                          {isSending ? (
                            <Square size={15} color="#ffffff" fill="#ffffff" />
                          ) : (
                            <Send size={18} color="#ffffff" />
                          )}
                        </Pressable>
                      </View>
                    </View>
                  </View>
                  {cornerBorderPath && (
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: cardSize!.width,
                        height: cardSize!.height,
                      }}
                    >
                      <Svg width={cardSize!.width} height={cardSize!.height}>
                        <Defs>
                          <SvgLinearGradient
                            id="inputCornerBorder"
                            gradientUnits="userSpaceOnUse"
                            x1={0}
                            y1={0}
                            x2={90}
                            y2={90}
                          >
                            <Stop
                              offset="0"
                              stopColor={colors.primary}
                              stopOpacity={1}
                            />
                            <Stop
                              offset="1"
                              stopColor={colors.primary}
                              stopOpacity={0}
                            />
                          </SvgLinearGradient>
                        </Defs>
                        <Path
                          d={cornerBorderPath}
                          stroke="url(#inputCornerBorder)"
                          strokeWidth={BORDER_WIDTH}
                          strokeLinecap="round"
                          fill="none"
                        />
                      </Svg>
                    </View>
                  )}
                </View>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </LinearGradient>
        <AttachmentSourceModal {...picker.modalProps} />
        <LanguageSelectorModal
          visible={isLangModalOpen}
          selected={language}
          onSelect={(next) => {
            setLanguage(next);
            setLangModalOpen(false);
          }}
          onClose={() => setLangModalOpen(false)}
        />
      </>
    </Drawer>
  );
}
