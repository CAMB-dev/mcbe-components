import {test,expect} from '@playwright/test';import type{Page}from'@playwright/test';
import {createElement} from 'react';import{renderToStaticMarkup}from'react-dom/server';import{PNG}from'pngjs';
import{InBedScreen,InBedControls}from'../src';import type{InBedLayout,InBedScreenProps}from'../src';import type{}from'../demo/in-bed-fixture';
const layout:InBedLayout={size:[320,200],contentRect:[0,0,320,200],scale:2,font:{family:'monospace',size:8,lineHeight:10},buttons:[{size:[64,20],labelSize:[54,10]},{size:[72,20],labelSize:[62,10]}],status:{origin:[50,105],width:220,alignment:'center',verticalAlignment:'center'}};
const props:InBedScreenProps={open:true,layout,label:'Sleeping',status:'Players sleeping',labels:{wake:'Leave Bed',chat:'Open Chat'},inputHint:{visible:false}};
async function open(page:Page,initial:Record<string,unknown>={}){await page.addInitScript(s=>window.inBedInitial=s,initial);await page.goto('/demo/in-bed-fixture.html');await page.waitForFunction(()=>window.inBedFixture);}
async function configure(page:Page,patch:Record<string,unknown>){await page.evaluate(p=>window.inBedFixture.configure(p),patch);}
async function events(page:Page){return page.evaluate(()=>window.inBedFixture.events);}
const buttons=(page:Page)=>({wake:page.getByRole('button',{name:'Leave Bed',exact:true}),chat:page.getByRole('button',{name:'Open Chat',exact:true})});

test('typed SSR uses actual source controls and closed screens allocate no DOM',()=>{
 const html=renderToStaticMarkup(createElement(InBedScreen,props));expect(html).toContain('role="dialog"');expect(html).toContain('aria-label="Sleeping"');expect(html).toContain('role="status"');expect(html).toContain('bed.wake_up_button_panel');expect(html).toContain('data-native-certified="false"');expect(html).not.toContain('<canvas');expect(renderToStaticMarkup(createElement(InBedScreen,{...props,open:false}))).toBe('');
 expect(renderToStaticMarkup(createElement(InBedControls,{layout:{...layout,rowHeight:30},labels:props.labels}))).toContain('role="group"');
 for(const patch of[{layout:{...layout,scale:0}},{layout:{...layout,buttons:new Array(2)}},{inputHint:{visible:true}},{layout:{...layout,status:{...layout.status,origin:[NaN,0]}}}])expect(()=>renderToStaticMarkup(createElement(InBedScreen,{...props,...patch}as InBedScreenProps))).toThrow();
});
test('percentage source layout, fixed gaps, label cap and black50% background use declared frame without scrollbars',async({page})=>{
 await open(page);const screen=page.getByRole('dialog',{name:'Sleeping'}),b=buttons(page);await expect(screen).toHaveCSS('overflow','hidden');expect(await screen.boundingBox()).toEqual({x:0,y:0,width:640,height:400});
 expect(await b.wake.boundingBox()).toEqual({x:192,y:280,width:128,height:40});expect(await b.chat.boundingBox()).toEqual({x:360,y:280,width:144,height:40});expect(await page.locator('.mc-in-bed-hint').boundingBox()).toEqual({x:0,y:328,width:640,height:52});
 await expect(screen.getByRole('status')).toHaveCSS('height','98px');const shot=PNG.sync.read(await screen.screenshot());expect([...shot.data.subarray(0,4)]).toEqual([48,64,80,255]);
 const size=await screen.evaluate(n=>({client:n.clientWidth,scroll:n.scrollWidth,height:n.clientHeight,scrollHeight:n.scrollHeight}));expect(size).toEqual({client:640,scroll:640,height:400,scrollHeight:400});
});
test('resolved safe-zone content moves controls and hints without shrinking the whole dim background or blocking a button',async({page})=>{
 await open(page,{layout:{...layout,contentRect:[30,15,250,160]}});const b=buttons(page),screen=page.getByRole('dialog',{name:'Sleeping'});
 expect(await screen.boundingBox()).toEqual({x:0,y:0,width:640,height:400});expect(await b.wake.boundingBox()).toEqual({x:182,y:254,width:128,height:40});expect(await page.locator('.mc-in-bed-hint').boundingBox()).toEqual({x:60,y:282,width:500,height:52});
 await b.wake.click({position:{x:20,y:39}});await expect.poll(async()=> (await events(page)).length).toBe(1);expect((await events(page))[0].action).toBe('wake-up');
});
test('wake, chat and real Enter/Space emit the fixed intents exactly once and keep screen controlled',async({page})=>{
 await open(page);const b=buttons(page);await b.wake.click();await expect.poll(async()=> (await events(page)).length).toBe(1);await b.chat.click();await expect.poll(async()=> (await events(page)).length).toBe(2);
 await b.wake.focus();await page.keyboard.press('Enter');await b.chat.focus();await page.keyboard.press('Space');await expect.poll(async()=> (await events(page)).length).toBe(4);
 const got=await events(page);expect(got.map((x:any)=>x.buttonId)).toEqual(['button.wake_up_button','button.chat','button.wake_up_button','button.chat']);expect(got.every((x:any)=>x.currentTarget==='BUTTON'&&!x.defaultPrevented)).toBe(true);await expect(page.getByRole('dialog',{name:'Sleeping'})).toBeVisible();
});
test('native Tab wraps, opening takes focus and closing restores the real opener',async({page})=>{
 await open(page,{open:false});const outside=page.locator('#outside');await outside.focus();await configure(page,{open:true});const b=buttons(page);await expect(b.wake).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(b.chat).toBeFocused();await page.keyboard.press('Tab');await expect(b.wake).toBeFocused();await configure(page,{open:false});await expect(outside).toBeFocused();expect(await page.evaluate(()=>window.inBedFixture.refs.root.current)).toBe(null);
});
test('Escape maps to wake while modified, repeated and composing keys do not',async({page})=>{
 await open(page);const b=buttons(page);await b.wake.focus();for(const extra of[{ctrlKey:true},{repeat:true},{isComposing:true}])await b.wake.dispatchEvent('keydown',{key:'Escape',bubbles:true,...extra});expect(await events(page)).toEqual([]);await page.keyboard.press('Escape');await expect.poll(async()=> (await events(page)).length).toBe(1);expect((await events(page))[0]).toMatchObject({action:'wake-up',source:'menu-cancel',buttonId:'button.wake_up_button',currentTarget:'SECTION'});
});
for(const veto of['leaf','react','native'])test(`${veto} defaultPrevented veto suppresses the deferred action`,async({page})=>{await open(page,{veto});await buttons(page).wake.click();await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));expect(await events(page)).toEqual([]);});
test('controller routes global cancel/exit and focused select/ok; retained handle reads latest committed callback',async({page})=>{
 await open(page);const id=await page.evaluate(()=>window.inBedFixture.retain());await configure(page,{tag:'latest',status:'New status'});await expect(page.getByRole('status')).toHaveText('New status');
 for(const command of['button.menu_cancel','button.menu_exit','button.wake_up_button','button.chat'])expect(await page.evaluate(({command,id})=>window.inBedFixture.request(command,id),{command,id})).toBe(true);
 await expect.poll(async()=> (await events(page)).length).toBe(4);expect((await events(page)).every((x:any)=>x.tag==='latest')).toBe(true);
 await buttons(page).chat.focus();expect(await page.evaluate(()=>window.inBedFixture.request('button.menu_select'))).toBe(true);await expect.poll(async()=> (await events(page)).length).toBe(5);expect((await events(page))[4].action).toBe('chat');
 await buttons(page).wake.focus();expect(await page.evaluate(()=>window.inBedFixture.request('button.menu_ok'))).toBe(true);await expect.poll(async()=> (await events(page)).length).toBe(6);expect((await events(page))[5].action).toBe('wake-up');
});
test('closed/reopened sessions reject old handles and disabled/readOnly/hidden/inert reject requests',async({page})=>{
 await open(page);const id=await page.evaluate(()=>window.inBedFixture.retain());for(const flag of['disabled','readOnly','hidden','inert']){await configure(page,{[flag]:true});expect(await page.evaluate(({id})=>window.inBedFixture.request('button.chat',id),{id})).toBe(false);await configure(page,{[flag]:false});}
 await configure(page,{open:false});expect(await page.evaluate(({id})=>window.inBedFixture.request('button.chat',id),{id})).toBe(false);await configure(page,{open:true});expect(await page.evaluate(({id})=>window.inBedFixture.request('button.chat',id),{id})).toBe(false);expect(await page.evaluate(()=>window.inBedFixture.request('button.chat'))).toBe(true);await expect.poll(async()=> (await events(page)).length).toBe(1);
});
test('nested source modal owns input and a pending request cannot outlive a state change',async({page})=>{
 await open(page);const result=await page.evaluate(()=>{const accepted=window.inBedFixture.request('button.chat');window.inBedFixture.configure({nested:true});return accepted;});expect(result).toBe(true);expect(await page.evaluate(()=>window.inBedFixture.request('button.menu_cancel'))).toBe(false);await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));expect(await events(page)).toEqual([]);
 await page.getByRole('dialog',{name:'Nested sleeping'}).getByRole('button',{name:'Leave Bed'}).click();await expect.poll(async()=> (await events(page)).length).toBe(1);expect((await events(page))[0].owner).toBe('nested');await configure(page,{nested:false});expect(await page.evaluate(()=>window.inBedFixture.request('button.chat'))).toBe(true);await expect.poll(async()=> (await events(page)).length).toBe(2);
});
test('a host hint cannot spoof the source buttons for focused controller selection',async({page})=>{await open(page,{fakeHint:true});await page.locator('#hint-control').focus();expect(await page.evaluate(()=>window.inBedFixture.request('button.menu_select'))).toBe(false);expect(await events(page)).toEqual([]);});
test('stable useState controller ref in StrictMode does not loop or reattach on normal status changes',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page,{setterRef:true,strict:true});await page.waitForFunction(()=>!!window.inBedFixture.controller);const id=await page.evaluate(()=>window.inBedFixture.retain());await configure(page,{status:'Updated'});expect(await page.evaluate(({id})=>window.inBedFixture.retained[id]===window.inBedFixture.controller,{id})).toBe(true);await configure(page,{open:false});expect(await page.evaluate(()=>window.inBedFixture.controller)).toBe(null);expect(errors).toEqual([]);
});
test('pressed label moves once, standalone controls reuse source surfaces and forced colors retain native targets',async({page})=>{
 await open(page,{part:'controls'});const b=buttons(page),label=b.wake.locator('.mc-in-bed-button__label'),normal=await label.boundingBox();await b.wake.hover();await page.mouse.down();expect((await label.boundingBox())!.y).toBe(normal!.y+2);await page.mouse.up();await expect.poll(async()=> (await events(page)).length).toBe(1);await page.emulateMedia({forcedColors:'active'});await expect(b.wake.locator('.mc-in-bed-button__skins')).toHaveCSS('display','none');await expect(b.wake).toBeEnabled();
});
test('standalone controls in an underlying native modal reject synthetic clicks beneath a second native modal',async({page})=>{
 await open(page,{part:'controls'});const state=await page.evaluate(()=>{
  const lower=document.createElement('dialog'),upper=document.createElement('dialog');lower.id='lower-native';upper.id='upper-native';
  lower.append(document.getElementById('root')!);document.body.append(lower);lower.showModal();
  upper.innerHTML='<button>Native top</button>';document.body.append(upper);upper.showModal();
  return {modals:document.querySelectorAll('dialog:modal').length,firstContains:document.querySelector('dialog:modal')!.contains(document.querySelector('.mc-in-bed-controls'))};
 });expect(state).toEqual({modals:2,firstContains:true});
 await page.evaluate(()=>window.inBedFixture.refs.wake.current.click());await page.evaluate(()=>new Promise(r=>setTimeout(r,0)));expect(await events(page)).toEqual([]);
});
