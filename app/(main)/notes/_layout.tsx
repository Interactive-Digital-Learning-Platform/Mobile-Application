import { Stack } from "expo-router";

export default function NotesFlowLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="upload" options={{ presentation: "modal" }} />
      <Stack.Screen name="material/[type]" />
      {/* Lab → Notes handoff (Phase 4): a revision note built from a completed practical. */}
      <Stack.Screen name="from-practical" />
    </Stack>
  );
}
