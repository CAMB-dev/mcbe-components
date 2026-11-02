import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
const url = '/demo/book-label-fixture.html';
const counter = '.mc-book__counter-painter[data-book-label-ready]';
const footer = '.mc-book__footer-painter[data-book-label-ready]';
async function configure(page: Page, value: Parameters<Window['bookLabelQA']['configure']>[0]) { await page.evaluate(next => window.bookLabelQA.configure(next), value); }
async function ready(page: Page) { await expect(page.locator(counter)).toHaveCount(1); await expect(page.locator(footer)).toHaveCount(1); }

test('source captions preserve accessible names, real input ownership, signing and all footer state canvases', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(url); await ready(page);
  const input = page.locator('textarea').first(), handle = await input.elementHandle();
  const sign = page.getByRole('button', { name: 'Sign book', exact: true }), paints = page.locator('.mc-book__footer-painter');
  await expect(sign).toHaveAccessibleName('Sign book');
  await expect(paints.locator('.mc-book__label-paint--0 canvas')).toBeVisible();
  await sign.hover(); await expect(paints.locator('.mc-book__label-paint--1 canvas')).toBeVisible();
  await page.mouse.down(); await expect(paints.locator('.mc-book__label-paint--2 canvas')).toBeVisible();
  await page.mouse.up(); await expect(page.locator('.mc-book')).toHaveAttribute('data-mode', 'signing');
  await expect(page.locator(counter)).toHaveCount(0); await expect(page.locator(footer)).toHaveCount(2);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await ready(page);
  expect(await input.evaluate((node, old) => node === old, handle)).toBe(true);
  await configure(page, { enabled: false }); await input.fill('Retained real input'); await configure(page, { enabled: true }); await ready(page);
  await expect(input).toHaveValue('Retained real input'); expect(await input.evaluate((node, old) => node === old, handle)).toBe(true);
  expect(await page.evaluate(() => window.bookLabelQA.errors)).toEqual([]); expect(errors).toEqual([]);
});

for (const transition of ['off', 'signing'] as const) test(`reactivating ${transition} cannot inherit an old ready caption`, async ({ page }) => {
  await page.goto(url); await ready(page);
  await configure(page, transition === 'off' ? { enabled: false } : { mode: 'signing' });
  await expect(page.locator(footer)).toHaveCount(transition === 'off' ? 0 : 2);
  await page.evaluate(() => {
    const original = window.createImageBitmap;
    (window as unknown as { releaseLabels: (() => void)[] }).releaseLabels = [];
    window.createImageBitmap = ((...args: unknown[]) => new Promise(resolve => {
      (window as unknown as { releaseLabels: (() => void)[] }).releaseLabels.push(() => resolve(Reflect.apply(original, window, args)));
    })) as typeof createImageBitmap;
  });
  await configure(page, transition === 'off' ? { enabled: true } : { mode: 'pages' });
  await expect.poll(() => page.evaluate(() => (window as unknown as { releaseLabels: unknown[] }).releaseLabels.length)).toBeGreaterThan(0);
  await expect(page.locator(counter)).toHaveCount(0); await expect(page.locator(footer)).toHaveCount(0);
  expect(await page.locator('.mc-book__page-number').first().evaluate(e => getComputedStyle(e).color)).not.toBe('rgba(0, 0, 0, 0)');
  await expect(page.getByRole('button', { name: 'Sign book', exact: true })).toHaveAccessibleName('Sign book');
  // The loader has bounded concurrency. Releasing one wave lets later URLs
  // reach the decoder; do not assume all pending assets start simultaneously.
  await expect.poll(() => page.evaluate(() => {
    for (const release of (window as unknown as { releaseLabels: (() => void)[] }).releaseLabels.splice(0)) release();
    return document.querySelectorAll('.mc-book__counter-painter[data-book-label-ready]').length === 1
      && document.querySelectorAll('.mc-book__footer-painter[data-book-label-ready]').length === 1;
  })).toBe(true);
  await ready(page);
});

test('source request errors and missing glyphs retain CSS, context loss and explicit retry remain local', async ({ page }) => {
  await page.goto(url); await ready(page);
  await configure(page, { bad: true }); await expect.poll(() => page.evaluate(() => window.bookLabelQA.errors.length)).toBeGreaterThan(0);
  await expect(page.locator(counter)).toHaveCount(0); await expect(page.locator(footer)).toHaveCount(0);
  await configure(page, { bad: false, missing: true }); await expect(page.locator(footer)).toHaveCount(1);
  await expect(page.locator(counter)).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.bookLabelQA.errors.some(e => /Missing bitmap glyph/.test(e.message)))).toBe(true);
  await configure(page, { missing: false }); await ready(page);
  await page.locator('.mc-book__counter-painter canvas').evaluate(e => (e as HTMLCanvasElement).getContext('webgl')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(page.locator(counter)).toHaveCount(0); await expect(page.locator(footer)).toHaveCount(1);
  await configure(page, { retry: 1 }); await ready(page);
  await configure(page, { disabled: true }); await expect(page.locator(footer)).toHaveCount(0);
  await expect(page.locator('[data-book-action=sign-open]')).toBeDisabled();
  await configure(page, { disabled: false }); await ready(page);
});

test('overlapping long caption controls paint all backdrops first and clip each ink batch to its own control', async ({ page }) => {
  await page.addInitScript(() => {
    const draw = WebGLRenderingContext.prototype.drawElements;
    WebGLRenderingContext.prototype.drawElements = function(...args) {
      draw.apply(this, args);
      const canvas = this.canvas as HTMLCanvasElement;
      if (!canvas.closest('.mc-book__counter-painter')) return;
      const rows = JSON.parse(canvas.dataset.draws ?? '[]'); rows.push({ count: args[1], clip: [...this.getParameter(this.SCISSOR_BOX)] }); canvas.dataset.draws = JSON.stringify(rows);
    };
  });
  await page.goto(url + '?long=1'); await ready(page);
  const rows = await page.locator('.mc-book__counter-painter canvas').evaluate(e => JSON.parse((e as HTMLElement).dataset.draws!)) as { count: number; clip: number[] }[];
  expect(rows.slice(-2).map(r => r.count)).toEqual([600, 600]);
  expect(rows.slice(0, -2).every(r => r.count <= 54)).toBe(true);
  expect(rows.slice(-2).map(r => r.clip)).toEqual([[0, 0, 321, 21], [300, 0, 321, 21]]);
});
