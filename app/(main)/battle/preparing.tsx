import { useEffect, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
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
  const { matchState } = useBattleMatchContext();
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

  return (
    <LinearGradient colors={[ICON_COLORS.primary500, "#FF8F30"]} style={{ flex: 1 }}>
      <MatchStartPopup />
    </LinearGradient>
  );
}
