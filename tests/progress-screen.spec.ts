import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import type {} from '../demo/progress-screen-fixture';

async function task(page:Page){await page.evaluate(()=>new Promise<void>(resolve=>setTimeout(resolve,0)));}
async function open(page:Page,patch:Record<string,unknown>={}){await page.goto('/demo/progress-screen-fixture.html');await page.waitForFunction(()=>window.progressHarness?.ready);await page.evaluate(p=>window.progressHarness.reset(p),patch);await task(page);}
async function log(page:Page){await task(page);return page.evaluate(()=>window.progressHarness.events());}
async function upload(page:Page,resource=false,conflict=false,order:('resource'|'conflict')[]=[]){await page.evaluate(({resource,conflict,order})=>{const h=window.progressHarness,p=h.props();h.reset({route:'world_saving_progress_screen',capabilities:{...p.capabilities,educationEdition:true,cloudSaveOn:true},cloud:{...p.cloud,uploadError:true,oneButtonPanel:true},bindings:{...p.bindings,ttsEnabled:false},resourcePopup:resource?{instanceId:'packs-1',factoryId:'test',description:'Packs',showRayTracingWarning:false,rayTracingWarning:'',joinEverythingText:'All first',joinRequiredText:'Required first'}:null,conflictPopup:conflict?{instanceId:'conflict-1',description:'Choose a version',localName:'Local',localDate:'Local date',cloudName:'Cloud',cloudDate:'Cloud date'}:null,modalOrder:order});},{resource,conflict,order});await task(page);}

test('all fifteen source roots mount concrete active content with no console or asset failures',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('requestfailed',r=>errors.push(r.url()));
 await open(page);
 const routes=['progress_screen','modal_progress_screen','delete_progress_screen','realms_stories_loading_progress_screen','world_loading_progress_screen','experience_world_loading_progress_screen','overworld_loading_progress_screen','nether_loading_progress_screen','theend_loading_progress_screen','world_saving_progress_screen','fetching_edu_cloud_worlds','edu_cloud_download_progress_screen','fetching_edu_servers','joining_edu_server','world_convert_modal_progress_screen'] as const;
 for(const route of routes){await page.evaluate(route=>{const h=window.progressHarness,p=h.props();h.reset({route,capabilities:{...p.capabilities,educationEdition:true,cloudSaveOn:true}});},route);await expect(page.locator('.mc-progress-screen')).toHaveAttribute('data-source-route',route);expect(await page.locator('.mc-progress-screen').evaluate(n=>{n.scrollTo(0,100);return[n.clientWidth,n.clientHeight,getComputedStyle(n).overflow,n.scrollTop];})).toEqual([500,300,'clip',0]);}
 await expect(page.locator('.mc-progress-base-panel')).toHaveCount(1);
 await info.attach('last-source-root.png',{body:await page.locator('.mc-progress-screen').screenshot(),contentType:'image/png'});
 expect(errors).toEqual([]);
});

test('global cancel is independent of visible cancel controls, readonly preserves exit requests, disabled suppresses them',async({page})=>{
 await open(page,{route:'progress_screen',readOnly:true});
 await page.keyboard.press('Escape');expect((await log(page)).map(e=>e.target)).toEqual(['button.menu_exit']);
 await page.evaluate(()=>{const h=window.progressHarness;h.clear();h.patch({disabled:true});});
 await page.keyboard.press('Escape');expect(await log(page)).toEqual([]);expect(await page.evaluate(()=>window.progressHarness.controller('button.menu_cancel'))).toBe(false);
 await page.evaluate(()=>{const h=window.progressHarness;h.patch({disabled:false});h.controller('button.menu_cancel');});
 expect((await log(page)).map(e=>[e.target,e.origin])).toEqual([['button.menu_exit','host-controller']]);
 expect(await page.locator('.mc-progress-screen').isVisible()).toBe(true);
});

test('actual button requests use latest callback, stable native currentTarget and final document veto',async({page})=>{
 await open(page);await upload(page);
 const ok=page.locator('.mc-progress-screen__base [data-source-target="button.menu_exit"]');
 await page.evaluate(()=>window.progressHarness.intercept('click','veto'));await ok.click();expect(await log(page)).toEqual([]);
 await page.evaluate(()=>window.progressHarness.intercept('click','callback'));await ok.click();
 const events=await log(page);expect(events).toHaveLength(1);expect(events[0]).toMatchObject({target:'button.menu_exit',callbackId:'latest',eventCurrentTargetMatches:true,controlConnected:true});
 await page.evaluate(()=>{const h=window.progressHarness;h.clear();h.patch({readOnly:true});});await ok.evaluate((n:HTMLButtonElement)=>n.click());expect(await log(page)).toEqual([]);
 await ok.focus();expect(await page.evaluate(()=>window.progressHarness.controller('activate-focused-web'))).toBe(false);
 await page.keyboard.press('Escape');expect((await log(page)).map(e=>e.target)).toEqual(['button.menu_exit']);
});

test('deferred requests cannot cross close, close-reopen, unmount or factory instance replacement',async({page})=>{
 for(const effect of ['close','close-reopen','unmount'] as const){await open(page);await upload(page);await page.evaluate(effect=>window.progressHarness.intercept('click',effect),effect);await page.locator('.mc-progress-screen__base [data-source-target="button.menu_exit"]').evaluate((n:HTMLButtonElement)=>n.click());expect(await log(page)).toEqual([]);}
 await open(page);await upload(page,true,false,['resource']);await page.evaluate(()=>window.progressHarness.intercept('keydown','instance'));await page.keyboard.press('Escape');expect(await log(page)).toEqual([]);
});

test('one modal lease follows explicit factory order, restores each layer focus and finally the external opener',async({page})=>{
 await open(page);await upload(page);
 const base=page.locator('.mc-progress-screen__base [data-source-target="button.menu_exit"]');await base.focus();
 await page.evaluate(()=>{const h=window.progressHarness;h.patch({resourcePopup:{instanceId:'packs-1',factoryId:'test',description:'Packs',showRayTracingWarning:false,rayTracingWarning:'',joinEverythingText:'All',joinRequiredText:'Required'},modalOrder:['resource']});});
 const optional=page.locator('input[name="optional_resourcepacks"]').first();await optional.focus();
 await page.evaluate(()=>{const h=window.progressHarness;h.patch({conflictPopup:{instanceId:'conflict-1',description:'Choose',localName:'Local',localDate:'Date',cloudName:'Cloud',cloudDate:'Date'},modalOrder:['resource','conflict']});});
 await expect(page.locator('[data-progress-modal-layer="resource"]')).toHaveAttribute('inert','');
 expect(await page.evaluate(()=>document.activeElement?.closest('[data-progress-modal-layer]')?.getAttribute('data-progress-modal-layer'))).toBe('conflict');
 await page.keyboard.press('Escape');expect((await log(page)).map(e=>e.target)).toEqual(['button.close_edu_cloud_conflict_resolution_popup']);
 await page.evaluate(()=>{const h=window.progressHarness;h.clear();h.patch({conflictPopup:null,modalOrder:['resource']});});await expect(optional).toBeFocused();
 await page.keyboard.press('Escape');expect((await log(page)).map(e=>e.target)).toEqual(['modal.escape']);
 await page.evaluate(()=>window.progressHarness.patch({resourcePopup:null,modalOrder:[]}));await expect(base).toBeFocused();
 await page.evaluate(()=>window.progressHarness.patch({open:false}));await expect(page.locator('#opener')).toBeFocused();
 expect(await page.locator('#opener').getAttribute('inert')).toBeNull();
});

test('top order changes preserve factory once labels and invalidate the old top request',async({page})=>{
 await open(page);await upload(page,true,true,['resource','conflict']);
 await page.evaluate(()=>window.progressHarness.intercept('keydown','reorder'));await page.keyboard.press('Escape');expect(await log(page)).toEqual([]);
 await expect(page.locator('[data-progress-modal-layer="conflict"]')).toHaveAttribute('inert','');
 await page.evaluate(()=>{const h=window.progressHarness,p=h.props();h.patch({packs:{...p.packs,optional:{...p.packs.optional,entries:p.packs.optional.entries.map(e=>({...e,name:'Changed host name'}))}}});});
 await expect(page.locator('[data-source-collection="optional_resourcepacks"]')).not.toContainText('Changed host name');
 await page.keyboard.press('Escape');expect((await log(page)).map(e=>e.target)).toEqual(['modal.escape']);
});

test('resource selections remain controlled, accept or reject host updates and honor document veto',async({page})=>{
 await open(page);await upload(page,true,false,['resource']);
 const input=page.locator('input[name="optional_resourcepacks"]').first(),before=await input.isChecked();
 await input.click();expect((await log(page)).filter(e=>e.kind==='selection')).toHaveLength(1);expect(await input.isChecked()).toBe(before);
 await page.evaluate(()=>{const h=window.progressHarness;h.clear();h.accept(true);});await input.click();expect((await log(page)).filter(e=>e.kind==='selection')).toHaveLength(1);expect(await input.isChecked()).toBe(!before);
 await page.evaluate(()=>{const h=window.progressHarness;h.clear();h.intercept('click','veto');});await input.click();expect(await log(page)).toEqual([]);expect(await input.isChecked()).toBe(!before);
 await page.evaluate(()=>{const h=window.progressHarness;h.patch({readOnly:true});});await input.click();expect(await log(page)).toEqual([]);
 await expect(page.locator('input[name="required_resourcepacks"]').first()).toBeDisabled();
});

test('source fade is a host-sampled out_cubic value, with no invented timer or automatic close',async({page})=>{
 await open(page,{route:'delete_progress_screen'});
 await page.evaluate(()=>{const h=window.progressHarness,p=h.props();h.patch({profile:{...p.profile,transitions:{pushSeconds:.4,popSeconds:.4,policy:'host-screen-events-web'}},transition:{animation:'screen_exit_animation_push_fade',elapsedSeconds:.2}});});
 await expect(page.locator('.mc-progress-screen')).toHaveCSS('opacity','0.125');await task(page);await expect(page.locator('.mc-progress-screen')).toHaveCSS('opacity','0.125');
 await page.evaluate(()=>window.progressHarness.patch({transition:{animation:'screen_entrance_animation_pop_fade',elapsedSeconds:.2}}));await expect(page.locator('.mc-progress-screen')).toHaveCSS('opacity','0.875');
 expect(await log(page)).toEqual([]);
});

test('all five resource factories and all cloud conflict choices request their exact source targets',async({page})=>{
 await open(page);await upload(page);
 const expected={test:['button.confirm_download','button.deny_packs'],resource_pack_download_server_required:['button.join_and_download_everything','button.leave'],resource_pack_download_optional_and_required:['button.join_and_download_everything','button.join_and_download_required','button.leave'],resource_pack_download_optional:['button.join_and_download_everything','button.join'],resource_pack_download_required:['button.join_and_download_required','button.leave']} as const;
 for(const [factoryId,targets]of Object.entries(expected)){
  await page.evaluate(factoryId=>{const h=window.progressHarness;h.clear();h.patch({resourcePopup:{instanceId:'matrix-'+factoryId,factoryId:factoryId as 'test',description:'Host download description',showRayTracingWarning:false,rayTracingWarning:'',joinEverythingText:'All',joinRequiredText:'Required'},modalOrder:['resource']});},factoryId);
  for(const target of targets)await page.locator(`[data-progress-modal-layer="resource"] [data-source-target="${target}"]`).click();
  expect((await log(page)).map(e=>e.target)).toEqual([...targets]);
 }
 await upload(page,false,true,['conflict']);
 for(const target of ['button.edu_cloud_conflict_resolution_local_button','button.edu_cloud_conflict_resolution_cloud_button','button.edu_cloud_conflict_resolution_both_button'])await page.locator(`[data-source-target="${target}"]`).click();
 expect((await log(page)).map(e=>e.target)).toEqual(['button.edu_cloud_conflict_resolution_local_button','button.edu_cloud_conflict_resolution_cloud_button','button.edu_cloud_conflict_resolution_both_button']);
 await page.evaluate(()=>{const h=window.progressHarness;h.clear();h.patch({conflictPopup:null,modalOrder:[]});});
 await page.locator('[data-source-target="button.edu_cloud_hyperlink"]').click();expect((await log(page)).map(e=>e.target)).toEqual(['button.edu_cloud_hyperlink']);
});

test('mobile visibility samples once per source instance and hidden-open toggles keep that instance',async({page})=>{
 await open(page);await page.evaluate(()=>{const h=window.progressHarness,p=h.props();h.reset({capabilities:{...p.capabilities,android:true,ios:true},auxiliary:{...p.auxiliary,mobileDataVisibleAtInstanceCreation:true}});});
 await expect(page.locator('[data-source-control="progress.mobile_data_icon"]')).toHaveCount(1);
 await page.evaluate(()=>{const h=window.progressHarness,p=h.props();h.patch({open:false,auxiliary:{...p.auxiliary,mobileDataVisibleAtInstanceCreation:false}});h.patch({open:true});});
 await expect(page.locator('[data-source-control="progress.mobile_data_icon"]')).toHaveCount(1);
 await page.evaluate(()=>window.progressHarness.patch({runKey:'new-mobile-instance'}));await expect(page.locator('[data-source-control="progress.mobile_data_icon"]')).toHaveCount(0);
});

test('owner-document modal and final native veto work inside an iframe',async({page})=>{
 await open(page,{open:false});
 const navigation=page.waitForEvent('framenavigated',{predicate:frame=>frame.parentFrame()!==null});
 await page.evaluate(()=>{const iframe=document.createElement('iframe');iframe.id='child';iframe.src='/demo/progress-screen-fixture.html';iframe.style.cssText='width:500px;height:450px';document.body.append(iframe);});
 const child=await navigation;await child.waitForFunction(()=>window.progressHarness?.ready);
 await child.evaluate(()=>window.progressHarness.reset({route:'progress_screen'}));
 await child.evaluate(()=>window.progressHarness.intercept('keydown','veto'));await child.locator('.mc-progress-screen').press('Escape');
 await child.evaluate(()=>new Promise<void>(resolve=>setTimeout(resolve,0)));expect(await child.evaluate(()=>window.progressHarness.events())).toEqual([]);
 await child.locator('.mc-progress-screen').press('Escape');await child.evaluate(()=>new Promise<void>(resolve=>setTimeout(resolve,0)));expect((await child.evaluate(()=>window.progressHarness.events())).map(e=>e.target)).toEqual(['button.menu_exit']);
 await child.evaluate(()=>window.progressHarness.patch({open:false}));await expect(child.locator('#opener')).toBeFocused();
});
