import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import ts from 'typescript';

// Independently frozen release bytes. Production CSS/manifest are never the oracle.
const release = '15701fa9c13923f12662984c32c124327e40e3d3';
const definitions = [
  ['play_screen.json', '10b1cab24aeee5cb5a875255bb6ffe266ca4056394c05f1c4d99b8cc56cf805a'],
  ['resource_packs_screen.json', 'c73819a074d90e63268f9b52e86ce32179f10989288aefdd18a66c6ba394f3ae'],
  ['pause_screen.json', '4abc34ecc4dd9e87d671aae32936d3c51b2ea498fc861f0af710e17be2a158a8'],
  ['ui_template_buttons.json', '3e250faef134965386ced074d73c998d2a363c79fed14ec928668cb7ff70ea96'],
] as const;
const images = [
  ['button_borderless_dark.png', 'fc332fee4a0f800491f1e6ad4925e175e556bcfcba5d587678dc1731f1780548', 4, 4],
  ['button_borderless_darkhover.png', '40c380b48b04c5a9b222b0f9f95ecaa7fb97295d2e776f1094a323886d4f849b', 4, 4],
  ['button_borderless_darkpressed.png', 'f2037494b69a14f90f008cc0d5f74c8280bac9bc2bfba9f4405ead8c103c9532', 4, 4],
  ['disabledButtonNoBorder.png', '5a04f3b69f14cd1750b6c818310964e91f4962afc38cfe7bef41ad3c0fb4b27f', 2, 2],
  ['editIcon.png', '53689fd0a99a52c18591f9d5638ed868d79555bc454ff321b2b63aaef1236563', 22, 16],
  ['online.png', 'e2782521b081320bc3785780e409b64bc8cbd22799207f532bb54398f0f91094', 7, 7],
  ['offline.png', 'a05d38826a76ff5abb58f3f6c1a38fb1975cc1dcd5d6be336f7b73c359c7aec9', 7, 7],
  ['default_world.png', 'd1ea2e0920619595a419a380cedaa23341123eed3a501da0e63eb22745b59ee8', 128, 128],
  ['missing_pack_icon.png', 'cd20f4aa8dbae47340be8906ba8cdc372551f45e5aacee5fb052860b076f6b51', 64, 64],
] as const;
async function source(name: string, hash: string, image = false) {
  let bytes: Buffer;
  try { bytes = await readFile(new URL(`../.cache/${image ? 'references' : 'game-lists-source'}/${name}${image ? '' : '.public.jsonc'}`, import.meta.url)); }
  catch {
    const response = await fetch(`https://raw.githubusercontent.com/Mojang/bedrock-samples/${release}/resource_pack/${image ? 'textures/ui' : 'ui'}/${name}`);
    if (!response.ok) throw new Error(`Original ${name}: ${response.status}`); bytes = Buffer.from(await response.arrayBuffer());
  }
  expect(createHash('sha256').update(bytes).digest('hex'), name).toBe(hash); return bytes;
}
function entry(archive: Buffer, name: string) {
  const count = archive.readUInt32LE(8), base = 16 + count * 256;
  for (let i = 0; i < count; i++) { const row = 16 + i * 256; if (archive.toString('utf8', row + 1, row + 1 + archive[row]!) === name) {
    const start = base + archive.readUInt32LE(row + 248); return archive.subarray(start, start + archive.readUInt32LE(row + 252));
  } }
  throw new Error(`Missing native archive entry: ${name}`);
}
function child(control: any, name: string): any { const value = control.controls.find((item: any) => name in item)?.[name]; if (!value) throw new Error(`Missing native child ${name}`); return value; }

test('original public and installed JSON declare list geometry, inherited content insets and native actions', async () => {
  const docs: Record<string, any> = {};
  for (const [name, hash] of definitions) { const result = ts.parseConfigFileTextToJson(name, (await source(name, hash)).toString()); expect(result.error).toBeUndefined(); docs[name] = result.config; }
  const play = docs['play_screen.json'], packs = docs['resource_packs_screen.json'], pause = docs['pause_screen.json'], buttons = docs['ui_template_buttons.json'];
  expect(play.local_world_item.size).toEqual(['100%',29]); expect(child(play.local_world_item, 'header_button_panel@play.header_button_panel').size).toEqual(['100%','100% + 1px']);
  expect(child(buttons.new_ui_button_panel, 'button_content')['$button_content_size|default']).toEqual(['100% - 6px','100% - 6px']);
  expect(child(play['collection_world_screenshot@play.world_screenshot_base'], 'screenshot_picture')).toMatchObject({ size: ['173.91%y','100% - 2px'], offset: [1,1] });
  expect(play['local_world_item_button@common_buttons.dark_content_button'].$pressed_button_name).toBe('button.menu_start_local_world');
  expect(play['local_world_edit_button@common_buttons.dark_glyph_button'].$pressed_button_name).toBe('button.menu_local_world_item_edit');
  expect(play.network_world_item.size).toEqual(['100%',30]); expect(child(play.network_world_item,'network_world_item_button@play.network_world_item_button').size).toEqual(['100%','100% + 1px']);
  expect(play.game_online_icon).toMatchObject({ texture: 'textures/ui/online', size: [8,8] });
  expect(pause.player_grid_item.size).toEqual(['100%',27]); expect(pause.player_gamer_pic.size).toEqual([18,18]); expect(pause.player_button_content).toMatchObject({ size: ['100% - 4px','100% - 4px'], offset: [4,0] });
  expect(pause['player_permission_button@common_buttons.dark_content_button'].size).toEqual([28,'100%']);
  expect(packs.selected_pack_panel.min_size).toEqual(['100% - 2px','50px']); expect(child(packs.selected_pack_button_layout,'selected_icon_image@resource_packs.selected_icon_image')).toMatchObject({ size: [42,42], offset: [1,0] });
  expect(packs['selected_pack_up_button@resource_packs.selected_pack_transparent_movement_button'].$pressed_button_name).toBe('$button.sort_up');
  expect(packs['selected_pack_down_button@resource_packs.selected_pack_transparent_movement_button'].$pressed_button_name).toBe('$button.sort_down');
  const nativePath = join(process.env.MCBE_INSTALL_ROOT ?? 'C:/XboxGames/Minecraft for Windows/Content','data/resource_packs/vanilla/__brarchive/ui.brarchive');
  if (existsSync(nativePath)) { const archive = await readFile(nativePath); for (const [name] of definitions) expect(JSON.parse(entry(archive,name).toString()), name).toEqual(docs[name]); }
});

test('public PNG hashes, physical dimensions, installed bytes and embedded source data stay original', async () => {
  const css = await readFile(new URL('../src/game-list-textures.css',import.meta.url),'utf8');
  const embedded = Array.from(css.matchAll(/data:image\/png;base64,([^"\)]+)/g), match => Buffer.from(match[1]!, 'base64'));
  const nativePath = join(process.env.MCBE_INSTALL_ROOT ?? 'C:/XboxGames/Minecraft for Windows/Content','data/resource_packs/vanilla/__brarchive/textures/ui.brarchive');
  const native = existsSync(nativePath) ? await readFile(nativePath) : undefined;
  for (const [name, hash, width, height] of images) {
    const bytes = await source(name,hash,true), png = PNG.sync.read(bytes); expect([png.width,png.height],name).toEqual([width,height]);
    expect(embedded.some(image => image.equals(bytes)),`${name} embedded without redraw`).toBe(true); if (native) expect(entry(native,name),name).toEqual(bytes);
  }
});

function blank(width: number, height: number, border: number) {
  const png = new PNG({ width,height }); for (let i=0; i<png.data.length; i+=4) { png.data[i]=border; png.data[i+1]=border; png.data[i+2]=border; png.data[i+3]=255; } return png;
}
function slice(target: PNG, source: PNG) {
  const width=target.width-4,height=target.height-4;
  for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
    const sx=x<2 ? 0 : x>=width-2 ? source.width-1 : 1+Math.floor((x-2)*(source.width-2)/(width-4));
    const sy=y<2 ? 0 : y>=height-2 ? source.height-1 : 1+Math.floor((y-2)*(source.height-2)/(height-4));
    const src=(sy*source.width+sx)*4,dst=((y+2)*target.width+x+2)*4;
    for (let channel=0;channel<4;channel++) target.data[dst+channel]=source.data[src+channel]!;
  }
}
for (const state of ['default','hover','pressed','disabled'] as const) test(`Classic dark ${state} complete surface matches independent original PNG composition`, async ({ page }) => {
  await page.goto('/calibration.html'); await page.evaluate(() => document.fonts.ready);
  const target = page.getByRole('group',{ name:'Fixture servers',exact:true }).locator(`[data-list-primary="${state==='disabled' ? 'locked' : 'creative'}"]`);
  await target.evaluate(node => { Object.assign((node as HTMLElement).style,{ position:'fixed',left:'16px',top:'16px',width:'240px',height:'62px',zIndex:'2147483647' }); const label=node.querySelector<HTMLElement>('.mc-button__label'); if(label) label.style.visibility='hidden'; });
  await page.mouse.move(0,0); if(state==='hover' || state==='pressed') await target.hover(); if(state==='pressed') await page.mouse.down();
  const name = state==='disabled' ? 'disabledButtonNoBorder.png' : state==='hover' ? 'button_borderless_darkhover.png' : state==='pressed' ? 'button_borderless_darkpressed.png' : 'button_borderless_dark.png';
  const image = images.find(image=>image[0]===name)!;
  const expected=blank(240,62,state==='hover'||state==='pressed' ? 255 : 19); slice(expected,PNG.sync.read(await source(image[0],image[1],true)));
  const actual=PNG.sync.read(await target.screenshot());
  await mkdir(new URL('../.cache/game-lists-qa/images/',import.meta.url),{recursive:true});
  await writeFile(new URL(`../.cache/game-lists-qa/images/surface-${state}-actual.png`,import.meta.url),PNG.sync.write(actual));
  await writeFile(new URL(`../.cache/game-lists-qa/images/surface-${state}-expected.png`,import.meta.url),PNG.sync.write(expected));
  expect([actual.width,actual.height]).toEqual([expected.width,expected.height]); let mismatch=0;
  for(let i=0;i<actual.data.length;i+=4) if([0,1,2,3].some(c=>actual.data[i+c]!==expected.data[i+c])) mismatch++;
  expect(mismatch,'Full surface RGBA mismatch count; text explicitly excluded').toBe(0); if(state==='pressed') await page.mouse.up();
});

test('world, server, player and pack browser geometry follows independent source dimensions at scale 1 and 2', async ({ page }) => {
  await page.goto('/calibration.html');
  const world=page.locator('[data-case="game-worlds"]'), server=page.locator('[data-case="game-servers"]'), player=page.locator('[data-case="game-player"]'), pack=page.locator('[data-case="game-packs"]');
  await expect(world.locator('.mc-world-list__row').first()).toHaveCSS('height','58px'); await expect(world.locator('[data-list-primary]').first()).toHaveCSS('height','60px');
  await expect(world.locator('.mc-world-list__thumbnail .mc-image')).toHaveAttribute('height','44'); await expect(world.locator('.mc-game-list__glyph--edit').first()).toHaveCSS('width','44px');
  // Cross-axis %y uses the element own other dimension. The former parent-height
  // assumption was corrected after independent native Loading-logo evidence.
  const thumbnail = await world.locator('.mc-world-list__thumbnail .mc-image').boundingBox(), border = await world.locator('.mc-world-list__thumbnail').first().boundingBox();
  expect(thumbnail).not.toBeNull(); expect(border).not.toBeNull();
  expect(Math.abs(thumbnail!.width - 22 * 1.7391 * 2)).toBeLessThan(.02); expect(Math.abs(border!.width - (22 * 1.7391 + 2) * 2)).toBeLessThan(.02);
  await expect(server.locator('.mc-server-list__row').first()).toHaveCSS('height','60px'); await expect(server.locator('[data-list-primary]').first()).toHaveCSS('height','62px');
  await expect(server.locator('.mc-game-list__glyph--online')).toHaveCSS('width','16px');
  await expect(player.locator('.mc-player-card')).toHaveCSS('height','54px'); await expect(player.locator('.mc-player-card__primary')).toHaveCSS('height','56px'); await expect(player.locator('.mc-player-card__portrait .mc-image')).toHaveCSS('width','36px');
  await expect(pack.locator('.mc-pack-card__thumbnail').first()).toHaveCSS('width','84px'); await expect(pack.locator('.mc-pack-card__select').first()).toHaveCSS('height','88px'); await expect(pack.locator('.mc-pack-card__move').first()).toHaveCSS('height','36px');
  const one=page.locator('[data-case="game-scale-one"]'); await expect(one.locator('.mc-world-list__row')).toHaveCSS('height','29px'); await expect(one.locator('.mc-server-list__row')).toHaveCSS('height','30px');
  await expect(one.locator('.mc-player-card')).toHaveCSS('height','27px'); await expect(one.locator('.mc-pack-card__thumbnail')).toHaveCSS('width','42px');
});
