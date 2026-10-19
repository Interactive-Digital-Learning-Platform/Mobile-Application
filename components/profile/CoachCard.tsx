import { useState } from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/AppText";
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from "lucide-react-native";
import { useAnalyticsFeedbackQuery } from "@/hooks/use-quiz";
import { filterTestSubjects } from "@/constants/quizHelpers";
import type { Recommendation, SubjectAnalytics } from "@/types/quizModuleTypes";
import { ICON_COLORS } from "@/constants/quizStyles";
import { collectTopics } from "./PractiseNextSection";

const MAX_TIPS = 3;

// Merges the two "what to do next" sources into one list without repeats: the AI suggestions come first (written
// for the student), then rule-based recommendations only if they add something -- dropped when an AI tip already
// mentions their topic/subject, or when Practise next already lists that topic with its own Practise button.
function mergeTips(aiTips: string[], recommendations: Recommendation[], practiceTopics: Set<string>): string[] {
  const aiText = aiTips.join(" ").toLowerCase();
  const extra = filterTestSubjects(recommendations)
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .filter((rec) => {
      const key = rec.topic ?? rec.subject;
      if (!key) return true;
      if (rec.topic && practiceTopics.has(rec.topic.toLowerCase())) return false;
      return !aiText.includes(key.toLowerCase());
    })
    .map((rec) => rec.recommended_action);
  return [...aiTips, ...extra].slice(0, MAX_TIPS);
}

interface CoachCardProps {
  subjects: SubjectAnalytics[];
  recommendations?: Recommendation[];
}

export default function CoachCard({ subjects, recommendations = [] }: CoachCardProps) {
  const [open, setOpen] = useState(false);
  const { data: feedback, isLoading, isFetching, isError, refetch } = useAnalyticsFeedbackQuery(true);

  const practiceTopics = new Set(collectTopics(subjects).weak.map((t) => t.topic.toLowerCase()));
  // If the AI feedback failed or is still loading, the card still has the rule-based tips to show.
  const tips = mergeTips(feedback?.suggestions ?? [], recommendations, practiceTopics);
  const note = feedback?.motivational_note
    ?? (isError ? "Keep going — every quiz you finish makes your next one easier." : null);

  return (
    <View className="bg-white rounded-[24px] p-4 shadow-sm shadow-black/5 mb-3">
      <View className="flex-row items-center justify-between mb-2.5">
        <View className="flex-row items-center gap-1.5">
          <View className="w-7 h-7 rounded-full bg-primary-100 items-center justify-center">
            <Sparkles size={14} color={ICON_COLORS.primary600} strokeWidth={2} />
          </View>
          <Text className="text-slate-800 font-black text-[15px]">Your coach</Text>
        </View>
        <TouchableOpacity
          onPress={() => refetch()}
          disabled={isFetching}
          className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Get new advice"
          hitSlop={6}
        >
          {isFetching ? (
            <ActivityIndicator size="small" color={ICON_COLORS.primary500} />
          ) : (
            <RefreshCw size={14} color={ICON_COLORS.slate500} strokeWidth={2.25} />
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="gap-2 py-1">
          <View className="h-3.5 rounded-full bg-slate-100 w-full" />
          <View className="h-3.5 rounded-full bg-slate-100 w-3/4" />
        </View>
      ) : note ? (
        <Text className="text-slate-700 text-[14px] leading-[20px]">{note}</Text>
      ) : null}

      {tips.length > 0 && (
        <>
          <TouchableOpacity
            onPress={() => setOpen((v) => !v)}
            className="flex-row items-center gap-1 mt-3 self-start"
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            hitSlop={6}
          >
            <Text className="text-primary-600 text-[12px] font-bold">
              {open ? "Hide tips" : `See ${tips.length} ${tips.length === 1 ? "tip" : "tips"}`}
            </Text>
            {open ? (
              <ChevronUp size={14} color={ICON_COLORS.primary600} strokeWidth={2.5} />
            ) : (
              <ChevronDown size={14} color={ICON_COLORS.primary600} strokeWidth={2.5} />
            )}
          </TouchableOpacity>

          {open && (
            <View className="gap-2 mt-2.5">
              {tips.map((tip, i) => (
                <View key={i} className="flex-row gap-2.5 bg-slate-50 rounded-xl px-3 py-2.5">
                  <Text className="text-primary-600 font-black text-[12px] mt-px">{i + 1}</Text>
                  <Text className="text-slate-600 text-[13px] leading-[19px] flex-1">{tip}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}
