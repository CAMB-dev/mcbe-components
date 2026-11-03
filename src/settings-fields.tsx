import {forwardRef,useCallback,useEffect,useId,useRef,useState,version as reactVersion} from 'react';
import {createPortal} from 'react-dom';
import type {CSSProperties,RefObject,Ref} from 'react';
import {ClassicSkin} from './classic-skin';
import {resourcePackAssets} from './resource-pack-assets';
import {settingsFieldAssets as assets} from './settings-fields-assets';
import {WorldSettingsActionButton,SourceWorldSettingsActionButton} from './world-settings-actions';
import {ScrollArea} from './scroll-area';
import {serverFormImageAssets} from './server-form-image-assets';
import {useClassicLayoutEffect,useClassicNodeRef} from './classic-screen-lifecycle';
import {allocatedSettingsRow,snapshotSettingsFields} from './settings-fields-data';
import {settingsFieldAvailable as available,settingsFieldCanInteract} from './settings-fields-interaction';
import type {WorldSettingsActionButtonProps} from './world-settings-actions';
import {parseSettingsFieldText} from './settings-field-text';
import type {SettingsFieldsSnapshot} from './settings-fields-data';
import type {SettingsFieldIdentity,SettingsFieldRow,SettingsFieldsProps,SettingsFieldsRequest,SettingsOptionLayout,SettingsInfoRow,SettingsTextRow,SettingsTextActionRow,SettingsDropdownRow,SettingsRadioRow,SettingsToggleRow,SettingsSliderRow,SettingsPermissionRow,SettingsFieldNativeButtonProps,SettingsPanelRow} from './settings-fields-model';
export type * from './settings-fields-model';

const inert=(value:boolean)=>({inert:value?(Number.parseInt(reactVersion,10)<19?'':true):undefined}as Record<string,string|boolean|undefined>);
const font=(f:SettingsFieldsSnapshot['typography']['label'],s:number):CSSProperties=>({fontFamily:f.family,fontSize:f.size*s,lineHeight:`${f.lineHeight*s}px`});
const identity=(r:SettingsFieldIdentity):SettingsFieldIdentity=>Object.freeze({id:r.id,sourceControl:r.sourceControl,...(r.binding?{binding:r.binding}:{}),...(r.enabledBinding?{enabledBinding:r.enabledBinding}:{}),...(r.collection?{collection:r.collection}:{})});
interface Environment {snap:SettingsFieldsSnapshot;instanceId:string;typography:SettingsFieldsSnapshot['typography'];props:SettingsFieldsProps;root:RefObject<HTMLDivElement|null>;committed:RefObject<SettingsFieldsSnapshot>;composing:Set<EventTarget>}
interface RowContext {env:Environment;row:SettingsFieldRow;width:number;disabled:boolean}
function displayText(env:Environment,text:string){
  if(!env.snap.textFormatting)return text;
  return parseSettingsFieldText(text,env.snap.textFormatting).runs.map((run,index)=><span key={index} data-settings-text-run="" style={run.color?{color:`rgb(${run.color.map(v=>v*100+'%').join(' ')})`}:undefined}>{run.text}</span>);
}
const visibleText=(env:Environment,text:string)=>parseSettingsFieldText(text,env.snap.textFormatting).text;
const defaultName=(env:Environment,text:string,native:{'aria-label'?:string;'aria-labelledby'?:string})=>native['aria-label']??(native['aria-labelledby']!==undefined?undefined:visibleText(env,text));
function SourceAction({env,buttonRef,...props}:WorldSettingsActionButtonProps&{env:Environment;buttonRef?:Ref<HTMLButtonElement>}){
  return env.snap.textFormatting?<SourceWorldSettingsActionButton {...props} ref={buttonRef} displayLabel={displayText(env,props.label)} aria-label={defaultName(env,props.label,props)}/>:<WorldSettingsActionButton {...props} ref={buttonRef}/>;
}

const canInteract=(c:RowContext,owner:HTMLElement,disabled=c.disabled)=>!busy(c.env)&&settingsFieldCanInteract(owner,c.env.root.current,{current:c.env.committed.current===c.env.snap,disabled,readOnly:c.env.snap.readOnly,hidden:c.env.snap.hidden,inert:c.env.snap.inert});
const optionIds=(c:RowContext)=>({label:`${c.env.instanceId}-${encodeURIComponent(c.row.id)}-label`,description:`${c.env.instanceId}-${encodeURIComponent(c.row.id)}-description`});
function optionAria(c:RowContext,native:{'aria-label'?:string;'aria-labelledby'?:string;'aria-describedby'?:string}){
  if(!('option'in c.row)||!c.row.option)return{};const ids=optionIds(c),o=c.row.option;
  return {'aria-label':native['aria-label']??(!o.showLabel&&native['aria-labelledby']===undefined?visibleText(c.env,o.label):undefined),'aria-labelledby':native['aria-labelledby']??(native['aria-label']===undefined&&o.showLabel?ids.label:undefined),'aria-describedby':[native['aria-describedby'],o.showLabel&&o.description!==null?ids.description:undefined].filter(Boolean).join(' ')||undefined};
}
function busy(env:Environment){for(const target of env.composing)if(!(target as Node).isConnected||!env.root.current?.contains(target as Node))env.composing.delete(target);return env.composing.size>0;}
function post(c:RowContext,control:HTMLInputElement|HTMLButtonElement,event:Event,payload:Omit<SettingsFieldsRequest,'identity'|'control'|'nativeEvent'>,veto:()=>boolean=()=>false,after?:()=>void,anchor:()=>boolean=()=>true){
  const captured=c.env.snap,owner=c.env.root.current;
  const valid=()=>c.env.root.current===owner&&(!!owner?.contains(control)||!!c.env.props.popupHost?.contains(control))&&!busy(c.env)&&settingsFieldCanInteract(control,owner,{current:c.env.committed.current===captured,disabled:c.disabled||captured.disabled,readOnly:captured.readOnly,hidden:captured.hidden,inert:captured.inert})&&!event.defaultPrevented&&!veto()&&anchor();
  control.ownerDocument.defaultView?.setTimeout(()=>{if(valid()){const accepted=c.env.props.onRequest?.(Object.freeze({...payload,identity:identity(c.row),control,nativeEvent:event}));if(accepted!==false)after?.();}},0);
}
const Skin=({name,width,height,s,className=''}:{name:keyof typeof assets;width:number;height:number;s:number;className?:string})=><ClassicSkin asset={assets[name]} width={width} height={height} scale={s} baseClass="mc-settings-field-skin" className={className}/>;
function NativeButton({c,keyId,props={},children,onActivate,className='',style,disabled=c.disabled,...aria}:{c:RowContext;keyId:string;props?:SettingsFieldNativeButtonProps;children:React.ReactNode;onActivate:(node:HTMLButtonElement,event:React.MouseEvent<HTMLButtonElement>)=>void;className?:string;style?:CSSProperties;disabled?:boolean}&Pick<React.ButtonHTMLAttributes<HTMLButtonElement>,'role'|'aria-checked'|'aria-expanded'|'aria-controls'|'aria-label'|'tabIndex'>){
  const[,attach]=useClassicNodeRef(c.env.props.buttonRefs?.[keyId]);
  return <button {...props} {...aria} ref={attach} type="button" disabled={disabled} aria-readonly={c.env.snap.readOnly||undefined} className={className} style={{...props.style,...style}}
    onClick={event=>{const owner=event.currentTarget;props.onClick?.(event);if(event.defaultPrevented||event.nativeEvent.defaultPrevented||!canInteract(c,owner,disabled))return;onActivate(owner,event);}}
    onKeyDown={event=>{props.onKeyDown?.(event);if((event.nativeEvent.isComposing||event.keyCode===229||c.env.snap.readOnly)&&['Enter',' '].includes(event.key))event.preventDefault();}}>{children}</button>;
}
function Toggle({c}:{c:RowContext&{row:SettingsToggleRow}}){
  const{row:r,env}=c,s=env.snap.scale,attributes=env.props.inputProps?.[r.id]??{},[,attach]=useClassicNodeRef(env.props.inputRefs?.[r.id]);
  return <span className="mc-settings-toggle" data-checked={r.checked} data-locked={c.disabled} style={{width:c.width*s,height:16*s}}>
    <input {...attributes} {...optionAria(c,attributes)} ref={attach} type="checkbox" checked={r.checked} disabled={c.disabled} readOnly={env.snap.readOnly} aria-readonly={env.snap.readOnly||undefined} data-source-toggle={r.toggleName} data-binding-condition={r.bindingCondition}
      onClick={event=>{attributes.onClick?.(event);if(env.snap.readOnly)event.preventDefault();}}
      onKeyDown={event=>{attributes.onKeyDown?.(event);if((env.snap.readOnly||event.nativeEvent.isComposing||event.keyCode===229)&&[' ','Enter'].includes(event.key))event.preventDefault();}}
      onChange={event=>{const owner=event.currentTarget,next=owner.checked;event.persist();attributes.onChange?.(event);owner.checked=r.checked;post(c,owner,event.nativeEvent,{kind:'change',target:r.binding,previousValue:r.checked,proposedValue:next},()=>event.defaultPrevented);}}/>
    {(['normal','hover']as const).map(state=><span key={state} className={`mc-settings-toggle__${state}`}><Skin name={`toggle_${r.checked?'on':'off'}${state==='hover'?'_hover':''}`} width={30} height={16} s={s}/></span>)}
  </span>;
}
function TextInput({c,width}:{c:RowContext&{row:SettingsTextRow|SettingsTextActionRow};width:number}){
  const{env,row:r}=c,s=env.snap.scale,attributes=env.props.inputProps?.[r.id]??{},[node,attach]=useClassicNodeRef(env.props.inputRefs?.[r.id]);
  const[draft,setDraft]=useState(r.value),lease=useRef({active:false,ending:undefined as string|undefined}),live=useRef(c);live.current=c;
  useClassicLayoutEffect(()=>{if(!lease.current.active)setDraft(r.value);},[r.value]);
  useClassicLayoutEffect(()=>{
    const input=node.current;if(!input)return;const doc=input.ownerDocument;
    const start=(event:CompositionEvent)=>{if(event.target===input){lease.current.active=true;lease.current.ending=undefined;}};
    const end=(event:CompositionEvent)=>{if(event.target!==input)return;const value=input.value,current=live.current,accepted=(current.row as SettingsTextRow).value;lease.current.active=false;lease.current.ending=value;setDraft(accepted);
      if(value!==accepted)post(current,input,event,{kind:'change',target:current.row.binding!,previousValue:accepted,proposedValue:value});};
    doc.addEventListener('compositionstart',start,true);doc.addEventListener('compositionend',end,true);
    return()=>{doc.removeEventListener('compositionstart',start,true);doc.removeEventListener('compositionend',end,true);lease.current.active=false;env.composing.delete(input);};
  },[node,env.composing]);
  return <span className="mc-settings-text" data-locked={c.disabled} style={{width:width*s,height:30*s}}>
    <span className="mc-settings-text__normal"><Skin name="edit_box_indent" width={width} height={30} s={s}/></span><span className="mc-settings-text__hover"><Skin name="edit_box_indent_hover" width={width} height={30} s={s}/></span>
    <input {...attributes} {...optionAria(c,attributes)} ref={attach} type="text" value={draft} maxLength={r.maxLength} placeholder={r.placeholder} disabled={c.disabled} readOnly={env.snap.readOnly} inputMode={attributes.inputMode??(r.sourceTextType==='NumberChars'?'numeric':'text')}
      data-source-text-type={r.sourceTextType} data-source-text-box={r.textBoxName} data-source-allow-data-binding={r.allowDataBinding}
      onChange={event=>{const owner=event.currentTarget,next=owner.value;event.persist();attributes.onChange?.(event);
        if(lease.current.active||(event.nativeEvent as InputEvent).isComposing){setDraft(next);return;}
        const ended=lease.current.ending===next;lease.current.ending=undefined;owner.value=r.value;setDraft(r.value);if(!ended&&next!==r.value)post(c,owner,event.nativeEvent,{kind:'change',target:r.binding,previousValue:r.value,proposedValue:next},()=>event.defaultPrevented);
      }}
      onKeyDown={event=>{attributes.onKeyDown?.(event);if(event.defaultPrevented||event.nativeEvent.defaultPrevented)return;
        if(lease.current.active||event.nativeEvent.isComposing||event.keyCode===229){if(event.key==='Escape'||event.key==='Enter')event.stopPropagation();return;}
        if(event.key==='Escape'||event.key==='Enter'){event.preventDefault();event.stopPropagation();event.currentTarget.blur();}
      }}
      onBlur={event=>{attributes.onBlur?.(event);lease.current.active=false;lease.current.ending=undefined;env.composing.delete(event.currentTarget);setDraft(r.value);}}/>
  </span>;
}
function TextAction({c}:{c:RowContext&{row:SettingsTextActionRow}}){
  const{row:r,env}=c,s=env.snap.scale,textWidth=c.width*r.textFraction,actionWidth=c.width-textWidth,keyId=`${r.id}:action`,a=r.action,attributes=env.props.buttonProps?.[keyId]??{};
  const activate=(control:HTMLButtonElement,event:React.MouseEvent<HTMLButtonElement>)=>post(c,control,event.nativeEvent,{kind:'action',target:a.target},()=>event.defaultPrevented);
  return <span className="mc-settings-text-action" style={{width:c.width*s,height:30*s}}>
    {a.presentation==='mock-arrow'?<NativeButton c={c} keyId={r.id} props={env.props.buttonProps?.[r.id]} disabled={c.disabled||!a.enabled} className="mc-settings-mock" style={{width:textWidth*s,height:30*s}} onActivate={activate}>
      <Skin name="edit_box_indent" width={textWidth} height={30} s={s}/><span className="mc-settings-mock__hover"><Skin name="edit_box_indent_hover" width={textWidth} height={30} s={s}/></span><span className="mc-settings-mock__label">{r.value}</span>
    </NativeButton>:<TextInput c={c} width={textWidth}/>}
    <span style={{position:'absolute',left:textWidth*s,top:0,width:actionWidth*s,height:30*s}}>
      {a.presentation==='text'?<SourceAction env={env} {...attributes} buttonRef={env.props.buttonRefs?.[keyId]} size={[actionWidth,30]} scale={s} font={env.typography.control} label={a.label} target={a.target} tone="light" labelMaxHeight={a.labelMaxHeight} disabled={c.disabled||!a.enabled}
        onAction={detail=>post(c,detail.control,detail.event.nativeEvent,{kind:'action',target:a.target},()=>detail.event.defaultPrevented)}/>:
        <NativeButton c={c} keyId={keyId} props={attributes} disabled={c.disabled||!a.enabled} aria-label={defaultName(env,a.label,attributes)} className="mc-settings-arrow-action" style={{width:actionWidth*s,height:30*s}} onActivate={activate}>
          <ButtonPaint width={actionWidth} height={30} s={s}/><img className="mc-settings-arrow-action__glyph" src={assets.arrowRight.url} alt="" width={8*s} height={8*s}/>
        </NativeButton>}
    </span>
  </span>;
}
function ButtonPaint({width,height,s,checked=false}:{width:number;height:number;s:number;checked?:boolean}){
  const names=['button_borderless_light','button_borderless_lighthover','button_borderless_lightpressed','disabledButtonNoBorder']as const;
  return <><span className="mc-settings-button-paint" aria-hidden="true">{names.map((name,index)=><span key={name} className={`mc-settings-button-paint__${['normal','hover','pressed','locked'][index]}`}><ClassicSkin asset={checked&&index===0?assets.button_borderless_lightpressednohover:resourcePackAssets[`textures/ui/${name}`]} width={width-2} height={height-2} scale={s} baseClass="mc-settings-field-skin"/></span>)}</span>
    <span className="mc-settings-button-outline" aria-hidden="true"><ClassicSkin asset={resourcePackAssets['textures/ui/focus_border_white']} width={width} height={height} scale={s} baseClass="mc-settings-field-skin"/></span></>;
}
function Dropdown({c,permission}:{c:RowContext&{row:SettingsDropdownRow};permission?:SettingsPermissionRow}){
  const{env,row:r}=c,s=env.snap.scale,[open,setOpen]=useState(false),[position,setPosition]=useState({x:0,y:0}),id=useId(),trigger=useRef<HTMLButtonElement|null>(null),popup=useRef<HTMLDivElement|null>(null),choiceNodes=useRef<(HTMLButtonElement|null)[]>([]);
  const[,attachTrigger]=useClassicNodeRef(env.props.buttonRefs?.[r.id],trigger),[,viewportRef]=useClassicNodeRef(env.props.popupViewportRefs?.[r.id]);
  const enabled=r.choices.map((choice,index)=>!choice.ignored&&choice.visible&&choice.enabled?index:-1).filter(index=>index>=0);
  useEffect(()=>{if(c.disabled||!r.visible||env.snap.hidden||env.snap.inert)setOpen(false);},[c.disabled,r.visible,env.snap.hidden,env.snap.inert]);
  useClassicLayoutEffect(()=>{
    const owner=trigger.current;if(!open||!owner)return;const doc=owner.ownerDocument,view=doc.defaultView!,host=env.props.popupHost;
    if(host&&(!host.isConnected||host.ownerDocument!==doc))throw new TypeError('SettingsFields popupHost must be connected in the trigger ownerDocument.');
    const locate=()=>{if(!host){setPosition({x:0,y:r.popup.placement==='below'?30*s:-r.popup.height*s});return;}const box=owner.getBoundingClientRect(),base=host.getBoundingClientRect();setPosition({x:box.left-base.left+host.scrollLeft-host.clientLeft,y:(r.popup.placement==='below'?box.bottom:box.top-r.popup.height*s)-base.top+host.scrollTop-host.clientTop});};
    const outside=(event:Event)=>{if(!owner.contains(event.target as Node)&&!popup.current?.contains(event.target as Node))setOpen(false);};
    const key=(event:KeyboardEvent)=>{if(event.defaultPrevented||event.isComposing||event.keyCode===229)return;
      const active=doc.activeElement,inside=active===owner||!!popup.current?.contains(active);if(!inside)return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);owner.focus();}
      else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();event.stopPropagation();const current=enabled.findIndex(index=>choiceNodes.current[index]===active),next=event.key==='Home'?0:event.key==='End'?enabled.length-1:Math.max(0,Math.min(enabled.length-1,current+(event.key==='ArrowDown'?1:-1)));choiceNodes.current[enabled[next]??-1]?.focus();}
      else if(event.key==='Tab')setOpen(false);
    };
    doc.addEventListener('pointerdown',outside,true);doc.addEventListener('keydown',key);view.addEventListener('resize',locate);view.addEventListener('scroll',locate,true);locate();
    return()=>{doc.removeEventListener('pointerdown',outside,true);doc.removeEventListener('keydown',key);view.removeEventListener('resize',locate);view.removeEventListener('scroll',locate,true);};
  },[open,r,c.disabled,s,env.props.popupHost]);
  const native=env.props.buttonProps?.[r.id]??{};
  const aria=optionAria(c,native),faceId=`${id}-value`;
  if(native['aria-label']===undefined&&native['aria-labelledby']===undefined){
    if(r.option.showLabel)aria['aria-labelledby']=[aria['aria-labelledby'],faceId].filter(Boolean).join(' ');
    else aria['aria-label']=[visibleText(env,r.option.label),visibleText(env,r.faceLabel)].filter(Boolean).join(' ');
  }
  const toggle=(event:React.MouseEvent<HTMLButtonElement>)=>{const owner=event.currentTarget;native.onClick?.(event);if(!event.defaultPrevented&&!event.nativeEvent.defaultPrevented&&canInteract(c,owner))setOpen(!open);};
  const list=<div ref={popup} id={id} className="mc-settings-dropdown-popup" role="dialog" aria-label={r.popup.label} data-source-layer="42" data-popup-owner={r.id} style={{position:'absolute',left:position.x,top:position.y,width:c.width*s,height:r.popup.height*s,...font(env.typography.control,s),'--mc-settings-u':`${s}px`,'--mc-skin-scroll-track':`url(${JSON.stringify(resourcePackAssets['textures/ui/ScrollRail'].url)})`,'--mc-skin-scroll-thumb':`url(${JSON.stringify(resourcePackAssets['textures/ui/ScrollHandle'].url)})`}as CSSProperties}
    onKeyDown={event=>{if(event.defaultPrevented||event.nativeEvent.defaultPrevented||event.nativeEvent.isComposing||event.keyCode===229)return;if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);trigger.current?.focus();}else if(event.key==='Tab'){setOpen(false);trigger.current?.focus();}}}>
    <Skin name="dropdown_background" width={c.width} height={r.popup.height} s={s}/>
    {r.popup.scrolling?<ScrollArea variant={r.popup.inputMode==='mouse'?'document':'touch'} scale={s} label={r.popup.label} viewportRef={viewportRef} className="mc-settings-dropdown-scroll" style={{width:c.width*s,height:r.popup.height*s}}>
      <Choices c={c} permission={permission} width={c.width-4} nodes={choiceNodes} trigger={trigger} close={()=>{setOpen(false);trigger.current?.focus();}}/>
    </ScrollArea>:<Choices c={c} permission={permission} width={c.width-4} nodes={choiceNodes} trigger={trigger} close={()=>{setOpen(false);trigger.current?.focus();}}/>}
  </div>;
  return <><button {...native} {...aria} ref={attachTrigger} type="button" className="mc-settings-dropdown" disabled={c.disabled} aria-haspopup="dialog" aria-expanded={open} aria-controls={open?id:undefined} aria-readonly={env.snap.readOnly||undefined} style={{...native.style,width:c.width*s,height:30*s}} data-expanded={open}
    onClick={toggle} onKeyDown={event=>{const owner=event.currentTarget;native.onKeyDown?.(event);if(event.defaultPrevented||event.nativeEvent.defaultPrevented||event.nativeEvent.isComposing||event.keyCode===229||!canInteract(c,owner))return;if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();setOpen(false);}else if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();setOpen(true);}}}>
    <ButtonPaint width={c.width} height={30} s={s} checked={open}/>{permission?.faceIcon&&<img src={permission.faceIcon.src} className="mc-settings-permission-face-icon" alt="" width={15*s} height={15*s}/>}
    <span id={faceId} className="mc-settings-dropdown__label" style={permission?{left:33*s}:undefined}>{displayText(env,r.faceLabel)}</span><img className="mc-settings-dropdown__arrow" src={assets.dropdown_chevron.url} alt="" width={8*s} height={8*s}/><img className="mc-settings-dropdown__arrow-hover" src={assets.chevron_white_down.url} alt="" width={8*s} height={8*s}/>
  </button>{open&&trigger.current&&(env.props.popupHost?createPortal(list,env.props.popupHost):list)}</>;
}
function Choice({c,index,width,nodes,close,trigger,permission}:{c:RowContext&{row:SettingsDropdownRow};index:number;width:number;nodes:RefObject<(HTMLButtonElement|null)[]>;trigger:RefObject<HTMLButtonElement|null>;close:()=>void;permission?:SettingsPermissionRow}){
  const choice=c.row.choices[index]!,s=c.env.snap.scale,key=`${c.row.id}:${choice.id}`,bind=useCallback((node:HTMLButtonElement|null)=>{if(nodes.current)nodes.current[index]=node;},[nodes,index]),[,attach]=useClassicNodeRef(c.env.props.buttonRefs?.[key],bind);
  const native=c.env.props.buttonProps?.[key]??{};
  const role=choice.id as 'visitor'|'member'|'operator',height=permission?permission.choiceHeights[role]:17;
  return <button {...native} ref={attach} type="button" role="radio" aria-checked={choice.checked} disabled={c.disabled||!choice.enabled} tabIndex={choice.checked?0:-1} className={`mc-settings-choice${permission?' mc-settings-choice--permission':''}`} style={{...native.style,width:width*s,height:height*s,visibility:choice.visible?undefined:'hidden'}}
    onClick={event=>{const owner=event.currentTarget;event.persist();native.onClick?.(event);if(event.defaultPrevented||event.nativeEvent.defaultPrevented)return;
      const rowContext={...c,row:{...c.row,...identity(choice),id:c.row.id}},anchor=trigger.current;post(rowContext,owner,event.nativeEvent,{kind:'change',target:choice.binding,previousValue:permission&&!permission.checked?permission.value:choice.checked,proposedValue:permission&&!permission.checked?role:true},()=>event.defaultPrevented,close,()=>!!anchor&&trigger.current===anchor&&available(anchor)&&!anchor.disabled);}}>
    {!permission&&choice.checked&&<img className="mc-settings-choice__selected" src={assets.dropDownSelectBG.url} alt="" style={{left:c.row.popup.highlightOffset[0]*s,top:c.row.popup.highlightOffset[1]*s,width:(width+c.row.popup.highlightExtraSize[0])*s,height:(16+c.row.popup.highlightExtraSize[1])*s}}/>}
    {!permission&&<img className="mc-settings-choice__hover" src={assets.dropDownHoverBG.url} alt="" style={{left:c.row.popup.highlightOffset[0]*s,top:c.row.popup.highlightOffset[1]*s,width:(width+c.row.popup.highlightExtraSize[0])*s,height:(16+c.row.popup.highlightExtraSize[1])*s}}/>}
    {permission?<PermissionChoicePaint role={role} label={choice.label} description={permission.labels[`${role}Description`]} width={width} height={height} descriptionHeight={permission.descriptionHeights[role]} env={c.env}/>:
      <><img className="mc-settings-choice__radio" src={assets[choice.checked?'radio_on':'radio_off'].url} alt="" width={10*s} height={10*s}/><img className="mc-settings-choice__radio-hover" src={assets[choice.checked?'radio_on_hover':'radio_off_hover'].url} alt="" width={10*s} height={10*s}/><span>{displayText(c.env,choice.label)}</span></>}
  </button>;
}
function Choices({c,width,nodes,close,trigger,permission}:{c:RowContext&{row:SettingsDropdownRow};width:number;nodes:RefObject<(HTMLButtonElement|null)[]>;trigger:RefObject<HTMLButtonElement|null>;close:()=>void;permission?:SettingsPermissionRow}){
  return <div className="mc-settings-choices" role="radiogroup" aria-label={c.row.popup.label} style={{padding:c.env.snap.scale,marginLeft:2*c.env.snap.scale}}>{c.row.choices.map((choice,index)=>choice.ignored||!choice.visible&&c.env.snap.hiddenSlots==='collapse'?null:<Choice key={choice.id} c={c} permission={permission} index={index} width={width} nodes={nodes} trigger={trigger} close={close}/>)}</div>;
}
function Slider({c}:{c:RowContext&{row:SettingsSliderRow}}){
  const{env,row:r}=c,s=env.snap.scale,w=c.width-10,ratio=r.web.max>r.web.min?(r.web.value-r.web.min)/(r.web.max-r.web.min):0,attributes=env.props.inputProps?.[r.id]??{},[,attach]=useClassicNodeRef(env.props.inputRefs?.[r.id]);
  const skin=(name:string,width:number,height:number)=><ClassicSkin asset={resourcePackAssets[`textures/ui/${name}`as keyof typeof resourcePackAssets]} width={width} height={height} scale={s} baseClass="mc-settings-field-skin"/>;
  return <span className="mc-settings-slider" data-locked={c.disabled} style={{width:w*s,height:10*s,left:5*s,top:3*s}} data-source-value={r.sourceValue} data-source-steps={r.sourceSteps}>
    {(['normal','hover']as const).map(state=><span key={state} className={`mc-settings-slider__${state}`}>{skin('slider_border',w,10)}<span className="mc-settings-slider__inside">{skin(state==='normal'?'slider_background':'slider_background_hover',w-2,8)}<span className="mc-settings-slider__progress" style={{clipPath:`inset(0 ${(1-ratio)*100}% 0 0)`}}>{skin(state==='normal'?'slider_progress':'slider_progress_hover',w-2,8)}</span></span></span>)}
    {r.web.markers.map((marker,index)=><span key={index} className="mc-settings-slider__marker" style={{left:marker.offset*s}}><span className="mc-settings-slider__marker-normal">{skin(marker.progress?'slider_step_progress':'slider_step_background',2,6)}</span><span className="mc-settings-slider__marker-hover">{skin(marker.progress?'slider_step_progress_hover':'slider_step_background_hover',2,6)}</span></span>)}
    {c.disabled&&<span className="mc-settings-slider__fade">{skin('slider_locked_transparent_fade',w,10)}</span>}
    <span className="mc-settings-slider__thumb" style={{left:ratio*(w-10)*s}}>{(['default','hover','indent','locked']as const).map(state=><span key={state} className={`mc-settings-slider__thumb-${state}`}>{skin(`slider_button_${state}`,10,16)}{state==='locked'&&skin('slider_locked_transparent_fade',10,16)}</span>)}</span>
    <input {...attributes} {...optionAria(c,attributes)} ref={attach} type="range" min={r.web.min} max={r.web.max} step={r.web.step} value={r.web.value} disabled={c.disabled} aria-valuetext={attributes['aria-valuetext']??visibleText(env,r.textValue)} aria-readonly={env.snap.readOnly||undefined}
      onPointerDown={event=>{attributes.onPointerDown?.(event);if(env.snap.readOnly)event.preventDefault();}}
      onKeyDown={event=>{attributes.onKeyDown?.(event);if((env.snap.readOnly||event.nativeEvent.isComposing||event.keyCode===229)&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key))event.preventDefault();}}
      onChange={event=>{const owner=event.currentTarget,next=owner.valueAsNumber;event.persist();attributes.onChange?.(event);owner.value=String(r.web.value);if(!Number.isFinite(next)||next<r.web.min||next>r.web.max||Math.abs((next-r.web.min)/r.web.step-Math.round((next-r.web.min)/r.web.step))>1e-7)return;
        post(c,owner,event.nativeEvent,{kind:'change',target:r.binding,previousValue:r.web.value,proposedValue:next,sourceValue:r.sourceValue,sourceSteps:r.sourceSteps,mappingPolicy:'explicit-web-domain'},()=>event.defaultPrevented);}}/>
  </span>;
}
function RadioChoice({c,index,width}:{c:RowContext&{row:SettingsRadioRow};index:number;width:number}){
  const r=c.row,choice=r.choices[index]!,visual=r.visuals[index]!,s=c.env.snap.scale,key=`${r.id}:${choice.id}`,native=c.env.props.buttonProps?.[key]??{},[,attach]=useClassicNodeRef(c.env.props.buttonRefs?.[key]);
  return <button {...native} ref={attach} type="button" role="radio" aria-checked={choice.checked} disabled={c.disabled||!choice.enabled} aria-label={defaultName(c.env,choice.label,native)} className="mc-settings-inline-radio" data-checked={choice.checked}
    style={{...native.style,width:width*s,height:17*s,visibility:choice.visible?undefined:'hidden'}}
    onClick={event=>{const owner=event.currentTarget;event.persist();native.onClick?.(event);const rowContext={...c,row:{...r,...identity(choice),id:r.id}};post(rowContext,owner,event.nativeEvent,{kind:'change',target:choice.binding,previousValue:choice.checked,proposedValue:true},()=>event.defaultPrevented);}}
    onKeyDown={event=>{native.onKeyDown?.(event);if((event.nativeEvent.isComposing||event.keyCode===229||c.env.snap.readOnly)&&['Enter',' '].includes(event.key))event.preventDefault();}}>
    <span className="mc-settings-inline-radio__paint" style={{left:2*s,top:visual.y*s,width:(width-4)*s,height:visual.height*s,backgroundImage:`url(${JSON.stringify(resourcePackAssets['textures/ui/White'].url)})`}}/>
    <img className="mc-settings-inline-radio__normal" src={assets[choice.checked?'radio_on':'radio_off'].url} alt="" width={10*s} height={10*s}/><img className="mc-settings-inline-radio__hover" src={assets[choice.checked?'radio_on_hover':'radio_off_hover'].url} alt="" width={10*s} height={10*s}/>
    <span className="mc-settings-inline-radio__label" style={{left:20*s,top:visual.y*s,height:visual.labelHeight*s,textShadow:`${r.labelShadow.offset[0]*s}px ${r.labelShadow.offset[1]*s}px 0 ${r.labelShadow.color}`}}>{displayText(c.env,choice.label)}</span>
  </button>;
}
function Radio({c}:{c:RowContext&{row:SettingsRadioRow}}){
  const r=c.row,s=c.env.snap.scale,count=r.choices.filter(choice=>!choice.ignored&&(choice.visible||c.env.snap.hiddenSlots==='reserve')).length,width=count?(c.width-4)/count:0;let descriptionY=18;
  return <div className="mc-settings-radio-control" role="radiogroup" {...optionAria(c,{})} style={{width:c.width*s}}>
    <div className="mc-settings-radio-control__choices" style={{height:17*s}}>{!r.choices[0].ignored&&(r.choices[0].visible||c.env.snap.hiddenSlots==='reserve')&&<RadioChoice c={c} index={0} width={width}/>}<span aria-hidden="true" style={{display:'block',flex:'none',width:4*s,height:17*s}}/>{!r.choices[1].ignored&&(r.choices[1].visible||c.env.snap.hiddenSlots==='reserve')&&<RadioChoice c={c} index={1} width={width}/>}</div>
    {r.descriptions.map((description,index)=>{const choice=r.choices[index]!,allocated=choice.checked||c.env.snap.hiddenSlots==='reserve';if(!allocated)return null;const y=descriptionY+2;descriptionY+=description.height;return <div key={choice.id} className="mc-settings-radio-control__description" data-source-visible-binding={choice.binding} style={{left:4*s,top:y*s,width:(c.width-10)*s,height:description.height*s,visibility:choice.checked?undefined:'hidden',...font(c.env.typography.description,s)}}>{displayText(c.env,description.text)}</div>;})}
  </div>;
}
function Permissions({c}:{c:RowContext&{row:SettingsPermissionRow}}){
  const r=c.row,row:SettingsDropdownRow={...r,kind:'dropdown',dropdownName:'player_permissions_dropdown',faceLabelBinding:r.binding,popup:r.popup,choices:(['visitor','member','operator']as const).map(role=>({id:role,sourceControl:`permissions.permission_level_radio_${role}_settings`,binding:r.choiceBindings[role],label:r.labels[role],checked:r.checked?.[role]??r.value===role,ignored:false,visible:true,enabled:true}))};
  return <Dropdown c={{...c,row}} permission={r}/>;
}
function PermissionChoicePaint({role,label,description,width,height,descriptionHeight,env}:{role:'visitor'|'member'|'operator';label:string;description:string;width:number;height:number;descriptionHeight:number;env:Environment}){
  const s=env.snap.scale,stem=role==='visitor'?'permissions_visitor_hand':role==='member'?'permissions_member_star':'permissions_op_crown';
  return <><span className="mc-settings-permission-choice-focus" style={{left:-2*s,width:(width-4)*s,height:height*s}}><ClassicSkin asset={resourcePackAssets['textures/ui/focus_border_white']} width={width-4} height={height} scale={s} baseClass="mc-settings-field-skin"/></span>
    <img className="mc-settings-choice__radio" src={assets[stem].url} alt="" style={{left:5*s,top:3*s,transform:'none'}} width={10*s} height={10*s}/><img className="mc-settings-choice__radio-hover" src={assets[`${stem}_hover`].url} alt="" style={{left:5*s,top:3*s,transform:'none'}} width={10*s} height={10*s}/>
    <span className="mc-settings-permission-choice-title" style={{left:21*s,top:.5*s,height:16*s}}>{displayText(env,label)}</span><div className="mc-settings-permission-choice-description" style={{left:5*s,top:16*s,width:(width-12)*s,height:descriptionHeight*s,...font(env.typography.description,s)}}>{displayText(env,description)}</div></>;
}
function Option({c,children}:{c:RowContext&{row:SettingsFieldRow&{option:SettingsOptionLayout}};children:React.ReactNode}){
  const o=c.row.option,s=c.env.snap.scale,one=o.mode==='one-line',ids=optionIds(c);
  return <><div id={ids.label} className="mc-settings-option__label" style={{left:(one?34:0)*s,top:(one?3:0)*s,width:(c.width-(one?34:0))*s,height:o.labelHeight*s,textAlign:o.labelAlignment,visibility:o.showLabel?undefined:'hidden',...font(c.env.typography.label,s),opacity:c.disabled?.5:1}}>{displayText(c.env,o.label)}</div>
    {o.description!==null&&<div id={ids.description} className="mc-settings-option__description" style={{left:(one?34:0)*s,top:(one?c.row.height-4-o.descriptionHeight+3:o.labelHeight+(o.showLabel?1:0))*s,width:(c.width-(one?34:0))*s,height:o.descriptionHeight*s,visibility:o.showLabel?undefined:'hidden',...font(c.env.typography.description,s),opacity:c.disabled?.5:1}}>{displayText(c.env,o.description)}</div>}
    <div className="mc-settings-option__control" style={{top:o.controlY*s,width:c.width*s,...font(c.env.typography.control,s)}}>{children}</div>
  </>;
}
function FieldRow({env,row,width,disabled,x,y}:{env:Environment;row:SettingsFieldRow;width:number;disabled:boolean;x:number;y:number}){
  env=row.typography?{...env,typography:{label:row.typography.label??env.typography.label,description:row.typography.description??env.typography.description,control:row.typography.control??env.typography.control}}:env;
  const[,attach]=useClassicNodeRef(env.props.rowRefs?.[row.id]),s=env.snap.scale,c={env,row,width,disabled:disabled||!row.enabled};let contents:React.ReactNode;
  switch(row.kind){
    case 'panel':{const children=<>{row.rows.filter(child=>allocatedSettingsRow(child,env.snap.hiddenSlots)).map(child=><FieldRow key={child.id} env={env} row={child} width={child.width??width} disabled={c.disabled} x={0} y={0}/>)}</>;contents=row.option?<Option c={c as RowContext&{row:SettingsPanelRow&{option:SettingsOptionLayout}}}>{children}</Option>:children;break;}
    case 'stack':contents=<Rows env={env} rows={row.rows} width={width} disabled={c.disabled} orientation={row.orientation}/>;break;
    case 'experiments':contents=<Rows env={env} rows={row.rows} width={width} disabled={c.disabled} orientation="vertical"/>;break;
    case 'label':contents=<div className="mc-settings-static-label" style={{height:row.textHeight*s,top:row.profile==='plain'?0:4*s,...font(env.typography.label,s),color:row.color,opacity:c.disabled?.5:1}}>{displayText(env,row.text)}</div>;break;
    case 'info':{const panel=<><Skin name="text_label_box" width={width} height={row.panelHeight??row.height} s={s}/><div className="mc-settings-info-text" style={{left:4*s,top:3*s,width:(width-8)*s,height:row.textHeight*s,...font(env.typography.label,s)}}>{displayText(env,row.text)}</div></>;contents=row.option?<Option c={c as RowContext&{row:SettingsInfoRow&{option:SettingsOptionLayout}}}>{panel}</Option>:panel;break;}
    case 'spacer':contents=null;break;
    case 'divider':contents=<img className="mc-settings-divider" src={serverFormImageAssets.list_item_divider_line_light.url} alt="" style={{left:row.inset*s,top:(row.height-1)*s/2,width:(width-2*row.inset)*s,height:s}}/>;break;
    case 'toggle':contents=<Option c={c as RowContext&{row:SettingsToggleRow}}><Toggle c={c as RowContext&{row:SettingsToggleRow}}/></Option>;break;
    case 'text':contents=<Option c={c as RowContext&{row:SettingsTextRow}}><TextInput c={c as RowContext&{row:SettingsTextRow}} width={width}/></Option>;break;
    case 'text-action':contents=<Option c={c as RowContext&{row:SettingsTextActionRow}}><TextAction c={c as RowContext&{row:SettingsTextActionRow}}/></Option>;break;
    case 'dropdown':contents=<Option c={c as RowContext&{row:SettingsDropdownRow}}><Dropdown c={c as RowContext&{row:SettingsDropdownRow}}/></Option>;break;
    case 'radio':contents=<Option c={c as RowContext&{row:SettingsRadioRow}}><Radio c={c as RowContext&{row:SettingsRadioRow}}/></Option>;break;
    case 'slider':contents=<Option c={c as RowContext&{row:SettingsSliderRow}}><Slider c={c as RowContext&{row:SettingsSliderRow}}/></Option>;break;
    case 'permissions':contents=<Option c={c as RowContext&{row:SettingsPermissionRow}}><Permissions c={c as RowContext&{row:SettingsPermissionRow}}/></Option>;break;
    case 'action':contents=<SourceAction env={env} {...env.props.buttonProps?.[row.id]} buttonRef={env.props.buttonRefs?.[row.id]} size={[width,row.height]} scale={s} font={env.typography.control} label={row.label} target={row.target} tone={row.tone} labelMaxHeight={row.labelMaxHeight} disabled={c.disabled||env.snap.readOnly}
      onAction={detail=>post(c,detail.control,detail.event.nativeEvent,{kind:'action',target:row.target,...(row.uri?{uri:row.uri}:{})},()=>detail.event.defaultPrevented)}/>;break;
  }
  return <div ref={attach} className="mc-settings-field-row" data-source-control={row.sourceControl} data-field-id={row.id} data-field-kind={row.kind} data-binding={row.binding} data-collection={row.collection?.name} data-index={row.collection?.index} data-enabled={row.enabled} aria-hidden={!row.visible||undefined}
    {...inert(!row.visible)} style={{left:(x+(row.offset?.[0]??0))*s,top:(y+(row.offset?.[1]??0))*s,width:width*s,height:row.height*s,visibility:row.visible?undefined:'hidden'}}>{contents}</div>;
}
function Rows({env,rows,width,disabled,orientation}:{env:Environment;rows:readonly SettingsFieldRow[];width:number;disabled:boolean;orientation:'vertical'|'horizontal'}){
  let cursor=0;return <>{rows.map(row=>{if(!allocatedSettingsRow(row,env.snap.hiddenSlots))return null;const childWidth=row.width??width,x=orientation==='horizontal'?cursor:0,y=orientation==='vertical'?cursor:0;cursor+=orientation==='horizontal'?childWidth:row.height;return <FieldRow key={`${row.id}:${row.kind}`} env={env} row={row} width={childWidth} disabled={disabled} x={x} y={y}/>;})}</>;
}
/** Source option_* kernel driven by complete host-resolved ordered rows, not custom_form or inferred game rules. */
export const SettingsFields=forwardRef<HTMLDivElement,SettingsFieldsProps>(function SettingsFields(props,ref){
  const snap=snapshotSettingsFields(props),instanceId=useId(),[root,attach]=useClassicNodeRef(ref),committed=useRef(snap),composing=useRef(new Set<EventTarget>());
  useClassicLayoutEffect(()=>{committed.current=snap;});
  useClassicLayoutEffect(()=>{if(props.popupHost&&root.current&&props.popupHost.ownerDocument!==root.current.ownerDocument)throw new TypeError('SettingsFields popupHost must share its actual ownerDocument.');});
  useClassicLayoutEffect(()=>{const node=root.current;if(!node)return;const doc=node.ownerDocument;
    const start=(event:CompositionEvent)=>{if(node.contains(event.target as Node))composing.current.add(event.target!);},end=(event:CompositionEvent)=>{composing.current.delete(event.target!);};
    doc.addEventListener('compositionstart',start,true);doc.addEventListener('compositionend',end,true);return()=>{doc.removeEventListener('compositionstart',start,true);doc.removeEventListener('compositionend',end,true);composing.current.clear();};
  },[root]);
  const{width:_width,scale:_scale,typography:_typography,textFormatting:_textFormatting,rows:_rows,hiddenSlots:_hiddenSlots,disabled:_disabled,readOnly:_readOnly,inert:_inert,onRequest:_onRequest,inputProps:_inputProps,buttonProps:_buttonProps,inputRefs:_inputRefs,buttonRefs:_buttonRefs,rowRefs:_rowRefs,popupViewportRefs:_popupViewportRefs,popupHost:_popupHost,children:_children,dangerouslySetInnerHTML:_dangerous,className,style,...native}=props;
  void[_width,_scale,_typography,_textFormatting,_rows,_hiddenSlots,_disabled,_readOnly,_inert,_onRequest,_inputProps,_buttonProps,_inputRefs,_buttonRefs,_rowRefs,_popupViewportRefs,_popupHost,_children,_dangerous];
  const height=snap.rows.reduce((sum,row)=>sum+(allocatedSettingsRow(row,snap.hiddenSlots)?row.height:0),0),env={snap,instanceId,typography:snap.typography,props,root,committed,composing:composing.current};
  return <div {...native} {...inert(snap.inert)} ref={attach} className={['mc-settings-fields',className].filter(Boolean).join(' ')} data-layout-policy="host-resolved-source-intrinsics" data-readonly={snap.readOnly} style={{...style,width:snap.width*snap.scale,height:height*snap.scale,'--mc-settings-u':`${snap.scale}px`,...font(snap.typography.control,snap.scale)}as CSSProperties}>
    <Rows env={env} rows={snap.rows} width={snap.width} disabled={snap.disabled} orientation="vertical"/>
  </div>;
});
