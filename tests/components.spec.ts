import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => { await page.goto('/'); await page.evaluate(() => document.fonts.ready); });

test('loads local Latin and Chinese fonts without runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.reload();
  await page.evaluate(async () => {
    await document.fonts.load('16px Monocraft');
    await document.fonts.load('18px "MCBE Pixel"');
    await document.fonts.load('24px "Fusion Pixel"', '创造属于你的世界');
  });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Build something blocky.');
  expect(await page.evaluate(() => document.fonts.check('16px Monocraft') && document.fonts.check('24px "Fusion Pixel"', '创造属于你的世界'))).toBe(true);
  expect(errors).toEqual([]);
  if (await page.locator('.font-note').innerText().then(text => text.includes('local game'))) {
    const count = await page.evaluate(async () => (await document.fonts.load('20px "Mojangles Pixel"')).length);
    expect(count).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.fonts.check('20px "Mojangles Pixel"'))).toBe(true);
  }
});

test('switches, checkboxes and radios respond to native input', async ({ page }) => {
  const multiplayer = page.getByRole('switch', { name: 'Multiplayer game' });
  await expect(multiplayer).toBeChecked();
  await multiplayer.uncheck(); await expect(multiplayer).not.toBeChecked();
  await page.getByRole('checkbox', { name: 'Show coordinates' }).check();
  await expect(page.getByRole('checkbox', { name: 'Show coordinates' })).toBeChecked();
  await page.getByRole('radio', { name: 'Creative', exact: true }).check();
  await expect(page.getByRole('radio', { name: 'Creative', exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Survival', exact: true })).not.toBeChecked();
});

test('slider responds to keyboard and announces its formatted value', async ({ page }) => {
  const slider = page.getByRole('slider', { name: 'Render distance' });
  await slider.focus(); await slider.press('ArrowRight');
  await expect(slider).toHaveValue('13'); await expect(slider).toHaveAttribute('aria-valuetext', '13 chunks');
  await slider.press('End'); await expect(slider).toHaveValue('32');
  await slider.press('Home'); await expect(slider).toHaveValue('4');
});

test('tabs wrap, skip disabled items and preserve panel state', async ({ page }) => {
  const game = page.getByRole('tab', { name: 'Game', exact: true });
  await game.focus(); await game.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Video', exact: true })).toBeFocused();
  const brightness = page.getByRole('slider', { name: 'Brightness' });
  await brightness.fill('80');
  await page.getByRole('tab', { name: 'Video', exact: true }).press('End');
  await expect(page.getByRole('tab', { name: 'Audio', exact: true })).toBeFocused();
  await page.getByRole('tab', { name: 'Audio', exact: true }).press('ArrowRight');
  await expect(game).toBeFocused();
  await game.press('ArrowRight'); await expect(brightness).toHaveValue('80');
});

test('dialog traps focus, closes on Escape and restores trigger focus', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Create new world', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Create new world' });
  await expect(dialog).toBeVisible();
  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
  await expect(dialog.getByRole('button', { name: 'Close dialog' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Create world', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close dialog' })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
  await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden');
  await expect(trigger).toBeFocused();
});

test('world form validates, submits with Enter and synchronizes name', async ({ page }) => {
  await page.getByRole('button', { name: 'Create new world', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create new world' });
  const field = dialog.getByRole('textbox', { name: 'New world name' });
  await field.fill(''); await field.press('Enter'); await expect(dialog).toBeVisible();
  await expect(field).toBeFocused();
  await field.fill('Pixel valley'); await field.press('Enter');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('textbox', { name: 'World name', exact: true })).toHaveValue('Pixel valley');
  await expect(page.locator('.toast')).toHaveText('World created: Pixel valley');
});

test('select, slots and progress update their actual states', async ({ page }) => {
  const difficulty = page.getByRole('combobox', { name: 'Difficulty' });
  await difficulty.click(); await page.getByRole('option', { name: 'Hard', exact: true }).click(); await expect(difficulty).toHaveText('Hard');
  await page.getByRole('button', { name: 'Diamonds, 64' }).click();
  await expect(page.getByRole('button', { name: 'Diamonds, 64' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.inventory-selection')).toHaveText('Diamonds');
  const progress = page.getByRole('progressbar', { name: 'Generating world' });
  await page.getByRole('button', { name: 'Increase progress' }).click();
  await expect(progress).toHaveAttribute('aria-valuenow', '80');
});

test('code previews, search and documentation are functional', async ({ page }) => {
  const buttons = page.locator('#buttons');
  await buttons.getByRole('button', { name: 'Code', exact: true }).click();
  await expect(buttons.locator('code')).toContainText("from 'mcbeui'");
  await buttons.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(buttons.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
  const search = page.getByRole('searchbox', { name: 'Find a component' });
  await search.fill('slots');
  await expect(page.getByRole('navigation', { name: 'Component navigation' }).getByRole('link')).toHaveCount(1);
  await search.press('Escape'); await expect(search).toHaveValue('');
  await page.getByRole('button', { name: 'Documentation' }).click();
  await expect(page.getByRole('dialog', { name: 'Start building' })).toBeVisible();
});

test('reference palette, focus and disabled state render correctly', async ({ page }) => {
  const button = page.getByRole('button', { name: 'Settings', exact: true });
  await expect(button).toHaveCSS('background-color', 'rgb(198, 198, 198)');
  await expect(button).toHaveCSS('border-radius', '0px');
  await button.focus(); await expect(button).toHaveCSS('outline-style', 'solid');
  await expect(button).toHaveCSS('outline-width', '2px');
  await expect(page.getByRole('button', { name: 'Unavailable', exact: true })).toBeDisabled();
});

test('Input exposes error, disabled, readonly, focus and text-shadow states', async ({ page }) => {
  const error = page.getByRole('textbox', { name: 'World name · error' });
  await expect(error).toHaveAttribute('aria-invalid','true');
  const description = await error.getAttribute('aria-describedby');
  expect(description).toBeTruthy();
  await expect(page.locator(`[id="${description}"]`)).toHaveText('This world name is already taken.');
  await expect(page.getByRole('textbox', { name: 'World seed · disabled' })).toBeDisabled();
  await expect(page.getByRole('textbox', { name: 'World ID · read only' })).toHaveAttribute('readonly','');
  const field = page.getByRole('textbox', { name: 'World name', exact: true });
  await field.focus(); await expect(field).toBeFocused();
  await expect(field).toHaveCSS('text-shadow','rgb(63, 63, 63) 2px 2px 0px');
  await expect(page.locator('.font-shadow-comparison .mc-text').first()).toHaveCSS('text-shadow','rgb(63, 63, 63) 2px 2px 0px');
  await expect(page.locator('.font-shadow-comparison .mc-text').last()).toHaveCSS('text-shadow','none');
});

test('forms retain readable colors and native input behavior inside a Classic panel', async ({page}) => {
  await page.goto('/calibration.html');
  const input=page.getByRole('textbox',{name:'Panel world name'});
  await input.fill('New world'); await expect(input).toHaveValue('New world');
  const slider=page.getByRole('slider',{name:'Panel brightness'});
  await slider.press('ArrowRight'); await expect(slider).toHaveValue('51');
  const results=await new AxeBuilder({page}).include('[data-case="panel-form"]').analyze();
  expect(results.violations.filter(item=>item.impact==='serious'||item.impact==='critical')).toEqual([]);
});

test('page and modal have no serious or critical axe violations', async ({ page }) => {
  // The complete 63-component showcase and its modal each run the full axe ruleset.
  test.slow();
  const pageResults = await new AxeBuilder({ page }).analyze();
  expect(pageResults.violations.filter(item => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
  await page.getByRole('button', { name: 'Create new world', exact: true }).click();
  const modalResults = await new AxeBuilder({ page }).analyze();
  expect(modalResults.violations.filter(item => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
});

test('reflows at 320px and captures visual evidence', async ({ page }, testInfo) => {
  await page.screenshot({ path: `test-results/${testInfo.project.name}-viewport.png` });
  await page.screenshot({ path: `test-results/${testInfo.project.name}-overview.png`, fullPage: true });
  await page.setViewportSize({ width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/${testInfo.project.name}-320px.png`, fullPage: true });
});
