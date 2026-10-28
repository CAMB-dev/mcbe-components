import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { Button, Progress } from './components';
import { ContainerFrame } from './containers';
import type { ContainerFrameProps } from './containers';
import { InventoryGrid, ItemCount, ItemImage, ItemSlot, ResultSlot } from './inventory';
import type { InventoryItem, InventorySlotAction } from './inventory';
import { ScrollArea } from './scroll-area';
import { WorkstationFrame } from './workstations';
import type { WorkstationFrameProps } from './workstations';
import { EnchantingRunes } from './enchanting-book';

const cx = (...values: (string | false | undefined)[]) => values.filter(Boolean).join(' ');
const ratio = (value: number | undefined) => value !== undefined && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
const amount = (value: number | undefined) => value !== undefined && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : undefined;
export interface TradeCost { item: InventoryItem; originalCount?: number }
export interface TradeOfferData {
  id: string;
  label: string;
  costs: readonly [TradeCost, TradeCost?];
  result: InventoryItem;
  locked?: boolean;
  available?: boolean;
  crossedOut?: boolean;
  /** Native #padding_around_sell_item binding; no recipe inference is made. */
  paddedResult?: boolean;
}
export interface TradeOfferProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onSelect'> {
  offer: TradeOfferData;
  selected?: boolean;
  onSelect?: (id: string, action: InventorySlotAction) => void;
}
function OfferCost({ cost, index }: { cost?: TradeCost; index: number }) {
  const current = amount(cost?.item.count), old = amount(cost?.originalCount);
  const changed = old !== undefined && old !== (current ?? 1);
  return <span className="mc-trade-offer__cost" data-index={index} aria-hidden="true">
    {cost && <><ItemImage src={cost.item.image}>{cost.item.icon}</ItemImage>
      {changed ? <span className="mc-trade-offer__price-change">
        <span className="mc-trade-offer__old-count">{old}<span className="mc-trade-offer__slash" data-double={old >= 10 || undefined}/></span>{' '}
        <span>{current ?? 1}</span>
      </span> : <ItemCount count={current}/>}</>}
  </span>;
}
function offerAccessibleName(offer: TradeOfferData, label: string) {
  const counts = offer.costs.flatMap(cost => {
    if (!cost) return [];
    const current = amount(cost.item.count), old = amount(cost.originalCount);
    const visible = old !== undefined && old !== (current ?? 1) ? [old, current ?? 1] : current !== undefined && current > 1 ? [current] : [];
    return visible.map(count => ({ count, name: cost.item.name }));
  });
  const result = amount(offer.result.count);
  if (result !== undefined && result > 1) counts.push({ count: result, name: offer.result.name });
  const displayed = counts.map(entry => entry.count).join(' ');
  const names = counts.map(entry => entry.name).filter((name, index, all) => index === 0 || name !== all[index - 1]);
  return !displayed || label.replace(/\s+/g, ' ').includes(displayed) ? label : `${label}; ${counts.map(entry => entry.count).join(' → ')} (${names.join(' → ')})`;
}
/** Controlled Classic trade2 offer; unavailable and locked are separate native states. */
export const TradeOffer = forwardRef<HTMLButtonElement, TradeOfferProps>(function TradeOffer({
  offer, selected = false, onSelect, disabled, className, onClick, onContextMenu, onKeyDown, ...props
}, ref) {
  const blocked = disabled || offer.locked;
  return <button {...props} ref={ref} type={props.type ?? 'button'} disabled={disabled}
    aria-label={props['aria-label'] ?? offerAccessibleName(offer, offer.label)} aria-pressed={selected} aria-disabled={blocked || undefined}
    className={cx('mc-trade-offer', className)} data-offer-id={offer.id} data-selected={selected || undefined}
    data-locked={offer.locked || undefined} data-available={offer.available === false ? 'false' : 'true'}
    data-padded-result={offer.paddedResult === false ? 'false' : 'true'}
    onClick={event => { if (blocked) { event.preventDefault(); return; } onClick?.(event); if (!event.defaultPrevented) onSelect?.(offer.id, 'primary'); }}
    onContextMenu={event => { onContextMenu?.(event); if (event.defaultPrevented) return; event.preventDefault(); if (!blocked) onSelect?.(offer.id, 'secondary'); }}
    onKeyDown={event => { onKeyDown?.(event); if (event.defaultPrevented) return;
      if (event.shiftKey && event.key === 'F10') { event.preventDefault(); if (!blocked) onSelect?.(offer.id, 'secondary'); }
    }}>
    <span className="mc-trade-offer__content">
      <OfferCost cost={offer.costs[0]} index={0}/><span className="mc-trade-offer__gap mc-trade-offer__gap--first">{' '}</span>
      <OfferCost cost={offer.costs[1]} index={1}/><span className="mc-trade-offer__gap mc-trade-offer__gap--second">{' '}</span>
      <span className="mc-trade-offer__arrow-holder" aria-hidden="true">
        {offer.locked ? <span className="mc-trade-offer__lock"/> : <span className="mc-trade-offer__arrow"/>}
        {offer.crossedOut && <span className="mc-trade-offer__cross"/>}
      </span><span className="mc-trade-offer__gap mc-trade-offer__gap--result">{' '}</span>
      <span className="mc-trade-offer__result-holder"><span className="mc-trade-offer__result" aria-hidden="true">
        <ItemImage src={offer.result.image}>{offer.result.icon}</ItemImage><ItemCount count={amount(offer.result.count)}/>
      </span></span>
    </span>
  </button>;
});

export interface TradeTier { id: string; label?: string; unlocked?: boolean; visible?: boolean; offers: readonly TradeOfferData[] }
export interface TradingScreenProps extends Omit<WorkstationFrameProps, 'title' | 'children' | 'onClose' | 'closeLabel'> {
  title?: string;
  tiers?: readonly TradeTier[];
  selectedOfferId?: string;
  onOfferSelect?: (id: string, action: InventorySlotAction) => void;
  inputs?: readonly [InventoryItem | null, InventoryItem | null];
  showSecondInput?: boolean;
  /** Per-collection #item_valid states for the two inputs and result. */
  slotValidity?: readonly [boolean, boolean, boolean];
  result?: InventoryItem | null;
  resultAvailable?: boolean;
  canTrade?: boolean;
  levelProgress?: number;
  possibleProgress?: number;
  showLevelProgress?: boolean;
  tradeLabel?: string;
  helpLabel?: string;
  detailButtons?: readonly [boolean, boolean, boolean];
  onDetails?: (slot: 0 | 1 | 'result') => void;
  /** Caller-owned original ascii_sga.png atlas for the native enchantment-details glyphs. */
  runeAtlasUrl?: string;
  onInputAction?: (index: 0 | 1, action: InventorySlotAction) => void;
  onTakeResult?: (action: InventorySlotAction) => void;
  onTrade?: () => void;
  onHelp?: () => void;
}
export const TradingScreen = forwardRef<HTMLElement, TradingScreenProps>(function TradingScreen({
  title = 'Villager', tiers = [], selectedOfferId, onOfferSelect, inputs = [null, null], showSecondInput = true, slotValidity = [true, true, true],
  result, resultAvailable = true, canTrade = false, levelProgress = 0, possibleProgress = 0, showLevelProgress = true,
  tradeLabel = 'Trade', helpLabel = 'Trading help', detailButtons = [false, false, false], onDetails, runeAtlasUrl, onInputAction, onTakeResult, onTrade, onHelp,
  inventory, hotbar, inventoryLabel, onInventoryAction, className, ...props
}, ref) {
  return <div className="mc-trading-scroll"><section {...props} ref={ref} aria-label={title} className={cx('mc-trading', className)}>
    <div className="mc-trading__left"><ScrollArea className="mc-trading__offers-scroll" label="Trade offers" variant="container"
      viewportProps={{ style: { padding: 2, boxSizing: 'border-box' } }} contentProps={{ style: { paddingBottom: 4 } }}>
      <div className="mc-trading__tiers">{tiers.filter(tier => tier.visible !== false).map(tier => <div key={tier.id} className="mc-trading__tier" data-tier-id={tier.id}>
        {tier.label && <div className="mc-trading__tier-label" data-unlocked={tier.unlocked === false ? 'false' : 'true'}>{tier.label}</div>}
        {tier.offers.map(offer => <div key={offer.id} className="mc-trading__offer-holder"><TradeOffer offer={offer}
          selected={offer.id === selectedOfferId} onSelect={onOfferSelect}/></div>)}
      </div>)}</div>
    </ScrollArea></div>
    <div className="mc-trading__fold" aria-hidden="true"/>
    <WorkstationFrame title={title} onClose={undefined} inventory={inventory} hotbar={hotbar} inventoryLabel={inventoryLabel}
      onInventoryAction={onInventoryAction} className="mc-trading__right">
      {showLevelProgress && <div className="mc-trading__level" style={{ '--mc-tm-possible-progress': `${ratio(possibleProgress) * 100}%` } as CSSProperties}>
        <Progress label="Villager level progress" value={ratio(levelProgress)} max={1} className="mc-trading__level-track"/>
        <span className="mc-trading__level-nub" aria-hidden="true"/>
      </div>}
      <ItemSlot className="mc-trading__input" data-index="0" data-valid={slotValidity[0] ? 'true' : 'false'} aria-invalid={!slotValidity[0] || undefined} label="First trade input" item={inputs[0]}
        onClick={() => onInputAction?.(0, 'primary')} onSecondaryAction={() => onInputAction?.(0, 'secondary')}/>
      {showSecondInput && <ItemSlot className="mc-trading__input" data-index="1" data-valid={slotValidity[1] ? 'true' : 'false'} aria-invalid={!slotValidity[1] || undefined} label="Second trade input" item={inputs[1]}
        onClick={() => onInputAction?.(1, 'primary')} onSecondaryAction={() => onInputAction?.(1, 'secondary')}/>}
      <span className="mc-trading__arrows" data-second-input={showSecondInput ? 'true' : 'false'} aria-hidden="true">
        <span className="mc-trading__arrow mc-trading__arrow--right"/><span className="mc-trading__arrow mc-trading__arrow--left"/>
      </span>
      <ResultSlot className="mc-trading__result-slot" data-valid={slotValidity[2] ? 'true' : 'false'} aria-invalid={!slotValidity[2] || undefined} label="Trade result" item={result} available={resultAvailable}
        onTake={action => onTakeResult?.(action)}/>
      {detailButtons.map((visible, index) => visible && (index !== 1 || showSecondInput) ? <Button key={index}
        className="mc-trading__details" data-index={index} aria-label={index === 2 ? 'Enchantment details' : `Trade input ${index + 1} details`}
        onClick={() => onDetails?.(index === 2 ? 'result' : index as 0 | 1)}>{index === 2 ? <span className="mc-trading__enchantment-label" data-native-font="rune" data-font-unavailable={!runeAtlasUrl || undefined}>
          {runeAtlasUrl && <EnchantingRunes atlasUrl={runeAtlasUrl} text="dab" color="currentColor"/>}</span> : '!'}</Button> : null)}
      <Button className="mc-trading__trade" disabled={!canTrade} onClick={onTrade}>{tradeLabel}</Button>
      <Button className="mc-trading__help" aria-label={helpLabel} onClick={onHelp}>?</Button>
    </WorkstationFrame>
  </section></div>;
});

export type MountEquipmentKind = 'saddle' | 'armor' | 'carpet' | 'nautilus-armor';
export interface MountEquipmentSlot { kind: MountEquipmentKind; item?: InventoryItem | null; showOverlay?: boolean; label?: string }
export interface MountInventoryProps extends Omit<ContainerFrameProps, 'title' | 'height' | 'titleAlign' | 'titleOffset' | 'children'> {
  title?: string;
  equipment?: readonly MountEquipmentSlot[];
  chested?: boolean;
  storageColumns?: number;
  storage?: readonly (InventoryItem | null)[];
  storageSelectedIndex?: number;
  onStorageSelectionChange?: (index: number) => void;
  onStorageAction?: (index: number, action: InventorySlotAction) => void;
  onEquipmentAction?: (index: number, action: InventorySlotAction) => void;
  entityPreview?: ReactNode;
}
export const MountInventory = forwardRef<HTMLElement, MountInventoryProps>(function MountInventory({
  title = 'Horse', equipment = [{ kind: 'saddle' }, { kind: 'armor' }], chested = false, storageColumns = 5,
  storage = [], storageSelectedIndex, onStorageSelectionChange, onStorageAction, onEquipmentAction, entityPreview, className, ...props
}, ref) {
  const columns = Number.isFinite(storageColumns) ? Math.max(1, Math.min(5, Math.floor(storageColumns))) : 5;
  return <ContainerFrame {...props} ref={ref} title={title} height={332} titleOffset={[14, 14]} className={cx('mc-mount-inventory', className)}>
    <div className="mc-mount-inventory__equipment">{equipment.slice(0, 2).map((slot, index) => <ItemSlot key={index}
      label={slot.label ?? `${slot.kind} equipment`} item={slot.item} data-equipment-index={index}
      underlay={slot.showOverlay !== false ? <span className={`mc-mount-inventory__overlay mc-mount-inventory__overlay--${slot.kind}`}/> : undefined}
      onClick={() => onEquipmentAction?.(index, 'primary')} onSecondaryAction={() => onEquipmentAction?.(index, 'secondary')}/>)}</div>
    <div className="mc-mount-inventory__preview-bg"><div className="mc-mount-inventory__entity-preview"
      aria-hidden={!entityPreview || undefined} data-native-renderer="live_horse_renderer" data-renderer-unavailable={!entityPreview || undefined}>{entityPreview}</div></div>
    {chested && <><div className="mc-mount-inventory__storage-bg" aria-hidden="true"/>
      <div className="mc-mount-inventory__storage" data-columns={columns}><InventoryGrid label="Mount storage" columns={columns} size={columns * 3}
        items={storage} selectedIndex={storageSelectedIndex} onSelectionChange={onStorageSelectionChange} onSlotAction={onStorageAction}/></div></>}
  </ContainerFrame>;
});
