import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import type { BookBodyConfiguration } from '../demo/book-body-fixture';

// These are caller/input-ownership regressions. They do not certify native
// wrapping, font selection, geometry or GPU bytes against Minecraft.
const url = '/demo/book-body-fixture.html';
type BookId = 'a' | 'b';
const host = (page: Page, book: BookId = 'a') => page.locator(`[data-book="${book}"]`);
const leaf = (page: Page, index = 0, book: BookId = 'a') => host(page, book).locator(`.mc-book__page[data-page-index="${index}"]`);
const paints = (page: Page, book: BookId = 'a') => host(page, book).locator('.mc-book__body-owner[data-book-body-idle="true"] > .mc-book__body-painter[data-book-body-ready="true"]');
const input = (page: Page, index = 0, book: BookId = 'a') => host(page, book).locator(`textarea[aria-label="${book} leaf ${index + 1}"]`);
async function configure(page: Page, next: Partial<BookBodyConfiguration>, book: BookId = 'a') {
  await page.evaluate(({ book, next }) => window.bookBodyQA.configure(book, next), { book, next });
}
async function ready(page: Page, book: BookId = 'a', count = 2) { await expect(paints(page, book)).toHaveCount(count); }
async function open(page: Page) { await page.goto(url); await ready(page); }
async function cssInk(control: Locator) {
  expect(await control.evaluate(node => getComputedStyle(node).color)).not.toBe('rgba(0, 0, 0, 0)');
}
async function noVisiblePaint(page: Page, index = 0, book: BookId = 'a') {
  await expect.poll(() => leaf(page, index, book).locator('.mc-book__body-painter canvas').evaluateAll(nodes => nodes.filter(node => {
    const style = getComputedStyle(node); return style.display !== 'none' && style.visibility !== 'hidden' && node.getClientRects().length > 0;
  }).length)).toBe(0);
}
async function signature(page: Page, index = 0, book: BookId = 'a') {
  return leaf(page, index, book).locator('.mc-book__body-painter canvas').evaluate(async node => {
    const canvas = node as HTMLCanvasElement, gl = canvas.getContext('webgl')!;
    const bytes = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
  });
}
async function holdDecoding(page: Page) {
  await page.evaluate(() => {
    const previous = window.createImageBitmap;
    const releases: (() => void)[] = [];
    (window as unknown as { bodyDecodeGate: { releases: (() => void)[]; releaseAll: boolean } }).bodyDecodeGate = { releases, releaseAll: false };
    window.createImageBitmap = ((...args: unknown[]) => {
      const gate = (window as unknown as { bodyDecodeGate: { releases: (() => void)[]; releaseAll: boolean } }).bodyDecodeGate;
      if (gate.releaseAll) return Reflect.apply(previous, window, args);
      return new Promise(resolve => releases.push(() => resolve(Reflect.apply(previous, window, args))));
    }) as typeof createImageBitmap;
  });
}
async function releaseDecoding(page: Page) {
  // The resource loader has bounded concurrency; later waves are not all
  // expected to reach createImageBitmap before this first wave is released.
  await page.evaluate(() => {
    const gate = (window as unknown as { bodyDecodeGate: { releases: (() => void)[]; releaseAll: boolean } }).bodyDecodeGate;
    gate.releaseAll = true; for (const release of gate.releases.splice(0)) release();
  });
}
async function decodingStarted(page: Page) {
  await expect.poll(() => page.evaluate(() => (window as unknown as { bodyDecodeGate: { releases: unknown[] } }).bodyDecodeGate.releases.length)).toBeGreaterThan(0);
}

test('idle paint retains the real controlled textarea, ref, accepted input and selection ownership', async ({ page }) => {
  await open(page);
  const control = input(page), node = await control.elementHandle();
  await expect(control).toHaveAccessibleName('a leaf 1'); await expect(control).toHaveValue('Alpha body');
  expect(await control.evaluate(element => element === window.bookBodyQA.inputs.a[0]!.current)).toBe(true);
  await control.focus(); await cssInk(control); await noVisiblePaint(page);
  // Drive browser key/selection events before replacing text. A programmatic
  // setSelectionRange immediately followed by fill can coalesce selectionchange.
  await control.press('Home');
  for (let i = 0; i < 5; i++) await control.press('ArrowRight');
  for (let i = 0; i < 4; i++) await control.press('Shift+ArrowLeft');
  await expect.poll(() => page.evaluate(() => window.bookBodyQA.events.some(event =>
    event.book === 'a' && event.pageIndex === 0 && event.type === 'select'))).toBe(true);
  expect(await control.evaluate(element => {
    const textarea = element as HTMLTextAreaElement; return [textarea.selectionStart, textarea.selectionEnd, textarea.selectionDirection];
  })).toEqual([1, 5, 'backward']);
  await control.fill('Accepted change'); await expect(control).toHaveValue('Accepted change');
  expect(await page.evaluate(() => window.bookBodyQA.configurations.a.pages[0])).toBe('Accepted change');
  await page.locator('#outside').click(); await ready(page);
  expect(await control.evaluate((element, old) => element === old, node)).toBe(true);
  expect(await control.evaluate(element => element === window.bookBodyQA.inputs.a[0]!.current)).toBe(true);
  expect(await page.evaluate(() => window.bookBodyQA.errors)).toEqual([]);
  expect(await page.evaluate(() => window.bookBodyQA.events.filter(event => event.book === 'a').map(event => event.type))).toEqual(expect.arrayContaining(['focus', 'select', 'blur']));
});

test('rejected controlled input cannot replace accepted text or its restored idle paint', async ({ page }) => {
  await open(page); const accepted = await signature(page);
  await configure(page, { accept: false }); const control = input(page), node = await control.elementHandle();
  await control.fill('Rejected text'); await expect(control).toHaveValue('Alpha body');
  expect(await page.evaluate(() => window.bookBodyQA.changes.at(-1)?.pages[0])).toBe('Rejected text');
  expect(await page.evaluate(() => window.bookBodyQA.configurations.a.pages[0])).toBe('Alpha body');
  await page.locator('#outside').click(); await ready(page);
  expect(await signature(page)).toBe(accepted); expect(await control.evaluate((element, old) => element === old, node)).toBe(true);
});

test('nonempty selection and scrolling keep CSS ownership until the native input returns to idle', async ({ page }) => {
  await open(page); const control = input(page);
  await control.focus(); await control.evaluate(element => (element as HTMLTextAreaElement).setSelectionRange(0, 3));
  await page.locator('#outside').click(); await noVisiblePaint(page); await cssInk(control);
  await control.evaluate(element => { const textarea = element as HTMLTextAreaElement; textarea.setSelectionRange(0, 0); textarea.dispatchEvent(new Event('select', { bubbles: true })); });
  await ready(page);
  // This long document remains a DOM editor; its scroll value and caller
  // handler must survive render-profile changes and fallback transitions.
  await configure(page, { pages: ['Line\n'.repeat(60), 'Right body'] });
  await control.focus(); await control.evaluate(element => { element.scrollTop = 45; element.dispatchEvent(new Event('scroll', { bubbles: true })); });
  const top = await control.evaluate(element => element.scrollTop); expect(top).toBeGreaterThan(0);
  await configure(page, { enabled: false }); await expect(control).toBeFocused();
  expect(await control.evaluate(element => element.scrollTop)).toBe(top);
  expect(await page.evaluate(() => window.bookBodyQA.events.some(event => event.type === 'scroll'))).toBe(true);
});

test('composition callbacks and held spread/mode retain DOM authority even after blur', async ({ page }) => {
  await open(page); const control = input(page), node = await control.elementHandle(); await control.focus();
  await control.dispatchEvent('compositionstart', { data: '' });
  await control.dispatchEvent('compositionupdate', { data: 'AB' });
  await configure(page, { mode: 'signing', spread: 1 });
  await expect(host(page).locator('.mc-book')).toHaveAttribute('data-mode', 'pages');
  await expect(host(page).locator('.mc-book')).toHaveAttribute('data-spread-index', '0');
  await page.locator('#outside').click(); await noVisiblePaint(page); await cssInk(control);
  expect(await control.evaluate((element, old) => element === old, node)).toBe(true);
  await control.dispatchEvent('compositionend', { data: 'AB' });
  await expect(host(page).locator('.mc-book')).toHaveAttribute('data-mode', 'signing');
  await expect(paints(page)).toHaveCount(0);
  await configure(page, { mode: 'pages', spread: 0 }); await ready(page);
  expect(await page.evaluate(() => window.bookBodyQA.events.filter(event => event.type.startsWith('composition')).map(event => event.type))).toEqual(['compositionstart', 'compositionupdate', 'compositionend']);
});

test('actual native scroll alone suspends idle paint and returning to zero permits a fresh owner', async ({ page }) => {
  await open(page); await configure(page, { pages: ['One\nTwo\nThree', 'Right body'], inputHeight: 20 }); await ready(page);
  // Explicit caller CSS creates a scrollable real textarea. This checks event
  // ownership, not agreement of the declared source layout with custom CSS.
  const control = input(page), node = await control.elementHandle();
  await control.evaluate(element => { element.scrollTop = 12; element.dispatchEvent(new Event('scroll', { bubbles: true })); });
  expect(await control.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await noVisiblePaint(page); await cssInk(control); await expect(control).not.toBeFocused();
  await configure(page, { renderKey: 2 }); await noVisiblePaint(page);
  expect(await control.evaluate((element, old) => element === old, node)).toBe(true);
  await control.evaluate(element => { element.scrollTop = 0; element.dispatchEvent(new Event('scroll', { bubbles: true })); });
  await ready(page); expect(await page.evaluate(() => window.bookBodyQA.events.some(event => event.type === 'scroll'))).toBe(true);
});

test('forced colors retains CSS text and restores a fresh idle painter when disabled', async ({ page }) => {
  await open(page); await page.emulateMedia({ forcedColors: 'active' });
  await expect(paints(page)).toHaveCount(0); await noVisiblePaint(page); await cssInk(input(page));
  await page.emulateMedia({ forcedColors: 'none' }); await ready(page);
});

for (const transition of ['off', 'signing', 'readOnly', 'disabled', 'hidden'] as const) {
  test(`reactivating ${transition} creates a fresh unready body owner until its current decode finishes`, async ({ page }) => {
    await open(page);
    const suspend: Partial<BookBodyConfiguration> = transition === 'off' ? { enabled: false } : transition === 'signing' ? { mode: 'signing' } : { [transition]: true };
    const resume: Partial<BookBodyConfiguration> = transition === 'off' ? { enabled: true } : transition === 'signing' ? { mode: 'pages' } : { [transition]: false };
    await configure(page, suspend); await expect(paints(page)).toHaveCount(0);
    await holdDecoding(page); await configure(page, resume); await decodingStarted(page);
    await expect(paints(page)).toHaveCount(0); await noVisiblePaint(page); await cssInk(input(page));
    await releaseDecoding(page); await ready(page);
  });
}

test('a delayed old value cannot become the ready body of a newly accepted document', async ({ page }) => {
  await open(page); await configure(page, { pages: ['NEW', 'Right body'] }); await ready(page); const expected = await signature(page);
  await configure(page, { enabled: false }); await holdDecoding(page);
  await configure(page, { enabled: true, pages: ['OLD', 'Right body'] }); await decodingStarted(page);
  await configure(page, { pages: ['NEW', 'Right body'] });
  await expect(paints(page)).toHaveCount(0); await cssInk(input(page));
  await releaseDecoding(page); await ready(page); await expect(input(page)).toHaveValue('NEW');
  expect(await signature(page)).toBe(expected);
});

test('retry invalidates readiness before a replacement decode can paint', async ({ page }) => {
  await open(page); const control = input(page), node = await control.elementHandle();
  await holdDecoding(page); await configure(page, { renderKey: 1 }); await decodingStarted(page);
  await expect(paints(page)).toHaveCount(0); await cssInk(control); await noVisiblePaint(page);
  expect(await control.evaluate((element, old) => element === old, node)).toBe(true);
  await releaseDecoding(page); await ready(page); await expect(control).toHaveValue('Alpha body');
});

test('missing glyph, width/height overflow and failed font requests leave accepted body text readable', async ({ page }) => {
  await open(page);
  for (const value of [{ missing: true, pages: ['Z', 'Right body'] }, { missing: false, pages: ['A'.repeat(200), 'Right body'] },
    { pages: ['A\n'.repeat(30), 'Right body'] }] as const) {
    const before = await page.evaluate(() => window.bookBodyQA.errors.length);
    await configure(page, value); await expect.poll(() => page.evaluate(() => window.bookBodyQA.errors.length)).toBeGreaterThan(before);
    await expect(leaf(page).locator('[data-book-body-ready="true"]')).toHaveCount(0); await cssInk(input(page));
    await expect(input(page)).toHaveValue(value.pages[0]); await ready(page, 'a', 1);
  }
  await configure(page, { pages: ['Alpha body', 'Right body'], fontUrl: '/qa-book-body-404.png' });
  await expect.poll(() => page.evaluate(() => window.bookBodyQA.errors.some(error => /404|fetch|decode|image|resource/i.test(error.message)))).toBe(true);
  await expect(paints(page)).toHaveCount(0); await cssInk(input(page));
  await configure(page, { enabled: false });
  await page.reload(); await ready(page); expect(await page.evaluate(() => window.bookBodyQA.errors)).toEqual([]);
});

test('context loss restores CSS for that page and explicit retry supplies a new current owner', async ({ page }) => {
  await open(page); const control = input(page), node = await control.elementHandle();
  await leaf(page).locator('.mc-book__body-painter canvas').evaluate(element => {
    const extension = (element as HTMLCanvasElement).getContext('webgl')!.getExtension('WEBGL_lose_context');
    if (!extension) throw Error('Real context loss extension required'); extension.loseContext();
  });
  await expect(leaf(page).locator('[data-book-body-ready="true"]')).toHaveCount(0); await cssInk(control); await ready(page, 'a', 1);
  await configure(page, { renderKey: 1 }); await ready(page);
  expect(await control.evaluate((element, old) => element === old, node)).toBe(true); await expect(control).toHaveValue('Alpha body');
});

test('two Books keep independent paint, focus, controlled values, errors and unmount lifetimes', async ({ page }) => {
  await open(page); await page.evaluate(() => window.bookBodyQA.showSecond(true)); await ready(page, 'b');
  const other = input(page, 0, 'b'), node = await other.elementHandle(), expected = await signature(page, 0, 'b');
  await input(page).focus(); await noVisiblePaint(page); await ready(page, 'b');
  await configure(page, { fontUrl: '/qa-book-body-a-only-404.png' }); await page.locator('#outside').click();
  await expect.poll(() => page.evaluate(() => window.bookBodyQA.errors.some(error => error.book === 'a'))).toBe(true);
  expect(await page.evaluate(() => window.bookBodyQA.errors.filter(error => error.book === 'b'))).toEqual([]);
  await ready(page, 'b'); expect(await signature(page, 0, 'b')).toBe(expected);
  await configure(page, { mounted: false }); await ready(page, 'b');
  expect(await other.evaluate((element, old) => element === old, node)).toBe(true); await expect(other).toHaveValue('Alpha body');
});

for (const inactive of ['signing', 'readOnly', 'hidden'] as const) test(`invalid declared body profile throws before font I/O even while ${inactive}`, async ({ page }) => {
  let requests = 0; await page.route('**/qa-book-body-invalid.png', route => { requests++; return route.abort(); });
  await open(page); await configure(page, { invalid: 'rounding', fontUrl: '/qa-book-body-invalid.png',
    ...(inactive === 'signing' ? { mode: 'signing' as const } : { [inactive]: true }) });
  await expect(host(page).getByRole('alert')).toBeVisible();
  expect(await page.evaluate(() => window.bookBodyQA.boundaries.length)).toBeGreaterThan(0);
  expect(requests).toBe(0); await expect(paints(page)).toHaveCount(0);
});

test('both explicit clip policies and renderKey changes keep current accepted input identity', async ({ page }) => {
  await open(page); const control = input(page), node = await control.elementHandle();
  await configure(page, { clipRounding: 'logical-stage-floor' }); await ready(page);
  await configure(page, { clipRounding: 'physical-floor', renderKey: 4 }); await ready(page);
  expect(await control.evaluate((element, old) => element === old, node)).toBe(true);
  expect(await page.evaluate(() => window.bookBodyQA.errors)).toEqual([]);
});
