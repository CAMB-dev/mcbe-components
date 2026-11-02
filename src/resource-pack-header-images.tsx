import {useEffect, useMemo, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import {GuiImageLayer} from './gui-image';
import {layoutGuiImages} from './gui-image-geometry';
import type {GuiImageRect} from './gui-image-geometry';

/** An explicit source-image renderer, independent of the Settings JSON layout.
 * Keep the displayed source pixel grid aligned up to an integer translation.
 * CSS zoom, fractional presentation/scroll or a different GUI scale resamples
 * the canvas and does not carry this profile's native pixel qualification. */
export interface ResourcePackHeaderImageProfile {
  readonly frame: {readonly width: number; readonly height: number; readonly guiScale: number};
  /** Host-resolved GLOBAL game origin of the NORMAL10x10 toggle image, already
   * including its source offset[-2,0]. Never inferred from a DOM bounding box. */
  readonly toggleOrigin: readonly [number, number];
  /** Explicit normal GLOBAL paint rectangle for the non-square minus texture.
   * Required while expanded: its10x10 control does not prove a10x10 paint area. */
  readonly expandedPaintRect?: GuiImageRect;
  /** Physical whole-frame scissor; omission uses the whole framebuffer. */
  readonly scissor?: GuiImageRect;
  /** Change to retry failed image requests or a lost context. */
  readonly renderKey?: string | number;
}

interface Props {
  readonly profile?: ResourcePackHeaderImageProfile;
  readonly scale: number;
  readonly disabled: boolean;
  readonly texture: string;
  readonly expanded: boolean;
  readonly children: ReactNode;
}
interface State {hover: boolean; pressed: boolean}

function prepare(profile: ResourcePackHeaderImageProfile, scale: number, texture: string, expanded: boolean, state: State) {
  const {frame, toggleOrigin: origin} = profile;
  if (!frame || frame.guiScale !== scale) throw new RangeError('Header image frame GUI scale must equal the section scale.');
  if (!Array.isArray(origin) || origin.length !== 2 || ![origin[0], origin[1]].every(n => Number.isFinite(n) && Number.isFinite(Math.fround(n)) && Number.isFinite(n * scale))) throw new RangeError('A header image needs an explicit finite GLOBAL toggle origin.');
  if (profile.scissor !== undefined && (!Array.isArray(profile.scissor) || profile.scissor.length !== 4 || ![...profile.scissor].every(n => Number.isSafeInteger(n) && n >= 0))) throw new RangeError('Header image scissor requires four dense nonnegative integer coordinates.');
  if (profile.renderKey !== undefined && typeof profile.renderKey !== 'string' && (typeof profile.renderKey !== 'number' || !Number.isFinite(profile.renderKey))) throw new RangeError('Header image renderKey must be a string or finite number.');
  const tint = state.hover || state.pressed ? 1 : .3;
  if (expanded && !profile.expandedPaintRect) throw new RangeError('Expanded source sampling needs an explicit minus paint rectangle.');
  const normalRect: GuiImageRect = expanded ? profile.expandedPaintRect! : [origin[0], origin[1], 10, 10];
  const images = [{texture, rect: [normalRect[0], normalRect[1] + (state.pressed ? 1 : 0), normalRect[2], normalRect[3]] as const,
    tint: [tint, tint, tint, 1] as const, hudOpacity: 1}];
  const layout = layoutGuiImages({...frame, images, scissor: profile.scissor});
  const vertices = layout.meshes[0]!.vertices;
  // Bound the final packed vertices, not the pre-packed CSS box. One physical
  // guard pixel retains edge coverage/projection roundoff. The whole-frame MVP
  // and source geometry stay unchanged when this integer window is rendered.
  const xs = vertices.map(v => v.position[0] * scale), ys = vertices.map(v => v.position[1] * scale);
  const x = Math.max(0, Math.min(frame.width, Math.floor(Math.min(...xs)) - 1));
  const y = Math.max(0, Math.min(frame.height, Math.floor(Math.min(...ys)) - 1));
  const right = Math.max(x, Math.min(frame.width, Math.ceil(Math.max(...xs)) + 1));
  const bottom = Math.max(y, Math.min(frame.height, Math.ceil(Math.max(...ys)) + 1));
  const outputRect: GuiImageRect = [x, y, right - x, bottom - y];
  // The parent CSS content already moves by1 on press. Undo that presentation
  // move here: the image's source rectangle independently carries pressed+1
  // through the whole-frame projection (including its original sample phase).
  return {images, outputRect, empty: right === x || bottom === y,
    left: x - origin[0] * scale, top: y - origin[1] * scale - (state.pressed ? scale : 0)};
}

/** Internal semantic toggle keeps the ordinary Image as its atomic fallback. */
export function ResourcePackHeaderToggle({profile, scale, disabled, texture, expanded, children}: Props) {
  const root = useRef<HTMLSpanElement>(null), [observed, setObserved] = useState<State>({hover: false, pressed: false});
  const enabled = !!profile;
  useEffect(() => {
    if (!enabled) return;
    const button = root.current?.closest('button');
    if (!button) return;
    const view = button.ownerDocument.defaultView;
    if (!view) return;
    let scheduled = 0;
    const read = () => {
      scheduled = 0;
      const value = {hover: !disabled && !button.disabled && button.matches(':hover,:focus-visible'),
        pressed: !disabled && !button.disabled && button.matches(':active')};
      setObserved(old => old.hover === value.hover && old.pressed === value.pressed ? old : value);
    };
    const schedule = () => {if (!scheduled) scheduled = view.requestAnimationFrame(read);};
    const events = ['pointerenter', 'pointerleave', 'pointerdown', 'pointerup', 'pointercancel', 'focusin', 'focusout', 'keydown', 'keyup'] as const;
    events.forEach(name => button.addEventListener(name, schedule));
    view.addEventListener('pointerup', schedule, true); view.addEventListener('blur', schedule);
    read();
    return () => {events.forEach(name => button.removeEventListener(name, schedule)); view.removeEventListener('pointerup', schedule, true);
      view.removeEventListener('blur', schedule); if (scheduled) view.cancelAnimationFrame(scheduled);};
  }, [enabled, disabled]);
  const hover = !disabled && observed.hover, pressed = !disabled && observed.pressed;
  const buttonState = disabled ? 'locked' : pressed ? 'pressed' : hover ? 'hover' : 'default';
  const prepared = useMemo(() => {
    if (!profile) return undefined;
    try {return {value: prepare(profile, scale, texture, expanded, {hover, pressed})};}
    catch (reason) {return {error: reason instanceof Error ? reason.message : String(reason)};}
  }, [profile, scale, texture, expanded, hover, pressed]);
  const value = prepared?.value;
  return <span className="mc-resource-packs-section__toggle" ref={root}>
    {children}
    {prepared && (value ? <span className="mc-resource-packs-header-image" aria-hidden="true" data-image-empty={value.empty || undefined} data-button-state={buttonState}
      data-source-toggle-origin={profile!.toggleOrigin.join(',')} data-output-rect={value.outputRect.join(',')}
      style={{left: value.left, top: value.top, width: value.outputRect[2], height: value.outputRect[3]}}>
      {!value.empty && <GuiImageLayer {...profile!.frame} images={value.images} scissor={profile!.scissor} outputRect={value.outputRect}
        renderKey={profile!.renderKey} style={{pointerEvents: 'none'}}/>}
    </span> : <span className="mc-resource-packs-header-image" aria-hidden="true" data-render-state="error" data-render-error={prepared.error}/>)}
  </span>;
}
