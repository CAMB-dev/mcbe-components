import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {existsSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const root = process.cwd(), require = createRequire(import.meta.url), hash = bytes => createHash('sha256').update(bytes).digest('hex');
function loader(peer) {const cache = new Map(); return function load(file) {
  file = path.resolve(root, file); if (cache.has(file)) return cache.get(file).exports;
  const module = {exports: {}}; cache.set(file, module);
  const source = readFileSync(file, 'utf8').replaceAll('import.meta.url', JSON.stringify(pathToFileURL(file).href));
  const js = ts.transpileModule(source, {fileName: file, compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true}}).outputText;
  const local = id => {if (!id.startsWith('.')) return peer(id); const stem = path.resolve(path.dirname(file), id), target = [stem, stem + '.ts', stem + '.tsx'].find(existsSync); assert(target, stem); return load(target);};
  vm.runInThisContext('(function(require,module,exports){' + js + '\n})', {filename: file})(local, module, module.exports); return module.exports;
};}
const glyphURL = pathToFileURL(path.join(root, 'src/assets/document-viewer/chevron_left.png')).href;
function section(id = 'game', overrides = {}) {return {kind: 'section', id, sourceControl: id + '_button', ignored: false, visible: true, enabled: true,
  label: id === 'game' ? 'Game' : 'Multiplayer', viewBinding: id + '_button_toggle', sourceIndex: 7, panelTitle: 'createWorldScreen.' + id + '.settings',
  glyph: {size: [4, 7], outline: {src: glyphURL, sourceSize: [4, 7], visible: true}, color: {src: glyphURL, sourceSize: [4, 7], visible: true}}, ...overrides};}
function props(overrides = {}) {return {label: 'World settings pages', width: 130, scale: 2, font: {family: 'monospace', size: 10, lineHeight: 10},
  value: 'game', sourceDefaultIndex: 0, toggleOnHover: true, hoverPolicy: 'activation-only', hiddenSlots: 'reserve',
  items: [{kind: 'group', id: 'world-label', sourceControl: 'selector_group_label_1', ignored: false, visible: true, enabled: true, label: 'World', height: 10},
    section(), {kind: 'spacer', id: 'gap', sourceControl: 'spacer_01', ignored: false, visible: true, enabled: true, size: [2, 8]}, section('multiplayer')], ...overrides};}
const peers = [18, 19].map(major => createRequire(path.join(root, '.cache/consumer-react' + major + '/package.json')));

function sourceProps(patch={}) {const p=props();delete p.items;return {...p,nodes:[
 {kind:'source-stack',id:'outer',sourceControl:'world_section.selector',ignored:false,visible:true,enabled:true,children:[
  {kind:'group',id:'heading',sourceControl:'world_section.group',ignored:false,visible:true,enabled:true,label:'World',height:10},
  section('game'),{kind:'source-stack',id:'nested',sourceControl:'world_section.nested',ignored:false,visible:true,enabled:true,children:[section('multiplayer')]},
  {kind:'source-slot',id:'launch',sourceControl:'world_section.launch',ignored:false,visible:true,enabled:true,height:35,content:null}]}],...patch};}
function inputSection(tree,id){for(const n of tree){if(n.id===id)return n;if(n.kind==='source-stack'){const found=inputSection(n.children,id);if(found)return found;}}}
for(const [at,peer]of peers.entries()){
 const React=peer('react'),render=peer('react-dom/server').renderToStaticMarkup,ui=loader(peer)('src/settings-navigation.tsx'),el=React.createElement;assert.equal(Number(React.version.split('.')[0]),18+at);
 test('private tree preserves source wrappers/slots/order and unified radio group SSR '+React.version,()=>{
  const p=sourceProps(),slot=inputSection(p.nodes,'launch');slot.content=el('button',{'data-host-launch':'yes'},'Launch');
  inputSection(p.nodes,'multiplayer').glyphContent=el('span',{'data-pack-glyph':'original'},'Glyph');inputSection(p.nodes,'multiplayer').sourceLabelMaxInset=[34,0];
  const html=render(el(ui.SourceSettingsNavigation,p));assert.equal((html.match(/role="radiogroup"/g)||[]).length,1);assert.equal((html.match(/role="radio"/g)||[]).length,2);assert.equal((html.match(/tabindex="0"/g)||[]).length,1);
  for(const name of ['outer','nested','launch'])assert(html.includes('data-source-settings-node="'+name+'"'));
  assert(html.indexOf('data-source-settings-node="outer"')<html.indexOf('data-settings-navigation-id="game"'));assert(html.indexOf('data-source-settings-node="nested"')<html.indexOf('data-settings-navigation-id="multiplayer"'));assert(html.includes('data-host-launch="yes"'));assert(html.includes('height:70px'));assert(html.includes('data-pack-glyph="original"'));assert(html.includes('width:calc(100% - 68px)'));assert(html.includes('max-height:50px'));
  assert.equal((html.match(/alt=""/g)||[]).length,2,'Only game retains two default original images');
 });
 test('private ancestors independently govern ignored/visible/enabled with native inert SSR '+React.version,()=>{
  for(const mode of ['ignored','visible','enabled']){const p=sourceProps();p.nodes[0][mode]=mode==='ignored';const html=render(el(ui.SourceSettingsNavigation,p));
   if(mode==='ignored'){assert(!html.includes('data-source-settings-node="outer"'));assert(!html.includes('role="radio"'));}
   else{assert(html.includes('inert=""'));assert.equal((html.match(/tabindex="0"/g)||[]).length,0);assert.equal((html.match(/role="radio" aria-checked="(?:true|false)" disabled=""/g)||[]).length,2);}
  }
  const p=sourceProps({hiddenSlots:'collapse'});p.nodes[0].visible=false;const html=render(el(ui.SourceSettingsNavigation,p));assert(html.includes('hidden=""'));assert(html.includes('height:0'));
 });
 test('private import/SSR has no service IO, callback refs or ignored host content rendering '+React.version,()=>{
  const descriptors=new Map(),attempts=[],warnings=[],old=console.error;let calls=0;for(const name of ['fetch','Image','FontFace','OffscreenCanvas','createImageBitmap','setTimeout','setInterval','requestAnimationFrame']){descriptors.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,value(){attempts.push(name);throw Error(name);}});}console.error=(...args)=>warnings.push(args.map(String).join(' '));
  try{const fresh=loader(peer)('src/settings-navigation.tsx'),p=sourceProps({inert:true,ref(){calls++;},nodeRefs:{outer(){calls++;}},itemRefs:{game(){calls++;}},onValueChange(){calls++;}});inputSection(p.nodes,'launch').ignored=true;inputSection(p.nodes,'launch').content=el(()=>{calls++;return 'should not render';});const html=render(el(fresh.SourceSettingsNavigation,p));assert(html.includes('inert=""'));assert.equal(calls,0);assert.deepEqual(attempts,[]);assert.deepEqual(warnings,[]);}finally{console.error=old;for(const[name,d]of descriptors)if(d)Object.defineProperty(globalThis,name,d);else delete globalThis[name];}
 });
 test('public path never leaks private root props and does not gain a source tree SSR '+React.version,()=>{
  const html=render(el(ui.SettingsNavigation,props({nodes:[],nodeRefs:{}})));assert(!html.includes('nodes=')&&!html.includes('nodeRefs=')&&!html.includes('data-source-settings-tree'));assert(!html.includes('mc-settings-navigation-section__label" style='));
 });
}
function walk(node, predicate, found = []) {if (!node || typeof node !== 'object') return found; if (predicate(node)) found.push(node); for (const child of Array.isArray(node.props?.children) ? node.props.children.flat(Infinity) : [node.props?.children]) walk(child, predicate, found); return found;}
function harness() {
  let cursor = 0, slots = [], effects = []; const stores = new Map(), jsx = (type, props, key) => ({type, props, key});
  const React = {version: '18.3.1', forwardRef: render => ({render}), useRef: value => slots[cursor++] ?? (slots[cursor - 1] = {current: value}), useState: initial => {const at = cursor++; slots[at] ??= {value: initial}; return [slots[at].value, value => {slots[at].value = value;}];}, useCallback: fn => fn, useEffect: fn => effects.push(fn), useLayoutEffect: fn => effects.push(fn)};
  const peer = id => id === 'react' ? React : id === 'react/jsx-runtime' ? {jsx, jsxs: jsx} : require(id), ui = loader(peer)('src/settings-navigation.tsx');
  return {ui, render(type, p, ref, key = type) {slots = stores.get(key) ?? []; stores.set(key, slots); cursor = 0; effects = []; const view = type.render(p, ref); for (const effect of effects) effect(); return view;}};
}
function clock() {const tasks = [], micro = [], doc = {querySelector: () => null, defaultView: {setTimeout: fn => tasks.push(fn), queueMicrotask: fn => micro.push(fn), getComputedStyle: () => ({visibility: 'visible'})}}; return {doc, flush() {while (tasks.length) tasks.shift()(); while (micro.length) micro.shift()();}};}
function node(doc) {return {ownerDocument: doc, isConnected: true, disabled: false, matches: () => false, closest: () => null, getClientRects: () => [{}]};}
function event(owner, patch = {}) {return {target: owner, currentTarget: owner, defaultPrevented: false, nativeEvent: {defaultPrevented: false}, persist() {}, preventDefault() {this.defaultPrevented = true; this.nativeEvent.defaultPrevented = true;}, isDefaultPrevented() {return this.defaultPrevented;}, isPropagationStopped: () => false, ...patch};}

function mountSource(h,p,ref){const root=h.render(h.ui.SourceSettingsNavigation,p,ref,'root'),child=walk(root,n=>n.type?.render?.name==='Section'&&n.props.item.id==='multiplayer')[0];return{root,child,button:h.render(child.type,child.props,child.props.ref,'section')};}
test('private tree bounded validation rejects duplicate wrapper/leaf IDs, sparse/getter/cyclic arrays and slot/inset budgets',()=>{
 const peer=peers[0],ui=loader(peer)('src/settings-navigation.tsx'),render=p=>peer('react-dom/server').renderToStaticMarkup(peer('react').createElement(ui.SourceSettingsNavigation,p));
 let reads=0;const getter=sourceProps();Object.defineProperty(getter.nodes[0],'children',{get(){reads++;return[];}});assert.throws(()=>render(getter),/accessors/);assert.equal(reads,0);
 const sparse=sourceProps();sparse.nodes[0].children=new Array(1);assert.throws(()=>render(sparse),/dense/);
 const dup=sourceProps();dup.nodes[0].id='game';assert.throws(()=>render(dup),/unique/);
 const cycle=sourceProps();cycle.nodes[0].children=[cycle.nodes[0]];assert.throws(()=>render(cycle),/unique|levels/);
 const missing=sourceProps();delete inputSection(missing.nodes,'launch').content;assert.throws(()=>render(missing),/explicit host content/);
 const budget=sourceProps();inputSection(budget.nodes,'launch').height=8192;assert.throws(()=>render(budget),/budget/);
 for(const inset of [[125,0],[34,26],[-1,0],[NaN,0]]){const p=sourceProps();inputSection(p.nodes,'game').sourceLabelMaxInset=inset;assert.throws(()=>render(p));}
});
test('private radio requests share original late-veto/identity/ancestor flags/fieldset/modal guards',()=>{
 for(const mode of ['accept','late-veto','ancestor-visible','ancestor-enabled','ancestor-ignored','value','identity','fieldset','modal','unmount']){
  const h=harness(),c=clock(),seen=[],p=sourceProps({onValueChange:(value,d)=>seen.push({value,d})}),view=mountSource(h,p),owner=node(c.doc);view.button.props.ref(owner);const e=event(owner);view.button.props.onClick(e);
  if(mode==='late-veto')e.nativeEvent.defaultPrevented=true;
  if(mode.startsWith('ancestor-')){p.nodes[0][mode.slice(9)]=mode==='ancestor-ignored';const next=h.render(h.ui.SourceSettingsNavigation,p,undefined,'root');const child=walk(next,n=>n.type?.render?.name==='Section'&&n.props.item.id==='multiplayer')[0];if(child)h.render(child.type,child.props,undefined,'section');else view.button.props.ref(null);}
  if(mode==='value')h.render(view.child.type,{...view.child.props,model:{...view.child.props.model,value:'multiplayer'}},undefined,'section');
  if(mode==='identity')h.render(view.child.type,{...view.child.props,item:{...view.child.props.item,viewBinding:'new'}},undefined,'section');
  if(mode==='fieldset')owner.matches=()=>true;if(mode==='modal')c.doc.querySelector=()=>({contains:()=>false});if(mode==='unmount')view.button.props.ref(null);
  e.currentTarget=null;c.flush();assert.equal(seen.length,mode==='accept'?1:0,mode);if(mode==='accept'){assert.equal(seen[0].d.control,owner);assert.equal(seen[0].d.event.currentTarget,owner);assert.equal(seen[0].d.sourceIndex,7);assert.equal(p.value,'game');}
 }
});
test('private keyboard roves across wrappers but leaves slot/nested/IME/caller-veto owners alone',()=>{
 const h=harness(),c=clock(),p=sourceProps(),view=mountSource(h,p);let focused=0;
 const owner={ownerDocument:c.doc,contains:()=>true,closest:()=>null,querySelectorAll:()=>[a,b,slotRadio]},a=node(c.doc),b=node(c.doc),slotRadio=node(c.doc);
 for(const [n,value]of [[a,1],[b,2],[slotRadio,3]]){n.focus=()=>focused=value;n.closest=selector=>selector==='.mc-settings-navigation'?owner:selector==='[data-source-settings-slot]'&&n===slotRadio?{}:selector==='button[data-settings-navigation-id]'?n:null;}
 c.doc.activeElement=a;const e=event(owner,{target:a,key:'ArrowDown'});view.root.props.onKeyDown(e);assert.equal(focused,2);assert(e.defaultPrevented);
 for(const target of [{closest:()=>null},slotRadio,{closest:selector=>selector==='button[data-settings-navigation-id]'?{closest:()=>({})}:null}]){focused=0;const e=event(owner,{target,key:'Home'});view.root.props.onKeyDown(e);assert.equal(focused,0);assert.equal(e.defaultPrevented,false);}
 focused=0;view.root.props.onKeyDown(event(owner,{target:a,key:'End',nativeEvent:{isComposing:true}}));assert.equal(focused,0);
 const veto=h.render(h.ui.SourceSettingsNavigation,{...p,onKeyDown:e=>e.preventDefault()},undefined,'veto');veto.props.onKeyDown(event(owner,{target:a,key:'ArrowDown'}));assert.equal(focused,0);
});
test('private wrapper/slot refs preserve callback cleanup and disabled wrappers carry inert without cloning host controls',()=>{
 const h=harness(),seen=[],p=sourceProps({nodeRefs:{launch:value=>{seen.push(value);return()=>seen.push('cleanup');}}});inputSection(p.nodes,'launch').enabled=false;
 const root=h.render(h.ui.SourceSettingsNavigation,p,undefined,'root'),slot=walk(root,n=>n.type?.render?.name==='SourceWrapper'&&n.props.node.source.id==='launch')[0],view=h.render(slot.type,slot.props,slot.props.ref,'slot');
 assert.equal(view.props.inert,'');assert.equal(view.props['data-source-enabled'],false);assert.equal(view.props.ref({node:'actual'}),undefined);view.props.ref(null);assert.equal(seen.at(-1),'cleanup');assert.equal(seen.length,2);
});
test('strict private tree types retain public closure, original refs and required source identities',()=>{
 const file=path.join(root,'tests/__settings_navigation_source_contract__.tsx'),fixture=`import{createRef}from'react';import{SettingsNavigation,SourceSettingsNavigation,planSourceSettingsNavigation}from'../src/settings-navigation';import type{SourceSettingsNavigationNode,SourceSettingsNavigationProps,SourceSettingsNavigationPlan}from'../src/settings-navigation-source-model';
 const nodes:SourceSettingsNavigationNode[]=[{kind:'source-stack',id:'outer',sourceControl:'world_section.outer',ignored:false,visible:true,enabled:true,children:[{kind:'source-slot',id:'slot',sourceControl:'world_section.slot',ignored:false,visible:true,enabled:true,height:35,content:<button>Launch</button>}]},{...${JSON.stringify(section())},glyphContent:<span>Pack</span>,sourceLabelMaxInset:[34,0]}];
 const p:SourceSettingsNavigationProps={label:'World',width:130,scale:2,font:{family:'monospace',size:10,lineHeight:10},nodes,value:null,sourceDefaultIndex:0,toggleOnHover:false,hoverPolicy:'activation-only',hiddenSlots:'reserve'};
 const geometry:SourceSettingsNavigationPlan=planSourceSettingsNavigation(p);const box:readonly[number,number,number,number]=geometry.entries[0]!.box;
 const valid=<SourceSettingsNavigation {...p} ref={createRef<HTMLDivElement>()} nodeRefs={{slot:createRef<HTMLDivElement>()}} itemRefs={{game:createRef<HTMLButtonElement>()}}/>;
 // @ts-expect-error no private node tree on public API
 const publicTree=<SettingsNavigation {...p} items={[]} nodes={nodes}/>;
 // @ts-expect-error explicit host slot height is required
 const bad:SourceSettingsNavigationNode={kind:'source-slot',id:'s',sourceControl:'s',ignored:false,visible:true,enabled:true,content:null};
 // @ts-expect-error wrapper refs are real divs
 const ref=<SourceSettingsNavigation {...p} nodeRefs={{slot:createRef<HTMLButtonElement>()}}/>;
 // @ts-expect-error private metadata is readonly
 geometry.entries.push(geometry.entries[0]!);
 // @ts-expect-error plan height is immutable
 geometry.height=42;
 // @ts-expect-error private planner is not a new public function
 import{planSourceSettingsNavigation as PublicSourcePlan}from'../src/index';
 // @ts-expect-error private seam is absent from public barrel
 import{SourceSettingsNavigation as PublicSourceNavigation}from'../src/index';
 void[valid,geometry,box,publicTree,bad,ref,PublicSourcePlan,PublicSourceNavigation];`;
 const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,jsx:ts.JsxEmit.ReactJSX,strict:true,noUnusedLocals:true,noUnusedParameters:true,noUncheckedIndexedAccess:true,verbatimModuleSyntax:true,noEmit:true,skipLibCheck:true},host=ts.createCompilerHost(options),get=host.getSourceFile.bind(host);host.getSourceFile=(name,...args)=>path.resolve(name)===file?ts.createSourceFile(file,fixture,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX):get(name,...args);const diagnostics=ts.getPreEmitDiagnostics(ts.createProgram([file],options,host));assert.equal(diagnostics.length,0,ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:f=>f,getCurrentDirectory:()=>root,getNewLine:()=>'\n'}));
});


test('private pure plan uses the existing sourceTree preorder, logical sibling cursors and exact leaf widths',()=>{
 const ui=loader(peers[0])('src/settings-navigation.tsx'),p=sourceProps();p.nodes.push({kind:'spacer',id:'thin-gap',sourceControl:'world_section.gap',ignored:false,visible:true,enabled:true,size:[7,4]},section('tail'));
 const before=JSON.stringify(p),plan=ui.planSourceSettingsNavigation(p);assert.equal(JSON.stringify(p),before);assert.deepEqual({width:plan.width,scale:plan.scale,height:plan.height},{width:130,scale:2,height:139});
 assert.deepEqual(plan.entries.map(e=>[e.id,e.kind,e.box]),[
  ['outer','source-stack',[0,0,130,105]],['heading','group',[0,0,130,10]],['game','section',[0,10,130,30]],['nested','source-stack',[0,40,130,30]],['multiplayer','section',[0,40,130,30]],['launch','source-slot',[0,70,130,35]],['thin-gap','spacer',[0,105,7,4]],['tail','section',[0,109,130,30]]]);
 assert(Object.isFrozen(plan)&&Object.isFrozen(plan.entries));for(const entry of plan.entries){assert(Object.isFrozen(entry)&&Object.isFrozen(entry.box));assert.equal(entry.sourceControl,entry.id==='outer'?'world_section.selector':entry.id==='thin-gap'?'world_section.gap':entry.id==='heading'?'world_section.group':entry.id==='nested'?'world_section.nested':entry.id==='launch'?'world_section.launch':entry.id+'_button');}
});
test('private plan keeps reserve space but zeroes ignored/collapse ancestry and preserves raw capability independence',()=>{
 const ui=loader(peers[0])('src/settings-navigation.tsx');
 for(const mode of['reserve','collapse','ignored','disabled']){
  const p=sourceProps({hiddenSlots:mode==='collapse'?'collapse':'reserve'});p.nodes.push(section('tail'));
  if(mode==='ignored')p.nodes[0].ignored=true;else if(mode==='disabled')p.nodes[0].enabled=false;else p.nodes[0].visible=false;
  const plan=ui.planSourceSettingsNavigation(p),zero=mode==='collapse'||mode==='ignored';assert.equal(plan.height,zero?30:135);assert.equal(plan.entries.at(-1).box[1],zero?0:105);
  for(const entry of plan.entries.slice(0,-1)){assert.equal(entry.box[3]===0,zero);assert.equal(entry.ignored,mode==='ignored');assert.equal(entry.visible,mode==='ignored'||mode==='disabled');assert.equal(entry.enabled,mode!=='disabled');}
 }
 const enabled=ui.planSourceSettingsNavigation(sourceProps()),disabled=ui.planSourceSettingsNavigation(sourceProps({disabled:true})),nonvisibleDOM=ui.planSourceSettingsNavigation(sourceProps({hidden:true,inert:true}));
 assert.deepEqual(enabled.entries.map(e=>e.box),disabled.entries.map(e=>e.box));assert(disabled.entries.every(e=>e.enabled===false));assert.deepEqual(nonvisibleDOM.entries,enabled.entries,'Root DOM hidden/inert do not rewrite source projection geometry/flags');
});
test('private plan performs no rendering/ref/callback/IO and rejects malformed data through the same tree preflight',()=>{
 const ui=loader(peers[0])('src/settings-navigation.tsx'),React=peers[0]('react');let called=0;const p=sourceProps({onValueChange(){called++;},nodeRefs:{launch(){called++;}},itemRefs:{game(){called++;}}});
 inputSection(p.nodes,'launch').content=React.createElement(()=>{called++;throw Error('Pure planning must not render host content');});inputSection(p.nodes,'game').glyphContent=React.createElement(()=>{called++;throw Error('Pure planning must not render glyph content');});
 const original=globalThis.fetch;globalThis.fetch=()=>{called++;throw Error('No planning IO');};try{const plan=ui.planSourceSettingsNavigation(p);assert.equal(plan.height,105);assert.equal(called,0);}finally{globalThis.fetch=original;}
 const invalid=sourceProps();inputSection(invalid.nodes,'launch').height=-1;assert.throws(()=>ui.planSourceSettingsNavigation(invalid));const duplicate=sourceProps();duplicate.nodes.push(section('game'));assert.throws(()=>ui.planSourceSettingsNavigation(duplicate),/unique/);
 let reads=0;const getter=sourceProps();Object.defineProperty(getter.nodes[0],'children',{get(){reads++;return[];}});assert.throws(()=>ui.planSourceSettingsNavigation(getter),/accessors/);assert.equal(reads,0);
});
