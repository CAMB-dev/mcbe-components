import {test,expect} from '@playwright/test';
import {PNG} from 'pngjs';
import {createHash} from 'node:crypto';
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
test('optional original TrueType preview edits, switches scale/shadow and releases its canvas',async({page})=>{
 test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#gui-layer');
 const summary=page.getByText('Original Classic TrueType atlas',{exact:true});await summary.scrollIntoViewIfNeeded();
 await expect(page.getByTestId('truetype-demo')).toHaveCount(0);await summary.click();
 const demo=page.getByTestId('truetype-demo');
 if(await demo.getByText(/本地未准备原始字体缓存/).count()){
  await expect(demo.locator('canvas')).toHaveCount(0);await summary.click();expect(errors).toEqual([]);return;
 }
 const canvas=demo.locator('canvas');await expect(canvas).toHaveAttribute('data-render-state','ready',{timeout:60000});
 const snapshot=async()=>PNG.sync.read(await canvas.screenshot()).data;
 const before=await snapshot(),first=before.subarray(0,4);expect(before.some((x,i)=>x!==first[i%4])).toBe(true);
 await demo.getByRole('combobox',{name:/TrueType GUI scale/}).click();await page.getByRole('option',{name:'GUI 5',exact:true}).click();
 await expect(demo).toHaveAttribute('data-gui-scale','5');await expect(canvas).toHaveAttribute('data-render-state','ready');
 await expect.poll(async()=>sha(await snapshot()),{timeout:15000}).not.toBe(sha(before));
 const scaled=sha(await snapshot());await demo.getByRole('switch',{name:'TrueType text shadow'}).click();
 await expect.poll(async()=>sha(await snapshot()),{timeout:15000}).not.toBe(scaled);
 const input=demo.getByRole('textbox',{name:'TrueType preview text'});await input.fill('字体');await expect(demo.getByRole('status')).toContainText('U+0000');await expect(canvas).toHaveCount(0);
 await input.fill('Minecraft 0123');await expect(canvas).toHaveAttribute('data-render-state','ready');await expect(demo).not.toHaveAttribute('data-render-error',/.+/);
 const box=await canvas.boundingBox();expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
 await summary.click();await expect(demo).toHaveCount(0);expect(errors).toEqual([]);
});
