import { View, Text } from "react-native";
import { Layers } from "lucide-react-native";
import type { SubjectAnalytics } from "@/types/quizModuleTypes";
import DifficultyBadge from "@/components/quiz-componets/DifficultyBadge";
import { C, profileStyles as styles } from "./profileTheme";
import SectionHeader from "./SectionHeader";
import EmptyState from "./EmptyState";

interface DifficultyProgressSectionProps {
  subjects: SubjectAnalytics[];
}

function isPresent(value: number | undefined | null): value is number {
  return value !== undefined && value !== null;
}

export default function DifficultyProgressSection({ subjects }: DifficultyProgressSectionProps) {
  const hasSubjects = subjects.length > 0;

  return (
    <View style={[styles.card, { marginBottom: 12 }]}>
      <SectionHeader icon={Layers} label="Difficulty Progress" />

      {hasSubjects ? (
        <View style={{ gap: 14 }}>
          {subjects.map((s) => {
            const progress = isPresent(s.promotion_progress_percentage)
              ? Math.min(100, Math.max(0, s.promotion_progress_percentage))
              : undefined;
            const canShowProgress = progress !== undefined && !!s.next_difficulty;

            return (
              <View key={s.subject} style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: "#1e293b", flex: 1, marginRight: 8 }} numberOfLines={1}>
                    {s.subject}
                  </Text>
                  <DifficultyBadge difficulty={s.current_difficulty} size="xs" />
                </View>

                {canShowProgress ? (
                  <View>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: "#F1F5F9", overflow: "hidden" }}>
                      <View style={{ height: "100%", width: `${progress}%`, backgroundColor: C.p500, borderRadius: 3 }} />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                      <Text style={{ fontSize: 10, color: "#94a3b8" }}>{Math.round(progress)}% to next level</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Text style={{ fontSize: 10, color: "#94a3b8" }}>Next:</Text>
                        <DifficultyBadge difficulty={s.next_difficulty!} size="xs" />
                      </View>
                    </View>
                  </View>
                ) : (
                  <Text style={{ fontSize: 10, color: "#94a3b8" }}>
                    {s.difficulty_status_message ?? "Keep practicing to progress to the next difficulty."}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <EmptyState icon={Layers} message="Difficulty progress will appear once you start practicing subjects." />
      )}
    </View>
  );
}
