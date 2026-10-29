import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BitmapText } from '../src/bitmap-text';
import type { BitmapFont, BitmapTextProps, BitmapTextProfile } from '../src/bitmap-text';

// Synthetic diagnostic RGBA cells; these are neither native font artwork nor
// native-capture references. Embedded PNGs make the public probes reproducible.
export const gpuProbeWhite = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAADklEQVR42mP4DwUMMAYAj4IP8SHNGCcAAAAASUVORK5CYII=';
export const gpuProbeBlue = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEElEQVR42mNgYPj/H4KhDAA/0gf5XBPgQgAAAABJRU5ErkJggg==';
export const gpuProbeAlpha = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR42mP4z8DQwPCf4T8ADn0DfpcZDN4AAAAASUVORK5CYII=';
export const gpuProbeUnicodeGreen = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAACZklEQVR42u3cwQkAQAgDwfTfdCxC8ONwTAMR9nlpUuCnGAEEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAA4CwA2+cIIACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIACAAAACAPgQBBAAQABAAAwBAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIACAAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAIABGAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAQACMAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAAKcGdLcd46LRFK4AAAAASUVORK5CYII=';
export const gpuProbeUnicodeBlue = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAACfElEQVR42u3UsQ0AQAgDsey/NJQMQAcu3L70EbpUUsBPMQIIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgACYAQQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAA5gPLJxwBAiAAIAACAAIgACAAAgACIAAgAAIAAiAAIAACAAIgACAAAgACIAAgAAIAAiAAIAACAAIgACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIAAgAEYAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQABAAIwAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgACAABgBBAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEAATAECAAgAIAAAAIACAAgAMApDXWoHeOfX+eTAAAAAElFTkSuQmCC';
export const gpuAlphaFont: BitmapFont = { pages: [gpuProbeAlpha], lineHeight: 1, glyphs: {
  R: { page: 0, x: 0, y: 0, width: 1, height: 1, advance: 2 },
  G: { page: 0, x: 1, y: 0, width: 1, height: 1, advance: 2 },
  ' ': { page: 0, x: 0, y: 0, width: 0, height: 0, advance: 2 },
} };
export const gpuGeometryFont: BitmapFont = { pages: [gpuProbeWhite, gpuProbeBlue], lineHeight: 3, glyphs: {
  A: { page: 0, x: 0, y: 0, width: 2, height: 2, advance: 3, offsetX: -1, offsetY: -.5 },
  '😀': { page: 1, x: 0, y: 0, width: 2, height: 2, advance: 4 },
  B: { page: 1, x: 0, y: 0, width: 2, height: 2, advance: 3 },
} };
export const gpuUnicodeFont: BitmapFont = { pages: [gpuProbeUnicodeGreen, gpuProbeUnicodeBlue], lineHeight: 18, glyphs: {
  A: { page: 0, x: 16, y: 32, width: 16, height: 16, advance: 18 },
  '😀': { page: 1, x: 48, y: 64, width: 16, height: 16, advance: 20 },
  ' ': { page: 0, x: 0, y: 0, width: 0, height: 0, advance: 2 },
} };

const modes = ['cpu', 'webgl', 'geometry', 'unicode', 'alpha-transparent', 'alpha-opaque',
  'missing-page', 'delayed-page', 'delayed-unmount', 'unknown-glyph', 'invalid-profile', 'trimmed-unicode',
  'cpu-profile', 'cpu-background', 'invalid-background', 'empty', 'spaces'] as const;
type Mode = typeof modes[number];

function specimen(mode: Mode): BitmapTextProps {
  const base: BitmapTextProps = { font: gpuAlphaFont, children: 'R', scale: 2, sampling: 'point', shader: 'bitmap' };
  if (mode === 'cpu') return base;
  if (mode === 'cpu-profile') return { ...base, profile: 'bedrock-unicode' };
  if (mode === 'cpu-background') return { ...base, background: '#0000ff' };
  const webgl: BitmapTextProps = { ...base, renderer: 'webgl' };
  if (mode === 'geometry') return { ...webgl, font: gpuGeometryFont, children: 'A😀\nB', shadow: { color: '#000000', offsetX: -1, offsetY: 1 } };
  if (mode === 'unicode') return { ...webgl, font: gpuUnicodeFont, profile: 'bedrock-unicode', scale: 1.5, sampling: 'bilinear', shader: 'bitmap-smooth', children: 'A😀\nA' };
  if (mode === 'alpha-opaque') return { ...webgl, background: '#0000ff' };
  if (mode === 'missing-page' || mode === 'delayed-page' || mode === 'delayed-unmount') return { ...webgl, font: { ...gpuAlphaFont, pages: [mode === 'missing-page' ? '/__gpu_bitmap_missing__.png' : mode === 'delayed-page' ? '/__gpu_bitmap_delayed__.png' : '/__gpu_bitmap_delayed_unmount__.png'] } };
  if (mode === 'unknown-glyph') return { ...webgl, children: '?' };
  if (mode === 'invalid-profile') return { ...webgl, profile: 'unsupported-profile' as BitmapTextProfile };
  if (mode === 'trimmed-unicode') return { ...webgl, profile: 'bedrock-unicode' };
  if (mode === 'invalid-background') return { ...webgl, background: 'currentColor' };
  if (mode === 'empty' || mode === 'spaces') return { ...webgl, children: mode === 'empty' ? '' : '  \n ', font: { ...gpuAlphaFont, pages: ['/__gpu_bitmap_unused__.png'] } };
  return webgl;
}

export function BitmapTextWebGLFixture() {
  const [mode, setMode] = useState<Mode>('cpu'), [mounted, setMounted] = useState(true);
  const [ready, setReady] = useState(0), [errors, setErrors] = useState<string[]>([]), [tag, setTag] = useState('');
  const [revision, setRevision] = useState(0);
  const props = specimen(mode);
  return <main data-bitmap-webgl-fixture>
    <h1>Bitmap text backend contracts</h1>
    <p>One live specimen under React StrictMode. Diagnostic cells are synthetic RGBA probes.</p>
    <nav aria-label="Bitmap specimen" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {modes.map(value => <button key={value} type="button" data-mode={value} onClick={() => setMode(value)}>{value}</button>)}
      <button type="button" onClick={() => setMounted(value => !value)}>Toggle mounted</button>
      <button type="button" onClick={() => setRevision(value => value + 1)}>Equivalent font rerender</button>
    </nav>
    <section aria-label="Rendered specimen" style={{ minHeight: 70, textShadow: '2px 2px #ff00ff' }}>
      {mounted && <BitmapText {...props} font={{ ...props.font, glyphs: { ...props.font.glyphs } }}
        id="bitmap-live" title="Selectable bitmap text" data-probe-revision={revision}
        ref={node => { if (node) setTag(node.tagName); }}
        onReady={() => setReady(value => value + 1)} onRenderError={error => setErrors(value => [...value, error.message])}/>}
    </section>
    <output aria-label="GPU bitmap callbacks">{JSON.stringify({ mode, ready, errors, tag, mounted, revision })}</output>
  </main>;
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('bitmap-webgl-root');
  if (root) createRoot(root).render(<StrictMode><BitmapTextWebGLFixture/></StrictMode>);
}
