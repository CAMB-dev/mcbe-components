import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PNG } from 'pngjs';
import { EnchantingTable } from '../src/workstations';

// Independent source: Bedrock1.26.6005 enchanting_screen.enchantments_grid[1,3]
// and enchant_button_panel's unconditional dark_background image. The same
// original108x19 PNG exists in public bedrock-samples v1.26.60.5 full release.
// This original-texture Web specimen is not a native fractional raster claim.
const darkHash = '153512d7e98be59a3f742be4e8ee27d01c69413452197d2021ccbacd0e6b6ad0';
const fixture = '[data-enchanting-empty-fixture]';
const table = (count: number) => `${fixture} [data-enchanting-option-count="${count}"] .mc-enchanting`;

test.beforeEach(async ({ page }) => { await page.goto('/calibration.html'); await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0); });

test('zero through three records keep three permanent source row surfaces and raw percentage geometry', async ({ page }) => {
  // Derived from source root176x166, top height50%-12, grid65%-8 by80%+4.
  const width = (176 * .65 - 8) * 2, height = ((166 * .5 - 12) * .8 + 4) * 2;
  const row = height * .33333333;
  for (const count of [0, 1, 2, 3]) {
    const region = page.locator(table(count)), group = region.getByRole('group', { name: 'Enchantments' });
    const surfaces = group.locator(':scope > *');
    await expect(surfaces).toHaveCount(3);
    await expect(group.getByRole('button')).toHaveCount(count);
    await expect(group.locator('.mc-enchanting__empty-option')).toHaveCount(3 - count);
    const bounds = await group.boundingBox(); expect(bounds).not.toBeNull();
    expect(Math.abs(bounds!.width - width)).toBeLessThanOrEqual(1 / 64);
    expect(Math.abs(bounds!.height - height)).toBeLessThanOrEqual(1 / 64);
    for (let index = 0; index < 3; index++) {
      const actual = await surfaces.nth(index).boundingBox(); expect(actual).not.toBeNull();
      expect(Math.abs(actual!.x - bounds!.x)).toBeLessThanOrEqual(1 / 64);
      expect(Math.abs(actual!.y - bounds!.y - index * row)).toBeLessThanOrEqual(3 / 64);
      expect(Math.abs(actual!.width - width)).toBeLessThanOrEqual(1 / 64);
      expect(Math.abs(actual!.height - row)).toBeLessThanOrEqual(3 / 64);
    }
  }
});

test('empty rows contain no invented requirement, rune, dust, action or tab stop', async ({ page }) => {
  for (const count of [0, 1, 2]) {
    const region = page.locator(table(count)), group = region.getByRole('group', { name: 'Enchantments' });
    await expect(group.locator('.mc-enchanting__empty-option')).toHaveCount(3 - count);
    for (const empty of await group.locator('.mc-enchanting__empty-option').all()) {
      await expect(empty).toHaveAttribute('aria-hidden', 'true'); await expect(empty).toBeEmpty();
      await expect(empty).toHaveCSS('cursor', 'default'); await expect(empty).toHaveCSS('pointer-events', 'none');
      expect(await empty.evaluate(node => ({ tag: node.tagName, tabIndex: node.getAttribute('tabindex'), role: node.getAttribute('role'), children: node.childElementCount })))
        .toEqual({ tag: 'DIV', tabIndex: null, role: null, children: 0 });
      await empty.scrollIntoViewIfNeeded();
      const bounds = await empty.boundingBox(); expect(bounds).not.toBeNull();
      await page.mouse.click(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
    }
    await expect(group.locator('.mc-enchanting__cost')).toHaveCount(count);
    await expect(group.locator('.mc-enchanting__dust')).toHaveCount(count);
    await expect(group.locator('.mc-enchanting__runes')).toHaveCount(count);
  }
  await expect(page.getByLabel('Empty enchanting events')).toBeEmpty();
});

test('all three empty backgrounds match every original texture pixel and stay inert on hover', async ({ page }, testInfo) => {
  const bytes = await readFile(new URL('../.cache/references/enchanting_dark_background.png', import.meta.url));
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(darkHash);
  const original = PNG.sync.read(bytes); expect([original.width, original.height]).toEqual([108, 19]);
  const group = page.locator(table(0)).getByRole('group', { name: 'Enchantments' });
  // Pin only this specimen to the original PNG's integer GUI2 plane. The raw
  // production percentage layout is independently checked in the first test.
  await group.evaluate(node => Object.assign((node as HTMLElement).style, { position: 'fixed', left: '16px', top: '16px', width: '216px', height: '114px', gridTemplateRows: 'repeat(3,38px)', zIndex: '2147483647' }));
  const expected = new PNG({ width: 216, height: 114 });
  for (let y = 0; y < expected.height; y++) for (let x = 0; x < expected.width; x++) {
    const source = (Math.floor((y % 38) / 2) * original.width + Math.floor(x / 2)) * 4;
    original.data.copy(expected.data, (y * expected.width + x) * 4, source, source + 4);
  }
  await writeFile(testInfo.outputPath('empty-options-original-texture-oracle.png'), PNG.sync.write(expected));
  const compare = async (name: string) => {
    const actual = PNG.sync.read(await group.screenshot({ path: testInfo.outputPath(`${name}.png`), animations: 'disabled' }));
    expect([actual.width, actual.height]).toEqual([expected.width, expected.height]);
    let changed = 0, max = 0;
    for (let index = 0; index < actual.data.length; index++) { const difference = Math.abs(actual.data[index]! - expected.data[index]!); if (difference) changed++; max = Math.max(max, difference); }
    expect({ changedChannels: changed, maxChannelDifference: max }).toEqual({ changedChannels: 0, maxChannelDifference: 0 });
  };
  await compare('empty-options-whole-source-surface');
  for (const y of [35, 73, 111]) {
    await page.mouse.move(120, y); await compare(`empty-options-hover-${y}`);
    await page.mouse.down(); await compare(`empty-options-pressed-${y}`); await page.mouse.up();
  }
});

test('a narrow viewport scrolls the fixed frame without compressing empty option geometry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const region = page.locator(table(0)), scroller = page.locator(`${fixture} [data-enchanting-option-count="0"] .mc-workstation-scroll`);
  const measured = await scroller.evaluate(node => ({ client: node.clientWidth, scroll: node.scrollWidth }));
  expect(measured.client).toBeLessThanOrEqual(390); expect(measured.scroll).toBeGreaterThan(measured.client);
  expect((await region.boundingBox())!.width).toBe(352);
  const rows = region.locator('.mc-enchanting__empty-option'); await expect(rows).toHaveCount(3);
  const before = await rows.evaluateAll(nodes => nodes.map(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
  await scroller.evaluate(node => { node.scrollLeft = node.scrollWidth; });
  expect(await rows.evaluateAll(nodes => nodes.map(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })))).toEqual(before);
  await expect(region.getByRole('group', { name: 'Enchantments' }).getByRole('button')).toHaveCount(0);
});

test('controlled fill and clear preserve original record semantics and never infer eligibility', async ({ page }) => {
  const region = page.locator(`${fixture} [data-enchanting-options-controlled]`), group = region.getByRole('group', { name: 'Enchantments' });
  await expect(group.getByRole('button')).toHaveCount(0); await expect(group.locator('.mc-enchanting__empty-option')).toHaveCount(3);
  await page.getByRole('button', { name: 'Fill enchanting options', exact: true }).click();
  await expect(group.getByRole('button')).toHaveCount(3); await expect(group.locator('.mc-enchanting__empty-option')).toHaveCount(0);
  const first = group.getByRole('button', { name: 'Original first option 3', exact: true }), locked = group.getByRole('button', { name: 'Original locked option 15', exact: true }), third = group.getByRole('button', { name: 'Original third option 30', exact: true });
  await expect(first).toHaveAttribute('aria-description', 'Requires level 3'); await expect(first.locator('[data-preserved-empty-runes]')).toHaveText('Caller rune content');
  await expect(locked).toBeDisabled(); await expect(third).toBeEnabled();
  // No input item or lapis was supplied. Eligibility remains caller-controlled.
  await first.click(); await third.focus(); await third.press('Enter');
  await expect(page.getByLabel('Empty enchanting events')).toHaveText('original-first|original-third');
  await page.getByRole('button', { name: 'Clear enchanting options', exact: true }).click();
  await expect(group.getByRole('button')).toHaveCount(0); await expect(group.locator('.mc-enchanting__empty-option')).toHaveCount(3);
  await expect(group.locator('.mc-enchanting__cost, .mc-enchanting__dust, .mc-enchanting__runes')).toHaveCount(0);
  await expect(page.getByLabel('Empty enchanting events')).toHaveText('original-first|original-third');
});

test('SSR empty collection retains three decorative surfaces without synthetic option buttons', () => {
  const html = renderToStaticMarkup(createElement(EnchantingTable, { options: [] }));
  const group = html.match(/<div class="mc-enchanting__options"[\s\S]*?<\/div><\/section>/)?.[0];
  // Inspect the source group substring only; inventory slots stay interactive.
  expect(html.match(/class="mc-enchanting__empty-option"/g)).toHaveLength(3);
  expect(group ?? html).not.toContain('data-enchantment-id');
  expect(html).not.toContain('Requires level'); expect(html).not.toContain('mc-enchanting__dust');
});
