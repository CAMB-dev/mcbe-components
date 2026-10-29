import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const fixture = '/demo/grindstone-result-fixture.html';
async function events(page: Page) {
  return JSON.parse(await page.getByLabel('Grindstone result events', { exact: true }).innerText()) as { primary: number; secondary: number };
}
async function takeWithMouseAndKeyboard(result: Locator) {
  // aria-disabled keeps the actual native button focusable; force pointer input
  // exercises its guard rather than Playwright's own enabled/actionability gate.
  await result.click({ force: true }); await result.click({ button: 'right', force: true });
  await result.focus(); await result.press('Enter'); await result.press('Shift+F10');
}

for (const mode of ['null', 'zero', 'negative', 'nan', 'infinity']) test(`grindstone ${mode} result remains focusable and rejects every take action`, async ({ page }) => {
  await page.goto(fixture); await page.getByLabel('Result state', { exact: true }).selectOption(mode);
  const result = page.locator('.mc-grindstone__result');
  await expect(result).toHaveAttribute('data-empty', 'true'); await expect(result).not.toHaveAttribute('disabled');
  await takeWithMouseAndKeyboard(result);
  expect(await events(page)).toEqual({ primary: 0, secondary: 0 });
  await expect(result).toHaveAttribute('aria-disabled', 'true'); await expect(result).toBeFocused();
  await result.press('ArrowLeft'); await expect(page.locator('.mc-grindstone__additional')).toBeFocused();
  await page.locator('.mc-grindstone__additional').press('ArrowUp'); await expect(page.locator('.mc-grindstone__input')).toBeFocused();
  await page.locator('.mc-grindstone__input').press('ArrowRight'); await expect(result).toBeFocused();
});

test('grindstone invalid output stays visible and focusable while both take paths are guarded', async ({ page }) => {
  await page.goto(fixture); await page.getByLabel('Result state', { exact: true }).selectOption('invalid');
  const result = page.locator('.mc-grindstone__result');
  await expect(result).not.toHaveAttribute('data-empty'); await expect(result.locator('img')).toHaveCount(1);
  await expect(page.getByRole('img', { name: 'Items cannot be combined', exact: true })).toBeVisible();
  await takeWithMouseAndKeyboard(result); expect(await events(page)).toEqual({ primary: 0, secondary: 0 });
  await expect(result).toHaveAttribute('aria-disabled', 'true'); await expect(result).not.toHaveAttribute('disabled'); await expect(result).toBeFocused();
});

test('grindstone valid output keeps its normal slot and emits each mouse and keyboard action once', async ({ page }) => {
  await page.goto(fixture); const result = page.locator('.mc-grindstone__result');
  await expect(result).toHaveCSS('width', '36px'); await expect(result).toHaveCSS('height', '36px');
  await expect(result.locator('img')).toHaveCSS('width', '32px'); await expect(result.locator('img')).toHaveCSS('height', '32px');
  await takeWithMouseAndKeyboard(result); expect(await events(page)).toEqual({ primary: 2, secondary: 2 });
  await expect(result).not.toHaveAttribute('aria-disabled', 'true');
});

test('taking and clearing a grindstone result preserves the same focused slot and blocks further actions', async ({ page }) => {
  await page.goto(fixture); await page.getByLabel('Consume on take', { exact: true }).check();
  const result = page.locator('.mc-grindstone__result');
  const handle = await result.elementHandle();
  await result.focus(); await result.press('Enter');
  await expect(result).toHaveAttribute('data-empty', 'true'); await expect(result).toBeFocused();
  expect(await result.evaluate((node, prior) => node === prior, handle)).toBe(true);
  await takeWithMouseAndKeyboard(result); expect(await events(page)).toEqual({ primary: 1, secondary: 0 });
});
