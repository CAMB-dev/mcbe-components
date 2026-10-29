import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import { GuiImageLayer } from './gui-image';
import type { GuiImage } from './gui-image';
import { layoutGuiImages } from './gui-image-geometry';
import type { GuiImageRect, GuiImageRgba } from './gui-image-geometry';
import { GuiLayer } from './gui-layer-component';
import type { GuiLayerCommand } from './gui-layer-component';
import { layoutSourceGuiLayer } from './gui-layer';
import { layoutGuiText } from './gui-text-geometry';
import type { GuiTextFont, GuiTextGeometry, GuiTextRgba8 } from './gui-text-geometry';
import { workstationImageAssets as assets } from './workstation-image-assets';
import type { InventoryItem } from './inventory';
import { WorkstationImagePresentation as EnchantingImagePresentation, sourceImage as image, sourceText as textCommand, sourceItemCommands, sourceSlotPaint, resolveWorkstationFrame, layoutWorkstationWindow, workstationCanvasStyle, validateWorkstationLabelMetrics } from './workstation-source-layer';
import type { WorkstationPresentation } from './workstation-source-layer';

/** Explicit native-image layout inputs. CSS skins remain the default route. */
export interface EnchantingTableImageRenderProfile {
  frame: { width: number; height: number; guiScale: number };
  /** GLOBAL source-layout origin in game units; omission centers on the ceiled stage. */
  origin?: readonly [number, number];
  /** Uniform presentation multiplier of the existing GUI2 DOM; defaults to one. */
  displayScale?: number;
  /** Optional caller-owned packed-cell fonts, drawn with images into one target. */
  text?: EnchantingTableTextRenderProfile;
  /** Opt in plain, square item.image sprites in the source16x16 game area; custom icons stay in DOM. */
  itemImages?: boolean;
  /** Opt in explicit item.guiModel data; any icon/image remains its atomic DOM fallback. */
  itemModels?: boolean;
}
export interface EnchantingTableTextRenderStyle {
  font: GuiTextFont;
  fontScale: number;
  sampling: GuiTextGeometry['sampling'];
  shader: GuiTextGeometry['shader'];
  color?: GuiTextRgba8;
  tint?: GuiImageRgba;
  hudOpacity?: number;
}
export interface EnchantingTableTextRenderProfile {
  /** Declared normal label metrics in GAME units; never inferred from glyph ink. */
  metrics: { lineHeight: number; paintOffset: readonly [number, number] };
  labels: EnchantingTableTextRenderStyle;
  costs: EnchantingTableTextRenderStyle & { disabledColor?: GuiTextRgba8 };
  runes?: EnchantingTableTextRenderStyle;
}
type Presentation = WorkstationPresentation;
// undefined means an unrelated WorkstationFrame; null means the same stable
// EnchantingTable DOM is currently using its CSS/loading/error presentation.
export { EnchantingImagePresentation };
interface Option { disabled?: boolean; level: number; runeText?: string }
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

interface Prepared {
  images: GuiImage[]; outputRect: GuiImageRect; origin: readonly [number, number];
  commands?: GuiLayerCommand[];
  textRunes: readonly boolean[];
  itemImageSlots: readonly number[];
  itemModelSlots: readonly number[];
  textLabels: boolean;
  left: number; top: number; width: number; height: number; translateX: number; translateY: number;
  presentation: Presentation;
}
const f32 = Math.fround;
const add = (a: number, b: number) => f32(f32(a) + f32(b));
const sub = (a: number, b: number) => f32(f32(a) - f32(b));
const mul = (a: number, b: number) => f32(f32(a) * f32(b));
const div = (a: number, b: number) => f32(f32(a) / f32(b));

function fontOrigins(origin: readonly [number, number], metrics: EnchantingTableTextRenderProfile['metrics']) {
  validateWorkstationLabelMetrics(metrics);
  const [x, y] = origin, [paintX, paintY] = metrics.paintOffset;
  const topHeight = sub(mul(166, .5), 12), topY = add(y, 7);
  const gridWidth = sub(mul(176, .65), 8), gridHeight = add(mul(topHeight, .8), 4);
  const gridX = add(sub(add(x, 176), gridWidth), -8);
  const gridY = add(sub(add(topY, mul(topHeight, .5)), mul(gridHeight, .5)), 2);
  const rowStride = div(gridHeight, 3), buttonHeight = mul(gridHeight, .33333333);
  return {
    title: [add(add(x, 12), paintX), add(add(topY, -4), paintY)] as const,
    inventory: [add(add(x, 7), paintX), add(add(sub(add(y, 166), 93), 3), paintY)] as const,
    rune: (index: number) => [add(add(gridX, 18), paintX), add(add(sub(add(add(gridY, mul(index, rowStride)), mul(buttonHeight, .5)), mul(16, .5)), 4), paintY)] as const,
    cost: (index: number, textWidth: number) => [add(sub(add(add(gridX, gridWidth), -2), textWidth), paintX),
      add(sub(add(add(add(gridY, mul(index, rowStride)), buttonHeight), -2), metrics.lineHeight), paintY)] as const,
  };
}

function prepare(profile: EnchantingTableImageRenderProfile, options: readonly Option[], state: VisualState, close: boolean, title: string, inventoryLabel: string, items: readonly (InventoryItem | null | undefined)[]): Prepared {
  const { width, height, guiScale } = profile.frame;
  if (profile.itemImages !== undefined && typeof profile.itemImages !== 'boolean') throw new RangeError('itemImages must be an explicit boolean.');
  if (profile.itemModels !== undefined && typeof profile.itemModels !== 'boolean') throw new RangeError('itemModels must be an explicit boolean.');
  const { origin } = resolveWorkstationFrame(profile);
  const images: GuiImage[] = [image(assets.panel, [0, 0, 176, 166], origin)];
  if (close) images.push(image(state.close.pressed ? assets.closePressed : state.close.hover || state.close.focus ? assets.closeHover : assets.close, [156, 5, 15, 7], origin));
  images.push(image(assets.cell, [60.6, 13.1, 108.4, 62.8], origin));
  // Source order places title/inventory text after the panel/close/indent and
  // before container-cell images. Keep that ordering in the shared target.
  const prefixLength = images.length;
  const slots = sourceSlotPaint(slotRects, state.slots, origin);
  images.push(...slots.cells);
  images.push(image(assets.lapis, [34, 48.5, 16, 16], origin));
  images.push(...slots.overlays);
  const beforeItemsLength = images.length;
  const { commands: itemSprites, imageSlots: itemImageSlots, modelSlots: itemModelSlots } = sourceItemCommands(profile, slotRects, items, state.slots, origin);
  const rowHeight = 60.8 / 3;
  const row = (index: number): GuiImageRect => [61.6, 14.1 + index * rowHeight, 106.4, 60.8 * .33333333];
  for (let index = 0; index < 3; index++) images.push(image(assets.optionDark, row(index), origin));
  options.slice(0, 3).forEach((option, index) => {
    const current = state.options[index];
    images.push(image(option.disabled || current?.pressed ? assets.optionUnselectable : current?.hover || current?.focus ? assets.optionHover : assets.optionSelectable, row(index), origin));
  });
  const beforeDustLength = images.length;
  options.slice(0, 3).forEach((option, index) => {
    const selectable = [assets.dustSelectable1, assets.dustSelectable2, assets.dustSelectable3];
    const unavailable = [assets.dustUnselectable1, assets.dustUnselectable2, assets.dustUnselectable3];
    images.push(image((option.disabled ? unavailable : selectable)[index]!, [64.6, 14.1 + index * rowHeight + (rowHeight - 11) / 2, 13, 11], origin));
  });
  let commands: GuiLayerCommand[] | undefined;
  const textRunes = [false, false, false];
  if (profile.text !== undefined || profile.itemImages || profile.itemModels) {
    const text = profile.text;
    if (text !== undefined && (!text || !text.labels || !text.costs)) throw new RangeError('A combined profile requires explicit label and cost font styles.');
    const anchors = text ? fontOrigins(origin, text.metrics) : undefined;
    const asImage = (item: GuiImage): GuiLayerCommand => ({ kind: 'image', ...item });
    commands = images.slice(0, prefixLength).map(asImage);
    if (text && anchors) commands.push(textCommand(title, text.labels, anchors.title, [76, 76, 76, 255]), textCommand(inventoryLabel, text.labels, anchors.inventory, [76, 76, 76, 255]));
    commands.push(...images.slice(prefixLength, beforeItemsLength).map(asImage), ...itemSprites, ...images.slice(beforeItemsLength, beforeDustLength).map(asImage));
    if (text && anchors) options.slice(0, 3).forEach((option, index) => {
      if (text.runes && typeof option.runeText === 'string') {
        commands!.push(textCommand(option.runeText, text.runes, anchors.rune(index), [104, 93, 73, 255]));
        textRunes[index] = true;
      }
      if (!Number.isFinite(option.level)) throw new RangeError('A source cost requires a finite level.');
      const costText = String(option.level);
      const cost = textCommand(costText, text.costs, [0, 0], option.disabled ? text.costs.disabledColor ?? [137, 94, 91, 255] : [127, 255, 31, 255]);
      cost.color = option.disabled ? text.costs.disabledColor ?? [137, 94, 91, 255] : text.costs.color ?? [127, 255, 31, 255];
      const measured = layoutGuiText({ width, height, guiScale, ...cost });
      commands!.push({ ...cost, origin: anchors.cost(index, measured.logicalWidth), shadow: { offset: [1, 1], tint: [.25, .25, .25, 1] } });
    });
    commands.push(...images.slice(beforeDustLength).map(asImage));
  }
  const layout = commands ? layoutSourceGuiLayer({ width, height, guiScale, commands }) : layoutGuiImages({ width, height, guiScale, images });
  return { images, commands, textRunes, itemImageSlots, itemModelSlots, textLabels: profile.text !== undefined,
    ...layoutWorkstationWindow(profile, origin, layout) };
}

export function useEnchantingImageLayer(profile: EnchantingTableImageRenderProfile | undefined, root: RefObject<HTMLElement | null>, options: readonly Option[], close: boolean, title: string, inventoryLabel: string, items: readonly (InventoryItem | null | undefined)[]) {
  const state = useVisualState(root, !!profile);
  const prepared = useMemo(() => {
    if (!profile) return undefined;
    try { return { value: prepare(profile, options, state, close, title, inventoryLabel, items) }; }
    catch (reason) {
      let presentation: Presentation | null = null;
      // A failed font/metric request still has a valid explicit image frame.
      // Keep its CSS fallback at the same declared display scale. This computes
      // reservation only: never silently paint an image-only partial success.
      if (profile.text !== undefined || profile.itemImages !== undefined || profile.itemModels !== undefined) try {
        presentation = prepare({ ...profile, text: undefined, itemImages: undefined, itemModels: undefined }, options, state, close, title, inventoryLabel, items).presentation;
      } catch { /* Invalid frame/scale retains the ordinary unscaled fallback. */ }
      return { error: reason instanceof Error ? reason.message : String(reason), presentation };
    }
  }, [profile, options, state, close, title, inventoryLabel, items]);
  // Every profile change has a fresh immutable request; loading/error visibility
  // is switched by the actual canvas marker, not a delayed parent-state guess.
  if (!profile || !prepared) return { presentation: null, layer: null };
  if (!prepared.value) return { presentation: prepared.presentation ?? null, layer: <span className="mc-enchanting-image-error" aria-hidden="true" data-render-state="error" data-render-error={prepared.error}/> };
  const value = prepared.value;
  const style = workstationCanvasStyle(profile.frame.guiScale, value);
  return { presentation: value.presentation, layer: <div className="mc-enchanting-image-window" aria-hidden="true" style={{ left: value.left, top: value.top, width: value.width, height: value.height }}
    data-frame-origin-x={value.origin[0]} data-frame-origin-y={value.origin[1]} data-output-rect={value.outputRect.join(',')}
    data-item-images={value.itemImageSlots.length ? value.itemImageSlots.join(' ') : undefined}
    data-item-models={value.itemModelSlots.length ? value.itemModelSlots.join(' ') : undefined}
    data-text-labels={value.textLabels || undefined} data-text-costs={value.textLabels || undefined}
    data-text-rune-1={value.textRunes[0] || undefined} data-text-rune-2={value.textRunes[1] || undefined} data-text-rune-3={value.textRunes[2] || undefined}>
    {value.commands ? <GuiLayer className="mc-enchanting-image-layer" {...profile.frame} commands={value.commands} outputRect={value.outputRect} style={style}/>
      : <GuiImageLayer className="mc-enchanting-image-layer" {...profile.frame} images={value.images} outputRect={value.outputRect} style={style}/>}
  </div> };
}
