import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { PNG } from 'pngjs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GuiLayer, renderGuiLayer, layoutGuiText } from '../src';
import type { GuiLayerProps, GuiTextFont, GuiTextLayoutOptions } from '../src';

const ARCHIVE_SHA = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf';
const sha = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
let archivePromise: Promise<(name: string) => Buffer> | undefined;
async function zip() {
  return archivePromise ??= (async () => {
    const bytes = await readFile(new URL('../.cache/references/bedrock-samples-v1.26.60.5-full.zip', import.meta.url));
    expect(sha(bytes), 'Public original ZIP is required; run npm run pretest').toBe(ARCHIVE_SHA);
    let end = bytes.length - 22; while (end >= 0 && (bytes.readUInt32LE(end) !== 0x06054b50 || end + 22 + bytes.readUInt16LE(end + 20) !== bytes.length)) end--;
    if (end < 0) throw Error('Invalid original ZIP');
    const entries = new Map<string, [number, number, number, number]>(); let cursor = bytes.readUInt32LE(end + 16);
    for (let i = 0; i < bytes.readUInt16LE(end + 10); i++) {
      if (bytes.readUInt32LE(cursor) !== 0x02014b50) throw Error('Invalid source ZIP central record');
      const n = bytes.readUInt16LE(cursor + 28), extra = bytes.readUInt16LE(cursor + 30), comment = bytes.readUInt16LE(cursor + 32);
      entries.set(bytes.toString('utf8', cursor + 46, cursor + 46 + n), [bytes.readUInt16LE(cursor + 10), bytes.readUInt32LE(cursor + 20), bytes.readUInt32LE(cursor + 24), bytes.readUInt32LE(cursor + 42)]);
      cursor += 46 + n + extra + comment;
    }
    return (name: string) => {
      const z = entries.get(name); if (!z || bytes.readUInt32LE(z[3]) !== 0x04034b50) throw Error('Missing original ZIP entry ' + name);
      const start = z[3] + 30 + bytes.readUInt16LE(z[3] + 26) + bytes.readUInt16LE(z[3] + 28), packed = bytes.subarray(start, start + z[1]);
      const data = z[0] === 0 ? Buffer.from(packed) : z[0] === 8 ? inflateRawSync(packed) : (() => { throw Error('Unsupported source ZIP compression'); })();
      expect(data.length, name).toBe(z[2]); return data;
    };
  })();
}
function jsonc(bytes: Buffer) { return JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, '').replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, x => x.startsWith('"') ? x : '')); }
const texture = (png: PNG) => ({ width: png.width, height: png.height, rgba: png.data.toString('base64') });
const pixel = (rgba: number[]) => ({ width: 1, height: 1, rgba });
const field = (width: number, height: number) => new Uint8Array(width * height * 4);
function rect(data: Uint8Array, width: number, box: number[], color: number[], clip?: number[]) {
  const [x, y, w, h] = box as [number, number, number, number], height = data.length / width / 4;
  for (let yy = Math.max(0, y); yy < Math.min(height, y + h); yy++) for (let xx = Math.max(0, x); xx < Math.min(width, x + w); xx++) {
    if (clip && (xx < clip[0]! || yy < clip[1]! || xx >= clip[0]! + clip[2]! || yy >= clip[1]! + clip[3]!)) continue;
    data.set(color, (yy * width + xx) * 4);
  }
}
function solidPage(size = 128, color = [255, 255, 255, 255]) { const data = field(size, size); rect(data, size, [0, 0, size, size], color); return { width: size, height: size, rgba: Buffer.from(data).toString('base64') }; }
const font8 = (): GuiTextFont => ({ pages: ['/unused-128.png'], pageSizes: [128], cellHeight: 8, lineHeight: 10, glyphs: { A: { page: 0, x: 0, y: 0, width: 8, height: 8, advance: 6 } } });
const text = (extra: any = {}) => ({ kind: 'text', text: 'A', font: font8(), origin: [0, 0], fontScale: 1, sampling: 'point', shader: 'bitmap', pages: [[0, solidPage()]], ...extra });
async function open(page: Page) { await page.goto('/demo/gui-layer-fixture.html'); await page.waitForFunction(() => !!window.guiLayerQA); }
async function render(page: Page, options: any) { const value = await page.evaluate(o => window.guiLayerQA.render(o), options); return { ...value, data: Buffer.from(value.rgba, 'base64'), live: Buffer.from(value.liveRgba, 'base64') }; }
async function mount(page: Page, options: any, strict = false) { const serial = await page.evaluate(() => window.guiLayerQA.serial); await page.evaluate(({ o, s }) => window.guiLayerQA.mount(o, s), { o: options, s: strict }); await page.waitForFunction(n => window.guiLayerQA.serial > n || window.guiLayerQA.events.some((s: string) => s.startsWith('error:')), serial); }
async function raw(page: Page) { const value = await page.evaluate(() => window.guiLayerQA.rawCanvas()); return { ...value, data: Buffer.from(value.rgba, 'base64') }; }
function equal(a: Uint8Array, b: Uint8Array, message = 'entire RGBA field, including all whitespace, edges, corners and alpha') { expect(Buffer.from(a).equals(Buffer.from(b)), message).toBe(true); }
function differences(a: Uint8Array, b: Uint8Array) { let pixels = 0, bytes = 0, sum = 0, max = 0, alpha = 0; for (let i = 0; i < a.length; i += 4) { let changed = false; for (let k = 0; k < 4; k++) { const d = Math.abs(a[i + k]! - b[i + k]!); if (d) { bytes++; sum += d; max = Math.max(max, d); changed = true; if (k === 3) alpha++; } } if (changed) pixels++; } return { pixels, bytes, sum, max, alpha, rgbaMae: sum / a.length, actualSHA: sha(a), expectedSHA: sha(b), totalPixels: a.length / 4 }; }
async function prove(info: TestInfo, name: string, actual: Uint8Array, expected: Uint8Array, extra: any = {}) { const report = { ...extra, ...differences(actual, expected) }; await info.attach(name + '.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' }); equal(actual, expected, name); return report; }

test('public typed SSR is decorative or singly named and exposes source builders without browser IO', () => {
  const props: GuiLayerProps = { width: 24, height: 16, guiScale: 2, outputRect: [2, 3, 10, 8], commands: [] };
  const html = renderToStaticMarkup(createElement(GuiLayer, props)); expect(html).toContain('aria-hidden="true"'); expect(html).toContain('width="0"'); expect(html).toContain('width:10px'); expect(html).toContain('data-render-state="loading"');
  const named = renderToStaticMarkup(createElement(GuiLayer, { ...props, label: 'Original layer' })); expect(named).toContain('role="img"'); expect(named).toContain('aria-label="Original layer"'); expect(named).not.toContain('aria-hidden="true"');
  const explicit = renderToStaticMarkup(createElement(GuiLayer, { ...props, label: 'Fallback', 'aria-label': 'Override', 'aria-hidden': true })); expect(explicit).toContain('aria-label="Override"'); expect(explicit).toContain('aria-hidden="true"');
  expect(() => renderGuiLayer(props as any)).toThrow(/browser canvas/);
});

test('source full-cell layout retains negative bearings, blank cells, page batches, shadow order and whole-frame MVP', () => {
  const font: GuiTextFont = { pages: ['p128', 'p256'], pageSizes: [128, 256], cellHeight: 12, lineHeight: 10, glyphs: {
    A: { page: 0, x: 8, y: 36, width: 8, height: 12, advance: 6, offsetX: -1, offsetY: -3 }, B: { page: 1, x: 16, y: 32, width: 16, height: 12, advance: 18 },
    '.': { page: 0, x: 112, y: 24, width: 8, height: 12, advance: 1 }, ' ': { page: 0, x: 0, y: 0, width: 0, height: 0, advance: 4 },
  } };
  for (const scale of [4, 5]) {
    const value = layoutGuiText({ width: 2570, height: 1402, guiScale: scale, text: 'B.A\r\nA ', font, origin: [329, 121.39999389648438], fontScale: .5, sampling: 'point', shader: 'bitmap', shadow: { offset: [1, 1], tint: [.25, .25, .25, 1] }, outputRect: [8, 4, 100, 70] });
    expect(value.logicalWidth).toBe(12.5); expect(value.logicalHeight).toBe(10); expect(value.logicalStage).toEqual([Math.ceil(2570 / scale), Math.ceil(1402 / scale)]); expect(value.projectionSize).toEqual([2570 / scale, 1402 / scale]);
    expect(value.runs.map(r => [r.pass, r.page])).toEqual([['shadow', 0], ['shadow', 1], ['main', 0], ['main', 1]]);
    expect(value.runs[2]!.vertices).toHaveLength(12); expect(value.runs[2]!.vertices[0]!.uvRaw).toEqual([57344, 12288]);
    expect(value.runs[2]!.vertices.slice(-4).map(v => v.position)).toEqual([[-.5, 9.5, 0], [3.5, 9.5, 1], [3.5, 3.5, 2], [-.5, 3.5, 3]]);
    expect(value.runs[2]!.indices).toEqual([1, 2, 0, 0, 2, 3, 5, 6, 4, 4, 6, 7, 9, 10, 8, 8, 10, 11]);
    expect(value.runs[2]!.glyphHeight).toBe(12 / 128); expect(value.runs[3]!.glyphHeight).toBe(12 / 256);
    const f = Math.fround, x = f(Math.floor(f(329 * scale)) * f(1 / scale)), y = f(Math.floor(f(f(121.39999389648438) * scale)) * f(1 / scale));
    expect(value.runs[2]!.paintOrigin).toEqual([x, y]); expect([...value.runs[2]!.mvp]).toEqual([f(2 / f(2570 / scale)), 0, 0, 0, 0, f(-2 / f(1402 / scale)), 0, 0, 0, 0, f(-.001), 0, f(f(f(2 / f(2570 / scale)) * x) - 1), f(f(f(-2 / f(1402 / scale)) * y) + 1), 0, 1]);
  }
});

function ordered() {
  const first = { pages: ['128'], pageSizes: [128], cellHeight: 12, lineHeight: 10, glyphs: { A: { page: 0, x: 8, y: 36, width: 8, height: 12, advance: 6, offsetY: -3 } } };
  const second = { pages: ['256'], pageSizes: [256], cellHeight: 16, lineHeight: 20, glyphs: { A: { page: 0, x: 16, y: 32, width: 16, height: 16, advance: 18 } } };
  return { width: 64, height: 48, guiScale: 1, commands: [
    { kind: 'image', texture: pixel([16, 32, 48, 255]), rect: [0, 0, 64, 48] },
    text({ font: first, origin: [7, 9], color: [255, 0, 0, 255], shadow: { offset: [1, 1], tint: [.25, .25, .25, 1] } }),
    { kind: 'image', texture: pixel([0, 128, 0, 255]), rect: [10, 5, 10, 12] },
    text({ font: second, pages: [[0, solidPage(256)]], origin: [16, 12], fontScale: .5, color: [128, 128, 255, 255], tint: [.5, 1, 1, 1], shadow: { offset: [1, 1], tint: [.25, .25, .25, 1] } }),
  ] };
}
function orderedExpected(clip?: number[]) { const data = field(64, 48); for (const [box, color] of [
  [[0, 0, 64, 48], [16, 32, 48, 255]], [[8, 7, 8, 12], [64, 0, 0, 255]], [[7, 6, 8, 12], [255, 0, 0, 255]], [[10, 5, 10, 12], [0, 128, 0, 255]], [[17, 13, 8, 8], [32, 32, 64, 255]], [[16, 12, 8, 8], [64, 128, 255, 255]],
] as [number[], number[]][]) rect(data, 64, box, color, clip); return data; }

test('ordered IMAGE TEXT IMAGE TEXT uses complete 128/256 cells and independent opaque tint/shadow pixels', async ({ page }, info) => {
  await open(page); const options = ordered(), expected = orderedExpected(), value = await render(page, options);
  await prove(info, 'lowlevel-ordered-full-field', value.data, expected, { renderer: value.renderer }); equal(value.live, expected, 'lowlevel actual default framebuffer');
  await mount(page, { ...options, label: 'Ordered source layer' }); const live = await raw(page); await prove(info, 'react-ordered-full-field', live.data, expected, { renderer: live.renderer });
  expect(live.attributes.premultipliedAlpha).toBe(true); expect(live.attributes.antialias).toBe(false); expect(live.error).toBe(0);
});

test('layer and command scissors intersect, and physical crop keeps the complete original projection', async ({ page }) => {
  await open(page); const options = { ...ordered(), scissor: [5, 4, 22, 24] }, expected = orderedExpected(options.scissor), full = await render(page, options);
  equal(full.data, expected); const cropped = await render(page, { ...options, outputRect: [9, 6, 20, 18] }); const crop = field(20, 18);
  for (let y = 0; y < 18; y++) crop.set(expected.subarray(((y + 6) * 64 + 9) * 4, ((y + 6) * 64 + 29) * 4), y * 20 * 4);
  equal(cropped.data, crop); expect(cropped.layout.mvp).toEqual(full.layout.mvp); expect(cropped.layout.commands[1].layout.runs[0].mvp).toEqual(full.layout.commands[1].layout.runs[0].mvp);
  await mount(page, { ...options, outputRect: [9, 6, 20, 18] }); equal((await raw(page)).data, crop);
  const local = await render(page, { width: 24, height: 20, guiScale: 1, scissor: [4, 3, 12, 10], commands: [text({ origin: [2, 2], scissor: [6, 1, 10, 8] })] }); const localExpected = field(24, 20); rect(localExpected, 24, [2, 2, 8, 8], [255, 255, 255, 255], [6, 3, 10, 6]); equal(local.data, localExpected);
});

test('blank full-cell periods draw no invented ink while advance-only spaces retain their pen width', async ({ page }) => {
  await open(page); const image = new PNG({ width: 128, height: 128 }); rect(image.data, 128, [0, 0, 8, 8], [255, 255, 255, 255]);
  const font: GuiTextFont = { ...font8(), glyphs: { ...font8().glyphs, '.': { page: 0, x: 8, y: 0, width: 8, height: 8, advance: 1 }, B: { page: 0, x: 0, y: 0, width: 8, height: 8, advance: 6 }, ' ': { page: 0, x: 0, y: 0, width: 0, height: 0, advance: 4 } } };
  const options = { width: 32, height: 16, guiScale: 1, commands: [text({ text: 'A... B', font, pages: [[0, texture(image)]], origin: [2, 3] })] };
  const value = await render(page, options), expected = field(32, 16); rect(expected, 32, [2, 3, 8, 8], [255, 255, 255, 255]); rect(expected, 32, [15, 3, 8, 8], [255, 255, 255, 255]); equal(value.data, expected);
  expect(value.layout.commands[0].layout.runs[0].vertices).toHaveLength(20); expect(value.layout.commands[0].layout.logicalWidth).toBe(19);
});

test('empty, newline and advance-only source text avoid unused page IO and preserve logical dimensions', async ({ page }) => {
  const requests: string[] = []; page.on('request', r => { if (r.url().includes('unused-128')) requests.push(r.url()); }); await open(page);
  const font: GuiTextFont = { ...font8(), glyphs: { ' ': { page: 0, x: 0, y: 0, width: 0, height: 0, advance: 4 } } };
  for (const [content, w, h] of [['', 0, 0], ['\n', 0, 20], ['  \n ', 8, 20]] as const) {
    const layout = layoutGuiText({ width: 16, height: 16, guiScale: 1, text: content, font, origin: [0, 0], fontScale: 1, sampling: 'point', shader: 'bitmap' }); expect(layout.runs).toEqual([]); expect([layout.logicalWidth, layout.logicalHeight]).toEqual([w, h]);
    await mount(page, { width: 16, height: 16, guiScale: 1, commands: [text({ text: content, font, pages: undefined })] }); equal((await raw(page)).data, field(16, 16));
  }
  expect(requests).toEqual([]);
});

test('invalid frames, source cells, metrics, missing glyphs and aggregate geometry reject before GPU substitution', async ({ page }) => {
  const base: GuiTextLayoutOptions = { width: 16, height: 16, guiScale: 1, text: 'A', font: font8(), origin: [0, 0], fontScale: 1, sampling: 'point', shader: 'bitmap' };
  const bad = [{ width: 0 }, { guiScale: 0 }, { fontScale: NaN }, { origin: [Infinity, 0] }, { text: '?' }, { color: [256, 0, 0, 255] }, { text: 'A'.repeat(4097) }, { outputRect: [0, 0, 0, 1] }, { font: { ...font8(), pageSizes: [64] } }, { font: { ...font8(), glyphs: { A: { ...font8().glyphs.A, width: 7 } } } }, { font: { ...font8(), glyphs: { A: { ...font8().glyphs.A, height: 0 } } } }, { font: { ...font8(), glyphs: { A: { ...font8().glyphs.A, advance: Infinity } } } }];
  for (const change of bad) expect(() => layoutGuiText({ ...base, ...change } as any)).toThrow();
  await open(page); const outcomes = await page.evaluate(() => {
    const q = window.guiLayerQA, f = { pages: ['p'], pageSizes: [128], cellHeight: 8, lineHeight: 10, glyphs: { A: { page: 0, x: 0, y: 0, width: 8, height: 8, advance: 6 } } }, tex = { width: 128, height: 128, rgba: Array(128 * 128 * 4).fill(255) }, t = { kind: 'text', text: 'A', font: f, pages: [[0, tex]], origin: [0, 0], fontScale: 1, sampling: 'point', shader: 'bitmap' }, frame = { width: 16, height: 16, guiScale: 1 };
    return [{ ...frame, commands: [{ ...t, pages: [] }] }, { ...frame, commands: [{ ...t, scissor: [0, 0, 17, 1] }] }, { ...frame, commands: Array(4097).fill(t) }, { ...frame, commands: Array(17).fill({ ...t, text: 'A'.repeat(4096) }) }].map(o => { try { q.render(o); return false; } catch { return true; } });
  }); expect(outcomes).toEqual([true, true, true, true]);
});

test('combined URL and declared-page preflight rejects impossible resources with zero fetch/decode', async ({ page }) => {
  await page.addInitScript(() => { const original = window.fetch; (window as any).qaFetch = 0; window.fetch = ((...args: any[]) => { (window as any).qaFetch++; return (original as any)(...args); }) as any; }); await open(page);
  const before = await page.evaluate(() => (window as any).qaFetch);
  await mount(page, { width: 8, height: 8, guiScale: 1, commands: Array.from({ length: 257 }, (_, i) => ({ kind: 'image', texture: '/unreachable/' + i + '.png', rect: [0, 0, 1, 1] })) });
  expect(await page.evaluate(() => window.guiLayerQA.events.some((s: string) => /budget/.test(s)))).toBe(true); expect(await page.evaluate(() => (window as any).qaFetch)).toBe(before); expect(await page.locator('canvas').getAttribute('width')).toBe('0');
  await page.evaluate(() => window.guiLayerQA.events.length = 0);
  await mount(page, { width: 8, height: 8, guiScale: 1, commands: [text({ font: { ...font8(), pages: ['/same-source.png', '/same-source.png'], pageSizes: [128, 256], glyphs: { ...font8().glyphs, B: { page: 1, x: 0, y: 0, width: 16, height: 8, advance: 8 } } }, text: 'AB', pages: undefined })] });
  expect(await page.evaluate(() => (window as any).qaFetch)).toBe(before); expect(await page.locator('canvas').getAttribute('data-render-state')).toBe('error');
});

async function instrument(page: Page) {
  await page.addInitScript(() => {
    const oldContext = HTMLCanvasElement.prototype.getContext, oldFetch = window.fetch, oldDecode = window.createImageBitmap;
    (window as any).calls = { contexts: 0, twoD: 0, fetch: 0, decode: 0, closed: 0, options: [] };
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...a: any[]) { if (a[0] === '2d') (window as any).calls.twoD++; const v = oldContext.apply(this, a as any); if (a[0] === 'webgl' && v && !(this as any).__seen) { (this as any).__seen = true; (window as any).calls.contexts++; } return v; } as any;
    window.fetch = ((...a: any[]) => { if (String(a[0]).includes('qa-font')) (window as any).calls.fetch++; return (oldFetch as any)(...a); }) as any;
    window.createImageBitmap = (async (...a: any[]) => { (window as any).calls.decode++; (window as any).calls.options.push(a[1]); const result = await (oldDecode as any)(...a), close = result.close.bind(result); result.close = () => { (window as any).calls.closed++; close(); }; return result; }) as any;
  });
}

test('URL pages share straight ImageBitmap uploads with images, without any Canvas2D alpha roundtrip', async ({ page }, info) => {
  await instrument(page); const png = new PNG({ width: 128, height: 128 }); rect(png.data, 128, [0, 0, 128, 128], [255, 64, 128, 128]);
  await page.route('**/qa-font.png', r => r.fulfill({ contentType: 'image/png', body: PNG.sync.write(png) })); await open(page);
  const options = { width: 24, height: 12, guiScale: 1, commands: [{ kind: 'image', texture: '/qa-font.png', rect: [1, 2, 8, 8] }, text({ font: { ...font8(), pages: ['/qa-font.png', '/unused-font.png'], pageSizes: [128, 256] }, pages: undefined, origin: [12, 2] })] };
  await mount(page, options); const expected = field(24, 12); rect(expected, 24, [1, 2, 8, 8], [128, 32, 64, 128]); rect(expected, 24, [12, 2, 8, 8], [128, 32, 64, 128]); await prove(info, 'URL-straight-source-PMA', (await raw(page)).data, expected);
  const calls = await page.evaluate(() => (window as any).calls); expect(calls.fetch).toBe(1); expect(calls.decode).toBe(1); expect(calls.twoD).toBe(0); expect(calls.options).toEqual([{ premultiplyAlpha: 'none', colorSpaceConversion: 'none', imageOrientation: 'none' }]);
  // Actual DOM composition is separate from raw framebuffer equality.
  for (const bg of ['#000000', '#ffffff', '#204060']) {
    await page.evaluate(v => document.body.style.background = v, bg); const image = PNG.sync.read(await page.locator('canvas').screenshot({ omitBackground: false })); const expectedRGB = bg === '#000000' ? [128, 32, 64, 255] : bg === '#ffffff' ? [255, 159, 191, 255] : [144, 64, 112, 255];
    const backing = bg === '#000000' ? [0, 0, 0, 255] : bg === '#ffffff' ? [255, 255, 255, 255] : [32, 64, 96, 255], composed = field(24, 12); rect(composed, 24, [0, 0, 24, 12], backing); rect(composed, 24, [1, 2, 8, 8], expectedRGB); rect(composed, 24, [12, 2, 8, 8], expectedRGB);
    await prove(info, 'actual-DOM-compositor-' + bg.slice(1), image.data, composed, { width: 24, height: 12, noSourceImageCanvas2DRoundtrip: true });
  }
});

test('equivalent props and unused metrics retain canvas while used metrics and mutable pixels repaint snapshots', async ({ page }) => {
  await open(page); const options = { width: 24, height: 16, guiScale: 1, commands: [text()] }; await mount(page, options);
  await page.evaluate(() => { const q = window.guiLayerQA; q.saved = q.ref; q.props.commands[0].font.glyphs.Z = { page: 0, x: 8, y: 0, width: 8, height: 8, advance: 123 }; q.paint(); });
  await expect.poll(() => page.evaluate(() => window.guiLayerQA.ref === window.guiLayerQA.saved)).toBe(true); expect(await page.evaluate(() => window.guiLayerQA.events.filter((s: string) => s === 'ready').length)).toBe(1);
  await page.evaluate(() => { const q = window.guiLayerQA; q.props.commands[0].font.glyphs.A.advance = 7; q.paint(); }); await page.waitForFunction(() => window.guiLayerQA.serial === 2); expect(await page.evaluate(() => window.guiLayerQA.ref === window.guiLayerQA.saved)).toBe(false);
  await page.evaluate(() => { const q = window.guiLayerQA; q.saved = q.ref; q.props.commands[0].pages.get(0).data.fill(0); q.paint(); }); await page.waitForFunction(() => window.guiLayerQA.serial === 3); equal((await raw(page)).data, field(24, 16)); expect(await page.evaluate(() => window.guiLayerQA.ref === window.guiLayerQA.saved)).toBe(false);
  // Capture the first actual GPU read to verify that an in-flight request owns
  // its snapshot. Mutating React props in place is outside React's immutability
  // contract: an internal state render can also observe those mutations, so we
  // deliberately do not promise that the final ready node ignores changed props.
  const image = new PNG({ width: 128, height: 128 }); image.data.fill(255); await page.route('**/qa-font-snapshot.png', r => r.fulfill({ contentType: 'image/png', body: PNG.sync.write(image) }));
  await page.evaluate(() => {
    const decode = window.createImageBitmap; (window as any).savedDecode = decode; window.createImageBitmap = (async (...args: any[]) => { const bitmap = await (decode as any)(...args); return await new Promise(resolve => { (window as any).finishSnapshot = () => resolve(bitmap); }); }) as any;
    const read = WebGLRenderingContext.prototype.readPixels; (window as any).snapshotReads = [];
    WebGLRenderingContext.prototype.readPixels = function (this: WebGLRenderingContext, ...a: any[]) { (read as any).apply(this, a); if (a[2] === 24 && a[3] === 16 && a[6] instanceof Uint8Array && this.getParameter(this.FRAMEBUFFER_BINDING)) (window as any).snapshotReads.push([...a[6]]); } as any;
  });
  await page.evaluate(o => window.guiLayerQA.mount(o), { width: 24, height: 16, guiScale: 1, commands: [text({ origin: [2, 3], font: { ...font8(), pages: ['/qa-font-snapshot.png'] }, pages: undefined })] }); await page.waitForFunction(() => !!(window as any).finishSnapshot);
  await page.evaluate(() => { const q = window.guiLayerQA; q.props.width = 32; q.props.commands[0].origin[0] = 12; q.props.commands[0].font.glyphs.A.offsetX = 4; window.createImageBitmap = (window as any).savedDecode; (window as any).finishSnapshot(); });
  await page.waitForFunction(() => window.guiLayerQA.serial === 4); const snapshot = field(24, 16); rect(snapshot, 24, [2, 3, 8, 8], [255, 255, 255, 255]); const firstBottom = new Uint8Array(await page.evaluate(() => (window as any).snapshotReads[0])), firstTop = field(24, 16); for (let y = 0; y < 16; y++) firstTop.set(firstBottom.subarray((15 - y) * 96, (16 - y) * 96), y * 96); equal(firstTop, snapshot, 'first real GPU request retains its prepared snapshot');
  await page.evaluate(() => window.guiLayerQA.paint()); await page.waitForFunction(() => window.guiLayerQA.serial === 5); const updated = field(32, 16); rect(updated, 32, [16, 3, 8, 8], [255, 255, 255, 255]); equal((await raw(page)).data, updated);
});

test('StrictMode owns one decode/context, forwards ref/ARIA/focus/blur, and releases on unmount', async ({ page }) => {
  await instrument(page); const png = new PNG({ width: 128, height: 128 }); png.data.fill(255); await page.route('**/qa-font-strict.png', r => r.fulfill({ contentType: 'image/png', body: PNG.sync.write(png) })); await open(page);
  await mount(page, { width: 24, height: 16, guiScale: 1, label: 'Accessible source layer', tabIndex: 0, commands: [text({ font: { ...font8(), pages: ['/qa-font-strict.png'] }, pages: undefined })] }, true);
  const canvas = page.getByRole('img', { name: 'Accessible source layer' }); await canvas.focus(); await canvas.evaluate(e => (e as HTMLElement).blur()); const result = await page.evaluate(() => ({ calls: (window as any).calls, events: window.guiLayerQA.events, same: window.guiLayerQA.ref === document.querySelector('canvas') }));
  expect(result.calls.fetch).toBe(1); expect(result.calls.decode).toBe(1); expect(result.calls.contexts).toBe(1); expect(result.calls.twoD).toBe(0); expect(result.events.filter((s: string) => s === 'ready')).toHaveLength(1); expect(result.events).toEqual(expect.arrayContaining(['focus', 'blur'])); expect(result.same).toBe(true);
  await page.evaluate(() => { window.guiLayerQA.saved = window.guiLayerQA.ref; window.guiLayerQA.unmount(); }); await expect(canvas).toHaveCount(0); await expect.poll(() => page.evaluate(() => window.guiLayerQA.saved.getContext('webgl').isContextLost())).toBe(true);
});

test('cancelled pending decode closes its late bitmap once and never publishes stale ready', async ({ page }) => {
  await instrument(page); await page.addInitScript(() => {
    const old = window.createImageBitmap; (window as any).pendingDecode = undefined;
    window.createImageBitmap = (async (...args: any[]) => { const bitmap = await (old as any)(...args); (window as any).pendingDecode = () => bitmap; return await new Promise(resolve => { (window as any).resolveDecode = () => resolve(bitmap); }); }) as any;
  }); const png = new PNG({ width: 128, height: 128 }); png.data.fill(255); await page.route('**/qa-font-late.png', r => r.fulfill({ contentType: 'image/png', body: PNG.sync.write(png) })); await open(page);
  await page.evaluate(o => window.guiLayerQA.mount(o), { width: 16, height: 16, guiScale: 1, commands: [text({ font: { ...font8(), pages: ['/qa-font-late.png'] }, pages: undefined })] }); await page.waitForFunction(() => !!(window as any).pendingDecode);
  await page.evaluate(() => window.guiLayerQA.unmount()); await expect(page.locator('canvas')).toHaveCount(0); await page.evaluate(() => (window as any).resolveDecode()); await expect.poll(() => page.evaluate(() => (window as any).calls.closed)).toBe(1);
  expect(await page.evaluate(() => window.guiLayerQA.events)).toEqual([]); expect(await page.evaluate(() => (window as any).calls.contexts)).toBe(0);
});

test('actual context loss clears output and reports failure; explicit renderKey retries with a fresh exclusive canvas', async ({ page }) => {
  await open(page); const options = { width: 24, height: 16, guiScale: 1, commands: [text()] }; await mount(page, options);
  await page.evaluate(() => { const q = window.guiLayerQA; q.saved = q.ref; q.saved.getContext('webgl').getExtension('WEBGL_lose_context').loseContext(); }); await expect(page.locator('canvas')).toHaveAttribute('data-render-state', 'error'); await expect(page.locator('canvas')).toHaveAttribute('width', '0'); expect(await page.evaluate(() => window.guiLayerQA.events.some((s: string) => s.startsWith('error:')))).toBe(true);
  await page.evaluate(() => { window.guiLayerQA.events.length = 0; }); await mount(page, { ...options, renderKey: 'explicit-retry' }); expect(await page.evaluate(() => window.guiLayerQA.ref === window.guiLayerQA.saved)).toBe(false); const expected = field(24, 16); rect(expected, 24, [0, 0, 8, 8], [255, 255, 255, 255]); equal((await raw(page)).data, expected);
});

// Optional original-private native evidence. Public source ZIP remains mandatory;
// missing native target/fonts is an explicit skip, never manufactured expected pixels.
// Both scales were known during model development: not a blind holdout and not
// unique recovery of native CPU metrics/order. Conditional stages != wholeGUI.
const FONT_PINS: Record<string, string> = {
  '.cache/enchanting-source/font/ascii_sga.png': '624678abe1122a56f343812782f1d6542c2414ad7e94360cbf8f1d50c1415c8a',
  '.cache/local-fonts/workstation/default8.png': 'daf219bcd3a050c33f0f8883e12d75acc818cee918f400f5afcd7ac386b2f904',
  '.cache/local-fonts/workstation/default8.json': '1326598897eebc60e5c6835f1fdf700c175f5d2628bb4ed6a9bba959d3695793',
  '.cache/enchanting-source/font/glyph_53.png': '59112f80c14d19b442af95c1a9169452f2a1230a28fe4ca5b8cce3a169a623fc',
  '.cache/enchanting-source/font/glyph_54.png': '3c6f13d3e4912b306711ecd5d2252f6776a4b7e3379a34afe10bd5b322ed8f8c',
  '.cache/enchanting-source/font/glyph_68.png': 'dd0d5e7e870632cc9d56e24413fa4cced62011b8647e72040e8f2c3b7544ce52',
  '.cache/enchanting-source/font/glyph_72.png': 'eec05fada49ae84c463765cfa787040ce9cd0960b699ba596ffa43c873bbb979',
  '.cache/enchanting-source/font/glyph_96.png': '1cb65ddba8c65ffa4db3c4660e501429b79bd87588c2da350a8ddab31aaa3e27',
  '.cache/enchanting-source/font/glyph_9B.png': 'ffedd03c478783ba5c37eddc18a326e45cef2305e0aea58c853dab7f052f92ca',
};
const F = Math.fround, add = (a: number, b: number) => F(F(a) + F(b)), sub = (a: number, b: number) => F(F(a) - F(b)), mul = (a: number, b: number) => F(F(a) * F(b)), div = (a: number, b: number) => F(F(a) / F(b));
function expression(value: number | string, parent: number) { if (typeof value === 'number') return F(value); const m = /^(\d+(?:\.\d+)?)%\s*(?:([+-])\s*(\d+(?:\.\d+)?)px)?$/.exec(value); if (!m) throw Error('Unrecognized original size ' + value); const p = mul(parent, div(Number(m[1]), 100)); return m[2] === '+' ? add(p, Number(m[3])) : m[2] === '-' ? sub(p, Number(m[3])) : p; }
function anchor(parent: number[], size: number[], name: string, offset = [0, 0]) { const factor: Record<string, number[]> = { center: [.5, .5], top_left: [0, 0], bottom_left: [0, 1], bottom_right: [1, 1], right_middle: [1, .5], left_middle: [0, .5] }, f = factor[name]; if (!f) throw Error('Unrecognized original anchor ' + name); return [add(sub(add(parent[0]!, mul(parent[2]!, f[0]!)), mul(size[0]!, f[0]!)), offset[0]!), add(sub(add(parent[1]!, mul(parent[3]!, f[1]!)), mul(size[1]!, f[1]!)), offset[1]!), ...size]; }
async function sourceScene(scale: number, phase: 'labels' | 'runesAndCosts') {
  const read = await zip(), common = jsonc(read('resource_pack/ui/ui_common.json')), ench = jsonc(read('resource_pack/ui/enchanting_screen.json')), vars = jsonc(read('resource_pack/ui/_global_variables.json'));
  expect(common.root_panel.size).toEqual([176, 166]); const stage = [Math.ceil(2570 / scale), Math.ceil(1402 / scale)], root = anchor([0, 0, ...stage], common.root_panel.size, common.root_panel.anchor_to), topDef = ench.enchanting_panel_top_half, top = anchor(root, topDef.size.map((v: any, i: number) => expression(v, root[i + 2]!)), topDef.anchor_to, topDef.offset);
  const gridDef = topDef.controls.find((x: any) => x.grid_panel).grid_panel, grid = anchor(top, gridDef.size.map((v: any, i: number) => expression(v, top[i + 2]!)), gridDef.anchor_to, gridDef.offset), rowHeight = expression(ench.enchant_button_panel.size[1], grid[3]!), stride = div(grid[3]!, 3);
  const color = (key: string) => [...vars[key].map((n: number) => Math.floor(mul(n, 255))), 255];
  const pageCache = new Map<string, PNG>(); async function originalFont(path: string) { let p = pageCache.get(path); if (!p) { const bytes = await readFile(path); expect(sha(bytes), path).toBe(FONT_PINS[path]); p = PNG.sync.read(bytes); pageCache.set(path, p); } return p; }
  const commands: any[] = [];
  if (phase === 'labels') {
    // Four prefix image formulas independently evaluated from original UI sizes,
    // not decoded captured vertices. Their raw metadata comes from the same ZIP.
    const images = [
      { name: 'screen_background', rect: [0, 0, ...stage], tint: [1, 1, 1, .4] },
      { name: 'dialog_background_opaque', rect: root },
      { name: 'close_button_default_compact', rect: [root[0]! + 156, root[1]! + 5, 15, 7] },
      // Image declaration stays in source logical precision until the public
      // image builder quantizes it. Applying the font-origin F32 candidate
      // prematurely here is NOT justified by the matching font CBVs: in GUI5
      // it moves the top/bottom border by a physical pixel. The retained first
      // failed batch falsifies that wider candidate, without relaxing RGBA.
      { name: 'cell_image', rect: (() => {
        const size = (s: number | string, parent: number) => typeof s === 'number' ? s : (() => { const m = /^(\d+(?:\.\d+)?)%\s*(?:([+-])\s*(\d+(?:\.\d+)?)px)?$/.exec(s)!; return parent * Number(m[1]) / 100 + (m[2] === '+' ? Number(m[3]) : m[2] === '-' ? -Number(m[3]) : 0); })();
        const tw = size(topDef.size[0], root[2]!), th = size(topDef.size[1], root[3]!), gw = size(gridDef.size[0], tw), gh = size(gridDef.size[1], th);
        return [root[0]! + tw - gw + gridDef.offset[0] - 1, root[1]! + topDef.offset[1] + th / 2 - gh / 2 + gridDef.offset[1] - 1, gw + 2, gh + 2];
      })() },
    ];
    for (const image of images) { const png = PNG.sync.read(read('resource_pack/textures/ui/' + image.name + '.png')); let metadata: any; try { metadata = jsonc(read('resource_pack/textures/ui/' + image.name + '.json')); } catch { metadata = undefined; }
      commands.push({ kind: 'image', texture: texture(png), rect: image.rect, tint: image.tint, ...(metadata && metadata.nineslice_size !== undefined ? { nineSlice: { insets: metadata.nineslice_size, baseSize: metadata.base_size } } : {}) }); }
    const pages = ['53', '54', '68', '72', '96', '9B'], glyphs: Record<string, any> = {}, textures: any[] = [];
    for (let i = 0; i < pages.length; i++) textures.push([i, texture(await originalFont('.cache/enchanting-source/font/glyph_' + pages[i] + '.png'))]);
    for (const ch of '附魔台物品栏') { const cp = ch.codePointAt(0)!; glyphs[ch] = { page: pages.indexOf((cp >>> 8).toString(16).toUpperCase()), x: cp % 16 * 16, y: (cp >>> 4) % 16 * 16, width: 16, height: 16, advance: 18 }; }
    const font = { pages: pages.map(p => 'original-glyph-' + p), pageSizes: pages.map(() => 256), cellHeight: 16, lineHeight: 20, glyphs }, titleDef = ench.enchanting_label, title = anchor(top, [0, 0], titleDef.anchor_to, titleDef.offset); title[1] = add(title[1]!, 1);
    const invDef = common['inventory_panel_bottom_half_with_label@inventory_panel_bottom_half'], inv = anchor(root, invDef.size.map((v: any, i: number) => expression(v, root[i + 2]!)), invDef.anchor_to), label = invDef.controls.find((v: any) => v['inventory_label@section_heading_label'])['inventory_label@section_heading_label'], origin = anchor(inv, [0, 0], label.anchor_to, label.offset); origin[1] = add(origin[1]!, 1);
    for (const [content, position] of [['附魔台', title], ['物品栏', origin]] as const) commands.push({ kind: 'text', text: content, font, pages: textures, origin: position.slice(0, 2), fontScale: .5, color: color(titleDef.color), sampling: scale === 4 ? 'point' : 'bilinear', shader: scale === 4 ? 'bitmap' : 'bitmap-smooth' });
  } else {
    const runeImage = await originalFont('.cache/enchanting-source/font/ascii_sga.png'), costImage = await originalFont('.cache/local-fonts/workstation/default8.png'), metaBytes = await readFile('.cache/local-fonts/workstation/default8.json'); expect(sha(metaBytes)).toBe(FONT_PINS['.cache/local-fonts/workstation/default8.json']); const meta = jsonc(metaBytes); expect(meta).toMatchObject({ ascii_character_height: 12, ascii_character_y_offset: -3 });
    function asciiFont(image: PNG, strings: string[], cellHeight: number, offsetY: number) { const glyphs: Record<string, any> = {}; for (const ch of strings.join('')) { if (ch === ' ') { glyphs[ch] = { page: 0, x: 0, y: 0, width: 0, height: 0, advance: 4 }; continue; } const cp = ch.codePointAt(0)!, x = cp % 16 * 8, y = Math.floor(cp / 16) * cellHeight; let right = 0; for (let yy = y; yy < y + cellHeight; yy++) for (let xx = x; xx < x + 8; xx++) if (image.data[(yy * image.width + xx) * 4 + 3]) right = Math.max(right, xx - x + 1); glyphs[ch] = { page: 0, x, y, width: 8, height: cellHeight, advance: right + 1, offsetY }; } return { pages: ['original-ascii'], pageSizes: [128], cellHeight, lineHeight: 10, glyphs }; }
    const runes = ['mental snuff...', 'wet hot wet...', 'earth towards...'], costs = ['1', '2', '2'], runeFont = asciiFont(runeImage, runes, 8, 0), costFont = asciiFont(costImage, costs, meta.ascii_character_height, meta.ascii_character_y_offset);
    expect(runeFont.glyphs['.'].advance).toBe(1); expect(costFont.glyphs['1'].advance).toBe(6); expect(costFont.glyphs['2'].advance).toBe(6);
    const runeDef = ench.enchant_runes, costDef = ench.enchant_cost;
    for (let row = 0; row < 3; row++) { const parent = [grid[0]!, add(grid[1]!, mul(row, stride)), grid[2]!, rowHeight], rp = anchor(parent, runeDef.size, runeDef.anchor_to, runeDef.offset); rp[1] = add(rp[1]!, 1); const cp = anchor(parent, [6, 10], costDef.anchor_to, costDef.offset); cp[1] = add(cp[1]!, 1);
      commands.push({ kind: 'text', text: runes[row], font: runeFont, pages: [[0, texture(runeImage)]], origin: rp.slice(0, 2), fontScale: 1, color: color(ench['fail_runes@enchanting.enchant_runes'].color), sampling: 'point', shader: 'bitmap' });
      commands.push({ kind: 'text', text: costs[row], font: costFont, pages: [[0, texture(costImage)]], origin: cp.slice(0, 2), fontScale: 1, color: color(costDef.color), sampling: 'point', shader: 'bitmap', shadow: { offset: [1, 1], tint: [.25, .25, .25, 1] } });
    }
  }
  return { width: 2570, height: 1402, guiScale: scale, commands };
}

async function nativeAttributeProof(layout: any, options: any, scale: number, phase: string) {
  const folder = scale === 5 ? '.cache/open-clean-full-gui' : '.cache/gui4-holdout-full-gui', ledger = JSON.parse((await readFile(folder + '/ui-draws.json')).toString('utf8'));
  const runs: { run: any; command: any }[] = [];
  layout.commands.forEach((entry: any, i: number) => { if (entry.kind === 'text') for (const run of entry.layout.runs) runs.push({ run, command: options.commands[i] }); });
  const ids = phase === 'labels' ? [48, 49, 50, 51, 52, 53] : [76, 77, 78, 79, 80, 81, 82, 83, 84]; expect(runs).toHaveLength(ids.length);
  const fbytes = (values: number[]) => { const b = Buffer.alloc(values.length * 4); values.forEach((v, i) => b.writeFloatLE(v, i * 4)); return b; };
  const half = (n: number) => { if (!n) return Object.is(n, -0) ? 32768 : 0; const a = Math.abs(n), e = Math.floor(Math.log2(a)), m = (a / 2 ** e - 1) * 1024; if (!Number.isInteger(m) || e < -14 || e > 15) throw Error('This observed exact half-coordinate does not support an inferred rounding oracle'); return (n < 0 ? 32768 : 0) | ((e + 15) << 10) | m; };
  let vbBytes = 0, cbvBytes = 0;
  for (let i = 0; i < runs.length; i++) {
    const { run, command } = runs[i]!, id = ids[i]!, observed = ledger.find((v: any) => v.globalId === id), b0 = await readFile(folder + '/global-' + id + '-b0-1024.bin'), b1 = await readFile(folder + '/global-' + id + '-b1-1024.bin');
    const vb = Buffer.concat(run.vertices.map((v: any) => { const b = Buffer.alloc(16); [...v.position, 1].forEach((x: number, j: number) => b.writeUInt16LE(half(x), j * 2)); b.writeUInt16LE(v.uvRaw[0], 8); b.writeUInt16LE(v.uvRaw[1], 10); v.rgba.forEach((x: number, j: number) => { b[12 + j] = x; }); return b; }));
    equal(vb, Buffer.concat(observed.vertices.map((v: any) => Buffer.from(v.packedHex, 'hex'))), 'source-builder complete packed VB at G' + id);
    equal(fbytes([...run.mvp, ...Array(4).fill(run.glyphHeight), ...Array(4).fill(run.halfTexelOffset)]), b0.subarray(0, 96), 'source-builder complete usedVS96 at G' + id);
    equal(fbytes([1, 1, 1, 1, ...run.tint]), b1.subarray(0, 32), 'source-builder complete usedPS32 at G' + id); expect(run.indices).toEqual(observed.indices);
    const atlas = command.pages.find(([p]: any) => p === run.page)[1]; expect(sha(Buffer.from(atlas.rgba, 'base64'))).toBe(observed.texture.rawRGBAsha256); vbBytes += vb.length; cbvBytes += 128;
  }
  return { draws: runs.length, vbBytes, usedCbvBytes: cbvBytes, exactBytes: true, actualBuffersOnlyUsedAsComparisonOracle: true };
}

for (const scale of [4, 5]) for (const phase of ['labels', 'runesAndCosts'] as const) test(`optional native GUI${scale} ${phase}: source-input public builder and actual React full target, conditional profile only`, async ({ page }, info) => {
  test.setTimeout(120000); await zip(); const manifestPath = '.cache/gui-text-oracles-01/manifest.json';
  test.skip(!existsSync(manifestPath) || Object.keys(FONT_PINS).some(p => !existsSync(p)), 'Original private readbacks/fonts are unavailable; public source tests still run.');
  const bytes = await readFile(manifestPath); expect(sha(bytes)).toBe('f60705c2f5a45141ad56ad7ffc2ca6e74de772a58e237b0314169ceb6a53781c');
  const stage = JSON.parse(bytes.toString('utf8')).stages.find((s: any) => s.guiScale === scale)[phase];
  test.skip(!existsSync(stage.nativeAfter.PNG.path) || (phase === 'runesAndCosts' && !existsSync(stage.nativeBefore.PNG.path)), 'Private full-frame conditional-stage target is unavailable.');
  const pngBytes = await readFile(stage.nativeAfter.PNG.path); expect(sha(pngBytes)).toBe(stage.nativeAfter.PNG.sha256); const expected = PNG.sync.read(pngBytes); expect([expected.width, expected.height]).toEqual([2570, 1402]); expect(sha(expected.data)).toBe(stage.nativeAfter.RGBAsha256);
  const options: any = await sourceScene(scale, phase);
  if (phase === 'runesAndCosts') { const beforeBytes = await readFile(stage.nativeBefore.PNG.path); expect(sha(beforeBytes)).toBe(stage.nativeBefore.PNG.sha256); const before = PNG.sync.read(beforeBytes); expect(sha(before.data)).toBe(stage.nativeBefore.RGBAsha256); options.background = { kind: 'texture', texture: texture(before), encoding: 'framebuffer' }; }
  await open(page); const value = await render(page, options), attributes = await nativeAttributeProof(value.layout, options, scale, phase), scope = { guiScale: scale, phase, fromClear: phase === 'labels', nativeBackgroundOnlyForConditionalTransition: phase === 'runesAndCosts', capturedMvpOrVerticesAsInput: false, knownScalesNotBlindHoldout: true, wholeGuiCertification: false, sourceBuilderAttributes: attributes, renderer: value.renderer, originalZIP: ARCHIVE_SHA, nativeManifestSHA: sha(bytes), nativePNG: stage.nativeAfter.PNG };
  await prove(info, `native-GUI${scale}-${phase}-public-source-FBO`, value.data, expected.data, scope); equal(value.live, expected.data, 'actual lowlevel GPU presentation default framebuffer');
  await mount(page, { ...options, label: 'Conditional source-native phase' }); const actualReact = await raw(page); await prove(info, `native-GUI${scale}-${phase}-actual-React-defaultFB`, actualReact.data, expected.data, { ...scope, renderer: actualReact.renderer });
  expect(actualReact.error).toBe(0); expect(actualReact.attributes.premultipliedAlpha).toBe(true); expect(actualReact.attributes.antialias).toBe(false);
});
