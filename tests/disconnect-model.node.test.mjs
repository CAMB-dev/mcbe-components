import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { build } from 'esbuild';

const directory = new URL('../.cache/disconnect-model-20261103-01/', import.meta.url); await mkdir(directory, { recursive: true });
const entry = fileURLToPath(new URL('../src/disconnect-data.ts', import.meta.url));
const built = await build({ entryPoints: [entry], platform: 'node', format: 'esm', bundle: true, write: false, target: 'es2022' });
const output = new URL(`model-${process.pid}.mjs`, directory); await writeFile(output, built.outputFiles[0].contents);
const { snapshotDisconnectLayout: snapshotLayout, snapshotDisconnectModel: snapshotModel, validateDisconnectBackground: background, planDisconnectActions: plan, disconnectIntent: intent } = await import(output.href);
const layout = () => ({ size: [400, 300], scale: 2, hiddenSlots: 'reserve', rowAlignment: 'center', uriButtonAnchor: 'top-center', textAlignment: 'center', textVerticalAlignment: 'top', font: { family: "'MCBE Pixel', monospace", size: 9, lineHeight: 10 } });
const state = (label, visible = true, enabled = true) => ({ label, visible, enabled });
const ordinary = () => ({ variant: 'disconnect', ok: state('Host OK'), openAccount: state('Host account help') });
const realm = () => ({ variant: 'realms-disconnect', back: state('Host Back'), store: state('Host Store'), storeIgnored: false, openAccount: state('Host account help') });
const warning = () => ({ variant: 'realms-warning', continue: state('Host Continue'), store: state('Host Store'), storeIgnored: false, cancel: state('Host Cancel') });
const boxes = result => Object.fromEntries(result.buttons.map(button => [button.kind, button.box]));

test('ordinary source stack ends at.8H with independent URI30 and OK26 holders', () => {
  const p = plan(layout(), ordinary()); assert.deepEqual(boxes(p), { 'open-account': [100, 184, 200, 26], ok: [136, 214, 128, 26] });
  assert.deepEqual(p.frameSize, [800, 600]); assert.equal(p.style.width, 800); assert.equal(p.style.height, 600); assert.equal(p.style.fontSize, 18); assert.equal(p.style.lineHeight, '20px');
  assert.equal(p.style.fontFamily, "'MCBE Pixel', monospace");
});
test('URI top-center/center is an explicit2-unit holder placement choice, not an inferred native default', () => {
  const top = boxes(plan(layout(), ordinary())), center = boxes(plan({ ...layout(), uriButtonAnchor: 'center' }, ordinary()));
  assert.equal(center['open-account'][1], 186); assert.deepEqual(center.ok, top.ok);
});
test('ordinary hidden URI reserve retains invisible box, collapse removes only that source-bound holder', () => {
  const model = ordinary(); model.openAccount.visible = false;
  const reserved = plan(layout(), model), collapsed = plan({ ...layout(), hiddenSlots: 'collapse' }, model);
  assert.equal(reserved.buttons.find(b => b.kind === 'open-account').state.visible, false); assert.equal(collapsed.buttons.some(b => b.kind === 'open-account'), false);
  assert.deepEqual(boxes(reserved).ok, [136, 214, 128, 26]); assert.deepEqual(boxes(collapsed).ok, [136, 214, 128, 26]);
});
test('host-hidden OK does not invent a source holder binding: its26-unit holder remains in collapse mode', () => {
  const model = ordinary(); model.ok.visible = false; const p = plan({ ...layout(), hiddenSlots: 'collapse' }, model);
  assert.deepEqual(boxes(p), { 'open-account': [100, 184, 200, 26] });
});
test('Realms Disconnect is centered atH/2+30 with fixed30-unit row and authored5-unit horizontal gap', () => {
  assert.deepEqual(boxes(plan(layout(), realm())), { 'open-account': [100, 150, 200, 26], store: [69.5, 180, 128, 26], back: [202.5, 180, 128, 26] });
  const left = boxes(plan({ ...layout(), rowAlignment: 'left' }, realm())); assert.deepEqual(left.store, [0, 180, 128, 26]); assert.deepEqual(left.back, [133, 180, 128, 26]);
});
test('ignored Store removes only its node: both left and center rows retain the gap5 before Back', () => {
  const model = realm(); model.storeIgnored = true;
  assert.deepEqual(boxes(plan({ ...layout(), rowAlignment: 'left' }, model)).back, [5, 180, 128, 26]);
  const centered = boxes(plan(layout(), model)); assert.equal(centered.store, undefined); assert.deepEqual(centered.back, [138.5, 180, 128, 26]);
});
test('collapse changes horizontal hidden-node width but does not collapse the source Realms row holder', () => {
  const model = realm(); model.store.visible = false;
  const reserved = plan({ ...layout(), rowAlignment: 'left' }, model), collapsed = plan({ ...layout(), rowAlignment: 'left', hiddenSlots: 'collapse' }, model);
  assert.deepEqual(boxes(reserved).back, [133, 180, 128, 26]); assert.deepEqual(boxes(collapsed).back, [5, 180, 128, 26]);
  model.back.visible = false; const emptyRow = boxes(plan({ ...layout(), hiddenSlots: 'collapse' }, model)); assert.deepEqual(emptyRow, { 'open-account': [100, 150, 200, 26] });
  model.openAccount.visible = false; model.back.visible = true; assert.deepEqual(boxes(plan({ ...layout(), hiddenSlots: 'collapse' }, model)).back, [138.5, 165, 128, 26]);
});
test('warning preserves its26+5+26 vertical stack and256 Cancel independently of Store/Continue visibility', () => {
  const p = plan(layout(), warning()); assert.deepEqual(boxes(p), { store: [69.5, 151.5, 128, 26], continue: [202.5, 151.5, 128, 26], cancel: [72, 182.5, 256, 26] });
  const model = warning(); model.storeIgnored = true; model.continue.visible = false;
  assert.deepEqual(boxes(plan({ ...layout(), hiddenSlots: 'collapse' }, model)), { cancel: [72, 182.5, 256, 26] });
  model.storeIgnored = false; model.store.visible = true; model.cancel.visible = false; assert.deepEqual(boxes(plan({ ...layout(), hiddenSlots: 'collapse' }, model)).store, [133.5, 151.5, 128, 26]);
});
test('source enabled/visible flags remain independent; planning does not infer ignored Store or selected platform', () => {
  for (const visible of [false, true]) for (const enabled of [false, true]) {
    const model = warning(); model.store = state('Raw host Store', visible, enabled); const p = plan(layout(), model), store = p.buttons.find(b => b.kind === 'store');
    assert.ok(store); assert.equal(store.state.visible, visible); assert.equal(store.state.enabled, enabled); assert.equal(store.state.label, 'Raw host Store');
  }
});
test('snapshots and plans are fresh deeply frozen copies without freezing or capturing caller records', () => {
  const l = layout(), m = realm(), copiedLayout = snapshotLayout(l), copiedModel = snapshotModel(m), p = plan(l, m);
  for (const item of [copiedLayout, copiedLayout.size, copiedLayout.font, copiedModel, copiedModel.store, copiedModel.openAccount, p, p.buttons, p.frameSize, p.style, ...p.buttons.flatMap(b => [b, b.box, b.state])]) assert.ok(Object.isFrozen(item));
  assert.notEqual(copiedLayout, l); assert.notEqual(copiedLayout.size, l.size); assert.notEqual(copiedLayout.font, l.font); assert.notEqual(copiedModel.store, m.store);
  assert.ok(!Object.isFrozen(l) && !Object.isFrozen(m));
  l.size[0] = 999; l.font.family = 'mutated'; m.store.label = 'mutated'; m.store.visible = false;
  assert.deepEqual(copiedLayout.size, [400, 300]); assert.equal(copiedLayout.font.family, "'MCBE Pixel', monospace"); assert.equal(copiedModel.store.label, 'Host Store'); assert.equal(p.buttons.find(b => b.kind === 'store').state.visible, true);
  assert.throws(() => { p.buttons[0].box[0] = 9; }, TypeError);
});
test('frame validation accepts exact physical boundaries and rejects sparse, fractional, oversized or overflowing frames', () => {
  for (const size of [[8192, 2048], [4096, 4096]]) assert.deepEqual(snapshotLayout({ ...layout(), size, scale: 1 }).size, size);
  assert.deepEqual(snapshotLayout({ ...layout(), size: [400.5, 300.5] }).size, [400.5, 300.5]);
  for (const size of [new Array(2), [1], [0, 300], [-1, 300], [NaN, 300], [Infinity, 300], [8193, 1], [8192, 2049], [400.25, 300]]) assert.throws(() => snapshotLayout({ ...layout(), size, scale: size[0] > 8000 ? 1 : 2 }));
  for (const scale of [0, -1, .5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => snapshotLayout({ ...layout(), scale }));
});
test('all explicit Web policies and font metrics validate without guessing alignments or accepting broken declarations', () => {
  for (const patch of [{ hiddenSlots: 'auto' }, { rowAlignment: 'right' }, { uriButtonAnchor: 'bottom' }, { textAlignment: 'justify' }, { textVerticalAlignment: 'bottom' }, { font: { family: '', size: 9, lineHeight: 10 } }, { font: { family: 'a\nb', size: 9, lineHeight: 10 } }, { font: { family: 'font', size: 0, lineHeight: 10 } }, { font: { family: 'font', size: 9, lineHeight: Infinity } }]) assert.throws(() => snapshotLayout({ ...layout(), ...patch }));
  const l = layout(); delete l.textAlignment; assert.throws(() => snapshotLayout(l), /textAlignment/);
  for (const model of [null, { variant: 'other' }, { ...ordinary(), ok: { label: 'OK', visible: 0, enabled: true } }, { ...realm(), storeIgnored: 'false' }, { ...warning(), continue: undefined }]) assert.throws(() => snapshotModel(model));
});
test('accessors and inherited data are rejected without executing a caller getter, including sparse pair traps', () => {
  let getters = 0;
  const model = ordinary(); Object.defineProperty(model.ok, 'label', { get() { getters++; throw Error('getter ran'); } }); assert.throws(() => snapshotModel(model), /accessors/);
  const l = layout(); Object.defineProperty(l.size, '0', { get() { getters++; throw Error('array getter ran'); } }); assert.throws(() => snapshotLayout(l), /accessors/);
  const extra = layout(); Object.defineProperty(extra, 'unused', { get() { getters++; throw Error('extra getter ran'); } }); assert.throws(() => snapshotLayout(extra), /accessors/);
  assert.throws(() => snapshotLayout(Object.create(layout())), /plain data record/); assert.equal(getters, 0);
});
test('CSS background supports both requested samplings, GPU explicitly rejects bilinear, and origins are frozen bounded raw inputs', () => {
  for (const [renderer, sampling] of [['css', 'point'], ['css', 'bilinear'], ['gpu', 'point']]) {
    const input = { renderer, sampling, tileOrigin: [-32, -.25], originRounding: 'truncate' }, p = background(input); assert.deepEqual(p, input); assert.notEqual(p, input); assert.notEqual(p.tileOrigin, input.tileOrigin); assert.ok(Object.isFrozen(p) && Object.isFrozen(p.tileOrigin)); input.tileOrigin[0] = 0; assert.equal(p.tileOrigin[0], -32);
  }
  assert.throws(() => background({ renderer: 'gpu', sampling: 'bilinear', tileOrigin: [0, 0], originRounding: 'floor' }), /point sampling only/);
  for (const patch of [{ renderer: 'auto' }, { sampling: 'linear' }, { tileOrigin: new Array(2) }, { tileOrigin: [-32.1, 0] }, { tileOrigin: [0, .001] }, { tileOrigin: [NaN, 0] }, { originRounding: 'round' }]) assert.throws(() => background({ renderer: 'css', sampling: 'point', tileOrigin: [0, 0], originRounding: 'floor', ...patch }));
});
test('exact native IDs distinguish Realm Cancel from global menu_cancel and preserve the account-help URI intent', () => {
  const expected = [['disconnect', 'ok', 'leave', 'button.menu_leave_screen'], ['realms-disconnect', 'back', 'leave', 'button.menu_leave_screen'], ['realms-disconnect', 'store', 'check-store', 'button.menu_check_store'], ['realms-warning', 'continue', 'continue', 'button.menu_continue'], ['realms-warning', 'store', 'check-store', 'button.menu_check_store'], ['realms-warning', 'cancel', 'cancel-realm-join', 'button.cancel_join_realm']];
  for (const [variant, kind, action, buttonId] of expected) { const p = intent(variant, kind, 'button'); assert.deepEqual(p, { variant, button: kind, source: 'button', action, buttonId }); assert.ok(Object.isFrozen(p)); }
  for (const variant of ['disconnect', 'realms-disconnect', 'realms-warning']) assert.deepEqual(intent(variant, null, 'menu-cancel'), { action: 'leave', buttonId: 'button.menu_leave_screen', variant, source: 'menu-cancel', button: null });
  for (const variant of ['disconnect', 'realms-disconnect']) assert.equal(intent(variant, 'open-account', 'button').uri, 'https://aka.ms/MCMultiplayerHelp');
  for (const args of [['disconnect', 'cancel', 'button'], ['realms-warning', 'ok', 'button'], ['disconnect', null, 'button'], ['realms-warning', 'cancel', 'menu-cancel'], ['other', null, 'menu-cancel']]) assert.throws(() => intent(...args));
});
test('module import and all pure paths need no React/GPU/browser/services or clock globals', async () => {
  const cjs = await build({ entryPoints: [entry], platform: 'node', format: 'cjs', bundle: true, write: false, target: 'es2022' });
  const sandbox = { module: { exports: {} }, exports: {} }, denied = ['window', 'document', 'navigator', 'Image', 'FontFace', 'OffscreenCanvas', 'fetch', 'XMLHttpRequest', 'setTimeout', 'setInterval', 'requestAnimationFrame', 'React', 'require']; let accesses = 0;
  for (const key of denied) Object.defineProperty(sandbox, key, { configurable: false, get() { accesses++; throw Error(`Pure data unexpectedly accessed ${key}`); } });
  const context = vm.createContext(sandbox); vm.runInContext(cjs.outputFiles[0].text, context);
  sandbox.serializedInputs = JSON.stringify({ layout: layout(), model: ordinary(), warning: warning(), background: { renderer: 'css', sampling: 'point', tileOrigin: [-1, 0], originRounding: 'floor' } });
  const result = vm.runInContext('const data=JSON.parse(serializedInputs);const count=module.exports.planDisconnectActions(data.layout,data.model).buttons.length;module.exports.snapshotDisconnectModel(data.warning);module.exports.validateDisconnectBackground(data.background);module.exports.disconnectIntent("realms-warning","cancel","button");count;', context);
  assert.equal(result, 2); assert.equal(accesses, 0);
  const raw = await readFile(new URL('../.cache/full-goal-audit-20261102-01/source/disconnect_screen.json', import.meta.url), 'utf8'); assert.match(raw, /"size": \[ 128, 26 \]/); assert.match(raw, /"size": \[ 5, 0 \]/); assert.ok(raw.includes('button.cancel_join_realm') && raw.includes('https://aka.ms/MCMultiplayerHelp'));
});
