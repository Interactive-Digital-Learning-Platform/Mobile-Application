/**
 * RecommendationsSection.tsx
 * ─────────────────────────────────────────────────────────
 * Section 5 — top three recommendation cards (subject, topic, reason,
 * action). Reads UserAnalyticsResponse.recommendations (optional). Sorted
 * by priority ascending (1 = highest priority) and capped at three, per the
 * spec. Test-marked subjects ([CC-TEST] / [RANDOM-LESSON-TEST]) are excluded
 * unless the dev flag is on, same as everywhere else recommendations
 * reference a subject.
 */
import { View, Text } from "react-native";
import { Lightbulb, ArrowRight } from "lucide-react-native";
import type { Recommendation } from "@/types/quizModuleTypes";
import { filterTestSubjects } from "@/constants/quizHelpers";
import { C, profileStyles as styles } from "./profileTheme";
import SectionHeader from "./SectionHeader";
import EmptyState from "./EmptyState";

interface RecommendationsSectionProps {
  recommendations?: Recommendation[];
}

const MAX_RECOMMENDATIONS = 3;

export default function RecommendationsSection({ recommendations }: RecommendationsSectionProps) {
  const visible = filterTestSubjects(recommendations ?? [])
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .slice(0, MAX_RECOMMENDATIONS);

  return (
    <View style={[styles.card, { marginBottom: 12 }]}>
      <SectionHeader icon={Lightbulb} label="Recommendations" />

      {visible.length > 0 ? (
        <View style={{ gap: 10 }}>
          {visible.map((rec, index) => (
            <View
              key={`${rec.subject ?? "general"}-${rec.topic ?? "general"}-${index}`}
              style={{ backgroundColor: C.p50, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.p100 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.p500, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "white", fontSize: 11, fontWeight: "900" }}>{index + 1}</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: "800", color: "#1e293b" }} numberOfLines={1}>
                  {[rec.subject, rec.topic].filter(Boolean).join(" · ") || "General"}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: "#475569", lineHeight: 17, marginBottom: 8 }}>
                {rec.reason}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <ArrowRight size={13} color={C.p600} strokeWidth={2.5} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: C.p600, flexShrink: 1 }}>
                  {rec.recommended_action}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState icon={Lightbulb} message="Personalized recommendations will appear here as you take more quizzes." />
      )}
    </View>
  );
}
