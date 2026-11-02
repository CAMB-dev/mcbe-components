import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';

const root=process.cwd(),rootRequire=createRequire(import.meta.url);
const compiled=await build({entryPoints:[path.join(root,'src/ore-modal.tsx')],bundle:true,platform:'node',format:'cjs',jsx:'automatic',write:false,external:['react','react/*']});
function load(require){const module={exports:{}};vm.runInThisContext('(function(require,module,exports){'+compiled.outputFiles[0].text+'\n})')(require,module,module.exports);return module.exports;}
const attr=(tag,name)=>[...tag.matchAll(/\s([:\w-]+)="([^"]*)"/g)].find(m=>m[1].toLowerCase()===name.toLowerCase())?.[2];
const peers=[rootRequire];for(const major of[18,19])try{const require=createRequire(path.join(root,`.cache/consumer-react${major}/package.json`));if(!peers.some(r=>r('react').version===require('react').version))peers.push(require);}catch{}
for(const require of peers){
 const React=require('react'),ssr=require('react-dom/server').renderToStaticMarkup,el=React.createElement,parts=load(require),{OreModal,OreModalHeader,OreModalContent,OreModalText,OreModalActions}=parts;
 test(`five Ore modal primitives SSR without DOM, native open, callbacks or refs (${React.version})`,()=>{
  const saved=new Map(),attempts=[],warnings=[],oldError=console.error;let calls=0,refs=0;console.error=(...a)=>warnings.push(a.map(String).join(' '));
  for(const name of['fetch','Image','createImageBitmap','OffscreenCanvas','requestAnimationFrame','setTimeout','setInterval']){saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,value(){attempts.push(name);throw Error('SSR IO');}});}
  try{for(const open of[true,false]){const html=ssr(el(OreModal,{open,label:'Host modal',onDismissRequest:()=>calls++,ref:()=>refs++,panelRef:()=>refs++,width:320,height:'60vh',guiScale:2,locale:'zh_CN',panelProps:{id:'host-panel','data-panel':'yes'},onClick:()=>calls++,onCancel:()=>calls++},el(OreModalHeader,{ref:()=>refs++,closeIcon:el('span',null,'host glyph'),closeLabel:'Close',closeButtonRef:()=>refs++},'Title'),el(OreModalContent,{ref:()=>refs++},el(OreModalText,{center:true},'文字')),el(OreModalActions,{ref:()=>refs++},el('button',null,'Cancel'))));const tag=html.match(/<dialog[^>]*>/)[0];assert.equal(attr(tag,'open'),undefined);assert.equal(attr(tag,'aria-label'),'Host modal');assert(html.includes('width:320px;max-width:100%;height:60vh'));assert(html.includes('--mc-ore-unit:10px'));assert(html.includes('Noto Sans SC'));assert(html.includes('data-panel="yes"'));assert(html.includes('web-clip'));assert(!html.includes('mc-ore-scroll__viewport'));assert(html.includes('host glyph'));assert.equal((html.match(/mc-ore-modal-header__slot/g)??[]).length,2);assert(!html.includes('onDismissRequest'));assert(!html.includes('<canvas'));}assert.deepEqual(attempts,[]);assert.deepEqual(warnings,[]);assert.equal(calls,0);assert.equal(refs,0);}finally{console.error=oldError;for(const[name,d]of saved){if(d)Object.defineProperty(globalThis,name,d);else delete globalThis[name];}}
 });
 test(`independent body scrolling, native attrs, title precedence and last-gamepad gate (${React.version})`,()=>{
  const scroll=ssr(el(OreModalContent,{scrollable:true,scrollLabel:'Scrollable',scrollInputMode:'touch',guiScale:2,id:'body','data-host':'yes'},el(OreModalText,null,'Text')));assert(scroll.includes('role="region"'));assert(scroll.includes('aria-label="Scrollable"'));assert(scroll.includes('data-floating="true"'));assert(scroll.includes('data-input-mode="touch"'));assert(scroll.includes('web-source-scroll-opt-in'));
  const html=ssr(el(OreModal,{open:true,label:'Fallback','aria-labelledby':'heading',onDismissRequest:()=>{},lastInputGamepad:true},el(OreModalHeader,{id:'heading'},'Title')));const tag=html.match(/<dialog[^>]*>/)[0];assert.equal(attr(tag,'aria-label'),undefined);assert.equal(attr(tag,'aria-labelledby'),'heading');assert(!html.includes('<button'));assert.equal((html.match(/mc-ore-modal-header__slot/g)??[]).length,2);
  assert(!ssr(el(OreModalHeader,null,'Standalone')).includes('<button'));assert(!ssr(el(OreModalHeader,{onClose:()=>{},hideCloseButton:true},'Hidden')).includes('<button'));
  const named=ssr(el(OreModalHeader,{onClose:()=>{},closeIcon:'Host','closeLabel':'Fallback',closeButtonProps:{'aria-labelledby':'close-name','data-host':'yes'}},'Heading'));assert.equal(attr(named.match(/<button[^>]*>/)[0],'aria-label'),undefined);assert(named.includes('aria-labelledby="close-name"'));
  assert(ssr(el(OreModalActions,{horizontal:true},'Actions')).includes('data-horizontal="true"'));assert(!ssr(el(OreModalText,null,'Text')).includes('data-center'));
 });
 test(`malformed active and inactive finite profiles reject (${React.version})`,()=>{
  for(const patch of[{open:1},{label:''},{onDismissRequest:null},{width:Infinity},{height:-1},{width:''},{guiScale:0},{guiScale:2000},{locale:3},{closeOnBackdrop:1},{lastInputGamepad:'false'},{scrollInputMode:'keyboard'}])assert.throws(()=>ssr(el(OreModal,{open:false,label:'Host',onDismissRequest:()=>{},...patch})),e=>e instanceof TypeError||e instanceof RangeError);
  for(const patch of[{scrollable:1},{scrollable:true},{scrollLabel:''},{scrollInputMode:'controller'}])assert.throws(()=>ssr(el(OreModalContent,patch,'Host')));
  for(const patch of[{onClose:()=>{}},{onClose:()=>{},closeIcon:'Host'},{onClose:()=>{},closeIcon:'Host',closeLabel:''},{lastInputGamepad:1},{showClose:1}])assert.throws(()=>ssr(el(OreModalHeader,patch,'Title')));
  assert.throws(()=>ssr(el(OreModalText,{center:1},'Host')));assert.throws(()=>ssr(el(OreModalActions,{horizontal:1},'Host')));
 });
}

function harness(){
 let active;const jsx=(type,props,key)=>({type,props,key});
 const react={createContext:value=>({value}),useContext:context=>context.value,forwardRef:render=>({render}),useRef:value=>active.slots[active.cursor++]??(active.slots[active.cursor-1]={current:value}),useCallback:callback=>callback,useEffect:callback=>active.effects.push(callback),useLayoutEffect:callback=>active.effects.push(callback)};
 const parts=load(name=>name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:rootRequire(name));
 const instance=()=>{const state={slots:[],cursor:0,effects:[]};return {parts,fork:instance,render(props,ref){active=state;state.cursor=0;state.effects=[];const tree=parts.OreModal.render(props,ref);return {tree,dialog:tree.props.children.props.children,effects:[...state.effects]};}};};return instance();
}
function documentFixture(){
 const tasks=[],doc={activeElement:null,defaultView:{getComputedStyle:()=>({visibility:'visible'}),queueMicrotask,setTimeout:fn=>{tasks.push(fn);return tasks.length;}}};
 const element=()=>({ownerDocument:doc,isConnected:true,closest:()=>null,matches:()=>false,getClientRects:()=>[{}],focus(){doc.activeElement=this;this.focusCalls=(this.focusCalls??0)+1;}});
 const trigger=element();doc.activeElement=trigger;
 const dialog={...element(),open:false,children:new Set(),contains(node){return node===this||this.children.has(node);},showModal(){this.open=true;this.shows=(this.shows??0)+1;doc.activeElement=this;},close(){this.open=false;this.closes=(this.closes??0)+1;}};
 const panel={...element(),getBoundingClientRect:()=>({left:10,right:100,top:10,bottom:100})};dialog.children.add(panel);
 return {doc,dialog,panel,trigger,tasks,element};
}
function event(currentTarget,patch={}){return {currentTarget,target:currentTarget,defaultPrevented:false,nativeEvent:{defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}},persist(){},preventDefault(){this.defaultPrevented=true;this.nativeEvent.preventDefault();},stopPropagation(){this.stopped=true;},isDefaultPrevented(){return this.defaultPrevented;},isPropagationStopped(){return !!this.stopped;},...patch};}
async function flush(f){while(f.tasks.length)f.tasks.shift()();await Promise.resolve();}
test('native lifecycle opens only in effects, initial focus and controlled close restore owner focus',()=>{
 const h=harness(),f=documentFixture(),initial=f.element();initial.matches=selector=>selector!==':disabled';f.dialog.children.add(initial);const props={open:true,label:'Modal',onDismissRequest:()=>{},initialFocusRef:{current:initial}};
 const render=h.render(props);assert.equal(f.dialog.shows,undefined);render.dialog.props.ref(f.dialog);render.dialog.props.children.props.ref(f.panel);const cleanups=render.effects.map(fn=>fn());assert.equal(f.dialog.shows,1);assert.equal(f.doc.activeElement,initial);
 const next=h.render({...props,open:false});next.effects[0]();assert.equal(f.dialog.closes,1);assert.equal(f.doc.activeElement,f.trigger);for(const cleanup of cleanups)cleanup?.();
});
test('unsupported native showModal surfaces explicit failure instead of a fake modal',()=>{
 const h=harness(),f=documentFixture();delete f.dialog.showModal;const r=h.render({open:true,label:'Modal',onDismissRequest:()=>{}});r.dialog.props.ref(f.dialog);assert.throws(()=>r.effects[0](),/native HTMLDialogElement.showModal/);
});
test('Escape keeps native dialog controlled, honors caller veto, IME and modifiers',async()=>{
 const h=harness(),f=documentFixture(),requests=[];let veto=false;const props={open:true,label:'Modal',onDismissRequest:d=>requests.push(d),onCancel:e=>{if(veto)e.preventDefault();}};
 const r=h.render(props);r.dialog.props.ref(f.dialog);const cleanup=r.effects.map(fn=>fn());
 let e=event(f.dialog);r.dialog.props.onCancel(e);assert(e.defaultPrevented);assert.equal(requests.length,0);assert(f.dialog.open);await flush(f);assert.equal(requests.length,1);assert.equal(requests[0].event.currentTarget,f.dialog);assert.equal(requests[0].event.nativeEvent,e.nativeEvent);assert(f.dialog.open);
 veto=true;r.dialog.props.onCancel(event(f.dialog));assert.equal(requests.length,1);veto=false;
 for(const patch of[{isComposing:true},{keyCode:229},{ctrlKey:true},{altKey:true},{metaKey:true}]){r.dialog.props.onKeyDown(event(f.dialog,{key:'Escape',...patch,nativeEvent:{...patch}}));r.dialog.props.onCancel(event(f.dialog));assert.equal(requests.length,1);}
 r.dialog.props.onKeyDown(event(f.dialog,{key:'Escape',nativeEvent:{}}));r.dialog.props.onCompositionStart(event(f.dialog));r.dialog.props.onCancel(event(f.dialog));assert.equal(requests.length,1);r.dialog.props.onCompositionEnd(event(f.dialog));r.dialog.props.onCancel(event(f.dialog));await flush(f);assert.equal(requests.length,2);for(const fn of cleanup)fn?.();
});
test('cancel observes late native veto and restores exact absent/present method descriptors',async()=>{
 const h=harness(),f=documentFixture(),requests=[],r=h.render({open:true,label:'Modal',onDismissRequest:d=>requests.push(d)});r.dialog.props.ref(f.dialog);const cleanups=r.effects.map(fn=>fn());
 for(const own of[false,true]){
  const original=function(){this.defaultPrevented=true;},proto={preventDefault:original},native=Object.assign(Object.create(proto),{defaultPrevented:false});if(own)Object.defineProperty(native,'preventDefault',{configurable:true,writable:false,enumerable:false,value:original});
  const before=Object.getOwnPropertyDescriptor(native,'preventDefault'),e=event(f.dialog,{nativeEvent:native});r.dialog.props.onCancel(e);assert(native.defaultPrevented);assert.notEqual(native.preventDefault,original);native.preventDefault();await flush(f);assert.equal(requests.length,0);assert.deepEqual(Object.getOwnPropertyDescriptor(native,'preventDefault'),before);assert.equal(native.preventDefault,original);
  const normal=event(f.dialog);const descriptor=Object.getOwnPropertyDescriptor(normal.nativeEvent,'preventDefault');r.dialog.props.onCancel(normal);normal.currentTarget=null;await flush(f);assert.equal(requests.at(-1).event.currentTarget,f.dialog);assert.equal(requests.at(-1).event.nativeEvent,normal.nativeEvent);assert.deepEqual(Object.getOwnPropertyDescriptor(normal.nativeEvent,'preventDefault'),descriptor);requests.length=0;
 }
 const changed=event(f.dialog);r.dialog.props.onCancel(changed);const replacement=function(){};changed.nativeEvent.preventDefault=replacement;await flush(f);assert.equal(changed.nativeEvent.preventDefault,replacement);requests.length=0;
 const inactive=event(f.dialog),before=Object.getOwnPropertyDescriptor(inactive.nativeEvent,'preventDefault');r.dialog.props.onCancel(inactive);h.render({open:false,label:'Modal',onDismissRequest:d=>requests.push(d)});await flush(f);assert.equal(requests.length,0);assert.deepEqual(Object.getOwnPropertyDescriptor(inactive.nativeEvent,'preventDefault'),before);
 h.render({open:true,label:'Modal',onDismissRequest:d=>requests.push(d)});const unmounted=event(f.dialog),unmountedBefore=Object.getOwnPropertyDescriptor(unmounted.nativeEvent,'preventDefault');r.dialog.props.onCancel(unmounted);for(const fn of cleanups)fn?.();await flush(f);assert.equal(requests.length,0);assert.deepEqual(Object.getOwnPropertyDescriptor(unmounted.nativeEvent,'preventDefault'),unmountedBefore);
});
test('Tab explicitly loops only at native-dialog boundaries and retains caller/IME veto',()=>{
 const h=harness(),f=documentFixture(),first=f.element(),last=f.element();for(const node of[first,last]){node.tabIndex=0;node.closest=selector=>selector==='dialog'?f.dialog:null;f.dialog.children.add(node);}f.dialog.querySelectorAll=()=>[first,last];let veto=false;
 const r=h.render({open:true,label:'Modal',onDismissRequest:()=>{},onKeyDown:e=>{if(veto)e.preventDefault();}});r.dialog.props.ref(f.dialog);const cleanups=r.effects.map(fn=>fn());
 f.doc.activeElement=first;let e=event(f.dialog,{key:'Tab',shiftKey:true});r.dialog.props.onKeyDown(e);assert(e.defaultPrevented);assert.equal(f.doc.activeElement,last);
 e=event(f.dialog,{key:'Tab'});r.dialog.props.onKeyDown(e);assert(e.defaultPrevented);assert.equal(f.doc.activeElement,first);
 e=event(f.dialog,{key:'Tab'});r.dialog.props.onKeyDown(e);assert(!e.defaultPrevented);assert.equal(f.doc.activeElement,first);
 veto=true;e=event(f.dialog,{key:'Tab',shiftKey:true});r.dialog.props.onKeyDown(e);assert.equal(f.doc.activeElement,first);veto=false;
 e=event(f.dialog,{key:'Tab',shiftKey:true,nativeEvent:{isComposing:true}});r.dialog.props.onKeyDown(e);assert(!e.defaultPrevented);assert.equal(f.doc.activeElement,first);
 f.dialog.querySelectorAll=()=>[];e=event(f.dialog,{key:'Tab'});r.dialog.props.onKeyDown(e);assert(e.defaultPrevented);assert.equal(f.doc.activeElement,f.dialog);for(const fn of cleanups)fn?.();
});
test('panel native handler runs first and propagation isolation survives a host veto',()=>{
 const h=harness(),order=[],r=h.render({open:false,label:'Modal',onDismissRequest:()=>{},panelProps:{onClick:e=>{order.push('caller');e.preventDefault();}}}),e=event({});e.stopPropagation=()=>order.push('stop');r.dialog.props.children.props.onClick(e);assert.deepEqual(order,['caller','stop']);assert(e.defaultPrevented);
});
test('backdrop and Close requests preserve stable targets and late native veto without auto-close',async()=>{
 const h=harness(),f=documentFixture(),requests=[],r=h.render({open:true,label:'Modal',closeOnBackdrop:true,onDismissRequest:detail=>requests.push(detail)});r.dialog.props.ref(f.dialog);r.dialog.props.children.props.ref(f.panel);const cleanups=r.effects.map(fn=>fn());
 const inside=event(f.dialog,{clientX:20,clientY:20});r.dialog.props.onClick(inside);assert.equal(f.tasks.length,0);
 const veto=event(f.dialog,{clientX:0,clientY:0});r.dialog.props.onClick(veto);veto.nativeEvent.defaultPrevented=true;f.tasks.shift()();await Promise.resolve();assert.equal(requests.length,0);
 const outside=event(f.dialog,{clientX:0,clientY:0});r.dialog.props.onClick(outside);outside.currentTarget=null;f.tasks.shift()();await Promise.resolve();assert.equal(requests[0].reason,'backdrop');assert.equal(requests[0].event.currentTarget,f.dialog);assert(f.dialog.open);
 const button=f.element(),click=event(button);r.tree.props.children.props.value.request(click);click.currentTarget=null;f.tasks.shift()();await Promise.resolve();assert.equal(requests[1].reason,'close');assert.equal(requests[1].event.currentTarget,button);assert(f.dialog.open);for(const fn of cleanups)fn?.();
});
test('lower modal cleanup never steals focus from the newer modal owner',()=>{
 const a=harness(),b=a.fork(),f=documentFixture(),g=documentFixture();g.dialog.ownerDocument=f.doc;g.dialog.focus=()=>{f.doc.activeElement=g.dialog;};g.dialog.showModal=function(){this.open=true;f.doc.activeElement=this;};
 const ar=a.render({open:true,label:'A',onDismissRequest:()=>{}});ar.dialog.props.ref(f.dialog);const ac=ar.effects.map(fn=>fn());
 const br=b.render({open:true,label:'B',onDismissRequest:()=>{}});br.dialog.props.ref(g.dialog);const bc=br.effects.map(fn=>fn());
 ac.at(-1)();assert.equal(f.doc.activeElement,g.dialog);assert.equal(f.trigger.focusCalls,undefined);bc.at(-1)();assert.equal(f.doc.activeElement,f.trigger);
});
test('completed native close notifies once, releases ownership and stays closed until a committed false -> true',()=>{
 const h=harness(),f=documentFixture(),requests=[],order=[],props={open:false,label:'Modal',onClose:e=>{order.push('native');e.preventDefault();},onDismissRequest:detail=>{order.push('notification');requests.push(detail);return false;}};
 let r=h.render(props);r.dialog.props.ref(f.dialog);const cleanups=r.effects.map(fn=>fn());r.dialog.props.onClose(event(f.dialog));assert.deepEqual(order,['native']);assert.equal(requests.length,0);
 r=h.render({...props,open:true});r.effects[0]();assert.equal(f.dialog.shows,1);f.dialog.open=false;const closed=event(f.dialog);r.dialog.props.onClose(closed);assert.equal(requests.length,1);assert.equal(requests[0].reason,'native-close');assert.equal(requests[0].event,closed);assert.deepEqual(order.slice(-2),['native','notification']);
 r.dialog.props.onClose(event(f.dialog));assert.equal(requests.length,1);r=h.render({...props,open:true});r.effects[0]();assert.equal(f.dialog.shows,1);assert.equal(f.dialog.open,false);
 r=h.render(props);r.effects[0]();r=h.render({...props,open:true});r.effects[0]();assert.equal(f.dialog.shows,2);assert(f.dialog.open);for(const fn of cleanups)fn?.();
});
test('native force-close supersedes deferred Escape without an extra escape request',async()=>{
 const h=harness(),f=documentFixture(),requests=[],r=h.render({open:true,label:'Modal',onDismissRequest:d=>requests.push(d)});r.dialog.props.ref(f.dialog);const cleanups=r.effects.map(fn=>fn());const cancel=event(f.dialog),before=Object.getOwnPropertyDescriptor(cancel.nativeEvent,'preventDefault');r.dialog.props.onCancel(cancel);assert.equal(requests.length,0);
 f.dialog.open=false;r.dialog.props.onClose(event(f.dialog));await flush(f);assert.deepEqual(requests.map(d=>d.reason),['native-close']);assert.deepEqual(Object.getOwnPropertyDescriptor(cancel.nativeEvent,'preventDefault'),before);for(const fn of cleanups)fn?.();
});
test('props-close and unmount-close still call native onClose without a native-close notification',()=>{
 const h=harness(),f=documentFixture(),requests=[],native=[],props={open:true,label:'Modal',onClose:e=>native.push(e),onDismissRequest:d=>requests.push(d)};let r=h.render(props);r.dialog.props.ref(f.dialog);const cleanups=r.effects.map(fn=>fn());
 r=h.render({...props,open:false});r.effects[0]();r.dialog.props.onClose(event(f.dialog));assert.equal(native.length,1);assert.equal(requests.length,0);
 r=h.render(props);r.effects[0]();for(const fn of cleanups)fn?.();r.dialog.props.onClose(event(f.dialog));assert.equal(native.length,2);assert.equal(requests.length,0);
});
test('expected queued props-close cannot retire a newer owner on the same dialog node',()=>{
 const h=harness(),f=documentFixture(),requests=[],props={open:true,label:'Modal',onDismissRequest:d=>requests.push(d)};let r=h.render(props);r.dialog.props.ref(f.dialog);const cleanups=r.effects.map(fn=>fn());
 r=h.render({...props,open:false});r.effects[0]();assert.equal(f.dialog.closes,1);r=h.render(props);r.effects[0]();assert.equal(f.dialog.shows,2);
 // Both queued events are delivered after the second instance was force-closed.
 f.dialog.open=false;r.dialog.props.onClose(event(f.dialog));assert.equal(requests.length,0);r.dialog.props.onClose(event(f.dialog));assert.deepEqual(requests.map(d=>d.reason),['native-close']);for(const fn of cleanups)fn?.();
});
test('native child closure releases the top owner and permits parent Escape requests again',async()=>{
 const parent=harness(),child=parent.fork(),f=documentFixture(),g=documentFixture(),requests=[];g.dialog.ownerDocument=f.doc;g.dialog.showModal=function(){this.open=true;f.doc.activeElement=this;};
 const p=parent.render({open:true,label:'Parent',onDismissRequest:d=>requests.push(['parent',d.reason])});p.dialog.props.ref(f.dialog);const pc=p.effects.map(fn=>fn());const c=child.render({open:true,label:'Child',onDismissRequest:d=>requests.push(['child',d.reason])});c.dialog.props.ref(g.dialog);const cc=c.effects.map(fn=>fn());
 g.dialog.open=false;c.dialog.props.onClose(event(g.dialog));assert.deepEqual(requests,[['child','native-close']]);p.dialog.props.onCancel(event(f.dialog));await flush(f);assert.deepEqual(requests,[['child','native-close'],['parent','escape']]);for(const fn of cc)fn?.();for(const fn of pc)fn?.();
});
test('frozen neutral source visual profile and Web clipping policy remain explicit',async()=>{
 const css=await readFile(path.join(root,'src/ore-modal.css'),'utf8');
 for(const literal of['max-width:calc(47.6 * var(--mc-ore-unit))','padding:calc(1.2 * var(--mc-ore-unit)) 0','border:calc(.2 * var(--mc-ore-unit)) solid #1e1e1f','background:rgba(0,0,0,.7)','height:calc(4.8 * var(--mc-ore-unit))','width:calc(1.4 * var(--mc-ore-unit))','background:#313233','font-size:calc(1.4 * var(--mc-ore-unit))','font-size:calc(1.6 * var(--mc-ore-unit))','gap:calc(.4 * var(--mc-ore-unit))','border-top-color:rgba(255,255,255,.1)','border-bottom-color:rgba(0,0,0,.3)','overflow:clip','@media(forced-colors:active)'])assert(css.includes(literal),literal);
 const panel=css.match(/\.mc-ore-modal__panel\{([^}]+)\}/)[1];assert(!panel.includes('background'));assert(css.includes('.mc-ore-modal:not([open]){display:none}'));assert(css.includes('.mc-ore-modal-header__shadow{height:calc(.2 * var(--mc-ore-unit));background:#313233}'));assert(!css.includes('data:image'));assert(!css.includes('url('));
});
