import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import {build} from 'esbuild';
import ts from 'typescript';

const require=createRequire(import.meta.url),sha=value=>createHash('sha256').update(value).digest('hex');
// Frozen from the pre-extraction RecipeBook. Full HTML including generated IDs
// was compared independently; these persistent hashes keep that default contract.
const fixtures=[{"name":"default","props":{"title":"Recipes","entries":[{"id":"iron","label":"Iron ingot"},{"id":"gold","label":"Gold ingot"}],"categoryId":"items","query":"","craftableOnly":false}},{"name":"search","props":{"title":"Search results","entries":[{"id":"iron","craftableCount":3}],"categoryId":"search","query":"iron","craftableOnly":true}},{"name":"creative","props":{"title":"Creative","entries":[{"id":"sand","disabled":true},{"id":"glass"}],"categoryId":"nature","query":"","craftableOnly":false,"creative":true,"selectedId":"glass"}},{"name":"creative-search","props":{"title":"Creative search","entries":[{"id":"sand"}],"categoryId":"search","query":"sand","craftableOnly":true,"creative":true}},{"name":"empty","props":{"title":"Nothing","entries":[],"categoryId":"search","query":"missing","craftableOnly":false,"emptyLabel":"No furnace recipes","searchLabel":"Find recipe","searchPlaceholder":"Search","filterLabel":"Available","categoriesLabel":"Groups","recipesLabel":"Result list"}},{"name":"disabled","props":{"title":"Disabled","entries":[{"id":"a"},{"id":"b","disabled":true},{"id":"c","item":{"name":"C","disabled":true}}],"categoryId":"equipment","query":"","craftableOnly":true,"disabled":true,"selectedId":"b"}},{"name":"explicit-id-native","props":{"title":"Custom title","entries":[{"id":"a","label":"A","craftableCount":4,"modifier":"expand","backgroundImage":"/a.png","backgroundSlice":2},{"id":"b","modifier":"collapse","item":{"name":"B","count":64,"durability":0.5,"image":"/item.png"}}],"categoryId":"a/b","query":"","craftableOnly":false,"id":"host-book","className":"host","aria-label":"Host recipes","data-host":"yes","dir":"rtl","categories":[{"id":"a/b","label":"Fuels"},{"id":"search","label":"Find","disabled":true}]}},{"name":"rows","props":{"title":"Three rows","entries":[{"id":"0"},{"id":"1","disabled":true},{"id":"2"},{"id":"3"},{"id":"4"},{"id":"5"},{"id":"6"},{"id":"7"},{"id":"8"},{"id":"9"},{"id":"10"},{"id":"11"},{"id":"12"},{"id":"13"},{"id":"14"},{"id":"15"}],"categoryId":"items","query":"","craftableOnly":false,"selectedId":"8"}},{"name":"no-categories","props":{"title":"None","entries":[{"id":"same","craftableCount":0}],"categories":[],"categoryId":"unknown","query":"","craftableOnly":false}}];
const oldSSR={"18":{"default":"13a1fcde2be553e1ee00f0ba0c491a2a76b99051497204fc2d5ec8cfd739b28a","search":"eebc324ad4fb9bce44f53fc8be9979ac020efb968613876847dc9fce3336b9d1","creative":"8c712b0131e6936f98d8eb82d7e1edacfa1b9b7492eec0a910d05c779de0491f","creative-search":"b89d05ddc3712b91ef127dc9184c4118a18c7b4491f7d51ff82f33f2bb86898b","empty":"922a7a5a7d0e41bbc3694e7c4c859dea222e63c0e0d1fa6788eb2b6532239b79","disabled":"f034211fc01ca673ddc470fadd71abf4b8835e4fa816eb4bba9a81c82c8f1cc2","explicit-id-native":"d8c15a946f5d3d4900f3cc81275d8996b0c97ef1a8655e54484a8adaa427bd89","rows":"f4754c14b28fd2655d60d7483fea221029143d98eb0b95a1fab16a60019336b8","no-categories":"dc9182ec4dfc40a27f06663cbc7782cf7539da61ffbbf74872533da568319775"},"19":{"default":"1e5994c42bcc3c3e22149457a5dd5287a989a11e27c09e5eb19ea6928635f66e","search":"c5e27f5f2ef87b13e6f413204935699abe4d276eeef72ef2ce15d86f50a0ce56","creative":"c1971f48da87fd50cf129f61ea5834b7aa89f50323e5b742d4baa567a7254e80","creative-search":"dd4a3e80b29e176dbb6627b85adb876b24b7fb6d2bc63e32268169366b795469","empty":"b577d16344bcaf39b6b761d4ea7cb69504907b61093265d3ae9bad6328601cbb","disabled":"f108726d1a68678325b4eecd8837865650abf4d006f5ac04c9e49ef960d85559","explicit-id-native":"3455541727742b75aa12c0771e59d18fba3b8bb16008e548ded1c507bf225f36","rows":"c921c85e2f67dc2ccb7578c415a141a1be914bf6137f2892682f6d1148e7dccf","no-categories":"763a183264093fdf944a1439e5c10404b39843b67bbc2a29689d7938182fbc02"}};
const built=await build({stdin:{contents:"export {RecipeBook,RecipeBookEntry} from './src/recipe-book';export {useRecipeBookView} from './src/recipe-book-core';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',write:false,external:['react','react/*'],define:{'import.meta.url':JSON.stringify('file:///mcbeui-source/src/fixture.js')}});
function load(req){const module={exports:{}};vm.runInThisContext('(function(require,module,exports){'+built.outputFiles[0].text+'\n})')(req,module,module.exports);return module.exports;}
const peers=[require];for(const major of[18,19]){try{const req=createRequire(path.resolve(`.cache/consumer-react${major}/package.json`));if(!peers.some(r=>r('react').version===req('react').version))peers.push(req);}catch{}}
for(const req of peers){const React=req('react'),{renderToStaticMarkup}=req('react-dom/server'),{RecipeBook,RecipeBookEntry,useRecipeBookView}=load(req),major=React.version.split('.')[0];
 for(const fixture of fixtures)test(`legacy RecipeBook exact frozen SSR ${fixture.name} React${React.version}`,()=>{
  let calls=0;const callback=()=>calls++;
  const html=renderToStaticMarkup(React.createElement(RecipeBook,{...fixture.props,ref:callback,onRecipeAction:callback,onCategoryChange:callback,onQueryChange:callback,onCraftableOnlyChange:callback,onKeyDown:callback}));
  assert.equal(sha(html),oldSSR[major][fixture.name]);assert.equal(calls,0);assert(!html.includes('data-recipe-profile'));
 });
 test(`private default render seam adds no component/ID boundary React${React.version}`,()=>{
  const parts={renderEntry:props=>React.createElement(RecipeBookEntry,props)};
  const Shared=React.forwardRef(function Shared(props,ref){return useRecipeBookView(props,ref,parts);});
  for(const fixture of fixtures)assert.equal(renderToStaticMarkup(React.createElement(Shared,fixture.props)),renderToStaticMarkup(React.createElement(RecipeBook,fixture.props)));
 });
 test(`private furnace renderers retain controlled props and suppress only header filter cases React${React.version}`,()=>{
  const seen={entries:[],categories:[],filters:[]};let callbacks=0;const callback=()=>callbacks++;
  const parts={profile:'furnace',sourceContext:false,renderEntry:props=>{seen.entries.push(props);return React.createElement('button',{'data-private-entry':props.entry.id});},renderCategories:props=>{seen.categories.push(props);return React.createElement('div',{'data-private-categories':props.value});},renderFilter:props=>{seen.filters.push(props);return React.createElement('button',{'data-private-filter':props.craftableOnly});}};
  const Shared=React.forwardRef(function Shared(props,ref){return useRecipeBookView(props,ref,parts);});
  const props={...fixtures[0].props,selectedId:'gold',onCategoryChange:callback,onQueryChange:callback,onCraftableOnlyChange:callback,onRecipeAction:callback};
  const html=renderToStaticMarkup(React.createElement(Shared,props));assert.match(html,/data-recipe-profile="furnace"/);assert.equal(callbacks,0);
  assert.equal(seen.categories[0].onValueChange,callback);assert.equal(seen.categories[0].panelId,seen.categories[0].id.replace(/-categories$/,'-recipes'));assert.equal(seen.filters[0].onCraftableOnlyChange,callback);
  assert.equal(seen.entries.length,2);assert.equal(seen.entries[0].entry,props.entries[0]);assert.equal(seen.entries[0].onRecipeAction,callback);assert.equal(typeof seen.entries[0].ref,'function');assert.equal(seen.entries[0].tabIndex,-1);assert.equal(seen.entries[1].tabIndex,0);assert.equal(seen.entries[1].selected,true);
  for(const patch of[{categoryId:'search'},{creative:true}]){seen.filters=[];const html=renderToStaticMarkup(React.createElement(Shared,{...props,...patch}));assert.equal(seen.filters.length,0);if(patch.categoryId)assert.match(html,/mc-recipe-search/);}
 });
}

// CPU-only hook storage models the shared logic without mounting React or DOM.
// Real browser focus/scroll/ResizeObserver lifecycle remains a separate test tier.
const coreSource=await readFile(new URL('../src/recipe-book-core.tsx',import.meta.url),'utf8');
const coreJS=ts.transpileModule(coreSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function harness(bridge){
 const slots=[],pending=[];let cursor=0,contextReads=0,direction='ltr';
 const React=require('react'),ScrollArea=function ScrollArea(){},RecipeSearch=function RecipeSearch(){};
 const hooks={...React,
  useRef(value){const slot=cursor++;return slots[slot]??=( {current:value} );},
  useId(){return hooks.useRef('cpu-id').current;},
  useContext(){contextReads++;return bridge;},
  useState(initial){const slot=cursor++;slots[slot]??={value:typeof initial==='function'?initial():initial};return[slots[slot].value,next=>{slots[slot].value=typeof next==='function'?next(slots[slot].value):next;}];},
  useCallback(callback,deps){const slot=cursor++,old=slots[slot];if(old&&deps.length===old.deps.length&&deps.every((value,index)=>Object.is(value,old.deps[index])))return old.callback;slots[slot]={callback,deps};return callback;},
  useEffect(setup,deps){const slot=cursor++,old=slots[slot];if(!old||deps.some((value,index)=>!Object.is(value,old.deps[index]))){slots[slot]={deps,cleanup:old?.cleanup};pending.push(()=>{slots[slot].cleanup?.();slots[slot].cleanup=setup();});}},
 };
 let observed,disconnected=0;const module={exports:{}};
 const sandbox={exports:module.exports,module,require:id=>id==='react'?hooks:id==='./inventory-screens'?{RecipeSearch,RecipeCategoryTabs:function RecipeCategoryTabs(){},RecipeFilterToggle:function RecipeFilterToggle(){}}:id==='./scroll-area'?{ScrollArea}:id==='./crafting-image-layer'?{CraftingRecipeViewport:{}}:require(id),getComputedStyle:()=>({direction}),ResizeObserver:class{constructor(callback){this.callback=callback;}observe(node){observed={node,callback:this.callback};}disconnect(){disconnected++;}}};
 vm.runInNewContext(coreJS,sandbox);
 let entries=[];const parts={renderEntry:props=>{entries.push(props);return React.createElement('button',{'data-entry':props.entry.id});}};
 return {render(props,extra={}){cursor=0;entries=[];const root=module.exports.useRecipeBookView(props,null,{...parts,...extra});const children=root.props.children,scroll=children.find(child=>child?.type===ScrollArea);return{root,scroll,entries:[...entries]};},flush(){while(pending.length)pending.shift()();},cleanup(){for(const slot of slots)slot?.cleanup?.();},get observed(){return observed;},get disconnected(){return disconnected;},get contextReads(){return contextReads;},set direction(value){direction=value;}};
}
function key(root,target,key,patch={}){let prevented=0;const event={target,currentTarget:root,key,ctrlKey:false,defaultPrevented:false,nativeEvent:{isComposing:false},preventDefault(){this.defaultPrevented=true;prevented++;},...patch};root.props.onKeyDown(event);return{event,prevented};}

test('shared CPU core preserves real entry refs, skipped disabled navigation, RTL and roving focus state',()=>{
 const h=harness(),props={...fixtures[0].props,entries:Array.from({length:16},(_,i)=>({id:String(i),disabled:i===1})),selectedId:'2'};
 let view=h.render(props);const focused=[];const nodes=props.entries.map(entry=>({focus(){focused.push(entry.id);}}));view.entries.forEach((entry,i)=>entry.ref(nodes[i]));
 assert.equal(view.entries.filter(entry=>entry.tabIndex===0)[0].entry.id,'2');key(view.root,nodes[0],'ArrowRight');assert.deepEqual(focused,['2']);
 h.direction='rtl';key(view.root,nodes[2],'ArrowRight');assert.equal(focused.at(-1),'0');h.direction='ltr';
 key(view.root,nodes[2],'ArrowDown');assert.equal(focused.at(-1),'9');key(view.root,nodes[9],'Home');assert.equal(focused.at(-1),'7');key(view.root,nodes[9],'End',{ctrlKey:true});assert.equal(focused.at(-1),'15');
 view.entries[5].onFocus({});view=h.render(props);assert.equal(view.entries.filter(entry=>entry.tabIndex===0)[0].entry.id,'5');
 view.entries[5].ref(null);const before=focused.length;key(view.root,nodes[5],'ArrowRight');assert.equal(focused.length,before);
});
test('shared CPU core preserves host veto, composition/disabled guards and controlled active fallback',()=>{
 const h=harness(),props={...fixtures[0].props,selectedId:'gold'},view=h.render({...props,onKeyDown:event=>event.preventDefault()});const nodes=view.entries.map(()=>({focus(){assert.fail('guarded navigation');}}));view.entries.forEach((entry,i)=>entry.ref(nodes[i]));
 key(view.root,nodes[0],'ArrowRight');const composing=h.render(props);key(composing.root,nodes[0],'ArrowRight',{nativeEvent:{isComposing:true}});const disabled=h.render({...props,disabled:true});key(disabled.root,nodes[0],'ArrowRight');assert(disabled.entries.every(entry=>entry.tabIndex===-1));
 const changed=h.render({...props,entries:[props.entries[0]]});assert.equal(changed.entries[0].tabIndex,0);
});
test('shared CPU core retains column measurement and observer cleanup',()=>{
 const h=harness(),props={...fixtures[0].props,entries:Array.from({length:8},(_,i)=>({id:String(i)}))};let view=h.render(props);const node={clientWidth:108};view.scroll.props.viewportRef(node);h.flush();view=h.render(props);assert.equal(h.observed.node,node);assert.equal(view.scroll.props.children[0].props['aria-colcount'],3);assert.equal(view.scroll.props.children[0].props['aria-rowcount'],3);node.clientWidth=36;h.observed.callback();view=h.render(props);assert.equal(view.scroll.props.children[0].props['aria-colcount'],1);h.cleanup();assert.equal(h.disconnected,1);
});
test('shared CPU core source-context opt-out still reads context and suppresses bind/scroll only',()=>{
 const bound=[];const scroll=()=>{},h=harness({bind:node=>bound.push(node),scroll}),node={clientWidth:100};const connected=h.render(fixtures[0].props);assert.equal(connected.scroll.props.onScrollPositionChange,scroll);connected.scroll.props.viewportRef(node);connected.scroll.props.viewportRef(null);assert.deepEqual(bound,[node,null]);const count=h.contextReads;const disconnected=h.render(fixtures[0].props,{sourceContext:false,profile:'furnace'});assert.equal(h.contextReads,count+1);assert.equal(disconnected.scroll.props.onScrollPositionChange,undefined);disconnected.scroll.props.viewportRef(node);disconnected.scroll.props.viewportRef(null);assert.equal(bound.length,2);assert.equal(disconnected.root.props['data-recipe-profile'],'furnace');
});
test('shared core imports legacy props only as types; public entry and API declarations retain their frozen AST',async()=>{
 const publicSource=await readFile(new URL('../src/recipe-book.tsx',import.meta.url),'utf8'),parse=source=>ts.createSourceFile('x.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),file=parse(publicSource),core=parse(coreSource);let entry;
 function visit(node){if(ts.isFunctionExpression(node)&&node.name?.text==='RecipeBookEntry')entry=node;ts.forEachChild(node,visit);}visit(file);
 assert.equal(sha(entry.getText(file)),"30181b7fa33bdd08e6aeb07c0fce8fb7302f19225db9b1c6c3e26570281b172c");
 const printer=ts.createPrinter({removeComments:true}),types=file.statements.filter(node=>ts.isInterfaceDeclaration(node)||ts.isTypeAliasDeclaration(node)).map(node=>printer.printNode(ts.EmitHint.Unspecified,node,file));assert.equal(sha(JSON.stringify(types)),"eb8df6fee60806cffd433919fbc0d0a46ac46aacbcae781ede724b1fb11cad77");
 for(const node of core.statements)if(ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='./recipe-book')assert.equal(node.importClause.isTypeOnly,true);
});
