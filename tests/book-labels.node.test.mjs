import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url), module = { exports: {} };
const source = await build({ stdin: { contents: "export {BookEditor,BookReader} from './src/book';", resolveDir: process.cwd() }, bundle: true,
  format: 'cjs', platform: 'node', write: false, external: ['react', 'react-dom', 'react-dom/*'],
  define: { 'import.meta.url': JSON.stringify(new URL('../src/index.ts', import.meta.url).href) } });
vm.runInThisContext('(function(require,module,exports){' + source.outputFiles[0].text + '\n})')(require, module, module.exports);
const { BookEditor, BookReader } = module.exports;
const font = { pages: ['/test-font.png'], pageSizes: [256], cellHeight: 16, lineHeight: 20,
  glyphs: Object.fromEntries(Array.from({ length: 95 }, (_, i) => { const c = i + 32; return [String.fromCharCode(c), {
    page: 0, x: c % 16 * 16, y: Math.floor(c / 16) * 16, width: c === 32 ? 0 : 16, height: c === 32 ? 0 : 16, advance: 12,
  }]; })) };
const ink = { font, fontScale: .5, sampling: 'bilinear', shader: 'bitmap-smooth', widthRounding: 'ceil', paintOffset: [0, 1] };
const profile = { frameSize: [900, 600], origin: [30.25, 20.25], pageNumber: ink, footer: ink };
let io = 0, callbacks = 0; const oldFetch = globalThis.fetch, oldBitmap = globalThis.createImageBitmap;
globalThis.fetch = () => { io++; throw Error('SSR fetch'); }; globalThis.createImageBitmap = () => { io++; throw Error('SSR bitmap'); };
after(() => { globalThis.fetch = oldFetch; if (oldBitmap === undefined) delete globalThis.createImageBitmap; else globalThis.createImageBitmap = oldBitmap;
  assert.equal(io, 0); assert.equal(callbacks, 0); });
const render = (labelRaster, props = {}, reader = false, omit = false) => renderToStaticMarkup(createElement(reader ? BookReader : BookEditor, {
  pages: ['', ''], ...props, layout: omit ? { unitScale: 2 } : { unitScale: 2, labelRaster }, onLabelRenderError() { callbacks++; },
}));
const canvases = value => (value.match(/class="mc-gui-layer"/g) ?? []).length;
test('source SSR is never ready, preserves literal labels and independent role activity without IO', () => {
  const html = render(profile); assert.equal(canvases(html), 5); assert.doesNotMatch(html, /data-book-label-ready/);
  assert.match(html, />Page 1 of 2</); assert.match(html, />Sign</);
  assert.equal(canvases(render(profile, { mode: 'signing' })), 8);
  assert.equal(canvases(render(profile, { readOnly: true })), 1);
  assert.equal(canvases(render(profile, { disabled: true })), 1);
  assert.equal(canvases(render(profile, {}, true)), 1);
  assert.equal(canvases(render({ ...profile, footer: undefined })), 1);
  assert.equal(canvases(render({ ...profile, pageNumber: undefined })), 4);
});
test('omitted and explicit undefined leave the exact same CSS HTML', () => {
  assert.equal(render(undefined), render(undefined, {}, false, true)); assert.equal(canvases(render(undefined)), 0);
});
test('unused font extensions are not serialized and missing content glyphs leave ordinary fallback markup', () => {
  const extended = { ...font }; extended.extra = extended;
  assert.equal(canvases(render({ ...profile, pageNumber: { ...ink, font: extended } })), 5);
  const missing = { ...font.glyphs }; delete missing.P;
  const html = render({ ...profile, pageNumber: { ...ink, font: { ...font, glyphs: missing } } });
  assert.equal(canvases(html), 4); assert.match(html, />Page 1 of 2</); assert.doesNotMatch(html, /counter-painter/);
});
test('character budgets reject before used-glyph getters or copies, without losing fallback text', () => {
  let reads = 0; const glyphs = { ...font.glyphs };
  Object.defineProperty(glyphs, 'A', { get() { reads++; throw Error('Unbounded glyph access'); } });
  const html = render({ ...profile, pageNumber: undefined, footer: { ...ink, font: { ...font, glyphs } } }, { labels: { sign: 'A'.repeat(4097) } });
  assert.equal(reads, 0); assert.equal(canvases(html), 0); assert.match(html, new RegExp('A{4097}'));
});
for (const [name, bad] of Object.entries({ null: null, fractionalFrame: { ...profile, frameSize: [900.1, 600] },
  origin: { ...profile, origin: [Infinity, 0] }, rounding: { ...profile, pageNumber: { ...ink, widthRounding: 'nearest' } },
  sparseOffset: { ...profile, footer: { ...ink, paintOffset: new Array(2) } }, offsetOverflow: { ...profile, footer: { ...ink, paintOffset: [1e99, 0] } },
  fontScale: { ...profile, pageNumber: { ...ink, fontScale: 0 } }, sampler: { ...profile, footer: { ...ink, sampling: 'unknown' } },
  shader: { ...profile, pageNumber: { ...ink, shader: 'unknown' } }, color: { ...profile, footer: { ...ink, color: [255.5, 0, 0, 255] } },
  pages: { ...profile, pageNumber: { ...ink, font: { ...font, pageSizes: [] } } } })) {
  test(`inactive declaration rejects ${name} before IO`, () => assert.throws(() => render(bad, { mode: 'signing', readOnly: true }), RangeError));
}
