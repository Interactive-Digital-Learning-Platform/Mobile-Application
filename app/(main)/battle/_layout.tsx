import { Stack } from "expo-router";

export default function BattleFlowLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="queue" />
      <Stack.Screen name="match-session" />
      <Stack.Screen name="battle-results" />
      <Stack.Screen name="leaderboard" />
    </Stack>
  );
}
