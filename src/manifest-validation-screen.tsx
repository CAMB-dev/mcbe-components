import {forwardRef, useId, useRef} from 'react';
import type {ButtonHTMLAttributes, CSSProperties, HTMLAttributes, KeyboardEvent, MouseEvent, Ref} from 'react';
import {ClassicSkin} from './classic-skin';
import {ManifestValidationContent, planManifestValidationContent} from './manifest-validation-parts';
import type {ManifestValidationContentProps} from './manifest-validation-parts';
import {manifestValidationAssets} from './manifest-validation-assets';
import {classicModalOwnsInput, classicModalTab, deferClassicEvent, deferClassicRequest, useClassicLayoutEffect, useClassicModal, useClassicNodeRef} from './classic-screen-lifecycle';

type DataAttributes={[key:`data-${string}`]:string|number|boolean|undefined};
type NativeDiv=Omit<HTMLAttributes<HTMLDivElement>,'children'|'dangerouslySetInnerHTML'|'title'|'content'> & DataAttributes;
export interface ManifestValidationCloseDetail {
  readonly target:'button.menu_exit';readonly origin:'close'|'escape';
  readonly control:HTMLElement;readonly event:MouseEvent<HTMLButtonElement>|KeyboardEvent<HTMLDivElement>;
}
export interface ManifestValidationViewDetail {
  readonly target:'button.menu_tab_left'|'button.menu_tab_right';readonly origin:'keyboard';
  readonly control:HTMLDivElement;readonly event:KeyboardEvent<HTMLDivElement>;
}
export interface ManifestValidationScreenProps extends NativeDiv {
  readonly open:boolean;readonly viewportSize:readonly[number,number];readonly scale:number;
  readonly title:string;readonly closeLabel:string;
  readonly content:Omit<ManifestValidationContentProps,'size'|'scale'>;
  readonly disabled?:boolean;readonly readOnly?:boolean;readonly closeVisible?:boolean;
  /** Explicit host override. Default.8 is the static full_screen_background
   * instance model; the source also declares screen_background_alpha.65. */
  readonly backgroundOpacity?:number;
  /** Explicit Web '[' / ']' adapter. No source tabs/provider are fabricated. */
  readonly viewNavigationKeys?:boolean;
  readonly onCloseRequest?:(detail:ManifestValidationCloseDetail)=>void|false;
  readonly onViewRequest?:(detail:ManifestValidationViewDetail)=>void|false;
  readonly panelRef?:Ref<HTMLDivElement>;readonly contentRef?:Ref<HTMLDivElement>;readonly closeButtonRef?:Ref<HTMLButtonElement>;
  readonly closeButtonProps?:Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'dangerouslySetInnerHTML'|'type'>;
}
const text=(value:string,name:string)=>{if(typeof value!=='string'||value.length>1048576)throw new TypeError(`Manifest Validation ${name} requires bounded text.`);};
const bool=(value:boolean,name:string)=>{if(typeof value!=='boolean')throw new TypeError(`Manifest Validation ${name} must be boolean.`);};
function sizeValue(size:readonly[number,number],scale:number){
  if(!Number.isSafeInteger(scale)||scale<1||scale>32)throw new RangeError('Manifest Validation scale must be an integer1..32.');
  if(!Array.isArray(size)||size.length!==2||!size.every(value=>typeof value==='number'&&Number.isFinite(value)&&value>0&&value*scale<=8192)||size[0]*size[1]*scale*scale>16777216)throw new RangeError('Manifest Validation viewport requires finite positive bounded logical dimensions.');
}
export function planManifestValidationScreen(p:ManifestValidationScreenProps){
  sizeValue(p.viewportSize,p.scale);bool(p.open,'open');text(p.title,'title');text(p.closeLabel,'close label');
  for(const key of['disabled','readOnly','closeVisible','viewNavigationKeys']as const)if(p[key]!==undefined)bool(p[key],key);
  if(p.backgroundOpacity!==undefined&&(typeof p.backgroundOpacity!=='number'||!Number.isFinite(p.backgroundOpacity)||p.backgroundOpacity<0||p.backgroundOpacity>1))throw new RangeError('Manifest Validation backgroundOpacity must be finite0..1.');
  const width=Math.min(p.viewportSize[0]-4,370),height=p.viewportSize[1]-50;
  if(width<=16||height<=31)throw new RangeError('Manifest Validation viewport cannot contain the source frame/content insets.');
  const size=[width-16,height-31]as const;
  planManifestValidationContent({...p.content,size,scale:p.scale,disabled:p.disabled||p.content.disabled,readOnly:p.readOnly||p.content.readOnly});
  return Object.freeze({width,height,size,backgroundOpacity:p.backgroundOpacity??.8});
}
const eventBlocked=(event:MouseEvent<HTMLButtonElement>|KeyboardEvent<HTMLDivElement>)=>event.defaultPrevented||event.nativeEvent.defaultPrevented;
const image=(key:keyof typeof manifestValidationAssets)=>`url(${JSON.stringify(manifestValidationAssets[key].url)})`;

/** Fixed Classic source shell. Native DOM modal ownership, input handling and
 * bracket navigation are Web policies; initialization/exit animations, scene,
 * source variable evaluation and the current native route are not certified. */
export const ManifestValidationScreen=forwardRef<HTMLDivElement,ManifestValidationScreenProps>(function ManifestValidationScreen(p,forwarded){
  const plan=planManifestValidationScreen(p),{open,viewportSize,scale,title,closeLabel,content,disabled=false,readOnly=false,closeVisible=true,backgroundOpacity,viewNavigationKeys=false,onCloseRequest,onViewRequest,panelRef,contentRef,closeButtonRef,closeButtonProps={},className,style,hidden,onKeyDown,onCompositionStart,onCompositionEnd,onCompositionStartCapture,onCompositionEndCapture,...native}=p;
  const [root,attach]=useClassicNodeRef(forwarded),[panel,attachPanel]=useClassicNodeRef(panelRef),[,attachContent]=useClassicNodeRef(contentRef),[close,attachClose]=useClassicNodeRef(closeButtonRef);
  const active=open&&!hidden,titleId=useId(),generation=useRef(0),composing=useRef(new Set<EventTarget>());
  const live=useRef({active,disabled,closeVisible,viewNavigationKeys,onCloseRequest,onViewRequest,identity:{...content.identity}});
  const compositionLease=useRef<{node:HTMLDivElement;release:()=>void}|null>(null);
  useClassicLayoutEffect(()=>{
    const previous=live.current,identity={...content.identity};
    if(previous.active!==active||previous.identity.runKey!==identity.runKey||previous.identity.packId!==identity.packId||previous.identity.payload!==identity.payload)generation.current++;
    live.current={active,disabled,closeVisible,viewNavigationKeys,onCloseRequest,onViewRequest,identity};
    if(!active)composing.current.clear();
  });
  useClassicLayoutEffect(()=>()=>{generation.current++;},[]);
  // A synthetic capture callback is insufficient: React may dispatch it from
  // delegated native bubble. Keep one actual native capture lease per root.
  useClassicLayoutEffect(()=>{
    const element=root.current,previous=compositionLease.current;
    if(previous&&(!active||previous.node!==element)){previous.release();compositionLease.current=null;composing.current.clear();}
    if(!active||!element||compositionLease.current)return;
    const start=(event:Event)=>{if(live.current.active&&root.current===element&&element.isConnected&&event.target)composing.current.add(event.target);};
    const end=(event:Event)=>{if(event.target)composing.current.delete(event.target);};
    element.addEventListener('compositionstart',start,true);element.addEventListener('compositionend',end,true);
    compositionLease.current={node:element,release:()=>{element.removeEventListener('compositionstart',start,true);element.removeEventListener('compositionend',end,true);}};
  });
  useClassicLayoutEffect(()=>()=>{compositionLease.current?.release();compositionLease.current=null;composing.current.clear();},[]);
  useClassicModal(root,panel,active);
  const isComposing=()=>{for(const target of composing.current)if(!(target as Node).isConnected||!root.current?.contains(target as Node))composing.current.delete(target);return composing.current.size>0;};
  const valid=(owner:HTMLElement,version:number)=>live.current.active&&!live.current.disabled&&generation.current===version&&classicModalOwnsInput(root.current)&&!!root.current?.contains(owner)&&!owner.closest('[hidden],[inert]')&&!isComposing();
  const closeRequest=(event:MouseEvent<HTMLButtonElement>|KeyboardEvent<HTMLDivElement>,origin:ManifestValidationCloseDetail['origin'])=>{
    const owner=event.currentTarget,version=generation.current;
    const accepts=()=>valid(owner,version)&&(origin!=='close'||live.current.closeVisible&&close.current===owner&&!close.current.disabled);
    if(eventBlocked(event)||!accepts())return;
    deferClassicRequest(event,owner,snapshot=>live.current.onCloseRequest?.({target:'button.menu_exit',origin,control:owner,event:snapshot}),accepts);
  };
  const viewRequest=(event:KeyboardEvent<HTMLDivElement>,target:ManifestValidationViewDetail['target'])=>{
    const owner=event.currentTarget,version=generation.current,accepts=()=>valid(owner,version)&&root.current===owner&&live.current.viewNavigationKeys;
    if(eventBlocked(event)||!accepts())return;
    deferClassicRequest(event,owner,snapshot=>live.current.onViewRequest?.({target,origin:'keyboard',control:owner,event:snapshot}),accepts);
  };
  const vars={'--mc-manifest-scale':scale,'--mc-manifest-close':image('textures/ui/close_button_default'),'--mc-manifest-close-hover':image('textures/ui/close_button_hover'),'--mc-manifest-close-pressed':image('textures/ui/close_button_pressed')}as CSSProperties;
  return <div {...native} ref={attach} role={native.role??'dialog'} aria-modal={native['aria-modal']??true} aria-labelledby={native['aria-label']?native['aria-labelledby']:native['aria-labelledby']??titleId} hidden={hidden||!open}
    className={['mc-manifest-validation-screen',className].filter(Boolean).join(' ')} style={{...style,...vars,width:viewportSize[0]*scale,height:viewportSize[1]*scale}}
    data-source-declared-background-alpha="0.65" data-source-static-effective-background-alpha="0.8" data-background-policy={backgroundOpacity===undefined?'source-static-instance-override':'explicit-host-opacity'} data-source-view-mapping="button.menu_tab_left/button.menu_tab_right:self:scope-view"
    onCompositionStartCapture={onCompositionStartCapture} onCompositionEndCapture={onCompositionEndCapture} onCompositionStart={onCompositionStart} onCompositionEnd={onCompositionEnd}
    onKeyDown={event=>{
      onKeyDown?.(event);if(eventBlocked(event)||event.nativeEvent.isComposing||event.keyCode===229)return;
      if(event.key==='Tab'&&active){deferClassicEvent(event,event.currentTarget,snapshot=>classicModalTab(snapshot,root.current,panel.current),()=>live.current.active);return;}
      if(event.repeat||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
      if(event.key==='Escape')closeRequest(event,'escape');
      else if(viewNavigationKeys&&(event.key==='['||event.key===']'))viewRequest(event,event.key==='['?'button.menu_tab_left':'button.menu_tab_right');
    }}>
    <div className="mc-manifest-validation-screen__dim" style={{opacity:plan.backgroundOpacity}} aria-hidden="true"><ClassicSkin asset={manifestValidationAssets['textures/ui/screen_background']} width={viewportSize[0]} height={viewportSize[1]} scale={scale} baseClass="mc-manifest-skin"/></div>
    <div ref={attachPanel} tabIndex={-1} className="mc-manifest-validation-screen__panel" style={{left:(viewportSize[0]-plan.width)*scale/2,top:(viewportSize[1]-plan.height)*scale/2,width:plan.width*scale,height:plan.height*scale}}>
      <span className="mc-manifest-validation-screen__underfill" aria-hidden="true"><ClassicSkin asset={manifestValidationAssets['textures/ui/control']} width={plan.width-8} height={plan.height-8} scale={scale} baseClass="mc-manifest-skin"/></span>
      <ClassicSkin asset={manifestValidationAssets['textures/ui/dialog_background_hollow_3']} width={plan.width} height={plan.height} scale={scale} baseClass="mc-manifest-skin" className="mc-manifest-validation-screen__hollow"/>
      <div id={titleId} className="mc-manifest-validation-screen__title">{title}</div>
      <button {...closeButtonProps} ref={attachClose} type="button" aria-label={closeButtonProps['aria-label']??closeLabel} hidden={!closeVisible||closeButtonProps.hidden} disabled={disabled||closeButtonProps.disabled}
        className={['mc-manifest-validation-screen__close',closeButtonProps.className].filter(Boolean).join(' ')} onClick={event=>{closeButtonProps.onClick?.(event);closeRequest(event,'close');}}/>
      <div ref={attachContent} className="mc-manifest-validation-screen__content"><ManifestValidationContent {...content} size={plan.size} scale={scale} disabled={disabled||content.disabled} readOnly={readOnly||content.readOnly}/></div>
    </div>
  </div>;
});
