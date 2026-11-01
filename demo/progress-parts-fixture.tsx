import {StrictMode,createRef} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {ProgressPackGrids,ProgressResourceDialog,ProgressCloudPanel,ProgressCloudConflictDialog} from '../src';
import type {ProgressScreenModel,ProgressPackSelectionDetail} from '../src';
import {makeProgressScreenProps} from '../tests/fixtures/progress-profile';
import '../src/progress-public-parts.css';

type Surface='grids'|'resource'|'cloud'|'conflict'|'stack';
type Intercept='veto'|'close'|'close-reopen'|'callback'|'instance'|'payload'|'focus'|'unmount';
let model:ProgressScreenModel=makeProgressScreenProps(),surface:Surface='grids',attached=true,accept=false,callbackId='first',nativeVeto=false,order:'resource-first'|'conflict-first'='resource-first';
const events:Record<string,unknown>[]=[],ref=createRef<HTMLDivElement>();
const mounted=createRoot(document.getElementById('root')!);
let interceptor:((event:Event)=>void)|null=null;
function selection(detail:ProgressPackSelectionDetail){events.push({kind:'selection',callbackId,...detail});if(accept){model={...model,packs:{...model.packs,optional:{...model.packs.optional,entries:model.packs.optional.entries.map((entry,i)=>i===detail.index?{...entry,selected:detail.selected}:entry)}}};render();}return false as const;}
function render(){
 const snapshot={...model,onAction:(detail:Parameters<ProgressScreenModel['onAction']>[0])=>{events.push({kind:'action',callbackId,target:detail.target,runKey:detail.runKey,instanceId:detail.instanceId,origin:detail.origin,sourceControl:detail.sourceControl,eventCurrentTargetMatches:detail.event?.currentTarget===detail.control});return false as const;},onPackSelectionChange:selection,nativeProps:{...model.nativeProps,onKeyDown:(event:React.KeyboardEvent<HTMLElement>)=>{if(nativeVeto)event.preventDefault();},onClick:(event:React.MouseEvent<HTMLElement>)=>{if(nativeVeto)event.preventDefault();}}};
 const resource=model.resourcePopup?<ProgressResourceDialog key="resource" snapshot={snapshot} popup={model.resourcePopup} ref={surface==='resource'?ref:undefined}/>:null;
 const conflict=model.conflictPopup?<ProgressCloudConflictDialog key="conflict" snapshot={snapshot} ref={surface==='conflict'?ref:undefined}/>:null;
 flushSync(()=>mounted.render(attached?<StrictMode>{surface==='grids'?<ProgressPackGrids ref={ref} runKey={model.runKey} instanceId={model.resourcePopup?.instanceId??'grid-1'} packs={model.packs} profile={model.profile} size={[430,100]} disabled={model.disabled} readOnly={model.readOnly} open={model.open} hidden={model.nativeProps?.hidden} onSelectionChange={selection} nativeHandlers={{onChange:event=>{if(nativeVeto)event.preventDefault();}}}/>:surface==='resource'?resource:surface==='conflict'?conflict:surface==='cloud'?<ProgressCloudPanel ref={ref} snapshot={snapshot} kind="upload" imageClipPolicy="visible-fraction-web"/>:<>{order==='resource-first'?resource:conflict}<div id="overlay">{order==='resource-first'?conflict:resource}</div></>}</StrictMode>:null));
}
function removeInterceptor(){if(interceptor){for(const type of ['click','keydown','change'])document.removeEventListener(type,interceptor);interceptor=null;}}
function base():ProgressScreenModel{const p=makeProgressScreenProps();return {...p,route:'world_saving_progress_screen',open:true,capabilities:{...p.capabilities,educationEdition:true,cloudSaveOn:true},bindings:{...p.bindings,ttsEnabled:false},cloud:{...p.cloud,uploadError:true},resourcePopup:{instanceId:'packs-1',factoryId:'test',description:'Packs',showRayTracingWarning:false,rayTracingWarning:'',joinEverythingText:'All first',joinRequiredText:'Required first'},conflictPopup:{instanceId:'conflict-1',description:'Choose',localName:'Local',localDate:'Local date',cloudName:'Cloud',cloudDate:'Cloud date'}};}
const harness={ready:true,events:()=>events,model:()=>model,ref:()=>ref.current,clear(){events.length=0;},
 reset(next:Surface='grids',patch:Partial<ProgressScreenModel>={},stackOrder:'resource-first'|'conflict-first'='resource-first'){
  removeInterceptor();surface=next;accept=false;callbackId='first';nativeVeto=false;order=stackOrder;attached=true;model={...model,open:false};render();document.getElementById('opener')!.focus({preventScroll:true});model={...base(),...patch};render();events.length=0;
 },
 patch(patch:Partial<ProgressScreenModel>){model={...model,...patch};render();},accept(value:boolean){accept=value;},nativeVeto(value:boolean){nativeVeto=value;render();},callback(id:string){callbackId=id;render();},unmount(){attached=false;render();},
 intercept(type:'click'|'keydown'|'change',effect:Intercept){removeInterceptor();interceptor=event=>{removeInterceptor();if(effect==='veto')event.preventDefault();else if(effect==='close')harness.patch({open:false});else if(effect==='close-reopen'){harness.patch({open:false});harness.patch({open:true});}else if(effect==='callback')harness.callback('latest');else if(effect==='instance')harness.patch({resourcePopup:model.resourcePopup?{...model.resourcePopup,instanceId:'packs-next'}:null,conflictPopup:model.conflictPopup?{...model.conflictPopup,instanceId:'conflict-next'}:null});else if(effect==='payload')harness.patch({packs:{...model.packs,optional:{...model.packs.optional,entries:model.packs.optional.entries.map(e=>({...e,payload:{replacement:true}}))}}});else if(effect==='focus')document.getElementById('after')!.focus();else harness.unmount();};document.addEventListener(type,interceptor,{once:true});},
};
declare global{interface Window{progressPartsHarness:typeof harness}}
window.progressPartsHarness=harness;model={...base(),open:false};render();
