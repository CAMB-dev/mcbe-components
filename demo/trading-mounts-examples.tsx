import { useState } from 'react';
import { Button, Checkbox, Select, Slider } from '../src/components';
import { MountInventory, TradeOffer, TradingScreen } from '../src/trading-mounts';
import type { MountEquipmentSlot, TradeOfferData, TradeTier } from '../src/trading-mounts';
import type { InventoryItem } from '../src/inventory';
import { gameItemTextures } from './materials';
import type { GameItemName } from './materials';

const item = (key: GameItemName, name: string, count?: number): InventoryItem => ({ name, count, image: gameItemTextures[key].src });
const inventory = [item('gem', 'Emerald', 32), item('diamond', 'Diamond', 12), item('apple', 'Apple', 8), item('paper', 'Paper', 24), item('ironSword', 'Iron sword')];
const storage = [item('apple', 'Apple', 8), item('coal', 'Coal', 32), item('goldIngot', 'Gold ingot', 4), null, item('stick', 'Stick', 16),
  item('paper', 'Paper', 24), null, item('diamond', 'Diamond', 3), null, item('ironIngot', 'Iron ingot', 7), null, null, item('lapis', 'Lapis lazuli', 12)];

export function TradingMountsExamples({ notify = () => {} }: { notify?: (message: string) => void }) {
  const [selected, setSelected] = useState('iron-sword'), [unavailable, setUnavailable] = useState(false), [taken, setTaken] = useState(false);
  const [progress, setProgress] = useState(35), [mount, setMount] = useState('horse'), [chested, setChested] = useState(false);
  const [columns, setColumns] = useState(3), [selectedStorage, setSelectedStorage] = useState(0), [open, setOpen] = useState(true);
  const offers: TradeOfferData[] = [
    { id: 'iron-sword', label: '7 emeralds for an iron sword', costs: [{ item: item('gem', 'Emerald', 7) }], result: item('ironSword', 'Iron sword'), available: !unavailable, crossedOut: unavailable },
    { id: 'paper', label: 'Discount: 12 paper instead of 24 for an emerald', costs: [{ item: item('paper', 'Paper', 12), originalCount: 24 }], result: item('gem', 'Emerald') },
    { id: 'sword-upgrade', label: 'Custom two-item offer: diamond sword and 4 emeralds for a netherite sword', costs: [{ item: item('sword', 'Diamond sword') }, { item: item('gem', 'Emerald', 4) }], result: item('netheriteSword', 'Netherite sword'), paddedResult: false },
    { id: 'locked', label: 'Locked master trade', costs: [{ item: item('diamond', 'Diamond', 6) }], result: item('gem', 'Emerald', 12), locked: true },
  ];
  const selectedOffer = offers.find(offer => offer.id === selected) ?? offers[0]!;
  const tiers: TradeTier[] = [{ id: 'novice', label: 'Novice', offers: offers.slice(0, 3) }, { id: 'master', label: 'Master — locked', unlocked: false, offers: [offers[3]!] }];
  const equipment: MountEquipmentSlot[] = mount === 'horse' ? [{ kind: 'saddle' }, { kind: 'armor' }]
    : mount === 'llama' ? [{ kind: 'carpet' }] : [{ kind: 'saddle' }];
  return <section id="trading-mounts" aria-labelledby="trading-mounts-title">
    <div className="section-heading"><span className="eyebrow">Controlled Classic screens</span><h2 id="trading-mounts-title">Trading & mount inventories</h2></div>
    <div className="processing-controls">
      <Checkbox label="First trade is out of stock" checked={unavailable} onChange={event => setUnavailable(event.target.checked)}/>
      <Slider label="Villager level progress" value={progress} onValueChange={setProgress} min={0} max={100}/>
      <Button size="sm" onClick={() => { setSelected('iron-sword'); setUnavailable(false); setTaken(false); setProgress(35); setOpen(true); }}>Reset trading & mounts</Button>
    </div>
    <TradingScreen title="Weaponsmith — Novice" tiers={tiers} selectedOfferId={selected} inventory={inventory}
      onOfferSelect={(id, action) => { setSelected(id); setTaken(false); notify(`${action}: selected offer ${id}`); }}
      inputs={[selectedOffer.costs[0].item, selectedOffer.costs[1]?.item ?? null]} showSecondInput={!!selectedOffer.costs[1]}
      slotValidity={[selectedOffer.available !== false, true, selectedOffer.available !== false]}
      result={taken ? null : selectedOffer.result} resultAvailable={selectedOffer.available !== false && !selectedOffer.locked}
      levelProgress={progress / 100} possibleProgress={Math.min(1, progress / 100 + .15)} canTrade={!selectedOffer.locked && selectedOffer.available !== false}
      onInputAction={(index, action) => notify(`${action}: trade input ${index + 1}`)}
      onTakeResult={action => { setTaken(true); notify(`${action}: trade result taken in demo state`); }}
      onTrade={() => { setTaken(false); notify('Host trade callback received; no game transaction was performed.'); }} onHelp={() => notify('Select an offer, inspect its prices, then provide the host trade callback.')}/>
    <p className="workstation-note">Prices, stock, experience and transactions belong to your application. The two-item offer is custom sample data; these controls only change the demo state.</p>
    <div className="processing-controls">
      <Select label="Mount profile" value={mount} options={[{ value: 'horse', label: 'Horse' }, { value: 'donkey', label: 'Donkey' }, { value: 'llama', label: 'Llama' }]}
        onChange={event => { setMount(event.target.value); setChested(event.target.value !== 'horse'); setOpen(true); }}/>
      <Checkbox label="Mount has storage chest" checked={chested} onChange={event => setChested(event.target.checked)}/>
      <Slider label="Mount storage columns" min={1} max={5} value={columns} onValueChange={value => { setColumns(value); setSelectedStorage(0); }}/>
    </div>
    {open ? <MountInventory title={mount === 'llama' ? 'Llama' : mount === 'donkey' ? 'Donkey' : 'Horse'} equipment={equipment}
      chested={chested} storageColumns={columns} storage={storage} storageSelectedIndex={selectedStorage} onStorageSelectionChange={setSelectedStorage}
      inventory={inventory} hotbar={inventory} onStorageAction={(index, action) => notify(`${action}: mount storage ${index + 1}`)}
      onEquipmentAction={(index, action) => notify(`${action}: mount equipment ${index + 1}`)} onClose={() => setOpen(false)}/>
      : <Button onClick={() => setOpen(true)}>Open mount inventory</Button>}
    <p className="workstation-note">The original entity-preview background is shown. Supply your live entity renderer through entityPreview; no horse or llama artwork is invented.</p>
    <details className="example-code"><summary>Trade offer and controlled screen API</summary><pre>{`<TradeOffer offer={offer} selected onSelect={selectOffer} />
<TradingScreen tiers={tiers} selectedOfferId={selected}
  onOfferSelect={selectOffer} inputs={inputs} result={result}
  canTrade={canTrade} onTrade={trade} />
<MountInventory equipment={equipment} chested storageColumns={3}
  storage={items} onStorageAction={moveItem} entityPreview={renderer} />`}</pre></details>
    <div className="workstation-examples" aria-label="Standalone trade offer"><div style={{ width: 240 }}><TradeOffer offer={offers[1]!} selected onSelect={() => notify('Selected standalone discounted offer')}/></div></div>
  </section>;
}
