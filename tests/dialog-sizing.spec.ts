import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const url = '/demo/dialog-sizing-fixture.html';
async function open(page: Page, mode: string) {
  await page.getByRole('button', { name: `Open ${mode} dialog`, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: `Sizing ${mode}`, exact: true });
  await expect(dialog).toBeVisible();return dialog;
}
async function dimensions(dialog: Locator) {
  return dialog.evaluate(node => { const r = node.getBoundingClientRect();return [r.width, r.height]; });
}
async function assertClipped(dialog: Locator) {
  const result = await dialog.evaluate(node => [node, node.querySelector('.mc-dialog__body')!].map(element => {
    const target = element as HTMLElement;target.scrollTop = 350;target.scrollLeft = 250;
    return { top: target.scrollTop, left: target.scrollLeft, clientWidth: target.clientWidth, scrollWidth: target.scrollWidth,
      clientHeight: target.clientHeight, scrollHeight: target.scrollHeight, overflow: getComputedStyle(target).overflow };
  }));
  for (const element of result) expect({ top: element.top, left: element.left, overflow: element.overflow }).toEqual({ top: 0, left: 0, overflow: 'clip' });
  expect(result[1]!.scrollWidth).toBeGreaterThan(result[1]!.clientWidth);
  expect(result[1]!.scrollHeight).toBeGreaterThan(result[1]!.clientHeight);
  const body = dialog.locator('.mc-dialog__body');await body.hover();await dialog.page().mouse.wheel(200, 400);
  expect(await body.evaluate(node => [node.scrollTop, node.scrollLeft])).toEqual([0, 0]);
  expect(await dialog.evaluate(node => [node.scrollTop, node.scrollLeft])).toEqual([0, 0]);
}
test.beforeEach(async ({ page }) => { await page.goto(url);await page.evaluate(() => document.fonts.ready); });

test('explicit border-box dimensions clip actual overflow instead of merely hiding scrollbars', async ({ page }) => {
  const dialog = await open(page, 'numeric');expect(await dimensions(dialog)).toEqual([640, 360]);
  await assertClipped(dialog);
  const outer = await dialog.boundingBox(), footer = await dialog.locator('.mc-dialog__footer').boundingBox();
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(outer!.y + outer!.height);
  await expect(dialog.getByRole('button', { name: 'Footer done', exact: true })).toBeVisible();
});

test('CSS lengths, inline style precedence and explicit oversized height retain the caller dimensions', async ({ page }) => {
  for (const [mode, expected] of [
    ['css-length', [1160, 320]], ['style-override', [520, 300]], ['oversize', [700, 1100]],
  ] as const) {
    const dialog = await open(page, mode);expect(await dimensions(dialog)).toEqual(expected);
    await assertClipped(dialog);await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();
  }
});

test('default dimensions stay within desktop and narrow viewport bounds without creating an implicit scroll container', async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 1000 }, { width: 360, height: 640 }]) {
    await page.setViewportSize(viewport);const dialog = await open(page, 'default');
    const [width, height] = await dimensions(dialog);
    expect(width).toBe(Math.min(480, viewport.width - 32));expect(height).toBeLessThanOrEqual(viewport.height - 40);
    await assertClipped(dialog);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();
  }
});

test('footer external form validation, focus trap and Escape restoration survive explicit sizing', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Open external-form dialog', exact: true });
  const dialog = await open(page, 'external-form'), close = dialog.getByRole('button', { name: 'Close dialog', exact: true });
  const field = dialog.getByRole('textbox', { name: 'World name', exact: true }), submit = dialog.getByRole('button', { name: 'Save external form', exact: true });
  await expect(close).toBeFocused();await submit.focus();await submit.press('Tab');await expect(close).toBeFocused();
  await close.press('Shift+Tab');await expect(submit).toBeFocused();
  await submit.click();await expect(dialog).toBeVisible();await expect(field).toBeFocused();
  await expect(page.getByLabel('Dialog submission')).toBeEmpty();
  await field.fill('Pixel world');await submit.click();await expect(dialog).not.toBeVisible();
  await expect(page.getByLabel('Dialog submission')).toHaveText('[["world","Pixel world"]]');
  await expect(trigger).toBeFocused();
  await trigger.click();await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();
});

test('an explicit host ScrollArea still scrolls while the dialog and body remain clipped', async ({ page }) => {
  const dialog = await open(page, 'host-scroll'), viewport = dialog.getByRole('region', { name: 'Host-controlled scroll content', exact: true });
  await expect(viewport).toBeVisible();await viewport.focus();await viewport.press('End');
  await expect.poll(() => viewport.evaluate(node => node.scrollTop)).toBeGreaterThan(500);
  expect(Number(await page.getByLabel('Host scroll position').textContent())).toBeGreaterThan(500);
  expect(await dialog.evaluate(node => [node.scrollTop, node.querySelector('.mc-dialog__body')!.scrollTop])).toEqual([0, 0]);
  await viewport.press('Home');await expect.poll(() => viewport.evaluate(node => node.scrollTop)).toBe(0);
  await viewport.hover();await page.mouse.wheel(0, 160);await expect.poll(() => viewport.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
});
