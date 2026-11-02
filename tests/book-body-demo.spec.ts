import { expect, test } from '@playwright/test';

test('public Books idle painter returns ownership to the real input and keeps accepted text across signing', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/#books');
  const editor = page.locator('[data-book-editor-example]');
  const toggle = editor.getByRole('switch', { name: 'Source idle page text', exact: true });
  const available = !await toggle.isDisabled();
  await test.info().attach('book-body-font-availability', { body: JSON.stringify({ available }), contentType: 'application/json' });
  if (!available) {
    await expect(editor.getByRole('textbox', { name: 'Draft leaf 1', exact: true })).toBeEditable();
    await expect(editor.locator('.mc-book__body-painter')).toHaveCount(0);
    return;
  }
  await editor.getByRole('button', { name: 'Load two-line sample', exact: true }).click();
  const input = editor.getByRole('textbox', { name: 'Draft leaf 1', exact: true });
  const handle = await input.elementHandle();
  await editor.getByRole('switch', { name: 'Source pencil rendering', exact: true }).check();
  await expect(editor.locator('.mc-book__pencil-painters[data-source-pencil-ready]')).toHaveCount(2);
  const labels = editor.getByRole('switch', { name: 'Source book labels', exact: true });
  if (!await labels.isDisabled()) {
    await labels.check();
    await expect(editor.locator('.mc-book__counter-painter[data-book-label-ready]')).toHaveCount(1);
    await expect(editor.locator('.mc-book__footer-painter[data-book-label-ready]')).toHaveCount(1);
  }
  await toggle.check();
  await expect(editor.locator('[data-book-body-ready]')).toHaveCount(2);
  await expect(input).toHaveValue('Bedrock UI 0123456789 abc XYZ\n像素字体测试');
  await input.focus(); await expect(input).toBeFocused();
  expect(await input.evaluate(node => getComputedStyle(node).color)).not.toBe('rgba(0, 0, 0, 0)');
  await input.fill('A retained note');
  await editor.getByRole('heading', { name: 'Book and quill', exact: true }).click();
  await expect(editor.locator('[data-book-body-ready]')).toHaveCount(2);
  expect(await input.evaluate((node, old) => node === old, handle)).toBe(true);
  await editor.locator('[data-book-action=sign-open]').click();
  await expect(editor.locator('[data-book-body-ready]')).toHaveCount(0);
  await editor.locator('[data-book-action=sign-cancel]').click();
  await expect(editor.locator('[data-book-body-ready]')).toHaveCount(2);
  await expect(input).toHaveValue('A retained note');
  expect(await input.evaluate((node, old) => node === old, handle)).toBe(true);
  await toggle.uncheck(); await expect(editor.locator('.mc-book__body-painter')).toHaveCount(0);
  await expect(input).toHaveValue('A retained note'); expect(errors).toEqual([]);
});
