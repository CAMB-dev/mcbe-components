import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ImgHTMLAttributes, KeyboardEvent, MouseEvent, ReactNode } from 'react';

function stackAmount(value: number | undefined) {
  return value === undefined ? undefined : Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
function remainingDurability(value: number | undefined, max = 1) {
  return value === undefined || !Number.isFinite(value) || !Number.isFinite(max) || max <= 0
    ? undefined : Math.max(0, Math.min(max, value));
}

export interface ItemImageProps extends HTMLAttributes<HTMLSpanElement> {
  src?: string;
  alt?: string;
  imageProps?: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'>;
}
/** A 16×16 game-pixel item rendering area. No fallback artwork is generated. */
export const ItemImage = forwardRef<HTMLSpanElement, ItemImageProps>(function ItemImage({ src, alt = '', imageProps, children, className, ...props }, ref) {
  return <span {...props} ref={ref} className={['mc-slot__item', className].filter(Boolean).join(' ')}>
    {src?.trim() ? <img {...imageProps} src={src} alt={alt} draggable={imageProps?.draggable ?? false}/> : children}
  </span>;
});

export interface SlotPlaceholderProps extends HTMLAttributes<HTMLSpanElement> { src?: string; alt?: string }
export const SlotPlaceholder = forwardRef<HTMLSpanElement, SlotPlaceholderProps>(function SlotPlaceholder({ src, alt = '', children, className, ...props }, ref) {
  return <span {...props} ref={ref} className={['mc-slot__placeholder', className].filter(Boolean).join(' ')}>
    {src?.trim() ? <img src={src} alt={alt} draggable={false}/> : children}
  </span>;
});

export interface ItemCountProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> { count?: number; hideSingle?: boolean }
export const ItemCount = forwardRef<HTMLSpanElement, ItemCountProps>(function ItemCount({ count, hideSingle = true, className, ...props }, ref) {
  const amount=stackAmount(count);
  if(amount === undefined || amount === 0 || (hideSingle && amount === 1)) return null;
  return <span {...props} ref={ref} className={['mc-slot__count', className].filter(Boolean).join(' ')}>{amount}</span>;
});

export interface DurabilityBarProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  value: number;
  max?: number;
  hideWhenFull?: boolean;
  label?: string;
  /** Optional renderer-provided color; the default hue is an approximation. */
  color?: string;
}
/** JSON-derived geometry; the native progress renderer's hue/shadow still needs calibration. */
export const DurabilityBar = forwardRef<HTMLSpanElement, DurabilityBarProps>(function DurabilityBar({
  value, max = 1, hideWhenFull = true, label = 'Durability', color, className, ...props
}, ref) {
  const bounded=remainingDurability(value,max);
  if(bounded === undefined || (hideWhenFull && bounded === max)) return null;
  const ratio=bounded/max;
  return <span {...props} ref={ref} role="meter" aria-label={props['aria-label'] ?? label}
    aria-valuemin={0} aria-valuemax={max} aria-valuenow={bounded}
    aria-valuetext={props['aria-valuetext'] ?? `${Math.round(ratio*100)}%`}
    className={['mc-slot__durability',className].filter(Boolean).join(' ')}>
    <span style={{width:`${Math.round(ratio*12)*2}px`,backgroundColor:color ?? `hsl(${ratio*120} 100% 50%)`}}/>
  </span>;
});

/** Optional original-atlas text rendering; existing rich lore nodes remain intact. */
export type ItemTooltipTextRenderer = (text: string, context: { kind: 'name' | 'lore'; index: number }) => ReactNode;
export interface InventoryItem {
  id?: string;
  name: string;
  icon?: ReactNode;
  image?: string;
  count?: number;
  /** Remaining durability, between 0 and 1. */
  durability?: number;
  lore?: readonly ReactNode[];
  tooltipTextRenderer?: ItemTooltipTextRenderer;
  nameColor?: string;
  enchanted?: boolean;
  disabled?: boolean;
}
export interface ItemTooltipProps extends HTMLAttributes<HTMLDivElement> { item: InventoryItem; renderText?: ItemTooltipTextRenderer }
export const ItemTooltip = forwardRef<HTMLDivElement, ItemTooltipProps>(function ItemTooltip({ item, renderText = item.tooltipTextRenderer, className, ...props }, ref) {
  return <div role="tooltip" {...props} ref={ref} className={['mc-item-tooltip', className].filter(Boolean).join(' ')}>
    <div className="mc-item-tooltip__name" style={{ color: item.nameColor }}>{renderText ? renderText(item.name, { kind: 'name', index: 0 }) : item.name}</div>
    {item.lore?.map((line, index) => <div className="mc-item-tooltip__lore" key={index}>{renderText && typeof line === 'string' ? renderText(line, { kind: 'lore', index }) : line}</div>)}
  </div>;
});

export interface ItemSlotProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  item?: InventoryItem | null;
  image?: string;
  count?: number;
  selected?: boolean;
  /** Remaining durability, between 0 and 1. */
  durability?: number;
  placeholder?: ReactNode;
  /** Original slot overlay drawn below item art, including when occupied. */
  underlay?: ReactNode;
  showTooltip?: boolean;
  onSecondaryAction?: (event: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>) => void;
}
export const ItemSlot = forwardRef<HTMLButtonElement, ItemSlotProps>(function ItemSlot({
  label, item, image, count: givenCount, selected = false, durability: givenDurability, placeholder, underlay,
  showTooltip = true, onSecondaryAction, children, className, type = 'button', disabled,
  onMouseEnter, onMouseMove, onMouseLeave, onFocus, onBlur, onKeyDown, onContextMenu, ...props
}, forwardedRef) {
  const id = useId(); const node = useRef<HTMLButtonElement | null>(null);
  const tooltipNode = useRef<HTMLDivElement | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false), [dismissed, setDismissed] = useState(false);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  const count = givenCount ?? item?.count;
  const amount = stackAmount(count);
  const name = label ?? item?.name ?? 'Empty slot';
  const source = (image ?? item?.image)?.trim() || undefined, content = children ?? item?.icon;
  const occupied = amount !== 0 && !!(item || source || content);
  const rawDurability = givenDurability ?? item?.durability;
  const durability = remainingDurability(rawDurability);
  const tooltip = showTooltip && occupied && !dismissed && (hovered || focused);
  const tooltipItem: InventoryItem = item ? { ...item, durability } : { name, lore: amount && amount > 1 ? [`${amount} items`] : undefined, durability };
  const locate = () => {
    const bounds = node.current?.getBoundingClientRect();
    const size=tooltipNode.current?.getBoundingClientRect();
    // Cursor-relative Web profile. Native captures prove tracking, but the
    // physical-pixel/client mapping does not certify these CSS offsets.
    if (bounds) setPosition({ left: Math.max(8, Math.min(pointer.current ? pointer.current.x + 24 : bounds.right + 8, window.innerWidth - (size?.width ?? 260) - 8)), top: Math.max(8, Math.min(pointer.current ? pointer.current.y - 24 : bounds.top, window.innerHeight - (size?.height ?? 152) - 8)) });
  };
  useEffect(()=>{
    if(!tooltip) return;
    locate(); window.addEventListener('scroll',locate,true); window.addEventListener('resize',locate);
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(locate);
    if (tooltipNode.current) observer?.observe(tooltipNode.current);
    return ()=>{ observer?.disconnect(); window.removeEventListener('scroll',locate,true); window.removeEventListener('resize',locate); };
  },[tooltip]);
  return <>
    <button {...props} ref={element => { node.current = element; if (typeof forwardedRef === 'function') forwardedRef(element); else if (forwardedRef) forwardedRef.current = element; }}
      type={type} disabled={disabled || item?.disabled} aria-label={props['aria-label'] ?? [name, occupied && amount !== undefined && amount > 1 && amount, occupied && durability !== undefined && `${Math.round(durability * 100)}% durability`].filter(Boolean).join(', ')}
      aria-pressed={selected} aria-describedby={[props['aria-describedby'], tooltip && `${id}-tooltip`].filter(Boolean).join(' ') || undefined}
      data-empty={!occupied || undefined} data-missing-material={occupied && !source && !content || undefined} data-enchanted={occupied && item?.enchanted || undefined} className={['mc-slot', selected && 'mc-slot--selected', className].filter(Boolean).join(' ')}
      onMouseEnter={event => { onMouseEnter?.(event); pointer.current = { x: event.clientX, y: event.clientY }; locate(); setHovered(true); setDismissed(false); }}
      onMouseMove={event => { onMouseMove?.(event); pointer.current = { x: event.clientX, y: event.clientY }; locate(); }}
      onMouseLeave={event => { onMouseLeave?.(event); pointer.current = null; setHovered(false); locate(); }}
      onFocus={event => { onFocus?.(event); pointer.current = null; locate(); setFocused(true); setDismissed(false); }}
      onBlur={event => { onBlur?.(event); setFocused(false); }}
      onKeyDown={event => { onKeyDown?.(event); if (event.defaultPrevented) return;
        if (event.key === 'Escape' && tooltip) { setDismissed(true); event.preventDefault(); event.stopPropagation(); }
        if ((event.key === 'F10' && event.shiftKey) && onSecondaryAction) { event.preventDefault(); onSecondaryAction(event); }
      }}
      onContextMenu={event => { onContextMenu?.(event); if (!event.defaultPrevented && onSecondaryAction) { event.preventDefault(); onSecondaryAction(event); } }}>
      {underlay && <span className="mc-slot__underlay" aria-hidden="true">{underlay}</span>}
      <ItemImage aria-hidden="true" src={occupied ? source : undefined}>{occupied ? content : placeholder && <SlotPlaceholder>{placeholder}</SlotPlaceholder>}</ItemImage>
      {occupied && durability !== undefined && <DurabilityBar value={durability} aria-hidden="true"/>}
      {occupied && <ItemCount count={amount} aria-hidden="true"/>}
      <span className="mc-slot__highlight" aria-hidden="true"/>
    </button>
    {tooltip && typeof document !== 'undefined' && createPortal(<ItemTooltip ref={tooltipNode} id={`${id}-tooltip`} item={tooltipItem} style={position}/>, node.current?.closest('dialog') ?? document.body)}
  </>;
});

export type InventorySlotAction = 'primary' | 'secondary';
export interface ResultSlotProps extends ItemSlotProps {
  /** False keeps the slot focusable but prevents taking the result. */
  available?: boolean;
  size?: 'normal' | 'large';
  onTake?: (action: InventorySlotAction, event: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>) => void;
}
export const ResultSlot = forwardRef<HTMLButtonElement, ResultSlotProps>(function ResultSlot({
  available = true, size = 'normal', onTake, onClick, onSecondaryAction, onContextMenu, onKeyDown,
  className, disabled, item, image, children, count, ...props
}, ref) {
  const occupied=stackAmount(count ?? item?.count) !== 0 && !!(item || image?.trim() || children);
  const ariaDisabled=props['aria-disabled'] === true || props['aria-disabled'] === 'true';
  const canTake=available && occupied && !disabled && !item?.disabled && !ariaDisabled;
  return <ItemSlot {...props} ref={ref} item={item} image={image} count={count} disabled={disabled}
    aria-disabled={!canTake || undefined} data-result-unavailable={!canTake || undefined}
    className={['mc-result-slot',size === 'large' && 'mc-result-slot--large',className].filter(Boolean).join(' ')}
    onClick={event=>{
      if(!canTake) {event.preventDefault();event.stopPropagation();return;}
      onClick?.(event);if(!event.defaultPrevented) onTake?.('primary',event);
    }}
    onContextMenu={event=>{
      if(!canTake) {event.preventDefault();event.stopPropagation();return;}
      onContextMenu?.(event);
    }}
    onKeyDown={event=>{
      if(!canTake && event.shiftKey && event.key === 'F10') {event.preventDefault();event.stopPropagation();return;}
      onKeyDown?.(event);
    }}
    onSecondaryAction={event=>{if(canTake) {onSecondaryAction?.(event);onTake?.('secondary',event);}}}>
    {children}
  </ItemSlot>;
});

export interface InventoryGridProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  label: string;
  items: readonly (InventoryItem | null)[];
  columns?: number;
  size?: number;
  selectedIndex?: number;
  defaultSelectedIndex?: number;
  onSelectionChange?: (index: number) => void;
  onSlotAction?: (index: number, action: InventorySlotAction) => void;
}
export const InventoryGrid = forwardRef<HTMLDivElement, InventoryGridProps>(function InventoryGrid({
  label, items, columns = 9, size = items.length, selectedIndex, defaultSelectedIndex = -1,
  onSelectionChange, onSlotAction, className, style, onKeyDown, ...props
}, ref) {
  const width = Number.isFinite(columns) && columns > 0 ? Math.max(1, Math.floor(columns)) : 9;
  const length = Number.isFinite(size) && size >= 0 ? Math.floor(size) : items.length;
  const [internal, setInternal] = useState(defaultSelectedIndex), [focused, setFocused] = useState(0);
  const selected = selectedIndex ?? internal; const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const firstEnabled = Array.from({length}, (_,index)=>index).find(index=>!items[index]?.disabled) ?? -1;
  const active = focused < length && !items[focused]?.disabled ? focused : firstEnabled;
  return <div className="mc-inventory-scroll"><div {...props} ref={ref} role="grid" aria-label={label}
    aria-rowcount={Math.ceil(length / width)} aria-colcount={width}
    className={['mc-inventory', className].filter(Boolean).join(' ')} style={{ ...style, '--mc-inventory-columns': width } as CSSProperties}
    onKeyDown={event => {
      onKeyDown?.(event); if(event.defaultPrevented) return;
      const from = buttons.current.findIndex(button=>button === event.target); if(from < 0) return;
      const rtl=getComputedStyle(event.currentTarget).direction === 'rtl';
      const direction=event.key === 'ArrowRight' ? (rtl ? -1 : 1) : event.key === 'ArrowLeft' ? (rtl ? 1 : -1) : event.key === 'ArrowDown' ? width : event.key === 'ArrowUp' ? -width : 0;
      let next=from;
      if(direction) { next=from+direction; while(next>=0 && next<length && items[next]?.disabled) next+=direction; }
      else if(event.key === 'Home') next=event.ctrlKey ? 0 : Math.floor(from/width)*width;
      else if(event.key === 'End') next=event.ctrlKey ? length-1 : Math.min(length-1,Math.floor(from/width)*width+width-1);
      else return;
      event.preventDefault(); if(next>=0 && next<length && !items[next]?.disabled) { setFocused(next); buttons.current[next]?.focus(); }
    }}>
    {Array.from({length:Math.ceil(length/width)},(_,row)=><div role="row" key={row}>
      {Array.from({length:Math.min(width,length-row*width)},(_,column)=>{ const index=row*width+column, item=items[index] ?? null;
        return <div role="gridcell" aria-selected={selected===index} key={index}><ItemSlot ref={button=>{buttons.current[index]=button;}}
          label={item?.name ?? `Empty slot ${index+1}`} item={item} selected={selected===index} tabIndex={index===active ? 0 : -1}
          onFocus={()=>setFocused(index)} onClick={()=>{if(selectedIndex===undefined) setInternal(index); onSelectionChange?.(index); onSlotAction?.(index,'primary');}}
          onSecondaryAction={()=>onSlotAction?.(index,'secondary')}/></div>;
      })}
    </div>)}
  </div></div>;
});
