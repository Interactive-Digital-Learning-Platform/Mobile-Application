import { useState } from "react";
import { Text, View } from "react-native";
import { ArrowRight, ShieldCheck } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { ERROR_GROUP_META } from "@/constants/lab/report.constants";
import { ReportErrorItem } from "@/types/lab";
import { AccordionRow, SectionHeading } from "./primitives";

// Errors as a compact summary + supportive, expandable cards — never one big red block (spec §10).
export default function ReportErrorAccordion({ errors }: { errors: ReportErrorItem[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (errors.length === 0) {
    return (
      <View>
        <SectionHeading title="Areas to Watch" icon={ShieldCheck} iconColor={ICON_COLORS.emerald600} />
        <View className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 flex-row items-center gap-2">
          <ShieldCheck size={16} color={ICON_COLORS.emerald600} strokeWidth={2.4} />
          <Text className="text-[12px] font-semibold text-emerald-800">
            No procedural or conceptual issues were flagged this run.
          </Text>
        </View>
      </View>
    );
  }

  const label = errors.length === 1 ? "1 area needs another look" : `${errors.length} areas need another look`;

  return (
    <View>
      <SectionHeading title="Areas to Watch" icon={ShieldCheck} iconColor={ICON_COLORS.amber600} />
      <Text className="text-[12px] font-semibold text-slate-500 -mt-1 mb-2">{label}</Text>

      <View className="gap-2">
        {errors.map((err) => {
          const meta = ERROR_GROUP_META[err.group];
          const Icon = meta.icon;
          const open = openKey === err.key;
          return (
            <AccordionRow
              key={err.key}
              open={open}
              onToggle={() => setOpenKey(open ? null : err.key)}
              style={{ borderLeftWidth: 3, borderLeftColor: meta.accent }}
              header={
                <View className="flex-row items-center gap-2 pr-1">
                  <Icon size={15} color={meta.iconColor} strokeWidth={2.4} />
                  <View className="flex-1">
                    <Text className="text-[13px] font-semibold text-slate-800" numberOfLines={1}>
                      {err.title}
                    </Text>
                    <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">
                      {meta.label}
                      {err.relatedStepLabel ? ` · ${err.relatedStepLabel}` : ""}
                    </Text>
                  </View>
                </View>
              }
            >
              <Text className="text-[11px] font-bold text-slate-500 mt-1">What happened</Text>
              <Text className="text-[12px] text-slate-600 leading-5 mt-0.5">{err.whatHappened}</Text>

              <Text className="text-[11px] font-bold text-slate-500 mt-2.5">Why it matters</Text>
              <Text className="text-[12px] text-slate-600 leading-5 mt-0.5">{err.whyItMatters}</Text>

              <View className="flex-row items-start gap-2 mt-3 pt-2.5 border-t border-slate-100">
                <ArrowRight size={13} color={ICON_COLORS.emerald600} strokeWidth={2.6} style={{ marginTop: 2 }} />
                <Text className="flex-1 text-[12px] font-semibold text-slate-700 leading-5">{err.correctiveAction}</Text>
              </View>
            </AccordionRow>
          );
        })}
      </View>
    </View>
  );
}
