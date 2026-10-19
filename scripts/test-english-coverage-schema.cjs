const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const filename=path.resolve(__dirname,'../schemas/englishCoverageSchemas.ts');
const compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const loaded=new Module(filename,module);loaded.filename=filename;loaded.paths=Module._nodeModulePaths(path.dirname(filename));loaded._compile(compiled,filename);
const {englishCoverageCheckSchema:schema}=loaded.exports;
const fixture=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../assets/data/englishCoverageDemo.json'),'utf8'));
test('real model fixtures parse with complete, partial and missing suggestions',()=>{
 assert.equal(fixture.synthetic,true);const labels=fixture.samples.map(s=>schema.parse(s.check).suggestions[0].prediction.suggestedStatus);
 assert.deepEqual(labels,['present','partial','missing']);
});
test('invalid data and an automatic assessment contract are rejected',()=>{
 assert.equal(schema.safeParse(undefined).success,false);
 const check=structuredClone(fixture.samples[0].check);check.reviewRequired=false;
 assert.equal(schema.safeParse(check).success,false);
 check.reviewRequired=true;check.suggestions[0].prediction.reviewRequired=false;
 assert.equal(schema.safeParse(check).success,false);
});
test('withheld suggestions cannot carry a complete label',()=>{
 const check=structuredClone(fixture.samples[0].check);check.suggestions[0].prediction.completeSuggestionWithheld=true;
 assert.equal(schema.safeParse(check).success,false);
 check.suggestions[0].prediction.suggestedStatus=null;assert.equal(schema.safeParse(check).success,true);
});
test('unavailable checks parse but empty ready checks are rejected',()=>{
 const check=structuredClone(fixture.samples[0].check);check.suggestions=[];
 assert.equal(schema.safeParse(check).success,false);
 check.state='unavailable';check.reason='runtime';assert.equal(schema.safeParse(check).success,true);
});
