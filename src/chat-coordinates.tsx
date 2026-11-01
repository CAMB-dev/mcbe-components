import { forwardRef, useCallback, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, Ref, SyntheticEvent } from 'react';
import { ClassicSkin } from './classic-skin';
import { Image } from './image';
import { chatAssets } from './chat-assets';
import { ChatGlyph } from './chat-text';
import { snapshotChatCoordinates, snapshotChatProfile, validateChatRef } from './chat-data';
import { deferClassicRequest, scheduleClassicTask, useClassicLayoutEffect, useClassicNodeRef } from './classic-screen-lifecycle';
import type { ChatBindings, ChatCoordinates, ChatPresentationProfile, ChatTextRenderer } from './chat-types';

export interface ChatCoordinateDropdownHandle {
  isOpen(): boolean;
  /** Returns whether this open layer consumed the request. Eventful dismissal
   * waits for native/ancestor veto; isOpen stays true until the local commit. */
  dismiss(event?: SyntheticEvent<HTMLElement>): boolean;
}
export interface ChatCoordinateButtonRequest {
  readonly target: 'copy_coordinates_button' | 'paste_button';
  readonly control: HTMLButtonElement; readonly event: SyntheticEvent<HTMLButtonElement>;
}
export interface ChatCoordinateSelectionRequest {
  readonly field: 'coordinate_type_position' | 'coordinate_type_facing'; readonly value: boolean;
  readonly control: HTMLInputElement; readonly event: SyntheticEvent<HTMLInputElement>;
}
export interface ChatCoordinatesToolbarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML' | 'hidden'> {
  readonly children?: never; readonly dangerouslySetInnerHTML?: never;
  readonly runKey: string; readonly coordinates: ChatCoordinates; readonly profile: ChatPresentationProfile;
  readonly bindings?: Pick<ChatBindings, 'usingGamepad'>;
  readonly disabled?: boolean; readonly readOnly?: boolean; readonly hidden?: boolean;
  readonly dropdownRef?: Ref<ChatCoordinateDropdownHandle>; readonly renderText?: ChatTextRenderer;
  /** Synchronous raw leaf requests only. ChatScreen owns the sole deferred
   * semantic acceptance/checkpoint; false rejects this action, not the root. */
  readonly onRequest: (request: ChatCoordinateButtonRequest) => void | false;
  readonly onCoordinateRequest: (request: ChatCoordinateSelectionRequest) => void | false;
}
interface Session {
  runKey: string; visible: boolean; disabled: boolean; readOnly: boolean; epoch: number; open: boolean;
  root: HTMLDivElement | null;
}
const states = ['default', 'hover', 'pressed', 'locked'] as const;
function sameScope(a: Session, b: Pick<Session, 'runKey' | 'visible' | 'disabled' | 'readOnly'>) {
  return a.runKey === b.runKey && a.visible === b.visible && a.disabled === b.disabled && a.readOnly === b.readOnly;
}
function extent(w: number, h: number, s: number) {
  if (![w, h].every(n => Number.isFinite(n) && n > 0) || w * s > 8192 || h * s > 8192 || w * h * s * s > 4194304)
    throw new RangeError('Chat coordinate geometry exceeds the finite Web extent budget.');
}
function usingGamepad(value: ChatCoordinatesToolbarProps['bindings']) {
  if (value === undefined) return false;
  if (!value || typeof value !== 'object') throw new TypeError('Chat coordinate bindings must be a data record.');
  const descriptor = Object.getOwnPropertyDescriptor(value, 'usingGamepad');
  if (!descriptor || !('value' in descriptor) || typeof descriptor.value !== 'boolean') throw new TypeError('Chat usingGamepad must be an own boolean data field.');
  return descriptor.value as boolean;
}

/** Root preflight: no hooks, callbacks, DOM or resource reads. All sibling
 * plans can finish before the owning screen invokes its first glyph seam. */
export function planChatCoordinatesToolbar(props: ChatCoordinatesToolbarProps, forwardedRef?: Ref<HTMLDivElement>) {
  const { runKey, coordinates, profile: sourceProfile, bindings, disabled = false, readOnly = false, hidden = false,
    dropdownRef, renderText, onRequest, onCoordinateRequest, children, dangerouslySetInnerHTML,
    onKeyDown, onBlur, className = '', style, ...native } = props;
  if (children !== undefined || dangerouslySetInnerHTML !== undefined) throw new TypeError('Chat coordinates are data-driven.');
  if (typeof runKey !== 'string' || !runKey.trim() || runKey.length > 65536) throw new TypeError('Chat coordinates require a bounded nonempty runKey.');
  if ([disabled, readOnly, hidden].some(value => typeof value !== 'boolean')) throw new TypeError('Chat coordinate flags must be boolean.');
  if (typeof onRequest !== 'function' || typeof onCoordinateRequest !== 'function' || renderText !== undefined && typeof renderText !== 'function') throw new TypeError('Invalid Chat coordinate callback.');
  if (typeof className !== 'string') throw new TypeError('Chat coordinate className must be a string.');
  for (const [name, value] of Object.entries({ onKeyDown, onBlur, ...native })) {
    if (/^on[A-Z]/.test(name) && value !== undefined && value !== null && typeof value !== 'function') throw new TypeError(`Chat coordinate ${name} must be a native event callback.`);
  }
  if (style !== undefined) {
    if (!style || typeof style !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(style))) throw new TypeError('Chat coordinate style must be a CSS data record.');
    for (const key of Reflect.ownKeys(style)) {
      const descriptor = Object.getOwnPropertyDescriptor(style, key);
      if (typeof key !== 'string' || !descriptor?.enumerable || !('value' in descriptor)) throw new TypeError('Chat coordinate style must contain own data properties.');
      const value: unknown = descriptor.value;
      if (value !== undefined && (typeof value !== 'string' && typeof value !== 'number' || typeof value === 'number' && !Number.isFinite(value))) throw new TypeError('Chat coordinate CSS values must be finite primitives.');
    }
  }
  validateChatRef(forwardedRef, 'Chat coordinate node ref'); validateChatRef(dropdownRef, 'Chat coordinate dropdown ref');
  const model = snapshotChatCoordinates(coordinates), profile = snapshotChatProfile(sourceProfile), gamepad = usingGamepad(bindings), s = profile.scale;
  const rowHeight = Math.max(19, profile.fonts.chrome.lineHeight) + 4, popupHeight = 4 + rowHeight * 2;
  extent(100, Math.max(60, 18 + popupHeight), s); extent(160, 16, s); extent(26, 26, s);
  const visible = model.visible && !hidden;
  const labels = Object.freeze(Object.fromEntries(['copy_coordinates_button', 'paste_button', 'chat_coordinate_dropdown', 'chat.coordinateTypePosition', 'chat.coordinateTypeFacing']
    .map(key => [key, Object.hasOwn(profile.labels, key) ? profile.labels[key]! : key])));
  return Object.freeze({ runKey, model, profile, gamepad, s, rowHeight, popupHeight, disabled, readOnly, hidden, visible,
    dropdownRef, renderText, onRequest, onCoordinateRequest, onKeyDown, onBlur, className, labels,
    style: style === undefined ? undefined : Object.freeze({ ...style }), native: Object.freeze(native),
    scope: Object.freeze({ runKey, visible, disabled, readOnly }) });
}
export type ChatCoordinatesToolbarPlan = ReturnType<typeof planChatCoordinatesToolbar>;

/** Private source toolbar. The parent owns its top-middle anchor/[0,1]
 * offset. Intrinsic text, normal control alignment and popup placement are an
 * explicit finite Web profile, not a recovered native dropdown evaluator. */
export const ChatCoordinatesToolbar = forwardRef<HTMLDivElement, ChatCoordinatesToolbarProps>(function ChatCoordinatesToolbar(props, forwardedRef) {
  const plan = planChatCoordinatesToolbar(props, forwardedRef);
  // All known model/geometry validation completes before any glyph callback.
  const { model, profile, gamepad, s, rowHeight, popupHeight, disabled, readOnly, visible, scope,
    dropdownRef, renderText, onRequest, onCoordinateRequest, onKeyDown, onBlur, className, style, native } = plan;
  const [root, attach] = useClassicNodeRef(forwardedRef), [trigger, attachTrigger] = useClassicNodeRef<HTMLButtonElement>();
  const popup = useRef<HTMLDivElement>(null), committed = useRef<Session | null>(null), dismissedEvents = useRef(new WeakSet<Event>());
  const [local, setLocal] = useState({ epoch: 0, open: false });
  const old = committed.current, epoch = old ? old.epoch + (sameScope(old, scope) ? 0 : 1) : 0;
  const opened = visible && !disabled && !readOnly && local.epoch === epoch && local.open;
  const id = useId(), menuId = `${id}-coordinates`, filterId = `${id}-coordinate-tint`;
  const validSession = useCallback((expected: Session) => {
    const current = committed.current;
    return !!current && current.epoch === expected.epoch && current.root === expected.root && current.visible
      && !current.disabled && !current.readOnly && !!current.root?.isConnected && !current.root.closest('[hidden],[inert]');
  }, []);
  const dismiss = useCallback((event?: SyntheticEvent<HTMLElement>) => {
    const session = committed.current;
    if (!session?.open) return false;
    if (!event) { setLocal({ epoch: session.epoch, open: false }); return true; }
    if (dismissedEvents.current.has(event.nativeEvent)) return true;
    dismissedEvents.current.add(event.nativeEvent);
    if (session.root) deferClassicRequest<HTMLElement, SyntheticEvent<HTMLElement>>(event, session.root, () => setLocal({ epoch: session.epoch, open: false }), () => validSession(session) && !!committed.current?.open);
    return true;
  }, [validSession]);
  const handle = useMemo<ChatCoordinateDropdownHandle>(() => Object.freeze({ isOpen: () => !!committed.current?.open, dismiss }), [dismiss]);
  useClassicLayoutEffect(() => {
    const previous = committed.current;
    committed.current = { ...scope, epoch, open: opened, root: root.current };
    if (opened && (!previous?.open || previous.epoch !== epoch)) {
      const inputs = popup.current?.querySelectorAll<HTMLInputElement>('input');
      (Array.from(inputs ?? []).find(input => input.checked) ?? inputs?.[0])?.focus({ preventScroll: true });
    } else if (previous?.open && !opened && trigger.current && !trigger.current.disabled) {
      const current = trigger.current.ownerDocument.activeElement;
      if (current === trigger.current.ownerDocument.body || current && popup.current?.contains(current)) trigger.current.focus({ preventScroll: true });
    }
  });
  useClassicLayoutEffect(() => {
    if (typeof dropdownRef === 'function') { const cleanup = dropdownRef(handle); return typeof cleanup === 'function' ? cleanup : () => { dropdownRef(null); }; }
    if (dropdownRef) { dropdownRef.current = handle; return () => { if (dropdownRef.current === handle) dropdownRef.current = null; }; }
  }, [dropdownRef, handle]);
  useClassicLayoutEffect(() => () => { committed.current = null; }, []);
  useClassicLayoutEffect(() => {
    const node = root.current; if (!opened || !node) return;
    const doc = node.ownerDocument;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node | null, session = committed.current;
      if (!session || !target || node.contains(target)) return;
      scheduleClassicTask(node, () => { if (!event.defaultPrevented && validSession(session)) setLocal({ epoch: session.epoch, open: false }); });
    };
    doc.addEventListener('pointerdown', outside);
    return () => doc.removeEventListener('pointerdown', outside);
  });
  const label = (key: string) => plan.labels[key] ?? key;
  const skin = (key: keyof typeof chatAssets, w: number, h: number, className = '') => <ClassicSkin asset={chatAssets[key]} width={w} height={h} scale={s} baseClass="mc-chat-coordinate-skin" className={className} errorName="Chat coordinates" />;
  const image = (key: keyof typeof chatAssets, w: number, h: number, className = '') => <Image src={chatAssets[key].url} sourceSize={[chatAssets[key].width, chatAssets[key].height]} size={[w, h]} scale={s} alt="" aria-hidden="true" className={className} />;
  const glyph = (text: string, color: string, shadow = false, key?: string) => <ChatGlyph text={text} role="coordinate" profile={profile} renderText={renderText} color={color} shadow={shadow} id={key} />;
  const triggerStates = [
    ['closed', 'textures/ui/button_borderless_light', 'rgb(30% 30% 30%)', false],
    ['closed-hover', 'textures/ui/button_borderless_lighthover', '#fff', true],
    ['open', 'textures/ui/button_borderless_lightpressednohover', 'rgb(12.16% 12.16% 12.16%)', false],
    ['open-hover', 'textures/ui/button_borderless_lightpressed', '#fff', false],
    ['locked', 'textures/ui/disabledButtonNoBorder', 'rgb(30% 30% 30%)', false],
  ] as const;
  const button = (target: ChatCoordinateButtonRequest['target'], texture: 'textures/ui/copy' | 'textures/ui/paste', enabled: boolean) => <button type="button" className="mc-chat-coordinates__small-button" disabled={disabled || !enabled} aria-disabled={readOnly || undefined} aria-label={label(target)} data-source-target={target}
    data-source-focus-id={target === 'copy_coordinates_button' ? 'coordinate_copy_button_focus_id' : 'paste_button_focus_id'}
    data-source-focus-left={target === 'copy_coordinates_button' ? 'coordinate_dropdown_focus_id' : 'coordinate_copy_button_focus_id'}
    data-source-focus-right={target === 'copy_coordinates_button' ? 'paste_button_focus_id' : undefined} data-source-focus-down="text_edit_box_focus_id"
    onClick={event => { const control = event.currentTarget; if (!visible || disabled || readOnly || !enabled || event.defaultPrevented || event.nativeEvent.defaultPrevented || !root.current?.contains(control) || control.closest('[hidden],[inert]')) return; onRequest(Object.freeze({ target, control, event })); }}>
    {states.map(state => <span key={state} className={`mc-chat-coordinates__small-state mc-chat-coordinates__small-state--${state}`} aria-hidden="true">
      <span className="mc-chat-coordinates__small-face">{skin(state === 'locked' ? 'textures/ui/disabledButtonNoBorder' : state === 'pressed' ? 'textures/ui/button_borderless_lightpressed' : state === 'hover' ? 'textures/ui/button_borderless_lighthover' : 'textures/ui/button_borderless_light', 14, 14)}</span>
      <span className="mc-chat-coordinates__small-border" style={{ filter: state === 'hover' || state === 'pressed' ? 'none' : 'brightness(.075)' }}>{skin('textures/ui/focus_border_white', 16, 16)}</span>
      <span className="mc-chat-coordinates__small-icon">{image(texture, 12, 12)}</span>
    </span>)}
  </button>;
  const choice = (field: ChatCoordinateSelectionRequest['field'], selected: boolean, key: string) => <label className="mc-chat-coordinates__choice" data-checked={selected} data-locked={disabled} style={{ height: rowHeight * s }}>
    <Image src={profile.whiteMaterial.src} sourceSize={profile.whiteMaterial.naturalSize} size={[96, rowHeight]} scale={s} alt="" aria-hidden="true" className="mc-chat-coordinates__choice-bg" style={{ filter: `url("#${filterId}-${selected ? 'selected' : 'unselected'}")` }} />
    <Image src={profile.whiteMaterial.src} sourceSize={profile.whiteMaterial.naturalSize} size={[96, rowHeight]} scale={s} alt="" aria-hidden="true" className="mc-chat-coordinates__choice-bg mc-chat-coordinates__choice-bg--hover" style={{ filter: `url("#${filterId}-hover")` }} />
    <input type="checkbox" checked={selected} disabled={disabled} readOnly={readOnly} aria-readonly={readOnly || undefined} aria-label={label(key)} data-chat-coordinate-field={field} data-source-binding={`#${field}`} data-source-radio-toggle-group="true"
      onClick={event => { if (readOnly) { event.preventDefault(); event.currentTarget.checked = selected; } }}
      onChange={event => { const control = event.currentTarget, value = control.checked;
        if (!visible || disabled || readOnly || event.defaultPrevented || event.nativeEvent.defaultPrevented || !root.current?.contains(control) || control.closest('[hidden],[inert]')) { control.checked = selected; return; }
        try { if (onCoordinateRequest(Object.freeze({ field, value, control, event })) !== false) dismiss(event); }
        finally { control.checked = selected; }
      }} />
    <span className="mc-chat-coordinates__radio" style={{ top: (rowHeight - 10) / 2 * s }}>{image(selected ? 'textures/ui/radio_on' : 'textures/ui/radio_off', 10, 10, 'mc-chat-coordinates__radio-rest')}{image(selected ? 'textures/ui/radio_on_hover' : 'textures/ui/radio_off_hover', 10, 10, 'mc-chat-coordinates__radio-hover')}</span>
    <span className="mc-chat-coordinates__choice-label">{glyph(label(key), '#fff', true, key)}</span>
  </label>;
  return <div {...native} ref={attach} hidden={!visible} className={`mc-chat-coordinates ${className}`} data-source-control="chat.chat_header_content_area" data-coordinate-dropdown-open={opened}
    data-web-policy="intrinsic-text-plus14-min160;normal-font-row-max19-plus4;top-aligned-controls;popup-below-trigger;independent-checkbox-bindings"
    style={{ ...style, '--mc-chat-coordinate-unit': `${s}px`, height: 60 * s, fontFamily: profile.fonts.chrome.family, fontSize: profile.fonts.chrome.logicalSize * s, lineHeight: `${profile.fonts.chrome.lineHeight * s}px` } as CSSProperties}
    onKeyDown={event => { onKeyDown?.(event); if (event.defaultPrevented || event.nativeEvent.defaultPrevented || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat && profile.inputPolicy.repeat === 'ignore') return; if (event.key === 'Escape') dismiss(event); }}
    onBlur={event => { onBlur?.(event); if (!event.currentTarget.contains(event.relatedTarget as Node | null)) dismiss(event); }}>
    <svg width="0" height="0" className="mc-chat-coordinates__filter" aria-hidden="true" focusable="false"><defs>{([
      ['unselected', .43, .43, .43], ['selected', .29, .29, .29], ['hover', .12, .48, 0],
    ] as const).map(([key, r, g, b]) => <filter key={key} id={`${filterId}-${key}`} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={`${r} 0 0 0 0 0 ${g} 0 0 0 0 0 ${b} 0 0 0 0 0 1 0`} /></filter>)}</defs></svg>
    <div className="mc-chat-coordinates__dropdown" data-source-control="chat.coordinate_dropdown" data-source-dropdown-name="chat_coordinate_dropdown"><button ref={attachTrigger} type="button" className="mc-chat-coordinates__trigger" disabled={disabled} aria-disabled={readOnly || undefined} aria-expanded={opened} aria-controls={menuId} aria-label={model.dropdownLabel || label('chat_coordinate_dropdown')} data-source-focus-id="coordinate_dropdown_focus_id"
      onClick={event => { const session = committed.current, control = event.currentTarget; if (!session || !validSession(session) || control !== trigger.current) return; deferClassicRequest(event, control, () => setLocal(previous => ({ epoch: session.epoch, open: previous.epoch === session.epoch ? !previous.open : true })), () => validSession(session) && control === trigger.current); }}>
      {triggerStates.map(([state, texture, color, whiteChevron]) => <span key={state} className={`mc-chat-coordinates__trigger-state mc-chat-coordinates__trigger-state--${state}`} aria-hidden="true"><span className="mc-chat-coordinates__trigger-face">{skin(texture, 98, 14)}</span><span className="mc-chat-coordinates__trigger-border" style={{ filter: state.includes('hover') ? 'none' : 'brightness(.075)' }}>{skin('textures/ui/focus_border_white', 100, 16)}</span><span className="mc-chat-coordinates__trigger-label">{glyph(model.dropdownLabel, color, false, 'chat_coordinate_dropdown')}</span><span className="mc-chat-coordinates__chevron">{image(whiteChevron ? 'textures/ui/chevron_white_down' : 'textures/ui/dropdown_chevron', 8, 8)}</span></span>)}
    </button><div ref={popup} id={menuId} hidden={!opened} role="group" aria-label={model.dropdownLabel || label('chat_coordinate_dropdown')} className="mc-chat-coordinates__popup" style={{ height: popupHeight * s }} data-source-control="chat.coordinate_dropdown_content" data-source-dropdown-area="chat_header_content_area" data-source-layer="42" data-web-selection-policy="two-independent-controlled-checkboxes">
      {skin('textures/ui/dropdown_background', 100, popupHeight)}<div className="mc-chat-coordinates__popup-content">{choice('coordinate_type_position', model.positionSelected, 'chat.coordinateTypePosition')}{choice('coordinate_type_facing', model.facingSelected, 'chat.coordinateTypeFacing')}</div>
    </div></div>
    <div className="mc-chat-coordinates__display"><span className="mc-chat-coordinates__bar" style={{ maxWidth: Math.min(8192, 4194304 / (12 * s)) }}><Image src={chatAssets['textures/ui/lightgreybars'].url} sourceSize={[1, 1]} alt="" aria-hidden="true" className="mc-chat-coordinates__display-material" style={{ width: '100%', height: '100%' }} /><span className="mc-chat-coordinates__display-text">{glyph(model.text, '#fff', false, 'coordinates_text')}</span></span></div>
    {button('copy_coordinates_button', 'textures/ui/copy', model.copyEnabled)}
    {gamepad && <span className="mc-chat-coordinates__gamepad" aria-hidden="true" data-source-control="common.gamepad_helper_y"><Image src={profile.gamepadImages.y.src} sourceSize={profile.gamepadImages.y.naturalSize} size={[26, 26]} scale={s} alt="" /></span>}
    {button('paste_button', 'textures/ui/paste', true)}
  </div>;
});
