import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Independent original JSON oracle: Mojang v1.26.60.5 full release
// resource_pack/ui/{chest_screen,redstone_screen,ui_common}.json. Full release
// SHA256 d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf.
// Original local 1.26.6005.0 definitions were compared as complete parsed JSON.
// These expectations do not import production CSS, a generated manifest, or a
// previous browser screenshot. Arbitrary Chest row counts are library extensions.
const profiles=[
  {name:'chest',selector:'.mc-chest[data-container-rows="3"]',height:166,columns:9,rows:3,x:7,y:12+9,titleX:7,titleY:12-1,centered:false},
  {name:'large-chest',selector:'.mc-chest[data-container-rows="6"]',height:220,columns:9,rows:6,x:7,y:11+10,titleX:7,titleY:11-1,centered:false},
  {name:'hopper',selector:'.mc-hopper',height:133,columns:5,rows:1,x:(176-5*18)/2,y:7+((133/2-12)-18)/2-7,titleX:7,titleY:7,centered:false},
  {name:'dispenser',selector:'.mc-dispenser',height:166,columns:3,rows:3,x:(176-3*18)/2,y:7+((166/2-12)-3*18)/2,titleX:88,titleY:5,centered:true},
  {name:'dropper',selector:'.mc-dropper',height:166,columns:3,rows:3,x:(176-3*18)/2,y:7+((166/2-12)-3*18)/2,titleX:88,titleY:5,centered:true},
  {name:'shulker-box',selector:'.mc-shulker-box',height:166,columns:9,rows:3,x:7,y:12+9,titleX:7,titleY:12-1,centered:false},
] as const;
type Box={x:number;y:number;width:number;height:number};
async function box(locator:Locator):Promise<Box>{const value=await locator.boundingBox();if(!value)throw new Error('Missing original container comparison region');return value;}
async function rect(locator:Locator,frame:Box,expected:{x:number;y:number;width?:number;height?:number}){
  const actual=await box(locator);
  for(const dimension of ['x','y','width','height'] as const){const value=expected[dimension];if(value===undefined)continue;const relative=actual[dimension]-(dimension==='x'||dimension==='y'?frame[dimension]:0);expect(Math.abs(relative-value*2),`source ${dimension}`).toBeLessThanOrEqual(.02);}
}
async function open(page:Page){await page.goto('/');await page.evaluate(()=>document.fonts.ready);await page.mouse.move(0,0);}

test('native chest and redstone definitions independently pin container dimensions and inherited inventory anchors',async()=>{
  const install=process.env.MCBE_INSTALL_ROOT??'C:/XboxGames/Minecraft for Windows/Content',path=join(install,'data/resource_packs/vanilla/__brarchive/ui.brarchive');
  test.skip(!existsSync(path),'Optional independent native check needs a user-owned game installation.');
  const data=await readFile(path),count=data.readUInt32LE(8),base=16+count*256;
  const read=(name:string)=>{for(let index=0;index<count;index++){const row=16+index*256;if(data.toString('utf8',row+1,row+1+data[row]!)!==name)continue;const offset=data.readUInt32LE(row+248),size=data.readUInt32LE(row+252);return JSON.parse(data.toString('utf8',base+offset,base+offset+size));}throw new Error(`Missing original ${name}`);};
  const chest=read('chest_screen.json'),redstone=read('redstone_screen.json'),common=read('ui_common.json');
  expect(chest.small_chest_grid.grid_dimensions).toEqual([9,3]);expect(chest.large_chest_grid.grid_dimensions).toEqual([9,6]);
  const largeRoot=chest.large_chest_panel.controls.find((control:Record<string,unknown>)=>'root_panel@common.root_panel'in control)['root_panel@common.root_panel'];expect(largeRoot.size).toEqual([176,220]);
  expect(chest['shulker_box_panel@chest.small_chest_panel']).toEqual({});
  for(const name of ['hopper','dispenser','dropper']){
    const profile=redstone[`${name}_screen@common.inventory_screen_common`].variables.find((entry:Record<string,unknown>)=>entry.requires==='$desktop_screen');
    expect(profile.$screen_dimensions).toEqual([176,name==='hopper'?133:166]);expect(profile.$grid_dimensions).toEqual(name==='hopper'?[5,1]:[3,3]);expect(profile.$grid_offset).toEqual(name==='hopper'?[0,-7]:[0,0]);
  }
  expect(common['inventory_panel_bottom_half_with_label@inventory_panel_bottom_half'].size).toEqual(['100%',93]);
  expect(common.inventory_panel.controls[0].inventory_grid.offset).toEqual([0,-26]);expect(common.hotbar_grid_template.offset).toEqual([0,-5]);
});

for(const profile of profiles)test(`${profile.name} source storage grid, frame and title geometry`,async({page},testInfo)=>{
  await open(page);const region=page.locator(`#containers ${profile.selector}`),frame=await box(region);
  expect([frame.width,frame.height]).toEqual([176*2,profile.height*2]);
  const grid=region.locator('.mc-container__grid');await rect(grid,frame,{x:profile.x,y:profile.y,width:profile.columns*18,height:profile.rows*18});
  const slots=grid.locator('.mc-slot');await expect(slots).toHaveCount(profile.columns*profile.rows);
  for(let index=0;index<profile.columns*profile.rows;index++)await rect(slots.nth(index),frame,{x:profile.x+index%profile.columns*18,y:profile.y+Math.floor(index/profile.columns)*18,width:18,height:18});
  const title=await box(region.locator('.mc-container__title'));
  expect(Math.abs(title.y-frame.y-profile.titleY*2)).toBeLessThanOrEqual(.02);
  expect(Math.abs(title.x+(profile.centered?title.width/2:0)-frame.x-profile.titleX*2)).toBeLessThanOrEqual(.02);
  await expect(region.locator('.mc-container__title')).toHaveCSS('text-shadow','none');
  await mkdir(new URL('../.cache/container-qa/',import.meta.url),{recursive:true});const path=fileURLToPath(new URL(`../.cache/container-qa/${profile.name}-unmasked.png`,import.meta.url));
  await region.screenshot({path});await testInfo.attach('actual-browser-implementation-not-native-reference',{path,contentType:'image/png'});
});

test('every container inventory and hotbar derives its bottom anchors from that container height',async({page})=>{
  await open(page);
  for(const profile of profiles){
    const region=page.locator(`#containers ${profile.selector}`),frame=await box(region),inventory=region.getByRole('grid',{name:'Inventory',exact:true}),hotbar=region.getByRole('grid',{name:'Hotbar',exact:true});
    // Label: H - 93 + 3. Inventory: bottom aligned grid54, offset -26.
    await rect(region.locator('.mc-player-inventory__label'),frame,{x:7,y:profile.height-93+3});
    await expect(inventory.getByRole('gridcell')).toHaveCount(27);await expect(hotbar.getByRole('gridcell')).toHaveCount(9);
    for(let index=0;index<27;index++)await rect(inventory.locator('.mc-slot').nth(index),frame,{x:7+index%9*18,y:profile.height-54-26+Math.floor(index/9)*18,width:18,height:18});
    for(let index=0;index<9;index++)await rect(hotbar.locator('.mc-slot').nth(index),frame,{x:7+index*18,y:profile.height-18-5,width:18,height:18});
    const art=region.locator('.mc-container__grid .mc-slot:not([data-empty]) .mc-slot__item');
    for(let index=0;index<await art.count();index++){const bounds=await box(art.nth(index));expect([bounds.width,bounds.height]).toEqual([32,32]);}
  }
});
