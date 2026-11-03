import {expect,test} from '@playwright/test';

test('Crafting preview switches raster allocation and GUI scale without replacing the semantic root',async({page},info)=>{
 test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/#crafting-layer');
 const demo=page.locator('[data-crafting-layer-example]'),canvas=demo.locator('.mc-crafting-image-layer');
 await demo.scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.ready);
 await expect(canvas).toHaveAttribute('data-render-state','ready',{timeout:30000});await expect(canvas).toHaveAttribute('width','1280');await expect(canvas).toHaveAttribute('height','720');
 await demo.locator('.mc-crafting-screen').evaluate(node=>{(window as unknown as {rasterRoot:Element}).rasterRoot=node;});
 await demo.getByRole('combobox',{name:/^Crafting raster allocation/}).click();await page.getByRole('option',{name:'Window · WebGL',exact:true}).click();
 await expect.poll(()=>canvas.evaluate(node=>(node as HTMLCanvasElement).width)).toBeLessThan(1280);await expect(canvas).toHaveAttribute('data-render-state','ready');
 await demo.getByRole('combobox',{name:/^Crafting raster allocation/}).click();await page.getByRole('option',{name:'Full frame · top-left',exact:true}).click();
 await expect(canvas).toHaveAttribute('data-render-state','ready',{timeout:30000});await expect(canvas).toHaveAttribute('width','1280');
 for(const scale of ['4','5']){
  await demo.getByRole('combobox',{name:/^Crafting GUI scale/}).click();await page.getByRole('option',{name:`GUI ${scale} · 2570 × 1402`,exact:true}).click();
  await expect(canvas).toHaveAttribute('data-render-state','ready',{timeout:30000});await expect(canvas).toHaveAttribute('width','2570');await expect(canvas).toHaveAttribute('height','1402');
 }
 expect(await demo.locator('.mc-crafting-screen').evaluate(node=>node===(window as unknown as {rasterRoot:Element}).rasterRoot)).toBe(true);
 await expect(demo.locator('.mc-crafting-image-error')).toHaveCount(0);expect(errors).toEqual([]);
 await info.attach('crafting-raster-preview',{body:await page.screenshot(),contentType:'image/png'});
});
