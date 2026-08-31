import { colors } from "@/constants/colors";
import { FileText, ImageIcon } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import ChatBottomSheet from "@/components/chat/ChatBottomSheet";

type Props = {
  visible: boolean;
  onPickImage: () => void;
  onPickDocument: () => void;
  onClose: () => void;
};

export default function AttachmentSourceModal({
  visible,
  onPickImage,
  onPickDocument,
  onClose,
}: Props) {
  return (
    <ChatBottomSheet visible={visible} title="Add attachment" onClose={onClose}>
      <Pressable
        onPress={onPickImage}
        className="flex-row items-center gap-3 py-4 border-b border-[#EFEFEF]"
      >
        <View className="w-10 h-10 rounded-full bg-[#EAF4FF] justify-center items-center">
          <ImageIcon size={20} color={colors.primary} />
        </View>
        <View>
          <Text className="text-base font-amedium text-[#0F172A]">Photo</Text>
          <Text className="text-xs font-aregular text-[#979797]">
            PNG or JPEG
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={onPickDocument}
        className="flex-row items-center gap-3 py-4"
      >
        <View className="w-10 h-10 rounded-full bg-[#EAF4FF] justify-center items-center">
          <FileText size={20} color={colors.primary} />
        </View>
        <View>
          <Text className="text-base font-amedium text-[#0F172A]">
            PDF document
          </Text>
          <Text className="text-xs font-aregular text-[#979797]">
            Up to 20 MB
          </Text>
        </View>
      </Pressable>
    </ChatBottomSheet>
  );
}
