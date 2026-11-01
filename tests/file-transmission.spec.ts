import {test,expect} from '@playwright/test';
import type {} from '../demo/file-transmission-owner-fixture';
async function loaded(page:import('@playwright/test').Page){await page.goto('/demo/file-transmission-fixture.html');await page.waitForFunction(()=>window.fileTransmissionFixture?.ready);}
test('source transmission fixed panel, live bindings, readonly/disabled and each real action',async({page})=>{
 await loaded(page);await page.locator('#open').click();const panel=page.locator('.mc-file-transmission-panel');expect(await panel.boundingBox()).toMatchObject({width:268,height:95});
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.fileTransmissionFixture.actions.map(x=>x.target))).toEqual(['button.file_upload_cancel']);
 await page.evaluate(()=>window.fileTransmissionFixture.render({bindings:{singleTitleVisible:false,dualTitleVisible:true,uploadContentVisible:false,warningContentVisible:true,cancelVisible:false,warningButtonsVisible:true}}));
 await expect(page.getByText('This transfer uses mobile data.',{exact:true})).toBeVisible();await expect(page.getByText('1 of 3',{exact:true})).toBeVisible();await expect(page.locator('.mc-file-transfer-progress')).toBeHidden();
 await page.getByRole('button',{name:'Continue',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.fileTransmissionFixture.actions.length)).toBe(2);await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.fileTransmissionFixture.actions.length)).toBe(3);
 await page.evaluate(()=>window.fileTransmissionFixture.render({bindings:{warningButtonsVisible:false,warningContentVisible:false,playVisible:true}}));await page.getByRole('button',{name:'Let us go',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.fileTransmissionFixture.actions.length)).toBe(4);
 await page.evaluate(()=>window.fileTransmissionFixture.render({readOnly:true}));await page.getByRole('button',{name:'Let us go',exact:true}).click({force:true});await page.keyboard.press('Escape');await expect.poll(()=>page.evaluate(()=>window.fileTransmissionFixture.actions.length)).toBe(5);expect(await page.evaluate(()=>window.fileTransmissionFixture.actions.at(-1)?.target)).toBe('button.menu_exit');
 await page.evaluate(()=>window.fileTransmissionFixture.render({disabled:true}));await expect(page.getByRole('button',{name:'Let us go',exact:true})).toBeDisabled();await page.keyboard.press('Escape');expect(await page.evaluate(()=>window.fileTransmissionFixture.command('button.menu_cancel'))).toBe(false);expect(await page.evaluate(()=>window.fileTransmissionFixture.actions.length)).toBe(5);
});
test('source requests wait for native document veto and use latest callbacks',async({page})=>{
 await loaded(page);await page.locator('#open').click();
 await page.evaluate(()=>{document.addEventListener('click',e=>{if((e.target as Element).closest('[data-file-transmission-button]'))e.preventDefault();},{once:true});});await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.waitForTimeout(25);expect(await page.evaluate(()=>window.fileTransmissionFixture.actions.length)).toBe(0);
 await page.evaluate(()=>window.fileTransmissionFixture.render({nativeVeto:true}));await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.waitForTimeout(25);expect(await page.evaluate(()=>window.fileTransmissionFixture.actions.length)).toBe(0);
 await page.evaluate(()=>{window.fileTransmissionFixture.render({nativeVeto:false});const button=document.querySelector<HTMLButtonElement>('[data-file-transmission-button="cancel"]')!;button.click();window.fileTransmissionFixture.render({callback:'latest'});});await expect.poll(()=>page.evaluate(()=>window.fileTransmissionFixture.actions[0]?.callback)).toBe('latest');
});
test('queued requests expire on hide/reopen, instance replacement, visibility cycle and unmount',async({page})=>{
 await loaded(page);await page.locator('#open').click();
 for(const change of ['open','instance','visibility','readonly']as const){await page.evaluate(change=>{const fixture=window.fileTransmissionFixture;document.querySelector<HTMLButtonElement>('[data-file-transmission-button="cancel"]')!.click();if(change==='open'){fixture.render({open:false});fixture.render({open:true});}else if(change==='instance')fixture.render({runKey:'replacement'});else if(change==='visibility'){fixture.render({bindings:{cancelVisible:false}});fixture.render({bindings:{cancelVisible:true}});}else {fixture.render({readOnly:true});fixture.render({readOnly:false});}},change);await page.waitForTimeout(25);expect(await page.evaluate(()=>window.fileTransmissionFixture.actions.length)).toBe(0);}
 await page.evaluate(()=>{document.querySelector<HTMLButtonElement>('[data-file-transmission-button="cancel"]')!.click();window.fileTransmissionFixture.unmount();});await page.waitForTimeout(25);expect(await page.evaluate(()=>window.fileTransmissionFixture.actions.length)).toBe(0);
});
test('no-buttons fallback focuses panel, traps Tab, controller mappings and restores opener/scroll',async({page})=>{
 await loaded(page);const overflow=await page.evaluate(()=>document.body.style.overflow);await page.evaluate(()=>window.fileTransmissionFixture.render({bindings:{cancelVisible:false}}));await page.locator('#open').click();await expect(page.locator('.mc-file-transmission-panel')).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.locator('.mc-file-transmission-panel')).toBeFocused();
 for(const command of ['button.menu_tab_left','button.menu_tab_right','button.menu_cancel']as const)expect(await page.evaluate(c=>window.fileTransmissionFixture.command(c),command)).toBe(true);
 await expect.poll(()=>page.evaluate(()=>window.fileTransmissionFixture.actions.map(x=>x.target))).toEqual(['button.menu_tab_left','button.menu_tab_right','button.menu_exit']);
 await page.evaluate(()=>window.fileTransmissionFixture.render({open:false}));await expect(page.locator('#open')).toBeFocused();expect(await page.evaluate(()=>document.body.style.overflow)).toBe(overflow);expect(await page.locator('#open').getAttribute('inert')).toBeNull();
});
test('state-setter controller refs stay stable and only the nested top modal handles Escape',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('/demo/file-transmission-owner-fixture.html');await page.waitForFunction(()=>window.fileTransmissionOwner?.ready);
 await page.getByRole('button',{name:'Open outer'}).click();
 const before=await page.evaluate(()=>window.fileTransmissionOwner.renders());await page.evaluate(()=>window.fileTransmissionOwner.set({percentage:.5}));expect(await page.evaluate(()=>window.fileTransmissionOwner.renders())).toBe(before+1);
 await page.evaluate(()=>window.fileTransmissionOwner.set({inner:true}));expect(await page.evaluate(()=>window.fileTransmissionOwner.command())).toBe(false);await page.keyboard.press('Escape');await expect.poll(()=>page.evaluate(()=>window.fileTransmissionOwner.events)).toEqual(['nested:button.menu_exit']);
 await page.evaluate(()=>window.fileTransmissionOwner.set({inner:false}));expect(await page.evaluate(()=>window.fileTransmissionOwner.command())).toBe(true);await expect.poll(()=>page.evaluate(()=>window.fileTransmissionOwner.events)).toEqual(['nested:button.menu_exit','outer:button.menu_exit']);expect(errors).toEqual([]);
});
