/**
 * GrowthSection.tsx
 * ─────────────────────────────────────────────────────────
 * Section 4 — effort score, consistency score, growth score, mastery score.
 * Reads UserAnalyticsResponse.growth (optional — older backend responses
 * won't have it). All four scores are independently nullable on the backend
 * (e.g. mastery_score can be null before enough attempts exist), so each
 * tile falls back to "—" rather than hiding the whole card.
 */
import { View, Text } from "react-native";
import { Sprout, Flame, CalendarCheck2, Award } from "lucide-react-native";
import type { GrowthAnalytics } from "@/types/quizModuleTypes";
import { C, profileStyles as styles } from "./profileTheme";
import SectionHeader from "./SectionHeader";
import StatTile from "./StatTile";
import EmptyState from "./EmptyState";

interface GrowthSectionProps {
  growth?: GrowthAnalytics;
}

const GROWTH_LEVEL_META: Record<string, { color: string; bg: string; label: string }> = {
  excellent: { color: "#16A34A", bg: "#DCFCE7", label: "Excellent Growth" },
  strong: { color: "#16A34A", bg: "#DCFCE7", label: "Strong Growth" },
  steady: { color: C.p600, bg: C.p100, label: "Steady Growth" },
  moderate: { color: C.p600, bg: C.p100, label: "Moderate Growth" },
  slow: { color: "#D97706", bg: "#FEF3C7", label: "Slow Growth" },
  stalled: { color: "#DC2626", bg: "#FFE4E6", label: "Stalled Growth" },
};

function isPresent(value: number | null | undefined): value is number {
  return value !== undefined && value !== null;
}

function formatScore(value: number | null | undefined): string {
  return isPresent(value) ? `${Math.round(value)}` : "—";
}

export default function GrowthSection({ growth }: GrowthSectionProps) {
  const hasAnyData =
    !!growth &&
    (isPresent(growth.effort_score) ||
      isPresent(growth.consistency_score) ||
      isPresent(growth.growth_score) ||
      isPresent(growth.mastery_score));

  const levelMeta = growth ? GROWTH_LEVEL_META[growth.growth_level] : undefined;

  return (
    <View style={[styles.card, { marginBottom: 12 }]}>
      <SectionHeader icon={Sprout} label="Growth" />

      {hasAnyData ? (
        <View style={{ gap: 10 }}>
          {levelMeta && (
            <View
              style={{
                alignSelf: "flex-start", backgroundColor: levelMeta.bg,
                borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 2,
              }}
            >
              <Text style={{ color: levelMeta.color, fontWeight: "800", fontSize: 12 }}>
                {levelMeta.label}
              </Text>
            </View>
          )}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatTile
              icon={Flame}
              iconColor={C.p600}
              iconBg={C.p100}
              label="Effort"
              value={formatScore(growth?.effort_score)}
            />
            <StatTile
              icon={CalendarCheck2}
              iconColor={C.p600}
              iconBg={C.p100}
              label="Consistency"
              value={formatScore(growth?.consistency_score)}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatTile
              icon={Sprout}
              iconColor="#16A34A"
              iconBg="#DCFCE7"
              label="Growth"
              value={formatScore(growth?.growth_score)}
            />
            <StatTile
              icon={Award}
              iconColor={C.p600}
              iconBg={C.p100}
              label="Mastery"
              value={formatScore(growth?.mastery_score)}
            />
          </View>
        </View>
      ) : (
        <EmptyState icon={Sprout} message="Growth scores will appear once you've completed more quizzes." />
      )}
    </View>
  );
}
