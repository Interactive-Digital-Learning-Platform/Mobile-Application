import { Stack } from "expo-router";

export default function ProfileFlowLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="details" options={{ animation: "default" }} />
    </Stack>
  );
}
