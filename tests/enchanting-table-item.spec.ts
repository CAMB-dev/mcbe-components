import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';
import { PNG } from 'pngjs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BlockPreview } from '../src';
import type { BlockKind, BlockPreviewProps } from '../src';

const ARCHIVE_SHA = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf';
const SOURCES = {
  top: ['8109bbeeeb8dd4fa28fb196be7116f2213b6f68886396f43058f900e88c8dd6d', '78481b87044b5d683dd9f31391d4412d996ae3b0d989138cebb7e222c4b7e661'],
  side: ['a8e6579c97f235bb19f7ceb7a6e10bcce769c2614586b1386ba267c88a42b3f5', '07b97671c6696b3c876ee57a9ee9656b73fc3fc47353625ab249fc49e1370b1e'],
  bottom: ['c614ae20e28ba3f1c61da175543ba50402b9663fca9dcc604ed3e6a0a527f642', '5b6eb114e3cc45d3f83d342f8d25bc0351a98f93e054097361034259798ddbcf'],
} as const;
type Face = keyof typeof SOURCES;
const sha = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
let archivePromise: Promise<(name: string) => Buffer> | undefined;
function originalZip() {
  return archivePromise ??= (async () => {
    const bytes = await readFile(new URL('../.cache/references/bedrock-samples-v1.26.60.5-full.zip', import.meta.url));
    expect(sha(bytes), 'Run npm run pretest to obtain the immutable official full source ZIP').toBe(ARCHIVE_SHA);
    let end = -1;
    for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65557); p--) if (bytes.readUInt32LE(p) === 0x06054b50 && p + 22 + bytes.readUInt16LE(p + 20) === bytes.length) { end = p; break; }
    if (end < 0) throw Error('Original source ZIP has no end record');
    const entries = new Map<string, { method: number; size: number; packed: number; offset: number }>();
    let p = bytes.readUInt32LE(end + 16);
    for (let i = 0; i < bytes.readUInt16LE(end + 10); i++) {
      if (bytes.readUInt32LE(p) !== 0x02014b50) throw Error('Invalid original source ZIP directory');
      const n = bytes.readUInt16LE(p + 28), extra = bytes.readUInt16LE(p + 30), comment = bytes.readUInt16LE(p + 32);
      entries.set(bytes.toString('utf8', p + 46, p + 46 + n), { method: bytes.readUInt16LE(p + 10), size: bytes.readUInt32LE(p + 24), packed: bytes.readUInt32LE(p + 20), offset: bytes.readUInt32LE(p + 42) });
      p += 46 + n + extra + comment;
    }
    return (name: string) => {
      const z = entries.get(name); if (!z || bytes.readUInt32LE(z.offset) !== 0x04034b50) throw Error('Missing original ZIP entry ' + name);
      const start = z.offset + 30 + bytes.readUInt16LE(z.offset + 26) + bytes.readUInt16LE(z.offset + 28);
      const packed = bytes.subarray(start, start + z.packed);
      const data = z.method === 0 ? Buffer.from(packed) : z.method === 8 ? inflateRawSync(packed) : (() => { throw Error('Unsupported ZIP method'); })();
      expect(data.length, name).toBe(z.size); return data;
    };
  })();
}
async function original(face: Face) {
  const read = await originalZip(), bytes = read(`resource_pack/textures/blocks/enchanting_table_${face}.png`), png = PNG.sync.read(bytes);
  expect(sha(bytes)).toBe(SOURCES[face][0]); expect(sha(png.data)).toBe(SOURCES[face][1]); expect([png.width, png.height]).toEqual([16, 16]);
  return { bytes, png };
}
function jsonc(data: Buffer) {
  return JSON.parse(data.toString('utf8').replace(/^\uFEFF/, '').replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, token => token.startsWith('"') ? token : ''));
}
const fixture = '/demo/enchanting-table-item-fixture.html';
async function open(page: import('@playwright/test').Page) { await page.goto(fixture); await expect(page.locator('[data-render-state="ready"]')).toHaveCount(10); }
async function pixels(canvas: import('@playwright/test').Locator) {
  return canvas.evaluate(node => { const c = node as HTMLCanvasElement; return [...c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data]; });
}

test('public enchanting-table preset is typed, server-safe and retains accessible canvas semantics', () => {
  const block: BlockKind = 'enchanting-table'; const props: BlockPreviewProps = { block, label: 'Enchanting table item', size: 80, resolution: 80 };
  const markup = renderToStaticMarkup(createElement(BlockPreview, props));
  expect(markup).toContain('role="img"'); expect(markup).toContain('aria-label="Enchanting table item"'); expect(markup).toContain('data-block="enchanting-table"');
  expect(markup).toContain('data-fidelity="renderer-reconstruction"'); expect(markup).toContain('width="80"');
});

test('three complete multi-face PNGs and original aliases independently match the immutable release ZIP', async ({ page }, testInfo) => {
  const read = await originalZip();
  expect(sha(read('resource_pack/blocks.json'))).toBe('59267aa7553d7fea1ba2bccf46b540ba72d54ba8a0c2e18733cfb8bbbf1682cf');
  expect(sha(read('resource_pack/textures/terrain_texture.json'))).toBe('623b5a67fa1c1f50972db86607492b629c0b3ce9d7f886e1f569a4d820d91e95');
  const blocks = jsonc(read('resource_pack/blocks.json')), terrain = jsonc(read('resource_pack/textures/terrain_texture.json'));
  expect(blocks.enchanting_table.textures).toEqual({ down: 'enchanting_table_bottom', side: 'enchanting_table_side', up: 'enchanting_table_top' });
  await open(page); const rows = [];
  for (const face of ['top', 'side', 'bottom'] as const) {
    expect(terrain.texture_data[`enchanting_table_${face}`]).toEqual({ textures: `textures/blocks/enchanting_table_${face}` });
    const source = await original(face), filename = `enchanting_table_${face}.png`;
    const bytes = Buffer.from(await page.evaluate(async file => [...new Uint8Array(await (await fetch('/src/assets/item-renderers/' + file)).arrayBuffer())], filename));
    expect(bytes.equals(source.bytes), 'complete public asset bytes, no re-encoding').toBe(true);
    expect(PNG.sync.read(bytes).data.equals(source.png.data), 'all RGBA including transparent texels').toBe(true);
    rows.push({ face, bytes: bytes.length, sha256: sha(bytes), rgbaSha256: sha(source.png.data) });
  }
  await testInfo.attach('independent-original-pngs.json', { body: JSON.stringify({ archiveSha256: ARCHIVE_SHA, rows }), contentType: 'application/json' });
});

// Axis views remove empirical camera/light from the equation. Expected pixels
// are direct source texels, not rasterize()/mesh snapshots. Full-cube framing
// retains the missing top4 model pixels; side rows4..15 span12 model pixels.
// This declares the Web cuboid/UV contract, not native item-camera certification.
for (const view of ['front', 'right', 'top', 'bottom'] as const) test(`complete ${view} view preserves source UVs and the twelve-high cuboid without silhouette masks`, async ({ page }, testInfo) => {
  await open(page); const face = view === 'front' || view === 'right' ? 'side' : view;
  const source = (await original(face)).png, expected = new Uint8Array(80 * 80 * 4);
  for (let y = 0; y < 80; y++) for (let x = 0; x < 80; x++) {
    if (face === 'side' && y < 20) continue;
    const a = Math.floor(x / 5), b = Math.floor(y / 5);
    const [u, v] = view === 'top' ? [15 - b, a] : view === 'bottom' ? [b, a] : [a, b];
    expected.set(source.data.subarray((v * 16 + u) * 4, (v * 16 + u) * 4 + 4), (y * 80 + x) * 4);
  }
  const canvas = page.locator(`[data-case="${view}"] canvas`), actual = Buffer.from(await pixels(canvas));
  expect(actual.equals(Buffer.from(expected)), 'all6400 pixels including transparent space; no native-AA claim').toBe(true);
  await testInfo.attach('complete-axis-rgba.json', { body: JSON.stringify({ view, width: 80, height: 80, pixels: 6400, actualSha256: sha(actual), expectedSha256: sha(expected), exact: true }), contentType: 'application/json' });
});

test('all and individual side overrides retain cuboid height and change only the sampled source', async ({ page }) => {
  await open(page); const source = (await original('top')).png, expected = new Uint8Array(80 * 80 * 4);
  for (let y = 20; y < 80; y++) for (let x = 0; x < 80; x++) {
    const i = (Math.floor(y / 5) * 16 + Math.floor(x / 5)) * 4;
    expected.set(source.data.subarray(i, i + 4), (y * 80 + x) * 4);
  }
  for (const name of ['all-override', 'side-override']) expect(Buffer.from(await pixels(page.locator(`[data-case="${name}"] canvas`))).equals(Buffer.from(expected))).toBe(true);
});

test('live preset, decoration, ARIA override, canvas ref and ready callbacks remain functional', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await open(page);
  await expect(page.getByRole('img', { name: 'Enchanting table item', exact: true })).toHaveCount(1);
  await expect(page.locator('[data-case="decorative"] canvas')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('[data-case="decorative"]').getByRole('img')).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Custom item name', exact: true })).toHaveCount(1);
  const canvas = page.locator('[data-case="controlled"] canvas'), table = await pixels(canvas);
  await page.getByRole('button', { name: 'Check canvas ref' }).click(); await expect(page.getByLabel('Item renderer events')).toHaveText('{"ready":11,"errors":0}');
  await page.getByRole('button', { name: 'Switch preset' }).click(); await expect(canvas).toHaveAttribute('data-block', 'stone'); await expect(canvas).toHaveAttribute('data-render-state', 'ready');
  expect(await pixels(canvas)).not.toEqual(table);
  await page.getByRole('button', { name: 'Switch preset' }).click(); await expect(canvas).toHaveAttribute('data-block', 'enchanting-table'); await expect(canvas).toHaveAttribute('data-render-state', 'ready');
  expect(await pixels(canvas)).toEqual(table); await expect(page.getByLabel('Item renderer events')).toHaveText('{"ready":13,"errors":0}'); expect(errors).toEqual([]);
});
