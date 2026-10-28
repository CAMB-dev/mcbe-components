import { useState } from 'react';
import { AirBar, ArmorBar, ExperienceBar, HealthBar, Hotbar, HungerBar } from '../src/hud';
import type { InventoryItem } from '../src/inventory';

export function HudInteractionFixture() {
  const items: readonly (InventoryItem | null)[] = [
    { name: 'First item', count: 3 }, { name: 'Disabled item', disabled: true }, { name: 'Third item', durability: .5 },
  ];
  const [selection, setSelection] = useState(-1);
  const [action, setAction] = useState('');
  const [outsideKeys, setOutsideKeys] = useState(0);
  return <section id="hud-interaction-fixture" aria-label="HUD interaction fixtures" tabIndex={0} style={{ display: 'grid', gap: 16, justifyItems: 'start', minWidth: 0, maxWidth: '100%', overflowX: 'auto' }}>
    <h2>HUD interaction fixtures</h2>
    <Hotbar label="Uncontrolled hotbar" items={items} defaultSelectedIndex={2}
      onSelectionChange={setSelection} onSlotAction={(index, type) => setAction(`${index}:${type}`)}/>
    <Hotbar label="Controlled hotbar" items={items} selectedIndex={0}
      onSelectionChange={setSelection} onSlotAction={(index, type) => setAction(`${index}:${type}`)}/>
    <Hotbar label="Disabled hotbar" items={items} disabled onSelectionChange={setSelection} onSlotAction={(index, type) => setAction(`${index}:${type}`)}/>
    <input aria-label="Outside hotbar input" onKeyDown={() => setOutsideKeys(value => value + 1)}/>
    <output aria-label="HUD selected event">{selection}</output>
    <output aria-label="HUD action event">{action}</output>
    <output aria-label="Outside hotbar keys">{outsideKeys}</output>
    <HealthBar value={NaN} label="Nonfinite health"/>
    <HungerBar value={Infinity} label="Nonfinite hunger"/>
    <ArmorBar value={99} label="Clamped armor"/>
    <AirBar value={-1} label="Clamped air"/>
    <AirBar states={['pop', 'empty', 'full']} label="Explicit bubble states"/>
    <ExperienceBar progress={Infinity} level={NaN} label="Nonfinite experience"/>
    <ExperienceBar progress={2} level={23.9} label="Clamped experience"/>
  </section>;
}
