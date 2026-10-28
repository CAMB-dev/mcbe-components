import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.beforeEach(async ({ page }) => { await page.goto('/calibration.html'); });

test('combobox separates selected and active styles and commits clicks', async ({ page }, testInfo) => {
  const field = page.locator('[data-case="combobox"]'); const trigger = field.getByRole('combobox', { name: 'Difficulty' });
  await trigger.click();
  const normal = field.getByRole('option', { name: 'Normal', exact: true }); const hard = field.getByRole('option', { name: 'Hard', exact: true });
  await expect(normal).toHaveAttribute('aria-selected', 'true');
  await hard.hover();
  await expect(normal).toHaveCSS('background-color', 'rgb(74, 74, 74)');
  await expect(hard).toHaveCSS('background-color', 'rgb(30, 122, 0)');
  await expect(hard).toHaveAttribute('aria-selected', 'false');
  await page.screenshot({ path: `test-results/${testInfo.project.name}-combobox-open.png` });
  await hard.click(); await expect(trigger).toHaveText('Hard'); await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click(); await expect(field.getByRole('option', { name: 'Hard', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test('combobox keyboard skips disabled options and Escape cancels', async ({ page }) => {
  const field = page.locator('[data-case="combobox"]'); const trigger = field.getByRole('combobox');
  await trigger.focus(); await trigger.press('ArrowDown'); await trigger.press('ArrowUp');
  const peaceful = field.getByRole('option', { name: 'Peaceful', exact: true });
  await expect(trigger).toHaveAttribute('aria-activedescendant', await peaceful.getAttribute('id') ?? '');
  await trigger.press('Enter'); await expect(trigger).toHaveText('Peaceful');
  await trigger.press('End'); await trigger.press('Escape'); await expect(trigger).toHaveText('Peaceful');
  await expect(trigger).toBeFocused();
});

test('combobox supports typeahead, Home, End and Tab', async ({ page }) => {
  const field = page.locator('[data-case="combobox"]'); const trigger = field.getByRole('combobox');
  await trigger.focus(); await trigger.press('h');
  await expect(trigger).toHaveText('Normal');
  await expect(trigger).toHaveAttribute('aria-activedescendant', await field.getByRole('option', { name: 'Hard', exact: true }).getAttribute('id') ?? '');
  await trigger.press('Enter'); await expect(trigger).toHaveText('Hard');
  await trigger.press('Home');
  await expect(trigger).toHaveAttribute('aria-activedescendant', await field.getByRole('option', { name: 'Peaceful', exact: true }).getAttribute('id') ?? '');
  await trigger.press('Tab'); await expect(field.getByRole('button', { name: 'Reset' })).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('combobox submits FormData and resets uncontrolled selection', async ({ page }) => {
  const field = page.locator('[data-case="combobox"]'); const trigger = field.getByRole('combobox');
  await trigger.click(); await field.getByRole('option', { name: 'Hard', exact: true }).click();
  await field.getByRole('button', { name: 'Save' }).click();
  await expect(field.getByLabel('Submitted difficulty')).toHaveText('hard');
  await field.getByRole('button', { name: 'Reset' }).click(); await expect(trigger).toHaveText('Normal');
});

test('required combobox validates and focuses the visible trigger', async ({ page }) => {
  const field = page.locator('[data-case="combobox-required"]'); const trigger = field.getByRole('combobox');
  await field.getByRole('button', { name: 'Validate' }).click();
  await expect(trigger).toBeFocused(); await expect(trigger).toHaveAttribute('aria-invalid', 'true');
  await trigger.click(); await field.getByRole('option', { name: 'Creative', exact: true }).click();
  await expect(trigger).not.toHaveAttribute('aria-invalid', 'true');
  await field.getByRole('button', { name: 'Validate' }).click();
  await expect(page.getByLabel('Submitted difficulty')).toHaveText('valid');
});

test('controlled combobox reports choice without changing its external value', async ({ page }) => {
  const field = page.locator('[data-case="combobox-controlled"]'); const trigger = field.getByRole('combobox');
  await trigger.click(); await field.getByRole('option', { name: 'Hard', exact: true }).click();
  await expect(field.getByLabel('Attempted difficulty')).toHaveText('hard'); await expect(trigger).toHaveText('Normal');
  await trigger.click(); await expect(field.getByRole('option', { name: 'Normal', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test('combobox disabled states reject pointer selection', async ({ page }) => {
  await expect(page.locator('[data-case="combobox-disabled"]').getByRole('combobox')).toBeDisabled();
  const field = page.locator('[data-case="combobox"]'); const trigger = field.getByRole('combobox');
  await trigger.click(); const easy = field.getByRole('option', { name: 'Easy', exact: true });
  await expect(easy).toHaveAttribute('aria-disabled', 'true');
  const rect = await easy.boundingBox(); if (!rect) throw new Error('Missing disabled row');
  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await expect(trigger).toHaveText('Normal'); await expect(trigger).toHaveAttribute('aria-expanded', 'true');
});

test('popover fits the viewport and outside clicks dismiss it', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 400 });
  const field = page.locator('[data-case="combobox"]'); const trigger = field.getByRole('combobox');
  await trigger.click(); const rect = await field.getByRole('listbox').boundingBox();
  expect(rect).not.toBeNull(); expect(rect!.x).toBeGreaterThanOrEqual(0); expect(rect!.x + rect!.width).toBeLessThanOrEqual(320);
  expect(rect!.y).toBeGreaterThanOrEqual(0); expect(rect!.y + rect!.height).toBeLessThanOrEqual(400);
  await page.mouse.click(4, 4); await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('popover clamps to the layout viewport when wide content expands the mobile visual viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 400 });
  const field = page.locator('[data-case="combobox"]'); const trigger = field.getByRole('combobox');
  await trigger.evaluate(button => {
    const wide = document.createElement('div');
    Object.assign(wide.style, { position: 'absolute', left: '0', top: '0', width: '640px', height: '1px', pointerEvents: 'none' });
    document.body.append(wide);
    Object.assign(button.style, { position: 'fixed', left: '240px', top: '320px', zIndex: '1000' });
  });
  await trigger.click({ position: { x: 20, y: 20 } }); const list = field.getByRole('listbox');
  await expect(list).toHaveAttribute('data-side', 'top');
  const rect = await list.boundingBox(); expect(rect).not.toBeNull();
  expect(rect!.x).toBeGreaterThanOrEqual(8); expect(rect!.x + rect!.width).toBeLessThanOrEqual(312);
  expect(rect!.y).toBeGreaterThanOrEqual(8); expect(rect!.y + rect!.height).toBeLessThanOrEqual(392);
  await trigger.press('Home'); await trigger.press('Enter'); await expect(trigger).toHaveText('Peaceful');
});

test('combobox stays interactive inside a dialog and handles Escape first', async ({ page }) => {
  await page.getByRole('button', { name: 'Open settings dialog' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings dialog' }); const trigger = dialog.getByRole('combobox');
  await trigger.click(); await expect(dialog.getByRole('listbox')).toBeVisible();
  await trigger.press('Escape'); await expect(dialog).toBeVisible(); await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click(); await dialog.getByRole('option', { name: 'Hard', exact: true }).click(); await expect(trigger).toHaveText('Hard');
  await trigger.press('Escape'); await expect(dialog).not.toBeVisible();
});

test('open combobox has no serious or critical accessibility violations', async ({ page }) => {
  await page.locator('[data-case="combobox"]').getByRole('combobox').click();
  const result = await new AxeBuilder({ page }).include('[data-case="combobox"]').analyze();
  expect(result.violations.filter(item => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
});

test('real visual viewport panning keeps the visible keyboard anchor and popup in view', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Chromium mobile visual viewport panning');
  await page.evaluate(() => document.fonts.ready);
  const field = page.locator('[data-case="combobox"]'); const trigger = field.getByRole('combobox');
  // Keep this regression independent of unrelated calibration fixture widths.
  await page.evaluate(() => {
    const wide = document.createElement('div');
    Object.assign(wide.style, { position: 'absolute', left: '0', top: '0', width: '800px', height: '1px', pointerEvents: 'none' });
    document.body.append(wide);
  });
  for (const horizontal of [false, true]) {
    if (horizontal) await trigger.evaluate(button => {
      button.blur();
      Object.assign(button.style, { position: 'absolute', left: '550px', top: '80px', zIndex: '9999' });
    });
    await trigger.focus();
    const view = await page.evaluate(() => ({ left: visualViewport!.offsetLeft, top: visualViewport!.offsetTop }));
    expect(view.top).toBeGreaterThan(0);
    if (horizontal) expect(view.left).toBeGreaterThan(0);
    await trigger.press('h'); await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    // Active-option scrolling can pan again. Read popup and viewport atomically
    // rather than comparing against a stale viewport from before the key press.
    await expect.poll(() => field.getByRole('listbox').evaluate(list => {
      const rect = list.getBoundingClientRect(); const visual = visualViewport!;
      return rect.x >= visual.offsetLeft + 8 && rect.right <= visual.offsetLeft + visual.width - 8
        && rect.y >= visual.offsetTop + 8 && rect.bottom <= visual.offsetTop + visual.height - 8;
    })).toBe(true);
    await trigger.press('Enter'); await expect(trigger).toHaveText('Hard');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  }
});
