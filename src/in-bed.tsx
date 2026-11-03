import {forwardRef,useId,useMemo,useRef,version as reactVersion} from 'react';
import type {CSSProperties,SyntheticEvent,ButtonHTMLAttributes} from 'react';
import {ClassicSkin} from './classic-skin';
import {resourcePackAssets} from './resource-pack-assets';
import {classicModalOwnsInput,classicModalTab,deferClassicRequest,scheduleClassicTask,useClassicLayoutEffect,useClassicModal,useClassicNodeRef} from './classic-screen-lifecycle';
import {inBedIntent,planInBed,snapshotInBedControls} from './in-bed-data';
import type {InBedAction,InBedActionDetail,InBedCommand,InBedControllerHandle,InBedControlsProps,InBedFont,InBedScreenProps} from './in-bed-types';

const classes=(...v:(string|undefined)[])=>v.filter(Boolean).join(' ');
const fontStyle=(font:InBedFont,scale:number):CSSProperties=>({fontFamily:font.family,fontSize:font.size*scale,lineHeight:`${font.lineHeight*scale}px`,'--mc-bed-u':`${scale}px`} as CSSProperties);
function text(value:string,name:string,allowEmpty=false){if(typeof value!=='string'||value.length>8192||!allowEmpty&&!value.trim())throw new TypeError(name+' must be bounded host text with an accessible name.');}
function flags(...values:(boolean|undefined)[]){for(const v of values)if(v!==undefined&&typeof v!=='boolean')throw new TypeError('In-bed flags must be booleans.');}
function available(node:HTMLElement|null){
  if(!node?.isConnected||node.closest('[hidden],[inert]')||!node.getClientRects().length||node.ownerDocument.defaultView?.getComputedStyle(node).visibility==='hidden')return false;
  const doc=node.ownerDocument;
  try{if(doc.querySelector('dialog:modal')&&!doc.activeElement?.closest('dialog:modal')?.contains(node))return false;}catch{/* Older engines still use the classic lease. */}
  return true;
}
function inertAttributes(value:boolean|undefined):Record<string,string|boolean|undefined>{return {inert:value?(Number.parseInt(reactVersion,10)<19?'':true):undefined};}
const skins=[['idle','textures/ui/button_borderless_light'],['hover','textures/ui/button_borderless_lighthover'],['pressed','textures/ui/button_borderless_lightpressed'],['locked','textures/ui/disabledButtonNoBorder']] as const;
const NativeButton=forwardRef<HTMLButtonElement,ButtonHTMLAttributes<HTMLButtonElement>>(function NativeButton(p,ref){const[,attach]=useClassicNodeRef(ref);return <button {...p} ref={attach}/>;});

/** Source form-fitting wake/chat controls; the fixed128-wide stack may overflow. */
export const InBedControls=forwardRef<HTMLDivElement,InBedControlsProps>(function InBedControls(
  {layout:input,labels,disabled=false,readOnly=false,onAction,buttonProps,buttonRefs,className,style,...native},ref,
){
  const layout=snapshotInBedControls(input);flags(disabled,readOnly);text(labels?.wake,'Wake label');text(labels?.chat,'Chat label');
  const[root,attach]=useClassicNodeRef(ref),current=useRef({layout,disabled,readOnly,onAction});
  useClassicLayoutEffect(()=>{current.current={layout,disabled,readOnly,onAction};});
  let cursor=0;
  return <div {...native} ref={attach} className={classes('mc-in-bed-controls',className)} role={native.role??'group'} aria-label={native['aria-label']??'In-bed actions'}
    style={{...style,...fontStyle(layout.font,layout.scale),width:128*layout.scale,height:layout.rowHeight*layout.scale}} data-source-control="bed.wake_up_button_panel">
    {(['wake','chat'] as const).map((kind,index)=>{
      const box=layout.buttons[index]!,left=cursor;cursor+=box.size[0]+(index===0?20:0);const attrs=buttonProps?.[kind]??{};
      return <NativeButton {...attrs} ref={buttonRefs?.[kind]} key={kind} type="button" disabled={disabled||readOnly} data-in-bed-action={kind}
        className={classes('mc-in-bed-button',attrs.className)} style={{...attrs.style,left:left*layout.scale,width:box.size[0]*layout.scale,height:box.size[1]*layout.scale}}
        onClick={event=>{
          attrs.onClick?.(event);if(event.defaultPrevented||event.nativeEvent.defaultPrevented)return;
          const owner=event.currentTarget,captured=current.current;
          const valid=()=>current.current===captured&&!captured.disabled&&!captured.readOnly&&!owner.disabled&&available(owner)&&available(root.current);
          if(valid())deferClassicRequest(event,owner,snapshot=>{if(valid())captured.onAction?.(Object.freeze({...inBedIntent(kind==='wake'?'wake-up':'chat','button'),event:snapshot}));},valid);
        }}>
        <span className="mc-in-bed-button__skins" aria-hidden="true">{skins.map(([state,path])=><ClassicSkin key={state} asset={resourcePackAssets[path]} width={box.size[0]-2} height={box.size[1]-2} scale={layout.scale} baseClass="mc-in-bed-skin" className={`mc-in-bed-${state}`}/>)}</span>
        <span className="mc-in-bed-button__outline" aria-hidden="true"><ClassicSkin asset={resourcePackAssets['textures/ui/focus_border_white']} width={box.size[0]} height={box.size[1]} scale={layout.scale} baseClass="mc-in-bed-skin"/></span>
        <span className="mc-in-bed-button__label" style={{width:box.labelSize[0]*layout.scale,height:box.labelSize[1]*layout.scale}}>{labels[kind]}</span>
      </NativeButton>;
    })}
  </div>;
});

/** Host-controlled in_bed_screen; wake/chat are requests, never game operations. */
export const InBedScreen=forwardRef<HTMLElement,InBedScreenProps>(function InBedScreen(
  {open,layout:input,label,status,labels,inputHint,disabled=false,readOnly=false,modal=true,inert,onAction,controllerRef,buttonProps,buttonRefs,className,style,onKeyDown,...native},ref,
){
  const plan=planInBed(input);flags(open,disabled,readOnly,modal,inert,inputHint?.visible);text(label,'Screen label');text(status,'Sleeping status',true);text(labels?.wake,'Wake label');text(labels?.chat,'Chat label');
  if(!inputHint||typeof inputHint.visible!=='boolean'||inputHint.visible&&(inputHint.content===undefined||inputHint.content===null))throw new TypeError('In-bed input hint requires explicit visibility and host glyph/content.');
  const id=useId(),[root,attach]=useClassicNodeRef(ref),controlsRef=useRef<HTMLDivElement>(null),active=open&&!native.hidden&&!inert;
  const token=useMemo(()=>({}),[active]);
  const current=useRef({active,token,disabled,readOnly,modal,onAction});
  useClassicLayoutEffect(()=>{current.current={active,token,disabled,readOnly,modal,onAction};});
  useClassicModal(root,root,active&&modal);
  const valid=(session:object)=>{
    const c=current.current,node=root.current;if(!c.active||c.token!==session||c.disabled||c.readOnly||!available(node))return false;
    if(c.modal&&!classicModalOwnsInput(node))return false;
    const owner=node!.ownerDocument.activeElement?.closest('dialog,[aria-modal="true"]');
    return !owner||owner===node||owner.contains(node);
  };
  const send=(action:InBedAction,source:InBedActionDetail['source'],event?:SyntheticEvent<HTMLElement>)=>{
    const captured=current.current,owner=root.current;if(!owner||!valid(captured.token))return false;
    const live=()=>current.current===captured&&valid(captured.token);
    const emit=(snapshot?:SyntheticEvent<HTMLElement>)=>{if(live())captured.onAction?.(Object.freeze({...inBedIntent(action,source),...(snapshot?{event:snapshot}:{})}));};
    if(event)deferClassicRequest(event,owner,snapshot=>emit(snapshot),live);else scheduleClassicTask(owner,()=>emit());return true;
  };
  const handle=useMemo<InBedControllerHandle>(()=>({request(command:InBedCommand){
    if(!valid(token))return false;
    if(command==='button.menu_cancel')return send('wake-up','menu-cancel');
    if(command==='button.menu_exit')return send('wake-up','menu-exit');
    if(command==='button.wake_up_button')return send('wake-up','controller');
    if(command==='button.chat')return send('chat','controller');
    if(command==='button.menu_select'||command==='button.menu_ok'){
      const node=root.current!,focused=node.ownerDocument.activeElement;
      if(!focused||!node.contains(focused))return false;const button=focused.closest<HTMLButtonElement>('button[data-in-bed-action]');
      return !!button&&button.parentElement===controlsRef.current&&!button.disabled&&send(button.dataset.inBedAction==='wake'?'wake-up':'chat','controller');
    }
    return false;
  }}),[token]);
  const[,attachController]=useClassicNodeRef<InBedControllerHandle>(controllerRef);
  useClassicLayoutEffect(()=>{attachController(active?handle:null);return()=>{attachController(null);};},[attachController,handle,active]);
  if(!open)return null;
  const s=plan.controls.scale;
  return <section {...native} {...inertAttributes(inert)} ref={attach} className={classes('mc-in-bed-screen',className)}
    role={native.role??(modal?'dialog':'region')} aria-modal={modal||undefined} aria-label={native['aria-label']??label} aria-describedby={native['aria-describedby']??`${id}-status`}
    tabIndex={native.tabIndex??-1} data-source-control="bed.in_bed_screen" data-native-certified="false" data-background-policy="css-solid-web"
    style={{...style,...fontStyle(plan.controls.font,s),width:plan.size[0]*s,height:plan.size[1]*s}}
    onKeyDown={event=>{
      onKeyDown?.(event);if(event.defaultPrevented||event.nativeEvent.defaultPrevented||event.nativeEvent.isComposing||event.keyCode===229||event.repeat||event.altKey||event.ctrlKey||event.metaKey)return;
      const target=event.target as Element;if(!root.current?.contains(target))return;
      const nearest=target.closest?.('dialog,[role="dialog"],[role="alertdialog"]');if(nearest&&nearest!==root.current)return;
      if(event.key==='Tab'&&modal)classicModalTab(event,root.current,root.current);
      else if(event.key==='Escape')send('wake-up','menu-cancel',event);
    }}>
    <div id={`${id}-status`} className="mc-in-bed-status" role="status" data-source-control="bed.wake_up_label_panel"
      style={{left:(plan.contentRect[0]+plan.status.origin[0])*s,top:(plan.contentRect[1]+plan.status.origin[1])*s,width:plan.status.width*s,height:49*s,textAlign:plan.status.alignment,justifyContent:plan.status.verticalAlignment==='center'?'center':'flex-start'}}>{status}</div>
    <InBedControls ref={controlsRef} layout={plan.controls} labels={labels} disabled={disabled} readOnly={readOnly} buttonProps={buttonProps} buttonRefs={buttonRefs}
      style={{left:plan.row[0]*s,top:plan.row[1]*s}} onAction={detail=>{if(valid(token))current.current.onAction?.(detail);}}/>
    {inputHint.visible&&<div className="mc-in-bed-hint" data-source-control="bed.select_button" style={{left:plan.hint[0]*s,top:plan.hint[1]*s,width:plan.hint[2]*s,height:plan.hint[3]*s}}>{inputHint.content}</div>}
  </section>;
});
