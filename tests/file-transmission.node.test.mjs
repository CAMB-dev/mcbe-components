import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {createElement,createRef} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const root=fileURLToPath(new URL('../',import.meta.url));
const compiled=await build({stdin:{contents:`export * from './src/file-transmission-model';export * from './src/file-transmission';export {makeFileTransmissionModel} from './tests/fixtures/file-transmission-profile';`,resolveDir:root},platform:'node',format:'cjs',bundle:true,write:false,packages:'external',jsx:'automatic',target:'es2022',plugins:[{name:'whole-source-urls',setup(b){b.onLoad({filter:/\.tsx?$/},async a=>({contents:(await readFile(a.path,'utf8')).replaceAll('import.meta.url',JSON.stringify(pathToFileURL(a.path).href)),loader:a.path.endsWith('.tsx')?'tsx':'ts'}));}}]});
const require=createRequire(new URL('../package.json',import.meta.url)),m={exports:{}};
new Function('require','module','exports',compiled.outputFiles[0].text)(require,m,m.exports);
const {makeFileTransmissionModel:make,planFileTransmission:plan,snapshotFileTransmission:snapshot,FileTransmissionPanel,FileTransmissionScreen,FileTransferProgress}=m.exports;
const flagNames=['singleTitleVisible','dualTitleVisible','uploadContentVisible','warningContentVisible','messageVisible','progressTextVisible','progressVisible','playVisible','cancelVisible','warningButtonsVisible'];
test('fixed source268x95 rectangles and independent button targets/gap',()=>{
 const model=make();Object.assign(model.bindings,{playVisible:true,cancelVisible:true,warningButtonsVisible:true});const p=plan(model);
 assert.deepEqual(p.size,[268,95]);assert.deepEqual(p.title,[7,7,254,10]);assert.deepEqual(p.content,[10,23,248,30]);assert.deepEqual(p.buttonsBox,[7,58,254,30]);
 assert.deepEqual(p.buttons.map(b=>[b.id,b.target,b.box]),[['play','button.file_upload_play',[7,58,254,30]],['cancel','button.file_upload_cancel',[7,58,254,30]],['continue','button.file_upload_wifi_warning_continue',[7,58,126,30]],['warning-cancel','button.file_upload_cancel',[135,58,126,30]]]);
});
test('all1024 independent visibility combinations preserve source gates without stage coercion',()=>{
 for(let bits=0;bits<1024;bits++){const model=make();flagNames.forEach((name,i)=>model.bindings[name]=!!(bits&(1<<i)));const p=plan(model),b=model.bindings;
  assert.equal(p.texts.length,Number(b.singleTitleVisible)+2*Number(b.dualTitleVisible)+Number(b.uploadContentVisible&&b.messageVisible)+2*Number(b.uploadContentVisible&&b.progressTextVisible)+Number(b.warningContentVisible));
  assert.equal(p.buttons.length,Number(b.playVisible)+Number(b.cancelVisible)+2*Number(b.warningButtonsVisible));assert.equal(p.progress.visible,b.uploadContentVisible&&b.progressVisible);
 }
});
test('host content measurements control all8 row-visibility subsets without inferring hidden occupancy',()=>{
 for(const layout of [{height:25,messageY:0,progressTextY:10,progressBarY:20},{height:5,messageY:2,progressTextY:3,progressBarY:0}])for(let bits=0;bits<8;bits++){
  const model=make();model.stackLayout={...model.stackLayout,...layout};Object.assign(model.bindings,{messageVisible:!!(bits&1),progressTextVisible:!!(bits&2),progressVisible:!!(bits&4)});const p=plan(model),y=23+(30-layout.height)/2;
  const message=p.texts.find(x=>x.sourceControl==='file_upload.message_text_panel/message_text'),size=p.texts.find(x=>x.sourceControl==='file_upload.progress_text_panel/progress');
  if(message)assert.equal(message.box[1],y+layout.messageY);if(size)assert.equal(size.box[1],y+layout.progressTextY);assert.equal(p.progress.box[1],y+layout.progressBarY);
 }
});
test('snapshots detach mutable data, retain callbacks and freeze owned records',()=>{
 const model=make(),s=snapshot(model);model.bindings.singleTitle='mutated';model.stackLayout.height=77;model.profile.intrinsicSizes['file_upload.single_title_panel/center'][0]=1;
 assert.equal(s.bindings.singleTitle,'Upload world');assert.equal(s.stackLayout.height,25);assert.deepEqual(s.profile.intrinsicSizes['file_upload.single_title_panel/center'],[120,10]);assert.equal(s.onAction,model.onAction);assert(Object.isFrozen(s.bindings)&&Object.isFrozen(s.stackLayout));
});
test('plain-data rejection never invokes record accessors including latent bindings',()=>{
 for(const key of ['message','singleTitleVisible','percentage']){let reads=0;const model=make();Object.defineProperty(model.bindings,key,{get(){reads++;throw Error('getter');},enumerable:true});assert.throws(()=>plan(model),TypeError);assert.equal(reads,0);}
 let reads=0;const model=make();Object.defineProperty(model.stackLayout,'height',{get(){reads++;return 25;},enumerable:true});assert.throws(()=>plan(model),TypeError);assert.equal(reads,0);
});
test('finite strings, flags, percentage and explicit policy inputs remain checked when hidden',()=>{
 for(const value of [NaN,Infinity,-.01,1.01]){const model=make();model.bindings.uploadContentVisible=false;model.bindings.percentage=value;assert.throws(()=>plan(model),RangeError);}
 for(const change of [m=>m.bindings.messageVisible=1,m=>m.imageClipPolicy='native',m=>m.materialPolicy='guess',m=>m.stackLayout.policy='native',m=>m.stackLayout.height=NaN,m=>m.stackLayout.provenance='',m=>m.runKey='',m=>m.onAction=1]){const model=make();change(model);assert.throws(()=>plan(model));}
 const model=make();for(const k of ['singleTitle','leftTitle','rightTitle','message','progressSize'])model.bindings[k]='x'.repeat(1048576);assert.throws(()=>plan(model),RangeError);
});
test('missing active last-leaf localization and measurements fail before any glyph/ref callback',()=>{
 for(const breakInput of [m=>{m.bindings.warningButtonsVisible=true;delete m.profile.labels['permissions.Continue'];},m=>{m.bindings.warningContentVisible=true;delete m.profile.intrinsicSizes['file_upload.warning_content_panel/message'];},m=>{delete m.profile.labels['accessibility.fileTransferProgress'];}]){
  let effects=0;const model=make();model.renderText=()=>{effects++;return null;};breakInput(model);
  assert.throws(()=>renderToStaticMarkup(createElement(FileTransmissionScreen,{model,open:true,label:'Upload',baseLayer:null,titleArt:null,ref:()=>effects++,controllerRef:()=>effects++})));assert.equal(effects,0);
 }
});
test('private components accept actual React key/ref metadata with SSR side effects zero',()=>{
 let effects=0;const model=make();model.onAction=()=>effects++;
 const panel=renderToStaticMarkup(createElement(FileTransmissionPanel,{key:'panel',ref:()=>effects++,model}));assert(panel.includes('data-file-transmission-button="cancel"'));assert(panel.includes('data-source-control="file_upload.progress_bar_icon"'));
 const screen=renderToStaticMarkup(createElement(FileTransmissionScreen,{key:'screen',ref:()=>effects++,controllerRef:()=>effects++,model,open:true,label:'Upload',baseLayer:null,titleArt:null}));assert(screen.includes('role="dialog"'));assert(screen.includes('data-source-route="file_transmission_screen"'));
 renderToStaticMarkup(createElement(FileTransferProgress,{key:'progress',ref:createRef(),width:248,scale:1,percentage:.5,visible:true,imageClipPolicy:'visible-fraction-web',label:'Progress'}));assert.equal(effects,0);
});
test('progress preflight validates hidden geometry and keeps fixed nub rather than fraction translation',()=>{
 for(const width of [NaN,0,9,8193])assert.throws(()=>renderToStaticMarkup(createElement(FileTransferProgress,{width,scale:1,percentage:.5,visible:false,imageClipPolicy:'visible-fraction-web',label:'Progress'})),RangeError);
 for(const percentage of [0,.5,1]){const html=renderToStaticMarkup(createElement(FileTransferProgress,{width:248,scale:2,percentage,visible:true,imageClipPolicy:'visible-fraction-web',label:'Progress'}));assert(html.includes('width:476px;height:10px'));assert(html.includes('left:10px'));}
});
test('all51 originally frozen files retain bytes, with calibrated references clearly separate',async()=>{
 const folder=new URL('./fixtures/file-transmission-materials/',import.meta.url),manifest=JSON.parse(await readFile(new URL('FREEZE-MANIFEST.json',folder),'utf8'));
 const {createHash}=await import('node:crypto');assert.equal(manifest.files.length,51);
 for(const item of manifest.files){const bytes=await readFile(new URL(item.path,folder));assert.equal(bytes.length,item.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256,item.path);}
 const calibration=JSON.parse(await readFile(new URL('CALIBRATED-WEB-01/ALPHA-EXPERIMENT.json',folder),'utf8'));
 for(const item of calibration.cases.filter(x=>x.kind==='original-image-opacity')){const a=Math.floor(255*item.alpha+.5),expected=item.background.map(d=>Math.floor(9*(a+1)/256)+Math.floor(d*(256-a)/256));assert.deepEqual(item.actualRGBA,[...expected,255]);}
 const holdout=JSON.parse(await readFile(new URL('CALIBRATED-WEB-01/ALPHA-HOLDOUT.json',folder),'utf8'));
 for(const item of holdout.rows.filter(x=>x.kind==='opaque-png-opacity'))assert.deepEqual(item.actualRGB,item.predictions.scaled256Both);
});
