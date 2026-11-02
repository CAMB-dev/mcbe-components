import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';
import {createHash} from 'node:crypto';

// The gallery's extra component imports can change stylesheet ordering. These
// consumers deliberately use only the documented unified styles.css entry.
async function loaded(page:Page,scale:number){
 await page.goto('/demo/css-profile-fixture.html');
 await page.waitForFunction(()=>!!window.cssProfileFixture);
 await page.evaluate(scale=>window.cssProfileFixture.setScale(scale),scale);
 await page.waitForFunction(scale=>window.cssProfileFixture.scale===scale,scale);
}
for(const scale of[1,2]){
 test(`unified NPC pagination preserves both source anchors at scale${scale}`,async({page})=>{
  await loaded(page,scale);const picker=page.locator('#css-profile-npc .mc-npc-skin-picker');
  const result=await picker.evaluate(node=>{const p=node.getBoundingClientRect();return Array.from(node.querySelectorAll('.mc-npc-skin-picker__previous,.mc-npc-skin-picker__next')).map(button=>{const b=button.getBoundingClientRect();return{x:b.x-p.x,y:b.y-p.y,width:b.width,height:b.height,position:getComputedStyle(button).position};});});
  expect(result).toEqual([{x:0,y:0,width:30*scale,height:65*scale,position:'absolute'},{x:271*scale,y:0,width:30*scale,height:65*scale,position:'absolute'}]);
 });
 test(`unified Jigsaw source label/input stacks have no extra gap at scale${scale}`,async({page})=>{
  await loaded(page,scale);
  for(const selector of['#css-profile-jigsaw .mc-jigsaw__field','#css-profile-priorities .mc-jigsaw__field']){
   const fields=page.locator(selector);expect(await fields.count()).toBeGreaterThan(0);
   for(const field of await fields.all()){
    expect(await field.evaluate(n=>getComputedStyle(n).gap)).toBe('0px');
    const parts=await field.evaluate(n=>{const label=n.querySelector('.mc-field__label')!.getBoundingClientRect(),input=n.querySelector('input')!.getBoundingClientRect();return{labelHeight:label.height,inputHeight:input.height,gap:input.y-label.bottom};});
    expect(parts).toEqual({labelHeight:10*scale,inputHeight:22*scale,gap:0});
   }
  }
 });
 test(`unified Command tick stack and Cancel keep source extents at scale${scale}`,async({page})=>{
  await loaded(page,scale);
  expect(await page.locator('.mc-command-block__ticks').evaluate(n=>getComputedStyle(n).gap)).toBe('0px');
  const cancel=page.locator('.mc-command-block__cancel');expect((await cancel.boundingBox())!.height).toBe(30*scale);
  expect(await cancel.evaluate(n=>({padding:getComputedStyle(n).padding,min:getComputedStyle(n).minHeight}))).toEqual({padding:'0px',min:'0px'});
 });
 test(`all Command dropdown states preserve the original right-arrow at scale${scale}`,async({page,isMobile})=>{
  await loaded(page,scale);const triggers=page.locator('.mc-command-block__settings .mc-combobox-trigger');await expect(triggers).toHaveCount(3);
  const arrow=async(index:number)=>{
   const data=await triggers.nth(index).locator('.mc-combobox-chevron').evaluate(async n=>{const r=n.getBoundingClientRect(),url=/url\("?(.*?)"?\)/.exec(getComputedStyle(n).backgroundImage)![1]!;return{width:r.width,height:r.height,bytes:Array.from(new Uint8Array(await(await fetch(url)).arrayBuffer()))};});
   expect([data.width,data.height]).toEqual([8*scale,8*scale]);
   expect(createHash('sha256').update(Buffer.from(data.bytes)).digest('hex')).toBe('4b7d2d5d5f7beed2eeeeebac93637b16ea1282c2796ecec8a27565fe07ac1b6f');
  };
  for(let index=0;index<3;index++){
   const trigger=triggers.nth(index);await page.mouse.move(0,0);await trigger.evaluate(n=>(n as HTMLElement).blur());await arrow(index);
   if(!isMobile){await trigger.hover();await arrow(index);}
   await trigger.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(trigger).toBeFocused();await arrow(index);
   await trigger.press('Enter');await expect(trigger).toHaveAttribute('aria-expanded','true');await arrow(index);await page.keyboard.press('Escape');await expect(trigger).toHaveAttribute('aria-expanded','false');
  }
 });
}
