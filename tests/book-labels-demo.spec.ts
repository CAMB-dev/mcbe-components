import { expect, test } from '@playwright/test';

test('public Books label profile keeps real draft controls and original source pencils across visual switches', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#books');
  const editor = page.locator('[data-book-editor-example]'), labelToggle = editor.getByRole('switch', { name: 'Source book labels', exact: true });
  const available = !await labelToggle.isDisabled();
  await test.info().attach('book-label-font-availability', { body: JSON.stringify({ available }), contentType: 'application/json' });
  if (!available) {
    // The optional original font is caller-owned. Unprepared checkouts still
    // expose a usable ordinary Book; they cannot activate an unavailable font.
    await expect(editor.getByRole('textbox', { name: 'Draft leaf 1', exact: true })).toBeEditable();
    await expect(editor.locator('.mc-book__counter-painter')).toHaveCount(0); return;
  }
  const input = editor.getByRole('textbox', { name: 'Draft leaf 1', exact: true }); await input.fill('A retained journal entry');
  const handle = await input.elementHandle();
  await editor.getByRole('switch', { name: 'Source pencil rendering', exact: true }).check();
  await expect(editor.locator('.mc-book__pencil-painters[data-source-pencil-ready]')).toHaveCount(2);
  await labelToggle.check();
  await expect(editor.locator('.mc-book__counter-painter[data-book-label-ready]')).toHaveCount(1);
  await expect(editor.locator('.mc-book__footer-painter[data-book-label-ready]')).toHaveCount(1);
  await expect(editor.locator('.mc-book__pencil-painters[data-source-pencil-ready]')).toHaveCount(2);
  await editor.locator('[data-book-action=sign-open]').click();
  await expect(editor.locator('.mc-book')).toHaveAttribute('data-mode', 'signing');
  await expect(editor.locator('.mc-book__footer-painter[data-book-label-ready]')).toHaveCount(2);
  await editor.locator('[data-book-action=sign-cancel]').click();
  await expect(editor.locator('.mc-book__counter-painter[data-book-label-ready]')).toHaveCount(1);
  await expect(input).toHaveValue('A retained journal entry'); expect(await input.evaluate((e, old) => e === old, handle)).toBe(true);
  await labelToggle.uncheck(); await expect(editor.locator('.mc-book__counter-painter')).toHaveCount(0);
  await expect(input).toHaveValue('A retained journal entry'); expect(errors).toEqual([]);
});
