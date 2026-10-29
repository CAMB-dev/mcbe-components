import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { GuiImageLayer } from '../src/gui-image';
import type { GuiImageLayerProps } from '../src/gui-image';
import { renderGuiImages } from '../src/gui-image-webgl';
import type { GuiImageRenderOptions } from '../src/gui-image-webgl';
import { layoutGuiImages } from '../src/gui-image-geometry';

// Wire representation only. All shader/geometry expectations live in the test,
// independently of these production calls. No captured VB is accepted here.
function bytes(value: string | number[]) {
  return typeof value === 'string' ? Uint8ClampedArray.from(atob(value), character => character.charCodeAt(0)) : new Uint8ClampedArray(value);
}
function wire(options: any): any {
  const texture = (value: any) => typeof value === 'string' ? value : { width: value.width, height: value.height, data: bytes(value.rgba) };
  return { ...options, images: options.images.map((image: any) => ({ ...image, texture: texture(image.texture) })),
    ...(options.background?.kind === 'texture' ? { background: { ...options.background, texture: texture(options.background.texture) } } : {}) };
}
function encode(data: Uint8Array | Uint8ClampedArray) { let text = ''; for (let i = 0; i < data.length; i += 32768) text += String.fromCharCode(...data.subarray(i, i + 32768)); return btoa(text); }
const root = createRoot(document.getElementById('root')!);
declare global { interface Window { guiImageQA: any } }
window.guiImageQA = {
  events: [] as string[],
  states: [] as string[],
  layout: layoutGuiImages,
  render(options: any) {
    const canvas = document.createElement('canvas');
    const result = renderGuiImages({ ...wire(options), canvas } as GuiImageRenderOptions);
    const gl = canvas.getContext('webgl')!, extension = gl.getExtension('WEBGL_debug_renderer_info');
    const value = { width: result.width, height: result.height, rgba: encode(result.data), alphaMode: result.alphaMode,
      renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null, attributes: gl.getContextAttributes(), error: gl.getError(),
      layout: { ...result.layout, mvp: Array.from(result.layout.mvp) } };
    result.dispose(); return value;
  },
  mount(options: any, strict = false) {
    const element = createElement(GuiImageLayer, { ...wire(options),
      ref: (node: HTMLCanvasElement | null) => { window.guiImageQA.ref = node; },
      onReady: () => window.guiImageQA.events.push('ready'),
      onRenderError: (error: Error) => window.guiImageQA.events.push('error:' + error.message),
      onRenderStateChange: (state: string) => window.guiImageQA.states.push(state),
    } as GuiImageLayerProps);
    root.render(strict ? createElement(StrictMode, {}, element) : element);
  },
  unmount() { root.render(null); },
  rawCanvas() {
    const canvas = document.querySelector('canvas.mc-gui-image-layer') as HTMLCanvasElement;
    const gl = canvas.getContext('webgl')!, data = new Uint8Array(canvas.width * canvas.height * 4), top = new Uint8Array(data.length);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
    for (let y = 0; y < canvas.height; y++) top.set(data.subarray((canvas.height - 1 - y) * canvas.width * 4, (canvas.height - y) * canvas.width * 4), y * canvas.width * 4);
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    return { width: canvas.width, height: canvas.height, rgba: encode(top), renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null, error: gl.getError(), attributes: gl.getContextAttributes() };
  },
};
