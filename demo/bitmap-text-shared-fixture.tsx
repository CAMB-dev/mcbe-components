import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BitmapText } from '../src/bitmap-text';
import type { BitmapTextProps } from '../src/bitmap-text';
import { gpuAlphaFont, gpuGeometryFont, gpuUnicodeFont, gpuProbeBlue } from './bitmap-text-webgl-fixture';

// These public synthetic RGBA probes are shared with the dedicated-backend
// fixture. They do not contain Minecraft font artwork or private captures.
const modes = ['single', 'stress', 'geometry', 'unicode', 'opaque', 'latest-font', 'delayed', 'delayed-unmount', 'empty', 'spaces'] as const;
type Mode = typeof modes[number];
function propsFor(mode: Mode, index: number, phase: number): BitmapTextProps {
  const kind = mode === 'stress' ? ['single', 'unicode', 'geometry', 'opaque'][index % 4]! : mode;
  const alternate = phase % 2 === 1;
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
  const count = mode === 'stress' ? 48 : 1;
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
if (typeof document !== 'undefined') {
  const root = document.getElementById('bitmap-shared-root');
  if (root) createRoot(root).render(<StrictMode><BitmapTextSharedFixture/></StrictMode>);
}
