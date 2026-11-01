import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import type {} from '../demo/progress-parts-fixture';

async function task(page:Page){await page.evaluate(()=>new Promise<void>(resolve=>setTimeout(resolve,0)));}
async function open(page:Page,surface:'grids'|'resource'|'cloud'|'conflict'|'stack'='grids',order:'resource-first'|'conflict-first'='resource-first'){
 await page.goto('/demo/progress-parts-fixture.html');await page.waitForFunction(()=>window.progressPartsHarness?.ready);await page.evaluate(({surface,order})=>window.progressPartsHarness.reset(surface,{},order),{surface,order});await task(page);
}
async function events(page:Page){await task(page);return page.evaluate(()=>window.progressPartsHarness.events());}
const optional=(page:Page)=>page.locator('input[name="optional_resourcepacks"]').first();

test('public grid is controlled, preserves opaque identity and allows native/document veto',async({page})=>{
 await open(page);const before=await optional(page).isChecked();
 await optional(page).click();expect((await events(page)).filter(e=>e.kind==='selection')).toHaveLength(1);expect(await optional(page).isChecked()).toBe(before);
 expect(await page.evaluate(()=>window.progressPartsHarness.events()[0]?.payload===window.progressPartsHarness.model().packs.optional.entries[0]?.payload)).toBe(true);
 await page.evaluate(()=>{const h=window.progressPartsHarness;h.clear();h.accept(true);});await optional(page).click();await expect.poll(()=>optional(page).isChecked()).toBe(!before);
 await page.evaluate(()=>{const h=window.progressPartsHarness;h.clear();h.intercept('click','veto');});await optional(page).click();expect(await events(page)).toEqual([]);expect(await optional(page).isChecked()).toBe(!before);
 await page.evaluate(()=>window.progressPartsHarness.nativeVeto(true));await optional(page).click();expect(await events(page)).toEqual([]);
 await expect(page.locator('input[name="required_resourcepacks"]').first()).toBeDisabled();
});

test('public grid pending selections expire on payload, identity, visibility or lifetime changes',async({page})=>{
 for(const effect of ['payload','instance','close','close-reopen','unmount'] as const){await open(page);await page.evaluate(effect=>window.progressPartsHarness.intercept('click',effect),effect);await optional(page).evaluate((n:HTMLInputElement)=>n.click());expect(await events(page)).toEqual([]);}
});

for(const surface of ['resource','cloud','conflict'] as const)test(`standalone ${surface} defers actions until final native veto and uses the latest callback`,async({page})=>{
 await open(page,surface);
 const button=surface==='resource'?page.locator('[data-source-target="button.confirm_download"]'):surface==='cloud'?page.locator('[data-source-target="button.menu_exit"]'):page.locator('[data-source-target="button.edu_cloud_conflict_resolution_local_button"]');
 await page.evaluate(()=>window.progressPartsHarness.intercept('click','veto'));await button.click();expect(await events(page)).toEqual([]);
 await page.evaluate(()=>window.progressPartsHarness.intercept('click','callback'));await button.click();const log=await events(page);expect(log).toHaveLength(1);expect(log[0]).toMatchObject({kind:'action',callbackId:'latest',eventCurrentTargetMatches:true});
 await page.evaluate(()=>{const h=window.progressPartsHarness;h.clear();h.nativeVeto(true);});await button.click();expect(await events(page)).toEqual([]);
});

for(const surface of ['resource','cloud','conflict'] as const)test(`standalone ${surface} drops old requests after close-reopen and unmount`,async({page})=>{
 for(const effect of ['close-reopen','unmount'] as const){await open(page,surface);await page.evaluate(effect=>window.progressPartsHarness.intercept('click',effect),effect);const selector=surface==='resource'?'button.confirm_download':surface==='cloud'?'button.menu_exit':'button.edu_cloud_conflict_resolution_local_button';await page.locator(`[data-source-target="${selector}"]`).evaluate((n:HTMLButtonElement)=>n.click());expect(await events(page)).toEqual([]);}
});

for(const surface of ['resource','conflict'] as const)test(`standalone ${surface} traps Tab, preserves readonly Escape and restores the external opener`,async({page})=>{
 await open(page,surface);const dialog=page.getByRole('dialog');
 const focusable=dialog.locator('button:not(:disabled),input:not(:disabled),[tabindex="0"]');
 await focusable.last().focus();await page.keyboard.press('Tab');await expect(focusable.first()).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(focusable.last()).toBeFocused();
 await page.evaluate(()=>{const h=window.progressPartsHarness;h.patch({readOnly:true});h.clear();});await page.keyboard.press('Escape');
 expect((await events(page)).map(e=>e.target)).toEqual([surface==='resource'?'modal.escape':'button.close_edu_cloud_conflict_resolution_popup']);
 await page.evaluate(()=>{const h=window.progressPartsHarness;h.clear();h.intercept('keydown','veto');});await page.keyboard.press('Escape');expect(await events(page)).toEqual([]);
 await page.evaluate(()=>window.progressPartsHarness.patch({open:false}));await expect(page.locator('#opener')).toBeFocused();expect(await page.locator('#opener').getAttribute('inert')).toBeNull();
});

test('two standalone modal leases permit only the top, survive lower-first closure and restore focus/scroll',async({page})=>{
 for(const order of ['resource-first','conflict-first'] as const){await open(page,'stack',order);
  const top=order==='resource-first'?'cloud-conflict-dialog':'resource-dialog',lower=order==='resource-first'?'resource-dialog':'cloud-conflict-dialog';
  await expect(page.locator(`[data-progress-part="${lower}"]`)).toHaveAttribute('inert','');
  await page.locator(`[data-progress-part="${lower}"] button[data-source-target]`).first().evaluate((n:HTMLButtonElement)=>n.click());expect(await events(page)).toEqual([]);
  await page.keyboard.press('Escape');expect((await events(page)).map(e=>e.target)).toEqual([top==='resource-dialog'?'modal.escape':'button.close_edu_cloud_conflict_resolution_popup']);
  await page.evaluate(lower=>{const h=window.progressPartsHarness;h.clear();h.patch(lower==='resource-dialog'?{resourcePopup:null}:{conflictPopup:null});},lower);
  expect(await page.locator(`[data-progress-part="${top}"]`).getAttribute('inert')).toBeNull();
  await page.keyboard.press('Escape');expect(await events(page)).toHaveLength(1);
  await page.evaluate(()=>window.progressPartsHarness.patch({open:false}));await expect(page.locator('#opener')).toBeFocused();expect(await page.evaluate(()=>[document.documentElement.style.overflow,document.body.style.overflow].includes('hidden'))).toBe(false);
 }
});

test('closing the top standalone modal returns to the lower focused control and releases scroll ownership',async({page})=>{
 await open(page,'resource');
 await page.evaluate(()=>{const h=window.progressPartsHarness;h.patch({open:false});document.body.style.minHeight='3000px';window.scrollTo(0,250);h.reset('stack',{conflictPopup:null});});
 const lowerButton=page.locator('[data-progress-part="resource-dialog"] [data-source-target="button.deny_packs"]');await lowerButton.focus();
 const scrollBefore=await page.evaluate(()=>scrollY);
 await page.evaluate(()=>window.progressPartsHarness.patch({conflictPopup:{instanceId:'later-conflict',description:'Choose',localName:'Local',localDate:'Date',cloudName:'Cloud',cloudDate:'Date'}}));
 await page.evaluate(()=>window.progressPartsHarness.patch({conflictPopup:null}));await expect(lowerButton).toBeFocused();
 await page.evaluate(()=>window.progressPartsHarness.patch({open:false}));await expect(page.locator('#opener')).toBeFocused();expect(await page.evaluate(()=>scrollY)).toBe(scrollBefore);
});

test('public parts keep source canvas dimensions clipped and forwarded refs release on unmount',async({page})=>{
 for(const surface of ['resource','cloud','conflict'] as const){await open(page,surface);const root=page.locator('[data-progress-part]');expect(await root.evaluate(n=>n===window.progressPartsHarness.ref())).toBe(true);
  expect(await root.evaluate(n=>{n.scrollTo(100,100);return[getComputedStyle(n).overflow,n.scrollTop,n.scrollLeft];})).toEqual(['clip',0,0]);
  await page.evaluate(()=>window.progressPartsHarness.unmount());expect(await page.evaluate(()=>window.progressPartsHarness.ref())).toBeNull();
 }
});
