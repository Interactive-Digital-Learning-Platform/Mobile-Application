const test = require('node:test');
const assert = require('node:assert/strict');
const loader = require('./helpers/notes-test-loader.cjs');
const tick = () => new Promise(resolve => setImmediate(resolve));

test('native private-asset download timeout cancels work and exposes retry instead of endless loading', async () => {
  const slots = []; let cursor = 0, effect, deadline, cancelled = 0, removed = 0, cleared = false;
  const hooks = { useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial;
    return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useCallback: fn => fn, useEffect: fn => { effect = fn; } };
  const fs = { cacheDirectory: 'cache/', createDownloadResumable: () => ({ downloadAsync: () => new Promise(() => {}), cancelAsync: async () => { cancelled++; } }),
    deleteAsync: async () => { removed++; } };
  const load = loader({ react: hooks, 'react-native': { Platform: { OS: 'android' } }, '@clerk/expo': { useAuth: () => ({ userId: 'u' }) },
    'expo-file-system/legacy': fs, '@/api/notesClients': { getNotesResourceUrl: path => 'https://notes.invalid' + path, getNotesSessionToken: async () => 'private-token' } },
    { setTimeout(callback, ms) { assert.equal(ms, 15000); deadline = callback; return 1; }, clearTimeout() { cleared = true; } });
  const useAsset = load('hooks/use-notes-asset.ts').useNotesAsset;
  cursor = 0; useAsset('/uploads/page.jpg'); const cleanup = effect(); await tick();
  deadline(); await tick();
  cursor = 0; const state = useAsset('/uploads/page.jpg');
  assert.equal(state.error, true); assert.equal(state.uri, null);
  assert.equal(cancelled, 1); assert.ok(removed > 0); assert.equal(cleared, true);
  assert.equal(typeof state.retry, 'function'); cleanup(); await tick();
});

test('an image decoding error displays a friendly retry action', () => {
  const slots = []; let cursor = 0, retries = 0;
  const hooks = { useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial;
    return [slots[i], next => { slots[i] = next; }]; } };
  const load = loader({ react: { __esModule: true, default: hooks, ...hooks },
    'react-native': { Image: 'Image', View: 'View', Text: 'Text', TouchableOpacity: 'Button', ActivityIndicator: 'Spinner' },
    '@/hooks/use-notes-asset': { useNotesAsset: () => ({ uri: 'blob:unreadable', error: false, retry: () => { retries++; } }) },
    '@/constants/colors': { colors: { primary: '#FC6E20' } } });
  const Image = load('components/notes/PrivateNoteImage.tsx').default;
  const render = () => { cursor = 0; return Image({ path: '/uploads/page.jpg' }); };
  render().props.onError({});
  const fallback = render();
  const fragment = fallback.props.children;
  const retry = fragment.props.children.find(node => node.type === 'Button');
  assert.ok(retry); retry.props.onPress(); assert.equal(retries, 1);
  assert.equal(render().type, 'Image');
});
