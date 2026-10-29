import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';

// Independent original Mojang v1.26.60.5 PNG/UI oracle. Do not replace these
// with generated skins, production CSS, or an updated browser baseline.
const pins = [
  ['edit_box_indent.png', 'c4968ec9277dcdd363c28c1338a6e202d15f8464c14331fddb9c5014c9eaa109', 6, 6],
  ['edit_box_indent_hover.png', '7b02fa8f0b08581bd0319d1757578303c160cc77a2a0910ec3231dc642b6e2eb', 6, 6],
  ['crossout.png', 'e6495d114d889c557948d19035a3a76ba45b9e7a75d19052eed826ea5f05ff61', 15, 15],
  ['ErrorGlyph.png', '1b274eea56592b90fcb3ce90f112d2cea9d4f1a31536fd7eeb8a432c740e1c1e', 13, 20],
] as const;
const specimen = (page: Page, name: string) => page.locator(`[data-invalid-case="${name}"]`);
const control = (region: Locator) => region.locator('input.mc-input, textarea.mc-input, button.mc-combobox-trigger');
async function open(page: Page) { await page.goto('/demo/invalid-state-fixture.html'); await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0); }
async function raw(file: string) {
  // ErrorGlyph's shipped original bytes are independently pinned below to the
  // official full-release entry. This does not trust the generated icon map.
  return readFile(new URL(file === 'ErrorGlyph.png' ? '../src/assets/gui-icons/error-glyph.png' : `../.cache/references/${file}`, import.meta.url));
}
function same(a: Buffer, b: Buffer, scope: string) {
  const x = PNG.sync.read(a), y = PNG.sync.read(b);
  if (!x.data.equals(y.data)) {
    const first = test.info().outputPath(`${scope.replace(/[^a-z0-9]+/gi, '-')}-actual.png`);
    mkdirSync(dirname(first), { recursive: true }); writeFileSync(first, a); writeFileSync(first.replace('-actual.png', '-expected.png'), b);
  }
  expect([x.width, x.height], scope).toEqual([y.width, y.height]);
  expect(x.data.equals(y.data), `${scope}: every RGBA channel, no mask or tolerance`).toBe(true);
}

test('invalid source textures retain exact original PNG identity and nine-slice metadata', async () => {
  for (const [file, sha, width, height] of pins) {
    const bytes = await raw(file); expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha);
    const png = PNG.sync.read(bytes); expect([png.width, png.height]).toEqual([width, height]);
  }
  for (const file of ['edit_box_indent.json', 'edit_box_indent_hover.json']) {
    const metadata = JSON.parse((await raw(file)).toString());
    expect(metadata).toMatchObject({ nineslice_size: 2, base_size: [6, 6] });
  }
});

test('original native definitions distinguish invalid crossout dimensions from validation adaptation', async () => {
  const path = `${process.env.MCBE_INSTALL_ROOT ?? 'C:/XboxGames/Minecraft for Windows/Content'}/data/resource_packs/vanilla/__brarchive/ui.brarchive`;
  test.skip(!existsSync(path), 'Optional installed-game source audit; PNG and Web contracts run without a game install.');
  const data = await readFile(path), count = data.readUInt32LE(8), base = 16 + count * 256;
  const source = (name: string) => {
    for (let index = 0; index < count; index++) { const row = 16 + index * 256;
      if (data.toString('utf8', row + 1, row + 1 + data[row]!) === name) return JSON.parse(data.toString('utf8', base + data.readUInt32LE(row + 248), base + data.readUInt32LE(row + 248) + data.readUInt32LE(row + 252)));
    } throw new Error(`Missing original source ${name}`);
  };
  const common = source('ui_common.json');
  expect(common.text_edit_box.$text_background_default).toBe('common.edit_box_indent');
  expect(common.text_edit_box.$text_background_hover).toBe('common.edit_box_indent_hover');
  expect(common.error_glyph.texture).toBe('textures/ui/ErrorGlyph');
  expect(source('_global_variables.json').$error_text_color).toEqual([1, 0, 0]);
  for (const [file, key, dimensions] of [['anvil_screen.json', 'cross_out_icon', [18, 12]], ['smithing_table_2_screen.json', 'cross_out_icon_image', [18, 12]], ['grindstone_screen.json', 'cross_out_icon', [15, 15]]] as const) {
    const image = source(file)[key]; expect(image.texture).toBe('textures/ui/crossout'); expect(image.size).toEqual(dimensions);
    expect(image.keep_ratio).toBeUndefined();
  }
});

for (const kind of ['input', 'textarea']) test(`${kind} invalid default and hover skins match the original complete nine-slice PNG`, async ({ page }) => {
  await open(page); const region = specimen(page, kind), target = control(region);
  await region.locator('.invalid-surface').evaluate(node => Object.assign((node as HTMLElement).style, { position: 'fixed', left: '40px', top: '80px', zIndex: '99998' }));
  for (const hover of [false, true]) {
    if (hover) await target.hover(); else await page.mouse.move(0, 0);
    const actual = await target.screenshot(), size = PNG.sync.read(actual);
    const png = `data:image/png;base64,${(await raw(hover ? 'edit_box_indent_hover.png' : 'edit_box_indent.png')).toString('base64')}`;
    // Original metadata: base6x6, slice2; GUI2 gives 4px destination edges.
    // Browser is used only for the independent original-image sampling oracle.
    await page.evaluate(({ png, width, height, kind }) => {
      // A Web textarea retains Chromium's resize grip. Include that same UA
      // primitive in the independent source-image oracle; do not mask its 18
      // pixels or mislabel the grip as an original Minecraft asset.
      const reference = document.createElement(kind === 'textarea' ? 'textarea' : 'div'); reference.id = 'invalid-source-reference';
      reference.style.cssText = `position:fixed;left:0;top:0;width:${width}px;height:${height}px;box-sizing:border-box;border:4px solid transparent;border-image:url("${png}") 2 fill/4px stretch;image-rendering:pixelated;background:#5e5e5e;resize:vertical;z-index:99999`;
      document.body.append(reference);
    }, { png, width: size.width, height: size.height, kind });
    same(actual, await page.locator('#invalid-source-reference').screenshot(), `${kind} original ${hover ? 'hover' : 'default'} PNG`);
    await page.locator('#invalid-source-reference').evaluate(node => node.remove());
  }
});

for (const kind of ['input', 'textarea', 'select', 'combobox']) test(`${kind} invalid keeps its complete normal and hover control surface, including external halo`, async ({ page }) => {
  await open(page);
  const images: Buffer[] = [];
  for (const state of ['normal', 'error']) {
    const region = specimen(page, `${kind}${state === 'normal' ? '-normal' : ''}`), surface = region.locator('.invalid-surface');
    const old = await surface.getAttribute('style');
    // Same integer plane avoids screenshot fractional bounds. The entire
    // painted control plus 6px outside each edge is compared, not a glyph mask.
    await surface.evaluate(node => Object.assign((node as HTMLElement).style, { position: 'fixed', left: '40px', top: '80px', zIndex: '9999' }));
    const target = control(region); await page.mouse.move(0, 0); await target.evaluate(node => (node as HTMLElement).blur());
    const box = await target.boundingBox(); expect(box).not.toBeNull();
    const clip = { x: box!.x - 6, y: box!.y - 6, width: box!.width + 12, height: box!.height + 12 };
    images.push(await page.screenshot({ clip })); await target.hover(); images.push(await page.screenshot({ clip }));
    await surface.evaluate((node, value) => value === null ? node.removeAttribute('style') : node.setAttribute('style', value), old);
  }
  same(images[0]!, images[2]!, `${kind} default invalid surface`); same(images[1]!, images[3]!, `${kind} hover invalid surface`);
});

for (const kind of ['input', 'textarea', 'select', 'combobox']) test(`${kind} validation preserves error description, native disabled semantics and visible keyboard focus`, async ({ page }) => {
  await open(page); const region = specimen(page, kind), target = control(region);
  await expect(target).toHaveAttribute('aria-invalid', 'true');
  const described = await target.getAttribute('aria-describedby'); expect(described).toBeTruthy();
  await expect(page.locator(`[id="${described}"]`)).toContainText('Invalid value');
  await target.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await expect(target).toBeFocused();
  await expect(target).toHaveCSS('outline-style', 'solid'); await expect(target).toHaveCSS('outline-color', 'rgb(255, 255, 255)');
  await expect(target).toHaveCSS('outline-width', '2px');
  const disabled = control(specimen(page, `${kind}-disabled`)); await expect(disabled).toBeDisabled();
  expect(await target.evaluate(node => new FormData(node.closest('form')!).has('field'))).toBe(true);
  expect(await disabled.evaluate(node => new FormData(node.closest('form')!).has('field'))).toBe(false);
  await disabled.evaluate(node => (node as HTMLInputElement).click());
  if (kind === 'select' || kind === 'combobox') { await expect(specimen(page, `${kind}-disabled`).getByRole('listbox')).toBeHidden(); }
  await expect(page.getByLabel('Result and selection actions')).toHaveText('0');
});

test('required Combobox validation is semantic and selection can clear it', async ({ page }) => {
  await open(page); const region = specimen(page, 'required'), trigger = region.getByRole('combobox');
  await region.getByRole('button', { name: 'Validate choice' }).focus(); await page.keyboard.press('Enter'); await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-invalid', 'true'); await expect(trigger).toHaveCSS('outline-color', 'rgb(255, 255, 255)');
  await trigger.press('End'); await trigger.press('Enter'); await expect(trigger).not.toHaveAttribute('aria-invalid', 'true');
});

test('error descriptions use the complete original decorative ErrorGlyph without tint or crop', async ({ page }) => {
  await open(page); const png = `data:image/png;base64,${(await raw('ErrorGlyph.png')).toString('base64')}`;
  for (const kind of ['input', 'textarea', 'select', 'combobox']) {
    const region = specimen(page, kind), icon = region.locator('.mc-field__error [data-gui-icon="error-glyph"]');
    await expect(icon).toHaveCount(1); await expect(icon).toHaveAttribute('aria-hidden', 'true');
    const image = icon.locator('img'); await expect(image).toHaveAttribute('alt', ''); await image.evaluate(node => (node as HTMLImageElement).decode());
    const box = await icon.boundingBox(); expect(box).not.toBeNull();
    const scale = box!.width / 13; expect(Number.isSafeInteger(scale) && scale > 0).toBe(true); expect(box!.height).toBe(20 * scale);
    const previous = await icon.getAttribute('style');
    await icon.evaluate(node => Object.assign((node as HTMLElement).style, { position: 'fixed', left: '20px', top: '20px', zIndex: '99999', background: '#28292a' }));
    const actual = await icon.screenshot();
    await icon.evaluate((node, value) => value === null ? node.removeAttribute('style') : node.setAttribute('style', value), previous);
    await page.evaluate(({ png, width, height }) => {
      const reference = document.createElement('img'); reference.id = 'error-glyph-source-reference'; reference.src = png;
      reference.style.cssText = `position:fixed;left:20px;top:20px;width:${width}px;height:${height}px;display:block;image-rendering:pixelated;background:#28292a;z-index:99999`;
      document.body.append(reference);
    }, { png, width: box!.width, height: box!.height });
    await page.locator('#error-glyph-source-reference').evaluate(node => (node as HTMLImageElement).decode());
    same(actual, await page.locator('#error-glyph-source-reference').screenshot(), `${kind} complete original ErrorGlyph`);
    await page.locator('#error-glyph-source-reference').evaluate(node => node.remove());
  }
});

for (const [kind, width, height] of [['anvil', 36, 24], ['smithing', 36, 24], ['grindstone', 30, 30]] as const) test(`${kind} crossout retains original deliberate aspect and full original source pixels`, async ({ page }) => {
  await open(page); const region = specimen(page, kind), icon = region.locator(`.mc-${kind}__invalid`);
  const box = await icon.boundingBox(); expect([box!.width, box!.height]).toEqual([width, height]);
  // Compare the complete isolated image layer over the same flat underlay.
  // This verifies original texture/stretch, not native final composed GUI.
  const original = `data:image/png;base64,${(await raw('crossout.png')).toString('base64')}`;
  await icon.evaluate(node => { const clone = node.cloneNode(true) as HTMLElement, style = getComputedStyle(node); clone.id = 'invalid-actual-layer'; clone.style.cssText = `position:fixed;left:20px;top:20px;width:${style.width};height:${style.height};background:${style.background};image-rendering:pixelated;z-index:99999`; const host = document.createElement('div'); host.id = 'invalid-layer-host'; host.style.cssText = 'position:fixed;left:20px;top:20px;background:#c6c6c6;z-index:99998';host.style.width=style.width;host.style.height=style.height;host.append(clone);document.body.append(host); });
  expect(await page.locator('#invalid-actual-layer').boundingBox()).toEqual({ x: 20, y: 20, width, height });
  const actual = await page.locator('#invalid-layer-host').screenshot();
  await page.evaluate(async ({ original, width, height }) => { const preload = new Image(); preload.src = original; await preload.decode(); const host = document.getElementById('invalid-layer-host')!; host.replaceChildren(); const image = document.createElement('span'); image.style.cssText = `position:fixed;left:20px;top:20px;z-index:99999;width:${width}px;height:${height}px;image-rendering:pixelated;background:url("${original}") 0 0/${width}px ${height}px no-repeat`;host.append(image); }, { original, width, height });
  same(actual, await page.locator('#invalid-layer-host').screenshot(), `${kind} original crossout`);
  await page.locator('#invalid-layer-host').evaluate(node => node.remove());
  const result = region.locator(`.mc-${kind}__result`); await expect(result).toHaveAttribute('aria-disabled', 'true');
  await result.focus(); await expect(result).toBeFocused(); await result.press('Enter'); await result.click({ button: 'right', force: true });
  await expect(page.getByLabel('Result and selection actions')).toHaveText('0');
});
