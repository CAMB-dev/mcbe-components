import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.beforeEach(async ({ page }) => { await page.goto('/calibration.html'); });

test('toggle buttons use native Enter/Space, controlled intent and disabled semantics', async ({ page }) => {
  const toggle = page.getByRole('button', { name: 'Fixture toggle', exact: true });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false'); await toggle.focus(); await toggle.press('Enter');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true'); await expect(page.getByLabel('Toggle intent', { exact: true })).toHaveText('true');
  await toggle.press('Space'); await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  const controlled = page.getByRole('button', { name: 'Controlled toggle', exact: true }); await controlled.click();
  await expect(controlled).toHaveAttribute('aria-pressed', 'false'); await expect(page.getByLabel('Toggle intent', { exact: true })).toHaveText('true');
  const disabled = page.getByRole('button', { name: 'Disabled selected toggle', exact: true });
  await expect(disabled).toBeDisabled(); await disabled.dispatchEvent('click'); await expect(disabled).toHaveAttribute('aria-pressed', 'true');
});

test('search clear restores focus, emits once and respects readonly/disabled state', async ({ page }) => {
  const fixture = page.locator('[data-case="settings-search"]'), input = fixture.getByRole('searchbox', { name: 'Fixture search' });
  await fixture.getByRole('button', { name: 'Clear search', exact: true }).click(); await expect(input).toHaveValue(''); await expect(input).toBeFocused();
  await expect(page.getByLabel('Search clear count', { exact: true })).toHaveText('1'); await expect(fixture.getByRole('button', { name: 'Clear search', exact: true })).toHaveCount(0);
  const readonly = page.locator('[data-case="settings-search-readonly"]'); await expect(readonly.getByRole('searchbox')).toHaveAttribute('readonly'); await expect(readonly.getByRole('button')).toHaveCount(0);
  const disabled = page.locator('[data-case="settings-search-disabled"]'); await expect(disabled.getByRole('searchbox')).toBeDisabled(); await expect(disabled.getByRole('button')).toBeDisabled();
  await disabled.getByRole('button').dispatchEvent('click'); await expect(disabled.getByRole('searchbox')).toHaveValue('Disabled');
});

test('search owns FormData, Enter callback and uncancelled form reset', async ({ page }) => {
  const fixture = page.locator('[data-case="settings-search"]'), input = fixture.getByRole('searchbox');
  await input.fill('diamonds'); await input.press('Enter'); await expect(page.getByLabel('Search callback', { exact: true })).toHaveText('diamonds'); await expect(page.getByLabel('Search form result', { exact: true })).toHaveText('diamonds');
  await fixture.getByRole('button', { name: 'Reset search form' }).click(); await expect(input).toHaveValue('initial');
  const cancelled = page.locator('[data-case="settings-search-reset-cancelled"]'); await cancelled.getByRole('searchbox').fill('Keep me'); await cancelled.getByRole('button', { name: 'Cancel search reset', exact: true }).click(); await expect(cancelled.getByRole('searchbox')).toHaveValue('Keep me');
});

test('controlled search reports attempted typing and clearing without taking ownership', async ({ page }) => {
  const fixture = page.locator('[data-case="settings-search-controlled"]'), input = fixture.getByRole('searchbox');
  await input.fill('attempt'); await expect(input).toHaveValue('Fixed query'); await expect(page.getByLabel('Search edit intent', { exact: true })).toHaveText('attempt');
  await fixture.getByRole('button', { name: 'Clear search' }).click(); await expect(input).toHaveValue('Fixed query'); await expect(page.getByLabel('Search edit intent', { exact: true })).toHaveText(''); await expect(input).toBeFocused();
});

test('IME search Enter does not report an unfinished search', async ({ page }) => {
  const input = page.locator('[data-case="settings-search"]').getByRole('searchbox'); await input.fill('杈撳叆');
  await input.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true, bubbles: true }); await expect(page.getByLabel('Search callback', { exact: true })).toHaveText('');
  await input.press('Enter'); await expect(page.getByLabel('Search callback', { exact: true })).toHaveText('杈撳叆');
});

test('navigation roves independently of selection, skips locked items and wraps', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'Fixture navigation', exact: true }), buttons = nav.getByRole('button');
  await buttons.nth(0).focus(); await buttons.nth(0).press('ArrowDown'); await expect(buttons.nth(2)).toBeFocused(); await expect(buttons.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await buttons.nth(2).press('Enter'); await expect(buttons.nth(2)).toHaveAttribute('aria-pressed', 'true'); await expect(page.getByLabel('Navigation intent', { exact: true })).toHaveText('audio');
  await buttons.nth(2).press('End'); await expect(buttons.nth(3)).toBeFocused(); await buttons.nth(3).press('ArrowDown'); await expect(buttons.nth(0)).toBeFocused();
  await buttons.nth(0).press('ArrowUp'); await expect(buttons.nth(3)).toBeFocused(); await buttons.nth(3).press('Home'); await expect(buttons.nth(0)).toBeFocused();
  await expect(nav.locator('button[tabindex="0"]')).toHaveCount(1); await expect(buttons.nth(1)).toBeDisabled();
});

test('controlled and disabled navigation preserve owner selection', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'Controlled navigation', exact: true }); await nav.getByRole('button', { name: 'Audio' }).click();
  await expect(nav.getByRole('button', { name: 'General' })).toHaveAttribute('aria-pressed', 'true'); await expect(nav.getByRole('button', { name: 'Audio' })).toHaveAttribute('aria-pressed', 'false'); await expect(page.getByLabel('Controlled navigation intent', { exact: true })).toHaveText('audio');
  const disabled = page.getByRole('navigation', { name: 'Disabled navigation', exact: true }); for (const button of await disabled.getByRole('button').all()) { await expect(button).toBeDisabled(); await expect(button).toHaveAttribute('tabindex', '-1'); }
});

test('setting row connects its label, description and disabled state to the real control', async ({ page }) => {
  const input = page.getByRole('textbox', { name: 'World title', exact: true }); await expect(input).toHaveAccessibleDescription('Shown in the world list');
  await page.locator('label[for="settings-world-title"]').click(); await expect(input).toBeFocused(); await expect(input).toHaveAttribute('aria-labelledby', 'settings-world-title-label');
  await expect(page.getByRole('textbox', { name: 'Locked title', exact: true })).toBeDisabled(); await expect(page.getByRole('textbox', { name: 'Locked title', exact: true })).toHaveAccessibleDescription('Host controls this setting');
  await expect(page.getByRole('textbox', { name: 'Inline world title', exact: true })).toHaveAccessibleDescription('Inline description');
});

test('keybinding captures physical chords, clears, submits hidden value and resets', async ({ page }) => {
  const fixture = page.locator('[data-case="settings-keybinding"]'), button = fixture.locator('.mc-keybinding__button'); await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true'); await button.press('Control+Shift+K'); await expect(button).toHaveText('Ctrl + Shift + K');
  await expect(fixture.locator('input[type="hidden"]')).toHaveValue('Control+Shift+KeyK'); await expect(page.getByLabel('Binding intent', { exact: true })).toHaveText('Control+Shift+KeyK');
  await fixture.getByRole('button', { name: 'Submit bindings form' }).click(); await expect(page.getByLabel('Binding form result', { exact: true })).toHaveText('Control+Shift+KeyK');
  await button.click(); await button.press('Backspace'); await expect(button).toHaveText('Unbound'); await expect(fixture.locator('input[type="hidden"]')).toHaveValue('');
  await fixture.getByRole('button', { name: 'Reset binding', exact: true }).click(); await expect(button).toHaveText('W');
  await button.click(); await button.press('F6'); await fixture.getByRole('button', { name: 'Reset bindings form' }).click(); await expect(button).toHaveText('W'); await expect(fixture.locator('input[type="hidden"]')).toHaveValue('KeyW');
});

test('capture ignores modifiers, repeat and IME, and Escape/Tab cancel without changing binding', async ({ page }) => {
  const fixture = page.locator('[data-case="settings-keybinding"]'), button = fixture.locator('.mc-keybinding__button'); await button.click();
  await button.dispatchEvent('keydown', { key: 'Control', code: 'ControlLeft', ctrlKey: true }); await expect(button).toHaveAttribute('aria-pressed', 'true');
  await button.dispatchEvent('keydown', { key: 'k', code: 'KeyK', repeat: true }); await button.dispatchEvent('keydown', { key: 'k', code: 'KeyK', isComposing: true }); await expect(button).toHaveAttribute('aria-pressed', 'true');
  await button.press('Escape'); await expect(button).toHaveText('W'); await expect(button).toHaveAttribute('aria-pressed', 'false');
  await button.click(); await button.press('Tab'); await expect(button).toHaveAttribute('aria-pressed', 'false'); await expect(button).not.toBeFocused(); await expect(fixture.locator('input[type="hidden"]')).toHaveValue('KeyW');
});

test('controlled/disabled bindings preserve values and cancelled resets do not mutate', async ({ page }) => {
  const controlled = page.locator('[data-case="settings-keybinding-controlled"]'), button = controlled.locator('.mc-keybinding__button'); await button.click(); await button.press('KeyZ');
  await expect(button).toHaveText('A'); await expect(page.getByLabel('Controlled binding intent', { exact: true })).toHaveText('KeyZ');
  await controlled.getByRole('button', { name: 'Reset binding' }).click(); await expect(button).toHaveText('A'); await expect(page.getByLabel('Controlled binding intent', { exact: true })).toHaveText('KeyW');
  const disabled = page.locator('[data-case="settings-keybinding-disabled"]'); for (const control of await disabled.locator('.mc-keybinding button').all()) await expect(control).toBeDisabled();
  await disabled.getByRole('button', { name: 'Submit disabled binding form' }).click(); await expect(page.getByLabel('Binding form result', { exact: true })).toHaveText('[]');
  const cancelled = page.locator('[data-case="settings-keybinding-cancelled-reset"]'), cancelButton = cancelled.locator('.mc-keybinding__button'); await cancelButton.click(); await cancelButton.press('KeyX'); await expect(cancelButton).toHaveText('X'); await cancelled.getByRole('button', { name: 'Cancel binding form reset' }).click(); await expect(cancelButton).toHaveText('X');
});

test('capture Escape is handled before Dialog Escape and Tab leaves capture scope', async ({ page }) => {
  await page.getByRole('button', { name: 'Open binding dialog' }).click(); const dialog = page.getByRole('dialog', { name: 'Binding fixture dialog' }), binding = dialog.locator('.mc-keybinding__button');
  await binding.click(); await binding.press('Escape'); await expect(dialog).toBeVisible(); await expect(binding).toHaveAttribute('aria-pressed', 'false');
  await binding.click(); await binding.press('Tab'); await expect(dialog.getByRole('button', { name: 'After dialog binding' })).toBeFocused(); await expect(binding).toHaveText('E');
  await dialog.getByRole('button', { name: 'After dialog binding' }).press('Escape'); await expect(dialog).not.toBeVisible();
});

test('setting rows preserve accessible controls and contrast in standalone and Panel themes', async ({ page }) => {
  const result = await new AxeBuilder({ page }).include('[data-case="settings-row"]')
    .include('[data-case="settings-row-disabled"]').include('[data-case="settings-panel-row"]')
    .include('[data-case="settings-panel-inset-row"]').analyze();
  expect(result.violations.filter(violation => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([]);
  await expect(page.getByRole('textbox', { name: 'Panel world title', exact: true })).toHaveAccessibleDescription('Panel description');
  await expect(page.getByRole('textbox', { name: 'Inset world title', exact: true })).toHaveAccessibleDescription('Inset panel description');
});
