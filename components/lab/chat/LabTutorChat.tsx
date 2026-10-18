import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import { Send, Sparkles, X } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { LabTutorChatProps, MessageType } from "@/types/lab";
import LabTutorMessage from "@/components/lab/chat/LabTutorMessage";
import { useLabTutor } from "@/hooks/lab/use-lab-tutor";

export default function LabTutorChat({ labRunId, visible, onClose }: LabTutorChatProps) {
  const { messages, isSending, sendQuestion } = useLabTutor(labRunId);
  const [input, setInput] = useState("");
  const listRef = useRef<FlashListRef<MessageType>>(null);

  const handleSend = () => {
    if (!input.trim()) return;
    sendQuestion(input);
    setInput("");
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-white pt-14">
        <View className="flex-row items-center gap-3 px-4 pb-3">
          <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: `${colors.primary}1A` }}>
            <Sparkles size={17} color={colors.primary} />
          </View>
          <Text className="text-xl font-amedium flex-1 text-ink">Lab Tutor</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <X size={24} color={colors.primaryBlack} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <FlashList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <LabTutorMessage key={item.id} message={item} />}
            contentContainerClassName="px-4"
            ListEmptyComponent={
              <Text className="font-aregular text-muted text-center mt-10">
                Ask me anything about what you&apos;re seeing in the lab.
              </Text>
            }
          />
          <View className="flex-row items-center gap-3 px-4 py-3 border-t border-border">
            <TextInput
              className="flex-1 border rounded-full px-4 py-2 font-aregular border-border"
              placeholder="Ask the tutor..."
              value={input}
              onChangeText={setInput}
              multiline
            />
            <Pressable onPress={handleSend} disabled={isSending}>
              <Send size={22} color={isSending ? colors.borderColorLight : colors.primary} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
