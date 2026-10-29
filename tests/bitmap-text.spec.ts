import { expect, test } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PNG } from 'pngjs';
import { layoutBitmapText, renderBitmapLayout } from '../src/bitmap-text-engine';
import { BitmapText } from '../src/bitmap-text';
import { bitmapProbeFont, bitmapProbePage } from '../demo/bitmap-text-fixture';
import type { BitmapFont } from '../src/bitmap-text';

const white = [1,1,1,1] as const;
const source = (width:number,height:number,data:readonly number[]) => ({width,height,data:new Uint8ClampedArray(data)});
const font = (glyphs:BitmapFont['glyphs'],lineHeight=1):BitmapFont => ({pages:['/synthetic-atlas.png'],glyphs,lineHeight});
const cell = {page:0,x:0,y:0,width:1,height:1,advance:1};
const controlled = '[data-case="bitmap-controlled"] .mc-bitmap-text';

test('layout consumes Unicode codepoints, explicit space advance and CRLF/newline metrics',()=>{
  const layout=layoutBitmapText(bitmapProbeFont,'A😀 \r\nA',2);
  expect([layout.width,layout.height]).toEqual([20,12]);
  expect(layout.glyphs.map(value=>[value.x,value.y,value.glyph.advance])).toEqual([[0,0,3],[3,0,5],[0,3,3]]);
  expect(layout.pages).toEqual([0]);
  expect(()=>layoutBitmapText(bitmapProbeFont,'A🚀',1)).toThrow('U+1F680');
  const empty=layoutBitmapText(bitmapProbeFont,'',1);expect([empty.width,empty.height,empty.pages.length]).toEqual([0,0,0]);
});

test('explicit offsets and shadow bounds preserve overhang without a guessed shadow preset',()=>{
  const metadata=font({A:{...cell,width:2,height:2,advance:3,offsetX:-1,offsetY:-.5}},3),page=source(2,2,Array(4).fill([255,255,255,255]).flat());
  const layout=layoutBitmapText(metadata,'A',2,{offsetX:-1,offsetY:1});expect([layout.width,layout.height,layout.originX,layout.originY]).toEqual([10,7,2,.5]);
  const painted=renderBitmapLayout(layout,new Map([[0,page]]),[1,0,0,1],'point','bitmap',{color:[0,0,0,.5],offsetX:-1,offsetY:1});
  const at=(x:number,y:number)=>[...painted.data.subarray((y*painted.width+x)*4,(y*painted.width+x)*4+4)];
  expect(at(0,2)).toEqual([0,0,0,128]);expect(at(2,2)).toEqual([255,0,0,255]);expect(at(2,6)).toEqual([0,0,0,0]);
  const plain=layoutBitmapText(metadata,'A',2);expect(plain.width).toBe(8);
});

test('glyph rectangle half-texel clamp excludes both neighboring atlas cells',()=>{
  const metadata=font({A:{...cell,x:1}}),page=source(3,1,[255,0,0,255,0,255,0,255,0,0,255,255]);
  for(const sampling of ['point','bilinear'] as const){const image=renderBitmapLayout(layoutBitmapText(metadata,'A',4),new Map([[0,page]]),white,sampling,'bitmap');
    expect([image.width,image.height]).toEqual([4,4]);expect([...image.data]).toEqual(Array(16).fill([0,255,0,255]).flat());}
});

test('bitmap-smooth transforms every destination-sampled channel before tint',()=>{
  const metadata=font({A:{...cell,width:2,advance:2}}),page=source(2,1,[0,64,128,255,255,128,64,0]),layout=layoutBitmapText(metadata,'A',2);
  const image=renderBitmapLayout(layout,new Map([[0,page]]),[.5,1,.25,.8],'bilinear','bitmap-smooth');
  const smooth=(value:number)=>{const q=Math.max(0,Math.min(1,(value-.3)*5));return q*q*(3-2*q);};
  expect([...image.data.subarray(0,4)]).toEqual([0,0,64,204]);
  // Second destination column samples25% of the second source texel. Smoothing
  // the source first would yield alpha153 and green64, rather than these values.
  expect([...image.data.subarray(4,8)]).toEqual([0,Math.round(smooth(80/255)*255),Math.round(smooth(112/255)*.25*255),204]);
  expect([...image.data.subarray(8,16)]).toEqual([0,0,0,0,0,0,0,0]);
});

test('overlapping explicit zero advances use documented Web source-over order',()=>{
  const metadata=font({A:{...cell,advance:0},B:{...cell,x:1,advance:0}}),page=source(2,1,[255,0,0,128,0,0,255,128]);
  const forward=renderBitmapLayout(layoutBitmapText(metadata,'AB',1),new Map([[0,page]]),white,'point','bitmap');
  const reverse=renderBitmapLayout(layoutBitmapText(metadata,'BA',1),new Map([[0,page]]),white,'point','bitmap');
  expect([...forward.data]).toEqual([85,0,170,192]);expect([...reverse.data]).toEqual([170,0,85,192]);
});

test('blank glyphs need no page and malformed source metrics fail explicitly',()=>{
  const metadata:BitmapFont={pages:[],lineHeight:3,glyphs:{' ':{...cell,width:0,height:0,advance:2}}},layout=layoutBitmapText(metadata,'  \n ',1);
  expect([layout.width,layout.height,layout.pages.length]).toEqual([4,6,0]);expect(renderBitmapLayout(layout,new Map(),white,'point','bitmap').data.some(Boolean)).toBe(false);
  for(const advance of [NaN,Infinity])expect(()=>layoutBitmapText(font({A:{...cell,advance}}),'A',1)).toThrow(RangeError);
  expect(()=>layoutBitmapText(font({A:{...cell,width:-1}}),'A',1)).toThrow(RangeError);
  expect(()=>layoutBitmapText({...metadata,lineHeight:0},' ',1)).toThrow(RangeError);
  expect(()=>renderBitmapLayout(layoutBitmapText(font({A:{...cell,x:2}}),'A',1),new Map([[0,source(1,1,[255,255,255,255])]]),white,'point','bitmap')).toThrow('source page');
  expect(()=>layoutBitmapText(font({A:{...cell,advance:9000}}),'A',1)).toThrow('size limit');
});

test('SSR keeps real readable text and performs no page IO',()=>{
  const html=renderToStaticMarkup(createElement(BitmapText,{font:bitmapProbeFont,sampling:'point',shader:'bitmap',children:'A😀'}));
  expect(html).toContain('A😀');expect(html).toContain('data-render-state="loading"');expect(html).toContain('aria-hidden="true"');expect(html).not.toContain('role="img"');expect(html).not.toContain('<img');
  for(const scale of [0,-1,NaN,Infinity])expect(()=>renderToStaticMarkup(createElement(BitmapText,{font:bitmapProbeFont,sampling:'point',shader:'bitmap',children:'A',scale}))).toThrow(RangeError);
  for(const color of ['currentColor','var(--caller-color)'])expect(()=>renderToStaticMarkup(createElement(BitmapText,{font:bitmapProbeFont,sampling:'point',shader:'bitmap',children:'A',color}))).toThrow('concrete CSS');
  expect(()=>renderToStaticMarkup(Reflect.apply(createElement,undefined,[BitmapText,{font:bitmapProbeFont,shader:'bitmap',children:'A'}]))).toThrow('Explicit supported');
  expect(()=>renderToStaticMarkup(Reflect.apply(createElement,undefined,[BitmapText,{font:bitmapProbeFont,sampling:'point',children:'A'}]))).toThrow('Explicit supported');
});

test('ready output has original whole-canvas dimensions and selectable DOM text for AT/copy',async({page})=>{
  await page.goto('/calibration.html');const wrapper=page.locator('[data-case="bitmap-point"] .mc-bitmap-text');await expect(wrapper).toHaveAttribute('data-render-state','ready');
  const canvas=wrapper.locator('canvas');await expect(canvas).toHaveAttribute('aria-hidden','true');await expect(canvas).toHaveAttribute('width','28');await expect(canvas).toHaveAttribute('height','12');
  expect(await wrapper.locator('.mc-bitmap-text__text').textContent()).toBe('A😀 B\n钻A');
  const selection=await wrapper.locator('.mc-bitmap-text__text').evaluate(node=>{const range=document.createRange();range.selectNodeContents(node);const selection=window.getSelection()!;selection.removeAllRanges();selection.addRange(range);return selection.toString();});expect(selection).toBe('A😀 B\n钻A');
  const aria=await wrapper.ariaSnapshot();expect(aria).toContain('A😀 B');expect(aria).not.toContain('img');
  expect(await canvas.evaluate(node=>[...(node as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,1,1).data])).toEqual([255,255,255,255]);
  const colored=page.locator('[data-case="bitmap-shadow"] .mc-bitmap-text');await expect(colored).toHaveAttribute('data-render-state','ready');
  expect(await colored.locator('canvas').evaluate(node=>[...(node as HTMLCanvasElement).getContext('2d')!.getImageData(2,0,1,1).data])).toEqual([128,255,64,255]);
});

test('controlled text, equivalent-font rerenders and wrapper ref are deterministic',async({page})=>{
  await page.goto('/calibration.html');const wrapper=page.locator(controlled),output=page.getByLabel('Bitmap callbacks');await expect(wrapper).toHaveAttribute('data-render-state','ready');await expect(output).toContainText('"ready":1');await expect(output).toContainText('"tag":"SPAN"');
  const canvas=wrapper.locator('canvas');await expect(canvas).toHaveAttribute('width','8');
  await page.getByRole('button',{name:'Change bitmap text',exact:true}).click();await expect(output).toContainText('"ready":2');await expect(canvas).toHaveAttribute('width','9');await expect(wrapper.locator('.mc-bitmap-text__text')).toHaveText('B A');
  await page.getByRole('button',{name:'Change bitmap text',exact:true}).click();await expect(output).toContainText('"ready":3');await expect(canvas).toHaveAttribute('width','8');
  await page.waitForTimeout(100);await expect(output).toContainText('"ready":3');
});

test('missing page, unknown glyph and unsupported color clear stale output with DOM fallback',async({page})=>{
  await page.goto('/calibration.html');const wrapper=page.locator(controlled),canvas=wrapper.locator('canvas');await expect(wrapper).toHaveAttribute('data-render-state','ready');
  for(const [action,text]of [['Toggle bitmap page failure','A😀'],['Toggle bitmap missing glyph','A?'],['Toggle bitmap CSS color failure','A😀']] as const){
    await page.getByRole('button',{name:action,exact:true}).click();await expect(wrapper).toHaveAttribute('data-render-state','error');await expect(canvas).toHaveAttribute('width','0');await expect(canvas).not.toBeVisible();await expect(wrapper.locator('.mc-bitmap-text__text')).toHaveText(text);await expect(wrapper.locator('.mc-bitmap-text__text')).toBeVisible();
    await page.getByRole('button',{name:action,exact:true}).click();await expect(wrapper).toHaveAttribute('data-render-state','ready');
  }
  await expect(page.getByLabel('Bitmap callbacks')).toContainText('"errors":3');
});

test('space/newline-only text does not request its unused source page',async({page})=>{
  const requested:string[]=[];page.on('request',request=>{if(request.url().includes('__unused_bitmap_page__'))requested.push(request.url());});await page.goto('/calibration.html');
  const spaces=page.locator('[data-case="bitmap-spaces"] .mc-bitmap-text');await expect(spaces).toHaveAttribute('data-render-state','ready');await expect(spaces.locator('canvas')).toHaveAttribute('width','4');await expect(spaces.locator('canvas')).toHaveAttribute('height','6');expect(requested).toEqual([]);
  const empty=page.locator('[data-case="bitmap-empty"] .mc-bitmap-text');await expect(empty).toHaveAttribute('data-render-state','ready');await expect(empty.locator('canvas')).toHaveAttribute('width','0');await expect(empty.locator('canvas')).toHaveAttribute('height','0');
});

test('a page finishing after unmount cannot report callbacks or repaint fallback',async({page})=>{
  let release=()=>{};const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/__missing_bitmap_page__.png',async route=>{await gate;await route.fulfill({status:200,contentType:'image/png',body:Buffer.from(bitmapProbePage.split(',')[1]!,'base64')});});
  await page.goto('/calibration.html');const wrapper=page.locator(controlled);await expect(wrapper).toHaveAttribute('data-render-state','ready');
  await page.getByRole('button',{name:'Toggle bitmap page failure',exact:true}).click();await expect(wrapper).toHaveAttribute('data-render-state','loading');await expect(wrapper.locator('.mc-bitmap-text__text')).toBeVisible();
  await page.getByRole('button',{name:'Toggle bitmap renderer',exact:true}).click();await expect(wrapper).toHaveCount(0);
  const response=page.waitForResponse('**/__missing_bitmap_page__.png');release();await(await response).finished();await page.waitForTimeout(150);
  await expect(page.getByLabel('Bitmap callbacks')).toContainText('"ready":1');await expect(page.getByLabel('Bitmap callbacks')).toContainText('"errors":0');
});

test('ready selectable DOM text cannot add inherited parent shadows to bitmap pixels',async({page},testInfo)=>{
  await page.goto('/calibration.html');await page.evaluate(()=>document.fonts.ready);
  const control=page.locator('[data-case="bitmap-parent-shadow-control"] .mc-bitmap-text'),shadowed=page.locator('[data-case="bitmap-parent-shadow-red"] .mc-bitmap-text');
  await expect(control).toHaveAttribute('data-render-state','ready');await expect(shadowed).toHaveAttribute('data-render-state','ready');
  const expected=PNG.sync.read(await control.screenshot({path:testInfo.outputPath('parent-shadow-control.png')})),actual=PNG.sync.read(await shadowed.screenshot({path:testInfo.outputPath('parent-shadow-red.png')}));
  expect([actual.width,actual.height]).toEqual([expected.width,expected.height]);expect([...actual.data]).toEqual([...expected.data]);
  expect(expected.data.some((value,index)=>index%4!==3&&value===255)).toBe(true);
  // Negative control proves the pixel comparison detects the actual inherited
  // shadow, rather than passing because the synthetic text lies outside its box.
  const text=shadowed.locator('.mc-bitmap-text__text');await text.evaluate(node=>{(node as HTMLElement).style.textShadow='inherit';});
  const ghost=PNG.sync.read(await shadowed.screenshot({path:testInfo.outputPath('parent-shadow-negative-control.png')}));expect([...ghost.data]).not.toEqual([...expected.data]);
  await text.evaluate(node=>{(node as HTMLElement).style.textShadow='none';});
  expect(await text.evaluate(node=>{const range=document.createRange();range.selectNodeContents(node);const selected=window.getSelection()!;selected.removeAllRanges();selected.addRange(range);return selected.toString();})).toBe('A');
  expect(await shadowed.ariaSnapshot()).toContain('A');
});
