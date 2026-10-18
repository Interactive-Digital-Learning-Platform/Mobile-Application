const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const context = {exports: {}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../utils/noteCoverage.ts'), 'utf8'),
  {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText, context);
const {buildNoteCoverage} = context.exports;
const finding = (id, status, found = status !== 'missing') => ({conceptId:id, conceptName:id, status, found});

test('six-concept regression: partial concept appears once and all counts sum to six', () => {
  const analysis = {conceptFindings: [finding('a','present'), finding('b','present'), finding('c','present'), finding('d','present'), finding('e','partial'), finding('f','missing')],
    keyConcepts:['a','b','c','d'], missingConcepts:['f'], coverageScores:{foundConcepts:5,totalConcepts:6},overallCompleteness:76};
  const result = buildNoteCoverage(analysis);
  assert.equal(result.covered.length,4); assert.equal(result.partial.length,1); assert.equal(result.missing.length,1);
  assert.equal(result.total,6); assert.equal(result.partial[0].id,'e');
  assert.equal(result.covered.length + result.partial.length + result.missing.length, result.total);
  assert.equal(analysis.overallCompleteness,76); assert.equal(analysis.coverageScores.foundConcepts,5);
});
test('explicit three-class statuses take precedence over the legacy found flag and stale name lists', () => {
  const result = buildNoteCoverage({conceptFindings:[finding('partial','partial',false),finding('missing','missing',true)],
    keyConcepts:['partial','stale extra'], partialConcepts:['stale partial'],missingConcepts:['missing']});
  assert.equal(result.total,2); assert.equal(result.covered.length,0); assert.equal(result.partial[0].name,'partial');
  assert.equal(result.missing.length,1);
});
test('older findings without statuses retain their saved found/not-found distinction', () => {
  const result = buildNoteCoverage({conceptFindings:[finding('yes',undefined,true),finding('no',undefined,false)]});
  assert.equal(result.total,2); assert.equal(result.covered.length,1); assert.equal(result.partial.length,0); assert.equal(result.missing.length,1);
});
test('name-list fallback includes partial coverage without duplicating overlapping legacy names', () => {
  const result = buildNoteCoverage({conceptFindings:[],keyConcepts:['Covered','Partial','Covered'],partialConcepts:[' Partial ',''],missingConcepts:['Missing','PARTIAL']});
  assert.equal(result.total,3); assert.equal(result.covered.length,1); assert.equal(result.partial.length,1); assert.equal(result.missing.length,1);
});
test('legacy binary name lists and empty notes remain readable', () => {
  const result = buildNoteCoverage({keyConcepts:['a'],missingConcepts:['b']});
  assert.equal(result.total,2); assert.equal(result.partial.length,0);
  assert.equal(buildNoteCoverage().total,0);
  assert.equal(buildNoteCoverage({conceptFindings:[],keyConcepts:[],missingConcepts:[]}).total,0);
});
test('all-missing and all-partial notes do not acquire a false covered concept', () => {
  for (const status of ['missing','partial']) {
    const result = buildNoteCoverage({conceptFindings:[finding('a',status),finding('b',status)]});
    assert.equal(result.total,2); assert.equal(result.covered.length,0);
    assert.equal(result[status].length,2);
  }
});
test('different curriculum IDs with the same display name stay separate', () => {
  const result = buildNoteCoverage({conceptFindings:[{...finding('a','present'),conceptName:'Shared label'}, {...finding('b','partial'),conceptName:'Shared label'}]});
  assert.equal(result.total,2); assert.equal(result.covered.length,1); assert.equal(result.partial.length,1);
});
