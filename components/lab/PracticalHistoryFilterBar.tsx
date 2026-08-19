import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { colors } from "@/constants/colors";
import { DATE_PRESETS, GRADES, HISTORY_FILTER_SUBJECTS, SCORE_BANDS, STATUSES } from "@/constants/lab/history.constants";
import { usePressScale } from "@/hooks/lab/use-press-scale";
import { PracticalHistoryFilterBarProps } from "@/types/lab";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Same chip visual language as EquipmentChip (chemistry/[experimentId]/equipment.tsx) — reused
// here instead of duplicated, since both are "toggle a single choice from a small fixed set".
const FilterChip = ({ label, isSelected, onPress }: { label: string; isSelected: boolean; onPress: () => void }) => {
  const { style, onPressIn, onPressOut } = usePressScale();
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className="px-3 py-1.5 rounded-2xl border"
      style={[
        {
          backgroundColor: isSelected ? `${colors.primary}0D` : "white",
          borderColor: isSelected ? colors.primary : colors.borderColorLight,
          borderWidth: isSelected ? 1.5 : 1,
        },
        style,
      ]}
    >
      <Text className="font-amedium text-sm" style={{ color: isSelected ? colors.primary : colors.primaryBlack }}>
        {label}
      </Text>
    </AnimatedPressable>
  );
};

const FilterGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View className="mb-3">
    <Text className="font-amedium text-xs text-muted mb-1.5">{label}</Text>
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
    <View className="px-4 pt-2 pb-1">
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
            className="flex-1 border rounded-xl px-3 py-2 font-aregular text-sm"
            style={{ borderColor: colors.borderColorLight }}
            placeholder="From (YYYY-MM-DD)"
            placeholderTextColor={colors.muted}
            value={customFrom}
            onChangeText={setCustomFrom}
            onEndEditing={() => onChange({ ...filters, dateFrom: customFrom ? new Date(customFrom).toISOString() : undefined })}
          />
          <TextInput
            className="flex-1 border rounded-xl px-3 py-2 font-aregular text-sm"
            style={{ borderColor: colors.borderColorLight }}
            placeholder="To (YYYY-MM-DD)"
            placeholderTextColor={colors.muted}
            value={customTo}
            onChangeText={setCustomTo}
            onEndEditing={() => onChange({ ...filters, dateTo: customTo ? new Date(customTo).toISOString() : undefined })}
          />
        </View>
      )}
    </View>
  );
}
