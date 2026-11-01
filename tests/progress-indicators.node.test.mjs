import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const directory=new URL('../.cache/progress-indicators-node/',import.meta.url);await mkdir(directory,{recursive:true});
const target=new URL(`bundle-${process.pid}.mjs`,directory);
const entry=fileURLToPath(new URL('../src/progress-indicators.tsx',import.meta.url));
const bundled=await build({entryPoints:[entry],platform:'node',format:'esm',bundle:true,write:false,jsx:'automatic',target:'es2022',external:['react','react/jsx-runtime'],define:{'import.meta.url':JSON.stringify(pathToFileURL(entry).href)}});
await writeFile(target,bundled.outputFiles[0].contents);
const{ProgressIndicators,planProgressIndicators}=await import(target.href);
const props=()=>({templates:['wave','spinner','fancy','thick','custom','autosave','cloud-upload'],availableSize:[200,100],scale:1,label:'Loading indicators',imageClipPolicy:'visible-fraction-web',customBar:{kind:'explicit-web-clip',clipRatio:.37,provenance:'authored finite Web sample'},
  state:{barAnimationVisible:true,spinnerAnimationVisible:true,loadingBarVisible:true,progressAnimationVisible:true,useDeterminateAnimation:false,autoSaveVisible:true,percentage:.42,currentAmount:17,totalAmount:999,waveFrame:0,spinnerFrame:0,autoSaveFrame:0,paused:true}});
const render=p=>renderToStaticMarkup(React.createElement(ProgressIndicators,p));
const leaf=(plan,template,kind=template)=>plan.leaves.find(l=>l.template===template&&l.kind===kind);

test('all 64 independent flag combinations preserve global visibility and only cloud has mutual children',()=>{
  const flags=['barAnimationVisible','spinnerAnimationVisible','loadingBarVisible','progressAnimationVisible','useDeterminateAnimation','autoSaveVisible'];
  for(let mask=0;mask<64;mask++){
    const p=props();flags.forEach((key,i)=>p.state[key]=!!(mask&(1<<i)));const plan=planProgressIndicators(p);
    assert.equal(leaf(plan,'wave').visible,p.state.barAnimationVisible);assert.equal(leaf(plan,'spinner').visible,p.state.spinnerAnimationVisible);
    for(const kind of['fancy','thick','custom'])assert.equal(leaf(plan,kind).visible,p.state.loadingBarVisible);
    assert.equal(leaf(plan,'autosave').visible,p.state.autoSaveVisible);
    assert.equal(leaf(plan,'cloud-upload','wave').visible,p.state.progressAnimationVisible&&!p.state.useDeterminateAnimation);
    assert.equal(leaf(plan,'cloud-upload','fancy').visible,p.state.progressAnimationVisible&&p.state.useDeterminateAnimation);
  }
});

test('source dimensions offsets layers and unrounded ratios survive finite Web planning',()=>{
  const p=props();p.state.percentage=1/3;const plan=planProgressIndicators(p);
  assert.deepEqual(leaf(plan,'wave').box,[68,70,64,8]);assert.deepEqual(leaf(plan,'spinner').box,[93,67,14,14]);
  assert.deepEqual(leaf(plan,'fancy').box,[10,47.5,180,5]);assert.deepEqual(leaf(plan,'thick').box,[10,43,180,14]);
  assert.deepEqual(leaf(plan,'custom').box,[50,65,100,2]);assert.deepEqual(leaf(plan,'autosave').box,[91,55,18,30]);
  assert.deepEqual(leaf(plan,'cloud-upload','fancy').box,[10,72.5,180,5]);
  assert.equal(leaf(plan,'autosave').layer,31);assert.equal(leaf(plan,'fancy').layer,5);assert.equal(leaf(plan,'fancy').clipRatio,1/3);
  assert.equal(plan.state.currentAmount,17);assert.equal(plan.state.totalAmount,999);assert.equal(plan.customBar.clipRatio,.37);
});

test('complete original strips retain explicit first last and intermediate frame UV windows',()=>{
  for(const[kind,last,step,sourceWidth,height]of[['wave',9,64,640,8],['spinner',9,14,140,14],['autosave',8,18,162,30]])for(const frame of[0,4,last]){
    const p=props();p.templates=[kind];p.scale=2;p.state[kind==='autosave'?'autoSaveFrame':kind==='wave'?'waveFrame':'spinnerFrame']=frame;
    const html=render(p);assert.ok(html.includes(`data-frame="${frame}"`));
    assert.ok(html.includes(`width:${sourceWidth*2}px;height:${height*2}px;left:${frame===0?'0':-frame*step*2+'px'}`));
    assert.ok(html.includes('class="mc-image mc-progress-indicator__strip"'));assert.ok(!html.includes('NaN'));
  }
});

test('image clip policies are explicit and custom Web clip never derives current over total',()=>{
  const p=props();p.templates=['fancy','custom'];p.state.percentage=.25;p.customBar.clipRatio=.6;
  const visible=render(p);assert.match(visible,/clip-path:inset\(0 75% 0 0\)/);assert.match(visible,/clip-path:inset\(0 40% 0 0\)/);
  assert.match(visible,/data-current-amount="17" data-total-amount="999"/);
  p.imageClipPolicy='left-removal-web';assert.match(render(p),/clip-path:inset\(0 0 0 25%\)/);
});

test('visible unrecovered native renderer rejects before rendering while hidden custom remains legal',()=>{
  const p=props();p.customBar={kind:'native-unrecovered'};
  assert.throws(()=>planProgressIndicators(p),/progress_bar_renderer is unrecovered/);assert.throws(()=>render(p),/progress_bar_renderer is unrecovered/);
  p.state.loadingBarVisible=false;assert.doesNotThrow(()=>render(p));
  p.templates=['wave'];p.state.loadingBarVisible=true;assert.doesNotThrow(()=>render(p));
});

test('latent invalid frames ratios flags geometry budgets and malformed tuples are rejected atomically',()=>{
  for(const update of[p=>p.state.waveFrame=10,p=>p.state.spinnerFrame=-1,p=>p.state.autoSaveFrame=9,p=>p.state.waveFrame=.5,p=>p.state.percentage=NaN,p=>p.state.percentage=1.01,p=>p.state.currentAmount=Infinity,p=>p.state.loadingBarVisible=1,p=>p.scale=1.5,p=>p.availableSize=[8192,8192],p=>p.availableSize=[10,100],p=>p.templates=['wave','wave'],p=>p.customBar.clipRatio=NaN]){
    const p=props();p.state.barAnimationVisible=p.state.spinnerAnimationVisible=p.state.autoSaveVisible=false;update(p);assert.throws(()=>planProgressIndicators(p));
  }
  let reads=0;const p=props();Object.defineProperty(p.availableSize,'0',{get(){reads++;throw Error('getter executed');},enumerable:true});
  assert.throws(()=>planProgressIndicators(p),/own data fields/);assert.equal(reads,0);
});

test('planning and SSR have no ref writes callbacks or playback timers',()=>{
  const p=props();let callbacks=0;const ref={current:null},old=globalThis.setTimeout;
  globalThis.setTimeout=()=>{throw Error('unexpected animation task');};
  try{assert.doesNotThrow(()=>renderToStaticMarkup(React.createElement(ProgressIndicators,{...p,ref:()=>{callbacks++;}})));planProgressIndicators(p,ref);}
  finally{globalThis.setTimeout=old;}
  assert.equal(ref.current,null);assert.equal(callbacks,0);assert.ok(Object.isFrozen(planProgressIndicators(p).state));
  assert.throws(()=>planProgressIndicators({...p,children:()=>{callbacks++;}}),/owns its visual leaves/);assert.equal(callbacks,0);
});
