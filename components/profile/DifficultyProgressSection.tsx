import { View, Text } from "react-native";
import { Layers } from "lucide-react-native";
import type { SubjectAnalytics } from "@/types/quizModuleTypes";
import DifficultyBadge from "@/components/quiz-componets/DifficultyBadge";
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
    <View className="bg-white rounded-[18px] p-3.5 border border-slate-100 shadow-sm shadow-black/5 mb-3">
      <SectionHeader icon={Layers} label="Difficulty Progress" />

      {hasSubjects ? (
        <View className="gap-3.5">
          {subjects.map((s) => {
            const progress = isPresent(s.promotion_progress_percentage)
              ? Math.min(100, Math.max(0, s.promotion_progress_percentage))
              : undefined;
            const canShowProgress = progress !== undefined && !!s.next_difficulty;

            return (
              <View key={s.subject} className="gap-1.5">
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
