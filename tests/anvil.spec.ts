import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Anvil } from '../src/anvil';

test('anvil rename remains controlled and enforces the source length limit',async({page})=>{
  await page.goto('/');const input=page.locator('#anvil').getByRole('textbox',{name:'Item name',exact:true});
  await expect(input).toHaveValue('Adventure blade');await input.fill('');await input.pressSequentially('x'.repeat(35));
  await expect(input).toHaveValue('x'.repeat(30));
  await page.getByRole('button',{name:'Reset anvil example',exact:true}).click();await expect(input).toHaveValue('Adventure blade');
});

test('anvil affordability and expensive states guard both result actions while preserving focus',async({page})=>{
  await page.goto('/');const section=page.locator('#anvil'),result=section.locator('.mc-anvil__result');
  for(const label of ['Insufficient levels','Too expensive']){
    await section.getByRole('radio',{name:label,exact:true}).check();
    await expect(result).toHaveAttribute('aria-disabled','true');await expect(result).not.toHaveAttribute('disabled');
    await result.focus();await result.press('Enter');await result.press('Shift+F10');
    await expect(result).toBeFocused();await expect(page.locator('.toast')).toBeEmpty();
  }
  await expect(section.getByRole('status')).toHaveText('Too Expensive!');
  await section.getByRole('radio',{name:'Affordable',exact:true}).check();await expect(result).not.toHaveAttribute('aria-disabled','true');
  await result.press('Shift+F10');await expect(page.locator('.toast')).toHaveText('secondary: anvil result taken.');
  await expect(result).toHaveAttribute('data-empty','true');await expect(section.locator('.mc-anvil__cost')).toHaveCount(0);
});

test('invalid combinations and external close are reflected in the composed anvil',async({page})=>{
  await page.goto('/');const section=page.locator('#anvil');
  await section.getByRole('checkbox',{name:'Invalid anvil combination',exact:true}).check();
  await expect(section.getByRole('img',{name:'Items cannot be combined',exact:true})).toBeVisible();
  await expect(section.locator('.mc-anvil__result')).toHaveAttribute('aria-disabled','true');
  await section.getByRole('button',{name:'Close container',exact:true}).click();await expect(section.locator('.mc-anvil')).toHaveCount(0);
  await section.getByRole('button',{name:'Reset anvil example',exact:true}).click();await expect(section.locator('.mc-anvil')).toBeVisible();
  await expect(section.getByRole('img',{name:'Items cannot be combined',exact:true})).toHaveCount(0);
});

test('anvil read-only and disabled rename states keep native input semantics',async({page})=>{
  await page.goto('/calibration.html');
  const readonly=page.locator('[data-case="anvil-readonly"] input'),disabled=page.locator('[data-case="anvil-disabled"] input');
  await expect(readonly).toHaveAttribute('readonly');await expect(readonly).toBeEnabled();
  await readonly.focus();await readonly.press('End');await readonly.press('x');await expect(readonly).toHaveValue('Read only tool');
  await expect(disabled).toBeDisabled();await expect(disabled).toHaveValue('Unavailable tool');
});

test('invalid anvil level values never appear as text or enable the result',()=>{
  for(const levels of [NaN,Infinity,-Infinity,-1]){
    const output=renderToStaticMarkup(createElement(Anvil,{name:'Tool',result:{name:'Result'},cost:{kind:'levels',levels}}));
    expect(output).not.toContain('NaN');expect(output).not.toContain('Infinity');expect(output).not.toContain('mc-anvil__cost');
    expect(output).toContain('aria-disabled="true"');
  }
});

test('anvil states reflow through local scrolling with no serious accessibility violations',async({page},testInfo)=>{
  await page.goto('/');await page.setViewportSize({width:320,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const section=page.locator('#anvil');const result=await new AxeBuilder({page}).include('#anvil').analyze();
  expect(result.violations.filter(issue=>issue.impact==='serious'||issue.impact==='critical')).toEqual([]);
  await section.screenshot({path:`test-results/${testInfo.project.name}-anvil.png`});
});
