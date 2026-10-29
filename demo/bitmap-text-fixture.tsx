import { useState } from 'react';
import { BitmapText } from '../src/bitmap-text';
import type { BitmapFont } from '../src/bitmap-text';

/** Synthetic RGBA probes, not a Minecraft font or replacement artwork. */
export const bitmapProbePage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAACCAYAAABllJ3tAAAAQklEQVR4AWP4DwQMQOCQ0LDAJ63+zH8Ghv8M/xn+gwADEDAzPjzIuP/8/f3bTtwSXz+xWI2xsYHhf0MDAyMQ/AcCACWeH86iihP6AAAAAElFTkSuQmCC';
export const bitmapProbeFont: BitmapFont = { pages: [bitmapProbePage], lineHeight: 3, glyphs: {
  A: { page: 0, x: 0, y: 0, width: 2, height: 2, advance: 3 },
  B: { page: 0, x: 2, y: 0, width: 2, height: 2, advance: 4 },
  '😀': { page: 0, x: 4, y: 0, width: 2, height: 2, advance: 5 },
  '钻': { page: 0, x: 6, y: 0, width: 2, height: 2, advance: 3 },
  ' ': { page: 0, x: 0, y: 0, width: 0, height: 0, advance: 2 },
} };

export function BitmapTextFixture() {
  const [text, setText] = useState('A😀'), [mounted, setMounted] = useState(true), [failure, setFailure] = useState(false), [missing, setMissing] = useState(false), [badColor, setBadColor] = useState(false);
  const [ready, setReady] = useState(0), [errors, setErrors] = useState(0), [tag, setTag] = useState('');
  const controlledText = missing ? 'A?' : text;
  return <section id="bitmap-text-fixture" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', minWidth: 0, gap: 16, padding: 20, background: '#28292a', color: '#fff' }}>
    <h2>Synthetic bitmap text probes</h2>
    <p>Diagnostic cells verify sampling and text behavior. They are not native glyph artwork.</p>
    <div data-case="bitmap-point"><BitmapText font={bitmapProbeFont} scale={2} sampling="point" shader="bitmap">{'A😀 B\n钻A'}</BitmapText></div>
    <div data-case="bitmap-bilinear"><BitmapText font={bitmapProbeFont} scale={2} sampling="bilinear" shader="bitmap">B</BitmapText></div>
    <div data-case="bitmap-smooth"><BitmapText font={bitmapProbeFont} scale={2} sampling="bilinear" shader="bitmap-smooth">B</BitmapText></div>
    <div data-case="bitmap-shadow"><BitmapText font={bitmapProbeFont} scale={2} sampling="point" shader="bitmap" color="rgb(128, 255, 64)" shadow={{ color: '#00000080', offsetX: -1, offsetY: 1 }}>A</BitmapText></div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      <div data-case="bitmap-parent-shadow-control" style={{ background: '#28292a', fontFamily: 'monospace', fontSize: 16, lineHeight: '20px', textShadow: 'none' }}><BitmapText font={bitmapProbeFont} scale={8} sampling="point" shader="bitmap">A</BitmapText></div>
      <div data-case="bitmap-parent-shadow-red" style={{ background: '#28292a', fontFamily: 'monospace', fontSize: 16, lineHeight: '20px', textShadow: '2px 2px #ff0000' }}><BitmapText font={bitmapProbeFont} scale={8} sampling="point" shader="bitmap">A</BitmapText></div>
    </div>
    <div data-case="bitmap-empty"><BitmapText font={bitmapProbeFont} sampling="point" shader="bitmap">{''}</BitmapText></div>
    <div data-case="bitmap-spaces"><BitmapText font={{ ...bitmapProbeFont, pages: ['/__unused_bitmap_page__.png'] }} sampling="point" shader="bitmap">{'  \n '}</BitmapText></div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <button onClick={() => setText(value => value === 'A😀' ? 'B A' : 'A😀')}>Change bitmap text</button>
      <button onClick={() => setMounted(value => !value)}>Toggle bitmap renderer</button>
      <button onClick={() => setFailure(value => !value)}>Toggle bitmap page failure</button>
      <button onClick={() => setMissing(value => !value)}>Toggle bitmap missing glyph</button>
      <button onClick={() => setBadColor(value => !value)}>Toggle bitmap CSS color failure</button>
    </div>
    <div data-case="bitmap-controlled">{mounted && <BitmapText font={{ ...bitmapProbeFont, pages: [failure ? '/__missing_bitmap_page__.png' : bitmapProbePage] }} sampling="point" shader="bitmap" color={badColor ? 'not-a-css-color' : '#ffffff'}
      ref={node => { if (node) setTag(node.tagName); }} onReady={() => setReady(value => value + 1)} onRenderError={() => setErrors(value => value + 1)}>{controlledText}</BitmapText>}</div>
    <output aria-label="Bitmap callbacks" style={{ overflowWrap: 'anywhere' }}>{JSON.stringify({ ready, errors, tag, text: controlledText })}</output>
  </section>;
}
