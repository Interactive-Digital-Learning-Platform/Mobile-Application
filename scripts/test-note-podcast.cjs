const test = require("node:test");
const assert = require("node:assert/strict");
const loader = require("./helpers/notes-test-loader.cjs");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const tick = () => new Promise((resolve) => setImmediate(resolve));

// Exercise the installed native inline-style resolver, which drops callback
// styles. React Native itself is mocked; no device or class-name rules are needed.
function nativeInlineStyle(style) {
  const root = path.dirname(
    require.resolve("react-native-css-interop/package.json"),
  );
  const modules = {
    react: {
      useContext: () => ({}),
      useState: (value) => [value, () => {}],
      useMemo: (fn) => fn(),
      useEffect() {},
      useReducer: (_reducer, arg, init) => [init(arg), () => {}],
    },
    "react-native": { View: "View" },
    "../../shared": require(path.join(root, "dist/shared.js")),
    "../observable": { cleanupEffect() {} },
    "./conditions": {},
    "./globals": {},
    "./render-component": {
      UpgradeState: { NONE: 0 },
      renderComponent: (_component, _state, props, resolved) => ({
        ...props,
        ...resolved,
      }),
    },
    "./resolve-value": {
      getTarget: (props, config) =>
        config.target.reduce((value, key) => value?.[key], props),
    },
    "./styles": { getOpaqueStyles: (value) => [value] },
  };
  const context = {
    exports: {},
    require(name) {
      if (!(name in modules))
        throw Error("Unexpected resolver dependency " + name);
      return modules[name];
    },
  };
  vm.runInNewContext(
    fs.readFileSync(
      path.join(root, "dist/runtime/native/native-interop.js"),
      "utf8",
    ),
    context,
  );
  return context.exports.interop(
    "Control",
    [{ source: "className", target: ["style"], inlineProp: "style" }],
    { style },
    null,
  ).style;
}

test("native podcast Play/Pause/Resume/Replay control keeps its visible orange surface and invokes playback", () => {
  const hooks = {
    useState: (initial) => [
      typeof initial === "function" ? initial() : initial,
      () => {},
    ],
    useMemo: (fn) => fn(),
    useEffect() {},
  };
  let presses = 0;
  const audio = {
    ready: true,
    busy: false,
    waiting: false,
    error: false,
    playing: false,
    ended: false,
    hasPlayed: false,
    position: 0,
    duration: 120,
    progress: 0,
    rate: 1,
    toggle() {
      presses++;
    },
  };
  const icons = Object.fromEntries(
    [
      "BookOpen",
      "ChevronDown",
      "ChevronUp",
      "Headphones",
      "Pause",
      "Play",
      "RotateCcw",
      "RotateCw",
    ].map((name) => [name, name]),
  );
  const api = loader({
    react: { __esModule: true, default: hooks, ...hooks },
    "react-native": {
      View: "View",
      Text: "Text",
      Pressable: "Pressable",
      TouchableOpacity: "TouchableOpacity",
      ActivityIndicator: "Spinner",
      StyleSheet: { create: (value) => value },
    },
    "@react-navigation/native": { useIsFocused: () => true },
    "lucide-react-native": icons,
    "@/hooks/use-notes-asset": {
      useNotesAsset: () => ({
        uri: "file:synthetic",
        error: false,
        retry() {},
      }),
    },
    "@/hooks/use-notes-playback": {
      podcastTime: () => "0:00",
      useNotesPlayback: () => audio,
    },
    "@/hooks/use-notes-transcript": {
      useNotesTranscript: () => ({ transcript: "Synthetic transcript" }),
    },
    "@/constants/colors": { colors: { primary: "#FC6E20" } },
    "./PodcastArtwork": { __esModule: true, default: "Artwork" },
  })("components/notes/StudyPodcast.tsx");
  const nodes = (root) =>
    !root || typeof root !== "object"
      ? []
      : Array.isArray(root)
        ? root.flatMap(nodes)
        : [root, ...nodes(root.props?.children)];
  const recording = nodes(
    api.default({ audioUrl: "/generated_audio/synthetic.mp3" }),
  ).find((node) => typeof node.type === "function" && node.props?.uri);
  for (const [label, update] of [
    ["Play", {}],
    ["Pause", { playing: true }],
    ["Resume", { playing: false, hasPlayed: true }],
    ["Replay", { ended: true }],
  ]) {
    Object.assign(audio, update);
    const tree = recording.type(recording.props);
    const button = nodes(tree).find(
      (node) => node.props?.accessibilityLabel === `${label} podcast`,
    );
    assert.ok(button, label + " control must be rendered");
    assert.equal(button.props.disabled, false);
    assert.notEqual(typeof button.props.style, "function");
    const style = nativeInlineStyle(button.props.style);
    assert.equal(style.backgroundColor, "#FC6E20");
    assert.ok(style.width >= 44 && style.height >= 44);
    assert.ok(
      nodes(button).some(
        (node) => node.type === "Text" && node.props.children === label,
      ),
    );
    button.props.onPress();
  }
  assert.equal(presses, 4);
});

function hooksFixture() {
  const slots = [],
    pending = [];
  let cursor = 0;
  const hooks = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots))
        slots[i] = typeof initial === "function" ? initial() : initial;
      return [
        slots[i],
        (next) => {
          slots[i] = typeof next === "function" ? next(slots[i]) : next;
        },
      ];
    },
    useRef(initial) {
      const i = cursor++;
      return slots[i] || (slots[i] = { current: initial });
    },
    useCallback(fn) {
      cursor++;
      return fn;
    },
    useEffect(fn, deps) {
      const i = cursor++;
      const old = slots[i];
      if (!old || deps.some((dep, index) => dep !== old.deps[index])) {
        pending.push(() => {
          old?.cleanup?.();
          slots[i] = { deps, cleanup: fn() };
        });
      }
    },
  };
  return {
    hooks,
    render(fn) {
      cursor = 0;
      const value = fn();
      pending.splice(0).forEach((fn) => fn());
      return value;
    },
    dispose() {
      slots.forEach((value) => value?.cleanup?.());
    },
  };
}

function playback() {
  const fixture = hooksFixture(),
    events = new Set(),
    timers = new Map();
  let nextTimer = 0;
  const calls = { play: 0, pause: 0, seeks: [], rates: [] };
  const player = {
    play() {
      calls.play++;
    },
    pause() {
      calls.pause++;
    },
    async seekTo(value) {
      calls.seeks.push(value);
    },
    setPlaybackRate(value) {
      calls.rates.push(value);
    },
  };
  const status = {
    duration: 120,
    currentTime: 20,
    playing: false,
    isLoaded: true,
    isBuffering: false,
    playbackRate: 1,
    didJustFinish: false,
  };
  const load = loader(
    {
      react: fixture.hooks,
      "react-native": {
        AppState: {
          currentState: "active",
          addEventListener(_name, fn) {
            events.add(fn);
            return {
              remove() {
                events.delete(fn);
              },
            };
          },
        },
      },
      "expo-audio": {
        useAudioPlayer: () => player,
        useAudioPlayerStatus: () => status,
      },
    },
    {
      setTimeout(fn, ms) {
        assert.equal(ms, 20000);
        timers.set(++nextTimer, fn);
        return nextTimer;
      },
      clearTimeout(id) {
        timers.delete(id);
      },
    },
  );
  const api = load("hooks/use-notes-playback.ts");
  return {
    ...fixture,
    calls,
    player,
    status,
    events,
    timers,
    api,
    state: (focused) =>
      fixture.render(() =>
        api.useNotesPlayback("file:synthetic-audio", focused ?? true),
      ),
  };
}

test("skip/seek stays inside the recording, speed is bounded and replay seeks before playing", async () => {
  const f = playback();
  let audio = f.state();
  await audio.seek(-10);
  await audio.seek(999);
  await audio.seek(NaN);
  assert.deepEqual(f.calls.seeks, [0, 120]);
  await audio.changeRate(1.25);
  await audio.changeRate(10);
  assert.deepEqual(f.calls.rates, [1.25]);
  f.status.currentTime = 120;
  f.status.didJustFinish = true;
  audio = f.state();
  await audio.toggle();
  assert.equal(f.calls.seeks.at(-1), 0);
  assert.equal(f.calls.play, 1);
  f.status.playing = true;
  audio = f.state();
  assert.equal(f.state().hasPlayed, true);
  await audio.toggle();
  assert.ok(f.calls.pause > 0);
  f.status.playing = false;
  f.status.didJustFinish = false;
  f.status.currentTime = 45;
  audio = f.state();
  const seekCount = f.calls.seeks.length;
  await audio.toggle();
  assert.equal(f.calls.play, 2);
  assert.equal(
    f.calls.seeks.length,
    seekCount,
    "Resume must keep the paused position",
  );
  assert.equal(f.api.podcastTime(Infinity), "0:00");
  assert.equal(f.api.podcastTime(-1), "0:00");
  assert.equal(f.api.podcastTime(125.8), "2:05");
  f.dispose();
});

test("rejected seeks are contained and a delayed replay cannot start after leaving the screen", async () => {
  const f = playback();
  let audio = f.state();
  f.player.seekTo = async () => {
    throw Error("decoder unavailable");
  };
  await audio.seek(30);
  assert.equal(f.state().error, true);
  let resolve;
  f.player.seekTo = () =>
    new Promise((r) => {
      resolve = r;
    });
  f.status.currentTime = 120;
  f.status.didJustFinish = true;
  audio = f.state();
  const replay = audio.toggle();
  f.state(false);
  resolve();
  await replay;
  assert.equal(f.calls.play, 0);
  assert.equal(f.state(true).busy, false);
  f.events.forEach((fn) => fn("background"));
  assert.ok(f.calls.pause > 0);
  await f.state().toggle();
  assert.equal(f.calls.play, 0);
  f.events.forEach((fn) => fn("active"));
  const delayedAfterResume = f.state().toggle();
  f.events.forEach((fn) => fn("background"));
  f.events.forEach((fn) => fn("active"));
  resolve();
  await delayedAfterResume;
  assert.equal(f.calls.play, 0);
  f.dispose();
});

test("failed loading/buffering has a deadline and can never spin forever", () => {
  const f = playback();
  f.status.isLoaded = false;
  assert.equal(f.state().waiting, true);
  assert.equal(f.timers.size, 1);
  f.timers.values().next().value();
  assert.equal(f.state().error, true);
  f.dispose();
  assert.equal(f.timers.size, 0);
});

test("transcript failures expose retry, legacy text paths stay private and inline MP3 transcripts need no extra request", async () => {
  const f = hooksFixture();
  const requests = [];
  let fail = true;
  const api = loader({
    react: f.hooks,
    "@clerk/expo": { useAuth: () => ({ userId: "owner" }) },
    "@/api/notesClients": {
      notesAssetsClient: {
        async get(path, options) {
          requests.push({ path, options });
          if (fail) throw Error("offline");
          return { data: "A synthetic lesson transcript." };
        },
      },
    },
  })("hooks/use-notes-transcript.ts");
  const render = (url, text) =>
    f.render(() => api.useNotesTranscript(url, text));
  render("/generated_audio/lesson.txt");
  await tick();
  let result = render("/generated_audio/lesson.txt");
  assert.equal(result.error, true);
  fail = false;
  result.retry();
  render("/generated_audio/lesson.txt");
  await tick();
  result = render("/generated_audio/lesson.txt");
  assert.equal(result.transcript, "A synthetic lesson transcript.");
  assert.equal(requests[0].options.responseType, "text");
  const count = requests.length;
  result = render(
    "/generated_audio/lesson.mp3",
    "Read along with the recording.",
  );
  assert.equal(result.transcript, "Read along with the recording.");
  assert.equal(requests.length, count);
  render("https://evil.invalid/lesson.txt");
  result = render("https://evil.invalid/lesson.txt");
  assert.equal(result.error, true);
  assert.equal(requests.length, count);
  f.dispose();
  assert.equal(requests[0].options.signal.aborted, true);
});
