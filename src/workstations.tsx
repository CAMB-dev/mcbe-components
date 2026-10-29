import { forwardRef, useContext, useId, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, KeyboardEvent, ReactNode } from 'react';
import { InventoryGrid, ItemSlot } from './inventory';
import type { InventoryItem, InventorySlotAction } from './inventory';
import { EnchantingImagePresentation, useEnchantingImageLayer } from './enchanting-image-layer';
import type { EnchantingTableImageRenderProfile } from './enchanting-image-layer';
export type { EnchantingTableImageRenderProfile, EnchantingTableTextRenderProfile, EnchantingTableTextRenderStyle } from './enchanting-image-layer';

export type WorkstationTextContext =
  | { kind: 'title' | 'inventory-label'; align: 'start' }
  | { kind: 'enchantment-cost'; align: 'end'; disabled: boolean; id: string; tier: 1 | 2 | 3 };
/** Noninteractive visual text only; the original string remains the accessible text. */
export type WorkstationTextRenderer = (text: string, context: WorkstationTextContext) => ReactNode;

function workstationText(text: string, context: WorkstationTextContext, renderText?: WorkstationTextRenderer): ReactNode {
  if (!renderText) return text;
  return <><span aria-hidden="true">{renderText(text, context)}</span><span className="mc-workstation-text__semantic">{text}</span></>;
}

export interface PlayerInventoryProps extends HTMLAttributes<HTMLDivElement> {
  items?: readonly (InventoryItem | null)[];
  hotbar?: readonly (InventoryItem | null)[];
  label?: string;
  hotbarLabel?: string;
  renderText?: WorkstationTextRenderer;
  selectedIndex?: number;
  onSelectionChange?: (index: number) => void;
  onSlotAction?: (index: number, action: InventorySlotAction) => void;
}
export const PlayerInventory = forwardRef<HTMLDivElement, PlayerInventoryProps>(function PlayerInventory({
  items = [], hotbar = [], label = 'Inventory', hotbarLabel = 'Hotbar', renderText, selectedIndex,
  onSelectionChange, onSlotAction, className, ...props
}, ref) {
  const [internal, setInternal] = useState(-1); const selected = selectedIndex ?? internal;
  const select = (index: number) => { if(selectedIndex===undefined) setInternal(index); onSelectionChange?.(index); };
  return <div {...props} ref={ref} className={['mc-player-inventory',className].filter(Boolean).join(' ')}>
    <div className="mc-player-inventory__label">{workstationText(label, { kind: 'inventory-label', align: 'start' }, renderText)}</div>
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
  renderText?: WorkstationTextRenderer;
  onInventoryAction?: (index: number, action: InventorySlotAction) => void;
}
export const WorkstationFrame = forwardRef<HTMLElement, WorkstationFrameProps>(function WorkstationFrame({
  title, onClose, closeLabel = 'Close container', inventory, hotbar, inventoryLabel, renderText,
  onInventoryAction, children, className, ...props
}, ref) {
  const id=useId(), paint = useContext(EnchantingImagePresentation);
  const section = <EnchantingImagePresentation.Provider value={undefined}><section {...props} ref={ref} aria-labelledby={`${id}-title`}
    className={['mc-workstation',className].filter(Boolean).join(' ')}>
    <h2 id={`${id}-title`} className="mc-workstation__title">{workstationText(title, { kind: 'title', align: 'start' }, renderText)}</h2>
    {onClose && <button type="button" className="mc-dialog__close" aria-label={closeLabel} onClick={onClose}><span className="mc-dialog__close-icon" aria-hidden="true"/></button>}
    {children}
    <PlayerInventory className="mc-workstation__inventory" items={inventory} hotbar={hotbar} label={inventoryLabel} renderText={renderText} onSlotAction={onInventoryAction}/>
  </section></EnchantingImagePresentation.Provider>;
  if (paint === undefined) return <div className="mc-workstation-scroll">{section}</div>;
  const width = paint ? 352 + paint.left + paint.right : 0, height = paint ? 332 + paint.top + paint.bottom : 0;
  return <div className={['mc-workstation-scroll', paint && 'mc-workstation-scroll--image-profile'].filter(Boolean).join(' ')}>
    <div className="mc-workstation-image-reservation" data-image-display-scale={paint?.scale} style={paint ? { display: 'block', width: width * paint.scale, height: height * paint.scale } : { display: 'contents' }}>
      <div className="mc-workstation-image-plane" style={paint ? { display: 'block', width, height, '--mc-workstation-display-scale': paint.scale, paddingLeft: paint.left, paddingTop: paint.top } as CSSProperties : { display: 'contents' }}>
        {section}
      </div>
    </div>
  </div>;
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
  /** Source rune string for the optional packed-cell profile; case is preserved. */
  runeText?: string;
  disabled?: boolean;
}
export interface EnchantmentOptionProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'id' | 'children'>, EnchantmentOption {
  /** Dust sprite row in the original three-option GUI. Independent of level. */
  tier?: 1 | 2 | 3;
  /** Optional DOM id; `id` is the logical option identifier sent to onEnchant. */
  buttonId?: string;
  onEnchant?: (id: string) => void;
  renderText?: WorkstationTextRenderer;
}
/** A reusable original-texture option; game eligibility is supplied via disabled. */
export const EnchantmentOption = forwardRef<HTMLButtonElement, EnchantmentOptionProps>(function EnchantmentOption({
  id, label, level, runes, runeText, disabled, tier = 1, buttonId, onEnchant, onClick, renderText,
  type = 'button', className, style, 'aria-label': ariaLabel, 'aria-description': ariaDescription, ...props
}, ref) {
  return <button {...props} ref={ref} id={buttonId} type={type}
    className={['mc-enchanting__option',className].filter(Boolean).join(' ')} disabled={disabled}
    data-enchantment-id={id} data-enchantment-tier={tier}
    aria-label={ariaLabel ?? `${label} ${level}`} aria-description={ariaDescription ?? `Requires level ${level}`}
    onClick={event=>{onClick?.(event); if(!event.defaultPrevented && !disabled) onEnchant?.(id);}}
    style={{'--mc-enchantment-dust':`var(--mc-skin-enchanting-dust-${tier})`,'--mc-enchantment-dust-disabled':`var(--mc-skin-enchanting-dust-disabled-${tier})`,...style} as CSSProperties}>
    <span className="mc-enchanting__dust" aria-hidden="true"/>
    <span className="mc-enchanting__runes" data-runes={runes !== undefined || runeText !== undefined || undefined} aria-hidden="true">{runes !== undefined ? runes : runeText}</span>{' '}
    <span className="mc-enchanting__cost">{renderText ? workstationText(String(level), { kind: 'enchantment-cost', align: 'end', disabled: !!disabled, id, tier }, renderText) : level}</span>
  </button>;
});
export interface EnchantingTableProps extends Omit<WorkstationFrameProps,'children'|'title'> {
  title?: string;
  item?: InventoryItem | null;
  lapis?: InventoryItem | null;
  options: readonly EnchantmentOption[];
  book?: ReactNode;
  onInputAction?: (slot: 'item' | 'lapis', action: InventorySlotAction) => void;
  onEnchant?: (id: string) => void;
  /** Explicit whole-frame source image profile; omission retains themed CSS skins. */
  imageRender?: EnchantingTableImageRenderProfile;
}
export const EnchantingTable = forwardRef<HTMLElement, EnchantingTableProps>(function EnchantingTable({
  title='Enchant', item, lapis, options, book, onInputAction, onEnchant, renderText, imageRender, className, ...props
}, ref) {
  const root = useRef<HTMLElement | null>(null);
  const sourceItems = [item, lapis, ...Array.from({ length: 27 }, (_, index) => props.inventory?.[index]), ...Array.from({ length: 9 }, (_, index) => props.hotbar?.[index])];
  const paint = useEnchantingImageLayer(imageRender, root, options, !!props.onClose, title, props.inventoryLabel ?? 'Inventory', sourceItems);
  return <EnchantingImagePresentation.Provider value={paint.presentation}><WorkstationFrame {...props} ref={node => {
    root.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node;
  }} title={title} renderText={renderText} className={['mc-enchanting',className].filter(Boolean).join(' ')}>
    {paint.layer}
    <div className="mc-enchanting__book" aria-hidden="true">{book}</div>
    <ItemSlot className="mc-enchanting__item" label="Item to enchant" item={item} onClick={()=>onInputAction?.('item','primary')} onSecondaryAction={()=>onInputAction?.('item','secondary')}/>
    <ItemSlot className="mc-enchanting__lapis" label="Lapis lazuli" item={lapis} underlay={<span className="mc-enchanting__lapis-placeholder"/>}
      onClick={()=>onInputAction?.('lapis','primary')} onSecondaryAction={()=>onInputAction?.('lapis','secondary')}/>
    <div className="mc-enchanting__options" role="group" aria-label="Enchantments">{Array.from({length:3},(_,index)=>{
      const option=options[index];
      return option ? <EnchantmentOption key={`option:${option.id}`} id={option.id} label={option.label} level={option.level} runes={option.runes} runeText={option.runeText} disabled={option.disabled}
        tier={([1,2,3] as const)[index]} onEnchant={onEnchant} renderText={renderText}/>
        : <div key={`empty:${index}`} className="mc-enchanting__empty-option" aria-hidden="true"/>;
    })}</div>
  </WorkstationFrame></EnchantingImagePresentation.Provider>;
});
