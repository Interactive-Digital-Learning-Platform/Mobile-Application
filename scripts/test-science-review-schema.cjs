const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
function load(filename){
 const mod=new Module(filename,module);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));
 mod.require=name=>name.startsWith('.')?load(path.resolve(path.dirname(filename),name+'.ts')):Module.prototype.require.call(mod,name);
 mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,filename);return mod.exports;
}
const {scienceSavedCheckSchema:schema}=load(path.resolve(__dirname,'../schemas/scienceReviewSchemas.ts'));
const sample=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../assets/data/englishCoverageDemo.json'))).samples[0];
const input={text:sample.noteText,conceptId:sample.check.suggestions[0].conceptId,language:'English',scopeConfirmed:true};
const ready={state:'ready',input,result:{analyzedText:input.text,check:sample.check}};
test('saved focused Science result parses real frozen-model evidence',()=>assert.equal(schema.safeParse(ready).success,true));
test('wrong reviewed text, wrong concept and fabricated evidence cannot become a displayed result',()=>{
 for(const mutate of [s=>s.result.analyzedText='Other text',s=>s.input.conceptId='other',s=>s.result.check.suggestions[0].prediction.evidence.points[0].candidateEvidence='Invented quotation']){
  const saved=structuredClone(ready);mutate(saved);assert.equal(schema.safeParse(saved).success,false);
 }
});
test('unfinished, failed and stale jobs cannot carry a ready result',()=>{
 for(const state of ['running','failed','stale','not_requested'])assert.equal(schema.safeParse({...ready,state}).success,false);
 for(const state of ['running','failed'])assert.equal(schema.safeParse({state,input}).success,true);
});
