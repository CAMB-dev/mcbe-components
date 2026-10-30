import { test, expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { createElement } from 'react';
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { EmoteWheelScreen } from '../src/emote-wheel-screen';
import { EmoteWheel } from '../src/emote-wheel';
import type { EmoteScreenQASettings } from '../demo/emote-wheel-screen-fixture';

const screen = (page: Page) => page.locator('#qa-emote-screen');
const part = (page: Page, name: string) => screen(page).locator(`.mc-emote-wheel-screen__${name}`);
const wheel = (page: Page) => screen(page).locator('.mc-emote-wheel');
const slot = (page: Page, index: number) => wheel(page).locator(`button[data-emote-index="${index}"]`);
const change = (page: Page) => part(page, 'change-button');
async function configure(page: Page, patch: Partial<EmoteScreenQASettings>) { await page.evaluate(value => window.emoteScreenQA.configure(value), patch); }
async function open(page: Page, patch: Partial<EmoteScreenQASettings> = {}, strict = false) {
  await page.addInitScript(value => { window.emoteScreenQAInitial = value; }, patch);
  await page.goto(`/demo/emote-wheel-screen-fixture.html${strict ? '?strict' : ''}`);
  await expect.poll(() => page.evaluate(() => !!window.emoteScreenQA?.ref && !!window.emoteScreenQA.wheelRef)).toBe(true);
}
async function events(page: Page, kind: string) { return page.evaluate(kind => window.emoteScreenQA.events.filter(e => e.kind === kind), kind); }
async function clear(page: Page) { await page.evaluate(() => { window.emoteScreenQA.events.length = 0; }); }
async function box(node: Locator) { const b = await node.boundingBox(); expect(b).not.toBeNull(); return b!; }
const near = (actual: number, expected: number) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1 / 32);

test('source screen SSR keeps four slots locale defaults and rejects unsupported frame or slot inputs without a modal shell', async () => {
  type Props = ComponentProps<typeof EmoteWheelScreen>;
  const slots = [0, 1, 2, 3].map(index => ({ id: String(index), label: `Action${index}`, preview: { kind: 'empty' as const } })) as unknown as Props['slots'];
  const props = { slots, label: 'Source emote screen', scale: 1 };
  const markup = renderToStaticMarkup(createElement(EmoteWheelScreen, props));
  expect(markup).toContain('Source emote screen'); expect(markup).toContain('Use Hotkey or Mouse to activate Emote'); expect(markup).toContain('Change Emotes');
  expect(markup).toContain('width:400px'); expect(markup).toContain('height:300px'); expect(markup).not.toContain('aria-modal="true"');
  const undefinedLabel = renderToStaticMarkup(createElement(EmoteWheelScreen, { ...props, inputMode: 'touch', labels: { touchInstruction: undefined } }));
  expect(undefinedLabel).toContain('Tap emote to activate');
  expect(renderToStaticMarkup(createElement(EmoteWheelScreen, { ...props, labels: { keyboardInstruction: '' } }))).not.toContain('Use Hotkey or Mouse to activate Emote');
  expect(() => renderToStaticMarkup(createElement(EmoteWheelScreen, { ...props, labels: { touchInstruction: null } as unknown as Props['labels'] }))).toThrow();
  expect(() => renderToStaticMarkup(createElement(EmoteWheelScreen, { ...props, size: [0, 200] }))).toThrow();
  expect(() => renderToStaticMarkup(createElement(EmoteWheelScreen, { ...props, scale: 1.5 }))).toThrow();
  expect(() => renderToStaticMarkup(createElement(EmoteWheelScreen, { ...props, slots: slots.slice(0, 3) as unknown as Props['slots'] }))).toThrow();
});

test('independent wheel SSR keeps empty names blank and honors an explicit source center binding', async () => {
  type Slots = ComponentProps<typeof EmoteWheel>['slots'];
  const slots: Slots = [
    { id: 'empty', label: 'Accessible empty emote', preview: { kind: 'empty' } },
    { id: 'valid', label: 'Valid emote name', preview: { kind: 'text', text: '1' } },
    { id: 'image', label: 'Image emote name', preview: { kind: 'image', src: '/caller-thumbnail.png' } },
    { id: 'last', label: 'Last empty', preview: { kind: 'empty' } },
  ];
  const center = (markup: string) => markup.match(/<span\b[^>]*class="[^"]*\bmc-emote-wheel__name\b[^"]*"[^>]*>([\s\S]*?)<\/span>/)?.[1];
  const render = (extra: Partial<ComponentProps<typeof EmoteWheel>>) => renderToStaticMarkup(createElement(EmoteWheel, { slots, label: 'SSR center', scale: 1, ...extra }));
  expect(center(render({ activeIndex: 0 }))).toBe(''); expect(center(render({ activeIndex: 1 }))).toBe('Valid emote name'); expect(center(render({ activeIndex: 2 }))).toBe('Image emote name');
  expect(center(render({ activeIndex: 1, centerLabel: '' }))).toBe(''); expect(center(render({ activeIndex: null, centerLabel: 'Independent binding' }))).toBe('Independent binding');
});

test('center-name binding is independent of accepted index and accessible empty-slot labels without leaking DOM props', async ({ page }) => {
  await open(page, { activeIndex: 3 }); const center = wheel(page).locator('.mc-emote-wheel__name');
  await expect(center).toBeEmpty(); await expect(slot(page, 3)).toHaveAttribute('aria-label', 'Empty action'); await expect(slot(page, 3)).toHaveAttribute('aria-pressed', 'true');
  await configure(page, { activeIndex: 0 }); await expect(center).toHaveText('Top action');
  await configure(page, { activeIndex: 3, centerLabel: 'Independent source name' }); await expect(center).toHaveText('Independent source name'); await expect(slot(page, 3)).toHaveAttribute('aria-label', 'Empty action');
  expect(await screen(page).evaluate(n => n.hasAttribute('centerlabel'))).toBe(false); expect(await wheel(page).evaluate(n => n.hasAttribute('centerlabel'))).toBe(false);
  await configure(page, { activeIndex: 0, centerLabel: '' }); await expect(center).toBeEmpty(); await expect(slot(page, 0)).toHaveAttribute('aria-label', 'Top action');
  await configure(page, { activeIndex: 1, centerLabel: undefined }); await expect(center).toHaveText('Right action');
  await configure(page, { activeIndex: null }); await expect(center).toBeEmpty();
});

test('source55percent plus35 wheel-root,75percent square,2gap and equal fill margins survive resize and scale', async ({ page }) => {
  await open(page, { labels: { keyboardInstruction: 'Pick', touchInstruction: 'Tap', changeEmotes: 'Change' } });
  for (const [size, scale] of [[[320, 260], 1], [[150, 300], 2]] as const) {
    await configure(page, { size, scale }); const root = await box(screen(page)), region = await box(part(page, 'wheel-root')), art = await box(wheel(page).locator('.mc-emote-wheel__frame'));
    near(root.width, size[0] * scale); near(root.height, size[1] * scale); near(region.width, root.width); near(region.height, (size[1] * .55 + 35) * scale);
    const diameter = Math.min(size[0], size[1] * .55 + 35) * .75 * scale;
    near(art.width, diameter); near(art.height, diameter); near(art.x + art.width / 2, root.x + root.width / 2); near(art.y + art.height / 2, region.y + region.height / 2);
    near((await box(part(page, 'gap'))).height, 2 * scale);
    const fills = part(page, 'fill'); expect(await fills.count()).toBe(2); const top = await box(fills.nth(0)), bottom = await box(fills.nth(1)); near(top.height, bottom.height);
    near(region.y - root.y, top.height); near(root.y + root.height - (bottom.y + bottom.height), 0);
  }
});

test('instruction background follows intrinsic content plus10 by14 rather than fading the text subtree', async ({ page }) => {
  await open(page, { labels: { keyboardInstruction: 'Choose', touchInstruction: 'Tap', changeEmotes: 'Change' } });
  for (const scale of [1, 2]) {
    await configure(page, { scale, size: [150, 300] }); const outer = await box(part(page, 'instruction-box')), content = await box(part(page, 'instruction-content'));
    near(outer.width - content.width, 10 * scale); near(outer.height - content.height, 14 * scale);
    await expect(part(page, 'instruction-background')).toHaveCSS('opacity', '0.7'); await expect(part(page, 'instruction-box')).toHaveCSS('opacity', '1'); await expect(part(page, 'instruction-content')).toHaveCSS('opacity', '1');
    await expect(part(page, 'instruction-text')).toHaveCSS('max-width', `${300 * scale}px`); await expect(part(page, 'instruction-text')).toHaveCSS('max-height', `${20 * scale}px`);
    await expect(part(page, 'instruction-text')).toHaveCSS('color', 'rgb(255, 255, 255)'); expect(await part(page, 'instruction-text').evaluate(n => getComputedStyle(n).textShadow)).toMatch(new RegExp(` ${scale}px ${scale}px 0px$`));
  }
});

test('whole original Black source composes alpha0point7 over the host while the screen itself stays transparent', async ({ page }, info) => {
  const original = await readFile(new URL('../src/assets/emote-wheel/Black.png', import.meta.url));
  expect(createHash('sha256').update(original).digest('hex')).toBe('492d761d357b4fbdd29d0bc7a06a6423b5b0842d47c2d069ca90a9746ff5117e');
  const source = PNG.sync.read(original); expect([source.width, source.height]).toEqual([2, 2]); expect([...source.data]).toEqual(Array.from({ length: 4 }, () => [0, 0, 0, 255]).flat());
  await open(page, { size: [150, 280], scale: 2, labels: { keyboardInstruction: 'Pick', touchInstruction: 'Tap', changeEmotes: 'Change' } });
  await page.evaluate(async () => { await document.fonts.ready; });
  const bgBytes = await part(page, 'instruction-box').screenshot({ scale: 'css' }), fullBytes = await screen(page).screenshot({ scale: 'css' });
  const bg = PNG.sync.read(bgBytes), full = PNG.sync.read(fullBytes), host = [60, 100, 140], expected = host.map(v => Math.round(v * (1 - .7))); let maxDelta = 0;
  for (let y = 2; y < 6; y++) for (let x = 2; x < 6; x++) { const i = (y * bg.width + x) * 4; expect(bg.data[i + 3]).toBe(255); for (let c = 0; c < 3; c++) maxDelta = Math.max(maxDelta, Math.abs(bg.data[i + c]! - expected[c]!)); }
  expect(maxDelta).toBeLessThanOrEqual(1);
  const outside = (2 * full.width + 2) * 4; expect([...full.data.subarray(outside, outside + 4)]).toEqual([...host, 255]);
  let opaqueWhite = 0; for (let i = 0; i < bg.data.length; i += 4) if (bg.data[i] === 255 && bg.data[i + 1] === 255 && bg.data[i + 2] === 255) opaqueWhite++;
  expect(opaqueWhite).toBeGreaterThan(0);
  await info.attach('instruction-black-composite.png', { body: bgBytes, contentType: 'image/png' });
  await info.attach('transparent-screen.png', { body: fullBytes, contentType: 'image/png' });
  await info.attach('instruction-alpha.json', { body: JSON.stringify({ qualification: 'DOM original Black on fixture background, not native screen parity', sourceSHA256: createHash('sha256').update(original).digest('hex'), host, expected, comparedPaddingPixels: 16, actualMaximumChannelDelta: maxDelta, opaqueWhiteTextPixels: opaqueWhite }), contentType: 'application/json' });
});

test('change button120by23 retains a27 row when hidden but gamepad removes the row from layout', async ({ page }) => {
  await open(page); near((await box(part(page, 'change-row'))).height, 27); const b = await box(change(page)); near(b.width, 120); near(b.height, 23);
  const before = await box(part(page, 'wheel-root'));
  await configure(page, { changeEmotesVisible: false }); await expect(change(page)).toBeHidden(); near((await box(part(page, 'change-row'))).height, 27); near((await box(part(page, 'wheel-root'))).y, before.y);
  await configure(page, { inputMode: 'gamepad', gamepadInstruction: 'Caller quick menu' }); await expect(part(page, 'change-row')).toBeHidden(); expect(await part(page, 'change-row').boundingBox()).toBeNull();
  await configure(page, { inputMode: 'keyboard', changeEmotesVisible: true }); await expect(change(page)).toBeVisible(); near((await box(part(page, 'change-row'))).height, 27);
});

test('input mode labels limits and caller gamepad glyph description remain dynamic without a fabricated platform icon', async ({ page }) => {
  await open(page); await expect(part(page, 'instruction-text')).toHaveText('Choose emote');
  await configure(page, { inputMode: 'touch' }); await expect(part(page, 'instruction-text')).toHaveText('Tap emote');
  await configure(page, { inputMode: 'gamepad' }); await expect(part(page, 'start-glyph')).toHaveCount(0); await expect(part(page, 'gamepad-helpers')).toHaveCount(0); await expect(screen(page).locator('img[src*="grey_gamepad_icon_button"]')).toHaveCount(0);
  await configure(page, { gamepadInstruction: 'Host gamepad instruction', gamepadStartGlyph: 'GS', gamepadStartDescription: 'Start action', gamepadExitLabel: 'Caller exit' });
  await expect(part(page, 'instruction-text')).toHaveText('Host gamepad instruction'); await expect(part(page, 'instruction-text')).toHaveCSS('max-height', '28px'); await expect(part(page, 'instruction-text')).toHaveCSS('color', 'rgb(255, 255, 0)');
  expect(await part(page, 'instruction-text').evaluate(n => getComputedStyle(n).fontFamily)).toContain('CallerTen');
  await expect(part(page, 'start-glyph')).toHaveText('GS'); near((await box(part(page, 'start-glyph'))).width, 26); near((await box(part(page, 'start-glyph'))).height, 26);
  await expect(part(page, 'start-description')).toHaveText('Start action'); await expect(part(page, 'exit-label')).toHaveText('Caller exit'); near((await box(part(page, 'exit-label'))).width, 100);
  near((await box(part(page, 'start-description-panel'))).width - (await box(part(page, 'start-description'))).width, 2); near((await box(part(page, 'start-helper'))).height, 26);
  await expect(part(page, 'start-description')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await configure(page, { gamepadStartGlyph: 'AB', gamepadExitLabel: 'Updated exit' }); await expect(part(page, 'start-glyph')).toHaveText('AB'); await expect(part(page, 'exit-label')).toHaveText('Updated exit');
});

test('outside blank click requests close but does not own mounting or navigate anywhere', async ({ page }) => {
  await open(page); await page.locator('#screen-before').click(); await expect(page.locator('#screen-before')).toBeFocused(); expect(await events(page, 'close')).toHaveLength(0);
  const root = await box(screen(page)); await page.mouse.click(root.x + 1, root.y + 1);
  expect(await events(page, 'close')).toHaveLength(1); expect((await events(page, 'close'))[0]).toMatchObject({ value: 'outside', detail: { currentTarget: 'qa-emote-screen' } }); await expect(screen(page)).toBeVisible();
  await configure(page, { acceptClose: true }); await page.mouse.click(root.x + 1, root.y + 1); await expect(screen(page)).toHaveCount(0); expect(await page.evaluate(() => window.emoteScreenQA.ref)).toBeNull();
});

test('wheel activation including captured pointer clicks never bubbles into outside-close routing', async ({ page }) => {
  await open(page); const art = await box(wheel(page).locator('.mc-emote-wheel__frame'));
  await page.mouse.click(art.x + art.width * .83, art.y + art.height * .5);
  expect(await events(page, 'activate')).toHaveLength(1); expect((await events(page, 'activate'))[0]).toMatchObject({ value: 1 }); expect(await events(page, 'close')).toHaveLength(0);
  await clear(page); await page.mouse.click(art.x + art.width * .5, art.y + art.height * .5); expect(await events(page, 'activate')).toHaveLength(0); expect(await events(page, 'close')).toHaveLength(0);
  await page.mouse.click(art.x + art.width * .98, art.y + art.height * .02); expect(await events(page, 'activate')).toHaveLength(0); expect(await events(page, 'close')).toHaveLength(0);
});

test('entire instruction panel and retained hidden-button row are protected while wheel-root side blank is outside', async ({ page }) => {
  await open(page, { changeEmotesVisible: false }); const instruction = await box(part(page, 'instruction')), row = await box(part(page, 'change-row'));
  await page.mouse.click(instruction.x + 1, instruction.y + instruction.height / 2); await page.mouse.click(row.x + 1, row.y + row.height / 2); expect(await events(page, 'close')).toHaveLength(0);
  const host = await box(part(page, 'wheel-root')); await page.mouse.click(host.x + 1, host.y + host.height / 2); expect((await events(page, 'close')).at(-1)).toMatchObject({ value: 'outside' });
});

test('Escape composes once from a focused wheel slot and from the change button without clearing accepted selection', async ({ page }) => {
  await open(page, { activeIndex: 1, acceptActive: false });
  for (const target of [slot(page, 1), change(page)]) {
    await target.focus(); await clear(page); await page.keyboard.press('Escape');
    expect(await events(page, 'close')).toHaveLength(1); expect((await events(page, 'close'))[0]).toMatchObject({ value: 'escape', detail: { currentTarget: 'qa-emote-screen' } });
    expect(await events(page, 'caller-capture')).toHaveLength(1); expect(await events(page, 'caller-key')).toHaveLength(1); expect(await events(page, 'active')).toHaveLength(0); await expect(wheel(page)).toHaveAttribute('data-active-index', '1');
  }
});

test('caller capture and normal key handlers may veto Escape without duplicate calls or child cancellation', async ({ page }) => {
  await open(page, { activeIndex: 1, acceptActive: false });
  for (const patch of [{ preventCaptureKeys: ['Escape'], preventKeys: [] }, { preventCaptureKeys: [], preventKeys: ['Escape'] }]) {
    await configure(page, patch); await slot(page, 1).focus(); await clear(page); await page.keyboard.press('Escape');
    expect(await events(page, 'close')).toHaveLength(0); expect(await events(page, 'caller-capture')).toHaveLength(1); expect(await events(page, 'caller-key')).toHaveLength(1); expect(await events(page, 'active')).toHaveLength(0);
  }
});

test('gamepad disabled composition and modified Escape are guarded while normal wheel keys still work', async ({ page }) => {
  await open(page, { activeIndex: 0 }); await wheel(page).focus(); await page.keyboard.press('2'); expect((await events(page, 'activate')).at(-1)).toMatchObject({ value: 1 });
  await clear(page); for (const extra of [{ isComposing: true }, { keyCode: 229 }, { ctrlKey: true }, { altKey: true }, { metaKey: true }]) await wheel(page).dispatchEvent('keydown', { key: 'Escape', bubbles: true, ...extra });
  expect(await events(page, 'close')).toHaveLength(0);
  await configure(page, { inputMode: 'gamepad' }); await wheel(page).focus(); await page.keyboard.press('Escape'); expect(await events(page, 'close')).toHaveLength(0);
  await configure(page, { inputMode: 'keyboard', disabled: true }); await screen(page).focus(); await page.keyboard.press('Escape'); const b = await box(screen(page)); await page.mouse.click(b.x + 1, b.y + 1); expect(await events(page, 'close')).toHaveLength(0);
});

test('change request uses a real button with independent disabled and capture-prevented host guards', async ({ page }) => {
  await open(page); await change(page).focus(); await page.keyboard.press('Enter'); expect(await events(page, 'change')).toHaveLength(1); expect(await events(page, 'close')).toHaveLength(0);
  await configure(page, { changeEmotesDisabled: true }); await expect(change(page)).toBeDisabled(); await clear(page); await change(page).evaluate(n => (n as HTMLButtonElement).click()); expect(await events(page, 'change')).toHaveLength(0);
  await configure(page, { changeEmotesDisabled: false, preventClickCapture: true }); await change(page).evaluate(n => (n as HTMLButtonElement).click()); expect(await events(page, 'change')).toHaveLength(0);
  await configure(page, { preventClickCapture: false, disabled: true }); await expect(change(page)).toBeDisabled();
});

test('Change button source focus routes Left Right to the wheel and stops Down while caller handlers may veto', async ({ page }) => {
  await open(page, { activeIndex: 1, acceptActive: false });
  await page.evaluate(() => { document.addEventListener('keydown', event => { (window as unknown as { lastScreenNativeKey: KeyboardEvent }).lastScreenNativeKey = event; }, true); });
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowDown']) {
    await change(page).focus(); await clear(page); const y = await page.evaluate(() => scrollY); await page.keyboard.press(key);
    await expect(key === 'ArrowDown' ? change(page) : wheel(page)).toBeFocused(); await expect(wheel(page)).toHaveAttribute('data-active-index', '1');
    expect(await events(page, 'active')).toHaveLength(0); expect(await events(page, 'activate')).toHaveLength(0); expect(await events(page, 'close')).toHaveLength(0);
    expect(await events(page, 'caller-capture')).toHaveLength(1); expect(await events(page, 'caller-key')).toHaveLength(1);
    expect((await events(page, 'caller-key'))[0]).toMatchObject({ value: key, detail: { currentTarget: 'qa-emote-screen' } }); expect(await page.evaluate(() => scrollY)).toBe(y);
    if (key === 'ArrowDown') expect(await page.evaluate(() => (window as unknown as { lastScreenNativeKey: KeyboardEvent }).lastScreenNativeKey.defaultPrevented)).toBe(true);
  }
  for (const patch of [{ preventCaptureKeys: ['ArrowLeft'], preventKeys: [] }, { preventCaptureKeys: [], preventKeys: ['ArrowRight'] }]) {
    await configure(page, patch); await change(page).focus(); await clear(page); await page.keyboard.press(patch.preventCaptureKeys[0] ?? patch.preventKeys[0]!);
    await expect(change(page)).toBeFocused(); expect(await events(page, 'caller-capture')).toHaveLength(1); expect(await events(page, 'caller-key')).toHaveLength(1); expect(await events(page, 'active')).toHaveLength(0); expect(await events(page, 'activate')).toHaveLength(0);
  }
});

test('outside root click prevention and controlled wheel rejection keep requests separate from accepted state', async ({ page }) => {
  await open(page, { preventClick: true, activeIndex: 0, acceptActive: false }); const root = await box(screen(page)); await page.mouse.click(root.x + 1, root.y + 1); expect(await events(page, 'close')).toHaveLength(0);
  await wheel(page).focus(); await page.keyboard.press('ArrowRight'); await expect(slot(page, 1)).toBeFocused(); await expect(wheel(page)).toHaveAttribute('data-active-index', '0');
  await page.keyboard.press('Enter'); expect((await events(page, 'activate')).at(-1)).toMatchObject({ value: 1 }); expect(await events(page, 'close')).toHaveLength(0);
});

test('root child-wheel and change-button refs survive resize and mode changes then detach on unmount', async ({ page }) => {
  await open(page, {}, true); expect(await screen(page).evaluate(n => n === window.emoteScreenQA.ref)).toBe(true); expect(await wheel(page).evaluate(n => n === window.emoteScreenQA.wheelRef)).toBe(true); expect(await change(page).evaluate(n => n === window.emoteScreenQA.changeRef)).toBe(true);
  await screen(page).evaluate(n => { (window as unknown as { savedScreen: Node; savedChild: Node | null }).savedScreen = n; (window as unknown as { savedChild: Node | null }).savedChild = window.emoteScreenQA.wheelRef; });
  await configure(page, { size: [310, 270], inputMode: 'touch' }); expect(await screen(page).evaluate(n => n === (window as unknown as { savedScreen: Node }).savedScreen)).toBe(true); expect(await wheel(page).evaluate(n => n === (window as unknown as { savedChild: Node }).savedChild)).toBe(true);
  await page.evaluate(() => window.emoteScreenQA.unmount()); expect(await page.evaluate(() => [window.emoteScreenQA.ref, window.emoteScreenQA.wheelRef, window.emoteScreenQA.changeRef])).toEqual([null, null, null]);
});

test('supported frames have no scrollbars and tiny frames clip literal source layout instead of shrinking or scrolling the document', async ({ page }) => {
  await open(page); await expect(screen(page).locator('[role="scrollbar"], .mc-scrollbar')).toHaveCount(0);
  const docBefore = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, y: scrollY })); expect(docBefore.scrollWidth).toBeLessThanOrEqual(docBefore.width + 1);
  await configure(page, { size: [300, 60] }); near((await box(screen(page))).height, 60); near((await box(part(page, 'wheel-root'))).height, .55 * 60 + 35);
  expect(await screen(page).evaluate(n => getComputedStyle(n).overflowY)).toMatch(/hidden|clip/); expect(await page.evaluate(() => scrollY)).toBe(docBefore.y);
  const docAfter = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth })); expect(docAfter.scrollWidth).toBeLessThanOrEqual(docAfter.width + 1);
});
