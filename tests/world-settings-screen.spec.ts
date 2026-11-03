import{test,expect}from'@playwright/test';import type{Page}from'@playwright/test';
const cfg=(page:Page,p:Record<string,unknown>)=>page.evaluate(p=>(window as any).worldScreenFixture.configure(p),p),view=(page:Page,p:Record<string,boolean>)=>page.evaluate(p=>(window as any).worldScreenFixture.view(p),p),context=(page:Page,p:Record<string,boolean>)=>page.evaluate(p=>(window as any).worldScreenFixture.context(p),p),logs=(page:Page)=>page.evaluate(()=>(window as any).worldScreenFixture.events),clear=(page:Page)=>page.evaluate(()=>(window as any).worldScreenFixture.clear());
const mount=(page:Page,id:string)=>page.locator('[data-world-settings-mount='+id+']'),field=(page:Page,id:string,family='game')=>page.locator(`[data-field-id="world_section.${family}_section/${id}"]`);
async function server(page:Page){await context(page,{pregame:false});await page.locator('[data-settings-navigation-id=server_settings_button]').click();await expect(mount(page,'server')).toBeVisible();await clear(page);}
test.beforeEach(async({page})=>{await page.goto('/demo/world-settings-screen-fixture.html');await page.locator('.mc-world-settings-screen').waitFor();await cfg(page,{width:Math.min(520,page.viewportSize()!.width-12)});await expect(page.locator('.mc-world-navigation')).toHaveAttribute('data-material-state','ready');});
test('fixed alias mounts source stacks and leaves actual world header/footer empty',async({page})=>{
 expect(await page.locator('[data-world-settings-mount]').evaluateAll(n=>n.map(e=>e.getAttribute('data-world-settings-mount')))).toEqual(['game','multiplayer','level','addon']);await expect(page.locator('.mc-settings-frame__header,.mc-settings-frame__footer')).toHaveCount(0);
 for(const mode of['create','template-create','edit']){await cfg(page,{mode});await expect(page.locator('.mc-world-settings-screen')).toHaveAttribute('data-world-settings-mode',mode);await expect(field(page,'option_text_edit_0')).toHaveCount(mode==='create'?1:0);}
});
test('controlled selector and raw panel view flags remain independent',async({page})=>{
 await cfg(page,{autoAccept:false});await page.locator('[data-settings-navigation-id=multiplayer_button]').click();await expect.poll(()=>logs(page)).toContainEqual(expect.objectContaining({kind:'navigation',value:'multiplayer_button'}));await expect(mount(page,'game')).toBeVisible();await expect(mount(page,'multiplayer')).toBeHidden();
 await view(page,{game_button_toggle:false,multiplayer_button_toggle:true});await expect(mount(page,'multiplayer')).toBeVisible();await expect(page.locator('[data-settings-navigation-id=game_button]')).toHaveAttribute('aria-checked','true');
});
test('inactive modules retain actual native inputs, drafts and refs across page changes',async({page})=>{
 const input=field(page,'option_text_edit_0').locator('input'),node=await input.elementHandle();await input.fill('保留的世界');await expect(input).toHaveValue('保留的世界');await page.locator('[data-settings-navigation-id=multiplayer_button]').click();await expect(mount(page,'game')).toBeHidden();await expect(mount(page,'game')).toHaveAttribute('inert','');await page.locator('[data-settings-navigation-id=game_button]').click();expect(await input.evaluate((n,old)=>n===old,node)).toBe(true);await expect(input).toHaveValue('保留的世界');
});
test('source World and Packs groups overlap while their own children stack',async({page})=>{
 await view(page,{game_button_toggle:true,multiplayer_button_toggle:true,level_texture_pack_button_toggle:true,addon_button_toggle:true});const game=(await mount(page,'game').boundingBox())!,multi=(await mount(page,'multiplayer').boundingBox())!,level=(await mount(page,'level').boundingBox())!,addon=(await mount(page,'addon').boundingBox())!;expect(level.x).toBe(game.x);expect(level.y).toBe(game.y);expect(multi.y).toBeCloseTo(game.y+game.height,4);expect(addon.y).toBeCloseTo(level.y+level.height,4);
});
test('reserve policy retains invisible allocations and inert suppresses hidden source intents',async({page})=>{
 await cfg(page,{hiddenSlots:'reserve'});expect((await mount(page,'multiplayer').boundingBox())!.height).toBeGreaterThan(0);await clear(page);await mount(page,'multiplayer').locator('input').first().dispatchEvent('click');await page.waitForTimeout(30);expect(await logs(page)).toEqual([]);
});
for(const scale of[1,2])test(`GUI${scale} server owns exact W−4 offset2, nine factories and independent32 submit`,async({page})=>{
 await cfg(page,{scale});await server(page);const root=page.locator('.mc-world-server-settings'),generated=root.locator('[data-source-control="server_form.generated_contents"]'),submit=root.getByRole('button',{name:'提交服务器设置',exact:true});expect(await root.locator('[data-server-field-type]').evaluateAll(ns=>ns.map(n=>n.getAttribute('data-server-field-type')))).toEqual(['header','label','toggle','slider','step_slider','dropdown','input','divider','multiselect']);
 const a=(await root.boundingBox())!,b=(await generated.boundingBox())!,c=(await submit.boundingBox())!;expect(b.x-a.x).toBe(2*scale);expect(b.width).toBeCloseTo(a.width-4*scale,4);expect(c.height).toBe(32*scale);expect(c.y-b.y).toBe(430*scale);await expect(root.locator('.mc-server-form__title')).toHaveCount(0);await expect(submit).toHaveAttribute('data-source-text-binding-condition','once');
});
test('server accepts only host values and submits the current controlled collection',async({page})=>{
 await server(page);const input=page.locator('[data-server-field-id=name] input');await input.fill('已接受值');await expect(input).toHaveValue('已接受值');await cfg(page,{autoAccept:false});await input.fill('拒绝值');await expect(input).toHaveValue('已接受值');await page.getByRole('button',{name:'提交服务器设置',exact:true}).click();await expect.poll(()=>logs(page)).toContainEqual(expect.objectContaining({kind:'server-submit',target:'button.submit_custom_form',value:expect.objectContaining({name:'已接受值'})}));
});

test('server multiselect accessible name includes its live visible summary',async({page})=>{
 await server(page);const row=page.locator('[data-server-field-id=features]'),button=row.getByRole('button'),map=row.getByRole('checkbox',{name:'地图',exact:true});await expect(button).toHaveAccessibleName('功能: 聊天');await button.click();await map.click();await expect(map).toBeChecked();await expect(button).toHaveText('聊天, 地图');await expect(button).toHaveAccessibleName('功能: 聊天, 地图');
});
for(const veto of['vetoAncestor','vetoDocument'])test(`${veto} cancels an actual server option and submit`,async({page})=>{
 await server(page);const combo=page.getByRole('combobox',{name:'模式',exact:true});await combo.click();await cfg(page,{[veto]:true});await page.getByRole('option',{name:'创造',exact:true}).click();await page.waitForTimeout(35);expect(await logs(page)).toEqual([]);await expect(combo).toContainText('生存');await page.getByRole('button',{name:'提交服务器设置',exact:true}).click();await page.waitForTimeout(35);expect(await logs(page)).toEqual([]);
});
test('real range input and keyboard combobox selection retain accepted values',async({page})=>{
 await server(page);const range=page.getByRole('slider',{name:'范围',exact:true});await range.focus();await range.press('ArrowRight');await expect.poll(()=>logs(page)).toContainEqual(expect.objectContaining({kind:'server-value',nativeOwnerMatches:true,value:expect.objectContaining({distance:5})}));await clear(page);const combo=page.getByRole('combobox',{name:'模式',exact:true});await combo.focus();await combo.press('Enter');await combo.press('ArrowDown');await combo.press('Enter');await expect.poll(()=>logs(page)).toContainEqual(expect.objectContaining({kind:'server-value',nativeOwnerMatches:true,value:expect.objectContaining({mode:'creative'})}));
});
test('Debug keeps source English, exactly150 raw options and real override binding',async({page})=>{
 await context(page,{debugSettings:true,publish:false});await page.locator('[data-settings-navigation-id=debug_button]').click();const debug=page.locator('[data-world-settings-source=debug]');await expect(debug).toBeVisible();await debug.locator('[data-field-id="world_section.debug_section/spawn_dimension_dropdown"]').getByRole('button').click();let popup=page.locator('[data-popup-owner="world_section.debug_section/spawn_dimension_dropdown"]');await expect(popup.getByRole('radio')).toHaveCount(2);await popup.getByRole('radio',{name:'Nether',exact:true}).click();await expect.poll(()=>logs(page)).toContainEqual(expect.objectContaining({kind:'field',section:'debug',target:'#debug_spawn_in_nether',value:true}));
 for(const id of['spawn_biome_dropdown','biome_override_dropdown']){await debug.locator(`[data-field-id="world_section.debug_section/${id}"]`).getByRole('button').click();popup=page.locator(`[data-popup-owner="world_section.debug_section/${id}"]`);await expect(popup.getByRole('radio')).toHaveCount(74);await page.keyboard.press('Escape');}
 await expect(debug).toContainText('Host base-game-version example');
});
test('all real pack managers mount with source-specific aliases and host profile flags',async({page})=>{
 for(const[button,profile]of[['level_texture_pack_button','level'],['addon_button','addon']] as const){await page.locator('[data-settings-navigation-id='+button+']').click();const manager=mount(page,profile).locator('.mc-resource-packs');await expect(manager).toHaveAttribute('data-source-profile',profile);await expect(manager).toHaveAttribute('data-declared-suggested-offers',profile==='level'?'true':'false');}
});
test('readOnly permits navigation while launch and field mutations stay blocked',async({page})=>{
 await cfg(page,{readOnly:true});await expect(page.locator('[data-world-launch-button=primary]')).toBeDisabled();await page.locator('[data-settings-navigation-id=multiplayer_button]').click();await expect(mount(page,'multiplayer')).toBeVisible();await clear(page);await mount(page,'multiplayer').locator('input').first().dispatchEvent('click');await page.waitForTimeout(35);expect(await logs(page)).toEqual([]);
});
test('external Classroom adapter uses the fixed source seam and honors late veto',async({page})=>{
 await cfg(page,{classroomAdapter:true});await page.evaluate(()=>{const f=(window as any).worldScreenFixture,p=f.props();f.updateSnapshot({context:{...p.snapshot.context,educationEdition:true},views:{...p.snapshot.views,game_button_toggle:false},pages:{...p.snapshot.pages,classroom:{visible:true,height:40,data:{qualification:'external fixture only'}}}});});await expect(mount(page,'classroom')).toBeVisible();await cfg(page,{vetoDocument:true});await page.getByRole('button',{name:'External request',exact:true}).click();await page.waitForTimeout(35);expect(await logs(page)).toEqual([]);await cfg(page,{vetoDocument:false});await page.getByRole('button',{name:'External request',exact:true}).click();await expect.poll(()=>logs(page)).toContainEqual(expect.objectContaining({kind:'classroom',target:'external.test.classroom'}));
});
test('cloud uses source underline, explicit original-image provider and no automatic URI navigation',async({page})=>{
 await cfg(page,{cloudOnly:true});const uri=page.url(),help=page.locator('.mc-world-cloud-underline');await expect(help).toBeVisible();await expect(help.locator('.mc-world-cloud-underline__line')).toHaveCSS('opacity','0.6');await expect(page.locator('[data-field-kind=image] img')).toHaveAttribute('src',/external-link[.]png/);await help.click();await expect.poll(()=>logs(page)).toContainEqual(expect.objectContaining({kind:'field',section:'cloud'}));expect(page.url()).toBe(uri);
});
test('native modal, inert and unmount release actual refs and retained controllers',async({page})=>{
 await cfg(page,{inert:true});await field(page,'option_dropdown_0').getByRole('button').dispatchEvent('click');await expect(page.locator('.mc-settings-dropdown-popup')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).worldScreenFixture.command('button.menu_cancel'))).toBe(false);await cfg(page,{inert:false});await page.locator('#native-open').click();await field(page,'option_dropdown_0').getByRole('button').dispatchEvent('click');await expect(page.locator('.mc-settings-dropdown-popup')).toHaveCount(0);await page.keyboard.press('Escape');await cfg(page,{mounted:false});expect(await page.evaluate(()=>Object.values((window as any).worldScreenFixture.refs).every(v=>v===null))).toBe(true);expect(await page.evaluate(()=>(window as any).worldScreenFixture.retainedCommand('button.menu_cancel'))).toBe(false);
});
test('current native source replacement rejects a pending field request',async({page})=>{
 await cfg(page,{replaceDuringInput:true});await field(page,'option_text_edit_0').locator('input').fill('stale');await page.waitForTimeout(35);expect(await logs(page)).toEqual([]);
});
test('reparented live server input loses request ownership even while still connected',async({page})=>{
 await server(page);await cfg(page,{reparentInput:true});await page.locator('[data-server-field-id=name] input').fill('foreign value');await expect(page.locator('#foreign input')).toHaveCount(1);await page.waitForTimeout(35);expect(await logs(page)).toEqual([]);
});
test('reparented live server submit loses its local source owner',async({page})=>{
 await server(page);await cfg(page,{reparentSubmit:true});await page.getByRole('button',{name:'提交服务器设置',exact:true}).click();await expect(page.locator('#foreign button')).toHaveCount(1);await page.waitForTimeout(35);expect(await logs(page)).toEqual([]);
});
