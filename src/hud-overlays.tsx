import { forwardRef, useEffect, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { Button } from './components';
import { ScrollArea } from './scroll-area';
import { Text } from './text';

const cx = (...values: (string | false | undefined)[]) => values.filter(Boolean).join(' ');
const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;
const opacityValue = (value: number) => Math.min(1, Math.max(0, finite(value)));
const background = (value: number): CSSProperties => ({ opacity: opacityValue(value) });
type OverlayAttributes = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'color'>;
export type BossBarColor = readonly [red: number, green: number, blue: number];
export interface BossBarProps extends OverlayAttributes {
  name: ReactNode;
  value: number;
  max?: number;
  label?: string;
  /** Native #bar_color RGB multipliers, between 0 and 1. Neutral by default. */
  color?: BossBarColor;
}
function multiplyColor(value: BossBarColor) {
  const channels = value.map(opacityValue);
  if (channels.every(channel => channel === 1)) return undefined;
  // A color transform only: the bar's artwork and alpha are the original PNG.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><filter id="t" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="linear" slope="${channels[0]}"/><feFuncG type="linear" slope="${channels[1]}"/><feFuncB type="linear" slope="${channels[2]}"/></feComponentTransfer></filter></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}#t")`;
}
/** Source-defined 182×20 panel and 182×5 nine-slice track, at GUI scale 2. */
export const BossBar = forwardRef<HTMLDivElement, BossBarProps>(function BossBar({ name, value, max = 1, label, color = [1, 1, 1], className, ...props }, ref) {
  const maximum = Number.isFinite(max) && max > 0 ? max : 1;
  const amount = Math.min(maximum, Math.max(0, finite(value)));
  return <div {...props} ref={ref} role="meter" aria-label={props['aria-label'] ?? label ?? (typeof name === 'string' ? name : 'Boss health')}
    aria-valuemin={0} aria-valuemax={maximum} aria-valuenow={amount} className={cx('mc-boss-bar', className)} data-fidelity="source-layout">
    <Text className="mc-boss-bar__name">{name}</Text>
    <span className="mc-boss-bar__track" aria-hidden="true"><span className="mc-boss-bar__empty"/>
      <span className="mc-boss-bar__clip" style={{ width: `${amount / maximum * 100}%` }}><span className="mc-boss-bar__fill" style={{ filter: multiplyColor(color) }}/></span>
    </span>
  </div>;
});

export interface ChatMessageProps extends HTMLAttributes<HTMLDivElement> {
  backgroundOpacity?: number; opacity?: number; color?: string; shadow?: boolean;
}
/** Text is already formatted by the caller; no command, localization or profanity engine. */
export const ChatMessage = forwardRef<HTMLDivElement, ChatMessageProps>(function ChatMessage({ backgroundOpacity = .5, opacity = 1, color, shadow = true, children, className, style, ...props }, ref) {
  return <div {...props} ref={ref} className={cx('mc-chat-message', className)} style={{ opacity: opacityValue(opacity), ...style }}>
    <span className="mc-chat-message__background" aria-hidden="true" style={background(backgroundOpacity)}/>
    <Text className="mc-chat-message__text" shadow={shadow} style={{ color }}>{children}</Text>
  </div>;
});
export interface ChatMessageData { id: string; text: ReactNode }
export interface ChatPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onSubmit' | 'onChange' | 'defaultValue'> {
  messages: readonly ChatMessageData[];
  input?: boolean;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSend?: (message: string) => void;
  disabled?: boolean;
  label?: string;
  inputLabel?: string;
  submitLabel?: string;
  backgroundOpacity?: number;
  /** Native factory limit is 50; lower limits are allowed. */
  maxMessages?: number;
}
/** HUD messages plus an optional Web input composition; no game/server transport. */
export const ChatPanel = forwardRef<HTMLDivElement, ChatPanelProps>(function ChatPanel({
  messages, input = false, value, defaultValue = '', onValueChange, onSend, disabled = false, label = 'Chat',
  inputLabel = 'Chat message', submitLabel = 'Send', backgroundOpacity = .5, maxMessages = 50, className, ...props
}, ref) {
  const [internal, setInternal] = useState(defaultValue), draft = value ?? internal;
  const viewport = useRef<HTMLDivElement>(null), stickToEnd = useRef(true), composing = useRef(false);
  const limit = Math.min(50, Math.max(0, Math.floor(finite(maxMessages, 50))));
  const visible = limit === 0 ? [] : messages.slice(-limit);
  useEffect(() => {
    const node = viewport.current;
    if (node && stickToEnd.current) node.scrollTop = node.scrollHeight;
  }, [messages, limit]);
  function change(next: string) { if (value === undefined) setInternal(next); onValueChange?.(next); }
  return <div {...props} ref={ref} role={props.role ?? 'region'} className={cx('mc-chat-panel', className)} aria-label={props['aria-label'] ?? label}>
    <ScrollArea className="mc-chat-panel__messages" viewportRef={viewport} label={`${label} messages`}
      viewportProps={{ role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions text', 'aria-atomic': false,
        onScroll: event => { const node = event.currentTarget; stickToEnd.current = node.scrollHeight - node.clientHeight - node.scrollTop <= 4; } }}>
      {visible.map(message => <ChatMessage key={message.id} data-message-id={message.id} backgroundOpacity={backgroundOpacity}>{message.text}</ChatMessage>)}
    </ScrollArea>
    {input && <form className="mc-chat-panel__form" onSubmit={event => {
      event.preventDefault(); const message = draft.trim();
      if (disabled || composing.current || !message || !onSend) return;
      onSend(message); change('');
    }}>
      <input className="mc-input mc-chat-panel__input" aria-label={inputLabel} value={draft} disabled={disabled}
        onChange={event => change(event.currentTarget.value)} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}/>
      <Button className="mc-chat-panel__submit" type="submit" disabled={disabled || !onSend || !draft.trim()}>{submitLabel}</Button>
    </form>}
  </div>;
});

export interface ScoreboardEntry { id: string; name: ReactNode; score: number | string }
export interface ScoreboardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
  title: ReactNode; entries: readonly ScoreboardEntry[]; backgroundOpacity?: number; titleBackgroundOpacity?: number; label?: string;
}
/** The public scoreboards.json sidebar layout; rows remain in caller-provided order. */
export const Scoreboard = forwardRef<HTMLDivElement, ScoreboardProps>(function Scoreboard({ title, entries, backgroundOpacity = .5, titleBackgroundOpacity = .5, label = 'Scoreboard', className, ...props }, ref) {
  return <div {...props} ref={ref} role="table" aria-label={props['aria-label'] ?? label} className={cx('mc-scoreboard', className)} data-fidelity="source-layout">
    <span className="mc-scoreboard__background" style={background(backgroundOpacity)} aria-hidden="true"/>
    <span className="mc-scoreboard__title-background" style={background(titleBackgroundOpacity)} aria-hidden="true"/>
    <div className="mc-scoreboard__title" role="row"><Text role="columnheader" aria-colspan={2} shadow={false}>{title}</Text></div>
    <div className="mc-scoreboard__list" role="rowgroup">{entries.map(entry => <div className="mc-scoreboard__row" role="row" key={entry.id}>
      <Text className="mc-scoreboard__name" role="cell" shadow={false}>{entry.name}</Text>
      <Text className="mc-scoreboard__score" role="cell" shadow={false}>{typeof entry.score === 'number' ? finite(entry.score) : entry.score}</Text>
    </div>)}</div>
  </div>;
});

export type BedrockStatusEffect = 'absorption' | 'bad-omen' | 'blindness' | 'breath-of-the-nautilus' | 'conduit-power' | 'darkness' | 'fire-resistance' | 'haste' | 'health-boost' | 'hunger' | 'infested' | 'invisibility' | 'jump-boost' | 'levitation' | 'mining-fatigue' | 'nausea' | 'night-vision' | 'oozing' | 'poison' | 'raid-omen' | 'regeneration' | 'resistance' | 'slow-falling' | 'slowness' | 'speed' | 'strength' | 'trial-omen' | 'village-hero' | 'water-breathing' | 'weakness' | 'weaving' | 'wind-charged' | 'wither';
export interface StatusEffectProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  name: string; effect?: BedrockStatusEffect; iconSrc?: string; ambient?: boolean; duration?: string; opacity?: number;
}
/** Original status PNGs; HUD slot placement is a declared custom-renderer reconstruction. */
export const StatusEffect = forwardRef<HTMLSpanElement, StatusEffectProps>(function StatusEffect({ name, effect, iconSrc, ambient = false, duration, opacity = 1, className, style, ...props }, ref) {
  const source = iconSrc?.trim();
  return <span {...props} ref={ref} role="img" aria-label={props['aria-label'] ?? [name, duration].filter(Boolean).join(', ')} title={props.title ?? [name, duration].filter(Boolean).join(' — ')}
    data-fidelity="renderer-reconstruction" data-effect={effect} data-ambient={ambient || undefined}
    className={cx('mc-status-effect', className)} style={{ opacity: opacityValue(opacity), ...style }}>
    <span className="mc-status-effect__background" aria-hidden="true"/>
    {source ? <img className="mc-status-effect__icon" src={source} alt="" draggable={false}/> : effect && <span className="mc-status-effect__icon" aria-hidden="true" style={{ backgroundImage: `var(--mc-hud-overlay-texture-effect-${effect})` }}/>}
  </span>;
});

interface TextOverlayProps extends HTMLAttributes<HTMLDivElement> {
  showBackground?: boolean; backgroundOpacity?: number; opacity?: number; shadow?: boolean;
}
export interface ActionBarProps extends TextOverlayProps {}
export const ActionBar = forwardRef<HTMLDivElement, ActionBarProps>(function ActionBar({ children, showBackground = false, backgroundOpacity = .5, opacity = 1, shadow = true, className, style, ...props }, ref) {
  return <div {...props} ref={ref} role={props.role ?? 'status'} aria-atomic={props['aria-atomic'] ?? true} className={cx('mc-action-bar', className)} style={{ opacity: opacityValue(opacity), ...style }}>
    {showBackground && <span className="mc-action-bar__background mc-hud-overlay-tip" aria-hidden="true" style={background(backgroundOpacity)}/>}
    <Text className="mc-action-bar__text" shadow={shadow}>{children}</Text>
  </div>;
});
export interface HeldItemTooltipProps extends TextOverlayProps { color?: string }
/** Held-item HUD text, distinct from an inventory hover tooltip. No automatic lifetime. */
export const HeldItemTooltip = forwardRef<HTMLDivElement, HeldItemTooltipProps>(function HeldItemTooltip({ children, showBackground = false, backgroundOpacity = .5, opacity = 1, shadow = true, color, className, style, ...props }, ref) {
  return <div {...props} ref={ref} role={props.role ?? 'status'} aria-atomic={props['aria-atomic'] ?? true} data-background={showBackground || undefined} className={cx('mc-held-item-tooltip', className)} style={{ opacity: opacityValue(opacity), ...style }}>
    {showBackground && <span className="mc-held-item-tooltip__background mc-hud-overlay-tip" aria-hidden="true" style={background(backgroundOpacity)}/>}
    <Text className="mc-held-item-tooltip__text" shadow={shadow} style={{ color }}>{children}</Text>
  </div>;
});
export interface TitleOverlayProps extends Omit<TextOverlayProps, 'children' | 'title'> { title: ReactNode; subtitle?: ReactNode }
/** Source label offsets and font enums; numeric Web font mapping needs native calibration. */
export const TitleOverlay = forwardRef<HTMLDivElement, TitleOverlayProps>(function TitleOverlay({ title, subtitle, showBackground = false, backgroundOpacity = .5, opacity = 1, shadow = true, className, style, ...props }, ref) {
  return <div {...props} ref={ref} role={props.role ?? 'status'} aria-atomic={props['aria-atomic'] ?? true} className={cx('mc-title-overlay', className)} style={{ opacity: opacityValue(opacity), ...style }}>
    <div className="mc-title-overlay__title-frame">
      {showBackground && <span className="mc-title-overlay__title-background mc-hud-overlay-tip" aria-hidden="true" style={background(backgroundOpacity)}/>}
      <Text className="mc-title-overlay__title" size="xl" shadow={shadow}>{title}</Text>
    </div>
    {subtitle !== undefined && <div className="mc-title-overlay__subtitle-frame">
      {showBackground && <span className="mc-title-overlay__subtitle-background mc-hud-overlay-tip" aria-hidden="true" style={background(backgroundOpacity)}/>}
      <Text className="mc-title-overlay__subtitle" size="lg" shadow={shadow}>{subtitle}</Text>
    </div>}
  </div>;
});
