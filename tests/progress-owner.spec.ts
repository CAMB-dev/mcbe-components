import {test,expect} from '@playwright/test';
import type {} from '../demo/progress-owner-fixture';
async function loaded(page:import('@playwright/test').Page,mode='collector'){await page.goto('/demo/progress-owner-fixture.html?mode='+mode);await page.waitForFunction(()=>window.progressOwner?.ready);const peer=process.env.MCBEUI_PROGRESS_OWNER_REACT;if(peer)expect(await page.evaluate(()=>Reflect.get(window,'progressOwnerPeer'))).toBe(peer);}
test('controllerRef accepts a stable React state setter without an update loop',async({page})=>{
 await loaded(page,'setter');await expect(page.locator('#fault')).toHaveCount(0);const before=await page.evaluate(()=>window.progressOwner.renders());await page.evaluate(()=>{window.progressOwner.save();window.progressOwner.set({revision:1});});expect(await page.evaluate(()=>window.progressOwner.renders())).toBe(before+1);expect(await page.evaluate(()=>window.progressOwner.sameHandle())).toBe(true);
});
test('controller identity and callback-ref lifecycle survive live data updates and read latest callbacks',async({page})=>{
 await loaded(page);await page.locator('#opener').click();const before=await page.evaluate(()=>{window.progressOwner.save();return[...window.progressOwner.refEvents];});await page.evaluate(()=>window.progressOwner.set({revision:1,callback:'latest'}));
 expect(await page.evaluate(()=>window.progressOwner.sameHandle())).toBe(true);expect(await page.evaluate(()=>window.progressOwner.refEvents)).toEqual(before);
 expect(await page.evaluate(()=>window.progressOwner.savedCommand('button.menu_cancel'))).toBe(true);await expect.poll(()=>page.evaluate(()=>window.progressOwner.events)).toEqual(['latest:button.menu_exit']);
});
test('a nested host portal owns Escape and blocks the retained outer controller',async({page})=>{
 await loaded(page);await page.locator('#opener').click();await page.evaluate(()=>{window.progressOwner.save();window.progressOwner.set({inner:true});});expect(await page.evaluate(()=>window.progressOwner.savedCommand('button.menu_cancel'))).toBe(false);await page.keyboard.press('Escape');await expect.poll(()=>page.evaluate(()=>window.progressOwner.events)).toEqual(['nested:button.menu_exit']);
 await page.evaluate(()=>window.progressOwner.set({inner:false}));expect(await page.evaluate(()=>window.progressOwner.savedCommand('button.menu_cancel'))).toBe(true);await expect.poll(()=>page.evaluate(()=>window.progressOwner.events)).toEqual(['nested:button.menu_exit','first:button.menu_exit']);
});
test('a retained handle reads latest focus, readonly and disabled without changing its identity',async({page})=>{
 await loaded(page);await page.locator('#opener').click();await page.evaluate(()=>window.progressOwner.save());const cancel=page.locator('.mc-progress-screen .mc-progress-source-button[data-source-target="button.menu_exit"]');await cancel.focus();await page.evaluate(()=>window.progressOwner.set({callback:'focused-latest'}));expect(await page.evaluate(()=>window.progressOwner.savedCommand('activate-focused-web'))).toBe(true);await expect.poll(()=>page.evaluate(()=>window.progressOwner.events)).toEqual(['focused-latest:button.menu_exit']);
 await page.evaluate(()=>window.progressOwner.set({readOnly:true}));expect(await page.evaluate(()=>window.progressOwner.savedCommand('activate-focused-web'))).toBe(false);expect(await page.evaluate(()=>window.progressOwner.savedCommand('button.menu_cancel'))).toBe(true);await expect.poll(()=>page.evaluate(()=>window.progressOwner.events.length)).toBe(2);
 await page.evaluate(()=>window.progressOwner.set({disabled:true}));expect(await page.evaluate(()=>window.progressOwner.savedCommand('button.menu_cancel'))).toBe(false);expect(await page.evaluate(()=>window.progressOwner.sameHandle())).toBe(true);
});
test('closed and replaced sessions reject previously retained handles',async({page})=>{
 await loaded(page);await page.locator('#opener').click();await page.evaluate(()=>{window.progressOwner.save();window.progressOwner.set({open:false});});expect(await page.evaluate(()=>window.progressOwner.savedCommand('button.menu_cancel'))).toBe(false);
 await page.evaluate(()=>window.progressOwner.set({open:true,runKey:'replacement'}));expect(await page.evaluate(()=>window.progressOwner.sameHandle())).toBe(false);expect(await page.evaluate(()=>window.progressOwner.savedCommand('button.menu_cancel'))).toBe(false);expect(await page.evaluate(()=>window.progressOwner.command('button.menu_cancel'))).toBe(true);await expect.poll(()=>page.evaluate(()=>window.progressOwner.events)).toEqual(['first:button.menu_exit']);
});
