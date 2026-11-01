import {forwardRef,useRef} from 'react';
import type {KeyboardEvent,Ref} from 'react';
import {Image} from './image';
import {projectProgressElementProps} from './progress-react-props';
import {progressAssets} from './progress-assets';
import {snapshotProgressScreenModel,snapshotProgressResourcePopup,validateProgressRef} from './progress-data';
import {ProgressPackGrids as CoreGrids,ProgressResourceDialog as CoreResource,planProgressPackGrids,planProgressResourceDialog,PROGRESS_RESOURCE_ESCAPE_TARGET} from './progress-packs';
import type {ProgressPackGridsProps as CoreGridProps,ProgressResourceRawSelection} from './progress-packs';
import {ProgressCloudPanel as CoreCloud,ProgressCloudConflictFactory as CoreConflict,planProgressCloudPanel,planProgressCloudConflictFactory} from './progress-cloud';
import type {ProgressCloudPanelProps as CoreCloudProps} from './progress-cloud';
import type {ProgressRawRequest} from './progress-actions';
import {classicModalTab,deferClassicEvent,deferClassicRequest,useClassicLayoutEffect,useClassicModal,useClassicNodeRef} from './classic-screen-lifecycle';
import type {ProgressActionDetail,ProgressActionTarget,ProgressPackSelectionDetail,ProgressPackState,ProgressResourcePopup,ProgressScreenModel,ProgressScreenSnapshot} from './progress-types';

/** Standalone controlled grids. Requests run after native document bubbling;
 * the caller must supply a new packs value to accept a selection. */
export interface ProgressPackGridsProps extends Omit<CoreGridProps,'onRawSelection'>{
 readonly open?:boolean;readonly hidden?:boolean;readonly className?:string;
 readonly onSelectionChange:(detail:ProgressPackSelectionDetail)=>void|false;
}
/** An independently instantiated source factory; snapshot callbacks own actions
 * and controlled selections. popup is independent of snapshot.resourcePopup.
 * Standalone snapshot.nativeProps may provide id, events and descriptive/state
 * ARIA. role/tabIndex/aria-modal/aria-label/aria-labelledby belong to source
 * content and are rejected on the generic outer node (also for cloud parts). */
export interface ProgressResourceDialogProps{readonly snapshot:ProgressScreenModel;readonly popup:ProgressResourcePopup}
/** Reusable source content panel. It does not register a root menu_cancel map. */
export interface ProgressCloudPanelProps extends Omit<CoreCloudProps,'snapshot'|'onRequest'>{readonly snapshot:ProgressScreenModel}
export interface ProgressCloudConflictDialogProps{readonly snapshot:ProgressScreenModel}

interface Action{readonly target:ProgressActionTarget;readonly sourceControl:string;readonly instanceId?:string;readonly exit?:boolean}
interface SelectionOwner{readonly packs:ProgressPackState;readonly instanceId:string;readonly factoryId?:string}
interface OwnerState{
 readonly runKey:string;readonly key:string;readonly epoch:number;readonly visible:boolean;readonly disabled:boolean;readonly readOnly:boolean;
 readonly boundary:HTMLElement|null;readonly target:HTMLElement|null;readonly actions:readonly Action[];
 readonly onAction?:(detail:ProgressActionDetail)=>void|false;readonly onSelection?:(detail:ProgressPackSelectionDetail)=>void|false;
 readonly selection?:SelectionOwner;
}
const noop=()=>{};
function record(value:unknown,label:string):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new TypeError(label+' requires plain data props');
 const keys=Reflect.ownKeys(value);if(keys.length>32)throw new RangeError(label+' exceeds finite prop budget');const out:Record<string,unknown>=Object.create(null);
 for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||['__proto__','constructor','prototype'].includes(key)||!d?.enumerable||!('value'in d))throw new TypeError(label+' requires own enumerable data props');out[key]=d.value;}
 if(out.children!==undefined||out.dangerouslySetInnerHTML!==undefined)throw new TypeError(label+' owns its source composition');
 if(out.onRawRequest!==undefined||out.onRawSelection!==undefined||out.onRequest!==undefined)throw new TypeError(label+' owns deferred semantic requests');return out;
}
function available(node:HTMLElement){const view=node.ownerDocument.defaultView;return !!view&&node.isConnected&&!node.closest('[hidden],[inert]')&&!node.matches(':disabled')&&node.getClientRects().length>0&&view.getComputedStyle(node).visibility!=='hidden';}
function match(a:Action,b:Pick<Action,'target'|'sourceControl'|'instanceId'>){return a.target===b.target&&a.sourceControl===b.sourceControl&&a.instanceId===b.instanceId;}
/** Private testable owner, intentionally not exported from the package barrel.
 * It never applies state, services, navigation, or synchronous user callbacks. */
export function createProgressPublicRequestOwner(read:()=>OwnerState|null){
 const events=new WeakSet<object>();
 const live=()=>{const s=read(),b=s?.boundary;return s&&s.visible&&!s.disabled&&b?.isConnected&&!b.closest('[hidden],[inert]')?s:null;};
 const owns=(s:OwnerState,control:HTMLElement)=>!!s.boundary?.contains(control)&&available(control)&&(!s.target||s.target.contains(control));
 const action=(raw:ProgressRawRequest):boolean=>{
  const initial=live(),spec=initial?.actions.find(a=>match(a,raw));if(!initial||!spec||!initial.onAction||!owns(initial,raw.control)||initial.readOnly&&!spec.exit||raw.valid&&!raw.valid())return false;
  const control=raw.control,event=raw.event;if(!event)return false;
  if(event.defaultPrevented||event.nativeEvent.defaultPrevented||events.has(event.nativeEvent))return false;
  if(!spec.exit&&(control.dataset.sourceControl!==raw.sourceControl||control.dataset.sourceTarget!==raw.target||control.dataset.progressInstance!==raw.instanceId))return false;
  const focus=control.ownerDocument.activeElement;events.add(event.nativeEvent);
  const valid=()=>{const now=live(),current=now?.actions.find(a=>match(a,raw));return !!now&&!!current&&now.runKey===initial.runKey&&now.key===initial.key&&now.epoch===initial.epoch&&(!now.readOnly||!!current.exit)&&owns(now,control)&&control.ownerDocument.activeElement===focus&&(!raw.valid||raw.valid())&&(current.exit||control.dataset.sourceControl===raw.sourceControl&&control.dataset.sourceTarget===raw.target&&control.dataset.progressInstance===raw.instanceId);};
  deferClassicRequest(event,control,snapshot=>{if(!valid())return;const now=live()!;now.onAction?.(Object.freeze({runKey:now.runKey,target:raw.target,sourceControl:raw.sourceControl,origin:raw.origin,control,event:snapshot,...raw.instanceId===undefined?{}:{instanceId:raw.instanceId}}));},valid);return true;
 };
 const selection=(raw:ProgressResourceRawSelection):boolean=>{
  const initial=live(),owner=initial?.selection,event=raw.event,entry=owner?.packs.optional.entries[raw.index];
  if(!initial||!owner||!entry||!initial.onSelection||initial.readOnly||!owns(initial,raw.control)||raw.collection!=='optional_resourcepacks'||raw.runKey!==initial.runKey||raw.instanceId!==owner.instanceId||entry.id!==raw.id||entry.payload!==raw.payload||entry.selected===raw.selected||!raw.valid()||owner.factoryId!==undefined&&owner.factoryId!=='test')return false;
  if(event.defaultPrevented||event.nativeEvent.defaultPrevented||events.has(event.nativeEvent))return false;
  const dimensions=owner.packs.optional.dimensions,focus=raw.control.ownerDocument.activeElement;events.add(event.nativeEvent);
  const valid=()=>{const now=live(),next=now?.selection,current=next?.packs.optional.entries[raw.index];return !!now&&!!next&&!!current&&now.runKey===initial.runKey&&now.key===initial.key&&now.epoch===initial.epoch&&!now.readOnly&&owns(now,raw.control)&&raw.control.ownerDocument.activeElement===focus&&raw.valid()&&next.instanceId===owner.instanceId&&next.factoryId===owner.factoryId&&current.id===entry.id&&current.payload===entry.payload&&current.selected===entry.selected&&next.packs.optional.dimensions.every((v,i)=>v===dimensions[i]);};
  deferClassicRequest(event,raw.control,()=>{if(valid())live()!.onSelection?.(Object.freeze({runKey:raw.runKey,collection:raw.collection,id:raw.id,index:raw.index,selected:raw.selected,payload:raw.payload,instanceId:raw.instanceId}));},valid);return true;
 };
 return Object.freeze({action,selection});
}
function useOwner(state:Omit<OwnerState,'epoch'|'boundary'|'target'>,boundary:{readonly current:HTMLElement|null},target:{readonly current:HTMLElement|null}){
 const latest=useRef<OwnerState|null>(null),epoch=useRef(0),signature=useRef(''),owner=useRef(createProgressPublicRequestOwner(()=>latest.current));
 useClassicLayoutEffect(()=>{const next=JSON.stringify([state.runKey,state.key,state.visible,state.disabled,state.readOnly]);if(next!==signature.current){signature.current=next;epoch.current++;}latest.current={...state,epoch:epoch.current,boundary:boundary.current,target:target.current};});
 useClassicLayoutEffect(()=>()=>{latest.current=null;epoch.current++;},[]);return owner.current;
}
function modelInput(input:unknown,label:string,ref?:Ref<HTMLDivElement>){const p=record(input,label);validateProgressRef(ref);const snapshot=snapshotProgressScreenModel(p.snapshot as ProgressScreenModel),native=snapshot.nativeProps;
 // These standalone outer nodes own geometry and event observation. Accessible
 // dialog/text semantics remain on the actual source content inside them.
 if(native&&['role','tabIndex','aria-modal','aria-label','aria-labelledby'].some(key=>Object.hasOwn(native,key)))throw new TypeError(label+' owns source accessibility semantics; outer native role, tabIndex, modal and label attributes are unsupported');
 if(native?.style&&Object.keys(native.style).some(k=>['visibility','inset','left','right','top','bottom'].includes(k)))throw new TypeError(label+' owns its visibility and geometry; position its parent');
 return {p,snapshot};
}
function nativeProps(s:ProgressScreenSnapshot){const{hidden:_,...native}=s.nativeProps??{};return native;}
function gridInput(input:ProgressPackGridsProps,ref?:Ref<HTMLDivElement>){const p=record(input,'ProgressPackGrids');validateProgressRef(ref);
 if(p.open!==undefined&&typeof p.open!=='boolean'||p.hidden!==undefined&&typeof p.hidden!=='boolean'||typeof p.onSelectionChange!=='function'||p.className!==undefined&&(typeof p.className!=='string'||p.className.length>4096))throw new TypeError('ProgressPackGrids requires boolean visibility, bounded className and selection callback');
 const native=input.nativeHandlers===undefined?undefined:record(input.nativeHandlers,'ProgressPackGrids nativeHandlers');if(native&&Object.entries(native).some(([key,value])=>!['onClick','onChange','onKeyDown'].includes(key)||value!==undefined&&typeof value!=='function'))throw new TypeError('ProgressPackGrids nativeHandlers supports only three callable source handlers');
 const core:CoreGridProps={runKey:input.runKey,instanceId:input.instanceId,packs:input.packs,profile:input.profile,disabled:input.disabled,readOnly:input.readOnly,renderText:input.renderText,size:input.size,nativeHandlers:native as CoreGridProps['nativeHandlers'],onRawSelection:noop};
 return {plan:planProgressPackGrids(core),visible:p.open!==false&&p.hidden!==true,className:(p.className??'') as string,onSelectionChange:p.onSelectionChange as ProgressPackGridsProps['onSelectionChange']};
}
function GridSession({input,forwardedRef}:{input:ReturnType<typeof gridInput>;forwardedRef:Ref<HTMLDivElement>}){
 const [root,attach]=useClassicNodeRef(forwardedRef),p=input.plan.props,s=p.profile.scale,owner=useOwner({runKey:p.runKey,key:p.instanceId,visible:input.visible,disabled:p.disabled,readOnly:p.readOnly,actions:[],selection:{packs:p.packs,instanceId:p.instanceId},onSelection:input.onSelectionChange},root,root);
 return <div ref={attach} className={'mc-progress-public-grids '+input.className} hidden={!input.visible} data-progress-part="pack-grids" style={{width:input.plan.width*s,height:input.plan.height*s}} onKeyDown={p.nativeHandlers?.onKeyDown}><CoreGrids {...p} onRawSelection={owner.selection}/></div>;
}
export const ProgressPackGrids=forwardRef<HTMLDivElement,ProgressPackGridsProps>(function ProgressPackGrids(p,ref){const input=gridInput(projectProgressElementProps(p),ref);return <GridSession key={JSON.stringify([input.plan.props.runKey,input.plan.props.instanceId])} input={input} forwardedRef={ref}/>;});

type ResourceInput=ReturnType<typeof resourceInput>;
function resourceInput(input:ProgressResourceDialogProps,ref?:Ref<HTMLDivElement>){const{p,snapshot:s}=modelInput(input,'ProgressResourceDialog',ref),popup=snapshotProgressResourcePopup(p.popup as ProgressResourcePopup);if(!popup)throw new TypeError('ProgressResourceDialog requires a factory popup');
 const props={runKey:s.runKey,packs:s.packs,profile:s.profile,popup,capabilities:s.capabilities,disabled:s.disabled,readOnly:s.readOnly,renderText:s.renderText,onRawRequest:noop,onRawSelection:noop};return {snapshot:s,plan:planProgressResourceDialog(props)};
}
function modalTab(event:KeyboardEvent<HTMLDivElement>,root:HTMLElement|null,target:HTMLElement|null,visible:()=>boolean){if(event.key==='Tab'&&root)deferClassicEvent(event,event.currentTarget,snapshot=>classicModalTab(snapshot,root,target),visible);}
function ResourceSession({input,forwardedRef}:{input:ResourceInput;forwardedRef:Ref<HTMLDivElement>}){
 const s=input.snapshot,p=input.plan.props,[root,attach]=useClassicNodeRef(forwardedRef,s.rootRef),[target,attachTarget]=useClassicNodeRef<HTMLDivElement>(),visible=s.open&&!s.nativeProps?.hidden;
 const actions:Action[]=[...input.plan.buttons.map(button=>({target:button.target,sourceControl:'progress.'+p.popup.factoryId+'/'+button.id,instanceId:p.popup.instanceId})),{target:PROGRESS_RESOURCE_ESCAPE_TARGET,sourceControl:'progress.'+p.popup.factoryId,instanceId:p.popup.instanceId,exit:true}];
 const owner=useOwner({runKey:s.runKey,key:JSON.stringify([p.popup.factoryId,p.popup.instanceId]),visible,disabled:s.disabled,readOnly:s.readOnly,actions,selection:{packs:s.packs,instanceId:p.popup.instanceId,factoryId:p.popup.factoryId},onAction:s.onAction,onSelection:s.onPackSelectionChange},root,target);
 useClassicModal(root,target,visible);
 const native=nativeProps(s),scale=s.profile.scale;
 return <div {...native} ref={attach} hidden={!visible} className={'mc-progress-public-modal mc-progress-public-resource '+(native.className??'')} data-progress-part="resource-dialog" style={{...native.style,width:s.profile.availableSize[0]*scale,height:s.profile.availableSize[1]*scale}} onKeyDown={event=>{s.nativeProps?.onKeyDown?.(event);if(!event.defaultPrevented&&!event.nativeEvent.defaultPrevented)modalTab(event,root.current,target.current,()=>visible&&!root.current?.closest('[hidden],[inert]'));}}><CoreResource {...p} ref={attachTarget} onRawRequest={owner.action} onRawSelection={owner.selection}/></div>;
}
export const ProgressResourceDialog=forwardRef<HTMLDivElement,ProgressResourceDialogProps>(function ProgressResourceDialog(p,ref){const input=resourceInput(projectProgressElementProps(p),ref);return <ResourceSession key={JSON.stringify([input.snapshot.runKey,input.plan.props.popup.factoryId,input.plan.props.popup.instanceId])} input={input} forwardedRef={ref}/>;});

function cloudInput(input:ProgressCloudPanelProps,ref?:Ref<HTMLDivElement>){const{p,snapshot:s}=modelInput(input,'ProgressCloudPanel',ref);if(!['visible-fraction-web','left-removal-web'].includes(p.imageClipPolicy as string))throw new TypeError('ProgressCloudPanel requires an explicit known image clip policy');const imageClipPolicy=p.imageClipPolicy as CoreCloudProps['imageClipPolicy'];return {snapshot:s,imageClipPolicy,plan:planProgressCloudPanel({snapshot:s,kind:p.kind as CoreCloudProps['kind'],imageClipPolicy,onRequest:noop})};}
function CloudSession({input,forwardedRef}:{input:ReturnType<typeof cloudInput>;forwardedRef:Ref<HTMLDivElement>}){
 const s=input.snapshot,p=input.plan,[root,attach]=useClassicNodeRef(forwardedRef,s.rootRef),visible=s.open&&!s.nativeProps?.hidden,branch=p.selected;
 const actions:Action[]=branch.buttons.filter(b=>b.visible&&b.enabled).map(b=>({target:b.target,sourceControl:b.sourceControl,instanceId:b.instanceId}));if(branch.link?.visible)actions.push({target:'button.edu_cloud_hyperlink',sourceControl:branch.link.sourceControl});
 const owner=useOwner({runKey:s.runKey,key:p.kind,visible,disabled:s.disabled,readOnly:s.readOnly,actions,onAction:s.onAction},root,root),native=nativeProps(s),scale=s.profile.scale;
 return <div {...native} ref={attach} hidden={!visible} className={'mc-progress-public-cloud '+(native.className??'')} data-progress-part="cloud-panel" style={{...native.style,width:branch.size[0]*scale,height:branch.size[1]*scale}}><CoreCloud snapshot={s} kind={p.kind} imageClipPolicy={input.imageClipPolicy} onRequest={owner.action}/></div>;
}
export const ProgressCloudPanel=forwardRef<HTMLDivElement,ProgressCloudPanelProps>(function ProgressCloudPanel(p,ref){const input=cloudInput(projectProgressElementProps(p),ref);return <CloudSession key={input.snapshot.runKey} input={input} forwardedRef={ref}/>;});

function conflictInput(input:ProgressCloudConflictDialogProps,ref?:Ref<HTMLDivElement>){const{snapshot:s}=modelInput(input,'ProgressCloudConflictDialog',ref);return {snapshot:s,plan:planProgressCloudConflictFactory({snapshot:s,onRequest:noop})};}
function ConflictSession({input,forwardedRef}:{input:ReturnType<typeof conflictInput>;forwardedRef:Ref<HTMLDivElement>}){
 const s=input.snapshot,p=input.plan!,[root,attach]=useClassicNodeRef(forwardedRef,s.rootRef),[target,attachTarget]=useClassicNodeRef<HTMLDivElement>(),visible=s.open&&!s.nativeProps?.hidden;
 const actions:Action[]=[...p.panel.buttons.filter(b=>b.visible&&b.enabled).map(b=>({target:b.target,sourceControl:b.sourceControl,instanceId:p.instanceId})),{target:p.escapeTarget,sourceControl:p.panel.sourceControl,instanceId:p.instanceId,exit:true}];
 const owner=useOwner({runKey:s.runKey,key:p.instanceId,visible,disabled:s.disabled,readOnly:s.readOnly,actions,onAction:s.onAction},root,target);useClassicModal(root,target,visible);
 const native=nativeProps(s),scale=s.profile.scale,title=s.profile.labels['popup.title.eduCloudConflictResolution'];
 return <div {...native} ref={attach} hidden={!visible} className={'mc-progress-public-modal mc-progress-public-conflict '+(native.className??'')} data-progress-part="cloud-conflict-dialog" style={{...native.style,width:s.profile.availableSize[0]*scale,height:s.profile.availableSize[1]*scale}} onKeyDown={event=>{
  s.nativeProps?.onKeyDown?.(event);if(event.defaultPrevented||event.nativeEvent.defaultPrevented)return;
  modalTab(event,root.current,target.current,()=>visible&&!root.current?.closest('[hidden],[inert]'));
  if(event.key!=='Escape'||event.nativeEvent.isComposing||event.nativeEvent.keyCode===229||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.repeat||!target.current)return;
  owner.action({target:p.escapeTarget,sourceControl:p.panel.sourceControl,instanceId:p.instanceId,control:target.current,event,origin:'keyboard'});
 }}><Image className="mc-progress-public-conflict__background" src={progressAssets['textures/ui/screen_background'].url} sourceSize={[1,1]} size={s.profile.availableSize} scale={scale} alt="" style={{opacity:.75}}/><div ref={attachTarget} className="mc-progress-public-conflict__target" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} data-progress-instance={p.instanceId} style={{width:p.panel.size[0]*scale,height:p.panel.size[1]*scale}}><CoreConflict snapshot={s} onRequest={owner.action}/></div></div>;
}
export const ProgressCloudConflictDialog=forwardRef<HTMLDivElement,ProgressCloudConflictDialogProps>(function ProgressCloudConflictDialog(p,ref){const input=conflictInput(projectProgressElementProps(p),ref);return input.plan?<ConflictSession key={JSON.stringify([input.snapshot.runKey,input.plan.instanceId])} input={input} forwardedRef={ref}/>:null;});
