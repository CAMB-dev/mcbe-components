import {test,expect} from '@playwright/test';
import {PNG} from 'pngjs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ResourcePackSection} from '../src/resource-packs';
import type {ResourcePackHeaderTextProfile,ResourcePackSectionProps} from '../src';
import type {ResourcePacksFixtureSettings} from '../demo/resource-packs-fixture';

const pageImage=new PNG({width:8,height:8});pageImage.data.fill(255);
const font={pages:['data:image/png;base64,'+PNG.sync.write(pageImage).toString('base64')],pageSizes:[8],lineHeight:3,glyphs:{A:{page:0,atlasRect:[0,0,3,2] as const,offset:[0,0] as const,size:[3,2] as const,advance:4}}};
const profile:ResourcePackHeaderTextProfile={frame:{width:1200,height:900,guiScale:2},font,origin:[180.25,60],paintOffset:[0,0]};
const props:ResourcePackSectionProps={kind:'unowned',profile:'global',width:140,scale:2,title:'Count',titleVisible:true,expanded:false,collection:{capacity:0,count:'A',items:[]},noPacks:true,viewMoreLabel:'More',headerTextProfile:profile};
const fixture='/demo/resource-packs-fixture.html';
async function configure(page:any,patch:Partial<ResourcePacksFixtureSettings>){await page.evaluate((p:any)=>window.resourcePacksFixture.configure(p),patch);}
async function open(page:any,patch:Partial<ResourcePacksFixtureSettings>={}){await page.addInitScript((p:any)=>window.resourcePacksFixtureInitial=p,{part:'section',kind:'unowned',scale:2,width:140,headerCount:'A',headerTextProfile:profile,...patch});await page.goto(fixture);await page.waitForFunction(()=>window.resourcePacksFixture);}
async function ink(page:any){return page.locator('.mc-resource-packs-header-text canvas').first().evaluate((canvas:HTMLCanvasElement)=>{
 const gl=canvas.getContext('webgl')!,raw=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,raw);let left=canvas.width,right=-1,top=canvas.height,bottom=-1;const colors=new Set<string>();
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const i=((canvas.height-y-1)*canvas.width+x)*4;if(raw[i+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);colors.add([...raw.subarray(i,i+4)].join(','));}}
 const b=canvas.getBoundingClientRect();return {x:b.x+left,y:b.y+top,width:right-left+1,height:bottom-top+1,colors:[...colors]};});}

test('SSR retains one literal count, strict source preflight and no provider IO',()=>{
 const html=renderToStaticMarkup(createElement(ResourcePackSection,props));expect(html).toContain('data-render-state="loading"');expect(html).toContain('mc-resource-packs-header-text__fallback">A</span>');expect(html).toContain('aria-hidden="true"');
 for(const patch of[{paintOffset:new Array(2)},{frame:{...profile.frame,guiScale:3}},{activeColor:[0,0,0,256]},{font:{...font,glyphs:{}}},{renderKey:NaN}]){
  const value=renderToStaticMarkup(createElement(ResourcePackSection,{...props,headerTextProfile:{...profile,...patch} as ResourcePackHeaderTextProfile}));expect(value).toContain('data-render-error=');expect(value).not.toContain('<canvas');expect(value).toContain('>A</span>');
 }
 const hidden=renderToStaticMarkup(createElement(ResourcePackSection,{...props,titleVisible:false}));expect(hidden).not.toContain('<canvas');
});
test('count uses source advances; hover, keyboard focus, press and locked state retain normal button semantics',async({page})=>{
 await open(page);const count=page.locator('.mc-resource-packs-header-text'),canvas=count.locator('canvas'),button=page.getByRole('button',{name:/Independent section A/});await expect(canvas).toHaveAttribute('data-render-state','ready');await expect(count).toHaveCSS('width','8px');expect((await ink(page)).colors).toEqual(['76,76,76,255']);await expect(count.locator('.mc-resource-packs-header-text__fallback')).toHaveCSS('opacity','0');
 await button.hover();await expect(count).toHaveAttribute('data-button-state','hover');await expect(canvas).toHaveAttribute('data-render-state','ready');await expect.poll(async()=> (await ink(page)).colors.join()).toBe('255,255,255,255');const before=await ink(page);
 await page.mouse.down();await expect(count).toHaveAttribute('data-button-state','pressed');await expect(canvas).toHaveAttribute('data-render-state','ready');await expect.poll(async()=> (await ink(page)).y).toBe(before.y+2);await page.mouse.up();
 await page.mouse.move(0,0);await button.focus();await expect(button).toHaveAccessibleName(/Independent section A/);
 await page.keyboard.press('Enter');expect(await page.evaluate(()=>window.resourcePacksFixture.events.some(e=>e.kind==='action'))).toBe(true);
 await configure(page,{readOnly:true});await expect(button).toBeDisabled();await expect(count).toHaveAttribute('data-button-state','locked');await expect.poll(async()=> (await ink(page)).colors.join()).toBe('76,76,76,255');
});
test('used metrics and count text repaint; failed or invalid input restores the literal and cleanup releases canvas',async({page})=>{
 await open(page);const canvas=page.locator('.mc-resource-packs-header-text canvas');await expect(canvas).toHaveAttribute('data-render-state','ready');const before=await ink(page);
 await page.evaluate(()=>{const g=window.resourcePacksFixture.settings.headerTextProfile!.font.glyphs.A!;Object.assign(g,{size:[5,2]});window.resourcePacksFixture.configure({headerCount:'A'});});await expect.poll(async()=> (await ink(page)).width).toBeGreaterThan(before.width);
 await configure(page,{headerCount:'AA'});await expect(page.locator('.mc-resource-packs-header-text')).toHaveCSS('width','16px');await expect(canvas).toHaveAttribute('data-render-state','ready');
 await configure(page,{headerTextProfile:{...profile,font:{...font,pages:['/missing-original-count.png']}}});await expect(canvas).toHaveAttribute('data-render-state','error');await expect(page.locator('.mc-resource-packs-header-text__fallback')).toHaveCSS('opacity','1');
 const requests:string[]=[];page.on('request',r=>{if(r.url().includes('must-not-fetch'))requests.push(r.url());});await configure(page,{headerTextProfile:{...profile,font:{...font,pages:['/must-not-fetch.png']},activeColor:[0,0,0,256]}});await expect(canvas).toHaveCount(0);expect(requests).toEqual([]);
 await configure(page,{headerTextProfile:profile});await expect(canvas).toHaveAttribute('data-render-state','ready');await configure(page,{show:false});await expect(canvas).toHaveCount(0);
});
test('manager maps four independent profiles and forced colors preserve one accessible literal',async({page})=>{
 await open(page,{part:'manager',headerTextProfiles:{selected:profile,available:profile,realms:profile,unowned:profile},managerBindings:{realmsVisible:true,unownedVisible:true}});
 const canvases=page.locator('.mc-resource-packs-header-text canvas');await expect(canvases).toHaveCount(4);for(const c of await canvases.all())await expect(c).toHaveAttribute('data-render-state','ready');
 await page.emulateMedia({forcedColors:'active'});for(const fallback of await page.locator('.mc-resource-packs-header-text__fallback').all())await expect(fallback).toHaveCSS('opacity','1');
 for(const paint of await page.locator('.mc-resource-packs-header-text__paint').all())await expect(paint).toHaveCSS('display','none');
 await configure(page,{headerTextProfiles:undefined});await expect(canvases).toHaveCount(0);
});

test('optional native D3D11: actual Section count with original font matches the complete saved single-draw plane',async({page},testInfo)=>{
 const root=new URL('../.cache/',import.meta.url),fontPath=new URL('local-fonts/classic-ten-gui64/gui-font.json',root),nativeRoot=new URL('resource-pack-header-font-study-20261103-01/',root);
 test.skip(!existsSync(fontPath)||!existsSync(new URL('native-after-g74-whole.png',nativeRoot)),'Original private font/cache or native oracle absent.');
 const source=JSON.parse(await readFile(fontPath,'utf8')),before=await readFile(new URL('native-before-g74-whole.png',nativeRoot)),after=PNG.sync.read(await readFile(new URL('native-after-g74-whole.png',nativeRoot)));
 source.pages=['/.cache/local-fonts/classic-ten-gui64/atlas.png'];
 await page.setViewportSize({width:2570,height:1402});await open(page,{scale:5,headerCount:'0',headerTextProfile:{frame:{width:2570,height:1402,guiScale:5},font:source,origin:[423.6,151.5],projectionScale:1.5,paintOffset:[0,-2],scissor:[256,114,2056,1287]}});
 const canvas=page.locator('.mc-resource-packs-header-text canvas');await expect(canvas).toHaveAttribute('data-render-state','ready');
 const renderer=await canvas.evaluate(c=>{const gl=(c as HTMLCanvasElement).getContext('webgl')!,e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):null;});expect(renderer).toMatch(/NVIDIA.*(?:D3D11|Direct3D11)/);
 // Test-only host registration, like the image profile proof. Product code never
 // reads a DOM box to infer the global origin. Only the count paint is scored.
 await page.evaluate(async uri=>{
  const section=document.querySelector<HTMLElement>('[data-source-section=unowned]')!;Object.assign(section.style,{position:'absolute',left:'0px',top:'0px'});
  // This fixture normally clips to a320px-tall scrolling stage. The conditioned
  // native host point is y767.5, so expose that viewport before registering it.
  document.querySelector<HTMLElement>('#fixture-stage')!.style.overflow='visible';
  const box=section.querySelector('.mc-resource-packs-header-text')!.getBoundingClientRect();section.style.left=(2118-box.x)+'px';section.style.top=(767.5-box.y)+'px';
  document.body.style.visibility='hidden';const bg=document.createElement('img');bg.src=uri;Object.assign(bg.style,{position:'absolute',left:'0px',top:'0px',width:'2570px',height:'1402px',visibility:'visible'});document.body.prepend(bg);await bg.decode();
 },'data:image/png;base64,'+before.toString('base64'));
 const shot=await page.screenshot({animations:'disabled'}),actual=PNG.sync.read(shot),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
 await testInfo.attach('actual-resource-pack-count-native-whole.png',{body:shot,contentType:'image/png'});
 expect(actual.width).toBe(2570);expect(actual.height).toBe(1402);expect(sha(actual.data)).toBe(sha(after.data));
 await configure(page,{show:false});await expect(canvas).toHaveCount(0);
});
