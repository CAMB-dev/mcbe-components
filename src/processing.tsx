import { forwardRef, useRef } from 'react';
import type { CSSProperties, HTMLAttributes, KeyboardEvent } from 'react';
import { InventoryGrid, ItemSlot, ResultSlot } from './inventory';
import type { InventoryGridProps, InventoryItem, InventorySlotAction } from './inventory';
import { WorkstationFrame } from './workstations';
import type { WorkstationFrameProps } from './workstations';

function boundedRatio(value: number) { return Number.isNaN(value) ? 0 : Math.min(1, Math.max(0, value)); }
function moveFocus(event: KeyboardEvent<HTMLButtonElement>, target: HTMLButtonElement | null | undefined) {
  if (event.defaultPrevented || !target) return;
  event.preventDefault(); target.focus();
}

export interface ProcessingArrowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Public reveal ratio: 0 is empty and 1 is complete, from left to right. */
  progress?: number;
  label?: string;
  variant?: 'smelting' | 'crafting';
}
export const ProcessingArrow = forwardRef<HTMLDivElement, ProcessingArrowProps>(function ProcessingArrow({
  progress = 0, label, variant = 'smelting', className, style, ...props
}, ref) {
  const value = boundedRatio(progress), smelting = variant === 'smelting';
  return <div {...props} ref={ref} role={smelting ? 'progressbar' : 'img'}
    aria-label={label ?? (smelting ? 'Smelting progress' : 'Crafting result')}
    aria-valuemin={smelting ? 0 : undefined} aria-valuemax={smelting ? 100 : undefined}
    aria-valuenow={smelting ? value * 100 : undefined}
    className={['mc-processing-arrow', `mc-processing-arrow--${variant}`, className].filter(Boolean).join(' ')}
    style={{ ...style, '--mc-processing-progress': `${value * 100}%` } as CSSProperties}>
    <span className="mc-processing-arrow__empty" aria-hidden="true"/>
    {smelting && <span className="mc-processing-arrow__full" aria-hidden="true"/>}
  </div>;
});

export interface FuelIndicatorProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Public remaining ratio: 0 is empty and 1 is full, revealed from the bottom. */
  progress?: number;
  label?: string;
}
export const FuelIndicator = forwardRef<HTMLDivElement, FuelIndicatorProps>(function FuelIndicator({
  progress = 0, label = 'Fuel remaining', className, style, ...props
}, ref) {
  const value = boundedRatio(progress);
  return <div {...props} ref={ref} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value * 100}
    className={['mc-fuel-indicator', className].filter(Boolean).join(' ')}
    style={{ ...style, '--mc-processing-progress': `${value * 100}%` } as CSSProperties}>
    <span className="mc-fuel-indicator__empty" aria-hidden="true"/>
    <span className="mc-fuel-indicator__full" aria-hidden="true"/>
  </div>;
});

export interface RecipeGridProps extends Omit<InventoryGridProps, 'columns' | 'size'> {
  columns?: 2 | 3;
  rows?: 2 | 3;
}
export const RecipeGrid = forwardRef<HTMLDivElement, RecipeGridProps>(function RecipeGrid({
  columns = 3, rows = 3, className, ...props
}, ref) {
  return <InventoryGrid {...props} ref={ref} columns={columns} size={columns * rows}
    className={['mc-recipe-grid',className].filter(Boolean).join(' ')}/>;
});

/** Source right pane only; the recipe-book toolbar has its own external close button. */
type ProcessingFrameProps = Omit<WorkstationFrameProps, 'title' | 'children' | 'onClose' | 'closeLabel'>;
export type FurnaceInputSlot = 'input' | 'fuel';
export interface FurnaceProps extends ProcessingFrameProps {
  title?: string;
  input?: InventoryItem | null;
  fuel?: InventoryItem | null;
  result?: InventoryItem | null;
  progress?: number;
  fuelRemaining?: number;
  onInputAction?: (slot: FurnaceInputSlot, action: InventorySlotAction) => void;
  onTakeResult?: (action: InventorySlotAction) => void;
}
export const Furnace = forwardRef<HTMLElement, FurnaceProps>(function Furnace({
  title = 'Furnace', input, fuel, result, progress = 0, fuelRemaining = 0,
  onInputAction, onTakeResult, className, ...props
}, ref) {
  const inputRef = useRef<HTMLButtonElement | null>(null), fuelRef = useRef<HTMLButtonElement | null>(null), resultRef = useRef<HTMLButtonElement | null>(null);
  return <WorkstationFrame {...props} onClose={undefined} ref={ref} title={title} className={['mc-furnace',className].filter(Boolean).join(' ')}>
    <ItemSlot ref={inputRef} className="mc-furnace__input" label="Ingredient" item={input}
      onClick={()=>onInputAction?.('input','primary')} onSecondaryAction={()=>onInputAction?.('input','secondary')}
      onKeyDown={event=>{
        if(event.key === 'ArrowUp') event.preventDefault();
        else if(event.key === 'ArrowDown') moveFocus(event,fuelRef.current);
        else if(event.key === 'ArrowRight') moveFocus(event,resultRef.current);
      }}/>
    <FuelIndicator className="mc-furnace__flame" progress={fuelRemaining}/>
    <ItemSlot ref={fuelRef} className="mc-furnace__fuel" label="Fuel" item={fuel}
      onClick={()=>onInputAction?.('fuel','primary')} onSecondaryAction={()=>onInputAction?.('fuel','secondary')}
      onKeyDown={event=>{
        if(event.key === 'ArrowUp') moveFocus(event,inputRef.current);
        else if(event.key === 'ArrowRight') moveFocus(event,resultRef.current);
      }}/>
    <ProcessingArrow className="mc-furnace__arrow" progress={progress}/>
    <ResultSlot ref={resultRef} className="mc-furnace__result" size="large" label="Result" item={result}
      onTake={action=>onTakeResult?.(action)}
      onKeyDown={event=>{
        if(event.key === 'ArrowRight') event.preventDefault();
        else if(event.key === 'ArrowLeft') moveFocus(event,fuelRef.current);
      }}/>
  </WorkstationFrame>;
});

export type BlastFurnaceProps = FurnaceProps;
export const BlastFurnace = forwardRef<HTMLElement, BlastFurnaceProps>(function BlastFurnace({ title = 'Blast Furnace', className, ...props }, ref) {
  return <Furnace {...props} ref={ref} title={title} className={['mc-blast-furnace',className].filter(Boolean).join(' ')}/>;
});
export type SmokerProps = FurnaceProps;
export const Smoker = forwardRef<HTMLElement, SmokerProps>(function Smoker({ title = 'Smoker', className, ...props }, ref) {
  return <Furnace {...props} ref={ref} title={title} className={['mc-smoker',className].filter(Boolean).join(' ')}/>;
});

export interface CraftingTableProps extends ProcessingFrameProps {
  title?: string;
  inputs?: readonly (InventoryItem | null)[];
  result?: InventoryItem | null;
  selectedInputIndex?: number;
  onInputAction?: (index: number, action: InventorySlotAction) => void;
  onTakeResult?: (action: InventorySlotAction) => void;
}
export const CraftingTable = forwardRef<HTMLElement, CraftingTableProps>(function CraftingTable({
  title = 'Crafting', inputs = [], result, selectedInputIndex, onInputAction, onTakeResult, className, ...props
}, ref) {
  const gridRef = useRef<HTMLDivElement | null>(null), resultRef = useRef<HTMLButtonElement | null>(null);
  return <WorkstationFrame {...props} onClose={undefined} ref={ref} title={title} className={['mc-crafting',className].filter(Boolean).join(' ')}>
    <div className="mc-crafting__grid"><RecipeGrid ref={gridRef} label="Crafting input" items={inputs} selectedIndex={selectedInputIndex}
      onSlotAction={onInputAction} onKeyDown={event=>{
        const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button.mc-slot'));
        if(event.key === 'ArrowRight' && buttons.indexOf(event.target as HTMLButtonElement) === 8 && resultRef.current) {
          event.preventDefault(); resultRef.current.focus();
        }
      }}/></div>
    <ProcessingArrow className="mc-crafting__arrow" variant="crafting"/>
    <ResultSlot ref={resultRef} className="mc-crafting__result" size="large" label="Crafting result" item={result}
      onTake={action=>onTakeResult?.(action)} onKeyDown={event=>{
        if(event.key === 'ArrowRight') event.preventDefault();
        else if(event.key === 'ArrowLeft') moveFocus(event,gridRef.current?.querySelectorAll<HTMLButtonElement>('button.mc-slot')[5]);
      }}/>
  </WorkstationFrame>;
});
