import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Grindstone } from '../src/workstations';
import type { GrindstoneImageRenderProfile } from '../src/workstations';
import type { InventoryItem } from '../src/inventory';
import type { GuiModelItem, GuiModelGeometry, GuiModelMesh } from '../src/gui-model-geometry';
import { renderGuiLayer } from '../src/gui-layer';
import type { GuiLayerDraw } from '../src/gui-layer';
import type { GuiLayerTextureSource } from '../src/gui-texture-atlas';
import type { GuiTextFont, GuiTextGeometry } from '../src/gui-text-geometry';
import type { PixelTexture } from '../src/item-renderer-engine';
import '../src/styles.css';

export interface GrindConfiguration {
  mode: 'css' | 'images' | 'combined'; content: 'sprites' | 'models' | 'mixed'; itemImages: boolean; itemModels: boolean;
  invalid: boolean; result: 'full' | 'null' | 'zero' | 'nan'; guiScale: number; displayScale: number;
  source: 'pixels' | 'url' | 'atlas'; tileUrl: string; failure: 'none' | 'metrics' | 'projection' | 'atlas-size';
}
export interface GrindWirePixels { width: number; height: number; rgba: string }
export type GrindWireCommand = ({ kind: 'model'; textures: Record<string, GrindWirePixels> } & GuiModelGeometry)
  | { kind: 'image' | 'sprite'; texture: GrindWirePixels; rect: readonly [number, number, number, number]; nineSlice?: { insets: number | readonly [number, number, number, number]; baseSize: readonly [number, number] } }
  | ({ kind: 'text'; font: GuiTextFont; fontPixels: GrindWirePixels } & GuiTextGeometry);
interface GrindIntegrationQA {
  configure: (value: Partial<GrindConfiguration>) => void; incrementFallback: () => void; reopen: () => void;
  section: HTMLElement | null; events: string[];
  raw: () => GrindWirePixels & { rect: number[]; renderer: string | null };
  reference: (value: { guiScale: number; outputRect: readonly [number, number, number, number]; commands: GrindWireCommand[] }) => GrindWirePixels;
}
declare global { interface Window { grindstoneSourceQA: GrindIntegrationQA } }
function encode(data: Uint8Array | Uint8ClampedArray) { let value = ''; for (let i = 0; i < data.length; i += 32768) value += String.fromCharCode(...data.subarray(i, i + 32768)); return btoa(value); }
function decode(value: GrindWirePixels): PixelTexture { return { width: value.width, height: value.height, data: Uint8ClampedArray.from(atob(value.rgba), ch => ch.charCodeAt(0)) }; }
const qa: GrindIntegrationQA = {
  configure: () => {}, incrementFallback: () => {}, reopen: () => {}, section: null, events: [],
  raw: () => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas.mc-grindstone-image-layer')!, gl = canvas.getContext('webgl')!;
    const data = new Uint8Array(canvas.width * canvas.height * 4), top = new Uint8Array(data.length);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
    for (let y = 0; y < canvas.height; y++) top.set(data.subarray((canvas.height - y - 1) * canvas.width * 4, (canvas.height - y) * canvas.width * 4), y * canvas.width * 4);
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return { width: canvas.width, height: canvas.height, rgba: encode(top), rect: document.querySelector('.mc-grindstone-image-window')!.getAttribute('data-output-rect')!.split(',').map(Number), renderer: debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : null };
  },
  reference: value => {
    const commands: GuiLayerDraw[] = value.commands.map(command => command.kind === 'model'
      ? { ...command, textures: Object.fromEntries(Object.entries(command.textures).map(([key, texture]) => [key, decode(texture)])) }
      : command.kind === 'text' ? { ...command, pages: new Map([[0, decode(command.fontPixels)]]) } : { ...command, texture: decode(command.texture) });
    const result = renderGuiLayer({ width: 2570, height: 1402, ...value, commands });
    try { return { width: result.width, height: result.height, rgba: encode(result.data) }; } finally { result.dispose(); }
  },
};
window.grindstoneSourceQA = qa;
function Fallback() { const [state, setState] = useState(0); qa.incrementFallback = () => setState(value => value + 1); return <span className="qa-fallback" data-fallback-state={state}>ICON {state}</span>; }
function tilePixels(): PixelTexture { return { width: 2, height: 3, data: new Uint8ClampedArray([40,80,120,128, 180,30,90,255, 20,200,60,255, 230,170,30,128, 75,45,220,255, 190,210,40,255]) }; }
function model(settings: GrindConfiguration, faulty = false): GuiModelItem {
  const atlas = settings.source === 'atlas', uv: GuiModelMesh['faces'][number]['uv'] = atlas ? [[3, 5], [5, 5], [5, 2], [3, 2]] : [[0, 3], [2, 3], [2, 0], [0, 0]];
  const mesh: GuiModelMesh = { faces: [{ texture: 'all', vertices: [[0, 0, 0], [16, 0, 0], [16, 16, 0], [0, 16, 0]], uv, color: [255, 255, 255, 255] }] };
  let texture: GuiLayerTextureSource = settings.source === 'pixels' ? tilePixels() : faulty ? settings.tileUrl : '/qa-grind-tile.png';
  if (atlas) texture = { kind: 'atlas', width: 8, height: 8, tiles: [{ origin: [3, 2], size: faulty && settings.failure === 'atlas-size' ? [3, 3] : [2, 3], texture: faulty ? settings.tileUrl : '/qa-grind-tile.png' }] };
  return { model: mesh, projection: faulty && settings.failure === 'projection' ? null : { yaw: 0, pitch: 0, scale: 1, offset: [0, 16], originQuantization: 'physical-floor' },
    textureSizes: { all: atlas ? [8, 8] : [2, 3] }, textures: { all: texture } } as GuiModelItem;
}
function font(): GuiTextFont { return { pages: ['/qa-grind-font.png'], pageSizes: [128], cellHeight: 12, lineHeight: 12, glyphs: { '1': { page: 0, x: 0, y: 0, width: 8, height: 12, advance: 6, offsetY: -3 } } }; }
function App() {
  const [settings, setSettings] = useState<GrindConfiguration>({ mode: 'css', content: 'sprites', itemImages: false, itemModels: false, invalid: false, result: 'full', guiScale: 5, displayScale: 1, source: 'pixels', tileUrl: '/qa-grind-tile.png', failure: 'none' });
  const [shown, setShown] = useState(true), [events, setEvents] = useState<string[]>([]);
  qa.configure = value => setSettings(previous => ({ ...previous, ...value })); qa.reopen = () => setShown(true);
  const emit = (value: string) => { qa.events.push(value); setEvents(previous => [...previous, value]); };
  const all: (InventoryItem | null)[] = Array.from({ length: 39 }, (_, index) => ({ name: `Grind item ${index}`, image: '/qa-grind-sprite.png', count: 1,
    ...(settings.content === 'models' || settings.content === 'mixed' && [1, 2, 3, 7].includes(index) ? { guiModel: model(settings, index === 3) } : {}) }));
  all[0] = { ...all[0]!, count: 5, durability: .5 };
  all[3] = { ...all[3]!, image: undefined, icon: <Fallback/>, count: 8, durability: .5 };
  if (settings.content === 'sprites') all[3] = { ...all[3], image: '/qa-grind-sprite.png', icon: undefined };
  if (settings.content === 'mixed') {
    all[1] = { ...all[1]!, image: undefined }; all[5] = { name: 'Custom node', icon: <span data-custom-node className="qa-custom"/> };
    all[6] = { ...all[6]!, count: 0 }; all[7] = { ...all[7]!, count: NaN };
  }
  if (settings.result !== 'full') all[2] = settings.result === 'null' ? null : { ...all[2]!, count: settings.result === 'zero' ? 0 : NaN };
  const style = { font: font(), fontScale: 1, sampling: 'point' as const, shader: 'bitmap' as const };
  const profile: GrindstoneImageRenderProfile | undefined = settings.mode === 'css' ? undefined : { frame: { width: 2570, height: 1402, guiScale: settings.guiScale }, displayScale: settings.displayScale,
    itemImages: settings.itemImages, itemModels: settings.itemModels,
    ...(settings.mode === 'combined' ? { text: { metrics: { lineHeight: settings.failure === 'metrics' ? 0 : 10, paintOffset: [0, 1] }, labels: style } } : {}) };
  return <main data-configuration={JSON.stringify(settings)}><button onClick={() => setShown(true)}>Reopen grindstone</button><div id="host">{shown && <Grindstone title="1" inventoryLabel="1" ref={node => { qa.section = node; }}
    imageRender={profile} inputs={[all[0] ?? null, all[1] ?? null]} result={all[2]} inventory={all.slice(3, 30)} hotbar={all.slice(30)} invalid={settings.invalid}
    renderText={(text, context) => <b data-custom-text={context.kind}>{text}</b>}
    onInputAction={(index, action) => emit(`input:${index}:${action}`)} onInventoryAction={(index, action) => emit(`inventory:${index}:${action}`)} onTakeResult={action => emit(`take:${action}`)} onClose={() => { emit('close'); setShown(false); }}/>}</div>
    <div id="tail"/><output aria-label="Grindstone integration events">{events.join('|')}</output></main>;
}
createRoot(document.getElementById('grindstone-integration-root')!).render(<App/>);
