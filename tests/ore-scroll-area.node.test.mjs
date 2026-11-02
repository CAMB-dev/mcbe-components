import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import ts from 'typescript';

const root=process.cwd(),rootRequire=createRequire(import.meta.url);
const built=await build({entryPoints:[path.join(root,'src/ore-scroll-area.tsx')],bundle:true,platform:'node',format:'cjs',jsx:'automatic',write:false,external:['react','react/*']});
function load(require){const module={exports:{}};vm.runInThisContext('(function(require,module,exports){'+built.outputFiles[0].text+'\n})')(require,module,module.exports);return module.exports;}
const peers=[rootRequire];for(const major of[18,19]){try{const require=createRequire(path.join(root,`.cache/consumer-react${major}/package.json`));if(!peers.some(r=>r('react').version===require('react').version))peers.push(require);}catch{}}

// Invoke the exact production binder with only React's ref/callback hook storage
// modeled here. These CPU cases do not claim mounted React/DOM qualification.
const binderSource=await readFile(path.join(root,'src/ore-scroll-area.tsx'),'utf8');
const binderAST=ts.createSourceFile('ore-scroll-area.tsx',binderSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const binderNodes=binderAST.statements.filter(node=>ts.isFunctionDeclaration(node)&&['assignRef','useMergedRef'].includes(node.name?.text));
const binderJS=ts.transpileModule(binderNodes.map(node=>node.getText(binderAST)).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function refHarness(){
 const slots=[];let cursor=0;
 const useRef=value=>slots[cursor++]??=( {current:value} );
 const useCallback=(callback,deps)=>{const slot=cursor++,old=slots[slot];if(old&&deps.length===old.deps.length&&deps.every((value,index)=>Object.is(value,old.deps[index])))return old.callback;slots[slot]={callback,deps};return callback;};
 const useMergedRef=Function('useRef','useCallback',binderJS+'\nreturn useMergedRef;')(useRef,useCallback);
 return {render(own,legacy,forwarded){cursor=0;return useMergedRef(own,legacy,forwarded);}};
}
test('CPU production ref binder honors returned cleanup and object refs exactly once',()=>{
 const harness=refHarness(),own={current:null},object={current:null},node={kind:'viewport'};let attach=0,cleanup=0,nulls=0;
 const callback=value=>{if(value===null){nulls++;return;}attach++;assert.equal(value,node);return()=>cleanup++;};
 const bind=harness.render(own,callback,object);assert.equal(bind(node),undefined);assert.equal(own.current,node);assert.equal(object.current,node);assert.equal(attach,1);
 assert.equal(bind(null),undefined);assert.equal(own.current,null);assert.equal(object.current,null);assert.equal(cleanup,1);assert.equal(nulls,0);
 bind(null);assert.equal(cleanup,1);assert.equal(nulls,0);
});
test('CPU production ref binder deduplicates callback and object aliases and preserves ordinary null detach',()=>{
 const harness=refHarness(),own={current:null},node={kind:'viewport'},calls=[];
 const ordinary=value=>{calls.push(value);};const bind=harness.render(own,ordinary,ordinary);bind(node);bind(null);bind(null);assert.deepEqual(calls,[node,null]);
 const writes=[];const object={set current(value){writes.push(value);}};const objectBind=harness.render(own,object,object);objectBind(node);objectBind(null);objectBind(null);assert.deepEqual(writes,[node,null]);
 let releases=0;const callback=value=>value===null?assert.fail('Cleanup ref must not receive null'):()=>releases++;
 const cleanupBind=harness.render(own,callback,callback);cleanupBind(node);cleanupBind(null);cleanupBind(null);assert.equal(releases,1);
});
test('CPU production ref binder releases replaced refs on detach without publishing speculative attachments',()=>{
 const harness=refHarness(),own={current:null},firstObject={current:null},node={kind:'viewport'},events=[];
 const first=value=>{events.push(['first',value]);return()=>events.push(['first-cleanup']);};
 const before=harness.render(own,first,firstObject);before(node);assert.equal(harness.render(own,first,firstObject),before);
 const next=value=>{events.push(['next',value]);return()=>events.push(['next-cleanup']);};const nextObject={current:null};
 const after=harness.render(own,nextObject,next);assert.notEqual(after,before);assert.equal(events.length,1);assert.equal(firstObject.current,node);assert.equal(nextObject.current,null);
 before(null);assert.equal(firstObject.current,null);assert.equal(own.current,null);assert.deepEqual(events,[['first',node],['first-cleanup']]);
 after(node);assert.equal(nextObject.current,node);assert.equal(own.current,node);after(null);after(null);assert.equal(nextObject.current,null);assert.equal(own.current,null);
 assert.deepEqual(events,[['first',node],['first-cleanup'],['next',node],['next-cleanup']]);
});
for(const require of peers){const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{OreScrollArea}=load(require);const render=props=>renderToStaticMarkup(React.createElement(OreScrollArea,{label:'Document body',children:React.createElement('input',{defaultValue:'Accepted literal'}),...props}));
 test(`OreScrollArea SSR names the real viewport, retains content and owns standalone units React${React.version}`,()=>{
  let refs=0;const html=render({ref:()=>refs++,viewportRef:()=>refs++,guiScale:2,className:'host-scroll'});
  assert.equal(refs,0);assert.match(html,/class="mc-ore-scroll host-scroll"/);assert.match(html,/--mc-ore-scroll-unit:10px/);assert(!html.includes('--mc-ore-unit:'));assert.match(html,/role="region" aria-label="Document body" tabindex="0"/);assert.match(html,/value="Accepted literal"/);
  const id=html.match(/<div id="([^"]+)" class="mc-ore-scroll__viewport"/)[1];assert(html.includes(`aria-controls="${id}"`));assert.match(html,/role="scrollbar"/);assert.match(html,/aria-valuemin="0" aria-valuemax="0" aria-valuenow="0"/);
 });
 test(`OreScrollArea touch mode keeps a decorative indicator and no second keyboard scrollbar React${React.version}`,()=>{
  const html=render({inputMode:'touch',floating:true,bottomInset:12});assert.match(html,/data-input-mode="touch"/);assert.match(html,/data-floating="true"/);assert.match(html,/class="mc-ore-scroll__touch" aria-hidden="true" hidden=""/);assert(!html.includes('role="scrollbar"'));
 });
 test(`OreScrollArea malformed public geometry and names reject before effects React${React.version}`,()=>{
  for(const patch of[{label:42},{guiScale:0},{guiScale:Infinity},{inputMode:'gamepad'},{bottomInset:NaN},{floating:'true'}])assert.throws(()=>render(patch),e=>e instanceof TypeError||e instanceof RangeError);
  assert.doesNotThrow(()=>render({bottomInset:-12,label:''}));
 });
}
test('Ore scroll CSS is shared by the existing permissions module without native scrollbars',async()=>{
 const old=await readFile(path.join(root,'src/ore-player-permissions.css'),'utf8'),css=await readFile(path.join(root,'src/ore-scroll-area.css'),'utf8'),source=await readFile(path.join(root,'src/ore-player-permissions.tsx'),'utf8');
 assert.match(old,/@import ['"]\.\/ore-scroll-area\.css['"]/);assert(!old.includes('.mc-ore-scroll'));assert(source.includes("import { OreScrollArea as OreScroll } from './ore-scroll-area'"));assert(!source.includes('function OreScroll('));
 assert(css.includes('scrollbar-width:none'));assert(css.includes('::-webkit-scrollbar {display:none}'));assert(css.includes('touch-action:none'));assert(css.includes('data-floating'));assert(css.includes('background:CanvasText'));assert(css.includes('background:ButtonFace'));
});
