import {expect,test} from '@playwright/test';
import type {Page,TestInfo} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import {PNG} from 'pngjs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {GuiLayer,renderGuiLayer} from '../src';
import type {GuiLayerProps} from '../src';
import type {GuiSpriteGeometry} from '../src/gui-layer';

const sha=(data:Uint8Array)=>createHash('sha256').update(data).digest('hex');
const pixel=(rgba:number[])=>({width:1,height:1,rgba});
const texture=(p:PNG)=>({width:p.width,height:p.height,rgba:p.data.toString('base64')});
const bytes=(w:number,h:number)=>new Uint8Array(w*h*4);
function rectangle(data:Uint8Array,w:number,box:readonly number[],rgba:readonly number[]){
 const [x,y,width,height]=box as [number,number,number,number];for(let yy=y;yy<y+height;yy++)for(let xx=x;xx<x+width;xx++)data.set(rgba,(yy*w+xx)*4);
}
async function open(page:Page){await page.goto('/demo/gui-sprite-fixture.html');await page.waitForFunction(()=>!!window.guiSpriteQA);}
async function render(page:Page,value:any){const r=await page.evaluate(o=>window.guiSpriteQA.render(o),value);return {...r,data:Buffer.from(r.rgba,'base64'),live:Buffer.from(r.liveRgba,'base64')};}
async function mount(page:Page,value:any,strict=false){const serial=await page.evaluate(()=>window.guiSpriteQA.serial);await page.evaluate(({o,s})=>window.guiSpriteQA.mount(o,s),{o:value,s:strict});await page.waitForFunction(n=>window.guiSpriteQA.serial>n||window.guiSpriteQA.events.some((s:string)=>s.startsWith('error:')),serial);await expect(page.locator('canvas.mc-gui-layer')).toHaveAttribute('data-render-state','ready');}
async function raw(page:Page){const r=await page.evaluate(()=>window.guiSpriteQA.rawCanvas());return {...r,data:Buffer.from(r.rgba,'base64')};}
async function prove(info:TestInfo,name:string,actual:Uint8Array,expected:Uint8Array,extra:any={}){
 let differingPixels=0,differingBytes=0,max=0,alpha=0;for(let i=0;i<actual.length;i+=4){let changed=false;for(let c=0;c<4;c++){const d=Math.abs(actual[i+c]!-expected[i+c]!);if(d){differingBytes++;changed=true;max=Math.max(max,d);if(c===3)alpha++;}}if(changed)differingPixels++;}
 const r={...extra,totalPixels:actual.length/4,differingPixels,differingBytes,max,alpha,actualSha256:sha(actual),expectedSha256:sha(expected)};await info.attach(name+'.json',{body:JSON.stringify(r,null,2),contentType:'application/json'});expect(actual.length).toBe(expected.length);expect(differingBytes,name).toBe(0);return r;
}

// Independent UISprite Transparent-v0 arithmetic transcription from installed
// SM50 disassembly. No production shader string or producer expectation imported.
// f32 operations mirror sample/mad/mul; cases avoid representational byte ties.
const f=Math.fround;
function fragment(sample:number[],color:number[],tint:number[]=[1,1,1,1],hud=1){
 const s=sample.map(v=>f(v/255)),c=color.map(v=>f(v/255));
 return [0,1,2].map(i=>f(f(f(f(s[i]!*c[i]!)-s[i]!)*s[3]!+s[i]!)*f(tint[i]!)))
  .concat(f(f((c[3]!>0?Math.ceil(s[3]!):s[3]!)*f(tint[3]!))*f(hud)));
}
function blend(source:number[],destination:number[]=[0,0,0,0]){
 const a=source[3]!;return [0,1,2].map(i=>Math.round(Math.min(1,Math.max(0,source[i]!*a+destination[i]!/255*(1-a)))*255))
  .concat(Math.round(Math.min(1,a+destination[3]!/255*(1-a))*255));
}

test('sprite typed SSR retains one semantic canvas and rejects invalid color before browser IO',()=>{
 const geometry:GuiSpriteGeometry={rect:[1,2,3,4],color:[17,34,51,1]};
 const props:GuiLayerProps={width:24,height:20,guiScale:1,commands:[{kind:'sprite',...geometry,texture:{width:1,height:1,data:new Uint8ClampedArray([25,50,75,128])}}],label:'Source sprite'};
 const html=renderToStaticMarkup(createElement(GuiLayer,props));expect(html).toContain('role="img"');expect(html).toContain('aria-label="Source sprite"');expect(html).toContain('data-render-state="loading"');expect(html).not.toContain('color="');
 const decorative=renderToStaticMarkup(createElement(GuiLayer,{...props,label:undefined}));expect(decorative).toContain('aria-hidden="true"');
 for(const color of [[0,0,0,-1],[0,0,0,256],[0,0,.5,255],[0,0,0,Number.NaN],[255,255,255]])expect(()=>renderGuiLayer({...props,commands:[{kind:'sprite',...geometry,color:color as any,texture:{width:1,height:1,data:new Uint8ClampedArray([1,2,3,4])}}]})).toThrow(/RGBA8/);
});

test('sprite material arithmetic matches independent complete RGBA fields for partial alpha and byte colors',async({page},info)=>{
 await open(page);
 const primary=new URL('../.cache/native-gui-image-profile/installed-sprite/Transparent-v00-Direct3D_SM50-Fragment.asm',import.meta.url);
 if(existsSync(primary)){
  const asm=await readFile(primary,'utf8');for(const instruction of ['lt r0.x, l(0.000000), v1.w','round_pi r0.y, r1.w','movc r0.w, r0.x, r0.y, r1.w','mad r2.xyz, r1.xyzx, v1.xyzx, -r1.xyzx','mad r0.xyz, r1.wwww, r2.xyzx, r1.xyzx','mul r0.xyzw, r0.xyzw, cb1[1].xyzw','mul o0.w, r0.w, cb1[0].x'])expect(asm).toContain(instruction);
  expect(asm).not.toMatch(/\bdiscard\b/);await info.attach('primary-sprite-material.json',{body:JSON.stringify({source:primary.pathname,sha256:sha(Buffer.from(asm)),formula:'SM50 independently transcribed; SM65 exact native identity separately recorded by original draw/installed material audit'}),contentType:'application/json'});
 }
 const cases=[
  {sample:[71,139,213,0],color:[49,113,211,255]},
  {sample:[71,139,213,64],color:[49,113,211,255]},
  {sample:[71,139,213,128],color:[49,113,211,1]},
  {sample:[71,139,213,255],color:[49,113,211,128]},
  {sample:[71,139,213,64],color:[49,113,211,0]},
  {sample:[71,139,213,128],color:[49,113,211,0],tint:[.5,.75,1,.75],hud:.5},
  {sample:[71,139,213,128],color:[255,255,255,255],tint:[.5,.75,1,.75],hud:.5},
 ];
 const expected=bytes(28,8),commands=cases.map((v,i)=>{rectangle(expected,28,[i*4,0,4,8],blend(fragment(v.sample,v.color,v.tint,v.hud)));return {kind:'sprite',rect:[i*4,0,4,8],texture:pixel(v.sample),color:v.color,tint:v.tint,hudOpacity:v.hud};});
 const options={width:28,height:8,guiScale:1,commands};const value=await render(page,options);await prove(info,'independent-sprite-arithmetic',value.data,expected,{renderer:value.renderer});await prove(info,'live-sprite-arithmetic',value.live,expected);
 await mount(page,{...options,label:'Partial alpha source sprites'});await prove(info,'react-sprite-arithmetic',(await raw(page)).data,expected);
});

test('positive vertex alpha is a branch, while zero preserves source alpha and opaque sprite RGB is vertex colored',async({page})=>{
 await open(page);const options={width:4,height:4,guiScale:1,commands:[{kind:'sprite',rect:[0,0,4,4],texture:pixel([80,160,240,128]),color:[255,255,255,1]}]};
 const one=await render(page,options),full=await render(page,{...options,commands:[{...options.commands[0],color:[255,255,255,255]}]}),zero=await render(page,{...options,commands:[{...options.commands[0],color:[255,255,255,0]}]});
 expect(one.data.equals(full.data)).toBe(true);expect([...one.data.subarray(0,4)]).toEqual([80,160,240,255]);expect([...zero.data.subarray(0,4)]).toEqual([40,80,120,128]);
 const blit=await render(page,{...options,commands:[{...options.commands[0],kind:'image'}]});expect(blit.data.equals(zero.data)).toBe(true);
});

test('image sprite text sprite image preserve source order and blend-state separation in one target',async({page},info)=>{
 await open(page);const p=new PNG({width:128,height:128});rectangle(p.data,128,[0,0,8,8],[255,255,255,255]);
 const options={width:24,height:16,guiScale:1,commands:[
  {kind:'image',rect:[0,0,24,16],texture:pixel([16,32,48,255])},
  {kind:'sprite',rect:[2,2,12,10],texture:pixel([180,100,50,128]),color:[255,255,255,128]},
  {kind:'text',text:'A',font:{pages:['unused'],pageSizes:[128],cellHeight:8,lineHeight:8,glyphs:{A:{page:0,x:0,y:0,width:8,height:8,advance:8}}},pages:[[0,texture(p)]],origin:[7,4],fontScale:1,sampling:'point',shader:'bitmap',color:[0,255,0,255]},
  {kind:'sprite',rect:[10,7,10,6],texture:pixel([100,200,40,128]),color:[255,255,255,0]},
  {kind:'image',rect:[19,0,5,16],texture:pixel([0,0,255,255])},
 ]};const expected=bytes(24,16);rectangle(expected,24,[0,0,24,16],[16,32,48,255]);rectangle(expected,24,[2,2,12,10],[180,100,50,255]);rectangle(expected,24,[7,4,8,8],[0,255,0,255]);
 for(let y=7;y<13;y++)for(let x=10;x<20;x++){const i=(y*24+x)*4;expected.set(blend(fragment([100,200,40,128],[255,255,255,0]),[...expected.subarray(i,i+4)]),i);}rectangle(expected,24,[19,0,5,16],[0,0,255,255]);
 const value=await render(page,options);await prove(info,'ordered-three-materials',value.data,expected,{renderer:value.renderer});await mount(page,options);await prove(info,'react-three-materials',(await raw(page)).data,expected);
});

test('sprite source UVs, per-command scissors and physical crop retain whole-frame projection',async({page},info)=>{
 await open(page);const p=new PNG({width:2,height:2});p.data.set([255,0,0,255,0,255,0,255,0,0,255,255,255,255,0,255]);
 const options={width:32,height:24,guiScale:2,scissor:[3,3,23,16],commands:[{kind:'sprite',rect:[1,1,12,8],texture:texture(p),uvRect:[.5,0,.5,1],scissor:[6,2,18,18]}]};
 const expected=bytes(32,24);rectangle(expected,32,[6,3,18,7],[0,255,0,255]);rectangle(expected,32,[6,10,18,8],[255,255,0,255]);
 const full=await render(page,options);await prove(info,'sprite-scissor-uv',full.data,expected);
 const crop=await render(page,{...options,outputRect:[5,4,20,15]});const e=bytes(20,15);for(let y=0;y<15;y++)e.set(expected.subarray(((y+4)*32+5)*4,((y+4)*32+25)*4),y*20*4);await prove(info,'sprite-physical-crop',crop.data,e);expect(crop.layout.mvp).toEqual(full.layout.mvp);
 await mount(page,{...options,outputRect:[5,4,20,15]});await prove(info,'react-sprite-crop',(await raw(page)).data,e);
});

test('sprite React snapshots observe changed color and pixels without re-fetching equivalent source requests',async({page})=>{
 await open(page);const options={width:8,height:6,guiScale:1,commands:[{kind:'sprite',rect:[0,0,8,6],texture:pixel([80,160,240,128]),color:[255,255,255,255]}]};await mount(page,options,true);const original=await raw(page),serial=await page.evaluate(()=>window.guiSpriteQA.serial);
 await page.evaluate(()=>window.guiSpriteQA.paint());await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.renderState==='ready');expect(await page.evaluate(()=>window.guiSpriteQA.serial)).toBe(serial);expect((await raw(page)).data.equals(original.data)).toBe(true);
 await page.evaluate(()=>{window.guiSpriteQA.props.commands[0].color[3]=0;window.guiSpriteQA.paint();});await page.waitForFunction(n=>window.guiSpriteQA.serial>n,serial);expect([...(await raw(page)).data.subarray(0,4)]).toEqual([40,80,120,128]);
 const next=await page.evaluate(()=>window.guiSpriteQA.serial);await page.evaluate(()=>{window.guiSpriteQA.props.commands[0].texture.data.set([20,40,60,255]);window.guiSpriteQA.paint();});await page.waitForFunction(n=>window.guiSpriteQA.serial>n,next);expect([...(await raw(page)).data.subarray(0,4)]).toEqual([20,40,60,255]);
});

test('sprite and image share a decoded URL while switching materials retains each alpha contract',async({page})=>{
 const p=new PNG({width:1,height:1});p.data.set([80,160,240,128]);let requests=0;await page.route('**/sprite-shared.png',async route=>{requests++;await route.fulfill({contentType:'image/png',body:PNG.sync.write(p)});});await open(page);
 await mount(page,{width:16,height:8,guiScale:1,commands:[{kind:'sprite',rect:[0,0,8,8],texture:'/sprite-shared.png',color:[255,255,255,255]},{kind:'image',rect:[8,0,8,8],texture:'/sprite-shared.png'}]},true);
 const value=await raw(page);expect(requests).toBe(1);expect([...value.data.subarray(0,4)]).toEqual([80,160,240,255]);expect([...value.data.subarray(8*4,8*4+4)]).toEqual([40,80,120,128]);
});

test('sprite invalid resources fail atomically and explicit retry restores a new accessible canvas',async({page})=>{
 await page.route('**/sprite-broken.png',route=>route.fulfill({status:404,body:'not an image'}));await open(page);
 await page.evaluate(()=>window.guiSpriteQA.mount({width:8,height:8,guiScale:1,label:'Sprite status',tabIndex:0,commands:[{kind:'sprite',rect:[0,0,8,8],texture:'/sprite-broken.png'}]}));await expect(page.locator('canvas')).toHaveAttribute('data-render-state','error');expect(await page.locator('canvas').getAttribute('width')).toBe('0');expect(await page.locator('canvas').getAttribute('aria-label')).toBe('Sprite status');
 await mount(page,{width:8,height:8,guiScale:1,label:'Sprite status',tabIndex:0,renderKey:1,commands:[{kind:'sprite',rect:[0,0,8,8],texture:pixel([3,9,27,255])}]});await page.locator('canvas').focus();expect(await page.locator('canvas').evaluate(c=>c===document.activeElement)).toBe(true);expect([...(await raw(page)).data.subarray(0,4)]).toEqual([3,9,27,255]);
 await page.evaluate(()=>window.guiSpriteQA.ref.getContext('webgl').getExtension('WEBGL_lose_context').loseContext());await expect(page.locator('canvas')).toHaveAttribute('data-render-state','error');await mount(page,{width:8,height:8,guiScale:1,label:'Sprite status',renderKey:2,commands:[{kind:'sprite',rect:[0,0,8,8],texture:pixel([9,27,81,255])}]});expect([...(await raw(page)).data.subarray(0,4)]).toEqual([9,27,81,255]);
});

test('sprite malformed declarations and combined resource budget fail before network or GPU upload',async({page})=>{
 const requests:string[]=[];page.on('request',r=>{if(r.url().includes('sprite-budget-'))requests.push(r.url());});await open(page);
 const base={width:8,height:8,guiScale:1,commands:[{kind:'sprite',rect:[0,0,8,8],texture:pixel([1,2,3,255])}]};
 for(const command of [{...base.commands[0],color:[255,255,255,-1]},{...base.commands[0],color:[255,255,255,.5]},{...base.commands[0],kind:'unknown'},{...base.commands[0],uvRect:[0,0,2,1]}]){
  const message=await page.evaluate(o=>{try{window.guiSpriteQA.render(o);return null;}catch(e){return String(e);}}, {...base,commands:[command]});expect(message).not.toBeNull();
 }
 await page.evaluate(()=>window.guiSpriteQA.mount({width:8,height:8,guiScale:1,commands:Array.from({length:257},(_,i)=>({kind:'sprite',rect:[0,0,1,1],texture:`/sprite-budget-${i}.png`}))}));await expect(page.locator('canvas')).toHaveAttribute('data-render-state','error');expect(requests).toEqual([]);
});

// Private fixed-capture cases are appended below. Public cases above require
// only synthetic caller-owned resources and remain runnable without captures.
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
async function sourceItems(scale:number,route:'atlas'|'original'){
 const z=await originalZip(),common=jsonc(z('resource_pack/ui/ui_common.json')),ui=jsonc(z('resource_pack/ui/enchanting_screen.json'));
 expect(common.root_panel.size).toEqual([176,166]);const cell=common.container_item;expect(cell.size).toEqual([18,18]);expect(cell['$item_renderer_size|default']).toEqual([16,16]);expect(cell['$item_renderer_offset|default']).toEqual([0,0]);
 const renderer=cell.controls[0].item_cell.controls[1].item.controls[1]['$item_renderer@$item_renderer'];expect(renderer.anchor_from).toBe('center');expect(renderer.anchor_to).toBe('center');
 const hotbar=common.hotbar_grid_template;expect(hotbar.size).toEqual([162,18]);expect(hotbar.grid_dimensions).toEqual([9,1]);expect(hotbar.offset).toEqual([0,-5]);expect(hotbar.anchor_from).toBe('bottom_middle');expect(hotbar.anchor_to).toBe('bottom_middle');
 const top=ui.enchanting_panel_top_half;expect(top.size).toEqual(['100%','50% - 12px']);expect(top.offset).toEqual([0,7]);const input=top.controls.find((q:any)=>q.item_grid).item_grid;expect(input.offset).toEqual([13,14]);expect(input.size).toEqual([18,18]);expect(input.anchor_from).toBe('left_middle');expect(input.anchor_to).toBe('left_middle');
 const root=[(Math.ceil(2570/scale)-176)/2,(Math.ceil(1402/scale)-166)/2];
 const rects=[[root[0]!+13+1,root[1]!+7+(166*.5-12)/2+14-18/2+1,16,16],...Array.from({length:5},(_,i)=>[root[0]!+(176-162)/2+(i+4)*18+1,root[1]!+166-18-5+1,16,16])];
 const prefix=scale===5?'open-clean-full-gui':'gui4-holdout-full-gui',atlas=PNG.sync.read(await readFile(new URL(`../.cache/${prefix}/texture-${scale===5?797:837}.png`,import.meta.url)));
 const diamond=PNG.sync.read(z('resource_pack/textures/items/diamond_sword.png')),wood=PNG.sync.read(z('resource_pack/textures/items/wood_sword.png'));
 // Public release originals are the rendering inputs. Complete native atlas
 // scans independently establish their current runtime identity and UV region.
 const tiles=[diamond,wood].map(tile=>{expect([tile.width,tile.height]).toEqual([16,16]);return findTile(atlas,tile);});
 const commands=rects.map((rect,i)=>{const tile=i===0?diamond:wood,uv=tiles[i===0?0:1]!;return {kind:'sprite',rect,texture:texture(route==='atlas'?atlas:tile),...(route==='atlas'?{uvRect:[uv[0]!/atlas.width,uv[1]!/atlas.height,uv[2]!/atlas.width,uv[3]!/atlas.height]}:{}),color:[255,255,255,255]};});
 return{commands,rects,tiles,atlasSha256:sha(atlas.data),sourceTileHashes:[sha(diamond.data),sha(wood.data)]};
}
for(const scale of [4,5])for(const route of ['atlas','original'] as const)test(`OPTIONAL PRIVATE GUI${scale} source ${route} sprites equal the complete native G56 target`,async({page},info)=>{
 const oraclePath=new URL('../.cache/gui-sprite-oracles-01/FINAL.json',import.meta.url);test.skip(!existsSync(oraclePath),'Private saved-capture sprite targets are optional and not distributed');
 const manifest=JSON.parse(await readFile(oraclePath,'utf8'));expect(manifest.allExitCodesZero).toBe(true);expect(manifest.allReadbackErrorsZero).toBe(true);
 const beforeJob=manifest.jobs.find((j:any)=>j.guiScale===scale&&j.boundaryGlobalId===56),afterJob=manifest.jobs.find((j:any)=>j.guiScale===scale&&j.boundaryGlobalId===57);
 const load=async(job:any)=>{const file=new URL('../'+job.png.path,import.meta.url),png=PNG.sync.read(await readFile(file));expect(sha(png.data)).toBe(job.rgbaSHA256);expect([png.width,png.height]).toEqual([2570,1402]);return png;};
 const before=await load(beforeJob),after=await load(afterJob),source=await sourceItems(scale,route);await open(page);
 const options={width:2570,height:1402,guiScale:scale,background:{kind:'texture',texture:texture(before),encoding:'framebuffer'},commands:source.commands};
 const actual=await render(page,options);await prove(info,`gui${scale}-${route}-full-fbo`,actual.data,after.data,{renderer:actual.renderer,sourceRects:source.rects,independentlyFoundTiles:source.tiles,atlasSha256:source.atlasSha256,sourceTileHashes:source.sourceTileHashes,background:'matching original native-before target, comparison condition only'});await prove(info,`gui${scale}-${route}-live-default`,actual.live,after.data);
 await mount(page,{...options,label:`GUI${scale} original item sprites`});const view=await raw(page);await prove(info,`gui${scale}-${route}-actual-react`,view.data,after.data,{renderer:view.renderer,attributes:view.attributes});expect(view.error).toBe(0);expect(view.renderer).toMatch(/NVIDIA.*Direct3D11/);
 const nativeDraws=JSON.parse(await readFile(new URL(`../.cache/${scale===5?'open-clean-full-gui':'gui4-holdout-full-gui'}/ui-draws.json`,import.meta.url),'utf8')),draw=nativeDraws.find((d:any)=>d.globalId===56);
 expect(actual.layout.commands).toHaveLength(6);for(let i=0;i<6;i++){
  const entry=actual.layout.commands[i];expect(entry.kind).toBe('sprite');expect(entry.color).toEqual([255,255,255,255]);
  expect(entry.mesh.vertices.map((v:any)=>v.position)).toEqual(draw.vertices.slice(i*4,i*4+4).map((v:any)=>v.position.slice(0,2)));
  expect(entry.mesh.indices).toEqual(draw.indices.slice(i*6,i*6+6).map((index:number)=>index-i*4));
  expect(draw.vertices.slice(i*4,i*4+4).map((v:any)=>v.rgba)).toEqual(Array.from({length:4},()=>[255,255,255,255]));
  if(route==='atlas')expect(entry.mesh.vertices.map((v:any)=>v.uvRaw)).toEqual(draw.vertices.slice(i*4,i*4+4).map((v:any)=>v.uvRaw));
 }
 for(const i of [0,1,4,5,12,13,15])expect(actual.layout.mvp[i]).toBe(draw.b0First256Floats[i]);
 await info.attach(`gui${scale}-${route}-source-attributes.json`,{body:JSON.stringify({sourceOnlyPrediction:true,rects:source.rects,xyHalfBytesCompared:96,uvUnormBytesCompared:route==='atlas'?96:0,allNativeWhiteColors:true,allIndicesEqual:true,xyProjectionEntriesEqual:7,notCompared:'Native stored z=-830/w and projection depth coefficient are not normal 2D source inputs; no complete packed-VB or complete CBV identity claim'}),contentType:'application/json'});
});
