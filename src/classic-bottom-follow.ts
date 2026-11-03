import type {RefObject} from 'react';
import {useClassicLayoutEffect} from './classic-screen-lifecycle';

/** Shared source jump-to-bottom lifecycle. Callers own visibility and guards. */
export function useClassicBottomFollow(viewport:RefObject<HTMLDivElement|null>,visible:boolean,sessionKey:string,revision:string,signal:string,jump:()=>void,force=false){
  useClassicLayoutEffect(()=>{jump();},[revision,signal,visible,jump]);
  // Releasing a force flag does not itself request a scroll. Preserve Chat's edge.
  useClassicLayoutEffect(()=>{if(force)jump();},[force,sessionKey,visible,jump]);
  useClassicLayoutEffect(()=>{
    const node=viewport.current,body=node?.firstElementChild;
    const win=node?.ownerDocument.defaultView as (Window&typeof globalThis)|null|undefined;
    if(!node||!body||!win||!visible)return;
    const observer=typeof win.ResizeObserver==='function'?new win.ResizeObserver(jump):undefined;
    observer?.observe(node);observer?.observe(body);body.addEventListener('load',jump,true);win.addEventListener('resize',jump);
    return()=>{observer?.disconnect();body.removeEventListener('load',jump,true);win.removeEventListener('resize',jump);};
  },[visible,sessionKey,jump,viewport]);
}
