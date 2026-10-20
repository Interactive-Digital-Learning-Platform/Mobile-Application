import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/AppText";
import Svg, { Circle, Path } from "react-native-svg";
import { Target, CalendarDays, Flame, LineChart, type LucideIcon } from "lucide-react-native";
import { useDailyAnalyticsQuery } from "@/hooks/use-quiz";
import Skeleton from "@/components/Skeleton";
import type { AccuracyHistoryPoint, DailyActivityPoint, PerformanceTrend } from "@/types/quizModuleTypes";
import { ICON_COLORS } from "@/constants/quizStyles";

// Student-friendly overview: four cards, each with an icon label, one big number, a tiny chart and one plain
// sentence. Marks use primary-600 (primary-500 is under 3:1 on white); numbers and sentences use text tokens.
const MARK = ICON_COLORS.primary600;
const TRACK = ICON_COLORS.primary100;
const EMPTY = "#e2e8f0"; // slate-200
const CARD_MIN_HEIGHT = 178;
const SPARK_POINTS = 10;

function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function Card({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <View
      className="flex-1 bg-white rounded-[24px] p-4 shadow-sm shadow-black/5"
      style={{ minHeight: CARD_MIN_HEIGHT }}
    >
      <View className="flex-row items-center gap-1.5 mb-2">
        <Icon size={14} color={ICON_COLORS.slate500} strokeWidth={2} />
        <Text className="text-slate-500 text-xs font-semibold">{label}</Text>
      </View>
      {children}
    </View>
  );
}

function Sentence({ children }: { children: ReactNode }) {
  return <Text className="text-slate-500 text-[12px] leading-[16px] mt-auto">{children}</Text>;
}

function Strong({ children }: { children: ReactNode }) {
  return <Text className="text-slate-800 font-bold">{children}</Text>;
}

// ── 1. Accuracy: semicircle gauge with the value inside ────────────────────────
function AccuracyCard({ accuracy }: { accuracy: number }) {
  const pct = Math.min(Math.max(accuracy, 0), 100);
  const W = 128;
  const STROKE = 11;
  const R = (W - STROKE) / 2;
  const cx = W / 2;
  const cy = R + STROKE / 2;
  const arcLength = Math.PI * R;
  const arc = `M${cx - R},${cy} A${R},${R} 0 0 1 ${cx + R},${cy}`;
  const outOfTen = Math.round(pct / 10);

  return (
    <Card icon={Target} label="Accuracy">
      <View className="items-center" accessible accessibilityLabel={`Accuracy ${Math.round(pct)} percent`}>
        <View style={{ width: W, height: cy + 4 }}>
          <Svg width={W} height={cy + 4} style={{ position: "absolute" }}>
            <Path d={arc} stroke={TRACK} strokeWidth={STROKE} fill="none" strokeLinecap="round" />
            {pct > 0 && (
              <Path
                d={arc} stroke={MARK} strokeWidth={STROKE} fill="none" strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * arcLength} ${arcLength}`}
              />
            )}
          </Svg>
          <View className="absolute left-0 right-0 items-center" style={{ bottom: 0 }}>
            <Text className="text-slate-800 font-black text-[26px] leading-[30px]">{Math.round(pct)}%</Text>
          </View>
        </View>
      </View>
      <Sentence>
        You get about <Strong>{outOfTen} of every 10</Strong> right
      </Sentence>
    </Card>
  );
}

// ── 2. This week: weekly progress score + 7 mini bars of the daily scores ─────
function WeekCard({ daily, weeklyScore }: { daily: DailyActivityPoint[]; weeklyScore: number | null }) {
  const W = 132;
  const H = 46;
  const slot = W / daily.length;
  const barW = Math.min(12, slot * 0.6);
  const best = daily.reduce<DailyActivityPoint | null>(
    (top, d) => (d.progress_score !== null && (top === null || d.progress_score > (top.progress_score ?? 0)) ? d : top),
    null
  );

  return (
    <Card icon={CalendarDays} label="This week">
      <Text className="text-slate-800 font-black text-[28px] leading-[32px]">
        {weeklyScore === null ? "—" : Math.round(weeklyScore)}
        {weeklyScore !== null && <Text className="text-slate-400 text-sm font-bold">/100</Text>}
      </Text>
      <Svg width={W} height={H} style={{ marginTop: 8 }}>
        {daily.map((d, i) => {
          const x = slot * i + (slot - barW) / 2;
          if (d.progress_score === null) {
            return <Circle key={d.date} cx={x + barW / 2} cy={H - 2} r={2} fill={EMPTY} />;
          }
          const h = Math.max(3, (d.progress_score / 100) * H);
          return <Path key={d.date} d={`M${x},${H} L${x},${H - h + 2} Q${x},${H - h} ${x + 2},${H - h} L${x + barW - 2},${H - h} Q${x + barW},${H - h} ${x + barW},${H - h + 2} L${x + barW},${H} Z`} fill={d === best ? MARK : ICON_COLORS.primary300} />;
        })}
      </Svg>
      <Sentence>
        {best ? <>Best day: <Strong>{parseDay(best.date).toLocaleDateString("en-US", { weekday: "long" })}</Strong></> : "No quizzes this week yet"}
      </Sentence>
    </Card>
  );
}

// ── 3. Consistency: active days out of 7, one dot per day ─────────────────────
function ConsistencyCard({ daily, activeDays }: { daily: DailyActivityPoint[]; activeDays: number }) {
  return (
    <Card icon={Flame} label="Consistency">
      <Text className="text-slate-800 font-black text-[28px] leading-[32px]">
        {activeDays}
        <Text className="text-slate-400 text-sm font-bold">/{daily.length} days</Text>
      </Text>
      <View className="flex-row justify-between mt-3">
        {daily.map((d, i) => {
          const active = d.quizzes_completed > 0;
          const isToday = i === daily.length - 1;
          return (
            <View key={d.date} className="items-center gap-1">
              <View
                className={`w-3.5 h-3.5 rounded-full ${active ? "bg-primary-600" : "bg-slate-200"} ${isToday ? "border-2 border-primary-200" : ""}`}
              />
              <Text className={`text-[9px] ${isToday ? "text-slate-800 font-bold" : "text-slate-400"}`}>
                {parseDay(d.date).toLocaleDateString("en-US", { weekday: "narrow" })}
              </Text>
            </View>
          );
        })}
      </View>
      <Sentence>
        You practised <Strong>{activeDays} of the last {daily.length}</Strong> days
      </Sentence>
    </Card>
  );
}

// ── 4. Trend: improving / stable / declining with a sparkline of recent quizzes ─
const TREND_LABEL: Record<string, string> = {
  improving: "Improving",
  declining: "Declining",
  stable: "Stable",
};

function TrendCard({ trend, history }: { trend?: PerformanceTrend; history: AccuracyHistoryPoint[] }) {
  const usable = !!trend && trend.trend !== "insufficient_data";
  const label = usable ? TREND_LABEL[trend!.trend] ?? "Stable" : "Too early";
  const points = history.slice(-SPARK_POINTS);
  const W = 132;
  const H = 46;
  const x = (i: number) => (points.length > 1 ? (i / (points.length - 1)) * (W - 8) + 4 : W / 2);
  const y = (a: number) => 4 + (1 - a / 100) * (H - 8);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.accuracy)}`).join(" ");
  const last = points[points.length - 1];

  const change = trend?.accuracy_change ?? 0;
  const compared = trend?.method === "weekly" ? "last week" : `your previous ${trend?.previous_period_sessions ?? 0} quizzes`;
  let sentence: ReactNode;
  if (!usable) sentence = "Take a few more quizzes to see your trend";
  else if (trend!.trend === "improving") sentence = <>Up <Strong>{Math.abs(change).toFixed(0)} points</Strong> vs {compared}</>;
  else if (trend!.trend === "declining") sentence = <>Down <Strong>{Math.abs(change).toFixed(0)} points</Strong> vs {compared}</>;
  else sentence = <>About the <Strong>same</Strong> as {compared}</>;

  return (
    <Card icon={LineChart} label="Trend">
      <Text className="text-slate-800 font-black text-[24px] leading-[30px]">{label}</Text>
      {points.length > 1 ? (
        <Svg width={W} height={H} style={{ marginTop: 8 }}>
          <Path d={line} stroke={MARK} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          <Circle cx={x(points.length - 1)} cy={y(last.accuracy)} r={4} fill={MARK} stroke={ICON_COLORS.white} strokeWidth={2} />
        </Svg>
      ) : (
        <View style={{ height: H + 8 }} />
      )}
      <Sentence>{sentence}</Sentence>
    </Card>
  );
}

function BentoSkeleton() {
  return (
    <View className="gap-3">
      {[0, 1].map((row) => (
        <View key={row} className="flex-row gap-3">
          <Skeleton width="100%" height={CARD_MIN_HEIGHT} borderRadius={24} color={ICON_COLORS.primary50} style={{ flex: 1 }} />
          <Skeleton width="100%" height={CARD_MIN_HEIGHT} borderRadius={24} color={ICON_COLORS.primary50} style={{ flex: 1 }} />
        </View>
      ))}
    </View>
  );
}

interface OverviewBentoProps {
  accuracy: number;
  trend?: PerformanceTrend;
  history?: AccuracyHistoryPoint[];
}

export default function OverviewBento({ accuracy, trend, history = [] }: OverviewBentoProps) {
  const { data: daily, isLoading } = useDailyAnalyticsQuery(7);

  if (isLoading) return <BentoSkeleton />;

  const days = daily?.daily ?? [];
  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        <AccuracyCard accuracy={accuracy} />
        <WeekCard daily={days} weeklyScore={daily?.weekly_progress_score ?? null} />
      </View>
      <View className="flex-row gap-3">
        <ConsistencyCard daily={days} activeDays={daily?.active_days ?? 0} />
        <TrendCard trend={trend} history={history} />
      </View>
    </View>
  );
}
