import { forwardRef, useEffect, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';
import { loadTexture } from './item-renderer-engine';
import { layoutBitmapText, renderBitmapLayout } from './bitmap-text-engine';
import type { BitmapFont } from './bitmap-text-engine';
export type { BitmapFont, BitmapGlyph } from './bitmap-text-engine';

export interface BitmapTextProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'color'> {
  font: BitmapFont;
  children: string;
  scale?: number;
  color?: string;
  sampling: 'point' | 'bilinear';
  shader: 'bitmap' | 'bitmap-smooth';
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

/** Source glyphs on one controlled canvas, with real selectable DOM text kept. */
export const BitmapText = forwardRef<HTMLSpanElement, BitmapTextProps>(function BitmapText({ font, children, scale = 1, color = '#ffffff', sampling, shader, shadow, onReady, onRenderError, className, style, ...props }, ref) {
  if (typeof children !== 'string') throw new RangeError('BitmapText children must be a string.');
  if (!font || !Array.isArray(font.pages) || !font.glyphs) throw new RangeError('An explicit bitmap font is required.');
  if (!Number.isFinite(scale) || scale <= 0) throw new RangeError('scale must be positive and finite.');
  if (!['point', 'bilinear'].includes(sampling) || !['bitmap', 'bitmap-smooth'].includes(shader)) throw new RangeError('Explicit supported sampling and shader are required.');
  concreteColor(color); if (shadow) concreteColor(shadow.color);
  const used = [...new Set([...children.replace(/\r\n?/g, '\n')].filter(character => character !== '\n'))];
  const signature = JSON.stringify({ text: children, font: { pages: font.pages, lineHeight: font.lineHeight, glyphs: used.map(character => [character, font.glyphs[character]]) }, scale, color, sampling, shader, shadow });
  const canvas = useRef<HTMLCanvasElement | null>(null), callbacks = useRef({ onReady, onRenderError }); callbacks.current = { onReady, onRenderError };
  const [state, setState] = useState<{ key: string; status: 'loading' | 'ready' | 'error'; width: number; height: number }>({ key: '', status: 'loading', width: 0, height: 0 });
  const ready = state.key === signature && state.status === 'ready';
  useEffect(() => {
    let cancelled = false;
    if (canvas.current) { canvas.current.width = 0; canvas.current.height = 0; }
    setState({ key: signature, status: 'loading', width: 0, height: 0 });
    void (async () => {
      const layout = layoutBitmapText(font, children, scale, shadow), fill = colorRgba(color), shade = shadow && { ...shadow, color: colorRgba(shadow.color) };
      const pages = new Map(await Promise.all(layout.pages.map(async index => [index, await loadTexture(font.pages[index]!)] as const)));
      if (cancelled || !canvas.current) return;
      const result = renderBitmapLayout(layout, pages, fill, sampling, shader, shade), context = canvas.current.getContext('2d');
      if (!context) throw new Error('Canvas2D unavailable.');
      canvas.current.width = result.width; canvas.current.height = result.height;
      if (result.width && result.height) { const image = context.createImageData(result.width, result.height); image.data.set(result.data); context.putImageData(image, 0, 0); }
      setState({ key: signature, status: 'ready', width: result.width, height: result.height });
    })().catch(error => { if (!cancelled) { if (canvas.current) { canvas.current.width = 0; canvas.current.height = 0; } setState({ key: signature, status: 'error', width: 0, height: 0 }); callbacks.current.onRenderError?.(error instanceof Error ? error : new Error(String(error))); } });
    return () => { cancelled = true; };
    // Signature includes the complete source values used by this string. It
    // avoids callback/repaint loops when hosts recreate equivalent font objects.
  }, [signature]);
  useEffect(() => { if (ready) callbacks.current.onReady?.(); }, [ready, signature]);
  return <span {...props} ref={ref} className={['mc-bitmap-text', className].filter(Boolean).join(' ')} data-render-state={state.key === signature ? state.status : 'loading'} data-fidelity="controlled-bitmap-reconstruction"
    style={{ display: 'inline-block', position: 'relative', verticalAlign: 'baseline', ...(ready ? { width: state.width, height: state.height } : {}), ...style } as CSSProperties}>
    <canvas ref={canvas} aria-hidden="true" className="mc-bitmap-text__canvas" width={0} height={0} style={{ display: ready ? 'block' : 'none', imageRendering: 'pixelated', userSelect: 'none' }}/>
    <span className="mc-bitmap-text__text" style={ready ? { position: 'absolute', inset: 0, overflow: 'hidden', color: 'transparent', textShadow: 'none', whiteSpace: 'pre', userSelect: 'text' } : { color, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{children}</span>
  </span>;
});
