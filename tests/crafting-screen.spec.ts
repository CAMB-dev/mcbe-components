import { expect, test, devices } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

// Independent original inventory_screen.json/ui_common.json and PNG metadata,
// matched to the installed26.60 base resources and official full-release ZIP.
// These source values are not generated from production CSS or its manifest.
const pins = [["recipe_book_item_bg",5,5,"d70b22cb99397cd6ef3902df63166e719b6982cf18f98bc95f368977c44533c4"],["recipe_book_light_button",3,3,"51459a443f86ed9fb9fdfdc8c3c3389071bf8a95e3d02f9260ea2273c7547b77"],["recipe_book_dark_button_pressed",3,3,"0c17b82f946ebd0182462dac001522b05e03da5263b17231bfd2176966adfd41"],["recipe_book_dark_button",3,3,"a7cb75a4f23c778bd7b33bd384cdac0a24fd4aee3af93d984e12c513b1182a9c"],["recipe_book_touch_cell_selected",4,4,"95743c4386456a219bdaaec2893cb0cee5de0810e15560a184854c797efa9267"],["recipe_book_red_button",3,3,"0e58a82cdcb5ad26f7595f68cd481c347e39563a997fdb9b90599cc87217c654"],["recipe_book_collapse_icon",7,7,"4d71c9ea45ffa8aeb0de3f9c889878e1da122cd46c735ec00882b864f721cc22"],["recipe_book_expand_icon",7,7,"2660820c417ed4633ad584963286aacc85cfcc581a930f262aa79cae7f30bbd7"],["pocket_ui_highlight_selected_slot",16,16,"59909e979328ea00f94225c1153a87c713d0481faa65574257332bd310007ebe"]] as const;
const output = new URL(`../.cache/crafting-screen-qa/${process.env.MCBE_CRAFTING_CAPTURE_TAG ?? 'integrated'}/`, import.meta.url);
const sourceOutput = new URL('../.cache/crafting-screen-qa/source/', import.meta.url);
const fixtureUrl = '/demo/crafting-screen-fixture.html';
type Box = { x: number; y: number; width: number; height: number };
async function box(node: Locator): Promise<Box> { const value = await node.boundingBox(); if (!value) throw new Error('Missing source region'); return value; }
async function rect(node: Locator, frame: Box, expected: readonly [number, number, number, number]) {
  const value = await box(node);
  for (const [difference, label] of [[value.x - frame.x - expected[0] * 2, 'x'], [value.y - frame.y - expected[1] * 2, 'y'],
    [value.width - expected[2] * 2, 'width'], [value.height - expected[3] * 2, 'height']] as const) expect(Math.abs(difference), `source ${label}`).toBeLessThanOrEqual(.025);
}
async function open(page: Page) { await page.goto(fixtureUrl); await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0); }
const sample = (page: Page, id: string) => page.locator(`[data-case="${id}"]`);
const screen = (page: Page, id = 'crafting-wide') => sample(page, id).locator('.mc-crafting-screen');
const eventLog = (page: Page) => page.getByRole('status', { name: 'Crafting fixture events', exact: true });
async function raw(name: string) {
  const pin = pins.find(row => row[0] === name); if (!pin) throw new Error(`Unpinned source ${name}`);
  const path = new URL(`${name}.png`, sourceOutput); let bytes: Buffer;
  try { bytes = await readFile(path); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const study = new URL(`../.cache/crafting-recipe-study/assets/${name}.png`, import.meta.url);
    if (existsSync(study)) bytes = await readFile(study);
    else {
      const response = await fetch(`https://raw.githubusercontent.com/Mojang/bedrock-samples/15701fa9c13923f12662984c32c124327e40e3d3/resource_pack/textures/ui/${name}.png`);
      if (!response.ok) throw new Error(`Original ${name}: HTTP${response.status}`); bytes = Buffer.from(await response.arrayBuffer());
    }
    await mkdir(sourceOutput, { recursive: true }); await writeFile(path, bytes);
  }
  expect(createHash('sha256').update(bytes).digest('hex'), name).toBe(pin[3]); return bytes;
}
function archiveEntry(buffer: Buffer, name: string) {
  const count = buffer.readUInt32LE(8), base = 16 + count * 256;
  for (let index = 0; index < count; index++) {
    const row = 16 + index * 256;
    if (buffer.toString('utf8', row + 1, row + 1 + buffer[row]!) === name) return buffer.subarray(base + buffer.readUInt32LE(row + 248), base + buffer.readUInt32LE(row + 248) + buffer.readUInt32LE(row + 252));
  }
  throw new Error(`Missing original ${name}`);
}
function child(control: any, name: string) { const result = control.controls.find((entry: Record<string, unknown>) => name in entry)?.[name]; if (!result) throw new Error(`Missing source child ${name}`); return result; }

test('original recipe backgrounds, group overlays and selected frame retain pinned bytes and dimensions', async () => {
  for (const [name, width, height] of pins) { const bytes = await raw(name); expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([width, height]); }
  const diamond = await readFile(new URL('../demo/assets/minecraft/diamond.png', import.meta.url));
  expect(createHash('sha256').update(diamond).digest('hex')).toBe('996f80148a6909588d8f83d462ddbea5302402ba644f8e7d2e5bf0b69119b862');
});

test('optional native declarations preserve326 stack, source recipe count binding and seven-pixel overlay anchor', async () => {
  const root = join(process.env.MCBE_INSTALL_ROOT ?? 'C:/XboxGames/Minecraft for Windows/Content', 'data/resource_packs/vanilla/__brarchive');
  test.skip(!existsSync(join(root, 'ui.brarchive')), 'Matching user-owned native source is optional.');
  const archive = await readFile(join(root, 'ui.brarchive')), source = JSON.parse(archiveEntry(archive, 'inventory_screen.json').toString());
  expect(child(source.recipe_inventory_screen_content, 'content_stack_panel').size).toEqual([326, 166]);
  const stack = child(source.recipe_inventory_screen_content, 'content_stack_panel');
  expect(child(stack, 'center_fold@common.center_fold').size).toEqual([4, 166]); expect(child(stack, 'survival_padding').size).toEqual([75, '100%']);
  expect(source['grid_item_for_recipe_book@crafting.inventory_container_item']).toMatchObject({ '$stack_count_binding_name': '#recipe_craftable_count', '$item_collection_name': 'recipe_book', '$durability_bar_required': false, '$storage_bar_required': false, '$scrolling_grid_item_size|default': [18, 18] });
  expect(source.item_overlay_image).toMatchObject({ size: [7, 7], offset: [-1, -1], anchor_from: 'bottom_right', anchor_to: 'bottom_right' });
  expect(source.scroll_grid.grid_rescaling_type).toBe('horizontal');
  const textures = await readFile(join(root, 'textures/ui.brarchive'));
  for (const name of pins.map(row => row[0])) expect(archiveEntry(textures, `${name}.png`).equals(await raw(name)), name).toBe(true);
  expect(JSON.parse(archiveEntry(textures, 'recipe_book_item_bg.json').toString())).toEqual({ nineslice_size: 1, base_size: [5, 5] });
  expect(JSON.parse(archiveEntry(textures, 'pocket_ui_highlight_selected_slot.json').toString())).toEqual({ nineslice_size: 5, base_size: [16, 16] });
});

test('wide workbench keeps326x166 composition, right-pane3x3, source inventory and two-mode toolbar', async ({ page }) => {
  await open(page); const root = screen(page), frame = await box(root); expect([frame.width, frame.height]).toEqual([652, 332]);
  await rect(root.locator('.mc-crafting-screen__book'), frame, [0, 0, 146, 166]);
  await rect(root.locator('.mc-crafting-screen__fold'), frame, [146, 0, 4, 166]);
  await rect(root.locator('.mc-crafting-screen__right'), frame, [150, 0, 176, 166]);
  const right = await box(root.locator('.mc-crafting-screen__right'));
  const cells = await root.locator('.mc-crafting__grid .mc-slot').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
  expect(cells).toHaveLength(9);
  cells.forEach(([x, y, w, h], index) => { expect([x! - right.x, y! - right.y, w, h]).toEqual([(29 + index % 3 * 18) * 2, (16 + Math.floor(index / 3) * 18) * 2, 36, 36]); });
  await rect(root.locator('.mc-crafting__arrow'), right, [90, 35.5, 22, 15]);
  await rect(root.locator('.mc-crafting__result'), right, [123, 30, 26, 26]);
  for (const [name, count, top] of [['Inventory', 27, 86], ['Hotbar', 9, 143]] as const) {
    const slots = await root.getByRole('grid', { name, exact: true }).locator('.mc-slot').evaluateAll(nodes => nodes.map(node => {
      const r = node.getBoundingClientRect(); return [r.x, r.y, r.width, r.height];
    }));
    expect(slots).toHaveLength(count);
    slots.forEach(([x, y, w, h], index) => expect([x! - right.x, y! - right.y, w, h]).toEqual([
      (7 + index % 9 * 18) * 2, (top + Math.floor(index / 9) * 18) * 2, 36, 36,
    ]));
  }
  const toolbar = root.getByRole('toolbar'), tb = await box(toolbar); await rect(toolbar, frame, [227, -20, 99, 20]);
  await rect(toolbar.locator('[data-layout="recipe-book"]'), tb, [8, 1, 25, 18]);
  await rect(toolbar.locator('[data-layout="survival"]'), tb, [34, 1, 25, 18]);
  await rect(toolbar.locator('[data-toolbar-control="help"]'), tb, [63, 2.5, 15, 15]);
  await rect(toolbar.locator('[data-toolbar-control="close"]'), tb, [75, -.5, 21, 21]);
  await mkdir(output, { recursive: true }); await root.locator('..').screenshot({ path: fileURLToPath(new URL('wide-complete-unmasked.png', output)), scale: 'css' });
});

test('compact survival retains fixed screen width,75-pixel padding and toolbar at stack end251', async ({ page }) => {
  await open(page); const root = screen(page, 'crafting-compact'), frame = await box(root);
  expect([frame.width, frame.height]).toEqual([652, 332]); await expect(root).toHaveAttribute('data-layout', 'survival');
  await expect(root.locator('.mc-recipe-book')).toHaveCount(0); await expect(root.locator('.mc-crafting-screen__fold')).toHaveCount(0);
  await rect(root.locator('.mc-crafting-screen__right'), frame, [75, 0, 176, 166]); await rect(root.getByRole('toolbar'), frame, [152, -20, 99, 20]);
});

test('nonsearch header, filter and seven-column scrolling use original fixed extents', async ({ page }) => {
  await open(page); const book = screen(page).locator('.mc-recipe-book'), frame = await box(book), items = book.locator('.mc-recipe-book__items');
  await rect(book.locator('.mc-recipe-book__header'), frame, [6, 8, 135, 10]);
  await rect(book.locator('.mc-recipe-book__title'), frame, [9, 8, 100, 10]);
  await rect(book.getByRole('button', { name: 'Craftable recipes only', exact: true }), frame, [112, 3.5, 29, 17]);
  await rect(items, frame, [6, 21, 134, 139]); await expect(items.getByRole('grid')).toHaveAttribute('aria-colcount', '7');
  await expect(items.locator('.mc-scrollbar')).toBeVisible();
  // The source allocates2g padding plus a4g track. Hit region and painted track are different controls.
  await rect(items.locator('.mc-scrollbar'), frame, [134, 21, 6, 139]);
  await rect(items.locator('.mc-scrollbar__track'), frame, [136, 21, 4, 139]);
  const first = items.locator('[data-recipe-id="recipe-0"]'); await rect(first, frame, [7, 21, 18, 18]);
  const shadow = await items.evaluate(node => ['::before', '::after'].map(pseudo => { const style = getComputedStyle(node, pseudo); return [style.top, style.height, style.right, style.opacity]; }));
  expect(shadow).toEqual([['0px', '4px', '12px', '0.5'], ['-2px', '2px', '12px', '1']]);
});

test('search row stays16 high while its filter is17 and uses the source104-wide input', async ({ page }) => {
  await open(page); const book = screen(page).locator('.mc-recipe-book'); await book.getByRole('tab', { name: 'Search', exact: true }).click(); const frame = await box(book);
  await rect(book.locator('.mc-recipe-book__title'), frame, [9, 8, 129, 10]); await expect(book.locator('.mc-recipe-book__header-filter')).toHaveCount(0);
  await rect(book.locator('.mc-recipe-book__search'), frame, [6, 19, 135, 16]);
  await rect(book.getByRole('searchbox'), frame, [6, 19, 104, 16]);
  await rect(book.getByRole('button', { name: 'Craftable recipes only', exact: true }), frame, [112, 18.5, 29, 17]);
  await rect(book.locator('.mc-recipe-book__items'), frame, [6, 37, 134, 123]);
});

test('without scrollbar seven cells center at10 rather than7 logical pixels', async ({ page }) => {
  await open(page); const book = sample(page, 'recipe-no-scroll').locator('.mc-recipe-book'), frame = await box(book), items = book.locator('.mc-recipe-book__items');
  await expect(items.getByRole('grid')).toHaveAttribute('aria-colcount', '7'); await expect(items.locator('.mc-scrollbar')).toBeHidden();
  await rect(items.locator('.mc-scroll-area__viewport'), frame, [6, 21, 134, 139]); await rect(items.locator('[data-recipe-id="recipe-0"]'), frame, [10, 21, 18, 18]);
  expect(await items.evaluate(node => getComputedStyle(node, '::before').right)).toBe('0px');
});

test('creative reuse removes filter and gives the source314-wide search input', async ({ page }) => {
  await open(page); const book = sample(page, 'recipe-creative-search').locator('.mc-recipe-book'), frame = await box(book);
  expect(frame.width).toBe(652); await expect(book.locator('.mc-recipe-filter-toggle')).toHaveCount(0);
  await rect(book.locator('.mc-recipe-book__title'), frame, [9, 8, 309, 10]); await rect(book.getByRole('searchbox'), frame, [6, 19, 314, 16]);
});

test('query, category and filter report host intent without inventing recipe filtering or group flattening', async ({ page }) => {
  await open(page); const root = screen(page), book = root.locator('.mc-recipe-book'), collection = page.getByRole('status', { name: 'Host recipe collection', exact: true }); const before = await collection.innerText();
  await book.getByRole('tab', { name: 'Search', exact: true }).click(); await book.getByRole('searchbox').fill('no recipe should match');
  await book.getByRole('button', { name: 'Craftable recipes only', exact: true }).click();
  await expect(book.locator('[data-recipe-id]')).toHaveCount(70); await expect(collection).toHaveText(before);
  await expect(eventLog(page)).toContainText('category:search'); await expect(eventLog(page)).toContainText('query:no recipe should match'); await expect(eventLog(page)).toContainText('filter:true');
  await page.getByRole('button', { name: 'Host replaces recipe collection', exact: true }).click(); await expect(book.locator('[data-recipe-id]')).toHaveCount(2);
  await expect(page.getByRole('status', { name: 'Frozen host record', exact: true })).toHaveText('true:64:0:collapse');
});

test('readonly host bindings report intents while retaining their visible category and filter value', async ({ page }) => {
  await open(page); const book = sample(page, 'recipe-no-scroll').locator('.mc-recipe-book');
  await book.getByRole('tab', { name: 'Search', exact: true }).click(); await expect(book.getByRole('tab', { name: 'Equipment', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(book.getByRole('searchbox')).toHaveCount(0); const filter = book.getByRole('button', { name: 'Craftable recipes only', exact: true }); await filter.click(); await expect(filter).toHaveAttribute('aria-pressed', 'false');
  await expect(eventLog(page)).toContainText('readonly-category:search'); await expect(eventLog(page)).toContainText('readonly-filter:true'); await expect(book.locator('[data-recipe-id]')).toHaveCount(14);
});

test('unavailable red recipe accepts primary, secondary and middle-button intentions without mutating source records', async ({ page }) => {
  await open(page); const root = screen(page), entry = root.locator('[data-recipe-id="recipe-2"]'); await expect(entry).toBeEnabled();
  await entry.click(); await entry.click({ button: 'right' }); await entry.click({ button: 'middle' });
  await expect(eventLog(page)).toHaveText('recipe:recipe-2:primary|recipe:recipe-2:secondary|recipe:recipe-2:tertiary');
  await expect(root.locator('[data-recipe-id="recipe-0"]')).toHaveAttribute('aria-pressed', 'true'); await expect(entry).toHaveAttribute('aria-pressed', 'false');
  await expect(root.locator('.mc-crafting__grid .mc-slot:not([data-empty])')).toHaveCount(0);
  await expect(page.getByRole('status', { name: 'Frozen host record', exact: true })).toHaveText('true:64:0:collapse');
});

test('disabled entry and disabled item reject real secondary and middle-button notifications', async ({ page }) => {
  await open(page);
  for (const entry of [screen(page).locator('[data-recipe-id="recipe-1"]'), page.locator('[data-entry-sample="item-disabled"] button')]) {
    await expect(entry).toBeDisabled(); await entry.scrollIntoViewIfNeeded(); const r = await box(entry);
    await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2, { button: 'right' });
    await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2, { button: 'middle' });
  }
  await expect(eventLog(page)).toHaveText('');
});

test('recipe roving skips disabled entries and keeps focused versus selected state distinct', async ({ page }) => {
  await open(page); const book = screen(page).locator('.mc-recipe-book'), entry = (id: number) => book.locator(`[data-recipe-id="recipe-${id}"]`);
  await entry(0).focus(); await entry(0).press('ArrowRight'); await expect(entry(2)).toBeFocused(); await expect(entry(0)).toHaveAttribute('aria-pressed', 'true');
  await entry(2).press('ArrowDown'); await expect(entry(9)).toBeFocused(); await entry(9).press('Home'); await expect(entry(7)).toBeFocused();
  await entry(7).press('ArrowRight'); await expect(entry(9)).toBeFocused(); await entry(9).press('End'); await expect(entry(13)).toBeFocused();
  await entry(13).press('Control+End'); await expect(entry(69)).toBeFocused(); await expect(entry(69)).toHaveAttribute('tabindex', '0');
  await entry(69).press('Control+Home'); await expect(entry(0)).toBeFocused();
});

test('Home and End search inward past disabled row boundaries including Control shortcuts', async ({ page }) => {
  await open(page); const book = sample(page, 'recipe-boundary-disabled'), entry = (id: number) => book.locator(`[data-recipe-id="recipe-${id}"]`);
  await entry(3).focus(); await entry(3).press('Home'); await expect(entry(2)).toBeFocused(); await entry(2).press('End'); await expect(entry(5)).toBeFocused();
  await entry(10).focus(); await entry(10).press('Home'); await expect(entry(9)).toBeFocused(); await entry(9).press('End'); await expect(entry(12)).toBeFocused();
  await entry(12).press('Control+Home'); await expect(entry(2)).toBeFocused(); await entry(2).press('Control+End'); await expect(entry(12)).toBeFocused();
});

test('search-tab focus bridge preserves input caret behavior and returns from recipe mode', async ({ page }) => {
  await open(page); const root = screen(page), tab = root.getByRole('tab', { name: 'Search', exact: true }), mode = root.getByRole('button', { name: 'Recipe book layout', exact: true });
  await tab.focus(); await tab.press('ArrowRight'); await expect(mode).toBeFocused(); await mode.press('ArrowLeft'); await expect(tab).toBeFocused();
  await tab.click(); const input = root.getByRole('searchbox'); await input.fill('abcd'); await input.evaluate(node => { if (!(node instanceof HTMLInputElement)) throw new Error("Recipe search is not an input"); node.setSelectionRange(1, 1); }); await input.press('ArrowRight'); await expect(input).toBeFocused(); expect(await input.evaluate(node => node instanceof HTMLInputElement ? node.selectionStart : null)).toBe(2);
});

test('two-mode toolbar roves through help and close and recovers focus when close is removed', async ({ page }) => {
  await open(page); const toolbar = sample(page, 'two-mode-toolbar').getByRole('toolbar'), recipe = toolbar.locator('[data-layout="recipe-book"]'), survival = toolbar.locator('[data-layout="survival"]'), help = toolbar.locator('[data-toolbar-control="help"]'), close = toolbar.locator('[data-toolbar-control="close"]');
  await expect(toolbar.locator('[data-layout]')).toHaveCount(2); await recipe.focus(); await recipe.press('ArrowRight'); await expect(survival).toBeFocused(); await survival.press('Enter');
  await survival.press('ArrowRight'); await expect(help).toBeFocused(); await help.press('End'); await expect(close).toBeFocused();
  await close.press('ArrowRight'); await expect(recipe).toBeFocused(); await recipe.press('End'); await expect(close).toBeFocused();
  await page.getByRole('button', { name: 'Hide close action', exact: true }).dispatchEvent('click');
  await expect(close).toHaveCount(0); await expect(survival).toBeFocused(); expect((await box(toolbar)).width).toBe(168);
});

test('controlled layout only changes after the host applies it and anchors the shortened toolbar correctly', async ({ page }) => {
  await open(page); const root = screen(page, 'crafting-controlled'); await root.locator('.mc-inventory-toolbar [data-layout="survival"]').click();
  await expect(eventLog(page)).toHaveText('controlled-layout:survival'); await expect(root).toHaveAttribute('data-layout', 'recipe-book');
  await page.getByRole('button', { name: 'Host applies compact layout', exact: true }).click(); await expect(root).toHaveAttribute('data-layout', 'survival');
  await expect(root.locator('.mc-recipe-book')).toHaveCount(0); await rect(root.getByRole('toolbar'), await box(root), [152, -20, 99, 20]);
  await page.getByRole('button', { name: 'Hide close action', exact: true }).click(); await rect(root.getByRole('toolbar'), await box(root), [167, -20, 84, 20]);
});

test('original ItemSlot tooltip preserves recipe lore and consumes Escape before the screen closes', async ({ page }) => {
  await open(page); const root = screen(page), entry = root.locator('[data-recipe-id="recipe-0"]'); await entry.focus();
  const tooltip = page.getByRole('tooltip'); await expect(tooltip).toContainText('Recipe 0'); await expect(tooltip).toContainText('Original diamond texture'); await expect(tooltip).toContainText('Host-owned recipe record');
  await expect(entry).toHaveAttribute('aria-describedby', await tooltip.getAttribute('id') ?? '');
  await entry.press('Escape'); await expect(tooltip).toHaveCount(0); await expect(eventLog(page)).toHaveText('');
  await entry.press('Escape'); await expect(eventLog(page)).toHaveText('wide-close');
});

test('recipe craftable count overrides stack64 and keeps zero-count original art without a durability meter', async ({ page }) => {
  await open(page); const root = screen(page), zero = root.locator('[data-recipe-id="recipe-0"]'), counted = root.locator('[data-recipe-id="recipe-3"]');
  await expect(zero.locator('.mc-recipe-book-entry__art img')).toBeVisible(); await expect(zero).not.toHaveAttribute('data-empty', 'true');
  await expect(zero.locator('.mc-slot__count')).toHaveCount(0); await expect(counted.locator('.mc-slot__count')).toHaveText('7');
  await expect(zero).toHaveAccessibleName('Recipe 0'); await expect(counted).toHaveAccessibleName('Recipe 3, 7');
  await expect(counted.locator('.mc-slot__durability')).toHaveCount(0);
  const layers = await counted.evaluate(node => [Number(getComputedStyle(node.querySelector('.mc-slot__count')!).zIndex), Number(getComputedStyle(node.querySelector('.mc-recipe-book-entry__modifier')!).zIndex), Number(getComputedStyle(node.querySelector('.mc-recipe-book-entry__art')!).zIndex)]);
  expect(layers[0]).toBeGreaterThan(layers[1]!); expect(layers[1]).toBeGreaterThan(layers[2]!);
});

// These are complete52x52 source-part comparisons, including selected overhang
// and transparent artwork. The actual composition is cloned, not masked.
async function compareEntry(page: Page, name: string, skin: string, modifier?: 'collapse' | 'expand', selected = false) {
  const target = page.locator(`[data-entry-sample="${name}"]`); await target.locator('img').evaluateAll(nodes => Promise.all(nodes.map(node => (node as HTMLImageElement).decode())));
  await target.evaluate(node => { const clone = node.cloneNode(true) as HTMLElement; clone.id = 'crafting-source-actual'; Object.assign(clone.style, { position: 'fixed', left: '16px', top: '16px', zIndex: '2147483646' }); document.body.append(clone); });
  await mkdir(output, { recursive: true }); const actual = PNG.sync.read(await page.locator('#crafting-source-actual').screenshot({ path: fileURLToPath(new URL(`${name}-actual.png`, output)) })); await page.locator('#crafting-source-actual').evaluate(node => node.remove());
  const images: Record<string, string> = { skin: `data:image/png;base64,${(await raw(skin)).toString('base64')}` };
  if (modifier) images.modifier = `data:image/png;base64,${(await raw(`recipe_book_${modifier}_icon`)).toString('base64')}`;
  if (modifier || selected) images.item = `data:image/png;base64,${(await readFile(new URL('../demo/assets/minecraft/diamond.png', import.meta.url))).toString('base64')}`;
  if (selected) images.selected = `data:image/png;base64,${(await raw('pocket_ui_highlight_selected_slot')).toString('base64')}`;
  await page.evaluate(images => {
    document.getElementById('crafting-source-reference')?.remove(); const root = document.createElement('div'); root.id = 'crafting-source-reference'; Object.assign(root.style, { position: 'fixed', left: '16px', top: '16px', width: '52px', height: '52px', background: '#28292a', zIndex: '2147483646', imageRendering: 'pixelated' }); document.body.append(root);
    const part = (style: Partial<CSSStyleDeclaration>) => { const child = document.createElement('div'); Object.assign(child.style, { position: 'absolute', ...style }); root.append(child); };
    part({ left: '8px', top: '8px', width: '36px', height: '36px', boxSizing: 'border-box', border: '2px solid transparent', borderImage: `url("${images.skin}") 1 fill / 2px stretch` });
    if (images.item) part({ left: '10px', top: '10px', width: '32px', height: '32px', background: `url("${images.item}") center / 32px 32px no-repeat` });
    if (images.modifier) part({ left: '28px', top: '28px', width: '14px', height: '14px', background: `url("${images.modifier}") center / 14px 14px no-repeat` });
    if (images.selected) part({ left: '3px', top: '3px', width: '46px', height: '46px', boxSizing: 'border-box', border: '10px solid transparent', borderImage: `url("${images.selected}") 5 fill / 10px stretch` });
  }, images);
  await page.evaluate(images => Promise.all(Object.values(images).map(async src => { const image = new Image(); image.src = src; await image.decode(); })), images);
  const expected = PNG.sync.read(await page.locator('#crafting-source-reference').screenshot({ path: fileURLToPath(new URL(`${name}-expected.png`, output)) }));
  expect([actual.width, actual.height]).toEqual([52, 52]); let differences = 0;
  for (let index = 0; index < actual.data.length; index += 4) if ([0, 1, 2, 3].some(channel => actual.data[index + channel] !== expected.data[index + channel])) differences++;
  expect(differences, 'complete original-texture RGBA differences, no mask/tolerance').toBe(0);
  await page.locator('#crafting-source-reference').evaluate(node => node.remove());
}

test('all original recipe entry backgrounds include default metadata slicing without changing source pixels', async ({ page }) => {
  await open(page); await compareEntry(page, 'default', 'recipe_book_item_bg');
  for (const name of ['recipe_book_item_bg', 'recipe_book_light_button', 'recipe_book_dark_button_pressed', 'recipe_book_dark_button', 'recipe_book_touch_cell_selected', 'recipe_book_red_button']) await compareEntry(page, name, name);
});
test('both original group overlays stay above zero-count item art and retain every transparent pixel', async ({ page }) => {
  await open(page); await compareEntry(page, 'zero-collapse', 'recipe_book_red_button', 'collapse'); await compareEntry(page, 'zero-expand', 'recipe_book_red_button', 'expand');
});
test('selected recipe keeps the entire23-square source highlight beyond the18-square cell', async ({ page }) => {
  await open(page); await compareEntry(page, 'selected', 'recipe_book_item_bg', undefined, true);
});

test('mobile uses integer Classic GUI geometry and real horizontal touch pan without document overflow', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices['Pixel 7'], baseURL, reducedMotion: 'reduce' });
  try {
    const page = await context.newPage(); await open(page); const root = screen(page), wrapper = root.locator('..'); await wrapper.scrollIntoViewIfNeeded();
    const before = await box(root); expect([before.width, before.height]).toEqual([652, 332]); expect((await box(root.locator('.mc-crafting-screen__right'))).width).toBe(352);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => document.documentElement.clientWidth));
    const bounds = await box(wrapper), frame = await box(root), startX = bounds.x + bounds.width - 24, endX = bounds.x + 24, y = frame.y + 4;
    const session = await context.newCDPSession(page); await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y, id: 1 }] });
    for (let step = 1; step <= 8; step++) { await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: startX + (endX - startX) * step / 8, y, id: 1 }] }); await page.evaluate(() => new Promise(requestAnimationFrame)); }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => wrapper.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
    expect((await box(root)).width).toBe(652); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => document.documentElement.clientWidth));
    const widths = await root.locator('.mc-crafting__grid .mc-slot').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().width)); expect(widths).toEqual(Array(9).fill(36));
  } finally { await context.close(); }
});
