import {expect,test} from '@playwright/test';
import type {Page,Locator} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import type {StructureQASettings} from '../demo/structure-editor-fixture';
// Complete official Structure JSON SHA4794210e68573a05678797cb708a584bb840bf9106bf5adc8bbe62e80c4de62a.
// Literal geometry and whole bytes below are independent from product CSS/helpers.
const rotateSHA='535929d122ca84391115ebf92431ed47daaae747e61d03764cc3a9a30b04b502';
async function configure(page:Page,patch:Partial<StructureQASettings>){await page.evaluate(value=>window.structureQA.configure(value),patch);}
async function open(page:Page,patch:Partial<StructureQASettings>={}){await page.goto('/demo/structure-editor-fixture.html');await expect.poll(()=>page.evaluate(()=>window.structureQA?.mounted)).toBe(true);await configure(page,{showXYZ:false,...patch});}
async function rect(node:Locator,origin:Locator,scale:number){const a=await node.boundingBox(),b=await origin.boundingBox();expect(a).not.toBeNull();expect(b).not.toBeNull();return[(a!.x-b!.x)/scale,(a!.y-b!.y)/scale,a!.width/scale,a!.height/scale];}
function near(actual:number[],expected:readonly number[]){actual.forEach((value,index)=>expect(value).toBeCloseTo(expected[index]!,6));}
function cssURL(value:string){expect(value.startsWith('url(')).toBe(true);return value.slice(4,-1).replace(/^["']|["']$/g,'');}
async function urlBytes(page:Page,value:string){if(value.startsWith('data:'))return Buffer.from(value.slice(value.indexOf(',')+1),'base64');const response=await page.request.get(value);expect(response.ok()).toBe(true);return response.body();}

test('whole Rotate and reused frame originals retain upstream bytes dimensions and raw companion metadata',async()=>{
  for(const[path,digest,width,height]of [
    ['structure-editor/Rotate.png',rotateSHA,45,7],['jigsaw/StoreTopBar.png','e247c9b13bc2b67a09e8a312c7c420680899d3f6d5a1d8a6269230c9cf212a98',3,5],['jigsaw/chevron_left.png','6347595f4a317c028fc9160d3d1a7f5cb12ead3af205ce34453381705eac264b',4,7],['jigsaw/dialog_background_hollow_4.png','274740b9ceed9229f6a20c46e0d840ecfb5c3b36bcff6cc9c7970e304a2b1893',18,18],['jigsaw/control.png','7997672f3c99b3bb967ad8fb2e3c19290f16a542e49d6a3572e6fd1bc355c4ab',2,2],
  ]as const){const bytes=await readFile(new URL(`../src/assets/${path}`,import.meta.url));expect(createHash('sha256').update(bytes).digest('hex')).toBe(digest);const png=PNG.sync.read(bytes);expect([png.width,png.height]).toEqual([width,height]);}
  expect(JSON.parse(await readFile(new URL('../src/assets/jigsaw/dialog_background_hollow_4.json',import.meta.url),'utf8'))).toEqual({nineslice_size:8,base_size:[18,18]});
});

test('independent XYZ source label and three vertical axis rows preserve20 height10 labels and right13 edits',async({page},testInfo)=>{
  await open(page,{showEditor:false,showXYZ:true});const group=page.locator('#xyz-host .mc-xyz-vector');
  for(const scale of[1,2]){await configure(page,{scale});await expect(group).toHaveCSS('--mc-structure-u',`${scale}px`);const width=(await group.boundingBox())!.width/scale;
    expect((await group.locator('legend').boundingBox())!.height/scale).toBe(10);expect((await group.boundingBox())!.height/scale).toBe(70);
    for(const[axis,index,color]of [['x',0,'rgb(255, 0, 0)'],['y',1,'rgb(0, 255, 0)'],['z',2,'rgb(0, 163, 255)']]as const){const row=group.locator(`[data-axis="${axis}"]`);near(await rect(row,group,scale),[0,10+index*20,width,20]);near(await rect(row.locator('label'),row,scale),[5,5,10,10]);near(await rect(row.locator('input'),row,scale),[17,0,width-30,20]);await expect(row.locator('label')).toHaveCSS('color',color);}
  }
  await testInfo.attach('xyz-source-layout-scope',{body:JSON.stringify({label:10,rows:[20,20,20],axisLabel:[5,5,10,10],inputWidth:'rowWidth-30',inputRight:13,scope:'Standalone literal source row geometry; natural70 group is explicit Web resolution. Original Save/Export parent50%c is not measured native layout.'}),contentType:'application/json'});
});

test('complete viewport header left right preview and footer scopes preserve sibling offsets and source help boxes',async({page})=>{
  await open(page);const root=page.locator('#structure-editor-host .mc-structure');
  for(const[width,height,scale]of [[480,300,1],[540,320,2]]as const){await configure(page,{size:[width,height],scale});await expect(root).toHaveCSS('width',`${width*scale}px`);
    near(await rect(root.locator('.mc-structure__left'),root,scale),[8,23,160,height-31]);near(await rect(root.locator('.mc-structure__right'),root,scale),[170,23,width-170,height-31]);
    near(await rect(root.locator('.mc-structure__header'),root,scale),[0,0,width,23]);const title=await rect(root.locator('.mc-structure__header h2'),root,scale);near([title[0]!,title[1]!],[40,6]);
    near(await rect(root.locator('.mc-structure__scroll-frame'),root,scale),[8,25,160,height-31]);near(await rect(root.locator('.mc-structure__scroll'),root,scale),[16,33,144,height-47]);
    near(await rect(root.locator('.mc-structure__preview-frame'),root,scale),[170,25,width-176,height-81]);near(await rect(root.locator('.mc-structure__preview'),root,scale),[178,33,width-192,height-97]);
    near(await rect(root.locator('.mc-structure__footer'),root,scale),[170,height-55,width-176,46]);near(await rect(root.locator('.mc-structure__footer-inner'),root,scale),[173,height-50,width-182,40]);
    const help=root.locator('.mc-structure__help');near(await rect(help,root,scale),[width-43,height-45,34,30]);expect((await help.locator('button').boundingBox())!.width/scale).toBe(30);expect((await help.locator('img').boundingBox())!.width/scale).toBe(32);expect((await help.locator('img').boundingBox())!.height/scale).toBe(16);
    expect(await root.locator('.mc-structure__scroll .mc-scroll-area__viewport').evaluate(node=>node.contains(document.querySelector('.mc-structure__footer')))).toBe(false);
  }
});

test('source custom toggle28 differs from generic first-tick and vector pair popup scrollbar and mirror boxes remain explicit',async({page})=>{
  await open(page,{scale:1});const root=page.locator('#structure-editor-host .mc-structure'),pair=root.locator('[data-structure-mode="save"] .mc-structure__vectors'),groups=pair.locator('.mc-xyz-vector');
  expect((await groups.nth(0).boundingBox())!.width).toBe((await pair.boundingBox())!.width/2);expect((await groups.nth(1).boundingBox())!.width).toBe((await pair.boundingBox())!.width/2);
  const toggle=root.locator('[data-structure-mode="save"] [data-structure-toggle="includeEntities"]');expect((await toggle.boundingBox())!.height).toBe(28);expect((await toggle.locator('.mc-switch-row').boundingBox())!.height).toBe(18);expect([(await toggle.locator('.mc-switch').boundingBox())!.width,(await toggle.locator('.mc-switch').boundingBox())!.height]).toEqual([30,16]);
  const bar=root.locator('.mc-scrollbar[data-orientation="vertical"]');expect((await bar.boundingBox())!.width).toBe(9);expect((await bar.locator('.mc-scrollbar__track').boundingBox())!.width).toBe(3);expect((await bar.locator('.mc-scrollbar__thumb').boundingBox())!.width).toBe(5);
  const mode=root.getByRole('combobox',{name:'Mode:',exact:true});await mode.click();for(const option of await root.getByRole('option').all())expect((await option.boundingBox())!.height).toBe(17);expect((await root.getByRole('listbox').boundingBox())!.width).toBe((await mode.boundingBox())!.width-4);await mode.press('Escape');
  const value=await page.evaluate(()=>window.structureQA.settings.value);await configure(page,{value:{...value,mode:'load'}});for(const box of await root.locator('.mc-structure__mirror .mc-choice__box').all())expect([(await box.boundingBox())!.width,(await box.boundingBox())!.height]).toEqual([10,10]);
});

test('actual whole source skins and tinted Rotate use independent original PNG CSS POINT host planes',async({page},testInfo)=>{
  await open(page,{scale:2,size:[480,300]});const root=page.locator('#structure-editor-host .mc-structure');
  for(const[selector,pseudo,property,digest]of [['.mc-structure__header',null,'borderImageSource','e247c9b13bc2b67a09e8a312c7c420680899d3f6d5a1d8a6269230c9cf212a98'],['.mc-structure__scroll-frame','::after','borderImageSource','274740b9ceed9229f6a20c46e0d840ecfb5c3b36bcff6cc9c7970e304a2b1893'],['.mc-structure__preview-frame','::after','borderImageSource','274740b9ceed9229f6a20c46e0d840ecfb5c3b36bcff6cc9c7970e304a2b1893'],['.mc-structure__footer','::before','backgroundImage','daa6d490de8583f424e24787812c6c2921bc688a7761d9d03e93badb27ed1d77']]as const){const value=await root.locator(selector).evaluate((node,info)=>getComputedStyle(node,info.pseudo)[info.property],{pseudo,property});expect(createHash('sha256').update(await urlBytes(page,cssURL(value))).digest('hex')).toBe(digest);}
  const bytes=await readFile(new URL('../src/assets/structure-editor/Rotate.png',import.meta.url)),image=root.locator('.mc-structure__rotation-hint');expect(createHash('sha256').update(await urlBytes(page,(await image.getAttribute('src'))!)).digest('hex')).toBe(rotateSHA);
  await image.evaluate(async node=>{Object.assign((node as HTMLImageElement).style,{position:'fixed',left:'1100px',top:'8px',bottom:'auto',transform:'none',backgroundColor:'#000',zIndex:'999999'});await(node as HTMLImageElement).decode();});
  const actual=PNG.sync.read(await image.screenshot({caret:'initial',animations:'disabled'}));await page.evaluate(async data=>{const ref=document.createElement('img');ref.id='structure-rotate-reference';ref.src=data;Object.assign(ref.style,{position:'fixed',left:'1000px',top:'180px',width:'90px',height:'14px',display:'block',backgroundColor:'#000',imageRendering:'pixelated',filter:'brightness(.6)'});document.body.append(ref);await ref.decode();},`data:image/png;base64,${bytes.toString('base64')}`);
  const expected=PNG.sync.read(await page.locator('#structure-rotate-reference').screenshot({caret:'initial',animations:'disabled'}));expect([actual.width,actual.height]).toEqual([90,14]);expect([expected.width,expected.height]).toEqual([90,14]);let differences=0;for(let i=0;i<actual.data.length;i+=4)if([0,1,2,3].some(c=>actual.data[i+c]!==expected.data[i+c]))differences++;expect(differences).toBe(0);
  await testInfo.attach('whole-rotate-source-tint-host-contract',{body:JSON.stringify({sourceSHA256:rotateSHA,sourceSize:[45,7],sourceTint:.6,scale:2,pixels:1260,differingPixels:differences,scope:'Whole original PNG with fixed source .6 on explicit CSS POINT black plane; no production RGB/filter oracle, no native shader quantization/renderer/whole GUI certification.'}),contentType:'application/json'});
});

test('actual file-upload progress uses original three layers and independent bar visibility with forced-color semantics',async({page})=>{
  await open(page,{scale:2,visibility:{progress:true,progressBar:true},progress:.25});const root=page.locator('#structure-editor-host .mc-structure'),bar=root.getByRole('progressbar');await expect(bar).toHaveAttribute('aria-valuenow','0.25');expect((await bar.boundingBox())!.height/2).toBe(5);
  for(const[selector,property,digest,width,height]of [['.mc-structure__progress-empty','borderImageSource','531bb4ca58b8bae327756840c19074ff6bbee08f0b479b17af2c960c041569c0',13,5],['.mc-structure__progress-full','borderImageSource','91978c74425ac8fad80e0f531610b28f621e14a618892c59e869c19f3c6149d1',13,5],['.mc-structure__progress-nub','backgroundImage','c81011ab8abed25f6aa48b52e1a6bfac2a193d2a753f594428774c3321c5eb55',11,5]]as const){const css=await root.locator(selector).evaluate((node,key)=>getComputedStyle(node)[key],property),bytes=await urlBytes(page,cssURL(css));expect(createHash('sha256').update(bytes).digest('hex')).toBe(digest);const png=PNG.sync.read(bytes);expect([png.width,png.height]).toEqual([width,height]);}
  await configure(page,{visibility:{progress:true,progressBar:false}});await expect(root.getByRole('progressbar')).toHaveCount(0);await expect(root.locator('.mc-structure__progress')).toBeVisible();
  await configure(page,{visibility:{progress:false}});await page.emulateMedia({forcedColors:'active'});await root.getByRole('button',{name:'Back',exact:true}).focus();await expect(root.getByRole('button',{name:'Back',exact:true})).toBeFocused();await expect(root.locator('.mc-structure__frame-fill').first()).toBeHidden();expect(await root.locator('.mc-structure__scroll-frame').evaluate(node=>getComputedStyle(node,'::after').borderImageSource)).toBe('none');
});
