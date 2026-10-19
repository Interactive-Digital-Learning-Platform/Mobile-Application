const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const cache=new Map();
function load(file) {
  const filename=path.resolve(__dirname,file);
  if(cache.has(filename))return cache.get(filename).exports;
  const mod=new Module(filename,module);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));cache.set(filename,mod);
  mod.require=name=>{
    if(name.startsWith('.')) {
      const target=path.resolve(path.dirname(filename),name)+'.ts';
      if(fs.existsSync(target))return load(target);
    }
    return Module.prototype.require.call(mod,name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,filename);
  return mod.exports;
}
const {scienceChecklist,buildScienceChecklist,buildHistoryChecklist,sortChecklist,checklistNextSteps}=load('../utils/noteConceptChecklist.ts');
const science=require('../assets/data/englishCoverageDemo.json').samples;
const history=require('../assets/data/historyCoverageDemoResponses.json').samples;
const copy=x=>JSON.parse(JSON.stringify(x));
function saved(sample,changes={}) {
  const check=copy(sample.check);
  return {state:'ready',input:{text:sample.noteText,conceptId:check.suggestions[0].conceptId,language:'English',scopeConfirmed:true},
    result:{analyzedText:sample.noteText,check},...changes};
}

test('real complete, partial and missing fixtures retain their labels and expose useful next steps',()=>{
  for(const sample of science) {
    const concepts=scienceChecklist(sample.check,sample.noteText);assert.equal(concepts.length,sample.check.suggestions.length);
    assert.equal(concepts[0].status,sample.check.suggestions[0].prediction.suggestedStatus);
    const next=checklistNextSteps(concepts[0]);
    if(concepts[0].status==='present')assert.equal(next.kind,'complete');else assert.ok(next.points.length);
  }
});
test('missing/disabled/unsupported or corrupt checks never create a missing concept',()=>{
  for(const check of [undefined,null,{}, {...science[0].check,state:'skipped',suggestions:[],reason:'unsupported_concepts'}])
    assert.equal(scienceChecklist(check,science[0].noteText).length,0);
});
test('evidence from another OCR snapshot is not shown as current note coverage',()=>{
  assert.equal(scienceChecklist(science[0].check,'A completely different note.').length,0);
  const check=copy(science[0].check);check.suggestions[0].prediction.evidence.points[0].end=999999;
  assert.equal(scienceChecklist(check,science[0].noteText).length,0);
});
test('mixed model versions are rejected rather than relabelled as the current model',()=>{
  const check=copy(science[0].check);check.modelVersion='another-version';
  assert.equal(scienceChecklist(check,science[0].noteText).length,0);
});
test('a newer same-text check replaces only its own concept and preserves curriculum mapping',()=>{
  const a=copy(science[0]);a.check.checkedAt='2026-10-10T00:00:00Z';
  const canonical=a.check.suggestions[0].conceptId;a.check.suggestions[0].modelConceptId=canonical;
  a.check.suggestions[0].conceptId='curriculum-original';
  const s=saved(science[0]);s.result.check.checkedAt='2026-10-18T00:00:00Z';
  const result=buildScienceChecklist(a.check,s,a.noteText);
  assert.equal(result.length,1);assert.equal(result[0].curriculumId,'curriculum-original');assert.equal(result[0].checkedAt,'2026-10-18T00:00:00Z');
});
test('an edited practice draft cannot make the original upload complete',()=>{
  const original=science[2];const practice=saved(science[0]);
  const result=buildScienceChecklist(original.check,practice,original.noteText);
  assert.equal(result.length,1);assert.equal(result[0].status,'missing');
});
test('stale and running results do not replace saved automatic coverage',()=>{
  for(const state of ['running','stale','failed']) {
    const result=buildScienceChecklist(science[0].check,{...saved(science[0]),state},science[0].noteText);
    assert.equal(result.length,1);assert.equal(result[0].checkedAt,science[0].check.checkedAt);
  }
});
test('withheld suggestions remain review-needed, never complete or missing',()=>{
  const sample=copy(science[0]);const p=sample.check.suggestions[0].prediction;p.suggestedStatus=null;p.completeSuggestionWithheld=true;
  const [result]=scienceChecklist(sample.check,sample.noteText);assert.equal(result.status,'review');
});
test('conflicts are visible recommendations, not silently marked complete',()=>{
  const [result]=scienceChecklist(science[0].check,science[0].noteText);
  result.status='partial';result.concerns=['A red precipitate means no sugar.'];
  const next=checklistNextSteps(result);assert.equal(next.kind,'concern');assert.deepEqual(next.points,result.concerns);
});
test('real saved History results remain usable without invented per-point completeness',()=>{
  for(const sample of history) {
    const result=sample.result;
    const view=buildHistoryChecklist({state:'ready',input:{text:sample.text,conceptId:sample.conceptId,language:'English',scopeConfirmed:true},result},sample.text);
    assert.equal(view.length,1);assert.equal(view[0].status,result.prediction.suggestedStatus??'review');
    assert.ok(view[0].points.every(p=>p.state==='review'));
    assert.equal(buildHistoryChecklist({state:'ready',input:{text:sample.text,conceptId:sample.conceptId,language:'English',scopeConfirmed:true},result},'Other text').length,0);
  }
});
test('sorting prioritizes review/additions without mutating results or lesson scores',()=>{
  const concepts=['present','partial','missing','review'].map((status,i)=>({id:String(i),status}));
  assert.deepEqual(sortChecklist(concepts).map(c=>c.status),['review','missing','partial','present']);
  assert.equal(concepts[0].status,'present');
});
