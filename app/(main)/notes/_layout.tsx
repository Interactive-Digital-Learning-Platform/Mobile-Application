import { Redirect, Stack, useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import { ActivityIndicator, View } from "react-native";
import { colors } from "@/constants/colors";
import NotesErrorBoundary from "@/components/notes/NotesErrorBoundary";

export default function NotesFlowLayout() {
  const router = useRouter();
  const { isLoaded, isSignedIn, userId } = useAuth();
  if (!isLoaded) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.primary} /></View>;
  if (!isSignedIn || !userId) return <Redirect href="/(auth)/sign-in" />;
  return (
    <NotesErrorBoundary key={userId} onBack={() => router.replace("/(tabs)/notes")}><Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="upload" options={{ presentation: "modal" }} />
      <Stack.Screen name="material/[type]" />
    </Stack></NotesErrorBoundary>
  );
}
