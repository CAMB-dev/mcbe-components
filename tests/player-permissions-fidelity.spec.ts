import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import type { PermissionLevel } from '../src/player-permissions';

// Independent whole originals from fixed Mojang v1.26.60.5 full ZIP.
// Classic JSON composition only; not current OreUI/native screen parity.
const originals = [
  ['button_borderless_dark', 'fc332fee4a0f800491f1e6ad4925e175e556bcfcba5d587678dc1731f1780548', 4, 4],
  ['button_borderless_darkpressednohover', '5ce36bfbe4a3d94c8ab42c897a7b483aed253fce4a1d6864b432bf42dd60807d', 4, 4],
  ['button_borderless_darkhover', '40c380b48b04c5a9b222b0f9f95ecaa7fb97295d2e776f1094a323886d4f849b', 4, 4],
  ['button_borderless_darkpressed', 'f2037494b69a14f90f008cc0d5f74c8280bac9bc2bfba9f4405ead8c103c9532', 4, 4],
  ['disabledButtonNoBorder', '5a04f3b69f14cd1750b6c818310964e91f4962afc38cfe7bef41ad3c0fb4b27f', 2, 2],
  ['toggle_off', 'e3c03f72af1d8afc7617f229e4eddb6d439a02411e464e48c1bdd1f01f873962', 30, 16],
  ['toggle_on', 'b37762f63652856a4c735f5adf55e511e9c01744a883ec70647b97e08a1711ff', 30, 16],
  ['toggle_off_hover', '5083272d331669bde3e5c3ef14cbfd12d6660763bad23b7474c902b4fc82d056', 30, 16],
  ['toggle_on_hover', '3ce38b76a06e672c95cb8fa4892456e4deaf482c7f6a67b8e991761421fe6b8b', 30, 16],
  ['permissions_visitor_hand', 'a5488d6cfa5c1978dc8b461f8e71e37ed8b45bc7883666f674cf16222d197068', 14, 15],
  ['permissions_visitor_hand_hover', 'f9ecb8dc8d70bb9c864028c176d12bbf09bd05ed8bf9084c47b5f647bf847df6', 14, 15],
  ['permissions_member_star', '47da5219d820044f07b5e08a2648097bb19755f39501faa53370980040d37798', 13, 14],
  ['permissions_member_star_hover', '789443a495b313038c9c0c26f2492879ae6563d4d7aa2cf2787b3e312e711e09', 13, 14],
  ['permissions_op_crown', '7d37844be3114a79ad326b565e373fb5dafb6505b4e4c08f82227529d9888624', 14, 14],
  ['permissions_op_crown_hover', '83f43f00897d6c8a69a89bb2aba76371ad047c85ef3a65c2882c8f269b7e43ec', 14, 14],
  ['permissions_custom_dots', '14e515beb839a000c9c03ca6dcbc65fb17eba6adb50f4c4ce398fa27f6ab8799', 14, 4],
  ['permissions_custom_dots_hover', '180c9aa81ad456d394b91054c236162491295d2c46d9e971bef21053116a822c', 14, 4],
] as const;
const source = (name: string) => readFile(new URL(`../src/assets/player-permissions/${name}.png`, import.meta.url));
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const axis = (p: number, extent: number, original: number, scale: number) => p < scale ? 0 : p >= extent - scale ? original - 1 : 1 + Math.min(original - 3, Math.floor((p - scale) * (original - 2) / (extent - 2 * scale)));

test('permission state art retains17 pinned whole PNG files and original dark-skin slice metadata', async () => {
  for (const [name, sha, width, height] of originals) { const b = await source(name), png = PNG.sync.read(b); expect(hash(b), name).toBe(sha); expect([png.width, png.height], name).toEqual([width, height]);
    if (name.startsWith('button_borderless_dark')) { const raw = await readFile(new URL(`../src/assets/player-permissions/${name}.json`, import.meta.url)); expect(hash(raw)).toBe('622158df366964d9ddeac5ed9938a43522da68d02c060335b853c9730103ad65'); expect(JSON.parse(raw.toString())).toEqual({ nineslice_size: 1, base_size: [4, 4] }); }
  }
});

test('player five source skins retain corners edges and uncovered pixels at two scales', async ({ page }, info) => {
  await page.addInitScript(() => { window.permissionsQAInitial = { mode: 'primitives', avatarVisible: false, localVisible: false }; }); await page.goto('/demo/player-permissions-fixture.html'); await expect.poll(() => page.evaluate(() => !!window.permissionsQA?.standalonePlayerRef)).toBe(true);
  const row = page.locator('#qa-permission-player'), skin = row.locator('.mc-permission-player-row__skin'), states = [
    { name: 'normal', selected: false, disabled: false, hover: false, png: 'button_borderless_dark' },
    { name: 'selected', selected: true, disabled: false, hover: false, png: 'button_borderless_darkpressednohover' },
    { name: 'hover', selected: false, disabled: false, hover: true, png: 'button_borderless_darkhover' },
    { name: 'selected-hover', selected: true, disabled: false, hover: true, png: 'button_borderless_darkpressed' },
    { name: 'locked', selected: false, disabled: true, hover: false, png: 'disabledButtonNoBorder' },
  ]; const checks = [];
  for (const scale of [1, 2]) for (const state of states) {
    await page.evaluate(({ scale, state }) => window.permissionsQA.configure({ scale, rowSelected: state.selected, rowDisabled: state.disabled }), { scale, state }); await page.mouse.move(1, 1); if (state.hover) await row.hover();
    const css = await skin.evaluate(n => { const c = getComputedStyle(n); return c.borderImageSource !== 'none' ? c.borderImageSource : c.backgroundImage; }), url = css.match(/url\(["']?(.+?)["']?\)/)?.[1]; expect(url).toBeTruthy();
    const response = await page.request.get(url!); expect(response.ok()).toBe(true); const bytes = await source(state.png); expect((await response.body()).equals(bytes)).toBe(true);
    const original = PNG.sync.read(bytes), shot = await skin.screenshot(), actual = PNG.sync.read(shot); let compared = 0, different = 0, maxDelta = 0;
    for (let y = 0; y < actual.height; y++) for (let x = 0; x < actual.width; x++) {
      // Normal source content starts after picture20/gap4, centered in the row.
      // Exclude its name rectangle, not pixels selected from screenshot errors.
      if (x >= 22 * scale && y >= 4 * scale && y < actual.height - 4 * scale) continue;
      const sx = state.disabled ? Math.floor(x * original.width / actual.width) : axis(x, actual.width, original.width, scale), sy = state.disabled ? Math.floor(y * original.height / actual.height) : axis(y, actual.height, original.height, scale), from = (sy * original.width + sx) * 4, to = (y * actual.width + x) * 4, alpha = original.data[from + 3]! / 255; let changed = actual.data[to + 3] !== 255;
      for (let c = 0; c < 3; c++) { const d = Math.abs(actual.data[to + c]! - Math.round(original.data[from + c]! * alpha + [60, 100, 140][c]! * (1 - alpha))); maxDelta = Math.max(maxDelta, d); if (d) changed = true; } compared++; if (changed) different++;
    }
    checks.push({ scale, state: state.name, compared, different, maxDelta }); await info.attach(`player-${state.name}-${scale}.png`, { body: shot, contentType: 'image/png' });
  }
  await info.attach('player-skin-composition.json', { body: JSON.stringify({ qualification: 'Classic source skin on known host background; excludes declared live name area; no native full-screen claim', checks }, null, 2), contentType: 'application/json' }); for (const c of checks) { expect(c.compared).toBeGreaterThan(1000); expect(c.maxDelta, JSON.stringify(c)).toBeLessThanOrEqual(1); }
});

test('accepted role adds no invented selection overlay and switch states use whole originals including locked alpha', async ({ page }, info) => {
  await page.addInitScript(() => { window.permissionsQAInitial = { mode: 'primitives' }; }); await page.goto('/demo/player-permissions-fixture.html'); await expect.poll(() => page.evaluate(() => !!window.permissionsQA?.standalonePlayerRef)).toBe(true);
  const trigger = page.getByRole('combobox'), roleNames: Record<PermissionLevel, string> = { visitor: 'permissions_visitor_hand', member: 'permissions_member_star', operator: 'permissions_op_crown', custom: 'permissions_custom_dots' }; let acceptedShot: Buffer | undefined;
  for (const selected of ['member', 'visitor'] as const) {
    await page.evaluate(level => window.permissionsQA.configure({ level }), selected); await trigger.click(); const row = page.locator('[role=option][data-level=member]'); await row.hover(); await expect(row).toHaveAttribute('aria-selected', String(selected === 'member')); const shot = await row.screenshot();
    if (!acceptedShot) acceptedShot = shot; else expect(PNG.sync.read(shot).data.equals(PNG.sync.read(acceptedShot).data)).toBe(true); await page.keyboard.press('Escape');
  }
  await trigger.click(); for (const [level, name] of Object.entries(roleNames)) { const row = page.locator(`[role=option][data-level=${level}]`); await row.hover(); const img = row.locator('img'); await expect(img).toHaveAttribute('src', new RegExp(`${name}_hover\\.png`)); const response = await page.request.get((await img.getAttribute('src'))!); expect((await response.body()).equals(await source(name + '_hover'))).toBe(true); }
  await page.keyboard.press('Escape'); const input = page.locator('#qa-permission-toggle'), skin = page.locator('.mc-permission-toggle-row__skin'), checks = [];
  for (const checked of [false, true]) for (const disabled of [false, true]) {
    await page.evaluate(({ checked, disabled }) => window.permissionsQA.configure({ checked, rowDisabled: disabled }), { checked, disabled }); await page.mouse.move(1, 1); await expect(input).toHaveJSProperty('checked', checked);
    const css = await skin.evaluate(n => getComputedStyle(n).backgroundImage), url = css.match(/url\(["']?(.+?)["']?\)/)?.[1]; expect(url).toBeTruthy(); const bytes = await source(checked ? 'toggle_on' : 'toggle_off'); expect((await (await page.request.get(url!)).body()).equals(bytes)).toBe(true);
    const original = PNG.sync.read(bytes), shot = await skin.screenshot(), actual = PNG.sync.read(shot), opacity = disabled ? .5 : 1; let compared = 0, maxDelta = 0;
    for (let y = 0; y < actual.height; y++) for (let x = 0; x < actual.width; x++) {
      const sx = Math.min(original.width - 1, Math.floor((x + .5) * original.width / actual.width)), sy = Math.min(original.height - 1, Math.floor((y + .5) * original.height / actual.height)), from = (sy * original.width + sx) * 4;
      // Source-defined flat3x3 neighborhoods avoid claiming an unproved
      // CSS noninteger resampling edge phase for30x16→28x22 geometry.
      let flat = true; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const i = (Math.max(0, Math.min(original.height - 1, sy + dy)) * original.width + Math.max(0, Math.min(original.width - 1, sx + dx))) * 4; for (let c = 0; c < 4; c++) if (original.data[i + c] !== original.data[from + c]) flat = false; }
      if (!flat) continue; const to = (y * actual.width + x) * 4, alpha = original.data[from + 3]! / 255 * opacity; for (let c = 0; c < 3; c++) maxDelta = Math.max(maxDelta, Math.abs(actual.data[to + c]! - Math.round(original.data[from + c]! * alpha + [60, 100, 140][c]! * (1 - alpha)))); compared++;
    }
    checks.push({ checked, disabled, comparedFlatPixels: compared, maxDelta }); await info.attach(`permission-${checked}-${disabled}.png`, { body: shot, contentType: 'image/png' });
  }
  await info.attach('permission-state-composition.json', { body: JSON.stringify({ qualification: 'Whole source assets, accepted-vs-unaccepted equal hover art, and source-defined flat switch texels only; noninteger edge phase and native pixels unqualified', checks }, null, 2), contentType: 'application/json' }); for (const c of checks) { expect(c.comparedFlatPixels).toBeGreaterThan(30); expect(c.maxDelta, JSON.stringify(c)).toBeLessThanOrEqual(1); }
});
