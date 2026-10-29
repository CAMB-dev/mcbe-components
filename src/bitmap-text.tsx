import { forwardRef, useEffect, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';
import { loadTexture } from './item-renderer-engine';
import type { PixelTexture } from './item-renderer-engine';
import { layoutBitmapText, renderBitmapLayout } from './bitmap-text-engine';
import type { BitmapFont, BitmapLayout } from './bitmap-text-engine';
import { renderBitmapGlyphs } from './bitmap-text-webgl';
import type { BitmapGlyphRun, BitmapRgba, BitmapUnicodeVertex } from './bitmap-text-webgl';
import { acquireSharedBitmapRenderer } from './bitmap-text-shared';
import type { SharedBitmapLease } from './bitmap-text-shared';
export type { BitmapFont, BitmapGlyph } from './bitmap-text-engine';

export type BitmapTextRenderer = 'cpu' | 'webgl' | 'webgl-shared';
export type BitmapTextProfile = 'atlas-rect' | 'bedrock-unicode';
export interface BitmapTextProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'color'> {
  font: BitmapFont;
  children: string;
  scale?: number;
  color?: string;
  sampling: 'point' | 'bilinear';
  shader: 'bitmap' | 'bitmap-smooth';
  /** CPU remains the default. Shared WebGL uses one Offscreen context per Document. */
  renderer?: BitmapTextRenderer;
  /** Unicode is an explicit packed-UV profile for complete 16x16 cells on 256x256 pages. */
  profile?: BitmapTextProfile;
  /** WebGL target clear color, not a CSS background. Omission keeps a transparent target. */
  background?: string;
  /** Explicit source-coordinate offset and concrete CSS color; no native shadow preset. */
  shadow?: { color: string; offsetX: number; offsetY: number };
  onReady?: () => void;
  onRenderError?: (error: Error) => void;
}
function concreteColor(value: string) {
  if (typeof value !== 'string' || !value.trim() || /\b(var|env|currentcolor|inherit|initial|unset|revert)\b/i.test(value)) throw new RangeError('Use a concrete CSS color.');
}
function colorRgba(value: string): readonly [number, number, number, number] {
  concreteColor(value);
  const canvas = document.createElement('canvas'); canvas.width = 1; canvas.height = 1;
  const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas2D unavailable.');
  context.fillStyle = '#010203'; context.fillStyle = value; const first = context.fillStyle;
  context.fillStyle = '#040506'; context.fillStyle = value;
  if (context.fillStyle !== first) throw new RangeError('Unsupported CSS color.');
  context.fillRect(0, 0, 1, 1); const rgba = context.getImageData(0, 0, 1, 1).data;
  return [rgba[0]! / 255, rgba[1]! / 255, rgba[2]! / 255, rgba[3]! / 255];
}

/** Adapter only: glyph placement is shared with CPU; shader/sampling/state belong to WebGL. */
function glyphRuns(layout: BitmapLayout, pages: ReadonlyMap<number, PixelTexture>, profile: BitmapTextProfile, fill: BitmapRgba,
  sampling: 'point' | 'bilinear', shader: 'bitmap' | 'bitmap-smooth', shadow?: { color: BitmapRgba; offsetX: number; offsetY: number }): BitmapGlyphRun[] {
  if (profile === 'bedrock-unicode') for (const { glyph } of layout.glyphs) {
    const page = pages.get(glyph.page);
    if (!page || page.width !== 256 || page.height !== 256 || glyph.width !== 16 || glyph.height !== 16 || glyph.x % 16 || glyph.y % 16 || glyph.x > 240 || glyph.y > 240) {
      throw new RangeError('The Bedrock Unicode profile requires full 16 by 16 cells aligned on 256 by 256 pages. Use atlas-rect for trimmed glyphs.');
    }
  }
  const runs: BitmapGlyphRun[] = [];
  const paint = (color: BitmapRgba, offsetX: number, offsetY: number) => {
    let group: BitmapLayout['glyphs'][number][] = [];
    const flush = () => {
      const first = group[0]; if (!first) return;
      if (profile === 'atlas-rect') {
        runs.push({ profile, page: first.glyph.page, sampling, shader, quads: group.map(({ glyph, x, y }) => ({
          x: (x + layout.originX + offsetX) * layout.scale, y: (y + layout.originY + offsetY) * layout.scale,
          width: glyph.width * layout.scale, height: glyph.height * layout.scale,
          atlasRect: [glyph.x, glyph.y, glyph.width, glyph.height], color,
        })) });
      } else {
        const vertices: BitmapUnicodeVertex[] = [], indices: number[] = [];
        const rgba: BitmapUnicodeVertex['rgba'] = [Math.round(color[0] * 255), Math.round(color[1] * 255), Math.round(color[2] * 255), Math.round(color[3] * 255)];
        for (const { glyph, x, y } of group) {
          const left = (x + layout.originX + offsetX) * layout.scale, top = (y + layout.originY + offsetY) * layout.scale;
          const right = left + 16 * layout.scale, bottom = top + 16 * layout.scale;
          const uvRaw: BitmapUnicodeVertex['uvRaw'] = [glyph.x / 16 * 4096, glyph.y / 16 * 4096], start = vertices.length;
          vertices.push({ position: [left, bottom, 0], uvRaw, rgba }, { position: [right, bottom, 1], uvRaw, rgba },
            { position: [right, top, 2], uvRaw, rgba }, { position: [left, top, 3], uvRaw, rgba });
          indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
        }
        runs.push({ profile, page: first.glyph.page, sampling, shader, vertices, indices, glyphHeight: 1 / 16, halfTexelOffset: .5 / 256 });
      }
      group = [];
    };
    // Only adjacent glyphs of the same page coalesce: overlap and shadow order stay intact.
    for (const placed of layout.glyphs) {
      if (group.length && (group[0]!.glyph.page !== placed.glyph.page || group.length === 16384)) flush();
      group.push(placed);
    }
    flush();
  };
  if (shadow) paint(shadow.color, shadow.offsetX, shadow.offsetY);
  paint(fill, 0, 0);
  return runs;
}

/** Source glyphs on one controlled canvas, with real selectable DOM text kept. */
export const BitmapText = forwardRef<HTMLSpanElement, BitmapTextProps>(function BitmapText({ font, children, scale = 1, color = '#ffffff', sampling, shader, renderer = 'cpu', profile = 'atlas-rect', background, shadow, onReady, onRenderError, className, style, ...props }, ref) {
  if (typeof children !== 'string') throw new RangeError('BitmapText children must be a string.');
  if (!font || !Array.isArray(font.pages) || !font.glyphs) throw new RangeError('An explicit bitmap font is required.');
  if (!Number.isFinite(scale) || scale <= 0) throw new RangeError('scale must be positive and finite.');
  if (!['point', 'bilinear'].includes(sampling) || !['bitmap', 'bitmap-smooth'].includes(shader)) throw new RangeError('Explicit supported sampling and shader are required.');
  concreteColor(color); if (shadow) concreteColor(shadow.color);
  const used = [...new Set([...children.replace(/\r\n?/g, '\n')].filter(character => character !== '\n'))];
  const signature = JSON.stringify({ text: children, font: { pages: font.pages, lineHeight: font.lineHeight, glyphs: used.map(character => [character, font.glyphs[character]]) }, scale, color, sampling, shader, shadow, renderer, profile, background });
  const canvas = useRef<HTMLCanvasElement | null>(null), callbacks = useRef({ onReady, onRenderError }); callbacks.current = { onReady, onRenderError };
  const [state, setState] = useState<{ key: string; status: 'loading' | 'ready' | 'error'; width: number; height: number }>({ key: '', status: 'loading', width: 0, height: 0 });
  const ready = state.key === signature && state.status === 'ready';
  useEffect(() => {
    let cancelled = false, failed = false, dispose: (() => void) | undefined;
    let shared: SharedBitmapLease | undefined;
    const target = canvas.current;
    if (target) { target.width = 0; target.height = 0; }
    setState({ key: signature, status: 'loading', width: 0, height: 0 });
    const fail = (error: unknown) => {
      if (cancelled || failed) return; failed = true;
      const lease = shared; shared = undefined; lease?.release();
      if (target) { target.width = 0; target.height = 0; }
      setState({ key: signature, status: 'error', width: 0, height: 0 });
      callbacks.current.onRenderError?.(error instanceof Error ? error : new Error(String(error)));
    };
    const contextLost = (event: Event) => { event.preventDefault(); fail(new Error('The bitmap WebGL context was lost.')); };
    if (renderer === 'webgl') target?.addEventListener('webglcontextlost', contextLost);
    void (async () => {
      if (!['cpu', 'webgl', 'webgl-shared'].includes(renderer)) throw new RangeError('Unsupported bitmap renderer.');
      if (!['atlas-rect', 'bedrock-unicode'].includes(profile)) throw new RangeError('Unsupported bitmap profile.');
      if (renderer === 'cpu' && (profile !== 'atlas-rect' || background !== undefined)) throw new RangeError('The CPU bitmap renderer supports atlas-rect without a target background. Select WebGL for these options.');
      const layout = layoutBitmapText(font, children, scale, shadow), fill = colorRgba(color), shade = shadow && { ...shadow, color: colorRgba(shadow.color) };
      const clear = background === undefined ? undefined : colorRgba(background);
      const pages = new Map(await Promise.all(layout.pages.map(async index => [index, await loadTexture(font.pages[index]!)] as const)));
      if (cancelled || !target) return;
      if (renderer === 'webgl-shared') {
        shared = acquireSharedBitmapRenderer(target, fail);
        const presented = shared.render({ width: layout.width, height: layout.height, pages,
          runs: glyphRuns(layout, pages, profile, fill, sampling, shader, shade), background: clear ? { kind: 'solid', color: clear } : undefined },
        () => !cancelled && !failed && canvas.current === target);
        if (!presented || failed) return;
      } else if (renderer === 'webgl') {
        const result = renderBitmapGlyphs({ width: layout.width, height: layout.height, pages, runs: glyphRuns(layout, pages, profile, fill, sampling, shader, shade),
          background: clear ? { kind: 'solid', color: clear } : undefined, canvas: target });
        dispose = result.dispose;
        if (failed) return;
      } else {
        const result = renderBitmapLayout(layout, pages, fill, sampling, shader, shade), context = target.getContext('2d');
        if (!context) throw new Error('Canvas2D unavailable.');
        target.width = result.width; target.height = result.height;
        if (result.width && result.height) { const image = context.createImageData(result.width, result.height); image.data.set(result.data); context.putImageData(image, 0, 0); }
      }
      setState({ key: signature, status: 'ready', width: layout.width, height: layout.height });
    })().catch(fail);
    return () => {
      cancelled = true; target?.removeEventListener('webglcontextlost', contextLost);
      shared?.release();
      // StrictMode may immediately re-run an effect on the same canvas. Only a
      // detached/replaced target can lose its context; a re-used node stays live.
      queueMicrotask(() => { if (canvas.current !== target) dispose?.(); });
    };
    // Signature includes the complete source values used by this string. It
    // avoids callback/repaint loops when hosts recreate equivalent font objects.
  }, [signature]);
  useEffect(() => { if (ready) callbacks.current.onReady?.(); }, [ready, signature]);
  return <span {...props} ref={ref} className={['mc-bitmap-text', className].filter(Boolean).join(' ')} data-render-state={state.key === signature ? state.status : 'loading'} data-fidelity="controlled-bitmap-reconstruction" data-renderer={renderer} data-profile={profile}
    style={{ display: 'inline-block', position: 'relative', verticalAlign: 'baseline', ...(ready ? { width: state.width, height: state.height } : {}), ...style } as CSSProperties}>
    <canvas key={renderer === 'cpu' ? 'cpu' : signature} ref={canvas} aria-hidden="true" className="mc-bitmap-text__canvas" width={0} height={0} style={{ display: ready ? 'block' : 'none', imageRendering: 'pixelated', userSelect: 'none' }}/>
    <span className="mc-bitmap-text__text" style={ready ? { position: 'absolute', inset: 0, overflow: 'hidden', color: 'transparent', textShadow: 'none', whiteSpace: 'pre', userSelect: 'text' } : { color, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{children}</span>
  </span>;
});
