import { ReactNode, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";
import { Check, ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { DATE_PRESETS, GRADES, HISTORY_FILTER_SUBJECTS, SCORE_BANDS, STATUSES } from "@/constants/lab/history.constants";
import { usePressScale } from "@/hooks/lab/use-press-scale";
import { PracticalHistoryFilterBarProps, SessionHistoryFilterType } from "@/types/lab";

type FilterGroupKey = "subject" | "grade" | "status" | "score" | "date";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ToolbarChip({ label, value, open, onPress }: { label: string; value: string; open: boolean; onPress: () => void }) {
  const { style, onPressIn, onPressOut } = usePressScale();
  const active = open || (value !== "All" && value !== "All time");
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className={`min-h-[40px] flex-row items-center gap-1.5 rounded-xl border px-3 ${
        open ? "border-primary bg-primary" : active ? "border-primary/30 bg-primary/10" : "border-slate-200 bg-white"
      }`}
      style={style}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
    >
      <View className={`h-1.5 w-1.5 rounded-full ${open ? "bg-white" : active ? "bg-primary" : "bg-slate-300"}`} />
      <Text className={`text-[11px] font-black ${open ? "text-white" : active ? "text-primary" : "text-slate-500"}`}>
        {label}: {value}
      </Text>
      <ChevronDown
        size={12}
        color={open ? ICON_COLORS.white : active ? ICON_COLORS.primary500 : ICON_COLORS.slate400}
        strokeWidth={2.5}
        style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
      />
    </AnimatedPressable>
  );
}

function OptionRow({ label, selected, onPress, dotClass }: { label: string; selected: boolean; onPress: () => void; dotClass?: string }) {
  return (
    <TouchableOpacity
      className={`min-h-[46px] flex-row items-center justify-between px-4 py-2.5 ${selected ? "bg-primary/5" : "bg-white"}`}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View className="flex-row items-center gap-2.5">
        <View className={`h-2 w-2 rounded-full ${dotClass ?? (selected ? "bg-primary" : "bg-slate-300")}`} />
        <Text className={`text-[13px] font-semibold ${selected ? "text-primary" : "text-slate-700"}`}>{label}</Text>
      </View>
      {selected && <Check size={15} color={ICON_COLORS.primary500} strokeWidth={2.8} />}
    </TouchableOpacity>
  );
}

function DropdownPanel({ children }: { children: ReactNode }) {
  return <View className="mt-2 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm shadow-black/5">{children}</View>;
}

const validIso = (value: string) => {
  if (!value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export default function PracticalHistoryFilterBar({ filters, onChange }: PracticalHistoryFilterBarProps) {
  const [activeGroup, setActiveGroup] = useState<FilterGroupKey | null>(null);
  const [activeDatePreset, setActiveDatePreset] = useState("All time");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const subjectValue = filters.subject ?? "All";
  const gradeValue = GRADES.find((item) => item.grade === filters.grade)?.label ?? "All";
  const statusValue = STATUSES.find((item) => item.status === filters.status)?.label ?? "All";
  const scoreValue = SCORE_BANDS.find((item) => item.scoreMin === filters.scoreMin && item.scoreMax === filters.scoreMax)?.label ?? "All";
  const activeCount = [filters.subject, filters.grade, filters.status, filters.scoreMin != null || filters.scoreMax != null, filters.dateFrom || filters.dateTo].filter(Boolean).length;

  const toggle = (key: FilterGroupKey) => setActiveGroup((current) => (current === key ? null : key));
  const select = (next: SessionHistoryFilterType) => {
    onChange(next);
    setActiveGroup(null);
  };
  const reset = () => {
    setActiveDatePreset("All time");
    setCustomFrom("");
    setCustomTo("");
    setActiveGroup(null);
    onChange({});
  };

  return (
    <View className="border-b border-slate-100 bg-slate-50 px-4 pb-3 pt-3">
      <View className="mb-2.5 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <SlidersHorizontal size={15} color={ICON_COLORS.primary500} strokeWidth={2.3} />
          </View>
          <View>
            <Text className="text-[13px] font-black text-slate-800">Filter sessions</Text>
            <Text className="text-[10px] font-medium text-slate-400">{activeCount} active filter{activeCount === 1 ? "" : "s"}</Text>
          </View>
        </View>
        {activeCount > 0 && (
          <TouchableOpacity className="flex-row items-center gap-1 rounded-xl bg-white px-2.5 py-2" activeOpacity={0.75} onPress={reset}>
            <RotateCcw size={12} color={ICON_COLORS.slate500} strokeWidth={2.2} />
            <Text className="text-[11px] font-bold text-slate-500">Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
        <ToolbarChip label="Subject" value={subjectValue} open={activeGroup === "subject"} onPress={() => toggle("subject")} />
        <ToolbarChip label="Grade" value={gradeValue.replace("Grade ", "G")} open={activeGroup === "grade"} onPress={() => toggle("grade")} />
        <ToolbarChip label="Status" value={statusValue} open={activeGroup === "status"} onPress={() => toggle("status")} />
        <ToolbarChip label="Score" value={scoreValue} open={activeGroup === "score"} onPress={() => toggle("score")} />
        <ToolbarChip label="Date" value={activeDatePreset} open={activeGroup === "date"} onPress={() => toggle("date")} />
      </ScrollView>

      {activeGroup === "subject" && (
        <DropdownPanel>
          {HISTORY_FILTER_SUBJECTS.map((subject) => (
            <OptionRow
              key={subject}
              label={subject}
              selected={subjectValue === subject}
              onPress={() => select({ ...filters, subject: subject === "All" ? undefined : subject })}
            />
          ))}
        </DropdownPanel>
      )}

      {activeGroup === "grade" && (
        <DropdownPanel>
          {GRADES.map((item) => (
            <OptionRow key={item.label} label={item.label} selected={filters.grade === item.grade} onPress={() => select({ ...filters, grade: item.grade })} />
          ))}
        </DropdownPanel>
      )}

      {activeGroup === "status" && (
        <DropdownPanel>
          {STATUSES.map((item) => (
            <OptionRow
              key={item.label}
              label={item.label}
              selected={filters.status === item.status}
              dotClass={item.status === "completed" ? "bg-emerald-500" : item.status === "in_progress" ? "bg-amber-500" : item.status === "abandoned" ? "bg-rose-500" : "bg-slate-400"}
              onPress={() => select({ ...filters, status: item.status })}
            />
          ))}
        </DropdownPanel>
      )}

      {activeGroup === "score" && (
        <DropdownPanel>
          {SCORE_BANDS.map((item) => (
            <OptionRow
              key={item.label}
              label={item.label}
              selected={scoreValue === item.label}
              onPress={() => select({ ...filters, scoreMin: item.scoreMin, scoreMax: item.scoreMax })}
            />
          ))}
        </DropdownPanel>
      )}

      {activeGroup === "date" && (
        <DropdownPanel>
          {DATE_PRESETS.map((item) => (
            <OptionRow
              key={item.label}
              label={item.label}
              selected={activeDatePreset === item.label}
              onPress={() => {
                setActiveDatePreset(item.label);
                if (item.label === "Custom range") return;
                select({ ...filters, dateFrom: undefined, dateTo: undefined, ...item.getRange() });
              }}
            />
          ))}
          {activeDatePreset === "Custom range" && (
            <View className="gap-2 border-t border-slate-100 bg-slate-50 p-3">
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-800"
                  placeholder="From: YYYY-MM-DD"
                  placeholderTextColor={ICON_COLORS.slate400}
                  value={customFrom}
                  onChangeText={setCustomFrom}
                />
                <TextInput
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-800"
                  placeholder="To: YYYY-MM-DD"
                  placeholderTextColor={ICON_COLORS.slate400}
                  value={customTo}
                  onChangeText={setCustomTo}
                />
              </View>
              <TouchableOpacity
                className="min-h-[42px] items-center justify-center rounded-xl bg-primary"
                activeOpacity={0.82}
                onPress={() => select({ ...filters, dateFrom: validIso(customFrom), dateTo: validIso(customTo) })}
              >
                <Text className="text-[12px] font-black text-white">Apply date range</Text>
              </TouchableOpacity>
            </View>
          )}
        </DropdownPanel>
      )}
    </View>
  );
}
