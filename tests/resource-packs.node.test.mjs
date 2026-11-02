import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import {createHash} from 'node:crypto';

// CPU-only module evaluation. No product build, browser, image generation,
// network or native material qualification. Real SSR peers are used separately.
const require = createRequire(import.meta.url), root = process.cwd();
function loader(peer) {const cache = new Map(); return function load(file) {
  file = path.resolve(root, file); if (cache.has(file)) return cache.get(file).exports;
  const module = {exports: {}}; cache.set(file, module);
  const source = readFileSync(file, 'utf8').replaceAll('import.meta.url', JSON.stringify(pathToFileURL(file).href));
  const js = ts.transpileModule(source, {fileName: file, compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true}}).outputText;
  const local = id => {if (!id.startsWith('.')) return peer(id); const stem = path.resolve(path.dirname(file), id), target = [stem, stem + '.ts', stem + '.tsx', stem + '.js', stem + '.json'].find(existsSync); if (!target) throw Error('Missing CPU module ' + stem); return target.endsWith('.json') ? peer(target) : load(target);};
  vm.runInThisContext('(function(require,module,exports){' + js + '\n})', {filename: file})(local, module, module.exports); return module.exports;
};}
const peers = [18, 19].map(major => createRequire(path.join(root, '.cache/consumer-react' + major + '/package.json')));
const kinds = ['selected', 'available', 'realms', 'unowned', 'invalid'];
const canonical = '.cache/resource-packs-source-20261102-01/original/resource_pack/ui/';
const sourceJSON = file => ts.parseConfigFileTextToJson(file, readFileSync(path.join(root, canonical, file), 'utf8')).config;
const resourceSource = sourceJSON('resource_packs_screen.json');
const sourceProfiles = {
  global: sourceJSON('settings_sections/general_section.json')['global_texture_pack_section@resource_packs.selected_stack_panel'],
  level: sourceJSON('settings_sections/world_section.json')['level_texture_pack_section@resource_packs.selected_stack_panel'],
  addon: sourceJSON('settings_sections/world_section.json')['addon_section@resource_packs.selected_stack_panel'],
};
const sectionProps = p => ({profile: p.profile, width: p.width, scale: p.scale, kind: 'selected', title: p.labels.selected, titleVisible: true, expanded: p.bindings.selectedGridVisible, collection: p.collections.selected, defaultItem: p.defaultItem, diagnostics: {visible: true, anyErrors: false, anyWarnings: true, label: p.labels.selectedDiagnostics}});

test('fixed whole source identities and actual16-node graph are pinned independently of rendered markup', () => {
  const raw = readFileSync(path.join(root, canonical, 'resource_packs_screen.json'));
  assert.equal(createHash('sha256').update(raw).digest('hex'), 'c73819a074d90e63268f9b52e86ce32179f10989288aefdd18a66c6ba394f3ae');
  assert.equal(Object.keys(resourceSource).length - 1, 124);
  const children = resourceSource.selected_stack_panel.controls.map(value => Object.keys(value)[0]); assert.equal(children.length, 16);
  assert.deepEqual(children.slice(0, 5), ['world_template_option_lock_panel', 'top_panel', 'offset_0', 'addon_stacking_warning_panel', 'offset_1']);
  for (const kind of kinds) assert.equal(resourceSource[kind + '_pack_grid'].type, 'stack_panel');
  assert.equal(resourceSource.selected_pack_grid.bindings[0].binding_name_override, '#collection_length');
});

// Finite CPU source/CSS contracts, not a browser RGB or native-material test.
for (const [name, states, rgb] of [
  ['default and locked', ['default', 'locked'], .3],
  ['hover and keyboard focus adaptation', ['hover'], 1],
  ['pressed', ['pressed'], 1],
]) test('header plus/minus uses source text RGB tint: ' + name, () => {
  const buttons = sourceJSON('ui_template_buttons.json')['light_content_button@light_button_assets'];
  const globals = sourceJSON('_global_variables.json'), content = resourceSource.selected_packs_title_content;
  assert.equal(resourceSource['selected_packs_title_button@common_buttons.light_content_button'].$button_content, 'resource_packs.selected_packs_title_content');
  for (const sign of ['plus', 'minus']) {
    const node = content.controls.find(value => value[sign + '_panel'])[sign + '_panel'].controls[0][sign + '@resource_packs.' + sign + '_image'];
    assert.equal(node.color, '$text_color'); assert.deepEqual(node.size, [10, 10]); assert.deepEqual(node.offset, [-2, 0]);
  }
  for (const state of states) {
    const binding = buttons.controls.find(value => value[state + '@$button_state_panel'])[state + '@$button_state_panel'].$text_color;
    const token = state === 'default' ? buttons[binding + '|default'] : binding;
    assert.deepEqual(globals[token], [rgb, rgb, rgb]);
  }
  const css = readFileSync(path.join(root, 'src/resource-packs.css'), 'utf8');
  const base = '.mc-resource-packs-section__toggle>.mc-image{filter:brightness(.3)}';
  const active = '.mc-resource-packs-button:not(:disabled):is(:hover,:focus-visible,:active) .mc-resource-packs-section__toggle>.mc-image{filter:brightness(1)}';
  assert(css.includes(base)); assert(css.includes(active));
  for (const rule of css.matchAll(/([^{}]*mc-resource-packs-section__toggle[^{}]*)\{([^{}]*)\}/g)) assert(!/\bopacity\s*:/.test(rule[2]), 'RGB brightness must preserve the original PNG alpha');
});

for (const [index, peer] of peers.entries()) {
  const React = peer('react'), ssr = peer('react-dom/server').renderToStaticMarkup, el = React.createElement, load = loader(peer), ui = load('src/resource-packs.tsx'), data = load('demo/resource-pack-data.ts');
  const major = index === 0 ? 18 : 19; assert.equal(Number(React.version.split('.')[0]), major);
  test('three actual source profiles, all five factories and explicit targets SSR (React ' + React.version + ')', () => {
    for (const profile of ['global', 'level', 'addon']) {
      const p = data.createResourcePackDemoProps(profile), html = ssr(el(ui.ResourcePackManager, p)), source = sourceProfiles[profile];
      assert(html.includes('data-source-profile="' + profile + '"')); assert(html.includes('data-native-certified="false"'));
      for (const kind of kinds) {assert(html.includes('data-pack-kind="' + kind + '"')); assert(html.includes('data-source-collection="' + source['$' + kind + '_pack_items'] + '"')); assert(html.includes('data-pack-target="' + source['$button.' + kind + '_pack'] + '"'));}
      for (const kind of kinds.slice(0, 4)) assert(html.includes('data-source-target="' + source['$button.expand_' + kind] + '"'));
      assert(html.includes('button.move_left_' + profile)); assert(html.includes('width:660px'));
      assert(!html.includes('payload="')); assert(!html.includes('capacity="[object')); assert(!html.includes('<dialog')); assert(!html.includes('mc-scroll-area'));
    }
  });
  test('header accessible name uses unchanged visible source title/count, without a generated override (React ' + React.version + ')', () => {
    for (const profile of ['global', 'level', 'addon']) {
      const p = data.createResourcePackDemoProps(profile), source = sourceProfiles[profile], html = ssr(el(ui.ResourcePackManager, p));
      const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
      for (const kind of kinds.slice(0, 4)) {
        const match = buttons.find(button => button[1].includes('data-source-target="' + source['$button.expand_' + kind] + '"'));
        assert(match, kind + ' real source expansion button'); assert(!/\baria-label(?:ledby)?=/.test(match[1]), 'visible label owns its default accessible name');
        assert(match[2].includes('mc-resource-packs-section__title">' + p.labels[kind] + '</span>'));
        assert(match[2].includes('mc-resource-packs-section__count">' + p.collections[kind].count + '</span>'));
        for (const image of match[2].matchAll(/<img\b[^>]*>/g)) assert(/\balt=""/.test(image[0]), 'source glyphs remain decorative');
      }
    }
    const p = data.createResourcePackDemoProps(), own = ssr(el(ui.ResourcePackSection, {...sectionProps(p), 'aria-label': 'Caller section region'}));
    assert(/<div\s[^>]*aria-label="Caller section region"[^>]*data-source-section="selected"/.test(own), 'caller native root ARIA stays forwarded, including React19 resource preloads');
    assert(own.includes('aria-label="' + p.labels.selectedDiagnostics + '"'), 'separate diagnostic button retains its own name');
  });
  test('raw counts, row selected state and complete source capacity are independent (React ' + React.version + ')', () => {
    const p = data.createResourcePackDemoProps(), html = ssr(el(ui.ResourcePackManager, p));
    for (const count of ['17', '005', '8', '21']) assert(html.includes('mc-resource-packs-section__count">' + count));
    assert.equal((html.match(/data-source-capacity="1"/g) ?? []).length, 5);
    assert(html.includes('data-pack-kind="selected" data-row-selected="true"'));
    p.collections.selected.items[0].bindings.isSelected = false; p.collections.selected.items[0].actions.bindings.isSelected = false;
    assert(ssr(el(ui.ResourcePackManager, p)).includes('data-pack-kind="selected" data-row-selected="false"'));
    const before = JSON.stringify(p); ssr(el(ui.ResourcePackManager, p)); assert.equal(JSON.stringify(p), before);
  });
  test('actual source logical order, fixed blank pads and separate default44 row survive (React ' + React.version + ')', () => {
    const p = data.createResourcePackDemoProps('level'); p.bindings.worldTemplateLocked = true; p.bindings.addonStackingWarningVisible = true;
    const html = ssr(el(ui.ResourcePackManager, p)); let previous = -1;
    for (const name of ['world_template_option_lock_panel', 'top_panel', 'offset_0', 'addon_stacking_warning_panel', 'offset_1', 'selected_packs_title_panel', 'selected_pack_section', 'offset_2', 'available_packs_title_panel', 'available_packs_section', 'offset_3', 'realms_packs_title_button', 'realms_packs_section', 'offset_4', 'unowned_packs_title_button', 'unowned_packs_section']) {const at = html.indexOf('data-source-control="' + name + '"'); assert(at > previous, name); previous = at;}
    assert(html.includes('data-source-control="selected_pack_section.default_item"')); assert(html.includes('width:656px;height:88px'));
    assert(html.includes('height:46px')); assert(html.includes('data-source-target="button.addonLink"'));
    assert(!html.includes('available_panel')); assert(!html.includes('resource_packs.error_panel'));
  });
  test('independent headers, factory expansion, empty/invalid and education branches SSR (React ' + React.version + ')', () => {
    const p = data.createResourcePackDemoProps(); p.bindings.realmsVisible = false; p.bindings.realmsGridVisible = true;
    p.bindings.noAvailablePacks = true; p.bindings.unownedVisible = false;
    let html = ssr(el(ui.ResourcePackManager, p));
    assert(html.includes('data-source-control="realms_packs_title_button" hidden=""')); assert(html.includes('data-pack-kind="realms"'));
    assert(html.includes('No available packs')); assert(html.includes('data-pack-kind="invalid"')); assert(html.includes('data-pack-kind="available"'));
    assert(!html.includes('>Open store<'));
    p.provider.educationEdition = true; html = ssr(el(ui.ResourcePackManager, p)); assert(!html.includes('data-source-section="unowned"')); assert(!html.includes('No available packs'));
    const section = sectionProps(p); section.expanded = false; html = ssr(el(ui.ResourcePackSection, section));
    assert(html.includes('data-source-control="selected_pack_section" hidden=""')); assert(html.includes('selected-example-0')); assert(html.includes('selected_pack_section.default_item'));
  });
  test('checkbox raw parent enabled is not inverted and only exact level source profile mounts it (React ' + React.version + ')', () => {
    for (const profile of ['global', 'level', 'addon']) for (const parent of [false, true]) for (const own of [false, true]) {
      const p = data.createResourcePackDemoProps(profile); p.bindings.forcePackDownloadLocked = parent; p.bindings.forceUserAgreementEnabled = own;
      const html = ssr(el(ui.ResourcePackManager, p)); assert.equal(html.includes('type="checkbox"'), profile === 'level');
      if (profile === 'level') {const input = html.match(/<input\b[^>]*type="checkbox"[^>]*>/)[0]; assert.equal(input.includes('disabled=""'), !parent || !own); assert(html.includes('data-source-parent-enabled="' + parent + '"')); assert(html.includes('checkbox_checkDisabled.png'));
        assert(html.includes('width:20px;height:20px'));}
    }
  });
  test('explicit natural row and warning intrinsic extents never become fixed50 wrappers (React ' + React.version + ')', () => {
    const p = data.createResourcePackDemoProps(); p.collections.available.items[0].layout.mainHeight = 100; p.collections.available.items[0].layout.contentHeight = 98;
    const html = ssr(el(ui.ResourcePackManager, p)); assert(html.includes('height:214px;min-height:100px')); //100+2+1+4, then scale2
    for (const patch of [{width: 0}, {scale: 0}, {scale: 1.2}, {profile: 'guessed'}, {provider: {}}, {bindings: {}}, {labels: {}}, {children: 'Fake complete screen'}, {dangerouslySetInnerHTML: {__html: 'x'}}]) assert.throws(() => ssr(el(ui.ResourcePackManager, {...p, ...patch})), e => e instanceof TypeError || e instanceof RangeError);
    for (const alter of [q => {q.collections.invalid.capacity = 2;}, q => {q.collections.selected.items[0].index = 4;}, q => {q.collections.selected.count = 4;}, q => {q.bindings.addonStackingWarningVisible = true; q.layout = {};}, q => {q.provider.isWorldEdit = true; q.bindings.worldTemplateLocked = true; q.layout = {};}, q => {q.collections.selected.items[0].layout.mainHeight = Infinity;}]) {const q = data.createResourcePackDemoProps(); alter(q); assert.throws(() => ssr(el(ui.ResourcePackManager, q)), e => e instanceof TypeError || e instanceof RangeError);}
  });
  test('source SSR does zero IO, timers, effects, semantic notifications and ref mutations (React ' + React.version + ')', () => {
    const saved = new Map(), warnings = [], oldError = console.error; let effects = 0; console.error = (...args) => warnings.push(args);
    for (const name of ['fetch', 'Image', 'createImageBitmap', 'OffscreenCanvas', 'requestAnimationFrame', 'setTimeout', 'setInterval']) {saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, {configurable: true, value() {throw Error('Unexpected SSR IO ' + name);}});}
    try {const p = data.createResourcePackDemoProps('level'), ref = {current: null}; const html = ssr(el(ui.ResourcePackManager, {...p, ref, onAction: () => effects++})); assert(html.includes('resource_packs.selected_stack_panel')); assert.equal(ref.current, null); assert.equal(effects, 0); assert.deepEqual(warnings, []);}
    finally {console.error = oldError; for (const [name, descriptor] of saved) {if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];}}
  });
}

function walk(node, predicate, found = []) {if (!node || typeof node !== 'object') return found; if (predicate(node)) found.push(node); for (const child of Array.isArray(node.props?.children) ? node.props.children.flat(Infinity) : [node.props?.children]) walk(child, predicate, found); return found;}
function harness() {
  let cursor = 0, slots = [], effects = []; const stores = new Map(), jsx = (type, props, key) => ({type, props, key});
  const React = {forwardRef: render => ({render}), useRef: value => slots[cursor++] ?? (slots[cursor - 1] = {current: value}), useState: initial => {const i = cursor++; slots[i] ??= {value: initial}; return [slots[i].value, next => {slots[i].value = next;}];}, useId: () => ':cpu:', useCallback: fn => fn, useEffect: effect => effects.push(effect), useLayoutEffect: effect => effects.push(effect)};
  const peer = id => id === 'react' ? React : id === 'react/jsx-runtime' ? {jsx, jsxs: jsx, Fragment: Symbol('Fragment')} : require(id), load = loader(peer), ui = load('src/resource-packs.tsx'), data = load('demo/resource-pack-data.ts');
  return {ui, data, render(type, props, ref, key = type) {slots = stores.get(key) ?? []; stores.set(key, slots); cursor = 0; effects = []; const view = typeof type === 'function' ? type(props) : type.render(props, ref); const pending = effects; effects = []; for (const effect of pending) effect(); return view;}};
}
function clock() {const tasks = [], micro = [], doc = {defaultView: {setTimeout: fn => tasks.push(fn), queueMicrotask: fn => micro.push(fn)}}; return {doc, flush() {while (tasks.length) tasks.shift()(); while (micro.length) micro.shift()();}};}
function node(doc) {return {ownerDocument: doc, isConnected: true, disabled: false, checked: false, closest: () => null};}
function event(owner, extra = {}) {return {target: owner, currentTarget: owner, defaultPrevented: false, nativeEvent: {defaultPrevented: false}, persist() {}, preventDefault() {this.defaultPrevented = true; this.nativeEvent.defaultPrevented = true;}, isDefaultPrevented() {return this.defaultPrevented;}, isPropagationStopped() {return false;}, ...extra};}
function header(h, props, key = 'header') {const section = h.render(h.ui.ResourcePackSection, props), child = walk(section, n => n.type?.name === 'SourceButton')[0]; return {child, button: h.render(child.type, child.props, undefined, key)};}

test('CPU header requests preserve native document veto and stable source target/currentTarget', () => {
  const h = harness(), c = clock(), observed = [], p = {...sectionProps(h.data.createResourcePackDemoProps()), onAction: d => observed.push(d)}, mounted = header(h, p), owner = node(c.doc);
  mounted.button.props.ref(owner); const veto = event(owner); mounted.button.props.onClick(veto); veto.nativeEvent.defaultPrevented = true; c.flush(); assert.equal(observed.length, 0);
  const accepted = event(owner); mounted.button.props.onClick(accepted); accepted.currentTarget = null; c.flush(); assert.equal(observed.length, 1); assert.equal(observed[0].target, 'button.expand_selected_global'); assert.equal(observed[0].event.currentTarget, owner); assert.equal(observed[0].control, owner); assert.equal(p.expanded, true);
});
test('CPU queued header guards committed readonly/disabled/identity/hidden/inert and actual ref unmount', () => {
  for (const mode of ['readOnly', 'disabled', 'identity', 'hidden', 'inert', 'unmount']) {
    const h = harness(), c = clock(), observed = [], p = {...sectionProps(h.data.createResourcePackDemoProps()), onAction: d => observed.push(d)}, mounted = header(h, p), owner = node(c.doc); mounted.button.props.ref(owner); mounted.button.props.onClick(event(owner));
    if (mode === 'readOnly' || mode === 'disabled') h.render(mounted.child.type, {...mounted.child.props, [mode]: true}, undefined, 'header');
    else if (mode === 'identity') h.render(mounted.child.type, {...mounted.child.props, request: {...mounted.child.props.request, profile: 'level', target: 'button.expand_selected_level'}}, undefined, 'header');
    else if (mode === 'unmount') mounted.button.props.ref(null); else owner.closest = () => ({});
    c.flush(); assert.equal(observed.length, 0, mode);
  }
});
test('CPU source agreement remains accepted-controlled and observes raw enable/native veto guards', () => {
  const h = harness(), c = clock(), observed = [], p = h.data.createResourcePackDemoProps('level'); p.onAction = detail => observed.push(detail);
  const manager = h.render(h.ui.ResourcePackManager, p), agreement = walk(manager, n => n.type?.name === 'Agreement')[0], view = h.render(agreement.type, agreement.props, undefined, 'agreement'), input = walk(view, n => n.type === 'input')[0], owner = node(c.doc); input.props.ref(owner);
  const veto = event(owner); input.props.onChange(veto); veto.nativeEvent.defaultPrevented = true; c.flush(); assert.equal(observed.length, 0);
  const accepted = event(owner); input.props.onChange(accepted); c.flush(); assert.equal(observed.length, 1); assert.equal(observed[0].target, '#force_user_agreement_level'); assert.equal(observed[0].checked, false); assert.equal(p.bindings.forceUserAgreement, true);
  input.props.onChange(event(owner)); h.render(agreement.type, {p: {...p, readOnly: true}}, undefined, 'agreement'); c.flush(); assert.equal(observed.length, 1);
});
test('CPU forwarded root refs honor callback cleanup without relying on React19 execution', () => {
  const h = harness(), p = h.data.createResourcePackDemoProps(), observed = [], ref = value => {observed.push(value); return () => observed.push('cleanup');};
  const manager = h.render(h.ui.ResourcePackManager, p, ref), section = h.render(h.ui.ResourcePackSection, sectionProps(p), ref, 'section');
  for (const value of [manager, section]) {value.props.ref({}); value.props.ref(null);}
  assert.equal(observed.filter(value => value === 'cleanup').length, 2);
});
test('public Manager/Section types require full snapshots and reject invented screen/children/ref APIs', () => {
  const file = path.join(root, 'tests', '__resource_pack_manager_contract__.tsx'), fixture = `import {createRef} from 'react'; import {ResourcePackManager,ResourcePackSection} from '../src/resource-packs'; import type {ResourcePackManagerProps,ResourcePackSectionProps} from '../src/resource-packs'; import {createResourcePackDemoProps} from '../demo/resource-pack-data';
 const p=createResourcePackDemoProps('level'); export const valid=<ResourcePackManager {...p} ref={createRef<HTMLDivElement>()}/>;const s:ResourcePackSectionProps={profile:'global',kind:'selected',width:330,scale:2,title:'Active',titleVisible:true,expanded:false,collection:p.collections.selected,defaultItem:p.defaultItem,diagnostics:{visible:false,anyErrors:false,anyWarnings:false,label:'Diagnostics'}};export const section=<ResourcePackSection {...s} ref={createRef<HTMLDivElement>()}/>;
 // @ts-expect-error source profile is finite
 const profile:ResourcePackManagerProps={...p,profile:'all-bedrock'};
 // @ts-expect-error raw header count is literal text
 const count:ResourcePackManagerProps={...p,collections:{...p.collections,selected:{...p.collections.selected,count:7}}};
 // @ts-expect-error required source bindings are complete
 const flags:ResourcePackManagerProps={...p,bindings:{selectedGridVisible:true}};
 // @ts-expect-error not an arbitrary generic children screen
 const children=<ResourcePackManager {...p}>Host complete GUI</ResourcePackManager>;
 // @ts-expect-error real Manager div cannot be buttonref
 const ref=<ResourcePackManager {...p} ref={createRef<HTMLButtonElement>()}/>;
 // @ts-expect-error available source section requires independent invalid factory and empty inputs
 const available:ResourcePackSectionProps={...s,kind:'available'};
 void profile;void count;void flags;void children;void ref;void available;`;
  const options = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.ReactJSX, strict: true, noEmit: true, skipLibCheck: true}, host = ts.createCompilerHost(options), get = host.getSourceFile.bind(host);
  host.getSourceFile = (name, ...args) => path.resolve(name) === file ? ts.createSourceFile(file, fixture, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX) : get(name, ...args);
  const program = ts.createProgram([file], options, host), diagnostics = ts.getPreEmitDiagnostics(program); assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {getCanonicalFileName: f => f, getCurrentDirectory: () => root, getNewLine: () => '\n'}));
});
