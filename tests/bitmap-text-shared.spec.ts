import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BitmapText } from '../src/bitmap-text';
import { gpuAlphaFont, gpuProbeAlpha } from '../demo/bitmap-text-webgl-fixture';

test.use({ deviceScaleFactor: 1 });
const url = '/demo/bitmap-text-shared-fixture.html';
const texts = '.shared-item > .mc-bitmap-text';
type Rgba = readonly [number, number, number, number];
interface ProbeSnapshot {
  contexts: number; active: number; htmlWebgl: number; presenters: number;
  produced: number; consumed: number; closed: number; outstanding: number; loseRequests: number; lossEvents: number;
  resources: Record<string, { created: number; deleted: number; live: number; peak: number }>;
  pageUploads: number; targetAllocations: number; readbacks: number;
  maxOffscreenPixels: number; maxPresenterPixels: number; unsafeResizeAttempts: number;
}
type ProbeWindow = typeof window & { sharedProbe: { snapshot: () => ProbeSnapshot; lose: () => void; targetSizes: () => number[][] } };
type ApiFailure = 'offscreen' | 'transfer' | 'presenter' | 'presentation-error';

async function instrument(page: Page, failure?: ApiFailure) {
  const errors: string[] = [];page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(capability => {
    const contexts: WebGLRenderingContext[] = [], presenters: HTMLCanvasElement[] = [];
    const seenGl = new WeakSet<WebGLRenderingContext>(), seenPresenter = new WeakSet<HTMLCanvasElement>(), seenExtension = new WeakSet<object>();
    const bitmaps = new WeakSet<ImageBitmap>(), outstanding = new Set<ImageBitmap>();
    let produced = 0, consumed = 0, closed = 0, htmlWebgl = 0, loseRequests = 0, lossEvents = 0;
    const resources: Record<string, { created: number; deleted: number; live: number; peak: number }> = {};
    let pageUploads = 0, targetAllocations = 0, readbacks = 0;
    let maxOffscreenPixels = 0, maxPresenterPixels = 0, unsafeResizeAttempts = 0;
    const guardDimensions = (prototype: object, offscreen: boolean) => {
      for (const key of ['width', 'height'] as const) {
        const property = Object.getOwnPropertyDescriptor(prototype, key); if (!property?.set) throw Error('Missing actual canvas size setter.');
        Object.defineProperty(prototype, key, { ...property, set(this: HTMLCanvasElement | OffscreenCanvas, value: number) {
          const pixels = key === 'width' ? value * this.height : this.width * value;
          // Prevent the regression itself from allocating an8192x8192 backing
          // store. Intended targets in the swap case are only16384pixels.
          if (pixels > 16777216) { unsafeResizeAttempts++; throw Error('Unsafe intermediate bitmap canvas resize exceeds16MP.'); }
          if (offscreen) maxOffscreenPixels = Math.max(maxOffscreenPixels, pixels);
          else if (seenPresenter.has(this as HTMLCanvasElement)) maxPresenterPixels = Math.max(maxPresenterPixels, pixels);
          property.set!.call(this, value);
        } });
      }
    };
    guardDimensions(HTMLCanvasElement.prototype, false); if (typeof OffscreenCanvas !== 'undefined') guardDimensions(OffscreenCanvas.prototype, true);
    const prototype = WebGLRenderingContext.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;
    for (const kind of ['Program', 'Shader', 'Buffer', 'Texture', 'Framebuffer']) {
      const objects = new Set<object>(), counter = { created: 0, deleted: 0, live: 0, peak: 0 }; resources[kind] = counter;
      const create = prototype[`create${kind}`]!, remove = prototype[`delete${kind}`]!;
      prototype[`create${kind}`] = function (this: WebGLRenderingContext, ...args) {
        const value = Reflect.apply(create, this, args);
        if (value && typeof value === 'object') { objects.add(value); counter.created++; counter.live = objects.size; counter.peak = Math.max(counter.peak, counter.live); }
        return value;
      };
      prototype[`delete${kind}`] = function (this: WebGLRenderingContext, ...args) {
        const value = args[0]; if (value && typeof value === 'object' && objects.delete(value)) { counter.deleted++; counter.live = objects.size; }
        return Reflect.apply(remove, this, args);
      };
    }
    const image = prototype.texImage2D!, subImage = prototype.texSubImage2D!, readPixels = prototype.readPixels!;
    prototype.texImage2D = function (this: WebGLRenderingContext, ...args) { if (args.at(-1) == null) targetAllocations++; else pageUploads++; return Reflect.apply(image, this, args); };
    prototype.texSubImage2D = function (this: WebGLRenderingContext, ...args) { pageUploads++; return Reflect.apply(subImage, this, args); };
    prototype.readPixels = function (this: WebGLRenderingContext, ...args) { readbacks++; return Reflect.apply(readPixels, this, args); };
    const htmlGet = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind, ...args) {
      const result = Reflect.apply(htmlGet, this, [kind, ...args]);
      if ((kind === 'webgl' || kind === 'webgl2') && result) htmlWebgl++;
      if (kind === 'bitmaprenderer' && result && !seenPresenter.has(this)) { seenPresenter.add(this);presenters.push(this); }
      return result;
    } as typeof htmlGet;
    if (typeof OffscreenCanvas !== 'undefined') {
      const offGet = OffscreenCanvas.prototype.getContext;
      OffscreenCanvas.prototype.getContext = function (this: OffscreenCanvas, kind, ...args) {
        const result = Reflect.apply(offGet, this, [kind, ...args]);
        if ((kind === 'webgl' || kind === 'webgl2') && result) {
          const context = result as WebGLRenderingContext;
          if (!seenGl.has(context)) {
            seenGl.add(context);contexts.push(context);
            this.addEventListener('webglcontextlost', () => { lossEvents++; });
          }
        }
        return result;
      } as typeof offGet;
      const transfer = OffscreenCanvas.prototype.transferToImageBitmap;
      if (transfer) OffscreenCanvas.prototype.transferToImageBitmap = function (this: OffscreenCanvas) {
        const bitmap = transfer.call(this);bitmaps.add(bitmap);outstanding.add(bitmap);produced++;return bitmap;
      };
    }
    const getExtension = WebGLRenderingContext.prototype.getExtension;
    WebGLRenderingContext.prototype.getExtension = function (this: WebGLRenderingContext, name: string) {
      const result = Reflect.apply(getExtension, this, [name]);
      if (name === 'WEBGL_lose_context' && result && !seenExtension.has(result)) {
        seenExtension.add(result);const lose = result.loseContext;
        result.loseContext = function (this: WEBGL_lose_context) { loseRequests++;return lose.call(this); };
      }
      return result;
    } as typeof getExtension;
    if (typeof ImageBitmapRenderingContext !== 'undefined') {
      const present = ImageBitmapRenderingContext.prototype.transferFromImageBitmap;
      ImageBitmapRenderingContext.prototype.transferFromImageBitmap = function (this: ImageBitmapRenderingContext, bitmap) {
        const result = present.call(this, bitmap);
        if (bitmap && bitmaps.has(bitmap) && bitmap.width === 0 && bitmap.height === 0) { consumed++;outstanding.delete(bitmap); }
        return result;
      };
    }
    const close = ImageBitmap.prototype.close;
    ImageBitmap.prototype.close = function (this: ImageBitmap) { if (bitmaps.has(this)) { closed++;outstanding.delete(this); }return close.call(this); };
    (window as ProbeWindow).sharedProbe = {
      snapshot: () => ({ contexts: contexts.length, active: contexts.filter(gl => !gl.isContextLost()).length, htmlWebgl,
        presenters: presenters.length, produced, consumed, closed, outstanding: outstanding.size, loseRequests, lossEvents,
        resources: Object.fromEntries(Object.entries(resources).map(([kind, counter]) => [kind, { ...counter }])), pageUploads, targetAllocations, readbacks, maxOffscreenPixels, maxPresenterPixels, unsafeResizeAttempts }),
      lose: () => { const gl = contexts.find(context => !context.isContextLost());if (!gl) throw new Error('No actual shared GL context.');gl.getExtension('WEBGL_lose_context')!.loseContext(); },
      targetSizes: () => presenters.map(canvas => [canvas.width, canvas.height]),
    };
    // Capability changes run after instrumentation in the same init script;
    // Playwright deliberately does not promise ordering between init scripts.
    if (capability === 'offscreen') Object.defineProperty(window, 'OffscreenCanvas', { configurable: true, value: undefined });
    if (capability === 'transfer') Object.defineProperty(OffscreenCanvas.prototype, 'transferToImageBitmap', { configurable: true, value: undefined });
    if (capability === 'presenter') {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, name, ...args) { return name === 'bitmaprenderer' ? null : Reflect.apply(original, this, [name, ...args]); } as typeof original;
    }
    if (capability === 'presentation-error') ImageBitmapRenderingContext.prototype.transferFromImageBitmap = () => { throw new Error('Synthetic presentation failure'); };
  }, failure);
  return errors;
}
async function stats(page: Page) { return page.evaluate(() => (window as ProbeWindow).sharedProbe.snapshot()); }
async function callbacks(page: Page) {
  return JSON.parse(await page.getByLabel('Shared bitmap callbacks').textContent() ?? '{}') as {
    ready: Record<string, number>; errors: Record<string, string[]>; refs: Record<string, string>;
  };
}
async function afterEffects(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function ready(page: Page, count = 1) {
  await expect(page.locator(texts)).toHaveCount(count);
  await expect.poll(() => page.locator(texts + '[data-render-state="ready"]').count()).toBe(count);
}
async function choose(page: Page, mode: string, count = 1) { await page.locator(`button[data-mode="${mode}"]`).click();await ready(page, count);return page.locator(texts).first(); }
async function presentation(wrapper: Locator, background?: string) {
  return bitmapPresentation(wrapper.locator('canvas'), background);
}
async function bitmapPresentation(canvas: Locator, background?: string) {
  return canvas.evaluate((node, fill) => {
    const source = node as HTMLCanvasElement, canvas = document.createElement('canvas');canvas.width = source.width;canvas.height = source.height;
    const context = canvas.getContext('2d')!;
    if (fill) { context.fillStyle = fill;context.fillRect(0, 0, canvas.width, canvas.height); }
    context.drawImage(source, 0, 0);
    return { width: canvas.width, height: canvas.height, pixels: [...context.getImageData(0, 0, canvas.width, canvas.height).data],
      bitmaprenderer: !!source.getContext('bitmaprenderer'), has2d: !!source.getContext('2d'), hasGl: !!source.getContext('webgl') };
  }, background);
}
function plane(width: number, height: number, color: Rgba = [0, 0, 0, 0]) {
  const pixels = new Uint8Array(width * height * 4);for (let i = 0; i < pixels.length; i += 4) pixels.set(color, i);return { width, height, pixels };
}
function rect(target: ReturnType<typeof plane>, x: number, y: number, width: number, height: number, color: Rgba) {
  for (let yy = y; yy < y + height; yy++) for (let xx = x; xx < x + width; xx++) target.pixels.set(color, (yy * target.width + xx) * 4);
}
function exact(actual: Awaited<ReturnType<typeof presentation>>, expected: ReturnType<typeof plane>) {
  expect([actual.width, actual.height]).toEqual([expected.width, expected.height]);
  expect({ bitmaprenderer: actual.bitmaprenderer, has2d: actual.has2d, hasGl: actual.hasGl }).toEqual({ bitmaprenderer: true, has2d: false, hasGl: false });
  const mismatches = actual.pixels.flatMap((value, index) => value === expected.pixels[index] ? [] : [{ index, actual: value, expected: expected.pixels[index] }]);
  expect({ count: mismatches.length, first: mismatches.slice(0, 12) }, 'complete RGBA plane, no mask or tolerance').toEqual({ count: 0, first: [] });
}

test('48 StrictMode instances use one actual Offscreen GL context and consume distinct presentation bitmaps', async ({ page }) => {
  const html = renderToStaticMarkup(createElement(BitmapText, { font: gpuAlphaFont, renderer: 'webgl-shared', sampling: 'point', shader: 'bitmap', children: 'R' }));
  expect(html).toContain('data-render-state="loading"');expect(html).toContain('R');expect(html).not.toContain('role="img"');
  const errors = await instrument(page);await page.goto(url);await ready(page);await choose(page, 'stress', 48);
  const actual = await stats(page);
  expect({ contexts: actual.contexts, active: actual.active, htmlWebgl: actual.htmlWebgl, presenters: actual.presenters })
    .toEqual({ contexts: 1, active: 1, htmlWebgl: 0, presenters: 48 });
  expect(actual.produced).toBe(48);expect(actual.consumed).toBe(48);expect(actual.outstanding).toBe(0);expect(actual.lossEvents).toBe(0);
  const callback = await callbacks(page);expect(Object.keys(callback.ready)).toHaveLength(48);expect(Object.values(callback.ready)).toEqual(Array(48).fill(1));
  expect(Object.values(callback.refs)).toEqual(Array(48).fill('SPAN'));expect(callback.errors).toEqual({});
  const outputs = await page.locator(texts + ' canvas').evaluateAll(nodes => nodes.map(node => {
    const canvas = node as HTMLCanvasElement;return { width: canvas.width, height: canvas.height, bitmap: !!canvas.getContext('bitmaprenderer'), gl: !!canvas.getContext('webgl') };
  }));
  expect(outputs.every(output => output.width > 0 && output.height > 0 && output.bitmap && !output.gl)).toBe(true);expect(errors).toEqual([]);
});

test('48 same-page owners reuse actual programs uploads buffers and target without shared readbacks across eight updates', async ({ page }) => {
  const errors = await instrument(page); await page.goto(url); await ready(page); await choose(page, 'reuse-stress', 48);
  const warmed = await stats(page); expect(warmed.contexts).toBe(1); expect(warmed.pageUploads).toBe(1); expect(warmed.resources.Program!.created).toBe(2); expect(warmed.resources.Shader!.created).toBe(4); expect(warmed.resources.Buffer!.created).toBeLessThanOrEqual(9); expect(warmed.resources.Framebuffer!.created).toBe(1); expect(warmed.targetAllocations).toBe(1); expect(warmed.readbacks).toBe(0);
  for (let phase = 1; phase <= 8; phase++) { await page.getByRole('button', { name: 'Advance glyphs', exact: true }).click(); await ready(page, 48); await expect.poll(async () => (await callbacks(page)).ready['1']).toBe(phase + 1); }
  const red = plane(4, 2); rect(red, 0, 0, 2, 2, [255, 0, 0, 128]); exact(await presentation(page.locator(texts).first()), red); exact(await presentation(page.locator(texts).nth(1)), red);
  const after = await stats(page); expect(after.contexts).toBe(1); expect(after.pageUploads).toBe(warmed.pageUploads); expect(after.targetAllocations).toBe(warmed.targetAllocations); expect(after.readbacks).toBe(0); expect(after.outstanding).toBe(0);
  for (const kind of ['Program', 'Shader', 'Buffer', 'Texture', 'Framebuffer']) expect(after.resources[kind]!.created, kind + ' allocations remain bounded after warmup').toBe(warmed.resources[kind]!.created);
  await page.getByRole('button', { name: 'Toggle shared mounted', exact: true }).click(); await expect.poll(async () => Object.values((await stats(page)).resources).every(value => value.live === 0)).toBe(true); expect((await stats(page)).active).toBe(0); expect(errors).toEqual([]);
});

test('equal page bytes reuse uploads while mutable bytes repaint and cancelled transfers preserve earlier presented pixels', async ({ page }) => {
  const errors = await instrument(page); await page.goto(url); await ready(page);
  const owner = await page.evaluate(() => window.sharedDirectQA.create(2)); expect(owner.errors).toEqual([]); const [first, second] = owner.ids;
  expect(await page.evaluate(id => window.sharedDirectQA.render(id!), first)).toEqual({ rendered: true }); const warm = await stats(page);
  expect(await page.evaluate(id => window.sharedDirectQA.render(id!, { clone: true }), second)).toEqual({ rendered: true }); expect((await stats(page)).pageUploads).toBe(warm.pageUploads);
  expect(await page.evaluate(id => window.sharedDirectQA.render(id!, { rgba: [0, 255, 0, 255] }), second)).toEqual({ rendered: true }); expect((await stats(page)).pageUploads).toBe(warm.pageUploads + 1);
  const red = plane(4, 2), green = plane(4, 2); rect(red, 0, 0, 2, 2, [255, 0, 0, 128]); rect(green, 0, 0, 2, 2, [0, 255, 0, 255]);
  exact(await bitmapPresentation(page.locator(`canvas[data-shared-direct="${first}"]`)), red); exact(await bitmapPresentation(page.locator(`canvas[data-shared-direct="${second}"]`)), green);
  const before = await stats(page); expect(await page.evaluate(id => window.sharedDirectQA.render(id!, { rgba: [0, 0, 255, 255], cancel: 'after-transfer' }), second)).toEqual({ rendered: false });
  const cancelled = await stats(page); expect(cancelled.produced).toBe(before.produced + 1); expect(cancelled.closed).toBe(before.closed + 1); expect(cancelled.consumed).toBe(before.consumed); expect(cancelled.outstanding).toBe(0); exact(await bitmapPresentation(page.locator(`canvas[data-shared-direct="${second}"]`)), green);
  const stopped = await stats(page); expect(await page.evaluate(id => window.sharedDirectQA.render(id!, { cancel: 'before' }), second)).toEqual({ rendered: false }); expect((await stats(page)).produced).toBe(stopped.produced); expect((await stats(page)).pageUploads).toBe(stopped.pageUploads);
  await page.evaluate(ids => window.sharedDirectQA.release(ids), owner.ids); await page.getByRole('button', { name: 'Toggle shared mounted', exact: true }).click(); await expect.poll(async () => Object.values((await stats(page)).resources).every(value => value.live === 0)).toBe(true); expect((await stats(page)).readbacks).toBe(0); expect(errors).toEqual([]);
});

test('declared lease and retained-output budgets reject before allocation and preserve existing ready owners and rollback capacity', async ({ page }) => {
  const errors = await instrument(page); await page.goto(url); await ready(page); const main = page.locator(texts), canvas = await main.locator('canvas').elementHandle(), beforeCallbacks = await callbacks(page);
  // Declared independent contracts:512 leases and16MP across this module's
  // documents. No production private constant is imported as the expectation.
  const leases = await page.evaluate(() => window.sharedDirectQA.create(511)); expect(leases.ids).toHaveLength(511); expect(leases.errors).toEqual([]);
  const rejected = await page.evaluate(() => window.sharedDirectQA.create(1)); expect(rejected.ids).toEqual([]); expect(rejected.errors).toHaveLength(1); expect(rejected.errors[0]).toMatch(/lease|owner|budget|limit/i);
  const before = await stats(page), id = leases.ids[0]!;
  const pixels = await page.evaluate(id => window.sharedDirectQA.render(id, { width: 8192, height: 2048, empty: true }), id); expect(pixels.rangeError).toBe(true);
  const denied = await stats(page); expect(denied.resources).toEqual(before.resources); expect(denied.targetAllocations).toBe(before.targetAllocations); expect(denied.produced).toBe(before.produced); await expect(main).toHaveAttribute('data-render-state', 'ready'); expect(await callbacks(page)).toEqual(beforeCallbacks); expect(await canvas!.evaluate(node => node.isConnected)).toBe(true);
  const red = plane(4, 2); rect(red, 0, 0, 2, 2, [255, 0, 0, 128]); exact(await presentation(main), red);
  expect(await page.evaluate(id => window.sharedDirectQA.render(id), id)).toEqual({ rendered: true }); exact(await bitmapPresentation(page.locator(`canvas[data-shared-direct="${id}"]`)), red);
  await page.evaluate(ids => window.sharedDirectQA.release(ids), leases.ids); const recovered = await page.evaluate(() => window.sharedDirectQA.create(1)); expect(recovered.errors).toEqual([]); expect(recovered.ids).toHaveLength(1); await page.evaluate(ids => window.sharedDirectQA.release(ids), recovered.ids);
  await page.getByRole('button', { name: 'Toggle shared mounted', exact: true }).click(); await expect.poll(async () => Object.values((await stats(page)).resources).every(value => value.live === 0)).toBe(true); expect((await stats(page)).active).toBe(0); expect(errors).toEqual([]);
});

test('one owner presentation failure closes its bitmap without losing siblings or retaining resources after final release', async ({ page }) => {
  const errors = await instrument(page); await page.goto(url); await ready(page); const stable = await callbacks(page), owners = await page.evaluate(() => window.sharedDirectQA.create(1));
  const before = await stats(page), failure = await page.evaluate(id => {
    const original = ImageBitmapRenderingContext.prototype.transferFromImageBitmap;
    ImageBitmapRenderingContext.prototype.transferFromImageBitmap = function (this: ImageBitmapRenderingContext, bitmap) { if (this.canvas instanceof HTMLCanvasElement && this.canvas.hasAttribute('data-shared-direct')) throw Error('Synthetic isolated owner presentation failure'); return original.call(this, bitmap); };
    try { return window.sharedDirectQA.render(id!); } finally { ImageBitmapRenderingContext.prototype.transferFromImageBitmap = original; }
  }, owners.ids[0]); expect(failure.error).toContain('Synthetic isolated owner presentation failure');
  await expect(page.locator(`canvas[data-shared-direct="${owners.ids[0]}"]`)).toHaveAttribute('width', '0'); await expect(page.locator(`canvas[data-shared-direct="${owners.ids[0]}"]`)).toHaveAttribute('height', '0');
  const after = await stats(page); expect(after.produced).toBe(before.produced + 1); expect(after.closed).toBe(before.closed + 1); expect(after.outstanding).toBe(0); expect(after.active).toBe(1); expect(after.lossEvents).toBe(before.lossEvents); expect(await callbacks(page)).toEqual(stable); await expect(page.locator(texts)).toHaveAttribute('data-render-state', 'ready');
  const red = plane(4, 2); rect(red, 0, 0, 2, 2, [255, 0, 0, 128]); exact(await presentation(page.locator(texts)), red);
  await page.evaluate(ids => window.sharedDirectQA.release(ids), owners.ids); await page.getByRole('button', { name: 'Toggle shared mounted', exact: true }).click(); await expect.poll(async () => Object.values((await stats(page)).resources).every(value => value.live === 0)).toBe(true); expect(errors).toEqual([]);
});

test('more than256 distinct pages evict bounded cache entries while already presented owners keep their pixels', async ({ page }) => {
  const errors = await instrument(page); await page.goto(url); await ready(page); const owners = await page.evaluate(() => window.sharedDirectQA.create(1)), before = await stats(page);
  const churn = await page.evaluate(id => {
    const failures: string[] = []; for (let i = 0; i < 300; i++) { const result = window.sharedDirectQA.render(id!, { clone: true, rgba: [i % 256, Math.floor(i / 256), 70, 255] }); if (!result.rendered) failures.push(result.error ?? 'not rendered'); } return failures;
  }, owners.ids[0]); expect(churn).toEqual([]);
  const after = await stats(page); expect(after.contexts).toBe(1); expect(after.resources.Program!.created).toBe(before.resources.Program!.created); expect(after.resources.Buffer!.created).toBeLessThanOrEqual(9); expect(after.resources.Texture!.live).toBeLessThanOrEqual(257); expect(after.resources.Texture!.deleted).toBeGreaterThan(before.resources.Texture!.deleted); expect(after.pageUploads - before.pageUploads).toBe(300); expect(after.readbacks).toBe(0); expect(after.outstanding).toBe(0);
  const red = plane(4, 2), last = plane(4, 2); rect(red, 0, 0, 2, 2, [255, 0, 0, 128]); rect(last, 0, 0, 2, 2, [43, 1, 70, 255]); exact(await presentation(page.locator(texts)), red); exact(await bitmapPresentation(page.locator(`canvas[data-shared-direct="${owners.ids[0]}"]`)), last);
  await page.getByRole('button', { name: 'Advance glyphs', exact: true }).click(); await ready(page); const green = plane(4, 2); rect(green, 0, 0, 2, 2, [0, 255, 0, 255]); exact(await presentation(page.locator(texts)), green);
  await page.evaluate(ids => window.sharedDirectQA.release(ids), owners.ids); await page.getByRole('button', { name: 'Toggle shared mounted', exact: true }).click(); await expect.poll(async () => Object.values((await stats(page)).resources).every(value => value.live === 0)).toBe(true); expect(errors).toEqual([]);
});

test('A B A legal source pages exceeding cache residency reacquire evicted textures without stale handles or sibling damage', async ({ page }) => {
  test.setTimeout(60000); const errors = await instrument(page); await page.goto(url); await ready(page); const owners = await page.evaluate(() => window.sharedDirectQA.create(1)), before = await stats(page), stable = await callbacks(page);
  expect(await page.evaluate(id => window.sharedDirectQA.cyclePages(id!), owners.ids[0])).toEqual({ rendered: true });
  const after = await stats(page); expect(after.pageUploads - before.pageUploads).toBe(3); expect(after.readbacks).toBe(0); expect(after.active).toBe(1); expect(after.lossEvents).toBe(before.lossEvents); expect(after.outstanding).toBe(0); expect(await callbacks(page)).toEqual(stable);
  const expected = plane(6, 2), red = plane(4, 2); rect(expected, 0, 0, 2, 2, [255, 0, 0, 255]); rect(expected, 2, 0, 2, 2, [0, 255, 0, 255]); rect(expected, 4, 0, 2, 2, [255, 0, 0, 255]); rect(red, 0, 0, 2, 2, [255, 0, 0, 128]);
  exact(await bitmapPresentation(page.locator(`canvas[data-shared-direct="${owners.ids[0]}"]`)), expected); exact(await presentation(page.locator(texts)), red);
  await page.evaluate(ids => window.sharedDirectQA.release(ids), owners.ids); await page.getByRole('button', { name: 'Toggle shared mounted', exact: true }).click(); await expect.poll(async () => Object.values((await stats(page)).resources).every(value => value.live === 0)).toBe(true); expect(errors).toEqual([]);
});

test('narrow tall and wide short size swaps never allocate a forbidden intermediate backing and retain complete pixels', async ({ page }) => {
  const errors = await instrument(page); await page.goto(url); await ready(page); const owners = await page.evaluate(() => window.sharedDirectQA.create(1)), stable = await callbacks(page);
  for (const [width, height] of [[2, 8192], [8192, 2], [2, 8192]] as const) {
    expect(await page.evaluate(({ id, width, height }) => window.sharedDirectQA.render(id!, { width, height }), { id: owners.ids[0], width, height })).toEqual({ rendered: true });
    const expected = plane(width, height); rect(expected, 0, 0, 2, 2, [255, 0, 0, 128]); exact(await bitmapPresentation(page.locator(`canvas[data-shared-direct="${owners.ids[0]}"]`)), expected);
  }
  const after = await stats(page); expect(after.maxOffscreenPixels).toBeLessThanOrEqual(16384); expect(after.maxPresenterPixels).toBeLessThanOrEqual(16384); expect(after.unsafeResizeAttempts).toBe(0); expect(after.readbacks).toBe(0); expect(after.active).toBe(1); expect(await callbacks(page)).toEqual(stable);
  const red = plane(4, 2); rect(red, 0, 0, 2, 2, [255, 0, 0, 128]); exact(await presentation(page.locator(texts)), red);
  await page.evaluate(ids => window.sharedDirectQA.release(ids), owners.ids); await page.getByRole('button', { name: 'Toggle shared mounted', exact: true }).click(); await expect.poll(async () => Object.values((await stats(page)).resources).every(value => value.live === 0)).toBe(true); expect(errors).toEqual([]);
});

test('shared transparent and solid backgrounds retain complete original alpha and correct DOM composition', async ({ page }) => {
  const errors = await instrument(page);await page.goto(url);await ready(page);const wrapper = page.locator(texts);
  const transparent = plane(4, 2);rect(transparent, 0, 0, 2, 2, [255, 0, 0, 128]);exact(await presentation(wrapper), transparent);
  const white = plane(4, 2, [255, 255, 255, 255]);rect(white, 0, 0, 2, 2, [255, 127, 127, 255]);exact(await presentation(wrapper, '#ffffff'), white);
  const black = plane(4, 2, [0, 0, 0, 255]);rect(black, 0, 0, 2, 2, [128, 0, 0, 255]);exact(await presentation(wrapper, '#000000'), black);
  await choose(page, 'opaque');const opaque = plane(4, 2, [0, 0, 255, 255]);rect(opaque, 0, 0, 2, 2, [128, 0, 127, 255]);exact(await presentation(page.locator(texts)), opaque);
  expect((await stats(page)).outstanding).toBe(0);expect(errors).toEqual([]);
});

test('atlas and Unicode multiline shadow layouts preserve every pixel, real text, ref and blank extents', async ({ page }) => {
  const requests: string[] = [];page.on('request', request => { if (request.url().includes('__shared_bitmap_unused__')) requests.push(request.url()); });
  const errors = await instrument(page);await page.goto(url);await ready(page);const wrapper = await choose(page, 'geometry');
  const geometry = plane(18, 13);for (const [x, y] of [[0, 2], [8, 3], [2, 9]]) rect(geometry, x!, y!, 4, 4, [0, 0, 0, 255]);
  rect(geometry, 2, 0, 4, 4, [255, 255, 255, 255]);rect(geometry, 10, 1, 4, 4, [0, 0, 255, 255]);rect(geometry, 4, 7, 4, 4, [0, 0, 255, 255]);exact(await presentation(wrapper), geometry);
  const text = wrapper.locator('.mc-bitmap-text__text');expect(await text.textContent()).toBe('A😀\nB');expect(await text.evaluate(node => getComputedStyle(node).textShadow)).toBe('none');
  expect(await text.evaluate(node => { const range = document.createRange();range.selectNodeContents(node);const selection = window.getSelection()!;selection.removeAllRanges();selection.addRange(range);return selection.toString(); })).toBe('A😀\nB');
  expect(await wrapper.ariaSnapshot()).toContain('A😀');expect(await wrapper.ariaSnapshot()).not.toContain('img');await expect(wrapper.locator('canvas')).toHaveAttribute('aria-hidden', 'true');
  await expect(wrapper).toHaveAttribute('title', 'Shared text 0');expect((await callbacks(page)).refs['0']).toBe('SPAN');
  await choose(page, 'unicode');const unicode = plane(57, 54);rect(unicode, 0, 0, 24, 24, [0, 255, 0, 255]);rect(unicode, 27, 0, 24, 24, [0, 0, 255, 255]);rect(unicode, 0, 27, 24, 24, [0, 255, 0, 255]);exact(await presentation(page.locator(texts)), unicode);
  await choose(page, 'spaces');exact(await presentation(page.locator(texts)), plane(8, 4));
  await choose(page, 'empty');await expect(page.locator(texts + ' canvas')).toHaveAttribute('width', '0');await expect(page.locator(texts + ' canvas')).toHaveAttribute('height', '0');
  expect(requests).toEqual([]);expect(errors).toEqual([]);
});

test('equivalent fonts do not duplicate callbacks; signature changes and final unmount release actual GPU owners', async ({ page }) => {
  const errors = await instrument(page);await page.goto(url);await ready(page);
  await page.getByRole('button', { name: 'Equivalent font rerender', exact: true }).click();await afterEffects(page);
  expect((await callbacks(page)).ready).toEqual({ '0': 1 });expect((await stats(page)).produced).toBe(1);
  await page.getByRole('button', { name: 'Advance glyphs', exact: true }).click();await ready(page);
  await expect.poll(async () => (await callbacks(page)).ready['0']).toBe(2);
  const green = plane(4, 2);rect(green, 0, 0, 2, 2, [0, 255, 0, 255]);exact(await presentation(page.locator(texts)), green);
  expect((await stats(page)).active).toBe(1);
  await page.getByRole('button', { name: 'Toggle shared mounted', exact: true }).click();await expect(page.locator(texts)).toHaveCount(0);
  await expect.poll(async () => (await stats(page)).active).toBe(0);
  const released = await stats(page);expect(released.loseRequests).toBeGreaterThan(0);expect(released.outstanding).toBe(0);
  expect(await page.evaluate(() => (window as ProbeWindow).sharedProbe.targetSizes().every(size => size[0] === 0 && size[1] === 0))).toBe(true);
  await page.getByRole('button', { name: 'Toggle shared mounted', exact: true }).click();await ready(page);
  await expect.poll(async () => (await callbacks(page)).ready['0']).toBe(3);exact(await presentation(page.locator(texts)), green);
  expect((await stats(page)).active).toBe(1);expect(errors).toEqual([]);
});

test('superseded and unmounted font downloads cannot publish stale bitmaps, callbacks or source pages', async ({ page }) => {
  const releases = new Map<string, () => void>();
  await page.route('**/__shared_bitmap_*.png', async route => {
    await new Promise<void>(resolve => releases.set(new URL(route.request().url()).pathname, resolve));
    await route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from(gpuProbeAlpha.split(',')[1]!, 'base64') });
  });
  const errors = await instrument(page);await page.goto(url);await ready(page);
  try {
    await page.locator('button[data-mode="delayed"]').click();await expect(page.locator(texts)).toHaveAttribute('data-render-state', 'loading');
    await expect.poll(() => releases.has('/__shared_bitmap_delayed__.png')).toBe(true);
    await choose(page, 'latest-font');const blue = plane(4, 2);rect(blue, 0, 0, 2, 2, [0, 0, 255, 255]);exact(await presentation(page.locator(texts)), blue);
    const response = page.waitForResponse('**/__shared_bitmap_delayed__.png');releases.get('/__shared_bitmap_delayed__.png')!();await (await response).finished();await afterEffects(page);
    expect((await callbacks(page)).ready).toEqual({ '0': 2 });exact(await presentation(page.locator(texts)), blue);
    await page.locator('button[data-mode="delayed-unmount"]').click();await expect(page.locator(texts)).toHaveAttribute('data-render-state', 'loading');
    await expect.poll(() => releases.has('/__shared_bitmap_unmount__.png')).toBe(true);
    await page.getByRole('button', { name: 'Toggle shared mounted', exact: true }).click();await expect(page.locator(texts)).toHaveCount(0);
    const unmounted = page.waitForResponse('**/__shared_bitmap_unmount__.png');releases.get('/__shared_bitmap_unmount__.png')!();await (await unmounted).finished();await afterEffects(page);
    expect((await callbacks(page)).ready).toEqual({ '0': 2 });expect((await callbacks(page)).errors).toEqual({});
    expect((await stats(page)).active).toBe(0);expect((await stats(page)).outstanding).toBe(0);expect(errors).toEqual([]);
  } finally { for (const release of releases.values()) release(); }
});

test('real shared context loss fails every active owner once and changed inputs acquire one fresh session', async ({ page }) => {
  const errors = await instrument(page);await page.goto(url);await ready(page);await choose(page, 'stress', 48);
  await page.evaluate(() => (window as ProbeWindow).sharedProbe.lose());
  await expect.poll(() => page.locator(texts + '[data-render-state="error"]').count()).toBe(48);
  const failed = await callbacks(page);expect(Object.values(failed.errors)).toEqual(Array.from({ length: 48 }, () => ['The shared bitmap WebGL context was lost.']));
  expect(Object.values(failed.ready)).toEqual(Array(48).fill(1));
  const fallback = await page.locator(texts).evaluateAll(nodes => nodes.map(node => {
    const canvas = node.querySelector('canvas')!, text = node.querySelector('.mc-bitmap-text__text')!;
    return { width: canvas.width, height: canvas.height, readable: !!text.textContent && getComputedStyle(text).color !== 'rgba(0, 0, 0, 0)' };
  }));
  expect(fallback.every(value => value.width === 0 && value.height === 0 && value.readable)).toBe(true);await afterEffects(page);
  expect((await stats(page)).active).toBe(0);expect((await stats(page)).lossEvents).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Advance glyphs', exact: true }).click();await ready(page, 48);
  await expect.poll(async () => Object.values((await callbacks(page)).ready).every(count => count === 2)).toBe(true);
  expect((await stats(page)).contexts).toBe(2);expect((await stats(page)).active).toBe(1);expect((await stats(page)).outstanding).toBe(0);
  const green = plane(4, 2);rect(green, 0, 0, 2, 2, [0, 255, 0, 255]);exact(await presentation(page.locator(texts).first()), green);
  expect((await callbacks(page)).errors).toEqual(failed.errors);expect(errors).toEqual([]);
});

test('missing shared APIs and failed bitmap presentation report errors without silently painting with CPU or leaking output bitmaps', async ({ page }) => {
  for (const failure of ['offscreen', 'transfer', 'presenter', 'presentation-error'] as const) {
    const probe = await page.context().newPage(), errors = await instrument(probe, failure);
    try {
      await probe.goto(url);const wrapper = probe.locator(texts);await expect(wrapper).toHaveAttribute('data-render-state', 'error');
      await expect(wrapper.locator('.mc-bitmap-text__text')).toHaveText('R');await expect(wrapper.locator('.mc-bitmap-text__text')).toBeVisible();
      await expect(wrapper.locator('canvas')).toHaveAttribute('width', '0');await expect(wrapper.locator('canvas')).not.toBeVisible();
      const messages = (await callbacks(probe)).errors['0']!;expect(messages).toHaveLength(1);
      const expected = { offscreen: 'OffscreenCanvas', transfer: 'transferToImageBitmap', presenter: 'ImageBitmapRenderingContext', 'presentation-error': 'Synthetic presentation failure' }[failure];
      expect(messages[0]).toContain(expected);expect((await callbacks(probe)).ready).toEqual({});
      await expect.poll(async () => (await stats(probe)).active, 'the last failed owner releases its actual GL context').toBe(0);
      const actual = await stats(probe);expect(actual.htmlWebgl).toBe(0);expect(actual.outstanding).toBe(0);
      if (failure === 'presentation-error') { expect(actual.produced).toBe(1);expect(actual.closed).toBe(1); }
      else expect(actual.contexts).toBe(0);
      expect(errors).toEqual([]);
    } finally { await probe.close(); }
  }
});
