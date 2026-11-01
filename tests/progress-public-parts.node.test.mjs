import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const root=fileURLToPath(new URL('../',import.meta.url)),directory=new URL('../.cache/progress-public-parts-node/',import.meta.url);await mkdir(directory,{recursive:true});
const entry=fileURLToPath(new URL('../src/progress-public-parts.tsx',import.meta.url)),target=new URL(`bundle-${process.pid}.mjs`,directory);
const built=await build({stdin:{contents:"export * from './src/progress-public-parts';export {progressAssets} from './src/progress-assets';export {makeProgressScreenProps} from './tests/fixtures/progress-profile';",resolveDir:root},platform:'node',format:'esm',bundle:true,write:false,jsx:'automatic',target:'es2022',external:['react','react/jsx-runtime'],define:{'import.meta.url':JSON.stringify(pathToFileURL(entry).href)},plugins:[{name:'fixture-url',setup(build){build.onLoad({filter:/[\\/]tests[\\/]fixtures[\\/]progress-profile\.ts$/},async args=>({contents:(await readFile(args.path,'utf8')).replaceAll('import.meta.url',JSON.stringify(pathToFileURL(args.path).href)),loader:'ts'}));}}]});await writeFile(target,built.outputFiles[0].contents);
const {ProgressPackGrids,ProgressResourceDialog,ProgressCloudPanel,ProgressCloudConflictDialog,createProgressPublicRequestOwner,makeProgressScreenProps:make,progressAssets}=await import(target.href);
const render=(C,p)=>renderToStaticMarkup(React.createElement(C,p));
const popup=(factoryId='test')=>({instanceId:'resource-1',factoryId,description:'Host request description',showRayTracingWarning:true,rayTracingWarning:'Host warning',joinEverythingText:'All host packs',joinRequiredText:'Required host packs'});
const conflict=()=>({instanceId:'conflict-1',description:'Host conflict',localName:'Local name',localDate:'Local opaque date',cloudName:'Cloud name',cloudDate:'Cloud opaque date'});
const grid=()=>{const s=make();return {runKey:s.runKey,instanceId:'grid-1',packs:s.packs,profile:s.profile,size:[430,89],disabled:false,readOnly:false,onSelectionChange:()=>{}};};

test('standalone real parts SSR preserves all five factory matrices and source backgrounds',()=>{
 const matrices={test:['button.confirm_download','button.deny_packs'],resource_pack_download_server_required:['button.join_and_download_everything','button.leave'],resource_pack_download_optional_and_required:['button.join_and_download_everything','button.join_and_download_required','button.leave'],resource_pack_download_optional:['button.join_and_download_everything','button.join'],resource_pack_download_required:['button.join_and_download_required','button.leave']};
 const g=render(ProgressPackGrids,grid());assert.match(g,/data-progress-part="pack-grids"/);assert.match(g,/<input(?=[^>]*name="required_resourcepacks")(?=[^>]*disabled="")[^>]*>/);assert.match(g,/<input(?=[^>]*name="optional_resourcepacks")(?=[^>]*checked="")[^>]*>/);
 for(const[id,targets]of Object.entries(matrices)){const html=render(ProgressResourceDialog,{snapshot:make(),popup:popup(id)});assert.match(html,/data-progress-part="resource-dialog"/);assert.ok(!html.includes('mc-progress-public-conflict__background'));assert.deepEqual([...html.matchAll(/data-source-target="([^"]+)"/g)].map(v=>v[1]),targets);assert.ok(html.includes('role="dialog"'));}
 const s=make();s.conflictPopup=conflict();const c=render(ProgressCloudConflictDialog,{snapshot:s});assert.match(c,/mc-progress-public-conflict__background[^>]*opacity:0\.75/);assert.match(c,/aria-label="Choose a world"/);assert.match(c,/data-source-escape-target="button.close_edu_cloud_conflict_resolution_popup"/);assert.ok(!c.includes('close_button'));
 assert.ok(c.includes(`src="${progressAssets['textures/ui/screen_background'].url}"`));assert.equal(progressAssets['textures/ui/screen_background'].width,1);assert.equal(progressAssets['textures/ui/screen_background'].height,1);
 assert.equal(render(ProgressCloudConflictDialog,{snapshot:make()}),'');
});
test('public modal and cloud canvases clip intrinsic overflow while grids preserve source visual row overflow',async()=>{const css=await readFile(new URL('../src/progress-public-parts.css',import.meta.url),'utf8');assert.match(css,/\.mc-progress-public-cloud,\.mc-progress-public-modal\{overflow:clip\}/);assert.match(css,/\.mc-progress-public-grids\{overflow:visible\}/);});
test('four cloud standalone branches own no root global keyboard map and respect explicit visibility',()=>{
 for(const kind of['upload','fetch','download','server-fetch']){const s=make();const html=render(ProgressCloudPanel,{snapshot:s,kind,imageClipPolicy:'left-removal-web'});assert.match(html,/data-progress-part="cloud-panel"/);assert.ok(!html.includes('data-progress-screen'));assert.ok(!html.includes('data-source-escape-target'));}
 const p=grid();p.open=false;assert.match(render(ProgressPackGrids,p),/hidden=""/);const s=make();s.nativeProps={hidden:true};assert.match(render(ProgressCloudPanel,{snapshot:s,kind:'fetch',imageClipPolicy:'visible-fraction-web'}),/hidden=""/);
});
test('active leaf and latent schemas preflight before glyphs, including cloud error clip policy',()=>{
 for(const run of[
  ()=>{const s=make();s.cloud.uploadError=true;return [ProgressCloudPanel,{snapshot:s,kind:'upload',imageClipPolicy:'bogus'}];},
  ()=>{const s=make();s.cloud.downloadError=true;s.profile.unresolvedMaterials.externalLink=undefined;return [ProgressCloudPanel,{snapshot:s,kind:'download',imageClipPolicy:'visible-fraction-web'}];},
  ()=>{const s=make();delete s.profile.labels['progressScreen.dialog.button.join'];return [ProgressResourceDialog,{snapshot:s,popup:popup('resource_pack_download_optional')}];},
  ()=>{const s=make();s.conflictPopup=conflict();delete s.profile.labels['popup.buttons.eduConflictResolution.both'];return [ProgressCloudConflictDialog,{snapshot:s}];},
  ()=>{const s=make();s.open=false;s.indicators.autoSaveFrame=9;return [ProgressCloudPanel,{snapshot:s,kind:'fetch',imageClipPolicy:'visible-fraction-web'}];},
  ()=>{const p=grid();p.profile.fonts.conflict.logicalSize=0;return [ProgressPackGrids,p];}
 ]){const[C,p]=run();let glyphs=0;(p.snapshot??p).renderText=()=>{glyphs++;return 'glyph';};assert.throws(()=>render(C,p));assert.equal(glyphs,0);}
});
test('SSR has no owner tasks, callbacks or ref writes and glyph-only replacement retains literal text',()=>{
 const s=make();s.cloud.uploadError=true;s.conflictPopup=conflict();let callbacks=0,glyphs=0;s.onAction=s.onPackSelectionChange=()=>{callbacks++;};s.rootRef=()=>{callbacks++;return()=>{callbacks++;};};s.renderText=()=>{glyphs++;return React.createElement('i',null,'glyph');};const old=globalThis.setTimeout;globalThis.setTimeout=()=>{throw Error('SSR task');};
 try{for(const[C,p]of [[ProgressPackGrids,{...grid(),renderText:s.renderText,onSelectionChange:s.onPackSelectionChange}],[ProgressResourceDialog,{snapshot:s,popup:popup()}],[ProgressCloudPanel,{snapshot:s,kind:'upload',imageClipPolicy:'visible-fraction-web'}],[ProgressCloudConflictDialog,{snapshot:s}]]){const html=render(C,{...p,ref:s.rootRef});assert.ok(html.includes('literal'));}}finally{globalThis.setTimeout=old;}assert.equal(callbacks,0);assert.ok(glyphs>0);
});
test('public wrappers reject synchronous raw sinks, own prop getters and composition replacements',()=>{
 let reads=0;const p={snapshot:make(),kind:'fetch',imageClipPolicy:'visible-fraction-web'};Object.defineProperty(p,'snapshot',{enumerable:true,get(){reads++;throw Error('getter ran');}});assert.throws(()=>ProgressCloudPanel.render(p,null),/own enumerable data props/);assert.equal(reads,0);
 for(const[C,p]of [[ProgressPackGrids,grid()],[ProgressResourceDialog,{snapshot:make(),popup:popup()}],[ProgressCloudPanel,{snapshot:make(),kind:'fetch',imageClipPolicy:'visible-fraction-web'}],[ProgressCloudConflictDialog,{snapshot:make()}]]){assert.throws(()=>render(C,{...p,onRequest:()=>{}}),/owns deferred semantic requests/);assert.throws(()=>render(C,{...p,children:'whole panel'}),/owns its source composition/);}
});
test('public grid nested native handlers reject excess fields and accessors before callbacks or glyphs',()=>{
 for(const makeHandlers of[()=>Object.fromEntries(Array.from({length:100},(_,i)=>['extra-'+i,()=>{}])),()=>({unknown:()=>{}}),()=>({onChange:12})]){const p=grid();let glyphs=0;p.renderText=()=>{glyphs++;return 'glyph';};p.nativeHandlers=makeHandlers();assert.throws(()=>render(ProgressPackGrids,p));assert.equal(glyphs,0);}
 let reads=0;const p=grid();p.nativeHandlers={};Object.defineProperty(p.nativeHandlers,'onClick',{enumerable:true,get(){reads++;throw Error('getter ran');}});assert.throws(()=>render(ProgressPackGrids,p),/own enumerable data props/);assert.equal(reads,0);
});
test('standalone outer nodes reject owned native accessibility attributes before glyphs',()=>{
 for(const native of[{role:'dialog'},{tabIndex:-1},{'aria-modal':true},{'aria-label':'Outer label'},{'aria-labelledby':'outer-title'},{role:'dialog','aria-modal':true,tabIndex:-1}])for(const component of[ProgressResourceDialog,ProgressCloudPanel,ProgressCloudConflictDialog]){
  const s=make();s.conflictPopup=conflict();s.nativeProps=native;let glyphs=0;s.renderText=()=>{glyphs++;return 'glyph';};const props=component===ProgressResourceDialog?{snapshot:s,popup:popup()}:component===ProgressCloudPanel?{snapshot:s,kind:'fetch',imageClipPolicy:'visible-fraction-web'}:{snapshot:s};assert.throws(()=>render(component,props),/owns source accessibility semantics/);assert.equal(glyphs,0);
 }
 const s=make();s.conflictPopup=conflict();s.nativeProps={id:'host-part',onClick:()=>{},'aria-describedby':'host-description','aria-busy':true};
 for(const [component,props]of[[ProgressResourceDialog,{snapshot:s,popup:popup()}],[ProgressCloudPanel,{snapshot:s,kind:'fetch',imageClipPolicy:'visible-fraction-web'}],[ProgressCloudConflictDialog,{snapshot:s}]]){
  const html=render(component,props),outer=/<div\b[^>]*data-progress-part="[^"]+"[^>]*>/.exec(html)?.[0];assert.ok(outer);assert.ok(outer.includes('id="host-part"'));assert.ok(outer.includes('aria-describedby="host-description"'));assert.ok(!outer.includes('aria-modal=')&&!outer.includes('role=')&&!outer.includes('aria-label='));if(component!==ProgressCloudPanel)assert.match(html,/role="dialog" aria-modal="true"/);
 }
});

class Node {
 constructor(doc,parent=null,dataset={}){this.ownerDocument=doc;this.parent=parent;this.dataset=dataset;this.isConnected=true;this.hidden=false;this.inert=false;this.disabled=false;this.painted=true;}
 contains(n){for(let p=n;p;p=p.parent)if(p===this)return true;return false;}
 closest(){for(let p=this;p;p=p.parent)if(p.hidden||p.inert)return p;return null;}
 matches(){return this.disabled;}
 getClientRects(){return this.painted?[{}]:[];}
}
function runtime(exit=false){
 const timers=[],microtasks=[],doc={activeElement:null,defaultView:{setTimeout(fn){timers.push(fn);return timers.length;},queueMicrotask(fn){microtasks.push(fn);},getComputedStyle(){return {visibility:'visible'};}}};
 const boundary=new Node(doc),control=new Node(doc,boundary,{sourceControl:'source/control',sourceTarget:exit?'modal.escape':'button.menu_retry',progressInstance:'instance-1'});doc.activeElement=control;const calls=[],payload={opaque:true};
 let state={runKey:'run-1',key:'factory:instance-1',epoch:1,visible:true,disabled:false,readOnly:false,boundary,target:boundary,actions:[{target:control.dataset.sourceTarget,sourceControl:'source/control',instanceId:'instance-1',exit}],onAction:d=>calls.push(d),onSelection:d=>calls.push(d),selection:{instanceId:'instance-1',factoryId:'test',packs:{required:{dimensions:[1,1],entries:[]},optional:{dimensions:[1,1],entries:[{id:'entry-1',name:'Host name',selected:true,payload}]},selectedCountText:'opaque',selectedSizeText:'opaque'}}};
 const owner=createProgressPublicRequestOwner(()=>state);const event=()=>{const nativeEvent={defaultPrevented:false};return {type:'click',nativeEvent,defaultPrevented:false,persist(){},preventDefault(){this.defaultPrevented=true;nativeEvent.defaultPrevented=true;},stopPropagation(){},isDefaultPrevented(){return this.defaultPrevented;},isPropagationStopped(){return false;}};};
 const raw=()=>({target:control.dataset.sourceTarget,sourceControl:'source/control',instanceId:'instance-1',control,event:event(),origin:'control',valid:()=>true});
 const selection=()=>({runKey:'run-1',collection:'optional_resourcepacks',id:'entry-1',index:0,selected:false,payload,instanceId:'instance-1',control,event:event(),valid:()=>true});
 const flush=()=>{while(timers.length)timers.shift()();while(microtasks.length)microtasks.shift()();};
 return {owner,doc,boundary,control,calls,timers,raw,selection,flush,get state(){return state;},set state(s){state=s;}};
}
test('owner-window deferred actions wait for final native document veto and call latest callback',()=>{
 const r=runtime(),raw=r.raw();assert.equal(r.owner.action(raw),true);assert.equal(r.calls.length,0);assert.equal(r.timers.length,1);raw.event.nativeEvent.defaultPrevented=true;r.flush();assert.equal(r.calls.length,0);
 const q=runtime();let latest=0;assert.equal(q.owner.action(q.raw()),true);q.state={...q.state,onAction:d=>{latest++;assert.equal(d.runKey,'run-1');assert.equal(d.event.currentTarget,q.control);}};q.flush();assert.equal(latest,1);assert.equal(q.calls.length,0);
});
test('queued action identity, ownership and lifecycle changes independently invalidate the request',()=>{
 const changes=[r=>r.state=null,r=>r.state={...r.state,visible:false},r=>r.state={...r.state,disabled:true},r=>r.state={...r.state,readOnly:true},r=>r.state={...r.state,runKey:'run-2'},r=>r.state={...r.state,key:'different-factory'},r=>r.state={...r.state,epoch:2},r=>r.state={...r.state,actions:[]},r=>r.boundary.hidden=true,r=>r.boundary.inert=true,r=>r.control.isConnected=false,r=>r.control.painted=false,r=>r.control.disabled=true,r=>r.control.dataset.sourceTarget='button.menu_exit',r=>r.control.dataset.progressInstance='other',r=>r.doc.activeElement=new Node(r.doc)];
 for(const mutate of changes){const r=runtime();assert.equal(r.owner.action(r.raw()),true);mutate(r);r.flush();assert.equal(r.calls.length,0);}
 const r=runtime(),raw=r.raw();let valid=true;raw.valid=()=>valid;assert.equal(r.owner.action(raw),true);valid=false;r.flush();assert.equal(r.calls.length,0);
});
test('readonly rejects source buttons while each modal explicit exit remains available, disabled rejects both',()=>{
 const r=runtime();r.state={...r.state,readOnly:true};assert.equal(r.owner.action(r.raw()),false);assert.equal(r.timers.length,0);
 for(const target of['modal.escape','button.close_edu_cloud_conflict_resolution_popup']){const q=runtime(true);q.control.dataset.sourceTarget=target;q.state={...q.state,readOnly:true,actions:[{...q.state.actions[0],target}]};assert.equal(q.owner.action(q.raw()),true);q.flush();assert.equal(q.calls[0].target,target);q.state={...q.state,disabled:true};assert.equal(q.owner.action(q.raw()),false);}
});
test('controlled selection queues no mutation and protects payload, index, factory and dimensions',()=>{
 const r=runtime(),raw=r.selection(),entry=r.state.selection.packs.optional.entries[0];assert.equal(r.owner.selection(raw),true);assert.equal(entry.selected,true);assert.equal(r.calls.length,0);r.flush();assert.equal(r.calls.length,1);assert.equal(r.calls[0].selected,false);assert.equal(entry.selected,true);assert.equal(r.calls[0].payload,raw.payload);
 const changes=[r=>r.state={...r.state,onSelection:()=>{}},r=>r.state.selection.packs.optional.entries[0]={...r.state.selection.packs.optional.entries[0],payload:{}},r=>r.state.selection.packs.optional.entries[0]={...r.state.selection.packs.optional.entries[0],id:'other'},r=>r.state.selection.packs.optional.entries[0]={...r.state.selection.packs.optional.entries[0],selected:false},r=>r.state.selection.packs.optional.entries=[],r=>r.state.selection.packs.optional.dimensions=[2,1],r=>r.state.selection={...r.state.selection,factoryId:'resource_pack_download_optional'},r=>r.state.selection={...r.state.selection,instanceId:'other'},r=>r.state={...r.state,readOnly:true},r=>r.doc.activeElement=new Node(r.doc)];
 for(const mutate of changes){const q=runtime();assert.equal(q.owner.selection(q.selection()),true);mutate(q);q.flush();assert.equal(q.calls.length,0);}
 const q=runtime(),veto=q.selection();assert.equal(q.owner.selection(veto),true);veto.event.nativeEvent.defaultPrevented=true;q.flush();assert.equal(q.calls.length,0);
});
test('owner rejects invalid entry and required collection synchronously and deduplicates native events',()=>{
 const r=runtime();assert.equal(r.owner.selection({...r.selection(),collection:'required_resourcepacks'}),false);assert.equal(r.owner.selection({...r.selection(),index:7}),false);assert.equal(r.owner.selection({...r.selection(),payload:{}}),false);assert.equal(r.timers.length,0);
 const raw=r.raw();assert.equal(r.owner.action(raw),true);assert.equal(r.owner.action(raw),false);r.flush();assert.equal(r.calls.length,1);
});
