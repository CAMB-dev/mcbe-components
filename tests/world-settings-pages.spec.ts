import{test,expect}from'@playwright/test';import type{Page}from'@playwright/test';import{readFile}from'node:fs/promises';
const schema=JSON.parse(await readFile(new URL('../docs/world-settings-fields-source.json',import.meta.url),'utf8'));
const cfg=(page:Page,patch:Record<string,unknown>)=>page.evaluate(p=>(window as any).worldFixture.configure(p),patch),logs=(page:Page)=>page.evaluate(()=>(window as any).worldFixture.events);
const field=(page:Page,id:string,family='game')=>page.locator(`[data-field-id="world_section.${family}_section/${id}"]`);
test.beforeEach(async({page})=>{await page.goto('/demo/world-settings-fixture.html');await page.locator('.mc-settings-frame').waitFor();await cfg(page,{width:Math.min(520,page.viewportSize()!.width-12)});});

test('actual Game root follows all canonical source gates and direct source order',async({page})=>{
 for(const mode of['create','template-create','edit']){
  await cfg(page,{mode});const snapshot=await page.evaluate(()=>(window as any).worldFixture.models().game),state=(v:boolean|string)=>typeof v==='boolean'?v:snapshot.bindings[v]??snapshot.conditions[v];
  const expected=schema.groups.game.filter((row:any)=>!state(row.state.ignored)&&state(row.state.visible)).map((row:any)=>row.key);
  expect(await page.locator('[data-world-settings-source=game]>.mc-settings-field-row').evaluateAll(rows=>rows.map(row=>row.getAttribute('data-field-id')))).toEqual(expected);
  await expect(field(page,'option_text_edit_0')).toHaveCount(mode==='create'?1:0);await expect(field(page,'option_text_edit_1')).toHaveCount(mode==='create'?0:1);
 }
});
test('source world-name and seed controls retain fixed maxLength, declared textbox identity and exact large text',async({page})=>{
 const name=field(page,'option_text_edit_0').locator('input');await expect(name).toHaveAttribute('data-source-text-box','world_name_text_box');await expect(name).toHaveAttribute('maxlength','30');await name.fill('具名快照');await expect(name).toHaveValue('具名快照');await expect.poll(()=>logs(page)).toContainEqual(expect.objectContaining({target:'#world_name',value:'具名快照'}));
 const seed=field(page,'level_seed_selector').locator('input');await seed.fill('18446744073709551615');await expect(seed).toHaveValue('18446744073709551615');await expect.poll(()=>logs(page)).toContainEqual(expect.objectContaining({target:'#world_seed',value:'18446744073709551615'}));
 await cfg(page,{autoAccept:false});await name.fill('拒绝的草稿');await expect(name).toHaveValue('具名快照');
});
test('actual game-mode choices preserve create-only gates, portal owner and source binding',async({page})=>{
 const trigger=field(page,'option_dropdown_0').getByRole('button');await trigger.click();const popup=page.locator('[data-popup-owner="world_section.game_section/option_dropdown_0"]');await expect(popup).toBeVisible();expect(await popup.evaluate(node=>node.parentElement?.getAttribute('data-source-popup-area'))).toBe('content_area');await expect(popup.getByRole('radio')).toHaveCount(2);
 await popup.getByRole('radio',{name:'创造',exact:true}).click();await expect.poll(()=>logs(page)).toContainEqual(expect.objectContaining({target:'#world_game_mode_radio_creative',value:true}));await expect(trigger).toContainText('创造');
 await cfg(page,{mode:'edit'});await field(page,'option_dropdown_0').getByRole('button').click();await expect(popup.getByRole('radio')).toHaveCount(3);await popup.getByRole('radio',{name:'冒险',exact:true}).click();await expect.poll(()=>logs(page)).toContainEqual(expect.objectContaining({target:'#world_game_mode_radio_adventure',value:true}));
});
test('raw permission source booleans remain independent and accepted operator uses exact binding',async({page})=>{
 await page.evaluate(()=>(window as any).worldFixture.raw('game',{'#show_permissions_dropdown':true,'#permission_level_radio_visitor':true,'#permission_level_radio_member':true}));
 const trigger=field(page,'option_dropdown_permissions').getByRole('button');await trigger.click();const popup=page.locator('[data-popup-owner="world_section.game_section/option_dropdown_permissions"]');await expect(popup.getByRole('radio').nth(0)).toHaveAttribute('aria-checked','true');await expect(popup.getByRole('radio').nth(1)).toHaveAttribute('aria-checked','true');
 await popup.getByRole('radio').nth(2).click();await expect.poll(()=>logs(page)).toContainEqual(expect.objectContaining({target:'#permission_level_radio_operator',value:true}));expect(await page.evaluate(()=>(window as any).worldFixture.models().game.bindings['#permission_level_radio_member'])).toBe(false);
});
test('actual locator bar has two original radio bindings and controlled accepted flags',async({page})=>{
 const choices=field(page,'player_waypoints_selector').getByRole('radio');await expect(choices).toHaveCount(2);await choices.first().click();await expect.poll(()=>logs(page)).toContainEqual(expect.objectContaining({target:'#player_waypoints_off',value:true}));expect(await page.evaluate(()=>(window as any).worldFixture.models().game.bindings['#player_waypoints_everyone'])).toBe(false);
});
test('source sliders keep original value and steps distinct from explicit Web acceptance',async({page})=>{
 const slider=field(page,'server_sim_distance_slider').locator('input');await slider.focus();await slider.press('ArrowRight');await expect.poll(()=>logs(page)).toContainEqual(expect.objectContaining({target:'#server_sim_distance',value:5,sourceValue:4,sourceSteps:4,mappingPolicy:'explicit-web-domain'}));await expect(slider).toHaveValue('5');
});
test('complete experimental collection reports the actual source name and runtime identity',async({page})=>{
 const rows=page.locator('[data-collection=experimental_toggles]');await expect(rows).toHaveCount(2);await rows.nth(1).locator('input').click();await expect.poll(()=>logs(page)).toContainEqual(expect.objectContaining({target:'#experimental_toggle_value',value:true,collection:{name:'experimental_toggles',index:1,id:'host-example-1'}}));await expect(rows.nth(1).locator('input')).toBeChecked();
});
test('Multiplayer warnings are plain labels and account-help is a URI intent with no navigation',async({page})=>{
 await cfg(page,{page:'multiplayer_button'});await page.evaluate(()=>(window as any).worldFixture.raw('multiplayer',{'#general_multiplayer_warning_label_visible':true,'#general_multiplayer_warning_text':'原版纯文字警告','#open_uri_button_visible':true}));
 await expect(page.getByText('原版纯文字警告',{exact:true})).toBeVisible();await expect(page.locator('[data-world-settings-source=multiplayer] .mc-settings-info')).toHaveCount(0);const url=page.url();await page.locator('[data-source-target="button.menu_open_uri"]').click();await expect.poll(()=>logs(page)).toContainEqual(expect.objectContaining({target:'button.menu_open_uri',uri:'https://aka.ms/MCMultiplayerHelp'}));expect(page.url()).toBe(url);
});
test('source edit management buttons are real panel children with independent intents',async({page})=>{
 await cfg(page,{mode:'edit'});const panel=field(page,'button_panel');await expect(panel).toHaveAttribute('data-field-kind','panel');await panel.locator('[data-source-target=export_world_button]').click();await expect.poll(()=>logs(page)).toContainEqual(expect.objectContaining({target:'export_world_button',control:'BUTTON'}));await page.locator('[data-source-target=copy_world_button]').click();await expect.poll(()=>logs(page)).toContainEqual(expect.objectContaining({target:'copy_world_button'}));
});
test('source language color tokens affect display while the accepted input value stays literal',async({page})=>{
 const info=page.locator('[data-field-id="world_section.game_section/experimental_toggles_label_info/text"]');await info.scrollIntoViewIfNeeded();await expect(info).not.toContainText('§7');await expect(info.locator('[data-settings-text-run]')).toHaveCSS('color','rgb(170, 170, 170)');
 await page.evaluate(()=>(window as any).worldFixture.raw('game',{'#world_name':'§7literal input'}));await expect(field(page,'option_text_edit_0').locator('input')).toHaveValue('§7literal input');
});
for(const veto of['vetoLeaf','vetoAncestor','vetoDocument'])test(`${veto} rejects the composed Frame back intent`,async({page})=>{
 await cfg(page,{[veto]:true});await page.getByRole('button',{name:'返回',exact:true}).click();await page.waitForTimeout(40);expect(await logs(page)).toEqual([]);
});
test('late document veto prevents a real source dropdown choice and preserves accepted flags',async({page})=>{
 await field(page,'option_dropdown_0').getByRole('button').click();await cfg(page,{vetoDocument:true});await page.locator('[data-popup-owner="world_section.game_section/option_dropdown_0"]').getByRole('radio',{name:'创造',exact:true}).click();await page.waitForTimeout(40);expect(await logs(page)).toEqual([]);expect(await page.evaluate(()=>(window as any).worldFixture.models().game.bindings['#world_game_mode_radio_creative'])).toBe(false);
});
test('inert and native modal owners reject synthetic disclosure and retained frame commands',async({page})=>{
 const trigger=field(page,'option_dropdown_0').getByRole('button');await cfg(page,{inert:true});await trigger.dispatchEvent('click');await expect(page.locator('.mc-settings-dropdown-popup')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).worldFixture.command('button.menu_cancel'))).toBe(false);
 await cfg(page,{inert:false});await page.locator('#native-open').click();await trigger.dispatchEvent('click');await expect(page.locator('.mc-settings-dropdown-popup')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).worldFixture.command('button.menu_cancel'))).toBe(false);
});
test('world navigation spans actual wrappers and mounts the actual pack manager',async({page})=>{
 const game=page.getByRole('radio',{name:'游戏',exact:true}),multi=page.getByRole('radio',{name:'多人游戏',exact:true});await game.focus();await game.press('ArrowDown');await expect(multi).toBeFocused();await multi.press('Space');await expect(page.locator('[data-world-settings-source=multiplayer]')).toBeVisible();await page.getByRole('radio',{name:'资源包',exact:true}).click();await expect(page.locator('.mc-resource-packs[data-source-profile=level]')).toBeVisible();
});
test('NX instance uses its distinct original glyph; server loading uses its explicit21×14 frame',async({page})=>{
 await cfg(page,{screen:'navigation',width:190,context:{nxOs:true}});const nx=page.locator('[data-settings-navigation-id=switch_game_button]');await expect(nx).toBeVisible();await expect(nx.locator('.mc-settings-navigation-section__outline-glyph')).toHaveAttribute('src',/controller_glyph_switch[.]png/);
 await cfg(page,{context:{nxOs:false,pregame:false},serverVisible:true,serverIcon:'loading',loadingFrame:7});const loading=page.locator('.mc-world-navigation__loading');await expect(loading).toBeVisible();expect(await loading.evaluate(n=>[n.getBoundingClientRect().width,n.getBoundingClientRect().height])).toEqual([21,14]);await expect(loading).toHaveAttribute('data-source-uv-frame','7');
});
test('current source snapshot replacement rejects a pending logical request',async({page})=>{
 await cfg(page,{changeOnInput:true});await field(page,'option_text_edit_0').locator('input').fill('stale pending');await page.waitForTimeout(40);expect(await logs(page)).toEqual([]);
});
test('native scrollbars remain hidden and all actual refs release after unmount',async({page})=>{
 expect(await page.locator('[data-source-pane=content]>.mc-scroll-area__viewport').evaluate(node=>getComputedStyle(node).scrollbarWidth)).toBe('none');expect(await page.evaluate(()=>(window as any).worldFixture.refs['world-input'].tagName)).toBe('INPUT');await cfg(page,{mounted:false});expect(await page.evaluate(()=>Object.values((window as any).worldFixture.refs).every(value=>value===null))).toBe(true);expect(await page.evaluate(()=>(window as any).worldFixture.retainedCommand('button.menu_cancel'))).toBe(false);
});
