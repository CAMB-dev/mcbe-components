import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { PNG } from 'pngjs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GuiImageLayer } from '../src/gui-image';
import { layoutGuiImages } from '../src/gui-image-geometry';
import { renderGuiImages } from '../src/gui-image-webgl';
import type { GuiImageLayerProps } from '../src/gui-image';

const ARCHIVE_SHA = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf';
const sha = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
let archivePromise: Promise<(name: string) => Buffer> | undefined;
async function zip() {
  return archivePromise ??= (async () => {
    const bytes = await readFile(new URL('../.cache/references/bedrock-samples-v1.26.60.5-full.zip', import.meta.url));
    expect(sha(bytes), 'Public original ZIP is required; run npm run pretest').toBe(ARCHIVE_SHA);
    let end = bytes.length - 22; while (end >= 0 && (bytes.readUInt32LE(end) !== 0x06054b50 || end + 22 + bytes.readUInt16LE(end + 20) !== bytes.length)) end--;
    if (end < 0) throw Error('Invalid original ZIP');
    const entries = new Map<string, [number, number, number, number]>(); let cursor = bytes.readUInt32LE(end + 16);
    for (let i = 0; i < bytes.readUInt16LE(end + 10); i++) {
      if (bytes.readUInt32LE(cursor) !== 0x02014b50) throw Error('Invalid source ZIP central record');
      const n = bytes.readUInt16LE(cursor + 28), extra = bytes.readUInt16LE(cursor + 30), comment = bytes.readUInt16LE(cursor + 32);
      entries.set(bytes.toString('utf8', cursor + 46, cursor + 46 + n), [bytes.readUInt16LE(cursor + 10), bytes.readUInt32LE(cursor + 20), bytes.readUInt32LE(cursor + 24), bytes.readUInt32LE(cursor + 42)]);
      cursor += 46 + n + extra + comment;
    }
    return (name: string) => {
      const z = entries.get(name); if (!z || bytes.readUInt32LE(z[3]) !== 0x04034b50) throw Error('Missing source ZIP entry ' + name);
      const begin = z[3] + 30 + bytes.readUInt16LE(z[3] + 26) + bytes.readUInt16LE(z[3] + 28), packed = bytes.subarray(begin, begin + z[1]);
      const data = z[0] === 0 ? Buffer.from(packed) : z[0] === 8 ? inflateRawSync(packed) : (() => { throw Error('Unsupported original ZIP compression'); })();
      expect(data.length, name).toBe(z[2]); return data;
    };
  })();
}
function jsonc(bytes: Buffer) { return JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, '').replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, x => x.startsWith('"') ? x : '')); }
function texture(png: PNG) { return { width: png.width, height: png.height, rgba: png.data.toString('base64') }; }
async function original(name: string) { const read = await zip(); return PNG.sync.read(read('resource_pack/textures/ui/' + name + '.png')); }
const pixel = (rgba = [255, 0, 0, 255]) => ({ width: 1, height: 1, rgba });
async function open(page: import('@playwright/test').Page) { await page.goto('/demo/gui-image-layer-fixture.html'); await page.waitForFunction(() => !!window.guiImageQA); }
async function render(page: import('@playwright/test').Page, options: unknown) {
  const value = await page.evaluate(options => window.guiImageQA.render(options), options);
  return { ...value, data: Buffer.from(value.rgba, 'base64') };
}
function equal(actual: Uint8Array, expected: Uint8Array, label = 'complete RGBA target including all empty/edge pixels') { expect(Buffer.from(actual).equals(Buffer.from(expected)), label).toBe(true); }

test('typed SSR is decorative or singly named without browser/GPU use', () => {
  const props: GuiImageLayerProps = { width: 16, height: 12, guiScale: 2, images: [] };
  const plain = renderToStaticMarkup(createElement(GuiImageLayer, props)); expect(plain).toContain('aria-hidden="true"'); expect(plain).toContain('data-render-state="loading"');
  const named = renderToStaticMarkup(createElement(GuiImageLayer, { ...props, label: 'Source panel' })); expect(named).toContain('role="img"'); expect(named).toContain('aria-label="Source panel"'); expect(named).not.toContain('aria-hidden="true"');
  expect(renderToStaticMarkup(createElement(GuiImageLayer, { ...props, label: 'Fallback', 'aria-label': 'Override', 'aria-hidden': true }))).toContain('aria-label="Override"');
  expect(() => renderGuiImages({ ...props, images: [] })).toThrow(/browser canvas/);
});

test('independent scalar examples preserve whole-frame projection, source quantization and half positions', () => {
  const value = layoutGuiImages({ width: 81, height: 59, guiScale: 2.5, images: [{ rect: [1.17, 2.49, 15.13, 11.81], uvRect: [.1, .2, .3, .4] }] });
  expect(value.logicalStage).toEqual([33, 24]); expect(value.projectionSize).toEqual([32.4, 23.6]);
  expect(value.mvp[0]).toBe(Math.fround(2 / 32.4)); expect(value.mvp[5]).toBe(Math.fround(-2 / 23.6));
  expect(value.meshes[0]!.drawRect).toEqual([.8, 2.4, 15.2, 12]);
  expect(value.meshes[0]!.vertices.map(v => v.position)).toEqual([[.7998046875, 14.3984375], [16, 14.3984375], [16, 2.400390625], [.7998046875, 2.400390625]]);
  expect(value.meshes[0]!.vertices.map(v => v.uvRaw)).toEqual([[6554, 39321], [26214, 39321], [26214, 13107], [6554, 13107]]);
  expect(value.meshes[0]!.indices).toEqual([1, 2, 0, 0, 2, 3]);
});

test('original nine-slice metadata distinguishes physical pixels and logical edges without producer manifests', async () => {
  const read = await zip(), cell = jsonc(read('resource_pack/textures/ui/cell_image.json')), dark = jsonc(read('resource_pack/textures/ui/enchanting_dark_background.json'));
  expect(cell).toMatchObject({ base_size: [5, 5], nineslice_size: 1 }); expect([(await original('cell_image')).width, (await original('cell_image')).height]).toEqual([10, 10]);
  expect(dark).toMatchObject({ base_size: [108, 19], nineslice_size: 1 });
  for (const [baseSize, expectedU, expectedV] of [[[5, 5], [0, 13107, 52428, 65535], [0, 13107, 52428, 65535]], [[108, 19], [0, 607, 64929, 65535], [0, 3450, 62086, 65535]]] as const) {
    const value = layoutGuiImages({ width: 128, height: 64, guiScale: 1, images: [{ rect: [2, 3, 110, 28], nineSlice: { insets: 1, baseSize } }] });
    expect([...new Set(value.meshes[0]!.vertices.map(v => v.uvRaw[0]))].sort((a, b) => a - b)).toEqual(expectedU);
    expect([...new Set(value.meshes[0]!.vertices.map(v => v.uvRaw[1]))].sort((a, b) => a - b)).toEqual(expectedV);
    expect(value.meshes[0]!.vertices).toHaveLength(36); expect(value.meshes[0]!.indices).toHaveLength(54);
  }
});

test('complete non-square original PNG uses nearest samples including all transparent margins', async ({ page }) => {
  await open(page); const source = await original('close_button_default_compact'), width = 38, height = 24;
  const result = await render(page, { width, height, guiScale: 1, images: [{ texture: texture(source), rect: [4, 5, 30, 14] }] });
  const expected = new Uint8Array(width * height * 4);
  for (let y = 0; y < 14; y++) for (let x = 0; x < 30; x++) { const i = (Math.floor(y / 2) * source.width + Math.floor(x / 2)) * 4, a = source.data[i + 3]! / 255; expected.set([Math.round(source.data[i]! * a), Math.round(source.data[i + 1]! * a), Math.round(source.data[i + 2]! * a), source.data[i + 3]!], ((y + 5) * width + x + 4) * 4); }
  equal(result.data, expected); expect(result.alphaMode).toBe('premultiplied');
});

test('complete mixed-resolution cell nine-slice keeps one-game edges sourced from two original PNG pixels', async ({ page }) => {
  await open(page); const source = await original('cell_image'), result = await render(page, { width: 28, height: 24, guiScale: 1, images: [{ texture: texture(source), rect: [3, 4, 22, 18], nineSlice: { insets: 1, baseSize: [5, 5] } }] });
  const expected = new Uint8Array(28 * 24 * 4);
  const sample = (p: number, extent: number) => p === 0 ? 1 : p === extent - 1 ? 9 : Math.floor(2 + (p - 1 + .5) * 6 / (extent - 2));
  for (let y = 0; y < 18; y++) for (let x = 0; x < 22; x++) { const i = (sample(y, 18) * 10 + sample(x, 22)) * 4; expected.set(source.data.subarray(i, i + 4), ((y + 4) * 28 + x + 3) * 4); }
  equal(result.data, expected);
});

test('straight source, sequential source-alpha blending, tint and HudOpacity preserve explicit PMA bytes', async ({ page }, testInfo) => {
  await open(page);
  const result = await render(page, { width: 12, height: 8, guiScale: 1, images: [
    { texture: pixel([255, 0, 0, 128]), rect: [0, 0, 8, 8] }, { texture: pixel([0, 255, 0, 128]), rect: [4, 0, 8, 8] },
    // Exact-byte shader RGB64 and UNORM opacity avoid unproven intermediate
    // half-byte conversion. Earlier .5 alpha and RGB127.5 counterexamples are
    // preserved in ignored diagnostics, not hidden with a1byte tolerance.
    { texture: pixel([128, 0, 0, 255]), rect: [0, 0, 2, 2], tint: [.5, 1, 1, 1], hudOpacity: 128 / 255 },
  ] });
  const expected = new Uint8Array(12 * 8 * 4);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 12; x++) expected.set(x < 2 && y < 2 ? [96, 0, 0, 192] : x < 4 ? [128, 0, 0, 128] : x < 8 ? [64, 128, 0, 192] : [0, 128, 0, 128], (y * 12 + x) * 4);
  await testInfo.attach('sequential-alpha-full-field.json', { body: JSON.stringify({ width: 12, height: 8, actual: [...result.data], expected: [...expected], renderer: result.renderer, samples: [0, 3, 5, 9].map(x => ({ x, actual: [...result.data.subarray(x * 4, x * 4 + 4)], expected: [...expected.subarray(x * 4, x * 4 + 4)] })) }), contentType: 'application/json' });
  equal(result.data, expected);
});

test('scissors intersect in physical coordinates and outputRect equals the exact full-frame crop', async ({ page }) => {
  await open(page); const options = { width: 81, height: 59, guiScale: 2.5, scissor: [7, 5, 65, 49], background: { kind: 'solid', color: [0, 0, 0, 0] }, images: [
    { texture: pixel(), rect: [1.17, 2.49, 15.13, 11.81], scissor: [9, 8, 29, 18] }, { texture: pixel([0, 255, 0, 255]), rect: [10.2, 8.4, 10.5, 9.2] },
  ] };
  const full = await render(page, options), crop = await render(page, { ...options, outputRect: [11, 7, 42, 31] }), expected = new Uint8Array(42 * 31 * 4);
  for (let y = 0; y < 31; y++) expected.set(full.data.subarray(((y + 7) * 81 + 11) * 4, ((y + 7) * 81 + 53) * 4), y * 42 * 4);
  equal(crop.data, expected); expect(crop.layout.projectionSize).toEqual(full.layout.projectionSize); expect(crop.layout.mvp).toEqual(full.layout.mvp);
  for (let y = 0; y < 59; y++) for (let x = 0; x < 81; x++) if (x < 7 || x >= 72 || y < 5 || y >= 54) expect(full.data[(y * 81 + x) * 4 + 3]).toBe(0);
});

test('PMA versus straight background encoding is explicit and whole-frame texture survives output crops', async ({ page }) => {
  await open(page); const pma = { width: 8, height: 6, rgba: Array(48).fill([64, 32, 16, 128]).flat() }, straight = { width: 8, height: 6, rgba: Array(48).fill([128, 64, 32, 128]).flat() };
  const a = await render(page, { width: 8, height: 6, guiScale: 1, images: [], background: { kind: 'texture', texture: pma, encoding: 'framebuffer' } });
  const b = await render(page, { width: 8, height: 6, guiScale: 1, outputRect: [2, 1, 4, 3], images: [], background: { kind: 'texture', texture: straight, encoding: 'straight-alpha' } });
  equal(a.data, new Uint8Array(pma.rgba)); equal(b.data, new Uint8Array(Array(12).fill([64, 32, 16, 128]).flat()));
});

test('invalid dimensions, UVs, slices, scissors, textures and budgets fail without substituting imagery', async ({ page }) => {
  const valid = { width: 8, height: 8, guiScale: 1, images: [{ rect: [0, 0, 4, 4] as const }] };
  for (const bad of [{ ...valid, width: 0 }, { ...valid, height: Infinity }, { ...valid, guiScale: 0 }, { ...valid, outputRect: [0, 0, 0, 1] as const }, { ...valid, images: [{ rect: [0, 0, -1, 1] as const }] }, { ...valid, images: [{ rect: [0, 0, 4, 4] as const, uvRect: [.9, 0, .2, 1] as const }] }, { ...valid, images: [{ rect: [0, 0, 4, 4] as const, nineSlice: { insets: 3, baseSize: [5, 5] as const } }] }]) expect(() => layoutGuiImages(bad)).toThrow(RangeError);
  await open(page); const result = await page.evaluate(() => { const bad = [{ width: 1, height: 1, rgba: [1] }, { width: 0, height: 1, rgba: [] }]; return bad.map(texture => { try { window.guiImageQA.render({ width: 8, height: 8, guiScale: 1, images: [{ rect: [0, 0, 4, 4], texture }] }); return false; } catch { return true; } }); }); expect(result).toEqual([true, true]);
});

test('URL decoding uploads straight ImageBitmap directly, with no Canvas2D source-alpha roundtrip', async ({ page }) => {
  await page.addInitScript(() => {
    const old = HTMLCanvasElement.prototype.getContext; (window as any).twoDCalls = 0;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: any[]) { if (args[0] === '2d') (window as any).twoDCalls++; return old.apply(this, args as any); } as any;
    const decode = window.createImageBitmap; (window as any).bitmapOptions = [];
    window.createImageBitmap = ((...args: any[]) => { (window as any).bitmapOptions.push(args[1]); return (decode as any)(...args); }) as any;
  });
  const png = new PNG({ width: 1, height: 1 }); png.data.set([255, 64, 128, 128]); const url = 'data:image/png;base64,' + PNG.sync.write(png).toString('base64');
  await open(page); await page.evaluate(url => window.guiImageQA.mount({ width: 8, height: 6, guiScale: 1, label: 'Original alpha', images: [{ texture: url, rect: [0, 0, 8, 6] }] }), url);
  const canvas = page.getByRole('img', { name: 'Original alpha' }); await expect(canvas).toHaveAttribute('data-render-state', 'ready');
  const actual = await page.evaluate(() => window.guiImageQA.rawCanvas()); equal(Buffer.from(actual.rgba, 'base64'), new Uint8Array(Array(48).fill([128, 32, 64, 128]).flat()));
  expect(await page.evaluate(() => (window as any).twoDCalls)).toBe(0); expect(await page.evaluate(() => (window as any).bitmapOptions)).toContainEqual({ premultiplyAlpha: 'none', colorSpaceConversion: 'none', imageOrientation: 'none' });
  expect(actual.attributes.premultipliedAlpha).toBe(true); expect(actual.error).toBe(0);
  for (const background of [[0, 0, 0], [255, 255, 255], [40, 41, 42]]) {
    await page.evaluate(rgb => { document.body.style.backgroundColor = `rgb(${rgb.join(',')})`; }, background);
    const shot = PNG.sync.read(await canvas.screenshot()); expect([shot.width, shot.height]).toEqual([8, 6]);
    const expected = [128, 32, 64].map((value, channel) => Math.round(value + background[channel]! * (1 - 128 / 255)));
    equal(shot.data, new Uint8Array(Array(48).fill([...expected, 255]).flat()), 'complete live PMA canvas over independently computed dark/light/color underlay');
  }
});

test('StrictMode, equivalent props and mutable pixel updates keep ref, semantics and ready callbacks coherent', async ({ page }) => {
  await open(page); const opts = { width: 16, height: 12, guiScale: 1, label: 'Named layer', images: [{ texture: pixel(), rect: [1, 2, 8, 6] }] };
  await page.evaluate(opts => window.guiImageQA.mount(opts, true), opts); const canvas = page.getByRole('img', { name: 'Named layer' }); await expect(canvas).toHaveAttribute('data-render-state', 'ready');
  expect(await page.evaluate(() => window.guiImageQA.ref === document.querySelector('canvas'))).toBe(true);
  await page.evaluate(opts => window.guiImageQA.mount(opts, true), opts); await expect.poll(() => page.evaluate(() => window.guiImageQA.events.filter((x: string) => x === 'ready').length)).toBe(1);
  await page.evaluate(opts => window.guiImageQA.mount({ ...opts, label: undefined }, true), opts); await expect(page.locator('canvas')).toHaveAttribute('aria-hidden', 'true');
  await page.evaluate(opts => window.guiImageQA.mount({ ...opts, images: [{ ...opts.images[0], texture: { width: 1, height: 1, rgba: [0, 255, 0, 255] } }] }, true), opts);
  await expect.poll(() => page.evaluate(() => window.guiImageQA.events.filter((x: string) => x === 'ready').length)).toBe(2); expect((await page.evaluate(() => window.guiImageQA.rawCanvas())).error).toBe(0);
});

test('cancelled URL work produces no stale callback and context loss requires explicit retry', async ({ page }) => {
  let release: (() => void) | undefined; const delayed = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/gui-image-delayed.png', async route => { await delayed; await route.abort().catch(() => {}); });
  await open(page); await page.evaluate(() => window.guiImageQA.mount({ width: 8, height: 8, guiScale: 1, images: [{ texture: '/gui-image-delayed.png', rect: [0, 0, 8, 8] }] }));
  await expect(page.locator('canvas')).toHaveAttribute('data-render-state', 'loading'); await page.evaluate(() => window.guiImageQA.unmount()); release!(); await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => window.guiImageQA.events)).toEqual([]);
  const opts = { width: 8, height: 8, guiScale: 1, images: [{ texture: pixel(), rect: [0, 0, 8, 8] }] };
  await page.evaluate(opts => window.guiImageQA.mount(opts), opts); await expect(page.locator('canvas')).toHaveAttribute('data-render-state', 'ready');
  await page.locator('canvas').evaluate(node => (node as HTMLCanvasElement).getContext('webgl')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(page.locator('canvas')).toHaveAttribute('data-render-state', 'error'); await expect(page.locator('canvas')).toHaveAttribute('width', '0');
  expect(await page.evaluate(() => window.guiImageQA.states.at(-1))).toBe('error');
  await page.evaluate(opts => window.guiImageQA.mount({ ...opts, renderKey: 1 }), opts); await expect(page.locator('canvas')).toHaveAttribute('data-render-state', 'ready');
  expect(await page.evaluate(() => window.guiImageQA.states.at(-1))).toBe('ready');
  expect(await page.evaluate(() => window.guiImageQA.events.filter((x: string) => x.startsWith('error:')).length)).toBe(1);
});

const PRIVATE_NATIVE = [
  [5, 'prefix', 'texture-75-before.png', '48b461c015d71146dc3d46f73db5b4bde7f95c99e5a4f4f51f84dc5ea729ffb9', '5e4c996d093b53a9160fd4172269782f72f50feb3ea8a2ea4c54efa9d7598d40'],
  [5, 'darkrows', 'texture-75-after.png', '1c6ebd0fb8cebd6859cdef8a4626f903bb9b707e25be969a6cc8063fb70e90aa', '597954611cb34ca4b137cc3c61ff732fae7118c8a730ab3bdef9cf76865ad310'],
  [4, 'prefix', 'texture-84-before.png', '303011c03bdcd0fbc569feed0f786c30163b7affe61fec3edfc5779de74efea1', 'fcae3ca3a6d2a9a2acbdf64053f3f520cb16db5ca9a166d7ae8e7b4a15b00267'],
  [4, 'darkrows', 'texture-84-after.png', '3e06cb4766d8ab6f00060173f5b550d40e6a6cbfb8f713287dc41b63127a11b7', '962b48e0c3d2bca7c3c35852b90b4f8f270dcb29173c21d8595ad349b87ddd10'],
] as const;

// All positions below are evaluated from original public UI expressions. No
// captured vertices, screenshot registration, source profile manifests or
// producer GLSL are consumed as renderer inputs/expected images.
async function nativeSourceScene(scale: number, kind: string) {
  const read = await zip(), common = jsonc(read('resource_pack/ui/ui_common.json')), enchanting = jsonc(read('resource_pack/ui/enchanting_screen.json'));
  expect(common.root_panel.size).toEqual([176, 166]); expect(common.root_panel.anchor_to).toBe('center');
  const top = enchanting.enchanting_panel_top_half; expect(top.size).toEqual(['100%', '50% - 12px']); expect(top.offset).toEqual([0, 7]);
  const grid = top.controls.find((value: any) => value.grid_panel).grid_panel; expect(grid.size).toEqual(['65%-8px', '80%+4px']); expect(grid.offset).toEqual([-8, 2]);
  expect(enchanting.enchant_button_panel.size).toEqual(['100%', '33.333333%']);
  const stage = [Math.ceil(2570 / scale), Math.ceil(1402 / scale)], x = (stage[0]! - 176) / 2, y = (stage[1]! - 166) / 2;
  const height = 166 * .5 - 12, gridWidth = 176 * .65 - 8, gridHeight = height * .8 + 4, gx = x + 176 - gridWidth - 8, gy = y + 7 + (height - gridHeight) / 2 + 2;
  const command = async (name: string, rect: number[], edge?: number, base?: number[], tint?: number[]) => {
    const bytes = read(`resource_pack/textures/ui/${name}.png`); const png = PNG.sync.read(bytes);
    if (edge !== undefined && edge !== 0) { const metadata = jsonc(read(`resource_pack/textures/ui/${name}.json`)); expect(metadata.nineslice_size).toBe(edge); expect(metadata.base_size ?? [png.width, png.height]).toEqual(base); }
    return { texture: texture(png), rect, ...(edge === undefined ? {} : { nineSlice: { insets: edge, baseSize: base } }), ...(tint ? { tint } : {}) };
  };
  return kind === 'prefix' ? [await command('screen_background', [0, 0, ...stage], 0, [1, 1], [1, 1, 1, .4]), await command('dialog_background_opaque', [x, y, 176, 166], 4, [16, 16]), await command('close_button_default_compact', [x + 156, y + 5, 15, 7]), await command('cell_image', [gx - 1, gy - 1, gridWidth + 2, gridHeight + 2], 1, [5, 5])]
    : Promise.all([0, 1, 2].map(row => command('enchanting_dark_background', [gx, gy + row * gridHeight / 3, gridWidth, gridHeight * .33333333], 1, [108, 19])));
}

for (const [scale, kind, filename, pngSha, rgbaSha] of PRIVATE_NATIVE) test(`OPTIONAL PRIVATE native GUI${scale} ${kind}: source-generated images match the entire 2570x1402 target`, async ({ page }, testInfo) => {
  const dir = `../.cache/pix-capture/gui-image-oracle-gui${scale}-${kind}-01/`, path = new URL(dir + filename, import.meta.url);
  test.skip(!existsSync(path), 'User-owned saved-capture API readbacks are optional; public source/Web contracts still run.');
  const bytes = await readFile(path); expect(sha(bytes)).toBe(pngSha); const expected = PNG.sync.read(bytes); expect([expected.width, expected.height]).toEqual([2570, 1402]); expect(sha(expected.data)).toBe(rgbaSha);
  const beforeName = scale === 5 ? 'texture-75-before.png' : 'texture-84-before.png', before = kind === 'darkrows' ? PNG.sync.read(await readFile(new URL(dir + beforeName, import.meta.url))) : undefined;
  if (before) expect(sha(before.data)).toBe(scale === 5 ? '992821733bb9707e63482a2dbf7731bc9423d20601e5bd965ab82a040f430799' : '692eb337f16e1f6dc7ba007b448b58f8e8510cfba9a6881972203e3283971312');
  await open(page); const images = await nativeSourceScene(scale, kind), options = { width: 2570, height: 1402, guiScale: scale, images, ...(before ? { background: { kind: 'texture', texture: texture(before), encoding: 'framebuffer' } } : {}) }, actual = await render(page, options);
  await page.evaluate(options => window.guiImageQA.mount(options), options); await expect(page.locator('canvas.mc-gui-image-layer')).toHaveAttribute('data-render-state', 'ready');
  const live = await page.evaluate(() => window.guiImageQA.rawCanvas()), liveData = Buffer.from(live.rgba, 'base64');
  const stats = { scope: kind === 'prefix' ? 'Only first4 images from captured transparent clear' : 'Conditional3 dark-row transition over complete actual before-target', scale, pixels: 3603140, expectedSha256: rgbaSha, actualSha256: sha(actual.data), exact: actual.data.equals(expected.data), renderer: actual.renderer, attributes: actual.attributes, error: actual.error, liveComponent: { width: live.width, height: live.height, rgbaSha256: sha(liveData), exact: liveData.equals(expected.data), renderer: live.renderer, attributes: live.attributes, error: live.error }, mask: false, tolerance: 0 };
  await testInfo.attach('full-native-image-target.json', { body: JSON.stringify(stats), contentType: 'application/json' }); equal(actual.data, expected.data, 'every native target RGBA pixel, no crops/masks/registration');
  equal(liveData, expected.data, 'entire actual React default-framebuffer target; not merely returned FBO bytes'); expect(live.error).toBe(0);
});
