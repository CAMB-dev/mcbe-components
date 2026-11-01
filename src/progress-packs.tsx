import { forwardRef, useRef, useState } from 'react';
import type { Ref, SyntheticEvent } from 'react';
import { Image } from './image';
import {projectProgressElementProps} from './progress-react-props';
import { ClassicSkin } from './classic-skin';
import { ScrollArea } from './scroll-area';
import { progressAssets } from './progress-assets';
import { snapshotProgressPacks, snapshotProgressProfile, snapshotProgressResourcePopup, validateProgressRef } from './progress-data';
import { useClassicLayoutEffect, useClassicNodeRef } from './classic-screen-lifecycle';
import { ProgressSourceButton, planProgressSourceButton, planProgressText } from './progress-actions';
import type { ProgressActionTarget, ProgressCapabilities, ProgressPackEntry, ProgressPackSelectionDetail, ProgressPackState, ProgressPresentationProfile, ProgressResourcePopup, ProgressSize, ProgressTextRenderer } from './progress-types';

export interface ProgressResourceRawRequest {readonly target:ProgressActionTarget;readonly sourceControl:string;readonly control:HTMLElement;readonly event?:SyntheticEvent<HTMLElement>;readonly origin:'control'|'keyboard'|'host-controller';readonly valid?:()=>boolean;readonly instanceId?:string}
/** Exact resource factory mapping; distinct from common modal_input_panel's default. */
export const PROGRESS_RESOURCE_ESCAPE_TARGET = 'modal.escape' as const;
export interface ProgressResourceRawSelection extends ProgressPackSelectionDetail {readonly control:HTMLInputElement;readonly event:SyntheticEvent<HTMLInputElement>;readonly valid:()=>boolean}
interface Shared {
  readonly runKey:string;readonly instanceId:string;readonly packs:ProgressPackState;readonly profile:ProgressPresentationProfile;
  readonly disabled:boolean;readonly readOnly:boolean;readonly renderText?:ProgressTextRenderer;
  readonly onRawSelection:(request:ProgressResourceRawSelection)=>void|boolean;
  readonly nativeHandlers?:{readonly onClick?:(event:SyntheticEvent<HTMLElement>)=>void;readonly onChange?:(event:SyntheticEvent<HTMLInputElement>)=>void;readonly onKeyDown?:(event:SyntheticEvent<HTMLElement>)=>void};
}
export interface ProgressPackGridsProps extends Shared {readonly size:ProgressSize}
export interface ProgressResourceDialogProps extends Omit<Shared,'instanceId'> {readonly popup:ProgressResourcePopup;readonly capabilities:ProgressCapabilities;readonly onRawRequest:(request:ProgressResourceRawRequest)=>void|boolean}
type Box=readonly[number,number,number,number];
interface GridPlan {readonly props:ProgressPackGridsProps;readonly width:number;readonly height:number;readonly requiredHeight:number;readonly optionalHeight:number}
export interface ProgressResourceDialogPlan {readonly props:ProgressResourceDialogProps;readonly box:Box;readonly scroll?:Box;readonly pane?:ProgressSize;readonly paneOffset?:ProgressSize;readonly section?:Box;readonly grids?:GridPlan;readonly countSize?:ProgressSize;readonly totalSize?:ProgressSize;readonly descriptionHeight:number;readonly warningHeight:number;readonly buttons:readonly {readonly id:string;readonly target:ProgressActionTarget;readonly label:string;readonly box:Box}[]}
function record(v:unknown,label:string):Record<string,unknown>{if(!v||typeof v!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(v)))throw new TypeError(`${label} requires plain data`);const out:Record<string,unknown>=Object.create(null);for(const key of Reflect.ownKeys(v)){const d=Object.getOwnPropertyDescriptor(v,key)!;if(typeof key!=='string'||['__proto__','constructor','prototype'].includes(key)||!d.enumerable||!('value'in d))throw new TypeError(`${label} requires data fields`);out[key]=d.value;}return out;}
function finite(v:unknown,label:string,min=0,max=8192):number{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new RangeError(`${label} requires finite geometry`);return v;}
function identifier(v:unknown,label:string):string{if(typeof v!=='string'||!v.trim()||v.length>256)throw new TypeError(`${label} requires bounded text`);return v;}
function extent(size:ProgressSize,s:number,label:string):ProgressSize{const d=recordTuple(size,label),w=finite(d[0],label),h=finite(d[1],label);if(w*s>8192||h*s>8192||w*h*s*s>4194304)throw new RangeError(`${label} exceeds Web pixel budget`);return Object.freeze([w,h]);}
function recordTuple(v:unknown,label:string):ProgressSize{if(!Array.isArray(v)||Object.getPrototypeOf(v)!==Array.prototype||v.length!==2||Reflect.ownKeys(v).length!==3)throw new TypeError(`${label} requires tuple`);return Object.freeze([0,1].map(i=>{const d=Object.getOwnPropertyDescriptor(v,String(i));if(!d||!('value'in d))throw new TypeError(`${label} requires data axes`);return d.value;}) as unknown as ProgressSize);}
function shared(input:Shared):Shared{const d=record(input,'Progress packs props');const profile=snapshotProgressProfile(d.profile as ProgressPresentationProfile),packs=snapshotProgressPacks(d.packs as ProgressPackState);
  if(typeof d.disabled!=='boolean'||typeof d.readOnly!=='boolean'||typeof d.onRawSelection!=='function'||d.renderText!==undefined&&typeof d.renderText!=='function')throw new TypeError('Progress packs require boolean state and callable callbacks');
  const native=d.nativeHandlers===undefined?{}:record(d.nativeHandlers,'Progress packs native handlers');if(Object.values(native).some(v=>v!==undefined&&typeof v!=='function'))throw new TypeError('Progress packs native handlers must be callable');
  return Object.freeze({...input,runKey:identifier(d.runKey,'Progress packs runKey'),instanceId:identifier(d.instanceId,'Progress packs instanceId'),profile,packs,nativeHandlers:Object.freeze(native)});
}
function intrinsic(profile:ProgressPresentationProfile,key:string):ProgressSize{const size=profile.intrinsicSizes[key];if(!size)throw new RangeError(`Progress packs require explicit intrinsicSizes[${JSON.stringify(key)}]`);return extent(size,profile.scale,key);}
function label(profile:ProgressPresentationProfile,key:string):string{const value=profile.labels[key];if(typeof value!=='string'||!value.trim())throw new RangeError(`Progress packs require labels[${JSON.stringify(key)}]`);return value;}
export function planProgressPackGrids(input:ProgressPackGridsProps,ref?:Ref<HTMLDivElement>):GridPlan{
  const props=shared(input) as ProgressPackGridsProps;validateProgressRef(ref);const[width,height]=extent(input.size,props.profile.scale,'Progress resource section');
  if(width<=21)throw new RangeError('Progress resource row requires label fill after source x21');
  const requiredHeight=props.packs.required.dimensions[1]*17,optionalHeight=props.packs.optional.dimensions[1]*17;
  for(const [name,collection]of [['required',props.packs.required],['optional',props.packs.optional]] as const){const columns=collection.dimensions[0];if(columns&&width/columns<=21)throw new RangeError(`${name} resource grid column lacks source label width`);extent([width,collection.dimensions[1]*17+3],props.profile.scale,'Progress '+name+' grid');}
  return Object.freeze({props:Object.freeze({...props,size:Object.freeze([width,height]) as ProgressSize}),width,height,requiredHeight,optionalHeight});
}
function Glyph({text,profile,role='pack',sourceControl,renderText,color='#ffffff'}:{text:string;profile:ProgressPresentationProfile;role?:'pack'|'title'|'button'|'progress';sourceControl:string;renderText?:ProgressTextRenderer;color?:string}){const font=profile.fonts[role],s=profile.scale;return <span className="mc-progress-packs__glyph" style={{fontFamily:font.family,fontSize:font.logicalSize*s,lineHeight:`${font.lineHeight*s}px`,color}}><span aria-hidden={renderText?true:undefined}>{renderText?renderText(text,Object.freeze({role,font,scale:s,color,shadow:false,sourceControl})):text}</span>{renderText&&<span className="mc-progress-packs__literal">{text}</span>}</span>;}
function PackRow({entry,index,collection,plan,top,width,owner,latest}:{entry:ProgressPackEntry;index:number;collection:'required_resourcepacks'|'optional_resourcepacks';plan:GridPlan;top:number;width:number;owner:{readonly current:HTMLDivElement|null};latest:{readonly current:GridPlan}}){
  const[name]=useState(entry.name),p=plan.props,s=p.profile.scale,locked=p.disabled||collection==='required_resourcepacks';
  const checked=entry.selected,normal=progressAssets[`textures/ui/checkbox_${checked?'check':'space'}`];
  const hover=progressAssets[`textures/ui/checkbox_${checked?'checkHover':'spaceHover'}`],lockedArt=progressAssets[`textures/ui/checkbox_${checked?'checkDisabled':'spaceDisabled'}`];
  return <label className="mc-progress-pack-row" data-collection={collection} data-pack-id={entry.id} data-pack-index={index} data-locked={locked||undefined} data-source-control="progress.resource_pack_grid_item" style={{left:((index%Math.max(1,(collection==='required_resourcepacks'?p.packs.required:p.packs.optional).dimensions[0]))*width+3)*s,top:top*s,width:width*s,height:17*s}}>
    <input type="checkbox" name={collection} aria-label={name} checked={checked} disabled={locked} readOnly={p.readOnly} aria-readonly={p.readOnly||undefined}
      onClick={event=>{p.nativeHandlers?.onClick?.(event);if(p.readOnly)event.preventDefault();}}
      onChange={event=>{p.nativeHandlers?.onChange?.(event);if(event.defaultPrevented||event.nativeEvent.defaultPrevented||locked||p.readOnly)return;const control=event.currentTarget,selected=control.checked,captured=p;
        p.onRawSelection(Object.freeze({runKey:p.runKey,instanceId:p.instanceId,collection,id:entry.id,index,selected,payload:entry.payload,control,event,valid:()=>{const now=latest.current.props,current=now.packs.optional.entries[index];return !now.disabled&&!now.readOnly&&now.runKey===captured.runKey&&now.instanceId===captured.instanceId&&current?.id===entry.id&&current.payload===entry.payload&&current.selected===entry.selected&&!!owner.current?.contains(control)&&control.isConnected&&!control.closest('[hidden],[inert]');}}));}}/>
    <span className="mc-progress-pack-row__visual" aria-hidden="true" style={{width:width*s,height:20*s}}>
      {[['normal',normal],['hover',hover],['locked',lockedArt]].map(([state,image])=><Image key={state as string} className={'mc-progress-pack-row__art mc-progress-pack-row__art--'+state} src={(image as typeof normal).url} sourceSize={[(image as typeof normal).width,(image as typeof normal).height]} scale={s} alt=""/>)}
      <span className="mc-progress-pack-row__label" style={{left:18*s,top:(10-1.5-p.profile.fonts.pack.lineHeight/2)*s,width:(width-18)*s,opacity:locked?.5:1}}><Glyph text={name} profile={p.profile} sourceControl="progress.checkbox_visual.control" renderText={p.renderText}/></span>
    </span>
  </label>;
}
function GridsSession({plan,forwardedRef}:{plan:GridPlan;forwardedRef:Ref<HTMLDivElement>}){const[root,attach]=useClassicNodeRef(forwardedRef),latest=useRef(plan);useClassicLayoutEffect(()=>{latest.current=plan;});const p=plan.props,s=p.profile.scale;
  return <div ref={attach} className="mc-progress-pack-grids" data-native-certified="false" data-source-control="progress.resource_pack_section" data-resource-instance={p.instanceId} style={{width:plan.width*s,height:plan.height*s}}>
    {([['required_resourcepacks',p.packs.required,0],['optional_resourcepacks',p.packs.optional,plan.requiredHeight]] as const).map(([collection,grid,top])=><div key={collection} className="mc-progress-pack-grid" data-source-collection={collection} data-grid-dimensions={grid.dimensions.join(',')} style={{top:top*s,width:plan.width*s,height:grid.dimensions[1]*17*s}}>{grid.entries.map((entry,index)=><PackRow key={entry.id} entry={entry} index={index} collection={collection} plan={plan} top={Math.floor(index/Math.max(1,grid.dimensions[0]))*17} width={plan.width/Math.max(1,grid.dimensions[0])} owner={root} latest={latest}/>)}</div>)}
  </div>;
}
export const ProgressPackGrids=forwardRef<HTMLDivElement,ProgressPackGridsProps>(function ProgressPackGrids(props,ref){const plan=planProgressPackGrids(projectProgressElementProps(props),ref);return <GridsSession key={JSON.stringify([plan.props.runKey,plan.props.instanceId])} plan={plan} forwardedRef={ref}/>;});

export function planProgressResourceDialog(input:ProgressResourceDialogProps,ref?:Ref<HTMLDivElement>):ProgressResourceDialogPlan{
  record(input,'Progress resource dialog props');
  const popup=snapshotProgressResourcePopup(input.popup);if(!popup)throw new TypeError('Progress resource dialog requires factory instance');
  const p=shared({...input,instanceId:popup.instanceId});validateProgressRef(ref);if(typeof input.onRawRequest!=='function')throw new TypeError('Progress resource request must be callable');
  const caps=record(input.capabilities,'Progress resource capabilities');if(!['desktop','pocket'].includes(caps.sourceProfile as string)||!['mouse','touch'].includes(caps.inputMode as string)||['educationEdition','cloudSaveOn','android','ios'].some(key=>typeof caps[key]!=='boolean'))throw new TypeError('Progress resource capabilities require source profile, input mode and independent flags');
  const props=Object.freeze({...input,...p,popup,capabilities:Object.freeze({...caps})}) as unknown as ProgressResourceDialogProps;const [aw,ah]=p.profile.availableSize,s=p.profile.scale;let w:number,h:number,scroll:Box|undefined,pane:ProgressSize|undefined,paneOffset:ProgressSize|undefined,section:Box|undefined,grids:GridPlan|undefined,countSize:ProgressSize|undefined,totalSize:ProgressSize|undefined,descriptionHeight=0,warningHeight=0;
  label(p.profile,'progressScreen.dialog.title.resourcePack');
  const buttons:{id:string;target:ProgressActionTarget;label:string;box:Box}[]=[];
  if(popup.factoryId==='test'){
    w=aw*.9;h=ah*.9;const sc=intrinsic(p.profile,'progress.popup_dialog_base.scrolling_panel');pane=intrinsic(p.profile,'progress.popup_dialog_base.scrolling_pane');paneOffset=intrinsic(p.profile,'progress.popup_dialog_base.scrolling_pane.offset');const sec=intrinsic(p.profile,'progress.resource_pack_section');countSize=intrinsic(p.profile,'progress.popup_dialog_base.totalSelected');totalSize=intrinsic(p.profile,'progress.popup_dialog_base.totalSelectedSize');
    if(countSize[1]!==10||totalSize[1]!==10)throw new RangeError('Progress selected count/size source height is10');
    scroll=Object.freeze([0,h*.1,sc[0],sc[1]]);section=Object.freeze([pane[0]*.005,pane[1]*.005+2,sec[0],sec[1]]);grids=planProgressPackGrids({...p,size:sec});
    const close=label(p.profile,'gui.close');buttons.push({id:'left',target:'button.confirm_download',label:close,box:[w*.005,h*.84,w*.4925,h*.15]},{id:'right',target:'button.deny_packs',label:close,box:[w*.5025,h*.84,w*.4925,h*.15]});
  }else{
    const explicit=intrinsic(p.profile,'progress.simple_popup_dialog_base');w=aw*.5;h=Math.min(ah-4,Math.max(ah*.5,explicit[1]));if(Math.abs(explicit[0]-w)>1e-9)throw new RangeError('Progress simple popup intrinsic width must match source 50%');
    descriptionHeight=intrinsic(p.profile,'progress.simple_popup_dialog_base.description')[1];if(popup.showRayTracingWarning)warningHeight=intrinsic(p.profile,'progress.simple_popup_dialog_base.description2')[1];
    label(p.profile,'progressScreen.dialog.title.resourcePack');let y=34+descriptionHeight+(popup.showRayTracingWarning?8+warningHeight:0);const bw=w-20;
    if(popup.factoryId==='resource_pack_download_optional_and_required'){buttons.push({id:'top',target:'button.join_and_download_everything',label:popup.joinEverythingText,box:[10,y,bw,30]});y+=32;}
    const required=popup.factoryId==='resource_pack_download_required'||popup.factoryId==='resource_pack_download_optional_and_required';
    buttons.push({id:'middle',target:required?'button.join_and_download_required':'button.join_and_download_everything',label:required?popup.joinRequiredText:popup.joinEverythingText,box:[10,y,bw,30]});y+=32;
    const join=popup.factoryId==='resource_pack_download_optional';buttons.push({id:'bottom',target:join?'button.join':'button.leave',label:label(p.profile,join?'progressScreen.dialog.button.join':'progressScreen.dialog.button.leave'),box:[10,y,bw,30]});
  }
  extent([w,h],s,'Progress resource popup');for(const button of buttons){extent([button.box[2],button.box[3]],s,'Progress resource button');if(button.box[2]<=2||button.box[3]<=2)throw new RangeError('Progress resource source-light button requires an inner face');if(!button.label.trim())throw new RangeError('Progress resource buttons require bound labels');planProgressSourceButton({snapshot:props,button:{...button,sourceControl:'progress.'+popup.factoryId+'/'+button.id,visible:true,enabled:!props.disabled,instanceId:popup.instanceId,material:'source-light'},onRequest:props.onRawRequest});}
  const texts=popup.factoryId==='test'?[props.packs.selectedCountText,props.packs.selectedSizeText]:[popup.description,popup.rayTracingWarning];for(const text of texts)planProgressText({text,role:'pack',sourceControl:'progress.'+popup.factoryId,profile:props.profile,renderText:props.renderText});
  if(p.profile.buttonStatePolicy!=='explicit-common-classic-web')throw new Error('Progress resource source-light desktop state literals are unresolved; select explicit-common-classic-web');
  return Object.freeze({props,box:Object.freeze([(aw-w)/2,(ah-h)/2,w,h]) as Box,...scroll?{scroll}:{},...pane?{pane}:{},...paneOffset?{paneOffset}:{},...section?{section}:{},...grids?{grids}:{},...countSize?{countSize}:{},...totalSize?{totalSize}:{},descriptionHeight,warningHeight,buttons:Object.freeze(buttons.map(button=>Object.freeze(button)))});
}

function DialogSession({plan,forwardedRef}:{plan:ProgressResourceDialogPlan;forwardedRef:Ref<HTMLDivElement>}){
  const[root,attach]=useClassicNodeRef(forwardedRef),latest=useRef(plan),[once]=useState({everything:plan.props.popup.joinEverythingText,required:plan.props.popup.joinRequiredText});useClassicLayoutEffect(()=>{latest.current=plan;});
  const p=plan.props,s=p.profile.scale,[x,y,w,h]=plan.box,selector=p.popup.factoryId==='test';
  const request=(raw:ProgressResourceRawRequest)=>{if(raw.event?.type==='click')p.nativeHandlers?.onClick?.(raw.event);if(raw.event?.defaultPrevented||raw.event?.nativeEvent.defaultPrevented)return false;return p.onRawRequest(raw);};
  const title=label(p.profile,'progressScreen.dialog.title.resourcePack');
  const paint=(key:keyof typeof progressAssets,width:number,height:number)=><ClassicSkin asset={progressAssets[key]} width={width} height={height} scale={s} baseClass="mc-progress-skin" errorName="Progress resource popup"/>;
  const glyph=(text:string,role:'title'|'pack',sourceControl:string,color:string)=> <Glyph text={text} role={role} sourceControl={sourceControl} profile={p.profile} renderText={p.renderText} color={color}/>;
  return <div ref={attach} className="mc-progress-resource-dialog" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} data-progress-resource-factory={p.popup.factoryId} data-progress-instance={p.popup.instanceId} data-native-certified="false"
    style={{left:x*s,top:y*s,width:w*s,height:h*s}} onKeyDown={event=>{p.nativeHandlers?.onKeyDown?.(event);if(p.disabled||event.key!=='Escape'||event.defaultPrevented||event.nativeEvent.defaultPrevented||event.nativeEvent.isComposing||event.nativeEvent.keyCode===229||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.repeat)return;const control=event.currentTarget,captured=p;request({target:PROGRESS_RESOURCE_ESCAPE_TARGET,sourceControl:'progress.'+p.popup.factoryId,instanceId:p.popup.instanceId,control,event,origin:'keyboard',valid:()=>{const now=latest.current.props;return now.runKey===captured.runKey&&now.popup.instanceId===captured.popup.instanceId&&now.popup.factoryId===captured.popup.factoryId&&!now.disabled&&!control.closest('[hidden],[inert]')&&!!root.current?.contains(control)&&control.isConnected;}});}}>
    {selector?<>
      {paint('textures/ui/NormalButtonThin',w,h)}
      <ScrollArea variant="document" scale={s} label={title} className="mc-progress-resource-dialog__scroll" style={{left:plan.scroll![0]*s,top:plan.scroll![1]*s,width:plan.scroll![2]*s,height:plan.scroll![3]*s}} viewportProps={{style:{position:'absolute',left:plan.paneOffset![0]*s,top:plan.paneOffset![1]*s,width:plan.pane![0]*s,height:plan.pane![1]*s}}} contentProps={{style:{position:'relative',width:plan.section![2]*s,height:(plan.section![1]+plan.section![3])*s}}}>
        <div style={{position:'absolute',left:plan.section![0]*s,top:plan.section![1]*s}}><ProgressPackGrids {...plan.grids!.props}/></div>
      </ScrollArea>
      <span className="mc-progress-resource-dialog__count" style={{left:w*.0075*s,top:(h*.84-10)*s,width:plan.countSize![0]*s,height:10*s}}>{glyph(p.packs.selectedCountText,'pack','progress.popup_dialog_base.totalSelected','rgb(30% 30% 30%)')}</span>
      <span className="mc-progress-resource-dialog__total" style={{right:w*.0075*s,top:(h*.84-10)*s,width:plan.totalSize![0]*s,height:10*s}}>{glyph(p.packs.selectedSizeText,'pack','progress.popup_dialog_base.totalSelectedSize','rgb(30% 30% 30%)')}</span>
    </>:<>
      {paint('textures/ui/dialog_background_hollow_3',w,h)}
      <Image className="mc-progress-resource-dialog__fill" src={progressAssets['textures/ui/control'].url} sourceSize={[2,2]} size={[w-16,h]} scale={s} alt="" style={{left:8*s,top:0}}/>
      <span className="mc-progress-resource-dialog__title" style={{left:(10+(w-20)*.025)*s,top:16*s,width:(w-20)*.95*s,height:10*s}}>{glyph(title,'title','progress.simple_popup_dialog_base.title',p.profile.titleTextColor)}</span>
      <span className="mc-progress-resource-dialog__description" style={{left:10*s,top:26*s,width:(w-20)*s,height:plan.descriptionHeight*s}}>{glyph(p.popup.description,'pack','progress.simple_popup_dialog_base.description','#ffffff')}</span>
      {p.popup.showRayTracingWarning&&<span className="mc-progress-resource-dialog__warning" style={{left:10*s,top:(34+plan.descriptionHeight)*s,width:(w-20)*s,height:plan.warningHeight*s}}>{glyph(p.popup.rayTracingWarning,'pack','progress.simple_popup_dialog_base.description2','#ffffff')}</span>}
    </>}
    {plan.buttons.map(button=><ProgressSourceButton key={button.id} snapshot={p} button={{...button,label:button.target==='button.join_and_download_everything'?once.everything:button.target==='button.join_and_download_required'?once.required:button.label,sourceControl:'progress.'+p.popup.factoryId+'/'+button.id,visible:true,enabled:!p.disabled,instanceId:p.popup.instanceId,material:'source-light'}} onRequest={request}/>)}
  </div>;
}
export const ProgressResourceDialog=forwardRef<HTMLDivElement,ProgressResourceDialogProps>(function ProgressResourceDialog(props,ref){const plan=planProgressResourceDialog(projectProgressElementProps(props),ref);return <DialogSession key={JSON.stringify([plan.props.runKey,plan.props.popup.instanceId,plan.props.popup.factoryId])} plan={plan} forwardedRef={ref}/>;});
