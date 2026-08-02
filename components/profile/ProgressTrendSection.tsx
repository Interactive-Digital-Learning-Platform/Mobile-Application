/**
 * ProgressTrendSection.tsx
 * ─────────────────────────────────────────────────────────
 * Section 2 — current-period vs previous-period accuracy, improvement/
 * decline, and the trend label. Reads UserAnalyticsResponse.performance_trend
 * (optional — older backend responses won't have it, and even when present
 * `trend` can be "insufficient_data" if there isn't enough recent history).
 */
import { View, Text } from "react-native";
import { LineChart, TrendingUp, TrendingDown, Minus } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { PerformanceTrend } from "@/src/modules/quiz/types";
import { C, profileStyles as styles } from "./profileTheme";
import SectionHeader from "./SectionHeader";
import EmptyState from "./EmptyState";

interface ProgressTrendSectionProps {
  trend?: PerformanceTrend;
}

const TREND_META: Record<string, { icon: LucideIcon; color: string; bg: string; label: string }> = {
  improving: { icon: TrendingUp, color: "#16A34A", bg: "#DCFCE7", label: "Improving" },
  declining: { icon: TrendingDown, color: "#DC2626", bg: "#FFE4E6", label: "Declining" },
  stable: { icon: Minus, color: C.p600, bg: C.p100, label: "Stable" },
};

export default function ProgressTrendSection({ trend }: ProgressTrendSectionProps) {
  const isUsable = !!trend && trend.trend !== "insufficient_data";
  const meta = (trend && TREND_META[trend.trend]) ?? TREND_META.stable;
  const Icon = meta.icon;
  const change = trend?.accuracy_change ?? 0;

  return (
    <View style={[styles.card, { marginBottom: 12 }]}>
      <SectionHeader icon={LineChart} label="Progress Trend" />

      {isUsable ? (
        <View>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 20, fontWeight: "900", color: "#1e293b" }}>
                {Math.round(trend!.current_period_accuracy)}%
              </Text>
              <Text style={{ fontSize: 9, color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Current
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 20, fontWeight: "900", color: "#64748b" }}>
                {Math.round(trend!.previous_period_accuracy)}%
              </Text>
              <Text style={{ fontSize: 9, color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Previous
              </Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
              backgroundColor: meta.bg, borderRadius: 12, paddingVertical: 8,
            }}
          >
            <Icon size={14} color={meta.color} strokeWidth={2.5} />
            <Text style={{ color: meta.color, fontWeight: "800", fontSize: 12 }}>
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
