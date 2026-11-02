import {createContext,forwardRef,useContext,useRef} from 'react';
import type {ButtonHTMLAttributes,CSSProperties,DialogHTMLAttributes,HTMLAttributes,MouseEvent,MouseEventHandler,ReactNode,Ref,RefObject,SyntheticEvent} from 'react';
import {OreButtonAppearanceContext,oreButtonAppearance} from './ore-button';
import {OreScrollArea} from './ore-scroll-area';
import {deferClassicRequest,scheduleClassicTask,useClassicLayoutEffect,useClassicNodeRef} from './classic-screen-lifecycle';

type DataAttributes={[key:`data-${string}`]:string|number|boolean|undefined};
type DivProps=Omit<HTMLAttributes<HTMLDivElement>,'children'|'dangerouslySetInnerHTML'> & DataAttributes;
interface Appearance {guiScale?:number;locale?:string}
export type OreModalDismissDetail=
 | {readonly reason:'escape';readonly event:SyntheticEvent<HTMLDialogElement>}
 | {readonly reason:'close';readonly event:MouseEvent<HTMLButtonElement>}
 | {readonly reason:'backdrop';readonly event:MouseEvent<HTMLDialogElement>}
 /** Notification of completed platform/ref/form closure. Returning false cannot undo it. */
 | {readonly reason:'native-close';readonly event:SyntheticEvent<HTMLDialogElement>};
export interface OreModalProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>,'open'|'dangerouslySetInnerHTML'>,Appearance,DataAttributes {
 readonly open:boolean;
 readonly label:string;
 readonly onDismissRequest:(detail:OreModalDismissDetail)=>void|false;
 readonly width?:CSSProperties['width'];
 readonly height?:CSSProperties['height'];
 readonly panelProps?:DivProps;
 readonly panelRef?:Ref<HTMLDivElement>;
 readonly initialFocusRef?:RefObject<HTMLElement|null>;
 readonly closeOnBackdrop?:boolean;
 readonly lastInputGamepad?:boolean;
 readonly scrollInputMode?:'mouse'|'touch';
}
export interface OreModalHeaderProps extends DivProps,Appearance {
 readonly children?:ReactNode;
 readonly hideCloseButton?:boolean;
 readonly showClose?:boolean;
 readonly closeIcon?:ReactNode;
 readonly closeLabel?:string;
 readonly onClose?:MouseEventHandler<HTMLButtonElement>;
 readonly closeButtonProps?:Omit<ButtonHTMLAttributes<HTMLButtonElement>,'type'|'children'|'dangerouslySetInnerHTML'> & DataAttributes;
 readonly closeButtonRef?:Ref<HTMLButtonElement>;
 readonly lastInputGamepad?:boolean;
}
export interface OreModalContentProps extends DivProps,Appearance {
 readonly children?:ReactNode;
 /** Explicit Web opt-in; source Content defaults to scrolling. */
 readonly scrollable?:boolean;
 readonly scrollLabel?:string;
 readonly scrollViewportRef?:Ref<HTMLDivElement>;
 readonly scrollInputMode?:'mouse'|'touch';
}
export interface OreModalTextProps extends DivProps,Appearance {readonly children?:ReactNode;readonly center?:boolean}
export interface OreModalActionsProps extends DivProps,Appearance {readonly children?:ReactNode;readonly horizontal?:boolean}

interface Owner {dialog:HTMLDialogElement;previous:HTMLElement|null}
const owners=new WeakMap<Document,Owner[]>();
// close() queues its event. An older props-close event must not retire a newer
// owner when the same node commits false -> true before that event is delivered.
const expectedCloses=new WeakMap<HTMLDialogElement,number>();
function consumeExpectedClose(dialog:HTMLDialogElement){const count=expectedCloses.get(dialog)??0;if(!count)return false;if(count===1)expectedCloses.delete(dialog);else expectedCloses.set(dialog,count-1);return true;}
function stack(doc:Document){let list=owners.get(doc);if(!list){list=[];owners.set(doc,list);}return list;}
function top(dialog:HTMLDialogElement){return owners.get(dialog.ownerDocument)?.at(-1)?.dialog===dialog&&dialog.open&&dialog.isConnected;}
function available(node:HTMLElement){return node.isConnected&&!node.closest('[inert],[hidden]')&&!node.matches(':disabled')&&node.getClientRects().length>0&&node.ownerDocument.defaultView?.getComputedStyle(node).visibility!=='hidden';}
function release(owner:Owner){
 const {dialog,previous}=owner,doc=dialog.ownerDocument,list=owners.get(doc)??[],wasTop=list.at(-1)===owner,inside=doc.activeElement!==null&&dialog.contains(doc.activeElement);
 const index=list.indexOf(owner);if(index!==-1)list.splice(index,1);
 for(const next of list)if(next.previous&&dialog.contains(next.previous))next.previous=previous;
 if(!list.length)owners.delete(doc);
 if(dialog.open){expectedCloses.set(dialog,(expectedCloses.get(dialog)??0)+1);try{dialog.close();}catch(error){consumeExpectedClose(dialog);throw error;}}
 // Native dialog owns inertness/focus containment. Only supplement return focus
 // when this owner still had focus, never when a newer modal owns the document.
 if(wasTop&&inside&&previous&&available(previous))previous.focus({preventScroll:true});
}
interface ModalContextValue {lastInputGamepad:boolean;scrollInputMode:'mouse'|'touch';request:(event:MouseEvent<HTMLButtonElement>)=>void}
const ModalContext=createContext<ModalContextValue|null>(null);
function bool(value:unknown,name:string){if(typeof value!=='boolean')throw new TypeError(`OreModal ${name} must be boolean.`);}
function text(value:unknown,name:string){if(typeof value!=='string'||!value.trim()||value.length>4096)throw new TypeError(`OreModal ${name} must be nonempty text within4096 characters.`);}
function size(value:unknown,name:string){if(value!==undefined&&(typeof value==='number'? !Number.isFinite(value)||value<=0 : typeof value!=='string'||!value.trim()||value.length>512||/[\x00-\x1f]/.test(value)))throw new TypeError(`OreModal ${name} must be a positive finite number or CSS size string.`);}
function mode(value:unknown){if(value!=='mouse'&&value!=='touch')throw new TypeError('OreModal scrollInputMode must be mouse or touch.');}
function useAppearance(guiScale?:number,locale?:string){const parent=useContext(OreButtonAppearanceContext),scale=guiScale??parent?.guiScale??1,language=locale??parent?.locale;return {guiScale:scale,locale:language,style:oreButtonAppearance(scale,language)};}
function classes(base:string,own?:string){return [base,own].filter(Boolean).join(' ');}
function cycleTab(event:import('react').KeyboardEvent<HTMLDialogElement>,dialog:HTMLDialogElement){
 if(event.key!=='Tab'||event.defaultPrevented||event.nativeEvent.defaultPrevented||event.nativeEvent.isComposing||event.keyCode===229||event.altKey||event.ctrlKey||event.metaKey||!top(dialog))return;
 const nodes=Array.from(dialog.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href],iframe,[tabindex],[contenteditable="true"]')).filter(node=>node.tabIndex>=0&&available(node)&&node.closest('dialog')===dialog),current=dialog.ownerDocument.activeElement;
 if(!nodes.length){event.preventDefault();dialog.focus({preventScroll:true});}
 else if(event.shiftKey&&(current===nodes[0]||!nodes.includes(current as HTMLElement))){event.preventDefault();nodes.at(-1)!.focus({preventScroll:true});}
 else if(!event.shiftKey&&(current===nodes.at(-1)||!nodes.includes(current as HTMLElement))){event.preventDefault();nodes[0]!.focus({preventScroll:true});}
}
/** The controlled dialog must cancel its platform default immediately. Track
 * subsequent native preventDefault calls separately so the library's own veto
 * does not hide a later host veto. Restore the exact descriptor before delivery;
 * nativeEvent remains the original event and the React target stays stable. */
function deferCancel(event:SyntheticEvent<HTMLDialogElement>,owner:HTMLDialogElement,run:(event:SyntheticEvent<HTMLDialogElement>)=>void,active:()=>boolean){
 event.persist();const native=event.nativeEvent,descriptor=Object.getOwnPropertyDescriptor(native,'preventDefault'),original=native.preventDefault;let veto=false;
 const observe=function(this:Event){if(this===native)veto=true;return original.call(this);};
 Object.defineProperty(native,'preventDefault',{configurable:true,writable:true,enumerable:descriptor?.enumerable??false,value:observe});
 const restore=()=>{if(native.preventDefault!==observe)return;if(descriptor)Object.defineProperty(native,'preventDefault',descriptor);else Reflect.deleteProperty(native,'preventDefault');};
 try{scheduleClassicTask(owner,()=>{try{restore();const schedule=owner.ownerDocument.defaultView?.queueMicrotask.bind(owner.ownerDocument.defaultView)??queueMicrotask;schedule(()=>{try{if(veto||!owner.isConnected||!active())return;run({...event,currentTarget:owner,get defaultPrevented(){return event.defaultPrevented;},preventDefault:()=>event.preventDefault(),stopPropagation:()=>event.stopPropagation(),isDefaultPrevented:()=>event.isDefaultPrevented(),isPropagationStopped:()=>event.isPropagationStopped(),persist:()=>event.persist()});}finally{restore();}});}finally{restore();}});}catch(error){restore();throw error;}
}

/** Finite neutral source visual profile. Native showModal/inert/focus behavior,
 * controlled dismissal and CSS-pixel scaling are explicit Web policies. This
 * component does not portal, reconstruct source providers, or claim native pixels. */
export const OreModal=forwardRef<HTMLDialogElement,OreModalProps>(function OreModal({open,label,onDismissRequest,width,height,panelProps={},panelRef,initialFocusRef,closeOnBackdrop=false,lastInputGamepad=false,scrollInputMode='mouse',guiScale,locale,children,className,style,onCancel,onClose,onClick,onKeyDown,onCompositionStart,onCompositionEnd,...native},ref){
 bool(open,'open');bool(closeOnBackdrop,'closeOnBackdrop');bool(lastInputGamepad,'lastInputGamepad');text(label,'label');size(width,'width');size(height,'height');mode(scrollInputMode);
 if(typeof onDismissRequest!=='function')throw new TypeError('OreModal onDismissRequest must be a function.');
 const appearance=useAppearance(guiScale,locale),[node,attach]=useClassicNodeRef(ref),[panel,attachPanel]=useClassicNodeRef<HTMLDivElement>(panelRef),lease=useRef<Owner|null>(null),live=useRef({open,onDismissRequest});live.current={open,onDismissRequest};
 const composing=useRef(new Set<EventTarget>()),escapeAllowed=useRef(true),nativeClosed=useRef(false);
 useClassicLayoutEffect(()=>{
  if(!open)nativeClosed.current=false;
  const dialog=node.current;
  if(lease.current&&(!open||lease.current.dialog!==dialog)){release(lease.current);lease.current=null;}
  if(!open||!dialog||lease.current||nativeClosed.current)return;
  if(typeof dialog.showModal!=='function'||typeof dialog.close!=='function')throw new Error('OreModal requires native HTMLDialogElement.showModal() and close().');
  const previous=dialog.ownerDocument.activeElement as HTMLElement|null;
  dialog.showModal();const owner={dialog,previous};stack(dialog.ownerDocument).push(owner);lease.current=owner;
  const initial=initialFocusRef?.current;
  if(initial&&dialog.contains(initial)&&available(initial)&&initial.matches('button,input,select,textarea,a[href],area[href],iframe,[tabindex],[contenteditable="true"]')&&typeof initial.focus==='function')initial.focus({preventScroll:true});
 });
 useClassicLayoutEffect(()=>()=>{if(lease.current){release(lease.current);lease.current=null;}},[]);
 const active=()=>!!node.current&&live.current.open&&top(node.current);
 const request=(event:MouseEvent<HTMLButtonElement>)=>{if(active())deferClassicRequest(event,event.currentTarget,snapshot=>live.current.onDismissRequest({reason:'close',event:snapshot}),active);};
 const {className:panelClass,style:panelStyle,onClick:panelClick,...panelNative}=panelProps;
 return <OreButtonAppearanceContext.Provider value={{guiScale:appearance.guiScale,locale:appearance.locale}}><ModalContext.Provider value={{lastInputGamepad,scrollInputMode,request}}>
  <dialog {...native} ref={attach} className={classes('mc-ore-modal',className)} aria-label={native['aria-labelledby']?undefined:native['aria-label']??label}
   data-native-certified="false" data-modal-policy="web-native-dialog" style={{...appearance.style,...style}}
   onKeyDown={event=>{onKeyDown?.(event);cycleTab(event,event.currentTarget);if(event.key==='Escape')escapeAllowed.current=!event.defaultPrevented&&!event.nativeEvent.isComposing&&event.keyCode!==229&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey;}}
   onCompositionStart={event=>{composing.current.add(event.target);onCompositionStart?.(event);}}
   onCompositionEnd={event=>{composing.current.delete(event.target);onCompositionEnd?.(event);}}
   onCancel={event=>{onCancel?.(event);if(event.target!==event.currentTarget)return;const veto=event.defaultPrevented||event.nativeEvent.defaultPrevented;event.preventDefault();for(const target of composing.current)if('isConnected' in target&&!target.isConnected)composing.current.delete(target);if(veto||!active()||!escapeAllowed.current||composing.current.size)return;deferCancel(event,event.currentTarget,snapshot=>live.current.onDismissRequest({reason:'escape',event:snapshot}),active);}}
   onClose={event=>{try{onClose?.(event);}finally{const dialog=event.currentTarget;if(event.target===dialog&&!consumeExpectedClose(dialog)){const owner=lease.current;if(owner?.dialog===dialog&&!dialog.open){lease.current=null;const notify=live.current.open&&!nativeClosed.current;nativeClosed.current=true;release(owner);if(notify)live.current.onDismissRequest({reason:'native-close',event});}}}}}
   onClick={event=>{onClick?.(event);if(event.defaultPrevented||!closeOnBackdrop||event.target!==event.currentTarget||!active())return;const rect=panel.current?.getBoundingClientRect();if(rect&&event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom)return;deferClassicRequest(event,event.currentTarget,snapshot=>live.current.onDismissRequest({reason:'backdrop',event:snapshot}),active);}}>
   <div {...panelNative} ref={attachPanel} className={classes('mc-ore-modal__panel',panelClass)} style={{...panelStyle,...(width===undefined?{}:{width,maxWidth:'100%'}),...(height===undefined?{}:{height})}} onClick={event=>{try{panelClick?.(event);}finally{event.stopPropagation();}}}>{children}</div>
  </dialog>
 </ModalContext.Provider></OreButtonAppearanceContext.Provider>;
});

export const OreModalHeader=forwardRef<HTMLDivElement,OreModalHeaderProps>(function OreModalHeader({children,hideCloseButton=false,showClose=true,closeIcon,closeLabel,onClose,closeButtonProps={},closeButtonRef,lastInputGamepad:givenGamepad,guiScale,locale,className,style,...native},ref){
 const context=useContext(ModalContext),appearance=useAppearance(guiScale,locale),gamepad=givenGamepad??context?.lastInputGamepad??false;
 bool(hideCloseButton,'hideCloseButton');bool(showClose,'showClose');bool(gamepad,'lastInputGamepad');
 const shown=showClose&&!hideCloseButton&&!gamepad&&!!(context||onClose||closeButtonProps.onClick);
 if(closeLabel!==undefined)text(closeLabel,'closeLabel');
 if(shown){if(closeIcon===undefined||closeIcon===null||typeof closeIcon==='boolean')throw new TypeError('OreModalHeader visible Close requires a host closeIcon.');if(!closeButtonProps['aria-labelledby'])text(closeButtonProps['aria-label']??closeLabel,'closeLabel');}
 const {onClick,className:buttonClass,...buttonNative}=closeButtonProps;
 return <div {...native} ref={ref} className={classes('mc-ore-modal-header',className)} style={{...appearance.style,...style}}>
  <div className="mc-ore-modal-header__row"><div className="mc-ore-modal-header__slot" aria-hidden="true"/><div className="mc-ore-modal-header__title">{children}</div><div className="mc-ore-modal-header__slot">{shown&&<button {...buttonNative} ref={closeButtonRef} type="button" className={classes('mc-ore-modal-header__close',buttonClass)} aria-label={buttonNative['aria-labelledby']?undefined:buttonNative['aria-label']??closeLabel} onClick={event=>{onClick?.(event);if(event.defaultPrevented)return;onClose?.(event);if(!event.defaultPrevented)context?.request(event);}}><span className="mc-ore-modal-header__icon" aria-hidden="true">{closeIcon}</span></button>}</div></div><div className="mc-ore-modal-header__shadow" aria-hidden="true"/>
 </div>;
});

export const OreModalContent=forwardRef<HTMLDivElement,OreModalContentProps>(function OreModalContent({children,scrollable=false,scrollLabel,scrollViewportRef,scrollInputMode,guiScale,locale,className,style,...native},ref){
 const context=useContext(ModalContext),appearance=useAppearance(guiScale,locale),input=scrollInputMode??context?.scrollInputMode??'mouse';bool(scrollable,'scrollable');mode(input);if(scrollLabel!==undefined||scrollable)text(scrollLabel,'scrollLabel');
 return <div {...native} ref={ref} className={classes('mc-ore-modal-content',className)} data-overflow-policy={scrollable?'web-source-scroll-opt-in':'web-clip'} style={{...appearance.style,...style}}>{scrollable?<OreScrollArea label={scrollLabel!} viewportRef={scrollViewportRef} guiScale={appearance.guiScale} floating inputMode={input} className="mc-ore-modal-content__scroll">{children}</OreScrollArea>:children}</div>;
});
export const OreModalText=forwardRef<HTMLDivElement,OreModalTextProps>(function OreModalText({children,center=false,guiScale,locale,className,style,...native},ref){
 const appearance=useAppearance(guiScale,locale);bool(center,'center');return <div {...native} ref={ref} className={classes('mc-ore-modal-text',className)} data-center={center||undefined} style={{...appearance.style,...style}}><div className="mc-ore-modal-text__body">{children}</div></div>;
});
export const OreModalActions=forwardRef<HTMLDivElement,OreModalActionsProps>(function OreModalActions({children,horizontal=false,guiScale,locale,className,style,...native},ref){
 const appearance=useAppearance(guiScale,locale);bool(horizontal,'horizontal');return <OreButtonAppearanceContext.Provider value={{guiScale:appearance.guiScale,locale:appearance.locale}}><div {...native} ref={ref} className={classes('mc-ore-modal-actions',className)} data-horizontal={horizontal||undefined} style={{...appearance.style,...style}}>{children}</div></OreButtonAppearanceContext.Provider>;
});
