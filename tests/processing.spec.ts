import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async({page})=>{await page.goto('/');});

test('all three smelting GUIs consume controlled progress and fuel updates',async({page})=>{
  const section=page.locator('#processing');
  const progress=section.getByRole('slider',{name:'Smelting progress',exact:true});
  const fuel=section.getByRole('slider',{name:'Fuel remaining',exact:true});
  await progress.focus();await progress.press('End');
  await fuel.focus();await fuel.press('Home');
  const arrows=section.getByRole('progressbar',{name:'Smelting progress',exact:true});
  const flames=section.getByRole('meter',{name:'Fuel remaining',exact:true});
  await expect(arrows).toHaveCount(3);await expect(flames).toHaveCount(3);
  for(let index=0;index<3;index++){
    await expect(arrows.nth(index)).toHaveAttribute('aria-valuenow','100');
    await expect(flames.nth(index)).toHaveAttribute('aria-valuenow','0');
  }
  await section.getByRole('button',{name:'Reset processing examples',exact:true}).click();
  await expect(progress).toHaveValue('50');await expect(fuel).toHaveValue('50');
});

test('taking a crafting result updates its external state and keeps empty result focusable',async({page})=>{
  const crafting=page.locator('#processing [data-processing-examples] .mc-crafting');
  const result=crafting.locator('.mc-crafting__result');
  await result.click();await expect(page.locator('.toast')).toHaveText('primary: crafting result taken.');
  await expect(result).toHaveAttribute('aria-disabled','true');
  await expect(result).toHaveAttribute('data-empty','true');
  await crafting.getByRole('grid',{name:'Crafting input',exact:true}).locator('.mc-slot').nth(1).click();
  await expect(page.locator('.toast')).toHaveText('primary: crafting slot 2');
  await result.focus();await result.press('Enter');await expect(result).toBeFocused();
  await expect(page.locator('.toast')).toHaveText('primary: crafting slot 2');
});

test('smelting inputs and results forward independent secondary actions',async({page})=>{
  const furnace=page.locator('#processing .mc-furnace').filter({has:page.getByRole('heading',{name:'Furnace',exact:true})});
  await furnace.locator('.mc-furnace__fuel').focus();await page.keyboard.press('Shift+F10');
  await expect(page.locator('.toast')).toHaveText('secondary: furnace fuel');
  const result=furnace.locator('.mc-furnace__result');await result.focus();await result.press('Shift+F10');
  await expect(page.locator('.toast')).toHaveText('secondary: furnace result taken.');
  await expect(result).toHaveAttribute('aria-disabled','true');
  await expect(page.locator('#processing .mc-smoker .mc-furnace__result')).not.toHaveAttribute('aria-disabled','true');
  await expect(page.locator('#processing .mc-blast-furnace .mc-furnace__result')).not.toHaveAttribute('aria-disabled','true');
});

test('processing GUIs retain local overflow and accessible structure at 320px',async({page},testInfo)=>{
  await page.setViewportSize({width:320,height:900});
  const section=page.locator('#processing');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(section.locator('[data-processing-examples] .mc-workstation')).toHaveCount(4);
  await expect(section.locator('.mc-crafting-screen')).toHaveCount(1);
  await expect(section.getByRole('button',{name:'Close container'})).toHaveCount(0);
  const results=await new AxeBuilder({page}).include('#processing').analyze();
  expect(results.violations.filter(issue=>issue.impact==='serious'||issue.impact==='critical')).toEqual([]);
  await section.screenshot({path:`test-results/${testInfo.project.name}-processing.png`});
});
