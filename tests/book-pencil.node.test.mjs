import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url), module = { exports: {} };
const source = await build({ stdin: { contents: "export {BookEditor} from './src/book';export {layoutBookPencil} from './src/book-pencil';", resolveDir: process.cwd() },
  bundle: true, format: 'cjs', platform: 'node', write: false, external: ['react', 'react-dom', 'react-dom/*'],
  define: { 'import.meta.url': JSON.stringify(new URL('../src/index.ts', import.meta.url).href) } });
vm.runInThisContext('(function(require,module,exports){' + source.outputFiles[0].text + '\n})')(require, module, module.exports);
const { BookEditor, layoutBookPencil } = module.exports;
const profile = { frameSize: [2570, 1402], origin: [97, 25] };
let io = 0; const oldFetch = globalThis.fetch;
globalThis.fetch = () => { io++; throw Error('Unexpected SSR IO'); };
after(() => { globalThis.fetch = oldFetch; assert.equal(io, 0); });
const render = (pencilRaster, props = {}, omit = false) => renderToStaticMarkup(createElement(BookEditor, {
  pages: ['', ''], pageActions: () => ({ edit: true }), onPageAction() { throw Error('SSR action'); },
  ...props, layout: omit ? { unitScale: 5 } : { unitScale: 5, pencilRaster }, onPencilRenderError() { throw Error('SSR renderer callback'); },
}));
test('default markup is identical when option is omitted or explicitly undefined; source SSR has only unready painters', () => {
  const css = render(undefined), source = render(profile);
  assert.equal(css, render(undefined, {}, true));
  assert.doesNotMatch(css, /pencil-painters|mc-gui-layer/);
  assert.equal((source.match(/class="mc-gui-layer"/g) ?? []).length, 6);
  assert.doesNotMatch(source, /data-source-pencil-ready/);
  assert.match(source, /data-book-action="edit"/);
  assert.doesNotMatch(render(profile, { mode: 'signing' }), /mc-gui-layer/);
  assert.doesNotMatch(render(profile, { readOnly: true }), /mc-gui-layer/);
});
test('source contain uses GLOBAL coordinates before quantization, without replacing source hitboxes', () => {
  const a = layoutBookPencil(profile, 5, [172.5, 198, 19, 18]);
  assert.deepEqual(a.image.rect, [172.5, 198.55555725097656, 19, 16.88888931274414]);
  assert.equal(a.image.physicalPrecision, 'float32');
  assert.deepEqual(a.outputRect, [859, 989, 100, 90]);
});
for (const [name, value] of Object.entries({ null: null, sparseOrigin: { ...profile, origin: new Array(2) },
  nanOrigin: { ...profile, origin: [NaN, 0] }, hugeOrigin: { ...profile, origin: [1e99, 0] },
  fractionalFrame: { ...profile, frameSize: [100.5, 100] }, zeroFrame: { ...profile, frameSize: [100, 0] },
  frameBudget: { ...profile, frameSize: [8192, 8192] }, invalidRetry: { ...profile, renderKey: {} },
  infiniteRetry: { ...profile, renderKey: Infinity } })) {
  test(`invalid source profile ${name} is rejected before any SSR IO even while signing`, () => {
    assert.throws(() => render(value, { mode: 'signing' }), RangeError);
  });
}
