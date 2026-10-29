import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PNG } from 'pngjs';
import { EnchantingTable, WorkstationFrame } from '../src/workstations';
import type { EnchantingTableImageRenderProfile } from '../src/workstations';

const profile = (guiScale = 5, displayScale = 1): EnchantingTableImageRenderProfile => ({ frame: { width: 2570, height: 1402, guiScale }, displayScale });
const sha = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
const pagePath = '/demo/enchanting-image-layer-fixture.html';
let sourcePromise: Promise<(entry: string) => Buffer> | undefined;
async function archive() {
  return sourcePromise ??= (async () => {
    const b = await readFile(new URL('../.cache/references/bedrock-samples-v1.26.60.5-full.zip', import.meta.url));
    expect(sha(b)).toBe('d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf');
    let end = b.length - 22; while (end >= 0 && (b.readUInt32LE(end) !== 0x06054b50 || end + 22 + b.readUInt16LE(end + 20) !== b.length)) end--;
    if (end < 0) throw Error('Missing original ZIP directory');
    const map = new Map<string, [number, number, number, number]>(); let p = b.readUInt32LE(end + 16);
    for (let i = 0; i < b.readUInt16LE(end + 10); i++) {
      if (b.readUInt32LE(p) !== 0x02014b50) throw Error('Invalid source ZIP record');
      const n = b.readUInt16LE(p + 28), extra = b.readUInt16LE(p + 30), comment = b.readUInt16LE(p + 32);
      map.set(b.toString('utf8', p + 46, p + 46 + n), [b.readUInt16LE(p + 10), b.readUInt32LE(p + 20), b.readUInt32LE(p + 24), b.readUInt32LE(p + 42)]); p += 46 + n + extra + comment;
    }
    return (entry: string) => { const x = map.get(entry); if (!x || b.readUInt32LE(x[3]) !== 0x04034b50) throw Error('Missing source entry ' + entry); const start = x[3] + 30 + b.readUInt16LE(x[3] + 26) + b.readUInt16LE(x[3] + 28), packed = b.subarray(start, start + x[1]); const data = x[0] === 0 ? Buffer.from(packed) : inflateRawSync(packed); expect(data.length).toBe(x[2]); return data; };
  })();
}
function jsonc(value: Buffer) { return JSON.parse(value.toString('utf8').replace(/^\uFEFF/, '').replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, value => value.startsWith('"') ? value : '')); }
async function open(page: import('@playwright/test').Page, configuration: Record<string, unknown> = { profile: profile() }) {
  await page.goto(pagePath); await page.waitForFunction(() => !!window.enchantingImageQA?.configure); await page.mouse.move(0, 0);
  await page.evaluate(value => window.enchantingImageQA.configure(value), configuration);
  if (configuration.profile) await ready(page);
}
const layer = (page: import('@playwright/test').Page) => page.locator('canvas.mc-enchanting-image-layer');
async function ready(page: import('@playwright/test').Page) { await expect(layer(page)).toHaveAttribute('data-render-state', 'ready'); }
async function raw(page: import('@playwright/test').Page) { const value = await page.evaluate(() => window.enchantingImageQA.raw()); return { ...value, data: Buffer.from(value.rgba, 'base64') }; }
interface States { empty?: boolean; disabled?: boolean; close?: boolean; selectedSlot?: number; hoveredSlot?: number; focusedSlot?: number; hoveredOption?: number; focusedOption?: number; pressedOption?: number; closeState?: 'hover' | 'pressed' }

/** Independent SOURCE composition. No adapter.prepare(), registry or captured
 * VB is used. Original JSON supplies roots/anchors/percent/grid and original
 * PNG metadata supplies source/destination bands. Native4pass evidence belongs
 * to gui-image-layer.spec.ts; this oracle verifies integrated image selection,
 * order and source rectangles using that separately validated renderer. */
async function sourceQueue(p: EnchantingTableImageRenderProfile, state: States = {}) {
  const read = await archive(), common = jsonc(read('resource_pack/ui/ui_common.json')), enchanting = jsonc(read('resource_pack/ui/enchanting_screen.json'));
  expect(common.root_panel.size).toEqual([176, 166]); expect(enchanting.enchanting_panel_top_half.size).toEqual(['100%', '50% - 12px']);
  const grid = enchanting.enchanting_panel_top_half.controls.find((x: any) => x.grid_panel).grid_panel; expect(grid.size).toEqual(['65%-8px', '80%+4px']); expect(grid.offset).toEqual([-8, 2]);
  const scale = p.frame.guiScale, origin = p.origin ?? [(Math.ceil(p.frame.width / scale) - 176) / 2, (Math.ceil(p.frame.height / scale) - 166) / 2];
  const images: any[] = [];
  const add = (name: string, rect: number[], hudOpacity = 1) => {
    const bytes = read(`resource_pack/textures/ui/${name}.png`), image = PNG.sync.read(bytes);
    let meta: any; try { meta = jsonc(read(`resource_pack/textures/ui/${name}.json`)); } catch { /* original whole-image contract */ }
    images.push({ texture: { width: image.width, height: image.height, rgba: image.data.toString('base64') }, rect: [origin[0]! + rect[0]!, origin[1]! + rect[1]!, rect[2], rect[3]], hudOpacity,
      ...(meta?.nineslice_size !== undefined ? { nineSlice: { insets: meta.nineslice_size, baseSize: meta.base_size ?? [image.width, image.height] } } : {}) });
  };
  add('dialog_background_opaque', [0, 0, 176, 166]);
  if (state.close !== false) add(state.closeState === 'pressed' ? 'close_button_pressed_compact' : state.closeState === 'hover' ? 'close_button_hover_compact' : 'close_button_default_compact', [156, 5, 15, 7]);
  const topHeight = 166 / 2 - 12, gridWidth = .65 * 176 - 8, gridHeight = .8 * topHeight + 4;
  const gx = 176 - gridWidth - 8, gy = 7 + (topHeight - gridHeight) / 2 + 2;
  add('cell_image', [gx - 1, gy - 1, gridWidth + 2, gridHeight + 2]);
  const slots = [[13, 47.5, 18, 18], [33, 47.5, 18, 18], ...Array.from({ length: 27 }, (_, i) => [7 + i % 9 * 18, 86 + Math.floor(i / 9) * 18, 18, 18]), ...Array.from({ length: 9 }, (_, i) => [7 + i * 18, 143, 18, 18])];
  slots.forEach((rect, i) => add(state.selectedSlot === i ? 'recipe_book_touch_cell_selected' : 'cell_image', rect)); add('lapis_image', [34, 48.5, 16, 16]);
  slots.forEach(([x, y, w, h], i) => { if (state.hoveredSlot === i) add('highlight_slot', [x! + 1, y! + 1, w! - 2, h! - 2], .8); if (state.hoveredSlot === i || state.focusedSlot === i) add('focus_border_white', [x!, y!, w!, h!]); });
  const row = (i: number) => [gx, gy + i * gridHeight / 3, gridWidth, gridHeight * .33333333];
  for (let i = 0; i < 3; i++) add('enchanting_dark_background', row(i));
  if (!state.empty) {
    for (let i = 0; i < 3; i++) add((state.disabled && i === 1) || state.pressedOption === i ? 'enchanting_dark_background' : state.hoveredOption === i || state.focusedOption === i ? 'enchanting_active_background_with_hover_text' : 'enchanting_active_background', row(i));
    for (let i = 0; i < 3; i++) add(`dust_${state.disabled && i === 1 ? 'unselectable' : 'selectable'}_${i + 1}`, [gx + 3, gy + i * gridHeight / 3 + (gridHeight / 3 - 11) / 2, 13, 11]);
  }
  return images;
}
async function composition(page: import('@playwright/test').Page, p = profile(), state: States = {}, testInfo?: import('@playwright/test').TestInfo) {
  await ready(page); const current = await raw(page), images = await sourceQueue(p, state);
  const expected = await page.evaluate(options => window.enchantingImageQA.reference(options), { ...p.frame, outputRect: current.rect, images });
  const data = Buffer.from(expected.rgba, 'base64'), expectedSha = sha(data);
  await expect.poll(async () => { await ready(page); return sha((await raw(page)).data); }, { timeout: 10000 }).toBe(expectedSha);
  const final = await raw(page); expect(final.data.equals(data), 'every actual integrated canvas RGBA pixel, including all transparent crop halo').toBe(true); expect(final.error).toBe(0);
  const proof = { state, frame: p.frame, origin: p.origin ?? [(Math.ceil(p.frame.width / p.frame.guiScale) - 176) / 2, (Math.ceil(p.frame.height / p.frame.guiScale) - 166) / 2], crop: final.rect, pixels: final.width * final.height, expectedSha256: expectedSha, actualSha256: sha(final.data), renderer: final.renderer, attributes: final.attributes, exact: true, scope: 'Complete actual component image pass versus independent source composition, NOT whole GUI/native parity' };
  if (testInfo) await testInfo.attach('integrated-source-image-pass.json', { body: JSON.stringify(proof), contentType: 'application/json' }); return final;
}
async function skin(page: import('@playwright/test').Page, selector = '.mc-enchanting', pseudo = '::before') { return page.locator(selector).first().evaluate((n, pseudo) => ({ display: getComputedStyle(n, pseudo).display, source: getComputedStyle(n, pseudo).borderImageSource }), pseudo); }

test('default SSR and browser DOM keep CSS skins, canonical names and callback-bearing buttons', async ({ page }) => {
  const props = { title: 'Default title', options: [{ id: 'a', label: 'First', level: 1 }] };
  const html = renderToStaticMarkup(createElement(EnchantingTable, props)); expect(html).not.toContain('mc-gui-image-layer'); expect(html).not.toContain('imageRender='); expect(html).toContain('class="mc-enchanting__cost">1</span>');
  expect(renderToStaticMarkup(createElement(WorkstationFrame, { title: 'Other frame' }))).not.toContain('mc-workstation-image-reservation');
  await open(page, {}); await expect(layer(page)).toHaveCount(0); expect((await skin(page)).display).not.toBe('none');
  await expect(page.getByRole('heading', { name: 'Actual enchantment table' })).toBeVisible(); await expect(page.locator('.mc-enchanting__option')).toHaveCount(3);
});

for (const scale of [4, 5]) test(`GUI${scale} actual component full canvas matches independent original-source composition and keeps a whole-frame origin`, async ({ page }, testInfo) => {
  const p = profile(scale); await open(page, { profile: p }); const result = await composition(page, p, {}, testInfo);
  const expectedOrigin = [(Math.ceil(2570 / scale) - 176) / 2, (Math.ceil(1402 / scale) - 166) / 2];
  await expect(page.locator('.mc-enchanting-image-window')).toHaveAttribute('data-frame-origin-x', String(expectedOrigin[0])); await expect(page.locator('.mc-enchanting-image-window')).toHaveAttribute('data-frame-origin-y', String(expectedOrigin[1]));
  expect(result.rect[0]).toBeLessThanOrEqual(Math.floor(expectedOrigin[0]! * scale)); expect(result.rect[1]).toBeLessThanOrEqual(Math.floor(expectedOrigin[1]! * scale));
  expect(result.rect[0] + result.rect[2]).toBeGreaterThanOrEqual(Math.ceil((expectedOrigin[0]! + 176) * scale)); expect(result.rect[1] + result.rect[3]).toBeGreaterThanOrEqual(Math.ceil((expectedOrigin[1]! + 166) * scale));
  expect((await skin(page)).display).toBe('none'); await expect(layer(page)).toHaveAttribute('aria-hidden', 'true');
});

test('hover and selected inventory slots choose original source overlays without consuming callbacks', async ({ page }, testInfo) => {
  await open(page); await page.locator('.mc-enchanting__item').hover(); await composition(page, profile(), { hoveredSlot: 0 }, testInfo);
  await page.locator('.mc-workstation__inventory .mc-slot').first().click(); await page.mouse.move(0, 0);
  await expect(page.locator('.mc-workstation__inventory .mc-slot').first()).toHaveAttribute('aria-pressed', 'true'); await composition(page, profile(), { selectedSlot: 2 }, testInfo);
  await expect(page.getByLabel('Actual component events')).toContainText('inventory:0:primary');
});

test('enabled hover, keyboard focus and pressed option states use complete original source image passes', async ({ page }, testInfo) => {
  await open(page); const option = page.locator('.mc-enchanting__option').first();
  await option.hover(); await composition(page, profile(), { hoveredOption: 0 }, testInfo);
  await page.mouse.down(); await composition(page, profile(), { hoveredOption: 0, pressedOption: 0 }, testInfo); await page.mouse.up();
  await expect(page.getByLabel('Actual component events')).toContainText('enchant:option-1'); await page.mouse.move(0, 0);
  await option.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); expect(await option.evaluate(n => n.matches(':focus-visible'))).toBe(true);
  await composition(page, profile(), { focusedOption: 0 }, testInfo); await option.press('Enter'); await expect(page.getByLabel('Actual component events')).toContainText('enchant:option-1');
});

test('controlled disabled and empty options retain native guards, dust choice and inert three-row backgrounds', async ({ page }, testInfo) => {
  await open(page, { profile: profile(), disabled: true }); await composition(page, profile(), { disabled: true }, testInfo);
  const disabled = page.locator('.mc-enchanting__option').nth(1); await expect(disabled).toBeDisabled(); await disabled.evaluate(n => (n as HTMLButtonElement).click()); await expect(page.getByLabel('Actual component events')).toHaveText('[]');
  await page.evaluate(() => window.enchantingImageQA.configure({ empty: true, inputs: false })); await page.mouse.move(0, 0); await composition(page, profile(), { empty: true }, testInfo);
  await expect(page.locator('.mc-enchanting__option,.mc-enchanting__cost,.mc-enchanting__dust,[data-host-runes]')).toHaveCount(0); await expect(page.locator('.mc-enchanting__empty-option')).toHaveCount(3);
  await expect(page.locator('.mc-enchanting__lapis-placeholder')).toHaveCount(1); await expect(page.locator('.mc-enchanting__item')).toHaveAttribute('data-empty', 'true');
});

test('book, item, text adapters, semantic names and primary/secondary intents remain real DOM', async ({ page }) => {
  await open(page, { profile: profile(), text: true }); await expect(page.locator('[data-host-book]')).toBeVisible(); await expect(page.locator('[data-host-item]')).toBeVisible(); await expect(page.locator('[data-host-lapis]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Actual enchantment table', exact: true })).toHaveCount(1); await expect(page.locator('.mc-workstation-text__semantic')).toHaveCount(5);
  await page.locator('.mc-enchanting__item').click(); await page.locator('.mc-enchanting__lapis').click({ button: 'right' }); await page.locator('.mc-enchanting__option').last().press('Enter');
  await expect(page.getByLabel('Actual component events')).toHaveText('["input:item:primary","input:lapis:secondary","enchant:option-3"]');
});

test('valid, invalid and CSS transitions preserve section identity, focus, inventory selection and child book state', async ({ page }) => {
  await open(page); await page.locator('.mc-workstation__inventory .mc-slot').first().click(); await page.getByRole('button', { name: 'Advance host book state' }).click();
  const option = page.locator('.mc-enchanting__option').first(); await option.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await page.evaluate(() => { (window as any).originalSection = window.enchantingImageQA.section; (window as any).originalFocused = document.activeElement; });
  for (const p of [{ ...profile(), displayScale: 0 }, undefined, profile()]) {
    await page.evaluate(p => window.enchantingImageQA.configure({ profile: p }), p); if (p?.displayScale) await ready(page);
    if (p?.displayScale === 0) { await expect(page.locator('.mc-enchanting-image-error')).toHaveCount(1); await expect(layer(page)).toHaveCount(0); expect((await skin(page)).display).not.toBe('none'); }
    if (!p) { await expect(layer(page)).toHaveCount(0); await expect(page.locator('.mc-enchanting-image-error')).toHaveCount(0); }
    expect(await page.evaluate(() => (window as any).originalSection === window.enchantingImageQA.section)).toBe(true); expect(await page.evaluate(() => (window as any).originalFocused === document.activeElement)).toBe(true);
    await expect(page.locator('.mc-workstation__inventory .mc-slot').first()).toHaveAttribute('aria-pressed', 'true'); await expect(page.locator('[data-host-book-state]')).toHaveText('1');
  }
  await page.mouse.move(0, 0); await page.locator('.mc-enchanting__item').hover(); await composition(page, profile(), { selectedSlot: 2, hoveredSlot: 0, focusedOption: 0 });
});

test('loading retains CSS until the exact ready marker atomically replaces the image skins', async ({ page }) => {
  await page.addInitScript(() => { const original = window.fetch; let release: () => void; const gate = new Promise<void>(resolve => { release = resolve; }); (window as any).releaseGuiImages = () => release();
    window.fetch = async (...args: Parameters<typeof fetch>) => { if (String(args[0]).startsWith('data:image/png')) await gate; return original(...args); }; });
  await page.goto(pagePath); await page.waitForFunction(() => !!window.enchantingImageQA?.configure); await page.evaluate(p => window.enchantingImageQA.configure({ profile: p }), profile());
  await expect(layer(page)).toHaveAttribute('data-render-state', 'loading'); expect((await skin(page)).display).not.toBe('none');
  await page.evaluate(() => (window as any).releaseGuiImages()); await ready(page); expect((await skin(page)).display).toBe('none'); expect((await skin(page, '.mc-enchanting__option')).display).toBe('none');
  expect((await skin(page, '.mc-enchanting__item')).display).toBe('none');
  for (const selector of ['.mc-enchanting__dust', '.mc-enchanting__lapis-placeholder', '.mc-dialog__close-icon']) await expect(page.locator(selector).first()).toHaveCSS('background-image', 'none');
});

test('URL failures leave real DOM and CSS usable and an explicit new profile request can restore rendering', async ({ page }) => {
  await page.addInitScript(() => { const original = window.fetch; (window as any).rejectGuiImages = true; window.fetch = async (...args: Parameters<typeof fetch>) => {
    if ((window as any).rejectGuiImages && String(args[0]).startsWith('data:image/png')) throw new Error('Controlled source fetch failure'); return original(...args);
  }; });
  await page.goto(pagePath); await page.waitForFunction(() => !!window.enchantingImageQA?.configure); await page.evaluate(p => window.enchantingImageQA.configure({ profile: p }), profile());
  await expect(layer(page)).toHaveAttribute('data-render-state', 'error'); await expect(layer(page)).toHaveAttribute('width', '0'); expect((await skin(page)).display).not.toBe('none');
  await page.locator('.mc-enchanting__option').first().press('Enter'); await expect(page.getByLabel('Actual component events')).toContainText('enchant:option-1');
  const shifted = { ...profile(), origin: [170, 57.5] as const }; await page.evaluate(p => { (window as any).rejectGuiImages = false; window.enchantingImageQA.configure({ profile: p }); }, shifted);
  await page.mouse.move(0, 0); await page.locator('.mc-enchanting__option').first().blur(); await composition(page, shifted);
});

test('real context loss restores CSS and a controlled new image request restores rendering without losing host state', async ({ page }) => {
  await open(page); await page.getByRole('button', { name: 'Advance host book state' }).click();
  await layer(page).evaluate(n => (n as HTMLCanvasElement).getContext('webgl')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(layer(page)).toHaveAttribute('data-render-state', 'error'); await expect(layer(page)).toHaveAttribute('width', '0'); expect((await skin(page)).display).not.toBe('none');
  await expect(page.locator('[data-host-book-state]')).toHaveText('1'); await page.evaluate(() => window.enchantingImageQA.configure({ disabled: true })); await composition(page, profile(), { disabled: true });
});

test('displayScale reserves actual flow height and narrow hosts use only necessary local horizontal panning', async ({ page }, testInfo) => {
  for (const viewport of [1280, 390, 320]) for (const factor of [.75, 1, 2]) {
    await page.setViewportSize({ width: viewport, height: 1000 }); await open(page, { profile: profile(5, factor) });
    const data = await page.evaluate(() => { const section = document.querySelector('.mc-enchanting')!, reservation = document.querySelector('.mc-workstation-image-reservation')!, scroll = document.querySelector('.mc-workstation-scroll')!, tail = document.querySelector('#tail')!; const box = (n: Element) => { const b = n.getBoundingClientRect(); return { width: b.width, height: b.height, bottom: b.bottom, top: b.top }; }; return { section: box(section), reservation: box(reservation), tail: box(tail), local: { width: scroll.clientWidth, scrollWidth: scroll.scrollWidth, height: scroll.clientHeight, scrollHeight: scroll.scrollHeight }, page: document.documentElement.scrollWidth }; });
    expect(data.section.width).toBeCloseTo(352 * factor, 4); expect(data.section.height).toBeCloseTo(332 * factor, 4); expect(data.reservation.height).toBeGreaterThanOrEqual(data.section.height); expect(data.tail.top).toBeGreaterThanOrEqual(data.reservation.bottom - .01);
    expect(data.page).toBe(viewport); expect(data.local.scrollHeight).toBe(data.local.height); if (data.reservation.width <= viewport) expect(data.local.scrollWidth).toBe(data.local.width);
    if (factor === 1) {
      await page.locator('.mc-workstation-scroll').screenshot({ path: testInfo.outputPath(`actual-${viewport}-left.png`) });
      if (data.local.scrollWidth > data.local.width) { await page.locator('.mc-workstation-scroll').evaluate(n => { n.scrollLeft = n.scrollWidth; }); await page.locator('.mc-workstation-scroll').screenshot({ path: testInfo.outputPath(`actual-${viewport}-right.png`) }); }
    }
    if (viewport === 320 && factor === 2) { await page.locator('.mc-workstation-scroll').evaluate(n => { n.scrollLeft = n.scrollWidth; }); await page.getByRole('button', { name: 'Close container' }).click(); await expect(page.locator('.mc-enchanting')).toHaveCount(0); }
  }
});

test('close hover and pressed images remain source-correct while actual close and reopen callbacks work', async ({ page }, testInfo) => {
  await open(page); const close = page.getByRole('button', { name: 'Close container' }); await close.hover(); await composition(page, profile(), { closeState: 'hover' }, testInfo);
  await page.mouse.down(); await composition(page, profile(), { closeState: 'pressed' }, testInfo); await page.mouse.up(); await expect(page.locator('.mc-enchanting')).toHaveCount(0);
  await expect(page.getByLabel('Actual component events')).toContainText('close'); await page.getByRole('button', { name: 'Reopen table' }).click(); await ready(page);
  await expect(page.locator('.mc-enchanting__option')).toHaveCount(3); await expect(page.locator('[data-host-item]')).toBeVisible();
});
