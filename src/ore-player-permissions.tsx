import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ButtonHTMLAttributes, ChangeEvent, CSSProperties, HTMLAttributes, InputHTMLAttributes, KeyboardEvent, ReactNode, Ref, SyntheticEvent } from 'react';
import type { PermissionLevel, PlayerPermissionsChangeDetail, PlayerPermissionsValue } from './player-permissions';

/** Modern OreUI source units. This does not change the document's rem size. */
export interface OrePermissionAppearance { guiScale?: number; locale?: string }
export interface OrePermissionPlayer {
  readonly id: string; readonly name: string; readonly avatar?: ReactNode; readonly avatarSrc?: string;
  readonly subtitle?: ReactNode; readonly levelIcon?: ReactNode; readonly disabled?: boolean; readonly isHosting?: boolean;
}
export interface OrePermissionOption { readonly id: string; readonly title: ReactNode; readonly description?: ReactNode; readonly disabled?: boolean }
export interface OrePermissionLevelLabels {
  title: string; visitor: string; member: string; operator: string; custom: string;
  visitorDescription: string; memberDescription: string; operatorDescription: string; customDescription: string; close: string;
}
export interface OreSwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'children' | 'dangerouslySetInnerHTML' | 'type' | 'size' | 'checked' | 'defaultChecked' | 'onChange'>, OrePermissionAppearance {
  checked?: boolean; defaultChecked?: boolean; onCheckedChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
  thumbIcon?: ReactNode; onIcon?: ReactNode; offIcon?: ReactNode;
}
export interface OrePermissionToggleRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML' | 'title' | 'onChange' | 'defaultValue'>, OrePermissionAppearance {
  title: ReactNode; description?: ReactNode; checked?: boolean; defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean; readOnly?: boolean; inputRef?: Ref<HTMLInputElement>;
  inputProps?: Omit<OreSwitchProps, 'guiScale' | 'locale' | 'checked' | 'defaultChecked' | 'onCheckedChange' | 'disabled' | 'readOnly'>;
}
export interface OrePlayerCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'dangerouslySetInnerHTML'>, OrePermissionAppearance {
  player: OrePermissionPlayer; selected?: boolean; subtitle?: ReactNode; levelIcon?: ReactNode;
}
export interface OrePermissionLevelSelectProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'dangerouslySetInnerHTML' | 'title' | 'defaultValue' | 'onChange'>, OrePermissionAppearance {
  value?: PermissionLevel | null; defaultValue?: PermissionLevel | null;
  onValueChange?: (value: PermissionLevel, event: SyntheticEvent) => void;
  /** Physical source-window dimensions, independent of this widget's measured width. */
  viewportSize: readonly [number, number];
  /** Explicit source input branch, default mouse. No inference of the engine's input device. */
  scrollInputMode?: 'mouse' | 'touch';
  /** Optional resolved widget width in CSS pixels; otherwise measured without changing the source-window branch. */
  availableWidth?: number;
  labels?: Partial<OrePermissionLevelLabels>; icons?: Readonly<Partial<Record<PermissionLevel, ReactNode>>>;
  dropdownIcons?: { readonly close?: ReactNode; readonly check?: ReactNode; readonly chevron?: ReactNode };
  disabledLevels?: readonly PermissionLevel[]; disabled?: boolean; readOnly?: boolean;
  triggerRef?: Ref<HTMLButtonElement>; optionRefs?: Readonly<Partial<Record<PermissionLevel, Ref<HTMLButtonElement>>>>;
}
export interface OrePermissionSafeArea { x?: number; y?: number; positionX?: number; positionY?: number }
export interface OrePlayerPermissionsLabels { title: string; back: string; players: string; permissions: string; kick: string }
export interface OrePlayerPermissionsProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'dangerouslySetInnerHTML' | 'title' | 'defaultValue' | 'onChange'>, OrePermissionAppearance {
  label: string; players: readonly OrePermissionPlayer[]; permissionOptions: readonly OrePermissionOption[];
  selectedPlayerId?: string | null; defaultSelectedPlayerId?: string | null;
  onSelectedPlayerIdChange?: (id: string, event: SyntheticEvent) => void;
  /** Accepted host state. Missing player/bit keys remain unknown; no role preset or permission-mask synthesis. */
  value?: PlayerPermissionsValue; defaultValue?: PlayerPermissionsValue;
  onValueChange?: (value: PlayerPermissionsValue, detail: PlayerPermissionsChangeDetail) => void;
  onBack?: (event: SyntheticEvent) => void;
  onKickRequest?: (player: Readonly<OrePermissionPlayer>, event: SyntheticEvent) => void;
  canEditPermissions?: boolean; canKickPlayer?: boolean; kickVisible?: boolean; kickEnabled?: boolean;
  readOnly?: boolean; disabled?: boolean;
  labels?: Partial<OrePlayerPermissionsLabels>; levelLabels?: Partial<OrePermissionLevelLabels>;
  roleIcons?: Readonly<Partial<Record<PermissionLevel, ReactNode>>>;
  dropdownIcons?: OrePermissionLevelSelectProps['dropdownIcons'];
  toggleIcons?: { readonly on?: ReactNode; readonly off?: ReactNode; readonly thumb?: ReactNode };
  disabledLevels?: readonly PermissionLevel[];
  templateWarning?: ReactNode; errorContent?: ReactNode; emptyContent?: ReactNode;
  backIcon?: ReactNode;
  /** Source window dimensions in physical CSS pixels, not a parent container breakpoint. */
  viewportSize: readonly [number, number];
  /** Available embedding frame; defaults to viewportSize. Small frames clip rather than rescale source units. */
  size?: readonly [number, number]; safeArea?: OrePermissionSafeArea;
  /** Explicit CSS-pixel host safe-zone addition. No split-screen or engine bottom-inset inference. */
  extraBottomInset?: number;
  scrollInputMode?: 'mouse' | 'touch';
  playersViewportRef?: Ref<HTMLDivElement>; permissionsViewportRef?: Ref<HTMLDivElement>;
  playerRefs?: Readonly<Record<string, Ref<HTMLButtonElement> | undefined>>;
  permissionRefs?: Readonly<Record<string, Ref<HTMLInputElement> | undefined>>;
  levelRef?: Ref<HTMLDivElement>; levelTriggerRef?: Ref<HTMLButtonElement>;
}

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const levels: readonly PermissionLevel[] = ['visitor', 'member', 'operator', 'custom'];
// Usable English host fallbacks; engine localization and confirmation flows remain caller-owned.
const defaults: OrePermissionLevelLabels = {
  title: 'Permission Level', visitor: 'Visitor', member: 'Member', operator: 'Operator', custom: 'Custom', close: 'Close',
  visitorDescription: 'Visitors can explore the world, but cannot interact with blocks, items, or entities.',
  memberDescription: 'Members can build, mine, attack players and mobs, and interact with items and entities.',
  operatorDescription: 'Operators can set player permissions and use commands.', customDescription: 'This player has custom permissions.',
};
const pageDefaults: OrePlayerPermissionsLabels = { title: 'Player Permissions', back: 'Back', players: 'Players', permissions: 'Permissions', kick: 'Kick Player' };
function labels<T extends object>(base: T, supplied: Partial<T> | undefined): T {
  const result = { ...base, ...Object.fromEntries(Object.entries(supplied ?? {}).filter(([, v]) => v !== undefined)) };
  if (Object.values(result).some(v => typeof v !== 'string')) throw new TypeError('Ore permission labels must be strings.');
  return result;
}
function positive(value: number, name: string) { if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be positive and finite.`); }
function pair(value: readonly [number, number], name: string) { if (!Array.isArray(value) || value.length !== 2) throw new TypeError(`${name} must be a width/height pair.`); positive(value[0], name); positive(value[1], name); }
function checkLevel(value: unknown) { if (value !== null && !levels.includes(value as PermissionLevel)) throw new TypeError('Unknown Ore permission level.'); }
function appearance(scale: number, locale?: string): CSSProperties {
  positive(scale, 'guiScale');
  if (locale !== undefined && typeof locale !== 'string') throw new TypeError('locale must be a string.');
  const east = locale?.replace('-', '_').toLowerCase();
  const fallback = east === 'zh_cn' ? '"Noto Sans SC","Noto Sans TC","Noto Sans JP","Noto Sans KR","Noto Sans"' : east === 'zh_tw' ? '"Noto Sans TC","Noto Sans SC","Noto Sans JP","Noto Sans KR","Noto Sans"' : east?.startsWith('ja') ? '"Noto Sans JP","Noto Sans TC","Noto Sans SC","Noto Sans KR","Noto Sans"' : east?.startsWith('ko') ? '"Noto Sans KR","Noto Sans TC","Noto Sans SC","Noto Sans JP","Noto Sans"' : east?.startsWith('ar_') ? '"Noto Sans AR","Noto Sans","Noto Sans KR","Noto Sans TC","Noto Sans SC","Noto Sans JP"' : '"Noto Sans","Noto Sans SC","Noto Sans TC","Noto Sans JP","Noto Sans KR","Noto Sans AR"';
  return { '--mc-ore-unit': `${5 * scale}px`, '--mc-ore-base1': `${Math.max(Math.floor(scale / 2), .5)}px`, '--mc-ore-min-border': `${Math.max(Math.floor(scale / 2), 1)}px`, '--mc-ore-fallback': `${fallback},"Noto Sans Mongolian","Noto Sans Syriac","Noto Sans TamilSupplement",sans-serif` } as CSSProperties;
}
function assignRef<T>(ref: Ref<T> | undefined, value: T | null) { if (typeof ref === 'function') ref(value); else if (ref) ref.current = value; }
function useMergedRef<T>(own: { current: T | null }, forwarded: Ref<T> | undefined) { return useCallback((node: T | null) => { own.current = node; assignRef(forwarded, node); }, [own, forwarded]); }
function useValue<T>(controlled: T | undefined, initial: T) { const [internal, set] = useState(initial); return [controlled === undefined ? internal : controlled, (next: T) => { if (controlled === undefined) set(next); }] as const; }
function forbiddenKey(event: KeyboardEvent) { return event.defaultPrevented || event.nativeEvent.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey; }
function copyValue(value: PlayerPermissionsValue): PlayerPermissionsValue { return Object.fromEntries(Object.entries(value).map(([id, state]) => [id, { level: state.level, permissions: { ...state.permissions } }])); }
function own<T>(record: Readonly<Record<string, T>> | undefined, key: string): T | undefined { return record && Object.hasOwn(record, key) ? record[key] : undefined; }
function validateValue(value: PlayerPermissionsValue) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Ore permission value must be a keyed record.');
  for (const state of Object.values(value)) { if (!state || typeof state !== 'object') throw new TypeError('Invalid player permission state.'); checkLevel(state.level); if (!state.permissions || typeof state.permissions !== 'object' || Array.isArray(state.permissions) || Object.values(state.permissions).some(v => typeof v !== 'boolean')) throw new TypeError('Permissions must contain booleans.'); }
}
function validateIds(items: readonly { readonly id: string }[], name: string) {
  if (!Array.isArray(items)) throw new TypeError(`${name} must be an array.`);
  const found = new Set<string>(); for (const item of items) { if (!item || typeof item.id !== 'string' || !item.id || found.has(item.id)) throw new TypeError(`${name} require unique nonempty IDs.`); found.add(item.id); }
}

export const OreSwitch = forwardRef<HTMLInputElement, OreSwitchProps>(function OreSwitch({ checked: given, defaultChecked = false, onCheckedChange, disabled, readOnly, guiScale = 1, locale, thumbIcon, onIcon, offIcon, className = '', style, onClick, ...props }, ref) {
  const [checked, setChecked] = useValue(given, defaultChecked);
  const previous = useRef(checked); const [motion, setMotion] = useState<'on' | 'off' | null>(null);
  useClientLayoutEffect(() => { if (previous.current === checked) return; previous.current = checked; setMotion(checked ? 'on' : 'off'); }, [checked]);
  if (typeof checked !== 'boolean') throw new TypeError('OreSwitch checked must be boolean.');
  return <span className={`mc-ore-switch ${className}`} data-checked={checked} data-disabled={!!disabled} data-readonly={!!readOnly} style={{ ...appearance(guiScale, locale), ...style }}>
    <input {...props} ref={ref} type="checkbox" checked={checked} disabled={disabled} readOnly={readOnly} aria-readonly={readOnly || undefined} onClick={event => { onClick?.(event); if (readOnly) event.preventDefault(); }} onChange={event => { if (event.defaultPrevented || event.nativeEvent.defaultPrevented || disabled || readOnly) return; setChecked(event.currentTarget.checked); onCheckedChange?.(event.currentTarget.checked, event); }} />
    <span className="mc-ore-switch__rail" aria-hidden="true"><span className="mc-ore-switch__base"><span className="mc-ore-switch__on"><span>{onIcon}</span></span><span className="mc-ore-switch__off"><span>{offIcon}</span></span></span>
      <span className="mc-ore-switch__thumb" data-motion={motion ?? undefined} onAnimationEnd={() => setMotion(null)}><span className="mc-ore-switch__thumb-face"><span className="mc-ore-switch__thumb-top"><span className="mc-ore-switch__thumb-icon">{thumbIcon}</span></span><span className="mc-ore-switch__thumb-bevel" /></span></span>
    </span>
  </span>;
});

export const OrePermissionToggleRow = forwardRef<HTMLDivElement, OrePermissionToggleRowProps>(function OrePermissionToggleRow({ title, description, checked, defaultChecked, onCheckedChange, disabled, readOnly, inputRef, inputProps, guiScale = 1, locale, className = '', style, onClick, ...props }, ref) {
  const uid = useId(); const inputId = inputProps?.id ?? `${uid}-switch`;
  const forwarding = useRef(false);
  return <div {...props} ref={ref} className={`mc-ore-permission-row ${className}`} data-disabled={!!disabled} style={{ ...appearance(guiScale, locale), ...style }} onClick={event => { if (forwarding.current) return; onClick?.(event); if (event.defaultPrevented || disabled || readOnly || (event.target as Element).closest('label,input,button,a,select,textarea,[role="button"],[contenteditable]')) return; forwarding.current = true; try { event.currentTarget.querySelector<HTMLInputElement>('input')?.click(); } finally { forwarding.current = false; } }}>
    <div className="mc-ore-permission-row__inner"><div className="mc-ore-permission-row__text"><label id={`${uid}-title`} htmlFor={inputId} className="mc-ore-permission-row__title">{title}</label>{description !== undefined && <div id={`${uid}-description`} className="mc-ore-permission-row__description">{description}</div>}</div>
      <OreSwitch {...inputProps} id={inputId} ref={inputRef} guiScale={guiScale} locale={locale} checked={checked} defaultChecked={defaultChecked} disabled={disabled} readOnly={readOnly} onCheckedChange={onCheckedChange} aria-labelledby={inputProps?.['aria-label'] ? undefined : `${uid}-title`} aria-describedby={inputProps?.['aria-describedby'] ?? (description !== undefined ? `${uid}-description` : undefined)} />
    </div>
  </div>;
});

export const OrePlayerCard = forwardRef<HTMLButtonElement, OrePlayerCardProps>(function OrePlayerCard({ player, selected = false, subtitle = player.subtitle, levelIcon = player.levelIcon, guiScale = 1, locale, disabled, className = '', style, ...props }, ref) {
  if (!player || typeof player.id !== 'string' || typeof player.name !== 'string') throw new TypeError('OrePlayerCard requires a named player.');
  return <button {...props} ref={ref} type="button" className={`mc-ore-player-card ${className}`} data-player-id={player.id} data-selected={selected} aria-pressed={selected} disabled={disabled || player.disabled} style={{ ...appearance(guiScale, locale), ...style }}>
    <span className="mc-ore-player-card__avatar" aria-hidden="true">{player.avatar ?? (player.avatarSrc ? <img src={player.avatarSrc} alt="" /> : null)}</span>
    <span className="mc-ore-player-card__text"><span className="mc-ore-player-card__name">{player.name}</span>{subtitle !== undefined && subtitle !== null && <span className="mc-ore-player-card__subtitle">{levelIcon && <span className="mc-ore-player-card__icon" aria-hidden="true">{levelIcon}</span>}<span>{subtitle}</span></span>}</span>
  </button>;
});

interface ModalFrame { node: HTMLElement | null; size: readonly [number, number] }
const ModalFrameContext = createContext<ModalFrame | null>(null);
function OreScroll({ children, viewportRef, label, className = '', floating = false, guiScale = 1, inputMode = 'mouse', bottomInset = 0 }: { children: ReactNode; viewportRef?: Ref<HTMLDivElement>; label: string; className?: string; floating?: boolean; guiScale?: number; inputMode?: 'mouse' | 'touch'; bottomInset?: number }) {
  const own = useRef<HTMLDivElement>(null), track = useRef<HTMLDivElement>(null); const merged = useMergedRef(own, viewportRef); const uid = useId();
  const dragCleanup = useRef<(() => void) | null>(null), activityTimer = useRef<ReturnType<typeof setTimeout> | null>(null); const [active, setActive] = useState(false);
  if (inputMode !== 'mouse' && inputMode !== 'touch') throw new TypeError('scrollInputMode must be mouse or touch.');
  useEffect(() => () => { dragCleanup.current?.(); if (activityTimer.current !== null) clearTimeout(activityTimer.current); }, [inputMode]);
  const [metrics, setMetrics] = useState({ top: 0, height: 0, content: 0 });
  const update = useCallback(() => { const node = own.current; if (!node) return; const next = { top: node.scrollTop, height: node.clientHeight, content: node.scrollHeight }; setMetrics(old => old.top === next.top && old.height === next.height && old.content === next.content ? old : next); }, []);
  useClientLayoutEffect(() => { const node = own.current; if (!node) return; update(); const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update); observer?.observe(node); if (node.firstElementChild) observer?.observe(node.firstElementChild); const mutation = typeof MutationObserver === 'undefined' ? null : new MutationObserver(update); mutation?.observe(node, { childList: true, subtree: true, characterData: true }); return () => { observer?.disconnect(); mutation?.disconnect(); }; }, [update]);
  const max = Math.max(0, metrics.content - metrics.height), unit = 5 * guiScale, margin = (inputMode === 'mouse' ? .8 : .4) * unit;
  const area = Math.max(0, metrics.height - bottomInset), extent = Math.max(0, area - 2 * margin);
  // Source Pp has physical-pixel minima 40/16, not rem values. Degenerate Web extents are explicitly clamped.
  const thumbSize = Math.min(extent, Math.max(area > 52 ? 40 : 16, metrics.content > 0 ? area * area / metrics.content - 2 * margin : extent));
  const thumbTop = Math.max(0, (max > 0 ? Math.min(1, metrics.top / max) : 0) * (area - thumbSize - 2 * margin));
  return <div className={`mc-ore-scroll ${className}`} data-floating={floating} data-input-mode={inputMode} data-overflow={max > 0}>
    <div id={uid} className="mc-ore-scroll__viewport" ref={merged} role="region" aria-label={label} tabIndex={0} onScroll={() => { update(); if (inputMode === 'touch') { setActive(true); if (activityTimer.current !== null) clearTimeout(activityTimer.current); activityTimer.current = setTimeout(() => setActive(false), 500); } }}><div className="mc-ore-scroll__content">{children}</div></div>
    {inputMode === 'touch' ? <span className="mc-ore-scroll__touch" aria-hidden="true" hidden={max <= 0} data-active={active} style={{ height: thumbSize, top: thumbTop + margin }} /> : <div ref={track} className="mc-ore-scroll__bar" style={{ marginBottom: margin + bottomInset }} hidden={max <= 0} role="scrollbar" tabIndex={0} aria-label={label} aria-controls={uid} aria-orientation="vertical" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(max, metrics.top)} onKeyDown={event => { if (forbiddenKey(event)) return; const node = own.current; if (!node) return; const next = event.key === 'End' ? max : event.key === 'Home' ? 0 : event.key === 'PageDown' ? node.scrollTop + node.clientHeight : event.key === 'PageUp' ? node.scrollTop - node.clientHeight : event.key === 'ArrowDown' ? node.scrollTop + 40 : event.key === 'ArrowUp' ? node.scrollTop - 40 : null; if (next === null) return; event.preventDefault(); node.scrollTop = Math.max(0, Math.min(max, next)); update(); }} onPointerDown={event => { if (event.defaultPrevented || event.button !== 0 || !own.current || !track.current) return; dragCleanup.current?.(); event.preventDefault(); const pointerId = event.pointerId; const rect = track.current.getBoundingClientRect(); const thumb = event.currentTarget.querySelector<HTMLElement>('.mc-ore-scroll__thumb'); const thumbHeight = thumb?.getBoundingClientRect().height ?? 0; const isThumb = !!(event.target as Element).closest('.mc-ore-scroll__thumb'); const grab = isThumb && thumb ? event.clientY - thumb.getBoundingClientRect().top : thumbHeight / 2;
      const move = (e: PointerEvent) => { if (e.pointerId !== pointerId || !own.current) return; const ratio = isThumb ? (e.clientY - rect.top - grab) / Math.max(1, rect.height - thumbHeight) : (e.clientY - rect.top) / Math.max(1, rect.height); own.current.scrollTop = Math.max(0, Math.min(1, ratio)) * max; update(); };
      move(event.nativeEvent); const doc = event.currentTarget.ownerDocument; const cleanup = () => { doc.removeEventListener('pointermove', move); doc.removeEventListener('pointerup', end); doc.removeEventListener('pointercancel', end); if (dragCleanup.current === cleanup) dragCleanup.current = null; }; const end = (e: PointerEvent) => { if (e.pointerId === pointerId) cleanup(); }; dragCleanup.current = cleanup; doc.addEventListener('pointermove', move); doc.addEventListener('pointerup', end); doc.addEventListener('pointercancel', end);
    }}><span className="mc-ore-scroll__track" /><span className="mc-ore-scroll__thumb" style={{ height: thumbSize, top: thumbTop }} /></div>}
  </div>;
}

export const OrePermissionLevelSelect = forwardRef<HTMLDivElement, OrePermissionLevelSelectProps>(function OrePermissionLevelSelect({ value: given, defaultValue = null, onValueChange, viewportSize, availableWidth, scrollInputMode = 'mouse', labels: suppliedLabels, icons, dropdownIcons, disabledLevels = [], disabled, readOnly, triggerRef, optionRefs, guiScale = 1, locale, className = '', style, onKeyDown, onKeyDownCapture, onClick, onClickCapture, ...props }, forwardedRef) {
  pair(viewportSize, 'viewportSize'); if (availableWidth !== undefined) positive(availableWidth, 'availableWidth');
  const [value, setValue] = useValue(given, defaultValue); checkLevel(value); disabledLevels.forEach(checkLevel);
  const text = labels(defaults, suppliedLabels), u = 5 * guiScale, desktop = viewportSize[0] >= 128 * u;
  const own = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), dialog = useRef<HTMLDivElement>(null); const rootRef = useMergedRef(own, forwardedRef), mergedTrigger = useMergedRef(trigger, triggerRef);
  const [measured, setMeasured] = useState(0), [open, setOpen] = useState(false); const [focusLevel, setFocusLevel] = useState<PermissionLevel | null>(value); const composing = useRef(false); const uid = useId(); const frame = useContext(ModalFrameContext);
  const [menuBounds, setMenuBounds] = useState<{ parentHeight: number; maxHeight: number | undefined } | null>(null);
  const [triggerHovered, setTriggerHovered] = useState(false);
  const segmented = desktop && (availableWidth ?? measured) >= 60 * u;
  // Source Ld tracks mouse move/leave independently of focus and modal-open state.
  useClientLayoutEffect(() => { setTriggerHovered(false); }, [desktop, segmented]);
  useClientLayoutEffect(() => { const root = own.current; if (!root || availableWidth !== undefined) return; const measure = () => setMeasured(root.clientWidth); measure(); const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure); observer?.observe(root); return () => observer?.disconnect(); }, [availableWidth]);
  // Closing on a presentation-branch change is a Web focus policy, not a provider state write.
  useClientLayoutEffect(() => { if ((segmented || disabled || readOnly) && open) setOpen(false); }, [segmented, disabled, readOnly, open]);
  useClientLayoutEffect(() => {
    if (!open || !dialog.current) return;
    const node = dialog.current, overlay = node.parentElement!;
    const header = node.querySelector<HTMLElement>('.mc-ore-level__modal-header')!;
    const headerShadow = node.querySelector<HTMLElement>('.mc-ore-level__modal-header-shadow')!;
    const rows = node.querySelector<HTMLElement>('.mc-ore-level__menu [role="radiogroup"]')!;
    const measure = () => {
      const css = getComputedStyle(overlay), border = getComputedStyle(node);
      const available = Math.max(0, overlay.clientHeight - parseFloat(css.paddingTop || '0') - parseFloat(css.paddingBottom || '0') - header.getBoundingClientRect().height - headerShadow.getBoundingClientRect().height - parseFloat(border.borderTopWidth || '0') - parseFloat(border.borderBottomWidth || '0'));
      // DY's direct parent is a content-stack, not its overflow viewport. Preserve a stable
      // capacity parent from the overlay while measuring the uncapped natural rows separately.
      const natural = rows.getBoundingClientRect().height + .4 * u;
      const parentHeight = Math.min(available, natural);
      const maxHeight = natural > available ? Math.max(0, Math.floor(parentHeight / (4.8 * u)) * (4.8 * u) - 2.4 * u) : undefined;
      setMenuBounds(old => old?.parentHeight === parentHeight && old.maxHeight === maxHeight ? old : { parentHeight, maxHeight });
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(overlay); observer?.observe(header); observer?.observe(headerShadow); observer?.observe(rows);
    const win = node.ownerDocument.defaultView; win?.addEventListener('resize', measure);
    return () => { observer?.disconnect(); win?.removeEventListener('resize', measure); };
  }, [open, u, frame?.size[0], frame?.size[1], viewportSize[0], viewportSize[1]]);
  const choose = (level: PermissionLevel, event: SyntheticEvent) => { if (event.defaultPrevented || disabled || readOnly || disabledLevels.includes(level)) return; setValue(level); onValueChange?.(level, event); setOpen(false); };
  useClientLayoutEffect(() => {
    if (!open) return; const node = dialog.current; if (!node) return; const doc = node.ownerDocument, previous = doc.activeElement as HTMLElement | null;
    const overlay = node.parentElement!; const inert: [HTMLElement, boolean][] = [];
    // A bounded visual overlay still has document-modal accessibility: inert siblings at every ancestor level.
    let branch: HTMLElement = overlay;
    while (branch.parentElement) { for (const sibling of Array.from(branch.parentElement.children)) if (sibling !== branch && sibling instanceof HTMLElement) { inert.push([sibling, sibling.inert]); sibling.inert = true; } if (branch.parentElement === doc.body) break; branch = branch.parentElement; }
    const selectedTarget = desktop ? node.querySelector<HTMLButtonElement>('[aria-checked="true"]:not(:disabled)') : null;
    const target = selectedTarget ?? node.querySelector<HTMLButtonElement>('[data-ore-level]:not(:disabled)') ?? node.querySelector<HTMLButtonElement>('button:not(:disabled)'); target?.focus({ preventScroll: true });
    const contain = (event: FocusEvent) => { if (node.contains(event.target as Node)) return; (node.querySelector<HTMLElement>('button:not(:disabled)') ?? node).focus({ preventScroll: true }); };
    doc.addEventListener('focusin', contain);
    return () => { doc.removeEventListener('focusin', contain); inert.forEach(([element, old]) => { element.inert = old; }); const active = doc.activeElement; if (active === doc.body || (active && overlay.contains(active))) { const dest = trigger.current?.isConnected ? trigger.current : previous?.isConnected ? previous : null; dest?.focus({ preventScroll: true }); } };
  }, [open]);
  const description = value ? text[`${value}Description`] : undefined;
  const modal = open && typeof document !== 'undefined' ? createPortal(<div className="mc-ore-level__overlay" style={{ ...appearance(guiScale, locale), ...(frame?.node ? {} : { position: 'fixed', width: viewportSize[0], height: viewportSize[1] }) }} onPointerDown={event => { if (event.target === event.currentTarget) { event.preventDefault(); setOpen(false); } }}>
    <div ref={dialog} className="mc-ore-level__modal" role="dialog" aria-modal="true" aria-labelledby={`${uid}-modal-title`} tabIndex={-1} onCompositionStartCapture={() => { composing.current = true; }} onCompositionEndCapture={() => { composing.current = false; }} onKeyDown={event => { if (forbiddenKey(event) || composing.current) return; if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); } else if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) && (event.target as Element).closest('[data-ore-level]')) { const enabled = levels.filter(level => !disabledLevels.includes(level)); if (!enabled.length) return; const current = (event.target as HTMLElement).closest<HTMLElement>('[data-ore-level]')!.dataset.oreLevel as PermissionLevel; const at = enabled.indexOf(current); const next = event.key === 'Home' ? enabled[0]! : event.key === 'End' ? enabled.at(-1)! : enabled[(at + (event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length]!; event.preventDefault(); setFocusLevel(next); const target = event.currentTarget.querySelector<HTMLButtonElement>(`[data-ore-level="${next}"]`); target?.focus({ preventScroll: true }); const viewport = target?.closest<HTMLElement>('.mc-ore-scroll__viewport'); if (target && viewport) { const row = target.getBoundingClientRect(), bounds = viewport.getBoundingClientRect(); if (row.top < bounds.top) viewport.scrollTop -= bounds.top - row.top; else if (row.bottom > bounds.bottom) viewport.scrollTop += row.bottom - bounds.bottom; } } else if (event.key === 'Tab') { const nodes = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]),[tabindex="0"]')).filter(n => !n.hidden); const at = nodes.indexOf(event.currentTarget.ownerDocument.activeElement as HTMLElement); if (event.shiftKey && at <= 0) { event.preventDefault(); nodes.at(-1)?.focus(); } else if (!event.shiftKey && at === nodes.length - 1) { event.preventDefault(); nodes[0]?.focus(); } } }}>
      <div className="mc-ore-level__modal-header"><span className="mc-ore-level__header-cell" aria-hidden="true" /><h2 id={`${uid}-modal-title`}>{text.title}</h2><button type="button" className="mc-ore-level__close" aria-label={text.close} onClick={() => setOpen(false)}><span aria-hidden="true">{dropdownIcons?.close}</span></button></div>
      <div className="mc-ore-level__modal-header-shadow" aria-hidden="true" />
      <div className="mc-ore-level__menu-bound" style={menuBounds ? { height: menuBounds.parentHeight } : undefined}><div className="mc-ore-level__menu-quantized" style={{ maxHeight: menuBounds?.maxHeight }}>
        <OreScroll label={text.title} floating guiScale={guiScale} inputMode={scrollInputMode} className="mc-ore-level__menu"><div role="radiogroup" aria-label={text.title}>{levels.map(level => <button key={level} type="button" role="radio" data-ore-level={level} aria-checked={level === value} tabIndex={(focusLevel !== null && !disabledLevels.includes(focusLevel) ? focusLevel : value !== null && !disabledLevels.includes(value) ? value : levels.find(l => !disabledLevels.includes(l))) === level ? 0 : -1} onFocus={() => setFocusLevel(level)} disabled={disabledLevels.includes(level)} className="mc-ore-level__option" ref={optionRefs?.[level]} onClick={event => choose(level, event)}><span className="mc-ore-level__icon" aria-hidden="true">{icons?.[level]}</span><span>{text[level]}</span><span className="mc-ore-level__check" aria-hidden="true"><span>{level === value ? dropdownIcons?.check : null}</span></span></button>)}<div className="mc-ore-level__menu-bottom-rule" aria-hidden="true" /></div></OreScroll>
      </div></div>
    </div>
  </div>, frame?.node ?? document.body) : null;
  return <div {...props} ref={rootRef} className={`mc-ore-level ${className}`} data-presentation={segmented ? 'segmented' : 'modal'} data-breakpoint={desktop ? 'desktop' : viewportSize[0] >= 70 * u ? 'tablet' : 'narrow'} style={{ ...appearance(guiScale, locale), ...style }} onKeyDownCapture={event => { onKeyDownCapture?.(event); if (!event.isPropagationStopped()) onKeyDown?.(event); }} onClickCapture={event => { onClickCapture?.(event); if (!event.isPropagationStopped()) onClick?.(event); }} onKeyDown={event => { if ((event.target as Element).closest('.mc-ore-level__modal')) return; if (forbiddenKey(event) || disabled || !segmented) return; const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']; if (!keys.includes(event.key)) return; const enabled = levels.filter(level => !disabledLevels.includes(level)); if (!enabled.length) return; const target = (event.target as Element).closest<HTMLElement>('[data-ore-level]')?.dataset.oreLevel as PermissionLevel | undefined; const at = enabled.indexOf(target ?? focusLevel ?? value ?? enabled[0]!); const next = event.key === 'Home' ? enabled[0]! : event.key === 'End' ? enabled.at(-1)! : enabled[(at + (event.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length]!; event.preventDefault(); setFocusLevel(next); own.current?.querySelector<HTMLButtonElement>(`[data-ore-level="${next}"]`)?.focus(); }}>
    <div id={`${uid}-title`} className="mc-ore-level__title">{text.title}</div>
    {segmented ? <div role="radiogroup" aria-labelledby={`${uid}-title`} className="mc-ore-level__segments">{levels.map(level => <button key={level} ref={optionRefs?.[level]} type="button" role="radio" aria-checked={value === level} aria-disabled={readOnly || undefined} disabled={disabled || disabledLevels.includes(level)} data-ore-level={level} data-selected={value === level} tabIndex={(focusLevel !== null && !disabledLevels.includes(focusLevel) ? focusLevel : value !== null && !disabledLevels.includes(value) ? value : levels.find(l => !disabledLevels.includes(l))) === level ? 0 : -1} onFocus={() => setFocusLevel(level)} onClick={event => choose(level, event)}><span className="mc-ore-level__segment-face"><span className="mc-ore-level__icon" aria-hidden="true">{icons?.[level]}</span><span>{text[level]}</span><span className="mc-ore-level__underline" /></span></button>)}</div> : <button ref={mergedTrigger} type="button" className="mc-ore-level__trigger" data-hovered={triggerHovered} aria-haspopup="dialog" aria-expanded={open} aria-labelledby={`${uid}-title ${uid}-selected`} aria-disabled={readOnly || undefined} disabled={disabled} onMouseMove={() => { if (!disabled) setTriggerHovered(true); }} onMouseLeave={() => setTriggerHovered(false)} onClick={event => { if (event.defaultPrevented || disabled || readOnly) return; setOpen(true); }}><span className="mc-ore-level__trigger-shine" style={{ height: `${(desktop ? 4.2 : 4) * u}px` }}><span className="mc-ore-level__trigger-content"><span className="mc-ore-level__icon" aria-hidden="true">{value ? icons?.[value] : null}</span><span id={`${uid}-selected`}>{value ? text[value] : ''}</span><span className="mc-ore-level__arrow" aria-hidden="true"><span>{dropdownIcons?.chevron}</span></span></span></span><span className="mc-ore-level__trigger-bottom-shadow" aria-hidden="true" /></button>}
    {description !== undefined && <div className="mc-ore-level__description">{description}</div>}{modal}
  </div>;
});

export const OrePlayerPermissions = forwardRef<HTMLElement, OrePlayerPermissionsProps>(function OrePlayerPermissions({ label, players, permissionOptions, selectedPlayerId: givenId, defaultSelectedPlayerId = null, onSelectedPlayerIdChange, value: given, defaultValue = {}, onValueChange, onBack, onKickRequest, canEditPermissions = true, canKickPlayer = false, kickVisible = true, kickEnabled = true, disabled, readOnly, labels: suppliedLabels, levelLabels, roleIcons, dropdownIcons, toggleIcons, disabledLevels, templateWarning, errorContent, emptyContent, backIcon, viewportSize, size = viewportSize, safeArea, extraBottomInset = 0, scrollInputMode = 'mouse', guiScale = 1, locale, playersViewportRef, permissionsViewportRef, playerRefs, permissionRefs, levelRef, levelTriggerRef, className = '', style, onKeyDown, onKeyDownCapture, onCompositionStartCapture, onCompositionEndCapture, ...props }, forwardedRef) {
  pair(viewportSize, 'viewportSize'); pair(size, 'size'); validateIds(players, 'players'); validateIds(permissionOptions, 'permissionOptions'); positive(guiScale, 'guiScale');
  if (!Number.isFinite(extraBottomInset) || extraBottomInset < 0) throw new RangeError('extraBottomInset must be finite and nonnegative.');
  if (typeof label !== 'string') throw new TypeError('OrePlayerPermissions label must be a string.');
  const [selectedId, setId] = useValue(givenId, defaultSelectedPlayerId); if (selectedId !== null && typeof selectedId !== 'string') throw new TypeError('selectedPlayerId must be string or null.');
  const [value, setValue] = useValue(given, defaultValue); validateValue(value); const text = labels(pageDefaults, suppliedLabels), roleText = labels(defaults, levelLabels);
  const root = useRef<HTMLElement>(null), merged = useMergedRef(root, forwardedRef); const [container, setContainer] = useState<HTMLElement | null>(null); const [roving, setRoving] = useState<string | null>(selectedId);
  const composed = useRef(new Set<EventTarget>()); const playerNodes = useRef(new Map<string, HTMLButtonElement>()); const u = 5 * guiScale;
  const branch = viewportSize[0] < 70 * u ? 'narrow' : viewportSize[0] < 128 * u ? 'tablet' : 'desktop';
  useClientLayoutEffect(() => { setContainer(root.current); }, []);
  const clamp = (n: number | undefined, lo: number, hi: number, fallback: number) => { const v = n ?? fallback; if (!Number.isFinite(v)) throw new RangeError('safeArea values must be finite.'); return Math.max(lo, Math.min(hi, v)); };
  const sx = clamp(safeArea?.x, .9, 1, 1), sy = clamp(safeArea?.y, .9, 1, 1), px = clamp(safeArea?.positionX, -.1, .1, 0), py = clamp(safeArea?.positionY, -.1, .1, 0);
  const safe = { left: Math.round((1 - sx + px) * viewportSize[0] / 2), right: Math.round((1 - sx - px) * viewportSize[0] / 2), top: Math.round((1 - sy + py) * viewportSize[1] / 2), bottom: Math.round((1 - sy - py) * viewportSize[1] / 2) + extraBottomInset };
  const selected = players.find(p => p.id === selectedId), accepted = selectedId !== null ? own(value, selectedId) : undefined;
  const writable = !disabled && !readOnly && canEditPermissions && !!accepted;
  const emit = (nextLevel: PermissionLevel | undefined, permissionId: string | undefined, bit: boolean | undefined, event: SyntheticEvent) => {
    if (!selected || !accepted || !writable || event.defaultPrevented) return;
    const state = { level: nextLevel ?? accepted.level, permissions: { ...accepted.permissions } };
    if (permissionId !== undefined && bit !== undefined) state.permissions[permissionId] = bit;
    const next = { ...value, [selected.id]: state }; setValue(copyValue(next)); onValueChange?.(copyValue(next), { playerId: selected.id, reason: permissionId === undefined ? 'level' : 'permission', ...(permissionId === undefined ? {} : { permissionId }), event });
  };
  const focusPlayer = (id: string) => { const node = playerNodes.current.get(id); node?.focus({ preventScroll: true }); const view = node?.closest<HTMLElement>('.mc-ore-scroll__viewport'); if (node && view) { const n = node.getBoundingClientRect(), v = view.getBoundingClientRect(); if (n.top < v.top) view.scrollTop -= v.top - n.top; else if (n.bottom > v.bottom) view.scrollTop += n.bottom - v.bottom; } setRoving(id); };
  const activeRoving = players.some(p => p.id === roving && !p.disabled) ? roving : players.find(p => !p.disabled)?.id;
  return <section {...props} ref={merged} className={`mc-ore-player-permissions ${className}`} role={props.role ?? 'region'} aria-label={label} data-breakpoint={branch} aria-disabled={disabled || undefined} style={{ ...appearance(guiScale, locale), '--mc-ore-safe-left': `${safe.left}px`, '--mc-ore-safe-right': `${safe.right}px`, '--mc-ore-safe-top': `${safe.top}px`, '--mc-ore-safe-bottom': `${safe.bottom}px`, width: size[0], height: size[1], ...style } as CSSProperties} onCompositionStartCapture={event => { composed.current.add(event.target); onCompositionStartCapture?.(event); }} onCompositionEndCapture={event => { composed.current.delete(event.target); onCompositionEndCapture?.(event); }} onKeyDownCapture={event => { onKeyDownCapture?.(event); if (!event.isPropagationStopped()) onKeyDown?.(event); }} onKeyDown={event => {
    for (const item of composed.current) if (!(item instanceof Node) || !item.isConnected) composed.current.delete(item);
    if (forbiddenKey(event) || composed.current.size || disabled) return;
    if ((event.target as Element).closest('[data-ore-pane="players"]') && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { const enabled = players.filter(p => !p.disabled); if (!enabled.length) return; const current = (event.target as Element).closest<HTMLElement>('[data-player-id]')?.dataset.playerId; const at = enabled.findIndex(p => p.id === current); const next = event.key === 'Home' ? enabled[0]! : event.key === 'End' ? enabled.at(-1)! : enabled[(at + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length]!; event.preventDefault(); focusPlayer(next.id); }
    else if (event.key === 'Escape') { event.preventDefault(); onBack?.(event); }
  }}>
    <ModalFrameContext.Provider value={{ node: container, size }}><div className="mc-ore-player-permissions__surface">
      <header className="mc-ore-player-permissions__header"><div className="mc-ore-player-permissions__nav"><button type="button" className="mc-ore-player-permissions__back" aria-label={text.back} disabled={disabled} onClick={event => { if (!event.defaultPrevented && !disabled) onBack?.(event); }}><span className="mc-ore-player-permissions__back-icon" aria-hidden="true">{backIcon}</span></button><h1>{text.title}</h1></div><div className="mc-ore-player-permissions__header-strip" /></header>
      <div className="mc-ore-player-permissions__body"><div className="mc-ore-player-permissions__grid"><div className="mc-ore-player-permissions__row">
        <div className="mc-ore-player-permissions__players" data-ore-pane="players"><OreScroll label={text.players} viewportRef={playersViewportRef} guiScale={guiScale} inputMode={scrollInputMode} bottomInset={safe.bottom} floating={branch !== 'desktop'}><div className="mc-ore-player-permissions__player-list">{players.map(player => { const state = own(value, player.id); return <OrePlayerCard key={player.id} ref={node => { if (node) playerNodes.current.set(player.id, node); else playerNodes.current.delete(player.id); assignRef(own(playerRefs, player.id), node); }} player={player} selected={player.id === selectedId} guiScale={guiScale} locale={locale} disabled={disabled} tabIndex={player.id === activeRoving ? 0 : -1} subtitle={player.subtitle ?? (state?.level ? roleText[state.level] : undefined)} levelIcon={player.levelIcon ?? (state?.level ? roleIcons?.[state.level] : undefined)} onFocus={() => setRoving(player.id)} onClick={event => { if (event.defaultPrevented || disabled || player.disabled) return; setId(player.id); onSelectedPlayerIdChange?.(player.id, event); }} />; })}</div></OreScroll></div>
        <div className="mc-ore-player-permissions__permissions" data-ore-pane="permissions"><OreScroll label={text.permissions} viewportRef={permissionsViewportRef} guiScale={guiScale} inputMode={scrollInputMode} bottomInset={safe.bottom}><div className="mc-ore-player-permissions__panel">{errorContent !== undefined ? errorContent : selected && accepted ? <>
          {templateWarning !== undefined && <div className="mc-ore-player-permissions__warning">{templateWarning}</div>}
          <OrePermissionLevelSelect ref={levelRef} triggerRef={levelTriggerRef} value={accepted.level} onValueChange={(level, event) => emit(level, undefined, undefined, event)} labels={levelLabels} icons={roleIcons} dropdownIcons={dropdownIcons} disabledLevels={disabledLevels} viewportSize={viewportSize} scrollInputMode={scrollInputMode} guiScale={guiScale} locale={locale} disabled={disabled || !canEditPermissions} readOnly={readOnly} />
          {permissionOptions.map(option => { const bit = own(accepted.permissions, option.id); return <OrePermissionToggleRow key={option.id} data-permission-id={option.id} inputRef={own(permissionRefs, option.id)} inputProps={{ onIcon: toggleIcons?.on, offIcon: toggleIcons?.off, thumbIcon: toggleIcons?.thumb }} title={option.title} description={option.description} checked={bit ?? false} disabled={disabled || !canEditPermissions || option.disabled || bit === undefined} readOnly={readOnly} guiScale={guiScale} locale={locale} onCheckedChange={(next, event) => emit(undefined, option.id, next, event)} />; })}
          {kickVisible && canKickPlayer && !selected.isHosting && <div className="mc-ore-player-permissions__kick-panel"><button type="button" className="mc-ore-player-permissions__kick" disabled={disabled || readOnly || !kickEnabled} onClick={event => { if (!event.defaultPrevented && !disabled && !readOnly && kickEnabled) onKickRequest?.({ ...selected }, event); }}>{text.kick}</button></div>}
        </> : emptyContent}</div></OreScroll></div>
      </div></div></div>
    </div></ModalFrameContext.Provider>
  </section>;
});
