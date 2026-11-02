import {expect, test} from '@playwright/test';
import type {Locator, Page} from '@playwright/test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {FurnaceScreen, BlastFurnaceScreen, SmokerScreen, FurnaceScreenFrame} from '../src/furnace-screen';
import {FurnaceRecipeBook, FurnaceRecipeBookEntry, FurnaceRecipeCategoryTabs, FurnaceRecipeFilterToggle} from '../src/furnace-recipe-book';
import type {FurnaceRecipeBookProps} from '../src/furnace-recipe-book';
import type {FurnaceFixtureConfiguration} from '../demo/furnace-screen-fixture';

// Fixed Classic GUI2 source composition and native browser interaction checks.
// No native whole-page pixels or native recipe/inventory service are asserted.
const root = (page: Page) => page.locator('#furnace-primary');
const configure = (page: Page, value: Partial<FurnaceFixtureConfiguration>) => page.evaluate(value => window.furnaceFixture.configure(value), value);
const events = (page: Page) => page.evaluate(() => window.furnaceFixture.events);
const clear = (page: Page) => page.evaluate(() => window.furnaceFixture.clear());
async function loaded(page: Page) {
  await page.goto('/demo/furnace-screen-fixture.html?strict');
  await expect.poll(() => page.evaluate(() => window.furnaceFixture?.ready ?? false)).toBe(true); await expect(root(page)).toBeVisible();
}
async function rect(node: Locator, parent: Locator, expected: readonly [number, number, number, number]) {
  const actual = await node.boundingBox(), base = await parent.boundingBox(); expect(actual).not.toBeNull(); expect(base).not.toBeNull();
  for (const [value, wanted] of [[actual!.x - base!.x, expected[0]], [actual!.y - base!.y, expected[1]], [actual!.width, expected[2]], [actual!.height, expected[3]]]) expect(Math.abs(value! - wanted!)).toBeLessThanOrEqual(.05);
}
const baseBook: FurnaceRecipeBookProps = {title: 'Recipes', entries: [], categoryId: 'food', query: '', filteringEnabled: false, inventoryTab: false, categoryLabels: {food: 'Food', items: 'Items', blocks: 'Blocks', search: 'Search'}, categoryBindings: {food: {visible: true}, items: {leftmostVisible: false, normalVisible: true}, blocks: {leftmostVisible: false, normalVisible: true}}};

test('four screens and four recipe parts SSR without IO or ref mutation', () => {
  const previous = globalThis.fetch; let io = 0; globalThis.fetch = (() => {io++; throw Error('Unexpected SSR IO');}) as typeof fetch;
  try {
    const ref = {current: null as HTMLElement | null};
    for (const Screen of [FurnaceScreen, BlastFurnaceScreen, SmokerScreen]) {
      const html = renderToStaticMarkup(createElement(Screen, {title: 'SSR furnace', recipeBook: baseBook, ref})); expect(html).toContain('SSR furnace'); expect(html).toContain('data-source-game-size="326x166"');
    }
    expect(renderToStaticMarkup(createElement(FurnaceScreenFrame, {title: 'Frame', recipeBook: createElement('div', null, 'Host book'), children: createElement('div', null, 'Host processing'), layout: 'compact', ref}))).toContain('data-source-game-size="176x166"');
    expect(renderToStaticMarkup(createElement(FurnaceRecipeBook, baseBook))).toContain('Recipes');
    expect(renderToStaticMarkup(createElement(FurnaceRecipeBookEntry, {entry: {id: 'host', label: 'Host entry'}}))).toContain('Host entry');
    expect(renderToStaticMarkup(createElement(FurnaceRecipeCategoryTabs, {bindings: baseBook.categoryBindings, labels: baseBook.categoryLabels, value: 'food'}))).toContain('role="tablist"');
    expect(renderToStaticMarkup(createElement(FurnaceRecipeFilterToggle, {filteringEnabled: true}))).toContain('aria-pressed="true"');
    expect(ref.current).toBeNull(); expect(io).toBe(0);
  } finally {globalThis.fetch = previous;}
});

test('all three full screens keep 652x332, book292, fold8 and right352 source planes', async ({page}) => {
  await loaded(page);
  for (const variant of ['furnace', 'blast', 'smoker', 'frame'] as const) {
    await configure(page, {variant}); const frame = root(page); const size = await frame.boundingBox(); expect([size!.width, size!.height]).toEqual([652, 332]);
    await rect(frame.locator('.mc-furnace-screen-frame__book'), frame, [0, 0, 292, 332]);
    await rect(frame.locator('.mc-furnace-screen-frame__fold'), frame, [292, 0, 8, 332]);
    await rect(frame.locator('.mc-furnace-screen-frame__right'), frame, [300, 0, 352, 332]);
    await rect(frame.locator('.mc-furnace-screen-frame__toolbar'), frame, [454, -40, 198, 40]);
  }
});

test('real toolbar compact request shrinks the root and preserves the mounted recipe book', async ({page}) => {
  await loaded(page); const book = root(page).locator('.mc-furnace-recipe-book'), identity = await book.elementHandle();
  await root(page).getByRole('button', {name: 'Compact furnace', exact: true}).click(); await expect(root(page)).toHaveAttribute('data-furnace-layout', 'compact');
  expect((await root(page).boundingBox())!.width).toBe(352); await expect(book).toBeHidden();
  await rect(root(page).locator('.mc-furnace-screen-frame__right'), root(page), [0, 0, 352, 332]);
  await rect(root(page).locator('.mc-furnace-screen-frame__toolbar'), root(page), [154, -40, 198, 40]);
  await root(page).getByRole('button', {name: 'Expanded recipes', exact: true}).click(); await expect(book).toBeVisible();
  expect(await book.evaluate((current, old) => current === old, identity)).toBe(true); expect((await root(page).boundingBox())!.width).toBe(652);
  await configure(page, {showClose: false}); await rect(root(page).locator('.mc-furnace-screen-frame__toolbar'), root(page), [484, -40, 168, 40]);
  await expect(root(page).getByRole('button', {name: 'Close furnace', exact: true})).toHaveCount(0); await identity!.dispose();
});

test('controlled layout refusal keeps physical width and pressed state until the host accepts', async ({page}) => {
  await loaded(page); await configure(page, {acceptLayout: false}); await root(page).getByRole('button', {name: 'Compact furnace', exact: true}).click();
  await expect(root(page)).toHaveAttribute('data-furnace-layout', 'recipe-book'); expect((await root(page).boundingBox())!.width).toBe(652);
  await expect(root(page).getByRole('button', {name: 'Expanded recipes', exact: true})).toHaveAttribute('aria-pressed', 'true');
  expect(await events(page)).toEqual([{kind: 'layout', value: 'compact'}]); await configure(page, {acceptLayout: true});
  await root(page).getByRole('button', {name: 'Compact furnace', exact: true}).click(); await expect(root(page)).toHaveAttribute('data-furnace-layout', 'compact');
});

test('category holders and independent source offsets never pack hidden categories', async ({page}) => {
  await loaded(page); const tabs = page.locator('#furnace-standalone-tabs');
  for (const [name, x] of [['food', 0], ['items', 50], ['blocks', 100], ['search', 242]] as const) await rect(tabs.locator(`[data-holder="${name}"]`), tabs, [x, 0, 50, 54]);
  await configure(page, {categoryBindings: {food: {visible: false}, items: {leftmostVisible: true, normalVisible: false, offset: [-3, 2]}, blocks: {leftmostVisible: false, normalVisible: true}}});
  await expect(tabs.getByRole('tab', {name: 'Food', exact: true})).toHaveCount(0);
  await rect(tabs.locator('[data-holder="items"]'), tabs, [50, 0, 50, 54]); await rect(tabs.getByRole('tab', {name: 'Items', exact: true}), tabs, [44, 4, 50, 54]);
  await rect(tabs.locator('[data-holder="search"]'), tabs, [242, 0, 50, 54]);
  await tabs.getByRole('tab', {name: 'Items', exact: true}).focus(); await page.keyboard.press('End'); await expect(tabs.getByRole('tab', {name: 'Search', exact: true})).toBeFocused();
});

test('search, category and filtering are controlled native requests with host rejection', async ({page}) => {
  await loaded(page); await root(page).getByRole('tab', {name: 'Search', exact: true}).click();
  const query = root(page).getByRole('searchbox', {name: 'Search furnace recipes', exact: true}); await query.fill('Iron'); await expect(query).toHaveValue('Iron');
  await root(page).getByRole('button', {name: 'Furnace filter', exact: true}).click(); await expect(root(page).getByRole('button', {name: 'Furnace filter', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await configure(page, {acceptBook: false}); await query.fill('Rejected'); await expect(query).toHaveValue('Iron');
  await root(page).getByRole('button', {name: 'Furnace filter', exact: true}).click(); await expect(root(page).getByRole('button', {name: 'Furnace filter', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await expect(root(page).locator('.mc-furnace-recipe-book').getByRole('grid').getByRole('gridcell')).toHaveCount(21);
  expect((await events(page)).filter(event => event.kind === 'query').map(event => event.value)).toEqual(['Iron', 'Rejected']);
});

test('inventory and search bindings produce all four independent source viewport geometries', async ({page}) => {
  await loaded(page); const book = root(page).locator('.mc-furnace-recipe-book');
  for (const [inventoryTab, categoryId, top, height] of [[false, 'food', 42, 278], [false, 'search', 74, 246], [true, 'food', 12, 308], [true, 'search', 44, 276]] as const) {
    await configure(page, {inventoryTab, categoryId}); await rect(book.locator('.mc-recipe-book__items'), book, [12, top, 268, height]);
    if (inventoryTab) await expect(book.locator('.mc-recipe-book__header')).toBeHidden();
    else await rect(book.locator('.mc-recipe-book__title'), book, [18, 16, categoryId === 'search' ? 262 : 204, 20]);
    if (categoryId === 'search') {
      await rect(book.locator('input[type="search"]'), book, [12, inventoryTab ? 12 : 38, 208, 32]);
      await rect(book.locator('.mc-recipe-search__filter'), book, [224, inventoryTab ? 11 : 37, 58, 34]);
    } else if (!inventoryTab) await rect(book.locator('.mc-recipe-book__header-filter'), book, [224, 7, 58, 34]);
  }
});

test('standalone filter keeps 58x34 hit box, inset2 whole54x30 art and real readOnly guard', async ({page}) => {
  await loaded(page); const filter = page.locator('#furnace-standalone-filter'); expect(await filter.evaluate(node => node === window.furnaceFixture.filter)).toBe(true);
  const box = await filter.boundingBox(); expect([box!.width, box!.height]).toEqual([58, 34]);
  expect(await filter.evaluate(node => {const style = getComputedStyle(node, '::before'); return [style.top, style.right, style.bottom, style.left, style.backgroundSize];})).toEqual(['2px', '2px', '2px', '2px', '54px 30px']);
  await configure(page, {filteringEnabled: true, readOnlyFilter: true}); await expect(filter).toHaveAttribute('aria-pressed', 'true');
  await expect(filter).toBeDisabled(); await filter.evaluate(node => (node as HTMLButtonElement).click()); await expect(filter).toHaveAttribute('aria-pressed', 'true'); expect(await events(page)).toEqual([]);
  await configure(page, {readOnlyFilter: false}); await filter.click(); await expect(filter).toHaveAttribute('aria-pressed', 'false');
});

test('furnace entry strips wider crafting count, durability and group overlays while retaining real art', async ({page}) => {
  await loaded(page); const entry = page.locator('#furnace-standalone-entry'); expect(await entry.evaluate(node => node === window.furnaceFixture.entry)).toBe(true);
  await expect(entry.locator('img')).toHaveCount(1); await expect(entry.locator('.mc-slot__count,.mc-slot__durability,.mc-recipe-book-entry__modifier')).toHaveCount(0);
  await expect(entry).not.toHaveAttribute('data-modifier', 'expand'); await expect(entry).toHaveAttribute('aria-label', 'Wide host entry');
  await entry.click(); expect((await events(page)).at(-1)).toEqual({kind: 'recipe', value: 'wide-host:primary'});
});

test('source Search to toolbar focus link and native key veto preserve owner intent', async ({page}) => {
  await loaded(page); const search = root(page).getByRole('tab', {name: 'Search', exact: true}), toggle = root(page).getByRole('button', {name: 'Expanded recipes', exact: true});
  await search.focus(); await search.press('ArrowRight'); await expect(toggle).toBeFocused(); await toggle.press('ArrowLeft'); await expect(search).toBeFocused();
  await configure(page, {preventKey: true}); await search.press('ArrowRight'); await expect(search).toBeFocused(); await search.press('Escape'); expect(await events(page)).toEqual([]);
  await configure(page, {preventKey: false}); await search.press('Escape'); expect(await events(page)).toEqual([{kind: 'close'}]);
});

test('toolbar-only disabled and native capture veto stop chrome while book state remains independent', async ({page}) => {
  await loaded(page); await configure(page, {preventClick: true}); await root(page).getByRole('button', {name: 'Furnace help', exact: true}).click(); expect(await events(page)).toEqual([]);
  await configure(page, {preventClick: false, disabled: true}); await expect(root(page).getByRole('button', {name: 'Close furnace', exact: true})).toBeDisabled();
  await root(page).getByRole('button', {name: 'Close furnace', exact: true}).evaluate(node => (node as HTMLButtonElement).click()); expect(await events(page)).toEqual([]);
  await root(page).getByRole('button', {name: 'Furnace filter', exact: true}).click(); expect(await events(page)).toEqual([{kind: 'filter', value: true}]);
  await clear(page); await configure(page, {disabled: false}); await root(page).getByRole('button', {name: 'Furnace help', exact: true}).click(); await root(page).getByRole('button', {name: 'Close furnace', exact: true}).click();
  expect(await events(page)).toEqual([{kind: 'help'}, {kind: 'close'}]);
});

test('real refs remain valid and clear on unmount without ghost Escape actions', async ({page}) => {
  await loaded(page); expect(await root(page).evaluate(node => node === window.furnaceFixture.frame)).toBe(true);
  expect(await page.locator('#furnace-standalone-book').evaluate(node => node === window.furnaceFixture.book)).toBe(true);
  expect(await page.locator('#furnace-standalone-tabs').evaluate(node => node === window.furnaceFixture.tabs)).toBe(true);
  await configure(page, {mounted: false}); await expect(root(page)).toHaveCount(0);
  expect(await page.evaluate(() => [window.furnaceFixture.frame, window.furnaceFixture.book, window.furnaceFixture.tabs, window.furnaceFixture.filter, window.furnaceFixture.entry])).toEqual([null, null, null, null, null]);
  await page.locator('#furnace-after').focus(); await page.keyboard.press('Escape'); expect(await events(page)).toEqual([]);
});

test('gallery shows all three screens and the real toolbar compacts only the chosen screen', async ({page}) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await page.goto('/#furnace-screens');
  const demo = page.getByTestId('furnace-screen-demo'); await expect(demo).toBeVisible();
  for (const name of ['furnace', 'blast', 'smoker']) await expect(page.getByTestId(`furnace-demo-${name}`)).toBeVisible();
  const furnace = page.getByTestId('furnace-demo-furnace'); await furnace.getByRole('button', {name: '紧凑模式', exact: true}).click();
  expect((await furnace.boundingBox())!.width).toBe(352); expect((await page.getByTestId('furnace-demo-blast').boundingBox())!.width).toBe(652);
  await furnace.getByRole('button', {name: '配方簿模式', exact: true}).click(); expect((await furnace.boundingBox())!.width).toBe(652);
  await furnace.getByRole('button', {name: '烧炼帮助', exact: true}).click(); await expect(demo.getByTestId('furnace-screen-demo-status')).toContainText('帮助');
  await furnace.getByRole('button', {name: '关闭烧炼界面', exact: true}).click(); await expect(furnace).toBeHidden();
  const reopen = demo.getByRole('button', {name: '重新打开熔炉', exact: true}); await expect(reopen).toBeFocused(); await reopen.click(); await expect(furnace).toBeVisible();
  expect(errors).toEqual([]);
});
