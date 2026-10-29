import { useState } from 'react';
import { EnchantingTable } from '../src/workstations';
import type { EnchantmentOption } from '../src/workstations';

const choices: readonly EnchantmentOption[] = [
  { id: 'original-first', label: 'Original first option', level: 3, runes: <span data-preserved-empty-runes>Caller rune content</span> },
  { id: 'original-locked', label: 'Original locked option', level: 15, disabled: true },
  { id: 'original-third', label: 'Original third option', level: 30 },
];

/** Options are caller-owned; empty surfaces do not infer gameplay eligibility. */
export function EnchantingEmptyFixture() {
  const [filled, setFilled] = useState(false), [events, setEvents] = useState<string[]>([]);
  const record = (id: string) => setEvents(previous => [...previous, id]);
  return <section data-enchanting-empty-fixture aria-label="Enchanting empty option calibration">
    <h2>Empty and partial enchanting option collections</h2>
    {[0, 1, 2, 3].map(count => <div key={count} data-enchanting-option-count={count}>
      <EnchantingTable title={`Enchanting with ${count} options`} options={choices.slice(0, count)} onEnchant={record}/>
    </div>)}
    <button type="button" onClick={() => setFilled(true)}>Fill enchanting options</button>
    <button type="button" onClick={() => setFilled(false)}>Clear enchanting options</button>
    <div data-enchanting-options-controlled>
      <EnchantingTable title="Controlled empty enchanting options" options={filled ? choices : []} onEnchant={record}/>
    </div>
    <output aria-label="Empty enchanting events">{events.join('|')}</output>
  </section>;
}
