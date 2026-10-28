import { expect, test } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DurabilityBar, InventoryGrid, ItemCount, ItemImage, ItemSlot, ItemTooltip, ResultSlot } from '../src/inventory';

test('inventory parts reject nonfinite amounts and durability without invalid markup',()=>{
  for(const count of [NaN,Infinity,-Infinity,-1,0,1]) expect(renderToStaticMarkup(createElement(ItemCount,{count}))).toBe('');
  expect(renderToStaticMarkup(createElement(ItemCount,{count:1,hideSingle:false}))).toContain('>1</span>');
  expect(renderToStaticMarkup(createElement(ItemCount,{count:64.9}))).toContain('>64</span>');
  for(const value of [NaN,Infinity,-Infinity]) {
    expect(renderToStaticMarkup(createElement(DurabilityBar,{value}))).toBe('');
    expect(renderToStaticMarkup(createElement(ItemTooltip,{item:{name:'Tool',durability:value}}))).not.toContain('Durability:');
  }
  for(const max of [0,-1,NaN,Infinity,-Infinity]) expect(renderToStaticMarkup(createElement(DurabilityBar,{value:.5,max}))).toBe('');
  const empty=renderToStaticMarkup(createElement(ItemSlot,{item:{name:'Unknown material',count:NaN,durability:Infinity}}));
  expect(empty).not.toMatch(/NaN|Infinity|hsl\(/);
  const grid=renderToStaticMarkup(createElement(InventoryGrid,{label:'Finite inventory',items:[null,null],columns:NaN,size:Infinity}));
  expect(grid).toContain('aria-colcount="9"'); expect(grid).toContain('aria-rowcount="1"'); expect(grid).not.toMatch(/NaN|Infinity/);
});

test('durability clamps values, exposes a finite meter, and allows renderer colors',()=>{
  const low=renderToStaticMarkup(createElement(DurabilityBar,{value:-5,max:100,hideWhenFull:false,color:'#112233'}));
  expect(low).toContain('aria-valuenow="0"');expect(low).toContain('width:0px');expect(low).toContain('background-color:#112233');
  expect(renderToStaticMarkup(createElement(DurabilityBar,{value:200,max:100}))).toBe('');
  const high=renderToStaticMarkup(createElement(DurabilityBar,{value:200,max:100,hideWhenFull:false}));
  expect(high).toContain('aria-valuenow="100"');expect(high).toContain('aria-valuetext="100%"');expect(high).toContain('width:24px');
  expect(renderToStaticMarkup(createElement(ItemImage,{src:'   '}))).not.toContain('<img');
  expect(renderToStaticMarkup(createElement(ResultSlot,{label:'No result',image:'   '}))).toContain('aria-disabled="true"');
});

test('large result keeps item pixels fixed and remains focused after its output is consumed',async({page})=>{
  await page.goto('/calibration.html');const fixture=page.locator('#inventory-parts-fixture');
  const slot=fixture.getByRole('button',{name:'Primitive result, 2, 50% durability'});
  await expect(slot).toHaveCSS('width','52px');await expect(slot).toHaveCSS('height','52px');
  await expect(slot.locator('img')).toHaveCSS('width','32px');await expect(slot.locator('img')).toHaveCSS('height','32px');
  await expect(fixture.getByRole('img',{name:'Fixture diamond'})).toHaveCSS('width','32px');
  await expect(fixture.getByRole('meter',{name:'Fixture durability'})).toHaveAttribute('aria-valuenow','3');
  await slot.focus();await slot.press('Enter');
  const empty=fixture.getByRole('button',{name:'Primitive result',exact:true});
  await expect(empty).toBeFocused();await expect(empty).toHaveAttribute('aria-disabled','true');await expect(empty).not.toHaveAttribute('disabled');
  await expect(empty).toHaveAttribute('data-empty','true');await expect(fixture.getByLabel('Primitive result events')).toHaveText('{"primary":1,"secondary":0,"click":1,"secondaryCallback":0}');
  await empty.press('Enter');await empty.press('Shift+F10');await empty.click({button:'right',force:true});
  await expect(fixture.getByLabel('Primitive result events')).toHaveText('{"primary":1,"secondary":0,"click":1,"secondaryCallback":0}');
});

test('unavailable result suppresses both actions while available secondary action is reported once',async({page})=>{
  await page.goto('/calibration.html');const fixture=page.locator('#inventory-parts-fixture');
  await fixture.getByRole('button',{name:'Toggle primitive availability'}).click();
  const slot=fixture.getByRole('button',{name:'Primitive result, 2, 50% durability'});
  await slot.focus();await expect(slot).toBeFocused();await slot.press('Enter');await slot.press('Shift+F10');await slot.click({button:'right',force:true});
  await expect(fixture.getByLabel('Primitive result events')).toHaveText('{"primary":0,"secondary":0,"click":0,"secondaryCallback":0}');
  await fixture.getByRole('button',{name:'Reset primitive result'}).click();await slot.focus();await slot.press('Shift+F10');
  await expect(fixture.getByLabel('Primitive result events')).toHaveText('{"primary":0,"secondary":1,"click":0,"secondaryCallback":1}');
});
