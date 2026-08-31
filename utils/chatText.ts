/**
 * The assistant model (`openai/gpt-oss-120b`) interleaves inline citation markers
 * into its reply text — e.g. `【source 1†L1-L4】`, `【4:0†source】`, or `[source 2]`.
 * We surface citations through the dedicated "View sources" link instead, so these
 * markers should never be shown inside the message body.
 *
 * Only bracketed spans are removed: the CJK lenticular brackets `【 】` are never
 * used in normal English/Sinhala prose here, and square-bracket spans are removed
 * only when they actually mention "source", so ordinary text is left untouched.
 */
export function stripInlineCitations(text: string): string {
  if (!text) return text;

  return text
    // 【 ... 】 citation markers (fully received)
    .replace(/【[^【】]*】/g, "")
    // a 【 ... citation marker that is still streaming in (no closing 】 yet)
    .replace(/【[^【】]*(?:source|†)[^【】]*$/i, "")
    // [source N] / [source: file.pdf] square-bracket markers
    .replace(/\[[^[\]]*\bsource\b[^[\]]*\]/gi, "")
    // tidy whitespace left behind by the removed markers
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([.,;:!?])/g, "$1")
    .replace(/[ \t]+\n/g, "\n");
}
