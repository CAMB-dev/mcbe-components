import {expect,test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type {Page,Locator} from '@playwright/test';
import type {ResourcePacksFixtureSettings} from '../demo/resource-packs-fixture';

// Source contracts: fixed official resource_packs / pack_settings JSON. These
// tests qualify Web behavior and literal geometry, not native RGBA fidelity.
const url='/demo/resource-packs-fixture.html';
async function configure(page:Page,patch:Partial<ResourcePacksFixtureSettings>){await page.evaluate(value=>window.resourcePacksFixture.configure(value),patch);}
async function events(page:Page,kind='action'){return page.evaluate(k=>window.resourcePacksFixture.events.filter(e=>e.kind===k),kind);}
async function dimensions(locator:Locator){return locator.evaluate(el=>{const b=el.getBoundingClientRect();return{width:b.width,height:b.height};});}
async function load(page:Page,patch:Partial<ResourcePacksFixtureSettings>={}){await page.addInitScript(value=>{window.resourcePacksFixtureInitial=value;},patch);await page.goto(url);await expect(page.locator('#fixture-state')).toBeVisible();}
const pageErrors=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{const errors:string[]=[];pageErrors.set(page,errors);page.on('pageerror',error=>errors.push(error.message));});
test.afterEach(async({page})=>{expect(pageErrors.get(page)??[],'uncaught fixture errors').toEqual([]);});

for(const profile of ['global','level','addon']as const)test(`manager ${profile}: actual aliases and independent count`,async({page})=>{
  await load(page,{profile,headerCount:'99'});
  await expect(page.locator('.mc-resource-packs-factory[data-source-factory="selected_pack_factory"]')).toHaveAttribute('data-source-collection',`#selected_pack_items_${profile}`);
  await expect(page.locator('.mc-resource-packs-section__count').first()).toHaveText('99');
  const count=await page.locator('[data-pack-kind=selected]').count();expect(count).toBeGreaterThan(0);expect(count).not.toBe(99);
  await expect(page.locator('.mc-resource-packs-section')).toHaveCount(4);
});

test('all profile headers expose their complete visible label and raw count',async({page})=>{
  await load(page,{profile:'global',headerCount:'99'});
  for(const profile of ['global','level','addon']as const){
    await configure(page,{profile});await expect(page.locator('.mc-resource-packs')).toHaveAttribute('data-source-profile',profile);
    const headers=page.locator('.mc-resource-packs-section__header > button[aria-expanded]');await expect(headers).toHaveCount(4);
    for(let index=0;index<4;index++){
      const header=headers.nth(index);await expect(header).toBeVisible();expect(await header.evaluate(node=>node.hasAttribute('aria-label'))).toBe(false);
      const label=await header.locator('.mc-resource-packs-section__title').innerText();
      const literal=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
      await expect(header).toHaveAccessibleName(new RegExp(literal));await expect(header).toHaveAccessibleName(/99/);
      await expect(header.locator('.mc-resource-packs-section__count')).toHaveText('99');
    }
    expect(await page.locator('[data-pack-kind=selected]').count()).not.toBe(99);
    const result=await new AxeBuilder({page}).include('.mc-resource-packs').withRules(['label-content-name-mismatch']).analyze();
    expect(result.violations,`${profile} visible header labels must match computed names`).toEqual([]);
  }
});

test('manager uses ordered vertical sections and source default row',async({page})=>{
  await load(page);expect(await page.locator('.mc-resource-packs-section').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-source-section')))).toEqual(['selected','available','realms','unowned']);
  const row=page.locator('[data-source-control="selected_pack_section.default_item"]');await expect(row).toBeVisible();expect((await dimensions(row)).height).toBe(44);
  const boxes=await page.locator('.mc-resource-packs-section').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().top));for(let i=1;i<boxes.length;i++)expect(boxes[i]).toBeGreaterThanOrEqual(boxes[i-1]!);
});

for(const scale of [1,2,3,5])test(`source header content has both six-unit insets and independent button states at scale ${scale}`,async({page})=>{
  await load(page,{part:'section',kind:'unowned',width:140,scale,managerBindings:{selectedGridVisible:false}});
  const button=page.locator('.mc-resource-packs-section__header > button[aria-expanded]');
  const content=button.locator(':scope > .mc-resource-packs-button__content'),heading=button.locator('.mc-resource-packs-section__heading');
  const snapshot=()=>button.evaluate(node=>{
    const bounds=node.getBoundingClientRect(),content=node.querySelector('.mc-resource-packs-button__content')!.getBoundingClientRect(),heading=node.querySelector('.mc-resource-packs-section__heading')!.getBoundingClientRect(),title=node.querySelector('.mc-resource-packs-section__title')!;
    return{content:{x:content.x-bounds.x,y:content.y-bounds.y,width:content.width,height:content.height},heading:{x:heading.x-bounds.x,y:heading.y-bounds.y,width:heading.width,height:heading.height},color:getComputedStyle(title).color};
  });
  await page.mouse.move(0,0);
  const rest=await snapshot();
  // new_ui_button_panel.button_content is 100%-6 in each axis; the nested
  // selected_packs_title_content applies its own additional width of 100%-6.
  expect(rest.content).toEqual({x:3*scale,y:3*scale,width:134*scale,height:14*scale});
  expect(rest.heading).toEqual({x:6*scale,y:2.5*scale,width:128*scale,height:15*scale});
  expect(rest.color).toBe('rgb(77, 77, 77)'); // CSS computed value, not native .3 quantization.
  await button.hover();await expect(heading).toHaveCSS('color','rgb(255, 255, 255)');
  const hover=await snapshot();expect(hover.content).toEqual(rest.content);expect(hover.heading).toEqual(rest.heading);
  await page.mouse.down();
  try{const pressed=await snapshot();expect(pressed.color).toBe('rgb(255, 255, 255)');expect(pressed.content).toEqual({...rest.content,y:rest.content.y+scale});expect(pressed.heading).toEqual({...rest.heading,y:rest.heading.y+scale});}
  finally{await page.mouse.up();}
  await configure(page,{disabled:true});await expect(button).toBeDisabled();
  const locked=await snapshot();expect(locked.content).toEqual(rest.content);expect(locked.heading).toEqual(rest.heading);expect(locked.color).toBe('rgb(77, 77, 77)');
  await configure(page,{disabled:false,readOnly:true});await expect(button).toBeDisabled();expect((await snapshot()).color).toBe('rgb(77, 77, 77)');
  await expect(content).toBeVisible();
});

test('level checkbox is independent from source ancestor enabled state',async({page})=>{
  await load(page,{profile:'level',managerBindings:{forcePackDownloadEnabled:true,forcePackDownloadLocked:true,forceUserAgreement:true,forceUserAgreementEnabled:false}});
  const checkbox=page.locator('.mc-resource-packs input[type=checkbox]');await expect(checkbox).toBeChecked();await expect(checkbox).toBeDisabled();
  await configure(page,{managerBindings:{forcePackDownloadEnabled:true,forcePackDownloadLocked:true,forceUserAgreement:false,forceUserAgreementEnabled:true}});await expect(checkbox).not.toBeChecked();await expect(checkbox).toBeEnabled();
});

for(const [binding,section]of [['selectedGridVisible','selected'],['availableGridVisible','available'],['realmsGridVisible','realms'],['unownedGridVisible','unowned']]as const)test(`${binding} hides its body without deriving count`,async({page})=>{
  await load(page,{managerBindings:{[binding]:false}});const owner=page.locator(`[data-source-section=${section}]`);await expect(owner.locator('.mc-resource-packs-section__body')).toBeHidden();await expect(owner.locator('.mc-resource-packs-section__count')).toHaveText('99');
});

test('available empty branch can coexist with independently materialized invalid rows',async({page})=>{
  await load(page,{managerBindings:{noAvailablePacks:true,availableGridVisible:true}});await expect(page.locator('[data-source-control="available_packs_section.empty_panel"]')).toBeVisible();await expect(page.locator('[data-source-factory="invalid_pack_factory"]')).toBeVisible();
});

test('education ignored branches remove unowned and empty panel without removing selected',async({page})=>{
  await load(page,{educationEdition:true,managerBindings:{noAvailablePacks:true}});await expect(page.locator('[data-source-section=unowned]')).toHaveCount(0);await expect(page.locator('[data-source-control="available_packs_section.empty_panel"]')).toHaveCount(0);await expect(page.locator('[data-source-section=selected]')).toBeVisible();
});

test('collection kind does not imply selected row state',async({page})=>{
  await load(page,{part:'item',kind:'selected',itemBindings:{isSelected:false,directionVisible:false}});await expect(page.locator('.mc-resource-pack-item')).toHaveAttribute('data-pack-kind','selected');await expect(page.locator('.mc-resource-pack-item')).toHaveAttribute('data-row-selected','false');
  const hitbox=page.locator('[data-pack-action=select]');await expect(hitbox).toHaveText('');await expect(hitbox).toHaveAccessibleName('Select selected example');
  await configure(page,{kind:'available',itemBindings:{isSelected:true,directionVisible:false}});await expect(page.locator('.mc-resource-pack-item')).toHaveAttribute('data-row-selected','true');
});

test('intrinsic row has a minimum50 and grows with explicit main extent',async({page})=>{
  await load(page,{part:'item',itemBindings:{directionVisible:false},mainHeight:40});expect((await dimensions(page.locator('.mc-resource-pack-item'))).height).toBe(50);
  await configure(page,{mainHeight:100});expect((await dimensions(page.locator('.mc-resource-pack-item'))).height).toBe(107);
});

test('read-more needs both independent raw flags',async({page})=>{
  await load(page,{part:'item',itemBindings:{isReadMore:true,isReadLess:false,usingEllipses:false,directionVisible:false}});await expect(page.locator('[data-pack-action=read-toggle]')).toHaveCount(0);
  await configure(page,{itemBindings:{isReadMore:true,isReadLess:false,usingEllipses:true,directionVisible:false}});await expect(page.locator('[data-pack-action=read-toggle]')).toHaveCount(1);
  await configure(page,{itemBindings:{isReadMore:false,isReadLess:false,usingEllipses:true,directionVisible:false}});await expect(page.locator('[data-pack-action=read-toggle]')).toHaveCount(0);
});

test('expanded and small source text remain independent',async({page})=>{
  await load(page,{part:'item',itemBindings:{isReadMore:true,isReadLess:true,usingEllipses:true,directionVisible:false}});await expect(page.locator('.mc-rp-item__visual--default [data-source-text-state=small]')).toBeVisible();await expect(page.locator('.mc-rp-item__visual--default [data-source-text-state=full]')).toBeVisible();await expect(page.locator('[data-pack-action=read-toggle]')).toHaveCount(2);
});

test('source actions tray is24 high with six selected actions',async({page})=>{
  await load(page,{part:'actions',itemBindings:{directionVisible:true,isSelected:true},actionBindings:{directionVisible:true,isSelected:true,canMove:true,canGoToStore:true,canSortUp:true,canSortDown:true,hasPackSettings:true,reportButtonVisible:true,reportGenerating:false}});expect((await dimensions(page.locator('.mc-resource-pack-actions'))).height).toBe(24);expect(await page.locator('[data-pack-action]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-pack-action')))).toEqual(['remove','store','options','up','down','report']);
});

test('add and remove retain same source move-left target',async({page})=>{
  await load(page,{part:'actions',kind:'selected',itemBindings:{isSelected:true,directionVisible:true},actionBindings:{canMove:true}});await page.locator('[data-pack-action=remove]').click();await expect.poll(()=>events(page)).toHaveLength(1);const remove=(await events(page))[0]!;
  await page.evaluate(()=>window.resourcePacksFixture.clear());await configure(page,{kind:'available'});await page.locator('[data-pack-action=add]').click();await expect.poll(()=>events(page)).toHaveLength(1);expect((await events(page))[0]!.target).toBe(remove.target);expect(remove.target).toBe('button.move_left_level');
});

test('select requests never masquerade as movement or optimistically select',async({page})=>{
  await load(page,{part:'item',itemBindings:{isSelected:false,directionVisible:false}});await page.locator('[data-pack-action=select]').click();await expect.poll(()=>events(page)).toHaveLength(1);expect((await events(page))[0]).toMatchObject({action:'select',target:'button.selected_pack_level',currentTargetMatches:true});await expect(page.locator('.mc-resource-pack-item')).toHaveAttribute('data-row-selected','false');
});

test('diagnostic flags coexist and use original asset URLs',async({page})=>{
  await load(page,{part:'diagnostics',diagnostics:{hasErrors:true,hasWarnings:true,hasExpired:true,errorFree:true,reportGenerating:true,loadingFrame:3}});expect(await page.locator('[data-diagnostic]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-diagnostic')))).toEqual(['error','warning','success','generating']);
  const sources=await page.locator('.mc-resource-pack-diagnostics img').evaluateAll(nodes=>nodes.map(n=>(n as HTMLImageElement).src));expect(sources.length).toBeGreaterThan(3);expect(sources.every(src=>!src.startsWith('data:image/svg'))).toBe(true);await expect(page.locator('[data-frame]')).toHaveAttribute('data-frame','3');
});

for(const veto of ['leaf','ancestor-react','ancestor-native']as const)test(`${veto} cancellation stops deferred row request`,async({page})=>{
  await load(page,{part:'item',veto,itemBindings:{directionVisible:false}});await page.locator('[data-pack-action=select]').click();await expect.poll(()=>page.evaluate(()=>window.resourcePacksFixture.events.some(e=>e.kind==='native'&&e.layer===window.resourcePacksFixture.settings.veto))).toBe(true);await page.waitForTimeout(30);expect(await events(page)).toHaveLength(0);
});

test('ancestor unmount cancels a queued semantic request and refs clear',async({page})=>{
  await load(page,{part:'item',unmountOnBubble:true,itemBindings:{directionVisible:false}});await page.locator('[data-pack-action=select]').click();await expect(page.locator('.mc-resource-pack-item')).toHaveCount(0);await page.waitForTimeout(30);expect(await events(page)).toHaveLength(0);expect(await page.evaluate(()=>window.resourcePacksFixture.refs.item.current)).toBeNull();
});

test('readonly and disabled lock row action requests',async({page})=>{
  await load(page,{part:'item',readOnly:true});await expect(page.locator('[data-pack-action=select]')).toBeDisabled();await configure(page,{readOnly:false,disabled:true});await expect(page.locator('[data-pack-action=select]')).toBeDisabled();expect(await events(page)).toHaveLength(0);
});

test('PackSettings exact source frame, content, mouse reserve and slider',async({page})=>{
  await load(page,{part:'settings'});expect(await dimensions(page.locator('.mc-pack-settings-screen__panel'))).toEqual({width:370,height:250});expect(await dimensions(page.locator('.mc-pack-settings-screen__content'))).toEqual({width:354,height:219});expect((await dimensions(page.locator('.mc-pack-settings-content__stack'))).width).toBe(339);expect(await dimensions(page.locator('.mc-pack-content-tier__track'))).toEqual({width:321,height:10});expect(await dimensions(page.locator('.mc-pack-content-tier__thumb'))).toEqual({width:10,height:16});
});

test('touch content is contained and has no extra Play minus one',async({page})=>{
  await load(page,{part:'content',inputMode:'touch'});expect((await dimensions(page.locator('.mc-pack-settings-content__stack'))).width).toBe(346);await expect(page.locator('.mc-scroll-area')).toHaveAttribute('data-variant','touch');
});

test('generated nine real row factories add no form, frame or submit',async({page})=>{
  await load(page,{part:'content'});expect(await page.locator('[data-server-field-type]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-server-field-type')))).toEqual(['header','label','divider','input','toggle','slider','step_slider','dropdown','multiselect']);await expect(page.locator('form,.mc-server-form__skin,.mc-server-form__scroll,.mc-server-custom-form__submit')).toHaveCount(0);await expect(page.locator('.mc-scroll-area')).toHaveCount(1);
});

test('tier unsupported is red but enabled; hiding tier preserves generated rows',async({page})=>{
  await load(page,{part:'content',supportedTier:false});await expect(page.getByRole('slider',{name:'Content tier'})).toBeEnabled();await expect(page.locator('.mc-pack-content-tier__label')).toHaveCSS('color','rgb(255, 0, 0)');await configure(page,{hasTier:false});await expect(page.locator('.mc-pack-content-tier')).toBeHidden();await expect(page.locator('[data-server-field-id=profile-name]')).toBeVisible();
});

test('raw source value/steps are independent from accepted Web range domain',async({page})=>{
  await load(page,{part:'tier',sourceValue:900,sourceSteps:-2.5,webValue:25});await expect(page.locator('.mc-pack-content-tier')).toHaveAttribute('data-source-value','900');await expect(page.locator('.mc-pack-content-tier')).toHaveAttribute('data-source-steps','-2.5');await expect(page.getByRole('slider',{name:'Content tier'})).toHaveValue('25');await configure(page,{webDomain:{min:0,max:100,step:10},webValue:40});await expect(page.getByRole('slider',{name:'Content tier'})).toHaveAttribute('max','100');await expect(page.getByRole('slider',{name:'Content tier'})).toHaveValue('40');await expect(page.locator('.mc-pack-content-tier')).toHaveAttribute('data-source-steps','-2.5');
});

test('controlled range accepts or restores value without changing source snapshot',async({page})=>{
  await load(page,{part:'tier'});const range=page.getByRole('slider',{name:'Content tier'});await range.focus();await range.press('ArrowRight');await expect.poll(()=>events(page,'tier')).toHaveLength(1);await expect(range).toHaveValue('30');await configure(page,{acceptValues:false});await range.press('ArrowRight');await expect.poll(()=>events(page,'tier')).toHaveLength(2);await expect(range).toHaveValue('30');expect((await events(page,'tier'))[1]).toMatchObject({sourceValue:.6,sourceSteps:4,previousValue:30});
});

test('late ancestor veto restores range and prevents semantic callback',async({page})=>{
  await load(page,{part:'tier',veto:'ancestor-react',vetoEvent:'change'});const range=page.getByRole('slider',{name:'Content tier'});await range.focus();await range.press('ArrowRight');await expect(range).toHaveValue('25');await page.waitForTimeout(30);expect(await events(page,'tier')).toHaveLength(0);
});

test('modal closes only on accepted request and returns original focus',async({page})=>{
  await load(page,{part:'settings',open:false,acceptClose:false});await page.locator('#fixture-outside').focus();await configure(page,{open:true});await page.locator('.mc-pack-settings-screen__close').click();await expect.poll(()=>events(page,'close')).toHaveLength(1);await expect(page.locator('.mc-pack-settings-screen')).toBeVisible();await configure(page,{acceptClose:true});await page.locator('.mc-pack-settings-screen__close').click();await expect(page.locator('.mc-pack-settings-screen')).toBeHidden();await expect(page.locator('#fixture-outside')).toBeFocused();
});

test('IME and modified Escape do not close, readonly plain Escape may request',async({page})=>{
  await load(page,{part:'settings',readOnly:true});const input=page.locator('[data-server-field-id=profile-name] input');await input.focus();await input.dispatchEvent('compositionstart');await input.press('Escape');await input.dispatchEvent('compositionend');await input.press('Control+Escape');await page.waitForTimeout(30);expect(await events(page,'close')).toHaveLength(0);await input.press('Escape');await expect.poll(()=>events(page,'close')).toHaveLength(1);
});

test('descendant composition stopPropagation cannot hide IME scope from screen',async({page})=>{
  await load(page,{part:'settings'});
  const input=page.locator('[data-server-field-id=profile-name] input');await input.focus();
  await input.evaluate(element=>{
    element.addEventListener('keydown',event=>{const key=event as KeyboardEvent;if(key.key==='Escape'){element.setAttribute('data-escape-composing',String(key.isComposing));element.setAttribute('data-escape-keycode',String(key.keyCode));}});
    for(const type of ['compositionstart','compositionend'])element.addEventListener(type,event=>{
      // This is a real target listener, before the document/root bubble phase.
      // The screen must observe composition during capture, not by relying on
      // a descendant allowing its synthetic bubble handler to run.
      element.setAttribute(`data-stopped-${type}`,'true');event.stopPropagation();
    });
    element.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,cancelable:true,data:'测'}));
  });
  await expect(input).toHaveAttribute('data-stopped-compositionstart','true');
  // The dispatched CompositionEvent does not put Chromium's keyboard into
  // native IME mode. This ordinary Escape deliberately has no isComposing flag.
  await input.press('Escape');await expect(input).toHaveAttribute('data-escape-composing','false');await expect(input).not.toHaveAttribute('data-escape-keycode','229');await page.waitForTimeout(30);expect(await events(page,'close')).toHaveLength(0);
  await input.evaluate(element=>element.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,cancelable:true,data:'测'})));
  await expect(input).toHaveAttribute('data-stopped-compositionend','true');await input.press('Escape');
  await expect.poll(()=>events(page,'close')).toHaveLength(1);
});

test('modal Tab trap stays within dialog without assuming initial focus',async({page})=>{
  await load(page,{part:'settings'});const close=page.locator('.mc-pack-settings-screen__close');await close.focus();await page.keyboard.press('Shift+Tab');expect(await page.evaluate(()=>!!window.resourcePacksFixture.refs.panel.current?.contains(document.activeElement))).toBe(true);await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!window.resourcePacksFixture.refs.panel.current?.contains(document.activeElement))).toBe(true);
});

test('generated dropdown Escape dismisses its listbox before modal close request',async({page})=>{
  await load(page,{part:'settings'});const trigger=page.locator('[data-server-field-id=color-profile] .mc-combobox-trigger');await trigger.click();await expect(page.getByRole('listbox')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('listbox')).toBeHidden();await page.waitForTimeout(30);expect(await events(page,'close')).toHaveLength(0);
});

test('unmount/remount clears actual refs and obtains fresh modal owner',async({page})=>{
  await load(page,{part:'settings'});expect(await page.evaluate(()=>!!window.resourcePacksFixture.refs.range.current)).toBe(true);await page.evaluate(()=>window.resourcePacksFixture.unmount());expect(await page.evaluate(()=>Object.values(window.resourcePacksFixture.refs).every(ref=>ref.current===null))).toBe(true);await page.evaluate(()=>window.resourcePacksFixture.remount());await expect(page.locator('.mc-pack-settings-screen')).toBeVisible();expect(await page.evaluate(()=>!!window.resourcePacksFixture.refs.range.current)).toBe(true);
});

test('callback ref cleanup runs on real item replacement and unmount',async({page})=>{
  await load(page,{part:'item',callbackRefs:true});await expect.poll(()=>page.evaluate(()=>!!window.resourcePacksFixture.refs.item.current)).toBe(true);await page.evaluate(()=>window.resourcePacksFixture.unmount());await expect.poll(()=>events(page,'ref-cleanup')).toHaveLength(1);expect(await page.evaluate(()=>window.resourcePacksFixture.refs.item.current)).toBeNull();await page.evaluate(()=>window.resourcePacksFixture.remount());await expect.poll(()=>page.evaluate(()=>!!window.resourcePacksFixture.refs.item.current)).toBe(true);
});

test('generated multiselect option callback releases every real attachment once',async({page})=>{
  await load(page,{part:'settings'});
  // Source options remain in the DOM even when their expanded panel is hidden.
  const option=page.locator('[data-server-field-id=visible-details] [data-server-option=particles] input[type=checkbox]');await expect(option).toHaveCount(1);
  await expect.poll(async()=>(await events(page,'option-ref')).filter(e=>e.phase==='attach').length).toBeGreaterThan(0);
  expect((await events(page,'option-ref')).find(e=>e.phase==='attach')).toMatchObject({tagName:'INPUT',field:'visible-details',option:'particles'});
  const beforeProps=(await events(page,'option-ref')).filter(e=>e.phase==='attach').length;
  await configure(page,{fontSize:20,supportedTier:false});await expect(option).toHaveCount(1);
  expect((await events(page,'option-ref')).filter(e=>e.phase==='attach')).toHaveLength(beforeProps);
  // A real owner replacement supplies a new DOM input, rather than forcing an
  // artificial ref(null). Stable ordinary prop updates are also covered above.
  await page.evaluate(()=>window.resourcePacksFixture.remount());await expect(option).toHaveCount(1);
  await page.evaluate(()=>window.resourcePacksFixture.unmount());await expect(option).toHaveCount(0);
  await expect.poll(async()=>{
    const ledger=await events(page,'option-ref'),attached=ledger.filter(e=>e.phase==='attach'),cleaned=ledger.filter(e=>e.phase==='cleanup');
    return attached.length>0&&attached.every(a=>cleaned.filter(c=>c.attachmentId===a.attachmentId&&c.nodeId===a.nodeId).length===1)&&cleaned.every(c=>attached.some(a=>a.attachmentId===c.attachmentId));
  }).toBe(true);
  expect((await events(page,'option-ref')).filter(e=>e.phase==='null')).toHaveLength(0);
});

test('font host token scales18 to20 without changing literal slider extents',async({page})=>{
  await load(page,{part:'tier',fontSize:18,scale:2});const before=await page.locator('.mc-pack-content-tier__label').evaluate(el=>getComputedStyle(el).fontSize);await configure(page,{fontSize:20});const after=await page.locator('.mc-pack-content-tier__label').evaluate(el=>getComputedStyle(el).fontSize);expect([before,after]).toEqual(['18px','20px']);expect((await dimensions(page.locator('.mc-pack-content-tier__track'))).width).toBe(642);
});

test('local overflow uses hidden UA bar and avoids document horizontal overflow',async({page})=>{
  await load(page,{part:'settings'});expect(await page.locator('.mc-scroll-area__viewport').evaluate(el=>getComputedStyle(el).scrollbarWidth)).toBe('none');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
