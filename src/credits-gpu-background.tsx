import { useEffect, useRef, useState } from 'react';
import { useClassicLayoutEffect } from './classic-screen-lifecycle';
import { layoutGuiImages } from './gui-image-geometry';
import { presentGuiLayer } from './gui-layer';
import type { GuiLayerRenderOptions } from './gui-layer';
import type { GuiImageTexture } from './gui-image-webgl';
import { inspectGuiLayerTga } from './gui-layer-tga';
import { decodeTga } from './item-renderer-engine';
import type { CreditsSurfaceProfile } from './credits-screen-types';

type Background = CreditsSurfaceProfile['background'];
interface Props {
  width: number;
  height: number;
  scale: number;
  background: Background & { rendering: NonNullable<Background['rendering']> };
  offset: readonly [number, number];
  onRenderError?: (error: Error) => void;
}
interface Owner { draw(): void; retire(): void }

/** Pure declaration preflight, including inactive screens. No browser or asset IO. */
export function validateCreditsGpuBackground(width: number, height: number, scale: number, background: Background): void {
  if (!background.rendering) return;
  const [naturalWidth, naturalHeight] = background.image.naturalSize;
  if (!background.image.src.trim() || !Number.isSafeInteger(width) || !Number.isSafeInteger(height)
    || !Number.isSafeInteger(naturalWidth) || !Number.isSafeInteger(naturalHeight) || naturalWidth < 1 || naturalHeight < 1
    || naturalWidth > 8192 || naturalHeight > 8192 || naturalWidth * naturalHeight > 16777216)
    throw new RangeError('Credits GPU background requires an integer physical frame and bounded declared image dimensions.');
  // Endpoint geometry is checked before IO; the clock's offsets are convex combinations.
  for (const offset of [background.from, background.to]) layoutGuiImages({ width, height, guiScale: scale,
    images: [{ rect: [offset[0], offset[1], ...background.logicalSize], physicalPrecision: 'float32',
      tiling: { size: background.tileSize, originRounding: background.rendering.originRounding } }] });
}

function frame(props: Props, texture: GuiImageTexture): GuiLayerRenderOptions {
  const bg = props.background;
  return { width: props.width, height: props.height, guiScale: props.scale, rasterOrigin: bg.rendering.rasterOrigin,
    commands: [{ kind: 'image', rect: [props.offset[0], props.offset[1], bg.logicalSize[0], bg.logicalSize[1]],
      physicalPrecision: 'float32', tiling: { size: bg.tileSize, originRounding: bg.rendering.originRounding }, texture }] };
}

/** Private per-asset owner. The parent remounts it on asset replacement or reactivation. */
export function CreditsGpuBackground(props: Props) {
  const { width, height, background } = props, [naturalWidth, naturalHeight] = background.image.naturalSize;
  const canvas = useRef<HTMLCanvasElement | null>(null), owner = useRef<Owner | null>(null), current = useRef(props);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  useClassicLayoutEffect(() => { current.current = props; owner.current?.draw(); });
  useClassicLayoutEffect(() => () => { owner.current?.retire(); }, []);
  useEffect(() => {
    const target = canvas.current!;
    const abort = new AbortController();
    let cancelled = false, failed = false, ready = false, texture: GuiImageTexture | undefined;
    let bitmap: ImageBitmap | undefined, dispose: (() => void) | undefined, lastFrame = '';
    const close = () => { bitmap?.close(); bitmap = undefined; dispose?.(); dispose = undefined; };
    const fail = (reason: unknown) => {
      if (cancelled || failed) return;
      if (!target.isConnected || owner.current !== session) { session.retire(); return; }
      failed = true; abort.abort(); close(); target.width = 0; target.height = 0;
      setState('error'); current.current.onRenderError?.(reason instanceof Error ? reason : new Error(String(reason)));
    };
    const session: Owner = { draw() {
      if (cancelled || failed || !texture) return;
      if (!target.isConnected || owner.current !== session) { session.retire(); return; }
      const now = current.current, bg = now.background;
      const key = JSON.stringify([now.width, now.height, now.scale, ...now.offset, ...bg.logicalSize, ...bg.tileSize,
        bg.rendering.rasterOrigin, bg.rendering.originRounding]);
      if (key === lastFrame) return;
      try {
        // Keep this exclusive context alive. Old handles must never retire a later frame.
        const result = presentGuiLayer({ ...frame(now, texture), canvas: target }); dispose = result.dispose;
        lastFrame = key;
        if (!ready) { ready = true; setState('ready'); }
      } catch (reason) { fail(reason); }
    }, retire() {
      if (cancelled) return;
      cancelled = true; abort.abort(); target.removeEventListener('webglcontextlost', lost);
      if (owner.current === session) owner.current = null;
      close(); target.width = 0; target.height = 0;
    } };
    owner.current = session;
    const lost = (event: Event) => { event.preventDefault(); fail(new Error('The Credits background WebGL context was lost. Reopen the screen or replace its image to retry.')); };
    target.addEventListener('webglcontextlost', lost);
    void (async () => {
      // Immediate StrictMode cleanup cancels its first setup before starting IO.
      await Promise.resolve(); if (cancelled) return;
      const sourceURL = new URL(background.image.src, target.ownerDocument.baseURI).href;
      const response = await fetch(sourceURL, { signal: abort.signal });
      if (!response.ok) throw new Error(`Credits background HTTP ${response.status}.`);
      const blob = await response.blob();
      if (cancelled || failed) return;
      if (blob.size > 67108864) throw new RangeError('Credits background exceeds the encoded image budget.');
      const [header, footer] = await Promise.all([blob.slice(0, 18).arrayBuffer(), blob.slice(Math.max(0, blob.size - 26)).arrayBuffer()]);
      if (cancelled || failed) return;
      const tga = inspectGuiLayerTga(new Uint8Array(header), new Uint8Array(footer), blob.type, blob.size);
      if (tga) {
        if (tga.width !== naturalWidth || tga.height !== naturalHeight) throw new RangeError('Credits background dimensions differ from their declaration.');
        const bytes = await blob.arrayBuffer(); if (cancelled || failed) return;
        texture = decodeTga(bytes);
      } else {
        if (typeof createImageBitmap !== 'function') throw new Error('Straight-alpha ImageBitmap decoding is unavailable.');
        const decoded = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none', imageOrientation: 'none' });
        if (cancelled || failed) { decoded.close(); return; }
        bitmap = decoded; texture = decoded;
      }
      if (texture.width !== naturalWidth || texture.height !== naturalHeight) throw new RangeError('Credits background dimensions differ from their declaration.');
      session.draw();
    })().catch(fail);
    return () => session.retire();
  }, [background.image.src, naturalWidth, naturalHeight]);
  return <canvas ref={canvas} width={0} height={0} aria-hidden="true" className="mc-credits-screen__background"
    data-background-renderer="gui-layer" data-render-state={state} data-source-texture={background.image.provenance}
    style={{ position: 'absolute', left: 0, top: 0, width, height, zIndex: 0, pointerEvents: 'none', imageRendering: 'pixelated' }}/>;
}
