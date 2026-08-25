import { Text, TouchableOpacity, View } from "react-native";

interface QuizOptionButtonProps {
  label: string;
  optionText: string;
  isSelected: boolean;
  disabled?: boolean;
  onPress: () => void;
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
}: QuizOptionButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onPress}
      className={`flex-row items-center gap-3 p-4 rounded-2xl border ${
        isSelected ? "bg-primary border-primary" : "bg-white border-slate-200"
      } ${disabled && !isSelected ? "opacity-50" : ""}`}
    >
      <View
        className={`w-8 h-8 rounded-full justify-center items-center ${
          isSelected ? "bg-white/25" : "bg-slate-100"
        }`}
      >
        <Text className={`text-md font-black ${isSelected ? "text-white" : "text-slate-600"}`}>{label}</Text>
      </View>
      <Text className={`flex-1 text-sm font-medium leading-5 ${isSelected ? "text-white" : "text-slate-700"}`}>
        {optionText}
      </Text>
    </TouchableOpacity>
  );
}
