import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import type { CanvasHTMLAttributes } from 'react';
import type { PixelTexture } from './item-renderer-engine';
import { layoutGuiImages } from './gui-image-geometry';
import type { GuiImageGeometry, GuiImageLayout, GuiImageLayoutOptions } from './gui-image-geometry';
import { renderGuiImages } from './gui-image-webgl';
import type { GuiImageBackground, GuiImageDraw } from './gui-image-webgl';

export interface GuiImage extends GuiImageGeometry {
  /** URL images are decoded with explicit straight alpha/no color conversion and uploaded directly to WebGL. */
  texture: string | PixelTexture;
}
export type GuiImageLayerState = 'loading' | 'ready' | 'error';
export interface GuiImageLayerProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, 'children' | 'width' | 'height' | 'onError'>, Omit<GuiImageLayoutOptions, 'images'> {
  images: readonly GuiImage[];
  background?: GuiImageBackground;
  /** Omission is decorative. Explicit ARIA naming and visibility take precedence. */
  label?: string;
  /** Change to retry after context loss or a failed URL request; each request owns a new canvas. */
  renderKey?: string | number;
  onReady?: () => void;
  onRenderError?: (error: Error) => void;
  /** Also reports loading when source inputs change, so a host can retain existing skins until ready. */
  onRenderStateChange?: (state: GuiImageLayerState) => void;
}

type Source = GuiImage['texture'];
interface Request {
  key: number;
  descriptor: string;
  sources: readonly Source[];
  images: readonly GuiImage[];
  background?: GuiImageBackground;
  layout?: GuiImageLayout;
  error?: Error;
}
function clonePixels(value: PixelTexture): PixelTexture {
  if (!value || !Number.isSafeInteger(value.width) || !Number.isSafeInteger(value.height) || value.width < 1 || value.height < 1 || value.width > 8192 || value.height > 8192
    || value.width * value.height > 16777216 || !value.data || !['[object Uint8Array]', '[object Uint8ClampedArray]'].includes(Object.prototype.toString.call(value.data))
    || value.data.length !== value.width * value.height * 4) throw new RangeError('GUI image pixels require bounded complete RGBA8 data.');
  return { width: value.width, height: value.height, data: new Uint8ClampedArray(value.data) };
}
function sameSource(a: Source | undefined, b: Source): boolean {
  if (typeof a === 'string' || typeof b === 'string') return a === b;
  return !!a && !!b && a.width === b.width && a.height === b.height && !!b.data && ['[object Uint8Array]', '[object Uint8ClampedArray]'].includes(Object.prototype.toString.call(b.data))
    && a.data.length === b.data.length && a.data.every((byte, index) => byte === b.data[index]);
}
function requestFor(previous: Request | undefined, options: GuiImageLayerProps): Request {
  const key = (previous?.key ?? 0) + 1;
  try {
    const layout = layoutGuiImages(options);
    if (options.renderKey !== undefined && typeof options.renderKey !== 'string' && (typeof options.renderKey !== 'number' || !Number.isFinite(options.renderKey))) throw new RangeError('renderKey must be a string or finite number.');
    const shapes = options.images.map(({ rect, uvRect, nineSlice, tint, hudOpacity, scissor }) => ({ rect, uvRect, nineSlice, tint, hudOpacity, scissor }));
    const background = options.background;
    const descriptor = JSON.stringify({ width: options.width, height: options.height, guiScale: options.guiScale, shapes, scissor: options.scissor, outputRect: options.outputRect,
      background: background?.kind === 'texture' ? { kind: 'texture', encoding: background.encoding } : background, renderKey: options.renderKey });
    const sources: Source[] = options.images.map(image => image.texture);
    if (background?.kind === 'texture') sources.push(background.texture);
    // Compare actual bytes, not object identity or a collision-prone content hash.
    // Equivalent host props do not retrigger ready callbacks; changed mutable pixels do.
    if (previous?.descriptor === descriptor && sources.length === previous.sources.length && sources.every((source, index) => sameSource(previous.sources[index], source))) return previous;
    const copied = new Map<PixelTexture, PixelTexture>(); let totalPixels = 0;
    const snapshot = (source: Source): Source => {
      if (typeof source === 'string') { if (!source.trim()) throw new RangeError('GUI image URL must not be empty.'); return source; }
      const cached = copied.get(source); if (cached) return cached;
      const value = clonePixels(source); copied.set(source, value); totalPixels += value.width * value.height;
      if (copied.size > 257 || totalPixels > 50331648) throw new RangeError('GUI image snapshots exceed the pixel budget.');
      return value;
    };
    const snapshots = sources.map(snapshot), frozenShapes = JSON.parse(JSON.stringify(shapes)) as GuiImageGeometry[];
    const images = frozenShapes.map((shape, index) => ({ ...shape, texture: snapshots[index]! }));
    const clear = background?.kind === 'texture' ? { ...background, texture: snapshots[snapshots.length - 1] as PixelTexture }
      : background?.kind === 'solid' ? { ...background, color: [...background.color] as typeof background.color } : background;
    return { key, descriptor, sources: snapshots, images, background: clear, layout };
  } catch (reason) {
    const error = reason instanceof Error ? reason : new Error(String(reason)), descriptor = `error:${error.message}:${String(options.renderKey)}`;
    return previous?.descriptor === descriptor ? previous : { key, descriptor, sources: [], images: [], error };
  }
}

/** One image pass/context per layer. This does not replace ordinary responsive DOM layout. */
export const GuiImageLayer = forwardRef<HTMLCanvasElement, GuiImageLayerProps>(function GuiImageLayer({ width, height, guiScale, images, scissor, outputRect, background, renderKey, label,
  onReady, onRenderError, onRenderStateChange, className, style, ...props }, forwardedRef) {
  const prepared = useRef<Request | undefined>(undefined);
  const request = requestFor(prepared.current, { width, height, guiScale, images, scissor, outputRect, background, renderKey }); prepared.current = request;
  const canvas = useRef<HTMLCanvasElement | null>(null), callbacks = useRef({ onReady, onRenderError, onRenderStateChange }); callbacks.current = { onReady, onRenderError, onRenderStateChange };
  const setCanvas = useCallback((node: HTMLCanvasElement | null) => {
    canvas.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node); else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);
  const [state, setState] = useState<{ key: number; status: GuiImageLayerState }>({ key: 0, status: 'loading' });
  const status = state.key === request.key ? state.status : 'loading';
  const notified = useRef<{ key: number; status: GuiImageLayerState } | undefined>(undefined);
  useEffect(() => {
    const target = canvas.current, abort = new AbortController(); let cancelled = false, failed = false, dispose: (() => void) | undefined;
    const bitmaps = new Set<ImageBitmap>();
    const closeBitmaps = () => { bitmaps.forEach(bitmap => bitmap.close()); bitmaps.clear(); };
    if (target) { target.width = 0; target.height = 0; }
    setState({ key: request.key, status: 'loading' });
    const fail = (reason: unknown) => {
      if (cancelled || failed) return; failed = true; abort.abort(); closeBitmaps();
      if (target) { target.width = 0; target.height = 0; }
      setState({ key: request.key, status: 'error' }); callbacks.current.onRenderError?.(reason instanceof Error ? reason : new Error(String(reason)));
    };
    const contextLost = (event: Event) => { event.preventDefault(); fail(new Error('The GUI image WebGL context was lost. Change renderKey or inputs to retry.')); };
    target?.addEventListener('webglcontextlost', contextLost);
    void (async () => {
      if (request.error) throw request.error;
      const urls = new Map<string, Promise<ImageBitmap>>();
      const resolve = (source: Source): PixelTexture | Promise<ImageBitmap> => {
        if (typeof source !== 'string') return source;
        let task = urls.get(source);
        if (!task) {
          task = (async () => {
            if (typeof createImageBitmap !== 'function') throw new Error('Straight-alpha ImageBitmap decoding is unavailable. Supply explicit RGBA8 pixels.');
            const response = await fetch(source, { signal: abort.signal }); if (!response.ok) throw new Error(`GUI image HTTP ${response.status}: ${source}`);
            const blob = await response.blob(); if (blob.size > 67108864) throw new RangeError('GUI image response exceeds the encoded byte budget.');
            const bitmap = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none', imageOrientation: 'none' });
            if (cancelled || failed) { bitmap.close(); throw new Error('GUI image decoding was cancelled.'); }
            bitmaps.add(bitmap); return bitmap;
          })(); urls.set(source, task);
        }
        return task;
      };
      const resolved = await Promise.all(request.images.map(async image => ({ ...image, texture: await resolve(image.texture) } satisfies GuiImageDraw)));
      if (cancelled || failed || !target) return;
      const result = renderGuiImages({ width, height, guiScale, scissor, outputRect, images: resolved, background: request.background, canvas: target }); dispose = result.dispose;
      closeBitmaps(); if (failed) return;
      setState({ key: request.key, status: 'ready' });
    })().catch(fail);
    return () => {
      cancelled = true; abort.abort(); closeBitmaps(); target?.removeEventListener('webglcontextlost', contextLost);
      // StrictMode setup/cleanup/setup may reuse one live node. Only dispose an
      // old/unmounted canvas, never a node immediately reused by the next setup.
      queueMicrotask(() => { if (canvas.current !== target) dispose?.(); });
    };
    // Requests compare complete geometry/source bytes; callbacks and equivalent
    // host-created objects cannot trigger an endless ready/repaint loop.
  }, [request.key]);
  useEffect(() => {
    if (notified.current?.key === request.key && notified.current.status === status) return;
    notified.current = { key: request.key, status }; callbacks.current.onRenderStateChange?.(status);
    if (status === 'ready') callbacks.current.onReady?.();
  }, [status, request.key]);
  const accessibleLabel = props['aria-label'] ?? label, named = !!(accessibleLabel?.trim() || props['aria-labelledby']?.trim());
  return <canvas {...props} key={request.key} ref={setCanvas} width={0} height={0} className={['mc-gui-image-layer', className].filter(Boolean).join(' ')}
    role={props.role ?? (named ? 'img' : undefined)} aria-label={accessibleLabel} aria-hidden={props['aria-hidden'] ?? (named ? undefined : true)}
    data-render-state={status} data-fidelity="source-image-profile" data-framebuffer-width={width} data-framebuffer-height={height}
    style={{ display: 'block', width: request.layout?.outputRect[2] ?? 0, height: request.layout?.outputRect[3] ?? 0, imageRendering: 'pixelated', ...style }}/>
});
