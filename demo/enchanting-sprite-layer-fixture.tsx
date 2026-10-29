import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EnchantingTable } from '../src/workstations';
import type { EnchantingTableImageRenderProfile } from '../src/workstations';
import type { InventoryItem } from '../src/inventory';
import { renderGuiLayer } from '../src/gui-layer';
import type { GuiLayerDraw } from '../src/gui-layer';
import type { GuiTextFont } from '../src/gui-text-geometry';
import '../src/styles.css';

export interface SpriteConfiguration {
  mode: 'css' | 'default' | 'false' | 'items' | 'combined'; guiScale: number; displayScale: number;
  mixed: boolean; image: string; invalidMetrics: boolean; disabledInput: boolean; options: boolean;
}
export interface SpriteWirePixels { width: number; height: number; rgba: string }
export interface SpriteWireCommand {
  kind: 'image' | 'sprite'; texture: SpriteWirePixels; rect: readonly [number, number, number, number];
  nineSlice?: { insets: number | readonly [number, number, number, number]; baseSize: readonly [number, number] };
}
interface SpriteIntegrationQA {
  configure: (value: Partial<SpriteConfiguration>) => void; incrementBook: () => void; reopen: () => void;
  section: HTMLElement | null; events: string[];
  raw: () => SpriteWirePixels & { rect: number[]; renderer: string | null };
  reference: (value: { guiScale: number; outputRect: readonly [number, number, number, number]; commands: SpriteWireCommand[] }) => SpriteWirePixels;
}
declare global { interface Window { enchantingSpriteQA: SpriteIntegrationQA } }
function encode(data: Uint8Array | Uint8ClampedArray) { let value = ''; for (let i = 0; i < data.length; i += 32768) value += String.fromCharCode(...data.subarray(i, i + 32768)); return btoa(value); }
const qa: SpriteIntegrationQA = {
  configure: () => {}, incrementBook: () => {}, reopen: () => {}, section: null, events: [],
  raw: () => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas.mc-enchanting-image-layer')!, gl = canvas.getContext('webgl')!;
    const data = new Uint8Array(canvas.width * canvas.height * 4), top = new Uint8Array(data.length);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
    for (let y = 0; y < canvas.height; y++) top.set(data.subarray((canvas.height - y - 1) * canvas.width * 4, (canvas.height - y) * canvas.width * 4), y * canvas.width * 4);
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return { width: canvas.width, height: canvas.height, rgba: encode(top), rect: document.querySelector('.mc-enchanting-image-window')!.getAttribute('data-output-rect')!.split(',').map(Number), renderer: debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : null };
  },
  reference: value => {
    const commands: GuiLayerDraw[] = value.commands.map(command => ({ ...command, texture: { width: command.texture.width, height: command.texture.height, data: Uint8ClampedArray.from(atob(command.texture.rgba), c => c.charCodeAt(0)) } }));
    const result = renderGuiLayer({ width: 2570, height: 1402, ...value, commands });
    try { return { width: result.width, height: result.height, rgba: encode(result.data) }; } finally { result.dispose(); }
  },
};
window.enchantingSpriteQA = qa;
function Book() { const [state, setState] = useState(0); qa.incrementBook = () => setState(value => value + 1); return <span className="qa-book" data-book-state={state}>BOOK {state}</span>; }
function font(): GuiTextFont {
  return { pages: ['/qa-sprite-font.png'], pageSizes: [128], cellHeight: 12, lineHeight: 12,
    glyphs: { '1': { page: 0, x: 0, y: 0, width: 8, height: 12, advance: 6, offsetY: -3 }, 'A': { page: 0, x: 8, y: 0, width: 8, height: 12, advance: 6, offsetY: -3 } } };
}
function App() {
  const [settings, setSettings] = useState<SpriteConfiguration>({ mode: 'css', guiScale: 5, displayScale: 1, mixed: false, image: '/qa-sprite-a.png', invalidMetrics: false, disabledInput: false, options: false });
  const [shown, setShown] = useState(true), [events, setEvents] = useState<string[]>([]);
  qa.configure = value => setSettings(previous => ({ ...previous, ...value })); qa.reopen = () => setShown(true);
  const emit = (value: string) => { qa.events.push(value); setEvents(previous => [...previous, value]); };
  const all: InventoryItem[] = Array.from({ length: 38 }, (_, i) => ({ name: `Sprite ${i}`, image: settings.image, count: 1 }));
  all[0] = { ...all[0]!, count: 5, durability: .5, disabled: settings.disabledInput };
  all[1] = { ...all[1]!, count: 8 };
  if (settings.mixed) {
    all[4] = { ...all[4]!, count: 0 }; all[5] = { ...all[5]!, image: undefined, icon: <span data-custom-slot="5" className="qa-custom"/> };
    all[6] = { ...all[6]!, count: NaN }; all[37] = { name: 'Custom last', icon: <span data-custom-slot="37" className="qa-custom"/> };
  }
  const style = { font: font(), fontScale: 1, sampling: 'point' as const, shader: 'bitmap' as const };
  const profile: EnchantingTableImageRenderProfile | undefined = settings.mode === 'css' ? undefined : {
    frame: { width: 2570, height: 1402, guiScale: settings.guiScale }, displayScale: settings.displayScale,
    ...(settings.mode === 'default' ? {} : { itemImages: settings.mode !== 'false' }),
    ...(settings.mode === 'combined' ? { text: { metrics: { lineHeight: settings.invalidMetrics ? 0 : 10, paintOffset: [0, 1] }, labels: style, costs: style, runes: style } } : {}),
  };
  return <main data-configuration={JSON.stringify(settings)}><button onClick={() => setShown(true)}>Reopen sprite table</button><div id="host">{shown && <EnchantingTable title="1" inventoryLabel="1" ref={node => { qa.section = node; }}
    imageRender={profile} item={all[0]} lapis={all[1]} inventory={all.slice(2, 29)} hotbar={all.slice(29)} book={<Book/>}
    options={settings.options ? [{ id: 'first', label: 'First', level: 1, runeText: 'A' }] : []}
    onInputAction={(slot, action) => emit(`input:${slot}:${action}`)} onInventoryAction={(index, action) => emit(`inventory:${index}:${action}`)} onEnchant={id => emit(`enchant:${id}`)} onClose={() => { emit('close'); setShown(false); }}/>}</div>
    <div id="tail"/><output aria-label="Sprite integration events">{events.join('|')}</output></main>;
}
createRoot(document.getElementById('sprite-integration-root')!).render(<App/>);
