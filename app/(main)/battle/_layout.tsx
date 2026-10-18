import { Stack } from "expo-router";
import { BattleMatchProvider } from "@/hooks/use-battle-match";
import { ICON_COLORS } from "@/constants/quizStyles";

export default function BattleFlowLayout() {
  return (
    <BattleMatchProvider>
      {/* Brand orange behind every battle screen, so any gap -- a screen still
          loading, or mid-transition -- never flashes the default white. */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: ICON_COLORS.primary500 } }}>
        <Stack.Screen name="queue" />
        <Stack.Screen name="preparing" />
        <Stack.Screen name="match-session" />
        <Stack.Screen name="leaderboard" />
      </Stack>
    </BattleMatchProvider>
  );
}
