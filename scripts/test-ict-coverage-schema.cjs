const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../schemas/ictCoverageSchemas.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
const loaded = new Module(filename, module); loaded.filename = filename; loaded.paths = Module._nodeModulePaths(path.dirname(filename)); loaded._compile(compiled, filename);
const {ictReviewSchema: schema, parseICTReviewResponse: parseResponse} = loaded.exports;
const fixture = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/data/ictCoverageDemoResponses.json'), 'utf8'));

test('real ICT API fixtures parse with complete, partial, missing and withheld results', () => {
  assert.equal(fixture.synthetic, true);
  assert.deepEqual(fixture.samples.map(s => schema.parse(s.result).prediction.suggestedStatus), ['present', 'partial', 'missing', null, 'present', null]);
});
test('a withheld prediction cannot retain a coverage label', () => {
  const result = structuredClone(fixture.samples[3].result); result.prediction.suggestedStatus = 'present';
  assert.equal(schema.safeParse(result).success, false);
});
test('review and experimental flags cannot be removed or turned into an assessment', () => {
  for (const mutate of [r => r.reviewRequired = false, r => r.experimental = false,
    r => r.prediction.reviewRequired = false, r => r.prediction.scoresCalibrated = true, r => r.mode = 'automatic']) {
    const result = structuredClone(fixture.samples[0].result); mutate(result);
    assert.equal(schema.safeParse(result).success, false);
  }
});
test('quotes that do not align with the analyzed text are rejected', () => {
  const result = structuredClone(fixture.samples[0].result);
  result.prediction.evidence.points[0].semanticCandidateEvidence = 'Unrelated fabricated evidence';
  assert.equal(schema.safeParse(result).success, false);
});

test('a valid response for different text or concept is rejected', () => {
  const sample = fixture.samples[0];
  const response = {success: true, data: sample.result};
  assert.equal(parseResponse(response, {text: sample.text, conceptId: sample.conceptId}).prediction.suggestedStatus, 'present');
  assert.throws(() => parseResponse(response, {text: 'A different submitted note.', conceptId: sample.conceptId}));
  assert.throws(() => parseResponse(response, {text: sample.text, conceptId: 'hist-g10-l01-c01'}));
  assert.throws(() => parseResponse({...response, success: false}, {text: sample.text, conceptId: sample.conceptId}));
});
test('normalization permits declared deletions and rejects malformed markers', () => {
  const sample = fixture.samples[0]; const response = {success: true, data: sample.result};
  assert.equal(parseResponse(response, {text: '<deleted>Obsolete text.</deleted>\n' + sample.text + '\n[crossed out: old heading]', conceptId: sample.conceptId}).analyzedText, sample.text);
  assert.throws(() => parseResponse(response, {text: sample.text + '<deleted>unfinished', conceptId: sample.conceptId}));
});
test('concern quotes, requirement identities and model hashes must also match', () => {
  for (const mutate of [r => r.prediction.evidence.concerns[0].quote = 'Invented conflict',
    r => r.prediction.evidence.points[0].requirement = 'A different requirement',
    r => r.prediction.modelSha256 = '0'.repeat(64)]) {
    const result = structuredClone(fixture.samples[3].result); mutate(result);
    assert.equal(schema.safeParse(result).success, false);
  }
});

test('withholding of raw Partial is allowed without pretending Complete was withheld', () => {
  const result = structuredClone(fixture.samples[3].result); result.prediction.rawModelStatus = 'partial'; result.prediction.completeSuggestionWithheld = false;
  assert.equal(schema.safeParse(result).success, true);
  result.prediction.suggestedStatus = 'partial'; assert.equal(schema.safeParse(result).success, false);
});
test('the old corrupted textbook job cannot be accepted', () => {
  const result = structuredClone(fixture.samples[0].result); result.concept.textbook.jobId = 'fc0e19ef-0642-4911-88ef-39efe2299775';
  assert.equal(schema.safeParse(result).success, false);
});
test('textbook references are bound to the selected concept and verified source', () => {
  const {parseICTReference} = loaded.exports; const concept = fixture.samples[0].result.concept;
  const data = {conceptId: concept.id, source: structuredClone(concept.textbook), passages: [{text: 'Textbook CPU passage', pdfPages: [53]}]};
  assert.equal(parseICTReference({success: true, data}, concept).passages.length, 1);
  const wrong = structuredClone(data); wrong.source.jobId = 'old-job';
  assert.throws(() => parseICTReference({success: true, data: wrong}, concept));
  const outside = structuredClone(data); outside.passages[0].pdfPages = [200];
  assert.throws(() => parseICTReference({success: true, data: outside}, concept));
});
