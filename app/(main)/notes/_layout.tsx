import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/expo";
import { ActivityIndicator, View } from "react-native";
import { colors } from "@/constants/colors";

export default function NotesFlowLayout() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  if (!isLoaded) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.primary} /></View>;
  if (!isSignedIn || !userId) return <Redirect href="/(auth)/sign-in" />;
  return (
    <Stack key={userId} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="upload" options={{ presentation: "modal" }} />
      <Stack.Screen name="material/[type]" />
    </Stack>
  );
}
