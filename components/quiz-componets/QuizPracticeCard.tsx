import { Text, TouchableOpacity, View, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import { Trash2, type LucideIcon } from "lucide-react-native";
import { ICON_COLORS, getSubjectIcon, formatSubjectLabel, type Difficulty } from "@/constants/quizStyles";
import QuizDetailSheet from "@/components/quiz-componets/QuizDetailSheet";
import DifficultyBadge from "@/components/quiz-componets/DifficultyBadge";
import { useDeleteQuizSessionMutation } from "@/hooks/use-quiz";

export type { Difficulty };

export interface PracticeItem {
  id: string;
  session_id: number;
  subject: string;
  difficulty: Difficulty;
  questions: number;
  timer: string;
  progress: number;
  answered_count: number;
  accuracy: number | null;
  correct_count: number | null;
  created_at: string;
}

function formatCreatedAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === 1) return `Yesterday · ${time}`;
  const day = d.getDate();
  const mon = d.toLocaleString("default", { month: "short" });
  return `${day} ${mon} · ${time}`;
}

export default function QuizPracticeCard({ item, disabled = false }: { item: PracticeItem; disabled?: boolean }) {

  const [sheetVisible, setSheetVisible] = useState(false);
  const Icon: LucideIcon = getSubjectIcon(item.subject);
  const isComplete   = item.progress === 100;
  const hasStarted   = item.progress > 0;
  const correctCount = item.correct_count ?? 0;

  const displayCount = isComplete ? correctCount : item.answered_count;
  const displayPct = item.questions > 0
    ? Math.round((displayCount / item.questions) * 100)
    : 0;
  const barColor = !hasStarted
    ? "bg-slate-200"
    : !isComplete
    ? "bg-primary"
    : displayPct >= 70 ? "bg-emerald-500"
    : displayPct >= 50 ? "bg-amber-500"
    : "bg-rose-500";
  const textColor = !hasStarted
    ? "text-slate-500"
    : !isComplete
    ? "text-primary"
    : displayPct >= 70 ? "text-emerald-500"
    : displayPct >= 50 ? "text-amber-500"
    : "text-rose-500";

  const { mutate: deleteSession, isPending: isDeleting } = useDeleteQuizSessionMutation();

  const handleDelete = () => {
    Alert.alert(
      "Delete Quiz",
      "Remove this quiz? Your analytics data will be kept.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteSession(item.session_id),
        },
      ]
    );
  };

  return (
    <>
      <View className="bg-white mx-4 mb-3 rounded-2xl p-4 shadow-sm shadow-black/10 border border-slate-100">

        <View className="flex-row items-start gap-3">
          <View className="w-11 h-11 rounded-xl bg-slate-50 justify-center items-center mt-0.5">
            <Icon size={20} color={ICON_COLORS.slate500} strokeWidth={1.8} />
          </View>

          <View className="flex-1">
            <Text className="text-sm font-bold text-slate-800">{formatSubjectLabel(item.subject)}</Text>
            <View className="flex-row items-center gap-2 mt-1">
              <DifficultyBadge difficulty={item.difficulty} />
              <Text className="text-[11px] text-slate-400">{item.questions} questions</Text>
              <Text className="text-[11px] text-slate-400">{item.timer}</Text>
            </View>
            
          </View>
          <Text className="text-[10px] text-slate-500 mt-0.5">{formatCreatedAt(item.created_at)}</Text>

          <TouchableOpacity
            className="w-8 h-8 rounded-xl bg-rose-50 justify-center items-center"
            activeOpacity={0.7}
            disabled={isDeleting}
            onPress={handleDelete}
          >
            {isDeleting
              ? <ActivityIndicator size="small" color={ICON_COLORS.rose500} />
              : <Trash2 size={15} color={ICON_COLORS.rose500} strokeWidth={2} />}
          </TouchableOpacity>
        </View>

        <View className="mt-3">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-[10px] text-slate-400 font-medium">
              {!hasStarted
                ? "Not started"
                : isComplete
                ? `${displayCount}/${item.questions} correct`
                : `${displayCount}/${item.questions} answered`}
            </Text>
            <Text className={`text-[10px] font-bold ${textColor}`}>
              {displayPct}%
            </Text>
          </View>
          <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <View
              className={`h-full rounded-full ${barColor}`}
              style={{ width: `${displayPct}%` }}
            />
          </View>
        </View>

        <TouchableOpacity
          className={`mt-3 py-2.5 rounded-xl items-center ${
            isComplete ? "bg-emerald-600" : hasStarted ? "bg-slate-700" : "bg-primary"
          } ${disabled || isDeleting ? "opacity-40" : ""}`}
          activeOpacity={0.8}
          disabled={disabled || isDeleting}
          onPress={() => setSheetVisible(true)}
        >
          <Text className="text-white text-sm font-bold">
            {isComplete ? "Retake Quiz" : hasStarted ? "Continue Quiz" : "Start Quiz"}
          </Text>
        </TouchableOpacity>

      </View>

      <QuizDetailSheet
        item={item}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onAction={() => console.log(hasStarted ? "Continue quiz:" : "Start quiz:", item.subject)}
      />
    </>
  );
}
