export type NoteConceptStatus = "present" | "partial" | "missing";
export interface NoteCoverageConcept {
  id: string;
  name: string;
  status: NoteConceptStatus;
}
interface CoverageInput {
  conceptFindings?: { conceptId: string; conceptName: string; status?: NoteConceptStatus; found: boolean }[];
  keyConcepts?: string[];
  partialConcepts?: string[];
  missingConcepts?: string[];
}

/** Findings are authoritative. Legacy name lists are used only when findings
 * are absent; merging them would double-count partial concepts on older notes. */
export function buildNoteCoverage(analysis?: CoverageInput) {
  let concepts: NoteCoverageConcept[];
  if (analysis?.conceptFindings?.length) {
    concepts = analysis.conceptFindings.map(finding => ({
      id: finding.conceptId,
      name: finding.conceptName,
      status: finding.status ?? (finding.found ? "present" : "missing"),
    }));
  } else {
    const legacy = new Map<string, NoteCoverageConcept>();
    const add = (names: string[] | undefined, status: NoteConceptStatus) => {
      for (const raw of names ?? []) {
        const name = raw.trim();
        if (!name) continue;
        const key = name.toLowerCase();
        legacy.set(key, { id: `legacy:${key}`, name, status });
      }
    };
    add(analysis?.keyConcepts, "present");
    add(analysis?.missingConcepts, "missing");
    // An explicitly recorded partial concept must not become covered or missing.
    add(analysis?.partialConcepts, "partial");
    concepts = [...legacy.values()];
  }
  return {
    concepts,
    covered: concepts.filter(concept => concept.status === "present"),
    partial: concepts.filter(concept => concept.status === "partial"),
    missing: concepts.filter(concept => concept.status === "missing"),
    total: concepts.length,
  };
}
export type NoteCoverageBreakdown = ReturnType<typeof buildNoteCoverage>;
