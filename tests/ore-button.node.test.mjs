import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';

const root=process.cwd(),rootRequire=createRequire(import.meta.url);
const compiled=await build({stdin:{contents:"export {OreButton} from './src/ore-button';export {OreActionBar} from './src/ore-action-bar';",resolveDir:root},bundle:true,platform:'node',format:'cjs',jsx:'automatic',write:false,external:['react','react/*']});
const load=require=>{const module={exports:{}};vm.runInThisContext('(function(require,module,exports){'+compiled.outputFiles[0].text+'\n})')(require,module,module.exports);return module.exports;};
const attr=(tag,name)=>[...tag.matchAll(/\s([:\w-]+)="([^"]*)"/g)].find(match=>match[1].toLowerCase()===name.toLowerCase())?.[2];
const peers=[rootRequire];for(const major of[18,19])try{const require=createRequire(path.join(root,`.cache/consumer-react${major}/package.json`));if(!peers.some(r=>r('react').version===require('react').version))peers.push(require);}catch{}

test('OreButton and ActionBar retain native callback/ref objects without synthetic routing',()=>{
 const jsx=(type,props,key)=>({type,props,key}),react={createContext:value=>({value}),useContext:context=>context.value,forwardRef:render=>({render})};
 const {OreButton,OreActionBar}=load(name=>name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:rootRequire(name));
 const observed=[],events=Object.fromEntries(['onClick','onPointerDown','onPointerUp','onKeyDown','onKeyUp','onFocus','onBlur'].map(name=>[name,e=>observed.push([name,e])])),ref=()=>{};
 const button=OreButton.render({children:'Save',...events},ref),event={currentTarget:{tagName:'BUTTON'},defaultPrevented:false};assert.equal(button.type,'button');assert.equal(button.props.ref,ref);for(const[name,handler]of Object.entries(events)){assert.equal(button.props[name],handler);button.props[name](event);}assert.deepEqual(observed,Object.keys(events).map(name=>[name,event]));assert.equal(event.defaultPrevented,false);
 const onClick=()=>{},bar=OreActionBar.render({label:'Actions',onClick,children:[]},ref);assert.equal(bar.props.children.type,'div');assert.equal(bar.props.children.props.ref,ref);assert.equal(bar.props.children.props.onClick,onClick);
});

for(const require of peers){
 const React=require('react'),ssr=require('react-dom/server').renderToStaticMarkup,{OreButton,OreActionBar}=load(require),el=React.createElement;
 test(`Ore source variants retain real native buttons, rich children and zero SSR effects (${React.version})`,()=>{
  const saved=new Map(),attempts=[],warnings=[],oldError=console.error,oldWarn=console.warn;let calls=0,refs=0;
  console.error=(...args)=>warnings.push(args.map(String).join(' '));console.warn=console.error;
  for(const name of['fetch','Image','createImageBitmap','OffscreenCanvas','requestAnimationFrame','setTimeout','setInterval']){saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,value(){attempts.push(name);throw Error('SSR IO');}});}
  try{for(const variant of['primary','secondary','destructive'])for(const disabled of[false,true]){const html=ssr(el(OreButton,{key:variant,ref:()=>refs++,variant,disabled,horizontal:true,onClick:()=>calls++,onKeyDown:()=>calls++,onFocus:()=>calls++,icon:el('span',null,'Host icon'),name:'save',value:'raw'},el('strong',null,'Host Save')));const button=html.match(/^<button[^>]*>/)[0];assert.equal(attr(button,'type'),'button');assert.equal(attr(button,'data-variant'),variant);assert.equal(attr(button,'data-horizontal'),'true');assert.equal(attr(button,'disabled')!==undefined,disabled);assert.equal(attr(button,'name'),'save');assert.equal(attr(button,'value'),'raw');assert(html.includes('<strong>Host Save</strong>'));assert(html.includes('Host icon'));assert(html.includes('aria-hidden="true"'));assert.equal(attr(button,'variant'),undefined);assert(!html.includes('<img'));assert(!html.includes('<canvas'));}assert.deepEqual(attempts,[]);assert.deepEqual(warnings,[]);assert.equal(calls,0);assert.equal(refs,0);}finally{console.error=oldError;console.warn=oldWarn;for(const[name,d]of saved){if(d)Object.defineProperty(globalThis,name,d);else delete globalThis[name];}}
 });
 test(`Ore button defaults/native type/custom attributes remain source-scoped (${React.version})`,()=>{
  const html=ssr(el(OreButton,{id:'host-save',className:'host-button',style:{maxWidth:200},'aria-label':'Save icon','data-host':'yes',type:'submit',icon:el('span',null,'Whole host icon')}));const button=html.match(/^<button[^>]*>/)[0];assert.equal(attr(button,'type'),'submit');assert.equal(attr(button,'aria-label'),'Save icon');assert.equal(attr(button,'data-host'),'yes');assert.equal(attr(button,'data-variant'),'secondary');assert.equal(attr(button,'data-horizontal'),undefined);assert(attr(button,'class').includes('host-button'));assert(attr(button,'style').includes('max-width:200px'));assert(!html.includes('mc-ore-button__label'));assert.equal(attr(ssr(el(OreButton,null,'Default')).match(/^<button[^>]*>/)[0],'type'),'button');assert.equal(attr(ssr(el(OreButton,{type:'reset'},'Reset')).match(/^<button[^>]*>/)[0],'type'),'reset');
 });
 test(`Ore icon gap uses nullness rather than Boolean(children) (${React.version})`,()=>{
  for(const children of['',0,false])assert(ssr(el(OreButton,{icon:'Host'},children)).includes('data-with-label="true"'));
  for(const children of[null,undefined])assert(!ssr(el(OreButton,{icon:'Host'},children)).includes('data-with-label'));
 });
 test(`OreActionBar accepts zero/one/many children and forwards labelled native div (${React.version})`,()=>{
  for(const count of[0,1,3]){const html=ssr(el(OreActionBar,{ref:()=>{throw Error('SSR ref');},label:'Host actions',id:'host-bar',className:'host-actions','data-host':'yes'},...Array.from({length:count},(_,i)=>el(OreButton,{key:i,horizontal:true},'Action'+i))));const bar=html.match(/^<div[^>]*>/)[0];assert.equal(attr(bar,'role'),'group');assert.equal(attr(bar,'aria-label'),'Host actions');assert.equal(attr(bar,'id'),'host-bar');assert.equal(attr(bar,'data-host'),'yes');assert(attr(bar,'class').includes('host-actions'));assert.equal((html.match(/<button/g)??[]).length,count);}
 });
 test(`OreActionBar shares units without changing explicit button profile or ARIA (${React.version})`,()=>{
  const html=ssr(el(OreActionBar,{guiScale:2,locale:'zh_CN',label:'Default','aria-label':'Explicit'},el(OreButton,{horizontal:true},'继承'),el(OreButton,{guiScale:1},'Own')));assert.equal((html.match(/--mc-ore-unit:10px/g)??[]).length,2);assert.equal((html.match(/--mc-ore-unit:5px/g)??[]).length,1);assert(html.includes('Noto Sans SC'));assert.equal(attr(html.match(/^<div[^>]*>/)[0],'aria-label'),'Explicit');const labelled=ssr(el(OreActionBar,{label:'Default','aria-labelledby':'host-heading'}));assert.equal(attr(labelled.match(/^<div[^>]*>/)[0],'aria-label'),undefined);assert.equal(attr(labelled.match(/^<div[^>]*>/)[0],'aria-labelledby'),'host-heading');
 });
 test(`Ore malformed Web profiles reject before resource or event work (${React.version})`,()=>{
  for(const patch of[{variant:'hero'},{horizontal:'true'},{disabled:1},{guiScale:0},{guiScale:Infinity},{guiScale:2000},{locale:42},{type:'link'}])assert.throws(()=>ssr(el(OreButton,{...patch},'Host')),e=>e instanceof TypeError||e instanceof RangeError);
  for(const patch of[{label:42},{guiScale:0},{locale:42}])assert.throws(()=>ssr(el(OreActionBar,patch)),e=>e instanceof TypeError||e instanceof RangeError);
 });
}

test('Ore elevated geometry, independent state palette, font roles and neutral bar match strong source',async()=>{
 const button=await readFile(path.join(root,'src/ore-button.css'),'utf8'),bar=await readFile(path.join(root,'src/ore-action-bar.css'),'utf8');
 assert(button.includes('height:calc(4 * var(--mc-ore-unit))'));assert(button.includes('padding:0 0 calc(.4 * var(--mc-ore-unit))'));assert(button.includes('border:calc(.2 * var(--mc-ore-unit)) solid #1e1e1f'));assert.equal((40+4+2+2)/10,4.8);assert(button.includes('margin-top:calc(.4 * var(--mc-ore-unit));padding-bottom:0'));assert(!button.includes('margin-top:calc(-.4'));assert(button.includes('top:calc(-.6 * var(--mc-ore-unit))'));
 for(const color of['#3c8527','#2a641c','#1d4d13','#d0d1d4','#b1b2b5','#58585a','#ca3636','#c02d2d','#ad1d1d','#8c8d90'])assert(button.includes(color));
 assert(button.includes('font-size:calc(1.6 * var(--mc-ore-unit))'));assert(button.includes('line-height:calc(2 * var(--mc-ore-unit))'));assert(button.includes('letter-spacing:calc(.04 * var(--mc-ore-unit))'));assert(button.includes('text-shadow:none'));assert(button.includes('height:calc(2.4 * var(--mc-ore-unit))'));assert(button.includes('margin-right:calc(.8 * var(--mc-ore-unit))'));assert(button.includes(':disabled .mc-ore-button__specular{display:none}'));assert(!/:active[^}]*--mc-ore-specular/.test(button));assert(!button.includes('filter:'));assert(button.includes('outline:2px solid Highlight'));
 assert(bar.includes("@import './ore-button.css'"));assert(bar.includes('background:#48494a'));assert(bar.includes('border-top-width:calc(.2 * var(--mc-ore-unit))'));assert(bar.includes('border-bottom-width:calc(.2 * var(--mc-ore-unit))'));assert(bar.includes('border-top-color:rgba(255,255,255,.1)'));assert(bar.includes('border-bottom-color:rgba(0,0,0,.3)'));assert(bar.includes('gap:calc(.8 * var(--mc-ore-unit))'));assert(bar.includes('padding:calc(1.6 * var(--mc-ore-unit))'));assert(bar.includes('flex:1 0 0'));assert(!bar.includes('overflow-x'));assert(!button.includes('data:image'));assert(button.includes('@media(forced-colors:active)')&&bar.includes('@media(forced-colors:active)'));
});
