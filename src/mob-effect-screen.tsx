import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { CSSProperties, SyntheticEvent } from 'react';
import { ClassicSkin } from './classic-skin';
import type { ClassicSkinAsset } from './classic-skin';
import { classicModalTab, deferClassicEvent, deferClassicRequest, scheduleClassicTask, useClassicLayoutEffect, useClassicModal, useClassicNodeRef } from './classic-screen-lifecycle';
import { mobEffectAssets } from './mob-effect-assets';
import { resolveMobEffectScreenLayout, snapshotMobEffectEntries, snapshotMobEffectProfiles, snapshotMobEffectRowRefs, validateMobEffectRef } from './mob-effect-layout';
import { MobEffectList } from './mob-effect-list';
import type { MobEffectCloseDetail, MobEffectControllerCommand, MobEffectControllerHandle, MobEffectScreenProps } from './mob-effect-types';

export type { MobEffectScreenProps, MobEffectCloseDetail, MobEffectControllerCommand, MobEffectControllerHandle } from './mob-effect-types';

const blocked = (node: HTMLElement) => !node.isConnected || !!node.closest('[hidden],[inert]');
const boolean = (value: boolean, name: string) => { if (typeof value !== 'boolean') throw new TypeError(`${name} must be boolean.`); };
const label = (value: string, name: string) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 4096) throw new TypeError(`${name} must be a nonempty string within 4096 units.`);
};

/** Real source collection, visible name/timer rows, material frame and close
 * routes. World/health data and navigation remain host-owned. Source geometry
 * is evaluated by an explicit Web policy, not a recovered native evaluator. */
export const MobEffectScreen = forwardRef<HTMLElement, MobEffectScreenProps>(function MobEffectScreen({
  effects, gridDimensions, availableSize, scale, sourceProfile, inputMode, closeButtonVisible, touchThumbVisible,
  textProfile, iconLayout, renderText, layoutPolicy, label: screenLabel, closeLabel, scrollLabel,
  open = true, disabled = false, modal = false, hidden = false, onCloseRequested, controllerRef, viewportRef, closeRef, rowRefs,
  className = '', style, onKeyDown, onCompositionStart, onCompositionEnd, ...native
}, forwardedRef) {
  if (native.children !== undefined || native.dangerouslySetInnerHTML !== undefined) throw new TypeError('MobEffectScreen owns its data-driven content.');
  for (const [name, value] of Object.entries({ open, disabled, modal, hidden, closeButtonVisible, touchThumbVisible })) boolean(value, `MobEffectScreen ${name}`);
  label(screenLabel, 'MobEffectScreen label'); label(closeLabel, 'MobEffectScreen closeLabel'); label(scrollLabel, 'MobEffectScreen scrollLabel');
  if (typeof onCloseRequested !== 'function') throw new TypeError('MobEffectScreen onCloseRequested is required.');
  if (renderText !== undefined && typeof renderText !== 'function') throw new TypeError('MobEffectScreen renderText must render glyphs.');
  validateMobEffectRef(forwardedRef, 'MobEffectScreen ref'); validateMobEffectRef(closeRef, 'MobEffectScreen closeRef');
  validateMobEffectRef(viewportRef, 'MobEffectScreen viewportRef'); validateMobEffectRef(controllerRef, 'MobEffectScreen controllerRef');
  const entries = snapshotMobEffectEntries(effects, gridDimensions), profiles = snapshotMobEffectProfiles(textProfile, iconLayout), refs = snapshotMobEffectRowRefs(rowRefs);
  const layout = resolveMobEffectScreenLayout({ availableSize, gridDimensions, effectCount: entries.length, scale, sourceProfile, inputMode, layoutPolicy });
  const [root, attach] = useClassicNodeRef(forwardedRef), [close, attachClose] = useClassicNodeRef(closeRef);
  const [, attachController] = useClassicNodeRef<MobEffectControllerHandle>(controllerRef);
  const composing = useRef(false), active = open && !hidden;
  const state = { active, disabled, closeButtonVisible, onCloseRequested };
  const committed = useRef(state);
  // Speculative renders must not replace callbacks/permissions for an old
  // committed root. A synchronous host update during propagation commits here.
  useClassicLayoutEffect(() => { committed.current = state; });
  useClassicModal(root, root, modal && active);
  const activeRoot = () => !!root.current && !blocked(root.current) && committed.current.active;
  const inputEnabled = () => activeRoot() && !committed.current.disabled;

  const queueClose = (origin: 'close-button' | 'escape' | 'host-controller' | 'host-player-hurt',
    event?: SyntheticEvent<HTMLElement>, fromButtonId?: Extract<MobEffectCloseDetail, { reason: 'continue' }>['fromButtonId'], needsClose = false): boolean => {
    const hurt = origin === 'host-player-hurt', boundary = root.current, control = needsClose ? close.current : boundary;
    const valid = () => !!boundary && root.current === boundary && !!control && boundary.contains(control) && !blocked(control)
      && (hurt ? activeRoot() : inputEnabled())
      && (!needsClose || close.current === control && committed.current.closeButtonVisible && !(control as HTMLButtonElement).disabled);
    if (!control || !valid()) return false;
    const deliver = (accepted?: SyntheticEvent<HTMLElement>) => {
      if (!valid()) return;
      const detail: MobEffectCloseDetail = hurt
        ? { reason: 'player-hurt', sourceProperty: 'close_on_player_hurt', origin: 'host-player-hurt', control }
        : { reason: 'continue', target: 'button.menu_continue', origin, control, fromButtonId, ...(accepted ? { event: accepted } : {}) };
      committed.current.onCloseRequested(detail);
    };
    if (event) deferClassicRequest(event, event.currentTarget, deliver, valid);
    else scheduleClassicTask(control, () => deliver());
    return true;
  };
  const request = (command: MobEffectControllerCommand): boolean => {
    if (!command || typeof command !== 'object' || !inputEnabled()) return false;
    // Copy the public command's primitive fields before the owner task; do not
    // read a caller-mutated object again after native propagation.
    const from = command.fromButtonId, destination = command.destination;
    if (destination === 'screen' && (from === 'button.menu_cancel' || from === 'button.mobeffects'))
      return queueClose('host-controller', undefined, from);
    if (destination === 'close-button' && (from === 'button.menu_select' || from === 'button.menu_ok'))
      return queueClose('host-controller', undefined, from, true);
    return false;
  };
  useImperativeHandle(attachController, () => ({ request, notifyPlayerHurt: () => queueClose('host-player-hurt') }), []);
  const box = (rect: readonly [number, number, number, number]): CSSProperties => ({ position: 'absolute', left: rect[0] * scale,
    top: rect[1] * scale, width: rect[2] * scale, height: rect[3] * scale });
  const skin = (asset: ClassicSkinAsset, width: number, height: number) =>
    <ClassicSkin asset={asset} width={width} height={height} scale={scale} baseClass="mc-mob-effect-skin" errorName="Mob Effect" />;
  return <section {...native} ref={attach} hidden={!active} tabIndex={native.tabIndex ?? -1}
    role={modal && active ? 'dialog' : native.role} aria-modal={modal && active || undefined} aria-disabled={disabled || undefined}
    aria-label={native['aria-label'] ?? (!native['aria-labelledby'] ? screenLabel : undefined)}
    className={`mc-mob-effect-screen ${className}`} data-source-control="mob_effect.mob_effect_screen"
    data-source-profile={sourceProfile} data-input-mode={inputMode} data-native-certified="false" data-layout-policy={layoutPolicy}
    data-mob-effect-layout={JSON.stringify(layout.trace)} data-source-close-on-player-hurt="true"
    style={{ ...style, position: 'relative', isolation: 'isolate', boxSizing: 'border-box', width: layout.availableSize[0] * scale,
      height: layout.availableSize[1] * scale, margin: 0, padding: 0, border: 0, overflow: 'clip', flex: 'none', '--mc-mob-effect-unit': `${scale}px` } as CSSProperties}
    onCompositionStart={event => { onCompositionStart?.(event); composing.current = true; }}
    onCompositionEnd={event => { onCompositionEnd?.(event); composing.current = false; }}
    onKeyDown={event => {
      onKeyDown?.(event);
      if (event.defaultPrevented || event.nativeEvent.defaultPrevented || composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Tab' && modal) { deferClassicEvent(event, event.currentTarget, accepted => classicModalTab(accepted, root.current, root.current), activeRoot); return; }
      if (event.key === 'Escape' && !event.repeat && !event.shiftKey) queueClose('escape', event, 'button.menu_cancel');
    }}>
    <div className="mc-mob-effect-screen__backdrop" aria-hidden="true" data-source-alpha="0.4" style={{ position: 'absolute', inset: 0, opacity: .4 }}>
      {skin(mobEffectAssets.screenBackground, layout.availableSize[0], layout.availableSize[1])}
    </div>
    <div className="mc-mob-effect-screen__main" aria-hidden="true" style={box(layout.mainBackground)}>{skin(mobEffectAssets.mainBackground, layout.mainBackground[2], layout.mainBackground[3])}</div>
    <div className="mc-mob-effect-screen__tab" aria-hidden="true" style={box(layout.buttonBackground)}>{skin(mobEffectAssets.buttonBackground, 25, 25)}</div>
    <div className="mc-mob-effect-screen__list" style={box(layout.listPanel)}><MobEffectList
      effects={entries} gridDimensions={layout.list.gridDimensions} size={[layout.listPanel[2], layout.listPanel[3]]} scale={scale} inputMode={inputMode}
      touchThumbVisible={touchThumbVisible} textProfile={profiles.textProfile} iconLayout={profiles.iconLayout} layoutPolicy={layoutPolicy}
      label={scrollLabel} viewportRef={viewportRef} rowRefs={refs} renderText={renderText} /></div>
    <button ref={attachClose} type="button" className="mc-mob-effect-screen__close" aria-label={closeLabel} hidden={!closeButtonVisible}
      disabled={disabled} tabIndex={-1} data-source-control="common.legacy_pocket_close_button" data-source-focus-enabled="false"
      data-web-focus-policy="global-escape-and-viewport-tab-focus" data-source-action="button.menu_continue" style={box(layout.closeButton)}
      onClick={event => { queueClose('close-button', event, undefined, true); }}>
      <span className="mc-mob-effect-screen__close-default" aria-hidden="true">{skin(mobEffectAssets.closeDefault, 18, 18)}</span>
      <span className="mc-mob-effect-screen__close-pressed" aria-hidden="true">{skin(mobEffectAssets.closePressed, 18, 18)}</span>
    </button>
  </section>;
});
