import { View, Text } from "react-native";
import { LineChart, TrendingUp, TrendingDown, Minus } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { PerformanceTrend } from "@/types/quizModuleTypes";
import { ICON_COLORS } from "@/constants/quizStyles";
import SectionHeader from "./SectionHeader";
import EmptyState from "./EmptyState";

interface ProgressTrendSectionProps {
  trend?: PerformanceTrend;
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

export default function ProgressTrendSection({ trend }: ProgressTrendSectionProps) {
  const isUsable = !!trend && trend.trend !== "insufficient_data";
  const meta = (trend && TREND_META[trend.trend]) ?? TREND_META.stable;
  const Icon = meta.icon;
  const change = trend?.accuracy_change ?? 0;

  return (
    <View className="bg-white rounded-[18px] p-3.5 border border-slate-100 shadow-sm shadow-black/5 mb-3">
      <SectionHeader icon={LineChart} label="Progress Trend" />

      {isUsable ? (
        <View>
          <View className="flex-row gap-2.5 mb-3">
            <View className="flex-1 items-center">
              <Text className="text-xl font-black text-slate-800">
                {Math.round(trend!.current_period_accuracy)}%
              </Text>
              <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                Current
              </Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-xl font-black text-slate-500">
                {Math.round(trend!.previous_period_accuracy)}%
              </Text>
              <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                Previous
              </Text>
            </View>
          </View>
          <View className={`flex-row items-center justify-center gap-1.5 rounded-xl py-2 ${meta.bgClass}`}>
            <Icon size={14} color={meta.iconColor} strokeWidth={2.5} />
            <Text className={`font-extrabold text-xs ${meta.textClass}`}>
              {meta.label} · {change > 0 ? "+" : ""}
              {change.toFixed(1)} pts
            </Text>
          </View>
        </View>
      ) : (
        <EmptyState icon={LineChart} message="Complete a few more quizzes to see your accuracy trend." />
      )}
    </View>
  );
}
