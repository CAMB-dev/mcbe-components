import { createContext, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { GuiLayer } from './gui-layer-component';
import { emptyCraftingSourceVisualState, prepareCraftingSource } from './crafting-source-geometry';
import type { CraftingScreenImageRenderProfile, CraftingSourceContent, CraftingSourceScroll, CraftingSourceVisualState, PreparedCraftingSource } from './crafting-source-geometry';
import { useWorkstationItemMarkers, workstationCanvasStyle } from './workstation-source-layer';
import type { WorkstationControlState } from './workstation-source-layer';
export type { CraftingScreenImageRenderProfile, CraftingScreenTextStyle, CraftingScreenInputTextStyle } from './crafting-source-geometry';

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
interface RecipeViewportBridge { bind: (viewport: HTMLDivElement | null) => void; scroll: () => void }
/** Private bridge; standalone RecipeBook keeps its native viewport contract. */
export const CraftingRecipeViewport = createContext<RecipeViewportBridge | undefined>(undefined);
const ready = ':scope > .mc-crafting-image-window > .mc-crafting-image-layer[data-render-state="ready"]';
const recipeButtons = '.mc-recipe-book__grid > [role="row"] > [role="gridcell"] > .mc-recipe-book-entry[data-recipe-id]';

export function craftingRightSlotButtons(root: HTMLElement): (HTMLButtonElement | null)[] {
  const right = root.querySelector('.mc-inventory-screen-frame__right .mc-crafting');
  const grids = right?.querySelectorAll('.mc-workstation__inventory .mc-inventory');
  const grid = (index: number) => Array.from(grids?.[index]?.querySelectorAll<HTMLButtonElement>('[role="gridcell"] > .mc-slot') ?? []);
  return [...Array.from(right?.querySelectorAll<HTMLButtonElement>('.mc-crafting__grid [role="gridcell"] > .mc-slot') ?? []),
    right?.querySelector<HTMLButtonElement>('.mc-crafting__result') ?? null, ...grid(0), ...grid(1)];
}
function useCraftingVisualState(root: RefObject<HTMLElement | null>, enabled: boolean) {
  const [state, setState] = useState(emptyCraftingSourceVisualState);
  useBrowserLayoutEffect(() => {
    const node = root.current, view = node?.ownerDocument.defaultView;
    if (!enabled || !node || !view) return;
    let pressed: Element | null = null, frame = 0;
    const composing = new Set<Element>();
    const read = (element: Element | null): WorkstationControlState => ({ hover: !!element?.matches(':hover'), focus: !!element?.matches(':focus-visible'),
      pressed: !!element && pressed === element, disabled: !!element?.hasAttribute('disabled'),
      selected: element?.getAttribute('aria-selected') === 'true' || element?.getAttribute('aria-pressed') === 'true' });
    const map = (selector: string, attribute: string) => new Map(Array.from(node.querySelectorAll(selector), element => [element.getAttribute(attribute)!, read(element)]));
    const sync = () => {
      const input = node.querySelector<HTMLInputElement>('.mc-recipe-book__search input');
      const next: CraftingSourceVisualState = { right: craftingRightSlotButtons(node).map(read),
        recipes: map(recipeButtons, 'data-recipe-id'),
        categories: map('.mc-recipe-book__categories [data-category]', 'data-category'), toolbar: map('.mc-inventory-screen-frame__toolbar [data-toolbar-control]', 'data-toolbar-control'),
        filter: read(node.querySelector('.mc-recipe-book .mc-recipe-filter-toggle')), clear: read(node.querySelector('.mc-recipe-book .mc-search-field__clear')),
        scrollbar: read(node.querySelector('.mc-recipe-book .mc-scrollbar[data-orientation="vertical"]')),
        search: { ...read(input), focus: !!input && node.ownerDocument.activeElement === input, composing: !!input && composing.has(input) } };
      const signature = (value: CraftingSourceVisualState) => JSON.stringify({ ...value, recipes: [...value.recipes], categories: [...value.categories], toolbar: [...value.toolbar] });
      setState(previous => signature(previous) === signature(next) ? previous : next);
    };
    const update = (event: Event) => {
      const target = event.target;
      if (target instanceof view.Element) {
        if (event.type === 'pointerdown') pressed = target.closest('button,[role="scrollbar"]');
        if (event.type === 'compositionstart') composing.add(target);
        if (event.type === 'compositionend' || event.type === 'focusout') composing.delete(target);
      }
      if (['pointerup', 'pointercancel', 'blur'].includes(event.type)) pressed = null;
      if (event.type === 'blur') composing.clear();
      sync(); if (frame) view.cancelAnimationFrame(frame); frame = view.requestAnimationFrame(() => { frame = 0; sync(); });
    };
    const events = ['pointerover', 'pointerout', 'pointerdown', 'focusin', 'focusout', 'keydown', 'keyup', 'click', 'compositionstart', 'compositionend'];
    const globals = ['pointerup', 'pointercancel', 'blur'];
    events.forEach(name => node.addEventListener(name, update, true)); globals.forEach(name => view.addEventListener(name, update, true));
    const observer = new view.MutationObserver(sync);
    observer.observe(node, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'aria-selected', 'aria-pressed'] }); sync();
    return () => { if (frame) view.cancelAnimationFrame(frame); observer.disconnect(); events.forEach(name => node.removeEventListener(name, update, true)); globals.forEach(name => view.removeEventListener(name, update, true)); };
  }, [root, enabled]);
  return state;
}

function useCraftingMarkers(root: RefObject<HTMLElement | null>, value: PreparedCraftingSource | undefined) {
  useBrowserLayoutEffect(() => {
    const node = root.current, view = node?.ownerDocument.defaultView; if (!node || !view || !value) return;
    const owned = new Map<HTMLElement, Map<string, string | null>>();
    const clear = () => { owned.forEach((attributes, element) => attributes.forEach((original, key) => {
      if (element.getAttribute(key) !== 'true') return;
      if (original === null) element.removeAttribute(key); else element.setAttribute(key, original);
    })); owned.clear(); };
    const mark = (element: HTMLElement | null, key: string) => {
      if (!element) return;
      let attributes = owned.get(element); if (!attributes) { attributes = new Map(); owned.set(element, attributes); }
      if (!attributes.has(key)) attributes.set(key, element.getAttribute(key));
      element.setAttribute(key, 'true');
    };
    const sync = () => {
      clear(); if (!node.querySelector(ready)) return;
      const art = new Set(value.recipeArtIds), counts = new Set(value.recipeCountIds), icons = new Set(value.categoryIconIds), paint = new Set(value.recipePaintIds);
      node.querySelectorAll<HTMLElement>(recipeButtons).forEach(button => {
        const id = button.getAttribute('data-recipe-id')!;
        if (paint.has(id)) mark(button, 'data-mc-crafting-recipe');
        if (art.has(id)) mark(button, 'data-mc-crafting-art'); if (counts.has(id)) mark(button, 'data-mc-crafting-count');
      });
      node.querySelectorAll<HTMLElement>('.mc-recipe-book__categories [data-category]').forEach(button => { if (icons.has(button.getAttribute('data-category')!)) mark(button, 'data-mc-crafting-icon'); });
      const slots = craftingRightSlotButtons(node); slots.forEach(button => mark(button, 'data-mc-crafting-slot'));
      value.overlaySlots.forEach(index => mark(slots[index] ?? null, 'data-mc-crafting-overlays'));
      value.inventoryCountSlots.forEach(index => mark(slots[index] ?? null, 'data-mc-crafting-count'));
    };
    const observer = new view.MutationObserver(sync); observer.observe(node, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-render-state'] }); sync();
    return () => { observer.disconnect(); clear(); };
  }, [root, value]);
}

export function useCraftingScreenImageLayer(profile: CraftingScreenImageRenderProfile | undefined, root: RefObject<HTMLElement | null>, content: CraftingSourceContent) {
  const viewport = useRef<HTMLDivElement | null>(null);
  const [scroll, setScroll] = useState<CraftingSourceScroll>({ topGame: 0, hasScrollbar: false });
  const syncScroll = useCallback(() => {
    const element = viewport.current;
    const next = { topGame: element ? Math.max(0, element.scrollTop) / 2 : 0, hasScrollbar: !!element && element.scrollHeight > element.clientHeight };
    setScroll(previous => previous.topGame === next.topGame && previous.hasScrollbar === next.hasScrollbar ? previous : next);
  }, []);
  const bind = useCallback((element: HTMLDivElement | null) => { viewport.current = element; syncScroll(); }, [syncScroll]);
  const bridge = useMemo(() => profile ? { bind, scroll: syncScroll } : undefined, [profile, bind, syncScroll]);
  const visual = useCraftingVisualState(root, !!profile);
  useBrowserLayoutEffect(() => { if (profile) syncScroll(); }, [profile, content.recipeBook.entries, content.recipeBook.categoryId, content.layout, syncScroll]);
  const prepared = useMemo(() => {
    if (!profile) return undefined;
    try { return { value: prepareCraftingSource(profile, content, visual, scroll) }; }
    catch (reason) { return { error: reason instanceof Error ? reason.message : String(reason) }; }
  }, [profile, content, visual, scroll]);
  const value = prepared?.value;
  useWorkstationItemMarkers(root, !!value, ready, craftingRightSlotButtons, value?.imageSlots ?? [], value?.modelSlots ?? []);
  useCraftingMarkers(root, value);
  if (!profile || !prepared) return { bridge, layer: null, presentation: undefined };
  if (!value) return { bridge, presentation: undefined, layer: <span className="mc-crafting-image-error" aria-hidden="true" data-render-state="error" data-render-error={prepared.error}/> };
  const window = value.window;
  return { bridge, presentation: window.presentation, layer: <div className="mc-crafting-image-window" aria-hidden="true"
    style={{ left: window.left, top: window.top, width: window.width, height: window.height }}
    data-frame-origin={value.origin.join(',')} data-output-rect={value.outputRect.join(',')} data-right-slots="46" data-recipe-count={content.recipeBook.entries.length}
    data-text-crafting={value.textRoles.has('crafting') || undefined} data-text-inventory={value.textRoles.has('inventory') || undefined}
    data-text-recipe-title={value.textRoles.has('recipeTitle') || undefined} data-text-query={value.textRoles.has('query') || value.textRoles.has('placeholder') || undefined}>
    <GuiLayer className="mc-crafting-image-layer" {...profile.frame} commands={value.commands} outputRect={value.outputRect} style={workstationCanvasStyle(profile.frame.guiScale, window)}/>
  </div> };
}
