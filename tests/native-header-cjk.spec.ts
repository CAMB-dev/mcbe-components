import {test,expect,chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {layoutGuiText} from '../src/gui-text-geometry';
import type {GuiTextFont,GuiTextLayoutOptions} from '../src/gui-text-geometry';
import type {} from '../demo/gui-layer-fixture';

const base=new URL('../.cache/resource-pack-header-font-study-20261103-01/',import.meta.url);
const files=['current-original/glyph_6D.png','native-before-g83-whole.png','native-after-g83-whole.png','AMENDMENT-01/FOUR-DRAWS-DECODED.json'];
const available=files.every(file=>existsSync(new URL(file,base)));
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');

test('NVIDIA D3D11: original Unicode page and normal public text inputs match the complete native header glyph draw',async({baseURL},testInfo)=>{
  test.skip(!available,'Caller-owned original Unicode page/native capture are absent; never generate replacement goldens.');
  const [source,beforeBytes,afterBytes,packetBytes]=await Promise.all(files.map(file=>readFile(new URL(file,base))));
  expect(sha(source!)).toBe('3a389719831d9289c06e5f5f77bd7ebd728413c45d37d0232a2a5fbdd95a7f97');expect(sha(packetBytes!)).toBe('18f012c383785dd874374f40111a9ef7928fee10a5ef83cd22fbecc62b1cb4ba');
  const before=PNG.sync.read(beforeBytes!),after=PNG.sync.read(afterBytes!),page=PNG.sync.read(source!),native=JSON.parse(packetBytes!.toString('utf8')).draws.find((d:{globalId:number})=>d.globalId===83);
  const expected='8aed9a7c56a9407a1c123423ad6f2e2fa9e27baf8983c1dd760ac8ae5bf57728';expect(sha(after.data)).toBe(expected);
  const code=0x6d3b,font:GuiTextFont={pages:['/.cache/resource-pack-header-font-study-20261103-01/current-original/glyph_6D.png'],pageSizes:[256],cellHeight:16,lineHeight:16,
    glyphs:{'活':{page:0,x:(code&15)*16,y:(code>>4&15)*16,width:16,height:16,advance:16}}};
  // Explicit HOST paint origin/scale; source Unicode cell mapping is independent
  // of captured VB/UV. One glyph does not qualify spacing or default layout.
  const input:GuiTextLayoutOptions={width:2570,height:1402,guiScale:5,text:'活',font,origin:[59.2,32.4],fontScale:.5,sampling:'bilinear',shader:'bitmap-smooth',color:[255,255,255,255],tint:[1,1,1,1],hudOpacity:1,scissor:[256,114,2056,1287]},run=layoutGuiText(input).runs[0]!;
  expect(Array.from(run.mvp)).toEqual(native.VSfloat32.slice(0,16));expect(run.glyphHeight).toBe(native.VSfloat32[16]);expect(run.halfTexelOffset).toBe(native.VSfloat32[20]);expect(run.vertices.map(v=>v.position)).toEqual(native.vertices.map((v:{positionHalf4:number[]})=>v.positionHalf4.slice(0,3)));expect(run.vertices.map(v=>v.uvRaw)).toEqual(native.vertices.map((v:{uvUNORM16raw:number[]})=>v.uvUNORM16raw));
  const browser=await chromium.launch({args:['--enable-gpu','--use-gl=angle','--use-angle=d3d11']}),context=await browser.newContext({baseURL,viewport:{width:2800,height:1600},deviceScaleFactor:1}),tab=await context.newPage();
  try{
    await tab.goto('/demo/gui-layer-fixture.html');await tab.waitForFunction(()=>!!window.guiLayerQA);
    const {width,height,guiScale,...command}=input,background={kind:'texture',encoding:'framebuffer',texture:{width,height,rgba:before.data.toString('base64')}},options={width,height,guiScale,background,commands:[{kind:'text',...command}]};
    const rendered=await tab.evaluate(options=>window.guiLayerQA.render(options),{...options,commands:[{...options.commands[0],pages:[[0,{width:page.width,height:page.height,rgba:page.data.toString('base64')}]]}]});
    expect(rendered.renderer).toMatch(/NVIDIA.*(?:D3D11|Direct3D11)/);expect(sha(Buffer.from(rendered.rgba,'base64'))).toBe(expected);expect(sha(Buffer.from(rendered.liveRgba,'base64'))).toBe(expected);
    await tab.locator('#root').evaluate(root=>Object.assign((root as HTMLElement).style,{position:'absolute',left:'0',top:'0',margin:'0'}));await tab.evaluate(options=>window.guiLayerQA.mount(options),options);
    const canvas=tab.locator('.mc-gui-layer');await expect(canvas).toHaveAttribute('data-render-state','ready');expect(await canvas.boundingBox()).toEqual({x:0,y:0,width,height});const live=await tab.evaluate(()=>window.guiLayerQA.rawCanvas());expect(sha(Buffer.from(live.rgba,'base64'))).toBe(expected);
    const shot=await canvas.screenshot({animations:'disabled'});expect(sha(PNG.sync.read(shot).data)).toBe(expected);await testInfo.attach('complete-native-cjk.png',{body:shot,contentType:'image/png'});
    await tab.evaluate(()=>window.guiLayerQA.unmount());await tab.waitForFunction(()=>window.guiLayerQA.ref===null);
  }finally{await context.close();await browser.close();}
});
