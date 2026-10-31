import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {ScreenshotFlash} from '../src/screenshot-flash';
import type {ScreenshotFlashProps} from '../src/screenshot-flash';
import type {ScreenshotQASettings} from '../demo/screenshot-fixture';

const base=():ScreenshotFlashProps=>({size:[30,20],durationMs:320,trigger:'SSR',flashImage:{src:'https://host.example/accepted-material.png',sourceSize:[15,15]},motion:'animate'});
const root=(page:Page)=>page.locator('#qa-screenshot'),image=(page:Page)=>root(page).locator('.mc-screenshot-flash__image');
const expo=(p:number)=>p===0?0:p===1?1:2**(10*(p-1));
async function configure(page:Page,patch:Partial<ScreenshotQASettings>){await page.evaluate(p=>window.screenshotQA.configure(p),patch);}
async function finished(page:Page){return page.evaluate(()=>window.screenshotQA.events.filter(e=>e.kind==='finished'));}
async function clockTime(page:Page){return page.evaluate(()=>performance.now());}
async function opacity(page:Page,value:number){const serialized=await page.evaluate(v=>{const n=document.createElement('div');n.style.opacity=String(v);return n.style.opacity;},value);await expect(image(page)).toHaveCSS('opacity',serialized);}
async function open(page:Page,initial:Partial<ScreenshotQASettings>={},pixel=false){
 await page.emulateMedia({reducedMotion:'no-preference'});await page.clock.install({time:new Date('2020-01-01T00:00:00Z')});
 await page.addInitScript(value=>{window.screenshotQAInitial=value;},initial);await page.goto('/demo/screenshot-fixture.html?strict'+(pixel?'&pixel':''));
 await expect.poll(()=>page.evaluate(()=>window.screenshotQA?.ready===true)).toBe(true);await page.clock.pauseAt(new Date('2020-01-01T00:00:10Z'));
}

test('SSR is decorative source visual without camera IO scheduling or completion side effects',()=>{
 const before=new Map<string,PropertyDescriptor|undefined>(),calls:string[]=[];
 for(const name of ['fetch','Image','requestAnimationFrame','setTimeout']){before.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,writable:true,value:function(){calls.push(name);throw Error('SSR attempted '+name);}});}
 try{let ends=0;const supplied={...base(),onFinished:()=>{ends++;},'data-caller':'SSR'};const html=renderToStaticMarkup(createElement(ScreenshotFlash,supplied));expect(html).toContain('mc-screenshot-flash');expect(html).toContain('aria-hidden="true"');expect(html).toContain('data-caller="SSR"');expect(html).not.toMatch(/aria-modal=|<canvas|<iframe|durationMs=|flashImage=|onFinished=|cancelled=|trigger=|motion=/);expect(ends).toBe(0);expect(calls).toEqual([]);}finally{for(const [name,descriptor]of before){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else Reflect.deleteProperty(globalThis,name);}}
});

test('SSR rejects unresolved duration material frames controls and invalid finite primitives',()=>{
 const render=(patch:Partial<ScreenshotFlashProps>)=>renderToStaticMarkup(createElement(ScreenshotFlash,{...base(),...patch} as ScreenshotFlashProps));
 for(const durationMs of [-1,Number.NaN,Number.POSITIVE_INFINITY])expect(()=>render({durationMs})).toThrow();
 for(const value of [-.1,1.1,Number.NaN])for(const kind of ['alpha','progress']as const)expect(()=>render({control:{kind,value}})).toThrow();
 expect(()=>render({trigger:Number.POSITIVE_INFINITY})).toThrow();expect(()=>render({size:[0,2]})).toThrow();expect(()=>render({size:[2,Number.POSITIVE_INFINITY]})).toThrow();expect(()=>render({scale:1.5})).toThrow();
 expect(()=>render({flashImage:{src:' ',sourceSize:[15,15]}})).toThrow();expect(()=>render({flashImage:{src:'caller',sourceSize:[0,15]}})).toThrow();
 expect(()=>render({control:{kind:'progress',value:.5},easing:()=>Number.NaN})).toThrow();expect(()=>render({control:{kind:'progress',value:.5},easing:()=>1.1})).toThrow();
 expect(()=>render({size:'parent',scale:2} as unknown as Partial<ScreenshotFlashProps>)).toThrow();
});

test.describe('real client lifecycle',()=>{
 const runtime=new WeakMap<Page,{page:string[];console:string[];http:{url:string;status:number}[];network:string[]}>();
 test.beforeEach(async({page})=>{const e={page:[]as string[],console:[]as string[],http:[]as{url:string;status:number}[],network:[]as string[]};runtime.set(page,e);page.on('pageerror',x=>e.page.push(x.message));page.on('console',x=>{if(x.type()==='error')e.console.push(x.text());});page.on('response',x=>{if(x.status()>=400)e.http.push({url:x.url(),status:x.status()});});page.on('requestfailed',x=>e.network.push(x.url()+': '+x.failure()?.errorText));});
 test.afterEach(async({page},info)=>{const e=runtime.get(page)!;await info.attach('screenshot-runtime',{body:JSON.stringify(e,null,2),contentType:'application/json'});expect(e.page).toEqual([]);expect(e.console).toEqual([]);expect(e.http).toEqual([]);expect(e.network).toEqual([]);});

 test('null idle and finite zero trigger keep caller ref attrs and underlying native interaction',async({page})=>{
  await open(page);await expect(root(page)).toBeHidden();expect(await page.evaluate(()=>window.screenshotQA.ref===document.querySelector('#qa-screenshot'))).toBe(true);await configure(page,{trigger:0,control:{kind:'alpha',value:1}});await expect(root(page)).toBeVisible();await expect(root(page)).toHaveAttribute('aria-hidden','true');await expect(root(page)).toHaveAttribute('tabindex','-1');await expect(root(page)).toHaveAttribute('data-caller','retained');await expect(root(page)).toHaveClass(/caller-flash-class/);await expect(root(page)).toHaveCSS('pointer-events','none');await expect(image(page)).toHaveCSS('z-index','6');await expect(root(page).locator('.mc-screenshot-flash__background')).toHaveCSS('opacity','0.8');expect(await root(page).evaluate(n=>['durationMs','flashImage','trigger','cancelled','control','easing','motion','onFinished'].some(k=>n.hasAttribute(k)))).toBe(false);
  const under=page.locator('#qa-under');await under.click();await under.focus();await page.keyboard.press('Enter');expect(await page.evaluate(()=>window.screenshotQA.events.filter(e=>e.kind==='under-click').length)).toBe(2);expect(await page.evaluate(()=>window.screenshotQA.events.filter(e=>e.kind==='caller-click').length)).toBe(0);await expect(under).toBeFocused();expect(await finished(page)).toHaveLength(0);
 });

 test('actual RAF clock follows explicit Web expo math and finishes once without auto closing source background',async({page})=>{
  await open(page);const started=await clockTime(page);await configure(page,{trigger:'clock'});await opacity(page,1);await page.clock.runFor(160);const timestamp=await page.evaluate(()=>window.screenshotRAF.times.at(-1));expect(timestamp).toBeDefined();await opacity(page,1-expo(Math.min(1,(timestamp!-started)/320)));await configure(page,{handlerVersion:7});await page.clock.runFor(400);await opacity(page,0);const events=await finished(page);expect(events).toHaveLength(1);expect(events[0]).toMatchObject({kind:'finished',detail:{trigger:'clock',mode:'timeline',reducedMotion:false},handlerVersion:7});if(events[0]?.kind==='finished')expect(events[0].detail.elapsedMs).toBeGreaterThanOrEqual(320);await expect(root(page)).toBeVisible();await expect(root(page).locator('.mc-screenshot-flash__background')).toHaveCount(1);const requested=await page.evaluate(()=>window.screenshotRAF.requested.length);await page.clock.runFor(2000);expect(await finished(page)).toHaveLength(1);expect(await page.evaluate(()=>window.screenshotRAF.requested.length)).toBe(requested);
 });

 test('same-key rerender snapshots automatic duration and curve while latest callbacks remain current',async({page})=>{
  await open(page);const started=await clockTime(page);await configure(page,{trigger:'snapshot'});await page.clock.runFor(80);await configure(page,{durationMs:1600,easing:'linear',handlerVersion:3});await page.clock.runFor(80);const stamp=await page.evaluate(()=>window.screenshotRAF.times.at(-1));await opacity(page,1-expo(Math.min(1,(stamp!-started)/320)));await page.clock.runFor(400);expect(await finished(page)).toHaveLength(1);expect((await finished(page))[0]).toMatchObject({handlerVersion:3});await configure(page,{durationMs:100,easing:'quadratic'});await page.clock.runFor(400);expect(await finished(page)).toHaveLength(1);
 });

 test('new trigger identity cancels stale timeline and only the current generation completes',async({page})=>{
  await open(page);await configure(page,{trigger:'old'});await page.clock.runFor(160);await configure(page,{trigger:'new'});await opacity(page,1);await page.clock.runFor(160);expect(await finished(page)).toHaveLength(0);await page.clock.runFor(400);expect((await finished(page)).map(e=>e.kind==='finished'?e.detail.trigger:null)).toEqual(['new']);expect(await page.evaluate(()=>window.screenshotRAF.cancelled.length)).toBeGreaterThan(0);
 });

 test('visible hidden and cancelled each suppress pending completion and same-key resumption starts a fresh activation',async({page})=>{
  await open(page);for(const [field,off,on]of [['visible',false,true],['hidden',true,false],['cancelled',true,false]]as const){await configure(page,{trigger:field});await page.clock.runFor(80);await configure(page,{[field]:off});await expect(root(page)).toBeHidden();const before=(await finished(page)).length;await page.clock.runFor(600);expect(await finished(page)).toHaveLength(before);await configure(page,{[field]:on});await opacity(page,1);await page.clock.runFor(600);expect(await finished(page)).toHaveLength(before+1);}
 });

 test('unmount clears actual caller ref cancels queued RAF and never sends a stale finish',async({page})=>{
  await open(page);await configure(page,{trigger:'unmount'});await page.clock.runFor(80);await page.evaluate(()=>window.screenshotQA.unmount());await expect(root(page)).toHaveCount(0);expect(await page.evaluate(()=>window.screenshotQA.ref)).toBeNull();const count=await page.evaluate(()=>window.screenshotRAF.requested.length);await page.clock.runFor(1000);expect(await finished(page)).toHaveLength(0);expect(await page.evaluate(()=>window.screenshotRAF.requested.length)).toBe(count);
 });

 test('StrictMode callback cleanup is owned once on replacement and unmount without a duplicate null notification',async({page})=>{
  await open(page,{refMode:'cleanup'});expect(await page.evaluate(()=>window.screenshotQA.ref===document.querySelector('#qa-screenshot'))).toBe(true);const initial=await page.evaluate(()=>window.screenshotQA.refEvents);expect(initial.filter(e=>e.kind==='attach').length-initial.filter(e=>e.kind==='cleanup').length).toBe(1);expect(initial.filter(e=>e.kind==='null')).toEqual([]);await configure(page,{refVersion:1});const changed=await page.evaluate(()=>window.screenshotQA.refEvents);expect(changed.filter(e=>e.version===0&&e.kind==='cleanup').length).toBe(initial.filter(e=>e.version===0&&e.kind==='cleanup').length+1);expect(changed.filter(e=>e.version===1&&e.kind==='attach')).toHaveLength(1);expect(changed.filter(e=>e.kind==='null')).toEqual([]);await page.evaluate(()=>window.screenshotQA.unmount());const ended=await page.evaluate(()=>window.screenshotQA.refEvents);expect(ended.filter(e=>e.version===1&&e.kind==='cleanup')).toHaveLength(1);expect(ended.filter(e=>e.kind==='null')).toEqual([]);expect(await page.evaluate(()=>window.screenshotQA.ref)).toBeNull();
 });

 test('ordinary callback gets one detach null on ref replacement and object ref clears on unmount',async({page})=>{
  await open(page);const start=await page.evaluate(()=>window.screenshotQA.refEvents.filter(e=>e.version===0&&e.kind==='null').length);await configure(page,{refVersion:1});expect(await page.evaluate(()=>window.screenshotQA.refEvents.filter(e=>e.version===0&&e.kind==='null').length)).toBe(start+1);expect(await page.evaluate(()=>window.screenshotQA.refEvents.filter(e=>e.version===1&&e.kind==='attach').length)).toBe(1);await configure(page,{refMode:'object'});expect(await page.evaluate(()=>window.screenshotQA.refEvents.filter(e=>e.version===1&&e.kind==='null').length)).toBe(1);expect(await page.evaluate(()=>window.screenshotQA.objectRef?.current===document.querySelector('#qa-screenshot'))).toBe(true);await page.evaluate(()=>window.screenshotQA.unmount());expect(await page.evaluate(()=>window.screenshotQA.objectRef?.current)).toBeNull();
 });

 test('controlled progress uses independent exact fractions current easing and an activation completion latch',async({page})=>{
  await open(page);await configure(page,{trigger:'progress',control:{kind:'progress',value:0}});for(const value of [.25,.5,.75,1]){await configure(page,{control:{kind:'progress',value}});await opacity(page,1-expo(value));}expect(await finished(page)).toHaveLength(1);expect((await finished(page))[0]).toMatchObject({detail:{mode:'progress',trigger:'progress',reducedMotion:false}});await configure(page,{control:{kind:'progress',value:.5},easing:'quadratic'});await opacity(page,.75);await configure(page,{control:{kind:'progress',value:1},durationMs:999});expect(await finished(page)).toHaveLength(1);await page.clock.runFor(2000);expect(await page.evaluate(()=>window.screenshotRAF.requested.length)).toBe(0);
 });

 test('controlled alpha is direct and switching back to auto uses original activation elapsed not a restarted clock',async({page})=>{
  await open(page);await configure(page,{trigger:'mixed'});await page.clock.runFor(80);await configure(page,{control:{kind:'alpha',value:.375},easing:'quadratic'});await opacity(page,.375);const count=await page.evaluate(()=>window.screenshotRAF.requested.length);await page.clock.runFor(500);expect(await page.evaluate(()=>window.screenshotRAF.requested.length)).toBe(count);await configure(page,{control:undefined});await opacity(page,0);expect(await finished(page)).toHaveLength(1);await configure(page,{trigger:'direct',control:{kind:'alpha',value:0}});expect(await finished(page)).toHaveLength(2);expect((await finished(page))[1]).toMatchObject({detail:{mode:'alpha',trigger:'direct'}});await configure(page,{control:{kind:'alpha',value:1}});await opacity(page,1);await configure(page,{control:{kind:'alpha',value:0}});expect(await finished(page)).toHaveLength(2);
 });

 test('system reduced motion and explicit skip end automatically while controlled material remains host-owned',async({page})=>{
  await open(page);await page.emulateMedia({reducedMotion:'reduce'});await configure(page,{motion:'system',trigger:'system'});await opacity(page,0);expect((await finished(page))[0]).toMatchObject({detail:{trigger:'system',reducedMotion:true}});await configure(page,{trigger:'controlled',control:{kind:'alpha',value:.75}});await opacity(page,.75);const before=(await finished(page)).length;await page.clock.runFor(1000);expect(await finished(page)).toHaveLength(before);await configure(page,{trigger:'forced',control:undefined,motion:'animate'});await opacity(page,1);await page.clock.runFor(400);expect((await finished(page)).at(-1)).toMatchObject({detail:{trigger:'forced',reducedMotion:false}});await page.emulateMedia({reducedMotion:'no-preference'});await configure(page,{trigger:'skip',motion:'skip'});await opacity(page,0);expect((await finished(page)).at(-1)).toMatchObject({detail:{trigger:'skip',reducedMotion:true}});
 });

 test('runtime motion preference completes a current system run without replay when preference returns',async({page})=>{
  await open(page);await configure(page,{trigger:'mql',motion:'system'});await page.clock.runFor(80);await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(async()=>(await finished(page)).length).toBe(1);await opacity(page,0);await page.emulateMedia({reducedMotion:'no-preference'});await page.clock.runFor(500);expect(await finished(page)).toHaveLength(1);await configure(page,{present:false});await page.emulateMedia({reducedMotion:'reduce'});expect(await finished(page)).toHaveLength(1);
 });

 test('zero duration is once-only in StrictMode and host acceptance alone may make the screen idle',async({page})=>{
  await open(page);await configure(page,{trigger:'zero',durationMs:0});await opacity(page,0);expect(await finished(page)).toHaveLength(1);await configure(page,{handlerVersion:1});expect(await finished(page)).toHaveLength(1);await expect(root(page)).toBeVisible();await configure(page,{trigger:'accepted',acceptFinish:true});await expect(root(page)).toBeHidden();expect(await page.evaluate(()=>window.screenshotQA.settings.trigger)).toBeNull();expect(await finished(page)).toHaveLength(2);
 });

 test('explicit scaled frame and parent frame respond to host layout without choosing a native viewport',async({page})=>{
  await open(page);await configure(page,{trigger:'frame',size:[30,20],scale:2,control:{kind:'alpha',value:1}});expect(await root(page).evaluate(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height}))).toEqual({w:60,h:40});await configure(page,{size:'parent'});expect(await root(page).evaluate(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height}))).toEqual({w:180,h:120});await page.locator('.screenshot-stage').evaluate(n=>{(n as HTMLElement).style.width='123px';(n as HTMLElement).style.height='87px';});expect(await root(page).evaluate(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height}))).toEqual({w:123,h:87});expect(await finished(page)).toHaveLength(0);
 });
});

test.describe('complete original candidate source plane',()=>{
 test.use({viewport:{width:15,height:15},deviceScaleFactor:1,isMobile:false,hasTouch:false});
 test('entire225px original candidate including104 black pixels is strictRGBA0 with no crop mask or native alias claim',async({page},info)=>{
  const errors:{page:string[];console:string[];network:string[];http:number[]}={page:[],console:[],network:[],http:[]};page.on('pageerror',e=>errors.page.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.console.push(e.text());});page.on('requestfailed',e=>errors.network.push(e.url()+': '+e.failure()?.errorText));page.on('response',r=>{if(r.status()>=400)errors.http.push(r.status());});
  try{
  const bytes=await readFile(new URL('../demo/screenshot-assets/white-candidate.png',import.meta.url));expect(createHash('sha256').update(bytes).digest('hex')).toBe('e666f27bda2c08c810a18b699397f8f0df5ffee87157a14bb96157e4a6b27fc3');const expected=PNG.sync.read(bytes);await open(page,{size:[15,15],trigger:'whole-plane',control:{kind:'alpha',value:1}},true);await image(page).evaluate(n=>(n as HTMLImageElement).decode());const actual=PNG.sync.read(await page.screenshot({omitBackground:true,caret:'initial',animations:'disabled'}));expect([actual.width,actual.height]).toEqual([15,15]);expect(actual.data.equals(expected.data)).toBe(true);const wrong=Buffer.from(expected.data);wrong[0]=wrong[0]!^1;expect(actual.data.equals(wrong)).toBe(false);await expect(image(page)).toHaveCSS('z-index','6');expect(await page.evaluate(()=>devicePixelRatio)).toBe(1);
  }finally{await info.attach('screenshot-whole-plane-runtime',{body:JSON.stringify(errors,null,2),contentType:'application/json'});expect(errors).toEqual({page:[],console:[],network:[],http:[]});}
  });
});
