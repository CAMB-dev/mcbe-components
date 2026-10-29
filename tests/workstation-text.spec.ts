import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PNG } from 'pngjs';
import { EnchantmentOption, WorkstationFrame } from '../src/workstations';

test.use({ deviceScaleFactor: 1 });
const url = '/demo/workstation-text-fixture.html';
const part = (page: Page, name: string) => page.locator(`[data-text-case="${name}"]`);
async function open(page: Page) {
  const errors: string[] = [];page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);await expect.poll(() => page.locator('.mc-bitmap-text[data-render-state="ready"]').count()).toBe(7);
  return errors;
}
async function image(canvas: Locator) {
  return canvas.evaluate(node => {
    const source = node as HTMLCanvasElement, copy = document.createElement('canvas');copy.width = source.width;copy.height = source.height;
    const context = copy.getContext('2d')!;context.drawImage(source, 0, 0);
    return { width: copy.width, height: copy.height, data: [...context.getImageData(0, 0, copy.width, copy.height).data] };
  });
}
type Plane = { width: number; height: number; data: Uint8Array };
function plane(width: number, height: number): Plane { return { width, height, data: new Uint8Array(width * height * 4) }; }
function rect(p: Plane, x: number, y: number, width: number, height: number, color: readonly number[]) {
  for (let yy = y; yy < y + height; yy++) for (let xx = x; xx < x + width; xx++) p.data.set(color, (yy * p.width + xx) * 4);
}
function exact(actual: Awaited<ReturnType<typeof image>>, expected: Plane) {
  expect([actual.width, actual.height]).toEqual([expected.width, expected.height]);
  expect(Buffer.from(actual.data).equals(Buffer.from(expected.data)), 'complete source canvas RGBA, no crop/mask/tolerance').toBe(true);
}
function smallPen(terminal = false) {
  const p = plane(terminal ? 14 : 8, 7);
  for (const x of terminal ? [2, 10] : [2, 4]) rect(p, x, 2, 4, 4, [0, 0, 0, 255]);
  for (const x of terminal ? [0, 8] : [0, 2]) rect(p, x, 0, 4, 4, [255, 255, 255, 255]);return p;
}
async function metrics(wrapper: Locator) {
  return wrapper.evaluate(node => {
    const a = node.getBoundingClientRect(), canvas = node.querySelector('canvas')!, b = canvas.getBoundingClientRect();
    return { logical: [a.width, a.height], visual: [b.width, b.height], offset: [b.x - a.x, b.y - a.y], overflow: getComputedStyle(node).overflow };
  });
}

test('default workstation text retains direct readable DOM and no renderer markup', async ({ page }) => {
  const frame = renderToStaticMarkup(createElement(WorkstationFrame, { title: 'Plain title' }));
  const option = renderToStaticMarkup(createElement(EnchantmentOption, { id: 'plain', label: 'Plain option', level: 11 }));
  expect(frame).not.toContain('mc-workstation-text__semantic');expect(option).not.toContain('mc-workstation-text__semantic');
  expect(option).toContain('class="mc-enchanting__cost">11</span>');expect(frame).not.toContain('<canvas');
  const errors = await open(page), plain = part(page, 'plain');
  await expect(plain.getByRole('heading', { name: 'Plain title', exact: true })).toBeVisible();
  await expect(plain.getByRole('grid', { name: 'Loose bag', exact: true })).toBeVisible();
  expect(await plain.locator('.mc-workstation__title').evaluate(node => node.childNodes.length === 1 && node.firstChild?.nodeType === Node.TEXT_NODE)).toBe(true);
  expect((await plain.locator('.mc-enchanting__cost').boundingBox())!.height).toBe(20);
  await expect(plain.locator('.mc-workstation-text__semantic, canvas')).toHaveCount(0);expect(errors).toEqual([]);
});

test('text hooks receive role-specific contexts while canonical titles, inventory names and option ARIA remain authoritative', async ({ page }) => {
  const errors = await open(page), hooks = part(page, 'hooks');
  const context = async (node: Locator) => JSON.parse(await node.getAttribute('data-host-context') ?? '{}');
  expect(await context(hooks.locator('.mc-workstation__title [data-host-kind]'))).toEqual({ kind: 'title', align: 'start' });
  expect(await context(hooks.getByText('VISUAL:Standalone bag', { exact: true }))).toEqual({ kind: 'inventory-label', align: 'start' });
  const custom = hooks.getByRole('button', { name: 'Caller name', exact: true });
  await expect(custom).toHaveAccessibleDescription('Caller requirement');
  expect(await context(custom.locator('[data-host-kind]'))).toEqual({ kind: 'enchantment-cost', align: 'end', disabled: false, id: 'standalone', tier: 3 });
  await expect(custom.locator('.mc-workstation-text__semantic')).toHaveText('0');
  await expect(hooks.getByRole('button', { name: 'Null visual 13', exact: true }).locator('.mc-workstation-text__semantic')).toHaveText('13');
  expect((await hooks.getByRole('button', { name: 'String visual 11', exact: true }).locator('.mc-enchanting__cost').boundingBox())!.height).toBe(20);
  const gpu = part(page, 'gpu');await expect(gpu.getByRole('heading', { name: 'A', exact: true })).toBeVisible();await expect(gpu.getByRole('grid', { name: 'AA', exact: true })).toBeVisible();
  await expect(gpu.locator('.mc-workstation__title .mc-bitmap-text__text')).toHaveText('A');
  await expect(gpu.locator('.mc-player-inventory__label .mc-bitmap-text__text')).toHaveText('AA');
  await expect(gpu.locator('.mc-workstation-text__semantic')).toHaveCount(5);
  expect(await gpu.locator('[data-host-kind]').evaluateAll(nodes => nodes.every(node => !!node.closest('[aria-hidden="true"]')))).toBe(true);
  const snapshot = await gpu.ariaSnapshot();expect(snapshot).toContain('Host option 11');expect(snapshot).not.toContain('img');expect(errors).toEqual([]);
});

test('shared GPU cost text preserves controlled eligibility, original callbacks and logical right alignment despite8x12 overhang', async ({ page }) => {
  const errors = await open(page), gpu = part(page, 'gpu'), option = gpu.getByRole('button', { name: 'Host option 11', exact: true });
  const visual = option.locator('.mc-bitmap-text');await expect(visual).toHaveAttribute('data-renderer', 'webgl-shared');
  const check = async (color: readonly number[]) => {
    await expect(visual).toHaveAttribute('data-render-state', 'ready');
    expect(await metrics(visual)).toEqual({ logical: [24, 18], visual: [30, 26], offset: [0, -6], overflow: 'visible' });
    const outer = await option.boundingBox(), inner = await visual.boundingBox(), canvas = await visual.locator('canvas').boundingBox();
    const cost = await option.locator('.mc-enchanting__cost').boundingBox();
    expect([cost!.height, cost!.y + cost!.height - inner!.y - inner!.height], 'parent cost box follows the caller logical height without an inherited line strut').toEqual([18, 0]);
    expect(Math.abs(outer!.x + outer!.width - inner!.x - inner!.width - 4)).toBeLessThanOrEqual(.02);
    expect(Math.abs(canvas!.x + canvas!.width - inner!.x - inner!.width - 6)).toBeLessThanOrEqual(.02);
    const expected = plane(30, 26);rect(expected, 2, 2, 28, 24, [0, 0, 0, 255]);rect(expected, 0, 0, 28, 24, color);exact(await image(visual.locator('canvas')), expected);
    expect(await visual.locator('canvas').evaluate(node => !!(node as HTMLCanvasElement).getContext('bitmaprenderer'))).toBe(true);
  };
  await check([0, 255, 0, 255]);await option.press('Enter');await expect(page.getByLabel('Host text events')).toHaveText('host-first');
  await page.getByRole('button', { name: 'Change host cost', exact: true }).click();await expect(option).toHaveCount(0);
  const changed = gpu.getByRole('button', { name: 'Host option 22', exact: true });
  await expect(changed.locator('.mc-bitmap-text__text')).toHaveText('22');await expect(changed.locator('.mc-workstation-text__semantic')).toHaveText('22');
  await changed.press('Space');await expect(page.getByLabel('Host text events')).toHaveText('host-first|host-first');
  await page.getByRole('button', { name: 'Toggle host eligibility', exact: true }).click();await expect(changed).toBeDisabled();
  await expect(changed.locator('.mc-bitmap-text')).toHaveAttribute('data-render-state', 'ready');
  expect(JSON.parse(await changed.locator('[data-host-context]').getAttribute('data-host-context') ?? '{}')).toEqual({ kind: 'enchantment-cost', align: 'end', disabled: true, id: 'host-first', tier: 1 });
  const red = plane(30, 26);rect(red, 2, 2, 28, 24, [0, 0, 0, 255]);rect(red, 0, 0, 28, 24, [255, 0, 0, 255]);exact(await image(changed.locator('canvas')), red);
  await changed.evaluate((node: HTMLButtonElement) => node.click());await gpu.getByRole('button', { name: 'Prevented option 11', exact: true }).click();
  await expect(page.getByLabel('Host text events')).toHaveText('host-first|host-first');await expect(page.getByLabel('Text render errors')).toBeEmpty();expect(errors).toEqual([]);
});

test('advance mode changes only pen layout while CPU and shared canvases retain complete negative-bearing pixels', async ({ page }) => {
  const errors = await open(page), probes = part(page, 'pen').locator('.mc-bitmap-text');
  for (const probe of await probes.all()) { expect((await metrics(probe)).logical).toEqual([8, 7]);exact(await image(probe.locator('canvas')), smallPen()); }
  await page.getByRole('button', { name: 'Toggle probe layout', exact: true }).click();
  await expect.poll(() => probes.locator('canvas').count()).toBe(2);
  for (const probe of await probes.all()) {
    await expect(probe).toHaveAttribute('data-render-state', 'ready');expect(await metrics(probe)).toEqual({ logical: [4, 6], visual: [8, 7], offset: [-1, -1], overflow: 'visible' });exact(await image(probe.locator('canvas')), smallPen());
  }
  expect(JSON.parse(await page.getByLabel('Pen ready callbacks').textContent() ?? '{}')).toEqual({ cpu: 2, 'webgl-shared': 2 });
  await page.getByRole('button', { name: 'Probe terminal pen', exact: true }).click();
  for (const probe of await probes.all()) { await expect(probe).toHaveAttribute('data-render-state', 'ready');expect((await metrics(probe)).logical).toEqual([2, 6]);exact(await image(probe.locator('canvas')), smallPen(true)); }
  await page.getByRole('button', { name: 'Probe newline', exact: true }).click();
  for (const probe of await probes.all()) { await expect(probe).toHaveAttribute('data-render-state', 'ready');expect((await metrics(probe)).logical).toEqual([0, 12]);await expect(probe.locator('canvas')).toHaveAttribute('width', '0'); }
  await page.getByRole('button', { name: 'Probe fractional scale', exact: true }).click();
  for (const probe of await probes.all()) { await expect(probe).toHaveAttribute('data-render-state', 'ready');expect(await metrics(probe)).toEqual({ logical: [2.5, 3.75], visual: [5, 5], offset: [-.625, -.625], overflow: 'visible' }); }
  await expect(page.getByLabel('Text render errors')).toBeEmpty();expect(errors).toEqual([]);
});

test('advance CSS pixels stay logical at device pixel ratio2 while the whole overhanging canvas remains visible', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 800, height: 600 }, deviceScaleFactor: 2 });
  try {
    const page = await context.newPage();await open(page);await page.getByRole('button', { name: 'Toggle probe layout', exact: true }).click();
    const holder = page.locator('[data-pen-backend="webgl-shared"]'), probe = holder.locator('.mc-bitmap-text');await expect(probe).toHaveAttribute('data-render-state', 'ready');
    // The diagnostic holder has padding around its100px alignment area. Its
    // known backdrop covers the complete negative bearing/right overhang,
    // rather than allowing unrelated panels behind transparent pixels.
    await holder.evaluate(node => Object.assign((node as HTMLElement).style, { position: 'fixed', left: '20px', top: '20px', zIndex: '9999' }));
    expect(await page.evaluate(() => devicePixelRatio)).toBe(2);expect((await metrics(probe)).logical).toEqual([4, 6]);
    const expected = smallPen();exact(await image(probe.locator('canvas')), expected);
    const actual = PNG.sync.read(await probe.locator('canvas').screenshot({ path: testInfo.outputPath('advance-dpr2-actual.png') }));expect([actual.width, actual.height]).toEqual([16, 14]);
    const raw = new Uint8Array(16 * 14 * 4);
    for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) { const i = (Math.floor(y / 2) * expected.width + Math.floor(x / 2)) * 4;raw.set(expected.data[i + 3] ? expected.data.subarray(i, i + 4) : [40, 41, 42, 255], (y * 16 + x) * 4); }
    const expectedPng = new PNG({ width: 16, height: 14 });expectedPng.data.set(raw);
    await testInfo.attach('advance-dpr2-complete-expected', { body: PNG.sync.write(expectedPng), contentType: 'image/png' });
    await testInfo.attach('advance-dpr2-geometry', { body: JSON.stringify(await metrics(probe)), contentType: 'application/json' });
    expect(actual.data.equals(Buffer.from(raw)), 'entire device-pixel ROI includes both overhang and blank margins').toBe(true);
  } finally { await context.close(); }
});
