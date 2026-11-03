import {test,expect} from '@playwright/test';
test('real resource-pack count optionally uses the original atlas and leaves its header interactive',async({page})=>{
 test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#resource-packs');
 const demo=page.getByTestId('resource-pack-header-sampling'),toggle=demo.getByRole('switch',{name:'启用原版标题计数'});await toggle.scrollIntoViewIfNeeded();
 const canvas=demo.locator('.mc-resource-packs-header-text canvas');await expect(canvas).toHaveCount(0);if(await toggle.isDisabled()){expect(errors).toEqual([]);return;}
 await toggle.click();await expect(canvas).toHaveAttribute('data-render-state','ready',{timeout:60000});
 const header=demo.locator('button[aria-expanded]');await expect(header).toHaveAccessibleName(/图标采样.*0/);await header.click();await expect(header).toHaveAttribute('aria-expanded','true');await expect(canvas).toHaveAttribute('data-render-state','ready');
 await toggle.click();await expect(canvas).toHaveCount(0);await expect(header).toHaveAccessibleName(/图标采样.*0/);expect(errors).toEqual([]);
});
