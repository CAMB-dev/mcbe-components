import { expect, test } from '@playwright/test';

test('public Books preview toggles the source painter while preserving draft inputs and page actions', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#books');
  const example = page.locator('[data-book-editor-example]');
  const text = example.getByRole('textbox', { name: 'Draft leaf 1', exact: true });
  await text.fill('My retained draft'); const input = await text.elementHandle();
  const toggle = example.getByRole('switch', { name: 'Source pencil rendering', exact: true });
  await toggle.check();
  await expect(example.locator('.mc-book__pencil-painters[data-source-pencil-ready]')).toHaveCount(2);
  await expect(text).toHaveValue('My retained draft');
  expect(await text.evaluate((node, old) => node === old, input)).toBe(true);
  await example.getByRole('button', { name: 'Edit page', exact: true }).first().click();
  await expect(text).toBeFocused();
  await toggle.uncheck(); await expect(example.locator('.mc-book__pencil-painters')).toHaveCount(0);
  await expect(text).toHaveValue('My retained draft');
  expect(await text.evaluate((node, old) => node === old, input)).toBe(true);
  expect(errors).toEqual([]);
});
