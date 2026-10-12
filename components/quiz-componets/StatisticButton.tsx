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
import { useAnalyticsMeQuery } from "@/hooks/use-quiz";
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

function StatCell({ value, label }: { value: string | number; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-white text-lg font-black" numberOfLines={1}>{value}</Text>
      <Text className="text-white/80 text-[11px] font-medium">{label}</Text>
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
  // Bumped on every focus so the donut replays its fill animation each time the tab is shown.
  const [focusCount, setFocusCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setFocusCount((n) => n + 1);
      if (mode === "practice") {
        refetchAnalytics();
      } else {
        refetchBattleProfile();
      }
    }, [mode, refetchAnalytics, refetchBattleProfile])
  );

  const sessions  = analytics?.total_sessions ?? 0;
  const accuracy  = analytics?.overall_accuracy ?? 0;
  const avgTime   = analytics
    ? `${analytics.overall_avg_response_time.toFixed(1)}s`
    : "0s";

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
            <View className="flex-1 items-center gap-1.5">
              <Skeleton width={40} height={16} color={ICON_COLORS.primary400} />
              <Skeleton width={56} height={10} color={ICON_COLORS.primary400} />
            </View>
            <View className="flex-1 items-center gap-1.5">
              <Skeleton width={40} height={16} color={ICON_COLORS.primary400} />
              <Skeleton width={56} height={10} color={ICON_COLORS.primary400} />
            </View>
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
                <View className="w-px h-8 bg-white/40" />
                <StatCell value={avgTime} label="Avg / Q" />
              </>
            ) : (
              <>
                <StatCell value={totalMatches} label="Matches" />
                <View className="w-px h-8 bg-white/40" />
                <StatCell value={bestLeague} label="Top League" />
              </>
            )}
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}
