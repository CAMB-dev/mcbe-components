import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { PNG } from 'pngjs';
import type { AnvilNameConfiguration } from '../demo/anvil-name-fixture';

const path = '/demo/anvil-name-fixture.html';
const first = '[data-instance="first"]', inputSelector = `${first} .mc-anvil__name-input`;
const sha = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
async function settle(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function configure(page: Page, value: Partial<AnvilNameConfiguration>) {
  await page.evaluate(value => window.anvilNameQA.configure(value), value);
  for (const [key, expected] of Object.entries(value)) await expect.poll(() => page.locator('main').getAttribute('data-settings').then(s => JSON.parse(s!)[key])).toEqual(expected);
  await settle(page);
}
async function profile(page: Page, value: 'open' | 'local' | 'classic') {
  await page.evaluate(value => window.anvilNameQA.setProfile(value), value); await expect(page.locator('main')).toHaveAttribute('data-profile', value);
  await page.evaluate(async () => { const style = getComputedStyle(document.querySelector('.mc-anvil__name-input')!); await document.fonts.load(style.font, 'QA'); await document.fonts.ready; }); await settle(page);
}
async function open(page: Page, font: 'open' | 'local' | 'classic' = 'open', strict = false) {
  await page.goto(path + (strict ? '?strict' : '')); await page.waitForFunction(() => window.anvilNameQA?.mounted);
  // Real createRoot initial mount must initialize before profile changes,
  // explicit font waits, user input events or a parent state rerender.
  await expect(page.locator(`${first} .mc-anvil__name-field`)).toHaveAttribute('data-mc-name-display', 'ready');
  if (font !== 'open') test.skip(!await page.evaluate(font => font === 'classic' ? window.anvilNameQA.hasClassicFonts : window.anvilNameQA.hasGameFont, font), `Optional caller-owned ${font} face unavailable; generic input/geometry cases still run.`);
  await profile(page, font); await page.locator('#name-focus-sink').focus(); await page.mouse.move(0, 0);
  await expect(page.locator(`${first} .mc-anvil__name-field`)).toHaveAttribute('data-mc-name-display', 'ready');
}
async function state(page: Page, instance = first) {
  return page.locator(instance).evaluate(root => {
    const input = root.querySelector<HTMLInputElement>('.mc-anvil__name-input')!, field = input.parentElement!, clip = field.querySelector<HTMLElement>('.mc-anvil__name-clip')!, display = field.querySelector<HTMLElement>('.mc-anvil__name-display')!, text = field.querySelector<HTMLElement>('.mc-anvil__name-text')!;
    const paint = (node: Element) => { const s = getComputedStyle(node); return { color: s.color, fill: s.webkitTextFillColor, visibility: s.visibility, display: s.display, line: s.lineHeight, font: s.font, size: s.fontSize, shadow: s.textShadow }; };
    const rect = (node: Element) => { const r = node.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
    return { value: input.value, inline: input.getAttribute('style'), focused: document.activeElement === input, selection: [input.selectionStart, input.selectionEnd], field: rect(field), clip: rect(clip), box: rect(display), text: rect(text), input: paint(input), copy: paint(clip), glyph: paint(text), copyText: text.textContent, composing: field.getAttribute('data-mc-name-composing'), ready: field.getAttribute('data-mc-name-display') };
  });
}
async function referenceInputPixels(page: Page, info: TestInfo, label: string) {
  const field = page.locator(`${first} .mc-anvil__name-field`); const actual = PNG.sync.read(await field.screenshot({ animations: 'disabled', caret: 'initial' }));
  const style = await page.addStyleTag({ content: `${first} .mc-anvil__name-clip {visibility:hidden!important} ${inputSelector}{color:#fff!important;-webkit-text-fill-color:#fff!important;text-shadow:none!important}` });
  const reference = PNG.sync.read(await field.screenshot({ animations: 'disabled', caret: 'initial' })); await style.evaluate(node => node.parentNode?.removeChild(node));
  expect([actual.width, actual.height]).toEqual([reference.width, reference.height]); let changed = 0;
  for (let i = 0; i < actual.data.length; i += 4) if (!actual.data.subarray(i, i + 4).equals(reference.data.subarray(i, i + 4))) changed++;
  await info.attach(`short-${label}-real-input.json`, { contentType: 'application/json', body: JSON.stringify({ scope: 'Same blurred field/skin/frame and unchanged native input rendered glyphs as independent browser reference, full field RGBA; no native-game screenshot, mask, threshold or fitted offset.', width: actual.width, height: actual.height, changedPixels: changed, actual: sha(actual.data), reference: sha(reference.data) }) });
  expect(actual.data.equals(reference.data), 'Complete same-skin blurred native-input field RGBA').toBe(true);
}
async function sourceJson() {
  const bytes = await readFile(new URL('../.cache/references/bedrock-samples-v1.26.60.5-full.zip', import.meta.url)); expect(sha(bytes)).toBe('d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf');
  let end = bytes.length - 22; while (end >= 0 && (bytes.readUInt32LE(end) !== 0x06054b50 || end + 22 + bytes.readUInt16LE(end + 20) !== bytes.length)) end--; if (end < 0) throw Error('ZIP end missing');
  const entries = new Map<string, [number, number, number, number]>(); let p = bytes.readUInt32LE(end + 16);
  for (let i = 0; i < bytes.readUInt16LE(end + 10); i++) { const n = bytes.readUInt16LE(p + 28); entries.set(bytes.toString('utf8', p + 46, p + 46 + n), [bytes.readUInt16LE(p + 10), bytes.readUInt32LE(p + 20), bytes.readUInt32LE(p + 24), bytes.readUInt32LE(p + 42)]); p += 46 + n + bytes.readUInt16LE(p + 30) + bytes.readUInt16LE(p + 32); }
  const json = (name: string) => { const e = entries.get(`resource_pack/ui/${name}.json`)!; const start = e[3] + 30 + bytes.readUInt16LE(e[3] + 26) + bytes.readUInt16LE(e[3] + 28), compressed = bytes.subarray(start, start + e[1]), raw = e[0] === 0 ? compressed : inflateRawSync(compressed); expect(raw.length).toBe(e[2]); return JSON.parse(raw.toString().replace(/^\uFEFF/, '').replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, part => part.startsWith('"') ? part : '')); };
  return { anvil: json('anvil_screen'), common: json('ui_common') };
}

test('fixed source archive independently establishes clipping-panel hierarchy right-middle min-width and Anvil10game name height', async () => {
  const { anvil, common } = await sourceJson(), edit = common.text_edit_box;
  expect(anvil.top_half_panel.size).toEqual(['100% - 14px', '50% - 14px']); expect(anvil.top_half_panel.offset).toEqual([7, 7]);
  expect(anvil.icon_and_text_panel.size).toEqual(['100%', '40%']); expect(anvil.anvil_title_and_text_panel.size).toEqual(['80%', '100%']);
  expect(anvil.text_edit_panel.size).toEqual(['100%', '70%']); expect(anvil.text_edit_panel.offset).toEqual([0, 2]);
  expect(anvil['text_edit_control@common.text_edit_box'].$text_edit_box_label_size).toEqual(['default', 10]); expect(anvil['text_edit_control@common.text_edit_box'].max_length).toBe(30);
  expect(edit['$text_edit_box_label_anchor_point|default']).toBe('right_middle'); expect(edit['$text_edit_box_label_min_size|default']).toEqual(['100%', 0]);
  const centering = edit.controls.find((v: any) => v.centering_panel).centering_panel; expect(centering.size).toEqual(['100% - 6px', '100% - 4px']);
  const clip = centering.controls.find((v: any) => v.clipper_panel).clipper_panel; expect(clip.size).toBe('$text_edit_clipping_panel_size'); expect(edit['$text_edit_clipping_panel_size|default']).toEqual(['100%', '100%']); expect(clip.clips_children).toBe(true);
});

for (const font of ['open', 'local', 'classic'] as const) test(`short ${font} name preserves complete blurred native-input RGBA and loads the requested real face`, async ({ page }, info) => {
  await open(page, font); const css = await state(page); expect(css.copyText).toBe('QA'); expect(css.copy.visibility).toBe('visible'); expect(css.input.color).toBe('rgba(0, 0, 0, 0)'); await expect(page.locator(`${first} .mc-anvil__name-clip`)).toHaveAttribute('aria-hidden', 'true');
  const family = font === 'classic' ? 'MCBE Classic' : font === 'local' ? 'Mojangles Pixel' : 'MCBE Pixel';
  expect(css.input.font).toContain(family); expect(css.input.size).toBe(font === 'open' ? '18px' : '20px');
  const loaded = await page.evaluate(async family => (await document.fonts.load(`400 20px "${family}"`, 'QA')).map(f => ({ family: f.family, status: f.status })), family); expect(loaded.length).toBeGreaterThan(0); expect(loaded.every(f => f.status === 'loaded' && f.family.replace(/["']/g, '') === family)).toBe(true);
  await referenceInputPixels(page, info, font);
});

test('long names use source clipper geometry right anchor and intrinsic width without scrolling the real input', async ({ page }, info) => {
  await open(page); const { anvil } = await sourceJson(); expect(anvil.anvil_title_and_text_panel.size).toEqual(['80%', '100%']);
  const root = await page.locator(first).boundingBox(); if (!root) throw Error('No frame');
  // Independent source percentages:176x166 root; top162x69 at7,7;
  // icon row40% of69 at5% vertical offset; text80% with bottom70%+2.
  const topW = 176 - 14, topH = 166 / 2 - 14, rowY = 7 + topH * .05, rowH = topH * .4;
  const field = [7 + topW * .2, rowY + rowH * .3 + 2, topW * .8, rowH * .7];
  const clip = [field[0]! + 3, field[1]! + 2, field[2]! - 6, field[3]! - 4];
  const observations = [];
  for (const name of ['QA', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123', 'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW']) {
    await configure(page, { name }); const s = await state(page);
    for (const [actual, expected] of [[s.field, field], [s.clip, clip]] as const) for (let i = 0; i < 4; i++) expect(Math.abs(actual[i]! - (i < 2 ? [root.x, root.y][i]! : 0) - expected[i]! * 2)).toBeLessThanOrEqual(.02);
    expect(Math.abs(s.box[0]! + s.box[2]! - s.clip[0]! - s.clip[2]!)).toBeLessThanOrEqual(.02); expect(s.box[2]!).toBeGreaterThanOrEqual(s.clip[2]! - .02);
    const independent = await page.locator(inputSelector).evaluate(node => { const s = getComputedStyle(node), probe = document.createElement('span'); probe.textContent = (node as HTMLInputElement).value; probe.style.cssText = `position:fixed;left:-10000px;white-space:pre;width:max-content;font:${s.font};letter-spacing:${s.letterSpacing};`; document.body.append(probe); const width = probe.getBoundingClientRect().width; probe.remove(); return { width, scroll: (node as HTMLInputElement).scrollLeft }; });
    expect(Math.abs(s.box[2]! - Math.max(s.clip[2]!, independent.width))).toBeLessThanOrEqual(.02); expect(independent.scroll).toBe(0); observations.push({ name, ...s, intrinsic: independent.width });
  }
  await info.attach('source-long-name-geometry.json', { contentType: 'application/json', body: JSON.stringify({ field, clip, observations, scope: 'Source JSON anchor/clipper plus independent intrinsic DOM measure; not native long-name pixel equality. Native probe local maxscroll A remains lower residual than C.' }) });
});

test('focus blur controlled changes and already-loaded profile switches retain actual input node and native selection', async ({ page }) => {
  await open(page); const input = page.locator(inputSelector), handle = await input.elementHandle(); await input.fill('Adventure tool'); await input.evaluate(n => (n as HTMLInputElement).setSelectionRange(2, 7));
  for (const font of ['open', 'local', 'classic'] as const) {
    if (font !== 'open' && !await page.evaluate(f => f === 'classic' ? window.anvilNameQA.hasClassicFonts : window.anvilNameQA.hasGameFont, font)) continue;
    await profile(page, font); expect(await handle!.evaluate(node => node === document.querySelector('.mc-anvil__name-input'))).toBe(true); await expect(input).toBeFocused(); expect((await state(page)).selection).toEqual([2, 7]); expect((await state(page)).copy.visibility).toBe('hidden');
    await page.locator('#name-focus-sink').focus(); expect((await state(page)).selection).toEqual([2, 7]); expect((await state(page)).copyText).toBe('Adventure tool'); await input.focus();
  }
  await configure(page, { name: 'Server rename' }); await expect(input).toHaveValue('Server rename'); expect(await handle!.evaluate(node => node.isConnected)).toBe(true); await page.locator('#name-focus-sink').focus(); expect((await state(page)).copyText).toBe('Server rename');
});

test('controlled rejection with synchronous blur keeps the fixed prop visible while accepted uppercase changes remain authoritative', async ({ page }, info) => {
  await open(page); const input = page.locator(inputSelector), handle = await input.elementHandle(), inline = await input.getAttribute('style');
  await configure(page, { name: 'QA', controlMode: 'reject-blur' }); const fixedSettings = await page.locator('main').getAttribute('data-settings');
  await input.focus(); await input.press('End'); await input.pressSequentially('x'); await settle(page); await page.evaluate(() => document.fonts.ready.then(() => undefined)); await settle(page);
  const rejected = await state(page); expect(rejected.value).toBe('QA'); expect(rejected.copyText).toBe('QA'); expect(rejected.focused).toBe(false); expect(rejected.copy.visibility).toBe('visible'); expect(rejected.selection).toEqual([2, 2]);
  expect(await page.locator('main').getAttribute('data-settings')).toBe(fixedSettings); expect(await input.getAttribute('style')).toBe(inline); expect(await handle!.evaluate(node => node === document.querySelector('.mc-anvil__name-input'))).toBe(true);
  expect(await page.evaluate(() => window.anvilNameQA.events.filter(value => value === 'reject:QAx').length)).toBe(1);
  await configure(page, { name: 'QA', controlMode: 'uppercase-blur' }); await input.focus(); await input.press('End'); await input.pressSequentially('x'); await settle(page); await page.evaluate(() => document.fonts.ready.then(() => undefined)); await settle(page);
  const accepted = await state(page); expect(accepted.value).toBe('QAX'); expect(accepted.copyText).toBe('QAX'); expect(accepted.focused).toBe(false); expect(accepted.copy.visibility).toBe('visible'); expect(accepted.selection).toEqual([3, 3]); expect(await input.getAttribute('style')).toBe(inline); expect(await handle!.evaluate(node => node.isConnected)).toBe(true);
  await info.attach('controlled-reject-and-uppercase-blur.json', { contentType: 'application/json', body: JSON.stringify({ rejected, accepted, fixedSettings, scope: 'Real pressSequentially native input, host reject handler only records external array and synchronously blurs without setState; accepted uppercase host changes prop. React controlled value owns the decorative text, node, native selection and inline paint stay intact.' }) });
});

test('maxlength read-only and disabled semantics remain native while blurred locked glyphs and field stay coherent', async ({ page }) => {
  await open(page); const input = page.locator(inputSelector); await input.fill(''); await input.pressSequentially('x'.repeat(35)); await expect(input).toHaveValue('x'.repeat(30)); await expect(input).toHaveAttribute('maxlength', '30');
  await configure(page, { name: 'Read only tool', readOnly: true }); await input.press('End'); await input.press('x'); await expect(input).toHaveValue('Read only tool'); await expect(input).toBeEnabled();
  await configure(page, { disabled: true, readOnly: false }); await expect(input).toBeDisabled(); await page.locator('#name-focus-sink').focus(); const s = await state(page); expect(s.copyText).toBe('Read only tool'); expect(s.glyph.color).toBe('rgba(255, 255, 255, 0.5)'); expect(s.copy.visibility).toBe('visible');
  await configure(page, { disabled: false }); await input.fill('Restored'); await expect(page.getByLabel('Name events')).toContainText('first:Restored');
});

test('focus and synthetic composition immediately use the real input without duplicate blurred glyphs', async ({ page }) => {
  await open(page); const input = page.locator(inputSelector), handle = await input.elementHandle();
  await input.evaluate(node => node.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '钻' })));
  await expect.poll(async () => (await state(page)).copy.visibility).toBe('hidden'); expect((await state(page)).input.color).not.toBe('rgba(0, 0, 0, 0)');
  await input.focus(); await input.evaluate(node => (node as HTMLInputElement).setSelectionRange(0, 2)); await input.evaluate(node => node.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '钻' })));
  expect((await state(page)).copy.visibility).toBe('hidden'); expect((await state(page)).selection).toEqual([0, 2]); await expect(input).toBeFocused();
  await page.locator('#name-focus-sink').focus(); await expect.poll(async () => (await state(page)).copy.visibility).toBe('visible'); expect(await handle!.evaluate(node => node.isConnected)).toBe(true); await expect(page.getByRole('textbox')).toHaveCount(2); await expect(page.locator(`${first} canvas`)).toHaveCount(0);
});

test('two instances keep names focus composition and unmount ownership isolated', async ({ page }) => {
  await open(page, 'open', true); const other = page.getByRole('textbox', { name: 'Second name', exact: true }), handle = await other.elementHandle();
  await configure(page, { name: 'First changed' }); expect((await state(page, '[data-instance="second"]')).copyText).toBe('Second tool');
  await other.fill('Independent'); expect((await state(page)).copyText).toBe('First changed'); await other.evaluate(node => node.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: 'A' })));
  expect((await state(page)).copy.visibility).toBe('visible'); await configure(page, { showFirst: false }); expect(await handle!.evaluate(node => node.isConnected)).toBe(true); await expect(other).toHaveValue('Independent');
  await other.evaluate(node => node.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))); await page.locator('#name-focus-sink').focus(); await expect(page.locator('.mc-anvil__name-clip')).toHaveCount(1);
});

test('external input line metrics recompute the UA display after load and cleanup leaves original inline properties untouched', async ({ page }, info) => {
  await open(page); const input = page.locator(inputSelector), handle = await input.elementHandle(); const inline = await input.getAttribute('style');
  for (const [inputHeight, inputLine, inputSize] of [[20, 24, 18], [28, 24, 18], [20, 20, 20]] as const) { await configure(page, { customLine: true, inputHeight, inputLine, inputSize }); await referenceInputPixels(page, info, `metrics-${inputHeight}-${inputLine}-${inputSize}`); expect(await input.getAttribute('style')).toBe(inline); }
  await configure(page, { customLine: false, name: 'Qa a' });
  await input.evaluate(node => { (node as HTMLInputElement).style.textTransform = 'uppercase'; (node as HTMLInputElement).style.wordSpacing = '3px'; }); await settle(page);
  const userInline = await input.getAttribute('style'); expect(userInline).toContain('text-transform: uppercase'); expect(userInline).toContain('word-spacing: 3px');
  await referenceInputPixels(page, info, 'host-transform-word-spacing'); expect(await input.getAttribute('style')).toBe(userInline);
  await page.evaluate(() => window.anvilNameQA.unmount()); await expect(page.locator('.mc-anvil__name-clip')).toHaveCount(0); expect(await handle!.evaluate(node => node.getAttribute('style'))).toBe(userInline);
  await handle!.evaluate(node => { node.dispatchEvent(new FocusEvent('focus')); node.dispatchEvent(new CompositionEvent('compositionstart')); }); await settle(page); await expect(page.locator('.mc-anvil__name-clip')).toHaveCount(0);
});

test('whole source name ready pending error images-only and off have one visual owner while retaining the same input', async ({ page }, info) => {
  await open(page); const pagePng = new PNG({ width: 128, height: 128 }); for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) pagePng.data.set([220, 40, 100, 255], (y * 128 + x) * 4); const bytes = PNG.sync.write(pagePng);
  let release!: () => void; const blocked = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/qa-anvil-name-page.png', route => route.fulfill({ body: bytes, contentType: 'image/png' }));
  await page.route('**/qa-anvil-name-delayed.png', async route => { await blocked; await route.fulfill({ body: bytes, contentType: 'image/png' }); });
  const input = page.locator(inputSelector), handle = await input.elementHandle(), marker = page.locator(`${first} .mc-anvil-image-layer`);
  await configure(page, { source: 'name' }); await expect(marker).toHaveAttribute('data-render-state', 'ready'); expect((await state(page)).copy.visibility).toBe('hidden'); expect((await state(page)).input.color).toBe('rgba(0, 0, 0, 0)');
  try { await configure(page, { fontUrl: '/qa-anvil-name-delayed.png' }); await expect(marker).toHaveAttribute('data-render-state', 'loading'); expect((await state(page)).copy.visibility).toBe('visible'); } finally { release(); } await expect(marker).toHaveAttribute('data-render-state', 'ready');
  await configure(page, { badOffset: true }); await expect(page.locator(`${first} .mc-anvil-image-error`)).toHaveAttribute('data-render-state', 'error'); expect((await state(page)).copy.visibility).toBe('visible');
  await configure(page, { badOffset: false, source: 'images' }); await expect(marker).toHaveAttribute('data-render-state', 'ready'); expect((await state(page)).copy.visibility).toBe('visible');
  await configure(page, { source: 'off' }); await expect(marker).toHaveCount(0); expect((await state(page)).copy.visibility).toBe('visible'); expect(await handle!.evaluate(node => node.isConnected)).toBe(true); await input.focus(); expect((await state(page)).copy.visibility).toBe('hidden'); expect((await state(page)).input.color).not.toBe('rgba(0, 0, 0, 0)');
  await info.attach('source-name-owner-contract.json', { contentType: 'application/json', body: JSON.stringify({ states: ['ready name:canvas', 'pending:DOM', 'error:DOM', 'ready images-only:DOM', 'off:DOM', 'focused:native-input'], scope: 'Actual source renderer state ownership and input identity, not synthetic font/native glyph fidelity.' }) });
});
