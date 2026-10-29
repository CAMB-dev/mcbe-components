import { createContext, useEffect, useLayoutEffect, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import type { GuiImage } from './gui-image';
import type { GuiImageLayout, GuiImageNineSlice, GuiImageRect, GuiImageRgba } from './gui-image-geometry';
import { layoutGuiImages } from './gui-image-geometry';
import type { GuiLayerLayout } from './gui-layer';
import { layoutSourceGuiLayer } from './gui-layer';
import type { GuiLayerCommand } from './gui-layer-component';
import type { GuiTextFont, GuiTextGeometry, GuiTextRgba8 } from './gui-text-geometry';
import type { InventoryItem } from './inventory';
import { workstationImageAssets as assets } from './workstation-image-assets';

/** Private common source-workstation contracts; no renderer state is inferred from DOM geometry. */
export interface WorkstationImageProfile {
  frame: { width: number; height: number; guiScale: number };
  origin?: readonly [number, number];
  displayScale?: number;
}
export interface WorkstationPresentation { scale: number; left: number; top: number; right: number; bottom: number }
// undefined isolates unrelated/nested workstations; null keeps the stable CSS plane.
export const WorkstationImagePresentation = createContext<WorkstationPresentation | null | undefined>(undefined);
export interface WorkstationTextStyle {
  font: GuiTextFont;
  fontScale: number;
  sampling: GuiTextGeometry['sampling'];
  shader: GuiTextGeometry['shader'];
  color?: GuiTextRgba8;
  tint?: GuiImageRgba;
  hudOpacity?: number;
  shadow?: GuiTextGeometry['shadow'];
  scissor?: GuiTextGeometry['scissor'];
}
export interface WorkstationLabelMetrics { lineHeight: number; paintOffset: readonly [number, number] }
export interface WorkstationControlState { hover: boolean; focus: boolean; pressed: boolean; selected: boolean; disabled: boolean }
export interface WorkstationInputControlState extends WorkstationControlState { composing: boolean }
export interface WorkstationInputControl { input: HTMLInputElement | null; hoverTarget?: Element | null }
export type WorkstationNamedControlResolvers<Key extends string> = Readonly<Record<Key, (root: HTMLElement) => WorkstationInputControl>>;
interface WorkstationVisualState { slots: WorkstationControlState[]; close: WorkstationControlState }
export interface WorkstationItemProfile { itemImages?: boolean; itemModels?: boolean }
export interface WorkstationImageAsset { url: string; nineSlice?: GuiImageNineSlice }

export function resolveWorkstationFrame(profile: WorkstationImageProfile, size: readonly [number, number] = [176, 166]) {
  const { width, height, guiScale } = profile.frame, scale = profile.displayScale ?? 1;
  if (!Number.isFinite(scale) || scale <= 0 || scale > 32) throw new RangeError('Image displayScale must be positive and at most32.');
  const origin = profile.origin ?? [(Math.ceil(width / guiScale) - size[0]) / 2, (Math.ceil(height / guiScale) - size[1]) / 2] as const;
  if (origin.length !== 2 || [...origin].some(value => !Number.isFinite(value))) throw new RangeError('Image origin requires two finite game coordinates.');
  return { width, height, guiScale, scale, origin };
}
export function sourceImage(asset: WorkstationImageAsset, local: GuiImageRect, origin: readonly [number, number], alpha = 1): GuiImage {
  return { texture: asset.url, rect: [local[0] + origin[0], local[1] + origin[1], local[2], local[3]], nineSlice: asset.nineSlice, hudOpacity: alpha };
}
export function validateWorkstationLabelMetrics(metrics: WorkstationLabelMetrics): void {
  if (!metrics || !Number.isFinite(metrics.lineHeight) || Math.fround(metrics.lineHeight) <= 0 || !Number.isFinite(Math.fround(metrics.lineHeight))
    || !Array.isArray(metrics.paintOffset) || metrics.paintOffset.length !== 2 || [...metrics.paintOffset].some(value => !Number.isFinite(value) || !Number.isFinite(Math.fround(value)))) {
    throw new RangeError('Explicit finite label metrics and a positive game-space lineHeight are required.');
  }
}
export function sourceText(text: string, style: WorkstationTextStyle, origin: readonly [number, number], color: GuiTextRgba8): GuiLayerCommand & { kind: 'text' } {
  return { kind: 'text', text, font: style.font, fontScale: style.fontScale, sampling: style.sampling, shader: style.shader,
    color: style.color ?? color, tint: style.tint, hudOpacity: style.hudOpacity, origin,
    ...(style.shadow !== undefined ? { shadow: style.shadow } : {}), ...(style.scissor !== undefined ? { scissor: style.scissor } : {}) };
}
export function sourceSlotPaint(rects: readonly GuiImageRect[], states: readonly WorkstationControlState[], origin: readonly [number, number]) {
  const cells = rects.map((rect, index) => sourceImage(states[index]?.selected ? assets.selected : assets.cell, rect, origin));
  const overlays: GuiImage[] = [];
  rects.forEach(([x, y, width, height], index) => {
    const state = states[index]; if (state?.disabled) return;
    if (state?.hover) overlays.push(sourceImage(assets.highlight, [x + 1, y + 1, width - 2, height - 2], origin, .8));
    if (state?.hover || state?.focus) overlays.push(sourceImage(assets.focus, [x, y, width, height], origin));
  });
  return { cells, overlays };
}
export function sourceItemCommands(profile: WorkstationItemProfile, rects: readonly GuiImageRect[], items: readonly (InventoryItem | null | undefined)[],
  states: readonly WorkstationControlState[], origin: readonly [number, number]) {
  if (profile.itemImages !== undefined && typeof profile.itemImages !== 'boolean') throw new RangeError('itemImages must be an explicit boolean.');
  if (profile.itemModels !== undefined && typeof profile.itemModels !== 'boolean') throw new RangeError('itemModels must be an explicit boolean.');
  const imageSlots: number[] = [], modelSlots: number[] = [], commands: GuiLayerCommand[] = [];
  if (profile.itemImages || profile.itemModels) rects.forEach(([x, y], index) => {
    const item = items[index];
    const amount = item?.count === undefined ? undefined : Number.isFinite(item.count) ? Math.max(0, Math.floor(item.count)) : 0;
    if (!item || amount === 0) return;
    if (profile.itemModels && item.guiModel !== undefined) {
      const model = item.guiModel, hudOpacity = model.hudOpacity ?? 1;
      if (!Number.isFinite(hudOpacity) || hudOpacity < 0 || hudOpacity > 1) throw new RangeError('Model hudOpacity must be normalized.');
      commands.push({ ...model, kind: 'model', origin: [x + 1 + origin[0], y + 1 + origin[1]], hudOpacity: hudOpacity * (states[index]?.disabled ? .5 : 1) });
      modelSlots.push(index); return;
    }
    if (!profile.itemImages || item.icon != null || typeof item.image !== 'string' || !item.image.trim()) return;
    commands.push({ kind: 'sprite', texture: item.image.trim(), rect: [x + 1 + origin[0], y + 1 + origin[1], 16, 16],
      color: [255, 255, 255, 255], hudOpacity: states[index]?.disabled ? .5 : 1 });
    imageSlots.push(index);
  });
  return { commands, imageSlots, modelSlots };
}

export function layoutWorkstationWindow(profile: WorkstationImageProfile, origin: readonly [number, number],
  input: readonly GuiLayerCommand[] | GuiImageLayout | GuiLayerLayout, size: readonly [number, number] = [352, 332]) {
  const { width, height, guiScale } = profile.frame, scale = profile.displayScale ?? 1;
  const layout: GuiImageLayout | GuiLayerLayout = Array.isArray(input)
    ? layoutSourceGuiLayer({ width, height, guiScale, commands: input }) : input as GuiImageLayout | GuiLayerLayout;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const bounds = (mvp: Float32Array, vertices: readonly { position: readonly number[] }[], scissor?: GuiImageRect) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const vertex of vertices) {
      const x = ((mvp[0]! * vertex.position[0]! + mvp[4]! * vertex.position[1]! + mvp[12]!) + 1) * width / 2;
      const y = (1 - (mvp[1]! * vertex.position[0]! + mvp[5]! * vertex.position[1]! + mvp[13]!)) * height / 2;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    if (scissor && (scissor[0] !== 0 || scissor[1] !== 0 || scissor[2] !== width || scissor[3] !== height)) {
      x0 = Math.max(x0, scissor[0]); y0 = Math.max(y0, scissor[1]);
      x1 = Math.min(x1, scissor[0] + scissor[2]); y1 = Math.min(y1, scissor[1] + scissor[3]);
      if (x1 <= x0 || y1 <= y0) return;
    }
    minX = Math.min(minX, x0); minY = Math.min(minY, y0); maxX = Math.max(maxX, x1); maxY = Math.max(maxY, y1);
  };
  if ('commands' in layout) for (const command of layout.commands) {
    if (command.kind === 'model') for (const run of command.layout.runs) bounds(command.layout.mvp, run.mesh.vertices);
    else if (command.kind !== 'text') bounds(layout.mvp, command.mesh.vertices);
    else for (const run of command.layout.runs) bounds(run.mvp, run.vertices, run.scissor);
  }
  else for (const mesh of layout.meshes) bounds(layout.mvp, mesh.vertices);
  const x = Math.max(0, Math.floor(minX) - 1), y = Math.max(0, Math.floor(minY) - 1);
  const right = Math.min(width, Math.ceil(maxX) + 1), bottom = Math.min(height, Math.ceil(maxY) + 1);
  if (right <= x || bottom <= y) throw new RangeError('Image panel is outside the explicit framebuffer.');
  const outputRect: GuiImageRect = [x, y, right - x, bottom - y], k = 2 / guiScale;
  const tx = x * k - 2 * origin[0], ty = y * k - 2 * origin[1];
  const left = Math.floor(tx) - 1, top = Math.floor(ty) - 1;
  const windowRight = Math.ceil(tx + outputRect[2] * k) + 1, windowBottom = Math.ceil(ty + outputRect[3] * k) + 1;
  return { outputRect, origin, left, top, width: windowRight - left, height: windowBottom - top, translateX: tx - left, translateY: ty - top,
    presentation: { scale, left: Math.max(6, -left), top: Math.max(6, -top), right: Math.max(6, windowRight - size[0]), bottom: Math.max(6, windowBottom - size[1]) } };
}
export function workstationCanvasStyle(guiScale: number, value: { outputRect: GuiImageRect; translateX: number; translateY: number }): CSSProperties {
  const pixelScale = 2 / guiScale;
  return { position: 'absolute', width: value.outputRect[2], height: value.outputRect[3], '--mc-image-pixel-scale': pixelScale,
    '--mc-image-translate-x': `${value.translateX}px`, '--mc-image-translate-y': `${value.translateY}px`,
    '--mc-image-zoom-left': `${value.translateX / pixelScale}px`, '--mc-image-zoom-top': `${value.translateY / pixelScale}px` } as CSSProperties;
}

const empty = (): WorkstationControlState => ({ hover: false, focus: false, pressed: false, selected: false, disabled: false });
const emptyInput = (): WorkstationInputControlState => ({ ...empty(), composing: false });
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
export function useWorkstationVisualState<Key extends string>(root: RefObject<HTMLElement | null>, enabled: boolean,
  slotResolver: (root: HTMLElement) => readonly (HTMLButtonElement | null)[], slotCount: number,
  namedControls: WorkstationNamedControlResolvers<Key>): WorkstationVisualState & { controls: Record<Key, WorkstationInputControlState> };
// Keep the legacy overload last: existing ReturnType callers retain the slots/close contract.
export function useWorkstationVisualState(root: RefObject<HTMLElement | null>, enabled: boolean,
  slotResolver: (root: HTMLElement) => readonly (HTMLButtonElement | null)[], slotCount: number): WorkstationVisualState;
export function useWorkstationVisualState(root: RefObject<HTMLElement | null>, enabled: boolean,
  slotResolver: (root: HTMLElement) => readonly (HTMLButtonElement | null)[], slotCount: number,
  namedControls?: WorkstationNamedControlResolvers<string>) {
  const [state, setState] = useState<WorkstationVisualState & { controls?: Record<string, WorkstationInputControlState> }>(() => ({
    slots: Array.from({ length: slotCount }, empty), close: empty(),
    ...(namedControls ? { controls: Object.fromEntries(Object.keys(namedControls).map(key => [key, emptyInput()])) } : {}),
  }));
  useBrowserLayoutEffect(() => {
    const node = root.current; if (!enabled || !node) return;
    let pressed: HTMLButtonElement | null = null, frame = 0;
    let pressedTarget: Element | null = null;
    const composing = new Set<HTMLInputElement>();
    const read = (button: HTMLButtonElement | null): WorkstationControlState => button ? {
      hover: !button.disabled && matchMedia('(hover: hover)').matches && button.matches(':hover'), focus: !button.disabled && button.matches(':focus-visible'),
      pressed: !button.disabled && (pressed === button || button.matches(':active')), selected: button.getAttribute('aria-pressed') === 'true', disabled: button.disabled,
    } : empty();
    const readInput = ({ input, hoverTarget }: WorkstationInputControl): WorkstationInputControlState => {
      if (!input || !node.contains(input)) return emptyInput();
      const disabled = input.disabled || input.matches(':disabled'), target = hoverTarget ?? input;
      if (disabled) composing.delete(input);
      return {
        hover: !disabled && matchMedia('(hover: hover)').matches && target.matches(':hover'),
        focus: !disabled && (input.ownerDocument.activeElement === input || input.matches(':focus-visible')),
        pressed: !disabled && ((pressedTarget !== null && target.contains(pressedTarget)) || input.matches(':active') || target.matches(':active')),
        selected: input.getAttribute('aria-pressed') === 'true', disabled, composing: composing.has(input),
      };
    };
    const sync = () => { const next = { slots: slotResolver(node).map(read), close: read(node.querySelector('.mc-dialog__close')),
      ...(namedControls ? { controls: Object.fromEntries(Object.entries(namedControls).map(([key, resolve]) => [key, readInput(resolve(node))])) } : {}) };
      for (const input of composing) if (!node.contains(input)) composing.delete(input);
      setState(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next); };
    const update = (event: Event) => {
      const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
      if (event.type === 'pointerdown' && button && node.contains(button)) pressed = button;
      if (event.type === 'keydown' && button && [' ', 'Enter'].includes((event as globalThis.KeyboardEvent).key)) pressed = button;
      if (['pointerup', 'pointercancel', 'keyup', 'blur'].includes(event.type)) pressed = null;
      if (namedControls) {
        const target = event.target instanceof Element ? event.target : null;
        if (event.type === 'pointerdown' && target && node.contains(target)) pressedTarget = target;
        if (event.type === 'keydown' && target instanceof HTMLInputElement && [' ', 'Enter'].includes((event as globalThis.KeyboardEvent).key)) pressedTarget = target;
        if (['pointerup', 'pointercancel', 'keyup', 'blur'].includes(event.type)) pressedTarget = null;
        if (target instanceof HTMLInputElement) {
          if (event.type === 'compositionstart' && Object.values(namedControls).some(resolve => resolve(node).input === target)) composing.add(target);
          if (event.type === 'compositionend' || event.type === 'focusout') composing.delete(target);
        }
        if (event.type === 'blur') composing.clear();
      }
      sync(); cancelAnimationFrame(frame); frame = requestAnimationFrame(sync);
    };
    const events = ['pointerover', 'pointerout', 'pointerdown', 'focusin', 'focusout', 'keydown', 'click',
      ...(namedControls ? ['compositionstart', 'compositionend'] : [])], globals = ['pointerup', 'pointercancel', 'keyup', 'blur'];
    events.forEach(event => node.addEventListener(event, update, true)); globals.forEach(event => window.addEventListener(event, update, true));
    const observer = new MutationObserver(sync); observer.observe(node, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'disabled', 'aria-pressed'] }); sync();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); events.forEach(event => node.removeEventListener(event, update, true)); globals.forEach(event => window.removeEventListener(event, update, true)); };
  }, [root, enabled, slotResolver, namedControls]);
  return state;
}
/** Mark only actual ready paint. Changes in loading/error/keyed canvases clear the owned markers synchronously. */
export function useWorkstationItemMarkers(root: RefObject<HTMLElement | null>, enabled: boolean, readySelector: string,
  slotResolver: (root: HTMLElement) => readonly (HTMLButtonElement | null)[], imageSlots: readonly number[], modelSlots: readonly number[]): void {
  useBrowserLayoutEffect(() => {
    const node = root.current; if (!enabled || !node) return;
    const owned = new Map<HTMLButtonElement, { value: string; original: string | null }>();
    const restore = (button: HTMLButtonElement) => {
      const record = owned.get(button); if (!record) return;
      if (button.getAttribute('data-mc-source-item') === record.value) {
        if (record.original === null) button.removeAttribute('data-mc-source-item'); else button.setAttribute('data-mc-source-item', record.original);
      }
      owned.delete(button);
    };
    const sync = () => {
      const buttons = slotResolver(node), accepted = new Map<number, string>();
      if (node.querySelector(readySelector)) { imageSlots.forEach(index => accepted.set(index, 'image')); modelSlots.forEach(index => accepted.set(index, 'model')); }
      const next = new Map<HTMLButtonElement, string>();
      accepted.forEach((value, index) => { const button = buttons[index]; if (button) next.set(button, value); });
      for (const button of owned.keys()) if (!next.has(button)) restore(button);
      next.forEach((value, button) => {
        const previous = owned.get(button);
        if (!previous) owned.set(button, { value, original: button.getAttribute('data-mc-source-item') }); else previous.value = value;
        if (button.getAttribute('data-mc-source-item') !== value) button.setAttribute('data-mc-source-item', value);
      });
    };
    const observer = new MutationObserver(sync); observer.observe(node, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-render-state'] }); sync();
    return () => { observer.disconnect(); for (const button of owned.keys()) restore(button); };
  }, [root, enabled, readySelector, slotResolver, imageSlots, modelSlots]);
}

/** Finite source-progress candidate validated against the observed Anvil bars; not a recovered unique engine algorithm. */
export function sourceDurability(frame: WorkstationImageProfile['frame'], origin: readonly [number, number], slot: GuiImageRect, ratio: number) {
  if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) throw new RangeError('Source durability requires a normalized finite ratio.');
  if (origin.length !== 2 || [...origin].some(value => !Number.isFinite(value)) || slot.length !== 4 || [...slot].some(value => !Number.isFinite(value))) throw new RangeError('Source durability requires finite source coordinates.');
  const f = Math.fround, left = f(f(origin[0] + slot[0]) + 3), top = f(f(origin[1] + slot[1]) + 13.5);
  const fillWidth = Math.max(0, Math.min(13, Math.floor(f(left + f(13 * ratio))) - Math.floor(left)));
  // The real inner12x1 primitive also supplies the zero-fill vertical extent;
  // no invalid zero-width image is passed to the ordinary layout validator.
  const layout = layoutGuiImages({ ...frame, images: [
    { rect: [left, top, 13, 2], physicalPrecision: 'float32' },
    { rect: [left, top, 12, 1], physicalPrecision: 'float32' },
    ...(fillWidth > 0 ? [{ rect: [left, top, fillWidth, 1] as const, physicalPrecision: 'float32' as const }] : []),
  ] });
  const raster = (mesh: typeof layout.meshes[number]): GuiImageRect => {
    const xs = mesh.vertices.map(vertex => vertex.position[0] * frame.guiScale), ys = mesh.vertices.map(vertex => vertex.position[1] * frame.guiScale);
    const clamp = (value: number, extent: number) => Math.max(0, Math.min(extent, Math.ceil(value - .5)));
    const x0 = clamp(Math.min(...xs), frame.width), y0 = clamp(Math.min(...ys), frame.height);
    const x1 = clamp(Math.max(...xs), frame.width), y1 = clamp(Math.max(...ys), frame.height);
    return [x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0)];
  };
  const background = raster(layout.meshes[0]!), inner = raster(layout.meshes[1]!);
  const foreground: GuiImageRect = fillWidth ? raster(layout.meshes[2]!) : [inner[0], inner[1], 0, inner[3]];
  const k = 2 / frame.guiScale;
  return { fillWidth, layout, physical: { background, inner, foreground },
    background: { left: background[0] * k - 2 * origin[0] - 2 * slot[0], top: background[1] * k - 2 * origin[1] - 2 * slot[1], width: background[2] * k, height: background[3] * k },
    foreground: { left: (foreground[0] - background[0]) * k, top: (foreground[1] - background[1]) * k, width: foreground[2] * k, height: foreground[3] * k } };
}

/** Align existing semantic meters only while the current complete source canvas is ready. */
export function useWorkstationDurability(root: RefObject<HTMLElement | null>, enabled: boolean, readySelector: string,
  slotResolver: (root: HTMLElement) => readonly (HTMLButtonElement | null)[], slotRects: readonly GuiImageRect[],
  frame: WorkstationImageProfile['frame'] | undefined, origin: readonly [number, number] | undefined): void {
  useBrowserLayoutEffect(() => {
    const node = root.current; if (!enabled || !node || !frame || !origin) return;
    type Value = { value: string; priority: string };
    type Record = { initialAttribute: string | null; initial: Map<string, Value>; baseline: Map<string, Value>; written: Map<string, Value>; requested: Map<string, string> };
    const owned = new Map<HTMLElement, Record>();
    const read = (element: HTMLElement, key: string): Value => ({ value: element.style.getPropertyValue(key), priority: element.style.getPropertyPriority(key) });
    const equal = (a: Value, b: Value) => a.value === b.value && a.priority === b.priority;
    const declarations = (element: HTMLElement) => new Map(Array.from({ length: element.style.length }, (_, index) => {
      const key = element.style.item(index); return [key, read(element, key)] as const;
    }));
    const restore = (element: HTMLElement) => {
      const record = owned.get(element); if (!record) return;
      record.written.forEach((value, key) => {
        if (!equal(read(element, key), value)) return;
        const original = record.baseline.get(key)!;
        if (original.value) element.style.setProperty(key, original.value, original.priority); else element.style.removeProperty(key);
      });
      const current = declarations(element);
      if (current.size === record.initial.size && [...current].every(([key, value]) => equal(value, record.initial.get(key) ?? { value: '', priority: '' }))) {
        if (record.initialAttribute === null) element.removeAttribute('style'); else element.setAttribute('style', record.initialAttribute);
      }
      owned.delete(element);
    };
    const paint = (element: HTMLElement, rect: { left: number; top: number; width: number; height: number }) => {
      let record = owned.get(element);
      if (!record) { record = { initialAttribute: element.getAttribute('style'), initial: declarations(element), baseline: new Map(), written: new Map(), requested: new Map() }; owned.set(element, record); }
      const values = { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, 'box-shadow': 'none' };
      for (const [key, value] of Object.entries(values)) {
        const current = read(element, key), previous = record.written.get(key);
        if (!previous || !equal(current, previous)) record.baseline.set(key, current);
        // CSSOM can canonicalize fractional px strings. An unchanged request
        // already held by us must not rewrite its normalized value forever.
        if (previous && equal(current, previous) && record.requested.get(key) === value) continue;
        // React writes ordinary inline styles. Distinct priority lets a new
        // host width be recognized even when its numeric value equals ours.
        const next = { value, priority: 'important' };
        if (!equal(current, next)) element.style.setProperty(key, value, next.priority);
        record.written.set(key, read(element, key));
        record.requested.set(key, value);
      }
    };
    const sync = () => {
      const active = new Map<HTMLElement, { left: number; top: number; width: number; height: number }>();
      if (node.querySelector(readySelector)) {
        try {
          slotResolver(node).forEach((button, index) => {
            const slot = slotRects[index], meter = button?.querySelector<HTMLElement>(':scope > .mc-slot__durability[role="meter"]');
            const child = meter?.firstElementChild;
            if (!slot || !meter || !(child instanceof HTMLElement)) return;
            const now = meter.getAttribute('aria-valuenow'), maximum = meter.getAttribute('aria-valuemax');
            if (now === null || maximum === null || !Number.isFinite(Number(now)) || !Number.isFinite(Number(maximum)) || Number(maximum) <= 0) return;
            const geometry = sourceDurability(frame, origin, slot, Math.max(0, Math.min(1, Number(now) / Number(maximum))));
            active.set(meter, geometry.background); active.set(child, geometry.foreground);
          });
        } catch { active.clear(); }
      }
      for (const element of owned.keys()) if (!active.has(element)) restore(element);
      active.forEach((rect, element) => paint(element, rect));
    };
    const observer = new MutationObserver(sync);
    observer.observe(node, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-valuenow', 'aria-valuemax', 'data-render-state', 'style'] }); sync();
    return () => { observer.disconnect(); for (const element of owned.keys()) restore(element); };
  }, [root, enabled, readySelector, slotResolver, slotRects, frame, origin]);
}
