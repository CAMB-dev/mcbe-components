import {forwardRef,useCallback,useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import type {CSSProperties,KeyboardEvent,ReactNode,Ref} from 'react';

export interface OreScrollAreaProps {
  children:ReactNode;
  /** Accessible name for the actual viewport and custom scrollbar. */
  label:string;
  /** Legacy viewport ref, merged with the public forwarded viewport ref. */
  viewportRef?:Ref<HTMLDivElement>;
  /** Decorative wrapper class; the forwarded ref always owns the viewport. */
  className?:string;
  floating?:boolean;
  guiScale?:number;
  inputMode?:'mouse'|'touch';
  /** Explicit physical CSS-pixel track exclusion. Signed source margins are retained. */
  bottomInset?:number;
}
const useClientLayoutEffect=typeof window==='undefined'?useEffect:useLayoutEffect;
function useMergedRef<T>(own:{current:T|null},legacy:Ref<T>|undefined,forwarded:Ref<T>|undefined){
  const releases=useRef<(()=>void)[]>([]);
  return useCallback((node:T|null):void=>{
    const previous=releases.current;releases.current=[];
    for(const release of previous)release();
    own.current=node;
    if(node===null)return;
    for(const target of new Set([legacy,forwarded])){
      if(typeof target==='function'){
        const cleanup=target(node);
        releases.current.push(typeof cleanup==='function'?cleanup:()=>{target(null);});
      }else if(target){
        target.current=node;
        releases.current.push(()=>{target.current=null;});
      }
    }
  },[own,legacy,forwarded]);
}
function forbiddenKey(event:KeyboardEvent){return event.defaultPrevented||event.nativeEvent.isComposing||event.keyCode===229||event.altKey||event.ctrlKey||event.metaKey;}

/** Existing Ore permissions scroller, shared without changing drag, key,
 * touch, geometry, observer or timer behavior. Native scrollbars stay hidden. */
export const OreScrollArea=forwardRef<HTMLDivElement,OreScrollAreaProps>(function OreScrollArea({children,viewportRef,label,className='',floating=false,guiScale=1,inputMode='mouse',bottomInset=0},forwardedRef){
  if(typeof label!=='string')throw new TypeError('OreScrollArea label must be text.');
  if(!Number.isFinite(guiScale)||guiScale<=0||!Number.isFinite(guiScale*5))throw new RangeError('OreScrollArea guiScale must give a positive finite Web unit.');
  if(!Number.isFinite(bottomInset))throw new RangeError('OreScrollArea bottomInset must be finite CSS pixels.');
  if(typeof floating!=='boolean')throw new TypeError('OreScrollArea floating must be boolean.');
  // Existing Ore parents retain their inherited/caller-overridden appearance.
  // A standalone viewport supplies only fallbacks, rather than shadowing them.
  const appearance={'--mc-ore-scroll-unit':`${5*guiScale}px`,'--mc-ore-scroll-min-border':`${Math.max(Math.floor(guiScale/2),1)}px`} as CSSProperties;

  const own = useRef<HTMLDivElement>(null), track = useRef<HTMLDivElement>(null); const merged = useMergedRef(own, viewportRef, forwardedRef); const uid = useId();
  const dragCleanup = useRef<(() => void) | null>(null), activityTimer = useRef<ReturnType<typeof setTimeout> | null>(null); const [active, setActive] = useState(false);
  if (inputMode !== 'mouse' && inputMode !== 'touch') throw new TypeError('scrollInputMode must be mouse or touch.');
  useEffect(() => () => { dragCleanup.current?.(); if (activityTimer.current !== null) clearTimeout(activityTimer.current); }, [inputMode]);
  const [metrics, setMetrics] = useState({ top: 0, height: 0, content: 0 });
  const update = useCallback(() => { const node = own.current; if (!node) return; const next = { top: node.scrollTop, height: node.clientHeight, content: node.scrollHeight }; setMetrics(old => old.top === next.top && old.height === next.height && old.content === next.content ? old : next); }, []);
  useClientLayoutEffect(() => { const node = own.current; if (!node) return; update(); const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update); observer?.observe(node); if (node.firstElementChild) observer?.observe(node.firstElementChild); const mutation = typeof MutationObserver === 'undefined' ? null : new MutationObserver(update); mutation?.observe(node, { childList: true, subtree: true, characterData: true }); return () => { observer?.disconnect(); mutation?.disconnect(); }; }, [update]);
  const max = Math.max(0, metrics.content - metrics.height), unit = 5 * guiScale, margin = (inputMode === 'mouse' ? .8 : .4) * unit;
  const area = Math.max(0, metrics.height - bottomInset), extent = Math.max(0, area - 2 * margin);
  // Source Pp has physical-pixel minima 40/16, not rem values. Degenerate Web extents are explicitly clamped.
  const thumbSize = Math.min(extent, Math.max(area > 52 ? 40 : 16, metrics.content > 0 ? area * area / metrics.content - 2 * margin : extent));
  const thumbTop = Math.max(0, (max > 0 ? Math.min(1, metrics.top / max) : 0) * (area - thumbSize - 2 * margin));
  return <div style={appearance} className={`mc-ore-scroll ${className}`} data-floating={floating} data-input-mode={inputMode} data-overflow={max > 0}>
    <div id={uid} className="mc-ore-scroll__viewport" ref={merged} role="region" aria-label={label} tabIndex={0} onScroll={() => { update(); if (inputMode === 'touch') { setActive(true); if (activityTimer.current !== null) clearTimeout(activityTimer.current); activityTimer.current = setTimeout(() => setActive(false), 500); } }}><div className="mc-ore-scroll__content">{children}</div></div>
    {inputMode === 'touch' ? <span className="mc-ore-scroll__touch" aria-hidden="true" hidden={max <= 0} data-active={active} style={{ height: thumbSize, top: thumbTop + margin }} /> : <div ref={track} className="mc-ore-scroll__bar" style={{ marginBottom: margin + bottomInset }} hidden={max <= 0} role="scrollbar" tabIndex={0} aria-label={label} aria-controls={uid} aria-orientation="vertical" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(max, metrics.top)} onKeyDown={event => { if (forbiddenKey(event)) return; const node = own.current; if (!node) return; const next = event.key === 'End' ? max : event.key === 'Home' ? 0 : event.key === 'PageDown' ? node.scrollTop + node.clientHeight : event.key === 'PageUp' ? node.scrollTop - node.clientHeight : event.key === 'ArrowDown' ? node.scrollTop + 40 : event.key === 'ArrowUp' ? node.scrollTop - 40 : null; if (next === null) return; event.preventDefault(); node.scrollTop = Math.max(0, Math.min(max, next)); update(); }} onPointerDown={event => { if (event.defaultPrevented || event.button !== 0 || !own.current || !track.current) return; dragCleanup.current?.(); event.preventDefault(); const pointerId = event.pointerId; const rect = track.current.getBoundingClientRect(); const thumb = event.currentTarget.querySelector<HTMLElement>('.mc-ore-scroll__thumb'); const thumbHeight = thumb?.getBoundingClientRect().height ?? 0; const isThumb = !!(event.target as Element).closest('.mc-ore-scroll__thumb'); const grab = isThumb && thumb ? event.clientY - thumb.getBoundingClientRect().top : thumbHeight / 2;
      const move = (e: PointerEvent) => { if (e.pointerId !== pointerId || !own.current) return; const ratio = isThumb ? (e.clientY - rect.top - grab) / Math.max(1, rect.height - thumbHeight) : (e.clientY - rect.top) / Math.max(1, rect.height); own.current.scrollTop = Math.max(0, Math.min(1, ratio)) * max; update(); };
      move(event.nativeEvent); const doc = event.currentTarget.ownerDocument; const cleanup = () => { doc.removeEventListener('pointermove', move); doc.removeEventListener('pointerup', end); doc.removeEventListener('pointercancel', end); if (dragCleanup.current === cleanup) dragCleanup.current = null; }; const end = (e: PointerEvent) => { if (e.pointerId === pointerId) cleanup(); }; dragCleanup.current = cleanup; doc.addEventListener('pointermove', move); doc.addEventListener('pointerup', end); doc.addEventListener('pointercancel', end);
    }}><span className="mc-ore-scroll__track" /><span className="mc-ore-scroll__thumb" style={{ height: thumbSize, top: thumbTop }} /></div>}
  </div>;
});
