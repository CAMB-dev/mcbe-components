import {expect,test} from '@playwright/test';
import type {Locator,Page} from '@playwright/test';
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {mkdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PNG} from 'pngjs';

// Source oracle: installed Bedrock1.26.6005.0 and Mojang v1.26.60.5 full ZIP,
// SHA256 d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf.
// Complete native/public parsed stonecutter/loom/beacon/redstone JSONs match.
// PNG pins below were extracted independently from originals, not production
// CSS, generated skin manifests, or screenshots of this implementation.
const originals=[
 [
  "Banners",
  4,
  4,
  "41c874a8ffb72a40b0404c6955388aed577aabc74118729336604c376689748f"
 ],
 [
  "beacon_button_default",
  22,
  22,
  "7ed865c543b3a7d911ea9b43225a08601e8d051b551c8edc18b718c26d881cef"
 ],
 [
  "beacon_button_hover",
  22,
  22,
  "b6a49bc3182625bf00fd6d35ebf57c7963105d3f0b9ad8724d4a071253f4e7a1"
 ],
 [
  "beacon_button_locked",
  22,
  22,
  "998148e30d48c222e37daac641eb2d4b190d8bc0bc1087d871f139ee3b812bf1"
 ],
 [
  "beacon_button_pressed",
  22,
  22,
  "978b04a18efe92e827d29deb6a25b53887193421f3e29a96fa5d54b31ac40b69"
 ],
 [
  "cancel",
  13,
  13,
  "a55ea0c9c3995fa86dd53ed6c639f3d82c3deb2965f7ff01b5190bd5da3c6727"
 ],
 [
  "confirm",
  14,
  12,
  "2ead79a230d0136e654579c22270d7232477db2a50e82bface954e4887350567"
 ],
 [
  "crafter_item_border",
  26,
  26,
  "f5f1d3ec3b26995aef5fdef2464bda6144d29a228614801c8eaf41f9e6b705f5"
 ],
 [
  "effect_background",
  120,
  32,
  "46ae567772738afaac986020724da72ca09362d4168fe949d6967baaa07f8d48"
 ],
 [
  "haste_effect",
  18,
  18,
  "e8658200c26e6645250f63f4ffe8a1326be4dc966d65db27df1e0d6b559d1f8d"
 ],
 [
  "item_seperator",
  5,
  18,
  "d6b50a72358ac921666c4b22298007ef487cffd14f0b1b62bd8242a9b3deb0d0"
 ],
 [
  "jump_boost_effect",
  18,
  18,
  "4c184ca78d1ccbfde5b61b182baed9f02b1ce1bc395afcb17cb8bb8268c4cd9d"
 ],
 [
  "loom_banner_empty",
  16,
  16,
  "6caaf027b42abfaa6e7f321effca3181cf1897c767d8743393c7a84da10ea578"
 ],
 [
  "loom_dye_empty",
  16,
  16,
  "dcac30a740bb31fcfc6f3c6f1c66e372b32697acc56c904bda4888f853cc5f22"
 ],
 [
  "loom_pattern_item_empty",
  16,
  16,
  "414c83195c81026d04d6bfee7859c4e65fad4ff5265369d4c1d3184481cec016"
 ],
 [
  "middle_strip",
  2,
  1,
  "90a4a9363f4fa5018fc113c50590532da74ffdf785ce2d1dc93414e28ca526ca"
 ],
 [
  "pyramid_level_1",
  19,
  20,
  "a4a2ed4ca0c6628a7238dc0b318a9d7354c0751d43fc0bedc7cece3928bb7cdf"
 ],
 [
  "pyramid_level_2",
  19,
  20,
  "37d9024499b39cf0375ab45508472e9a024824ddd236fcc0c8b434e749d170fc"
 ],
 [
  "pyramid_level_3",
  19,
  20,
  "a742e42b9c9d9ad48e9317ffddd2e4f386601129b50e38458d6369817ad891f1"
 ],
 [
  "pyramid_level_4",
  19,
  20,
  "7deee6e93100fd3307936cd625e33234112e5a9f1e4fe9941164a457f6671267"
 ],
 [
  "recipe_back_panel",
  16,
  16,
  "daa6d490de8583f424e24787812c6c2921bc688a7761d9d03e93badb27ed1d77"
 ],
 [
  "recipe_book_item_bg",
  5,
  5,
  "d70b22cb99397cd6ef3902df63166e719b6982cf18f98bc95f368977c44533c4"
 ],
 [
  "recipe_book_pane_bg",
  1,
  1,
  "c6af11420c349b07c73c0ff3dd296829a3017428e7e2ffeff907d3ccfb5e213e"
 ],
 [
  "recipe_book_touch_cell_selected",
  4,
  4,
  "95743c4386456a219bdaaec2893cb0cee5de0810e15560a184854c797efa9267"
 ],
 [
  "redstone_arrow_powered",
  16,
  16,
  "6728eca01a393c4f3e609c42b9c9728534ca8bda906165ecaffda95c9522f353"
 ],
 [
  "redstone_arrow_unpowered",
  16,
  16,
  "74732015a438f0c34029766638c73471fcfc192b514e3d44cb5a3ee66e6866c6"
 ],
 [
  "regeneration_effect",
  18,
  18,
  "673e5c6df2136a9e3236bc6ce59d6e5a282f8353a32bdc580a79acd64d2cce5b"
 ],
 [
  "resistance_effect",
  18,
  18,
  "6aec7580f9d0a82dd12637a8342307aed1dd17c4059e4e89cf1b95316c036131"
 ],
 [
  "slot_disabled",
  18,
  18,
  "0ca2ea6c4cddadd6392ebfa6d93229f956614f3f2682d1a7d0d6cc76bfaa473d"
 ],
 [
  "slot_enabled",
  18,
  18,
  "ec0a663f0b08a4f489633aab782bd81bb3e29fe9938ca279503d69353997f520"
 ],
 [
  "slot_enabled_hover",
  18,
  18,
  "68749407919d58e96402daa7898f4c3fca1f296dbaba0c130b1d655b6dcef864"
 ],
 [
  "speed_effect",
  18,
  18,
  "91128dc77c33d4694a8912eaddda92bbb119f9cc2e07dbc6245bdb40bbb4b7f8"
 ],
 [
  "strength_effect",
  18,
  18,
  "a009fb12ed3db82ac1afff6512d64b64e89a76079ea062b1b9829b89d288f011"
 ]
] as const;
type Box={x:number;y:number;width:number;height:number};
async function box(locator:Locator):Promise<Box>{const value=await locator.boundingBox();if(!value)throw new Error('Missing advanced comparison region');return value;}
async function rect(locator:Locator,frame:Box,expected:{x:number;y:number;width:number;height:number}){const actual=await box(locator);for(const key of['x','y','width','height']as const)expect(Math.abs(actual[key]-(key==='x'||key==='y'?frame[key]:0)-expected[key]*2),`original ${key}`).toBeLessThanOrEqual(.02);}
async function open(page:Page,path='/calibration.html'){page.on('websocket',socket=>socket.on('framereceived',({payload})=>{const message=String(payload);if(message.includes('"type":"full-reload"'))console.info('[advanced QA Vite reload]',message);}));await page.goto(path);await page.evaluate(()=>document.fonts.ready);await page.mouse.move(0,0);}
function sample(page:Page,id:string){return page.locator(`[data-case="advanced-${id}"]`);}
async function bytes(file:string){return readFile(new URL(`../.cache/references/${file}.png`,import.meta.url));}
async function capture(locator:Locator,name:string){await mkdir(new URL('../.cache/advanced-qa-output/screens/',import.meta.url),{recursive:true});return PNG.sync.read(await locator.screenshot({path:fileURLToPath(new URL(`../.cache/advanced-qa-output/screens/${name}.png`,import.meta.url))}));}
function equal(actual:PNG,expected:PNG){expect([actual.width,actual.height]).toEqual([expected.width,expected.height]);let changed=0;for(let i=0;i<actual.data.length;i+=4)if([0,1,2,3].some(channel=>actual.data[i+channel]!==expected.data[i+channel]))changed++;expect(changed,'RGBA pixels different from independent original PNG rendering').toBe(0);}

test('advanced source PNGs preserve exact original dimensions, hashes and logical metadata',async()=>{
 for(const[file,w,h,sha]of originals){const data=await bytes(file);expect(createHash('sha256').update(data).digest('hex'),file).toBe(sha);const image=PNG.sync.read(data);expect([image.width,image.height]).toEqual([w,h]);}
 const expected={effect_background:{base_size:[120,32],nineslice_size:4},Banners:{base_size:[4,4],nineslice_size:1},recipe_back_panel:{base_size:[16,16],nineslice_size:4}};
 for(const[file,want]of Object.entries(expected)){const path=new URL(`../.cache/advanced-qa-output/${file}.json`,import.meta.url);if(existsSync(path))expect(JSON.parse(await readFile(path,'utf8'))).toEqual(want);}
});

test('native definitions independently pin the four source profiles and state semantics',async()=>{
 const path=join(process.env.MCBE_INSTALL_ROOT??'C:/XboxGames/Minecraft for Windows/Content','data/resource_packs/vanilla/__brarchive/ui.brarchive');test.skip(!existsSync(path),'Optional check requires a user-owned game installation.');const data=await readFile(path),count=data.readUInt32LE(8),base=16+count*256;
 const source=(name:string)=>{for(let i=0;i<count;i++){const row=16+i*256;if(data.toString('utf8',row+1,row+1+data[row]!)!==name)continue;const offset=data.readUInt32LE(row+248),size=data.readUInt32LE(row+252);return JSON.parse(data.toString('utf8',base+offset,base+offset+size));}throw new Error(name);};
 const stone=source('stonecutter_screen.json'),loom=source('loom_screen.json'),beacon=source('beacon_screen.json'),redstone=source('redstone_screen.json');
 for(const d of[stone,loom])expect(d.top_half_panel.size).toEqual(['100% - 14px','50% - 22px']);expect(stone['stone_book_panel@common.root_panel'].size).toEqual([146,166]);expect(loom.result_banner_renderer.renderer).toBe('banner_pattern_renderer');expect(loom.result_banner_renderer.size).toEqual([20,40]);
 const beaconRoot=beacon.beacon_panel.controls.find((c:Record<string,unknown>)=>'root_panel@common.root_panel'in c)['root_panel@common.root_panel'];expect(beaconRoot.size).toEqual([256,219]);expect(beacon.beacon_inner_panel.size).toEqual([212,97]);expect(beacon['inventory_slot_button@common.container_slot_button_prototype'].focus_mapping.map((m:{focus_change_right:string})=>m.focus_change_right)).toEqual(['FOCUS_OVERRIDE_STOP','FOCUS_OVERRIDE_STOP','FOCUS_OVERRIDE_STOP']);
 expect(beacon['button_checked_hover@beacon.image_atlas'].texture).toBe('textures/ui/beacon_button_pressed');expect(beacon['button_locked@beacon.image_atlas'].texture).toBe('textures/ui/beacon_button_locked');
 const crafter=redstone.panel_crafter.controls.find((c:Record<string,unknown>)=>'root_panel@common.root_panel'in c)['root_panel@common.root_panel'];const disabled=crafter.controls.filter((c:Record<string,unknown>)=>Object.keys(c)[0]!.startsWith('disabled_slot_')).map((c:Record<string,{offset:number[]}>)=>Object.values(c)[0]!.offset);expect(disabled).toEqual([[-53.9,-54.4],[-36,-54.4],[-18,-54.4],[-53.9,-36.4],[-36,-36.4],[-18,-36.4],[-53.9,-18.5],[-36,-18.5],[-18,-18.5]]);expect(redstone['crafter_disabled_slot@common.button'].type).toBe('button');
});

test('stonecutter keeps its source two-pane stack and unequal result slot',async({page})=>{
 await open(page,'/');const root=page.locator('#advanced-workstations .mc-stonecutter'),frame=await box(root);expect([frame.width,frame.height]).toEqual([(146+4+176)*2,166*2]);await rect(root.locator('.mc-stonecutter__book'),frame,{x:0,y:0,width:146,height:166});await rect(root.locator('.mc-stonecutter__fold'),frame,{x:146,y:0,width:4,height:166});await rect(root.locator('.mc-stonecutter__right'),frame,{x:150,y:0,width:176,height:166});
 const right=await box(root.locator('.mc-stonecutter__right')),topHeight=166/2-22,stackWidth=18+14+18+14+26,stackX=(176-stackWidth)/2,stackY=15+(topHeight-26)/2;
 await rect(root.locator('.mc-stonecutter__input'),right,{x:stackX,y:stackY+4,width:18,height:18});await rect(root.locator('.mc-stonecutter__arrow'),right,{x:stackX+18+14,y:stackY+7,width:18,height:12});await rect(root.locator('.mc-stonecutter__result'),right,{x:stackX+18+14+18+14,y:stackY,width:26,height:26});await rect(root.locator('.mc-advanced-dual__selector'),frame,{x:6,y:6,width:146-12,height:166-12});
 const title=await box(root.locator('.mc-workstation__title'));expect(Math.abs(title.x+title.width/2-right.x-176)).toBeLessThanOrEqual(.02);expect(Math.abs(title.y-right.y-10)).toBeLessThanOrEqual(.02);await expect(root.locator('.mc-dialog__close')).toHaveCount(0);await capture(root,'stonecutter-unmasked');
});

test('loom source padding, opaque empty slots and custom-renderer containers remain distinct',async({page})=>{
 await open(page);const root=sample(page,'loom').locator('.mc-loom'),frame=await box(root),right=await box(root.locator('.mc-loom__right'));expect([frame.width,frame.height]).toEqual([652,332]);const width=18*3+2*2+6+18+6+18+6+22,x=(176-width)/2,y=15+((166/2-22)-42)/2;
 for(const[name,dx]of[['banner',0],['dye',20],['pattern',40]]as const)await rect(root.locator(`.mc-loom__${name}`),right,{x:x+dx,y:y+(42-18)/2,width:18,height:18});await rect(root.locator('.mc-loom__arrow'),right,{x:x+58+6,y:y+(42-12)/2,width:18,height:12});await rect(root.locator('.mc-loom__result'),right,{x:x+58+6+18+6,y:y+12,width:18,height:18});await rect(root.locator('.mc-loom__banner-outline'),right,{x:x+58+6+18+6+18+6,y,width:22,height:42});await rect(root.locator('.mc-loom__banner-preview'),right,{x:x+58+6+18+6+18+6+1,y:y+1,width:20,height:40});await expect(root.locator('.mc-loom__banner-preview')).toHaveAttribute('data-native-renderer','banner_pattern_renderer');await expect(root.locator('.mc-loom__banner-preview')).toHaveAttribute('data-renderer-unavailable','true');
 for(const name of['banner','dye','pattern'])await expect(root.locator(`.mc-loom__empty--${name}`)).toHaveCSS('opacity','1');await capture(root,'loom-empty-unmasked');
});

test('beacon source root, effect coordinates, pyramids and payment strip preserve the wide profile',async({page})=>{
 await open(page);const root=sample(page,'beacon').locator('.mc-beacon'),frame=await box(root);expect([frame.width,frame.height]).toEqual([256*2,219*2]);await rect(root.locator('.mc-beacon__inner'),frame,{x:(256-212)/2,y:4,width:212,height:97});
 const center=256/2;for(const[id,dx,dy]of[['speed',-63,18],['haste',-39,18],['resistance',-63,43],['jump-boost',-39,43],['strength',-51,68],['regeneration',28,43],['extra',52,43]]as const)await rect(root.locator(`.mc-beacon__effect[data-effect="${id}"]`),frame,{x:center+dx,y:4+dy,width:22,height:22});for(const[level,dx,dy]of[[1,-98,18],[2,-98,43],[3,-98,68],[4,42,18]]as const)await rect(root.locator(`.mc-beacon__pyramid[data-level="${level}"]`),frame,{x:center+dx,y:4+dy,width:19,height:20});
 const payY=(219-22)/2+8;await rect(root.locator('.mc-beacon__payment'),frame,{x:0,y:payY,width:256,height:22});await rect(root.locator('.mc-beacon__payment-slot'),frame,{x:center+19,y:payY+2,width:18,height:18});await rect(root.locator('.mc-beacon__accepted-items'),frame,{x:center+8-104,y:payY+2,width:104,height:18});await rect(root.locator('.mc-beacon__confirm'),frame,{x:center+48,y:payY,width:22,height:22});await rect(root.locator('.mc-beacon__cancel'),frame,{x:center+74,y:payY,width:22,height:22});await capture(root,'beacon-unmasked');
});

test('crafter keeps enabled-grid and fractional disabled-button source bounds, with readonly output preview',async({page})=>{
 await open(page);const root=sample(page,'crafter').locator('.mc-crafter'),frame=await box(root),grid={x:-36+(176-54)/2,y:11+(166/2-12-54)/2};expect([frame.width,frame.height]).toEqual([352,332]);await rect(root.locator('.mc-crafter__grid'),frame,{...grid,width:54,height:54});
 for(let index=0;index<9;index++){const disabled=[0,4,8].includes(index),x=grid.x+index%3*18,y=grid.y+Math.floor(index/3)*18;await rect(root.locator(`[data-index="${index}"] button`),frame,{x:x+(disabled&&index%3===0?.1:0),y:y+(disabled&&index<6?.1:0),width:18,height:18});}
 await rect(root.locator('.mc-crafter__wire'),frame,{x:95,y:38,width:18,height:18});await rect(root.locator('.mc-crafter__output'),frame,{x:176/2+54-9,y:166/2-36-9,width:18,height:18});await rect(root.locator('.mc-crafter__output-border'),frame,{x:176/2+54-13,y:166/2-36-13,width:26,height:26});await expect(root.locator('.mc-crafter__output button')).toHaveCount(0);await capture(root,'crafter-unmasked');
});

test('all four advanced inventories use their source root width and height, and beacon has no inventory heading',async({page})=>{
 await open(page,'/');for(const[kind,width,height]of[['stonecutter',176,166],['loom',176,166],['beacon',256,219],['crafter',176,166]]as const){const root=page.locator(`#advanced-workstations .mc-${kind}`),region=kind==='stonecutter'||kind==='loom'?root.locator(`.mc-${kind}__right`):root,frame=await box(region),inventory=region.getByRole('grid',{name:'Inventory',exact:true}),hotbar=region.getByRole('grid',{name:'Hotbar',exact:true}),x=(width-162)/2;await expect(inventory.getByRole('gridcell')).toHaveCount(27);await expect(hotbar.getByRole('gridcell')).toHaveCount(9);for(let i=0;i<27;i++)await rect(inventory.locator('.mc-slot').nth(i),frame,{x:x+i%9*18,y:height-80+Math.floor(i/9)*18,width:18,height:18});for(let i=0;i<9;i++)await rect(hotbar.locator('.mc-slot').nth(i),frame,{x:x+i*18,y:height-23,width:18,height:18});if(kind==='beacon')await expect(region.locator('.mc-player-inventory__label')).toBeHidden();else await rect(region.locator('.mc-player-inventory__label'),frame,{x:7,y:height-90,width:162,height:10});}
});

test('recipe state and keyboard activation skip disabled choices without fabricating native collection focus links',async({page})=>{
 await open(page);const grid=sample(page,'recipe').getByRole('grid'),button=(id:number)=>grid.locator(`[data-recipe-id="recipe-${id}"]`),events=page.getByRole('status',{name:'Advanced fixture events'});await expect(button(0)).toHaveAttribute('aria-pressed','true');await expect(button(1)).toBeDisabled();await button(0).focus();await button(0).press('ArrowRight');await expect(button(2)).toBeFocused();await button(2).press('Enter');await expect(button(2)).toHaveAttribute('aria-pressed','true');await expect(button(0)).toHaveAttribute('aria-pressed','false');await expect(events).toHaveText('recipe:recipe-2');await button(1).evaluate((node:HTMLButtonElement)=>node.click());await expect(events).toHaveText('recipe:recipe-2');await button(2).press('ArrowDown');await expect(button(9)).toBeFocused();
});

test('disabled crafter slots remain keyboard actionable to re-enable and preserve controlled state',async({page})=>{
 await open(page);const region=sample(page,'crafter'),grid=region.getByRole('grid',{name:'Crafter input slots'}),first=grid.locator('[data-index="0"] button'),second=grid.locator('[data-index="1"] button');await expect(first).toHaveClass(/__disabled/);await expect(first).toBeEnabled();await first.focus();await first.press('ArrowRight');await expect(second).toBeFocused();await second.press('ArrowLeft');await expect(first).toBeFocused();await first.press('Enter');await expect(grid.locator('[data-index="0"]')).toHaveAttribute('data-enabled','true');await expect(page.getByRole('status',{name:'Advanced fixture events'})).toHaveText('crafter-enabled:0:true');
});

test('crafter slot forwards host HTML attributes and preserves keyboard focus through re-enable',async({page})=>{
 await open(page);const fixture=sample(page,'crafter-disabled'),button=fixture.getByRole('button',{name:'Disabled crafter specimen'}),events=page.getByRole('status',{name:'Advanced fixture events'});await expect(button).toHaveAttribute('id','advanced-disabled-slot');await expect(button).toHaveAttribute('data-consumer','disabled-props');await expect(button).toHaveAttribute('aria-description','Configurable slot');await expect(button).toHaveAttribute('tabindex','0');await page.keyboard.press('Tab');await button.focus();await expect(button).toHaveCSS('outline-style','solid');await expect(button).toHaveCSS('outline-width','2px');await expect(button).toHaveCSS('outline-color','rgb(255, 255, 255)');await expect(events).toHaveText('disabled-focus');await button.press('Enter');await expect(fixture.locator('.mc-crafter-slot')).toHaveAttribute('data-enabled','true');await expect(button).toBeFocused();await expect(events).toContainText('disabled-slot:true');await expect(button).toHaveAttribute('data-consumer','disabled-props');
});

test('beacon effect states and payment actions are controlled, and source right-edge focus STOP is honored',async({page})=>{
 await open(page);const root=sample(page,'beacon').locator('.mc-beacon'),speed=root.locator('[data-effect="speed"]'),strength=root.locator('[data-effect="strength"]'),locked=root.locator('[data-effect="haste"]'),events=page.getByRole('status',{name:'Advanced fixture events'});await expect(speed).toHaveAttribute('aria-pressed','true');await expect(locked).toBeDisabled();await locked.evaluate((node:HTMLButtonElement)=>node.click());await expect(events).toBeEmpty();await strength.focus();await strength.press('Enter');await expect(strength).toHaveAttribute('aria-pressed','true');await expect(speed).toHaveAttribute('aria-pressed','false');await expect(root.locator('.mc-beacon__confirm')).toBeDisabled();await root.locator('.mc-beacon__confirm').evaluate((node:HTMLButtonElement)=>node.click());await expect(events).toHaveText('effect:strength');await root.locator('.mc-beacon__cancel').click();await expect(events).toHaveText('effect:strength|cancel');
 for(const index of[8,17,26]){const slot=root.getByRole('grid',{name:'Inventory',exact:true}).locator('.mc-slot').nth(index);await slot.focus();await slot.press('ArrowRight');await expect(slot).toBeFocused();}const last=root.getByRole('grid',{name:'Hotbar',exact:true}).locator('.mc-slot').nth(8);await last.focus();await last.press('ArrowRight');await expect(last).toBeFocused();await sample(page,'beacon-confirm').locator('.mc-beacon__confirm').click();await expect(events).toHaveText('effect:strength|cancel|confirm');
});

function sliced(source:PNG,width:number,height:number,slice:number){const result=new PNG({width,height});const coordinate=(p:number,target:number,size:number)=>p<slice*2?Math.floor(p/2):p>=target-slice*2?size-slice+Math.floor((p-target+slice*2)/2):slice+Math.floor((p-slice*2+.5)*(size-slice*2)/(target-slice*4));for(let y=0;y<height;y++)for(let x=0;x<width;x++){const from=(coordinate(y,height,source.height)*source.width+coordinate(x,width,source.width))*4;result.data.set(source.data.subarray(from,from+4),(y*width+x)*4);}return result;}
async function reference(page:Page,file:string,width:number,height:number,options:{slice?:number;icon?:string}={}){let base:Buffer=await bytes(file);if(options.slice)base=PNG.sync.write(sliced(PNG.sync.read(base),width,height,options.slice));const icon=options.icon?await bytes(options.icon):undefined;await page.evaluate(({url,icon,width,height})=>{document.getElementById('advanced-original-reference')?.remove();const plane=document.createElement('div');plane.id='advanced-original-reference';Object.assign(plane.style,{position:'fixed',left:'616px',top:'16px',width:`${width}px`,height:`${height}px`,background:'#c6c6c6',zIndex:'2147483647'});const image=document.createElement('img');image.src=url;Object.assign(image.style,{position:'absolute',left:'0',top:'0',width:'100%',height:'100%',imageRendering:'pixelated'});plane.append(image);if(icon){const node=document.createElement('img');node.src=icon;Object.assign(node.style,{position:'absolute',left:'4px',top:'4px',width:'36px',height:'36px',imageRendering:'pixelated'});plane.append(node);}document.body.append(plane);},{url:`data:image/png;base64,${base.toString('base64')}`,icon:icon?`data:image/png;base64,${icon.toString('base64')}`:null,width,height});const plane=page.locator('#advanced-original-reference');await plane.locator('img').evaluateAll(nodes=>Promise.all(nodes.map(n=>(n as HTMLImageElement).decode())));return plane;}
async function canonical(target:Locator,width:number,height:number){const bounds=await box(target);expect([bounds.width,bounds.height]).toEqual([width,height]);await target.evaluate(node=>Object.assign((node as HTMLElement).style,{position:'fixed',left:'16px',top:'16px',zIndex:'2147483647',transform:'none',backgroundColor:'#c6c6c6'}));}

test('beacon inner background uses source120x32 four-pixel nine-slice instead of stretching the full image',async({page})=>{
 await open(page);const source=sample(page,'beacon').locator('.mc-beacon__inner');await expect(source).toHaveCSS('image-rendering','pixelated');await source.evaluate(node=>{const clone=node.cloneNode(false)as HTMLElement;clone.style.imageRendering=getComputedStyle(node).imageRendering;clone.id='advanced-beacon-background-subject';Object.assign(clone.style,{position:'fixed',left:'16px',top:'16px',zIndex:'2147483647',background:'#c6c6c6'});document.body.append(clone);});const target=page.locator('#advanced-beacon-background-subject');expect([(await box(target)).width,(await box(target)).height]).toEqual([424,194]);const expected=await reference(page,'effect_background',424,194,{slice:4});equal(await capture(target,'beacon-background-actual'),await capture(expected,'beacon-background-expected'));
});

test('the complete fold skin keeps source border edges beyond its nominal4game width',async({page})=>{
 await open(page);const source=sample(page,'stonecutter').locator('.mc-stonecutter__fold');await expect(source).toHaveCSS('image-rendering','pixelated');await source.evaluate(node=>{const host=document.createElement('div');host.id='advanced-fold-subject';Object.assign(host.style,{position:'fixed',left:'16px',top:'16px',width:'24px',height:'320px',background:'#c6c6c6',overflow:'hidden',zIndex:'2147483647'});const clone=node.cloneNode(false)as HTMLElement;clone.style.imageRendering=getComputedStyle(node).imageRendering;Object.assign(clone.style,{position:'absolute',left:'8px',top:'-6px',width:'8px',height:'332px'});host.append(clone);document.body.append(host);});const expected=await reference(page,'recipe_back_panel',24,320,{slice:4});equal(await capture(page.locator('#advanced-fold-subject'),'fold-complete-actual'),await capture(expected,'fold-complete-expected'));
});

test('loom outline samples the complete source4x4 one-pixel nine-slice',async({page})=>{await open(page);const target=sample(page,'loom').locator('.mc-loom__banner-outline');await canonical(target,44,84);const expected=await reference(page,'Banners',44,84,{slice:1});equal(await capture(target,'loom-outline-actual'),await capture(expected,'loom-outline-expected'));});

for(const[id,file]of[[2,'recipe_book_item_bg'],[0,'recipe_book_touch_cell_selected']]as const)test(`explicit recipe binding${id} retains its original nine-slice background`,async({page})=>{await open(page);const target=sample(page,'recipe').locator(`[data-recipe-id="recipe-${id}"]`);await canonical(target,36,36);const expected=await reference(page,file,36,36,{slice:1});equal(await capture(target,`recipe-${id}-actual`),await capture(expected,`recipe-${id}-expected`));});

for(const[name,file]of[['banner','loom_banner_empty'],['dye','loom_dye_empty'],['pattern','loom_pattern_item_empty']]as const)test(`loom ${name} placeholder uses opaque original16x16 texels`,async({page})=>{await open(page);const target=sample(page,'loom').locator(`.mc-loom__empty--${name}`);await canonical(target,32,32);const expected=await reference(page,file,32,32);equal(await capture(target,`loom-${name}-actual`),await capture(expected,`loom-${name}-expected`));});

for(const[id,file,hover]of[['effect-default','beacon_button_default',false],['effect-default','beacon_button_hover',true],['effect-selected','beacon_button_pressed',false],['effect-selected','beacon_button_pressed',true],['effect-locked','beacon_button_locked',false],['effect-locked','beacon_button_locked',true]]as const)test(`beacon ${id} hover=${hover} preserves complete source state and icon pixels`,async({page})=>{await open(page);const target=sample(page,id).locator('.mc-beacon-effect');await canonical(target,44,44);if(hover)await target.hover();const expected=await reference(page,file,44,44,{icon:'speed_effect'});equal(await capture(target,`${id}-${hover}-actual`),await capture(expected,`${id}-${hover}-expected`));});

for(const[id,file,hover]of[['crafter-enabled','slot_enabled',false],['crafter-disabled','slot_disabled',false],['crafter-disabled','slot_enabled_hover',true]]as const)test(`crafter ${id} hover=${hover} uses the actual source slot texture`,async({page})=>{await open(page);const target=sample(page,id).locator('button');await canonical(target,36,36);if(hover)await target.hover();const expected=await reference(page,file,36,36);equal(await capture(target,`${id}-${hover}-actual`),await capture(expected,`${id}-${hover}-expected`));});

for(const powered of[false,true])test(`crafter powered=${powered} uses original16x16 wire at source18game size`,async({page})=>{await open(page);const fixture=sample(page,'crafter');if(powered)await fixture.getByRole('button',{name:'Toggle specimen crafter power'}).click();const target=fixture.locator('.mc-crafter__wire');await expect(target).toHaveAttribute('data-powered',String(powered));await canonical(target,36,36);const expected=await reference(page,powered?'redstone_arrow_powered':'redstone_arrow_unpowered',36,36);equal(await capture(target,`wire-${powered}-actual`),await capture(expected,`wire-${powered}-expected`));});

for(const level of[1,2,3,4])test(`beacon pyramid${level} keeps original19x20 pixels`,async({page})=>{await open(page);const target=sample(page,'beacon').locator(`.mc-beacon__pyramid[data-level="${level}"]`);await canonical(target,38,40);const expected=await reference(page,`pyramid_level_${level}`,38,40);equal(await capture(target,`pyramid-${level}-actual`),await capture(expected,`pyramid-${level}-expected`));});

// Native GUI5 images were captured independently from this Web implementation.
// Only fixed plateau regions and composition facts are certified here: no
// replacement of complete native borders, text, renderer output or AA pixels.
const nativeSelectors=[
 ['stonecutter-empty','1b4d7e00197997a10ef4984bb04d52f508d7cad0e40d8bfdac96b33a3734b956'],
 ['loom-empty','63b6e16febe2fa6cd37f718b2f1a644bb836998bda8c52c6d5bbfdef573dde6c'],
] as const;
function rgb(image:PNG,x:number,y:number){const i=(y*image.width+x)*4;return Array.from(image.data.subarray(i,i+3));}
test('independent native lossless images show no fitting-selector bar and retain book-over-fold plateaus',async()=>{
 for(const[name,sha]of nativeSelectors){const path=new URL(`../.cache/native-gui/${name}-native-lossless.png`,import.meta.url);test.skip(!existsSync(path),'Optional native GUI5 capture unavailable.');const data=await readFile(path);expect(createHash('sha256').update(data).digest('hex')).toBe(sha);const image=PNG.sync.read(data);expect([image.width,image.height]).toEqual([2568,1400]);
  // Fixed original coordinates, selected before inspecting Web scene output.
  let changed=0;for(let y=780;y<1060;y++)for(let x=1160;x<1175;x++)if(rgb(image,x,y).some(channel=>channel!==93))changed++;expect(changed,`${name} complete4200px native no-bar plateau`).toBe(0);
  for(const y of[400,600,800,1000])for(const[x,color]of[[1188,198],[1193,85],[1198,85],[1203,0]]as const)expect(rgb(image,x,y)).toEqual([color,color,color]);
 }
});
test('native empty and thirty-one fitting recipes hide their bar, center seven columns, and overflow remains operable',async({page})=>{
 await open(page);const empty=sample(page,'stonecutter-native-empty'),fit=sample(page,'loom-native-fit'),overflow=sample(page,'loom-overflow');for(const root of[empty,fit])await expect(root.locator('[role="scrollbar"]')).toBeHidden();
 const frame=await box(fit.locator('.mc-loom')),first=fit.locator('[data-recipe-id="recipe-0"]'),grid=fit.getByRole('grid',{name:'Banner patterns'});await expect(grid.getByRole('gridcell')).toHaveCount(31);await rect(first,frame,{x:(146-7*18)/2,y:7,width:18,height:18});
 const bar=overflow.getByRole('scrollbar');await expect(bar).toBeVisible();await expect(bar).not.toHaveAttribute('aria-disabled','true');await bar.focus();await bar.press('End');await expect.poll(async()=>Number(await bar.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
});
test('actual dual-panel scene preserves native book-over-fold color plateaus without cropping the folded edge',async({page})=>{
 await open(page);for(const kind of['stonecutter','loom']as const){const root=sample(page,kind).locator(`.mc-${kind}`);await canonical(root,652,332);const image=await capture(root,`${kind}-fold-composition-actual`);for(const gameY of[30,60,100,150])for(const[gameX,color]of[[142,198],[143,85],[144,85],[145,0]]as const)expect(rgb(image,gameX*2+1,gameY*2+1),`${kind} game(${gameX},${gameY}) native plateau`).toEqual([color,color,color]);}
});

test('native empty beacon preserves its complete extra-effect background region',async()=>{
 const path=new URL('../.cache/native-gui/beacon-empty-native-lossless.png',import.meta.url);test.skip(!existsSync(path),'Optional native GUI5 beacon capture unavailable.');const data=await readFile(path);expect(createHash('sha256').update(data).digest('hex')).toBe('3e39ea327571fb3d30f575d3da19ce3df214c9e07a9b874d3ccacb6922a8fe40');const image=PNG.sync.read(data);expect([image.width,image.height]).toEqual([2568,1400]);let changed=0;for(let y=390;y<490;y++)for(let x=1556;x<1656;x++)if(rgb(image,x,y).some(channel=>channel!==33))changed++;expect(changed,'all10000 original extra-effect-region pixels remain background').toBe(0);
});
test('default empty beacon has six locked effects and extra remains an explicit host-visible state',async({page})=>{
 await open(page);const root=sample(page,'beacon-native-empty').locator('.mc-beacon');await expect(root.locator('.mc-beacon-effect')).toHaveCount(6);await expect(root.locator('[data-effect="extra"]')).toHaveCount(0);for(const effect of await root.locator('.mc-beacon-effect').all())await expect(effect).toBeDisabled();await expect(sample(page,'beacon').locator('[data-effect="extra"]')).toBeVisible();
});
