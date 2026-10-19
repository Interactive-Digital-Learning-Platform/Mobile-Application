const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(relative, replacements = {}) {
  const filename = path.resolve(__dirname,relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const loaded = new Module(filename,module); loaded.filename=filename; loaded.paths=Module._nodeModulePaths(path.dirname(filename));
  loaded.require = name => replacements[name] ?? Module.prototype.require.call(loaded,name);
  loaded._compile(compiled,filename); return loaded.exports;
}
const schema = load('../schemas/englishCoverageSchemas.ts');
const {scienceModelStatus, savedScienceVersion, isScienceNote} = load('../utils/scienceModelStatus.ts',{'../schemas/englishCoverageSchemas':schema});
const fixtures = JSON.parse(fs.readFileSync(path.resolve(__dirname,'../assets/data/englishCoverageDemo.json'),'utf8'));
const skipped = reason => ({state:'skipped',reason,reviewRequired:true,checkedAt:'2026-10-16T00:00:00Z',suggestions:[]});

test('every skip reason has a visible explanation and an existing Notes action', () => {
  const reasons = {disabled:'coverage',language:'text',ocr_quality:'photos',lesson_scope:'lesson',unsupported_concepts:'coverage'};
  for(const [reason,action] of Object.entries(reasons)) {
    const view = scienceModelStatus(skipped(reason));
    assert.equal(view.kind,'notice'); assert.equal(view.action,action); assert.ok(view.title); assert.ok(view.message);
    assert.equal(view.check,undefined);
  }
});
test('unsupported topics do not become missing-concept predictions or promise a retry', () => {
  const input = {...skipped('unsupported_concepts'), suggestions:fixtures.samples[0].check.suggestions};
  const view = scienceModelStatus(input);
  assert.match(view.title,/Not available for this topic/); assert.match(view.message,/isn't covered/);
  assert.equal(view.kind,'notice'); assert.equal(view.check,undefined); assert.equal(view.action,'coverage');
  assert.doesNotMatch(view.message,/try again|retry|missing/i);
});
test('runtime failures stay separate from skipped topics and keep saved note analysis usable', () => {
  const view = scienceModelStatus({...skipped('runtime'),state:'unavailable'});
  assert.equal(view.kind,'notice'); assert.match(view.title,/unavailable/); assert.match(view.message,/couldn't finish/);
  assert.match(view.message,/note coverage and study tools/); assert.equal(view.action,'coverage');
});
test('old notes without a check do not acquire an invented reason or result', () => {
  for(const check of [undefined,null]) {
    const view = scienceModelStatus(check); assert.equal(view.title,'No saved model check');
    assert.equal(view.kind,'notice'); assert.equal(view.check,undefined);
    assert.doesNotMatch(view.message,/unsupported|unreadable|missing concept/i);
  }
});
test('invalid saved data is not shown as a model prediction', () => {
  for(const check of [{}, {...fixtures.samples[0].check, reviewRequired:false}, {...skipped('ocr_quality'),reason:'unknown_internal_detail'}]) {
    const view = scienceModelStatus(check); assert.equal(view.kind,'notice'); assert.equal(view.title,'Saved check unavailable');
    assert.equal(view.check,undefined);
  }
});
test('validated saved complete, partial, missing and withheld suggestions retain their result and identity', () => {
  for(const sample of fixtures.samples) {
    const original = structuredClone(sample.check); const view = scienceModelStatus(original);
    assert.equal(view.kind,'ready'); assert.deepEqual(view.check,schema.englishCoverageCheckSchema.parse(original));
    assert.deepEqual(original,sample.check);
  }
  const withheld = structuredClone(fixtures.samples[0].check);
  withheld.suggestions[0].prediction.suggestedStatus=null; withheld.suggestions[0].prediction.completeSuggestionWithheld=true;
  assert.equal(scienceModelStatus(withheld).check.suggestions[0].prediction.suggestedStatus,null);
});
test('the Science notice stays out of History, ICT, Geography and Computer Science notes', () => {
  assert.equal(isScienceNote('Science'),true); assert.equal(isScienceNote(' science '),true);
  assert.equal(isScienceNote('Unknown','Science'),true);
  for(const subject of ['History','ICT','Geography','Computer Science','Unknown',undefined]) assert.equal(isScienceNote(subject),false);
});
test('saved model versions are displayed without silently relabeling older or unknown results', () => {
  assert.equal(savedScienceVersion('english-coverage-v3.4-review-fix-2026-10-18'),'v3.4');
  assert.equal(savedScienceVersion('english-coverage-v3.3-evidence-fix-2026-10-18'),'v3.3');
  assert.equal(savedScienceVersion('english-coverage-v3.2-student-notes-2026-10-18'),'v3.2');
  assert.equal(savedScienceVersion('english-coverage-v3.1-2026-10-08'),'v3.1');
  assert.equal(savedScienceVersion('english-coverage-v3-2026-10-07'),'v3');
  assert.equal(savedScienceVersion('future-model-v4'),'future-model-v4');
  assert.equal(savedScienceVersion(), 'Version not recorded');
});
