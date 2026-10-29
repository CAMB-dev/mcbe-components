import { createRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BlockPreview } from '../src';
import type { BlockKind, ItemCamera } from '../src';

const views: readonly [string, ItemCamera][] = [
  ['front', { yaw: 0, pitch: 0 }], ['right', { yaw: 90, pitch: 0 }],
  ['top', { yaw: 0, pitch: 90 }], ['bottom', { yaw: 0, pitch: -90 }],
];
const unitLight = { top: 1, left: 1, right: 1, bottom: 1 };
const ref = createRef<HTMLCanvasElement>();
function Fixture() {
  const [block, setBlock] = useState<BlockKind>('enchanting-table');
  const [events, setEvents] = useState({ ready: 0, errors: 0 });
  const top = new URL('../src/assets/item-renderers/enchanting_table_top.png', import.meta.url).href;
  return <main>
    {views.map(([name, camera]) => <section key={name} data-case={name}>
      <span>{name}</span><BlockPreview block="enchanting-table" size={80} resolution={80}
        camera={{ ...camera, zoom: 1, padding: 0, offsetX: 0, offsetY: 0 }} lighting={unitLight}/>
    </section>)}
    <section data-case="all-override"><BlockPreview block="enchanting-table" size={80} resolution={80}
      textures={{ all: top }} camera={{ yaw: 0, pitch: 0, zoom: 1, padding: 0, offsetX: 0, offsetY: 0 }} lighting={unitLight}/></section>
    <section data-case="side-override"><BlockPreview block="enchanting-table" size={80} resolution={80}
      textures={{ side: top }} camera={{ yaw: 0, pitch: 0, zoom: 1, padding: 0, offsetX: 0, offsetY: 0 }} lighting={unitLight}/></section>
    <section data-case="named"><BlockPreview block="enchanting-table" label="Enchanting table item" ref={ref} onClick={() => setEvents(value => ({ ...value, ready: value.ready + 100 }))}/></section>
    <section data-case="decorative"><BlockPreview block="enchanting-table" decorative/></section>
    <section data-case="explicit-aria"><BlockPreview block="enchanting-table" label="Fallback" aria-label="Custom item name"/></section>
    <section data-case="controlled"><BlockPreview block={block} size={80} resolution={80}
      onReady={() => setEvents(value => ({ ...value, ready: value.ready + 1 }))}
      onRenderError={() => setEvents(value => ({ ...value, errors: value.errors + 1 }))}/>
      <button onClick={() => setBlock(value => value === 'enchanting-table' ? 'stone' : 'enchanting-table')}>Switch preset</button>
      <button onClick={() => setEvents(value => ({ ...value, ready: value.ready + (ref.current?.tagName === 'CANVAS' ? 10 : -10) }))}>Check canvas ref</button>
      <output aria-label="Item renderer events">{JSON.stringify(events)}</output>
    </section>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
