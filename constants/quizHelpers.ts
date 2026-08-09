export const OPTION_LABELS = ["A", "B", "C", "D"] as const;

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function progressLabel(
  progress: number,
  questions: number
): string {
  if (progress === 0)   return "Not started";
  if (progress === 100) return "Completed";
  const done = Math.round((progress / 100) * questions);
  return `${done}/${questions} completed`;
}

const TEST_SUBJECT_MARKERS = ["[CC-TEST]", "[RANDOM-LESSON-TEST]"];

// Requires BOTH a dev build AND explicit opt-in, not just the env var alone —
// EXPO_PUBLIC_* values get baked into every build including production, so a
// stray .env value in a teammate's dev build can't accidentally leak test
// subjects into a production build.
export const SHOW_TEST_SUBJECTS =
  __DEV__ && process.env.EXPO_PUBLIC_SHOW_TEST_SUBJECTS === "true";

export function isTestSubject(subject: string): boolean {
  return TEST_SUBJECT_MARKERS.some((marker) => subject.includes(marker));
}

export function filterTestSubjects<T extends { subject: string | null }>(
  items: T[]
): T[] {
  if (SHOW_TEST_SUBJECTS) return items;
  return items.filter((item) => !item.subject || !isTestSubject(item.subject));
}

export function filterTestSubjectNames(names: string[]): string[] {
  if (SHOW_TEST_SUBJECTS) return names;
  return names.filter((name) => !isTestSubject(name));
}
