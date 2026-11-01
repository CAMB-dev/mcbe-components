import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, Ref, SyntheticEvent } from 'react';
import { CreditsRoll } from './credits-roll';
import { CreditsSkipButton } from './credits-skip-button';
import { Image } from './image';
import { createCreditsClock, stepCreditsClock } from './credits-clock';
import type { CreditsClockState } from './credits-clock';
import { CREDITS_COVER_MS, CREDITS_SKIP_WAIT_MS, copyCreditsSnapshot, copyCreditsSurface, creditsFinite, creditsSurfaceFrame } from './credits-screen-model';
import { classicModalTab, deferClassicEvent, deferClassicRequest, scheduleClassicTask, useClassicLayoutEffect, useClassicModal, useClassicNodeRef } from './classic-screen-lifecycle';
import type { CreditsLayout } from './credits-types';
import type { CreditsActionDetail, CreditsControllerCommand, CreditsLifecycleDetail, CreditsScreenProps, CreditsScreenSnapshot } from './credits-screen-types';

export type * from './credits-screen-types';

interface Timeline { offset: number; elapsedMs: number }
interface LocalFactory { revealedAt: number | null; generation: number; outroAt: number | null }
const blocked = (node: HTMLElement) => !node.isConnected || !!node.closest('[hidden],[inert]');
const flag = (value: boolean, name: string) => { if (typeof value !== 'boolean') throw new TypeError(`${name} must be boolean.`); };

function CreditsSession(props: CreditsScreenProps & { forwardedRef: Ref<HTMLElement> }) {
  const { forwardedRef, runKey, content, profile, bindings, scale, skipLabel, disabled = false, open = true,
    controllerRef, viewportRef, skipRef, bitmapRenderer, onRenderError, onAction, onLifecycle, onCloseRequested,
    hidden = false, className = '', style, onKeyDown, onCompositionStart, onCompositionEnd, ...rest } = props;
  if (typeof runKey !== 'string' || runKey.length === 0) throw new TypeError('Credits runKey must be a non-empty string.');
  if (typeof onCloseRequested !== 'function') throw new TypeError('Credits onCloseRequested is required.');
  for (const [name, value] of Object.entries({ disabled, open, hidden, scrollFaster: bindings.scrollFaster })) flag(value, name);
  if (!Number.isSafeInteger(scale) || scale <= 0) throw new RangeError('Credits scale must be a positive safe integer.');
  if (profile.completion !== 'web-scroll-end-then-fade') throw new RangeError('Explicit Web Credits completion policy is required.');
  const surface = copyCreditsSurface(profile.surface), input = { ...profile.input };
  if (!['reveal-then-exit', 'reveal-only', 'none'].includes(input.escape) || !['reveal-skip', 'none'].includes(input.enter)
    || !['ignore', 'accept'].includes(input.repeat) || !['host', 'web-modal'].includes(input.focus)) throw new RangeError('Invalid Credits input policy.');
  const active = open && !hidden, controlled = props.mode === 'controlled-source';
  const policy = { logicalUnitsPerSecond: profile.logicalUnitsPerSecond, fasterMultiplier: profile.fasterMultiplier,
    hiddenPolicy: props.mode === 'controlled-source' ? 'pause' as const : props.playback.hiddenPolicy };
  const playing = props.mode === 'controlled-source' ? false : props.playback.playing;
  const initialOffset = props.mode === 'controlled-source' ? props.position.offset : props.playback.initialOffset;
  // Validate the same pure clock contract even during SSR, without acquiring a timer.
  createCreditsClock(initialOffset, policy, { atMs: 0, playing, faster: bindings.scrollFaster, visible: true });
  const [timeline, setTimeline] = useState<Timeline>(() => ({ offset: initialOffset, elapsedMs: 0 }));
  const [factory, setFactory] = useState<LocalFactory>({ revealedAt: null, generation: 0, outroAt: null });
  const [layout, setLayout] = useState<null | { value: CreditsLayout; content: typeof content; profile: typeof profile.layout;
    plan: typeof profile.plan; showEndPoem: boolean; showEduIcon: boolean; playerName: string }>(null);
  const validLayout = layout && layout.content === content && layout.profile === profile.layout && layout.plan === profile.plan
    && layout.showEndPoem === bindings.showEndPoem && layout.showEduIcon === bindings.showEduIcon && layout.playerName === bindings.playerName ? layout.value : null;
  const clock = useRef<CreditsClockState | null>(null), time = useRef(timeline), composing = useRef(false);
  const sourceEvents = useRef(new Set<string>()), closePending = useRef(false);
  const [root, attach] = useClassicNodeRef(forwardedRef), [skip, attachSkip] = useClassicNodeRef(skipRef);
  const position = props.mode === 'controlled-source' ? { offset: creditsFinite(props.position.offset, 'Credits controlled offset'),
    elapsedMs: creditsFinite(props.position.elapsedMs, 'Credits controlled time', 0) } : timeline;
  const snapshot: CreditsScreenSnapshot = props.mode === 'controlled-source' ? copyCreditsSnapshot(props.snapshot) : {
    introAgeMs: position.elapsedMs, backgroundElapsedMs: position.elapsedMs, skipButtonVisible: true,
    factory: { skipPanel: factory.revealedAt === null ? null : { instanceId: `${runKey}:panel`, exitInputActive: true,
      button: position.elapsedMs - factory.revealedAt >= CREDITS_SKIP_WAIT_MS ? null : { generation: `${factory.generation}`, ageMs: Math.max(0, position.elapsedMs - factory.revealedAt) } },
    fadeOut: factory.outroAt === null ? null : { instanceId: `${runKey}:outro`, ageMs: Math.max(0, position.elapsedMs - factory.outroAt) } },
  };
  const frame = creditsSurfaceFrame(surface, snapshot), [width, height] = profile.layout.viewport.size;
  for (const value of [width * scale, height * scale, ...surface.background.logicalSize.map(value => value * scale),
    ...surface.background.tileSize.map(value => value * scale), ...frame.backgroundOffset.map(value => value * scale)]) creditsFinite(value, 'Credits scaled surface geometry');
  if (width <= 0 || height <= 0 || width * scale > 8192 || height * scale > 8192 || width * height * scale * scale > 4194304)
    throw new RangeError('Credits surface exceeds the finite viewport budget.');
  const current = useRef({ active, disabled, controlled, playing, policy, faster: bindings.scrollFaster, snapshot, position, factory, input, validLayout, onAction, onCloseRequested, onLifecycle });
  current.current = { active, disabled, controlled, playing, policy, faster: bindings.scrollFaster, snapshot, position, factory, input, validLayout, onAction, onCloseRequested, onLifecycle };
  const rootActive = () => !!root.current && !blocked(root.current) && current.current.active && !current.current.disabled;
  useClassicModal(root, root, active && input.focus === 'web-modal');

  const sample = () => {
    const node = root.current, now = current.current;
    if (!node) return;
    const view = node.ownerDocument.defaultView; if (!view) return;
    const observation = { atMs: view.performance.now(), playing: !now.controlled && now.playing && now.active && !blocked(node),
      faster: now.faster, visible: node.ownerDocument.visibilityState !== 'hidden' };
    const previous = clock.current;
    if (now.controlled && !previous) return;
    const next = previous ? stepCreditsClock(previous, observation, now.policy) : createCreditsClock(time.current.offset, now.policy, observation);
    let elapsedMs = time.current.elapsedMs;
    if (previous?.sample.playing && (previous.sample.visible || previous.policy.hiddenPolicy === 'continue'))
      elapsedMs = creditsFinite(elapsedMs + observation.atMs - previous.sample.atMs, 'Credits elapsed presentation time', 0);
    // Close the old playback interval once, then release its epoch. Returning
    // from controlled mode begins at the saved playback position with no debt.
    clock.current = now.controlled ? null : next;
    if (next.offset !== time.current.offset || elapsedMs !== time.current.elapsedMs) {
      const value = { offset: next.offset, elapsedMs }; time.current = value; setTimeline(value);
    }
  };
  // Each control/visibility boundary samples the preceding interval first.
  useClassicLayoutEffect(() => { sample(); }, [active, controlled, playing, bindings.scrollFaster, policy.logicalUnitsPerSecond, policy.fasterMultiplier, policy.hiddenPolicy]);
  useEffect(() => {
    const node = root.current, view = node?.ownerDocument.defaultView;
    if (!node || !view || controlled) return;
    let live = true, request = 0;
    const tick = () => { if (!live) return; sample(); request = view.requestAnimationFrame(tick); };
    const visibility = () => sample();
    node.ownerDocument.addEventListener('visibilitychange', visibility);
    request = view.requestAnimationFrame(tick);
    return () => { live = false; view.cancelAnimationFrame(request); node.ownerDocument.removeEventListener('visibilitychange', visibility); };
  }, [controlled, root]);

  const emit = (key: string, detail: CreditsLifecycleDetail, eligible: () => boolean = () => true) => {
    if (!root.current || blocked(root.current) || !current.current.active || !eligible() || sourceEvents.current.has(key)) return false;
    sourceEvents.current.add(key); current.current.onLifecycle?.(detail); return true;
  };
  useEffect(() => {
    if (!active) return;
    if (validLayout && position.offset >= validLayout.completionOffset && emit('scroll_end', { runKey, kind: 'scroll_end', offset: position.offset, completionOffset: validLayout.completionOffset })) {
      if (!current.current.controlled && root.current?.isConnected && current.current.active && current.current.validLayout === validLayout)
        setFactory(value => value.outroAt === null ? { ...value, outroAt: position.elapsedMs } : value);
    }
    const panel = snapshot.factory.skipPanel, child = panel?.button, fade = snapshot.factory.fadeOut;
    if (panel && child && child.ageMs >= CREDITS_SKIP_WAIT_MS) emit(JSON.stringify(['destroy', panel.instanceId, child.generation]),
      { runKey, kind: 'destroy-skip-child', panelInstanceId: panel.instanceId, buttonGeneration: child.generation }, () => {
        const live = current.current.snapshot.factory.skipPanel;
        return live?.instanceId === panel.instanceId && live.button?.generation === child.generation && live.button.ageMs >= CREDITS_SKIP_WAIT_MS;
      });
    // Ordinary mode removes only the child; the panel remains available for Escape.
    if (!controlled && factory.revealedAt !== null && position.elapsedMs - factory.revealedAt >= CREDITS_SKIP_WAIT_MS)
      emit(JSON.stringify(['destroy', `${runKey}:panel`, `${factory.generation}`]), { runKey, kind: 'destroy-skip-child', panelInstanceId: `${runKey}:panel`, buttonGeneration: `${factory.generation}` },
        () => !current.current.controlled && current.current.factory.revealedAt === factory.revealedAt && current.current.factory.generation === factory.generation);
    if (fade && fade.ageMs >= CREDITS_COVER_MS) emit(JSON.stringify(['end', fade.instanceId]), { runKey, kind: 'credits_end', fadeOutInstanceId: fade.instanceId },
      () => current.current.snapshot.factory.fadeOut?.instanceId === fade.instanceId && current.current.snapshot.factory.fadeOut.ageMs >= CREDITS_COVER_MS);
  }, [active, controlled, validLayout, position.offset, position.elapsedMs, snapshot.factory.skipPanel?.instanceId,
    snapshot.factory.skipPanel?.button?.generation, snapshot.factory.skipPanel?.button?.ageMs, snapshot.factory.fadeOut?.instanceId, snapshot.factory.fadeOut?.ageMs]);

  const dispatch = (target: CreditsActionDetail['target'], origin: CreditsActionDetail['origin'], control: HTMLElement, event?: SyntheticEvent<HTMLElement>, panelId?: string | null, generation?: string | null, requestStillValid: () => boolean = () => true) => {
    const eligible = () => {
      if (!rootActive() || !root.current?.contains(control) || blocked(control)) return false;
      const nowPanel = current.current.snapshot.factory.skipPanel;
      if (panelId !== undefined && panelId !== (nowPanel?.instanceId ?? null)) return false;
      if (generation !== undefined) return !!nowPanel?.button && generation === nowPanel.button.generation
        && nowPanel.button.ageMs < CREDITS_SKIP_WAIT_MS && current.current.snapshot.skipButtonVisible && skip.current === control && !skip.current.disabled;
      return panelId === undefined || !!nowPanel?.exitInputActive;
    };
    if (!eligible() || !requestStillValid()) return;
    const now = current.current, panel = now.snapshot.factory.skipPanel;
    if (panelId !== undefined && panelId !== (panel?.instanceId ?? null)) return;
    if (generation !== undefined && generation !== (panel?.button?.generation ?? null)) return;
    if (target === 'button.menu_exit' && closePending.current) return;
    const detail: CreditsActionDetail = { runKey, target, origin, control, event, panelInstanceId: panel?.instanceId ?? null, buttonGeneration: panel?.button?.generation ?? null };
    if (now.onAction?.(detail) === false || event?.defaultPrevented || event?.nativeEvent.defaultPrevented || !eligible() || !requestStillValid()
      || now.controlled !== current.current.controlled) return;
    if (target === 'button.show_skip') {
      if (!now.controlled) {
        sample();
        setFactory(value => ({ ...value, revealedAt: time.current.elapsedMs, generation: value.generation + 1 }));
      }
    } else {
      closePending.current = true;
      try { current.current.onCloseRequested(detail); }
      finally { closePending.current = false; }
    }
  };
  const route = (command: CreditsControllerCommand, origin: CreditsActionDetail['origin'], event?: SyntheticEvent<HTMLElement>) => {
    if (!rootActive() || !command || !['button.menu_select', 'button.menu_ok', 'button.menu_cancel'].includes(command.fromButtonId)) return false;
    const panel = current.current.snapshot.factory.skipPanel, child = panel?.button;
    let target: CreditsActionDetail['target'], control: HTMLElement | null = root.current;
    if (command.destination === 'whole-screen') target = 'button.show_skip';
    else if (command.destination === 'skip-panel-input' && command.fromButtonId === 'button.menu_cancel' && panel?.exitInputActive) target = 'button.menu_exit';
    else if (command.destination === 'skip-button' && command.fromButtonId !== 'button.menu_cancel' && panel && child && child.ageMs < CREDITS_SKIP_WAIT_MS
      && current.current.snapshot.skipButtonVisible && skip.current && !skip.current.disabled) { target = 'button.menu_exit'; control = skip.current; }
    else return false;
    if (!control) return false;
    const owner = control, panelId = command.destination === 'whole-screen' ? undefined : panel?.instanceId ?? null;
    const generation = command.destination === 'skip-button' ? child?.generation ?? null : undefined;
    const modeAtRequest = current.current.controlled;
    const destination = command.destination;
    const keyboardKey = event && 'key' in event ? event.key : undefined;
    const keyboardAllowed = () => {
      if (origin !== 'keyboard') return true;
      const now = current.current;
      if (keyboardKey === 'Enter') return now.input.enter === 'reveal-skip' && destination === 'whole-screen';
      if (keyboardKey !== 'Escape' || now.input.escape === 'none') return false;
      return destination === (now.input.escape === 'reveal-then-exit' && now.snapshot.factory.skipPanel?.exitInputActive ? 'skip-panel-input' : 'whole-screen');
    };
    const valid = () => rootActive() && !!root.current?.contains(owner) && !blocked(owner)
      && keyboardAllowed()
      && current.current.controlled === modeAtRequest
      && (panelId === undefined || current.current.snapshot.factory.skipPanel?.instanceId === panelId)
      && (generation === undefined || current.current.snapshot.factory.skipPanel?.button?.generation === generation)
      && (generation !== undefined || panelId === undefined || !!current.current.snapshot.factory.skipPanel?.exitInputActive);
    if (event) deferClassicRequest(event, event.currentTarget, snapshotEvent => { if (valid()) dispatch(target, origin, owner, snapshotEvent, panelId, generation, valid); }, valid);
    else scheduleClassicTask(owner, () => { if (valid()) dispatch(target, origin, owner, undefined, panelId, generation, valid); });
    return true;
  };
  const controller = useRef(route); controller.current = route;
  useImperativeHandle(controllerRef, () => ({ request: command => controller.current(command, 'host-controller') }), []);
  const panel = snapshot.factory.skipPanel, child = panel?.button;
  const skipVisible = !!panel && !!child && child.ageMs < CREDITS_SKIP_WAIT_MS && snapshot.skipButtonVisible;
  const physical = (value: number) => profile.rasterPositioning === 'physical-floor' ? Math.floor(value * scale) : value * scale;
  const backgroundStyle: CSSProperties = { position: 'absolute', left: physical(frame.backgroundOffset[0]), top: physical(frame.backgroundOffset[1]),
    width: surface.background.logicalSize[0] * scale, height: surface.background.logicalSize[1] * scale,
    backgroundImage: `url(${JSON.stringify(surface.background.image.src)})`, backgroundRepeat: 'repeat',
    backgroundSize: `${surface.background.tileSize[0] * scale}px ${surface.background.tileSize[1] * scale}px`,
    imageRendering: profile.imageSampling === 'point' ? 'pixelated' : 'auto' };
  // Remove mode-specific controls from the native DOM attribute bag.
  const { mode: _mode, playback: _playback, position: _position, snapshot: _snapshot, ...native } = rest as typeof rest & {
    mode?: unknown; playback?: unknown; position?: unknown; snapshot?: unknown };
  const cover = (name: string, opacity: number) => <div className={`mc-credits-screen__cover mc-credits-screen__cover--${name}`} aria-hidden="true"
    data-cover={name} data-cover-opacity={opacity} style={{ opacity, zIndex: surface.coverPlacement === 'above-content' ? 3 : 1 }} />;
  return <section {...native} ref={attach} hidden={!active} tabIndex={native.tabIndex ?? -1} role={input.focus === 'web-modal' && active ? 'dialog' : native.role}
    aria-modal={input.focus === 'web-modal' && active || undefined} aria-label={native['aria-label'] ?? (!native['aria-labelledby'] ? 'Credits' : undefined)}
    className={`mc-credits-screen ${className}`} data-run-key={runKey} data-profile-evidence={profile.evidenceId} data-native-certified="false"
    style={{ ...style, position: 'relative', isolation: 'isolate', boxSizing: 'border-box', margin: 0, border: 0, padding: 0,
      width: width * scale, height: height * scale, flex: 'none', overflow: 'hidden' }}
    onCompositionStart={event => { onCompositionStart?.(event); composing.current = true; }}
    onCompositionEnd={event => { onCompositionEnd?.(event); composing.current = false; }}
    onKeyDown={event => {
      onKeyDown?.(event);
      if (event.defaultPrevented || event.nativeEvent.defaultPrevented || composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Tab' && input.focus === 'web-modal') { deferClassicEvent(event, event.currentTarget, snapshotEvent => classicModalTab(snapshotEvent, root.current, root.current), rootActive); return; }
      if (event.repeat && input.repeat === 'ignore' || event.shiftKey) return;
      if (event.key === 'Escape' && input.escape !== 'none') route({ fromButtonId: 'button.menu_cancel',
        destination: input.escape === 'reveal-then-exit' && panel?.exitInputActive ? 'skip-panel-input' : 'whole-screen' }, 'keyboard', event);
      else if (event.key === 'Enter' && input.enter === 'reveal-skip' && event.target === event.currentTarget)
        route({ fromButtonId: 'button.menu_ok', destination: 'whole-screen' }, 'keyboard', event);
    }}>
    <div className="mc-credits-screen__background" aria-hidden="true" style={backgroundStyle} data-source-texture={surface.background.image.provenance} />
    {cover('intro', frame.introOpacity)}
    <CreditsRoll className="mc-credits-screen__roll" style={{ zIndex: 2 }} content={content} profile={profile.layout} plan={profile.plan} bindings={bindings}
      offset={position.offset} elapsedMs={position.elapsedMs} scale={scale} rasterPositioning={profile.rasterPositioning} imageSampling={profile.imageSampling}
      bitmapRenderer={bitmapRenderer} viewportRef={viewportRef} role="group" onRenderError={onRenderError}
      onLayout={value => setLayout({ value, content, profile: profile.layout, plan: profile.plan,
        showEndPoem: bindings.showEndPoem, showEduIcon: bindings.showEduIcon, playerName: bindings.playerName })} />
    {surface.edgeMask.kind === 'whole-image' && <Image className="mc-credits-screen__mask" src={surface.edgeMask.image.src} sourceSize={surface.edgeMask.image.naturalSize}
      size={[width, height]} scale={scale} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }} />}
    {frame.outroOpacity !== null && cover('outro', frame.outroOpacity)}
    {child && <CreditsSkipButton ref={attachSkip} label={skipLabel} labelStyle={profile.skipLabelStyle} scale={scale} bitmapRenderer={bitmapRenderer}
      onRenderError={error => onRenderError?.(error, { lineIndex: -1, runIndex: -1 })}
      visible={skipVisible} disabled={disabled} requestKey={JSON.stringify([runKey, panel?.instanceId, child.generation])}
      isActive={button => rootActive() && !!root.current?.contains(button) && !!current.current.snapshot.factory.skipPanel?.button
        && current.current.snapshot.skipButtonVisible && current.current.snapshot.factory.skipPanel.button.ageMs < CREDITS_SKIP_WAIT_MS}
      style={{ position: 'absolute', right: 8 * scale, bottom: 8 * scale, zIndex: 4 }}
      onAction={detail => dispatch('button.menu_exit', 'skip-button', detail.event.currentTarget, detail.event, panel?.instanceId, child.generation)} />}
  </section>;
}

/** Concrete finite Web Credits composition. A new key remounts its clocks and
 * source-event leases; advanced mode consumes host snapshots without mutation. */
export const CreditsScreen = forwardRef<HTMLElement, CreditsScreenProps>(function CreditsScreen(props, ref) {
  return <CreditsSession key={props.runKey} {...props} forwardedRef={ref} />;
});
