import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';
async function open(page:Page){await page.goto('/calibration.html');await page.evaluate(()=>document.fonts.ready);}
function chat(page:Page,name:string){return page.getByRole('region',{name,exact:true});}

test('chat exposes polite ordered messages and omits optional input by default',async({page})=>{
 await open(page);const target=chat(page,'Readonly overlay chat'),log=target.getByRole('log');await expect(log).toHaveAttribute('aria-live','polite');await expect(log).toHaveAttribute('aria-relevant','additions text');await expect(log).toHaveAttribute('aria-atomic','false');await expect(log.locator('[data-message-id]')).toHaveText(['First message','Second message']);await expect(target.getByRole('textbox')).toHaveCount(0);await expect(target.locator('form')).toHaveCount(0);
});
test('chat keeps only the latest fifty native-factory entries in caller order',async({page})=>{
 await open(page);const rows=chat(page,'Bounded overlay chat').getByRole('log').locator('[data-message-id]');await expect(rows).toHaveCount(50);await expect(rows.first()).toHaveAttribute('data-message-id','10');await expect(rows.last()).toHaveAttribute('data-message-id','59');await expect(rows).toHaveText(Array.from({length:50},(_,index)=>`Message ${index+10}`));
});
test('uncontrolled chat sends trimmed text once and clears its draft',async({page})=>{
 await open(page);const target=chat(page,'Uncontrolled overlay chat'),input=target.getByRole('textbox'),send=target.getByRole('button',{name:'Send',exact:true});await expect(input).toHaveValue('  Hello Bedrock  ');await input.press('Enter');await expect(page.getByRole('status',{name:'Overlay chat sent',exact:true})).toHaveText('Hello Bedrock');await expect(input).toHaveValue('');await expect(send).toBeDisabled();await input.fill('   ');await expect(send).toBeDisabled();await input.press('Enter');await expect(page.getByRole('status',{name:'Overlay chat sent',exact:true})).toHaveText('Hello Bedrock');
});
test('controlled chat reports attempted edits and leaves draft ownership with the caller',async({page})=>{
 await open(page);const target=chat(page,'Controlled overlay chat'),input=target.getByRole('textbox');await input.fill('New draft');await expect(input).toHaveValue('Fixed draft');await expect(page.getByRole('status',{name:'Overlay chat attempted draft'})).toHaveText('New draft');await target.getByRole('button',{name:'Send',exact:true}).click();await expect(page.getByRole('status',{name:'Controlled overlay chat sent'})).toHaveText('Fixed draft');await expect(input).toHaveValue('Fixed draft');await expect(page.getByRole('status',{name:'Overlay chat attempted draft'})).toHaveText('');
});
test('disabled and unwired chats cannot submit through form events',async({page})=>{
 await open(page);const disabled=chat(page,'Disabled overlay chat');await expect(disabled.getByRole('textbox')).toBeDisabled();await expect(disabled.getByRole('button',{name:'Send'})).toBeDisabled();await disabled.locator('form').dispatchEvent('submit');await expect(page.getByRole('status',{name:'Overlay chat sent',exact:true})).toHaveText('');const unwired=chat(page,'Unwired overlay chat');await expect(unwired.getByRole('button',{name:'Send'})).toBeDisabled();await unwired.locator('form').dispatchEvent('submit');await expect(unwired.getByRole('textbox')).toHaveValue('Cannot send');
});
test('IME composition Enter does not submit before composition ends',async({page})=>{
 await open(page);const input=chat(page,'Uncontrolled overlay chat').getByRole('textbox');await input.fill('组合输入');await input.dispatchEvent('compositionstart');await input.press('Enter');await expect(page.getByRole('status',{name:'Overlay chat sent',exact:true})).toHaveText('');await expect(input).toHaveValue('组合输入');await input.dispatchEvent('compositionend');await input.press('Enter');await expect(page.getByRole('status',{name:'Overlay chat sent',exact:true})).toHaveText('组合输入');await expect(input).toHaveValue('');
});
test('new messages keep the end visible and preserve a reader who scrolled upward',async({page})=>{
 await open(page);const log=chat(page,'Dynamic overlay chat').getByRole('log'),append=page.getByRole('button',{name:'Add overlay message'});await log.scrollIntoViewIfNeeded();await expect.poll(()=>log.evaluate(node=>node.scrollHeight-node.clientHeight)).toBeGreaterThan(0);await expect.poll(()=>log.evaluate(node=>node.scrollHeight-node.clientHeight-node.scrollTop)).toBeLessThanOrEqual(4);await append.click();await expect(log.locator('[data-message-id]')).toHaveCount(41);await expect.poll(()=>log.evaluate(node=>node.scrollHeight-node.clientHeight-node.scrollTop)).toBeLessThanOrEqual(4);
 await log.evaluate(node=>{node.scrollTop=100;node.dispatchEvent(new Event('scroll',{bubbles:true}));});const before=await log.evaluate(node=>node.scrollTop);await append.click();await expect(log.locator('[data-message-id]')).toHaveCount(42);expect(Math.abs(await log.evaluate(node=>node.scrollTop)-before)).toBeLessThanOrEqual(1);
});
test('text overlays expose controlled opacity/background without automatic lifetime animation',async({page})=>{
 await open(page);const region=page.locator('[data-case="overlay-controlled"]'),overlays=region.locator('[data-controlled-overlay] > div');await expect(overlays).toHaveCount(3);for(const overlay of await overlays.all())await expect(overlay).toHaveCSS('opacity','1');await region.getByRole('button',{name:'Toggle overlay opacity'}).click();for(const overlay of await overlays.all()){await expect(overlay).toHaveCSS('opacity','0.25');await expect(overlay).toHaveCSS('animation-name','none');}await region.getByRole('button',{name:'Toggle overlay background'}).click();await expect(region.locator('.mc-action-bar__background,.mc-held-item-tooltip__background,.mc-title-overlay__title-background,.mc-title-overlay__subtitle-background')).toHaveCount(0);
});
test('source scoreboard order and nonvisual effect duration remain accessible',async({page})=>{
 await open(page);const board=page.locator('[data-case="overlay-scoreboard"]');await expect(board.getByRole('table',{name:'Scoreboard'})).toBeVisible();await expect(board.getByRole('columnheader')).toHaveText('Minecraft');await expect(board.getByRole('cell')).toHaveText(['Steve','30','Alex','7']);const effect=page.locator('[data-case="overlay-effect-speed"]').getByRole('img',{name:'Speed, 0:30'});await expect(effect).toHaveText('');await expect(effect).toHaveAttribute('title','Speed — 0:30');await expect(page.locator('[data-case="overlay-boss-clamped"] [role="meter"]')).toHaveAttribute('aria-valuenow','0');
});
test('native hidden attribute suppresses all eight overlay roots',async({page})=>{
 await open(page);const roots=page.locator('[data-hidden-overlays] > [hidden]');await expect(roots).toHaveCount(8);for(const root of await roots.all())await expect(root).toBeHidden();
});
