import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';

const path = '/__texture_loader__/';
function image(width: number, height: number) {
  const png = new PNG({ width, height });
  for (let index = 0; index < png.data.length; index += 4) png.data.set([17, 85, 204, 255], index);
  return PNG.sync.write(png);
}
const small = image(2, 1);
test.beforeEach(async ({ page }) => { await page.goto('/demo/texture-loader-fixture.html'); });

test('real PNG loading coalesces resident requests and preserves decoded RGBA', async ({ page }) => {
  let requests = 0;
  await page.route(`**${path}*`, async route => { requests++; await route.fulfill({ contentType: 'image/png', body: small }); });
  const result = await page.evaluate(async prefix => {
    const source = '/src/item-renderer-engine.ts', { loadTexture } = await import(source);
    const first = loadTexture(prefix + 'same.png'), second = loadTexture(prefix + 'same.png');
    const [a, b] = await Promise.all([first, second]);
    const third = loadTexture(prefix + 'same.png');
    return { samePromise: first === second && first === third, samePixels: a === b && a === await third,
      width: a.width, height: a.height, pixels: [...a.data] };
  }, path);
  expect(result).toEqual({ samePromise: true, samePixels: true, width: 2, height: 1,
    pixels: [17, 85, 204, 255, 17, 85, 204, 255] });
  expect(requests).toBe(1);
});

test('a failed HTTP request is retried at the same URL without poisoning later consumers', async ({ page }) => {
  let requests = 0;
  await page.route(`**${path}*`, async route => {
    requests++;
    await route.fulfill(requests === 1 ? { status: 503, body: 'temporary failure' } : { contentType: 'image/png', body: small });
  });
  const result = await page.evaluate(async prefix => {
    const source = '/src/item-renderer-engine.ts', { loadTexture } = await import(source);
    let failure = '';
    try { await loadTexture(prefix + 'retry.png'); } catch (error) { failure = String(error); }
    const restored = await loadTexture(prefix + 'retry.png');
    const cached = await loadTexture(prefix + 'retry.png');
    return { failure, same: restored === cached, pixels: [...restored.data] };
  }, path);
  expect(result.failure).toContain('503');
  expect(result.same).toBe(true);
  expect(result.pixels).toEqual([17, 85, 204, 255, 17, 85, 204, 255]);
  expect(requests).toBe(2);
});

test('the resident URL limit evicts the least recently used entry rather than a recently reused one', async ({ page }) => {
  const requests: Record<string, number> = {};
  await page.route(`**${path}*`, async route => {
    const name = new URL(route.request().url()).pathname;
    requests[name] = (requests[name] ?? 0) + 1;
    await route.fulfill({ contentType: 'image/png', body: small });
  });
  await page.evaluate(async prefix => {
    const source = '/src/item-renderer-engine.ts', { loadTexture } = await import(source);
    for (let index = 0; index < 64; index++) await loadTexture(`${prefix}${index}.png`);
    await loadTexture(prefix + '0.png');
    await loadTexture(prefix + '64.png');
    await loadTexture(prefix + '0.png');
    await loadTexture(prefix + '1.png');
  }, path);
  expect(Object.keys(requests)).toHaveLength(65);
  expect(requests[path + '0.png']).toBe(1);
  expect(requests[path + '1.png']).toBe(2);
  expect(Object.values(requests).reduce((sum, value) => sum + value, 0)).toBe(66);
});

test('decoded RGBA byte capacity evicts old images even below the URL count limit', async ({ page }) => {
  const large = image(1024, 1024), requests: Record<string, number> = {};
  await page.route(`**${path}*`, async route => {
    const name = new URL(route.request().url()).pathname;
    requests[name] = (requests[name] ?? 0) + 1;
    await route.fulfill({ contentType: 'image/png', body: large });
  });
  const decoded = await page.evaluate(async prefix => {
    const source = '/src/item-renderer-engine.ts', { loadTexture } = await import(source);
    let length = 0;
    for (let index = 0; index < 9; index++) length = (await loadTexture(`${prefix}${index}.png`)).data.byteLength;
    await loadTexture(prefix + '1.png');
    await loadTexture(prefix + '0.png');
    return length;
  }, path);
  expect(decoded).toBe(4 * 1024 * 1024);
  expect(requests[path + '1.png']).toBe(1);
  expect(requests[path + '0.png']).toBe(2);
  expect(Object.values(requests).reduce((sum, value) => sum + value, 0)).toBe(10);
});

test('a decoded ImageBitmap closes when Canvas2D fails and the URL can recover', async ({ page }) => {
  let requests = 0;
  await page.route(`**${path}*`, async route => { requests++; await route.fulfill({ contentType: 'image/png', body: small }); });
  const result = await page.evaluate(async prefix => {
    const source = '/src/item-renderer-engine.ts', { loadTexture } = await import(source);
    const originalGet = HTMLCanvasElement.prototype.getContext, originalClose = ImageBitmap.prototype.close;
    let closed = 0, failure = '';
    ImageBitmap.prototype.close = function () { closed++; return originalClose.call(this); };
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
      return kind === '2d' ? null : Reflect.apply(originalGet, this, [kind, ...args]);
    } as typeof originalGet;
    try { await loadTexture(prefix + 'decode-retry.png'); } catch (error) { failure = String(error); }
    finally { HTMLCanvasElement.prototype.getContext = originalGet; }
    const closedAfterFailure = closed;
    try {
      const recovered = await loadTexture(prefix + 'decode-retry.png');
      return { failure, closedAfterFailure, closedAfterSuccess: closed, pixels: [...recovered.data] };
    } finally { ImageBitmap.prototype.close = originalClose; }
  }, path);
  expect(result.failure).toContain('Canvas2D unavailable');
  expect(result.closedAfterFailure).toBe(1);
  expect(result.closedAfterSuccess).toBe(2);
  expect(result.pixels).toEqual([17, 85, 204, 255, 17, 85, 204, 255]);
  expect(requests).toBe(2);
});
