import { Stack } from "expo-router";

export default function LabLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="history" options={{ title: "Practical History" }} />
      <Stack.Screen name="practicals" options={{ title: "Chemistry Practicals" }} />
      <Stack.Screen name="[experimentId]/info" options={{ title: "Practical Info" }} />
      <Stack.Screen name="[experimentId]/equipment" options={{ title: "Select Equipment" }} />
      <Stack.Screen name="[experimentId]/chemicals" options={{ title: "Select Chemicals" }} />
      <Stack.Screen name="[experimentId]/workspace" options={{ title: "Laboratory Workspace", headerBackVisible: false }} />
      <Stack.Screen name="[experimentId]/report" options={{ title: "Lab Report", headerBackVisible: false }} />
    </Stack>
  );
}
