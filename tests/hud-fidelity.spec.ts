import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

// Independent original-source oracle, not production CSS/skin manifests.
// Mojang v1.26.60.5 full ZIP SHA256:
// d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf.
// Original UI: resource_pack/ui/{hud_screen,hud_crosshair_overlay}.json.
// Whole JSONC objects were parsed independently and compared with installed
// 1.26.6005.0 UI archive objects. Renderer-only details remain unverified.
const originalAssets = [
  ['heart.png','94fafaf2531dadd21065a715bd9420c90e797b58bb85ed6607d9f4de746d6262',9,9],
  ['heart_background.png','5295b0825d6cdf10108ddba48ffef554084e7b9341274367d87679fba6223678',9,9],
  ['heart_half.png','6c95c0010b29df8bc926c2d83f6da65167254f9337bb0760f28f19e035db353e',9,9],
  ['hunger_background.png','de6f31ca791a63dac69991598e7d443c377a51a03d1e0a2f163ecb3d1efb4afd',9,9],
  ['hunger_full.png','47a0ee9eecdb26f1cf94e18347587ab3c369df495d156da9ca14f02bf3ad4ee4',9,9],
  ['hunger_half.png','1cca795544394cd3213157a5e9e9d8bce744dea4c5e443aa08a4f71a108078eb',9,9],
  ['armor_empty.png','572c8f65db305f3cd745051d8c2c8d9a6cf1a549b6b7d8da985797d727c2be15',9,9],
  ['armor_full.png','cbae50c24708cd258e8705323ea4087738f92538933d89f8c2ed17fd6c0f51b3',9,9],
  ['armor_half.png','9705b2102741a6d839a59fae5d9688e7a42a5d01936d417fa7722aef574fa668',9,9],
  ['bubble.png','07c3023f237c721b6a8fe8192ad9cbf6de5f87c95a50e19858636b6b3fbaf69d',9,9],
  ['bubble_pop.png','5bb76f281bb1c114e2bfb9c42310feed8fab848151d80d78129d665d62013944',9,9],
  ['bubble_empty.png','7fe1a754c72e369cd14915dd86dcb7f2c2c571dd1e8852fc522771024e74114a',9,9],
  ['hotbar_0.png','30d4cfe10e872f437d6bf0c10723e6e11838177caf98bf3ab5217737f1c6b5cf',20,22],
  ['hotbar_1.png','f1680c9d020cb3ee2c71515c1cf1b445204f507b9db0c3f93f08787563cc2776',20,22],
  ['hotbar_2.png','94ead8eb624406546f46e26fd888864e4eecbf613ca9c8460cac237ac2c846ef',20,22],
  ['hotbar_3.png','9ec64345156b9cb4877acaebf113e274614bd1661d795c07cfeb0e0fc30f27d6',20,22],
  ['hotbar_4.png','4e268ddd6a1d23e853870fe2f1ad0bae7c32d362c8e754de469ade1d74ae563b',20,22],
  ['hotbar_5.png','e52e977702fed6b3a106d47480a6c261680c9c95a41fa8fde5c9bd8f1e22a273',20,22],
  ['hotbar_6.png','ce7025819975641e43bb93d55ea34fab16d33914f9fd6aa10a8a04e525ea33da',20,22],
  ['hotbar_7.png','04f75fe23c685ace3800750d5a6bbfeeb596a619246519b12b025b531133cf18',20,22],
  ['hotbar_8.png','78784c2185a246daf49a42cb7e7b57dadab235d02f02505e9dbf215a1984fa6c',20,22],
  ['selected_hotbar_slot.png','2322d7bcd5897e324ff56d0df840aa9ff027160a6cd58c90633cfb9331676286',24,24],
  ['hotbar_start_cap.png','eabedfb5da1e9546a2634be0e07600187ebf8ebd40d61fcf0d38b95493f988b7',1,22],
  ['hotbar_end_cap.png','eabedfb5da1e9546a2634be0e07600187ebf8ebd40d61fcf0d38b95493f988b7',1,22],
  ['experiencebarempty.png','531bb4ca58b8bae327756840c19074ff6bbee08f0b479b17af2c960c041569c0',13,5],
  ['experiencebarfull.png','91978c74425ac8fad80e0f531610b28f621e14a618892c59e869c19f3c6149d1',13,5],
  ['experiencenub.png','c81011ab8abed25f6aa48b52e1a6bfac2a193d2a753f594428774c3321c5eb55',11,5],
  ['icons.png','8e7e29a72102119a9b152daec1938db35f0bca44984ad089e1a4604ff0611852',256,256],
] as const;

function entry(archive:Buffer,name:string) {
  const count=archive.readUInt32LE(8),base=16+count*256;
  for(let index=0;index<count;index++) {
    const start=16+index*256,length=archive[start]!;
    if(archive.subarray(start+1,start+1+length).toString()!==name)continue;
    const offset=archive.readUInt32LE(start+248),size=archive.readUInt32LE(start+252);
    return archive.subarray(base+offset,base+offset+size);
  }
  throw new Error(`Missing original HUD entry ${name}`);
}
async function original(name:string) {
  const source=originalAssets.find(asset=>asset[0]===name);if(!source)throw new Error(`Unpinned HUD source ${name}`);
  const target=new URL(`../.cache/references/${name}`,import.meta.url);
  let bytes:Buffer;
  try{bytes=await readFile(target);}catch(error){
    if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;
    // HUD uses a separate compiled skin module; fetch its independent immutable
    // reference if the general control-reference script has not cached it.
    const folder=name==='icons.png'?'gui':'ui';
    const response=await fetch(`https://raw.githubusercontent.com/Mojang/bedrock-samples/46ba6ea985fb5a92d79a9419198f10dda14c199d/resource_pack/textures/${folder}/${name}`);
    if(!response.ok)throw new Error(`Original HUD reference ${name}: HTTP ${response.status}`);
    bytes=Buffer.from(await response.arrayBuffer());
    expect(createHash('sha256').update(bytes).digest('hex'),name).toBe(source[1]);
    await mkdir(new URL('../.cache/references/',import.meta.url),{recursive:true});await writeFile(target,bytes);
  }
  expect(createHash('sha256').update(bytes).digest('hex'),name).toBe(source[1]);return bytes;
}

test('original HUD images keep independently pinned bytes and dimensions',async()=>{
  for(const [name,hash,width,height] of originalAssets) {
    const bytes=await original(name);expect(createHash('sha256').update(bytes).digest('hex'),name).toBe(hash);
    const image=PNG.sync.read(bytes);expect([image.width,image.height],name).toEqual([width,height]);
  }
});

test('native HUD definitions distinguish declared controls from hidden custom renderers',async()=>{
  const installation=process.env.MCBE_INSTALL_ROOT ?? 'C:/XboxGames/Minecraft for Windows/Content';
  const file=join(installation,'data/resource_packs/vanilla/__brarchive/ui.brarchive');
  test.skip(!existsSync(file),'Optional user-owned game archive is unavailable; native HUD definitions are not certified.');
  const archive=await readFile(file),hud=JSON.parse(entry(archive,'hud_screen.json').toString());
  for(const [name,renderer] of [['heart_renderer','heart_renderer'],['hunger_renderer','hunger_renderer'],['armor_renderer','armor_renderer'],['bubbles_renderer','bubbles_renderer']]) {
    expect(hud[name!]).toMatchObject({type:'custom',size:[1,1],renderer});
  }
  expect(hud.heart_image).toMatchObject({type:'image',texture:'textures/ui/heart_background',size:[9,9],alpha:.65});
  expect(hud.gui_hotbar_grid_item).toMatchObject({type:'panel',size:[20,22]});
  expect(hud.hotbar_slot_selected_image).toMatchObject({type:'image',texture:'textures/ui/selected_hotbar_slot',size:[24,24]});
  const parent=hud.gui_hotbar_grid_item.controls.find((control:Record<string,unknown>)=>'hotbar_parent' in control).hotbar_parent;
  expect(parent.size).toEqual([18,18]);expect(parent.controls[0]['item_icon@hotbar_hud_item_icon'].size).toEqual([16,16]);
  expect(hud.start_cap_image).toMatchObject({size:'$cap_image_size',alpha:.65,'$cap_image_size|default':[1,22]});
  expect(hud.full_progress_bar).toMatchObject({texture:'textures/ui/experiencebarfull',clip_direction:'left',clip_pixelperfect:false});
  expect(hud.progress_bar_nub).toMatchObject({texture:'textures/ui/experiencenub',tiled:'x'});
  expect(hud.progress_text_label).toMatchObject({shadow:true,color:'$experience_text_color',anchor_from:'top_middle',anchor_to:'bottom_middle'});
  expect(JSON.parse(entry(archive,'_global_variables.json').toString()).$experience_text_color).toEqual([.5,1,0]);
  expect(JSON.parse(entry(archive,'hud_crosshair_overlay.json').toString()).cursor_renderer).toMatchObject({type:'custom',size:[16,16],renderer:'cursor_renderer'});
  const textureArchive=await readFile(join(installation,'data/resource_packs/vanilla/__brarchive/textures/ui.brarchive'));
  expect(JSON.parse(entry(textureArchive,'experiencebarempty.json').toString())).toEqual({nineslice_size:[6,1,6,1],base_size:[13,5]});
  expect(JSON.parse(entry(textureArchive,'experiencebarfull.json').toString())).toEqual({nineslice_size:[1,0,1,0],base_size:[13,5]});
  const mapping=JSON.parse(await readFile(join(installation,'data/texture_backwards_compatibility_mapping.json'),'utf8'));
  expect(mapping['textures/ui/cross_hair']).toEqual({uv_size:[16,16],uv:[0,0],base_size:[256,256],back_compat_texture:'textures/gui/icons'});
  const material=await readFile(join(installation,'data/resource_packs/vanilla/materials/ui.material'),'utf8');
  expect(material).toMatch(/"ui_crosshair:ui_invert_overlay"\s*:\s*\{[\s\S]*?"fragmentShader"\s*:\s*"shaders\/texture\.fragment"/);
  expect(material).toMatch(/"ui_invert_overlay:ui_base"\s*:\s*\{\s*"blendSrc"\s*:\s*"OneMinusDestColor",\s*"blendDst"\s*:\s*"OneMinusSrcColor"/);
});

type Layer={file:string;x:number;y:number;width:number;height:number;opacity?:number;crop?:[number,number,number,number];slice?:[number,number,number,number];tiled?:boolean};
// Independent original-PNG compositor. Geometry, original nine regions and
// layer order are explicit; no production CSS/manifest is read. Chromium uses
// different 8-bit alpha paths for repeated background images and <img>. The XP
// path explicitly rounds premultiplied RGB; ordinary sprite images stay in the
// browser image path, and alpha caps use a separate original-PNG surface.
async function sourcePlane(page:Page,width:number,height:number,layers:Layer[],background='#28292a') {
  if(!layers.some(layer=>layer.slice)){
    const urls:Record<string,string>={};for(const layer of layers)urls[layer.file]=`data:image/png;base64,${(await original(layer.file)).toString('base64')}`;
    await page.evaluate(({width,height,layers,urls,background})=>{
      document.getElementById('independent-hud-plane')?.remove();const plane=document.createElement('div');plane.id='independent-hud-plane';Object.assign(plane.style,{position:'fixed',left:'416px',top:'16px',width:`${width}px`,height:`${height}px`,background,zIndex:'2147483647'});document.body.append(plane);
      for(const layer of layers){
        const viewport=document.createElement('div');Object.assign(viewport.style,{position:'absolute',left:`${layer.x}px`,top:`${layer.y}px`,width:`${layer.width}px`,height:`${layer.height}px`,overflow:'hidden'});plane.append(viewport);
        if(layer.opacity!==undefined){Object.assign(viewport.style,{backgroundImage:`url("${urls[layer.file]}")`,backgroundSize:`${layer.width}px ${layer.height}px`,opacity:String(layer.opacity)});}
        else{const img=document.createElement('img');img.src=urls[layer.file]!;Object.assign(img.style,{display:'block',width:`${layer.width}px`,height:`${layer.height}px`,maxWidth:'none',maxHeight:'none',imageRendering:'pixelated'});viewport.append(img);}
      }
    },{width,height,layers,urls,background});
    await page.evaluate(urls=>Promise.all(Object.values(urls).map(src=>{const image=new Image();image.src=src;return image.decode();})),urls);
    return page.locator('#independent-hud-plane');
  }
  const result=new PNG({width,height}),color=[1,3,5].map(start=>parseInt(background.slice(start,start+2),16));
  for(let pixel=0;pixel<width*height;pixel++)for(let channel=0;channel<4;channel++)result.data[pixel*4+channel]=channel===3?255:color[channel]!;
  const sample=(position:number,destination:number,source:number,leading:number,trailing:number)=>{
    if(position<leading*2)return Math.floor(position/2);
    if(position>=destination-trailing*2)return source-trailing+Math.floor((position-destination+trailing*2)/2);
    return leading+Math.floor((position-leading*2)*(source-leading-trailing)/(destination-leading*2-trailing*2));
  };
  for(const layer of layers){
    const image=PNG.sync.read(await original(layer.file));
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const localX=x-layer.x,localY=y-layer.y;if(localX<0||localY<0||localX>=layer.width||localY>=layer.height)continue;
      if(layer.crop&&(localX<layer.crop[0]||localY<layer.crop[1]||localX>=layer.crop[0]+layer.crop[2]||localY>=layer.crop[1]+layer.crop[3]))continue;
      const sourceX=layer.slice?sample(localX,layer.width,image.width,layer.slice[0],layer.slice[2]):layer.tiled?Math.floor(localX/2)%image.width:Math.floor(localX*image.width/layer.width);
      const sourceY=layer.slice?sample(localY,layer.height,image.height,layer.slice[1],layer.slice[3]):Math.floor(localY*image.height/layer.height);
      const input=(sourceY*image.width+sourceX)*4,output=(y*width+x)*4,alpha=Math.round(image.data[input+3]!*(layer.opacity??1));
      for(let channel=0;channel<3;channel++)result.data[output+channel]=Math.min(255,Math.round(Math.round(image.data[input+channel]!*alpha/255)+result.data[output+channel]!*(255-alpha)/255));
    }
  }
  const url=`data:image/png;base64,${PNG.sync.write(result).toString('base64')}`;
  await page.evaluate(({url,width,height})=>{
    document.getElementById('independent-hud-plane')?.remove();const plane=document.createElement('img');plane.id='independent-hud-plane';plane.src=url;
    Object.assign(plane.style,{position:'fixed',left:'416px',top:'16px',width:`${width}px`,height:`${height}px`,maxWidth:'none',maxHeight:'none',imageRendering:'pixelated',zIndex:'2147483647'});document.body.append(plane);
  },{url,width,height});
  await page.locator('#independent-hud-plane').evaluate(node=>(node as HTMLImageElement).decode());return page.locator('#independent-hud-plane');
}
async function open(page:Page){await page.goto('/calibration.html');await page.evaluate(()=>document.fonts.ready);await page.mouse.move(0,0);}
async function equalSource(page:Page,target:Locator,width:number,height:number,layers:Layer[],name:string){
  const bounds=await target.boundingBox();expect(bounds&&[bounds.width,bounds.height]).toEqual([width,height]);
  await target.evaluate(node=>Object.assign((node as HTMLElement).style,{position:'fixed',left:'16px',top:'16px',zIndex:'2147483646',backgroundColor:'#28292a'}));
  const expected=await sourcePlane(page,width,height,layers);await mkdir(new URL('../.cache/hud-independent-qa/',import.meta.url),{recursive:true});
  const actualImage=PNG.sync.read(await target.screenshot({path:fileURLToPath(new URL(`../.cache/hud-independent-qa/${name}-actual.png`,import.meta.url))})),expectedImage=PNG.sync.read(await expected.screenshot({path:fileURLToPath(new URL(`../.cache/hud-independent-qa/${name}-expected.png`,import.meta.url))}));
  expect([actualImage.width,actualImage.height]).toEqual([expectedImage.width,expectedImage.height]);let changed=0;for(let i=0;i<actualImage.data.length;i+=4)if([0,1,2,3].some(c=>actualImage.data[i+c]!==expectedImage.data[i+c]))changed++;expect(changed,'RGBA pixels differing from independently rendered original PNGs').toBe(0);
}

// These row/value mappings are this library's documented reconstruction profile.
// Source evidence proves original images, not native custom-renderer algorithms.
for(const kind of ['health','hunger','armor'] as const)for(const state of ['half','empty'] as const)test(`HUD ${kind} ${state} keeps original sprite RGBA in the reconstruction profile`,async({page})=>{
  await open(page);const row=page.locator(`[data-case="hud-${kind}"] .mc-hud-stat`);await expect(row).toHaveAttribute('data-fidelity','renderer-reconstruction');await expect(row).toHaveAttribute('aria-valuenow','1');await expect(row.locator('.mc-hud-stat__icon')).toHaveCount(10);
  const target=row.locator('.mc-hud-stat__icon').nth(state==='half'?0:1);await expect(target).toHaveAttribute('data-state',state);
  const background=kind==='health'?'heart_background.png':kind==='hunger'?'hunger_background.png':'armor_empty.png',half=kind==='health'?'heart_half.png':kind==='hunger'?'hunger_half.png':'armor_half.png';
  const layers:Layer[]=state==='empty'?[{file:background,x:0,y:0,width:18,height:18}]:[...(kind==='armor'?[]:[{file:background,x:0,y:0,width:18,height:18}]),{file:half,x:0,y:0,width:18,height:18}];
  await equalSource(page,target,18,18,layers,`${kind}-${state}`);
});
for(const[state,index,file]of [['full',0,'bubble.png'],['pop',1,'bubble_pop.png'],['empty',2,'bubble_empty.png']]as const)test(`HUD explicit air ${state} state uses its original image`,async({page})=>{
  await open(page);const row=page.locator('[data-case="hud-air"] .mc-hud-stat');await expect(row).toHaveAttribute('aria-valuenow','1');const target=row.locator('.mc-hud-stat__icon').nth(index);await expect(target).toHaveAttribute('data-state',state);await equalSource(page,target,18,18,[{file,x:0,y:0,width:18,height:18}],`air-${state}`);await expect(row.locator('.mc-hud-stat__icon').nth(3)).toHaveAttribute('data-state','hidden');
});

for(const progress of [0,.5,1])test(`HUD XP ${progress} uses original source slices and a separately tiled nub`,async({page})=>{
  await open(page);const target=page.locator(`[data-case="hud-xp-${progress*100}"] .mc-experience-bar`);await expect(target).toHaveAttribute('aria-valuenow',String(progress));
  await equalSource(page,target,364,10,[{file:'experiencebarempty.png',x:0,y:0,width:364,height:10,slice:[6,1,6,1]},{file:'experiencebarfull.png',x:0,y:0,width:364,height:10,slice:[1,0,1,0],crop:[0,0,364*progress,10]},{file:'experiencenub.png',x:10,y:0,width:344,height:10,tiled:true}],`xp-${progress*100}`);
});

test('HUD XP level retains the declared green, shadow and centered bottom anchor',async({page})=>{
  await open(page);const root=page.locator('[data-case="hud-xp-level"] .mc-experience-bar'),level=root.locator('.mc-experience-bar__level');await expect(level).toHaveText('30');await expect(level).toHaveCSS('color','rgb(128, 255, 0)');expect(await level.evaluate(node=>getComputedStyle(node).textShadow)).not.toBe('none');
  const frame=await root.boundingBox(),label=await level.boundingBox();if(!frame||!label)throw new Error('Missing original XP level anchor');expect(Math.abs(label.x+label.width/2-frame.x-frame.width/2)).toBeLessThanOrEqual(.02);expect(Math.abs(label.y+label.height-frame.y)).toBeLessThanOrEqual(.02);
});

test('HUD hotbar independently retains declared cell, selected, cap and inner geometry',async({page},testInfo)=>{
  await open(page);const target=page.locator('[data-case="hud-hotbar-empty"] .mc-hotbar'),frame=await target.boundingBox();expect(frame&&[frame.width,frame.height]).toEqual([364,44]);if(!frame)throw new Error('Missing hotbar');const cells=target.locator('.mc-hotbar__slot');await expect(cells).toHaveCount(9);
  for(let index=0;index<9;index++){
    const cell=await cells.nth(index).boundingBox(),inner=await cells.nth(index).locator('.mc-hotbar__inner').boundingBox();expect(cell&&[cell.x-frame.x,cell.y-frame.y,cell.width,cell.height]).toEqual([2+index*40,0,40,44]);expect(inner&&[inner.x-frame.x,inner.y-frame.y,inner.width,inner.height]).toEqual([4+index*40,4,36,36]);
  }
  const selected=await target.locator('.mc-hotbar__selected').boundingBox();expect(selected&&[selected.x-frame.x,selected.y-frame.y,selected.width,selected.height]).toEqual([-2,-2,48,48]);
  for(const side of ['start','end'])await expect(target.locator(`.mc-hotbar__cap--${side}`)).toHaveCSS('opacity','0.65');
  const path=fileURLToPath(new URL('../.cache/hud-independent-qa/hotbar-unmasked.png',import.meta.url));await mkdir(new URL('../.cache/hud-independent-qa/',import.meta.url),{recursive:true});await target.screenshot({path});await testInfo.attach('implementation-hotbar-not-native-reference',{path,contentType:'image/png'});
});

test('HUD hotbar source images compose with the selected frame above adjacent cells',async({page})=>{
  await open(page);const target=page.locator('[data-case="hud-hotbar-empty"] .mc-hotbar');
  const layers:Layer[]=[{file:'hotbar_start_cap.png',x:0,y:0,width:2,height:44,opacity:.65},...Array.from({length:9},(_,index)=>({file:`hotbar_${index}.png`,x:2+40*index,y:0,width:40,height:44})),{file:'hotbar_end_cap.png',x:362,y:0,width:2,height:44,opacity:.65},{file:'selected_hotbar_slot.png',x:-2,y:-2,width:48,height:48}];
  await equalSource(page,target,364,44,layers,'hotbar-scene');
});

test('HUD crosshair original atlas UV obeys native white-glyph inversion on an opaque surface',async({page})=>{
  await open(page);const target=page.locator('[data-case="hud-crosshair"] .mc-crosshair');
  await target.evaluate(node=>{const surface=document.createElement('div');Object.assign(surface.style,{position:'fixed',left:'16px',top:'16px',width:'32px',height:'32px',background:'#28292a',isolation:'isolate',zIndex:'2147483646'});node.parentElement!.append(surface);surface.append(node);});
  const bounds=await target.boundingBox();expect(bounds&&[bounds.width,bounds.height]).toEqual([32,32]);const actual=PNG.sync.read(await page.screenshot({clip:{x:16,y:16,width:32,height:32}})),atlas=PNG.sync.read(await original('icons.png'));let changed=0;
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
    const pixel=(y*32+x)*4,source=(Math.floor(y/2)*256+Math.floor(x/2))*4,white=atlas.data[source+3]===255;
    // Native blend: S*(1-D)+D*(1-S); source is binary white/transparent.
    for(let channel=0;channel<3;channel++)if(actual.data[pixel+channel]!== (white?255-(40+channel):40+channel))changed++;
    if(actual.data[pixel+3]!==255)changed++;
  }
  expect(changed,'Crosshair channels differing from independent native blend calculation').toBe(0);
});
