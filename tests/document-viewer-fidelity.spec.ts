import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';

// Whole originals independently pinned from Mojang v1.26.60.5 full ZIP,
// SHA d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf.
// This is source-image/DOM evidence, not Minecraft native UI parity.
const originals = [
  ['StoreTopBar', 'e247c9b13bc2b67a09e8a312c7c420680899d3f6d5a1d8a6269230c9cf212a98', 3, 5],
  ['HowToPlayDivider', 'e17d780302672be622ed504abc1565707cf3d46b77cacceaf8f687020df9493e', 3, 3],
  ['banners_no_border', '990b0725714c229364c6793325a1afef6ae61f81e93dc7c79df0150e54fb22b2', 4, 4],
  ['button_borderless_light', '313b607889ba3d224cf599420087876ccb3f4572b304dc1ba6c25825f7d2c376', 4, 4],
  ['button_borderless_lightpressednohover', 'c3e928f9c58b6cf42399686ba71f5656de59a2dadcdd6cee9b26111ec5200c52', 4, 4],
  ['button_borderless_lighthover', 'e4cdc816ebbfae2bea1e870fbde0c59effd680cdec388ba1e66424645573aea8', 4, 4],
  ['button_borderless_lightpressed', '47f6ed1760ae8e407cdbb6b7207a5ee45b8a0db861f16f0696c5cf61c9961983', 4, 4],
  ['disabledButtonNoBorder', '5a04f3b69f14cd1750b6c818310964e91f4962afc38cfe7bef41ad3c0fb4b27f', 2, 2],
  ['permissions_player_fade_overlay', '5ef05eb8f2100ac885c96aced008715e1225634d327162b88625672be82547e5', 2, 2],
] as const;
const source = async (name: string) => readFile(new URL(`../src/assets/document-viewer/${name}.png`, import.meta.url));
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');

test('document chrome keeps independently pinned whole original PNG bytes and raw one-unit slice metadata', async () => {
  for (const [name, sha, w, h] of originals) {
    const bytes = await source(name); expect(hash(bytes), name).toBe(sha); const png = PNG.sync.read(bytes); expect([png.width, png.height], name).toEqual([w, h]);
    if (name.startsWith('button_borderless') || name === 'disabledButtonNoBorder' || name === 'HowToPlayDivider' || name === 'banners_no_border') {
      const rawMetadata = await readFile(new URL(`../src/assets/document-viewer/${name}.json`, import.meta.url));
      const metadataHash = name === 'HowToPlayDivider' ? '3a8fa77f457467e4c8bb0abe55dfd6dec20ca900d1edda31b857875bb4619422' : name === 'disabledButtonNoBorder' ? '97fdfacd4bf3d22a981aceec2cbc74876d7f9166f34064b6ecbdf293de1b7989' : '622158df366964d9ddeac5ed9938a43522da68d02c060335b853c9730103ad65';
      expect(hash(rawMetadata), `${name} raw metadata`).toBe(metadataHash); const metadata = JSON.parse(rawMetadata.toString('utf8'));
      expect(metadata.nineslice_size).toBe(1); expect(metadata.base_size).toEqual([w, h]);
    }
  }
});

// Standard nineslice POINT reference for source cut 1. No production helper is imported.
function axis(position: number, target: number, original: number, scale: number) {
  if (position < scale) return 0;
  if (position >= target - scale) return original - 1;
  return 1 + Math.min(original - 3, Math.floor((position - scale) * (original - 2) / (target - 2 * scale)));
}

test('five navigation states use original corner edge and center pixels at two integer scales without double skin blending', async ({ page }, info) => {
  await page.setViewportSize({ width: 1200, height: 1000 }); await page.addInitScript(() => { window.documentQAInitial = { skinOnly: true, hints: false, size: [400, 300] }; });
  await page.goto('/demo/document-viewer-fixture.html'); await expect.poll(() => page.evaluate(() => !!window.documentQA?.ref)).toBe(true);
  const states = [
    { name: 'normal', id: 'intro', value: 'second', hover: false, png: 'button_borderless_light' },
    { name: 'selected', id: 'intro', value: 'intro', hover: false, png: 'button_borderless_lightpressednohover' },
    { name: 'hover', id: 'intro', value: 'second', hover: true, png: 'button_borderless_lighthover' },
    { name: 'selected-hover', id: 'intro', value: 'intro', hover: true, png: 'button_borderless_lightpressed' },
    { name: 'disabled', id: 'locked', value: 'intro', hover: false, png: 'disabledButtonNoBorder' },
  ];
  const checks: { scale: number; state: string; compared: number; different: number; maxDelta: number; wholeBytesMatch: boolean }[] = [];
  for (const scale of [1, 2]) for (const state of states) {
    await page.evaluate(({ scale, value }) => window.documentQA.configure({ scale, value }), { scale, value: state.value });
    const row = page.locator(`#qa-document-viewer button[data-topic-id="${state.id}"]`), skin = row.locator('.mc-document-viewer__topic-skin');
    await page.mouse.move(1, 1); if (state.hover) await row.hover(); await page.evaluate(async () => { await document.fonts.ready; });
    const css = await skin.evaluate(n => { const s = getComputedStyle(n); return s.borderImageSource !== 'none' ? s.borderImageSource : s.backgroundImage; });
    const url = css.match(/url\(["']?(.+?)["']?\)/)?.[1]; expect(url, css).toBeTruthy();
    const response = await page.request.get(url!); expect(response.ok()).toBe(true); const actualAsset = await response.body(), expectedAsset = await source(state.png); expect(actualAsset.equals(expectedAsset)).toBe(true);
    const original = PNG.sync.read(expectedAsset), shot = await skin.screenshot(), actual = PNG.sync.read(shot); let different = 0, maxDelta = 0;
    for (let y = 0; y < actual.height; y++) for (let x = 0; x < actual.width; x++) {
      const sx = state.name === 'disabled' ? Math.floor(x * original.width / actual.width) : axis(x, actual.width, original.width, scale);
      const sy = state.name === 'disabled' ? Math.floor(y * original.height / actual.height) : axis(y, actual.height, original.height, scale);
      const from = (sy * original.width + sx) * 4, to = (y * actual.width + x) * 4, alpha = original.data[from + 3]! / 255; let changed = actual.data[to + 3] !== 255;
      for (let c = 0; c < 3; c++) { const expected = Math.round(original.data[from + c]! * alpha + [49, 50, 51][c]! * (1 - alpha)), delta = Math.abs(actual.data[to + c]! - expected); maxDelta = Math.max(maxDelta, delta); if (delta) changed = true; }
      if (changed) different++;
    }
    checks.push({ scale, state: state.name, compared: actual.width * actual.height, different, maxDelta, wholeBytesMatch: true });
    await info.attach(`navigation-${state.name}-${scale}.png`, { body: shot, contentType: 'image/png' });
  }
  await info.attach('document-navigation-composition.json', { body: JSON.stringify({ qualification: 'Original source PNG and standard nineslice DOM composition only; no native screen claim', checks }, null, 2), contentType: 'application/json' });
  for (const check of checks) { expect(check.compared).toBeGreaterThan(1000); expect(check.maxDelta, JSON.stringify(check)).toBeLessThanOrEqual(1); }
});

test('public whole white alias is opaque and actual tint covers the host background', async ({ page }, info) => {
  const bytes = await source('permissions_player_fade_overlay'), original = PNG.sync.read(bytes); expect(hash(bytes)).toBe('5ef05eb8f2100ac885c96aced008715e1225634d327162b88625672be82547e5'); expect([...original.data]).toEqual(Array(16).fill(255));
  await page.goto('/demo/document-viewer-fixture.html'); await expect.poll(() => page.evaluate(() => !!window.documentQA?.ref)).toBe(true);
  const pngBytes = await page.locator('#qa-document-viewer').screenshot(), png = PNG.sync.read(pngBytes);
  // Source tint[.192,.196,.2], in the uncluttered bottom-left frame corner.
  const at = ((png.height - 2) * png.width + 1) * 4; expect([...png.data.subarray(at, at + 4)]).toEqual([49, 50, 51, 255]);
  await info.attach('document-opaque-source-tint.png', { body: pngBytes, contentType: 'image/png' });
});
