import { Text, TouchableOpacity, View } from "react-native";
import { useCallback } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useAnalyticsMeQuery } from "@/hooks/use-quiz";
import { useBattleProfileQuery } from "@/hooks/use-battle";
import Skeleton from "@/components/Skeleton";
import { ICON_COLORS } from "@/constants/quizStyles";
import type { QuizMode } from "@/components/quiz-componets/ModeSwitcher";

function StatCell({
  value,
  label,
  bordered,
}: {
  value: string | number;
  label: string;
  bordered?: "left" | "right";
}) {
  return (
    <View
      className={`w-[33%] h-[80%] flex justify-center items-center flex-col ${
        bordered === "right" ? "border-r-[1px] border-primary" : ""
      }${bordered === "left" ? "border-l-[1px] border-primary" : ""}`}
    >
      <Text className="text-2xl font-bold color-primary">{value}</Text>
      <Text className="text-primary-500 text-xs">{label}</Text>
    </View>
  );
}

function StatCellSkeleton({ bordered }: { bordered?: "left" | "right" }) {
  return (
    <View
      className={`w-[33%] h-[80%] flex justify-center items-center flex-col gap-2 ${
        bordered === "right" ? "border-r-[1px] border-primary" : ""
      }${bordered === "left" ? "border-l-[1px] border-primary" : ""}`}
    >
      <Skeleton width={32} height={18} color={ICON_COLORS.primary100} />
      <Skeleton width={48} height={10} color={ICON_COLORS.primary100} />
    </View>
  );
}

interface StatisticButtonProps {
  mode: QuizMode;
}

export default function StatisticButton({ mode }: StatisticButtonProps) {
  const router = useRouter();
  const { data: analytics, isLoading: isAnalyticsLoading, refetch: refetchAnalytics } = useAnalyticsMeQuery();
  const { data: battleProfile, isLoading: isBattleLoading, refetch: refetchBattleProfile } = useBattleProfileQuery();

  // Mutations already invalidate these queries, but refetching on focus too
  // (same as PracticeList) keeps them in sync even if this screen is reached
  // some other way.
  useFocusEffect(
    useCallback(() => {
      if (mode === "practice") {
        refetchAnalytics();
      } else {
        refetchBattleProfile();
      }
    }, [mode, refetchAnalytics, refetchBattleProfile])
  );

  const sessions  = analytics?.total_sessions ?? 0;
  const accuracy  = analytics ? `${Math.round(analytics.overall_accuracy)}%` : "—";
  const avgTime   = analytics
    ? `${analytics.overall_avg_response_time.toFixed(1)}s`
    : "—";

  // Battle profile is one row per subject with no server-side aggregate, so
  // the summary shown here is rolled up across all of them: total matches
  // played, overall win rate, and the league of whichever subject the
  // player is rated highest in (their "best" league is the more motivating
  // number to show at a glance than an arbitrary per-subject pick).
  const subjects = battleProfile?.subjects ?? [];
  const totalMatches = subjects.reduce((sum, s) => sum + s.matches_played, 0);
  const totalWins = subjects.reduce((sum, s) => sum + s.wins, 0);
  const winRate = totalMatches > 0 ? `${Math.round((totalWins / totalMatches) * 100)}%` : "—";
  const topSubject = subjects.length > 0
    ? subjects.reduce((best, s) => (s.rating > best.rating ? s : best))
    : null;
  const bestLeague = topSubject?.league ?? "Unranked";

  const isLoading = mode === "practice" ? isAnalyticsLoading : isBattleLoading;

  const handlePress = () => {
    if (mode === "practice") {
      router.push("/(tabs)/profile");
    } else {
      router.push("/(main)/battle/leaderboard" as any);
    }
  };

  return (
    <TouchableOpacity
      className="w-full h-[60%] justify-center items-center flex"
      activeOpacity={0.85}
      onPress={handlePress}
    >
      <View className="w-full h-full bg-white flex-row justify-between items-center rounded-3xl px-1">
        {isLoading ? (
          <>
            <StatCellSkeleton bordered="right" />
            <StatCellSkeleton />
            <StatCellSkeleton bordered="left" />
          </>
        ) : mode === "practice" ? (
          <>
            <StatCell value={sessions}  label="Sessions"  bordered="right" />
            <StatCell value={accuracy}  label="Accuracy" />
            <StatCell value={avgTime}   label="Avg / Q"   bordered="left" />
          </>
        ) : (
          <>
            <StatCell value={totalMatches} label="Matches"     bordered="right" />
            <StatCell value={winRate}      label="Win Rate" />
            <StatCell value={bestLeague}   label="Top League"  bordered="left" />
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}
