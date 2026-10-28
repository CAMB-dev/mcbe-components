import { forwardRef, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';
import { DurabilityBar, ItemCount, ItemImage } from './inventory';
import type { InventoryItem, InventorySlotAction } from './inventory';

const classes = (...values: (string | false | undefined)[]) => values.filter(Boolean).join(' ');
const finite = (value: number | undefined, fallback = 0) => value !== undefined && Number.isFinite(value) ? value : fallback;
const bounded = (value: number | undefined, max: number, fallback = 0) => Math.min(max, Math.max(0, finite(value, fallback)));
const integer = (value: number | undefined, max: number, fallback = 0) => Math.floor(bounded(value, max, fallback));
type IconState = 'full' | 'half' | 'empty' | 'pop' | 'hidden';
type StatBaseProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & { label?: string };
export interface HealthBarProps extends StatBaseProps {
  value?: number;
  variant?: 'normal' | 'poison' | 'wither' | 'frozen' | 'absorption';
  flashing?: boolean;
}
export interface HungerBarProps extends StatBaseProps { value?: number; effect?: boolean; flashing?: boolean }
export interface ArmorBarProps extends StatBaseProps { value?: number }
export type AirBubbleState = 'full' | 'empty' | 'pop' | 'hidden';
export interface AirBarProps extends StatBaseProps {
  /** A convenience full-bubble count, not the native engine's underwater ticks. */
  value?: number;
  /** Explicit renderer states; overrides value. Unspecified trailing bubbles are hidden. */
  states?: readonly AirBubbleState[];
}
function points(value: number, index: number): IconState { return value >= (index + 1) * 2 ? 'full' : value === index * 2 + 1 ? 'half' : 'empty'; }
function texture(key: string): CSSProperties { return { backgroundImage: `var(--mc-hud-texture-${key})` }; }
interface StatVisualProps extends StatBaseProps {
  kind: string; value: number; max: number; states: readonly IconState[];
  background?: string; full: string; half?: string; empty?: string; pop?: string; reverse?: boolean;
}
const StatVisual = forwardRef<HTMLDivElement, StatVisualProps>(function StatVisual({
  kind, value, max, states, background, full, half, empty, pop, reverse, label, className, ...props
}, ref) {
  return <div {...props} ref={ref} role="meter" aria-label={props['aria-label'] ?? label}
    aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}
    data-kind={kind} data-fidelity="renderer-reconstruction"
    className={classes('mc-hud-stat', reverse && 'mc-hud-stat--reverse', className)}>
    {states.map((state, index) => <span key={index} className="mc-hud-stat__icon" data-state={state} aria-hidden="true">
      {background && state !== 'hidden' && <span className="mc-hud-stat__background" style={texture(background)}/>}
      {state !== 'hidden' && <span className="mc-hud-stat__fill" style={texture(state === 'full' ? full : state === 'half' ? half ?? full : state === 'pop' ? pop ?? full : empty ?? background ?? full)}/>}
    </span>)}
  </div>;
});
/** Original Bedrock glyphs. The public custom renderer does not specify the 8px web row step. */
export const HealthBar = forwardRef<HTMLDivElement, HealthBarProps>(function HealthBar({ value = 20, variant = 'normal', flashing = false, label = 'Health', ...props }, ref) {
  const amount = integer(value, 20), prefix = variant === 'normal' ? 'heart' : variant === 'frozen' ? 'freeze-heart' : `${variant}-heart`;
  const flash = flashing && variant !== 'absorption';
  const full = variant === 'normal' ? `heart${flash ? '-flash' : ''}` : `${prefix}${flash ? '-flash' : ''}`;
  return <StatVisual {...props} ref={ref} kind="health" value={amount} max={20} label={label}
    background="heart-background" full={full} half={`${full}-half`} empty="heart-background"
    states={Array.from({ length: 10 }, (_, index) => points(amount, index))}/>;
});
export const HungerBar = forwardRef<HTMLDivElement, HungerBarProps>(function HungerBar({ value = 20, effect = false, flashing = false, label = 'Hunger', ...props }, ref) {
  const amount = integer(value, 20), prefix = `hunger${effect ? '-effect' : ''}${flashing ? '-flash' : ''}`;
  return <StatVisual {...props} ref={ref} kind="hunger" value={amount} max={20} label={label} reverse
    background={effect ? 'hunger-effect-background' : 'hunger-background'}
    full={`${prefix}-full`} half={`${prefix}-half`} empty={effect ? 'hunger-effect-background' : 'hunger-background'}
    states={Array.from({ length: 10 }, (_, index) => points(amount, index))}/>;
});
export const ArmorBar = forwardRef<HTMLDivElement, ArmorBarProps>(function ArmorBar({ value = 0, label = 'Armor', ...props }, ref) {
  const amount = integer(value, 20);
  return <StatVisual {...props} ref={ref} kind="armor" value={amount} max={20} label={label}
    full="armor-full" half="armor-half" empty="armor-empty"
    states={Array.from({ length: 10 }, (_, index) => points(amount, index))}/>;
});
export const AirBar = forwardRef<HTMLDivElement, AirBarProps>(function AirBar({ value = 10, states, label = 'Air', ...props }, ref) {
  const amount = integer(value, 10), accepted = new Set(['full', 'empty', 'pop', 'hidden']);
  const visual = Array.from({ length: 10 }, (_, index): AirBubbleState => {
    const state = states?.[index]; return states ? state && accepted.has(state) ? state : 'hidden' : index < amount ? 'full' : 'hidden';
  });
  const filled = visual.filter(state => state === 'full').length;
  return <StatVisual {...props} ref={ref} kind="air" value={filled} max={10} label={label} reverse
    aria-valuetext={props['aria-valuetext'] ?? `${filled} full bubbles`}
    full="bubble" empty="bubble-empty" pop="bubble-pop" states={visual}/>;
});

export interface ExperienceBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  progress?: number; level?: number; showLevel?: boolean; label?: string;
}
export const ExperienceBar = forwardRef<HTMLDivElement, ExperienceBarProps>(function ExperienceBar({
  progress = 0, level = 0, showLevel = true, label = 'Experience', className, ...props
}, ref) {
  const ratio = bounded(progress, 1), displayLevel = integer(level, Number.MAX_SAFE_INTEGER);
  return <div {...props} ref={ref} role="progressbar" aria-label={props['aria-label'] ?? label}
    aria-valuemin={0} aria-valuemax={1} aria-valuenow={ratio}
    aria-valuetext={props['aria-valuetext'] ?? `${Math.round(ratio * 100)}%, level ${displayLevel}`}
    className={classes('mc-experience-bar', className)}>
    <span className="mc-experience-bar__empty" aria-hidden="true"/>
    <span className="mc-experience-bar__clip" style={{ width: `${ratio * 100}%` }} aria-hidden="true"><span className="mc-experience-bar__fill"/></span>
    <span className="mc-experience-bar__nub" aria-hidden="true"/>
    {showLevel && displayLevel > 0 && <span className="mc-experience-bar__level" aria-hidden="true">{displayLevel}</span>}
  </div>;
});

export interface HotbarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onChange'> {
  items?: readonly (InventoryItem | null)[];
  selectedIndex?: number;
  defaultSelectedIndex?: number;
  disabled?: boolean;
  label?: string;
  onSelectionChange?: (index: number) => void;
  onSlotAction?: (index: number, action: InventorySlotAction) => void;
}
/** Nine source-sized HUD cells. Application owns global number/wheel/game-input bindings. */
export const Hotbar = forwardRef<HTMLDivElement, HotbarProps>(function Hotbar({
  items = [], selectedIndex, defaultSelectedIndex = 0, disabled = false, label = 'Hotbar',
  onSelectionChange, onSlotAction, className, onKeyDown, ...props
}, ref) {
  const [uncontrolled, setUncontrolled] = useState(integer(defaultSelectedIndex, 8));
  const selected = integer(selectedIndex, 8, uncontrolled);
  const [focused, setFocused] = useState(selected);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = Array.from({ length: 9 }, (_, index) => index).filter(index => !disabled && !items[index]?.disabled);
  const tabIndex = enabled.includes(focused) ? focused : enabled.includes(selected) ? selected : enabled[0];
  function activate(index: number, action: InventorySlotAction) {
    if (disabled || items[index]?.disabled) return;
    if (action === 'primary') { if (selectedIndex === undefined) setUncontrolled(index); if (selected !== index) onSelectionChange?.(index); }
    onSlotAction?.(index, action);
  }
  return <div {...props} ref={ref} role="toolbar" aria-label={props['aria-label'] ?? label}
    aria-orientation="horizontal" aria-disabled={disabled || undefined} className={classes('mc-hotbar', className)}
    onKeyDown={event => {
      onKeyDown?.(event); if (event.defaultPrevented || !enabled.length || !buttons.current.includes(event.target as HTMLButtonElement)) return;
      const current = buttons.current.indexOf(event.target as HTMLButtonElement), position = enabled.indexOf(current);
      const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      let next: number | undefined;
      if (event.key === 'Home') next = enabled[0]; else if (event.key === 'End') next = enabled[enabled.length - 1];
      else if (direction) next = enabled[(position + direction + enabled.length) % enabled.length];
      if (next !== undefined) { event.preventDefault(); setFocused(next); buttons.current[next]?.focus(); }
    }}>
    <span className="mc-hotbar__cap mc-hotbar__cap--start" aria-hidden="true"/>
    {Array.from({ length: 9 }, (_, index) => {
      const item = items[index], count = item?.count === undefined ? undefined : integer(item.count, Number.MAX_SAFE_INTEGER);
      const occupied = !!item && count !== 0;
      const durability = item?.durability !== undefined && Number.isFinite(item.durability) ? bounded(item.durability, 1) : undefined;
      return <button key={index} ref={node => { buttons.current[index] = node; }} type="button"
        className="mc-hotbar__slot" style={texture(`hotbar-${index}`)}
        disabled={disabled || item?.disabled} tabIndex={index === tabIndex ? 0 : -1} aria-pressed={index === selected}
        aria-label={[`Slot ${index + 1}`, occupied ? item.name : 'Empty', occupied && count !== undefined && count > 1 ? count : '', occupied && durability !== undefined ? `${Math.round(durability * 100)}% durability` : ''].filter(Boolean).join(', ')}
        data-empty={!occupied || undefined} data-selected={index === selected || undefined} data-enchanted={occupied && item?.enchanted || undefined}
        onFocus={() => setFocused(index)} onClick={() => activate(index, 'primary')}
        onContextMenu={event => { if (onSlotAction) { event.preventDefault(); activate(index, 'secondary'); } }}
        onKeyDown={event => { if (event.key === 'F10' && event.shiftKey && onSlotAction) { event.preventDefault(); activate(index, 'secondary'); } }}>
        {index === selected && <span className="mc-hotbar__selected" aria-hidden="true"/>}
        <span className="mc-hotbar__inner" aria-hidden="true">
          {occupied && <><ItemImage src={item.image}>{item.icon}</ItemImage><ItemCount count={count}/>{durability !== undefined && <DurabilityBar value={durability}/>}</>}
        </span>
      </button>;
    })}
    <span className="mc-hotbar__cap mc-hotbar__cap--end" aria-hidden="true"/>
  </div>;
});

export interface CrosshairProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Difference follows the native white-glyph destination inversion on opaque surfaces. */
  blendMode?: 'difference' | 'normal'; label?: string;
}
/** Original icons.png crop selected by Bedrock's native compatibility mapping. */
export const Crosshair = forwardRef<HTMLSpanElement, CrosshairProps>(function Crosshair({ blendMode = 'difference', label = 'Crosshair', className, style, ...props }, ref) {
  return <span {...props} ref={ref} role="img" aria-label={props['aria-label'] ?? label}
    className={classes('mc-crosshair', className)} style={{ mixBlendMode: blendMode, ...style }}/>;
});
