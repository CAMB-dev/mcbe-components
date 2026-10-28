import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';

// Independent observation: Bedrock 1.26.6005.0, Classic GUI5, native PNG A
// SHA256 e208daf0c57fd85e462625cd567b5331968d0c99dc2f78eb0d34292cb163c409.
// Raw origin [1243,987], nominal size58x28 game pixels. Each native five-row
// step was measured directly before the production polygons were implemented.
// These fixed interval observations are not imported from CSS or its metadata.
// Native fractional edge coverage and text are deliberately NOT certified by
// this hard-edge geometry-profile regression. Background corners remain in it.
type Span = readonly [y0: number, y1: number, x0: number, x1: number];
const outer: readonly Span[] = [
  [0, 1, 2, 55], [1, 2, 1, 56], [2, 3, 0, 57], [3, 25, 0, 58],
  [25, 26, 1, 58], [26, 27, 2, 57], [27, 28, 3, 56],
];
const purple: readonly Span[] = [
  [1, 2, 2, 55], [2, 3, 1, 56], [3, 25, 1, 57],
  [25, 26, 2, 57], [26, 27, 3, 56],
];
const inner: readonly Span[] = [
  [2, 3, 2, 54], [3, 4, 2, 55], [4, 24, 2, 56],
  [24, 25, 3, 56], [25, 26, 4, 56],
];
const fill = [27, 12, 27, 255];
const edge = [44, 8, 99, 255];
const background = [139, 139, 139, 255];

function independentContour() {
  const image = new PNG({ width: 116, height: 56 });
  for (let i = 0; i < image.data.length; i += 4) image.data.set(background, i);
  const paint = (spans: readonly Span[], rgba: readonly number[]) => {
    for (const [y0, y1, x0, x1] of spans) {
      for (let y = y0 * 2; y < y1 * 2; y++) {
        for (let x = x0 * 2; x < x1 * 2; x++) image.data.set(rgba, 4 * (y * 116 + x));
      }
    }
  };
  paint(outer, fill); paint(purple, edge); paint(inner, fill);
  return image;
}

test('complete116x56 tooltip contour matches independent native-observed hard-edge profile, not native AA certification', async ({ page, baseURL }, testInfo) => {
  if (!baseURL) throw new Error('Tooltip CSS regression requires the configured local preview baseURL.');
  // No demo reset, shared fixture, font, or text can conceal box-sizing and
  // contour defects. Only the actual library stylesheet supplies its skin.
  await page.setContent(`<!doctype html><html><head>
    <style>html,body{margin:0;background:#8b8b8b}</style>
    <link rel="stylesheet" href="${baseURL}/src/inventory.css?direct">
    </head><body><div role="tooltip" class="mc-item-tooltip"
      style="position:fixed;left:16px;top:16px;width:116px;height:56px">
      <div class="mc-item-tooltip__name"></div>
    </div></body></html>`, { waitUntil: 'load' });
  const target = page.getByRole('tooltip');
  await expect(target).toHaveCSS('box-sizing', 'border-box');
  const box = await target.boundingBox();
  expect(box && [box.width, box.height]).toEqual([116, 56]);
  const bytes = await target.screenshot(), actual = PNG.sync.read(bytes), expected = independentContour();
  expect([actual.width, actual.height]).toEqual([116, 56]);
  let changed = 0, absoluteRgbaSum = 0;
  for (let i = 0; i < actual.data.length; i += 4) {
    let differs = false;
    for (let c = 0; c < 4; c++) {
      const delta = Math.abs(actual.data[i + c]! - expected.data[i + c]!);
      absoluteRgbaSum += delta; differs ||= delta !== 0;
    }
    if (differs) changed++;
  }
  await testInfo.attach('complete production contour', { body: bytes, contentType: 'image/png' });
  await testInfo.attach('independent complete hard-edge candidate', { body: PNG.sync.write(expected), contentType: 'image/png' });
  await testInfo.attach('contour measurement scope', { body: JSON.stringify({
    pixels: 6496, channels: 25984, changed, absoluteRgbaSum,
    includesTransparentCornerBackground: true, mask: null, tolerance: 0,
    nativeRasterCertified: false, scope: 'Observed geometry profile at integer GUI2, without native mixed edges or text.',
  }), contentType: 'application/json' });
  expect(changed, 'Every complete-region RGBA pixel, including exposed background corners').toBe(0);
  expect(absoluteRgbaSum).toBe(0);
});
