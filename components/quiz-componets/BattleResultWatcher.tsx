import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { fetchMatchState } from "@/api/battleAPI";
import { battleKeys, useBattleAvailabilityQuery } from "@/hooks/use-battle";
import {
  clearPendingBattleResult,
  markPendingBattleResultCompleted,
  setPendingBattleResult,
  usePendingBattleResult,
} from "@/hooks/use-pending-battle-result";

const MATCH_POLL_MS = 3000;

export function openBattleResults(router: ReturnType<typeof useRouter>, matchId: number) {
  router.push({
    pathname: "/(main)/battle/match-session",
    params: { matchId: String(matchId), view: "results" },
  } as any);
}

// Mounted once for the whole tab area (app/(tabs)/_layout.tsx), so it works
// whichever tab the player is on. Renders nothing.
//
// - A player who finished a battle first and is waiting for the opponent
//   gets that battle remembered as a pending result (also covers an app
//   restart mid-wait, via the server's awaiting_opponent flag).
// - While it's pending, the match's OWN state is polled -- the toast fires
//   only once the server says that match is "completed". Matchmaking status
//   isn't used for this: a cached or in-between value of it could read as
//   "over" while the opponent was still playing.
//
// Quiet while a battle screen is open: that screen shows the result itself.
export default function BattleResultWatcher() {
  const router = useRouter();
  const segments = useSegments() as string[];
  const inBattle = segments.includes("battle");
  const pending = usePendingBattleResult();

  // Only to notice a wait the app doesn't know about yet (e.g. restarted
  // mid-wait) -- same query (and cache entry) as the Online tab's button.
  const { data: queueStatus } = useBattleAvailabilityQuery(true);
  useEffect(() => {
    if (inBattle || !queueStatus) return;
    if (queueStatus.status === "matched" && queueStatus.awaiting_opponent && queueStatus.match_id != null) {
      setPendingBattleResult({ matchId: queueStatus.match_id, subject: queueStatus.subject ?? "" });
    }
  }, [inBattle, queueStatus]);

  const watchedMatchId = pending && !pending.completed && !inBattle ? pending.matchId : null;
  const { data: matchState } = useQuery({
    queryKey: battleKeys.pendingResult(watchedMatchId),
    queryFn: () => fetchMatchState(watchedMatchId as number),
    enabled: watchedMatchId !== null,
    staleTime: 0,
    // Kept a while after polling stops (it stops the moment a battle screen
    // opens) so the match screen can start from it -- see use-battle-match.
    gcTime: 5 * 60 * 1000,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "completed" || status === "cancelled" ? false : MATCH_POLL_MS;
    },
  });

  useEffect(() => {
    if (watchedMatchId === null || matchState?.match_id !== watchedMatchId) return;
    if (matchState.status === "cancelled") {
      clearPendingBattleResult(watchedMatchId);
      return;
    }
    if (matchState.status !== "completed") return;
    markPendingBattleResultCompleted(watchedMatchId);
    Toast.show({
      type: "success",
      text1: "Your opponent completed the quiz",
      text2: "Tap to view your results.",
      visibilityTime: 6000,
      onPress: () => {
        Toast.hide();
        openBattleResults(router, watchedMatchId);
      },
    });
  }, [watchedMatchId, matchState, router]);

  return null;
}
