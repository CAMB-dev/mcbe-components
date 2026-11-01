import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {verifyAxeWithPaintedContrast} from './helpers/painted-contrast';
const section=(page:Page)=>page.locator('#file-transmission');
async function loaded(page:Page){await page.goto('/#file-transmission');await page.evaluate(()=>document.fonts.ready);await expect(page.getByTestId('file-transmission-demo-open')).toBeEnabled();}
async function open(page:Page){await page.getByTestId('file-transmission-demo-open').click();await expect(page.getByRole('dialog',{name:'文件传输界面预览'})).toBeVisible();}
async function close(page:Page){await page.keyboard.press('Escape');await expect(page.getByTestId('file-transmission-demo-overlay')).toHaveCount(0);await expect(page.getByTestId('file-transmission-demo-open')).toBeFocused();}
test('public file transmission loads real fonts and opens a complete integer source canvas',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await loaded(page);expect(await page.evaluate(()=>['MCBE Pixel','MCBE CJK'].every(name=>[...document.fonts].some(f=>f.family===name&&f.status==='loaded')))).toBe(true);
 await expect(page.locator('.sidebar-link[aria-current="location"]')).toHaveAttribute('href','#file-transmission');await open(page);
 const dialog=page.getByRole('dialog',{name:'文件传输界面预览'}),canvas=page.locator('.file-transmission-demo__canvas'),box=await canvas.boundingBox(),viewport=page.viewportSize()!;
 expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(viewport.width);expect(box!.y+box!.height).toBeLessThanOrEqual(viewport.height);
 const panel=await dialog.locator('.mc-file-transmission-panel').boundingBox();expect(panel!.width/268).toBe(panel!.height/95);expect([1,2]).toContain(panel!.width/268);
 expect(await dialog.locator('[data-file-transmission-text-role]').first().evaluate(n=>getComputedStyle(n).fontFamily)).toContain('MCBE Pixel');
 expect(await dialog.evaluate(n=>{n.scrollTo(10,10);return[getComputedStyle(n).overflow,n.scrollTop,n.scrollLeft];})).toEqual(['clip',0,0]);
 await info.attach('public-file-transmission.png',{body:await canvas.screenshot(),contentType:'image/png'});await close(page);expect(errors).toEqual([]);
});
test('public parts, warning/play actions and independent bindings stay controlled',async({page})=>{
 test.setTimeout(60000);await loaded(page);const part=page.getByTestId('file-transmission-demo-panel');await expect(part.locator('.mc-file-transmission-panel')).toBeVisible();await expect(page.getByTestId('file-transmission-demo-progress').locator('.mc-file-transfer-progress')).toBeVisible();
 await section(page).getByRole('button',{name:'移动数据提示示例',exact:true}).click();await open(page);const dialog=page.getByRole('dialog',{name:'文件传输界面预览'});await expect(dialog.getByText('当前使用移动数据，继续传输可能产生费用。',{exact:true})).toBeVisible();await dialog.getByRole('button',{name:'继续',exact:true}).click();await expect(dialog.getByRole('button',{name:'取消',exact:true})).toBeVisible();await expect(page.getByTestId('file-transmission-demo-log')).toContainText('button.file_upload_wifi_warning_continue');await close(page);
 await section(page).getByRole('button',{name:'完成示例',exact:true}).click();await open(page);await dialog.getByRole('button',{name:'开始',exact:true}).click();await expect(dialog).toContainText('已接纳开始请求');await close(page);
 await section(page).getByRole('button',{name:'传输示例',exact:true}).click();await section(page).locator('summary').filter({hasText:'独立显示绑定与文字'}).click();await section(page).getByLabel('双标题',{exact:true}).check();await expect(section(page).getByLabel('单标题',{exact:true})).toBeChecked();await section(page).getByLabel('单标题文字',{exact:true}).fill('测试标题');await open(page);await expect(dialog.getByText('测试标题',{exact:true})).toBeVisible();await expect(dialog.getByText('发送资源',{exact:true})).toBeVisible();await close(page);
});
test('public native-click veto and readonly preserve the independent exit path',async({page})=>{
 await loaded(page);await section(page).getByLabel('原生点击 veto',{exact:true}).check();await open(page);const dialog=page.getByRole('dialog',{name:'文件传输界面预览'});await dialog.getByRole('button',{name:'取消',exact:true}).click();await page.waitForTimeout(25);await expect(dialog).toBeVisible();await close(page);
 await section(page).getByLabel('原生点击 veto',{exact:true}).uncheck();await section(page).getByLabel('只读',{exact:true}).check();await open(page);await dialog.getByRole('button',{name:'取消',exact:true}).click({force:true});await page.waitForTimeout(25);await expect(dialog).toBeVisible();await close(page);
});
test('narrow touch preview stays within viewport and backdrop exits without click-through',async({page,hasTouch})=>{
 await page.setViewportSize({width:390,height:844});await loaded(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await open(page);
 const box=await page.locator('.file-transmission-demo__canvas').boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(390);expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThanOrEqual(844);
 const overlay=page.getByTestId('file-transmission-demo-overlay');if(hasTouch)await overlay.tap({position:{x:4,y:4}});else await overlay.click({position:{x:4,y:4}});await expect(overlay).toHaveCount(0);await expect(page.getByTestId('file-transmission-demo-open')).toBeFocused();
});
test('public file preview retains raw Axe and checks image-backed text closed and modal',async({page},info)=>{
 test.setTimeout(90000);await loaded(page);const closed=await new AxeBuilder({page}).include('#file-transmission').analyze();await verifyAxeWithPaintedContrast(page,closed.violations,info,'file-transmission-closed');await open(page);const modal=await new AxeBuilder({page}).include('.mc-file-transmission-screen').analyze();await verifyAxeWithPaintedContrast(page,modal.violations,info,'file-transmission-modal');await close(page);
});
