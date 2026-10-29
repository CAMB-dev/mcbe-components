import { useMemo } from 'react';
import type { RefObject } from 'react';
import { GuiLayer } from './gui-layer-component';
import type { GuiLayerCommand } from './gui-layer-component';
import type { GuiImageRect } from './gui-image-geometry';
import type { InventoryItem } from './inventory';
import { workstationImageAssets as assets } from './workstation-image-assets';
import {
  layoutWorkstationWindow, resolveWorkstationFrame, sourceImage, sourceItemCommands, sourceSlotPaint, sourceText,
  useWorkstationItemMarkers, useWorkstationVisualState, validateWorkstationLabelMetrics, workstationCanvasStyle,
} from './workstation-source-layer';
import type { WorkstationImageProfile, WorkstationLabelMetrics, WorkstationTextStyle } from './workstation-source-layer';

/** Explicit whole-frame source inputs; ordinary themed CSS is the default. */
export interface GrindstoneImageRenderProfile extends WorkstationImageProfile {
  /** Actual physical target dimensions and source GUI scale, independent of CSS/DPR. */
  frame: WorkstationImageProfile['frame'];
  /** GLOBAL game-space origin; omission centers176×166 on the ceiled source stage. */
  origin?: readonly [number, number];
  /** Uniform presentation multiplier of the GUI2 semantic plane; defaults to one. */
  displayScale?: number;
  /** Optional caller-owned packed-cell labels, composed into the same target. */
  text?: GrindstoneTextRenderProfile;
  /** Opt in plain item.image sprites; arbitrary custom icons retain their DOM fallback. */
  itemImages?: boolean;
  /** Opt in explicit item.guiModel data, with the existing visual as atomic fallback. */
  itemModels?: boolean;
}
export type GrindstoneTextRenderStyle = WorkstationTextStyle;
export interface GrindstoneTextRenderProfile {
  /** Declared label metrics in GAME units; never inferred from glyph ink. */
  metrics: WorkstationLabelMetrics;
  labels: GrindstoneTextRenderStyle;
}

// Original grindstone_screen/ui_common source rectangles. The leading three
// repair slots are followed by27 inventory and9 hotbar slots, in known DOM order.
const slotRects: readonly GuiImageRect[] = [[43, 28, 18, 18], [43, 49, 18, 18], [115, 38.5, 18, 18],
  ...Array.from({ length: 27 }, (_, index): GuiImageRect => [7 + index % 9 * 18, 86 + Math.floor(index / 9) * 18, 18, 18]),
  ...Array.from({ length: 9 }, (_, index): GuiImageRect => [7 + index * 18, 143, 18, 18])];
function slotButtons(root: HTMLElement): (HTMLButtonElement | null)[] {
  const grids = root.querySelectorAll('.mc-workstation__inventory .mc-inventory');
  const grid = (index: number) => Array.from(grids[index]?.querySelectorAll<HTMLButtonElement>('[role="gridcell"] > .mc-slot') ?? []);
  return [root.querySelector('.mc-grindstone__input'), root.querySelector('.mc-grindstone__additional'), root.querySelector('.mc-grindstone__result'), ...grid(0), ...grid(1)];
}
const add = (a: number, b: number) => Math.fround(Math.fround(a) + Math.fround(b));
function labelOrigins(origin: readonly [number, number], metrics: WorkstationLabelMetrics) {
  validateWorkstationLabelMetrics(metrics);
  const [x, y] = origin, [paintX, paintY] = metrics.paintOffset;
  return { title: [add(add(x, 8), paintX), add(add(y, 8), paintY)] as const,
    inventory: [add(add(x, 7), paintX), add(add(y, 76), paintY)] as const };
}

type VisualState = ReturnType<typeof useWorkstationVisualState>;
function prepare(profile: GrindstoneImageRenderProfile, state: VisualState, close: boolean, invalid: boolean,
  title: string, inventoryLabel: string, items: readonly (InventoryItem | null | undefined)[]) {
  const frame = resolveWorkstationFrame(profile), { origin } = frame;
  const commands: GuiLayerCommand[] = [];
  const image = (asset: Parameters<typeof sourceImage>[0], rect: GuiImageRect, alpha = 1) => commands.push({ kind: 'image', ...sourceImage(asset, rect, origin, alpha) });
  image(assets.panel, [0, 0, 176, 166]);
  if (close) image(state.close.pressed ? assets.closeNormalPressed : state.close.hover || state.close.focus ? assets.closeNormalHover : assets.closeNormal, [156, 5, 15, 15]);
  if (profile.text !== undefined) {
    const text = profile.text;
    if (!text || !text.labels) throw new RangeError('A combined Grindstone profile requires an explicit label font style.');
    const anchors = labelOrigins(origin, text.metrics);
    commands.push(sourceText(title, text.labels, anchors.title, [76, 76, 76, 255]), sourceText(inventoryLabel, text.labels, anchors.inventory, [76, 76, 76, 255]));
  }
  const slots = sourceSlotPaint(slotRects, state.slots, origin);
  commands.push(...slots.cells.map(item => ({ kind: 'image' as const, ...item })));
  image(assets.grindstoneArrow, [77, 40, 22, 15]);
  if (invalid) image(assets.grindstoneInvalid, [80.5, 40, 15, 15]);
  commands.push(...slots.overlays.map(item => ({ kind: 'image' as const, ...item })));
  const itemsLayer = sourceItemCommands(profile, slotRects, items, state.slots, origin);
  commands.push(...itemsLayer.commands);
  return { ...layoutWorkstationWindow(profile, origin, commands), origin, commands,
    itemImageSlots: itemsLayer.imageSlots, itemModelSlots: itemsLayer.modelSlots, textLabels: profile.text !== undefined };
}

export function useGrindstoneImageLayer(profile: GrindstoneImageRenderProfile | undefined, root: RefObject<HTMLElement | null>,
  close: boolean, invalid: boolean, title: string, inventoryLabel: string, items: readonly (InventoryItem | null | undefined)[]) {
  const state = useWorkstationVisualState(root, !!profile, slotButtons, slotRects.length);
  const prepared = useMemo(() => {
    if (!profile) return undefined;
    try { return { value: prepare(profile, state, close, invalid, title, inventoryLabel, items) }; }
    catch (reason) {
      let presentation: ReturnType<typeof layoutWorkstationWindow>['presentation'] | null = null;
      // A bad optional font/model request keeps only the valid frame reservation;
      // never paint an image-only partial success while other visuals fall back.
      try { presentation = prepare({ ...profile, text: undefined, itemImages: undefined, itemModels: undefined }, state, close, invalid, title, inventoryLabel, items).presentation; }
      catch { /* Invalid frame/scale retains the ordinary unscaled CSS fallback. */ }
      return { error: reason instanceof Error ? reason.message : String(reason), presentation };
    }
  }, [profile, state, close, invalid, title, inventoryLabel, items]);
  const value = prepared?.value;
  useWorkstationItemMarkers(root, !!profile && !!value,
    ':scope > .mc-grindstone-image-window > .mc-grindstone-image-layer[data-render-state="ready"]',
    slotButtons, value?.itemImageSlots ?? [], value?.itemModelSlots ?? []);
  if (!profile || !prepared) return { presentation: null, layer: null };
  if (!value) return { presentation: prepared.presentation ?? null,
    layer: <span className="mc-grindstone-image-error" aria-hidden="true" data-render-state="error" data-render-error={prepared.error}/> };
  return { presentation: value.presentation, layer: <div className="mc-grindstone-image-window" aria-hidden="true"
    style={{ left: value.left, top: value.top, width: value.width, height: value.height }}
    data-frame-origin-x={value.origin[0]} data-frame-origin-y={value.origin[1]} data-output-rect={value.outputRect.join(',')}
    data-item-images={value.itemImageSlots.length ? value.itemImageSlots.join(' ') : undefined}
    data-item-models={value.itemModelSlots.length ? value.itemModelSlots.join(' ') : undefined} data-text-labels={value.textLabels || undefined}>
    <GuiLayer className="mc-grindstone-image-layer" {...profile.frame} commands={value.commands} outputRect={value.outputRect} style={workstationCanvasStyle(profile.frame.guiScale, value)}/>
  </div> };
}
