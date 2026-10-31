import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { KeyboardEvent, Ref, RefCallback, SyntheticEvent } from 'react';
import { lockModalScroll } from './modal-scroll-lock';

/** Private lifecycle shared by source screen compositions; no public export. */
export const useClassicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
export function useClassicNodeRef<T extends HTMLElement>(forwarded?: Ref<T>, secondary?: Ref<T>) {
  const node = useRef<T | null>(null), releases = useRef<(() => void)[]>([]);
  // Always return void to React18. Honor caller cleanup ourselves on both peers.
  const attach: RefCallback<T> = useCallback((next: T | null) => {
    const previous = releases.current; releases.current = [];
    for (const release of previous) release();
    node.current = next;
    if (next === null) return;
    for (const target of new Set([forwarded, secondary])) {
      if (typeof target === 'function') {
        const cleanup = target(next);
        releases.current.push(typeof cleanup === 'function' ? cleanup : () => { target(null); });
      } else if (target) {
        target.current = next;
        releases.current.push(() => { target.current = null; });
      }
    }
  }, [forwarded, secondary]);
  return [node, attach] as const;
}

type NodeRef = { readonly current: HTMLElement | null };
type ModalOwner = { doc: Document; boundary: HTMLElement; target: NodeRef; previous: HTMLElement | null; releaseScroll: () => void };
type ModalState = { owners: ModalOwner[]; changed: Map<Element, string | null> };
const modalStates = new WeakMap<Document, ModalState>();
const selector = 'button,input,select,textarea,a[href],iframe,[tabindex],[contenteditable="true"]';
function available(node: HTMLElement) {
  return !node.closest('[hidden],[inert]') && !node.matches(':disabled')
    && node.getClientRects().length > 0 && node.ownerDocument.defaultView?.getComputedStyle(node).visibility !== 'hidden';
}
function focusables(node: HTMLElement) {
  return Array.from(node.querySelectorAll<HTMLElement>(selector)).filter(item => item.tabIndex >= 0 && available(item));
}
function top(boundary: HTMLElement) {
  return modalStates.get(boundary.ownerDocument)?.owners.at(-1)?.boundary === boundary && !boundary.closest('[inert]');
}
function focusInside(owner: Pick<ModalOwner, 'boundary' | 'target'>) {
  const target = owner.target.current ?? owner.boundary;
  (focusables(target)[0] ?? target).focus({ preventScroll: true });
}
function reconcile(state: ModalState) {
  // Only the top modal owns background inertness. Recompute when a sibling
  // opens so the old modal cannot keep the new modal itself inert.
  for (const [element, before] of state.changed) {
    if (before === null) element.removeAttribute('inert'); else element.setAttribute('inert', before);
  }
  state.changed.clear();
  const owner = state.owners.at(-1); if (!owner) return;
  let branch: Element = owner.boundary;
  while (branch.parentElement) {
    for (const sibling of Array.from(branch.parentElement.children)) if (sibling !== branch) {
      state.changed.set(sibling, sibling.getAttribute('inert')); sibling.setAttribute('inert', '');
    }
    if (branch.parentElement === owner.boundary.ownerDocument.body) break;
    branch = branch.parentElement;
  }
}
function stateFor(doc: Document) {
  let state = modalStates.get(doc);
  if (!state) { state = { owners: [], changed: new Map() }; modalStates.set(doc, state); }
  return state;
}
function removeOwner(owner: ModalOwner, restore = true) {
  const doc = owner.doc, state = modalStates.get(doc); if (!state) return;
  const wasTop = state.owners.at(-1) === owner, index = state.owners.indexOf(owner);
  if (index !== -1) state.owners.splice(index, 1);
  // If a lower modal closes first, a later modal must not restore focus into
  // that departed ownership chain when it eventually closes.
  for (const next of state.owners) if (next.previous && owner.boundary.contains(next.previous)) next.previous = owner.previous;
  reconcile(state); owner.releaseScroll();
  if (!state.owners.length) modalStates.delete(doc);
  const current = doc.activeElement;
  if (restore && wasTop && (current === doc.body || current instanceof Node && owner.boundary.contains(current))) {
    if (owner.previous?.isConnected && available(owner.previous)) owner.previous.focus({ preventScroll: true });
    else if (state.owners.at(-1)) focusInside(state.owners.at(-1)!);
  }
}

/** Explicit Web modal ownership. Host-rendered cross-document readers own their inner focus bridge. */
export function useClassicModal(boundaryRef: NodeRef, targetRef: NodeRef, active: boolean, _focusKey?: unknown) {
  const lease = useRef<ModalOwner | null>(null);
  // Observe real nodes after every commit: ref objects alone do not change
  // identity when a source frame is replaced. Ownership retains its opener.
  useClassicLayoutEffect(() => {
    const boundary = boundaryRef.current;
    if (!active || !boundary) { if (lease.current) removeOwner(lease.current); lease.current = null; return; }
    let owner = lease.current;
    if (owner && owner.doc !== boundary.ownerDocument) {
      const previous = owner.previous; removeOwner(owner, false);
      owner = { doc: boundary.ownerDocument, boundary, target: targetRef, previous, releaseScroll: lockModalScroll(boundary.ownerDocument) };
      stateFor(boundary.ownerDocument).owners.push(owner); lease.current = owner;
    } else if (!owner) {
      owner = { doc: boundary.ownerDocument, boundary, target: targetRef, previous: boundary.ownerDocument.activeElement as HTMLElement | null, releaseScroll: lockModalScroll(boundary.ownerDocument) };
      stateFor(boundary.ownerDocument).owners.push(owner); lease.current = owner;
    } else {
      if (owner.boundary !== boundary) {
        const previousBoundary = owner.boundary;
        for (const next of stateFor(owner.doc).owners) {
          if (next !== owner && next.previous && previousBoundary.contains(next.previous)) next.previous = owner.previous;
        }
      }
      owner.boundary = boundary; owner.target = targetRef;
    }
    reconcile(stateFor(boundary.ownerDocument));
    const target = targetRef.current ?? boundary, current = boundary.ownerDocument.activeElement;
    if (top(boundary) && (!(current instanceof HTMLElement) || !target.contains(current) || !available(current))) focusInside(owner);
  });
  // The listener reads the current lease, so a replaced boundary or target is
  // observed without losing the original return-focus destination.
  useClassicLayoutEffect(() => {
    const doc = boundaryRef.current?.ownerDocument; if (!doc) return;
    const contain = (event: FocusEvent) => {
      const owner = lease.current; if (!owner) return;
      const target = owner.target.current ?? owner.boundary;
      if (top(owner.boundary) && event.target instanceof Node && !target.contains(event.target)) focusInside(owner);
    };
    doc.addEventListener('focusin', contain);
    return () => doc.removeEventListener('focusin', contain);
  });
  useClassicLayoutEffect(() => () => { if (lease.current) removeOwner(lease.current); lease.current = null; }, []);
}

export function classicModalTab(event: KeyboardEvent<HTMLElement>, boundary: HTMLElement | null, target: HTMLElement | null) {
  if (event.key !== 'Tab' || event.defaultPrevented || event.nativeEvent.defaultPrevented || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey || !boundary || !top(boundary)) return;
  const region = target ?? boundary, nodes = focusables(region), current = region.ownerDocument.activeElement;
  if (!nodes.length) { event.preventDefault(); region.focus({ preventScroll: true }); return; }
  if (event.shiftKey && (current === nodes[0] || !nodes.includes(current as HTMLElement))) { event.preventDefault(); nodes.at(-1)!.focus(); }
  else if (!event.shiftKey && (current === nodes.at(-1) || !nodes.includes(current as HTMLElement))) { event.preventDefault(); nodes[0]!.focus(); }
}

/** Dispatch after ancestor vetoes, retaining an honest, stable currentTarget. */
export function deferClassicEvent<T extends HTMLElement, E extends SyntheticEvent<T>>(
  event: E, owner: T, run: (snapshot: E) => void, active: () => boolean = () => true,
) {
  event.persist();
  const schedule = owner.ownerDocument.defaultView?.queueMicrotask.bind(owner.ownerDocument.defaultView) ?? queueMicrotask;
  schedule(() => {
    if (event.defaultPrevented || event.nativeEvent.defaultPrevented || !owner.isConnected || !active()) return;
    const snapshot = {
      ...event, currentTarget: owner,
      get defaultPrevented() { return event.defaultPrevented; },
      preventDefault: () => event.preventDefault(), stopPropagation: () => event.stopPropagation(),
      isDefaultPrevented: () => event.isDefaultPrevented(), isPropagationStopped: () => event.isPropagationStopped(),
      persist: () => event.persist(),
    };
    run(snapshot);
  });
}
