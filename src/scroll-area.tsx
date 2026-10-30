import { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, Ref } from 'react';

export type ScrollOrientation = 'vertical' | 'horizontal';
/** document uses the five-unit Classic manual rail; pane-specific margins belong to its frame. */
export type ScrollVariant = 'default' | 'container' | 'document';
const nonnegative = (value: number) => Number.isFinite(value) ? Math.max(0,value) : 0;
const bounded = (value: number, max: number) => Math.min(nonnegative(value),max);
function guiScale(scale: number) {
  if (!Number.isSafeInteger(scale) || scale<1) throw new RangeError('scale must be a positive integer.');
  return scale;
}
function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref==='function') ref(value); else if (ref) ref.current=value;
}

export interface ScrollBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML'> {
  /** Current offset, maximum offset, and viewport extent, all in CSS pixels. */
  value: number;
  max: number;
  pageSize: number;
  onValueChange: (value: number) => void;
  label: string;
  /** ID of the actual scrollable element, exposed as aria-controls. */
  controls: string;
  orientation?: ScrollOrientation;
  variant?: ScrollVariant;
  scale?: number;
  disabled?: boolean;
  /** Keyboard arrow increment in CSS pixels; defaults to 15 logical pixels. */
  step?: number;
  /** Minimum thumb extent in logical GUI pixels; defaults to 5. */
  minThumbSize?: number;
}

/** A controlled scrollbar. The associated content remains a native scroll container. */
export const ScrollBar = forwardRef<HTMLDivElement, ScrollBarProps>(function ScrollBar({
  value,max,pageSize,onValueChange,label,controls,orientation='vertical',variant='default',scale=2,disabled=false,
  step=15*scale,minThumbSize=5,className,style,onKeyDown,onPointerDown,onPointerMove,onPointerUp,onPointerCancel,onLostPointerCapture,tabIndex,...props
}, forwardedRef) {
  guiScale(scale);
  const node=useRef<HTMLDivElement | null>(null),thumb=useRef<HTMLSpanElement>(null);
  const drag=useRef<{id:number;start:number;value:number;travel:number} | null>(null);
  const wheel=useRef<(event:WheelEvent)=>void>(()=>{});
  const [length,setLength]=useState(0),[dragging,setDragging]=useState(false),[reverse,setReverse]=useState(false);
  const maximum=nonnegative(max),page=nonnegative(pageSize),offset=bounded(value,maximum);
  const blocked=disabled || maximum===0 || page===0;
  const minimum=(Number.isFinite(minThumbSize) && minThumbSize>0 ? minThumbSize : 5)*scale;
  const ratio=maximum+page>0 ? page/(maximum+page) : 1;
  const extent=Math.min(length,Math.max(minimum,length*ratio)),travel=Math.max(0,length-extent);
  const thumbOffset=maximum>0 ? offset/maximum*travel : 0;
  const visualOffset=reverse ? travel-thumbOffset : thumbOffset;
  const vertical=orientation==='vertical',padding=(variant==='document' ? 0 : 2)*scale,cross=(variant==='document' ? 5 : variant==='container' ? 6 : 8)*scale;
  const controlCross=(variant==='document' ? 5 : 4)*scale,thumbCross=(variant==='container' ? 4 : 5)*scale,trackCross=(variant==='container' ? 4 : 3)*scale;
  const update = (next: number) => { const result=bounded(next,maximum); if (!blocked && result!==offset) onValueChange(result); };
  const release = (element: HTMLDivElement) => {
    const pointer=drag.current;drag.current=null;setDragging(false);
    if (pointer && element.hasPointerCapture(pointer.id)) element.releasePointerCapture(pointer.id);
  };
  useEffect(()=>{
    wheel.current=event=>{
      if (blocked || event.defaultPrevented || event.ctrlKey || (vertical && event.shiftKey)) return;
      const delta=vertical ? event.deltaY : event.deltaX!==0 ? event.deltaX*(reverse ? -1 : 1) : event.deltaY;
      if (!Number.isFinite(delta)) return;
      const unit=event.deltaMode===1 ? (Number.isFinite(step) && step>0 ? step : 15*scale) : event.deltaMode===2 ? page : 1;
      const next=bounded(offset+delta*unit,maximum);
      // Only the custom bar needs forwarding. Native viewport wheel/touch
      // handlers remain untouched, and a boundary can still chain outward.
      if (next!==offset) {event.preventDefault();onValueChange(next);}
    };
  },[blocked,vertical,reverse,step,scale,page,offset,maximum,onValueChange]);
  useEffect(()=>{
    const element=node.current;if (!element) return;
    // An orientation/direction change releases the old capture in cleanup.
    setDragging(false);
    const measure=()=>{setLength(vertical ? element.clientHeight : element.clientWidth);setReverse(!vertical && getComputedStyle(element).direction==='rtl');};
    measure();const observer=typeof ResizeObserver==='undefined' ? undefined : new ResizeObserver(measure);
    const onWheel=(event:WheelEvent)=>wheel.current(event);
    observer?.observe(element);window.addEventListener('resize',measure);element.addEventListener('wheel',onWheel,{passive:false});
    return ()=>{
      observer?.disconnect();window.removeEventListener('resize',measure);element.removeEventListener('wheel',onWheel);
      const pointer=drag.current;drag.current=null;
      if (pointer && element.hasPointerCapture(pointer.id)) element.releasePointerCapture(pointer.id);
    };
  },[vertical,props.dir]);
  useEffect(()=>{ if (blocked && node.current) release(node.current); },[blocked]);
  const pointerPosition=(event:{clientX:number;clientY:number})=>vertical ? event.clientY : event.clientX;
  return <div {...props} ref={element=>{node.current=element;assignRef(forwardedRef,element);}}
    role="scrollbar" aria-label={props['aria-label'] ?? label} aria-controls={controls} aria-orientation={orientation}
    aria-valuemin={0} aria-valuemax={maximum} aria-valuenow={offset} aria-disabled={blocked || undefined}
    tabIndex={blocked ? -1 : tabIndex ?? 0} data-orientation={orientation} data-variant={variant} data-disabled={blocked || undefined} data-dragging={dragging || undefined}
    className={['mc-scrollbar',className].filter(Boolean).join(' ')}
    style={{ [vertical ? 'width' : 'height']:cross,'--mc-scroll-edge':`${scale}px`,'--mc-scroll-thumb-edge-y':`${(variant==='container' ? 1 : 2)*scale}px`,...style } as CSSProperties}
    onKeyDown={event=>{
      onKeyDown?.(event);if (event.defaultPrevented || blocked || event.altKey || event.ctrlKey || event.metaKey) return;
      const increment=Number.isFinite(step) && step>0 ? step : 15*scale;
      const delta=event.key===(vertical ? 'ArrowDown' : 'ArrowRight') ? (reverse ? -increment : increment) : event.key===(vertical ? 'ArrowUp' : 'ArrowLeft') ? (reverse ? increment : -increment) : event.key==='PageDown' ? page : event.key==='PageUp' ? -page : undefined;
      if (delta!==undefined || event.key==='Home' || event.key==='End') {
        event.preventDefault();update(event.key==='Home' ? 0 : event.key==='End' ? maximum : offset+delta!);
      }
    }}
    onPointerDown={event=>{
      onPointerDown?.(event);if (event.defaultPrevented || blocked || event.button!==0 || !event.isPrimary) return;
      event.preventDefault();event.currentTarget.focus({preventScroll:true});
      const rect=event.currentTarget.getBoundingClientRect(),axisLength=vertical ? rect.height : rect.width;
      if (thumb.current?.contains(event.target as Node)) {
        drag.current={id:event.pointerId,start:pointerPosition(event),value:offset,travel:length>0 ? travel*axisLength/length : 0};
        event.currentTarget.setPointerCapture(event.pointerId);setDragging(true);
      } else {
        const start=vertical ? rect.top : rect.left,position=pointerPosition(event)-start;
        const before=position<(length>0 ? visualOffset*axisLength/length : 0);
        update(offset+((before!==reverse) ? -page : page));
      }
    }}
    onPointerMove={event=>{
      onPointerMove?.(event);const active=drag.current;
      if (event.defaultPrevented || blocked || !active || active.id!==event.pointerId || active.travel===0) return;
      update(active.value+(pointerPosition(event)-active.start)/active.travel*maximum*(reverse ? -1 : 1));
    }}
    onPointerUp={event=>{onPointerUp?.(event);if (drag.current?.id===event.pointerId) release(event.currentTarget);}}
    onPointerCancel={event=>{onPointerCancel?.(event);if (drag.current?.id===event.pointerId) release(event.currentTarget);}}
    onLostPointerCapture={event=>{onLostPointerCapture?.(event);if (drag.current?.id===event.pointerId) {drag.current=null;setDragging(false);}}}>
    <span className="mc-scrollbar__track" aria-hidden="true" style={vertical ? {left:padding+(controlCross-trackCross)/2,width:trackCross} : {top:padding+(controlCross-trackCross)/2,height:trackCross}}/>
    <span ref={thumb} className="mc-scrollbar__thumb" aria-hidden="true" style={vertical
      ? {left:padding+(controlCross-thumbCross)/2,width:thumbCross,top:visualOffset,height:length>0 ? extent : `${ratio*100}%`}
      : {top:padding+(controlCross-thumbCross)/2,height:thumbCross,left:visualOffset,width:length>0 ? extent : `${ratio*100}%`}}/>
  </div>;
});

export interface ScrollPosition { scrollTop:number; scrollLeft:number }
export interface ScrollAreaProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onScroll' | 'dangerouslySetInnerHTML'> {
  orientation?: ScrollOrientation | 'both';
  variant?: ScrollVariant;
  scale?: number;
  scrollbarVisibility?: 'auto' | 'always';
  /** Accessible name for the native viewport and its scrollbar controls. */
  label?: string;
  viewportRef?: Ref<HTMLDivElement>;
  viewportProps?: Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML'>;
  contentProps?: Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML'>;
  onScrollPositionChange?: (position: ScrollPosition) => void;
}
interface Metrics { x:number;y:number;maxX:number;maxY:number;width:number;height:number;rtl:boolean }
const initialMetrics: Metrics={x:0,y:0,maxX:0,maxY:0,width:0,height:0,rtl:false};
const isRtl=(element:HTMLElement)=>getComputedStyle(element).direction==='rtl';
const horizontalOffset=(element:HTMLElement)=>isRtl(element) ? -element.scrollLeft : element.scrollLeft;
function setOffset(element:HTMLElement,orientation:ScrollOrientation,value:number) {
  if (orientation==='vertical') element.scrollTop=value; else element.scrollLeft=isRtl(element) ? -value : value;
}

/** Native overflow for wheel, touch, focus and text selection; custom source-backed bars. */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea({
  orientation='vertical',variant='default',scale=2,scrollbarVisibility='auto',label='Scrollable content',viewportRef,viewportProps={},contentProps={},onScrollPositionChange,children,className,...props
}, ref) {
  guiScale(scale);
  const generated=useId(),viewportId=viewportProps.id ?? `mc-scroll-${generated}`;
  const viewport=useRef<HTMLDivElement | null>(null),content=useRef<HTMLDivElement>(null);
  const notify=useRef(onScrollPositionChange),lastPosition=useRef<ScrollPosition>({scrollTop:0,scrollLeft:0});
  const [metrics,setMetrics]=useState(initialMetrics);
  useEffect(()=>{notify.current=onScrollPositionChange;},[onScrollPositionChange]);
  const measure=useCallback(()=>{
    const element=viewport.current;if (!element) return;
    const next:Metrics={x:nonnegative(horizontalOffset(element)),y:nonnegative(element.scrollTop),maxX:Math.max(0,element.scrollWidth-element.clientWidth),maxY:Math.max(0,element.scrollHeight-element.clientHeight),width:element.clientWidth,height:element.clientHeight,rtl:isRtl(element)};
    setMetrics(previous=>(Object.keys(next) as (keyof Metrics)[]).every(key=>previous[key]===next[key]) ? previous : next);
    if (lastPosition.current.scrollTop!==element.scrollTop || lastPosition.current.scrollLeft!==element.scrollLeft) {
      lastPosition.current={scrollTop:element.scrollTop,scrollLeft:element.scrollLeft};notify.current?.(lastPosition.current);
    }
  },[]);
  const viewportCallback=useCallback((element:HTMLDivElement | null)=>{viewport.current=element;assignRef(viewportRef,element);},[viewportRef]);
  useEffect(()=>{
    const element=viewport.current,body=content.current;if (!element || !body) return;
    measure();const observer=typeof ResizeObserver==='undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(element);observer?.observe(body);
    const mutations=typeof MutationObserver==='undefined' ? undefined : new MutationObserver(measure);
    mutations?.observe(body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['style','class','hidden']});
    body.addEventListener('load',measure,true);window.addEventListener('resize',measure);
    return ()=>{observer?.disconnect();mutations?.disconnect();body.removeEventListener('load',measure,true);window.removeEventListener('resize',measure);};
  },[measure,orientation,props.dir]);
  const scroll=(axis:ScrollOrientation,value:number)=>{if (viewport.current) {setOffset(viewport.current,axis,value);measure();}};
  const vertical=orientation!=='horizontal',horizontal=orientation!=='vertical';
  return <div {...props} ref={ref} className={['mc-scroll-area',className].filter(Boolean).join(' ')} data-orientation={orientation}>
    <div {...viewportProps} id={viewportId} ref={viewportCallback} role={viewportProps.role ?? 'region'} aria-label={viewportProps['aria-label'] ?? label} tabIndex={viewportProps.tabIndex ?? 0}
      className={['mc-scroll-area__viewport',viewportProps.className].filter(Boolean).join(' ')}
      style={{overflowX:horizontal ? 'auto' : 'hidden',overflowY:vertical ? 'auto' : 'hidden',...viewportProps.style}}
      onScroll={event=>{viewportProps.onScroll?.(event);measure();}}
      onKeyDown={event=>{
        viewportProps.onKeyDown?.(event);
        // Native viewport keys stay native. Only a horizontal-only viewport
        // needs Page/Home/End translated to its sole scrolling axis.
        if (orientation!=='horizontal' || event.target!==event.currentTarget || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
        const next=event.key==='Home' ? 0 : event.key==='End' ? metrics.maxX : event.key==='PageDown' ? metrics.x+metrics.width : event.key==='PageUp' ? metrics.x-metrics.width : undefined;
        if (next!==undefined) {event.preventDefault();scroll('horizontal',bounded(next,metrics.maxX));}
      }}>
      <div {...contentProps} ref={content} className={['mc-scroll-area__content',contentProps.className].filter(Boolean).join(' ')}>{children}</div>
    </div>
    {vertical && <ScrollBar label={`${label}: vertical`} controls={viewportId} orientation="vertical" variant={variant} scale={scale} value={metrics.y} max={metrics.maxY} pageSize={metrics.height} onValueChange={value=>scroll('vertical',value)} hidden={scrollbarVisibility==='auto' && metrics.maxY===0}/>}
    {horizontal && <ScrollBar label={`${label}: horizontal`} controls={viewportId} orientation="horizontal" dir={metrics.rtl ? 'rtl' : 'ltr'} variant={variant} scale={scale} value={metrics.x} max={metrics.maxX} pageSize={metrics.width} onValueChange={value=>scroll('horizontal',value)} hidden={scrollbarVisibility==='auto' && metrics.maxX===0}/>}
  </div>;
});
