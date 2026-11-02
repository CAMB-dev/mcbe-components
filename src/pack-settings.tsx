import {forwardRef, useId, useRef} from 'react';
import type {ButtonHTMLAttributes, ChangeEvent, CSSProperties, HTMLAttributes, InputHTMLAttributes, KeyboardEvent, MouseEvent, Ref, SyntheticEvent} from 'react';
import {ClassicSkin} from './classic-skin';
import {ScrollArea} from './scroll-area';
import {ServerCustomContents, validateServerCustomContents} from './server-forms';
import type {ServerCustomContentsProps} from './server-forms';
import {resourcePackAssets} from './resource-pack-assets';
import {classicModalOwnsInput, classicModalTab, deferClassicEvent, deferClassicRequest, useClassicLayoutEffect, useClassicModal, useClassicNodeRef} from './classic-screen-lifecycle';

type DataAttributes={[key:`data-${string}`]:string|number|boolean|undefined};
type NativeDiv=Omit<HTMLAttributes<HTMLDivElement>,'children'|'dangerouslySetInnerHTML'|'title'|'onChange'|'content'> & DataAttributes;
type NativeInput=Omit<InputHTMLAttributes<HTMLInputElement>,'children'|'dangerouslySetInnerHTML'|'type'|'value'|'defaultValue'|'min'|'max'|'step'|'disabled'|'readOnly'|'size'|'width'|'height'>;
const positive=(n:number,name:string,zero=false)=>{if(typeof n!=='number'||!Number.isFinite(n)||n<(zero?0:Number.MIN_VALUE)||n>8192)throw new RangeError(`Pack Settings ${name} must be finite ${zero?'nonnegative':'positive'} within8192.`);return n;};
const scaleValue=(n:number)=>{if(!Number.isSafeInteger(n)||n<1||n>32)throw new RangeError('Pack Settings scale must be an integer1..32.');return n;};
const text=(s:string,name:string)=>{if(typeof s!=='string'||s.length>1048576)throw new TypeError(`Pack Settings ${name} must be bounded text.`);};
const bool=(v:boolean,name:string)=>{if(typeof v!=='boolean')throw new TypeError(`Pack Settings ${name} must be boolean.`);};
function sizeValue(size:readonly[number,number],scale:number){scaleValue(scale);if(!Array.isArray(size)||size.length!==2)throw new TypeError('Pack Settings size requires two logical axes.');for(const n of size){positive(n,'logical size');positive(n*scale,'CSS size');}if(size[0]*size[1]*scale*scale>16777216)throw new RangeError('Pack Settings exceeds the finite Web pixel budget.');}
const styleValue=(scale:number,style?:CSSProperties)=>({'--mc-pack-settings-scale':scale,...style}as CSSProperties);
const blocked=(event:SyntheticEvent)=>event.defaultPrevented||event.nativeEvent.defaultPrevented;
const image=(key:keyof typeof resourcePackAssets)=>`url(${JSON.stringify(resourcePackAssets[key].url)})`;

/** Raw source bindings and the accepted HTML range domain are independent.
 * Native value/steps units and factory offsets are not inferred from this API. */
export interface PackContentTierWebDomain {
  readonly value:number;readonly min:number;readonly max:number;readonly step:number;
  /** Explicit resolved Web X positions from the track's left edge, with explicit
   * progress state. No step-factory placement/count is derived from raw steps. */
  readonly markers:readonly{readonly offset:number;readonly progress:boolean}[];
}
const inWebDomain=(value:number,w:PackContentTierWebDomain)=>Number.isFinite(value)&&value>=w.min&&value<=w.max&&Math.abs((value-w.min)/w.step-Math.round((value-w.min)/w.step))<=1e-9;
export interface PackContentTierChangeDetail {
  readonly target:'#content_tier_value';readonly mappingPolicy:'explicit-web-domain';
  readonly control:HTMLInputElement;readonly event:ChangeEvent<HTMLInputElement>;
  readonly previousValue:number;readonly sourceValue:number;readonly sourceSteps:number;
}
export interface PackContentTierProps extends NativeDiv {
  readonly width:number;readonly scale:number;readonly hasContentTiering:boolean;readonly contentTierSupported:boolean;
  readonly label:string;readonly incompatibleReason:string;readonly value:number;readonly steps:number;readonly ttsText:string;
  readonly web:PackContentTierWebDomain;
  /** Explicit host resolution of source default-height labels, in logical units. */
  readonly labelHeight:number;readonly reasonHeight:number;
  readonly disabled?:boolean;readonly readOnly?:boolean;
  readonly inputProps?:NativeInput;readonly inputRef?:Ref<HTMLInputElement>;
  readonly onValueChange?:(value:number,detail:PackContentTierChangeDetail)=>void|false;
}
export function planPackContentTier(p:PackContentTierProps){
  scaleValue(p.scale);positive(p.width,'logical tier width');positive(p.width*p.scale,'tier width');if(p.width<=28)throw new RangeError('Pack Settings tier width must exceed28 logical units.');
  bool(p.hasContentTiering,'hasContentTiering');bool(p.contentTierSupported,'contentTierSupported');
  if(p.disabled!==undefined)bool(p.disabled,'disabled');if(p.readOnly!==undefined)bool(p.readOnly,'readOnly');
  text(p.label,'content tier label');text(p.incompatibleReason,'incompatible reason');text(p.ttsText,'slider TTS text');
  if(!Number.isFinite(p.value)||!Number.isFinite(p.steps))throw new RangeError('Pack Settings raw value/steps must be finite; their units remain host owned.');
  positive(p.labelHeight,'logical label height',true);positive(p.reasonHeight,'logical reason height',true);positive(p.labelHeight*p.scale,'label height',true);positive(p.reasonHeight*p.scale,'reason height',true);
  const w=p.web;if(!w||![w.value,w.min,w.max,w.step].every(n=>typeof n==='number'&&Number.isFinite(n))||!Number.isFinite(w.max-w.min)||w.max<=w.min||w.step<=0||w.value<w.min||w.value>w.max)throw new RangeError('Pack Settings explicit Web range must be finite, ordered and contain its accepted value.');
  if(!inWebDomain(w.value,w))throw new RangeError('Pack Settings accepted Web value must lie on its explicit step lattice.');
  if(!Array.isArray(w.markers)||w.markers.length>4096)throw new RangeError('Pack Settings requires a bounded explicit marker snapshot.');
  const trackWidth=p.width-18;
  for(const marker of w.markers){if(!marker||!Number.isFinite(marker.offset)||marker.offset<0||marker.offset>trackWidth-2)throw new RangeError('Pack Settings marker offsets must fit the logical track.');bool(marker.progress,'marker progress');}
  const ratio=(w.value-w.min)/(w.max-w.min),height=p.labelHeight+24+(p.contentTierSupported?0:p.reasonHeight);
  positive(height*p.scale,'tier height');
  return Object.freeze({trackWidth,ratio,height,reasonHeight:p.contentTierSupported?0:p.reasonHeight});
}

/** Source content-tier leaf; compatibility changes labels, not enabled state. */
export const PackContentTier=forwardRef<HTMLDivElement,PackContentTierProps>(function PackContentTier(p,forwarded){
  const plan=planPackContentTier(p),{width,scale:s,hasContentTiering,contentTierSupported,label,incompatibleReason,value,steps,ttsText,web,labelHeight,disabled=false,readOnly=false,inputProps={},inputRef,onValueChange,className,style,hidden,onKeyDown,...native}=p;
  // Source-only props must not leak onto the native div.
  const {reasonHeight:_reasonHeight,...rootNative}=native;void _reasonHeight;
  const [,attach]=useClassicNodeRef(forwarded),[input,attachInput]=useClassicNodeRef(inputRef),labelId=useId(),reasonId=useId();
  const live=useRef({hasContentTiering,disabled,readOnly,hidden,web,value,steps,onValueChange});
  useClassicLayoutEffect(()=>{live.current={hasContentTiering,disabled,readOnly,hidden,web,value,steps,onValueChange};});
  const identity=()=>[live.current.web.value,live.current.web.min,live.current.web.max,live.current.web.step,live.current.value,live.current.steps].join(':');
  const skin=(name:string,w:number,h:number)=>{const key=`textures/ui/${name}`as keyof typeof resourcePackAssets;return <ClassicSkin asset={resourcePackAssets[key]} width={w} height={h} scale={s} baseClass="mc-pack-settings-skin" errorName="Pack Settings"/>;};
  const locked=disabled||!hasContentTiering;
  return <div {...rootNative} ref={attach} className={['mc-pack-content-tier',className].filter(Boolean).join(' ')} hidden={hidden||!hasContentTiering}
    data-source-value={value} data-source-steps={steps} data-supported={contentTierSupported} data-web-policy="explicit-web-domain" data-readonly={readOnly||undefined}
    style={styleValue(s,{...style,width:width*s,height:plan.height*s})} onKeyDown={onKeyDown}>
    <div className="mc-pack-content-tier__label-panel" style={{height:(labelHeight+2)*s}}>
      <div id={labelId} className="mc-pack-content-tier__label" style={{height:labelHeight*s,color:contentTierSupported?'rgb(100% 100% 100%)':'rgb(100% 0% 0%)'}}>{label}</div>
    </div>
    <div className="mc-pack-content-tier__slider-panel" data-locked={locked||undefined}>
      <div className="mc-pack-content-tier__track" style={{width:plan.trackWidth*s}}>
        <div className="mc-pack-content-tier__bar mc-pack-content-tier__bar--normal">{skin('slider_border',plan.trackWidth,10)}<span className="mc-pack-content-tier__inside">{skin('slider_background',plan.trackWidth-2,8)}<span className="mc-pack-content-tier__progress" style={{clipPath:`inset(0 ${(1-plan.ratio)*100}% 0 0)`}}>{skin('slider_progress',plan.trackWidth-2,8)}</span></span></div>
        <div className="mc-pack-content-tier__bar mc-pack-content-tier__bar--hover">{skin('slider_border',plan.trackWidth,10)}<span className="mc-pack-content-tier__inside">{skin('slider_background_hover',plan.trackWidth-2,8)}<span className="mc-pack-content-tier__progress" style={{clipPath:`inset(0 ${(1-plan.ratio)*100}% 0 0)`}}>{skin('slider_progress_hover',plan.trackWidth-2,8)}</span></span></div>
        {web.markers.map((marker,index)=><span key={index} className="mc-pack-content-tier__marker" style={{left:marker.offset*s}} data-progress={marker.progress} data-web-marker-offset={marker.offset} data-source-factory="slider_step_factory"><span className="mc-pack-content-tier__marker-normal">{skin(marker.progress?'slider_step_progress':'slider_step_background',2,6)}</span><span className="mc-pack-content-tier__marker-hover">{skin(marker.progress?'slider_step_progress_hover':'slider_step_background_hover',2,6)}</span></span>)}
        {locked&&<span className="mc-pack-content-tier__fade">{skin('slider_locked_transparent_fade',plan.trackWidth,10)}</span>}
        <span className="mc-pack-content-tier__thumb" style={{left:plan.ratio*(plan.trackWidth-10)*s}}>
          {(['default','hover','indent','locked']as const).map(state=><span key={state} className={`mc-pack-content-tier__thumb-${state}`}>{skin(`slider_button_${state}`,10,16)}{state==='locked'&&<span className="mc-pack-content-tier__fade">{skin('slider_locked_transparent_fade',10,16)}</span>}</span>)}
        </span>
        <input {...inputProps} ref={attachInput} type="range" min={web.min} max={web.max} step={web.step} value={web.value} disabled={locked}
          aria-readonly={readOnly||undefined} aria-labelledby={inputProps['aria-label']?inputProps['aria-labelledby']:inputProps['aria-labelledby']??labelId}
          aria-describedby={[inputProps['aria-describedby'],!contentTierSupported?reasonId:undefined].filter(Boolean).join(' ')||undefined}
          aria-valuetext={inputProps['aria-valuetext']??ttsText} className={['mc-pack-content-tier__input',inputProps.className].filter(Boolean).join(' ')}
          onPointerDown={event=>{inputProps.onPointerDown?.(event);if(!blocked(event)&&readOnly)event.preventDefault();}}
          onKeyDown={event=>{inputProps.onKeyDown?.(event);if(blocked(event))return;if((readOnly||event.nativeEvent.isComposing||event.keyCode===229)&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown','Enter',' '].includes(event.key))event.preventDefault();}}
          onChange={event=>{
            const owner=event.currentTarget,proposed=owner.valueAsNumber,accepted=web.value,key=identity();
            inputProps.onChange?.(event);
            // Keep the real input in the accepted domain even when the host
            // rejects or defers this controlled request; art uses that same value.
            owner.value=String(live.current.web.value);
            if(blocked(event)||locked||readOnly||!inWebDomain(proposed,web)||(event.nativeEvent as Event&{isComposing?:boolean}).isComposing)return;
            deferClassicRequest(event,owner,snapshot=>live.current.onValueChange?.(proposed,{target:'#content_tier_value',mappingPolicy:'explicit-web-domain',control:owner,event:snapshot,previousValue:accepted,sourceValue:value,sourceSteps:steps}),()=>{
              const current=live.current;return input.current===owner&&current.hasContentTiering&&!current.disabled&&!current.readOnly&&!current.hidden&&!owner.closest('[hidden],[inert]')&&identity()===key;
            });
          }}/>
      </div>
    </div>
    <div className="mc-pack-content-tier__reason-panel" style={{height:(plan.reasonHeight+2)*s}}><div id={reasonId} className="mc-pack-content-tier__reason" hidden={contentTierSupported} style={{height:plan.reasonHeight*s}}>{incompatibleReason}</div></div>
  </div>;
});

export interface PackSettingsGeneratedContents {
  /** Complete host-resolved collection, including entries with visible:false. */
  readonly customFormLength:number;
  readonly contents:ServerCustomContentsProps;
}
export interface PackSettingsContentProps extends Omit<NativeDiv,'inputMode'> {
  readonly size:readonly[number,number];readonly scale:number;readonly inputMode:'mouse'|'touch';readonly scrollLabel:string;
  readonly tier:Omit<PackContentTierProps,'width'|'scale'>;readonly generated:PackSettingsGeneratedContents;
  readonly disabled?:boolean;readonly readOnly?:boolean;readonly scrollViewportRef?:Ref<HTMLDivElement>;
}
export function planPackSettingsContent(p:PackSettingsContentProps){
  sizeValue(p.size,p.scale);text(p.scrollLabel,'scroll label');if(p.inputMode!=='mouse'&&p.inputMode!=='touch')throw new TypeError('Pack Settings requires explicit mouse/touch input mode.');
  const paneWidth=p.size[0]-4,viewportWidth=paneWidth-(p.inputMode==='mouse'?7:0),contentWidth=viewportWidth-4;
  if(contentWidth<=28||p.size[1]<=4)throw new RangeError('Pack Settings content is smaller than its source slider/scroll insets.');
  if(!p.generated||!Number.isSafeInteger(p.generated.customFormLength)||p.generated.customFormLength<0||p.generated.customFormLength>4096||!Array.isArray(p.generated.contents?.fields)||p.generated.contents.fields.length!==p.generated.customFormLength)throw new RangeError('Pack Settings generated contents require an explicit complete custom_form collection matching #custom_form_length.');
  validateServerCustomContents({...p.generated.contents,scale:p.scale});
  planPackContentTier({...p.tier,width:contentWidth,scale:p.scale,disabled:p.disabled||p.tier.disabled,readOnly:p.readOnly||p.tier.readOnly});
  return Object.freeze({paneWidth,viewportWidth,contentWidth});
}
export const PackSettingsContent=forwardRef<HTMLDivElement,PackSettingsContentProps>(function PackSettingsContent(p,ref){
  const plan=planPackSettingsContent(p),{size,scale:s,inputMode,scrollLabel,tier,generated,disabled,readOnly,scrollViewportRef,className,style,...native}=p;
  const [,attach]=useClassicNodeRef(ref),[,attachViewport]=useClassicNodeRef(scrollViewportRef);
  const scrollVars={'--mc-skin-scroll-track':image('textures/ui/ScrollRail'),'--mc-skin-scroll-thumb':image('textures/ui/ScrollHandle')}as CSSProperties;
  return <div {...native} ref={attach} className={['mc-pack-settings-content',className].filter(Boolean).join(' ')} style={styleValue(s,{...style,...scrollVars,width:size[0]*s,height:size[1]*s})} data-input-mode={inputMode}>
    <ScrollArea className="mc-pack-settings-content__scroll" style={{left:2*s,width:plan.paneWidth*s,height:size[1]*s}} variant={inputMode==='mouse'?'document':'touch'} scale={s} label={scrollLabel} scrollbarVisibility="auto" thumbVisible={inputMode==='mouse'} viewportRef={attachViewport}>
      <div className="mc-pack-settings-content__stack" style={{width:plan.contentWidth*s}}>
        <PackContentTier {...tier} width={plan.contentWidth} scale={s} disabled={disabled||tier.disabled} readOnly={readOnly||tier.readOnly}/>
        <div className="mc-pack-settings-content__generated" data-source-collection="custom_form" data-source-custom-form-length={generated.customFormLength}>
          <ServerCustomContents {...generated.contents} scale={s} disabled={disabled||generated.contents.disabled} readOnly={readOnly||generated.contents.readOnly}
            style={{...generated.contents.style,font:'inherit',color:'inherit'}}/>
        </div>
      </div>
    </ScrollArea>
  </div>;
});

export interface PackSettingsCloseDetail {readonly target:'button.menu_exit';readonly origin:'close'|'escape';readonly control:HTMLElement;readonly event:MouseEvent<HTMLButtonElement>|KeyboardEvent<HTMLDivElement>}
export interface PackSettingsScreenProps extends NativeDiv {
  readonly open:boolean;readonly viewportSize:readonly[number,number];readonly scale:number;readonly title:string;readonly closeLabel:string;
  readonly content:Omit<PackSettingsContentProps,'size'|'scale'>;readonly disabled?:boolean;readonly readOnly?:boolean;readonly closeVisible?:boolean;
  readonly onCloseRequest?:(detail:PackSettingsCloseDetail)=>void|false;
  readonly panelRef?:Ref<HTMLDivElement>;readonly contentRef?:Ref<HTMLDivElement>;readonly closeButtonRef?:Ref<HTMLButtonElement>;
  readonly closeButtonProps?:Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'dangerouslySetInnerHTML'|'type'>;
}
export function planPackSettingsScreen(p:PackSettingsScreenProps){
  sizeValue(p.viewportSize,p.scale);bool(p.open,'open');text(p.title,'title');text(p.closeLabel,'close label');
  for(const name of['disabled','readOnly','closeVisible']as const)if(p[name]!==undefined)bool(p[name],name);
  const panelWidth=Math.min(p.viewportSize[0]-4,370),panelHeight=p.viewportSize[1]-50;
  if(panelWidth<=62||panelHeight<=35)throw new RangeError('Pack Settings viewport cannot contain its source frame/content.');
  const size=[panelWidth-16,panelHeight-31]as const;
  planPackSettingsContent({...p.content,size,scale:p.scale,disabled:p.disabled||p.content.disabled,readOnly:p.readOnly||p.content.readOnly});
  return Object.freeze({panelWidth,panelHeight,size});
}
/** Local logical viewport; modal focus ownership and Escape are Web adapters.
 * Rendering an actual host scene beneath the source dim layer remains host owned. */
export const PackSettingsScreen=forwardRef<HTMLDivElement,PackSettingsScreenProps>(function PackSettingsScreen(p,ref){
  const plan=planPackSettingsScreen(p),{open,viewportSize,scale:s,title,closeLabel,content,disabled=false,readOnly=false,closeVisible=true,onCloseRequest,panelRef,contentRef,closeButtonRef,closeButtonProps={},className,style,hidden,onKeyDown,onCompositionStart,onCompositionEnd,onCompositionStartCapture,onCompositionEndCapture,...native}=p;
  const [root,attach]=useClassicNodeRef(ref),[panel,attachPanel]=useClassicNodeRef(panelRef),[,attachContent]=useClassicNodeRef(contentRef),[close,attachClose]=useClassicNodeRef(closeButtonRef);
  const active=open&&!hidden,titleId=useId(),composing=useRef(new Set<EventTarget>()),generation=useRef(0),live=useRef({active,disabled,closeVisible,onCloseRequest});
  const compositionLease=useRef<{node:HTMLDivElement;release:()=>void}|null>(null);
  useClassicLayoutEffect(()=>{if(live.current.active!==active)generation.current++;live.current={active,disabled,closeVisible,onCloseRequest};if(!active)composing.current.clear();});
  useClassicLayoutEffect(()=>()=>{generation.current++;},[]);
  // React's composition plugin may deliver even synthetic capture from its
  // delegated bubble listener. Observe native capture before descendants can
  // stop that bubble path. Reconcile node/visibility without clearing an
  // existing composition or replacing listeners on ordinary prop commits.
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
  const request=(event:MouseEvent<HTMLButtonElement>|KeyboardEvent<HTMLDivElement>,origin:PackSettingsCloseDetail['origin'])=>{
    const owner=event.currentTarget,version=generation.current;
    const valid=()=>live.current.active&&!live.current.disabled&&generation.current===version&&classicModalOwnsInput(root.current)&&!!root.current?.contains(owner)&&!isComposing()&&!owner.closest('[hidden],[inert]')&&(origin!=='close'||live.current.closeVisible&&close.current===owner&&!close.current.disabled);
    if(blocked(event)||!valid())return;
    deferClassicRequest(event,owner,snapshot=>live.current.onCloseRequest?.({target:'button.menu_exit',origin,control:owner,event:snapshot}),valid);
  };
  const vars={'--mc-pack-settings-close':image('textures/ui/close_button_default'),'--mc-pack-settings-close-hover':image('textures/ui/close_button_hover'),'--mc-pack-settings-close-pressed':image('textures/ui/close_button_pressed')}as CSSProperties;
  return <div {...native} ref={attach} role={native.role??'dialog'} aria-modal={native['aria-modal']??true} aria-labelledby={native['aria-label']?native['aria-labelledby']:native['aria-labelledby']??titleId} hidden={hidden||!open}
    className={['mc-pack-settings-screen',className].filter(Boolean).join(' ')} style={styleValue(s,{...style,...vars,width:viewportSize[0]*s,height:viewportSize[1]*s})}
    onCompositionStartCapture={event=>{composing.current.add(event.target);onCompositionStartCapture?.(event);}}
    onCompositionEndCapture={event=>{composing.current.delete(event.target);onCompositionEndCapture?.(event);}}
    onCompositionStart={onCompositionStart}
    onCompositionEnd={onCompositionEnd}
    onKeyDown={event=>{onKeyDown?.(event);if(blocked(event)||event.nativeEvent.isComposing||event.keyCode===229)return;
      if(event.key==='Tab'&&active){deferClassicEvent(event,event.currentTarget,snapshot=>classicModalTab(snapshot,root.current,panel.current),()=>live.current.active);return;}
      if(event.key==='Escape'&&!event.repeat&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey)request(event,'escape');}}>
    <div className="mc-pack-settings-screen__dim" aria-hidden="true"><ClassicSkin asset={resourcePackAssets['textures/ui/screen_background']} width={viewportSize[0]} height={viewportSize[1]} scale={s} baseClass="mc-pack-settings-skin"/></div>
    <div ref={attachPanel} className="mc-pack-settings-screen__panel" tabIndex={-1} style={{left:(viewportSize[0]-plan.panelWidth)*s/2,top:(viewportSize[1]-plan.panelHeight)*s/2,width:plan.panelWidth*s,height:plan.panelHeight*s}}>
      <span className="mc-pack-settings-screen__underfill" aria-hidden="true"><ClassicSkin asset={resourcePackAssets['textures/ui/control']} width={plan.panelWidth-8} height={plan.panelHeight-8} scale={s} baseClass="mc-pack-settings-skin"/></span>
      <ClassicSkin asset={resourcePackAssets['textures/ui/dialog_background_hollow_3']} width={plan.panelWidth} height={plan.panelHeight} scale={s} baseClass="mc-pack-settings-skin" className="mc-pack-settings-screen__hollow"/>
      <div id={titleId} className="mc-pack-settings-screen__title">{title}</div>
      <button {...closeButtonProps} ref={attachClose} type="button" hidden={!closeVisible||closeButtonProps.hidden} disabled={disabled||closeButtonProps.disabled} aria-label={closeButtonProps['aria-label']??closeLabel}
        className={['mc-pack-settings-screen__close',closeButtonProps.className].filter(Boolean).join(' ')} onClick={event=>{closeButtonProps.onClick?.(event);request(event,'close');}}/>
      <div ref={attachContent} className="mc-pack-settings-screen__content"><PackSettingsContent {...content} size={plan.size} scale={s} disabled={disabled||content.disabled} readOnly={readOnly||content.readOnly}/></div>
    </div>
  </div>;
});
