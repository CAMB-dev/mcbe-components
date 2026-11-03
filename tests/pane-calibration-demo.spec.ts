import {test,expect} from '@playwright/test';
import {PNG} from 'pngjs';

test('pane calibration preview switches scale with whole source textures and releases its canvas',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('/#gui-layer');
 const section=page.locator('[data-gui-layer-example]'),summary=section.getByText('Calibrated glass pane',{exact:true});await summary.scrollIntoViewIfNeeded();await expect(section.getByTestId('pane-calibration-demo')).toHaveCount(0);await summary.click();
 const demo=section.getByTestId('pane-calibration-demo'),canvas=demo.locator('canvas');await expect(canvas).toHaveAttribute('data-render-state','ready');
 const before=PNG.sync.read(await canvas.screenshot({omitBackground:true})).data,first=before.subarray(0,4);expect(before.some((v,i)=>v!==first[i%4])).toBe(true);
 await demo.getByRole('combobox',{name:/^Glass pane GUI scale/}).click();await page.getByRole('option',{name:'GUI 5',exact:true}).click();await expect(demo).toHaveAttribute('data-gui-scale','5');await expect(canvas).toHaveAttribute('data-render-state','ready');await expect(demo).not.toHaveAttribute('data-render-error',/.+/);await expect(canvas).toHaveAttribute('width','128');await expect(canvas).toHaveAttribute('height','128');const after=PNG.sync.read(await canvas.screenshot({omitBackground:true})).data;expect(after.equals(before)).toBe(false);
 await summary.click();await expect(demo).toHaveCount(0);expect(errors).toEqual([]);
});
