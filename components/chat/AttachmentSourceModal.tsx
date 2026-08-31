import { colors } from "@/constants/colors";
import { FileText, ImageIcon, X } from "lucide-react-native";
import { Modal, Pressable, Text, View } from "react-native";

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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        onPress={onClose}
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-white rounded-t-3xl px-5 pt-4 pb-8"
        >
          <View className="w-full flex-row justify-between items-center mb-2">
            <Text className="text-lg font-asemibold text-[#0F172A]">
              Add attachment
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              className="w-8 h-8 rounded-full bg-[#F2F2F2] justify-center items-center"
            >
              <X size={18} color="#6B7280" />
            </Pressable>
          </View>

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
        </Pressable>
      </Pressable>
    </Modal>
  );
}
