import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EnchantingTable } from '../src/workstations';
import type { EnchantingTableImageRenderProfile } from '../src/workstations';
import type { InventoryItem } from '../src/inventory';
import type { GuiModelItem, GuiModelGeometry, GuiModelMesh } from '../src/gui-model-geometry';
import { renderGuiLayer } from '../src/gui-layer';
import type { GuiLayerDraw } from '../src/gui-layer';
import type { GuiLayerTextureSource } from '../src/gui-texture-atlas';
import type { PixelTexture } from '../src/item-renderer-engine';
import '../src/styles.css';

export interface ModelConfiguration {
  mode: 'css' | 'default' | 'false' | 'models'; images: boolean; all: boolean; guard: boolean; disabled: boolean; isolated: boolean;
  guiScale: number; displayScale: number; source: 'pixels' | 'url' | 'atlas'; tileUrl: string;
  failure: 'none' | 'projection' | 'texture' | 'atlas-overlap' | 'atlas-size'; opacity: number;
}
export interface ModelWirePixels { width: number; height: number; rgba: string }
export type ModelWireCommand = ({ kind: 'model'; textures: Record<string, ModelWirePixels> } & GuiModelGeometry)
  | { kind: 'image' | 'sprite'; texture: ModelWirePixels; rect: readonly [number, number, number, number]; nineSlice?: { insets: number | readonly [number, number, number, number]; baseSize: readonly [number, number] } };
interface ModelIntegrationQA {
  configure: (value: Partial<ModelConfiguration>) => void; incrementBook: () => void; incrementFallback: () => void; reopen: () => void;
  section: HTMLElement | null; events: string[];
  raw: () => ModelWirePixels & { rect: number[]; renderer: string | null };
  reference: (value: { guiScale: number; outputRect: readonly [number, number, number, number]; commands: ModelWireCommand[] }) => ModelWirePixels;
}
declare global { interface Window { enchantingModelQA: ModelIntegrationQA } }
function encode(data: Uint8Array | Uint8ClampedArray) { let value = ''; for (let i = 0; i < data.length; i += 32768) value += String.fromCharCode(...data.subarray(i, i + 32768)); return btoa(value); }
function decode(value: ModelWirePixels): PixelTexture { return { width: value.width, height: value.height, data: Uint8ClampedArray.from(atob(value.rgba), ch => ch.charCodeAt(0)) }; }
const qa: ModelIntegrationQA = {
  configure: () => {}, incrementBook: () => {}, incrementFallback: () => {}, reopen: () => {}, section: null, events: [],
  raw: () => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas.mc-enchanting-image-layer')!, gl = canvas.getContext('webgl')!;
    const data = new Uint8Array(canvas.width * canvas.height * 4), top = new Uint8Array(data.length);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
    for (let y = 0; y < canvas.height; y++) top.set(data.subarray((canvas.height - y - 1) * canvas.width * 4, (canvas.height - y) * canvas.width * 4), y * canvas.width * 4);
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return { width: canvas.width, height: canvas.height, rgba: encode(top), rect: document.querySelector('.mc-enchanting-image-window')!.getAttribute('data-output-rect')!.split(',').map(Number), renderer: debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : null };
  },
  reference: value => {
    const commands: GuiLayerDraw[] = value.commands.map(command => command.kind === 'model'
      ? { ...command, textures: Object.fromEntries(Object.entries(command.textures).map(([key, texture]) => [key, decode(texture)])) }
      : { ...command, texture: decode(command.texture) });
    const result = renderGuiLayer({ width: 2570, height: 1402, ...value, commands });
    try { return { width: result.width, height: result.height, rgba: encode(result.data) }; } finally { result.dispose(); }
  },
};
window.enchantingModelQA = qa;
function Book() { const [state, setState] = useState(0); qa.incrementBook = () => setState(value => value + 1); return <span className="qa-book" data-book-state={state}>BOOK {state}</span>; }
function Fallback({ index }: { index: number }) { const [state, setState] = useState(0); if (index === 2) qa.incrementFallback = () => setState(value => value + 1); return <span className="qa-fallback" data-fallback-index={index} data-fallback-state={state}>ICON {state}</span>; }
function tilePixels(): PixelTexture { return { width: 2, height: 3, data: new Uint8ClampedArray([40,80,120,128, 180,30,90,255, 20,200,60,255, 230,170,30,128, 75,45,220,255, 190,210,40,255]) }; }
function model(settings: ModelConfiguration): GuiModelItem {
  if (settings.guard) return { model: { faces: [] }, projection: null, textureSizes: { all: [2, 3] }, textures: { all: '/qa-model-never-used.png' } } as unknown as GuiModelItem;
  const atlas = settings.source === 'atlas', uv: GuiModelMesh['faces'][number]['uv'] = atlas ? [[3, 5], [5, 5], [5, 2], [3, 2]] : [[0, 3], [2, 3], [2, 0], [0, 0]];
  const mesh: GuiModelMesh = { faces: [{ texture: 'all', vertices: [[0, 0, 0], [16, 0, 0], [16, 16, 0], [0, 16, 0]], uv, color: [255, 255, 255, 255] }] };
  let texture: GuiLayerTextureSource = settings.source === 'pixels' ? tilePixels() : settings.tileUrl;
  if (atlas) texture = { kind: 'atlas', width: 8, height: 8, tiles: [
    { origin: [3, 2], size: settings.failure === 'atlas-size' ? [3, 3] : [2, 3], texture: settings.tileUrl },
    ...(settings.failure === 'atlas-overlap' ? [{ origin: [3, 2] as const, size: [2, 3] as const, texture: tilePixels() }] : []),
  ] };
  return { model: mesh, projection: settings.failure === 'projection' ? null : { yaw: 0, pitch: 0, scale: 1, offset: [0, 16], originQuantization: 'physical-floor' },
    textureSizes: { all: atlas ? [8, 8] : [2, 3] }, textures: settings.failure === 'texture' ? {} : { all: texture }, hudOpacity: settings.opacity } as GuiModelItem;
}
function App() {
  const [settings, setSettings] = useState<ModelConfiguration>({ mode: 'css', images: false, all: true, guard: false, disabled: false, isolated: false, guiScale: 5, displayScale: 1, source: 'pixels', tileUrl: '/qa-model-tile.png', failure: 'none', opacity: 1 });
  const [shown, setShown] = useState(true), [events, setEvents] = useState<string[]>([]);
  qa.configure = value => setSettings(previous => ({ ...previous, ...value })); qa.reopen = () => setShown(true);
  const emit = (value: string) => { qa.events.push(value); setEvents(previous => [...previous, value]); };
  const all: InventoryItem[] = Array.from({ length: 38 }, (_, index) => ({ name: `Model ${index}`, guiModel: model(settings.isolated && index !== 2 ? { ...settings, failure: 'none', tileUrl: '/qa-model-tile.png' } : settings), icon: <Fallback index={index}/>, count: 1 }));
  all[0] = { ...all[0]!, image: '/qa-model-fallback.png', count: 5, durability: .5, disabled: settings.disabled };
  all[1] = { ...all[1]!, count: 8 };
  if (!settings.all) {
    all[3] = { ...all[3]!, image: undefined, icon: undefined }; all[4] = { ...all[4]!, count: 0 }; all[5] = { ...all[5]!, count: NaN };
    all[6] = { name: 'Plain sprite', image: '/qa-model-fallback.png', count: 1 }; all[7] = { name: 'Custom node', icon: <span data-custom-node className="qa-custom"/> };
    all[37] = { name: 'Custom hotbar', icon: <span data-custom-hotbar className="qa-custom"/> };
  }
  const profile: EnchantingTableImageRenderProfile | undefined = settings.mode === 'css' ? undefined : {
    frame: { width: 2570, height: 1402, guiScale: settings.guiScale }, displayScale: settings.displayScale, itemImages: settings.images,
    ...(settings.mode === 'default' ? {} : { itemModels: settings.mode === 'models' }),
  };
  return <main data-configuration={JSON.stringify(settings)}><button onClick={() => setShown(true)}>Reopen model table</button><div id="host">{shown && <EnchantingTable title="Model table" inventoryLabel="Inventory" ref={node => { qa.section = node; }}
    imageRender={profile} item={all[0]} lapis={all[1]} inventory={all.slice(2, 29)} hotbar={all.slice(29)} book={<Book/>}
    options={[]} onInputAction={(slot, action) => emit(`input:${slot}:${action}`)} onInventoryAction={(index, action) => emit(`inventory:${index}:${action}`)} onClose={() => { emit('close'); setShown(false); }}/>}</div>
    <div id="tail"/><output aria-label="Model integration events">{events.join('|')}</output></main>;
}
createRoot(document.getElementById('model-integration-root')!).render(<App/>);
