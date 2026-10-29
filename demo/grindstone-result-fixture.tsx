import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Grindstone } from '../src/workstations';
import type { InventoryItem, InventorySlotAction } from '../src/inventory';
import '../src/styles.css';

type Mode = 'null' | 'zero' | 'negative' | 'nan' | 'infinity' | 'valid' | 'invalid';
const modes: readonly Mode[] = ['null', 'zero', 'negative', 'nan', 'infinity', 'valid', 'invalid'];
const image = new URL('./assets/minecraft/diamond.png', import.meta.url).href;
const amounts: Partial<Record<Mode, number>> = { zero: 0, negative: -1, nan: NaN, infinity: Infinity, valid: 1, invalid: 1 };

function Fixture() {
  const [mode, setMode] = useState<Mode>('valid'), [consume, setConsume] = useState(false);
  const [events, setEvents] = useState({ primary: 0, secondary: 0 });
  const result: InventoryItem | null = mode === 'null' ? null : { name: 'Audit result', image, count: amounts[mode] };
  const take = (action: InventorySlotAction) => {
    setEvents(previous => ({ ...previous, [action]: previous[action] + 1 }));
    if (consume) setMode('null');
  };
  return <main>
    <label>Result state <select aria-label="Result state" value={mode} onChange={event => setMode(event.target.value as Mode)}>
      {modes.map(value => <option key={value} value={value}>{value}</option>)}
    </select></label>
    <label><input type="checkbox" checked={consume} onChange={event => setConsume(event.target.checked)}/>Consume on take</label>
    <Grindstone result={result} invalid={mode === 'invalid'} onTakeResult={take}
      inputs={[{ name: 'First input', image }, { name: 'Second input', image }]}/>
    <output aria-label="Grindstone result events">{JSON.stringify(events)}</output>
  </main>;
}

createRoot(document.getElementById('grindstone-result-root')!).render(<Fixture/>);
