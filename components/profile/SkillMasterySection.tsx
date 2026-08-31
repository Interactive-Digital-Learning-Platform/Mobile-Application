import { View, Text } from "react-native";
import { Brain, Circle, Sparkles, TrendingUp } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { SubjectAnalytics } from "@/types/quizModuleTypes";
import { ICON_COLORS } from "@/constants/quizStyles";
import SectionHeader from "./SectionHeader";
import EmptyState from "./EmptyState";

interface SkillMasterySectionProps {
  subjects: SubjectAnalytics[];
}

interface FlatSkill {
  subject: string;
  topic: string;
  pKnow: number;
  opportunities: number;
}

const MAX_PER_GROUP = 5;

const GROUPS: {
  key: "mastered" | "learning" | "not_started"; label: string; icon: LucideIcon;
  iconColor: string; bgClass: string; textClass: string;
}[] = [
  { key: "not_started", label: "Not Started", icon: Circle, iconColor: ICON_COLORS.slate400, bgClass: "bg-slate-100", textClass: "text-slate-500" },
  { key: "learning", label: "Learning", icon: TrendingUp, iconColor: ICON_COLORS.amber600, bgClass: "bg-amber-100", textClass: "text-amber-600" },
  { key: "mastered", label: "Mastered", icon: Sparkles, iconColor: ICON_COLORS.emerald600, bgClass: "bg-emerald-100", textClass: "text-emerald-600" },
];

function flattenSkills(subjects: SubjectAnalytics[], label: string): FlatSkill[] {
  const flat: FlatSkill[] = [];
  for (const s of subjects) {
    for (const t of s.topics ?? []) {
      if (t.bkt_mastery?.mastery_label !== label) continue;
      flat.push({ subject: s.subject, topic: t.topic, pKnow: t.bkt_mastery.p_know, opportunities: t.bkt_mastery.opportunities });
    }
  }
  return flat;
}

export default function SkillMasterySection({ subjects }: SkillMasterySectionProps) {
  const totalSkills = subjects.reduce((sum, s) => sum + (s.total_skill_count ?? 0), 0);
  const masteredSkills = subjects.reduce((sum, s) => sum + (s.mastered_skill_count ?? 0), 0);
  const hasSkills = totalSkills > 0;

  return (
    <View className="bg-white rounded-[18px] p-3.5 border border-slate-100 shadow-sm shadow-black/5 mb-3">
      <View className="flex-row items-center justify-between mb-1">
        <SectionHeader icon={Brain} label="Skill Mastery" />
        {hasSkills && (
          <Text className="text-primary-600 text-[11px] font-black">
            {masteredSkills} / {totalSkills} mastered
          </Text>
        )}
      </View>

      {hasSkills ? (
        <View className="gap-3.5 mt-2">
          {GROUPS.map((group) => {
            const items = flattenSkills(subjects, group.key)
              .sort((a, b) => b.opportunities - a.opportunities)
              .slice(0, MAX_PER_GROUP);
            if (items.length === 0) return null;
            const GroupIcon = group.icon;

            return (
              <View key={group.key}>
                <View className="flex-row items-center gap-1.5 mb-2">
                  <GroupIcon size={13} color={group.iconColor} strokeWidth={2} />
                  <Text className={`font-extrabold text-[11px] uppercase tracking-wider ${group.textClass}`}>
                    {group.label} ({items.length})
                  </Text>
                </View>
                <View className="gap-1.5">
                  {items.map((skill) => (
                    <View
                      key={`${skill.subject}-${skill.topic}`}
                      className={`flex-row items-center justify-between rounded-[10px] px-2.5 py-2 ${group.bgClass}`}
                    >
                      <View className="flex-1 mr-2">
                        <Text className="text-xs font-bold text-slate-800" numberOfLines={1}>
                          {skill.topic}
                        </Text>
                        <Text className="text-[10px] text-slate-500" numberOfLines={1}>
                          {skill.subject}
                        </Text>
                      </View>
                      <Text className={`text-[13px] font-black ${group.textClass}`}>
                        {Math.round(skill.pKnow * 100)}%
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <EmptyState
          icon={Brain}
          message="Skill mastery estimates will appear once you've attempted enough questions in a topic."
        />
      )}
    </View>
  );
}
