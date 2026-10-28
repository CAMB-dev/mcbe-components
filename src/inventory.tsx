import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, KeyboardEvent, MouseEvent, ReactNode } from 'react';

export interface InventoryItem {
  id?: string;
  name: string;
  icon?: ReactNode;
  image?: string;
  count?: number;
  /** Remaining durability, between 0 and 1. */
  durability?: number;
  lore?: readonly ReactNode[];
  nameColor?: string;
  enchanted?: boolean;
  disabled?: boolean;
}
export interface ItemTooltipProps extends HTMLAttributes<HTMLDivElement> { item: InventoryItem }
export const ItemTooltip = forwardRef<HTMLDivElement, ItemTooltipProps>(function ItemTooltip({ item, className, ...props }, ref) {
  return <div role="tooltip" {...props} ref={ref} className={['mc-item-tooltip', className].filter(Boolean).join(' ')}>
    <div className="mc-item-tooltip__name" style={{ color: item.nameColor }}>{item.name}</div>
    {item.lore?.map((line, index) => <div className="mc-item-tooltip__lore" key={index}>{line}</div>)}
    {item.durability !== undefined && <div className="mc-item-tooltip__lore">Durability: {Math.round(Math.max(0, Math.min(1, item.durability)) * 100)}%</div>}
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
  showTooltip?: boolean;
  onSecondaryAction?: (event: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>) => void;
}
export const ItemSlot = forwardRef<HTMLButtonElement, ItemSlotProps>(function ItemSlot({
  label, item, image, count: givenCount, selected = false, durability: givenDurability, placeholder,
  showTooltip = true, onSecondaryAction, children, className, type = 'button', disabled,
  onMouseEnter, onMouseLeave, onFocus, onBlur, onKeyDown, onContextMenu, ...props
}, forwardedRef) {
  const id = useId(); const node = useRef<HTMLButtonElement | null>(null);
  const tooltipNode = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false), [dismissed, setDismissed] = useState(false);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  const count = givenCount ?? item?.count;
  const amount = count === undefined ? undefined : Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  const name = label ?? item?.name ?? 'Empty slot';
  const source = image ?? item?.image, content = children ?? item?.icon;
  const occupied = amount !== 0 && !!(item || source || content);
  const rawDurability = givenDurability ?? item?.durability;
  const durability = rawDurability === undefined || !Number.isFinite(rawDurability) ? undefined : Math.max(0, Math.min(1, rawDurability));
  const tooltip = showTooltip && occupied && !dismissed && (hovered || focused);
  const tooltipItem: InventoryItem = item ?? { name, lore: amount && amount > 1 ? [`${amount} items`] : undefined, durability };
  const locate = () => {
    const bounds = node.current?.getBoundingClientRect();
    const size=tooltipNode.current?.getBoundingClientRect();
    if (bounds) setPosition({ left: Math.max(8, Math.min(bounds.right + 8, window.innerWidth - (size?.width ?? 260) - 8)), top: Math.max(8, Math.min(bounds.top, window.innerHeight - (size?.height ?? 152) - 8)) });
  };
  useEffect(()=>{
    if(!tooltip) return;
    locate(); window.addEventListener('scroll',locate,true); window.addEventListener('resize',locate);
    return ()=>{ window.removeEventListener('scroll',locate,true); window.removeEventListener('resize',locate); };
  },[tooltip]);
  return <>
    <button {...props} ref={element => { node.current = element; if (typeof forwardedRef === 'function') forwardedRef(element); else if (forwardedRef) forwardedRef.current = element; }}
      type={type} disabled={disabled || item?.disabled} aria-label={props['aria-label'] ?? [name, occupied && amount !== undefined && amount > 1 && amount, occupied && durability !== undefined && `${Math.round(durability * 100)}% durability`].filter(Boolean).join(', ')}
      aria-pressed={selected} aria-describedby={[props['aria-describedby'], tooltip && `${id}-tooltip`].filter(Boolean).join(' ') || undefined}
      data-empty={!occupied || undefined} data-missing-material={occupied && !source && !content || undefined} data-enchanted={occupied && item?.enchanted || undefined} className={['mc-slot', selected && 'mc-slot--selected', className].filter(Boolean).join(' ')}
      onMouseEnter={event => { onMouseEnter?.(event); locate(); setHovered(true); setDismissed(false); }}
      onMouseLeave={event => { onMouseLeave?.(event); setHovered(false); }}
      onFocus={event => { onFocus?.(event); locate(); setFocused(true); setDismissed(false); }}
      onBlur={event => { onBlur?.(event); setFocused(false); }}
      onKeyDown={event => { onKeyDown?.(event); if (event.defaultPrevented) return;
        if (event.key === 'Escape' && tooltip) { setDismissed(true); event.preventDefault(); event.stopPropagation(); }
        if ((event.key === 'F10' && event.shiftKey) && onSecondaryAction) { event.preventDefault(); onSecondaryAction(event); }
      }}
      onContextMenu={event => { onContextMenu?.(event); if (!event.defaultPrevented && onSecondaryAction) { event.preventDefault(); onSecondaryAction(event); } }}>
      <span className="mc-slot__item" aria-hidden="true">{occupied ? source ? <img src={source} alt="" draggable={false}/> : content : placeholder && <span className="mc-slot__placeholder">{placeholder}</span>}</span>
      {occupied && durability !== undefined && durability < 1 && <span className="mc-slot__durability" aria-hidden="true"><span style={{ width: `${Math.round(durability * 12) * 2}px`, backgroundColor: `hsl(${Math.round(durability * 120)} 100% 50%)` }}/></span>}
      {occupied && amount !== undefined && amount > 1 && <span aria-hidden="true" className="mc-slot__count">{amount}</span>}
      <span className="mc-slot__highlight" aria-hidden="true"/>
    </button>
    {tooltip && typeof document !== 'undefined' && createPortal(<ItemTooltip ref={tooltipNode} id={`${id}-tooltip`} item={tooltipItem} style={position}/>, node.current?.closest('dialog') ?? document.body)}
  </>;
});

export type InventorySlotAction = 'primary' | 'secondary';
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
  const width = Math.max(1, Math.floor(columns)); const length = Math.max(0, Math.floor(size));
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
