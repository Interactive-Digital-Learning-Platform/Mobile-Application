import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { DATE_PRESETS, GRADES, HISTORY_FILTER_SUBJECTS, SCORE_BANDS, STATUSES } from "@/constants/lab/history.constants";
import { usePressScale } from "@/hooks/lab/use-press-scale";
import { PracticalHistoryFilterBarProps } from "@/types/lab";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Same chip visual language as the quiz tab's FilterChip (components/quiz-componets/PracticeList)
// so the two tabs' filter rows read identically once integrated.
const FilterChip = ({ label, isSelected, onPress }: { label: string; isSelected: boolean; onPress: () => void }) => {
  const { style, onPressIn, onPressOut } = usePressScale();
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className={`px-3 py-2 rounded-xl border ${isSelected ? "border-primary bg-primary/10" : "border-slate-200 bg-white"}`}
      style={style}
    >
      <Text className={`text-xs font-semibold ${isSelected ? "text-primary" : "text-slate-600"}`}>{label}</Text>
    </AnimatedPressable>
  );
};

const FilterGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View className="mb-3">
    <Text className="text-xs font-medium text-slate-400 mb-1.5">{label}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {children}
    </ScrollView>
  </View>
);

export default function PracticalHistoryFilterBar({ filters, onChange }: PracticalHistoryFilterBarProps) {
  const [activeDatePreset, setActiveDatePreset] = useState("All time");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const activeScoreBand =
    SCORE_BANDS.find((b) => b.scoreMin === filters.scoreMin && b.scoreMax === filters.scoreMax)?.label ?? "All";

  return (
    <View className="px-4 pt-2 pb-1 bg-white">
      <FilterGroup label="Subject">
        {HISTORY_FILTER_SUBJECTS.map((subject) => (
          <FilterChip
            key={subject}
            label={subject}
            isSelected={(filters.subject ?? "All") === subject}
            onPress={() => onChange({ ...filters, subject: subject === "All" ? undefined : subject })}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Grade">
        {GRADES.map(({ label, grade }) => (
          <FilterChip
            key={label}
            label={label}
            isSelected={(filters.grade ?? undefined) === grade}
            onPress={() => onChange({ ...filters, grade })}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Completion status">
        {STATUSES.map(({ label, status }) => (
          <FilterChip
            key={label}
            label={label}
            isSelected={(filters.status ?? undefined) === status}
            onPress={() => onChange({ ...filters, status })}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Score">
        {SCORE_BANDS.map(({ label, scoreMin, scoreMax }) => (
          <FilterChip
            key={label}
            label={label}
            isSelected={activeScoreBand === label}
            onPress={() => onChange({ ...filters, scoreMin, scoreMax })}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Date">
        {DATE_PRESETS.map(({ label, getRange }) => (
          <FilterChip
            key={label}
            label={label}
            isSelected={activeDatePreset === label}
            onPress={() => {
              setActiveDatePreset(label);
              if (label !== "Custom range") onChange({ ...filters, ...getRange() });
            }}
          />
        ))}
      </FilterGroup>

      {activeDatePreset === "Custom range" && (
        <View className="flex-row gap-2 mb-2">
          <TextInput
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
            placeholder="From (YYYY-MM-DD)"
            placeholderTextColor="#94a3b8"
            value={customFrom}
            onChangeText={setCustomFrom}
            onEndEditing={() => onChange({ ...filters, dateFrom: customFrom ? new Date(customFrom).toISOString() : undefined })}
          />
          <TextInput
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800"
            placeholder="To (YYYY-MM-DD)"
            placeholderTextColor="#94a3b8"
            value={customTo}
            onChangeText={setCustomTo}
            onEndEditing={() => onChange({ ...filters, dateTo: customTo ? new Date(customTo).toISOString() : undefined })}
          />
        </View>
      )}
    </View>
  );
}
