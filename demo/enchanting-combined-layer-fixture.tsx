import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EnchantingTable } from '../src/workstations';
import type { EnchantingTableImageRenderProfile } from '../src/workstations';
import { renderGuiLayer } from '../src/gui-layer';
import type { GuiLayerRenderOptions, GuiLayerDraw } from '../src/gui-layer';
import type { GuiTextFont } from '../src/gui-text-geometry';
import type { PixelTexture } from '../src/item-renderer-engine';
import '../src/styles.css';
import '../src/fonts.css';

// Synthetic public fixture resource, not a Minecraft font or a producer snapshot.
const png = "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAACe0lEQVR4Ae3Bi40UUAwEME+0/bc8IIHE73gNJHba+q7egnoL6i2ot6DegnoLiqDegnoL6i2ot6DegnoLiqDegvrCOKuNs9o4q42z2jirjbPaOKuNs9o4q42z2jirpa2z1zirjbPaOKt9UAT1FtRbUG9BvQX1FhRBvQX1FtRbUG9BvQX1FhRBvQX1FtRfxlltnNXGWW2c1cZZbZzVxlltnNXGWW2c1cZZLW2dvcZZbZzVxlntg/ohqLeg3oJ6C+otKIJ6C+otqLeg3oJ6C+otKIJ6C+otqLegfjPOauOsNs5q46w2zmrjrDbOauOsNs5q46w2zmpp6+w1zmrjrDbOah/UL0G9BfUW1FtQBPUW1FtQb0G9BfUW1FtQBPUW1FtQb0G9BfXTOKuNs9o4q42z2jirjbPaOKuNs9o4q42z2jirpa2z1zirjbPaOKt9UH8K6i2ot6AI6i2ot6DegnoL6i2ot6AI6i2ot6DegnoL6i2o78ZZbZzVxlltnNXGWW2c1cZZbZzVxlltnNXGWS1tnb3GWW2c1cZZ7YP6V1BvQRHUW1BvQb0F9RbUW1BvQRHUW1BvQb0F9RbUW1BvQcdZbZzVxlltnNXGWW2c1cZZbZzVxlltnNXGWS1tnb3GWW2c1cZZ7YP6WlAE9RbUW1BvQb0F9RbUW1AE9RbUW1BvQb0F9RbUW1AE9R/jrDbOauOsNs5q46w2zmrjrDbOauOsNs5q46yWts5e46w2zmrjrPbxQ70F9RbUW1BvQb0F9RYUQb0F9RbUW1BvQb0F9RYUQb0F9YVxVhtntXFWG2e1cVYbZ7VxVhtntXFWG2e1cVZLW2evcVYbZ7VxVvsGk2Wh43wOjwsAAAAASUVORK5CYII=";
// A complete synthetic PNG makes this standalone fixture reproducible without
// private font files. It is never a substitute for a caller's production font.
let fontUrl = `data:image/png;base64,${png}`;
export function syntheticFont(url = fontUrl): GuiTextFont {
  return { pages: [url], pageSizes: [128], cellHeight: 12, lineHeight: 12,
    glyphs: Object.fromEntries(Array.from({ length: 95 }, (_, i) => [String.fromCharCode(i + 32),
      { page: 0, x: i % 16 * 8, y: Math.floor(i / 16) * 16, width: 8, height: 12, advance: 6, offsetY: -3 }])) };
}
export interface CombinedConfiguration {
  mode: 'css' | 'images' | 'combined' | 'invalid-metrics' | 'missing-glyph' | 'url-failure' | 'bad-frame';
  guiScale: number;
  displayScale: number;
  runeProfile: boolean;
  runePolicy: 'both' | 'text-only' | 'node-only';
  disabled: boolean;
  longRunes: boolean;
}
export interface WirePixels { width: number; height: number; rgba: string }
export interface WireImage { kind: 'image'; texture: WirePixels; rect: readonly [number, number, number, number]; nineSlice?: { insets: number | readonly [number, number, number, number]; baseSize: readonly [number, number] }; hudOpacity?: number }
export interface WireText { kind: 'text'; text: string; origin: readonly [number, number]; color: readonly [number, number, number, number]; shadow?: { offset: readonly [number, number]; tint: readonly [number, number, number, number] } }
export interface CombinedQA {
  configure: (value: Partial<CombinedConfiguration>) => void;
  setFontUrl: (url: string) => void;
  incrementBook: () => void;
  reopen: () => void;
  section: HTMLElement | null;
  events: string[];
  raw: () => WirePixels & { rect: number[]; renderer: string | null };
  reference: (value: { width: number; height: number; guiScale: number; outputRect: readonly [number, number, number, number]; commands: readonly (WireImage | WireText)[]; fontPixels: WirePixels }) => WirePixels;
}
declare global { interface Window { enchantingCombinedQA: CombinedQA } }
function encode(bytes: Uint8Array | Uint8ClampedArray) { let value = ''; for (let i = 0; i < bytes.length; i += 32768) value += String.fromCharCode(...bytes.subarray(i, i + 32768)); return btoa(value); }
function decode(value: WirePixels): PixelTexture { return { width: value.width, height: value.height, data: Uint8ClampedArray.from(atob(value.rgba), ch => ch.charCodeAt(0)) }; }
const qa: CombinedQA = {
  configure: () => {}, setFontUrl: url => { fontUrl = url; }, incrementBook: () => {}, reopen: () => {}, section: null, events: [],
  raw: () => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas.mc-enchanting-image-layer')!;
    const gl = canvas.getContext('webgl')!, bytes = new Uint8Array(canvas.width * canvas.height * 4), top = new Uint8Array(bytes.length);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    for (let y = 0; y < canvas.height; y++) top.set(bytes.subarray((canvas.height - y - 1) * canvas.width * 4, (canvas.height - y) * canvas.width * 4), y * canvas.width * 4);
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return { width: canvas.width, height: canvas.height, rgba: encode(top), rect: document.querySelector('.mc-enchanting-image-window')!.getAttribute('data-output-rect')!.split(',').map(Number), renderer: debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : null };
  },
  reference: value => {
    const commands: GuiLayerDraw[] = value.commands.map(command => command.kind === 'image' ? { ...command, texture: decode(command.texture) }
      : { ...command, font: syntheticFont(), fontScale: 1, sampling: 'point', shader: 'bitmap', pages: new Map([[0, decode(value.fontPixels)]]) });
    const options: GuiLayerRenderOptions = { ...value, commands };
    const result = renderGuiLayer(options);
    try { return { width: result.width, height: result.height, rgba: encode(result.data) }; } finally { result.dispose(); }
  },
};
window.enchantingCombinedQA = qa;
function StatefulBook() {
  const [state, setState] = useState(0);
  qa.incrementBook = () => setState(value => value + 1);
  return <span className="qa-book" data-book-state={state}>BOOK {state}</span>;
}
function App() {
  const [configuration, setConfiguration] = useState<CombinedConfiguration>({ mode: 'css', guiScale: 5, displayScale: 1, runeProfile: true, runePolicy: 'both', disabled: true, longRunes: false });
  const [open, setOpen] = useState(true), [events, setEvents] = useState<string[]>([]);
  qa.configure = value => setConfiguration(previous => ({ ...previous, ...value })); qa.reopen = () => setOpen(true);
  const emit = (value: string) => { qa.events.push(value); setEvents(previous => [...previous, value]); };
  const profile = useMemo<EnchantingTableImageRenderProfile | undefined>(() => {
    if (configuration.mode === 'css') return undefined;
    const frame = { width: 2570, height: 1402, guiScale: configuration.mode === 'bad-frame' ? 0 : configuration.guiScale };
    if (configuration.mode === 'images') return { frame, displayScale: configuration.displayScale };
    const font = syntheticFont(configuration.mode === 'url-failure' ? '/qa-missing-font.png' : fontUrl);
    if (configuration.mode === 'missing-glyph') { const { E: _missing, ...glyphs } = font.glyphs; font.glyphs = glyphs; }
    const style = { font, fontScale: 1, sampling: 'point' as const, shader: 'bitmap' as const };
    return { frame, displayScale: configuration.displayScale, text: { metrics: { lineHeight: configuration.mode === 'invalid-metrics' ? 0 : 9, paintOffset: [1, 1] }, labels: style, costs: style, runes: configuration.runeProfile ? style : undefined } };
  }, [configuration]);
  const options = [1, 2, 3].map(tier => ({ id: `tier-${tier}`, label: `Enchantment ${tier}`, level: tier, disabled: configuration.disabled && tier === 2,
    runeText: configuration.runePolicy === 'node-only' ? undefined : configuration.longRunes ? 'aB.'.repeat(28) : ['aB.c', 'Def.', 'GhI.'][tier - 1],
    runes: configuration.runePolicy === 'text-only' ? undefined : <span className="qa-runes" data-rune-node={tier}>HOST NODE {tier}</span> }));
  return <main data-configuration={JSON.stringify(configuration)}>
    <div id="controls"><button onClick={() => setOpen(true)}>Reopen table</button><button onClick={() => qa.incrementBook()}>Advance book</button></div>
    <div id="host">{open && <EnchantingTable title="Enchant" inventoryLabel="Inventory" ref={node => { qa.section = node; }}
      imageRender={profile} options={options} book={<StatefulBook/>}
      renderText={(text, context) => <span data-custom-text={context.kind} style={{ color: '#0029a3' }}>{text}</span>}
      item={{ name: 'Caller sword', icon: <span className="qa-item" data-live-item/> }} lapis={{ name: 'Caller lapis', count: 8, icon: <span className="qa-item" data-live-lapis/> }}
      inventory={[{ name: 'Caller diamond', icon: <span className="qa-item" data-live-inventory/> }]} hotbar={[{ name: 'Caller apple', icon: <span className="qa-item" data-live-hotbar/> }]}
      onInputAction={(slot, action) => emit(`input:${slot}:${action}`)} onEnchant={id => emit(`enchant:${id}`)}
      onInventoryAction={(index, action) => emit(`inventory:${index}:${action}`)} onClose={() => { emit('close'); setOpen(false); }}/>}</div>
    <div id="tail"/><output aria-label="Combined integration events">{events.join('|')}</output>
  </main>;
}
createRoot(document.getElementById('combined-root')!).render(<App/>);
