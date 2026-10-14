import { Text, TouchableOpacity, View } from "react-native";
import { CheckCircle2, XCircle } from "lucide-react-native";
import { formatMathText } from "@/constants/quizHelpers";
import { ICON_COLORS } from "@/constants/quizStyles";

interface QuizOptionButtonProps {
  label: string;
  optionText: string;
  isSelected: boolean;
  disabled?: boolean;
  onPress: () => void;
  // Reveal-time highlight, both optional and both undefined outside a
  // reveal -- Practice Mode (which never passes these) is unaffected.
  // isCorrect always wins over isWrongSelected if a caller somehow passes
  // both true for the same option (shouldn't happen: an option can't be
  // both the right answer and a wrong pick at once).
  isCorrect?: boolean;
  isWrongSelected?: boolean;
  // "filled" (default): solid colour rows, used by 1v1 Battle. "card": light outlined rows with a status icon on the
  // right, used inside Practice Mode's white question card.
  variant?: "filled" | "card";
}

// Shared option-row presentational markup, extracted verbatim from Practice
// Mode's quiz-session.tsx so both Practice and 1v1 Battle render identical
// option buttons. Purely props-driven — selection/lock/answer logic stays
// owned by each screen, this component has no state of its own.
export default function QuizOptionButton(props: QuizOptionButtonProps) {
  return props.variant === "card" ? <CardOption {...props} /> : <FilledOption {...props} />;
}

function FilledOption({
  label,
  optionText,
  isSelected,
  disabled,
  onPress,
  isCorrect,
  isWrongSelected,
}: QuizOptionButtonProps) {
  const reveal = isCorrect || isWrongSelected;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onPress}
      className={`flex-row items-center gap-3 p-4 rounded-2xl border ${
        isCorrect
          ? "bg-emerald-500 border-emerald-500"
          : isWrongSelected
            ? "bg-rose-500 border-rose-500"
            : isSelected
              ? "bg-primary border-primary"
              : "bg-white border-slate-200"
      } ${disabled && !isSelected && !reveal ? "opacity-50" : ""}`}
    >
      <View
        className={`w-8 h-8 rounded-full justify-center items-center ${
          isSelected || reveal ? "bg-white/25" : "bg-slate-100"
        }`}
      >
        <Text className={`text-md font-black ${isSelected || reveal ? "text-white" : "text-slate-600"}`}>
          {label}
        </Text>
      </View>
      <Text
        className={`flex-1 text-sm font-medium leading-5 ${isSelected || reveal ? "text-white" : "text-slate-700"}`}
      >
        {formatMathText(optionText)}
      </Text>
    </TouchableOpacity>
  );
}

function CardOption({
  label,
  optionText,
  isSelected,
  disabled,
  onPress,
  isCorrect,
  isWrongSelected,
}: QuizOptionButtonProps) {
  const reveal = isCorrect || isWrongSelected;
  const tone = isCorrect
    ? { row: "bg-emerald-50 border-emerald-400", badge: "bg-emerald-500", badgeText: "text-white" }
    : isWrongSelected
      ? { row: "bg-rose-50 border-rose-400", badge: "bg-rose-500", badgeText: "text-white" }
      : isSelected
        ? { row: "bg-primary-50 border-primary", badge: "bg-primary", badgeText: "text-white" }
        : { row: "bg-white border-slate-200", badge: "bg-slate-100", badgeText: "text-slate-500" };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled }}
      className={`flex-row items-center gap-3 px-4 py-4 rounded-2xl border-[1.5px] ${tone.row} ${
        disabled && !isSelected && !reveal ? "opacity-50" : ""
      }`}
    >
      <View className={`w-7 h-7 rounded-lg justify-center items-center ${tone.badge}`}>
        <Text className={`text-[13px] font-black ${tone.badgeText}`}>{label}</Text>
      </View>
      <Text className="flex-1 text-[15px] font-bold leading-5 text-slate-700">{formatMathText(optionText)}</Text>
      {isCorrect ? (
        <CheckCircle2 size={22} color={ICON_COLORS.white} fill={ICON_COLORS.emerald500} strokeWidth={2.5} />
      ) : isWrongSelected ? (
        <XCircle size={22} color={ICON_COLORS.white} fill={ICON_COLORS.rose500} strokeWidth={2.5} />
      ) : isSelected ? (
        <CheckCircle2 size={22} color={ICON_COLORS.white} fill={ICON_COLORS.primary500} strokeWidth={2.5} />
      ) : (
        <View className="w-[22px] h-[22px] rounded-full border-2 border-slate-200" />
      )}
    </TouchableOpacity>
  );
}
