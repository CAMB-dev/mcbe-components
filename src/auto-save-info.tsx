import {forwardRef,useId,useMemo,useRef,version as reactVersion} from 'react';
import type {CSSProperties,SyntheticEvent} from 'react';
import {Image} from './image';
import {ClassicSkin} from './classic-skin';
import {progressAssets} from './progress-assets';
import {resourcePackAssets} from './resource-pack-assets';
import {autoSaveInfoFrame} from './auto-save-info-assets';
import {autoSaveFrame,autoSaveScale,planAutoSaveInfo} from './auto-save-info-data';
import {classicModalOwnsInput,classicModalTab,deferClassicRequest,scheduleClassicTask,useClassicLayoutEffect,useClassicModal,useClassicNodeRef} from './classic-screen-lifecycle';
import type {AutoSaveIconProps,AutoSaveInfoActionDetail,AutoSaveInfoControllerHandle,AutoSaveInfoScreenProps} from './auto-save-info-types';
const flags=(...v:unknown[])=>{if(v.some(n=>n!==undefined&&typeof n!=='boolean'))throw new TypeError('Autosave flags must be booleans.');};
const text=(v:string,name:string)=>{if(typeof v!=='string'||!v.trim()||v.length>16384)throw new TypeError(name+' requires finite nonempty text.');};
const inertAttributes=(v:boolean|undefined)=>({inert:v?(Number.parseInt(reactVersion,10)<19?'':true):undefined}as Record<string,string|boolean|undefined>);
function available(node:HTMLElement|null){
  if(!node?.isConnected||node.closest('[hidden],[inert]')||!node.getClientRects().length||node.ownerDocument.defaultView?.getComputedStyle(node).visibility==='hidden')return false;
  try{const doc=node.ownerDocument;if(doc.querySelector('dialog:modal')&&!doc.activeElement?.closest('dialog:modal')?.contains(node))return false;}catch{/* Older browsers still use the source-modal lease. */}
  return true;
}
/** Original complete162x30 strip, clipped to one18x30 frame; no generated artwork. */
export const AutoSaveIcon=forwardRef<HTMLSpanElement,AutoSaveIconProps>(function AutoSaveIcon({scale,frame,visible,label,className,style,...native},ref){
  if(native.children!==undefined||native.dangerouslySetInnerHTML!==undefined)throw new TypeError('Autosave icon owns its original strip.');
  const s=autoSaveScale(scale),f=autoSaveFrame(frame);flags(visible);if(typeof visible!=='boolean'||typeof label!=='string'||label.length>4096)throw new TypeError('Autosave icon requires explicit visibility and label.');
  const[,attach]=useClassicNodeRef(ref),asset=progressAssets['textures/ui/auto_save'];
  return <span {...native} ref={attach} className={`mc-auto-save-icon ${className??''}`} hidden={!visible||native.hidden} role={label?'img':undefined} aria-label={label||undefined} aria-hidden={label?undefined:true}
    data-source-control="auto_save_info.auto_save" data-source-frame={f} data-motion-policy="explicit-frame" style={{...style,width:18*s,height:30*s}}>
    <Image src={asset.url} sourceSize={[162,30]} size={[162,30]} scale={s} alt="" style={{position:'absolute',left:-f*18*s,top:0}}/>
  </span>;
});
const skins=[['idle','textures/ui/button_borderless_light'],['hover','textures/ui/button_borderless_lighthover'],['pressed','textures/ui/button_borderless_lightpressed'],['locked','textures/ui/disabledButtonNoBorder']]as const;
/** Host-controlled source autosave explanation. Accept is a request, never a save operation. */
export const AutoSaveInfoScreen=forwardRef<HTMLElement,AutoSaveInfoScreenProps>(function AutoSaveInfoScreen({open,layout,title,message,acceptLabel,messageVariant,icon,inputHint,disabled=false,readOnly=false,modal=true,inert,onAccept,controllerRef,buttonRef,buttonProps={},className,style,onKeyDown,...native},ref){
  if(native.children!==undefined||native.dangerouslySetInnerHTML!==undefined||(buttonProps as {children?:unknown;dangerouslySetInnerHTML?:unknown}).children!==undefined||(buttonProps as {dangerouslySetInnerHTML?:unknown}).dangerouslySetInnerHTML!==undefined)throw new TypeError('Autosave screen owns its source content.');
  const p=planAutoSaveInfo(layout);flags(open,disabled,readOnly,modal,inert);if(typeof open!=='boolean'||!icon||typeof icon.visible!=='boolean')throw new TypeError('Autosave requires explicit open and icon state.');autoSaveFrame(icon.frame);
  text(title,'Title');text(message,'Message');text(acceptLabel,'Accept label');
  if(!['general','nx','xbox','desktop','berwick'].includes(messageVariant))throw new TypeError('Unknown autosave platform message.');
  if(!inputHint||typeof inputHint.visible!=='boolean')throw new TypeError('Autosave hint visibility is required.');
  if(inputHint.visible&&(!Array.isArray(inputHint.rect)||inputHint.rect.length!==4||[0,1,2,3].some(i=>typeof inputHint.rect[i]!=='number'||!Number.isFinite(inputHint.rect[i])||Math.abs(inputHint.rect[i]!)>8192)||inputHint.rect[2]<=0||inputHint.rect[3]<=0||inputHint.content===undefined||inputHint.content===null))throw new TypeError('Autosave hint requires a resolved box and host glyph/content.');
  const id=useId(),[root,attach]=useClassicNodeRef(ref),[button,attachButton]=useClassicNodeRef(buttonRef),active=open&&!native.hidden&&!inert;
  const token=useMemo(()=>({}),[active]),current=useRef({active,token,disabled,readOnly,modal,onAccept});
  useClassicLayoutEffect(()=>{current.current={active,token,disabled,readOnly,modal,onAccept};});
  useClassicModal(root,root,active&&modal);
  function valid(session:object){const c=current.current,node=root.current;if(!c.active||c.token!==session||c.disabled||c.readOnly||!available(node)||!available(button.current)||button.current?.disabled)return false;
    if(c.modal&&!classicModalOwnsInput(node))return false;
    const owner=node!.ownerDocument.activeElement?.closest('dialog,[aria-modal="true"]');return !owner||owner===node||owner.contains(node);
  }
  function send(source:AutoSaveInfoActionDetail['source'],event?:SyntheticEvent<HTMLElement>){
    const captured=current.current,owner=root.current;if(!owner||!valid(captured.token))return false;
    const live=()=>current.current===captured&&valid(captured.token);
    const emit=(snapshot?:SyntheticEvent<HTMLElement>)=>{if(live())captured.onAccept?.(Object.freeze({buttonId:'button.info_accept',sourceControl:'auto_save_info.accept_button',source,...(snapshot?{event:snapshot}:{})}));};
    if(event)deferClassicRequest(event,owner,snapshot=>emit(snapshot),live);else scheduleClassicTask(owner,()=>emit());return true;
  }
  const handle=useMemo<AutoSaveInfoControllerHandle>(()=>({request(command){return command==='button.info_accept'&&valid(token)&&send('controller');}}),[token]);
  const[,attachController]=useClassicNodeRef<AutoSaveInfoControllerHandle>(controllerRef);
  useClassicLayoutEffect(()=>{attachController(active?handle:null);return()=>{attachController(null);};},[attachController,active,handle]);
  if(!open)return null;const s=p.scale,box=(r:readonly number[]):CSSProperties=>({left:r[0]!*s,top:r[1]!*s,width:r[2]!*s,height:r[3]!*s});
  const [bw,bh]=[p.button[2],p.button[3]],font={fontFamily:p.font.family,fontSize:p.font.size*s,lineHeight:`${p.font.lineHeight*s}px`,'--mc-autosave-u':`${s}px`}as CSSProperties;
  return <section {...native} {...inertAttributes(inert)} ref={attach} className={`mc-auto-save-screen ${className??''}`} role={native.role??(modal?'dialog':'region')} aria-modal={modal||undefined}
    aria-labelledby={native['aria-label']?undefined:native['aria-labelledby']??`${id}-title`} aria-describedby={native['aria-describedby']??`${id}-message`} tabIndex={native.tabIndex??-1}
    data-source-control="auto_save_info.auto_save_info_screen" data-native-certified="false" style={{...style,...font,width:p.size[0]*s,height:p.size[1]*s}}
    onKeyDown={event=>{onKeyDown?.(event);if(event.defaultPrevented||event.nativeEvent.defaultPrevented||event.nativeEvent.isComposing||event.keyCode===229||event.repeat||event.altKey||event.ctrlKey||event.metaKey)return;
      const target=event.target as Element,nearest=target.closest?.('dialog,[role="dialog"],[role="alertdialog"]');if(!root.current?.contains(target)||nearest&&nearest!==root.current)return;
      if(event.key==='Tab'&&modal)classicModalTab(event,root.current,root.current);
    }}>
    <div className="mc-auto-save-panel" data-source-control="auto_save_info.main_panel" style={{...box([...p.panelOrigin,200,180])}}>
      <div className="mc-auto-save-fill" aria-hidden="true" style={{left:4*s,top:4*s,opacity:.8}}><ClassicSkin asset={progressAssets['textures/ui/control']} width={192} height={172} scale={s} baseClass="mc-auto-save-skin"/></div>
      <div className="mc-auto-save-frame" aria-hidden="true"><ClassicSkin asset={autoSaveInfoFrame} width={200} height={180} scale={s} baseClass="mc-auto-save-skin"/></div>
      <h2 id={`${id}-title`} className="mc-auto-save-title" style={box(p.title)}>{title}</h2>
      <div id={`${id}-message`} className="mc-auto-save-message" data-source-message={`autosave.info.${messageVariant}`} style={{...box(p.message),textAlign:p.messageAlignment,justifyContent:p.messageVerticalAlignment==='center'?'center':'flex-start'}}>{message}</div>
      <AutoSaveIcon scale={s} frame={icon.frame} visible={icon.visible} label="" style={{left:p.icon[0]*s,top:p.icon[1]*s}}/>
      <button {...buttonProps} ref={attachButton} className={`mc-auto-save-accept ${buttonProps.className??''}`} type="button" disabled={disabled||readOnly} style={{...buttonProps.style,...box(p.button)}}
        data-source-control="auto_save_info.accept_button" onClick={event=>{buttonProps.onClick?.(event);if(!event.defaultPrevented&&!event.nativeEvent.defaultPrevented)send('button',event);}}
        onKeyDown={event=>{buttonProps.onKeyDown?.(event);if((event.nativeEvent.isComposing||event.keyCode===229||readOnly)&&['Enter',' '].includes(event.key))event.preventDefault();}}>
        <span className="mc-auto-save-accept__skins" aria-hidden="true">{skins.map(([state,path])=><ClassicSkin key={state} asset={resourcePackAssets[path]} width={bw-2} height={bh-2} scale={s} baseClass="mc-auto-save-skin" className={`mc-auto-save-${state}`}/>)}</span>
        <span className="mc-auto-save-accept__outline" aria-hidden="true"><ClassicSkin asset={resourcePackAssets['textures/ui/focus_border_white']} width={bw} height={bh} scale={s} baseClass="mc-auto-save-skin"/></span>
        <span className="mc-auto-save-accept__label" style={{left:((bw-p.acceptLabelSize[0])/2-2)*s,top:(bh-p.acceptLabelSize[1])/2*s,width:p.acceptLabelSize[0]*s,height:p.acceptLabelSize[1]*s}}>{acceptLabel}</span>
      </button>
      {inputHint.visible&&<div className="mc-auto-save-hint" {...inertAttributes(true)} aria-hidden="true" style={box(inputHint.rect)}>{inputHint.content}</div>}
    </div>
  </section>;
});
