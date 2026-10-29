import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { GuiLayer, renderGuiLayer, layoutGuiText } from '../src';
import type { GuiLayerProps, GuiLayerRenderOptions } from '../src';

// Only transports caller source declarations. Expected pixels/geometry are
// computed independently in the spec; no captured vertices enter this bridge.
function bytes(value: string | number[]) { return typeof value === 'string' ? Uint8ClampedArray.from(atob(value), c => c.charCodeAt(0)) : new Uint8ClampedArray(value); }
function texture(value: any): any { return typeof value === 'string' ? value : { width: value.width, height: value.height, data: bytes(value.rgba) }; }
function decode(options: any): any {
  return { ...options, commands: options.commands.map((c: any) => c.kind === 'image' ? { ...c, texture: texture(c.texture) }
    : { ...c, ...(c.pages ? { pages: new Map(c.pages.map(([index, image]: any) => [index, texture(image)])) } : {}) }),
    ...(options.background?.kind === 'texture' ? { background: { ...options.background, texture: texture(options.background.texture) } } : {}) };
}
function encode(data: Uint8Array | Uint8ClampedArray) { let result = ''; for (let i = 0; i < data.length; i += 32768) result += String.fromCharCode(...data.subarray(i, i + 32768)); return btoa(result); }
function raw(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl')!, extension = gl.getExtension('WEBGL_debug_renderer_info');
  const bottom = new Uint8Array(canvas.width * canvas.height * 4), top = new Uint8Array(bottom.length);
  gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, bottom);
  for (let y = 0; y < canvas.height; y++) top.set(bottom.subarray((canvas.height - y - 1) * canvas.width * 4, (canvas.height - y) * canvas.width * 4), y * canvas.width * 4);
  return { width: canvas.width, height: canvas.height, rgba: encode(top), renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null, error: gl.getError(), attributes: gl.getContextAttributes() };
}
const root = createRoot(document.getElementById('root')!);
declare global { interface Window { guiLayerQA: any } }
const qa: any = window.guiLayerQA = {
  events: [], states: [], refs: [], props: undefined, serial: 0,
  layout: layoutGuiText,
  render(options: any) {
    const canvas = document.createElement('canvas'), result = renderGuiLayer({ ...decode(options), canvas } as GuiLayerRenderOptions);
    const view = raw(canvas), value = { ...view, rgba: encode(result.data), liveRgba: view.rgba, alphaMode: result.alphaMode,
      layout: JSON.parse(JSON.stringify(result.layout, (_key, value) => value instanceof Float32Array ? Array.from(value) : value)) };
    result.dispose(); return value;
  },
  mount(options: any, strict = false) { qa.props = decode(options); qa.strict = strict; qa.paint(); },
  paint() {
    const element = createElement(GuiLayer, { ...qa.props,
      ref: (node: HTMLCanvasElement | null) => { qa.ref = node; if (node) qa.refs.push(node); },
      onReady: () => { qa.events.push('ready'); qa.serial++; },
      onRenderError: (error: Error) => qa.events.push('error:' + error.message),
      onRenderStateChange: (state: string) => qa.states.push(state),
      onFocus: () => qa.events.push('focus'), onBlur: () => qa.events.push('blur'),
    } as GuiLayerProps);
    root.render(qa.strict ? createElement(StrictMode, {}, element) : element);
  },
  unmount() { root.render(null); },
  rawCanvas() { return raw(document.querySelector('canvas.mc-gui-layer') as HTMLCanvasElement); },
};
