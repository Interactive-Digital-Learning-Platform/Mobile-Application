import NotesHome from "@/screens/NotesHome";
import { View } from "react-native";
import { useAuth } from "@clerk/expo";
import NotesErrorBoundary from "@/components/notes/NotesErrorBoundary";

export default function Notes() {
  const { userId } = useAuth();
  return (
    <View className="w-full flex-1 bg-white">
      <NotesErrorBoundary key={userId || "signed-out"}><NotesHome /></NotesErrorBoundary>
    </View>
  );
}
