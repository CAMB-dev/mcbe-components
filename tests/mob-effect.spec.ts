import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { MobEffectFixtureSettings } from '../demo/mob-effect-fixture';
import type { MobEffectControllerCommand } from '../src/mob-effect-types';

const browserErrors=new WeakMap<Page,string[]>();
const root=(page:Page)=>page.locator('.mc-mob-effect-screen');
const viewport=(page:Page)=>page.getByRole('region',{name:'Effect list',exact:true});
const close=(page:Page)=>page.getByRole('button',{name:'Close effects',exact:true});
async function configure(page:Page,patch:Partial<MobEffectFixtureSettings>){await page.evaluate(value=>window.__mobEffectQA.configure(value),patch);}
async function clear(page:Page){await page.evaluate(()=>window.__mobEffectQA.clear());}
/** FIFO owner-window checkpoint after native propagation. In particular, zero
 * receipt assertions wait for the pending request decision, not an arbitrary delay. */
async function ownerTask(page:Page){await page.evaluate(()=>new Promise<void>(resolve=>window.setTimeout(()=>queueMicrotask(resolve),0)));}
async function receipts(page:Page){await ownerTask(page);return page.evaluate(()=>window.__mobEffectQA.getReceipts());}
async function request(page:Page,command:MobEffectControllerCommand){return page.evaluate(value=>window.__mobEffectQA.request(value),command);}

test.beforeEach(async({page})=>{
  const errors:string[]=[];browserErrors.set(page,errors);page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/demo/mob-effect-fixture.html');
  await expect.poll(()=>page.evaluate(()=>!!window.__mobEffectQA?.getRefs().controller)).toBe(true);
  await expect(viewport(page)).toBeVisible();
});
test.afterEach(async({page})=>{expect(browserErrors.get(page)).toEqual([]);});

test('real source rows retain fixed geometry, ambient timer and original material routes',async({page})=>{
  await expect(page.getByRole('listitem')).toHaveCount(12);
  await expect(page.locator('[data-ambient="true"] .mc-mob-effect-row__timer').first()).toHaveText('1:07');
  await expect(page.getByRole('scrollbar')).toBeVisible();
  const geometry=await page.evaluate(()=>{
    const box=(selector:string)=>{const r=document.querySelector(selector)!.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
    const effectIcon=document.querySelector('.mc-mob-effect-row__icon')!;
    return{root:box('.mc-mob-effect-screen'),close:box('.mc-mob-effect-screen__close'),row:box('.mc-mob-effect-row'),name:box('.mc-mob-effect-row__name'),icon:box('.mc-mob-effect-row__icon'),rail:box('.mc-scrollbar'),
      iconSource:getComputedStyle(effectIcon).backgroundImage,ambientSource:Array.from(document.querySelectorAll('[data-ambient="true"] .mc-mob-effect-skin__patch')).map(node=>getComputedStyle(node).backgroundImage)};
  });
  expect([geometry.root.width,geometry.root.height]).toEqual([800,400]);
  expect([geometry.close.x-geometry.root.x,geometry.close.y-geometry.root.y]).toEqual([728,15]);
  expect([geometry.row.width,geometry.row.height]).toEqual([480,60]);
  expect(geometry.name.x-geometry.row.x).toBe(54);
  expect([geometry.icon.width,geometry.icon.height]).toEqual([36,36]);
  expect([geometry.rail.width,geometry.rail.height]).toEqual([24,344]);
  expect(geometry.iconSource).toContain('data:image/png');
  expect(geometry.ambientSource.some(value=>value.includes('effect_background_ambient.png'))).toBe(true);
  expect(await page.evaluate(()=>{const r=window.__mobEffectQA.getRefs();return{root:r.root===document.querySelector('.mc-mob-effect-screen'),viewport:r.viewport===document.querySelector('.mc-scroll-area__viewport'),close:r.close===document.querySelector('.mc-mob-effect-screen__close'),row:r.row0===document.querySelector('[data-effect-id="e0"]'),controller:typeof r.controller?.request==='function'};})).toEqual({root:true,viewport:true,close:true,row:true,controller:true});
});

test('ordered entries and declared empty grid space do not create or resize effects',async({page})=>{
  await page.evaluate(()=>window.__mobEffectQA.configure({effects:[
    {id:'last-first',name:'Last first',timer:'∞',ambient:true,icon:{kind:'known-effect',effect:'haste'}},
    {id:'other',name:'Other',timer:'0:07',ambient:false,icon:{kind:'none'}}],gridDimensions:[1,6]}));
  expect(await page.getByRole('listitem').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-effect-id')))).toEqual(['last-first','other']);
  await expect(page.locator('.mc-mob-effect-row__timer').first()).toHaveText('∞');
  await configure(page,{effects:[],gridDimensions:[1,4]});
  await expect(page.getByRole('listitem')).toHaveCount(0);
  const extent=await page.evaluate(()=>({grid:document.querySelector('.mc-mob-effect-list__grid')!.getBoundingClientRect().height,
    viewport:window.__mobEffectQA.getRefs().viewport!.getBoundingClientRect().width}));
  expect(extent).toEqual({grid:240,viewport:696});
});

test('native scroll viewport moves collection and keeps the browser scrollbar hidden',async({page})=>{
  const before=await page.locator('.mc-mob-effect-row').first().boundingBox();
  await viewport(page).evaluate(node=>{node.scrollTop=100;});
  await expect.poll(()=>viewport(page).evaluate(node=>node.scrollTop)).toBe(100);
  const after=await page.locator('.mc-mob-effect-row').first().boundingBox();
  expect(before!.y-after!.y).toBe(100);
  expect(await viewport(page).evaluate(node=>({bar:getComputedStyle(node).scrollbarWidth,overflow:getComputedStyle(node).overflowY,max:node.scrollHeight-node.clientHeight})))
    .toMatchObject({bar:'none',overflow:'auto'});
  expect(await viewport(page).evaluate(node=>node.scrollHeight>node.clientHeight)).toBe(true);
});

test('actual wheel and PageDown scroll only the source viewport while focus preserves fixed bounds',async({page})=>{
  await viewport(page).hover();await page.mouse.wheel(0,170);
  await expect.poll(()=>viewport(page).evaluate(node=>node.scrollTop)).toBeGreaterThan(0);
  const before=await viewport(page).evaluate(node=>({scroll:node.scrollTop,top:node.getBoundingClientRect().top}));
  await viewport(page).focus();
  expect(await viewport(page).evaluate(node=>node.getBoundingClientRect().top)).toBe(before.top);
  expect(await page.evaluate(()=>[window.__mobEffectQA.getRefs().root!.scrollTop,document.querySelector('.mc-mob-effect-list')!.scrollTop])).toEqual([0,0]);
  await page.keyboard.press('PageDown');
  await expect.poll(()=>viewport(page).evaluate(node=>node.scrollTop)).toBeGreaterThan(before.scroll);
  expect(await page.evaluate(()=>[window.__mobEffectQA.getRefs().root!.scrollTop,document.querySelector('.mc-mob-effect-list')!.scrollTop])).toEqual([0,0]);
});

test('trusted close click respects late document veto and a separate accepted click requests host navigation',async({page})=>{
  // Give the host's physical frame a visible close control on both viewports.
  // The default800px geometry fixture is separately tested at full size.
  await configure(page,{availableSize:[360,200],scale:1});
  await page.evaluate(()=>window.__mobEffectQA.setDocumentVeto(true));
  await close(page).click();expect(await receipts(page)).toEqual([]);
  expect(await page.evaluate(()=>window.__mobEffectQA.getNativeEvents().at(-1))).toMatchObject({type:'click',trusted:true,cancelable:true,prevented:true});
  await page.evaluate(()=>window.__mobEffectQA.setDocumentVeto(false));await clear(page);await close(page).click();
  expect(await receipts(page)).toEqual([expect.objectContaining({reason:'continue',origin:'close-button',target:'button.menu_continue',event:true,trusted:true,currentTag:'BUTTON',controlTag:'BUTTON',currentMatchesControl:true})]);
  await expect(page.locator('#close-status')).toHaveText('Requested continue via close-button');
  await expect(root(page)).toBeVisible();
});

test('trusted Escape survives a hidden close button but remains subject to document veto',async({page})=>{
  await configure(page,{closeButtonVisible:false});await expect(close(page)).toHaveCount(0);
  await page.evaluate(()=>window.__mobEffectQA.setDocumentVeto(true));await root(page).focus();await page.keyboard.press('Escape');
  expect(await receipts(page)).toEqual([]);
  expect(await page.evaluate(()=>window.__mobEffectQA.getNativeEvents().at(-1))).toMatchObject({type:'keydown',key:'Escape',trusted:true,cancelable:true,prevented:true});
  await page.evaluate(()=>window.__mobEffectQA.setDocumentVeto(false));await clear(page);await page.keyboard.press('Escape');
  expect(await receipts(page)).toEqual([expect.objectContaining({reason:'continue',origin:'escape',target:'button.menu_continue',fromButtonId:'button.menu_cancel',event:true,trusted:true,currentTag:'SECTION',currentMatchesControl:true})]);
});

test('composition, repeat and modifier guards prevent accidental global exit',async({page})=>{
  // Synthetic events are confined to negative key-flag guards. Positive and
  // document-veto controls elsewhere use real Playwright keyboard/click input.
  for(const flags of[{repeat:true},{isComposing:true},{ctrlKey:true},{shiftKey:true},{altKey:true},{metaKey:true},{keyCode:229}])
    await root(page).dispatchEvent('keydown',{key:'Escape',...flags});
  expect(await receipts(page)).toEqual([]);
  await root(page).dispatchEvent('compositionstart',{data:''});await root(page).focus();await page.keyboard.press('Escape');
  expect(await receipts(page)).toEqual([]);
  await root(page).dispatchEvent('compositionend',{data:''});await page.keyboard.press('Escape');
  expect(await receipts(page)).toHaveLength(1);
});

test('controller routes source commands independently of close visibility',async({page})=>{
  await configure(page,{closeButtonVisible:false});
  expect(await request(page,{destination:'close-button',fromButtonId:'button.menu_select'})).toBe(false);
  // The public discriminated union cannot represent an invalid destination/id pair.
  expect(await page.evaluate(()=>window.__mobEffectQA.getRefs().controller!.request({destination:'screen',fromButtonId:'button.menu_select'} as unknown as MobEffectControllerCommand))).toBe(false);
  expect(await request(page,{destination:'screen',fromButtonId:'button.mobeffects'})).toBe(true);
  expect(await receipts(page)).toEqual([expect.objectContaining({reason:'continue',target:'button.menu_continue',origin:'host-controller',fromButtonId:'button.mobeffects',event:false,trusted:null})]);
});

test('disabled user input stays blocked while explicit player-hurt notification remains distinct',async({page})=>{
  await configure(page,{disabled:true});
  expect(await request(page,{destination:'screen',fromButtonId:'button.menu_cancel'})).toBe(false);
  await root(page).focus();await page.keyboard.press('Escape');expect(await receipts(page)).toEqual([]);
  expect(await page.evaluate(()=>window.__mobEffectQA.notifyPlayerHurt())).toBe(true);
  const got=await receipts(page);expect(got).toHaveLength(1);
  expect(got[0]).toMatchObject({reason:'player-hurt',sourceProperty:'close_on_player_hurt',origin:'host-player-hurt',event:false,trusted:null});
  expect(got[0]).not.toHaveProperty('target');expect(got[0]).not.toHaveProperty('fromButtonId');
});

test('queued delivery cancels a hidden owner and uses the latest committed callback',async({page})=>{
  expect(await page.evaluate(()=>window.__mobEffectQA.queuedAndPatch({open:false}))).toBe(true);
  expect(await receipts(page)).toEqual([]);expect(await page.evaluate(()=>window.__mobEffectQA.notifyPlayerHurt())).toBe(false);
  await page.evaluate(()=>window.__mobEffectQA.reset());await clear(page);
  const latest=await page.evaluate(()=>{const accepted=window.__mobEffectQA.queuedAndPatch({});return{accepted,version:window.__mobEffectQA.getVersion()};});
  expect(latest.accepted).toBe(true);expect(await receipts(page)).toEqual([expect.objectContaining({version:latest.version,origin:'host-controller',event:false})]);
  await expect(page.locator('#callback-version')).toHaveText(String(latest.version));
});

test('document bubble updates hide a previously accepted native click owner',async({page})=>{
  await configure(page,{availableSize:[360,200],scale:1});
  await page.evaluate(()=>window.__mobEffectQA.setHideOnDocumentEvent(true));await close(page).click();
  expect(await receipts(page)).toEqual([]);await expect(root(page)).toBeHidden();
});

test('controller copies input primitives before owner task and current callback replacement',async({page})=>{
  const latest=await page.evaluate(()=>{
    const command:{destination:'close-button';fromButtonId:'button.menu_ok'|'button.menu_select'}={destination:'close-button',fromButtonId:'button.menu_ok'};
    const accepted=window.__mobEffectQA.request(command);command.fromButtonId='button.menu_select';
    window.__mobEffectQA.configure({});return{accepted,version:window.__mobEffectQA.getVersion()};
  });
  expect(latest.accepted).toBe(true);
  expect(await receipts(page)).toEqual([expect.objectContaining({fromButtonId:'button.menu_ok',version:latest.version,origin:'host-controller',event:false,controlTag:'BUTTON'})]);
});

test('inert ownership rejects both controller input and explicit engine notification',async({page})=>{
  const result=await page.evaluate(()=>{window.__mobEffectQA.getRefs().root!.inert=true;return[
    window.__mobEffectQA.request({destination:'screen',fromButtonId:'button.mobeffects'}),window.__mobEffectQA.notifyPlayerHurt()];});
  expect(result).toEqual([false,false]);expect(await receipts(page)).toEqual([]);
});

test('modal owns focus/inertness and returns focus to the external opener',async({page})=>{
  await page.locator('#opener').focus();await configure(page,{modal:true});
  await expect(page.locator('#opener')).toHaveAttribute('inert','');
  await expect(viewport(page)).toBeFocused();await expect(root(page)).toHaveAttribute('aria-modal','true');
  await configure(page,{open:false});await expect.poll(()=>page.locator('#opener').getAttribute('inert')).toBeNull();
  await expect(page.locator('#opener')).toBeFocused();
});

test('touch layout remains independent of desktop source profile and host thumb visibility',async({page})=>{
  await configure(page,{inputMode:'touch',sourceProfile:'desktop',touchThumbVisible:true,scale:1,availableSize:[380,250]});
  await expect(root(page)).toHaveAttribute('data-source-profile','desktop');await expect(root(page)).toHaveAttribute('data-input-mode','touch');
  await expect(page.getByRole('scrollbar')).toBeVisible();
  const rail=await page.getByRole('scrollbar').boundingBox();expect([rail!.width,rail!.height]).toEqual([4,221]);
  expect(await page.locator('.mc-scrollbar__track').evaluate(node=>getComputedStyle(node).display)).toBe('none');
  await configure(page,{touchThumbVisible:false});await expect(page.locator('.mc-scrollbar__thumb')).toBeHidden();
  // Actual raw CDP touch dispatch remains a separately qualified cache probe;
  // no synthesizeScrollGesture observer is promoted into this common suite.
});

test('focusing cannot scroll the fixed clip and the final row is reachable at native viewport max',async({page})=>{
  const top=await viewport(page).evaluate(node=>node.getBoundingClientRect().top);
  await viewport(page).focus();await ownerTask(page);
  expect(await page.evaluate(()=>[window.__mobEffectQA.getRefs().root!.scrollTop,document.querySelector('.mc-mob-effect-list')!.scrollTop])).toEqual([0,0]);
  expect(await viewport(page).evaluate(node=>node.getBoundingClientRect().top)).toBe(top);
  await viewport(page).evaluate(node=>{node.scrollTop=node.scrollHeight;});
  const bounds=await page.evaluate(()=>{
    const v=window.__mobEffectQA.getRefs().viewport!,list=document.querySelector('.mc-mob-effect-list')!,clip=list.getBoundingClientRect();
    const last=Array.from(document.querySelectorAll('.mc-mob-effect-row')).at(-1)!.getBoundingClientRect();
    return{offset:v.scrollTop,max:v.scrollHeight-v.clientHeight,listScroll:list.scrollTop,rootScroll:window.__mobEffectQA.getRefs().root!.scrollTop,
      clipTop:clip.top,clipBottom:clip.bottom,lastTop:last.top,lastBottom:last.bottom,rootOverflow:getComputedStyle(window.__mobEffectQA.getRefs().root!).overflow,listOverflow:getComputedStyle(list).overflow};
  });
  expect(bounds.offset).toBe(bounds.max);expect(bounds.offset).toBeGreaterThan(0);
  expect([bounds.rootScroll,bounds.listScroll]).toEqual([0,0]);expect([bounds.rootOverflow,bounds.listOverflow]).toEqual(['clip','clip']);
  expect(bounds.lastTop).toBeGreaterThanOrEqual(bounds.clipTop);expect(bounds.lastBottom).toBe(bounds.clipBottom);
});

test('real refs and controller leases clean up on unmount and stale handles reject requests',async({page})=>{
  const result=await page.evaluate(()=>{
    const stale=window.__mobEffectQA.getRefs().controller!;window.__mobEffectQA.unmount();
    return{refs:Object.values(window.__mobEffectQA.getRefs()).map(value=>value===null),stats:window.__mobEffectQA.getRefStats(),
      stale:stale.notifyPlayerHurt(),unavailable:window.__mobEffectQA.request({destination:'screen',fromButtonId:'button.menu_cancel'})};
  });
  expect(result.refs).toEqual([true,true,true,true,true]);expect(result.stale).toBe(false);expect(result.unavailable).toBe(false);
  for(const count of Object.values(result.stats)){expect(count.attach).toBeGreaterThan(0);expect(count.attach).toBe(count.release);}
  await expect(page.locator('#app')).toBeEmpty();
});
