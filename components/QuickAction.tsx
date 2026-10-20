import { colors } from "@/constants/colors";
import { QuickActionProps } from "@/types/chatModuleTypes";
import { TouchableOpacity } from "react-native";
import { Text } from "@/components/ui/AppText";

export default function QuickAction({ icon: Icon, title, onPress, disabled }: QuickActionProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
      className="w-auto h-auto flex-row justify-start items-center gap-2 bg-white px-6 py-2 rounded-full drop-shadow-2xl"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      {Icon && <Icon size={18} color={colors.primary} />}
      <Text
        className="text-lg font-aregular"
        style={{ color: "#979797" }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}
