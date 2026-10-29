import { expect, test } from '@playwright/test';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PNG } from 'pngjs';
import { DurabilityBar, InventoryGrid, ItemCount, ItemImage, ItemSlot, ItemTooltip, ResultSlot } from '../src/inventory';
import { Hotbar } from '../src/hud';

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

test.describe('durability native geometry pixel plane',()=>{
test.use({deviceScaleFactor:1});
test('durability keeps the native thirteen by two black envelope across inventory and HUD consumers',async({page,baseURL})=>{
  // Native wood-five-gui5.png SHA256 7353df9c55cd71086a48fe33fccd4ded1c15e7e45328f01d986283ab1d8e150a:
  // five independently measured bars have 65x10 black envelopes and at most 60x5 foregrounds.
  // This oracle covers geometry only; existing Web ratios/hues are not certified as native algorithms.
  const image=new URL('/demo/assets/minecraft/diamond_sword.png',baseURL).href;
  const cases:{id:string;node:ReactNode;anchor:[number,number];fill:number|null;color:number[]}[]=[
    {id:'normal-item-title',node:createElement(ItemSlot,{item:{name:'Actual tool',image,durability:.5},title:'Tool title'}),anchor:[6,27],fill:12,color:[255,255,0]},
    {id:'normal-low',node:createElement(ItemSlot,{item:{name:'Low tool',image,durability:.01}}),anchor:[6,27],fill:0,color:[255,5,0]},
    {id:'normal-near-full',node:createElement(ItemSlot,{item:{name:'Near full tool',image,durability:.999}}),anchor:[6,27],fill:24,color:[1,255,0]},
    {id:'normal-full-hidden',node:createElement(ItemSlot,{item:{name:'Full tool',image,durability:1}}),anchor:[6,27],fill:null,color:[]},
    {id:'normal-empty',node:createElement(ItemSlot,{label:'Empty tool',durability:.5}),anchor:[6,27],fill:null,color:[]},
    {id:'result-item',node:createElement(ResultSlot,{size:'large',item:{name:'Result tool',image,durability:.5}}),anchor:[14,35],fill:12,color:[255,255,0]},
    {id:'result-empty',node:createElement(ResultSlot,{size:'large',label:'Empty result',durability:.5}),anchor:[14,35],fill:null,color:[]},
    {id:'result-full-hidden',node:createElement(ResultSlot,{size:'large',item:{name:'Full result',image,durability:1}}),anchor:[14,35],fill:null,color:[]},
    {id:'hud-item',node:createElement(Hotbar,{items:[{name:'HUD tool',image,durability:.5}]}),anchor:[10,31],fill:12,color:[255,255,0]},
    {id:'hud-empty',node:createElement(Hotbar,{items:[{name:'Empty HUD tool',image,durability:.5,count:0}]}),anchor:[10,31],fill:null,color:[]},
    {id:'hud-full-hidden',node:createElement(Hotbar,{items:[{name:'Full HUD tool',image,durability:1}]}),anchor:[10,31],fill:null,color:[]},
    {id:'standalone-full-visible',node:createElement(DurabilityBar,{value:1,hideWhenFull:false,color:'#12ab34'}),anchor:[6,27],fill:24,color:[18,171,52]},
  ];
  // One screenshot pixel per CSS pixel fixes the comparison plane; mobile still uses its viewport/UA.
  await page.setContent('<meta name="viewport" content="width=device-width, initial-scale=1"><body style="margin:0"></body>');
  await page.addStyleTag({url:new URL('/src/styles.css',baseURL).href});
  await page.evaluate(html=>{document.body.innerHTML=html;},cases.map(item=>`<div id="${item.id}" style="position:relative;display:flex;align-items:flex-start;width:400px;height:64px;background:#39a7d2">${renderToStaticMarkup(item.node)}</div>`).join(''));
  await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image instanceof HTMLImageElement?image.decode():Promise.resolve())));
  await page.mouse.move(900,900);
  for(const item of cases){
    const root=page.locator(`#${item.id}`),bar=root.locator('.mc-slot__durability');
    await expect(bar,item.id).toHaveCount(item.fill===null?0:1);
    if(item.fill!==null){
      const bounds=await bar.evaluate(node=>{const r=node.getBoundingClientRect(),p=node.closest('[id]')!.getBoundingClientRect();return [r.x-p.x,r.y-p.y,r.width,r.height];});
      expect(bounds,item.id).toEqual([...item.anchor,24,2]);
    }
    const actual=PNG.sync.read(await root.screenshot());
    await bar.evaluateAll(nodes=>nodes.forEach(node=>{(node as HTMLElement).style.visibility='hidden';}));
    const expected=PNG.sync.read(await root.screenshot());
    if(item.fill!==null){
      const [left,top]=item.anchor;
      for(let y=0;y<4;y++)for(let x=0;x<26;x++){
        const offset=((top+y)*expected.width+left+x)*4;
        const color=y<2&&x<item.fill?item.color:[0,0,0];
        expected.data.set([...color,255],offset);
      }
    }
    expect(Buffer.compare(actual.data,expected.data),`${item.id}: full surface including the one-pixel outside halo`).toBe(0);
  }
});

test('durability matches four observed wooden sword color cores and the low zero-width sample',async({page,baseURL})=>{
  // The native read-only API probe reports wooden_sword maxDurability=59 and damage=1,15,30,45,58.
  // Original API evidence PNG SHA256: 1a23d078067e4e3168d9621ecff0f9d320d59f4ac15a2c50dfdf54e6294b5e44.
  // Fixed RGB cores below come from the independent native PNG audit, never from production CSS.
  // These five samples do not certify every item, denominator, rounding boundary or renderer hue.
  const samples=[
    {damage:1,remaining:58,width:24,rgb:[9,255,0]},
    {damage:15,remaining:44,width:18,rgb:[130,255,0]},
    {damage:30,remaining:29,width:12,rgb:[255,251,0]},
    {damage:45,remaining:14,width:6,rgb:[255,121,0]},
    {damage:58,remaining:1,width:0,rgb:[]},
  ];
  await page.setContent('<meta name="viewport" content="width=device-width, initial-scale=1"><body style="margin:0"></body>');
  await page.addStyleTag({url:new URL('/src/styles.css',baseURL).href});
  await page.evaluate(html=>{document.body.innerHTML=html;},samples.map(sample=>`<div id="native-wood-${sample.damage}" style="position:relative;width:40px;height:40px;background:#39a7d2">${renderToStaticMarkup(createElement(DurabilityBar,{value:sample.remaining,max:59}))}</div>`).join(''));
  for(const sample of samples){
    const root=page.locator(`#native-wood-${sample.damage}`),bar=root.getByRole('meter');
    await expect(bar).toHaveAttribute('aria-valuemax','59');
    await expect(bar).toHaveAttribute('aria-valuenow',`${sample.remaining}`);
    await expect(bar.locator('span')).toHaveCSS('width',`${sample.width}px`);
    const actual=PNG.sync.read(await root.screenshot());
    const expected=new PNG({width:40,height:40});
    for(let y=0;y<40;y++)for(let x=0;x<40;x++){
      const black=x>=6&&x<32&&y>=27&&y<31;
      const foreground=x>=6&&x<6+sample.width&&y>=27&&y<29;
      expected.data.set([...(foreground?sample.rgb:black?[0,0,0]:[57,167,210]),255],(y*40+x)*4);
    }
    expect(Buffer.compare(actual.data,expected.data),`wooden_sword damage=${sample.damage}, max=59: whole surface and native core RGBA`).toBe(0);
  }
});
});
