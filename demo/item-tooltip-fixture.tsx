import { useState } from 'react';
import { ItemSlot, ItemTooltip } from '../src/inventory';
import type { InventoryItem } from '../src/inventory';

const sword = new URL('./assets/minecraft/diamond_sword.png', import.meta.url).href;
const item: InventoryItem = { name: 'Caller named sword', image: sword, durability: .27, nameColor: '#55ffff', lore: ['Sharpness II', <span key="lore">Caller supplied lore</span>] };
const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;

export function ItemTooltipFixture() {
  const [moves, setMoves] = useState({ count: 0, x: 0, y: 0 }), [edges, setEdges] = useState(false);
  const [standalone, setStandalone] = useState(false), [growing, setGrowing] = useState(false), [wide, setWide] = useState(false);
  const renderedItem: InventoryItem = { name: 'Rendered item', image: sword, lore: ['Rendered lore', <strong key="rich" data-rich-lore>Rich lore</strong>, 42],
    tooltipTextRenderer: (text, context) => <span data-font-row={context.kind} data-font-index={context.index}>{text}</span> };
  return <section id="item-tooltip-fixture" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', minWidth: 0, gap: 16, padding: 20 }}>
    <h2>Item tooltip interaction calibration</h2>
    <button type="button" data-testid="tooltip-before">Before tooltip source</button>
    <div data-case="tooltip-tracking" style={{ minHeight: 220, display: 'flex', justifyContent: 'flex-start', alignItems: 'center', paddingInlineStart: 16 }}>
      <ItemSlot data-testid="tooltip-source" label="Tooltip movement source" item={item} onMouseMove={event => setMoves(previous => ({ count: previous.count + 1, x: event.clientX, y: event.clientY }))} />
    </div>
    <button type="button" data-testid="tooltip-after">After tooltip source</button>
    <output aria-label="Tooltip pointer callbacks" style={{ overflowWrap: 'anywhere' }}>{JSON.stringify(moves)}</output>
    <button type="button" onClick={() => setEdges(value => !value)}>Toggle tooltip viewport sources</button>
    <ItemSlot label="Custom font source" item={renderedItem}/>
    <button type="button" onClick={() => setStandalone(value => !value)}>Toggle standalone text renderer</button>
    {standalone && <ItemTooltip data-testid="standalone-text-renderer" item={renderedItem}
      renderText={(text, context) => <em data-override-row={context.kind}>{text}</em>} style={{ left: 20, top: 80 }}/>}
    <button type="button" onClick={() => setGrowing(value => !value)}>Toggle growing text source</button>
    {growing && <ItemSlot label="Growing font source" style={{ position: 'fixed', right: 2, bottom: 2 }}
      item={{ name: 'Text', image: sword, tooltipTextRenderer: text => <span style={{ display: 'inline-block', width: wide ? 240 : 40, height: 20 }}>{text}</span> }}
      onKeyDown={event => { if (event.key === 'g') setWide(true); }}/>}
    {edges && <div data-case="tooltip-viewport-sources" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      {corners.map(corner => <ItemSlot key={corner} label={`Tooltip ${corner} source`} item={{ name: 'Viewport item with wrapping title', image: sword, lore: ['First explicit lore line', 'Second explicit lore line'] }}
        style={{ position: 'absolute', pointerEvents: 'auto', ...(corner.startsWith('top') ? { top: 2 } : { bottom: 2 }), ...(corner.endsWith('left') ? { left: 2 } : { right: 2 }) }} />)}
    </div>}
  </section>;
}
