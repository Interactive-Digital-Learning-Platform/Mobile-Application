import { View, Text } from "react-native";
import { ListTree, AlertTriangle, TrendingUp, CheckCircle2 } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { SubjectAnalytics } from "@/types/quizModuleTypes";
import { ICON_COLORS } from "@/constants/quizStyles";
import SectionHeader from "./SectionHeader";
import EmptyState from "./EmptyState";

interface TopicPerformanceSectionProps {
  subjects: SubjectAnalytics[];
}

interface FlatTopic {
  subject: string;
  topic: string;
  accuracy: number;
  status: string;
}

const MAX_PER_GROUP = 5;

const GROUPS: {
  key: string; label: string; icon: LucideIcon;
  iconColor: string; bgClass: string; textClass: string;
}[] = [
  { key: "weak", label: "Weak", icon: AlertTriangle, iconColor: ICON_COLORS.rose600, bgClass: "bg-rose-100", textClass: "text-rose-600" },
  { key: "developing", label: "Developing", icon: TrendingUp, iconColor: ICON_COLORS.amber600, bgClass: "bg-amber-100", textClass: "text-amber-600" },
  { key: "strong", label: "Strong", icon: CheckCircle2, iconColor: ICON_COLORS.emerald600, bgClass: "bg-emerald-100", textClass: "text-emerald-600" },
];

function flattenTopics(subjects: SubjectAnalytics[]): FlatTopic[] {
  const flat: FlatTopic[] = [];
  for (const s of subjects) {
    for (const t of s.topics ?? []) {
      if (!t.status || t.status === "insufficient_data") continue;
      flat.push({ subject: s.subject, topic: t.topic, accuracy: t.accuracy, status: t.status });
    }
  }
  return flat;
}

export default function TopicPerformanceSection({ subjects }: TopicPerformanceSectionProps) {
  const flatTopics = flattenTopics(subjects);
  const hasTopics = flatTopics.length > 0;

  return (
    <View className="bg-white rounded-[18px] p-3.5 border border-slate-100 shadow-sm shadow-black/5 mb-3">
      <SectionHeader icon={ListTree} label="Topic Performance" />

      {hasTopics ? (
        <View className="gap-3.5">
          {GROUPS.map((group) => {
            const items = flatTopics
              .filter((t) => t.status === group.key)
              .sort((a, b) => a.accuracy - b.accuracy)
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
                  {items.map((t) => (
                    <View
                      key={`${t.subject}-${t.topic}`}
                      className={`flex-row items-center justify-between rounded-[10px] px-2.5 py-2 ${group.bgClass}`}
                    >
                      <View className="flex-1 mr-2">
                        <Text className="text-xs font-bold text-slate-800" numberOfLines={1}>
                          {t.topic}
                        </Text>
                        <Text className="text-[10px] text-slate-500" numberOfLines={1}>
                          {t.subject}
                        </Text>
                      </View>
                      <Text className={`text-[13px] font-black ${group.textClass}`}>
                        {Math.round(t.accuracy)}%
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
          icon={ListTree}
          message="Topic breakdowns will appear once you've attempted enough questions in a topic."
        />
      )}
    </View>
  );
}
