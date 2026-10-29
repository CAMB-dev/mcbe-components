import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import type { CanvasHTMLAttributes } from 'react';
import type { PixelTexture } from './item-renderer-engine';
import type { GuiImage, GuiImageLayerState } from './gui-image';
import type { GuiImageBackground } from './gui-image-webgl';
import { layoutSourceGuiLayer, renderGuiLayer } from './gui-layer';
import type { GuiLayerDraw, GuiLayerGeometryCommand, GuiLayerLayout, GuiLayerLayoutOptions } from './gui-layer';
import type { GuiTextGeometry } from './gui-text-geometry';

type Source = string | PixelTexture;
export type GuiLayerCommand =
  | ({ kind: 'image' } & GuiImage)
  | ({ kind: 'text'; pages?: ReadonlyMap<number, Source> } & GuiTextGeometry);
export interface GuiLayerProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, 'children' | 'width' | 'height' | 'onError'>, Omit<GuiLayerLayoutOptions, 'commands'> {
  commands: readonly GuiLayerCommand[];
  background?: GuiImageBackground;
  label?: string;
  /** Changing this value explicitly retries failed/lost requests with a fresh canvas. */
  renderKey?: string | number;
  onReady?: () => void;
  onRenderError?: (error: Error) => void;
  onRenderStateChange?: (state: GuiImageLayerState) => void;
}

interface SourceUse { source: Source; size?: readonly [number, number]; upload: boolean }
type Binding = { kind: 'image'; source: number } | { kind: 'text'; pages: readonly (readonly [number, number])[] };
interface Request {
  key: number;
  descriptor: string;
  uses: readonly SourceUse[];
  commands: readonly GuiLayerCommand[];
  background?: GuiImageBackground;
  layout?: GuiLayerLayout;
  frame?: Omit<GuiLayerLayoutOptions, 'commands'>;
  /** Unique used URL resources, with a declared square font size where applicable. */
  urls: ReadonlyMap<string, number | undefined>;
  knownPixels: number;
  error?: Error;
}
function validatePixels(value: PixelTexture): void {
  if (!value || !Number.isSafeInteger(value.width) || !Number.isSafeInteger(value.height) || value.width < 1 || value.height < 1 || value.width > 8192 || value.height > 8192
    || value.width * value.height > 16777216 || !value.data || !['[object Uint8Array]', '[object Uint8ClampedArray]'].includes(Object.prototype.toString.call(value.data))
    || value.data.length !== value.width * value.height * 4) throw new RangeError('GUI layer pixels require bounded complete RGBA8 data.');
}
function sameSource(a: Source | undefined, b: Source): boolean {
  if (typeof a === 'string' || typeof b === 'string') return a === b;
  return !!a && !!b && a.width === b.width && a.height === b.height && !!b.data && ['[object Uint8Array]', '[object Uint8ClampedArray]'].includes(Object.prototype.toString.call(b.data))
    && a.data.length === b.data.length && a.data.every((byte, index) => byte === b.data[index]);
}
function validateBackground(background: GuiImageBackground | undefined, width: number, height: number): void {
  if (background?.kind === 'texture') {
    validatePixels(background.texture);
    if (background.texture.width !== width || background.texture.height !== height) throw new RangeError('GUI background dimensions must match the whole framebuffer.');
    if (background.encoding !== 'framebuffer' && background.encoding !== 'straight-alpha') throw new RangeError('Explicit GUI background encoding is required.');
  } else if (background?.kind === 'solid') {
    if (!background.color || background.color.length !== 4 || background.color.some(value => !Number.isFinite(value) || value < 0 || value > 1)) throw new RangeError('GUI background color requires four normalized components.');
  } else if (background !== undefined && background.kind !== 'transparent') throw new RangeError('Unsupported GUI background.');
}
function budget(uses: readonly SourceUse[]): { urls: Map<string, number | undefined>; knownPixels: number } {
  const urls = new Map<string, number | undefined>(), textures = new Set<PixelTexture>(); let knownPixels = 0;
  for (const { source, size, upload } of uses) {
    if (typeof source === 'string') {
      if (!source.trim()) throw new RangeError('A used GUI texture URL must not be empty.');
      const declared = urls.get(source);
      if (size && declared !== undefined && declared !== size[0]) throw new RangeError('One URL cannot represent incompatible declared font page sizes.');
      urls.set(source, size?.[0] ?? declared);
    } else {
      validatePixels(source);
      if (size && (source.width !== size[0] || source.height !== size[1])) throw new RangeError('Font page pixels must match their declared original size.');
      if (upload && !textures.has(source)) { textures.add(source); knownPixels += source.width * source.height; }
    }
  }
  if (urls.size + textures.size > 256 || knownPixels + [...urls.values()].reduce<number>((total, size) => total + (size === undefined ? 0 : size * size), 0) > 33554432) {
    throw new RangeError('Combined GUI image/font resources exceed the upload budget.');
  }
  return { urls, knownPixels };
}

function prepare(previous: Request | undefined, options: GuiLayerProps): Request {
  const key = (previous?.key ?? 0) + 1;
  try {
    const layout = layoutSourceGuiLayer(options);
    if (options.renderKey !== undefined && typeof options.renderKey !== 'string' && (typeof options.renderKey !== 'number' || !Number.isFinite(options.renderKey))) throw new RangeError('renderKey must be a string or finite number.');
    validateBackground(options.background, options.width, options.height);
    const uses: SourceUse[] = [], bindings: Binding[] = [], shapes: GuiLayerGeometryCommand[] = [];
    for (let index = 0; index < options.commands.length; index++) {
      const command = options.commands[index]!;
      if (command.kind === 'image') {
        const { rect, uvRect, nineSlice, tint, hudOpacity, scissor } = command;
        shapes.push({ kind: 'image', rect, uvRect, nineSlice, tint, hudOpacity, scissor });
        bindings.push({ kind: 'image', source: uses.length }); uses.push({ source: command.texture, upload: true });
      } else {
        const { text, font, origin, fontScale, sampling, shader, color, tint, hudOpacity, shadow, scissor } = command;
        const glyphs: typeof font.glyphs = Object.fromEntries([...new Set([...text.replace(/\r\n?/g, '\n')].filter(character => character !== '\n'))].map(character => {
          const g = font.glyphs[character]!;
          return [character, { page: g.page, x: g.x, y: g.y, width: g.width, height: g.height, advance: g.advance, offsetX: g.offsetX, offsetY: g.offsetY }];
        }));
        shapes.push({ kind: 'text', text, font: { pages: [...font.pages], pageSizes: [...font.pageSizes], cellHeight: font.cellHeight, lineHeight: font.lineHeight, glyphs }, origin, fontScale, sampling, shader, color, tint, hudOpacity, shadow, scissor });
        const entry = layout.commands[index]!;
        if (entry.kind !== 'text') throw new Error('GUI source layout order mismatch.');
        if (command.pages) {
          if (typeof command.pages.get !== 'function' || typeof command.pages.has !== 'function' || typeof command.pages.entries !== 'function'
            || !Number.isSafeInteger(command.pages.size) || command.pages.size > 256) throw new RangeError('Font page overrides require a bounded ReadonlyMap.');
          let count = 0;
          for (const [page] of command.pages) {
            if (++count > 256 || !Number.isSafeInteger(page) || page < 0 || page >= font.pages.length) throw new RangeError('Font page override index is outside the declared font.');
          }
        }
        const pages: [number, number][] = [];
        for (const page of new Set(entry.layout.runs.map(run => run.page))) {
          const source = command.pages?.has(page) ? command.pages.get(page)! : font.pages[page]!;
          pages.push([page, uses.length]); uses.push({ source, size: [font.pageSizes[page]!, font.pageSizes[page]!], upload: true });
        }
        bindings.push({ kind: 'text', pages });
      }
    }
    const background = options.background;
    if (background?.kind === 'texture') uses.push({ source: background.texture, size: [options.width, options.height], upload: false });
    const descriptor = JSON.stringify({ width: options.width, height: options.height, guiScale: options.guiScale, shapes, bindings, outputRect: options.outputRect, scissor: options.scissor,
      background: background?.kind === 'texture' ? { kind: 'texture', encoding: background.encoding } : background, renderKey: options.renderKey });
    if (previous?.descriptor === descriptor && uses.length === previous.uses.length && uses.every((use, index) => sameSource(previous.uses[index]?.source, use.source))) return previous;
    const resources = budget(uses), copied = new Map<PixelTexture, PixelTexture>();
    const snapshots = uses.map((use): SourceUse => {
      if (typeof use.source === 'string') return { ...use };
      let pixels = copied.get(use.source);
      if (!pixels) { pixels = { width: use.source.width, height: use.source.height, data: new Uint8ClampedArray(use.source.data) }; copied.set(use.source, pixels); }
      return { ...use, source: pixels };
    });
    const frozenShapes = JSON.parse(JSON.stringify(shapes)) as GuiLayerGeometryCommand[];
    const commands: GuiLayerCommand[] = frozenShapes.map((shape, index) => {
      const binding = bindings[index]!;
      if (shape.kind === 'image' && binding.kind === 'image') return { ...shape, texture: snapshots[binding.source]!.source };
      if (shape.kind === 'text' && binding.kind === 'text') return { ...shape, pages: new Map(binding.pages.map(([page, source]) => [page, snapshots[source]!.source])) };
      throw new Error('GUI snapshot order mismatch.');
    });
    const clear = background?.kind === 'texture' ? { ...background, texture: snapshots[snapshots.length - 1]!.source as PixelTexture }
      : background?.kind === 'solid' ? { ...background, color: [...background.color] as typeof background.color } : background;
    const frame = { width: options.width, height: options.height, guiScale: options.guiScale,
      scissor: options.scissor && [...options.scissor] as typeof options.scissor, outputRect: [...layout.outputRect] as typeof layout.outputRect };
    return { key, descriptor, uses: snapshots, commands, background: clear, layout: { ...layout, outputRect: frame.outputRect }, frame, ...resources };
  } catch (reason) {
    const error = reason instanceof Error ? reason : new Error(String(reason)), descriptor = `error:${error.message}:${String(options.renderKey)}`;
    return previous?.descriptor === descriptor ? previous : { key, descriptor, uses: [], commands: [], urls: new Map(), knownPixels: 0, error };
  }
}

/** A single ordered image/text framebuffer; original semantic DOM belongs to the host. */
export const GuiLayer = forwardRef<HTMLCanvasElement, GuiLayerProps>(function GuiLayer({ width, height, guiScale, commands, scissor, outputRect, background, label, renderKey,
  onReady, onRenderError, onRenderStateChange, className, style, ...props }, forwardedRef) {
  const previous = useRef<Request | undefined>(undefined);
  const request = prepare(previous.current, { width, height, guiScale, commands, scissor, outputRect, background, renderKey }); previous.current = request;
  const canvas = useRef<HTMLCanvasElement | null>(null), callbacks = useRef({ onReady, onRenderError, onRenderStateChange }); callbacks.current = { onReady, onRenderError, onRenderStateChange };
  const setCanvas = useCallback((node: HTMLCanvasElement | null) => {
    canvas.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node); else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);
  const [state, setState] = useState<{ key: number; status: GuiImageLayerState }>({ key: 0, status: 'loading' });
  const status = state.key === request.key ? state.status : 'loading', notified = useRef<{ key: number; status: GuiImageLayerState } | undefined>(undefined);
  useEffect(() => {
    const target = canvas.current, abort = new AbortController(), bitmaps = new Set<ImageBitmap>();
    let cancelled = false, failed = false, dispose: (() => void) | undefined;
    const closeBitmaps = () => { bitmaps.forEach(bitmap => bitmap.close()); bitmaps.clear(); };
    if (target) { target.width = 0; target.height = 0; }
    setState({ key: request.key, status: 'loading' });
    const fail = (reason: unknown) => {
      if (cancelled || failed) return; failed = true; abort.abort(); closeBitmaps();
      if (target) { target.width = 0; target.height = 0; }
      setState({ key: request.key, status: 'error' }); callbacks.current.onRenderError?.(reason instanceof Error ? reason : new Error(String(reason)));
    };
    const lost = (event: Event) => { event.preventDefault(); fail(new Error('The GUI layer WebGL context was lost. Change renderKey or inputs to retry.')); };
    target?.addEventListener('webglcontextlost', lost);
    void (async () => {
      if (request.error) throw request.error;
      // Let immediate StrictMode cleanup cancel the first setup before starting IO.
      await Promise.resolve(); if (cancelled || failed) return;
      const urls = [...request.urls], decoded = new Map<string, ImageBitmap>(); let next = 0, pixels = request.knownPixels, encodedBytes = 0;
      const worker = async () => {
        while (!cancelled && !failed && next < urls.length) {
          const [url, size] = urls[next++]!;
          if (typeof createImageBitmap !== 'function') throw new Error('Straight-alpha ImageBitmap decoding is unavailable. Supply explicit RGBA8 pixels.');
          const response = await fetch(url, { signal: abort.signal }); if (!response.ok) throw new Error(`GUI layer HTTP ${response.status}: ${url}`);
          const blob = await response.blob(); encodedBytes += blob.size;
          if (blob.size > 67108864 || encodedBytes > 134217728) throw new RangeError('GUI texture responses exceed the encoded byte budget.');
          const bitmap = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none', imageOrientation: 'none' });
          if (cancelled || failed) { bitmap.close(); return; }
          try {
            if (!bitmap.width || !bitmap.height || bitmap.width > 8192 || bitmap.height > 8192 || bitmap.width * bitmap.height > 16777216) throw new RangeError('Decoded GUI texture exceeds its pixel budget.');
            if (size !== undefined && (bitmap.width !== size || bitmap.height !== size)) throw new RangeError('Decoded font page dimensions must match the declared original size.');
            pixels += bitmap.width * bitmap.height;
            if (pixels > 33554432) throw new RangeError('Combined decoded GUI image/font resources exceed the upload budget.');
          } catch (reason) { bitmap.close(); throw reason; }
          bitmaps.add(bitmap); decoded.set(url, bitmap);
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, urls.length) }, worker));
      if (cancelled || failed || !target) return;
      const source = (value: Source) => {
        if (typeof value !== 'string') return value;
        const bitmap = decoded.get(value); if (!bitmap) throw new Error('A used GUI texture was not decoded.'); return bitmap;
      };
      const resolved: GuiLayerDraw[] = request.commands.map(command => command.kind === 'image' ? { ...command, texture: source(command.texture) }
        : { ...command, pages: new Map([...command.pages!].map(([page, value]) => [page, source(value)])) });
      const result = renderGuiLayer({ ...request.frame!, commands: resolved, background: request.background, canvas: target }); dispose = result.dispose;
      closeBitmaps(); if (failed) return;
      setState({ key: request.key, status: 'ready' });
    })().catch(fail);
    return () => {
      cancelled = true; abort.abort(); closeBitmaps(); target?.removeEventListener('webglcontextlost', lost);
      // Immediate StrictMode reuse must retain its node; retired canvases release their context.
      queueMicrotask(() => { if (canvas.current !== target) dispose?.(); });
    };
  }, [request.key]);
  useEffect(() => {
    if (notified.current?.key === request.key && notified.current.status === status) return;
    notified.current = { key: request.key, status }; callbacks.current.onRenderStateChange?.(status);
    if (status === 'ready') callbacks.current.onReady?.();
  }, [status, request.key]);
  const accessibleLabel = props['aria-label'] ?? label, named = !!(accessibleLabel?.trim() || props['aria-labelledby']?.trim());
  return <canvas {...props} key={request.key} ref={setCanvas} width={0} height={0} className={['mc-gui-layer', className].filter(Boolean).join(' ')}
    role={props.role ?? (named ? 'img' : undefined)} aria-label={accessibleLabel} aria-hidden={props['aria-hidden'] ?? (named ? undefined : true)}
    data-render-state={status} data-fidelity="source-gui-layer-profile" data-framebuffer-width={width} data-framebuffer-height={height}
    style={{ display: 'block', width: request.layout?.outputRect[2] ?? 0, height: request.layout?.outputRect[3] ?? 0, imageRendering: 'pixelated', ...style }}/>
});
