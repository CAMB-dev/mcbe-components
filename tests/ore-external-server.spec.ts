import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type {OreServerConfiguration} from '../demo/ore-external-server-fixture';
const form=(page:Page)=>page.locator('#ore-server-primary');
const field=(page:Page,name:'name'|'address'|'port')=>form(page).locator(`input[name="${name}"]`);
const action=(page:Page,name:string)=>form(page).locator(`button[data-ore-server-action="${name}"]`);
const configure=(page:Page,value:Partial<OreServerConfiguration>)=>page.evaluate(value=>window.oreServerFixture.configure(value),value);
const requests=(page:Page)=>page.evaluate(()=>window.oreServerFixture.requests);
const clear=(page:Page)=>page.evaluate(()=>window.oreServerFixture.clear());
async function open(page:Page){await page.goto('/demo/ore-external-server-fixture.html');if((page.viewportSize()?.width??1000)<924)await configure(page,{size:[Math.max(100,(page.viewportSize()?.width??393)-24),560],viewportSize:[Math.max(100,(page.viewportSize()?.width??393)-24),560],guiScale:1});await expect(form(page)).toBeVisible();}

test('real form and native field refs preserve strings, accepted snapshots and mode nodes',async({page})=>{
 await open(page);const node=await field(page,'name').elementHandle(),root=await form(page).elementHandle();
 expect(await form(page).evaluate(n=>n===window.oreServerFixture.form)).toBe(true);
 for(const name of['name','address','port']as const)expect(await field(page,name).evaluate((n,key)=>n===window.oreServerFixture.inputs[key],name)).toBe(true);
 await field(page,'name').fill('A long server name 中文 beyond Classic limit');await field(page,'address').fill('例子.example');await field(page,'port').fill('00000');await action(page,'add').click();
 expect((await requests(page)).at(-1)).toMatchObject({action:'add',value:{name:'A long server name 中文 beyond Classic limit',address:'例子.example',port:'00000'},parsedPort:0,dirty:true});
 expect(await field(page,'name').getAttribute('maxlength')).toBeNull();await configure(page,{mode:'edit'});await expect(action(page,'save')).toBeVisible();
 expect(await field(page,'name').evaluate((n,old)=>n===old,node)).toBe(true);expect(await form(page).evaluate((n,old)=>n===old,root)).toBe(true);
 await action(page,'delete-confirmation').click();expect((await requests(page)).at(-1)?.action).toBe('delete-confirmation');
});
test('rejected controlled input and corrections never replace accepted action values',async({page})=>{
 await open(page);await configure(page,{accept:false});await field(page,'name').fill('Rejected');await expect(field(page,'name')).toHaveValue('Host server');
 expect(await page.evaluate(()=>window.oreServerFixture.changes.at(-1)?.value.name)).toBe('Rejected');
 await page.evaluate(()=>window.oreServerFixture.setValue({name:'Host server',address:'host.example',port:'bad'}));await field(page,'port').focus();await field(page,'port').press('Tab');
 await expect(field(page,'port')).toHaveValue('bad');expect(await page.evaluate(()=>window.oreServerFixture.invalid.at(-1)?.suggestedValue)).toBe('19132');
 await action(page,'add').click();expect((await requests(page)).at(-1)?.value.port).toBe('bad');
});
test('source port blur accepts zero and leading zeroes; corrects upper bound and invalid text',async({page})=>{
 await open(page);for(const value of['0','00000','00065535']){await field(page,'port').fill(value);await field(page,'port').press('Tab');await expect(field(page,'port')).toHaveValue(value);}
 for(const [value,expected]of[['65536','65535'],['999999999999999999999999','65535'],['','19132'],['12x','19132'],['-1','19132'],['１２','19132']]){await field(page,'port').fill(value!);await field(page,'port').press('Tab');await expect(field(page,'port')).toHaveValue(expected!);}
 const invalid=await page.evaluate(()=>window.oreServerFixture.invalid);expect(invalid).toHaveLength(6);expect(invalid[0]?.reason).toBe('above-max');
 expect(await field(page,'port').getAttribute('aria-invalid')).toBeNull();
 await configure(page,{portValidation:'host'});await field(page,'port').fill('raw host string');await field(page,'port').press('Tab');await expect(field(page,'port')).toHaveValue('raw host string');
});
test('default Enter blurs only; opt-in native submit uses the explicit action and never Delete',async({page})=>{
 await open(page);await field(page,'port').fill('bad');await field(page,'port').press('Enter');await expect(field(page,'port')).not.toBeFocused();await expect(field(page,'port')).toHaveValue('19132');expect(await requests(page)).toEqual([]);
 await configure(page,{submitAction:'add-and-play'});await field(page,'name').press('Enter');expect((await requests(page)).at(-1)?.action).toBe('add-and-play');
 await clear(page);await configure(page,{mode:'edit',submitAction:'save'});await field(page,'port').press('Enter');expect((await requests(page)).map(x=>x.action)).toEqual(['save']);
 await clear(page);await configure(page,{submitAction:'source-blur'});await field(page,'name').press('Enter');expect(await requests(page)).toEqual([]);
});
test('field and form cancellation precede editing, blur, submit, reset and Escape defaults',async({page})=>{
 await open(page);await configure(page,{preventFieldChange:true});await field(page,'name').fill('Veto');await expect(field(page,'name')).toHaveValue('Host server');expect(await page.evaluate(()=>window.oreServerFixture.changes)).toEqual([]);
 await configure(page,{preventFieldChange:false,preventChange:true});await field(page,'name').fill('Veto form');await expect(field(page,'name')).toHaveValue('Host server');
 await configure(page,{preventChange:false,preventBlur:true});await field(page,'port').fill('bad');await field(page,'port').press('Tab');await expect(field(page,'port')).toHaveValue('bad');
 await configure(page,{preventBlur:false,preventSubmit:true,submitAction:'add'});await field(page,'name').press('Enter');expect(await requests(page)).toEqual([]);
 await configure(page,{preventSubmit:false,preventReset:true});await field(page,'name').fill('Accepted');await page.evaluate(()=>window.oreServerFixture.form!.reset());await expect(field(page,'name')).toHaveValue('Accepted');
 await configure(page,{preventReset:false,preventKey:true});await field(page,'name').press('Escape');expect(await requests(page)).toEqual([]);
 await configure(page,{preventKey:false});await field(page,'name').press('Escape');expect((await requests(page)).at(-1)).toMatchObject({action:'back',dirty:true,origin:'escape'});
});
test('direct DOM default prevention is respected by actual submit controls',async({page})=>{
 await open(page);await configure(page,{submitAction:'add'});await form(page).evaluate(node=>node.addEventListener('submit',event=>event.preventDefault(),{once:true}));await action(page,'add').click();expect(await requests(page)).toEqual([]);
 await action(page,'add').click();expect((await requests(page)).at(-1)?.action).toBe('add');
});
test('readonly keeps selection and Back; disabled requests stop and hidden nodes are retained',async({page})=>{
 await open(page);await configure(page,{readOnly:true});await field(page,'name').focus();await field(page,'name').press('ControlOrMeta+A');await field(page,'name').press('x');await expect(field(page,'name')).toHaveValue('Host server');await expect(action(page,'add')).toBeDisabled();
 await form(page).getByRole('button',{name:'Back host'}).click();expect((await requests(page)).at(-1)?.action).toBe('back');await clear(page);
 await configure(page,{readOnly:false,disabled:true});await expect(field(page,'name')).toBeDisabled();await expect(form(page).getByRole('button',{name:'Back host'})).toBeDisabled();
 await action(page,'add').evaluate(node=>(node as HTMLButtonElement).click());expect(await requests(page)).toEqual([]);
 const node=await field(page,'name').elementHandle();await configure(page,{disabled:false,hidden:true});await expect(form(page)).toBeHidden();await configure(page,{hidden:false});expect(await field(page,'name').evaluate((n,old)=>n===old,node)).toBe(true);
});
test('native reset requests the initial controlled snapshot and clears dirty without remounting',async({page})=>{
 await open(page);const node=await field(page,'name').elementHandle();await field(page,'name').fill('Edited');await page.evaluate(()=>window.oreServerFixture.form!.reset());await expect(field(page,'name')).toHaveValue('Host server');await expect(field(page,'port')).toHaveValue('00123');
 await expect(form(page)).toHaveAttribute('data-dirty','false');expect(await field(page,'name').evaluate((n,old)=>n===old,node)).toBe(true);expect(await page.evaluate(()=>window.oreServerFixture.changes.at(-1)?.origin)).toBe('reset');
});
test('composition, modifiers and caller veto keep Enter from submitting or blurring early',async({page})=>{
 await open(page);const input=field(page,'port');await input.fill('12x');await input.dispatchEvent('compositionstart',{data:''});await input.dispatchEvent('keydown',{key:'Enter',code:'Enter',isComposing:true,keyCode:229});await expect(input).toHaveValue('12x');expect(await requests(page)).toEqual([]);
 await input.dispatchEvent('compositionend',{data:'12x'});await configure(page,{preventKey:true});await input.press('Enter');await expect(input).toBeFocused();await expect(input).toHaveValue('12x');await configure(page,{preventKey:false});await input.press('Enter');await expect(input).toHaveValue('19132');
});
test('responsive footer placement and natural overflow expose only the shared custom scrollbar',async({page})=>{
 await open(page);await configure(page,{size:[340,300],viewportSize:[340,300],guiScale:1,descriptions:true});
 const footer=form(page).locator('.mc-ore-external-server-form__footer');expect(await footer.evaluate(n=>!!n.closest('.mc-ore-screen-frame__footer'))).toBe(true);
 const view=form(page).locator('.mc-ore-scroll__viewport'),bar=form(page).locator('.mc-ore-scroll__bar');await expect(bar).toBeVisible();await expect(view).toHaveCSS('scrollbar-width','none');
 await bar.focus();await bar.press('End');await expect.poll(()=>view.evaluate(n=>n.scrollTop)).toBeGreaterThan(0);await expect(action(page,'add')).toBeVisible();
 await configure(page,{size:[900,560],viewportSize:[900,560],guiScale:2,descriptions:false});expect(await footer.evaluate(n=>!!n.closest('.mc-ore-external-server-form__section'))).toBe(true);
});
test('real forced colors and accessibility preserve controls and suppress source art',async({page})=>{
 await open(page);await page.emulateMedia({forcedColors:'active'});await field(page,'name').focus();await expect(form(page).locator('.mc-ore-text-field__skin').first()).toHaveCSS('display','none');await expect(form(page).locator('.mc-ore-button__specular').first()).toHaveCSS('display','none');
 await expect(field(page,'name')).toHaveCSS('outline-style','solid');await field(page,'name').fill('Forced colors edit');await expect(field(page,'name')).toHaveValue('Forced colors edit');
 const results=await new AxeBuilder({page}).analyze();expect(results.violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
});
test('public scroll callback ref cleanup runs exactly once and identical legacy/forwarded refs are deduplicated',async({page})=>{
 await open(page);await expect(page.getByRole('region',{name:'Ref cleanup content'})).toBeVisible();expect(await page.evaluate(()=>window.oreServerFixture.refEvents)).toEqual(['attach']);
 await page.evaluate(()=>window.oreServerFixture.toggleRefComponent(false));await expect(page.getByRole('region',{name:'Ref cleanup content'})).toHaveCount(0);expect(await page.evaluate(()=>window.oreServerFixture.refEvents)).toEqual(['attach','cleanup']);
 await page.evaluate(()=>window.oreServerFixture.toggleRefComponent(true));await expect(page.getByRole('region',{name:'Ref cleanup content'})).toBeVisible();await page.evaluate(()=>window.oreServerFixture.toggleRefComponent(false));await expect(page.getByRole('region',{name:'Ref cleanup content'})).toHaveCount(0);expect(await page.evaluate(()=>window.oreServerFixture.refEvents)).toEqual(['attach','cleanup','attach','cleanup']);
});
test('public elevated buttons retain source hover/pressed face and total action-bar flow',async({page})=>{
 await open(page);const bar=page.getByRole('group',{name:'Standalone action bar'}),button=bar.getByRole('button',{name:'Standalone right'}),face=button.locator('.mc-ore-button__face');
 const before=(await bar.boundingBox())!,box=(await button.boundingBox())!;await button.hover();await expect(face).toHaveCSS('background-color','rgb(42, 100, 28)');await page.mouse.down();
 await expect(face).toHaveCSS('background-color','rgb(29, 77, 19)');const pressed=(await button.boundingBox())!;expect(pressed.y-box.y).toBeCloseTo(4);expect(box.height-pressed.height).toBeCloseTo(4);expect((await bar.boundingBox())!.height).toBe(before.height);
 await page.mouse.up();expect(await page.evaluate(()=>window.oreServerFixture.buttonClicks())).toBe(1);
});
test('main gallery supports actual add/edit, raw port corrections and host confirmation',async({page})=>{
 await page.goto('/#ore-external-servers');const gallery=page.getByTestId('ore-external-server-demo');await expect(gallery).toBeVisible();
 test.skip(await gallery.getByText('尚未准备完整的本地 OreUI 材质。',{exact:false}).count()>0,'Optional local whole Ore art absent');
 const primary=gallery.getByTestId('ore-external-server-demo-form');await expect(primary).toBeVisible();await primary.getByRole('textbox',{name:'端口',exact:true}).fill('65536');await primary.getByRole('textbox',{name:'端口',exact:true}).press('Tab');await expect(primary.getByRole('textbox',{name:'端口',exact:true})).toHaveValue('65535');
 await primary.locator('[data-ore-server-action="add"]').click();await expect(gallery.getByTestId('ore-external-server-demo-record')).toContainText('65535');
 await primary.getByRole('button',{name:'返回服务器列表'}).click();await expect(gallery.getByTestId('ore-external-server-demo-confirmation')).toBeVisible();
 await gallery.getByTestId('ore-external-server-demo-confirmation').getByRole('button',{name:'取消',exact:true}).click();await expect(primary).toBeVisible();
});
