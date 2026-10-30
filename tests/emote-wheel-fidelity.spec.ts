import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import type { EmoteQASettings } from '../demo/emote-wheel-fixture';

// This verifies the original wheel art as actually composited by the DOM.
// Content/center boxes are excluded because their host text is a separate draw.
// It is not a screenshot comparison against a native Minecraft screen.
test('five whole source frames retain nearest pixels and a single alpha blend at two logical scales', async ({ page }, info) => {
  await page.setViewportSize({ width: 1800, height: 1600 });
  await page.goto('/demo/emote-wheel-fixture.html');
  await expect.poll(() => page.evaluate(() => !!window.emoteQA?.ref)).toBe(true);
  const wheel = page.locator('#qa-emote-wheel');
  const frames = ['base', 'select_0', 'select_1', 'select_2', 'select_3'];
  const checks: { scale: number; frame: string; compared: number; different: number; maximumChannelDelta: number }[] = [];
  for (const scale of [1, 2]) {
    // 1144 physical frame -> 858 physical wheel = exact 6x original PNG;
    // the 143px inset is integral, avoiding a fractional screenshot crop.
    await page.evaluate(({ scale }) => window.emoteQA.configure({ scale, size: [1144 / scale, 1144 / scale], inputMode: 'pointer' }), { scale });
    for (let state = 0; state < frames.length; state++) {
      const activeIndex = (state === 0 ? null : state - 1) as EmoteQASettings['activeIndex'];
      await page.evaluate(activeIndex => window.emoteQA.configure({ activeIndex }), activeIndex);
      const image = wheel.locator('.mc-emote-wheel__frame');
      await expect(image).toHaveAttribute('src', new RegExp(`emote_wheel_updated_${frames[state]}`));
      await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth)).toBe(143);
      const geometry = await image.boundingBox(); expect(geometry).not.toBeNull();
      expect(geometry!.width).toBe(858); expect(geometry!.height).toBe(858);
      const actual = PNG.sync.read(await image.screenshot());
      const source = PNG.sync.read(await readFile(new URL(`../src/assets/emote-wheel/emote_wheel_updated_${frames[state]}.png`, import.meta.url)));
      expect([actual.width, actual.height]).toEqual([858, 858]);
      const background = [40, 41, 42]; // fixture body #28292a, independent of the component.
      let compared = 0, different = 0, maximumChannelDelta = 0;
      const sourceBoxes = [
        [.35, .02, .65, .32], [.68, .35, .98, .65],
        [.35, .68, .65, .98], [.02, .35, .32, .65],
      ]; // original 30% preview boxes at ±33%, not computed from product DOM.
      const centerHalf = 35 * scale / 2;
      for (let y = 0; y < 858; y++) for (let x = 0; x < 858; x++) {
        if (sourceBoxes.some(([l, t, r, b]) => x >= l! * 858 - 2 && x < r! * 858 + 2 && y >= t! * 858 - 2 && y < b! * 858 + 2)) continue;
        if (Math.abs(x + .5 - 429) <= centerHalf + 2 && Math.abs(y + .5 - 429) <= centerHalf + 2) continue;
        const from = (Math.floor(y / 6) * 143 + Math.floor(x / 6)) * 4, to = (y * 858 + x) * 4, alpha = source.data[from + 3]!;
        let changed = actual.data[to + 3] !== 255;
        for (let c = 0; c < 3; c++) {
          const expected = Math.round((source.data[from + c]! * alpha + background[c]! * (255 - alpha)) / 255);
          const delta = Math.abs(actual.data[to + c]! - expected);
          maximumChannelDelta = Math.max(maximumChannelDelta, delta); if (delta) changed = true;
        }
        compared++; if (changed) different++;
      }
      checks.push({ scale, frame: frames[state]!, compared, different, maximumChannelDelta });
    }
  }
  await info.attach('source-wheel-composition.json', { body: JSON.stringify({ qualification: 'DOM nearest sampling and single source-over blend on uncovered original frame pixels; no native screen claim', checks }, null, 2), contentType: 'application/json' });
  for (const check of checks) {
    expect(check.compared).toBeGreaterThan(400000);
    // Standard browser premultiplication may quantize one channel by 1 byte.
    // A double base/selection blend changes the observed source colors by more.
    expect(check.maximumChannelDelta, JSON.stringify(check)).toBeLessThanOrEqual(1);
  }
});
