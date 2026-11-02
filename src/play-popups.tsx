import { forwardRef, useId, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, InputHTMLAttributes, ReactNode, Ref, SyntheticEvent } from 'react';
import { Button } from './components';
import { ClassicSkin } from './classic-skin';
import type { ClassicSkinAsset } from './classic-skin';
import { classicInputFontFamily, resolveClassicInputFont } from './classic-input-font';
import { classicModalOwnsInput, classicModalTab, deferClassicEvent, deferClassicRequest, scheduleClassicTask, useClassicLayoutEffect, useClassicModal, useClassicNodeRef } from './classic-screen-lifecycle';
import { externalServerAssets } from './external-server-assets';
import { playScreenAssets } from './play-screen-assets';
import { progressAssets } from './progress-assets';

export type PlayPopupTextRole = 'title' | 'help' | 'join' | 'cancel' | 'warning-line-1' | 'warning-line-2';
export type PlayPopupNativeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'dangerouslySetInnerHTML' | 'type'>;
export interface PlayPopupCloseDetail {
  readonly reason: 'close-button' | 'escape';
  readonly target: 'button.menu_network_join_by_code_close' | 'button.menu_exit' | 'popup_dialog.escape';
  /** Stable originating node, also retained as the deferred event.currentTarget. */
  readonly control: HTMLElement;
  readonly event: SyntheticEvent<HTMLElement>;
}
interface PlayPopupBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML' | 'title' | 'onChange' | 'onAction'> {
  /** Controlled factory visibility. A close request never changes this value. */
  readonly open: boolean;
  readonly scale?: number;
  /** Web policy: suppress requests but retain modal Tab/focus containment. */
  readonly disabled?: boolean;
  /** Web policy: prevent editing/join requests, retaining Cancel and close/back. */
  readonly readOnly?: boolean;
  readonly closeRef?: Ref<HTMLButtonElement>;
  readonly closeProps?: PlayPopupNativeButtonProps;
  readonly onClose?: (detail: PlayPopupCloseDetail) => void;
  readonly renderText?: (text: string, role: PlayPopupTextRole) => ReactNode;
  /** Host-owned controller helper renderer; omitted rather than inventing glyphs.
   * Source helper anchor is full-frame bottom_middle, offset [0,31]. */
  readonly gamepadHelpers?: ReactNode;
}
export interface PlayJoinCodeLabels {
  readonly title: string;
  readonly close: string;
  readonly code: string;
  readonly placeholder: string;
  readonly join: string;
  readonly help: string;
}
export interface PlayJoinCodeBindings {
  /** Independent common.text_edit_box #text_box_enabled binding. */
  readonly inputEnabled: boolean;
}
export type PlayJoinCodeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'children' | 'dangerouslySetInnerHTML' | 'type' | 'size' | 'value' | 'defaultValue' | 'maxLength' | 'placeholder'>;
export interface PlayJoinCodeChangeDetail {
  readonly target: '#join_by_code_text_edit';
  readonly control: HTMLInputElement;
  readonly event: SyntheticEvent<HTMLInputElement>;
}
export interface PlayJoinCodeActionDetail {
  readonly action: 'join';
  readonly target: 'button.menu_network_join_by_code_popup_join';
  /** Accepted host value at the originating click, with no trimming/filtering. */
  readonly value: string;
  readonly control: HTMLButtonElement;
  readonly event: SyntheticEvent<HTMLButtonElement>;
}
export interface PlayJoinCodeDialogProps extends PlayPopupBaseProps {
  readonly labels: PlayJoinCodeLabels;
  readonly bindings: PlayJoinCodeBindings;
  readonly value: string;
  readonly onValueChange?: (value: string, detail: PlayJoinCodeChangeDetail) => void;
  readonly onAction?: (detail: PlayJoinCodeActionDetail) => void;
  /** Explicit Web visibility, default true. Escape remains independent. */
  readonly closeVisible?: boolean;
  readonly inputRef?: Ref<HTMLInputElement>;
  readonly inputProps?: PlayJoinCodeInputProps;
  readonly joinRef?: Ref<HTMLButtonElement>;
  readonly joinProps?: PlayPopupNativeButtonProps;
  /** Bounded whole-input font route; not a recovered engine character filter. */
  readonly fontMode?: 'auto' | 'latin' | 'unicode';
}
export interface PlayHighPingLabels {
  readonly title: string;
  readonly close: string;
  readonly join: string;
  readonly cancel: string;
  readonly line1: string;
  readonly line2: string;
}
export interface PlayHighPingBindings {
  /** Independent common_panel #close_button_visible binding. */
  readonly closeVisible: boolean;
}
export interface PlayHighPingActionDetail {
  readonly action: 'join' | 'cancel';
  readonly target: 'button.join_server_anyway' | 'button.cancel_join_server';
  readonly control: HTMLButtonElement;
  readonly event: SyntheticEvent<HTMLButtonElement>;
}
export interface PlayHighPingDialogProps extends PlayPopupBaseProps {
  readonly labels: PlayHighPingLabels;
  readonly bindings: PlayHighPingBindings;
  readonly onAction?: (detail: PlayHighPingActionDetail) => void;
  readonly joinRef?: Ref<HTMLButtonElement>;
  readonly cancelRef?: Ref<HTMLButtonElement>;
  readonly joinProps?: PlayPopupNativeButtonProps;
  readonly cancelProps?: PlayPopupNativeButtonProps;
}

function flag(value: unknown, name: string) { if (typeof value !== 'boolean') throw new TypeError(`Play popup ${name} must be boolean.`); }
function text(value: unknown, name: string) { if (typeof value !== 'string') throw new TypeError(`Play popup ${name} must be a string.`); }
function labelsCopy<T extends object>(value: T, keys: readonly (keyof T)[]): T {
  if (!value || typeof value !== 'object') throw new TypeError('Play popup labels must be explicit localized strings.');
  const result = {} as T;
  for (const key of keys) { text(value[key], String(key)); result[key] = value[key]; }
  return result;
}
function baseValidation(props: PlayPopupBaseProps) {
  for (const key of ['children', 'dangerouslySetInnerHTML']) if (Object.hasOwn(props, key)) throw new TypeError(`Play popup cannot replace ${key}.`);
  flag(props.open, 'open'); flag(props.disabled ?? false, 'disabled'); flag(props.readOnly ?? false, 'readOnly');
  if (props.hidden !== undefined) flag(props.hidden, 'hidden');
  if (props.inert !== undefined) flag(props.inert, 'inert');
  const scale = props.scale ?? 2;
  if (!Number.isSafeInteger(scale) || scale < 1 || 250 * scale > 8192 || 250 * 170 * scale * scale > 16777216)
    throw new RangeError('Play popup scale must be a positive integer within the finite physical extent budget.');
  if (props.renderText !== undefined && typeof props.renderText !== 'function') throw new TypeError('Play popup renderText must be a function.');
  if (props.onClose !== undefined && typeof props.onClose !== 'function') throw new TypeError('Play popup onClose must be a function.');
  return scale;
}
function nativeCopy<T extends object>(value: T | undefined): T {
  if (value !== undefined && (!value || typeof value !== 'object')) throw new TypeError('Play popup native overrides must be objects.');
  const copy = { ...value } as T;
  for (const key of ['children', 'dangerouslySetInnerHTML']) if (Object.hasOwn(copy, key)) throw new TypeError(`Play popup native overrides cannot replace ${key}.`);
  for (const key of ['disabled', 'readOnly', 'hidden', 'inert']) if (Object.hasOwn(copy, key) && copy[key as keyof T] !== undefined) flag(copy[key as keyof T], key);
  return copy;
}
function eventBlocked(event: SyntheticEvent<HTMLElement>, modifiers = true) {
  const native = event.nativeEvent as Event & { isComposing?: boolean; keyCode?: number; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean };
  return event.defaultPrevented || native.defaultPrevented || native.isComposing || native.keyCode === 229
    || modifiers && !!(native.altKey || native.ctrlKey || native.metaKey || native.shiftKey);
}
function sourceText(render: PlayPopupBaseProps['renderText'], value: string, role: PlayPopupTextRole) { return render ? render(value, role) : value; }
function skin(asset: ClassicSkinAsset, width: number, height: number, scale: number) {
  return <ClassicSkin asset={asset} width={width} height={height} scale={scale} baseClass="mc-play-popup-skin" errorName="Play popup"/>;
}
function LightPaint({ width, height, scale, children }: { width: number; height: number; scale: number; children: ReactNode }) {
  return <>
    {(['normal', 'hover', 'pressed', 'locked'] as const).map(state => <span key={state} aria-hidden="true" className={`mc-play-popup__button-state mc-play-popup__button-state--${state}`}>
      <span className="mc-play-popup__button-face">{skin(externalServerAssets[state === 'normal' ? 'button_borderless_light' : state === 'hover' ? 'button_borderless_lighthover' : state === 'pressed' ? 'button_borderless_lightpressed' : 'disabledButtonNoBorder'], width - 2, height - 2, scale)}</span>
      <span className="mc-play-popup__button-border">{skin(externalServerAssets.focus_border_white, width, height, scale)}</span>
    </span>)}
    <span className="mc-play-popup__button-text">{children}</span>
  </>;
}
function ClosePaint({ scale }: { scale: number }) {
  return <>{(['normal', 'hover', 'pressed'] as const).map(state => <span key={state} aria-hidden="true" className={`mc-play-popup__close-state mc-play-popup__close-state--${state}`}>{skin(externalServerAssets[state === 'normal' ? 'close_button_default' : state === 'hover' ? 'close_button_hover' : 'close_button_pressed'], 15, 15, scale)}</span>)}</>;
}
interface LiveBase {
  active: boolean; disabled: boolean; readOnly: boolean; closeVisible: boolean; closeDisabled: boolean;
  onClose: PlayPopupBaseProps['onClose'];
}
/** One lease per mounted factory. A close/reopen or replaced real owner invalidates old tasks. */
function usePopup<T extends LiveBase>(snapshot: T, forwarded: Ref<HTMLDivElement>, closeRef?: Ref<HTMLButtonElement>) {
  const [root, attach] = useClassicNodeRef(forwarded), [panel, panelAttach] = useClassicNodeRef<HTMLDivElement>(), [close, closeAttach] = useClassicNodeRef(closeRef);
  const live = useRef(snapshot), generation = useRef(0), identity = useRef<HTMLDivElement | null>(null), alive = useRef(false), composing = useRef(new Set<EventTarget>());
  useClassicLayoutEffect(() => {
    if (identity.current !== root.current || live.current.active !== snapshot.active) generation.current++;
    identity.current = root.current; live.current = snapshot; alive.current = true;
    if (!snapshot.active || snapshot.disabled || snapshot.readOnly) composing.current.clear();
  });
  useClassicLayoutEffect(() => () => { alive.current = false; generation.current++; composing.current.clear(); }, []);
  useClassicModal(root, panel, snapshot.active);
  const valid = (control: HTMLElement, version: number) => alive.current && generation.current === version && live.current.active && !live.current.disabled
    && !!root.current?.contains(control) && !control.matches(':disabled') && !control.closest('[hidden],[inert]') && classicModalOwnsInput(root.current);
  const isComposing = () => {
    for (const target of composing.current) if (!(target as Node).isConnected || !root.current?.contains(target as Node)) composing.current.delete(target);
    return composing.current.size > 0;
  };
  const closeRequest = (event: SyntheticEvent<HTMLElement>, reason: PlayPopupCloseDetail['reason'], target: PlayPopupCloseDetail['target']) => {
    const control = event.currentTarget, version = generation.current, button = close.current;
    if (eventBlocked(event) || isComposing() || !valid(control, version) || reason === 'close-button' && (!live.current.closeVisible || live.current.closeDisabled || control !== button)) return;
    deferClassicRequest(event, control, deferred => live.current.onClose?.({ reason, target, control, event: deferred }),
      () => valid(control, version) && !isComposing() && (reason === 'escape' || close.current === button && live.current.closeVisible && !live.current.closeDisabled));
  };
  return { root, attach, panel, panelAttach, closeAttach, live, generation, alive, composing, isComposing, valid, closeRequest };
}

/** Fixed Classic join_by_code factory. Browser modal ownership/editing is a
 * finite Web policy; this component never authenticates or joins a game. */
export const PlayJoinCodeDialog = forwardRef<HTMLDivElement, PlayJoinCodeDialogProps>(function PlayJoinCodeDialog(props, ref) {
  const scale = baseValidation(props), labels = labelsCopy(props.labels, ['title', 'close', 'code', 'placeholder', 'join', 'help']);
  text(props.value, 'value');
  if (!props.bindings || !Object.hasOwn(props.bindings, 'inputEnabled')) throw new TypeError('PlayJoinCodeDialog requires an independent inputEnabled binding.');
  flag(props.bindings.inputEnabled, 'inputEnabled'); flag(props.closeVisible ?? true, 'closeVisible');
  const inputProps = nativeCopy(props.inputProps), joinProps = nativeCopy(props.joinProps), closeProps = nativeCopy(props.closeProps);
  for (const key of ['value', 'defaultValue', 'type', 'size', 'maxLength', 'placeholder']) if (Object.hasOwn(inputProps, key)) throw new TypeError(`Play Join input override cannot replace ${key}.`);
  for (const key of ['onValueChange', 'onAction'] as const) if (props[key] !== undefined && typeof props[key] !== 'function') throw new TypeError(`Play Join ${key} must be a function.`);
  const fontMode = props.fontMode ?? 'auto'; resolveClassicInputFont(fontMode, props.value);
  const { open, labels: _labels, bindings: _bindings, value, onValueChange, onAction, closeVisible = true, inputRef, inputProps: _inputProps, joinRef, joinProps: _joinProps, closeProps: _closeProps, closeRef, onClose,
    scale: _scale, disabled = false, readOnly = false, fontMode: _fontMode, renderText, gamepadHelpers, hidden, inert, className = '', style, onKeyDown, ...native } = props;
  const active = open && !hidden && !inert, inputDisabled = disabled || !props.bindings.inputEnabled || !!inputProps.disabled, inputReadOnly = readOnly || !!inputProps.readOnly;
  const state = usePopup({ active, disabled, readOnly, closeVisible, closeDisabled: !!closeProps.disabled, onClose, value, inputDisabled, inputReadOnly, joinDisabled: !!joinProps.disabled, onValueChange, onAction }, ref, closeRef);
  const [input, inputAttach] = useClassicNodeRef(inputRef), [join, joinAttach] = useClassicNodeRef(joinRef), id = useId();
  const [draft, setDraft] = useState<string | null>(null), editVersion = useRef(0);
  useClassicLayoutEffect(() => { if (!active || inputDisabled || inputReadOnly) { editVersion.current++; state.composing.current.clear(); setDraft(null); } }, [active, inputDisabled, inputReadOnly]);
  const { onChange: inputChange, onCompositionStart, onCompositionEnd, onBlur: inputBlur, className: inputClass = '', style: inputStyle, ...inputNative } = inputProps;
  const { onClick: joinClick, className: joinClass = '', style: joinStyle, ...joinNative } = joinProps;
  const { onClick: closeClick, className: closeClass = '', style: closeStyle, ...closeNative } = closeProps;
  const shown = draft ?? value;
  const settle = (owner: HTMLElement, version: number) => scheduleClassicTask(owner, () => {
    if (state.alive.current && editVersion.current === version && !state.isComposing()) setDraft(null);
  });
  return <div {...native} ref={state.attach} hidden={!active} inert={inert} className={`mc-play-popup mc-play-popup--join-code ${className}`}
    data-play-popup="join_by_code" data-source-profile="classic-play" data-native-certified="false" aria-hidden={!active || undefined}
    style={{ '--mc-play-popup-unit': `${scale}px`, '--mc-play-popup-font-scale': scale / 2, '--mc-play-popup-control': `url(${JSON.stringify(externalServerAssets.control.url)})`, '--mc-play-popup-black': `url(${JSON.stringify(progressAssets['textures/ui/Black'].url)})`, ...style } as CSSProperties}
    onKeyDown={event => {
      onKeyDown?.(event);
      if (eventBlocked(event, false) || event.nativeEvent.isComposing || state.isComposing()) return;
      if (event.key === 'Tab' && active) { deferClassicEvent(event, event.currentTarget, e => classicModalTab(e, state.root.current, state.panel.current), () => state.live.current.active); return; }
      if (event.key === 'Escape' && !event.repeat && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) state.closeRequest(event, 'escape', 'popup_dialog.escape');
    }}>
    <span className="mc-play-popup__modal-backdrop" aria-hidden="true"/>
    <span className="mc-play-popup__factory-backdrop" aria-hidden="true"/>
    <div ref={state.panelAttach} className="mc-play-popup__panel" role="dialog" aria-modal={active || undefined} aria-labelledby={native['aria-label'] ? undefined : `${id}-title`} aria-label={native['aria-label']} aria-describedby={`${id}-help`} tabIndex={-1} style={{ width: 200 * scale, height: 90 * scale }}>
      <span className="mc-play-popup__opaque" aria-hidden="true">{skin(progressAssets['textures/ui/dialog_background_opaque'], 200, 90, scale)}</span>
      <div className="mc-play-popup__join-header"><h2 className="mc-play-popup__title" id={`${id}-title`}>{sourceText(renderText, labels.title, 'title')}</h2>
        <button {...closeNative} ref={state.closeAttach} type="button" className={`mc-play-popup__close ${closeClass}`} style={closeStyle} aria-label={closeProps['aria-label'] ?? labels.close} hidden={!closeVisible || closeProps.hidden} disabled={disabled || closeProps.disabled}
          data-play-popup-action="close" onClick={event => { closeClick?.(event); state.closeRequest(event, 'close-button', 'button.menu_network_join_by_code_close'); }}><ClosePaint scale={scale}/></button>
      </div>
      <div className="mc-play-popup__join-upper">
        <div className="mc-play-popup__code-editor" data-disabled={inputDisabled || undefined}>
          <span className="mc-play-popup__edit-normal" aria-hidden="true">{skin(externalServerAssets.edit_box_indent, 130, 19.8, scale)}</span>
          <span className="mc-play-popup__edit-hover" aria-hidden="true">{skin(externalServerAssets.edit_box_indent_hover, 130, 19.8, scale)}</span>
          <div className="mc-play-popup__code-field"><label className="mc-field__label" htmlFor={inputProps.id ?? `${id}-code`}>{labels.code}</label><input {...inputNative} id={inputProps.id ?? `${id}-code`} ref={inputAttach} type="text" value={shown} maxLength={15} placeholder={labels.placeholder}
            disabled={inputDisabled} readOnly={inputReadOnly} spellCheck={inputProps.spellCheck ?? false} autoComplete={inputProps.autoComplete ?? 'off'}
            className={`mc-input ${inputClass}`} style={{ fontFamily: classicInputFontFamily(resolveClassicInputFont(fontMode, shown)), ...inputStyle }}
            onChange={event => {
              inputChange?.(event);
              const owner = event.currentTarget, generation = state.generation.current, next = owner.value, version = ++editVersion.current;
              if (event.defaultPrevented || event.nativeEvent.defaultPrevented || !state.valid(owner, generation) || state.live.current.inputDisabled || state.live.current.inputReadOnly || owner.readOnly || owner !== input.current) return;
              // Presentation draft bridges deferred ancestor-veto processing. It
              // is never an accepted source value and always settles to the host.
              setDraft(next);
              deferClassicRequest(event, owner, deferred => state.live.current.onValueChange?.(next, { target: '#join_by_code_text_edit', control: owner, event: deferred }),
                () => state.valid(owner, generation) && input.current === owner && !owner.readOnly && !state.live.current.inputDisabled && !state.live.current.inputReadOnly);
              settle(owner, version);
            }}
            onCompositionStart={event => { onCompositionStart?.(event); if (state.valid(event.currentTarget, state.generation.current) && !state.live.current.inputDisabled && !state.live.current.inputReadOnly) state.composing.current.add(event.currentTarget); }}
            onCompositionEnd={event => { onCompositionEnd?.(event); state.composing.current.delete(event.currentTarget); settle(event.currentTarget, editVersion.current); }}
            onBlur={event => { inputBlur?.(event); state.composing.current.delete(event.currentTarget); settle(event.currentTarget, editVersion.current); }}/></div>
        </div>
        <Button {...joinNative} ref={joinAttach} type="button" disabled={disabled || readOnly || joinProps.disabled} className={`mc-play-popup__button mc-play-popup__join-button ${joinClass}`} style={joinStyle} aria-label={joinProps['aria-label'] ?? labels.join}
          data-play-popup-action="join" onClick={event => {
            joinClick?.(event); const owner = event.currentTarget, generation = state.generation.current, accepted = state.live.current.value;
            if (eventBlocked(event) || state.isComposing() || !state.valid(owner, generation) || state.live.current.readOnly || state.live.current.joinDisabled || join.current !== owner) return;
            deferClassicRequest(event, owner, deferred => state.live.current.onAction?.({ action: 'join', target: 'button.menu_network_join_by_code_popup_join', value: accepted, control: owner, event: deferred }),
              () => state.valid(owner, generation) && !state.isComposing() && !state.live.current.readOnly && !state.live.current.joinDisabled && join.current === owner);
          }}><LightPaint width={63} height={19.8} scale={scale}>{sourceText(renderText, labels.join, 'join')}</LightPaint></Button>
      </div>
      <div className="mc-play-popup__join-lower"><p id={`${id}-help`} className="mc-play-popup__help">{sourceText(renderText, labels.help, 'help')}</p></div>
    </div>
    {gamepadHelpers != null && <div className="mc-play-popup__gamepad-helpers">{gamepadHelpers}</div>}
  </div>;
});

/** Fixed Classic high_ping_warning factory. Join and Cancel remain separate
 * controlled host requests; neither opens a network connection. */
export const PlayHighPingDialog = forwardRef<HTMLDivElement, PlayHighPingDialogProps>(function PlayHighPingDialog(props, ref) {
  const scale = baseValidation(props), labels = labelsCopy(props.labels, ['title', 'close', 'join', 'cancel', 'line1', 'line2']);
  if (!props.bindings || !Object.hasOwn(props.bindings, 'closeVisible')) throw new TypeError('PlayHighPingDialog requires an independent closeVisible binding.');
  flag(props.bindings.closeVisible, 'closeVisible');
  const joinProps = nativeCopy(props.joinProps), cancelProps = nativeCopy(props.cancelProps), closeProps = nativeCopy(props.closeProps);
  if (props.onAction !== undefined && typeof props.onAction !== 'function') throw new TypeError('Play High Ping onAction must be a function.');
  const { open, labels: _labels, bindings: _bindings, onAction, joinRef, cancelRef, joinProps: _joinProps, cancelProps: _cancelProps, closeProps: _closeProps, closeRef, onClose,
    scale: _scale, disabled = false, readOnly = false, renderText, gamepadHelpers, hidden, inert, className = '', style, onKeyDown, ...native } = props;
  const active = open && !hidden && !inert, closeVisible = props.bindings.closeVisible;
  const state = usePopup({ active, disabled, readOnly, closeVisible, closeDisabled: !!closeProps.disabled, onClose, joinDisabled: !!joinProps.disabled, cancelDisabled: !!cancelProps.disabled, onAction }, ref, closeRef);
  const [join, joinAttach] = useClassicNodeRef(joinRef), [cancel, cancelAttach] = useClassicNodeRef(cancelRef), id = useId();
  const { onClick: closeClick, className: closeClass = '', style: closeStyle, ...closeNative } = closeProps;
  const actionButton = (action: 'join' | 'cancel', text: string) => {
    const override = action === 'join' ? joinProps : cancelProps, button = action === 'join' ? join : cancel;
    const { onClick, className: buttonClass = '', style: buttonStyle, ...buttonNative } = override;
    return <Button {...buttonNative} ref={action === 'join' ? joinAttach : cancelAttach} type="button" disabled={disabled || action === 'join' && readOnly || override.disabled}
      aria-label={override['aria-label'] ?? text} className={`mc-play-popup__button ${buttonClass}`} style={buttonStyle} data-play-popup-action={action} onClick={event => {
        onClick?.(event); const owner = event.currentTarget, generation = state.generation.current;
        const currentDisabled = () => action === 'join' ? state.live.current.readOnly || state.live.current.joinDisabled : state.live.current.cancelDisabled;
        if (eventBlocked(event) || state.isComposing() || !state.valid(owner, generation) || currentDisabled() || button.current !== owner) return;
        deferClassicRequest(event, owner, deferred => state.live.current.onAction?.({ action, target: action === 'join' ? 'button.join_server_anyway' : 'button.cancel_join_server', control: owner, event: deferred }),
          () => state.valid(owner, generation) && !state.isComposing() && !currentDisabled() && button.current === owner);
      }}><LightPaint width={115} height={30} scale={scale}>{sourceText(renderText, text, action)}</LightPaint></Button>;
  };
  return <div {...native} ref={state.attach} hidden={!active} inert={inert} className={`mc-play-popup mc-play-popup--high-ping ${className}`}
    data-play-popup="high_ping_warning" data-source-profile="classic-play" data-native-certified="false" aria-hidden={!active || undefined}
    style={{ '--mc-play-popup-unit': `${scale}px`, '--mc-play-popup-font-scale': scale / 2, '--mc-play-popup-control': `url(${JSON.stringify(externalServerAssets.control.url)})`, '--mc-play-popup-black': `url(${JSON.stringify(progressAssets['textures/ui/Black'].url)})`, ...style } as CSSProperties}
    onKeyDown={event => {
      onKeyDown?.(event); if (eventBlocked(event, false) || state.isComposing()) return;
      if (event.key === 'Tab' && active) { deferClassicEvent(event, event.currentTarget, e => classicModalTab(e, state.root.current, state.panel.current), () => state.live.current.active); return; }
      if (event.key === 'Escape' && !event.repeat && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) state.closeRequest(event, 'escape', 'popup_dialog.escape');
    }}>
    <span className="mc-play-popup__modal-backdrop" aria-hidden="true"/><span className="mc-play-popup__factory-backdrop" aria-hidden="true"/>
    <div ref={state.panelAttach} className="mc-play-popup__panel" role="dialog" aria-modal={active || undefined} aria-labelledby={native['aria-label'] ? undefined : `${id}-title`} aria-label={native['aria-label']} aria-describedby={`${id}-line1 ${id}-line2`} tabIndex={-1} style={{ width: 250 * scale, height: 170 * scale }}>
      <span className="mc-play-popup__underfill" aria-hidden="true">{skin(externalServerAssets.control, 242, 162, scale)}</span>
      <span className="mc-play-popup__frame" aria-hidden="true">{skin(externalServerAssets.dialog_background_hollow_2, 250, 170, scale)}</span>
      <h2 className="mc-play-popup__title" id={`${id}-title`}>{sourceText(renderText, labels.title, 'title')}</h2>
      <button {...closeNative} ref={state.closeAttach} type="button" className={`mc-play-popup__close ${closeClass}`} style={closeStyle} aria-label={closeProps['aria-label'] ?? labels.close} hidden={!closeVisible || closeProps.hidden} disabled={disabled || closeProps.disabled} data-play-popup-action="close"
        onClick={event => { closeClick?.(event); state.closeRequest(event, 'close-button', 'button.menu_exit'); }}><ClosePaint scale={scale}/></button>
      <div className="mc-play-popup__warning-indent"><div className="mc-play-popup__warning-stack">
        <div className="mc-play-popup__warning-icons" aria-hidden="true"><span>{skin(playScreenAssets['textures/ui/Ping_Yellow_Dark'], 20, 20, scale)}</span><span>{skin(playScreenAssets['textures/ui/Ping_Red_Dark'], 20, 20, scale)}</span></div>
        <p id={`${id}-line1`} className="mc-play-popup__warning-line">{sourceText(renderText, labels.line1, 'warning-line-1')}</p>
        <p id={`${id}-line2`} className="mc-play-popup__warning-line">{sourceText(renderText, labels.line2, 'warning-line-2')}</p>
      </div></div>
      <div className="mc-play-popup__warning-actions">{actionButton('join', labels.join)}{actionButton('cancel', labels.cancel)}</div>
    </div>
    {gamepadHelpers != null && <div className="mc-play-popup__gamepad-helpers">{gamepadHelpers}</div>}
  </div>;
});
