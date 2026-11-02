import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import ts from 'typescript';

const require=createRequire(import.meta.url),root=process.cwd();
// Source-only in-memory CPU transpilation, not a product build or browser oracle.
function loader(peer,overrides=new Map()){const cache=new Map();return function load(filename){
  filename=path.resolve(root,filename);if(cache.has(filename))return cache.get(filename).exports;
  const module={exports:{}};cache.set(filename,module);
  const source=(overrides.get(filename)??readFileSync(filename,'utf8')).replaceAll('import.meta.url',JSON.stringify(pathToFileURL(filename).href));
  const js=ts.transpileModule(source,{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const local=id=>{if(!id.startsWith('.'))return peer(id);const stem=path.resolve(path.dirname(filename),id);if(/\.(png|woff2?|ttf|otf)$/.test(stem))return pathToFileURL(stem).href;const target=[stem,stem+'.ts',stem+'.tsx',stem+'.js',stem+'.json'].find(existsSync);if(!target)throw Error('Unresolved CPU module '+stem);return target.endsWith('.json')?peer(target):load(target);};
  vm.runInThisContext('(function(require,module,exports){'+js+'\n})',{filename})(local,module,module.exports);return module.exports;
};}
const peers=[require];for(const major of[18,19])try{const peer=createRequire(path.join(root,`.cache/consumer-react${major}/package.json`));if(!peers.some(r=>r('react').version===peer('react').version))peers.push(peer);}catch{}
for(const peer of peers){
  const React=peer('react'),el=React.createElement,ssr=peer('react-dom/server').renderToStaticMarkup,load=loader(peer),ui=load('src/pack-settings.tsx'),factory=load('demo/pack-settings-data.ts').createPackSettingsDemoProps;
  const props=()=>({...factory(),open:true}),content=()=>({...factory().content,size:[354,219],scale:2}),tier=()=>({...factory().content.tier,width:339,scale:2});
  test(`Pack Settings source frame and no-Play-minus-one scroll geometry (${React.version})`,()=>{
    const p=props(),plan=ui.planPackSettingsScreen(p),html=ssr(el(ui.PackSettingsScreen,p));
    assert.deepEqual(plan,{panelWidth:370,panelHeight:250,size:[354,219]});
    assert(html.includes('left:50px;top:50px;width:740px;height:500px'));assert(html.includes('width:724px;height:484px'));assert(html.includes('class="mc-pack-settings-screen__title"'));
    assert.deepEqual(ui.planPackSettingsContent(content()),{paneWidth:350,viewportWidth:343,contentWidth:339});
    assert(html.includes('left:4px;width:700px;height:438px'));assert(html.includes('mc-pack-settings-content__stack" style="width:678px"'));
    assert.equal((html.match(/class="mc-scroll-area /g)??[]).length,1);assert(!html.includes('<form'));
    const narrow=ui.planPackSettingsScreen({...p,viewportSize:[320,204]});assert.equal(narrow.panelWidth,316);assert.equal(narrow.panelHeight,154);
  });
  test(`Pack Settings scopes its fixed-source whole scrollbar URLs on Content (${React.version})`,()=>{
    const assets=load('src/resource-pack-assets.ts').resourcePackAssets,p=content(),html=ssr(el(ui.PackSettingsContent,p));
    const vars={'--mc-skin-scroll-track':`url(${JSON.stringify(assets['textures/ui/ScrollRail'].url)})`,'--mc-skin-scroll-thumb':`url(${JSON.stringify(assets['textures/ui/ScrollHandle'].url)})`};
    const encoded=ssr(el('div',{style:vars})).match(/style="([^"]+)"/)[1];assert(html.includes(encoded));assert.equal((html.match(/--mc-skin-scroll-track:/g)??[]).length,1);assert.equal((html.match(/--mc-skin-scroll-thumb:/g)??[]).length,1);
    const screen=ssr(el(ui.PackSettingsScreen,props()));assert.equal((screen.match(/--mc-skin-scroll-track:/g)??[]).length,1);assert(screen.indexOf('--mc-skin-scroll-track:')>screen.indexOf('class="mc-pack-settings-content"'));
  });
  test(`tier support, visibility, raw values and explicit Web domain stay independent (${React.version})`,()=>{
    const p=tier(),yes=ssr(el(ui.PackContentTier,p)),no=ssr(el(ui.PackContentTier,{...p,contentTierSupported:false}));
    assert(yes.includes('data-source-value="0.6"'));assert(yes.includes('data-source-steps="4"'));assert(yes.includes('min="10"'));assert(yes.includes('max="50"'));assert(yes.includes('step="5"'));assert(yes.includes('value="25"'));
    assert(!/<input[^>]*disabled/.test(no));assert(no.includes('rgb(100% 0% 0%)'));assert(no.includes('此内容等级与当前设备不兼容。'));assert.equal(ui.planPackContentTier(p).height,34);assert.equal(ui.planPackContentTier({...p,contentTierSupported:false}).height,54);
    const hidden=ssr(el(ui.PackContentTier,{...p,hasContentTiering:false}));assert(/class="mc-pack-content-tier" hidden/.test(hidden));assert(/<input[^>]*disabled/.test(hidden));
    const independent=ssr(el(ui.PackContentTier,{...p,value:900,steps:-2.5}));assert(independent.includes('data-source-steps="-2.5"'));assert(independent.includes('value="25"'));
    const readonly=ssr(el(ui.PackContentTier,{...p,readOnly:true}));assert(readonly.includes('aria-readonly="true"'));assert(!/<input[^>]*disabled/.test(readonly));
  });
  test(`generated complete collection reuses nine actual row factories without another shell (${React.version})`,()=>{
    const p=content(),html=ssr(el(ui.PackSettingsContent,p));assert(html.includes('data-source-custom-form-length="9"'));
    for(const label of['显示设置','调整当前资源包','配置名称','动态细节','细节距离','纹理细节','色彩方案','显示内容'])assert(html.includes(label),label);
    assert(!html.includes('mc-server-form__title'));assert(!html.includes('mc-server-form__skin'));assert(!html.includes('mc-server-form__close'));assert(!html.includes('mc-server-form__scroll'));assert(!html.includes('mc-server-custom-form__submit'));
    const snapshot={...p,generated:{...p.generated,contents:{...p.generated.contents,fields:p.generated.contents.fields.map((field,index)=>index===0?{...field,visible:false}:field)}}};assert.doesNotThrow(()=>ui.planPackSettingsContent(snapshot));
    assert.throws(()=>ui.planPackSettingsContent({...snapshot,generated:{...snapshot.generated,customFormLength:8}}),/complete custom_form/);
    const empty={...p,generated:{customFormLength:0,contents:{fields:[]}}};assert.doesNotThrow(()=>ssr(el(ui.PackSettingsContent,empty)));
  });
  test(`touch scroll, closed screen, real refs and all native callbacks remain SSR-inert (${React.version})`,()=>{
    const p=props(),descriptors=new Map(),attempts=[],warnings=[],original=console.error;let calls=0;
    console.error=(...args)=>warnings.push(args.join(' '));
    for(const key of['fetch','Image','createImageBitmap','OffscreenCanvas','ResizeObserver','requestAnimationFrame','setTimeout','setInterval']){descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value(){attempts.push(key);throw Error('SSR IO');}});}
    try{
      const c=content();assert.deepEqual(ui.planPackSettingsContent({...c,inputMode:'touch'}),{paneWidth:350,viewportWidth:350,contentWidth:346});
      ssr(el(ui.PackSettingsContent,{...c,inputMode:'touch',ref:()=>calls++,scrollViewportRef:()=>calls++}));
      const html=ssr(el(ui.PackSettingsScreen,{...p,open:false,ref:()=>calls++,panelRef:()=>calls++,contentRef:()=>calls++,closeButtonRef:()=>calls++,onCloseRequest:()=>calls++,content:{...p.content,tier:{...p.content.tier,inputRef:()=>calls++,onValueChange:()=>calls++}}}));
      assert(/role="dialog"[^>]*hidden/.test(html));assert.equal(calls,0);assert.deepEqual(attempts,[]);assert.deepEqual(warnings,[]);
    }finally{console.error=original;for(const[key,descriptor]of descriptors)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
  });
  test(`invalid explicit domains, geometry and collection snapshots fail pure preflight (${React.version})`,()=>{
    const p=tier();for(const patch of[{scale:0},{width:20},{width:'339'},{labelHeight:NaN},{reasonHeight:-1},{value:Infinity},{steps:NaN},{hasContentTiering:'true'},{web:{...p.web,max:p.web.min}},{web:{...p.web,step:0}},{web:{...p.web,value:26}},{web:{...p.web,min:-1e308,max:1e308,value:0,step:1e308}},{web:{...p.web,markers:[{offset:322,progress:false}]}}])assert.throws(()=>ui.planPackContentTier({...p,...patch}),e=>e instanceof TypeError||e instanceof RangeError);
    const c=content();for(const patch of[{inputMode:'keyboard'},{size:[20,50]},{generated:{customFormLength:0,contents:c.generated.contents}},{generated:{customFormLength:1,contents:{fields:[{id:'bad',type:'dropdown',label:'Bad',options:[{value:'duplicate',label:'A'},{value:'duplicate',label:'B'}]}]}}}])assert.throws(()=>ui.planPackSettingsContent({...c,...patch}),e=>e instanceof TypeError||e instanceof RangeError);
    for(const viewportSize of[[40,300],[420,80],[Infinity,300]])assert.throws(()=>ui.planPackSettingsScreen({...props(),viewportSize}),RangeError);
  });
}

test('scrollbar whole PNG identities use independently pinned fixed-ZIP bytes, not decoded-RGBA equivalence',()=>{
  const assets=loader(require)('src/resource-pack-assets.ts').resourcePackAssets;
  // Independent original ZIP audit: resource-pack-settings-review-20261102-01.
  for(const [key,sha,width,height,metadata]of[
    ['textures/ui/ScrollRail','eab268e0814cb9db1e2c8e158cea2d54a9b5f07fe0b7b74f82d5a67fa32cc6be',1,1,{nineslice_size:1,base_size:[1,1]}],
    ['textures/ui/ScrollHandle','f5e26f4b26c2edadd36e8a8bec2018b86558525f9920168d8d2c277bd210f46a',3,5,{nineslice_size:[1,2,1,2],base_size:[3,5]}],
  ]){const asset=assets[key],bytes=asset.url.startsWith('data:')?Buffer.from(asset.url.slice(asset.url.indexOf(',')+1),'base64'):readFileSync(new URL(asset.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),sha);assert.equal(asset.width,width);assert.equal(asset.height,height);assert.deepEqual(asset.metadata,metadata);}
});

// Finite hook/event host for request ordering/ref cleanup only; not DOM pixels,
// range-UA behaviour, modal browser focus or native engine evidence.
function harness(){
  let cursor=0,id=0;const slots=[],jsx=(type,props,key)=>({type,props,key}),actual=loader(require),module={exports:{}},lifecycle={exports:{}};
  const effect=(fn,deps)=>{const index=cursor++,previous=slots[index];if(!deps||!previous||deps.some((value,i)=>value!==previous.deps?.[i])){previous?.cleanup?.();slots[index]={deps,cleanup:fn()};}};
  const React={forwardRef:render=>({render}),useId:()=>`cpu-${id++}`,useRef:value=>{const index=cursor++;return slots[index]??(slots[index]={current:value});},useCallback:fn=>fn,useEffect:effect,useLayoutEffect:effect};
  const classic=ts.transpileModule(readFileSync(path.join(root,'src/classic-screen-lifecycle.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInThisContext('(function(require,module,exports){'+classic+'\n})')(id=>id==='react'?React:{lockModalScroll:()=>()=>{}},lifecycle,lifecycle.exports);
  const state={ownsModal:true},tasks=[],microtasks=[],view={setTimeout:fn=>tasks.push(fn),queueMicrotask:fn=>microtasks.push(fn)};
  const dependencies={react:React,'react/jsx-runtime':{jsx,jsxs:jsx},'./classic-skin':actual('src/classic-skin.tsx'),'./scroll-area':{ScrollArea:'scroll'},'./server-forms':{ServerCustomContents:'generated',validateServerCustomContents:actual('src/server-forms.tsx').validateServerCustomContents},'./resource-pack-assets':actual('src/resource-pack-assets.ts'),'./classic-screen-lifecycle':{...lifecycle.exports,useClassicModal:()=>{},classicModalOwnsInput:()=>state.ownsModal}};
  const js=ts.transpileModule(readFileSync(path.join(root,'src/pack-settings.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInThisContext('(function(require,module,exports){'+js+'\n})')(id=>dependencies[id]??require(id),module,module.exports);
  const makeOwner=()=>({isConnected:true,closest:()=>null,contains:()=>true,ownerDocument:{defaultView:view}}),find=(tree,type)=>{if(!tree||typeof tree!=='object')return; if(tree.type===type)return tree;for(const child of[tree.props?.children].flat(Infinity)){const found=find(child,type);if(found)return found;}};
  const props=actual('demo/pack-settings-data.ts').createPackSettingsDemoProps();
  return{state,makeOwner,find,props,render(name,p,ref){cursor=0;return module.exports[name].render(p,ref);},unmount(){for(const slot of slots)slot?.cleanup?.();},flush(){while(tasks.length)tasks.shift()();while(microtasks.length)microtasks.shift()();},event(owner,type='change',patch={}){const event={type,currentTarget:owner,target:owner,nativeEvent:{defaultPrevented:false},defaultPrevented:false,persist(){},preventDefault(){event.defaultPrevented=true;event.nativeEvent.defaultPrevented=true;},stopPropagation(){},isDefaultPrevented(){return event.defaultPrevented;},isPropagationStopped(){return false;},...patch};return event;}};
}
test('controlled tier restores accepted input, defers identity-preserving requests, and accepts host refusal',()=>{
  for(const veto of['none','early','late']){
    const h=harness(),requests=[],p={...h.props.content.tier,width:339,scale:2,onValueChange:(value,detail)=>{requests.push({value,detail});return false;},inputProps:{onChange:event=>{if(veto==='early')event.preventDefault();}}};
    const tree=h.render('PackContentTier',p),input=h.find(tree,'input'),owner=h.makeOwner();owner.valueAsNumber=40;owner.value='40';input.props.ref(owner);const event=h.event(owner);input.props.onChange(event);assert.equal(owner.value,'25');assert.equal(requests.length,0);event.currentTarget=null;if(veto==='late')event.nativeEvent.defaultPrevented=true;h.flush();assert.equal(requests.length,veto==='none'?1:0);
    if(veto==='none'){const {value,detail}=requests[0];assert.equal(value,40);assert.equal(detail.previousValue,25);assert.equal(detail.sourceValue,.6);assert.equal(detail.sourceSteps,4);assert.equal(detail.event.currentTarget,owner);assert.equal(detail.control,owner);assert.equal(owner.value,'25');}
  }
});
test('queued range requests cancel on accepted-value changes and guard readonly, disabled, IME and refs',()=>{
  for(const change of['accepted','disabled','readonly','hidden','disconnected']){
    const h=harness(),requests=[],p={...h.props.content.tier,width:339,scale:2,onValueChange:(...args)=>requests.push(args)},tree=h.render('PackContentTier',p),input=h.find(tree,'input'),owner=h.makeOwner();owner.valueAsNumber=40;input.props.ref(owner);input.props.onChange(h.event(owner));
    if(change==='accepted')h.render('PackContentTier',{...p,web:{...p.web,value:30}});if(change==='disabled')h.render('PackContentTier',{...p,disabled:true});if(change==='readonly')h.render('PackContentTier',{...p,readOnly:true});if(change==='hidden')owner.closest=()=>({});if(change==='disconnected')owner.isConnected=false;h.flush();assert.equal(requests.length,0,change);
  }
  const h=harness(),calls=[],p={...h.props.content.tier,width:339,scale:2,readOnly:true,inputRef:node=>{calls.push(node);return()=>calls.push('cleanup');}},tree=h.render('PackContentTier',p),input=h.find(tree,'input'),owner=h.makeOwner();input.props.ref(owner);input.props.ref(null);assert.deepEqual(calls,[owner,'cleanup']);const key=h.event(owner,'keydown',{key:'ArrowRight',keyCode:229});input.props.onKeyDown(key);assert.equal(key.defaultPrevented,true);
});
test('screen native handlers can veto close and readonly retains source Escape/close exit requests',()=>{
  for(const origin of['close','escape'])for(const veto of['none','early','late','not-top']){
    const h=harness(),calls=[],p={...h.props,open:true,readOnly:true,onCloseRequest:detail=>calls.push(detail),onKeyDown:event=>{if(veto==='early')event.preventDefault();},closeButtonProps:{onClick:event=>{if(veto==='early')event.preventDefault();}}},tree=h.render('PackSettingsScreen',p),rootNode=h.makeOwner(),button=h.find(tree,'button'),buttonNode=h.makeOwner();buttonNode.disabled=false;tree.props.ref(rootNode);button.props.ref(buttonNode);
    const event=h.event(origin==='close'?buttonNode:rootNode,origin==='close'?'click':'keydown',{key:'Escape',repeat:false});if(origin==='close')button.props.onClick(event);else tree.props.onKeyDown(event);assert.equal(calls.length,0);if(veto==='late')event.nativeEvent.defaultPrevented=true;if(veto==='not-top')h.state.ownsModal=false;h.flush();assert.equal(calls.length,veto==='none'?1:0,origin+' '+veto);if(calls.length){assert.equal(calls[0].target,'button.menu_exit');assert.equal(calls[0].origin,origin);assert.equal(calls[0].event.currentTarget,origin==='close'?buttonNode:rootNode);}
  }
});
test('screen capture tracks IME despite caller cancellation and descendant composition stopPropagation',()=>{
  const h=harness(),calls=[],captures=[],p={...h.props,open:true,onCloseRequest:detail=>calls.push(detail),
    onCompositionStartCapture:event=>{captures.push('start');event.preventDefault();},
    onCompositionEndCapture:event=>{captures.push('end');event.preventDefault();}},tree=h.render('PackSettingsScreen',p),rootNode=h.makeOwner(),inputNode=h.makeOwner();
  tree.props.ref(rootNode);
  const start=h.event(rootNode,'compositionstart',{target:inputNode});tree.props.onCompositionStartCapture(start);start.stopPropagation();
  // Deliberately omit Screen's bubble listener, as a descendant can do in the
  // browser. Escape itself has neither native isComposing nor keyCode229.
  tree.props.onKeyDown(h.event(rootNode,'keydown',{key:'Escape',repeat:false,keyCode:27}));h.flush();assert.equal(calls.length,0);
  const end=h.event(rootNode,'compositionend',{target:inputNode});tree.props.onCompositionEndCapture(end);end.stopPropagation();
  const vetoed=h.event(rootNode,'keydown',{key:'Escape',repeat:false,keyCode:27});tree.props.onKeyDown(vetoed);vetoed.nativeEvent.defaultPrevented=true;h.flush();assert.equal(calls.length,0);
  tree.props.onKeyDown(h.event(rootNode,'keydown',{key:'Escape',repeat:false,keyCode:27}));h.flush();assert.equal(calls.length,1);assert.equal(calls[0].origin,'escape');assert.deepEqual(captures,['start','end']);
});
test('native root capture listeners survive prop updates and release on hidden, root replacement and unmount',()=>{
  const h=harness(),calls=[],reactCallbacks=[],p={...h.props,open:true,onCloseRequest:detail=>calls.push(detail),onCompositionStartCapture:()=>reactCallbacks.push('capture'),onCompositionStart:()=>reactCallbacks.push('bubble')};
  const nativeOwner=()=>{const owner=h.makeOwner(),target=new EventTarget(),added=[],removed=[];
    owner.addEventListener=(type,listener,capture)=>{added.push({type,listener,capture});target.addEventListener(type,listener,capture);};
    owner.removeEventListener=(type,listener,capture)=>{removed.push({type,listener,capture});target.removeEventListener(type,listener,capture);};
    return{owner,added,removed,dispatch(type,input){const event=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(event,'target',{value:input});event.preventDefault();target.dispatchEvent(event);}};
  };
  const first=nativeOwner(),input=h.makeOwner(),other=h.makeOwner();let tree=h.render('PackSettingsScreen',p);tree.props.ref(first.owner);tree=h.render('PackSettingsScreen',p);
  assert.deepEqual(first.added.map(({type,capture})=>[type,capture]),[['compositionstart',true],['compositionend',true]]);
  const escape=owner=>{tree.props.onKeyDown(h.event(owner,'keydown',{key:'Escape',repeat:false,keyCode:27}));h.flush();};
  // Invoke registered DOM EventTarget listeners, never React composition props.
  // Node has no DOM tree propagation; Root owns the actual descendant-stop test.
  first.dispatch('compositionstart',input);escape(first.owner);assert.equal(calls.length,0);assert.deepEqual(reactCallbacks,[]);
  tree=h.render('PackSettingsScreen',{...p,title:'Ordinary accepted rerender'});assert.equal(first.added.length,2);assert.equal(first.removed.length,0);escape(first.owner);assert.equal(calls.length,0);
  first.dispatch('compositionend',other);escape(first.owner);assert.equal(calls.length,0);
  first.dispatch('compositionend',input);escape(first.owner);assert.equal(calls.length,1);
  first.dispatch('compositionstart',input);tree=h.render('PackSettingsScreen',{...p,hidden:true});assert.equal(first.removed.length,2);tree=h.render('PackSettingsScreen',p);assert.equal(first.added.length,4);escape(first.owner);assert.equal(calls.length,2);
  const second=nativeOwner();tree.props.ref(second.owner);tree=h.render('PackSettingsScreen',p);assert.equal(first.removed.length,4);assert.equal(second.added.length,2);
  second.dispatch('compositionstart',input);escape(second.owner);assert.equal(calls.length,2);second.dispatch('compositionend',input);escape(second.owner);assert.equal(calls.length,3);
  h.unmount();assert.deepEqual(second.removed,second.added);assert.deepEqual(first.removed,first.added);
});
test('stylesheet uses source whole skins/custom rail and leaves tier incompatibility independent of enabled state',()=>{
  const css=readFileSync(path.join(root,'src/pack-settings.css'),'utf8');assert(css.includes("@import './server-forms.css'"));assert(css.includes('opacity:.65'));assert(css.includes('opacity:1;pointer-events:none'));assert(css.includes('calc(7px * var(--mc-pack-settings-scale))'));assert(css.includes('grid-template-columns:minmax(0,1fr)'));assert(css.includes('rgb(100% 0% 0%)'));assert(css.includes('mc-pack-settings-skin__patch'));assert(css.includes('appearance:auto'));assert(!css.includes('::-webkit-scrollbar'));
});
