import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync, existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

// CPU-only source contracts. The hook model below does not mount a DOM, load a
// URL, compile a shader, or qualify live context-loss/compositor behavior.
const repo = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
function loader(peer = require, overrides = new Map(), activity = {}, globals = {}) {
  const modules = new Map();
  const context = vm.createContext({console, URL, AbortController, queueMicrotask,
    fetch() {activity.fetch = (activity.fetch || 0) + 1; throw Error('Unexpected CPU URL I/O');},
    createImageBitmap() {activity.decode = (activity.decode || 0) + 1; throw Error('Unexpected CPU decode');},
    requestAnimationFrame() {activity.raf = (activity.raf || 0) + 1; throw Error('Unexpected CPU RAF');}, ...globals});
  function load(file) {
    file = path.resolve(repo, file);
    if (overrides.has(file)) return overrides.get(file);
    if (modules.has(file)) return modules.get(file).exports;
    const module = {exports: {}}; modules.set(file, module);
    const source = readFileSync(file, 'utf8').replaceAll('import.meta.url', JSON.stringify(pathToFileURL(file).href));
    const js = ts.transpileModule(source, {fileName: file, compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    }}).outputText;
    vm.runInContext('(function(require,module,exports){' + js + '\n})', context, {filename: file})(id => {
      if (!id.startsWith('.')) return id === 'react' && overrides.has('react') ? overrides.get('react') : peer(id);
      const stem = path.resolve(path.dirname(file), id);
      const target = [stem + '.tsx', stem + '.ts', stem].find(existsSync);
      assert(target, stem); return load(target);
    }, module, module.exports);
    return module.exports;
  }
  load.clone = value => vm.runInContext('JSON.parse', context)(JSON.stringify(value));
  return load;
}
const load = loader(), material = load('src/world-settings-navigation-material.tsx');
const skins = load('src/settings-navigation-assets.ts').settingsNavigationAssets;
const icons = load('src/world-navigation-assets.ts').worldNavigationAssets;
const layout = load('src/gui-image-geometry.ts').layoutGuiImages;
const plain = value => JSON.parse(JSON.stringify(value));
const profile = () => ({profile: 'source-image', extentPolicy: 'ceil', background: {kind: 'transparent'}});
const image = {src: '/caller-whole.png', sourceSize: [16, 16]};
function snapshot() {
  return load('demo/world-settings-navigation-data.ts').createWorldNavigationDemoSnapshot({white: {...image, sourceSize: [2, 2]}, thumbnail: image, pack: image});
}
function props() {return {mode: 'edit', snapshot: snapshot(), label: 'World settings', width: 190, scale: 2,
  font: {family: 'monospace', size: 9, lineHeight: 10}, value: 'game_button', sourceDefaultIndex: 0,
  toggleOnHover: false, hoverPolicy: 'activation-only', hiddenSlots: 'reserve'};}
function entry(id, y = 0, extra = {}) {return {id, sourceControl: 'source.' + id, kind: 'section',
  box: [0, y, 190, 30], ignored: false, visible: true, enabled: true, ...extra};}
function plan(entries, extra = {}) {return {width: 190, height: 400, scale: 2, entries, ...extra};}

for (const major of [18, 19]) {
  const peerRoot = process.env[`MCBEUI_REACT${major}_ROOT`] || path.join(repo, `.cache/consumer-react${major}`);
  const installed = existsSync(path.join(peerRoot, 'node_modules/react/package.json'));
  test(`React${major}: opt-in SSR retains native buttons and fallback with zero I/O/callbacks/refs`, {skip: installed ? false : 'Actual peer installation absent'}, () => {
    const peer = createRequire(path.join(peerRoot, 'package.json'));
    const React = peer('react'), render = peer('react-dom/server').renderToStaticMarkup;
    assert.equal(Number(React.version.split('.')[0]), major);
    const activity = {}, api = loader(peer, new Map(), activity), ref = React.createRef();
    const World = api('src/world-settings-navigation.tsx').WorldSettingsNavigation;
    let callbacks = 0, refs = 0; const errors = [], beforeError = console.error;
    console.error = (...args) => errors.push(args);
    try {
      const p = api.clone(props());
      const baseline = render(React.createElement(World, p));
      const html = render(React.createElement(World, {...p, ref, materialRendering: {...profile(), onStateChange() {callbacks++;}, onError() {callbacks++;}}}));
      assert.match(html, /data-material-state="loading"/);
      assert(!html.includes('mc-world-navigation--material-ready'));
      assert.equal((html.match(/<canvas\b/g) || []).length, 1);
      assert.equal((html.match(/<button\b/g) || []).length, (baseline.match(/<button\b/g) || []).length);
      assert.match(html, /data-framebuffer-width="380"/);
      assert.match(html, /visibility:hidden/);
      assert.equal(ref.current, null);
      render(React.createElement(World, {...p, materialRendering: profile(), ref() {refs++; return () => refs++;}}));
      assert.equal(callbacks, 0); assert.equal(refs, 0); assert.deepEqual(activity, {}); assert.deepEqual(errors, []);
    } finally {console.error = beforeError;}
  });
}

test('profile validation rejects malformed fields and sparse background arrays before hooks/IO', () => {
  for (const bad of [null, {}, {...profile(), profile: 'native'}, {...profile(), extentPolicy: 'floor'},
    {...profile(), background: {kind: 'texture'}}, {...profile(), background: {kind: 'solid', color: new Array(4)}},
    {...profile(), background: {kind: 'solid', color: [0, 0, 0, NaN]}}, {...profile(), renderKey: Infinity},
    {...profile(), onError: true}, {...profile(), onStateChange: 1}]) assert.throws(() => material.validateWorldNavigationMaterial(bad));
  assert.doesNotThrow(() => material.validateWorldNavigationMaterial(undefined));
  assert.doesNotThrow(() => material.validateWorldNavigationMaterial({...profile(), background: {kind: 'solid', color: [0, .25, 1, .5]}, renderKey: 0}));
});

test('queue excludes ignored/hidden records, preserves fractional local origins and source state layers', () => {
  const p = snapshot(), model = plan([entry('game_button', 50.5), entry('debug_button', 100, {ignored: true}), entry('multiplayer_button', 150, {visible: false})]);
  const before = JSON.stringify([model, p]);
  const images = material.worldNavigationMaterialImages(model, p, 'game_button', 'reserve');
  assert.equal(images.length, 4); assert.equal(images[0].texture, skins.checked.url);
  assert.deepEqual(plain(images[0].rect), [1, 51, 188, 29]);
  assert.deepEqual(plain(images[1].rect), [0, 50, 190, 31]);
  assert.deepEqual(plain(images[2].rect), [8, 58.5, 21, 14]);
  assert.equal(images[2].texture, icons['textures/ui/controller_glyph'].url);
  assert.equal(images[3].texture, icons['textures/ui/controller_glyph_color'].url);
  assert.deepEqual(plain(images[2].tint), [0, 0, 0, 1]);
  assert.equal(JSON.stringify([model, p]), before);
  assert(Object.isFrozen(images));
});

test('measured palette preserves z ordering, checked-hover and glyph-only disabled alpha', () => {
  const model = plan([entry('game_button', 0), entry('debug_button', 30)]), p = snapshot();
  const palette = {rows: {
    game_button: {skin: 'checkedHover', glyph: 1, border: 1, alpha: 1, z: 4},
    debug_button: {skin: 'locked', glyph: 0, border: .075, alpha: .5, z: 1},
  }, launch: {}};
  const images = material.worldNavigationMaterialImages(model, p, 'game_button', 'reserve', palette);
  assert.equal(images[0].texture, skins.locked.url);
  assert.equal(images[0].hudOpacity, 1, 'Disabled glyph alpha is not a group opacity on the board.');
  assert.equal(images[2].hudOpacity, .5); assert.equal(images[3].hudOpacity, .5);
  assert.equal(images[4].texture, skins.checkedHover.url); assert.equal(images[6].tint[0], 1);
});

test('launch halves obey source edition/editor and explicit hidden-slot policy', () => {
  const p = snapshot(), model = plan([entry('play_or_create_panel', 10, {kind: 'source-slot', box: [0, 10, 190, 35]})]);
  p.launch.realms.visible = false;
  const reserved = material.worldNavigationMaterialImages(model, p, null, 'reserve');
  assert.equal(reserved.length, 2); assert.deepEqual(plain(reserved[0].rect), [1, 11, 93, 33]);
  const collapsed = material.worldNavigationMaterialImages(model, p, null, 'collapse');
  assert.deepEqual(plain(collapsed[0].rect), [1, 11, 188, 33]);
  p.context.editorModeEnabled = true;
  assert.deepEqual(plain(material.worldNavigationMaterialImages(model, p, null, 'reserve')[0].rect), [1, 11, 188, 33]);
  const edu = material.worldNavigationMaterialImages(plan([entry('play_or_host_panel', 10, {kind: 'source-slot'})]), p, null, 'reserve');
  assert.equal(edu.length, 4); assert.deepEqual(plain(edu[2].rect), [96, 11, 93, 33]);
});

test('provider loading frame is an explicit original-UV window, with no clock/extra snapping', () => {
  const p = snapshot(); p.server.iconName = 'loading'; p.server.loadingFrame = 9;
  const images = material.worldNavigationMaterialImages(plan([entry('server_settings_button', 263.5)]), p, null, 'reserve');
  assert.equal(images.length, 3); const loading = images[2];
  assert.equal(loading.texture, icons['textures/ui/loading_bar'].url);
  assert.deepEqual(plain(loading.uvRect), [.9, 0, .1, 1]);
  assert.deepEqual(plain(loading.rect), [8, 271.5, 21, 14]);
  const packed = layout({width: 380, height: 800, guiScale: 2, images});
  assert.equal(packed.meshes[2].drawRect[1], 271.5);
});

// A deliberately narrow React hook state/effect model, not mounted React.
function hookModel(options = {}) {
  let cursor = 0, dirty = false; const slots = [], pending = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
  const hooks = {
    useState(initial) {const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], next => {const value = typeof next === 'function' ? next(slots[i]) : next; if (!Object.is(value, slots[i])) {slots[i] = value; dirty = true;}}];},
    useRef(initial) {const i = cursor++; return slots[i] ??= {current: initial};},
    useCallback(callback, deps) {const i = cursor++, old = slots[i]; if (!old || !same(old.deps, deps)) slots[i] = {deps, callback}; return slots[i].callback;},
  };
  function effect(run, deps) {const i = cursor++, old = slots[i]; if (!old || !same(old.deps, deps)) {slots[i] = {deps, cleanup: old?.cleanup}; pending.push(() => {slots[i].cleanup?.(); slots[i].cleanup = run();});}}
  const overrides = new Map([['react', hooks], [path.join(repo, 'src/classic-screen-lifecycle.ts'), {useClassicLayoutEffect: effect}],
    [path.join(repo, 'src/gui-image.tsx'), {GuiImageLayer: () => null}]]);
  const source = loader(require, overrides, {}, options.globals)('src/world-settings-navigation-material.tsx');
  const hook = source.useWorldNavigationMaterial;
  const root = {current: null}; let active = profile(), model = plan([entry('game_button')]), data = snapshot();
  return {
    configure(next) {if ('profile' in next) active = next.profile; if (next.plan) model = next.plan; if (next.snapshot) data = next.snapshot;},
    render() {let result, attempts = 0; do {dirty = false; cursor = 0; result = options.child
      ? source.WorldNavigationMaterialPlane({profile: active, plan: model, snapshot: data, value: 'game_button', hiddenSlots: 'reserve'})
      : hook(root, active, model, data, 'game_button', 'reserve'); assert(++attempts < 10);} while (dirty); return result;},
    commit() {while (pending.length) pending.shift()();},
    unmount() {for (const slot of slots) slot?.cleanup?.();},
  };
}
test('hook model: same-profile reactivation has a new loading owner, including before passive readiness', () => {
  const h = hookModel(); let result = h.render(); h.commit(); assert.equal(result.state, 'loading');
  result.layer.props.onRenderStateChange('ready'); result = h.render(); h.commit(); assert.equal(result.ready, true);
  const previous = result.layer;
  h.configure({profile: undefined}); result = h.render(); h.commit(); assert.equal(result.state, 'css'); assert.equal(result.layer, null);
  h.configure({profile: profile()}); result = h.render(); h.commit(); assert.equal(result.state, 'loading'); assert.equal(result.ready, false);
  assert.notEqual(result.layer.key, previous.key);
  previous.props.onRenderStateChange('ready'); assert.equal(h.render().ready, false, 'Old owner callback cannot restore ready.');
  h.unmount();
});
test('hook model: retry/asset/disabled changes cancel stale ready and stale callbacks, unmount rejects notifications', () => {
  const h = hookModel(); let result = h.render(); h.commit(); result.layer.props.onRenderStateChange('ready'); result = h.render(); h.commit();
  const previous = result.layer; let calls = 0;
  h.configure({profile: {...profile(), renderKey: 'retry', onStateChange() {calls++;}}}); result = h.render(); h.commit();
  assert.equal(result.state, 'loading'); previous.props.onRenderStateChange('ready'); assert.equal(calls, 0);
  result.layer.props.onRenderStateChange('ready'); result = h.render(); h.commit(); assert.equal(result.ready, true); assert.equal(calls, 1);
  h.configure({plan: plan([entry('game_button', 0, {enabled: false})])}); result = h.render(); h.commit();
  assert.equal(result.ready, false); assert.equal(result.layer.props.images[0].texture, skins.locked.url);
  const current = result.layer; h.unmount(); current.props.onRenderStateChange('ready'); assert.equal(calls, 1);
});

test('ceil target policy is distinct from source-area validation at the finite pixel-cap boundary', () => {
  const width = 2048.1, height = 8191.5;
  assert(width * height < 16777216); assert(Math.ceil(width) * Math.ceil(height) > 16777216);
  assert.throws(() => layout({width: Math.ceil(width), height: Math.ceil(height), guiScale: 1, images: []}), /bounded positive integer dimensions/);
});

test('child seam: idempotent owner marking, retry and unmount clean state without observer feedback', () => {
  const classes = new Set(), listeners = new Map(); let observes = 0, disconnects = 0, writes=0;
  const node = {dataset: new Proxy({materialProfile: 'source-image'},{set(object,key,value){writes++;object[key]=value;return true;}}), classList: {
    contains(name){return classes.has(name);},
    toggle(name, force) {writes++;if (force) classes.add(name); else classes.delete(name);}, remove(name) {writes++;classes.delete(name);},
  }, ownerDocument: {defaultView: {getComputedStyle() {throw Error('No buttons in this finite node model.');}}},
    querySelector() {return null;}, querySelectorAll() {return [];},
    addEventListener(type, callback) {listeners.set(type, callback);},
    removeEventListener(type, callback) {assert.equal(listeners.get(type), callback); listeners.delete(type);},
  };
  const h = hookModel({child: true, globals: {MutationObserver: class {
    constructor(callback) {this.callback = callback;} observe(target) {assert.equal(target, node); observes++;} disconnect() {disconnects++;}
  }}});
  let marker = h.render(); assert.equal(marker.props.style.display, 'contents');
  marker.props.ref({closest(selector) {assert.equal(selector, '.mc-world-navigation'); return node;}});
  h.commit(); marker = h.render(); h.commit();
  assert.equal(node.dataset.materialState, 'loading'); assert.equal(listeners.size, 8); assert.equal(observes, 1);
  const oldLayer = marker.props.children; oldLayer.props.onRenderStateChange('ready'); marker = h.render(); h.commit();
  assert.equal(node.dataset.materialState, 'ready'); assert(classes.has('mc-world-navigation--material-ready'));
  const readyWrites=writes;for(let i=0;i<4;i++){marker=h.render();h.commit();}assert.equal(writes,readyWrites,'Equivalent repaint commits must not write observed attributes.');
  h.configure({profile: {...profile(), renderKey: 'second-owner'}}); marker = h.render(); h.commit();
  assert.equal(node.dataset.materialState, 'loading'); assert(!classes.has('mc-world-navigation--material-ready'));
  oldLayer.props.onRenderStateChange('ready'); marker = h.render(); h.commit();
  assert.equal(node.dataset.materialState, 'loading');
  const queued = [...listeners.values()][0]; h.unmount();
  assert.equal(listeners.size, 0); assert.equal(disconnects, 1); assert(!classes.has('mc-world-navigation--material-ready'));
  marker.props.children.props.onRenderStateChange('ready');
  assert.equal(node.dataset.materialState, 'loading');
  // The queued observer/event update must see its cleanup's live=false.
  queued();
});

test('structural guard: semantic WorldNav does not own the paint hook and uses the private child seam', () => {
  const source = ts.createSourceFile('world-settings-navigation.tsx', readFileSync(path.join(repo, 'src/world-settings-navigation.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let paintHookCalls = 0, childTags = 0;
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'useWorldNavigationMaterial') paintHookCalls++;
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === 'WorldNavigationMaterialPlane') childTags++;
    ts.forEachChild(node, visit);
  }
  visit(source); assert.equal(paintHookCalls, 0); assert.equal(childTags, 1);
});
