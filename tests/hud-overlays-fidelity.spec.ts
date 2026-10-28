import { expect,test } from '@playwright/test';
import type { Locator,Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

// Independent v1.26.60.5 full-release / installed 1.26.6005.0 source oracle.
// No production CSS, generated geometry/skin map or implementation screenshot
// supplies expected source dimensions, anchors, asset pixels or source hashes.
const sources=[
 ['EventBars.png','0e5073eec0623cb7b95244369e4b8cb2d2e8af8faebd49cc8db4d632ea6af348',16,16],
 ['absorption_effect.png','999b1e5b1b1e078da3e0beee70df09d306dcdf2bf38c613c826fb12d14759f48',18,18],
 ['bad_omen_effect.png','5b9875ac4ae397a5ceecd0c51197b66783fc8a9f8eb1051307799b6d488a2971',18,18],
 ['blindness_effect.png','7c6c0439d8b22be1bfd1f32a8b847bf11d2d37fc3fe04059a306b3855d11eafd',18,18],
 ['breath_of_the_nautilus_effect.png','6ae442eee73177d3ccb0c590c51956c85f50698137652f6b167cb9bacedbd772',18,18],
 ['conduit_power_effect.png','84394b8742afc7eaa179298e08f50504357a3393f69a4541e522fbda4ac83ba6',18,18],
 ['darkness_effect.png','509e860a6df7d2f35da4565f63a7855b4ee596254a8efc8d102bc0bbcb113104',18,18],
 ['fire_resistance_effect.png','305a1a3c759f33fe544e279af5ebc2c554ee208405ad8330093618968636c00d',18,18],
 ['haste_effect.png','e8658200c26e6645250f63f4ffe8a1326be4dc966d65db27df1e0d6b559d1f8d',18,18],
 ['health_boost_effect.png','b6579b7182ca6479499781214641f6ec476cb9cd926c7dc235e72ae659325a86',18,18],
 ['hunger_effect.png','c02de265b1a75993681abace07cd49bf45563952e59e37b99f160746ce7dbabe',18,18],
 ['infested_effect.png','01752beae8dc933ae8ad96d7bf241e28ef36476110defdf5bc845bc619ce5191',18,18],
 ['invisibility_effect.png','4e25a02e0163a57d7fc32eb6d9b6e3003c23bc153172573efedd247467927d49',18,18],
 ['jump_boost_effect.png','4c184ca78d1ccbfde5b61b182baed9f02b1ce1bc395afcb17cb8bb8268c4cd9d',18,18],
 ['levitation_effect.png','802b2dce33db91ba549cd71bdb782cd328f19f9e9249d6a04cb45a24aa0d3f8a',18,18],
 ['mining_fatigue_effect.png','cabd7bdccacb775155754f7c26acc1fc6055fbaacac3da668a52e0553e5d3eb0',18,18],
 ['nausea_effect.png','18127991ab91a6fec51664ef07163fb0d43b79972b1e2910e04fb89b748209bd',18,18],
 ['night_vision_effect.png','3921dfda6e0b344353e485e1bf310721562a7f1912b7f0a9630b27e32d1687b2',18,18],
 ['oozing_effect.png','d6b63592ea9df728c636ed2569dcea5beac40464b46427ecd1185a813488b238',18,18],
 ['raid_omen_effect.png','d3e0ce680dac5d69d547d52d738a7b9b574b64442c40f3c71dfa8024a7ddeb5d',18,18],
 ['regeneration_effect.png','673e5c6df2136a9e3236bc6ce59d6e5a282f8353a32bdc580a79acd64d2cce5b',18,18],
 ['resistance_effect.png','6aec7580f9d0a82dd12637a8342307aed1dd17c4059e4e89cf1b95316c036131',18,18],
 ['slow_falling_effect.png','59c40e663e3a8ad6dac3e66b77d07627bec7922012768b28877c387fc596691d',18,18],
 ['slowness_effect.png','74d21962cbee6b7d55da3eb858f466e258f86c762253680995ccab82d6a00078',18,18],
 ['trial_omen_effect.png','6de4961462dd57b48d528ac128ad45680aa60362554f0b48281334f5027137e3',18,18],
 ['village_hero_effect.png','6804c499675f3a935d3468baa57a7e57086e4c162c133f155728885f4ab72dc2',18,18],
 ['water_breathing_effect.png','4873dd7273d3cac93074c93622910924460d6a7cb488b789bb95884a573e87ac',18,18],
 ['weakness_effect.png','a33be0b579901d1aafe112781aa7206f5f4c8107b98a4b6b8d5a01294db779b0',18,18],
 ['weaving_effect.png','7911913437cedac9da80d8f3e47f071a3eebd6b66cb277776aaefa35404979ec',18,18],
 ['wind_charged_effect.png','f0f057f8f7c94223a984da1f8b0b5b61eeb16b02df241537f1984ac7dd6c8e12',18,18],
 ['Black.png','492d761d357b4fbdd29d0bc7a06a6423b5b0842d47c2d069ca90a9746ff5117e',2,2],
 ['empty_progress_bar.png','747ece8f4372304e3a8e90101db00b1e6a65289dc2bed7e48cc2bf549b803894',13,5],
 ['filled_progress_bar.png','c2c57b072ae406d89986240cc2e36ee5bc971724e0c56d836373b34f3c7e237a',13,5],
 ['hud_tip_text_background.png','8bcad4aa663cdcf3cbfe93acd5c8ba2c4ab5c18032b2f053fea5ebd907c700cf',6,6],
 ['hud_mob_effect_background.png','d3af5654fbe5d2d1b0f32a69d93eb83b62b59a4185f60aad411faa507e57c8d4',24,24],
 ['hud_mob_ambient_effect_background.png','d6a726643bf403c53982ab705f77b144209509492d8704466a2bcb6833b09f31',24,24],
 ['speed_effect.png','91128dc77c33d4694a8912eaddda92bbb119f9cc2e07dbc6245bdb40bbb4b7f8',18,18],
 ['strength_effect.png','a009fb12ed3db82ac1afff6512d64b64e89a76079ea062b1b9829b89d288f011',18,18],
 ['poison_effect.png','35e01fa415fb6f2138c881af6dde8d7185fbe927c9342956f70e501756503600',18,18],
 ['wither_effect.png','6d4b9109b9d63124aa719fc2c4b96343c2dd95c5771a88a179a36cb2d6f7950a',18,18],
]as const;
const output=new URL('../.cache/hud-overlays-qa-output/',import.meta.url);
async function original(name:string){
 const source=sources.find(source=>source[0]===name);if(!source)throw new Error(`Unpinned independent overlay source ${name}`);let bytes:Buffer;
 try{bytes=await readFile(new URL(name,output));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;const folder=name==='EventBars.png'?'gui/newgui':'ui',response=await fetch(`https://raw.githubusercontent.com/Mojang/bedrock-samples/46ba6ea985fb5a92d79a9419198f10dda14c199d/resource_pack/textures/${folder}/${name}`);if(!response.ok)throw new Error(`Independent overlay source ${name}: HTTP ${response.status}`);bytes=Buffer.from(await response.arrayBuffer());await mkdir(output,{recursive:true});await writeFile(new URL(name,output),bytes);}
 expect(createHash('sha256').update(bytes).digest('hex'),name).toBe(source[1]);return bytes;
}
function archived(archive:Buffer,name:string){const count=archive.readUInt32LE(8),base=16+count*256;for(let index=0;index<count;index++){const row=16+index*256;if(archive.toString('utf8',row+1,row+1+archive[row]!)!==name)continue;const offset=archive.readUInt32LE(row+248),size=archive.readUInt32LE(row+252);return archive.subarray(base+offset,base+offset+size);}throw new Error(`Missing original ${name}`);}
function json(archive:Buffer,name:string){return JSON.parse(archived(archive,name).toString());}
function child(control:any,name:string){const result=control.controls?.find((item:Record<string,unknown>)=>name in item)?.[name];if(!result)throw new Error(`Missing source child ${name}`);return result;}

test('overlay source images retain independently pinned dimensions and hashes',async()=>{for(const[name,hash,width,height]of sources){const bytes=await original(name);expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash);const image=PNG.sync.read(bytes);expect([image.width,image.height],name).toEqual([width,height]);}});
test('original native overlay declarations distinguish source geometry from runtime renderer policy',async()=>{
 const installation=process.env.MCBE_INSTALL_ROOT??'C:/XboxGames/Minecraft for Windows/Content',path=join(installation,'data/resource_packs/vanilla/__brarchive/ui.brarchive');test.skip(!existsSync(path),'Optional source declaration check needs a matching user-owned installation.');const archive=await readFile(path),hud=json(archive,'hud_screen.json'),common=json(archive,'ui_common.json'),score=json(archive,'scoreboards.json'),globals=json(archive,'_global_variables.json');
 expect(hud.boss_health_panel).toMatchObject({size:[182,20],anchor_from:'top_middle',anchor_to:'top_middle'});expect(common.progress_bar).toMatchObject({size:[182,5],offset:[0,20]});expect(child(hud.boss_health_panel,'progress_bar_for_collections@common.progress_bar_for_collections').offset).toEqual([0,10]);expect(child(hud.boss_name_panel,'boss_name')).toMatchObject({shadow:true,color:'$boss_name_text_color'});expect(common['filled_progress_bar_for_collections@filled_progress_bar'].clip_pixelperfect).toBe(false);
 expect(hud.chat_label).toMatchObject({shadow:true,color:'$chat_text_color',font_type:'$chat_font_type',font_scale_factor:'$chat_font_scale_factor',line_padding:'$chat_line_spacing'});expect(hud.chat_grid_item.size).toEqual(['100%-2px','100%c']);const chatBackground=child(hud.chat_grid_item,'chat_background');expect(chatBackground).toMatchObject({texture:'textures/ui/Black',alpha:'$chat_background_opacity'});expect(child(chatBackground,'chat_text@chat_label')).toMatchObject({offset:[2,0],size:['100% - 5px','default']});expect(child(hud.chat_panel,'stack_panel').factory.max_children_size).toBe(50);expect(hud.chat_panel.max_size).toEqual(['100%','50%']);
 expect(score.scoreboard_sidebar_player.max_size).toEqual([100,10]);expect(score.scoreboard_sidebar_score).toMatchObject({size:['default',10],color:'$player_score_color',locked_alpha:1});expect(score.scoreboard_sidebar_player.shadow).toBeUndefined();expect(score.scoreboard_sidebar_score.shadow).toBeUndefined();const main=child(score.scoreboard_sidebar,'main');expect(main.size).toEqual(['100%cm + 4px','100%c']);expect(child(main,'displayed_objective').max_size).toEqual([170,10]);expect(child(child(main,'lists'),'horizontal_padding').size).toEqual([10,'100%c']);expect(child(score.scoreboard_sidebar,'displayed_objective_background').size).toEqual(['100%sm',9]);
 expect(hud.mob_effects_renderer).toMatchObject({type:'custom',renderer:'mob_effects_renderer'});expect(hud.mob_effects_renderer.size).toBeUndefined();
 expect(hud.hud_actionbar_text).toMatchObject({texture:'textures/ui/hud_tip_text_background',size:['100%c + 12px','100%c + 5px'],offset:[0,'50%-68px']});expect(child(hud.hud_actionbar_text,'actionbar_message')).toMatchObject({shadow:true,anchor_from:'center',anchor_to:'center'});
 const label=child(child(child(hud.item_name_text_root,'item_text_aligner'),'item_text_control'),'item_text_label');expect(label).toMatchObject({max_size:[200,'default'],text_alignment:'center',shadow:true});expect(hud.item_name_text_root).toMatchObject({anchor_from:'bottom_middle',anchor_to:'bottom_middle','$show_text_background|default':false});
 expect(hud.hud_title_text).toMatchObject({offset:[0,-19],propagate_alpha:true});const title=child(hud.hud_title_text,'title_frame'),subtitle=child(hud.hud_title_text,'subtitle_frame');expect(child(title,'title')).toMatchObject({font_size:'extra_large',offset:[0,6],shadow:'$show_shadow'});expect(child(subtitle,'subtitle')).toMatchObject({font_size:'large',offset:[1,19]});expect(child(subtitle,'subtitle_background').offset).toEqual([0,16]);
 for(const variable of ['$boss_name_text_color','$tool_tip_text','$title_command_text_color','$chat_text_color'])expect(globals[variable]).toEqual([1,1,1]);expect(globals.$player_score_color).toEqual([1,0,0,1]);
 const textureArchive=await readFile(join(installation,'data/resource_packs/vanilla/__brarchive/textures/ui.brarchive'));for(const file of ['empty_progress_bar.json','filled_progress_bar.json'])expect(json(textureArchive,file)).toEqual({nineslice_size:[4,0,4,0],base_size:[13,5]});expect(json(textureArchive,'hud_tip_text_background.json')).toEqual({nineslice_size:[2,2,2,2],base_size:[6,6]});
 const mapping=JSON.parse(await readFile(join(installation,'data/texture_backwards_compatibility_mapping.json'),'utf8'));
 expect(mapping['textures/ui/empty_progress_bar']).toEqual({uv_size:[13,5],uv:[0,0],base_size:[16,16],back_compat_texture:'textures/gui/newgui/EventBars'});expect(mapping['textures/ui/filled_progress_bar']).toEqual({uv_size:[13,5],uv:[0,5],base_size:[16,16],back_compat_texture:'textures/gui/newgui/EventBars'});
 expect(mapping['textures/ui/speed_effect']).toEqual({uv_size:[18,18],uv:[0,184],base_size:[256,256],back_compat_texture:'textures/gui/gui'});expect(mapping['textures/ui/poison_effect']).toEqual({uv_size:[18,18],uv:[108,184],base_size:[256,256],back_compat_texture:'textures/gui/gui'});expect(mapping['textures/ui/hud_mob_effect_background'].uv_size).toEqual([22,22]);
 const atlas=PNG.sync.read(await original('EventBars.png'));for(const[file,offsetY]of [['empty_progress_bar.png',0],['filled_progress_bar.png',5]]as const){const image=PNG.sync.read(await original(file));for(let y=0;y<5;y++)for(let x=0;x<13;x++){const from=((y+offsetY)*16+x)*4,to=(y*13+x)*4;expect([...atlas.data.subarray(from,from+4)]).toEqual([...image.data.subarray(to,to+4)]);}}
});

// Browser cases are added against the independently frozen public fixture/API.
type ReferenceKind='boss'|'chat'|'scoreboard'|'action'|'held'|'title';
async function open(page:Page){await page.goto('/calibration.html');await page.evaluate(()=>document.fonts.ready);await page.mouse.move(0,0);}
async function reference(page:Page,kind:ReferenceKind,options:{progress?:number;magenta?:boolean;opacity?:number;plain?:boolean;noShadow?:boolean;wrap?:boolean}={}){
 const urls:Record<string,string>={};for(const file of ['Black.png','empty_progress_bar.png','filled_progress_bar.png','hud_tip_text_background.png']){
  let bytes=await original(file);if(options.magenta&&file==='filled_progress_bar.png'){const image=PNG.sync.read(bytes);for(let offset=0;offset<image.data.length;offset+=4)image.data[offset+1]=0;bytes=PNG.sync.write(image);}urls[file]=`data:image/png;base64,${bytes.toString('base64')}`;
 }
 await page.evaluate(({kind,options,urls})=>{
  document.getElementById('independent-overlay-reference')?.remove();const root=document.createElement('div');root.id='independent-overlay-reference';Object.assign(root.style,{position:'fixed',left:'640px',top:'16px',zIndex:'2147483647',font:"400 20px/20px 'Mojangles Pixel','MCBE Pixel',monospace",color:'#fff',boxSizing:'border-box',background:'#28292a'});document.body.append(root);
  const text=(value:string,parent:HTMLElement,style:Partial<CSSStyleDeclaration>={},shadow=true)=>{const node=document.createElement('span');node.textContent=value;Object.assign(node.style,{display:'block',position:'relative',font:"400 20px/20px 'Mojangles Pixel','MCBE Pixel',monospace",color:'#fff',whiteSpace:'pre-wrap',overflowWrap:'anywhere',textShadow:shadow?'2px 2px #3f3f3f':'none',...style});parent.append(node);return node;};
  const background=(parent:HTMLElement,style:Partial<CSSStyleDeclaration>={},tip=false)=>{const node=document.createElement('div');Object.assign(node.style,{position:'absolute',inset:'0',boxSizing:'border-box',opacity:String(options.opacity??.5),pointerEvents:'none',...(tip?{border:'4px solid transparent',borderImage:`url("${urls['hud_tip_text_background.png']}") 2 fill / 4px stretch`,imageRendering:'pixelated'}:{backgroundImage:`url("${urls['Black.png']}")`,backgroundSize:'4px 4px'}),...style});parent.append(node);return node;};
  if(kind==='boss'){
   Object.assign(root.style,{width:'364px',height:'40px'});text('Minecraft',root,{textAlign:'center',whiteSpace:'nowrap'});const track=document.createElement('div');Object.assign(track.style,{position:'absolute',left:'0',top:'20px',width:'364px',height:'10px'});root.append(track);
   const bar=(file:string,parent:HTMLElement)=>{const node=document.createElement('div');Object.assign(node.style,{position:'absolute',left:'0',top:'0',width:'364px',height:'10px',boxSizing:'border-box',border:'solid transparent',borderWidth:'0 8px',borderImage:`url("${urls[file]}") 0 4 0 4 fill / 0 8px stretch`,imageRendering:'pixelated'});parent.append(node);return node;};bar('empty_progress_bar.png',track);const clip=document.createElement('div');Object.assign(clip.style,{position:'absolute',left:'0',top:'0',height:'10px',width:`${364*(options.progress??0)}px`,overflow:'hidden'});track.append(clip);bar('filled_progress_bar.png',clip);
  }else if(kind==='chat'){
   Object.assign(root.style,{width:options.wrap?'196px':'316px'});background(root);text(options.wrap?'Minecraft Minecraft Minecraft Minecraft':'Minecraft',root,{marginLeft:'4px',width:'calc(100% - 10px)'});
  }else if(kind==='action'||kind==='held'){
   Object.assign(root.style,{display:'inline-block',maxWidth:'600px',padding:kind==='held'&&options.plain?'0':'5px 12px',textAlign:'center'});if(!options.plain)background(root,{},true);text(options.wrap?'Minecraft Minecraft Minecraft Minecraft Minecraft Minecraft':'Minecraft',root,kind==='held'?{maxWidth:'400px'}:{});
  }else if(kind==='scoreboard'){
   Object.assign(root.style,{display:'inline-grid',width:'max-content',padding:'0 4px'});background(root);background(root,{height:'18px',bottom:'auto'});const title=document.createElement('div');Object.assign(title.style,{position:'relative',height:'20px',textAlign:'center',maxWidth:'340px',whiteSpace:'nowrap'});root.append(title);text('Minecraft',title,{},false);const body=document.createElement('div');Object.assign(body.style,{display:'grid',position:'relative',gridTemplateColumns:'max-content max-content',columnGap:'20px',gridAutoRows:'20px'});root.append(body);for(const[name,score]of [['Steve','30'],['Alex','7']]){text(name!,body,{maxWidth:'200px',whiteSpace:'nowrap'},false);text(score!,body,{color:'#f00',textAlign:'right',whiteSpace:'nowrap'},false);}
  }else{
   Object.assign(root.style,{display:'inline-flex',flexDirection:'column',alignItems:'center',padding:'6px 30px 38px',textAlign:'center',maxWidth:'600px'});const frame=(subtitle:boolean)=>{const holder=document.createElement('div');Object.assign(holder.style,{position:'relative',maxWidth:'100%'});root.append(holder);if(!options.plain)background(holder,subtitle?{inset:'-5px -20px',transform:'translateY(32px)'}:{inset:'-6px -30px'},true);text('Minecraft',holder,subtitle?{fontSize:'40px',lineHeight:'48px',textShadow:options.noShadow?'none':'4px 4px #3f3f3f',transform:'translate(2px,38px)'}:{fontSize:'60px',lineHeight:'72px',textShadow:options.noShadow?'none':'6px 6px #3f3f3f',transform:'translateY(12px)'},!options.noShadow);};frame(false);frame(true);
  }
 },{kind,options,urls});
 await page.evaluate(urls=>Promise.all(Object.values(urls).map(src=>{const image=new Image();image.src=src;return image.decode();})),urls);return page.locator('#independent-overlay-reference');
}
async function compareComplete(target:Locator,expected:Locator,name:string){
 const originalBounds=await target.boundingBox();if(!originalBounds)throw new Error('Missing original complete overlay bounds');
 // Keep the original containing-block size when placing a full specimen on an
 // integer comparison plane; a fixed percentage width must not become viewport width.
 await target.evaluate((node,bounds)=>Object.assign((node as HTMLElement).style,{position:'fixed',left:'16px',top:'16px',width:`${bounds.width}px`,height:`${bounds.height}px`,maxWidth:'none',zIndex:'2147483646',backgroundColor:'#28292a'}),originalBounds);const a=await target.boundingBox(),e=await expected.boundingBox();if(!a||!e)throw new Error('Missing complete overlay comparison');expect(Math.abs(a.width-e.width)).toBeLessThanOrEqual(.02);expect(Math.abs(a.height-e.height)).toBeLessThanOrEqual(.02);await mkdir(output,{recursive:true});
 const actual=PNG.sync.read(await target.screenshot({path:fileURLToPath(new URL(`${name}-actual.png`,output))})),source=PNG.sync.read(await expected.screenshot({path:fileURLToPath(new URL(`${name}-expected.png`,output))}));expect([actual.width,actual.height]).toEqual([source.width,source.height]);let changed=0;for(let offset=0;offset<actual.data.length;offset+=4)if([0,1,2,3].some(channel=>actual.data[offset+channel]!==source.data[offset+channel]))changed++;expect(changed,'Complete unmasked overlay RGBA pixels differing from independent source/profile reference').toBe(0);
}
for(const progress of [0,.5,1])test(`complete boss ${progress} retains source name, track, nine slices and clipping`,async({page})=>{await open(page);const target=page.locator(`[data-case="overlay-boss-${progress*100}"] .mc-boss-bar`);await expect(target).toHaveAttribute('aria-valuenow',String(progress));await compareComplete(target,await reference(page,'boss',{progress}),`boss-${progress*100}`);});
for(const[fixture,kind,options]of [
 ['chat-message','chat',{}],['chat-opaque','chat',{opacity:1}],['chat-wrap','chat',{wrap:true}],
 ['scoreboard','scoreboard',{}],['action','action',{}],['action-opaque','action',{opacity:1}],['action-plain','action',{plain:true}],
 ['held','held',{}],['held-plain','held',{plain:true}],['held-long','held',{wrap:true}],
 ['title','title',{}],['title-plain','title',{plain:true}],['title-no-shadow','title',{noShadow:true}],
]as const)test(`complete ${fixture} preserves unmasked text, original background and source/profile geometry`,async({page})=>{
 await open(page);const cls=kind==='chat'?'chat-message':kind==='held'?'held-item-tooltip':kind==='action'?'action-bar':kind==='title'?'title-overlay':kind;await compareComplete(page.locator(`[data-case="overlay-${fixture}"] .mc-${cls}`),await reference(page,kind,options),fixture);
});
test('boss bar color multiplies only original full-bar RGB without recoloring the empty source',async({page})=>{await open(page);await compareComplete(page.locator('[data-case="overlay-boss-magenta"] .mc-boss-bar'),await reference(page,'boss',{progress:.5,magenta:true}),'boss-magenta');});
for(const[fixture,backgroundFile,iconFile]of [['speed','hud_mob_effect_background.png','speed_effect.png'],['ambient','hud_mob_ambient_effect_background.png','speed_effect.png'],['poison','hud_mob_effect_background.png','poison_effect.png']]as const)test(`complete status effect ${fixture} keeps original background and icon at reconstruction bounds`,async({page})=>{
 await open(page);const target=page.locator(`[data-case="overlay-effect-${fixture}"] .mc-status-effect`);await expect(target).toHaveAttribute('data-fidelity','renderer-reconstruction');await expect(target).toHaveText('');const frame=await target.boundingBox(),icon=await target.locator('.mc-status-effect__icon').boundingBox();if(!frame||!icon)throw new Error('Missing status glyph');expect([frame.width,frame.height,icon.x-frame.x,icon.y-frame.y,icon.width,icon.height]).toEqual([48,48,6,6,36,36]);
 const urls=[backgroundFile,iconFile].map(async file=>`data:image/png;base64,${(await original(file)).toString('base64')}`),[bg,img]=await Promise.all(urls);
 await page.evaluate(({bg,img})=>{document.getElementById('independent-overlay-reference')?.remove();const root=document.createElement('div');root.id='independent-overlay-reference';Object.assign(root.style,{position:'fixed',left:'640px',top:'16px',width:'48px',height:'48px',background:'#28292a',zIndex:'2147483647'});document.body.append(root);for(const[url,size,inset]of [[bg,48,0],[img,36,6]]as const){const image=document.createElement('img');image.src=url!;Object.assign(image.style,{position:'absolute',left:`${inset}px`,top:`${inset}px`,width:`${size}px`,height:`${size}px`,maxWidth:'none',maxHeight:'none',imageRendering:'pixelated'});root.append(image);}},{bg,img});await page.locator('#independent-overlay-reference img').evaluateAll(nodes=>Promise.all(nodes.map(node=>(node as HTMLImageElement).decode())));await compareComplete(target,page.locator('#independent-overlay-reference'),`effect-${fixture}`);
});
test('optional native font source and advance metric are independently identified',async({page})=>{
 const path=join(process.env.MCBE_INSTALL_ROOT??'C:/XboxGames/Minecraft for Windows/Content','data/fonts/Mojangles.ttf');test.skip(!existsSync(path),'Native font identification requires the user-owned original font.');expect(createHash('sha256').update(await readFile(path)).digest('hex')).toBe('3d4cdf2752075d28c6ebf0ba44a61157ec6eb38f8db0ebdc3205aec056760be5');await open(page);const loaded=await page.evaluate(()=>Array.from(document.fonts).some(face=>face.family.replaceAll(/['"]/g,'')==='Mojangles Pixel'&&face.status==='loaded'));test.skip(!loaded,'The local native-derived font face is not active; do not certify fallback metrics.');const width=await page.evaluate(()=>{const context=document.createElement('canvas').getContext('2d')!;context.font="18px 'Mojangles Pixel'";return context.measureText('Minecraft').width;});expect(Math.abs(width-86.4),'Independent original cmap/hmtx: 4800 units at 18/1000').toBeLessThanOrEqual(.02);
});
test('long scoreboard labels keep original source maxima and twenty-pixel rows',async({page})=>{
 await open(page);const root=page.locator('[data-case="overlay-scoreboard-long"] .mc-scoreboard'),title=await root.locator('.mc-scoreboard__title').boundingBox(),name=await root.locator('.mc-scoreboard__name').boundingBox(),row=await root.locator('.mc-scoreboard__row').boundingBox(),frame=await root.boundingBox(),list=await root.locator('.mc-scoreboard__list').boundingBox(),titleBackground=await root.locator('.mc-scoreboard__title-background').boundingBox();if(!title||!name||!row||!frame||!list||!titleBackground)throw new Error('Missing complete scoreboard geometry');expect(title.width).toBeLessThanOrEqual(340);expect(name.width).toBeLessThanOrEqual(200);expect(row.height).toBe(20);expect(list.y-frame.y).toBe(20);expect(titleBackground.height).toBe(18);expect(Math.abs(titleBackground.width-frame.width)).toBeLessThanOrEqual(.02);
});
test('ignored held-item background contributes no intrinsic size while actionbar image retains its extent',async({page})=>{
 await open(page);for(const[fixture,cls,width,height]of [['held-plain','held-item-tooltip',96,20],['held','held-item-tooltip',120,30],['action-plain','action-bar',120,30]]as const){const actual=await page.locator(`[data-case="overlay-${fixture}"] .mc-${cls}`).boundingBox();expect(actual&&[actual.width,actual.height],fixture).toEqual([width,height]);}
});
test('plain held-item comparison includes the shadow ink extending beyond intrinsic text bounds',async({page})=>{
 await open(page);const target=page.locator('[data-case="overlay-held-plain"] .mc-held-item-tooltip'),expected=await reference(page,'held',{plain:true});await target.evaluate(node=>Object.assign((node as HTMLElement).style,{position:'fixed',left:'16px',top:'16px',width:'96px',height:'20px',zIndex:'2147483646',backgroundColor:'#28292a'}));
 await page.evaluate(()=>{for(const left of [8,632]){const plane=document.createElement('div');plane.className='overlay-shadow-reference-backdrop';Object.assign(plane.style,{position:'fixed',left:`${left}px`,top:'8px',width:'112px',height:'36px',background:'#28292a',zIndex:'2147483645'});document.body.append(plane);}});
 const expectedBounds=await expected.boundingBox();expect(expectedBounds&&[expectedBounds.width,expectedBounds.height]).toEqual([96,20]);await mkdir(output,{recursive:true});const actual=PNG.sync.read(await page.screenshot({clip:{x:8,y:8,width:112,height:36},path:fileURLToPath(new URL('held-plain-shadow-halo-actual.png',output))})),source=PNG.sync.read(await page.screenshot({clip:{x:632,y:8,width:112,height:36},path:fileURLToPath(new URL('held-plain-shadow-halo-expected.png',output))}));let changed=0;for(let offset=0;offset<actual.data.length;offset++)if(actual.data[offset]!==source.data[offset])changed++;expect(changed,'Uncropped foreground and shadow channels including the complete outer halo').toBe(0);
});
