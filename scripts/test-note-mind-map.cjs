const test = require("node:test");
const assert = require("node:assert/strict");
const { prepareMindMap, searchMindMap, mindMapNodes } =
  require("./helpers/notes-test-loader.cjs")()("utils/noteMindMap.ts");

const lesson = {
  label: "Life processes",
  children: [
    {
      label: "Nutrition",
      children: [
        { label: "Plants make glucose using light energy" },
        { label: "Animals obtain food" },
      ],
    },
    { label: "Transport", children: [{ label: "Water moves through xylem" }] },
  ],
};

test("saved maps preserve full labels and stable branch identities", () => {
  const { root, simplified } = prepareMindMap(lesson);
  assert.equal(simplified, false);
  assert.equal(mindMapNodes(root).length, 6);
  assert.equal(
    root.children[0].children[0].label,
    lesson.children[0].children[0].label,
  );
  const filtered = searchMindMap(root, "  XYLeM  ");
  assert.equal(filtered.children.length, 1);
  assert.equal(filtered.children[0].id, root.children[1].id);
  assert.equal(
    filtered.children[0].children[0].label,
    "Water moves through xylem",
  );
  assert.equal(root.children.length, 2);
});

test("search retains a matching branch and its facts, clears to the original tree and handles no matches", () => {
  const { root } = prepareMindMap(lesson);
  assert.equal(searchMindMap(root, "nutrition").children[0].children.length, 2);
  assert.equal(searchMindMap(root, ""), root);
  assert.equal(searchMindMap(root, "Life processes"), root);
  assert.equal(searchMindMap(root, "not present"), null);
});

test("invalid AI nodes cannot crash the viewer or discard valid sibling branches", () => {
  const { root, simplified } = prepareMindMap({
    label: "Lesson",
    children: [
      null,
      { label: "" },
      { label: "Valid", children: "wrong type" },
      { label: "Other" },
    ],
  });
  assert.equal(simplified, true);
  assert.equal(root.children.length, 2);
  assert.equal(root.children[0].id, "root.2");
  assert.equal(root.children[0].children.length, 0);
  for (const input of [null, [], "text", {}, { label: 4 }])
    assert.equal(prepareMindMap(input).root, null);
});

test("cyclic, excessively deep and oversized trees remain bounded with an explicit simplified flag", () => {
  const cycle = { label: "Cycle" };
  cycle.children = [cycle];
  const cyclic = prepareMindMap(cycle);
  assert.equal(cyclic.simplified, true);
  assert.equal(mindMapNodes(cyclic.root).length, 1);
  const deep = { label: "Root" };
  let cursor = deep;
  for (let i = 0; i < 30; i++) {
    cursor.children = [{ label: "Level " + i }];
    cursor = cursor.children[0];
  }
  const bounded = prepareMindMap(deep);
  assert.equal(bounded.simplified, true);
  assert.equal(mindMapNodes(bounded.root).length, 9);
  const wide = prepareMindMap({
    label: "Root",
    children: Array.from({ length: 400 }, (_, i) => ({ label: "Topic " + i })),
  });
  assert.equal(wide.simplified, true);
  assert.equal(mindMapNodes(wide.root).length, 200);
});
