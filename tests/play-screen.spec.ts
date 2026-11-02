import {expect, test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type {Locator, Page} from '@playwright/test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PlayScreen} from '../src/play-screen';
import {createPlayDemoProps} from '../demo/play-screen-data';
import type {PlayFixtureConfiguration} from '../demo/play-screen-fixture';

// Exact source layout + actual Web lifecycle/host contracts. These are not
// native game UI, account/connection services, fonts or whole-screen parity.
const root = (page: Page) => page.locator('#play-fixture-screen');
const pane = (page: Page, tab: 'worlds' | 'friends' | 'servers') => root(page).locator('[data-play-pane="' + tab + '"]');
const tab = (page: Page, value: string) => root(page).locator('[data-play-tab="' + value + '"]');
const localWorldStart = (page: Page) => pane(page,'worlds').locator('[data-world-id="local-1"] .mc-play-world-row__main[data-play-target="button.menu_start_local_world"]');
const popup = (page: Page, kind: 'join_by_code' | 'high_ping_warning') => root(page).locator('[data-play-popup="' + kind + '"]');
const configure = (page: Page, value: Partial<PlayFixtureConfiguration>) => page.evaluate(value => window.playScreenFixture.configure(value), value);
const clear = (page: Page) => page.evaluate(() => window.playScreenFixture.clear());
const requests = (page: Page) => page.evaluate(() => window.playScreenFixture.requests);
async function loaded(page: Page) {
  await page.goto('/demo/play-screen-fixture.html');
  await expect.poll(() => page.evaluate(() => window.playScreenFixture?.ready ?? false)).toBe(true);
  await expect(root(page)).toBeVisible();
}
async function rect(node: Locator, parent: Locator, expected: readonly [number, number, number, number]) {
  const actual = await node.boundingBox(), base = await parent.boundingBox(); expect(actual).not.toBeNull(); expect(base).not.toBeNull();
  for (const [value, wanted] of [[actual!.x - base!.x, expected[0]], [actual!.y - base!.y, expected[1]], [actual!.width, expected[2]], [actual!.height, expected[3]]]) expect(Math.abs(value! - wanted!)).toBeLessThanOrEqual(.05);
}

test('complete default Play SSR keeps all three source families with no IO, effects or refs', () => {
  const oldFetch = globalThis.fetch, oldError = console.error; let io = 0; const warnings: unknown[][] = [];
  globalThis.fetch = (() => {io++; throw Error('Unexpected SSR IO');}) as typeof fetch; console.error = (...args) => warnings.push(args);
  try {
    const ref = {current: null as HTMLDivElement | null};
    for (const value of ['worlds', 'friends', 'servers'] as const) {
      const p = createPlayDemoProps(); const html = renderToStaticMarkup(createElement(PlayScreen, {...p, ref, navigation: {...p.navigation, value}}));
      for (const text of ['Local meadow', 'LAN example', 'Featured example', '27', '9', '4']) expect(html).toContain(text);
      expect(html).toContain('data-profile="classic-desktop-default"'); expect(html).toContain('data-native-certified="false"');
    }
    expect(ref.current).toBeNull(); expect(io).toBe(0); expect(warnings).toEqual([]);
  } finally {globalThis.fetch = oldFetch; console.error = oldError;}
});

test('unified styles alone establish282 by H-50 frame and270 by H-88 inset body', async ({page}) => {
  await loaded(page);
  for (const [width, height, scale] of [[360, 300, 2], [400, 360, 1], [320, 240, 3]] as const) {
    await configure(page, {viewportWidth: width, viewportHeight: height, scale});
    await expect.poll(() => root(page).evaluate(node => node.getBoundingClientRect().width)).toBe(width * scale);
    await rect(root(page).locator('.mc-play-frame__panel'), root(page), [(width - 282) * scale / 2, 25 * scale, 282 * scale, (height - 50) * scale]);
    await rect(root(page).locator('.mc-play-frame__content'), root(page), [((width - 282) / 2 + 6) * scale, 57 * scale, 270 * scale, (height - 88) * scale]);
  }
});

test('close holder stays30 wide when raw exit-button binding hides the close hitbox', async ({page}) => {
  await loaded(page); const holder = root(page).locator('.mc-play-frame__close-holder');
  const before = await holder.boundingBox(); await configure(page, {exitButtonVisible: true});
  await expect(root(page).getByRole('button', {name: 'Close Play', exact: true})).toHaveCount(0);
  const after = await holder.boundingBox(); expect(after).toEqual(before); expect(after!.width).toBe(60);
  await configure(page, {exitButtonVisible: false}); await expect(root(page).getByRole('button', {name: 'Close Play', exact: true})).toBeVisible();
});

test('source three tabs preserve widths, icons and literal counts independent of arrays', async ({page}) => {
  await loaded(page);
  const navigation = root(page).getByRole('tablist');
  for (const [value, x, width] of [['worlds', 0, 83.82], ['friends', 83.82, 83.82], ['servers', 167.64, 86.36]] as const) await rect(tab(page, value), navigation, [x * 2, 0, width * 2, 60]);
  await expect(tab(page, 'worlds')).toHaveAttribute('data-source-edge', 'leftmost');
  await expect(tab(page, 'worlds').locator('.mc-play-navigation__count')).toHaveText('27');
  await expect(tab(page, 'friends').locator('.mc-play-navigation__count')).toHaveText('9');
  await expect(tab(page, 'servers').locator('.mc-play-navigation__count')).toHaveText('4');
  await expect(pane(page, 'worlds').locator('[data-world-id]')).toHaveCount(2);
});

test('visible tab labels and world metadata remain in native accessible names',async({page})=>{
  await loaded(page);
  const expected=createPlayDemoProps();
  const literal=(value:string)=>new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+'));
  for(const active of ['worlds','friends','servers']as const){
    await configure(page,{tab:active});await expect(pane(page,active)).toBeVisible();
    for(const value of ['worlds','friends','servers']as const){
      const control=tab(page,value);await expect(control).toBeVisible();
      expect(await control.evaluate(node=>node.hasAttribute('aria-label'))).toBe(false);
      await expect(control).toHaveAccessibleName(literal(expected.navigation.labels[value]));
      await expect(control).toHaveAccessibleName(literal(expected.navigation.counts[value]));
    }
    const result=await new AxeBuilder({page}).include('#play-fixture-screen').withRules(['label-content-name-mismatch']).analyze();
    expect(result.violations,`visible ${active} source labels must remain in accessible names`).toEqual([]);
  }
  await configure(page,{tab:'worlds'});await expect(pane(page,'worlds')).toBeVisible();
  const item=expected.worlds.localWorlds.items.find(item=>item.id==='local-1')!;
  const main=localWorldStart(page);expect(await main.evaluate(node=>node.hasAttribute('aria-label'))).toBe(false);
  for(const value of [item.name,item.date,item.gameMode,item.fileSize])await expect(main).toHaveAccessibleName(literal(value));
});

test('tab click and roving arrows change only accepted active pane while retaining DOM nodes', async ({page}) => {
  await loaded(page); const world = await pane(page, 'worlds').elementHandle();
  await tab(page, 'friends').click(); await expect(pane(page, 'friends')).toBeVisible(); await expect(pane(page, 'worlds')).toBeHidden();
  await tab(page, 'friends').press('ArrowRight'); await expect(tab(page, 'servers')).toBeFocused(); await expect(pane(page, 'servers')).toBeVisible();
  await tab(page, 'servers').press('Home'); await expect(tab(page, 'worlds')).toBeFocused();
  expect(await pane(page, 'worlds').evaluate((node, previous) => node === previous, world)).toBe(true); await world!.dispose();
});

test('controlled tab refusal keeps selected pane despite focus movement', async ({page}) => {
  await loaded(page); await configure(page, {acceptTab: false}); await clear(page);
  await tab(page, 'friends').click(); await expect(tab(page, 'worlds')).toHaveAttribute('aria-selected', 'true');
  await expect(pane(page, 'worlds')).toBeVisible(); await expect(pane(page, 'friends')).toBeHidden();
  await expect.poll(async () => (await requests(page)).map(item => item.value)).toEqual(['friends']);
});

test('bracket navigation observes source scope while composing keys remain inert', async ({page}) => {
  await loaded(page); await tab(page, 'worlds').focus(); await page.keyboard.press(']');
  await expect(tab(page, 'friends')).toHaveAttribute('aria-selected', 'true');
  await clear(page);
  await tab(page, 'friends').evaluate(node => node.dispatchEvent(new KeyboardEvent('keydown', {key: ']', isComposing: true, bubbles: true, cancelable: true})));
  await expect(tab(page, 'friends')).toHaveAttribute('aria-selected', 'true'); expect(await requests(page)).toEqual([]);
  await page.locator('#play-fixture-opener').click(); await popup(page, 'join_by_code').getByRole('textbox').fill('x[y]');
  expect((await requests(page)).filter(item => item.target === 'navigation_tab')).toEqual([]);
});

test('real ancestor click veto prevents tab selection before semantic notification', async ({page}) => {
  await loaded(page); await configure(page, {preventClick: true}); await clear(page); await tab(page, 'friends').click();
  await expect(tab(page, 'worlds')).toHaveAttribute('aria-selected', 'true'); expect(await requests(page)).toEqual([]);
});

test('real ancestor keyboard veto prevents roving selection and focus move', async ({page}) => {
  await loaded(page); await configure(page, {preventKey: true}); await tab(page, 'worlds').focus(); await clear(page);
  await page.keyboard.press('ArrowRight'); await expect(tab(page, 'worlds')).toBeFocused(); expect(await requests(page)).toEqual([]);
});

test('world heading flag is label-only and never erases independent source grid', async ({page}) => {
  await loaded(page); await configure(page, {localLabelVisible: false});
  await expect(pane(page, 'worlds').locator('[data-play-node="worlds_label"]')).toHaveCount(0);
  await expect(pane(page, 'worlds').locator('[data-source-collection="local_worlds"][role="list"] [data-world-id]')).toHaveCount(2);
  await localWorldStart(page).click();
  await expect.poll(async () => (await requests(page)).map(item => item.target)).toContain('button.menu_start_local_world');
});

test('loading and retained world rows coexist independently', async ({page}) => {
  await loaded(page); await configure(page, {loadingLegacy: true});
  await expect(pane(page, 'worlds').locator('[data-play-node="loading_legacy_worlds_panel"]')).toBeVisible();
  await expect(pane(page, 'worlds').locator('[data-world-id]')).toHaveCount(2);
  await expect(pane(page, 'worlds').locator('.mc-play-loading__clip')).toHaveCSS('width', '128px');
});

test('separate20percent bottom pane contains storage status rather than legacy rows', async ({page}) => {
  await loaded(page); await configure(page, {separateStorage: true});
  const worlds = pane(page, 'worlds'), storage = worlds.locator('.mc-play-worlds__storage-scroll');
  expect(Math.abs((await storage.boundingBox())!.height - 84.8)).toBeLessThanOrEqual(.05);
  expect(Math.abs((await worlds.locator('.mc-play-source-scroll').first().boundingBox())!.height - 339.2)).toBeLessThanOrEqual(.05);
  await expect(storage.locator('[data-source-control="play.legacy_world_content_status_area_panel"]')).toBeVisible();
  await expect(storage.locator('[data-world-id]')).toHaveCount(0);
  await expect(storage.locator('[data-raw-clip-ratio="0.25"]')).toHaveAttribute('data-source-layer', '3');
});

test('friends messages and actual friend/LAN collections keep separate flags and identities', async ({page}) => {
  await loaded(page); await configure(page, {tab: 'friends', noFriendsMessage: true});
  const friends = pane(page, 'friends'); await expect(friends.locator('[data-play-node="no_friends_grid_message"]')).toBeVisible();
  await expect(friends.locator('[data-network-id]')).toHaveCount(2);
  await friends.locator('[data-network-id="lan-1"] button').first().click();
  await expect.poll(async () => (await requests(page)).map(item => [item.target, item.collection, item.id, item.index])).toContainEqual(['button.menu_network_world_item', 'lan_network_worlds', 'lan-1', 0]);
});

test('server activation selects details without firing a join request', async ({page}) => {
  await loaded(page); await configure(page, {tab: 'servers'}); await clear(page);
  await pane(page, 'servers').locator('[data-server-id="additional-1"] [data-play-target="server_navigation_toggle"]').click();
  await expect(pane(page, 'servers').locator('[data-detail="additional"]')).toBeVisible();
  await expect.poll(async () => (await requests(page)).map(item => item.target)).toEqual(['server_navigation_toggle']);
  await pane(page, 'servers').locator('[data-detail="additional"] [data-play-target="button.menu_network_server_item"]').click();
  await expect.poll(async () => (await requests(page)).map(item => item.target)).toEqual(['server_navigation_toggle', 'button.menu_network_server_item']);
});

test('all server detail visibility inputs remain independent rather than derived from selection', async ({page}) => {
  await loaded(page); await configure(page, {tab: 'servers', allDetails: true});
  for (const kind of ['featured', 'additional', 'add']) await expect(pane(page, 'servers').locator('[data-detail="' + kind + '"]')).not.toHaveAttribute('hidden');
  await configure(page, {rightVisible: false}); await expect(pane(page, 'servers').locator('.mc-play-servers-content__right')).toBeHidden();
  await expect(pane(page, 'servers').locator('[data-server-id="featured-1"]')).toBeVisible();
});

test('server feature message is a separate source plane without inferred service work', async ({page}) => {
  await loaded(page); await configure(page, {tab: 'servers', featureMessage: true});
  await expect(pane(page, 'servers').locator('.mc-play-servers-content__feature-message')).toBeVisible();
  await expect(pane(page, 'servers').locator('.mc-play-servers-content__split')).toBeHidden(); expect(await requests(page)).toEqual([]);
});

test('join-code popup centers inside explicit viewport rather than browser window', async ({page}) => {
  await loaded(page); await configure(page, {viewportWidth: 400, viewportHeight: 360, joinOpen: true});
  await rect(popup(page, 'join_by_code').locator('[role="dialog"]'), root(page), [200, 270, 400, 180]);
  await expect(popup(page, 'join_by_code')).toHaveCSS('position', 'absolute');
});

test('high-ping popup has its own250x170 content centered in the same explicit viewport', async ({page}) => {
  await loaded(page); await configure(page, {highOpen: true});
  await rect(popup(page, 'high_ping_warning').locator('[role="dialog"]'), root(page), [110, 130, 500, 340]);
  await expect(popup(page, 'high_ping_warning').locator('.mc-play-popup__warning-icons>span')).toHaveCount(2);
});

test('modal focus containment, background inertness and Escape return to actual opener', async ({page}) => {
  await loaded(page); await page.locator('#play-fixture-opener').click(); const join = popup(page, 'join_by_code');
  await expect(join).toBeVisible(); expect(await join.evaluate(node => node.contains(node.ownerDocument.activeElement))).toBe(true);
  await page.locator('#play-fixture-after').evaluate(node => (node as HTMLElement).focus());
  expect(await join.evaluate(node => node.contains(node.ownerDocument.activeElement))).toBe(true);
  await join.locator('[data-play-popup-action="join"]').focus(); await page.keyboard.press('Tab'); await expect(join.locator('[data-play-popup-action="close"]')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(join).toBeHidden(); await expect(page.locator('#play-fixture-opener')).toBeFocused();
  expect((await requests(page)).filter(item => item.target === 'button.menu_exit')).toEqual([]);
});

test('two simultaneous popup factories give only the top owner the first Escape', async ({page}) => {
  await loaded(page); await page.locator('#play-fixture-opener').click(); await configure(page, {highOpen: true}); await clear(page);
  await page.keyboard.press('Escape'); await expect(popup(page, 'high_ping_warning')).toBeHidden(); await expect(popup(page, 'join_by_code')).toBeVisible();
  await expect.poll(async () => (await requests(page)).map(item => item.target)).toEqual(['popup_dialog.escape']);
  await page.keyboard.press('Escape'); await expect(popup(page, 'join_by_code')).toBeHidden();
});

test('code uses literal input, maxLength15, accepted state and separate join action', async ({page}) => {
  await loaded(page); await page.locator('#play-fixture-opener').click(); const join = popup(page, 'join_by_code'), input = join.getByRole('textbox');
  await expect(input).toHaveAttribute('maxlength', '15'); await input.fill(' aB- 12 '); await expect(input).toHaveValue(' aB- 12 ');
  await join.getByRole('button', {name: 'Join code', exact: true}).click();
  await expect.poll(async () => (await requests(page)).filter(item => item.target === 'button.menu_network_join_by_code_popup_join').map(item => item.value)).toEqual([' aB- 12 ']);
  await clear(page); await input.fill(''); await input.pressSequentially('1234567890123456789'); await expect(input).toHaveValue('123456789012345');
});

test('readOnly popups block edits and joins but retain Cancel and close', async ({page}) => {
  await loaded(page); await configure(page, {readOnly: true, joinOpen: true});
  await expect(popup(page, 'join_by_code').getByRole('textbox')).toHaveAttribute('readonly', '');
  await expect(popup(page, 'join_by_code').getByRole('button', {name: 'Join code', exact: true})).toBeDisabled();
  await popup(page, 'join_by_code').getByRole('button', {name: 'Close code dialog', exact: true}).click();
  await configure(page, {highOpen: true}); await expect(popup(page, 'high_ping_warning').getByRole('button', {name: 'Join anyway', exact: true})).toBeDisabled();
  await popup(page, 'high_ping_warning').getByRole('button', {name: 'Cancel connection', exact: true}).click(); await expect(popup(page, 'high_ping_warning')).toBeHidden();
});

test('ancestor popup veto cancels join and Escape without relinquishing its owner', async ({page}) => {
  await loaded(page); await configure(page, {joinOpen: true, preventClick: true, preventKey: true}); await clear(page);
  await popup(page, 'join_by_code').getByRole('button', {name: 'Join code', exact: true}).click();
  await page.keyboard.press('Escape'); await expect(popup(page, 'join_by_code')).toBeVisible(); expect(await requests(page)).toEqual([]);
});

test('queued source actions are discarded when their actual owner unmounts in ancestor bubble', async ({page}) => {
  await loaded(page); await configure(page, {unmountOnClick: true}); await clear(page);
  await localWorldStart(page).click();
  await expect(root(page)).toHaveCount(0); expect(await requests(page)).toEqual([]);
  await configure(page, {mounted: true, unmountOnClick: false, joinOpen: true}); await expect(popup(page, 'join_by_code')).toBeVisible();
  await configure(page, {unmountOnClick: true}); await clear(page); await popup(page, 'join_by_code').getByRole('button', {name: 'Join code', exact: true}).click();
  await expect(root(page)).toHaveCount(0); expect(await requests(page)).toEqual([]);
});

test('late native document veto cancels deferred world and root-close semantic actions', async ({page}) => {
  await loaded(page);
  await page.evaluate(() => document.addEventListener('click', event => event.preventDefault(), {once: true}));
  await localWorldStart(page).click();
  expect(await requests(page)).toEqual([]);
  await page.evaluate(() => document.addEventListener('click', event => event.preventDefault(), {once: true}));
  await root(page).getByRole('button', {name: 'Close Play', exact: true}).click(); expect(await requests(page)).toEqual([]);
});

test('18to20 font tokens reach navigation, rows, detail content and both popups', async ({page}) => {
  await loaded(page);
  const selectors = ['.mc-play-navigation', '.mc-play-world-row', '.mc-play-network-row', '.mc-play-server-row', '.mc-play-server-details', '.mc-play-popup'];
  for (const size of [18, 20]) {
    await configure(page, {fontSize: size});
    await expect.poll(() => root(page).evaluate((node, selectors) => selectors.map(selector => getComputedStyle(node.querySelector(selector)!).fontSize), selectors)).toEqual(selectors.map(() => size + 'px'));
  }
});

test('mouse scroll reserves9 logical pixels and keeps UA bars hidden while wheel scrolls', async ({page}) => {
  await loaded(page); await configure(page, {longWorlds: true});
  const scroll = pane(page, 'worlds').locator('.mc-play-source-scroll').first(), area = scroll.locator('.mc-scroll-area'), viewport = area.locator('.mc-scroll-area__viewport');
  expect(await area.evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').at(-1))).toBe('18px');
  await expect(viewport).toHaveCSS('scrollbar-width', 'none'); await expect(area).toHaveAttribute('data-variant', 'document');
  await viewport.hover(); await page.mouse.wheel(0, 180); await expect.poll(() => viewport.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  expect(await viewport.evaluate(node => (node as HTMLElement).offsetWidth - node.clientWidth)).toBe(0);
});

test('explicit touch scroll uses touch variant without turning responsive width into another source layout', async ({page}) => {
  await loaded(page); await configure(page, {inputMode: 'touch', longWorlds: true});
  const scroll = pane(page, 'worlds').locator('.mc-play-source-scroll').first(), area = scroll.locator('.mc-scroll-area');
  await expect(scroll).toHaveAttribute('data-input-mode', 'touch'); await expect(area).toHaveAttribute('data-variant', 'touch');
  expect(await root(page).locator('.mc-play-frame__panel').evaluate(node => node.getBoundingClientRect().width)).toBe(564);
  await expect(area.locator('.mc-scroll-area__viewport')).toHaveCSS('scrollbar-width', 'none');
});

test('real refs and React19 callback cleanup survive StrictMode, remount and complete unmount', async ({page}) => {
  await loaded(page);
  expect(await root(page).evaluate(node => node === window.playScreenFixture.root)).toBe(true);
  expect(await root(page).locator('.mc-play-frame__panel').evaluate(node => node === window.playScreenFixture.panel)).toBe(true);
  expect(await root(page).locator('.mc-play-frame__content').evaluate(node => node === window.playScreenFixture.content)).toBe(true);
  for (const value of ['worlds', 'friends', 'servers'] as const) expect(await pane(page, value).evaluate((node, value) => node.firstElementChild === window.playScreenFixture.panes[value], value)).toBe(true);
  await configure(page, {revision: 1}); await expect(root(page)).toBeVisible(); await configure(page, {mounted: false});
  await expect.poll(() => page.evaluate(() => ({root: window.playScreenFixture.root, panel: window.playScreenFixture.panel, content: window.playScreenFixture.content}))).toEqual({root: null, panel: null, content: null});
  const refs = await page.evaluate(() => window.playScreenFixture.refs); expect(refs.filter(x => x === 'root:attach').length).toBe(refs.filter(x => x === 'root:cleanup').length);
});

test('fixed canvas overflows only its local host and has no page, asset or renderer errors', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message)); page.on('response', response => {if (response.status() >= 400) errors.push(response.status() + ' ' + response.url());});
  await loaded(page); await page.setViewportSize({width: 320, height: 640});
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  const host = page.locator('#play-fixture-host'); expect(await host.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
  await host.evaluate(node => {node.scrollLeft = 100;}); expect(await host.evaluate(node => node.scrollLeft)).toBe(100);
  await configure(page, {tab: 'friends'}); await configure(page, {tab: 'servers'}); await expect(pane(page, 'servers')).toBeVisible();
  expect(errors).toEqual([]);
});
