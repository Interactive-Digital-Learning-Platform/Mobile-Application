import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import { Award, BookOpen, CheckCircle2, ChevronDown, Lightbulb, NotebookPen, Sparkles, Target, TriangleAlert } from "lucide-react-native";
import { ICON_COLORS } from "@/constants/quizStyles";
import { useSessionReport } from "@/hooks/lab/use-lab-session";
import { LabReportType, ReportStepType } from "@/types/lab";

// ── helpers ──────────────────────────────────────────────────────────────────────────────────
const fmtDuration = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m === 0) return `${rem}s`;
  return `${m}m ${String(rem).padStart(2, "0")}s`;
};

const scoreTone = (score: number) =>
  score >= 90
    ? { text: "text-emerald-600", bg: "bg-emerald-50", bar: "bg-emerald-500" }
    : score >= 75
      ? { text: "text-amber-600", bg: "bg-amber-50", bar: "bg-amber-500" }
      : { text: "text-rose-600", bg: "bg-rose-50", bar: "bg-rose-500" };

const STATUS_TONE: Record<ReportStepType["status"], { bg: string; text: string }> = {
  Strong: { bg: "bg-emerald-100", text: "text-emerald-700" },
  Good: { bg: "bg-blue-100", text: "text-blue-700" },
  Fair: { bg: "bg-amber-100", text: "text-amber-700" },
  Challenging: { bg: "bg-rose-100", text: "text-rose-700" },
};

// ── small components ─────────────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-4">
      <Text className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">{title}</Text>
      <View className="rounded-2xl bg-white border border-slate-100 p-3.5">{children}</View>
    </View>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View className="mt-4">
      <Text className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">{title}</Text>
      <View className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
        <TouchableOpacity
          className="flex-row items-center justify-between p-3.5"
          activeOpacity={0.7}
          onPress={() => setOpen((v) => !v)}
        >
          <Text className="text-[13px] font-bold text-slate-700">{open ? "Hide details" : "Show details"}</Text>
          <ChevronDown
            size={16}
            color={ICON_COLORS.slate400}
            strokeWidth={2.5}
            style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
          />
        </TouchableOpacity>
        {open && <View className="px-3.5 pb-3.5">{children}</View>}
      </View>
    </View>
  );
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="items-center">
      <Text className="text-[15px] font-black text-slate-800">{value}</Text>
      <Text className="text-[10px] font-semibold text-slate-400 mt-0.5">{label}</Text>
    </View>
  );
}

function ScoreCard({ report }: { report: LabReportType }) {
  const tone = scoreTone(report.score);
  const perf = report.performanceScore ?? report.score;
  const time = report.timeScore ?? null;
  return (
    <View className="mt-4 rounded-3xl bg-white border border-slate-100 p-5 items-center">
      <Text className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Final Score</Text>
      <View className="flex-row items-end mt-1">
        <Text className={`text-[46px] font-black leading-[52px] ${tone.text}`}>{report.score}</Text>
        <Text className="text-[16px] font-bold text-slate-400 mb-2 ml-1">/ 100</Text>
      </View>

      <View className="flex-row justify-around self-stretch mt-3 pt-3 border-t border-slate-100">
        <StatChip label="Performance" value={perf} />
        <StatChip label="Time Efficiency" value={time == null ? "—" : time} />
        <StatChip label="Active Time" value={fmtDuration(report.totalActiveTime ?? 0)} />
      </View>

      {time == null && (
        <Text className="text-[10px] text-slate-400 mt-2 text-center">
          Time efficiency isn&apos;t measured for this practical yet — the score is performance only.
        </Text>
      )}
      <Text className="text-[10px] text-slate-400 mt-1.5 text-center">
        Final = performance (90%) + time efficiency (10%). Total session time {fmtDuration(report.totalTime)}.
      </Text>
    </View>
  );
}

function TaskRow({ task }: { task: ReportStepType["tasks"][number] }) {
  const tags: string[] = [];
  if (task.highestHintLevel > 0) tags.push(`${task.highestHintLevel} hint${task.highestHintLevel > 1 ? "s" : ""}`);
  if (task.helpUsed) tags.push("Help");
  return (
    <View className="flex-row items-start gap-2 mt-2">
      <View className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2" />
      <View className="flex-1">
        <Text className="text-[12px] text-slate-600 leading-4" numberOfLines={2}>
          {task.prompt || `Current Task ${task.microStepId}`}
        </Text>
        <Text className="text-[11px] text-slate-400 mt-0.5">
          Score {task.score} · {fmtDuration(task.timeSpentSeconds)}
          {tags.length ? ` · ${tags.join(", ")}` : ""}
        </Text>
      </View>
    </View>
  );
}

function StepRow({ step, isLast }: { step: ReportStepType; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const tone = STATUS_TONE[step.status];
  const meta: string[] = [fmtDuration(step.timeSpentSeconds)];
  if (step.hintsRequested > 0) meta.push(`${step.hintsRequested} hint${step.hintsRequested > 1 ? "s" : ""}`);
  if (step.helpUsed) meta.push("Help used");
  if (step.retries > 0) meta.push(`${step.retries} retr${step.retries > 1 ? "ies" : "y"}`);

  return (
    <View className={`${isLast ? "" : "border-b border-slate-100"} py-2.5`}>
      <Pressable
        onPress={() => step.tasks.length > 0 && setOpen((v) => !v)}
        className="flex-row items-center gap-2"
      >
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-[13px] font-bold text-slate-800 flex-1" numberOfLines={1}>
              {step.stepId}. {step.title}
            </Text>
            <View className={`px-2 py-0.5 rounded-full ${tone.bg}`}>
              <Text className={`text-[10px] font-bold ${tone.text}`}>{step.status}</Text>
            </View>
          </View>
          <Text className="text-[11px] text-slate-400 mt-0.5">
            Score {step.score} · {meta.join(" · ")}
          </Text>
        </View>
        {step.tasks.length > 0 && (
          <ChevronDown
            size={15}
            color={ICON_COLORS.slate400}
            strokeWidth={2.5}
            style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
          />
        )}
      </Pressable>

      {open && step.tasks.length > 0 && (
        <View className="mt-1 pl-1">
          {step.tasks.map((t) => (
            <TaskRow key={t.microStepId} task={t} />
          ))}
        </View>
      )}
    </View>
  );
}

// ── screen ───────────────────────────────────────────────────────────────────────────────────
export default function Report() {
  const { sessionId, experimentId } = useLocalSearchParams<{ sessionId: string; experimentId: string }>();
  const { data: report, isLoading, isError, refetch } = useSessionReport(sessionId);

  if (isError) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-slate-50 px-8" edges={["top", "bottom"]}>
        <Text className="text-base font-black text-center text-slate-800">Couldn&apos;t load your report</Text>
        <TouchableOpacity className="mt-4 bg-primary px-6 py-3 rounded-xl" activeOpacity={0.85} onPress={() => refetch()}>
          <Text className="text-white text-sm font-bold">Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (isLoading || !report) {
    return (
      <SafeAreaView className="w-full flex-1 justify-center items-center bg-slate-50" edges={["top", "bottom"]}>
        <ActivityIndicator color={ICON_COLORS.primary500} />
      </SafeAreaView>
    );
  }

  const g = report.guidanceSummary;
  const hasGuidance = !!g && (g.hint1Count + g.hint2Count + g.hint3Count + g.helpCount > 0);
  const strengths = report.aiFeedback?.strengths ?? [];
  // Phase 3: personalized recommendations preferred; fall back to the legacy rule-based tips.
  const recommendations = report.aiFeedback?.recommendations?.length
    ? report.aiFeedback.recommendations
    : (report.aiFeedback?.suggestions ?? []);
  const struggleAnalysis = report.aiFeedback?.struggleAnalysis ?? [];
  const conceptual = report.errorsDetected?.conceptual ?? [];
  const procedural = report.errorsDetected?.procedural ?? [];
  const steps = report.stepBreakdown ?? [];

  return (
    <SafeAreaView className="w-full flex-1 bg-slate-50" edges={["top", "bottom"]}>
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <Animated.View entering={FadeIn.duration(250)}>
          <Text className="text-[11px] font-bold uppercase tracking-wide text-primary mt-4">Practical Completed</Text>
          <Text className="text-xl font-black text-slate-900 mt-0.5">{report.experimentName}</Text>
          <Text className="text-[12px] text-slate-500 mt-0.5">{report.subject} Practical</Text>

          <ScoreCard report={report} />

          {report.finalUnderstandingAssessment && (
            <Section title="Understanding">
              <View className="flex-row items-start gap-2">
                <Award size={16} color={ICON_COLORS.primary500} style={{ marginTop: 1 }} />
                <Text className="flex-1 text-[13px] text-slate-700 leading-5">{report.finalUnderstandingAssessment}</Text>
              </View>
            </Section>
          )}

          {steps.length > 0 && (
            <Section title="Performance by Step">
              {steps.map((s, i) => (
                <StepRow key={s.stepId} step={s} isLast={i === steps.length - 1} />
              ))}
              {steps.some((s) => s.tasks.length > 0) && (
                <Text className="text-[10px] text-slate-400 mt-2">Tap a step to see its Current Tasks.</Text>
              )}
            </Section>
          )}

          {(report.mostStruggledSteps?.length ?? 0) > 0 && (
            <Section title="Where You Struggled">
              {report.mostStruggledSteps!.map((s, i) => (
                <View key={s.stepId} className={i > 0 ? "mt-3 pt-3 border-t border-slate-100" : undefined}>
                  <View className="flex-row items-center gap-2">
                    <TriangleAlert size={14} color={ICON_COLORS.rose500} strokeWidth={2.5} />
                    <Text className="text-[13px] font-bold text-slate-800 flex-1">{s.title}</Text>
                  </View>
                  {!!struggleAnalysis[i] && (
                    <Text className="text-[12px] text-slate-700 leading-5 mt-1 ml-6">{struggleAnalysis[i]}</Text>
                  )}
                  {s.reasons.map((r, j) => (
                    <Text key={j} className="text-[11px] text-slate-400 leading-4 mt-0.5 ml-6">
                      • {r}
                    </Text>
                  ))}
                </View>
              ))}
            </Section>
          )}

          {hasGuidance && (
            <Section title="Guidance Used">
              <View className="gap-1.5">
                {g!.hint1Count > 0 && <GuidanceRow label="Hint 1" count={g!.hint1Count} />}
                {g!.hint2Count > 0 && <GuidanceRow label="Hint 2" count={g!.hint2Count} />}
                {g!.hint3Count > 0 && <GuidanceRow label="Hint 3" count={g!.hint3Count} />}
                {g!.helpCount > 0 && <GuidanceRow label="Help — answer revealed" count={g!.helpCount} />}
              </View>
              {g!.totalDeduction > 0 && (
                <Text className="text-[11px] text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100">
                  Score impact from guidance:{" "}
                  <Text className="font-bold text-slate-700">−{g!.totalDeduction}</Text>
                </Text>
              )}
            </Section>
          )}

          {strengths.length > 0 && (
            <Section title="What You Did Well">
              {strengths.map((s, i) => (
                <View key={i} className={`flex-row items-start gap-2 ${i > 0 ? "mt-1.5" : ""}`}>
                  <CheckCircle2 size={15} color={ICON_COLORS.emerald600} style={{ marginTop: 1 }} />
                  <Text className="flex-1 text-[13px] text-slate-700 leading-5">{s}</Text>
                </View>
              ))}
            </Section>
          )}

          {report.aiFeedback?.summary && (
            <Section title="AI Performance Review">
              <View className="flex-row items-start gap-2">
                <Sparkles size={16} color={ICON_COLORS.primary500} style={{ marginTop: 1 }} />
                <Text className="flex-1 text-[13px] text-slate-700 leading-5">{report.aiFeedback.summary}</Text>
              </View>
            </Section>
          )}

          {recommendations.length > 0 && (
            <Section title="How to Improve">
              {recommendations.map((s, i) => (
                <View key={i} className={`flex-row items-start gap-2 ${i > 0 ? "mt-1.5" : ""}`}>
                  <Lightbulb size={15} color={ICON_COLORS.amber600} style={{ marginTop: 1 }} />
                  <Text className="flex-1 text-[13px] text-slate-700 leading-5">{s}</Text>
                </View>
              ))}
            </Section>
          )}

          {report.conceptsToImprove.length > 0 && (
            <Section title="Concepts to Review">
              {report.conceptsToImprove.map((c, i) => (
                <View key={i} className={`flex-row items-start gap-2 ${i > 0 ? "mt-1.5" : ""}`}>
                  <Target size={14} color={ICON_COLORS.violet600} style={{ marginTop: 2 }} />
                  <Text className="flex-1 text-[13px] text-slate-700 leading-5">{c}</Text>
                </View>
              ))}
            </Section>
          )}

          {(conceptual.length > 0 || procedural.length > 0) && (
            <Section title="Errors Detected">
              {conceptual.map((e, i) => (
                <View key={`c${i}`} className={i > 0 ? "mt-3 pt-3 border-t border-slate-100" : undefined}>
                  <Text className="text-[13px] font-bold text-rose-700">{e.description}</Text>
                  {!!e.correctionStrategy && (
                    <Text className="text-[12px] text-slate-600 leading-5 mt-0.5">{e.correctionStrategy}</Text>
                  )}
                </View>
              ))}
              {procedural.map((e, i) => (
                <View
                  key={`p${i}`}
                  className={conceptual.length > 0 || i > 0 ? "mt-3 pt-3 border-t border-slate-100" : undefined}
                >
                  <Text className="text-[13px] text-slate-700 leading-5">
                    {e.message}
                    {e.count > 1 ? ` (${e.count}×)` : ""}
                  </Text>
                  <Text className="text-[11px] text-slate-400 mt-0.5">
                    Step {e.stepId} — {e.stepTitle}
                  </Text>
                </View>
              ))}
            </Section>
          )}

          {steps.length > 0 && (
            <CollapsibleSection title="Time Breakdown">
              {steps.map((s) => (
                <View key={s.stepId} className="flex-row justify-between py-1">
                  <Text className="text-[12px] text-slate-600 flex-1 pr-2" numberOfLines={1}>
                    {s.stepId}. {s.title}
                  </Text>
                  <Text className="text-[12px] font-semibold text-slate-700">{fmtDuration(s.timeSpentSeconds)}</Text>
                </View>
              ))}
              <View className="mt-2 pt-2 border-t border-slate-100 gap-1">
                <View className="flex-row justify-between">
                  <Text className="text-[12px] font-bold text-slate-700">Total active time</Text>
                  <Text className="text-[12px] font-bold text-slate-800">{fmtDuration(report.totalActiveTime ?? 0)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-[11px] text-slate-400">Total session time (incl. pauses)</Text>
                  <Text className="text-[11px] text-slate-400">{fmtDuration(report.totalTime)}</Text>
                </View>
              </View>
            </CollapsibleSection>
          )}

          {report.practicalReference && (
            <Section title="Textbook Reference">
              <View className="flex-row items-start gap-2">
                <BookOpen size={15} color={ICON_COLORS.primary500} style={{ marginTop: 1 }} />
                <View className="flex-1">
                  <Text className="text-[13px] font-bold text-slate-800">
                    {report.practicalReference.lessonTitle}
                    {report.practicalReference.sectionTitle ? ` — ${report.practicalReference.sectionTitle}` : ""}
                  </Text>
                  <Text className="text-[12px] text-slate-500 mt-0.5">{report.practicalReference.displayText}</Text>
                </View>
              </View>
            </Section>
          )}

          {(report.followUpReading?.length ?? 0) > 0 && (
            <Section title="Follow-up Reading">
              {report.followUpReading!.map((r, i) => (
                <View key={i} className={i > 0 ? "mt-2 pt-2 border-t border-slate-100" : undefined}>
                  <Text className="text-[13px] font-bold text-slate-800">
                    {r.lessonTitle}
                    {r.sectionTitle ? ` — ${r.sectionTitle}` : ""}
                  </Text>
                  <Text className="text-[12px] text-slate-500 mt-0.5">
                    {r.bookTitle ? `${r.bookTitle} · ` : ""}
                    {r.pageStart
                      ? r.pageEnd && r.pageEnd !== r.pageStart
                        ? `pp. ${r.pageStart}–${r.pageEnd}`
                        : `p. ${r.pageStart}`
                      : ""}
                  </Text>
                </View>
              ))}
            </Section>
          )}

          {/* Lab → Notes handoff. The Lab only hands over the sessionId — the Notes feature
              fetches the performance context and owns turning it into a saved revision note. */}
          <View className="mt-4">
            <Text className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Personalized Study Note</Text>
            <View className="rounded-2xl bg-primary/5 border border-primary/20 p-3.5">
              <Text className="text-[12px] text-slate-600 leading-5">
                Turn your performance in this practical into a personalized revision note based on what you found easy
                and difficult.
              </Text>
              <TouchableOpacity
                className="mt-3 flex-row items-center justify-center gap-2 py-3 rounded-xl bg-primary"
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/(main)/notes/from-practical" as never,
                    params: {
                      sessionId: sessionId ?? "",
                      experimentId: experimentId ?? "",
                      experimentName: report.experimentName,
                    },
                  })
                }
              >
                <NotebookPen size={16} color="#fff" strokeWidth={2.5} />
                <Text className="text-white text-[14px] font-bold">Generate Personalized Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <View className="px-4 pt-3 pb-2 bg-slate-50">
        <TouchableOpacity
          className="py-3.5 rounded-xl items-center bg-white border border-slate-200"
          activeOpacity={0.85}
          onPress={() => router.replace("/(tabs)/lab/practicals" as never)}
        >
          <Text className="text-slate-700 text-[15px] font-bold">Back to Practicals</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function GuidanceRow({ label, count }: { label: string; count: number }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-[12px] text-slate-600">{label}</Text>
      <Text className="text-[12px] font-semibold text-slate-700">
        {count} time{count > 1 ? "s" : ""}
      </Text>
    </View>
  );
}
