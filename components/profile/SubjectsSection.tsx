import { View, Text } from "react-native";
import { BookOpen } from "lucide-react-native";
import DifficultyBadge from "@/components/quiz-componets/DifficultyBadge";
import type { SubjectAnalytics } from "@/types/quizModuleTypes";
import { capitalize } from "@/constants/quizHelpers";
import { ICON_COLORS } from "@/constants/quizStyles";
import SectionHeader from "./SectionHeader";

// One row per subject: current level and a single bar filling up towards the next level. Deliberately just the bar --
// the Skill / Practice breakdown and the "what to do next" advice live on the Detailed analytics screen.
function levelProgress(s: SubjectAnalytics): { pct: number; caption: string } {
  const atTop = !s.next_difficulty || s.next_difficulty.toLowerCase() === s.current_difficulty.toLowerCase();
  if (atTop) return { pct: 100, caption: "Top level" };
  const pct = Math.min(100, Math.max(0, s.promotion_progress_percentage ?? 0));
  return { pct, caption: `to ${capitalize(s.next_difficulty!)}` };
}

export default function SubjectsSection({ subjects }: { subjects: SubjectAnalytics[] }) {
  if (subjects.length === 0) return null;
  const rows = subjects
    .map((s) => ({ s, ...levelProgress(s) }))
    .sort((a, b) => b.pct - a.pct);

  return (
    <View className="bg-white rounded-[24px] p-4 shadow-sm shadow-black/5 mb-3">
      <SectionHeader icon={BookOpen} label="Subjects" />
      <View className="gap-4">
        {rows.map(({ s, pct, caption }) => (
          <View key={s.subject} accessible accessibilityLabel={`${s.subject}, ${s.current_difficulty} level, ${Math.round(pct)} percent ${caption}`}>
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-slate-800 text-[13px] font-bold flex-1 mr-2" numberOfLines={1}>{s.subject}</Text>
              <DifficultyBadge difficulty={s.current_difficulty} size="xs" />
            </View>
            <View className="flex-row items-center gap-2.5">
              <View className="flex-1 h-2.5 bg-primary-50 rounded-full overflow-hidden">
                <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: ICON_COLORS.primary600 }} />
              </View>
              <Text className="w-10 text-right text-slate-800 text-[12px] font-black">{Math.round(pct)}%</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
