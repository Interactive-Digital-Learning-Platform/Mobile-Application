import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Crosshair, Play, Star } from "lucide-react-native";
import { useQuizSessionsQuery } from "@/hooks/use-quiz";
import type { SubjectAnalytics, QuizSessionSummary } from "@/types/quizModuleTypes";
import { ICON_COLORS } from "@/constants/quizStyles";
import SectionHeader from "./SectionHeader";

const MAX_ITEMS = 3;
const PRACTICE_QUESTIONS = 5;
const PRACTICE_MINUTES = 5;
const DEFAULT_GRADE = 10;
// BKT flags any thinly-evidenced topic as "not_started" -- one wrong answer is enough -- so it only counts as a
// weakness once there's this much evidence (the analytics "weak" status applies its own minimum already).
const MIN_ATTEMPTS_FOR_BKT_WEAK = 3;

interface TopicItem {
  subject: string;
  topic: string;
  accuracy: number;
  attempts: number;
}

// "Needs practice" merges the two signals the old Topic Performance and Skill Mastery sections each showed on their
// own: the analytics status ("weak") and the BKT estimate ("not_started" = still below the learning threshold).
// They live on the same topic record, so one pass de-duplicates them.
export function collectTopics(subjects: SubjectAnalytics[]) {
  const weak: TopicItem[] = [];
  const strong: TopicItem[] = [];
  for (const s of subjects) {
    for (const t of s.topics ?? []) {
      const item = { subject: s.subject, topic: t.topic, accuracy: t.accuracy, attempts: t.total_attempted };
      const bktWeak = t.bkt_mastery?.mastery_label === "not_started" && t.total_attempted >= MIN_ATTEMPTS_FOR_BKT_WEAK;
      if (t.status === "weak" || bktWeak) weak.push(item);
      else if (t.status === "strong") strong.push(item);
    }
  }
  weak.sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts);
  strong.sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts);
  return { weak: weak.slice(0, MAX_ITEMS), strong: strong.slice(0, MAX_ITEMS) };
}

// Same launch params the Quizzes tab's "+" flow uses (see PracticeList.handleGenerate): the grade comes from the
// student's latest quiz in that subject, and questions already seen in that subject+grade are excluded so the
// backend serves fresh ones.
function startPractice(item: TopicItem, sessions: QuizSessionSummary[]) {
  const inSubject = sessions
    .filter((s) => s.subject.toLowerCase() === item.subject.toLowerCase() && s.grade !== null)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const grade = inSubject[0]?.grade ?? DEFAULT_GRADE;
  const excluded = [...new Set(inSubject.filter((s) => s.grade === grade).flatMap((s) => s.question_ids ?? []))];

  router.push({
    pathname: "/(main)/quiz/quiz-session",
    params: {
      subject: item.subject,
      lesson: item.topic,
      questionCount: String(PRACTICE_QUESTIONS),
      timer: String(PRACTICE_MINUTES),
      grade: String(grade),
      ...(excluded.length > 0 ? { excludedQuestionIds: JSON.stringify(excluded) } : {}),
    },
  } as any);
}

export default function PractiseNextSection({ subjects }: { subjects: SubjectAnalytics[] }) {
  const { data: sessions } = useQuizSessionsQuery();
  const { weak, strong } = collectTopics(subjects);
  if (weak.length === 0 && strong.length === 0) return null;

  return (
    <View className="bg-white rounded-[24px] p-4 shadow-sm shadow-black/5 mb-3">
      <SectionHeader icon={Crosshair} label="Practise next" />

      {weak.length > 0 ? (
        <View className="gap-2.5">
          {weak.map((item) => (
            <View key={`${item.subject}-${item.topic}`} className="flex-row items-center bg-primary-50 rounded-2xl px-3.5 py-3">
              <View className="flex-1 mr-3">
                <Text className="text-slate-800 text-[13px] font-bold" numberOfLines={1}>{item.topic}</Text>
                <Text className="text-slate-500 text-[11px] mt-0.5" numberOfLines={1}>
                  {item.subject} · {Math.round(item.accuracy)}% correct so far
                </Text>
              </View>
              <TouchableOpacity
                className="flex-row items-center gap-1 bg-primary px-3 py-2 rounded-full"
                activeOpacity={0.85}
                onPress={() => startPractice(item, sessions ?? [])}
                accessibilityRole="button"
                accessibilityLabel={`Start a ${PRACTICE_QUESTIONS} question quiz on ${item.topic}`}
              >
                <Play size={12} color={ICON_COLORS.white} fill={ICON_COLORS.white} />
                <Text className="text-white text-[12px] font-bold">Practise</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <Text className="text-slate-500 text-[12px]">Nothing urgent — every topic you&apos;ve tried is on track.</Text>
      )}

      {strong.length > 0 && (
        <View className="mt-4">
          <View className="flex-row items-center gap-1.5 mb-2">
            <Star size={13} color={ICON_COLORS.emerald600} strokeWidth={2.25} />
            <Text className="text-slate-500 text-xs font-semibold">Your strengths</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {strong.map((item) => (
              <View key={`${item.subject}-${item.topic}`} className="bg-emerald-50 rounded-full px-3 py-1.5">
                <Text className="text-emerald-700 text-[12px] font-semibold" numberOfLines={1}>
                  {item.topic} · {Math.round(item.accuracy)}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
