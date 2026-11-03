import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs/promises';import path from'node:path';import{createRequire}from'node:module';import{pathToFileURL}from'node:url';import{build,transform}from'esbuild';
const root=process.cwd(),out=path.join(root,'.cache/world-settings-pages-qa-20261103-01/node');await fs.mkdir(out,{recursive:true});
const dataset=(await transform(await fs.readFile(path.join(root,'demo/world-settings-navigation-data.ts'),'utf8'),{loader:'ts',format:'esm',target:'es2022'})).code;
const{createWorldNavigationDemoSnapshot:make}=await import('data:text/javascript;base64,'+Buffer.from(dataset).toString('base64'));
const image={src:'/caller-original.png',sourceSize:[16,16]},white={src:'/caller-explicit-white.png',sourceSize:[2,2]},cloud={outline:{src:'/caller-original-cloud-outline.png',sourceSize:[20,14]},color:{src:'/caller-original-cloud-color.png',sourceSize:[20,14]}};
const snapshot=()=>make({white:structuredClone(white),thumbnail:structuredClone(image),pack:structuredClone(image)});
const font={family:'Caller exact font',size:10,lineHeight:10},props=()=>({label:'World sections',width:200,scale:1,font,mode:'create',snapshot:snapshot(),value:'game_button',hiddenSlots:'reserve',sourceDefaultIndex:99,toggleOnHover:false,hoverPolicy:'activation-only'});
const source=JSON.parse(await fs.readFile(path.join(root,'docs/world-settings-source.json'),'utf8'));
const worlds=source.definitions['world_section.selector_pane_content'].value.controls;
function sourceBinding(id){const own=worlds.find(c=>Object.keys(c)[0].split('@')[0]===id);const raw=own?Object.values(own)[0]:{};if(raw.$toggle_view_binding_name)return raw.$toggle_view_binding_name;const definition=source.definitions['world_section.'+(id==='switch_game_button'?'game_button':id)];assert(definition,id);return definition.value.$toggle_view_binding_name;}
const fixtures=[];
for(const major of[18,19]){
 const peer=createRequire(path.join(root,`.cache/consumer-react${major}/package.json`)),React=peer('react');assert.equal(Number(React.version.split('.')[0]),major,'Run npm run verify:package to prepare the real peer consumers.');
 const target=path.join(out,`world-nav-react${major}-${process.pid}.cjs`),entry=path.join(root,'src/world-settings-navigation.tsx');
 const result=await build({entryPoints:[entry],platform:'node',format:'cjs',bundle:true,write:false,target:'es2022',jsx:'automatic',define:{'import.meta.url':JSON.stringify(pathToFileURL(entry).href)},plugins:[{name:'actual-react-peer',setup(b){b.onResolve({filter:/^react(?:\/jsx-runtime)?$|^react-dom$/},a=>({path:peer.resolve(a.path),external:true}));}}]});await fs.writeFile(target,result.outputFiles[0].contents);
 const ui=peer(target),render=p=>peer('react-dom/server').renderToStaticMarkup(React.createElement(ui.WorldSettingsNavigation,p));fixtures.push({major,render});
 test(`actual React${major} source wrappers, exact view bindings, ignored branches and original Switch image`,()=>{
  const p=props(),base=render(p);assert.match(base,/data-source-control="settings.selector_stack_panel\/world_selector_pane"/);assert.match(base,/data-source-control="world_section.selector_pane_content\/world_snapshot_image"/);assert.match(base,/data-source-control="settings.selector_stack_panel\/addons_selector_panel"/);assert.match(base,/data-source-default-index="99"/);
  const ids=[...base.matchAll(/<button[^>]*data-settings-navigation-id="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(ids,['game_button','multiplayer_button','level_texture_pack_button','addon_button']);
  p.snapshot.context.nxOs=true;const nx=render(p);assert.ok(!nx.includes('data-settings-navigation-id="game_button"'));assert.match(nx,/controller_glyph_switch[.]png/);assert.match(nx,/controller_glyph_color_switch[.]png/);
  p.snapshot.context={...p.snapshot.context,pregame:false,educationEdition:true,nxOs:false,publish:false,cloudEnabled:true,cloudGeneralToggleEnabled:true};p.snapshot.server.visible=true;p.snapshot.cloud=cloud;
  const html=render(p);for(const id of['server_settings_button','game_button','classroom_button','edu_cloud_button','debug_button','multiplayer_button','level_texture_pack_button','addon_button']){
   const tag=html.match(new RegExp('<button[^>]*data-settings-navigation-id="'+id+'"[^>]*>'));assert(tag,id);assert.match(tag[0],new RegExp('data-source-view-binding="'+sourceBinding(id)+'"'));}
  assert.match(html.match(/<button[^>]*data-settings-navigation-id="multiplayer_button"[^>]*>/)[0],/disabled=""/);assert.ok(!html.includes('data-world-launch-button="primary"'));assert.match(html,/data-source-settings-node="server_settings_visibility_panel"/);
 });
 test(`actual React${major} server loading uses ten source UV frames and no fixed Progress size or tint`,()=>{
  const p=props();p.snapshot.context.pregame=false;p.snapshot.server.visible=true;p.snapshot.server.iconName='loading';p.snapshot.server.loadingFrame=9;
  const html=render(p);assert.match(html,/data-source-uv-frame="9"/);assert.match(html,/width:21px;height:14px/);assert.match(html,/left:-189px/);assert.ok(!html.includes('brightness(.7)'));assert.match(html,/width:210px;height:14px/);
  p.snapshot.server.iconName='';assert.ok(!render(p).includes('class="mc-world-navigation__loading"'));
 });
 test(`actual React${major} packs retain distinct17 border and15 icon with declared host resolution`,()=>{
  const html=render(props());assert.match(html,/class="[^"]*mc-world-navigation__pack-border"[^>]*style="width:17px;height:17px"/);assert.match(html,/class="mc-world-navigation__cycling"[^>]*style="left:1px;top:1px"/);assert.match(html,/width:15px;height:15px/);assert.match(html,/width:calc\(100% - 34px\)/);
 });
 test(`actual React${major} complete immutable snapshot renders without service calls, refs, callbacks or warnings`,()=>{
  const p=props(),before=JSON.stringify(p.snapshot),saved=new Map(),attempts=[],warnings=[],old=console.error;let callbacks=0;
  for(const key of['fetch','Image','FontFace','XMLHttpRequest','OffscreenCanvas','requestAnimationFrame','setTimeout','setInterval']){saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value(){attempts.push(key);throw Error('Unexpected '+key);}});}
  console.error=(...args)=>warnings.push(args);
  try{render({...p,inert:true,ref(){callbacks++;},onValueChange(){callbacks++;},onLaunchAction(){callbacks++;},itemRefs:{game_button(){callbacks++;}},launchButtonRefs:{primary(){callbacks++;}}});}
  finally{console.error=old;for(const[key,d]of saved)if(d)Object.defineProperty(globalThis,key,d);else delete globalThis[key];}
  assert.equal(callbacks,0);assert.deepEqual(attempts,[]);assert.deepEqual(warnings,[]);assert.equal(JSON.stringify(p.snapshot),before);
 });
}
test('source World navigation requires full named records and rejects source identity injection',()=>{
 const render=fixtures[0].render;
 for(const mutate of[p=>delete p.snapshot.buttons.game_button,p=>p.snapshot.buttons.extra={...p.snapshot.buttons.game_button},p=>p.snapshot.context.pregame='yes',p=>p.snapshot.server.loadingFrame=10,p=>p.value='arbitrary-page',p=>p.mode='arbitrary-profile',p=>p.snapshot.thumbnail.image.extra='injected']){const p=props();mutate(p);assert.throws(()=>render(p));}
});
test('missing exact-case resources require explicit caller resolution only when the actual branch is present',()=>{
 const render=fixtures[0].render,p=props();p.snapshot.packs.border=null;assert.throws(()=>render(p),/White/);p.snapshot.context.packsSectionsIncluded=false;assert.doesNotThrow(()=>render(p));
 p.snapshot.context.educationEdition=true;p.snapshot.context.cloudEnabled=true;p.snapshot.context.cloudGeneralToggleEnabled=true;assert.throws(()=>render(p),/Cloud/);p.snapshot.cloud=cloud;assert.doesNotThrow(()=>render(p));
});
test('snapshot accessors are rejected without invoking getter capabilities',()=>{
 const p=props();let calls=0;Object.defineProperty(p.snapshot.context,'pregame',{enumerable:true,get(){calls++;return true;}});assert.throws(()=>fixtures[0].render(p),/accessors/);assert.equal(calls,0);
});
