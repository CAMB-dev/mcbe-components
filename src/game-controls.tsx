import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { Button } from './components';
import { Text } from './text';

const cx = (...values: (string | false | undefined)[]) => values.filter(Boolean).join(' ');
const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;
const dimension = (value: number, fallback: number) => Math.max(1, finite(value, fallback));
export interface GamePlayer {
  id: string;
  name: string;
  avatar?: ReactNode;
  avatarSrc?: string;
  online?: boolean;
  disabled?: boolean;
  local?: boolean;
  platformIcon?: ReactNode;
}
export interface PlayerListProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title' | 'onSelect'> {
  players: readonly GamePlayer[];
  title?: ReactNode;
  selectedId?: string;
  defaultSelectedId?: string;
  onSelect?: (id: string) => void;
  onInvite?: () => void;
  inviteLabel?: string;
  inviteDisabled?: boolean;
  onlineLabel?: string;
  offlineLabel?: string;
  label?: string;
}
/** Pause player rows. Selection is host state; no invented persistent selected skin. */
export const PlayerList = forwardRef<HTMLDivElement, PlayerListProps>(function PlayerList({
  players, title = 'Players', selectedId, defaultSelectedId, onSelect, onInvite, inviteLabel = 'Invite to Game',
  inviteDisabled = false, onlineLabel = 'Online', offlineLabel = 'Offline', label = 'Players', className, onKeyDown, ...props
}, ref) {
  const [internal, setInternal] = useState(defaultSelectedId ?? ''), current = selectedId ?? internal;
  const [focused, setFocused] = useState(current), buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = players.map((player, index) => player.disabled ? -1 : index).filter(index => index >= 0);
  const focusedIndex = players.findIndex(player => player.id === focused), selectedIndex = players.findIndex(player => player.id === current);
  const tab = enabled.includes(focusedIndex) ? focusedIndex : enabled.includes(selectedIndex) ? selectedIndex : enabled[0];
  return <div {...props} ref={ref} role={props.role ?? 'region'} aria-label={props['aria-label'] ?? label} className={cx('mc-player-list', className)} data-fidelity="source-layout">
    <Text className="mc-player-list__title" shadow={false}>{title}</Text>
    <div className="mc-player-list__players" role="toolbar" aria-label={label} aria-orientation="vertical" onKeyDown={event => {
      onKeyDown?.(event); if (event.defaultPrevented || !enabled.length) return;
      const index = enabled.findIndex(index => buttons.current[index] === event.target); if (index < 0) return;
      const next = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1) : event.key === 'ArrowDown' ? enabled[(index + 1) % enabled.length] : event.key === 'ArrowUp' ? enabled[(index + enabled.length - 1) % enabled.length] : undefined;
      if (next !== undefined) { event.preventDefault(); buttons.current[next]?.focus(); }
    }}>
      {players.map((player, index) => <div className="mc-player-list__row" key={player.id} data-player-id={player.id} data-selected={player.id === current || undefined}>
        <Button ref={node => { buttons.current[index] = node; }} className="mc-player-list__player" disabled={player.disabled}
          tabIndex={tab === index ? 0 : -1} aria-current={player.id === current ? 'true' : undefined}
          aria-label={[player.name, player.online === undefined ? '' : player.online ? onlineLabel : offlineLabel].filter(Boolean).join(' ')}
          onFocus={() => setFocused(player.id)} onClick={() => { if (selectedId === undefined) setInternal(player.id); onSelect?.(player.id); }}>
          <span className="mc-player-list__content">
            <span className="mc-player-list__portrait-panel"><span className="mc-player-list__avatar">
              {player.avatarSrc?.trim() ? <img src={player.avatarSrc} alt="" draggable={false}/> : player.avatar}
              {(player.avatarSrc?.trim() || player.avatar) && <span className="mc-player-list__avatar-border"/>}
              {player.local && !player.avatarSrc?.trim() && !player.avatar && <span className="mc-player-list__local"/>}
            </span></span>
            <span className="mc-player-list__identity"><span className="mc-player-list__name">{player.name}</span>
              {player.online !== undefined && <>{' '}<span className="mc-player-list__status" data-source="host-extension">{player.online ? onlineLabel : offlineLabel}</span></>}
            </span>
            {player.platformIcon && <span className="mc-player-list__platform" aria-hidden="true">{player.platformIcon}</span>}
          </span>
        </Button>
      </div>)}
    </div>
    {onInvite && <Button className="mc-player-list__invite" disabled={inviteDisabled} onClick={onInvite}>{inviteLabel}</Button>}
  </div>;
});

export type TouchAction = 'jump' | 'attack' | 'interact' | 'sneak' | 'sprint' | 'ascend' | 'descend';
export interface TouchMovement { x: number; y: number }
export interface TouchControlsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  variant?: 'joystick';
  actions?: readonly TouchAction[];
  onAction?: (action: TouchAction, pressed: boolean) => void;
  /** Normalized unit-circle movement; x positive right, y negative forward. */
  onMove?: (movement: TouchMovement) => void;
  disabled?: boolean;
  opacity?: number;
  label?: string;
  labels?: Partial<Record<TouchAction | 'move', string>>;
}
const defaultActions: readonly TouchAction[] = ['jump', 'attack', 'sneak'];
const actionNames: Record<TouchAction, string> = { jump: 'Jump', attack: 'Attack', interact: 'Interact', sneak: 'Sneak', sprint: 'Sprint', ascend: 'Fly up', descend: 'Fly down' };
/** Real touch PNGs and an explicitly reconstructed Web joystick interaction profile. */
export const TouchControls = forwardRef<HTMLDivElement, TouchControlsProps>(function TouchControls({
  variant = 'joystick', actions = defaultActions, onAction, onMove, disabled = false, opacity = 1, label = 'Touch controls', labels,
  className, style, ...props
}, ref) {
  const held = useRef(new Map<string, TouchAction>()), joystickPointer = useRef<number | undefined>(undefined), arrows = useRef(new Set<string>());
  const vector = useRef<TouchMovement>({ x: 0, y: 0 }), callbacks = useRef({ onAction, onMove }); callbacks.current = { onAction, onMove };
  const [pressed, setPressed] = useState<readonly TouchAction[]>([]), [movement, setMovement] = useState<TouchMovement>({ x: 0, y: 0 });
  const hint = useId(), visible = [...new Set(actions.filter(action => Object.hasOwn(actionNames, action)))], actionsKey = visible.join('|');
  function hold(action: TouchAction, source: string, active: boolean) {
    if (disabled && active) return;
    const owner = held.current.get(source);
    if (!active && owner !== action) return;
    if (active && owner && owner !== action) hold(owner, source, false);
    const before = [...held.current.values()].includes(action);
    if (active) held.current.set(source, action); else held.current.delete(source);
    const next = [...new Set(held.current.values())], after = next.includes(action); setPressed(next);
    if (before !== after) callbacks.current.onAction?.(action, after);
  }
  function move(x: number, y: number) {
    x = finite(x); y = finite(y); const length = Math.hypot(x, y); if (length > 1) { x /= length; y /= length; }
    if (vector.current.x === x && vector.current.y === y) return;
    vector.current = { x, y }; setMovement({ x, y }); callbacks.current.onMove?.({ x, y });
  }
  function reset(updateState: boolean) {
    const active = [...new Set(held.current.values())], moving = vector.current.x !== 0 || vector.current.y !== 0;
    held.current.clear(); joystickPointer.current = undefined; arrows.current.clear(); vector.current = { x: 0, y: 0 };
    if (updateState) { setPressed([]); setMovement({ x: 0, y: 0 }); }
    active.forEach(action => callbacks.current.onAction?.(action, false)); if (moving) callbacks.current.onMove?.({ x: 0, y: 0 });
  }
  useEffect(() => { if (disabled) reset(true); }, [disabled]);
  useEffect(() => {
    for (const [source, action] of held.current) if (!visible.includes(action)) hold(action, source, false);
  }, [actionsKey]);
  useEffect(() => () => reset(false), []);
  const capture = (node: HTMLElement, pointer: number) => { try { node.setPointerCapture(pointer); } catch { /* A synthetic pointer has no browser capture. Its paired up/cancel still releases. */ } };
  const release = (node: HTMLElement, pointer: number) => { if (node.hasPointerCapture(pointer)) node.releasePointerCapture(pointer); };
  const sample = (node: HTMLElement, x: number, y: number) => { const rect = node.getBoundingClientRect(); move((x - rect.left - rect.width / 2) / 32, (y - rect.top - rect.height / 2) / 32); };
  return <div {...props} ref={ref} role={props.role ?? 'group'} aria-label={props['aria-label'] ?? label} data-variant={variant} data-fidelity="renderer-reconstruction"
    className={cx('mc-touch-controls', className)} style={{ opacity: Math.min(1, Math.max(0, finite(opacity))), ...style }}>
    <button type="button" className="mc-touch-controls__joystick" disabled={disabled} aria-label={labels?.move ?? 'Move'} aria-describedby={hint}
      onPointerDown={event => { if (disabled || joystickPointer.current !== undefined || event.button !== 0) return; event.preventDefault(); arrows.current.clear(); joystickPointer.current = event.pointerId; capture(event.currentTarget, event.pointerId); event.currentTarget.focus({ preventScroll: true }); sample(event.currentTarget, event.clientX, event.clientY); }}
      onPointerMove={event => { if (joystickPointer.current === event.pointerId) { event.preventDefault(); sample(event.currentTarget, event.clientX, event.clientY); } }}
      onPointerUp={event => { if (joystickPointer.current === event.pointerId) { joystickPointer.current = undefined; move(0, 0); release(event.currentTarget, event.pointerId); } }}
      onPointerCancel={event => { if (joystickPointer.current === event.pointerId) { joystickPointer.current = undefined; move(0, 0); } }}
      onLostPointerCapture={event => { if (joystickPointer.current === event.pointerId) { joystickPointer.current = undefined; move(0, 0); } }}
      onKeyDown={event => { if (disabled || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || joystickPointer.current !== undefined) return; event.preventDefault(); arrows.current.add(event.key); move(Number(arrows.current.has('ArrowRight')) - Number(arrows.current.has('ArrowLeft')), Number(arrows.current.has('ArrowDown')) - Number(arrows.current.has('ArrowUp'))); }}
      onKeyUp={event => { if (!arrows.current.delete(event.key)) return; event.preventDefault(); move(Number(arrows.current.has('ArrowRight')) - Number(arrows.current.has('ArrowLeft')), Number(arrows.current.has('ArrowDown')) - Number(arrows.current.has('ArrowUp'))); }}
      onBlur={() => { arrows.current.clear(); if (joystickPointer.current === undefined) move(0, 0); }}>
      <span className="mc-touch-controls__knob" style={{ transform: `translate(calc(-50% + ${movement.x * 32}px), calc(-50% + ${movement.y * 32}px))` }} aria-hidden="true"/>
    </button>
    <span id={hint} className="mc-game-controls-sr">Use the arrow keys to move. Release the keys or pointer to stop.</span>
    <div className="mc-touch-controls__actions">{visible.map(action => <button key={action} type="button" disabled={disabled} className="mc-touch-controls__action"
      data-action={action} aria-label={labels?.[action] ?? actionNames[action]} aria-pressed={pressed.includes(action)}
      style={{ backgroundImage: `var(--mc-game-texture-${action}${disabled && action === 'sprint' ? '-disabled' : pressed.includes(action) ? '-pressed' : ''})` }}
      onPointerDown={event => { if (disabled || event.button !== 0) return; event.preventDefault(); capture(event.currentTarget, event.pointerId); hold(action, `p:${event.pointerId}`, true); }}
      onPointerUp={event => { hold(action, `p:${event.pointerId}`, false); release(event.currentTarget, event.pointerId); }}
      onPointerCancel={event => hold(action, `p:${event.pointerId}`, false)} onLostPointerCapture={event => hold(action, `p:${event.pointerId}`, false)}
      onKeyDown={event => { if ((event.key === ' ' || event.key === 'Enter') && !event.nativeEvent.isComposing) { event.preventDefault(); hold(action, `k:${action}:${event.code || event.key}`, true); } }}
      onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); hold(action, `k:${action}:${event.code || event.key}`, false); } }}
      onBlur={() => { for (const [source, active] of held.current) if (active === action && source.startsWith('k:')) hold(action, source, false); }}
      onClick={event => { if (event.detail === 0 && !disabled && !pressed.includes(action)) { hold(action, `assistive:${action}`, true); hold(action, `assistive:${action}`, false); } }}/>)}</div>
  </div>;
});

export type PauseMenuAction = 'resume' | 'settings' | 'store' | 'feedback' | 'quit' | 'dressing-room' | 'profile' | 'achievements' | 'how-to-play' | 'screenshot';
export interface PauseMenuProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  actions?: readonly PauseMenuAction[];
  disabledActions?: readonly PauseMenuAction[];
  footerActions?: readonly PauseMenuAction[];
  skinActions?: readonly PauseMenuAction[];
  onAction?: (action: PauseMenuAction) => void;
  labels?: Partial<Record<PauseMenuAction, string>>;
  logo?: ReactNode;
  logoSrc?: string;
  skinRenderer?: ReactNode;
  playerName?: string;
  players?: readonly GamePlayer[];
  onPlayerSelect?: (id: string) => void;
  onInvite?: () => void;
  inviteDisabled?: boolean;
  width?: number;
  height?: number;
  disabled?: boolean;
  label?: string;
  autoFocus?: boolean;
}
const pauseNames: Record<PauseMenuAction, string> = { resume: 'Resume Game', settings: 'Settings', store: 'Marketplace', feedback: 'Feedback', quit: 'Save & Quit', 'dressing-room': 'Dressing Room', profile: 'Profile', achievements: 'Achievements', 'how-to-play': 'How to Play', screenshot: 'Take Screenshot' };
const pauseDefault: readonly PauseMenuAction[] = ['resume', 'settings', 'store', 'quit'];
const footerDefault: readonly PauseMenuAction[] = ['achievements', 'how-to-play', 'screenshot'];
const skinDefault: readonly PauseMenuAction[] = ['dressing-room'];
export const PauseMenu = forwardRef<HTMLDivElement, PauseMenuProps>(function PauseMenu({
  actions = pauseDefault, disabledActions = [], footerActions = footerDefault, skinActions = skinDefault, onAction, labels, logo, logoSrc, skinRenderer, playerName, players, onPlayerSelect, onInvite, inviteDisabled,
  width = 960, height = 540, disabled = false, label = 'Pause menu', autoFocus = false, className, style, onKeyDown, ...props
}, ref) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]), visible = [...new Set(actions.filter(action => Object.hasOwn(pauseNames, action)))];
  useEffect(() => { if (autoFocus) buttons.current.find(button => button && !button.disabled)?.focus(); }, [autoFocus]);
  return <div {...props} ref={ref} role={props.role ?? 'region'} aria-label={props['aria-label'] ?? label} data-fidelity="source-layout-reconstruction"
    className={cx('mc-pause-menu', className)} style={{ width: dimension(width, 960), height: dimension(height, 540), ...style }}
    onKeyDown={event => {
      onKeyDown?.(event); if (event.defaultPrevented || disabled) return;
      if (event.key === 'Escape' && !disabledActions.includes('resume')) { event.preventDefault(); event.stopPropagation(); onAction?.('resume'); }
      const enabled = buttons.current.filter((button): button is HTMLButtonElement => !!button && !button.disabled), current = enabled.indexOf(event.target as HTMLButtonElement);
      if (current < 0) return;
      const next = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1) : event.key === 'ArrowDown' ? enabled[(current + 1) % enabled.length] : event.key === 'ArrowUp' ? enabled[(current + enabled.length - 1) % enabled.length] : undefined;
      if (next) { event.preventDefault(); next.focus(); }
    }}>
    <div className="mc-pause-menu__main"><div className="mc-pause-menu__left"><span className="mc-pause-menu__backdrop" aria-hidden="true"/>
      <div className="mc-pause-menu__body"><div className="mc-pause-menu__menu"><div className="mc-pause-menu__buttons">
        <div className="mc-pause-menu__logo">{logoSrc?.trim() ? <img src={logoSrc} alt="" draggable={false}/> : logo}</div>
        <div className="mc-pause-menu__actions">{visible.map((action, index) => <Button key={action} ref={node => { buttons.current[index] = node; }} data-action={action} disabled={disabled || disabledActions.includes(action)} onClick={() => onAction?.(action)}>{labels?.[action] ?? pauseNames[action]}</Button>)}</div>
        {footerActions.length > 0 && <div className="mc-pause-menu__footer">{[...new Set(footerActions.filter(action => Object.hasOwn(pauseNames, action)))].map(action => <span className="mc-pause-menu__footer-item" key={action}><Button data-action={action} className="mc-pause-menu__footer-button" aria-label={labels?.[action] ?? pauseNames[action]} disabled={disabled || disabledActions.includes(action)} onClick={() => onAction?.(action)}>
          {['achievements', 'how-to-play', 'screenshot'].includes(action) ? <span className="mc-pause-menu__footer-icon" data-icon={action} aria-hidden="true"/> : labels?.[action] ?? pauseNames[action]}
        </Button></span>)}</div>}
      </div></div></div>
    </div></div>
    <div className="mc-pause-menu__skin"><div className="mc-pause-menu__skin-viewer" data-renderer={skinRenderer ? 'host-provided' : 'missing'}>{skinRenderer}</div>
      {playerName && <Text className="mc-pause-menu__player-name" data-source="host-text-reconstruction">{playerName}</Text>}
      {skinActions.length > 0 && <div className="mc-pause-menu__skin-actions">{[...new Set(skinActions.filter(action => Object.hasOwn(pauseNames, action)))].map(action => <Button key={action} data-action={action} disabled={disabled || disabledActions.includes(action)} onClick={() => onAction?.(action)}>{labels?.[action] ?? pauseNames[action]}</Button>)}</div>}
    </div>
    {players && <aside className="mc-pause-menu__sidebar"><PlayerList players={disabled ? players.map(player => ({ ...player, disabled: true })) : players} onSelect={onPlayerSelect} onInvite={onInvite} inviteDisabled={disabled || inviteDisabled}/></aside>}
  </div>;
});

export interface DeathScreenProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
  /** Current installed HTML UI, or the older resource-pack Classic JSON layout. */
  variant?: 'native' | 'classic';
  /** Native HTML UI scale: one local rem equals 5 * guiScale CSS pixels. */
  guiScale?: number;
  title?: ReactNode;
  deathMessage?: ReactNode;
  /** Optional host extension: this Classic death_screen.json has no score label. */
  score?: number | string;
  scoreLabel?: string;
  state?: 'ready' | 'loading';
  loadingText?: ReactNode;
  /** Optional licensed native spinner/image. The installed HTML UI GIF is not redistributed. */
  loadingIndicator?: ReactNode;
  respawnEnabled?: boolean;
  respawnVisible?: boolean;
  quitEnabled?: boolean;
  quitVisible?: boolean;
  onRespawn?: () => void;
  onQuit?: () => void;
  respawnLabel?: string;
  quitLabel?: string;
  width?: number;
  height?: number;
  label?: string;
}
/** Source-derived screen. The host owns respawn, routing, world content and fonts. */
export const DeathScreen = forwardRef<HTMLDivElement, DeathScreenProps>(function DeathScreen({
  variant = 'native', guiScale = 2, title = 'You died!', deathMessage, score, scoreLabel = 'Score', state = 'ready', loadingText = 'Respawning', loadingIndicator, respawnEnabled = true, respawnVisible = true,
  quitEnabled = true, quitVisible = true, onRespawn, onQuit, respawnLabel = 'Respawn', quitLabel, width = 960, height = 540, label = 'Death screen', className, style, ...props
}, ref) {
  const quitText = quitLabel ?? (variant === 'native' ? 'Game menu' : 'Main menu');
  const scoreContent = score !== undefined && <span className="mc-death-screen__score" data-source="host-extension">{scoreLabel}: {typeof score === 'number' ? finite(score) : score}</span>;
  if (variant === 'native') return <div {...props} ref={ref} role={props.role ?? 'region'} aria-label={props['aria-label'] ?? label} data-state={state} data-variant="native" data-fidelity="hbui-source-profile"
    className={cx('mc-death-screen', 'mc-death-screen--native', className)} style={{ '--mc-death-rem': `${Math.max(.5, finite(guiScale, 2)) * 5}px`, width: dimension(width, 960), height: dimension(height, 540), ...style } as CSSProperties}
    onKeyDown={event => { props.onKeyDown?.(event); if (!event.defaultPrevented && event.key === 'Escape' && state === 'ready' && quitEnabled && quitVisible) { event.preventDefault(); event.stopPropagation(); onQuit?.(); } }}>
    <span className="mc-death-screen__gradient" aria-hidden="true"/>
    {state === 'loading' ? <div className="mc-death-screen__loading" role="status">{loadingIndicator && <><span className="mc-death-screen__loading-indicator" aria-hidden="true">{loadingIndicator}</span><span className="mc-death-screen__button-spacer"/></>}<span>{loadingText}</span></div> : <div className="mc-death-screen__main">
      <div className="mc-death-screen__space-above"/>
      <div className="mc-death-screen__message"><div className="mc-death-screen__title">{title}</div><div className="mc-death-screen__reason">{deathMessage}</div>{scoreContent}</div>
      <div className="mc-death-screen__space-between"/>
      <div className="mc-death-screen__native-actions">
        {respawnVisible && <button type="button" className="mc-death-screen__native-button mc-death-screen__respawn" disabled={!respawnEnabled} onClick={onRespawn}><span className="mc-death-screen__button-face"><span className="mc-death-screen__button-label">{respawnLabel}</span></span></button>}
        {respawnVisible && quitVisible && <div className="mc-death-screen__button-spacer"/>}
        {quitVisible && <button type="button" className="mc-death-screen__native-button mc-death-screen__quit" disabled={!quitEnabled} onClick={onQuit}><span className="mc-death-screen__button-face"><span className="mc-death-screen__button-label">{quitText}</span></span></button>}
        <div className="mc-death-screen__actions-spacer"/>
      </div><div className="mc-death-screen__space-below"/>
    </div>}
  </div>;
  return <div {...props} ref={ref} role={props.role ?? 'region'} aria-label={props['aria-label'] ?? label} data-state={state} data-variant="classic" data-fidelity="source-layout-reconstruction"
    className={cx('mc-death-screen', className)} style={{ width: dimension(width, 960), height: dimension(height, 540), ...style }}>
    <span className="mc-death-screen__gradient" aria-hidden="true" data-fidelity="renderer-reconstruction"/>
    {state === 'loading' ? <Text className="mc-death-screen__loading" role="status">{loadingText}</Text> : <>
      <div className="mc-death-screen__labels"><div className="mc-death-screen__labels-fill"/><div className="mc-death-screen__title-panel"><Text className="mc-death-screen__title" size="lg">{title}</Text></div>
        <div className="mc-death-screen__reason-panel"><Text className="mc-death-screen__reason">{deathMessage}</Text>
          {score !== undefined && <Text className="mc-death-screen__score" data-source="host-extension">{scoreLabel}: {typeof score === 'number' ? finite(score) : score}</Text>}
        </div>
      </div>
      <div className="mc-death-screen__buttons">
        {respawnVisible && <Button className="mc-death-screen__respawn" disabled={!respawnEnabled} onClick={onRespawn}>{respawnLabel}</Button>}
        {quitVisible && <Button className="mc-death-screen__quit" disabled={!quitEnabled} onClick={onQuit}>{quitText}</Button>}
      </div>
    </>}
  </div>;
});
