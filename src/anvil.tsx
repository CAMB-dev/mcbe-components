import { forwardRef, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { ItemSlot, ResultSlot } from './inventory';
import type { InventoryItem, InventorySlotAction } from './inventory';
import { ProcessingArrow } from './processing';
import { WorkstationFrame } from './workstations';
import type { WorkstationFrameProps } from './workstations';
import { WorkstationImagePresentation } from './workstation-source-layer';
import { useAnvilImageLayer } from './anvil-image-layer';
import type { AnvilImageRenderProfile } from './anvil-image-layer';
export type { AnvilImageRenderProfile, AnvilTextRenderProfile, AnvilTextRenderStyle } from './anvil-image-layer';

/** Caller-supplied game state; the component does not calculate repair costs. */
export type AnvilCost =
  | { kind: 'levels'; levels: number; affordable?: boolean; label?: string }
  | { kind: 'too-expensive'; label?: string };

export interface AnvilProps extends Omit<WorkstationFrameProps, 'title' | 'children'> {
  title?: string;
  name: string;
  onNameChange?: (name: string) => void;
  renameLabel?: string;
  renameDisabled?: boolean;
  renameReadOnly?: boolean;
  inputs?: readonly [InventoryItem | null, InventoryItem | null];
  result?: InventoryItem | null;
  invalid?: boolean;
  cost?: AnvilCost | null;
  /** Optional whole-frame source visuals; the real editable input is retained. */
  imageRender?: AnvilImageRenderProfile;
  onInputAction?: (index: 0 | 1, action: InventorySlotAction) => void;
  onTakeResult?: (action: InventorySlotAction) => void;
}

function focusSlot(event: KeyboardEvent<HTMLButtonElement>, target: HTMLButtonElement | null) {
  if (event.defaultPrevented || !target) return;
  event.preventDefault();
  target.focus();
}

/** The Classic anvil container; names, recipes, affordability and results are controlled. */
export const Anvil = forwardRef<HTMLElement, AnvilProps>(function Anvil({
  title = 'Repair & Name', name, onNameChange, renameLabel = 'Item name', renameDisabled = false,
  renameReadOnly = false, inputs = [null, null], result, invalid = false, cost,
  onInputAction, onTakeResult, imageRender, className, ...props
}, ref) {
  const root = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLButtonElement | null>(null);
  const materialRef = useRef<HTMLButtonElement | null>(null);
  const resultRef = useRef<HTMLButtonElement | null>(null);
  const validLevels = cost?.kind === 'levels' && Number.isFinite(cost.levels) && cost.levels >= 0;
  const costVisible = cost?.kind === 'too-expensive' || validLevels;
  const affordable = cost?.kind !== 'too-expensive' && (cost?.kind !== 'levels' || (validLevels && cost.affordable !== false));
  const costText = cost?.kind === 'too-expensive'
    ? cost.label ?? 'Too Expensive!'
    : validLevels && cost?.kind === 'levels'
      ? cost.label ?? `Enchantment Cost: ${Math.trunc(cost.levels)}`
      : '';
  const sourceItems = [inputs[0], inputs[1], result, ...Array.from({ length: 27 }, (_, index) => props.inventory?.[index]),
    ...Array.from({ length: 9 }, (_, index) => props.hotbar?.[index])];
  const paint = useAnvilImageLayer(imageRender, root, { title, inventoryLabel: props.inventoryLabel ?? 'Inventory', name, renameDisabled, invalid,
    close: !!props.onClose, cost: { visible: costVisible, text: costText, affordable }, items: sourceItems });

  return <WorkstationImagePresentation.Provider value={paint.presentation}><WorkstationFrame {...props} ref={node => {
    root.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node;
  }} title={title} className={['mc-anvil', className].filter(Boolean).join(' ')}>
    {paint.layer}
    <span className="mc-anvil__icon" aria-hidden="true"/>
    <label className="mc-anvil__name-field" data-disabled={renameDisabled || undefined}>
      <input className="mc-anvil__name-input" aria-label={renameLabel} value={name} maxLength={30}
        disabled={renameDisabled} readOnly={renameReadOnly} autoComplete="off" spellCheck={false}
        onChange={event => onNameChange?.(event.currentTarget.value)}/>
    </label>
    <ItemSlot ref={inputRef} className="mc-anvil__input" label="Item to repair" item={inputs[0]}
      onClick={() => onInputAction?.(0, 'primary')} onSecondaryAction={() => onInputAction?.(0, 'secondary')}
      onKeyDown={event => { if (event.key === 'ArrowRight') focusSlot(event, materialRef.current); }}/>
    <span className="mc-anvil__plus" aria-hidden="true"/>
    <ItemSlot ref={materialRef} className="mc-anvil__material" label="Repair material" item={inputs[1]}
      onClick={() => onInputAction?.(1, 'primary')} onSecondaryAction={() => onInputAction?.(1, 'secondary')}
      onKeyDown={event => {
        if (event.key === 'ArrowLeft') focusSlot(event, inputRef.current);
        else if (event.key === 'ArrowRight') focusSlot(event, resultRef.current);
      }}/>
    <ProcessingArrow className="mc-anvil__arrow" variant="crafting"/>
    {invalid && <span className="mc-anvil__invalid" role="img" aria-label="Items cannot be combined"/>}
    <ResultSlot ref={resultRef} className="mc-anvil__result" label="Repair result" item={result}
      available={!invalid && affordable} onTake={action => onTakeResult?.(action)}
      onKeyDown={event => { if (event.key === 'ArrowLeft') focusSlot(event, materialRef.current); }}/>
    {costVisible && <span className="mc-anvil__cost" role="status" data-cost-state={cost?.kind}
      data-affordable={affordable ? 'true' : 'false'}>{costText}</span>}
  </WorkstationFrame></WorkstationImagePresentation.Provider>;
});
