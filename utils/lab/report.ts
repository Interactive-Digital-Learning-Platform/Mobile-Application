// Pure transforms: LabReportType (backend contract) → the Report screen's view model.
//
// RULES (spec §16):
//   • Every value here is derived from fields the backend already returned.
//   • No score is recalculated — `report.score` / `performanceScore` / `timeScore` are read as-is.
//   • No feedback prose is generated — strings are backend text, or fixed labels from
//     constants/lab/report.constants.ts chosen by a real signal.
//   • Missing fields degrade gracefully (a card is hidden or a fallback label is used) — an
//     error is never hidden just because one of its fields is absent.

import {
  PACE_THRESHOLDS,
  PERFORMANCE_MESSAGE,
  PROCEDURAL_WHY,
  PROCEDURAL_WHY_FALLBACK,
  UNDERSTANDING_LEVELS,
  UNDERSTANDING_PHRASE_MAP,
} from "@/constants/lab/report.constants";
import {
  AITutorHighlights,
  ChallengeInsight,
  GuidanceLine,
  JourneyStatusKey,
  JourneyStep,
  JourneyTask,
  LabReportType,
  LearningMission,
  QuickInsight,
  ReportErrorItem,
  ReportInsights,
  ReportStepType,
  ReportTaskType,
  StudentAchievement,
  TimeBreakdownRow,
  UnderstandingView,
} from "@/types/lab";

// mm:ss / "Xm Ys" — matches the backend's reportAnalyticsService.formatDuration exactly.
export const fmtDuration = (seconds: number): string => {
  const s = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m === 0 ? `${rem}s` : `${m}m ${String(rem).padStart(2, "0")}s`;
};

export const getScoreBand = (score: number): "high" | "mid" | "low" =>
  score >= 85 ? "high" : score >= 60 ? "mid" : "low";

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

const overRatio = (actual: number, expected: number | null): number | null =>
  expected && expected > 0 && actual > 0 ? actual / expected : null;

const stepMistakes = (s: ReportStepType) => (s.equipmentMistakes || 0) + (s.chemicalMistakes || 0);
const taskMistakes = (t: ReportTaskType) => (t.equipmentMistakes || 0) + (t.chemicalMistakes || 0);

// Split a paragraph into trimmed sentences (keeps the terminal punctuation).
export const splitSentences = (text: string | null | undefined): string[] => {
  if (!text) return [];
  return (text.match(/[^.!?]+[.!?]*/g) || [])
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};

const firstStepIdIn = (text: string): number | null => {
  const m = text.match(/step\s+(\d+)/i);
  return m ? Number(m[1]) : null;
};

// ── Understanding ───────────────────────────────────────────────────────────────────────────
export const deriveUnderstanding = (report: LabReportType): UnderstandingView => {
  const raw = report.finalUnderstandingAssessment?.trim();
  if (!raw) return null;

  const dashIdx = raw.search(/[—–-]/);
  const head = (dashIdx >= 0 ? raw.slice(0, dashIdx) : raw).trim();
  const explanation = (dashIdx >= 0 ? raw.slice(dashIdx + 1) : raw).trim();

  let level = UNDERSTANDING_PHRASE_MAP.find((p) => p.match.test(head))?.level ?? null;
  if (!level) {
    // Unrecognised phrasing — classify by the real score instead of guessing.
    const score = report.performanceScore ?? report.score;
    level = score >= 85 ? "strong" : score >= 70 ? "proficient" : score >= 55 ? "developing" : "needs-support";
  }
  const style = UNDERSTANDING_LEVELS[level];
  return {
    level,
    label: style.label,
    explanation: explanation || raw,
    meterFilled: style.meterFilled,
  };
};

// ── Lab Journey ─────────────────────────────────────────────────────────────────────────────
const journeyStatusFor = (s: ReportStepType): JourneyStatusKey => {
  const ratio = overRatio(s.timeSpentSeconds, s.expectedTimeSeconds);
  if (s.status === "Challenging" || s.helpUsed || s.struggleIndex >= 6) return "challenging";
  if (s.retries > 0 || stepMistakes(s) > 0) return "recovered";
  if (s.hintsRequested > 0) return "guided";
  if (ratio !== null && ratio > PACE_THRESHOLDS.slow) return "review-time";
  return "strong";
};

const STEP_ADVICE: Record<JourneyStatusKey, string | null> = {
  challenging: "Revisit this step with the textbook reference before your next attempt.",
  recovered: "You recovered after a wrong turn — good persistence. Aim to get it first-try next time.",
  guided: "You leaned on hints here. Try the step from memory before opening one next time.",
  "review-time": "This step took a while — plan the action in your head before you start.",
  strong: null,
};

const taskAdvice = (t: ReportTaskType): string | null => {
  if (t.helpUsed) return "The answer was revealed here — redo this task yourself next time.";
  if (t.highestHintLevel >= 3) return "You used all three hints — recall the method first next time.";
  if (t.hintsRequested > 0) return "You opened a hint here. Try recalling the step before you do.";
  if (taskMistakes(t) > 0) return "A wrong attempt or two — slow down on this action.";
  return null;
};

const toJourneyTask = (t: ReportTaskType, idx: number): JourneyTask => ({
  microStepId: t.microStepId,
  label: t.prompt?.trim() || `Task ${idx + 1}`,
  timeSpentSeconds: t.timeSpentSeconds || 0,
  score: t.score ?? 100,
  hintsRequested: t.hintsRequested || 0,
  helpUsed: !!t.helpUsed,
  mistakes: taskMistakes(t),
  scoreImpact: Math.round((t.hintPenalty || 0) + (t.helpPenalty || 0)),
  advice: taskAdvice(t),
});

export const deriveJourney = (report: LabReportType): JourneyStep[] => {
  const steps = report.stepBreakdown ?? [];
  if (steps.length === 0) return [];

  // "Most challenging": the backend's struggle ranking first, else the highest struggleIndex
  // (only if it actually signals difficulty), else none.
  let challengingId = report.mostStruggledSteps?.[0]?.stepId ?? null;
  if (challengingId == null) {
    const worst = [...steps].sort((a, b) => b.struggleIndex - a.struggleIndex)[0];
    if (worst && worst.struggleIndex > 0) challengingId = worst.stepId;
  }

  return steps.map((s) => {
    const status = journeyStatusFor(s);
    return {
      stepId: s.stepId,
      title: s.title,
      score: s.score ?? 100,
      timeSpentSeconds: s.timeSpentSeconds || 0,
      status,
      hintsRequested: s.hintsRequested || 0,
      helpUsed: !!s.helpUsed,
      helpRevealedAnswer: !!s.helpUsed,
      retries: s.retries || 0,
      mistakes: stepMistakes(s),
      scoreImpact: Math.round((s.hintPenalty || 0) + (s.helpPenalty || 0)),
      isMostChallenging: challengingId != null && s.stepId === challengingId,
      reasons: s.reasons ?? [],
      advice: STEP_ADVICE[status],
      tasks: (s.tasks ?? []).map(toJourneyTask),
    };
  });
};

// ── Quick insights ──────────────────────────────────────────────────────────────────────────
export const deriveQuickInsights = (report: LabReportType, journey: JourneyStep[]): QuickInsight[] => {
  const out: QuickInsight[] = [];
  if (journey.length > 0) {
    const strongest = [...journey].sort(
      (a, b) => b.score - a.score || a.retries + a.hintsRequested - (b.retries + b.hintsRequested)
    )[0];
    out.push({ key: "strongest-step", value: `Step ${strongest.stepId}`, label: "Strongest step" });

    const challenging = journey.find((j) => j.isMostChallenging);
    if (challenging) {
      out.push({ key: "challenging-step", value: `Step ${challenging.stepId}`, label: "Needs another look" });
    }
  }

  const g = report.guidanceSummary;
  const totalHints = g
    ? g.hint1Count + g.hint2Count + g.hint3Count
    : sum(journey.map((j) => j.hintsRequested));
  out.push({ key: "total-hints", value: String(totalHints), label: totalHints === 1 ? "Hint used" : "Hints used" });

  if (journey.length > 0) {
    const independent = journey.filter(
      (j) => j.hintsRequested === 0 && !j.helpUsed && j.retries === 0
    ).length;
    out.push({
      key: "independent-steps",
      value: `${independent}/${journey.length}`,
      label: "Steps solved solo",
    });

    const retries = sum(journey.map((j) => j.retries));
    out.push({ key: "total-retries", value: String(retries), label: retries === 1 ? "Retry" : "Retries" });
  }

  const cost = g?.totalDeduction ?? 0;
  if (cost > 0) out.push({ key: "guidance-cost", value: `−${cost}`, label: "Marks from guidance" });

  return out;
};

// ── Guidance breakdown ──────────────────────────────────────────────────────────────────────
export const deriveGuidance = (report: LabReportType): ReportInsights["guidance"] => {
  const g = report.guidanceSummary;
  if (!g) return null;
  const total = g.hint1Count + g.hint2Count + g.hint3Count + g.helpCount;
  if (total === 0) return null;

  const lines: GuidanceLine[] = [
    { key: "hint1", label: "Hint 1", count: g.hint1Count, answerReveal: false },
    { key: "hint2", label: "Hint 2", count: g.hint2Count, answerReveal: false },
    { key: "hint3", label: "Hint 3", count: g.hint3Count, answerReveal: false },
    { key: "help", label: "Answer revealed", count: g.helpCount, answerReveal: true },
  ];

  // The backend only gives a per-hint-vs-help split of the deduction, not per-level — surface it
  // at that granularity rather than inventing a per-line number.
  const helpDeduction = report.totalHelpPenalty ?? 0;
  const hintDeduction = report.totalHintPenalty ?? Math.max(0, g.totalDeduction - helpDeduction);

  return { lines, hintDeduction, helpDeduction, totalDeduction: g.totalDeduction };
};

// ── Challenge insight (consolidated — spec §6) ───────────────────────────────────────────────
export const deriveChallengeInsight = (
  report: LabReportType,
  journey: JourneyStep[]
): ChallengeInsight | null => {
  const struggled = report.mostStruggledSteps?.[0];
  const step = journey.find((j) => (struggled ? j.stepId === struggled.stepId : j.isMostChallenging));
  if (!step) return null;

  const evidence: string[] = [];
  if (step.hintsRequested > 0) evidence.push(`${step.hintsRequested} hint${step.hintsRequested > 1 ? "s" : ""}`);
  if (step.helpUsed) evidence.push("Answer revealed");
  if (step.retries > 0) evidence.push(`${step.retries} attempt${step.retries > 1 ? "s" : ""}`);
  if (step.mistakes > 0) evidence.push(`${step.mistakes} mistake${step.mistakes > 1 ? "s" : ""}`);
  evidence.push(fmtDuration(step.timeSpentSeconds));

  const why =
    report.aiFeedback?.struggleAnalysis?.[0]?.trim() ||
    (struggled?.reasons?.length ? struggled.reasons.join(" · ") : "") ||
    (step.reasons.length ? step.reasons.join(" · ") : "This step needed the most support.");

  const followUp = report.followUpReading?.find((r) => r.stepId === step.stepId);
  const nextAction = followUp
    ? `Re-read ${followUp.lessonTitle}${followUp.sectionTitle ? ` — ${followUp.sectionTitle}` : ""} before retrying.`
    : report.aiFeedback?.recommendations?.[0]?.trim() ||
      report.aiFeedback?.suggestions?.[0]?.trim() ||
      "Review this step with the textbook reference before your next attempt.";

  return { stepId: step.stepId, stepTitle: step.title, why, evidence, nextAction };
};

// ── AI Tutor highlights ─────────────────────────────────────────────────────────────────────
export const deriveTutorHighlights = (report: LabReportType, journey: JourneyStep[]): AITutorHighlights => {
  const fb = report.aiFeedback;
  const challenging = journey.find((j) => j.isMostChallenging);
  return {
    wentWell: fb?.strengths?.[0]?.trim() || null,
    struggled:
      fb?.struggleAnalysis?.[0]?.trim() ||
      report.mostStruggledSteps?.[0]?.reasons?.[0] ||
      (challenging ? `Step ${challenging.stepId} — ${challenging.title}` : null),
    nextStep:
      fb?.recommendations?.[0]?.trim() ||
      fb?.suggestions?.[0]?.trim() ||
      report.conceptsToImprove?.[0]?.trim() ||
      null,
  };
};

// ── Achievements (spec §8 — only when the report supports them) ───────────────────────────────
const shortTitle = (text: string, max = 42): string => {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/[\s,.;:]+\S*$/, "") + "…";
};

export const deriveAchievements = (report: LabReportType, journey: JourneyStep[]): StudentAchievement[] => {
  const out: StudentAchievement[] = [];
  const seen = new Set<string>();
  const push = (a: StudentAchievement) => {
    if (seen.has(a.key)) return;
    seen.add(a.key);
    out.push(a);
  };

  (report.aiFeedback?.strengths ?? []).forEach((s, i) => {
    const text = s.trim();
    if (!text) return;
    const title = shortTitle(text);
    push({ key: `strength-${i}`, title, detail: title === text ? null : text, evidence: null });
  });

  const totalHints = sum(journey.map((j) => j.hintsRequested));
  const totalRetries = sum(journey.map((j) => j.retries));
  const strongSteps = journey.filter((j) => j.status === "strong").length;
  const score = report.score;
  const timeScore = report.timeScore ?? null;

  if (journey.length > 0 && totalHints === 0 && !journey.some((j) => j.helpUsed)) {
    push({
      key: "no-hints",
      title: "No Hints Needed",
      detail: null,
      evidence: "You completed every step without opening a hint.",
    });
  }
  if (journey.length >= 2 && strongSteps >= 2) {
    push({
      key: "strong-steps",
      title: `${strongSteps} Strong Steps`,
      detail: null,
      evidence: `${strongSteps} of ${journey.length} steps were clean — no hints, retries or mistakes.`,
    });
  }
  if (totalRetries > 0 && score >= 85) {
    push({
      key: "strong-recovery",
      title: "Strong Recovery",
      detail: null,
      evidence: "You bounced back after a wrong turn and still finished with a high score.",
    });
  }
  if (timeScore != null && timeScore >= 85 && score >= 75) {
    push({
      key: "fast-accurate",
      title: "Fast & Accurate",
      detail: null,
      evidence: `Time efficiency ${timeScore}/100 with a strong performance score.`,
    });
  }

  return out.slice(0, 6);
};

// ── Learning missions (spec §9 — 1–3, no duplicates) ─────────────────────────────────────────
const missionCategory = (text: string): LearningMission["category"] => {
  if (/\btime\b|quick|slow|rush|pace|faster|minutes?/i.test(text)) return "time";
  if (/read|instruction|order|procedure|transfer|measure|record|sequence|before acting/i.test(text)) return "procedure";
  if (/concept|understand|why|because|reaction|relationship|principle|theory/i.test(text)) return "concept";
  return "skill";
};

export const deriveMissions = (report: LabReportType): LearningMission[] => {
  const fb = report.aiFeedback;
  const primary = fb?.recommendations?.length ? fb.recommendations : (fb?.suggestions ?? []);

  const candidates: { text: string; category: LearningMission["category"] }[] = [];
  primary.forEach((t) => candidates.push({ text: t, category: missionCategory(t) }));
  (report.conceptsToImprove ?? []).forEach((t) => candidates.push({ text: t, category: "concept" }));
  (report.errorsDetected?.conceptual ?? []).forEach((e) => {
    if (e.correctionStrategy) candidates.push({ text: e.correctionStrategy, category: "concept" });
  });
  (report.errorsDetected?.procedural ?? []).forEach((e) =>
    candidates.push({ text: e.message, category: "procedure" })
  );

  const seen = new Set<string>();
  const missions: LearningMission[] = [];
  const strugglingStep = report.mostStruggledSteps?.[0]?.stepId ?? null;

  for (const c of candidates) {
    const text = c.text.trim();
    const norm = text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!text || seen.has(norm)) continue;
    seen.add(norm);
    const sentences = splitSentences(text);
    missions.push({
      key: `mission-${missions.length}`,
      category: c.category,
      title: shortTitle(sentences[0] || text, 48),
      body: text,
      relatedStepId: firstStepIdIn(text) ?? strugglingStep,
    });
    if (missions.length === 3) break;
  }
  return missions;
};

// ── Errors Detected (spec §10) ──────────────────────────────────────────────────────────────
export const deriveErrors = (report: LabReportType): ReportErrorItem[] => {
  const out: ReportErrorItem[] = [];

  (report.errorsDetected?.procedural ?? []).forEach((e, i) => {
    const behaviour = /very quickly|read in full|out of order/i.test(e.message);
    const match = PROCEDURAL_WHY.find((p) => p.match.test(e.message));
    out.push({
      key: `proc-${i}`,
      group: behaviour ? "behaviour" : "procedural",
      title: shortTitle(e.message, 60),
      relatedStepLabel: `Step ${e.stepId}${e.stepTitle ? ` · ${e.stepTitle}` : ""}`,
      whatHappened: e.count > 1 ? `${e.message} (${e.count}×)` : e.message,
      whyItMatters: match?.why ?? PROCEDURAL_WHY_FALLBACK.why,
      correctiveAction: match?.action ?? PROCEDURAL_WHY_FALLBACK.action,
    });
  });

  (report.errorsDetected?.conceptual ?? []).forEach((e, i) => {
    out.push({
      key: `conc-${i}`,
      group: "conceptual",
      title: shortTitle(e.description, 60),
      relatedStepLabel: e.relatedStep != null ? `Step ${e.relatedStep}` : null,
      whatHappened: e.description,
      whyItMatters: "This idea shapes what you expect to see in this kind of experiment.",
      correctiveAction: e.correctionStrategy?.trim() || "Review this concept before a similar practical.",
    });
  });

  return out;
};

// ── Time breakdown (spec §11) ───────────────────────────────────────────────────────────────
export const deriveTimeBreakdown = (report: LabReportType): TimeBreakdownRow[] => {
  const steps = report.stepBreakdown ?? [];
  if (steps.length === 0) return [];
  const maxTime = Math.max(1, ...steps.map((s) => s.timeSpentSeconds || 0));

  return steps.map((s) => {
    const ratio = overRatio(s.timeSpentSeconds, s.expectedTimeSeconds);
    let pace: TimeBreakdownRow["pace"] = null;
    if (ratio !== null) pace = ratio < PACE_THRESHOLDS.fast ? "fast" : ratio <= PACE_THRESHOLDS.slow ? "balanced" : "slow";
    return {
      stepId: s.stepId,
      title: s.title,
      timeSpentSeconds: s.timeSpentSeconds || 0,
      ratio: (s.timeSpentSeconds || 0) / maxTime,
      pace,
    };
  });
};

// ── Everything, once ────────────────────────────────────────────────────────────────────────
export const deriveReportInsights = (report: LabReportType): ReportInsights => {
  const journey = deriveJourney(report);
  const band = getScoreBand(report.score);
  return {
    scoreBand: band,
    performanceMessage: PERFORMANCE_MESSAGE[band],
    understanding: deriveUnderstanding(report),
    quickInsights: deriveQuickInsights(report, journey),
    strongStepCount: journey.filter((j) => j.status === "strong").length,
    journey,
    guidance: deriveGuidance(report),
    challengeInsight: deriveChallengeInsight(report, journey),
    tutorHighlights: deriveTutorHighlights(report, journey),
    tutorSummarySentences: splitSentences(report.aiFeedback?.summary),
    achievements: deriveAchievements(report, journey),
    missions: deriveMissions(report),
    errors: deriveErrors(report),
    timeBreakdown: deriveTimeBreakdown(report),
  };
};
