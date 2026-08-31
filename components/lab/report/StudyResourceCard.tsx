import { Text, View } from "react-native";
import { BookOpen } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { LabReportType } from "@/types/lab";

// Small study-resource card for the practical's textbook placement (spec §12). Grade isn't in
// the report payload, so it's simply omitted rather than guessed.
export default function StudyResourceCard({ report }: { report: LabReportType }) {
  const ref = report.practicalReference;
  const followUp = report.followUpReading ?? [];
  if (!ref && followUp.length === 0) return null;

  return (
    <View className="rounded-2xl bg-white border border-slate-100 p-4">
      <View className="flex-row items-start gap-3">
        <View className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center">
          <BookOpen size={17} color={ICON_COLORS.primary500} strokeWidth={2.2} />
        </View>
        <View className="flex-1">
          <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {report.subject} · Textbook reference
          </Text>
          {ref ? (
            <>
              <Text className="text-[13px] font-bold text-slate-800 mt-0.5">
                {ref.lessonTitle}
                {ref.sectionTitle ? ` — ${ref.sectionTitle}` : ""}
              </Text>
              <Text className="text-[12px] text-slate-500 mt-0.5">{ref.displayText}</Text>
            </>
          ) : (
            <Text className="text-[13px] font-bold text-slate-800 mt-0.5">Follow-up reading</Text>
          )}
        </View>
      </View>

      {followUp.length > 0 && (
        <View className="mt-3 pt-3 border-t border-slate-100 gap-2">
          <Text className="text-[11px] font-bold text-slate-500">For the steps you found hard</Text>
          {followUp.map((r, i) => (
            <Text key={i} className="text-[12px] text-slate-600 leading-4">
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

      <View className="mt-3 self-start rounded-full bg-slate-100 px-2.5 py-1">
        <Text className="text-[10px] font-bold text-slate-500">Use for your next attempt</Text>
      </View>
    </View>
  );
}
