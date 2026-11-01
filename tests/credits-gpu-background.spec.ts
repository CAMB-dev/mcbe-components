import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {PNG} from 'pngjs';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';

const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
function artwork(inverted=false){
  const png=new PNG({width:4,height:4});
  for(let y=0;y<4;y++)for(let x=0;x<4;x++){const color=[20+x*40,30+y*50,50+(x+y)*20,255];if(inverted)for(let c=0;c<3;c++)color[c]=255-color[c]!;png.data.set(color,(y*4+x)*4);}
  return PNG.sync.write(png);
}
async function instrument(page:Page){await page.addInitScript(()=>{
  const w=window as any,counts=w.creditsGpuCounts={fetches:0,decodes:0,closes:0,contexts:0,readPixels:0,draws:0,lossRequests:0,decodeOptions:[] as any[],renderers:[] as string[]};
  const nativeFetch=window.fetch.bind(window);window.fetch=(...args)=>{if(String(args[0]).includes('qa-credits-background'))counts.fetches++;return nativeFetch(...args);};
  const nativeBitmap=window.createImageBitmap.bind(window);
  window.createImageBitmap=(async(...args:any[])=>{
    counts.decodes++;counts.decodeOptions.push(args[1]);const bitmap=await (nativeBitmap as any)(...args),close=bitmap.close.bind(bitmap);
    bitmap.close=()=>{counts.closes++;close();};
    if(w.holdNextCreditsBitmap){w.holdNextCreditsBitmap=false;return await new Promise(resolve=>{w.releaseCreditsBitmap=()=>resolve(bitmap);});}
    return bitmap;
  }) as typeof createImageBitmap;
  const nativeContext=HTMLCanvasElement.prototype.getContext,seen=new WeakSet<object>();
  (HTMLCanvasElement.prototype as any).getContext=function(kind:string,...args:any[]){
    const gl=(nativeContext as any).call(this,kind,...args);
    if(kind==='webgl'&&gl&&this.matches('[data-background-renderer="gui-layer"]')&&!seen.has(gl)){
      seen.add(gl);counts.contexts++;
      const debug=gl.getExtension('WEBGL_debug_renderer_info');counts.renderers.push(debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):'unavailable');
      const read=gl.readPixels.bind(gl);gl.readPixels=(...args:any[])=>{counts.readPixels++;return read(...args);};
      for(const method of ['drawElements','drawArrays']){const draw=gl[method].bind(gl);gl[method]=(...args:any[])=>{counts.draws++;return draw(...args);};}
      const ext=gl.getExtension.bind(gl),wrapped=new WeakSet<object>();
      gl.getExtension=(name:string)=>{const value=ext(name);if(name==='WEBGL_lose_context'&&value&&!wrapped.has(value)){wrapped.add(value);const lose=value.loseContext.bind(value);value.loseContext=()=>{counts.lossRequests++;lose();};}return value;};
    }
    return gl;
  };
});}
async function open(page:Page,mount=true){
  await instrument(page);await page.route('**/qa-credits-background*.png',route=>route.fulfill({contentType:'image/png',body:artwork(route.request().url().includes('second'))}));
  await page.goto('/demo/credits-gpu-fixture.html'+(mount?'':'?mount=no'));await page.waitForFunction(()=>!!(window as any).creditsGpuQA);
  if(mount)await ready(page);
}
const canvas=(page:Page)=>page.locator('[data-background-renderer="gui-layer"]');
async function ready(page:Page){await expect(canvas(page)).toHaveAttribute('data-render-state','ready');}
async function configure(page:Page,patch:any){await page.evaluate(p=>(window as any).creditsGpuQA.configure(p),patch);}
async function pixels(page:Page){return Buffer.from((await page.evaluate(()=>(window as any).creditsGpuQA.raw())).rgba,'base64');}
const counts=(page:Page)=>page.evaluate(()=>(window as any).creditsGpuCounts);
const events=(page:Page)=>page.evaluate(()=>(window as any).creditsGpuQA.events);
function expected(offset=-24,scale=1,width=64,height=48,rounding:'floor'|'truncate'='truncate',inverted=false){
  // Authored4x4 texture,16-unit stride and64x96 source; independent integer rectangle oracle.
  const out=Buffer.alloc(width*height*4),source=PNG.sync.read(artwork(inverted)).data,round=rounding==='floor'?Math.floor:Math.trunc;
  for(let col=0;col<4;col++)for(let row=0;row<6;row++){
    const left=round(Math.fround(Math.fround(col*16)*Math.fround(scale))),top=round(Math.fround(Math.fround(offset+row*16)*Math.fround(scale))),size=16*scale;
    for(let y=Math.max(0,top);y<Math.min(height,top+size);y++)for(let x=Math.max(0,left);x<Math.min(width,left+size);x++){
      const tx=Math.floor((x+.5-left)/size*4),ty=Math.floor((y+.5-top)/size*4);out.set(source.subarray((ty*4+tx)*4,(ty*4+tx)*4+4),(y*width+x)*4);
    }
  }
  return out;
}

test('StrictMode decodes once and controlled time updates reuse one context with zero automatic readbacks',async({page},info)=>{
  await open(page);expect(await counts(page)).toMatchObject({fetches:1,decodes:1,contexts:1,readPixels:0,closes:0});
  await page.evaluate(()=>{(window as any).creditsGpuQA.saved=document.querySelector('[data-background-renderer="gui-layer"]');});
  for(const elapsedMs of [0,250,500,750,1000]){
    await configure(page,{elapsedMs});expect((await pixels(page)).equals(expected(-24-16*elapsedMs/1000))).toBe(true);
    expect(await page.evaluate(()=>(window as any).creditsGpuQA.saved===document.querySelector('[data-background-renderer="gui-layer"]'))).toBe(true);
  }
  expect(await counts(page)).toMatchObject({fetches:1,decodes:1,contexts:1,readPixels:5});expect(await events(page)).toEqual([]);
  await page.evaluate(()=>(window as any).creditsGpuQA.unmount());
  expect(await counts(page)).toMatchObject({closes:1,lossRequests:1});
  await info.attach('owned-background-counters.json',{body:JSON.stringify(await counts(page)),contentType:'application/json'});
});

test('unrounded logical offsets, scale and rounding changes preserve decoded asset and exact whole frames',async({page})=>{
  await open(page);await configure(page,{from:[0,-24.5],to:[0,-24.5]});expect((await pixels(page)).equals(expected(-24.5))).toBe(true);
  await configure(page,{originRounding:'floor'});expect((await pixels(page)).equals(expected(-24.5,1,64,48,'floor'))).toBe(true);
  await configure(page,{width:96,height:64,scale:2,originRounding:'truncate'});expect((await pixels(page)).equals(expected(-24.5,2,96,64))).toBe(true);
  await configure(page,{rasterOrigin:'webgl'});expect((await pixels(page)).equals(expected(-24.5,2,96,64))).toBe(true);
  expect(await counts(page)).toMatchObject({fetches:1,decodes:1,contexts:1,readPixels:4,closes:0});
});

test('closed and hidden owners retire once and reopen on fresh canvases at the latest committed frame',async({page})=>{
  await open(page);await page.evaluate(()=>{(window as any).creditsGpuQA.saved=document.querySelector('[data-background-renderer="gui-layer"]');});
  await configure(page,{open:false,elapsedMs:500});await expect(canvas(page)).toHaveCount(0);expect(await counts(page)).toMatchObject({closes:1,lossRequests:1});
  await configure(page,{open:true});await ready(page);expect((await pixels(page)).equals(expected(-32))).toBe(true);
  expect(await page.evaluate(()=>(window as any).creditsGpuQA.saved===document.querySelector('[data-background-renderer="gui-layer"]'))).toBe(false);
  await configure(page,{hidden:true,elapsedMs:750});await expect(canvas(page)).toHaveCount(0);expect(await counts(page)).toMatchObject({closes:2,lossRequests:2});
  await configure(page,{hidden:false});await ready(page);expect((await pixels(page)).equals(expected(-36))).toBe(true);
  expect(await counts(page)).toMatchObject({fetches:3,decodes:3,contexts:3});expect(await events(page)).toEqual([]);
});

test('late retired bitmap closes without replacing a newer asset or calling stale error callbacks',async({page})=>{
  await open(page,false);await page.evaluate(()=>{(window as any).holdNextCreditsBitmap=true;(window as any).creditsGpuQA.configure({tag:'old'});});
  await page.waitForFunction(()=>typeof(window as any).releaseCreditsBitmap==='function');
  await configure(page,{src:'/qa-credits-background-second.png',tag:'new'});await ready(page);expect((await pixels(page)).equals(expected(-24,1,64,48,'truncate',true))).toBe(true);
  await page.evaluate(()=>(window as any).releaseCreditsBitmap());await expect.poll(async()=>(await counts(page)).closes).toBe(1);
  expect((await pixels(page)).equals(expected(-24,1,64,48,'truncate',true))).toBe(true);expect(await events(page)).toEqual([]);
  expect(await counts(page)).toMatchObject({fetches:2,decodes:2,contexts:1,closes:1});await page.evaluate(()=>(window as any).creditsGpuQA.unmount());
  expect(await counts(page)).toMatchObject({closes:2,lossRequests:1});
});

test('context loss notifies the latest committed callback once and reopens with a new owner',async({page})=>{
  await open(page);await configure(page,{tag:'latest'});
  await canvas(page).evaluate(node=>(node as HTMLCanvasElement).getContext('webgl')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(canvas(page)).toHaveAttribute('data-render-state','error');expect(await events(page)).toEqual([{kind:'error',tag:'latest',message:expect.stringContaining('context was lost')}]);
  await configure(page,{elapsedMs:500});expect((await counts(page)).closes).toBe(1);
  await configure(page,{open:false});await configure(page,{open:true});await ready(page);expect((await pixels(page)).equals(expected(-32))).toBe(true);
  expect(await counts(page)).toMatchObject({fetches:2,decodes:2,contexts:2});expect(await events(page)).toHaveLength(1);
});

test('declared image mismatch fails before any GPU context and a CSS round trip creates a fresh valid owner',async({page})=>{
  await open(page,false);await configure(page,{naturalSize:[2,2]});await expect(canvas(page)).toHaveAttribute('data-render-state','error');
  expect(await counts(page)).toMatchObject({contexts:0,decodes:1,closes:1});expect(await events(page)).toHaveLength(1);
  await configure(page,{gpu:false});await expect(canvas(page)).toHaveCount(0);
  await configure(page,{gpu:true,naturalSize:[4,4]});await ready(page);expect(await counts(page)).toMatchObject({contexts:1,decodes:2});
});

test('detaching an active owner before a pending decode rejection never publishes a retired error',async({page})=>{
  await open(page,false);
  await page.evaluate(()=>{
    (window as any).savedCreditsDecoder=window.createImageBitmap;
    window.createImageBitmap=(()=>new Promise((_resolve,reject)=>{(window as any).rejectCreditsBitmap=reject;})) as typeof createImageBitmap;
    (window as any).creditsGpuQA.configure({tag:'retired'});
  });
  await page.waitForFunction(()=>typeof(window as any).rejectCreditsBitmap==='function');
  await page.evaluate(()=>{document.querySelector('[data-background-renderer="gui-layer"]')!.remove();(window as any).rejectCreditsBitmap(new Error('late-decode'));});
  await page.waitForTimeout(30);expect(await events(page)).toEqual([]);expect((await counts(page)).contexts).toBe(0);
});

test('a successful decode after direct owner detachment closes its bitmap and creates no context',async({page})=>{
  await open(page,false);await page.evaluate(()=>{(window as any).holdNextCreditsBitmap=true;(window as any).creditsGpuQA.configure({tag:'detached'});});
  await page.waitForFunction(()=>typeof(window as any).releaseCreditsBitmap==='function');
  await page.evaluate(()=>{document.querySelector('[data-background-renderer="gui-layer"]')!.remove();(window as any).releaseCreditsBitmap();});
  await expect.poll(async()=>(await counts(page)).closes).toBe(1);expect((await counts(page)).contexts).toBe(0);expect(await events(page)).toEqual([]);
});

test('transparent PNG stays straight through decode and premultiplied only in the real framebuffer',async({page})=>{
  await open(page,false);const png=new PNG({width:4,height:4});for(let i=0;i<png.data.length;i+=4)png.data.set([255,32,64,128],i);
  await page.route('**/qa-credits-background.png',route=>route.fulfill({contentType:'image/png',body:PNG.sync.write(png)}));
  await configure(page,{});await ready(page);expect((await pixels(page)).equals(Buffer.from(Array(64*48).fill([128,16,32,128]).flat()))).toBe(true);
  const shot=PNG.sync.read(await canvas(page).screenshot({omitBackground:true}));expect(shot.data.equals(Buffer.from(Array(64*48).fill([128,16,32,255]).flat()))).toBe(true);
  expect((await counts(page)).decodeOptions).toEqual([{premultiplyAlpha:'none',colorSpaceConversion:'none',imageOrientation:'none'}]);
});

test('a complete original-format TGA background avoids ImageBitmap and preserves exact decoded channels',async({page})=>{
  await open(page,false);const bytes=Buffer.alloc(18+4*4*4);bytes[2]=2;bytes.writeUInt16LE(4,12);bytes.writeUInt16LE(4,14);bytes[16]=32;bytes[17]=0x28;
  for(let i=18;i<bytes.length;i+=4)bytes.set([160,100,40,255],i);
  await page.route('**/qa-credits-background-tga',route=>route.fulfill({contentType:'image/x-tga',body:bytes}));
  await configure(page,{src:'/qa-credits-background-tga'});await ready(page);expect((await pixels(page)).equals(Buffer.from(Array(64*48).fill([40,100,160,255]).flat()))).toBe(true);
  expect(await counts(page)).toMatchObject({fetches:1,decodes:0,contexts:1,closes:0});await page.evaluate(()=>(window as any).creditsGpuQA.unmount());
  expect(await counts(page)).toMatchObject({closes:0,lossRequests:1});
});

test('aborted pending fetch cannot overwrite a reopened screen with a new asset',async({page})=>{
  await open(page,false);let release:(()=>Promise<void>)|undefined;
  await page.route('**/qa-credits-background-pending.png',route=>{release=async()=>{await route.fulfill({contentType:'image/png',body:artwork()}).catch(()=>{});};});
  await configure(page,{src:'/qa-credits-background-pending.png'});await expect.poll(()=>!!release).toBe(true);
  await configure(page,{open:false});await configure(page,{open:true,src:'/qa-credits-background-second.png'});await ready(page);
  await release!();expect((await pixels(page)).equals(expected(-24,1,64,48,'truncate',true))).toBe(true);expect(await events(page)).toEqual([]);
  expect(await counts(page)).toMatchObject({fetches:2,decodes:1,contexts:1});
});

test('changing declared natural dimensions at the same URL retires and reloads the asset owner',async({page})=>{
  await open(page);await page.evaluate(()=>{(window as any).creditsGpuQA.saved=document.querySelector('[data-background-renderer="gui-layer"]');});
  const four=PNG.sync.read(artwork()),eight=new PNG({width:8,height:8});
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){const at=(Math.floor(y/2)*4+Math.floor(x/2))*4;eight.data.set(four.data.subarray(at,at+4),(y*8+x)*4);}
  await page.route('**/qa-credits-background.png',route=>route.fulfill({contentType:'image/png',body:PNG.sync.write(eight)}));
  await configure(page,{naturalSize:[8,8]});await ready(page);expect((await pixels(page)).equals(expected(-24))).toBe(true);
  expect(await page.evaluate(()=>(window as any).creditsGpuQA.saved===document.querySelector('[data-background-renderer="gui-layer"]'))).toBe(false);
  expect(await counts(page)).toMatchObject({fetches:2,decodes:2,contexts:2,closes:1,lossRequests:1});
});

test('the real playback clock moves the owned background, pauses drawing and resumes without redecode',async({page})=>{
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));
  await open(page);await configure(page,{controlled:false,playing:true});await page.clock.runFor(500);
  await configure(page,{playing:false});
  const offset=Number(await page.locator('.mc-credits-roll').getAttribute('data-offset'));expect(offset).toBeGreaterThan(.4);
  const frozen=await pixels(page);expect(frozen.equals(expected(-24-16*Math.min(offset,1)))).toBe(true);
  const before=await counts(page);await page.clock.runFor(500);expect((await pixels(page)).equals(frozen)).toBe(true);
  expect((await counts(page)).draws).toBe(before.draws);
  await configure(page,{playing:true});await page.clock.runFor(200);await configure(page,{playing:false});
  const later=Number(await page.locator('.mc-credits-roll').getAttribute('data-offset'));expect(later).toBeGreaterThan(offset);
  expect((await pixels(page)).equals(expected(-24-16*Math.min(later,1)))).toBe(true);
  expect(await counts(page)).toMatchObject({fetches:1,decodes:1,contexts:1});expect(await events(page)).toEqual([]);
});

test('point background remains nearest-neighbor when the real compositor presents at device scale two',async({browser,baseURL},info)=>{
  const context=await browser.newContext({baseURL,viewport:{width:200,height:160},deviceScaleFactor:2});
  try{
    const page=await context.newPage();await open(page);const bytes=await canvas(page).screenshot({omitBackground:true});
    await info.attach('gpu-background-device-scale-two.png',{body:bytes,contentType:'image/png'});
    const shot=PNG.sync.read(bytes),source=expected(),nearest=Buffer.alloc(128*96*4);
    for(let y=0;y<96;y++)for(let x=0;x<128;x++){const at=(Math.floor(y/2)*64+Math.floor(x/2))*4;nearest.set(source.subarray(at,at+4),(y*128+x)*4);}
    expect([shot.width,shot.height]).toEqual([128,96]);expect(shot.data.equals(nearest)).toBe(true);
  }finally{await context.close();}
});

test('a portaled screen resolves its relative background URL against its own document base',async({page,baseURL})=>{
  await open(page,false);const requested:string[]=[];
  page.on('request',request=>{if(request.url().includes('relative-background.png'))requested.push(request.url());});
  await page.route('**/demo/relative-background.png',route=>route.fulfill({status:404,body:'wrong document base'}));
  await page.route('**/frame-assets/relative-background.png',route=>route.fulfill({contentType:'image/png',body:artwork()}));
  await page.evaluate(async url=>{
    const frame=document.createElement('iframe');frame.id='credits-frame';
    const loaded=new Promise<void>(resolve=>frame.addEventListener('load',()=>resolve(),{once:true}));
    frame.srcdoc=`<!doctype html><base href="${url}/frame-assets/"><body></body>`;document.body.append(frame);await loaded;
    (window as any).creditsGpuQA.portal=frame.contentDocument!.body;(window as any).creditsGpuQA.configure({src:'relative-background.png'});
  },baseURL);
  const target=page.frameLocator('#credits-frame').locator('[data-background-renderer="gui-layer"]');await expect(target).toHaveAttribute('data-render-state','ready');
  const data=await target.evaluate(node=>{const c=node as HTMLCanvasElement,gl=c.getContext('webgl')!,bottom=new Uint8Array(c.width*c.height*4),top=new Uint8Array(bottom.length);
    gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,bottom);for(let y=0;y<c.height;y++)top.set(bottom.subarray(y*c.width*4,(y+1)*c.width*4),(c.height-1-y)*c.width*4);return Array.from(top);});
  expect(Buffer.from(data).equals(expected())).toBe(true);expect(requested).toEqual([baseURL+'/frame-assets/relative-background.png']);expect(await events(page)).toEqual([]);
});

test('OPTIONAL CreditsScreen controlled background matches the complete original native target',async({playwright,baseURL},info)=>{
  const native=new URL('../.cache/credits-pix-live-02/text-shadow-q0-e76-01/',import.meta.url);
  test.skip(!existsSync(new URL('texture-13-before.bin',native)),'The private immutable native target is optional.');
  const browser=await playwright.chromium.launch({headless:true,args:['--enable-gpu','--use-gl=angle','--use-angle=d3d11']});
  try{
    const page=await browser.newPage({baseURL,viewport:{width:2570,height:1402}});await page.goto('/demo/credits-gpu-fixture.html?mount=no');await page.waitForFunction(()=>!!(window as any).creditsGpuQA);
    await configure(page,{width:2570,height:1402,scale:5,src:'/demo/assets/credits/bg32.png',naturalSize:[32,32],tileSize:[64,64],
      logicalSize:[514,5620],from:[0,-2669.5],to:[0,-2669.5],elapsedMs:0});await ready(page);
    const renderer=await canvas(page).evaluate(node=>{const gl=(node as HTMLCanvasElement).getContext('webgl')!,ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';});expect(renderer).toMatch(/NVIDIA.*Direct3D11/);
    const pngBytes=await page.screenshot({omitBackground:true});await info.attach('controlled-credits-background-full.png',{body:pngBytes,contentType:'image/png'});
    const actual=PNG.sync.read(pngBytes);expect([actual.width,actual.height]).toEqual([2570,1402]);
    const raw=await readFile(new URL('texture-13-before.bin',native));expect(sha(raw)).toBe('72027f112891eb288525dd11d252a28ed0bad5635f69d92562ed21c4fd415391');
    const fp=JSON.parse(await readFile(new URL('texture-13-before-footprints.json',native),'utf8')).subresources[0];
    const expected=Buffer.concat(Array.from({length:fp.height},(_,y)=>raw.subarray(fp.placedOffset+y*fp.rowPitch,fp.placedOffset+y*fp.rowPitch+fp.width*4)));
    expect(actual.data.equals(expected)).toBe(true);await info.attach('controlled-credits-background-native.json',{body:JSON.stringify({renderer,pixels:2570*1402,differentPixels:0,actualRGBAHash:sha(actual.data),scope:'Empty content, intro complete, explicit centered/from-zero source candidate, NVIDIA D3D11. No native player/font/clock certification.'}),contentType:'application/json'});
  }finally{await browser.close();}
});
