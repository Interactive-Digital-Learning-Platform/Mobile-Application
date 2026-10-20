// Run the actual screen's async callbacks with controlled device/API failures.
const test = require('node:test');
const assert = require('node:assert/strict');
const loader = require('./helpers/notes-test-loader.cjs');

function screen() {
  const slots = []; let cursor = 0;
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ||= { current: initial }; },
  };
  const alerts = [], navigations = [];
  const picker = { MediaTypeOptions: { Images: 'images' }, requestMediaLibraryPermissionsAsync: async () => ({ status: 'granted' }),
    requestCameraPermissionsAsync: async () => ({ status: 'granted' }), launchImageLibraryAsync: async () => ({ canceled: false, assets: [{ uri: 'blob:my-page' }] }),
    launchCameraAsync: async () => ({ canceled: false, assets: [{ uri: 'blob:camera-page' }] }) };
  const api = { uploadNote: async () => { throw new Error('raw provider stack secret-token'); } };
  const native = new Proxy({ StyleSheet: { create: value => value } }, { get: (target, key) => target[key] || key });
  const load = loader({ react: { __esModule: true, default: hooks, ...hooks }, 'react-native': native,
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, 'expo-router': { useRouter: () => ({ replace: path => navigations.push(path), back() {} }) },
    'expo-image-picker': picker, 'lucide-react-native': new Proxy({}, { get: (_, key) => key }), '@clerk/expo': { useAuth: () => ({ userId: 'u' }) },
    '@/api/notesAPI': { notesApi: api, RESEARCH_CONSENT_VERSION: '1' }, '@/constants/colors': { colors: { primary: '#FC6E20' } },
    '@/components/InputField': { __esModule: true, default: 'InputField' },
    'react-native-toast-message': { __esModule: true, default: { show: value => alerts.push(value) } },
  });
  const Upload = load('app/(main)/notes/upload.tsx').default;
  function render() { cursor = 0; return Upload(); }
  function nodes(node) { if (!node || typeof node !== 'object') return []; if (Array.isArray(node)) return node.flatMap(nodes); return [node, ...nodes(node.props?.children)]; }
  function text(node) { if (typeof node === 'string' || typeof node === 'number') return String(node); if (!node || typeof node !== 'object') return ''; return Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children); }
  function button(tree, label) { const result = nodes(tree).find(n => n.type === 'TouchableOpacity' && text(n).includes(label)); assert.ok(result, label); return result; }
  return { picker, api, alerts, navigations, render, nodes, text, button };
}

test('rejected camera and gallery permissions/pickers never escape the Notes event handler', async () => {
  for (const [method, label, message] of [['requestCameraPermissionsAsync','Take Photo',/camera/i],['launchImageLibraryAsync','Choose Gallery',/photos/i]]) {
    const s = screen(); s.picker[method] = async () => { throw Error('native device exception secret-token'); };
    await s.button(s.render(), label).props.onPress();
    assert.match(s.alerts.at(-1).text1, message);
    assert.doesNotMatch(JSON.stringify(s.alerts), /exception|secret-token/);
    assert.equal(s.button(s.render(), label).props.disabled, undefined);
  }
});

test('failed upload releases the button, retains selected photos/title and shows recovery', async () => {
  const s = screen();
  await s.button(s.render(), 'Choose Gallery').props.onPress();
  s.nodes(s.render()).find(n => n.type === 'InputField' && n.props.title === 'Note Title').props.handleChange('Science lesson');
  await s.button(s.render(), 'Upload & Analyze Notes').props.onPress();
  const tree = s.render();
  assert.match(s.text(tree), /available right now/i);
  assert.match(s.text(tree), /check Notes before uploading/i);
  assert.doesNotMatch(s.text(tree), /provider stack|secret-token/);
  assert.equal(s.button(tree, 'Upload & Analyze Notes').props.disabled, false);
  assert.equal(s.nodes(tree).find(n => n.type === 'InputField' && n.props.title === 'Note Title').props.value, 'Science lesson');
  assert.ok(s.nodes(tree).some(n => n.type === 'Image' && n.props.source?.uri === 'blob:my-page'));
  assert.equal(s.navigations.length, 0);
});

test('successful upload navigates back once and displays no failure', async () => {
  const s = screen(); s.api.uploadNote = async () => ({ success: true, data: { noteId: 'new', status: 'processing' } });
  await s.button(s.render(), 'Choose Gallery').props.onPress();
  s.nodes(s.render()).find(n => n.type === 'InputField' && n.props.title === 'Note Title').props.handleChange('Science');
  await s.button(s.render(), 'Upload & Analyze Notes').props.onPress();
  assert.deepEqual(s.navigations, ['/(tabs)/notes']);
  assert.equal(s.alerts.at(-1).type, 'success');
});
