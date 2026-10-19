const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const context = {exports: {}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../utils/noteStudyGuide.ts'), 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText, context);
const {parseStudyGuide, studyHeadingKey} = context.exports;

test('coverage markers highlight partial and missing upload concepts without exposing technical comments', () => {
  for (const status of ['present', 'partial', 'missing', 'unchecked']) {
    const section = parseStudyGuide(`## Friction\n<!-- note-coverage:${status} -->\nA full textbook explanation.`)[0];
    assert.equal(section.noteCoverage, status);
    assert.doesNotMatch(section.body, /note-coverage|<!--/);
  }
  assert.equal(parseStudyGuide('## Legacy\nOlder study guide.')[0].noteCoverage, undefined);
});

test('full lesson concept subheadings stay inside their highlighted reading section', () => {
  const sections = parseStudyGuide('## 1. Friction\n<!-- note-coverage:partial -->\n### Definition\nOpposes relative motion.\n### Example\nA source-based example.\n## 2. Motion\n<!-- note-coverage:missing -->\n### Definition\nThe next concept.');
  assert.equal(sections.length, 2);
  assert.equal(sections[0].noteCoverage, 'partial');
  assert.match(sections[0].body, /### Example/);
  assert.equal(sections[1].noteCoverage, 'missing');
});
test('the note renderer preserves parenthesized science symbols instead of trademark substitutions', () => {
  const md = require('markdown-it')(context.exports.NOTE_MARKDOWN_OPTIONS);
  const rendered = md.render('Normal reaction (R), carbon (C), and F ≤ μN.');
  assert.match(rendered,/\(R\)/); assert.match(rendered,/\(C\)/); assert.match(rendered,/≤/);
  assert.doesNotMatch(rendered,/[®©]/);
});
test('simple inline equations are readable while currency and literal code are preserved', () => {
  const section = parseStudyGuide('## Forces\nNormal reaction $R$ equals weight: $R = W$.\nCosts are $10 and $20.\n```text\n$R = W$\n```')[0];
  assert.match(section.body,/`R`/); assert.match(section.body,/`R = W`/);
  assert.match(section.body,/\$10 and \$20/); assert.match(section.body,/```text\n\$R = W\$/);
});

test('hides technical anchors while retaining them for focused section navigation', () => {
  const sections = parseStudyGuide('# Lesson\nIntro.\n\n## Friction\n<!-- anchor:gap-science-5 -->\nOpposes relative motion.');
  assert.equal(sections.length, 2);
  assert.match(sections[1].rawBody, /gap-science-5/);
  assert.doesNotMatch(sections[1].body, /anchor:|<!--/);
});
test('separate answer sections are recognised without hiding the questions', () => {
  const sections = parseStudyGuide('# Friction\n## Self-check\n1. What does friction oppose?\n## Answers\n1. Relative motion.');
  assert.equal(sections[1].isAnswer, false);
  assert.equal(sections[2].isAnswer, true);
  assert.match(sections[1].body, /What/);
});
test('old inline Q1/A1 guides separate every question from its answer', () => {
  const sections = parseStudyGuide('# Test\n## Self-Check\n**Q1:** What is added? **A1:** Benedict solution.\n\n**Q2:** How is it heated? **A2:** A water bath.');
  const questions = sections.find(section => /Self-Check/.test(section.heading));
  const answers = sections.find(section => section.isAnswer);
  assert.match(questions.body, /What is added/); assert.match(questions.body, /How is it heated/);
  assert.doesNotMatch(questions.body, /Benedict solution|A water bath/);
  assert.match(answers.body, /Benedict solution/); assert.match(answers.body, /A water bath/);
});
test('ordinary examples containing answer-like labels stay readable', () => {
  const sections = parseStudyGuide('## Example\nQ1: Applied force? A1: 10 N.');
  assert.equal(sections.length, 1); assert.equal(sections[0].isAnswer, false);
});
test('headings inside code fences do not split the lesson; formula symbols survive', () => {
  const sections = parseStudyGuide('# Formula\n```text\n## not a section\nF ≤ μN\n```\n## Explanation\nFriction opposes relative motion.');
  assert.equal(sections.length, 2); assert.match(sections[0].body, /## not a section/); assert.match(sections[0].body, /≤/);
});
test('decorated headings match visual attachment headings', () => {
  const sections = parseStudyGuide('# Lesson\n## **Observed results**\nCompare measurements.');
  assert.equal(studyHeadingKey(sections[1].heading), studyHeadingKey('Observed results'));
});
test('an anchor before the first heading does not create an empty section', () => {
  const sections = parseStudyGuide('<!-- anchor:gap-5 -->\n## Friction\nA resisting force.');
  assert.equal(sections.length, 1); assert.equal(sections[0].heading, 'Friction');
  assert.match(sections[0].rawBody, /anchor:gap-5/);
});
test('duplicate parent/subheadings are merged so a visual is shown once beside the explanation', () => {
  const sections = parseStudyGuide('# Friction\n## Types of Friction\n### Types of Friction\nStatic, limiting and dynamic friction.');
  assert.equal(sections.length, 2);
  assert.equal(sections[1].heading, 'Types of Friction');
  assert.match(sections[1].body, /Static, limiting and dynamic/);
  assert.equal((sections[1].body.match(/Types of Friction/g) || []).length, 1);
});
