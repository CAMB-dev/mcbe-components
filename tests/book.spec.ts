import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createElement, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BookEditor, BookPage, BookPageTurnButton, BookReader } from '../src/book';
import type { BookQASettings } from '../demo/book-fixture';

async function open(page: Page, patch: Partial<BookQASettings> = {}, strict = false) {
  await page.goto(`/demo/book-fixture.html${strict ? '?strict' : ''}`);
  await expect.poll(() => page.evaluate(() => window.bookQA?.mounted)).toBe(true);
  await configure(page, patch);
}
async function configure(page: Page, patch: Partial<BookQASettings>) {
  await page.evaluate(value => window.bookQA.configure(value), patch);
}
const editor = (page: Page) => page.locator('#primary .mc-book');
const action = (page: Page, name: string) => editor(page).locator(`[data-book-action="${name}"]`);
const turn = (page: Page, direction: string, parent = '#primary') => page.locator(`${parent} .mc-book__turn[data-direction="${direction}"]`);

test('reader first/last spread and odd blank use real leaf boundaries', async ({ page }) => {
  await open(page);
  const reader = page.locator('#secondary .mc-book');
  await expect(reader.locator('.mc-book__page-text')).toHaveText(['Reader one', 'Reader two']);
  await expect(turn(page, 'previous', '#secondary')).toHaveAttribute('data-available', 'false');
  await turn(page, 'next', '#secondary').click();
  await expect(reader).toHaveAttribute('data-spread-index', '1');
  await expect(reader.locator('.mc-book__page-text')).toHaveText(['Reader three']);
  const blank = reader.locator('.mc-book__page[data-side="right"]');
  await expect(blank).toHaveAttribute('data-blank', 'true');
  await expect(blank.locator('textarea, .mc-book__page-number')).toHaveCount(0);
  await expect(turn(page, 'next', '#secondary')).toHaveAttribute('data-available', 'false');
  await turn(page, 'previous', '#secondary').click();
  await expect(reader).toHaveAttribute('data-spread-index', '0');
});

test('empty editor creates the first leaf only from actual textarea input', async ({ page }) => {
  await open(page, { pages: [], readerPages: [], acceptance: 'reject' });
  await expect(editor(page).locator('textarea')).toHaveCount(1);
  await expect(page.locator('#secondary textarea')).toHaveCount(0);
  await editor(page).getByRole('textbox').fill('Rejected first page');
  await expect(editor(page).getByRole('textbox')).toHaveValue('');
  await editor(page).getByRole('textbox').evaluate(node => { (window as unknown as { emptyLeaf: Node }).emptyLeaf = node; window.bookQA.events.length = 0; });
  await configure(page, { acceptance: 'accept' });
  await editor(page).getByRole('textbox').fill('First actual page');
  await expect(editor(page).getByRole('textbox')).toHaveValue('First actual page');
  expect(await editor(page).getByRole('textbox').evaluate(node => node === (window as unknown as { emptyLeaf: Node }).emptyLeaf)).toBe(true);
  expect(await page.evaluate(() => window.bookQA.events.filter(event => event.kind === 'pages'))).toEqual([
    { kind: 'pages', value: ['First actual page'], detail: { reason: 'create-first-page', pageIndex: 0, eventType: 'change' } },
  ]);
  await expect(editor(page).locator('.mc-book__page[data-side="right"]')).toHaveAttribute('data-blank', 'true');
});

test('controlled pages/navigation rejection and shortening preserve accepted state', async ({ page }) => {
  await open(page, { acceptance: 'reject', rejectNavigation: true });
  const input = editor(page).getByRole('textbox', { name: 'Leaf 1', exact: true });
  await expect(input).toHaveAttribute('spellcheck', 'false');
  await input.fill('Rejected');
  await expect(input).toHaveValue('Leaf one');
  await turn(page, 'next').click();
  await expect(editor(page)).toHaveAttribute('data-spread-index', '0');
  await configure(page, { acceptance: 'accept', rejectNavigation: false, spreadIndex: 2 });
  await expect(editor(page).getByRole('textbox', { name: 'Leaf 5', exact: true })).toHaveValue('Leaf five');
  await configure(page, { pages: ['Only accepted leaf'] });
  await expect(editor(page)).toHaveAttribute('data-spread-index', '0');
  await expect(editor(page).getByRole('textbox')).toHaveValue('Only accepted leaf');
  await expect(turn(page, 'next')).toHaveAttribute('data-available', 'false');
});

test('native textarea editing keeps node, selection, refs and composition handlers', async ({ page }) => {
  await open(page);
  const input = editor(page).getByRole('textbox', { name: 'Leaf 1', exact: true });
  await input.evaluate(node => { (window as unknown as { savedBookInput: Node }).savedBookInput = node; (node as HTMLTextAreaElement).setSelectionRange(5, 8); });
  await input.focus();
  await input.pressSequentially('QA');
  await expect(input).toHaveValue('Leaf QA');
  expect(await input.evaluate(node => [(node as HTMLTextAreaElement).selectionStart, (node as HTMLTextAreaElement).selectionEnd])).toEqual([7, 7]);
  await input.dispatchEvent('compositionstart', { data: '' });
  await input.dispatchEvent('compositionupdate', { data: '书' });
  await input.press('ArrowRight');
  await expect(editor(page)).toHaveAttribute('data-spread-index', '0');
  await input.dispatchEvent('compositionend', { data: '书' });
  const state = await input.evaluate(node => ({ same: node === (window as unknown as { savedBookInput: Node }).savedBookInput, ref: window.bookQA.refs.textareas.get(0) === node, tag: node.tagName, max: (node as HTMLTextAreaElement).maxLength }));
  expect(state).toEqual({ same: true, ref: true, tag: 'TEXTAREA', max: 64 });
  expect(await page.evaluate(() => window.bookQA.events.filter(event => event.kind.startsWith('composition')).map(event => event.kind))).toEqual(['composition-start', 'composition-end']);
  await configure(page, { pages: ['Accepted replacement', 'Leaf two'] });
  await expect(input).toHaveValue('Accepted replacement');
  expect(await input.evaluate(node => node === (window as unknown as { savedBookInput: Node }).savedBookInput)).toBe(true);
  // A controlled host can remove the composing leaf. The held input must not
  // revive leaf2 or synthesize sparse pages when it receives another input.
  for (const shortened of [[], ['kept']]) {
    await configure(page, { pages: ['One', 'Two', 'Composing three', 'Four'], spreadIndex: 1 });
    const composing = editor(page).getByRole('textbox', { name: 'Leaf 3', exact: true });
    await composing.focus(); await composing.dispatchEvent('compositionstart', { data: '' });
    await configure(page, { pages: shortened });
    await expect(page.locator('main')).toHaveAttribute('data-pages', JSON.stringify(shortened));
    await page.evaluate(() => { window.bookQA.events.length = 0; });
    await composing.fill('must not resurrect removed leaf');
    expect(await page.evaluate(() => window.bookQA.events.filter(event => event.kind === 'pages'))).toEqual([]);
    await composing.dispatchEvent('compositionend', { data: '书' });
    await expect(editor(page)).toHaveAttribute('data-spread-index', '0');
    await expect(editor(page).getByRole('textbox')).toHaveValue(shortened[0] ?? '');
    await action(page, 'close').click();
    expect(await page.evaluate(() => window.bookQA.finishes.at(-1)?.pages)).toEqual(shortened);
  }
});

test('readOnly and disabled retain native semantics and guard editing/sign requests', async ({ page }) => {
  await open(page, { readOnly: true });
  await expect(action(page, 'sign-open')).toHaveCount(0);
  expect(await editor(page).locator('textarea').count()).toBe(0);
  await configure(page, { readOnly: false, disabled: true });
  await expect(editor(page).getByRole('textbox', { name: 'Leaf 1', exact: true })).toBeDisabled();
  await expect(turn(page, 'next')).toBeDisabled();
  await expect(action(page, 'sign-open')).toBeDisabled();
  expect(await page.evaluate(() => window.bookQA.events)).toEqual([]);
});

test('sign open/cancel/rejected title and finalize use accepted snapshot only', async ({ page }) => {
  await open(page, { rejectMode: true });
  await action(page, 'sign-open').click();
  await expect(editor(page)).toHaveAttribute('data-mode', 'pages');
  await expect(action(page, 'sign-open')).toBeFocused();
  await configure(page, { rejectMode: false });
  await action(page, 'sign-open').click();
  await expect(editor(page)).toHaveAttribute('data-mode', 'signing');
  const title = editor(page).locator('input').first();
  await expect(title).toBeFocused();
  expect(await title.evaluate(node => node === window.bookQA.refs.title)).toBe(true);
  await title.focus(); await title.dispatchEvent('compositionstart', { data: '' });
  await expect(editor(page)).toHaveAttribute('data-mode', 'signing'); await expect(title).toBeVisible();
  await expect(action(page, 'finalize')).toBeDisabled();
  await title.dispatchEvent('compositionend', { data: '书' });
  await expect(title).toBeFocused();
  await configure(page, { acceptance: 'reject' });
  await title.fill('Rejected title');
  await expect(title).toHaveValue('QA journal');
  await editor(page).locator('.mc-book__author input').fill('Rejected author');
  await expect(editor(page).locator('.mc-book__author input')).toHaveValue('Alex');
  expect(await editor(page).locator('.mc-book__author input').evaluate(node => node === window.bookQA.refs.author)).toBe(true);
  await action(page, 'finalize').click();
  expect(await page.evaluate(() => window.bookQA.signs)).toEqual([{ pages: ['Leaf one', 'Leaf two', 'Leaf three', 'Leaf four', 'Leaf five'], title: 'QA journal', author: 'Alex', spreadIndex: 0, mode: 'signing' }]);
  await action(page, 'sign-cancel').click();
  await expect(editor(page)).toHaveAttribute('data-mode', 'pages');
  await expect(action(page, 'sign-open')).toBeFocused();
  await configure(page, { acceptance: 'accept' });
  await action(page, 'sign-open').click();
  await title.fill('Accepted title');
  await action(page, 'finalize').click();
  expect(await page.evaluate(() => window.bookQA.signs)).toEqual([
    { pages: ['Leaf one', 'Leaf two', 'Leaf three', 'Leaf four', 'Leaf five'], title: 'QA journal', author: 'Alex', spreadIndex: 0, mode: 'signing' },
    { pages: ['Leaf one', 'Leaf two', 'Leaf three', 'Leaf four', 'Leaf five'], title: 'Accepted title', author: 'Alex', spreadIndex: 0, mode: 'signing' },
  ]);
  expect(await page.evaluate(() => window.bookQA.finishes)).toEqual([]);
  await expect(editor(page)).toHaveAttribute('data-mode', 'signing');
  await configure(page, { finalizeEnabled: false });
  await expect(action(page, 'finalize')).toBeDisabled();
});

test('close and Escape each request one accepted finish while IME guards Escape', async ({ page }) => {
  await open(page, { stopCompositionPropagation: true, preventEscape: true });
  const input = editor(page).getByRole('textbox', { name: 'Leaf 1', exact: true });
  await input.focus(); await input.press('Escape');
  expect(await page.evaluate(() => window.bookQA.finishes.length)).toBe(0);
  await configure(page, { preventEscape: false });
  await input.focus();
  await input.dispatchEvent('compositionstart');
  await input.press('Escape');
  expect(await page.evaluate(() => window.bookQA.finishes.length)).toBe(0);
  await input.dispatchEvent('compositionend');
  await input.press('Escape');
  expect(await page.evaluate(() => window.bookQA.events.filter(event => event.kind === 'finish').map(event => event.detail))).toEqual([{ reason: 'escape' }]);
  await action(page, 'close').click();
  expect(await page.evaluate(() => window.bookQA.finishes.length)).toBe(2);
  expect(await page.evaluate(() => window.bookQA.signs.length)).toBe(0);
});

test('structural actions request leaf indices without mutating the host collection', async ({ page }) => {
  await open(page, { actions: true, spreadIndex: 1 });
  for (const [leaf, side] of [[2, 'left'], [3, 'right']] as const) {
    for (const name of ['insert-text-page', 'delete-page', 'move-page-left', 'move-page-right']) {
      const button = editor(page).locator(`.mc-book__leaf[data-side="${side}"] [data-book-action="${name}"]`);
      await expect(button).toHaveAttribute('data-page-index', String(leaf));
      await button.click();
    }
  }
  expect(await page.evaluate(() => window.bookQA.events.filter(event => event.kind === 'page-action').map(event => event.detail))).toEqual([2, 2, 2, 2, 3, 3, 3, 3]);
  expect(await editor(page).locator('textarea').evaluateAll(nodes => nodes.map(node => (node as HTMLTextAreaElement).value))).toEqual(['Leaf three', 'Leaf four']);
  await configure(page, { actionView: 'edit' });
  await expect(editor(page).locator('.mc-book__page-actions')).toHaveCount(0);
  const edit = editor(page).locator('.mc-book__leaf[data-side="left"] [data-book-action="edit"]');
  await expect(edit).toHaveAttribute('data-page-index', '2'); await edit.click();
  await expect(editor(page).getByRole('textbox', { name: 'Leaf 3', exact: true })).toBeFocused();
  expect(await page.evaluate(() => window.bookQA.events.filter(event => event.kind === 'page-action').at(-1))).toEqual({ kind: 'page-action', value: 'edit', detail: 2 });
  await configure(page, { actions: false, controlled: false });
  await expect(editor(page).locator('[data-book-action="delete-page"]')).toHaveCount(0);
});

test('two instances and real forward refs remain isolated under StrictMode', async ({ page }) => {
  await open(page, {}, true);
  expect(await page.evaluate(() => ({ editor: window.bookQA.refs.editor === document.querySelector('#primary .mc-book'), reader: window.bookQA.refs.reader === document.querySelector('#secondary .mc-book'), page: window.bookQA.refs.page === document.querySelector('#standalone .mc-book__page'), turn: window.bookQA.refs.turn === document.querySelector('#standalone .mc-book__turn') }))).toEqual({ editor: true, reader: true, page: true, turn: true });
  await turn(page, 'next').click();
  await expect(editor(page)).toHaveAttribute('data-spread-index', '1');
  await expect(page.locator('#secondary .mc-book')).toHaveAttribute('data-spread-index', '0');
  await configure(page, { showFirst: false });
  expect(await page.evaluate(() => window.bookQA.refs.editor)).toBeNull();
  await turn(page, 'next', '#secondary').click();
  await expect(page.locator('#secondary .mc-book')).toHaveAttribute('data-spread-index', '1');
  await page.evaluate(() => window.bookQA.unmount());
  expect(await page.evaluate(() => [window.bookQA.refs.reader, window.bookQA.refs.page, window.bookQA.refs.turn])).toEqual([null, null, null]);
});

test('turn button uses native keyboard/focus/disabled semantics without moving textarea caret', async ({ page }) => {
  await open(page, { asyncNavigation: true });
  const next = turn(page, 'next');
  await next.focus(); await next.press('Enter');
  await expect(editor(page)).toHaveAttribute('data-spread-index', '1');
  await expect(next).toBeFocused();
  const input = editor(page).getByRole('textbox', { name: 'Leaf 3', exact: true });
  await input.focus(); await input.press('ArrowLeft'); await input.press('ArrowRight');
  await expect(editor(page)).toHaveAttribute('data-spread-index', '1');
  await next.focus(); await next.press('Space');
  await expect(editor(page)).toHaveAttribute('data-spread-index', '2');
  await expect(next).toHaveAttribute('data-available', 'false');
  await expect(turn(page, 'previous')).toBeFocused();
  await configure(page, { disabled: true });
  await expect(next).toBeDisabled();
  await configure(page, { disabled: false, spreadIndex: 1 });
  await page.emulateMedia({ forcedColors: 'active' });
  const system = await page.evaluate(() => {
    const probe = document.createElement('div'); probe.style.cssText = 'color:CanvasText;background-color:Canvas'; document.body.append(probe);
    const value = { text: getComputedStyle(probe).color, canvas: getComputedStyle(probe).backgroundColor }; probe.remove(); return value;
  });
  await expect(editor(page).locator('.mc-book__surface')).toHaveCSS('background-color', system.canvas);
  await expect(editor(page).locator('textarea').first()).toHaveCSS('color', system.text);
  expect(await editor(page).locator('.mc-book__skin-patch').evaluateAll(nodes => nodes.every(node => {
    if (getComputedStyle(node).backgroundImage === 'none') return true;
    for (let ancestor: Element | null = node; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return true;
    }
    return false;
  }))).toBe(true);
  const accessibleNext = editor(page).getByRole('button', { name: 'Next pages', exact: true });
  await accessibleNext.focus(); await expect(accessibleNext).toBeFocused();
  expect(await accessibleNext.evaluate(node => [node.textContent, getComputedStyle(node, '::before').content, getComputedStyle(node, '::after').content]
    .some(value => value && !['none', 'normal', '""', "''"].includes(value.trim())))).toBe(true);
});

test('standalone page and turn expose reusable native contracts', async ({ page }) => {
  await open(page);
  const input = page.getByRole('textbox', { name: 'Standalone text', exact: true });
  await input.fill('Standalone accepted');
  await expect(input).toHaveValue('Standalone accepted');
  await configure(page, { acceptance: 'reject' });
  await input.fill('Rejected');
  await expect(input).toHaveValue('Standalone accepted');
  const next = page.getByRole('button', { name: 'Standalone next', exact: true });
  await next.focus(); await next.press('Space');
  expect(await page.evaluate(() => window.bookQA.events.filter(event => event.kind === 'standalone-turn').length)).toBe(1);
});

test('SSR renders ordinary book semantics with no network or warnings', () => {
  const warnings: unknown[][] = [];
  const previousError = console.error; const previousFetch = globalThis.fetch;
  let fetches = 0;
  console.error = (...values: unknown[]) => { warnings.push(values); };
  globalThis.fetch = (() => { fetches++; throw new Error('SSR must not fetch'); }) as typeof fetch;
  try {
    for (const node of [createElement(BookReader, { pages: ['One', 'Two', 'Odd'] }), createElement(BookEditor, { defaultPages: [], defaultTitle: 'Draft' }), createElement(BookPage, { side: 'right', blank: true }), createElement(BookPageTurnButton, { direction: 'previous', available: false })]) {
      const html = renderToStaticMarkup(node);
      expect(html).not.toContain('[object Object]'); expect(html).not.toContain('NaN'); expect(html).not.toContain('undefined');
    }
    expect(fetches).toBe(0); expect(warnings).toEqual([]);
  } finally { console.error = previousError; globalThis.fetch = previousFetch; }
});

test('book font role: each editable leaf selects one whole-value family and forced roles preserve native selection/ref', async ({ page }) => {
  await open(page, { fontProbe: true, pages: ['Alpha beta', 'A中B'], editorFontMode: 'auto' });
  const left = editor(page).getByRole('textbox', { name: 'Leaf 1', exact: true });
  const right = editor(page).getByRole('textbox', { name: 'Leaf 2', exact: true });
  await expect(left).toHaveCSS('font-family', 'monospace'); await expect(right).toHaveCSS('font-family', 'serif');
  await expect(left).toHaveAttribute('data-book-font-mode', 'latin'); await expect(right).toHaveAttribute('data-book-font-mode', 'unicode');
  await expect(right).toHaveAttribute('data-book-font-policy', 'whole-value-han-candidate');
  await left.evaluate(node => { (window as unknown as { bookFontLeft: Node }).bookFontLeft = node; (node as HTMLTextAreaElement).setSelectionRange(6, 10); });
  await right.evaluate(node => { (window as unknown as { bookFontRight: Node }).bookFontRight = node; });
  await left.focus(); await left.pressSequentially('中');
  await expect(left).toHaveValue('Alpha 中'); await expect(left).toHaveCSS('font-family', 'serif');
  expect(await left.evaluate(node => [(node as HTMLTextAreaElement).selectionStart, (node as HTMLTextAreaElement).selectionEnd])).toEqual([7, 7]);
  await configure(page, { pages: ['Latin accepted', 'A中B'] }); await expect(left).toHaveCSS('font-family', 'monospace');
  await left.evaluate(node => (node as HTMLTextAreaElement).setSelectionRange(1, 4));
  await configure(page, { editorFontMode: 'unicode' }); await expect(left).toHaveCSS('font-family', 'serif');
  await expect(left).toHaveAttribute('data-book-font-policy', 'caller');
  expect(await left.evaluate(node => [(node as HTMLTextAreaElement).selectionStart, (node as HTMLTextAreaElement).selectionEnd])).toEqual([1, 4]);
  await configure(page, { fontModeInput: 'per-page', pageFontModes: { 0: 'unicode', 1: 'latin' } });
  await expect(left).toHaveCSS('font-family', 'serif'); await expect(right).toHaveCSS('font-family', 'monospace');
  await expect(right).toHaveValue('A中B');
  await configure(page, { pageStyleFamilies: { 0: 'cursive' } }); await expect(left).toHaveCSS('font-family', 'cursive');
  expect(await left.evaluate(node => ({ same: node === (window as unknown as { bookFontLeft: Node }).bookFontLeft, ref: node === window.bookQA.refs.textareas.get(0), tag: node.tagName }))).toEqual({ same: true, ref: true, tag: 'TEXTAREA' });
  expect(await right.evaluate(node => node === (window as unknown as { bookFontRight: Node }).bookFontRight)).toBe(true);
  await configure(page, { pages: ['Only leaf'], editorFontMode: 'auto', pageFontModes: {}, pageStyleFamilies: {}, trackFontCalls: true });
  await page.evaluate(() => { window.bookQA.fontModeCalls.length = 0; });
  await configure(page, { editorFontMode: 'latin' }); await expect(left).toHaveCSS('font-family', 'monospace');
  const calls = await page.evaluate(() => window.bookQA.fontModeCalls);
  expect(calls.length).toBeGreaterThan(0); expect([...new Set(calls)]).toEqual([0]);
});

test('book font role: rejected controlled text and synthetic preedit update only temporary family, never value/selection/node', async ({ page }) => {
  await open(page, { fontProbe: true, pages: ['Latin accepted', '右页'], acceptance: 'reject', stopCompositionPropagation: true });
  const left = editor(page).getByRole('textbox', { name: 'Leaf 1', exact: true }), right = editor(page).getByRole('textbox', { name: 'Leaf 2', exact: true });
  await left.fill('Rejected 汉'); await expect(left).toHaveValue('Latin accepted'); await expect(left).toHaveCSS('font-family', 'monospace');
  await expect(right).toHaveCSS('font-family', 'serif');
  await left.evaluate(node => { (window as unknown as { preeditBookNode: Node }).preeditBookNode = node; });
  await left.focus(); await left.dispatchEvent('compositionstart', { data: '' });
  await expect(action(page, 'close')).toBeDisabled();
  // Native prototype setter supplies a synthetic browser preedit value. It
  // bypasses no React internals and is not an OS IME/advance certification.
  await left.evaluate(node => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(node, 'Latin 汉 preedit');
    (node as HTMLTextAreaElement).setSelectionRange(7, 7);
  });
  await left.dispatchEvent('compositionupdate', { data: '汉' });
  await expect(left).toHaveCSS('font-family', 'serif'); await expect(left).toHaveValue('Latin 汉 preedit');
  await expect(left).toHaveAttribute('data-book-composing-font-mode', 'unicode');
  await expect(left).toHaveAttribute('data-book-font-mode', 'latin');
  expect(await left.evaluate(node => [(node as HTMLTextAreaElement).selectionStart, (node as HTMLTextAreaElement).selectionEnd])).toEqual([7, 7]);
  // The font update itself preserved the browser preedit. Now dispatch the
  // native input event so ordinary React controlled rejection may restore it.
  await left.dispatchEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: '汉', isComposing: true });
  await expect(left).toHaveValue('Latin accepted');
  await left.dispatchEvent('compositionend', { data: '汉' });
  await expect(action(page, 'close')).toBeEnabled();
  await expect(left).toHaveCSS('font-family', 'monospace');
  expect(await left.getAttribute('data-book-composing-font-mode')).toBeNull();
  await expect(left).toHaveValue('Latin accepted'); await expect(left).toHaveCSS('font-family', 'monospace');
  await expect(right).toHaveValue('右页'); await expect(right).toHaveCSS('font-family', 'serif');
  expect(await left.evaluate(node => ({ same: node === (window as unknown as { preeditBookNode: Node }).preeditBookNode, ref: node === window.bookQA.refs.textareas.get(0) }))).toEqual({ same: true, ref: true });
  expect(await page.evaluate(() => window.bookQA.events.filter(event => event.kind.startsWith('composition')).map(event => event.kind))).toEqual(['composition-start', 'composition-end']);
});

test('book font role: typed Page/Editor refs and SSR preserve bounded whole-value markers without IO or static Reader routing', () => {
  const nativeRef = createRef<HTMLTextAreaElement>(), pageRef = createRef<HTMLDivElement>(), editorRef = createRef<HTMLElement>();
  const previousFetch = globalThis.fetch, previousError = console.error; let fetches = 0; const warnings: unknown[][] = [];
  globalThis.fetch = (() => { fetches++; throw new Error('Book font role SSR must not fetch'); }) as typeof fetch;
  console.error = (...values: unknown[]) => warnings.push(values);
  try {
    const editable = renderToStaticMarkup(createElement(BookPage, { ref: pageRef, textareaRef: nativeRef, side: 'left', text: 'Latin 汉', readOnly: false, fontMode: 'auto' }));
    expect(editable).toContain('data-book-font-mode="unicode"'); expect(editable).toContain('data-book-font-policy="whole-value-han-candidate"');
    const forced = renderToStaticMarkup(createElement(BookPage, { side: 'left', text: '汉', readOnly: false, fontMode: 'latin', textareaProps: { style: { fontFamily: 'cursive' } } }));
    expect(forced).toContain('data-book-font-mode="latin"'); expect(forced).toContain('font-family:cursive');
    for (const node of [createElement(BookReader, { pages: ['汉', 'Latin'] }), createElement(BookPage, { side: 'left', text: '汉', readOnly: true, fontMode: 'unicode' })]) {
      const html = renderToStaticMarkup(node); expect(html).not.toContain('data-book-font-mode='); expect(html).not.toContain('<textarea');
    }
    const calls: number[] = [];
    const book = renderToStaticMarkup(createElement(BookEditor, { ref: editorRef, pages: ['Only leaf 汉'], textareaRef: () => nativeRef,
      fontMode: index => { calls.push(index); return 'unicode'; } }));
    expect(book).toContain('data-book-font-mode="unicode"'); expect(calls).toEqual([0]);
    expect(book).not.toMatch(/\sfontmode=/i); expect(book).not.toContain('[object Object]');
    expect([nativeRef.current, pageRef.current, editorRef.current]).toEqual([null, null, null]); expect(fetches).toBe(0); expect(warnings).toEqual([]);
  } finally { globalThis.fetch = previousFetch; console.error = previousError; }
});
