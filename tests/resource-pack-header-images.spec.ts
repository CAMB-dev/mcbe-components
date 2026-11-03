import {test,expect,chromium} from '@playwright/test';
import type {Page} from '@playwright/test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {ResourcePackSection} from '../src/resource-packs';
import type {ResourcePackHeaderImageProfile,ResourcePackSectionProps} from '../src/resource-packs';
import type {ResourcePacksFixtureSettings} from '../demo/resource-packs-fixture';
import {layoutGuiImages} from '../src/gui-image-geometry';

const profile:ResourcePackHeaderImageProfile={frame:{width:1200,height:900,guiScale:2},toggleOrigin:[180.25,60]};
const section:ResourcePackSectionProps={kind:'unowned',profile:'global',width:140,scale:2,title:'Source title',titleVisible:true,expanded:false,collection:{capacity:0,count:'0',items:[]},noPacks:true,viewMoreLabel:'View more',headerImageProfile:profile};
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const fixture='/demo/resource-packs-fixture.html';
async function configure(page:Page,value:Partial<ResourcePacksFixtureSettings>){await page.evaluate(value=>window.resourcePacksFixture.configure(value),value);}
async function open(page:Page,value:Partial<ResourcePacksFixtureSettings>){await page.addInitScript(value=>{window.resourcePacksFixtureInitial=value;},value);await page.goto(fixture);await page.waitForFunction(()=>!!window.resourcePacksFixture);}
async function align(page:Page,kind:string,point:readonly[number,number]){
  return page.locator(`[data-source-section=${kind}]`).evaluate((owner,point)=>{
    Object.assign(owner.style,{position:'absolute',left:'0px',top:'0px'});
    const image=owner.querySelector('.mc-resource-packs-section__toggle>.mc-image')!,r=image.getBoundingClientRect();
    owner.style.left=(point[0]-r.x)+'px';owner.style.top=(point[1]-r.y)+'px';
    const b=image.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height};
  },point);
}
async function ink(page:Page){return page.locator('.mc-resource-packs-header-image canvas').evaluate(canvas=>{
  const target=canvas as HTMLCanvasElement,gl=target.getContext('webgl')!,rgba=new Uint8Array(target.width*target.height*4);gl.readPixels(0,0,target.width,target.height,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
  let left=target.width,top=target.height,right=-1,bottom=-1,count=0;
  for(let y=0;y<target.height;y++)for(let x=0;x<target.width;x++)if(rgba[((target.height-1-y)*target.width+x)*4+3]){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);count++;}
  const b=target.getBoundingClientRect();return{x:b.x+left,y:b.y+top,width:right-left+1,height:bottom-top+1,count};
});}

test('header image profile is typed and SSR retains the semantic button and original image',()=>{
  const html=renderToStaticMarkup(createElement(ResourcePackSection,section));
  expect(html).toContain('aria-expanded="false"');expect(html).toContain('Source title');expect(html).toContain('data-render-state="loading"');expect(html).toContain('class="mc-image"');expect(html).toContain('data-source-toggle-origin="180.25,60"');
  const bad=renderToStaticMarkup(createElement(ResourcePackSection,{...section,headerImageProfile:{...profile,frame:{...profile.frame,guiScale:3}}}));
  expect(bad).toContain('data-render-error=');expect(bad).not.toContain('<canvas');expect(bad).toContain('class="mc-image"');
  for(const patch of [{toggleOrigin:new Array(2)},{toggleOrigin:[Infinity,0]},{scissor:new Array(4)},{renderKey:NaN}]){
    const malformed={...profile,...patch}as ResourcePackHeaderImageProfile;
    const invalid=renderToStaticMarkup(createElement(ResourcePackSection,{...section,expanded:true,headerImageProfile:{...malformed,expandedPaintRect:[20,20,10,2]}}));
    expect(invalid).toContain('data-render-error=');expect(invalid).not.toContain('<canvas');expect(invalid).not.toMatch(/(?:left|top):NaN/);
  }
});

test('gallery exposes the optional image sampler and controlled expanded symbol',async({page})=>{
  await page.goto('/#resource-packs');const demo=page.getByTestId('resource-pack-header-sampling');await demo.scrollIntoViewIfNeeded();
  await expect(page.getByTestId('resource-packs-demo')).toHaveAttribute('data-font-ready','true',{timeout:30000});
  // The full gallery also initializes other source renderers. Wait for this
  // actual request's readiness through cold shader/driver work, not a sleep.
  await demo.getByRole('switch',{name:'启用标题图标采样'}).check();const canvas=demo.locator('.mc-resource-packs-header-image canvas');await expect(canvas).toHaveAttribute('data-render-state','ready',{timeout:15000});
  const button=demo.locator('.mc-resource-packs-section__header>button');await expect(button).toHaveAttribute('aria-expanded','false');await button.click();await expect(button).toHaveAttribute('aria-expanded','true');await expect(canvas).toHaveAttribute('data-render-state','ready');
  await expect(demo.locator('.mc-resource-packs-section__toggle>.mc-image')).toHaveAttribute('src',/minus/);
  await demo.getByRole('switch',{name:'启用标题图标采样'}).uncheck();await expect(canvas).toHaveCount(0);await expect(demo.locator('.mc-resource-packs-section__toggle>.mc-image')).toHaveCSS('visibility','visible');
});

const minusBase=new URL('../.cache/resource-pack-native-minus-study-20261103-01/',import.meta.url);
const minusAvailable=['native-before-minus-whole.png','native-after-minus-whole.png','MINUS-DRAW-DECODED.json'].every(file=>existsSync(new URL(file,minusBase)));
for(const backend of ['default','nvidia-d3d11']as const)test(`${backend}: explicit non-square minus paint profile matches the complete native draw`,async({browser:defaultBrowser,baseURL},testInfo)=>{
  test.skip(!minusAvailable,'Private original minus draw fixtures are absent; no generated substitute.');
  const before=await readFile(new URL('native-before-minus-whole.png',minusBase)),after=PNG.sync.read(await readFile(new URL('native-after-minus-whole.png',minusBase)));
  expect(sha(after.data)).toBe('f52178fb441fd5af345891533f692c255fe0fb91f44db7b0b55308a613211b53');
  const frame={width:2570,height:1402,guiScale:5},toggleOrigin=[442.5,34]as const;
  // Explicit HOST policy: preserve the11:3 texture ratio, ceil its physical
  // height and center in the normal10x10 control. Not an engine default claim.
  const height=Math.ceil(10*3/11*frame.guiScale)/frame.guiScale;
  const paint=[toggleOrigin[0],toggleOrigin[1]+(10-height)/2,10,height]as const;
  const nativeBytes=await readFile(new URL('MINUS-DRAW-DECODED.json',minusBase));expect(sha(nativeBytes)).toBe('f0cabb9794a697da197e8d3d043ffcc0a0b88b329dc840ce2f8f6459b67b7463');const native=JSON.parse(nativeBytes.toString('utf8'));
  const layout=layoutGuiImages({...frame,images:[{rect:paint,tint:[1,1,1,1]}]});
  expect(layout.meshes[0]!.vertices.map(v=>v.position)).toEqual(native.vertices.map((v:{position:number[]})=>v.position.slice(0,2)));
  expect(layout.meshes[0]!.vertices.map(v=>v.uvRaw)).toEqual(native.vertices.map((v:{uvRaw:number[]})=>v.uvRaw));expect(native.PS32float32).toEqual([1,1,1,1,1,1,1,1]);
  const owned=backend==='nvidia-d3d11'?await chromium.launch({args:['--enable-gpu','--use-gl=angle','--use-angle=d3d11']}):undefined;
  const context=await(owned??defaultBrowser).newContext({baseURL,viewport:{width:2800,height:1600},deviceScaleFactor:1}),page=await context.newPage();
  try{
    await open(page,{part:'section',kind:'unowned',profile:'global',width:400,scale:5,headerImageProfile:{frame,toggleOrigin,expandedPaintRect:paint,scissor:[256,114,2056,1287]},managerBindings:{selectedGridVisible:true}});
    await page.locator('#fixture-outside').click();await page.mouse.move(0,0);
    await page.addStyleTag({content:'html,body{margin:0}#fixture-stage{position:absolute;left:0;top:0;margin:0;max-width:none;overflow:visible;width:2570px;height:1402px;visibility:hidden;z-index:1}#fixture-outside,output{visibility:hidden}#fixture-stage .mc-resource-packs-section__header>button{visibility:visible}#fixture-stage .mc-resource-packs-section__header>button>*{visibility:hidden}#fixture-stage .mc-resource-packs-section__toggle{visibility:visible}'});
    await page.evaluate(background=>{const plane=document.createElement('div');Object.assign(plane.style,{position:'absolute',left:'0',top:'0',width:'2570px',height:'1402px',backgroundImage:'url('+JSON.stringify(background)+')',backgroundSize:'2570px 1402px'});document.body.append(plane);},'data:image/png;base64,'+before.toString('base64'));
    expect(await align(page,'unowned',[2212.5,170])).toEqual({x:2212.5,y:170,width:50,height:50});
    const button=page.locator('.mc-resource-packs-section__header>button'),layerWindow=page.locator('.mc-resource-packs-header-image'),canvas=layerWindow.locator('canvas');await button.hover();await expect(layerWindow).toHaveAttribute('data-button-state','hover');await expect(canvas).toHaveAttribute('data-render-state','ready');await expect(page.locator('.mc-resource-packs-section__toggle>.mc-image')).toHaveCSS('visibility','hidden');
    const renderer=await canvas.evaluate(canvas=>{const gl=(canvas as HTMLCanvasElement).getContext('webgl')!,debug=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(debug!.UNMASKED_RENDERER_WEBGL)as string;});
    if(backend==='nvidia-d3d11')expect(renderer).toMatch(/NVIDIA.*(?:D3D11|Direct3D11)/);
    await testInfo.attach('native-minus-renderer.json',{body:JSON.stringify({backend,renderer}),contentType:'application/json'});
    const shot=await page.screenshot({clip:{x:0,y:0,width:2570,height:1402},animations:'disabled'});expect(sha(PNG.sync.read(shot).data)).toBe(sha(after.data));await testInfo.attach('complete-native-minus.png',{body:shot,contentType:'image/png'});
    await configure(page,{headerImageProfile:undefined});await expect(canvas).toHaveCount(0);
    const fallback=await page.screenshot({clip:{x:0,y:0,width:2570,height:1402},animations:'disabled'}),fallbackPixels=PNG.sync.read(fallback).data;
    let differences=0;for(let i=0;i<fallbackPixels.length;i+=4)if(!fallbackPixels.subarray(i,i+4).equals(after.data.subarray(i,i+4)))differences++;
    await testInfo.attach('native-minus-css-contain.json',{body:JSON.stringify({backend,differentPixels:differences,scope:'CSS contain fallback, entire frame; no source profile, no tolerance or masks.'}),contentType:'application/json'});
  }finally{await context.close();await owned?.close();}
});

test('current-state atomic fallback, one pressed displacement, real context loss and explicit retry',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));
  await open(page,{part:'section',kind:'unowned',width:140,scale:2,headerImageProfile:profile,managerBindings:{selectedGridVisible:false}});
  await page.addStyleTag({content:'#fixture-stage{position:absolute;left:0;top:0;margin:0;max-width:none;overflow:visible}'});
  expect(await align(page,'unowned',[360.5,120])).toEqual({x:360.5,y:120,width:20,height:20});
  await page.mouse.move(0,0);
  const button=page.locator('.mc-resource-packs-section__header>button'),image=page.locator('.mc-resource-packs-section__toggle>.mc-image'),canvas=page.locator('.mc-resource-packs-header-image canvas'),layerWindow=page.locator('.mc-resource-packs-header-image');
  await expect(canvas).toHaveAttribute('data-render-state','ready');await expect(image).toHaveCSS('visibility','hidden');
  const normal=await ink(page);
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/plus.png',async route=>{await gate;await route.continue();});
  await button.hover();await expect(layerWindow).toHaveAttribute('data-button-state','hover');
  await expect(canvas).toHaveAttribute('data-render-state','loading');await expect(image).toHaveCSS('visibility','visible');await expect(canvas).toHaveCSS('visibility','hidden');
  release();await expect(canvas).toHaveAttribute('data-render-state','ready');await expect(image).toHaveCSS('visibility','hidden');await page.unroute('**/plus.png');
  await page.mouse.down();try{await expect(layerWindow).toHaveAttribute('data-button-state','pressed');await expect(canvas).toHaveAttribute('data-render-state','ready');const pressed=await ink(page);expect(pressed).toEqual({...normal,y:normal.y+2});}finally{await page.mouse.up();}
  await page.mouse.move(0,0);await page.locator('#fixture-outside').focus();await page.keyboard.press('Tab');await expect(button).toBeFocused();await expect(layerWindow).toHaveAttribute('data-button-state','hover');await expect(canvas).toHaveAttribute('data-render-state','ready');
  await page.keyboard.down('Space');try{await expect(layerWindow).toHaveAttribute('data-button-state','pressed');await expect(canvas).toHaveAttribute('data-render-state','ready');expect(await ink(page)).toEqual({...normal,y:normal.y+2});}finally{await page.keyboard.up('Space');}
  await configure(page,{disabled:true});await expect(button).toBeDisabled();await expect(layerWindow).toHaveAttribute('data-button-state','locked');await expect(canvas).toHaveAttribute('data-render-state','ready');await expect(image).toHaveCSS('visibility','hidden');
  await canvas.evaluate(canvas=>(canvas as HTMLCanvasElement).getContext('webgl')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(canvas).toHaveAttribute('data-render-state','error');await expect(image).toHaveCSS('visibility','visible');
  await configure(page,{headerImageProfile:{...profile,renderKey:'retry'}});await expect(canvas).toHaveAttribute('data-render-state','ready');await expect(image).toHaveCSS('visibility','hidden');
  await page.emulateMedia({forcedColors:'active'});await expect(canvas).toBeHidden();await expect(image).toBeVisible();await page.emulateMedia({forcedColors:'none'});
  await configure(page,{managerBindings:{selectedGridVisible:true}});await expect(canvas).toHaveCount(0);await expect(layerWindow).toHaveAttribute('data-render-error',/minus paint rectangle/);await expect(image).toHaveCSS('visibility','visible');await expect(image).toHaveCSS('object-fit','contain');
  await configure(page,{headerImageProfile:{...profile,frame:{...profile.frame,guiScale:3}}});await expect(canvas).toHaveCount(0);await expect(layerWindow).toHaveAttribute('data-render-error',/scale/);
  await page.evaluate(()=>window.resourcePacksFixture.unmount());await expect(layerWindow).toHaveCount(0);expect(errors).toEqual([]);
});

const base=new URL('../.cache/resource-pack-native-gpu-20261103-01/',import.meta.url);
const nativeAvailable=['native-before-plus-whole.png','native-after-plus-whole.png'].every(file=>existsSync(new URL(file,base)));
for(const backend of ['default','nvidia-d3d11']as const)test(`${backend}: actual Manager toggle image profiles reproduce the entire native plus draw`,async({browser:defaultBrowser,baseURL},testInfo)=>{
  test.skip(!nativeAvailable,'Private original native draw fixtures are absent; no generated substitute.');
  const before=await readFile(new URL('native-before-plus-whole.png',base)),after=PNG.sync.read(await readFile(new URL('native-after-plus-whole.png',base)));
  expect(sha(after.data)).toBe('532ef5ee4f8c5590b82cc73d40de3ee4d3193437a0c4993740dcfed613f5205e');
  const owned=backend==='nvidia-d3d11'?await chromium.launch({args:['--enable-gpu','--use-gl=angle','--use-angle=d3d11']}):undefined;
  const context=await(owned??defaultBrowser).newContext({baseURL,viewport:{width:2800,height:1600},deviceScaleFactor:1}),page=await context.newPage();
  try{
    const frame={width:2570,height:1402,guiScale:5};await open(page,{part:'manager',profile:'global',width:400,scale:5,headerImageProfiles:{available:{frame,toggleOrigin:[442.5,153],scissor:[256,114,2056,1287]},unowned:{frame,toggleOrigin:[442.5,179],scissor:[256,114,2056,1287]}},managerBindings:{selectedGridVisible:true,availableGridVisible:false,realmsVisible:false,unownedVisible:true,unownedGridVisible:false}});
    await page.locator('#fixture-outside').click();await page.mouse.move(0,0);
    await page.addStyleTag({content:'html,body{margin:0}#fixture-stage{position:absolute;left:0;top:0;margin:0;max-width:none;overflow:visible;width:2570px;height:1402px;visibility:hidden;z-index:1}#fixture-outside,output{visibility:hidden}#fixture-stage [data-source-section=available] .mc-resource-packs-section__toggle,#fixture-stage [data-source-section=unowned] .mc-resource-packs-section__toggle{visibility:visible}'});
    await page.evaluate(background=>{const plane=document.createElement('div');Object.assign(plane.style,{position:'absolute',left:'0',top:'0',width:'2570px',height:'1402px',backgroundImage:'url('+JSON.stringify(background)+')',backgroundSize:'2570px 1402px'});document.body.append(plane);},'data:image/png;base64,'+before.toString('base64'));
    for(const[kind,y]of [['available',765],['unowned',895]]as const){expect(await align(page,kind,[2212.5,y])).toEqual({x:2212.5,y,width:50,height:50});const toggle=page.locator(`[data-source-section=${kind}] .mc-resource-packs-section__toggle`),canvas=toggle.locator('canvas');await expect(canvas).toHaveAttribute('data-render-state','ready');await expect(toggle.locator('>.mc-image')).toHaveCSS('visibility','hidden');const b=await canvas.boundingBox();expect(b).not.toBeNull();expect(Number.isInteger(b!.x)&&Number.isInteger(b!.y)).toBe(true);expect(b!.width).toBeLessThan(60);expect(b!.height).toBeLessThan(60);}
    if(backend==='nvidia-d3d11'){const renderer=await page.locator('.mc-resource-packs-header-image canvas').first().evaluate(canvas=>{const gl=(canvas as HTMLCanvasElement).getContext('webgl')!,debug=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(debug!.UNMASKED_RENDERER_WEBGL)as string;});expect(renderer).toMatch(/NVIDIA.*(?:D3D11|Direct3D11)/);}
    const shot=await page.screenshot({clip:{x:0,y:0,width:2570,height:1402},animations:'disabled'}),actual=PNG.sync.read(shot);expect(sha(actual.data)).toBe(sha(after.data));await testInfo.attach('complete-native-plus.png',{body:shot,contentType:'image/png'});
  }finally{await context.close();await owned?.close();}
});
