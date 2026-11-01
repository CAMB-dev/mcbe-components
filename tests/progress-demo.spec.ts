import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFileSync} from 'node:fs';
import {verifyAxeWithPaintedContrast} from './helpers/painted-contrast';

const section=(page:Page)=>page.locator('#progress-screen');
async function loaded(page:Page){await page.goto('/#progress-screen');await page.evaluate(()=>document.fonts.ready);await expect(page.getByTestId('progress-demo-open')).toBeEnabled();}
async function choose(page:Page,label:string,value:string){await expect(page.locator('#progress-demo-screen')).toBeHidden();await section(page).getByRole('combobox',{name:label,exact:true}).click();await page.getByRole('option',{name:value,exact:true}).click();}
async function open(page:Page){await page.getByTestId('progress-demo-open').click();await expect(page.locator('#progress-demo-screen')).toBeVisible();}
async function close(page:Page){await page.keyboard.press('Escape');await expect(page.locator('#progress-demo-screen')).toBeHidden();}
async function canvasFits(page:Page,overlay='progress-demo-overlay'){
 const canvas=page.getByTestId(overlay).locator('.progress-demo__source-canvas');
 const box=await canvas.boundingBox();expect(box).not.toBeNull();
 const viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));
 expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.y).toBeGreaterThanOrEqual(0);
 expect(box!.x+box!.width).toBeLessThanOrEqual(viewport.width);expect(box!.y+box!.height).toBeLessThanOrEqual(viewport.height);
}

test('public showcase loads real Pixel/CJK fonts, deep-links and renders controlled source canvas',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await loaded(page);
 expect(await page.evaluate(()=>['MCBE Pixel','MCBE CJK'].every(name=>[...document.fonts].some(f=>f.family===name&&f.status==='loaded')))).toBe(true);
 await expect(page.locator('.sidebar-link[aria-current="location"]')).toHaveAttribute('href','#progress-screen');
 await open(page);await canvasFits(page);const screen=page.locator('#progress-demo-screen');await expect(screen).toHaveAttribute('data-source-route','world_loading_progress_screen');
 expect(await screen.locator('[data-progress-text-role="progress"]').first().evaluate(n=>getComputedStyle(n).fontFamily)).toContain('MCBE Pixel');
 expect(await screen.evaluate(n=>{n.scrollTo(10,10);return[getComputedStyle(n).overflow,n.scrollTop,n.scrollLeft];})).toEqual(['clip',0,0]);
 await info.attach('natural-open-source-progress.png',{body:await screen.screenshot(),contentType:'image/png'});
 await close(page);await expect(page.getByTestId('progress-demo-open')).toBeFocused();expect(errors).toEqual([]);
});

test('all fifteen public route options mount, with explicit provider selection for Realms',async({page})=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await loaded(page);await section(page).getByLabel('教育版',{exact:true}).check();await section(page).getByLabel('云存档',{exact:true}).check();
 const routes=[['基础入口','progress_screen'],['模态进度','modal_progress_screen'],['删除进度','delete_progress_screen'],['世界加载','world_loading_progress_screen'],['体验世界加载','experience_world_loading_progress_screen'],['主世界加载','overworld_loading_progress_screen'],['下界加载','nether_loading_progress_screen'],['末地加载','theend_loading_progress_screen'],['世界保存','world_saving_progress_screen'],['获取教育云世界','fetching_edu_cloud_worlds'],['下载教育云世界','edu_cloud_download_progress_screen'],['获取教育服务器','fetching_edu_servers'],['加入教育服务器','joining_edu_server'],['世界转换','world_convert_modal_progress_screen']] as const;
 for(const[label,route]of routes)await test.step(label,async()=>{await choose(page,'源界面',label);await open(page);await expect(page.locator('#progress-demo-screen')).toHaveAttribute('data-source-route',route);await close(page);});
 await choose(page,'源界面','Realms 加载');await expect(page.getByTestId('progress-demo-open')).toBeDisabled();
 // Explicit whole host input exercises the unresolved provider; this does not
 // certify navy_blue.png as the missing native Realms base template.
 await page.getByTestId('progress-demo-realms-file').setInputFiles({name:'explicit-test-whole-provider.png',mimeType:'image/png',buffer:readFileSync('src/assets/progress/ui/navy_blue.png')});
 await expect(page.getByTestId('progress-demo-open')).toBeEnabled();await open(page);await expect(page.locator('#progress-demo-screen')).toHaveAttribute('data-source-route','realms_stories_loading_progress_screen');await close(page);expect(errors).toEqual([]);
});

test('public parts preview exposes controlled pack choices and independently opens both source dialogs',async({page})=>{
 test.setTimeout(60000);
 await loaded(page);await choose(page,'部件预览','资源包列表');const input=section(page).locator('[data-progress-part="pack-grids"] input[name="optional_resourcepacks"]').first();await input.click();await expect(input).not.toBeChecked();
 await section(page).getByLabel('接纳包选择',{exact:true}).uncheck();await input.click();await expect(input).not.toBeChecked();
 for(const part of ['资源包弹窗','版本冲突弹窗']){await choose(page,'部件预览',part);await page.getByTestId('progress-demo-part-open').click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);}
 await choose(page,'部件预览','云进度面板');await page.getByTestId('progress-demo-part-open').click();await expect(page.locator('[data-progress-part="cloud-panel"]')).toBeVisible();await section(page).getByRole('button',{name:'关闭部件',exact:true}).click();await expect(page.locator('[data-progress-part="cloud-panel"]')).toHaveCount(0);
});

test('public preview retains raw Axe and verifies reported image-backed text closed and in its source modal',async({page},info)=>{
 test.setTimeout(90000);
 await loaded(page);const closed=await new AxeBuilder({page}).include('#progress-screen').analyze();await verifyAxeWithPaintedContrast(page,closed.violations,info,'progress-closed');
 await open(page);const opened=await new AxeBuilder({page}).include('#progress-demo-screen').analyze();await verifyAxeWithPaintedContrast(page,opened.violations,info,'progress-world-modal');
 await close(page);
});

test('narrow public preview shows the complete source canvas and closes by backdrop without reopening',async({page,hasTouch})=>{
 test.setTimeout(60000);
 await page.setViewportSize({width:390,height:844});await loaded(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await open(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await canvasFits(page);
 const outside=async(id:string)=>{const overlay=page.getByTestId(id);if(hasTouch)await overlay.tap({position:{x:4,y:4}});else await overlay.click({position:{x:4,y:4}});};
 await outside('progress-demo-overlay');await expect(page.locator('#progress-demo-screen')).toBeHidden();await expect(page.getByTestId('progress-demo-open')).toBeFocused();await expect(page.getByTestId('progress-demo-overlay')).toHaveCount(0);
 for(const part of ['资源包弹窗','版本冲突弹窗']){await choose(page,'部件预览',part);await page.getByTestId('progress-demo-part-open').click();await expect(page.getByRole('dialog')).toBeVisible();await canvasFits(page,'progress-demo-part-overlay');await outside('progress-demo-part-overlay');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByTestId('progress-demo-part-open')).toBeFocused();}
});

test('short desktop preview reduces integer scale and backdrop dismisses only the active source layer',async({page})=>{
 test.setTimeout(60000);await page.setViewportSize({width:1440,height:700});await loaded(page);
 await section(page).getByLabel('教育版',{exact:true}).check();await section(page).getByLabel('云存档',{exact:true}).check();await choose(page,'源界面','世界保存');
 await section(page).locator('summary').filter({hasText:'进度、帧与弹窗设置'}).click();await choose(page,'资源包弹窗','资源包选择器');await section(page).getByLabel('云版本冲突',{exact:true}).check();await open(page);await canvasFits(page);
 expect((await page.getByTestId('progress-demo-overlay').locator('.progress-demo__source-canvas').boundingBox())!.height).toBe(320);
 const layers=page.locator('#progress-demo-screen [data-progress-modal-layer]');await expect(layers).toHaveCount(2);
 await page.getByTestId('progress-demo-overlay').click({position:{x:4,y:4}});await expect(layers).toHaveCount(1);await expect(page.locator('#progress-demo-screen')).toBeVisible();
 const optional=page.locator('#progress-demo-screen input[name="optional_resourcepacks"]').first();await optional.click();await expect(optional).not.toBeChecked();await expect(page.locator('#progress-demo-screen [data-progress-resource-factory]')).toBeVisible();
 await page.getByTestId('progress-demo-overlay').click({position:{x:4,y:4}});await expect(layers).toHaveCount(0);await expect(page.locator('#progress-demo-screen')).toBeVisible();
 await page.getByTestId('progress-demo-overlay').click({position:{x:4,y:4}});await expect(page.locator('#progress-demo-screen')).toBeHidden();await expect(page.getByTestId('progress-demo-open')).toBeFocused();
});
