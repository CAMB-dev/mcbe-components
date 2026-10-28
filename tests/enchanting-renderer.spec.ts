import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

// Runtime / regression smoke only. The seven-part Java BookModel reference is
// NOT an oracle for Bedrock's native mesh, camera, lighting or final raster.
const atlasHash='e8d23533b48976b578098db767e2c8161a31fa5d7b22bf576bf531b1bc7f000f';
async function instrumentation(page:Page) {
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    const draw=WebGLRenderingContext.prototype.drawArrays;
    WebGLRenderingContext.prototype.drawArrays=function(...args:Parameters<WebGLRenderingContext['drawArrays']>) {
      draw.apply(this,args);
      const canvas=this.canvas as HTMLCanvasElement;
      canvas.dataset.qaDraws=String(Number(canvas.dataset.qaDraws??0)+1);
      canvas.dataset.qaGlError=String(this.getError());
      canvas.dataset.qaVertices=String(args[2]);
    };
  });
  return errors;
}
async function rendered(canvas:Locator) {
  await expect.poll(async()=>Number(await canvas.getAttribute('data-qa-draws'))).toBeGreaterThan(0);
  await expect(canvas).toHaveAttribute('data-qa-gl-error','0');
}
async function picture(canvas:Locator,name:string) {
  await mkdir(new URL('../.cache/enchanting-independent-qa/',import.meta.url),{recursive:true});
  const bytes=await canvas.screenshot({path:fileURLToPath(new URL(`../.cache/enchanting-independent-qa/${name}.png`,import.meta.url))});
  return {image:PNG.sync.read(bytes),hash:createHash('sha256').update(PNG.sync.read(bytes).data).digest('hex')};
}
async function canonicalCanvas(canvas:Locator) {
  // Fix only this runtime specimen to an integer screen plane. Main page
  // composition is captured separately without changing production geometry.
  await canvas.evaluate(node=>Object.assign((node as HTMLElement).style,{position:'fixed',left:'16px',top:'16px',zIndex:'2147483647',background:'#c6c6c6'}));
}

test('book uses the original atlas and preserves explicit reconstruction provenance',async({page})=>{
  const source=await readFile(new URL('../src/assets/enchanting/enchanting_table_book.png',import.meta.url));
  expect(createHash('sha256').update(source).digest('hex')).toBe(atlasHash);
  const texture=PNG.sync.read(source);expect([texture.width,texture.height]).toEqual([64,32]);
  const errors=await instrumentation(page);await page.goto('/calibration.html');
  const fixture=page.locator('[data-enchanting-renderer-fixture]'),canvas=fixture.getByRole('img',{name:'Controlled enchanting book',exact:true});
  await rendered(canvas);await expect(canvas).toHaveAttribute('data-fidelity','renderer-reconstruction');
  await expect(canvas).toHaveAttribute('data-geometry-source','java-1.21.5-book-model');
  expect(Number(await canvas.getAttribute('data-qa-vertices'))).toBeGreaterThan(6);
  await canonicalCanvas(canvas);const {image}=await picture(canvas,'book-default');
  expect([image.width,image.height]).toEqual([80,80]);
  const colors=new Set<string>();let foreground=0,paper=0,cover=0;
  for(let index=0;index<image.data.length;index+=4) {
    const [r,g,b]=[image.data[index]!,image.data[index+1]!,image.data[index+2]!];
    if(r===198&&g===198&&b===198)continue;
    foreground++;colors.add(`${r},${g},${b}`);
    if(r>150&&g>140&&b>80)paper++;
    if(r>50&&b<100)cover++;
  }
  expect(foreground,'actual nonblank WebGL pixels').toBeGreaterThan(500);
  expect(colors.size,'multiple sampled atlas colors').toBeGreaterThan(4);
  expect(paper,'light page texels').toBeGreaterThan(100);expect(cover,'cover and binding texels').toBeGreaterThan(20);
  await expect(fixture.getByRole('status',{name:'Book renderer errors'})).toBeEmpty();expect(errors).toEqual([]);
});

test('controlled openness and page turn change rendered pixels and restore deterministically',async({page})=>{
  const errors=await instrumentation(page);await page.goto('/calibration.html');
  const fixture=page.locator('[data-enchanting-renderer-fixture]'),canvas=fixture.getByRole('img',{name:'Controlled enchanting book',exact:true});
  await rendered(canvas);await canonicalCanvas(canvas);const initial=await picture(canvas,'book-open');
  const change=async(control:Locator,key:string)=>{
    const before=Number(await canvas.getAttribute('data-qa-draws'));await control.press(key);
    await expect.poll(async()=>Number(await canvas.getAttribute('data-qa-draws'))).toBeGreaterThan(before);await rendered(canvas);
  };
  const open=fixture.getByRole('slider',{name:'Book openness'}),flip=fixture.getByRole('slider',{name:'Book page turn'});
  await change(open,'Home');await expect(open).toHaveValue('0');const closed=await picture(canvas,'book-closed');expect(closed.hash).not.toBe(initial.hash);
  await change(open,'End');await expect(open).toHaveValue('1');expect((await picture(canvas,'book-reopened')).hash).toBe(initial.hash);
  await change(flip,'ArrowRight');await expect(flip).toHaveValue('0.25');const turned=await picture(canvas,'book-quarter-turn');expect(turned.hash).not.toBe(initial.hash);
  await change(flip,'Home');await expect(flip).toHaveValue('0');expect((await picture(canvas,'book-turn-reset')).hash).toBe(initial.hash);
  await expect(fixture.getByRole('status',{name:'Book renderer errors'})).toBeEmpty();expect(errors).toEqual([]);
});

test('enchant costs retain original foregrounds and use distinct inferred tinted shadows in both states',async({page})=>{
  await page.goto('/');await page.evaluate(()=>document.fonts.ready);
  const options=page.locator('#workstations .mc-enchanting__option');await expect(options).toHaveCount(3);
  const expected=[{color:[128,255,32],shadow:[32,63,8],disabled:false},{color:[128,255,32],shadow:[32,63,8],disabled:false},{color:[138,94,92],shadow:[34,23,23],disabled:true}];
  for(let index=0;index<3;index++) {
    const option=options.nth(index),cost=option.locator('.mc-enchanting__cost'),want=expected[index]!;
    const actual=await cost.evaluate(node=>{const s=getComputedStyle(node);return{color:s.color.match(/\d+/g)?.map(Number),shadow:s.textShadow.match(/[\d.]+/g)?.map(Number)};});
    expect(actual.color).toEqual(want.color);
    // These exact shadow bytes are an implementation regression expectation;
    // the native Bedrock 0.25 darkening algorithm has NOT been established.
    expect(actual.shadow).toEqual([...want.shadow,2,2,0]);
    if(want.disabled)await expect(option).toBeDisabled();else await expect(option).toBeEnabled();
    const outer=await option.boundingBox(),inner=await cost.boundingBox();
    expect(Math.abs(outer!.x+outer!.width-inner!.x-inner!.width-4)).toBeLessThanOrEqual(.02);
    expect(Math.abs(outer!.y+outer!.height-inner!.y-inner!.height-4)).toBeLessThanOrEqual(.02);
  }
  // Host calibration remains possible when native screenshot evidence arrives.
  const cost=options.nth(0).locator('.mc-enchanting__cost');
  await cost.evaluate(node=>(node as HTMLElement).style.setProperty('--mc-enchantment-cost-shadow','#112233'));
  expect(await cost.evaluate(node=>getComputedStyle(node).textShadow)).toBe('rgb(17, 34, 51) 2px 2px 0px');
});

test('main enchanting page paints a textured book without page or GL errors',async({page},testInfo)=>{
  const errors=await instrumentation(page);await page.goto('/');await page.evaluate(()=>document.fonts.ready);
  // The main book is intentionally decorative inside aria-hidden=true.
  const region=page.locator('#workstations .mc-enchanting'),canvas=region.locator('canvas.mc-enchanting-book');
  await rendered(canvas);await expect(region.locator('.mc-enchanting__cost')).toHaveText(['3','15','30']);
  await mkdir(new URL('../.cache/enchanting-independent-qa/',import.meta.url),{recursive:true});
  const path=fileURLToPath(new URL('../.cache/enchanting-independent-qa/enchanting-unmasked.png',import.meta.url));
  await region.screenshot({path});await testInfo.attach('actual-implementation-not-native-reference',{path,contentType:'image/png'});
  expect(errors).toEqual([]);
});

test('lapis underlay stays opaque at source size beneath empty and occupied slot contents',async({page})=>{
  const verify=async(slot:Locator,occupied:boolean)=>{
    const underlay=slot.locator('.mc-slot__underlay'),placeholder=underlay.locator('.mc-enchanting__lapis-placeholder'),item=slot.locator('.mc-slot__item');
    await expect(underlay).toHaveCount(1);await expect(placeholder).toHaveCount(1);
    const data=await placeholder.evaluate(node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return{width:r.width,height:r.height,opacity:s.opacity,background:s.backgroundImage};});
    expect([data.width,data.height,data.opacity]).toEqual([32,32,'1']);expect(data.background).not.toBe('none');
    expect(await underlay.evaluate(node=>getComputedStyle(node).opacity)).toBe('1');
    const z=await Promise.all([underlay.evaluate(node=>Number(getComputedStyle(node).zIndex)),item.evaluate(node=>Number(getComputedStyle(node).zIndex))]);expect(z[0]!).toBeLessThan(z[1]!);
    const outer=await slot.boundingBox(),inside=await placeholder.boundingBox();expect([inside!.x-outer!.x,inside!.y-outer!.y]).toEqual([2,2]);
    if(occupied){await expect(slot).not.toHaveAttribute('data-empty');await expect(item.locator('img')).toHaveCount(1);}else await expect(slot).toHaveAttribute('data-empty','true');
  };
  await page.goto('/calibration.html');await verify(page.locator('[data-case="enchanting"] .mc-enchanting__lapis'),false);
  await page.goto('/');await verify(page.locator('#workstations .mc-enchanting__lapis'),true);
});
