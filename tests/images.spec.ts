import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { Image, NineSlice } from '../src/image';

// Exact CSS-pixel sampling checks are deliberately pinned to DPR=1. Mobile
// viewport/keyboard semantics can still be exercised by the parent's project.
test.use({ deviceScaleFactor:1 });
const backdrop=[40,41,42] as const;
const sources={
  arrow:{file:'arrow_large.png',sha:'c0b27d51e084d0018365a94905e53e8661cf0f05448145c71402ff16844fe1b6'},
  button:{file:'button_border_light.png',sha:'8e472e04dbc2cb851b03a474b2578531b241614679afbf7b9bbb716a005b32cb'},
  cell:{file:'cell_image.png',sha:'296e3d0ba9640efcd2902aa9c191f544b09bdbb8f4585d39a6c030e0ae3fc023'},
  dialog:{file:'dialog_background_hollow_3.png',sha:'cf16fa7c6598d90d9b3f43b3ce7779de065c07fb29568d860588694ffe596e5b'},
};
async function original(name:keyof typeof sources) {
  const source=sources[name],bytes=await readFile(new URL(`../.cache/references/${source.file}`,import.meta.url));
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(source.sha);
  return PNG.sync.read(bytes);
}
function composite(source:PNG,width:number,height:number,sample:(x:number,y:number)=>readonly[number,number]|null) {
  const result=new PNG({width,height});
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const coordinate=sample(x,y),out=4*(y*width+x);
    const from=coordinate ? 4*(coordinate[1]*source.width+coordinate[0]) : 0;
    const alpha=coordinate ? source.data[from+3]!/255 : 0;
    for(let c=0;c<3;c++)result.data[out+c]=Math.round((coordinate ? source.data[from+c]! : 0)*alpha+backdrop[c]!*(1-alpha));
    result.data[out+3]=255;
  }
  return result;
}
function sliced(source:PNG,width:number,height:number,cuts:readonly[number,number,number,number],edges:readonly[number,number,number,number],fill=true) {
  const [left,top,right,bottom]=cuts,[l,t,r,b]=edges;
  const sample=(p:number,length:number,sourceLength:number,start:number,end:number,before:number,after:number)=>{
    if(p<before)return Math.min(start-1,Math.floor((p+.5)*start/before));
    if(p>=length-after)return sourceLength-end+Math.min(end-1,Math.floor((p-length+after+.5)*end/after));
    return start+Math.floor((p-before+.5)*(sourceLength-start-end)/(length-before-after));
  };
  return composite(source,width,height,(x,y)=> !fill && x>=l && x<width-r && y>=t && y<height-b ? null : [sample(x,width,source.width,left,right,l,r),sample(y,height,source.height,top,bottom,t,b)]);
}
async function equalPixels(locator:Locator,expected:PNG) {
  const actual=PNG.sync.read(await locator.screenshot({scale:'css',animations:'disabled'}));
  expect([actual.width,actual.height]).toEqual([expected.width,expected.height]);
  let changed=0;for(let i=0;i<actual.data.length;i+=4)if([0,1,2,3].some(c=>actual.data[i+c]!==expected.data[i+c]))changed++;
  if(changed){
    await test.info().attach('actual',{body:PNG.sync.write(actual),contentType:'image/png'});
    await test.info().attach('original-png-sampling',{body:PNG.sync.write(expected),contentType:'image/png'});
    const sample=[];for(let i=0;i<actual.data.length && sample.length<8;i+=4)if([0,1,2,3].some(c=>actual.data[i+c]!==expected.data[i+c]))sample.push({x:i/4%actual.width,y:Math.floor(i/4/actual.width),actual:[...actual.data.subarray(i,i+4)],expected:[...expected.data.subarray(i,i+4)]});
    console.log(JSON.stringify({changed,sample}));
  }
  expect(changed,'original PNG sampling vs complete rendered region').toBe(0);
}
test('image primitives render statically without browser globals',()=>{
  expect(typeof window).toBe('undefined');
  const image=renderToStaticMarkup(createElement(Image,{src:'/original.png',alt:'Original icon',sourceSize:[6,4],scale:3}));
  expect(image).toContain('alt="Original icon"');expect(image).toContain('width="18"');expect(image).toContain('height="12"');
  const frame=renderToStaticMarkup(createElement(NineSlice,{src:'/original.png',sourceSize:[10,10],slice:2,destinationBorder:1,scale:2,alt:'Source border'},createElement('button',null,'Retained action')));
  expect(frame).toContain('role="img"');expect(frame).toContain('aria-label="Source border"');expect(frame).toContain('<button>Retained action</button>');
  expect(frame).toContain('border-image-slice:2 2 2 2 fill');expect(frame).toContain('padding:2px 2px 2px 2px');
});
test('invalid scale, source cuts and destination geometry fail consistently',()=>{
  for(const scale of [0,-1,1.5,NaN,Infinity])expect(()=>renderToStaticMarkup(createElement(Image,{src:'/x',alt:'',sourceSize:[4,4],scale}))).toThrow(RangeError);
  for(const sourceSize of [[0,4],[4.5,4],[4,NaN]] as const)expect(()=>renderToStaticMarkup(createElement(Image,{src:'/x',alt:'',sourceSize}))).toThrow(RangeError);
  for(const slice of [-1,NaN,1.5,6,{left:6,top:1,right:5,bottom:1}])expect(()=>renderToStaticMarkup(createElement(NineSlice,{src:'/x',sourceSize:[10,10],slice}))).toThrow(RangeError);
  for(const destinationBorder of [-1,NaN,Infinity])expect(()=>renderToStaticMarkup(createElement(NineSlice,{src:'/x',sourceSize:[10,10],slice:2,destinationBorder}))).toThrow(RangeError);
  expect(()=>renderToStaticMarkup(createElement(NineSlice,{src:'/x',sourceSize:[10,10],slice:2,size:[3,3]}))).toThrow(RangeError);
  // Meeting source edges produce a zero-size center, never a negative region.
  expect(()=>renderToStaticMarkup(createElement(NineSlice,{src:'/x',sourceSize:[10,10],slice:5,fill:false}))).not.toThrow();
});
test.describe('source image fixture',()=>{
  test.beforeEach(async({page})=>{
    await page.goto('/calibration.html');await page.evaluate(()=>document.fonts.ready);
    await expect(page.locator('[data-image-fixture]')).toBeVisible();
    // Other fixtures have native heading margins in em. Pin this whole source
    // specimen to the viewport pixel grid. A fractional translate would add
    // compositor filtering, so use ordinary integer layout coordinates.
    await page.locator('[data-image-fixture]').evaluate(node=>{
      Object.assign((node as HTMLElement).style,{position:'fixed',left:'0',top:'0',right:'0',margin:'0',zIndex:'10000'});
    });
    await page.locator('[data-image-fixture] img').evaluateAll(async nodes=>{await Promise.all(nodes.map(node=>(node as HTMLImageElement).decode()));});
  });
  test('native image semantics, original bytes and forwarded DOM refs remain intact',async({page})=>{
    const fixture=page.locator('[data-image-fixture]'),image=fixture.getByRole('img',{name:'Original workstation arrow',exact:true});
    await expect(image).toHaveAttribute('data-consumer','native-image');await expect(image).toHaveAttribute('draggable','false');
    await expect(image).toHaveAttribute('width','44');await expect(image).toHaveAttribute('height','30');await expect(image).toHaveCSS('image-rendering','pixelated');
    const bytes=Buffer.from((await image.getAttribute('src'))!.split(',')[1]!,'base64');expect(createHash('sha256').update(bytes).digest('hex')).toBe(sources.arrow.sha);
    await expect(fixture.locator('[data-image-case="decorative"]')).toHaveAttribute('alt','');
    await expect(fixture.getByRole('img')).toHaveCount(3); // arrow, logical image and named frame layer
    await fixture.getByRole('button',{name:'Read image refs'}).click();await expect(fixture.getByRole('status',{name:'Image fixture events'})).toHaveText('IMG:44|DIV:36');
  });
  test('integer image magnification and separate logical density sample the original PNG',async({page})=>{
    const arrow=await original('arrow');await equalPixels(page.locator('[data-image-case="native"]'),composite(arrow,44,30,(x,y)=>[Math.floor(x/2),Math.floor(y/2)]));
    const cell=await original('cell');await equalPixels(page.locator('[data-image-case="logical"]'),composite(cell,10,10,(x,y)=>[x,y]));
  });
  test('scalar and asymmetric nine-slice samples preserve original source edges',async({page})=>{
    await equalPixels(page.locator('[data-image-case="button"]'),sliced(await original('button'),60,42,[1,1,1,1],[3,3,3,3]));
    await equalPixels(page.locator('[data-image-case="asymmetric"]'),sliced(await original('dialog'),50,45,[8,23,8,8],[8,23,8,8]));
  });
  test('physical ten-pixel cell and logical five-pixel metadata never double its edges',async({page})=>{
    const cell=await original('cell');
    await equalPixels(page.locator('[data-image-case="cell"]'),sliced(cell,36,36,[2,2,2,2],[2,2,2,2]));
    await equalPixels(page.locator('[data-image-case="hollow"]'),sliced(cell,36,36,[2,2,2,2],[2,2,2,2],false));
  });
  test('outer geometry reserves destination padding and keeps named-image children operable',async({page})=>{
    const frame=page.locator('[data-image-case="content"]'),action=frame.getByRole('button',{name:'Frame action',exact:true});
    await expect(frame).toHaveCSS('padding','6px 8px 10px 4px');
    const outer=await frame.boundingBox(),inner=await action.boundingBox();expect(outer).not.toBeNull();expect(inner).not.toBeNull();
    expect([outer!.width,outer!.height,inner!.x-outer!.x,inner!.y-outer!.y]).toEqual([92,40,4,6]);
    await expect(frame.getByRole('img',{name:'Original Bedrock border',exact:true})).toBeVisible();
    await action.focus();await action.press('Enter');await expect(page.getByRole('status',{name:'Image fixture events'})).toHaveText('child activated');
    const customized=page.locator('[data-image-case="style"]');await expect(customized).toHaveCSS('width','44px');await expect(customized).toHaveCSS('height','40px');await expect(customized).toHaveCSS('padding','8px');
  });
});
