import {StrictMode, useEffect, useState} from 'react';
import type {RefCallback,MouseEvent as ReactMouseEvent} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {hasGameFont} from 'virtual:mcbeui-game-font';
import {ManifestValidationScreen} from '../src/manifest-validation-screen';
import {ManifestValidationButton, ManifestPackSummary, ManifestValidationIssue, ManifestValidationIssues, ManifestValidationContent} from '../src/manifest-validation-parts';
import type {ManifestValidationActionDetail, ManifestValidationButtonProps} from '../src/manifest-validation-parts';
import {createManifestValidationDemoProps, createManifestValidationDemoIssues} from './manifest-validation-data';
import '../src/fonts.css';
import '../src/styles.css';
import '../src/manifest-validation-screen.css';
import '../src/manifest-validation-parts.css';

export interface ManifestValidationFixtureConfiguration {
  part:'screen'|'content'|'summary'|'issue'|'issues'|'button'; variant:ManifestValidationButtonProps['variant'];
  mounted:boolean; open:boolean; hidden:boolean; disabled:boolean; readOnly:boolean;
  isWorking:boolean; isDeleting:boolean; isDoneValidating:boolean; hasErrorsOrWarnings:boolean;
  showSize:boolean; showRefresh:boolean; showDelete:boolean; showIcon:boolean; closeVisible:boolean;
  inputMode:'mouse'|'touch'; scale:number; viewportWidth:number; viewportHeight:number; loadingFrame:number;
  lowMemoryDevice:boolean; entryCount:number; longContent:boolean; revision:number; identityRevision:number;
  acceptClose:boolean; acceptActions:boolean; preventLeaf:boolean; preventAncestor:boolean; preventNative:boolean;
  preventKey:boolean; viewNavigationKeys:boolean;
}
interface EventRecord {kind:string;target:string;sourceControl?:string;origin?:string;runKey?:string;packId?:string;issueId?:string;issueIndex?:number;collection?:string;controlId:string;currentTargetId:string;stableTarget:boolean;accepted:boolean}
interface RefRecord {kind:string;phase:'attach'|'cleanup'|'null';attachment:number;nodeId:string}
interface API {
  configure:(patch:Partial<ManifestValidationFixtureConfiguration>)=>void;clear:()=>void;unmount:()=>void;remount:()=>void;
  getRefs:()=>Record<string,HTMLElement|null>;config:ManifestValidationFixtureConfiguration;ready:boolean;
  events:EventRecord[];refEvents:RefRecord[];
}
declare global {interface Window {manifestValidationFixture:API}}
const defaults:ManifestValidationFixtureConfiguration={part:'screen',variant:'copy',mounted:true,open:true,hidden:false,disabled:false,readOnly:false,isWorking:false,isDeleting:false,isDoneValidating:true,hasErrorsOrWarnings:true,showSize:true,showRefresh:true,showDelete:true,showIcon:false,closeVisible:true,inputMode:'mouse',scale:2,viewportWidth:420,viewportHeight:300,loadingFrame:0,lowMemoryDevice:false,entryCount:2,longContent:false,revision:0,identityRevision:0,acceptClose:false,acceptActions:true,preventLeaf:false,preventAncestor:false,preventNative:false,preventKey:false,viewNavigationKeys:false};
const issueSamples=createManifestValidationDemoIssues();
const hostIcon=new URL('./assets/minecraft/diamond.png',import.meta.url).href;
const nodes:Record<string,HTMLElement|null>={},refCache=new Map<string,RefCallback<HTMLElement>>();let attachment=0;
const api:API={configure:()=>{},clear:()=>{api.events.length=0;},unmount:()=>{},remount:()=>{},getRefs:()=>({...nodes}),config:defaults,ready:false,events:[],refEvents:[]};window.manifestValidationFixture=api;
// Stable callback per actual boundary; source ref binders own the returned
// cleanup on both peers. Logs deliberately distinguish cleanup from null.
function tracked<T extends HTMLElement>(kind:string):RefCallback<T>{
  if(!refCache.has(kind))refCache.set(kind,node=>{nodes[kind]=node;if(!node){api.refEvents.push({kind,phase:'null',attachment:0,nodeId:''});return;}const token=++attachment,nodeId=node.id;api.refEvents.push({kind,phase:'attach',attachment:token,nodeId});return()=>{api.refEvents.push({kind,phase:'cleanup',attachment:token,nodeId});if(nodes[kind]===node)nodes[kind]=null;};});
  return refCache.get(kind)!;
}
function Fixture(){
  const [config,setConfig]=useState(defaults),[generation,setGeneration]=useState(0);
  api.config=config;api.configure=patch=>flushSync(()=>setConfig(old=>({...old,...patch})));api.unmount=()=>api.configure({mounted:false});api.remount=()=>flushSync(()=>{setGeneration(old=>old+1);setConfig(old=>({...old,mounted:true}));});
  useEffect(()=>{let active=true;Promise.resolve(hasGameFont?document.fonts.load('18px "Minecraft"','Report 资源包'):[]).then(()=>document.fonts.ready).then(()=>{if(active)api.ready=true;});return()=>{active=false;};},[]);
  useEffect(()=>{const veto=(event:MouseEvent)=>{if(api.config.preventNative&&(event.target as Element|null)?.closest('#manifest-stage'))event.preventDefault();};document.addEventListener('click',veto);return()=>document.removeEventListener('click',veto);},[]);
  const base=createManifestValidationDemoProps(),identity={runKey:`fixture-run-${config.identityRevision}`,packId:`fixture-pack-${config.identityRevision}`,payload:{owner:'fixture',revision:config.identityRevision}},state={isWorking:config.isWorking,isDeleting:config.isDeleting,isDoneValidating:config.isDoneValidating};
  // Payload identity intentionally remains stable until the explicit identity
  // revision changes, rather than ordinary host font/revision props.
  const identityKey=`${config.identityRevision}`;
  const [identities]=useState(()=>new Map<string,typeof identity>());if(!identities.has(identityKey))identities.set(identityKey,identity);const stableIdentity=identities.get(identityKey)!;
  const entries=Array.from({length:config.entryCount},(_,index)=>{const sample=issueSamples[index%2]!;return{...sample,id:`fixture-issue-${index}`,index,content:config.longContent?sample.content.repeat(3):sample.content,layout:config.longContent?{issueHeight:142,headerHeight:29,bodyHeight:98}:sample.layout};});
  const summary={...base.content.summary,icon:config.showIcon?{src:hostIcon,sourceSize:[16,16] as const,alt:'Explicit host fixture icon'}:base.content.summary.icon,visibility:{size:config.showSize,refresh:config.showRefresh,delete:config.showDelete}};
  const action=(detail:ManifestValidationActionDetail)=>{api.events.push({kind:'action',target:detail.target,sourceControl:detail.sourceControl,runKey:detail.runKey,packId:detail.packId,issueId:detail.issue?.id,issueIndex:detail.issue?.index,collection:detail.issue?.collection,controlId:detail.control.id,currentTargetId:detail.event.currentTarget.id,stableTarget:detail.control===detail.event.currentTarget,accepted:config.acceptActions});return config.acceptActions?undefined:false;};
  const common={identity:stableIdentity,state,scale:config.scale,disabled:config.disabled,readOnly:config.readOnly,lowMemoryDevice:config.lowMemoryDevice,loadingFrame:config.loadingFrame,onAction:action};
  const nativeButton={onClick:(event:ReactMouseEvent<HTMLButtonElement>)=>{if(config.preventLeaf)event.preventDefault();}};
  const content={...base.content,...common,inputMode:config.inputMode,summary,entries,capacity:entries.length,hasErrorsOrWarnings:config.hasErrorsOrWarnings};
  const issue={...common,width:332,entry:entries[0]??{...issueSamples[0]!,id:'fixture-issue-0',index:0},hasErrorsOrWarnings:config.hasErrorsOrWarnings,issueLabel:'Issue',copyLabel:'Copy issue',copyButtonProps:{...nativeButton,id:'manifest-copy'},copyButtonRef:tracked<HTMLButtonElement>('copy')};
  let part;
  switch(config.part){
    case'screen':part=<ManifestValidationScreen {...base} id="manifest-screen" ref={tracked<HTMLDivElement>('screen')} open={config.open} hidden={config.hidden} viewportSize={[config.viewportWidth,config.viewportHeight]} scale={config.scale} disabled={config.disabled} readOnly={config.readOnly} closeVisible={config.closeVisible} content={content} panelRef={tracked<HTMLDivElement>('panel')} contentRef={tracked<HTMLDivElement>('screen-content')} closeButtonRef={tracked<HTMLButtonElement>('close')} closeButtonProps={{id:'manifest-close',...nativeButton}} viewNavigationKeys={config.viewNavigationKeys}
      onKeyDown={event=>{if(config.preventKey)event.preventDefault();}}
      onCloseRequest={detail=>{api.events.push({kind:'close',target:detail.target,origin:detail.origin,controlId:detail.control.id,currentTargetId:detail.event.currentTarget.id,stableTarget:detail.control===detail.event.currentTarget,accepted:config.acceptClose});if(config.acceptClose)setConfig(old=>({...old,open:false}));return config.acceptClose?undefined:false;}}
      onViewRequest={detail=>{api.events.push({kind:'view',target:detail.target,origin:detail.origin,controlId:detail.control.id,currentTargetId:detail.event.currentTarget.id,stableTarget:detail.control===detail.event.currentTarget,accepted:true});}}/>;break;
    case'content':part=<ManifestValidationContent {...content} id="manifest-content" hidden={config.hidden} ref={tracked<HTMLDivElement>('content')} size={[354,219]} viewportRef={tracked<HTMLDivElement>('viewport')}/>;break;
    case'summary':part=<ManifestPackSummary {...common} id="manifest-summary" hidden={config.hidden} ref={tracked<HTMLDivElement>('summary')} width={332} data={summary} refreshButtonProps={{...nativeButton,id:'manifest-refresh'}} deleteButtonProps={{...nativeButton,id:'manifest-delete'}} refreshButtonRef={tracked<HTMLButtonElement>('refresh')} deleteButtonRef={tracked<HTMLButtonElement>('delete')}/>;break;
    case'issue':part=<ManifestValidationIssue {...issue} id="manifest-issue" hidden={config.hidden} ref={tracked<HTMLDivElement>('issue')}/>;break;
    case'issues':part=<ManifestValidationIssues {...common} id="manifest-issues" hidden={config.hidden} ref={tracked<HTMLDivElement>('issues')} width={332} entries={entries} capacity={entries.length} hasErrorsOrWarnings={config.hasErrorsOrWarnings} issueLabel="Issue" copyLabel="Copy issue"/>;break;
    case'button':{const shared={identity:stableIdentity,state,scale:config.scale,loadingFrame:config.loadingFrame,disabled:config.disabled,readOnly:config.readOnly,onAction:action,...nativeButton,id:'manifest-button',hidden:config.hidden,ref:tracked<HTMLButtonElement>('button'),label:`Host ${config.variant}`};part=config.variant==='copy'?<ManifestValidationButton {...shared} variant="copy" issue={{id:'fixture-issue-0',index:0,collection:'pack_errors'}}/>:config.variant==='delete-text'||config.variant==='refresh-text'?<ManifestValidationButton {...shared} variant={config.variant} width={80}/>:<ManifestValidationButton {...shared} variant={config.variant}/>;break;}
  }
  return <main><div id="manifest-stage" className="manifest-fixture-stage" data-revision={config.revision} onClick={event=>{if(config.preventAncestor)event.preventDefault();}}><div key={generation}>{config.mounted&&part}</div></div><output id="manifest-status" aria-live="polite">Local host intents only; no scan, deletion or clipboard service.</output></main>;
}
createRoot(document.getElementById('manifest-validation-fixture-root')!).render(location.search.includes('strict')?<StrictMode><Fixture/></StrictMode>:<Fixture/>);
