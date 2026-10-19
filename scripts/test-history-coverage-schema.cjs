const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../schemas/historyCoverageSchemas.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
const loaded = new Module(filename, module); loaded.filename = filename; loaded.paths = Module._nodeModulePaths(path.dirname(filename)); loaded._compile(compiled, filename);
const {historyReviewSchema: schema, parseHistoryReviewResponse: parseResponse} = loaded.exports;
const fixture = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/data/historyCoverageDemoResponses.json'), 'utf8'));
const savedSchema = loaded.exports.historySavedCheckSchema;
const savedInput = {text:fixture.samples[0].text,conceptId:fixture.samples[0].conceptId,language:'English',scopeConfirmed:true};

test('saved History jobs restore valid input and ready evidence across navigation',()=>{
  for(const state of ['running','failed'])assert.equal(savedSchema.safeParse({state,input:savedInput}).success,true);
  assert.equal(savedSchema.safeParse({state:'ready',input:savedInput,result:fixture.samples[0].result}).success,true);
  for(const state of ['stale','not_requested'])assert.equal(savedSchema.safeParse({state}).success,true);
});
test('saved History jobs reject stale results, mismatched text and malformed deletion markers',()=>{
  for(const state of ['running','failed','stale','not_requested'])assert.equal(savedSchema.safeParse({state,input:savedInput,result:fixture.samples[0].result}).success,false);
  for(const text of ['Different note text','<deleted>unclosed'])assert.equal(savedSchema.safeParse({state:'ready',input:{...savedInput,text},result:fixture.samples[0].result}).success,false);
  for(const state of ['running','failed','ready'])assert.equal(savedSchema.safeParse({state}).success,false);
});

test('real History API fixtures parse with complete, partial, missing and withheld results', () => {
  assert.equal(fixture.synthetic, true);
  assert.deepEqual(fixture.samples.map(s => schema.parse(s.result).prediction.suggestedStatus), ['present', 'partial', 'missing', null]);
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
