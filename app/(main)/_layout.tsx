import { Stack } from "expo-router";

export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="experiment/[id]" />
      <Stack.Screen name="experiment/run/[id]" />
      <Stack.Screen name="experiment/feedback/[sessionId]" />
      <Stack.Screen name="visualizations/index" />
      <Stack.Screen name="visualizations/[type]" />
    </Stack>
  );
}
