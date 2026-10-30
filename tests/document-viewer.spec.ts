import { test, expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocumentViewer, DocumentHeading, DocumentParagraph } from '../src/document-viewer';
import type { DocumentQASettings } from '../demo/document-viewer-fixture';

const viewer = (p: Page) => p.locator('#qa-document-viewer');
const part = (p: Page, name: string) => viewer(p).locator(`.mc-document-viewer__${name}`);
const topic = (p: Page, id: string) => viewer(p).locator(`button[data-topic-id="${id}"]`);
const nav = (p: Page) => viewer(p).locator('.mc-scroll-area__viewport').nth(0);
const content = (p: Page) => viewer(p).locator('.mc-scroll-area__viewport').nth(1);
const article = (p: Page) => content(p).locator('[role=tabpanel]:not([hidden])');
async function open(p: Page, initial: Partial<DocumentQASettings> = {}, strict = false) {
  await p.addInitScript(value => { window.documentQAInitial = value; }, initial);
  await p.goto(`/demo/document-viewer-fixture.html${strict ? '?strict' : ''}`);
  await expect.poll(() => p.evaluate(() => !!window.documentQA?.ref && !!window.documentQA.navigationRef && !!window.documentQA.contentRef)).toBe(true);
}
async function configure(p: Page, value: Partial<DocumentQASettings>) { await p.evaluate(value => window.documentQA.configure(value), value); }
async function events(p: Page, kind: string) { return p.evaluate(kind => window.documentQA.events.filter(e => e.kind === kind), kind); }
async function clear(p: Page) { await p.evaluate(() => { window.documentQA.events.length = 0; }); }
async function box(l: Locator) { const result = await l.boundingBox(); expect(result).not.toBeNull(); return result!; }
const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(1 / 32);
async function setScroll(p: Page, pane: 'navigationRef' | 'contentRef', top: number) { await p.evaluate(({ pane, top }) => { window.documentQA[pane]!.scrollTop = top; }, { pane, top }); await expect.poll(() => p.evaluate(pane => window.documentQA[pane]!.scrollTop, pane)).toBe(top); }

test('SSR is live semantic content with source defaults and no fetch or image IO', () => {
  expect(typeof window).toBe('undefined'); let calls = 0; const oldFetch = globalThis.fetch;
  globalThis.fetch = (() => { calls++; throw new Error('Unexpected SSR IO'); }) as typeof fetch;
  try {
    const groups = [{ id: 'group', label: 'Host category', topics: [{ id: 'topic', title: 'Host topic', content: createElement(DocumentParagraph, null, 'Selectable original content') }] }];
    const html = renderToStaticMarkup(createElement(DocumentViewer, { groups, label: 'Host reader', scale: 1 }));
    expect(html).toContain('Host reader'); expect(html).toContain('Host topic'); expect(html).toContain('Selectable original content'); expect(html).toContain('width:400px'); expect(html).toContain('height:300px'); expect(html).not.toContain('<canvas'); expect(html).not.toContain('aria-modal'); expect(calls).toBe(0);
    expect(() => renderToStaticMarkup(createElement(DocumentViewer, { groups, label: 'Bad', scale: 1.5 }))).toThrow(RangeError);
    expect(() => renderToStaticMarkup(createElement(DocumentViewer, { groups, label: 'Bad', size: [0, 200] }))).toThrow(RangeError);
    expect(() => renderToStaticMarkup(createElement(DocumentViewer, { groups: [...groups, ...groups], label: 'Duplicate identity' }))).toThrow(RangeError);
    expect(() => renderToStaticMarkup(createElement(DocumentParagraph, { linePadding: -1 }, 'Bad'))).toThrow(RangeError);
    expect(renderToStaticMarkup(createElement(DocumentHeading, null, 'Source heading'))).toContain('Source heading');
  } finally { globalThis.fetch = oldFetch; }
});

test('source two-pane wrappers retain30percent70percent offsets23 header and divider through scale and resize', async ({ page }) => {
  await open(page);
  for (const [size, scale] of [[[320, 240], 1], [[180, 280], 2]] as const) {
    await configure(page, { size, scale }); const root = await box(viewer(page)), left = await box(part(page, 'navigation')), right = await box(part(page, 'content-wrapper')), divider = await box(part(page, 'divider'));
    near(root.width, size[0] * scale); near(root.height, size[1] * scale); near((await box(part(page, 'header'))).height, 23 * scale);
    near(left.x - root.x, -2 * scale); near(left.y - root.y, 21 * scale); near(left.width, (.3 * size[0] + 2) * scale); near(left.height, (size[1] - 19) * scale);
    near(right.width, (.7 * size[0] - 2) * scale); near(right.x + right.width - (root.x + root.width), 2 * scale); near(right.y - root.y, 21 * scale); near(right.height, (size[1] - 19) * scale);
    near(divider.x - root.x, size[0] * .3 * scale); near(divider.y - root.y, 20 * scale); near(divider.width, 4 * scale); near(divider.height, (size[1] - 18) * scale);
  }
});

test('document scrollbar is actually5 units with3-unit centered track and5-unit thumb, distinct from pane reservations', async ({ page }) => {
  await open(page);
  for (const scale of [1, 2]) {
    await configure(page, { size: [180, 280], scale }); const bars = viewer(page).getByRole('scrollbar'); await expect(bars).toHaveCount(2);
    for (const bar of await bars.all()) {
      near((await box(bar)).width, 5 * scale); near((await box(bar.locator('.mc-scrollbar__track'))).width, 3 * scale); near((await box(bar.locator('.mc-scrollbar__thumb'))).width, 5 * scale);
      near((await box(bar.locator('.mc-scrollbar__track'))).x - (await box(bar)).x, scale);
      await expect.poll(async () => Number(await bar.getAttribute('aria-valuemax'))).toBeGreaterThan(0);
    }
    const areas = viewer(page).locator('.mc-scroll-area');
    near((await box(areas.nth(0))).width - (await box(nav(page))).width, 7 * scale);
    near((await box(areas.nth(1))).width - (await box(content(page))).width, 15 * scale);
    near((await box(bars.nth(0))).height, (await box(areas.nth(0))).height - 4 * scale);
    near((await box(bars.nth(1))).height, (await box(areas.nth(1))).height - 4 * scale);
  }
});

test('source navigation rows and category headings remain real distinct text rather than disabled topic buttons', async ({ page }) => {
  await open(page); const first = topic(page, 'intro'), second = topic(page, 'second');
  near((await box(first)).height, 30); near((await box(second)).height, 30);
  const category = viewer(page).getByText('Basics category', { exact: true }); await expect(category).toBeVisible(); expect(await category.evaluate(n => !!n.closest('button'))).toBe(false);
  const categoryHeading = part(page, 'group-heading').filter({ hasText: 'Basics category' });
  await expect(categoryHeading).toHaveCSS('padding-top', '9px'); await expect(category).toHaveCSS('max-height', '50px'); near((await box(category)).y - (await box(categoryHeading)).y, 6);
  // common_buttons.new_ui_button_panel centers W-6 content before the topic's own +10 / max W-14 label.
  const text = first.locator('.mc-document-viewer__topic-label'); near((await box(text)).x - (await box(first)).x, 13); near((await box(text)).width, (await box(first)).width - 20);
  await expect(topic(page, 'locked')).toBeDisabled(); await expect(second.locator('.mc-document-viewer__topic-arrow')).toHaveCount(1);
});

test('article uses28 heading row20 banner and75percent paragraph width with4-unit line padding without inherited shadow', async ({ page }) => {
  await open(page);
  for (const scale of [1, 2]) {
    await configure(page, { scale, size: [180, 280] }); const heading = article(page).getByTestId('article-heading'), paragraph = article(page).getByTestId('article-paragraph');
    near((await box(heading)).height, 28 * scale); near((await box(heading.locator('.mc-document-heading__banner'))).height, 20 * scale); near((await box(heading.locator('.mc-document-heading__banner'))).y - (await box(heading)).y, 2 * scale);
    near((await box(paragraph)).width, (await box(paragraph.locator('..'))).width * .75);
    await expect(paragraph).toHaveCSS('text-shadow', 'none'); expect(await paragraph.evaluate(n => getComputedStyle(n).whiteSpace)).not.toBe('nowrap');
    const metrics = await paragraph.evaluate(n => ({ line: parseFloat(getComputedStyle(n).lineHeight), font: parseFloat(getComputedStyle(n).fontSize) })); near(metrics.line - metrics.font, 4 * scale);
    const six = await article(page).getByTestId('article-paragraph-six').evaluate(n => ({ line: parseFloat(getComputedStyle(n).lineHeight), font: parseFloat(getComputedStyle(n).fontSize) })); near(six.line - six.font, 6 * scale);
  }
});

test('native navigation and article viewports scroll independently and report matching pane offsets', async ({ page }) => {
  await open(page); await setScroll(page, 'contentRef', 160); expect(await nav(page).evaluate(n => n.scrollTop)).toBe(0);
  await setScroll(page, 'navigationRef', 80); expect(await content(page).evaluate(n => n.scrollTop)).toBe(160);
  await expect.poll(async () => (await events(page, 'scroll')).some(e => e.value === 'navigation' && (e.detail as { scrollTop: number }).scrollTop === 80)).toBe(true);
  await expect.poll(async () => (await events(page, 'scroll')).some(e => e.value === 'content' && (e.detail as { scrollTop: number }).scrollTop === 160)).toBe(true);
  const bars = viewer(page).getByRole('scrollbar'); await expect(bars.nth(0)).toHaveAttribute('aria-controls', (await nav(page).getAttribute('id'))!); await expect(bars.nth(1)).toHaveAttribute('aria-controls', (await content(page).getAttribute('id'))!);
  await expect(bars.nth(0)).toHaveAttribute('aria-valuenow', '80'); await expect(bars.nth(1)).toHaveAttribute('aria-valuenow', '160');
});

test('roving focus skips disabled topics without committing until Enter or Space and retains accepted content under rejection', async ({ page }) => {
  await open(page, { accept: false }); await topic(page, 'intro').focus(); await clear(page); await page.keyboard.press('ArrowDown');
  await expect(topic(page, 'second')).toBeFocused(); await expect(topic(page, 'intro')).toHaveAttribute('aria-selected', 'true'); await expect(article(page).getByTestId('article-heading')).toHaveText('Introduction heading'); expect(await events(page, 'value')).toHaveLength(0);
  await page.keyboard.press('Enter'); expect((await events(page, 'value')).at(-1)).toMatchObject({ value: 'second', detail: { reason: 'activate' } }); await expect(article(page).getByTestId('article-heading')).toHaveText('Introduction heading'); await expect(part(page, 'title')).toHaveText('Introduction');
  await configure(page, { accept: true }); await page.keyboard.press('Space'); await expect(article(page).getByTestId('article-heading')).toHaveText('Second heading'); await expect(topic(page, 'second')).toHaveAttribute('aria-selected', 'true');
  await expect(topic(page, 'second').locator('.mc-document-viewer__topic-label')).toHaveText('Second article'); await expect(part(page, 'title')).toHaveText('How to Play: Second article');
});

test('default selection is first enabled only on uncontrolled initialization and explicit null or orphan stays empty', async ({ page }) => {
  await open(page, { controlled: false }); await expect(article(page).getByTestId('article-heading')).toHaveText('Introduction heading');
  await topic(page, 'second').click(); await expect(article(page).getByTestId('article-heading')).toHaveText('Second heading');
  await configure(page, { controlled: true, value: null }); await expect(content(page).getByTestId('empty-content')).toBeVisible();
  await configure(page, { value: 'missing-host-id' }); await expect(content(page).getByTestId('empty-content')).toBeVisible();
  await clear(page); await configure(page, { value: 'intro', removeSelected: true }); await expect(content(page).getByTestId('empty-content')).toBeVisible(); expect(await events(page, 'value')).toHaveLength(0);
});

test('roving End reveals the offscreen final topic inside its own viewport without accepting that topic', async ({ page }) => {
  await open(page, { accept: false }); await topic(page, 'intro').focus(); await clear(page); await page.keyboard.press('End'); await expect(topic(page, 'extra-11')).toBeFocused();
  const viewport = await box(nav(page)), last = await box(topic(page, 'extra-11'));
  expect(last.y).toBeGreaterThanOrEqual(viewport.y - 1); expect(last.y + last.height).toBeLessThanOrEqual(viewport.y + viewport.height + 1); expect(await nav(page).evaluate(n => n.scrollTop)).toBeGreaterThan(0);
  await expect(topic(page, 'intro')).toHaveAttribute('aria-selected', 'true'); expect(await events(page, 'value')).toHaveLength(0); expect(await content(page).evaluate(n => n.scrollTop)).toBe(0);
});

test('reset policy resets only accepted topic changes and preserves navigation scroll and rejected content scroll', async ({ page }) => {
  await open(page, { accept: false }); await setScroll(page, 'contentRef', 180); await setScroll(page, 'navigationRef', 40);
  await topic(page, 'second').evaluate(n => (n as HTMLButtonElement).click()); expect(await content(page).evaluate(n => n.scrollTop)).toBe(180); expect(await nav(page).evaluate(n => n.scrollTop)).toBe(40);
  await configure(page, { accept: true }); await topic(page, 'second').evaluate(n => (n as HTMLButtonElement).click()); await expect.poll(() => content(page).evaluate(n => n.scrollTop)).toBe(0); expect(await nav(page).evaluate(n => n.scrollTop)).toBe(40);
});

test('preserve policy restores each accepted topic offset rather than sharing a single scrolled viewport', async ({ page }) => {
  await open(page, { scrollPolicy: 'preserve' }); await setScroll(page, 'contentRef', 190);
  await topic(page, 'second').evaluate(n => (n as HTMLButtonElement).click()); await expect.poll(() => content(page).evaluate(n => n.scrollTop)).toBe(0); await setScroll(page, 'contentRef', 80);
  await topic(page, 'intro').evaluate(n => (n as HTMLButtonElement).click()); await expect.poll(() => content(page).evaluate(n => n.scrollTop)).toBe(190);
  await topic(page, 'second').evaluate(n => (n as HTMLButtonElement).click()); await expect.poll(() => content(page).evaluate(n => n.scrollTop)).toBe(80);
});

test('previous and next hints request adjacent enabled topics and back stays a host callback', async ({ page }) => {
  await open(page, { accept: false }); const previous = viewer(page).getByRole('button', { name: 'Previous document', exact: true }), next = viewer(page).getByRole('button', { name: 'Next document', exact: true });
  await expect(previous).toBeDisabled(); await next.click(); expect((await events(page, 'value')).at(-1)).toMatchObject({ value: 'second', detail: { reason: 'next' } }); await expect(article(page).getByTestId('article-heading')).toHaveText('Introduction heading');
  await configure(page, { value: 'second' }); await previous.click(); expect((await events(page, 'value')).at(-1)).toMatchObject({ value: 'intro', detail: { reason: 'previous' } });
  await viewer(page).getByRole('button', { name: 'Back', exact: true }).click(); expect(await events(page, 'back')).toHaveLength(1); await expect(viewer(page)).toBeVisible();
  await expect(viewer(page).getByText('LB', { exact: true })).toBeVisible(); await expect(viewer(page).getByText('RB', { exact: true })).toBeVisible();
});

test('caller key prevention and IME modifiers leave selection unchanged while editable descendants keep their keys', async ({ page }) => {
  await open(page, { preventKeys: ['ArrowDown'] }); await topic(page, 'intro').focus(); await page.keyboard.press('ArrowDown'); await expect(topic(page, 'intro')).toBeFocused();
  await configure(page, { preventKeys: [], preventCaptureKeys: ['ArrowDown'] }); await page.keyboard.press('ArrowDown'); await expect(topic(page, 'intro')).toBeFocused();
  await configure(page, { preventCaptureKeys: [] }); await clear(page); for (const extra of [{ isComposing: true }, { keyCode: 229 }, { ctrlKey: true }, { altKey: true }, { metaKey: true }]) await topic(page, 'intro').dispatchEvent('keydown', { key: 'ArrowDown', bubbles: true, ...extra });
  await expect(topic(page, 'intro')).toBeFocused(); expect(await events(page, 'value')).toHaveLength(0);
  const input = article(page).getByRole('textbox', { name: 'Document editable note' }); await input.focus(); await input.press('Home'); await input.press('ArrowRight'); expect(await input.evaluate((n: HTMLInputElement) => n.selectionStart)).toBe(1); await expect(input).toBeFocused();
  await clear(page); await input.press('Escape'); expect(await events(page, 'back')).toHaveLength(0); await expect(input).toBeFocused();
});

test('Escape requests host Back once and root or capture prevention can cancel that request', async ({ page }) => {
  await open(page); await topic(page, 'intro').focus(); await clear(page); await page.keyboard.press('Escape'); expect(await events(page, 'back')).toHaveLength(1); await expect(viewer(page)).toBeVisible();
  for (const patch of [{ preventKeys: ['Escape'], preventCaptureKeys: [] }, { preventKeys: [], preventCaptureKeys: ['Escape'] }]) {
    await configure(page, patch); await clear(page); await page.keyboard.press('Escape'); expect(await events(page, 'back')).toHaveLength(0);
  }
  await configure(page, { preventKeys: [], preventCaptureKeys: [] }); await clear(page); for (const extra of [{ isComposing: true }, { keyCode: 229 }, { ctrlKey: true }]) await topic(page, 'intro').dispatchEvent('keydown', { key: 'Escape', bubbles: true, ...extra }); expect(await events(page, 'back')).toHaveLength(0);
});

test('disabled and empty viewers do not synthesize topic changes, store navigation or gamepad glyphs', async ({ page }) => {
  await open(page, { disabled: true }); await expect(topic(page, 'intro')).toBeDisabled(); await topic(page, 'intro').evaluate(n => (n as HTMLButtonElement).click()); expect(await events(page, 'value')).toHaveLength(0);
  for (const button of await viewer(page).getByRole('button').all()) await expect(button).toBeDisabled();
  await configure(page, { disabled: false, empty: true, hints: false }); await expect(content(page).getByTestId('empty-content')).toBeVisible(); await expect(viewer(page).locator('button[data-topic-id]')).toHaveCount(0); await expect(viewer(page).getByText('LB', { exact: true })).toHaveCount(0); expect(await events(page, 'value')).toHaveLength(0);
});

test('long localized labels and dynamic topics retain fixed row heights and native content selection', async ({ page }) => {
  await open(page, { longLabels: true }); near((await box(topic(page, 'intro'))).height, 30); await expect(viewer(page)).toBeVisible();
  const p = article(page).getByTestId('article-paragraph'); expect(await p.evaluate(n => getComputedStyle(n).userSelect)).not.toBe('none');
  expect(await p.evaluate(n => { const r = document.createRange(); r.selectNodeContents(n); const s = getSelection(); s?.removeAllRanges(); s?.addRange(r); return s?.toString(); })).toContain('Selectable Introduction documentation');
  await article(page).getByRole('button', { name: 'Host article action' }).evaluate(n => (n as HTMLButtonElement).click()); expect((await events(page, 'article-action')).at(-1)).toMatchObject({ value: 'Introduction' });
  await configure(page, { longLabels: false, value: 'second' }); await expect(article(page).getByTestId('article-heading')).toHaveText('Second heading');
});

test('root viewport and topic refs remain stable through resize then clean up when the host unmounts', async ({ page }) => {
  await open(page, {}, true); expect(await viewer(page).evaluate(n => n === window.documentQA.ref)).toBe(true); expect(await nav(page).evaluate(n => n === window.documentQA.navigationRef)).toBe(true); expect(await content(page).evaluate(n => n === window.documentQA.contentRef)).toBe(true); expect(await topic(page, 'intro').evaluate(n => n === window.documentQA.topicRefs.intro)).toBe(true);
  await page.evaluate(() => { (window as unknown as { savedDocumentNodes: unknown[] }).savedDocumentNodes = [window.documentQA.ref, window.documentQA.navigationRef, window.documentQA.contentRef]; }); await configure(page, { size: [310, 260], scale: 1 });
  expect(await page.evaluate(() => (window as unknown as { savedDocumentNodes: unknown[] }).savedDocumentNodes.every((node, index) => node === [window.documentQA.ref, window.documentQA.navigationRef, window.documentQA.contentRef][index]))).toBe(true);
  await page.evaluate(() => window.documentQA.unmount()); expect(await page.evaluate(() => [window.documentQA.ref, window.documentQA.navigationRef, window.documentQA.contentRef, window.documentQA.topicRefs.intro])).toEqual([null, null, null, null]);
});

test('forced colors preserves readable navigation selection native focus and scrollbars without decorative source skins', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' }); await open(page); await topic(page, 'intro').focus(); await expect(topic(page, 'intro')).toBeFocused(); await expect(topic(page, 'intro')).toHaveAttribute('aria-selected', 'true'); await expect(topic(page, 'locked')).toBeDisabled();
  const text = topic(page, 'intro').locator('.mc-document-viewer__topic-label'); await expect(text).toBeVisible(); expect(await text.evaluate(n => getComputedStyle(n).color)).not.toBe('rgba(0, 0, 0, 0)');
  await expect(topic(page, 'intro').locator('.mc-document-viewer__topic-skin')).toBeHidden(); await expect(viewer(page).getByRole('scrollbar').nth(0)).toBeVisible();
});
