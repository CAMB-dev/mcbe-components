import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, KeyboardEvent, PointerEvent, ReactNode, Ref, SyntheticEvent } from 'react';
import { Image } from './image';
import { Text } from './text';
import { emoteWheelAssets } from './emote-wheel-assets';

/** Source order is top, right, bottom, left. */
export type EmoteIndex = 0 | 1 | 2 | 3;
export type EmotePreviewContent =
  | { readonly kind: 'empty' }
  | { readonly kind: 'image'; readonly src: string }
  | { readonly kind: 'text'; readonly text: string };
export interface EmoteSlot { readonly id: string; readonly label: string; readonly preview: EmotePreviewContent; readonly disabled?: boolean }
export interface EmoteActiveIndexChangeDetail { cause: 'pointer' | 'focus' | 'keyboard'; event: SyntheticEvent }
export interface EmoteWheelHints {
  keyboard?: readonly [string, string, string, string] | false;
  gamepad?: { mode: 'quick' | 'analog'; faces?: readonly [ReactNode, ReactNode, ReactNode, ReactNode]; select?: ReactNode } | false;
}
export interface EmoteSlotPreviewProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML' | 'content'> {
  content: EmotePreviewContent;
  scale?: number;
  label?: string;
}
export interface EmoteWheelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML' | 'onChange' | 'onActivate' | 'inputMode'> {
  slots: readonly [EmoteSlot, EmoteSlot, EmoteSlot, EmoteSlot];
  activeIndex?: EmoteIndex | null;
  defaultActiveIndex?: EmoteIndex | null;
  onActiveIndexChange?: (index: EmoteIndex | null, detail: EmoteActiveIndexChangeDetail) => void;
  onActivate?: (index: EmoteIndex, slot: Readonly<EmoteSlot>, event: SyntheticEvent) => void;
  onCancel?: (event: KeyboardEvent<HTMLDivElement>) => void;
  /** Independent host text binding; an explicit empty string keeps it blank. */
  centerLabel?: string;
  inputMode?: 'pointer' | 'keyboard' | 'touch' | 'gamepad';
  hints?: EmoteWheelHints;
  disabled?: boolean;
  label: string;
  /** Available squaring-panel frame in logical units, not the whole screen. */
  size?: readonly [number, number];
  scale?: number;
  buttonRefs?: Readonly<Partial<Record<EmoteIndex, Ref<HTMLButtonElement>>>>;
}

const indices = [0, 1, 2, 3] as const;
const defaultKeys = ['1', '2', '3', '4'] as const;
const frames = [emoteWheelAssets.wheelSelect0, emoteWheelAssets.wheelSelect1, emoteWheelAssets.wheelSelect2, emoteWheelAssets.wheelSelect3] as const;
const imageUrl = (src: string) => `url(${JSON.stringify(src)})`;
function scaleValue(value: number) { if (!Number.isSafeInteger(value) || value < 1) throw new RangeError('Emote scale must be a positive safe integer.'); }
function indexValue(value: unknown): asserts value is EmoteIndex | null { if (value !== null && value !== 0 && value !== 1 && value !== 2 && value !== 3) throw new RangeError('Emote index must be null or 0, 1, 2, 3.'); }
function previewValue(value: EmotePreviewContent) {
  if (!value || !['empty', 'image', 'text'].includes(value.kind)
    || value.kind === 'image' && (typeof value.src !== 'string' || !value.src.trim())
    || value.kind === 'text' && typeof value.text !== 'string') throw new RangeError('An emote preview requires empty, an image URL or text.');
}
function four(value: readonly unknown[], name: string) { if (!Array.isArray(value) || value.length !== 4 || indices.some(index => !Object.prototype.hasOwnProperty.call(value, index))) throw new RangeError(`${name} must be a dense four-entry tuple.`); }
function assignRef<T>(ref: Ref<T> | undefined, value: T | null) { if (typeof ref === 'function') ref(value); else if (ref) ref.current = value; }

/** Source content validity is host-owned. Failed images remain blank until the
 * host supplies text/empty; no index name or private thumbnail is synthesized. */
export const EmoteSlotPreview = forwardRef<HTMLDivElement, EmoteSlotPreviewProps>(function EmoteSlotPreview({ content, scale = 2, label, className, style, ...props }, ref) {
  scaleValue(scale); previewValue(content);
  const src = content.kind === 'image' ? content.src : undefined, currentSource = useRef(src); currentSource.current = src;
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const accessibleLabel = props['aria-label'] ?? label;
  return <div {...props} ref={ref} className={['mc-emote-slot-preview', className].filter(Boolean).join(' ')} data-preview-kind={content.kind}
    data-image-error={src !== undefined && src === failedSource || undefined} role={props.role ?? (accessibleLabel ? 'img' : undefined)} aria-label={accessibleLabel}
    aria-hidden={props['aria-hidden'] ?? (accessibleLabel ? undefined : true)} style={{ '--mc-emote-u': `${scale}px`, ...style } as CSSProperties}>
    {content.kind === 'empty' ? <Image className="mc-emote-slot-preview__image" src={emoteWheelAssets.iconNone.url} sourceSize={emoteWheelAssets.iconNone.sourceSize} scale={scale} alt=""/>
      : content.kind === 'text' ? <Text className="mc-emote-slot-preview__text" shadow>{content.text}</Text>
        : <img key={content.src} className="mc-emote-slot-preview__image" src={content.src} alt="" draggable={false} hidden={failedSource === content.src}
          onError={() => { if (currentSource.current === content.src) setFailedSource(content.src); }}
          onLoad={() => { if (currentSource.current === content.src) setFailedSource(null); }}/>}
    <span className="mc-emote-slot-preview__system-label" aria-hidden="true">{accessibleLabel ?? (content.kind === 'text' ? content.text : content.kind === 'empty' ? 'Empty' : '')}</span>
  </div>;
});

/** Four source slots with a finite Web radial input policy, not a generic radial
 * engine or recovered game input transport. Activation is a host request only. */
export const EmoteWheel = forwardRef<HTMLDivElement, EmoteWheelProps>(function EmoteWheel({ slots, activeIndex, defaultActiveIndex = null, onActiveIndexChange, onActivate, onCancel, centerLabel,
  inputMode = 'pointer', hints, disabled = false, label, size = [256, 256], scale = 2, buttonRefs, className, style,
  onKeyDown, onKeyUp, onClick, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onPointerLeave, onLostPointerCapture, ...props }, forwardedRef) {
  scaleValue(scale); four(slots, 'Emote slots');
  if (!Array.isArray(size) || size.length !== 2 || ![...size].every(value => Number.isFinite(value) && value > 0 && Number.isFinite(value * scale))) throw new RangeError('Emote size requires two positive finite logical dimensions.');
  if (typeof label !== 'string' || !label.trim() || !['pointer', 'keyboard', 'touch', 'gamepad'].includes(inputMode)) throw new RangeError('Emote wheel requires an accessible label and a supported input mode.');
  if (centerLabel !== undefined && typeof centerLabel !== 'string') throw new RangeError('Emote center label must be a string.');
  const ids = new Set<string>();
  for (const slot of slots) { if (!slot || typeof slot.id !== 'string' || !slot.id || ids.has(slot.id) || typeof slot.label !== 'string' || !slot.label.trim()) throw new RangeError('Emote slots require four unique ids and nonempty labels.'); ids.add(slot.id); previewValue(slot.preview); }
  if (hints?.keyboard !== undefined && hints.keyboard !== false) { four(hints.keyboard, 'Emote keyboard hints'); if (hints.keyboard.some(key => typeof key !== 'string')) throw new RangeError('Emote keyboard hints must be strings.'); }
  if (hints?.gamepad && (!['quick', 'analog'].includes(hints.gamepad.mode))) throw new RangeError('Emote gamepad hint mode must be quick or analog.');
  if (hints?.gamepad && hints.gamepad.faces !== undefined) four(hints.gamepad.faces, 'Emote gamepad face hints');
  const [inside, setInside] = useState<EmoteIndex | null>(defaultActiveIndex); indexValue(inside); indexValue(activeIndex === undefined ? null : activeIndex);
  const accepted = activeIndex === undefined ? inside : activeIndex;
  const root = useRef<HTMLDivElement | null>(null), wheel = useRef<HTMLDivElement | null>(null), buttons = useRef<(HTMLButtonElement | null)[]>([null, null, null, null]);
  const [focused, setFocused] = useState<EmoteIndex | null>(null);
  const gesture = useRef<{ pointerId: number; ids: readonly string[] } | null>(null), hover = useRef<EmoteIndex | null | undefined>(undefined), suppressClick = useRef(false), focusOrigin = useRef(false);
  const attach = useCallback((node: HTMLDivElement | null) => { root.current = node; assignRef(forwardedRef, node); }, [forwardedRef]);
  const refs = useMemo(() => indices.map(index => (node: HTMLButtonElement | null) => { buttons.current[index] = node; assignRef(buttonRefs?.[index], node); }), [buttonRefs]);
  const latest = useRef({ slots, disabled, accepted, activeIndex, onActiveIndexChange, onActivate }); latest.current = { slots, disabled, accepted, activeIndex, onActiveIndexChange, onActivate };
  const selectable = (index: EmoteIndex) => !latest.current.disabled && !latest.current.slots[index].disabled;
  const request = (index: EmoteIndex | null, cause: EmoteActiveIndexChangeDetail['cause'], event: SyntheticEvent) => {
    const value = latest.current; if (event.defaultPrevented || value.disabled || index !== null && !selectable(index) || index === value.accepted) return;
    if (value.activeIndex === undefined) setInside(index); value.onActiveIndexChange?.(index, { cause, event });
  };
  const activate = (index: EmoteIndex, event: SyntheticEvent) => {
    if (event.defaultPrevented || !selectable(index)) return;
    const slot = latest.current.slots[index]; latest.current.onActivate?.(index, { ...slot, preview: { ...slot.preview } }, event);
  };
  const focusSlot = (index: EmoteIndex) => { focusOrigin.current = true; try { buttons.current[index]?.focus({ preventScroll: true }); } finally { focusOrigin.current = false; } };
  const hit = (event: { clientX: number; clientY: number }): EmoteIndex | null => {
    const rect = wheel.current?.getBoundingClientRect(); if (!rect || !rect.width || !rect.height) return null;
    const x = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2), y = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2), radius = Math.hypot(x, y);
    if (!Number.isFinite(radius) || radius < .35 || radius > 1) return null;
    const index = ((Math.round(Math.atan2(x, -y) / (Math.PI / 2)) + 4) % 4) as EmoteIndex; return selectable(index) ? index : null;
  };
  const release = (node: HTMLDivElement) => { const old = gesture.current; gesture.current = null; if (old && node.hasPointerCapture?.(old.pointerId)) node.releasePointerCapture(old.pointerId); };
  useEffect(() => { const node = root.current; return () => { if (node) release(node); }; }, []);
  const ownsButton = (event: KeyboardEvent<HTMLDivElement>) => buttons.current.findIndex(button => button === event.target);
  const keyboardBlocked = (event: KeyboardEvent<HTMLDivElement>) => disabled || event.defaultPrevented || event.nativeEvent.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey
    || event.target !== event.currentTarget && ownsButton(event) < 0;
  const tab = accepted !== null && selectable(accepted) ? accepted : indices.find(index => selectable(index));
  const keyboard = hints?.keyboard === undefined ? defaultKeys : hints.keyboard, gamepad = hints?.gamepad;
  const frame = accepted === null ? emoteWheelAssets.wheelBase : frames[accepted];
  const pointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const active = gesture.current; if (!active || active.pointerId !== event.pointerId) return;
    const sameSlots = active.ids.every((id, index) => latest.current.slots[index]!.id === id), index = hit(event);
    release(event.currentTarget); suppressClick.current = true;
    if (sameSlots && !event.defaultPrevented && !disabled && index !== null) { request(index, 'pointer', event); activate(index, event); }
  };
  return <div {...props} ref={attach} role={props.role ?? 'group'} aria-label={props['aria-label'] ?? label} aria-disabled={disabled || undefined} tabIndex={props.tabIndex ?? -1}
    className={['mc-emote-wheel', className].filter(Boolean).join(' ')} data-active-index={accepted ?? ''} data-input-mode={inputMode}
    style={{ '--mc-emote-u': `${scale}px`, '--mc-emote-diameter': `${Math.min(...size) * .75 * scale}px`, '--mc-emote-keycap': imageUrl(emoteWheelAssets.keyboardTooltip.url), width: size[0] * scale, height: size[1] * scale, ...style } as CSSProperties}
    onKeyDown={event => {
      onKeyDown?.(event); if (keyboardBlocked(event)) return;
      if (event.key === 'Escape') { request(null, 'keyboard', event); onCancel?.(event); event.preventDefault(); return; }
      const arrows: Record<string, EmoteIndex> = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
      const arrow = arrows[event.key];
      if (arrow !== undefined) { if (selectable(arrow)) { request(arrow, 'keyboard', event); focusSlot(arrow); } event.preventDefault(); return; }
      const digit = /^[1-4]$/.test(event.key) ? Number(event.key) - 1 as EmoteIndex : undefined;
      if (digit !== undefined) { if (!event.repeat && selectable(digit)) { request(digit, 'keyboard', event); focusSlot(digit); activate(digit, event); } event.preventDefault(); return; }
      if (event.key === 'Enter' || event.key === ' ') { const button = ownsButton(event), index = button >= 0 ? button as EmoteIndex : accepted;
        if (!event.repeat && index !== null) activate(index, event); event.preventDefault(); }
    }}
    onKeyUp={event => { onKeyUp?.(event); if (!keyboardBlocked(event) && (event.key === ' ' || event.key === 'Enter')) event.preventDefault(); }}
    onClick={event => {
      onClick?.(event); const suppressed = suppressClick.current; suppressClick.current = false;
      // Pointer activation is resolved by the validated radial release. Native
      // virtual clicks remain available to keyboard/assistive technology.
      if (event.defaultPrevented || suppressed || event.detail > 0) return;
      const index = buttons.current.findIndex(button => button === event.target || button?.contains(event.target as Node));
      if (index >= 0) { request(index as EmoteIndex, 'focus', event); activate(index as EmoteIndex, event); }
    }}
    onPointerDown={event => { onPointerDown?.(event); suppressClick.current = false; if (event.defaultPrevented || disabled || event.button !== 0 || !event.isPrimary) return;
      const index = hit(event); if (index === null) { event.preventDefault(); return; } gesture.current = { pointerId: event.pointerId, ids: slots.map(slot => slot.id) };
      event.currentTarget.setPointerCapture?.(event.pointerId); request(index, 'pointer', event); focusSlot(index); event.preventDefault(); }}
    onPointerMove={event => { onPointerMove?.(event); if (event.defaultPrevented || disabled || gesture.current && gesture.current.pointerId !== event.pointerId || event.pointerType === 'touch' && !gesture.current) return;
      const index = hit(event); if (hover.current !== index) { hover.current = index; request(index, 'pointer', event); } }}
    onPointerUp={event => { onPointerUp?.(event); pointerEnd(event); }}
    onPointerCancel={event => { onPointerCancel?.(event); release(event.currentTarget); }}
    onLostPointerCapture={event => { onLostPointerCapture?.(event); if (gesture.current?.pointerId === event.pointerId) gesture.current = null; }}
    onPointerLeave={event => { onPointerLeave?.(event); hover.current = undefined; if (!gesture.current && (event.pointerType === 'mouse' || event.pointerType === 'pen' && event.buttons === 0)) request(null, 'pointer', event); }}>
    <div className="mc-emote-wheel__wheel" ref={wheel}>
      <Image className="mc-emote-wheel__frame" src={frame.url} sourceSize={frame.sourceSize} scale={scale} alt="" aria-hidden="true"/>
      {slots.map((slot, index) => { const i = index as EmoteIndex; return <button key={slot.id} ref={refs[i]} type="button" className="mc-emote-wheel__slot" data-emote-index={i} data-emote-id={slot.id}
        data-focused={focused === i || undefined} disabled={disabled || slot.disabled} tabIndex={tab === i ? 0 : -1} aria-label={slot.label} aria-pressed={accepted === i}
        onFocus={event => { setFocused(i); if (!focusOrigin.current) request(i, 'focus', event); }} onBlur={() => setFocused(null)}>
        <span className="mc-emote-wheel__preview"><EmoteSlotPreview content={slot.preview} scale={scale} label={slot.label} aria-hidden="true"/></span>
      </button>; })}
      <Text className="mc-emote-wheel__name" shadow aria-hidden="true">{centerLabel ?? (accepted === null || slots[accepted].preview.kind === 'empty' ? '' : slots[accepted].label)}</Text>
      {inputMode === 'keyboard' && keyboard !== false && indices.map(index => <span className="mc-emote-wheel__hint mc-emote-wheel__hint--keyboard" key={index} data-emote-index={index} aria-hidden="true"><span>{keyboard[index]}</span></span>)}
      {inputMode === 'touch' && slots.map((slot, index) => <Text className="mc-emote-wheel__hint mc-emote-wheel__hint--touch" key={slot.id} data-emote-index={index} shadow aria-hidden="true">{slot.label}</Text>)}
      {inputMode === 'gamepad' && gamepad && (gamepad.mode === 'quick' && gamepad.faces ? indices.map(index => <span className="mc-emote-wheel__hint mc-emote-wheel__hint--gamepad" key={index} data-emote-index={index} aria-hidden="true">{gamepad.faces![index]}</span>)
        : gamepad.mode === 'analog' && gamepad.select ? <span className="mc-emote-wheel__analog" aria-hidden="true">{gamepad.select}</span> : null)}
    </div>
  </div>;
});
