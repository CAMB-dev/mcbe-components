import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import manifest from '../docs/classic-skins.json' with { type: 'json' };

type Skin = keyof typeof manifest.skins;
type PixelCase = { name: string; selector: string; skin: Skin; frame?: string; stretch?: boolean; opacity?: number; arrow?: Skin; overlay?: {skin:Skin;inset:number;opacity:number}; open?: string; underlay?: { inset: number; color: number[] }; state?: 'hover' | 'pressed' | 'pressed-outside' | 'focus' };
const cases: PixelCase[] = [
  { name: 'button-default', selector: '[data-case="button-default"] button', skin: 'button-default', frame: '#131313' },
  { name: 'button-primary', selector: '[data-case="button-primary"] button', skin: 'button-hover', frame: '#131313' },
  { name: 'button-danger', selector: '[data-case="button-danger"] button', skin: 'button-danger', frame: '#131313' },
  { name: 'button-disabled', selector: '[data-case="button-disabled"] button', skin: 'button-disabled', frame: '#131313' },
  { name: 'input', selector: '[data-case="input"] input', skin: 'input' },
  { name: 'input-readonly', selector: '[data-case="input-readonly"] input', skin: 'input' },
  { name: 'input-disabled', selector: '[data-case="input-disabled"] input', skin: 'input', opacity: .5 },
  { name: 'checkbox-off', selector: '[data-case="checkbox-off"] .mc-checkbox', skin: 'checkbox-off', stretch: true },
  { name: 'checkbox-on', selector: '[data-case="checkbox-on"] .mc-checkbox', skin: 'checkbox-on', stretch: true },
  { name: 'checkbox-disabled', selector: '[data-case="checkbox-disabled"] .mc-checkbox', skin: 'checkbox-off-disabled', stretch: true },
  { name: 'checkbox-on-disabled', selector: '[data-case="checkbox-on-disabled"] .mc-checkbox', skin: 'checkbox-on-disabled', stretch: true },
  { name: 'radio-on', selector: '[data-case="radio"] .mc-radio >> nth=0', skin: 'radio-on', stretch: true },
  { name: 'radio-off', selector: '[data-case="radio"] .mc-radio >> nth=1', skin: 'radio-off', stretch: true },
  { name: 'switch-off', selector: '[data-case="switch-off"] .mc-switch', skin: 'switch-off', stretch: true },
  { name: 'switch-on', selector: '[data-case="switch-on"] .mc-switch', skin: 'switch-on', stretch: true },
  { name: 'switch-disabled', selector: '[data-case="switch-disabled"] .mc-switch', skin: 'switch-off', stretch: true, opacity: .5 },
  { name: 'switch-on-disabled', selector: '[data-case="switch-on-disabled"] .mc-switch', skin: 'switch-on', stretch: true, opacity: .5 },
  { name: 'slot', selector: '[data-case="slot"] .mc-slot', skin: 'inventory-cell' },
  { name: 'button-hover', selector: '[data-case="button-default"] button', skin: 'button-hover', frame: '#ffffff', state: 'hover' },
  { name: 'button-pressed', selector: '[data-case="button-default"] button', skin: 'button-pressed', frame: '#ffffff', state: 'pressed' },
  { name: 'button-pressed-outside', selector: '[data-case="button-default"] button', skin: 'button-pressed-nohover', frame: '#131313', state: 'pressed-outside' },
  { name: 'danger-pressed', selector: '[data-case="button-danger"] button', skin: 'button-danger-pressed', frame: '#ffffff', state: 'pressed' },
  { name: 'input-hover', selector: '[data-case="input"] input', skin: 'input-hover', state: 'hover' },
  { name: 'checkbox-off-hover', selector: '[data-case="checkbox-off"] .mc-checkbox', skin: 'checkbox-off-hover', stretch: true, state: 'hover' },
  { name: 'checkbox-on-hover', selector: '[data-case="checkbox-on"] .mc-checkbox', skin: 'checkbox-on-hover', stretch: true, state: 'hover' },
  { name: 'radio-on-hover', selector: '[data-case="radio"] .mc-radio >> nth=0', skin: 'radio-on-hover', stretch: true, state: 'hover' },
  { name: 'radio-off-hover', selector: '[data-case="radio"] .mc-radio >> nth=1', skin: 'radio-off-hover', stretch: true, state: 'hover' },
  { name: 'switch-off-hover', selector: '[data-case="switch-off"] .mc-switch', skin: 'switch-off-hover', stretch: true, state: 'hover' },
  { name: 'switch-on-hover', selector: '[data-case="switch-on"] .mc-switch', skin: 'switch-on-hover', stretch: true, state: 'hover' },
  { name: 'slot-hover', selector: '[data-case="slot"] .mc-slot', skin: 'inventory-cell', state:'hover', overlay:{skin:'inventory-highlight',inset:2,opacity:.8} },
  { name: 'slot-selected', selector: '[data-case="slot-selected"] .mc-slot', skin:'inventory-selected' },
  { name: 'slot-focus', selector: '[data-case="slot"] .mc-slot', skin:'inventory-cell', state:'focus', overlay:{skin:'inventory-focus',inset:0,opacity:1} },
  { name: 'tab-selected', selector: '[data-case="tabs"] .mc-tab >> nth=0', skin: 'button-pressed-nohover', frame: '#131313' },
  { name: 'tab-unselected', selector: '[data-case="tabs"] .mc-tab >> nth=1', skin: 'button-default', frame: '#131313' },
  { name: 'tab-disabled', selector: '[data-case="tabs"] .mc-tab >> nth=2', skin: 'button-disabled', frame: '#131313' },
  { name: 'tab-selected-hover', selector: '[data-case="tabs"] .mc-tab >> nth=0', skin: 'button-pressed', frame: '#ffffff', state: 'hover' },
  { name: 'tab-unselected-hover', selector: '[data-case="tabs"] .mc-tab >> nth=1', skin: 'button-hover', frame: '#ffffff', state: 'hover' },
  { name: 'combobox-trigger', selector: '[data-case="combobox-skin"] .mc-combobox-trigger', skin: 'button-default', frame: '#131313', arrow: 'chevron-down' },
  { name: 'combobox-trigger-hover', selector: '[data-case="combobox-skin"] .mc-combobox-trigger', skin: 'button-hover', frame: '#ffffff', arrow: 'chevron-down-hover', state: 'hover' },
  { name: 'slider-thumb', selector: '[data-case="slider"] .mc-range-thumb', skin: 'slider-thumb' },
  { name: 'slider-thumb-hover', selector: '[data-case="slider"] .mc-range-thumb', skin: 'slider-thumb-hover', state: 'hover' },
  { name: 'panel', selector: '[data-case="panel"] .mc-panel', skin: 'panel' },
  { name: 'panel-inset', selector: '[data-case="panel-inset"] .mc-panel', skin: 'input' },
  { name: 'dialog-frame', selector: '.calibration-surface-dialog', skin: 'dialog', open: 'Open surface dialog', underlay: { inset: 8, color: [9,9,9] } },
  { name: 'dialog-close', selector: '.calibration-close-dialog .mc-dialog__close-icon', skin: 'close', open: 'Open settings dialog', stretch:true, underlay:{inset:0,color:[198,198,198]} },
  { name: 'dialog-close-hover', selector: '.calibration-close-dialog .mc-dialog__close-icon', skin: 'close-hover', open: 'Open settings dialog', stretch:true, underlay:{inset:0,color:[198,198,198]},state:'hover' },
  { name: 'dialog-close-pressed', selector: '.calibration-close-dialog .mc-dialog__close-icon', skin: 'close-pressed', open: 'Open settings dialog', stretch:true, underlay:{inset:0,color:[198,198,198]},state:'pressed' },
  { name:'grindstone-arrow',selector:'[data-case="grindstone"] .mc-grindstone__arrow',skin:'workstation-arrow',stretch:true,underlay:{inset:0,color:[198,198,198]} },
  { name:'enchanting-option',selector:'.calibration-enchanting .mc-enchanting__option >> nth=0',skin:'enchanting-default' },
  { name:'enchanting-option-hover',selector:'.calibration-enchanting .mc-enchanting__option >> nth=0',skin:'enchanting-hover',state:'hover' },
  { name:'enchanting-option-disabled',selector:'.calibration-enchanting .mc-enchanting__option >> nth=2',skin:'enchanting-disabled' },
];

// Independent raster reference: samples original PNGs, using the game nine-slice
// sizes. It does not read the generated SVG or the component's style declarations.
function expand(source: PNG, width: number, height: number, slice: number | number[], direct: boolean, opacity: number, underlay?: PixelCase['underlay'], edge?:number) {
  const image = new PNG({ width, height });
  const scale = edge !== undefined && typeof slice==='number' && slice>0 ? edge/slice : 2;
  const [left,top,right,bottom] = typeof slice === 'number' ? [slice,slice,slice,slice] : slice;
  const coordinate = (position: number, target: number, size: number, before: number, after: number) => {
    if (direct || (before === 0 && after === 0)) return Math.min(size - 1, Math.floor((position + .5) * size / target));
    if (position < before * scale) return Math.floor(position / scale);
    if (position >= target - after * scale) return size - after + Math.floor((position - target + after * scale) / scale);
    return before + Math.floor((position - before * scale + .5) * (size - before - after) / (target - (before + after) * scale));
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const from = (coordinate(y, height, source.height, top!, bottom!) * source.width + coordinate(x, width, source.width, left!, right!)) * 4;
    const to = (y * width + x) * 4;
    const alpha = source.data[from + 3]! / 255 * opacity;
    const background = underlay && x >= underlay.inset && y >= underlay.inset && x < width-underlay.inset && y < height-underlay.inset ? underlay.color : [40,41,42];
    for (let channel = 0; channel < 3; channel++) image.data[to + channel] = Math.round(source.data[from + channel]! * alpha + background[channel]! * (1 - alpha));
    image.data[to + 3] = 255;
  }
  return image;
}
function frame(image: PNG, color: string) {
  const result = new PNG({ width: image.width + 4, height: image.height + 4 });
  for (let i = 0; i < result.data.length; i += 4) {
    result.data[i] = Number.parseInt(color.slice(1, 3), 16); result.data[i+1] = Number.parseInt(color.slice(3, 5), 16); result.data[i+2] = Number.parseInt(color.slice(5, 7), 16); result.data[i+3] = 255;
  }
  PNG.bitblt(image, result, 0, 0, image.width, image.height, 2, 2);
  return result;
}
function trimBackground(image: PNG, background: readonly number[]) {
  let left=image.width, top=image.height, right=-1, bottom=-1;
  for(let y=0;y<image.height;y++) for(let x=0;x<image.width;x++) {
    const offset=(y*image.width+x)*4;
    if ([0,1,2].some(channel=>image.data[offset+channel]!==background[channel])) { left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y); }
  }
  if (right < left) throw new Error('The font specimen is empty');
  const actual = new PNG({width:right-left+1,height:bottom-top+1}); PNG.bitblt(image,actual,left,top,actual.width,actual.height,0,0);
  return actual;
}
async function pointAt(page: Page, node: Locator) {
  await node.scrollIntoViewIfNeeded();
  const bounds = await node.boundingBox();
  if (!bounds) throw new Error('Missing control bounds');
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}

for (const sample of cases) test(`${sample.name}: exact reference pixels`, async ({ page }, testInfo) => {
  await page.goto('/calibration.html');
  await page.evaluate(() => document.fonts.ready);
  if (sample.open) await page.getByRole('button',{name:sample.open,exact:true}).click();
  if (sample.open === 'Open settings dialog') await page.getByRole('heading',{name:'Settings dialog',exact:true}).click();
  const node = page.locator(sample.selector);
  await node.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  if (sample.state === 'focus') await node.focus();
  else if (sample.state) await pointAt(page, node);
  if (sample.state?.startsWith('pressed')) {
    await page.mouse.down();
    if (sample.state === 'pressed-outside') await page.mouse.move(0, 0);
  }
  const actualBuffer = await node.screenshot({ animations: 'disabled' });
  const actual = PNG.sync.read(actualBuffer);
  const metadata = manifest.skins[sample.skin];
  const originalBuffer = await readFile(new URL('../.cache/references/' + metadata.source.split('/').at(-1), import.meta.url));
  expect(createHash('sha256').update(originalBuffer).digest('hex')).toBe(metadata.sha256);
  const original = PNG.sync.read(originalBuffer);
  const inner = expand(original, actual.width - (sample.frame ? 4 : 0), actual.height - (sample.frame ? 4 : 0), metadata.slice ?? 0, sample.stretch ?? false, sample.opacity ?? 1, sample.underlay, 'edge' in metadata ? metadata.edge : undefined);
  let expected = sample.frame ? frame(inner, sample.frame) : inner;
  if(sample.overlay) {
    const meta=manifest.skins[sample.overlay.skin], bytes=await readFile(new URL('../.cache/references/'+meta.source.split('/').at(-1),import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(meta.sha256);
    const source=PNG.sync.read(bytes), inset=sample.overlay.inset;
    const baseReference=PNG.sync.write(expected);
    const width=actual.width-inset*2, height=actual.height-inset*2;
    for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
      const coordinate=(p:number,target:number,size:number)=>p<2 ? Math.floor(p/2) : p>=target-2 ? size-1 : Math.min(size-1,1+Math.floor((p-2+.5)*Math.max(0,size-2)/(target-4)));
      const sx=source.width===1 ? 0 : coordinate(x,width,source.width), sy=source.height===1 ? 0 : coordinate(y,height,source.height);
      const from=(sy*source.width+sx)*4, to=((y+inset)*actual.width+x+inset)*4, alpha=source.data[from+3]!/255*sample.overlay.opacity;
      for(let channel=0;channel<3;channel++) expected.data[to+channel]=Math.round(source.data[from+channel]!*alpha+expected.data[to+channel]!*(1-alpha));
    }
    if(sample.overlay.opacity<1) {
      // Quantize the independent original PNG layer through the compositor,
      // rather than assuming a CPU blend rounds identically on every platform.
      await page.evaluate(async ({base,overlay,width,height,inset,opacity})=>{
        const reference=document.createElement('div'); reference.id='original-overlay-reference';
        Object.assign(reference.style,{position:'fixed',left:'0',top:'0',width:`${width}px`,height:`${height}px`,zIndex:'100',backgroundImage:`url("${base}")`,backgroundSize:'100% 100%',imageRendering:'pixelated'});
        const layer=document.createElement('div'); Object.assign(layer.style,{position:'absolute',inset:`${inset}px`,backgroundImage:`url("${overlay}")`,backgroundSize:'100% 100%',opacity:String(opacity),imageRendering:'pixelated'});
        for(const src of [base,overlay]) {const image=new Image();image.src=src;await image.decode();}
        reference.append(layer);document.body.append(reference);
      },{base:`data:image/png;base64,${baseReference.toString('base64')}`,overlay:`data:image/png;base64,${bytes.toString('base64')}`,width:actual.width,height:actual.height,inset,opacity:sample.overlay.opacity});
      expected=PNG.sync.read(await page.locator('#original-overlay-reference').screenshot());
    }
  }
  if (sample.arrow) {
    const arrowMeta = manifest.skins[sample.arrow];
    const arrow = PNG.sync.read(await readFile(new URL('../.cache/references/' + arrowMeta.source.split('/').at(-1), import.meta.url)));
    const width = 16, height = 16, left = actual.width - 22 - width, top = (actual.height - height) / 2;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const from = (Math.floor((y+.5) * arrow.height / height) * arrow.width + Math.floor((x+.5) * arrow.width / width)) * 4;
      const to = ((top + y) * expected.width + left + x) * 4;
      const alpha = arrow.data[from+3]! / 255;
      for (let channel = 0; channel < 3; channel++) expected.data[to+channel] = Math.round(arrow.data[from+channel]! * alpha + expected.data[to+channel]! * (1-alpha));
    }
  }
  if (sample.opacity !== undefined) {
    // CSS opacity is quantized by the compositor. Render the original PNG in an
    // independent reference layer to apply the same browser compositing rules;
    // production SVG/DOM/styles are never used to construct this reference.
    await page.evaluate(async ({ source, width, height, opacity, slice, direct }) => {
      const reference = document.createElement('div');
      reference.id = 'original-png-reference';
      Object.assign(reference.style, { position: 'fixed', left: '0', top: '0', width: `${width}px`, height: `${height}px`, background: '#28292a', zIndex: '100' });
      const image = document.createElement('div');
      Object.assign(image.style, { width: '100%', height: '100%', backgroundImage: `url("${source}")`, backgroundSize: '100% 100%', opacity: String(opacity), imageRendering: 'pixelated' });
      if (!direct && typeof slice === 'number' && slice > 0) Object.assign(image.style, { boxSizing: 'border-box', border: `${slice*2}px solid transparent`, borderImage: `url("${source}") ${slice} fill / ${slice*2}px stretch`, backgroundImage: 'none' });
      const loaded = new Image(); loaded.src = source;
      await loaded.decode(); reference.append(image); document.body.append(reference);
    }, { source: `data:image/png;base64,${originalBuffer.toString('base64')}`, width: actual.width, height: actual.height, opacity: sample.opacity, slice: metadata.slice ?? 0, direct: sample.stretch ?? false });
    expected = PNG.sync.read(await page.locator('#original-png-reference').screenshot());
  }
  const difference = new PNG({ width: actual.width, height: actual.height });
  let changedPixels = 0;
  for (let i = 0; i < actual.data.length; i += 4) {
    const differs = [0,1,2,3].some(channel => actual.data[i+channel] !== expected.data[i+channel]);
    if (differs) changedPixels++;
    difference.data[i] = differs ? 255 : 0; difference.data[i+1] = 0; difference.data[i+2] = differs ? 255 : 0; difference.data[i+3] = 255;
  }
  const folder = new URL('../.cache/pixel-comparison/', import.meta.url);
  await mkdir(folder, { recursive: true });
  await Promise.all([
    writeFile(new URL(sample.name + '-actual.png', folder), actualBuffer),
    writeFile(new URL(sample.name + '-expected.png', folder), PNG.sync.write(expected)),
    writeFile(new URL(sample.name + '-diff.png', folder), PNG.sync.write(difference)),
    writeFile(new URL(sample.name + '.json', folder), JSON.stringify({ case: sample.name, source: metadata.source, size: [actual.width,actual.height], pixels: actual.width*actual.height, changedPixels }, null, 2)),
  ]);
  if (changedPixels) {
    await testInfo.attach('actual', { body: actualBuffer, contentType: 'image/png' });
    await testInfo.attach('expected-original-reference', { body: PNG.sync.write(expected), contentType: 'image/png' });
    await testInfo.attach('difference', { body: PNG.sync.write(difference), contentType: 'image/png' });
  }
  expect(changedPixels, `${sample.name}: ${changedPixels} / ${actual.width*actual.height} pixels differ from original reference`).toBe(0);
});

for (const sample of [
  {id:'empty', value:0}, {id:'half',value:50}, {id:'full',value:100},
  {id:'fraction',value:33.3}, {id:'fraction',value:33.3,viewport:500},
]) test(`progress ${sample.id}${sample.viewport ? ' narrow' : ''}: full texture clipped on game pixels`, async ({page}) => {
  if(sample.viewport) await page.setViewportSize({width:sample.viewport,height:1000});
  await page.goto('/calibration.html');
  const actualBuffer = await page.locator(`[data-case="progress-${sample.id}"] .mc-progress__track`).screenshot();
  const actual = PNG.sync.read(actualBuffer);
  expect(actual.height).toBe(10);
  const source = async (skin: 'progress-empty' | 'progress-fill') => {
    const meta = manifest.skins[skin];
    const bytes = await readFile(new URL('../.cache/references/'+meta.source.split('/').at(-1),import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(meta.sha256);
    return expand(PNG.sync.read(bytes),actual.width,actual.height,meta.slice,false,1);
  };
  const expected = await source('progress-empty'), fill = await source('progress-fill');
  const cutoff = Math.floor(actual.width * sample.value / 100 / 2) * 2;
  if(cutoff) PNG.bitblt(fill,expected,0,0,cutoff,actual.height,0,0);
  const diff = new PNG({width:actual.width,height:actual.height});
  let changedPixels=0;
  for(let i=0;i<actual.data.length;i+=4) {
    const differs = !actual.data.subarray(i,i+4).equals(expected.data.subarray(i,i+4));
    if(differs) changedPixels++;
    diff.data.set(differs ? [255,0,255,255] : [0,0,0,255],i);
  }
  const name=`progress-${sample.id}${sample.viewport ? '-narrow' : ''}`;
  const folder=new URL('../.cache/pixel-comparison/',import.meta.url); await mkdir(folder,{recursive:true});
  await Promise.all([
    writeFile(new URL(name+'-actual.png',folder),actualBuffer),
    writeFile(new URL(name+'-expected.png',folder),PNG.sync.write(expected)),
    writeFile(new URL(name+'-diff.png',folder),PNG.sync.write(diff)),
    writeFile(new URL(name+'.json',folder),JSON.stringify({case:name,size:[actual.width,actual.height],cutoff,changedPixels},null,2)),
  ]);
  expect(changedPixels,`${name}: full-width original texture with ${cutoff}px reveal`).toBe(0);
});

for (const shadow of [true, false]) test(`Mojangles glyphs with shadow=${shadow}: original outline raster`, async ({ page }) => {
  test.skip(!existsSync(new URL('../.cache/local-fonts/Mojangles.ttf', import.meta.url)), 'Requires the user-owned original font.');
  const metrics = JSON.parse(await readFile(new URL('../.cache/font-oracle/metrics.json', import.meta.url), 'utf8'));
  const original = await readFile(new URL('../.cache/local-fonts/Mojangles.ttf', import.meta.url));
  expect(createHash('sha256').update(original).digest('hex')).toBe(metrics.fontSha256);
  await page.goto('/calibration.html'); await page.evaluate(() => document.fonts.load('20px "Mojangles Pixel"'));
  const node = page.locator(`[data-case="${shadow ? 'font' : 'font-plain'}"] .calibration-font`);
  await node.scrollIntoViewIfNeeded(); const bounds = await node.boundingBox(); if (!bounds) throw new Error('Missing font specimen');
  expect(bounds.width).toBe(metrics.advancePx);
  const image = PNG.sync.read(await page.screenshot({ clip: { x: bounds.x, y: bounds.y, width: bounds.width+4, height: bounds.height+4 } }));
  const expected = PNG.sync.read(await readFile(new URL(`../.cache/font-oracle/mojangles-${shadow ? 'shadow' : 'plain'}.png`, import.meta.url)));
  const actual = trimBackground(image, [40,41,42]);
  const folder=new URL('../.cache/font-oracle/',import.meta.url);
  await writeFile(new URL(`browser-${shadow ? 'shadow' : 'plain'}.png`,folder),PNG.sync.write(actual));
  expect([actual.width,actual.height]).toEqual([expected.width,expected.height]);
  expect(actual.data.equals(expected.data), 'Browser glyph mask and hard 2px shadow must match independent TTF raster').toBe(true);
});

test('Chinese glyph edges and shadow contain no colored or partial pixels', async ({ page }) => {
  await page.goto('/calibration.html');
  expect(await page.evaluate(async () => (await document.fonts.load('24px "MCBE CJK"','创造属于你的世界')).length)).toBeGreaterThan(0);
  const image = PNG.sync.read(await page.locator('[data-case="font-cjk"] .mc-text').screenshot());
  const allowed = new Set(['40,41,42,255','63,63,63,255','255,255,255,255']);
  const colors = new Set<string>();
  for (let i=0; i<image.data.length; i+=4) colors.add(Array.from(image.data.subarray(i,i+4)).join(','));
  expect([...colors].filter(color=>!allowed.has(color)), 'CJK edges must have solid foreground/background/shadow pixels only').toEqual([]);
  expect(colors.has('255,255,255,255')).toBe(true);
  expect(colors.has('63,63,63,255')).toBe(true);
  await mkdir(new URL('../.cache/font-oracle/',import.meta.url), {recursive:true});
  await writeFile(new URL('../.cache/font-oracle/browser-cjk.png',import.meta.url),PNG.sync.write(image));
});

test('Input glyphs and 2px shadow match original Mojangles outlines', async ({ page }) => {
  test.skip(!existsSync(new URL('../.cache/local-fonts/Mojangles.ttf', import.meta.url)), 'Requires the user-owned original font.');
  await page.goto('/calibration.html'); await page.evaluate(() => document.fonts.load('20px "Mojangles Pixel"'));
  const node = page.locator('[data-case="input-font"] input'); await node.scrollIntoViewIfNeeded();
  const bounds = await node.boundingBox(); if(!bounds) throw new Error('Missing Input');
  const image = PNG.sync.read(await page.screenshot({clip:{x:bounds.x+8,y:bounds.y+8,width:bounds.width-16,height:bounds.height-16}}));
  const actual = trimBackground(image,[94,94,94]);
  const expected = PNG.sync.read(await readFile(new URL('../.cache/font-oracle/mojangles-input-shadow.png',import.meta.url)));
  await writeFile(new URL('../.cache/font-oracle/browser-input.png',import.meta.url),PNG.sync.write(actual));
  expect([actual.width,actual.height]).toEqual([expected.width,expected.height]);
  expect(actual.data.equals(expected.data)).toBe(true);
});

test('SGA runes sample the original game atlas without interpolated pixels',async({page})=>{
  const path=new URL('../.cache/enchanting-source/font/ascii_sga.png',import.meta.url);
  test.skip(!existsSync(path),'Requires a user-owned original SGA atlas.');
  const bytes=await readFile(path);
  expect(createHash('sha256').update(bytes).digest('hex')).toBe('624678abe1122a56f343812782f1d6542c2414ad7e94360cbf8f1d50c1415c8a');
  const atlas=PNG.sync.read(bytes), text='AIZ';
  const glyphs=[...text].map(char=>{
    const code=char.charCodeAt(0),left=code%16*8,top=Math.floor(code/16)*8;
    let last=-1;for(let y=0;y<8;y++)for(let x=0;x<8;x++)if(atlas.data[((top+y)*atlas.width+left+x)*4+3])last=Math.max(last,x);
    return {left,top,advance:(last+2)*2};
  });
  const expected=new PNG({width:glyphs.reduce((sum,glyph)=>sum+glyph.advance,0),height:16});
  for(let i=0;i<expected.data.length;i+=4)expected.data.set([40,41,42,255],i);
  let offset=0;
  for(const glyph of glyphs){for(let y=0;y<16;y++)for(let x=0;x<glyph.advance;x++){
    const from=((glyph.top+Math.floor(y/2))*atlas.width+glyph.left+Math.floor(x/2))*4;
    const to=(y*expected.width+offset+x)*4,alpha=atlas.data[from+3]!/255;
    for(let channel=0;channel<3;channel++)expected.data[to+channel]=Math.round([104,94,74][channel]!*alpha+[40,41,42][channel]!*(1-alpha));
  }offset+=glyph.advance;}
  await page.goto('/calibration.html');
  const actual=PNG.sync.read(await page.locator('[data-case="enchanting-runes"] .mc-enchanting-runes').screenshot());
  expect([actual.width,actual.height]).toEqual([expected.width,expected.height]);
  expect(actual.data.equals(expected.data),'Original atlas mask and CSS rune output must be byte-identical').toBe(true);
  const folder=new URL('../.cache/font-oracle/',import.meta.url);await mkdir(folder,{recursive:true});
  await Promise.all([writeFile(new URL('runes-actual.png',folder),PNG.sync.write(actual)),writeFile(new URL('runes-expected.png',folder),PNG.sync.write(expected))]);
});
