import { Stack } from "expo-router";
import { BattleMatchProvider } from "@/hooks/use-battle-match";

export default function BattleFlowLayout() {
  return (
    <BattleMatchProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="queue" />
        <Stack.Screen name="preparing" />
        <Stack.Screen name="match-session" />
        <Stack.Screen name="leaderboard" />
      </Stack>
    </BattleMatchProvider>
  );
}
