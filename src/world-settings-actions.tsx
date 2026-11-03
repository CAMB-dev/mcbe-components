import {forwardRef, useRef, version as reactVersion} from 'react';
import type {ButtonHTMLAttributes, CSSProperties, HTMLAttributes, MouseEvent, Ref,ForwardedRef,ReactNode} from 'react';
import {ClassicSkin} from './classic-skin';
import type {ClassicSkinAsset} from './classic-skin';
import {resourcePackAssets} from './resource-pack-assets';
import {worldActionAssets} from './world-settings-assets';
import {deferClassicRequest, useClassicLayoutEffect, useClassicNodeRef} from './classic-screen-lifecycle';

export interface WorldSettingsFont {
  readonly family:string; readonly size:number; readonly lineHeight:number;
}
export interface WorldSettingsActionDetail {
  /** Exact host-resolved source name; no automatic `button.` prefix. */
  readonly target:string; readonly control:HTMLButtonElement; readonly event:MouseEvent<HTMLButtonElement>;
}
export interface WorldSettingsActionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'|'type'|'onChange'> {
  readonly children?:never; readonly dangerouslySetInnerHTML?:never;
  readonly inert?:boolean;
  readonly size:readonly[number,number]; readonly scale:number; readonly font:WorldSettingsFont;
  readonly label:string; readonly target:string;
  readonly tone:'light'|'dark'|'realms';
  /** Resolved source $button_text_max_size Y, in logical units. */
  readonly labelMaxHeight:number;
  readonly onAction?:(detail:WorldSettingsActionDetail)=>void;
}
export interface WorldLaunchButtonState {readonly label:string; readonly enabled:boolean; readonly labelMaxHeight:number}
export type WorldSettingsMode='create'|'template-create'|'edit';
export type WorldLaunchModel=
  | {readonly edition:'bedrock'; readonly mode:WorldSettingsMode; readonly pregame:boolean; readonly editor:boolean;
      readonly primary:WorldLaunchButtonState; readonly realms:WorldLaunchButtonState&{readonly visible:boolean}}
  | {readonly edition:'education'; readonly mode:WorldSettingsMode; readonly pregame:boolean;
      readonly play:WorldLaunchButtonState; readonly host:WorldLaunchButtonState};
export type WorldLaunchButtonKind='primary'|'realms'|'play'|'host';
export type WorldLaunchTarget='create_world_button'|'play_world_button'|'create_world_on_realm_button'|'play_world_on_realm_button'|'create_world_edu_button'|'play_world_edu_button';
export interface WorldLaunchActionDetail extends Omit<WorldSettingsActionDetail,'target'> {
  readonly target:WorldLaunchTarget; readonly edition:WorldLaunchModel['edition']; readonly mode:WorldSettingsMode;
  readonly button:WorldLaunchButtonKind; readonly shouldHost?:boolean;
}
export interface WorldLaunchActionsProps extends Omit<HTMLAttributes<HTMLDivElement>,'children'|'onChange'> {
  readonly children?:never; readonly dangerouslySetInnerHTML?:never;
  readonly inert?:boolean; readonly width:number; readonly scale:number; readonly font:WorldSettingsFont;
  readonly model:WorldLaunchModel;
  /** Explicit Web policy for source visible:false; ignored nodes always disappear. */
  readonly hiddenSlots:'reserve'|'collapse';
  readonly disabled?:boolean; readonly onAction?:(detail:WorldLaunchActionDetail)=>void;
  readonly buttonRefs?:Readonly<Partial<Record<WorldLaunchButtonKind,Ref<HTMLButtonElement>>>>;
  readonly buttonProps?:Readonly<Partial<Record<WorldLaunchButtonKind,Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'dangerouslySetInnerHTML'|'type'|'disabled'|'hidden'>>>>;
}

const bounded=(value:number,name:string,maximum=8192)=>{
  if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>maximum)throw new RangeError(`World settings ${name} must be finite and positive within ${maximum}.`);
};
const boolean=(value:boolean,name:string)=>{if(typeof value!=='boolean')throw new TypeError(`World settings ${name} must be boolean.`);};
function snapshotFont(input:WorldSettingsFont):WorldSettingsFont {
  if(!input||typeof input.family!=='string'||!input.family.trim()||input.family.length>4096)throw new TypeError('World settings needs an explicit font family.');
  bounded(input.size,'font size');bounded(input.lineHeight,'line height');
  return Object.freeze({family:input.family,size:input.size,lineHeight:input.lineHeight});
}
function frame(width:number,height:number,scale:number,font:WorldSettingsFont):CSSProperties {
  if(!Number.isSafeInteger(scale)||scale<1||scale>32)throw new RangeError('World settings scale must be an integer 1..32.');
  bounded(width,'logical width');bounded(height,'logical height');bounded(width*scale,'physical width');bounded(height*scale,'physical height');
  if(width<=2||height<=2||width*height*scale*scale>16777216)throw new RangeError('World settings dimensions must exceed the source skin inset and fit 16777216 pixels.');
  const f=snapshotFont(font);
  bounded(f.size*scale,'physical font size');bounded(f.lineHeight*scale,'physical line height');
  return {width:width*scale,height:height*scale,fontFamily:f.family,fontSize:f.size*scale,lineHeight:`${f.lineHeight*scale}px`,'--mc-world-action-u':`${scale}px`}as CSSProperties;
}
const inertAttributes=(inert:boolean|undefined)=>{
  if(inert!==undefined)boolean(inert,'inert');
  return {inert:inert?(Number.parseInt(reactVersion,10)<19?'':true):undefined}as Record<string,string|boolean|undefined>;
};
function available(node:HTMLElement|null):boolean {
  if(!node?.isConnected||node.closest('[hidden],[inert]')||!node.getClientRects().length||node.ownerDocument.defaultView?.getComputedStyle(node).visibility==='hidden')return false;
  try {
    const doc=node.ownerDocument;
    return !doc.querySelector('dialog:modal')||!!doc.activeElement?.closest('dialog:modal')?.contains(node);
  }catch{return true;}
}
function skinBank(tone:WorldSettingsActionButtonProps['tone']):readonly ClassicSkinAsset[] {
  if(tone==='realms')return [worldActionAssets.realms,worldActionAssets.realmsHover,worldActionAssets.realmsPressed,resourcePackAssets['textures/ui/disabledButtonNoBorder']];
  if(tone!=='light'&&tone!=='dark')throw new TypeError('World settings action tone must be light, dark or realms.');
  if(tone==='dark')return [worldActionAssets.dark,worldActionAssets.darkHover,worldActionAssets.darkPressed,resourcePackAssets['textures/ui/disabledButtonNoBorder']];
  return [resourcePackAssets['textures/ui/button_borderless_light'],resourcePackAssets['textures/ui/button_borderless_lighthover'],
    resourcePackAssets['textures/ui/button_borderless_lightpressed'],resourcePackAssets['textures/ui/disabledButtonNoBorder']];
}

/** Actual settings_common.action_button material graph, with explicit host metrics. */
function useSourceWorldSettingsActionButton(props:WorldSettingsActionButtonProps,ref:ForwardedRef<HTMLButtonElement>,displayLabel:ReactNode){
  const {size,scale,font,label,target,tone,labelMaxHeight,onAction,inert,disabled=false,hidden,className,style,onClick,onKeyDown,...native}=props;
  if(!Array.isArray(size)||size.length!==2)throw new TypeError('World settings action size requires two axes.');
  const geometry=frame(size[0],size[1],scale,font),bank=skinBank(tone);
  if(typeof label!=='string'||typeof target!=='string'||!target.trim()||target.length>4096)throw new TypeError('World settings actions need host label and source target text.');
  bounded(labelMaxHeight,'label max height');boolean(disabled,'disabled');
  const [node,attach]=useClassicNodeRef(ref),live=useRef({target,disabled,hidden,onAction});
  useClassicLayoutEffect(()=>{live.current={target,disabled,hidden,onAction};});
  return <button {...native} {...inertAttributes(inert)} ref={attach} type="button" disabled={disabled} hidden={hidden}
    className={['mc-world-settings-action',className].filter(Boolean).join(' ')} data-tone={tone} data-source-target={target}
    style={{...style,...geometry}} onKeyDown={event=>{onKeyDown?.(event);if(!event.defaultPrevented&&(event.nativeEvent.isComposing||event.keyCode===229)&&['Enter',' '].includes(event.key))event.preventDefault();}}
    onClick={event=>{
      const owner=event.currentTarget,captured=live.current;
      onClick?.(event);if(event.defaultPrevented||event.nativeEvent.defaultPrevented||disabled)return;
      const valid=()=>node.current===owner&&live.current===captured&&!captured.disabled&&!captured.hidden&&!owner.disabled&&available(owner);
      deferClassicRequest(event,owner,snapshot=>{if(valid())captured.onAction?.(Object.freeze({target:captured.target,control:owner,event:snapshot}));},valid);
    }}>
    <span className="mc-world-settings-action__skins" aria-hidden="true">{bank.map((asset,index)=><ClassicSkin key={index} asset={asset} width={size[0]-2} height={size[1]-2} scale={scale} baseClass="mc-world-settings-action-skin" className={`mc-world-settings-action-${['idle','hover','pressed','locked'][index]}`}/>)}</span>
    <span className="mc-world-settings-action__outline" aria-hidden="true"><ClassicSkin asset={resourcePackAssets['textures/ui/focus_border_white']} width={size[0]} height={size[1]} scale={scale} baseClass="mc-world-settings-action-skin"/></span>
    <span className="mc-world-settings-action__content"><span style={{maxHeight:labelMaxHeight*scale}}>{displayLabel}</span></span>
  </button>;
 }
/** Public source action keeps its original string-only label and exact DOM. */
export const WorldSettingsActionButton=forwardRef<HTMLButtonElement,WorldSettingsActionButtonProps>(function WorldSettingsActionButton(props,ref){
  const {displayLabel:_unsupported,...sourceProps}=props as WorldSettingsActionButtonProps&{displayLabel?:unknown};void _unsupported;
  return useSourceWorldSettingsActionButton(sourceProps,ref,props.label);
});
/** Private shared source kernel; not exported from the package barrel. */
export interface SourceWorldSettingsActionButtonProps extends WorldSettingsActionButtonProps {readonly displayLabel:ReactNode}
export const SourceWorldSettingsActionButton=forwardRef<HTMLButtonElement,SourceWorldSettingsActionButtonProps>(function SourceWorldSettingsActionButton({displayLabel,...props},ref){
  return useSourceWorldSettingsActionButton(props,ref,displayLabel);
});

/** Exact 35-unit Bedrock/EDU launch row; no world creation or account service. */
export const WorldLaunchActions=forwardRef<HTMLDivElement,WorldLaunchActionsProps>(function WorldLaunchActions(
  {width,scale,font,model,hiddenSlots,disabled=false,inert,onAction,buttonRefs,buttonProps,className,style,hidden,...native},ref,
){
  const geometry=frame(width,35,scale,font);boolean(disabled,'disabled');
  if(!model||!['create','template-create','edit'].includes(model.mode)||!['bedrock','education'].includes(model.edition))throw new TypeError('World launch needs a source edition and mode.');
  boolean(model.pregame,'pregame');
  if(hiddenSlots!=='reserve'&&hiddenSlots!=='collapse')throw new TypeError('World launch requires an explicit hidden-slot policy.');
  type Item={kind:WorldLaunchButtonKind;state:WorldLaunchButtonState;visible:boolean;target:WorldLaunchTarget;tone:WorldSettingsActionButtonProps['tone'];shouldHost?:boolean;fraction:number};
  const items:Item[]=[],edit=model.mode==='edit';
  if(model.edition==='bedrock'){
    boolean(model.editor,'editor');boolean(model.realms?.visible,'realm visibility');
    const realm=!model.editor,realmSpace=realm&&(model.realms.visible||hiddenSlots==='reserve');
    items.push({kind:'primary',state:model.primary,visible:true,target:edit?'play_world_button':'create_world_button',tone:'light',fraction:realmSpace?.5:1});
    if(realm)items.push({kind:'realms',state:model.realms,visible:model.realms.visible,target:edit?'play_world_on_realm_button':'create_world_on_realm_button',tone:'realms',fraction:.5});
  }else{
    items.push({kind:'play',state:model.play,visible:true,target:edit?'play_world_edu_button':'create_world_edu_button',tone:'light',shouldHost:false,fraction:.5},
      {kind:'host',state:model.host,visible:true,target:edit?'play_world_edu_button':'create_world_edu_button',tone:'light',shouldHost:true,fraction:.5});
  }
  for(const item of items){if(!item.state||typeof item.state.label!=='string')throw new TypeError('World launch needs each resolved button label.');boolean(item.state.enabled,'button enabled');bounded(item.state.labelMaxHeight,'label max height');}
  const [node,attach]=useClassicNodeRef(ref),live=useRef({model,disabled,onAction});
  useClassicLayoutEffect(()=>{live.current={model,disabled,onAction};});
  if(!model.pregame)return null;
  let x=0;
  return <div {...native} {...inertAttributes(inert)} ref={attach} hidden={hidden}
    className={['mc-world-launch-actions',className].filter(Boolean).join(' ')} style={{...style,...geometry}}
    data-source-edition={model.edition} data-source-mode={model.mode} data-hidden-slots={hiddenSlots}>
    {items.map(item=>{
      if(!item.visible&&hiddenSlots==='collapse')return null;
      const left=x,w=width*item.fraction;x+=w;
      const props=buttonProps?.[item.kind]??{};
      return <WorldSettingsActionButton {...props} key={item.kind} ref={buttonRefs?.[item.kind]} size={[w,35]} scale={scale} font={font}
        label={item.state.label} labelMaxHeight={item.state.labelMaxHeight} target={item.target} tone={item.tone} disabled={disabled||!item.state.enabled||!item.visible}
        className={['mc-world-launch-actions__button',props.className].filter(Boolean).join(' ')} style={{...props.style,left:left*scale,visibility:item.visible?undefined:'hidden'}}
        data-world-launch-button={item.kind} data-should-host={item.shouldHost}
        onAction={detail=>{if(available(node.current)&&!live.current.disabled&&live.current.model===model)live.current.onAction?.(Object.freeze({...detail,target:item.target,edition:model.edition,mode:model.mode,button:item.kind,...(item.shouldHost===undefined?{}:{shouldHost:item.shouldHost})}));}}/>;
    })}
  </div>;
});
