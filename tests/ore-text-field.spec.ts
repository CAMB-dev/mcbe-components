import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function open(page:Page){await page.goto('/demo/ore-text-field-fixture.html');await expect(page.locator('#controlled')).toBeVisible();}
test('native refs, strings, input attributes and accepted/rejected controlled edits remain real',async({page})=>{
  await open(page);const field=page.locator('#controlled');
  expect(await field.evaluate(node=>node===window.oreFieldFixture.input)).toBe(true);
  expect(await page.getByTestId('controlled-wrapper').evaluate(node=>node===window.oreFieldFixture.wrapper)).toBe(true);
  await expect(field).toHaveClass(/native-owned/);await expect(field).toHaveCSS('text-align','right');await expect(field).toHaveAttribute('type','text');
  expect(await field.getAttribute('maxlength')).toBeNull();await field.fill('00000x中文'+'long'.repeat(30));
  await expect(field).toHaveValue('00000x中文'+'long'.repeat(30));
  await page.evaluate(()=>window.oreFieldFixture.configure({accept:false}));await field.fill('Rejected');
  await expect(field).toHaveValue('00000x中文'+'long'.repeat(30));expect(await page.evaluate(()=>window.oreFieldFixture.changes.at(-1))).toBe('Rejected');
});
test('section links caller labels, descriptions and invalid feedback without replacing the native node',async({page})=>{
  await open(page);const field=page.locator('#controlled'),node=await field.elementHandle();
  await expect(field).toHaveAccessibleName('Host label Port');await expect(field).toHaveAccessibleDescription('Host description Source field description');
  await page.evaluate(()=>window.oreFieldFixture.configure({invalid:true}));await expect(field).toHaveAttribute('aria-invalid','true');
  await expect(field).toHaveAccessibleDescription('Host description Source field description Host feedback');
  expect(await field.evaluate((n,old)=>n===old,node)).toBe(true);
  await page.evaluate(()=>window.oreFieldFixture.configure({invalid:false}));await expect(page.getByText('Host feedback',{exact:true})).toHaveCount(0);
  expect(await field.getAttribute('aria-invalid')).toBeNull();
});
test('readonly selection, disabled tab behavior and original form submit/reset use browser controls',async({page})=>{
  await open(page);const field=page.locator('#controlled');await page.evaluate(()=>window.oreFieldFixture.configure({readOnly:true}));
  await field.focus();await field.press('ControlOrMeta+A');await field.press('x');await expect(field).toHaveValue('00123');
  expect(await field.evaluate(node=>[(node as HTMLInputElement).selectionStart,(node as HTMLInputElement).selectionEnd])).toEqual([0,5]);
  await page.evaluate(()=>window.oreFieldFixture.configure({readOnly:false,disabled:true}));await expect(field).toBeDisabled();
  await page.locator('#outside').focus();await page.keyboard.press('Tab');await expect(page.locator('#empty')).toBeFocused();
  await page.locator('#draft').fill('Uncontrolled draft');await page.getByRole('button',{name:'Submit',exact:true}).click();
  expect(await page.evaluate(()=>window.oreFieldFixture.submissions)).toEqual(['Uncontrolled draft']);
  await page.getByRole('button',{name:'Reset',exact:true}).click();await expect(page.locator('#draft')).toHaveValue('Original');
});
test('section uses resolved spacing tokens, natural description height, no implicit page overflow',async({page})=>{
  await open(page);const section=page.getByTestId('section');await expect(section).toHaveCSS('padding-top','12px');await expect(section).toHaveCSS('padding-left','24px');
  await expect(section).toHaveCSS('background-color','rgb(72, 73, 74)');
  expect(await section.evaluate(node=>({top:getComputedStyle(node,'::before').borderTopWidth,bottom:getComputedStyle(node,'::before').borderBottomWidth,left:getComputedStyle(node,'::before').borderLeftWidth,pointer:getComputedStyle(node,'::before').pointerEvents}))).toEqual({top:'2px',bottom:'2px',left:'0px',pointer:'none'});
  const before=(await section.boundingBox())!.height;await page.evaluate(()=>window.oreFieldFixture.configure({description:'A long localized description '.repeat(100)}));
  await expect.poll(async()=>(await section.boundingBox())!.height).toBeGreaterThan(before);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
});
test('keyboard focus and real forced colors keep editable content and hide original image art',async({page})=>{
  await open(page);await page.locator('#outside').focus();await page.keyboard.press('Tab');const field=page.locator('#controlled');await expect(field).toBeFocused();
  await expect(field).toHaveCSS('outline-style','solid');
  await page.locator('#empty').focus();expect(await page.locator('#empty').evaluate(node=>getComputedStyle(node,'::placeholder').opacity)).toBe('0');await field.focus();
  await page.emulateMedia({forcedColors:'active'});
  await expect(page.getByTestId('controlled-wrapper').locator('.mc-ore-text-field__skin')).toHaveCSS('display','none');
  await expect(field).toHaveCSS('outline-style','solid');await field.fill('Visible in forced colors');await expect(field).toHaveValue('Visible in forced colors');
  await page.evaluate(()=>window.oreFieldFixture.configure({disabled:true}));await expect(field).toHaveCSS('opacity','1');
});
test('native composition events are forwarded and accessibility has no serious or critical violations',async({page})=>{
  await open(page);const field=page.locator('#controlled');await field.dispatchEvent('compositionstart',{data:''});await field.dispatchEvent('compositionend',{data:'中文'});
  expect(await page.evaluate(()=>window.oreFieldFixture.composition)).toEqual(['start','end']);
  const result=await new AxeBuilder({page}).analyze();expect(result.violations.filter(v=>v.impact==='critical'||v.impact==='serious')).toEqual([]);
});
test('gallery exposes modern states, accepted rejection and actual form reset',async({page})=>{
  await page.goto('/#ore-text-fields');const gallery=page.getByTestId('ore-text-field-demo');await expect(gallery).toBeVisible();
  test.skip(await gallery.getByText('尚未准备本地 OreUI 输入框材质。',{exact:false}).count()>0,'Optional host-owned local Ore images absent');
  const name=gallery.getByRole('textbox',{name:'服务器名称',exact:true});await name.fill('修改名称');
  await gallery.getByRole('switch',{name:'接受名称修改'}).click();await name.fill('拒绝名称');await expect(name).toHaveValue('修改名称');
  await gallery.getByRole('button',{name:'聚焦空字段'}).click();await expect(gallery.getByRole('textbox',{name:'空字段',exact:true})).toBeFocused();
  await expect(gallery.getByRole('textbox',{name:'不可用字段',exact:true})).toBeDisabled();
  const form=gallery.getByTestId('ore-text-field-demo-native-form');await form.getByRole('textbox',{name:'端口文字'}).fill('001x');await form.getByRole('button',{name:'读取表单'}).click();
  await expect(gallery.getByRole('status')).toContainText('001x');await form.getByRole('button',{name:'重置字段'}).click();await expect(form.getByRole('textbox',{name:'端口文字'})).toHaveValue('019132');
});
