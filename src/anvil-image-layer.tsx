import { useMemo } from 'react';
import type { RefObject } from 'react';
import { GuiLayer } from './gui-layer-component';
import type { GuiLayerCommand } from './gui-layer-component';
import type { GuiImageRect, GuiImageRgba } from './gui-image-geometry';
import { layoutGuiText } from './gui-text-geometry';
import type { GuiTextRgba8 } from './gui-text-geometry';
import type { InventoryItem } from './inventory';
import { workstationImageAssets as assets } from './workstation-image-assets';
import {
  layoutWorkstationWindow, resolveWorkstationFrame, sourceImage, sourceItemCommands, sourceSlotPaint, sourceText,
  useWorkstationDurability, useWorkstationItemMarkers, useWorkstationVisualState, validateWorkstationLabelMetrics, workstationCanvasStyle,
} from './workstation-source-layer';
import type { WorkstationControlState, WorkstationImageProfile, WorkstationInputControlState, WorkstationLabelMetrics, WorkstationTextStyle } from './workstation-source-layer';

export type AnvilTextRenderStyle = WorkstationTextStyle;
interface AlignedTextStyle extends AnvilTextRenderStyle {
  /** Logical label height and independent glyph paint offset, in GAME units. */
  metrics: WorkstationLabelMetrics;
}
interface CostTextStyle extends AlignedTextStyle {
  /** Success color. Failure always overrides this color with failureColor. */
  color: GuiTextRgba8;
  failureColor: GuiTextRgba8;
  /** Explicit shader shadow inputs; no native tint or offset is inferred. */
  shadow: { offset: readonly [number, number]; tint: GuiImageRgba };
}
interface NameTextStyle extends Omit<AnvilTextRenderStyle, 'shadow' | 'scissor'> {
  /** Independent glyph offset; the original source name label has fixed height10. */
  paintOffset: readonly [number, number];
  /** Explicit policies: enclosing host bounds, or the logical-stage floor
   * candidate supported by the captured Anvil frames. Neither is inferred. */
  clipQuantization: 'floor-min-ceil-max' | 'logical-stage-floor';
}
export interface AnvilTextRenderProfile {
  title?: AlignedTextStyle;
  inventory?: AlignedTextStyle;
  /** Optional source glyphs only while the real input is unfocused and not composing. */
  name?: NameTextStyle;
  cost?: CostTextStyle;
}
/** Optional source composition. Source grid and text clipping still await native validation. */
export interface AnvilImageRenderProfile extends WorkstationImageProfile {
  /** Actual physical framebuffer and source GUI scale, independent of CSS/DPR. */
  frame: WorkstationImageProfile['frame'];
  /** GLOBAL game-space origin; omission centers176×166 on the ceiled source stage. */
  origin?: readonly [number, number];
  displayScale?: number;
  itemImages?: boolean;
  itemModels?: boolean;
  text?: AnvilTextRenderProfile;
}

const f32 = Math.fround;
const add = (a: number, b: number) => f32(f32(a) + f32(b));
const sub = (a: number, b: number) => f32(f32(a) - f32(b));
const mul = (a: number, b: number) => f32(f32(a) * f32(b));
const div = (a: number, b: number) => f32(f32(a) / f32(b));
// Original percentage/anchor formulas, not captured positions. Fixed-size grid
// templates start at their grid-cell origin; centering their inner18x18
// container does not center the entire template within the larger grid cell.
// Final native float/scissor behavior remains subject to per-frame validation.
const topWidth = sub(176, 14), topHeight = sub(mul(166, .5), 14);
const iconY = add(7, mul(topHeight, .05)), iconHeight = mul(topHeight, .4);
const nameX = add(7, mul(topWidth, .2)), nameWidth = mul(topWidth, .8), nameHeight = mul(iconHeight, .7);
const nameY = add(sub(add(iconY, iconHeight), nameHeight), 2);
const recipeY = add(7, mul(topHeight, .4)), recipeHeight = mul(topHeight, .6);
const gridWidth = mul(topWidth, .83), gridHeight = mul(recipeHeight, .4);
const gridX = add(7, mul(sub(topWidth, gridWidth), .5)), gridY = add(recipeY, mul(sub(recipeHeight, gridHeight), .5));
const cellWidth = div(gridWidth, 5);
const slotRects: readonly GuiImageRect[] = [0, 2, 4].map(column => [add(gridX, mul(column, cellWidth)), gridY, 18, 18] as const).concat(
  Array.from({ length: 27 }, (_, index) => [7 + index % 9 * 18, 86 + Math.floor(index / 9) * 18, 18, 18] as const),
  Array.from({ length: 9 }, (_, index) => [7 + index * 18, 143, 18, 18] as const));
const centeredIcon = (column: number, width: number, height: number): GuiImageRect => [
  add(add(gridX, mul(column, cellWidth)), mul(sub(cellWidth, width), .5)), add(gridY, mul(sub(gridHeight, height), .5)), width, height];
/** Intrinsic source dimensions fit a logical box without stretching either axis. */
function containedSize(source: readonly [number, number], target: readonly [number, number]): readonly [number, number] {
  const scale = Math.min(div(target[0], source[0]), div(target[1], source[1]));
  return [mul(source[0], scale), mul(source[1], scale)];
}
const arrowSize = containedSize([22, 15], [18, 12]);
const crossSize = containedSize([15, 15], [18, 12]);
const titleAnchor = [add(add(nameX, 1), mul(nameWidth, .5)), add(add(iconY, mul(iconHeight, .2)), 3)] as const;
const costAnchor = [add(7, topWidth), add(recipeY, recipeHeight)] as const;
const clipper: GuiImageRect = [add(nameX, 3), add(nameY, 2), sub(nameWidth, 6), sub(nameHeight, 4)];

function slotButtons(root: HTMLElement): (HTMLButtonElement | null)[] {
  const grids = root.querySelectorAll('.mc-workstation__inventory .mc-inventory');
  const grid = (index: number) => Array.from(grids[index]?.querySelectorAll<HTMLButtonElement>('[role="gridcell"] > .mc-slot') ?? []);
  return [root.querySelector('.mc-anvil__input'), root.querySelector('.mc-anvil__material'), root.querySelector('.mc-anvil__result'), ...grid(0), ...grid(1)];
}
const namedControls = { name: (root: HTMLElement) => ({ input: root.querySelector<HTMLInputElement>('.mc-anvil__name-input'),
  hoverTarget: root.querySelector('.mc-anvil__name-field') }) };
interface VisualState { slots: readonly WorkstationControlState[]; close: WorkstationControlState; controls: { name: WorkstationInputControlState } }
interface Content { title: string; inventoryLabel: string; name: string; renameDisabled: boolean; invalid: boolean; close: boolean;
  cost: { visible: boolean; text: string; affordable: boolean };
  items: readonly (InventoryItem | null | undefined)[] }
function colorBytes(value: GuiTextRgba8, name: string): void {
  if (!Array.isArray(value) || value.length !== 4 || [...value].some(channel => !Number.isInteger(channel) || channel < 0 || channel > 255)) {
    throw new RangeError(`${name} requires four explicit RGBA8 bytes.`);
  }
}
function imageCommand(image: ReturnType<typeof sourceImage>): GuiLayerCommand & { kind: 'image' } {
  return { kind: 'image', ...image, physicalPrecision: 'float32' };
}
function alignedText(profile: AnvilImageRenderProfile, text: string, style: AlignedTextStyle,
  origin: readonly [number, number], anchor: readonly [number, number], horizontal: number, bottom: boolean) {
  validateWorkstationLabelMetrics(style.metrics);
  const command = sourceText(text, style, [0, 0], [76, 76, 76, 255]);
  const measured = layoutGuiText({ ...profile.frame, ...command });
  const width = measured.logicalWidth, height = style.metrics.lineHeight;
  const left = sub(add(origin[0], anchor[0]), mul(width, horizontal));
  const top = sub(add(origin[1], anchor[1]), bottom ? height : 0);
  return { command: { ...command, origin: [add(left, style.metrics.paintOffset[0]), add(top, style.metrics.paintOffset[1])] as const },
    box: [left, top, width, height] as const };
}
function nameScissor(profile: AnvilImageRenderProfile, origin: readonly [number, number], policy: NameTextStyle['clipQuantization']): GuiImageRect {
  const { width, height, guiScale } = profile.frame;
  const x = add(origin[0], clipper[0]), y = add(origin[1], clipper[1]);
  const stageFloor = policy === 'logical-stage-floor';
  const scaleX = stageFloor ? div(width, Math.ceil(width / guiScale)) : guiScale;
  const scaleY = stageFloor ? div(height, Math.ceil(height / guiScale)) : guiScale;
  // The stage policy intentionally rounds the product to float32 BEFORE floor.
  // A JS-double multiply can cross the preceding physical pixel at exact edges.
  const start = (value: number, scale: number) => Math.floor(stageFloor ? mul(value, scale) : value * scale);
  const end = (value: number, scale: number) => stageFloor ? Math.floor(mul(value, scale)) : Math.ceil(value * scale);
  const left = Math.max(0, Math.min(width, start(x, scaleX))), top = Math.max(0, Math.min(height, start(y, scaleY)));
  const right = Math.max(left, Math.min(width, end(add(x, clipper[2]), scaleX)));
  const bottom = Math.max(top, Math.min(height, end(add(y, clipper[3]), scaleY)));
  return [left, top, right - left, bottom - top];
}
function prepare(profile: AnvilImageRenderProfile, state: VisualState, content: Content) {
  const { origin } = resolveWorkstationFrame(profile), text = profile.text;
  if (text !== undefined && (!text || typeof text !== 'object')) throw new RangeError('An Anvil text profile requires explicit role styles.');
  const commands: GuiLayerCommand[] = [];
  const image = (asset: Parameters<typeof sourceImage>[0], rect: GuiImageRect, alpha = 1) => commands.push(imageCommand(sourceImage(asset, rect, origin, alpha)));
  image(assets.panel, [0, 0, 176, 166]);
  if (content.close) image(state.close.pressed ? assets.closeNormalPressed : state.close.hover || state.close.focus ? assets.closeNormalHover : assets.closeNormal, [156, 5, 15, 15]);
  image(assets.anvilIcon, [7, iconY, 30, 30]);
  // Preserve the existing host focus→hover skin mapping; native edit-state
  // transitions still require their own capture. Disabled is source alpha.5.
  const inputState = state.controls.name;
  image(!content.renameDisabled && (inputState.hover || inputState.focus || inputState.pressed) ? assets.editBoxHover : assets.editBox,
    [nameX, nameY, nameWidth, nameHeight], content.renameDisabled ? .5 : 1);
  const slots = sourceSlotPaint(slotRects, state.slots, origin);
  commands.push(...slots.cells.map(imageCommand));
  image(assets.anvilPlus, centeredIcon(1, 13, 13));
  image(assets.grindstoneArrow, centeredIcon(3, arrowSize[0], arrowSize[1]));
  if (content.invalid) image(assets.grindstoneInvalid, centeredIcon(3, crossSize[0], crossSize[1]));
  const roles = { title: false, inventory: false, name: false, cost: false };
  if (text && text.title !== undefined) { commands.push(alignedText(profile, content.title, text.title, origin, titleAnchor, .5, true).command); roles.title = true; }
  if (text && text.inventory !== undefined) { commands.push(alignedText(profile, content.inventoryLabel, text.inventory, origin, [7, 76], 0, false).command); roles.inventory = true; }
  if (text && text.name !== undefined && !inputState.focus && !inputState.composing) {
    const style = text.name;
    if (style.clipQuantization !== 'floor-min-ceil-max' && style.clipQuantization !== 'logical-stage-floor') throw new RangeError('Name glyphs require an explicit clipQuantization policy.');
    validateWorkstationLabelMetrics({ lineHeight: 10, paintOffset: style.paintOffset });
    const opacity = style.hudOpacity ?? 1;
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) throw new RangeError('Name hudOpacity must be normalized.');
    const command = sourceText(content.name, { ...style, shadow: undefined, scissor: undefined,
      hudOpacity: opacity * (content.renameDisabled ? .5 : 1) }, [0, 0], [255, 255, 255, 255]);
    const measured = layoutGuiText({ ...profile.frame, ...command });
    const labelWidth = Math.max(clipper[2], measured.logicalWidth);
    const left = sub(add(add(origin[0], clipper[0]), clipper[2]), labelWidth);
    const top = add(add(origin[1], clipper[1]), mul(sub(clipper[3], 10), .5));
    commands.push({ ...command, origin: [add(left, style.paintOffset[0]), add(top, style.paintOffset[1])], scissor: nameScissor(profile, origin, style.clipQuantization) });
    roles.name = true;
  }
  if (text && text.cost !== undefined && content.cost.visible) {
    const style = text.cost;
    colorBytes(style.color, 'Cost success color'); colorBytes(style.failureColor, 'Cost failure color');
    if (!style.shadow) throw new RangeError('Cost glyphs require explicit shadow inputs.');
    // The resolved state color overrides the style success color, including
    // sourceText's normal style.color precedence over its fallback argument.
    const resolved = { ...style, color: content.cost.affordable ? style.color : style.failureColor };
    const cost = alignedText(profile, content.cost.text, resolved, origin, costAnchor, 1, true);
    const [left, top, width, height] = cost.box;
    if (width > 0) {
      const bgWidth = mul(width, 1.05), bgHeight = mul(height, 1.05);
      commands.push(imageCommand(sourceImage(assets.anvilCostBackground,
        [sub(add(left, mul(width, .5)), mul(bgWidth, .5)), sub(add(top, mul(height, .5)), mul(bgHeight, .5)), bgWidth, bgHeight], [0, 0], .3)));
    }
    commands.push(cost.command); roles.cost = true;
  }
  commands.push(...slots.overlays.map(imageCommand));
  const items = sourceItemCommands(profile, slotRects, content.items, state.slots, origin);
  commands.push(...items.commands);
  return { ...layoutWorkstationWindow(profile, origin, commands), commands, roles,
    itemImageSlots: items.imageSlots, itemModelSlots: items.modelSlots };
}

export function useAnvilImageLayer(profile: AnvilImageRenderProfile | undefined, root: RefObject<HTMLElement | null>, content: Content) {
  const state = useWorkstationVisualState(root, !!profile, slotButtons, slotRects.length, namedControls);
  const prepared = useMemo(() => {
    if (!profile) return undefined;
    try { return { value: prepare(profile, state, content) }; }
    catch (reason) {
      let presentation: ReturnType<typeof layoutWorkstationWindow>['presentation'] | null = null;
      // Reserve only a valid frame. Never paint image-only partial success after
      // a requested optional font/model fails. The semantic input stays mounted.
      try { presentation = prepare({ ...profile, text: undefined, itemImages: undefined, itemModels: undefined }, state, content).presentation; }
      catch { /* Invalid frame/scale keeps the ordinary CSS fallback. */ }
      return { error: reason instanceof Error ? reason.message : String(reason), presentation };
    }
  }, [profile, state, content]);
  const value = prepared?.value;
  useWorkstationItemMarkers(root, !!profile && !!value,
    ':scope > .mc-anvil-image-window > .mc-anvil-image-layer[data-render-state="ready"]', slotButtons, value?.itemImageSlots ?? [], value?.itemModelSlots ?? []);
  useWorkstationDurability(root, !!profile && !!value,
    ':scope > .mc-anvil-image-window > .mc-anvil-image-layer[data-render-state="ready"]', slotButtons, slotRects, profile?.frame, value?.origin);
  if (!profile || !prepared) return { presentation: null, layer: null };
  if (!value) return { presentation: prepared.presentation ?? null,
    layer: <span className="mc-anvil-image-error" aria-hidden="true" data-render-state="error" data-render-error={prepared.error}/> };
  return { presentation: value.presentation, layer: <div className="mc-anvil-image-window" aria-hidden="true"
    style={{ left: value.left, top: value.top, width: value.width, height: value.height }}
    data-frame-origin-x={value.origin[0]} data-frame-origin-y={value.origin[1]} data-output-rect={value.outputRect.join(',')}
    data-item-images={value.itemImageSlots.length ? value.itemImageSlots.join(' ') : undefined}
    data-item-models={value.itemModelSlots.length ? value.itemModelSlots.join(' ') : undefined}
    data-text-title={value.roles.title || undefined} data-text-inventory={value.roles.inventory || undefined}
    data-text-name={value.roles.name || undefined} data-text-cost={value.roles.cost || undefined}>
    <GuiLayer className="mc-anvil-image-layer" {...profile.frame} commands={value.commands} outputRect={value.outputRect} style={workstationCanvasStyle(profile.frame.guiScale, value)}/>
  </div> };
}
