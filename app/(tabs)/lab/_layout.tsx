import { Stack } from "expo-router";

export default function LabLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="chemistry/index" options={{ title: "Chemistry Practicals" }} />
      <Stack.Screen name="chemistry/[experimentId]/equipment" options={{ title: "Select Equipment" }} />
      <Stack.Screen name="chemistry/[experimentId]/chemicals" options={{ title: "Select Chemicals" }} />
      <Stack.Screen name="chemistry/[experimentId]/workspace" options={{ title: "Laboratory Workspace", headerBackVisible: false }} />
      <Stack.Screen name="chemistry/[experimentId]/report" options={{ title: "Lab Report", headerBackVisible: false }} />
    </Stack>
  );
}
