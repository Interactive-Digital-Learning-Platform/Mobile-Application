import { colors } from "@/constants/colors";
import { ChatLanguage } from "@/types/chatModuleTypes";
import { Check, Languages, X } from "lucide-react-native";
import { Modal, Pressable, Text, View } from "react-native";

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
              Response language
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              className="w-8 h-8 rounded-full bg-[#F2F2F2] justify-center items-center"
            >
              <X size={18} color="#6B7280" />
            </Pressable>
          </View>

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
        </Pressable>
      </Pressable>
    </Modal>
  );
}
