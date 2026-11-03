import {expect,test} from '@playwright/test';
import type {} from '../demo/gui-layer-fixture';
const page=(value:number[])=>({width:8,height:8,rgba:Array.from({length:64},()=>value).flat()});
const font={pages:['unused.png'],pageSizes:[8],lineHeight:3,glyphs:{A:{page:0,atlasRect:[1,2,3,2],offset:[0,0],size:[3,2],advance:4}}};
const command=(extra:Record<string,unknown>={})=>({kind:'truetype',text:'A',font,origin:[2,3],pages:[[0,page([128,128,128,128])]],...extra});
const pixels=(b64:string)=>[...Buffer.from(b64,'base64')];
const expected=(fill:number[]= [0,0,0,0])=>Array.from({length:16*16},()=>fill).flat();
function rect(a:number[],x:number,y:number,w:number,h:number,color:number[]){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)a.splice((j*16+i)*4,4,...color);}
test.beforeEach(async({page})=>{await page.goto('/demo/gui-layer-fixture.html');await page.waitForFunction(()=>window.guiLayerQA);});

test('source RGBA coverage, vertex alpha, shadows and live canvas remain independent',async({page})=>{
 for(const [extra,color] of [[{},[64,64,64,128]],[{color:[255,255,255,128]},[32,32,32,64]]] as const){
  const result=await page.evaluate(options=>window.guiLayerQA.render(options),{width:16,height:16,guiScale:1,commands:[command(extra)]});
  const e=expected();rect(e,2,3,3,2,[...color]);expect(pixels(result.rgba)).toEqual(e);expect(pixels(result.liveRgba)).toEqual(e);
 }
 const options={width:16,height:16,guiScale:1,commands:[command({shadow:{offset:[4,0],tint:[0,0,0,1]}})]};
 const r=await page.evaluate(options=>window.guiLayerQA.render(options),options),e=expected();rect(e,2,3,3,2,[64,64,64,128]);rect(e,6,3,3,2,[0,0,0,128]);expect(pixels(r.rgba)).toEqual(e);
});
test('image, variable TrueType and packed bitmap draws share one ordered target',async({page})=>{
 const blue=Array.from({length:128*128},()=>[0,0,255,255]).flat();
 const bitmap={kind:'text',text:'B',origin:[3,3],fontScale:.25,sampling:'point',shader:'bitmap',font:{pages:['bitmap.png'],pageSizes:[128],cellHeight:12,lineHeight:12,glyphs:{B:{page:0,x:0,y:0,width:8,height:12,advance:8}}},pages:[[0,{width:128,height:128,rgba:blue}]]};
 const options={width:16,height:16,guiScale:1,background:{kind:'solid',color:[1,1,1,1]},commands:[{kind:'image',texture:{width:1,height:1,rgba:[255,0,0,255]},rect:[0,0,8,8]},command(),bitmap]};
 const r=await page.evaluate(options=>window.guiLayerQA.render(options),options),e=expected([255,255,255,255]);rect(e,0,0,8,8,[255,0,0,255]);rect(e,2,3,3,2,[191,64,64,255]);rect(e,3,3,2,3,[0,0,255,255]);expect(pixels(r.rgba)).toEqual(e);expect(pixels(r.liveRgba)).toEqual(e);
 await page.evaluate(options=>window.guiLayerQA.mount(options),options);await expect(page.locator('.mc-gui-layer')).toHaveAttribute('data-render-state','ready');expect(pixels((await page.evaluate(()=>window.guiLayerQA.rawCanvas())).rgba)).toEqual(e);
});
test('policy-only changes, caller metric mutation and unmount keep snapshot/resource boundaries',async({page})=>{
 await page.evaluate(options=>window.guiLayerQA.mount(options),{width:16,height:16,guiScale:1,commands:[command()]});await expect(page.locator('.mc-gui-layer')).toHaveAttribute('data-render-state','ready');
 await page.evaluate(()=>{window.guiLayerQA.props.commands[0].font.glyphs.A.size[0]=5;window.guiLayerQA.paint();});await page.waitForFunction(()=>window.guiLayerQA.serial===2);
 const e=expected();rect(e,2,3,5,2,[64,64,64,128]);expect(pixels((await page.evaluate(()=>window.guiLayerQA.rawCanvas())).rgba)).toEqual(e);
 await page.evaluate(()=>{window.guiLayerQA.props.rasterOrigin='top-left';window.guiLayerQA.paint();});await page.waitForFunction(()=>window.guiLayerQA.serial===3);expect(pixels((await page.evaluate(()=>window.guiLayerQA.rawCanvas())).rgba)).toEqual(e);
 await page.evaluate(()=>window.guiLayerQA.unmount());await page.waitForFunction(()=>window.guiLayerQA.ref===null);await expect(page.locator('canvas.mc-gui-layer')).toHaveCount(0);
});
test('invalid used declarations fail before fetching pages; empty text leaves unused URLs untouched',async({page})=>{
 const requests:string[]=[];page.on('request',r=>{if(r.url().includes('must-not-fetch'))requests.push(r.url());});
 await page.evaluate(options=>window.guiLayerQA.mount(options),{width:16,height:16,guiScale:1,commands:[command({text:'',font:{...font,pages:['/must-not-fetch.png']},pages:undefined})]});await expect(page.locator('.mc-gui-layer')).toHaveAttribute('data-render-state','ready');
 expect(pixels((await page.evaluate(()=>window.guiLayerQA.rawCanvas())).rgba)).toEqual(expected());
 await page.evaluate(options=>window.guiLayerQA.mount(options),{width:16,height:16,guiScale:1,commands:[command({font:{...font,pages:['/must-not-fetch.png'],glyphs:{A:{...font.glyphs.A,atlasRect:[8,0,3,2]}}},pages:undefined})]});await expect(page.locator('.mc-gui-layer')).toHaveAttribute('data-render-state','error');expect(requests).toEqual([]);
});
