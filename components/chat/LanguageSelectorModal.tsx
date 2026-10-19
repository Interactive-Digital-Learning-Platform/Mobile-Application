import { colors } from "@/constants/colors";
import { ChatLanguage } from "@/types/chatModuleTypes";
import { Check, Languages } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import ChatBottomSheet from "@/components/chat/ChatBottomSheet";

type Props = {
  visible: boolean;
  selected: ChatLanguage;
  onSelect: (language: ChatLanguage) => void;
  onClose: () => void;
};

const OPTIONS: { value: ChatLanguage; label: string; hint: string }[] = [
  { value: "English", label: "English", hint: "Default" },
  { value: "Sinhala", label: "සිංහල", hint: "Sinhala" },
];

export default function LanguageSelectorModal({
  visible,
  selected,
  onSelect,
  onClose,
}: Props) {
  return (
    <ChatBottomSheet
      visible={visible}
      title="Response language"
      onClose={onClose}
    >
      {OPTIONS.map((option, index) => {
        const isSelected = option.value === selected;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            className={`flex-row items-center gap-3 py-4 ${
              index < OPTIONS.length - 1 ? "border-b border-[#EFEFEF]" : ""
            }`}
          >
            <View className="w-10 h-10 rounded-full bg-[#EAF4FF] justify-center items-center">
              <Languages size={20} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-amedium text-[#0F172A]">
                {option.label}
              </Text>
              <Text className="text-xs font-aregular text-[#979797]">
                {option.hint}
              </Text>
            </View>
            {isSelected && <Check size={20} color={colors.primary} />}
          </Pressable>
        );
      })}
    </ChatBottomSheet>
  );
}
