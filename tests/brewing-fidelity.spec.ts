import {expect,test} from '@playwright/test';
import type{Locator,Page}from'@playwright/test';
import{createHash}from'node:crypto';
import{existsSync}from'node:fs';
import{mkdir,readFile}from'node:fs/promises';
import{join}from'node:path';
import{fileURLToPath}from'node:url';
import{PNG}from'pngjs';

// Independent native 1.26.6005.0 / Mojang v1.26.60.5 full-release source:
// resource_pack/ui/brewing_stand_screen.json. ZIP SHA256
// d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf.
// Geometry, layer order and source images below are not derived from production
// CSS, generated skin/geometry manifests or screenshots of this implementation.
const originals=[
 ['brewing_pipes',30,26,'c13ce22c300cb464844a08f1b4e84a00511c6dbadb503b3fe26ebbe2b6798767'],
 ['brewing_fuel_pipes',30,22,'f868469df7b68a9257175a015e53aa7231aa2c72d4ff7dda772d3c2b8c9fa461'],
 ['bottle_empty',16,16,'1c629d4a4265548827804e3e3413cecf64911090f917fe275e95de5112c625d0'],
 ['brewing_fuel_empty',16,16,'84e89ce218f43511041833da6b132e9fff4c0e938c5555f2fc10bc663e27002c'],
 ['bubbles_empty',12,30,'1101a177831943ed9fc2d8e91457d221f6680fc4532a36be22822f7b5a747177'],
 ['bubbles_full',12,30,'dcfa0312a6992bfbb928cfc7d1a453b78648c069ec10ff2c422ac0a4ea5d3614'],
 ['brewing_arrow_empty',9,28,'10484ecfe381f20a5f26be7b02113f0b636bfdb3201eb8853beb9d1bb45147f0'],
 ['brewing_arrow_full',9,28,'8d58f3fd4f5e9b4bebe102002194ebe393247a1553e1b37f47b6c77ac7b67701'],
 ['brewing_fuel_bar_empty',24,6,'cc41cb2f13d532a7e4958aca342815e17e1fd4321a2a4a9040ba1c0151a2f70c'],
 ['brewing_fuel_bar_full',22,4,'48b153b187b46c2ed41620f4414192142b61fb3b5a7277afdd06f432c9af9574'],
]as const;
const center={x:176/2,y:7+(166/2-12)/2};
const slots=[{id:'ingredient',x:center.x-9,y:center.y-9-18},{id:'fuel',x:center.x-9-70,y:center.y-9-18},{id:'0',x:center.x-27-5,y:center.y-9+23-7},{id:'1',x:center.x-9,y:center.y-9+23},{id:'2',x:center.x+9+5,y:center.y-9+23-7}];
type Box={x:number;y:number;width:number;height:number};
async function box(locator:Locator):Promise<Box>{const r=await locator.boundingBox();if(!r)throw new Error('Missing brewing source comparison region');return r;}
async function rect(locator:Locator,frame:Box,want:{x:number;y:number;width:number;height:number}){const actual=await box(locator);for(const key of['x','y','width','height']as const)expect(Math.abs(actual[key]-(key==='x'||key==='y'?frame[key]:0)-want[key]*2),`source ${key}`).toBeLessThanOrEqual(.02);}
async function open(page:Page,path='/'){await page.goto(path);await page.evaluate(()=>document.fonts.ready);await page.mouse.move(0,0);}
async function asset(file:string){return readFile(new URL(`../.cache/references/${file}.png`,import.meta.url));}
async function output(){await mkdir(new URL('../.cache/brewing-qa/',import.meta.url),{recursive:true});}

test('brewing original PNGs preserve source dimensions and hashes',async()=>{for(const[file,w,h,hash]of originals){const bytes=await asset(file);expect(createHash('sha256').update(bytes).digest('hex'),file).toBe(hash);const image=PNG.sync.read(bytes);expect([image.width,image.height]).toEqual([w,h]);}});

test('native brewing source independently confirms clip directions, unequal fuel layers and explicit focus links',async()=>{
 const path=join(process.env.MCBE_INSTALL_ROOT??'C:/XboxGames/Minecraft for Windows/Content','data/resource_packs/vanilla/__brarchive/ui.brarchive');test.skip(!existsSync(path),'Optional check needs a user-owned matching game installation.');const bytes=await readFile(path),count=bytes.readUInt32LE(8),base=16+count*256;let source:any;
 for(let i=0;i<count;i++){const row=16+i*256;if(bytes.toString('utf8',row+1,row+1+bytes[row]!)!=='brewing_stand_screen.json')continue;const offset=bytes.readUInt32LE(row+248),size=bytes.readUInt32LE(row+252);source=JSON.parse(bytes.toString('utf8',base+offset,base+offset+size));}
 expect(source).toBeTruthy();expect(source.brewing_panel_top_half.size).toEqual(['100%','50% - 12px']);
 expect(source.brewing_arrow_full_image.clip_direction).toBe('up');expect(source.bubbles_full_image.clip_direction).toBe('down');expect(source.brewing_fuel_bar_full_image.clip_direction).toBe('left');
 expect(source.brewing_fuel_bar_empty_image.size).toEqual([24,6]);expect(source.brewing_fuel_bar_full_image.size).toEqual([22,4]);expect(source.bubbles_empty_image.layer).toBe(2);expect(source.brewing_fuel_bar_empty_image.layer).toBe(1);
 expect(source.brewing_input_slot.controls[0]['input_grid_item@common.container_item'].$focus_override_left).toBe('brewing_fuel');expect(source.brewing_fuel_slot.controls[0]['fuel_grid_item@common.container_item'].$focus_override_right).toBe('brewing_input_item0');expect(source.brewing_output_slots.controls[0].left_offset.controls[0]['output_grid_item1@brewing_stand.brewingstand_output_item'].$focus_override_left).toBe('brewing_fuel');
});

test('brewing main composition follows centered source geometry including staggered bottles',async({page},testInfo)=>{
 await open(page);const region=page.locator('#brewing .mc-brewing'),frame=await box(region);expect([frame.width,frame.height]).toEqual([352,332]);
 for(const slot of slots)await rect(region.locator(`[data-brewing-slot="${slot.id}"]`),frame,{...slot,width:18,height:18});
 for(const[selector,x,y,width,height]of[['pipes',center.x-15,center.y+3-13,30,26],['fuel-pipes',center.x-47-15,center.y-5-11,30,22],['arrow',center.x+16-4.5,center.y-14-14,9,28],['bubbles',center.x-23-6,center.y-14-15,12,30],['fuel-bar',center.x-23-12,center.y+3-3,24,6]]as const)await rect(region.locator(`.mc-brewing__${selector}`),frame,{x,y,width,height});
 const fuel=await box(region.locator('.mc-brewing__fuel-bar'));await rect(region.locator('.mc-brewing__fuel-bar .mc-brewing-indicator__full'),fuel,{x:1,y:1,width:22,height:4});
 const title=await box(region.locator('.mc-workstation__title'));expect(Math.abs(title.x+title.width/2-frame.x-176)).toBeLessThanOrEqual(.02);expect(Math.abs(title.y-frame.y-8)).toBeLessThanOrEqual(.02);
 await output();const path=fileURLToPath(new URL('../.cache/brewing-qa/brewing-unmasked.png',import.meta.url));await region.screenshot({path});await testInfo.attach('actual-implementation-not-native-reference',{path,contentType:'image/png'});
});

test('brewing player inventory uses every original bottom anchor',async({page})=>{
 await open(page);const region=page.locator('#brewing .mc-brewing'),frame=await box(region),inventory=region.getByRole('grid',{name:'Inventory',exact:true}),hotbar=region.getByRole('grid',{name:'Hotbar',exact:true});await rect(region.locator('.mc-player-inventory__label'),frame,{x:7,y:76,width:162,height:10});
 await expect(inventory.getByRole('gridcell')).toHaveCount(27);await expect(hotbar.getByRole('gridcell')).toHaveCount(9);for(let i=0;i<27;i++)await rect(inventory.locator('.mc-slot').nth(i),frame,{x:7+i%9*18,y:86+Math.floor(i/9)*18,width:18,height:18});for(let i=0;i<9;i++)await rect(hotbar.locator('.mc-slot').nth(i),frame,{x:7+i*18,y:143,width:18,height:18});
});

test('brewing empty placeholders retain opaque source sizing and only explicit focus edges are certified',async({page})=>{
 await open(page,'/calibration.html');const region=page.locator('[data-case="brewing-empty"] .mc-brewing'),frame=await box(region);
 for(const slot of slots.filter(s=>s.id!=='ingredient')){const cell=region.locator(`[data-brewing-slot="${slot.id}"]`),placeholder=cell.locator('.mc-slot__placeholder');await expect(cell).toHaveAttribute('data-empty','true');await expect(placeholder).toHaveCSS('opacity','1');await rect(placeholder.locator('span'),frame,{x:slot.x+1,y:slot.y+(slot.id==='fuel'?0:1),width:16,height:16});}
 const ingredient=region.locator('[data-brewing-slot="ingredient"]'),fuel=region.locator('[data-brewing-slot="fuel"]'),left=region.locator('[data-brewing-slot="0"]');await ingredient.focus();await ingredient.press('ArrowLeft');await expect(fuel).toBeFocused();await fuel.press('ArrowRight');await expect(ingredient).toBeFocused();await left.focus();await left.press('ArrowLeft');await expect(fuel).toBeFocused();
});

// Independent original-image renderer. Uses <img> + overflow viewports rather
// than production backgrounds/clip-path, preserving Chromium alpha sampling.
async function sourcePlane(page:Page,variant:'arrow'|'bubbles'|'fuel',ratio:number,scene:boolean){
 const urls:Record<string,string>={};for(const[file]of originals)urls[file]=`data:image/png;base64,${(await asset(file)).toString('base64')}`;urls.cell_image=`data:image/png;base64,${(await asset('cell_image')).toString('base64')}`;
 await page.evaluate(({urls,variant,ratio,scene})=>{
  document.getElementById('independent-brewing-plane')?.remove();const plane=document.createElement('div');plane.id='independent-brewing-plane';Object.assign(plane.style,{position:'fixed',left:'416px',top:'16px',width:scene?'352px':variant==='arrow'?'18px':variant==='bubbles'?'24px':'48px',height:scene?'332px':variant==='arrow'?'56px':variant==='bubbles'?'60px':'12px',background:scene?'#c6c6c6':'#28292a',isolation:'isolate',zIndex:'2147483647'});document.body.append(plane);
  const img=(file:string,x:number,y:number,w:number,h:number,z:number,crop?:[number,number,number,number])=>{const viewport=document.createElement('div');const[left,top,width,height]=crop??[0,0,w,h];Object.assign(viewport.style,{position:'absolute',left:`${x+left}px`,top:`${y+top}px`,width:`${width}px`,height:`${height}px`,overflow:'hidden',zIndex:String(z)});const node=document.createElement('img');node.src=urls[file]!;Object.assign(node.style,{position:'absolute',left:`${-left}px`,top:`${-top}px`,width:`${w}px`,height:`${h}px`,maxWidth:'none',maxHeight:'none',imageRendering:'pixelated'});viewport.append(node);plane.append(viewport);};
  const indicator=(kind:'arrow'|'bubbles'|'fuel',x:number,y:number)=>{const w=kind==='arrow'?18:kind==='bubbles'?24:48,h=kind==='arrow'?56:kind==='bubbles'?60:12;img(kind==='arrow'?'brewing_arrow_empty':kind==='bubbles'?'bubbles_empty':'brewing_fuel_bar_empty',x,y,w,h,kind==='bubbles'?2:1);const inset=kind==='fuel'?2:0,fw=w-inset*2,fh=h-inset*2;img(kind==='arrow'?'brewing_arrow_full':kind==='bubbles'?'bubbles_full':'brewing_fuel_bar_full',x+inset,y+inset,fw,fh,3,kind==='arrow'?[0,0,fw,fh*ratio]:kind==='bubbles'?[0,fh*(1-ratio),fw,fh*ratio]:[0,0,fw*ratio,fh]);};
  if(!scene){indicator(variant,0,0);return;}
  indicator('arrow',199,29);indicator('bubbles',118,27);indicator('fuel',106,85);
  // common.cell_image: original10x10 / base_size5 / logical edge1, GUI2 edge2.
  for(const[x,y]of[[158,31],[18,31],[112,99],[158,113],[204,99]]as const){const cell=document.createElement('div');Object.assign(cell.style,{position:'absolute',left:`${x}px`,top:`${y}px`,width:'36px',height:'36px',boxSizing:'border-box',border:'2px solid transparent',borderImage:`url("${urls.cell_image}") 2 fill / 2px stretch`,zIndex:'2'});plane.append(cell);}
  img('brewing_fuel_empty',20,31,32,32,4);for(const[x,y]of[[114,101],[160,115],[206,101]]as const)img('bottle_empty',x,y,32,32,4);
  img('brewing_fuel_pipes',52,53,60,44,2);img('brewing_pipes',146,65,60,52,2);
 },{urls,variant,ratio,scene});
 await page.locator('#independent-brewing-plane img').evaluateAll(images=>Promise.all(images.map(node=>(node as HTMLImageElement).decode())));
 return page.locator('#independent-brewing-plane');
}
function equal(actual:PNG,expected:PNG){expect([actual.width,actual.height]).toEqual([expected.width,expected.height]);let changed=0;for(let i=0;i<actual.data.length;i+=4)if([0,1,2,3].some(c=>actual.data[i+c]!==expected.data[i+c]))changed++;expect(changed,'RGBA pixels differing from independently composed original source PNGs').toBe(0);}

for(const variant of['arrow','bubbles','fuel']as const)for(const ratio of[0,.5,1])test(`brewing ${variant} ${ratio} uses source-size cropping in the public reveal direction`,async({page})=>{
 await open(page,'/calibration.html');const target=page.locator(`[data-case="brewing-${variant}-${ratio*100}"] .mc-brewing-indicator`),bounds=await box(target),w=variant==='arrow'?18:variant==='bubbles'?24:48,h=variant==='arrow'?56:variant==='bubbles'?60:12;expect([bounds.width,bounds.height]).toEqual([w,h]);await target.evaluate(node=>Object.assign((node as HTMLElement).style,{position:'fixed',left:'16px',top:'16px',zIndex:'2147483647',backgroundColor:'#28292a'}));const expected=await sourcePlane(page,variant,ratio,false);await output();equal(PNG.sync.read(await target.screenshot({path:fileURLToPath(new URL(`../.cache/brewing-qa/${variant}-${ratio*100}-actual.png`,import.meta.url))})),PNG.sync.read(await expected.screenshot({path:fileURLToPath(new URL(`../.cache/brewing-qa/${variant}-${ratio*100}-expected.png`,import.meta.url))})));
});

for(const ratio of[0,.5])test(`brewing diagram source layers compose correctly across slots and pipes at ${ratio}`,async({page})=>{
 await open(page,'/calibration.html');const target=page.locator(`[data-case="${ratio===0?'brewing-empty':'brewing-scene-half'}"] .mc-brewing`);expect((await box(target)).width).toBe(352);await target.evaluate(node=>Object.assign((node as HTMLElement).style,{position:'fixed',left:'16px',top:'16px',zIndex:'2147483646'}));await sourcePlane(page,'arrow',ratio,true);await output();
 // Interior source diagram only, excluding title/font, root frame and Inventory.
 // Main page geometry above is captured unchanged; only specimens are placed
 // on this integer plane. This is not a native whole-GUI expected screenshot.
 const actual=PNG.sync.read(await page.screenshot({clip:{x:32,y:45,width:224,height:122},path:fileURLToPath(new URL(`../.cache/brewing-qa/diagram-${ratio*100}-actual.png`,import.meta.url))})),expected=PNG.sync.read(await page.screenshot({clip:{x:432,y:45,width:224,height:122},path:fileURLToPath(new URL(`../.cache/brewing-qa/diagram-${ratio*100}-expected.png`,import.meta.url))}));equal(actual,expected);
});
