import { test, expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlayerPermissions, PermissionLevelSelect, PermissionPlayerRow, PermissionToggleRow } from '../src/player-permissions';
import type { PermissionLevel } from '../src/player-permissions';
import type { PermissionsQASettings } from '../demo/player-permissions-fixture';

// Classic JSON source geometry and explicit Web input contracts; not current OreUI or native RT parity.
const root = (p: Page) => p.locator('#qa-player-permissions');
const part = (p: Page, name: string) => root(p).locator(`.mc-player-permissions__${name}`);
const player = (p: Page, id: string) => root(p).locator(`button[data-player-id="${id}"]`);
const bit = (p: Page, id: string) => root(p).locator(`input[data-permission-id="${id}"]`);
const level = (p: Page) => p.getByRole('combobox');
const popup = (p: Page) => p.getByRole('listbox').filter({ has: p.locator('[data-level]') });
async function open(p: Page, initial: Partial<PermissionsQASettings> = {}, strict = false) {
  await p.addInitScript(value => { window.permissionsQAInitial = value; }, initial); await p.goto(`/demo/player-permissions-fixture.html${strict ? '?strict' : ''}`);
  await expect.poll(() => p.evaluate(() => !!window.permissionsQA && (window.permissionsQA.settings.mode === 'full' ? !!window.permissionsQA.ref : !!window.permissionsQA.standalonePlayerRef))).toBe(true);
}
async function configure(p: Page, patch: Partial<PermissionsQASettings>) { await p.evaluate(v => window.permissionsQA.configure(v), patch); }
async function events(p: Page, kind: string) { return p.evaluate(kind => window.permissionsQA.events.filter(e => e.kind === kind), kind); }
async function clear(p: Page) { await p.evaluate(() => { window.permissionsQA.events.length = 0; }); }
async function box(l: Locator) { const b = await l.boundingBox(); expect(b).not.toBeNull(); return b!; }
const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(1 / 32);

test('four source components render semantic SSR without IO and reject invalid identities or runtime values', () => {
  expect(typeof window).toBe('undefined'); const before = globalThis.fetch; let calls = 0; globalThis.fetch = (() => { calls++; throw Error('Unexpected SSR IO'); }) as typeof fetch;
  try {
    const props = { label: 'Host permissions', players: [{ id: 'a', name: 'Caller Ada' }], permissionOptions: [{ id: 'build', label: 'Build label' }], defaultValue: { a: { level: 'member' as const, permissions: { build: true } } }, scale: 1 };
    const html = renderToStaticMarkup(createElement(PlayerPermissions, props)); expect(html).toContain('Caller Ada'); expect(html).toContain('Build label'); expect(html).toContain('classic-json'); expect(html).not.toContain('aria-modal'); expect(calls).toBe(0);
    expect(renderToStaticMarkup(createElement(PermissionLevelSelect, { value: 'custom', inRealm: true }))).toContain('Custom');
    expect(renderToStaticMarkup(createElement(PermissionToggleRow, { label: 'Actual native checkbox', checked: false, stateLabel: 'Host state text' }))).toContain('type="checkbox"');
    expect(renderToStaticMarkup(createElement(PermissionPlayerRow, { player: { id: 'a', name: 'Caller player' }, selected: true }))).toContain('aria-pressed="true"');
    expect(() => renderToStaticMarkup(createElement(PlayerPermissions, { ...props, players: [...props.players, ...props.players] }))).toThrow(RangeError);
    expect(() => renderToStaticMarkup(createElement(PlayerPermissions, { ...props, scale: 1.5 }))).toThrow(RangeError);
    expect(() => renderToStaticMarkup(createElement(PermissionLevelSelect, { value: 'administrator' as PermissionLevel }))).toThrow(RangeError);
  } finally { globalThis.fetch = before; }
});

test('Classic source frame keeps23 header88percent body154 player pane and95percent pane heights at two scales', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 1000 }); await open(page);
  for (const scale of [1, 2]) { await configure(page, { scale }); const frame = await box(root(page)), body = await box(part(page, 'body')), main = await box(part(page, 'main')), left = await box(part(page, 'players-pane')), right = await box(part(page, 'options-pane'));
    near(frame.width, 360 * scale); near(frame.height, 300 * scale); near((await box(part(page, 'header'))).height, 23 * scale); near(body.width, frame.width * .88); near(left.width, 154 * scale); near(right.width, main.width - 154 * scale); near(left.height, main.height * .95); near(right.height, main.height * .95);
  }
});

test('source player pitch27 retains28 toggle overhang and host portrait18 border20 local13', async ({ page }) => {
  await open(page, { avatarVisible: true, avatarSrc: '/src/assets/player-permissions/permissions_member_star.png', localVisible: true });
  near((await box(player(page, 'bex'))).y - (await box(player(page, 'ada'))).y, 27); near((await box(player(page, 'ada'))).height, 28);
  const row = player(page, 'ada'); near((await box(row.locator('.mc-permission-player-row__avatar'))).width, 18); near((await box(row.locator('.mc-permission-player-row__avatar'))).height, 18); near((await box(row.locator('.mc-permission-player-row__local'))).width, 13); near((await box(row.locator('.mc-permission-player-row__picture'))).width, 20);
});

test('permission row24 retains30-wide toggle and intrinsic state width plus8 without translating boolean state text', async ({ page }) => {
  await open(page); const row = bit(page, 'build').locator('xpath=ancestor::div[contains(@class,"mc-permission-toggle-row")]'); near((await box(row)).height, 24); near((await box(row.locator('.mc-permission-toggle-row__control'))).width, 30); near((await box(row.locator('.mc-permission-toggle-row__control'))).height, 24);
  await expect(row.locator('.mc-permission-toggle-row__state')).toHaveText('State from host'); await expect(bit(page, 'build')).toBeChecked();
  await expect(bit(page, 'build')).toHaveAccessibleName('Permission build'); await expect(root(page).getByRole('checkbox', { name: 'Permission build', exact: true })).toHaveCount(1);
  const width = await row.locator('.mc-permission-toggle-row__state').evaluate(n => { const r = document.createRange(); r.selectNodeContents(n); return { box: n.getBoundingClientRect().width, text: r.getBoundingClientRect().width }; }); near(width.box - width.text, 8);
});

test('default8 scrolling chrome has3 track5 thumb and both real viewports scroll independently', async ({ page }) => {
  await open(page); const areas = root(page).locator('.mc-scroll-area'), bars = root(page).getByRole('scrollbar'); await expect(bars).toHaveCount(2);
  for (const bar of await bars.all()) { near((await box(bar)).width, 8); near((await box(bar.locator('.mc-scrollbar__track'))).width, 3); near((await box(bar.locator('.mc-scrollbar__thumb'))).width, 5); }
  for (const area of await areas.all()) near((await box(area)).width - (await box(area.locator('.mc-scroll-area__viewport'))).width, 8);
  await page.evaluate(() => { window.permissionsQA.playersRef!.scrollTop = 100; }); await expect.poll(() => page.evaluate(() => window.permissionsQA.playersRef!.scrollTop)).toBe(100); expect(await page.evaluate(() => window.permissionsQA.permissionsRef!.scrollTop)).toBe(0);
  await page.evaluate(() => { window.permissionsQA.permissionsRef!.scrollTop = 80; }); await expect.poll(() => page.evaluate(() => window.permissionsQA.permissionsRef!.scrollTop)).toBe(80); expect(await page.evaluate(() => window.permissionsQA.playersRef!.scrollTop)).toBe(100);
});

test('controlled player rejection keeps accepted row and fields while roving focus does not commit', async ({ page }) => {
  await open(page, { acceptSelection: false }); await expect(player(page, 'ada')).toHaveAccessibleName('Ada host player'); await player(page, 'ada').focus(); await clear(page); await page.keyboard.press('ArrowDown'); await expect(player(page, 'bex')).toBeFocused(); expect(await events(page, 'selection')).toHaveLength(0); await expect(player(page, 'ada')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter'); expect((await events(page, 'selection')).at(-1)).toMatchObject({ value: 'bex' }); await expect(root(page)).toHaveAttribute('data-selected-player', 'ada'); await expect(level(page)).toContainText('Member');
  await configure(page, { acceptSelection: true }); await player(page, 'bex').click(); await expect(root(page)).toHaveAttribute('data-selected-player', 'bex'); await expect(level(page)).toContainText('Visitor');
});

test('level requests preserve permission bits and controlled rejection before host acceptance', async ({ page }) => {
  await open(page, { acceptValue: false }); const before = await page.evaluate(() => window.permissionsQA.settings.value.ada!.permissions); await level(page).click(); await popup(page).getByRole('option', { name: 'Operator', exact: true }).click();
  expect((await events(page, 'value')).at(-1)).toMatchObject({ detail: { playerId: 'ada', reason: 'level' }, value: { ada: { level: 'operator', permissions: before } } }); await expect(level(page)).toContainText('Member'); expect(await page.evaluate(() => window.permissionsQA.settings.value.ada!.permissions)).toEqual(before);
  await configure(page, { acceptValue: true }); await level(page).click(); await popup(page).getByRole('option', { name: 'Visitor', exact: true }).click(); await expect(level(page)).toContainText('Visitor'); expect(await page.evaluate(() => window.permissionsQA.settings.value.ada!.permissions)).toEqual(before);
});

test('permission boolean requests never synthesize Custom or mutate rejected controlled state', async ({ page }) => {
  await open(page, { acceptValue: false }); await bit(page, 'build').click(); expect((await events(page, 'value')).at(-1)).toMatchObject({ detail: { reason: 'permission', playerId: 'ada', permissionId: 'build' }, value: { ada: { level: 'member', permissions: { build: false } } } }); await expect(bit(page, 'build')).toBeChecked();
  await configure(page, { acceptValue: true }); await bit(page, 'build').click(); await expect(bit(page, 'build')).not.toBeChecked(); await expect(level(page)).toContainText('Member'); await expect(root(page).getByText('State from host', { exact: true })).toBeVisible();
});

test('context hides Custom choices without coercing accepted Custom or its independent selected label', async ({ page }) => {
  await open(page, { mode: 'primitives', level: 'custom', selectedLabel: 'Host independent role label' });
  for (const patch of [{ worldSettings: false, inRealm: true }, { worldSettings: true, inRealm: false }]) { await configure(page, patch); await expect(level(page)).toContainText('Host independent role label'); await clear(page); await level(page).click(); await expect(popup(page).locator('[data-level=custom]')).toHaveCount(0); expect(await events(page, 'primitive-level')).toHaveLength(0); await page.keyboard.press('Escape'); }
  await configure(page, { worldSettings: false, inRealm: false }); await level(page).click(); await expect(popup(page).locator('[data-level=custom]')).toHaveAttribute('aria-selected', 'true');
});

test('world settings offers three title-description branches while ordinary context offers four icon labels', async ({ page }) => {
  await open(page, { mode: 'primitives' }); await level(page).click(); await expect(popup(page).getByRole('option')).toHaveCount(4); await expect(popup(page).locator('.mc-permission-level-select__description')).toHaveCount(0); await page.keyboard.press('Escape');
  await configure(page, { worldSettings: true }); await level(page).click(); await expect(popup(page).getByRole('option')).toHaveCount(3); await expect(popup(page).locator('.mc-permission-level-select__description')).toHaveCount(3); for (const icon of await popup(page).locator('.mc-permission-level-select__option-icon').all()) { near((await box(icon)).width, 10); near((await box(icon)).height, 10); }
});

test('warning editability grid and action flags remain independent source bindings', async ({ page }) => {
  await open(page, { locked: true, canEdit: true, kickEnabled: false, banEnabled: true }); await expect(root(page).getByText('Caller template lock warning')).toBeVisible(); await expect(level(page)).toBeEnabled(); await expect(bit(page, 'build')).toBeEnabled(); await expect(root(page).getByRole('button', { name: 'Kick Player' })).toBeDisabled(); await expect(root(page).getByRole('button', { name: 'Ban Player' })).toBeEnabled();
  await configure(page, { locked: false, canEdit: false, optionsVisible: false, kickVisible: false }); await expect(root(page).getByText('Caller template lock warning')).toHaveCount(0); await expect(level(page)).toBeDisabled(); await expect(bit(page, 'build')).toBeHidden(); await expect(root(page).getByRole('button', { name: 'Kick Player' })).toHaveCount(0); await expect(root(page).getByRole('button', { name: 'Ban Player' })).toBeEnabled();
});

test('readonly blocks all mutation requests but permits player selection and host Back', async ({ page }) => {
  await open(page, { readOnly: true }); await player(page, 'bex').click(); await expect(root(page)).toHaveAttribute('data-selected-player', 'bex'); await level(page).click(); await expect(level(page)).toHaveAttribute('aria-expanded', 'false'); await bit(page, 'build').click(); expect(await events(page, 'value')).toHaveLength(0);
  await expect(root(page).getByRole('button', { name: 'Kick Player' })).toBeDisabled(); await root(page).getByRole('button', { name: 'Back', exact: true }).click(); expect(await events(page, 'back')).toHaveLength(1);
});

test('missing state or unknown permission IDs stay missing without false defaults or automatic change events', async ({ page }) => {
  await open(page, { missingPermission: true }); await expect(bit(page, 'build')).toHaveCount(0); expect(await events(page, 'value')).toHaveLength(0);
  await configure(page, { missingState: true }); await expect(root(page).getByTestId('empty-permissions')).toBeVisible(); await expect(level(page)).toHaveCount(0); expect(await events(page, 'value')).toHaveLength(0);
  await configure(page, { missingState: false, selected: null }); await expect(root(page).getByTestId('empty-permissions')).toBeVisible(); await configure(page, { selected: 'unknown-player' }); await expect(root(page).getByTestId('empty-permissions')).toBeVisible(); expect(await events(page, 'selection')).toHaveLength(0);
});

test('popup navigation roves independently then Escape closes it before pane Back returns focus to accepted player', async ({ page }) => {
  await open(page); await level(page).focus(); await page.keyboard.press('Enter'); await expect(level(page)).toHaveAttribute('aria-expanded', 'true'); await page.keyboard.press('ArrowDown'); expect(await events(page, 'value')).toHaveLength(0);
  await page.keyboard.press('Escape'); await expect(level(page)).toHaveAttribute('aria-expanded', 'false'); await expect(level(page)).toBeFocused(); expect(await events(page, 'back')).toHaveLength(0);
  await page.keyboard.press('Escape'); await expect(player(page, 'ada')).toBeFocused(); expect(await events(page, 'back')).toHaveLength(0); await page.keyboard.press('Escape'); expect(await events(page, 'back')).toHaveLength(1);
});

test('caller capture and key handlers veto navigation and IME or modifiers never trigger pane Back', async ({ page }) => {
  await open(page, { preventKeys: ['ArrowDown'] }); await player(page, 'ada').focus(); await page.keyboard.press('ArrowDown'); await expect(player(page, 'ada')).toBeFocused();
  await configure(page, { preventClick: true }); await player(page, 'bex').evaluate(n => (n as HTMLButtonElement).click()); await expect(root(page)).toHaveAttribute('data-selected-player', 'ada'); expect(await events(page, 'selection')).toHaveLength(0);
  await configure(page, { preventKeys: [], preventCaptureKeys: ['Escape'] }); await level(page).focus(); await page.keyboard.press('Escape'); await expect(level(page)).toBeFocused();
  await configure(page, { preventCaptureKeys: [] }); for (const extra of [{ isComposing: true }, { keyCode: 229 }, { ctrlKey: true }, { altKey: true }, { metaKey: true }]) await level(page).dispatchEvent('keydown', { key: 'Escape', bubbles: true, ...extra }); await expect(level(page)).toBeFocused(); expect(await events(page, 'back')).toHaveLength(0);
  await configure(page, { mode: 'primitives', preventKeys: ['Enter'] }); await level(page).focus(); await page.keyboard.press('Enter'); await expect(level(page)).toHaveAttribute('aria-expanded', 'false');
});

test('Kick Ban and Back are host requests without removing players or performing game commands', async ({ page }) => {
  await open(page); await root(page).getByRole('button', { name: 'Kick Player' }).evaluate(n => (n as HTMLButtonElement).click()); await root(page).getByRole('button', { name: 'Ban Player' }).evaluate(n => (n as HTMLButtonElement).click()); expect((await events(page, 'kick'))[0]).toMatchObject({ value: 'ada' }); expect((await events(page, 'ban'))[0]).toMatchObject({ value: 'ada' }); await expect(player(page, 'ada')).toHaveCount(1); expect(await events(page, 'value')).toHaveLength(0);
});

test('refs remain actual native elements through resize then all detach on host unmount', async ({ page }) => {
  await open(page, {}, true); expect(await root(page).evaluate(n => n === window.permissionsQA.ref)).toBe(true); expect(await player(page, 'ada').evaluate(n => n === window.permissionsQA.playerRefs.ada)).toBe(true); expect(await bit(page, 'build').evaluate(n => n === window.permissionsQA.permissionRefs.build)).toBe(true); expect(await level(page).evaluate(n => n === window.permissionsQA.levelRef)).toBe(true);
  await page.evaluate(() => { (window as unknown as { savedPermissionNodes: unknown[] }).savedPermissionNodes = [window.permissionsQA.ref, window.permissionsQA.playersRef, window.permissionsQA.permissionsRef]; }); await configure(page, { size: [350, 280] }); expect(await page.evaluate(() => (window as unknown as { savedPermissionNodes: unknown[] }).savedPermissionNodes.every((n, i) => n === [window.permissionsQA.ref, window.permissionsQA.playersRef, window.permissionsQA.permissionsRef][i]))).toBe(true);
  await page.evaluate(() => window.permissionsQA.unmount()); expect(await page.evaluate(() => [window.permissionsQA.ref, window.permissionsQA.playersRef, window.permissionsQA.permissionsRef, window.permissionsQA.levelRef, window.permissionsQA.playerRefs.ada, window.permissionsQA.permissionRefs.build])).toEqual([null, null, null, null, null, null]);
});

test('host avatar changes do not invent LAN visibility or overwrite selected player state', async ({ page }) => {
  await open(page, { mode: 'primitives', avatarVisible: true, avatarSrc: '/missing-caller-avatar.png' }); const avatar = page.locator('#qa-permission-player .mc-permission-player-row__avatar img'); await expect(avatar).toHaveAttribute('src', '/missing-caller-avatar.png'); await expect(page.locator('.mc-permission-player-row__local')).toHaveCount(0);
  await configure(page, { avatarSrc: '/src/assets/player-permissions/permissions_member_star.png' }); await expect.poll(() => avatar.evaluate((n: HTMLImageElement) => n.complete && n.naturalWidth)).toBe(13); await avatar.dispatchEvent('error'); await expect(page.locator('#qa-permission-player')).toHaveAttribute('data-selected', 'false'); expect(await events(page, 'value')).toHaveLength(0);
});

test('actual mobile touch pans the player viewport while desktop retains its explicit device skip', async ({ page, context, hasTouch }) => {
  test.skip(!hasTouch, 'Actual touch-pan contract requires a touch-enabled device.'); await open(page); const viewport = part(page, 'players').locator('.mc-scroll-area__viewport'), b = await box(viewport), cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height * .8 }] });
  for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height * (.8 - i * .08) }] }); await page.waitForTimeout(20); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await expect.poll(() => viewport.evaluate(n => n.scrollTop)).toBeGreaterThan(20); await cdp.detach();
});

test('dynamic empty data localized labels and forced colors preserve native names selection and disabled semantics', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' }); await open(page, { longLabels: true }); await player(page, 'ada').focus(); await expect(player(page, 'ada')).toBeFocused(); await expect(player(page, 'ada')).toHaveAttribute('aria-selected', 'true'); await expect(player(page, 'disabled')).toBeDisabled(); await expect(player(page, 'ada').locator('.mc-permission-player-row__skin')).toBeHidden();
  await configure(page, { empty: true }); await expect(root(page).getByTestId('empty-permissions')).toBeVisible(); expect(await events(page, 'value')).toHaveLength(0);
});

test('Education IP and gamepad hints follow explicit bindings without a fabricated platform controller', async ({ page }) => {
  await open(page); await expect(root(page).getByText('127.0.0.1:19132 (host label only)', { exact: true })).toHaveCount(0); await configure(page, { education: true, gamepad: true }); await expect(root(page).getByText('127.0.0.1:19132 (host label only)', { exact: true })).toBeVisible(); await expect(root(page).getByText('HOST-B', { exact: true })).toBeVisible(); await expect(root(page).getByText('Host gamepad back', { exact: true })).toBeVisible(); await expect(root(page).getByRole('button', { name: 'Back', exact: true })).toHaveCount(0);
  await configure(page, { selectorFocused: false, contentFocused: true }); const playerFade = player(page, 'ada').locator('..').locator('.mc-permission-player-row__fade'); await expect(playerFade).toBeVisible(); await expect(playerFade).toHaveCSS('opacity', '0.5'); await expect(part(page, 'options-fade')).toBeHidden();
  await configure(page, { selectorFocused: true, contentFocused: false }); await expect(playerFade).toBeHidden(); await expect(part(page, 'options-fade')).toBeVisible(); await expect(player(page, 'ada')).toHaveAttribute('aria-selected', 'true');
});
