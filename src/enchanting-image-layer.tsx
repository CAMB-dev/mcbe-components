import { createContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import { GuiImageLayer } from './gui-image';
import type { GuiImage } from './gui-image';
import { layoutGuiImages } from './gui-image-geometry';
import type { GuiImageNineSlice, GuiImageRect } from './gui-image-geometry';
import { workstationImageAssets as assets } from './workstation-image-assets';

/** Explicit native-image layout inputs. CSS skins remain the default route. */
export interface EnchantingTableImageRenderProfile {
  frame: { width: number; height: number; guiScale: number };
  /** GLOBAL source-layout origin in game units; omission centers on the ceiled stage. */
  origin?: readonly [number, number];
  /** Uniform presentation multiplier of the existing GUI2 DOM; defaults to one. */
  displayScale?: number;
}
interface Presentation { scale: number; left: number; top: number; right: number; bottom: number }
// undefined means an unrelated WorkstationFrame; null means the same stable
// EnchantingTable DOM is currently using its CSS/loading/error presentation.
export const EnchantingImagePresentation = createContext<Presentation | null | undefined>(undefined);
interface Option { disabled?: boolean }
interface ControlState { hover: boolean; focus: boolean; pressed: boolean; selected: boolean; disabled: boolean }
interface VisualState { slots: ControlState[]; options: ControlState[]; close: ControlState }
const empty = (): ControlState => ({ hover: false, focus: false, pressed: false, selected: false, disabled: false });
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const initial = (): VisualState => ({ slots: Array.from({ length: 38 }, empty), options: Array.from({ length: 3 }, empty), close: empty() });
const slotRects: GuiImageRect[] = [[13, 47.5, 18, 18], [33, 47.5, 18, 18],
  ...Array.from({ length: 27 }, (_, i): GuiImageRect => [7 + i % 9 * 18, 86 + Math.floor(i / 9) * 18, 18, 18]),
  ...Array.from({ length: 9 }, (_, i): GuiImageRect => [7 + i * 18, 143, 18, 18])];

function buttons(root: HTMLElement): (HTMLButtonElement | null)[] {
  const grids = root.querySelectorAll('.mc-workstation__inventory .mc-inventory');
  // Known source collections, in their explicit row/cell DOM order. No DOM
  // measurement, localized label, or React registration ordering sets geometry.
  const grid = (index: number) => Array.from(grids[index]?.querySelectorAll<HTMLButtonElement>('[role="gridcell"] > .mc-slot') ?? []);
  return [root.querySelector('.mc-enchanting__item'), root.querySelector('.mc-enchanting__lapis'), ...grid(0), ...grid(1)];
}
function useVisualState(root: RefObject<HTMLElement | null>, enabled: boolean): VisualState {
  const [state, setState] = useState<VisualState>(initial);
  useBrowserLayoutEffect(() => {
    const node = root.current; if (!enabled || !node) return;
    let pressed: HTMLButtonElement | null = null, frame = 0;
    const read = (button: HTMLButtonElement | null): ControlState => button ? {
      hover: !button.disabled && matchMedia('(hover: hover)').matches && button.matches(':hover'),
      focus: !button.disabled && button.matches(':focus-visible'),
      pressed: !button.disabled && (pressed === button || button.matches(':active')),
      selected: button.getAttribute('aria-pressed') === 'true', disabled: button.disabled,
    } : empty();
    const sync = () => {
      const optionButtons = node.querySelectorAll<HTMLButtonElement>('.mc-enchanting__option');
      const optionStates = Array.from({ length: 3 }, empty);
      optionButtons.forEach(button => { const index = Number(button.dataset.enchantmentTier) - 1; if (index >= 0 && index < 3) optionStates[index] = read(button); });
      const next = { slots: buttons(node).map(read), options: optionStates, close: read(node.querySelector('.mc-dialog__close')) };
      setState(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const target = (event: Event) => event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
    const update = (event: Event) => {
      const button = target(event);
      if (event.type === 'pointerdown' && button && node.contains(button)) pressed = button;
      if (event.type === 'keydown' && button && [' ', 'Enter'].includes((event as globalThis.KeyboardEvent).key)) pressed = button;
      if (['pointerup', 'pointercancel', 'keyup', 'blur'].includes(event.type)) pressed = null;
      sync(); cancelAnimationFrame(frame); frame = requestAnimationFrame(sync);
    };
    const events = ['pointerover', 'pointerout', 'pointerdown', 'focusin', 'focusout', 'keydown', 'click'];
    events.forEach(event => node.addEventListener(event, update, true));
    const globals = ['pointerup', 'pointercancel', 'keyup', 'blur'];
    globals.forEach(event => window.addEventListener(event, update, true));
    const observer = new MutationObserver(sync);
    observer.observe(node, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'disabled', 'aria-pressed'] });
    sync();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); events.forEach(event => node.removeEventListener(event, update, true)); globals.forEach(event => window.removeEventListener(event, update, true)); };
  }, [root, enabled]);
  return state;
}

interface Asset { url: string; nineSlice?: GuiImageNineSlice }
function image(asset: Asset, local: GuiImageRect, origin: readonly [number, number], alpha = 1): GuiImage {
  return { texture: asset.url, rect: [local[0] + origin[0], local[1] + origin[1], local[2], local[3]],
    nineSlice: asset.nineSlice, hudOpacity: alpha };
}
interface Prepared {
  images: GuiImage[]; outputRect: GuiImageRect; origin: readonly [number, number];
  left: number; top: number; width: number; height: number; translateX: number; translateY: number;
  presentation: Presentation;
}
function prepare(profile: EnchantingTableImageRenderProfile, options: readonly Option[], state: VisualState, close: boolean): Prepared {
  const { width, height, guiScale } = profile.frame, scale = profile.displayScale ?? 1;
  if (!Number.isFinite(scale) || scale <= 0 || scale > 32) throw new RangeError('Image displayScale must be positive and at most32.');
  const origin = profile.origin ?? [(Math.ceil(width / guiScale) - 176) / 2, (Math.ceil(height / guiScale) - 166) / 2] as const;
  if (origin.length !== 2 || origin.some(value => !Number.isFinite(value))) throw new RangeError('Image origin requires two finite game coordinates.');
  const images: GuiImage[] = [image(assets.panel, [0, 0, 176, 166], origin)];
  if (close) images.push(image(state.close.pressed ? assets.closePressed : state.close.hover || state.close.focus ? assets.closeHover : assets.close, [156, 5, 15, 7], origin));
  images.push(image(assets.cell, [60.6, 13.1, 108.4, 62.8], origin));
  slotRects.forEach((rect, index) => images.push(image(state.slots[index]?.selected ? assets.selected : assets.cell, rect, origin)));
  images.push(image(assets.lapis, [34, 48.5, 16, 16], origin));
  slotRects.forEach(([x, y, w, h], index) => {
    const slot = state.slots[index]; if (slot?.disabled) return;
    if (slot?.hover) images.push(image(assets.highlight, [x + 1, y + 1, w - 2, h - 2], origin, .8));
    // common.highlight_slot_panel draws BOTH highlight and white border in its
    // hover control (also observed as old captured Global60/61).
    if (slot?.hover || slot?.focus) images.push(image(assets.focus, [x, y, w, h], origin));
  });
  const rowHeight = 60.8 / 3;
  const row = (index: number): GuiImageRect => [61.6, 14.1 + index * rowHeight, 106.4, 60.8 * .33333333];
  for (let index = 0; index < 3; index++) images.push(image(assets.optionDark, row(index), origin));
  options.slice(0, 3).forEach((option, index) => {
    const current = state.options[index];
    images.push(image(option.disabled || current?.pressed ? assets.optionUnselectable : current?.hover || current?.focus ? assets.optionHover : assets.optionSelectable, row(index), origin));
  });
  options.slice(0, 3).forEach((option, index) => {
    const selectable = [assets.dustSelectable1, assets.dustSelectable2, assets.dustSelectable3];
    const unavailable = [assets.dustUnselectable1, assets.dustUnselectable2, assets.dustUnselectable3];
    images.push(image((option.disabled ? unavailable : selectable)[index]!, [64.6, 14.1 + index * rowHeight + (rowHeight - 11) / 2, 13, 11], origin));
  });
  const layout = layoutGuiImages({ width, height, guiScale, images });
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const mesh of layout.meshes) for (const vertex of mesh.vertices) {
    const x = ((layout.mvp[0]! * vertex.position[0] + layout.mvp[12]!) + 1) * width / 2;
    const y = (1 - (layout.mvp[5]! * vertex.position[1] + layout.mvp[13]!)) * height / 2;
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  const x = Math.max(0, Math.floor(minX) - 1), y = Math.max(0, Math.floor(minY) - 1);
  const right = Math.min(width, Math.ceil(maxX) + 1), bottom = Math.min(height, Math.ceil(maxY) + 1);
  if (right <= x || bottom <= y) throw new RangeError('Image panel is outside the explicit framebuffer.');
  const outputRect: GuiImageRect = [x, y, right - x, bottom - y], k = 2 / guiScale;
  const tx = x * k - 2 * origin[0], ty = y * k - 2 * origin[1];
  const left = Math.floor(tx) - 1, top = Math.floor(ty) - 1;
  const windowRight = Math.ceil(tx + outputRect[2] * k) + 1, windowBottom = Math.ceil(ty + outputRect[3] * k) + 1;
  return { images, outputRect, origin, left, top, width: windowRight - left, height: windowBottom - top, translateX: tx - left, translateY: ty - top,
    presentation: { scale, left: Math.max(6, -left), top: Math.max(6, -top), right: Math.max(6, windowRight - 352), bottom: Math.max(6, windowBottom - 332) } };
}

export function useEnchantingImageLayer(profile: EnchantingTableImageRenderProfile | undefined, root: RefObject<HTMLElement | null>, options: readonly Option[], close: boolean) {
  const state = useVisualState(root, !!profile);
  const prepared = useMemo(() => {
    if (!profile) return undefined;
    try { return { value: prepare(profile, options, state, close) }; }
    catch (reason) { return { error: reason instanceof Error ? reason.message : String(reason) }; }
  }, [profile, options, state, close]);
  // Every profile change has a fresh immutable request; loading/error visibility
  // is switched by the actual canvas marker, not a delayed parent-state guess.
  if (!profile || !prepared) return { presentation: null, layer: null };
  if (!prepared.value) return { presentation: null, layer: <span className="mc-enchanting-image-error" aria-hidden="true" data-render-state="error" data-render-error={prepared.error}/> };
  const value = prepared.value;
  return { presentation: value.presentation, layer: <div className="mc-enchanting-image-window" aria-hidden="true" style={{ left: value.left, top: value.top, width: value.width, height: value.height }}
    data-frame-origin-x={value.origin[0]} data-frame-origin-y={value.origin[1]} data-output-rect={value.outputRect.join(',')}>
    <GuiImageLayer className="mc-enchanting-image-layer" {...profile.frame} images={value.images} outputRect={value.outputRect}
      style={{ position: 'absolute', left: 0, top: 0, width: value.outputRect[2], height: value.outputRect[3], transformOrigin: '0 0', transform: `translate(${value.translateX}px,${value.translateY}px) scale(${2 / profile.frame.guiScale})` }}/>
  </div> };
}
