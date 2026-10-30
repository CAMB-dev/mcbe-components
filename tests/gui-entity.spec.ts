import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PNG } from 'pngjs';
import { runInNewContext } from 'node:vm';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { GuiLayer, createNpcEntity, npcSkinNames, npcAppearanceOptions, renderGuiLayer } from '../src';
import type { GuiEntitySource, GuiLayerProps, GuiNpcPortraitMaterial, NpcEntityOptions, NpcAppearanceOption } from '../src';
import type { EntityFixtureOptions } from '../demo/gui-entity-fixture';

// Finite authored test boxes. No captured vertices, native matrices, screenshot
// expected fields, private compiler or camera helper enters these contracts.
const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const translated = (z = 0, x = 0) => { const m = identity(); m[14] = z; m[12] = x; return m; };
const projection = () => [1 / 32, 0, 0, 0, 0, 1 / 32, 0, 0, 0, 0, 1 / 64, 0, 0, 0, .25, 1];
function source(visible = true): GuiEntitySource {
  return { profile: 'npc-box64-rigid', textureSize: [64, 64], bones: [
    { name: 'box', pivot: [0, 0, 0], visible, cubes: [{ origin: [-8, -8, 0], size: [16, 16, 8], uv: [0, 0] }] },
  ] };
}
const solid = (size = 64, color = [255, 255, 255, 255]) => ({ width: size, height: size,
  rgba: Buffer.from(Array.from({ length: size * size }, () => color).flat()).toString('base64') });
const material = (color = [1, 0, 0]): GuiNpcPortraitMaterial => ({ kind: 'npc-portrait', tileLightColor: [1, 1, 1, 1],
  // Fully saturated explicit fog makes an exact synthetic color independent of
  // normal lighting/float shader arithmetic. This is no native material claim.
  fogControl: [-2, -1, 1], fogColor: color as [number, number, number], materialColor: [1, 1, 1, 1], uvAnimation: [0, 0, 1, 1], subPixelOffset: [0, 0] });
function entity(extra: any = {}): any {
  return { kind: 'entity', source: source(), texture: solid(), bonePose: { box: identity() },
    model: identity(), view: identity(), projection: projection(), viewport: [0, 0, 64, 64], material: material(), ...extra };
}
const frame = (commands: any[], extra: Partial<EntityFixtureOptions> = {}): EntityFixtureOptions => ({ width: 64, height: 64, guiScale: 1, commands, ...extra });
function typed(command = entity()): Extract<GuiLayerProps['commands'][number], { kind: 'entity' }> {
  return { ...command, texture: typeof command.texture === 'string' ? command.texture : { width: command.texture.width, height: command.texture.height, data: Buffer.from(command.texture.rgba, 'base64') },
    model: new Float32Array(command.model), view: new Float32Array(command.view), projection: new Float32Array(command.projection),
    bonePose: Object.fromEntries(Object.entries(command.bonePose).map(([key, value]) => [key, new Float32Array(value as number[])])) };
}
function field(width = 64, height = 64) { return Buffer.alloc(width * height * 4); }
function rectangle(data: Uint8Array, width: number, box: readonly number[], color: readonly number[]) {
  for (let y = box[1]!; y < box[1]! + box[3]!; y++) for (let x = box[0]!; x < box[0]! + box[2]!; x++) data.set(color, (y * width + x) * 4);
}
function boxField(color = [255, 0, 0, 255]) { const data = field(); rectangle(data, 64, [24, 24, 16, 16], color); return data; }
function crop(data: Uint8Array, width: number, box: readonly number[]) {
  return Buffer.concat(Array.from({ length: box[3]! }, (_, row) => Buffer.from(data.subarray(((row + box[1]!) * width + box[0]!) * 4, ((row + box[1]!) * width + box[0]! + box[2]!) * 4))));
}
async function equal(info: TestInfo, label: string, actual: Uint8Array, expected: Uint8Array) {
  let changed = 0; for (let i = 0; i < Math.max(actual.length, expected.length); i += 4) if ([0, 1, 2, 3].some(k => actual[i + k] !== expected[i + k])) changed++;
  await info.attach(label + '.json', { body: JSON.stringify({ changedPixels: changed, actualBytes: actual.length, expectedBytes: expected.length, basis: 'Synthetic source/color/analytic rectangle or stated same-public invariant; no native pixel oracle' }), contentType: 'application/json' });
  expect(Buffer.from(actual).equals(Buffer.from(expected)), label + ': all RGBA including blank field and alpha').toBe(true);
}
const runtimeEvidence = new Map<Page, { pageErrors: string[]; consoleErrors: string[]; consoleWarnings: string[]; httpErrors: string[]; ordinaryNetwork: string[]; cancelledNetwork: string[] }>();
async function open(page: Page) {
  const evidence = { pageErrors: [] as string[], consoleErrors: [] as string[], consoleWarnings: [] as string[], httpErrors: [] as string[], ordinaryNetwork: [] as string[], cancelledNetwork: [] as string[] }; runtimeEvidence.set(page, evidence);
  page.on('pageerror', e => evidence.pageErrors.push(e.message)); page.on('console', m => { if (m.type() === 'error') evidence.consoleErrors.push(m.text()); if (m.type() === 'warning') evidence.consoleWarnings.push(m.text()); });
  page.on('response', response => { if (response.status() >= 400) evidence.httpErrors.push(response.url() + ': ' + response.status()); });
  page.on('requestfailed', request => { const error = request.failure()?.errorText ?? 'unknown'; (error === 'net::ERR_ABORTED' ? evidence.cancelledNetwork : evidence.ordinaryNetwork).push(request.url() + ': ' + error); });
  await page.goto('/demo/gui-entity-fixture.html'); await page.waitForFunction(() => !!window.guiEntityQA);
}
test.afterEach(async ({}, info) => {
  const entries = [...runtimeEvidence.values()]; runtimeEvidence.clear();
  for (const evidence of entries) {
    await info.attach('runtime-errors.json', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
    expect(evidence.pageErrors).toEqual([]); expect(evidence.consoleErrors).toEqual([]); expect(evidence.httpErrors).toEqual([]); expect(evidence.ordinaryNetwork).toEqual([]);
  }
});
async function render(page: Page, options: EntityFixtureOptions) {
  const value = await page.evaluate(o => window.guiEntityQA.render(o), options);
  await test.info().attach('actual-entity-context.json', { body: JSON.stringify({ renderer: value.renderer, error: value.error, width: value.width, height: value.height, scope: 'Actual public render canvas, not a detached backend probe' }), contentType: 'application/json' });
  expect(value.error).toBe(0); return { ...value, data: Buffer.from(value.rgba, 'base64'), live: Buffer.from(value.liveRgba, 'base64') };
}
async function ready(page: Page, options: EntityFixtureOptions, strict = false) {
  const serial = await page.evaluate(() => window.guiEntityQA.serial);
  await page.evaluate(({ options, strict }) => window.guiEntityQA.mount(options, strict), { options, strict });
  await page.waitForFunction(n => window.guiEntityQA.serial > n, serial);
  await expect(page.locator('canvas')).toHaveAttribute('data-render-state', 'ready');
}
async function pixels(page: Page) { const r = await page.evaluate(() => window.guiEntityQA.raw()); await test.info().attach('actual-entity-context.json', { body: JSON.stringify({ renderer: r.renderer, error: r.error, width: r.width, height: r.height, scope: 'Actual mounted GuiLayer canvas' }), contentType: 'application/json' }); expect(r.error).toBe(0); return Buffer.from(r.rgba, 'base64'); }
function png(color = [255, 255, 255, 255], size = 64) {
  const image = new PNG({ width: size, height: size }); for (let i = 0; i < image.data.length; i += 4) image.data.set(color, i); return PNG.sync.write(image);
}

test('public NPC helper maps all60 source aliases, snapshots caller matrices and supplies a finite named folded pose without IO', () => {
  const fetchBefore = globalThis.fetch; let io = 0;
  globalThis.fetch = (() => { io++; throw Error('Unexpected helper IO'); }) as typeof fetch;
  try {
    const options: NpcEntityOptions = { model: new Float32Array(identity()), view: new Float32Array(identity()), projection: new Float32Array(projection()), viewport: [0, 0, 64, 64], material: material() };
    expect(npcSkinNames).toHaveLength(60); expect(new Set(npcSkinNames).size).toBe(60);
    const commands = npcSkinNames.map((skin, index) => {
      const named = createNpcEntity({ ...options, skin }), indexed = createNpcEntity({ ...options, skin: index as NpcEntityOptions['skin'] });
      expect(named.texture).toBe(indexed.texture); expect(named.texture).toMatch(/\.png(?:\?|$)/);
      return named;
    });
    expect(new Set(commands.map(c => c.texture)).size).toBe(60); const value = commands[0]!;
    expect(createNpcEntity(options).texture).toBe(value.texture);
    expect(Object.keys(value.bonePose).sort()).toEqual(value.source.bones.map(b => b.name).sort());
    expect(value.bonePose.arms).toBeInstanceOf(Float32Array); expect([...value.bonePose.arms!]).not.toEqual(identity());
    expect(value.source.bones.some(b => !b.visible)).toBe(true);
    expect([...value.model]).toEqual([...options.model]); expect([...value.view]).toEqual([...options.view]); expect([...value.projection]).toEqual([...options.projection]);
    const foreign = () => runInNewContext('new Float32Array(values)', { values: identity() }) as Float32Array;
    const foreignModel = foreign(); expect(foreignModel instanceof Float32Array).toBe(false);
    const foreignPose = Object.fromEntries(value.source.bones.map(b => [b.name, foreign()]));
    const crossRealm = createNpcEntity({ ...options, model: foreignModel, view: foreign(), projection: foreign(), bonePose: foreignPose });
    expect([...crossRealm.model]).toEqual(identity()); expect([...crossRealm.bonePose.arms!]).toEqual(identity());
    const spoofed = new Uint32Array(16); Object.defineProperty(spoofed, Symbol.toStringTag, { value: 'Float32Array' });
    expect(() => createNpcEntity({ ...options, model: spoofed as unknown as Float32Array })).toThrow(RangeError);
    expect(() => createNpcEntity({ ...options, bonePose: { ...foreignPose, arms: spoofed as unknown as Float32Array } })).toThrow(RangeError);
    options.model[12] = 99; expect(value.model[12]).toBe(0);
    for (const skin of [-1, 60, .5, 'npc_01', 'missing']) expect(() => createNpcEntity({ ...options, skin: skin as any })).toThrow(RangeError);
    expect(io).toBe(0);
  } finally { globalThis.fetch = fetchBefore; }
});

test('public appearance options preserve the exact whole behavior skin-list order without changing controller variants or performing IO', () => {
  const bytes = readFileSync(new URL('../src/assets/npc-actor/npc.json', import.meta.url));
  const controllerBytes = readFileSync(new URL('../src/assets/npc-actor/npc.render_controllers.json', import.meta.url));
  // Fixed whole-original files independently qualify the oracle. No copied
  // implementation array, sorting rule or renderer/compiler output is expected.
  expect(createHash('sha256').update(bytes).digest('hex')).toBe('1dfce74b80b8603d183eae864d209256b301bc2d4901753ccf25a0ae3d1f68b4');
  expect(createHash('sha256').update(controllerBytes).digest('hex')).toBe('e08d6fbc921b1056c02ca67dd31edf315840c40c6c80e9fe83c4bae2bea4cee7');
  const sourceList: { variant: number }[] = JSON.parse(bytes.toString('utf8'))['minecraft:entity'].components['minecraft:npc'].npc_data.skin_list;
  const controller: string[] = JSON.parse(controllerBytes.toString('utf8')).render_controllers['controller.render.npc'].arrays.textures['Array.skins'];
  const controllerSkins = controller.map(value => { expect(value.startsWith('Texture.')).toBe(true); return value.slice('Texture.'.length); });
  const previous = globalThis.fetch; let io = 0;
  globalThis.fetch = (() => { io++; throw Error('Appearance data/factory must not fetch'); }) as typeof fetch;
  try {
    const readonlyOptions: readonly NpcAppearanceOption[] = npcAppearanceOptions;
    const expectedVariants = sourceList.map(entry => { expect(Object.keys(entry)).toEqual(['variant']); return entry.variant; });
    expect(sourceList).toHaveLength(60); expect(readonlyOptions.map(option => option.variant)).toEqual(expectedVariants);
    expect(readonlyOptions.map(option => option.skin)).toEqual(expectedVariants.map(variant => controllerSkins[variant]));
    expect(npcSkinNames).toEqual(controllerSkins);
    expect(new Set(readonlyOptions.map(option => option.variant)).size).toBe(60);
    expect([...readonlyOptions.map(option => option.variant)].sort((a, b) => a - b)).toEqual(Array.from({ length: 60 }, (_, i) => i));
    expect(new Set(readonlyOptions.map(option => option.skin))).toEqual(new Set(controllerSkins));
    for (const [start, length] of [[20, 15], [45, 10]] as const) {
      expect(readonlyOptions.slice(start, start + length).map(option => option.variant)).toEqual(expectedVariants.slice(start, start + length));
      expect(expectedVariants.slice(start, start + length)).not.toEqual(Array.from({ length }, (_, i) => start! + i));
    }
    expect(Object.isFrozen(readonlyOptions)).toBe(true);
    for (const option of readonlyOptions) { expect(Object.keys(option).sort()).toEqual(['skin', 'variant']); expect(Object.isFrozen(option)).toBe(true); }
    expect(Reflect.set(readonlyOptions, '0', { variant: 999, skin: 'missing' })).toBe(false);
    expect(Reflect.set(readonlyOptions[0]!, 'variant', 999)).toBe(false);
    const options: NpcEntityOptions = { model: new Float32Array(identity()), view: new Float32Array(identity()), projection: new Float32Array(projection()), viewport: [0, 0, 64, 64], material: material() };
    for (const option of readonlyOptions) {
      const named = createNpcEntity({ ...options, skin: option.skin }), numeric = createNpcEntity({ ...options, skin: option.variant });
      expect(named.texture).toBe(numeric.texture); expect(named.source).toBe(numeric.source);
    }
    expect(io).toBe(0);
  } finally { globalThis.fetch = previous; }
});

test('typed public SSR and invalid hidden branches validate before browser IO', () => {
  const originalFetch = globalThis.fetch; let io = 0;
  globalThis.fetch = (() => { io++; throw Error('Unexpected SSR IO'); }) as typeof fetch;
  try {
    const command = typed(entity({ texture: '/must-not-fetch.png' }));
    const props: GuiLayerProps = { width: 64, height: 64, guiScale: 1, commands: [command], label: 'Finite actor' };
    const html = renderToStaticMarkup(createElement(GuiLayer, props));
    expect(html).toContain('aria-label="Finite actor"'); expect(html).toContain('width="0"'); expect(html).toContain('data-render-state="loading"'); expect(html).not.toContain('bonePose=');
    const bad: any[] = [
      { ...command, bonePose: {} }, { ...command, bonePose: { box: identity() } },
      { ...command, source: { ...source(false), textureSize: [32, 64] } },
      { ...command, source: { ...source(false), bones: [{ ...source(false).bones[0], parent: 'box' }] } },
      { ...command, model: new Float32Array(15) }, { ...command, viewport: [0, 0, 65, 64] },
      { ...command, material: { ...material(), fogControl: [1, 1, 1] } },
    ];
    for (const candidate of bad) expect(() => renderGuiLayer({ ...props, commands: [candidate] })).toThrow(RangeError);
    expect(io).toBe(0);
  } finally { globalThis.fetch = originalFetch; }
});

test('one true3D box has an independently predicted opaque physical bbox and actual24/8 depth attachment', async ({ page }, info) => {
  await open(page); const value = await render(page, frame([entity()]));
  await equal(info, 'analytic-center-box', value.data, boxField()); await equal(info, 'live-presentation', value.live, value.data);
  const depths = await page.evaluate(() => window.guiEntityQA.counters.depths); expect(depths).toHaveLength(1); expect(depths[0]).toMatchObject({ depth: 24, stencil: 8 });
});

test('named final bone matrices are independent of key/source ordering and are not parent-multiplied twice', async ({ page }, info) => {
  await open(page); const root = { name: 'parent', pivot: [0, 0, 0] as const, visible: false, cubes: [] }, child = { ...source().bones[0]!, name: 'child', parent: 'parent' };
  const src: GuiEntitySource = { profile: 'npc-box64-rigid', textureSize: [64, 64], bones: [root, child] };
  const pose = { child: identity(), parent: translated(0, 16) };
  const first = await render(page, frame([entity({ source: src, bonePose: pose })]));
  const second = await render(page, frame([entity({ source: { ...src, bones: [child, root] }, bonePose: { parent: translated(0, 16), child: identity() } })]));
  await equal(info, 'final-child-matrix-analytic', first.data, boxField()); await equal(info, 'name-order-invariant', second.data, first.data);
});

test('near and far entity commands share one depth field independent of submission order', async ({ page }, info) => {
  await open(page); const near = entity(), far = entity({ model: translated(16), material: material([0, 0, 1]) });
  for (const [label, commands] of [['near-far', [near, far]], ['far-near', [far, near]]] as const) {
    await equal(info, label, (await render(page, frame([...commands]))).data, boxField());
  }
});

test('alpha below0.5 discards without depth writes while accepted alpha rewrites to opaque', async ({ page }, info) => {
  await open(page); const far = entity({ model: translated(16), material: material([0, 0, 1]) });
  for (const [alpha, expected] of [[127, [0, 0, 255, 255]], [128, [255, 0, 0, 255]]] as const) {
    const near = entity({ texture: solid(64, [255, 255, 255, alpha]) });
    await equal(info, 'alpha-' + alpha + '-front-before-back', (await render(page, frame([near, far]))).data, boxField([...expected]));
  }
});

test('ordered IMAGE entity IMAGE sprite TEXT entity transitions preserve depth and reset2D state', async ({ page }, info) => {
  await open(page); const expected = field(); rectangle(expected, 64, [0, 0, 64, 64], [0, 128, 0, 255]); rectangle(expected, 64, [24, 24, 16, 16], [255, 0, 0, 255]);
  rectangle(expected, 64, [28, 28, 4, 4], [0, 255, 255, 255]); rectangle(expected, 64, [1, 1, 4, 4], [255, 255, 0, 255]); rectangle(expected, 64, [50, 50, 4, 4], [255, 255, 255, 255]);
  const far = entity({ model: translated(16), material: material([0, 0, 1]) });
  const image = (color: number[], rect: number[]) => ({ kind: 'image', texture: solid(1, color), rect });
  const text = { kind: 'text', text: 'A', font: { pages: ['/unused-font'], pageSizes: [128], cellHeight: 8, lineHeight: 10, glyphs: { A: { page: 0, x: 0, y: 0, width: 8, height: 8, advance: 8 } } },
    pages: [[0, solid(128)]], origin: [50, 50], fontScale: .5, sampling: 'point', shader: 'bitmap' };
  const commands = [image([0, 128, 0, 255], [0, 0, 64, 64]), entity(), image([0, 255, 255, 255], [28, 28, 4, 4]),
    { kind: 'sprite', texture: solid(1), color: [255, 255, 0, 255], rect: [1, 1, 4, 4] }, text, far];
  await equal(info, 'mixed-pass-whole-field', (await render(page, frame(commands))).data, expected);
});

test('physical entity viewport, intersected scissor and cropped output retain full-frame phase across guiScale', async ({ page }, info) => {
  await open(page); const command = entity({ viewport: [8, 4, 64, 56], scissor: [36, 27, 20, 10] }), expected = field(80, 64);
  rectangle(expected, 80, [36, 27, 12, 10], [255, 0, 0, 255]); const outputRect = [30, 20, 30, 25] as const;
  for (const guiScale of [1, 5]) {
    const options = frame([command], { width: 80, scissor: [34, 26, 18, 20], guiScale });
    const full = await render(page, options), cropped = await render(page, { ...options, outputRect });
    await equal(info, 'physical-viewport-' + guiScale, full.data, expected);
    await equal(info, 'full-frame-crop-phase-' + guiScale, cropped.data, crop(full.data, 80, outputRect));
  }
});

test('old2D and all-hidden entity paths allocate no D24 and hidden URL declarations do not fetch', async ({ page }, info) => {
  await open(page); const image = { kind: 'image', texture: solid(1, [0, 255, 0, 255]), rect: [0, 0, 64, 64] };
  const expected = field(); rectangle(expected, 64, [0, 0, 64, 64], [0, 255, 0, 255]);
  await equal(info, 'old2D-opaque', (await render(page, frame([image]))).data, expected);
  await ready(page, frame([entity({ source: source(false), texture: '/hidden-must-not-fetch.png' })]));
  await equal(info, 'hidden-empty-field', await pixels(page), field());
  const counts = await page.evaluate(() => window.guiEntityQA.counters); expect(counts.depths).toEqual([]); expect(counts.fetches).toEqual([]);
});

test('React invalid source and mismatched64texture fail before URL IO or GPU allocation', async ({ page }) => {
  await open(page); const malformed = entity({ texture: '/invalid-must-not-fetch.png', bonePose: {} });
  await page.evaluate(o => window.guiEntityQA.mount(o), frame([malformed]));
  await expect(page.locator('canvas')).toHaveAttribute('data-render-state', 'error');
  expect(await page.evaluate(() => window.guiEntityQA.counters.fetches)).toEqual([]);
  expect(await page.evaluate(() => window.guiEntityQA.counters.depths)).toEqual([]);
  await page.evaluate(o => window.guiEntityQA.mount(o), frame([entity({ texture: solid(32) })]));
  await expect.poll(() => page.evaluate(() => window.guiEntityQA.events.filter((s: string) => s.startsWith('error:')).length)).toBe(2);
  expect(await page.evaluate(() => window.guiEntityQA.counters.fetches)).toEqual([]);
});

test('first pending URL GPU request owns typed matrix/source/material snapshots rather than caller mutations', async ({ page }, info) => {
  await page.route('**/entity-snapshot.png', route => route.fulfill({ contentType: 'image/png', body: png() })); await open(page);
  await page.evaluate(() => { window.guiEntityQA.holdBitmap = true; window.guiEntityQA.captureRequests = true; });
  await page.evaluate(o => window.guiEntityQA.mount(o), frame([entity({ texture: '/entity-snapshot.png' })]));
  await page.waitForFunction(() => window.guiEntityQA.pendingBitmaps.length === 1);
  await page.evaluate(() => { const q = window.guiEntityQA, c = q.props.commands[0];
    c.model[12] = 100; c.bonePose.box[12] = 100; c.source.bones[0].cubes[0].origin[0] = 100; c.material.fogColor[0] = 0; c.material.fogColor[2] = 1; q.releaseBitmaps(); });
  await page.waitForFunction(() => window.guiEntityQA.requestReads.length > 0);
  const first = await page.evaluate(() => { const q = window.guiEntityQA; q.captureRequests = false; return q.requestReads[0]; });
  expect([first.width, first.height, first.framebufferBound]).toEqual([64, 64, true]);
  await equal(info, 'first-pending-typed-declaration-snapshot', Buffer.from(first.rgba, 'base64'), boxField());
  // As with the existing GuiLayer contract, in-place React prop mutation is
  // outside React's immutable input contract. Internal state renders may observe
  // those new values; only the first prepared GPU request owns this snapshot.
  await expect(page.locator('canvas')).toHaveAttribute('data-render-state', 'ready'); await pixels(page);
  await expect.poll(() => page.evaluate(() => window.guiEntityQA.counters.closedBitmapIds.filter((id: number) => id === 0).length)).toBe(1);
});

test('StrictMode makes one real URL decode and exposes ref/name/focus without duplicate contexts', async ({ page }, info) => {
  await page.route('**/entity-strict.png', route => route.fulfill({ contentType: 'image/png', body: png() })); await open(page);
  await ready(page, { ...frame([entity({ texture: '/entity-strict.png' })]), label: 'Synthetic rigid actor' }, true);
  await expect(page.getByRole('img', { name: 'Synthetic rigid actor' })).toHaveCount(1);
  await page.locator('canvas').evaluate(n => { n.tabIndex = 0; n.focus(); n.blur(); });
  await equal(info, 'strict-actual-url', await pixels(page), boxField());
  const state = await page.evaluate(() => ({ ...window.guiEntityQA.counters, serial: window.guiEntityQA.serial, events: window.guiEntityQA.events, nodes: new Set(window.guiEntityQA.refs).size }));
  expect(state.fetches).toHaveLength(1); expect(state.bitmaps).toBe(1); expect(state.closedBitmaps).toBe(1); expect(state.depths).toHaveLength(1); expect(state.nodes).toBe(1); expect(state.serial).toBe(1); expect(state.events).toContain('focus'); expect(state.events).toContain('blur');
  await page.evaluate(() => window.guiEntityQA.unmount()); await expect(page.locator('canvas')).toHaveCount(0);
});

test('cancelled real decode closes its late bitmap once and cannot replace a newer entity request', async ({ page }, info) => {
  await page.route('**/entity-late.png', route => route.fulfill({ contentType: 'image/png', body: png() })); await open(page);
  await page.evaluate(() => { window.guiEntityQA.holdBitmap = true; });
  await page.evaluate(o => window.guiEntityQA.mount(o), frame([entity({ texture: '/entity-late.png' })]));
  await page.waitForFunction(() => window.guiEntityQA.pendingBitmaps.length === 1);
  await ready(page, frame([entity({ material: material([0, 0, 1]) })]));
  await page.evaluate(() => window.guiEntityQA.releaseBitmaps());
  await expect.poll(() => page.evaluate(() => window.guiEntityQA.counters.closedBitmaps)).toBe(1);
  await equal(info, 'late-request-cannot-publish', await pixels(page), boxField([0, 0, 255, 255]));
  const state = await page.evaluate(() => ({ ...window.guiEntityQA.counters, serial: window.guiEntityQA.serial, errors: window.guiEntityQA.events.filter((x: string) => x.startsWith('error:')) }));
  expect(state.bitmaps).toBe(1); expect(state.aborted).toHaveLength(1); expect(state.serial).toBe(1); expect(state.errors).toEqual([]);
});

test('actual context loss clears the entity canvas and renderKey creates a fresh recoverable owner', async ({ page }, info) => {
  await open(page); await ready(page, frame([entity()]));
  await page.evaluate(() => { window.guiEntityQA.oldRef = window.guiEntityQA.ref; window.guiEntityQA.lose(); });
  await expect(page.locator('canvas')).toHaveAttribute('data-render-state', 'error');
  expect(await page.locator('canvas').evaluate(n => [(n as HTMLCanvasElement).width, (n as HTMLCanvasElement).height])).toEqual([0, 0]);
  const serial = await page.evaluate(() => window.guiEntityQA.serial); await page.evaluate(() => window.guiEntityQA.retry(1));
  await page.waitForFunction(n => window.guiEntityQA.serial > n, serial);
  expect(await page.evaluate(() => window.guiEntityQA.ref !== window.guiEntityQA.oldRef)).toBe(true);
  await equal(info, 'context-loss-explicit-retry', await pixels(page), boxField());
});
