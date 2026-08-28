import { useEffect, useRef } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertTriangle, WifiOff } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { useBattleMatchContext } from "@/hooks/use-battle-match";
import MatchStartPopup from "@/components/quiz-componets/MatchStartPopup";

// Sits between VersusIntro (queue.tsx) and match-session.tsx -- only ever
// reached when VersusIntro's own 5s reveal finished and the match is STILL
// "waiting" (question generation hasn't landed yet), so this owns the rest
// of that gap instead of it being a popup overlaid on VersusIntro (or, for
// a cold start directly into match-session.tsx -- app relaunched mid-match
// -- it bounces back here too, see that screen's own redirect effect).
// Hands off only once the match is FULLY ready -- status "active" AND
// subject already backfilled (get_match_state() returns almost nothing
// while still "waiting"/"countdown", subject only arrives via the
// countdown_started handler's own REST refetch, see hooks/use-battle-
// match.tsx) -- so match-session.tsx never needs its own loading state, it
// can render the live battle immediately on mount. Falls back to queue.tsx
// on "cancelled" (AI failure) -- queue.tsx's own existing cancellation
// effect (toast + auto-requeue) picks that up on remount, so it isn't
// duplicated here.
export default function BattlePreparingScreen() {
  const router = useRouter();
  const { matchId: matchIdStr, subject } = useLocalSearchParams<{ matchId: string; subject: string }>();
  const matchId = matchIdStr ? parseInt(matchIdStr, 10) : null;
  const { matchState, connectionStatus, initialLoadError, manualRetry } = useBattleMatchContext();
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (matchId === null || matchState?.status == null || navigatedRef.current) return;
    if (matchState.status === "cancelled") {
      navigatedRef.current = true;
      router.replace({
        pathname: "/(main)/battle/queue",
        params: { subject: subject ?? "" },
      } as any);
    } else if (matchState.status === "active" && matchState.subject != null) {
      navigatedRef.current = true;
      router.replace({
        pathname: "/(main)/battle/match-session",
        params: { matchId: String(matchId) },
      } as any);
    }
  }, [matchId, matchState?.status, matchState?.subject, subject, router]);

  // No matchState at all and the initial REST hydration failed outright --
  // there's nothing to wait on (the WS side has nothing to hydrate either),
  // so show a real error instead of a spinner that would otherwise sit here
  // forever. Mirrors match-session.tsx's own initialLoadError state, since a
  // cold app launch can land directly on this screen before that one ever
  // mounts.
  if (!matchState && initialLoadError) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <View className="bg-rose-100 w-16 h-16 rounded-full items-center justify-center mb-4">
          <AlertTriangle size={28} color={ICON_COLORS.rose500} strokeWidth={2} />
        </View>
        <Text className="text-slate-800 font-black text-lg text-center mb-1">Couldn&apos;t Load Match</Text>
        <Text className="text-slate-400 text-sm text-center mb-6">Check your connection and try again.</Text>
        <TouchableOpacity
          className="bg-primary px-6 py-3.5 rounded-2xl mb-3"
          activeOpacity={0.85}
          onPress={manualRetry}
        >
          <Text className="text-white font-black text-sm">Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="px-6 py-3.5 rounded-2xl"
          activeOpacity={0.85}
          onPress={() => router.dismissTo("/(tabs)/quiz")}
        >
          <Text className="text-slate-500 font-bold text-sm">Back to Quiz</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient colors={[ICON_COLORS.primary500, "#FF8F30"]} style={{ flex: 1 }}>
      <MatchStartPopup />
      {/* Honest connection feedback instead of a spinner that looks the same
          whether things are fine or the socket has been retrying for a
          minute -- useBattleMatch's reconnect loop now retries forever
          rather than giving up, so "closed" here only means something
          manualRetry can actually fix (e.g. this connection attempt itself
          failed outright), not a dead end. */}
      {connectionStatus !== "open" && (
        <View className="absolute bottom-16 left-0 right-0 items-center px-8">
          <View className="bg-black/30 rounded-full px-4 py-2 flex-row items-center gap-2">
            <WifiOff size={14} color="#fff" strokeWidth={2.5} />
            <Text className="text-white text-xs font-semibold">
              {connectionStatus === "closed" ? "Connection lost" : "Reconnecting…"}
            </Text>
            {connectionStatus === "closed" && (
              <TouchableOpacity
                onPress={manualRetry}
                activeOpacity={0.8}
                className="ml-1 bg-white/20 rounded-full px-3 py-1"
              >
                <Text className="text-white text-[11px] font-black">Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </LinearGradient>
  );
}
