import { View, Text } from "react-native";
import { Sprout, Flame, CalendarCheck2, Award } from "lucide-react-native";
import type { GrowthAnalytics } from "@/types/quizModuleTypes";
import { ICON_COLORS } from "@/constants/quizStyles";
import SectionHeader from "./SectionHeader";
import StatTile from "./StatTile";
import EmptyState from "./EmptyState";

interface GrowthSectionProps {
  growth?: GrowthAnalytics;
}

const GROWTH_LEVEL_META: Record<string, { textClass: string; bgClass: string; label: string }> = {
  excellent: { textClass: "text-emerald-600", bgClass: "bg-emerald-100", label: "Excellent Growth" },
  strong:    { textClass: "text-emerald-600", bgClass: "bg-emerald-100", label: "Strong Growth" },
  steady:    { textClass: "text-primary-600", bgClass: "bg-primary-100", label: "Steady Growth" },
  moderate:  { textClass: "text-primary-600", bgClass: "bg-primary-100", label: "Moderate Growth" },
  slow:      { textClass: "text-amber-600",   bgClass: "bg-amber-100",   label: "Slow Growth" },
  stalled:   { textClass: "text-rose-600",    bgClass: "bg-rose-100",    label: "Stalled Growth" },
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
    <View className="bg-white rounded-[18px] p-3.5 border border-slate-100 shadow-sm shadow-black/5 mb-3">
      <SectionHeader icon={Sprout} label="Growth" />

      {hasAnyData ? (
        <View className="gap-2.5">
          {levelMeta && (
            <View className={`self-start rounded-full px-3 py-1.5 mb-0.5 ${levelMeta.bgClass}`}>
              <Text className={`font-extrabold text-xs ${levelMeta.textClass}`}>
                {levelMeta.label}
              </Text>
            </View>
          )}
          <View className="flex-row gap-2.5">
            <StatTile
              icon={Flame}
              iconColor={ICON_COLORS.primary600}
              iconBgClass="bg-primary-100"
              label="Effort"
              value={formatScore(growth?.effort_score)}
            />
            <StatTile
              icon={CalendarCheck2}
              iconColor={ICON_COLORS.primary600}
              iconBgClass="bg-primary-100"
              label="Consistency"
              value={formatScore(growth?.consistency_score)}
            />
          </View>
          <View className="flex-row gap-2.5">
            <StatTile
              icon={Sprout}
              iconColor={ICON_COLORS.emerald600}
              iconBgClass="bg-emerald-100"
              label="Growth"
              value={formatScore(growth?.growth_score)}
            />
            <StatTile
              icon={Award}
              iconColor={ICON_COLORS.primary600}
              iconBgClass="bg-primary-100"
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
