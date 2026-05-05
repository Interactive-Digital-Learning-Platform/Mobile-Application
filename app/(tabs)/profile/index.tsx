import { useClerk } from "@clerk/expo";
import { router } from "expo-router";
import { Pressable, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function Profile() {
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    try {
      await signOut();

      router.replace("/(auth)/sign-in");
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text1Style: { fontSize: 12, fontFamily: "Author-Medium" },
        text2: "Error in signing out!",
        text2Style: { fontSize: 10, fontFamily: "Author-Regular" },
      });
      console.log("Error in signing out! : ", error);
    }
  };
  return (
    <SafeAreaView className="w-full flex-1 justify-center items-center bg-white">
      <Text className="text-xl font-amedium text-black">Profile</Text>
      <Pressable className="mt-8" onPress={handleSignOut}>
        <Text>Signout</Text>
      </Pressable>
    </SafeAreaView>
  );
}
