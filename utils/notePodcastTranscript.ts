export interface PodcastCue {
  start: number;
  end: number;
  startOffset: number;
  endOffset: number;
}

/** Never display guessed timings or timings from a different transcript. */
export function readPodcastCues(value: unknown, text: string): PodcastCue[] {
  if (!Array.isArray(value) || !value.length || value.length > 500) return [];
  const words = Array.from(text.matchAll(/\S+/gu));
  if (words.length !== value.length) return [];
  const cues: PodcastCue[] = [];
  for (let i = 0; i < words.length; i++) {
    const cue = value[i];
    if (
      !cue ||
      typeof cue !== "object" ||
      !Number.isFinite(cue.start) ||
      !Number.isFinite(cue.end) ||
      cue.start < 0 ||
      cue.end <= cue.start ||
      cue.end > 3600 ||
      (i > 0 && cue.start < cues[i - 1].start) ||
      cue.startOffset !== words[i].index ||
      cue.endOffset !== words[i].index + words[i][0].length
    )
      return [];
    cues.push({
      start: cue.start,
      end: cue.end,
      startOffset: cue.startOffset,
      endOffset: cue.endOffset,
    });
  }
  return cues;
}

export function activePodcastCue(cues: PodcastCue[], position: number): number {
  if (!Number.isFinite(position) || position < 0) return -1;
  let low = 0,
    high = cues.length - 1,
    found = -1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    if (cues[middle].start <= position) {
      found = middle;
      low = middle + 1;
    } else high = middle - 1;
  }
  return found >= 0 && position < cues[found].end ? found : -1;
}

export function podcastParagraphs(
  text: string,
): { text: string; offset: number }[] {
  let cursor = 0;
  return text.split(/\n\s*\n/).flatMap((part) => {
    const offset = text.indexOf(part, cursor);
    cursor = offset + part.length;
    return part.trim() ? [{ text: part, offset }] : [];
  });
}
