import {expect,test} from '@playwright/test';
import type {Page,Locator} from '@playwright/test';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PNG} from 'pngjs';
import type {CommandQASettings} from '../demo/command-block-fixture';
// Whole official v1.26.60.5 sources. No production layout/helper as oracle.
const originals=[
  ['dialog_background_hollow_3','cf16fa7c6598d90d9b3f43b3ce7779de065c07fb29568d860588694ffe596e5b',18,33],
  ['dialog_divider','c9f4386d5bfcbdad6de9e74a9b297e597bece3b1529222e40cdccda164164318',3,1],
  ['minimize','55666883992a80192747ec30d61cfe946e3a3b6ea0063b7c654647ffbe2ff946',16,16],
  ['minimizeHover','c32e96da35ea761b8743601000c1c3367639088cf64e0279609161552aa817f9',16,16],
  ['minimizePress','65f6e269fd369b67d93a92e46e08613c76a17ed6541d31e09ee671cf476620d0',16,16],
  ['arrowRight','4b7d2d5d5f7beed2eeeeebac93637b16ea1282c2796ecec8a27565fe07ac1b6f',8,8],
]as const;
const sourceBytes=(name:string)=>readFile(new URL(`../src/assets/command-block/${name}.png`,import.meta.url));
async function configure(page:Page,patch:Partial<CommandQASettings>){await page.evaluate(value=>window.commandQA.configure(value),patch);}
async function open(page:Page,patch:Partial<CommandQASettings>={}){await page.goto('/demo/command-block-fixture.html');await expect.poll(()=>page.evaluate(()=>window.commandQA?.mounted)).toBe(true);await configure(page,{showInput:false,showOutput:false,...patch});}
async function rect(node:Locator,origin:Locator,scale:number){const a=await node.boundingBox(),b=await origin.boundingBox();expect(a).not.toBeNull();expect(b).not.toBeNull();return[(a!.x-b!.x)/scale,(a!.y-b!.y)/scale,a!.width/scale,a!.height/scale];}
function near(actual:number[],expected:readonly number[]){actual.forEach((value,index)=>expect(value).toBeCloseTo(expected[index]!,6));}
const cssURL=(value:string)=>{expect(value.startsWith('url(')).toBe(true);return value.slice(4,-1).replace(/^["']|["']$/g,'');};
async function urlBytes(page:Page,value:string){if(value.startsWith('data:'))return Buffer.from(value.slice(value.indexOf(',')+1),'base64');const result=await page.request.get(value);expect(result.ok()).toBe(true);return result.body();}

test('six full original PNGs and two raw metadata files retain independent byte and dimension identities',async()=>{
  for(const[name,digest,width,height]of originals){const bytes=await sourceBytes(name);expect(createHash('sha256').update(bytes).digest('hex'),name).toBe(digest);const png=PNG.sync.read(bytes);expect([png.width,png.height]).toEqual([width,height]);}
  for(const[name,metadata]of [['dialog_background_hollow_3',{nineslice_size:[8,23,8,8],base_size:[18,33]}],['dialog_divider',{nineslice_size:[1,0,1,0],base_size:[3,1]}]]as const)expect(JSON.parse(await readFile(new URL(`../src/assets/command-block/${name}.json`,import.meta.url),'utf8'))).toEqual(metadata);
});

test('desktop panel policy columns divider header hitboxes and expanded editor follow complete parent scopes',async({page})=>{
  await open(page);const root=page.locator('#command-editor-host .mc-command-block'),panel=root.locator('.mc-command-block__panel');
  for(const[viewport,panelSize,scale]of [[[400,300],[370,250],1],[[304,250],[300,200],2]]as const){
    await configure(page,{viewportSize:viewport,scale});await expect(root).toHaveCSS('width',`${viewport[0]*scale}px`);near(await rect(panel,root,scale),[(viewport[0]-panelSize[0])/2,(viewport[1]-panelSize[1])/2,...panelSize]);
    const[w,h]=panelSize;
    near(await rect(panel.locator('.mc-command-block__left'),panel,scale),[8,23,.4*w-8,h-31]);near(await rect(panel.locator('.mc-command-block__right'),panel,scale),[.4*w+5,23,.6*w-13,h-31]);
    near(await rect(panel.locator('.mc-command-block__divider'),panel,scale),[.4*w,22,5,h-29]);
    const title=await rect(panel.locator('.mc-command-block__title'),panel,scale);expect(title[0]!+title[2]!/2).toBeCloseTo(w/2,6);expect(title[1]).toBe(8);
    near(await rect(panel.locator('.mc-command-block__close-holder'),panel,scale),[w-22,4,18,16]);near(await rect(panel.locator('[data-command-action="close"]'),panel,scale),[w-23.5,1.5,21,21]);
    await configure(page,{expanded:true});near(await rect(panel.locator('.mc-command-input__edit'),panel,scale),[8,23,w-16,h-31]);await expect(panel.locator('.mc-command-block__left')).toBeHidden();await expect(panel.locator('.mc-command-block__divider')).toBeHidden();await configure(page,{expanded:false});
  }
  await configure(page,{panelSize:[350,260],viewportSize:[400,300],scale:1});near(await rect(panel,root,1),[25,20,350,260]);
});

test('source field boxes two nine-unit scrollbars and independent output dimensions stay distinct',async({page})=>{
  await open(page,{scale:1,viewportSize:[400,300]});const panel=page.locator('#command-editor-host .mc-command-block__panel');
  for(const selector of['.mc-command-block__left','.mc-command-block__right']){const bar=panel.locator(`${selector} .mc-scrollbar[data-orientation="vertical"]`);expect((await bar.boundingBox())!.width).toBe(9);expect((await bar.locator('.mc-scrollbar__track').boundingBox())!.width).toBe(3);expect((await bar.locator('.mc-scrollbar__thumb').boundingBox())!.width).toBe(5);expect(await panel.locator(`${selector} .mc-scroll-area__viewport`).evaluate(node=>getComputedStyle(node).scrollbarWidth)).toBe('none');}
  for(const selector of['#command-hover-note','#command-tick-delay'])expect((await panel.locator(selector).boundingBox())!.height).toBe(30);
  for(const box of await panel.getByRole('combobox').all())expect((await box.boundingBox())!.height).toBe(30);
  const output=panel.locator('.mc-command-output'),pre=output.locator('pre'),width=(await output.boundingBox())!.width;
  expect((await output.locator('.mc-command-output__header').boundingBox())!.height).toBe(12);expect((await pre.boundingBox())!.height).toBe(60);expect((await pre.boundingBox())!.width).toBeCloseTo(width*.85+26,6);
  const trackControl=output.locator('.mc-command-output__track-control');expect([(await trackControl.boundingBox())!.width,(await trackControl.boundingBox())!.height]).toEqual([32,12]);
  const track=trackControl.locator('.mc-switch');expect([(await track.boundingBox())!.width,(await track.boundingBox())!.height]).toEqual([30,16]);
  expect(await pre.evaluate(node=>({tab:node.tabIndex,editable:(node as HTMLElement).isContentEditable}))).toEqual({tab:-1,editable:false});
});

test('actual skin URLs retain whole originals and minimize states match independent original CSS POINT planes',async({page},testInfo)=>{
  await open(page,{scale:2,expanded:true});const panel=page.locator('#command-editor-host .mc-command-block__panel');
  for(const[selector,property,pseudo,digest]of [['.mc-command-block__background','borderImageSource','::after',originals[0][1]],['.mc-command-block__divider','borderImageSource',null,originals[1][1]]]as const){const value=await panel.locator(selector).evaluate((node,info)=>getComputedStyle(node,info.pseudo)[info.property],{property,pseudo});expect(createHash('sha256').update(await urlBytes(page,cssURL(value))).digest('hex')).toBe(digest);}
  const button=panel.locator('[data-command-action="header-minimize"]');await button.evaluate(node=>{const style=(node as HTMLElement).style;style.position='fixed';style.left='1100px';style.top='8px';style.transform='none';style.backgroundColor='#000';style.zIndex='999999';});
  const proofs=[];
  for(const[state,name]of [['default','minimize'],['hover','minimizeHover'],['pressed','minimizePress']]as const){
    if(state==='default')await page.mouse.move(0,0);else await button.hover();if(state==='pressed')await page.mouse.down();
    const bytes=await sourceBytes(name),url=cssURL(await button.evaluate(node=>getComputedStyle(node).backgroundImage));expect(await urlBytes(page,url)).toEqual(bytes);
    await button.evaluate(async(_node,url)=>{const source=new window.Image();source.src=url;await source.decode();},url);
    const actual=PNG.sync.read(await button.screenshot({caret:'initial',animations:'disabled'}));
    await page.evaluate(async data=>{const source=new window.Image();source.src=data;await source.decode();const reference=document.createElement('div');reference.id='command-independent-plane';Object.assign(reference.style,{position:'fixed',left:'1000px',top:'180px',width:'42px',height:'42px',backgroundColor:'#000',backgroundImage:`url(${data})`,backgroundPosition:'center',backgroundSize:'30px 30px',backgroundRepeat:'no-repeat',imageRendering:'pixelated'});document.body.append(reference);},`data:image/png;base64,${bytes.toString('base64')}`);
    const reference=page.locator('#command-independent-plane');const expected=PNG.sync.read(await reference.screenshot({caret:'initial',animations:'disabled'}));
    expect([actual.width,actual.height]).toEqual([42,42]);expect([expected.width,expected.height]).toEqual([42,42]);let differingPixels=0;for(let i=0;i<actual.data.length;i+=4)if([0,1,2,3].some(c=>actual.data[i+c]!==expected.data[i+c]))differingPixels++;expect(differingPixels).toBe(0);proofs.push({state,pixels:42*42,differingPixels});await reference.evaluate(node=>node.remove());if(state==='pressed')await page.mouse.up();
  }
  await testInfo.attach('whole-original-minimize-css-host-contract',{body:JSON.stringify({proofs,scope:'Explicit21logical button/15logical original-image CSS POINT host plane on black, scale2. Source16-square PNG is loaded whole, with same independent browser CSS background path. Not native fit/raster/GUI certification.'}),contentType:'application/json'});
});

test('source popup rows use17logical cells and whole8square arrow while forced colors preserve semantic controls',async({page})=>{
  await open(page,{scale:1,viewportSize:[400,420]});const root=page.locator('#command-editor-host .mc-command-block'),trigger=root.getByRole('combobox',{name:'Block Type:',exact:true});
  const chevron=trigger.locator('.mc-combobox-chevron');const background=await chevron.evaluate(node=>getComputedStyle(node).backgroundImage);expect(createHash('sha256').update(await urlBytes(page,cssURL(background))).digest('hex')).toBe(originals[5][1]);
  await trigger.click();const popup=root.getByRole('listbox');await expect(root.getByRole('option')).toHaveCount(3);for(const option of await root.getByRole('option').all())expect((await option.boundingBox())!.height).toBe(17);
  expect((await popup.boundingBox())!.width).toBe((await trigger.boundingBox())!.width-4);await trigger.press('Escape');
  await page.emulateMedia({forcedColors:'active'});await root.getByRole('button',{name:'Close',exact:true}).focus();await expect(root.getByRole('button',{name:'Close',exact:true})).toBeFocused();expect(await root.locator('.mc-command-block__background').evaluate(node=>getComputedStyle(node,'::after').borderImageSource)).toBe('none');await expect(root.locator('.mc-command-block__background > span')).toBeHidden();await expect(root.locator('#command-actual-text')).toBeEditable();
});

test('reusable command row and output keep their own source geometry without depending on the editor panel',async({page})=>{
  await open(page,{showEditor:false,showInput:true,showOutput:true,scale:1});const input=page.locator('#command-standalone .mc-command-input'),row=input.locator('.mc-command-input__row');
  near(await rect(row,input,1),[2,14,316,30]);expect((await input.boundingBox())!.height).toBe(48);for(const name of['paste','maximize']){const button=input.locator(`[data-command-action="${name}"]`);expect([(await button.boundingBox())!.width,(await button.boundingBox())!.height]).toEqual([30,30]);}
  const output=page.locator('#command-output-host .mc-command-output');expect((await output.locator('pre').boundingBox())!.width).toBe(281);expect((await output.locator('pre').boundingBox())!.height).toBe(60);
  await input.locator('[data-command-action="maximize"]').click();await expect(input).toHaveAttribute('data-expanded','true');await expect(input.locator('textarea')).toHaveCount(1);await expect(input.locator('[data-command-action="paste"]')).toBeHidden();
});

test('whole original Plus pixels multiply source default hover and locked tints on explicit black host planes',async({page},testInfo)=>{
  // common_buttons.light_glyph_button -> glyph_content_panel -> glyph color.
  // Original _global_variables light_glyph colors are .3 /1 /.7. These are
  // independent source literals, never inferred from product filters or pixels.
  const source=await readFile(new URL('../src/assets/gui-icons/plus.png',import.meta.url));
  const digest='965fa4c152e09cdd8d61ead15b5eb2ecefd9e1c78cd49a9b652b84b78bf55f9f';
  expect(createHash('sha256').update(source).digest('hex')).toBe(digest);
  const original=PNG.sync.read(source);expect([original.width,original.height]).toEqual([11,11]);
  await open(page,{scale:2});const button=page.locator('#command-editor-host [data-command-action="maximize"]'),icon=button.locator('[data-gui-icon="plus"]'),image=icon.locator('img');
  expect(createHash('sha256').update(await urlBytes(page,(await image.getAttribute('src'))!)).digest('hex')).toBe(digest);
  // Keep the actual stateful Button and actual tint-bearing icon ancestor.
  // Only isolate its paint position and place black behind transparent texels.
  await icon.evaluate(node=>{Object.assign((node as HTMLElement).style,{position:'fixed',left:'1100px',top:'8px',zIndex:'999999'});});
  await image.evaluate(async node=>{(node as HTMLImageElement).style.backgroundColor='#000';await(node as HTMLImageElement).decode();});
  const proofs=[];
  for(const[state,scalar]of [['default',.3],['hover',1],['disabled',.7]]as const){
    if(state==='default')await page.mouse.move(0,0);
    if(state==='hover')await button.hover();
    if(state==='disabled'){await configure(page,{disabled:true});await expect(button).toBeDisabled();}
    const actual=PNG.sync.read(await image.screenshot({caret:'initial',animations:'disabled'}));
    await page.evaluate(async({data,scalar})=>{const source=new window.Image();source.src=data;await source.decode();const reference=document.createElement('img');reference.id='command-plus-source-plane';reference.src=data;Object.assign(reference.style,{position:'fixed',left:'1000px',top:'180px',display:'block',width:'22px',height:'22px',imageRendering:'pixelated',backgroundColor:'#000',filter:`brightness(${scalar})`});document.body.append(reference);await reference.decode();},{data:`data:image/png;base64,${source.toString('base64')}`,scalar});
    const reference=page.locator('#command-plus-source-plane'),expected=PNG.sync.read(await reference.screenshot({caret:'initial',animations:'disabled'}));
    expect([actual.width,actual.height]).toEqual([22,22]);expect([expected.width,expected.height]).toEqual([22,22]);
    let differingPixels=0;const opaqueSourceColors=new Set<string>();
    for(let y=0;y<22;y++)for(let x=0;x<22;x++){
      const i=(y*22+x)*4,s=(Math.floor(y/2)*11+Math.floor(x/2))*4;
      if([0,1,2,3].some(channel=>actual.data[i+channel]!==expected.data[i+channel]))differingPixels++;
      if(original.data[s+3]===255)opaqueSourceColors.add(Array.from(actual.data.subarray(i,i+4)).join(','));
    }
    expect(differingPixels).toBe(0);proofs.push({state,sourceScalar:scalar,pixels:22*22,differingPixels,opaqueSourceColors:[...opaqueSourceColors]});
    await reference.evaluate(node=>node.remove());
  }
  await testInfo.attach('whole-plus-source-tint-css-host-contract',{body:JSON.stringify({sourceSHA256:digest,sourceSize:[11,11],proofs,scope:'Independent whole original PNG plus explicit source .3/1/.7 CSS brightness reference at integer2x on black. Full RGBA0, not merely computed-filter assertions. Browser CSS quantization is the declared host contract; native vertex/shader quantization and whole GUI pixel identity are not certified.'}),contentType:'application/json'});
});

test('first tick retains normal10 label plus16 toggle and inherited4 footer before separate2 tick delay spacer',async({page},testInfo)=>{
  // Source: command option_label_execute_on_first_tick + settings.option_toggle
  // desktop one_line_layout -> option_generic_core/control(min16) + trailing4.
  // The following offset_tick_delay2 is an independent source sibling. This
  // does not redefine previous-output's explicit32x12 option wrapper.
  await open(page,{viewportSize:[400,300]});const root=page.locator('#command-editor-host .mc-command-block'),group=root.locator('.mc-command-block__first-tick'),proofs=[];
  for(const scale of[2,3]){
    await configure(page,{scale});await expect(root).toHaveCSS('width',`${400*scale}px`);
    const wrapper=(await group.boundingBox())!,label=(await group.locator('.mc-choice__text').boundingBox())!,toggle=(await group.locator('.mc-switch').boundingBox())!,ticks=(await root.locator('.mc-command-block__ticks').boundingBox())!;
    expect(label.height/scale).toBe(10);expect(toggle.height/scale).toBe(16);expect((toggle.y-label.y)/scale).toBe(10);
    expect(wrapper.height/scale).toBe(30);expect((wrapper.y+wrapper.height-toggle.y-toggle.height)/scale).toBe(4);expect((ticks.y-wrapper.y-wrapper.height)/scale).toBe(2);
    expect(await group.evaluate((node,scale)=>({padding:getComputedStyle(node).paddingBottom,margin:getComputedStyle(node).marginBottom,scale}),scale)).toEqual({padding:`${4*scale}px`,margin:`${2*scale}px`,scale});
    proofs.push({scale,label:label.height/scale,toggle:toggle.height/scale,inheritedFooter:4,wrapper:wrapper.height/scale,nextIndependentGap:(ticks.y-wrapper.y-wrapper.height)/scale});
  }
  await testInfo.attach('first-tick-complete-source-stack',{body:JSON.stringify({proofs,scope:'Complete static source inheritance with explicit normal-label10 host metric. Original toggle image remains16 high; source trailing4 is distinct from following2 spacer. Not native pixel geometry certification.'}),contentType:'application/json'});
});
