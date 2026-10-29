import { expect, test, devices } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

// Independent original inventory_screen/ui_common declarations and original PNGs.
// The fixed326 Survival/workbench composition is distinct from intrinsic Furnace.
const pins = [
  ['arrow', 16, 13, '7b72bbdcf787adee14c1cdd08e416846a616725f6bed0a7e5064c7b55501e7d5'],
  ['recipe_back_panel', 16, 16, 'daa6d490de8583f424e24787812c6c2921bc688a7761d9d03e93badb27ed1d77'],
  ['player_preview_border', 16, 16, 'd798a83782b6035107c0d426ecc48c481a4a103646f5e774636f1526b230b9a9'],
] as const;
const evidence = new URL(`../.cache/survival-inventory-qa/${process.env.MCBE_SURVIVAL_CAPTURE_TAG ?? 'integrated'}/`, import.meta.url);
const sourceCache = new URL('../.cache/survival-inventory-qa/source/', import.meta.url);
const url = '/demo/survival-inventory-fixture.html';
type Box = { x: number; y: number; width: number; height: number };
async function box(node: Locator): Promise<Box> { const result = await node.boundingBox(); if (!result) throw new Error('Missing Survival source bounds'); return result; }
async function rect(node: Locator, relative: Box, expected: readonly [number, number, number, number]) {
  const value = await box(node);
  for (const difference of [value.x - relative.x - expected[0] * 2, value.y - relative.y - expected[1] * 2,
    value.width - expected[2] * 2, value.height - expected[3] * 2]) expect(Math.abs(difference), 'Original logical-pixel geometry').toBeLessThanOrEqual(.025);
}
async function open(page: Page) { await page.goto(url); await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0); }
const sample = (page: Page, id: string) => page.locator(`[data-case="${id}"]`);
const full = (page: Page, id = 'survival-wide') => sample(page, id).locator('.mc-survival-inventory-screen');
const pane = (page: Page, id = 'survival-wide') => sample(page, id).locator('.mc-player-screen');
const log = (page: Page) => page.getByRole('status', { name: 'Survival fixture events', exact: true });
async function original(name: string) {
  const pin = pins.find(record => record[0] === name); if (!pin) throw new Error(`Unpinned original ${name}`);
  const path = new URL(`${name}.png`, sourceCache); let data: Buffer;
  try { data = await readFile(path); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const references = new URL(`../.cache/references/${name}.png`, import.meta.url);
    if (existsSync(references)) data = await readFile(references);
    else {
      const response = await fetch(`https://raw.githubusercontent.com/Mojang/bedrock-samples/15701fa9c13923f12662984c32c124327e40e3d3/resource_pack/textures/ui/${name}.png`);
      if (!response.ok) throw new Error(`Original ${name}: HTTP${response.status}`); data = Buffer.from(await response.arrayBuffer());
    }
    await mkdir(sourceCache, { recursive: true }); await writeFile(path, data);
  }
  expect(createHash('sha256').update(data).digest('hex'), name).toBe(pin[3]); return data;
}
function extract(buffer: Buffer, name: string) {
  const count = buffer.readUInt32LE(8), base = 16 + count * 256;
  for (let index = 0; index < count; index++) {
    const row = 16 + index * 256;
    if (buffer.toString('utf8', row + 1, row + 1 + buffer[row]!) === name) return buffer.subarray(base + buffer.readUInt32LE(row + 248), base + buffer.readUInt32LE(row + 248) + buffer.readUInt32LE(row + 252));
  }
  throw new Error(`Missing native source ${name}`);
}
function child(node: any, name: string) { const value = node.controls.find((entry: Record<string, unknown>) => name in entry)?.[name]; if (!value) throw new Error(`Missing original child ${name}`); return value; }
function equal(actual: Buffer, expected: Buffer) {
  const a = PNG.sync.read(actual), e = PNG.sync.read(expected); expect([a.width, a.height]).toEqual([e.width, e.height]); let changed = 0;
  for (let i = 0; i < a.data.length; i += 4) if ([0, 1, 2, 3].some(channel => a.data[i + channel] !== e.data[i + channel])) changed++;
  expect(changed, 'Full unmasked source-part RGBA differences, zero tolerance').toBe(0);
}

test('original arrow, fold and preview retain pinned dimensions and byte hashes', async () => {
  for (const [name, width, height] of pins) { const data = await original(name); expect([data.readUInt32BE(16), data.readUInt32BE(20)]).toEqual([width, height]); }
});

test('optional native source shares Survival/workbench outer tree and preserves required-table renderer binding', async () => {
  const root = join(process.env.MCBE_INSTALL_ROOT ?? 'C:/XboxGames/Minecraft for Windows/Content', 'data/resource_packs/vanilla/__brarchive');
  test.skip(!existsSync(join(root, 'ui.brarchive')), 'Matching user-owned native resources are optional.');
  const archive = await readFile(join(root, 'ui.brarchive')), inventory = JSON.parse(extract(archive, 'inventory_screen.json').toString()), common = JSON.parse(extract(archive, 'ui_common.json').toString());
  expect(inventory['inventory_screen@crafting.inventory_screen_base']).toMatchObject({ '$screen_content': 'crafting.recipe_inventory_screen_content', '$top_half_variant': 'crafting.survival_panel_top_half' });
  expect(inventory['crafting_screen@crafting.inventory_screen_base']['$screen_content']).toBe('crafting.recipe_inventory_screen_content');
  expect(child(inventory.recipe_inventory_screen_content, 'content_stack_panel').size).toEqual([326, 166]);
  expect(common['center_fold@common.root_panel'].size).toEqual([4, 166]);
  expect(child(common['center_fold@common.root_panel'], 'center_bg')).toMatchObject({ texture: 'textures/ui/recipe_back_panel', size: ['100% + 8px', '100% - 6px'] });
  expect(inventory.crafting_panel_2x2.size).toEqual([88, 83]);
  expect(child(inventory.crafting_panel_2x2, 'crafting_table@crafting.item_renderer')).toMatchObject({ offset: [10, -5], property_bag: { '#item_id_aux': 3801088 } });
  expect(inventory.item_renderer.size).toEqual([16, 16]);
  const output = child(inventory.output_grid_2x2, 'work_bench_output@crafting.inventory_container_item'); expect(output['$focus_override_up']).toBe('help_button');
  const textures = await readFile(join(root, 'textures/ui.brarchive'));
  for (const [name] of pins) expect(extract(textures, `${name}.png`).equals(await original(name)), name).toBe(true);
  expect(JSON.parse(extract(textures, 'recipe_back_panel.json').toString())).toEqual({ nineslice_size: 4, base_size: [16, 16] });
  expect(JSON.parse(extract(textures, 'player_preview_border.json').toString())).toEqual({ nineslice_size: 1, base_size: [16, 16] });
});

for (const [id, layout, rightX, toolbarX] of [['survival-wide', 'recipe-book', 150, 227], ['survival-compact', 'survival', 75, 152]] as const) {
  test(`${id} keeps fixed326 canvas and source toolbar rather than shrinking like a furnace`, async ({ page }) => {
    await open(page); const root = full(page, id), frame = await box(root); expect([frame.width, frame.height]).toEqual([652, 332]); await expect(root).toHaveAttribute('data-layout', layout);
    await rect(root.locator('.mc-inventory-screen-frame__right'), frame, [rightX, 0, 176, 166]); await rect(root.getByRole('toolbar'), frame, [toolbarX, -20, 99, 20]);
    await expect(root.locator('.mc-dialog__close')).toHaveCount(0); await expect(root.getByRole('button', { name: `Close ${id === 'survival-wide' ? 'survival wide' : 'survival compact'}`, exact: true })).toHaveCount(1);
    if (layout === 'recipe-book') {
      await rect(root.locator('.mc-inventory-screen-frame__book'), frame, [0, 0, 146, 166]); await rect(root.locator('.mc-inventory-screen-frame__fold'), frame, [146, 0, 4, 166]);
    } else { await expect(root.locator('.mc-recipe-book')).toHaveCount(0); await expect(root.locator('.mc-inventory-screen-frame__fold')).toHaveCount(0); }
    await mkdir(evidence, { recursive: true }); await root.locator('..').screenshot({ path: fileURLToPath(new URL(`${id}-complete-unmasked.png`, evidence)) });
  });
}

test('Survival armor, offhand, preview,2x2 and all36 lower slots retain original right-pane bounds', async ({ page }) => {
  await open(page); const right = pane(page), frame = await box(right); expect([frame.width, frame.height]).toEqual([352, 332]);
  await rect(right.locator('.mc-player-screen__armor'), frame, [7, 7, 18, 72]); await rect(right.locator('.mc-player-screen__offhand'), frame, [79, 61, 18, 18]);
  await rect(right.locator('.mc-player-screen__preview'), frame, [25, 7, 54, 72]); await rect(right.locator('.mc-player-screen__preview-content'), frame, [26, 8, 52, 70]);
  await expect(right.getByRole('img', { name: 'Host player portrait', exact: true })).toBeVisible(); await expect(right.locator('[data-host-player-preview]')).toBeVisible();
  await rect(right.locator('.mc-player-screen__crafting-label'), frame, [81, 7, 66, 10]); await rect(right.locator('.mc-player-screen__arrow'), frame, [134, 29, 16, 13]); await rect(right.locator('.mc-player-screen__result'), frame, [152, 26, 18, 18]);
  for (const [name, count, columns, x, y] of [['Crafting input', 4, 2, 96, 18], ['Inventory', 27, 9, 7, 86], ['Hotbar', 9, 9, 7, 143]] as const) {
    const boxes = await right.getByRole('grid', { name, exact: true }).locator('.mc-slot').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
    expect(boxes).toHaveLength(count); boxes.forEach(([left, top, width, height], index) => expect([left! - frame.x, top! - frame.y, width, height]).toEqual([(x + index % columns * 18) * 2, (y + Math.floor(index / columns) * 18) * 2, 36, 36]));
  }
  const label = await box(right.locator('.mc-player-inventory__label')); expect(label.width <= 1 && label.height <= 1, 'No visual Inventory label row is added').toBe(true);
});

test('required-table branch keeps16-square host renderer at source134,28.5 without changing input or result data', async ({ page }) => {
  await open(page); const right = pane(page, 'survival-required-host'), frame = await box(right), renderer = right.getByRole('img', { name: 'Crafting table required', exact: true });
  await rect(renderer, frame, [134, 28.5, 16, 16]); await expect(renderer.locator('[data-host-crafting-preview]')).toBeVisible(); await expect(renderer).not.toHaveAttribute('data-empty-renderer', 'true');
  await expect(right.locator('.mc-player-screen__arrow')).toHaveCount(0); await expect(right.getByRole('grid', { name: 'Crafting input', exact: true }).locator('.mc-slot')).toHaveCount(4);
  const result = right.locator('.mc-player-screen__result');
  await expect(result).not.toHaveAttribute('aria-disabled', 'true'); await expect(result).toBeEnabled();
  await result.click(); await expect(log(page)).toHaveText('result:primary');
  const source = await renderer.locator('img').getAttribute('src'); expect(source).toMatch(/^data:image\/png;base64,/);
  expect(createHash('sha256').update(Buffer.from(source!.split(',')[1]!, 'base64')).digest('hex')).toBe('a6689bb645bdb2e6c21776b1d09547fd370ab8b26ff3b3d13740bb870f7eed3b');
});

test('required-table missing-preview branch exposes an empty named region and invents no item artwork', async ({ page }) => {
  await open(page); const right = pane(page, 'leaf-required-missing'), renderer = right.getByRole('img', { name: 'Crafting table required', exact: true });
  await rect(renderer, await box(right), [134, 28.5, 16, 16]); await expect(renderer).toHaveAttribute('data-empty-renderer', 'true'); expect(await renderer.evaluate(node => node.childNodes.length)).toBe(0);
  await expect(renderer.locator('img,canvas,svg')).toHaveCount(0); expect(await renderer.evaluate(node => getComputedStyle(node).backgroundImage)).toBe('none');
  await expect(right.locator('.mc-player-screen__arrow')).toHaveCount(0); await expect(right.locator('.mc-player-screen__crafting .mc-slot:not([data-empty])')).toHaveCount(2);
});

test('populated ordinary pane does not infer required-table state and ignores an unrequested preview prop', async ({ page }) => {
  await open(page); await expect(pane(page).locator('.mc-player-screen__arrow')).toBeVisible(); await expect(pane(page).locator('.mc-player-screen__crafting-table')).toHaveCount(0);
  const explicit = pane(page, 'leaf-explicit-false'); await expect(explicit.locator('.mc-player-screen__arrow')).toBeVisible(); await expect(explicit.locator('[data-unused-crafting-preview]')).toHaveCount(0);
  const emptyPreview = pane(page, 'leaf-default').locator('.mc-player-screen__preview'); await expect(emptyPreview).toHaveAttribute('aria-hidden', 'true'); await expect(emptyPreview.locator('img,canvas,svg')).toHaveCount(0);
});

async function canonicalCapture(page: Page, target: Locator, name: string) {
  await target.evaluate(node => {
    const clone = node.cloneNode(true) as HTMLElement; const style = getComputedStyle(node); clone.id = 'survival-canonical-part';
    Object.assign(clone.style, { position: 'fixed', left: '16px', top: '16px', margin: '0', zIndex: '2147483646', font: style.font }); document.body.append(clone);
  });
  await mkdir(evidence, { recursive: true }); const pixels = await page.locator('#survival-canonical-part').screenshot({ path: fileURLToPath(new URL(`${name}.png`, evidence)) }); await page.locator('#survival-canonical-part').evaluate(node => node.remove()); return pixels;
}

test('default and explicit-false panes match completely without masking the original arrow or empty preview', async ({ page }) => {
  await open(page); equal(await canonicalCapture(page, pane(page, 'leaf-default'), 'default-pane'), await canonicalCapture(page, pane(page, 'leaf-explicit-false'), 'explicit-false-pane'));
});

test('armor, crafting, result and lower-grid callbacks preserve source indices and leave host collections unchanged', async ({ page }) => {
  await open(page); const root = full(page), right = pane(page); const helmet = right.locator('.mc-armor-slot[data-kind="helmet"]');
  await helmet.click(); await helmet.click({ button: 'right' }); await right.locator('.mc-player-screen__offhand').click();
  const inputs = right.getByRole('grid', { name: 'Crafting input', exact: true }).locator('.mc-slot'); await inputs.nth(2).click(); await inputs.nth(2).click({ button: 'right' });
  const result = right.locator('.mc-player-screen__result'); await result.click(); await result.click({ button: 'right' });
  await right.getByRole('grid', { name: 'Inventory', exact: true }).locator('.mc-slot').first().click(); await right.getByRole('grid', { name: 'Hotbar', exact: true }).locator('.mc-slot').nth(1).click({ button: 'right' });
  await expect(log(page)).toHaveText('armor:helmet:primary|armor:helmet:secondary|armor:offhand:primary|input:2:primary|input:2:secondary|result:primary|result:secondary|inventory:0:primary|inventory:28:secondary');
  await expect(page.getByRole('status', { name: 'Survival immutable data', exact: true })).toHaveText('true:2:14'); await expect(root.locator('[data-recipe-id]')).toHaveCount(14);
});

test('explicit source focus edges cross armor, offhand, crafting inputs, result and full-frame help', async ({ page }) => {
  await open(page); const root = full(page), right = pane(page), armor = (kind: string) => right.locator(`.mc-armor-slot[data-kind="${kind}"]`), inputs = right.locator('.mc-player-screen__crafting .mc-slot'), result = right.locator('.mc-player-screen__result');
  await armor('helmet').focus(); await armor('helmet').press('ArrowRight'); await expect(inputs.nth(0)).toBeFocused(); await inputs.nth(0).press('ArrowLeft'); await expect(armor('helmet')).toBeFocused();
  await armor('leggings').focus(); await armor('leggings').press('ArrowRight'); await expect(inputs.nth(2)).toBeFocused(); await inputs.nth(2).press('ArrowLeft'); await expect(armor('leggings')).toBeFocused();
  await armor('boots').focus(); await armor('boots').press('ArrowRight'); await expect(armor('offhand')).toBeFocused(); await armor('offhand').press('ArrowLeft'); await expect(armor('boots')).toBeFocused();
  await inputs.nth(1).focus(); await inputs.nth(1).press('ArrowRight'); await expect(result).toBeFocused(); await result.press('ArrowLeft'); await expect(inputs.nth(1)).toBeFocused();
  await result.focus(); await result.press('ArrowUp'); const help = root.getByRole('button', { name: 'Survival help', exact: true }); await expect(help).toBeFocused(); await expect(log(page)).toHaveText(''); await help.press('Enter'); await expect(log(page)).toHaveText('wide-help');
});

test('caller can cancel result-Up while compact empty results still navigate to full-frame help', async ({ page }) => {
  await open(page); await page.getByRole('button', { name: 'Prevent result Up focus', exact: true }).click(); const result = pane(page).locator('.mc-player-screen__result'); await result.focus(); await result.press('ArrowUp'); await expect(result).toBeFocused();
  const compact = full(page, 'survival-compact'), empty = compact.locator('.mc-player-screen__result'); await expect(empty).toHaveAttribute('aria-disabled', 'true'); await empty.focus(); await empty.press('Enter'); await expect(log(page)).toHaveText(''); await empty.press('ArrowUp'); await expect(compact.locator('.mc-inventory-toolbar__help')).toBeFocused();
});

test('controlled layout reports intent then waits for host state without shrinking its326 canvas', async ({ page }) => {
  await open(page); const root = full(page, 'survival-controlled'); await root.locator('.mc-inventory-toolbar [data-layout="survival"]').click(); await expect(log(page)).toHaveText('controlled-layout:survival'); await expect(root).toHaveAttribute('data-layout', 'recipe-book');
  await page.getByRole('button', { name: 'Host applies survival layout', exact: true }).click(); await expect(root).toHaveAttribute('data-layout', 'survival'); expect((await box(root)).width).toBe(652); await rect(root.locator('.mc-inventory-screen-frame__right'), await box(root), [75, 0, 176, 166]);
  await page.getByRole('button', { name: 'Host applies recipe layout', exact: true }).click(); await expect(root).toHaveAttribute('data-layout', 'recipe-book'); await expect(root.locator('.mc-recipe-book')).toBeVisible();
});

test('removing focused close restores a visible mode target and changes toolbar width by15 source pixels', async ({ page }) => {
  await open(page); const root = full(page), close = root.locator('.mc-inventory-toolbar__close'); await close.focus(); await page.getByRole('button', { name: 'Hide survival close', exact: true }).dispatchEvent('click');
  await expect(close).toHaveCount(0); await expect(root.locator('.mc-inventory-toolbar [data-layout="recipe-book"]')).toBeFocused(); await rect(root.getByRole('toolbar'), await box(root), [242, -20, 84, 20]);
});

test('ItemSlot tooltip consumes first Escape before frame close and no global Escape listener is installed', async ({ page }) => {
  await open(page); const item = pane(page).getByRole('grid', { name: 'Crafting input', exact: true }).locator('.mc-slot').first(); await item.focus();
  const tooltip = page.getByRole('tooltip'); await expect(tooltip).toContainText('Diamond'); await expect(tooltip).toContainText('Original diamond texture'); await item.press('Escape'); await expect(tooltip).toHaveCount(0); await expect(log(page)).toHaveText(''); await item.press('Escape'); await expect(log(page)).toHaveText('wide-close');
  await page.getByRole('button', { name: 'Clear survival events', exact: true }).click(); await page.keyboard.press('Escape'); await expect(log(page)).toHaveText('');
});

test('public Frame reuses custom host book/right nodes, preserves host state and forwards the actual section ref', async ({ page }) => {
  await open(page); const root = sample(page, 'custom-frame').locator('.mc-inventory-screen-frame'), frame = await box(root); expect([frame.width, frame.height]).toEqual([652, 332]);
  await rect(root.locator('[data-host-book]'), frame, [0, 0, 146, 166]); await rect(root.locator('[data-host-right]'), frame, [150, 0, 176, 166]); await expect(root.locator('.mc-recipe-book,.mc-player-screen')).toHaveCount(0);
  const draft = root.getByRole('textbox', { name: 'Host retained draft', exact: true }); await draft.fill('Updated host draft'); await root.getByRole('button', { name: 'Host right action', exact: true }).click(); await root.locator('.mc-inventory-toolbar [data-layout="survival"]').click();
  await expect(root.locator('[data-host-book]')).toHaveCount(0); await expect(draft).toHaveValue('Updated host draft'); await expect(root.getByRole('status', { name: 'Host right action count', exact: true })).toHaveText('1'); await rect(root.locator('[data-host-right]'), await box(root), [75, 0, 176, 166]);
  await page.getByRole('button', { name: 'Read survival frame refs', exact: true }).click(); await expect(log(page)).toContainText('refs:SECTION:SECTION');
});

test('CraftingScreen legacy hooks remain attached to shared Frame parts after the refactor', async ({ page }) => {
  await open(page); const root = sample(page, 'legacy-crafting-hooks').locator('.mc-crafting-screen'); await expect(root).toHaveClass(/mc-inventory-screen-frame/);
  for (const part of ['book', 'fold', 'right', 'toolbar']) { await expect(root.locator(`.mc-crafting-screen__${part}.mc-inventory-screen-frame__${part}`)).toHaveCount(1); }
  await rect(root.locator('.mc-crafting-screen__right'), await box(root), [150, 0, 176, 166]); expect((await box(root)).width).toBe(652);
});

async function compareSourcePart(page: Page, target: Locator, name: string, width: number, height: number, bg: string, inset: number,
  layers: { file?: string; x: number; y: number; width: number; height: number; slice?: number; color?: string }[]) {
  const natural = await box(target);
  await target.evaluate((node, props) => {
    const holder = document.createElement('div'); holder.id = 'survival-original-actual'; Object.assign(holder.style, { position: 'fixed', left: '16px', top: '16px', width: `${props.width}px`, height: `${props.height}px`, background: props.bg, isolation: 'isolate', zIndex: '2147483646', imageRendering: getComputedStyle(node).imageRendering });
    const clone = node.cloneNode(true) as HTMLElement; Object.assign(clone.style, { position: 'absolute', left: `${props.inset}px`, top: `${props.inset}px`, margin: '0', width: `${props.natural.width}px`, height: `${props.natural.height}px` }); holder.append(clone); document.body.append(holder);
  }, { width, height, bg, inset, natural });
  await mkdir(evidence, { recursive: true }); const actual = await page.locator('#survival-original-actual').screenshot({ path: fileURLToPath(new URL(`${name}-actual.png`, evidence)) }); await page.locator('#survival-original-actual').evaluate(node => node.remove());
  const images: Record<string, string> = {}; for (const layer of layers) if (layer.file) images[layer.file] = `data:image/png;base64,${(await original(layer.file)).toString('base64')}`;
  await page.evaluate(({ width, height, bg, layers, images }) => {
    const root = document.createElement('div'); root.id = 'survival-original-reference'; Object.assign(root.style, { position: 'fixed', left: '16px', top: '16px', width: `${width}px`, height: `${height}px`, background: bg, isolation: 'isolate', zIndex: '2147483646', imageRendering: 'pixelated' }); document.body.append(root);
    for (const layer of layers) {
      const node = document.createElement('div'); Object.assign(node.style, { position: 'absolute', left: `${layer.x}px`, top: `${layer.y}px`, width: `${layer.width}px`, height: `${layer.height}px`, imageRendering: 'pixelated' });
      if (layer.color) node.style.background = layer.color;
      else if (layer.slice) Object.assign(node.style, { boxSizing: 'border-box', border: `${layer.slice * 2}px solid transparent`, borderImage: `url("${images[layer.file!]}") ${layer.slice} fill / ${layer.slice * 2}px stretch` });
      else node.style.background = `url("${images[layer.file!]}") center / 100% 100% no-repeat`;
      root.append(node);
    }
  }, { width, height, bg, layers, images });
  await page.evaluate(images => Promise.all(Object.values(images).map(async src => { const image = new Image(); image.src = src; await image.decode(); })), images);
  equal(actual, await page.locator('#survival-original-reference').screenshot({ path: fileURLToPath(new URL(`${name}-expected.png`, evidence)) })); await page.locator('#survival-original-reference').evaluate(node => node.remove());
}

test('default arrow compares the entire original16x13 image including alpha and a four-pixel halo', async ({ page }) => {
  await open(page); await compareSourcePart(page, pane(page, 'leaf-default').locator('.mc-player-screen__arrow'), 'default-arrow', 40, 34, '#c6c6c6', 4,
    [{ file: 'arrow', x: 4, y: 4, width: 32, height: 26 }]);
});
test('shared fold compares the complete original nine-slice and both overhanging sides without masking', async ({ page }) => {
  await open(page); await compareSourcePart(page, full(page).locator('.mc-inventory-screen-frame__fold'), 'shared-fold', 40, 364, '#28292a', 16,
    [{ file: 'recipe_back_panel', x: 8, y: 22, width: 24, height: 320, slice: 4 }]);
});
test('empty player preview keeps original border and full black renderer region without fabricated avatar pixels', async ({ page }) => {
  await open(page); await compareSourcePart(page, pane(page, 'leaf-default').locator('.mc-player-screen__preview'), 'preview-frame', 116, 152, '#c6c6c6', 4,
    [{ file: 'player_preview_border', x: 4, y: 4, width: 108, height: 144, slice: 1 }, { color: '#000', x: 6, y: 6, width: 104, height: 140 }]);
});

test('mobile pans fixed integer GUI through the screen scroll region without document overflow', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices['Pixel 7'], baseURL, reducedMotion: 'reduce' });
  try {
    const page = await context.newPage(); await open(page); const root = full(page), wrapper = root.locator('..'); await wrapper.scrollIntoViewIfNeeded();
    expect([(await box(root)).width, (await box(root)).height]).toEqual([652, 332]); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => document.documentElement.clientWidth));
    const bounds = await box(wrapper), frame = await box(root), startX = bounds.x + bounds.width - 24, endX = bounds.x + 24, y = frame.y + 4;
    const session = await context.newCDPSession(page); await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y, id: 1 }] });
    for (let step = 1; step <= 8; step++) { await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: startX + (endX - startX) * step / 8, y, id: 1 }] }); await page.evaluate(() => new Promise(requestAnimationFrame)); }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await expect.poll(() => wrapper.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
    expect((await box(root)).width).toBe(652); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => document.documentElement.clientWidth));
    const widths = await pane(page).locator('.mc-player-screen__crafting .mc-slot').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().width)); expect(widths).toEqual([36, 36, 36, 36]);
  } finally { await context.close(); }
});

test('standalone Survival fixture has no serious or critical accessibility violations with actual previews and count labels', async ({ page }) => {
  await open(page); const result = await new AxeBuilder({ page }).analyze(); expect(result.violations.filter(violation => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([]);
});
