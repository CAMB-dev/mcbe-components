import {forwardRef, useId, useRef, version as reactVersion} from 'react';
import type {ButtonHTMLAttributes, CSSProperties, SyntheticEvent} from 'react';
import {ClassicSkin} from './classic-skin';
import {resourcePackAssets} from './resource-pack-assets';
import {GuiImageLayer} from './gui-image';
import {disconnectBackgroundAssets} from './disconnect-assets';
import {disconnectIntent, planDisconnectActions, snapshotDisconnectLayout, validateDisconnectBackground} from './disconnect-data';
import {classicModalOwnsInput, classicModalTab, deferClassicRequest, scheduleClassicTask,
  useClassicLayoutEffect, useClassicModal, useClassicNodeRef} from './classic-screen-lifecycle';
import type {DisconnectActionsProps, DisconnectMessageProps, DisconnectScreenProps,
  DisconnectControllerHandle, DisconnectLayout, DisconnectBackgroundProfile, DisconnectVariant} from './disconnect-types';

const classes = (...values: (string | undefined)[]) => values.filter(Boolean).join(' ');
const at = (box: readonly [number, number, number, number], scale: number): CSSProperties =>
  ({position: 'absolute', left: box[0] * scale, top: box[1] * scale, width: box[2] * scale, height: box[3] * scale});
function nativeModalOwnsInput(node: HTMLElement): boolean {
  const doc = node.ownerDocument;
  try {
    if (!doc.querySelector('dialog:modal')) return true;
    return !!doc.activeElement?.closest('dialog:modal')?.contains(node);
  } catch { return true; } // Older engines without :modal still use the event boundary.
}
const available = (node: HTMLElement | null) => !!node?.isConnected && !node.closest('[hidden],[inert]')
  && node.getClientRects().length > 0 && node.ownerDocument.defaultView?.getComputedStyle(node).visibility !== 'hidden'
  && nativeModalOwnsInput(node);
function inertAttributes(value: boolean | undefined): Record<string, string | boolean | undefined> {
  if (value !== undefined && typeof value !== 'boolean') throw new TypeError('Disconnect inert must be a boolean.');
  // React18 treats this not-yet-registered standard HTML attribute as an
  // unknown string attribute; React19 requires its registered boolean value.
  return {inert: value ? (Number.parseInt(reactVersion, 10) < 19 ? '' : true) : undefined};
}
function frameStyle(layout: DisconnectLayout): CSSProperties {
  return {width: layout.size[0] * layout.scale, height: layout.size[1] * layout.scale,
    fontFamily: layout.font.family, fontSize: layout.font.size * layout.scale,
    lineHeight: `${layout.font.lineHeight * layout.scale}px`, '--mc-disconnect-u': `${layout.scale}px`} as CSSProperties;
}
function text(value: string, name: string) {
  if (typeof value !== 'string') throw new TypeError(`${name} must be host-provided text.`);
  return value;
}

/** Two independent source labels: body is above title, not a generic dialog header. */
export const DisconnectMessage = forwardRef<HTMLDivElement, DisconnectMessageProps>(function DisconnectMessage(
  {layout: input, title, body, inert, className, style, ...native}, ref,
) {
  const layout = snapshotDisconnectLayout(input), autoId = useId(), id = native.id ?? autoId;
  const [, attach] = useClassicNodeRef(ref);
  text(title, 'Disconnect title'); text(body, 'Disconnect body');
  const labelStyle = (height: number, offset: number): CSSProperties => ({
    top: (layout.size[1] / 2 + offset - height / 2) * layout.scale,
    height: height * layout.scale, maxWidth: Math.max(0, layout.size[0] - 20) * layout.scale,
    textAlign: layout.textAlignment, justifyContent: layout.textVerticalAlignment === 'center' ? 'center' : 'flex-start',
  });
  return <div {...native} {...inertAttributes(inert)} id={id} ref={attach} className={classes('mc-disconnect-message', className)}
    style={{...style, ...frameStyle(layout)}} data-source-control="disconnect.title_panel">
    <p id={`${id}-body`} className="mc-disconnect-message__label" data-source-control="disconnect.disconnect_text"
      data-profanity-policy="host-provided" style={labelStyle(50, -40)}>{body}</p>
    <h2 id={`${id}-title`} className="mc-disconnect-message__label" data-source-control="disconnect.disconnect_title_text"
      style={labelStyle(40, -10)}>{title}</h2>
  </div>;
});

const skins = [
  ['idle', 'textures/ui/button_borderless_light'], ['hover', 'textures/ui/button_borderless_lighthover'],
  ['pressed', 'textures/ui/button_borderless_lightpressed'], ['locked', 'textures/ui/disabledButtonNoBorder'],
] as const;
const NativeButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(function NativeButton(props, ref) {
  const [, attach] = useClassicNodeRef(ref);
  return <button {...props} ref={attach}/>;
});

/** Realms spacers and fixed holders remain independent from each button's state. */
export const DisconnectActions = forwardRef<HTMLDivElement, DisconnectActionsProps>(function DisconnectActions(props, ref) {
  const {layout, model, disabled = false, inert, onAction, buttonProps, buttonRefs, className, style, ...native} = props;
  const plan = planDisconnectActions(layout, model), [root, attach] = useClassicNodeRef(ref);
  const current = useRef({plan, disabled, onAction});
  useClassicLayoutEffect(() => { current.current = {plan, disabled, onAction}; });
  const scale = plan.layout.scale;
  return <div {...native} {...inertAttributes(inert)} ref={attach} className={classes('mc-disconnect-actions', className)}
    style={{...style, ...plan.style, '--mc-disconnect-u': `${scale}px`} as CSSProperties}
    data-source-variant={plan.model.variant} data-hidden-slots={plan.layout.hiddenSlots}>
    {plan.buttons.map(item => {
      const attributes = buttonProps?.[item.kind] ?? {}, enabled = !disabled && item.state.enabled && item.state.visible;
      const width = item.box[2], height = item.box[3];
      return <NativeButton {...attributes} key={item.kind} ref={buttonRefs?.[item.kind]} type="button" disabled={!enabled}
        aria-hidden={!item.state.visible || undefined} data-disconnect-button={item.kind}
        className={classes('mc-disconnect-button', attributes.className)}
        style={{...attributes.style, ...at(item.box, scale), visibility: item.state.visible ? undefined : 'hidden'}}
        onKeyDown={event => { attributes.onKeyDown?.(event);
          if (!event.defaultPrevented && (event.nativeEvent.isComposing || event.keyCode === 229) && ['Enter', ' '].includes(event.key)) event.preventDefault();
        }}
        onClick={event => {
          attributes.onClick?.(event);
          if (!enabled || event.defaultPrevented || event.nativeEvent.defaultPrevented) return;
          const owner = event.currentTarget, captured = current.current;
          const valid = () => current.current === captured && !captured.disabled && !owner.disabled && available(owner) && available(root.current);
          deferClassicRequest(event, owner, snapshot => {
            if (valid()) captured.onAction?.(Object.freeze({...disconnectIntent(captured.plan.model.variant, item.kind, 'button'), event: snapshot}));
          }, valid);
        }}>
        <span aria-hidden="true" className="mc-disconnect-button__skins">
          {skins.map(([state, path]) => <ClassicSkin key={state} asset={resourcePackAssets[path]}
            width={width - 2} height={height - 2} scale={scale} baseClass="mc-disconnect-skin" className={`mc-disconnect-${state}`}/>)}
        </span>
        <span aria-hidden="true" className="mc-disconnect-button__outline"><ClassicSkin asset={resourcePackAssets['textures/ui/focus_border_white']}
          width={width} height={height} scale={scale} baseClass="mc-disconnect-skin"/></span>
        <span className="mc-disconnect-button__content"><span>{item.state.label}</span></span>
      </NativeButton>;
    })}
  </div>;
});

function Background({layout, profile, variant}: {layout: DisconnectLayout; profile: DisconnectBackgroundProfile; variant: DisconnectVariant}) {
  const source = variant === 'disconnect' ? disconnectBackgroundAssets.dirt : disconnectBackgroundAssets.portal;
  const [w, h] = layout.size, s = layout.scale, [x, y] = profile.tileOrigin;
  const quantize = profile.originRounding === 'floor' ? Math.floor : Math.trunc;
  const key = JSON.stringify([source, w, h, s, x, y, profile.originRounding]);
  return <div className="mc-disconnect-background" aria-hidden="true" data-background={variant === 'disconnect' ? 'dirt' : 'portal'}>
    <div className="mc-disconnect-background__css" style={{backgroundImage: `url(${JSON.stringify(source)})`,
      backgroundSize: `${32 * s}px ${32 * s}px`, backgroundPosition: `${quantize(x * s)}px ${quantize(y * s)}px`,
      imageRendering: profile.sampling === 'point' ? 'pixelated' : 'auto'}}/>
    {profile.renderer === 'gpu' && <GuiImageLayer key={key} width={w * s} height={h * s} guiScale={s}
      images={[{texture: source, rect: [x, y, w - x, h - y],
        tiling: {size: [32, 32], originRounding: profile.originRounding}}]}/>}</div>;
}

/** Three Classic source aliases. All actions are intents, with no service effects. */
export const DisconnectScreen = forwardRef<HTMLElement, DisconnectScreenProps>(function DisconnectScreen(props, ref) {
  const {label, title, body, layout: input, actions, contentRect, background: inputBackground, disabled = false, menuCancelEnabled = true,
    modal = false, inert, onAction, controllerRef, inputHint, buttonProps, buttonRefs, className, style, onKeyDown, ...native} = props;
  if (!text(label, 'Disconnect screen label').trim()) throw new TypeError('Disconnect screen needs an accessible label.');
  const plan = planDisconnectActions(input, actions), layout = plan.layout, background = validateDisconnectBackground(inputBackground);
  if (!Array.isArray(contentRect) || contentRect.length !== 4 || ![...contentRect].every(n => typeof n === 'number' && Number.isFinite(n))
    || contentRect[0] < 0 || contentRect[1] < 0 || contentRect[2] <= 0 || contentRect[3] <= 0
    || contentRect[0] + contentRect[2] > layout.size[0] || contentRect[1] + contentRect[3] > layout.size[1]) {
    throw new RangeError('Disconnect needs an explicit positive content rectangle inside the whole frame.');
  }
  const contentLayout = snapshotDisconnectLayout({...layout, size: [contentRect[2], contentRect[3]]});
  const contentPosition: CSSProperties = {inset:'auto',left:contentRect[0] * layout.scale,top:contentRect[1] * layout.scale};
  if (inputHint && (typeof inputHint.visible !== 'boolean' || !Array.isArray(inputHint.box) || inputHint.box.length !== 4
    || ![...inputHint.box].every(n => typeof n === 'number' && Number.isFinite(n) && Number.isFinite(n * layout.scale))
    || inputHint.box[2] <= 0 || inputHint.box[3] <= 0 || inputHint.visible && (inputHint.content === null || inputHint.content === undefined))) {
    throw new TypeError('Disconnect input hint needs explicit visibility, a finite positive resolved box and visible glyph content.');
  }
  const id = useId(), [root, attach] = useClassicNodeRef(ref);
  const active = !native.hidden && !inert;
  useClassicModal(root, root, active && modal);
  const current = useRef({plan, disabled, menuCancelEnabled, modal, onAction});
  useClassicLayoutEffect(() => { current.current = {plan, disabled, menuCancelEnabled, modal, onAction}; });
  const valid = () => active && available(root.current) && !current.current.disabled
    && (!current.current.modal || classicModalOwnsInput(root.current));
  const sendCancel = (event?: SyntheticEvent<HTMLElement>): boolean => {
    if (!valid() || !current.current.menuCancelEnabled) return false;
    const owner = root.current!, captured = current.current;
    const stillValid = () => valid() && current.current === captured && captured.menuCancelEnabled;
    const send = (snapshot?: SyntheticEvent<HTMLElement>) => {
      if (stillValid()) captured.onAction?.(Object.freeze({...disconnectIntent(captured.plan.model.variant, null, 'menu-cancel'), ...(snapshot ? {event: snapshot} : {})}));
    };
    if (event) deferClassicRequest(event, owner, send, stillValid); else scheduleClassicTask(owner, () => send());
    return true;
  };
  const handle = useRef<DisconnectControllerHandle>({request: () => false});
  useClassicLayoutEffect(() => { handle.current.request = command => command === 'button.menu_cancel' && sendCancel(); });
  const [, attachController] = useClassicNodeRef<DisconnectControllerHandle>(controllerRef);
  useClassicLayoutEffect(() => { attachController(handle.current); return () => { attachController(null); }; }, [attachController]);
  return <section {...native} {...inertAttributes(inert)} ref={attach} className={classes('mc-disconnect-screen', className)}
    role={native.role ?? (modal ? 'dialog' : 'region')} aria-label={native['aria-label'] ?? label}
    aria-describedby={native['aria-describedby'] ?? `${id}-message-body`} aria-modal={modal || undefined}
    tabIndex={native.tabIndex ?? -1} data-source-variant={plan.model.variant} data-native-certified="false"
    style={{...style, ...frameStyle(layout)}}
    onKeyDown={event => {
      onKeyDown?.(event);
      if (event.defaultPrevented || event.nativeEvent.defaultPrevented || event.nativeEvent.isComposing || event.keyCode === 229 || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as Element, owner = event.currentTarget;
      if (!owner.contains(target)) return;
      const dialog = target.closest?.('dialog,[role="dialog"],[role="alertdialog"]');
      if (dialog && dialog !== owner) return;
      if (event.key === 'Tab' && modal) classicModalTab(event, root.current, root.current);
      else if (event.key === 'Escape') sendCancel(event);
    }}>
    {!native.hidden && <Background layout={layout} profile={background} variant={plan.model.variant}/>}
    <DisconnectMessage id={`${id}-message`} layout={contentLayout} title={title} body={body} style={contentPosition}/>
    {inputHint?.visible && <div className="mc-disconnect-input-hint" data-source-control="disconnect.gamepad_helpers"
      style={at(inputHint.box, layout.scale)}>{inputHint.content}</div>}
    <DisconnectActions layout={contentLayout} model={plan.model} disabled={disabled} buttonProps={buttonProps} buttonRefs={buttonRefs} style={contentPosition}
      onAction={detail => { if (valid() && detail.variant === current.current.plan.model.variant) current.current.onAction?.(detail); }}/>
  </section>;
});
