import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { GuiLayer, renderGuiLayer } from '../src';
import type { GuiLayerCommand, GuiLayerProps, GuiLayerRenderOptions } from '../src';

// Transport only public declarations. The spec owns its synthetic source and
// independent mathematical expectations; this bridge has no native data/compiler.
export interface EntityFixtureOptions {
  width: number; height: number; guiScale: number;
  commands: any[]; outputRect?: readonly [number, number, number, number];
  scissor?: readonly [number, number, number, number]; renderKey?: string | number;
  label?: string; background?: any;
}
function pixels(value: any): any {
  if (typeof value === 'string' || value?.kind === 'atlas') return value;
  const data = typeof value.rgba === 'string' ? Uint8ClampedArray.from(atob(value.rgba), c => c.charCodeAt(0)) : new Uint8ClampedArray(value.rgba);
  return { width: value.width, height: value.height, data };
}
function decode(options: EntityFixtureOptions): GuiLayerProps {
  return { ...options, commands: options.commands.map((c): GuiLayerCommand => {
    if (c.kind === 'entity') return { ...c, texture: pixels(c.texture),
      bonePose: Object.fromEntries(Object.entries(c.bonePose).map(([name, matrix]) => [name, new Float32Array(matrix as number[])])),
      model: new Float32Array(c.model), view: new Float32Array(c.view), projection: new Float32Array(c.projection) };
    if (c.kind === 'text') return { ...c, pages: c.pages && new Map(c.pages.map(([id, page]: [number, any]) => [id, pixels(page)])) };
    return { ...c, texture: pixels(c.texture) };
  }) };
}
function encode(data: Uint8Array | Uint8ClampedArray) {
  let result = ''; for (let i = 0; i < data.length; i += 32768) result += String.fromCharCode(...data.subarray(i, i + 32768));
  return btoa(result);
}
function raw(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl'); if (!gl) throw Error('Fixture has no actual WebGL canvas.');
  const bottom = new Uint8Array(canvas.width * canvas.height * 4), top = new Uint8Array(bottom.length);
  gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, bottom);
  for (let y = 0; y < canvas.height; y++) top.set(bottom.subarray((canvas.height - y - 1) * canvas.width * 4, (canvas.height - y) * canvas.width * 4), y * canvas.width * 4);
  const extension = gl.getExtension('WEBGL_debug_renderer_info');
  return { width: canvas.width, height: canvas.height, rgba: encode(top), error: gl.getError(),
    renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null };
}
const root = createRoot(document.getElementById('root')!);
declare global { interface Window { guiEntityQA: any } }
const qa: any = window.guiEntityQA = {
  events: [], states: [], refs: [], serial: 0, props: undefined, strict: false,
  counters: { fetches: [] as string[], aborted: [] as string[], bitmaps: 0, closedBitmaps: 0, closedBitmapIds: [] as number[], depths: [] as { format: number; depth: number; stencil: number }[] },
  captureRequests: false, requestReads: [] as { width: number; height: number; rgba: string; framebufferBound: boolean }[],
  render(options: EntityFixtureOptions) {
    const canvas = document.createElement('canvas');
    const result = renderGuiLayer({ ...decode(options), canvas } as GuiLayerRenderOptions);
    try { const live = raw(canvas); return { ...live, rgba: encode(result.data), liveRgba: live.rgba, alphaMode: result.alphaMode }; }
    finally { result.dispose(); canvas.width = 0; canvas.height = 0; }
  },
  mount(options: EntityFixtureOptions, strict = false) { qa.props = decode(options); qa.strict = strict; qa.paint(); },
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
  retry(renderKey: number) { qa.props = { ...qa.props, renderKey }; qa.paint(); },
  unmount() { root.render(null); },
  raw() { if (!qa.ref) throw Error('No mounted entity canvas.'); return raw(qa.ref); },
  lose() { const gl = qa.ref?.getContext('webgl'), ext = gl?.getExtension('WEBGL_lose_context'); if (!ext) throw Error('Actual context loss extension unavailable.'); ext.loseContext(); },
  holdBitmap: false, pendingBitmaps: [] as (() => void)[],
  releaseBitmaps() { qa.holdBitmap = false; qa.pendingBitmaps.splice(0).forEach((release: () => void) => release()); },
};

// Observe actual allocations and bitmap ownership. No fake context/bitmap is
// supplied. A test may pause a real completed decode to exercise cancellation.
const nativeFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input); qa.counters.fetches.push(url);
  init?.signal?.addEventListener('abort', () => qa.counters.aborted.push(url), { once: true });
  return nativeFetch(input, init);
}) as typeof fetch;
const nativeBitmap = window.createImageBitmap.bind(window), ownedBitmaps = new WeakMap<ImageBitmap, number>();
window.createImageBitmap = (async (...args: any[]) => {
  const bitmap = await (nativeBitmap as any)(...args); ownedBitmaps.set(bitmap, qa.counters.bitmaps++);
  if (qa.holdBitmap) await new Promise<void>(resolve => qa.pendingBitmaps.push(resolve));
  return bitmap;
}) as typeof createImageBitmap;
const nativeClose = ImageBitmap.prototype.close;
ImageBitmap.prototype.close = function () { const id = ownedBitmaps.get(this); if (id !== undefined) { qa.counters.closedBitmaps++; qa.counters.closedBitmapIds.push(id); } nativeClose.call(this); };
const nativeRead = WebGLRenderingContext.prototype.readPixels;
WebGLRenderingContext.prototype.readPixels = function (this: WebGLRenderingContext, ...args: any[]) {
  (nativeRead as any).apply(this, args);
  // Observe the renderer's existing complete read, never issue an extra read or
  // replace its output. Default framebuffer/presentation probes are excluded.
  if (qa.captureRequests && args[0] === 0 && args[1] === 0 && args[2] === 64 && args[3] === 64
    && args[6] instanceof Uint8Array && args[6].length === 64 * 64 * 4 && this.getParameter(this.FRAMEBUFFER_BINDING)) {
    const bottom = args[6] as Uint8Array, top = new Uint8Array(bottom.length);
    for (let y = 0; y < 64; y++) top.set(bottom.subarray((63 - y) * 256, (64 - y) * 256), y * 256);
    qa.requestReads.push({ width: 64, height: 64, rgba: encode(top), framebufferBound: true });
  }
} as typeof nativeRead;
const nativeStorage = WebGLRenderingContext.prototype.renderbufferStorage;
WebGLRenderingContext.prototype.renderbufferStorage = function (target, format, width, height) {
  nativeStorage.call(this, target, format, width, height);
  if (format === this.DEPTH_STENCIL) qa.counters.depths.push({ format,
    depth: this.getRenderbufferParameter(target, this.RENDERBUFFER_DEPTH_SIZE), stencil: this.getRenderbufferParameter(target, this.RENDERBUFFER_STENCIL_SIZE) });
};
