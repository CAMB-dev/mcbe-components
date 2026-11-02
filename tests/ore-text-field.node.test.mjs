import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';

const root=process.cwd(),rootRequire=createRequire(import.meta.url);
const built=await build({entryPoints:[path.join(root,'src/ore-text-field.tsx')],bundle:true,platform:'node',format:'cjs',jsx:'automatic',write:false,external:['react','react/*']});
function load(require){const module={exports:{}};vm.runInThisContext('(function(require,module,exports){'+built.outputFiles[0].text+'\n})')(require,module,module.exports);return module.exports;}
const peers=[rootRequire];
for(const major of[18,19]){try{const require=createRequire(path.join(root,`.cache/consumer-react${major}/package.json`));if(!peers.some(r=>r('react').version===require('react').version))peers.push(require);}catch{}}
const skins={normal:'https://host.example/whole-normal.png',disabled:'https://host.example/whole-disabled.png'};
const input=html=>html.match(/<input\b[^>]*>/)?.[0];
const attr=(tag,name)=>[...tag.matchAll(/\s([:\w-]+)="([^"]*)"/g)].find(match=>match[1].toLowerCase()===name.toLowerCase())?.[2];

test('Ore native handler and ref wiring preserves the exact host event objects',()=>{
 const jsx=(type,props,key)=>({type,props,key});
 const fakeReact={createContext:value=>({value}),useContext:context=>context.value,useId:()=>':cpu-wiring:',forwardRef:render=>({render})};
 const module={exports:{}};vm.runInThisContext('(function(require,module,exports){'+built.outputFiles[0].text+'\n})')(name=>name==='react'?fakeReact:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:rootRequire(name),module,module.exports);
 const names=['onChange','onInput','onFocus','onBlur','onCompositionStart','onCompositionUpdate','onCompositionEnd','onSelect','onKeyDown'];
 const observed=[],events=Object.fromEntries(names.map(name=>[name,event=>observed.push([name,event])])),nativeRef=()=>{},wrapperRef=()=>{},wrapperClick=()=>{};
 const tree=module.exports.OreTextField.render({skins,value:'00001x',...events,wrapperRef,wrapperProps:{onClick:wrapperClick}},nativeRef);
 const children=Array.isArray(tree.props.children)?tree.props.children:[tree.props.children],control=children.find(n=>n?.props?.className==='mc-ore-text-field__control'),native=control.props.children.find(n=>n.type==='input');
 assert.equal(tree.props.ref,wrapperRef);assert.equal(tree.props.onClick,wrapperClick);assert.equal(native.props.ref,nativeRef);assert.equal(native.props.value,'00001x');
 const event={currentTarget:{value:'001汉x'},defaultPrevented:false};for(const name of names){assert.equal(native.props[name],events[name]);native.props[name](event);}assert.deepEqual(observed,names.map(name=>[name,event]));assert.equal(event.defaultPrevented,false);
});

for(const require of peers){
 const React=require('react'),render=require('react-dom/server').renderToStaticMarkup,{OreTextField,OreFieldSection}=load(require),el=React.createElement;
 test(`Ore native text SSR remains literal, unfiltered and default-unbounded (React${React.version})`,()=>{
  let calls=0,refs=0;const errors=[],attempts=[],saved=new Map(),previousError=console.error;
  console.error=(...args)=>errors.push(args.map(String).join(' '));
  for(const name of['fetch','Image','createImageBitmap','OffscreenCanvas','requestAnimationFrame','setTimeout','setInterval']){saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,value(){attempts.push(name);throw Error('SSR IO');}});}
  try{
   const html=render(el(OreTextField,{key:'actual-key',ref:()=>refs++,wrapperRef:()=>refs++,skins,value:'00001x <汉>',onChange:()=>calls++,onInput:()=>calls++,onFocus:()=>calls++,onBlur:()=>calls++,onCompositionStart:()=>calls++,onCompositionUpdate:()=>calls++,onCompositionEnd:()=>calls++,placeholder:'Host placeholder',name:'port',inputMode:'numeric'}));
   const tag=input(html);assert.equal(attr(tag,'type'),'text');assert.equal(attr(tag,'value'),'00001x &lt;汉&gt;');assert.equal(attr(tag,'name'),'port');assert.equal(attr(tag,'inputmode'),'numeric');assert.equal(attr(tag,'maxlength'),undefined);assert.equal(attr(tag,'placeholder'),'Host placeholder');assert(!/<canvas|<script|<img/.test(html));assert(html.includes('--mc-ore-unit:5px'));assert(html.includes(skins.normal));assert(html.includes(skins.disabled));assert.equal(calls,0);assert.equal(refs,0);assert.deepEqual(errors,[]);assert.deepEqual(attempts,[]);
  }finally{console.error=previousError;for(const[name,d]of saved){if(d)Object.defineProperty(globalThis,name,d);else delete globalThis[name];}}
 });
 test(`Ore input/wrapper attributes retain their actual native scope (React${React.version})`,()=>{
  const html=render(el(OreTextField,{skins,defaultValue:'001x',id:'host-input',className:'native-class',style:{letterSpacing:'2px'},maxLength:20,readOnly:true,wrapperProps:{id:'host-wrapper',className:'host-container',style:{maxWidth:240},'data-host':'wrapper'}}));
  const tag=input(html),wrapper=html.match(/^<div\b[^>]*>/)[0];assert.equal(attr(tag,'id'),'host-input');assert(attr(tag,'class').includes('native-class'));assert.equal(attr(tag,'readonly'),'');assert.equal(attr(tag,'maxlength'),'20');assert(attr(tag,'style').includes('letter-spacing:2px'));assert(!tag.includes('host-container'));assert.equal(attr(wrapper,'id'),'host-wrapper');assert.equal(attr(wrapper,'data-host'),'wrapper');assert(attr(wrapper,'class').includes('host-container'));assert(attr(wrapper,'style').includes('max-width:240px'));assert(!wrapper.includes('native-class'));
 });
 test(`Ore section and invalid message merge user ARIA references (React${React.version})`,()=>{
  const html=render(el(OreFieldSection,{ref:()=>{throw Error('SSR ref');},label:'Host section name',description:'Host description',guiScale:2,locale:'zh_CN',sectionProps:{id:'host-section',className:'source-section'}},el(OreTextField,{skins,id:'literal-native-id','aria-labelledby':'outside outside','aria-describedby':'extra-description',invalid:true,invalidMessage:'Host validation message',defaultValue:'bad port'})));
  const tag=input(html),label=html.match(/<div id="([^"]+)" class="mc-ore-field-section__label"/)[1],description=html.match(/<div id="([^"]+)" class="mc-ore-field-section__description"/)[1],feedback=html.match(/<div id="([^"]+)" class="mc-ore-text-field__feedback"/)[1];
  assert.equal(attr(tag,'id'),'literal-native-id');assert.deepEqual(attr(tag,'aria-labelledby').split(' '),['outside',label]);assert.deepEqual(attr(tag,'aria-describedby').split(' '),['extra-description',description,feedback]);assert.equal(attr(tag,'aria-invalid'),'true');assert(html.includes('--mc-ore-unit:10px'));assert(html.includes('Noto Sans SC'));assert(html.includes('Host validation message'));assert(!html.includes('role="alert"'));assert.equal((html.match(/mc-ore-field-section__spacer/g)??[]).length,2);
 });
 test(`Ore validation is host feedback without inverse source state (React${React.version})`,()=>{
  const html=render(el(OreTextField,{skins,invalid:false,invalidMessage:'Must stay absent','aria-invalid':'grammar',disabled:true,defaultValue:'001x'}));const tag=input(html);assert.equal(attr(tag,'disabled'),'');assert.equal(attr(tag,'aria-invalid'),'grammar');assert(!html.includes('Must stay absent'));assert(!tag.includes('skins='));assert(!tag.includes('guiScale='));assert(html.includes('data-disabled="true"'));assert(html.includes('data-focus-policy="web-system-outline"'));
 });
 test(`Ore optional description and nested section context remain independent (React${React.version})`,()=>{
  const html=render(el(OreFieldSection,{label:'Outer',guiScale:2},el(OreFieldSection,{label:'Inner',guiScale:1},el(OreTextField,{skins,defaultValue:'Raw'}))));const tag=input(html);assert.equal(attr(tag,'aria-describedby'),undefined);const labels=[...html.matchAll(/<div id="([^"]+)" class="mc-ore-field-section__label"/g)].map(m=>m[1]);assert.equal(attr(tag,'aria-labelledby'),labels[1]);assert(!attr(tag,'aria-labelledby').includes(labels[0]));
 });
 test(`Ore individual aria-label overrides automatic section naming only (React${React.version})`,()=>{
  const named=render(el(OreFieldSection,{label:'Shared section',description:'Shared description'},el(OreTextField,{skins,'aria-label':'Individual host port',defaultValue:'00x'})));assert.equal(attr(input(named),'aria-label'),'Individual host port');assert.equal(attr(input(named),'aria-labelledby'),undefined);assert(attr(input(named),'aria-describedby'));
  const ids=render(el(OreFieldSection,{label:'Shared section'},el(OreTextField,{skins,'aria-label':'Individual host port','aria-labelledby':'host-label',defaultValue:'00x'})));assert(attr(input(ids),'aria-labelledby').startsWith('host-label '));
 });
 test(`Ore malformed explicit profiles reject before any native work (React${React.version})`,()=>{
  const bad=[{skins:null},{skins:{normal:'',disabled:'host'}},{skins:{normal:'host',disabled:'\nno'}},{skins:{normal:'x'.repeat(8193),disabled:'host'}},{guiScale:0},{guiScale:Infinity},{guiScale:2000},{locale:42},{value:19132},{defaultValue:null},{type:'number'},{invalid:'true'},{disabled:1},{readOnly:'yes'},{'aria-labelledby':42}];for(const patch of bad)assert.throws(()=>render(el(OreTextField,{skins,...patch})),e=>e instanceof TypeError||e instanceof RangeError);assert.throws(()=>render(el(OreFieldSection,{label:'Host',guiScale:0,children:null})),RangeError);
 });
}

test('Ore CSS preserves declared whole-image slice/spacing and accessible Web boundaries',async()=>{
 const css=await readFile(path.join(root,'src/ore-text-field.css'),'utf8');assert(css.includes('border-image-slice:3 1 1 1 fill'));assert(css.includes('calc(.6 * var(--mc-ore-unit)) calc(.2 * var(--mc-ore-unit)) calc(.2 * var(--mc-ore-unit)) calc(.2 * var(--mc-ore-unit))'));assert(css.includes('min-height:calc(4.8 * var(--mc-ore-unit))'));assert(css.includes('line-height:calc(2.8 * var(--mc-ore-unit))'));assert(css.includes('caret-color:#6cc349'));assert(css.includes('color:#b1b2b5'));assert(css.includes('color:#58585a'));assert(css.includes('padding:calc(1.2 * var(--mc-ore-unit)) calc(2.4 * var(--mc-ore-unit))'));assert(css.includes('height:calc(.4 * var(--mc-ore-unit))'));assert(css.includes('@media(forced-colors:active)'));assert(css.includes('.mc-ore-text-field__skin{display:none}'));assert(css.includes('background:Field'));assert(css.includes('outline:2px solid Highlight'));assert(!/\b(?:red|shake|keyframes)\b/i.test(css));assert(!css.includes('data:'));assert(!css.includes('baseTextField_neutral80'));assert(!css.includes('maxLength'));assert(!/\.mc-ore-field-section\{[^}]*\bheight:/.test(css));
});
