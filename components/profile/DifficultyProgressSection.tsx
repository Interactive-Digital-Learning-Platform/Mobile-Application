import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import {
  Layers, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus,
  Gauge, ShieldCheck, ListChecks, Zap, RotateCcw,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { AdaptiveMasteryDetail, SubjectAnalytics } from "@/types/quizModuleTypes";
import { ICON_COLORS } from "@/constants/quizStyles";
import DifficultyBadge from "@/components/quiz-componets/DifficultyBadge";
import SectionHeader from "./SectionHeader";
import EmptyState from "./EmptyState";

interface DifficultyProgressSectionProps {
  subjects: SubjectAnalytics[];
}

function isPresent(value: number | undefined | null): value is number {
  return value !== undefined && value !== null;
}

const TREND_META: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  improving: { icon: TrendingUp, color: ICON_COLORS.emerald600, label: "Improving" },
  declining: { icon: TrendingDown, color: ICON_COLORS.rose600, label: "Declining" },
  stable: { icon: Minus, color: ICON_COLORS.primary600, label: "Stable" },
  insufficient_data: { icon: Minus, color: ICON_COLORS.slate400, label: "Not enough data" },
};

function DetailTile({ icon: Icon, iconColor, label, value }: {
  icon: LucideIcon; iconColor: string; label: string; value: string;
}) {
  return (
    <View className="flex-1 items-center gap-0.5">
      <Icon size={13} color={iconColor} strokeWidth={2.25} />
      <Text className="text-slate-700 font-extrabold text-[11px]">{value}</Text>
      <Text className="text-slate-400 text-[8px] font-bold uppercase tracking-wider text-center" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function MasteryDetailPanel({ mastery }: { mastery: AdaptiveMasteryDetail }) {
  const trendMeta = TREND_META[mastery.trend_label] ?? TREND_META.insufficient_data;

  return (
    <View className="mt-2.5 pt-2.5 border-t border-slate-100 gap-2.5">
      <View className="flex-row">
        <DetailTile
          icon={Gauge} iconColor={ICON_COLORS.primary500}
          label="Mastery" value={`${Math.round(mastery.mastery_score)}`}
        />
        <DetailTile
          icon={ShieldCheck} iconColor={ICON_COLORS.emerald600}
          label="Confidence" value={`${Math.round(mastery.confidence_score)}%`}
        />
        <DetailTile
          icon={ListChecks} iconColor={ICON_COLORS.slate500}
          label="Evidence" value={`${mastery.evidence_count} Qs`}
        />
      </View>
      <View className="flex-row">
        <DetailTile
          icon={Zap} iconColor={ICON_COLORS.amber600}
          label="Fluency" value={`${Math.round(mastery.fluency_score)}`}
        />
        <DetailTile
          icon={RotateCcw} iconColor={ICON_COLORS.primary600}
          label="Retention"
          value={isPresent(mastery.retention_score) ? `${Math.round(mastery.retention_score)}` : "—"}
        />
        <DetailTile
          icon={trendMeta.icon} iconColor={trendMeta.color}
          label="Trend" value={trendMeta.label}
        />
      </View>
    </View>
  );
}

function SubjectDifficultyRow({ s }: { s: SubjectAnalytics }) {
  const [expanded, setExpanded] = useState(false);

  const progress = isPresent(s.promotion_progress_percentage)
    ? Math.min(100, Math.max(0, s.promotion_progress_percentage))
    : undefined;
  const canShowProgress = progress !== undefined && !!s.next_difficulty;
  const canExpand = !!s.adaptive_mastery;

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-extrabold text-slate-800 flex-1 mr-2" numberOfLines={1}>
          {s.subject}
        </Text>
        <DifficultyBadge difficulty={s.current_difficulty} size="xs" />
      </View>

      {canShowProgress ? (
        <View>
          <View className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <View className="h-full bg-primary-500 rounded-full" style={{ width: `${progress}%` }} />
          </View>
          <View className="flex-row items-center justify-between mt-1">
            <Text className="text-[10px] text-slate-400">{Math.round(progress)}% to next level</Text>
            <View className="flex-row items-center gap-1">
              <Text className="text-[10px] text-slate-400">Next:</Text>
              <DifficultyBadge difficulty={s.next_difficulty!} size="xs" />
            </View>
          </View>
        </View>
      ) : (
        <Text className="text-[10px] text-slate-400">
          {s.difficulty_status_message ?? "Keep practicing to progress to the next difficulty."}
        </Text>
      )}

      {canExpand && (
        <Pressable
          onPress={() => setExpanded((prev) => !prev)}
          className="flex-row items-center justify-center gap-0.5 mt-0.5"
          hitSlop={6}
        >
          <Text className="text-[9px] text-primary-500 font-bold uppercase tracking-wider">
            {expanded ? "Hide details" : "Show details"}
          </Text>
          {expanded ? (
            <ChevronUp size={11} color={ICON_COLORS.primary500} strokeWidth={2.5} />
          ) : (
            <ChevronDown size={11} color={ICON_COLORS.primary500} strokeWidth={2.5} />
          )}
        </Pressable>
      )}

      {expanded && s.adaptive_mastery && <MasteryDetailPanel mastery={s.adaptive_mastery} />}
    </View>
  );
}

export default function DifficultyProgressSection({ subjects }: DifficultyProgressSectionProps) {
  const hasSubjects = subjects.length > 0;

  return (
    <View className="bg-white rounded-[18px] p-3.5 border border-slate-100 shadow-sm shadow-black/5 mb-3">
      <SectionHeader icon={Layers} label="Difficulty Progress" />

      {hasSubjects ? (
        <View className="gap-3.5">
          {subjects.map((s) => (
            <SubjectDifficultyRow key={s.subject} s={s} />
          ))}
        </View>
      ) : (
        <EmptyState icon={Layers} message="Difficulty progress will appear once you start practicing subjects." />
      )}
    </View>
  );
}
