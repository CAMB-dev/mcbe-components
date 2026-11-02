import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { BookEditor } from '../src/book';
import type { BookLabelRole, BookLabelRasterStyle } from '../src/book';
import type { GuiTextFont } from '../src';
import '../src/styles.css';

// Authored test data only. No product art, private font or native glyph claim.
const atlas = document.createElement('canvas'); atlas.width = atlas.height = 256;
const ctx = atlas.getContext('2d')!; ctx.fillStyle = '#fff';
for (let c = 33; c < 127; c++) { const x = c % 16 * 16, y = Math.floor(c / 16) * 16; ctx.fillRect(x + 2, y + 2, 6 + c % 3, 12); }
const font: GuiTextFont = { pages: [atlas.toDataURL()], pageSizes: [256], cellHeight: 16, lineHeight: 20,
  glyphs: Object.fromEntries(Array.from({ length: 95 }, (_, index) => { const c = index + 32; return [String.fromCharCode(c),
    { page: 0, x: c % 16 * 16, y: Math.floor(c / 16) * 16, width: c === 32 ? 0 : 16, height: c === 32 ? 0 : 16, advance: 12 }]; })) };
interface Config { enabled: boolean; mode: 'pages' | 'signing'; bad: boolean; missing: boolean; retry: number; disabled: boolean; spread: number; long: boolean; sign: string }
declare global { interface Window { bookLabelQA: { configure(next: Partial<Config>): void; errors: { role: BookLabelRole; message: string }[]; actions: string[] } } }
const errors: { role: BookLabelRole; message: string }[] = [], actions: string[] = [];
function App() {
  const [pages, setPages] = useState<readonly string[]>(['A draft', '', '', '']);
  const [config, setConfig] = useState<Config>({ enabled: true, mode: 'pages', bad: false, missing: false, retry: 0, disabled: false, spread: 0,
    long: new URLSearchParams(location.search).has('long'), sign: 'Sign book' });
  window.bookLabelQA = { configure(next) { flushSync(() => setConfig(value => ({ ...value, ...next }))); }, errors, actions };
  const glyphs = { ...font.glyphs }; if (config.missing) delete glyphs.P;
  const style: BookLabelRasterStyle = { font: { ...font, glyphs, pages: config.bad ? ['/missing-book-label-font.png'] : font.pages },
    fontScale: .5, sampling: 'bilinear', shader: 'bitmap-smooth', widthRounding: 'ceil', paintOffset: [0, 1] };
  return <div style={{ position: 'absolute', left: 60.5, top: 40.5 }}>
    <BookEditor pages={pages} onPagesChange={next => setPages([...next])} spreadIndex={config.spread} mode={config.mode} disabled={config.disabled} defaultTitle="Draft"
      layout={{ unitScale: 2, labelRaster: config.enabled ? { frameSize: [900, 600], origin: [30.25, 20.25], renderKey: config.retry, pageNumber: style, footer: style } : undefined }}
      labels={{ sign: config.sign }} pageNumberLabel={config.long ? (page) => `${page === 1 ? 'A' : 'B'}`.repeat(100) : undefined}
      onModeChange={mode => setConfig(value => ({ ...value, mode }))} onSign={() => actions.push('sign')}
      onFinish={() => actions.push('close')} onLabelRenderError={(error, role) => errors.push({ role, message: error.message })}/>
  </div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
