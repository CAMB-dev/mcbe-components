import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { PNG } from 'pngjs';

// Independent source oracle, not copied from production CSS, generated skin
// manifests, browser baselines, or docs/workstation-geometry.json.
// Mojang/bedrock-samples release v1.26.60.5 full archive:
// https://github.com/Mojang/bedrock-samples/releases/download/v1.26.60.5/bedrock-samples-v1.26.60.5-full.zip
// ZIP SHA256 d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf;
// resource_pack/ui/{ui_common,grindstone_screen,enchanting_screen,_global_variables}.json.
// The matching local Bedrock 1.26.6005.0 definitions were also inspected.
const root = { width: 176, height: 166 };
const slot = { width: 18, height: 18, art: 16 };
const topHalf = { x: 4, y: 6, width: root.width - 8, height: root.height * .5 - 8 };
const grinder = { width: 90, height: 56 };
const grinderOrigin = { x: topHalf.x + (topHalf.width - grinder.width) / 2, y: topHalf.y + (topHalf.height - grinder.height) / 2 + 4 };
const middle = { width: 18, height: 41 };
const enchantTop = { y: 7, width: root.width, height: root.height * .5 - 12 };
const enchantOptions = { width: enchantTop.width * .65 - 8, height: enchantTop.height * .8 + 4 };
const enchantOrigin = { x: root.width - 8 - enchantOptions.width, y: enchantTop.y + (enchantTop.height - enchantOptions.height) / 2 + 2 };
const logicalRowHeight = enchantOptions.height * .33333333;

type Box = { x: number; y: number; width: number; height: number };
async function box(locator: Locator): Promise<Box> {
  const value = await locator.boundingBox();
  if (!value) throw new Error('Missing source comparison region');
  return value;
}
async function expectRect(locator: Locator, frame: Box, expected: { x: number; y: number; width?: number; height?: number }, scale = 2, layoutBudget = .02) {
  const actual = await box(locator);
  // Chromium uses a 1/64 CSS-pixel layout grid. This is a layout arithmetic
  // check, not a claim about the native game's final rasterization or rounding.
  expect(Math.abs(actual.x - frame.x - expected.x * scale), 'source-derived x').toBeLessThanOrEqual(layoutBudget);
  expect(Math.abs(actual.y - frame.y - expected.y * scale), 'source-derived y').toBeLessThanOrEqual(layoutBudget);
  if (expected.width !== undefined) expect(Math.abs(actual.width - expected.width * scale), 'source-derived width').toBeLessThanOrEqual(layoutBudget);
  if (expected.height !== undefined) expect(Math.abs(actual.height - expected.height * scale), 'source-derived height').toBeLessThanOrEqual(layoutBudget);
}
async function open(page: Page) {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0); // Pinned no-hover state for complete frame captures.
}
async function sourceColour(node: Locator, normalized: readonly number[]) {
  const components = await node.evaluate(element => getComputedStyle(element).color.match(/[\d.]+/g)?.slice(0, 3).map(Number));
  expect(components).toHaveLength(3);
  for (let channel = 0; channel < 3; channel++) {
    // JSON specifies floats. Exact GPU float-to-UNORM quantization still needs
    // a native game capture; accept only the two adjacent byte representations.
    const value = normalized[channel]! * 255;
    expect(components![channel]!).toBeGreaterThanOrEqual(Math.floor(value));
    expect(components![channel]!).toBeLessThanOrEqual(Math.ceil(value));
  }
}

test('workstation references pin real source pixels and logical cell density', async () => {
  const samples = [
    ['cell_image.png', '296e3d0ba9640efcd2902aa9c191f544b09bdbb8f4585d39a6c030e0ae3fc023', 10, 10],
    ['arrow_large.png', 'c0b27d51e084d0018365a94905e53e8661cf0f05448145c71402ff16844fe1b6', 22, 15],
    ['enchanting_active_background.png', '26e65170e4a25ead2df3250cddc425d3037730ea449af76e5592d9c1cf848df6', 108, 19],
    ['enchanting_dark_background.png', '153512d7e98be59a3f742be4e8ee27d01c69413452197d2021ccbacd0e6b6ad0', 108, 19],
  ] as const;
  for (const [file, sha, width, height] of samples) {
    const bytes = await readFile(new URL(`../.cache/references/${file}`, import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha);
    const image = PNG.sync.read(bytes); expect([image.width, image.height]).toEqual([width, height]);
  }
  // cell_image.json uses base_size [5,5] / nineslice_size 1, while its PNG is
  // physically 10x10. Thus the source edge is 2px and GUI2 destination edge 2px.
  const metadata = new URL('../.cache/references/cell_image.json', import.meta.url);
  if (existsSync(metadata)) {
    const original = JSON.parse(await readFile(metadata, 'utf8'));
    expect(original.base_size).toEqual([5, 5]); expect(original.nineslice_size).toBe(1);
  }
});

test('grindstone whole layout follows original nested anchors', async ({ page }, testInfo) => {
  await open(page); const region = page.locator('#workstations .mc-grindstone'); const frame = await box(region);
  expect([frame.width, frame.height]).toEqual([root.width * 2, root.height * 2]);
  await expectRect(region.locator('.mc-workstation__title'), frame, { x: topHalf.x + 4, y: topHalf.y + 2 });
  const middleY = grinderOrigin.y + (grinder.height - middle.height) / 2;
  await expectRect(region.locator('.mc-grindstone__input'), frame, { x: grinderOrigin.x, y: middleY + 1, ...slot });
  await expectRect(region.locator('.mc-grindstone__additional'), frame, { x: grinderOrigin.x, y: middleY + middle.height - slot.height - 1, ...slot });
  await expectRect(region.locator('.mc-grindstone__result'), frame, { x: grinderOrigin.x + grinder.width - slot.width, y: grinderOrigin.y + (grinder.height - slot.height) / 2, ...slot });
  await expectRect(region.locator('.mc-grindstone__arrow'), frame, { x: grinderOrigin.x + (grinder.width - 22) / 2, y: grinderOrigin.y + (grinder.height - 15) / 2, width: 22, height: 15 });
  const evidence = new URL('../.cache/independent-qa/grindstone-unmasked.png', import.meta.url);
  await mkdir(new URL('../.cache/independent-qa/', import.meta.url), {recursive:true});
  await region.screenshot({path:fileURLToPath(evidence)});
  await testInfo.attach('unmasked-grindstone-browser-frame', { path:fileURLToPath(evidence), contentType: 'image/png' });
});

test('both workstations align every inventory and hotbar cell to the source grid', async ({ page }) => {
  await open(page);
  for (const kind of ['mc-grindstone', 'mc-enchanting']) {
    const region = page.locator(`#workstations .${kind}`), frame = await box(region);
    await expectRect(region.locator('.mc-player-inventory__label'), frame, { x: 7, y: root.height - 93 + 3 });
    const inventory = region.getByRole('grid', { name: 'Inventory', exact: true });
    const hotbar = region.getByRole('grid', { name: 'Hotbar', exact: true });
    await expect(inventory.getByRole('gridcell')).toHaveCount(27); await expect(hotbar.getByRole('gridcell')).toHaveCount(9);
    for (let index = 0; index < 27; index++) {
      // common.inventory_panel: 88x83, bottom_middle; nested grid162x54,
      // bottom_middle offset[0,-26]. Resolves to root [7,86].
      await expectRect(inventory.locator('.mc-slot').nth(index), frame, { x: 7 + index % 9 * 18, y: 86 + Math.floor(index / 9) * 18, ...slot });
    }
    for (let index = 0; index < 9; index++) {
      await expectRect(hotbar.locator('.mc-slot').nth(index), frame, { x: 7 + index * 18, y: root.height - 5 - 18, ...slot });
    }
    const occupied = inventory.locator('.mc-slot:not([data-empty]) .mc-slot__item').first();
    if (await occupied.count()) expect(await occupied.evaluate(node => [node.getBoundingClientRect().width, node.getBoundingClientRect().height])).toEqual([slot.art * 2, slot.art * 2]);
  }
});

test('enchanting uses raw JSON percentage geometry rather than hand-rounded rows', async ({ page }, testInfo) => {
  await open(page); const region = page.locator('#workstations .mc-enchanting'), frame = await box(region);
  await expectRect(region.locator('.mc-workstation__title'), frame, { x: 12, y: enchantTop.y - 4 });
  await expectRect(region.locator('.mc-enchanting__book'), frame, { x: 13, y: enchantTop.y + (enchantTop.height - 40) / 2 - 12, width: 40, height: 40 });
  const inputY = enchantTop.y + (enchantTop.height - slot.height) / 2 + 14;
  await expectRect(region.locator('.mc-enchanting__item'), frame, { x: 13, y: inputY, ...slot });
  await expectRect(region.locator('.mc-enchanting__lapis'), frame, { x: 33, y: inputY, ...slot });
  const options = region.locator('.mc-enchanting__options');
  await expectRect(options, frame, { ...enchantOrigin, ...enchantOptions });
  const optionsFrame = await box(options);
  // Compare rows in their own parent's coordinate space: its raw geometry has
  // already been checked above. A later row accumulates two preceding tracks'
  // 1/64px floor quantization plus the parent's height quantization / 3.
  // Three layout units bound that accumulation; one GUI pixel would be too lax.
  // This remains solely a logical-layout check, never a 0-difference raster gate.
  for (let index = 0; index < 3; index++) await expectRect(region.locator('.mc-enchanting__option').nth(index), optionsFrame, {
    x: 0, y: logicalRowHeight * index, width: enchantOptions.width, height: logicalRowHeight,
  }, 2, 3 / 64);
  const evidence = new URL('../.cache/independent-qa/enchanting-unmasked.png', import.meta.url);
  await mkdir(new URL('../.cache/independent-qa/', import.meta.url), {recursive:true});
  await region.screenshot({path:fileURLToPath(evidence)});
  await testInfo.attach('unmasked-enchanting-browser-frame', { path:fileURLToPath(evidence), contentType: 'image/png' });
  await testInfo.attach('independent-json-layout', { body: JSON.stringify({ root, enchantTop, enchantOrigin, enchantOptions, logicalRowHeight, scope: 'logical geometry; native raster capture missing' }, null, 2), contentType: 'application/json' });
});

test('real enchanting composition includes source dust, rune boxes, costs and colors', async ({ page }) => {
  await open(page); const region = page.locator('#workstations .mc-enchanting');
  const choices = region.locator('.mc-enchanting__option'); await expect(choices).toHaveCount(3);
  for (let index = 0; index < 3; index++) {
    const choice = choices.nth(index), frame = await box(choice);
    await expectRect(choice.locator('.mc-enchanting__dust'), frame, { x: 3, y: (logicalRowHeight - 11) / 2, width: 13, height: 11 });
    const runes = choice.locator('.mc-enchanting__runes');
    await expectRect(runes, frame, { x: 18, y: (logicalRowHeight - 16) / 2 + 4, width: 84, height: 16 });
    await expect(runes).toHaveCSS('text-shadow', 'none');
    const cost = choice.locator('.mc-enchanting__cost'), costBox = await box(cost);
    expect(Math.abs(frame.x + frame.width - costBox.x - costBox.width - 4)).toBeLessThanOrEqual(.02);
    expect(Math.abs(frame.y + frame.height - costBox.y - costBox.height - 4)).toBeLessThanOrEqual(.02);
    await sourceColour(cost, await choice.isDisabled() ? [.54, .37, .36] : [.5, 1, .125]);
    expect(await cost.evaluate(node => getComputedStyle(node).textShadow)).not.toBe('none');
  }
});

test('GUI labels preserve original Mojangles advance metrics when local font exists', async ({ page }) => {
  test.skip(!existsSync(new URL('../.cache/local-fonts/Mojangles.ttf', import.meta.url)), 'Original font supplied by the user is required for this check.');
  const original = await readFile(new URL('../.cache/local-fonts/Mojangles.ttf', import.meta.url));
  expect(createHash('sha256').update(original).digest('hex')).toBe('3d4cdf2752075d28c6ebf0ba44a61157ec6eb38f8db0ebdc3205aec056760be5');
  await open(page);
  const checks = [
    ['#workstations .mc-grindstone .mc-workstation__title', 'Repair & Disenchant', 10200],
    ['#workstations .mc-enchanting .mc-workstation__title', 'Enchant', 4000],
    ['#workstations .mc-grindstone .mc-player-inventory__label', 'Inventory', 5000],
  ] as const;
  for (const [selector, text, originalAdvanceUnits] of checks) {
    const actual = await page.locator(selector).evaluate((node, text) => {
      const style = getComputedStyle(node), canvas = document.createElement('canvas'), context = canvas.getContext('2d')!;
      context.font = `${style.fontSize} ${style.fontFamily}`;
      return { size: Number.parseFloat(style.fontSize), family: style.fontFamily, width: context.measureText(text).width, letterSpacing: style.letterSpacing };
    }, text);
    expect(actual.family).toContain('Mojangles'); expect(['normal', '0px']).toContain(actual.letterSpacing);
    expect(actual.width).toBeCloseTo(originalAdvanceUnits / 1000 * actual.size, 2);
  }
  // This certifies selected glyph metrics, not the undocumented mapping of
  // native font_size=normal to points/CSS px, nor the game's final glyph raster.
});

test('the public inventory showcase uses real raster item resources', async ({ page }) => {
  await open(page);
  const items = page.locator('#inventory-states .mc-slot:not([data-empty]) .mc-slot__item');
  expect(await items.count()).toBeGreaterThan(0);
  await expect(items.locator('svg')).toHaveCount(0);
  for (const item of await items.all()) {
    const image = item.locator('img'); await expect(image).toHaveCount(1);
    expect(await image.evaluate(node => node instanceof HTMLImageElement && node.complete && node.naturalWidth > 0)).toBe(true);
    await expect(image).toHaveCSS('image-rendering', 'pixelated');
  }
});

test('the five item PNGs match the installed game archive byte for byte', async () => {
  const archivePath=join(process.env.MCBE_INSTALL_ROOT ?? 'C:/XboxGames/Minecraft for Windows/Content','data/resource_packs/vanilla/__brarchive/textures/items.brarchive');
  test.skip(!existsSync(archivePath),'The user-owned original game archive is required for native item certification.');
  const archive=await readFile(archivePath), count=archive.readUInt32LE(8), version=archive.readUInt32LE(12), payload=16+count*256;
  expect(version).toBe(1); expect(payload).toBeLessThanOrEqual(archive.length);
  for(const name of ['diamond_sword.png','diamond.png','apple.png','emerald.png','dye_powder_blue.png']) {
    let native:Buffer | undefined;
    for(let index=0;index<count;index++) {
      const start=16+index*256, length=archive[start]!;
      if(archive.toString('utf8',start+1,start+1+length)!==name) continue;
      const offset=archive.readUInt32LE(start+248), size=archive.readUInt32LE(start+252);
      expect(payload+offset+size).toBeLessThanOrEqual(archive.length);
      native=archive.subarray(payload+offset,payload+offset+size); break;
    }
    expect(native,`native archive contains ${name}`).toBeDefined();
    const demo=await readFile(new URL(`../demo/assets/minecraft/${name}`,import.meta.url));
    expect(demo.equals(native!),`${name} must be the actual installed texture`).toBe(true);
  }
});

test('grindstone follows explicit source focus overrides, including an empty result', async ({page}) => {
  await open(page); const region=page.locator('#workstations .mc-grindstone');
  const input=region.locator('.mc-grindstone__input'), additional=region.locator('.mc-grindstone__additional'), result=region.locator('.mc-grindstone__result');
  await input.focus(); await input.press('ArrowDown'); await expect(additional).toBeFocused();
  await additional.press('ArrowUp'); await expect(input).toBeFocused();
  await input.press('ArrowRight'); await expect(result).toBeFocused();
  await result.press('ArrowLeft'); await expect(additional).toBeFocused();
  await additional.press('ArrowRight'); await expect(result).toBeFocused();
  await result.press('Enter'); await expect(result).toHaveAttribute('aria-disabled','true');
  // The source container-slot button remains a focusable inventory target even
  // when there is no item; an unavailable result must not remove this nav edge.
  expect(await result.evaluate(node=>node instanceof HTMLButtonElement && !node.disabled)).toBe(true);
  await expect(result).toBeFocused();
  await result.press('ArrowLeft'); await expect(additional).toBeFocused();
});
