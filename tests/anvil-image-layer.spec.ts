import { test, expect } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { PNG } from 'pngjs';
import type { AnvilConfiguration, AnvilWireCommand } from '../demo/anvil-image-layer-fixture';
import type { GuiModelGeometry } from '../src/gui-model-geometry';
import type { GuiTextFont } from '../src/gui-text-geometry';
import { layoutGuiImages } from '../src/gui-image-geometry';

// Source queue expected below is independently evaluated from the original UI.
// It shares public renderGuiLayer with actual, so equality certifies the adapter,
// never a second shader implementation or native whole-GUI rendering.
const path = '/demo/anvil-image-layer-fixture.html';
const layer = (page: Page) => page.locator('canvas.mc-anvil-image-layer');
const marker = (page: Page) => page.locator('.mc-anvil-image-layer,.mc-anvil-image-error');
const hash = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
const sprite = new PNG({ width: 16, height: 16 }); for (let i = 0; i < sprite.data.length; i += 4) sprite.data.set([60, 130, 190, 128], i);
const font = new PNG({ width: 128, height: 128 });
for (let y = 0; y < 12; y++) for (let x = 0; x < 8; x++) {
  font.data.set([255, 255, 255, x === 2 || x === 3 ? 255 : 0], (y * 128 + x) * 4);
  font.data.set([255, 255, 255, x >= 1 && x <= 5 && (y % 3 === 0 || x === 1 || x === 5) ? 255 : 0], (y * 128 + x + 8) * 4);
}
const tile = new PNG({ width: 2, height: 3 }); tile.data.set([40,80,120,128, 180,30,90,255, 20,200,60,255, 230,170,30,128, 75,45,220,255, 190,210,40,255]);
test.beforeEach(async ({ page }) => {
  await page.route('**/qa-anvil-sprite.png', route => route.fulfill({ contentType: 'image/png', body: PNG.sync.write(sprite) }));
  await page.route('**/qa-anvil-font.png', route => route.fulfill({ contentType: 'image/png', body: PNG.sync.write(font) }));
  await page.route('**/qa-anvil-tile.png', route => route.fulfill({ contentType: 'image/png', body: PNG.sync.write(tile) }));
});
async function configure(page: Page, value: Partial<AnvilConfiguration>) {
  await page.evaluate(value => window.anvilSourceQA.configure(value), value);
  for (const [key, expected] of Object.entries(value)) await expect.poll(() => page.locator('main').getAttribute('data-configuration').then(value => JSON.parse(value!)[key])).toEqual(expected);
}
async function ready(page: Page) { await expect(layer(page)).toHaveAttribute('data-render-state', 'ready'); }
async function open(page: Page, value: Partial<AnvilConfiguration> = { mode: 'images' }) {
  await page.goto(path); await page.waitForFunction(() => !!window.anvilSourceQA?.section); await page.mouse.move(0, 0);
  await configure(page, value); if (value.mode && value.mode !== 'css') await ready(page);
}
async function visuals(page: Page) {
  return page.evaluate(() => {
    const root = window.anvilSourceQA.section!, rect = root.getBoundingClientRect(), win = root.querySelector<HTMLElement>('.mc-anvil-image-window');
    return { size: [rect.width, rect.height], models: win?.dataset.itemModels?.split(' ').map(Number) ?? [], sprites: win?.dataset.itemImages?.split(' ').map(Number) ?? [],
      wrappers: [...root.querySelectorAll('.mc-slot__item')].map(node => getComputedStyle(node).visibility),
      images: [...root.querySelectorAll('.mc-slot__item > img')].map(node => getComputedStyle(node).visibility),
      custom: root.querySelector('[data-custom-node]') ? getComputedStyle(root.querySelector('[data-custom-node]')!).visibility : null,
      panel: getComputedStyle(root, '::before').display, arrow: getComputedStyle(root.querySelector('.mc-anvil__arrow')!).visibility, inputColor: getComputedStyle(root.querySelector('.mc-anvil__name-input')!).color,
      labels: [...root.querySelectorAll('[data-custom-text]')].map(node => getComputedStyle(node).visibility), roles: { title: win?.dataset.textTitle, inventory: win?.dataset.textInventory, name: win?.dataset.textName, cost: win?.dataset.textCost },
      canvas: root.querySelectorAll('canvas').length, leaks: root.querySelectorAll('[guimodel],[imagerender],[itemmodels],[projection],[textures]').length };
  });
}
async function stable(page: Page) {
  await page.evaluate(() => window.anvilSourceQA.incrementFallback()); const slot = page.locator('.mc-workstation__inventory .mc-slot').first(); await slot.click(); await slot.focus();
  const section = await page.locator('.mc-anvil').elementHandle(); return { slot, section };
}
async function retained(page: Page, handles: Awaited<ReturnType<typeof stable>>) {
  expect(await handles.section!.evaluate(node => node === window.anvilSourceQA.section)).toBe(true); await expect(handles.slot).toBeFocused(); await expect(handles.slot).toHaveAttribute('aria-pressed', 'true'); await expect(page.locator('[data-fallback-state]')).toHaveAttribute('data-fallback-state', '1');
}

let archivePromise: Promise<(name: string) => Buffer> | undefined;
async function archive() {
  return archivePromise ??= (async () => {
    const bytes = await readFile(new URL('../.cache/references/bedrock-samples-v1.26.60.5-full.zip', import.meta.url));
    expect(hash(bytes)).toBe('d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf');
    let end = bytes.length - 22; while (end >= 0 && (bytes.readUInt32LE(end) !== 0x06054b50 || end + 22 + bytes.readUInt16LE(end + 20) !== bytes.length)) end--;
    if (end < 0) throw Error('Missing ZIP directory'); let p = bytes.readUInt32LE(end + 16); const entries = new Map<string, [number, number, number, number]>();
    for (let i = 0; i < bytes.readUInt16LE(end + 10); i++) {
      if (bytes.readUInt32LE(p) !== 0x02014b50) throw Error('Invalid ZIP entry'); const length = bytes.readUInt16LE(p + 28);
      entries.set(bytes.toString('utf8', p + 46, p + 46 + length), [bytes.readUInt16LE(p + 10), bytes.readUInt32LE(p + 20), bytes.readUInt32LE(p + 24), bytes.readUInt32LE(p + 42)]); p += 46 + length + bytes.readUInt16LE(p + 30) + bytes.readUInt16LE(p + 32);
    }
    return (name: string) => { const entry = entries.get(name); if (!entry) throw Error(`Missing ${name}`); const offset = entry[3] + 30 + bytes.readUInt16LE(entry[3] + 26) + bytes.readUInt16LE(entry[3] + 28), data = bytes.subarray(offset, offset + entry[1]); const raw = entry[0] === 0 ? data : inflateRawSync(data); expect(raw.length).toBe(entry[2]); return raw; };
  })();
}
function jsonc(value: Buffer) { return JSON.parse(value.toString().replace(/^\uFEFF/, '').replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, part => part.startsWith('"') ? part : '')); }
function ordinaryCloseGeometry(common: any) {
  const instance = common.common_panel.controls.find((value: any) => value.close_button_holder).close_button_holder.controls.find((value: any) => value['close@common.close_button'])['close@common.close_button'];
  const button = common.close_button;
  expect(common.root_panel.size).toEqual([176, 166]); expect(instance.offset).toBe('$close_button_offset'); expect(button.offset).toBe('$close_button_offset');
  expect(button.anchor_from).toBe('top_right'); expect(button.anchor_to).toBe('top_right'); expect(button.size).toEqual([21, 21]);
  expect(button['$close_button_offset|default']).toEqual([-2, 2]); expect(button['$close_button_panel_size|default']).toEqual([15, 15]);
  expect(common.close_button_panel.size).toBe('$close_button_panel_size');
  // The instance's offset expression resolves in the close control's own scope.
  // The unrelated common_panel default [0,0] does not erase its local [-2,2].
  const [w, h] = button.size, [dx, dy] = button['$close_button_offset|default'], [iw, ih] = button['$close_button_panel_size|default'];
  const hit = [common.root_panel.size[0] - w + dx, dy, w, h];
  return { hit, image: [hit[0] + (w - iw) / 2, hit[1] + (h - ih) / 2, iw, ih] as [number, number, number, number] };
}

// Set only from root's independent native packed-vertex evidence, never from
// the production adapter or an approximate OS screenshot. Source alone does
// not settle engine grid-child placement / float32 evaluation order.
const nativeSlotEvidence = {
  confirmed: true,
  reference: '.cache/anvil-native-source-01/FINAL.json and .cache/anvil-full-gui-01/cpu-geometry-audit.json',
  ledgerSha256: '1d362f8e0e090847ec870f19c3c07bf5f8563a082004d1ce38206464cbfc9d9c',
  nativeQaDrawsSha256: '27d5135f67464fd1b69c81bda722c8b6879a1db123f6e2a678d63d43bef7030e',
  proofSnapshot: '../.cache/anvil-image-independent-qa/source-rule-update-01/native-cpu-full-proof.json',
  proofSha256: '0f9e735cd769a1472f89267147d12b10c3861e8ff15cecd281ee74da2d252360',
  crossReference: '../.cache/anvil-native-invalid-source-01/cross-name-metrics.json',
  crossSha256: 'a69dd58cb5366bee1ef53d14e4617c786c5e4a0bc8e9bd823c8d85675a35fc1d',
};
function control(parent: any, key: string) { return parent.controls.find((entry: any) => key in entry)[key]; }
async function original() {
  const source = await archive(); return { source, common: jsonc(source('resource_pack/ui/ui_common.json')), anvil: jsonc(source('resource_pack/ui/anvil_screen.json')) };
}
type Rect = readonly [number, number, number, number];
const f = Math.fround, plus = (a: number, b: number) => f(f(a) + f(b)), minus = (a: number, b: number) => f(f(a) - f(b));
const times = (a: number, b: number) => f(f(a) * f(b)), quotient = (a: number, b: number) => f(f(a) / f(b));
function sourceLength(value: string | number, parent: number): number {
  if (typeof value === 'number') return f(value);
  const expression = /^([\d.]+)%(?: - ([\d.]+)px)?$/.exec(value); if (!expression) throw Error(`Unsupported source length ${value}`);
  return minus(times(parent, quotient(Number(expression[1]), 100)), Number(expression[2] ?? 0));
}
function sourcePanel(spec: any, parent: Rect, anchor = spec.anchor_from ?? 'top_left'): Rect {
  const size = spec.size.map((value: string | number, axis: number) => sourceLength(value, parent[axis + 2]!));
  const offsets = (spec.offset ?? [0, 0]).map((value: string | number, axis: number) => sourceLength(value, parent[axis + 2]!));
  const x = plus(parent[0], anchor === 'center' ? times(minus(parent[2], size[0]), .5) : 0);
  const y = plus(parent[1], anchor === 'center' ? times(minus(parent[3], size[1]), .5) : anchor === 'bottom_left' ? minus(parent[3], size[1]) : 0);
  return [plus(x, offsets[0]), plus(y, offsets[1]), size[0], size[1]];
}
function sourceGeometry(anvil: any, common: any) {
  const root: Rect = [0, 0, common.root_panel.size[0], common.root_panel.size[1]], top = sourcePanel(anvil.top_half_panel, root);
  const icon = sourcePanel(anvil.icon_and_text_panel, top), titleText = sourcePanel(anvil.anvil_title_and_text_panel, icon);
  const titlePanel = sourcePanel(anvil.title_panel, titleText), name = sourcePanel(anvil.text_edit_panel, titleText);
  const recipe = sourcePanel(anvil.recipe_panel, top), grid = sourcePanel(anvil.recipe_grid, recipe), cellWidth = quotient(grid[2], anvil.recipe_grid.grid_dimensions[0]);
  const slots = anvil.recipe_grid.controls.flatMap((entry: any) => Object.entries(entry).filter(([key]) => key.endsWith('@anvil.anvil_item_slot')).map(([, spec]: [string, any]) => [plus(grid[0], times(spec.grid_position[0], cellWidth)), grid[1]] as const));
  const center = (column: number, dimensions: readonly [number, number]): Rect => [plus(plus(grid[0], times(column, cellWidth)), times(minus(cellWidth, dimensions[0]), .5)), plus(grid[1], times(minus(grid[3], dimensions[1]), .5)), ...dimensions];
  const clipper: Rect = [plus(name[0], 3), plus(name[1], 2), minus(name[2], 6), minus(name[3], 4)];
  return { root, icon, name, clipper, slots, center, title: [plus(titlePanel[0], times(titlePanel[2], .5)), plus(plus(titlePanel[1], titlePanel[3]), anvil['title_label@anvil.generic_label'].offset[1])] as const,
    cost: [plus(recipe[0], recipe[2]), plus(recipe[1], recipe[3])] as const };
}
function sourceClip(clipper: Rect, origin: readonly number[], scale: number, policy: AnvilConfiguration['namePolicy']): Rect {
  const x = plus(origin[0]!, clipper[0]), y = plus(origin[1]!, clipper[1]), edges = [x, y, plus(x, clipper[2]), plus(y, clipper[3])];
  const extent = [2570, 1402], stage = extent.map(value => Math.ceil(value / scale));
  const pixel = edges.map((value, i) => Math.max(0, Math.min(extent[i % 2]!, policy === 'logical-stage-floor'
    ? Math.floor(times(value, quotient(extent[i % 2]!, stage[i % 2]!))) : (i < 2 ? Math.floor : Math.ceil)(value * scale))));
  return [pixel[0]!, pixel[1]!, pixel[2]! - pixel[0]!, pixel[3]! - pixel[1]!];
}
async function inputIdentity(page: Page) {
  const input = page.getByRole('textbox', { name: 'Item name' }); await input.focus();
  await input.evaluate(node => (node as HTMLInputElement).setSelectionRange(0, 1));
  return { input, element: await input.elementHandle(), section: await page.locator('.mc-anvil').elementHandle() };
}
async function inputRetained(page: Page, state: Awaited<ReturnType<typeof inputIdentity>>) {
  await expect(page.locator('.mc-anvil__name-input')).toHaveCount(1);
  expect(await state.element!.evaluate(node => node === document.querySelector('.mc-anvil__name-input'))).toBe(true);
  expect(await state.section!.evaluate(node => node === window.anvilSourceQA.section)).toBe(true);
  await expect(state.input).toBeFocused();
  expect(await state.input.evaluate(node => [(node as HTMLInputElement).selectionStart, (node as HTMLInputElement).selectionEnd])).toEqual([0, 1]);
}
async function composition(page: Page, scale: number, info: TestInfo, combined: boolean) {
  expect(nativeSlotEvidence.confirmed, nativeSlotEvidence.reference).toBe(true);
  const { source, common, anvil } = await original();
  expect(anvil.recipe_grid.grid_dimensions).toEqual([5, 1]); expect(anvil.anvil_item_slot.size).toEqual([18, 18]);
  const geometry = sourceGeometry(anvil, common), width = geometry.root[2], height = geometry.root[3];
  const local: (readonly [number, number])[] = [...geometry.slots];
  local.push(...Array.from({ length: 27 }, (_, i) => [7 + i % 9 * 18, 86 + Math.floor(i / 9) * 18] as const), ...Array.from({ length: 9 }, (_, i) => [7 + i * 18, 143] as const));
  const origin = [(Math.ceil(2570 / scale) - width) / 2, (Math.ceil(1402 / scale) - height) / 2], commands: AnvilWireCommand[] = [];
  const image = (name: string, rect: readonly [number, number, number, number], hudOpacity?: number) => {
    const png = PNG.sync.read(source(`resource_pack/textures/ui/${name}.png`)); let metadata;
    try { metadata = jsonc(source(`resource_pack/textures/ui/${name}.json`)); } catch { /* Whole original PNG. */ }
    commands.push({ kind: 'image', physicalPrecision: 'float32', texture: { width: png.width, height: png.height, rgba: png.data.toString('base64') }, rect: [origin[0]! + rect[0], origin[1]! + rect[1], rect[2], rect[3]],
      ...(hudOpacity === undefined ? {} : { hudOpacity }), ...(metadata?.nineslice_size !== undefined ? { nineSlice: { insets: metadata.nineslice_size, baseSize: metadata.base_size } } : {}) });
  };
  image('dialog_background_opaque', [0, 0, width, height]); image('close_button_default', ordinaryCloseGeometry(common).image);
  image('anvil_icon', [geometry.icon[0], geometry.icon[1], anvil.anvil_icon.size[0], anvil.anvil_icon.size[1]]); image('edit_box_indent', geometry.name);
  for (const [x, y] of local) image('cell_image', [x!, y!, 18, 18]);
  image('anvil-plus', geometry.center(1, anvil.plus_sign_icon.size));
  // The declared image box is18x12. Native full-attribute evidence establishes
  // normal intrinsic contain, not stretch or a captured-position replacement.
  const contain = (name: string, box: readonly [number, number]): readonly [number, number] => { const png = PNG.sync.read(source(`resource_pack/textures/ui/${name}.png`)), ratio = Math.min(quotient(box[0], png.width), quotient(box[1], png.height)); return [times(png.width, ratio), times(png.height, ratio)]; };
  image('arrow_large', geometry.center(3, contain('arrow_large', anvil.arrow_icon.size)));
  if (!combined) image('crossout', geometry.center(3, contain('crossout', anvil.cross_out_icon.size)));
  const labels: GuiTextFont = { pages: ['/qa-anvil-font.png'], pageSizes: [128], cellHeight: 12, lineHeight: 12, glyphs: { '1': { page: 0, x: 0, y: 0, width: 8, height: 12, advance: 6, offsetY: -3 }, '2': { page: 0, x: 8, y: 0, width: 8, height: 12, advance: 7, offsetY: -3 } } };
  if (combined) {
    const text = (value: string, global: readonly [number, number], color: readonly [number, number, number, number], extras: Partial<Extract<AnvilWireCommand, { kind: 'text' }>> = {}) => commands.push({ kind: 'text', text: value, font: labels, fontPixels: { width: 128, height: 128, rgba: font.data.toString('base64') }, origin: global, fontScale: 1, sampling: 'point', shader: 'bitmap', color, ...extras });
    text('1', [minus(plus(origin[0]!, geometry.title[0]), 3), plus(minus(plus(origin[1]!, geometry.title[1]), 10), 1)], [76, 76, 76, 255], { shadow: { offset: [1, 2], tint: [.2, .3, .4, .7] }, scissor: [0, 0, 2570, 1402] });
    text('1', [plus(origin[0]!, 7), plus(plus(origin[1]!, 76), 1)], [76, 76, 76, 255]);
    text('1', [minus(plus(plus(origin[0]!, geometry.clipper[0]), geometry.clipper[2]), geometry.clipper[2]), plus(plus(plus(origin[1]!, geometry.clipper[1]), times(minus(geometry.clipper[3], 10), .5)), 1)], [255, 255, 255, 255], { scissor: sourceClip(geometry.clipper, origin, scale, 'logical-stage-floor') });
    const costX = minus(plus(origin[0]!, geometry.cost[0]), 13), costY = minus(plus(origin[1]!, geometry.cost[1]), 10), bgW = times(13, 1.05), bgH = times(10, 1.05);
    image('Gray', [minus(minus(plus(costX, 6.5), times(bgW, .5)), origin[0]!), minus(minus(plus(costY, 5), times(bgH, .5)), origin[1]!), bgW, bgH], .3);
    text('12', [costX, plus(costY, 1)], [120, 240, 40, 255], { shadow: { offset: [1, 2], tint: [.15, .25, .35, .75] }, scissor: [0, 0, 1660, 1402] });
  }
  const packed = new PNG({ width: 8, height: 8 }); for (let row = 0; row < 3; row++) tile.data.copy(packed.data, ((row + 2) * 8 + 3) * 4, row * 2 * 4, (row + 1) * 2 * 4);
  const face: GuiModelGeometry['model']['faces'][number] = { texture: 'all', vertices: [[0, 0, 0], [16, 0, 0], [16, 16, 0], [0, 16, 0]], uv: [[3, 5], [5, 5], [5, 2], [3, 2]], color: [255, 255, 255, 255] };
  for (const [index, [x, y]] of local.entries()) {
    if (combined) commands.push({ kind: 'model', model: { faces: [face] }, projection: { yaw: 0, pitch: 0, scale: 1, offset: [0, 16], originQuantization: 'physical-floor' }, origin: [origin[0]! + x! + 1, origin[1]! + y! + 1], textureSizes: { all: [8, 8] }, textures: { all: { width: 8, height: 8, rgba: packed.data.toString('base64') } }, hudOpacity: index === 4 ? .5 : 1 });
    else commands.push({ kind: 'sprite', rect: [origin[0]! + x! + 1, origin[1]! + y! + 1, 16, 16], texture: { width: 16, height: 16, rgba: sprite.data.toString('base64') } });
  }
  const actual = await page.evaluate(() => window.anvilSourceQA.raw());
  const expected = await page.evaluate(value => window.anvilSourceQA.reference(value), { guiScale: scale, outputRect: actual.rect as [number, number, number, number], commands });
  const actualBytes = Buffer.from(actual.rgba, 'base64'), expectedBytes = Buffer.from(expected.rgba, 'base64');
  await info.attach(`GUI${scale}-independent-source-queue.json`, { contentType: 'application/json', body: JSON.stringify({ scope: 'Adapter composition contract using the same public renderer; not native renderer proof', nativeSlotEvidence, renderer: actual.renderer, pixels: actual.width * actual.height, actual: hash(actualBytes), expected: hash(expectedBytes), outputRect: actual.rect }) });
  expect([actual.width, actual.height]).toEqual([expected.width, expected.height]); expect(actualBytes.equals(expectedBytes), 'Complete independently queued source target').toBe(true);
}

test('fixed ZIP independently establishes39-slot hierarchy name clipper and ordinary close own scope', async () => {
  const proofBytes = await readFile(new URL(nativeSlotEvidence.proofSnapshot, import.meta.url)); expect(hash(proofBytes)).toBe(nativeSlotEvidence.proofSha256);
  const proof = JSON.parse(proofBytes.toString()); for (const result of [...proof.f32PhysicalImages, proof.arrow.containFloat32Physical]) expect([result.changedXY, result.changedUV, result.changedIndices]).toEqual([0, 0, 0]);
  expect(hash(await readFile(new URL('../.cache/anvil-native-source-01/FINAL.json', import.meta.url)))).toBe(nativeSlotEvidence.ledgerSha256);
  expect(hash(await readFile(new URL('../.cache/anvil-native-source-01/qa/ui-draws.json', import.meta.url)))).toBe(nativeSlotEvidence.nativeQaDrawsSha256);
  expect(hash(await readFile(new URL(nativeSlotEvidence.crossReference, import.meta.url)))).toBe(nativeSlotEvidence.crossSha256);
  const { anvil, common } = await original(); expect(common.root_panel.size).toEqual([176, 166]); expect(anvil.top_half_panel.size).toEqual(['100% - 14px', '50% - 14px']);
  expect(anvil.recipe_grid.size).toEqual(['83%', '40%']); expect(anvil.recipe_grid.grid_dimensions).toEqual([5, 1]); expect(anvil.anvil_item_slot.size).toEqual([18, 18]);
  expect(anvil.anvil_item_slot.anchor_from).toBeUndefined(); expect(control(anvil.anvil_item_slot, 'container_item@common.container_item')).toEqual({ anchor_to: 'center', anchor_from: 'center' });
  expect(anvil['text_edit_control@common.text_edit_box']).toMatchObject({ max_length: 30, '$text_edit_box_label_size': ['default', 10] });
  const centering = control(common.text_edit_box, 'centering_panel'), clipper = control(centering, 'clipper_panel');
  expect(centering.size).toEqual(['100% - 6px', '100% - 4px']); expect(clipper).toMatchObject({ clips_children: true, anchor_from: 'left_middle', anchor_to: 'left_middle', clip_offset: '$text_edit_clip_offset' });
  expect(common.text_edit_box['$text_edit_clip_offset|default']).toEqual([0, 0]); expect(common.text_edit_box_label['$text_alignment|default']).toBe('left');
  expect(anvil['title_label@anvil.generic_label']).toMatchObject({ anchor_from: 'bottom_middle', anchor_to: 'bottom_middle', offset: [0, 3] }); expect(anvil['cost_label@anvil.generic_label']).toMatchObject({ anchor_from: 'bottom_right', anchor_to: 'bottom_right', shadow: true });
  const close = ordinaryCloseGeometry(common); expect(close.hit).toEqual([153, 2, 21, 21]); expect(close.image).toEqual([156, 5, 15, 15]);
});

test('default and explicit false preserve native input39 slots no optional model IO and source close hitbox', async ({ page }) => {
  const requests: string[] = []; page.on('request', request => { if (request.url().includes('qa-anvil-never')) requests.push(request.url()); });
  await open(page, { mode: 'css', content: 'models', failure: 'projection', source: 'atlas', tileUrl: '/qa-anvil-never.png' });
  await expect(page.locator('.mc-slot')).toHaveCount(39); await expect(page.getByRole('textbox', { name: 'Item name' })).toHaveAttribute('maxlength', '30'); await expect(layer(page)).toHaveCount(0);
  await configure(page, { mode: 'images', itemModels: false, itemImages: false }); await ready(page); expect((await visuals(page)).models).toEqual([]); expect(requests).toEqual([]);
  const close = ordinaryCloseGeometry((await original()).common);
  for (const [selector, expected] of [['.mc-dialog__close', close.hit], ['.mc-dialog__close-icon', close.image]] as const) {
    const rect = await page.locator('.mc-anvil').evaluate((node, selector) => { const root = node.getBoundingClientRect(), child = node.querySelector(selector)!.getBoundingClientRect(); return [(child.x-root.x)/2, (child.y-root.y)/2, child.width/2, child.height/2]; }, selector); expect(rect).toEqual(expected);
  }
  expect((await visuals(page)).leaks).toBe(0);
});

test('controlled native input value selection focus and section survive source CSS and role roundtrips', async ({ page }) => {
  await open(page, { mode: 'images' }); const state = await inputIdentity(page);
  for (const mode of ['css', 'combined', 'images'] as const) { await configure(page, { mode }); if (mode !== 'css') await ready(page); await inputRetained(page, state); }
  await state.input.fill('12'); await expect(state.input).toHaveValue('12'); await expect(page.getByLabel('Anvil integration events')).toContainText('name:12');
  await configure(page, { name: '21' }); await expect(state.input).toHaveValue('21'); expect(await state.element!.evaluate(node => node.isConnected)).toBe(true);
});

test('rename disabled readOnly invalid expensive unaffordable and empty results retain actual callback guards', async ({ page }) => {
  await open(page, { mode: 'combined', cost: 'green' }); const input = page.getByRole('textbox', { name: 'Item name' }), result = page.locator('.mc-anvil__result');
  await configure(page, { renameDisabled: true }); await ready(page); await expect(input).toBeDisabled(); await configure(page, { renameDisabled: false, renameReadOnly: true }); await ready(page); await expect(input).toHaveAttribute('readonly', ''); await configure(page, { renameReadOnly: false }); await ready(page);
  const first = page.locator('.mc-anvil__input'), second = page.locator('.mc-anvil__material'); await first.press('ArrowRight'); await expect(second).toBeFocused(); await second.press('ArrowRight'); await expect(result).toBeFocused(); await result.press('ArrowLeft'); await expect(second).toBeFocused();
  await first.press('Enter'); await second.click({ button: 'right' }); await result.click(); await result.click({ button: 'right' }); const events = await page.getByLabel('Anvil integration events').textContent(); expect(events).toContain('input:0:primary|input:1:secondary|take:primary|take:secondary');
  for (const value of [{ invalid: true }, { invalid: false, cost: 'red' }, { cost: 'expensive' }, { cost: 'green', result: 'null' }, { result: 'zero' }, { result: 'nan' }] as const) { await configure(page, value); await ready(page); await expect(result).toHaveAttribute('aria-disabled', 'true'); await result.evaluate(node => { (node as HTMLButtonElement).click(); node.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })); }); await result.press('Enter'); await expect(page.getByLabel('Anvil integration events')).toHaveText(events!); }
});

test('GUI4 invalid sprites compare complete original PNG and independently derived source queue', async ({ page }, info) => { await open(page, { mode: 'images', itemImages: true, invalid: true, guiScale: 4 }); await composition(page, 4, info, false); });

test('GUI5 all roles cost shadow scissor and atlas models compare the complete independent source queue', async ({ page }, info) => { await open(page, { mode: 'combined', cost: 'green', content: 'models', itemModels: true, itemImages: true, source: 'atlas', disabledItem: true }); await composition(page, 5, info, true); expect((await visuals(page)).models).toEqual(Array.from({ length: 39 }, (_, i) => i)); expect((await visuals(page)).sprites).toEqual([]); });

test('mixed model sprite custom and invalid-count policies preserve counts durability and stateful fallback', async ({ page }) => {
  await open(page, { mode: 'images', content: 'mixed', itemModels: true, itemImages: true, disabledItem: true }); const v = await visuals(page); expect(v.models).toEqual([1, 2, 3]); expect(v.sprites).toEqual(Array.from({ length: 39 }, (_, i) => i).filter(i => ![1, 2, 3, 5, 6, 7].includes(i))); expect(v.custom).toBe('visible');
  await expect(page.locator('.mc-anvil__input .mc-slot__count')).toHaveText('5'); await expect(page.locator('.mc-anvil__input .mc-slot__durability')).toHaveAttribute('aria-valuenow', '0.5'); const handles = await stable(page);
  for (const mode of ['css', 'combined', 'images'] as const) { await configure(page, { mode }); if (mode !== 'css') await ready(page); await retained(page, handles); } expect((await visuals(page)).leaks).toBe(0);
});

test('composition and focus restore actual DOM glyphs immediately while preserving IME input identity', async ({ page }) => {
  await open(page, { mode: 'combined', role: 'name' }); const input = page.getByRole('textbox', { name: 'Item name' });
  expect((await visuals(page)).roles.name).toBe('true');
  await input.evaluate(node => node.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '1' })));
  await expect.poll(async () => (await visuals(page)).roles.name).not.toBe('true'); await ready(page);
  await expect(input).not.toHaveCSS('color', 'rgba(0, 0, 0, 0)'); const state = await inputIdentity(page);
  await expect(state.input).not.toHaveCSS('color', 'rgba(0, 0, 0, 0)'); await inputRetained(page, state);
  await state.input.evaluate(node => node.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '1' })));
  await expect(state.input).toBeFocused(); await expect(state.input).not.toHaveCSS('color', 'rgba(0, 0, 0, 0)'); await page.getByRole('button', { name: 'Reopen anvil' }).focus(); await ready(page); await expect(state.input).toHaveValue('1'); expect(await state.element!.evaluate(node => node.isConnected)).toBe(true);
});

test('long unfocused name clips logical advance to source clipper and focused native input remains usable', async ({ page }, info) => {
  await open(page, { mode: 'combined', role: 'name', name: '1'.repeat(30), nameOverhang: true });
  const { anvil, common } = await original(), geometry = sourceGeometry(anvil, common), origin = [(Math.ceil(2570 / 5) - 176) / 2, (Math.ceil(1402 / 5) - 166) / 2];
  const policyOutputs: string[] = [];
  for (const namePolicy of ['logical-stage-floor', 'floor-min-ceil-max'] as const) {
    await configure(page, { namePolicy, name: '1'.repeat(30) }); await ready(page); const initial = await page.evaluate(() => window.anvilSourceQA.raw());
    await configure(page, { name: '1'.repeat(29) + '2' }); await ready(page); const changed = await page.evaluate(() => window.anvilSourceQA.raw()); expect(changed.rgba).not.toBe(initial.rgba); policyOutputs.push(changed.rgba);
    const a = Buffer.from(initial.rgba, 'base64'), b = Buffer.from(changed.rgba, 'base64'), clip = sourceClip(geometry.clipper, origin, 5, namePolicy);
    expect([initial.width, initial.height, initial.rect]).toEqual([changed.width, changed.height, changed.rect]);
    let differences = 0, outsideCount = 0; const outsideSamples: number[][] = [];
    for (let i = 0; i < a.length; i += 4) if (!a.subarray(i, i + 4).equals(b.subarray(i, i + 4))) {
      const x = initial.rect[0]! + i / 4 % initial.width, y = initial.rect[1]! + Math.floor(i / 4 / initial.width); differences++;
      if (x < clip[0] || x >= clip[0] + clip[2] || y < clip[1] || y >= clip[1] + clip[3]) { outsideCount++; if (outsideSamples.length < 8) outsideSamples.push([x, y]); }
    }
    expect(outsideCount, `Changed pixels outside the same strict clipper: ${JSON.stringify(outsideSamples)}`).toBe(0); expect(differences).toBeGreaterThan(0);
    await info.attach(`long-name-${namePolicy}.json`, { contentType: 'application/json', body: JSON.stringify({ scope: 'Synthetic advance180/181 with deliberate vertical overhang versus source clipper; no native font claim', namePolicy, clip, differences, outsideCount, initial: hash(a), changed: hash(b) }) });
  }
  expect(policyOutputs[0], 'Both explicit clipping policies affect deliberate overhang').not.toBe(policyOutputs[1]);
  const input = page.getByRole('textbox', { name: 'Item name' }); await input.focus(); await input.press('Home'); await input.press('ArrowRight'); await expect(input).toBeFocused(); expect(await input.evaluate(node => (node as HTMLInputElement).selectionStart)).toBe(1); await expect(input).toHaveValue('1'.repeat(29) + '2');
});

test('bad requested text or model metadata restores whole CSS at scale without replacing input ref or selection', async ({ page }) => {
  await open(page, { mode: 'combined', cost: 'green', content: 'models', itemModels: true, source: 'atlas' }); const state = await inputIdentity(page);
  for (const failure of ['metrics', 'projection', 'atlas-size', 'shadow'] as const) { await configure(page, { failure, displayScale: 2.5 }); await expect(marker(page)).toHaveAttribute('data-render-state', 'error'); const v = await visuals(page); expect(v.size).toEqual([880, 830]); expect(v.panel).not.toBe('none'); expect(v.wrappers).toEqual(Array(39).fill('visible')); await inputRetained(page, state); await configure(page, { failure: 'none' }); await ready(page); }
  await page.getByRole('button', { name: 'Reopen anvil' }).focus(); await configure(page, { failure: 'name-offset' }); await expect(marker(page)).toHaveAttribute('data-render-state', 'error'); expect(await state.element!.evaluate(node => node.isConnected)).toBe(true); expect((await visuals(page)).panel).not.toBe('none');
});

test('pending failed atlas and lost actual GL context keep atomic fallback and preserve selected inventory', async ({ page }) => {
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; }); await page.route('**/qa-anvil-delayed.png', async route => { await gate; await route.fulfill({ contentType: 'image/png', body: PNG.sync.write(tile) }); }); await page.route('**/qa-anvil-missing.png', route => route.fulfill({ status: 404, body: 'missing source' })); await page.route('**/qa-anvil-missing-font.png', route => route.fulfill({ status: 404, body: 'missing source font' }));
  await open(page, { mode: 'css', content: 'models' }); await configure(page, { mode: 'combined', itemModels: true, source: 'atlas', tileUrl: '/qa-anvil-delayed.png', displayScale: 2.5 }); await expect(layer(page)).toHaveAttribute('data-render-state', 'loading'); expect((await visuals(page)).wrappers).toEqual(Array(39).fill('visible')); release(); await ready(page); const handles = await stable(page);
  await configure(page, { tileUrl: '/qa-anvil-missing.png' }); await expect(marker(page)).toHaveAttribute('data-render-state', 'error'); expect((await visuals(page)).wrappers).toEqual(Array(39).fill('visible')); await retained(page, handles); await configure(page, { tileUrl: '/qa-anvil-tile.png' }); await ready(page);
  await configure(page, { fontUrl: '/qa-anvil-missing-font.png' }); await expect(marker(page)).toHaveAttribute('data-render-state', 'error'); expect((await visuals(page)).wrappers).toEqual(Array(39).fill('visible')); await retained(page, handles); await configure(page, { fontUrl: '/qa-anvil-font.png' }); await ready(page);
  await layer(page).evaluate(node => { const extension = (node as HTMLCanvasElement).getContext('webgl')!.getExtension('WEBGL_lose_context'); if (!extension) throw Error('No actual context-loss extension'); extension.loseContext(); }); await expect(layer(page)).toHaveAttribute('data-render-state', 'error'); expect((await visuals(page)).wrappers).toEqual(Array(39).fill('visible')); await retained(page, handles); await configure(page, { guiScale: 4 }); await ready(page); await retained(page, handles);
});

test('narrow pan physical net1x scale reservation and close reopen keep complete39-slot contents', async ({ page }, info) => {
  await open(page, { mode: 'combined', cost: 'green', itemImages: true });
  for (const [guiScale, displayScale] of [[4, 2], [5, 2.5]] as const) { await page.setViewportSize({ width: 320, height: 1000 }); await configure(page, { guiScale, displayScale }); await ready(page);
    const geometry = await page.evaluate(() => { const root = window.anvilSourceQA.section!, r = root.getBoundingClientRect(), canvas = root.querySelector<HTMLCanvasElement>('canvas')!, c = canvas.getBoundingClientRect(), reservation = document.querySelector('.mc-workstation-image-reservation')!.getBoundingClientRect(), tail = document.querySelector('#tail')!.getBoundingClientRect(), scroll = root.closest('.mc-workstation-scroll')!; scroll.scrollLeft = scroll.scrollWidth; return { root: [r.width, r.height], backing: [canvas.width, canvas.height], canvas: [c.width, c.height], documentWidth: document.documentElement.scrollWidth, bottom: reservation.bottom, tail: tail.top, pan: scroll.scrollLeft, zoom: CSS.supports('zoom', '1') }; });
    expect(geometry.root).toEqual([352 * displayScale, 332 * displayScale]); expect(geometry.canvas).toEqual(geometry.backing); expect(geometry.documentWidth).toBe(320); expect(geometry.pan).toBeGreaterThan(0); expect(geometry.tail).toBeGreaterThanOrEqual(geometry.bottom); await info.attach(`layout-${guiScale}-${displayScale}.json`, { contentType: 'application/json', body: JSON.stringify(geometry) }); }
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.getByRole('button', { name: 'Close container' }).press('Enter'); await expect(page.locator('.mc-anvil')).toHaveCount(0); await page.getByRole('button', { name: 'Reopen anvil' }).click(); await ready(page); await expect(page.locator('.mc-slot')).toHaveCount(39);
});

test('fractional semantic durability follows source phase only when ready and restores latest React width on pending error and off', async ({ page }) => {
  await open(page, { mode: 'combined', cost: 'green', durability: .5 });
  const meter = page.locator('.mc-anvil__input > [role="meter"]'), fill = meter.locator(':scope > span');
  const { anvil, common } = await original(), geometry = sourceGeometry(anvil, common), slot = geometry.slots[0] as readonly [number, number];
  const origin = [(Math.ceil(2570 / 5) - 176) / 2, (Math.ceil(1402 / 5) - 166) / 2];
  const sourceWidth = (ratio: number) => {
    // Independent finite progress candidate + public geometry, not the private
    // ownership hook or a native captured per-slot rectangle.
    const left = plus(origin[0]! + slot[0], 3), top = plus(origin[1]! + slot[1], 13.5), width = Math.max(0, Math.min(13, Math.floor(plus(left, times(13, ratio))) - Math.floor(left)));
    const mesh = layoutGuiImages({ width: 2570, height: 1402, guiScale: 5, images: [{ rect: [left, top, width, 1], physicalPrecision: 'float32' }] }).meshes[0]!;
    const xs = mesh.vertices.map(vertex => vertex.position[0] * 5); return (Math.ceil(Math.max(...xs) - .5) - Math.ceil(Math.min(...xs) - .5)) * 2 / 5;
  };
  await expect.poll(() => fill.evaluate(node => parseFloat((node as HTMLElement).style.width))).toBe(sourceWidth(.5)); await expect(meter).toHaveAttribute('aria-valuenow', '0.5');
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/qa-anvil-meter-delay.png', async route => { await gate; await route.fulfill({ contentType: 'image/png', body: PNG.sync.write(font) }); });
  await configure(page, { fontUrl: '/qa-anvil-meter-delay.png', durability: .25 }); await expect(layer(page)).toHaveAttribute('data-render-state', 'loading');
  await expect.poll(() => fill.evaluate(node => (node as HTMLElement).style.width)).toBe(`${Math.round(.25 * 12) * 2}px`); await expect(meter).toHaveAttribute('aria-valuenow', '0.25');
  release(); await ready(page); await expect.poll(() => fill.evaluate(node => parseFloat((node as HTMLElement).style.width))).toBe(sourceWidth(.25));
  await configure(page, { failure: 'metrics', durability: .75 }); await expect(marker(page)).toHaveAttribute('data-render-state', 'error'); await expect.poll(() => fill.evaluate(node => (node as HTMLElement).style.width)).toBe(`${Math.round(.75 * 12) * 2}px`); await expect(meter).toHaveAttribute('aria-valuenow', '0.75');
  await configure(page, { failure: 'none', mode: 'css', durability: .25 }); await expect(layer(page)).toHaveCount(0); await expect.poll(() => fill.evaluate(node => (node as HTMLElement).style.width)).toBe('6px'); expect(await fill.evaluate(node => (node as HTMLElement).style.getPropertyPriority('width'))).toBe(''); await expect(meter).toHaveAttribute('aria-valuenow', '0.25');
});
