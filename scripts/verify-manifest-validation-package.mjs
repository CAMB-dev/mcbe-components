import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import {transform} from 'esbuild';

const names=['ManifestValidationButton','ManifestPackSummary','ManifestValidationIssue','ManifestValidationIssues','ManifestValidationContent','ManifestValidationScreen'];
const hash=b=>createHash('sha256').update(b).digest('hex');
// Filled from an independent finite fixed-ZIP read during preparation, never
// generated from the product ledger or a browser screenshot.
const expectedAssets=[{"key":"textures/ui/copy","sourceFile":"resource_pack/textures/ui/copy.png","bytes":199,"sha256":"dd7b3dcc8c3ab7cc70c755bc25232014ebac3d54ab0bd393ab193b857e09059d","width":12,"height":12,"metadataSHA256":null},{"key":"textures/ui/trash_default","sourceFile":"resource_pack/textures/ui/trash_default.png","bytes":181,"sha256":"4931525ef5366df2cdedf35c526ad0a22cc5b9ab2b0f07fd79d16a9f89880ec3","width":16,"height":16,"metadataSHA256":null},{"key":"textures/ui/refresh","sourceFile":"resource_pack/textures/ui/refresh.png","bytes":211,"sha256":"cbc84d89170257d5fec5aa55bee2df9a53d907e6a15a8d84dfeb3d6246bf10ff","width":18,"height":14,"metadataSHA256":null},{"key":"textures/ui/divider3","sourceFile":"resource_pack/textures/ui/divider3.png","bytes":99,"sha256":"9d3316beada658b7da2a477b9f1c63710e1246e56328ae9e145f81ab5adbb3d9","width":1,"height":1,"metadataSHA256":"384aa89ff2d02cd552f6d7913fa5d35337570cb4475934b563846bcb2cd7c7f6"},{"key":"textures/ui/loading_bar","sourceFile":"resource_pack/textures/ui/loading_bar.png","bytes":323,"sha256":"703e02f1e7013d642a81225b98bf08f1bdfc69e003b0b7d4a6132635da747aef","width":640,"height":8,"metadataSHA256":"38bc67e02f506f01308a16c9be27bbe203ea6da76cd02961571801327ad5f665"},{"key":"textures/ui/BannersLight","sourceFile":"resource_pack/textures/ui/BannersLight.png","bytes":77,"sha256":"fe6c05e1746afd212f797c6d1dedd785196b96297b61743c966f01c4af4c1457","width":4,"height":4,"metadataSHA256":"622158df366964d9ddeac5ed9938a43522da68d02c060335b853c9730103ad65"},{"key":"textures/ui/Black","sourceFile":"resource_pack/textures/ui/Black.png","bytes":84,"sha256":"492d761d357b4fbdd29d0bc7a06a6423b5b0842d47c2d069ca90a9746ff5117e","width":2,"height":2,"metadataSHA256":"97fdfacd4bf3d22a981aceec2cbc74876d7f9166f34064b6ecbdf293de1b7989"},{"key":"textures/ui/dialog_background_hollow_3","sourceFile":"resource_pack/textures/ui/dialog_background_hollow_3.png","bytes":260,"sha256":"cf16fa7c6598d90d9b3f43b3ce7779de065c07fb29568d860588694ffe596e5b","width":18,"height":33,"metadataSHA256":"36700ca1326d14a269b2052c27d95115200897bee9c27b4d36e75fe893973415"},{"key":"textures/ui/control","sourceFile":"resource_pack/textures/ui/control.png","bytes":71,"sha256":"7997672f3c99b3bb967ad8fb2e3c19290f16a542e49d6a3572e6fd1bc355c4ab","width":2,"height":2,"metadataSHA256":"97fdfacd4bf3d22a981aceec2cbc74876d7f9166f34064b6ecbdf293de1b7989"},{"key":"textures/ui/screen_background","sourceFile":"resource_pack/textures/ui/screen_background.png","bytes":80,"sha256":"e612514247e30fdaf71b8ab025ca2162c2ac18816b648b73c4ac7a1f441d13ab","width":1,"height":1,"metadataSHA256":"0c675190fa587a78c4c1ba6f133668bb487f4ceb8f82c84781cabfafdac02e1c"},{"key":"textures/ui/close_button_default","sourceFile":"resource_pack/textures/ui/close_button_default.png","bytes":163,"sha256":"5160569f357e661d38495b3f84c89f84b30cc6fdd87c796b65f457cae529054c","width":15,"height":15,"metadataSHA256":null},{"key":"textures/ui/close_button_hover","sourceFile":"resource_pack/textures/ui/close_button_hover.png","bytes":164,"sha256":"16c89ba672607da0c452dacc79129f8eee995555bd061f51a1cb5bbab57bb877","width":15,"height":15,"metadataSHA256":null},{"key":"textures/ui/close_button_pressed","sourceFile":"resource_pack/textures/ui/close_button_pressed.png","bytes":1416,"sha256":"9abf4fcaf21fbbfa09ee1aeb8599288d5a781b57b08b3e4b2848b54cb217aa03","width":15,"height":15,"metadataSHA256":null},{"key":"textures/ui/button_borderless_light","sourceFile":"resource_pack/textures/ui/button_borderless_light.png","bytes":131,"sha256":"313b607889ba3d224cf599420087876ccb3f4572b304dc1ba6c25825f7d2c376","width":4,"height":4,"metadataSHA256":"622158df366964d9ddeac5ed9938a43522da68d02c060335b853c9730103ad65"},{"key":"textures/ui/button_borderless_lighthover","sourceFile":"resource_pack/textures/ui/button_borderless_lighthover.png","bytes":85,"sha256":"e4cdc816ebbfae2bea1e870fbde0c59effd680cdec388ba1e66424645573aea8","width":4,"height":4,"metadataSHA256":"622158df366964d9ddeac5ed9938a43522da68d02c060335b853c9730103ad65"},{"key":"textures/ui/button_borderless_lightpressed","sourceFile":"resource_pack/textures/ui/button_borderless_lightpressed.png","bytes":84,"sha256":"47f6ed1760ae8e407cdbb6b7207a5ee45b8a0db861f16f0696c5cf61c9961983","width":4,"height":4,"metadataSHA256":"622158df366964d9ddeac5ed9938a43522da68d02c060335b853c9730103ad65"},{"key":"textures/ui/disabledButtonNoBorder","sourceFile":"resource_pack/textures/ui/disabledButtonNoBorder.png","bytes":88,"sha256":"5a04f3b69f14cd1750b6c818310964e91f4962afc38cfe7bef41ad3c0fb4b27f","width":2,"height":2,"metadataSHA256":"97fdfacd4bf3d22a981aceec2cbc74876d7f9166f34064b6ecbdf293de1b7989"},{"key":"textures/ui/focus_border_white","sourceFile":"resource_pack/textures/ui/focus_border_white.png","bytes":105,"sha256":"bbf995d02bd710bed1ffef07d128e140e57b018d37ed34e050a995f1c500a5d8","width":5,"height":5,"metadataSHA256":"d41fce86c98c18b03d8cb349ea5b50e4648c0cbf4b739b2ad7b6d236a83b3407"},{"key":"textures/ui/ScrollRail","sourceFile":"resource_pack/textures/ui/ScrollRail.png","bytes":70,"sha256":"eab268e0814cb9db1e2c8e158cea2d54a9b5f07fe0b7b74f82d5a67fa32cc6be","width":1,"height":1,"metadataSHA256":"384aa89ff2d02cd552f6d7913fa5d35337570cb4475934b563846bcb2cd7c7f6"},{"key":"textures/ui/ScrollHandle","sourceFile":"resource_pack/textures/ui/ScrollHandle.png","bytes":89,"sha256":"f5e26f4b26c2edadd36e8a8bec2018b86558525f9920168d8d2c277bd210f46a","width":3,"height":5,"metadataSHA256":"08856911c52b8d9e90c4906df474bf3785813187971a0d2b57b0d3a7e82c4a77"}];

async function dataset(root){
 const file='demo/manifest-validation-data.ts',raw=await fs.readFile(path.join(root,file));
 const {code}=await transform(raw.toString('utf8'),{loader:'ts',format:'esm',target:'es2022'});
 const ast=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.equal(ast.parseDiagnostics.length,0);
 assert(!ast.statements.some(n=>ts.isImportDeclaration(n)||ts.isExportDeclaration(n)&&n.moduleSpecifier),'Dataset must have no runtime imports or re-exports');
 const local=new Set(ast.statements.filter(ts.isFunctionDeclaration).map(n=>n.name?.text));
 function pure(n){
  assert(!ts.isNewExpression(n)&&!ts.isAwaitExpression(n),'Pure dataset only');
  if(ts.isIdentifier(n))assert(!['window','document','globalThis','fetch','process','require','eval','Function','Date'].includes(n.text),'Dataset capability '+n.text);
  if(ts.isCallExpression(n))assert(ts.isIdentifier(n.expression)&&local.has(n.expression.text),'Only local pure data functions');
  ts.forEachChild(n,pure);
 }pure(ast);
 const mod=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const props=mod.createManifestValidationDemoProps();
 function plain(v,ancestors=new Set()){
  if(v===null||typeof v==='string'||typeof v==='boolean')return;
  if(typeof v==='number'){assert(Number.isFinite(v));return;}
  assert(v&&typeof v==='object'&&!ancestors.has(v),'No functions, undefined, React nodes, cycles or services');
  assert(Array.isArray(v)||Object.getPrototypeOf(v)===Object.prototype,'Plain data only');ancestors.add(v);
  if(Array.isArray(v))for(let i=0;i<v.length;i++){assert(Object.hasOwn(v,i),'Dense dataset');plain(v[i],ancestors);}
  else for(const x of Object.values(v))plain(x,ancestors);ancestors.delete(v);
 }plain(props);
 assert.equal(props.content.entries.length,props.content.capacity);assert(props.content.entries.length>=1);
 return{props:JSON.parse(JSON.stringify(props)),source:{file,bytes:raw.length,sha256:hash(raw),exportName:'createManifestValidationDemoProps'}};
}
async function publicNames(root){
 const raw=await fs.readFile(path.join(root,'src/index.ts')),ast=ts.createSourceFile('index.ts',raw.toString(),ts.ScriptTarget.Latest,true),values=[];
 for(const n of ast.statements)if(ts.isExportDeclaration(n)&&!n.isTypeOnly&&n.exportClause&&ts.isNamedExports(n.exportClause))for(const e of n.exportClause.elements)if(!e.isTypeOnly)values.push(e.name.text);
 assert.equal(new Set(values).size,values.length);for(const n of names)assert(values.includes(n),'Missing public export '+n);
 return{values,components:values.filter(n=>/^[A-Z]/.test(n)),sha256:hash(raw)};
}
function typedConsumer(data){return `import{createRef}from'react';import type{ElementRef}from'react';
import{ManifestValidationButton,ManifestPackSummary,ManifestValidationIssue,ManifestValidationIssues,ManifestValidationContent,ManifestValidationScreen}from'mcbeui';
import type{ManifestValidationScreenProps,ManifestValidationButtonProps,ManifestValidationActionDetail}from'mcbeui';
const p:ManifestValidationScreenProps=${JSON.stringify(data.props)};
const c=p.content,entry=c.entries[0];
const common={identity:c.identity,state:c.state,label:c.copyLabel,scale:p.scale,loadingFrame:c.loadingFrame};
const button:ManifestValidationButtonProps={...common,variant:'copy',issue:{id:entry.id,index:entry.index,collection:'pack_errors',payload:{opaque:true}}};
const summary={width:320,scale:p.scale,identity:c.identity,state:c.state,data:c.summary,lowMemoryDevice:c.lowMemoryDevice,loadingFrame:c.loadingFrame};
const issue={width:320,scale:p.scale,identity:c.identity,state:c.state,entry,hasErrorsOrWarnings:c.hasErrorsOrWarnings,issueLabel:c.issueLabel,copyLabel:c.copyLabel,lowMemoryDevice:c.lowMemoryDevice,loadingFrame:c.loadingFrame};
const{entry:_singleEntry,...issueList}=issue;const issues={...issueList,entries:c.entries,capacity:c.capacity};
const detail=(d:ManifestValidationActionDetail)=>{const control:HTMLButtonElement=d.control;const same:HTMLButtonElement=d.event.currentTarget;const opaque:unknown=d.payload;const target:'button.copy_to_clipboard'|'button.delete_manifest'|'button.refresh_manifest'=d.target;void[control,same,opaque,target];return false as const;};
type Equal<A,B>=(<T>()=>T extends A?1:2)extends(<T>()=>T extends B?1:2)?true:false;type Assert<T extends true>=T;
type R0=Assert<Equal<ElementRef<typeof ManifestValidationButton>,HTMLButtonElement>>;
type R1=Assert<Equal<ElementRef<typeof ManifestPackSummary>,HTMLDivElement>>;
type R2=Assert<Equal<ElementRef<typeof ManifestValidationIssue>,HTMLDivElement>>;
type R3=Assert<Equal<ElementRef<typeof ManifestValidationIssues>,HTMLDivElement>>;
type R4=Assert<Equal<ElementRef<typeof ManifestValidationContent>,HTMLDivElement>>;
type R5=Assert<Equal<ElementRef<typeof ManifestValidationScreen>,HTMLDivElement>>;
export const valid=<><ManifestValidationButton {...button} ref={createRef<HTMLButtonElement>()} onAction={detail}/><ManifestValidationButton {...common} variant="delete-icon"/><ManifestValidationButton {...common} variant="refresh-icon"/><ManifestValidationButton {...common} variant="delete-text" width={80}/><ManifestValidationButton {...common} variant="refresh-text" width={80}/><ManifestPackSummary {...summary} ref={createRef<HTMLDivElement>()}/><ManifestValidationIssue {...issue} ref={createRef<HTMLDivElement>()}/><ManifestValidationIssues {...issues} ref={createRef<HTMLDivElement>()}/><ManifestValidationContent {...c} size={[350,220]} scale={p.scale} ref={createRef<HTMLDivElement>()}/><ManifestValidationScreen {...p} ref={createRef<HTMLDivElement>()} onCloseRequest={d=>{const e:HTMLElement=d.control;void e;return false;}}/></>;
// @ts-expect-error five actual variants, no generic kind
const n1=<ManifestValidationButton {...common} variant="reload"/>;
// @ts-expect-error copy requires collection identity
const n2=<ManifestValidationButton {...common} variant="copy"/>;
// @ts-expect-error copy has a fixed source size
const n3=<ManifestValidationButton {...button} width={25}/>;
// @ts-expect-error icon button source width is fixed
const n4=<ManifestValidationButton {...common} variant="delete-icon" width={30}/>;
// @ts-expect-error text button requires host width
const n5=<ManifestValidationButton {...common} variant="refresh-text"/>;
// @ts-expect-error collection context belongs to copy only
const n6=<ManifestValidationButton {...common} variant="delete-text" width={80} issue={button.issue}/>;
// @ts-expect-error flags are explicit booleans
const n7=<ManifestValidationButton {...button} state={{...c.state,isWorking:'yes'}}/>;
// @ts-expect-error no inferred done state
const n8=<ManifestValidationButton {...button} state={{isWorking:false,isDeleting:false}}/>;
// @ts-expect-error stable opaque identity requires string run key
const n9=<ManifestValidationButton {...button} identity={{runKey:5,packId:'x'}}/>;
// @ts-expect-error exact native collection label
const n10=<ManifestValidationButton {...common} variant="copy" issue={{id:'a',index:0,collection:'errors'}}/>;
// @ts-expect-error numeric collection index
const n11=<ManifestValidationButton {...common} variant="copy" issue={{id:'a',index:'0',collection:'pack_errors'}}/>;
// @ts-expect-error independent low-memory provider flag
const n12=<ManifestPackSummary {...summary} lowMemoryDevice="false"/>;
// @ts-expect-error three metadata rows
const n13=<ManifestPackSummary {...summary} data={{...c.summary,layout:{...c.summary.layout,metadataRowHeights:[18,18]}}}/>;
// @ts-expect-error whole image requires two source dimensions
const n14=<ManifestPackSummary {...summary} data={{...c.summary,icon:{src:'/whole.png',sourceSize:[44]}}}/>;
// @ts-expect-error factory length is a required explicit snapshot
const n15=<ManifestValidationIssues {...issueList} entries={c.entries}/>;
// @ts-expect-error factory index is numeric
const n16=<ManifestValidationIssue {...issue} entry={{...entry,index:'0'}}/>;
// @ts-expect-error shared source visibility flag is a boolean
const n17=<ManifestValidationIssue {...issue} hasErrorsOrWarnings="true"/>;
// @ts-expect-error action receives a structured request
const n18=<ManifestValidationContent {...c} size={[350,220]} scale={2} onAction={(n:number)=>n}/>;
// @ts-expect-error finite mouse/touch source profile
const n19=<ManifestValidationContent {...c} size={[350,220]} scale={2} inputMode="gamepad"/>;
// @ts-expect-error pair geometry
const n20=<ManifestValidationContent {...c} size={[350]} scale={2}/>;
// @ts-expect-error screen requires a viewport pair
const n21=<ManifestValidationScreen {...p} viewportSize={420}/>;
// @ts-expect-error controlled open is boolean
const n22=<ManifestValidationScreen {...p} open="true"/>;
// @ts-expect-error actual native button ref
const n23=<ManifestValidationButton {...button} ref={createRef<HTMLDivElement>()}/>;
// @ts-expect-error screen root is an actual div
const n24=<ManifestValidationScreen {...p} ref={createRef<HTMLButtonElement>()}/>;
`;
}

async function installedWorker(){
 const assert=(await import('node:assert/strict')).default,fs=await import('node:fs/promises'),path=(await import('node:path')).default,{createRequire}=await import('node:module'),{pathToFileURL,fileURLToPath}=await import('node:url'),{createHash}=await import('node:crypto');
 const cfg=JSON.parse(await fs.readFile(process.argv[2],'utf8')),req=createRequire(path.join(cfg.consumer,'package.json')),rootReq=createRequire(path.join(cfg.root,'package.json')),hash=b=>createHash('sha256').update(b).digest('hex');
 const React=req('react'),render=req('react-dom/server').renderToStaticMarkup;
 assert.equal(Number(React.version.split('.')[0]),cfg.major);assert.equal(req('react-dom/package.json').version,React.version);assert.equal(Number(req('@types/react/package.json').version.split('.')[0]),cfg.major);
 const installed=path.join(cfg.consumer,'node_modules/mcbeui'),manifest=JSON.parse(await fs.readFile(path.join(installed,'package.json'),'utf8')),index=await fs.readFile(path.join(installed,'dist/index.js')),decl=await fs.readFile(path.join(installed,'dist/index.d.ts'));
 assert.deepEqual(index,await fs.readFile(path.join(cfg.root,'dist/index.js')));assert.deepEqual(decl,await fs.readFile(path.join(cfg.root,'dist/index.d.ts')));
 const data=JSON.parse(await fs.readFile(path.join(cfg.directory,'datasets.json'),'utf8')),p=data.props,c=p.content,entry=c.entries[0],copy=v=>JSON.parse(JSON.stringify(v)),checks=[],warnings=[],attempts=[],saved=new Map();let callbacks=0,refs=0;
 const ref=()=>{refs++;throw Error('SSR ref invoked');},callback=()=>{callbacks++;throw Error('SSR host request invoked');};
 const tags=(html,name)=>[...html.matchAll(new RegExp('<'+name+'\\b[^>]*>','gi'))].map(m=>m[0]),attr=(tag,key)=>new RegExp('(?:^|\\s)'+key+'="([^"]*)"(?=\\s|/?>)').exec(tag)?.[1];
 const check=(name,run)=>{try{run();checks.push(name);}catch(e){e.message='['+name+'] '+e.message;throw e;}};
 const previousError=console.error,previousWarn=console.warn;console.error=(...a)=>warnings.push(a.map(String).join(' '));console.warn=console.error;
 for(const name of['fetch','Image','FontFace','createImageBitmap','OffscreenCanvas','XMLHttpRequest','ResizeObserver','MutationObserver','requestAnimationFrame','setTimeout','setInterval']){saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,value(){attempts.push(name);throw Error('SSR service '+name);}});}
 let ui;
 try{
  ui=await import(pathToFileURL(path.join(installed,'dist/index.js')).href);
  check('exact-public-namespace-six-forwardrefs-no-private-leaks',()=>{assert.deepEqual(Object.keys(ui).sort(),[...cfg.publicNames.values].sort());for(const n of cfg.names)assert.equal(ui[n].$$typeof,Symbol.for('react.forward_ref'));for(const n of Object.keys(ui))assert(!/^(?:manifestValidationAssets|validateManifest|planManifest|ServerCustomContents$|validateServerCustomContents$)/.test(n),'Private runtime '+n);});
  const common={identity:c.identity,state:c.state,label:c.copyLabel,scale:p.scale,loadingFrame:c.loadingFrame,ref,onAction:callback};
  const button=(variant,patch={})=>render(React.createElement(ui.ManifestValidationButton,{...common,variant,...(variant==='copy'?{issue:{id:entry.id,index:entry.index,collection:'pack_errors',payload:entry.payload}}:{}),...(/-text$/.test(variant)?{width:80}:{}),...patch}));
  const summary=patch=>render(React.createElement(ui.ManifestPackSummary,{width:320,scale:p.scale,identity:c.identity,state:c.state,data:c.summary,lowMemoryDevice:c.lowMemoryDevice,loadingFrame:c.loadingFrame,ref,onAction:callback,...patch}));
  const issueProps={width:320,scale:p.scale,identity:c.identity,state:c.state,entry,hasErrorsOrWarnings:c.hasErrorsOrWarnings,issueLabel:c.issueLabel,copyLabel:c.copyLabel,lowMemoryDevice:c.lowMemoryDevice,loadingFrame:c.loadingFrame,ref,onAction:callback};
  const{entry:_singleEntry,...issueListProps}=issueProps;
  for(const variant of['copy','delete-icon','refresh-icon','delete-text','refresh-text'])check('source-button-'+variant,()=>{const html=button(variant),bs=tags(html,'button');assert.equal(bs.length,1);assert.equal(attr(bs[0],'type'),'button');assert.equal(attr(bs[0],'disabled'),undefined);assert(html.includes(c.copyLabel));});
  for(const state of[{isWorking:true,isDeleting:false,isDoneValidating:true},{isWorking:false,isDeleting:true,isDoneValidating:true},{isWorking:false,isDeleting:false,isDoneValidating:false},{isWorking:true,isDeleting:true,isDoneValidating:false}])check('independent-state-'+JSON.stringify(state),()=>{for(const v of['copy','delete-icon','refresh-icon','delete-text','refresh-text']){const html=button(v,{state}),b=tags(html,'button')[0];assert.equal(attr(b,'disabled')!==undefined,state.isWorking);assert.equal(html.includes('class="mc-manifest-validation-button__loading"'),v==='delete-icon'?state.isDeleting:v==='refresh-icon'?!state.isDoneValidating:false,'Loader follows its independent source flag');}});
  check('readOnly-and-disabled-guard-all-buttons',()=>{for(const flag of['readOnly','disabled'])for(const v of['copy','delete-icon','refresh-icon','delete-text','refresh-text'])assert.notEqual(attr(tags(button(v,{[flag]:true}),'button')[0],'disabled'),undefined);});
  check('summary-visible-actions-and-independent-size',()=>{const html=summary({});assert.equal(tags(html,'button').length,2);assert(html.includes(c.summary.text.title));for(const key of['size','refresh','delete']){const data=copy(c.summary);data.visibility[key]=false;const h=summary({data});if(key==='size'){const t=tags(h,'span').find(t=>attr(t,'class')==='mc-manifest-pack-summary__size');assert.notEqual(attr(t,'hidden'),undefined);}else{const t=tags(h,'div').find(t=>attr(t,'data-source-once-binding')==='#'+key+'_visible');assert.notEqual(attr(t,'hidden'),undefined);}assert.equal(tags(h,'button').length,2,'Hidden source controls retain DOM');}});
  check('issue-shared-visibility-not-inferred-from-content',()=>{const shown=render(React.createElement(ui.ManifestValidationIssue,issueProps)),hidden=render(React.createElement(ui.ManifestValidationIssue,{...issueProps,hasErrorsOrWarnings:false}));assert.equal(tags(shown,'button').length,1);assert.equal(tags(hidden,'button').length,1);const box=tags(hidden,'div').find(t=>attr(t,'class')==='mc-manifest-validation-issue__copy');assert.notEqual(attr(box,'hidden'),undefined);assert(shown.includes(entry.content.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')));});
  check('issues-complete-vertical-factory-and-empty',()=>{const html=render(React.createElement(ui.ManifestValidationIssues,{...issueListProps,entries:c.entries,capacity:c.capacity}));assert.equal(tags(html,'button').length,c.capacity);const empty=render(React.createElement(ui.ManifestValidationIssues,{...issueListProps,entries:[],capacity:0}));assert.equal(tags(empty,'button').length,0);});
  for(const inputMode of['mouse','touch'])check('content-one-scroll-no-extra-frame-'+inputMode,()=>{const html=render(React.createElement(ui.ManifestValidationContent,{...c,size:[350,220],scale:p.scale,inputMode,ref,viewportRef:ref,onAction:callback}));assert.equal((html.match(/class="[^"]*\bmc-scroll-area\b/g)??[]).length,1);assert.equal((html.match(/role="dialog"/g)??[]).length,0);assert(!/<canvas|<iframe|<script/.test(html));});
  check('screen-open-hidden-and-no-SSR-effects',()=>{for(const open of[false,true]){const html=render(React.createElement(ui.ManifestValidationScreen,{...p,open,ref,panelRef:ref,contentRef:ref,closeButtonRef:ref,onCloseRequest:callback,onViewRequest:callback,content:{...c,onAction:callback}}));assert(!/<iframe|<canvas|<script/.test(html));const root=tags(html,'div')[0];assert.equal(attr(root,'role'),'dialog');assert.equal(attr(root,'hidden')!==undefined,!open);assert.equal((html.match(/role="dialog"/g)??[]).length,1);}});
  const invalid=[['snapshot-length',()=>render(React.createElement(ui.ManifestValidationIssues,{...issueListProps,entries:c.entries,capacity:c.capacity+1}))],['snapshot-index',()=>render(React.createElement(ui.ManifestValidationIssues,{...issueListProps,entries:c.entries.map((v,i)=>i?{...v,index:0}:v),capacity:c.capacity}))],['noninteger-frame',()=>button('refresh-icon',{loadingFrame:.5})],['missing-state',()=>button('delete-icon',{state:{isWorking:false,isDeleting:false}})],['nonfinite-layout',()=>summary({data:{...c.summary,layout:{...c.summary.layout,summaryHeight:NaN}}})]];
  for(const[name,run]of invalid)check('runtime-reject-'+name,()=>assert.throws(run,e=>e instanceof TypeError||e instanceof RangeError));
  check('SSR-zero-IO-requests-refs-and-warnings',()=>{assert.equal(callbacks,0);assert.equal(refs,0);assert.deepEqual(attempts,[]);assert.deepEqual(warnings,[]);});
 }finally{console.error=previousError;console.warn=previousWarn;for(const[name,d]of saved)if(d)Object.defineProperty(globalThis,name,d);else delete globalThis[name];}
 // Resolve private compiled aliases statically; never import a private bank.
 const ts=rootReq('typescript'),ast=ts.createSourceFile('index.js',index.toString(),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),symbols=new Map(),objects=[];
 const fields=n=>new Map(n.properties.filter(ts.isPropertyAssignment).map(p=>[ts.isIdentifier(p.name)||ts.isStringLiteralLike(p.name)?p.name.text:null,p.initializer]));
 function visit(n){if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&n.initializer)symbols.set(n.name.text,n.initializer);if(ts.isObjectLiteralExpression(n))objects.push(n);ts.forEachChild(n,visit);}visit(ast);
 const active=new Set();function literal(n,depth=0){assert(n&&depth<100,'Bounded asset alias resolution');if(ts.isStringLiteralLike(n))return n.text;if(ts.isNumericLiteral(n))return Number(n.text);if(n.kind===ts.SyntaxKind.TrueKeyword)return true;if(n.kind===ts.SyntaxKind.FalseKeyword)return false;if(n.kind===ts.SyntaxKind.NullKeyword)return null;if(ts.isParenthesizedExpression(n)||ts.isAsExpression(n))return literal(n.expression,depth+1);if(ts.isIdentifier(n)){assert(symbols.has(n.text)&&!active.has(n.text),'Unknown/cyclic private alias '+n.text);active.add(n.text);const v=literal(symbols.get(n.text),depth+1);active.delete(n.text);return v;}if(ts.isArrayLiteralExpression(n))return n.elements.map(x=>literal(x,depth+1));if(ts.isObjectLiteralExpression(n))return Object.fromEntries([...fields(n)].map(([k,v])=>[k,literal(v,depth+1)]));if(ts.isElementAccessExpression(n))return literal(n.expression,depth+1)[literal(n.argumentExpression,depth+1)];if(ts.isPropertyAccessExpression(n)){if(n.name.text==='href'&&ts.isNewExpression(n.expression)&&n.expression.expression.getText(ast)==='URL')return literal(n.expression.arguments[0],depth+1);return literal(n.expression,depth+1)[n.name.text];}if(ts.isCallExpression(n)&&n.expression.getText(ast)==='Object.freeze')return literal(n.arguments[0],depth+1);throw Error('Unsupported asset expression '+n.getText(ast).slice(0,160));}
 const bankNode=objects.find(n=>cfg.assets.every(a=>fields(n).has(a.key)));assert(bankNode,'Compiled twenty-key manifest bank, aliases accepted');const bank=literal(bankNode);
 const ledgerBytes=await fs.readFile(path.join(installed,'docs/manifest-validation-assets.json'));assert.deepEqual(ledgerBytes,await fs.readFile(path.join(cfg.root,'docs/manifest-validation-assets.json')));const ledger=JSON.parse(ledgerBytes);assert.equal(ledger.assetCount,20);assert.equal(ledger.entries.length,20);
 const materials=[];for(const expected of cfg.assets){const record=ledger.entries.find(e=>e.key===expected.key);assert(record);for(const k of['sourceFile','sha256','bytes','width','height','metadataSHA256'])assert.equal(record[k],expected[k],expected.key+' '+k);const a=bank[expected.key];assert.equal(a.width,expected.width);assert.equal(a.height,expected.height);const raw=a.url;assert.equal(typeof raw,'string');let body;if(raw.startsWith('data:image/png')){const i=raw.indexOf(',');body=raw.slice(0,i).endsWith(';base64')?Buffer.from(raw.slice(i+1),'base64'):Buffer.from(decodeURIComponent(raw.slice(i+1)));}else{const u=new URL(raw,pathToFileURL(path.join(installed,'dist/index.js')));assert.equal(u.protocol,'file:');const f=fileURLToPath(u),rel=path.relative(installed,f);assert(!rel.startsWith('..')&&!path.isAbsolute(rel),'Relocatable URL');body=await fs.readFile(f);}assert.equal(hash(body),expected.sha256);assert.equal(body.length,expected.bytes);assert.deepEqual([body.readUInt32BE(16),body.readUInt32BE(20)],[expected.width,expected.height]);if(expected.metadataSHA256){assert.equal(hash(Buffer.from(record.metadataRawUTF8)),expected.metadataSHA256);assert.deepEqual(a.metadata,JSON.parse(record.metadataRawUTF8));}else{assert.equal(record.metadataRawUTF8,null);assert.equal(record.metadata,null);assert.equal(a.metadata,undefined);}
  // A shared-bank alias still has a concrete source/distribution origin. Resolve
  // that origin from the installed public ledger and verify its actual files.
  let origin=record.proposedReuse,physicalFile=origin?.file;
  if(origin?.kind==='shared-bank-alias'){
   assert.equal(origin.key,expected.key);const shared=JSON.parse(await fs.readFile(path.join(installed,'docs/resource-pack-assets.json'),'utf8'));
   assert.deepEqual(await fs.readFile(path.join(installed,'docs/resource-pack-assets.json')),await fs.readFile(path.join(cfg.root,'docs/resource-pack-assets.json')));
   const sharedRecord=shared.entries.find(e=>e.key===origin.key);assert(sharedRecord);assert.equal(sharedRecord.sha256,expected.sha256);origin=sharedRecord.materialOrigin;physicalFile=origin?.file;
  }
  let distribution='whole-inline-original-with-raw-metadata-ledger';
  if(physicalFile?.startsWith('src/assets/')&&physicalFile.endsWith('.png')){
   const b=await fs.readFile(path.join(installed,'dist',physicalFile.slice(4)));assert.deepEqual(b,body);assert.deepEqual(b,await fs.readFile(path.join(cfg.root,physicalFile)));distribution='whole-physical-original-and-compiled-body';
   const meta=origin.metadataFile??physicalFile.replace(/\.png$/,'.json');let mb;try{mb=await fs.readFile(path.join(cfg.root,meta));}catch(e){if(e.code!=='ENOENT')throw e;}
   if(mb){assert(expected.metadataSHA256,'Metadata cannot be invented');assert.equal(hash(mb),expected.metadataSHA256);assert.deepEqual(mb,await fs.readFile(path.join(installed,'dist',meta.slice(4))));}
   else if(!expected.metadataSHA256)await assert.rejects(fs.access(path.join(installed,'dist',physicalFile.slice(4).replace(/\.png$/,'.json'))),e=>e.code==='ENOENT');
  }else assert.equal(origin?.kind,'existing-whole-original-embedded-data-url','Known whole original distribution origin '+expected.key);
  materials.push({key:expected.key,sha256:hash(body),bytes:body.length,width:expected.width,height:expected.height,metadataSHA256:expected.metadataSHA256,distribution});}
 const styles={},closure=new Set();async function css(file,reached){file=path.posix.normalize(file);assert(!file.startsWith('../')&&!path.isAbsolute(file));if(reached?.has(file)||!reached&&styles[file])return;reached?.add(file);const b=await fs.readFile(path.join(installed,'dist',file));assert.deepEqual(b,await fs.readFile(path.join(cfg.root,'src',file)));styles[file]=hash(b);for(const m of b.toString().matchAll(/@import\s+['"]([^'"]+\.css)['"]/g))await css(path.posix.join(path.posix.dirname(file),m[1]),reached);}
 for(const n of['manifest-validation-parts.css','manifest-validation-screen.css']){assert.equal(manifest.exports['./'+n],'./dist/'+n);await css(n);}await css('styles.css',closure);for(const n of['manifest-validation-parts.css','manifest-validation-screen.css'])assert(closure.has(n),'Actual aggregate CSS closure '+n);
 const catalogBytes=await fs.readFile(path.join(installed,'docs/component-catalog.json'));assert.deepEqual(catalogBytes,await fs.readFile(path.join(cfg.root,'docs/component-catalog.json')));const catalog=JSON.parse(catalogBytes);assert.equal(catalog.publicExports.runtimeValues,Object.keys(ui).length);assert.equal(catalog.publicExports.components,cfg.publicNames.components.length);const records=[];function scan(v){if(v&&typeof v==='object'){if(typeof v.name==='string')records.push(v);for(const a of Object.values(v))scan(a);}}scan(catalog);for(const n of cfg.names)assert(records.some(r=>r.name===n&&r.status==='implemented'));
 const files=[];async function walk(dir,rel=''){for(const x of await fs.readdir(dir,{withFileTypes:true})){const next=path.join(rel,x.name);if(x.isDirectory())await walk(path.join(dir,x.name),next);else files.push(next.replaceAll('\\','/'));}}await walk(installed);assert(!files.some(f=>/(?:^|\/)(?:\.cache|local-fonts|originalpages)(?:\/|$)|(?:glyph_[0-9a-f]{2}|default8)\.png$|\.(?:wpix|brarchive)$/i.test(f)),'No private source fonts/capture');assert(!files.some(f=>f.endsWith('/manifest_validation_screen.json')),'Do not ship original UI source');
 const publicFonts=['Monocraft-Regular.woff2','MCBEPixel-Regular.woff2','MCBECJK-12px-zh-hans.woff2','FusionPixel-12px-zh-hans.woff2'];assert.deepEqual(files.filter(f=>/\.(?:woff2?|ttf|otf)$/i.test(f)).sort(),publicFonts.map(f=>'dist/fonts/'+f).sort());for(const f of publicFonts)assert.deepEqual(await fs.readFile(path.join(installed,'dist/fonts',f)),await fs.readFile(path.join(cfg.root,'src/fonts',f)));
 const notices=await fs.readFile(path.join(installed,'THIRD_PARTY_NOTICES.md'));assert.deepEqual(notices,await fs.readFile(path.join(cfg.root,'THIRD_PARTY_NOTICES.md')));assert(notices.toString().includes('docs/manifest-validation-assets.json'));const license=await fs.readFile(path.join(installed,'dist/assets/resource-pack/LICENSE.md'));assert.equal(hash(license),'ca18c0dede68ce24ea1cd6f9df0813579b6f9f979787983a50baec99345f975d');
 const result={status:'PASS_INSTALLED_MANIFEST_VALIDATION_ESM_SSR_MATERIAL_CSS',react:React.version,peerTypes:req('@types/react/package.json').version,runtimeValues:Object.keys(ui).length,components:cfg.publicNames.components.length,checks,refCalls:refs,callbackCalls:callbacks,serviceAttempts:attempts,warnings,materials,metadataPresent:materials.filter(a=>a.metadataSHA256).length,metadataAbsent:materials.filter(a=>!a.metadataSHA256).length,styles,datasetSource:data.source,indexSHA256:hash(index),declarationSHA256:hash(decl),assetLedgerSHA256:hash(ledgerBytes),scope:'Real installed namespace/types/SSR/whole original materials and CSS. Mounted behavior/ref cleanup/browser/native pixels require separate qualification.'};await fs.writeFile(path.join(cfg.directory,'SSR.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
}

/** Root builds/installs a fresh actual tgz first; no install/build is performed here. */
export async function verifyManifestValidationPackage({consumer,root,major,evidenceName='manifest-validation-contracts'}){
 assert(major===18||major===19);assert(/^[a-z0-9-]{1,80}$/.test(evidenceName));consumer=path.resolve(consumer);root=path.resolve(root);const directory=path.join(consumer,evidenceName);await fs.mkdir(directory,{recursive:false});
 const data=await dataset(root),publics=await publicNames(root),typed=typedConsumer(data),write=(name,text)=>fs.writeFile(path.join(directory,name),text,{flag:'wx'});
 await write('datasets.json',JSON.stringify(data,null,2)+'\n');await write('consumer.tsx',typed);await write('worker.mjs','('+installedWorker.toString()+')().catch(e=>{console.error(e);process.exitCode=1;});');await write('tsconfig.json',JSON.stringify({compilerOptions:{target:'ES2022',lib:['ES2022','DOM','DOM.Iterable'],module:'ESNext',moduleResolution:'Bundler',jsx:'react-jsx',strict:true,noEmit:true,skipLibCheck:true},include:['consumer.tsx']},null,2));await write('config.json',JSON.stringify({root,consumer,directory,major,names,publicNames:publics,assets:expectedAssets},null,2));
 async function run(args,file){try{const raw=execFileSync(process.execPath,args,{cwd:consumer,encoding:'utf8',maxBuffer:32*1024*1024,windowsHide:true});await write(file,raw);}catch(e){await write(file,String(e.stdout??'')+'\n'+String(e.stderr??e.stack));throw e;}}
 await run([path.join(directory,'worker.mjs'),path.join(directory,'config.json')],'SSR.txt');await run([path.join(root,'node_modules/typescript/bin/tsc'),'--project',path.join(directory,'tsconfig.json')],'TYPECHECK.txt');
 const result={...JSON.parse(await fs.readFile(path.join(directory,'SSR.json'),'utf8')),strictTypes:true,negativeTypeContracts:(typed.match(/@ts-expect-error/g)??[]).length,typedFixtureSHA256:hash(Buffer.from(typed)),status:'PASS_INSTALLED_MANIFEST_VALIDATION_TYPES_SSR_20ORIGINALS_CSS'};await write('RESULT.json',JSON.stringify(result,null,2)+'\n');return result;
}

const browserApp=`import React,{createRef,useState}from'react';import{createRoot}from'react-dom/client';import*as ui from'mcbeui';import'mcbeui/styles.css';import data from'./datasets.json';
const names=['button','summary','issue','issues','content','screen'],refs=Object.fromEntries([...names,'viewport','panel','screenContent','close'].map(k=>[k,createRef()])),events=[],refCallbacks=[];let mounted,sequence=0;
const callbacks=Object.fromEntries(names.map(key=>[key,node=>{if(node===null){refCallbacks.push({phase:'null',key,connected:refs[key].current?.isConnected??false});refs[key].current=null;return;}const token=++sequence;refs[key].current=node;refCallbacks.push({phase:'attach',key,token,tag:node.tagName,id:node.id,connected:node.isConnected});return()=>{refCallbacks.push({phase:'cleanup',key,token,tag:node.tagName,id:node.id,connected:node.isConnected});if(refs[key].current===node)refs[key].current=null;};}]));
const copy=v=>JSON.parse(JSON.stringify(v));
function App(){const[view,setView]=useState('all'),[open,setOpen]=useState(data.props.open),[accept,setAccept]=useState(true),[disabled,setDisabled]=useState(false),[readOnly,setReadOnly]=useState(false),[prevented,setPrevented]=useState(false),[state,setState]=useState(data.props.content.state),[visibility,setVisibility]=useState(data.props.content.summary.visibility),[entries,setEntries]=useState(data.props.content.entries),[capacity,setCapacity]=useState(data.props.content.capacity),[has,setHas]=useState(data.props.content.hasErrorsOrWarnings),[inputMode,setInputMode]=useState('mouse'),[viewport,setViewport]=useState(data.props.viewportSize),[loadingFrame,setLoadingFrame]=useState(0),[variant,setVariant]=useState('copy'),[lowMemory,setLowMemory]=useState(false),[closeVisible,setCloseVisible]=useState(true),[viewKeys,setViewKeys]=useState(false);
const c={...data.props.content,state,summary:{...data.props.content.summary,visibility},entries,capacity,hasErrorsOrWarnings:has,inputMode,loadingFrame,lowMemoryDevice:lowMemory,disabled,readOnly},scale=data.props.scale,identity=c.identity;
const record=(kind,d)=>events.push({kind,action:d.action,target:d.target,sourceControl:d.sourceControl,runKey:d.runKey,packId:d.packId,payload:d.payload,issue:d.issue,origin:d.origin,controlTag:d.control?.tagName,controlId:d.control?.id,connected:d.control?.isConnected,currentTargetMatches:d.event?.currentTarget===d.control,defaultPrevented:d.event?.defaultPrevented,eventType:d.event?.type});
const action=d=>{record('action',d);return accept?undefined:false;},close=d=>{record('close',d);if(accept)setOpen(false);return accept?undefined:false;},viewRequest=d=>{record('view',d);return accept?undefined:false;},guard=e=>{if(prevented)e.preventDefault();};
const common={identity,state,label:c.copyLabel,scale,loadingFrame,disabled,readOnly,onAction:action,onClick:guard,onKeyDown:guard},entry=entries[0]??data.props.content.entries[0],issue={width:320,scale,identity,state,entry,hasErrorsOrWarnings:has,issueLabel:c.issueLabel,copyLabel:c.copyLabel,lowMemoryDevice:lowMemory,loadingFrame,disabled,readOnly,onAction:action,onClick:guard,onKeyDown:guard};
const button={...common,variant,...(variant==='copy'?{issue:{id:entry.id,index:entry.index,collection:'pack_errors',payload:entry.payload}}:{}),...(/-text$/.test(variant)?{width:80}:{})};
const{entry:_singleEntry,...issueList}=issue;
const shown=n=>view==='all'||view===n;
window.manifestValidationInstalled={react:React.version,runtimeValues:Object.keys(ui).length,refs,refCallbacks,events,get ready(){return names.every(k=>refs[k].current?.isConnected);},get state(){return state;},get open(){return open;},view,accept,disabled,readOnly,prevented,visibility,entries,capacity,hasErrorsOrWarnings:has,inputMode,viewport,loadingFrame,variant,lowMemory,closeVisible,viewKeys,clear(){events.length=0;},clearRefCallbacks(){refCallbacks.length=0;},configure(p){const setters={view:setView,open:setOpen,accept:setAccept,disabled:setDisabled,readOnly:setReadOnly,prevented:setPrevented,state:setState,visibility:setVisibility,entries:setEntries,capacity:setCapacity,hasErrorsOrWarnings:setHas,inputMode:setInputMode,viewport:setViewport,loadingFrame:setLoadingFrame,variant:setVariant,lowMemory:setLowMemory,closeVisible:setCloseVisible,viewKeys:setViewKeys};for(const[k,v]of Object.entries(p)){if(!setters[k])throw Error('Unknown fixture input '+k);setters[k](copy(v));}},unmount,mount};
return <><div hidden={!shown('button')} data-fixture-part="button"><ui.ManifestValidationButton {...button} ref={callbacks.button}/></div><div hidden={!shown('summary')} data-fixture-part="summary"><ui.ManifestPackSummary width={320} scale={scale} identity={identity} state={state} data={c.summary} lowMemoryDevice={lowMemory} loadingFrame={loadingFrame} disabled={disabled} readOnly={readOnly} onAction={action} onClick={guard} ref={callbacks.summary}/></div><div hidden={!shown('issue')} data-fixture-part="issue"><ui.ManifestValidationIssue {...issue} ref={callbacks.issue}/></div><div hidden={!shown('issues')} data-fixture-part="issues"><ui.ManifestValidationIssues {...issueList} entries={entries} capacity={capacity} ref={callbacks.issues}/></div><div hidden={!shown('content')} data-fixture-part="content"><ui.ManifestValidationContent {...c} size={[350,220]} scale={scale} viewportRef={refs.viewport} onAction={action} onClick={guard} onKeyDown={guard} ref={callbacks.content}/></div><div hidden={!shown('screen')} data-fixture-part="screen"><ui.ManifestValidationScreen {...data.props} open={open&&shown('screen')} viewportSize={viewport} disabled={disabled} readOnly={readOnly} closeVisible={closeVisible} viewNavigationKeys={viewKeys} panelRef={refs.panel} contentRef={refs.screenContent} closeButtonRef={refs.close} content={{...c,onAction:action}} onCloseRequest={close} onViewRequest={viewRequest} onClick={guard} onKeyDown={guard} ref={callbacks.screen}/></div></>;}
function mount(){if(!mounted){mounted=createRoot(document.getElementById('root'));mounted.render(<App/>);}}function unmount(){mounted?.unmount();mounted=null;}mount();`;

/** Preparation only: public imports, default Vite, no config/alias/server/install. */
export async function prepareManifestValidationInstalledFixture({directory,root=process.cwd()}){
 root=path.resolve(root);directory=path.resolve(directory);const data=await dataset(root);await fs.mkdir(directory,{recursive:false});
 const files={'index.html':'<!doctype html><html lang="en"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Installed Manifest Validation</title><style>body{margin:0;background:#203040;color:white;font-family:var(--mc-font,monospace)}[data-fixture-part]{margin:12px 0}</style><div id="root"></div><script type="module" src="/main.jsx"></script></html>','main.jsx':browserApp,'datasets.json':JSON.stringify(data,null,2)+'\n'},pins={};
 for(const[name,text]of Object.entries(files)){await fs.writeFile(path.join(directory,name),text,{flag:'wx'});pins[name]=hash(Buffer.from(text));}
 return{status:'PREPARED_ONLY',directory,files:pins,datasetSource:data.source,windowName:'manifestValidationInstalled',scope:'Root owns actual tgz installation, default Vite, mounted refs/cleanup/event/browser and native qualification.'};
}
