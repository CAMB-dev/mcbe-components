import{test,expect}from'@playwright/test';
import type{Page}from'@playwright/test';
const url='/demo/settings-fixture.html';
const configure=(page:Page,patch:Record<string,unknown>)=>page.evaluate(p=>(window as any).settingsFixture.configure(p),patch);
const log=(page:Page)=>page.evaluate(()=>(window as any).settingsFixture.events);
const fields=(page:Page,id:string)=>page.locator(`[data-field-id="${id}"]`);
test.beforeEach(async({page})=>{await page.goto(url);await expect(page.locator('.mc-settings-frame')).toBeVisible();
 // Interaction cases use a consumer-resolved local frame inside the real visual
 // viewport. Explicit oversized geometry is tested separately below.
 await configure(page,{width:Math.min(520,page.viewportSize()!.width-12)});
});
test('actual frame follows source percentages, half-pixel titles and independent scroll panes',async({page})=>{
 await configure(page,{width:520});
 const root=(await page.locator('.mc-settings-frame').boundingBox())!,selector=(await page.locator('[data-source-pane=selector]').boundingBox())!,content=(await page.locator('[data-source-pane=content]').boundingBox())!,title=(await page.locator('[data-source-title=dialog]').boundingBox())!;
 expect([root.width,root.height]).toEqual([520,340]);expect([selector.x-root.x,selector.y-root.y,selector.width,selector.height]).toEqual([2,23,205,317]);
 expect([content.x-root.x,content.y-root.y,content.width,content.height]).toEqual([215,23,304,317]);
 expect([title.x-root.x,title.y-root.y,title.width,title.height]).toEqual([18,5.5,205,15]);
 expect(await page.locator('[data-source-pane=content]>.mc-scroll-area__viewport').evaluate(n=>n.clientWidth)).toBe(296);
 await configure(page,{header:17.5,footer:23});const middle=(await page.locator('[data-source-pane=content]').boundingBox())!;
 expect([middle.y-root.y,middle.height]).toEqual([40.5,276.5]);expect((await page.locator('[data-source-pane=selector]').boundingBox())!.height).toBe(317);
});
test('source paint visibility does not silently reclaim mouse slot; touch uses contained viewport',async({page})=>{
 await configure(page,{width:520});
 const viewport=page.locator('[data-source-pane=content]>.mc-scroll-area__viewport');
 await configure(page,{rail:false});expect(await viewport.evaluate(n=>n.clientWidth)).toBe(296);await expect(page.locator('[data-source-pane=content]>.mc-scrollbar')).toBeHidden();
 await configure(page,{inputMode:'touch'});expect(await viewport.evaluate(n=>n.clientWidth)).toBe(304);
});
test('fullscreen-content variant suppresses selector and global tab requests without browser fullscreen',async({page})=>{
 await configure(page,{width:520,variant:'fullscreen-content'});await expect(page.locator('[data-source-pane=selector]')).toHaveCount(0);await expect(page.locator('.mc-settings-frame__divider')).toHaveCount(0);
 const root=(await page.locator('.mc-settings-frame').boundingBox())!,content=(await page.locator('[data-source-pane=content]').boundingBox())!;expect([content.x-root.x,content.width]).toEqual([52,416]);
 expect(await page.evaluate(()=>(window as any).settingsFixture.command('button.menu_tab_left'))).toBe(false);expect(await page.evaluate(()=>document.fullscreenElement)).toBeNull();
});
test('navigation focus moves independently from controlled selection and retains source forced indices',async({page})=>{
 await configure(page,{autoAccept:false});const game=page.getByRole('radio',{name:'游戏',exact:true}),multi=page.getByRole('radio',{name:'多人游戏',exact:true});
 await game.focus();await page.keyboard.press('ArrowDown');await expect(multi).toBeFocused();await expect(game).toHaveAttribute('aria-checked','true');expect(await log(page)).toEqual([]);
 await page.keyboard.press('Space');await expect.poll(()=>log(page)).toContainEqual(expect.objectContaining({kind:'navigation',target:'multiplayer_button_toggle',value:'multiplayer'}));await expect(game).toHaveAttribute('aria-checked','true');
 await expect(game).toHaveAttribute('data-source-forced-index','4');
});
test('controlled text emits source binding and accepts only host data',async({page})=>{
 const input=fields(page,'option_text_edit_0').locator('input');await input.fill('Test world');
 await expect.poll(()=>log(page)).toContainEqual(expect.objectContaining({kind:'field',target:'#world_name',proposed:'Test world',control:'INPUT'}));await expect(input).toHaveValue('Test world');
 await configure(page,{autoAccept:false});await input.fill('Rejected draft');await expect(input).toHaveValue('Test world');
});
test('toggle, range and two raw radio flags report actual controls and exact bindings',async({page})=>{
 await fields(page,'is_hardcore_toggle').locator('input').click();await expect.poll(()=>log(page)).toContainEqual(expect.objectContaining({target:'#is_hardcore',proposed:true}));
 const slider=fields(page,'server_sim_distance_slider').locator('input');await slider.focus();await slider.press('ArrowRight');await expect.poll(()=>log(page)).toContainEqual(expect.objectContaining({target:'#server_sim_distance',proposed:8}));
 const none=fields(page,'player_waypoints_selector').getByRole('radio').nth(1);await none.click();await expect.poll(()=>log(page)).toContainEqual(expect.objectContaining({target:'#player_waypoints_show_none',proposed:true}));
});
test('dropdown portals to the actual content_area descendant and source choice owns Escape',async({page})=>{
 const trigger=fields(page,'option_dropdown_0').getByRole('button');await expect(trigger).toHaveAccessibleName('默认游戏模式 生存');await trigger.click();const popup=page.locator('[data-popup-owner=option_dropdown_0]');await expect(popup).toBeVisible();
 expect(await popup.evaluate(node=>node.parentElement?.getAttribute('data-source-popup-area'))).toBe('content_area');
 const t=(await trigger.boundingBox())!,p=(await popup.boundingBox())!;expect(p.x).toBeCloseTo(t.x,4);expect(p.y+p.height).toBeCloseTo(t.y,4);
 await page.keyboard.press('Escape');await expect(popup).toHaveCount(0);expect(await log(page)).toEqual([]);await expect(trigger).toBeFocused();
 await trigger.click();await popup.getByRole('radio',{name:'创造',exact:true}).click();await expect.poll(()=>log(page)).toContainEqual(expect.objectContaining({target:'#world_game_mode_creative',proposed:true}));await expect(popup).toHaveCount(0);await expect(trigger).toContainText('创造');await expect(trigger).toHaveAccessibleName('默认游戏模式 创造');
});
test('permission popup retains rich source choices and field ownership',async({page})=>{
 const trigger=fields(page,'option_dropdown_permissions').getByRole('button');await expect(trigger).toHaveAccessibleName('默认玩家权限 成员');await trigger.scrollIntoViewIfNeeded();await trigger.click();const popup=page.locator('[data-popup-owner=option_dropdown_permissions]');await expect(popup).toBeVisible();
 await expect(popup.getByText('建造和交互。',{exact:true})).toBeVisible();await popup.getByRole('radio',{name:/操作员/}).click();await expect.poll(()=>log(page)).toContainEqual(expect.objectContaining({kind:'field',target:'#permission_operator',control:'BUTTON'}));
});
test('horizontal source stack keeps its one-unit independent spacer and reports button intents',async({page})=>{
 const row=fields(page,'management_row');await row.scrollIntoViewIfNeeded();
 const a=(await fields(page,'export_world').boundingBox())!,b=(await fields(page,'delete_world').boundingBox())!;
 expect(b.x-a.x-a.width).toBe(1);expect(a.height).toBe(30);
 await fields(page,'export_world').getByRole('button').click();await expect.poll(()=>log(page)).toContainEqual(expect.objectContaining({target:'export_world_button',kind:'field'}));
});
for(const veto of['vetoLeaf','vetoAncestor','vetoDocument'])test(`${veto}: native back propagation can veto the source exit request`,async({page})=>{
 await configure(page,{[veto]:true});await page.getByRole('button',{name:'返回',exact:true}).click();await page.waitForTimeout(50);expect(await log(page)).toEqual([]);
});
test('late document veto blocks a dropdown choice source request',async({page})=>{
 const trigger=fields(page,'option_dropdown_0').getByRole('button');await trigger.click();await configure(page,{vetoDocument:true});
 await page.locator('[data-popup-owner=option_dropdown_0]').getByRole('radio',{name:'创造',exact:true}).click();await page.waitForTimeout(50);expect(await log(page)).toEqual([]);
});
test('synchronous native caller update invalidates pending frame and field requests',async({page})=>{
 await configure(page,{changeOnInput:true});await page.getByRole('button',{name:'返回',exact:true}).click();await page.waitForTimeout(50);expect(await log(page)).toEqual([]);
 await configure(page,{disabled:false});await fields(page,'option_text_edit_0').locator('input').fill('Stale');await page.waitForTimeout(50);expect(await log(page)).toEqual([]);
});
test('inert and a native modal reject synthetic dropdown opening and logical frame requests',async({page})=>{
 await configure(page,{inert:true});await fields(page,'option_dropdown_0').getByRole('button').dispatchEvent('click');await page.waitForTimeout(40);await expect(page.locator('.mc-settings-dropdown-popup')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).settingsFixture.command('button.menu_cancel'))).toBe(false);
 await configure(page,{inert:false});await page.locator('#native-open').click();await fields(page,'option_dropdown_0').getByRole('button').dispatchEvent('click');await page.waitForTimeout(40);await expect(page.locator('.mc-settings-dropdown-popup')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).settingsFixture.command('button.menu_cancel'))).toBe(false);
 await page.keyboard.press('Escape');expect(await log(page)).toEqual([]);
});
test('frame Escape and controller preserve only source global mappings',async({page})=>{
 await page.locator('.mc-settings-frame').focus();await page.keyboard.press('Escape');await expect.poll(()=>log(page)).toContainEqual({kind:'frame',target:'button.menu_exit',origin:'keyboard'});
 expect(await page.evaluate(()=>(window as any).settingsFixture.command('button.menu_tab_right'))).toBe(true);await expect.poll(()=>log(page)).toContainEqual({kind:'frame',target:'button.menu_tab_right',origin:'controller'});
});
test('long labels stay within explicit root dimensions and native document scrollbars do not appear',async({page})=>{
 await configure(page,{width:241,height:300,longTitles:true});const frame=(await page.locator('.mc-settings-frame').boundingBox())!;expect([frame.width,frame.height]).toEqual([241,300]);
 expect(await page.locator('.mc-settings-frame').evaluate(node=>getComputedStyle(node).overflow)).toBe('hidden');
 expect(await page.locator('[data-source-pane=content]>.mc-scroll-area__viewport').evaluate(node=>getComputedStyle(node).scrollbarWidth)).toBe('none');
});
test('actual callback refs and controller release after unmount',async({page})=>{
 await expect.poll(()=>page.evaluate(()=>(window as any).settingsFixture.refs['world-input']?.tagName)).toBe('INPUT');
 await configure(page,{mounted:false});expect(await page.evaluate(()=>Object.values((window as any).settingsFixture.refs).every(value=>value===null))).toBe(true);expect(await page.evaluate(()=>(window as any).settingsFixture.command('button.menu_cancel'))).toBe(false);
 expect(await page.evaluate(()=>(window as any).settingsFixture.refEvents.some((value:string)=>value.endsWith(':cleanup')))).toBe(true);
});
