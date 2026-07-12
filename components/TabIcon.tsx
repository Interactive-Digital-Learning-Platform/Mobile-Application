import { TabIconType } from "@/types/chatModuleTypes";
import { Image, Text, View } from "react-native";

export default function TabIcon({ icon, name, color, focused }: TabIconType) {
  return (
    <View className="w-[45px] flex-col justify-center items-center gap-2">
      <Image
        source={icon}
        style={{ width: 28, height: 28 }}
        resizeMode="contain"
      />
      <Text
        className={`text-[12px] overflow-x-visible font-amedium ${focused ? "text-[#FC6E20]" : "text-[#979797]"}`}
        numberOfLines={1}
        ellipsizeMode="clip"
      >
        {name}
      </Text>
    </View>
  );
}
