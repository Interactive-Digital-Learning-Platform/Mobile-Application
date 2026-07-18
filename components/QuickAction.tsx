import { colors } from "@/constants/colors";
import { QuickActionType } from "@/types/chatModuleTypes";
import { Text, View } from "react-native";

export default function QuickAction({ icon: Icon, title }: QuickActionType) {
  return (
    <View className="w-auto h-auto flex-row justify-start items-center gap-2 bg-white px-6 py-2 rounded-full drop-shadow-2xl">
      {Icon && <Icon size={18} color={colors.primary} />}
      <Text
        className="text-lg font-aregular"
        style={{ color: "#979797" }}
      >
        {title}
      </Text>
    </View>
  );
}
