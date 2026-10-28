import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import ts from 'typescript';

// Frozen from independent installed-archive / official-full-release reads.
// No production CSS, generated texture maps or geometry manifest provides expectations.
const sources = [
  ['magnifying_glass.png', 'f3aebd4ae834bf0b7e08c517a1bb9d166cb3a7bac60cec37659cefb7e1627b29', 7, 7],
  ['close_X_button.png', '90c419d3f7caaf146d566d80e0aa4d340dde485c33fc4490fb440810f3165286', 15, 15],
  ['close_X_button_hover.png', '207a4d09f161b60e396caadba5f135985b6304787bcd9aa42d82f394511ee2bf', 15, 15],
  ['text_label_box.png', '3e97f09cef95d5d42d557d4971233a46f12a0e754a6c0e445dfb8f56a5b13b42', 4, 4],
  ['undoArrow.png', '41eff2b295f28ccb2f7fb3cb163f03fc95a02439ec87173c3fa29bccacce3653', 14, 14],
  ['button_borderless_light.png', '313b607889ba3d224cf599420087876ccb3f4572b304dc1ba6c25825f7d2c376', 4, 4],
  ['button_borderless_lighthover.png', 'e4cdc816ebbfae2bea1e870fbde0c59effd680cdec388ba1e66424645573aea8', 4, 4],
  ['button_borderless_lightpressed.png', '47f6ed1760ae8e407cdbb6b7207a5ee45b8a0db861f16f0696c5cf61c9961983', 4, 4],
  ['button_borderless_lightpressednohover.png', 'c3e928f9c58b6cf42399686ba71f5656de59a2dadcdd6cee9b26111ec5200c52', 4, 4],
  ['disabledButtonNoBorder.png', '5a04f3b69f14cd1750b6c818310964e91f4962afc38cfe7bef41ad3c0fb4b27f', 2, 2],
] as const;
const definitions = [
  ['ui_common.json', '0aae480d123b2c8667463776f8b0eabad665bc0378b287acd0babcf41d8083a6'],
  ['ui_template_toggles.json', 'efe2bf9fab47aa5e29d7116a2aa705a964a42b0ef86c947c4e46188be9ac2a01'],
  ['ui_template_buttons.json', '3e250faef134965386ced074d73c998d2a363c79fed14ec928668cb7ff70ea96'],
  ['_global_variables.json', 'ea39206de2c7b6f157def5cdf1662767c0ccd9560dfafb1378c3c364b236f69b'],
  ['settings_sections/settings_common.json', '36863803c56e42d31b915aa9df13cf88cc43a528eb40c76cbf26c911ef7b3ecf'],
  ['settings_sections/controls_section.json', 'a21e90f7d63f93e1683858da1d5d51271585d2d7af729c9c5fdaa28d8e68d5f4'],
] as const;
const output = new URL('../.cache/settings-qa-output/', import.meta.url);
async function original(name: string) {
  const source = sources.find(source => source[0] === name); if (!source) throw new Error(`Unpinned settings PNG: ${name}`);
  let bytes: Buffer;
  try { bytes = await readFile(new URL(`../.cache/settings-independent/${name}`, import.meta.url)); }
  catch {
    try { bytes = await readFile(new URL(`../.cache/references/${name}`, import.meta.url)); }
    catch {
      const response = await fetch(`https://raw.githubusercontent.com/Mojang/bedrock-samples/15701fa9c13923f12662984c32c124327e40e3d3/resource_pack/textures/ui/${name}`);
      if (!response.ok) throw new Error(`Original source ${name}: ${response.status}`); bytes = Buffer.from(await response.arrayBuffer());
    }
  }
  expect(createHash('sha256').update(bytes).digest('hex'), name).toBe(source[1]); return bytes;
}
function entry(archive: Buffer, name: string) {
  const count = archive.readUInt32LE(8), base = 16 + count * 256;
  for (let index = 0; index < count; index++) {
    const row = 16 + index * 256;
    if (archive.toString('utf8', row + 1, row + 1 + archive[row]!) !== name) continue;
    return archive.subarray(base + archive.readUInt32LE(row + 248), base + archive.readUInt32LE(row + 248) + archive.readUInt32LE(row + 252));
  }
  throw new Error(`Missing original archive entry ${name}`);
}
function child(control: any, name: string): any { const value = control.controls.find((value: any) => name in value)?.[name]; if (!value) throw new Error(`Missing original child ${name}`); return value; }

test('settings PNG files retain independently frozen original hashes and physical dimensions', async () => {
  for (const [name, , width, height] of sources) { const image = PNG.sync.read(await original(name)); expect([image.width, image.height], name).toEqual([width, height]); }
});

test('independent public/native source declares exact toggle, search, navigation and binding geometry', async () => {
  const publicSource: Record<string, any> = {};
  for (const [name, hash] of definitions) {
    const cached = new URL(`../.cache/settings-independent/${name.includes('/') ? name.split('/').at(-1) + '.public.jsonc' : name.replace(/\.json$/, '.public.jsonc')}`, import.meta.url);
    let bytes: Buffer;
    try { bytes = await readFile(cached); }
    catch {
      const response = await fetch(`https://raw.githubusercontent.com/Mojang/bedrock-samples/15701fa9c13923f12662984c32c124327e40e3d3/resource_pack/ui/${name}`);
      if (!response.ok) throw new Error(`Original JSON ${name}: ${response.status}`); bytes = Buffer.from(await response.arrayBuffer());
    }
    expect(createHash('sha256').update(bytes).digest('hex'), name).toBe(hash);
    const parsed = ts.parseConfigFileTextToJson(name, bytes.toString()); expect(parsed.error).toBeUndefined(); publicSource[name] = parsed.config;
  }
  const common = publicSource['ui_common.json'], toggles = publicSource['ui_template_toggles.json'], settings = publicSource['settings_sections/settings_common.json'], controls = publicSource['settings_sections/controls_section.json'], globals = publicSource['_global_variables.json'];
  expect(toggles['light_template_toggle@common.toggle']).toMatchObject({ '$default_texture|default': 'textures/ui/button_borderless_light', '$hover_texture|default': 'textures/ui/button_borderless_lightpressednohover', '$pressed_texture|default': 'textures/ui/button_borderless_lighthover', '$pressed_no_hover_texture|default': 'textures/ui/button_borderless_lightpressed', '$locked_texture|default': 'textures/ui/disabledButtonNoBorder' });
  expect(common['text_edit_control@common.text_edit_box']).toMatchObject({ '$magnifying_glass_size': [8, 8], '$magnifying_glass_offset': [0, -.5], '$text_clear_button_size': [15, 15], '$text_clear_button_offset': [2, 0], '$text_edit_box_label_offset': [10, 0] });
  expect(settings['section_toggle_base@common_toggles.light_ui_toggle']).toMatchObject({ size: ['100%', '30px'], '$button_size_override': ['100%', '100% + 1px'] });
  expect(settings.toggle_button_control).toMatchObject({ '$glyph_offset|default': [5, 0], '$button_label_offset|default': [34, 0] });
  const core = settings.option_generic_core, stacked = child(core, 'two_line_layout'); expect(child(stacked, 'spacer').size).toEqual([0, 1]); expect(child(core, 'spacer').size).toEqual([0, 4]);
  expect(controls.keymapping_item.size).toEqual(['100%', 35]); expect(child(controls.keymapping_item, 'option_info_label_control')).toMatchObject({ texture: 'textures/ui/text_label_box', size: ['fill', '100% - 4px'] });
  expect(child(controls.keymapping_item, 'keymapping_button_0@binding_button').size).toEqual(['40% + 1px', '100% - 4px']); expect(child(controls.keymapping_item, 'keymapping_button_1@controls_section.reset_binding_button').size).toEqual(['15% + 1px', '100% - 4px']); expect(controls.arrow_reset).toMatchObject({ size: [16, 16], texture: 'textures/ui/undoArrow' }); expect(globals.$generic_button_text_color).toEqual([1, 1, 1]);
  const install = process.env.MCBE_INSTALL_ROOT ?? 'C:/XboxGames/Minecraft for Windows/Content';
  const nativePath = join(install, 'data/resource_packs/vanilla/__brarchive/ui.brarchive');
  if (existsSync(nativePath)) {
    const archive = await readFile(nativePath), sectionArchive = await readFile(join(install, 'data/resource_packs/vanilla/__brarchive/ui/settings_sections.brarchive'));
    for (const [name] of definitions) expect(JSON.parse(entry(name.includes('/') ? sectionArchive : archive, name.split('/').at(-1)!).toString()), name).toEqual(publicSource[name]);
    const textureArchive = await readFile(join(install, 'data/resource_packs/vanilla/__brarchive/textures/ui.brarchive'));
    for (const [name] of sources) expect(entry(textureArchive, name), name).toEqual(await original(name));
    expect(JSON.parse(entry(textureArchive, 'text_label_box.json').toString())).toEqual({ nineslice_size: 1, base_size: [4, 4] });
  }
});

async function open(page: Page) { await page.goto('/calibration.html'); await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0); }
function blank(width: number, height: number, color: readonly number[]) {
  const image = new PNG({ width, height }); for (let offset = 0; offset < image.data.length; offset += 4) { image.data[offset] = color[0]!; image.data[offset + 1] = color[1]!; image.data[offset + 2] = color[2]!; image.data[offset + 3] = 255; } return image;
}
function nineSlice(target: PNG, source: PNG, x: number, y: number, width: number, height: number) {
  for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
    const sx = px < 2 ? 0 : px >= width - 2 ? source.width - 1 : 1 + Math.floor((px - 2) * (source.width - 2) / (width - 4));
    const sy = py < 2 ? 0 : py >= height - 2 ? source.height - 1 : 1 + Math.floor((py - 2) * (source.height - 2) / (height - 4));
    const origin = (sy * source.width + sx) * 4, offset = ((py + y) * target.width + px + x) * 4;
    for (let channel = 0; channel < 4; channel++) target.data[offset + channel] = source.data[origin + channel]!;
  }
}
async function compare(actual: Buffer, expected: Buffer, name: string) {
  await mkdir(new URL('images/', output), { recursive: true }); await writeFile(new URL(`images/${name}-actual.png`, output), actual); await writeFile(new URL(`images/${name}-expected.png`, output), expected);
  const a = PNG.sync.read(actual), e = PNG.sync.read(expected); expect([a.width, a.height]).toEqual([e.width, e.height]); let changed = 0;
  for (let offset = 0; offset < a.data.length; offset += 4) if ([0, 1, 2, 3].some(channel => a.data[offset + channel] !== e.data[offset + channel])) changed++;
  expect(changed, 'RGBA pixels differing from independent raw-source reference').toBe(0);
}
async function glyph(page: Page, target: Locator, name: string, size: number, outputName: string) {
  await expect(target).toHaveCSS('width', `${size}px`); await expect(target).toHaveCSS('height', `${size}px`);
  await target.evaluate((node, size) => { Object.assign((node as HTMLElement).style, { position: 'fixed', left: '16px', top: '16px', width: `${size}px`, height: `${size}px`, zIndex: '2147483646', backgroundColor: '#28292a' }); }, size);
  const url = `data:image/png;base64,${(await original(name)).toString('base64')}`;
  await page.evaluate(({ url, size }) => {
    document.getElementById('independent-settings-glyph')?.remove(); const plane = document.createElement('div'); plane.id = 'independent-settings-glyph'; Object.assign(plane.style, { position: 'fixed', left: '640px', top: '16px', width: `${size}px`, height: `${size}px`, background: '#28292a', zIndex: '2147483647' });
    const image = document.createElement('img'); image.src = url; Object.assign(image.style, { display: 'block', width: `${size}px`, height: `${size}px`, maxWidth: 'none', maxHeight: 'none', imageRendering: 'pixelated' }); plane.append(image); document.body.append(plane);
  }, { url, size });
  await page.locator('#independent-settings-glyph img').evaluate(node => (node as HTMLImageElement).decode());
  await compare(await target.screenshot(), await page.locator('#independent-settings-glyph').screenshot(), outputName);
}
for (const [state, fixture, file, border] of [
  ['off', 'settings-pixel-toggle-off', 'button_borderless_light.png', 19],
  ['on', 'settings-pixel-toggle-on', 'button_borderless_lightpressednohover.png', 19],
  ['locked', 'settings-pixel-toggle-locked', 'disabledButtonNoBorder.png', 19],
  ['hover', 'settings-pixel-toggle-off', 'button_borderless_lighthover.png', 255],
  ['on-hover', 'settings-pixel-toggle-on', 'button_borderless_lightpressed.png', 255],
] as const) test(`toggle ${state} surface retains the original source PNG and explicit border`, async ({ page }) => {
  await open(page); const target = page.locator(`[data-case="${fixture}"] button`); await target.evaluate(node => Object.assign((node as HTMLElement).style, { position: 'fixed', left: '16px', top: '16px', zIndex: '2147483646' })); if (state.includes('hover')) await target.hover(); else await page.mouse.move(0, 0);
  await expect(target).toHaveCSS('width', '180px'); await expect(target).toHaveCSS('height', '48px');
  const expected = blank(180, 48, [border, border, border]); nineSlice(expected, PNG.sync.read(await original(file)), 2, 2, 176, 44);
  await compare(await target.screenshot(), PNG.sync.write(expected), `toggle-${state}`);
});

test('search magnifier preserves original PNG and source 8x8 logical image extent', async ({ page }) => { await open(page); await glyph(page, page.locator('[data-case="settings-pixel-search"] .mc-search-field__icon'), 'magnifying_glass.png', 16, 'search-icon'); });
for (const hover of [false, true]) test(`search clear ${hover ? 'hover' : 'default'} retains its original 15x15 PNG`, async ({ page }) => {
  await open(page); const button = page.locator('[data-case="settings-pixel-search"] .mc-search-field__clear'); await button.scrollIntoViewIfNeeded(); if (hover) await button.hover(); else await page.mouse.move(0, 0); await glyph(page, button.locator('span'), hover ? 'close_X_button_hover.png' : 'close_X_button.png', 30, `search-clear-${hover}`);
});
test('keybinding reset uses the original undo arrow at the declared 16x16 image extent', async ({ page }) => { await open(page); await glyph(page, page.locator('[data-case="settings-pixel-keybinding"] .mc-keybinding__reset .mc-button__label > span'), 'undoArrow.png', 32, 'binding-reset'); });
test('keymapping label uses the source one-pixel nine-slice and generic white label color', async ({ page }) => {
  await open(page); const label = page.locator('[data-case="settings-pixel-keybinding"] .mc-keybinding__label'); await expect(label).toHaveCSS('color', 'rgb(255, 255, 255)');
  const rect = await label.boundingBox(); if (!rect) throw new Error('Missing label'); expect(rect.height).toBe(62);
  await label.evaluate((node, width) => { Object.assign((node as HTMLElement).style, { position: 'fixed', left: '16px', top: '16px', width: `${width}px`, zIndex: '2147483646', color: 'transparent', textShadow: 'none' }); }, rect.width);
  const expected = blank(Math.round(rect.width), 62, [40, 41, 42]); nineSlice(expected, PNG.sync.read(await original('text_label_box.png')), 0, 0, expected.width, 62);
  await compare(await label.screenshot(), PNG.sync.write(expected), 'binding-label-surface');
});
test('binding and setting-row public geometry remains source-sized without typography certification', async ({ page }) => {
  await open(page); const root = page.locator('[data-case="settings-pixel-keybinding"] .mc-keybinding__row'), rect = await root.boundingBox(); if (!rect) throw new Error('Missing row'); expect(rect.height).toBe(70);
  const button = await root.locator('.mc-keybinding__button').boundingBox(), reset = await root.locator('.mc-keybinding__reset').boundingBox(); if (!button || !reset) throw new Error('Missing bindings'); expect(button.height).toBe(62); expect(reset.height).toBe(62); expect(Math.abs(button.width - (rect.width * .4 + 2))).toBeLessThanOrEqual(.02); expect(Math.abs(reset.width - (rect.width * .15 + 2))).toBeLessThanOrEqual(.02);
  const row = page.locator('[data-case="settings-row"] .mc-setting-row'); await expect(row).toHaveCSS('row-gap', '2px'); await expect(row).toHaveCSS('padding-bottom', '8px');
  const nav = page.getByRole('navigation', { name: 'Fixture navigation', exact: true }); for (const item of await nav.getByRole('button').all()) await expect(item).toHaveCSS('height', '60px');
});

test('setting description uses a neutral source-derived Web color with host and Panel overrides', async ({ page }) => {
  const definition = definitions.find(([name]) => name === '_global_variables.json')!;
  let bytes: Buffer;
  try { bytes = await readFile(new URL('../.cache/settings-independent/_global_variables.public.jsonc', import.meta.url)); }
  catch {
    const response = await fetch('https://raw.githubusercontent.com/Mojang/bedrock-samples/15701fa9c13923f12662984c32c124327e40e3d3/resource_pack/ui/_global_variables.json');
    if (!response.ok) throw new Error(`Original global variables: ${response.status}`); bytes = Buffer.from(await response.arrayBuffer());
  }
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(definition[1]);
  const source = ts.parseConfigFileTextToJson('_global_variables.json', bytes.toString()); expect(source.error).toBeUndefined();
  const nativeColor: number[] = source.config.$option_description_text_color; expect(nativeColor).toEqual([.7, .7, .7]);
  // Native JSON proves neutrality, not GPU quantization. This project's explicit
  // Web profile chooses the lower 8-bit value, 178, for the 178.5-channel source.
  const webColor = nativeColor.map(channel => Math.floor(channel * 255)); expect(webColor).toEqual([178, 178, 178]);
  await open(page); const standalone = page.locator('[data-case="settings-row"] .mc-setting-row__description');
  await expect(standalone).toHaveCSS('color', `rgb(${webColor.join(', ')})`);
  await expect(page.locator('[data-case="settings-panel-row"] .mc-setting-row__description')).toHaveCSS('color', 'rgb(76, 76, 76)');
  await expect(page.locator('[data-case="settings-panel-inset-row"] .mc-setting-row__description')).toHaveCSS('color', 'rgb(221, 221, 221)');
  await page.locator('[data-case="settings-row"] .mc-setting-row').evaluate(node => (node as HTMLElement).style.setProperty('--mc-setting-description-color', '#123456'));
  await expect(standalone).toHaveCSS('color', 'rgb(18, 52, 86)');
});
