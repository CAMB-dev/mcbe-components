import { cloneElement, forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, HTMLAttributes, ReactElement, ReactNode } from 'react';

const classes=(...values:(string|false|undefined)[])=>values.filter(Boolean).join(' ');
function scaleValue(value:number){if(!Number.isSafeInteger(value)||value<1)throw new RangeError('scale must be a positive integer.');return value;}

export interface SpinnerProps extends Omit<HTMLAttributes<HTMLSpanElement>,'children'> {
  label?:string;
  scale?:number;
  /** Optional static original frame, 0–9. No synthetic rotation. */
  frame?:number;
  paused?:boolean;
  decorative?:boolean;
}
/** Native loading_spin atlas: ten horizontal 7px frames, displayed at 14 GUI pixels. */
export const Spinner=forwardRef<HTMLSpanElement,SpinnerProps>(function Spinner({label='Loading',scale=2,frame,paused=false,decorative=false,className,style,...props},ref){
  scaleValue(scale);if(frame!==undefined&&(!Number.isInteger(frame)||frame<0||frame>9))throw new RangeError('frame must be an integer from 0 to 9.');
  return <span {...props} ref={ref} role={decorative?undefined:'status'} aria-label={decorative?undefined:props['aria-label']??label} aria-hidden={decorative?true:props['aria-hidden']}
    className={classes('mc-spinner',className)} style={{'--mc-feedback-scale':scale,...style} as CSSProperties} data-source="loading-spin" data-paused={paused||undefined} data-frame={frame}>
    <span className="mc-spinner__image" aria-hidden="true" style={frame===undefined?undefined:{backgroundPositionX:-frame*14*scale,animation:'none'}}/>
    {!decorative&&<span className="mc-feedback-sr">{label}</span>}
  </span>;
});

export interface TooltipProps extends Omit<HTMLAttributes<HTMLSpanElement>,'children'|'content'|'title'> {
  children:ReactElement;
  content:ReactNode;
  open?:boolean;
  defaultOpen?:boolean;
  onOpenChange?:(open:boolean)=>void;
  side?:'top'|'bottom'|'left'|'right';
  delayDuration?:number;
  closeDelay?:number;
  offset?:number;
  disabled?:boolean;
  contentProps?:Omit<HTMLAttributes<HTMLDivElement>,'children'|'dangerouslySetInnerHTML'>;
}
const tooltipLayers=new WeakMap<Document,{token:symbol;element:HTMLDivElement}[]>();
/** One focusable child. Tooltip content is descriptive, not an interactive popover. */
export const Tooltip=forwardRef<HTMLSpanElement,TooltipProps>(function Tooltip({
  children,content,open:controlledOpen,defaultOpen=false,onOpenChange,side='top',delayDuration=400,closeDelay=100,offset=8,disabled=false,
  contentProps={},className,onPointerEnter,onPointerLeave,onPointerDown,onPointerCancel,onFocus,onBlur,...props
},ref){
  const id=useId(),anchor=useRef<HTMLSpanElement|null>(null),popup=useRef<HTMLDivElement>(null),timer=useRef<number|undefined>(undefined);
  const hovered=useRef(false),focused=useRef(false),touch=useRef(false),change=useRef(onOpenChange),current=useRef(false);
  const [localOpen,setLocalOpen]=useState(defaultOpen),[mounted,setMounted]=useState(false),[position,setPosition]=useState({left:8,top:8,ready:false});
  const open=controlledOpen??localOpen;current.current=open;change.current=onOpenChange;
  const visible=mounted&&open&&!disabled;
  const clear=()=>{if(timer.current!==undefined){window.clearTimeout(timer.current);timer.current=undefined;}};
  const request=useCallback((next:boolean)=>{
    if(current.current===next)return;
    if(next)setPosition(previous=>({...previous,ready:false}));
    if(controlledOpen===undefined){current.current=next;setLocalOpen(next);}
    change.current?.(next);
  },[controlledOpen]);
  useEffect(()=>{setMounted(true);return()=>{if(timer.current!==undefined)window.clearTimeout(timer.current);};},[]);
  useEffect(()=>{
    if(!visible||!anchor.current||!popup.current)return;
    const trigger=anchor.current,element=popup.current,doc=trigger.ownerDocument,token=Symbol('tooltip');
    const layers=tooltipLayers.get(doc)??[];layers.push({token,element});tooltipLayers.set(doc,layers);
    const locate=()=>{
      const a=trigger.getBoundingClientRect(),b=element.getBoundingClientRect(),gap=Number.isFinite(offset)?offset:8,pad=8;
      let left=a.left+(a.width-b.width)/2,top=a.top-b.height-gap;
      if(side==='bottom'){top=a.bottom+gap;if(top+b.height>window.innerHeight-pad)top=a.top-b.height-gap;}
      else if(side==='top'&&top<pad)top=a.bottom+gap;
      else if(side==='left'){left=a.left-b.width-gap;top=a.top+(a.height-b.height)/2;if(left<pad)left=a.right+gap;}
      else if(side==='right'){left=a.right+gap;top=a.top+(a.height-b.height)/2;if(left+b.width>window.innerWidth-pad)left=a.left-b.width-gap;}
      left=Math.round(Math.max(pad,Math.min(left,window.innerWidth-b.width-pad)));top=Math.round(Math.max(pad,Math.min(top,window.innerHeight-b.height-pad)));
      setPosition(previous=>previous.ready&&previous.left===left&&previous.top===top?previous:{left,top,ready:true});
    };
    const escape=(event:KeyboardEvent)=>{
      const modal=doc.activeElement?.closest('dialog:modal');
      const eligible=modal?layers.filter(layer=>modal.contains(layer.element)):layers;
      if(event.key==='Escape'&&!event.defaultPrevented&&eligible.at(-1)?.token===token){clear();request(false);event.preventDefault();event.stopImmediatePropagation();}
    };
    const outside=(event:PointerEvent)=>{if(!trigger.contains(event.target as Node)&&!element.contains(event.target as Node)){clear();request(false);}};
    const scroll=()=>{if(touch.current)request(false);else locate();};
    locate();const observer=typeof ResizeObserver==='undefined'?undefined:new ResizeObserver(locate);observer?.observe(trigger);observer?.observe(element);
    doc.addEventListener('keydown',escape);doc.addEventListener('pointerdown',outside,true);window.addEventListener('resize',locate);window.addEventListener('scroll',scroll,true);
    return()=>{observer?.disconnect();doc.removeEventListener('keydown',escape);doc.removeEventListener('pointerdown',outside,true);window.removeEventListener('resize',locate);window.removeEventListener('scroll',scroll,true);const index=layers.findIndex(layer=>layer.token===token);if(index>=0)layers.splice(index,1);};
  },[visible,side,offset,request]);
  const close=()=>{clear();if(!focused.current)timer.current=window.setTimeout(()=>{if(!hovered.current&&!focused.current)request(false);},Math.max(0,closeDelay));};
  const description=(children.props as {'aria-describedby'?:string})['aria-describedby'];
  const trigger=cloneElement(children as ReactElement<{'aria-describedby'?:string}>,{'aria-describedby':[description,visible?`${id}-tooltip`:undefined].filter(Boolean).join(' ')||undefined});
  return <><span {...props} ref={node=>{anchor.current=node;if(typeof ref==='function')ref(node);else if(ref)ref.current=node;}} className={classes('mc-tooltip-trigger',className)}
    onPointerEnter={event=>{onPointerEnter?.(event);if(event.defaultPrevented||disabled||event.pointerType==='touch')return;touch.current=false;hovered.current=true;clear();timer.current=window.setTimeout(()=>request(true),Math.max(0,delayDuration));}}
    onPointerLeave={event=>{onPointerLeave?.(event);if(event.defaultPrevented||event.pointerType==='touch')return;hovered.current=false;close();}}
    onPointerDown={event=>{onPointerDown?.(event);if(event.defaultPrevented||disabled)return;touch.current=event.pointerType==='touch';if(touch.current){clear();request(!open);}}}
    onPointerCancel={event=>{onPointerCancel?.(event);if(touch.current)request(false);}}
    onFocus={event=>{onFocus?.(event);if(event.defaultPrevented||disabled)return;focused.current=true;if(!touch.current){clear();request(true);}}}
    onBlur={event=>{onBlur?.(event);if(event.defaultPrevented||event.currentTarget.contains(event.relatedTarget as Node|null))return;focused.current=false;touch.current=false;close();}}>{trigger}</span>
    {visible&&createPortal(<div {...contentProps} ref={popup} id={`${id}-tooltip`} role="tooltip" className={classes('mc-tooltip',contentProps.className)}
      style={{position:'fixed',left:position.left,top:position.top,visibility:position.ready?'visible':'hidden',...contentProps.style}}
      onPointerEnter={event=>{contentProps.onPointerEnter?.(event);hovered.current=true;clear();}}
      onPointerLeave={event=>{contentProps.onPointerLeave?.(event);hovered.current=false;close();}}>{content}</div>,anchor.current?.closest('dialog')??document.body)}
  </>;
});

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>,'title'|'children'|'role'> {
  open:boolean;
  onOpenChange:(open:boolean)=>void;
  title:string;
  description?:string;
  icon?:ReactNode;
  action?:ReactNode;
  variant?:'default'|'error';
  /** Explicit low-stakes timeout; minimum 5s. Actions/errors always persist. */
  duration?:number;
  dismissLabel?:string;
}
/** Keep mounted and control open so the polite status owner is stable. */
export const Toast=forwardRef<HTMLDivElement,ToastProps>(function Toast({open,onOpenChange,title,description,icon,action,variant='default',duration=0,dismissLabel='Dismiss notification',className,onPointerEnter,onPointerLeave,onFocus,onBlur,...props},ref){
  const [hovered,setHovered]=useState(false),[focused,setFocused]=useState(false),[hidden,setHidden]=useState(false);
  const remaining=useRef(0),dismiss=useRef(onOpenChange);dismiss.current=onOpenChange;
  const timeout=variant==='error'||action||!Number.isFinite(duration)||duration<=0?0:Math.max(5000,duration);
  useEffect(()=>{if(!open){setHovered(false);setFocused(false);}},[open]);
  useEffect(()=>{const update=()=>setHidden(document.hidden);update();document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
  useEffect(()=>{remaining.current=timeout;},[open,timeout,title,description]);
  useEffect(()=>{
    if(!open||!timeout||hovered||focused||hidden)return;
    const start=Date.now(),timer=window.setTimeout(()=>dismiss.current(false),remaining.current);
    return()=>{window.clearTimeout(timer);remaining.current=Math.max(0,remaining.current-(Date.now()-start));};
  },[open,timeout,title,description,hovered,focused,hidden]);
  return <div {...props} ref={ref} role="status" aria-live="polite" aria-atomic="true" className={classes('mc-toast',className)} data-state={open?'open':'closed'} data-variant={variant}
    onPointerEnter={event=>{onPointerEnter?.(event);if(!event.defaultPrevented)setHovered(true);}}
    onPointerLeave={event=>{onPointerLeave?.(event);if(!event.defaultPrevented)setHovered(false);}}
    onFocus={event=>{onFocus?.(event);if(!event.defaultPrevented)setFocused(true);}}
    onBlur={event=>{onBlur?.(event);if(!event.defaultPrevented&&!event.currentTarget.contains(event.relatedTarget as Node|null))setFocused(false);}}>
    {open&&<div className="mc-toast__panel">{icon&&<span className="mc-toast__icon" aria-hidden="true">{icon}</span>}<div className="mc-toast__text"><strong className="mc-toast__title">{title}</strong>{description&&<div className="mc-toast__description">{description}</div>}</div>{action&&<div className="mc-toast__action">{action}</div>}<button type="button" className="mc-toast__dismiss" aria-label={dismissLabel} onClick={()=>onOpenChange(false)}><span aria-hidden="true"/></button></div>}
  </div>;
});
