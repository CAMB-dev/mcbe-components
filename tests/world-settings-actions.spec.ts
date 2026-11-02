import {test,expect} from '@playwright/test';
const path='/demo/world-settings-actions-fixture.html';
const configure=async(page:import('@playwright/test').Page,next:Record<string,unknown>)=>page.evaluate(next=>(window as any).worldSettingsFixture.configure(next),next);
const events=async(page:import('@playwright/test').Page)=>page.evaluate(()=>(window as any).worldSettingsFixture.events);
test.beforeEach(async({page})=>{await page.goto(path);});
for(const edition of ['bedrock','education'])for(const mode of ['create','template-create','edit'])test(`${edition} ${mode}: exact source targets and EDU host payload`,async({page})=>{
  await configure(page,{edition,mode});const edit=mode==='edit';
  if(edition==='bedrock'){
    await page.locator('[data-world-launch-button=primary]').click();await page.locator('[data-world-launch-button=realms]').click();
    await expect.poll(()=>events(page)).toEqual([{target:edit?'play_world_button':'create_world_button',button:'primary',type:'click',control:'BUTTON'},
      {target:edit?'play_world_on_realm_button':'create_world_on_realm_button',button:'realms',type:'click',control:'BUTTON'}]);
  }else{
    await page.locator('[data-world-launch-button=play]').click();await page.locator('[data-world-launch-button=host]').click();
    await expect.poll(()=>events(page)).toEqual([false,true].map(shouldHost=>({target:edit?'play_world_edu_button':'create_world_edu_button',button:shouldHost?'host':'play',shouldHost,type:'click',control:'BUTTON'})));
  }
});
test('35-unit row, percent/fill widths, fractional half and editor ignored node',async({page})=>{
  await configure(page,{width:261,scale:2});const primary=page.locator('[data-world-launch-button=primary]'),realms=page.locator('[data-world-launch-button=realms]');
  expect((await primary.boundingBox())!.width).toBe(261);expect((await primary.boundingBox())!.height).toBe(70);expect((await realms.boundingBox())!.x-(await primary.boundingBox())!.x).toBe(261);
  await configure(page,{editor:true});await expect(realms).toHaveCount(0);expect((await primary.boundingBox())!.width).toBe(522);
});
test('visible false reserves or collapses only Realm half; not-pregame hides row',async({page})=>{
  await configure(page,{realmVisible:false});expect((await page.locator('[data-world-launch-button=primary]').boundingBox())!.width).toBe(130);await expect(page.locator('[data-world-launch-button=realms]')).toBeHidden();
  await configure(page,{hiddenSlots:'collapse'});await expect(page.locator('[data-world-launch-button=realms]')).toHaveCount(0);expect((await page.locator('[data-world-launch-button=primary]').boundingBox())!.width).toBe(260);
  await configure(page,{pregame:false});await expect(page.locator('.mc-world-launch-actions')).toHaveCount(0);
  expect(await page.evaluate(()=>Object.values((window as any).worldSettingsFixture.refs).every(value=>value===null))).toBe(true);
});
for(const veto of ['preventLeaf','preventAncestor','preventDocument'])test(`${veto} can veto the deferred request`,async({page})=>{
  await configure(page,{[veto]:true});await page.locator('[data-world-launch-button=primary]').click();await page.waitForTimeout(40);expect(await events(page)).toEqual([]);
});
test('commit during native click rejects stale target',async({page})=>{
  await configure(page,{changeOnClick:true});await page.locator('[data-world-launch-button=primary]').click();await page.waitForTimeout(40);expect(await events(page)).toEqual([]);await expect(page.locator('.mc-world-launch-actions')).toHaveAttribute('data-source-mode','edit');
});
test('disabled and inert block real or synthetic action requests and Tab skips inert row',async({page})=>{
  await configure(page,{disabled:true});await expect(page.locator('[data-world-launch-button=primary]')).toBeDisabled();
  await configure(page,{disabled:false,inert:true});await expect(page.locator('.mc-world-launch-actions')).toHaveAttribute('inert','');
  await page.locator('[data-world-launch-button=primary]').dispatchEvent('click');await page.waitForTimeout(40);expect(await events(page)).toEqual([]);
  await page.locator('#before').focus();await page.keyboard.press('Tab');await expect(page.locator('#after')).toBeFocused();
});
test('native modal owns input over sibling launch controls',async({page})=>{
  await page.locator('#open-native').click();await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('[data-world-launch-button=primary]').dispatchEvent('click');await page.waitForTimeout(40);expect(await events(page)).toEqual([]);
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toBeHidden();
});
test('source skins, text colors, fixed outer box and pressed label offset',async({page})=>{
  const button=page.locator('[data-world-launch-button=primary]'),label=button.locator('.mc-world-settings-action__content');
  const box=await button.boundingBox(),normalY=(await label.boundingBox())!.y;
  expect(await button.evaluate(node=>getComputedStyle(node).color)).toBe('rgb(77, 77, 77)');
  await button.focus();await page.keyboard.down('Space');expect((await label.boundingBox())!.y-normalY).toBe(1);expect(await button.boundingBox()).toEqual(box);
  await page.keyboard.up('Space');await expect.poll(()=>events(page)).toHaveLength(1);
  await configure(page,{disabled:true});await expect(button.locator('.mc-world-settings-action-locked')).toBeVisible();
  await page.emulateMedia({forcedColors:'active'});expect(await button.evaluate(node=>getComputedStyle(node).borderTopStyle)).toBe('solid');
});
test('all tone variants keep source disabled color and complete original skins',async({page})=>{
  await configure(page,{standalone:true});
  for(const tone of ['light','dark','realms']){
    await configure(page,{tone,disabled:false});const b=page.locator('.mc-world-settings-action');await expect(b.locator('.mc-world-settings-action-idle')).toBeVisible();
    await configure(page,{disabled:true});expect(await b.evaluate(node=>getComputedStyle(node).color)).toBe(tone==='light'?'rgb(77, 77, 77)':'rgb(179, 179, 179)');
  }
});
test('real callback refs clean up when source branch changes and unmounts',async({page})=>{
  expect(await page.evaluate(()=>(window as any).worldSettingsFixture.refs.primary?.tagName)).toBe('BUTTON');
  await configure(page,{edition:'education'});expect(await page.evaluate(()=>(window as any).worldSettingsFixture.refs.primary)).toBeNull();
  await configure(page,{mounted:false});expect(await page.evaluate(()=>Object.values((window as any).worldSettingsFixture.refs).every(value=>value===null))).toBe(true);
  expect(await page.evaluate(()=>(window as any).worldSettingsFixture.refEvents.some((v:string)=>v.endsWith(':cleanup')))).toBe(true);
});
