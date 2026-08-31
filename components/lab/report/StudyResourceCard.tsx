import { useState } from "react";
import { Text, View } from "react-native";
import { BookOpen } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { LabReportType } from "@/types/lab";
import { AccordionRow } from "./primitives";

// Small study-resource card for the practical's textbook placement (spec §12). Grade isn't in
// the report payload, so it's simply omitted rather than guessed.
export default function StudyResourceCard({ report }: { report: LabReportType }) {
  const [open, setOpen] = useState(false);
  const ref = report.practicalReference;
  const followUp = report.followUpReading ?? [];
  if (!ref && followUp.length === 0) return null;

  return (
    <AccordionRow
      open={open}
      onToggle={() => setOpen((value) => !value)}
      header={
        <View className="flex-row items-center gap-3">
          <View className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center">
            <BookOpen size={17} color={ICON_COLORS.primary500} strokeWidth={2.2} />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Study for your next try
            </Text>
            <Text className="text-[13px] font-bold text-slate-800 mt-0.5" numberOfLines={1}>
              {ref?.lessonTitle ?? "Follow-up reading"}
            </Text>
          </View>
        </View>
      }
    >
      {ref && (
        <View className="pt-1">
          <Text className="text-[11px] font-bold text-slate-500">
            {report.subject} · Textbook reference
          </Text>
          <Text className="text-[12px] text-slate-600 leading-5 mt-1">
            {ref.sectionTitle ? `${ref.sectionTitle} · ` : ""}{ref.displayText}
          </Text>
        </View>
      )}

      {followUp.length > 0 && (
        <View className="mt-3 pt-3 border-t border-slate-100 gap-2">
          <Text className="text-[11px] font-bold text-slate-500">For the steps you found hard</Text>
          {followUp.map((r, i) => (
            <Text key={`${r.lessonTitle}-${i}`} className="text-[12px] text-slate-600 leading-4">
              • {r.lessonTitle}
              {r.sectionTitle ? ` — ${r.sectionTitle}` : ""}
              {r.pageStart
                ? r.pageEnd && r.pageEnd !== r.pageStart
                  ? ` (pp. ${r.pageStart}–${r.pageEnd})`
                  : ` (p. ${r.pageStart})`
                : ""}
            </Text>
          ))}
        </View>
      )}
    </AccordionRow>
  );
}
