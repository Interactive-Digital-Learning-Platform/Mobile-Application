export interface StudySection {
  id: number;
  heading: string;
  body: string;
  rawBody: string;
  isRemediatedGap: boolean;
  isFromNotes: boolean;
  isAnswer: boolean;
  noteCoverage?: "present" | "partial" | "missing" | "unchecked";
}

export const studyHeadingKey = (value: string) => value.toLowerCase().replace(/^#+\s*/, "").replace(/[*_`]/g, "").replace(/\s+/g, " ").trim();

// Smart typography turns science symbols such as (R) and (C) into trademarks.
export const NOTE_MARKDOWN_OPTIONS = { typographer: false, html: false, linkify: false };

function readableEquations(value: string): string {
  let fence: string | undefined;
  return value.split("\n").map(line => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined;
      return line;
    }
    if (fence) return line;
    return line.split(/(`+[^`]*`+)/g).map(part => part.startsWith('`') ? part : part.replace(/\$([^$\n]{1,120})\$/g, (original, equation: string) => {
      if (/[\\{}]/.test(equation) || !/[\p{L}]/u.test(equation) || (!/[=+×÷≤≥]/.test(equation) && !/^[\p{L}]$/u.test(equation.trim()))) return original;
      return '`' + equation.trim() + '`';
    })).join("");
  }).join("\n");
}

/** Preserve code fences, mathematical symbols and hidden focus anchors. Headings
 * inside a formula/code block must not split the lesson or move its diagrams. */
export function parseStudyGuide(markdown: string): StudySection[] {
  const chunks: string[] = [];
  let lines: string[] = [], fence: string | undefined;
  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined;
    }
    // A full-lesson concept is one highlighted reading section, including its
    // subheadings. Otherwise only the empty parent would carry the upload label.
    const insideConcept = lines.some(part => /<!--\s*note-coverage:/.test(part));
    const conceptSubheading = insideConcept && /^#{3,6}\s+/.test(line);
    if (!fence && !conceptSubheading && /^#{1,6}\s+/.test(line) && lines.join("\n").replace(/<!--[\s\S]*?-->/g, "").trim()) {
      chunks.push(lines.join("\n")); lines = [];
    }
    lines.push(line);
  }
  if (lines.some(line => line.trim())) chunks.push(lines.join("\n"));
  // Some saved generations repeat a title as ## and immediately as ###.
  // Merge the empty parent so its illustration appears once beside the content.
  const merged: string[] = [];
  for (const chunk of chunks) {
    const previous = merged[merged.length - 1];
    const previousLines = previous?.trim().split("\n");
    if (previousLines?.length === 1 && /^#{1,6}\s/.test(previousLines[0]) &&
      studyHeadingKey(previousLines[0]) === studyHeadingKey(chunk.trim().split("\n")[0])) {
      merged[merged.length - 1] = `${previous.trim()}\n${chunk.trim().split("\n").slice(1).join("\n")}`;
    } else merged.push(chunk);
  }
  const expanded: { body: string; answer?: boolean }[] = [];
  for (const chunk of merged) {
    const heading = chunk.trim().split("\n")[0];
    // Older saved guides can put Q1/A1 together. Only split unambiguous,
    // numbered self-check pairs; ordinary examples elsewhere stay untouched.
    if (/self[\s\-‑–]?check/i.test(heading)) {
      const plain = chunk.replace(/\*\*/g, "");
      const pattern = /\bQ(\d+)\s*:\s*([\s\S]*?)\bA\1\s*:\s*([\s\S]*?)(?=\bQ\d+\s*:|$)/g;
      const pairs = [...plain.matchAll(pattern)];
      if (pairs.length && pairs.length === (plain.match(/\bQ\d+\s*:/g)?.length ?? 0)) {
        const intro = plain.slice(0, pairs[0].index);
        expanded.push({ body: `${intro}\n${pairs.map(pair => `${pair[1]}. ${pair[2].trim()}`).join("\n\n")}` });
        expanded.push({ body: `## Answers\n\n${pairs.map(pair => `${pair[1]}. ${pair[3].trim()}`).join("\n\n")}`, answer: true });
        continue;
      }
    }
    expanded.push({ body: chunk });
  }
  return expanded.map(({ body: rawBody, answer }, id) => {
    const visible = rawBody.replace(/<!--[\s\S]*?-->/g, "").trim();
    const body = readableEquations(visible);
    const heading = visible.split("\n")[0].replace(/^#+\s*/, "").trim();
    const cleanHeading = studyHeadingKey(heading).replace(/[‑–]/g, "-");
    const coverage = rawBody.match(/<!--\s*note-coverage:(present|partial|missing|unchecked)\s*-->/)?.[1] as StudySection["noteCoverage"];
    return { id, heading, body, rawBody, noteCoverage: coverage,
      isRemediatedGap: /(?:Remediated|Identified) Learning Gap/.test(rawBody),
      isFromNotes: rawBody.includes("From Your Handwritten Notes"),
      isAnswer: !!answer || /^(?:\d+[.)]?\s*)?(?:answers?|answer key|self[-\s]?check answers?|solutions?)(?:\s|$|:)/i.test(cleanHeading),
    };
  });
}
