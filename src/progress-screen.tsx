import {forwardRef, useRef, useState} from 'react';
import type {CSSProperties, KeyboardEvent, Ref, SyntheticEvent} from 'react';
import {Image} from './image';
import {progressAssets} from './progress-assets';
import {PROGRESS_WEB_LIMITS, snapshotProgressScreenModel, snapshotProgressWholeImage, validateProgressRef} from './progress-data';
import {progressBox} from './progress-layout';
import {projectProgressElementProps} from './progress-react-props';
import {resolveProgressRoute} from './progress-route';
import {planProgressActions} from './progress-actions';
import type {ProgressRawRequest} from './progress-actions';
import {ProgressBackground, ProgressAuxiliary, ProgressBasePanels, planProgressBackground, planProgressAuxiliary, planProgressBasePanels} from './progress-panels';
import type {ProgressBackgroundProps, ProgressBrandingDescriptor} from './progress-panels';
import {ProgressCloudPanel, ProgressCloudConflictFactory, planProgressCloudPanel, planProgressCloudConflictFactory} from './progress-cloud';
import type {ProgressCloudKind} from './progress-cloud';
import {ProgressResourceDialog, planProgressResourceDialog} from './progress-packs';
import type {ProgressResourceRawSelection} from './progress-packs';
import type {ProgressIndicatorsProps} from './progress-indicators';
import type {ProgressActionTarget, ProgressScreenModel, ProgressScreenAnimation} from './progress-types';
import {classicModalOwnsInput, classicModalTab, deferClassicRequest, scheduleClassicTask, useClassicLayoutEffect, useClassicModal, useClassicNodeRef} from './classic-screen-lifecycle';

export type ProgressModalLayer = 'resource'|'conflict';
/** Logical host requests; no physical gamepad mapping is inferred. */
export interface ProgressControllerHandle {request(command:'button.menu_cancel'|'activate-focused-web'):boolean}
export interface ProgressScreenProps extends ProgressScreenModel {
  readonly imageClipPolicy:ProgressIndicatorsProps['imageClipPolicy'];
  readonly gradientPolicy:ProgressBackgroundProps['gradientPolicy'];
  readonly branding:ProgressBrandingDescriptor|null;
  /** Bottom to top. Required when both independently declared factories exist. */
  readonly modalOrder?:readonly ProgressModalLayer[];
  /** Host drives time and screen events. Null is settled; no timer or automatic navigation. */
  readonly transition:null|{readonly animation:ProgressScreenAnimation;readonly elapsedSeconds:number};
  readonly controllerRef?:Ref<ProgressControllerHandle>;
}
type Event = SyntheticEvent<HTMLElement>;
type Layer = ProgressModalLayer|'base';
type Action = {target:ProgressActionTarget;sourceControl:string;instanceId?:string;layer:Layer};
const noop=()=>{};
const cloudKinds:Partial<Record<ReturnType<typeof resolveProgressRoute>['content'],ProgressCloudKind>>={
  cloud_upload_screen_content:'upload',edu_cloud_fetch_screen_content:'fetch',cloud_download_screen_content:'download',edu_server_fetch_screen_content:'server-fetch',
};
function data(value:unknown,label:string):Record<string,unknown>{
  if(!value||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new TypeError(`${label} requires a plain data record`);
  const out:Record<string,unknown>=Object.create(null);
  const keys=Reflect.ownKeys(value);
  if(keys.length>PROGRESS_WEB_LIMITS.recordFields)throw new RangeError(`${label} exceeds the finite data-field budget`);
  for(const key of keys){
    const field=Object.getOwnPropertyDescriptor(value,key);
    if(typeof key!=='string'||['__proto__','constructor','prototype'].includes(key)||!field?.enumerable||!('value'in field))throw new TypeError(`${label} requires own enumerable data fields`);
    out[key]=field.value;
  }
  return out;
}
function inputs(p:ProgressScreenProps,ref?:Ref<HTMLElement>){
  const fields=data(p,'ProgressScreen');
  if(fields.children!==undefined||fields.dangerouslySetInnerHTML!==undefined)throw new TypeError('ProgressScreen owns its source composition');
  const snapshot=snapshotProgressScreenModel(p),route=resolveProgressRoute(snapshot),native=snapshot.nativeProps;
  validateProgressRef(ref);validateProgressRef(fields.controllerRef);
  if(native?.role!==undefined&&native.role!=='dialog')throw new TypeError('ProgressScreen owns its dialog role');
  if(native?.['aria-modal']!==undefined&&native['aria-modal']!==true&&native['aria-modal']!=='true')throw new TypeError('ProgressScreen owns aria-modal');
  if(native?.tabIndex!==undefined&&native.tabIndex!==-1)throw new TypeError('ProgressScreen owns tabIndex -1');
  if(native?.style&&Object.keys(native.style).some(k=>['opacity','visibility','transform','inset','left','right','top','bottom'].includes(k)))throw new TypeError('ProgressScreen owns transition and geometry; position its parent');
  if(!['visible-fraction-web','left-removal-web'].includes(p.imageClipPolicy))throw new TypeError('ProgressScreen requires an explicit image clip policy');
  if(!['native-unrecovered','css-linear-top-bottom-web'].includes(p.gradientPolicy))throw new TypeError('ProgressScreen requires a background gradient policy');
  let branding:ProgressBrandingDescriptor|null=null;
  if(p.branding!==null){
    const b=data(p.branding,'ProgressScreen branding'),box=b.box;
    if(!Array.isArray(box)||Object.getPrototypeOf(box)!==Array.prototype||box.length!==4||Reflect.ownKeys(box).length!==5)throw new TypeError('ProgressScreen branding requires four data axes');
    const axes:number[]=[];
    for(let i=0;i<4;i++){const axis=Object.getOwnPropertyDescriptor(box,String(i));if(!axis||!('value'in axis)||typeof axis.value!=='number')throw new TypeError('ProgressScreen branding requires numeric data axes');axes.push(axis.value);}
    if(!['title_panel_win10','title_panel_osx','title_panel_edu_desktop','title_panel_edu_mobile','title_panel_pocket'].includes(b.sourceVariant as string)||typeof b.provenance!=='string'||!b.provenance.trim()||b.provenance.length>4096)throw new TypeError('ProgressScreen branding requires explicit source variant and provenance');
    branding=Object.freeze({image:snapshotProgressWholeImage(b.image as ProgressBrandingDescriptor['image']),box:progressBox(axes,'ProgressScreen branding'),sourceVariant:b.sourceVariant as ProgressBrandingDescriptor['sourceVariant'],provenance:b.provenance});
  }
  let alpha=1,transition:ProgressScreenProps['transition']=null;
  if(p.transition!==null){
    const t=data(p.transition,'ProgressScreen transition');
    if(!route.animations.includes(t.animation as ProgressScreenAnimation))throw new TypeError('ProgressScreen animation is not declared by this source route');
    if(typeof t.elapsedSeconds!=='number'||!Number.isFinite(t.elapsedSeconds)||t.elapsedSeconds<0||t.elapsedSeconds>3600)throw new RangeError('ProgressScreen requires finite nonnegative elapsedSeconds');
    const animation=t.animation as ProgressScreenAnimation,duration=animation.includes('_push_')?snapshot.profile.transitions.pushSeconds:snapshot.profile.transitions.popSeconds;
    const u=duration===0?1:Math.min(1,t.elapsedSeconds/duration),exit=(1-u)**3;
    alpha=animation.startsWith('screen_exit_')?exit:1-exit;
    transition=Object.freeze({animation,elapsedSeconds:t.elapsedSeconds});
  }
  const active:ProgressModalLayer[]=[];
  if(route.resourceFactoryDeclared&&snapshot.resourcePopup)active.push('resource');
  if(route.conflictFactoryDeclared&&snapshot.conflictPopup)active.push('conflict');
  let order:readonly ProgressModalLayer[]=Object.freeze(active);
  if(p.modalOrder!==undefined){
    const raw=p.modalOrder;
    if(!Array.isArray(raw)||Object.getPrototypeOf(raw)!==Array.prototype||Reflect.ownKeys(raw).length!==raw.length+1||raw.length!==active.length)throw new TypeError('ProgressScreen modalOrder must name exactly the active factory layers');
    const entries:ProgressModalLayer[]=[];
    for(let i=0;i<raw.length;i++){
      const item=Object.getOwnPropertyDescriptor(raw,String(i));
      if(!item||!('value'in item)||!active.includes(item.value)||entries.includes(item.value))throw new TypeError('ProgressScreen modalOrder requires unique active data entries');
      entries.push(item.value);
    }
    order=Object.freeze(entries);
  }else if(active.length===2)throw new TypeError('ProgressScreen requires explicit modalOrder for simultaneous resource and conflict factories');
  return Object.freeze({snapshot,route,order,alpha,transition,imageClipPolicy:p.imageClipPolicy,gradientPolicy:p.gradientPolicy,branding,controllerRef:p.controllerRef});
}
type Inputs=ReturnType<typeof inputs>;
function plan(input:Inputs,mobileOnce:boolean){
  const {snapshot:s,route}=input,common={snapshot:s,onRequest:noop,imageClipPolicy:input.imageClipPolicy};
  // Every active subtree completes pure preflight before React enters any glyph leaf.
  const background=planProgressBackground({snapshot:s,gradientPolicy:input.gradientPolicy});
  const auxiliary=planProgressAuxiliary({snapshot:s,branding:input.branding,mobileDataVisibleAtInstanceCreation:mobileOnce});
  const base=planProgressBasePanels(common),kind=cloudKinds[route.content];
  const cloud=kind?planProgressCloudPanel({...common,kind}):null;
  const resource=input.order.includes('resource')&&s.resourcePopup?planProgressResourceDialog({runKey:s.runKey,profile:s.profile,packs:s.packs,popup:s.resourcePopup,capabilities:s.capabilities,disabled:s.disabled,readOnly:s.readOnly,renderText:s.renderText,onRawRequest:noop,onRawSelection:noop}):null;
  const conflict=input.order.includes('conflict')?planProgressCloudConflictFactory({snapshot:s,onRequest:noop}):null;
  const actions:Action[]=[];
  const add=(button:{target:ProgressActionTarget;sourceControl:string;instanceId?:string;visible:boolean;enabled:boolean},layer:Layer)=>{
    if(button.visible&&button.enabled)actions.push(Object.freeze({target:button.target,sourceControl:button.sourceControl,instanceId:button.instanceId,layer}));
  };
  if(base.actions)for(const button of planProgressActions(base.actions.props).buttons)add(button,'base');
  if(cloud){for(const button of cloud.selected.buttons)add(button,'base');if(cloud.selected.link?.visible)actions.push({target:'button.edu_cloud_hyperlink',sourceControl:cloud.selected.link.sourceControl,layer:'base'});}
  if(resource)for(const button of resource.buttons)actions.push({target:button.target,sourceControl:'progress.'+resource.props.popup.factoryId+'/'+button.id,instanceId:resource.props.popup.instanceId,layer:'resource'});
  if(conflict)for(const button of conflict.panel.buttons)add(button,'conflict');
  return Object.freeze({...input,background,auxiliary,base,cloud,resource,conflict,actions:Object.freeze(actions),top:input.order.at(-1)??'base' as Layer,nativeCertified:false});
}
/** Initial-instance CPU/SSR plan; no callbacks, refs, DOM, tasks or service work. */
export function planProgressScreen(p:ProgressScreenProps,ref?:Ref<HTMLElement>){const input=inputs(p,ref);return plan(input,input.snapshot.auxiliary.mobileDataVisibleAtInstanceCreation);}
type Plan=ReturnType<typeof plan>;
function layerKey(p:Plan,layer:Layer){return layer==='base'?'base':layer==='resource'?`resource:${p.resource!.props.popup.factoryId}:${p.resource!.props.popup.instanceId}`:`conflict:${p.conflict!.instanceId}`;}
function matching(a:Action,b:Pick<Action,'target'|'sourceControl'|'instanceId'>){return a.target===b.target&&a.sourceControl===b.sourceControl&&a.instanceId===b.instanceId;}
function Session({input,forwardedRef}:{input:Inputs;forwardedRef:Ref<HTMLElement>}){
  const [mobileOnce]=useState(input.snapshot.auxiliary.mobileDataVisibleAtInstanceCreation),p=plan(input,mobileOnce),s=p.snapshot;
  const [root,attach]=useClassicNodeRef(forwardedRef,s.rootRef),[,attachController]=useClassicNodeRef(input.controllerRef);
  const resource=useRef<HTMLDivElement|null>(null),conflict=useRef<HTMLDivElement|null>(null),conflictTarget=useRef<HTMLDivElement|null>(null);
  const modalBoundary=useRef<HTMLElement|null>(null),modalTarget=useRef<HTMLElement|null>(null),latest=useRef<Plan|null>(null);
  const generation=useRef(0),signature=useRef(''),events=useRef(new WeakSet<object>());
  const remembered=useRef<Partial<Record<Layer,{key:string;node:HTMLElement}>>>({}),focusBeforeSwitch=useRef<HTMLElement|null>(null),previousTop=useRef<string|null>(null);
  const visible=s.open&&!s.nativeProps?.hidden;
  const boundary=(layer:Layer)=>layer==='resource'?resource.current:layer==='conflict'?conflict.current:root.current;
  const target=(layer:Layer)=>layer==='resource'?resource.current?.querySelector<HTMLElement>('[data-progress-resource-factory]')??null:layer==='conflict'?conflictTarget.current:root.current;
  const available=(node:HTMLElement)=>node.isConnected&&!node.closest('[hidden],[inert]')&&!node.matches(':disabled')&&node.getClientRects().length>0&&node.ownerDocument.defaultView?.getComputedStyle(node).visibility!=='hidden';
  useClassicLayoutEffect(()=>{
    latest.current=p;
    const next=JSON.stringify([visible,s.disabled,s.readOnly,p.order.map(layer=>layerKey(p,layer))]);
    if(signature.current!==next){signature.current=next;generation.current++;}
    const key=layerKey(p,p.top),memory=remembered.current[p.top];
    focusBeforeSwitch.current=visible&&previousTop.current!==null&&previousTop.current!==key&&memory?.key===key?memory.node:null;
    previousTop.current=visible?key:null;
    for(const layer of ['resource','conflict'] as const)if(!p.order.includes(layer)||remembered.current[layer]?.key!==layerKey(p,layer))delete remembered.current[layer];
    modalBoundary.current=boundary(p.top);modalTarget.current=target(p.top);
  });
  // A single lease follows the top boundary while preserving the external opener.
  useClassicModal(modalBoundary,modalTarget,visible);
  useClassicLayoutEffect(()=>{const node=focusBeforeSwitch.current;focusBeforeSwitch.current=null;if(node&&available(node)&&modalTarget.current?.contains(node))node.focus({preventScroll:true});});
  useClassicLayoutEffect(()=>()=>{latest.current=null;generation.current++;},[]);
  const live=()=>{const now=latest.current;return now?.snapshot.open&&!now.snapshot.nativeProps?.hidden&&!now.snapshot.disabled&&root.current?.isConnected&&classicModalOwnsInput(modalBoundary.current)?now:null;};
  const active=(control:HTMLElement)=>{const now=live(),b=now&&boundary(now.top);return !!now&&!!b&&b.contains(control)&&available(control)&&!b.closest('[inert]');};
  const escapeSpec=(now:Plan):Action=>now.top==='resource'?{target:'modal.escape',sourceControl:'progress.'+now.resource!.props.popup.factoryId,instanceId:now.resource!.props.popup.instanceId,layer:'resource'}:now.top==='conflict'?{target:'button.close_edu_cloud_conflict_resolution_popup',sourceControl:'edu_common.edu_cloud_conflict_resolution_popup',instanceId:now.conflict!.instanceId,layer:'conflict'}:{target:'button.menu_exit',sourceControl:'progress.'+now.route.route,layer:'base'};
  const queue=(raw:ProgressRawRequest,exit=false,focusRequired=false):boolean=>{
    const captured=live();if(!captured||!active(raw.control)||!exit&&captured.snapshot.readOnly)return false;
    const action=exit?escapeSpec(captured):captured.actions.find(a=>matching(a,raw)&&a.layer===captured.top);
    if(!action||!matching(action,raw)||raw.valid&&!raw.valid())return false;
    if(!exit&&(raw.control.dataset.sourceControl!==raw.sourceControl||raw.control.dataset.sourceTarget!==raw.target||raw.control.dataset.progressInstance!==raw.instanceId))return false;
    const event=raw.event;
    if(event&&(event.defaultPrevented||event.nativeEvent.defaultPrevented||events.current.has(event.nativeEvent)))return false;
    if(event)events.current.add(event.nativeEvent);
    const epoch=generation.current,key=layerKey(captured,captured.top),control=raw.control;
    const valid=()=>{
      const now=live();return !!now&&epoch===generation.current&&key===layerKey(now,now.top)&&active(control)&&(!focusRequired||control.ownerDocument.activeElement===control)
        &&(exit||!now.snapshot.readOnly)&&(!raw.valid||raw.valid())&&(exit?matching(escapeSpec(now),raw):now.actions.some(a=>matching(a,raw)&&a.layer===now.top&&control.dataset.sourceControl===raw.sourceControl&&control.dataset.sourceTarget===raw.target&&control.dataset.progressInstance===raw.instanceId));
    };
    const apply=(snapshot?:Event)=>{if(!valid())return;const now=live()!;now.snapshot.onAction(Object.freeze({runKey:now.snapshot.runKey,target:raw.target,sourceControl:raw.sourceControl,origin:raw.origin,control,...raw.instanceId===undefined?{}:{instanceId:raw.instanceId},...snapshot?{event:snapshot}:{}}));};
    if(event)deferClassicRequest(event,control,apply,valid);else scheduleClassicTask(control,()=>apply());
    return true;
  };
  const request=(raw:ProgressRawRequest)=>queue(raw,raw.target==='modal.escape'||raw.target==='button.close_edu_cloud_conflict_resolution_popup');
  const selection=(raw:ProgressResourceRawSelection):boolean=>{
    const captured=live();if(!captured?.resource||captured.top!=='resource'||captured.snapshot.readOnly||!active(raw.control)||raw.collection!=='optional_resourcepacks'||!raw.valid())return false;
    const initial=captured.snapshot.packs.optional.entries[raw.index];
    if(!initial||initial.id!==raw.id||initial.payload!==raw.payload||raw.instanceId!==captured.resource.props.popup.instanceId||raw.runKey!==captured.snapshot.runKey||raw.selected===initial.selected)return false;
    if(raw.event.defaultPrevented||raw.event.nativeEvent.defaultPrevented||events.current.has(raw.event.nativeEvent))return false;
    events.current.add(raw.event.nativeEvent);
    const epoch=generation.current,dimensions=captured.snapshot.packs.optional.dimensions;
    const valid=()=>{const now=live(),entry=now?.snapshot.packs.optional.entries[raw.index];return !!now?.resource&&now.top==='resource'&&!now.snapshot.readOnly&&epoch===generation.current&&active(raw.control)&&raw.valid()&&now.resource.props.popup.instanceId===raw.instanceId&&now.resource.props.popup.factoryId==='test'&&entry?.id===initial.id&&entry.payload===initial.payload&&entry.selected===initial.selected&&now.snapshot.packs.optional.dimensions.every((v,i)=>v===dimensions[i]);};
    deferClassicRequest(raw.event,raw.control,()=>{if(valid())live()!.snapshot.onPackSelectionChange(Object.freeze({runKey:raw.runKey,collection:raw.collection,id:raw.id,index:raw.index,selected:raw.selected,payload:raw.payload,instanceId:raw.instanceId}));},valid);
    return true;
  };
  const escape=(event?:Event)=>{const now=live(),control=now&&target(now.top);return !!now&&!!control&&queue({...escapeSpec(now),control,event,origin:event?'keyboard':'host-controller'},true);};
  // These helpers read committed refs; the session's imperative handle stays
  // stable across controlled data/callback updates and ref consumers' renders.
  const controller=useRef<ProgressControllerHandle|null>(null);
  if(!controller.current)controller.current={request(command){
    if(command!=='button.menu_cancel'&&command!=='activate-focused-web')throw new TypeError('Unknown Progress logical controller command');
    if(command==='button.menu_cancel')return escape();
    const now=live(),node=root.current?.ownerDocument.activeElement;
    if(!now||!node||!active(node as HTMLElement))return false;
    const action=now.actions.find(a=>a.layer===now.top&&node.getAttribute('data-source-control')===a.sourceControl&&node.getAttribute('data-source-target')===a.target&&node.getAttribute('data-progress-instance')===(a.instanceId??null));
    return !!action&&queue({...action,control:node as HTMLElement,origin:'host-controller'},false,true);
  }};
  useClassicLayoutEffect(()=>{attachController(controller.current);return()=>{attachController(null);};},[attachController]);
  const keydown=(event:KeyboardEvent<HTMLElement>)=>{
    latest.current?.snapshot.nativeProps?.onKeyDown?.(event);
    if(event.defaultPrevented||event.nativeEvent.defaultPrevented||event.nativeEvent.isComposing||event.nativeEvent.keyCode===229)return;
    if(event.key==='Tab')classicModalTab(event,modalBoundary.current,modalTarget.current);
    else if(event.key==='Escape'&&!event.repeat&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey)escape(event);
  };
  const native=s.nativeProps??{},scale=s.profile.scale,[w,h]=s.profile.availableSize;
  const baseCommon={snapshot:s,onRequest:request,imageClipPolicy:p.imageClipPolicy};
  return <section {...native} ref={attach} role="dialog" aria-modal="true" aria-label={native['aria-label']??s.bindings.titleText} tabIndex={-1} hidden={!visible} aria-disabled={s.disabled||undefined}
    className={`mc-progress-screen ${native.className??''}`} data-source-route={s.route} data-progress-content={p.route.content} data-native-certified="false" data-force-render-below={s.bindings.forceRenderBelow} data-progress-top={p.top}
    data-screen-animation={p.transition?.animation} style={{...native.style,width:w*scale,height:h*scale,opacity:p.alpha} as CSSProperties} onKeyDown={keydown}
    onFocusCapture={event=>{native.onFocusCapture?.(event);const now=latest.current,node=event.target as HTMLElement;if(now&&boundary(now.top)?.contains(node))remembered.current[now.top]={key:layerKey(now,now.top),node};}}>
    <div className="mc-progress-screen__base">
      <ProgressBackground snapshot={s} gradientPolicy={p.gradientPolicy}/>
      <ProgressBasePanels {...baseCommon}/>
      {p.cloud&&<div className="mc-progress-screen__center" style={{left:(w-p.cloud.selected.size[0])/2*scale,top:(h-p.cloud.selected.size[1])/2*scale}}><ProgressCloudPanel {...baseCommon} kind={p.cloud.kind}/></div>}
      <ProgressAuxiliary snapshot={s} branding={p.branding} mobileDataVisibleAtInstanceCreation={mobileOnce}/>
    </div>
    {p.order.map((layer,index)=><div key={layer} ref={layer==='resource'?resource:conflict} className="mc-progress-screen__modal" data-progress-modal-layer={layer} style={{zIndex:100+index}}>
      {layer==='resource'&&p.resource?<ProgressResourceDialog runKey={s.runKey} profile={s.profile} packs={s.packs} popup={p.resource.props.popup} capabilities={s.capabilities} disabled={s.disabled} readOnly={s.readOnly} renderText={s.renderText} onRawRequest={request} onRawSelection={selection}/>:p.conflict?<>
        <Image className="mc-progress-screen__conflict-background" src={progressAssets['textures/ui/screen_background'].url} sourceSize={[1,1]} size={[w,h]} scale={scale} alt="" style={{opacity:.75}}/>
        <div ref={conflictTarget} className="mc-progress-screen__center" role="dialog" aria-modal="true" aria-label={s.profile.labels['popup.title.eduCloudConflictResolution']} tabIndex={-1} style={{left:(w-p.conflict.panel.size[0])/2*scale,top:(h-p.conflict.panel.size[1])/2*scale,width:p.conflict.panel.size[0]*scale,height:p.conflict.panel.size[1]*scale}}><ProgressCloudConflictFactory snapshot={s} onRequest={request}/></div>
      </>:null}
    </div>)}
  </section>;
}
/** Source composition with explicit host measurements, materials and Web policies. */
export const ProgressScreen=forwardRef<HTMLElement,ProgressScreenProps>(function ProgressScreen(props,ref){
  const input=inputs(projectProgressElementProps(props),ref),s=input.snapshot;
  return <Session key={JSON.stringify([s.runKey,s.route,input.route.content,s.injectedContent?.provenance??null])} input={input} forwardedRef={ref}/>;
});
