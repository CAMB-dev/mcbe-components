import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createElement } from 'react';
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { EmoteWheel } from '../src/emote-wheel';
import type { EmoteQASettings } from '../demo/emote-wheel-fixture';

type Slot = ComponentProps<typeof EmoteWheel>['slots'][number];
const originalFrames = [
  ['emote_wheel_updated_base', '2fcb8d895aa748f0f6715430b312ffee939e66615c2dd09c5317acd593835868'],
  ['emote_wheel_updated_select_0', 'f1dc68a70cb8d1b8138284d0a1b43b2666eb3a3823776db4d4f34115b32c54f8'],
  ['emote_wheel_updated_select_1', '79c9166fbdbdeecc32a55fa9e6cafc0b837e6eb99eff13a43931d558488d1f45'],
  ['emote_wheel_updated_select_2', 'de16e43e03d5900c3c93d4fb7f7d6f6075426ce9148427b73489eb6adc7bbfdc'],
  ['emote_wheel_updated_select_3', '261f230f2f065e572b479b778cfe852157f6959b304cdc663813956df997829f'],
] as const;
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const wheel = (page: Page) => page.locator('#qa-emote-wheel');
const slot = (page: Page, index: number) => wheel(page).locator(`.mc-emote-wheel__slot[data-emote-index="${index}"]`);
const preview = (page: Page, index: number) => slot(page, index).locator('.mc-emote-slot-preview');
async function configure(page: Page, patch: Partial<EmoteQASettings>) { await page.evaluate(value => window.emoteQA.configure(value), patch); }
async function open(page: Page, patch: Partial<EmoteQASettings> = {}, strict = false) {
  await page.addInitScript(value => { window.emoteQAInitial = value; }, patch);
  await page.goto(`/demo/emote-wheel-fixture.html${strict ? '?strict' : ''}`);
  await expect.poll(() => page.evaluate(() => window.emoteQA?.mounted && !!window.emoteQA.ref)).toBe(true);
}
async function events(page: Page, kind: string) { return page.evaluate(k => window.emoteQA.events.filter(e => e.kind === k), kind); }
async function clearEvents(page: Page) { await page.evaluate(() => { window.emoteQA.events.length = 0; }); }
async function patchSlot(page: Page, index: number, patch: Partial<Slot>) {
  await page.evaluate(({ index, patch }) => {
    const old = window.emoteQA.settings.slots;
    const next = old.map((entry, i) => i === index ? { ...entry, ...patch } : entry) as unknown as typeof old;
    window.emoteQA.configure({ slots: next });
  }, { index, patch });
}
async function frame(page: Page) {
  return wheel(page).locator('.mc-emote-wheel__frame').evaluate(node => {
    const b = node.getBoundingClientRect(), image = node instanceof HTMLImageElement ? node.currentSrc || node.src : getComputedStyle(node).backgroundImage;
    const urls = [...image.matchAll(/(?:url\(["']?)(.*?)(?:["']?\))/g)].map(m => m[1]!);
    return { x: b.x, y: b.y, width: b.width, height: b.height, url: urls[0] ?? image, urlCount: urls.length || 1 };
  });
}
async function assertFrame(page: Page, index: number | null) {
  const expected = originalFrames[index === null ? 0 : index + 1]!;
  await expect.poll(async () => (await frame(page)).url).toContain(`${expected[0]}.png`);
  const current = await frame(page);
  expect(current.urlCount).toBe(1);
  expect(await wheel(page).locator('.mc-emote-wheel__frame:visible').count()).toBe(1);
  const response = await page.request.get(current.url);
  expect(response.ok()).toBe(true); expect(digest(await response.body())).toBe(expected[1]);
}
async function pointer(page: Page, x: number, y: number, type = 'pointermove') {
  await wheel(page).dispatchEvent(type, { pointerId: 7, pointerType: 'mouse', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: y });
}

test('five original whole state PNGs retain source identities independently of component code', async () => {
  for (const [name, hash] of originalFrames) expect(digest(await readFile(new URL(`../src/assets/emote-wheel/${name}.png`, import.meta.url)))).toBe(hash);
});

test('exact four-slot source tuple validates identity and runtime ranges during SSR without loading thumbnails', async () => {
  const slots = [0, 1, 2, 3].map(index => ({ id: `slot-${index}`, label: `Slot ${index}`, preview: { kind: 'empty' as const } })) as unknown as ComponentProps<typeof EmoteWheel>['slots'];
  const props = { slots, label: 'SSR wheel', size: [256, 256] as const, scale: 1 };
  expect(renderToStaticMarkup(createElement(EmoteWheel, props))).toContain('SSR wheel');
  for (const bad of [slots.slice(0, 3), [...slots, slots[0]], [slots[0], slots[0], slots[2], slots[3]], Array(4)]) {
    expect(() => renderToStaticMarkup(createElement(EmoteWheel, { ...props, slots: bad as unknown as typeof slots }))).toThrow();
  }
  expect(() => renderToStaticMarkup(createElement(EmoteWheel, { ...props, activeIndex: 4 as 0 }))).toThrow();
  expect(() => renderToStaticMarkup(createElement(EmoteWheel, { ...props, scale: 0 }))).toThrow();
  expect(() => renderToStaticMarkup(createElement(EmoteWheel, { ...props, scale: 1.5 }))).toThrow();
});

test('default null and explicit default selection are independent of controlled accepted state', async ({ page }) => {
  await open(page, { controlled: false }); await assertFrame(page, null);
  await configure(page, { defaultActiveIndex: 2 }); await assertFrame(page, null);
  await configure(page, { show: false }); await configure(page, { show: true }); await assertFrame(page, 2);
  await configure(page, { controlled: true, activeIndex: null }); await assertFrame(page, null);
});

test('accepted cardinal states replace the whole frame rather than layering green frames over the base', async ({ page }) => {
  await open(page);
  for (const index of [null, 0, 1, 2, 3] as const) { await configure(page, { activeIndex: index }); await assertFrame(page, index); }
});

test('source square75percent and cardinal preview30percent at33percent offsets survive frame resize and scale', async ({ page }) => {
  await open(page);
  for (const [size, scale] of [[[320, 280], 1], [[160, 220], 2]] as const) {
    await configure(page, { size, scale });
    const root = await wheel(page).boundingBox(), f = await frame(page); expect(root).not.toBeNull();
    const diameter = Math.min(...size) * scale * .75;
    expect(root!.width).toBeCloseTo(size[0] * scale, 3); expect(root!.height).toBeCloseTo(size[1] * scale, 3);
    expect(f.width).toBeCloseTo(diameter, 2); expect(f.height).toBeCloseTo(diameter, 2);
    expect(f.x + f.width / 2).toBeCloseTo(root!.x + root!.width / 2, 2); expect(f.y + f.height / 2).toBeCloseTo(root!.y + root!.height / 2, 2);
    for (const [index, offset] of [[0, [0, -.33]], [1, [.33, 0]], [2, [0, .33]], [3, [-.33, 0]]] as const) {
      const box = await preview(page, index).boundingBox(); expect(box).not.toBeNull();
      expect(box!.width).toBeCloseTo(diameter * .30, 2); expect(box!.height).toBeCloseTo(diameter * .30, 2);
      // Percentage layout may round twice on Chromium's 1/64 CSS-pixel grid.
      expect(Math.abs(box!.x + box!.width / 2 - (f.x + diameter * (.5 + offset[0])))).toBeLessThanOrEqual(1 / 32);
      expect(Math.abs(box!.y + box!.height / 2 - (f.y + diameter * (.5 + offset[1])))).toBeLessThanOrEqual(1 / 32);
    }
  }
});

test('aggregate stylesheet preserves source text sizes logical shadow and hint boxes at integer scales', async ({ page }) => {
  await open(page, { activeIndex: 0, inputMode: 'keyboard' });
  expect(await wheel(page).locator('.mc-emote-wheel__hint--keyboard').allTextContents()).toEqual(['1', '2', '3', '4']);
  for (const scale of [1, 2, 3]) {
    await configure(page, { scale, size: [160, 160] });
    const center = wheel(page).locator('.mc-emote-wheel__name'), text = preview(page, 0).locator('.mc-emote-slot-preview__text');
    await expect(center).toHaveCSS('font-size', `${8 * scale}px`); await expect(center).toHaveCSS('width', `${35 * scale}px`); await expect(center).toHaveCSS('max-height', `${35 * scale}px`);
    await expect(text).toHaveCSS('font-size', `${15 * scale}px`); await expect(text).toHaveCSS('height', `${13 * scale}px`);
    for (const label of [center, text]) expect(await label.evaluate(node => getComputedStyle(node).textShadow)).toMatch(new RegExp(` ${scale}px ${scale}px 0px$`));
    const keycap = wheel(page).locator('.mc-emote-wheel__hint--keyboard').first(); await expect(keycap).toHaveCSS('width', `${17 * scale}px`); await expect(keycap).toHaveCSS('height', `${17 * scale}px`); await expect(keycap).toHaveCSS('color', 'rgb(255, 255, 255)');
    await configure(page, { inputMode: 'touch' }); const touch = wheel(page).locator('.mc-emote-wheel__hint--touch').first();
    await expect(touch).toHaveCSS('font-size', `${10 * scale}px`); await expect(touch).toHaveCSS('max-width', `${75 * scale}px`); await expect(touch).toHaveCSS('max-height', `${30 * scale}px`);
    await configure(page, { inputMode: 'keyboard' });
  }
});

test('controlled rejection preserves the accepted frame while activation targets the actual focused button', async ({ page }) => {
  await open(page, { activeIndex: 0, acceptActive: false, inputMode: 'keyboard' });
  await slot(page, 0).focus(); await clearEvents(page); await page.keyboard.press('ArrowRight');
  await expect(slot(page, 1)).toBeFocused(); await assertFrame(page, 0);
  expect(await events(page, 'active')).toContainEqual(expect.objectContaining({ value: 1, detail: expect.objectContaining({ cause: 'keyboard' }) }));
  await page.keyboard.press('Enter'); expect((await events(page, 'activate')).at(-1)).toMatchObject({ value: 1, detail: { slot: { id: 'right' } } });
  await assertFrame(page, 0); expect(await page.evaluate(() => window.emoteQA.settings.activeIndex)).toBe(0);
});

test('pointer deadzone and nearest-cardinal boundaries are an explicit Web policy without outside activation', async ({ page }) => {
  await open(page); const f = await frame(page), cx = f.x + f.width / 2, cy = f.y + f.height / 2, radius = f.width / 2;
  await pointer(page, cx, cy); await assertFrame(page, null);
  await pointer(page, cx, cy - radius * .34); await assertFrame(page, null);
  await pointer(page, cx, cy - radius * .36); await assertFrame(page, 0);
  for (const [angle, expected] of [[44, 0], [46, 1], [134, 1], [136, 2], [224, 2], [226, 3], [314, 3], [316, 0]] as const) {
    const a = angle * Math.PI / 180; await pointer(page, cx + Math.sin(a) * radius * .7, cy - Math.cos(a) * radius * .7); await assertFrame(page, expected);
  }
  await clearEvents(page); await pointer(page, cx + radius * 1.01, cy); await pointer(page, cx + radius * 1.01, cy, 'pointerup');
  await assertFrame(page, null); expect(await events(page, 'activate')).toHaveLength(0);
});

test('real pointer release activates cardinal hits and center deadzone never activates', async ({ page }) => {
  await open(page); const f = await frame(page), cx = f.x + f.width / 2, cy = f.y + f.height / 2;
  await page.mouse.click(cx + f.width * .33, cy); expect((await events(page, 'activate')).at(-1)).toMatchObject({ value: 1 });
  await clearEvents(page); await page.mouse.click(cx, cy); expect(await events(page, 'activate')).toHaveLength(0);
  await assertFrame(page, null); await clearEvents(page);
  await page.mouse.click(cx + f.width * .48, cy - f.height * .48);
  expect(await events(page, 'activate')).toHaveLength(0); expect(await events(page, 'active')).toHaveLength(0); await assertFrame(page, null);
});

test('real touch drag selects the release cardinal once without scrolling the document', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'The mobile project supplies a real touch-enabled browser context.');
  await open(page, { inputMode: 'touch' }); const f = await frame(page), cx = f.x + f.width / 2, cy = f.y + f.height / 2;
  const before = await page.evaluate(() => scrollY), session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy - f.width * .33, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + f.width * .33, y: cy, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx, y: cy + f.width * .33, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => events(page, 'activate')).toHaveLength(1);
    expect((await events(page, 'activate'))[0]).toMatchObject({ value: 2 }); await assertFrame(page, 2); expect(await page.evaluate(() => scrollY)).toBe(before);
  } finally { await session.detach(); }
});

test('empty content can request activation while per-slot and whole-wheel disabled behavior stays inert', async ({ page }) => {
  await open(page, { inputMode: 'keyboard' }); await wheel(page).focus(); await page.keyboard.press('4');
  expect((await events(page, 'activate')).at(-1)).toMatchObject({ value: 3, detail: { slot: { id: 'left', preview: { kind: 'empty' } } } });
  await patchSlot(page, 1, { disabled: true }); await expect(slot(page, 1)).toBeDisabled(); await clearEvents(page); await wheel(page).focus(); await page.keyboard.press('2'); expect(await events(page, 'activate')).toHaveLength(0);
  await configure(page, { disabled: true }); await clearEvents(page); await wheel(page).press('1');
  expect(await events(page, 'active')).toHaveLength(0); expect(await events(page, 'activate')).toHaveLength(0);
  for (const index of [0, 1, 2, 3]) await expect(slot(page, index)).toBeDisabled();
});

test('number keys activate once, arrows select absolute cardinals, and Enter or Space keeps native button focus semantics', async ({ page }) => {
  await open(page, { inputMode: 'keyboard' }); await wheel(page).focus();
  for (const [key, index] of [['1', 0], ['2', 1], ['3', 2], ['4', 3]] as const) { await clearEvents(page); await page.keyboard.press(key); expect(await events(page, 'activate')).toHaveLength(1); expect((await events(page, 'activate'))[0]).toMatchObject({ value: index }); }
  for (const [key, index] of [['ArrowUp', 0], ['ArrowRight', 1], ['ArrowDown', 2], ['ArrowLeft', 3]] as const) { await clearEvents(page); await page.keyboard.press(key); await expect(slot(page, index)).toBeFocused(); await assertFrame(page, index); expect(await events(page, 'activate')).toHaveLength(0); }
  for (const key of ['Enter', 'Space']) { await clearEvents(page); await page.keyboard.press(key); expect(await events(page, 'activate')).toHaveLength(1); expect((await events(page, 'activate'))[0]).toMatchObject({ value: 3 }); }
  await clearEvents(page); await page.keyboard.down('1'); await page.keyboard.down('1'); await page.keyboard.up('1'); expect(await events(page, 'activate')).toHaveLength(1);
});

test('Escape requests clear and cancel once without moving outside focus or overriding controlled rejection', async ({ page }) => {
  await open(page, { activeIndex: 2, acceptActive: false }); await slot(page, 2).focus(); await clearEvents(page); await page.keyboard.press('Escape');
  expect(await events(page, 'cancel')).toHaveLength(1); expect((await events(page, 'active')).at(-1)).toMatchObject({ value: null }); await assertFrame(page, 2); await expect(slot(page, 2)).toBeFocused();
});

test('caller event handlers can prevent internal keyboard and pointer work', async ({ page }) => {
  await open(page, { preventKeys: ['1', 'Escape'], preventPointer: true }); await wheel(page).focus(); await page.keyboard.press('1'); await page.keyboard.press('Escape');
  expect(await events(page, 'activate')).toHaveLength(0); expect(await events(page, 'cancel')).toHaveLength(0);
  expect((await events(page, 'caller-key')).map(e => e.value)).toContain('1');
  const f = await frame(page); await pointer(page, f.x + f.width * .83, f.y + f.height * .5); await assertFrame(page, null);
  await slot(page, 1).evaluate(node => (node as HTMLButtonElement).click()); expect(await events(page, 'activate')).toHaveLength(0);
});

test('caller pointerup prevention cancels activation after an otherwise valid radial gesture', async ({ page }) => {
  await open(page, { preventPointerUp: true }); const f = await frame(page);
  await page.mouse.click(f.x + f.width * .83, f.y + f.height * .5);
  await assertFrame(page, 1); expect(await events(page, 'activate')).toHaveLength(0);
});

test('native root and indexed button refs remain stable through rerender and clean up on unmount', async ({ page }) => {
  await open(page, {}, true);
  const before = await wheel(page).evaluate(node => { (window as unknown as { savedWheel: Element }).savedWheel = node; return window.emoteQA.ref === node; }); expect(before).toBe(true);
  for (const index of [0, 1, 2, 3] as const) expect(await slot(page, index).evaluate((node, i) => window.emoteQA.buttonRefs[i as 0] === node, index)).toBe(true);
  await configure(page, { activeIndex: 2, inputMode: 'touch' }); expect(await wheel(page).evaluate(node => node === (window as unknown as { savedWheel: Element }).savedWheel)).toBe(true);
  await page.evaluate(() => window.emoteQA.ref?.focus()); await expect(wheel(page)).toBeFocused(); await page.evaluate(() => window.emoteQA.unmount());
  expect(await page.evaluate(() => window.emoteQA.ref)).toBeNull(); expect(await page.evaluate(() => Object.values(window.emoteQA.buttonRefs).every(ref => ref === null))).toBe(true);
});

test('one enabled native slot participates in roving Tab order and arrow selection updates that stop', async ({ page }) => {
  await open(page, { inputMode: 'keyboard' });
  await expect(slot(page, 0)).toHaveAttribute('tabindex', '0'); for (const i of [1, 2, 3]) await expect(slot(page, i)).toHaveAttribute('tabindex', '-1');
  await page.locator('#emote-before').focus(); await page.keyboard.press('Tab'); await expect(slot(page, 0)).toBeFocused();
  await page.keyboard.press('ArrowRight'); await expect(slot(page, 1)).toBeFocused(); await expect(slot(page, 1)).toHaveAttribute('tabindex', '0'); await expect(slot(page, 0)).toHaveAttribute('tabindex', '-1');
  await page.keyboard.press('Tab'); await expect(page.locator('#emote-after')).toBeFocused(); await page.keyboard.press('Shift+Tab'); await expect(slot(page, 1)).toBeFocused();
  await patchSlot(page, 1, { disabled: true }); await expect(slot(page, 1)).toBeDisabled(); await expect(slot(page, 0)).toHaveAttribute('tabindex', '0');
});

test('forced colors replaces decorative art with visible system labels and preserves selected focus and disabled semantics', async ({ page }) => {
  await open(page, { activeIndex: 1, inputMode: 'keyboard' }); await patchSlot(page, 2, { disabled: true });
  await page.emulateMedia({ forcedColors: 'active' }); await wheel(page).focus(); await page.keyboard.press('ArrowRight');
  await expect(wheel(page).locator('.mc-emote-wheel__frame')).toBeHidden();
  for (const i of [0, 1, 2, 3]) await expect(preview(page, i).locator('.mc-emote-slot-preview__system-label')).toBeVisible();
  await expect(slot(page, 1)).toHaveAttribute('aria-pressed', 'true'); await expect(slot(page, 1)).toBeFocused(); await expect(slot(page, 2)).toBeDisabled();
  const expectedHighlight = await page.evaluate(() => { const probe = document.createElement('span'); probe.style.color = 'Highlight'; document.body.append(probe); const color = getComputedStyle(probe).color; probe.remove(); return color; });
  const selected = slot(page, 1).locator('.mc-emote-wheel__preview');
  await expect(selected).toHaveCSS('border-top-style', 'solid'); await expect(selected).toHaveCSS('border-top-width', '2px'); await expect(selected).toHaveCSS('border-top-color', expectedHighlight);
  await expect(selected).toHaveCSS('outline-style', 'solid'); await expect(selected).toHaveCSS('outline-color', expectedHighlight);
});

test('failed thumbnail hides only the broken image, keeps geometry, and host text fallback remains explicit', async ({ page }) => {
  await page.route('**/qa-emote-broken.png', route => route.fulfill({ status: 404, body: '' }));
  await open(page); const initial = await preview(page, 0).boundingBox();
  await patchSlot(page, 0, { preview: { kind: 'image', src: '/qa-emote-broken.png' } });
  await expect(preview(page, 0)).toHaveAttribute('data-preview-kind', 'image'); await expect(preview(page, 0).locator('img')).not.toBeVisible();
  const after = await preview(page, 0).boundingBox(); expect(after!.width).toBeCloseTo(initial!.width, 3); expect(after!.height).toBeCloseTo(initial!.height, 3);
  await patchSlot(page, 0, { preview: { kind: 'text', text: 'Caller index fallback' } }); await expect(preview(page, 0)).toContainText('Caller index fallback');
  await expect(preview(page, 0)).toHaveAttribute('data-preview-kind', 'text');
});

test('old thumbnail failure cannot hide a newer successful source on the stable preview node', async ({ page }) => {
  let releaseOld!: () => void;
  const oldGate = new Promise<void>(resolve => { releaseOld = resolve; }); let oldRequested = false;
  const image = await readFile(new URL('../src/assets/emote-wheel/emote_wheel_updated_base.png', import.meta.url));
  await page.route('**/qa-emote-old.png', async route => { oldRequested = true; await oldGate; await route.fulfill({ status: 404, body: '' }).catch(() => {}); });
  await page.route('**/qa-emote-new.png', route => route.fulfill({ status: 200, contentType: 'image/png', body: image }));
  await open(page); await preview(page, 0).evaluate(node => { (window as unknown as { savedPreview: Element }).savedPreview = node; });
  try {
    await patchSlot(page, 0, { preview: { kind: 'image', src: '/qa-emote-old.png' } }); await expect.poll(() => oldRequested).toBe(true);
    await patchSlot(page, 0, { preview: { kind: 'image', src: '/qa-emote-new.png' } }); await expect(preview(page, 0).locator('img')).toBeVisible();
    await expect.poll(() => preview(page, 0).locator('img').evaluate(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth)).toBe(143);
    releaseOld(); await page.waitForLoadState('networkidle'); await expect(preview(page, 0).locator('img')).toBeVisible();
    expect(await preview(page, 0).evaluate(node => node === (window as unknown as { savedPreview: Element }).savedPreview)).toBe(true);
  } finally { releaseOld(); }
});

test('hint families follow explicit keyboard touch gamepad modes and caller glyphs', async ({ page }) => {
  const keyboard = ['K0', 'K1', 'K2', 'K3'] as const, faces = ['Host up', 'Host right', 'Host down', 'Host left'] as const;
  await open(page, { inputMode: 'keyboard', hints: { keyboard, gamepad: { mode: 'quick', faces } } });
  for (const value of keyboard) await expect(wheel(page).getByText(value, { exact: true })).toBeVisible();
  for (const value of faces) await expect(wheel(page).getByText(value, { exact: true })).not.toBeVisible();
  await configure(page, { hints: { keyboard: false, gamepad: { mode: 'quick', faces } } }); await expect(wheel(page).locator('.mc-emote-wheel__hint--keyboard')).toHaveCount(0);
  await configure(page, { inputMode: 'gamepad' }); for (const value of faces) await expect(wheel(page).getByText(value, { exact: true })).toBeVisible();
  for (const value of keyboard) await expect(wheel(page).getByText(value, { exact: true })).not.toBeVisible();
  await configure(page, { hints: { keyboard: false, gamepad: { mode: 'analog', select: 'Caller select glyph' } } });
  await expect(wheel(page).getByText('Caller select glyph', { exact: true })).toBeVisible();
  for (const value of faces) await expect(wheel(page).getByText(value, { exact: true })).not.toBeVisible();
  await configure(page, { inputMode: 'touch' }); await expect(wheel(page).locator('.mc-emote-wheel__hint--touch')).toHaveCount(4); await expect(wheel(page).locator('.mc-emote-wheel__hint--gamepad')).toHaveCount(0);
  await configure(page, { inputMode: 'pointer', hints: { keyboard: false, gamepad: false } });
  await expect(wheel(page).getByText('Caller select glyph', { exact: true })).not.toBeVisible();
});
