import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';

async function loaded(page:Page){
  await page.goto('/#external-servers');
  const demo=page.getByTestId('external-server-demo');await expect(demo).toBeVisible();await page.evaluate(()=>document.fonts.ready);
  await expect(demo.getByTestId('external-server-demo-form')).toBeVisible();return demo;
}

test('gallery form keeps native inputs across modes and emits raw-string Save, Remove and close requests',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));const demo=await loaded(page),form=demo.getByTestId('external-server-demo-form');
  const name=form.getByRole('textbox',{name:'服务器名称',exact:true}),address=form.getByRole('textbox',{name:'服务器地址',exact:true}),port=form.getByRole('textbox',{name:'端口',exact:true});
  await name.fill('保留服务器');const identity=await name.elementHandle();
  await name.press('Home');await name.press('ArrowRight');await expect(name).toBeFocused();expect(await name.evaluate(node=>(node as HTMLInputElement).selectionStart)).toBe(1);
  await name.focus();await page.keyboard.press('Tab');await expect(address).toBeFocused();await page.keyboard.press('Tab');await expect(port).toBeFocused();
  await port.fill('019132');await port.press('Enter');await expect(demo.getByTestId('external-server-demo-saved')).toContainText('play.example.invalid:019132');
  await demo.getByRole('combobox',{name:'表单模式',exact:true}).click();await page.getByRole('option',{name:'编辑服务器',exact:true}).click();
  expect(await identity!.evaluate(node=>node===document.querySelector('[data-testid="external-server-demo-form"] input[name="name"]'))).toBe(true);
  await expect(name).toHaveValue('保留服务器');await expect(port).toHaveValue('019132');await expect(form.getByRole('button',{name:'删除',exact:true})).toBeVisible();
  await expect(form.getByRole('button',{name:'连接',exact:true})).toHaveCount(0);
  await form.getByRole('button',{name:'删除',exact:true}).click();await expect(demo.getByTestId('external-server-demo-saved')).toHaveText('尚未保留预览记录');
  await name.press('Escape');await expect(form).toBeHidden();await expect(demo.getByRole('button',{name:'重新打开表单',exact:true})).toBeFocused();
  await demo.getByRole('button',{name:'重新打开表单',exact:true}).click();await expect(name).toHaveValue('保留服务器');
  await identity!.dispose();expect(errors).toEqual([]);
});

test('gallery form adapts its source dimensions at 320px without a transform or horizontal overflow',async({page})=>{
  await page.setViewportSize({width:320,height:800});const demo=await loaded(page),form=demo.getByTestId('external-server-demo-form'),stage=demo.getByTestId('external-server-demo-stage');
  await expect.poll(()=>form.evaluate(node=>node.getBoundingClientRect().width<=node.parentElement!.parentElement!.clientWidth)).toBe(true);
  const formBox=await form.boundingBox(),stageBox=await stage.boundingBox();expect(formBox!.x).toBeGreaterThanOrEqual(0);expect(formBox!.x+formBox!.width).toBeLessThanOrEqual(320);
  expect(formBox!.width).toBeLessThanOrEqual(stageBox!.width);expect(await form.evaluate(node=>getComputedStyle(node).transform)).toBe('none');
  expect(await demo.evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
  for(const label of['服务器名称','服务器地址','端口'])await expect(form.getByRole('textbox',{name:label,exact:true})).toBeVisible();
});

test('standalone port retains text while the demo host applies its own form validation and readonly policy',async({page})=>{
  const demo=await loaded(page),form=demo.getByTestId('external-server-demo-form'),standalone=demo.getByRole('textbox',{name:'独立端口',exact:true});
  await standalone.fill('01e3');await expect(standalone).toHaveValue('01e3');await expect(standalone).toHaveAttribute('type','text');await expect(standalone).toHaveAttribute('inputmode','numeric');await expect(demo.getByTestId('external-server-demo-port-value')).toHaveText('输入内容：01e3');
  const port=form.getByRole('textbox',{name:'端口',exact:true});await port.fill('01e3');await expect(port).toHaveValue('01e3');await expect(form.getByRole('button',{name:'保存',exact:true})).toBeDisabled();
  await port.fill('19132');await demo.getByRole('switch',{name:'只读表单',exact:true}).check();await expect(port).toHaveAttribute('readonly','');
  const before=await demo.getByTestId('external-server-demo-status').textContent(),save=form.getByRole('button',{name:'保存',exact:true});await expect(save).toHaveAttribute('aria-disabled','true');await save.click({force:true});await expect(demo.getByTestId('external-server-demo-status')).toHaveText(before!);
});
