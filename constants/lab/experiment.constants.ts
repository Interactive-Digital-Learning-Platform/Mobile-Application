import { Atom, Beaker, Droplets, FlaskConical, GitCompare, Leaf, TestTubes, Wind, Zap, type LucideIcon } from "lucide-react-native";

export const LAB_SUBJECTS = [
  {
    key: "Chemistry",
    label: "Chemistry Laboratory",
    // Short, student-facing name for the Lab dashboard's "Explore Laboratories" cards — `label`
    // stays the full "… Laboratory" heading used by app/(tabs)/lab/practicals.tsx.
    shortLabel: "Chemistry",
    description: "Experiment with reactions, substances and measurements.",
    Icon: FlaskConical,
    color: "#4FA8F7",
    available: true,
    unitLabel: "practicals",
  },
  // Biology's first feature is the Concept Visualization module (interactive 2D animations), not
  // the equipment/chemical bench flow the other two subjects use — see app/(tabs)/lab/biology/
  // and its own catalog/count fetched via useBiologyVisualizations, not useExperimentsBySubject.
  {
    key: "Biology",
    label: "Biology Laboratory",
    shortLabel: "Biology",
    description: "Explore life processes through interactive visualizations.",
    Icon: Leaf,
    color: "#7CB342",
    available: true,
    unitLabel: "visualizations",
  },
  {
    key: "Physics",
    label: "Physics Laboratory",
    shortLabel: "Physics",
    description: "Investigate forces, motion, electricity and measurements.",
    Icon: Zap,
    color: "#F7A94F",
    available: true,
    unitLabel: "practicals",
  },
];

// Turns a grade list (e.g. [8, 9, 10]) into a natural label ("Grades 8–10"). A single grade
// reads "Grade 10"; an empty/missing list yields "".
export const formatGradeRange = (grades: number[] | undefined | null): string => {
  if (!grades?.length) return "";
  const sorted = [...grades].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  return min === max ? `Grade ${min}` : `Grades ${min}–${max}`;
};

// Topic-aware icon for a practical card — keyed off its syllabus `lesson` (falling back to the
// title), so the catalog doesn't show the same flask for every experiment. Falls back to the
// flask when nothing matches. Reuses lucide icons already bundled — no new asset dependency.
const TOPIC_ICONS: { match: RegExp; Icon: LucideIcon }[] = [
  { match: /neutrali[sz]ation/i, Icon: Droplets },
  { match: /acid|base|salt|indicator|\bp?H\b/i, Icon: TestTubes },
  { match: /metal|reactivity|displacement/i, Icon: GitCompare },
  { match: /gas|combustion|limewater/i, Icon: Wind },
  { match: /titrat/i, Icon: FlaskConical },
  { match: /filtrat|separat|mixture|distill/i, Icon: Beaker },
  { match: /electrolysis|electro|\bion/i, Icon: Atom },
];

export const experimentIcon = (e: { title?: string; lesson?: string | null }): LucideIcon => {
  const haystack = `${e.lesson ?? ""} ${e.title ?? ""}`;
  return TOPIC_ICONS.find((t) => t.match.test(haystack))?.Icon ?? FlaskConical;
};

// Grade label spanning a whole subject's catalog — the union of every item's `grades`, so the Lab
// dashboard's subject cards report the real curriculum coverage instead of a hard-coded range.
// Yields "" until the catalog has loaded, letting callers drop the clause rather than guess.
export const gradeRangeAcross = (items: { grades?: number[] }[] | undefined | null): string =>
  formatGradeRange((items ?? []).flatMap((item) => item.grades ?? []));
