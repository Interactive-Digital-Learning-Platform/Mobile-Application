import { View, Text } from "react-native";
import { ListTree, AlertTriangle, TrendingUp, CheckCircle2 } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { SubjectAnalytics } from "@/types/quizModuleTypes";
import { profileStyles as styles } from "./profileTheme";
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

const GROUPS: { key: string; label: string; icon: LucideIcon; color: string; bg: string }[] = [
  { key: "weak", label: "Weak", icon: AlertTriangle, color: "#DC2626", bg: "#FFE4E6" },
  { key: "developing", label: "Developing", icon: TrendingUp, color: "#D97706", bg: "#FEF3C7" },
  { key: "strong", label: "Strong", icon: CheckCircle2, color: "#16A34A", bg: "#DCFCE7" },
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
    <View style={[styles.card, { marginBottom: 12 }]}>
      <SectionHeader icon={ListTree} label="Topic Performance" />

      {hasTopics ? (
        <View style={{ gap: 14 }}>
          {GROUPS.map((group) => {
            const items = flatTopics
              .filter((t) => t.status === group.key)
              .sort((a, b) => a.accuracy - b.accuracy)
              .slice(0, MAX_PER_GROUP);
            if (items.length === 0) return null;
            const GroupIcon = group.icon;

            return (
              <View key={group.key}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <GroupIcon size={13} color={group.color} strokeWidth={2} />
                  <Text style={{ color: group.color, fontWeight: "800", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {group.label} ({items.length})
                  </Text>
                </View>
                <View style={{ gap: 6 }}>
                  {items.map((t) => (
                    <View
                      key={`${t.subject}-${t.topic}`}
                      style={{
                        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                        backgroundColor: group.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#1e293b" }} numberOfLines={1}>
                          {t.topic}
                        </Text>
                        <Text style={{ fontSize: 10, color: "#64748b" }} numberOfLines={1}>
                          {t.subject}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: "900", color: group.color }}>
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
