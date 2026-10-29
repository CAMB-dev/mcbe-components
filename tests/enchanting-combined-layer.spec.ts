import { test, expect } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { PNG } from 'pngjs';
import type { CombinedConfiguration, WireImage, WireText } from '../demo/enchanting-combined-layer-fixture';

// This suite owns the ACTUAL component composition/DOM contract. The reference
// queue below is independently built from original UI definitions. It uses the
// public low-level renderer, and is NOT an independent shader/native RGBA oracle.
const path = '/demo/enchanting-combined-layer-fixture.html';
const canvas = (page: Page) => page.locator('canvas.mc-enchanting-image-layer');
const stateMarker = (page: Page) => page.locator('canvas.mc-enchanting-image-layer,.mc-enchanting-image-error');
const hash = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
function fontPng() {
  const image = new PNG({ width: 128, height: 128 });
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const i = (y * 128 + x) * 4;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = 255;
    image.data[i + 3] = x % 8 === (Math.floor(y / 16) + Math.floor(x / 8)) % 7 || y % 16 > 11 ? 0 : 255;
  }
  return { image, png: PNG.sync.write(image) };
}
const synthetic = fontPng();
async function configure(page: Page, value: Partial<CombinedConfiguration>) {
  await page.evaluate(value => window.enchantingCombinedQA.configure(value), value);
  if (value.mode) await expect(page.locator('main')).toHaveAttribute('data-configuration', new RegExp(`"mode":"${value.mode}"`));
}
async function ready(page: Page) { await expect(canvas(page)).toHaveAttribute('data-render-state', 'ready'); }
async function open(page: Page, value: Partial<CombinedConfiguration> = { mode: 'combined' }) {
  await page.goto(path); await page.waitForFunction(() => !!window.enchantingCombinedQA?.section);
  await page.evaluate(url => window.enchantingCombinedQA.setFontUrl(url), `data:image/png;base64,${synthetic.png.toString('base64')}`);
  await page.mouse.move(0, 0); await configure(page, value);
  if (value.mode === 'combined' || value.mode === 'images') await ready(page);
}
async function visuals(page: Page) {
  return page.evaluate(() => {
    const section = window.enchantingCombinedQA.section!, layer = section.querySelector<HTMLCanvasElement>('canvas.mc-enchanting-image-layer');
    const custom = [...section.querySelectorAll<HTMLElement>('[data-custom-text]')];
    return { ready: layer?.dataset.renderState === 'ready', canvasCount: section.querySelectorAll('canvas').length,
      panel: getComputedStyle(section, '::before').display,
      custom: custom.map(node => getComputedStyle(node).visibility),
      labelColor: getComputedStyle(section.querySelector('.mc-workstation__title')!).color,
      runes: [...section.querySelectorAll('.mc-enchanting__runes')].map(node => getComputedStyle(node).visibility),
      width: section.getBoundingClientRect().width, height: section.getBoundingClientRect().height };
  });
}

let archivePromise: Promise<(name: string) => Buffer> | undefined;
async function archive() {
  return archivePromise ??= (async () => {
    const bytes = await readFile(new URL('../.cache/references/bedrock-samples-v1.26.60.5-full.zip', import.meta.url));
    expect(hash(bytes)).toBe('d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf');
    let end = bytes.length - 22;
    while (end >= 0 && (bytes.readUInt32LE(end) !== 0x06054b50 || end + 22 + bytes.readUInt16LE(end + 20) !== bytes.length)) end--;
    if (end < 0) throw Error('Missing official release ZIP directory');
    let p = bytes.readUInt32LE(end + 16); const entries = new Map<string, [number, number, number, number]>();
    for (let i = 0; i < bytes.readUInt16LE(end + 10); i++) {
      if (bytes.readUInt32LE(p) !== 0x02014b50) throw Error('Invalid source directory entry');
      const length = bytes.readUInt16LE(p + 28);
      entries.set(bytes.toString('utf8', p + 46, p + 46 + length), [bytes.readUInt16LE(p + 10), bytes.readUInt32LE(p + 20), bytes.readUInt32LE(p + 24), bytes.readUInt32LE(p + 42)]);
      p += 46 + length + bytes.readUInt16LE(p + 30) + bytes.readUInt16LE(p + 32);
    }
    return (name: string) => {
      const entry = entries.get(name); if (!entry) throw Error(`Missing official source ${name}`);
      const offset = entry[3] + 30 + bytes.readUInt16LE(entry[3] + 26) + bytes.readUInt16LE(entry[3] + 28), packed = bytes.subarray(offset, offset + entry[1]);
      const result = entry[0] === 0 ? Buffer.from(packed) : inflateRawSync(packed); expect(result.length).toBe(entry[2]); return result;
    };
  })();
}
function jsonc(value: Buffer) { return JSON.parse(value.toString().replace(/^\uFEFF/, '').replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, part => part.startsWith('"') ? part : '')); }
async function sourceQueue(scale: number, long = false): Promise<(WireImage | WireText)[]> {
  const source = await archive(), common = jsonc(source('resource_pack/ui/ui_common.json')), ui = jsonc(source('resource_pack/ui/enchanting_screen.json'));
  expect(common.root_panel.size).toEqual([176, 166]); expect(ui.enchanting_panel_top_half.size).toEqual(['100%', '50% - 12px']);
  const grid = ui.enchanting_panel_top_half.controls.find((value: { grid_panel?: unknown }) => value.grid_panel).grid_panel;
  expect(grid.size).toEqual(['65%-8px', '80%+4px']); expect(grid.offset).toEqual([-8, 2]);
  const origin = [(Math.ceil(2570 / scale) - 176) / 2, (Math.ceil(1402 / scale) - 166) / 2];
  const commands: (WireImage | WireText)[] = [];
  const image = (name: string, rect: readonly [number, number, number, number]) => {
    const pixels = PNG.sync.read(source(`resource_pack/textures/ui/${name}.png`));
    let metadata; try { metadata = jsonc(source(`resource_pack/textures/ui/${name}.json`)); } catch { /* Whole original PNG. */ }
    commands.push({ kind: 'image', texture: { width: pixels.width, height: pixels.height, rgba: pixels.data.toString('base64') }, rect: [rect[0] + origin[0]!, rect[1] + origin[1]!, rect[2], rect[3]],
      ...(metadata?.nineslice_size !== undefined ? { nineSlice: { insets: metadata.nineslice_size, baseSize: metadata.base_size ?? [pixels.width, pixels.height] } } : {}) });
  };
  image('dialog_background_opaque', [0, 0, 176, 166]); image('close_button_default_compact', [156, 5, 15, 7]);
  const height = 166 * .5 - 12, gw = 176 * .65 - 8, gh = height * .8 + 4, gx = 176 - gw - 8, gy = 7 + (height - gh) / 2 + 2;
  image('cell_image', [gx - 1, gy - 1, gw + 2, gh + 2]);
  // Independent evaluation of the original percentage/stack/anchor expressions.
  // f32 operators are an explicit source-layout contract, not copied native VBs.
  const f = Math.fround, add = (a: number, b: number) => f(f(a) + f(b)), sub = (a: number, b: number) => f(f(a) - f(b));
  const mul = (a: number, b: number) => f(f(a) * f(b)), div = (a: number, b: number) => f(f(a) / f(b));
  const rootX = origin[0]!, rootY = origin[1]!, top = add(rootY, 7), topHeight = sub(mul(166, .5), 12);
  const gridW = sub(mul(176, .65), 8), gridH = add(mul(topHeight, .8), 4), gridX = sub(sub(add(rootX, 176), gridW), 8);
  const gridY = add(sub(add(top, mul(topHeight, .5)), mul(gridH, .5)), 2), stride = div(gridH, 3), rowHeight = mul(gridH, .33333333);
  const text = (value: string, at: readonly [number, number], color: WireText['color'], shadow = false) => commands.push({ kind: 'text', text: value, origin: at, color,
    ...(shadow ? { shadow: { offset: [1, 1] as const, tint: [.25, .25, .25, 1] as const } } : {}) });
  text('Enchant', [add(add(rootX, 12), 1), add(sub(top, 4), 1)], [76, 76, 76, 255]);
  text('Inventory', [add(add(rootX, 7), 1), add(add(sub(add(rootY, 166), 93), 3), 1)], [76, 76, 76, 255]);
  for (const rect of [[13, 47.5, 18, 18], [33, 47.5, 18, 18], ...Array.from({ length: 27 }, (_, i) => [7 + i % 9 * 18, 86 + Math.floor(i / 9) * 18, 18, 18]), ...Array.from({ length: 9 }, (_, i) => [7 + i * 18, 143, 18, 18])]) image('cell_image', rect as [number, number, number, number]);
  image('lapis_image', [34, 48.5, 16, 16]);
  const row = (i: number): [number, number, number, number] => [gx, gy + i * gh / 3, gw, gh * .33333333];
  for (let i = 0; i < 3; i++) image('enchanting_dark_background', row(i));
  for (let i = 0; i < 3; i++) image(i === 1 ? 'enchanting_dark_background' : 'enchanting_active_background', row(i));
  for (let i = 0; i < 3; i++) {
    text(long ? 'aB.'.repeat(28) : ['aB.c', 'Def.', 'GhI.'][i]!, [add(add(gridX, 18), 1), add(add(sub(add(add(gridY, mul(i, stride)), mul(rowHeight, .5)), mul(16, .5)), 4), 1)], [104, 93, 73, 255]);
    text(String(i + 1), [add(sub(sub(add(gridX, gridW), 2), 6), 1), add(sub(sub(add(add(gridY, mul(i, stride)), rowHeight), 2), 9), 1)], i === 1 ? [137, 94, 91, 255] : [127, 255, 31, 255], true);
  }
  for (let i = 0; i < 3; i++) image(`dust_${i === 1 ? 'unselectable' : 'selectable'}_${i + 1}`, [gx + 3, gy + i * gh / 3 + (gh / 3 - 11) / 2, 13, 11]);
  return commands;
}
async function composition(page: Page, scale: number, info: TestInfo, long = false) {
  await ready(page); const actual = await page.evaluate(() => window.enchantingCombinedQA.raw());
  const expected = await page.evaluate(value => window.enchantingCombinedQA.reference(value), { width: 2570, height: 1402, guiScale: scale,
    outputRect: actual.rect as [number, number, number, number], commands: await sourceQueue(scale, long),
    fontPixels: { width: 128, height: 128, rgba: synthetic.image.data.toString('base64') } });
  const actualBytes = Buffer.from(actual.rgba, 'base64'), expectedBytes = Buffer.from(expected.rgba, 'base64');
  await info.attach('composition-proof.json', { body: JSON.stringify({ guiScale: scale, outputRect: actual.rect, pixels: actual.width * actual.height,
    actualSha256: hash(actualBytes), expectedSha256: hash(expectedBytes), renderer: actual.renderer,
    scope: 'Actual adapter versus independent UI command composition through public renderer. Not independent shader or native/whole-GUI certification.' }), contentType: 'application/json' });
  expect([actual.width, actual.height]).toEqual([expected.width, expected.height]);
  if (!actualBytes.equals(expectedBytes)) {
    const a = new PNG({ width: actual.width, height: actual.height }); a.data = actualBytes;
    const e = new PNG({ width: expected.width, height: expected.height }); e.data = expectedBytes;
    await info.attach('actual.png', { body: PNG.sync.write(a), contentType: 'image/png' }); await info.attach('expected.png', { body: PNG.sync.write(e), contentType: 'image/png' });
  }
  expect(actualBytes.equals(expectedBytes), 'Entire canvas RGBA, no mask or tolerance').toBe(true);
}

for (const scale of [4, 5]) test(`GUI${scale} actual combined canvas matches an independent original-UI command queue`, async ({ page }, info) => {
  await open(page, { mode: 'combined', guiScale: scale }); await composition(page, scale, info);
});

test('one shared canvas retains all 38 live slots, semantic labels, caller items/book and native button callbacks', async ({ page }) => {
  await open(page); await expect(page.locator('.mc-enchanting .mc-slot')).toHaveCount(38); await expect(page.locator('.mc-gui-layer')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Enchant', exact: true })).toHaveCount(1); await expect(page.getByRole('heading', { name: 'Enchant', exact: true })).toHaveCount(1);
  await expect(page.getByRole('grid', { name: 'Inventory', exact: true })).toHaveCount(1);
  for (const name of ['item', 'lapis', 'inventory', 'hotbar']) await expect(page.locator(`[data-live-${name}]`)).toBeVisible();
  await expect(page.locator('[data-book-state]')).toBeVisible(); expect(await page.evaluate(() => window.enchantingCombinedQA.section === document.querySelector('.mc-enchanting'))).toBe(true);
  const visual = await visuals(page); expect(visual.panel).toBe('none'); expect(visual.custom.every(value => value === 'hidden')).toBe(true);
  await page.getByRole('button', { name: 'Item to enchant', exact: true }).click();
  await page.getByRole('button', { name: 'Lapis lazuli, 8', exact: true }).click({ button: 'right' });
  await page.getByRole('button', { name: 'Enchantment 1 1', exact: true }).press('Enter');
  const disabled = page.getByRole('button', { name: 'Enchantment 2 2', exact: true }); await expect(disabled).toBeDisabled(); await disabled.evaluate(button => (button as HTMLButtonElement).click());
  await expect(page.getByLabel('Combined integration events')).toHaveText('input:item:primary|input:lapis:secondary|enchant:tier-1');
});

test('CSS and image-only routes keep caller visual text; combined hides only ready glyph roles and preserves rune fallback policy', async ({ page }) => {
  await open(page, { mode: 'css' }); expect((await visuals(page)).custom.every(value => value === 'visible')).toBe(true);
  await configure(page, { mode: 'images' }); await ready(page); await expect(page.locator('.mc-gui-image-layer')).toHaveCount(1);
  expect((await visuals(page)).custom.every(value => value === 'visible')).toBe(true);
  await configure(page, { mode: 'combined', runePolicy: 'node-only' }); await ready(page);
  expect((await visuals(page)).runes).toEqual(['visible', 'visible', 'visible']); await expect(page.locator('[data-rune-node]')).toHaveCount(3);
  await configure(page, { mode: 'combined', runePolicy: 'both', runeProfile: false }); await ready(page);
  expect((await visuals(page)).runes).toEqual(['visible', 'visible', 'visible']); await expect(page.locator('[data-rune-node="1"]')).toHaveText('HOST NODE 1');
  await configure(page, { mode: 'combined', runePolicy: 'text-only', runeProfile: true }); await ready(page);
  await expect(page.locator('.mc-enchanting__runes').first()).toHaveText('aB.c'); expect((await visuals(page)).runes).toEqual(['hidden', 'hidden', 'hidden']);
});

test('cross-route failures preserve the section, focused inventory slot, internal selection, ref and stateful book', async ({ page }) => {
  await open(page); await page.evaluate(() => { window.enchantingCombinedQA.incrementBook(); window.enchantingCombinedQA.incrementBook(); });
  const inventory = page.locator('.mc-workstation__inventory .mc-slot').first(); await inventory.click(); await inventory.focus();
  const section = await page.locator('.mc-enchanting').elementHandle();
  for (const mode of ['images', 'combined', 'invalid-metrics', 'missing-glyph', 'url-failure', 'combined', 'bad-frame', 'css'] as const) {
    await configure(page, { mode, displayScale: 2.5 });
    if (mode === 'images' || mode === 'combined') await ready(page);
    else if (mode !== 'css') await expect(stateMarker(page)).toHaveAttribute('data-render-state', 'error');
    expect(await section!.evaluate(node => node === window.enchantingCombinedQA.section)).toBe(true);
    await expect(inventory).toBeFocused(); await expect(inventory).toHaveAttribute('aria-pressed', 'true'); await expect(page.locator('[data-book-state]')).toHaveAttribute('data-book-state', '2');
    const value = await visuals(page);
    if (['invalid-metrics', 'missing-glyph', 'url-failure'].includes(mode)) { expect([value.width, value.height]).toEqual([880, 830]); expect(value.panel).not.toBe('none'); expect(value.custom.every(item => item === 'visible')).toBe(true); }
    if (mode === 'bad-frame' || mode === 'css') expect([value.width, value.height]).toEqual([352, 332]);
  }
});

test('delayed font loading atomically retains full-scale CSS fallback until the single combined canvas is ready', async ({ page }) => {
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/qa-delayed-font.png', async route => { await gate; await route.fulfill({ contentType: 'image/png', body: synthetic.png }); });
  await open(page, { mode: 'css' }); await page.evaluate(() => window.enchantingCombinedQA.setFontUrl('/qa-delayed-font.png'));
  await configure(page, { mode: 'combined', displayScale: 2.5 }); await expect(canvas(page)).toHaveAttribute('data-render-state', 'loading');
  const loading = await visuals(page); expect([loading.width, loading.height]).toEqual([880, 830]); expect(loading.panel).not.toBe('none'); expect(loading.custom.every(value => value === 'visible')).toBe(true);
  await expect(page.locator('.mc-enchanting-image-window')).toHaveCSS('visibility', 'hidden');
  release(); await ready(page); const done = await visuals(page); expect(done.panel).toBe('none'); expect(done.custom.every(value => value === 'hidden')).toBe(true); expect(done.canvasCount).toBe(1);
});

test('actual canvas context loss restores all CSS text and skins without losing book, selection or focus', async ({ page }) => {
  await open(page); const slot = page.locator('.mc-workstation__inventory .mc-slot').first(); await slot.click(); await slot.focus();
  await page.evaluate(() => window.enchantingCombinedQA.incrementBook());
  await canvas(page).evaluate(element => { const gl = (element as HTMLCanvasElement).getContext('webgl')!; const extension = gl.getExtension('WEBGL_lose_context'); if (!extension) throw Error('Required real context-loss extension unavailable'); extension.loseContext(); });
  await expect(canvas(page)).toHaveAttribute('data-render-state', 'error'); expect((await visuals(page)).panel).not.toBe('none');
  expect((await visuals(page)).custom.every(value => value === 'visible')).toBe(true); await expect(slot).toBeFocused(); await expect(slot).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-book-state]')).toHaveAttribute('data-book-state', '1'); await configure(page, { guiScale: 4 }); await ready(page);
  await expect(slot).toBeFocused(); await expect(page.locator('[data-book-state]')).toHaveAttribute('data-book-state', '1');
});

test('long caller rune strings retain case and full overhang in the crop/reservation without ellipsis', async ({ page }, info) => {
  await open(page); const before = await page.evaluate(() => window.enchantingCombinedQA.raw().rect);
  await configure(page, { longRunes: true, runePolicy: 'text-only' }); await ready(page);
  await expect(page.locator('.mc-enchanting__runes').first()).toHaveText('aB.'.repeat(28));
  const after = await page.evaluate(() => ({ rect: window.enchantingCombinedQA.raw().rect, reservation: document.querySelector('.mc-workstation-image-reservation')!.getBoundingClientRect().width }));
  expect(after.rect[2]).toBeGreaterThan(before[2]!); expect(after.reservation).toBeGreaterThan(352);
  await composition(page, 5, info, true);
});

test('wide/narrow GUI4/5 presentations reserve scaled dimensions and keep overflow inside their scroll region', async ({ page }) => {
  await open(page);
  for (const viewport of [320, 1280]) for (const guiScale of [4, 5]) for (const displayScale of [1, 2.5]) {
    await page.setViewportSize({ width: viewport, height: 1000 }); await configure(page, { guiScale, displayScale }); await ready(page);
    const value = await page.evaluate(() => {
      const section = window.enchantingCombinedQA.section!.getBoundingClientRect(), reserve = document.querySelector('.mc-workstation-image-reservation')!.getBoundingClientRect(), tail = document.querySelector('#tail')!.getBoundingClientRect(), scroll = document.querySelector('.mc-workstation-scroll')!;
      return { section: [section.width, section.height], reserveBottom: reserve.bottom, tailTop: tail.top, height: scroll.clientHeight, scrollHeight: scroll.scrollHeight, docWidth: document.documentElement.scrollWidth };
    });
    expect(value.section).toEqual([352 * displayScale, 332 * displayScale]); expect(value.tailTop).toBeGreaterThanOrEqual(value.reserveBottom);
    expect(value.scrollHeight).toBe(value.height); expect(value.docWidth).toBe(viewport);
  }
});

test('close and reopen preserve callback semantics and build a fresh complete component', async ({ page }) => {
  await open(page); await page.getByRole('button', { name: 'Close container' }).press('Enter'); await expect(page.locator('.mc-enchanting')).toHaveCount(0);
  await expect(page.getByLabel('Combined integration events')).toHaveText('close'); await page.getByRole('button', { name: 'Reopen table' }).click(); await ready(page);
  await expect(page.locator('.mc-enchanting .mc-slot')).toHaveCount(38); await expect(page.locator('[data-book-state]')).toHaveAttribute('data-book-state', '0');
});
