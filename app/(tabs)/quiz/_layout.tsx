import { Stack } from "expo-router";

export default function QuizLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{animation:"slide_from_left"}} />
      <Stack.Screen name="[matchId]" />
      <Stack.Screen name="quiz-session" options={{animation:"default"}} />
      <Stack.Screen name="quiz-results" />
    </Stack>
  );
}
