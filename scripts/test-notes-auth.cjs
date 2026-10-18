const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function clientModule() {
  const clients = [];
  const axios = {create(defaults) {
    const client = {defaults, interceptors: {request: {use(fn) {client.authorize = fn;}}, response: {use(_resolve, reject) {client.reject = reject;}}}};
    clients.push(client); return client;
  }};
  const clerk = {loaded: true, session: null};
  const context = {exports: {}, process: {env: {EXPO_PUBLIC_API_GATEWAY_URL: 'https://gateway.example'}},
    Promise, URL, setTimeout: callback => {callback(); return 0;}, require(name) {
      if (name === 'axios') return axios;
      if (name === '@clerk/expo') return {getClerkInstance: () => clerk};
      if (name === './apiClients') return {SERVICE_URLS: {notes: 'https://gateway.example/api/notes'}};
      throw new Error('Unexpected dependency: ' + name);
    }};
  const source = fs.readFileSync(path.join(__dirname, '../api/notesClients.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, context);
  context.exports.setClerkTokenGetter = getter => {clerk.session = {getToken: getter};};
  return context.exports;
}

test('Notes JSON and private assets both send the current session, refreshed for each request', async () => {
  const api = clientModule(); let n = 0;
  api.setClerkTokenGetter(async () => `session-${++n}`);
  for (const client of [api.notesClient, api.notesAssetsClient]) {
    const request = await client.authorize({url: '/notes', baseURL: client.defaults.baseURL, headers: {}});
    assert.match(request.headers.Authorization, /^Bearer session-\d$/);
  }
  assert.equal(n, 2);
});

test('signed-out or failed session lookup never sends an anonymous Notes request', async () => {
  const api = clientModule(); const client = api.notesClient;
  await assert.rejects(client.authorize({url: '/notes', baseURL: client.defaults.baseURL, headers: {}}), /sign in/i);
  api.setClerkTokenGetter(async () => null);
  await assert.rejects(api.getNotesSessionToken(), /sign in/i);
  api.setClerkTokenGetter(async () => {throw new Error('session offline');});
  await assert.rejects(api.getNotesSessionToken(), /offline/);
});

test('an absolute or overridden asset address cannot receive a session token', async () => {
  const api = clientModule(); let calls = 0;
  api.setClerkTokenGetter(async () => {calls++; return 'private';});
  for (const client of [api.notesClient, api.notesAssetsClient]) {
    for (const url of ['https://evil.example/photo', '//evil.example/photo', '\\\\evil.example/photo', 'data:text/plain,example', '/photo\n']) {
      await assert.rejects(client.authorize({url, baseURL: client.defaults.baseURL, headers: {}}), /Invalid/);
    }
    await assert.rejects(client.authorize({url: '/notes', baseURL: 'https://evil.example', headers: {}}), /Invalid/);
  }
  assert.equal(calls, 0);
});

test('logged Notes errors retain useful status but discard bearer-bearing request objects', async () => {
  const api = clientModule();
  for (const client of [api.notesClient, api.notesAssetsClient]) {
    const failure = {message: 'Request failed', config: {headers: {Authorization: 'Bearer private-secret'}}, request: {private: 'private-secret'}, response: {status: 401, data: {error: 'Please sign in'}, config: {headers: {Authorization: 'Bearer private-secret'}}}};
    await assert.rejects(client.reject(failure), error => {
      assert.equal(error.message, 'Please sign in'); assert.equal(error.response.status, 401);
      assert.equal(error.config, undefined); assert.equal(error.request, undefined);
      assert.ok(!JSON.stringify(error).includes('private-secret'));
      return true;
    });
  }
});
