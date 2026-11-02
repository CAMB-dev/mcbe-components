import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ManifestValidationScreen} from '../src/manifest-validation-screen';
import {ManifestValidationButton,ManifestValidationContent,ManifestValidationIssues} from '../src/manifest-validation-parts';
import {createManifestValidationDemoProps} from '../demo/manifest-validation-data';
import type {ManifestValidationFixtureConfiguration} from '../demo/manifest-validation-fixture';

// Source component Web contracts only. No scan/deletion/clipboard service or
// engine renderer/native route/animation clock is exercised by this fixture.
const configure=(page:Page,patch:Partial<ManifestValidationFixtureConfiguration>)=>page.evaluate(patch=>window.manifestValidationFixture.configure(patch),patch);
const clear=(page:Page)=>page.evaluate(()=>window.manifestValidationFixture.clear());
const events=(page:Page)=>page.evaluate(()=>window.manifestValidationFixture.events);
const checkpoint=(page:Page)=>page.evaluate(async()=>{await new Promise(resolve=>setTimeout(resolve,0));await new Promise(resolve=>setTimeout(resolve,0));});
async function loaded(page:Page,patch:Partial<ManifestValidationFixtureConfiguration>={}){await page.goto('/demo/manifest-validation-fixture.html?strict');await expect.poll(()=>page.evaluate(()=>window.manifestValidationFixture?.ready??false)).toBe(true);await configure(page,patch);await checkpoint(page);await clear(page);}
async function closeFocused(page:Page){await loaded(page);await page.locator('#manifest-close').focus();await expect(page.locator('#manifest-close')).toBeFocused();}
const widths=(page:Page,selectors:string[])=>page.evaluate(selectors=>selectors.map(selector=>{const element=document.querySelector<HTMLElement>(selector);if(!element)throw Error(selector);return element.getBoundingClientRect().width/window.manifestValidationFixture.config.scale;}),selectors);

test('complete source Screen SSR is side-effect free and excludes declaration-only/disabled file sections',()=>{
  const base=createManifestValidationDemoProps(),saved=globalThis.fetch;let requests=0,refs=0;
  globalThis.fetch=(()=>{requests++;throw Error('Unexpected network');}) as typeof fetch;
  try{const html=renderToStaticMarkup(createElement(ManifestValidationScreen,{...base,ref:()=>{refs++;},onCloseRequest:()=>{requests++;},content:{...base.content,onAction:()=>{requests++;}}}));expect(requests).toBe(0);expect(refs).toBe(0);expect(html).toContain('data-source-static-effective-background-alpha="0.8"');expect(html).toContain('data-manifest-variant="refresh-text"');expect(html).toContain('data-manifest-variant="delete-text"');expect(html).not.toMatch(/data-manifest-variant="(?:refresh-icon|delete-icon)"|__loading|file_error|file_label/);expect(html).not.toMatch(/identity=|loadingFrame=|hasErrorsOrWarnings=/);}finally{globalThis.fetch=saved;}
});

test('capacity, explicit factory indices, latent budgets and unused global state validate before rendering',()=>{
  const p=createManifestValidationDemoProps(),content={...p.content,size:[354,219] as const,scale:2};
  expect(()=>renderToStaticMarkup(createElement(ManifestValidationContent,{...content,capacity:1}))).toThrow();
  expect(()=>renderToStaticMarkup(createElement(ManifestValidationContent,{...content,entries:[content.entries[0]!,{...content.entries[1]!,id:content.entries[0]!.id}]}))).toThrow();
  expect(()=>renderToStaticMarkup(createElement(ManifestValidationContent,{...content,entries:[{...content.entries[0]!,index:4},content.entries[1]!]}))).toThrow();
  expect(()=>renderToStaticMarkup(createElement(ManifestValidationContent,{...content,summary:{...content.summary,layout:{...content.summary.layout,metadataLabelWidths:[Infinity,48,48]}}}))).toThrow();
  expect(()=>renderToStaticMarkup(createElement(ManifestValidationScreen,{...p,open:false,content:{...p.content,loadingFrame:10}}))).toThrow();
  expect(()=>renderToStaticMarkup(createElement(ManifestValidationButton,{variant:'copy',identity:content.identity,state:content.state,label:'Copy',scale:2,loadingFrame:10,issue:{id:'issue',index:0,collection:'pack_errors'}}))).toThrow();
  expect(()=>renderToStaticMarkup(createElement(ManifestValidationIssues,{...content,width:332,entries:[],capacity:0,hasErrorsOrWarnings:true}))).not.toThrow();
});

for(const variant of['copy','delete-icon','refresh-icon','delete-text','refresh-text'] as const){
  test(`real ${variant} ref, original size and source request identity`,async({page})=>{
    await loaded(page,{part:'button',variant});const button=page.locator('#manifest-button');await expect(button).toBeVisible();
    const size=await button.boundingBox();expect(size!.width).toBe((variant==='copy'?25:variant.endsWith('text')?80:30)*2);expect(size!.height).toBe((variant==='copy'?25:variant.endsWith('text')?20:30)*2);
    expect(await button.evaluate(node=>window.manifestValidationFixture.getRefs().button===node)).toBe(true);await button.click();await checkpoint(page);const result=await events(page);expect(result).toHaveLength(1);expect(result[0]!.stableTarget).toBe(true);expect(result[0]!.runKey).toBe('fixture-run-0');expect(result[0]!.packId).toBe('fixture-pack-0');expect(result[0]!.target).toBe(variant==='copy'?'button.copy_to_clipboard':variant.startsWith('delete')?'button.delete_manifest':'button.refresh_manifest');if(variant==='copy'){expect(result[0]!.collection).toBe('pack_errors');expect(result[0]!.issueId).toBe('fixture-issue-0');expect(result[0]!.issueIndex).toBe(0);}
  });
}

test('leaf, ancestor React and late native click preventDefault each veto the request',async({page})=>{
  await loaded(page,{part:'button'});
  for(const flag of['preventLeaf','preventAncestor','preventNative'] as const){await configure(page,{[flag]:true});await clear(page);await page.locator('#manifest-button').click();await checkpoint(page);expect(await events(page)).toEqual([]);await configure(page,{[flag]:false});}
  await page.locator('#manifest-button').click();await checkpoint(page);expect(await events(page)).toHaveLength(1);
});

test('queued source identity changes, hidden owner and removal cancel captured intents',async({page})=>{
  for(const kind of['identity','hidden','remove'] as const){await loaded(page,{part:'button'});await page.evaluate(kind=>{document.querySelector<HTMLButtonElement>('#manifest-button')!.click();const api=window.manifestValidationFixture;if(kind==='identity')api.configure({identityRevision:1});else if(kind==='hidden')api.configure({hidden:true});else api.unmount();},kind);await checkpoint(page);expect(await events(page)).toEqual([]);}
});

test('working controls enablement independently of deleting/done state',async({page})=>{
  await loaded(page,{part:'button',variant:'delete-icon'});
  for(let mask=0;mask<8;mask++){await configure(page,{isWorking:!!(mask&1),isDeleting:!!(mask&2),isDoneValidating:!!(mask&4)});if(mask&1)await expect(page.locator('#manifest-button')).toBeDisabled();else await expect(page.locator('#manifest-button')).toBeEnabled();await expect(page.locator('.mc-manifest-validation-button__loading')).toHaveCount(mask&2?1:0);}
  await configure(page,{variant:'refresh-icon',isWorking:false,isDoneValidating:false,isDeleting:false,loadingFrame:9});await expect(page.locator('.mc-manifest-validation-button__loading')).toHaveAttribute('data-frame','9');
  for(const flag of['readOnly','disabled'] as const){await configure(page,{[flag]:true});await clear(page);await page.locator('#manifest-button').dispatchEvent('click');await checkpoint(page);expect(await events(page)).toEqual([]);await configure(page,{[flag]:false});}
});

test('explicit source button dimensions survive a constrained flex host',async({page})=>{
  await loaded(page,{part:'button',variant:'copy'});
  await page.locator('#manifest-button').evaluate(node=>{const parent=node.parentElement!;parent.style.display='flex';parent.style.width='20px';});
  for(const [variant,width,height]of [['copy',25,25],['delete-icon',30,30],['refresh-icon',30,30],['delete-text',80,20],['refresh-text',80,20]]as const){
    await configure(page,{variant});const bounds=await page.locator('#manifest-button').evaluate(node=>{const r=node.getBoundingClientRect();return{width:r.width,height:r.height};});expect(bounds.width).toBe(width*2);expect(bounds.height).toBe(height*2);
  }
});

test('all explicit loading frames select source strips without a library timer',async({page})=>{
  await loaded(page,{part:'button',variant:'refresh-icon',isDoneValidating:false});
  for(let frame=0;frame<10;frame++){await configure(page,{loadingFrame:frame});await expect(page.locator('.mc-manifest-validation-button__loading')).toHaveAttribute('data-frame',String(frame));expect(await page.locator('.mc-manifest-validation-button__loading .mc-image').evaluate(node=>parseFloat(getComputedStyle(node).left))).toBe(frame===0?0:-16*frame*2);}
  await checkpoint(page);await expect(page.locator('.mc-manifest-validation-button__loading')).toHaveAttribute('data-frame','9');
});

test('native IME activation is vetoed while ordinary Enter activates the real source button',async({page})=>{
  await loaded(page,{part:'button'});await page.locator('#manifest-button').focus();
  expect(await page.locator('#manifest-button').evaluate(node=>{const event=new KeyboardEvent('keydown',{key:'Enter',code:'Enter',isComposing:true,bubbles:true,cancelable:true});node.dispatchEvent(event);return event.defaultPrevented;})).toBe(true);await checkpoint(page);expect(await events(page)).toEqual([]);await page.keyboard.press('Enter');await checkpoint(page);expect(await events(page)).toHaveLength(1);
});

test('summary visibility flags and fixed header/action source dimensions remain independent',async({page})=>{
  await loaded(page,{part:'summary'});expect(await widths(page,['.mc-manifest-pack-summary__icon-background'])).toEqual([46]);expect(await page.locator('.mc-manifest-pack-summary__header').evaluate(node=>node.getBoundingClientRect().height)).toBe(100);
  for(let mask=0;mask<8;mask++){await configure(page,{showSize:!!(mask&1),showRefresh:!!(mask&2),showDelete:!!(mask&4)});await expect(page.locator('.mc-manifest-pack-summary__size')).toBeVisible({visible:!!(mask&1)});await expect(page.locator('#manifest-refresh')).toBeVisible({visible:!!(mask&2)});await expect(page.locator('#manifest-delete')).toBeVisible({visible:!!(mask&4)});}
  await configure(page,{showSize:true,showRefresh:true,showDelete:true});expect(await widths(page,['#manifest-refresh','#manifest-delete'])).toEqual([80,80]);await expect(page.locator('[data-manifest-field]')).toHaveCount(3);expect(await page.locator('.mc-manifest-pack-summary__panel').getAttribute('data-source-type')).toBe('panel');
  await configure(page,{showIcon:true});expect(await widths(page,['.mc-manifest-pack-summary__icon'])).toEqual([44]);await expect.poll(()=>page.locator('.mc-manifest-pack-summary__icon').evaluate(node=>(node as HTMLImageElement).naturalWidth)).toBe(16);expect(await page.locator('.mc-manifest-pack-summary__icon').evaluate(node=>getComputedStyle(node).filter)).toBe('none');
});

test('GUI scale1..3 changes physical geometry without changing the explicit game viewport',async({page})=>{
  await loaded(page);for(const scale of[1,2,3]){await configure(page,{scale});expect(await widths(page,['#manifest-screen','.mc-manifest-validation-screen__panel','#manifest-close'])).toEqual([420,370,21]);expect(await page.locator('.mc-manifest-validation-screen__panel').evaluate(node=>node.getBoundingClientRect().height)).toBe(250*scale);}
});

test('collection IDs/indices and global error visibility are not inferred from issue text or capacity',async({page})=>{
  await loaded(page,{part:'issues',entryCount:3});const items=page.locator('.mc-manifest-validation-issue');await expect(items).toHaveCount(3);expect(await items.evaluateAll(nodes=>nodes.map(node=>[node.getAttribute('data-issue-id'),node.getAttribute('data-collection-index')]))).toEqual([['fixture-issue-0','0'],['fixture-issue-1','1'],['fixture-issue-2','2']]);
  await configure(page,{hasErrorsOrWarnings:false});await expect(items).toHaveCount(3);await expect(page.locator('.mc-manifest-validation-issue__type').first()).toBeVisible();await expect(page.locator('.mc-manifest-validation-issue__body').first()).toBeHidden();await expect(page.locator('[data-manifest-variant="copy"]').first()).toBeHidden();
  await configure(page,{hasErrorsOrWarnings:true,entryCount:0});await expect(items).toHaveCount(0);await expect(page.locator('#manifest-issues')).toHaveAttribute('data-source-capacity','0');
});

for(const inputMode of['mouse','touch'] as const)test(`source content width chain and hidden UA bars (${inputMode})`,async({page})=>{
  await loaded(page,{part:'content',inputMode,entryCount:12});expect(await widths(page,['#manifest-content','.mc-manifest-validation-content__outer','.mc-scroll-area','.mc-scroll-area__viewport','.mc-manifest-validation-content__stack'])).toEqual(inputMode==='mouse'?[354,350,349,340,336]:[354,350,349,349,345]);
  const viewport=page.locator('.mc-scroll-area__viewport');expect(await viewport.evaluate(node=>getComputedStyle(node).scrollbarWidth)).toBe('none');const before=await viewport.evaluate(node=>node.scrollTop);await viewport.hover();await page.mouse.wheel(0,150);await expect.poll(()=>viewport.evaluate(node=>node.scrollTop)).toBeGreaterThan(before);if(inputMode==='touch')await expect(page.locator('.mc-scrollbar__thumb')).toBeHidden();
});

test('Screen source frame, background policy and default route controls exclude icon loading definitions',async({page})=>{
  await closeFocused(page);expect(await widths(page,['#manifest-screen','.mc-manifest-validation-screen__panel','.mc-manifest-validation-screen__content'])).toEqual([420,370,354]);await expect(page.locator('#manifest-screen')).toHaveAttribute('data-source-declared-background-alpha','0.65');expect(await page.locator('.mc-manifest-validation-screen__dim').evaluate(node=>getComputedStyle(node).opacity)).toBe('0.8');await expect(page.locator('[data-manifest-variant="refresh-icon"],[data-manifest-variant="delete-icon"],.mc-manifest-validation-button__loading')).toHaveCount(0);await expect(page.locator('[data-manifest-variant="refresh-text"]')).toHaveCount(1);await expect(page.locator('[data-manifest-variant="copy"]')).toHaveCount(2);expect(await widths(page,['#manifest-close'])).toEqual([21]);
});

test('Screen controlled refusal, close leaf veto, ancestor veto and late native veto preserve visibility',async({page})=>{
  await closeFocused(page);await page.locator('#manifest-close').click();await checkpoint(page);expect((await events(page))[0]!.origin).toBe('close');await expect(page.locator('#manifest-screen')).toBeVisible();
  for(const flag of['preventLeaf','preventAncestor','preventNative'] as const){await configure(page,{[flag]:true});await clear(page);await page.locator('#manifest-close').click();await checkpoint(page);expect(await events(page)).toEqual([]);await configure(page,{[flag]:false});}
  await configure(page,{acceptClose:true});await page.locator('#manifest-close').click();await checkpoint(page);await expect(page.locator('#manifest-screen')).toBeHidden();
});

test('Screen native target-stopped composition survives ordinary props updates then permits Escape after end',async({page})=>{
  await closeFocused(page);await page.evaluate(()=>{const node=document.querySelector('#manifest-close')!;for(const type of['compositionstart','compositionend'])node.addEventListener(type,event=>{event.stopPropagation();event.preventDefault();});node.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,cancelable:true,data:'文'}));});await configure(page,{revision:1});await page.keyboard.press('Escape');await checkpoint(page);expect(await events(page)).toEqual([]);
  await page.evaluate(()=>document.querySelector('#manifest-close')!.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,cancelable:true,data:'文'})));await page.keyboard.press('Escape');await checkpoint(page);expect((await events(page)).map(event=>event.origin)).toEqual(['escape']);
});

test('Screen Escape key veto and hidden close flag are independent of the global exit binding',async({page})=>{
  await closeFocused(page);await configure(page,{preventKey:true});await page.keyboard.press('Escape');await checkpoint(page);expect(await events(page)).toEqual([]);await configure(page,{preventKey:false,closeVisible:false});await expect(page.locator('#manifest-close')).toBeHidden();await page.locator('.mc-manifest-validation-screen__panel').focus();await page.keyboard.press('Escape');await checkpoint(page);expect((await events(page))[0]!.target).toBe('button.menu_exit');
});

test('Screen readOnly permits exit while disabled rejects it; view bracket policy is explicit opt-in',async({page})=>{
  await closeFocused(page);await configure(page,{isWorking:true,isDeleting:true,isDoneValidating:false});await expect(page.locator('#manifest-close')).toBeEnabled();await page.locator('#manifest-close').click();await checkpoint(page);expect(await events(page)).toHaveLength(1);await clear(page);await configure(page,{isWorking:false,readOnly:true});await page.keyboard.press('Escape');await checkpoint(page);expect(await events(page)).toHaveLength(1);await clear(page);await configure(page,{disabled:true});await page.keyboard.press('Escape');await checkpoint(page);expect(await events(page)).toEqual([]);await configure(page,{disabled:false,readOnly:false});await page.keyboard.press(']');await checkpoint(page);expect(await events(page)).toEqual([]);await configure(page,{viewNavigationKeys:true});await page.keyboard.press(']');await checkpoint(page);expect((await events(page))[0]!.target).toBe('button.menu_tab_right');
});

test('Screen Tab and ShiftTab cycle real controls within the Web modal owner',async({page})=>{
  await closeFocused(page);const close=page.locator('#manifest-close'),owner=page.locator('#manifest-screen');
  // Let the real modal/browser choose its endpoint: ScrollArea also exposes
  // focusable viewport/scrollbar nodes, so the last button is not the last stop.
  await page.keyboard.press('Shift+Tab');await expect(close).not.toBeFocused();expect(await owner.evaluate(node=>node.contains(node.ownerDocument.activeElement))).toBe(true);
  const last=await page.evaluateHandle(()=>document.activeElement);
  try{
    await page.keyboard.press('Tab');await expect(close).toBeFocused();expect(await owner.evaluate(node=>node.contains(node.ownerDocument.activeElement))).toBe(true);
    await page.keyboard.press('Shift+Tab');await expect.poll(()=>page.evaluate(last=>document.activeElement===last,last)).toBe(true);expect(await owner.evaluate(node=>node.contains(node.ownerDocument.activeElement))).toBe(true);
  }finally{await last.dispose();}
});

test('hidden Screen retains no actionable effects and a queued owner removal produces no request',async({page})=>{
  await closeFocused(page);await configure(page,{hidden:true});await clear(page);await page.locator('#manifest-close').dispatchEvent('click');await checkpoint(page);expect(await events(page)).toEqual([]);await configure(page,{hidden:false});await page.evaluate(()=>{document.querySelector<HTMLButtonElement>('#manifest-close')!.click();window.manifestValidationFixture.unmount();});await checkpoint(page);expect(await events(page)).toEqual([]);
});

test('all six public refs are actual nodes, ordinary updates stay stable and each attachment cleans once',async({page})=>{
  for(const part of['screen','content','summary','issue','issues','button'] as const){await loaded(page,{part});const key=part,selector=part==='screen'?'#manifest-screen':`#manifest-${part}`;expect(await page.locator(selector).evaluate((node,key)=>window.manifestValidationFixture.getRefs()[key]===node,key)).toBe(true);const start=await page.evaluate(()=>window.manifestValidationFixture.refEvents.length);await configure(page,{revision:2,lowMemoryDevice:true});expect(await page.evaluate(()=>window.manifestValidationFixture.refEvents.length)).toBe(start);await page.evaluate(()=>{window.manifestValidationFixture.unmount();window.manifestValidationFixture.remount();window.manifestValidationFixture.unmount();});const log=await page.evaluate(()=>window.manifestValidationFixture.refEvents);const attachments=log.filter(record=>record.kind===key&&record.phase==='attach');expect(attachments.length).toBeGreaterThan(0);for(const record of attachments)expect(log.filter(item=>item.kind===key&&item.attachment===record.attachment&&item.phase==='cleanup')).toHaveLength(1);expect(log.filter(record=>record.kind===key&&record.phase==='null')).toEqual([]);}
});

test('pressed state moves content by one source unit and preserves original icon pixels without a tint',async({page})=>{
  await loaded(page,{part:'button',variant:'copy'});const button=page.locator('#manifest-button'),content=button.locator('.mc-manifest-validation-button__content'),skin=button.locator('.mc-manifest-validation-button__skins');const beforeContent=await content.boundingBox(),beforeSkin=await skin.boundingBox();await button.hover();await page.mouse.down();try{const afterContent=await content.boundingBox(),afterSkin=await skin.boundingBox();expect(afterContent!.y-beforeContent!.y).toBe(2);expect(afterSkin!.y-beforeSkin!.y).toBe(0);expect(await button.locator('.mc-image').evaluate(node=>getComputedStyle(node).filter)).toBe('none');expect(await button.evaluate(node=>getComputedStyle(node).transform)).toBe('none');}finally{await page.mouse.up();}
});
