import { forwardRef, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ChangeEvent, CSSProperties, HTMLAttributes, InputHTMLAttributes, KeyboardEvent, ReactNode, Ref, SyntheticEvent } from 'react';
import { ScrollArea } from './scroll-area';
import type { ScrollPosition } from './scroll-area';
import { createPortal } from 'react-dom';
import { Button } from './components';

/** Source branch names, not engine enum numbers or permission bit masks. */
export type PermissionLevel = 'visitor' | 'member' | 'operator' | 'custom';
export interface PermissionLevelLabels {
  label: string; visitor: string; member: string; operator: string; custom: string;
  visitorDescription: string; memberDescription: string; operatorDescription: string;
}
export interface PermissionLevelSelectProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'dangerouslySetInnerHTML' | 'value' | 'defaultValue' | 'onChange'> {
  value?: PermissionLevel | null;
  defaultValue?: PermissionLevel | null;
  onValueChange?: (value: PermissionLevel, event: SyntheticEvent) => void;
  labels?: Partial<PermissionLevelLabels>;
  worldSettings?: boolean;
  inRealm?: boolean;
  readOnly?: boolean;
  /** Independent source dropdown face bindings, not permission logic. */
  selectedLabel?: ReactNode;
  selectedIcon?: ReactNode;
  scale?: number;
}
export interface PermissionToggleRowProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'children' | 'dangerouslySetInnerHTML' | 'type' | 'size' | 'checked' | 'defaultChecked' | 'onChange'> {
  label: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
  stateLabel?: ReactNode;
  onLabel?: ReactNode;
  offLabel?: ReactNode;
  scale?: number;
}
export interface PermissionPlayer {
  readonly id: string;
  readonly name: string;
  readonly avatarSrc?: string;
  readonly avatarVisible?: boolean;
  readonly localIconVisible?: boolean;
  readonly levelIcon?: ReactNode;
  readonly disabled?: boolean;
}
export interface PermissionPlayerRowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'dangerouslySetInnerHTML'> {
  player: PermissionPlayer;
  selected?: boolean;
  inactive?: boolean;
  scale?: number;
}
export interface PlayerPermissionOption {
  readonly id: string;
  readonly label: ReactNode;
  readonly stateLabel?: ReactNode;
  readonly onLabel?: ReactNode;
  readonly offLabel?: ReactNode;
  readonly disabled?: boolean;
}
export interface PlayerPermissionState {
  readonly level: PermissionLevel | null;
  readonly permissions: Readonly<Record<string, boolean>>;
}
export type PlayerPermissionsValue = Readonly<Record<string, PlayerPermissionState>>;
export interface PlayerPermissionsChangeDetail {
  playerId: string;
  reason: 'level' | 'permission';
  permissionId?: string;
  event: SyntheticEvent;
}
export interface PlayerPermissionsLabels {
  title: string; back: string; world: string; kick: string; ban: string; players: string; permissions: string;
}
export interface PlayerPermissionsProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'dangerouslySetInnerHTML' | 'title' | 'defaultValue' | 'onChange'> {
  players: readonly PermissionPlayer[];
  permissionOptions: readonly PlayerPermissionOption[];
  label: string;
  selectedPlayerId?: string | null;
  defaultSelectedPlayerId?: string | null;
  onSelectedPlayerIdChange?: (id: string, event: SyntheticEvent) => void;
  value?: PlayerPermissionsValue;
  defaultValue?: PlayerPermissionsValue;
  onValueChange?: (value: PlayerPermissionsValue, detail: PlayerPermissionsChangeDetail) => void;
  onBack?: (event: SyntheticEvent) => void;
  onKickRequest?: (player: Readonly<PermissionPlayer>, event: SyntheticEvent) => void;
  onBanRequest?: (player: Readonly<PermissionPlayer>, event: SyntheticEvent) => void;
  labels?: Partial<PlayerPermissionsLabels>;
  levelLabels?: Partial<PermissionLevelLabels>;
  levelLabel?: ReactNode;
  levelIcon?: ReactNode;
  worldText?: ReactNode;
  ipText?: ReactNode;
  educationEdition?: boolean;
  worldSettings?: boolean;
  inRealm?: boolean;
  canEditPermissions?: boolean;
  templateLocked?: boolean;
  templateWarning?: ReactNode;
  optionsVisible?: boolean;
  kickVisible?: boolean;
  kickEnabled?: boolean;
  banVisible?: boolean;
  banEnabled?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  /** Independent source fade bindings; omitted values follow DOM pane focus. */
  selectorFocused?: boolean;
  contentFocused?: boolean;
  gamepad?: boolean;
  gamepadBackGlyph?: ReactNode;
  gamepadBackText?: ReactNode;
  emptyContent?: ReactNode;
  playersViewportRef?: Ref<HTMLDivElement>;
  permissionsViewportRef?: Ref<HTMLDivElement>;
  playerRefs?: Readonly<Record<string, Ref<HTMLButtonElement> | undefined>>;
  permissionRefs?: Readonly<Record<string, Ref<HTMLInputElement> | undefined>>;
  levelRef?: Ref<HTMLButtonElement>;
  onScrollPositionChange?: (pane: 'players' | 'permissions', position: ScrollPosition) => void;
  size?: readonly [number, number];
  scale?: number;
}

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const levels = ['visitor', 'member', 'operator', 'custom'] as const;
const levelLabels: PermissionLevelLabels = {
  label: 'Permission Level', visitor: 'Visitor', member: 'Member', operator: 'Operator', custom: 'Custom...',
  visitorDescription: 'Visitors can freely explore your world, but cannot interact with blocks, items, or entities. Trust Players Off.',
  memberDescription: 'Members are active players in your world who can break and create blocks, and attack mobs and other players.',
  operatorDescription: 'Operators are members who can set player permissions and use commands to have more control over your world.',
};
const pageLabels: PlayerPermissionsLabels = { title: 'Player Permissions', back: 'Back', world: 'Current World', kick: 'Kick Player', ban: 'Ban Player', players: 'Players', permissions: 'Permissions' };
const iconNames: Record<PermissionLevel, string> = { visitor: 'permissions_visitor_hand', member: 'permissions_member_star', operator: 'permissions_op_crown', custom: 'permissions_custom_dots' };
const url = (name: string) => new URL(`./assets/player-permissions/${name}.png`, import.meta.url).href;
const image = (name: string) => `url(${JSON.stringify(url(name))})`;
const images = {
  '--mc-permissions-topbar': image('StoreTopBar'), '--mc-permissions-background': image('screen_background'), '--mc-permissions-banner': image('Banners'),
  '--mc-permissions-white': image('permissions_player_fade_overlay'), '--mc-permissions-focus': image('focus_border_white'), '--mc-permissions-chevron': image('chevron_left'),
  '--mc-permissions-dark': image('button_borderless_dark'), '--mc-permissions-dark-checked': image('button_borderless_darkpressednohover'),
  '--mc-permissions-dark-hover': image('button_borderless_darkhover'), '--mc-permissions-dark-checked-hover': image('button_borderless_darkpressed'),
  '--mc-permissions-off': image('toggle_off'), '--mc-permissions-on': image('toggle_on'), '--mc-permissions-off-hover': image('toggle_off_hover'), '--mc-permissions-on-hover': image('toggle_on_hover'),
  '--mc-permissions-light': image('button_borderless_light'), '--mc-permissions-light-hover': image('button_borderless_lighthover'), '--mc-permissions-light-pressed': image('button_borderless_lightpressed'),
  '--mc-permissions-disabled': image('disabledButtonNoBorder'), '--mc-permissions-dropdown': image('dropdown_background'), '--mc-permissions-dropdown-arrow': image('dropdown_chevron'),
  '--mc-permissions-info': image('text_label_box'), '--mc-permissions-avatar-border': image('square_image_border_white'), '--mc-permissions-lan': image('lan_icon'),
};
function checkScale(scale: number) { if (!Number.isSafeInteger(scale) || scale < 1) throw new RangeError('Permission scale must be a positive safe integer.'); }
function assignRef<T>(ref: Ref<T> | undefined, node: T | null) { if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }
function checkLevel(level: unknown) { if (level !== null && !levels.includes(level as PermissionLevel)) throw new RangeError('Permission level must be visitor, member, operator, custom or null.'); }
function labelsWithDefaults<T extends object>(defaults: T, overrides: Partial<T> | undefined): T {
  const result = { ...defaults, ...Object.fromEntries(Object.entries(overrides ?? {}).filter(([, v]) => v !== undefined)) };
  if (Object.values(result).some(v => typeof v !== 'string')) throw new RangeError('Permission labels must be strings.'); return result;
}
function visualStyle(scale: number, style?: CSSProperties): CSSProperties { return { ...images, '--mc-permissions-unit': `${scale}px`, ...style } as CSSProperties; }
function keyBlocked(event: KeyboardEvent) { return event.defaultPrevented || event.nativeEvent.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey; }
function checkId(id: unknown) { if (typeof id !== 'string' || !id) throw new RangeError('Player and permission IDs must be nonempty strings.'); }
function copyValue(value: PlayerPermissionsValue): PlayerPermissionsValue { return Object.fromEntries(Object.entries(value).map(([id, v]) => [id, { level: v.level, permissions: { ...v.permissions } }])); }
function validateValue(value: PlayerPermissionsValue) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RangeError('Player permission value must be a keyed record.');
  for (const [id, entry] of Object.entries(value)) {
    checkId(id); if (!entry || !entry.permissions || typeof entry.permissions !== 'object' || Array.isArray(entry.permissions)) throw new RangeError('Player permission state requires a level and boolean permission record.');
    checkLevel(entry.level); for (const [key, checked] of Object.entries(entry.permissions)) { checkId(key); if (typeof checked !== 'boolean') throw new RangeError('Permission values must be booleans.'); }
  }
}

/** A source-sized native checkbox. It does not grant permissions or synthesize
 * preset masks. The visible state label is an independent host binding. */
export const PermissionToggleRow = forwardRef<HTMLInputElement, PermissionToggleRowProps>(function PermissionToggleRow({
  label, checked, defaultChecked = false, onCheckedChange, stateLabel, onLabel = 'ON', offLabel = 'OFF', scale = 2,
  readOnly = false, disabled = false, className, style, id: givenId, onClick, onKeyDown, ...props
}, ref) {
  checkScale(scale); if (checked !== undefined && typeof checked !== 'boolean' || typeof defaultChecked !== 'boolean') throw new RangeError('Permission checkbox values must be booleans.');
  const generated = useId(), id = givenId ?? `mc-permission-${generated}`, [inside, setInside] = useState(defaultChecked), accepted = checked === undefined ? inside : checked;
  return <div className={['mc-permission-toggle-row', className].filter(Boolean).join(' ')} style={visualStyle(scale, style)}>
    <label className="mc-permission-toggle-row__label" htmlFor={id}>{label}</label>
    <span className="mc-permission-toggle-row__state" aria-hidden="true">{stateLabel === undefined ? accepted ? onLabel : offLabel : stateLabel}</span>
    <span className="mc-permission-toggle-row__control">
      <input {...props} ref={ref} id={id} type="checkbox" checked={accepted} disabled={disabled} readOnly={readOnly} aria-readonly={readOnly || undefined}
        className="mc-permission-toggle-row__input" onClick={event => { onClick?.(event); if (readOnly) event.preventDefault(); }}
        onKeyDown={event => { onKeyDown?.(event); if (readOnly && event.key === ' ') event.preventDefault(); }}
        onChange={event => { if (event.defaultPrevented || event.nativeEvent.defaultPrevented || disabled || readOnly) return; const next = event.currentTarget.checked; if (checked === undefined) setInside(next); onCheckedChange?.(next, event); }}/>
      <span className="mc-permission-toggle-row__skin" aria-hidden="true"/>
    </span>
  </div>;
});

/** Source player collection item: pitch27 with a28-high dark toggle. Avatar,
 * local status and permission icon are separate host-supplied bindings. */
export const PermissionPlayerRow = forwardRef<HTMLButtonElement, PermissionPlayerRowProps>(function PermissionPlayerRow({
  player, selected = false, inactive = false, scale = 2, disabled, className, style, ...props
}, ref) {
  checkScale(scale); checkId(player?.id); if (typeof player.name !== 'string') throw new RangeError('Player name must be a string.');
  return <div className={['mc-permission-player-row', className].filter(Boolean).join(' ')} style={visualStyle(scale, style)}>
    <button {...props} ref={ref} type="button" className="mc-permission-player-row__button" disabled={disabled || player.disabled}
      aria-pressed={props.role ? undefined : selected} data-selected={selected} data-player-id={player.id}>
      <span className="mc-permission-player-row__skin" aria-hidden="true"/><span className="mc-permission-player-row__border" aria-hidden="true"/>
      <span className="mc-permission-player-row__content">
        <span className="mc-permission-player-row__picture">
          {(player.avatarVisible ?? player.avatarSrc !== undefined) && <span className="mc-permission-player-row__avatar"><img src={player.avatarSrc} alt="" draggable={false}/></span>}
          {player.localIconVisible && <span className="mc-permission-player-row__local" aria-hidden="true"/>}
        </span>
        <span className="mc-permission-player-row__name">{player.name}</span>
        <span className="mc-permission-player-row__level-icon" aria-hidden="true">{player.levelIcon}</span>
      </span>
    </button>
    <span className="mc-permission-player-row__fade" aria-hidden="true" hidden={!inactive}/>
  </div>;
});

/** Finite four-role source dropdown, including the world-settings rich radio
 * branch. It changes a UI draft only; roles never rewrite permission booleans. */
export const PermissionLevelSelect = forwardRef<HTMLButtonElement, PermissionLevelSelectProps>(function PermissionLevelSelect({
  value, defaultValue = null, onValueChange, labels: givenLabels, worldSettings = false, inRealm = false, readOnly = false,
  selectedLabel, selectedIcon, scale = 2, disabled = false, className, style, id: givenId, onClick, onKeyDown, onBlur, ...props
}, ref) {
  checkScale(scale); checkLevel(defaultValue); if (value !== undefined) checkLevel(value);
  const labels = labelsWithDefaults(levelLabels, givenLabels), [inside, setInside] = useState<PermissionLevel | null>(defaultValue), accepted = value === undefined ? inside : value;
  const options = levels.filter(level => level !== 'custom' || !worldSettings && !inRealm), signature = JSON.stringify(labels);
  const generated = useId(), id = givenId ?? `mc-permission-level-${generated}`, trigger = useRef<HTMLButtonElement | null>(null), wrapper = useRef<HTMLDivElement | null>(null), popup = useRef<HTMLDivElement | null>(null);
  const attach = useCallback((node: HTMLButtonElement | null) => { trigger.current = node; assignRef(ref, node); }, [ref]);
  const [open, setOpen] = useState(false), [active, setActive] = useState(0), [host, setHost] = useState<HTMLElement | null>(null);
  const activeIndex = Math.min(active, options.length - 1);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, ready: false });
  useEffect(() => { setHost(trigger.current?.ownerDocument.body ?? null); }, []);
  useEffect(() => { if (disabled || readOnly) setOpen(false); }, [disabled, readOnly]);
  useClientLayoutEffect(() => {
    if (!open) return; const button = trigger.current, doc = button?.ownerDocument, view = doc?.defaultView; if (!button || !doc || !view) return;
    const place = () => { const rect = button.getBoundingClientRect(), height = popup.current?.getBoundingClientRect().height ?? 0;
      const top = rect.bottom + height > view.innerHeight && rect.top >= height ? rect.top - height : rect.bottom;
      const next = { left: rect.left, top, width: rect.width, ready: true }; setPosition(old => Object.keys(next).every(key => old[key as keyof typeof old] === next[key as keyof typeof next]) ? old : next); };
    const outside = (event: PointerEvent) => { if (!event.defaultPrevented && !wrapper.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) setOpen(false); };
    place(); const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(place); observer?.observe(button); if (popup.current) observer?.observe(popup.current);
    view.addEventListener('resize', place); doc.addEventListener('scroll', place, true); doc.addEventListener('pointerdown', outside);
    return () => { observer?.disconnect(); view.removeEventListener('resize', place); doc.removeEventListener('scroll', place, true); doc.removeEventListener('pointerdown', outside); };
  }, [open, host, worldSettings, inRealm, scale, signature]);
  const show = () => { if (disabled || readOnly) return; const index = options.findIndex(level => level === accepted); setActive(index < 0 ? 0 : index); if (!open) setPosition(old => ({ ...old, ready: false })); setOpen(true); };
  const commit = (level: PermissionLevel, event: SyntheticEvent) => {
    if (event.defaultPrevented || disabled || readOnly || !options.includes(level)) return;
    if (accepted !== level) { if (value === undefined) setInside(level); onValueChange?.(level, event); } setOpen(false); trigger.current?.focus({ preventScroll: true });
  };
  const list = <div ref={popup} id={`${id}-listbox`} role="listbox" aria-labelledby={`${id}-label`} hidden={!open}
    className={['mc-permission-level-select__popup', worldSettings && 'mc-permission-level-select__popup--descriptions'].filter(Boolean).join(' ')}
    style={{ ...visualStyle(scale), position: 'fixed', left: position.left, top: position.top, width: position.width, visibility: position.ready ? 'visible' : 'hidden' }}>
    <div className="mc-permission-level-select__options">{options.map((level, index) => <div key={level} id={`${id}-option-${level}`} role="option" aria-selected={accepted === level}
      className="mc-permission-level-select__option" data-level={level} data-active={activeIndex === index || undefined}
      onPointerMove={() => setActive(index)} onPointerDown={event => event.preventDefault()} onClick={event => commit(level, event)}>
      <span className="mc-permission-level-select__option-title"><img className="mc-permission-level-select__option-icon" src={url(iconNames[level] + (activeIndex === index ? '_hover' : ''))} alt=""/>
        <span>{labels[level]}</span></span>
      {worldSettings && level !== 'custom' && <span className="mc-permission-level-select__description">{labels[`${level}Description`]}</span>}
    </div>)}</div>
  </div>;
  return <div ref={wrapper} className={['mc-permission-level-select', className].filter(Boolean).join(' ')} style={visualStyle(scale, style)}>
    <label id={`${id}-label`} className="mc-permission-level-select__label" htmlFor={id}>{labels.label}</label>
    <button {...props} ref={attach} id={id} type="button" role="combobox" aria-labelledby={props['aria-labelledby'] ?? (props['aria-label'] ? undefined : `${id}-label`)}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-listbox`} aria-activedescendant={open ? `${id}-option-${options[Math.min(active, options.length - 1)]}` : undefined}
      aria-readonly={readOnly || undefined} disabled={disabled} className="mc-permission-level-select__trigger"
      onClick={event => { onClick?.(event); if (!event.defaultPrevented) { if (open) setOpen(false); else show(); } }}
      onBlur={event => { onBlur?.(event); if (!wrapper.current?.contains(event.relatedTarget as Node) && !popup.current?.contains(event.relatedTarget as Node)) setOpen(false); }}
      onKeyDown={event => {
        onKeyDown?.(event); if (keyBlocked(event) || disabled || readOnly) return;
        if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); return; }
        if (event.key === 'Tab') { setOpen(false); return; }
        if (event.key === 'Enter' || event.key === ' ') { if (!event.repeat) { if (open) commit(options[activeIndex]!, event); else show(); } event.preventDefault(); return; }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { if (!open) show(); else setActive(event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : Math.max(0, Math.min(options.length - 1, activeIndex + (event.key === 'ArrowDown' ? 1 : -1)))); event.preventDefault(); }
      }}>
      <span className="mc-permission-level-select__trigger-skin" aria-hidden="true"/><span className="mc-permission-level-select__trigger-border" aria-hidden="true"/>
      <span className="mc-permission-level-select__face"><span className="mc-permission-level-select__icon" aria-hidden="true">{selectedIcon === undefined ? accepted && <img src={url(iconNames[accepted])} alt=""/> : selectedIcon}</span>
        <span className="mc-permission-level-select__value">{selectedLabel === undefined ? accepted === null ? '' : labels[accepted] : selectedLabel}</span><span className="mc-permission-level-select__arrow" aria-hidden="true"/></span>
    </button>
    {host ? createPortal(list, host) : list}
  </div>;
});

/** Classic JSON permissions screen only. It is not the current OreUI layout,
 * and requests never grant permissions, enable cheats, kick or ban a player. */
export const PlayerPermissions = forwardRef<HTMLElement, PlayerPermissionsProps>(function PlayerPermissions({
  players, permissionOptions, label, selectedPlayerId, defaultSelectedPlayerId, onSelectedPlayerIdChange, value, defaultValue = {}, onValueChange,
  onBack, onKickRequest, onBanRequest, labels: givenLabels, levelLabels: givenLevelLabels, levelLabel, levelIcon,
  worldText, ipText, educationEdition = false, worldSettings = false, inRealm = false, canEditPermissions = true,
  templateLocked = false, templateWarning, optionsVisible = true, kickVisible = false, kickEnabled = true, banVisible = false, banEnabled = true,
  readOnly = false, disabled = false, selectorFocused, contentFocused, gamepad = false, gamepadBackGlyph, gamepadBackText, emptyContent,
  playersViewportRef, permissionsViewportRef, playerRefs, permissionRefs, levelRef, onScrollPositionChange,
  size = [400, 300], scale = 2, className, style, onKeyDown, onClick, onFocusCapture, onBlurCapture, ...props
}, ref) {
  checkScale(scale); validateValue(defaultValue); if (value !== undefined) validateValue(value);
  if (!Array.isArray(players as unknown) || !Array.isArray(permissionOptions as unknown)) throw new RangeError('Players and permission options must be arrays.');
  if (typeof label !== 'string' || !label.trim() || !Array.isArray(size) || size.length !== 2 || !size.every(n => Number.isFinite(n) && n > 0 && Number.isFinite(n * scale))) throw new RangeError('Player Permissions requires a label and positive finite size.');
  const playerIds = new Set<string>(), optionIds = new Set<string>();
  for (const player of players) { checkId(player?.id); if (playerIds.has(player.id) || typeof player.name !== 'string') throw new RangeError('Players require unique IDs and string names.'); playerIds.add(player.id); }
  for (const option of permissionOptions) { checkId(option?.id); if (optionIds.has(option.id)) throw new RangeError('Permission options require unique IDs.'); optionIds.add(option.id); }
  for (const id of [selectedPlayerId, defaultSelectedPlayerId]) if (id !== undefined && id !== null) checkId(id);
  const labels = labelsWithDefaults(pageLabels, givenLabels), enabledPlayers = players.filter(player => !player.disabled);
  const [insidePlayer, setInsidePlayer] = useState<string | null>(() => defaultSelectedPlayerId === undefined ? enabledPlayers[0]?.id ?? null : defaultSelectedPlayerId);
  const acceptedId = selectedPlayerId === undefined ? insidePlayer : selectedPlayerId, selected = players.find(player => player.id === acceptedId) ?? null;
  const [insideValue, setInsideValue] = useState(() => copyValue(defaultValue)), acceptedValue = value === undefined ? insideValue : value;
  const state = selected && Object.prototype.hasOwnProperty.call(acceptedValue, selected.id) ? acceptedValue[selected.id] : undefined;
  const [pane, setPane] = useState<'players' | 'permissions' | null>(null), [focusedPlayer, setFocusedPlayer] = useState<string | null>(acceptedId);
  const roving = enabledPlayers.some(player => player.id === focusedPlayer) ? focusedPlayer : selected && !selected.disabled ? selected.id : enabledPlayers[0]?.id;
  const playersPane = useRef<HTMLDivElement | null>(null), optionsPane = useRef<HTMLDivElement | null>(null), playersViewport = useRef<HTMLDivElement | null>(null), rows = useRef(new Map<string, HTMLButtonElement>());
  const backButton = useRef<HTMLButtonElement | null>(null), kickButton = useRef<HTMLButtonElement | null>(null), banButton = useRef<HTMLButtonElement | null>(null);
  const uid = useId(), playerSignature = JSON.stringify(players.map(player => player.id));
  const rowRefs = useMemo(() => new Map(players.map(player => [player.id, (node: HTMLButtonElement | null) => { if (node) rows.current.set(player.id, node); else rows.current.delete(player.id); assignRef(playerRefs?.[player.id], node); }])), [playerSignature, playerRefs]);
  const attachViewport = useCallback((node: HTMLDivElement | null) => { playersViewport.current = node; assignRef(playersViewportRef, node); }, [playersViewportRef]);
  const selectPlayer = (id: string, event: SyntheticEvent) => { if (event.defaultPrevented || disabled || players.find(player => player.id === id)?.disabled || id === acceptedId) return; if (selectedPlayerId === undefined) setInsidePlayer(id); onSelectedPlayerIdChange?.(id, event); };
  const change = (next: PlayerPermissionState, reason: PlayerPermissionsChangeDetail['reason'], event: SyntheticEvent, permissionId?: string) => {
    if (!selected || !state || event.defaultPrevented || disabled || readOnly || !canEditPermissions) return;
    const snapshot = copyValue({ ...acceptedValue, [selected.id]: next }); if (value === undefined) setInsideValue(snapshot);
    onValueChange?.(copyValue(snapshot), { playerId: selected.id, reason, permissionId, event });
  };
  const inactivePlayers = contentFocused ?? pane === 'permissions', inactiveOptions = selectorFocused ?? pane === 'players';
  return <section {...props} ref={ref} className={['mc-player-permissions', className].filter(Boolean).join(' ')} aria-label={props['aria-label'] ?? label}
    aria-disabled={disabled || undefined} tabIndex={props.tabIndex ?? -1} data-selected-player={acceptedId ?? ''} data-profile="classic-json"
    style={{ ...visualStyle(scale), width: size[0] * scale, height: size[1] * scale, ...style }}
    onFocusCapture={event => { onFocusCapture?.(event); if (event.defaultPrevented) return; if (playersPane.current?.contains(event.target as Node)) setPane('players'); else if (optionsPane.current?.contains(event.target as Node)) setPane('permissions'); }}
    onBlurCapture={event => { onBlurCapture?.(event); if (!event.currentTarget.contains(event.relatedTarget as Node)) setPane(null); }}
    onClick={event => {
      onClick?.(event); if (event.defaultPrevented || disabled) return;
      const target = event.target as Node;
      if (backButton.current?.contains(target)) { onBack?.(event); return; }
      if (selected && !readOnly && kickVisible && kickEnabled && kickButton.current?.contains(target)) { onKickRequest?.({ ...selected }, event); return; }
      if (selected && !readOnly && banVisible && banEnabled && banButton.current?.contains(target)) { onBanRequest?.({ ...selected }, event); return; }
      const player = players.find(item => rows.current.get(item.id)?.contains(target)); if (player) selectPlayer(player.id, event);
    }}
    onKeyDown={event => {
      onKeyDown?.(event); if (keyBlocked(event) || disabled) return;
      if (event.key === 'Escape') {
        if ((event.target as HTMLElement).closest?.('input:not([type="checkbox"]),textarea,select,[contenteditable]:not([contenteditable="false"])')) return;
        if (optionsPane.current?.contains(event.target as Node)) { (selected && rows.current.get(selected.id) || rows.current.get(enabledPlayers[0]?.id ?? '') || playersViewport.current)?.focus({ preventScroll: true }); event.preventDefault(); }
        else { onBack?.(event); event.preventDefault(); } return;
      }
      const current = enabledPlayers.findIndex(player => rows.current.get(player.id) === event.target); if (current < 0) return;
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? enabledPlayers.length - 1 : event.key === 'ArrowDown' ? Math.min(enabledPlayers.length - 1, current + 1) : event.key === 'ArrowUp' ? Math.max(0, current - 1) : undefined;
      if (index === undefined) return; const next = enabledPlayers[index]; if (!next) return; setFocusedPlayer(next.id); const button = rows.current.get(next.id); button?.focus({ preventScroll: true });
      const viewport = playersViewport.current; if (button && viewport) { const p = viewport.getBoundingClientRect(), r = button.getBoundingClientRect(), ratio = p.height > 0 ? viewport.clientHeight / p.height : 1; if (r.top < p.top) viewport.scrollTop += (r.top - p.top) * ratio; else if (r.bottom > p.bottom) viewport.scrollTop += (r.bottom - p.bottom) * ratio; } event.preventDefault();
    }}>
    <span className="mc-player-permissions__background" aria-hidden="true"/>
    <header className="mc-player-permissions__header">
      {!gamepad && <button ref={backButton} type="button" className="mc-player-permissions__back" disabled={disabled}><span aria-hidden="true"/>{labels.back}</button>}
      {gamepad && <div className="mc-player-permissions__gamepad-back"><span aria-hidden="true">{gamepadBackGlyph}</span><span>{gamepadBackText}</span></div>}
      <h1 className="mc-player-permissions__title">{labels.title}</h1>
    </header>
    <div className="mc-player-permissions__body">
      <div className="mc-player-permissions__body-padding"/>
      {educationEdition && <p className="mc-player-permissions__ip">{ipText}</p>}
      <p className="mc-player-permissions__world">{worldText ?? labels.world}</p>
      <div className="mc-player-permissions__body-padding"/>
      <div className="mc-player-permissions__main">
        <div className="mc-player-permissions__players-pane" ref={playersPane}>
          <ScrollArea className="mc-player-permissions__players" label={labels.players} scale={scale} viewportRef={attachViewport} scrollbarVisibility="always" onScrollPositionChange={position => onScrollPositionChange?.('players', { ...position })}>
            <div className="mc-player-permissions__player-list" role="listbox" aria-label={labels.players}>
              {players.map(player => <PermissionPlayerRow key={player.id} player={player} ref={rowRefs.get(player.id)} role="option" id={`${uid}-player-${encodeURIComponent(player.id)}`}
                aria-selected={selected?.id === player.id} aria-controls={`${uid}-options`} selected={selected?.id === player.id} inactive={inactivePlayers} scale={scale} disabled={disabled || player.disabled}
                tabIndex={!disabled && roving === player.id ? 0 : -1} onFocus={() => setFocusedPlayer(player.id)}/>)}
            </div>
          </ScrollArea>
        </div>
        <div className="mc-player-permissions__options-pane" ref={optionsPane} id={`${uid}-options`} role="region" aria-label={labels.permissions}>
          <span className="mc-player-permissions__options-background" aria-hidden="true"/>
          <ScrollArea className="mc-player-permissions__options" label={labels.permissions} scale={scale} viewportRef={permissionsViewportRef} scrollbarVisibility="always" contentProps={{ className: 'mc-player-permissions__options-content' }} onScrollPositionChange={position => onScrollPositionChange?.('permissions', { ...position })}>
            <div className="mc-player-permissions__options-stack">
              {templateLocked && <><div className="mc-player-permissions__gap-8"/><div className="mc-player-permissions__template-warning">{templateWarning ?? 'Unlock Template World Options from Game Settings to be able to change permissions.'}</div></>}
              <div className="mc-player-permissions__gap-8"/>
              {selected && state ? <><PermissionLevelSelect value={state.level} selectedLabel={levelLabel} selectedIcon={levelIcon} labels={givenLevelLabels} worldSettings={worldSettings} inRealm={inRealm} scale={scale}
                ref={levelRef} disabled={disabled || !canEditPermissions} readOnly={readOnly} onValueChange={(level, event) => change({ ...state, level }, 'level', event)}/>
              <div className="mc-player-permissions__gap-2"/>
              <div className="mc-player-permissions__permission-grid" hidden={!optionsVisible}>
                {permissionOptions.filter(option => Object.prototype.hasOwnProperty.call(state.permissions, option.id)).map(option => <PermissionToggleRow key={option.id}
                  ref={permissionRefs?.[option.id]} data-permission-id={option.id} label={option.label} stateLabel={option.stateLabel} onLabel={option.onLabel} offLabel={option.offLabel}
                  checked={state.permissions[option.id]} scale={scale} disabled={disabled || !canEditPermissions || option.disabled} readOnly={readOnly}
                  onCheckedChange={(checked, event) => change({ ...state, permissions: { ...state.permissions, [option.id]: checked } }, 'permission', event, option.id)}/>)}
              </div></> : <div className="mc-player-permissions__empty">{emptyContent}</div>}
              <div className="mc-player-permissions__gap-4"/>
              <Button ref={kickButton} className="mc-player-permissions__action" hidden={!kickVisible} disabled={disabled || readOnly || !kickEnabled || !selected}>{labels.kick}</Button>
              <div className="mc-player-permissions__gap-4"/>
              <Button ref={banButton} className="mc-player-permissions__action" hidden={!banVisible} disabled={disabled || readOnly || !banEnabled || !selected}>{labels.ban}</Button>
              <div className="mc-player-permissions__gap-4"/>
            </div>
          </ScrollArea>
          <span className="mc-player-permissions__options-fade" aria-hidden="true" hidden={!inactiveOptions}/>
        </div>
      </div>
    </div>
  </section>;
});
