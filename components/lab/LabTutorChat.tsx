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
import { Send, X } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { MessageType } from "@/types";
import Message from "@/components/Message";
import { useLabTutor } from "@/hooks/use-lab-tutor";

type Props = {
  labRunId: string | undefined;
  visible: boolean;
  onClose: () => void;
};

export default function LabTutorChat({ labRunId, visible, onClose }: Props) {
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
        <View className="flex-row justify-between items-center px-4 pb-3">
          <Text className="text-xl font-amedium" style={{ color: colors.primaryBlack }}>
            AI Tutor
          </Text>
          <Pressable onPress={onClose}>
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
            renderItem={({ item }) => <Message key={item.id} message={item} />}
            contentContainerClassName="px-4"
            ListEmptyComponent={
              <Text className="font-aregular text-[#979797] text-center mt-10">
                Ask me anything about what you&apos;re seeing in the lab.
              </Text>
            }
          />
          <View className="flex-row items-center gap-3 px-4 py-3 border-t" style={{ borderColor: colors.borderColorLight }}>
            <TextInput
              className="flex-1 border rounded-full px-4 py-2 font-aregular"
              style={{ borderColor: colors.borderColorLight }}
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
