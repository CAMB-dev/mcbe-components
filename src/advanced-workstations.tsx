import { forwardRef, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, KeyboardEvent, ReactNode } from 'react';
import { ItemCount, ItemImage, ItemSlot } from './inventory';
import type { InventoryItem, InventorySlotAction, ItemSlotProps } from './inventory';
import { ResultSlot } from './inventory';
import { ScrollArea } from './scroll-area';
import { WorkstationFrame } from './workstations';
import type { WorkstationFrameProps } from './workstations';

const classes = (...values: (string | false | undefined)[]) => values.filter(Boolean).join(' ');
type MainPanelProps = Omit<WorkstationFrameProps, 'title' | 'children' | 'onClose' | 'closeLabel'>;
const focus = (event: KeyboardEvent<HTMLElement>, node: HTMLElement | null | undefined) => {
  if (!node || event.defaultPrevented) return;
  event.preventDefault(); node.focus();
};

export interface RecipeSelectionOption {
  id: string;
  label: string;
  item?: InventoryItem;
  /** Caller-provided native block/banner renderer output; no replacement art is generated. */
  preview?: ReactNode;
  disabled?: boolean;
  /** Original background URL supplied by the native texture binding's owner. */
  backgroundImage?: string;
  backgroundSlice?: number;
}
export interface RecipeSelectionGridProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  label: string;
  options: readonly RecipeSelectionOption[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  columns?: number;
  previewKind?: 'item' | 'banner';
}
/** Shared18game-pixel selector for stone items and custom loom banner patterns. */
export const RecipeSelectionGrid = forwardRef<HTMLDivElement, RecipeSelectionGridProps>(function RecipeSelectionGrid({
  label, options, selectedId, onSelect, columns = 7, previewKind = 'item', className, style, onKeyDown, ...props
}, ref) {
  const width = Number.isFinite(columns) && columns > 0 ? Math.max(1, Math.floor(columns)) : 7;
  const [focused, setFocused] = useState(0), buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const firstEnabled = options.findIndex(option => !option.disabled);
  const active = options[focused] && !options[focused]?.disabled ? focused : firstEnabled;
  return <div {...props} ref={ref} role="grid" aria-label={label} aria-colcount={width} aria-rowcount={Math.ceil(options.length / width)}
    className={classes('mc-recipe-selection-grid', `mc-recipe-selection-grid--${previewKind}`, className)}
    style={{ ...style, '--mc-recipe-columns': width } as CSSProperties} onKeyDown={event => {
      onKeyDown?.(event); if (event.defaultPrevented) return;
      const index = buttons.current.findIndex(button => button === event.target); if (index < 0) return;
      const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowDown' ? width : event.key === 'ArrowUp' ? -width : 0;
      if (!delta) return;
      let next = index + delta;
      while (next >= 0 && next < options.length && options[next]?.disabled) next += delta;
      if (next >= 0 && next < options.length) focus(event, buttons.current[next]); else event.preventDefault();
    }}>
    {Array.from({ length: Math.ceil(options.length / width) }, (_, row) => <div role="row" key={row}>
      {options.slice(row * width, (row + 1) * width).map((option, column) => {
        const index = row * width + column;
        const slice = Number.isFinite(option.backgroundSlice) && option.backgroundSlice! >= 0 ? option.backgroundSlice! : 1;
        return <div role="gridcell" aria-selected={option.id === selectedId} key={option.id}>
          <button type="button" ref={node => { buttons.current[index] = node; }} data-recipe-id={option.id}
            className="mc-recipe-selection-grid__button" aria-label={option.label} aria-pressed={option.id === selectedId}
            disabled={option.disabled} tabIndex={index === active ? 0 : -1}
            style={{ '--mc-recipe-background': option.backgroundImage ? `url(${JSON.stringify(option.backgroundImage)})` : 'none',
              '--mc-recipe-slice': slice, '--mc-recipe-edge': `${slice * 2}px` } as CSSProperties}
            onFocus={() => setFocused(index)} onClick={() => onSelect?.(option.id)}>
            <span className="mc-recipe-selection-grid__preview" aria-hidden="true">
              {option.preview ?? (option.item && <ItemImage src={option.item.image}>{option.item.icon}</ItemImage>)}
              {option.item && <ItemCount count={option.item.count}/>}
            </span>
            <span className="mc-recipe-selection-grid__highlight" aria-hidden="true"/>
          </button>
        </div>;
      })}
    </div>)}
  </div>;
});

interface DualFrameProps extends WorkstationFrameProps { selection: ReactNode; kind: 'stonecutter' | 'loom' }
const DualFrame = forwardRef<HTMLElement, DualFrameProps>(function DualFrame({
  title, selection, kind, onClose: _onClose, closeLabel: _closeLabel, inventory, hotbar, inventoryLabel,
  onInventoryAction, children, className, ...props
}, ref) {
  return <div className="mc-advanced-scroll"><section {...props} ref={ref} aria-label={title}
    className={classes('mc-advanced-dual', `mc-${kind}`, className)}>
    <div className={`mc-${kind}__book mc-advanced-dual__book`}>
      <ScrollArea className="mc-advanced-dual__selector" label={`${title} selections`} variant="container" scrollbarVisibility="auto"
        viewportProps={{ style: { padding: 2, boxSizing: 'border-box' } }} contentProps={{ style: { paddingBottom: 4 } }}>{selection}</ScrollArea>
    </div>
    <div className={`mc-${kind}__fold mc-advanced-dual__fold`} aria-hidden="true"/>
    <WorkstationFrame title={title} onClose={undefined} inventory={inventory} hotbar={hotbar} inventoryLabel={inventoryLabel}
      onInventoryAction={onInventoryAction} className={`mc-${kind}__right`}>{children}</WorkstationFrame>
  </section></div>;
});

export interface StonecutterProps extends MainPanelProps {
  title?: string;
  input?: InventoryItem | null;
  result?: InventoryItem | null;
  resultAvailable?: boolean;
  recipes?: readonly RecipeSelectionOption[];
  selectedRecipeId?: string;
  onRecipeSelect?: (id: string) => void;
  onInputAction?: (action: InventorySlotAction) => void;
  onTakeResult?: (action: InventorySlotAction) => void;
}
export const Stonecutter = forwardRef<HTMLElement, StonecutterProps>(function Stonecutter({
  title = 'Stonecutter', input, result, resultAvailable = true, recipes = [], selectedRecipeId,
  onRecipeSelect, onInputAction, onTakeResult, ...props
}, ref) {
  return <DualFrame {...props} ref={ref} kind="stonecutter" title={title} selection={<RecipeSelectionGrid label="Stone recipes"
    options={recipes} selectedId={selectedRecipeId} onSelect={onRecipeSelect}/>}>
    <ItemSlot className="mc-stonecutter__input" label="Stone input" item={input}
      onClick={() => onInputAction?.('primary')} onSecondaryAction={() => onInputAction?.('secondary')}/>
    <span className="mc-stonecutter__arrow" aria-hidden="true"/>
    <ResultSlot className="mc-stonecutter__result" size="large" label="Cut stone result" item={result}
      available={resultAvailable} onTake={action => onTakeResult?.(action)}/>
  </DualFrame>;
});

export interface LoomProps extends MainPanelProps {
  title?: string;
  inputs?: readonly [InventoryItem | null, InventoryItem | null, InventoryItem | null];
  result?: InventoryItem | null;
  resultAvailable?: boolean;
  patterns?: readonly RecipeSelectionOption[];
  selectedPatternId?: string;
  onPatternSelect?: (id: string) => void;
  showInputOverlays?: readonly [boolean, boolean, boolean];
  bannerPreview?: ReactNode;
  onInputAction?: (index: 0 | 1 | 2, action: InventorySlotAction) => void;
  onTakeResult?: (action: InventorySlotAction) => void;
}
export const Loom = forwardRef<HTMLElement, LoomProps>(function Loom({
  title = 'Loom', inputs = [null, null, null], result, resultAvailable = true, patterns = [],
  selectedPatternId, onPatternSelect, showInputOverlays, bannerPreview, onInputAction, onTakeResult, ...props
}, ref) {
  return <DualFrame {...props} ref={ref} kind="loom" title={title} selection={<RecipeSelectionGrid label="Banner patterns"
    options={patterns} previewKind="banner" selectedId={selectedPatternId} onSelect={onPatternSelect}/>}>
    {(['banner', 'dye', 'pattern'] as const).map((name, index) => <ItemSlot key={name} className={`mc-loom__${name}`}
      label={['Banner input', 'Dye input', 'Pattern item'][index]} item={inputs[index]}
      underlay={(showInputOverlays?.[index] ?? !inputs[index]) ? <span className={`mc-loom__empty mc-loom__empty--${name}`}/> : undefined}
      onClick={() => onInputAction?.(index as 0 | 1 | 2, 'primary')} onSecondaryAction={() => onInputAction?.(index as 0 | 1 | 2, 'secondary')}/>)}
    <span className="mc-loom__arrow" aria-hidden="true"/>
    <ResultSlot className="mc-loom__result" label="Woven banner result" item={result} available={resultAvailable}
      onTake={action => onTakeResult?.(action)}/>
    <div className="mc-loom__banner-outline"><div className="mc-loom__banner-preview" aria-hidden={!bannerPreview || undefined}
      data-native-renderer="banner_pattern_renderer" data-renderer-unavailable={!bannerPreview || undefined}>{bannerPreview}</div></div>
  </DualFrame>;
});

export type BeaconPrimaryEffect = 'speed' | 'haste' | 'resistance' | 'jump-boost' | 'strength';
export type BeaconEffectId = BeaconPrimaryEffect | 'regeneration' | 'extra';
export interface BeaconEffectState { visible?: boolean; enabled?: boolean; selected?: boolean }
export interface BeaconEffectProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onChange'> {
  effect: BeaconEffectId;
  selected?: boolean;
  extraEffect?: BeaconPrimaryEffect;
}
export const BeaconEffect = forwardRef<HTMLButtonElement, BeaconEffectProps>(function BeaconEffect({
  effect, selected = false, extraEffect, className, ...props
}, ref) {
  const icon = effect === 'extra' ? extraEffect : effect;
  return <button {...props} type="button" ref={ref} aria-label={props['aria-label'] ?? effect} aria-pressed={selected}
    data-effect={effect} data-selected={selected || undefined} className={classes('mc-beacon-effect', className)}>
    {icon && <span className={`mc-beacon-effect__icon mc-beacon-effect__icon--${icon}`} aria-hidden="true"/>}
  </button>;
});
export interface BeaconProps extends Omit<WorkstationFrameProps, 'title' | 'children' | 'inventoryLabel'> {
  title?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  payment?: InventoryItem | null;
  acceptedItems?: readonly (InventoryItem | null)[];
  effects?: Partial<Record<BeaconEffectId, BeaconEffectState>>;
  extraEffect?: BeaconPrimaryEffect;
  canConfirm?: boolean;
  onPaymentAction?: (action: InventorySlotAction) => void;
  onEffectSelect?: (effect: BeaconEffectId) => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}
export const Beacon = forwardRef<HTMLElement, BeaconProps>(function Beacon({
  title = 'Beacon', primaryLabel = 'Primary Power', secondaryLabel = 'Secondary Power', payment,
  acceptedItems = [], effects, extraEffect, canConfirm = false, onPaymentAction, onEffectSelect, onConfirm, onCancel,
  className, onKeyDownCapture, ...props
}, ref) {
  return <WorkstationFrame {...props} ref={ref} title={title} className={classes('mc-beacon', className)}
    onKeyDownCapture={event => {
      onKeyDownCapture?.(event); if (event.defaultPrevented || event.key !== 'ArrowRight') return;
      const cell = (event.target as HTMLElement).closest('[role="gridcell"]');
      const row = cell?.parentElement;
      if (cell && row?.lastElementChild === cell) event.preventDefault();
    }}>
    <div className="mc-beacon__inner">
      <span className="mc-beacon__middle-strip" aria-hidden="true"/>
      <span className="mc-beacon__power-label mc-beacon__power-label--primary">{primaryLabel}</span>
      <span className="mc-beacon__power-label mc-beacon__power-label--secondary">{secondaryLabel}</span>
      {[1, 2, 3, 4].map(level => <span key={level} className="mc-beacon__pyramid" data-level={level} aria-hidden="true"/>)}
      {(['speed', 'haste', 'resistance', 'jump-boost', 'strength', 'regeneration', 'extra'] as const).map(effect => {
        const state = effects?.[effect];
        const visible = state?.visible ?? effect !== 'extra';
        return !visible ? null : <BeaconEffect key={effect} className="mc-beacon__effect" effect={effect}
          extraEffect={extraEffect} disabled={!state?.enabled} selected={state?.selected}
          onClick={() => onEffectSelect?.(effect)}/>;
      })}
    </div>
    <div className="mc-beacon__payment">
      <div className="mc-beacon__accepted-items" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <span key={index}>
        <ItemImage src={acceptedItems[index]?.image}>{acceptedItems[index]?.icon}</ItemImage>
        {index < 4 && <span className="mc-beacon__separator"/>}
      </span>)}</div>
      <ItemSlot className="mc-beacon__payment-slot" label="Beacon payment" item={payment}
        onClick={() => onPaymentAction?.('primary')} onSecondaryAction={() => onPaymentAction?.('secondary')}/>
      <button type="button" className="mc-beacon-action mc-beacon__confirm" aria-label="Confirm beacon effects" disabled={!canConfirm} onClick={onConfirm}><span aria-hidden="true"/></button>
      <button type="button" className="mc-beacon-action mc-beacon__cancel" aria-label="Cancel beacon selection" onClick={onCancel}><span aria-hidden="true"/></button>
    </div>
  </WorkstationFrame>;
});

export interface CrafterSlotProps extends Omit<ItemSlotProps, 'onClick' | 'onSecondaryAction'> {
  index?: number;
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  onSlotAction?: (action: InventorySlotAction) => void;
}
/** Disabled crafter slots stay actionable: their source button re-enables the slot. */
export const CrafterSlot = forwardRef<HTMLButtonElement, CrafterSlotProps>(function CrafterSlot({
  index = 0, enabled = true, onEnabledChange, onSlotAction, className, style, disabled, label, onKeyDown, ...props
}, ref) {
  const cell = Number.isFinite(index) ? Math.max(0, Math.min(8, Math.floor(index))) : 0;
  const offsetX = cell % 3 === 0 ? .2 : 0, offsetY = Math.floor(cell / 3) < 2 ? .2 : 0;
  return <div className={classes('mc-crafter-slot', className)} data-index={cell} data-enabled={enabled ? 'true' : 'false'} style={style}>
    <ItemSlot {...props} ref={ref} className={enabled ? 'mc-crafter-slot__enabled' : 'mc-crafter-slot__disabled'}
      disabled={disabled} label={label ?? (!enabled ? `Enable crafter slot ${cell + 1}` : undefined)}
      item={enabled ? props.item : null} image={enabled ? props.image : undefined} count={enabled ? props.count : undefined}
      selected={enabled ? props.selected : false} durability={enabled ? props.durability : undefined}
      placeholder={enabled ? props.placeholder : undefined} underlay={enabled ? props.underlay : undefined}
      showTooltip={enabled ? props.showTooltip : false} children={enabled ? props.children : undefined}
      style={!enabled ? { left: offsetX, top: offsetY } : undefined} onKeyDown={onKeyDown}
      onClick={() => { if (enabled) onSlotAction?.('primary'); else onEnabledChange?.(true); }}
      onSecondaryAction={enabled ? () => onSlotAction?.('secondary') : undefined}/>
  </div>;
});
export interface CrafterProps extends Omit<WorkstationFrameProps, 'title' | 'children'> {
  title?: string;
  items?: readonly (InventoryItem | null)[];
  disabledSlots?: readonly number[];
  powered?: boolean;
  output?: InventoryItem | null;
  onSlotAction?: (index: number, action: InventorySlotAction) => void;
  onSlotEnabledChange?: (index: number, enabled: boolean) => void;
}
export const Crafter = forwardRef<HTMLElement, CrafterProps>(function Crafter({
  title = 'Crafter', items = [], disabledSlots = [], powered = false, output, onSlotAction, onSlotEnabledChange, className, ...props
}, ref) {
  const slots = useRef<HTMLDivElement | null>(null);
  return <WorkstationFrame {...props} ref={ref} title={title} className={classes('mc-crafter', className)}>
    <div ref={slots} className="mc-crafter__grid" role="grid" aria-label="Crafter input slots" aria-colcount={3} aria-rowcount={3}
      onKeyDown={event => {
        const index = Number((event.target as HTMLElement).closest('[data-index]')?.getAttribute('data-index'));
        const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowDown' ? 3 : event.key === 'ArrowUp' ? -3 : 0;
        if (delta && Number.isInteger(index)) {
          const next = index + delta;
          if (next >= 0 && next < 9) focus(event, slots.current?.querySelector(`[data-index="${next}"] button`)); else event.preventDefault();
        }
      }}>
      {Array.from({ length: 3 }, (_, row) => <div key={row} role="row">{Array.from({ length: 3 }, (_, column) => {
        const index = row * 3 + column;
        return <div key={index} role="gridcell"><CrafterSlot index={index} item={items[index]} enabled={!disabledSlots.includes(index)}
          label={disabledSlots.includes(index) ? `Enable crafter slot ${index + 1}` : `Crafter slot ${index + 1}`}
          onEnabledChange={enabled => onSlotEnabledChange?.(index, enabled)} onSlotAction={action => onSlotAction?.(index, action)}/></div>;
      })}</div>)}
    </div>
    <span className="mc-crafter__wire" data-powered={powered ? 'true' : 'false'} aria-hidden="true"/>
    <div className="mc-crafter__output" role="img" aria-label={output ? `Crafting preview: ${output.name}` : 'Empty crafting preview'} data-native-renderer="inventory_item_renderer">
      <ItemImage src={output?.image}>{output?.icon}</ItemImage><span className="mc-crafter__output-border" aria-hidden="true"/>
      {output && <ItemCount className="mc-crafter__output-count" count={output.count} aria-hidden="true"/>}
    </div>
  </WorkstationFrame>;
});
