import { Stack } from "expo-router";

export default function NotesFlowLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="upload" options={{ presentation: "modal" }} />
      <Stack.Screen name="material/[type]" />
    </Stack>
  );
}
