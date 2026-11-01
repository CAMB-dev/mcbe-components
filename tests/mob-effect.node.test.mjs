import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = new URL('../.cache/mob-effect-formal-tests-01/runtime/', import.meta.url);
await mkdir(directory, { recursive: true });
const built = await build({ stdin: { contents: "export { MobEffectRow } from './src/mob-effect-row'; export { MobEffectScreen } from './src/mob-effect-screen'; export { resolveMobEffectScreenLayout, snapshotMobEffectEntries } from './src/mob-effect-layout'; export { inviteAssets } from './src/invite-assets';", resolveDir: root, sourcefile: 'mob-effect-node-entry.ts' },
  bundle: true, platform: 'node', format: 'esm', target: 'es2022', external: ['react', 'react/jsx-runtime'], write: false });
const target = fileURLToPath(new URL(`bundle-${process.pid}.mjs`, directory));
await writeFile(target, built.outputFiles[0].contents);
const { MobEffectRow, MobEffectScreen, resolveMobEffectScreenLayout, snapshotMobEffectEntries, inviteAssets } = await import(pathToFileURL(target).href);

// Self-authored host bindings and explicit Web metrics; no game install, source
// ZIP, native fonts, browser, timer provider, or screenshot golden is required.
const effect = (id, patch = {}) => ({ id, name: `Host ${id}`, timer: '1:23', ambient: false, icon: { kind: 'known-effect', effect: 'speed' }, ...patch });
const textProfile = () => ({ name: { fontSize: 8, lineHeight: 10, fontMode: 'auto' }, timer: { fontSize: 8, lineHeight: 10, fontFamily: 'Host timer face', shadow: false }, provenance: 'explicit-web-profile' });
const rowProps = () => ({ effect: effect('row'), scale: 2, textProfile: textProfile(), iconLayout: { kind: 'parent-percent-contain-web-policy' } });
const screenProps = () => ({ effects: [effect('second'), effect('first', { ambient: true, timer: '∞' })], gridDimensions: [2, 3], availableSize: [600, 200], scale: 2,
  sourceProfile: 'pocket', inputMode: 'mouse', closeButtonVisible: true, touchThumbVisible: false,
  textProfile: textProfile(), iconLayout: { kind: 'parent-percent-contain-web-policy' }, layoutPolicy: 'source-formulas-parent-percent-web',
  label: 'Host active effects', closeLabel: 'Continue', scrollLabel: 'Effect collection', onCloseRequested: () => {} });
const html = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
function opening(output, className) {
  const element = [...output.matchAll(/<[a-z][^>]*>/g)].find(match => /\bclass="([^"]*)"/.exec(match[0])?.[1].split(/\s+/).includes(className));
  assert(element, `Missing actual SSR element ${className}`); return element[0];
}
function rowIds(output) {
  return [...output.matchAll(/<div\b[^>]*\bclass="mc-mob-effect-row(?:\s[^"]*)?"[^>]*>/g)].map(match => /data-effect-id="([^"]*)"/.exec(match[0])?.[1]);
}

test('visible name and timer keep source anchors, colors and independent ambient state', () => {
  for (const scale of [1, 2, 3]) for (const ambient of [false, true]) {
    const props = rowProps(); props.scale = scale; props.effect.ambient = ambient;
    const output = html(MobEffectRow, props);
    assert(output.includes('Host row')); assert(output.includes('1:23'));
    const row = opening(output, 'mc-mob-effect-row'), name = opening(output, 'mc-mob-effect-row__name'), timer = opening(output, 'mc-mob-effect-row__timer');
    assert(row.includes(`width:${240 * scale}px;height:${30 * scale}px`));
    assert(name.includes(`left:${27 * scale}px;top:${5 * scale}px`));
    assert(name.includes('color:#ffffff')); assert(name.includes(`text-shadow:${scale}px ${scale}px 0 #000`));
    assert(timer.includes(`left:${27 * scale}px;top:${15 * scale}px`));
    assert(timer.includes('color:rgb(70% 70% 70%)')); assert(timer.includes('data-source-shadow="unspecified"'));
    assert(!timer.includes('hidden=')); assert(!row.includes('role="img"'));
  }
});

test('normal row reuses the original existing material while ambient uses the distinct list image', () => {
  const props = rowProps(), normal = html(MobEffectRow, props);
  // The reused Invite source is an inline whole PNG. Do not assume a filename.
  assert(normal.includes(inviteAssets.effect_background.url));
  assert(!normal.includes('effect_background_ambient.png'));
  props.effect.ambient = true; const ambient = html(MobEffectRow, props);
  assert(ambient.includes('effect_background_ambient.png'));
  assert(!ambient.includes(inviteAssets.effect_background.url));
  assert(ambient.includes('1:23'));
  for (const output of [normal, ambient]) assert(!output.includes('hud_mob_effect_background'));
});

test('Screen consumes ordered data and independent declared grid space without shrinking its rows', () => {
  const props = screenProps(); props.style = { width: 999, height: 999, overflow: 'scroll' };
  const output = html(MobEffectScreen, props);
  assert.deepEqual(rowIds(output), ['second', 'first']);
  assert.equal((output.match(/role="listitem"/g) ?? []).length, 2);
  assert(output.includes('Host second')); assert(output.includes('Host first')); assert(output.includes('∞'));
  assert(output.includes('data-grid-dimensions="2,3"'));
  assert(opening(output, 'mc-mob-effect-list__grid').includes('width:300px;height:180px'));
  assert(opening(output, 'mc-mob-effect-row').includes('width:480px;height:60px'));
  const frame = opening(output, 'mc-mob-effect-screen');
  assert(frame.includes('width:1200px;height:400px')); assert(frame.includes('overflow:clip'));
  assert(opening(output, 'mc-mob-effect-list').includes('overflow:clip'));
  assert(frame.includes('data-source-profile="pocket"')); assert(frame.includes('data-input-mode="mouse"'));
  assert(frame.includes('data-native-certified="false"'));
  assert(opening(output, 'mc-mob-effect-screen__close').includes('top:15px'));
});

test('declared empty rows remain real space and independent grid capacity bounds the collection', () => {
  const props = screenProps(); props.effects = []; props.gridDimensions = [1, 4];
  const layout = resolveMobEffectScreenLayout({ ...props, effectCount: 0 });
  assert.deepEqual(layout.list.grid.size, [150, 120]); // Scroll root y2 leaves two logical units behind the fixed clip. The explicit
  // Web tail makes that final row reachable without changing grid/row geometry.
  assert.deepEqual(layout.list.grid.contentSize, [528, 126]);
  assert.equal(layout.list.grid.cells.length, 0); assert.deepEqual(layout.closeButton, [544, 7.5, 18, 18]);
  const output = html(MobEffectScreen, props);
  assert.deepEqual(rowIds(output), []); assert(output.includes('height:252px'));
  props.effects = [effect('present')]; props.gridDimensions = [0, 4];
  assert.throws(() => html(MobEffectScreen, props), /capacity/);
  assert.throws(() => snapshotMobEffectEntries([effect('same'), effect('same')], [1, 2]), /Duplicate/);
});

test('glyph seam retains owned label boxes and one literal accessible text alternative', () => {
  const props = rowProps(); props.effect.name = ' 速度 <Host> §k '; props.effect.timer = '∞';
  const contexts = [];
  props.renderText = (value, context) => { contexts.push({ value, context }); return React.createElement('b', { 'data-host-glyph': context.kind }, 'Host glyph'); };
  const output = html(MobEffectRow, props);
  assert.deepEqual(contexts.map(item => [item.value, item.context.kind, item.context.effectId]), [[' 速度 <Host> §k ', 'name', 'row'], ['∞', 'timer', 'row']]);
  assert(contexts.every(item => Object.isFrozen(item.context) && Object.isFrozen(item.context.font)));
  assert.notEqual(contexts[0].context.font, props.textProfile.name);
  assert.equal(contexts[0].context.shadow, true); assert.equal(contexts[1].context.shadow, false);
  assert(contexts[0].context.font.fontFamily.includes('mc-font-unicode'));
  assert(output.includes('aria-hidden="true"><b data-host-glyph="name"'));
  assert(output.includes('mc-mob-effect-row__text-alt"> 速度 &lt;Host&gt; §k '));
  assert(!output.includes('<Host>')); assert(!output.includes('role="img"'));
});

test('a bad sibling is rejected before the first host glyph renderer is invoked', () => {
  const props = screenProps(); let calls = 0;
  props.effects[1].icon = { kind: 'known-effect', effect: 'not-a-bedrock-effect' };
  props.renderText = () => { calls++; return null; };
  assert.throws(() => html(MobEffectScreen, props), /BedrockStatusEffect/);
  assert.equal(calls, 0);
});

test('host rendering mutations cannot change validated siblings, profiles or Screen geometry', () => {
  const props = screenProps(), originalRows = [...props.effects], contexts = [];
  props.renderText = (value, context) => {
    contexts.push({ value, context });
    props.effects[1].name = 'MUTATED'; props.effects[1].timer = 'MUTATED'; props.effects[1].icon = { kind: 'known-effect', effect: 'not-real' };
    props.textProfile.timer.shadow = true; props.textProfile.name.fontSize = 300;
    props.availableSize[0] = -1; props.gridDimensions[0] = 0;
    return React.createElement('span', null, 'Visible glyph ' + context.effectId);
  };
  const output = html(MobEffectScreen, props);
  assert.deepEqual(contexts.map(item => item.value), ['Host second', '1:23', 'Host first', '∞']);
  assert.deepEqual(contexts.map(item => item.context.shadow), [true, false, true, false]);
  assert(contexts.every(item => item.context.font.fontSize === 8));
  assert.deepEqual(rowIds(output), originalRows.map(item => item.id));
  assert(opening(output, 'mc-mob-effect-screen').includes('width:1200px;height:400px'));
  assert(output.includes('data-grid-dimensions="2,3"'));
  assert(!output.includes('MUTATED'));
});

test('real Row and Screen SSR neither dispatch input/close tasks nor attach object or callback refs', () => {
  const refs = Array.from({ length: 6 }, () => React.createRef());
  const original = { fetch: globalThis.fetch, timeout: globalThis.setTimeout, interval: globalThis.setInterval };
  let io = 0, input = 0, close = 0, callbackRefs = 0;
  const callbackRef = () => { callbackRefs++; return () => { callbackRefs++; }; };
  try {
    globalThis.fetch = () => { io++; throw new Error('SSR must not fetch'); };
    globalThis.setTimeout = () => { io++; throw new Error('SSR must not enqueue an owner task'); };
    globalThis.setInterval = () => { io++; throw new Error('SSR must not start a timer provider'); };
    const props = screenProps();
    Object.assign(props, { ref: refs[0], viewportRef: refs[1], closeRef: refs[2], controllerRef: refs[3], rowRefs: { second: refs[4], first: callbackRef },
      onCloseRequested: () => close++, onKeyDown: () => input++, onCompositionStart: () => input++ });
    html(MobEffectScreen, props);
    html(MobEffectRow, { ...rowProps(), ref: refs[5], onClick: () => input++ });
    html(MobEffectRow, { ...rowProps(), ref: callbackRef });
    html(MobEffectScreen, { ...screenProps(), ref: callbackRef, viewportRef: callbackRef, closeRef: callbackRef, controllerRef: callbackRef, onCloseRequested: () => close++ });
  } finally { globalThis.fetch = original.fetch; globalThis.setTimeout = original.timeout; globalThis.setInterval = original.interval; }
  assert.equal(io, 0); assert.equal(input, 0); assert.equal(close, 0); assert.equal(callbackRefs, 0);
  assert(refs.every(ref => ref.current === null));
});

test('opaque children and HTML cannot replace Row or Screen collection rendering', () => {
  for (const [Component, props] of [[MobEffectRow, rowProps()], [MobEffectScreen, screenProps()]]) {
    for (const content of [{ children: React.createElement('div', null, 'Opaque renderer') }, { dangerouslySetInnerHTML: { __html: '<b>Opaque renderer</b>' } }])
      assert.throws(() => html(Component, { ...props, ...content }), TypeError);
  }
});

test('host whole images use explicit contain geometry and single-line text rejects rather than strips newlines', () => {
  const props = rowProps(); props.effect.icon = { kind: 'whole-image', src: '/authored-whole-image.png', naturalSize: [36, 18] };
  let output = html(MobEffectRow, props);
  assert(output.includes('src="/authored-whole-image.png"')); assert(output.includes('width="72" height="36"'));
  assert(opening(output, 'mc-mob-effect-row__icon').includes('left:-6px;top:10px'));
  assert(!output.includes('object-fit:cover'));
  props.effect.name = 'First\nSecond'; assert.throws(() => html(MobEffectRow, props), /literal single line/);
  assert.equal(props.effect.name, 'First\nSecond');
});
