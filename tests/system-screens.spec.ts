import { expect, test } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AchievementToast, LoadingScreen, SettingsPanel } from '../src/system-screens';

test.beforeEach(async ({ page }) => {
  await page.goto('/calibration.html');
  await expect(page.locator('[data-system-fixture]')).toBeVisible();
});

test('settings preserve drafts and labeled controls when moving between pages', async ({ page }) => {
  const settings = page.getByTestId('system-settings');
  await settings.getByRole('textbox', { name: 'World title' }).fill('Kept draft');
  await settings.getByRole('button', { name: 'Video', exact: true }).click();
  await expect(settings.getByRole('switch', { name: 'Fancy graphics' })).toBeChecked();
  await expect(settings.getByRole('textbox')).toHaveCount(0);
  await settings.getByRole('button', { name: 'General', exact: true }).click();
  await expect(settings.getByRole('textbox', { name: 'World title' })).toHaveValue('Kept draft');
  await expect(settings.getByRole('textbox')).toHaveAccessibleDescription('Draft remains when switching sections.');
});

test('settings use manual keyboard selection and skip unavailable sections', async ({ page }) => {
  const settings = page.getByTestId('system-settings'), general = settings.getByRole('button', { name: 'General', exact: true });
  await general.focus(); await page.keyboard.press('ArrowDown');
  const video = settings.getByRole('button', { name: 'Video', exact: true });
  await expect(video).toBeFocused(); await expect(general).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Enter'); await expect(video).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('End'); await expect(settings.getByRole('button', { name: 'Audio', exact: true })).toBeFocused();
  await expect(settings.getByRole('button', { name: 'Unavailable', exact: true })).toBeDisabled();
});

test('controlled selection waits for host and invalid selection has a usable fallback', async ({ page }) => {
  const settings = page.getByTestId('system-settings');
  await page.getByRole('button', { name: 'Lock section selection', exact: true }).click();
  await settings.getByRole('button', { name: 'Audio', exact: true }).click();
  await expect(settings.getByRole('button', { name: 'General', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('System screen fixture events')).toHaveText('section:audio');
  await page.getByRole('button', { name: 'Set missing section', exact: true }).click();
  await expect(settings.getByRole('textbox', { name: 'World title' })).toBeVisible();
  await expect(page.getByTestId('system-settings-empty')).toContainText('No sections available');
});

test('uncontrolled selection, back and footer actions remain host owned', async ({ page }) => {
  const local = page.getByTestId('system-settings-uncontrolled'), settings = page.getByTestId('system-settings');
  await expect(local.getByRole('button', { name: 'Audio', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await local.getByRole('button', { name: 'General', exact: true }).click();
  await expect(local.getByRole('textbox', { name: 'World title' })).toBeVisible();
  await settings.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByLabel('System screen fixture events')).toHaveText('back');
  await settings.getByRole('button', { name: 'Apply local draft', exact: true }).click();
  await expect(page.getByLabel('System screen fixture events')).toHaveText('apply');
});

test('loading completion and cancellation follow host state', async ({ page }) => {
  const loading = page.getByTestId('loading-determinate'), progress = loading.getByRole('progressbar', { name: 'Loading progress' });
  await expect(progress).toHaveAttribute('aria-valuenow', '35');
  await expect(loading).toHaveAttribute('aria-busy', 'true');
  await loading.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(loading.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
  await expect(loading.locator('.mc-spinner[data-source="loading-spin"]')).toHaveCount(1);
  await expect(page.getByLabel('System screen fixture events')).toHaveText('cancel');
  await page.getByRole('button', { name: 'Finish loading', exact: true }).click();
  await expect(progress).toHaveAttribute('aria-valuenow', '100'); await expect(loading).toHaveAttribute('aria-busy', 'false');
  await page.getByRole('button', { name: 'Reset loading', exact: true }).click();
  await expect(loading.getByRole('button', { name: 'Cancel', exact: true })).toBeEnabled();
});

test('indeterminate uses the original static frame and decorative host backgrounds stay separate', async ({ page }) => {
  const loading = page.getByTestId('loading-indeterminate');
  await expect(loading.locator('[data-source="loading-spin"]')).toHaveAttribute('data-frame', '4');
  await expect(loading.locator('[data-source="loading-spin"]')).toHaveAttribute('aria-hidden', 'true');
  await expect(loading.getByRole('progressbar')).toHaveCount(0);
  await expect(loading.getByRole('status')).toContainText('Connecting');
  await expect(loading).toHaveAttribute('data-background', 'classic');
  const host = page.getByTestId('loading-host-background');
  await expect(host).toHaveAttribute('data-background', 'host');
  await expect(host.locator('.mc-loading-screen__background')).toHaveAttribute('aria-hidden', 'true');
  await expect(host.locator('[data-host-background]')).toBeVisible();
});

test('default world modal uses the Classic title, green bar and host scene', async ({ page }) => {
  const loading = page.getByTestId('loading-world-default');
  await expect(loading).toHaveAttribute('data-variant', 'world-modal');
  await expect(loading).toHaveAttribute('data-source', 'classic-world-modal-loading');
  await expect(loading.getByRole('img', {name:'Minecraft',exact:true})).toBeVisible();
  await expect(loading.locator('[data-world-scene]')).toBeVisible();
  const progress = loading.getByRole('progressbar', {name:'Loading progress'});
  await expect(progress).toHaveAttribute('data-source', 'experience-progress');
  await expect(progress).toHaveAttribute('aria-valuenow', '35');
  await expect(loading.locator('.mc-progress')).toHaveCount(0);
  await loading.getByRole('button', {name:'Cancel',exact:true}).click();
  await expect(loading.getByRole('button', {name:'Cancel',exact:true})).toBeDisabled();
  await expect(page.getByLabel('System screen fixture events')).toHaveText('world cancel');
});

test('world modal exposes empty, partial, complete and static original loading states', async ({ page }) => {
  for (const value of [0,50,100]) {
    const loading=page.getByTestId(`loading-world-${value}`);
    await expect(loading.getByRole('progressbar')).toHaveAttribute('aria-valuenow',String(value));
    await expect(loading).toHaveAttribute('aria-busy',String(value<100));
    await expect(loading.getByRole('img',{name:'Minecraft',exact:true})).toHaveCount(0);
  }
  const indeterminate=page.getByTestId('loading-world-static');
  await expect(indeterminate.getByRole('progressbar')).toHaveCount(0);
  await expect(indeterminate.locator('[data-source="loading-bar"]')).toHaveAttribute('data-loading-frame','4');
  await expect(indeterminate.getByRole('status')).toContainText('Locating server');
  const source=page.getByTestId('loading-world-scale1');
  const dimensions=await source.locator('.mc-loading-screen__world-panel').evaluate(element=>({width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height}));
  expect(dimensions).toEqual({width:290,height:100});
});

test('achievement status stays mounted and default persistence does not remove it', async ({ page }) => {
  await page.clock.install();
  const toast = page.getByTestId('achievement-toast');
  await expect(toast).toHaveAttribute('role', 'status');
  await expect(toast).toContainText('Achievement unlocked: Diamonds!');
  await page.clock.runFor(12000); await expect(toast).toHaveAttribute('data-state', 'open');
  await toast.getByRole('button', { name: 'Dismiss achievement', exact: true }).click();
  await expect(toast).toHaveAttribute('data-state', 'closed'); await expect(toast).toBeEmpty();
  await page.getByRole('button', { name: 'Show persistent achievement', exact: true }).click();
  await expect(toast).toHaveAttribute('data-state', 'open');
});

test('explicit achievement timing pauses for keyboard focus', async ({ page }) => {
  await page.clock.install();
  const toast = page.getByTestId('achievement-toast');
  await toast.getByRole('button', { name: 'Dismiss achievement', exact: true }).click();
  await page.getByRole('button', { name: 'Show timed achievement', exact: true }).click();
  await toast.getByRole('button', { name: 'Dismiss achievement', exact: true }).focus();
  await page.clock.runFor(6000); await expect(toast).toHaveAttribute('data-state', 'open');
  await page.getByRole('button', { name: 'Show persistent achievement', exact: true }).focus();
  await page.clock.runFor(5100); await expect(toast).toHaveAttribute('data-state', 'closed');
});

test('forwarded refs reach the actual region and status owners', async ({ page }) => {
  await page.getByRole('button', { name: 'Read system refs', exact: true }).click();
  await expect(page.getByLabel('System screen fixture events')).toHaveText('SECTION|SECTION|status');
});

test('touch activates settings, cancellation and achievement dismissal', async ({ page, hasTouch }) => {
  test.skip(!hasTouch, 'Actual touch dispatch is verified by the mobile project.');
  const settings = page.getByTestId('system-settings');
  await settings.getByRole('button', { name: 'Video', exact: true }).tap();
  await expect(settings.getByRole('switch', { name: 'Fancy graphics' })).toBeChecked();
  await page.getByTestId('loading-determinate').getByRole('button', { name: 'Cancel', exact: true }).tap();
  await expect(page.getByLabel('System screen fixture events')).toHaveText('cancel');
  await page.getByTestId('achievement-toast').getByRole('button', { name: 'Dismiss achievement', exact: true }).tap();
  await expect(page.getByTestId('achievement-toast')).toHaveAttribute('data-state', 'closed');
});

test('static SSR is browser independent and rejects unusable geometry/data', () => {
  const loading = renderToStaticMarkup(createElement(LoadingScreen, { title: 'Loading', value: 999, max: 10 }));
  expect(loading).toContain('aria-valuenow="10"'); expect(loading).toContain('aria-busy="false"');
  expect(() => renderToStaticMarkup(createElement(LoadingScreen, { title: 'Loading', value: NaN }))).toThrow(RangeError);
  expect(() => renderToStaticMarkup(createElement(LoadingScreen, { title: 'Loading', max: 0 }))).toThrow(RangeError);
  expect(() => renderToStaticMarkup(createElement(LoadingScreen, { title: 'Loading', variant: 'compact', spinnerFrame: 10 }))).toThrow(RangeError);
  expect(() => renderToStaticMarkup(createElement(LoadingScreen, { title: 'Loading', loadingFrame: 10 }))).toThrow(RangeError);
  expect(() => renderToStaticMarkup(createElement(LoadingScreen, { title: 'Loading', scale: 1.5 }))).toThrow(RangeError);
  expect(() => renderToStaticMarkup(createElement(SettingsPanel, { sections: [{ value: 'same', label: 'A', content: 'A' }, { value: 'same', label: 'B', content: 'B' }] }))).toThrow(RangeError);
  expect(renderToStaticMarkup(createElement(AchievementToast, { open: false, onOpenChange: () => {}, title: 'Diamonds' }))).toContain('role="status"');
});
