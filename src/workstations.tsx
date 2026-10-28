import { forwardRef, useId, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, KeyboardEvent, ReactNode } from 'react';
import { InventoryGrid, ItemSlot } from './inventory';
import type { InventoryItem, InventorySlotAction } from './inventory';

export interface PlayerInventoryProps extends HTMLAttributes<HTMLDivElement> {
  items?: readonly (InventoryItem | null)[];
  hotbar?: readonly (InventoryItem | null)[];
  label?: string;
  hotbarLabel?: string;
  selectedIndex?: number;
  onSelectionChange?: (index: number) => void;
  onSlotAction?: (index: number, action: InventorySlotAction) => void;
}
export const PlayerInventory = forwardRef<HTMLDivElement, PlayerInventoryProps>(function PlayerInventory({
  items = [], hotbar = [], label = 'Inventory', hotbarLabel = 'Hotbar', selectedIndex,
  onSelectionChange, onSlotAction, className, ...props
}, ref) {
  const [internal, setInternal] = useState(-1); const selected = selectedIndex ?? internal;
  const select = (index: number) => { if(selectedIndex===undefined) setInternal(index); onSelectionChange?.(index); };
  return <div {...props} ref={ref} className={['mc-player-inventory',className].filter(Boolean).join(' ')}>
    <div className="mc-player-inventory__label">{label}</div>
    <InventoryGrid label={label} items={items} size={27} selectedIndex={selected} onSelectionChange={select} onSlotAction={onSlotAction}/>
    <div className="mc-player-inventory__hotbar"><InventoryGrid label={hotbarLabel} items={hotbar} size={9} selectedIndex={selected-27}
      onSelectionChange={index=>select(index+27)} onSlotAction={(index,action)=>onSlotAction?.(index+27,action)}/></div>
  </div>;
});

export interface WorkstationFrameProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: string;
  onClose?: () => void;
  closeLabel?: string;
  inventory?: readonly (InventoryItem | null)[];
  hotbar?: readonly (InventoryItem | null)[];
  inventoryLabel?: string;
  onInventoryAction?: (index: number, action: InventorySlotAction) => void;
}
export const WorkstationFrame = forwardRef<HTMLElement, WorkstationFrameProps>(function WorkstationFrame({
  title, onClose, closeLabel = 'Close container', inventory, hotbar, inventoryLabel,
  onInventoryAction, children, className, ...props
}, ref) {
  const id=useId();
  return <div className="mc-workstation-scroll"><section {...props} ref={ref} aria-labelledby={`${id}-title`}
    className={['mc-workstation',className].filter(Boolean).join(' ')}>
    <h2 id={`${id}-title`} className="mc-workstation__title">{title}</h2>
    {onClose && <button type="button" className="mc-dialog__close" aria-label={closeLabel} onClick={onClose}><span className="mc-dialog__close-icon" aria-hidden="true"/></button>}
    {children}
    <PlayerInventory className="mc-workstation__inventory" items={inventory} hotbar={hotbar} label={inventoryLabel} onSlotAction={onInventoryAction}/>
  </section></div>;
});

export interface GrindstoneProps extends Omit<WorkstationFrameProps,'children'|'title'> {
  title?: string;
  inputs?: readonly [InventoryItem | null, InventoryItem | null];
  result?: InventoryItem | null;
  invalid?: boolean;
  onInputAction?: (index: 0 | 1, action: InventorySlotAction) => void;
  onTakeResult?: (action: InventorySlotAction) => void;
}
export const Grindstone = forwardRef<HTMLElement, GrindstoneProps>(function Grindstone({
  title='Repair & Disenchant', inputs=[null,null], result, invalid=false, onInputAction, onTakeResult, className, ...props
}, ref) {
  const inputsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const resultRef = useRef<HTMLButtonElement | null>(null);
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, target: HTMLButtonElement | null | undefined) => {
    if (event.defaultPrevented || !target) return;
    event.preventDefault(); target.focus();
  };
  return <WorkstationFrame {...props} ref={ref} title={title} className={['mc-grindstone',className].filter(Boolean).join(' ')}>
    <ItemSlot ref={button=>{inputsRef.current[0]=button;}} className="mc-grindstone__input" label="First input" item={inputs[0]}
      onClick={()=>onInputAction?.(0,'primary')} onSecondaryAction={()=>onInputAction?.(0,'secondary')}
      onKeyDown={event=>{if(event.key==='ArrowDown') navigate(event,inputsRef.current[1]); else if(event.key==='ArrowRight') navigate(event,resultRef.current);}}/>
    <ItemSlot ref={button=>{inputsRef.current[1]=button;}} className="mc-grindstone__additional" label="Second input" item={inputs[1]}
      onClick={()=>onInputAction?.(1,'primary')} onSecondaryAction={()=>onInputAction?.(1,'secondary')}
      onKeyDown={event=>{if(event.key==='ArrowUp') navigate(event,inputsRef.current[0]); else if(event.key==='ArrowRight') navigate(event,resultRef.current);}}/>
    <span className="mc-grindstone__arrow" aria-hidden="true"/>
    {invalid && <span className="mc-grindstone__invalid" role="img" aria-label="Items cannot be combined"/>}
    <ItemSlot ref={resultRef} className="mc-grindstone__result" label="Result" item={result} aria-disabled={!result || invalid}
      onClick={()=>{if(result && !invalid) onTakeResult?.('primary');}}
      onSecondaryAction={()=>{if(result && !invalid) onTakeResult?.('secondary');}}
      onKeyDown={event=>{if(event.key==='ArrowLeft') navigate(event,inputsRef.current[1]);}}/>
  </WorkstationFrame>;
});

export interface EnchantmentOption {
  id: string;
  label: string;
  level: number;
  runes?: ReactNode;
  disabled?: boolean;
}
export interface EnchantingTableProps extends Omit<WorkstationFrameProps,'children'|'title'> {
  title?: string;
  item?: InventoryItem | null;
  lapis?: InventoryItem | null;
  options: readonly EnchantmentOption[];
  book?: ReactNode;
  onInputAction?: (slot: 'item' | 'lapis', action: InventorySlotAction) => void;
  onEnchant?: (id: string) => void;
}
export const EnchantingTable = forwardRef<HTMLElement, EnchantingTableProps>(function EnchantingTable({
  title='Enchant', item, lapis, options, book, onInputAction, onEnchant, className, ...props
}, ref) {
  return <WorkstationFrame {...props} ref={ref} title={title} className={['mc-enchanting',className].filter(Boolean).join(' ')}>
    <div className="mc-enchanting__book" aria-hidden="true">{book}</div>
    <ItemSlot className="mc-enchanting__item" label="Item to enchant" item={item} onClick={()=>onInputAction?.('item','primary')} onSecondaryAction={()=>onInputAction?.('item','secondary')}/>
    <ItemSlot className="mc-enchanting__lapis" label="Lapis lazuli" item={lapis} placeholder={<span className="mc-enchanting__lapis-placeholder"/>}
      onClick={()=>onInputAction?.('lapis','primary')} onSecondaryAction={()=>onInputAction?.('lapis','secondary')}/>
    <div className="mc-enchanting__options" role="group" aria-label="Enchantments">{options.slice(0,3).map((option,index)=><button
      key={option.id} type="button" className="mc-enchanting__option" disabled={option.disabled} aria-label={`${option.label} ${option.level}`} aria-description={`Requires level ${option.level}`}
      onClick={()=>onEnchant?.(option.id)} style={{'--mc-enchantment-dust':`var(--mc-skin-enchanting-dust-${index+1})`,'--mc-enchantment-dust-disabled':`var(--mc-skin-enchanting-dust-disabled-${index+1})`} as CSSProperties}>
      <span className="mc-enchanting__dust" aria-hidden="true"/><span className="mc-enchanting__runes" data-runes={option.runes !== undefined || undefined} aria-hidden="true">{option.runes}</span>{' '}
      <span className="mc-enchanting__cost">{option.level}</span>
    </button>)}</div>
  </WorkstationFrame>;
});
