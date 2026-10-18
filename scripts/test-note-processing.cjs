const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../utils/noteProcessing.ts'),'utf8');
const context = {exports:{}};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const {processingSummary,processingGroups,elapsedSeconds}=context.exports;
const progress=(stage,extra={})=>({stage,completedStages:[],totalPages:5,startedAt:'2026-10-15T00:00:00Z',updatedAt:'2026-10-15T00:00:00Z',...extra});

test('legacy jobs do not invent stages or a completion estimate',()=>{
  assert.equal(processingSummary(),'Analysis in progress');
  assert.ok(processingGroups().every(g=>!g.done&&!g.active));
});
test('long OCR stays on the actual page even beyond the former 32-second estimate',()=>{
  const p=progress('ocr_extraction',{currentPage:2});
  assert.equal(processingSummary(p),'Reading handwriting · page 2 of 5');
  const groups=processingGroups(p);
  assert.equal(groups[0].active,true);
  assert.ok(groups.every(g=>!g.done));
  assert.equal(elapsedSeconds(p.startedAt,Date.parse(p.startedAt)+209000),209);
});
test('only completed backend stages receive completion marks',()=>{
  const p=progress('subject_detection',{completedStages:['ocr_extraction','ocr_cleaning','note_scope_assessment','language_detection']});
  const groups=processingGroups(p);
  assert.equal(groups[0].done,true);
  assert.equal(groups[1].active,true);
  assert.equal(groups[1].done,false);
  assert.equal(groups[2].done,false);
});
test('OCR page counts are not shown for later stages or invalid page numbers',()=>{
  assert.equal(processingSummary(progress('quality_verification',{currentPage:5})),'Checking analysis quality');
  assert.equal(processingSummary(progress('ocr_extraction',{currentPage:6})),'Reading handwriting');
});
test('unknown stages and malformed dates have safe fallbacks',()=>{
  assert.equal(processingSummary(progress('future_stage')),'Analysis in progress');
  assert.equal(elapsedSeconds('not-a-date'),0);
  assert.equal(elapsedSeconds('2026-10-15T00:00:00Z',0),0);
});
