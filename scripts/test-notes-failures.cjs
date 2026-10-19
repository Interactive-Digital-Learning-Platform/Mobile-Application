const test = require('node:test');
const assert = require('node:assert/strict');
const loader = require('./helpers/notes-test-loader.cjs');

function fixture() {
  const load = loader({ '@clerk/expo': { getClerkInstance: () => ({ loaded: true, session: { getToken: async () => 'private-token' } }) },
    './apiClients': { SERVICE_URLS: { notes: 'https://notes.invalid' } }, 'react-native': { Platform: { OS: 'web' } } });
  const { notesClient } = load('api/notesClients.ts');
  return { load, client: notesClient, ...load('api/notesAPI.ts') };
}
const ok = data => config => Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config });
const validNote = { _id: 'note-1', title: 'Friction', status: 'analyzed', createdAt: '2026-10-19T00:00:00Z', rawText: 'Friction opposes motion.',
  analysis: { subject: 'Science', topic: 'Friction', gradeLevel: 'Grade 10', overallCompleteness: 50 } };

test('backend, session, rate-limit and upload failures are student-safe at the actual Notes client', async () => {
  const { client, notesApi } = fixture();
  for (const [status, pattern] of [[400,/check the details/i],[401,/sign in/i],[403,/account/i],[404,/no longer available/i],
    [409,/already being updated/i],[413,/fewer pages/i],[415,/JPG or PNG/i],[422,/check the details/i],[429,/busy/i],[500,/available right now/i],[502,/available right now/i],[503,/available right now/i],[504,/longer/i]]) {
    client.defaults.adapter = config => Promise.reject({ config, request: { secret: 'private-token' }, response: { status, data: { error: 'GroqException secret-token SQL stack trace' } } });
    await assert.rejects(notesApi.getNote('note-1'), error => {
      assert.match(error.message, pattern); assert.equal(error.response.status, status);
      assert.equal(error.config, undefined); assert.equal(error.request, undefined);
      assert.doesNotMatch(JSON.stringify(error), /GroqException|secret-token|private-token|SQL/);
      return true;
    });
  }
});

test('offline and timeout failures become useful messages; aborted requests remain identifiable', async () => {
  const { client, notesApi, load } = fixture();
  for (const [code, pattern] of [['ERR_NETWORK',/internet connection/i],['ECONNABORTED',/longer/i],['ETIMEDOUT',/longer/i]]) {
    client.defaults.adapter = () => Promise.reject({ code, message: 'internal adapter failure' });
    await assert.rejects(notesApi.getNote('n'), pattern);
  }
  const { normalizeNotesError } = load('utils/noteErrors.ts');
  const cancelled = normalizeNotesError({ code: 'ERR_CANCELED', config: { secret: 'token' } });
  assert.equal(cancelled.code, 'ERR_CANCELED');
  assert.equal(cancelled.config, undefined);
});

test('HTTP 200 failure envelopes cannot pretend an upload, delete or retry succeeded', async () => {
  const { client, notesApi } = fixture();
  client.defaults.adapter = ok({ success: false, error: 'database credentials and stack trace' });
  await assert.rejects(notesApi.deleteNote('n'), /available right now/i);
  await assert.rejects(notesApi.retryAnalysis('n'), /available right now/i);
  await assert.rejects(notesApi.updateNoteContext('n', { subject: 'Science' }), /available right now/i);
});

test('HTML, empty, missing and malformed success bodies never reach note rendering', async () => {
  const { client, notesApi } = fixture();
  for (const data of ['<html>Bad gateway</html>', null, {}, { success: true }, { success: true, data: {} },
    { success: true, data: { ...validNote, title: {} } }, { success: true, data: { ...validNote, analysis: { ...validNote.analysis, missingConcepts: 'bad array' } } }]) {
    client.defaults.adapter = ok(data);
    await assert.rejects(notesApi.getNote('n'), /couldn't load this Notes content/i);
  }
  client.defaults.adapter = ok({ success: true, data: { notes: {} } });
  await assert.rejects(notesApi.getNotes('u'), /couldn't load/i);
  for (const data of [{ success: true }, { success: true, data: {} }]) {
    client.defaults.adapter = ok(data);
    await assert.rejects(notesApi.deleteNote('n'), /couldn't load/i);
    await assert.rejects(notesApi.retryAnalysis('n'), /couldn't load/i);
  }
});

test('valid legacy notes preserve analysis and content; an actual empty list is still successful', async () => {
  const { client, notesApi } = fixture();
  client.defaults.adapter = ok({ success: true, data: validNote });
  const note = (await notesApi.getNote('n')).data;
  assert.equal(note.analysis.overallCompleteness, 50); assert.equal(note.rawText, validNote.rawText);
  assert.ok(Array.isArray(note.analysis.missingConcepts));
  client.defaults.adapter = ok({ success: true, data: { notes: [] } });
  assert.equal((await notesApi.getNotes('u')).data.notes.length, 0);
});

test('malformed flashcards, mind maps, transcripts and polling summaries fail safely', async () => {
  const { client, materialsApi } = fixture();
  for (const data of [{}, { flashcards: 'broken' }, { flashcards: [{ front: {}, back: 'answer' }] }, { mindMap: { label: 'x', children: 'bad' } }, { textContent: {} }, { audioUrl: {} }]) {
    client.defaults.adapter = ok({ success: true, data });
    await assert.rejects(materialsApi.getMaterialByType('n','flashcards'), /couldn't load/i);
  }
  client.defaults.adapter = ok({ success: true, data: { generatedTypes: {}, hasActiveJobs: true } });
  await assert.rejects(materialsApi.getMaterials('n'), /couldn't load/i);
  client.defaults.adapter = ok({ success: true, data: { generatedTypes: [], missingCount: 7, hasActiveJobs: false, states: [] } });
  assert.equal((await materialsApi.getMaterials('n')).data.hasActiveJobs, false);
});

test('schema errors and arbitrary exceptions never leak technical details to the student', () => {
  const { notesErrorMessage } = loader()('utils/noteErrors.ts');
  for (const error of [new Error('SQL password'), { issues: [{ message: 'expected string at token' }] }, 'provider exception', null]) {
    assert.match(notesErrorMessage(error), /available right now/i);
    assert.doesNotMatch(notesErrorMessage(error), /SQL|password|token|provider/i);
  }
});

test('a stalled session lookup terminates before it can leave the Notes screen spinning forever', async () => {
  let deadline, cleared = false;
  const load = loader({ '@clerk/expo': { getClerkInstance: () => ({ loaded: true, session: { getToken: () => new Promise(() => {}) } }) },
    './apiClients': { SERVICE_URLS: { notes: 'https://notes.invalid' } } }, {
    setTimeout(callback, ms) { assert.equal(ms, 8000); deadline = callback; return 1; }, clearTimeout() { cleared = true; },
  });
  const pending = load('api/notesClients.ts').getNotesSessionToken();
  deadline();
  await assert.rejects(pending, /check your session/i);
  assert.equal(cleared, true);
});
