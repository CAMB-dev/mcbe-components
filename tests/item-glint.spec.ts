import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PNG } from 'pngjs';
import { ItemGlint, renderItemGlint, shadeItemGlint } from '../src/item-glint';
import type { ItemGlintUniforms } from '../src/item-glint';

const uniforms: ItemGlintUniforms = { uvOffset: [0, 0], uvScale: [1, 1], uvRotation: [0, 0], glintColor: [1, 1, 1] };
const blend = { source: 'one', destination: 'one' } as const;
const single = (rgba: readonly number[]) => ({ width: 1, height: 1, data: new Uint8ClampedArray(rgba) });
const grid = { width: 2, height: 2, data: new Uint8ClampedArray([255,0,0,255, 0,255,0,255, 0,0,255,255, 255,255,255,255]) };
const modulePath = '/src/item-glint.tsx';
const fixture = '[data-case="glint-controlled"]';

test('bundled original item texture has pinned bytes and complete decoded source pixels', async () => {
  const data = await readFile(new URL('../src/assets/glint/enchanted_item_glint.png', import.meta.url)), texture = PNG.sync.read(data);
  expect(data.length).toBe(477); expect(createHash('sha256').update(data).digest('hex')).toBe('99cf0defcbe422c8b91a42886f469d89cfbaba157371d8142d01ba7e8055a631');
  expect([texture.width,texture.height]).toEqual([128,128]);
  expect(createHash('sha256').update(texture.data).digest('hex')).toBe('2231bc3707de58d253a3c0a3e979ccbf9601709223270b3f8e677e7b4546955b');
  expect([...new Set(texture.data.filter((_,i)=>i%4===3))]).toEqual([255]);
  expect(await readFile(new URL('../src/assets/glint/LICENSE.md',import.meta.url),'utf8')).toContain('Mojang');
});

test('source alpha threshold, RGB square and tint order agree with hand-calculated raw pass', () => {
  const source = single([128,64,32,0]), profile: ItemGlintUniforms = { ...uniforms, glintColor: [.5,.25,1], tintColor: [1,.5,.25,.4], hudOpacity: .5 };
  expect(shadeItemGlint([.5,.5],0,source,profile,'point-repeat')).toBeNull();
  expect(shadeItemGlint([.5,.5],1/256,source,profile,'point-repeat')).toBeNull();
  expect(shadeItemGlint([.5,.5],1/256+Number.EPSILON,source,profile,'point-repeat')).not.toBeNull();
  const actual = shadeItemGlint([.5,.5],.75,source,profile,'point-repeat')!;
  const expected = [(128/255)**2*.2,(16/255)**2*.2,(16/255)**2*.2,.15];
  actual.forEach((value,i)=>expect(value).toBeCloseTo(expected[i]!,12));
  // Original glint texture alpha is not used for RGB; no mask-alpha multiply.
  expect(actual.slice(0,3)).toEqual(shadeItemGlint([.5,.5],1,source,profile,'point-repeat')!.slice(0,3));
});

test('two layer rotation sign and offsets-before-shared-scale are observable', () => {
  const offset = shadeItemGlint([.25,.25],1,grid,{ ...uniforms, uvOffset: [.25,0], uvScale: [2,1] },'point-repeat');
  // Layer1 crosses u=1 and repeats to red; layer2 samples green.
  expect(offset).toEqual([1,1,0,1]);
  const rotated = shadeItemGlint([.25,.25],1,grid,{ ...uniforms, uvRotation: [Math.PI/2,-Math.PI/2] },'point-repeat');
  expect(rotated).toEqual([0,1,1,1]);
});

test('point and bilinear repeat preserve the normalized texel-center seam', () => {
  expect(shadeItemGlint([0,0],1,grid,uniforms,'point-repeat')).toEqual([4,0,0,1]);
  expect(shadeItemGlint([0,0],1,grid,uniforms,'bilinear-repeat')).toEqual([1,1,1,1]);
  expect(shadeItemGlint([1,1],1,grid,uniforms,'bilinear-repeat')).toEqual([1,1,1,1]);
  expect(shadeItemGlint([-.25,-.25],1,grid,uniforms,'point-repeat')).toEqual([4,4,4,1]);
});

test('explicit blend uses raw pass values once and preserves discard destination', () => {
  const item=single([20,40,80,255]),glint=single([128,128,128,255]),profile={...uniforms,glintColor:[.1,.2,.3] as const};
  const result=renderItemGlint(item,glint,{uniforms:profile,glintSampler:'point-repeat',blend});
  const pass=[.1,.2,.3].map(value=>(256/255*value)**2);
  expect([...result.data]).toEqual([...pass.map((value,i)=>Math.round(Math.min(1,[20,40,80][i]!/255+value)*255)),255]);
  const squaredAgain=renderItemGlint(item,glint,{uniforms:profile,glintSampler:'point-repeat',blend:{source:'source-color',destination:'one'}});
  expect([...squaredAgain.data]).toEqual([...pass.map((value,i)=>Math.round(Math.min(1,[20,40,80][i]!/255+value*value)*255)),255]);
  expect([...renderItemGlint(single([20,40,80,0]),glint,{uniforms,glintSampler:'point-repeat',blend}).data]).toEqual([20,40,80,0]);
});

test('SSR and public boundaries reject invalid values without fetching or inventing parameters', () => {
  const props={imageSrc:'/original-item.png',uniforms,glintSampler:'point-repeat' as const,blend};
  const html=renderToStaticMarkup(createElement(ItemGlint,props));
  expect(html).toContain('data-fidelity="controlled-reconstruction"');expect(html).toContain('data-render-state="loading"');
  expect(html).not.toContain('<img');
  for(const value of [NaN,Infinity,-1,0,1.5,1025])expect(()=>renderToStaticMarkup(createElement(ItemGlint,{...props,width:value}))).toThrow(RangeError);
  expect(()=>shadeItemGlint([.5,.5],1,grid,{...uniforms,uvOffset:[NaN,0]},'point-repeat')).toThrow(RangeError);
  expect(()=>shadeItemGlint([.5,.5],1,grid,{...uniforms,uvScale:[0,1]},'point-repeat')).toThrow(RangeError);
  expect(()=>shadeItemGlint([.5,.5],1,grid,{...uniforms,glintColor:[-1,0,0]},'point-repeat')).toThrow(RangeError);
  expect(()=>shadeItemGlint([.5,.5],1,grid,{...uniforms,tintColor:[1,1,1,2]},'point-repeat')).toThrow(RangeError);
  expect(()=>shadeItemGlint([.5,.5],1,grid,{...uniforms,hudOpacity:Infinity},'point-repeat')).toThrow(RangeError);
  expect(()=>renderToStaticMarkup(createElement(ItemGlint,{...props,imageSrc:''}))).toThrow(RangeError);
  expect(()=>renderItemGlint({...grid,data:new Uint8ClampedArray(1)},grid,{uniforms,glintSampler:'point-repeat',blend})).toThrow(RangeError);
  expect(()=>Reflect.apply(renderItemGlint,undefined,[grid,grid,{uniforms,glintSampler:'point-repeat'}])).toThrow(RangeError);
  expect(()=>Reflect.apply(renderItemGlint,undefined,[grid,grid,{uniforms,blend}])).toThrow(RangeError);
  expect(()=>Reflect.apply(renderItemGlint,undefined,[grid,grid,{glintSampler:'point-repeat',blend}])).toThrow(RangeError);
});

test('zero explicit color preserves actual source icon and transparent alpha mask', async ({page}) => {
  await page.goto('/calibration.html');const canvas=page.locator('[data-case="glint-zero"] canvas');await expect(canvas).toHaveAttribute('data-render-state','ready');
  const actual=await canvas.evaluate(node=>[...(node as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,32,32).data]);
  const image=PNG.sync.read(await readFile(new URL('../demo/assets/minecraft/diamond_sword.png',import.meta.url))),expected=new Uint8ClampedArray(32*32*4);
  for(let y=0;y<32;y++)for(let x=0;x<32;x++)expected.set(image.data.subarray((Math.floor(y/2)*16+Math.floor(x/2))*4,(Math.floor(y/2)*16+Math.floor(x/2))*4+4),(y*32+x)*4);
  expect(actual).toEqual([...expected]);
  expect(await page.locator('[data-case="glint-point"] canvas').evaluate(node=>{const p=(node as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,32,32).data;return p[3];})).toBe(0);
});

test('controlled update is deterministic, ref resolves and no timer changes paused pixels', async ({page}) => {
  await page.goto('/calibration.html');const canvas=page.locator(`${fixture} canvas`);await expect(canvas).toHaveAttribute('data-render-state','ready');
  const pixels=()=>canvas.evaluate(node=>[...(node as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,32,32).data]);const initial=await pixels();
  await expect(page.getByLabel('Glint callbacks')).toContainText('"refReady":true');
  await page.waitForTimeout(200);expect(await pixels()).toEqual(initial);
  await page.getByRole('button',{name:'Change glint offset'}).click();await expect(page.getByLabel('Glint callbacks')).toContainText('"ready":2');expect(await pixels()).not.toEqual(initial);
  await page.getByRole('button',{name:'Change glint offset'}).click();await expect(page.getByLabel('Glint callbacks')).toContainText('"ready":3');expect(await pixels()).toEqual(initial);
  await page.getByRole('button',{name:'Toggle glint renderer'}).click();await expect(canvas).toHaveCount(0);
  await page.getByRole('button',{name:'Toggle glint renderer'}).click();await expect(canvas).toHaveAttribute('data-render-state','ready');expect(await pixels()).toEqual(initial);
});

test('resource error clears stale pixels and recovery does not require native fallback', async ({page}) => {
  await page.goto('/calibration.html');const canvas=page.locator(`${fixture} canvas`);await expect(canvas).toHaveAttribute('data-render-state','ready');
  await page.getByRole('button',{name:'Toggle glint resource failure'}).click();await expect(canvas).toHaveAttribute('data-render-state','error');await expect(page.getByLabel('Glint callbacks')).toContainText('"errors":1');
  expect(await canvas.evaluate(node=>(node as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,32,32).data.some(Boolean))).toBe(false);
  await page.getByRole('button',{name:'Toggle glint resource failure'}).click();await expect(canvas).toHaveAttribute('data-render-state','ready');
});

test('cancelled pending image never reports ready or error after unmount', async ({page}) => {
  const png=await readFile(new URL('../demo/assets/minecraft/diamond_sword.png',import.meta.url));
  let releaseResponse=()=>{};
  const responseGate=new Promise<void>(resolve=>{releaseResponse=resolve;});
  await page.route('**/__missing_glint_item__.png',async route=>{await responseGate;await route.fulfill({status:200,contentType:'image/png',body:png});});
  await page.goto('/calibration.html');const canvas=page.locator(`${fixture} canvas`);await expect(canvas).toHaveAttribute('data-render-state','ready');
  await page.getByRole('button',{name:'Toggle glint resource failure'}).click();await expect(canvas).toHaveAttribute('data-render-state','loading');
  await page.getByRole('button',{name:'Toggle glint renderer'}).click();await expect(canvas).toHaveCount(0);
  const response=page.waitForResponse('**/__missing_glint_item__.png');releaseResponse();await (await response).finished();await page.waitForTimeout(350);
  await expect(page.getByLabel('Glint callbacks')).toContainText('"ready":1');await expect(page.getByLabel('Glint callbacks')).toContainText('"errors":0');
});

test('browser raw pass helper keeps float precision until explicit output composition', async ({page}) => {
  await page.goto('/calibration.html');const value=await page.evaluate(async path=>{const {shadeItemGlint}=await import(path);return shadeItemGlint([0,0],1,{width:1,height:1,data:new Uint8ClampedArray([255,255,255,255])},{uvOffset:[0,0],uvScale:[1,1],uvRotation:[0,0],glintColor:[2,2,2]},'point-repeat');},modulePath);
  expect(value).toEqual([16,16,16,1]);
});
