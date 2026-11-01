import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import test from 'node:test';
import {build} from 'esbuild';
import {createElement, version as reactVersion} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const root=fileURLToPath(new URL('../',import.meta.url));
// Actual workspace React only. Installed React18/19 package tests are a separate
// gate; no cached consumer, copied peer or fake React implementation is used.
const compiled=await build({
  stdin:{contents:`
    export {projectProgressElementProps} from './src/progress-react-props';
    export {PROGRESS_WEB_LIMITS} from './src/progress-data';
    export {ProgressScreen} from './src/progress-screen';
    export {ProgressIndicators} from './src/progress-indicators';
    export {ProgressPackGrids,ProgressResourceDialog,ProgressCloudPanel,ProgressCloudConflictDialog} from './src/progress-public-parts';
    export {ProgressPackGrids as CoreGrids,ProgressResourceDialog as CoreResource} from './src/progress-packs';
    export {makeProgressScreenProps} from './tests/fixtures/progress-profile';`,resolveDir:root},
  platform:'node',format:'cjs',bundle:true,write:false,packages:'external',jsx:'automatic',target:'es2022',
  plugins:[{name:'actual-source-file-urls',setup(builder){builder.onLoad({filter:/\.tsx?$/},async args=>({contents:(await readFile(args.path,'utf8')).replaceAll('import.meta.url',JSON.stringify(pathToFileURL(args.path).href)),loader:args.path.endsWith('.tsx')?'tsx':'ts'}));}}],
});
const require=createRequire(new URL('../package.json',import.meta.url)),module={exports:{}};
new Function('require','module','exports',compiled.outputFiles[0].text)(require,module,module.exports);
const api=module.exports,project=api.projectProgressElementProps;
function marker(reads,key,options={}){
  const getter=()=>{reads.value++;throw new Error('warning getter must never execute');};
  if(options.flag!==false)Object.defineProperty(getter,'isReactWarning',{value:true});
  return {key,getter,descriptor:{get:getter,enumerable:false,configurable:true,...options.descriptor}};
}
function addMarker(props,spec){Object.defineProperty(props,spec.key,spec.descriptor);return props;}

test('React key/ref warning markers are identified entirely through descriptors',()=>{
  const reads={value:0},opaque={get secret(){throw new Error('opaque payload traversal');}},props={label:'Host',payload:opaque};
  const key=marker(reads,'key'),ref=marker(reads,'ref');addMarker(addMarker(props,key),ref);
  const result=project(props);
  assert.equal(reads.value,0);assert.equal(Object.getPrototypeOf(result),null);
  assert.deepEqual(Object.keys(result),['label','payload']);assert.equal(result.payload,opaque);
  assert.equal(Object.getOwnPropertyDescriptor(props,'key').get,key.getter);assert.equal(Object.getOwnPropertyDescriptor(props,'ref').get,ref.getter);
});

test('ordinary reserved accessors and forged nonreserved warning accessors remain rejected without reads',()=>{
  for(const key of['key','ref','ordinary'])for(const flagged of[false,true]){
    if(flagged&&key!=='ordinary')continue;
    const reads={value:0},props=addMarker({label:'Host'},marker(reads,key,{flag:flagged}));
    assert.throws(()=>project(props),TypeError);assert.equal(reads.value,0);
  }
  for(const descriptor of[{enumerable:true},{set(){throw new Error('setter must not execute');}}]){
    const reads={value:0},props=addMarker({},marker(reads,'key',{descriptor}));
    assert.throws(()=>project(props),TypeError);assert.equal(reads.value,0);
  }
});

test('a React warning flag must itself be an own true data descriptor',()=>{
  for(const kind of['flag-accessor','inherited-flag','false-flag']){
    let valueReads=0,flagReads=0;const getter=()=>{valueReads++;return 'unsafe';};
    if(kind==='flag-accessor')Object.defineProperty(getter,'isReactWarning',{get(){flagReads++;return true;}});
    else if(kind==='inherited-flag')Object.setPrototypeOf(getter,Object.create(Function.prototype,{isReactWarning:{value:true}}));
    else Object.defineProperty(getter,'isReactWarning',{value:false});
    const props={};Object.defineProperty(props,'ref',{get:getter,enumerable:false});
    assert.throws(()=>project(props),TypeError);assert.equal(valueReads,0);assert.equal(flagReads,0);
  }
});

test('normal enumerable key/ref data survives projection while nonenumerable data stays invalid',()=>{
  const callback=()=>{},value=project({key:'ordinary-data',ref:callback});
  assert.equal(value.key,'ordinary-data');assert.equal(value.ref,callback);
  for(const key of['key','ref','ordinary']){const props={};Object.defineProperty(props,key,{value:'not a framework getter'});assert.throws(()=>project(props),TypeError);}
  const symbol=Symbol('hidden metadata');assert.throws(()=>project({[symbol]:'value'}),TypeError);
});

test('property budgets are checked before descriptor/getter work and projected data still has its own cap',()=>{
  const cap=api.PROGRESS_WEB_LIMITS.recordFields,reads={value:0};
  const full=Object.fromEntries(Array.from({length:cap},(_,i)=>['p'+i,i]));
  addMarker(addMarker(full,marker(reads,'key')),marker(reads,'ref'));
  assert.equal(Object.keys(project(full)).length,cap);assert.equal(reads.value,0);
  let descriptorReads=0;
  const over={...full,...Object.fromEntries(Array.from({length:3},(_,i)=>['extra'+i,i]))};
  addMarker(addMarker(over,marker(reads,'key')),marker(reads,'ref'));
  const observed=new Proxy(over,{getOwnPropertyDescriptor(target,key){descriptorReads++;return Reflect.getOwnPropertyDescriptor(target,key);}});
  assert.throws(()=>project(observed),/finite property budget/);assert.equal(descriptorReads,0);assert.equal(reads.value,0);
  assert.throws(()=>project(Object.fromEntries(Array.from({length:cap+1},(_,i)=>['p'+i,i]))),/finite data-field budget/);
});

test(`actual workspace React ${reactVersion} element key/ref SSR reaches all public and private forwardRef entries without effects`,()=>{
  assert.match(reactVersion,/^(18|19)\./);
  let refs=0,semantic=0,services=0;const originalFetch=globalThis.fetch,originalError=console.error,originalWarn=console.warn,warnings=[];
  globalThis.fetch=()=>{services++;throw new Error('Unexpected service IO in SSR');};console.error=(...args)=>warnings.push(args);console.warn=(...args)=>warnings.push(args);
  try{
    const s=api.makeProgressScreenProps(),ref=()=>{refs++;};
    s.onAction=()=>{semantic++;};s.onPackSelectionChange=()=>{semantic++;};s.rootRef=ref;
    const popup={instanceId:'react-props-popup',factoryId:'test',description:'Packs',showRayTracingWarning:false,rayTracingWarning:'',joinEverythingText:'All',joinRequiredText:'Required'};
    const conflict={instanceId:'react-props-conflict',description:'Choose',localName:'Local',localDate:'Local date',cloudName:'Cloud',cloudDate:'Cloud date'};
    const grids={runKey:s.runKey,instanceId:'react-props-grid',packs:s.packs,profile:s.profile,size:[430,89],disabled:false,readOnly:false};
    const cases=[
      [api.ProgressScreen,{...s,controllerRef:ref},'mc-progress-screen'],
      [api.ProgressIndicators,{templates:['spinner'],state:s.indicators,availableSize:[200,100],scale:1,imageClipPolicy:'visible-fraction-web',customBar:s.profile.customBar,label:'Indicator'},'mc-progress-indicators'],
      [api.ProgressPackGrids,{...grids,onSelectionChange:()=>{semantic++;}},'mc-progress-public-grids'],
      [api.ProgressResourceDialog,{snapshot:s,popup},'mc-progress-public-resource'],
      [api.ProgressCloudPanel,{snapshot:s,kind:'fetch',imageClipPolicy:'visible-fraction-web'},'mc-progress-public-cloud'],
      [api.ProgressCloudConflictDialog,{snapshot:{...s,conflictPopup:conflict}},'mc-progress-public-conflict'],
      [api.CoreGrids,{...grids,onRawSelection:()=>{semantic++;}},'mc-progress-pack-grids'],
      [api.CoreResource,{...grids,popup,capabilities:s.capabilities,onRawSelection:()=>{semantic++;},onRawRequest:()=>{semantic++;}},'mc-progress-resource-dialog'],
    ];
    for(const[Component,props,expected]of cases){
      const element=createElement(Component,{...props,key:'actual-'+expected,ref});
      assert.equal(element.key,'actual-'+expected);
      // Inspect actual props descriptors without reading their special getters.
      const projected=project(element.props);assert(!Object.hasOwn(projected,'key'));
      const html=renderToStaticMarkup(element);assert(html.includes(expected),expected);
    }
    assert.equal(refs,0);assert.equal(semantic,0);assert.equal(services,0);assert.deepEqual(warnings,[]);
  }finally{globalThis.fetch=originalFetch;console.error=originalError;console.warn=originalWarn;}
});
