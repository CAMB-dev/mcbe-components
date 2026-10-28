import { forwardRef, useRef } from 'react';
import type { CSSProperties, HTMLAttributes, KeyboardEvent } from 'react';
import { ItemSlot } from './inventory';
import type { InventoryItem, InventorySlotAction } from './inventory';
import { WorkstationFrame } from './workstations';
import type { WorkstationFrameProps } from './workstations';

function ratio(value: number) { return Number.isNaN(value) ? 0 : Math.max(0, Math.min(1, value)); }

export interface BrewingIndicatorProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  variant?: 'arrow' | 'bubbles' | 'fuel';
  /** Public reveal ratio: 0 is empty, 1 shows the complete original foreground. */
  progress?: number;
  label?: string;
}
/** Original brewing layers, cropped at their full source dimensions without stretching. */
export const BrewingIndicator = forwardRef<HTMLDivElement, BrewingIndicatorProps>(function BrewingIndicator({
  variant = 'arrow', progress = 0, label, className, style, ...props
}, ref) {
  const value = ratio(progress);
  const defaultLabel = variant === 'fuel' ? 'Brewing fuel remaining' : variant === 'bubbles' ? 'Brewing bubbles' : 'Brewing progress';
  return <div {...props} ref={ref} role={variant === 'fuel' ? 'meter' : 'progressbar'}
    aria-label={label ?? defaultLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value * 100}
    className={['mc-brewing-indicator', `mc-brewing-indicator--${variant}`, className].filter(Boolean).join(' ')}
    style={{ ...style, '--mc-brewing-reveal': `${value * 100}%` } as CSSProperties}>
    <span className="mc-brewing-indicator__empty" aria-hidden="true"/>
    <span className="mc-brewing-indicator__full" aria-hidden="true"/>
  </div>;
});

export type BrewingSlot = 'ingredient' | 'fuel' | 0 | 1 | 2;
export interface BrewingStandProps extends Omit<WorkstationFrameProps, 'title' | 'children'> {
  title?: string;
  ingredient?: InventoryItem | null;
  fuel?: InventoryItem | null;
  /** The three independently actionable bottle slots; extra entries are ignored. */
  bottles?: readonly (InventoryItem | null)[];
  selectedSlot?: BrewingSlot;
  progress?: number;
  bubbles?: number;
  fuelRemaining?: number;
  onSelectionChange?: (slot: BrewingSlot) => void;
  /** Empty bottle slots accept items, so their actions are forwarded too. */
  onSlotAction?: (slot: BrewingSlot, action: InventorySlotAction) => void;
}

/** Classic brewing layout. Recipe validity, brewing time and transfers belong to the caller. */
export const BrewingStand = forwardRef<HTMLElement, BrewingStandProps>(function BrewingStand({
  title = 'Brewing Stand', ingredient, fuel, bottles = [], selectedSlot,
  progress = 0, bubbles = 0, fuelRemaining = 0, onSelectionChange, onSlotAction, className, ...props
}, ref) {
  const slots = useRef<Partial<Record<BrewingSlot, HTMLButtonElement | null>>>({});
  const activate = (slot: BrewingSlot) => { onSelectionChange?.(slot); onSlotAction?.(slot, 'primary'); };
  const focus = (event: KeyboardEvent<HTMLButtonElement>, ...candidates: BrewingSlot[]) => {
    if (event.defaultPrevented) return;
    const target = candidates.map(slot => slots.current[slot]).find(button => button && !button.disabled);
    if (target) { event.preventDefault(); target.focus(); }
  };
  return <WorkstationFrame {...props} ref={ref} title={title} className={['mc-brewing', className].filter(Boolean).join(' ')}>
    <BrewingIndicator variant="arrow" progress={progress} className="mc-brewing__arrow"/>
    <BrewingIndicator variant="bubbles" progress={bubbles} className="mc-brewing__bubbles"/>
    <BrewingIndicator variant="fuel" progress={fuelRemaining} className="mc-brewing__fuel-bar"/>
    <ItemSlot ref={node => { slots.current.ingredient = node; }} className="mc-brewing__ingredient" data-brewing-slot="ingredient"
      label="Brewing ingredient" item={ingredient} selected={selectedSlot === 'ingredient'}
      onClick={() => activate('ingredient')} onSecondaryAction={() => onSlotAction?.('ingredient', 'secondary')}
      onKeyDown={event => {
        if (event.key === 'ArrowLeft') focus(event, 'fuel');
        else if (event.key === 'ArrowDown') focus(event, 1, 0, 2);
      }}/>
    <ItemSlot ref={node => { slots.current.fuel = node; }} className="mc-brewing__fuel" data-brewing-slot="fuel"
      label="Brewing fuel" item={fuel} selected={selectedSlot === 'fuel'}
      placeholder={<span className="mc-brewing__fuel-placeholder" aria-hidden="true"/>}
      onClick={() => activate('fuel')} onSecondaryAction={() => onSlotAction?.('fuel', 'secondary')}
      onKeyDown={event => {
        if (event.key === 'ArrowRight') focus(event, 'ingredient');
        else if (event.key === 'ArrowDown') focus(event, 0, 1, 2);
      }}/>
    {([0, 1, 2] as const).map(slot => <ItemSlot key={slot} ref={node => { slots.current[slot] = node; }}
      className="mc-brewing__bottle" data-brewing-slot={slot} label={`Bottle ${slot + 1}`}
      item={bottles[slot]} selected={selectedSlot === slot}
      placeholder={<span className="mc-brewing__bottle-placeholder" aria-hidden="true"/>}
      onClick={() => activate(slot)} onSecondaryAction={() => onSlotAction?.(slot, 'secondary')}
      onKeyDown={event => {
        if (event.key === 'ArrowUp') focus(event, 'ingredient', 'fuel');
        else if (event.key === 'ArrowLeft') {
          if (slot === 0) focus(event, 'fuel');
          else if (slot === 1) focus(event, 0, 'fuel');
          else focus(event, 1, 0, 'fuel');
        } else if (event.key === 'ArrowRight') {
          if (slot === 0) focus(event, 1, 2);
          else if (slot === 1) focus(event, 2);
        }
      }}/>)}
    <span className="mc-brewing__fuel-pipes" aria-hidden="true"/>
    <span className="mc-brewing__pipes" aria-hidden="true"/>
  </WorkstationFrame>;
});
