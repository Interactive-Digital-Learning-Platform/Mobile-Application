const test = require("node:test");
const assert = require("node:assert/strict");
const { readPodcastCues, activePodcastCue, podcastParagraphs } =
  require("./helpers/notes-test-loader.cjs")()(
    "utils/notePodcastTranscript.ts",
  );
const text = "Heat water.\n\nAdd sugar.";
const timings = [
  { start: 0.2, end: 0.7, startOffset: 0, endOffset: 4 },
  { start: 0.8, end: 1.4, startOffset: 5, endOffset: 11 },
  { start: 2, end: 2.4, startOffset: 13, endOffset: 16 },
  { start: 2.5, end: 3, startOffset: 17, endOffset: 23 },
];

test("highlight follows recorded time including pauses, paragraph gaps and seeks in either direction", () => {
  const cues = readPodcastCues(timings, text);
  assert.equal(cues.length, 4);
  for (const [position, expected] of [
    [0, -1],
    [0.2, 0],
    [0.69, 0],
    [0.7, -1],
    [0.8, 1],
    [1.8, -1],
    [2.1, 2],
    [2.9, 3],
    [0.3, 0],
    [2.6, 3],
    [3, -1],
    [NaN, -1],
  ]) {
    assert.equal(activePodcastCue(cues, position), expected);
  }
});

test("old or malformed timing metadata safely uses a plain transcript", () => {
  for (const invalid of [
    undefined,
    null,
    [],
    {},
    timings.slice(1),
    [{ ...timings[0], end: NaN }, ...timings.slice(1)],
    [{ ...timings[0], end: -1 }, ...timings.slice(1)],
    [{ ...timings[0], startOffset: 1 }, ...timings.slice(1)],
    [timings[0], { ...timings[1], start: 0.1 }, ...timings.slice(2)],
  ])
    assert.equal(readPodcastCues(invalid, text).length, 0);
  assert.equal(readPodcastCues(timings, "A different transcript").length, 0);
});

test("paragraph layout preserves original word offsets, repeated text and Unicode", () => {
  const value = "Heat water.\n\nHeat water.\n\nAdd 😀 sugar.";
  const paragraphs = podcastParagraphs(value);
  assert.deepEqual(
    Array.from(paragraphs, (part) => part.offset),
    [0, 13, 26],
  );
  for (const part of paragraphs)
    assert.equal(
      value.slice(part.offset, part.offset + part.text.length),
      part.text,
    );
  assert.equal(podcastParagraphs("  \n\n  ").length, 0);
});
