import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Chest, ContainerFrame } from '../src/containers';

test('container size and selection boundaries produce finite, bounded markup',()=>{
  for(const [rows,expected] of [[NaN,3],[Infinity,3],[-Infinity,3],[-1,1],[1.8,1],[999,6]] as const){
    const markup=renderToStaticMarkup(createElement(Chest,{rows,selectedIndex:Infinity,inventorySelectedIndex:NaN}));
    expect((markup.match(/role="gridcell"/g) ?? []).length).toBe(expected*9+36);
    expect(markup).not.toMatch(/NaN|Infinity/);expect(markup).not.toContain('aria-selected="true"');
  }
  const frame=renderToStaticMarkup(createElement(ContainerFrame,{title:'Bounded frame',height:NaN,titleOffset:[Infinity,NaN]}));
  expect(frame).not.toMatch(/NaN|Infinity/);expect(frame).toContain('--mc-container-height:332px');
  const selected=renderToStaticMarkup(createElement(Chest,{selectedIndex:1,items:[null,{name:'Locked item',disabled:true}]}));
  expect(selected).toContain('disabled=""');expect((selected.match(/aria-selected="true"/g) ?? []).length).toBe(1);
});

test('storage empty slots forward both actions and external selection remains independent',async({page})=>{
  await page.goto('/');const chest=page.locator('#containers .mc-chest[data-container-rows="3"]');
  const grid=chest.getByRole('grid',{name:'Chest',exact:true}),empty=grid.getByRole('button',{name:'Empty slot 8',exact:true});
  await empty.click();await expect(page.locator('.toast')).toHaveText('primary: chest slot 8');
  await expect(grid.getByRole('gridcell').nth(7)).toHaveAttribute('aria-selected','true');
  await empty.press('Shift+F10');await expect(page.locator('.toast')).toHaveText('secondary: chest slot 8');
  const large=page.locator('#containers .mc-chest[data-container-rows="6"]');
  await large.getByRole('grid',{name:'Large Chest',exact:true}).getByRole('button',{name:'Empty slot 10',exact:true}).click();
  await expect(grid.getByRole('gridcell').nth(7)).toHaveAttribute('aria-selected','true');
  await expect(large.getByRole('grid',{name:'Large Chest',exact:true}).getByRole('gridcell').nth(9)).toHaveAttribute('aria-selected','true');
});

test('storage close and reset callbacks update the external container state',async({page})=>{
  await page.goto('/');const section=page.locator('#containers');
  await section.locator('.mc-hopper').getByRole('button',{name:'Close container',exact:true}).click();
  await expect(section.locator('.mc-hopper')).toHaveCount(0);await expect(page.locator('.toast')).toHaveText('Closed hopper.');
  await expect(section.locator('.mc-dropper')).toBeVisible();
  await section.getByRole('button',{name:'Reset container examples',exact:true}).click();
  await expect(section.locator('.mc-hopper')).toBeVisible();await expect(section.locator('.mc-container')).toHaveCount(6);
});

test('all container variants preserve local overflow and accessible structure at 320px',async({page},testInfo)=>{
  await page.goto('/');await page.setViewportSize({width:320,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const section=page.locator('#containers');const results=await new AxeBuilder({page}).include('#containers').analyze();
  expect(results.violations.filter(issue=>issue.impact==='serious'||issue.impact==='critical')).toEqual([]);
  await section.screenshot({path:`test-results/${testInfo.project.name}-containers.png`});
});
