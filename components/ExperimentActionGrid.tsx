import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";

interface ExperimentActionGridProps {
  expectedAction: string;
  onAction: (action: string) => void;
  subject: string;
  subjectColor: string;
}

const GENERIC_DISTRACTORS = ["Stir", "Observe", "Clean", "Wait", "Record", "Discard"];

const SUBJECT_DISTRACTORS: Record<string, string[]> = {
  Physics: ["Measure", "Adjust", "Connect", "Switch On", "Zero"],
  Chemistry: ["Add Dropwise", "Heat", "Filter", "Mix", "Titrate"],
  Biology: ["Stain", "Mount", "Cut", "Rinse", "Incubate"],
};

export default function ExperimentActionGrid({
  expectedAction,
  onAction,
  subject,
  subjectColor,
}: ExperimentActionGridProps) {
  const actions = useMemo(() => {
    const distractors = SUBJECT_DISTRACTORS[subject] || GENERIC_DISTRACTORS;
    
    // Convert snake_case expectedAction to Title Case for display
    const displayExpected = expectedAction
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Combine expected action with a few random distractors
    const pool = [displayExpected, ...distractors]
      .filter((v, i, a) => a.indexOf(v) === i) // unique
      .sort(() => Math.random() - 0.5) // shuffle
      .slice(0, 6); // limit to 6 options

    return pool;
  }, [expectedAction, subject]);

  return (
    <View className="w-full">
      <Text className="text-xs font-asemibold text-[#979797] mb-3 uppercase tracking-wider">
        Perform Action
      </Text>
      <View className="flex-row flex-wrap gap-3">
        {actions.map((action) => (
          <Pressable
            key={action}
            onPress={() => onAction(action)}
            className="flex-1 min-w-[45%] bg-white border border-[#E3E1E1] rounded-2xl p-4 items-center justify-center shadow-sm active:bg-gray-50"
          >
            <Text className="text-sm font-asemibold text-[#0F172A] text-center">
              {action}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
