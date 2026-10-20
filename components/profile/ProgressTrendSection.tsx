import { View } from "react-native";
import { Text } from "@/components/ui/AppText";
import { LineChart, TrendingUp, TrendingDown, Minus } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { AccuracyHistoryPoint, PerformanceTrend } from "@/types/quizModuleTypes";
import { ICON_COLORS } from "@/constants/quizStyles";
import SectionHeader from "./SectionHeader";
import EmptyState from "./EmptyState";
import AccuracyLineChart from "./AccuracyLineChart";

interface ProgressTrendSectionProps {
  trend?: PerformanceTrend;
  history?: AccuracyHistoryPoint[];
}

const TREND_META: Record<
  string,
  { icon: LucideIcon; iconColor: string; bgClass: string; textClass: string; label: string }
> = {
  improving: {
    icon: TrendingUp, iconColor: ICON_COLORS.emerald600,
    bgClass: "bg-emerald-100", textClass: "text-emerald-600", label: "Improving",
  },
  declining: {
    icon: TrendingDown, iconColor: ICON_COLORS.rose600,
    bgClass: "bg-rose-100", textClass: "text-rose-600", label: "Declining",
  },
  stable: {
    icon: Minus, iconColor: ICON_COLORS.primary600,
    bgClass: "bg-primary-100", textClass: "text-primary-600", label: "Stable",
  },
};

// Names exactly which quizzes each number covers, matching the shaded bands in the chart below it.
function periodLabels(trend: PerformanceTrend): { current: string; previous: string } {
  if (trend.method === "weekly") return { current: "This week", previous: "Last week" };
  return {
    current: `Last ${trend.current_period_sessions} quizzes`,
    previous: `${trend.previous_period_sessions} before`,
  };
}

export default function ProgressTrendSection({ trend, history = [] }: ProgressTrendSectionProps) {
  const isUsable = !!trend && trend.trend !== "insufficient_data";
  const hasChart = history.length >= 2;
  const meta = (trend && TREND_META[trend.trend]) ?? TREND_META.stable;
  const Icon = meta.icon;
  const change = trend?.accuracy_change ?? 0;
  const labels = isUsable ? periodLabels(trend!) : null;

  return (
    <View className="bg-white rounded-[18px] p-3.5 border border-slate-100 shadow-sm shadow-black/5 mb-3">
      <SectionHeader icon={LineChart} label="Progress Trend" />

      {isUsable || hasChart ? (
        <View>
          {isUsable && (
            <View className="flex-row gap-2.5 mb-3">
              <View className="flex-1 items-center">
                <Text className="text-xl font-black text-slate-800">
                  {Math.round(trend!.current_period_accuracy)}%
                </Text>
                <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  {labels!.current}
                </Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-xl font-black text-slate-500">
                  {Math.round(trend!.previous_period_accuracy)}%
                </Text>
                <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  {labels!.previous}
                </Text>
              </View>
            </View>
          )}

          {hasChart && (
            <View className="mb-3">
              <AccuracyLineChart history={history} trend={trend} />
            </View>
          )}

          {isUsable ? (
            <View className={`flex-row items-center justify-center gap-1.5 rounded-xl py-2 ${meta.bgClass}`}>
              <Icon size={14} color={meta.iconColor} strokeWidth={2.5} />
              <Text className={`font-extrabold text-xs ${meta.textClass}`}>
                {meta.label} · {change > 0 ? "+" : ""}
                {change.toFixed(1)} pts
              </Text>
            </View>
          ) : (
            <Text className="text-[11px] text-slate-400 text-center">
              Complete a few more quizzes to compare your recent accuracy with earlier quizzes.
            </Text>
          )}
        </View>
      ) : (
        <EmptyState icon={LineChart} message="Complete a few more quizzes to see your accuracy trend." />
      )}
    </View>
  );
}
