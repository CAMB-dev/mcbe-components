import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const require=createRequire(import.meta.url),root=process.cwd();
// Bounded source CPU loading, not a library/production build or browser oracle.
function loader(peer){const cache=new Map();return function load(filename){
  filename=path.resolve(root,filename);if(cache.has(filename))return cache.get(filename).exports;
  const module={exports:{}};cache.set(filename,module);
  const source=readFileSync(filename,'utf8').replaceAll('import.meta.url',JSON.stringify(pathToFileURL(filename).href));
  const js=ts.transpileModule(source,{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const local=id=>{if(!id.startsWith('.'))return peer(id);const stem=path.resolve(path.dirname(filename),id);if(/\.(png|woff2?|ttf|otf)$/.test(stem))return pathToFileURL(stem).href;const target=[stem,stem+'.ts',stem+'.tsx',stem+'.js',stem+'.json'].find(existsSync);if(!target)throw Error('Unresolved CPU module '+stem);return target.endsWith('.json')?peer(target):load(target);};
  vm.runInThisContext('(function(require,module,exports){'+js+'\n})',{filename})(local,module,module.exports);return module.exports;
};}
const peers=[require];for(const major of[18,19])try{const peer=createRequire(path.join(root,`.cache/consumer-react${major}/package.json`));if(!peers.some(r=>r('react').version===peer('react').version))peers.push(peer);}catch{}

for(const peer of peers){
  const React=peer('react'),el=React.createElement,ssr=peer('react-dom/server').renderToStaticMarkup,load=loader(peer),ui=load('src/manifest-validation-screen.tsx'),factory=load('demo/manifest-validation-data.ts').createManifestValidationDemoProps;
  test(`actual Screen and actual Content compose the fixed frame once (${React.version})`,()=>{
    const p=factory(),plan=ui.planManifestValidationScreen(p),html=ssr(el(ui.ManifestValidationScreen,p));
    assert.deepEqual(plan,{width:370,height:250,size:[354,219],backgroundOpacity:.8});
    assert(html.includes('left:50px;top:50px;width:740px;height:500px'));assert(html.includes('width:724px;height:484px'));assert(html.includes('width:708px;height:438px'));
    assert.equal((html.match(/class="mc-manifest-validation-screen__panel"/g)??[]).length,1);assert.equal((html.match(/class="mc-scroll-area(?: |")/g)??[]).length,1);
    assert.equal((html.match(/data-manifest-target="button.copy_to_clipboard"/g)??[]).length,2);assert.equal((html.match(/data-manifest-target="button.delete_manifest"/g)??[]).length,1);assert.equal((html.match(/data-manifest-target="button.refresh_manifest"/g)??[]).length,1);
    assert(!html.includes('data-manifest-variant="delete-icon"'));assert(!html.includes('data-manifest-variant="refresh-icon"'));assert(!html.includes('role="tab"'));
    assert(html.includes(p.content.entries[0].content));assert(html.includes(p.content.entries[1].content));assert(!html.includes('<form'));
    const narrow=ui.planManifestValidationScreen({...p,viewportSize:[320,204]});assert.deepEqual(narrow.size,[300,123]);
  });
  test(`declared.65, static effective.8 and host override stay distinct (${React.version})`,()=>{
    const p=factory(),html=ssr(el(ui.ManifestValidationScreen,p));assert(html.includes('data-source-declared-background-alpha="0.65"'));assert(html.includes('data-source-static-effective-background-alpha="0.8"'));assert(html.includes('data-background-policy="source-static-instance-override"'));assert(html.includes('class="mc-manifest-validation-screen__dim" style="opacity:0.8"'));
    const host=ssr(el(ui.ManifestValidationScreen,{...p,backgroundOpacity:.65}));assert(host.includes('data-background-policy="explicit-host-opacity"'));assert(host.includes('class="mc-manifest-validation-screen__dim" style="opacity:0.65"'));assert(host.includes('data-source-static-effective-background-alpha="0.8"'));
    for(const backgroundOpacity of[0,1])assert.equal(ui.planManifestValidationScreen({...p,backgroundOpacity}).backgroundOpacity,backgroundOpacity);
  });
  test(`closed, readonly and disabled source states retain native ownership and labels (${React.version})`,()=>{
    const p=factory(),closed=ssr(el(ui.ManifestValidationScreen,{...p,open:false}));assert(/role="dialog"[^>]*hidden/.test(closed));
    const readonly=ssr(el(ui.ManifestValidationScreen,{...p,readOnly:true})),close=readonly.match(/<button[^>]*class="[^"]*mc-manifest-validation-screen__close[^>]*>/)[0];assert(!close.includes('disabled='));assert(close.includes('aria-label="关闭验证报告"'));
    const disabled=ssr(el(ui.ManifestValidationScreen,{...p,disabled:true}));for(const button of disabled.match(/<button\b[^>]*>/g))assert(button.includes('disabled=""'));
    const explicit=ssr(el(ui.ManifestValidationScreen,{...p,'aria-label':'Host dialog name',id:'native-screen',closeButtonProps:{'aria-label':'Host exit',name:'native-close'}}));assert(explicit.includes('aria-label="Host dialog name"'));assert(explicit.includes('name="native-close"'));assert(explicit.includes('aria-label="Host exit"'));
  });
  test(`actual SSR schedules no IO, observers, callbacks or native refs (${React.version})`,()=>{
    const p=factory(),descriptors=new Map(),activity=[],warnings=[],original=console.error;let calls=0;
    console.error=(...args)=>warnings.push(args.join(' '));
    for(const key of['fetch','Image','createImageBitmap','OffscreenCanvas','ResizeObserver','requestAnimationFrame','setTimeout','setInterval']){descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value(){activity.push(key);throw Error('SSR side effect');}});}
    try{ssr(el(ui.ManifestValidationScreen,{...p,ref:()=>calls++,panelRef:()=>calls++,contentRef:()=>calls++,closeButtonRef:()=>calls++,onCloseRequest:()=>calls++,onViewRequest:()=>calls++,viewNavigationKeys:true,content:{...p.content,viewportRef:()=>calls++,onAction:()=>calls++}}));assert.equal(calls,0);assert.deepEqual(activity,[]);assert.deepEqual(warnings,[]);}finally{console.error=original;for(const[key,value]of descriptors)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
  });
  test(`screen and delegated body preflight reject incomplete geometry/snapshots (${React.version})`,()=>{
    const p=factory();for(const patch of[{viewportSize:[0,300]},{viewportSize:['420',300]},{viewportSize:[420,70]},{viewportSize:[Infinity,300]},{scale:0},{scale:1.5},{open:'true'},{viewNavigationKeys:'true'},{backgroundOpacity:NaN},{backgroundOpacity:-.1},{backgroundOpacity:1.1},{closeVisible:'false'},{content:{...p.content,capacity:3}},{content:{...p.content,identity:{...p.content.identity,runKey:''}}}])assert.throws(()=>ui.planManifestValidationScreen({...p,...patch}),error=>error instanceof RangeError||error instanceof TypeError);
  });
}

// Real source Screen/lifecycle code with a finite hook host. The actual Content
// planner is used; inner React child DOM is not mounted here. This is not proof
// of native DOM propagation, modal focus/inert or browser rendering.
function harness(){
  let cursor=0,id=0;const slots=[],jsx=(type,props,key)=>({type,props,key}),actual=loader(require),module={exports:{}},lifecycle={exports:{}};
  const effect=(fn,deps)=>{const index=cursor++,previous=slots[index];if(!deps||!previous||deps.some((value,i)=>value!==previous.deps?.[i])){previous?.cleanup?.();slots[index]={deps,cleanup:fn()};}};
  const React={forwardRef:render=>({render}),useId:()=>`cpu-${id++}`,useRef:value=>{const index=cursor++;return slots[index]??(slots[index]={current:value});},useCallback:fn=>fn,useEffect:effect,useLayoutEffect:effect};
  const classic=ts.transpileModule(readFileSync(path.join(root,'src/classic-screen-lifecycle.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInThisContext('(function(require,module,exports){'+classic+'\n})')(id=>id==='react'?React:{lockModalScroll:()=>()=>{}},lifecycle,lifecycle.exports);
  const state={ownsModal:true,tabRequests:[]},tasks=[],microtasks=[],view={setTimeout:fn=>tasks.push(fn),queueMicrotask:fn=>microtasks.push(fn)};
  const dependencies={react:React,'react/jsx-runtime':{jsx,jsxs:jsx},'./classic-skin':actual('src/classic-skin.tsx'),'./manifest-validation-parts':actual('src/manifest-validation-parts.tsx'),'./manifest-validation-assets':actual('src/manifest-validation-assets.ts'),'./classic-screen-lifecycle':{...lifecycle.exports,useClassicModal:()=>{},classicModalOwnsInput:()=>state.ownsModal,classicModalTab:(event,boundary,target)=>state.tabRequests.push({event,boundary,target})}};
  const source=ts.transpileModule(readFileSync(path.join(root,'src/manifest-validation-screen.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInThisContext('(function(require,module,exports){'+source+'\n})')(id=>dependencies[id]??require(id),module,module.exports);
  const makeOwner=()=>{const target=new EventTarget();return{isConnected:true,closest:()=>null,contains:()=>true,ownerDocument:{defaultView:view},addEventListener:target.addEventListener.bind(target),removeEventListener:target.removeEventListener.bind(target)};},find=(tree,type)=>{if(!tree||typeof tree!=='object')return;if(tree.type===type)return tree;for(const child of[tree.props?.children].flat(Infinity)){const found=find(child,type);if(found)return found;}};
  return{state,makeOwner,find,props:actual('demo/manifest-validation-data.ts').createManifestValidationDemoProps(),render(props,ref){cursor=0;return module.exports.ManifestValidationScreen.render(props,ref);},unmount(){for(const slot of slots)slot?.cleanup?.();},flush(){while(tasks.length)tasks.shift()();while(microtasks.length)microtasks.shift()();},event(owner,type='keydown',patch={}){const event={type,currentTarget:owner,target:owner,nativeEvent:{defaultPrevented:false},defaultPrevented:false,persist(){},preventDefault(){event.defaultPrevented=true;event.nativeEvent.defaultPrevented=true;},stopPropagation(){},isDefaultPrevented(){return event.defaultPrevented;},isPropagationStopped(){return false;},...patch};return event;}};
}
test('close/Escape keep currentTarget and readonly exit while early/late native veto and ownership still win',()=>{
  for(const origin of['close','escape'])for(const veto of['none','early','late','not-top']){
    const h=harness(),calls=[],p={...h.props,readOnly:true,onCloseRequest:detail=>calls.push(detail),onKeyDown:event=>{if(veto==='early')event.preventDefault();},closeButtonProps:{onClick:event=>{if(veto==='early')event.preventDefault();}}},tree=h.render(p),rootNode=h.makeOwner(),button=h.find(tree,'button'),buttonNode=h.makeOwner();buttonNode.disabled=false;tree.props.ref(rootNode);button.props.ref(buttonNode);
    const owner=origin==='close'?buttonNode:rootNode,event=h.event(owner,origin==='close'?'click':'keydown',{key:'Escape'});if(origin==='close')button.props.onClick(event);else tree.props.onKeyDown(event);event.currentTarget=null;if(veto==='late')event.nativeEvent.defaultPrevented=true;if(veto==='not-top')h.state.ownsModal=false;h.flush();assert.equal(calls.length,veto==='none'?1:0);if(calls.length){assert.equal(calls[0].target,'button.menu_exit');assert.equal(calls[0].origin,origin);assert.equal(calls[0].control,owner);assert.equal(calls[0].event.currentTarget,owner);}
  }
});
test('queued exit cancels on changed pack/run/payload, hidden, disabled, disconnected or inert state',()=>{
  for(const change of['run','pack','payload','mutable-run','hidden','disabled','disconnected','inert']){
    const h=harness(),calls=[],p={...h.props,onCloseRequest:detail=>calls.push(detail)},tree=h.render(p),owner=h.makeOwner();tree.props.ref(owner);tree.props.onKeyDown(h.event(owner,'keydown',{key:'Escape'}));
    if(change==='run'||change==='pack'||change==='payload'){const identity={...p.content.identity,...change==='run'?{runKey:'next-run'}:change==='pack'?{packId:'next-pack'}:{payload:{next:true}}};h.render({...p,content:{...p.content,identity}});}
    if(change==='mutable-run'){p.content.identity.runKey='mutated-same-object';h.render(p);}if(change==='hidden')h.render({...p,hidden:true});if(change==='disabled')h.render({...p,disabled:true});if(change==='disconnected')owner.isConnected=false;if(change==='inert')owner.closest=()=>({});h.flush();assert.equal(calls.length,0,change);
  }
});
test('bracket navigation is opt-in Web scope-view intent with repeat/modifier/IME and late-veto guards',()=>{
  for(const enabled of[false,true])for(const key of['[',']']){
    const h=harness(),calls=[],p={...h.props,viewNavigationKeys:enabled,readOnly:true,onViewRequest:detail=>calls.push(detail)},tree=h.render(p),owner=h.makeOwner();tree.props.ref(owner);tree.props.onKeyDown(h.event(owner,'keydown',{key}));assert.equal(calls.length,0);h.flush();assert.equal(calls.length,enabled?1:0);if(calls.length){assert.equal(calls[0].target,key==='['?'button.menu_tab_left':'button.menu_tab_right');assert.equal(calls[0].event.currentTarget,owner);}
  }
  for(const guard of['late','disabled-after','adapter-off','repeat','modifier','ime']){
    const h=harness(),calls=[],p={...h.props,viewNavigationKeys:true,onViewRequest:detail=>calls.push(detail)},tree=h.render(p),owner=h.makeOwner();tree.props.ref(owner);const event=h.event(owner,'keydown',{key:'[',repeat:guard==='repeat',ctrlKey:guard==='modifier'});if(guard==='ime')event.nativeEvent.isComposing=true;tree.props.onKeyDown(event);if(guard==='late')event.nativeEvent.defaultPrevented=true;if(guard==='disabled-after')h.render({...p,disabled:true});if(guard==='adapter-off')h.render({...p,viewNavigationKeys:false});h.flush();assert.equal(calls.length,0,guard);
  }
});
test('Tab including repeated Shift-Tab delegates to the modal boundary helper after native cancellation checkpoint',()=>{
  for(const repeat of[false,true])for(const shiftKey of[false,true]){
    const h=harness(),tree=h.render(h.props),owner=h.makeOwner(),panel=h.makeOwner();tree.props.ref(owner);tree.props.children[1].props.ref(panel);const event=h.event(owner,'keydown',{key:'Tab',repeat,shiftKey});tree.props.onKeyDown(event);event.currentTarget=null;assert.equal(h.state.tabRequests.length,0);h.flush();assert.equal(h.state.tabRequests.length,1);assert.equal(h.state.tabRequests[0].event.currentTarget,owner);assert.equal(h.state.tabRequests[0].boundary,owner);assert.equal(h.state.tabRequests[0].target,panel);
  }
  const h=harness(),tree=h.render(h.props),owner=h.makeOwner();tree.props.ref(owner);const event=h.event(owner,'keydown',{key:'Tab'});tree.props.onKeyDown(event);event.nativeEvent.defaultPrevented=true;h.flush();assert.equal(h.state.tabRequests.length,0);
});
test('native composition capture survives rerenders and ends by target, with hide/root/unmount cleanup',()=>{
  const h=harness(),calls=[],reactCalls=[],p={...h.props,onCloseRequest:detail=>calls.push(detail),onCompositionStartCapture:()=>reactCalls.push('capture'),onCompositionStart:()=>reactCalls.push('bubble')};
  const nativeOwner=()=>{const owner=h.makeOwner(),target=new EventTarget(),added=[],removed=[];owner.addEventListener=(type,listener,capture)=>{added.push({type,listener,capture});target.addEventListener(type,listener,capture);};owner.removeEventListener=(type,listener,capture)=>{removed.push({type,listener,capture});target.removeEventListener(type,listener,capture);};return{owner,added,removed,dispatch(type,input){const event=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(event,'target',{value:input});event.preventDefault();target.dispatchEvent(event);}};};
  const first=nativeOwner(),input=h.makeOwner(),other=h.makeOwner();let tree=h.render(p);tree.props.ref(first.owner);tree=h.render(p);assert.deepEqual(first.added.map(({type,capture})=>[type,capture]),[['compositionstart',true],['compositionend',true]]);
  const escape=owner=>{tree.props.onKeyDown(h.event(owner,'keydown',{key:'Escape',keyCode:27}));h.flush();};
  first.dispatch('compositionstart',input);tree=h.render({...p,title:'Same active run'});assert.equal(first.added.length,2);assert.equal(first.removed.length,0);escape(first.owner);assert.equal(calls.length,0);assert.deepEqual(reactCalls,[]);
  first.dispatch('compositionend',other);escape(first.owner);assert.equal(calls.length,0);first.dispatch('compositionend',input);escape(first.owner);assert.equal(calls.length,1);
  first.dispatch('compositionstart',input);tree=h.render({...p,hidden:true});assert.equal(first.removed.length,2);tree=h.render(p);escape(first.owner);assert.equal(calls.length,2);
  const second=nativeOwner();tree.props.ref(second.owner);tree=h.render(p);assert.equal(first.removed.length,4);second.dispatch('compositionstart',input);escape(second.owner);assert.equal(calls.length,2);second.dispatch('compositionend',input);escape(second.owner);assert.equal(calls.length,3);h.unmount();assert.deepEqual(second.added,second.removed);
});
test('div/panel/content/button refs use the cleanup binder; caller React composition callbacks are delegated once',()=>{
  const h=harness(),calls=[],refs=label=>node=>{calls.push([label,node]);return()=>calls.push([label,'cleanup']);},p={...h.props,panelRef:refs('panel'),contentRef:refs('content'),closeButtonRef:refs('close'),onCompositionStartCapture:()=>calls.push('capture'),onCompositionStart:()=>calls.push('bubble')},tree=h.render(p,refs('root'));
  const node=h.makeOwner(),panel=tree.props.children[1],content=panel.props.children.at(-1),button=h.find(tree,'button');for(const [part,label]of[[tree,'root'],[panel,'panel'],[content,'content'],[button,'close']]){part.props.ref(node);part.props.ref(null);assert.equal(calls.filter(call=>Array.isArray(call)&&call[0]===label&&call[1]==='cleanup').length,1);}
  const event=h.event(node,'compositionstart');tree.props.onCompositionStartCapture(event);tree.props.onCompositionStart(event);assert.equal(calls.filter(call=>call==='capture').length,1);assert.equal(calls.filter(call=>call==='bubble').length,1);
});
test('screen CSS consumes the shared skin/scroll closure without inventing font em or lifecycle animation',()=>{
  const css=readFileSync(path.join(root,'src/manifest-validation-screen.css'),'utf8');assert(css.includes("@import './manifest-validation-parts.css'"));assert(css.includes('opacity:1;pointer-events:none'));assert(css.includes('calc(21px * var(--mc-manifest-scale))'));assert(css.includes('calc(15px * var(--mc-manifest-scale))'));assert(css.includes('calc(9px * var(--mc-manifest-scale))'));assert(!css.includes('max-width:'));assert(!css.includes('animation:'));assert(!css.includes('::-webkit-scrollbar'));assert(css.includes('@media(forced-colors:active)'));
});
