import { Stack } from "expo-router";

export default function LabLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="history" options={{ headerShown: false }} />
      <Stack.Screen name="practicals" options={{ headerShown: false }} />
      <Stack.Screen name="biology/index" options={{ headerShown: false }} />
      <Stack.Screen name="biology/generate" options={{ headerShown: false }} />
      <Stack.Screen name="biology/[visualizationId]" options={{ headerShown: false }} />
      <Stack.Screen name="[experimentId]/info" options={{ headerShown: false }} />
      <Stack.Screen name="[experimentId]/equipment" options={{ headerShown: false }} />
      <Stack.Screen name="[experimentId]/chemicals" options={{ headerShown: false }} />
      <Stack.Screen name="[experimentId]/workspace" options={{ headerShown: false }} />
      <Stack.Screen name="[experimentId]/report" options={{ headerShown: false }} />
    </Stack>
  );
}
