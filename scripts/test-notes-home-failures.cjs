const test = require('node:test');
const assert = require('node:assert/strict');
const loader = require('./helpers/notes-test-loader.cjs');
const tick = () => new Promise(resolve => setImmediate(resolve));
const note = { _id: 'saved-note', title: 'My Science lesson', status: 'processing', createdAt: '2026-10-19T00:00:00Z' };

// Render the real Notes home callbacks through its real Axios client, without a
// device or backend. Failures must become UI state, never console/LogBox errors.
function screen() {
  const slots = [], effects = [], logs = [], timers = new Map();
  let cursor = 0, focused = true, activeListener, nextTimer = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  function memo(factory, deps) {
    const i = cursor++;
    if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { value: factory(), deps };
    return slots[i].value;
  }
  function effect(fn, deps) {
    const i = cursor++;
    if (!slots[i] || !same(slots[i].deps, deps)) {
      const previous = slots[i];
      const slot = slots[i] = { deps };
      effects.push(() => { previous?.cleanup?.(); slot.cleanup = fn(); });
    }
  }
  const hooks = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef(initial) { return memo(() => ({ current: initial }), []); },
    useMemo: memo, useCallback: (fn, deps) => memo(() => fn, deps), useEffect: effect,
  };
  const native = new Proxy({
    Platform: { OS: 'ios' }, StyleSheet: { create: value => value },
    StatusBar: Object.assign('StatusBar', { setBarStyle() {} }),
    AppState: { currentState: 'active', addEventListener(_event, fn) { activeListener = fn; return { remove() {} }; } },
  }, { get: (target, key) => target[key] || key });
  const load = loader({
    react: { __esModule: true, default: hooks, ...hooks }, 'react-native': native,
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-router': { useRouter: () => ({ push() {} }), useFocusEffect: fn => effect(() => focused ? fn() : undefined, [focused, fn]) },
    '@react-navigation/native': { useIsFocused: () => focused },
    '@clerk/expo': { useAuth: () => ({ userId: 'student' }), useUser: () => ({ user: { firstName: 'Student' } }),
      getClerkInstance: () => ({ loaded: true, session: { getToken: async () => 'private-token' } }) },
    './apiClients': { SERVICE_URLS: { notes: 'https://notes.invalid' } },
    'expo-linear-gradient': { LinearGradient: 'Gradient' },
    'lucide-react-native': new Proxy({}, { get: (_, key) => key }),
    'react-native-svg': new Proxy({ __esModule: true, default: 'Svg' }, { get: (target, key) => target[key] || key }),
    'react-native-toast-message': { __esModule: true, default: { show: value => logs.push(value) } },
  }, { console: { error: (...args) => logs.push(args), warn: (...args) => logs.push(args) },
    setInterval(fn) { timers.set(++nextTimer, fn); return nextTimer; }, clearInterval(id) { timers.delete(id); } });
  const client = load('api/notesClients.ts').notesClient;
  const api = { request: async () => ({ notes: [] }) };
  let noteCalls = 0;
  client.defaults.adapter = async config => {
    let data;
    if (config.url.startsWith('/notes?')) { noteCalls++; data = await api.request(config.signal); }
    else data = config.url.endsWith('/gaps') ? { gaps: [] } : { exists: false, totalNotesAnalyzed: 0, subjectMastery: [], recentSessions: [] };
    return { config, status: 200, statusText: 'OK', headers: {}, data: { success: true, data } };
  };
  const Home = load('screens/NotesHome.tsx').default;
  const render = () => { cursor = 0; const tree = Home(); effects.splice(0).forEach(fn => fn()); return tree; };
  const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : !node || typeof node !== 'object' ? '' : Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children);
  const list = tree => nodes(tree).find(node => node.type === 'FlatList');
  const empty = tree => { const component = list(tree)?.props.ListEmptyComponent; return component?.type(component.props); };
  const retry = tree => nodes(tree).find(node => node.type === 'TouchableOpacity' && /Try again/.test(text(node)));
  return { api, logs, timers, render, nodes, text, list, empty, retry, calls: () => noteCalls,
    focus(value) { focused = value; }, background() { activeListener('background'); }, foreground() { activeListener('active'); } };
}

test('list HTTP 404/503, offline and timeout failures show recovery without a raw error or false empty account', async () => {
  for (const failure of [{ response: { status: 404 } }, { response: { status: 503 } }, { code: 'ERR_NETWORK' }, { code: 'ECONNABORTED' }]) {
    const s = screen();
    s.api.request = async () => { throw { ...failure, message: 'Request failed with status code 404', config: { secret: 'private-token' } }; };
    s.render(); await tick();
    const tree = s.render(), empty = s.empty(tree), message = s.text(empty);
    assert.match(message, /couldn't load/i);
    assert.match(message, /available right now|internet connection|longer than usual/i);
    assert.doesNotMatch(message, /status code|private-token|no handwritten notes|no longer available/i);
    assert.ok(s.retry(empty)); assert.equal(s.retry(empty).props.disabled, false);
    assert.equal(s.calls(), 1); assert.equal(s.timers.size, 0);
    assert.equal(s.logs.length, 0);
  }
});

test('retry recovers the feed, and a later outage preserves loaded notes and stops background polling', async () => {
  const s = screen(); s.api.request = async () => { throw { response: { status: 503 } }; };
  s.render(); await tick();
  let tree = s.render();
  s.api.request = async () => ({ notes: [note] });
  s.retry(s.empty(tree)).props.onPress(); await tick();
  tree = s.render();
  assert.equal(s.list(tree).props.data[0].title, note.title);
  assert.equal(s.timers.size, 1);
  s.api.request = async () => { throw { response: { status: 502 } }; };
  await s.list(tree).props.refreshControl.props.onRefresh();
  tree = s.render();
  assert.match(s.text(tree), /previously loaded notes are still shown/i);
  assert.equal(s.list(tree).props.data[0].title, note.title);
  assert.equal(s.timers.size, 0); assert.equal(s.logs.length, 0);
});

test('leaving or backgrounding aborts pending requests and ignores late failures; reopening recovers', async () => {
  for (const leave of [s => s.focus(false), s => s.background()]) {
    const s = screen(); let reject, signal;
    s.api.request = input => { signal = input; return new Promise((_, fail) => { reject = fail; }); };
    s.render(); await tick(); assert.equal(signal.aborted, false);
    leave(s); s.render(); assert.equal(signal.aborted, true);
    reject({ response: { status: 500 }, message: 'raw server error' }); await tick();
    assert.equal(s.logs.length, 0);
    assert.doesNotMatch(s.text(s.render()), /raw server error|couldn't load/i);
    s.api.request = async () => ({ notes: [note] });
    s.focus(true); s.foreground(); s.render(); await tick();
    assert.equal(s.list(s.render()).props.data[0].title, note.title);
    assert.equal(s.calls(), 2);
  }
});

test('retry taps coalesce while a request is pending', async () => {
  const s = screen(); s.api.request = async () => { throw { response: { status: 503 } }; };
  s.render(); await tick();
  const retry = s.retry(s.empty(s.render())); let resolve;
  s.api.request = () => new Promise(done => { resolve = done; });
  retry.props.onPress(); retry.props.onPress(); await tick();
  assert.equal(s.calls(), 2);
  const pending = s.empty(s.render());
  assert.match(s.text(pending), /Trying again/);
  assert.ok(s.nodes(pending).some(node => node.type === 'TouchableOpacity' && node.props.disabled));
  resolve({ notes: [] }); await tick();
  assert.match(s.text(s.empty(s.render())), /No handwritten notes yet/);
});
