import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

// Independent oracle: Mojang v1.26.60.5 full release, resource_pack/ui/
// {inventory_screen,furnace_screen,blast_furnace_screen,smoker_screen}.json.
// https://github.com/Mojang/bedrock-samples/releases/download/v1.26.60.5/bedrock-samples-v1.26.60.5-full.zip
// ZIP SHA256 d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf.
// Whole parsed objects match the installed 1.26.6005.0 UI archive. Expectations
// below come from original anchors/formulas/PNGs, never production CSS or SVGs.
const root = { width: 176, height: 166 };
const top = { width: root.width, height: root.height / 2 - 12, y: 7 };
const halfWidth = top.width / 2;
const nestedInput = { x: halfWidth - 16, y: top.y + (top.height - 16) / 2 };
const furnace = {
  input: { x: nestedInput.x + 16 - 18 - 20, y: nestedInput.y + (16 - 18) / 2 - 19, width: 18, height: 18 },
  fuel: { x: nestedInput.x + 16 - 18 - 20, y: nestedInput.y + (16 - 18) / 2 + 19, width: 18, height: 18 },
  flame: { x: nestedInput.x + (16 - 13) / 2 - 21, y: nestedInput.y + (16 - 13) / 2, width: 13, height: 13 },
  arrow: { x: (top.width - 22) / 2, y: top.y + (top.height - 15) / 2, width: 22, height: 15 },
  result: { x: halfWidth + 20, y: top.y + (top.height - 26) / 2, width: 26, height: 26 },
};
const bench = {
  grid: { x: 29, y: 5 + 11, width: 54, height: 54 },
  title: { x: 29 - 15, y: 5, width: 84, height: 10 },
  arrow: { x: 29 + 61, y: 35.5, width: 22, height: 15 },
  result: { x: 29 + 94, y: 30, width: 26, height: 26 },
};
const originalAssets = [
  ['arrow_active.png', '37c7da283f77fc1c175696c7a479aa4afaad17d7e68d4f114b54b7ba439aedee', 22, 15],
  ['arrow_inactive.png', '9c549ac5595bc65cbc5ca9bacfc8486b0a2961118152460878c4926ffc3c2457', 22, 15],
  ['flame_full_image.png', '2cf0471cb2a0aa060c209f3a0dfd866caf795135dbd594ac1768273725aee196', 13, 13],
  ['flame_empty_image.png', '9b04056628f93cfba11f4d4de35370d903dadd4f9f77c71dcd2137f4b1c9cecc', 13, 13],
  ['arrow_large.png', 'c0b27d51e084d0018365a94905e53e8661cf0f05448145c71402ff16844fe1b6', 22, 15],
] as const;
type Box = { x: number; y: number; width: number; height: number };
async function box(locator: Locator): Promise<Box> {
  const bounds = await locator.boundingBox();
  if (!bounds) throw new Error('Missing processing source comparison region');
  return bounds;
}
async function rect(locator: Locator, frame: Box, expected: {x:number;y:number;width?:number;height?:number}) {
  const actual = await box(locator);
  for (const dimension of ['x', 'y', 'width', 'height'] as const) {
    const value = expected[dimension]; if (value === undefined) continue;
    const relative = actual[dimension] - (dimension === 'x' || dimension === 'y' ? frame[dimension] : 0);
    // 1/64 CSS px layout arithmetic, not native final raster equivalence.
    expect(Math.abs(relative - value * 2), `original JSON ${dimension}`).toBeLessThanOrEqual(.02);
  }
}
async function open(page: Page, path = '/') {
  await page.goto(path); await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0);
}
function station(page:Page, variant:string) {
  const className = variant === 'furnace' ? '.mc-furnace:not(.mc-blast-furnace):not(.mc-smoker)' : `.mc-${variant}`;
  return page.locator(`#processing [data-processing-examples] ${className}`);
}
async function png(name: string) {
  return PNG.sync.read(await readFile(new URL(`../.cache/references/${name}`, import.meta.url)));
}
async function capture(locator: Locator, name: string) {
  await mkdir(new URL('../.cache/processing-qa/', import.meta.url), {recursive:true});
  return PNG.sync.read(await locator.screenshot({ path:fileURLToPath(new URL(`../.cache/processing-qa/${name}.png`, import.meta.url)) }));
}
async function originalPngPlane(page:Page, kind:'arrow'|'fuel', progress:number) {
  const empty=await readFile(new URL(`../.cache/references/${kind==='arrow'?'arrow_inactive.png':'flame_empty_image.png'}`,import.meta.url));
  const full=await readFile(new URL(`../.cache/references/${kind==='arrow'?'arrow_active.png':'flame_full_image.png'}`,import.meta.url));
  // Independent source-image control. A viewport crops full-size <img> elements;
  // production uses CSS clip-path. Chromium supplies its own premultiplied-alpha
  // quantization (including the arrow's alpha=35), without channel tolerances.
  await page.evaluate(({kind,progress,empty,full})=>{
    const width=kind==='arrow'?44:26,height=kind==='arrow'?30:26;
    const plane=document.createElement('div');plane.id='independent-original-png-plane';
    Object.assign(plane.style,{position:'fixed',left:'96px',top:'16px',width:`${width}px`,height:`${height}px`,background:'#28292a',border:'0',padding:'0',margin:'0',zIndex:'2147483647'});
    const image=(url:string)=>{const node=document.createElement('img');node.src=url;Object.assign(node.style,{position:'absolute',left:'0',top:'0',width:`${width}px`,height:`${height}px`,maxWidth:'none',maxHeight:'none',imageRendering:'pixelated',display:'block'});return node;};
    plane.append(image(empty));
    const crop=document.createElement('div');
    Object.assign(crop.style,{position:'absolute',left:'0',top:kind==='arrow'?'0':`${height*(1-progress)}px`,width:`${kind==='arrow'?width*progress:width}px`,height:`${kind==='arrow'?height:height*progress}px`,overflow:'hidden'});
    const active=image(full);if(kind==='fuel') active.style.top=`${-height*(1-progress)}px`;crop.append(active);plane.append(crop);document.body.append(plane);
  },{kind,progress,empty:`data:image/png;base64,${empty.toString('base64')}`,full:`data:image/png;base64,${full.toString('base64')}`});
  const locator=page.locator('#independent-original-png-plane');
  await locator.locator('img').evaluateAll(images=>Promise.all(images.map(image=>(image as HTMLImageElement).decode())));
  return capture(locator,`${kind}-${progress*100}-expected`);
}

test('processing source images retain original dimensions, alpha, and hashes', async () => {
  for (const [name, hash, width, height] of originalAssets) {
    const bytes = await readFile(new URL(`../.cache/references/${name}`, import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex'), name).toBe(hash);
    const image = PNG.sync.read(bytes); expect([image.width,image.height], name).toEqual([width,height]);
    if(name==='arrow_active.png') expect([...new Set(Array.from(image.data).filter((_,index)=>index%4===3))].sort((a,b)=>a-b)).toEqual([0,35,255]);
  }
});

test('installed processing definitions independently confirm anchors, clipping and explicit focus edges', async () => {
  const installation = process.env.MCBE_INSTALL_ROOT ?? 'C:/XboxGames/Minecraft for Windows/Content';
  const path = join(installation, 'data/resource_packs/vanilla/__brarchive/ui.brarchive');
  test.skip(!existsSync(path), 'Optional native archive check requires a user-owned matching game installation.');
  const archive = await readFile(path), count = archive.readUInt32LE(8), payload = 16 + count * 256;
  const read = (name: string) => {
    for (let index = 0; index < count; index++) {
      const record = 16 + index * 256, length = archive[record]!;
      if (archive.toString('utf8', record + 1, record + 1 + length) !== name) continue;
      const offset = archive.readUInt32LE(record + 248), size = archive.readUInt32LE(record + 252);
      return JSON.parse(archive.toString('utf8', payload + offset, payload + offset + size));
    }
    throw new Error(`Original UI definition missing: ${name}`);
  };
  const f = read('furnace_screen.json'), c = read('inventory_screen.json');
  expect(f.furnace_panel_top_half.size).toEqual(['100%', '50% - 12px']);
  expect(f.furnace_panel_top_half.offset).toEqual([0,7]);
  expect(f.furnace_ingredient_panel.offset).toEqual([-20,-19]);
  expect(f.furnace_fuel_panel.offset).toEqual([-20,19]);
  expect(f.furnace_arrow_full_image.clip_direction).toBe('left');
  expect(f.furnace_arrow_full_image.bindings[0].binding_name).toBe('#furnace_arrow_ratio');
  expect(f.flame_full_image.clip_direction).toBe('down');
  expect(f.flame_full_image.bindings[0].binding_name).toBe('#furnace_flame_ratio');
  const fuel = f.furnace_fuel_panel.controls[0]['fuel_item@common.container_item'];
  const result = f.furnace_output_panel.controls[0]['output_item@common.container_item'];
  expect(fuel.$focus_override_right).toBe('furnace_output_item');
  expect(result.$focus_override_left).toBe('furnace_fuel_item');
  expect(result.$focus_override_right).toBe('FOCUS_OVERRIDE_STOP');
  expect(c.crafting_grid_3x3.size).toEqual([54,54]);
  expect(c.output_grid_3x3.size).toEqual([26,26]);
  expect(c.crafting_grid_3x3.controls[8]['crafting_input_item_bot_right@crafting.crafting_input_grid_item'].$focus_override_right).toBe('crafting_output_item');
  expect(read('blast_furnace_screen.json')['blast_furnace_screen@furnace.furnace_screen']).toEqual({});
  expect(read('smoker_screen.json')['smoker_screen@furnace.furnace_screen']).toEqual({});
});

test('furnace, blast furnace and smoker preserve source half-pixel geometry', async ({page}, testInfo) => {
  await open(page);
  for (const variant of ['furnace','blast-furnace','smoker']) {
    const region = station(page,variant), frame = await box(region);
    expect([frame.width,frame.height]).toEqual([root.width*2,root.height*2]);
    await rect(region.locator('.mc-furnace__input'), frame, furnace.input);
    await rect(region.locator('.mc-furnace__fuel'), frame, furnace.fuel);
    await rect(region.locator('.mc-furnace__result'), frame, furnace.result);
    await rect(region.locator('.mc-furnace__arrow'), frame, furnace.arrow);
    await rect(region.locator('.mc-furnace__flame'), frame, furnace.flame);
    const title = await box(region.locator('.mc-workstation__title'));
    expect(Math.abs(title.x+title.width/2-frame.x-root.width)).toBeLessThanOrEqual(.02);
    expect(Math.abs(title.y-frame.y-(top.y-3)*2)).toBeLessThanOrEqual(.02);
    const art = region.locator('.mc-furnace__result .mc-slot__item');
    const artBounds = await box(art), cell = await box(region.locator('.mc-furnace__result'));
    expect([artBounds.width,artBounds.height]).toEqual([32,32]);
    expect([artBounds.x-cell.x,artBounds.y-cell.y]).toEqual([10,10]);
    await capture(region, `${variant}-unmasked`);
    await testInfo.attach(`${variant}-unmasked-browser-implementation`, {path:fileURLToPath(new URL(`../.cache/processing-qa/${variant}-unmasked.png`,import.meta.url)),contentType:'image/png'});
  }
});

test('crafting uses original 3x3 bench offsets and large output rather than a generic inventory grid', async ({page}) => {
  await open(page); const region = page.locator('#processing [data-processing-examples] .mc-crafting'), frame = await box(region);
  expect([frame.width,frame.height]).toEqual([root.width*2,root.height*2]);
  await rect(region.locator('.mc-crafting__grid'), frame, bench.grid);
  await rect(region.locator('.mc-workstation__title'), frame, bench.title);
  await rect(region.locator('.mc-crafting__arrow'), frame, bench.arrow);
  await rect(region.locator('.mc-crafting__result'), frame, bench.result);
  const cells = region.locator('.mc-crafting__grid .mc-slot'); await expect(cells).toHaveCount(9);
  for(let index=0;index<9;index++) await rect(cells.nth(index), frame, {x:bench.grid.x+index%3*18,y:bench.grid.y+Math.floor(index/3)*18,width:18,height:18});
  await rect(region.locator('.mc-player-inventory__label'), frame, {x:29-21,y:72});
  const art = await box(region.locator('.mc-crafting__result .mc-slot__item'));
  expect([art.width,art.height]).toEqual([32,32]);
  await capture(region, 'crafting-unmasked');
});

test('all processing player inventory and hotbar cells follow common source anchors', async ({page}) => {
  await open(page);
  for(const variant of ['crafting','furnace','blast-furnace','smoker']) {
    const region = station(page,variant), frame = await box(region);
    const inventory = region.getByRole('grid',{name:'Inventory',exact:true}), hotbar=region.getByRole('grid',{name:'Hotbar',exact:true});
    await expect(inventory.getByRole('gridcell')).toHaveCount(27); await expect(hotbar.getByRole('gridcell')).toHaveCount(9);
    for(let index=0;index<27;index++) await rect(inventory.locator('.mc-slot').nth(index),frame,{x:7+index%9*18,y:86+Math.floor(index/9)*18,width:18,height:18});
    for(let index=0;index<9;index++) await rect(hotbar.locator('.mc-slot').nth(index),frame,{x:7+index*18,y:143,width:18,height:18});
    if(variant!=='crafting') await rect(region.locator('.mc-player-inventory__label'),frame,{x:7,y:76});
  }
});

// progress is the public visible fraction, not an asserted native binding value.
for(const kind of ['arrow','fuel'] as const) for(const progress of [0,.5,1]) {
  test(`${kind} progress ${progress} crops original pixels in the declared direction without stretching`,async({page})=>{
    await open(page,'/calibration.html');
    const selector=`[data-case="${kind==='arrow'?'processing-arrow':'fuel'}-${progress*100}"] .mc-${kind==='arrow'?'processing-arrow':'fuel-indicator'}`;
    const source=await png(kind==='arrow'?'arrow_inactive.png':'flame_empty_image.png');
    const specimen=page.locator(selector);
    await specimen.scrollIntoViewIfNeeded();
    const logical=await box(specimen);
    expect([logical.width,logical.height]).toEqual([source.width*2,source.height*2]);
    // Isolated skin plane only: fractional normal-flow top/scroll offsets make
    // Playwright expand a 30px DOM box into a 31px screenshot. Place this helper
    // specimen on a fixed integer screen plane before sampling original PNGs.
    // Main GUI layout and unmasked captures above are never snapped by tests.
    await specimen.evaluate(element=>Object.assign((element as HTMLElement).style,{position:'fixed',left:'16px',top:'16px',transform:'none',zIndex:'2147483647'}));
    const actual=await capture(specimen,`${kind}-${progress*100}-actual`);
    const expected=await originalPngPlane(page,kind,progress);
    expect([actual.width,actual.height]).toEqual([expected.width,expected.height]);
    let differing=0;for(let index=0;index<actual.data.length;index+=4) if([0,1,2,3].some(channel=>actual.data[index+channel]!==expected.data[index+channel])) differing++;
    expect(differing,'RGBA pixels different from independent original PNG composition').toBe(0);
  });
}

test('processing explicit source focus edges keep empty results focusable',async({page})=>{
  await open(page,'/calibration.html');
  const f=page.locator('[data-case="furnace-empty"] .mc-furnace');
  const input=f.locator('.mc-furnace__input'),fuel=f.locator('.mc-furnace__fuel'),result=f.locator('.mc-furnace__result');
  await expect(result).toHaveAttribute('aria-disabled','true'); expect(await result.evaluate(node=>(node as HTMLButtonElement).disabled)).toBe(false);
  await input.focus();await input.press('ArrowUp');await expect(input).toBeFocused();
  await fuel.focus();await fuel.press('ArrowRight');await expect(result).toBeFocused();
  await result.press('ArrowRight');await expect(result).toBeFocused();
  await result.press('ArrowLeft');await expect(fuel).toBeFocused();
  const c=page.locator('[data-case="crafting-empty"] .mc-crafting'),last=c.locator('.mc-crafting__grid .mc-slot').nth(8),output=c.locator('.mc-crafting__result');
  await last.focus();await last.press('ArrowRight');await expect(output).toBeFocused();
  await output.press('ArrowRight');await expect(output).toBeFocused();
});
