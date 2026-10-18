import NotesHome from "@/screens/NotesHome";
import { View } from "react-native";
import { useAuth } from "@clerk/expo";

export default function Notes() {
  const { userId } = useAuth();
  return (
    <View className="w-full flex-1 bg-white">
      <NotesHome key={userId || "signed-out"} />
    </View>
  );
}
