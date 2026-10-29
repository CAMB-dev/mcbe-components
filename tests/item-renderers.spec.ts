import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BannerPreview, BlockPreview } from '../src/item-renderers';

const decodedProof = [
  ['banner_base.tga','e86227e771f2d760f25e205c477770531d1a35158c0db5a41f16586fdbc78537','287aa01e48cd69f173821d3c1dd5685c92541a5f3005bb1551c7f38edf0ac396'],
  ['banner_stripe_bottom.tga','7459c23f8bf115e069928823a798210d6532e7ff68bb0e83ebaedc3335033960','cfc75484f89c8e29f01c0c404bbb1144d06a67b9a2d5aec0434f5b3fe52a2de7'],
  ['banner_cross.tga','cc56f42421713cd40fc2326029ad212d29505a14962f4dc29ea32bfa90846022','6422732d1dc51ed392b4fdf8ec53ceca1d4cd9fefe5ee05ce69d1f673cb016ae'],
] as const;

test.beforeEach(async ({ page }) => { await page.goto('/calibration.html'); });

test('original TGA decoding agrees with independently decoded complete RGBA hashes', async ({ page }) => {
  for (const [name, sourceHash, rgbaHash] of decodedProof) {
    expect(createHash('sha256').update(await readFile(new URL(`../src/assets/item-renderers/${name}`, import.meta.url))).digest('hex')).toBe(sourceHash);
    const result = await page.evaluate(async filename => {
      const path = '/src/item-renderer-engine.ts', engine = await import(path);
      const response = await fetch(`/src/assets/item-renderers/${filename}`), decoded = engine.decodeTga(await response.arrayBuffer());
      const hash = await crypto.subtle.digest('SHA-256', decoded.data);
      return { width: decoded.width, height: decoded.height, hash: Array.from(new Uint8Array(hash)).map(value => value.toString(16).padStart(2,'0')).join(''), alpha: [...new Set(Array.from(decoded.data as Uint8Array).filter((_, index) => index % 4 === 3))].sort((a,b)=>a-b) };
    }, name);
    expect(result).toMatchObject({ width: 64, height: 64, hash: rgbaHash });
    if (name !== 'banner_base.tga') expect(result.alpha).toEqual([0,175,176,255]);
  }
});

test('TGA decoder respects origin bits, preserves partial alpha and rejects malformed RLE', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const path = '/src/item-renderer-engine.ts', { decodeTga } = await import(path);
    const raw = new Uint8Array(18+16); raw[2]=2; raw[12]=2; raw[14]=2; raw[16]=32; raw[17]=8;
    raw.set([0,0,255,255,0,255,0,255,255,0,0,255,255,255,255,255],18);
    const bottom = Array.from(decodeTga(raw.buffer).data); raw[17]=56;
    const topRight = Array.from(decodeTga(raw.buffer).data);
    const rle = new Uint8Array(23); rle[2]=10;rle[12]=2;rle[14]=2;rle[16]=32;rle[17]=40;rle.set([131,255,0,0,175],18);
    const alpha = Array.from(decodeTga(rle.buffer).data).filter((_,index)=>index%4===3);
    rle[18]=132; let rejected=false;try{decodeTga(rle.buffer);}catch{rejected=true;}
    return { bottom, topRight, alpha, rejected };
  });
  expect(result.bottom).toEqual([0,0,255,255,255,255,255,255,255,0,0,255,0,255,0,255]);
  expect(result.topRight).toEqual([0,255,0,255,255,0,0,255,255,255,255,255,0,0,255,255]);
  expect(result.alpha).toEqual([175,175,175,175]);expect(result.rejected).toBe(true);
});

test('cloth front uses the original20x40 atlas pixels without redrawing or sampling the wood', async ({ page }) => {
  const canvas = page.locator('[data-case="item-original-uv"] canvas');await expect(canvas).toHaveAttribute('data-render-state','ready');
  const actual = await canvas.evaluate(node => Array.from((node as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,20,40).data));
  const expected = await page.evaluate(async () => {
    const path='/src/item-renderer-engine.ts',{decodeTga}=await import(path), response=await fetch('/src/assets/item-renderers/banner_base.tga'), source=decodeTga(await response.arrayBuffer()), output:number[]=[];
    for(let y=1;y<=40;y++)for(let x=1;x<=20;x++)output.push(...source.data.subarray((y*64+x)*4,(y*64+x)*4+4));return output;
  });
  expect(actual).toEqual(expected);
});

test('gradient retains continuous source alpha and later layers cover earlier layers', async ({ page }) => {
  const gradient=page.locator('[data-case="item-gradient"] canvas');await expect(gradient).toHaveAttribute('data-render-state','ready');
  const rows=await gradient.evaluate(node=>{const context=(node as HTMLCanvasElement).getContext('2d')!;return [0,4,9,19,29,39].map(y=>[...context.getImageData(9,y,1,1).data]);});
  expect(rows).toEqual([255,221,183,110,50,0].map(red=>[red,0,0,255]));
  const layers=page.locator('[data-case="item-layer-order"] canvas');await expect(layers).toHaveAttribute('data-render-state','ready');
  expect(await layers.evaluate(node=>[...(node as HTMLCanvasElement).getContext('2d')!.getImageData(9,19,1,1).data])).toEqual([0,0,255,255]);
});

test('cube, half slab and voxel stairs render distinct silhouettes with source pixels', async ({ page }) => {
  const metrics=[];
  for(const block of ['stone','stone-bricks','stone-slab','stone-stairs']) {
    const canvas=page.locator(`[data-case="block-${block}"] canvas`);await expect(canvas).toHaveAttribute('data-render-state','ready');
    const result=await canvas.evaluate(node=>{const canvas=node as HTMLCanvasElement,pixels=canvas.getContext('2d')!.getImageData(0,0,80,80).data;let count=0;const colors=new Set();for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]){count++;colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`);}return {count,colors:colors.size,hash:[...pixels].reduce((sum,value,index)=>(sum+value*(index%17+1))%1000000007,0)};});
    // stone.png itself has only four grayscale source colors. Even its small
    // half slab must retain texture variation rather than a uniform fake face.
    expect(result.count).toBeGreaterThan(1000);expect(result.colors).toBeGreaterThanOrEqual(4);metrics.push(result);
  }
  expect(metrics[0]!.count).toBe(metrics[1]!.count);expect(metrics[2]!.count).toBeLessThan(metrics[0]!.count);expect(metrics[3]!.count).toBeGreaterThan(metrics[2]!.count);
  expect(new Set(metrics.map(value=>value.hash)).size).toBe(4);
});

test('custom mesh and texture adapters preserve nearest sampling of the real brick PNG', async ({ page }) => {
  const canvas=page.locator('[data-case="item-custom-model"] canvas');await expect(canvas).toHaveAttribute('data-render-state','ready');
  const actual=await canvas.evaluate(node=>Array.from((node as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,32,32).data));
  const source=PNG.sync.read(await readFile(new URL('../src/assets/item-renderers/stonebrick.png',import.meta.url))),expected=new Uint8Array(32*32*4);
  for(let y=2;y<30;y++)for(let x=2;x<30;x++){const u=Math.floor((x-2+.5)*16/28),v=Math.floor((y-2+.5)*16/28);expected.set(source.data.subarray((v*16+u)*4,(v*16+u)*4+4),(y*32+x)*4);}
  expect(actual).toEqual([...expected]);
});

test('all42 original masks and32 observed selector patterns produce visible previews', async ({ page }) => {
  const all=page.locator('[data-case="item-all-patterns"] canvas'),normal=page.locator('[data-case="item-native-loom32"] canvas');
  await expect(all).toHaveCount(42);await expect(normal).toHaveCount(32);
  await expect(page.locator('[data-case="item-all-patterns"] [data-render-state="ready"]')).toHaveCount(42);
  await expect(page.locator('[data-case="item-native-loom32"] [data-render-state="ready"]')).toHaveCount(32);
  expect(await all.evaluateAll(nodes=>nodes.every(node=>(node as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,14,28).data.some((value,index)=>index%4===3&&value>0)))).toBe(true);
});

test('item patterns retain cloth shading, while wood remains untinted across dyes', async ({ page }) => {
  const fabric=page.locator('[data-case="item-fabric"] canvas');await expect(fabric).toHaveAttribute('data-render-state','ready');
  // Native source base(u10,v20)=244gray: opaque red176/46/38 multiplied
  // by244/255 produces168/44/36. Flat GUI masks remain176/46/38.
  expect(await fabric.evaluate(node=>[...(node as HTMLCanvasElement).getContext('2d')!.getImageData(9,19,1,1).data])).toEqual([168,44,36,255]);
  const values=[];
  for(const dye of ['white','black']) {
    const canvas=page.locator(`[data-case="item-banner-${dye}"] canvas`);await expect(canvas).toHaveAttribute('data-render-state','ready');
    values.push(await canvas.evaluate(node=>{const p=(node as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,80,80).data,wood:number[]=[];for(let i=0;i<p.length;i+=4)if(p[i]!>p[i+1]!+4&&p[i+1]!>p[i+2]!+10&&p[i+3])wood.push(i,p[i]!,p[i+1]!,p[i+2]!);return wood;}));
  }
  expect(values[0]!.length).toBeGreaterThan(4);expect(values[0]).toEqual(values[1]);
});

test('an all-texture override applies to every built-in block face', async ({ page }) => {
  const values=[];
  for(const selector of ['[data-case="item-custom-textures"] canvas','[data-case="block-stone-bricks"] canvas']) {
    const canvas=page.locator(selector);await expect(canvas).toHaveAttribute('data-render-state','ready');
    values.push(await canvas.evaluate(node=>Array.from((node as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,80,80).data)));
  }
  expect(values[0]).toEqual(values[1]);
});

test('controlled presets, dyes, remounts and async ready callbacks work without runtime errors', async ({ page }) => {
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const block=page.locator('[data-case="item-controlled"] [data-renderer="block"]'),banner=page.locator('[data-case="item-controlled"] [data-renderer="banner"]');
  await expect(block).toHaveAttribute('data-render-state','ready');await expect(banner).toHaveAttribute('data-render-state','ready');
  await page.getByRole('combobox',{name:'Block preset'}).click();await page.getByRole('listbox',{name:'Block preset'}).getByRole('option',{name:'stone-stairs',exact:true}).click();await expect(block).toHaveAttribute('data-block','stone-stairs');await expect(block).toHaveAttribute('data-render-state','ready');
  const red=await banner.evaluate(node=>[...(node as HTMLCanvasElement).getContext('2d')!.getImageData(20,30,1,1).data]);
  await page.getByRole('combobox',{name:'Banner dye'}).click();await page.getByRole('listbox',{name:'Banner dye'}).getByRole('option',{name:'blue',exact:true}).click();await expect(banner).toHaveAttribute('data-render-state','ready');
  const blue=await banner.evaluate(node=>[...(node as HTMLCanvasElement).getContext('2d')!.getImageData(20,30,1,1).data]);expect(red).not.toEqual(blue);
  await page.getByRole('button',{name:'Toggle renderers'}).click();await expect(block).toHaveCount(0);await page.getByRole('button',{name:'Toggle renderers'}).click();await expect(block).toHaveAttribute('data-render-state','ready');
  await expect(page.getByLabel('Renderer callbacks')).toContainText('"errors":0');expect(errors).toEqual([]);
});

test('renderer calibration dropdowns share the Bedrock trigger and selected popup states', async ({ page }) => {
  const baseline=page.locator('[data-case="combobox"] .mc-combobox-trigger');
  const surface=(node: import('@playwright/test').Locator)=>node.evaluate(element=>{
    const s=getComputedStyle(element),skin=getComputedStyle(element,'::before');
    return {background:s.backgroundColor,color:s.color,border:s.borderColor,shadow:s.boxShadow,font:s.font,height:s.height,padding:s.padding,skin:skin.borderImageSource};
  });
  await page.mouse.move(0,0); const normal=await surface(baseline);
  await baseline.hover(); const hover=await surface(baseline);
  await baseline.click(); const baselineList=page.locator('[data-case="combobox"] [role="listbox"]');
  await baselineList.locator('[role="option"]:not([aria-selected="true"]):not([aria-disabled="true"])').first().hover();
  const selectedStyle=await baselineList.locator('[aria-selected="true"]').evaluate(node=>({background:getComputedStyle(node).backgroundColor,mark:getComputedStyle(node.querySelector('.mc-combobox-option-mark')!).backgroundImage}));
  await baseline.press('Escape');
  const fixture=page.locator('#item-renderers-fixture');
  await expect(fixture.locator('select')).toHaveCount(3);
  for(const label of ['Block preset','Banner dye','Banner pattern']){
    const trigger=fixture.getByRole('combobox',{name:label,exact:true});
    await trigger.scrollIntoViewIfNeeded(); await page.mouse.move(0,0);
    await expect(trigger).toHaveClass('mc-combobox-trigger'); expect(await surface(trigger),label+' default').toEqual(normal);
    const native=trigger.locator('..').locator('select'); await expect(native).toHaveAttribute('aria-hidden','true');await expect(native).toHaveCSS('opacity','0');
    await trigger.hover(); expect(await surface(trigger),label+' hover').toEqual(hover);
    await trigger.click(); const list=fixture.getByRole('listbox',{name:label,exact:true});await expect(list).toHaveClass('mc-combobox-popup');
    await list.locator('[role="option"]:not([aria-selected="true"]):not([aria-disabled="true"])').first().hover();
    expect(await list.locator('[aria-selected="true"]').evaluate(node=>({background:getComputedStyle(node).backgroundColor,mark:getComputedStyle(node.querySelector('.mc-combobox-option-mark')!).backgroundImage})),label+' selected').toEqual(selectedStyle);
    await trigger.press('Escape');await expect(list).toBeHidden();
  }
});

test('server rendering needs no browser, with finite dimensions and explicit invalid-input errors', () => {
  expect(renderToStaticMarkup(createElement(BlockPreview,{block:'stone'}))).toContain('data-render-state="loading"');
  expect(renderToStaticMarkup(createElement(BannerPreview,{view:'item',width:32,height:32}))).toContain('width="32"');
  for(const size of [0,-1,NaN,Infinity,1.5,1025])expect(()=>renderToStaticMarkup(createElement(BlockPreview,{size}))).toThrow(RangeError);
  expect(()=>renderToStaticMarkup(createElement(BannerPreview,{baseColor:'#oops'}))).toThrow(RangeError);
});
