import { test, expect } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { PNG } from 'pngjs';
import type { SpriteConfiguration, SpriteWireCommand } from '../demo/enchanting-sprite-layer-fixture';

// Actual adapter/DOM contract. Source commands are evaluated independently, but
// expected and actual use the same public renderer; this is not a native oracle.
const path = '/demo/enchanting-sprite-layer-fixture.html';
const layer = (page: Page) => page.locator('canvas.mc-enchanting-image-layer');
const hash = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
const image = (size: number, rgba: readonly number[]) => {
  const png = new PNG({ width: size, height: size });
  for (let i = 0; i < png.data.length; i += 4) png.data.set(rgba, i);
  return { png, bytes: PNG.sync.write(png) };
};
const first = image(16, [64, 128, 192, 128]), second = image(16, [220, 45, 90, 255]), font = image(128, [255, 255, 255, 255]);
test.beforeEach(async ({ page }) => {
  await page.route('**/qa-sprite-a.png', route => route.fulfill({ contentType: 'image/png', body: first.bytes }));
  await page.route('**/qa-sprite-b.png', route => route.fulfill({ contentType: 'image/png', body: second.bytes }));
  await page.route('**/qa-sprite-font.png', route => route.fulfill({ contentType: 'image/png', body: font.bytes }));
});
async function configure(page: Page, value: Partial<SpriteConfiguration>) {
  await page.evaluate(value => window.enchantingSpriteQA.configure(value), value);
  for (const [key, expected] of Object.entries(value)) await expect.poll(() => page.locator('main').getAttribute('data-configuration').then(value => JSON.parse(value!)[key])).toEqual(expected);
}
async function ready(page: Page) { await expect(layer(page)).toHaveAttribute('data-render-state', 'ready'); }
async function open(page: Page, value: Partial<SpriteConfiguration> = { mode: 'items' }) {
  await page.goto(path); await page.waitForFunction(() => !!window.enchantingSpriteQA?.section); await page.mouse.move(0, 0);
  await configure(page, value); if (value.mode && value.mode !== 'css') await ready(page);
}
async function visuals(page: Page) {
  return page.evaluate(() => {
    const section = window.enchantingSpriteQA.section!, r = section.getBoundingClientRect();
    const win = section.querySelector<HTMLElement>('.mc-enchanting-image-window');
    return { size: [r.width, r.height], tokens: win?.dataset.itemImages?.split(' ').map(Number) ?? [],
      images: [...section.querySelectorAll('.mc-slot__item > img')].map(node => getComputedStyle(node).visibility),
      label: getComputedStyle(section.querySelector('.mc-workstation__title')!).color, panel: getComputedStyle(section, '::before').display,
      textLabels: win?.dataset.textLabels, textCosts: win?.dataset.textCosts, canvas: section.querySelectorAll('canvas').length };
  });
}
async function inputPixel(page: Page) {
  const raw = await page.evaluate(() => window.enchantingSpriteQA.raw());
  const x = Math.round(2570 / 2 - 88 * 5 + 14 * 5 + 8 * 5), y = 106 * 5 + 8 * 5;
  const bytes = Buffer.from(raw.rgba, 'base64'), offset = ((y - raw.rect[1]!) * raw.width + x - raw.rect[0]!) * 4;
  return [...bytes.subarray(offset, offset + 4)];
}

let archivePromise: Promise<(name: string) => Buffer> | undefined;
async function archive() {
  return archivePromise ??= (async () => {
    const bytes = await readFile(new URL('../.cache/references/bedrock-samples-v1.26.60.5-full.zip', import.meta.url));
    expect(hash(bytes)).toBe('d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf');
    let end = bytes.length - 22; while (end >= 0 && (bytes.readUInt32LE(end) !== 0x06054b50 || end + 22 + bytes.readUInt16LE(end + 20) !== bytes.length)) end--;
    if (end < 0) throw Error('Missing ZIP directory');
    let p = bytes.readUInt32LE(end + 16); const entries = new Map<string, [number, number, number, number]>();
    for (let i = 0; i < bytes.readUInt16LE(end + 10); i++) {
      if (bytes.readUInt32LE(p) !== 0x02014b50) throw Error('Invalid source entry'); const length = bytes.readUInt16LE(p + 28);
      entries.set(bytes.toString('utf8', p + 46, p + 46 + length), [bytes.readUInt16LE(p + 10), bytes.readUInt32LE(p + 20), bytes.readUInt32LE(p + 24), bytes.readUInt32LE(p + 42)]); p += 46 + length + bytes.readUInt16LE(p + 30) + bytes.readUInt16LE(p + 32);
    }
    return (name: string) => { const entry = entries.get(name); if (!entry) throw Error(`Missing ${name}`); const offset = entry[3] + 30 + bytes.readUInt16LE(entry[3] + 26) + bytes.readUInt16LE(entry[3] + 28), packed = bytes.subarray(offset, offset + entry[1]); const result = entry[0] === 0 ? packed : inflateRawSync(packed); expect(result.length).toBe(entry[2]); return result; };
  })();
}
function jsonc(value: Buffer) { return JSON.parse(value.toString().replace(/^\uFEFF/, '').replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, part => part.startsWith('"') ? part : '')); }
async function composition(page: Page, scale: number, info: TestInfo) {
  const source = await archive(), common = jsonc(source('resource_pack/ui/ui_common.json')), ui = jsonc(source('resource_pack/ui/enchanting_screen.json'));
  expect(common.root_panel.size).toEqual([176, 166]); expect(ui.enchanting_panel_top_half.size).toEqual(['100%', '50% - 12px']);
  const grid = ui.enchanting_panel_top_half.controls.find((item: { grid_panel?: unknown }) => item.grid_panel).grid_panel;
  expect(grid.size).toEqual(['65%-8px', '80%+4px']); expect(grid.offset).toEqual([-8, 2]);
  const origin = [(Math.ceil(2570 / scale) - 176) / 2, (Math.ceil(1402 / scale) - 166) / 2];
  const commands: SpriteWireCommand[] = [];
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
  for (const [x, y] of slots) commands.push({ kind: 'sprite', texture: { width: 16, height: 16, rgba: first.png.data.toString('base64') }, rect: [origin[0]! + x! + 1, origin[1]! + y! + 1, 16, 16] });
  for (let i = 0; i < 3; i++) addImage('enchanting_dark_background', [gx, gy + i * gh / 3, gw, gh * .33333333]);
  const actual = await page.evaluate(() => window.enchantingSpriteQA.raw());
  expect(actual.rect).toEqual(scale === 4 ? [932, 369, 707, 667] : [843, 286, 883, 832]);
  const expected = await page.evaluate(value => window.enchantingSpriteQA.reference(value), { guiScale: scale, outputRect: actual.rect as [number, number, number, number], commands });
  expect([actual.width, actual.height]).toEqual([expected.width, expected.height]);
  const a = Buffer.from(actual.rgba, 'base64'), b = Buffer.from(expected.rgba, 'base64');
  await info.attach(`GUI${scale}-entire-composition.json`, { contentType: 'application/json', body: JSON.stringify({ scope: 'Independent original UI commands; actual and expected share public renderGuiLayer. Not native shader certification.', width: actual.width, height: actual.height, pixels: actual.width * actual.height, actual: hash(a), expected: hash(b), renderer: actual.renderer }) });
  expect(a.equals(b), 'Complete actual adapter framebuffer differs from independently constructed original-UI command queue').toBe(true);
}

test('default and explicit false keep all original DOM images and semantic text', async ({ page }) => {
  await open(page, { mode: 'css' }); expect((await visuals(page)).images).toEqual(Array(38).fill('visible'));
  for (const mode of ['default', 'false'] as const) { await configure(page, { mode }); await ready(page); const value = await visuals(page); expect(value.tokens).toEqual([]); expect(value.images).toEqual(Array(38).fill('visible')); expect(value.label).not.toBe('rgba(0, 0, 0, 0)'); await expect(page.locator('.mc-gui-image-layer')).toHaveCount(1); }
});
test('item-only ready layer replaces all 38 source slots without hiding labels counts or durability', async ({ page }) => {
  await open(page); const value = await visuals(page); expect(value.tokens).toEqual(Array.from({ length: 38 }, (_, i) => i)); expect(value.images).toEqual(Array(38).fill('hidden'));
  expect(value.canvas).toBe(1); expect(value.textLabels).toBeUndefined(); expect(value.textCosts).toBeUndefined(); expect(value.label).not.toBe('rgba(0, 0, 0, 0)');
  await expect(page.locator('.mc-enchanting__item .mc-slot__count')).toHaveText('5'); await expect(page.locator('.mc-enchanting__item .mc-slot__durability')).toHaveAttribute('aria-valuenow', '0.5');
  await expect(page.getByRole('button', { name: 'Item to enchant, 5, 50% durability', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await configure(page, { disabledInput: true }); await ready(page);
  await expect(page.getByRole('button', { name: 'Item to enchant, 5, 50% durability', exact: true })).toBeDisabled();
  await expect.poll(() => inputPixel(page)).toEqual([102, 134, 166, 255]);
});
test('custom nodes zero and nonfinite counts retain their existing DOM policy and exact slot token mapping', async ({ page }) => {
  await open(page, { mode: 'items', mixed: true }); const value = await visuals(page);
  expect(value.tokens).toEqual(Array.from({ length: 38 }, (_, i) => i).filter(i => ![4, 5, 6, 37].includes(i))); expect(value.images).toEqual(Array(34).fill('hidden'));
  await expect(page.locator('[data-custom-slot]')).toHaveCount(2); expect(await page.locator('[data-custom-slot]').evaluateAll(nodes => nodes.map(n => getComputedStyle(n).visibility))).toEqual(['visible', 'visible']);
  await expect(page.locator('.mc-workstation__inventory .mc-slot').nth(2)).toHaveAttribute('data-empty', 'true'); await expect(page.locator('.mc-workstation__inventory .mc-slot').nth(4)).toHaveAttribute('data-empty', 'true');
});
test('combined text and sprites share a ready target while canonical labels and overlay numbers stay accessible', async ({ page }) => {
  await open(page, { mode: 'combined', options: true }); const value = await visuals(page); expect(value.textLabels).toBe('true'); expect(value.textCosts).toBe('true'); expect(value.label).toBe('rgba(0, 0, 0, 0)'); expect(value.images).toEqual(Array(38).fill('hidden'));
  await expect(page.getByRole('heading', { name: '1', exact: true })).toHaveCount(1); await expect(page.locator('.mc-slot__count').first()).toHaveText('5');
});
for (const scale of [4, 5]) test(`GUI${scale} actual sprite composition matches a complete independent original-UI command queue`, async ({ page }, info) => { await open(page, { mode: 'items', guiScale: scale }); await composition(page, scale, info); });
test('source semi-transparent sprite takes ceil-alpha and changing its URL repaints without losing selection or book state', async ({ page }) => {
  await open(page); expect(await inputPixel(page)).toEqual([64, 128, 192, 255]); const slot = page.locator('.mc-workstation__inventory .mc-slot').first(); await slot.click(); await slot.focus(); await page.evaluate(() => window.enchantingSpriteQA.incrementBook());
  await configure(page, { image: '/qa-sprite-b.png' }); await ready(page); await expect.poll(() => inputPixel(page)).toEqual([220, 45, 90, 255]); await expect(slot).toHaveAttribute('aria-pressed', 'true'); await expect(slot).toBeFocused(); await expect(page.locator('[data-book-state]')).toHaveAttribute('data-book-state', '1');
});
test('delayed source loading keeps full-scale CSS paints until every sprite in the single layer is ready', async ({ page }) => {
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/qa-sprite-delayed.png', async route => { await gate; await route.fulfill({ contentType: 'image/png', body: first.bytes }); });
  await open(page, { mode: 'css' }); await configure(page, { mode: 'items', displayScale: 2.5, image: '/qa-sprite-delayed.png' }); await expect(layer(page)).toHaveAttribute('data-render-state', 'loading');
  const loading = await visuals(page); expect(loading.size).toEqual([880, 830]); expect(loading.images).toEqual(Array(38).fill('visible')); expect(loading.panel).not.toBe('none');
  release(); await ready(page); expect((await visuals(page)).images).toEqual(Array(38).fill('hidden'));
});
test('source failure and invalid text recover atomically while preserving section ref focus selection and stateful book', async ({ page }) => {
  await page.route('**/qa-sprite-missing.png', route => route.fulfill({ status: 404, body: 'missing fixture image' }));
  await open(page); const slot = page.locator('.mc-workstation__inventory .mc-slot').first(), section = await page.locator('.mc-enchanting').elementHandle();
  await slot.click(); await slot.focus(); await page.evaluate(() => window.enchantingSpriteQA.incrementBook());
  for (const config of [{ image: '/qa-sprite-missing.png', displayScale: 2.5 }, { mode: 'combined', image: '/qa-sprite-a.png', invalidMetrics: true }, { mode: 'items', invalidMetrics: false }] as const) {
    await configure(page, config); if ('invalidMetrics' in config && !config.invalidMetrics) await ready(page); else await expect(page.locator('.mc-enchanting-image-layer,.mc-enchanting-image-error')).toHaveAttribute('data-render-state', 'error');
    expect(await section!.evaluate(node => node === window.enchantingSpriteQA.section)).toBe(true); await expect(slot).toBeFocused(); await expect(slot).toHaveAttribute('aria-pressed', 'true'); await expect(page.locator('[data-book-state]')).toHaveAttribute('data-book-state', '1');
    const value = await visuals(page); expect(value.size).toEqual([880, 830]); if (!('invalidMetrics' in config && !config.invalidMetrics)) { expect(value.panel).not.toBe('none'); expect(value.images).toEqual(Array(38).fill('visible')); }
  }
});
test('actual context loss restores all DOM images then recovers the same live component and input callbacks', async ({ page }) => {
  await open(page, { mode: 'items', options: true }); const slot = page.locator('.mc-workstation__inventory .mc-slot').first(); await slot.click(); await slot.focus(); await page.evaluate(() => window.enchantingSpriteQA.incrementBook());
  await layer(page).evaluate(node => { const extension = (node as HTMLCanvasElement).getContext('webgl')!.getExtension('WEBGL_lose_context'); if (!extension) throw Error('Required loss extension unavailable'); extension.loseContext(); });
  await expect(layer(page)).toHaveAttribute('data-render-state', 'error'); expect((await visuals(page)).images).toEqual(Array(38).fill('visible')); await expect(slot).toBeFocused();
  await configure(page, { guiScale: 4 }); await ready(page); await expect(slot).toHaveAttribute('aria-pressed', 'true'); await expect(page.locator('[data-book-state]')).toHaveAttribute('data-book-state', '1');
  await page.getByRole('button', { name: 'Item to enchant, 5, 50% durability', exact: true }).click(); await page.getByRole('button', { name: 'Lapis lazuli, 8', exact: true }).click({ button: 'right' }); await page.getByRole('button', { name: 'First 1', exact: true }).press('Enter');
  await expect(page.getByLabel('Sprite integration events')).toContainText('input:item:primary|input:lapis:secondary|enchant:first');
});
test('GUI4 and GUI5 zoom layouts reserve dimensions retain local panning and reopen completely', async ({ page }, info) => {
  await open(page);
  for (const width of [320, 1280]) for (const guiScale of [4, 5]) for (const displayScale of [1, 2, 2.5]) {
    await page.setViewportSize({ width, height: 1000 }); await configure(page, { guiScale, displayScale }); await ready(page);
    const geometry = await page.evaluate(() => {
      const root = window.enchantingSpriteQA.section!, r = root.getBoundingClientRect(), canvas = root.querySelector<HTMLCanvasElement>('canvas')!, b = canvas.getBoundingClientRect(), reserve = document.querySelector('.mc-workstation-image-reservation')!.getBoundingClientRect(), tail = document.querySelector('#tail')!.getBoundingClientRect();
      const scroll = root.closest('.mc-workstation-scroll')!; scroll.scrollLeft = scroll.scrollWidth;
      return { zoom: CSS.supports('zoom', '1'), root: [r.width, r.height], canvas: [b.width, b.height], backing: [canvas.width, canvas.height], doc: document.documentElement.scrollWidth, tailTop: tail.top, reserveBottom: reserve.bottom,
        pan: { client: scroll.clientWidth, extent: scroll.scrollWidth, after: scroll.scrollLeft } };
    });
    expect(geometry.root).toEqual([352 * displayScale, 332 * displayScale]); expect(geometry.doc).toBe(width); expect(geometry.tailTop).toBeGreaterThanOrEqual(geometry.reserveBottom);
    if (width === 320) { expect(geometry.pan.extent).toBeGreaterThan(geometry.pan.client); expect(geometry.pan.after).toBeGreaterThan(0); }
    const ratio = 2 / guiScale * displayScale;
    for (let axis = 0; axis < 2; axis++) {
      const ideal = geometry.backing[axis]! * ratio;
      if (Number.isInteger(ratio)) expect(geometry.canvas[axis]).toBe(ideal);
      else expect(Math.abs(geometry.canvas[axis]! - ideal)).toBeLessThan(1 / 64); // CSS fractional layout quantum, not a raster tolerance.
    }
    await info.attach(`layout-${width}-${guiScale}-${displayScale}.json`, { contentType: 'application/json', body: JSON.stringify(geometry) });
  }
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.getByRole('button', { name: 'Close container' }).press('Enter'); await expect(page.locator('.mc-enchanting')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reopen sprite table' }).click(); await ready(page); await expect(page.locator('.mc-enchanting .mc-slot')).toHaveCount(38); expect((await visuals(page)).images).toEqual(Array(38).fill('hidden'));
});
