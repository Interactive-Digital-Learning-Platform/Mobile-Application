import { HeaderProps } from "@/types/chatModuleTypes";
import { router } from "expo-router";
import { ArrowLeftCircle } from "lucide-react-native";
import { Text, View, TouchableOpacity, StyleSheet } from "react-native";

export default function Header({
  IconComponent,
  title,
  onIconPress,
}: HeaderProps) {
  return (
    <View className="w-full h-14 flex-row justify-between items-center">
      <TouchableOpacity
        onPress={() => router.back()}
        className="w-6 h-full justify-center items-center"
      >
        <ArrowLeftCircle size={24} color="#282828" />
      </TouchableOpacity>
      {title && (
        <View className="w-auto h-full justify-center items-center">
          <Text className="text-center font-amedium text-[20px] text-[#282828]">
            {title}
          </Text>
        </View>
      )}
      <TouchableOpacity
        onPress={onIconPress}
        className="w-6 h-full justify-center items-center"
      >
        {IconComponent && <IconComponent color="#282828" size={24} />}
      </TouchableOpacity>
    </View>
  );
}
