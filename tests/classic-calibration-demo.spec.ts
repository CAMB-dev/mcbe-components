import {test,expect} from '@playwright/test';

test('combined GUI renders calibrated blocks at both scales and restores fallback on request',async({page})=>{
 test.setTimeout(90000);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/#gui-layer');const section=page.locator('[data-gui-layer-example]'),layer=section.locator('canvas.mc-enchanting-image-layer'),combo=section.getByRole('combobox',{name:/^Combined GUI scale/});
 const window=section.locator('.mc-enchanting-image-window');const modelCount=async()=>((await window.getAttribute('data-item-models'))??'').split(' ').filter(Boolean).length;
 await section.scrollIntoViewIfNeeded();await expect(layer).toHaveAttribute('data-render-state','ready',{timeout:30000});await expect.poll(modelCount).toBe(3);
 for(const label of ['GUI 4 · point text','GUI 5 · smooth labels']){
  const oldHeight=await layer.getAttribute('height');await combo.click();await page.getByRole('option',{name:label,exact:true}).click();
  await expect.poll(()=>layer.getAttribute('height')).not.toBe(oldHeight);await expect(layer).toHaveAttribute('data-render-state','ready',{timeout:30000});await expect.poll(modelCount).toBe(3);
 }
 const models=section.getByRole('switch',{name:'Use source block models',exact:true});await models.uncheck();await expect.poll(modelCount).toBe(0);await models.check();await expect(layer).toHaveAttribute('data-render-state','ready',{timeout:30000});await expect.poll(modelCount).toBe(3);expect(errors).toEqual([]);
});
