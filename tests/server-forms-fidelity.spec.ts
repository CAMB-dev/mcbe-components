import {expect,test} from '@playwright/test';
import type {Locator,Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import type {ServerFormsQASettings} from '../demo/server-forms-fixture';
// Independent whole official server_form.json20532B SHAca718a8626eb0d0496c1e2b3e23695d10f3220211f2d3f1260b7f2123ad48c34.
// All parent scopes include ui_template_dialogs/title_label and ui_common scroll wrappers.
const originals=[['command-block/dialog_background_hollow_3.png','cf16fa7c6598d90d9b3f43b3ce7779de065c07fb29568d860588694ffe596e5b',18,33],
  ['book/close_button_default.png','5160569f357e661d38495b3f84c89f84b30cc6fdd87c796b65f457cae529054c',15,15],
  ['book/close_button_hover.png','16c89ba672607da0c452dacc79129f8eee995555bd061f51a1cb5bbab57bb877',15,15],
  ['book/close_button_pressed.png','9abf4fcaf21fbbfa09ee1aeb8599288d5a781b57b08b3e4b2848b54cb217aa03',15,15]]as const;
async function configure(page:Page,patch:Partial<ServerFormsQASettings>){await page.evaluate(value=>window.serverFormsQA.configure(value),patch);}
async function open(page:Page,patch:Partial<ServerFormsQASettings>={}){await page.goto('/demo/server-forms-fixture.html');await expect.poll(()=>page.evaluate(()=>window.serverFormsQA?.mounted)).toBe(true);await configure(page,patch);}
const action=(page:Page)=>page.locator('#server-action-host .mc-server-action-form');
const custom=(page:Page)=>page.locator('#server-custom-host .mc-server-custom-form');
async function rect(node:Locator,origin:Locator,scale:number){const a=await node.boundingBox(),b=await origin.boundingBox();expect(a).not.toBeNull();expect(b).not.toBeNull();return[(a!.x-b!.x)/scale,(a!.y-b!.y)/scale,a!.width/scale,a!.height/scale];}
function near(actual:number[],expected:readonly number[]){actual.forEach((value,index)=>expect(value).toBeCloseTo(expected[index]!,6));}
const cssURL=(value:string)=>{expect(value.startsWith('url(')).toBe(true);return value.slice(4,-1).replace(/^["']|["']$/g,'');};
async function urlBytes(page:Page,url:string){if(url.startsWith('data:'))return Buffer.from(url.slice(url.indexOf(',')+1),'base64');const response=await page.request.get(url);expect(response.ok()).toBe(true);return response.body();}

test('shared frame and three close textures retain complete original bytes dimensions and asymmetric raw metadata',async()=>{
  for(const[path,sha,width,height]of originals){const bytes=await readFile(new URL(`../src/assets/${path}`,import.meta.url));expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha);const png=PNG.sync.read(bytes);expect([png.width,png.height]).toEqual([width,height]);}
  expect(JSON.parse(await readFile(new URL('../src/assets/command-block/dialog_background_hollow_3.json',import.meta.url),'utf8'))).toEqual({nineslice_size:[8,23,8,8],base_size:[18,33]});
  const css=await readFile(new URL('../src/system-screens-textures.css',import.meta.url),'utf8'),match=css.match(/--mc-system-loading-waveform:\s*url\("data:image\/png;base64,([^\"]+)"\)/);expect(match).not.toBeNull();const loading=Buffer.from(match![1]!,'base64');expect(createHash('sha256').update(loading).digest('hex')).toBe('703e02f1e7013d642a81225b98bf08f1bdfc69e003b0b7d4a6132635da747aef');expect([PNG.sync.read(loading).width,PNG.sync.read(loading).height]).toEqual([640,8]);
  const divider=await readFile(new URL('../src/assets/server-forms/list_item_divider_line_light.png',import.meta.url));expect(createHash('sha256').update(divider).digest('hex')).toBe('e216cb729e6a91f083d1518614497c89bd0ec5757363d532d648226a330d0269');expect([PNG.sync.read(divider).width,PNG.sync.read(divider).height]).toEqual([1,1]);expect(JSON.parse(await readFile(new URL('../src/assets/server-forms/list_item_divider_line_light.json',import.meta.url),'utf8'))).toEqual({nineslice_size:1,base_size:[1,1]});
});

test('both225x200 common frames preserve titleY9 complete indent viewport reserved7 and context-specific close scopes',async({page})=>{
  await open(page);for(const[width,height,scale]of [[225,200,1],[260,230,2]]as const){await configure(page,{size:[width,height],scale});for(const root of[action(page),custom(page)]){
    const box=(await root.boundingBox())!;near([box.width/scale,box.height/scale],[width,height]);near(await rect(root.locator('.mc-server-form__title'),root,scale),[7.5,9,width-15,10]);near(await rect(root.locator('.mc-server-form__indent'),root,scale),[8,23,width-16,height-31]);
    near(await rect(root.locator('.mc-scroll-area__viewport'),root,scale),[10,23,width-27,height-33]);const bar=root.locator('.mc-scrollbar[data-orientation="vertical"]');expect((await bar.boundingBox())!.width/scale).toBe(7);expect((await bar.locator('.mc-scrollbar__track').boundingBox())!.width/scale).toBe(3);expect((await bar.locator('.mc-scrollbar__thumb').boundingBox())!.width/scale).toBe(5);
    const close=root.getByRole('button',{name:'Close',exact:true});near(await rect(close,root,scale),[width-21,0,21,21]);await expect(close).toHaveCSS('background-size',`${15*scale}px ${15*scale}px`);await expect(close).toHaveCSS('background-position','50% 50%');
    // Server's hollow_common fill_alpha default.8 is inherited; Command's explicit1 is another scope.
    await expect(root.locator('.mc-server-form__skin > span')).toHaveCSS('opacity','0.8');
  }}
});

test('action source rows retain32 height optional34 icon reservation and source centered loading destination',async({page})=>{
  await open(page,{showCustom:false,scale:1,body:'',rows:[{id:'plain',type:'button',text:'Plain action'},{id:'ready',type:'button',text:'Ready action',icon:{state:'ready',url:new URL('../src/assets/jigsaw/chevron_left.png',import.meta.url).href}},{id:'loading',type:'button',text:'Loading action',icon:{state:'loading'}}]});const root=action(page);
  for(const scale of[1,2]){await configure(page,{scale});const plain=root.locator('[data-server-row-id="plain"]'),ready=root.locator('[data-server-row-id="ready"]'),loading=root.locator('[data-server-row-id="loading"]');for(const row of[plain,ready,loading]){const box=await rect(row,root,scale);near([box[0]!,box[2]!,box[3]!],[14,190,32]);}
    const icon=ready.locator('img');expect([(await icon.boundingBox())!.width/scale,(await icon.boundingBox())!.height/scale]).toEqual([32,32]);const imageBox=await rect(icon,ready,scale),buttonBox=await rect(ready.getByRole('button'),ready,scale);expect(imageBox[0]).toBe(1);near([buttonBox[0]!,buttonBox[2]!,buttonBox[3]!],[34,156,32]);expect((await plain.getByRole('button').boundingBox())!.width/scale).toBe(190);
    // Source progress box is centered in its34x32 parent, then offset[-2,16].
    const progress=loading.locator('.mc-server-action-form__loading');near(await rect(progress,loading,scale),[0,30,30,4]);
  }
});

test('custom source content and submit widths stay distinct from viewport with native100 input and multiselect30 header17 rows',async({page})=>{
  await open(page,{showAction:false,scale:1});const root=custom(page);near(await rect(root.locator('.mc-server-form__content'),root,1),[12,23,194,(await root.locator('.mc-server-form__content').boundingBox())!.height]);const submit=root.getByRole('button',{name:'Submit form',exact:true});expect([(await submit.boundingBox())!.width,(await submit.boundingBox())!.height]).toEqual([194,32]);await expect(root.getByRole('textbox',{name:'Player name',exact:true})).toHaveAttribute('maxlength','100');
  const header=root.getByRole('button',{name:'Features',exact:true});expect((await header.boundingBox())!.height).toBe(30);await header.click();for(const row of await root.locator('.mc-server-form__multiselect-option').all())expect((await row.boundingBox())!.height).toBe(17);for(const option of['Alpha','Beta','Gamma']){const checkbox=root.getByRole('checkbox',{name:option,exact:true});expect((await checkbox.locator('..').boundingBox())!.height).toBe(16);}
});

test('source custom controls preserve generic tail spacer dropdown17 rows and readable forced-color fallbacks',async({page})=>{
  // settings_common.option_toggle opts into desktop one_line_layout: min16 + outer generic tail4.
  await open(page,{showAction:false,scale:1});const root=custom(page),toggle=root.locator('[data-server-field-id="enabled"]');expect((await toggle.boundingBox())!.height).toBe(20);expect((await toggle.locator('.mc-switch').boundingBox())!.height).toBe(16);
  // common.dropdown_content is100% of control; viewport then subtracts4 and radio group another4.
  // The old draft conflated these parents; no browser was run against that draft.
  const combo=root.getByRole('combobox',{name:'Difficulty',exact:true});for(const width of[225,260]){await configure(page,{size:[width,230]});await combo.click();for(const row of await root.getByRole('option').all())expect((await row.boundingBox())!.height).toBe(17);expect((await root.getByRole('listbox').boundingBox())!.width).toBe((await combo.boundingBox())!.width);await combo.press('Escape');}
  await page.emulateMedia({forcedColors:'active'});await combo.focus();await expect(combo).toBeFocused();expect(await root.locator('.mc-server-form__title').evaluate(node=>{const style=getComputedStyle(node);return style.color!==style.backgroundColor;})).toBe(true);await expect(root.locator('.mc-server-form__skin > span')).toHaveCSS('opacity','1');await expect(root.getByRole('textbox',{name:'Player name',exact:true})).toBeEditable();
});

test('conditional source tooltip really binds whole background infobulb and both chevrons with source destination boxes',async({page},testInfo)=>{
  await open(page,{showAction:false,fields:[{id:'name',type:'input',label:'Player name',tooltip:'Whole source information'}]});const root=custom(page),host=page.locator('#server-custom-host'),info=root.getByRole('button',{name:'Player name information',exact:true}),tip=page.getByRole('tooltip');const observations:unknown[]=[];
  await host.evaluate(node=>Object.assign((node as HTMLElement).style,{position:'fixed',left:'12px',margin:'0'}));
  for(const scale of[1,2]){await configure(page,{scale});expect([(await info.boundingBox())!.width/scale,(await info.boundingBox())!.height/scale]).toEqual([7,11]);expect(createHash('sha256').update(await urlBytes(page,(await info.locator('img').getAttribute('src'))!)).digest('hex')).toBe('01338044c8434b2cb37e35517e212c54b5de8fb7eb5776c49f32d4f4219d928c');
    for(const[side,top,digest]of [['above',300,'d4e12e2d6bd98a4b149bbadbf8c35c0f10eaf936d4fdc0c1455a2cb9011bfbe8'],['below',0,'a32ead03a3889dfcbd0e09afda750da3eb4fcfa9793c4b51d5f24b3889ff0aa9']]as const){await page.locator('#server-forms-sink').focus();await host.evaluate((node,top)=>{(node as HTMLElement).style.top=`${top}px`;},top);await info.focus();await expect(tip).toBeVisible();await expect(tip).toHaveAttribute('data-side',side);
      const bytes=await urlBytes(page,(await tip.locator('.mc-server-form__tooltip-chevron').getAttribute('src'))!);expect(createHash('sha256').update(bytes).digest('hex')).toBe(digest);const source=PNG.sync.read(bytes);expect([source.width,source.height]).toEqual([19,13]);const box=await rect(tip.locator('.mc-server-form__tooltip-chevron'),tip,scale);near([box[2]!,box[3]!],[19,13]);expect(box[1]).toBeCloseTo(side==='above'?(await tip.boundingBox())!.height/scale-3:-10,5);
      const background=await tip.evaluate(node=>getComputedStyle(node,'::before').borderImageSource);expect(createHash('sha256').update(await urlBytes(page,cssURL(background))).digest('hex')).toBe('7c71b806e3e6ff807f04668a26f3aff6d8a67d0e72db60ea2083d37ac8a31dfa');expect(createHash('sha256').update(await urlBytes(page,(await tip.locator('.mc-server-form__tooltip-image img').getAttribute('src'))!)).digest('hex')).toBe('01338044c8434b2cb37e35517e212c54b5de8fb7eb5776c49f32d4f4219d928c');observations.push({scale,side,sourceSHA256:digest,destination:[box[2],box[3]]});await info.press('Escape');await expect(tip).toHaveCount(0);
    }
  }
  await testInfo.attach('conditional-tooltip-original-binding',{body:JSON.stringify({observations,scope:'Actual conditional branches use whole original art and declared source box geometry; above/below viewport policy is a Web host contract, no native fitting/raster certification.'}),contentType:'application/json'});
});

test('actual frame and close source URLs use complete originals and all three close states match independent whole PNG POINT planes',async({page},testInfo)=>{
  await open(page,{showCustom:false,scale:2});const root=action(page),close=root.getByRole('button',{name:'Close',exact:true});
  const background=await root.locator('.mc-server-form__skin').evaluate(node=>getComputedStyle(node,'::after').borderImageSource);expect(createHash('sha256').update(await urlBytes(page,cssURL(background))).digest('hex')).toBe(originals[0][1]);
  let comparedPixels=0;for(const[state,index]of [['default',1],['hover',2],['pressed',3]]as const){await page.mouse.move(1100,800);if(state!=='default')await close.hover();if(state==='pressed')await page.mouse.down();const bytes=await readFile(new URL(`../src/assets/${originals[index][0]}`,import.meta.url));const url=await close.evaluate(node=>getComputedStyle(node).backgroundImage);expect(createHash('sha256').update(await urlBytes(page,cssURL(url))).digest('hex')).toBe(originals[index][1]);
    // Keep the real button state and image pixels; isolate only its transparent host plane.
    await close.evaluate(async node=>{(node as HTMLElement).style.backgroundColor='#000';const image=new Image();image.src=getComputedStyle(node).backgroundImage.slice(4,-1).replace(/^["']|["']$/g,'');await image.decode();});const actual=PNG.sync.read(await close.screenshot({caret:'initial',animations:'disabled'}));
    await page.evaluate(async data=>{document.getElementById('server-close-reference')?.remove();const plane=document.createElement('div');plane.id='server-close-reference';Object.assign(plane.style,{position:'fixed',left:'1100px',top:'500px',width:'42px',height:'42px',background:`#000 url("${data}") center / 30px 30px no-repeat`,imageRendering:'pixelated'});const image=new Image();image.src=data;await image.decode();document.body.append(plane);},`data:image/png;base64,${bytes.toString('base64')}`);const expected=PNG.sync.read(await page.locator('#server-close-reference').screenshot({caret:'initial',animations:'disabled'}));expect([actual.width,actual.height,expected.width,expected.height]).toEqual([42,42,42,42]);let differences=0;for(let i=0;i<actual.data.length;i+=4)if([0,1,2,3].some(c=>actual.data[i+c]!==expected.data[i+c]))differences++;expect(differences).toBe(0);comparedPixels+=actual.width*actual.height;if(state==='pressed')await page.mouse.move(1100,800);await page.mouse.up();
  }
  await testInfo.attach('server-close-whole-source-host-contract',{body:JSON.stringify({comparedPixels,states:['default','hover','pressed'],differingPixels:0,scope:'Complete original PNG under explicit CSS POINT black plane. Not native GUI, native shader, font or engine-controller certification.'}),contentType:'application/json'});
});
