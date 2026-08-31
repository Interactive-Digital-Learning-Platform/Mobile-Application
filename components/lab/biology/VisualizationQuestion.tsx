import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Check, X } from "lucide-react-native";
import { VisualizationQuestionProps } from "@/types/lab";
import Button from "@/components/ui/Button";

// Local-state-only knowledge check (spec section 11) — reinforces the stage the student just
// watched rather than grading them; no backend persistence in phase 1 (see plan's phase-1
// non-goals).
export default function VisualizationQuestion({ question, onReplayStage, onDone }: VisualizationQuestionProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const isCorrect = selected !== null && selected === question.correctIndex;

  return (
    <View className="gap-3">
      <Text className="font-bold text-slate-800 text-base">{question.question}</Text>
      <View className="gap-2">
        {question.options.map((option, index) => {
          const isSelected = selected === index;
          const showCorrect = selected !== null && index === question.correctIndex;
          return (
            <Pressable
              key={option}
              onPress={() => setSelected(index)}
              disabled={selected !== null}
              className={`flex-row items-center justify-between rounded-xl border px-4 py-3 ${
                showCorrect ? "border-emerald-500 bg-emerald-50" : isSelected ? "border-rose-300 bg-rose-50" : "border-slate-200"
              }`}
            >
              <Text className="text-slate-700">{option}</Text>
              {isSelected && (isCorrect ? <Check size={18} color="#059669" /> : <X size={18} color="#DC2626" />)}
            </Pressable>
          );
        })}
      </View>
      {selected !== null && !isCorrect && question.replayStageId != null && (
        <Button label="Watch that part again" variant="ghost" onPress={() => onReplayStage(question.replayStageId as number)} />
      )}
      {selected !== null && <Button label={isCorrect ? "Great — continue" : "Continue anyway"} onPress={onDone} />}
    </View>
  );
}
