import { createContext, useEffect, useLayoutEffect, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import type { GuiImage } from './gui-image';
import type { GuiImageLayout, GuiImageNineSlice, GuiImageRect, GuiImageRgba } from './gui-image-geometry';
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
}
export interface WorkstationLabelMetrics { lineHeight: number; paintOffset: readonly [number, number] }
export interface WorkstationControlState { hover: boolean; focus: boolean; pressed: boolean; selected: boolean; disabled: boolean }
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
    color: style.color ?? color, tint: style.tint, hudOpacity: style.hudOpacity, origin };
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
  const bounds = (mvp: Float32Array, vertices: readonly { position: readonly number[] }[]) => {
    for (const vertex of vertices) {
      const x = ((mvp[0]! * vertex.position[0]! + mvp[4]! * vertex.position[1]! + mvp[12]!) + 1) * width / 2;
      const y = (1 - (mvp[1]! * vertex.position[0]! + mvp[5]! * vertex.position[1]! + mvp[13]!)) * height / 2;
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  };
  if ('commands' in layout) for (const command of layout.commands) {
    if (command.kind === 'model') for (const run of command.layout.runs) bounds(command.layout.mvp, run.mesh.vertices);
    else if (command.kind !== 'text') bounds(layout.mvp, command.mesh.vertices);
    else for (const run of command.layout.runs) bounds(run.mvp, run.vertices);
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
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
export function useWorkstationVisualState(root: RefObject<HTMLElement | null>, enabled: boolean,
  slotResolver: (root: HTMLElement) => readonly (HTMLButtonElement | null)[], slotCount: number) {
  const [state, setState] = useState(() => ({ slots: Array.from({ length: slotCount }, empty), close: empty() }));
  useBrowserLayoutEffect(() => {
    const node = root.current; if (!enabled || !node) return;
    let pressed: HTMLButtonElement | null = null, frame = 0;
    const read = (button: HTMLButtonElement | null): WorkstationControlState => button ? {
      hover: !button.disabled && matchMedia('(hover: hover)').matches && button.matches(':hover'), focus: !button.disabled && button.matches(':focus-visible'),
      pressed: !button.disabled && (pressed === button || button.matches(':active')), selected: button.getAttribute('aria-pressed') === 'true', disabled: button.disabled,
    } : empty();
    const sync = () => { const next = { slots: slotResolver(node).map(read), close: read(node.querySelector('.mc-dialog__close')) };
      setState(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next); };
    const update = (event: Event) => {
      const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
      if (event.type === 'pointerdown' && button && node.contains(button)) pressed = button;
      if (event.type === 'keydown' && button && [' ', 'Enter'].includes((event as globalThis.KeyboardEvent).key)) pressed = button;
      if (['pointerup', 'pointercancel', 'keyup', 'blur'].includes(event.type)) pressed = null;
      sync(); cancelAnimationFrame(frame); frame = requestAnimationFrame(sync);
    };
    const events = ['pointerover', 'pointerout', 'pointerdown', 'focusin', 'focusout', 'keydown', 'click'], globals = ['pointerup', 'pointercancel', 'keyup', 'blur'];
    events.forEach(event => node.addEventListener(event, update, true)); globals.forEach(event => window.addEventListener(event, update, true));
    const observer = new MutationObserver(sync); observer.observe(node, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'disabled', 'aria-pressed'] }); sync();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); events.forEach(event => node.removeEventListener(event, update, true)); globals.forEach(event => window.removeEventListener(event, update, true)); };
  }, [root, enabled, slotResolver]);
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
