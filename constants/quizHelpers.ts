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

// The AI generator sometimes writes math as LaTeX (e.g. "\(\sqrt{x}=7\)"),
// which has no renderer in this app — RN's <Text> just shows the raw
// source. Rather than pulling in a WebView + KaTeX/MathJax for content
// that's mostly Grade 10/11 algebra/geometry, this converts the common
// LaTeX constructs into plain Unicode math text instead. Inputs without
// any LaTeX pass through unchanged.
const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "+": "⁺", "-": "⁻", "n": "ⁿ",
};
const SUBSCRIPT_DIGITS: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", "n": "ₙ",
};

function toSuperscript(chars: string): string {
  if (![...chars].every((c) => c in SUPERSCRIPT_DIGITS)) return `^${chars}`;
  return [...chars].map((c) => SUPERSCRIPT_DIGITS[c]).join("");
}

function toSubscript(chars: string): string {
  if (![...chars].every((c) => c in SUBSCRIPT_DIGITS)) return `_${chars}`;
  return [...chars].map((c) => SUBSCRIPT_DIGITS[c]).join("");
}

const LATEX_SYMBOLS: [RegExp, string][] = [
  [/\\times/g, "×"],
  [/\\div/g, "÷"],
  [/\\cdot/g, "×"],
  [/\\pm/g, "±"],
  [/\\leq/g, "≤"],
  [/\\geq/g, "≥"],
  [/\\neq|\\ne\b/g, "≠"],
  [/\\approx/g, "≈"],
  [/\\infty/g, "∞"],
  [/\\pi\b/g, "π"],
  [/\\theta\b/g, "θ"],
  [/\\alpha\b/g, "α"],
  [/\\beta\b/g, "β"],
  [/\\degree|\^\\circ|\\circ/g, "°"],
];

export function formatMathText(text: string): string {
  if (!text || !text.includes("\\")) return text; // fast path: no LaTeX at all

  let out = text;

  // Inline/display math delimiters — just unwrap, no visual distinction needed.
  out = out.replace(/\\\(|\\\)|\\\[|\\\]/g, "");

  // \frac{a}{b} -> a/b (applied before generic brace-stripping below).
  out = out.replace(/\\d?frac\{([^{}]*)\}\{([^{}]*)\}/g, "$1/$2");

  // \sqrt{x} -> √x, \sqrt[n]{x} -> ⁿ√x
  out = out.replace(/\\sqrt\[([^\]]*)\]\{([^{}]*)\}/g, (_m, n, x) => `${toSuperscript(n)}√${x}`);
  out = out.replace(/\\sqrt\{([^{}]*)\}/g, "√$1");

  // Symbols
  for (const [pattern, replacement] of LATEX_SYMBOLS) {
    out = out.replace(pattern, replacement);
  }

  // Superscripts/subscripts: x^{12}, x^2, x_{i}, x_i
  out = out.replace(/\^\{([^{}]+)\}/g, (_m, g) => toSuperscript(g));
  out = out.replace(/\^([0-9a-zA-Z+-])/g, (_m, g) => toSuperscript(g));
  out = out.replace(/_\{([^{}]+)\}/g, (_m, g) => toSubscript(g));
  out = out.replace(/_([0-9n])/g, (_m, g) => toSubscript(g));

  // Generic \command{content} (e.g. \text{cm}, \mathrm{kg}) -> just the content.
  out = out.replace(/\\[a-zA-Z]+\{([^{}]*)\}/g, "$1");

  // Any remaining backslash-commands or stray braces/backslashes -> drop them.
  out = out.replace(/\\[a-zA-Z]+/g, "").replace(/[{}\\]/g, "");

  return out.replace(/\s+/g, " ").trim();
}
