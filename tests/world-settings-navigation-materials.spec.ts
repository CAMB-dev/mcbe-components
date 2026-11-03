import{test,expect}from'@playwright/test';import type{Page,Locator,TestInfo}from'@playwright/test';import{PNG}from'pngjs';import{readFile}from'node:fs/promises';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';
const loadingOriginal=execFileSync('python',['-c','from zipfile import ZipFile; import sys; sys.stdout.buffer.write(ZipFile(sys.argv[1]).read(sys.argv[2]))',fileURLToPath(new URL('../.cache/references/bedrock-samples-v1.26.60.5-full.zip',import.meta.url)),'resource_pack/textures/ui/loading_bar.png']);
expect(createHash('sha256').update(loadingOriginal).digest('hex')).toBe('703e02f1e7013d642a81225b98bf08f1bdfc69e003b0b7d4a6132635da747aef');
const background=[49,50,51,255];
async function open(page:Page,scale:number,patch:Record<string,unknown>={}){await page.goto('/demo/world-settings-fixture.html');await page.locator('.mc-settings-frame').waitFor();await page.evaluate(p=>(window as any).worldFixture.configure({screen:'navigation',width:190,scale:p.scale,context:{educationEdition:true,publish:false},...p.patch}),{scale,patch});await page.addStyleTag({content:'.mc-settings-navigation-section__paint{visibility:hidden!important}'});await page.locator('#before').focus();await page.mouse.move(0,0);}
async function compare(page:Page,target:Locator,file:string,info:TestInfo,frame?:number,cuts?:readonly[number,number,number,number]){
 await expect(target).toBeVisible();await page.waitForFunction(()=>Array.from(document.images).every(image=>image.complete&&image.naturalWidth>0));const rect=(await target.boundingBox())!,x0=Math.floor(rect.x),y0=Math.floor(rect.y),width=Math.ceil(rect.x+rect.width)-x0,height=Math.ceil(rect.y+rect.height)-y0;
 const source=PNG.sync.read(file==='progress/ui/loading_bar.png'?loadingOriginal:await readFile(new URL('../src/assets/'+file,import.meta.url))),full=PNG.sync.read(await page.screenshot()),actual=new PNG({width,height}),expected=new PNG({width,height});let different=0,maxDifference=0;
 const slice=(at:number,extent:number,physical:number,before:number,after:number)=>at<before?Math.floor(at):at>=extent-after?physical-after+Math.floor(at-(extent-after)):before+Math.floor((at-before)*(physical-before-after)/(extent-before-after));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const px=x0+x+.5,py=y0+y+.5,inside=px>=rect.x&&py>=rect.y&&px<rect.x+rect.width&&py<rect.y+rect.height,dst=(y*width+x)*4,src=((y0+y)*full.width+x0+x)*4;
  for(let c=0;c<4;c++)actual.data[dst+c]=full.data[src+c]!;
  let values=background;
  if(inside){const dx=px-rect.x,dy=py-rect.y,scale=rect.width/(cuts?190:frame===undefined?rect.width:21),sx=frame===undefined?(cuts?slice(dx/scale,rect.width/scale,source.width,cuts[0],cuts[2]):Math.floor(dx/rect.width*source.width)):frame*64+Math.floor(dx/rect.width*64),sy=cuts?slice(dy/scale,rect.height/scale,source.height,cuts[1],cuts[3]):Math.floor(dy/rect.height*source.height),at=(Math.min(source.height-1,sy)*source.width+Math.min(source.width-1,sx))*4,a=source.data[at+3]!/255;values=background.slice(0,3).map((v,c)=>Math.round(source.data[at+c]!*a+v*(1-a))).concat(255);}
  for(let c=0;c<4;c++){expected.data[dst+c]=values[c]!;maxDifference=Math.max(maxDifference,Math.abs(actual.data[dst+c]!-values[c]!));}
  if(values.some((v,c)=>v!==actual.data[dst+c]))different++;
 }
 await info.attach('whole-plane.json',{body:JSON.stringify({file,rect,width,height,frame,different,maxDifference,pointRasterPolicy:'explicit pixel-centre top-left-inclusive quad; no native proof'}),contentType:'application/json'});
 if(different){await info.attach('actual.png',{body:PNG.sync.write(actual),contentType:'image/png'});await info.attach('expected.png',{body:PNG.sync.write(expected),contentType:'image/png'});}
 expect(different).toBe(0);
}
const cases=[
 ['game_button','color','gui-icons/controller-glyph-color.png'],['game_button','outline','gui-icons/controller-glyph.png'],
 ['switch_game_button','color','world-navigation/controller_glyph_color_switch.png'],['switch_game_button','outline','world-navigation/controller_glyph_switch.png'],
 ['multiplayer_button','color','gui-icons/multiplayer-glyph-color.png'],['multiplayer_button','outline','gui-icons/multiplayer-glyph.png'],
 ['classroom_button','color','world-navigation/bookshelf_flat.png'],['classroom_button','outline','world-navigation/bookshelf_flat_border.png'],
 ['debug_button','color','world-navigation/debug_glyph_color.png'],['debug_button','outline','world-navigation/debug_glyph.png']
]as const;
for(const scale of[1,2]){
 for(const[id,kind,file]of cases)test(`GUI${scale} complete source ${id} ${kind} plane`,async({page},info)=>{
  await open(page,scale,{context:{nxOs:id==='switch_game_button',educationEdition:id!=='multiplayer_button',publish:false}});const button=page.locator('[data-settings-navigation-id='+id+']');await button.hover();await page.addStyleTag({content:`.mc-settings-navigation-section__${kind==='color'?'outline':'color'}-glyph{visibility:hidden!important}`});await compare(page,button.locator('.mc-settings-navigation-section__'+kind+'-glyph'),file,info);
 });
 for(const frame of[0,4,9])test(`GUI${scale} original loading64x8 UV frame${frame} in actual21x14 control`,async({page},info)=>{
  await open(page,scale,{context:{pregame:false,educationEdition:false},serverVisible:true,serverIcon:'loading',loadingFrame:frame});const button=page.locator('[data-settings-navigation-id=server_settings_button]');await button.hover();await compare(page,button.locator('.mc-world-navigation__loading'),'progress/ui/loading_bar.png',info,frame);
 });
 test(`GUI${scale} explicit caller White17x17 border plane`,async({page},info)=>{
  await open(page,scale);const button=page.locator('[data-settings-navigation-id=level_texture_pack_button]');await button.hover();await page.addStyleTag({content:'.mc-world-navigation__cycling{visibility:hidden!important}'});await compare(page,button.locator('.mc-world-navigation__pack-border'),'document-viewer/permissions_player_fade_overlay.png',info);
 });
 test(`GUI${scale} actual provider icon15x15 whole plane`,async({page},info)=>{
  await open(page,scale);const button=page.locator('[data-settings-navigation-id=level_texture_pack_button]');await button.hover();await page.addStyleTag({content:'.mc-world-navigation__pack-border{visibility:hidden!important}'});
  // The demo-only missing_pack_icon is an unchanged whole public resource; its
  // original bytes are independently read here, never a captured native crop.
  await expect(button.locator('.mc-world-navigation__pack-icon')).toBeVisible();const src=await button.locator('.mc-world-navigation__pack-icon').getAttribute('src');expect(src).toContain('missing_pack_icon.png');
  const sourcePath='../../demo/assets/world-settings/missing_pack_icon.png';await compare(page,button.locator('.mc-world-navigation__pack-icon'),sourcePath,info);
 });
 test(`GUI${scale} complete original BannersTransparent nine-slice plane`,async({page},info)=>{
  await open(page,scale);await page.addStyleTag({content:'.mc-world-navigation__thumbnail>.mc-image{visibility:hidden!important}'});await compare(page,page.locator('.mc-world-navigation__thumbnail-border'),'world-navigation/BannersTransparent.png',info,undefined,[1,1,1,1]);
 });
}
