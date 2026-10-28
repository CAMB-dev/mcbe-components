import{expect,test}from'@playwright/test';
import type{Locator,Page}from'@playwright/test';
import{createHash}from'node:crypto';
import{existsSync}from'node:fs';
import{mkdir,readFile}from'node:fs/promises';
import{join}from'node:path';
import{fileURLToPath}from'node:url';
import{PNG}from'pngjs';

// Independent original native/full-release JSON and PNG oracle. Full ZIP:
// Mojang v1.26.60.5, SHA256 d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf.
// resource_pack/ui/{smithing_table_2_screen,cartography_screen}.json.
// No production CSS, generated manifest or implementation screenshot is used
// to construct expectations. Text-driven Cartography geometry is a documented
// normal=10game-pixel, large-viewport profile, not certified native font math.
// Native empty captures additionally resolve default smithing visibility and
// Cartography stack-axis offsets / Map Name alignment; see the QA report for
// immutable capture hashes. These local facts do not certify whole-screen equality.
const assets=[
 ['smithing_icon',30,30,'25f2a66d7d0ab4f792c066eb35c9f8a41846b05a974ee4d524b4f87d96d554d1'],
 ['templates_slot_overlay',32,16,'c639d94cf7818bda6ff75011442a8684aaff034b105fdab58b12f19f249595cd'],
 ['armors_slot_overlay',64,16,'66c7ef27f7743e124debf60d03bbb6344b6ecfee9cbdddfc6d7401c4251c4c02'],
 ['armors_and_tools_slot_overlay',192,16,'f5616005e5cc31239d26ecb839268b88be2c5dff5a8fcd3207a5be612a142ae4'],
 ['smithing_material_slot_overlay',112,16,'16ca599d4e7abf24fd013eb1dfb32c0110c37575f4cf9ed8457e1d4064dd5833'],
 ['ingot_image',16,16,'5607b2cd220a7c04391d90aaf19a9d4c40689c75c240f41e4d7dc7408756f074'],
 ['arrow',16,13,'7b72bbdcf787adee14c1cdd08e416846a616725f6bed0a7e5064c7b55501e7d5'],
 ['cartography_table_empty',66,66,'861fb025a824098063e36cb4b43157712765ca4d4564044a1479d6a62958a009'],
 ['cartography_table_copy',66,66,'6297cf07c77350bd5bf07eb4dc75cc9d84c20c0e6bea204a972c7c6379a90aa9'],
 ['cartography_table_map',66,66,'f4de80554f918d967f4652225fc2a1fce19ccaefca589d0c5340d142ee2fc1c1'],
 ['cartography_table_zoom',66,66,'4063df3833a86b6fac21c0b1b7b3a348055ffd987c2ccc04f339de97f4c17933'],
 ['cartography_table_glass',66,66,'9bba526661cf0c63bb33aaa7b309a65a413e9a84918df316e6b3ef6fa59150e3'],
]as const;
const top={x:7,y:7,width:176-14,height:166/2-14},recipe={x:7,y:7+(166/2-14)*.4,width:162,height:(166/2-14)*.6};
const smithY=recipe.y+recipe.height/2-9;
const normal=10,cartRoot={width:176,height:220};
const cartMain={x:(176-162)/2,y:6+normal+4+normal+20+4,width:162,height:66};
type Box={x:number;y:number;width:number;height:number};
async function box(locator:Locator):Promise<Box>{const r=await locator.boundingBox();if(!r)throw new Error('Missing special workstation comparison region');return r;}
async function rect(locator:Locator,frame:Box,want:{x:number;y:number;width:number;height:number}){const actual=await box(locator);for(const key of['x','y','width','height']as const)expect(Math.abs(actual[key]-(key==='x'||key==='y'?frame[key]:0)-want[key]*2),`source/profile ${key}`).toBeLessThanOrEqual(.02);}
async function open(page:Page,path='/'){await page.goto(path);await page.evaluate(()=>document.fonts.ready);await page.mouse.move(0,0);}
async function asset(file:string){return readFile(new URL(`../.cache/references/${file}.png`,import.meta.url));}
async function capture(locator:Locator,file:string){const directory=process.env.MCBE_SPECIAL_CAPTURE_DIR??fileURLToPath(new URL('../.cache/special-qa/',import.meta.url));await mkdir(directory,{recursive:true});return PNG.sync.read(await locator.screenshot({path:join(directory,`${file}.png`)}));}
function equal(actual:PNG,expected:PNG){expect([actual.width,actual.height]).toEqual([expected.width,expected.height]);let pixels=0;for(let i=0;i<actual.data.length;i+=4)if([0,1,2,3].some(c=>actual.data[i+c]!==expected.data[i+c]))pixels++;expect(pixels,'RGBA differences against independent original PNG control').toBe(0);}

test('smithing horizontal atlases and cartography original images retain original dimensions and hashes',async()=>{for(const[file,w,h,hash]of assets){const bytes=await asset(file);expect(createHash('sha256').update(bytes).digest('hex'),file).toBe(hash);const png=PNG.sync.read(bytes);expect([png.width,png.height]).toEqual([w,h]);}});

test('native special workstation source pins modern slots, animation frames and explicit focus links',async()=>{
 const path=join(process.env.MCBE_INSTALL_ROOT??'C:/XboxGames/Minecraft for Windows/Content','data/resource_packs/vanilla/__brarchive/ui.brarchive');test.skip(!existsSync(path),'Optional native archive check requires a user-owned matching installation.');const bytes=await readFile(path),count=bytes.readUInt32LE(8),base=16+count*256;const read=(name:string)=>{for(let i=0;i<count;i++){const r=16+i*256;if(bytes.toString('utf8',r+1,r+1+bytes[r]!)!==name)continue;const offset=bytes.readUInt32LE(r+248),size=bytes.readUInt32LE(r+252);return JSON.parse(bytes.toString('utf8',base+offset,base+offset+size));}throw new Error(name);};
 const smith=read('smithing_table_2_screen.json'),cart=read('cartography_screen.json');expect(smith.recipe_grid.grid_dimensions).toEqual([9,1]);expect(smith.recipe_grid.size).toEqual(['100%','90%']);for(const[name,frames]of[['templates_animation',2],['armors_animation',4],['armors_and_tools_animation',12],['all_materials_animation',7]]as const){expect(smith[name].frame_count).toBe(frames);expect(smith[name].fps).toBe(1);}
 const controls=smith.recipe_grid.controls;expect(controls[0]['template_item_slot@smithing_table_2.smithing_table_item_slot'].$focus_override_right).toBe('smithing_table_input');expect(controls[2]['material_item_slot@smithing_table_2.smithing_table_item_slot'].$focus_override_right).toBe('smithing_table_result');expect(controls[4]['result_item_slot@smithing_table_2.smithing_table_item_slot'].grid_position).toEqual([5,0]);expect(smith.result_item_preview_inner.size).toEqual(['25px','25px']);expect(smith.result_item_preview_inner.controls[0].smithing_preview_renderer.renderer).toBe('equipment_preview_renderer');
 expect(cart.map_image_panel.size).toEqual([66,66]);expect(cart['text_edit_control@common.text_edit_box'].max_length).toBe(30);expect(cart.output_description_label.anchor_from).toBe('bottom_middle');expect(cart.output_description_label.anchor_to).toBe('top_middle');const root=cart.cartography_panel.controls.find((c:Record<string,unknown>)=>'root_panel@common.root_panel'in c)['root_panel@common.root_panel'];expect(root.max_size).toEqual([176,220]);
});

test('modern smithing composed geometry follows its nine-column source model',async({page})=>{
 await open(page);const region=page.locator('#special-workstations .mc-smithing'),frame=await box(region);expect([frame.width,frame.height]).toEqual([352,332]);await rect(region.locator('.mc-smithing__icon'),frame,{x:7,y:7,width:30,height:30});
 for(const[name,column]of[['template',0],['input',1],['material',2],['result',5]]as const)await rect(region.locator(`.mc-smithing__${name}`),frame,{x:top.x+column*18,y:smithY,width:18,height:18});
 const yieldWidth=recipe.width*.222;await rect(region.locator('.mc-smithing__arrow'),frame,{x:top.x+3*18+(yieldWidth-18)/2,y:recipe.y+recipe.height/2-6,width:18,height:12});await rect(region.locator('.mc-smithing__preview'),frame,{x:top.x+7*18+(18-25)/2+2,y:recipe.y+(recipe.height-25)/2,width:25,height:25});await expect(region.locator('.mc-smithing__preview')).toHaveAttribute('data-native-renderer','equipment_preview_renderer');
 const headerWidth=top.width*.65,headerHeight=top.height*.4;await rect(region.locator('.mc-workstation__title'),frame,{x:top.x+headerWidth/2+headerWidth*.3-headerWidth*.8/2,y:top.y+(headerHeight-headerHeight*.3)/2,width:headerWidth*.8,height:headerHeight*.3});
 await expect(region.locator('.mc-dialog__close')).toHaveCount(0);await capture(region,'smithing-unmasked');
});

test('cartography large-viewport geometry incorporates native empty-capture stack positions without certifying description anchors',async({page})=>{
 await open(page);const region=page.locator('#special-workstations .mc-cartography'),frame=await box(region);expect([frame.width,frame.height]).toEqual([cartRoot.width*2,cartRoot.height*2]);
 await rect(region.locator('.mc-workstation__title'),frame,{x:6,y:6,width:164,height:normal});await rect(region.locator('.mc-cartography__name-field'),frame,{x:6,y:6+normal+4+normal,width:164,height:20});await rect(region.locator('.mc-cartography__main'),frame,cartMain);
 // GUI5 native capture: input top440, additional top635, map top417.
 // Relative to map y54 these resolve to58.5/97.5game after native rounding.
 // The stack-axis source offsets+1/-1 are not applied by the native stack.
 const stackHeight=18+(13+8)+18,stackY=cartMain.y+(cartMain.height-stackHeight)/2;await rect(region.locator('.mc-cartography__input'),frame,{x:cartMain.x,y:stackY,width:18,height:18});await rect(region.locator('.mc-cartography__additional'),frame,{x:cartMain.x,y:stackY+18+21,width:18,height:18});await rect(region.locator('.mc-cartography__plus'),frame,{x:cartMain.x+(18-13)/2,y:stackY+18+4,width:13,height:13});
 await rect(region.locator('.mc-cartography__map'),frame,{x:cartMain.x+(cartMain.width-66)/2,y:cartMain.y,width:66,height:66});await rect(region.locator('.mc-cartography__result'),frame,{x:cartMain.x+cartMain.width-26,y:cartMain.y+(66-26)/2,width:26,height:26});for(const[selector,x]of[['input',cartMain.x+25],['result',cartMain.x+cartMain.width-16-29]]as const)await rect(region.locator(`.mc-cartography__arrow--${selector}`),frame,{x,y:cartMain.y+(66-13)/2,width:16,height:13});
 const rename=region.locator('.mc-cartography__name-input');await expect(rename).toHaveAttribute('maxlength','30');await expect(rename).toHaveCSS('text-shadow','none');await expect(region.locator('.mc-cartography__name-label > span:first-child')).toHaveCSS('text-align','left');await expect(region.locator('.mc-cartography__description')).toHaveAttribute('data-fidelity','stack-anchor-unverified');await expect(region.locator('.mc-dialog__close')).toHaveCount(0);await capture(region,'cartography-unmasked');
});

test('special workstation inventories follow each root height rather than a fixed166 profile',async({page})=>{
 await open(page);for(const[kind,height]of[['smithing',166],['cartography',220]]as const){const region=page.locator(`#special-workstations .mc-${kind}`),frame=await box(region),inventory=region.getByRole('grid',{name:'Inventory',exact:true}),hotbar=region.getByRole('grid',{name:'Hotbar',exact:true});await rect(region.locator('.mc-player-inventory__label'),frame,{x:7,y:height-90,width:162,height:10});await expect(inventory.getByRole('gridcell')).toHaveCount(27);await expect(hotbar.getByRole('gridcell')).toHaveCount(9);for(let i=0;i<27;i++)await rect(inventory.locator('.mc-slot').nth(i),frame,{x:7+i%9*18,y:height-80+Math.floor(i/9)*18,width:18,height:18});for(let i=0;i<9;i++)await rect(hotbar.locator('.mc-slot').nth(i),frame,{x:7+i*18,y:height-23,width:18,height:18});const item=await box(region.locator(`.mc-${kind}__result .mc-slot__item`));expect([item.width,item.height]).toEqual([32,32]);}
});

test('default empty smithing shows only the native template overlay',async({page})=>{
 await open(page,'/calibration.html');const smith=page.locator('[data-case="smithing-empty-native"] .mc-smithing');await expect(smith.locator('.mc-smithing__overlay--templates')).toHaveCount(1);await expect(smith.locator('.mc-smithing__input .mc-slot__underlay')).toHaveCount(0);await expect(smith.locator('.mc-smithing__material .mc-slot__underlay')).toHaveCount(0);await expect(smith.locator('.mc-smithing__overlay')).toHaveCount(1);await capture(smith,'smithing-default-empty-unmasked');
});

test('special explicit source focus paths keep empty results reachable',async({page})=>{
 await open(page,'/calibration.html');const smith=page.locator('[data-case="smithing-empty-native"] .mc-smithing'),template=smith.locator('.mc-smithing__template'),input=smith.locator('.mc-smithing__input'),material=smith.locator('.mc-smithing__material'),result=smith.locator('.mc-smithing__result');await expect(result).toHaveAttribute('aria-disabled','true');expect(await result.evaluate(n=>(n as HTMLButtonElement).disabled)).toBe(false);await template.focus();await template.press('ArrowRight');await expect(input).toBeFocused();await input.press('ArrowLeft');await expect(template).toBeFocused();await template.press('ArrowRight');await input.press('ArrowRight');await expect(material).toBeFocused();await material.press('ArrowRight');await expect(result).toBeFocused();await result.press('ArrowLeft');await expect(material).toBeFocused();await material.press('ArrowLeft');await expect(input).toBeFocused();
 const cart=page.locator('[data-case="cartography-mode-none"] .mc-cartography'),map=cart.locator('.mc-cartography__input'),additional=cart.locator('.mc-cartography__additional'),output=cart.locator('.mc-cartography__result');await map.focus();await map.press('ArrowDown');await expect(additional).toBeFocused();await additional.press('ArrowUp');await expect(map).toBeFocused();await map.press('ArrowRight');await expect(output).toBeFocused();await output.press('ArrowLeft');await expect(additional).toBeFocused();await additional.press('ArrowRight');await expect(output).toBeFocused();
});

async function reference(page:Page,file:string,width:number,height:number,frame?:number){const bytes=await asset(file),source=PNG.sync.read(bytes);await page.evaluate(({url,width,height,sourceWidth,sourceHeight,frame})=>{document.getElementById('independent-special-png')?.remove();const plane=document.createElement('div');plane.id='independent-special-png';Object.assign(plane.style,{position:'fixed',left:'416px',top:'16px',width:`${width}px`,height:`${height}px`,overflow:'hidden',background:'#c6c6c6',zIndex:'2147483647'});const image=document.createElement('img');image.src=url;Object.assign(image.style,{position:'absolute',left:`${frame===undefined?0:-frame*32}px`,top:'0',width:`${frame===undefined?width:sourceWidth*2}px`,height:`${frame===undefined?height:sourceHeight*2}px`,maxWidth:'none',maxHeight:'none',imageRendering:'pixelated'});plane.append(image);document.body.append(plane);},{url:`data:image/png;base64,${bytes.toString('base64')}`,width,height,sourceWidth:source.width,sourceHeight:source.height,frame});const plane=page.locator('#independent-special-png');await plane.locator('img').evaluate(n=>(n as HTMLImageElement).decode());return plane;}
async function canonical(target:Locator,width:number,height:number){const r=await box(target);expect([r.width,r.height]).toEqual([width,height]);await target.evaluate(n=>Object.assign((n as HTMLElement).style,{position:'fixed',left:'16px',top:'16px',zIndex:'2147483647',backgroundColor:'#c6c6c6',transform:'none'}));}

for(const frame of[0,1])test(`smithing horizontal overlay frame ${frame} crops16x16 texels without compressing the strip`,async({page})=>{
 await open(page,'/calibration.html');const fixture=page.locator(`[data-case="smithing-atlas-frame${frame}"] .mc-smithing`);for(const[selector,file]of[['templates','templates_slot_overlay'],['armors-and-tools','armors_and_tools_slot_overlay'],['all','smithing_material_slot_overlay']]as const){const overlay=fixture.locator(`.mc-smithing__overlay--${selector}`);await expect(overlay).toHaveAttribute('data-frame',String(frame));await expect(overlay).toHaveCSS('animation-name','none');await canonical(overlay,32,32);const expected=await reference(page,file,32,32,frame);equal(await capture(overlay,`overlay-${selector}-${frame}-actual`),await capture(expected,`overlay-${selector}-${frame}-expected`));}
});

for(const[mode,file]of[['none','cartography_table_empty'],['clone','cartography_table_copy'],['rename','cartography_table_map'],['basic','cartography_table_map'],['locator','cartography_table_map'],['extend','cartography_table_zoom'],['locked','cartography_table_glass']]as const)test(`cartography ${mode} mode uses its original66x66 image`,async({page})=>{await open(page,'/calibration.html');const target=page.locator(`[data-case="cartography-mode-${mode}"] .mc-cartography__map`);await expect(target).toHaveAttribute('data-mode',mode);await canonical(target,132,132);const expected=await reference(page,file,132,132);equal(await capture(target,`map-${mode}-actual`),await capture(expected,`map-${mode}-expected`));});
