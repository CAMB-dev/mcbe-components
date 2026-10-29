import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GuiLayer, renderGuiLayer } from '../src';
import type { GuiLayerProps, GuiLayerRenderOptions } from '../src';

// Public declaration transport only. Golden RGBA is supplied by the independent
// spec. This bridge does not call a TGA recognizer, decoder or geometry helper.
function bytes(value: string | number[]) { return typeof value === 'string' ? Uint8ClampedArray.from(atob(value), c => c.charCodeAt(0)) : new Uint8ClampedArray(value); }
function source(value: any): any { if (typeof value === 'string') return value; if (value.kind === 'atlas') return { ...value, tiles: value.tiles.map((tile: any) => ({ ...tile, texture: source(tile.texture) })) }; return { width: value.width, height: value.height, data: bytes(value.rgba) }; }
function decode(options: any): any { return { ...options, commands: options.commands.map((command: any) => command.kind === 'image' || command.kind === 'sprite' ? { ...command, texture: source(command.texture) } : command.kind === 'model' ? { ...command, textures: Object.fromEntries(Object.entries(command.textures).map(([key, value]) => [key, source(value)])) } : { ...command, ...(command.pages ? { pages: new Map(command.pages.map(([page, value]: any) => [page, source(value)])) } : {}) }), ...(options.background?.kind === 'texture' ? { background: { ...options.background, texture: source(options.background.texture) } } : {}) }; }
function encode(data: Uint8Array | Uint8ClampedArray) { let value = ''; for (let i = 0; i < data.length; i += 32768) value += String.fromCharCode(...data.subarray(i, i + 32768)); return btoa(value); }
function raw(canvas: HTMLCanvasElement) { const gl = canvas.getContext('webgl')!, debug = gl.getExtension('WEBGL_debug_renderer_info'), bottom = new Uint8Array(canvas.width * canvas.height * 4), top = new Uint8Array(bottom.length); gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, bottom); for (let y = 0; y < canvas.height; y++) top.set(bottom.subarray((canvas.height - y - 1) * canvas.width * 4, (canvas.height - y) * canvas.width * 4), y * canvas.width * 4); return { width: canvas.width, height: canvas.height, rgba: encode(top), renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null, error: gl.getError() }; }
interface TgaQA {
  events: { kind: string; tag: string; value?: string }[]; ref: HTMLCanvasElement | null; options: any; tag: string; strict: boolean; generation: number;
  mount: (options: any, strict?: boolean, tag?: string) => number; unmount: () => void;
  render: (options: any) => ReturnType<typeof raw>; raw: () => ReturnType<typeof raw>;
}
declare global { interface Window { guiLayerTgaQA: TgaQA; tgaCalls: any } }
const root = createRoot(document.getElementById('root')!);
function Host({ options, tag, generation }: { options: any; tag: string; generation: number }) { const [count, setCount] = useState(0); return <section className="qa-stage" data-generation={generation} style={{ width: options?.width ?? 160, height: options?.height ?? 96 }}>
  <div className="qa-fallback"><input aria-label="TGA fallback editor" defaultValue="DOM fallback"/><button onClick={() => setCount(v => v + 1)}>Fallback action {count}</button></div>
  {options && <GuiLayer {...options as GuiLayerProps} ref={node => { qa.ref = node; }} onReady={() => qa.events.push({ kind: 'ready', tag })} onRenderError={error => qa.events.push({ kind: 'error', tag, value: error.message })} onRenderStateChange={state => qa.events.push({ kind: 'state', tag, value: state })}/>}
</section>; }
const qa: TgaQA = window.guiLayerTgaQA = { events: [], ref: null, options: null, tag: '', strict: false, generation: 0,
  mount(options, strict = false, tag = 'request') { qa.options = decode(options); qa.tag = tag; qa.strict = strict; const generation = ++qa.generation, element = <Host options={qa.options} tag={tag} generation={generation}/>; root.render(strict ? <StrictMode>{element}</StrictMode> : element); return generation; },
  unmount() { const generation = ++qa.generation; root.render(qa.strict ? <StrictMode><Host options={null} tag="unmounted" generation={generation}/></StrictMode> : <Host options={null} tag="unmounted" generation={generation}/>); },
  render(options) { const canvas = document.createElement('canvas'), result = renderGuiLayer({ ...decode(options), canvas } as GuiLayerRenderOptions); try { return raw(canvas); } finally { result.dispose(); } },
  raw() { return raw(document.querySelector('canvas.mc-gui-layer')!); },
};
root.render(<Host options={null} tag="initial" generation={0}/>);
