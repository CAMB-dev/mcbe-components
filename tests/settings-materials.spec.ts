import{test,expect}from'@playwright/test';import type{Page}from'@playwright/test';import{readFile}from'node:fs/promises';import{PNG}from'pngjs';
const background=[49,50,51,255];
async function open(page:Page,patch:Record<string,unknown>){await page.goto('/demo/settings-fixture.html');await page.locator('.mc-settings-frame').waitFor();await page.evaluate(p=>(window as any).settingsFixture.configure(p),patch);await page.locator('#before').focus();await page.mouse.move(0,0);}
async function png(file:string){return PNG.sync.read(await readFile(new URL(`../src/assets/${file}`,import.meta.url)));}
function axis(pixel:number,extent:number,scale:number,physical:number,base:number,before:number,after:number){
 const x=(pixel+.5)/scale;
 const start=x<before,finish=x>=extent-after;
 const origin=start?0:finish?base-after:before;
 const size=start?before:finish?after:base-before-after;
 const at=start?0:finish?extent-after:before,span=start?before:finish?after:extent-before-after;
 return Math.max(0,Math.min(physical-1,Math.floor((origin+(size>0&&span>0?(x-at)*size/span:0))*physical/base)));
}
function compare(shot:PNG,source:PNG,width:number,height:number,scale:number,base:readonly[number,number],cuts:readonly[number,number,number,number]){
 expect([shot.width,shot.height]).toEqual([width*scale,height*scale]);let different=0;
 for(let y=0;y<shot.height;y++)for(let x=0;x<shot.width;x++){
  const sx=axis(x,width,scale,source.width,base[0],cuts[0],cuts[2]),sy=axis(y,height,scale,source.height,base[1],cuts[1],cuts[3]);
  const src=(sy*source.width+sx)*4,dst=(y*shot.width+x)*4,a=source.data[src+3]!/255;
  const expected=background.slice(0,3).map((c,index)=>Math.round(source.data[src+index]!*a+c*(1-a))).concat(255);
  if(expected.some((value,index)=>shot.data[dst+index]!==value))different++;
 }
 expect(different).toBe(0);
}
for(const scale of[1,2]){
 test(`GUI${scale}: complete supplied background and original RGB tint plane`,async({page})=>{
  await open(page,{scale});await page.addStyleTag({content:'.mc-settings-frame>:not(.mc-settings-frame__background):not(svg){visibility:hidden!important}'});
  const source=await png('document-viewer/permissions_player_fade_overlay.png');expect([...source.data]).toEqual(new Array(16).fill(255));
  const shot=PNG.sync.read(await page.locator('.mc-settings-frame').screenshot());expect([shot.width,shot.height]).toEqual([520*scale,340*scale]);
  let different=0;for(let i=0;i<shot.data.length;i+=4)if(background.some((v,c)=>shot.data[i+c]!==v))different++;expect(different).toBe(0);
 });
 test(`GUI${scale}: complete original StoreTopBar plane`,async({page})=>{
  await open(page,{scale});await page.addStyleTag({content:'.mc-settings-frame>:not(.mc-settings-frame__background):not(.mc-settings-frame__topbar):not(svg){visibility:hidden!important}'});
  compare(PNG.sync.read(await page.locator('.mc-settings-frame__topbar').screenshot()),await png('document-viewer/StoreTopBar.png'),520,23,scale,[3,5],[1,0,1,4]);
 });
 test(`GUI${scale}: complete original divider plane on source-tinted background`,async({page})=>{
  await open(page,{scale});await page.addStyleTag({content:'.mc-settings-frame>:not(.mc-settings-frame__background):not(.mc-settings-frame__divider):not(svg){visibility:hidden!important}'});
  compare(PNG.sync.read(await page.locator('.mc-settings-frame__divider').screenshot()),await png('document-viewer/HowToPlayDivider.png'),4,318,scale,[3,3],[1,1,1,1]);
 });
 for(const checked of[false,true])for(const hover of[false,true])test(`GUI${scale}: complete original ${checked?'on':'off'} toggle ${hover?'hover':'normal'} plane`,async({page})=>{
  await open(page,{scale});await page.evaluate(value=>{(window as any).settingsFixture.values['#is_hardcore']=value;(window as any).settingsFixture.configure({});},checked);
  const field=page.locator('[data-field-id=is_hardcore_toggle]');if(hover)await field.locator('input').hover();
  const source=await png(`${checked?'npc':'player-permissions'}/toggle_${checked?'on':'off'}${hover?'_hover':''}.png`);
  const shot=PNG.sync.read(await field.locator(`.mc-settings-toggle__${hover?'hover':'normal'}>.mc-settings-field-skin`).screenshot());
  compare(shot,source,30,16,scale,[30,16],[0,0,0,0]);
 });
 for(const hover of[false,true])test(`GUI${scale}: complete original edit-box ${hover?'hover':'normal'} plane`,async({page})=>{
  await open(page,{scale});await page.addStyleTag({content:'.mc-settings-text>input{opacity:0!important}'});
  const field=page.locator('[data-field-id=option_text_edit_0]');if(hover)await field.locator('input').hover();
  const shot=PNG.sync.read(await field.locator(`.mc-settings-text__${hover?'hover':'normal'}>.mc-settings-field-skin`).screenshot());
  compare(shot,await png(`external-server/edit_box_indent${hover?'_hover':''}.png`),292,30,scale,[6,6],[2,2,2,2]);
 });
}
for(const [name,checked,hover,disabled,file,base]of[
 ['unchecked',false,false,false,'button_borderless_light',[4,4]],['checked',true,false,false,'button_borderless_lightpressednohover',[4,4]],
 ['unchecked-hover',false,true,false,'button_borderless_lighthover',[4,4]],['checked-hover',true,true,false,'button_borderless_lightpressed',[4,4]],
 ['unchecked-locked',false,false,true,'disabledButtonNoBorder',[2,2]],['checked-locked',true,false,true,'disabledButtonNoBorder',[2,2]],
]as const)test(`GUI2: complete navigation ${name} original skin plane`,async({page})=>{
 await open(page,{scale:2,page:checked?'game':'multiplayer',disabled});
 await page.addStyleTag({content:'.mc-settings-navigation-section__content{visibility:hidden!important}'});
 const button=page.locator('button[data-settings-navigation-id=game]');if(hover)await button.hover();
 const state=disabled?'locked':hover?checked?'checkedHover':'uncheckedHover':checked?'checked':'unchecked';
 const shot=PNG.sync.read(await button.locator(`.mc-settings-navigation-section__state--${state}>.mc-settings-navigation-skin`).screenshot());
 compare(shot,await png(`document-viewer/${file}.png`),191,29,2,base,[1,1,1,1]);
});
