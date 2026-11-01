import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';

/** Complete authored test planes, not Minecraft art or native GUI goldens.
 * Original input is a2x6 opaque white PNG, glyph advance3 and source scale2. */
for (const scenario of [
  { scale: 1, offset: 0, shadow: false, brand: false },
  { scale: 2, offset: 0, shadow: false, brand: false },
  { scale: 3, offset: 0, shadow: false, brand: false },
  { scale: 3, offset: 0, shadow: true, brand: false },
  { scale: 3, offset: 1.5, shadow: true, brand: false },
  { scale: 2, offset: 0, shadow: false, brand: true },
]) test(`complete controlled Web plane ${JSON.stringify(scenario)}`, async ({ page }, info) => {
  await page.goto('/demo/credits-fixture.html');
  await expect(page.locator('.mc-bitmap-text[data-render-state="ready"]')).toHaveCount(1);
  await page.evaluate(value => window.__creditsRollQA.configure(value), scenario);
  await expect(page.locator('.mc-bitmap-text[data-render-state="ready"]')).toHaveCount(1);
  if (scenario.brand) {
    await expect(page.locator('.mc-credits-roll img')).toHaveJSProperty('complete', true);
    await expect(page.locator('.mc-credits-roll img')).toHaveJSProperty('naturalWidth', 2);
  }
  const beforeHostAlignment = await page.locator('.mc-credits-roll').boundingBox();
  // The fixture's preceding text has a fractional line box. Move only the
  // fixture mount host to an integer origin; retain the complete component and
  // its authored dimensions rather than crop/accept an extra screenshot row.
  await page.locator('#root').evaluate(node => { node.style.position = 'absolute'; node.style.left = '0px'; node.style.top = '160px'; });
  const bounds = await page.locator('.mc-credits-roll').boundingBox();
  expect(bounds).not.toBeNull();
  expect([bounds!.x, bounds!.y, bounds!.width, bounds!.height]).toEqual([0, 160, 100 * scenario.scale, 30 * scenario.scale]);
  await info.attach('capture-bounds.json', { body: JSON.stringify({ beforeHostAlignment, afterHostAlignment: bounds, wholeViewportRetained: true }), contentType: 'application/json' });
  const data = await page.locator('.mc-credits-roll').screenshot({ path: info.outputPath('actual.png') });
  const actual = PNG.sync.read(data), expected = new PNG({ width: 100 * scenario.scale, height: 30 * scenario.scale });
  expect([actual.width, actual.height]).toEqual([expected.width, expected.height]);
  for (let p = 0; p < expected.data.length; p += 4) expected.data.set([17, 34, 51, 255], p);
  const rect = (x: number, y: number, width: number, height: number, color: readonly number[]) => {
    for (let yy = Math.max(0, y); yy < Math.min(expected.height, y + height); yy++)
      for (let xx = Math.max(0, x); xx < Math.min(expected.width, x + width); xx++) expected.data.set(color, (yy * expected.width + xx) * 4);
  };
  const scale = scenario.scale, top = Math.floor(((scenario.brand ? 12 : 0) - scenario.offset) * scale);
  if (scenario.brand) rect(48 * scale, Math.floor(-scenario.offset * scale), 4 * scale, 12 * scale, [255, 255, 255, 255]);
  if (scenario.shadow) rect(12 * scale + scale, top + scale, 4 * scale, 12 * scale, [0, 0, 0, 255]);
  rect(12 * scale, top, 4 * scale, 12 * scale, [255, 255, 255, 255]);
  let differences = 0;
  for (let p = 0; p < actual.data.length; p += 4) if (actual.data.subarray(p, p + 4).some((value, channel) => value !== expected.data[p + channel])) differences++;
  await info.attach('expected.png', { body: PNG.sync.write(expected), contentType: 'image/png' });
  await info.attach('comparison.json', { body: JSON.stringify({ pixels: actual.width * actual.height, differences, source: 'authored two-by-six test input; no native parity claim' }), contentType: 'application/json' });
  expect(differences).toBe(0);
});
