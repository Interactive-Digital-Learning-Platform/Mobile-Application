import { Stack } from "expo-router";

export default function QuizFlowLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[matchId]" />
      <Stack.Screen name="quiz-session" options={{ animation: "default" }} />
      <Stack.Screen name="quiz-results" />
    </Stack>
  );
}
