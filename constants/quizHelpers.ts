/**
 * quizHelpers.ts
 * ─────────────────────────────────────────────────────────────────────
 * Shared pure-utility functions and constants used across quiz screens
 * and components.  Import from here instead of re-declaring locally.
 */

/** A, B, C, D option labels for multiple-choice questions */
export const OPTION_LABELS = ["A", "B", "C", "D"] as const;

/**
 * Capitalizes the first letter, lowercases the rest.
 * @example capitalize("EASY") → "Easy"
 */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Formats a seconds value as MM:SS.
 * @example formatTime(125) → "02:05"
 */
export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * Returns a human-readable progress label.
 * @example progressLabel(7, 10, 70) → "7/10 completed"
 */
export function progressLabel(
  progress: number,
  questions: number
): string {
  if (progress === 0)   return "Not started";
  if (progress === 100) return "Completed";
  const done = Math.round((progress / 100) * questions);
  return `${done}/${questions} completed`;
}

// ─── Test-subject filtering ────────────────────────────────────────────────
//
// The backend occasionally has subjects created purely for test/dev
// purposes (e.g. seeded during automated testing or ad-hoc backend
// verification), tagged with a marker in their name. These should never be
// visible to real users — only shown when BOTH running in a development
// build AND explicitly opted in via EXPO_PUBLIC_SHOW_TEST_SUBJECTS, so a
// stray `.env` value in a teammate's dev build can't accidentally leak them
// to a production build (EXPO_PUBLIC_* vars get baked into every build,
// __DEV__ does not).

const TEST_SUBJECT_MARKERS = ["[CC-TEST]", "[RANDOM-LESSON-TEST]"];

export const SHOW_TEST_SUBJECTS =
  __DEV__ && process.env.EXPO_PUBLIC_SHOW_TEST_SUBJECTS === "true";

/** True if this subject name is a test/dev-only fixture. */
export function isTestSubject(subject: string): boolean {
  return TEST_SUBJECT_MARKERS.some((marker) => subject.includes(marker));
}

/**
 * Filters test subjects out of any array of objects with a `subject` field
 * (SubjectAnalytics[], Recommendation[] with a non-null subject, etc.),
 * unless SHOW_TEST_SUBJECTS is enabled.
 */
export function filterTestSubjects<T extends { subject: string | null }>(
  items: T[]
): T[] {
  if (SHOW_TEST_SUBJECTS) return items;
  return items.filter((item) => !item.subject || !isTestSubject(item.subject));
}

/** Same as filterTestSubjects, for plain subject-name string arrays
 * (e.g. strong_subjects/weak_subjects). */
export function filterTestSubjectNames(names: string[]): string[] {
  if (SHOW_TEST_SUBJECTS) return names;
  return names.filter((name) => !isTestSubject(name));
}
