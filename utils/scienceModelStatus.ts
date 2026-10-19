import { englishCoverageCheckSchema, EnglishCoverageCheck } from "../schemas/englishCoverageSchemas";

export type ScienceCheckAction = "lesson" | "photos" | "text" | "coverage";
type Notice = { kind: "notice"; title: string; message: string; action: ScienceCheckAction };
type Presentation = Notice | { kind: "ready"; check: EnglishCoverageCheck };

export function isScienceNote(subject?: string, userSubject?: string) {
  return /^science$/i.test(subject?.trim() ?? "") || /^science$/i.test(userSubject?.trim() ?? "");
}

/** Only validated saved predictions can become suggestions. No skip or missing
 * record is interpreted as a prediction about the student's understanding. */
export function scienceModelStatus(check: unknown): Presentation {
  if (check === undefined || check === null) return {
    kind: "notice", title: "No saved model check",
    message: "No trained-model check was saved for this note. You can still use its note coverage and study tools.", action: "coverage",
  };
  const parsed = englishCoverageCheckSchema.safeParse(check);
  if (!parsed.success) return {
    kind: "notice", title: "Saved check unavailable",
    message: "We couldn't read this saved model check safely. Your note coverage and study tools are still available.", action: "coverage",
  };
  const data = parsed.data;
  if (data.state === "ready") return { kind: "ready", check: data };
  // An unavailable result never promises that a retry will produce a label.
  if (data.state === "unavailable") return {
    kind: "notice", title: "Model check unavailable",
    message: "The trained check couldn't finish this time. You can still use your note coverage and study tools.", action: "coverage",
  };
  switch (data.reason) {
    case "unsupported_concepts": return {
      kind: "notice", title: "Not available for this topic",
      message: "This lesson isn't covered by our trained Science model yet. It currently supports a limited set of English concepts.", action: "coverage",
    };
    case "ocr_quality": return {
      kind: "notice", title: "Clearer or shorter notes needed",
      message: "Some text couldn't be checked reliably. Review your photos, then try clearer photos or fewer pages in a new upload.", action: "photos",
    };
    case "language": return {
      kind: "notice", title: "English text needed",
      message: "This trained model checks English notes. The extracted text wasn't confidently identified as English.", action: "text",
    };
    case "lesson_scope": return {
      kind: "notice", title: "Confirm the lesson",
      message: "We couldn't confidently match this note to a lesson. Check the subject, grade and topic before using the trained check.", action: "lesson",
    };
    case "disabled": return {
      kind: "notice", title: "Model check is switched off",
      message: "The trained Science check isn't enabled right now. Your note coverage and study tools are still available.", action: "coverage",
    };
    default: return {
      kind: "notice", title: "Model check not completed",
      message: "No trained-model suggestion is available for this saved analysis. You can still use your note coverage and study tools.", action: "coverage",
    };
  }
}

export function savedScienceVersion(version?: string) {
  if (version?.startsWith("english-coverage-v3.4-")) return "v3.4";
  if (version?.startsWith("english-coverage-v3.3-")) return "v3.3";
  if (version?.startsWith("english-coverage-v3.2-")) return "v3.2";
  if (version?.startsWith("english-coverage-v3.1-")) return "v3.1";
  if (version?.startsWith("english-coverage-v3-")) return "v3";
  return version || "Version not recorded";
}
