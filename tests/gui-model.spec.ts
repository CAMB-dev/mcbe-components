import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { PNG } from 'pngjs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GuiLayer, renderGuiLayer } from '../src';
import type { GuiLayerProps } from '../src';
import { layoutGuiModel, createGuiCuboidModel } from '../src/gui-model-geometry';
import type { GuiModelGeometry } from '../src/gui-model-geometry';
import { assembleGuiTextureAtlas } from '../src/gui-texture-atlas';

const sha = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
const pinnedSourcePaths=['src/gui-model-geometry.ts','src/gui-texture-atlas.ts','src/gui-layer.ts','src/gui-layer-component.tsx','src/gui-layer-webgl.ts','src/gui-layer-kernels.ts','src/gui-image-geometry.ts','src/gui-precision.ts','tests/gui-model.spec.ts','demo/gui-model-fixture.tsx','demo/gui-model-fixture.html'];
let sourceBefore:Record<string,string>={};
const runIdentity=Date.now().toString();
test.beforeAll(async()=>{sourceBefore=Object.fromEntries(await Promise.all(pinnedSourcePaths.map(async path=>[path,sha(await readFile(new URL('../'+path,import.meta.url)))])));});
test.afterAll(async()=>{const sourceAfter=Object.fromEntries(await Promise.all(pinnedSourcePaths.map(async path=>[path,sha(await readFile(new URL('../'+path,import.meta.url)))])));await writeFile(new URL(`../.cache/gui-model-independent-qa/source-manifest-${runIdentity}.json`,import.meta.url),JSON.stringify({sourceBefore,sourceAfter,unchanged:JSON.stringify(sourceBefore)===JSON.stringify(sourceAfter)},null,2));expect(sourceAfter,'Source inputs must remain frozen throughout the actual batch').toEqual(sourceBefore);});
const texture = (p: PNG) => ({ width: p.width, height: p.height, rgba: p.data.toString('base64') });
const pixel = (rgba: number[]) => ({ width: 1, height: 1, rgba });
function frontFace(width = 4, height = 3, sourceWidth = 1, sourceHeight = 1): any {
 return { vertices: [[0,0,0],[width,0,0],[width,height,0],[0,height,0]], uv: [[0,sourceHeight],[sourceWidth,sourceHeight],[sourceWidth,0],[0,0]], normal: [0,0,1], texture: 'all' };
}
function model(textureValue: any = pixel([20,80,140,255])): any {
 return { kind: 'model', origin: [2,6], projection: { yaw: 0, pitch: 0, scale: 1, offset: [0,0], originQuantization: 'none' },
  textureSizes: { all: [textureValue.width ?? 1, textureValue.height ?? 1] }, model: { faces: [frontFace()] }, textures: { all: textureValue } };
}
function fill(data: Uint8Array, width: number, box: number[], color: number[]) { const [x,y,w,h] = box as [number,number,number,number]; for(let yy=y; yy<y+h; yy++) for(let xx=x; xx<x+w; xx++) data.set(color,(yy*width+xx)*4); }
async function open(page: Page) { await page.goto('/demo/gui-model-fixture.html'); await page.waitForFunction(() => !!window.guiModelQA); }
async function render(page: Page, options: any) { const value = await page.evaluate(o => window.guiModelQA.render(o),options); return {...value, data:Buffer.from(value.rgba,'base64'),live:Buffer.from(value.liveRgba,'base64')}; }
async function mount(page: Page, options: any, strict = false) { const serial = await page.evaluate(() => window.guiModelQA.serial); await page.evaluate(({o,s}) => window.guiModelQA.mount(o,s),{o:options,s:strict}); await page.waitForFunction(n => window.guiModelQA.serial>n || window.guiModelQA.events.some((e:string)=>e.startsWith('error:')),serial); await expect(page.locator('canvas.mc-gui-layer')).toHaveAttribute('data-render-state','ready'); }
async function raw(page: Page) { const value = await page.evaluate(() => window.guiModelQA.rawCanvas()); return {...value,data:Buffer.from(value.rgba,'base64')}; }
async function prove(info:TestInfo,name:string,actual:Uint8Array,expected:Uint8Array,extra:any={}) {
 let pixels=0,bytes=0,max=0,alpha=0;const first:any[]=[];
 for(let i=0;i<actual.length;i+=4){let different=false;for(let c=0;c<4;c++){const delta=Math.abs(actual[i+c]!-expected[i+c]!);if(delta){bytes++;different=true;max=Math.max(max,delta);if(c===3)alpha++;}}if(different){pixels++;if(first.length<12)first.push({index:i/4,actual:[...actual.subarray(i,i+4)],expected:[...expected.subarray(i,i+4)]});}}
 const value={...extra,totalPixels:actual.length/4,differingPixels:pixels,differingBytes:bytes,max,alpha,first12:first,actualSha256:sha(actual),expectedSha256:sha(expected)};
 if(bytes&&extra.frame){const [width,height]=extra.frame;for(const [side,data] of [['actual',actual],['expected',expected]] as const){const image=new PNG({width,height});image.data.set(data);await writeFile(new URL(`../.cache/gui-model-independent-qa/${name}-${side}-${sha(data).slice(0,12)}.png`,import.meta.url),PNG.sync.write(image));}}
 await info.attach(name+'.json',{body:JSON.stringify(value,null,2),contentType:'application/json'});expect(actual.length).toBe(expected.length);expect(bytes,name).toBe(0);return value;
}

test('explicit source model SSR retains semantic canvas, no IO or projection defaults',()=>{
 const geometry:GuiModelGeometry={model:{faces:[frontFace()]},origin:[2,6],projection:{yaw:0,pitch:0,scale:1,offset:[0,0],originQuantization:'none'},textureSizes:{all:[1,1]}};
 const props:GuiLayerProps={width:16,height:12,guiScale:1,label:'Source model',commands:[{kind:'model',...geometry,textures:{all:{width:1,height:1,data:new Uint8ClampedArray([1,2,3,255])}}}]};
 const html=renderToStaticMarkup(createElement(GuiLayer,props));expect(html).toContain('role="img"');expect(html).toContain('aria-label="Source model"');expect(html).toContain('data-render-state="loading"');expect(html).not.toMatch(/ model=| projection=| textureSizes=/);
 expect(renderToStaticMarkup(createElement(GuiLayer,{...props,label:undefined}))).toContain('aria-hidden="true"');
 expect(()=>layoutGuiModel({width:16,height:12,guiScale:1,...geometry,projection:undefined as any})).toThrow(/projection/);
 expect(()=>renderGuiLayer({width:16,height:12,guiScale:1,commands:[{kind:'model',...geometry,textures:{all:{width:2,height:1,data:new Uint8ClampedArray(8)}}}]})).toThrow(/dimensions/);
 expect(()=>layoutGuiModel({width:16,height:12,guiScale:1,...geometry,textureSizes:{all:new Array(2) as any}})).toThrow(/dimensions/);
});

test('source model origin quantization, custom local coordinates and face culling remain explicit',()=>{
 const base={width:31,height:23,guiScale:2,model:{faces:[frontFace(),{...frontFace(),normal:[0,0,-1],texture:'unused'}]},origin:[-.3,-.2] as const,projection:{yaw:0,pitch:0,scale:1,offset:[5,6] as const,originQuantization:'physical-floor' as const},textureSizes:{all:[1,1] as const}};
 const value=layoutGuiModel(base);expect(value.paintOrigin).toEqual([-.5,-.5]);expect(value.logicalStage).toEqual([16,12]);expect(value.projectionSize).toEqual([15.5,11.5]);expect(value.runs).toHaveLength(1);expect(value.runs[0]!.mesh.vertices.map(v=>v.position)).toEqual([[4.5,5.5],[8.5,5.5],[8.5,2.5],[4.5,2.5]]);expect(value.runs[0]!.mesh.indices).toEqual([1,2,0,0,2,3]);
 const direct=layoutGuiModel({...base,projection:{...base.projection,originQuantization:'none'}});expect(direct.paintOrigin).toEqual([-.3,-.2]);expect(direct.runs[0]!.mesh.vertices).not.toEqual(value.runs[0]!.mesh.vertices);
 const cropped=layoutGuiModel({...base,outputRect:[2,3,20,15]});expect([...cropped.mvp]).toEqual([...value.mvp]);expect(cropped.runs[0]!.mesh.vertices).toEqual(value.runs[0]!.mesh.vertices);
});

test('cuboid helper preserves source voxel UV and asymmetric material face colors without native camera assumptions',()=>{
 const box=createGuiCuboidModel([0,0,0],[16,12,16],{colors:{east:[127,127,127,255],south:[186,186,186,255]}});expect(box.faces).toHaveLength(6);
 expect(box.faces.map(f=>f.normal)).toEqual([[0,1,0],[1,0,0],[0,0,1],[0,-1,0],[-1,0,0],[0,0,-1]]);
 expect(box.faces[1]!.vertices).toEqual([[16,12,16],[16,0,16],[16,0,0],[16,12,0]]);expect(box.faces[1]!.uv).toEqual([[0,4],[0,16],[16,16],[16,4]]);expect(box.faces[2]!.uv).toEqual([[16,4],[0,4],[0,16],[16,16]]);
 expect(box.faces[1]!.color).toEqual([127,127,127,255]);expect(box.faces[2]!.color).toEqual([186,186,186,255]);
 for(const [min,max] of [[[-1,0,0],[16,16,16]],[[0,0,0],[17,16,16]],[[0,0,0],[0,16,16]]])expect(()=>createGuiCuboidModel(min as any,max as any)).toThrow(/bounds/);
});

test('non-square original model texture and Sprite alpha branch produce independent complete fields',async({page},info)=>{
 await open(page);const p=new PNG({width:2,height:1});p.data.set([200,150,90,255,70,130,210,128]);const command=model(texture(p));command.model.faces=[frontFace(8,4,2,1)];
 const options={width:16,height:12,guiScale:1,commands:[command]},expected=new Uint8Array(16*12*4);fill(expected,16,[2,2,4,4],[200,150,90,255]);fill(expected,16,[6,2,4,4],[70,130,210,255]);
 const value=await render(page,options);await prove(info,'non-square-model-fbo',value.data,expected,{renderer:value.renderer});await prove(info,'non-square-model-live',value.live,expected);await mount(page,options);await prove(info,'non-square-model-react',(await raw(page)).data,expected);
});

test('model faces keep caller order, separate byte color and layer scissor across material switches',async({page},info)=>{
 await open(page);const first=model(pixel([200,150,90,255]));first.model.faces[0].color=[128,255,255,255];
 const second={...model(pixel([10,100,200,255])),origin:[5,7]};
 const fontPage=new PNG({width:128,height:128});fill(fontPage.data,128,[0,0,8,8],[255,255,255,255]);
 const text={kind:'text',text:'A',font:{pages:['unused-font'],pageSizes:[128],cellHeight:8,lineHeight:8,glyphs:{A:{page:0,x:0,y:0,width:8,height:8,advance:8}}},pages:[[0,texture(fontPage)]],origin:[8,1],fontScale:1,sampling:'point',shader:'bitmap',color:[0,255,0,255]};
 const options={width:16,height:12,guiScale:1,scissor:[1,1,12,9],commands:[{kind:'image',rect:[0,0,16,12],texture:pixel([3,9,27,255])},first,text,{kind:'sprite',rect:[4,3,4,5],texture:pixel([30,60,90,128]),color:[255,255,255,255]},second]};
 const expected=new Uint8Array(16*12*4);fill(expected,16,[1,1,12,9],[3,9,27,255]);fill(expected,16,[2,3,4,3],[100,150,90,255]);fill(expected,16,[8,1,5,8],[0,255,0,255]);fill(expected,16,[4,3,4,5],[30,60,90,255]);fill(expected,16,[5,4,4,3],[10,100,200,255]);
 const value=await render(page,options);await prove(info,'ordered-model-sprite-image',value.data,expected);
 const crop=await render(page,{...options,outputRect:[2,2,10,8]});const expectedCrop=new Uint8Array(10*8*4);for(let y=0;y<8;y++)expectedCrop.set(expected.subarray(((y+2)*16+2)*4,((y+2)*16+12)*4),y*10*4);await prove(info,'model-whole-frame-crop',crop.data,expectedCrop);await mount(page,{...options,outputRect:[2,2,10,8]});await prove(info,'model-react-crop',(await raw(page)).data,expectedCrop);
});

test('used model texture keys share URLs and own all fallback without fetching culled bindings',async({page})=>{
 const p=new PNG({width:2,height:1});p.data.set([20,80,140,255,20,80,140,255]);let requests=0;await page.route('**/model-shared.png',async r=>{requests++;await r.fulfill({contentType:'image/png',body:PNG.sync.write(p)});});await page.route('**/model-unused.png',()=>{throw Error('Culled texture was fetched');});await open(page);
 const command=model('/model-shared.png');command.textureSizes={named:[2,1]};command.textures={all:'/model-shared.png',unused:'/model-unused.png'};command.model.faces=[{...frontFace(4,3,2,1),texture:'named'},{...frontFace(4,3,2,1),texture:'unused',normal:[0,0,-1]}];
 await mount(page,{width:16,height:12,guiScale:1,commands:[command,{kind:'image',rect:[8,2,4,3],texture:'/model-shared.png'}]},true);expect(requests).toBe(1);expect([...(await raw(page)).data.subarray((3*16+3)*4,(3*16+3)*4+4)]).toEqual([20,80,140,255]);
 const error=await page.evaluate(()=>{try{const options={width:8,height:8,guiScale:1,...window.guiModelQA.props.commands[0],textureSizes:Object.create({named:[2,1]})};window.guiModelQA.layout(options);return null;}catch(e){return String(e);}});expect(error).toMatch(/dimensions/);
});

test('model React snapshot observes projection face color and pixel mutations while equivalent values stay ready',async({page})=>{
 await open(page);const options={width:16,height:12,guiScale:1,commands:[model()]};await mount(page,options,true);const serial=await page.evaluate(()=>window.guiModelQA.serial),original=await raw(page);
 await page.evaluate(()=>{window.guiModelQA.props={...window.guiModelQA.props,commands:window.guiModelQA.props.commands.map((c:any)=>({...c,model:{faces:c.model.faces.map((f:any)=>({...f}))}}))};window.guiModelQA.paint();});await expect(page.locator('canvas')).toHaveAttribute('data-render-state','ready');expect(await page.evaluate(()=>window.guiModelQA.serial)).toBe(serial);expect((await raw(page)).data.equals(original.data)).toBe(true);
 await page.evaluate(()=>{window.guiModelQA.props.commands[0].projection.offset[0]=2;window.guiModelQA.paint();});await page.waitForFunction(n=>window.guiModelQA.serial>n,serial);const shifted=await raw(page);expect(shifted.data.equals(original.data)).toBe(false);expect([...shifted.data.subarray((4*16+3)*4,(4*16+3)*4+4)]).toEqual([0,0,0,0]);
 const next=await page.evaluate(()=>window.guiModelQA.serial);await page.evaluate(()=>{const c=window.guiModelQA.props.commands[0];c.model.faces[0].color=[255,0,255,255];c.textures.all.data.set([50,150,250,255]);window.guiModelQA.paint();});await page.waitForFunction(n=>window.guiModelQA.serial>n,next);expect([...(await raw(page)).data.subarray((4*16+5)*4,(4*16+5)*4+4)]).toEqual([50,0,250,255]);
});

test('decoded model-size failure is atomic and explicit retry plus context-loss recovery retain semantics',async({page})=>{
 const p=new PNG({width:1,height:1});p.data.set([10,30,90,255]);await page.route('**/model-wrong-size.png',r=>r.fulfill({contentType:'image/png',body:PNG.sync.write(p)}));await open(page);const broken=model('/model-wrong-size.png');broken.textureSizes.all=[2,1];
 await page.evaluate(o=>window.guiModelQA.mount(o),{width:16,height:12,guiScale:1,label:'Model status',commands:[broken]});await expect(page.locator('canvas')).toHaveAttribute('data-render-state','error');expect(await page.locator('canvas').getAttribute('width')).toBe('0');expect(await page.locator('canvas').getAttribute('aria-label')).toBe('Model status');
 await mount(page,{width:16,height:12,guiScale:1,label:'Model status',tabIndex:0,renderKey:1,commands:[model()]});await page.locator('canvas').focus();expect(await page.locator('canvas').evaluate(n=>n===document.activeElement)).toBe(true);
 await page.evaluate(()=>window.guiModelQA.ref.getContext('webgl').getExtension('WEBGL_lose_context').loseContext());await expect(page.locator('canvas')).toHaveAttribute('data-render-state','error');await mount(page,{width:16,height:12,guiScale:1,label:'Model status',renderKey:2,commands:[model(pixel([30,90,150,255]))]});expect([...(await raw(page)).data.subarray((4*16+3)*4,(4*16+3)*4+4)]).toEqual([30,90,150,255]);
});

test('retired model URL work cannot publish stale pixels or callbacks after replacement and unmount',async({page})=>{
 let release:()=>void=()=>{};let requested:()=>void=()=>{};const gate=new Promise<void>(r=>release=r),seen=new Promise<void>(r=>requested=r);const p=new PNG({width:1,height:1});p.data.set([200,10,10,255]);
 await page.route('**/model-delayed.png',async route=>{requested();await gate;try{await route.fulfill({contentType:'image/png',body:PNG.sync.write(p)});}catch{/* Retired fetch may already be aborted. */}});await open(page);await page.evaluate(o=>window.guiModelQA.mount(o,true),{width:16,height:12,guiScale:1,commands:[model('/model-delayed.png')]});await seen;
 await mount(page,{width:16,height:12,guiScale:1,commands:[model(pixel([10,200,10,255]))]},true);release();await page.waitForLoadState('networkidle');expect(await page.evaluate(()=>window.guiModelQA.events.filter((e:string)=>e==='ready').length)).toBe(1);expect([...(await raw(page)).data.subarray((4*16+3)*4,(4*16+3)*4+4)]).toEqual([10,200,10,255]);await page.evaluate(()=>window.guiModelQA.unmount());await expect(page.locator('canvas')).toHaveCount(0);expect(await page.evaluate(()=>window.guiModelQA.events.some((e:string)=>e.startsWith('error:')))).toBe(false);
});

test('invalid source geometry and combined model run/resource budgets reject before network or GPU work',async({page})=>{
 await open(page);const base={width:16,height:12,guiScale:1,commands:[model()]};
 for(const c of [{...base.commands[0],projection:{...base.commands[0].projection,scale:0}},{...base.commands[0],projection:{...base.commands[0].projection,offset:[0,Number.NaN]}},{...base.commands[0],model:{faces:[{...frontFace(),uv:[[0,1],[2,1],[1,0],[0,0]]}]}},{...base.commands[0],model:{faces:[{...frontFace(),color:[255,255,255,256]}]}},{...base.commands[0],model:{faces:Array.from({length:4097},()=>frontFace())}}]){
  expect(await page.evaluate(o=>{try{window.guiModelQA.render(o);return null;}catch(e){return String(e);}}, {...base,commands:[c]})).not.toBeNull();
 }
 const requests:string[]=[];page.on('request',r=>{if(r.url().includes('model-budget-'))requests.push(r.url());});const commands=Array.from({length:257},(_,i)=>({...model(`/model-budget-${i}.png`)}));await page.evaluate(o=>window.guiModelQA.mount(o),{...base,commands});await expect(page.locator('canvas')).toHaveAttribute('data-render-state','error');expect(requests).toEqual([]);
 const combined=[{...model(),model:{faces:Array.from({length:4096},()=>frontFace())}},model()];expect(await page.evaluate(o=>{try{window.guiModelQA.render(o);return null;}catch(e){return String(e);}}, {...base,commands:combined})).toMatch(/budget/);
});

test('explicit source atlas pure assembly copies straight bytes and rejects invalid packing before allocation',()=>{
 const source={width:2,height:1,data:new Uint8ClampedArray([201,99,51,0,80,160,240,128])};
 const atlas=assembleGuiTextureAtlas({width:8,height:4,tiles:[{origin:[2,1],texture:source}]});const expected=new Uint8ClampedArray(8*4*4);expected.set(source.data,(1*8+2)*4);expect([...atlas.data]).toEqual([...expected]);expect([...source.data]).toEqual([201,99,51,0,80,160,240,128]);
 for(const value of [
  {width:8192,height:8192,tiles:[]},
  {width:8,height:4,tiles:[{origin:[7,0],texture:source}]},
  {width:8,height:4,tiles:[{origin:[2,1],texture:source},{origin:[3,1],texture:source}]},
  {width:8,height:4,tiles:[{origin:new Array(2),texture:source}]},
  {width:8,height:4,tiles:new Array(1)},
  {width:8,height:4,tiles:[{origin:[0,0],texture:{...source,data:new Uint8ClampedArray(7)}}]},
 ])expect(()=>assembleGuiTextureAtlas(value as any)).toThrow();
});

test('original URL atlas tiles share decoding and preserve exact full fields without Canvas2D',async({page},info)=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(kind:string,...args:any[]){if(kind==='2d')throw Error('Model source atlas must not use Canvas2D');return (original as any).call(this,kind,...args);};});
 const source=new PNG({width:2,height:1});source.data.set([80,160,240,128,12,34,56,255]);let requests=0;await page.route('**/model-atlas-original.png',r=>{requests++;return r.fulfill({contentType:'image/png',body:PNG.sync.write(source)});});await open(page);
 const descriptor={kind:'atlas',width:8,height:4,tiles:[{origin:[2,1],size:[2,1],texture:'/model-atlas-original.png'},{origin:[5,1],size:[2,1],texture:'/model-atlas-original.png'}]};
 const command=model();command.model.faces=[{...frontFace(8,4),uv:[[2,2],[4,2],[4,1],[2,1]]}];command.textureSizes={all:[8,4]};command.textures={all:descriptor};
 const expected=new Uint8Array(16*12*4);fill(expected,16,[2,2,4,4],[80,160,240,255]);fill(expected,16,[6,2,4,4],[12,34,56,255]);
 await mount(page,{width:16,height:12,guiScale:1,commands:[command],label:'Original atlas'},true);expect(requests).toBe(1);await prove(info,'original-url-atlas-react',(await raw(page)).data,expected);
 const decoded={...descriptor,tiles:descriptor.tiles.map(tile=>({...tile,texture:texture(source)}))};const low=await render(page,{width:16,height:12,guiScale:1,commands:[{...command,textures:{all:decoded}}]});await prove(info,'original-pixel-atlas-lowlevel',low.data,expected);await prove(info,'original-pixel-atlas-live',low.live,expected);
});

test('atlas tile bytes and packing snapshot changes repaint while malformed budgets fail before requests',async({page})=>{
 await open(page);const command=model();command.model.faces=[frontFace(8,4,2,1)];command.textureSizes={all:[8,4]};command.textures={all:{kind:'atlas',width:8,height:4,tiles:[{origin:[0,0],size:[2,1],texture:{width:2,height:1,rgba:[20,80,140,255,20,80,140,255]}}]}};
 await mount(page,{width:16,height:12,guiScale:1,commands:[command]});const serial=await page.evaluate(()=>window.guiModelQA.serial);
 await page.evaluate(()=>{const c=window.guiModelQA.props.commands[0];c.textures.all.tiles[0].texture.data.set([50,100,150,255,50,100,150,255]);window.guiModelQA.paint();});await page.waitForFunction(n=>window.guiModelQA.serial>n,serial);expect([...(await raw(page)).data.subarray((4*16+3)*4,(4*16+3)*4+4)]).toEqual([50,100,150,255]);
 const next=await page.evaluate(()=>window.guiModelQA.serial);await page.evaluate(()=>{window.guiModelQA.props.commands[0].textures.all.tiles[0].origin=[4,2];window.guiModelQA.paint();});await page.waitForFunction(n=>window.guiModelQA.serial>n,next);expect((await raw(page)).data.every((value:number)=>value===0)).toBe(true);
 const requests:string[]=[];page.on('request',r=>{if(r.url().includes('model-atlas-budget.png'))requests.push(r.url());});const large=(x:number)=>{const c=model();c.textureSizes={all:[4096,4096]};c.textures={all:{kind:'atlas',width:4096,height:4096,tiles:[{origin:[x,0],size:[1,1],texture:'/model-atlas-budget.png'}]}};return c;};
 await page.evaluate(o=>window.guiModelQA.mount(o),{width:16,height:12,guiScale:1,commands:[large(0),large(1)]});await expect(page.locator('canvas')).toHaveAttribute('data-render-state','error');expect(requests).toEqual([]);
});

// Native-oracle cases below use independently read original UI/PNG data. The
// host projection is an explicit finite-observation hypothesis, NOT a recovered
// default/native CPU camera. No captured vertex or MVP is a normal scene input.
let zipPromise:Promise<(name:string)=>Buffer>|undefined;
async function originalZip(){return zipPromise??=(async()=>{
 const data=await readFile(new URL('../.cache/references/bedrock-samples-v1.26.60.5-full.zip',import.meta.url));expect(sha(data)).toBe('d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf');
 let end=data.length-22;while(end>=0&&(data.readUInt32LE(end)!==0x06054b50||end+22+data.readUInt16LE(end+20)!==data.length))end--;if(end<0)throw Error('Invalid original ZIP');
 const entries=new Map<string,[number,number,number,number]>();let p=data.readUInt32LE(end+16);for(let i=0;i<data.readUInt16LE(end+10);i++){
  if(data.readUInt32LE(p)!==0x02014b50)throw Error('Invalid original ZIP directory');const n=data.readUInt16LE(p+28);entries.set(data.toString('utf8',p+46,p+46+n),[data.readUInt16LE(p+10),data.readUInt32LE(p+20),data.readUInt32LE(p+24),data.readUInt32LE(p+42)]);p+=46+n+data.readUInt16LE(p+30)+data.readUInt16LE(p+32);
 }return(name:string)=>{const q=entries.get(name);if(!q)throw Error('Missing original '+name);const start=q[3]+30+data.readUInt16LE(q[3]+26)+data.readUInt16LE(q[3]+28),compressed=data.subarray(start,start+q[1]);const value=q[0]===0?Buffer.from(compressed):inflateRawSync(compressed);expect(value.length).toBe(q[2]);return value;};
 })();}
function jsonc(data:Buffer){return JSON.parse(data.toString('utf8').replace(/^\uFEFF/,'').replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,v=>v.startsWith('"')?v:''));}
function findTile(atlas:PNG,tile:PNG){
 const positions:number[][]=[];let anchor=0,best=0;for(let y=0;y<tile.height;y++){const row=tile.data.subarray(y*tile.width*4,(y+1)*tile.width*4);const score=new Set(row).size;if(score>best){best=score;anchor=y;}}
 const needle=tile.data.subarray(anchor*tile.width*4,(anchor+1)*tile.width*4);
 for(let y=0;y<=atlas.height-tile.height;y++){
  const start=(y+anchor)*atlas.width*4,row=atlas.data.subarray(start,start+atlas.width*4);let offset=-1;
  while((offset=row.indexOf(needle,offset+1))>=0){if(offset%4||offset/4+tile.width>atlas.width)continue;const x=offset/4;let same=true;for(let yy=0;yy<tile.height;yy++)if(!atlas.data.subarray(((y+yy)*atlas.width+x)*4,((y+yy)*atlas.width+x+tile.width)*4).equals(tile.data.subarray(yy*tile.width*4,(yy+1)*tile.width*4))){same=false;break;}if(same)positions.push([x,y,tile.width,tile.height]);}
 }expect(positions,'complete original RGBA tile must occur exactly once').toHaveLength(1);return positions[0]!;
}
function independentFaces(height:number,table:boolean):any[] {
 const colors=table?[[255,255,255,255],[255,255,255,255],[255,255,255,255]]:[[255,255,255,255],[127,127,127,255],[186,186,186,255]];
 return [
  {vertices:[[16,height,0],[0,height,0],[0,height,16],[16,height,16]],uv:[[16,16],[16,0],[0,0],[0,16]],normal:[0,1,0],texture:'top',color:colors[0]},
  {vertices:[[16,height,16],[16,0,16],[16,0,0],[16,height,0]],uv:[[0,16-height],[0,16],[16,16],[16,16-height]],normal:[1,0,0],texture:'side',color:colors[1]},
  {vertices:[[16,height,16],[0,height,16],[0,0,16],[16,0,16]],uv:[[16,16-height],[0,16-height],[0,16],[16,16]],normal:[0,0,1],texture:'side',color:colors[2]},
 ];
}
function half(value:number){const data=new DataView(new ArrayBuffer(2));(data as any).setFloat16(0,value,true);return (data as any).getFloat16(0,true) as number;}
function halfBytes(points:number[][]){const value=Buffer.alloc(points.length*4),view=new DataView(value.buffer,value.byteOffset,value.byteLength);points.forEach(([x,y],i)=>{(view as any).setFloat16(i*4,x,true);(view as any).setFloat16(i*4+2,y,true);});return value;}
async function nativeModels(scale:number,route:'atlas'|'original'|'assembled-originals') {
 const archive=await originalZip(),common=jsonc(archive('resource_pack/ui/ui_common.json')),blocks=jsonc(archive('resource_pack/blocks.json'));
 expect(common.root_panel.size).toEqual([176,166]);expect(common.container_item.size).toEqual([18,18]);expect(common.container_item['$item_renderer_size|default']).toEqual([16,16]);
 const hotbar=common.hotbar_grid_template;expect(hotbar.size).toEqual([162,18]);expect(hotbar.grid_dimensions).toEqual([9,1]);expect(hotbar.offset).toEqual([0,-5]);expect(hotbar.anchor_from).toBe('bottom_middle');expect(hotbar.anchor_to).toBe('bottom_middle');
 expect(blocks.normal_stone_slab.textures).toBe('normal_stone_slab');expect(blocks.enchanting_table.textures).toEqual({down:'enchanting_table_bottom',side:'enchanting_table_side',up:'enchanting_table_top'});
 const directory=scale===5?'open-clean-full-gui':'gui4-holdout-full-gui',draws=JSON.parse(await readFile(new URL(`../.cache/${directory}/ui-draws.json`,import.meta.url),'utf8')),draw=draws.find((d:any)=>d.globalId===57);
 const atlasId=draw.tables['1'].baseDescriptor.resource,atlas=PNG.sync.read(await readFile(new URL(`../.cache/${directory}/texture-${atlasId}.png`,import.meta.url)));expect(sha(atlas.data)).toBe(draw.texture.rawRGBAsha256);expect([atlas.width,atlas.height]).toEqual([1024,512]);
 const originals:Record<string,PNG>={};for(const name of ['stone','enchanting_table_top','enchanting_table_side','enchanting_table_bottom','end_rod'])originals[name]=PNG.sync.read(archive(`resource_pack/textures/blocks/${name}.png`));
 // The fourth COMPLETE source image preserves a real neighboring sample at the
 // table-top boundary. No single-pixel padding/UV correction is fabricated.
 // Bottom was never submitted and duplicate occurrences remain uncertified.
 const found=Object.fromEntries(['stone','enchanting_table_top','enchanting_table_side','end_rod'].map(name=>[name,findTile(atlas,originals[name]!) ]));
 expect(found.end_rod).toEqual([864,112,16,16]);
 const assembled={kind:'atlas',width:1024,height:512,tiles:Object.entries(found).map(([name,tile])=>({origin:tile.slice(0,2),size:[16,16],texture:texture(originals[name]!)}))};
 const root=[(Math.ceil(2570/scale)-176)/2,(Math.ceil(1402/scale)-166)/2];
 const projection={yaw:45,pitch:30,scale:.625,offset:[1+10/Math.sqrt(2),8.9375],originQuantization:'physical-floor'};
 const origins=Array.from({length:3},(_,i)=>[root[0]!+(176-162)/2+i*18+1,root[1]!+166-18-5+1]);
 const commands=origins.map((origin,index)=>{
  const table=index===2,h=table?12:8,colors=table?{}:{east:[127,127,127,255] as const,south:[186,186,186,255] as const};
  const actual=createGuiCuboidModel([0,0,0],[16,h,16],{colors});const independent=independentFaces(h,table);
  for(let i=0;i<3;i++){expect(actual.faces[i]!.vertices).toEqual(independent[i].vertices);expect(actual.faces[i]!.uv).toEqual(independent[i].uv);expect(actual.faces[i]!.color??[255,255,255,255]).toEqual(independent[i].color);}
  const sourceFor=(key:string)=>table?key==='top'?'enchanting_table_top':key==='bottom'?'enchanting_table_bottom':'enchanting_table_side':'stone';
  const modelValue={faces:actual.faces.map(face=>{const key=face.texture??'all',source=sourceFor(key),tile=found[source];return route!=='original'&&tile?{...face,uv:face.uv.map(([u,v])=>[tile[0]!+u,tile[1]!+v])}:face;})};
  const textureSizes:Record<string,number[]>={},textures:Record<string,any>={};for(const key of ['top','side','bottom']){const source=sourceFor(key),hasAtlas=route!=='original'&&!!found[source],image=hasAtlas?atlas:originals[source]!;textureSizes[key]=[image.width,image.height];textures[key]=hasAtlas&&route==='assembled-originals'?assembled:texture(image);}
  return {kind:'model',origin,projection,model:modelValue,textureSizes,textures};
 });
 return{commands,origins,projection,draw,found,atlasSha256:sha(atlas.data),sourceTileHashes:Object.fromEntries(Object.entries(originals).map(([k,p])=>[k,sha(p.data)])),sourceAssembly:route==='assembled-originals'?{size:[1024,512],tiles:Object.entries(found).map(([name,tile])=>({name,origin:tile.slice(0,2),size:[16,16],originalRgbaSha256:sha(originals[name]!.data)})),otherTexels:'transparent zero',nativeAtlasPixelsAsInput:false}:undefined};
}
const nativeRoutes=process.env.GUI_MODEL_STANDALONE_DIAGNOSTIC==='1'?['original'] as const:['atlas','assembled-originals'] as const;
for(const scale of [4,5])for(const route of nativeRoutes)test(`OPTIONAL PRIVATE GUI${scale} source ${route} cuboids equal the full native G57 target${route==='assembled-originals'?' with four complete original PNG tiles':''}`,async({page},info)=>{
 const oraclePath=new URL('../.cache/gui-block-oracles-01/FINAL.json',import.meta.url);test.skip(!existsSync(oraclePath),'Private saved-capture block targets are optional and not distributed');
 const manifest=JSON.parse(await readFile(oraclePath,'utf8'));expect(manifest.allExitCodesZero).toBe(true);expect(manifest.allReadbackErrorsZero).toBe(true);const entry=manifest.cases.find((c:any)=>c.guiScale===scale);
 const load=async(value:any,hash:string)=>{const p=PNG.sync.read(await readFile(new URL('../'+value.path,import.meta.url)));expect([p.width,p.height]).toEqual([2570,1402]);expect(sha(p.data)).toBe(hash);return p;};
 const before=await load(entry.before,entry.beforeRGBAsha256),after=await load(entry.after,entry.afterRGBAsha256),scene=await nativeModels(scale,route);await open(page);await page.setViewportSize({width:2570,height:1402});
 const options={width:2570,height:1402,guiScale:scale,commands:scene.commands,background:{kind:'texture',texture:texture(before),encoding:'framebuffer'}};
 const actual=await render(page,options);await prove(info,`gui${scale}-${route}-native-fbo`,actual.data,after.data,{frame:[2570,1402],renderer:actual.renderer,projection:scene.projection,origins:scene.origins,independentTiles:scene.found,atlasSha256:scene.atlasSha256,sourceTileHashes:scene.sourceTileHashes,sourceAssembly:scene.sourceAssembly,scope:'Finite-observation explicit host projection, not unique native CPU centering; matching native-before comparison background only'});await prove(info,`gui${scale}-${route}-native-live`,actual.live,after.data);
 await mount(page,{...options,label:`GUI${scale} source cuboids`});const view=await raw(page);expect(view.renderer).toMatch(/NVIDIA.*Direct3D11/);expect(view.error).toBe(0);await prove(info,`gui${scale}-${route}-native-react`,view.data,after.data,{renderer:view.renderer,attributes:view.attributes});
 const screenshot=PNG.sync.read(await page.screenshot({omitBackground:true}));await prove(info,`gui${scale}-${route}-native-react-dom`,screenshot.data,after.data,{viewport:[2570,1402],scope:'actual one-to-one DOM presentation, no parent transforms'});
 let xyBytes=0,uvBytes=0,colorBytes=0;
 actual.layout.commands.forEach((command:any,item:number)=>{expect(command.kind).toBe('model');expect(command.layout.runs).toHaveLength(3);const origin=scene.origins[item]!.map(v=>Math.floor(v*scale)/scale),faces=independentFaces(item===2?12:8,item===2);
  command.layout.runs.forEach((run:any,face:number)=>{const expected=faces[face]!,offset=scene.projection.offset,a=Math.SQRT1_2*.625,b=Math.SQRT1_2*.3125,c=Math.sqrt(.75)*.625;
   const positions=expected.vertices.map(([x,y,z]:number[])=>[half(origin[0]!+offset[0]!+a*(x!-z!)),half(origin[1]!+offset[1]!+b*(x!+z!)-c*y!)]);const native=scene.draw.vertices.slice(item*12+face*4,item*12+face*4+4);
   expect(run.mesh.vertices.map((v:any)=>v.position)).toEqual(positions);const predicted=halfBytes(positions),recorded=Buffer.concat(native.map((v:any)=>Buffer.from(v.packedHex,'hex').subarray(0,4)));expect(predicted.equals(recorded)).toBe(true);xyBytes+=predicted.length;
   expect(run.color).toEqual(expected.color);expect(native.map((v:any)=>v.rgba)).toEqual(Array.from({length:4},()=>expected.color));colorBytes+=16;
   expect(run.mesh.indices).toEqual(scene.draw.indices.slice(item*18+face*6,item*18+face*6+6).map((i:number)=>i-item*12-face*4));
   if(route!=='original'){expect(run.mesh.vertices.map((v:any)=>v.uvRaw)).toEqual(native.map((v:any)=>v.uvRaw));uvBytes+=16;}
  });for(const index of [0,1,4,5,12,13,15])expect(command.layout.mvp[index]).toBe(scene.draw.b0First256Floats[index]);
 });
 await info.attach(`gui${scale}-${route}-source-attributes.json`,{body:JSON.stringify({xyHalfBytesCompared:xyBytes,uvUnormBytesCompared:uvBytes,rgbaBytesCompared:colorBytes,allIndicesEqual:true,projectionXYEntriesEqual:7,sourceShapes:'16x8x16 / 16x12x16 cuboids, visible up/east/south canonical source corner order',notClaimed:'Native stored z/w, full packed VB/CB, unique camera/translation/lighting/CPU emitter, other shapes/poses or whole GUI'}),contentType:'application/json'});
});
