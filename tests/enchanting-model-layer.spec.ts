import { test, expect } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { PNG } from 'pngjs';
import type { ModelConfiguration, ModelWireCommand } from '../demo/enchanting-model-layer-fixture';
import type { GuiModelGeometry } from '../src/gui-model-geometry';

// Actual source-model adapter contract. Expected source queues are independent,
// but intentionally share public renderGuiLayer. This is not a native oracle.
const path = '/demo/enchanting-model-layer-fixture.html';
const layer = (page: Page) => page.locator('canvas.mc-enchanting-image-layer');
const state = (page: Page) => page.locator('.mc-enchanting-image-layer,.mc-enchanting-image-error');
const hash = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
const tile = new PNG({ width: 2, height: 3 }); tile.data.set([40,80,120,128, 180,30,90,255, 20,200,60,255, 230,170,30,128, 75,45,220,255, 190,210,40,255]);
const fallback = new PNG({ width: 16, height: 16 }); for (let i = 0; i < fallback.data.length; i += 4) fallback.data.set([230, 40, 180, 255], i);
test.beforeEach(async ({ page }) => {
  await page.route('**/qa-model-tile.png', route => route.fulfill({ contentType: 'image/png', body: PNG.sync.write(tile) }));
  await page.route('**/qa-model-fallback.png', route => route.fulfill({ contentType: 'image/png', body: PNG.sync.write(fallback) }));
});
async function configure(page: Page, value: Partial<ModelConfiguration>) {
  await page.evaluate(value => window.enchantingModelQA.configure(value), value);
  for (const [key, expected] of Object.entries(value)) await expect.poll(() => page.locator('main').getAttribute('data-configuration').then(value => JSON.parse(value!)[key])).toEqual(expected);
}
async function ready(page: Page) { await expect(layer(page)).toHaveAttribute('data-render-state', 'ready'); }
async function open(page: Page, value: Partial<ModelConfiguration> = { mode: 'models' }) {
  await page.goto(path); await page.waitForFunction(() => !!window.enchantingModelQA?.section); await page.mouse.move(0, 0);
  await configure(page, value); if (value.mode && value.mode !== 'css') await ready(page);
}
async function visuals(page: Page) {
  return page.evaluate(() => {
    const root = window.enchantingModelQA.section!, rect = root.getBoundingClientRect(), win = root.querySelector<HTMLElement>('.mc-enchanting-image-window');
    return { size: [rect.width, rect.height], models: win?.dataset.itemModels?.split(' ').map(Number) ?? [], sprites: win?.dataset.itemImages?.split(' ').map(Number) ?? [],
      items: [...root.querySelectorAll('.mc-slot__item')].map(node => getComputedStyle(node).visibility),
      custom: [...root.querySelectorAll('[data-custom-node],[data-custom-hotbar]')].map(node => getComputedStyle(node).visibility),
      panel: getComputedStyle(root, '::before').display, canvas: root.querySelectorAll('canvas').length,
      label: getComputedStyle(root.querySelector('.mc-workstation__title')!).color,
      leaks: root.querySelectorAll('[guimodel],[itemmodels],[projection],[textures]').length };
  });
}
async function stableState(page: Page) {
  await page.evaluate(() => { window.enchantingModelQA.incrementBook(); window.enchantingModelQA.incrementFallback(); });
  const slot = page.locator('.mc-workstation__inventory .mc-slot').first(); await slot.click(); await slot.focus();
  const section = await page.locator('.mc-enchanting').elementHandle();
  return { slot, section };
}
async function retained(page: Page, handles: Awaited<ReturnType<typeof stableState>>) {
  expect(await handles.section!.evaluate(node => node === window.enchantingModelQA.section)).toBe(true);
  await expect(handles.slot).toBeFocused(); await expect(handles.slot).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-book-state]')).toHaveAttribute('data-book-state', '1'); await expect(page.locator('[data-fallback-index="2"]')).toHaveAttribute('data-fallback-state', '1');
}

let archivePromise: Promise<(name: string) => Buffer> | undefined;
async function archive() {
  return archivePromise ??= (async () => {
    const bytes = await readFile(new URL('../.cache/references/bedrock-samples-v1.26.60.5-full.zip', import.meta.url));
    expect(hash(bytes)).toBe('d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf');
    let end = bytes.length - 22; while (end >= 0 && (bytes.readUInt32LE(end) !== 0x06054b50 || end + 22 + bytes.readUInt16LE(end + 20) !== bytes.length)) end--;
    if (end < 0) throw Error('Missing ZIP directory'); let p = bytes.readUInt32LE(end + 16); const entries = new Map<string, [number, number, number, number]>();
    for (let i = 0; i < bytes.readUInt16LE(end + 10); i++) {
      if (bytes.readUInt32LE(p) !== 0x02014b50) throw Error('Invalid source entry'); const length = bytes.readUInt16LE(p + 28);
      entries.set(bytes.toString('utf8', p + 46, p + 46 + length), [bytes.readUInt16LE(p + 10), bytes.readUInt32LE(p + 20), bytes.readUInt32LE(p + 24), bytes.readUInt32LE(p + 42)]); p += 46 + length + bytes.readUInt16LE(p + 30) + bytes.readUInt16LE(p + 32);
    }
    return (name: string) => { const entry = entries.get(name); if (!entry) throw Error(`Missing ${name}`); const offset = entry[3] + 30 + bytes.readUInt16LE(entry[3] + 26) + bytes.readUInt16LE(entry[3] + 28), packed = bytes.subarray(offset, offset + entry[1]); const result = entry[0] === 0 ? packed : inflateRawSync(packed); expect(result.length).toBe(entry[2]); return result; };
  })();
}
function jsonc(value: Buffer) { return JSON.parse(value.toString().replace(/^\uFEFF/, '').replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, part => part.startsWith('"') ? part : '')); }
async function composition(page: Page, scale: number, info: TestInfo, atlas = false) {
  const source = await archive(), common = jsonc(source('resource_pack/ui/ui_common.json')), ui = jsonc(source('resource_pack/ui/enchanting_screen.json'));
  expect(common.root_panel.size).toEqual([176, 166]); expect(ui.enchanting_panel_top_half.size).toEqual(['100%', '50% - 12px']);
  const grid = ui.enchanting_panel_top_half.controls.find((item: { grid_panel?: unknown }) => item.grid_panel).grid_panel;
  expect(grid.size).toEqual(['65%-8px', '80%+4px']); expect(grid.offset).toEqual([-8, 2]);
  const origin = [(Math.ceil(2570 / scale) - 176) / 2, (Math.ceil(1402 / scale) - 166) / 2], commands: ModelWireCommand[] = [];
  const addImage = (name: string, rect: readonly [number, number, number, number]) => {
    const pixels = PNG.sync.read(source(`resource_pack/textures/ui/${name}.png`)); let metadata;
    try { metadata = jsonc(source(`resource_pack/textures/ui/${name}.json`)); } catch { /* Whole original PNG. */ }
    commands.push({ kind: 'image', texture: { width: pixels.width, height: pixels.height, rgba: pixels.data.toString('base64') }, rect: [rect[0] + origin[0]!, rect[1] + origin[1]!, rect[2], rect[3]],
      ...(metadata?.nineslice_size !== undefined ? { nineSlice: { insets: metadata.nineslice_size, baseSize: metadata.base_size ?? [pixels.width, pixels.height] } } : {}) });
  };
  addImage('dialog_background_opaque', [0, 0, 176, 166]); addImage('close_button_default_compact', [156, 5, 15, 7]);
  const half = 166 * .5 - 12, gw = 176 * .65 - 8, gh = half * .8 + 4, gx = 176 - gw - 8, gy = 7 + (half - gh) / 2 + 2;
  addImage('cell_image', [gx - 1, gy - 1, gw + 2, gh + 2]);
  const slots = [[13, 47.5], [33, 47.5], ...Array.from({ length: 27 }, (_, i) => [7 + i % 9 * 18, 86 + Math.floor(i / 9) * 18]), ...Array.from({ length: 9 }, (_, i) => [7 + i * 18, 143])];
  for (const [x, y] of slots) addImage('cell_image', [x!, y!, 18, 18]); addImage('lapis_image', [34, 48.5, 16, 16]);
  const texture = atlas ? new PNG({ width: 8, height: 8 }) : tile;
  // Independent normal source-tile assembly. No production assembler or native UV buffer.
  if (atlas) for (let row = 0; row < 3; row++) tile.data.copy(texture.data, ((row + 2) * 8 + 3) * 4, row * 2 * 4, (row + 1) * 2 * 4);
  const face: GuiModelGeometry['model']['faces'][number] = { texture: 'all', vertices: [[0, 0, 0], [16, 0, 0], [16, 16, 0], [0, 16, 0]],
    uv: atlas ? [[3, 5], [5, 5], [5, 2], [3, 2]] : [[0, 3], [2, 3], [2, 0], [0, 0]], color: [255, 255, 255, 255] };
  for (const [x, y] of slots) commands.push({ kind: 'model', model: { faces: [face] }, projection: { yaw: 0, pitch: 0, scale: 1, offset: [0, 16], originQuantization: 'physical-floor' },
    origin: [origin[0]! + x! + 1, origin[1]! + y! + 1], textureSizes: { all: [texture.width, texture.height] }, textures: { all: { width: texture.width, height: texture.height, rgba: texture.data.toString('base64') } } });
  for (let i = 0; i < 3; i++) addImage('enchanting_dark_background', [gx, gy + i * gh / 3, gw, gh * .33333333]);
  const actual = await page.evaluate(() => window.enchantingModelQA.raw()); expect(actual.rect).toEqual(scale === 4 ? [932, 369, 707, 667] : [843, 286, 883, 832]);
  const expected = await page.evaluate(value => window.enchantingModelQA.reference(value), { guiScale: scale, outputRect: actual.rect as [number, number, number, number], commands });
  const a = Buffer.from(actual.rgba, 'base64'), b = Buffer.from(expected.rgba, 'base64'); expect([actual.width, actual.height]).toEqual([expected.width, expected.height]);
  await info.attach(`GUI${scale}-${atlas ? 'atlas' : 'pixels'}-whole-composition.json`, { contentType: 'application/json', body: JSON.stringify({ scope: 'Independent original UI queue shares public renderGuiLayer; adapter contract only.', width: actual.width, height: actual.height, pixels: actual.width * actual.height, actual: hash(a), expected: hash(b), renderer: actual.renderer }) });
  expect(a.equals(b), 'Complete adapter framebuffer differs from independent declared source queue').toBe(true);
}

test('default false and CSS routes ignore invalid model internals and never request their unused model URL', async ({ page }) => {
  const requests: string[] = []; page.on('request', request => { if (request.url().includes('qa-model-never-used')) requests.push(request.url()); });
  await open(page, { mode: 'css', guard: true });
  for (const mode of ['default', 'false'] as const) { await configure(page, { mode }); await ready(page); const v = await visuals(page); expect(v.models).toEqual([]); expect(v.items).toEqual(Array(38).fill('visible')); expect(v.leaks).toBe(0); }
  expect(requests).toEqual([]);
});
test('all 38 models take priority over fallback images or icons without emitting duplicate sprites', async ({ page }) => {
  await open(page, { mode: 'models', images: true }); const v = await visuals(page); expect(v.models).toEqual(Array.from({ length: 38 }, (_, i) => i)); expect(v.sprites).toEqual([]); expect(v.items).toEqual(Array(38).fill('hidden')); expect(v.canvas).toBe(1); expect(v.label).not.toBe('rgba(0, 0, 0, 0)'); expect(v.leaks).toBe(0);
  await expect(page.locator('.mc-enchanting__item .mc-slot__count')).toHaveText('5'); await expect(page.locator('.mc-enchanting__item .mc-slot__durability')).toHaveAttribute('aria-valuenow', '0.5');
});
test('mixed model source tokens preserve model-only zero invalid-count sprite and custom-node policies', async ({ page }) => {
  await open(page, { mode: 'models', images: true, all: false }); const v = await visuals(page); expect(v.models).toEqual(Array.from({ length: 38 }, (_, i) => i).filter(i => ![4, 5, 6, 7, 37].includes(i))); expect(v.sprites).toEqual([6]); expect(v.custom).toEqual(['visible', 'visible']);
  await expect(page.locator('.mc-workstation__inventory .mc-slot').nth(1)).toHaveAttribute('data-missing-material', 'true');
  await expect(page.locator('.mc-workstation__inventory .mc-slot').nth(2)).toHaveAttribute('data-empty', 'true'); await expect(page.locator('.mc-workstation__inventory .mc-slot').nth(3)).toHaveAttribute('data-empty', 'true');
});
for (const scale of [4, 5]) test(`GUI${scale} model adapter whole target matches independent source origins and queue`, async ({ page }, info) => { await open(page, { mode: 'models', guiScale: scale }); await composition(page, scale, info); });
test('source atlas retains a non-square original tile without resampling and matches independent normal assembly', async ({ page }, info) => {
  await open(page, { mode: 'models', source: 'atlas' }); await composition(page, 5, info, true);
});
test('CSS roundtrip keeps stateful fallback icon book selection focus and section mounted', async ({ page }) => {
  await open(page); const handles = await stableState(page);
  for (const mode of ['false', 'css', 'models'] as const) { await configure(page, { mode }); if (mode !== 'css') await ready(page); await retained(page, handles); await expect(page.locator('[data-fallback-index="2"]')).toHaveCSS('visibility', mode === 'models' ? 'hidden' : 'visible'); }
});
test('model projection missing textures and source tile metadata failures restore complete CSS at declared scale', async ({ page }) => {
  await open(page); const handles = await stableState(page);
  for (const failure of ['projection', 'texture', 'atlas-overlap', 'atlas-size'] as const) {
    await configure(page, { failure, source: failure.startsWith('atlas') ? 'atlas' : 'pixels', displayScale: 2.5, isolated: true }); await expect(state(page)).toHaveAttribute('data-render-state', 'error');
    const v = await visuals(page); expect(v.size).toEqual([880, 830]); expect(v.panel).not.toBe('none'); expect(v.items).toEqual(Array(38).fill('visible')); await retained(page, handles);
    await configure(page, { failure: 'none', source: 'pixels' }); await ready(page);
  }
});
test('source atlas URL loading and failures never partially hide fallback icons', async ({ page }) => {
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/qa-model-delayed-tile.png', async route => { await gate; await route.fulfill({ contentType: 'image/png', body: PNG.sync.write(tile) }); });
  await page.route('**/qa-model-missing-tile.png', route => route.fulfill({ status: 404, body: 'missing model tile' }));
  await open(page, { mode: 'css' }); await configure(page, { mode: 'models', source: 'atlas', tileUrl: '/qa-model-delayed-tile.png', displayScale: 2.5, isolated: true });
  await expect(layer(page)).toHaveAttribute('data-render-state', 'loading'); let v = await visuals(page); expect(v.size).toEqual([880, 830]); expect(v.items).toEqual(Array(38).fill('visible')); expect(v.panel).not.toBe('none'); release(); await ready(page);
  const handles = await stableState(page); await configure(page, { tileUrl: '/qa-model-missing-tile.png' }); await expect(state(page)).toHaveAttribute('data-render-state', 'error'); v = await visuals(page); expect(v.items).toEqual(Array(38).fill('visible')); await retained(page, handles);
  await configure(page, { tileUrl: '/qa-model-tile.png' }); await ready(page); await retained(page, handles);
});
test('real context loss keeps fallback component state and callbacks before profile recovery', async ({ page }) => {
  await open(page); const handles = await stableState(page);
  await layer(page).evaluate(node => { const extension = (node as HTMLCanvasElement).getContext('webgl')!.getExtension('WEBGL_lose_context'); if (!extension) throw Error('Actual loss extension unavailable'); extension.loseContext(); });
  await expect(layer(page)).toHaveAttribute('data-render-state', 'error'); expect((await visuals(page)).items).toEqual(Array(38).fill('visible')); await retained(page, handles);
  await configure(page, { guiScale: 4 }); await ready(page); await retained(page, handles);
  await page.getByRole('button', { name: 'Item to enchant, 5, 50% durability', exact: true }).click(); await page.getByRole('button', { name: 'Lapis lazuli, 8', exact: true }).click({ button: 'right' });
  await expect(page.getByLabel('Model integration events')).toContainText('input:item:primary|input:lapis:secondary');
});
test('disabled model keeps the host opacity factor without changing its declared vertex alpha', async ({ page }) => {
  const input = async () => { const raw = await page.evaluate(() => window.enchantingModelQA.raw()), bytes = Buffer.from(raw.rgba, 'base64'), region = Buffer.alloc(80 * 80 * 4);
    for (let y = 0; y < 80; y++) bytes.copy(region, y * 80 * 4, ((530 + y - raw.rect[1]!) * raw.width + 915 - raw.rect[0]!) * 4, ((530 + y - raw.rect[1]!) * raw.width + 995 - raw.rect[0]!) * 4);
    return hash(region); };
  await open(page, { mode: 'models', opacity: .8 }); const before = await input();
  await configure(page, { disabled: true }); await ready(page); await expect(page.getByRole('button', { name: 'Item to enchant, 5, 50% durability', exact: true })).toBeDisabled();
  await expect.poll(input).not.toBe(before); const disabled = await input();
  await configure(page, { disabled: false, opacity: .4 }); await ready(page); await expect.poll(input).toBe(disabled);
  await expect(page.locator('.mc-enchanting__item .mc-slot__durability')).toHaveAttribute('aria-valuenow', '0.5'); expect((await visuals(page)).models).toContain(0);
});
test('models preserve scaled dimensions local panning complete close and reopen', async ({ page }, info) => {
  await open(page);
  for (const width of [320, 1280]) for (const guiScale of [4, 5]) for (const displayScale of [1, 2, 2.5]) {
    await page.setViewportSize({ width, height: 1000 }); await configure(page, { guiScale, displayScale }); await ready(page);
    const g = await page.evaluate(() => { const root = window.enchantingModelQA.section!, r = root.getBoundingClientRect(), reserve = document.querySelector('.mc-workstation-image-reservation')!.getBoundingClientRect(), tail = document.querySelector('#tail')!.getBoundingClientRect(), scroll = root.closest('.mc-workstation-scroll')!; scroll.scrollLeft = scroll.scrollWidth;
      return { root: [r.width, r.height], doc: document.documentElement.scrollWidth, reserveBottom: reserve.bottom, tailTop: tail.top, pan: [scroll.clientWidth, scroll.scrollWidth, scroll.scrollLeft], zoom: CSS.supports('zoom', '1') }; });
    expect(g.root).toEqual([352 * displayScale, 332 * displayScale]); expect(g.doc).toBe(width); expect(g.tailTop).toBeGreaterThanOrEqual(g.reserveBottom); if (width === 320) { expect(g.pan[1]).toBeGreaterThan(g.pan[0]!); expect(g.pan[2]).toBeGreaterThan(0); }
    await info.attach(`layout-${width}-${guiScale}-${displayScale}.json`, { contentType: 'application/json', body: JSON.stringify(g) });
  }
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.getByRole('button', { name: 'Close container' }).press('Enter'); await expect(page.locator('.mc-enchanting')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reopen model table' }).click(); await ready(page); expect((await visuals(page)).models).toHaveLength(38); await expect(page.locator('.mc-slot')).toHaveCount(38);
});
