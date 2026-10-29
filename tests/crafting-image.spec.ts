// Synthetic client contracts only. These tests do not certify native pixel parity.
import { expect, test } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { craftingClientProfile, craftingContractPage } from '../demo/crafting-contract-font';
import type { CraftingImageOptions, CraftingImageState } from '../demo/crafting-image-fixture';

// Optional Windows hardware profile; the default stays portable and uses the
// repository browser configuration. Missing WebGL is a real failure, never skip.
if (process.env.MCBE_CRAFTING_GPU_PROFILE === 'd3d11') {
  test.use({ launchOptions: { chromiumSandbox: true, args: ['--use-angle=d3d11'] } });
}
const fontPageBytes = Buffer.from(craftingContractPage.split(',')[1]!, 'base64');
const source=(page:Page)=>page.locator('.mc-crafting-screen .mc-gui-layer,.mc-crafting-screen .mc-gui-image').first();
const right=(page:Page)=>page.locator('.mc-crafting-screen__right .mc-crafting');
const recipes=(page:Page)=>page.locator('.mc-recipe-book-entry');
const input=(page:Page)=>page.locator('.mc-crafting__grid .mc-slot');
const viewport=(page:Page)=>page.locator('.mc-recipe-book__items .mc-scroll-area__viewport');
const patch=(page:Page,value:Partial<CraftingImageState>)=>page.evaluate(value=>{window.craftingImageQA.patch(value);return new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())))},value);
async function open(page:Page,options:CraftingImageOptions={}){await page.goto('/demo/crafting-image-fixture.html');await page.waitForFunction(()=>window.craftingImageModuleReady);await page.evaluate(options=>window.craftingImageQA.mount(options),options);await expect(page.locator('.mc-crafting-screen')).toBeVisible();await page.evaluate(()=>document.fonts.ready);}
async function ready(page:Page){await expect(source(page)).toHaveAttribute('data-render-state','ready');}
async function save(page:Page,selector:string,key:string){await page.evaluate(({selector,key})=>window.craftingImageQA.save(selector,key),{selector,key});}
async function same(page:Page,selector:string,key:string){return page.evaluate(({selector,key})=>window.craftingImageQA.same(selector,key),{selector,key});}
async function box(locator:Locator){const r=await locator.boundingBox();if(!r)throw Error('Missing actual DOM control');return r;}
async function localRect(locator:Locator,root:Locator,expected:readonly number[]){const a=await box(locator),b=await box(root);expect([a.x-b.x,a.y-b.y,a.width,a.height]).toEqual(expected.map(x=>x*2));}
function profile(){return craftingClientProfile();}
function fontGate(url:string){const p=profile();p.text.crafting.font.pages=[url];return p;}

test('wide full326 body preserves independent book/fold/right/tabs/toolbar source declarations',async({page})=>{
 await open(page,{source:true,profile:profile(),count:14});await ready(page);const root=page.locator('.mc-crafting-screen');
 expect([(await box(root)).width,(await box(root)).height]).toEqual([652,332]);
 await localRect(page.locator('.mc-crafting-screen__book'),root,[0,0,146,166]);await localRect(page.locator('.mc-crafting-screen__fold'),root,[146,0,4,166]);
 await localRect(page.locator('.mc-crafting-screen__right'),root,[150,0,176,166]);await localRect(page.locator('.mc-recipe-categories'),root,[0,-23,146,27]);
 const toolbar=await box(page.locator('.mc-crafting-screen__toolbar')),r=await box(root);expect(toolbar.y).toBeLessThan(r.y);
 // Full output qualification must retain tabs/background negativeY; no326x166 crop accepted as native fullGUI.
});
test('compact keeps326 canvas while shifting only right origin75 and removing left book branch',async({page})=>{
 await open(page,{source:true,profile:profile(),layout:'survival'});await ready(page);const root=page.locator('.mc-crafting-screen');
 expect([(await box(root)).width,(await box(root)).height]).toEqual([652,332]);await expect(page.locator('.mc-crafting-screen__book')).toHaveCount(0);
 await localRect(page.locator('.mc-crafting-screen__right'),root,[75,0,176,166]);await expect(right(page).locator('.mc-slot')).toHaveCount(46);
});
test('right46 namespace stays9inputs+1large result+27inventory+9hotbar independently ofRecipeN',async({page})=>{
 await open(page,{source:true,profile:profile(),count:70});await ready(page);await expect(right(page).locator('.mc-slot')).toHaveCount(46);await expect(right(page).locator('[data-mc-crafting-slot=true]')).toHaveCount(46);await expect(page.locator('.mc-crafting-image-window')).toHaveAttribute('data-right-slots','46');await expect(page.locator('.mc-crafting-image-window')).toHaveAttribute('data-recipe-count','70');await expect(recipes(page)).toHaveCount(70);await localRect(recipes(page).nth(0),page.locator('.mc-recipe-book'),[7,21,18,18]);
 await expect(input(page)).toHaveCount(9);await localRect(page.locator('.mc-crafting__result'),right(page),[123,30,26,26]);
 await recipes(page).nth(2).click();await expect(input(page).nth(2)).toHaveAttribute('aria-pressed','true');
 await patch(page,{count:14});await ready(page);await expect(right(page).locator('.mc-slot')).toHaveCount(46);await expect(recipes(page)).toHaveCount(14);await localRect(recipes(page).nth(0),page.locator('.mc-recipe-book'),[10,21,18,18]);
});
test('search and nonsearch use separate source viewport/filter rows without inventing host filtering',async({page})=>{
 await open(page,{source:true,profile:profile(),count:14});await ready(page);const book=page.locator('.mc-recipe-book');
 await localRect(page.locator('.mc-recipe-book__items'),book,[6,21,134,139]);await patch(page,{category:'search'});await ready(page);
 await localRect(page.locator('.mc-recipe-book__items'),book,[6,37,134,123]);await expect(page.locator('.mc-recipe-book__search input')).toBeVisible();
 await page.locator('.mc-recipe-book__search input').fill('host query');await expect(recipes(page)).toHaveCount(14);
});
test('empty host collection remains empty and exposes status rather than invented recipes',async({page})=>{
 await open(page,{source:true,profile:profile(),count:0,filter:true});await ready(page);await expect(recipes(page)).toHaveCount(0);await expect(right(page).locator('.mc-slot')).toHaveCount(46);
 await expect(page.locator('.mc-recipe-book__empty')).toHaveAttribute('role','status');
});
test('craftable count and group modifier stay separate from represented inventory count/durability',async({page})=>{
 await open(page,{source:true,profile:profile(),count:14});await ready(page);const zero=recipes(page).nth(0),red=recipes(page).nth(2),seven=recipes(page).nth(3);
 await expect(zero.locator('.mc-slot__count')).toHaveCount(0);await expect(zero.locator('[role=meter]')).toHaveCount(0);await expect(zero.locator('.mc-recipe-book-entry__art img')).toHaveCount(1);await expect(zero.locator('.mc-recipe-book-entry__art')).not.toBeVisible();await expect(zero.locator('.mc-recipe-book-entry__modifier')).not.toBeVisible();await expect(zero.locator('.mc-recipe-book-entry__selected')).not.toBeVisible();
 await expect(seven.locator('.mc-slot__count')).toHaveText('7');await expect(seven.locator('.mc-slot__count')).not.toBeVisible();await expect(seven.locator('.mc-recipe-book-entry__modifier')).not.toBeVisible();await expect(seven.locator('[role=meter]')).toHaveCount(0);await expect(zero).toHaveAttribute('data-modifier','collapse');await expect(seven).toHaveAttribute('data-modifier','expand');
 await red.click();expect(await page.evaluate(()=>window.craftingImageQA.events)).toContainEqual({event:'recipe',value:{id:'recipe-2',action:'primary'}});
});
test('customReactNode and zero-count/preview-only rejected image resources retainDOM without source fetch',async({page})=>{
 const requests:string[]=[];page.on('request',r=>{if(r.url().includes('crafting-qa-never-fetch'))requests.push(r.url())});
 await open(page,{source:true,profile:profile(),count:14,custom:true});await ready(page);
 await expect(page.locator('[data-custom-recipe]')).toBeVisible();await expect(page.locator('[data-custom-input]')).toBeVisible();await expect(recipes(page).nth(4).locator('.mc-slot__count')).toBeVisible();await expect(recipes(page).nth(4).locator('.mc-recipe-book-entry__modifier')).toBeVisible();
 await patch(page,{selected:'recipe-4'});await ready(page);await expect(recipes(page).nth(4).locator('.mc-recipe-book-entry__selected')).toBeVisible();expect(requests).toEqual([]);
 await page.locator('[data-custom-recipe]').click();expect(await page.evaluate(()=>window.craftingImageQA.events)).toContainEqual({event:'custom-recipe',value:4});
});
test('source on/ready/off keeps actualroot/input/recipe nodes and original event handlers',async({page})=>{
 await open(page,{source:false,count:14});for(const[s,k]of[['.mc-crafting-screen','root'],['.mc-crafting__grid .mc-slot','input'],['[data-recipe-id="recipe-2"]','recipe']])await save(page,s!,k!);
 await patch(page,{source:true,profile:profile()});await ready(page);await patch(page,{source:false});await expect(recipes(page).nth(0).locator('.mc-recipe-book-entry__art')).toBeVisible();await expect(recipes(page).nth(0).locator('.mc-recipe-book-entry__modifier')).toBeVisible();await expect(recipes(page).nth(0).locator('.mc-recipe-book-entry__selected')).toBeVisible();await expect(recipes(page).nth(3).locator('.mc-slot__count')).toBeVisible();await expect(page.locator('[data-mc-crafting-slot]')).toHaveCount(0);await expect(page.locator('[data-mc-crafting-recipe]')).toHaveCount(0);
 for(const[s,k]of[['.mc-crafting-screen','root'],['.mc-crafting__grid .mc-slot','input'],['[data-recipe-id="recipe-2"]','recipe']])expect(await same(page,s!,k!)).toBe(true);
 await input(page).nth(1).click();expect(await page.evaluate(()=>window.craftingImageQA.events)).toContainEqual({event:'input',value:{index:1,action:'primary'}});
});
test('pending synthetic-font request leavesCSS and semanticcontrols active until the whole current layerready',async({page})=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);await page.route('**/crafting-qa-held.png',async route=>{await gate;await route.fulfill({body:fontPageBytes,contentType:'image/png'})});
 await open(page,{source:true,profile:fontGate('/crafting-qa-held.png'),count:14});await expect(source(page)).toHaveAttribute('data-render-state','loading');
 const color=await page.locator('.mc-crafting .mc-workstation__title').evaluate(n=>getComputedStyle(n).color);expect(color).not.toBe('rgba(0, 0, 0, 0)');
 await input(page).nth(1).click();release();await ready(page);expect(await page.evaluate(()=>window.craftingImageQA.events)).toContainEqual({event:'input',value:{index:1,action:'primary'}});
});
test('failed currentresource restoreswholeCSS and preserves customReactNodes/actions',async({page})=>{
 await page.route('**/crafting-qa-bad.png',route=>route.fulfill({status:404,body:'missing'}));await open(page,{source:true,profile:fontGate('/crafting-qa-bad.png'),count:14});
 await expect(source(page)).toHaveAttribute('data-render-state','error');await expect(page.locator('[data-custom-input]')).toBeVisible();await expect(recipes(page).nth(0).locator('.mc-recipe-book-entry__art')).toBeVisible();await expect(recipes(page).nth(0).locator('.mc-recipe-book-entry__modifier')).toBeVisible();await expect(recipes(page).nth(0).locator('.mc-recipe-book-entry__selected')).toBeVisible();await expect(recipes(page).nth(3).locator('.mc-slot__count')).toBeVisible();
 expect(await page.locator('.mc-crafting .mc-workstation__title').evaluate(n=>getComputedStyle(n).color)).not.toBe('rgba(0, 0, 0, 0)');await recipes(page).nth(2).click();
 expect(await page.evaluate(()=>window.craftingImageQA.events)).toContainEqual({event:'recipe',value:{id:'recipe-2',action:'primary'}});
});
test('supersededpending resource cannot replace latestoff state after late resolve',async({page})=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);await page.route('**/crafting-qa-held.png',async route=>{await gate;await route.fulfill({body:fontPageBytes,contentType:'image/png'}).catch(error=>{lateRouteFailures.get(page)?.push(String(error))})});
 await open(page,{source:true,profile:fontGate('/crafting-qa-held.png'),count:14});await expect(source(page)).toHaveAttribute('data-render-state','loading');await patch(page,{source:false});release();
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await expect(source(page)).toHaveCount(0);await expect(page.locator('[data-custom-input]')).toBeVisible();
});
test('contextloss restoresCSS andoff/on permits a new current layer without remountingcontrols',async({page})=>{
 await open(page,{source:true,profile:profile(),count:14});await ready(page);await save(page,'.mc-crafting__grid .mc-slot','input');
 await source(page).evaluate(canvas=>{const gl=(canvas as HTMLCanvasElement).getContext('webgl');const ext=gl?.getExtension('WEBGL_lose_context');if(!ext)throw Error('Actual contextloss extension unavailable');ext.loseContext()});
 await expect(source(page)).toHaveAttribute('data-render-state','error');await expect(page.locator('[data-custom-input]')).toBeVisible();await expect(recipes(page).nth(0).locator('.mc-recipe-book-entry__art')).toBeVisible();await expect(recipes(page).nth(0).locator('.mc-recipe-book-entry__modifier')).toBeVisible();await expect(recipes(page).nth(0).locator('.mc-recipe-book-entry__selected')).toBeVisible();await expect(recipes(page).nth(3).locator('.mc-slot__count')).toBeVisible();await patch(page,{source:false});await expect(source(page)).toHaveCount(0);await patch(page,{source:true,profile:profile()});await ready(page);
 expect(await same(page,'.mc-crafting__grid .mc-slot','input')).toBe(true);
});
test('controlled layout/query/filter requests do not mutate hoststate until accepted',async({page})=>{
 await open(page,{source:true,profile:profile(),count:14,category:'search',accept:false});await ready(page);
 await page.locator('.mc-inventory-toolbar [data-layout=survival]').click();await expect(page.locator('.mc-crafting-screen')).toHaveAttribute('data-layout','recipe-book');
 await page.locator('.mc-recipe-filter-toggle').click();await expect(page.locator('.mc-recipe-filter-toggle')).toHaveAttribute('aria-pressed','false');await recipes(page).nth(2).click();await expect(recipes(page).nth(0)).toHaveAttribute('aria-pressed','true');
 await page.locator('.mc-recipe-book__search input').fill('rejected');await expect(page.locator('.mc-recipe-book__search input')).toHaveValue('');await expect(recipes(page)).toHaveCount(14);
 await patch(page,{accept:true,layout:'survival'});await ready(page);await expect(page.locator('.mc-crafting-screen')).toHaveAttribute('data-layout','survival');
});
test('disabledrecipe and keyboard navigation respecthost policy while redrecipe remains actionable',async({page})=>{
 await open(page,{source:true,profile:profile(),count:14});await ready(page);await expect(recipes(page).nth(1)).toBeDisabled();await recipes(page).nth(0).focus();await page.keyboard.press('ArrowRight');await expect(recipes(page).nth(2)).toBeFocused();
 await page.keyboard.press('Enter');expect(await page.evaluate(()=>window.craftingImageQA.events)).toContainEqual({event:'recipe',value:{id:'recipe-2',action:'primary'}});
 await patch(page,{disabled:true});await expect(recipes(page).nth(2)).toBeDisabled();
});
test('semantic native scroll updates the same source viewport without shiftingright46',async({page})=>{
 await open(page,{source:true,profile:profile(),count:70});await ready(page);const before=await input(page).evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().toJSON()));
 const first=await source(page).screenshot({caret:'initial'});await viewport(page).evaluate(n=>{n.scrollTop=72;n.dispatchEvent(new Event('scroll'))});await expect.poll(()=>viewport(page).evaluate(n=>n.scrollTop)).toBeGreaterThan(0);await ready(page);
 const after=await source(page).screenshot({caret:'initial'});expect(after.equals(first)).toBe(false);expect(await input(page).evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().toJSON()))).toEqual(before);
});
test('query input owns focus/composition and survives sourceupdates without cloned editingcontrols',async({page})=>{
 await open(page,{source:true,profile:profile(),category:'search',count:14});await ready(page);const query=page.locator('.mc-recipe-book__search input');await save(page,'.mc-recipe-book__search input','query');
 await query.focus();await expect.poll(()=>query.evaluate(n=>getComputedStyle(n).color)).not.toBe('rgba(0, 0, 0, 0)');await query.dispatchEvent('compositionstart');await query.fill('QA');await query.dispatchEvent('compositionend',{data:'QA'});await expect(query).toHaveValue('QA');
 await expect(page.locator('.mc-recipe-book__search input')).toHaveCount(1);expect(await same(page,'.mc-recipe-book__search input','query')).toBe(true);await expect(query).toBeFocused();await query.blur();await ready(page);await expect(page.locator('.mc-crafting-image-window')).toHaveAttribute('data-text-query','true');
});
test('StrictMode does not duplicateactions orleave stale readiness afterunmount',async({page})=>{
 await open(page,{source:true,profile:profile(),strict:true,count:14});await ready(page);await input(page).nth(1).click();
 expect((await page.evaluate(()=>window.craftingImageQA.events)).filter((e)=>e.event==='input')).toEqual([{event:'input',value:{index:1,action:'primary'}}]);
 await page.evaluate(()=>window.craftingImageQA.unmount());await expect(page.locator('.mc-crafting-screen')).toHaveCount(0);
});
test('negativeY toolbar close/help controls retainreal event and keyboard boundaries undercanvas',async({page})=>{
 await open(page,{source:true,profile:profile(),count:14});await ready(page);await page.locator('[data-toolbar-control=help]').click();await page.locator('[data-toolbar-control=help]').press('Escape');
 expect(await page.evaluate(()=>window.craftingImageQA.events)).toContainEqual({event:'help',value:true});expect(await page.evaluate(()=>window.craftingImageQA.events)).toContainEqual({event:'close',value:true});
});

// Separate from StrictMode: two actual roots with one sourcefont failure.
test('two live instances keep46/RecipeN namespaces andready/error restoration isolated',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});await page.route('**/crafting-qa-bad.png',route=>route.fulfill({status:404,body:'missing'}));
 await page.goto('/demo/crafting-image-fixture.html');await page.waitForFunction(()=>window.craftingImageModuleReady);
 const a=profile(),b=fontGate('/crafting-qa-bad.png');for(const p of[a,b])p.frame={width:1920,height:1080,guiScale:2};b.origin=[400,48];
 await page.evaluate(({a,b})=>window.craftingImageQA.mountPair({source:true,profile:a,count:14},{source:true,profile:b,count:70,hostStyle:{left:760,top:64}}),{a,b});
 const first=page.locator('[data-instance=first]'),second=page.locator('[data-instance=second]');
 await expect(first.locator('.mc-gui-layer')).toHaveAttribute('data-render-state','ready');await expect(second.locator('.mc-gui-layer')).toHaveAttribute('data-render-state','error');
 await expect(first.locator('.mc-crafting .mc-slot')).toHaveCount(46);await expect(second.locator('.mc-crafting .mc-slot')).toHaveCount(46);
 await expect(first.locator('.mc-recipe-book-entry')).toHaveCount(14);await expect(second.locator('.mc-recipe-book-entry')).toHaveCount(70);
 await expect(second.locator('[data-custom-input]')).toBeVisible();await first.locator('.mc-crafting__grid .mc-slot').nth(1).click();
 expect(await page.evaluate(()=>window.craftingImageQA.events)).toContainEqual({event:'input',value:{index:1,action:'primary'},instance:'first'});
});

test('accepted markers separateknown rightcells fromrecipe background/art metadata fallback',async({page})=>{
 await open(page,{source:true,profile:profile(),count:14,unknownBackground:true});await ready(page);
 await expect(right(page).locator('[data-mc-crafting-slot=true]')).toHaveCount(46);
 await expect(recipes(page).locator('[data-mc-crafting-slot]')).toHaveCount(0);
 await expect(recipes(page).nth(4)).not.toHaveAttribute('data-mc-crafting-art','true');await expect(page.locator('[data-custom-recipe]')).toBeVisible();
 await expect(recipes(page).nth(5)).toHaveAttribute('data-mc-crafting-art','true');
 await expect(recipes(page).nth(6)).not.toHaveAttribute('data-mc-crafting-recipe','true');
 await expect(recipes(page).nth(6).locator('.mc-recipe-book-entry__art img')).toBeVisible();
});

test('explicit normalguiModel beatsicon fallback atomically whileRecipe preview andmodelsoff stayDOM',async({page})=>{
 const requests:string[]=[];page.on('request',r=>requests.push(r.url()));
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
 await page.route('**/crafting-qa-held.png',async route=>{await gate;await route.fulfill({body:fontPageBytes,contentType:'image/png'}).catch(error=>{lateRouteFailures.get(page)?.push(String(error))})});
 await page.route('**/crafting-qa-model.png',async route=>route.fulfill({body:await readFile(new URL('../demo/assets/minecraft/diamond.png',import.meta.url)),contentType:'image/png'}));
 await page.route('**/crafting-qa-bad.png',route=>route.fulfill({status:404,body:'missing'}));
 await open(page,{source:false,count:14,model:true});
 await save(page,'[data-right-model-fallback]','model-right');await save(page,'[data-recipe-model-fallback]','model-recipe');
 await patch(page,{source:true,profile:fontGate('/crafting-qa-held.png')});await expect(source(page)).toHaveAttribute('data-render-state','loading');
 await expect(page.locator('[data-right-model-fallback]')).toBeVisible();await expect(page.locator('[data-recipe-model-fallback]')).toBeVisible();release();await ready(page);
 await expect(input(page).nth(4)).toHaveAttribute('data-mc-source-item','model');await expect(recipes(page).nth(7)).toHaveAttribute('data-mc-crafting-art','true');
 await expect(page.locator('[data-right-model-fallback]')).not.toBeVisible();await expect(page.locator('[data-recipe-model-fallback]')).not.toBeVisible();
 await expect(page.locator('[data-custom-recipe]')).toBeVisible();await expect(recipes(page).nth(4)).not.toHaveAttribute('data-mc-crafting-recipe','true');
 expect(requests.some(u=>u.includes('preview-rejected-model'))).toBe(false);
 expect(await same(page,'[data-right-model-fallback]','model-right')).toBe(true);expect(await same(page,'[data-recipe-model-fallback]','model-recipe')).toBe(true);
 await patch(page,{source:false});await expect(source(page)).toHaveCount(0);await expect(page.locator('[data-right-model-fallback]')).toBeVisible();
 await patch(page,{source:true,profile:fontGate('/crafting-qa-bad.png')});await expect(source(page)).toHaveAttribute('data-render-state','error');
 await expect(page.locator('[data-right-model-fallback]')).toBeVisible();await expect(page.locator('[data-recipe-model-fallback]')).toBeVisible();
 const off=profile();off.itemModels=false;await patch(page,{profile:off,modelUrl:'/crafting-qa-disabled-model.png'});await ready(page);
 await expect(page.locator('[data-right-model-fallback]')).toBeVisible();await expect(page.locator('[data-recipe-model-fallback]')).toBeVisible();
 expect(requests.some(u=>u.includes('crafting-qa-disabled-model.png'))).toBe(false);
 expect(await same(page,'[data-right-model-fallback]','model-right')).toBe(true);expect(await same(page,'[data-recipe-model-fallback]','model-recipe')).toBe(true);
});


interface Observed {
  pageErrors: string[];
  consoleErrors: { message: string; location: { url: string; lineNumber: number; columnNumber: number } }[];
  failedRequests: { url: string; failure: { errorText: string } | null }[];
  httpErrors: { url: string; status: number }[];
}
const observed = new Map<string, Observed>();
const lateRouteFailures = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }, info) => {
  const row: Observed = { pageErrors: [], consoleErrors: [], failedRequests: [], httpErrors: [] };
  observed.set(info.testId, row); lateRouteFailures.set(page, []);
  page.on('pageerror', error => row.pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push({ message: message.text(), location: message.location() }); });
  page.on('requestfailed', request => row.failedRequests.push({ url: request.url(), failure: request.failure() }));
  page.on('response', response => { if (response.status() >= 400) row.httpErrors.push({ url: response.url(), status: response.status() }); });
});
test.afterEach(async ({ page }, info) => {
  const raw = observed.get(info.testId)!;
  let runtime: unknown;
  let captureError: string | undefined;
  try {
    runtime = await page.evaluate(() => ({
      dpr: devicePixelRatio, viewport: [innerWidth, innerHeight],
      layers: [...document.querySelectorAll<HTMLCanvasElement>('.mc-crafting-image-layer')].map(canvas => {
        const gl = canvas.getContext('webgl'), extension = gl?.getExtension('WEBGL_debug_renderer_info');
        return { state: canvas.getAttribute('data-render-state'), backing: [canvas.width, canvas.height],
          rect: canvas.getBoundingClientRect().toJSON(), attributes: gl?.getContextAttributes(),
          renderer: gl && extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) as string : null };
      }),
      roots: [...document.querySelectorAll('.mc-crafting-screen')].map(root => ({
        layout: root.getAttribute('data-layout'), rect: root.getBoundingClientRect().toJSON(),
        rightSlots: root.querySelectorAll('.mc-crafting .mc-slot').length,
        recipes: root.querySelectorAll('.mc-recipe-book-entry').length,
      })),
    }));
    await info.attach('crafting-client', { body: await page.screenshot({ caret: 'initial' }), contentType: 'image/png' });
  } catch (error) { captureError = String(error); }
  // Retain every cancellation, expected HTTP404 and console error. A cancellation
  // is not reclassified as a successful request; deliberate failures are explicit.
  const expected404 = raw.httpErrors.filter(row => row.url.endsWith('/crafting-qa-bad.png') && row.status === 404);
  const unexpectedHTTP = raw.httpErrors.filter(row => !expected404.includes(row));
  const expectedConsole404 = raw.consoleErrors.filter(row => expected404.some(response => response.url === row.location.url)
    && /^Failed to load resource: the server responded with a status of 404 \(Not Found\)$/.test(row.message));
  const unexpectedConsole = raw.consoleErrors.filter(row => !expectedConsole404.includes(row));
  await info.attach('crafting-runtime', { body: JSON.stringify({
    scope: 'Synthetic client contract only; nativePixelParity is untested',
    raw, expected404, unexpectedHTTP, expectedConsole404, unexpectedConsole, lateRouteFailures: lateRouteFailures.get(page), runtime, captureError,
  }, null, 2), contentType: 'application/json' });
  observed.delete(info.testId);
  expect(raw.pageErrors, 'Uncaught browser errors').toEqual([]);
  expect(unexpectedHTTP, 'Unexpected resource failures').toEqual([]);
  expect(unexpectedConsole, 'Console errors without an exact deliberate404 match').toEqual([]);
});
