import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
import {transform} from 'esbuild';
import {verifySettingsPackage} from './verify-settings-package.mjs';

const names=['WorldGameSettings','WorldMultiplayerSettings','WorldSettingsNavigation'];
const hash=b=>createHash('sha256').update(b).digest('hex');
async function dataset(root){
 const file='demo/world-settings-package-data.ts',raw=await fs.readFile(path.join(root,file)),{code}=await transform(raw.toString(),{loader:'ts',format:'esm',target:'es2022'}),ast=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.equal(ast.parseDiagnostics.length,0);
 const guard=node=>{assert(!ts.isImportDeclaration(node)&&!(ts.isExportDeclaration(node)&&node.moduleSpecifier),'No runtime dataset imports');assert(!ts.isAwaitExpression(node)&&!ts.isNewExpression(node),'No dataset service construction');if(ts.isIdentifier(node))assert(!['globalThis','window','document','process','require','fetch','eval','Function','Date','setTimeout','setInterval'].includes(node.text),'Dataset capability '+node.text);ts.forEachChild(node,guard);};guard(ast);
 const factory=(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).createWorldSettingsPackageData;
 const images={white:{src:'./assets/play-screen/white_background.png',sourceSize:[2,2]},thumbnail:null,pack:null},props=factory(images);
 const plain=v=>{if(v===null||['string','boolean'].includes(typeof v))return;if(typeof v==='number'){assert(Number.isFinite(v));return;}assert(v&&typeof v==='object'&&(Array.isArray(v)||Object.getPrototypeOf(v)===Object.prototype),'Plain complete snapshots');for(const d of Object.values(Object.getOwnPropertyDescriptors(v))){assert('value'in d,'No getters');plain(d.value);}};plain(props);
 assert.deepEqual(factory(images),props);assert.notStrictEqual(factory(images).game.snapshot,props.game.snapshot);
 assert(!Object.hasOwn(props.game,'rows')&&!Object.hasOwn(props.multiplayer,'rows'));
 const ledger=JSON.parse(await fs.readFile(path.join(root,'docs/world-settings-fields-source.json'),'utf8'));
 for(const [family,counts]of [['game',[69,114,24,93,116]],['multiplayer',[8,25,4,9,8]]]){const p=props[family];assert.equal(ledger.groups[family].length,counts[0]);for(const[k,count]of [['bindings',counts[1]],['conditions',counts[2]],['strings',counts[3]],['metrics',counts[4]]]){assert.equal(Object.keys(p.snapshot[k]).length,count);assert.deepEqual(Object.keys(p.snapshot[k]).sort(),(Array.isArray(ledger[k][family])?[...ledger[k][family]]:Object.keys(ledger[k][family])).sort());}}
 return{props,source:{file,bytes:raw.length,sha256:hash(raw)},canonical:{groups:ledger.groups,keys:Object.fromEntries(['game','multiplayer'].map(family=>[family,Object.fromEntries(['bindings','conditions','strings','metrics'].map(key=>[key,Object.keys(props[family].snapshot[key])]))]))}};
}
async function publicNames(root){const ast=ts.createSourceFile('index.ts',await fs.readFile(path.join(root,'src/index.ts'),'utf8'),ts.ScriptTarget.Latest,true),out=[];for(const n of ast.statements)if(ts.isExportDeclaration(n)&&!n.isTypeOnly&&n.exportClause&&ts.isNamedExports(n.exportClause))for(const e of n.exportClause.elements)if(!e.isTypeOnly)out.push(e.name.text);assert.equal(out.length,new Set(out).size);for(const name of names)assert(out.includes(name));assert.equal(out.length,283);return out;}
async function materials(root){
 const ledger=JSON.parse(await fs.readFile(path.join(root,'docs/world-navigation-assets.json'),'utf8'));assert.equal(Object.keys(ledger.assets).length,12);const entries=new Map(),embedded=[];
 const add=async pin=>{assert(/^src\/assets\/[a-zA-Z0-9_./-]+$/.test(pin.file)&&!pin.file.split('/').includes('..'));const bytes=await fs.readFile(path.join(root,pin.file));assert.equal(bytes.length,pin.bytes);assert.equal(hash(bytes),pin.sha256);entries.set(pin.file,pin);};
 for(const[key,pin]of Object.entries(ledger.assets)){
  if(pin.file.endsWith('.ts')){const ast=ts.createSourceFile(pin.file,await fs.readFile(path.join(root,pin.file),'utf8'),ts.ScriptTarget.Latest,true),urls=[];const visit=n=>{if(ts.isPropertyAssignment(n)&&ts.isStringLiteral(n.name)&&n.name.text===key&&ts.isObjectLiteralExpression(n.initializer)){const url=n.initializer.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(ast)==='url');assert(url&&ts.isStringLiteral(url.initializer));urls.push(url.initializer.text);}ts.forEachChild(n,visit);};visit(ast);assert.equal(urls.length,1);assert(urls[0].startsWith('data:image/png;base64,'));const bytes=Buffer.from(urls[0].slice(22),'base64');assert.equal(bytes.length,pin.bytes);assert.equal(hash(bytes),pin.sha256);embedded.push({key,bytes:pin.bytes,sha256:pin.sha256,dimensions:pin.dimensions,sourceModule:pin.file});}
  else await add({key,file:pin.file,bytes:pin.bytes,sha256:pin.sha256,dimensions:pin.dimensions});
  if(pin.metadata.file)await add({file:pin.metadata.file,bytes:pin.metadata.bytes,sha256:pin.metadata.sha256});
 }
 const launch=JSON.parse(await fs.readFile(path.join(root,'docs/world-settings-assets.json'),'utf8'));assert.equal(Object.keys(launch.assets).length,6);
 for(const[key,pin]of Object.entries(launch.assets)){await add({key:'launch-dependency:'+key,file:pin.file,bytes:pin.bytes,sha256:pin.sha256,dimensions:pin.dimensions,dependency:true});await add({file:pin.metadata.file,bytes:pin.metadata.bytes,sha256:pin.metadata.sha256});}
 if(launch.license?.file)await add({file:launch.license.file,bytes:launch.license.bytes,sha256:launch.license.sha256});
 // Explicit host-resolved White example, not an exact-literal source claim.
 const host='src/assets/play-screen/white_background.png',body=await fs.readFile(path.join(root,host));await add({key:'host-resolved-white-example',file:host,bytes:body.length,sha256:hash(body),dimensions:[2,2],resolution:'host-resolved'});
 for(const dir of new Set([...entries.keys()].map(file=>path.posix.dirname(file)))){const file=dir==='src/assets/play-screen'?'src/assets/Minecraft-Sample-LICENSE.md':dir+'/LICENSE.md';await add({file,bytes:222,sha256:'ca18c0dede68ce24ea1cd6f9df0813579b6f9f979787983a50baec99345f975d'});}
 return{files:[...entries.values()],embedded};
}
function typedConsumer(data){return String.raw`import {createRef}from'react';import type{ElementRef}from'react';
import{WorldGameSettings,WorldMultiplayerSettings,WorldSettingsNavigation,SettingsFields}from'mcbeui';
import type{WorldGameSettingsProps,WorldMultiplayerSettingsProps,WorldSettingsNavigationProps,WorldSettingsNavigationMaterialRendering,WorldGameSettingsSnapshot,WorldMultiplayerSettingsSnapshot,WorldSettingsNavigationSnapshot,WorldSettingsNavigationId,WorldSettingsFieldMetrics,WorldSettingsExperimentSnapshot,SettingsFieldRow,SettingsPanelRow,SettingsPermissionRow,SettingsActionRow,SettingsFieldsProps,SettingsFieldsTextFormatting,SettingsFieldsRequest,SettingsNavigationDetail,WorldLaunchActionDetail}from'mcbeui';
const g:WorldGameSettingsProps=${JSON.stringify(data.props.game)};
const m:WorldMultiplayerSettingsProps=${JSON.stringify(data.props.multiplayer)};
const n:WorldSettingsNavigationProps=${JSON.stringify(data.props.navigation)};
const generic:SettingsFieldsProps=${JSON.stringify(data.props.generic)};
const div=createRef<HTMLDivElement>(),input=createRef<HTMLInputElement>(),button=createRef<HTMLButtonElement>();
type Equal<A,B>=(<T>()=>T extends A?1:2)extends(<T>()=>T extends B?1:2)?true:false;type Assert<T extends true>=T;
const refs:[Assert<Equal<ElementRef<typeof WorldGameSettings>,HTMLDivElement>>,Assert<Equal<ElementRef<typeof WorldMultiplayerSettings>,HTMLDivElement>>,Assert<Equal<ElementRef<typeof WorldSettingsNavigation>,HTMLDivElement>>]=[true,true,true];
const request=(r:SettingsFieldsRequest)=>{const target:string=r.target,uri:string|undefined=r.uri,node:HTMLInputElement|HTMLButtonElement=r.control;void[target,uri,node,r.identity,r.nativeEvent,r.sourceValue];return false as const;};
const navRequest=(value:WorldSettingsNavigationId,d:SettingsNavigationDetail)=>{const group:'navigation_tab'=d.sourceGroup;void[value,group,d.viewBinding,d.sourceIndex,d.control];return false as const;};
const launch=(d:WorldLaunchActionDetail)=>{const target:string=d.target;void[target,d.control,d.event];return false as const;};
const solidMaterial:WorldSettingsNavigationMaterialRendering={profile:'source-image',extentPolicy:'ceil',background:{kind:'solid',color:[.192,.196,.2,1]},renderKey:'package-solid',onStateChange:state=>{const exact:'loading'|'ready'|'error'=state;void exact;},onError:error=>{const exact:Error=error;void exact;}};
const transparentMaterial:WorldSettingsNavigationMaterialRendering={profile:'source-image',extentPolicy:'ceil',background:{kind:'transparent'},renderKey:2};
const materialPages=<><WorldSettingsNavigation {...n} materialRendering={solidMaterial}/><WorldSettingsNavigation {...n} materialRendering={transparentMaterial}/></>;
const pages=<><WorldGameSettings {...g} ref={div} onRequest={request} inputRefs={{field:input}} rowRefs={{row:div}} buttonRefs={{row:button}} inert/><WorldMultiplayerSettings {...m} ref={div} readOnly onRequest={request}/><WorldSettingsNavigation {...n} ref={div} nodeRefs={{world_selector_pane:div}} itemRefs={{game_button:button}} launchButtonRefs={{primary:button}} onValueChange={navRequest} onLaunchAction={launch}/><SettingsFields {...generic}/></>;
const snapshot:WorldGameSettingsSnapshot=g.snapshot,multi:WorldMultiplayerSettingsSnapshot=m.snapshot,metrics:WorldSettingsFieldMetrics<'game'>=g.snapshot.metrics,experiment:WorldSettingsExperimentSnapshot=g.snapshot.experiments[0]!;
const formatting:SettingsFieldsTextFormatting={colors:{'7':[.7,.7,.7]},resetCode:'r'};const formatted=<SettingsFields {...generic} textFormatting={formatting}/>;
const panel:SettingsPanelRow={kind:'panel',id:'p',sourceControl:'p',ignored:false,visible:true,enabled:true,height:30,rows:[]};
const permission=generic.rows[1] as SettingsPermissionRow;const checked:Readonly<Record<'visitor'|'member'|'operator',boolean>>|undefined=permission.checked;
const uriRow:SettingsActionRow={kind:'action',id:'uri',sourceControl:'uri',ignored:false,visible:true,enabled:true,height:30,label:'Help',target:'button.menu_open_uri',uri:'https://aka.ms/MCMultiplayerHelp',tone:'light',labelMaxHeight:10};const row:SettingsFieldRow=panel;
// @ts-expect-error named source page cannot be replaced by arbitrary generic rows
const rows=<WorldGameSettings {...g} rows={[]}/>;
// @ts-expect-error named source page cannot take arbitrary children
const children=<WorldMultiplayerSettings {...m}>other</WorldMultiplayerSettings>;
// @ts-expect-error required complete named snapshot cannot be empty
const missing:WorldGameSettingsSnapshot={};
// @ts-expect-error source string binding is not a boolean
const binding:WorldGameSettingsSnapshot={...g.snapshot,bindings:{...g.snapshot.bindings,'#achievement_warning_text':false}};
// @ts-expect-error every canonical condition must be supplied
const conditions:WorldMultiplayerSettingsSnapshot={...m.snapshot,conditions:{}};
// @ts-expect-error all canonical metrics are required, not a partial map
const missingMetrics:WorldSettingsFieldMetrics<'game'>={};
// @ts-expect-error the source factory uses explicit numeric index
const badExperiment:WorldSettingsExperimentSnapshot={...experiment,index:'0'};
// @ts-expect-error explicit source text-input projection is not an inferred platform evaluator
const inputMode=<WorldGameSettings {...g} inputMode="native"/>;
// @ts-expect-error all three roots are div refs
const badRef=<WorldMultiplayerSettings {...m} ref={button}/>;
// @ts-expect-error game page does not forward a button root
const badGameRef=<WorldGameSettings {...g} ref={button}/>;
// @ts-expect-error named navigation IDs are finite and do not include Save
const badNav=<WorldSettingsNavigation {...n} value="save"/>;
// @ts-expect-error named navigation snapshot requires every named button
const badSnapshot:WorldSettingsNavigationSnapshot={...n.snapshot,buttons:{}};
// @ts-expect-error content_area wrapper refs are divs
const badNodeRef=<WorldSettingsNavigation {...n} nodeRefs={{world_selector_pane:button}}/>;
// @ts-expect-error raw permission flags cannot be collapsed into one guessed enum/string
const badRaw:SettingsPermissionRow={...permission,checked:'member'};
// @ts-expect-error URI intent is text metadata, never a callable service
const badURI:SettingsActionRow={...uriRow,uri:()=>{}};
// @ts-expect-error explicit source profile must retain both unresolved anchor policies
const badPolicy:WorldGameSettingsSnapshot={...g.snapshot,layoutPolicy:{unresolvedPanelAnchor:'top-left'}};
// @ts-expect-error a declared color is exactly a three-channel tuple
const badFormatting:SettingsFieldsTextFormatting={colors:{'7':[.7,.7]},resetCode:null};
// @ts-expect-error target extent resolution is required, not an inferred renderer default
const missingExtent:WorldSettingsNavigationMaterialRendering={profile:'source-image',background:{kind:'transparent'}};
// @ts-expect-error the underlying surface is explicit even when transparent
const missingBackground:WorldSettingsNavigationMaterialRendering={profile:'source-image',extentPolicy:'ceil'};
// @ts-expect-error navigation material profile accepts only uniform solid/transparent, not an arbitrary image backdrop
const badBackground:WorldSettingsNavigationMaterialRendering={profile:'source-image',extentPolicy:'ceil',background:{kind:'texture',texture:{width:1,height:1,data:new Uint8ClampedArray(4)},encoding:'straight-alpha'}};
// @ts-expect-error material queue construction stays private rather than a new public renderer function
import{worldNavigationMaterialImages}from'mcbeui';
// @ts-expect-error private source-tree seam is not a public component
import{SourceSettingsNavigation}from'mcbeui';
// @ts-expect-error private named planner is not a public helper
import{planWorldSettingsFields}from'mcbeui';
// @ts-expect-error private original-image bank is not a public data export
import{worldNavigationAssets}from'mcbeui';
void[refs,pages,materialPages,missingExtent,missingBackground,badBackground,worldNavigationMaterialImages,formatted,badFormatting,snapshot,multi,metrics,experiment,checked,row,rows,children,missing,binding,conditions,missingMetrics,badExperiment,inputMode,badRef,badGameRef,badNav,badSnapshot,badNodeRef,badRaw,badURI,badPolicy,SourceSettingsNavigation,planWorldSettingsFields,worldNavigationAssets];
`;}

const worker=String.raw`
import assert from'node:assert/strict';import fs from'node:fs/promises';import path from'node:path';import{createRequire}from'node:module';import{pathToFileURL,fileURLToPath}from'node:url';import{createHash}from'node:crypto';
const cfg=JSON.parse(await fs.readFile(process.argv[2],'utf8')),req=createRequire(path.join(cfg.consumer,'package.json')),React=req('react'),render=req('react-dom/server').renderToStaticMarkup,hash=v=>createHash('sha256').update(v).digest('hex');
assert.equal(Number(React.version.split('.')[0]),cfg.major);assert.equal(req('react-dom/package.json').version,React.version);assert.equal(Number(req('@types/react/package.json').version.split('.')[0]),cfg.major);
const installed=path.join(cfg.consumer,'node_modules/mcbeui'),index=await fs.readFile(path.join(installed,'dist/index.js')),declaration=await fs.readFile(path.join(installed,'dist/index.d.ts'));assert.deepEqual(index,await fs.readFile(path.join(cfg.root,'dist/index.js')));assert.deepEqual(declaration,await fs.readFile(path.join(cfg.root,'dist/index.d.ts')));
const data=JSON.parse(await fs.readFile(path.join(cfg.directory,'datasets.json'),'utf8')),p=data.props,checks=[],warnings=[],attempts=[],saved=new Map(),objectRefs=[],outputs=[];let callbacks=0,refCalls=0,ui;
const callback=()=>{callbacks++;throw Error('Unexpected SSR callback');},refCallback=()=>{refCalls++;throw Error('Unexpected SSR ref');},objectRef=()=>{const ref=React.createRef();objectRefs.push(ref);return ref;};
const check=(name,run)=>{try{run();checks.push(name);}catch(error){error.message='['+name+'] '+error.message;throw error;}};
const host=v=>{if(v?.src?.startsWith('./assets/'))v.src=pathToFileURL(path.join(installed,'dist',v.src)).href;};host(p.navigation.snapshot.packs.border);
const oldWarn=console.warn,oldError=console.error;console.warn=console.error=(...args)=>warnings.push(args.map(String).join(' '));
for(const key of['fetch','Image','FontFace','createImageBitmap','OffscreenCanvas','XMLHttpRequest','ResizeObserver','MutationObserver','requestAnimationFrame','setTimeout','setInterval']){saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value(){attempts.push(key);throw Error('Import/SSR capability '+key);}});}
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
try{
 ui=await import(pathToFileURL(path.join(installed,'dist/index.js')).href);
 check('actual-installed-283-namespace-three-new-forwardrefs-private-closure',()=>{assert.equal(Object.keys(ui).length,283);assert.deepEqual(Object.keys(ui).sort(),cfg.publicNames.slice().sort());for(const name of cfg.names)assert.equal(ui[name].$$typeof,Symbol.for('react.forward_ref'));for(const name of['SourceSettingsNavigation','snapshotWorldNavigation','worldNavigationAssets','worldNavigationIds','planWorldSettingsFields','worldSettingsFieldsSchema','parseSettingsFieldText','validateSettingsFieldTextFormatting','SourceWorldSettingsActionButton','worldNavigationMaterialImages','validateWorldNavigationMaterial','useWorldNavigationMaterial','planSourceSettingsNavigation'])assert(!(name in ui));});
 for(const[family,name]of[['game','WorldGameSettings'],['multiplayer','WorldMultiplayerSettings']]){
  const props=p[family];
  check('complete-'+family+'-source-snapshot-and-topology-SSR',()=>{for(const key of['bindings','conditions','strings','metrics'])assert.deepEqual(Object.keys(props.snapshot[key]).sort(),data.canonical.keys[family][key].slice().sort());assert(!Object.hasOwn(props,'rows'));
   const html=render(React.createElement(ui[name],{...props,ref:objectRef(),onRequest:callback,inputRefs:{host:objectRef()},buttonRefs:{host:refCallback},rowRefs:{host:objectRef()},popupViewportRefs:{host:objectRef()}}));outputs.push(html);assert(html.includes('data-world-settings-source="'+family+'"'));assert(html.includes('data-layout-policy="host-resolved-source-intrinsics"'));
   const expected=[];function visit(nodes,parentIgnored=false){for(const node of nodes){const flag=node.state.ignored;const ignored=parentIgnored||(typeof flag==='boolean'?flag:props.snapshot.bindings[flag]??props.snapshot.conditions[flag]);assert.equal(typeof ignored,'boolean');if(ignored)continue;expected.push(node.key);if(node.children)visit(node.children,false);}}visit(data.canonical.groups[family]);let at=-1;for(const key of expected){const next=html.indexOf('data-field-id="'+escape(key)+'"',at+1);assert(next>at,'Canonical ordered source record '+key);at=next;}assert(expected.length>=data.canonical.groups[family].length);
  });
  check(family+'-two-input-projections-inert-hidden-ref-no-service',()=>{for(const inputMode of['mouse','touch']){const html=render(React.createElement(ui[name],{...props,inputMode,inert:true,hidden:true,readOnly:true,ref:refCallback,onRequest:callback}));assert(/\sinert=""/.test(html));assert(/\shidden=""/.test(html));}});
  check(family+'-rejects-partial-extra-renamed-and-generic-override-snapshots',()=>{const missing=structuredClone(props);delete missing.snapshot.bindings[Object.keys(missing.snapshot.bindings)[0]];assert.throws(()=>render(React.createElement(ui[name],missing)));const extra=structuredClone(props);extra.snapshot.bindings.renamed_source=false;assert.throws(()=>render(React.createElement(ui[name],extra)));const metrics=structuredClone(props);delete metrics.snapshot.metrics[Object.keys(metrics.snapshot.metrics)[0]];assert.throws(()=>render(React.createElement(ui[name],metrics)));assert.throws(()=>render(React.createElement(ui[name],{...props,rows:[]})));assert.throws(()=>render(React.createElement(ui[name],{...props,children:'arbitrary'})));const condition=structuredClone(props);delete condition.snapshot.conditions[Object.keys(condition.snapshot.conditions)[0]];assert.throws(()=>render(React.createElement(ui[name],condition)));if(family==='game'){const factory=structuredClone(props);factory.snapshot.experiments.pop();assert.throws(()=>render(React.createElement(ui[name],factory)));const index=structuredClone(props);index.snapshot.experiments[0].index=99;assert.throws(()=>render(React.createElement(ui[name],index)));}});
 }
 const nav=patch=>React.createElement(ui.WorldSettingsNavigation,{...p.navigation,ref:objectRef(),onValueChange:callback,onLaunchAction:callback,itemRefs:{game_button:objectRef()},nodeRefs:{world_selector_pane:objectRef()},launchButtonRefs:{primary:refCallback},...patch});
 check('world-navigation-three-source-modes-and-explicit-launch-provider-SSR',()=>{for(const mode of['create','template-create','edit']){const html=render(nav({mode}));outputs.push(html);assert(html.includes('data-world-settings-mode="'+mode+'"'));assert(html.includes('data-source-settings-tree="true"'));assert(html.includes('data-source-control="settings.selector_stack_panel/world_selector_pane"'));assert(html.includes('data-source-forced-index="4"'));assert(html.includes('data-source-forced-index="20"'));assert.equal((html.match(/aria-checked="true"/g)||[]).length,1);}});
 check('world-navigation-source-branch-snapshots-original-glyph-and-loading-closure',()=>{for(const branch of['education','switch','loading','debug']){const snapshot=structuredClone(p.navigation.snapshot);if(branch==='education')snapshot.context.educationEdition=true;if(branch==='switch')snapshot.context.nxOs=true;if(branch==='debug')snapshot.context.publish=false;if(branch==='loading'){snapshot.context.pregame=false;snapshot.server.visible=true;snapshot.server.iconName='loading';snapshot.server.loadingFrame=7;}const html=render(nav({snapshot,value:null}));outputs.push(html);assert(!html.includes('aria-checked="true"'));if(branch==='loading')assert(html.includes('data-source-uv-frame="7"'));}});
 check('world-navigation-explicit-opaque-transparent-material-SSR-loading',()=>{for(const background of[{kind:'solid',color:[.192,.196,.2,1]},{kind:'transparent'}]){const html=render(nav({ref:refCallback,materialRendering:{profile:'source-image',extentPolicy:'ceil',background,renderKey:'installed-'+background.kind,onStateChange:callback,onError:callback}}));outputs.push(html);assert(html.includes('data-material-profile="source-image"'));assert(html.includes('data-material-state="loading"'));assert(html.includes('data-render-state="loading"'));assert(html.includes('<canvas'));assert(html.includes('visibility:hidden'));assert(!html.includes('mc-world-navigation--material-ready'));assert(html.includes('role="radiogroup"'));assert(html.includes('role="radio"'));}});
 check('world-navigation-missing-provider-and-named-identity-guards',()=>{const white=structuredClone(p.navigation.snapshot);white.packs.border=null;assert.throws(()=>render(nav({snapshot:white})));const cloud=structuredClone(p.navigation.snapshot);Object.assign(cloud.context,{educationEdition:true,cloudEnabled:true,cloudGeneralToggleEnabled:true,multiplayerClient:false});assert.throws(()=>render(nav({snapshot:cloud})));const missing=structuredClone(p.navigation.snapshot);delete missing.buttons.game_button;assert.throws(()=>render(nav({snapshot:missing})));assert.throws(()=>render(nav({value:'save'})));});
 check('generic-panel-raw-permission-URI-intent-backward-compatible-SSR',()=>{const html=render(React.createElement(ui.SettingsFields,{...p.generic,ref:objectRef(),onRequest:callback}));outputs.push(html);assert(html.includes('data-field-kind="panel"'));assert(html.includes('left:5px')&&html.includes('top:7px'));assert(html.includes('Independent raw flags'));assert(!/<a\b|<iframe\b/.test(html));assert(!html.includes('href="https://aka.ms/MCMultiplayerHelp"'));assert(p.generic.rows[1].checked.visitor&&p.generic.rows[1].checked.member);assert.equal(p.generic.rows[2].uri,'https://aka.ms/MCMultiplayerHelp');});
 check('explicit-color-code-projection-literal-unknown-raw-input-and-visible-ARIA',()=>{
  const props=structuredClone(p.generic);props.rows[0].rows[0].text='A§7B§rC§xD';props.rows[2].label='§7Account help';
  props.rows.push({kind:'text',id:'format-input',sourceControl:'settings_common.option_text_edit',ignored:false,visible:true,enabled:true,height:48,binding:'#host_text',value:'§7raw input',placeholder:'raw input',textBoxName:'host_text',maxLength:32,sourceTextType:'ExtendedASCII',allowDataBinding:true,option:{mode:'two-line',label:'§7Visible label',showLabel:false,labelHeight:10,description:null,descriptionHeight:0,labelAlignment:'left',controlY:14}});
  const textFormatting={colors:{'7':[.7,.7,.7]},resetCode:'r'};
  const raw=render(React.createElement(ui.SettingsFields,props));assert(raw.includes('A§7B§rC§xD'));
  const html=render(React.createElement(ui.SettingsFields,{...props,textFormatting}));assert(html.includes('data-settings-text-run=""'));assert(html.includes('color:rgb(70% 70% 70%)'));assert(!html.includes('A§7B§rC§xD'));assert(html.includes('C§xD'));assert(html.includes('aria-label="Visible label"'));assert(html.includes('aria-label="Account help"'));assert(html.includes('value="§7raw input"'));
  for(const colors of[{'7':[.7,.7]},{'7':[2,.7,.7]}])assert.throws(()=>render(React.createElement(ui.SettingsFields,{...props,textFormatting:{colors,resetCode:null}})));
 });
 check('zero-new-import-SSR-services-callbacks-references-warnings',()=>{assert.deepEqual(attempts,[]);assert.deepEqual(warnings,[]);assert.equal(callbacks,0);assert.equal(refCalls,0);for(const ref of objectRefs)assert.equal(ref.current,null);});
}finally{console.warn=oldWarn;console.error=oldError;for(const[key,d]of saved)if(d)Object.defineProperty(globalThis,key,d);else delete globalThis[key];}
const pins=[];for(const pin of cfg.materials.files){const relative=pin.file.replace(/^src\//,'dist/'),body=await fs.readFile(path.join(installed,relative));assert.equal(body.length,pin.bytes);assert.equal(hash(body),pin.sha256);assert.deepEqual(body,await fs.readFile(path.join(cfg.root,pin.file)));if(pin.dimensions)assert.deepEqual([body.readUInt32BE(16),body.readUInt32BE(20)],pin.dimensions);pins.push({...pin,relative});}
const newDirectory='dist/assets/world-navigation',closedFiles=cfg.materials.files.filter(pin=>path.posix.dirname(pin.file)==='src/assets/world-navigation').map(pin=>path.posix.basename(pin.file));assert.deepEqual((await fs.readdir(path.join(installed,newDirectory))).sort(),closedFiles.sort(),'New original-image directory contains only its declared public originals and license');
const rendered=new Set();for(const raw of outputs)for(const match of raw.replaceAll('&quot;','"').replaceAll('&amp;','&').matchAll(/(?:src|href)="([^"]+)"|url\("([^"]+)"\)/g)){const url=match[1]??match[2];let body;if(url.startsWith('data:image/png;base64,'))body=Buffer.from(url.slice(22),'base64');else if(url.startsWith('file:')&&url.endsWith('.png')){const file=fileURLToPath(url);assert(file.startsWith(path.join(installed,'dist/assets')+path.sep));body=await fs.readFile(file);}if(body)rendered.add(hash(body));}
for(const pin of cfg.materials.files.filter(pin=>pin.key&&!pin.dependency&&pin.key!=='host-resolved-white-example'))assert(rendered.has(pin.sha256),'Actual installed SSR uses original '+pin.key);for(const pin of cfg.materials.embedded){assert(rendered.has(pin.sha256),'Actual loading provider embeds whole original');}
const manifest=JSON.parse(await fs.readFile(path.join(installed,'package.json'),'utf8')),css=[],seen=new Set();async function closure(file){if(seen.has(file))return;seen.add(file);assert(/^[a-z0-9-]+\.css$/.test(file));const bytes=await fs.readFile(path.join(installed,'dist',file));assert.deepEqual(bytes,await fs.readFile(path.join(cfg.root,'src',file)));css.push({file,sha256:hash(bytes)});for(const m of bytes.toString().matchAll(/@import\s+['"]\.\/([^'"]+)['"]/g))await closure(m[1]);}
assert.equal(manifest.exports['./world-settings-navigation.css'],'./dist/world-settings-navigation.css');await closure('world-settings-navigation.css');const aggregate=await fs.readFile(path.join(installed,'dist/styles.css'),'utf8');assert(/@import\s+['"]\.\/world-settings-navigation\.css['"]/.test(aggregate));
const result={status:'PASS_INSTALLED_WORLD_SETTINGS_PAGES_SSR_ASSETS_CSS_TYPES_NOT_YET_RUN',react:React.version,peerTypes:req('@types/react/package.json').version,runtimeValues:Object.keys(ui).length,newContractCount:checks.length,newChecks:checks,materialAmendment:{additionalWorkerGroups:1,additionalNegativeTypeContracts:4,scope:'Optional opaque/transparent profiles remain loading and keep CSS presentation during SSR; no mounted GPU/native proof.'},callbacks,refCalls,nullObjectRefs:objectRefs.length,warnings,attempts,sourceCounts:{game:{topLevel:69,bindings:114,conditions:24,metrics:116},multiplayer:{topLevel:8,bindings:25,conditions:4,metrics:8}},materials:pins,embedded:cfg.materials.embedded,css,indexSHA256:hash(index),declarationSHA256:hash(declaration),datasetSource:data.source,scope:'Three named source parts, installed ESM/SSR/types/source material closure. Existing base receipts are separate, not new unique checks. No WorldSettingsScreen, native layout/fonts/provider correctness or browser qualification claimed.'};await fs.writeFile(path.join(cfg.directory,'SSR.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
`;

/** Root builds/installs actual peers first. Every artifact is a new directory
 * under that consumer; neither this helper nor the base installs/builds/runs UI. */
export async function verifyWorldSettingsPagesPackage({consumer,root,major,evidenceName='world-settings-pages-contracts'}){
 assert(major===18||major===19);assert(/^[a-z0-9-]{1,60}$/.test(evidenceName));consumer=path.resolve(consumer);root=path.resolve(root);const directory=path.join(consumer,evidenceName);await fs.mkdir(directory,{recursive:false});const write=(file,value)=>fs.writeFile(path.join(directory,file),value,{flag:'wx'});
 const data=await dataset(root),fixture=typedConsumer(data),pins=await materials(root),values=await publicNames(root);
 const base=await verifySettingsPackage({consumer,root,major,evidenceName:evidenceName+'-base'});assert(base.strictTypes);await write('BASE-DEPENDENCY.json',JSON.stringify({path:'../'+evidenceName+'-base/RESULT.json',status:base.status,existingCheckCount:base.checks.length,scope:'Previously delivered generic contracts; repeated dependency verification, not new unique tests.'},null,2)+'\n');
 await write('datasets.json',JSON.stringify(data,null,2)+'\n');await write('consumer.tsx',fixture);await write('worker.mjs',worker);await write('config.json',JSON.stringify({consumer,root,directory,major,names,publicNames:values,materials:pins}));await write('tsconfig.json',JSON.stringify({compilerOptions:{target:'ES2022',lib:['ES2022','DOM','DOM.Iterable'],module:'ESNext',moduleResolution:'Bundler',jsx:'react-jsx',strict:true,noUnusedLocals:true,noUnusedParameters:true,noUncheckedIndexedAccess:true,verbatimModuleSyntax:true,noEmit:true,skipLibCheck:true},include:['consumer.tsx']},null,2));
 async function run(args,file){try{await write(file,execFileSync(process.execPath,args,{cwd:consumer,encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024}));}catch(error){await write(file,String(error.stdout??'')+'\n'+String(error.stderr??error.stack));throw error;}}
 await run([path.join(directory,'worker.mjs'),path.join(directory,'config.json')],'SSR.txt');await run([path.join(root,'node_modules/typescript/bin/tsc'),'--project',path.join(directory,'tsconfig.json')],'TYPECHECK.txt');const result={...JSON.parse(await fs.readFile(path.join(directory,'SSR.json'),'utf8')),strictTypes:true,negativeTypeContracts:(fixture.match(/@ts-expect-error/g)||[]).length,typedFixtureSHA256:hash(Buffer.from(fixture)),baseDependencyReceipt:'../'+evidenceName+'-base/RESULT.json',status:'PASS_INSTALLED_WORLD_SETTINGS_PAGES_TYPES_SSR_ORIGINALS_METADATA_LICENSE_CSS'};await write('RESULT.json',JSON.stringify(result,null,2)+'\n');return result;
}
