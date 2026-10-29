import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BitmapText } from '../src/bitmap-text';
import type { BitmapTextProps } from '../src/bitmap-text';
import { gpuAlphaFont, gpuGeometryFont, gpuUnicodeFont, gpuProbeBlue } from './bitmap-text-webgl-fixture';
import { acquireSharedBitmapRenderer } from '../src/bitmap-text-shared';
import type { SharedBitmapLease } from '../src/bitmap-text-shared';
import type { BitmapGlyphRenderOptions } from '../src/bitmap-text-webgl';

// These public synthetic RGBA probes are shared with the dedicated-backend
// fixture. They do not contain Minecraft font artwork or private captures.
const modes = ['single', 'stress', 'reuse-stress', 'geometry', 'unicode', 'opaque', 'latest-font', 'delayed', 'delayed-unmount', 'empty', 'spaces'] as const;
type Mode = typeof modes[number];
function propsFor(mode: Mode, index: number, phase: number): BitmapTextProps {
  const kind = mode === 'stress' ? ['single', 'unicode', 'geometry', 'opaque'][index % 4]! : mode === 'reuse-stress' ? 'single' : mode;
  // An unchanged owner intentionally keeps the session alive across updates.
  // Last-owner release is supposed to destroy it and is tested separately.
  const alternate = phase % 2 === 1 && (mode !== 'reuse-stress' || index !== 0);
  const base: BitmapTextProps = { renderer: 'webgl-shared', font: gpuAlphaFont, children: alternate ? 'G' : 'R', scale: 2, sampling: 'point', shader: 'bitmap' };
  if (kind === 'geometry') return { ...base, font: gpuGeometryFont, children: alternate ? 'B😀\nA' : 'A😀\nB', shadow: { color: '#000000', offsetX: -1, offsetY: 1 } };
  if (kind === 'unicode') return { ...base, font: gpuUnicodeFont, children: alternate ? '😀A\n😀' : 'A😀\nA', scale: 1.5, profile: 'bedrock-unicode', sampling: 'bilinear', shader: 'bitmap-smooth' };
  if (kind === 'opaque') return { ...base, background: '#0000ff' };
  if (kind === 'latest-font') return { ...base, font: { ...gpuAlphaFont, pages: [gpuProbeBlue] } };
  if (kind === 'delayed' || kind === 'delayed-unmount') return { ...base, font: { ...gpuAlphaFont, pages: [kind === 'delayed' ? '/__shared_bitmap_delayed__.png' : '/__shared_bitmap_unmount__.png'] } };
  if (kind === 'empty' || kind === 'spaces') return { ...base, children: kind === 'empty' ? '' : '  \n ', font: { ...gpuAlphaFont, pages: ['/__shared_bitmap_unused__.png'] } };
  return base;
}

export function BitmapTextSharedFixture() {
  const [mode, setMode] = useState<Mode>('single'), [mounted, setMounted] = useState(true), [phase, setPhase] = useState(0), [revision, setRevision] = useState(0);
  const [ready, setReady] = useState<Record<string, number>>({}), [errors, setErrors] = useState<Record<string, string[]>>({}), [refs, setRefs] = useState<Record<string, string>>({});
  const count = mode === 'stress' || mode === 'reuse-stress' ? 48 : 1;
  return <main>
    <h1>Shared bitmap backend contracts</h1>
    <p>One StrictMode host with one or48 simultaneous source-controlled text instances.</p>
    <nav aria-label="Shared bitmap specimens">
      {modes.map(value => <button key={value} type="button" data-mode={value} onClick={() => setMode(value)}>{value}</button>)}
      <button type="button" onClick={() => setPhase(value => value + 1)}>Advance glyphs</button>
      <button type="button" onClick={() => setRevision(value => value + 1)}>Equivalent font rerender</button>
      <button type="button" onClick={() => setMounted(value => !value)}>Toggle shared mounted</button>
    </nav>
    <div className="shared-stage" data-shared-stage>
      {mounted && Array.from({ length: count }, (_, index) => {
        const id = String(index), props = propsFor(mode, index, phase);
        return <div className="shared-item" key={id} data-shared-item={id}>
          <BitmapText {...props} font={{ ...props.font, glyphs: { ...props.font.glyphs } }}
            id={`shared-text-${id}`} title={`Shared text ${id}`} data-shared-revision={revision}
            ref={node => { if (node) setRefs(previous => previous[id] === node.tagName ? previous : { ...previous, [id]: node.tagName }); }}
            onReady={() => setReady(previous => ({ ...previous, [id]: (previous[id] ?? 0) + 1 }))}
            onRenderError={error => setErrors(previous => ({ ...previous, [id]: [...previous[id] ?? [], error.message] }))}/>
        </div>;
      })}
    </div>
    <output aria-label="Shared bitmap callbacks">{JSON.stringify({ mode, mounted, phase, revision, ready, errors, refs })}</output>
  </main>;
}

export interface SharedDirectOptions {
  width?: number; height?: number; rgba?: readonly [number, number, number, number]; clone?: boolean; empty?: boolean;
  cancel?: 'before' | 'after-transfer';
}
export interface SharedDirectQA {
  create: (count: number) => { ids: number[]; errors: string[] };
  render: (id: number, options?: SharedDirectOptions) => { rendered?: boolean; error?: string; rangeError?: boolean };
  cyclePages: (id: number) => { rendered?: boolean; error?: string };
  release: (ids: readonly number[]) => void;
}
declare global { interface Window { sharedDirectQA: SharedDirectQA } }
if (typeof document !== 'undefined') {
  const leases = new Map<number, { canvas: HTMLCanvasElement; lease: SharedBitmapLease }>();
  const source = { width: 1, height: 1, data: new Uint8ClampedArray([255, 0, 0, 128]) }; let next = 1;
  window.sharedDirectQA = {
    create(count) {
      const ids: number[] = [], errors: string[] = [];
      for (let i = 0; i < count; i++) {
        const canvas = document.createElement('canvas'), id = next++; canvas.width = 0; canvas.height = 0; canvas.dataset.sharedDirect = String(id);
        try { const lease = acquireSharedBitmapRenderer(canvas, error => errors.push(error.message)); leases.set(id, { canvas, lease }); document.querySelector('[data-shared-stage]')!.append(canvas); ids.push(id); }
        catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
      }
      return { ids, errors };
    },
    render(id, options = {}) {
      const owner = leases.get(id); if (!owner) throw Error('Unknown direct lease.');
      if (options.rgba) source.data.set(options.rgba);
      const pixel = options.clone ? { ...source, data: new Uint8ClampedArray(source.data) } : source;
      const draw: Omit<BitmapGlyphRenderOptions, 'canvas' | 'output'> = { width: options.width ?? 4, height: options.height ?? 2,
        pages: options.empty ? new Map() : new Map([[0, pixel]]),
        runs: options.empty ? [] : [{ profile: 'atlas-rect', page: 0, sampling: 'point', shader: 'bitmap', quads: [{ x: 0, y: 0, width: 2, height: 2, atlasRect: [0, 0, 1, 1] }] }] };
      let cancelled = options.cancel === 'before'; const transfer = OffscreenCanvas.prototype.transferToImageBitmap;
      if (options.cancel === 'after-transfer') OffscreenCanvas.prototype.transferToImageBitmap = function (this: OffscreenCanvas) { const bitmap = transfer.call(this); cancelled = true; return bitmap; };
      try { return { rendered: owner.lease.render(draw, () => !cancelled) }; }
      catch (error) { return { error: error instanceof Error ? error.message : String(error), rangeError: error instanceof RangeError }; }
      finally { OffscreenCanvas.prototype.transferToImageBitmap = transfer; }
    },
    cyclePages(id) {
      const owner = leases.get(id); if (!owner) throw Error('Unknown direct lease.');
      // Two individually valid pages total16MP+8192px, just beyond the16MP
      // private cache. Source arrays stay inside the browser, not JSON wire.
      const make = (rgba: readonly number[]) => { const data = new Uint8ClampedArray(4096 * 2049 * 4); data.set(rgba); return { width: 4096, height: 2049, data }; };
      const pages = new Map([[0, make([255, 0, 0, 255])], [1, make([0, 255, 0, 255])]]);
      try { return { rendered: owner.lease.render({ width: 6, height: 2, pages, runs: [0, 1, 0].map((page, i) => ({ profile: 'atlas-rect' as const, page, sampling: 'point' as const, shader: 'bitmap' as const,
        quads: [{ x: i * 2, y: 0, width: 2, height: 2, atlasRect: [0, 0, 1, 1] as const }] })) }) }; }
      catch (error) { return { error: error instanceof Error ? error.message : String(error) }; }
    },
    release(ids) { for (const id of ids) { const owner = leases.get(id); if (!owner) continue; owner.lease.release(); owner.canvas.remove(); leases.delete(id); } },
  };
}
if (typeof document !== 'undefined') {
  const root = document.getElementById('bitmap-shared-root');
  if (root) createRoot(root).render(<StrictMode><BitmapTextSharedFixture/></StrictMode>);
}
