import { expect, test } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AirBar, ArmorBar, Crosshair, ExperienceBar, HealthBar, Hotbar, HungerBar } from '../src/hud';

test('HUD numeric values are finite, bounded and safe during server rendering', () => {
  for (const value of [NaN, Infinity, -Infinity, -7]) {
    for (const Component of [HealthBar, HungerBar, ArmorBar, AirBar]) {
      const markup = renderToStaticMarkup(createElement(Component, { value }));
      expect(markup).toContain('aria-valuenow="0"'); expect(markup).not.toMatch(/NaN|Infinity/);
    }
    const xp = renderToStaticMarkup(createElement(ExperienceBar, { progress: value, level: value }));
    expect(xp).toContain('aria-valuenow="0"'); expect(xp).toContain('width:0%'); expect(xp).not.toMatch(/NaN|Infinity/);
    const hotbar = renderToStaticMarkup(createElement(Hotbar, { selectedIndex: value, items: [{ name: 'Tool', count: value, durability: value }] }));
    expect(hotbar).not.toMatch(/NaN|Infinity/); expect(hotbar.match(/aria-pressed="true"/g)).toHaveLength(1);
  }
  expect(renderToStaticMarkup(createElement(HealthBar, { value: 99 }))).toContain('aria-valuenow="20"');
  expect(renderToStaticMarkup(createElement(AirBar, { value: 99 }))).toContain('aria-valuenow="10"');
  const fractional = renderToStaticMarkup(createElement(HungerBar, { value: 3.9 }));
  expect(fractional).toContain('aria-valuenow="3"'); expect(fractional.match(/data-state="half"/g)).toHaveLength(1);
  const xp = renderToStaticMarkup(createElement(ExperienceBar, { progress: 2, level: 23.9 }));
  expect(xp).toContain('width:100%'); expect(xp).toContain('>23</span>');
  expect(renderToStaticMarkup(createElement(Crosshair))).toContain('mix-blend-mode:difference');
});

test('air states are explicit and absorption never synthesizes a missing flash texture', () => {
  const air = renderToStaticMarkup(createElement(AirBar, { value: 10, states: ['pop', 'empty', 'full'] }));
  expect(air).toContain('aria-valuenow="1"'); expect(air.match(/data-state="hidden"/g)).toHaveLength(7);
  expect(air).toContain('data-state="pop"'); expect(air).toContain('--mc-hud-texture-bubble-pop');
  const absorption = renderToStaticMarkup(createElement(HealthBar, { variant: 'absorption', flashing: true, value: 1 }));
  expect(absorption).toContain('--mc-hud-texture-absorption-heart-half'); expect(absorption).not.toContain('absorption-heart-flash');
});

test('hotbar roving focus skips disabled slots and changes selection only on activation', async ({ page }) => {
  await page.goto('/calibration.html'); const fixture = page.locator('#hud-interaction-fixture');
  const bar = fixture.getByRole('toolbar', { name: 'Uncontrolled hotbar', exact: true });
  const slots = bar.getByRole('button');
  await expect(slots).toHaveCount(9); await expect(slots.nth(2)).toHaveAttribute('aria-pressed', 'true');
  await expect(slots.nth(1)).toBeDisabled(); await expect(slots.nth(2)).toHaveAttribute('tabindex', '0');
  await slots.nth(2).focus(); await page.keyboard.press('ArrowLeft');
  await expect(slots.nth(0)).toBeFocused(); await expect(slots.nth(2)).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Enter'); await expect(slots.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await expect(fixture.getByLabel('HUD selected event')).toHaveText('0'); await expect(fixture.getByLabel('HUD action event')).toHaveText('0:primary');
  await page.keyboard.press('ArrowLeft'); await expect(slots.nth(8)).toBeFocused();
  await page.keyboard.press('Home'); await expect(slots.nth(0)).toBeFocused();
  await page.keyboard.press('End'); await expect(slots.nth(8)).toBeFocused();
  await page.keyboard.press('Space'); await expect(slots.nth(8)).toHaveAttribute('aria-pressed', 'true');
  await expect(bar.locator('button[tabindex="0"]')).toHaveCount(1);
});

test('controlled selection emits intent without moving its overlay and secondary actions preserve selection', async ({ page }) => {
  await page.goto('/calibration.html'); const fixture = page.locator('#hud-interaction-fixture');
  const bar = fixture.getByRole('toolbar', { name: 'Controlled hotbar', exact: true }); const slots = bar.getByRole('button');
  await slots.nth(2).click(); await expect(fixture.getByLabel('HUD selected event')).toHaveText('2');
  await expect(slots.nth(0)).toHaveAttribute('aria-pressed', 'true'); await expect(slots.nth(2)).toHaveAttribute('aria-pressed', 'false');
  await slots.nth(3).focus(); await page.keyboard.press('Shift+F10');
  await expect(fixture.getByLabel('HUD action event')).toHaveText('3:secondary'); await expect(fixture.getByLabel('HUD selected event')).toHaveText('2');
  await slots.nth(4).click({ button: 'right' }); await expect(fixture.getByLabel('HUD action event')).toHaveText('4:secondary');
  await expect(slots.nth(0)).toHaveAttribute('aria-pressed', 'true');
});

test('disabled hotbar blocks actions and unrelated inputs keep their keys', async ({ page }) => {
  await page.goto('/calibration.html'); const fixture = page.locator('#hud-interaction-fixture');
  const bar = fixture.getByRole('toolbar', { name: 'Disabled hotbar', exact: true });
  await expect(bar.getByRole('button')).toHaveCount(9);
  for (const slot of await bar.getByRole('button').all()) { await expect(slot).toBeDisabled(); await expect(slot).toHaveAttribute('tabindex', '-1'); }
  const output = fixture.getByLabel('HUD action event'); await expect(output).toHaveText('');
  await bar.getByRole('button').nth(0).dispatchEvent('click'); await bar.getByRole('button').nth(0).dispatchEvent('contextmenu');
  await expect(output).toHaveText('');
  const input = fixture.getByRole('textbox', { name: 'Outside hotbar input' }); await input.fill('123'); await input.press('ArrowLeft'); await input.press('End');
  await expect(input).toHaveValue('123'); await expect(input).toBeFocused(); await expect(output).toHaveText('');
  await expect(fixture.getByLabel('Outside hotbar keys')).toHaveText('2');
});

test('HUD meters expose sanitized values and explicit air states in the browser', async ({ page }) => {
  await page.goto('/calibration.html'); const fixture = page.locator('#hud-interaction-fixture');
  for (const name of ['Nonfinite health', 'Nonfinite hunger', 'Clamped air']) await expect(fixture.getByRole('meter', { name, exact: true })).toHaveAttribute('aria-valuenow', '0');
  await expect(fixture.getByRole('meter', { name: 'Clamped armor', exact: true })).toHaveAttribute('aria-valuenow', '20');
  await expect(fixture.getByRole('progressbar', { name: 'Nonfinite experience', exact: true })).toHaveAttribute('aria-valuenow', '0');
  await expect(fixture.getByRole('progressbar', { name: 'Clamped experience', exact: true })).toHaveAttribute('aria-valuetext', '100%, level 23');
  await expect(fixture.getByRole('meter', { name: 'Explicit bubble states', exact: true }).locator('[data-state="hidden"]')).toHaveCount(7);
});
