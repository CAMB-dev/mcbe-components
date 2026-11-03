import {test,expect,chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {layoutGuiTrueTypeText} from '../src/gui-truetype-geometry';
import type {GuiTrueTypeFont} from '../src/gui-truetype-geometry';
import type {} from '../demo/gui-layer-fixture';

const fontRoot=new URL('../.cache/local-fonts/classic-ten-gui64/',import.meta.url);
const nativeRoot=new URL('../.cache/resource-pack-header-font-study-20261103-01/',import.meta.url);
const available=['gui-font.json','atlas.png'].every(f=>existsSync(new URL(f,fontRoot)))
  && ['native-before-g74-whole.png','native-after-g74-whole.png','AMENDMENT-01/FOUR-DRAWS-DECODED.json'].every(f=>existsSync(new URL(f,nativeRoot)));
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
function different(a:Buffer,b:Buffer){expect(a.length).toBe(b.length);let rgba=0,alpha=0;for(let i=0;i<a.length;i+=4){if(!a.subarray(i,i+4).equals(b.subarray(i,i+4)))rgba++;if(a[i+3]!==b[i+3])alpha++;}return{rgba,alpha};}

for(const backend of ['nvidia-d3d11','software'] as const)test(`${backend}: source-generated TrueType metrics through public function, live target and React DOM`,async({baseURL},testInfo)=>{
 test.skip(!available,'Caller-owned original font cache/native reference absent; no replacement golden is generated.');
 const [fontBytes,atlasBytes,beforeBytes,afterBytes,packetBytes]=await Promise.all([
  readFile(new URL('gui-font.json',fontRoot)),readFile(new URL('atlas.png',fontRoot)),
  readFile(new URL('native-before-g74-whole.png',nativeRoot)),readFile(new URL('native-after-g74-whole.png',nativeRoot)),readFile(new URL('AMENDMENT-01/FOUR-DRAWS-DECODED.json',nativeRoot))]);
 expect(sha(atlasBytes!)).toBe('9402a188af40fd8a5521790d11e664656717ea0f655b79fb5b958c050b5d469b');
 expect(sha(packetBytes!)).toBe('18f012c383785dd874374f40111a9ef7928fee10a5ef83cd22fbecc62b1cb4ba');
 const font:GuiTrueTypeFont={...JSON.parse(fontBytes!.toString('utf8')),pages:['/.cache/local-fonts/classic-ten-gui64/atlas.png']};
 const packet=JSON.parse(packetBytes!.toString('utf8')),before=PNG.sync.read(beforeBytes!),after=PNG.sync.read(afterBytes!),atlas=PNG.sync.read(atlasBytes!);
 const frame={width:2570,height:1402,guiScale:5},command={kind:'truetype' as const,text:'0',font,origin:[423.6,151.5] as const,projectionScale:1.5,color:[76,76,76,255] as const,scissor:[256,114,2056,1287] as const};
 // Saved native packets are only comparison oracles. They never enter the draw.
 for(const [id,char] of [[74,'0'],[79,'5'],[85,'1']] as const){
  const native=packet.draws.find((d:{globalId:number})=>d.globalId===id),run=layoutGuiTrueTypeText({...frame,...command,text:char}).runs[0]!;
  expect(run.vertices.map(v=>v.position)).toEqual(native.vertices.map((v:{positionHalf4:number[]})=>v.positionHalf4.slice(0,3)));
  expect(run.vertices.map(v=>v.uvRaw)).toEqual(native.vertices.map((v:{uvUNORM16raw:number[]})=>v.uvUNORM16raw));
 }
 const native=packet.draws.find((d:{globalId:number})=>d.globalId===74),mvp=Array.from(layoutGuiTrueTypeText({...frame,...command}).runs[0]!.mvp),mvpDifferences=mvp.flatMap((value,i)=>value===native.VSfloat32[i]?[]:[{index:i,source:value,native:native.VSfloat32[i]}]);
 expect(mvpDifferences).toEqual([{index:12,source:.6482490301132202,native:.6482489109039307}]);
 const browser=await chromium.launch(backend==='nvidia-d3d11'?{args:['--enable-gpu','--use-gl=angle','--use-angle=d3d11']}:{headless:true,args:[]});
 const context=await browser.newContext({baseURL,viewport:{width:2800,height:1600},deviceScaleFactor:1}),tab=await context.newPage();
 try{
  await tab.goto('/demo/gui-layer-fixture.html');await tab.waitForFunction(()=>!!window.guiLayerQA);
  const options={...frame,rasterOrigin:'top-left',background:{kind:'texture',encoding:'framebuffer',texture:{width:frame.width,height:frame.height,rgba:before.data.toString('base64')}},commands:[command]};
  const result=await tab.evaluate(options=>window.guiLayerQA.render(options),{...options,commands:[{...command,pages:[[0,{width:1024,height:1024,rgba:atlas.data.toString('base64')}]]}]}),rgba=Buffer.from(result.rgba,'base64');
  expect(result.renderer).toMatch(backend==='nvidia-d3d11'?/NVIDIA.*(?:D3D11|Direct3D11)/:/SwiftShader/);
  expect(sha(Buffer.from(result.liveRgba,'base64'))).toBe(sha(rgba));
  await tab.locator('#root').evaluate(root=>Object.assign((root as HTMLElement).style,{position:'absolute',left:'0',top:'0',margin:'0'}));
  await tab.evaluate(options=>window.guiLayerQA.mount(options),options);const canvas=tab.locator('.mc-gui-layer');await expect(canvas).toHaveAttribute('data-render-state','ready');
  expect(await canvas.boundingBox()).toEqual({x:0,y:0,width:frame.width,height:frame.height});
  expect(sha(Buffer.from((await tab.evaluate(()=>window.guiLayerQA.rawCanvas())).rgba,'base64'))).toBe(sha(rgba));
  const shot=await canvas.screenshot({animations:'disabled'});expect(sha(PNG.sync.read(shot).data)).toBe(sha(rgba));
  const difference=different(rgba,after.data);if(backend==='nvidia-d3d11')expect(difference).toEqual({rgba:0,alpha:0});
  await testInfo.attach('public-truetype-native-comparison.json',{body:Buffer.from(JSON.stringify({backend,renderer:result.renderer,chromium:browser.version(),pixels:frame.width*frame.height,difference,sourceLocalGlyphs:3,mvpDifferences,rgbaSHA256:sha(rgba),nativeSHA256:sha(after.data),scope:'One source-derived glyph over native-before backdrop, explicit HOST origin/scale; not full GUI or default layout.'},null,2)),contentType:'application/json'});
  await testInfo.attach('public-truetype-whole.png',{body:shot,contentType:'image/png'});
  await tab.evaluate(()=>window.guiLayerQA.unmount());await tab.waitForFunction(()=>window.guiLayerQA.ref===null);
 }finally{await context.close();await browser.close();}
});
