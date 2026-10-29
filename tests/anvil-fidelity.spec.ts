import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

// Independent Mojang v1.26.60.5 full archive / installed 1.26.6005.0 oracle.
// resource_pack/ui/{anvil_screen,ui_common,_global_variables,resource_packs_screen}.json.
// The ZIP SHA256 is d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf.
// Do not replace these formulas with production CSS, generated geometry docs,
// skin manifest values or a screenshot of this same implementation.
const top={x:7,y:7,width:176-14,height:166/2-14};
const iconPanel={x:top.x,y:top.y+top.height*.05,width:top.width,height:top.height*.4};
const name={x:iconPanel.x+iconPanel.width*.2,y:iconPanel.y+iconPanel.height-iconPanel.height*.7+2,width:iconPanel.width*.8,height:iconPanel.height*.7};
const recipe={x:top.x,y:top.y+top.height*.4,width:top.width,height:top.height*.6};
const grid={x:recipe.x+recipe.width*(1-.83)/2,y:recipe.y+recipe.height*(1-.4)/2,width:recipe.width*.83,height:recipe.height*.4};
const cellWidth=grid.width/5;
// The fixed-size direct grid template starts at its cell origin. Only the
// container_item child is centered inside that18x18 wrapper. Native Anvil
// capture Global67 corroborates this scope; the previous centered-wrapper
// oracle incorrectly propagated the child's anchors to its grid parent.
const slot=(column:number)=>({x:grid.x+column*cellWidth,y:grid.y,width:18,height:18});
const image=(column:number,width:number,height:number)=>({x:grid.x+column*cellWidth+(cellWidth-width)/2,y:grid.y+(grid.height-height)/2,width,height});
const originals=[
  ['anvil_icon.png','5858dfc62fe01b7629dbea9a1b71bb7523c196e1418e2a075ff3fc8ec6e624a3',15,15],
  ['anvil-plus.png','f162fdc2ed1785debed24173efd5d014b1bb444173bd8d719c88f138ecb9ce6f',13,13],
  ['arrow_large.png','c0b27d51e084d0018365a94905e53e8661cf0f05448145c71402ff16844fe1b6',22,15],
  ['crossout.png','e6495d114d889c557948d19035a3a76ba45b9e7a75d19052eed826ea5f05ff61',15,15],
  ['Gray.png','e21915e60b32df0c5bd7fa8153571c1d8899a20de2973ee92f8aab8f11c35797',2,2],
  ['edit_box_indent.png','c4968ec9277dcdd363c28c1338a6e202d15f8464c14331fddb9c5014c9eaa109',6,6],
  ['edit_box_indent_hover.png','7b02fa8f0b08581bd0319d1757578303c160cc77a2a0910ec3231dc642b6e2eb',6,6],
] as const;
type Box={x:number;y:number;width:number;height:number};
async function box(locator:Locator):Promise<Box>{const value=await locator.boundingBox();if(!value)throw new Error('Missing anvil source comparison region');return value;}
async function rect(locator:Locator,frame:Box,expected:{x:number;y:number;width?:number;height?:number}){
  const actual=await box(locator);
  for(const dimension of ['x','y','width','height'] as const){const value=expected[dimension];if(value===undefined)continue;const relative=actual[dimension]-(dimension==='x'||dimension==='y'?frame[dimension]:0);expect(Math.abs(relative-value*2),`source ${dimension}`).toBeLessThanOrEqual(.02);}
}
async function open(page:Page,path='/'){await page.goto(path);await page.evaluate(()=>document.fonts.ready);await page.mouse.move(0,0);}
async function colour(locator:Locator,source:readonly number[]){const rgb=await locator.evaluate(node=>getComputedStyle(node).color.match(/[\d.]+/g)?.slice(0,3).map(Number));for(let index=0;index<3;index++){expect(rgb![index]!).toBeGreaterThanOrEqual(Math.floor(source[index]!*255));expect(rgb![index]!).toBeLessThanOrEqual(Math.ceil(source[index]!*255));}}

test('anvil source images keep original pixels and edit-box logical slice metadata',async()=>{
  for(const[file,hash,width,height]of originals){const bytes=await readFile(new URL(`../.cache/references/${file}`,import.meta.url));expect(createHash('sha256').update(bytes).digest('hex'),file).toBe(hash);const png=PNG.sync.read(bytes);expect([png.width,png.height]).toEqual([width,height]);if(file==='Gray.png')for(let index=0;index<png.data.length;index+=4)expect([...png.data.subarray(index,index+4)]).toEqual([0,0,0,255]);}
  for(const file of ['edit_box_indent.json','edit_box_indent_hover.json']){const metadata=JSON.parse(await readFile(new URL(`../.cache/references/${file}`,import.meta.url),'utf8'));expect(metadata.base_size).toEqual([6,6]);expect(metadata.nineslice_size).toBe(2);}
});

test('native anvil formulas, textures, cost colors and explicit focus links agree with the independent oracle',async()=>{
  const path=join(process.env.MCBE_INSTALL_ROOT??'C:/XboxGames/Minecraft for Windows/Content','data/resource_packs/vanilla/__brarchive/ui.brarchive');test.skip(!existsSync(path),'Optional original-game archive check needs a user-owned installation.');
  const data=await readFile(path),count=data.readUInt32LE(8),base=16+count*256;
  const read=(name:string)=>{for(let index=0;index<count;index++){const row=16+index*256;if(data.toString('utf8',row+1,row+1+data[row]!)!==name)continue;const offset=data.readUInt32LE(row+248),size=data.readUInt32LE(row+252);return JSON.parse(data.toString('utf8',base+offset,base+offset+size));}throw new Error(`Missing original ${name}`);};
  const anvil=read('anvil_screen.json'),globals=read('_global_variables.json');expect(anvil.top_half_panel.size).toEqual(['100% - 14px','50% - 14px']);expect(anvil.recipe_grid.size).toEqual(['83%','40%']);expect(anvil.anvil_item_slot.size).toEqual([18,18]);expect(anvil['text_edit_control@common.text_edit_box'].max_length).toBe(30);
  expect(anvil.anvil_item_slot.anchor_from).toBeUndefined();expect(anvil.anvil_item_slot.anchor_to).toBeUndefined();
  expect(anvil.anvil_item_slot.controls[0]['container_item@common.container_item']).toMatchObject({anchor_from:'center',anchor_to:'center'});
  expect(anvil.arrow_icon.size).toEqual([18,12]);expect(anvil.cross_out_icon.size).toEqual([18,12]);expect(anvil.anvil_icon.size).toEqual([30,30]);
  const controls=anvil.recipe_grid.controls;expect(controls[0]['input_item_slot@anvil.anvil_item_slot'].$focus_override_right).toBe('anvil_material');expect(controls[2]['material_item_slot@anvil.anvil_item_slot'].$focus_override_left).toBe('anvil_input');expect(controls[2]['material_item_slot@anvil.anvil_item_slot'].$focus_override_right).toBe('anvil_result');expect(controls[4]['result_item_slot@anvil.anvil_item_slot'].$focus_override_left).toBe('anvil_material');
  expect(globals.$anvil_cost_success_text_color).toEqual([.5,1,.125]);expect(globals.$anvil_cost_fail_text_color).toEqual([1,.35,.35]);
  const gray=anvil['cost_label@anvil.generic_label'].controls[0]['gray@resource_packs.gray_image'];expect(gray.size).toEqual(['105%','105%']);expect(gray.alpha).toBe(.3);expect(read('resource_packs_screen.json').gray_image.texture).toBe('textures/ui/Gray');
});

test('anvil composed layout retains original fractional grid, input and bottom-right cost anchors',async({page},testInfo)=>{
  await open(page);const region=page.locator('#anvil .mc-anvil'),frame=await box(region);expect([frame.width,frame.height]).toEqual([352,332]);
  await rect(region.locator('.mc-anvil__icon'),frame,{x:iconPanel.x,y:iconPanel.y,width:30,height:30});await rect(region.locator('.mc-anvil__name-field'),frame,name);
  for(const[column,selector]of [[0,'input'],[2,'material'],[4,'result']]as const)await rect(region.locator(`.mc-anvil__${selector}`),frame,slot(column));
  await rect(region.locator('.mc-anvil__plus'),frame,image(1,13,13));await rect(region.locator('.mc-anvil__arrow'),frame,image(3,18,12));
  const title=await box(region.locator('.mc-workstation__title'));const titleCenter=iconPanel.x+iconPanel.width*.2+1+iconPanel.width*.8/2,titleBottom=iconPanel.y+iconPanel.height*.2+3;
  expect(Math.abs(title.x+title.width/2-frame.x-titleCenter*2)).toBeLessThanOrEqual(.02);expect(Math.abs(title.y+title.height-frame.y-titleBottom*2)).toBeLessThanOrEqual(.02);
  const input=region.locator('.mc-anvil__name-input');await expect(input).toHaveAttribute('maxlength','30');await expect(input).toHaveCSS('text-shadow','none');await expect(input).toHaveCSS('color','rgb(255, 255, 255)');
  const field=await box(region.locator('.mc-anvil__name-field')),text=await box(input);expect(Math.abs(text.x-field.x-6)).toBeLessThanOrEqual(.02);expect(Math.abs(text.width-(field.width-12))).toBeLessThanOrEqual(.02);expect(text.height).toBe(20);expect(Math.abs(text.y+text.height/2-field.y-field.height/2)).toBeLessThanOrEqual(.02);
  const result=await box(region.locator('.mc-anvil__result .mc-slot__item'));expect([result.width,result.height]).toEqual([32,32]);
  await mkdir(new URL('../.cache/anvil-qa/',import.meta.url),{recursive:true});const path=fileURLToPath(new URL('../.cache/anvil-qa/anvil-unmasked.png',import.meta.url));await region.screenshot({path});await testInfo.attach('actual-implementation-not-native-reference',{path,contentType:'image/png'});
});

test('anvil inventory and hotbar use all 36 common source positions',async({page})=>{
  await open(page);const region=page.locator('#anvil .mc-anvil'),frame=await box(region),inventory=region.getByRole('grid',{name:'Inventory',exact:true}),hotbar=region.getByRole('grid',{name:'Hotbar',exact:true});
  await rect(region.locator('.mc-player-inventory__label'),frame,{x:7,y:166-93+3});await expect(inventory.getByRole('gridcell')).toHaveCount(27);await expect(hotbar.getByRole('gridcell')).toHaveCount(9);
  for(let index=0;index<27;index++)await rect(inventory.locator('.mc-slot').nth(index),frame,{x:7+index%9*18,y:166-54-26+Math.floor(index/9)*18,width:18,height:18});for(let index=0;index<9;index++)await rect(hotbar.locator('.mc-slot').nth(index),frame,{x:7+index*18,y:166-18-5,width:18,height:18});
});

test('anvil success, unaffordable and too-expensive costs retain source colors and the original black underlay',async({page})=>{
  await open(page,'/calibration.html');
  for(const[name,failed]of [['anvil-cost-success',false],['anvil-cost-fail',true],['anvil-cost-expensive',true]]as const){
    const region=page.locator(`[data-case="${name}"] .mc-anvil`),frame=await box(region),cost=region.locator('.mc-anvil__cost'),bounds=await box(cost);await colour(cost,failed?[1,.35,.35]:[.5,1,.125]);
    expect(Math.abs(bounds.x+bounds.width-frame.x-(recipe.x+recipe.width)*2)).toBeLessThanOrEqual(.02);expect(Math.abs(bounds.y+bounds.height-frame.y-(recipe.y+recipe.height)*2)).toBeLessThanOrEqual(.02);expect(await cost.evaluate(node=>getComputedStyle(node).textShadow)).not.toBe('none');
    const underlay=await cost.evaluate(node=>{const s=getComputedStyle(node,'::before');return{width:parseFloat(s.width),height:parseFloat(s.height),opacity:s.opacity,image:s.backgroundImage,z:s.zIndex};});
    expect(Math.abs(underlay.width-bounds.width*1.05)).toBeLessThanOrEqual(.02);expect(Math.abs(underlay.height-bounds.height*1.05)).toBeLessThanOrEqual(.02);expect(underlay.opacity).toBe('0.3');expect(Number(underlay.z)).toBeLessThan(0);
    const encoded=underlay.image.match(/data:image\/png;base64,([A-Za-z\d+/=]+)/)?.[1];expect(encoded).toBeTruthy();
    // The skin build may recompress a PNG. Verify original source bytes above,
    // but compare decoded RGBA here: compressed-file identity is not a pixel
    // fidelity requirement. No pixel or channel tolerance is introduced.
    const actualImage=PNG.sync.read(Buffer.from(encoded!,'base64')),originalImage=PNG.sync.read(await readFile(new URL('../.cache/references/Gray.png',import.meta.url)));
    expect([actualImage.width,actualImage.height]).toEqual([originalImage.width,originalImage.height]);expect(actualImage.data.equals(originalImage.data)).toBe(true);
    if(failed)await expect(region.locator('.mc-anvil__result')).toHaveAttribute('aria-disabled','true');
  }
  await expect(page.locator('[data-case="anvil-empty"] .mc-anvil__cost')).toHaveCount(0);
});

test('anvil explicit focus links keep empty results reachable',async({page})=>{
  await open(page,'/calibration.html');const region=page.locator('[data-case="anvil-empty"] .mc-anvil'),input=region.locator('.mc-anvil__input'),material=region.locator('.mc-anvil__material'),result=region.locator('.mc-anvil__result');
  await expect(result).toHaveAttribute('aria-disabled','true');expect(await result.evaluate(node=>(node as HTMLButtonElement).disabled)).toBe(false);
  await input.focus();await input.press('ArrowRight');await expect(material).toBeFocused();await material.press('ArrowLeft');await expect(input).toBeFocused();await input.press('ArrowRight');await material.press('ArrowRight');await expect(result).toBeFocused();await result.press('ArrowLeft');await expect(material).toBeFocused();
});

for(const[selector,file,width,height,fixture]of [
  ['icon','anvil_icon.png',60,60,'anvil-empty'],['plus','anvil-plus.png',26,26,'anvil-empty'],['arrow','arrow_large.png',36,24,'anvil-empty'],['invalid','crossout.png',36,24,'anvil-invalid'],
]as const)test(`anvil ${selector} samples original PNG at the source display dimensions`,async({page})=>{
  await open(page,'/calibration.html');const target=page.locator(`[data-case="${fixture}"] .mc-anvil__${selector}`),bounds=await box(target);expect([bounds.width,bounds.height]).toEqual([width,height]);
  // Isolate sampling from raw fractional placement. Main GUI geometry above is
  // left intact; this canonical plane only compares Chromium texture output.
  await target.evaluate(node=>Object.assign((node as HTMLElement).style,{position:'fixed',left:'16px',top:'16px',zIndex:'2147483647',backgroundColor:'#c6c6c6',transform:'none'}));
  const source=await readFile(new URL(`../.cache/references/${file}`,import.meta.url));
  await page.evaluate(async({url,width,height,contain})=>{
    const img=new Image();img.src=url;await img.decode();
    const plane=document.createElement('div');plane.id='independent-anvil-png';
    Object.assign(plane.style,{position:'fixed',left:'96px',top:'16px',width:`${width}px`,height:`${height}px`,background:'#c6c6c6',zIndex:'2147483647'});
    // Compare original PNG sampling through the same CSS paint primitive.
    // IMG object-fit and CSS background contain differ at fractional35.2px
    // widths. This asset check is separate from the actual native-GUI oracle.
    if(contain)Object.assign(plane.style,{backgroundImage:`url("${url}")`,backgroundSize:'contain',backgroundPosition:'center',backgroundRepeat:'no-repeat',imageRendering:'pixelated'});
    else{Object.assign(img.style,{display:'block',width:'100%',height:'100%',imageRendering:'pixelated'});plane.append(img);}
    document.body.append(plane);
  },{url:`data:image/png;base64,${source.toString('base64')}`,width,height,contain:file==='arrow_large.png'||file==='crossout.png'});
  const reference=page.locator('#independent-anvil-png');await mkdir(new URL('../.cache/anvil-qa/',import.meta.url),{recursive:true});
  const actual=PNG.sync.read(await target.screenshot({path:fileURLToPath(new URL(`../.cache/anvil-qa/${selector}-actual.png`,import.meta.url))})),expected=PNG.sync.read(await reference.screenshot({path:fileURLToPath(new URL(`../.cache/anvil-qa/${selector}-expected.png`,import.meta.url))}));expect([actual.width,actual.height]).toEqual([width,height]);expect([expected.width,expected.height]).toEqual([width,height]);
  let different=0;for(let index=0;index<actual.data.length;index+=4)if([0,1,2,3].some(channel=>actual.data[index+channel]!==expected.data[index+channel]))different++;expect(different,'RGBA differences against independently rendered original PNG').toBe(0);
});
