import { test, expect } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { PNG } from 'pngjs';
import type { GrindConfiguration, GrindWireCommand } from '../demo/grindstone-image-layer-fixture';
import type { GuiModelGeometry } from '../src/gui-model-geometry';
import type { GuiTextFont } from '../src/gui-text-geometry';

// Source queue expected below is independently evaluated from the original UI.
// It shares public renderGuiLayer with actual, so equality certifies the adapter,
// never a second shader implementation or native whole-GUI rendering.
const path = '/demo/grindstone-image-layer-fixture.html';
const layer = (page: Page) => page.locator('canvas.mc-grindstone-image-layer');
const marker = (page: Page) => page.locator('.mc-grindstone-image-layer,.mc-grindstone-image-error');
const hash = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
const sprite = new PNG({ width: 16, height: 16 }); for (let i = 0; i < sprite.data.length; i += 4) sprite.data.set([60, 130, 190, 128], i);
const font = new PNG({ width: 128, height: 128 }); font.data.fill(255);
const tile = new PNG({ width: 2, height: 3 }); tile.data.set([40,80,120,128, 180,30,90,255, 20,200,60,255, 230,170,30,128, 75,45,220,255, 190,210,40,255]);
test.beforeEach(async ({ page }) => {
  await page.route('**/qa-grind-sprite.png', route => route.fulfill({ contentType: 'image/png', body: PNG.sync.write(sprite) }));
  await page.route('**/qa-grind-font.png', route => route.fulfill({ contentType: 'image/png', body: PNG.sync.write(font) }));
  await page.route('**/qa-grind-tile.png', route => route.fulfill({ contentType: 'image/png', body: PNG.sync.write(tile) }));
});
async function configure(page: Page, value: Partial<GrindConfiguration>) {
  await page.evaluate(value => window.grindstoneSourceQA.configure(value), value);
  for (const [key, expected] of Object.entries(value)) await expect.poll(() => page.locator('main').getAttribute('data-configuration').then(value => JSON.parse(value!)[key])).toEqual(expected);
}
async function ready(page: Page) { await expect(layer(page)).toHaveAttribute('data-render-state', 'ready'); }
async function open(page: Page, value: Partial<GrindConfiguration> = { mode: 'images' }) {
  await page.goto(path); await page.waitForFunction(() => !!window.grindstoneSourceQA?.section); await page.mouse.move(0, 0);
  await configure(page, value); if (value.mode && value.mode !== 'css') await ready(page);
}
async function visuals(page: Page) {
  return page.evaluate(() => {
    const root = window.grindstoneSourceQA.section!, rect = root.getBoundingClientRect(), win = root.querySelector<HTMLElement>('.mc-grindstone-image-window');
    return { size: [rect.width, rect.height], models: win?.dataset.itemModels?.split(' ').map(Number) ?? [], sprites: win?.dataset.itemImages?.split(' ').map(Number) ?? [],
      wrappers: [...root.querySelectorAll('.mc-slot__item')].map(node => getComputedStyle(node).visibility),
      images: [...root.querySelectorAll('.mc-slot__item > img')].map(node => getComputedStyle(node).visibility),
      custom: root.querySelector('[data-custom-node]') ? getComputedStyle(root.querySelector('[data-custom-node]')!).visibility : null,
      panel: getComputedStyle(root, '::before').display, arrow: getComputedStyle(root.querySelector('.mc-grindstone__arrow')!).visibility,
      labels: [...root.querySelectorAll('[data-custom-text]')].map(node => getComputedStyle(node).visibility), labelFlag: win?.dataset.textLabels,
      canvas: root.querySelectorAll('canvas').length, leaks: root.querySelectorAll('[guimodel],[imagerender],[itemmodels],[projection],[textures]').length };
  });
}
async function stable(page: Page) {
  await page.evaluate(() => window.grindstoneSourceQA.incrementFallback()); const slot = page.locator('.mc-workstation__inventory .mc-slot').first(); await slot.click(); await slot.focus();
  const section = await page.locator('.mc-grindstone').elementHandle(); return { slot, section };
}
async function retained(page: Page, handles: Awaited<ReturnType<typeof stable>>) {
  expect(await handles.section!.evaluate(node => node === window.grindstoneSourceQA.section)).toBe(true); await expect(handles.slot).toBeFocused(); await expect(handles.slot).toHaveAttribute('aria-pressed', 'true'); await expect(page.locator('[data-fallback-state]')).toHaveAttribute('data-fallback-state', '1');
}

let archivePromise: Promise<(name: string) => Buffer> | undefined;
async function archive() {
  return archivePromise ??= (async () => {
    const bytes = await readFile(new URL('../.cache/references/bedrock-samples-v1.26.60.5-full.zip', import.meta.url));
    expect(hash(bytes)).toBe('d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf');
    let end = bytes.length - 22; while (end >= 0 && (bytes.readUInt32LE(end) !== 0x06054b50 || end + 22 + bytes.readUInt16LE(end + 20) !== bytes.length)) end--;
    if (end < 0) throw Error('Missing ZIP directory'); let p = bytes.readUInt32LE(end + 16); const entries = new Map<string, [number, number, number, number]>();
    for (let i = 0; i < bytes.readUInt16LE(end + 10); i++) {
      if (bytes.readUInt32LE(p) !== 0x02014b50) throw Error('Invalid ZIP entry'); const length = bytes.readUInt16LE(p + 28);
      entries.set(bytes.toString('utf8', p + 46, p + 46 + length), [bytes.readUInt16LE(p + 10), bytes.readUInt32LE(p + 20), bytes.readUInt32LE(p + 24), bytes.readUInt32LE(p + 42)]); p += 46 + length + bytes.readUInt16LE(p + 30) + bytes.readUInt16LE(p + 32);
    }
    return (name: string) => { const entry = entries.get(name); if (!entry) throw Error(`Missing ${name}`); const offset = entry[3] + 30 + bytes.readUInt16LE(entry[3] + 26) + bytes.readUInt16LE(entry[3] + 28), data = bytes.subarray(offset, offset + entry[1]); const raw = entry[0] === 0 ? data : inflateRawSync(data); expect(raw.length).toBe(entry[2]); return raw; };
  })();
}
function jsonc(value: Buffer) { return JSON.parse(value.toString().replace(/^\uFEFF/, '').replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, part => part.startsWith('"') ? part : '')); }
function ordinaryCloseGeometry(common: any) {
  const instance = common.common_panel.controls.find((value: any) => value.close_button_holder).close_button_holder.controls.find((value: any) => value['close@common.close_button'])['close@common.close_button'];
  const button = common.close_button;
  expect(common.root_panel.size).toEqual([176, 166]); expect(instance.offset).toBe('$close_button_offset'); expect(button.offset).toBe('$close_button_offset');
  expect(button.anchor_from).toBe('top_right'); expect(button.anchor_to).toBe('top_right'); expect(button.size).toEqual([21, 21]);
  expect(button['$close_button_offset|default']).toEqual([-2, 2]); expect(button['$close_button_panel_size|default']).toEqual([15, 15]);
  expect(common.close_button_panel.size).toBe('$close_button_panel_size');
  // The instance's offset expression resolves in the close control's own scope.
  // The unrelated common_panel default [0,0] does not erase its local [-2,2].
  const [w, h] = button.size, [dx, dy] = button['$close_button_offset|default'], [iw, ih] = button['$close_button_panel_size|default'];
  const hit = [common.root_panel.size[0] - w + dx, dy, w, h];
  return { hit, image: [hit[0] + (w - iw) / 2, hit[1] + (h - ih) / 2, iw, ih] as [number, number, number, number] };
}
async function composition(page: Page, scale: number, info: TestInfo, options: { invalid: boolean; models: boolean; text: boolean }) {
  const source = await archive(), common = jsonc(source('resource_pack/ui/ui_common.json')), grind = jsonc(source('resource_pack/ui/grindstone_screen.json'));
  expect(common.root_panel.size).toEqual([176, 166]); expect(common.container_item.size).toEqual([18, 18]); expect(common.close_button.size).toEqual([21, 21]); expect(common.close_button['$close_button_panel_size|default']).toEqual([15, 15]); expect(common.common_panel['$close_button_offset|default']).toEqual([0, 0]);
  expect(grind.top_half_panel.size).toEqual(['100% - 8px', '50% - 8px']); expect(grind.top_half_panel.offset).toEqual([4, 6]); expect(grind.grindstone_slots_panel.size).toEqual([90, 56]); expect(grind.grindstone_middle_panel.size).toEqual([18, 41]);
  expect(grind.arrow_icon.size).toEqual([22, 15]); expect(grind.cross_out_icon.size).toEqual([15, 15]); expect(grind.arrow_icon.texture).toBe('textures/ui/arrow_large'); expect(grind.cross_out_icon.texture).toBe('textures/ui/crossout');
  expect(common.close_button['$close_button_default_texture|default']).toBe('textures/ui/close_button_default'); expect(common.inventory_panel.controls[0].inventory_grid.size).toEqual([162, 54]); expect(common.inventory_panel.controls[0].inventory_grid.offset).toEqual([0, -26]); expect(common.hotbar_grid_template.size).toEqual([162, 18]); expect(common.hotbar_grid_template.offset).toEqual([0, -5]);
  const rootW = 176, rootH = 166, topW = rootW - 8, topH = rootH * .5 - 8, slotsX = 4 + (topW - 90) / 2, slotsY = 6 + (topH - 56) / 2 + 4;
  const midY = slotsY + (56 - 41) / 2;
  const local = [[slotsX, midY + 1], [slotsX, midY + 41 - 18 - 1], [slotsX + 90 - 18, slotsY + (56 - 18) / 2],
    ...Array.from({ length: 27 }, (_, i) => [(rootW - 162) / 2 + i % 9 * 18, rootH - 26 - 54 + Math.floor(i / 9) * 18]), ...Array.from({ length: 9 }, (_, i) => [(rootW - 162) / 2 + i * 18, rootH - 5 - 18])];
  const origin = [(Math.ceil(2570 / scale) - rootW) / 2, (Math.ceil(1402 / scale) - rootH) / 2], commands: GrindWireCommand[] = [];
  const addImage = (name: string, rect: readonly [number, number, number, number]) => {
    const pixels = PNG.sync.read(source(`resource_pack/textures/ui/${name}.png`)); let metadata;
    try { metadata = jsonc(source(`resource_pack/textures/ui/${name}.json`)); } catch { /* Whole source PNG. */ }
    commands.push({ kind: 'image', texture: { width: pixels.width, height: pixels.height, rgba: pixels.data.toString('base64') }, rect: [origin[0]! + rect[0], origin[1]! + rect[1], rect[2], rect[3]],
      ...(metadata?.nineslice_size !== undefined ? { nineSlice: { insets: metadata.nineslice_size, baseSize: metadata.base_size ?? [pixels.width, pixels.height] } } : {}) });
  };
  addImage('dialog_background_opaque', [0, 0, rootW, rootH]); addImage('close_button_default', ordinaryCloseGeometry(common).image);
  if (options.text) {
    const labels: GuiTextFont = { pages: ['/qa-grind-font.png'], pageSizes: [128], cellHeight: 12, lineHeight: 12, glyphs: { '1': { page: 0, x: 0, y: 0, width: 8, height: 12, advance: 6, offsetY: -3 } } };
    for (const [x, y] of [[4 + 4, 6 + 2], [7, rootH - 93 + 3]]) commands.push({ kind: 'text', text: '1', font: labels, fontPixels: { width: 128, height: 128, rgba: font.data.toString('base64') }, origin: [origin[0]! + x!, origin[1]! + y! + 1], fontScale: 1, sampling: 'point', shader: 'bitmap', color: [76, 76, 76, 255] });
  }
  for (const [x, y] of local) addImage('cell_image', [x!, y!, 18, 18]);
  const arrowX = slotsX + (90 - 22) / 2, arrowY = slotsY + (56 - 15) / 2;
  addImage('arrow_large', [arrowX, arrowY, 22, 15]); if (options.invalid) addImage('crossout', [arrowX + (22 - 15) / 2, arrowY, 15, 15]);
  const packed = new PNG({ width: 8, height: 8 }); for (let row = 0; row < 3; row++) tile.data.copy(packed.data, ((row + 2) * 8 + 3) * 4, row * 2 * 4, (row + 1) * 2 * 4);
  const face: GuiModelGeometry['model']['faces'][number] = { texture: 'all', vertices: [[0, 0, 0], [16, 0, 0], [16, 16, 0], [0, 16, 0]], uv: [[3, 5], [5, 5], [5, 2], [3, 2]], color: [255, 255, 255, 255] };
  for (const [x, y] of local) {
    if (options.models) commands.push({ kind: 'model', model: { faces: [face] }, projection: { yaw: 0, pitch: 0, scale: 1, offset: [0, 16], originQuantization: 'physical-floor' }, origin: [origin[0]! + x! + 1, origin[1]! + y! + 1], textureSizes: { all: [8, 8] }, textures: { all: { width: 8, height: 8, rgba: packed.data.toString('base64') } } });
    else commands.push({ kind: 'sprite', rect: [origin[0]! + x! + 1, origin[1]! + y! + 1, 16, 16], texture: { width: 16, height: 16, rgba: sprite.data.toString('base64') } });
  }
  const actual = await page.evaluate(() => window.grindstoneSourceQA.raw()); expect(actual.rect).toEqual(scale === 4 ? [932, 369, 707, 667] : [843, 286, 883, 832]);
  const expected = await page.evaluate(value => window.grindstoneSourceQA.reference(value), { guiScale: scale, outputRect: actual.rect as [number, number, number, number], commands });
  const a = Buffer.from(actual.rgba, 'base64'), b = Buffer.from(expected.rgba, 'base64'); expect([actual.width, actual.height]).toEqual([expected.width, expected.height]);
  await info.attach(`GUI${scale}-whole-source-queue.json`, { contentType: 'application/json', body: JSON.stringify({ scope: 'Independent original UI/source PNG queue shares public renderGuiLayer; adapter contract only.', width: actual.width, height: actual.height, pixels: actual.width * actual.height, actual: hash(a), expected: hash(b), renderer: actual.renderer, options }) });
  expect(a.equals(b), 'Complete actual source target differs from independent original UI command queue').toBe(true);
}

test('default CSS and explicit source skins retain39 slots ordinary close and caller visual labels', async ({ page }) => {
  await open(page, { mode: 'css' }); await expect(layer(page)).toHaveCount(0); await expect(page.locator('.mc-grindstone .mc-slot')).toHaveCount(39);
  const close = ordinaryCloseGeometry(jsonc((await archive())('resource_pack/ui/ui_common.json')));
  expect(close.hit).toEqual([153, 2, 21, 21]); expect(close.image).toEqual([156, 5, 15, 15]);
  for (const [selector, expected] of [['.mc-dialog__close', close.hit], ['.mc-dialog__close-icon', close.image]] as const) {
    const actual = await page.locator('.mc-grindstone').evaluate((root, selector) => { const r = root.getBoundingClientRect(), c = root.querySelector(selector)!.getBoundingClientRect(); return [(c.x - r.x) / 2, (c.y - r.y) / 2, c.width / 2, c.height / 2]; }, selector);
    expect(actual).toEqual(expected);
  }
  await configure(page, { mode: 'images' }); await ready(page); const v = await visuals(page); expect(v.canvas).toBe(1); expect(v.sprites).toEqual([]); expect(v.models).toEqual([]); expect(v.images).toEqual(Array(39).fill('visible')); expect(v.labels).toEqual(['visible', 'visible']); expect(v.leaks).toBe(0);
  await expect(page.getByRole('button', { name: 'Close container' })).toHaveCount(1);
});
test('GUI4 invalid source sprites match complete independent arrow crossout close and39-cell queue', async ({ page }, info) => { await open(page, { mode: 'images', itemImages: true, invalid: true, guiScale: 4 }); await composition(page, 4, info, { invalid: true, models: false, text: false }); });
test('GUI5 labels models and source atlas match complete independently evaluated source queue', async ({ page }, info) => {
  await open(page, { mode: 'combined', content: 'models', itemModels: true, itemImages: true, source: 'atlas' }); await composition(page, 5, info, { invalid: false, models: true, text: true });
  const v = await visuals(page); expect(v.models).toEqual(Array.from({ length: 39 }, (_, i) => i)); expect(v.sprites).toEqual([]); expect(v.labelFlag).toBe('true'); expect(v.labels).toEqual(['hidden', 'hidden']);
});
test('mixed models sprites custom nodes and empty counts preserve exact index policies counts and durability', async ({ page }) => {
  await open(page, { mode: 'images', content: 'mixed', itemModels: true, itemImages: true }); const v = await visuals(page);
  expect(v.models).toEqual([1, 2, 3]); expect(v.sprites).toEqual(Array.from({ length: 39 }, (_, i) => i).filter(i => ![1, 2, 3, 5, 6, 7].includes(i))); expect(v.custom).toBe('visible'); expect(v.leaks).toBe(0);
  await expect(page.locator('.mc-grindstone__input .mc-slot__count')).toHaveText('5'); await expect(page.locator('.mc-workstation__inventory .mc-slot').first().locator('.mc-slot__count')).toHaveText('8'); await expect(page.locator('.mc-grindstone__input .mc-slot__durability')).toHaveAttribute('aria-valuenow', '0.5');
  await expect(page.locator('.mc-grindstone__additional')).toHaveAttribute('data-missing-material', 'true');
});
test('input navigation and result callbacks stay live while invalid empty zero andNaN results are guarded', async ({ page }) => {
  await open(page, { mode: 'images', itemImages: true }); const first = page.locator('.mc-grindstone__input'), second = page.locator('.mc-grindstone__additional'), result = page.locator('.mc-grindstone__result');
  await first.press('ArrowDown'); await expect(second).toBeFocused(); await second.press('ArrowRight'); await expect(result).toBeFocused(); await result.press('ArrowLeft'); await expect(second).toBeFocused(); await second.press('ArrowUp'); await expect(first).toBeFocused();
  await first.press('Enter'); await second.click({ button: 'right' }); await result.click(); await result.click({ button: 'right' }); const events = await page.getByLabel('Grindstone integration events').textContent(); expect(events).toContain('input:0:primary|input:1:secondary|take:primary|take:secondary');
  for (const config of [{ invalid: true }, { invalid: false, result: 'null' }, { result: 'zero' }, { result: 'nan' }] as const) { await configure(page, config); await ready(page); await expect(result).toHaveAttribute('aria-disabled', 'true');
    // ARIA-disabled remains a focusable native button; exercise its actual DOM
    // guards directly instead of letting Playwright refuse the action first.
    await result.evaluate(node => { (node as HTMLButtonElement).click(); node.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })); }); await result.press('Enter'); await expect(page.getByLabel('Grindstone integration events')).toHaveText(events!); }
  await configure(page, { result: 'full' }); await ready(page); await result.press('Enter'); await expect(page.getByLabel('Grindstone integration events')).toHaveText(events + '|take:primary');
});
test('selected inventory and stateful fallback survive CSS and source presentation roundtrips', async ({ page }) => {
  await open(page, { mode: 'images', content: 'mixed', itemModels: true, itemImages: true }); const handles = await stable(page);
  for (const mode of ['css', 'images', 'combined'] as const) { await configure(page, { mode }); if (mode !== 'css') await ready(page); await retained(page, handles); await expect(page.locator('[data-fallback-state]')).toHaveCSS('visibility', mode === 'css' ? 'visible' : 'hidden'); }
});
test('bad optional metrics model projection and tile dimensions atomically restore allCSS at declared scale', async ({ page }) => {
  await open(page, { mode: 'combined', content: 'models', itemModels: true, source: 'atlas' }); const handles = await stable(page);
  for (const failure of ['metrics', 'projection', 'atlas-size'] as const) { await configure(page, { failure, displayScale: 2.5 }); await expect(marker(page)).toHaveAttribute('data-render-state', 'error'); const v = await visuals(page); expect(v.size).toEqual([880, 830]); expect(v.panel).not.toBe('none'); expect(v.wrappers).toEqual(Array(39).fill('visible')); expect(v.labels).toEqual(['visible', 'visible']); await retained(page, handles); await configure(page, { failure: 'none' }); await ready(page); }
});
test('one pending or failed atlas tile keeps every fallback visible until the whole source target succeeds', async ({ page }) => {
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; }); await page.route('**/qa-grind-delayed.png', async route => { await gate; await route.fulfill({ contentType: 'image/png', body: PNG.sync.write(tile) }); }); await page.route('**/qa-grind-missing.png', route => route.fulfill({ status: 404, body: 'missing source tile' }));
  await open(page, { mode: 'css', content: 'models' }); await configure(page, { mode: 'images', itemModels: true, source: 'atlas', tileUrl: '/qa-grind-delayed.png', displayScale: 2.5 }); await expect(layer(page)).toHaveAttribute('data-render-state', 'loading'); let v = await visuals(page); expect(v.size).toEqual([880, 830]); expect(v.wrappers).toEqual(Array(39).fill('visible')); release(); await ready(page);
  const handles = await stable(page); await configure(page, { tileUrl: '/qa-grind-missing.png' }); await expect(marker(page)).toHaveAttribute('data-render-state', 'error'); v = await visuals(page); expect(v.wrappers).toEqual(Array(39).fill('visible')); await retained(page, handles); await configure(page, { tileUrl: '/qa-grind-tile.png' }); await ready(page); await retained(page, handles);
});
test('actual context loss restores fallback icons then recovers focus selection state and input actions', async ({ page }) => {
  await open(page, { mode: 'images', content: 'models', itemModels: true }); const handles = await stable(page);
  await layer(page).evaluate(node => { const extension = (node as HTMLCanvasElement).getContext('webgl')!.getExtension('WEBGL_lose_context'); if (!extension) throw Error('Actual loss extension unavailable'); extension.loseContext(); });
  await expect(layer(page)).toHaveAttribute('data-render-state', 'error'); expect((await visuals(page)).wrappers).toEqual(Array(39).fill('visible')); await retained(page, handles); await configure(page, { guiScale: 4 }); await ready(page); await retained(page, handles);
  await page.locator('.mc-grindstone__input').press('Enter'); await expect(page.getByLabel('Grindstone integration events')).toContainText('input:0:primary');
});
test('disabled model branch is not inspected or fetched until the caller enables itemModels', async ({ page }) => {
  const requested: string[] = []; page.on('request', request => { if (request.url().includes('qa-grind-never')) requested.push(request.url()); });
  await open(page, { mode: 'images', content: 'models', itemModels: false, failure: 'projection', source: 'atlas', tileUrl: '/qa-grind-never.png' }); expect((await visuals(page)).models).toEqual([]); expect((await visuals(page)).wrappers).toEqual(Array(39).fill('visible')); expect(requested).toEqual([]);
});
test('wide narrow and exact physical-scale layouts reserve complete contents and close and reopen39 slots', async ({ page }, info) => {
  await open(page, { mode: 'images', content: 'mixed', itemModels: true, itemImages: true });
  for (const width of [320, 1280]) for (const guiScale of [4, 5]) for (const displayScale of [1, 2, 2.5]) { await page.setViewportSize({ width, height: 1000 }); await configure(page, { guiScale, displayScale }); await ready(page);
    const g = await page.evaluate(() => { const root = window.grindstoneSourceQA.section!, r = root.getBoundingClientRect(), canvas = root.querySelector<HTMLCanvasElement>('canvas')!, c = canvas.getBoundingClientRect(), reserve = document.querySelector('.mc-workstation-image-reservation')!.getBoundingClientRect(), tail = document.querySelector('#tail')!.getBoundingClientRect(), scroll = root.closest('.mc-workstation-scroll')!; scroll.scrollLeft = scroll.scrollWidth; return { root: [r.width, r.height], backing: [canvas.width, canvas.height], canvas: [c.width, c.height], doc: document.documentElement.scrollWidth, reserveBottom: reserve.bottom, tailTop: tail.top, pan: [scroll.clientWidth, scroll.scrollWidth, scroll.scrollLeft], zoom: CSS.supports('zoom', '1') }; });
    expect(g.root).toEqual([352 * displayScale, 332 * displayScale]); expect(g.doc).toBe(width); expect(g.tailTop).toBeGreaterThanOrEqual(g.reserveBottom); if (width === 320) { expect(g.pan[1]).toBeGreaterThan(g.pan[0]!); expect(g.pan[2]).toBeGreaterThan(0); } const ratio = 2 / guiScale * displayScale; for (let axis = 0; axis < 2; axis++) if (Number.isInteger(ratio)) expect(g.canvas[axis]).toBe(g.backing[axis]! * ratio);
    await info.attach(`layout-${width}-${guiScale}-${displayScale}.json`, { contentType: 'application/json', body: JSON.stringify(g) }); }
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.getByRole('button', { name: 'Close container' }).press('Enter'); await expect(page.locator('.mc-grindstone')).toHaveCount(0); await page.getByRole('button', { name: 'Reopen grindstone' }).click(); await ready(page); await expect(page.locator('.mc-slot')).toHaveCount(39);
});
