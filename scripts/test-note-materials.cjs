const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const context = {exports: {}, setTimeout, clearTimeout, AbortController};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../utils/noteMaterials.ts'), 'utf8'),
  {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, context);
const {createMaterialPoller, materialLabel} = context.exports;
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture(request, extra = {}) {
  const tasks = new Map(); let id = 0; const updates = [], stops = [];
  const poller = createMaterialPoller({request, onUpdate: value => updates.push(value), onStop: reason => stops.push(reason),
    schedule: callback => {tasks.set(++id, callback); return id;}, cancel: id => tasks.delete(id), ...extra});
  const next = async () => { const [id, task] = tasks.entries().next().value; tasks.delete(id); task(); await tick(); };
  return {poller, tasks, updates, stops, next};
}
test('one ready summary and six optional materials cause a single fetch, then stop', async () => {
  let calls = 0;
  const f = fixture(async () => {calls++; return {generatedTypes: ['revision_summary'], missingCount: 6, hasActiveJobs: false};});
  f.poller.refresh(); await tick(); assert.equal(calls, 1); assert.equal(f.tasks.size, 0); assert.equal(f.stops[0], 'idle');
});
test('queued and generating jobs poll, terminal failure and completion stop', async () => {
  for (const terminal of ['ready', 'failed']) {
    const values = [true, true, false];
    const f = fixture(async () => ({hasActiveJobs: values.shift(), states: [{status: terminal}]}));
    f.poller.refresh(); await tick(); await f.next(); await f.next();
    assert.equal(f.updates.length, 3); assert.equal(f.tasks.size, 0); assert.equal(f.stops[0], 'idle');
  }
});
test('network/auth failures stop automatically; explicit refresh can recover', async () => {
  let failed = true;
  const f = fixture(async () => {if(failed) throw Error('401 or offline'); return {hasActiveJobs: false};});
  f.poller.refresh(); await tick(); assert.equal(f.tasks.size, 0); assert.equal(f.stops[0], 'error');
  failed = false; f.poller.refresh(); await tick(); assert.equal(f.stops[1], 'idle');
});
test('refreshes during a slow request coalesce into one follow-up without overlap', async () => {
  let resolve, calls = 0;
  const f = fixture(() => {calls++; return new Promise(r => resolve = r);});
  f.poller.refresh(); f.poller.refresh(); f.poller.refresh(); assert.equal(calls, 1);
  resolve({hasActiveJobs: false}); await tick(); assert.equal(f.tasks.size, 1);
  await f.next(); assert.equal(calls, 2); resolve({hasActiveJobs: false}); await tick();
  assert.equal(f.tasks.size, 0);
});
test('persistent active jobs pause at the session limit and allow a fresh manual check', async () => {
  let now = 0;
  const f = fixture(async () => ({hasActiveJobs: true}), {now: () => now, maxMs: 100});
  f.poller.refresh(); await tick(); now = 101; await f.next();
  assert.equal(f.stops[0], 'paused'); assert.equal(f.tasks.size, 0);
  f.poller.refresh(); await tick(); assert.equal(f.tasks.size, 1); f.poller.stop();
});
test('leaving, backgrounding or switching notes aborts work and ignores stale responses', async () => {
  let resolve, signal;
  const f = fixture(s => {signal = s; return new Promise(r => resolve = r);});
  f.poller.refresh(); f.poller.stop(); assert.equal(signal.aborted, true);
  resolve({hasActiveJobs: true}); await tick(); assert.equal(f.updates.length, 0); assert.equal(f.tasks.size, 0);
});
test('labels distinguish optional, queued, running and failed tools, keeping old content usable', () => {
  assert.equal(materialLabel('not_requested', false), 'Tap to create');
  assert.match(materialLabel('queued', false), /Waiting/);
  assert.match(materialLabel('generating', false), /Creating/);
  assert.match(materialLabel('failed', false), /retry/);
  assert.match(materialLabel('failed', true), /Previous version ready/);
});
