import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SignEditor, SignTextSurface } from '../src/sign';
import type { SignFixtureSettings } from '../demo/sign-fixture';

async function configure(page: Page, patch: Partial<SignFixtureSettings>) {
  await page.evaluate(value => window.signQA.configure(value), patch);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
async function openFixture(page: Page, patch: Partial<SignFixtureSettings> = {}, strict = false) {
  await page.goto(`/demo/sign-fixture.html${strict ? '?strict' : ''}`);
  await expect.poll(() => page.evaluate(() => window.signQA?.mounted)).toBe(true);
  await configure(page, { value: 'QA sign', open: false, ...patch });
}
const surface = (page: Page) => page.locator('#sign-surface-host');
const surfaceInput = (page: Page) => surface(page).locator('textarea');
const dialog = (page: Page) => page.locator('dialog.mc-sign-editor');
const modalInput = (page: Page) => dialog(page).locator('textarea');
async function clearEvents(page: Page) { await page.evaluate(() => { window.signQA.events.length = 0; }); }
async function events(page: Page, kinds: string[]) { return page.evaluate(selected => window.signQA.events.filter(event => selected.includes(event.kind)), kinds); }
async function openModal(page: Page) {
  await page.locator('#open-editor').click(); await expect(dialog(page)).toBeVisible();
}
async function outside(page: Page) {
  await dialog(page).click({ position: { x: 3, y: 3 } });
}

test('surface edits a real textarea with selection, Enter newline, stable node and refs', async ({ page }) => {
  await openFixture(page, { value: 'Alpha beta' });
  const input = surfaceInput(page);
  await expect(input).toHaveAttribute('maxlength', '32500');
  await expect(input).toHaveAttribute('spellcheck', 'false');
  await input.evaluate(node => { (window as unknown as { savedSignInput: Node }).savedSignInput = node; (node as HTMLTextAreaElement).setSelectionRange(6, 10); });
  await input.focus(); await input.pressSequentially('QA');
  await expect(input).toHaveValue('Alpha QA');
  expect(await input.evaluate(node => [(node as HTMLTextAreaElement).selectionStart, (node as HTMLTextAreaElement).selectionEnd])).toEqual([8, 8]);
  await input.press('Enter'); await input.pressSequentially('Next line');
  await expect(input).toHaveValue('Alpha QA\nNext line');
  expect(await input.evaluate(node => ({ same: node === (window as unknown as { savedSignInput: Node }).savedSignInput, ref: node === window.signQA.refs.textarea, root: node.closest('.mc-sign-surface') === window.signQA.refs.surface, native: node.tagName })))
    .toEqual({ same: true, ref: true, root: true, native: 'TEXTAREA' });
  expect(await events(page, ['close-request', 'commit', 'cancel', 'open-change'])).toEqual([]);
});

test('controlled rejection and accepted external value preserve the input while uncontrolled editing works', async ({ page }) => {
  await openFixture(page, { acceptance: 'reject', value: 'Accepted' });
  const input = surfaceInput(page);
  await input.evaluate(node => { (window as unknown as { controlledSignNode: Node }).controlledSignNode = node; });
  await input.fill('Rejected'); await expect(input).toHaveValue('Accepted');
  await configure(page, { value: 'External accepted' });
  await expect(input).toHaveValue('External accepted');
  expect(await input.evaluate(node => node === (window as unknown as { controlledSignNode: Node }).controlledSignNode)).toBe(true);
  await configure(page, { showSurface: false, controlled: false, value: 'Uncontrolled seed', acceptance: 'accept' });
  await configure(page, { showSurface: true });
  await surfaceInput(page).fill('Uncontrolled accepted');
  await expect(surfaceInput(page)).toHaveValue('Uncontrolled accepted');
});

test('surface composition handlers, supplied native properties and controlled transform retain native editing', async ({ page }) => {
  await openFixture(page, { value: 'abc', acceptance: 'uppercase', stopCompositionPropagation: true });
  const input = surfaceInput(page);
  await input.focus(); await input.press('End');
  await input.dispatchEvent('compositionstart', { data: '' });
  await input.dispatchEvent('compositionupdate', { data: '牌' });
  await input.press('ArrowLeft'); await input.press('ArrowRight');
  await input.dispatchEvent('compositionend', { data: '牌' });
  await input.pressSequentially('x'); await expect(input).toHaveValue('ABCX');
  expect(await events(page, ['composition-start', 'composition-end'])).toHaveLength(2);
  await expect(input).toBeFocused();
  expect(await input.evaluate(node => node === window.signQA.refs.textarea)).toBe(true);
});

test('readOnly, disabled and caller maxLength retain native selectable/input constraints', async ({ page }) => {
  await openFixture(page, { value: 'Fixed sign', readOnly: true });
  const input = surfaceInput(page);
  await expect(input).toHaveAttribute('readonly'); await expect(input).toBeEnabled();
  await input.focus(); await input.press('End'); await input.pressSequentially('x');
  await expect(input).toHaveValue('Fixed sign');
  await configure(page, { readOnly: false, disabled: true });
  await expect(input).toBeDisabled();
  await configure(page, { disabled: false, maxLength: 5, value: '' });
  await input.focus(); await input.pressSequentially('1234567');
  await expect(input).toHaveValue('12345');
  await configure(page, { disabled: true }); await openModal(page);
  await expect(modalInput(page)).toBeDisabled(); await expect(dialog(page)).toBeFocused();
  await page.keyboard.press('Escape'); await expect(dialog(page)).not.toBeVisible();
});

test('native modal owns focus, makes background inert, locks scrolling and restores the opener', async ({ page }) => {
  await openFixture(page);
  const original = await page.evaluate(() => ({ body: document.body.style.cssText, html: document.documentElement.style.cssText }));
  await page.evaluate(() => window.scrollTo(0, 120));
  await openModal(page); await expect(modalInput(page)).toBeFocused();
  await expect(dialog(page)).toHaveAccessibleName(/\S/);
  const heldScroll = await page.evaluate(() => scrollY);
  await page.locator('#focus-sink').evaluate(node => (node as HTMLElement).focus());
  await expect(page.locator('#focus-sink')).not.toBeFocused();
  await modalInput(page).press('Tab'); await expect(modalInput(page)).toBeFocused();
  await modalInput(page).press('Shift+Tab'); await expect(modalInput(page)).toBeFocused();
  await configure(page, { closeOnOutside: false });
  await page.mouse.move(3, 3); await page.mouse.wheel(0, 700);
  expect(await page.evaluate(() => scrollY)).toBe(heldScroll);
  await outside(page); await expect(dialog(page)).toBeVisible();
  expect(await events(page, ['background-click'])).toEqual([]);
  await page.keyboard.press('Escape'); await expect(dialog(page)).not.toBeVisible();
  await expect(page.locator('#open-editor')).toBeFocused();
  expect(await page.evaluate(() => ({ body: document.body.style.cssText, html: document.documentElement.style.cssText }))).toEqual(original);
});

test('close callback veto, controlled open rejection and disabled outside exit keep the same modal/input', async ({ page }) => {
  await openFixture(page, { rejectClose: true }); await openModal(page);
  await modalInput(page).evaluate(node => { (window as unknown as { heldModalSign: Node }).heldModalSign = node; });
  await page.keyboard.press('Escape'); await expect(dialog(page)).toBeVisible();
  await expect(modalInput(page)).toBeFocused();
  expect(await events(page, ['open-change'])).toEqual([]);
  await configure(page, { rejectClose: false, rejectOpenChange: true });
  await page.keyboard.press('Escape'); await expect(dialog(page)).toBeVisible();
  await expect(modalInput(page)).toBeFocused();
  expect(await modalInput(page).evaluate(node => node === (window as unknown as { heldModalSign: Node }).heldModalSign)).toBe(true);
  await configure(page, { rejectOpenChange: false, closeOnOutside: false });
  await clearEvents(page); await outside(page); await expect(dialog(page)).toBeVisible();
  expect(await events(page, ['close-request', 'open-change'])).toEqual([]);
  await page.keyboard.press('Escape'); await expect(dialog(page)).not.toBeVisible();
  await configure(page, { asyncClose: true }); await openModal(page); await clearEvents(page);
  await page.keyboard.press('Escape'); await expect(dialog(page)).toBeVisible();
  expect(await page.evaluate(() => window.signQA.pendingClose?.detail)).toEqual({ reason: 'escape' });
  await page.evaluate(() => window.signQA.resolveClose(false)); await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.signQA.resolveClose(true)); await expect(dialog(page)).not.toBeVisible();
});

test('request, commit and cancel exit policies dispatch one accepted snapshot per actual exit', async ({ page }) => {
  await openFixture(page, { value: 'Accepted text', acceptance: 'reject' });
  for (const policy of ['request', 'commit', 'cancel'] as const) {
    await configure(page, { exitBehavior: policy }); await openModal(page);
    await modalInput(page).fill('Rejected temporary text'); await expect(modalInput(page)).toHaveValue('Accepted text');
    if (policy !== 'request') {
      await configure(page, { rejectCommit: policy === 'commit', rejectCancel: policy === 'cancel' });
      await clearEvents(page); await page.keyboard.press('Escape'); await expect(dialog(page)).toBeVisible();
      expect((await events(page, ['close-request', 'commit', 'cancel', 'open-change'])).map(event => event.kind)).toEqual(['close-request', policy]);
      await configure(page, { rejectCommit: false, rejectCancel: false });
    }
    await clearEvents(page); await page.keyboard.press('Escape');
    await expect(dialog(page)).not.toBeVisible();
    const received = await events(page, ['close-request', 'commit', 'cancel', 'open-change']);
    expect(received.map(event => event.kind)).toEqual(policy === 'request' ? ['close-request', 'open-change'] : ['close-request', policy, 'open-change']);
    for (const event of received) {
      expect(event.detail).toEqual({ reason: 'escape' });
      if (event.kind !== 'open-change') expect(event.value).toBe('Accepted text');
      else expect(event.value).toBe(false);
    }
  }
});

test('composition and defaultPrevented Escape block user exits while external close stays host-controlled', async ({ page }) => {
  await openFixture(page, { stopCompositionPropagation: true, preventEscape: true }); await openModal(page);
  const input = modalInput(page); await input.press('Escape');
  await expect(dialog(page)).toBeVisible(); expect(await events(page, ['close-request'])).toEqual([]);
  await configure(page, { preventEscape: false });
  await input.dispatchEvent('compositionstart', { data: '' });
  await input.press('Escape'); await outside(page); await expect(dialog(page)).toBeVisible();
  expect(await events(page, ['close-request', 'commit', 'cancel'])).toEqual([]);
  await input.dispatchEvent('compositionend', { data: '书' });
  await input.press('Escape'); await expect(dialog(page)).not.toBeVisible();
  await openModal(page); await modalInput(page).dispatchEvent('compositionstart'); await clearEvents(page);
  await configure(page, { open: false }); await expect(dialog(page)).not.toBeVisible();
  expect(await events(page, ['close-request', 'commit', 'cancel', 'open-change'])).toEqual([]);
});

test('Enter only inserts a newline, live props preserve the input and reopening retains accepted content', async ({ page }) => {
  await openFixture(page, { value: 'Line one' }); await openModal(page);
  const input = modalInput(page);
  await input.evaluate(node => { (window as unknown as { reopenSignNode: Node }).reopenSignNode = node; });
  await input.press('End'); await input.press('Enter'); await input.pressSequentially('Line two');
  await expect(input).toHaveValue('Line one\nLine two');
  await configure(page, { variant: 'hanging' });
  expect(await modalInput(page).evaluate(node => node === (window as unknown as { reopenSignNode: Node }).reopenSignNode)).toBe(true);
  expect(await events(page, ['close-request', 'commit', 'cancel'])).toEqual([]);
  await input.press('Escape'); await expect(dialog(page)).not.toBeVisible();
  await openModal(page); await expect(modalInput(page)).toHaveValue('Line one\nLine two');
  expect(await modalInput(page).evaluate(node => node === window.signQA.refs.editorTextarea)).toBe(true);
});

test('outside exit requires an outside-started gesture and reports only the outside reason', async ({ page }) => {
  await openFixture(page); await openModal(page); await clearEvents(page);
  const input = modalInput(page), position = await input.boundingBox(); if (!position) throw new Error('Missing sign input');
  await page.mouse.move(position.x + position.width / 2, position.y + position.height / 2);
  await page.mouse.down(); await page.mouse.move(3, 3); await page.mouse.up();
  await expect(dialog(page)).toBeVisible(); expect(await events(page, ['close-request'])).toEqual([]);
  await outside(page); await expect(dialog(page)).not.toBeVisible();
  const requests = await events(page, ['close-request']); expect(requests).toHaveLength(1); expect(requests[0]?.detail).toEqual({ reason: 'outside' });
});

test('uncontrolled modal and StrictMode unmount restore exact caller styles and native refs', async ({ page }) => {
  await openFixture(page, {}, true);
  const original = await page.evaluate(() => { document.body.style.overflow = 'scroll'; return { body: document.body.style.cssText, html: document.documentElement.style.cssText }; });
  await configure(page, { showEditor: false, controlledOpen: false, open: true });
  await configure(page, { showEditor: true }); await expect(dialog(page)).toBeVisible();
  expect(await dialog(page).evaluate(node => node === window.signQA.refs.dialog)).toBe(true);
  expect(await modalInput(page).evaluate(node => node.closest('.mc-sign-surface') === window.signQA.refs.editor)).toBe(true);
  await page.keyboard.press('Escape'); await expect(dialog(page)).not.toBeVisible();
  expect(await page.evaluate(() => ({ body: document.body.style.cssText, html: document.documentElement.style.cssText }))).toEqual(original);
  await configure(page, { showEditor: false, open: true }); await configure(page, { showEditor: true }); await expect(dialog(page)).toBeVisible();
  await configure(page, { genericOpen: true });
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');
  await configure(page, { showEditor: false });
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');
  await configure(page, { genericOpen: false });
  expect(await page.evaluate(() => ({ body: document.body.style.cssText, html: document.documentElement.style.cssText }))).toEqual(original);
  await configure(page, { showEditor: true }); await expect(dialog(page)).toBeVisible();
  await page.evaluate(() => window.signQA.unmount());
  expect(await page.evaluate(() => ({ body: document.body.style.cssText, html: document.documentElement.style.cssText }))).toEqual(original);
  expect(await page.evaluate(() => [window.signQA.refs.surface, window.signQA.refs.editor, window.signQA.refs.textarea, window.signQA.refs.editorTextarea, window.signQA.refs.dialog])).toEqual([null, null, null, null, null]);
});

test('SSR is warning/IO-free and native surface props do not leak configuration attributes', () => {
  const originalFetch = globalThis.fetch, originalError = console.error; let fetches = 0; const warnings: unknown[][] = [];
  globalThis.fetch = (() => { fetches++; throw new Error('Unexpected SSR fetch'); }) as typeof fetch;
  console.error = (...values: unknown[]) => warnings.push(values);
  try {
    const markup = renderToStaticMarkup(createElement(SignTextSurface, { value: 'Plain accepted sign', readOnly: true, label: 'SSR sign', variant: 'hanging', textColor: '#123456' }));
    expect(markup).toContain('Plain accepted sign'); expect(markup).toContain('<textarea'); expect(markup).toMatch(/\sreadonly(?:=|\s|>)/i);
    for (const text of ['[object Object]', 'NaN', 'textColor=', 'sourceSize=', 'exitBehavior=']) expect(markup).not.toContain(text);
    renderToStaticMarkup(createElement(SignEditor, { open: true, value: 'Server modal' }));
    expect(fetches).toBe(0); expect(warnings).toEqual([]);
  } finally { globalThis.fetch = originalFetch; console.error = originalError; }
});
