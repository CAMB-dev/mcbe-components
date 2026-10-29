import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EnchantingRunes } from '../src/enchanting-book';

// Native samples below are optional local, lossless references, never package
// assets. Calibration reduces measured error; it does not assert zero native
// pixel differences. Captured mesh/shader provenance is distinct from the
// default CPU pose reconstruction and the older native screenshot residuals.
test.use({deviceScaleFactor:1});
const atlasHash='e8d23533b48976b578098db767e2c8161a31fa5d7b22bf576bf531b1bc7f000f';
async function instrumentation(page:Page) {
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    const draw=WebGLRenderingContext.prototype.drawArrays;
    WebGLRenderingContext.prototype.drawArrays=function(...args:Parameters<WebGLRenderingContext['drawArrays']>) {
      draw.apply(this,args);
      const canvas=this.canvas as HTMLCanvasElement;
      canvas.dataset.qaDraws=String(Number(canvas.dataset.qaDraws??0)+1);
      canvas.dataset.qaGlError=String(this.getError());
      canvas.dataset.qaVertices=String(args[2]);
    };
  });
  return errors;
}
async function rendered(canvas:Locator) {
  await expect.poll(async()=>Number(await canvas.getAttribute('data-qa-draws'))).toBeGreaterThan(0);
  await expect(canvas).toHaveAttribute('data-qa-gl-error','0');
}
async function picture(canvas:Locator,name:string) {
  await mkdir(new URL('../.cache/enchanting-independent-qa/',import.meta.url),{recursive:true});
  const bytes=await canvas.screenshot({path:fileURLToPath(new URL(`../.cache/enchanting-independent-qa/${name}.png`,import.meta.url))});
  return {image:PNG.sync.read(bytes),hash:createHash('sha256').update(PNG.sync.read(bytes).data).digest('hex')};
}
async function canonicalCanvas(canvas:Locator) {
  // Fix only this runtime specimen to an integer screen plane. Main page
  // composition is captured separately without changing production geometry.
  await canvas.evaluate(node=>Object.assign((node as HTMLElement).style,{position:'fixed',left:'16px',top:'16px',zIndex:'2147483647',background:'#c6c6c6'}));
}

test('book uses the original atlas and preserves explicit reconstruction provenance',async({page})=>{
  const source=await readFile(new URL('../src/assets/enchanting/enchanting_table_book.png',import.meta.url));
  expect(createHash('sha256').update(source).digest('hex')).toBe(atlasHash);
  const texture=PNG.sync.read(source);expect([texture.width,texture.height]).toEqual([64,32]);
  const errors=await instrumentation(page);await page.goto('/calibration.html');
  const fixture=page.locator('[data-enchanting-renderer-fixture]'),canvas=fixture.getByRole('img',{name:'Controlled enchanting book',exact:true});
  await rendered(canvas);await expect(canvas).toHaveAttribute('data-fidelity','captured-mesh-reconstruction');
  await expect(canvas).toHaveAttribute('data-geometry-source','bedrock-1.26.6005-pix-gui-book');
  await expect(canvas).toHaveAttribute('data-lighting','calibrated');
  await expect(canvas).toHaveAttribute('data-lighting-source','bedrock-1.26.6005-captured-gui-draw');
  await expect(canvas).toHaveAttribute('data-renderer-state','controlled-reconstruction');
  await expect(canvas).toHaveAttribute('data-calibration-source','bedrock-1.26.6005-native-png');
  // The captured indexed draw has 252 indices, expanded by this WebGL API.
  expect(Number(await canvas.getAttribute('data-qa-vertices'))).toBe(252);
  await canonicalCanvas(canvas);const {image}=await picture(canvas,'book-default');
  expect([image.width,image.height]).toEqual([80,80]);
  const colors=new Set<string>();let foreground=0,paper=0,cover=0;
  for(let index=0;index<image.data.length;index+=4) {
    const [r,g,b]=[image.data[index]!,image.data[index+1]!,image.data[index+2]!];
    if(r===198&&g===198&&b===198)continue;
    foreground++;colors.add(`${r},${g},${b}`);
    if(r>150&&g>140&&b>80)paper++;
    if(r>50&&b<100)cover++;
  }
  expect(foreground,'actual nonblank WebGL pixels').toBeGreaterThan(500);
  expect(colors.size,'multiple sampled atlas colors').toBeGreaterThan(4);
  expect(paper,'light page texels').toBeGreaterThan(100);expect(cover,'cover and binding texels').toBeGreaterThan(20);
  await expect(fixture.getByRole('status',{name:'Book renderer errors'})).toBeEmpty();expect(errors).toEqual([]);
});

test('controlled openness and page turn change rendered pixels and restore deterministically',async({page})=>{
  const errors=await instrumentation(page);await page.goto('/calibration.html');
  const fixture=page.locator('[data-enchanting-renderer-fixture]'),canvas=fixture.getByRole('img',{name:'Controlled enchanting book',exact:true});
  await rendered(canvas);await canonicalCanvas(canvas);const initial=await picture(canvas,'book-open');
  const change=async(control:Locator,key:string)=>{
    const before=Number(await canvas.getAttribute('data-qa-draws'));await control.press(key);
    await expect.poll(async()=>Number(await canvas.getAttribute('data-qa-draws'))).toBeGreaterThan(before);await rendered(canvas);
  };
  const open=fixture.getByRole('slider',{name:'Book openness'}),flip=fixture.getByRole('slider',{name:'Book page turn'});
  await change(open,'Home');await expect(open).toHaveValue('0');const closed=await picture(canvas,'book-closed');expect(closed.hash).not.toBe(initial.hash);
  await change(open,'End');await expect(open).toHaveValue('1');expect((await picture(canvas,'book-reopened')).hash).toBe(initial.hash);
  await change(flip,'ArrowRight');await expect(flip).toHaveValue('0.25');const turned=await picture(canvas,'book-quarter-turn');expect(turned.hash).not.toBe(initial.hash);
  await change(flip,'Home');await expect(flip).toHaveValue('0');expect((await picture(canvas,'book-turn-reset')).hash).toBe(initial.hash);
  await expect(fixture.getByRole('status',{name:'Book renderer errors'})).toBeEmpty();expect(errors).toEqual([]);
});

type ContractPose = {
  open?:number;pageFlip?:number;yaw?:number;pitch?:number;roll?:number;
  bones?:7|8;shift?:number;invalid?:'projection'|'model'|'bones'|'light';
};
type ContractWindow = typeof window & {
  paintContractBook:(pose:ContractPose)=>void;
  contractInputUnchanged:()=>boolean;
};
async function mountContractBook(page:Page) {
  await page.goto('/calibration.html');
  await page.evaluate(async()=>{
    const reactPath='/@id/react',domPath='/@id/react-dom/client',bookPath='/src/enchanting-book.tsx';
    const [r,d,book]=await Promise.all([import(reactPath),import(domPath),import(bookPath)]);
    const React=r.default??r,ReactDOM=d.default??d;
    const stage=document.createElement('div');stage.id='book-state-contract';document.body.appendChild(stage);
    const status=document.createElement('output');status.id='book-state-errors';document.body.appendChild(status);
    const root=ReactDOM.createRoot(stage),host=window as ContractWindow;
    const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
    let unchanged=()=>true;
    host.contractInputUnchanged=()=>unchanged();
    host.paintContractBook=({bones=7,shift=0,invalid,...pose})=>{
      // A synthetic orthographic scene tests the public matrix contract,
      // independently of either the default pose or private native constants.
      const state={projection:[.1,0,0,0,0,-.1,0,0,0,0,.01,0,0,0,.5,1],
        view:identity(),model:identity(),bones:Array.from({length:bones},identity),tileLightColor:[1,1,1,1]};
      state.model[12]=shift;
      if(invalid==='projection')state.projection.pop();
      if(invalid==='model')state.model[0]=NaN;
      if(invalid==='bones')state.bones.pop();
      if(invalid==='light')state.tileLightColor.pop();
      const before=JSON.stringify(state);
      for(const matrix of [state.projection,state.view,state.model,...state.bones])Object.freeze(matrix);
      Object.freeze(state.bones);Object.freeze(state.tileLightColor);Object.freeze(state);
      unchanged=()=>JSON.stringify(state)===before;
      status.textContent='';
      root.render(React.createElement(book.EnchantingBook,{...pose,rendererState:state,
        'aria-label':'Caller state book',width:80,height:80,
        style:{position:'fixed',left:16,top:16,background:'#c6c6c6',zIndex:2147483647},
        onRendererError:(message:string)=>{status.textContent+=message+'\n';}}));
    };
  });
  return page.locator('#book-state-contract canvas');
}
async function paintContractBook(page:Page,canvas:Locator,pose:ContractPose) {
  const before=await canvas.count()?Number(await canvas.getAttribute('data-qa-draws')):0;
  await page.evaluate(pose=>(window as ContractWindow).paintContractBook(pose),pose);
  await expect.poll(async()=>Number(await canvas.getAttribute('data-qa-draws'))).toBeGreaterThan(before);
  await rendered(canvas);
}

test('caller-owned frozen matrices accept seven or eight bones without mutation',async({page})=>{
  const errors=await instrumentation(page),canvas=await mountContractBook(page);
  await paintContractBook(page,canvas,{bones:7});
  await expect(canvas).toHaveAttribute('data-renderer-state','caller-supplied');
  const seven=await picture(canvas,'caller-seven-bones');
  expect(foregroundBounds(seven.image).width).toBeGreaterThan(10);
  expect(await page.evaluate(()=>(window as ContractWindow).contractInputUnchanged())).toBe(true);
  await paintContractBook(page,canvas,{bones:8});
  expect((await picture(canvas,'caller-eight-bones')).hash).toBe(seven.hash);
  expect(await page.evaluate(()=>(window as ContractWindow).contractInputUnchanged())).toBe(true);
  await expect(page.locator('#book-state-errors')).toBeEmpty();expect(errors).toEqual([]);
});

test('explicit renderer state overrides pose controls and restores after a caller matrix update',async({page})=>{
  const errors=await instrumentation(page),canvas=await mountContractBook(page);
  await paintContractBook(page,canvas,{});const initial=await picture(canvas,'caller-initial');
  await paintContractBook(page,canvas,{open:0,pageFlip:.75,yaw:81,pitch:-47,roll:129});
  expect((await picture(canvas,'caller-controls-overridden')).hash).toBe(initial.hash);
  await paintContractBook(page,canvas,{shift:1});
  expect((await picture(canvas,'caller-translated')).hash).not.toBe(initial.hash);
  await paintContractBook(page,canvas,{});
  expect((await picture(canvas,'caller-restored')).hash).toBe(initial.hash);
  await expect(page.locator('#book-state-errors')).toBeEmpty();expect(errors).toEqual([]);
});

test('invalid caller matrices, bone count and light tuple report errors without drawing a fallback',async({page})=>{
  const errors=await instrumentation(page);
  for(const invalid of ['projection','model','bones','light'] as const) {
    const canvas=await mountContractBook(page);
    await page.evaluate(invalid=>(window as ContractWindow).paintContractBook({invalid}),invalid);
    await expect(page.locator('#book-state-errors')).toContainText(invalid==='light'?'four finite numbers':'16 finite numbers and seven or eight bones');
    await expect(canvas).toHaveAttribute('data-renderer-state','caller-supplied');
    expect(await canvas.getAttribute('data-qa-draws')).toBeNull();
    const {image}=await picture(canvas,'caller-invalid-'+invalid);
    const blank=Buffer.alloc(image.width*image.height*4);
    for(let i=0;i<blank.length;i+=4)blank.set([198,198,198,255],i);
    expect(image.data.equals(blank),'complete canvas has no fallback pixels').toBe(true);
    expect(await page.evaluate(()=>(window as ContractWindow).contractInputUnchanged())).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('enchant costs use native-confirmed success and disabled foreground and shadow bytes',async({page})=>{
  await page.goto('/');await page.evaluate(()=>document.fonts.ready);
  const options=page.locator('#workstations .mc-enchanting__option');await expect(options).toHaveCount(3);
  const expected=[{color:[127,255,31],shadow:[32,64,8],disabled:false},{color:[127,255,31],shadow:[32,64,8],disabled:false},{color:[137,94,91],shadow:[34,23,23],disabled:true}];
  for(let index=0;index<3;index++) {
    const option=options.nth(index),cost=option.locator('.mc-enchanting__cost'),want=expected[index]!;
    const actual=await cost.evaluate(node=>{const s=getComputedStyle(node);return{color:s.color.match(/\d+/g)?.map(Number),shadow:s.textShadow.match(/[\d.]+/g)?.map(Number)};});
    expect(actual.color).toEqual(want.color);
    // Both states' bytes and GUI5 (5,5) displacement are sampled below from
    // genuine native PNGs, independently of these CSS regression expectations.
    expect(actual.shadow).toEqual([...want.shadow,2,2,0]);
    if(want.disabled)await expect(option).toBeDisabled();else await expect(option).toBeEnabled();
    const outer=await option.boundingBox(),inner=await cost.boundingBox();
    expect(Math.abs(outer!.x+outer!.width-inner!.x-inner!.width-4)).toBeLessThanOrEqual(.02);
    expect(Math.abs(outer!.y+outer!.height-inner!.y-inner!.height-4)).toBeLessThanOrEqual(.02);
  }
  // Host calibration remains possible for another resource pack or game version.
  const cost=options.nth(0).locator('.mc-enchanting__cost');
  await cost.evaluate(node=>(node as HTMLElement).style.setProperty('--mc-enchantment-cost-shadow','#112233'));
  expect(await cost.evaluate(node=>getComputedStyle(node).textShadow)).toBe('rgb(17, 34, 51) 2px 2px 0px');
});

const nativeSamples={
  open:{file:'enchanting-open-native-lossless.png',sha:'0d58418de8fe8751481563e13e4615b6752907394d73926746d627900bf308fa'},
  closed:{file:'enchanting-closed-native-lossless.png',sha:'c2ae69ebe7615bcb8e4e993e261833b7e72aa9cefe9ddadaba189cc01bc15646'},
  insufficient:{file:'enchanting-insufficient-native-lossless.png',sha:'57d8cb8ecd4f28750500cbd4b7d513e158c0f897f9c42143139a3992347ec7a9'},
} as const;
async function nativeSample(state:keyof typeof nativeSamples) {
  const reference=nativeSamples[state],path=new URL(`../.cache/native-gui/${reference.file}`,import.meta.url);
  const bytes=await readFile(path);expect(bytes.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(reference.sha);
  const image=PNG.sync.read(bytes);expect([image.width,image.height]).toEqual([2568,1400]);return image;
}

test('rune default uses native-confirmed foreground bytes and preserves host tint control',()=>{
  const props={text:'AIZ',atlasUrl:'/host-owned/ascii_sga.png'};
  const ordinary=renderToStaticMarkup(createElement(EnchantingRunes,props));
  expect(ordinary).toContain('color:#685d49');
  expect(renderToStaticMarkup(createElement(EnchantingRunes,{...props,color:'#123456'}))).toContain('color:#123456');
});

test('optional native open and insufficient PNGs independently establish rune foreground bytes',async()=>{
  test.skip(!(['open','insufficient','closed'] as const).every(state=>existsSync(new URL(`../.cache/native-gui/${nativeSamples[state].file}`,import.meta.url))),'User-owned native PNGs are optional and never bundled.');
  // Fixed source-space ROIs contain only rune labels and their panel background;
  // the book, cost digits and level glyphs lie outside these bounds. Insets and
  // antialiased glyph edges are retained; only the opaque dominant foreground
  // is certified here, not complete native text raster equality.
  for(const state of ['open','insufficient','closed'] as const){
    const image=await nativeSample(state);
    for(let row=0;row<3;row++){
      const frequencies=new Map<string,number>();
      for(let y=375+101*row;y<445+101*row;y++)for(let x=1240;x<1550;x++){
        const i=4*(y*image.width+x),color=[...image.data.subarray(i,i+4)].join(',');
        frequencies.set(color,(frequencies.get(color)??0)+1);
      }
      if(state==='closed'){
        expect([...frequencies]).toEqual([['81,73,58,255',21700]]);
      }else{
        expect(frequencies.get('104,93,73,255')).toBe([2110,1835,1875][row]);
        const foreground=[...frequencies].filter(([color])=>color!==(state==='open'?'160,145,114,255':'81,73,58,255')).sort((a,b)=>b[1]-a[1]);
        expect(foreground[0]?.[0]).toBe('104,93,73,255');
      }
    }
  }
});
const gui4Path=new URL('../.cache/native-capture-audit/enchanting-gui4-open-native.png',import.meta.url);
async function nativeGui4Sample(){
  const bytes=await readFile(gui4Path);
  expect(bytes.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(createHash('sha256').update(bytes).digest('hex')).toBe('9db5c35d6d9a1cb1d1178f0db2bdf6e5adae12e11d96e8137be32792975876e8');
  const image=PNG.sync.read(bytes);expect([image.width,image.height]).toEqual([2568,1400]);return image;
}

test('optional native GUI4 and GUI5 retain one-physical-pixel rune edge bands',async({},testInfo)=>{
  test.skip(!existsSync(gui4Path)||!existsSync(new URL(`../.cache/native-gui/${nativeSamples.open.file}`,import.meta.url)),
    'User-owned native GUI4/GUI5 PNGs are optional and never bundled.');
  const gui4=await nativeGui4Sample(),gui5=await nativeSample('open');
  const background=[160,145,114,255],foreground=[104,93,73,255],leftEdge=[108,97,76,255],rightEdge=[156,141,111,255];
  const at=(image:PNG,x:number,y:number)=>[...image.data.subarray(4*(y*image.width+x),4*(y*image.width+x)+4)];
  // Independent original-atlas matching identifies the same "mental" word at
  // both scales. These complete source-pixel components include a blank halo;
  // every RGBA byte is checked, with no threshold, mask or tolerance. This is
  // native observation evidence, not production text-raster certification.
  for(const sample of [{image:gui4,scale:4,x:1255,y:448},{image:gui5,scale:5,x:1246,y:387}]){
    const profile=[background,background,background,leftEdge,...Array.from({length:sample.scale-1},()=>foreground),rightEdge,background,background,background];
    for(let y=0;y<sample.scale+2;y++)for(let x=0;x<profile.length;x++){
      expect(at(sample.image,sample.x+x,sample.y+y),`GUI${sample.scale} complete component at ${x},${y}`)
        .toEqual(y===0||y===sample.scale+1?background:profile[x]);
    }
  }
  // Independently confirm GUI4 from three adjacent inventory cells: 4px dark
  // border, 64px interior, 4px white border, 72px pitch. Frame dimensions alone
  // do not certify the game client rectangle or a nominal horizontal crop.
  for(const top of [709,781,853])for(let y=0;y<72;y++){
    expect(at(gui4,1000,top+y)).toEqual(y<4?[55,55,55,255]:y<68?[139,139,139,255]:[255,255,255,255]);
  }
  await testInfo.attach('native-cross-scale-rune-observation',{
    body:JSON.stringify({gui4Component:[1255,448,11,6],gui5Component:[1246,387,12,7],
      mixedEdgePixelsPerSide:1,gui4SolidWidth:3,gui5SolidWidth:4,productionRasterCertified:false},null,2),contentType:'application/json'});
});

function bookRegion(source:PNG,native:boolean) {
  // Entire object plus clear background margins, chosen to exclude the title
  // above and item slots below. No book border, texel or edge is masked out.
  const image=new PNG({width:200,height:165});PNG.bitblt(source,image,native ? 916 : 0,native ? 350 : 15,200,165,0,0);return image;
}
function averageError(actual:PNG,reference:PNG) {
  let sum=0,rgbaSum=0,changed=0,alphaChanged=0,max=0;
  for(let i=0;i<actual.data.length;i+=4){let differs=false;for(let c=0;c<4;c++){
    const difference=Math.abs(actual.data[i+c]!-reference.data[i+c]!);rgbaSum+=difference;if(c<3)sum+=difference;
    if(difference){differs=true;if(c===3)alphaChanged++;}max=Math.max(max,difference);
  }if(differs)changed++;}
  return{mae:sum/(actual.width*actual.height*3),rgbaMae:rgbaSum/(actual.width*actual.height*4),absoluteRgbErrorSum:sum,
    changedPixels:changed,alphaChangedPixels:alphaChanged,maxChannelError:max};
}
function foregroundBounds(image:PNG) {
  let x0=image.width,y0=image.height,x1=-1,y1=-1;
  for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){const i=4*(y*image.width+x);if(image.data[i]!==198||image.data[i+1]!==198||image.data[i+2]!==198){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}}
  return{x:x0,y:y0,width:x1-x0+1,height:y1-y0+1};
}
test('optional native open and closed PNGs show a large unmasked calibration improvement, not exact-match certification',async({page},testInfo)=>{
  test.skip(!(['open','closed'] as const).every(state=>existsSync(new URL(`../.cache/native-gui/${nativeSamples[state].file}`,import.meta.url))),'User-owned native PNGs are optional and excluded from the package.');
  const errors=await instrumentation(page);await page.goto('/calibration.html');
  await page.evaluate(async()=>{
    const reactPath='/@id/react',domPath='/@id/react-dom/client',bookPath='/src/enchanting-book.tsx';
    const [r,d,book]=await Promise.all([import(reactPath),import(domPath),import(bookPath)]),React=r.default ?? r,ReactDOM=d.default ?? d;
    const stage=document.createElement('div');stage.id='native-book-comparison';document.body.appendChild(stage);const root=ReactDOM.createRoot(stage);
    (window as typeof window & {paintNativeBook:(open:number,lighting:'calibrated'|'unlit')=>void}).paintNativeBook=(open,lighting)=>root.render(React.createElement(book.EnchantingBook,{open,lighting,width:200,height:200,'aria-label':'Native comparison book',style:{position:'fixed',left:16,top:16,width:200,height:200,background:'#c6c6c6',zIndex:2147483647}}));
  });
  const canvas=page.locator('#native-book-comparison canvas'),reports=[];
  for(const state of ['open','closed'] as const){
    const reference=bookRegion(await nativeSample(state),true),pictures:Partial<Record<'calibrated'|'unlit',PNG>>={};
    for(const lighting of ['unlit','calibrated'] as const){
      const before=await canvas.count() ? Number(await canvas.getAttribute('data-qa-draws')) : 0;
      await page.evaluate(({open,lighting})=>(window as typeof window & {paintNativeBook:(open:number,lighting:'calibrated'|'unlit')=>void}).paintNativeBook(open,lighting),{open:state==='open' ? 1 : 0,lighting});
      await expect.poll(async()=>Number(await canvas.getAttribute('data-qa-draws'))).toBeGreaterThan(before);await rendered(canvas);
      pictures[lighting]=bookRegion(PNG.sync.read(await canvas.screenshot()),false);
    }
    const unlit=averageError(pictures.unlit!,reference),calibrated=averageError(pictures.calibrated!,reference);
    expect(calibrated.mae,state+' complete-region byte error').toBeLessThan(1.5);
    expect(calibrated.mae,state+' improvement over unchanged atlas').toBeLessThan(unlit.mae*.1);
    // One source-fixed equation must improve both already-known native states;
    // this is not an unseen-pose holdout. These are the prior empirical
    // renderer's measured sums/counts in the same complete ROI.
    const previous=state==='open'?{sum:41093,changed:2239}:{sum:17483,changed:1281};
    expect(calibrated.absoluteRgbErrorSum,state+' improvement over previous empirical equation').toBeLessThan(previous.sum);
    expect(calibrated.changedPixels,state+' fewer differing RGBA pixels').toBeLessThan(previous.changed);
    expect(calibrated.alphaChangedPixels,state+' complete alpha-plane agreement').toBe(0);
    expect(calibrated.rgbaMae,state+' complete RGBA improvement').toBeLessThan(previous.sum/(200*165*4));
    // Native edges have partial-coverage pixels; the WebGL reconstruction is
    // not antialiased. A one-pixel bound difference is recorded, not concealed.
    const nativeBox=foregroundBounds(reference),webBox=foregroundBounds(pictures.calibrated!);
    for(const key of ['x','y','width','height'] as const)expect(Math.abs(nativeBox[key]-webBox[key]),state+' '+key).toBeLessThanOrEqual(1);
    expect(calibrated.changedPixels,'residual differences must not be mislabeled exact').toBeGreaterThan(0);
    reports.push({state,unlit,calibrated,nativeBox,webBox});
    await testInfo.attach(state+' native complete book region',{body:PNG.sync.write(reference),contentType:'image/png'});
    await testInfo.attach(state+' calibrated complete book region',{body:PNG.sync.write(pictures.calibrated!),contentType:'image/png'});
  }
  await testInfo.attach('native-calibration-error-and-residuals',{body:JSON.stringify(reports,null,2),contentType:'application/json'});expect(errors).toEqual([]);
});

test('optional native GUI4 book keeps fixed parameters and reports the complete scaled region',async({page},testInfo)=>{
  test.skip(!existsSync(gui4Path),'User-owned native GUI4 PNG is optional and never bundled.');
  const source=await nativeGui4Sample(),reference=new PNG({width:160,height:132});
  // Source root [940,365,704,664] and JSON book offset [13,10.5]*4 give
  // canvas [992,407,160,160]. Scale the existing GUI5 ROI by 4/5; do not
  // optimize registration against book pixels or exclude partial edges.
  PNG.bitblt(source,reference,992,419,160,132,0,0);
  const errors=await instrumentation(page);await page.goto('/calibration.html');
  await page.evaluate(async()=>{
    const reactPath='/@id/react',domPath='/@id/react-dom/client',bookPath='/src/enchanting-book.tsx';
    const [r,d,book]=await Promise.all([import(reactPath),import(domPath),import(bookPath)]),React=r.default??r,ReactDOM=d.default??d;
    const stage=document.createElement('div');stage.id='gui4-book-comparison';document.body.appendChild(stage);const root=ReactDOM.createRoot(stage);
    (window as typeof window&{paintGui4Book:(lighting:'calibrated'|'unlit')=>void}).paintGui4Book=lighting=>root.render(React.createElement(book.EnchantingBook,
      {lighting,width:160,height:160,style:{position:'fixed',left:16,top:16,width:160,height:160,background:'#c6c6c6',zIndex:2147483647}}));
  });
  const canvas=page.locator('#gui4-book-comparison canvas'),pictures:Partial<Record<'calibrated'|'unlit',PNG>>={};
  for(const lighting of ['unlit','calibrated'] as const){
    const before=await canvas.count()?Number(await canvas.getAttribute('data-qa-draws')):0;
    await page.evaluate(lighting=>(window as typeof window&{paintGui4Book:(lighting:'calibrated'|'unlit')=>void}).paintGui4Book(lighting),lighting);
    await expect.poll(async()=>Number(await canvas.getAttribute('data-qa-draws'))).toBeGreaterThan(before);await rendered(canvas);
    const image=new PNG({width:160,height:132});PNG.bitblt(PNG.sync.read(await canvas.screenshot()),image,0,12,160,132,0,0);pictures[lighting]=image;
  }
  const unlit=averageError(pictures.unlit!,reference),calibrated=averageError(pictures.calibrated!,reference);
  expect(calibrated.mae,'fixed lighting improves the same pose at the new GUI scale').toBeLessThan(unlit.mae*.1);
  // Prior empirical lighting measured independently with the same new-scale
  // registration, mesh and atlas. No coefficient was refitted for GUI4.
  expect(calibrated.absoluteRgbErrorSum).toBeLessThan(47545);
  expect(calibrated.changedPixels).toBeLessThan(1853);
  expect(calibrated.alphaChangedPixels).toBe(0);
  await testInfo.attach('gui4-complete-book-region-measurement',{body:JSON.stringify({scope:'New scale of the known open pose; native raster equality remains unproven',
    nativeRoi:[992,419,160,132],webRoi:[0,12,160,132],pixels:21120,unlit,calibrated,
    nativeBox:foregroundBounds(reference),webBox:foregroundBounds(pictures.calibrated!)},null,2),contentType:'application/json'});
  await testInfo.attach('gui4-complete-native-book-region',{body:PNG.sync.write(reference),contentType:'image/png'});
  await testInfo.attach('gui4-complete-production-book-region',{body:PNG.sync.write(pictures.calibrated!),contentType:'image/png'});
  expect(errors).toEqual([]);
});

test('optional native PNG proves opaque green bytes and the threshold-detected shadow displacement',async()=>{
  test.skip(!existsSync(new URL(`../.cache/native-gui/${nativeSamples.open.file}`,import.meta.url)),'User-owned native PNG is optional.');
  const image=await nativeSample('open');
  for(let row=0;row<3;row++){
    const foreground=new Set<string>(),shadow=new Set<string>();let opaqueGreen=0,opaqueShadow=0;
    for(let y=380+101*row;y<450+101*row;y++)for(let x=1600;x<1705;x++){
      const i=4*(y*image.width+x),r=image.data[i]!,g=image.data[i+1]!,b=image.data[i+2]!;
      if(r===127&&g===255&&b===31)opaqueGreen++;if(r===32&&g===64&&b===8)opaqueShadow++;
      if(g>180&&r<140&&b<70)foreground.add(`${x},${y}`);
      if(r<80&&g<120&&g>r+10&&g>b+15)shadow.add(`${x},${y}`);
    }
    expect(opaqueGreen).toBeGreaterThan(200);expect(opaqueShadow).toBeGreaterThan(200);
    const predicted=new Set([...foreground].map(key=>{const [x,y]=key.split(',').map(Number);return `${x!+5},${y!+5}`;}).filter(key=>!foreground.has(key)));
    expect([...shadow].sort()).toEqual([...predicted].sort());
  }
});

test('optional insufficient-state PNG proves opaque red bytes and its threshold-detected shadow displacement',async()=>{
  test.skip(!existsSync(new URL(`../.cache/native-gui/${nativeSamples.insufficient.file}`,import.meta.url)),'User-owned native PNG is optional.');
  const image=await nativeSample('insufficient');
  for(let row=0;row<3;row++){
    const foreground=new Set<string>(),shadow=new Set<string>();let opaqueRed=0,opaqueShadow=0;
    for(let y=380+101*row;y<450+101*row;y++)for(let x=1600;x<1705;x++){
      const i=4*(y*image.width+x),r=image.data[i]!,g=image.data[i+1]!,b=image.data[i+2]!;
      if(r===137&&g===94&&b===91)opaqueRed++;if(r===34&&g===23&&b===23)opaqueShadow++;
      if(r>100&&g>70&&g<110&&b>70&&b<110)foreground.add(`${x},${y}`);
      if(r<60&&g<45&&b<45&&r>g+3)shadow.add(`${x},${y}`);
    }
    expect(opaqueRed).toBeGreaterThan(200);expect(opaqueShadow).toBeGreaterThan(200);
    const predicted=new Set([...foreground].map(key=>{const [x,y]=key.split(',').map(Number);return `${x!+5},${y!+5}`;}).filter(key=>!foreground.has(key)));
    expect([...shadow].sort()).toEqual([...predicted].sort());
  }
});

test('main enchanting page paints a textured book without page or GL errors',async({page},testInfo)=>{
  const errors=await instrumentation(page);await page.goto('/');await page.evaluate(()=>document.fonts.ready);
  // The main book is intentionally decorative inside aria-hidden=true.
  const region=page.locator('#workstations .mc-enchanting'),canvas=region.locator('canvas.mc-enchanting-book');
  await rendered(canvas);await expect(region.locator('.mc-enchanting__cost')).toHaveText(['3','15','30']);
  await mkdir(new URL('../.cache/enchanting-independent-qa/',import.meta.url),{recursive:true});
  const path=fileURLToPath(new URL('../.cache/enchanting-independent-qa/enchanting-unmasked.png',import.meta.url));
  await region.screenshot({path});await testInfo.attach('actual-implementation-not-native-reference',{path,contentType:'image/png'});
  expect(errors).toEqual([]);
});

test('lapis underlay stays opaque at source size beneath empty and occupied slot contents',async({page})=>{
  const verify=async(slot:Locator,occupied:boolean)=>{
    const underlay=slot.locator('.mc-slot__underlay'),placeholder=underlay.locator('.mc-enchanting__lapis-placeholder'),item=slot.locator('.mc-slot__item');
    await expect(underlay).toHaveCount(1);await expect(placeholder).toHaveCount(1);
    const data=await placeholder.evaluate(node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return{width:r.width,height:r.height,opacity:s.opacity,background:s.backgroundImage};});
    expect([data.width,data.height,data.opacity]).toEqual([32,32,'1']);expect(data.background).not.toBe('none');
    expect(await underlay.evaluate(node=>getComputedStyle(node).opacity)).toBe('1');
    const z=await Promise.all([underlay.evaluate(node=>Number(getComputedStyle(node).zIndex)),item.evaluate(node=>Number(getComputedStyle(node).zIndex))]);expect(z[0]!).toBeLessThan(z[1]!);
    const outer=await slot.boundingBox(),inside=await placeholder.boundingBox();expect([inside!.x-outer!.x,inside!.y-outer!.y]).toEqual([2,2]);
    if(occupied){await expect(slot).not.toHaveAttribute('data-empty');await expect(item.locator('img')).toHaveCount(1);}else await expect(slot).toHaveAttribute('data-empty','true');
  };
  await page.goto('/calibration.html');await verify(page.locator('[data-case="enchanting"] .mc-enchanting__lapis'),false);
  await page.goto('/');await verify(page.locator('#workstations .mc-enchanting__lapis'),true);
});
