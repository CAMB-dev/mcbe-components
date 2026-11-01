import { forwardRef, useId, useRef } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, Ref, SyntheticEvent } from 'react';
import { chatAssets } from './chat-assets';
import { snapshotChatBindings, snapshotChatCapabilities, snapshotChatProfile, validateChatRef } from './chat-data';
import { ChatGlyph } from './chat-text';
import type { ChatBindings, ChatCapabilities, ChatPresentationProfile, ChatTextRenderer } from './chat-types';
import { ClassicSkin } from './classic-skin';
import { useClassicLayoutEffect, useClassicNodeRef } from './classic-screen-lifecycle';
import { Image } from './image';

export interface ChatChromeRequest {
  readonly target: 'button.chat_menu_cancel' | 'button.new_messages';
  readonly control: HTMLButtonElement;
  readonly event: SyntheticEvent<HTMLElement>;
  readonly fromButtonId?: 'button.menu_exit';
}
type DivNative = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML'>;
interface ContentGuard { readonly children?: never; readonly dangerouslySetInnerHTML?: never }
export interface ChatHeaderProps extends DivNative, ContentGuard {
  readonly coordinates?: never;
  readonly bindings: ChatBindings; readonly capabilities: ChatCapabilities; readonly profile: ChatPresentationProfile;
  readonly disabled?: boolean; readonly readOnly?: boolean; readonly renderText?: ChatTextRenderer;
  readonly onRequest: (detail: ChatChromeRequest) => void | false;
}
export interface ChatNewMessagesProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'dangerouslySetInnerHTML' | 'type' | 'disabled'>, ContentGuard {
  readonly visible: boolean; readonly profile: ChatPresentationProfile;
  readonly disabled?: boolean; readonly readOnly?: boolean; readonly renderText?: ChatTextRenderer;
  readonly onRequest: (detail: ChatChromeRequest) => void | false;
}
export interface ChatToastProps extends DivNative, ContentGuard {
  readonly toast: null | { readonly instanceId: string; readonly title: string };
  readonly profile: ChatPresentationProfile; readonly renderText?: ChatTextRenderer;
}
function bool(value: unknown, label: string, fallback = false): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw new TypeError(`${label} must be boolean`);
  return value;
}
function nativeStyle(style: CSSProperties | undefined): CSSProperties {
  if (style === undefined) return Object.freeze({});
  if (!style || typeof style !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(style))) throw new TypeError('Chat chrome style must be a plain CSS record');
  const copied: Record<string, string | number | undefined> = {};
  for (const key of Reflect.ownKeys(style)) {
    const field = Object.getOwnPropertyDescriptor(style, key);
    if (typeof key !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(key) || !field?.enumerable || !('value' in field)
      || !(field.value === undefined || typeof field.value === 'string' || typeof field.value === 'number' && Number.isFinite(field.value))) throw new TypeError('Chat chrome style requires finite CSS data fields');
    if (key.startsWith('--mc-chat-')) throw new TypeError('Chat chrome owns its source metric/material variables');
    copied[key] = field.value;
  }
  return Object.freeze(copied) as CSSProperties;
}
function common(input: ContentGuard & { readonly hidden?: boolean; readonly className?: string; readonly style?: CSSProperties; readonly renderText?: ChatTextRenderer }) {
  if (input.children !== undefined || input.dangerouslySetInnerHTML !== undefined) throw new TypeError('Chat chrome does not accept injected children or HTML');
  if (input.className !== undefined && typeof input.className !== 'string') throw new TypeError('Chat chrome className must be a string');
  if (input.renderText !== undefined && typeof input.renderText !== 'function') throw new TypeError('Chat chrome renderText must be a function');
  return { hidden: bool(input.hidden, 'Chat chrome hidden'), style: nativeStyle(input.style) };
}
function requestCallback(value: unknown) { if (typeof value !== 'function') throw new TypeError('Chat chrome onRequest must be a function'); }
function ownedGeometry(style: CSSProperties, values: Record<string, string | number>) {
  for (const [key, value] of Object.entries(values)) if (style[key as keyof CSSProperties] !== undefined && style[key as keyof CSSProperties] !== value) throw new TypeError(`Chat chrome owns style.${key}; size/position its parent instead`);
}
function nativeCallbacks(native: Record<string, unknown>) {
  for (const [key, value] of Object.entries(native)) if (/^on[A-Z]/.test(key) && value !== undefined && typeof value !== 'function') throw new TypeError(`Chat chrome ${key} must be a function`);
  return Object.freeze(native);
}
function text(value: unknown, label: string, max: number, nonempty = false): string {
  if (typeof value !== 'string' || value.length > max || nonempty && !value.trim()) throw new TypeError(`${label} must be a${nonempty ? ' nonempty' : ''} bounded string`);
  return value;
}
/** Pure preflight, shared with Screen so all leaves validate before any glyph. */
export function planChatHeader(input: ChatHeaderProps, forwardedRef?: Ref<HTMLDivElement>) {
  const shared = common(input); validateChatRef(forwardedRef, 'ChatHeader ref'); requestCallback(input.onRequest);
  if (input.coordinates !== undefined) throw new TypeError('ChatHeader coordinates belong to the separate source toolbar');
  const bindings = snapshotChatBindings(input.bindings), capabilities = snapshotChatCapabilities(input.capabilities), profile = snapshotChatProfile(input.profile);
  ownedGeometry(shared.style, { width: '100%', height: 23 * profile.scale });
  const { bindings: _b, capabilities: _c, profile: _p, disabled: _d, readOnly: _r, renderText: _t, onRequest: _q, coordinates: _co,
    children: _ch, dangerouslySetInnerHTML: _html, className: _cl, style: _s, hidden: _h, ...native } = input;
  return Object.freeze({ ...shared, bindings, capabilities, profile, disabled: bool(input.disabled, 'ChatHeader disabled'), readOnly: bool(input.readOnly, 'ChatHeader readOnly'),
    renderText: input.renderText, onRequest: input.onRequest, className: input.className, native: nativeCallbacks(native) as DivNative });
}
export function planChatNewMessages(input: ChatNewMessagesProps, forwardedRef?: Ref<HTMLButtonElement>) {
  const shared = common(input); validateChatRef(forwardedRef, 'ChatNewMessages ref'); requestCallback(input.onRequest);
  if (typeof input.visible !== 'boolean') throw new TypeError('ChatNewMessages visible must be boolean');
  const profile = snapshotChatProfile(input.profile), visible = input.visible, effectiveVisible = visible && !shared.hidden;
  const label = effectiveVisible ? text(profile.labels['chat.newMessages'], 'Chat profile.labels[chat.newMessages]', 65536) : undefined;
  const { visible: _v, profile: _p, disabled: _d, readOnly: _r, renderText: _t, onRequest: _q, children: _ch,
    dangerouslySetInnerHTML: _html, className: _cl, style: _s, hidden: _h, ...native } = input;
  if ('type' in native) throw new TypeError('ChatNewMessages owns native button type');
  return Object.freeze({ ...shared, profile, visible, effectiveVisible, label, disabled: bool(input.disabled, 'ChatNewMessages disabled'), readOnly: bool(input.readOnly, 'ChatNewMessages readOnly'),
    renderText: input.renderText, onRequest: input.onRequest, className: input.className, native: nativeCallbacks(native) as Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'disabled'> });
}
export function planChatToast(input: ChatToastProps, forwardedRef?: Ref<HTMLDivElement>) {
  const shared = common(input); validateChatRef(forwardedRef, 'ChatToast ref');
  const profile = snapshotChatProfile(input.profile); let toast: ChatToastProps['toast'] = null;
  ownedGeometry(shared.style, { width: 40 * profile.scale, height: 20 * profile.scale });
  if (input.toast !== null) {
    if (!input.toast || typeof input.toast !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(input.toast))) throw new TypeError('ChatToast toast must be a plain data record or null');
    const fields = Reflect.ownKeys(input.toast);
    if (fields.length !== 2 || !fields.includes('instanceId') || !fields.includes('title')) throw new TypeError('ChatToast requires only instanceId and title');
    const id = Object.getOwnPropertyDescriptor(input.toast, 'instanceId'), title = Object.getOwnPropertyDescriptor(input.toast, 'title');
    if (!id?.enumerable || !('value' in id) || !title?.enumerable || !('value' in title)) throw new TypeError('ChatToast requires enumerable data fields');
    toast = Object.freeze({ instanceId: text(id.value, 'ChatToast instanceId', 256, true), title: text(title.value, 'ChatToast title', 1048576) });
  }
  const { toast: _to, profile: _p, renderText: _t, children: _ch, dangerouslySetInnerHTML: _html, className: _cl, style: _s, hidden: _h, ...native } = input;
  return Object.freeze({ ...shared, profile, toast, effectiveVisible: toast !== null && !shared.hidden, renderText: input.renderText, className: input.className, native: nativeCallbacks(native) as DivNative });
}
function Matrix({ id, factor }: { id: string; factor: readonly [number, number, number] }) {
  return <svg width="0" height="0" aria-hidden="true" focusable="false" className="mc-chat-chrome__filters"><defs><filter id={id} colorInterpolationFilters="sRGB">
    <feColorMatrix type="matrix" values={`${factor[0]} 0 0 0 0 0 ${factor[1]} 0 0 0 0 0 ${factor[2]} 0 0 0 0 0 1 0`} />
  </filter></defs></svg>;
}
export const ChatHeader = forwardRef<HTMLDivElement, ChatHeaderProps>(function ChatHeader(input, forwardedRef) {
  const plan = planChatHeader(input, forwardedRef), p = plan.profile, s = p.scale;
  const [node, attach] = useClassicNodeRef(forwardedRef), button = useRef<HTMLButtonElement>(null), current = useRef(plan);
  useClassicLayoutEffect(() => { current.current = plan; });
  const tint = `chat-back-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const font = p.fonts.chrome;
  return <div {...plan.native} ref={attach} hidden={plan.hidden} className={['mc-chat-header', plan.className].filter(Boolean).join(' ')}
    style={{ ...plan.style, width: '100%', height: 23 * s, '--mc-chat-unit': `${s}px`, '--mc-chat-hover-image': `url(${JSON.stringify(chatAssets['textures/ui/button_borderless_imagelesshoverbg'].url)})`,
      '--mc-chat-locked-image': `url(${JSON.stringify(chatAssets['textures/ui/disabledButtonNoBorder'].url)})` } as CSSProperties}
    data-source-control="chat.chat_header" data-web-intrinsic-policy="css-font-content" onClick={event => {
      plan.native.onClick?.(event);
      const latest = current.current, control = button.current;
      if (event.defaultPrevented || event.nativeEvent.defaultPrevented || latest.disabled || latest.hidden || latest.bindings.usingGamepad || !control?.isConnected || control.disabled
        || !node.current?.contains(control) || !control.contains(event.target as Node) || control.closest('[hidden],[inert]')) return;
      latest.onRequest(Object.freeze({ target: 'button.chat_menu_cancel', fromButtonId: 'button.menu_exit', control, event }));
    }}>
    <ClassicSkin asset={chatAssets['textures/ui/StoreTopBar']} width={p.availableSize[0]} height={23} scale={s} baseClass="mc-chat-chrome-skin" errorName="ChatHeader" />
    {!plan.hidden && <div className="mc-chat-header__title-panel">
      {plan.bindings.usingGamepad ? <span className="mc-chat-header__gamepad" role="group" aria-label={plan.bindings.backAccessibilityText} data-source-control="chat.gamepad_back_helper" data-helper-visible={plan.bindings.gamepadHelperVisible}>
        {plan.bindings.gamepadHelperVisible && <><Image src={p.gamepadImages.b.src} sourceSize={p.gamepadImages.b.naturalSize} size={[26, 26]} scale={s} alt="" />
        <span className="mc-chat-header__gamepad-description"><ChatGlyph text={plan.bindings.backText} role="chrome" profile={p} font={font} renderText={plan.renderText} color="rgb(30% 30% 30%)" shadow={false} /></span></>}
      </span> : <button ref={button} type="button" disabled={plan.disabled} className="mc-chat-header__back" aria-label={plan.bindings.backAccessibilityText}
        data-source-target="button.menu_exit" data-focus-id="back_button_focus_id" data-source-touch={plan.capabilities.touch}>
        <Matrix id={tint} factor={[.3, .3, .3]} />
        {(['normal', 'hover'] as const).map(state => <span key={state} className={`mc-chat-header__back-content mc-chat-header__back-content--${state}`} aria-hidden="true">
          <Image src={chatAssets['textures/ui/chevron_left'].url} sourceSize={[4, 7]} size={[4, 7]} scale={s} alt="" style={{ filter: state === 'normal' ? `url("#${tint}")` : undefined }} />
          <span className="mc-chat-header__back-label"><ChatGlyph text={plan.bindings.backText} role="chrome" profile={p} font={font} renderText={plan.renderText} color={state === 'normal' ? 'rgb(30% 30% 30%)' : '#fff'} shadow={false} /></span>
        </span>)}
      </button>}
      {plan.bindings.titleVisible && <div className="mc-chat-header__title"><ChatGlyph text={plan.bindings.title} role="title" profile={p} font={font} renderText={plan.renderText} color="rgb(30% 30% 30%)" shadow={false} /></div>}
    </div>}
  </div>;
});
export const ChatNewMessages = forwardRef<HTMLButtonElement, ChatNewMessagesProps>(function ChatNewMessages(input, forwardedRef) {
  const plan = planChatNewMessages(input, forwardedRef), p = plan.profile, s = p.scale;
  const [node, attach] = useClassicNodeRef(forwardedRef), current = useRef(plan);
  useClassicLayoutEffect(() => { current.current = plan; });
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, ''), arrowTint = `chat-new-arrow-${id}`, borderTint = `chat-new-border-${id}`;
  return <button {...plan.native} ref={attach} type="button" disabled={plan.disabled} hidden={!plan.effectiveVisible}
    aria-label={plan.native['aria-label'] ?? (plan.native['aria-labelledby'] ? undefined : plan.label)}
    className={['mc-chat-new-messages', plan.className].filter(Boolean).join(' ')} style={{ ...plan.style, '--mc-chat-unit': `${s}px`,
      '--mc-chat-new-image': `url(${JSON.stringify(chatAssets['textures/ui/purpleBorder'].url)})`, '--mc-chat-focus-image': `url(${JSON.stringify(chatAssets['textures/ui/focus_border_white'].url)})`, '--mc-chat-border-tint': `url("#${borderTint}")` } as CSSProperties}
    data-source-target="button.new_messages" data-web-intrinsic-policy="css-font-content-plus12-plus8" onClick={event => {
      plan.native.onClick?.(event); const latest = current.current, control = node.current;
      if (event.defaultPrevented || event.nativeEvent.defaultPrevented || !latest.effectiveVisible || latest.disabled || !control?.isConnected || control.disabled || control !== event.currentTarget || control.closest('[hidden],[inert]')) return;
      latest.onRequest(Object.freeze({ target: 'button.new_messages', control, event }));
    }}>
    {plan.effectiveVisible && <><Matrix id={arrowTint} factor={[0, 1, 0]} /><Matrix id={borderTint} factor={[.075, .075, .075]} />
      <span className="mc-chat-new-messages__background" aria-hidden="true" /><span className="mc-chat-new-messages__border" aria-hidden="true" />
      <span className="mc-chat-new-messages__content"><Image src={chatAssets['textures/ui/arrow_down'].url} sourceSize={[15, 22]} size={[8, 11]} scale={s} alt="" style={{ filter: `url("#${arrowTint}")` }} />
        <ChatGlyph text={plan.label!} role="chrome" profile={p} renderText={plan.renderText} color="#00ff00" shadow={false} />
      </span></>}
  </button>;
});
export const ChatToast = forwardRef<HTMLDivElement, ChatToastProps>(function ChatToast(input, forwardedRef) {
  const plan = planChatToast(input, forwardedRef), p = plan.profile, s = p.scale;
  const [, attach] = useClassicNodeRef(forwardedRef);
  return <div {...plan.native} ref={attach} hidden={!plan.effectiveVisible} className={['mc-chat-toast', plan.className].filter(Boolean).join(' ')}
    style={{ ...plan.style, width: 40 * s, height: 20 * s, '--mc-chat-unit': `${s}px`, '--mc-chat-toast-image': `url(${JSON.stringify(chatAssets['textures/ui/greyBorder'].url)})` } as CSSProperties}
    data-source-control="chat.popup_toast" data-toast-instance={plan.toast?.instanceId} data-source-resolved-label-offset="0,0" data-source-unused-toast-text-offset="0,4"
    data-source-alpha-anims="[]" data-source-offset-anims="[]" data-web-intrinsic-policy="css-title-height-plus12">
    {plan.effectiveVisible && <div className="mc-chat-toast__background"><div className="mc-chat-toast__title"><ChatGlyph text={plan.toast!.title} role="toast" profile={p}
      font={p.fonts.smooth} renderText={plan.renderText} color="#fff" shadow={false} /></div></div>}
  </div>;
});
