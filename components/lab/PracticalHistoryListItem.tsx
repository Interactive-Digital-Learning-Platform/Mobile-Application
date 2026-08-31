import { Text, View } from "react-native";
import { CalendarDays, ChevronRight, Clock3, FlaskConical, Leaf, RotateCcw, Zap, type LucideIcon } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import Card from "@/components/ui/Card";
import DifficultyBadge from "@/components/quiz-componets/DifficultyBadge";
import { PracticalHistoryListItemProps } from "@/types/lab";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const formatDuration = (seconds: number) => {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

const subjectIcon = (subject: string): LucideIcon => {
  if (subject === "Biology") return Leaf;
  if (subject === "Physics") return Zap;
  return FlaskConical;
};

const scoreStyle = (score: number) =>
  score >= 76
    ? { bg: "bg-emerald-50", text: "text-emerald-700", ring: "border-emerald-200" }
    : score >= 51
      ? { bg: "bg-amber-50", text: "text-amber-700", ring: "border-amber-200" }
      : { bg: "bg-rose-50", text: "text-rose-700", ring: "border-rose-200" };

export default function PracticalHistoryListItem({ item, onPress }: PracticalHistoryListItemProps) {
  const experiment = item.experimentId ?? {
    title: "Practical no longer available",
    subject: "",
    difficulty: "",
    thumbnailColor: ICON_COLORS.slate400,
  };
  const SubjectIcon = subjectIcon(experiment.subject);
  const score = scoreStyle(item.score);

  return (
    <Card
      onPress={onPress}
      haptic
      className="rounded-3xl border border-slate-100 bg-white shadow-sm shadow-black/10"
      style={{ borderLeftWidth: 4, borderLeftColor: experiment.thumbnailColor || ICON_COLORS.slate400 }}
    >
      <View className="flex-row items-start gap-3">
        <View
          className="h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${experiment.thumbnailColor || ICON_COLORS.slate400}18` }}
        >
          <SubjectIcon size={22} color={experiment.thumbnailColor || ICON_COLORS.slate500} strokeWidth={1.9} />
        </View>

        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-black leading-5 text-slate-900" numberOfLines={2}>
            {experiment.title}
          </Text>
          <View className="mt-1 flex-row flex-wrap items-center gap-2">
            {!!experiment.subject && <Text className="text-[11px] font-bold text-slate-500">{experiment.subject}</Text>}
            {!!experiment.difficulty && <DifficultyBadge difficulty={experiment.difficulty} size="xs" />}
          </View>
        </View>

        <View className={`h-[52px] w-[52px] items-center justify-center rounded-full border-2 ${score.bg} ${score.ring}`}>
          <Text className={`text-[14px] font-black ${score.text}`}>{Math.round(item.score)}%</Text>
        </View>
      </View>

      <View className="mt-3 flex-row items-center gap-3 border-t border-slate-100 pt-3">
        <View className="flex-row items-center gap-1">
          <CalendarDays size={13} color={ICON_COLORS.slate400} strokeWidth={2.1} />
          <Text className="text-[10px] font-semibold text-slate-400">{formatDate(item.createdAt)}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Clock3 size={13} color={ICON_COLORS.slate400} strokeWidth={2.1} />
          <Text className="text-[10px] font-semibold text-slate-400">{formatDuration(item.totalTime)}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <RotateCcw size={13} color={ICON_COLORS.slate400} strokeWidth={2.1} />
          <Text className="text-[10px] font-semibold text-slate-400">Attempt {item.attemptNumber}</Text>
        </View>
        {!!onPress && <ChevronRight size={17} color={ICON_COLORS.primary500} strokeWidth={2.6} style={{ marginLeft: "auto" }} />}
      </View>
    </Card>
  );
}
