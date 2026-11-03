import {useEffect, useRef, useState} from 'react';
import {GuiLayer} from './gui-layer-component';
import {layoutGuiTrueTypeText} from './gui-truetype-geometry';
import type {GuiTrueTypeGeometry} from './gui-truetype-geometry';
import type {GuiImageRect} from './gui-image-geometry';
import type {GuiTextRgba8} from './gui-text-geometry';

/** Caller-resolved count layout. Original fonts remain caller-owned. */
export interface ResourcePackHeaderTextProfile extends Omit<GuiTrueTypeGeometry, 'text'> {
  readonly frame: {readonly width: number; readonly height: number; readonly guiScale: number};
  /** Local GUI offset of the paint origin from the count control's top-left. */
  readonly paintOffset: readonly [number, number];
  /** Hover/focus/press color. Default white; normal/locked color defaults to76. */
  readonly activeColor?: GuiTextRgba8;
  readonly renderKey?: string | number;
}
interface Props {profile?: ResourcePackHeaderTextProfile; text: string; scale: number; disabled: boolean}
interface State {hover: boolean; pressed: boolean}

function prepare(profile: ResourcePackHeaderTextProfile, text: string, scale: number, state: State) {
  const {frame, paintOffset, activeColor, renderKey, ...geometry} = profile;
  if (!frame || frame.guiScale !== scale) throw new RangeError('Header text frame GUI scale must equal the section scale.');
  if (!Array.isArray(paintOffset) || paintOffset.length !== 2 || ![...paintOffset].every(v => typeof v === 'number' && Number.isFinite(v) && Number.isFinite(Math.fround(v)) && Number.isFinite(v * scale))) throw new RangeError('Header text needs two finite paint offsets.');
  if (renderKey !== undefined && typeof renderKey !== 'string' && (typeof renderKey !== 'number' || !Number.isFinite(renderKey))) throw new RangeError('Header text renderKey must be a string or finite number.');
  // Validate the inactive color too, before any font page can be fetched.
  for (const color of [geometry.color, activeColor]) if (color !== undefined && (!Array.isArray(color) || color.length !== 4 || [...color].some(v => !Number.isSafeInteger(v) || v < 0 || v > 255))) throw new RangeError('Header text colors require four RGBA bytes.');
  const command = {kind: 'truetype' as const, ...geometry, text,
    color: state.hover || state.pressed ? activeColor ?? [255,255,255,255] as const : geometry.color ?? [76,76,76,255] as const,
    origin: [geometry.origin[0], geometry.origin[1] + (state.pressed ? 1 : 0)] as const};
  const layout = layoutGuiTrueTypeText({...frame, ...command});
  let left = frame.width, top = frame.height, right = 0, bottom = 0;
  for (const run of layout.runs) for (const vertex of run.vertices) {
    const [x,y] = vertex.position, m = run.mvp;
    const px = (x * m[0]! + m[12]! + 1) * frame.width / 2;
    const py = (1 - (y * m[5]! + m[13]!)) * frame.height / 2;
    left = Math.min(left, Math.floor(px) - 1); top = Math.min(top, Math.floor(py) - 1);
    right = Math.max(right, Math.ceil(px) + 1); bottom = Math.max(bottom, Math.ceil(py) + 1);
  }
  left = Math.max(0, Math.min(frame.width, left)); top = Math.max(0, Math.min(frame.height, top));
  right = Math.max(left, Math.min(frame.width, right)); bottom = Math.max(top, Math.min(frame.height, bottom));
  const outputRect: GuiImageRect = [left,top,right-left,bottom-top];
  return {command, outputRect, empty: right === left || bottom === top, width: layout.logicalWidth * scale,
    left: left - geometry.origin[0] * scale + paintOffset[0] * scale,
    // The real header content already translates byone on press.
    top: top - geometry.origin[1] * scale + paintOffset[1] * scale - (state.pressed ? scale : 0)};
}

/** One semantic count; a failed or pending decorative canvas keeps its text. */
export function ResourcePackHeaderCount({profile, text, scale, disabled}: Props) {
  const root = useRef<HTMLSpanElement>(null), [observed,setObserved] = useState<State>({hover:false,pressed:false});
  useEffect(() => {
    if (!profile) return;
    const button = root.current?.closest('button'), view = button?.ownerDocument.defaultView;
    if (!button || !view) return;
    let scheduled = 0;
    const read = () => {scheduled = 0; const next = {hover: !disabled && !button.disabled && button.matches(':hover,:focus-visible'), pressed: !disabled && !button.disabled && button.matches(':active')}; setObserved(old => old.hover === next.hover && old.pressed === next.pressed ? old : next);};
    const schedule = () => {if (!scheduled) scheduled = view.requestAnimationFrame(read);};
    const events = ['pointerenter','pointerleave','pointerdown','pointerup','pointercancel','focusin','focusout','keydown','keyup'] as const;
    events.forEach(name => button.addEventListener(name,schedule)); view.addEventListener('pointerup',schedule,true); view.addEventListener('blur',schedule); read();
    return () => {events.forEach(name => button.removeEventListener(name,schedule)); view.removeEventListener('pointerup',schedule,true); view.removeEventListener('blur',schedule); if (scheduled) view.cancelAnimationFrame(scheduled);};
  }, [!!profile, disabled]);
  if (!profile) return <span className="mc-resource-packs-section__count">{text}</span>;
  const state = {hover: !disabled && observed.hover, pressed: !disabled && observed.pressed};
  const buttonState = disabled ? 'locked' : state.pressed ? 'pressed' : state.hover ? 'hover' : 'default';
  // Recompute used metrics on every parent render; callers may mutate records.
  let value: ReturnType<typeof prepare> | undefined, error: string | undefined;
  try {value = prepare(profile,text,scale,state);} catch (reason) {error = reason instanceof Error ? reason.message : String(reason);}
  return <span ref={root} className="mc-resource-packs-section__count mc-resource-packs-header-text" style={value ? {width:value.width} : undefined} data-button-state={buttonState} data-render-error={error}>
    <span className="mc-resource-packs-header-text__fallback">{text}</span>
    {value && <span aria-hidden="true" className="mc-resource-packs-header-text__paint" data-image-empty={value.empty || undefined} data-output-rect={value.outputRect.join(',')}
      style={{left:value.left,top:value.top,width:value.outputRect[2],height:value.outputRect[3]}}>
      {!value.empty && <GuiLayer {...profile.frame} rasterOrigin="top-left" commands={[value.command]} outputRect={value.outputRect} renderKey={profile.renderKey} style={{pointerEvents:'none'}}/>}
    </span>}
  </span>;
}
