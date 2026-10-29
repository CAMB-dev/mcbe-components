import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EnchantingTable, EnchantmentOption, PlayerInventory, WorkstationFrame } from '../src/workstations';
import type { WorkstationTextRenderer } from '../src/workstations';
import { BitmapText } from '../src/bitmap-text';
import type { BitmapFont } from '../src/bitmap-text';
import { gpuProbeWhite } from './bitmap-text-webgl-fixture';
import '../src/styles.css';

// Diagnostic cells, not replacement Minecraft artwork. The cost probe mirrors
// the dimensional challenge of an8x12 cell with negative3px vertical bearing.
export const costProbePage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAMCAYAAABfnvydAAAAEUlEQVR42mP4TwAwjCqglwIA6dV+kG8cc9kAAAAASUVORK5CYII=';
// Deliberately use a9px logical line, not the parent's20CSS-pixel strut. This
// is a synthetic layout contract probe, not a claim about native line height.
export const costProbeFont: BitmapFont = { pages: [costProbePage], lineHeight: 9, glyphs: Object.fromEntries(
  [...'0123456789'].map(char => [char, { page: 0, x: 0, y: 0, width: 8, height: 12, advance: 6, offsetY: -3 }])) };
const labelFont: BitmapFont = { pages: [gpuProbeWhite], lineHeight: 10, glyphs: { A: { page: 0, x: 0, y: 0, width: 2, height: 2, advance: 3 } } };
export const penProbeFont: BitmapFont = { pages: [gpuProbeWhite], lineHeight: 3, glyphs: {
  '1': { page: 0, x: 0, y: 0, width: 2, height: 2, advance: 1, offsetX: -.5, offsetY: -.5 },
  P: { page: 0, x: 0, y: 0, width: 2, height: 2, advance: 4, offsetX: -.5, offsetY: -.5 },
  N: { page: 0, x: 0, y: 0, width: 2, height: 2, advance: -3, offsetX: -.5, offsetY: -.5 },
} };
const domText: WorkstationTextRenderer = (text, context) => <span data-host-kind={context.kind} data-host-context={JSON.stringify(context)}>VISUAL:{text}</span>;

export function WorkstationTextFixture() {
  const [level, setLevel] = useState(11), [locked, setLocked] = useState(false), [events, setEvents] = useState<string[]>([]);
  const [layout, setLayout] = useState<'visual' | 'advance'>('visual'), [probeText, setProbeText] = useState('11'), [probeScale, setProbeScale] = useState(2);
  const [ready, setReady] = useState<Record<string, number>>({}), [errors, setErrors] = useState<string[]>([]);
  const gpuText: WorkstationTextRenderer = (text, context) => <BitmapText font={context.kind === 'enchantment-cost' ? costProbeFont : labelFont}
    renderer="webgl-shared" layout="advance" sampling="point" shader="bitmap" scale={2}
    color={context.kind === 'enchantment-cost' ? context.disabled ? '#ff0000' : '#00ff00' : '#ffffff'}
    shadow={context.kind === 'enchantment-cost' ? { color: '#000000', offsetX: 1, offsetY: 1 } : undefined}
    style={{ display: 'block', verticalAlign: 'top' }} data-host-kind={context.kind} data-host-context={JSON.stringify(context)}
    onRenderError={error => setErrors(previous => [...previous, error.message])}>{text}</BitmapText>;
  return <main>
    <h1>Workstation text adapter</h1>
    <section data-text-case="plain"><WorkstationFrame title="Plain title"/><PlayerInventory label="Loose bag"/>
      <EnchantmentOption id="plain" label="Plain option" level={11}/></section>
    <section data-text-case="hooks"><WorkstationFrame title="A" inventoryLabel="AA" renderText={domText}/>
      <PlayerInventory label="Standalone bag" renderText={domText}/>
      <EnchantmentOption id="standalone" label="Standalone option" level={0} tier={3} renderText={domText} aria-label="Caller name" aria-description="Caller requirement"/>
      <EnchantmentOption id="null" label="Null visual" level={13} renderText={() => null}/>
      <EnchantmentOption id="string" label="String visual" level={11} renderText={text => text}/></section>
    <nav aria-label="Host text state"><button type="button" onClick={() => setLevel(value => value === 11 ? 22 : 11)}>Change host cost</button>
      <button type="button" onClick={() => setLocked(value => !value)}>Toggle host eligibility</button></nav>
    <section data-text-case="gpu"><EnchantingTable title="A" inventoryLabel="AA" renderText={gpuText}
      options={[{ id: 'host-first', label: 'Host option', level, disabled: locked }, { id: 'host-locked', label: 'Locked option', level: 22, disabled: true }]}
      onEnchant={id => setEvents(previous => [...previous, id])}/>
      <EnchantmentOption id="prevented" label="Prevented option" level={11} renderText={gpuText} onClick={event => event.preventDefault()} onEnchant={id => setEvents(previous => [...previous, id])}/>
    </section>
    <nav aria-label="Logical layout probes"><button type="button" onClick={() => setLayout(value => value === 'visual' ? 'advance' : 'visual')}>Toggle probe layout</button>
      <button type="button" onClick={() => setProbeText('PN')}>Probe terminal pen</button><button type="button" onClick={() => setProbeText('\n')}>Probe newline</button>
      <button type="button" onClick={() => { setProbeText('11');setProbeScale(1.25); }}>Probe fractional scale</button></nav>
    <section data-text-case="pen">
      {(['cpu', 'webgl-shared'] as const).map(renderer => <div key={renderer} data-pen-backend={renderer} className="probe-holder">
        <BitmapText font={penProbeFont} renderer={renderer} layout={layout} sampling="point" shader="bitmap" color="#ffffff" scale={probeScale}
          shadow={{ color: '#000000', offsetX: 1, offsetY: 1 }} onReady={() => setReady(previous => ({ ...previous, [renderer]: (previous[renderer] ?? 0) + 1 }))}
          onRenderError={error => setErrors(previous => [...previous, error.message])}>{probeText}</BitmapText>
      </div>)}
    </section>
    <output aria-label="Host text events">{events.join('|')}</output><output aria-label="Text render errors">{errors.join('|')}</output>
    <output aria-label="Pen ready callbacks">{JSON.stringify(ready)}</output>
  </main>;
}
if (typeof document !== 'undefined') { const root = document.getElementById('workstation-text-root');if (root) createRoot(root).render(<WorkstationTextFixture/>); }
