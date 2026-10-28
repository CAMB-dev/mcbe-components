import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => { await page.goto('/calibration.html'); });

test('world list roves focus without activation, skips disabled rows and wraps', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Fixture worlds', exact: true });
  const first = group.getByRole('button', { name: /^Island(?:\s|$)/ }), last = group.getByRole('button', { name: /^Workshop(?:\s|$)/ });
  await first.focus(); await first.press('ArrowDown'); await expect(last).toBeFocused(); await expect(first).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Game list action', { exact: true })).toHaveText('');
  await last.press('Enter'); await expect(last).toHaveAttribute('aria-pressed', 'true'); await expect(page.getByLabel('Game list action', { exact: true })).toHaveText('play:workshop');
  await expect(page.getByLabel('Game list selection', { exact: true })).toHaveText('workshop');
  await last.press('ArrowDown'); await expect(first).toBeFocused(); await first.press('End'); await expect(last).toBeFocused(); await last.press('Home'); await expect(first).toBeFocused();
  await first.press('ArrowUp'); await expect(last).toBeFocused(); await expect(group.locator('[data-list-primary][tabindex="0"]')).toHaveCount(1);
  await expect(group.getByRole('button', { name: 'Locked world', exact: true })).toBeDisabled();
});

test('world edit and delete emit separate intents without triggering play or selection', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Fixture worlds', exact: true });
  await group.getByRole('button', { name: 'Edit Workshop', exact: true }).click(); await expect(page.getByLabel('Game list action', { exact: true })).toHaveText('edit:workshop');
  await expect(page.getByLabel('Game list selection', { exact: true })).toHaveText('');
  await group.getByRole('button', { name: 'Delete Island', exact: true }).click(); await expect(page.getByLabel('Game list action', { exact: true })).toHaveText('delete:island');
  await expect(group.getByRole('button', { name: /^Island(?:\s|$)/ })).toHaveAttribute('aria-pressed', 'true');
});

test('controlled world and server values remain caller-owned and disabled lists cannot activate', async ({ page }) => {
  const worlds = page.getByRole('group', { name: 'Controlled worlds', exact: true });
  await worlds.getByRole('button', { name: /^Workshop(?:\s|$)/ }).click(); await expect(page.getByLabel('Controlled world intent')).toHaveText('workshop');
  await expect(worlds.getByRole('button', { name: /^Island(?:\s|$)/ })).toHaveAttribute('aria-pressed', 'true');
  const servers = page.getByRole('group', { name: 'Controlled servers', exact: true }); await servers.getByRole('button', { name: /^Creative(?:\s|$)/ }).click();
  await expect(servers.getByRole('button', { name: /^Friends(?:\s|$)/ })).toHaveAttribute('aria-pressed', 'true');
  const disabled = page.getByRole('group', { name: 'Disabled worlds', exact: true });
  for (const button of await disabled.getByRole('button').all()) { await expect(button).toBeDisabled(); await button.dispatchEvent('click'); }
  await expect(page.getByLabel('Game list action', { exact: true })).toHaveText(''); await expect(disabled.locator('[data-list-primary][tabindex="0"]')).toHaveCount(0);
});

test('removed selection recovers an available tab stop and empty lists expose caller copy', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Dynamic worlds', exact: true }); await page.getByRole('button', { name: 'Remove first world' }).click();
  await expect(group.getByRole('button', { name: /^Workshop(?:\s|$)/ })).toHaveAttribute('tabindex', '0');
  await expect(group.getByRole('button', { name: /^Workshop(?:\s|$)/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: 'Empty worlds', exact: true })).toContainText('Create a world to begin');
});

test('server list exposes source status, keyboard connect and isolated edit/delete', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Fixture servers', exact: true }), first = group.getByRole('button', { name: /^Friends(?:\s|$)/ });
  await expect(group.getByRole('img', { name: 'online', exact: true })).toHaveCount(1); await expect(group.getByRole('img', { name: 'offline', exact: true })).toHaveCount(1);
  await first.focus(); await first.press('ArrowDown'); const last = group.getByRole('button', { name: /^Creative(?:\s|$)/ }); await expect(last).toBeFocused(); await last.press('Space');
  await expect(page.getByLabel('Game list action', { exact: true })).toHaveText('connect:creative');
  await group.getByRole('button', { name: 'Edit Friends', exact: true }).click(); await expect(page.getByLabel('Game list action', { exact: true })).toHaveText('server-edit:friends');
  await group.getByRole('button', { name: 'Delete Friends', exact: true }).click(); await expect(page.getByLabel('Game list action', { exact: true })).toHaveText('server-delete:friends');
});

test('player profile, permission and caller renderer use real controls and honor disabled state', async ({ page }) => {
  const fixture = page.locator('[data-case="game-player"]'); await expect(fixture.getByRole('img', { name: 'Fixture avatar' })).toHaveAttribute('width', '36');
  await fixture.locator('.mc-player-card__primary').click(); await expect(page.getByLabel('Player action', { exact: true })).toHaveText('profile');
  const permission = fixture.getByRole('button', { name: 'Permissions for Alex', exact: true }); await permission.focus(); await permission.press('Enter'); await expect(page.getByLabel('Player action', { exact: true })).toHaveText('permissions');
  const renderer = page.locator('[data-case="game-player-renderer"]'); await expect(renderer.locator('[data-skin-renderer]')).toHaveText('Skin slot');
  for (const button of await renderer.getByRole('button').all()) { await expect(button).toBeDisabled(); await button.dispatchEvent('click'); }
  await expect(page.getByLabel('Player action', { exact: true })).toHaveText('permissions');
});

test('pack reorder changes actual caller order, preserves selection and disables boundaries', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Fixture packs', exact: true });
  await expect(group.getByRole('button', { name: 'Move Terrain up', exact: true })).toBeDisabled();
  await group.getByRole('button', { name: 'Move Terrain down', exact: true }).click(); await expect(page.getByLabel('Pack order', { exact: true })).toHaveText('sound,terrain,locked,extra');
  await expect(group.locator('[data-list-primary]').first()).toHaveAttribute('data-list-primary', 'sound');
  await expect(group.getByRole('button', { name: /^Terrain(?:\s|$)/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(group.getByRole('button', { name: 'Move Terrain down', exact: true })).toBeDisabled();
  await group.getByRole('button', { name: 'Move Terrain up', exact: true }).click(); await expect(page.getByLabel('Pack order', { exact: true })).toHaveText('terrain,sound,locked,extra');
});

test('pack activation and focus are independent, skip disabled and remain controlled', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Fixture packs', exact: true }), first = group.getByRole('button', { name: /^Terrain(?:\s|$)/ });
  await first.focus(); await first.press('End'); const extra = group.getByRole('button', { name: /^Extra(?:\s|$)/ }); await expect(extra).toBeFocused(); await expect(first).toHaveAttribute('aria-pressed', 'true');
  await extra.press('Enter'); await group.getByRole('button', { name: 'Activate Extra', exact: true }).click(); await expect(page.getByLabel('Pack action', { exact: true })).toHaveText('extra:true');
  await expect(group.getByRole('button', { name: 'Deactivate Extra', exact: true })).toBeVisible(); await expect(group.getByRole('button', { name: 'Move Extra down', exact: true })).toBeDisabled();
  await extra.focus(); await extra.press('ArrowUp'); await expect(group.getByRole('button', { name: /^Sound(?:\s|$)/ })).toBeFocused();
  const controlled = page.getByRole('group', { name: 'Controlled packs', exact: true }); await controlled.getByRole('button', { name: /^Sound(?:\s|$)/ }).click();
  await expect(controlled.getByRole('button', { name: /^Terrain(?:\s|$)/ })).toHaveAttribute('aria-pressed', 'true');
  await controlled.getByRole('button', { name: 'Deactivate Terrain', exact: true }).click(); await expect(controlled.getByRole('button', { name: 'Deactivate Terrain', exact: true })).toBeVisible();
});

test('long lists scroll through the actual viewport and keep keyboard targets visible', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Many worlds', exact: true }); const viewport = group.getByRole('region', { name: 'Many worlds scroll area', exact: true });
  await expect(group.getByRole('scrollbar')).toBeVisible(); await expect(viewport).toHaveCSS('max-height', 'none');
  const first = group.getByRole('button', { name: 'World 0', exact: true }); await first.focus(); await first.press('End');
  const last = group.getByRole('button', { name: 'World 14', exact: true }); await expect(last).toBeFocused(); await expect.poll(() => viewport.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  const frame = await viewport.boundingBox(), item = await last.boundingBox(); expect(frame && item && item.y >= frame.y && item.y + item.height <= frame.y + frame.height + 2).toBeTruthy();
});

test('list controls retain accessible names and serious/critical axe checks', async ({ page }) => {
  const result = await new AxeBuilder({ page }).include('[data-case="game-worlds"]').include('[data-case="game-servers"]').include('[data-case="game-player"]').include('[data-case="game-packs"]').analyze();
  expect(result.violations.filter(item => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
});
