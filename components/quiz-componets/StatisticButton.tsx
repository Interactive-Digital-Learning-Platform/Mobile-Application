import { Text, TouchableOpacity, View } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Flame } from "lucide-react-native";
import { useAnalyticsMeQuery, useDailyAnalyticsQuery } from "@/hooks/use-quiz";
import type { DailyActivityPoint } from "@/types/quizModuleTypes";
import { useBattleProfileQuery } from "@/hooks/use-battle";
import Skeleton from "@/components/Skeleton";
import { ICON_COLORS } from "@/constants/quizStyles";
import type { QuizMode } from "@/components/quiz-componets/ModeSwitcher";

const DONUT_SIZE = 150;
const DONUT_STROKE = 14;
const FILL_DURATION_MS = 900;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Single-proportion donut on the bg-primary header: translucent white track, solid white arc. The arc fills from 0
// and the centre number counts up in step with it whenever `percent` or `replayKey` changes (Reanimated's default
// ReduceMotion.System makes it jump straight to the value when the OS "Reduce Motion" setting is on).
function Donut({ percent, label, replayKey }: { percent: number; label: string; replayKey: number }) {
  const r = (DONUT_SIZE - DONUT_STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(Math.max(percent, 0), 100);
  const c = DONUT_SIZE / 2;

  const progress = useSharedValue(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(pct, { duration: FILL_DURATION_MS, easing: Easing.out(Easing.cubic) });
  }, [pct, replayKey, progress]);

  useAnimatedReaction(
    () => Math.round(progress.value),
    (current, previous) => {
      if (current !== previous) runOnJS(setShown)(current);
    }
  );

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value / 100),
    // A round-capped arc of length 0 still draws a dot, so hide it until it has started filling.
    strokeOpacity: progress.value > 0.5 ? 1 : 0,
  }));

  return (
    <View
      className="items-center justify-center"
      style={{ width: DONUT_SIZE, height: DONUT_SIZE }}
      accessible
      accessibilityLabel={`${label} ${Math.round(pct)} percent`}
    >
      <Svg width={DONUT_SIZE} height={DONUT_SIZE} style={{ position: "absolute" }}>
        <Circle cx={c} cy={c} r={r} stroke="rgba(255,255,255,0.25)" strokeWidth={DONUT_STROKE} fill="transparent" />
        <AnimatedCircle
          cx={c} cy={c} r={r}
          stroke={ICON_COLORS.white} strokeWidth={DONUT_STROKE} fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90, ${c}, ${c})`}
          animatedProps={arcProps}
        />
      </Svg>
      <Text className="text-white text-[36px] font-black leading-[40px]">{shown}%</Text>
      <Text className="text-white/80 text-[11px] font-bold uppercase tracking-widest">{label}</Text>
    </View>
  );
}

function StatCell({ value, label, flame }: { value: string | number; label: string; flame?: boolean }) {
  return (
    <View className="flex-1 items-center">
      <View className="flex-row items-center gap-1">
        {flame && <Flame size={16} color={ICON_COLORS.white} fill={ICON_COLORS.white} />}
        <Text className="text-white text-lg font-black" numberOfLines={1}>{value}</Text>
      </View>
      <Text className="text-white/80 text-[11px] font-medium">{label}</Text>
    </View>
  );
}

function Divider() {
  return <View className="w-px h-8 bg-white/40" />;
}

// Consecutive days with at least one finished quiz, counting back from today. A day with no quiz yet today doesn't
// break the streak -- it starts from yesterday instead, so the number only resets once a whole day is missed.
function dayStreak(daily: DailyActivityPoint[]): string {
  const days = [...daily].sort((a, b) => a.date.localeCompare(b.date));
  let i = days.length - 1;
  if (i >= 0 && days[i].quizzes_completed === 0) i--;
  let streak = 0;
  while (i >= 0 && days[i].quizzes_completed > 0) {
    streak++;
    i--;
  }
  // Every day in the window was active, so the real streak may run further back than the data we fetched.
  return streak === days.length && streak > 0 ? `${streak}+` : String(streak);
}

interface StatisticButtonProps {
  mode: QuizMode;
}

export default function StatisticButton({ mode }: StatisticButtonProps) {
  const router = useRouter();
  const { data: analytics, isLoading: isAnalyticsLoading, refetch: refetchAnalytics } = useAnalyticsMeQuery();
  const { data: battleProfile, isLoading: isBattleLoading, refetch: refetchBattleProfile } = useBattleProfileQuery();
  const { data: dailyAnalytics, refetch: refetchDaily } = useDailyAnalyticsQuery(30);

  // Mutations already invalidate these queries, but refetching on focus too
  // (same as PracticeList) keeps them in sync even if this screen is reached
  // some other way.
  // Bumped on every focus so the donut replays its fill animation each time the tab is shown.
  const [focusCount, setFocusCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setFocusCount((n) => n + 1);
      if (mode === "practice") {
        refetchAnalytics();
        refetchDaily();
      } else {
        refetchBattleProfile();
      }
    }, [mode, refetchAnalytics, refetchDaily, refetchBattleProfile])
  );

  const sessions  = analytics?.total_sessions ?? 0;
  const accuracy  = analytics?.overall_accuracy ?? 0;
  const avgTime   = analytics
    ? `${analytics.overall_avg_response_time.toFixed(1)}s`
    : "0s";
  // "–" rather than 0 when the daily data isn't available (e.g. offline before it was ever saved) -- a real 0 would
  // tell the student they'd broken their streak.
  const streakDays = dailyAnalytics ? dayStreak(dailyAnalytics.daily) : "–";

  // Battle profile is one row per subject with no server-side aggregate, so
  // the summary shown here is rolled up across all of them: total matches
  // played, overall win rate, and the league of whichever subject the
  // player is rated highest in (their "best" league is the more motivating
  // number to show at a glance than an arbitrary per-subject pick).
  const subjects = battleProfile?.subjects ?? [];
  const totalMatches = subjects.reduce((sum, s) => sum + s.matches_played, 0);
  const totalWins = subjects.reduce((sum, s) => sum + s.wins, 0);
  const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;
  const topSubject = subjects.length > 0
    ? subjects.reduce((best, s) => (s.rating > best.rating ? s : best))
    : null;
  const bestLeague = topSubject?.league ?? "Unranked";
  // Win streaks are tracked per subject, so show the best one that's currently running.
  const winStreak = subjects.reduce((best, s) => Math.max(best, s.current_win_streak), 0);

  const isLoading = mode === "practice" ? isAnalyticsLoading : isBattleLoading;

  const handlePress = () => {
    if (mode === "practice") {
      router.push("/(tabs)/profile");
    } else {
      router.push("/(main)/battle/leaderboard" as any);
    }
  };

  return (
    <TouchableOpacity className="w-full items-center" activeOpacity={0.85} onPress={handlePress}>
      {isLoading ? (
        <>
          <Skeleton width={DONUT_SIZE} height={DONUT_SIZE} borderRadius={DONUT_SIZE / 2} color={ICON_COLORS.primary400} />
          <View className="flex-row w-full mt-4 gap-2">
            {[0, 1, 2].map((i) => (
              <View key={i} className="flex-1 items-center gap-1.5">
                <Skeleton width={40} height={16} color={ICON_COLORS.primary400} />
                <Skeleton width={56} height={10} color={ICON_COLORS.primary400} />
              </View>
            ))}
          </View>
        </>
      ) : (
        <>
          <Donut
            percent={mode === "practice" ? accuracy : winRate}
            label={mode === "practice" ? "Accuracy" : "Win Rate"}
            replayKey={focusCount}
          />
          <View className="flex-row w-full mt-4 items-center">
            {mode === "practice" ? (
              <>
                <StatCell value={sessions} label="Sessions" />
                <Divider />
                <StatCell value={avgTime} label="Avg / Q" />
                <Divider />
                <StatCell value={streakDays} label="Day streak" flame />
              </>
            ) : (
              <>
                <StatCell value={totalMatches} label="Matches" />
                <Divider />
                <StatCell value={bestLeague} label="Top League" />
                <Divider />
                <StatCell value={winStreak} label="Win streak" flame />
              </>
            )}
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}
