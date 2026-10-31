import { forwardRef, useRef } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, KeyboardEvent, ReactNode, Ref, SyntheticEvent } from 'react';
import { classicModalTab, deferClassicEvent, deferClassicRequest, useClassicLayoutEffect, useClassicModal, useClassicNodeRef } from './classic-screen-lifecycle';
import { immersiveReaderAssets } from './ugc-reader-assets';

/** Independent source controller bindings; none is inferred from another flag. */
export interface ImmersiveReaderBindings {
  readonly running: boolean;
  readonly loading: boolean;
  readonly error: boolean;
  readonly canRetry: boolean;
}
export interface ImmersiveReaderLabels {
  readonly title: string;
  readonly loading: string;
  readonly cancel: string;
  readonly retry: string;
  readonly ok: string;
}
/** Explicit Web resolution of the source %c/%cm expressions, not a native measurement. */
export type ImmersiveReaderPopupLayout =
  | { readonly kind: 'child-sum'; readonly titleWidth: number }
  | { readonly kind: 'resolved'; readonly size: readonly [number, number] };
export type ImmersiveReaderAction = 'activate' | 'retry' | 'loading-cancel' | 'error-cancel' | 'ok' | 'escape';
export type ImmersiveReaderTextAction = Exclude<ImmersiveReaderAction, 'activate' | 'escape'>;
export interface ImmersiveReaderActionDetail {
  readonly action: ImmersiveReaderAction;
  readonly target: 'button.immersive_reader' | 'button.error.try_again' | 'button.menu_exit';
  readonly origin: 'reader-button' | 'loading' | 'error' | 'screen';
  /** Deferred snapshot with stable currentTarget and methods bound to the original event. */
  readonly event: SyntheticEvent<HTMLElement>;
  /** Stable originating element, also supplied as the deferred event.currentTarget. */
  readonly control: HTMLElement;
  /** Accepted binding copy at the input event, or null for the standalone button. */
  readonly bindings: Readonly<ImmersiveReaderBindings> | null;
}
export type ImmersiveReaderActionHandler = (detail: ImmersiveReaderActionDetail) => void;
export type ImmersiveReaderNativeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'dangerouslySetInnerHTML' | 'type' | 'disabled'>;
export interface ImmersiveReaderButtonProps extends Omit<ImmersiveReaderNativeButtonProps, 'size'> {
  label?: string;
  /** Source default16x16; explicit instance sizes do not crop the whole19x19 icon. */
  size?: readonly [number, number];
  scale?: number;
  disabled?: boolean;
  readOnly?: boolean;
  onActivate?: ImmersiveReaderActionHandler;
}
export interface ImmersiveReaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML'> {
  /** Resolved complete host frame. No native GUI-scale/safezone provider is inferred. */
  size: readonly [number, number];
  scale?: number;
  /** Optional logical safe-area content rectangle inside size; background still fills size. */
  contentRect?: readonly [number, number, number, number];
  popupLayout: ImmersiveReaderPopupLayout;
  bindings: ImmersiveReaderBindings;
  /** Host-owned real renderer content; wrapper and children stay mounted when not running. */
  webView: ReactNode;
  /** Required host visual in the64x64 source box: the original book_animation sheet is missing. */
  loadingVisual: ReactNode;
  errorText: string;
  labels?: Partial<ImmersiveReaderLabels>;
  visible?: boolean;
  disabled?: boolean;
  /** Web policy: block retry service requests, retaining Cancel/OK/Escape exit requests. */
  readOnly?: boolean;
  /** Explicit Web modal adaptation; source does not declare native modal ownership. Default false. */
  modal?: boolean;
  webViewRef?: Ref<HTMLDivElement>;
  buttonRefs?: Readonly<Partial<Record<ImmersiveReaderTextAction, Ref<HTMLButtonElement>>>>;
  buttonProps?: Readonly<Partial<Record<ImmersiveReaderTextAction, ImmersiveReaderNativeButtonProps>>>;
  onAction?: ImmersiveReaderActionHandler;
}

const labelsDefault: ImmersiveReaderLabels = { title: 'Immersive Reader', loading: 'Loading...', cancel: 'Cancel', retry: 'Try Again', ok: 'OK' };
const imageVars = Object.fromEntries(Object.entries(immersiveReaderAssets).map(([key, asset]) => [`--mc-reader-${key}`, `url(${JSON.stringify(asset.url)})`])) as CSSProperties;
const own = <T,>(record: Readonly<Partial<Record<ImmersiveReaderTextAction, T>>> | undefined, key: ImmersiveReaderTextAction): T | undefined => record && Object.hasOwn(record, key) ? record[key] : undefined;
function scaleValue(value = 2) {
  if (!Number.isSafeInteger(value) || value < 1) throw new RangeError('ImmersiveReader scale must be a positive safe integer.');
  return value;
}
function pair(value: readonly number[], name: string) {
  if (!Array.isArray(value) || value.length !== 2 || !value.every(n => Number.isFinite(n) && n > 0)) throw new RangeError(`${name} requires two positive finite dimensions.`);
}
function bindingCopy(value: ImmersiveReaderBindings) {
  if (!value || typeof value !== 'object' || ['running', 'loading', 'error', 'canRetry'].some(key => !Object.hasOwn(value, key) || typeof value[key as keyof ImmersiveReaderBindings] !== 'boolean')) throw new TypeError('ImmersiveReader requires four independent boolean bindings.');
  return { running: value.running, loading: value.loading, error: value.error, canRetry: value.canRetry };
}
function eventBlocked(event: SyntheticEvent<HTMLElement>) {
  const native = event.nativeEvent as Event & { isComposing?: boolean; keyCode?: number; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean };
  return event.defaultPrevented || native.defaultPrevented || native.isComposing || native.keyCode === 229 || native.altKey || native.ctrlKey || native.metaKey || native.shiftKey;
}
function request(detail: ImmersiveReaderActionDetail, valid: () => boolean, handler: ImmersiveReaderActionHandler | undefined) {
  if (!handler || eventBlocked(detail.event)) return;
  deferClassicRequest(detail.event, detail.control, event => {
    if (!eventBlocked(event)) handler({ ...detail, event });
  }, () => !detail.control.closest('[hidden],[inert]') && valid());
}
function target(action: ImmersiveReaderAction): ImmersiveReaderActionDetail['target'] {
  return action === 'activate' ? 'button.immersive_reader' : action === 'retry' ? 'button.error.try_again' : 'button.menu_exit';
}
function styleAt(scale: number, style?: CSSProperties): CSSProperties {
  return { ...imageVars, '--mc-reader-unit': `${scale}px`, ...style } as CSSProperties;
}
function ReaderTextButton({ action, label, native, controlRef, disabled, onPress }: {
  action: ImmersiveReaderTextAction; label: string; native: ImmersiveReaderNativeButtonProps;
  controlRef?: Ref<HTMLButtonElement>; disabled: boolean; onPress: (event: SyntheticEvent<HTMLElement>) => void;
}) {
  const [, attach] = useClassicNodeRef(controlRef);
  const { onClick, className = '', style, ...props } = native;
  return <button {...props} ref={attach} type="button" disabled={disabled}
    className={`mc-immersive-reader__text-button ${className}`} data-reader-action={action} style={style}
    onClick={event => { onClick?.(event); onPress(event); }}><span>{label}</span></button>;
}

/** Source16x16 action button; host owns starting the actual reader service. */
export const ImmersiveReaderButton = forwardRef<HTMLButtonElement, ImmersiveReaderButtonProps>(function ImmersiveReaderButton({
  label = 'Immersive Reader', size = [16, 16], scale = 2, disabled = false, readOnly = false, onActivate,
  onClick, hidden, className = '', style, ...props
}, forwardedRef) {
  const s = scaleValue(scale); pair(size, 'ImmersiveReaderButton size');
  if (typeof label !== 'string' || !label.trim()) throw new TypeError('ImmersiveReaderButton requires a nonempty accessible label.');
  if (!size.every(n => Number.isFinite(n * s))) throw new RangeError('ImmersiveReaderButton physical size must be finite.');
  const [node, attach] = useClassicNodeRef(forwardedRef), accepted = useRef({ blocked: disabled || readOnly || !!hidden });
  useClassicLayoutEffect(() => { accepted.current = { blocked: disabled || readOnly || !!hidden }; });
  return <button {...props} ref={attach} type="button" disabled={disabled} hidden={hidden} aria-label={props['aria-label'] ?? label} aria-disabled={disabled || readOnly || undefined}
    className={`mc-immersive-reader-button ${className}`} data-reader-target="button.immersive_reader"
    style={styleAt(s, { width: size[0] * s, height: size[1] * s, ...style })}
    onClick={event => {
      onClick?.(event);
      const control = event.currentTarget;
      request({ action: 'activate', target: 'button.immersive_reader', origin: 'reader-button', event, control, bindings: null }, () => node.current === control && !accepted.current.blocked, onActivate);
    }}>
    <span className="mc-immersive-reader-button__background" aria-hidden="true" />
    <span className="mc-immersive-reader-button__focus" aria-hidden="true" />
    <span className="mc-immersive-reader-button__content" aria-hidden="true"><img src={immersiveReaderAssets.reader.url} width={19} height={19} alt="" draggable={false} /></span>
  </button>;
});

/** Source shell + independent loading/error layers + persistent host custom-renderer slot.
 * This does not implement web_view_renderer, its property bag, SDK/auth or speech services. */
export const ImmersiveReader = forwardRef<HTMLDivElement, ImmersiveReaderProps>(function ImmersiveReader({
  size, scale = 2, contentRect, popupLayout, bindings, webView, loadingVisual, errorText, labels,
  visible = true, disabled = false, readOnly = false, modal = false, webViewRef, buttonRefs, buttonProps, onAction,
  onClick, onKeyDown, hidden, className = '', style, ...props
}, forwardedRef) {
  const s = scaleValue(scale); pair(size, 'ImmersiveReader size');
  if (!size.every(n => Number.isFinite(n * s))) throw new RangeError('ImmersiveReader physical frame must be finite.');
  const state = bindingCopy(bindings), text = { ...labelsDefault, ...labels };
  if (Object.values(text).some(value => typeof value !== 'string')) throw new TypeError('ImmersiveReader labels must be strings.');
  if (typeof errorText !== 'string') throw new TypeError('ImmersiveReader errorText must be a string.');
  if (webView === undefined || loadingVisual === undefined) throw new TypeError('ImmersiveReader webView and loadingVisual host slots are required; null may be supplied explicitly.');
  const rect = contentRect ?? [0, 0, size[0], size[1]];
  if (!Array.isArray(rect) || rect.length !== 4 || !rect.every(Number.isFinite) || rect[0] < 0 || rect[1] < 0 || rect[2] <= 0 || rect[3] <= 0 || rect[0] + rect[2] > size[0] || rect[1] + rect[3] > size[1]) throw new RangeError('ImmersiveReader contentRect must fit the resolved host frame.');
  let popupSize: readonly [number, number];
  if (popupLayout?.kind === 'child-sum') {
    if (!Number.isFinite(popupLayout.titleWidth) || popupLayout.titleWidth < 0) throw new RangeError('ImmersiveReader child-sum titleWidth must be finite and nonnegative.');
    popupSize = [Math.max(244, popupLayout.titleWidth + 15) + 16, 147];
  } else if (popupLayout?.kind === 'resolved') { pair(popupLayout.size, 'ImmersiveReader resolved popup'); popupSize = popupLayout.size; }
  else throw new TypeError('ImmersiveReader requires an explicit child-sum or resolved popupLayout.');
  if (!popupSize.every(n => Number.isFinite(n * s))) throw new RangeError('ImmersiveReader physical popup must be finite.');
  const active = visible && !hidden, [node, attach] = useClassicNodeRef(forwardedRef), [, attachWebView] = useClassicNodeRef(webViewRef);
  const accepted = useRef({ active, blocked: disabled, readOnly });
  useClassicLayoutEffect(() => { accepted.current = { active, blocked: disabled, readOnly }; });
  useClassicModal(node, node, active && modal, `${state.running}:${state.loading}:${state.error}:${state.canRetry}`);
  const snapshot = () => Object.freeze({ ...state });
  const send = (action: ImmersiveReaderAction, origin: ImmersiveReaderActionDetail['origin'], event: SyntheticEvent<HTMLElement>) => {
    const control = event.currentTarget;
    request({ action, target: target(action), origin, event, control, bindings: snapshot() }, () => !!node.current?.contains(control) && accepted.current.active && !accepted.current.blocked && (!(action === 'retry' || action === 'activate') || !accepted.current.readOnly), onAction);
  };
  const button = (action: ImmersiveReaderTextAction, label: string, origin: 'loading' | 'error') => {
    return <ReaderTextButton action={action} label={label} native={own(buttonProps, action) ?? {}} controlRef={own(buttonRefs, action)} disabled={disabled || readOnly && action === 'retry'} onPress={event => send(action, origin, event)} />;
  };
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (modal && active && event.key === 'Tab') {
      deferClassicEvent(event, event.currentTarget, snapshot => classicModalTab(snapshot, node.current, node.current), () => accepted.current.active);
      return;
    }
    if (event.key !== 'Escape' || event.repeat || eventBlocked(event) || !active || disabled) return;
    send('escape', 'screen', event);
  };
  return <div {...props} ref={attach} role={modal ? 'dialog' : props.role ?? 'region'} aria-modal={modal && active ? true : undefined}
    aria-label={props['aria-label'] ?? text.title} aria-hidden={!active ? true : props['aria-hidden']} tabIndex={props.tabIndex ?? -1}
    hidden={!active} className={`mc-immersive-reader ${className}`} data-running={state.running} data-loading={state.loading} data-error={state.error} data-can-retry={state.canRetry}
    style={styleAt(s, { width: size[0] * s, height: size[1] * s, ...style })} onClick={onClick} onKeyDown={keyDown}>
    <span className="mc-immersive-reader__screen-background" aria-hidden="true" />
    <div className="mc-immersive-reader__available" style={{ left: rect[0] * s, top: rect[1] * s, width: rect[2] * s, height: rect[3] * s }}>
      <div className="mc-immersive-reader__popup" hidden={state.running} data-popup-layout={popupLayout.kind} style={{ width: popupSize[0] * s, height: popupSize[1] * s }}>
        <span className="mc-immersive-reader__popup-fill" aria-hidden="true" /><span className="mc-immersive-reader__popup-skin" aria-hidden="true" />
        <div className="mc-immersive-reader__header"><span>{text.title}</span></div>
        <div className="mc-immersive-reader__contents"><div className="mc-immersive-reader__plane">
          <div className="mc-immersive-reader__loading" hidden={!state.loading}>
            <div className="mc-immersive-reader__loading-visual" aria-hidden="true">{loadingVisual}</div>
            <div className="mc-immersive-reader__loading-label" role="status">{text.loading}</div>
            <div className="mc-immersive-reader__loading-space" />
            <div className="mc-immersive-reader__loading-cancel">{button('loading-cancel', text.cancel, 'loading')}</div>
          </div>
          <div className="mc-immersive-reader__error" hidden={!state.error}>
            <div className="mc-immersive-reader__error-text" role="alert">{errorText}</div>
            <div className="mc-immersive-reader__error-buttons">
              <div className="mc-immersive-reader__retry-row" hidden={!state.canRetry}>{button('retry', text.retry, 'error')}<span className="mc-immersive-reader__retry-gap" aria-hidden="true" />{button('error-cancel', text.cancel, 'error')}</div>
              <div className="mc-immersive-reader__ok" hidden={state.canRetry}>{button('ok', text.ok, 'error')}</div>
            </div>
          </div>
        </div><span className="mc-immersive-reader__padding-sibling" aria-hidden="true" /></div>
      </div>
      <div ref={attachWebView} className="mc-immersive-reader__webview" hidden={!state.running} data-native-renderer="web_view_renderer">{webView}</div>
    </div>
  </div>;
});
