import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function ready(page: Page) {
  await page.goto('/demo/credits-fixture.html');
  await expect(page.getByRole('region', { name: 'Host credits' })).toBeVisible();
  await expect(page.locator('.mc-bitmap-text[data-render-state="ready"]')).toHaveCount(1);
}

test('controlled bitmap view uses fixed dimensions, clipping and one physical scale', async ({ page }) => {
  await ready(page);
  const sample = await page.evaluate(() => {
    const root = window.__creditsRollQA.getRoot()!, canvas = root.querySelector('canvas')!, bounds = root.getBoundingClientRect();
    return { width: bounds.width, height: bounds.height, canvas: [canvas.width, canvas.height], overflow: getComputedStyle(root).overflow,
      scrollHeight: root.scrollHeight, clientHeight: root.clientHeight, ref: root.dataset.consumerViewportRef,
      errors: window.__creditsRollQA.getErrors(), native: root.dataset.nativeCertified };
  });
  expect(sample).toEqual({ width: 300, height: 90, canvas: [18, 36], overflow: 'hidden', scrollHeight: 90, clientHeight: 90,
    ref: 'attached', errors: [], native: 'false' });
});

test('complete accessible transcript retains content order and literal player text', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.__creditsRollQA.configure({ mode: 'css', scale: 1, poem: true, playerName: '§b<Host>' }));
  await expect(page.getByRole('heading', { name: 'Host section' })).toHaveCount(1);
  const transcript = page.locator('.mc-credits-roll__transcript');
  await expect(transcript).toContainText('Hello §b<Host>');
  const text = await transcript.innerText();
  expect(text.indexOf('Host section')).toBeLessThan(text.indexOf('Host discipline'));
  expect(text.indexOf('Host One')).toBeLessThan(text.indexOf('Host Two'));
  expect(text.indexOf('Host Two')).toBeLessThan(text.indexOf('Hello §b<Host>'));
  expect(await page.locator('host,script[data-host-injected]').count()).toBe(0);
  await expect(page.locator('#render-error')).toBeEmpty();
});

test('offset updates preserve the root and both real refs release on unmount', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => { window.__creditsRollQA.getRoot()!.dataset.stableProbe = 'same-node'; window.__creditsRollQA.configure({ offset: 1.5, scale: 2 }); });
  await expect(page.locator('.mc-bitmap-text[data-render-state="ready"]')).toHaveCount(1);
  expect(await page.locator('.mc-credits-roll').getAttribute('data-stable-probe')).toBe('same-node');
  expect(await page.evaluate(() => window.__creditsRollQA.getRoot()?.dataset.consumerViewportRef)).toBe('attached');
  await page.evaluate(() => window.__creditsRollQA.unmount());
  await expect(page.locator('.mc-credits-roll')).toHaveCount(0);
  await expect(page.locator('#ref-status')).toHaveText('Viewport released');
  expect(await page.evaluate(() => window.__creditsRollQA.getRoot())).toBeNull();
});

test('a decoded font rectangle error reaches the host without an uncaught page error', async ({ page }) => {
  const exceptions: string[] = []; page.on('pageerror', error => exceptions.push(error.message));
  await ready(page);
  await page.evaluate(() => window.__creditsRollQA.configure({ oversizeGlyph: true }));
  await expect(page.locator('#render-error')).toContainText('Glyph rectangle exceeds');
  await expect(page.locator('.mc-bitmap-text[data-render-state="error"]')).toHaveCount(1);
  expect(exceptions).toEqual([]);
});

test('a delayed previous font cannot report an error into the replacement layout', async ({ page }) => {
  await ready(page);
  const source = await page.evaluate(() => window.__creditsRollQA.glyphPage);
  let release!: () => void, entered!: () => void, finished!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const requested = new Promise<void>(resolve => { entered = resolve; });
  const completed = new Promise<void>(resolve => { finished = resolve; });
  await page.route('**/credits-delayed-font.png', async route => {
    entered(); await gate;
    await route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from(source.split(',')[1]!, 'base64') }); finished();
  });
  try {
    await page.evaluate(() => window.__creditsRollQA.configure({ pageSource: '/credits-delayed-font.png', oversizeGlyph: true }));
    await requested;
    await expect(page.locator('.mc-bitmap-text[data-render-state="loading"]')).toHaveCount(1);
    await page.evaluate(() => window.__creditsRollQA.configure({ pageSource: '', oversizeGlyph: false }));
    await expect(page.locator('.mc-bitmap-text[data-render-state="ready"]')).toHaveCount(1);
    release(); await completed;
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(page.locator('#render-error')).toBeEmpty();
    expect(await page.evaluate(() => window.__creditsRollQA.getErrors())).toEqual([]);
  } finally { release(); }
});
