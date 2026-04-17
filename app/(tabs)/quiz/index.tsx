import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Quizes() {
  return (
    <SafeAreaView className="w-full flex-1 justify-center items-center bg-white">
      <Text className="text-xl font-amedium text-black">Quizes</Text>
    </SafeAreaView>
  );
}
