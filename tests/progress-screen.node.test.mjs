import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const root=fileURLToPath(new URL('../',import.meta.url)),directory=new URL('../.cache/progress-screen-node/',import.meta.url);
await mkdir(directory,{recursive:true});
const entry=fileURLToPath(new URL('../src/progress-screen.tsx',import.meta.url)),target=new URL(`bundle-${process.pid}.mjs`,directory);
const built=await build({stdin:{contents:"export {ProgressScreen} from './src/progress-screen';export {makeProgressScreenProps} from './tests/fixtures/progress-profile';export {PROGRESS_CONFLICT_INTRINSIC_KEYS} from './src/progress-cloud';",resolveDir:root},platform:'node',format:'esm',bundle:true,write:false,jsx:'automatic',target:'es2022',external:['react','react/jsx-runtime'],define:{'import.meta.url':JSON.stringify(pathToFileURL(entry).href)},plugins:[{name:'preserve-test-fixture-url',setup(build){build.onLoad({filter:/[\\/]tests[\\/]fixtures[\\/]progress-profile\.ts$/},async args=>({contents:(await readFile(args.path,'utf8')).replaceAll('import.meta.url',JSON.stringify(pathToFileURL(args.path).href)),loader:'ts'}));}}]});
await writeFile(target,built.outputFiles[0].contents);
const{ProgressScreen,makeProgressScreenProps:make,PROGRESS_CONFLICT_INTRINSIC_KEYS:conflictKeys}=await import(target.href);
const render=p=>renderToStaticMarkup(React.createElement(ProgressScreen,p));
const tag=html=>/<section\b[^>]*class="mc-progress-screen [^"]*"[^>]*>/.exec(html)?.[0]??assert.fail('Missing actual source Screen');
const popup=(factoryId='test')=>({instanceId:'resource-instance',factoryId,description:'Host resource description',showRayTracingWarning:true,rayTracingWarning:'Host warning',joinEverythingText:'Host all packs',joinRequiredText:'Host required packs'});
const conflict=()=>({instanceId:'cloud-instance',description:'Host conflict description',localName:'Literal local world',localDate:'Opaque local date',cloudName:'Literal cloud world',cloudDate:'Opaque cloud date'});
const upload=()=>{const p=make();p.route='world_saving_progress_screen';Object.assign(p.capabilities,{educationEdition:true,cloudSaveOn:true});return p;};
function beforeGlyph(mutate,p=make()) {let glyphs=0;p.renderText=()=>{glyphs++;return'Glyph';};mutate(p);assert.throws(()=>render(p));assert.equal(glyphs,0,'all active siblings must preflight before the first glyph');}

test('all fifteen source roots and four education/cloud gates render actual Screen with exact content',()=>{
 const routes=[['progress_screen','empty'],['modal_progress_screen','modal_screen_content'],['delete_progress_screen','modal_screen_content'],['realms_stories_loading_progress_screen','realms_loading_world_modal_progress_screen_content'],['world_loading_progress_screen','world_convert_modal_progress_screen_content'],['experience_world_loading_progress_screen','world_convert_modal_progress_screen_content'],['overworld_loading_progress_screen','world_convert_modal_progress_screen_content'],['nether_loading_progress_screen','world_convert_modal_progress_screen_content'],['theend_loading_progress_screen','world_convert_modal_progress_screen_content'],['world_saving_progress_screen','world_save_modal_progress_screen_content'],['fetching_edu_cloud_worlds','empty'],['edu_cloud_download_progress_screen','empty'],['fetching_edu_servers','empty'],['joining_edu_server','joining_edu_server_progress_screen_content'],['world_convert_modal_progress_screen','world_convert_modal_progress_screen_content']];
 let cases=0;
 for(const[route,initial]of routes)for(const educationEdition of[false,true])for(const cloudSaveOn of[false,true]){
  const p=make();p.route=route;Object.assign(p.capabilities,{educationEdition,cloudSaveOn});let expected=initial;
  if(educationEdition&&cloudSaveOn){if(route==='world_saving_progress_screen')expected='cloud_upload_screen_content';if(route==='fetching_edu_cloud_worlds')expected='edu_cloud_fetch_screen_content';if(route==='edu_cloud_download_progress_screen')expected='cloud_download_screen_content';}
  if(educationEdition&&route==='fetching_edu_servers')expected='edu_server_fetch_screen_content';
  const html=render(p),rootTag=tag(html);assert(rootTag.includes(`data-source-route="${route}"`));assert(rootTag.includes(`data-progress-content="${expected}"`));assert(rootTag.includes('data-native-certified="false"'));assert(rootTag.includes('role="dialog"'));assert(rootTag.includes('aria-modal="true"'));assert(rootTag.includes('tabindex="-1"'));assert(rootTag.includes('width:500px;height:300px'));assert(!html.includes('NaN')&&!html.includes('Infinity'));cases++;
 }assert.equal(cases,60);
});

test('five source resource factories render real content and exact button target matrix',()=>{
 const matrices={test:['button.confirm_download','button.deny_packs'],resource_pack_download_server_required:['button.join_and_download_everything','button.leave'],resource_pack_download_optional_and_required:['button.join_and_download_everything','button.join_and_download_required','button.leave'],resource_pack_download_optional:['button.join_and_download_everything','button.join'],resource_pack_download_required:['button.join_and_download_required','button.leave']};
 for(const[id,targets]of Object.entries(matrices)){const p=make();p.resourcePopup=popup(id);const html=render(p);assert(html.includes(`data-progress-resource-factory="${id}"`));assert(tag(html).includes('data-progress-top="resource"'));for(const target of targets)assert(html.includes(`data-source-target="${target}"`));if(id==='test'){assert(html.includes('data-source-collection="required_resourcepacks"'));assert(html.includes('data-source-collection="optional_resourcepacks"'));assert(html.includes('Host count 77'));assert(html.includes('Host size arbitrary'));}}
});

test('independent simultaneous factories demand explicit complete unique layer order',()=>{
 const p=upload();p.resourcePopup=popup();p.conflictPopup=conflict();assert.throws(()=>render(p),/modalOrder/);
 for(const order of[['resource','conflict'],['conflict','resource']]){p.modalOrder=order;const html=render(p);assert(tag(html).includes(`data-progress-top="${order[1]}"`));const layers=[...html.matchAll(/data-progress-modal-layer="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(layers,order);assert(html.includes('Literal local world'));assert(html.includes('Literal cloud world'));}
 for(const order of[[],['resource'],['resource','resource'],['resource','conflict','extra'],['wrong','conflict']])beforeGlyph(x=>{x.modalOrder=order;},p);
 const sparse=new Array(2);sparse[0]='resource';beforeGlyph(x=>{x.modalOrder=sparse;},p);
});

test('unregistered factories neither render nor demand unknown intrinsic materials',()=>{
 const p=make();p.route='modal_progress_screen';p.resourcePopup=popup();p.conflictPopup=conflict();
 for(const key of Object.keys(p.profile.intrinsicSizes))if(key.startsWith('progress.popup_dialog_base')||key.startsWith('progress.resource_pack_section')||key.startsWith('progress.simple_popup_dialog_base')||conflictKeys.includes(key))delete p.profile.intrinsicSizes[key];
 const html=render(p);assert(!html.includes('data-progress-resource-factory='));assert(!html.includes('data-progress-modal-layer='));assert(tag(html).includes('data-progress-top="base"'));
 // A false source education gate inherits empty content; it does not invent a loader or factory.
 p.route='fetching_edu_cloud_worlds';p.profile.intrinsicSizes={};p.branding=null;const empty=render(p);assert(tag(empty).includes('data-progress-content="empty"'));assert(!empty.includes('data-progress-resource-factory='));
});

test('late conflict, resource, auxiliary and cloud leaf faults reject before any glyph callback',()=>{
 beforeGlyph(p=>{p.conflictPopup=conflict();delete p.profile.intrinsicSizes[conflictKeys.at(-1)];},upload());
 beforeGlyph(p=>{p.resourcePopup=popup();delete p.profile.intrinsicSizes['progress.popup_dialog_base.totalSelectedSize'];});
 beforeGlyph(p=>{p.resourcePopup=popup('resource_pack_download_optional');delete p.profile.labels['progressScreen.dialog.button.join'];});
 beforeGlyph(p=>{delete p.profile.intrinsicSizes['progress.mobile_data_icon_text'];});
 beforeGlyph(p=>{p.branding=null;});
 beforeGlyph(p=>{p.cloud.uploadError=true;delete p.profile.unresolvedMaterials.externalLink;},upload());
 beforeGlyph(p=>{p.route='realms_stories_loading_progress_screen';p.auxiliary.serverRegionPingIcon=null;});
});

test('latent malformed records, own getters, callback/ref and finite budget failures are atomic',()=>{
 let reads=0;
 for(const mutate of[p=>{p.open=false;p.indicators.autoSaveFrame=9;},p=>{p.packs.optional.dimensions=[0,0];},p=>{p.onAction=null;},p=>{p.controllerRef={get current(){reads++;return null;}};},p=>{p.rootRef={get current(){reads++;return null;}};},p=>{Object.defineProperty(p.profile.labels,'latent',{enumerable:true,get(){reads++;return'bad';}});},p=>{p.profile.availableSize=[8192,8192];},p=>{p.profile.fonts.conflict.logicalSize=0;}])beforeGlyph(mutate);
 // React.createElement itself copies root prop getters before invoking a
 // component. Exercise the actual forwardRef entry directly for this guard;
 // nested model getters above remain actual SSR cases.
 const own=make();Object.defineProperty(own,'modalOrder',{enumerable:true,get(){reads++;return[];}});assert.throws(()=>ProgressScreen.render(own,null));
 const stacked=upload();stacked.resourcePopup=popup();stacked.conflictPopup=conflict();stacked.modalOrder=['resource','conflict'];Object.defineProperty(stacked.modalOrder,'0',{enumerable:true,get(){reads++;return'resource';}});beforeGlyph(()=>{},stacked);
 assert.equal(reads,0);
});

test('branding descriptors remain pure data even when a route does not paint branding',()=>{
 let reads=0;
 const p=make();p.route='modal_progress_screen';
 Object.defineProperty(p.branding,'image',{enumerable:true,get(){reads++;throw Error('branding getter ran');}});
 beforeGlyph(()=>{},p);
 const q=make();Object.defineProperty(q.branding.box,'0',{enumerable:true,get(){reads++;return 0;}});beforeGlyph(()=>{},q);
 const r=make();r.branding={...r.branding,sourceVariant:'guessed-platform'};beforeGlyph(()=>{},r);
 assert.equal(reads,0);
});

test('out_cubic source exit/entrance transitions preserve endpoints and host-selected durations',()=>{
 const opacity=p=>Number(/(?:;|\")opacity:([^;\"]+)/.exec(tag(render(p)))[1]);
 const p=make();
 for(const[animation,duration]of[['screen_exit_animation_push_fade',.2],['screen_exit_animation_pop_fade',.3]])for(const[u,expected]of[[0,1],[.5,.125],[1,0],[2,0]]){p.transition={animation,elapsedSeconds:duration*u};assert.equal(opacity(p),expected);}
 p.route='delete_progress_screen';for(const[animation,duration]of[['screen_entrance_animation_push_fade',.2],['screen_entrance_animation_pop_fade',.3]])for(const[u,expected]of[[0,0],[.5,.875],[1,1],[2,1]]){p.transition={animation,elapsedSeconds:duration*u};assert.equal(opacity(p),expected);}
 p.profile.transitions.pushSeconds=0;p.transition={animation:'screen_entrance_animation_push_fade',elapsedSeconds:0};assert.equal(opacity(p),1);p.transition={animation:'screen_exit_animation_push_fade',elapsedSeconds:0};assert.equal(opacity(p),0);
});

test('unsupported route animations and invalid host elapsed values reject before glyphs',()=>{
 beforeGlyph(p=>{p.transition={animation:'screen_entrance_animation_push_fade',elapsedSeconds:0};});
 beforeGlyph(p=>{p.route='joining_edu_server';p.transition={animation:'screen_exit_animation_pop_fade',elapsedSeconds:0};});
 for(const elapsedSeconds of[-1,Infinity,NaN,3601])beforeGlyph(p=>{p.transition={animation:'screen_exit_animation_push_fade',elapsedSeconds};});
});

test('Screen owns geometry, dialog semantics, source contents and transition opacity',()=>{
 for(const nativeProps of[{role:'region'},{'aria-modal':false},{tabIndex:0},{children:'opaque screen'},{dangerouslySetInnerHTML:{__html:'opaque'}},...['width','height','overflow','position','opacity','visibility','transform','inset','left','right','top','bottom'].map(key=>({style:{[key]:key==='opacity'?0:'1px'}}))])beforeGlyph(p=>{p.nativeProps=nativeProps;});
 beforeGlyph(p=>{p.children='whole-screen child';});beforeGlyph(p=>{p.dangerouslySetInnerHTML={__html:'whole-screen child'};});
 const p=make();p.nativeProps={className:'host-progress','aria-label':'Host screen',style:{color:'#123456'}};assert(tag(render(p)).includes('host-progress'));p.open=false;assert(/\bhidden=""/.test(tag(render(p))));
});

test('actual Screen SSR has no semantic/selection/ref/task/IO side effects and keeps accessible literals',()=>{
 const p=upload();p.resourcePopup=popup();p.conflictPopup=conflict();p.modalOrder=['resource','conflict'];let callbacks=0,refs=0,glyphs=0;const attempts=[],warnings=[],saved=new Map(),previousError=console.error;
 p.onAction=p.onPackSelectionChange=()=>{callbacks++;};p.ref=p.rootRef=p.controllerRef=()=>{refs++;};p.renderText=(text,context)=>{glyphs++;assert(Object.isFrozen(context));assert(Object.isFrozen(context.font));return React.createElement('i',null,'Glyph-only');};
 for(const name of['fetch','Image','XMLHttpRequest','requestAnimationFrame','setTimeout','setInterval']){saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,value(){attempts.push(name);throw Error('Unexpected SSR service '+name);}});}console.error=(...args)=>warnings.push(args.map(String).join(' '));
 try{const html=render(p);assert(html.includes('Host title'));assert(html.includes('Required pack'));assert(html.includes('Literal local world'));assert(html.includes('Glyph-only'));assert(glyphs>0);assert.equal(refs,0);assert.equal(callbacks,0);assert.deepEqual(attempts,[]);assert.deepEqual(warnings,[]);}finally{console.error=previousError;for(const[name,d]of saved){if(d)Object.defineProperty(globalThis,name,d);else delete globalThis[name];}}
});
