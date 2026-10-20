import { View, TouchableOpacity } from "react-native";
import { Text } from "@/components/ui/AppText";
import { router } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import { Swords, ChevronRight } from "lucide-react-native";
import { useBattleAnalyticsQuery, useBattleProfileQuery } from "@/hooks/use-battle";
import LeagueBadge from "@/components/quiz-componets/LeagueBadge";
import Skeleton from "@/components/Skeleton";
import { ICON_COLORS } from "@/constants/quizStyles";
import type { BattleParticipantResultLabel, BattleRatingPoint } from "@/types/battleModuleTypes";
import SectionHeader from "./SectionHeader";

// Compact "Battles" card on the Profile tab: league + rating for the player's best subject, a rating sparkline, the
// win/draw/loss record and the last few results. The deeper battle breakdown lives on Detailed analytics.

const MARK = ICON_COLORS.primary600;

// Result colours are status-like (good / neutral / bad), always paired with a letter so they're never colour-only.
export const RESULT_DOT: Record<BattleParticipantResultLabel, { color: string; letter: string; label: string }> = {
  win: { color: ICON_COLORS.emerald600, letter: "W", label: "win" },
  draw: { color: ICON_COLORS.slate400, letter: "D", label: "draw" },
  loss: { color: ICON_COLORS.rose500, letter: "L", label: "loss" },
  forfeit: { color: ICON_COLORS.rose500, letter: "F", label: "forfeit" },
};

export function RatingSparkline({ points, width, height }: { points: BattleRatingPoint[]; width: number; height: number }) {
  if (points.length < 2) return <View style={{ width, height }} />;
  const ratings = points.map((p) => p.rating);
  const min = Math.min(...ratings);
  const span = Math.max(Math.max(...ratings) - min, 1);
  const x = (i: number) => (i / (points.length - 1)) * (width - 8) + 4;
  const y = (r: number) => 4 + (1 - (r - min) / span) * (height - 8);
  const d = ratings.map((r, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(r)}`).join(" ");
  const last = ratings[ratings.length - 1];
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={MARK} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={x(ratings.length - 1)} cy={y(last)} r={4} fill={MARK} stroke={ICON_COLORS.white} strokeWidth={2} />
    </Svg>
  );
}

export function FormDots({ results }: { results: BattleParticipantResultLabel[] }) {
  return (
    <View
      className="flex-row gap-1.5"
      accessible
      accessibilityLabel={`Last ${results.length} battles, oldest first: ${results.map((r) => RESULT_DOT[r].label).join(", ")}`}
    >
      {results.map((r, i) => (
        <View key={i} className="w-[22px] h-[22px] rounded-full items-center justify-center" style={{ backgroundColor: RESULT_DOT[r].color }}>
          <Text className="text-white text-[10px] font-black">{RESULT_DOT[r].letter}</Text>
        </View>
      ))}
    </View>
  );
}

function RecordBar({ wins, draws, losses }: { wins: number; draws: number; losses: number }) {
  const total = wins + draws + losses;
  const segments = [
    { n: wins, color: ICON_COLORS.emerald600 },
    { n: draws, color: ICON_COLORS.slate400 },
    { n: losses, color: ICON_COLORS.rose500 },
  ].filter((s) => s.n > 0);
  return (
    <View className="flex-row h-2.5 rounded-full overflow-hidden gap-[2px]">
      {segments.map((s, i) => (
        <View key={i} style={{ flex: s.n / total, backgroundColor: s.color }} />
      ))}
    </View>
  );
}

function openBattleDetails() {
  router.push({ pathname: "/(main)/profile/details", params: { section: "battles" } } as any);
}

export default function BattleSummaryCard() {
  const { data, isLoading } = useBattleAnalyticsQuery();
  const { data: profile } = useBattleProfileQuery();

  if (isLoading) {
    return <Skeleton width="100%" height={196} borderRadius={24} color={ICON_COLORS.primary50} style={{ marginBottom: 12 }} />;
  }
  // Battle service unreachable with nothing saved -- leave the rest of the Profile undisturbed.
  if (!data) return null;

  if (data.matches_played === 0) {
    return (
      <View className="bg-white rounded-[24px] p-4 shadow-sm shadow-black/5 mb-3">
        <SectionHeader icon={Swords} label="Battles" />
        <Text className="text-slate-500 text-[13px] mb-3">Play your first 1v1 battle to unlock your battle stats.</Text>
        <TouchableOpacity
          className="self-start px-4 py-2 rounded-full bg-primary-100"
          activeOpacity={0.85}
          onPress={() => router.push({ pathname: "/(tabs)/quiz", params: { mode: "online" } } as any)}
        >
          <Text className="text-primary-700 text-xs font-bold">Find a battle</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Headline subject: the one rated highest (same pick as the Quizzes-tab header's "Top league").
  const subjects = profile?.subjects ?? [];
  const top = subjects.length > 0 ? subjects.reduce((best, s) => (s.rating > best.rating ? s : best)) : null;
  const history = data.rating_history.find((h) => h.subject === top?.subject) ?? data.rating_history[0];
  const points = history?.points ?? [];
  const change = points.length > 1 ? points[points.length - 1].rating - points[0].rating : 0;

  return (
    <TouchableOpacity
      className="bg-white rounded-[24px] p-4 shadow-sm shadow-black/5 mb-3"
      activeOpacity={0.85}
      onPress={openBattleDetails}
      accessibilityRole="button"
      accessibilityHint="Opens your detailed battle stats"
    >
      <SectionHeader icon={Swords} label="Battles" right={top ? <LeagueBadge league={top.league} size="md" /> : null} />

      <View className="flex-row items-end justify-between">
        <View>
          <Text className="text-slate-800 font-black text-[30px] leading-[34px]">{top?.rating ?? points[points.length - 1]?.rating ?? 0}</Text>
          <Text className="text-slate-500 text-[12px] mt-0.5">
            {history?.subject ?? top?.subject} rating{top ? ` · #${top.rank}` : ""}
          </Text>
          {points.length > 1 && (
            <Text className={`text-[12px] font-bold mt-0.5 ${change > 0 ? "text-emerald-600" : change < 0 ? "text-rose-600" : "text-slate-500"}`}>
              {change > 0 ? "+" : ""}{change} over last {points.length} battles
            </Text>
          )}
        </View>
        <RatingSparkline points={points} width={130} height={48} />
      </View>

      <View className="mt-4">
        <View className="flex-row justify-between mb-1.5">
          <Text className="text-slate-700 text-[12px] font-bold">
            {data.wins}W · {data.draws}D · {data.losses + data.forfeits}L
          </Text>
          <Text className="text-slate-700 text-[12px] font-bold">{Math.round(data.win_rate)}% wins</Text>
        </View>
        <RecordBar wins={data.wins} draws={data.draws} losses={data.losses + data.forfeits} />
      </View>

      <View className="flex-row items-center justify-between mt-4">
        <View>
          <Text className="text-slate-400 text-[11px] font-semibold mb-1.5">Recent form</Text>
          <FormDots results={data.recent_form.slice(-6)} />
        </View>
        <View className="flex-row items-center gap-0.5 self-end">
          <Text className="text-primary-700 text-[12px] font-bold">Details</Text>
          <ChevronRight size={14} color={ICON_COLORS.primary700} strokeWidth={2.5} />
        </View>
      </View>
    </TouchableOpacity>
  );
}
