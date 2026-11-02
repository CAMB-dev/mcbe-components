import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import {transform} from 'esbuild';

const names=['SettingsFrame','SettingsNavigation','SettingsFields'];
const kinds=['label','info','spacer','divider','stack','toggle','text','text-action','dropdown','radio','slider','permissions','action','experiments'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function dataset(root){
 const file='demo/settings-package-data.ts',raw=await fs.readFile(path.join(root,file));
 const {code}=await transform(raw.toString(),{loader:'ts',format:'esm',target:'es2022'});
 const ast=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.equal(ast.parseDiagnostics.length,0);
 function guard(node){
  assert(!ts.isImportDeclaration(node)&&!(ts.isExportDeclaration(node)&&node.moduleSpecifier),'Dataset has no runtime imports');
  assert(!ts.isAwaitExpression(node),'Dataset has no async work');
  if(ts.isIdentifier(node))assert(!['globalThis','window','document','process','require','fetch','eval','Function','Date','setTimeout','setInterval'].includes(node.text),'Dataset capability '+node.text);
  if(ts.isNewExpression(node))assert.fail('Dataset does not construct services');
  ts.forEachChild(node,guard);
 }
 guard(ast);
 const {createSettingsPackageData}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const props=createSettingsPackageData();
 function plain(value){if(value===null||['string','boolean'].includes(typeof value))return;if(typeof value==='number'){assert(Number.isFinite(value));return;}assert(value&&typeof value==='object'&&(Array.isArray(value)||Object.getPrototypeOf(value)===Object.prototype),'Plain complete data');for(const d of Object.values(Object.getOwnPropertyDescriptors(value))){assert('value'in d,'No getters');plain(d.value);}}
 plain(props);assert.deepEqual(createSettingsPackageData(),props);assert.notStrictEqual(createSettingsPackageData().fields.rows,props.fields.rows);
 return {props,source:{file,bytes:raw.length,sha256:hash(raw)}};
}
async function publicNames(root){const ast=ts.createSourceFile('index.ts',await fs.readFile(path.join(root,'src/index.ts'),'utf8'),ts.ScriptTarget.Latest,true),out=[];for(const n of ast.statements)if(ts.isExportDeclaration(n)&&!n.isTypeOnly&&n.exportClause&&ts.isNamedExports(n.exportClause))for(const s of n.exportClause.elements)if(!s.isTypeOnly)out.push(s.name.text);assert.equal(out.length,new Set(out).size);for(const name of [...names,'layoutSettingsFrame'])assert(out.includes(name));return out;}
async function materials(root){
 const nav=JSON.parse(await fs.readFile(path.join(root,'docs/settings-navigation-assets.json'),'utf8'));
 assert.equal(Object.keys(nav.assets).length,10);
 const entries=new Map();
 const add=(file,pin,group)=>{assert(/^src\/assets\/[a-zA-Z0-9_./-]+$/.test(file)&&!file.split('/').includes('..'));if(!entries.has(file))entries.set(file,{file,...pin,groups:[group]});else entries.get(file).groups.push(group);};
 for(const [key,pin]of Object.entries(nav.assets)){add(pin.file,{bytes:pin.bytes,sha256:pin.sha256,dimensions:pin.dimensions},'navigation:'+key);if(pin.metadata)add(pin.metadata.file,{bytes:pin.metadata.bytes,sha256:pin.metadata.sha256},'navigation-metadata:'+key);}
 const source=await fs.readFile(path.join(root,'src/settings-fields-assets.ts'),'utf8');
 const urls=[...source.matchAll(/new URL\(["'](\.\/assets\/[^"']+)["'],\s*import\.meta\.url\)/g)];assert.equal(urls.length,24,'Complete finite fields asset bank');
 const docs=[];for(const entry of await fs.readdir(path.join(root,'docs'),{withFileTypes:true}))if(entry.isFile()&&entry.name.endsWith('.json'))docs.push({file:'docs/'+entry.name,body:await fs.readFile(path.join(root,'docs',entry.name),'utf8')});
 for(const [,relative]of urls){const file='src/'+relative.slice(2),raw=await fs.readFile(path.join(root,file)),sha256=hash(raw),ledgers=docs.filter(d=>d.body.includes(sha256)).map(d=>d.file);assert(ledgers.length,'Committed source identity ledger for '+file);add(file,{bytes:raw.length,sha256,dimensions:[raw.readUInt32BE(16),raw.readUInt32BE(20)],ledgers},'fields');const metadata=file.replace(/\.png$/,'.json');try{const body=await fs.readFile(path.join(root,metadata));add(metadata,{bytes:body.length,sha256:hash(body)},'fields-metadata');}catch(e){if(e.code!=='ENOENT')throw e;}}
 for(const directory of new Set([...entries.keys()].map(file=>path.posix.dirname(file)))){const file=directory+'/LICENSE.md',raw=await fs.readFile(path.join(root,file));assert.equal(raw.length,222);assert.equal(hash(raw),'ca18c0dede68ce24ea1cd6f9df0813579b6f9f979787983a50baec99345f975d');add(file,{bytes:222,sha256:hash(raw)},'license');}
 for(const pin of entries.values()){const raw=await fs.readFile(path.join(root,pin.file));assert.equal(raw.length,pin.bytes);assert.equal(hash(raw),pin.sha256);}
 return [...entries.values()];
}
function typedConsumer(data){return String.raw`import {createRef} from 'react';
import type {ElementRef} from 'react';
import {SettingsFrame,SettingsNavigation,SettingsFields,layoutSettingsFrame} from 'mcbeui';
import type {SettingsFrameProps,SettingsFrameLayout,SettingsFrameController,SettingsFrameRequest,SettingsFrameGeometry,SettingsNavigationProps,SettingsNavigationDetail,SettingsFieldRow,SettingsFieldsProps,SettingsFieldsRequest} from 'mcbeui';
const f:Omit<SettingsFrameProps,'selectorContent'|'content'>=${JSON.stringify(data.props.frame)};
const n:SettingsNavigationProps=${JSON.stringify(data.props.navigation)};
const p:SettingsFieldsProps=${JSON.stringify(data.props.fields)};
const div=createRef<HTMLDivElement>(),button=createRef<HTMLButtonElement>(),input=createRef<HTMLInputElement>(),controller=createRef<SettingsFrameController>();
type Equal<A,B>=(<T>()=>T extends A?1:2)extends(<T>()=>T extends B?1:2)?true:false;type Assert<T extends true>=T;
type FrameRef=Assert<Equal<ElementRef<typeof SettingsFrame>,HTMLDivElement>>;
type NavigationRef=Assert<Equal<ElementRef<typeof SettingsNavigation>,HTMLDivElement>>;
type FieldsRef=Assert<Equal<ElementRef<typeof SettingsFields>,HTMLDivElement>>;
const frameRequest=(r:SettingsFrameRequest)=>{const target:'button.menu_exit'|'button.menu_tab_left'|'button.menu_tab_right'=r.target;const node:HTMLElement=r.control;void[target,node,r.fromButtonId];return false as const;};
const navRequest=(value:string,d:SettingsNavigationDetail)=>{const b:HTMLButtonElement=d.control;const source:'navigation_tab'=d.sourceGroup;void[value,b,source,d.sourceIndex,d.viewBinding];return false as const;};
const fieldRequest=(r:SettingsFieldsRequest)=>{const node:HTMLInputElement|HTMLButtonElement=r.control;const event:Event=r.nativeEvent;void[node,event,r.identity,r.target,r.proposedValue,r.mappingPolicy];return false as const;};
const refTypes:[FrameRef,NavigationRef,FieldsRef]=[true,true,true];
const geometry:SettingsFrameGeometry=layoutSettingsFrame(f.layout);
const rendered=<SettingsFrame {...f} ref={div} controllerRef={controller} backButtonRef={button} selectorViewportRef={div} contentViewportRef={div} popupHostRef={div} onRequest={frameRequest} inert selectorContent={<SettingsNavigation {...n} ref={div} onValueChange={navRequest} itemRefs={{game:button}}/>} content={<SettingsFields {...p} ref={div} inputRefs={{option_text_edit_0:input}} buttonRefs={{'level_seed_selector:action':button}} rowRefs={{world_title:div}} popupViewportRefs={{option_dropdown_0:div}} onRequest={fieldRequest} popupHost={null} readOnly inert/>}/>;
controller.current?.request('button.menu_cancel');
const {mouseRailAllocation:omitted,...incomplete}=f.layout;
// @ts-expect-error mouse rail allocation is explicit, not inferred from visibility
const missingAllocation:SettingsFrameLayout=incomplete;
// @ts-expect-error unknown engine/default policy is not a supported Web profile
const wrongAllocation:SettingsFrameLayout={...f.layout,mouseRailAllocation:'native'};
// @ts-expect-error source panes are required, arbitrary children are not accepted
const missingPanes=<SettingsFrame {...f}/>;
// @ts-expect-error Frame is a div, not a button ref
const badFrameRef=<SettingsFrame {...f} selectorContent={null} content={null} ref={button}/>;
// @ts-expect-error controller is not a DOM input handle
const badController=<SettingsFrame {...f} selectorContent={null} content={null} controllerRef={input}/>;
// @ts-expect-error only the actual source command vocabulary is accepted
controller.current?.request('button.menu_save');
// @ts-expect-error navigation is controlled and does not infer a selected default
const badNavDefault=<SettingsNavigation {...n} defaultValue="game"/>;
// @ts-expect-error navigation forwards a div
const badNavRef=<SettingsNavigation {...n} ref={button}/>;
// @ts-expect-error no arbitrary markup in the finite navigation source tree
const badNavChildren=<SettingsNavigation {...n}>extra</SettingsNavigation>;
// @ts-expect-error native control references are typed inputs
const badInput=<SettingsFields {...p} inputRefs={{field:button}}/>;
// @ts-expect-error source rows are a required complete discriminated snapshot
const badRow:SettingsFieldRow={kind:'toggle',id:'x',checked:true};
// @ts-expect-error no synthetic inferred slider domain
const badRows:SettingsFieldsProps={...p,hiddenSlots:'native'};
// @ts-expect-error private snapshot/layout machinery is not exported
import {snapshotSettingsFields} from 'mcbeui';
// @ts-expect-error private asset registry is not a public runtime value
import {settingsNavigationAssets} from 'mcbeui';
void[refTypes,rendered,geometry,omitted,missingAllocation,wrongAllocation,missingPanes,badFrameRef,badController,badNavDefault,badNavRef,badNavChildren,badInput,badRow,badRows,snapshotSettingsFields,settingsNavigationAssets];
`;}

const worker=String.raw`
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const cfg=JSON.parse(await fs.readFile(process.argv[2],'utf8')),req=createRequire(path.join(cfg.consumer,'package.json'));
const React=req('react'),render=req('react-dom/server').renderToStaticMarkup,digest=v=>createHash('sha256').update(v).digest('hex');
assert.equal(Number(React.version.split('.')[0]),cfg.major);assert.equal(req('react-dom/package.json').version,React.version);assert.equal(Number(req('@types/react/package.json').version.split('.')[0]),cfg.major);
const installed=path.join(cfg.consumer,'node_modules/mcbeui'),manifest=JSON.parse(await fs.readFile(path.join(installed,'package.json'),'utf8'));
const index=await fs.readFile(path.join(installed,'dist/index.js')),declaration=await fs.readFile(path.join(installed,'dist/index.d.ts'));
assert.deepEqual(index,await fs.readFile(path.join(cfg.root,'dist/index.js')));assert.deepEqual(declaration,await fs.readFile(path.join(cfg.root,'dist/index.d.ts')));
const data=JSON.parse(await fs.readFile(path.join(cfg.directory,'datasets.json'),'utf8')),p=data.props,checks=[],warnings=[],attempts=[],saved=new Map(),refs=[];
let callbackCalls=0,refCalls=0,ui;
const callback=()=>{callbackCalls++;throw Error('Unexpected SSR callback');},callbackRef=()=>{refCalls++;throw Error('Unexpected SSR ref');};
const objectRef=()=>{const r=React.createRef();refs.push(r);return r;};
const check=(name,run)=>{try{run();checks.push(name);}catch(error){error.message='['+name+'] '+error.message;throw error;}};
// Resolve plain host URL inputs only to actual installed original files, without decoding or IO in the component.
const hostURL=src=>pathToFileURL(path.join(installed,'dist',src)).href;
p.frame.background.src=hostURL(p.frame.background.src);
for(const item of p.navigation.items)if(item.kind==='section')for(const key of ['outline','color'])if(item.glyph[key])item.glyph[key].src=hostURL(item.glyph[key].src);
const originalWarn=console.warn,originalError=console.error;console.warn=console.error=(...args)=>warnings.push(args.map(String).join(' '));
for(const key of ['fetch','Image','FontFace','createImageBitmap','OffscreenCanvas','XMLHttpRequest','ResizeObserver','MutationObserver','requestAnimationFrame','setTimeout','setInterval']){saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value(){attempts.push(key);throw Error('Import/SSR capability '+key);}});}
const outputs={};
try{
 ui=await import(pathToFileURL(path.join(installed,'dist/index.js')).href);
 check('actual-installed-namespace-forwardrefs-private-closure',()=>{assert.deepEqual(Object.keys(ui).sort(),cfg.publicNames.slice().sort());for(const name of cfg.names)assert.equal(ui[name].$$typeof,Symbol.for('react.forward_ref'));assert.equal(typeof ui.layoutSettingsFrame,'function');for(const key of ['settingsNavigationAssets','settingsFieldAssets','snapshotSettingsFields','allocatedSettingsRow','settingsFieldCanInteract'])assert(!(key in ui));});
 check('pure-layout-exact-no-mutation-allocation-branches',()=>{const before=JSON.stringify(p.frame.layout),g=ui.layoutSettingsFrame(p.frame.layout);assert.equal(JSON.stringify(p.frame.layout),before);assert.equal(g.selector.contentWidth,ui.layoutSettingsFrame({...p.frame.layout,mouseRailAllocation:'when-visible',selectorScrollbarVisible:false}).selector.contentWidth-8);assert.equal(ui.layoutSettingsFrame({...p.frame.layout,variant:'fullscreen-content'}).selector,null);assert.equal(ui.layoutSettingsFrame({...p.frame.layout,inputMode:'touch'}).selector.railReservation,0);assert.throws(()=>ui.layoutSettingsFrame({...p.frame.layout,mouseRailAllocation:undefined}));});
 const nav=(extra={})=>React.createElement(ui.SettingsNavigation,{...p.navigation,onValueChange:callback,itemRefs:{game:objectRef(),multiplayer:callbackRef},...extra});
 const fields=(extra={})=>React.createElement(ui.SettingsFields,{...p.fields,onRequest:callback,inputRefs:{option_text_edit_0:objectRef(),is_hardcore_toggle:callbackRef},buttonRefs:{'level_seed_selector:action':objectRef()},rowRefs:{world_title:objectRef()},popupViewportRefs:{option_dropdown_0:objectRef()},...extra});
 const frame=(extra={})=>React.createElement(ui.SettingsFrame,{...p.frame,selectorContent:nav(),content:fields(),onRequest:callback,controllerRef:objectRef(),backButtonRef:objectRef(),selectorViewportRef:objectRef(),contentViewportRef:objectRef(),popupHostRef:objectRef(),...extra});
 check('navigation-controlled-source-identities',()=>{const html=render(nav({ref:objectRef()}));outputs.navigation=html;assert(html.includes('role="radiogroup"'));assert.equal((html.match(/role="radio"/g)||[]).length,2);assert.equal((html.match(/aria-checked="true"/g)||[]).length,1);assert(html.includes('data-source-forced-index="4"'));assert(html.includes('data-source-forced-index="9"'));const empty=render(nav({value:null}));assert(!empty.includes('aria-checked="true"'));const ignored=structuredClone(p.navigation.items);ignored[1].ignored=true;assert.equal((render(nav({items:ignored})).match(/role="radio"/g)||[]).length,1);});
 check('fields-all-fourteen-source-kinds-native-controlled-values',()=>{const html=render(fields({ref:objectRef()}));outputs.fields=html;for(const kind of cfg.kinds)assert(html.includes('data-field-kind="'+kind+'"'),'Missing kind '+kind);assert(html.includes('value="12345"'));assert(/maxlength="32"/i.test(html));assert(html.includes('type="range"'));assert(html.includes('type="text"'));assert(html.includes('data-collection="experimental_toggles"'));assert(html.includes('data-layout-policy="host-resolved-source-intrinsics"'));});
 check('frame-composed-panes-popup-owner-and-source-boundary',()=>{const html=render(frame({ref:objectRef()}));outputs.frame=html;assert(html.includes('role="region"'));assert(html.includes('data-native-certified="false"'));assert(html.includes('data-texture-resolution="host-resolved"'));assert(html.includes('data-source-popup-area="content_area"'));assert(html.includes('data-source-pane="selector"'));assert(html.includes('data-source-pane="content"'));assert(html.includes('button.menu_exit'));assert(!/<iframe\b|<script\b/.test(html));});
 check('modal-role-and-public-native-attributes',()=>{const html=render(frame({modal:true,role:'alertdialog','data-consumer':'settings'}));assert(html.includes('role="alertdialog"'));assert(html.includes('aria-modal="true"'));assert(html.includes('data-consumer="settings"'));assert.throws(()=>render(frame({modal:true,role:'main'})));});
 check('three-forwardrefs-hidden-and-react18-19-inert-SSR',()=>{for(const element of [frame({ref:callbackRef,inert:true,hidden:true,controllerRef:callbackRef}),nav({ref:callbackRef,inert:true,hidden:true}),fields({ref:callbackRef,inert:true,hidden:true,readOnly:true})]){const html=render(element);assert(/\sinert=""/.test(html));assert(/\shidden=""/.test(html));}});
 check('finite-invalid-contracts-are-rejected',()=>{assert.throws(()=>render(nav({defaultValue:'game'})));assert.throws(()=>render(nav({children:'arbitrary'})));assert.throws(()=>render(fields({rows:[{...p.fields.rows[0],kind:'unknown'}]})));assert.throws(()=>render(fields({width:NaN})));assert.throws(()=>render(frame({children:'arbitrary'})));assert.throws(()=>render(frame({background:{...p.frame.background,resolution:'native'}})));});
 check('zero-import-render-services-events-refs-and-warnings',()=>{assert.deepEqual(attempts,[]);assert.deepEqual(warnings,[]);assert.equal(callbackCalls,0);assert.equal(refCalls,0);for(const ref of refs)assert.equal(ref.current,null);});
}finally{console.warn=originalWarn;console.error=originalError;for(const[key,descriptor]of saved)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
const materialChecks=[];
for(const pin of cfg.materials){const relative=pin.file.replace(/^src\//,'dist/'),body=await fs.readFile(path.join(installed,relative));assert.equal(body.length,pin.bytes);assert.equal(digest(body),pin.sha256);assert.deepEqual(body,await fs.readFile(path.join(cfg.root,pin.file)));if(pin.dimensions)assert.deepEqual([body.readUInt32BE(16),body.readUInt32BE(20)],pin.dimensions);materialChecks.push({...pin,relative});}
// Actual SSR image sources must decode to a packed/source whole PNG, whether the bundler emits inline data or file URLs.
let renderedPNG=0;const known=new Set(cfg.materials.filter(m=>m.file.endsWith('.png')).map(m=>m.sha256));
for(const html of Object.values(outputs))for(const match of html.matchAll(/(?:src|data-source-url)="([^"]+)"/g)){const url=match[1].replaceAll('&amp;','&');let bytes;if(url.startsWith('data:image/png;base64,'))bytes=Buffer.from(url.slice(22),'base64');else if(url.startsWith('file:')&&url.endsWith('.png')){const target=fileURLToPath(url);assert(target.startsWith(path.join(installed,'dist/assets')+path.sep));bytes=await fs.readFile(target);}if(bytes){assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));if(known.has(digest(bytes)))renderedPNG++;}}
assert(renderedPNG>0,'Actual installed whole original PNGs appear in SSR');
const cssChecks=[],visited=new Set();async function css(file){if(visited.has(file))return;visited.add(file);assert(/^[a-z0-9-]+\.css$/.test(file));const body=await fs.readFile(path.join(installed,'dist',file));assert.deepEqual(body,await fs.readFile(path.join(cfg.root,'src',file)));cssChecks.push({file,sha256:digest(body)});for(const match of body.toString().matchAll(/@import\s+['"]\.\/([^'"]+)['"]/g))await css(match[1]);}
const aggregate=await fs.readFile(path.join(installed,'dist/styles.css'),'utf8');for(const name of ['settings-frame','settings-navigation','settings-fields']){assert.equal(manifest.exports['./'+name+'.css'],'./dist/'+name+'.css');assert(aggregate.includes("@import './"+name+".css'"));await css(name+'.css');}
const result={status:'PASS_INSTALLED_SETTINGS_SSR_ASSETS_CSS_TYPES_NOT_YET_RUN',react:React.version,peerTypes:req('@types/react/package.json').version,runtimeValues:Object.keys(ui).length,checks,fieldKinds:cfg.kinds,callbackCalls,refCalls,nullObjectRefs:refs.length,warnings,attempts,materials:materialChecks,renderedPNG,css:cssChecks,indexSHA256:digest(index),declarationSHA256:digest(declaration),datasetSource:data.source,scope:'Installed public ESM/SSR/whole source files/CSS and zero SSR IO. Mounted events, lifecycle, typography/provider/native geometry require separate qualification.'};
await fs.writeFile(path.join(cfg.directory,'SSR.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
`;

/** Called only after Root builds/packs/installs both peers; never performs installation, builds or browser work. */
export async function verifySettingsPackage({consumer,root,major,evidenceName='settings-contracts'}){
 assert(major===18||major===19);assert(/^[a-z0-9-]{1,80}$/.test(evidenceName));consumer=path.resolve(consumer);root=path.resolve(root);
 const directory=path.join(consumer,evidenceName);await fs.mkdir(directory,{recursive:false});
 const data=await dataset(root),fixture=typedConsumer(data),pins=await materials(root),values=await publicNames(root);
 const write=(name,value)=>fs.writeFile(path.join(directory,name),value,{flag:'wx'});
 await write('datasets.json',JSON.stringify(data,null,2)+'\n');await write('consumer.tsx',fixture);await write('worker.mjs',worker);
 await write('config.json',JSON.stringify({consumer,root,directory,major,names,kinds,materials:pins,publicNames:values}));
 await write('tsconfig.json',JSON.stringify({compilerOptions:{target:'ES2022',lib:['ES2022','DOM','DOM.Iterable'],module:'ESNext',moduleResolution:'Bundler',jsx:'react-jsx',strict:true,noUnusedLocals:true,noUnusedParameters:true,noUncheckedIndexedAccess:true,verbatimModuleSyntax:true,noEmit:true,skipLibCheck:true},include:['consumer.tsx']},null,2));
 async function run(args,file){try{await write(file,execFileSync(process.execPath,args,{cwd:consumer,encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024}));}catch(error){await write(file,String(error.stdout??'')+'\n'+String(error.stderr??error.stack));throw error;}}
 await run([path.join(directory,'worker.mjs'),path.join(directory,'config.json')],'SSR.txt');
 await run([path.join(root,'node_modules/typescript/bin/tsc'),'--project',path.join(directory,'tsconfig.json')],'TYPECHECK.txt');
 const result={...JSON.parse(await fs.readFile(path.join(directory,'SSR.json'),'utf8')),strictTypes:true,negativeTypeContracts:(fixture.match(/@ts-expect-error/g)||[]).length,typedFixtureSHA256:hash(Buffer.from(fixture)),status:'PASS_INSTALLED_SETTINGS_TYPES_SSR_ASSETS_LICENSE_CSS'};
 await write('RESULT.json',JSON.stringify(result,null,2)+'\n');return result;
}
