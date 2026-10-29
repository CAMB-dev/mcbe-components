import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BitmapText } from '../src/bitmap-text';
import { gpuAlphaFont, gpuProbeAlpha } from '../demo/bitmap-text-webgl-fixture';

// Public, synthetic RGBA probes only. Native captured-font replay certification
// is separate; no private font page or driver-specific capture enters this suite.
test.use({ deviceScaleFactor: 1 });
const fixtureUrl = '/demo/bitmap-text-webgl-fixture.html';
const specimen = '#bitmap-live';
type Rgba = readonly [number, number, number, number];
const transparent: Rgba = [0, 0, 0, 0], black: Rgba = [0, 0, 0, 255];
const white: Rgba = [255, 255, 255, 255], blue: Rgba = [0, 0, 255, 255];

async function callbacks(page: Page) {
  return JSON.parse(await page.getByLabel('GPU bitmap callbacks').textContent() ?? '{}') as {
    ready: number; errors: string[]; tag: string; mode: string; mounted: boolean;
  };
}
async function choose(page: Page, mode: string, state: 'ready' | 'error' | 'loading' = 'ready') {
  await page.locator(`button[data-mode="${mode}"]`).click();
  const wrapper = page.locator(specimen);
  await expect(wrapper).toHaveAttribute('data-render-state', state);
  return wrapper;
}
async function fixture(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(fixtureUrl);
  await expect(page.locator(specimen)).toHaveAttribute('data-render-state', 'ready');
  return errors;
}
async function gpuPlane(wrapper: Locator) {
  return wrapper.locator('canvas').evaluate(node => {
    const canvas = node as HTMLCanvasElement, gl = canvas.getContext('webgl');
    if (!gl) throw new Error('Expected an actual live WebGL context, not a Canvas2D fallback.');
    const raw = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, raw);
    const pixels: number[] = [];
    for (let y = canvas.height - 1; y >= 0; y--) pixels.push(...raw.subarray(y * canvas.width * 4, (y + 1) * canvas.width * 4));
    return { width: canvas.width, height: canvas.height, pixels, premultiplied: gl.getContextAttributes()?.premultipliedAlpha,
      lost: gl.isContextLost(), error: gl.getError(), has2d: !!canvas.getContext('2d') };
  });
}
function plane(width: number, height: number, background: Rgba = transparent) {
  const pixels = new Uint8Array(width * height * 4);
  for (let index = 0; index < pixels.length; index += 4) pixels.set(background, index);
  return { width, height, pixels };
}
function rectangle(target: ReturnType<typeof plane>, x: number, y: number, width: number, height: number, color: Rgba) {
  for (let yy = y; yy < y + height; yy++) for (let xx = x; xx < x + width; xx++) target.pixels.set(color, (yy * target.width + xx) * 4);
}
function exactPlane(actual: Awaited<ReturnType<typeof gpuPlane>>, expected: ReturnType<typeof plane>) {
  expect([actual.width, actual.height]).toEqual([expected.width, expected.height]);
  expect({ premultiplied: actual.premultiplied, lost: actual.lost, error: actual.error, has2d: actual.has2d })
    .toEqual({ premultiplied: true, lost: false, error: 0, has2d: false });
  // Compare every channel, including blank edges and alpha, without a mask or tolerance.
  const differences = actual.pixels.flatMap((value, index) => value === expected.pixels[index] ? [] : [{ index, actual: value, expected: expected.pixels[index] }]);
  expect({ count: differences.length, first: differences.slice(0, 12) }).toEqual({ count: 0, first: [] });
}
async function afterEffects(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

test('SSR retains readable text and the CPU default without creating a browser renderer', () => {
  for (const renderer of [undefined, 'cpu', 'webgl'] as const) {
    const html = renderToStaticMarkup(createElement(BitmapText, { font: gpuAlphaFont, children: 'R G', sampling: 'point', shader: 'bitmap', renderer }));
    expect(html).toContain(`data-renderer="${renderer ?? 'cpu'}"`);
    expect(html).toContain('data-render-state="loading"');
    expect(html).toContain('data-profile="atlas-rect"');
    expect(html).toContain('R G');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('role="img"');expect(html).not.toContain('<img');
  }
});

test('GPU multiline multipage layout preserves overhang, shadow, wrapper ref and selectable DOM text', async ({ page }) => {
  const errors = await fixture(page), wrapper = await choose(page, 'geometry');
  // Independent placement: min(-1 + shadow -1)=-2, minY=-.5,
  // advance width=7, final shadow bottom=6; at scale2 this is18x13.
  const expected = plane(18, 13);
  for (const [x, y] of [[0, 2], [8, 3], [2, 9]]) rectangle(expected, x!, y!, 4, 4, black);
  rectangle(expected, 2, 0, 4, 4, white);
  rectangle(expected, 10, 1, 4, 4, blue);
  rectangle(expected, 4, 7, 4, 4, blue);
  exactPlane(await gpuPlane(wrapper), expected);
  expect(await wrapper.evaluate(node => { const box = node.getBoundingClientRect(); return [box.width, box.height]; })).toEqual([18, 13]);
  await expect(wrapper).toHaveAttribute('title', 'Selectable bitmap text');
  await expect(wrapper.locator('canvas')).toHaveAttribute('aria-hidden', 'true');
  const text = wrapper.locator('.mc-bitmap-text__text');
  expect(await text.textContent()).toBe('A😀\nB');
  expect(await text.evaluate(node => {
    const range = document.createRange();range.selectNodeContents(node);
    const selection = window.getSelection()!;selection.removeAllRanges();selection.addRange(range);return selection.toString();
  })).toBe('A😀\nB');
  expect(await text.evaluate(node => getComputedStyle(node).textShadow)).toBe('none');
  expect(await wrapper.ariaSnapshot()).toContain('A😀');
  expect(await wrapper.ariaSnapshot()).not.toContain('img');
  expect((await callbacks(page)).tag).toBe('SPAN');expect(errors).toEqual([]);
});

test('Unicode full cells cover the complete fractional-scale multiline canvas, including blank edges', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', request => { if (request.url().includes('__gpu_bitmap_unused__')) requested.push(request.url()); });
  const errors = await fixture(page), wrapper = await choose(page, 'unicode');
  await expect(wrapper).toHaveAttribute('data-profile', 'bedrock-unicode');
  // Source16x16 cells at1.5x are24x24, advances18/20 become27/30;
  // two18px source lines yield54px. Solid cells have red neighbors in the PNG.
  const expected = plane(57, 54);
  rectangle(expected, 0, 0, 24, 24, [0, 255, 0, 255]);
  rectangle(expected, 27, 0, 24, 24, blue);
  rectangle(expected, 0, 27, 24, 24, [0, 255, 0, 255]);
  exactPlane(await gpuPlane(wrapper), expected);
  await choose(page, 'spaces');
  const canvas = page.locator(specimen).locator('canvas');
  await expect(canvas).toHaveAttribute('width', '8');await expect(canvas).toHaveAttribute('height', '4');
  exactPlane(await gpuPlane(page.locator(specimen)), plane(8, 4));
  await choose(page, 'empty');
  await expect(canvas).toHaveAttribute('width', '0');await expect(canvas).toHaveAttribute('height', '0');
  expect(requested).toEqual([]);expect(errors).toEqual([]);
});

test('transparent and opaque target backgrounds retain exact PMA bytes and correct DOM composition', async ({ page }) => {
  const errors = await fixture(page), wrapper = await choose(page, 'alpha-transparent');
  const expected = plane(4, 2);
  rectangle(expected, 0, 0, 2, 2, [128, 0, 0, 128]);
  exactPlane(await gpuPlane(wrapper), expected);
  // Canvas drawImage uses its presentation alpha mode, independently of the
  // readPixels oracle. A double-premultiplication error changes these bytes.
  const composite = await wrapper.locator('canvas').evaluate(node => {
    const result: number[][] = [];
    for (const color of ['#ffffff', '#000000']) {
      const copy = document.createElement('canvas');copy.width = 4;copy.height = 2;
      const context = copy.getContext('2d')!;context.fillStyle = color;context.fillRect(0, 0, 4, 2);
      context.drawImage(node as HTMLCanvasElement, 0, 0);result.push([...context.getImageData(0, 0, 4, 2).data]);
    }
    return result;
  });
  const overWhite = plane(4, 2, white), overBlack = plane(4, 2, black);
  rectangle(overWhite, 0, 0, 2, 2, [255, 127, 127, 255]);rectangle(overBlack, 0, 0, 2, 2, [128, 0, 0, 255]);
  expect(composite).toEqual([[...overWhite.pixels], [...overBlack.pixels]]);
  await choose(page, 'alpha-opaque');
  const opaque = plane(4, 2, blue);rectangle(opaque, 0, 0, 2, 2, [128, 0, 127, 255]);
  exactPlane(await gpuPlane(page.locator(specimen)), opaque);
  expect(errors).toEqual([]);
});

test('StrictMode backend switching, equivalent fonts and unmount/remount keep deterministic callbacks and release old GL', async ({ page }) => {
  const errors = await fixture(page), wrapper = page.locator(specimen);
  expect((await callbacks(page)).ready).toBe(1);
  expect(await wrapper.locator('canvas').evaluate(node => !!(node as HTMLCanvasElement).getContext('2d'))).toBe(true);
  await choose(page, 'webgl');const initial = await gpuPlane(wrapper);
  expect((await callbacks(page)).ready).toBe(2);
  await wrapper.locator('canvas').evaluate(node => {
    (window as typeof window & { retiredBitmapContext: WebGLRenderingContext | null }).retiredBitmapContext = (node as HTMLCanvasElement).getContext('webgl');
  });
  await page.getByRole('button', { name: 'Equivalent font rerender', exact: true }).click();
  await expect(wrapper).toHaveAttribute('data-probe-revision', '1');await afterEffects(page);
  expect((await callbacks(page)).ready).toBe(2);expect((await gpuPlane(wrapper)).pixels).toEqual(initial.pixels);
  await choose(page, 'cpu');
  expect((await callbacks(page)).ready).toBe(3);
  await expect.poll(() => page.evaluate(() => (window as typeof window & { retiredBitmapContext: WebGLRenderingContext }).retiredBitmapContext.isContextLost())).toBe(true);
  expect(await wrapper.locator('canvas').evaluate(node => !!(node as HTMLCanvasElement).getContext('2d'))).toBe(true);
  await choose(page, 'webgl');expect((await gpuPlane(wrapper)).pixels).toEqual(initial.pixels);
  expect((await callbacks(page)).ready).toBe(4);
  await page.getByRole('button', { name: 'Toggle mounted', exact: true }).click();await expect(wrapper).toHaveCount(0);
  await page.getByRole('button', { name: 'Toggle mounted', exact: true }).click();await expect(wrapper).toHaveAttribute('data-render-state', 'ready');
  expect((await callbacks(page)).ready).toBe(5);expect((await gpuPlane(wrapper)).pixels).toEqual(initial.pixels);
  expect((await callbacks(page)).errors).toEqual([]);expect(errors).toEqual([]);
});

test('invalid profiles, missing pages and unavailable WebGL expose readable errors and recover without silent CPU fallback', async ({ page }) => {
  await page.route('**/__gpu_bitmap_missing__.png', route => route.fulfill({ status: 404, body: 'missing synthetic page' }));
  const errors = await fixture(page);
  const cases = [
    ['missing-page', 'HTTP 404'], ['unknown-glyph', 'U+3F'], ['invalid-profile', 'Unsupported bitmap profile'],
    ['trimmed-unicode', 'full 16 by 16 cells'], ['cpu-profile', 'CPU bitmap renderer'],
    ['cpu-background', 'CPU bitmap renderer'], ['invalid-background', 'concrete CSS color'],
  ] as const;
  for (const [mode, message] of cases) {
    const before = await callbacks(page), wrapper = await choose(page, mode, 'error');
    await expect(wrapper.locator('canvas')).toHaveAttribute('width', '0');await expect(wrapper.locator('canvas')).not.toBeVisible();
    await expect(wrapper.locator('.mc-bitmap-text__text')).toBeVisible();
    await expect(wrapper.locator('.mc-bitmap-text__text')).toHaveText(mode === 'unknown-glyph' ? '?' : 'R');
    const current = await callbacks(page);
    expect(current.ready).toBe(before.ready);expect(current.errors).toHaveLength(before.errors.length + 1);
    expect(current.errors.at(-1)).toContain(message);
    await choose(page, 'webgl');await gpuPlane(page.locator(specimen));
  }
  expect(errors).toEqual([]);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type, ...args) {
      if (type === 'webgl') return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto(fixtureUrl);await expect(page.locator(specimen)).toHaveAttribute('data-render-state', 'ready');
  const unavailable = await choose(page, 'webgl', 'error');
  expect((await callbacks(page)).errors).toEqual(['WebGL bitmap rendering is unavailable.']);
  await expect(unavailable).toHaveAttribute('data-renderer', 'webgl');
  await expect(unavailable.locator('canvas')).toHaveAttribute('width', '0');
  await expect(unavailable.locator('.mc-bitmap-text__text')).toBeVisible();
  await choose(page, 'cpu');expect((await callbacks(page)).ready).toBe(2);
  expect(errors).toEqual([]);
});

test('superseded and unmounted late atlas downloads cannot repaint or report stale callbacks', async ({ page }) => {
  const releases = new Map<string, () => void>();
  await page.route('**/__gpu_bitmap_delayed*.png', async route => {
    await new Promise<void>(resolve => releases.set(new URL(route.request().url()).pathname, resolve));
    await route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from(gpuProbeAlpha.split(',')[1]!, 'base64') });
  });
  const errors = await fixture(page), wrapper = page.locator(specimen);
  try {
    await choose(page, 'delayed-page', 'loading');
    await expect.poll(() => releases.has('/__gpu_bitmap_delayed__.png')).toBe(true);
    await expect(wrapper.locator('.mc-bitmap-text__text')).toBeVisible();
    await choose(page, 'unicode');const replacement = await gpuPlane(wrapper);
    const response = page.waitForResponse('**/__gpu_bitmap_delayed__.png');
    releases.get('/__gpu_bitmap_delayed__.png')!();await (await response).finished();await afterEffects(page);
    expect((await callbacks(page)).ready).toBe(2);expect((await gpuPlane(wrapper)).pixels).toEqual(replacement.pixels);
    await choose(page, 'delayed-unmount', 'loading');
    await expect.poll(() => releases.has('/__gpu_bitmap_delayed_unmount__.png')).toBe(true);
    await page.getByRole('button', { name: 'Toggle mounted', exact: true }).click();await expect(wrapper).toHaveCount(0);
    const unmountedResponse = page.waitForResponse('**/__gpu_bitmap_delayed_unmount__.png');
    releases.get('/__gpu_bitmap_delayed_unmount__.png')!();await (await unmountedResponse).finished();await afterEffects(page);
    expect((await callbacks(page)).ready).toBe(2);expect((await callbacks(page)).errors).toEqual([]);
    await page.locator('button[data-mode="webgl"]').click();
    await page.getByRole('button', { name: 'Toggle mounted', exact: true }).click();await expect(wrapper).toHaveAttribute('data-render-state', 'ready');
    expect((await callbacks(page)).ready).toBe(3);await gpuPlane(wrapper);expect(errors).toEqual([]);
  } finally {
    for (const release of releases.values()) release();
  }
});
