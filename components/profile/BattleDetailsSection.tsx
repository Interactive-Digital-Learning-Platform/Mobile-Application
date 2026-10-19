import { View, Text } from "react-native";
import { Swords } from "lucide-react-native";
import { useBattleAnalyticsQuery } from "@/hooks/use-battle";
import { ICON_COLORS } from "@/constants/quizStyles";
import type { BattleAnalyticsResponse, BattleSpeedTier, BattleTopicStat } from "@/types/battleModuleTypes";
import SectionHeader from "./SectionHeader";
import { FormDots, RatingSparkline } from "./BattleSummaryCard";

// Detailed battle analytics: battle vs practice accuracy, answer-speed bands, where points come from (incl. the
// streak bonus), what happened to each question (answered / skipped / not reached), how matches ended, strongest /
// weakest battle topics and rating per subject. Marks use the primary ramp; every number is also printed as text.

const TOPICS_SHOWN = 3;

function SubHeading({ children }: { children: string }) {
  return <Text className="text-slate-800 font-bold text-[13px] mt-5 mb-2">{children}</Text>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 bg-primary-50 rounded-2xl px-3 py-2.5">
      <Text className="text-slate-800 font-black text-[18px]">{value}</Text>
      <Text className="text-slate-500 text-[11px] mt-0.5">{label}</Text>
    </View>
  );
}

function speedLabel(t: BattleSpeedTier, prevMax: number | null): string {
  if (t.max_seconds == null) return `Over ${prevMax}s`;
  if (prevMax == null) return `Under ${t.max_seconds}s`;
  return `${prevMax}–${t.max_seconds}s`;
}

function SpeedProfile({ tiers }: { tiers: BattleSpeedTier[] }) {
  const total = tiers.reduce((n, t) => n + t.answered, 0);
  if (total === 0) return <Text className="text-slate-400 text-xs">No answers yet.</Text>;
  const max = Math.max(...tiers.map((t) => t.answered));
  // Sentence: the band where the player is most accurate (with enough answers to mean something).
  const best = tiers
    .filter((t) => t.answered >= 5)
    .reduce<BattleSpeedTier | null>((b, t) => (!b || t.correct / t.answered > b.correct / b.answered ? t : b), null);
  const bestIdx = best ? tiers.indexOf(best) : -1;
  return (
    <View>
      <View className="gap-2">
        {tiers.map((t, i) => {
          const label = speedLabel(t, i > 0 ? tiers[i - 1].max_seconds : null);
          const acc = t.answered > 0 ? Math.round((t.correct / t.answered) * 100) : 0;
          return (
            <View key={t.tier} accessible accessibilityLabel={`${label}: ${t.answered} answers, ${acc} percent correct`}>
              <View className="flex-row justify-between mb-1">
                <Text className="text-slate-600 text-[12px] font-semibold">{label}</Text>
                <Text className="text-slate-500 text-[11px]">
                  {t.answered} {t.answered === 1 ? "answer" : "answers"}{t.answered > 0 ? ` · ${acc}% right` : ""}
                </Text>
              </View>
              <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <View className="h-full rounded-full" style={{ width: `${(t.answered / max) * 100}%`, backgroundColor: ICON_COLORS.primary600 }} />
              </View>
            </View>
          );
        })}
      </View>
      {best && (
        <Text className="text-slate-500 text-[12px] mt-2.5">
          You&apos;re most accurate when answering in{" "}
          <Text className="text-slate-800 font-bold">{speedLabel(best, bestIdx > 0 ? tiers[bestIdx - 1].max_seconds : null).toLowerCase()}</Text>.
        </Text>
      )}
    </View>
  );
}

function PointsBreakdown({ points }: { points: BattleAnalyticsResponse["points"] }) {
  const parts = [
    { key: "Correct answers", n: points.base, color: ICON_COLORS.primary600 },
    { key: "Speed bonus", n: points.speed_bonus, color: ICON_COLORS.primary400 },
    { key: "Streak bonus", n: points.streak_bonus, color: ICON_COLORS.primary200 },
  ];
  const total = parts.reduce((n, p) => n + p.n, 0);
  if (total === 0) return <Text className="text-slate-400 text-xs">No points yet.</Text>;
  return (
    <View>
      <View className="flex-row h-3 rounded-full overflow-hidden gap-[2px]">
        {parts.filter((p) => p.n > 0).map((p) => (
          <View key={p.key} style={{ flex: p.n / total, backgroundColor: p.color }} />
        ))}
      </View>
      <View className="mt-2.5 gap-1.5">
        {parts.map((p) => (
          <View key={p.key} className="flex-row items-center">
            <View className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: p.color }} />
            <Text className="flex-1 text-slate-600 text-[12px]">{p.key}</Text>
            <Text className="text-slate-800 text-[12px] font-bold">{Math.round((p.n / total) * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function QuestionUsage({ usage }: { usage: NonNullable<BattleAnalyticsResponse["question_usage"]> }) {
  if (usage.questions === 0) return <Text className="text-slate-400 text-xs">No questions yet.</Text>;
  const parts = [
    { key: "Answered", n: usage.answered, color: ICON_COLORS.primary600 },
    { key: "Skipped", n: usage.skipped, color: ICON_COLORS.primary400 },
    { key: "Not reached", n: usage.not_reached, color: ICON_COLORS.primary200 },
  ];
  return (
    <View>
      <View className="flex-row h-3 rounded-full overflow-hidden gap-[2px]">
        {parts.filter((p) => p.n > 0).map((p) => (
          <View key={p.key} style={{ flex: p.n / usage.questions, backgroundColor: p.color }} />
        ))}
      </View>
      <View className="mt-2.5 gap-1.5">
        {parts.map((p) => (
          <View key={p.key} className="flex-row items-center">
            <View className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: p.color }} />
            <Text className="flex-1 text-slate-600 text-[12px]">{p.key}</Text>
            <Text className="text-slate-800 text-[12px] font-bold">
              {p.n} · {Math.round((p.n / usage.questions) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function MatchEndings({ endings }: { endings: NonNullable<BattleAnalyticsResponse["match_endings"]> }) {
  const counted = endings.all_finished + endings.time_up + endings.forfeit;
  if (counted === 0) return <Text className="text-slate-400 text-xs">No matches yet.</Text>;
  return (
    <View>
      <View className="flex-row gap-2">
        <Stat value={String(endings.all_finished)} label="Both finished" />
        <Stat value={String(endings.time_up)} label="Time ran out" />
        <Stat value={String(endings.forfeit)} label="Forfeits" />
      </View>
      {endings.average_finish_seconds != null && (
        <Text className="text-slate-500 text-[12px] mt-2.5">
          You got through every question in{" "}
          <Text className="text-slate-800 font-bold">
            {endings.finished_all_questions} {endings.finished_all_questions === 1 ? "match" : "matches"}
          </Text>
          , in <Text className="text-slate-800 font-bold">{formatDuration(endings.average_finish_seconds)}</Text> on average.
        </Text>
      )}
    </View>
  );
}

function TopicList({ title, topics, tone }: { title: string; topics: BattleTopicStat[]; tone: "good" | "bad" }) {
  if (topics.length === 0) return null;
  return (
    <View className="flex-1">
      <Text className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 ${tone === "good" ? "text-emerald-600" : "text-rose-600"}`}>{title}</Text>
      {topics.map((t) => (
        <View key={`${t.subject}-${t.lesson}`} className="mb-1.5">
          <Text className="text-slate-800 text-[12px] font-semibold" numberOfLines={1}>{t.lesson}</Text>
          <Text className="text-slate-400 text-[11px]">{t.subject} · {Math.round(t.accuracy)}% of {t.answered}</Text>
        </View>
      ))}
    </View>
  );
}

export default function BattleDetailsSection({ practiceAccuracy }: { practiceAccuracy?: number }) {
  const { data } = useBattleAnalyticsQuery();
  if (!data || data.matches_played === 0) return null;

  // Strongest from the top, weakest from the bottom -- never the same lesson in both lists.
  const strongest = data.topics.slice(0, TOPICS_SHOWN);
  const weakest = data.topics.slice(TOPICS_SHOWN).slice(-TOPICS_SHOWN).reverse();
  const stronger = data.vs_stronger;

  return (
    <View className="bg-white rounded-[24px] p-4 shadow-sm shadow-black/5 mb-3">
      <SectionHeader
        icon={Swords}
        label="Battles"
        right={<Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{data.matches_played} played</Text>}
      />

      <View className="flex-row gap-2">
        <Stat value={`${Math.round(data.accuracy)}%`} label="Battle accuracy" />
        {practiceAccuracy != null && <Stat value={`${Math.round(practiceAccuracy)}%`} label="Practice accuracy" />}
        <Stat value={String(Math.round(data.average_score))} label="Avg score" />
      </View>
      {stronger.played > 0 && (
        <Text className="text-slate-500 text-[12px] mt-2.5">
          Against higher-rated players you won{" "}
          <Text className="text-slate-800 font-bold">{stronger.wins} of {stronger.played}</Text>.
        </Text>
      )}

      <SubHeading>Recent form</SubHeading>
      <FormDots results={data.recent_form} />

      <SubHeading>Answer speed</SubHeading>
      <SpeedProfile tiers={data.speed_profile} />

      <SubHeading>Where your points come from</SubHeading>
      <PointsBreakdown points={data.points} />

      {data.question_usage && (
        <>
          <SubHeading>Your questions</SubHeading>
          <QuestionUsage usage={data.question_usage} />
        </>
      )}

      {data.match_endings && (
        <>
          <SubHeading>How your matches ended</SubHeading>
          <MatchEndings endings={data.match_endings} />
        </>
      )}

      {(strongest.length > 0 || weakest.length > 0) && (
        <>
          <SubHeading>Battle topics</SubHeading>
          <View className="flex-row gap-3">
            <TopicList title="Strongest" topics={strongest} tone="good" />
            <TopicList title="Needs work" topics={weakest} tone="bad" />
          </View>
        </>
      )}

      <SubHeading>Rating by subject</SubHeading>
      <View className="gap-3">
        {data.rating_history.map((h) => {
          const first = h.points[0]?.rating ?? 0;
          const last = h.points[h.points.length - 1]?.rating ?? 0;
          const change = last - first;
          return (
            <View key={h.subject} className="flex-row items-center">
              <View className="flex-1">
                <Text className="text-slate-800 text-[13px] font-bold">{h.subject}</Text>
                <Text className="text-slate-500 text-[11px]">
                  {last} rating ·{" "}
                  <Text className={change > 0 ? "text-emerald-600" : change < 0 ? "text-rose-600" : "text-slate-500"}>
                    {change > 0 ? "+" : ""}{change}
                  </Text>{" "}
                  in {h.points.length} {h.points.length === 1 ? "battle" : "battles"}
                </Text>
              </View>
              <RatingSparkline points={h.points} width={96} height={32} />
            </View>
          );
        })}
      </View>
    </View>
  );
}
