import { test, expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrePlayerPermissions, OrePermissionLevelSelect, OrePermissionToggleRow, OrePlayerCard, OreSwitch } from '../src/ore-player-permissions';
import type { OreQASettings } from '../demo/ore-permissions-fixture';

// Independent installed HBUI source03 oracle: 70/128rem viewport, 60rem widget,
// source palette/geometry. Web keyboard/modal contracts are not engine parity.
const root=(p:Page)=>p.locator('#qa-ore-screen');
const card=(p:Page,id:string)=>p.locator(`button[data-player-id="${id}"]`);
const bit=(p:Page,id:string)=>p.locator(`[data-permission-id="${id}"] input`);
const role=(p:Page,id:string)=>p.locator(`button[data-ore-level="${id}"]`);
async function open(p:Page, initial:Partial<OreQASettings>={}){await p.addInitScript(v=>{window.oreQAInitial=v},initial);await p.goto('/demo/ore-permissions-fixture.html?strict');await expect.poll(()=>p.evaluate(()=>!!window.oreQA?.configure&&!!document.querySelector('.mc-ore-player-permissions,.mc-ore-level,.mc-ore-permission-row,.mc-ore-switch,.mc-ore-player-card'))).toBe(true)}
async function set(p:Page,v:Partial<OreQASettings>){await p.evaluate(v=>window.oreQA.configure(v),v)}
async function events(p:Page,kind:string){return p.evaluate(k=>window.oreQA.events.filter(e=>e.kind===k),kind)}
async function clear(p:Page){await p.evaluate(()=>{window.oreQA.events.length=0})}
async function box(l:Locator){const b=await l.boundingBox();expect(b).not.toBeNull();return b!}
const near=(a:number,b:number)=>expect(Math.abs(a-b)).toBeLessThanOrEqual(1/16);

test('five public parts SSR without IO; source units validate and ordinary reserved IDs remain legal',()=>{
  let io=0;const fetch=globalThis.fetch;globalThis.fetch=(()=>{io++;throw Error('SSR IO')}) as typeof fetch;
  try{const props={label:'Host',viewportSize:[1440,900] as const,players:[{id:'constructor',name:'Reserved host'}],permissionOptions:[{id:'toString',title:'Host bit'}],selectedPlayerId:'constructor',value:{}};
    const html=renderToStaticMarkup(createElement(OrePlayerPermissions,props));expect(html).toContain('Reserved host');expect(html).not.toContain('data-permission-id');
    expect(renderToStaticMarkup(createElement(OrePermissionLevelSelect,{viewportSize:[1440,900],value:'member'}))).toContain('Permission Level');
    expect(renderToStaticMarkup(createElement(OrePermissionToggleRow,{title:'Host',checked:false}))).toContain('type="checkbox"');
    expect(renderToStaticMarkup(createElement(OrePlayerCard,{player:{id:'__proto__',name:'Host'}}))).toContain('__proto__');
    expect(renderToStaticMarkup(createElement(OreSwitch,{'aria-label':'Host',checked:true,guiScale:.5}))).toContain('checked');expect(io).toBe(0);
    expect(()=>renderToStaticMarkup(createElement(OreSwitch,{guiScale:0}))).toThrow(RangeError);
    expect(()=>renderToStaticMarkup(createElement(OrePlayerPermissions,{...props,players:[...props.players,...props.players]}))).toThrow();
  }finally{globalThis.fetch=fetch}
});

test('70/128rem source-window branches independently retain4/8 or3/5 columns and source gutters',async({page})=>{
  await open(page,{actualArt:false});
  for(const [w,branch,padding,gutter,left] of [[1279,'tablet',16,4,1/3],[1280,'desktop',24,8,1/3],[699,'narrow',8,2,3/8],[700,'tablet',16,4,1/3]] as const){await set(page,{viewportSize:[w,900]});await expect(root(page)).toHaveAttribute('data-breakpoint',branch);
    const grid=root(page).locator('.mc-ore-player-permissions__grid'),row=root(page).locator('.mc-ore-player-permissions__row'),players=root(page).locator('.mc-ore-player-permissions__players');
    const cs=await grid.evaluate(n=>{const c=getComputedStyle(n);return{padding:parseFloat(c.paddingLeft),max:c.maxWidth,display:c.display,align:c.alignItems,direction:c.flexDirection}});near(cs.padding,padding);expect(cs).toMatchObject({max:'100%',display:'flex',align:'center',direction:'column'});near(await row.evaluate(n=>parseFloat(getComputedStyle(n).maxWidth)),1280);near((await box(players)).width,(await box(row)).width*left);near(await players.evaluate(n=>parseFloat(getComputedStyle(n).paddingLeft)),gutter);
  }
  // The 128u cap belongs to the centered row, including when the wide host exceeds it.
  for(const guiScale of [1,2,5]){await set(page,{viewportSize:[2570,1405],size:[2570,1405],guiScale});const u=5*guiScale,padding=(2570/u>=128?2.4:1.6)*u,g=await box(root(page).locator('.mc-ore-player-permissions__grid')),r=await box(root(page).locator('.mc-ore-player-permissions__row'));near(r.width,Math.min(g.width-2*padding,128*u));near(r.x,g.x+(g.width-r.width)/2)}
  // The panel owns the authored .2u border; minBorder is only a low-scale guard.
  for(const [guiScale,border]of [[1,1],[2,2],[5,5]]as const){await set(page,{guiScale});const widths=await page.locator('.mc-ore-player-permissions__panel').evaluate(n=>{const c=getComputedStyle(n);return[c.borderTopWidth,c.borderRightWidth,c.borderBottomWidth,c.borderLeftWidth].map(parseFloat)});for(const width of widths)near(width,border)}
});

test('explicit safe-zone clamp round and physical bottom inset do not scale or silently fit the embedding frame',async({page})=>{
  await open(page,{viewportSize:[1001,801],size:[900,650],safeArea:{x:.8,y:1.2,positionX:.2,positionY:-.2},extraBottomInset:7,actualArt:false});
  const css=await root(page).evaluate(n=>{const s=getComputedStyle(n);return ['left','right','top','bottom'].map(k=>parseFloat(s.getPropertyValue(`--mc-ore-safe-${k}`)))});
  expect(css).toEqual([100,0,-40,47]);near((await box(root(page))).width,900);near((await box(root(page))).height,650);near((await box(root(page).locator('.mc-ore-player-permissions__nav'))).height,44);
});

test('measured60rem widget threshold is distinct from viewport; desktop narrow uses the same true modal',async({page})=>{
  await open(page,{mode:'level',widgetWidth:800,availableWidth:600,actualArt:false});const level=page.locator('#qa-ore-level');await expect(level).toHaveAttribute('data-presentation','segmented');
  await set(page,{availableWidth:599});await expect(level).toHaveAttribute('data-presentation','modal');near((await box(page.getByRole('button',{name:/Permission Level/}))).height,50);near((await box(page.locator('.mc-ore-level__trigger-shine'))).height,42);
  near(await page.locator('.mc-ore-level__trigger').evaluate(n=>parseFloat(getComputedStyle(n).marginTop)),-4);near(await page.locator('.mc-ore-level__trigger').evaluate(n=>parseFloat(getComputedStyle(n).paddingBottom)),4);
  await page.locator('.mc-ore-level__trigger').click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
  await set(page,{viewportSize:[1279,900],availableWidth:800});await expect(level).toHaveAttribute('data-presentation','modal');near((await box(page.locator('.mc-ore-level__trigger'))).height,48);near((await box(page.locator('.mc-ore-level__trigger-shine'))).height,40);
  await set(page,{viewportSize:[1440,900],availableWidth:undefined,widgetWidth:500});await expect(level).toHaveAttribute('data-presentation','modal');await set(page,{widgetWidth:900});await expect(level).toHaveAttribute('data-presentation','segmented');
});

test('modern card retains5.2rem avatar and two text roles; description row grows beyond6.4rem rather than clipping',async({page})=>{
  await open(page,{mode:'card',actualArt:false});near((await box(page.locator('.mc-ore-player-card__avatar'))).width,52);
  expect(await page.locator('.mc-ore-player-card__name').evaluate(n=>[getComputedStyle(n).fontSize,getComputedStyle(n).lineHeight])).toEqual(['16px','20px']);expect(await page.locator('.mc-ore-player-card__subtitle').evaluate(n=>getComputedStyle(n).fontSize)).toBe('14px');
  await set(page,{mode:'row',widgetWidth:640,rowDescription:'Short description'});near((await box(page.locator('#qa-ore-row'))).height,64);await set(page,{rowDescription:'A long host description that must wrap naturally. '.repeat(20)});expect((await box(page.locator('#qa-ore-row'))).height).toBeGreaterThan(100);
});

test('real label forwards exactly one toggle; controlled refusal restores native checked state and host veto wins',async({page})=>{
  await open(page,{mode:'row',accept:false,actualArt:false});const input=page.getByRole('checkbox');await page.getByText('Host row title',{exact:true}).click();await expect(input).not.toBeChecked();expect((await events(page,'row')).map(e=>e.value)).toEqual([true]);
  await set(page,{accept:true});await page.getByText('Host row title',{exact:true}).click();await expect(input).toBeChecked();expect((await events(page,'row'))).toHaveLength(2);
  await clear(page);await set(page,{preventClick:true});await page.getByText('Host row title',{exact:true}).click();await expect(input).toBeChecked();expect(await events(page,'row')).toHaveLength(0);
});

test('role requests leave all permission bits intact; rejected host leaves accepted role and player unchanged',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await open(page,{accept:false,acceptPlayer:false,actualArt:false,viewportSize:[1279,900]});await card(page,'bex').click();await expect(card(page,'ada')).toHaveAttribute('aria-pressed','true');expect(await events(page,'player')).toHaveLength(1);
  await page.locator('.mc-ore-level__trigger').click();await role(page,'operator').click();await expect(page.locator('.mc-ore-level__trigger')).toContainText('Member');const request=(await events(page,'value'))[0]!;expect((request.value as Record<string,{level:string;permissions:Record<string,boolean>}>).ada).toEqual({level:'operator',permissions:{build:true,mine:false,doors:true,containers:false,attackPlayers:true,attackMobs:false,commands:true,teleport:false}});
});

test('bit request does not synthesize Custom and host pending confirmation declines or accepts explicitly',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await open(page,{defer:true,actualArt:false});await bit(page,'build').click();await expect(page.locator('#ore-host-pending')).toBeVisible();await expect(bit(page,'build')).toBeChecked();await page.locator('#ore-decline').click();await expect(bit(page,'build')).toBeChecked();
  await bit(page,'build').click();await page.locator('#ore-confirm').click();await expect(bit(page,'build')).not.toBeChecked();expect(await page.evaluate(()=>window.oreQA.settings.value.ada!.level)).toBe('member');expect((await events(page,'value'))).toHaveLength(2);
});

test('readOnly allows player selection and Back but blocks edits and Kick; hosting and visibility are independent host flags',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await open(page,{readOnly:true,actualArt:false});await card(page,'bex').click();await expect(card(page,'bex')).toHaveAttribute('aria-pressed','true');await bit(page,'build').click();expect(await events(page,'value')).toHaveLength(0);await expect(page.getByRole('button',{name:'Kick Player',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Back',exact:true}).click();expect(await events(page,'back')).toHaveLength(1);
  await set(page,{readOnly:false,selected:'ada',hosting:true});await expect(page.getByRole('button',{name:'Kick Player',exact:true})).toHaveCount(0);await set(page,{hosting:false});await page.getByRole('button',{name:'Kick Player',exact:true}).click();expect((await events(page,'kick'))[0]!.value).toBe('ada');await set(page,{kickVisible:false});await expect(page.getByRole('button',{name:'Kick Player',exact:true})).toHaveCount(0);
});

test('reserved string IDs never inherit missing player states or permission bits; refs clean up on unmount',async({page})=>{
  await open(page,{reserved:true,selected:'constructor',value:{},actualArt:false});await expect(page.getByTestId('ore-empty')).toBeVisible();await expect(page.locator('[data-permission-id]')).toHaveCount(0);
  await set(page,{value:JSON.parse('{"constructor":{"level":"member","permissions":{}}}')});await expect(bit(page,'toString')).toBeDisabled();await expect(bit(page,'__proto__')).not.toBeChecked();expect(await events(page,'value')).toHaveLength(0);
  expect(await page.evaluate(()=>[window.oreQA.ref?.tagName,Reflect.get(window.oreQA.playerRefs,'constructor')?.tagName,Reflect.get(window.oreQA.permissionRefs,'__proto__')?.tagName])).toEqual(['SECTION','BUTTON','INPUT']);await page.evaluate(()=>window.oreQA.unmount());await expect(root(page)).toHaveCount(0);expect(await page.evaluate(()=>[window.oreQA.ref,window.oreQA.playersRef,window.oreQA.permissionsRef,Reflect.get(window.oreQA.playerRefs,'constructor'),Reflect.get(window.oreQA.permissionRefs,'__proto__')])).toEqual([null,null,null,null,null]);
});

test('modal makes external body siblings inert, traps focus, roves without commit and returns to trigger',async({page})=>{
  await open(page,{mode:'level',availableWidth:500,accept:false,actualArt:false});const trigger=page.locator('.mc-ore-level__trigger');await trigger.click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();expect(await page.locator('#ore-before').evaluate(n=>(n as HTMLElement).inert||!!n.closest('[inert]'))).toBe(true);
  await role(page,'member').focus();await page.keyboard.press('End');await expect(role(page,'custom')).toBeFocused();expect(await events(page,'level')).toHaveLength(0);await page.keyboard.press('Enter');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();await expect(trigger).toContainText('Member');
  await trigger.click();for(let i=0;i<8;i++){await page.keyboard.press('Tab');expect(await dialog.evaluate(n=>n.contains(document.activeElement))).toBe(true)}await page.keyboard.press('Escape');await expect(trigger).toBeFocused();expect(await page.locator('#ore-before').evaluate(n=>(n as HTMLElement).inert)).toBe(false);
});

test('source desktop-small focuses accepted role while compact defaults to first enabled without changing the check',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await open(page,{mode:'level',availableWidth:500,widgetWidth:640,viewportSize:[1440,1000],level:'operator',accept:false,actualArt:false});
  // Source GZ explicitly requests selected focus; compact jZ omits it. The
  // first-enabled fallback is the bounded Web policy corroborated by the native
  // compact observation, not a recovered universal engine focus-memory rule.
  for(const [viewportSize,focus]of [[[1440,1000],'operator'],[[1279,1000],'visitor']]as const){await set(page,{viewportSize});await page.locator('.mc-ore-level__trigger').focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();await expect(role(page,focus)).toBeFocused();await expect(role(page,'operator')).toHaveAttribute('aria-checked','true');await expect(role(page,focus)).toHaveCSS('background-color','rgb(88, 88, 90)');expect(await role(page,focus).evaluate(n=>{const s=getComputedStyle(n,'::after');return{visible:n.matches(':focus-visible'),border:s.borderTopWidth,color:s.borderTopColor,edges:[s.top,s.right,s.bottom,s.left],outline:getComputedStyle(n).outlineStyle}})).toEqual({visible:true,border:'2px',color:'rgb(255, 255, 255)',edges:['0px','0px','0px','0px'],outline:'none'});expect(await events(page,'level')).toHaveLength(0);await page.keyboard.press('Escape');await expect(page.locator('.mc-ore-level__trigger')).toBeFocused()}
});

test('trigger mouse history stays separate from keyboard focus and modal-open state',async({page})=>{
  await open(page,{mode:'level',viewportSize:[1279,1000],availableWidth:500,widgetWidth:640,level:'member',accept:false,actualArt:false});
  const trigger=page.locator('.mc-ore-level__trigger'),shine=trigger.locator('.mc-ore-level__trigger-shine');await page.mouse.move(1,1);
  await trigger.focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();await expect(trigger).toHaveAttribute('data-hovered','false');await expect(shine).toHaveCSS('background-color','rgb(208, 209, 212)');await page.keyboard.press('Escape');
  // Ld consumes mouse events rather than treating open/focus as hovered. Replay
  // that explicit input history without forcing pseudo classes or visual CSS.
  await trigger.dispatchEvent('mousemove');await expect(trigger).toHaveAttribute('data-hovered','true');await trigger.evaluate(n=>(n as HTMLButtonElement).click());await expect(page.getByRole('dialog')).toBeVisible();await expect(trigger).toHaveAttribute('data-hovered','true');await expect(shine).toHaveCSS('background-color','rgb(177, 178, 181)');
  await trigger.evaluate(n=>n.dispatchEvent(new MouseEvent('mouseout',{bubbles:true,relatedTarget:document.body})));await expect(trigger).toHaveAttribute('data-hovered','false');await expect(shine).toHaveCSS('background-color','rgb(208, 209, 212)');await page.keyboard.press('Escape');expect(await events(page,'level')).toHaveLength(0);
  await trigger.dispatchEvent('mousemove');await set(page,{viewportSize:[2570,1000],availableWidth:800});await expect(page.locator('.mc-ore-level')).toHaveAttribute('data-presentation','segmented');await set(page,{viewportSize:[1279,1000],availableWidth:500});await expect(trigger).toHaveAttribute('data-hovered','false');
  await set(page,{disabled:true});await trigger.dispatchEvent('mousemove');await expect(trigger).toHaveAttribute('data-hovered','false');
});

test('long modal remains bounded and scrollable after resize; compact trigger does not invent platform glyphs',async({page})=>{
  await page.setViewportSize({width:800,height:600});await open(page,{mode:'level',viewportSize:[800,600],availableWidth:400,widgetWidth:480,longText:true,actualArt:false});await page.locator('.mc-ore-level__trigger').click();const dialog=page.getByRole('dialog');expect((await box(dialog)).width).toBeLessThanOrEqual(476+1/16);await expect(dialog.getByRole('radio')).toHaveCount(4);await page.setViewportSize({width:600,height:400});await set(page,{viewportSize:[600,400]});expect((await box(dialog)).height).toBeLessThanOrEqual(400);expect(await dialog.locator('.mc-ore-scroll__viewport').evaluate(n=>n.scrollHeight>=n.clientHeight)).toBe(true);
  // Source DY measures the unsnapped parent, then quantizes only overflow.
  // Source04 qm has a separate normal-flow .2u lower-shadow sibling. At u10:
  // chrome24 wrapper +48 header +2 shadow +4 border physical px. BY's separate
  // final .2u rule remains in natural rows; it does not subtract capacity twice.
  for(const height of [160,100]){await page.setViewportSize({width:600,height});await set(page,{viewportSize:[600,height]});const capacity=height-24-48-2-4,cap=Math.max(0,Math.floor(capacity/48)*48-24);await expect.poll(async()=>parseFloat(await dialog.locator('.mc-ore-level__menu-quantized').evaluate(n=>getComputedStyle(n).maxHeight))).toBe(cap);near((await box(dialog.locator('.mc-ore-level__menu-bound'))).height,capacity);near((await box(dialog.locator('.mc-ore-scroll__viewport'))).height,cap)}
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
});

test('player roving and source-pane scrolling do not commit selection; End reveals last host row',async({page})=>{
  await open(page,{actualArt:false});await card(page,'ada').focus();await page.keyboard.press('End');await expect(card(page,'extra-13')).toBeFocused();await expect(card(page,'ada')).toHaveAttribute('aria-pressed','true');expect(await events(page,'player')).toHaveLength(0);expect(await page.evaluate(()=>window.oreQA.playersRef!.scrollTop)).toBeGreaterThan(0);expect(await page.evaluate(()=>window.oreQA.permissionsRef!.scrollTop)).toBe(0);await page.keyboard.press('Enter');await expect(card(page,'extra-13')).toHaveAttribute('aria-pressed','true');
});

test('new Ore mouse rail uses physical40/16 minima direct jumps retained grab offset and removes drag listeners on unmount',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await open(page,{actualArt:false});
  for(const height of [160,100]){await set(page,{size:[1000,height]});const viewport=root(page).locator('[data-ore-pane="players"] .mc-ore-scroll__viewport'),bar=root(page).locator('[data-ore-pane="players"] .mc-ore-scroll__bar'),thumb=bar.locator('.mc-ore-scroll__thumb');await expect(bar).toBeVisible();
    const metric=await viewport.evaluate(n=>({h:n.clientHeight,content:n.scrollHeight})),extent=metric.h-16,expected=Math.min(extent,Math.max(metric.h>52?40:16,metric.h*metric.h/metric.content-16));near((await box(thumb)).height,expected);near((await box(bar)).width,12);near((await box(bar.locator('.mc-ore-scroll__track'))).width,4);expect(expected).toBe(metric.h>52?40:16);
  }
  await set(page,{size:[1000,700]});const viewport=root(page).locator('[data-ore-pane="players"] .mc-ore-scroll__viewport'),bar=root(page).locator('[data-ore-pane="players"] .mc-ore-scroll__bar'),thumb=bar.locator('.mc-ore-scroll__thumb');let rail=await box(bar);const range=await viewport.evaluate(n=>n.scrollHeight-n.clientHeight);
  await page.mouse.click(rail.x+rail.width/2,rail.y+rail.height*.75);expect(Math.abs(await viewport.evaluate(n=>n.scrollTop)-range*.75)).toBeLessThanOrEqual(1);
  await page.evaluate(()=>{const types=new Set(['pointermove','pointerup','pointercancel']),live=new Map<string,Set<EventListenerOrEventListenerObject>>(),add=document.addEventListener,remove=document.removeEventListener;const state={active:()=>[...live.values()].reduce((n,s)=>n+s.size,0),added:0,removed:0,restore:()=>{document.addEventListener=add;document.removeEventListener=remove}};Object.defineProperty(window,'oreDragListeners',{value:state,configurable:true});Object.defineProperty(document,'addEventListener',{configurable:true,writable:true,value:function(type:string,listener:EventListenerOrEventListenerObject,options?:AddEventListenerOptions|boolean){if(types.has(type)){let set=live.get(type);if(!set)live.set(type,set=new Set());set.add(listener);state.added++}return add.call(document,type,listener,options)}});Object.defineProperty(document,'removeEventListener',{configurable:true,writable:true,value:function(type:string,listener:EventListenerOrEventListenerObject,options?:EventListenerOptions|boolean){if(types.has(type)){live.get(type)?.delete(listener);state.removed++}return remove.call(document,type,listener,options)}})});
  rail=await box(bar);const handle=await box(thumb),grab=3;await page.mouse.move(handle.x+handle.width/2,handle.y+grab);await page.mouse.down();const target=rail.y+rail.height*.4;await page.mouse.move(handle.x+handle.width/2,target);const expected=Math.max(0,Math.min(1,(target-rail.y-grab)/(rail.height-handle.height)))*range;expect(Math.abs(await viewport.evaluate(n=>n.scrollTop)-expected)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(()=>Reflect.get(window,'oreDragListeners').active())).toBe(3);await page.evaluate(()=>window.oreQA.unmount());await expect(root(page)).toHaveCount(0);expect(await page.evaluate(()=>{const s=Reflect.get(window,'oreDragListeners');return[s.active(),s.added,s.removed]})).toEqual([0,3,3]);await page.mouse.up();await page.evaluate(()=>Reflect.get(window,'oreDragListeners').restore());
});

test('caller root keyboard veto, composition and modifiers prevent internal Escape or roving actions',async({page})=>{
  await open(page,{preventKeys:['Escape','End'],actualArt:false});await card(page,'ada').focus();await page.keyboard.press('End');await expect(card(page,'ada')).toBeFocused();await page.keyboard.press('Escape');expect(await events(page,'back')).toHaveLength(0);expect((await events(page,'key')).filter(e=>e.value==='Escape')).toHaveLength(1);
  await set(page,{preventKeys:[]});await card(page,'ada').dispatchEvent('keydown',{key:'Escape',keyCode:229,isComposing:true});await card(page,'ada').dispatchEvent('keydown',{key:'Escape',ctrlKey:true});expect(await events(page,'back')).toHaveLength(0);await set(page,{preventCaptureKeys:['Escape']});await page.keyboard.press('Escape');expect(await events(page,'back')).toHaveLength(0);await set(page,{preventCaptureKeys:[]});await page.keyboard.press('Escape');expect(await events(page,'back')).toHaveLength(1);
});

test('empty/null host state is stable and disabled controls emit no requests; forced colors preserves checkbox semantics',async({page})=>{
  await open(page,{selected:null,actualArt:false});await expect(page.getByTestId('ore-empty')).toBeVisible();expect(await events(page,'player')).toHaveLength(0);await set(page,{empty:true});await expect(page.locator('[data-player-id]')).toHaveCount(0);await set(page,{mode:'switch',disabled:true});await expect(page.getByRole('checkbox')).toBeDisabled();await page.emulateMedia({forcedColors:'active'});await expect(page.getByRole('checkbox')).toHaveAccessibleName('Host native switch');await set(page,{disabled:false});await page.getByRole('checkbox').focus();await page.keyboard.press('Space');await expect(page.getByRole('checkbox')).toBeChecked();expect(await events(page,'switch')).toHaveLength(1);
});

test('actual touch activates a native checkbox once and touch input branch uses overlay scrollbar',async({page,isMobile})=>{
  test.skip(!isMobile,'Requires the mobile project real touch-enabled browser');await open(page,{mode:'row',actualArt:false,scrollInputMode:'touch'});await page.getByText('Host row title',{exact:true}).tap();await expect(page.getByRole('checkbox')).toBeChecked();expect(await events(page,'row')).toHaveLength(1);await set(page,{mode:'full'});await expect(page.locator('.mc-ore-scroll__touch').first()).toBeAttached();await expect(page.getByRole('scrollbar')).toHaveCount(0);
});

test('actual English glyphs use caller-loaded Ten and Seven fonts rather than family declarations alone',async({page,browserName})=>{
  test.skip(browserName!=='chromium','CDP platform-font evidence requires Chromium');await open(page);const flags=await page.evaluate(()=>window.oreQA.fonts);test.skip(!flags.ten||!flags.seven,'Caller-owned installed font resources are not prepared');await page.evaluate(()=>document.fonts.ready);const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const doc=await cdp.send('DOM.getDocument');const evidence=[];
  for(const [selector,family] of [['#qa-ore-screen h1','Ten'],['.mc-ore-player-card__name','Seven']] as const){const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector});const result=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});evidence.push({selector,...result});expect(result.fonts.some(f=>f.isCustomFont&&f.glyphCount>0&&f.familyName.includes(family)),JSON.stringify(result)).toBe(true)}await test.info().attach('actual-platform-fonts.json',{body:JSON.stringify(evidence,null,2),contentType:'application/json'});await cdp.detach();
});


// Optional fallback strut is a bounded Web font-metrics policy. These tests do not
// claim Coherent BASE selection, actual fallback glyph advances, or native RGBA0.
test('linebox default and explicit primary keep the original plain-text DOM and geometry',async({page})=>{
  await open(page,{mode:'row',lineboxCopy:'mixed',rowDescription:'Host QA 世界说明',actualArt:false});await page.evaluate(()=>document.fonts.ready);
  const row=page.locator('#qa-ore-row'),title=row.locator('.mc-ore-permission-row__title');const before=await row.innerHTML(),rect=await box(row);expect(await title.evaluate(n=>n.childNodes.length===1&&n.firstChild?.nodeType===Node.TEXT_NODE)).toBe(true);await expect(row.locator('[data-ore-linebox-ink]')).toHaveCount(0);
  await set(page,{textLineBox:'primary'});expect(await row.innerHTML()).toBe(before);expect(await box(row)).toEqual(rect);await expect(row.locator('[data-ore-text-linebox]')).toHaveCount(0);
  await set(page,{lineboxCopy:undefined,rowDescription:'Latin only text',textLineBox:'fallback'});await expect(row.locator('[data-ore-linebox-ink]')).toHaveCount(0);await expect(title).toHaveText('Host row title');
});

test('fallback string strut handles long CJK and mixed runs at gui1/2/5 without changing native refs or supplied text',async({page})=>{
  await open(page,{mode:'row',actualArt:false,accept:false});
  for(const guiScale of [1,2,5])for(const copy of ['cjk','mixed'] as const){const description=(copy==='cjk'?'权限说明包含世界方块与玩家操作。':'Host QA mixed 玩家权限 and blocks. ').repeat(10);await set(page,{guiScale,widgetWidth:52*5*guiScale+80,lineboxCopy:copy,rowDescription:description,textLineBox:'primary'});await page.evaluate(()=>document.fonts.ready);const row=page.locator('#qa-ore-row'),parent=row.locator('.mc-ore-permission-row__description'),input=row.getByRole('checkbox'),width=(await box(parent)).width;await input.evaluate(n=>Reflect.set(window,'lineboxNativeInput',n));
    await set(page,{textLineBox:'fallback'});await expect(parent).toHaveText(description);expect(await parent.evaluate((n,value)=>n.textContent===value,description)).toBe(true);await expect(parent).toHaveAttribute('data-ore-text-linebox','fallback');const ink=parent.locator(':scope > [data-ore-linebox-ink="seven"]');await expect(ink).toHaveCount(1);await expect(ink).toHaveCSS('line-height','0px');expect(await ink.evaluate(n=>getComputedStyle(n).fontFamily)).toContain('Minecraft Seven v2');near((await box(parent)).width,width);expect((await box(parent)).height).toBeGreaterThanOrEqual(2*10*guiScale);expect(await parent.evaluate(n=>getComputedStyle(n).lineHeight)).toBe(`${10*guiScale}px`);expect(await input.evaluate(n=>n===Reflect.get(window,'lineboxNativeInput')&&n===window.oreQA.inputRef)).toBe(true);
    expect(await input.evaluate(n=>{const input=n as HTMLInputElement;return input.labels?.[0]?.htmlFor===input.id})).toBe(true);await row.locator('.mc-ore-permission-row__title').click();await expect(input).not.toBeChecked();
  }
});

test('fallback leaves rich ReactNodes unflattened and preserves native label click/ref and controlled refusal',async({page})=>{
  await open(page,{mode:'row',lineboxCopy:'rich',textLineBox:'fallback',accept:false,actualArt:false});const row=page.locator('#qa-ore-row'),input=row.getByRole('checkbox'),action=page.getByRole('button',{name:'说明动作',exact:true});await expect(row.locator('[data-ore-linebox-ink]')).toHaveCount(0);expect(await page.getByTestId('linebox-rich-title').evaluate(n=>n.tagName)).toBe('STRONG');await expect(page.getByTestId('linebox-rich-description').locator('em')).toHaveText('强调');expect(await action.evaluate(n=>n===window.oreQA.richRef)).toBe(true);await action.click();expect(await events(page,'rich-action')).toHaveLength(1);expect(await events(page,'row')).toHaveLength(0);await expect(input).not.toBeChecked();
  await input.evaluate(n=>Reflect.set(window,'richNativeInput',n));await page.getByTestId('linebox-rich-title').click();expect((await events(page,'row')).map(e=>e.value)).toEqual([true]);await expect(input).not.toBeChecked();await set(page,{textLineBox:'primary'});expect(await input.evaluate(n=>n===Reflect.get(window,'richNativeInput')&&n===window.oreQA.inputRef)).toBe(true);expect(await action.evaluate(n=>n===window.oreQA.richRef)).toBe(true);await action.click();expect(await events(page,'rich-action')).toHaveLength(2);await set(page,{mode:'card',textLineBox:'fallback'});await expect(page.getByTestId('linebox-rich-subtitle')).toHaveText('Member 管理员');expect(await page.getByTestId('linebox-rich-subtitle').evaluate(n=>n.tagName)).toBe('EM');await expect(page.locator('.mc-ore-player-card__subtitle [data-ore-linebox-ink]')).toHaveCount(0);await page.evaluate(()=>window.oreQA.unmount());expect(await page.evaluate(()=>[window.oreQA.inputRef,window.oreQA.richRef,window.oreQA.cardRef])).toEqual([null,null,null]);
});

test('page propagates fallback roles to card and live modal portal while native buttons and controlled rejection stay intact',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await open(page,{lineboxCopy:'mixed',textLineBox:'fallback',actualArt:false,accept:false,viewportSize:[1279,900]});const header=root(page).locator('h1'),name=card(page,'ada').locator('.mc-ore-player-card__name');await expect(header.locator('[data-ore-linebox-ink="ten"]')).toHaveCount(1);await expect(name.locator('[data-ore-linebox-ink="seven"]')).toHaveCount(1);const trigger=page.locator('.mc-ore-level__trigger');await trigger.focus();await page.keyboard.press('Enter');const modal=page.getByRole('dialog');await expect(modal).toBeVisible();await expect(modal.locator('.mc-ore-level__modal-header [data-ore-linebox-ink="seven"]')).toHaveCount(1);const option=role(page,'operator');await expect(option.locator('[data-ore-linebox-ink="seven"]')).toHaveCount(1);await option.focus();await option.evaluate(n=>Reflect.set(window,'lineboxPortalOption',n));
  await set(page,{textLineBox:'primary'});await expect(modal.locator('[data-ore-linebox-ink]')).toHaveCount(0);await expect(option).toBeFocused();expect(await option.evaluate(n=>n===Reflect.get(window,'lineboxPortalOption'))).toBe(true);await set(page,{textLineBox:'fallback'});await expect(option.locator('[data-ore-linebox-ink="seven"]')).toHaveCount(1);await page.keyboard.press('Enter');await expect(modal).toBeHidden();await expect(trigger).toBeFocused();expect((await events(page,'value'))).toHaveLength(1);expect(await page.evaluate(()=>window.oreQA.settings.value.ada!.level)).toBe('member');
});

test('fallback stays usable with unavailable primary font families without certifying font pixels',async({page})=>{
  await open(page,{mode:'row',lineboxCopy:'mixed',rowDescription:'Host font absent 世界说明',lineboxFontless:true,textLineBox:'fallback',actualArt:false});const row=page.locator('#qa-ore-row'),ink=row.locator('.mc-ore-permission-row__title>[data-ore-linebox-ink="seven"]');await expect(ink).toHaveText('Host QA 建造');const family=await ink.evaluate(n=>getComputedStyle(n).fontFamily);expect(family).toContain('QA unavailable Seven');expect(family).not.toContain('Minecraft Seven v2');expect((await box(ink)).width).toBeGreaterThan(0);await row.locator('.mc-ore-permission-row__title').click();await expect(row.getByRole('checkbox')).toBeChecked();expect(await events(page,'row')).toHaveLength(1);await expect(row.getByRole('checkbox')).toHaveAccessibleName('Host row permission');
});

test('linebox SSR default is unchanged and invalid policies reject without IO or rewriting rich arrays/fragments',()=>{
  const fetch=globalThis.fetch;let io=0;globalThis.fetch=(()=>{io++;throw Error('Unexpected linebox SSR IO')}) as typeof fetch;const viewportSize=[1440,900] as const;
  try{const row={title:'建造',description:'Host 世界',checked:false};expect(renderToStaticMarkup(createElement(OrePermissionToggleRow,row))).toBe(renderToStaticMarkup(createElement(OrePermissionToggleRow,{...row,textLineBox:'primary'})));const html=renderToStaticMarkup(createElement(OrePermissionToggleRow,{...row,textLineBox:'fallback'}));expect(html).toContain('data-ore-linebox-ink="seven"');
    const fragment=createElement(Fragment,null,'富文本',createElement('em',null,'QA'));const rich=renderToStaticMarkup(createElement(OrePermissionToggleRow,{title:fragment,description:['甲',createElement('strong',{key:'strong'},'乙')],textLineBox:'fallback'}));expect(rich).toContain('<em>QA</em>');expect(rich).toContain('<strong>乙</strong>');expect(rich).not.toContain('data-ore-linebox-ink');for(const title of ['カタカナ','한국어','𠀀']){const other=renderToStaticMarkup(createElement(OrePermissionToggleRow,{title,textLineBox:'fallback'}));expect(other).not.toContain('data-ore-linebox-ink')}for(const [locale,family]of [['ja_JP','Noto Sans JP'],['ko_KR','Noto Sans KR'],['ar_SA','Noto Sans AR']]as const){const localized=renderToStaticMarkup(createElement(OrePermissionToggleRow,{title:'世界',locale,textLineBox:'fallback'}));expect(localized).toContain(`--mc-ore-fallback:&quot;${family}&quot;`);expect(localized).toContain('data-ore-linebox-ink="seven"')}const invalid=JSON.parse('"invented-policy"');
    for(const run of [()=>createElement(OrePermissionToggleRow,{...row,textLineBox:invalid}),()=>createElement(OrePlayerCard,{player:{id:'qa',name:'玩家'},textLineBox:invalid}),()=>createElement(OrePermissionLevelSelect,{viewportSize,textLineBox:invalid}),()=>createElement(OrePlayerPermissions,{label:'Host',players:[],permissionOptions:[],viewportSize,textLineBox:invalid})])expect(()=>renderToStaticMarkup(run())).toThrow(TypeError);expect(io).toBe(0);
  }finally{globalThis.fetch=fetch}
});
