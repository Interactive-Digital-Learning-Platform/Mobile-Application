import { Text, TouchableOpacity, View } from "react-native";

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
}

// Shared option-row presentational markup, extracted verbatim from Practice
// Mode's quiz-session.tsx so both Practice and 1v1 Battle render identical
// option buttons. Purely props-driven — selection/lock/answer logic stays
// owned by each screen, this component has no state of its own.
export default function QuizOptionButton({
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
        {optionText}
      </Text>
    </TouchableOpacity>
  );
}
