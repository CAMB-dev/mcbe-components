import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {existsSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const root = process.cwd(), require = createRequire(import.meta.url), hash = bytes => createHash('sha256').update(bytes).digest('hex');
function loader(peer) {const cache = new Map(); return function load(file) {
  file = path.resolve(root, file); if (cache.has(file)) return cache.get(file).exports;
  const module = {exports: {}}; cache.set(file, module);
  const source = readFileSync(file, 'utf8').replaceAll('import.meta.url', JSON.stringify(pathToFileURL(file).href));
  const js = ts.transpileModule(source, {fileName: file, compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true}}).outputText;
  const local = id => {if (!id.startsWith('.')) return peer(id); const stem = path.resolve(path.dirname(file), id), target = [stem, stem + '.ts', stem + '.tsx'].find(existsSync); assert(target, stem); return load(target);};
  vm.runInThisContext('(function(require,module,exports){' + js + '\n})', {filename: file})(local, module, module.exports); return module.exports;
};}
const glyphURL = pathToFileURL(path.join(root, 'src/assets/document-viewer/chevron_left.png')).href;
function section(id = 'game', overrides = {}) {return {kind: 'section', id, sourceControl: id + '_button', ignored: false, visible: true, enabled: true,
  label: id === 'game' ? 'Game' : 'Multiplayer', viewBinding: id + '_button_toggle', sourceIndex: 7, panelTitle: 'createWorldScreen.' + id + '.settings',
  glyph: {size: [4, 7], outline: {src: glyphURL, sourceSize: [4, 7], visible: true}, color: {src: glyphURL, sourceSize: [4, 7], visible: true}}, ...overrides};}
function props(overrides = {}) {return {label: 'World settings pages', width: 130, scale: 2, font: {family: 'monospace', size: 10, lineHeight: 10},
  value: 'game', sourceDefaultIndex: 0, toggleOnHover: true, hoverPolicy: 'activation-only', hiddenSlots: 'reserve',
  items: [{kind: 'group', id: 'world-label', sourceControl: 'selector_group_label_1', ignored: false, visible: true, enabled: true, label: 'World', height: 10},
    section(), {kind: 'spacer', id: 'gap', sourceControl: 'spacer_01', ignored: false, visible: true, enabled: true, size: [2, 8]}, section('multiplayer')], ...overrides};}
const peers = [18, 19].map(major => createRequire(path.join(root, '.cache/consumer-react' + major + '/package.json')));
for (const [i, peer] of peers.entries()) {
  const React = peer('react'), render = peer('react-dom/server').renderToStaticMarkup, ui = loader(peer)('src/settings-navigation.tsx'), el = React.createElement;
  assert.equal(Number(React.version.split('.')[0]),18+i,'Prepare actual .cache/consumer-react18 and consumer-react19 using npm run verify:package before this two-peer source test.');
  assert.equal(Number(React.version.split('.')[0]), i === 0 ? 18 : 19);
  test('source radio identity,30-unit rows, original4x7 glyphs and caller label/ref contracts SSR ' + React.version, () => {
    const p = props(), ref = React.createRef(), html = render(el(ui.SettingsNavigation, {...p, ref, inert: true}));
    assert(html.includes('role="radiogroup"')); assert(html.includes('aria-label="World settings pages"')); assert(html.includes('data-source-group="navigation_tab"'));
    assert.equal((html.match(/role="radio"/g) ?? []).length, 2); assert.equal((html.match(/aria-checked="true"/g) ?? []).length, 1);
    assert.equal((html.match(/data-source-forced-index="7"/g) ?? []).length, 2, 'source indices may intentionally repeat across provider alternatives');
    assert(html.includes('width:260px;height:60px')); assert(html.includes('width:8px;height:14px')); assert(html.includes('data-source-view-binding="game_button_toggle"'));
    assert(html.includes('inert=""')); assert.equal(ref.current, null);
    assert(!html.includes('mc-tab') && !html.includes('mc-scroll-area') && !html.includes('type="hidden"'));
    assert.equal((html.match(/alt=""/g) ?? []).length, 4);
  });
  test('controlled value never derives from source default/forced index or first enabled row SSR ' + React.version, () => {
    for (const value of [null, 'unresolved-engine-value']) {
      const html = render(el(ui.SettingsNavigation, props({value, sourceDefaultIndex: 7})));
      assert.equal((html.match(/aria-checked="true"/g) ?? []).length, 0);
      assert.equal((html.match(/tabindex="0"/g) ?? []).length, 1, 'Web focus entry is not implicit acceptance');
    }
  });
  test('ignored removes instances while false visible and disabled remain independent source inputs SSR ' + React.version, () => {
    const rows = [section('ignored', {ignored: true}), section('invisible', {visible: false}), section('disabled', {enabled: false})];
    const reserved = render(el(ui.SettingsNavigation, props({items: rows, value: 'disabled'})));
    assert(!reserved.includes('data-settings-navigation-id="ignored"')); assert(reserved.includes('data-settings-navigation-id="invisible"')); assert(reserved.includes('visibility:hidden'));
    assert.equal((reserved.match(/role="radio"/g) ?? []).length, 2); assert(reserved.includes('aria-checked="true" disabled=""'));
    const collapsed = render(el(ui.SettingsNavigation, props({items: rows, hiddenSlots: 'collapse'})));
    assert(collapsed.includes('aria-hidden="true" hidden=""')); assert(!collapsed.includes('data-settings-navigation-id="ignored"'));
    assert.equal((collapsed.match(/tabindex="0"/g) ?? []).length, 0);
  });
  test('SSR import/render does not call refs, callbacks, image/font/network/timer APIs ' + React.version, () => {
    const saved = new Map(), attempts = [], warnings = [], old = console.error; let callbacks = 0;
    for (const name of ['fetch', 'Image', 'FontFace', 'OffscreenCanvas', 'createImageBitmap', 'setTimeout', 'setInterval', 'requestAnimationFrame']) {saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, {configurable: true, value() {attempts.push(name); throw Error(name);}});}
    console.error = (...args) => warnings.push(args.map(String).join(' '));
    try {const fresh = loader(peer)('src/settings-navigation.tsx'); render(el(fresh.SettingsNavigation, props({inert: true, ref() {callbacks++;}, itemRefs: {game() {callbacks++;}}, onValueChange() {callbacks++;}}))); assert.equal(callbacks, 0); assert.deepEqual(attempts, []); assert.deepEqual(warnings, []);}
    finally {console.error = old; for (const [name, descriptor] of saved) {if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];}}
  });
}

test('private six original skins and raw metadata point to unchanged committed whole PNGs', () => {
  const assets = loader(require)('src/settings-navigation-assets.ts').settingsNavigationAssets;
  const manifest = JSON.parse(readFileSync('docs/settings-navigation-assets.json', 'utf8'));
  assert.deepEqual(Object.keys(assets), ['unchecked', 'checked', 'uncheckedHover', 'checkedHover', 'locked', 'border', 'controller', 'controllerColor', 'multiplayer', 'multiplayerColor']);
  for (const [key, asset] of Object.entries(assets)) {
    const source = manifest.assets[key], bytes = readFileSync(fileURLToPath(asset.url)); assert.equal(hash(bytes), source.sha256);
    assert.equal(bytes.readUInt32BE(16), asset.width); assert.equal(bytes.readUInt32BE(20), asset.height);
    if (source.metadata) assert.deepEqual(asset.metadata, JSON.parse(readFileSync(source.metadata.file, 'utf8'))); else {assert.equal(asset.metadata, undefined); assert.equal(source.metadataAbsentInFixedArchive, true);}
  }
  const originalGlyph = readFileSync(fileURLToPath(glyphURL)); assert.equal(originalGlyph.readUInt32BE(16), 4); assert.equal(originalGlyph.readUInt32BE(20), 7);
  const css = readFileSync('src/settings-navigation.css', 'utf8');
  for (const fragment of ['top:calc(-.5 * var(--mc-settings-navigation-u))', 'height:calc(31 * var(--mc-settings-navigation-u))', 'image-rendering:pixelated', 'left:calc(34 * var(--mc-settings-navigation-u))', 'top:calc(2.5 * var(--mc-settings-navigation-u))', 'z-index:4']) assert(css.includes(fragment));
});
test('bounded source data rejects accessors, sparse arrays, missing flags, duplicate IDs and unresolved policy', () => {
  const ui = loader(peers[0])('src/settings-navigation.tsx'), render = p => peers[0]('react-dom/server').renderToStaticMarkup(peers[0]('react').createElement(ui.SettingsNavigation, p));
  let reads = 0; const sparse = [section()]; Object.defineProperty(sparse, '0', {get() {reads++; return section();}});
  assert.throws(() => render(props({items: sparse})), /accessors/); assert.equal(reads, 0);
  assert.throws(() => render(props({items: new Array(1)})), /dense/);
  for (const patch of [{defaultValue: 'game'}, {hoverPolicy: undefined}, {hiddenSlots: 'native'}, {width: 44}, {sourceDefaultIndex: 0.1}, {items: [section(), section()]}, {items: [section('broken', {visible: undefined})]}, {children: 'host complete settings'}]) assert.throws(() => render(props(patch)));
});

function walk(node, predicate, found = []) {if (!node || typeof node !== 'object') return found; if (predicate(node)) found.push(node); for (const child of Array.isArray(node.props?.children) ? node.props.children.flat(Infinity) : [node.props?.children]) walk(child, predicate, found); return found;}
function harness() {
  let cursor = 0, slots = [], effects = []; const stores = new Map(), jsx = (type, props, key) => ({type, props, key});
  const React = {version: '18.3.1', forwardRef: render => ({render}), useRef: value => slots[cursor++] ?? (slots[cursor - 1] = {current: value}), useState: initial => {const at = cursor++; slots[at] ??= {value: initial}; return [slots[at].value, value => {slots[at].value = value;}];}, useCallback: fn => fn, useEffect: fn => effects.push(fn), useLayoutEffect: fn => effects.push(fn)};
  const peer = id => id === 'react' ? React : id === 'react/jsx-runtime' ? {jsx, jsxs: jsx} : require(id), ui = loader(peer)('src/settings-navigation.tsx');
  return {ui, render(type, p, ref, key = type) {slots = stores.get(key) ?? []; stores.set(key, slots); cursor = 0; effects = []; const view = type.render(p, ref); for (const effect of effects) effect(); return view;}};
}
function clock() {const tasks = [], micro = [], doc = {querySelector: () => null, defaultView: {setTimeout: fn => tasks.push(fn), queueMicrotask: fn => micro.push(fn), getComputedStyle: () => ({visibility: 'visible'})}}; return {doc, flush() {while (tasks.length) tasks.shift()(); while (micro.length) micro.shift()();}};}
function node(doc) {return {ownerDocument: doc, isConnected: true, disabled: false, matches: () => false, closest: () => null, getClientRects: () => [{}]};}
function event(owner, patch = {}) {return {target: owner, currentTarget: owner, defaultPrevented: false, nativeEvent: {defaultPrevented: false}, persist() {}, preventDefault() {this.defaultPrevented = true; this.nativeEvent.defaultPrevented = true;}, isDefaultPrevented() {return this.defaultPrevented;}, isPropagationStopped: () => false, ...patch};}
function mount(h, p, ref) {const root = h.render(h.ui.SettingsNavigation, p, ref, 'root'), child = walk(root, n => n.type?.render?.name === 'Section' && n.props.item.id === 'multiplayer')[0]; return {root, child, button: h.render(child.type, child.props, child.props.ref, 'section')};}
test('queued activation honors late native veto and snapshots real owner/source identity before caller mutation', () => {
  const h = harness(), c = clock(), seen = [], p = props({onValueChange: (value, detail) => {seen.push({value, detail}); return false;}}), view = mount(h, p), owner = node(c.doc); view.button.props.ref(owner);
  const veto = event(owner); view.button.props.onClick(veto); veto.nativeEvent.defaultPrevented = true; c.flush(); assert.equal(seen.length, 0);
  const accept = event(owner); view.button.props.onClick(accept); p.items[3].sourceIndex = 99; accept.currentTarget = null; c.flush();
  assert.equal(seen.length, 1); assert.equal(seen[0].value, 'multiplayer'); assert.equal(seen[0].detail.sourceIndex, 7); assert.equal(seen[0].detail.event.currentTarget, owner); assert.equal(seen[0].detail.control, owner); assert.equal(p.value, 'game');
});
test('queued request is canceled by committed identity/value/flags, inert/hidden/modal owner or cleanup', () => {
  for (const mode of ['identity', 'value', 'disabled', 'enabled', 'visible', 'ignored', 'hidden', 'inert', 'fieldset', 'modal', 'unmount']) {
    const h = harness(), c = clock(), seen = [], p = props({onValueChange: (_, detail) => seen.push(detail)}), view = mount(h, p), owner = node(c.doc); view.button.props.ref(owner); view.button.props.onClick(event(owner));
    if (['identity', 'enabled', 'visible', 'ignored'].includes(mode)) {const item = {...view.child.props.item, ...(mode === 'identity' ? {viewBinding: 'superseded'} : {[mode]: mode === 'ignored' ? true : false})}; h.render(view.child.type, {...view.child.props, item}, undefined, 'section');}
    else if (mode === 'value' || mode === 'disabled') h.render(view.child.type, {...view.child.props, model: {...view.child.props.model, ...(mode === 'value' ? {value: 'multiplayer'} : {disabled: true})}}, undefined, 'section');
    else if (mode === 'unmount') view.button.props.ref(null); else if (mode === 'modal') c.doc.querySelector = () => ({contains: () => false}); else if (mode === 'fieldset') owner.matches = () => true; else owner.closest = () => ({});
    c.flush(); assert.equal(seen.length, 0, mode);
  }
});
test('hover is explicit source-flag Web policy, touch does not select and controlled acceptance is never implicit', () => {
  for (const [hoverPolicy, toggleOnHover, pointerType, expected] of [['activation-only', true, 'mouse', 0], ['request-when-source-flag', false, 'mouse', 0], ['request-when-source-flag', true, 'touch', 0], ['request-when-source-flag', true, 'mouse', 1]]) {
    const h = harness(), c = clock(), seen = [], p = props({hoverPolicy, toggleOnHover, onValueChange: (_, detail) => seen.push(detail)}), view = mount(h, p), owner = node(c.doc); view.button.props.ref(owner); view.button.props.onPointerEnter(event(owner, {pointerType})); c.flush(); assert.equal(seen.length, expected); assert.equal(p.value, 'game'); if (expected) assert.equal(seen[0].origin, 'hover');
  }
});
test('forwarded div and item callback refs return real cleanup on React18-compatible void attach', () => {
  const h = harness(), observed = [], callback = value => {observed.push(value); return () => observed.push('cleanup');}, view = mount(h, props({itemRefs: {multiplayer: callback}}), callback);
  assert.equal(view.root.props.ref({}), undefined); assert.equal(view.button.props.ref({}), undefined);
  view.root.props.ref(null); view.button.props.ref(null); assert.equal(observed.filter(x => x === 'cleanup').length, 2); assert(!observed.includes(null));
});
test('IME activation is prevented and vertical keyboard changes only focus, respecting caller early veto', () => {
  const h = harness(), seen = [], p = props({onValueChange: () => seen.push('changed')}), view = mount(h, p);
  const ime = event({}, {key: 'Enter', nativeEvent: {isComposing: true}}); view.button.props.onKeyDown(ime); assert.equal(ime.defaultPrevented, true);
  const c = clock(), a = node(c.doc), b = node(c.doc); let focused = 0; a.focus = () => focused = 1; b.focus = () => focused = 2; c.doc.activeElement = a;
  const container = {ownerDocument: c.doc, contains: () => true, closest: () => null, querySelectorAll: () => [a, b]};
  view.root.props.onKeyDown(event(container, {target: a, key: 'ArrowDown'})); assert.equal(focused, 2); assert.equal(seen.length, 0);
  c.doc.activeElement = container; focused = 0; view.root.props.onKeyDown(event(container, {target: container, key: 'ArrowUp'})); assert.equal(focused, 2);
  const vetoed = h.render(h.ui.SettingsNavigation, {...p, onKeyDown: e => e.preventDefault()}, undefined, 'veto'); focused = 0; vetoed.props.onKeyDown(event(container, {target: a, key: 'ArrowDown'})); assert.equal(focused, 0);
});
test('strict public source types require independent policy/identity/glyph data and correct real refs', () => {
  const file = path.join(root, 'tests/__settings_navigation_contract__.tsx'), fixture = `import{createRef}from'react';import type{ElementRef}from'react';import{SettingsNavigation}from'../src/settings-navigation';import type{SettingsNavigationProps,SettingsNavigationSection,SettingsNavigationDetail}from'../src/settings-navigation';
const row:SettingsNavigationSection=${JSON.stringify(section())};const p:SettingsNavigationProps={label:'World',width:130,scale:2,font:{family:'monospace',size:10,lineHeight:10},items:[row],value:null,sourceDefaultIndex:0,toggleOnHover:true,hoverPolicy:'activation-only',hiddenSlots:'reserve'};
const valid=<SettingsNavigation {...p} inert={true} ref={createRef<HTMLDivElement>()} itemRefs={{game:createRef<HTMLButtonElement>()}} onValueChange={(value,d:SettingsNavigationDetail)=>{const b:HTMLButtonElement=d.control;const same:HTMLButtonElement=d.event.currentTarget;const group:'navigation_tab'=d.sourceGroup;void[value,b,same,group];return false;}}/>;
type Equal<A,B>=(<T>()=>T extends A?1:2)extends(<T>()=>T extends B?1:2)?true:false;type Assert<T extends true>=T;type RootRef=Assert<Equal<ElementRef<typeof SettingsNavigation>,HTMLDivElement>>;
// @ts-expect-error no first/default selected fallback API
const implicit=<SettingsNavigation {...p} defaultValue="game"/>;
// @ts-expect-error no arbitrary settings content children
const children=<SettingsNavigation {...p}>Full settings</SettingsNavigation>;
// @ts-expect-error source index is independent required data
const missing:SettingsNavigationSection={kind:'section',id:'x',label:'x',sourceControl:'x',viewBinding:'x',panelTitle:'x',ignored:false,visible:true,enabled:true,glyph:{outline:null,color:null,size:[21,14]}};
// @ts-expect-error explicit Web policy, no native-certified evaluator
const policy:SettingsNavigationProps={...p,hoverPolicy:'native'};
// @ts-expect-error div root is not a button
const ref=<SettingsNavigation {...p} ref={createRef<HTMLButtonElement>()}/>;
// @ts-expect-error per-item actual button ref is not a div
const wrongItem=<SettingsNavigation {...p} itemRefs={{x:createRef<HTMLDivElement>()}}/>;
void[valid,implicit,children,missing,policy,ref,wrongItem];`;
  const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.ReactJSX, strict: true, noEmit: true, skipLibCheck: true}, host = ts.createCompilerHost(options), get = host.getSourceFile.bind(host);
  host.getSourceFile = (name, ...args) => path.resolve(name) === file ? ts.createSourceFile(file, fixture, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX) : get(name, ...args);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([file], options, host)); assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {getCanonicalFileName: f => f, getCurrentDirectory: () => root, getNewLine: () => '\n'}));
});
