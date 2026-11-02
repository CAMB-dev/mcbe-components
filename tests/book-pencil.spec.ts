import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const url = '/demo/book-pencil-fixture.html';
const painters = '.mc-book__pencil-painters[data-source-pencil-ready]';
const edit = '.mc-book__edit';
async function configure(page: Page, next: Parameters<Window['bookPencilQA']['configure']>[0]) {
  await page.evaluate(value => window.bookPencilQA.configure(value), next);
}
async function ready(page: Page) { await expect(page.locator(painters)).toHaveCount(2); }
async function background(page: Page) { return page.locator(edit).first().evaluate(e => getComputedStyle(e).backgroundImage); }

test('source pencil preserves both real hitboxes, state selection, focus and page action identity', async ({ page }) => {
  const failures: string[] = []; page.on('pageerror', error => failures.push(error.message));
  await page.goto(url); await ready(page);
  const first = page.locator(edit).first(), paint = page.locator('.mc-book__pencil-painters').first();
  await expect(first).toHaveRole('button');
  expect(await first.evaluate(e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; })).toEqual([38, 36]);
  expect(await background(page)).toBe('none');
  await expect(paint.locator('.mc-book__pencil-paint--0 canvas')).toBeVisible();
  await first.hover(); await expect(paint.locator('.mc-book__pencil-paint--1 canvas')).toBeVisible();
  await page.mouse.down(); await expect(paint.locator('.mc-book__pencil-paint--2 canvas')).toBeVisible();
  await page.mouse.up();
  expect(await page.evaluate(() => window.bookPencilQA.actions)).toEqual([0]);
  await page.mouse.move(0, 0); await first.focus(); await first.press('Space');
  expect(await page.evaluate(() => window.bookPencilQA.actions)).toEqual([0, 0]);
  await configure(page, { spread: 1 }); await ready(page);
  await page.locator(edit).last().click();
  expect(await page.evaluate(() => window.bookPencilQA.actions)).toEqual([0, 0, 3]);
  expect(await page.evaluate(() => window.bookPencilQA.errors)).toEqual([]); expect(failures).toEqual([]);
});

for (const transition of ['signing', 'off'] as const) test(`same-profile reactivation after ${transition} keeps CSS until newly decoded painters are ready`, async ({ page }) => {
  await page.goto(url); await ready(page);
  await page.evaluate(() => {
    const decode = window.createImageBitmap;
    const controls = window as unknown as { releasePencilDecode: (() => void)[] };
    controls.releasePencilDecode = [];
    window.createImageBitmap = ((...args: unknown[]) => new Promise(resolve => {
      controls.releasePencilDecode.push(() => resolve(Reflect.apply(decode, window, args)));
    })) as typeof createImageBitmap;
  });
  await configure(page, transition === 'signing' ? { mode: 'signing' } : { raster: false });
  await expect(page.locator('.mc-book__pencil-painters')).toHaveCount(0);
  const button = await page.locator(edit).first().elementHandle();
  await configure(page, transition === 'signing' ? { mode: 'pages' } : { raster: true });
  await expect.poll(() => page.evaluate(() => (window as unknown as { releasePencilDecode: unknown[] }).releasePencilDecode.length)).toBe(6);
  await expect(page.locator(painters)).toHaveCount(0);
  expect(await background(page)).toContain('book_edit_default');
  expect(await page.locator(edit).first().evaluate((e, old) => e === old, button)).toBe(true);
  await page.evaluate(() => { for (const release of (window as unknown as { releasePencilDecode: (() => void)[] }).releasePencilDecode) release(); });
  await ready(page); expect(await background(page)).toBe('none');
});

test('failed or lost state restores original CSS and a fresh render key can retry', async ({ page }) => {
  await page.goto(url); await ready(page);
  await configure(page, { bad: true });
  await expect.poll(() => page.evaluate(() => window.bookPencilQA.errors.length)).toBe(2);
  await expect(page.locator(painters)).toHaveCount(0); expect(await background(page)).toContain('book_edit_default');
  await configure(page, { bad: false }); await ready(page);
  await page.locator('.mc-book__pencil-paint--0 canvas').first().evaluate(e => {
    (e as HTMLCanvasElement).getContext('webgl')!.getExtension('WEBGL_lose_context')!.loseContext();
  });
  await expect(page.locator(painters)).toHaveCount(1);
  expect(await background(page)).toContain('book_edit_default');
  await configure(page, { retry: 1 }); await ready(page); expect(await background(page)).toBe('none');
  await configure(page, { disabled: true }); await expect(page.locator('.mc-book__pencil-painters')).toHaveCount(0);
  await configure(page, { disabled: false }); await ready(page);
});
