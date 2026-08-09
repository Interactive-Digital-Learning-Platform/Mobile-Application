import { View, Text } from "react-native";
import { CheckCircle2, XCircle } from "lucide-react-native";
import { OPTION_LABELS } from "@/constants/quizHelpers";

interface QuestionLike {
  question: string;
  options: string[] | null;
  correct_answer?: string | null;
}

interface AnswerReviewCardProps {
  question: QuestionLike;
  index: number;
  userAnswer: number | undefined;
}

export default function AnswerReviewCard({
  question,
  index,
  userAnswer,
}: AnswerReviewCardProps) {
  const correctAnswer  = question.correct_answer ?? null;
  const hasCorrect     = correctAnswer !== null;
  const userAnswerText = userAnswer !== undefined && question.options
    ? question.options[userAnswer] ?? null
    : null;
  const isCorrect  = hasCorrect && userAnswerText === correctAnswer;
  const isSkipped  = userAnswer === undefined;

  const headerBg = isSkipped
    ? "bg-slate-50"
    : hasCorrect
      ? (isCorrect ? "bg-emerald-50" : "bg-rose-50")
      : "bg-blue-50";

  const statusLabel = isSkipped
    ? "Skipped"
    : hasCorrect
      ? (isCorrect ? "Correct" : "Incorrect")
      : "Answered";

  const StatusIcon = isSkipped || !hasCorrect
    ? null
    : isCorrect ? CheckCircle2 : XCircle;
  const iconColor = isCorrect ? "#10B981" : "#EF4444";

  return (
    <View className="rounded-2xl bg-slate-100 overflow-hidden mb-3">
      <View className={`${headerBg} flex-row items-center justify-between px-4 py-3`}>
        <Text className="text-slate-500 text-xs font-bold">Q{index + 1}</Text>
        <View className="flex-row items-center gap-1.5">
          {StatusIcon && (
            <StatusIcon size={14} color={iconColor} strokeWidth={2.2} />
          )}
          <Text
            className={`text-xs font-black ${
              isSkipped
                ? "text-slate-400"
                : hasCorrect
                  ? (isCorrect ? "text-emerald-600" : "text-rose-600")
                  : "text-blue-600"
            }`}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      <View className="px-4 pt-3 pb-2">
        <Text className="text-slate-800 text-sm font-bold leading-5">
          {question.question}
        </Text>
      </View>

      <View className="px-4 pb-4 gap-1.5">
        {(question.options ?? []).map((opt, i) => {
          const isCorrectOpt = hasCorrect && opt === correctAnswer;
          const isUserOpt    = i === userAnswer;
          const isWrongPick  = isUserOpt && hasCorrect && !isCorrect;

          let optBg     = "bg-slate-50";
          let optBorder = "border-slate-100";
          let labelBg   = "bg-slate-100";
          let labelText = "text-slate-500";
          let textColor = "text-slate-600";

          if (isCorrectOpt) {
            optBg     = "bg-emerald-50";
            optBorder = "border-emerald-200";
            labelBg   = "bg-emerald-500";
            labelText = "text-white";
            textColor = "text-emerald-700";
          } else if (isWrongPick) {
            optBg     = "bg-rose-50";
            optBorder = "border-rose-200";
            labelBg   = "bg-rose-500";
            labelText = "text-white";
            textColor = "text-rose-700";
          } else if (isUserOpt && !hasCorrect) {
            optBg     = "bg-blue-50";
            optBorder = "border-blue-200";
            labelBg   = "bg-blue-500";
            labelText = "text-white";
            textColor = "text-blue-700";
          }

          return (
            <View
              key={i}
              className={`flex-row items-center gap-2.5 px-3 py-2.5 rounded-xl border ${optBg} ${optBorder}`}
            >
              <View className={`w-7 h-7 rounded-full justify-center items-center ${labelBg}`}>
                <Text className={`text-xs font-black ${labelText}`}>
                  {OPTION_LABELS[i]}
                </Text>
              </View>
              <Text className={`flex-1 text-xs font-medium leading-4 ${textColor}`}>
                {opt}
              </Text>
              {isCorrectOpt && (
                <CheckCircle2 size={14} color="#10B981" strokeWidth={2.5} />
              )}
              {isWrongPick && (
                <XCircle size={14} color="#EF4444" strokeWidth={2.5} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
