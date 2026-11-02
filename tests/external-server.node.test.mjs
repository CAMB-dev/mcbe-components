import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url), module = { exports: {} };
const bundle = await build({ stdin: { contents: "export {ExternalServerForm} from './src/external-server-form'; export {ExternalServerField} from './src/external-server-field';", resolveDir: process.cwd() },
  bundle: true, format: 'cjs', platform: 'node', write: false, external: ['react', 'react-dom', 'react-dom/*'],
  define: { 'import.meta.url': JSON.stringify(new URL('../src/index.ts', import.meta.url).href) } });
vm.runInThisContext('(function(require,module,exports){' + bundle.outputFiles[0].text + '\n})')(require, module, module.exports);
const { ExternalServerForm, ExternalServerField } = module.exports;
const labels = { name: 'Server name', address: 'Server address', port: 'Server port', play: 'Play', save: 'Save', remove: 'Remove', close: 'Close form' };
const bindings = { playEnabled: true, playDisabledVisible: false, saveEnabled: true, saveDisabledVisible: false };
const values = { name: 'A <draft>', address: '例子.example', port: '00001x' };
const render = (props = {}) => renderToStaticMarkup(createElement(ExternalServerForm, { title: 'Add external server', mode: 'add', labels, bindings, ...props }));
const field = (props = {}) => renderToStaticMarkup(createElement(ExternalServerField, { kind: 'port', label: 'Port', ...props }));
let io = 0, callbacks = 0;
const previousFetch = globalThis.fetch, previousBitmap = globalThis.createImageBitmap;
globalThis.fetch = () => { io++; throw Error('SSR must not fetch resources'); };
globalThis.createImageBitmap = () => { io++; throw Error('SSR must not decode resources'); };
after(() => {
  globalThis.fetch = previousFetch;
  if (previousBitmap === undefined) delete globalThis.createImageBitmap; else globalThis.createImageBitmap = previousBitmap;
  assert.equal(io, 0); assert.equal(callbacks, 0);
});

test('SSR emits real named native fields and literal accepted strings with zero painter/network side effects', () => {
  const html = render({ value: values, onValueChange() { callbacks++; }, onAction() { callbacks++; }, onClose() { callbacks++; } });
  assert.equal((html.match(/<input /g) ?? []).length, 3);
  for (const value of ['A &lt;draft&gt;', '例子.example', '00001x']) assert.ok(html.includes(`value="${value}"`));
  assert.match(html, /<form/); assert.match(html, /aria-labelledby=/); assert.match(html, /data-native-certified="false"/);
  assert.doesNotMatch(html, /<canvas|<iframe|<script|body-painter/);
  assert.match(html, /width:632px;height:358px/); assert.match(html, /type="text"/);
});

test('SSR default fields retain source limits, native port keyboard hint and associated labels', () => {
  for (const [kind, maximum] of [['name', 16], ['address', 256], ['port', 6]]) {
    const html = field({ kind, id: `field-${kind}`, defaultValue: '00x' });
    assert.match(html, new RegExp(`for="field-${kind}"`)); assert.match(html, new RegExp(`id="field-${kind}"`));
    assert.match(html, new RegExp(`maxLength="${maximum}"`)); assert.match(html, /type="text"/); assert.match(html, /value="00x"/);
    assert.match(html, /height:76px/); assert.match(html, /data-web-text-policy="native-unfiltered"/);
    if (kind === 'port') assert.match(html, /inputMode="numeric"/);
  }
});

test('caller overrides remain on the native input rather than its source row', () => {
  const html = field({ id: 'caller', className: 'caller-input', style: { letterSpacing: '2px' }, maxLength: 19,
    inputMode: 'decimal', placeholder: 'Port here', 'data-caller': 'yes', readOnly: true, value: '001-2', onChange() { callbacks++; } });
  const input = html.match(/<input [^>]*>/)?.[0]; assert.ok(input);
  assert.match(input, /class="[^"]*caller-input/); assert.match(input, /letter-spacing:2px/);
  assert.match(input, /maxLength="19"/); assert.match(input, /inputMode="decimal"/); assert.match(input, /data-caller="yes"/); assert.match(input, /readOnly=""/);
  assert.doesNotMatch(html.match(/^<div [^>]*>/)?.[0] ?? '', /caller-input|data-caller/);
});

test('all independent binding combinations render one actual action button and aria-hidden underpaint', () => {
  for (const mode of ['add', 'edit']) for (let mask = 0; mask < 16; mask++) {
    const booleans = { playEnabled: !!(mask & 1), playDisabledVisible: !!(mask & 2), saveEnabled: !!(mask & 4), saveDisabledVisible: !!(mask & 8) };
    const html = render({ mode, bindings: booleans });
    assert.equal((html.match(new RegExp(`data-external-server-action="${mode === 'add' ? 'play' : 'remove'}"`, 'g')) ?? []).length, 1);
    assert.equal((html.match(/data-external-server-action="save"/g) ?? []).length, booleans.saveEnabled || booleans.saveDisabledVisible ? 1 : 0);
    assert.doesNotMatch(html, /<button[^>]*class="[^"]*underlay/);
    if (html.includes('mc-external-server-action--underlay')) assert.match(html, /<span[^>]*mc-external-server-action--underlay[^>]*aria-hidden="true"/);
  }
});

test('disabled/readOnly and edit mode do not invoke callbacks or synthesize connection activity during SSR', () => {
  for (const props of [{ disabled: true }, { readOnly: true }, { mode: 'edit' }, { hidden: true }]) {
    const html = render({ ...props, value: values, onValueChange() { callbacks++; }, onAction() { callbacks++; } });
    assert.match(html, /value="00001x"/); assert.doesNotMatch(html, /<canvas/);
  }
});

const invalidForm = {
  title: { title: 42 }, nullSize: { size: null }, sparseSize: { size: new Array(2) },
  mode: { mode: 'unknown' }, submitAction: { submitAction: 'remove' }, scaleZero: { scale: 0 }, fractionalScale: { scale: 1.5 },
  shortSize: { size: [21, 179] }, height: { size: [316, 52] }, nonfinite: { size: [Infinity, 179] },
  missingBinding: { bindings: { playEnabled: true, playDisabledVisible: false, saveEnabled: true } },
  numericBinding: { bindings: { ...bindings, saveEnabled: 1 } }, labels: { labels: { ...labels, port: null } },
  value: { value: { ...values, port: 19132 } }, defaultValue: { defaultValue: { ...values, address: null } },
};
for (const [name, props] of Object.entries(invalidForm)) test(`invalid form ${name} rejects synchronously without IO`, () => assert.throws(() => render(props), error => error instanceof TypeError || error instanceof RangeError));

for (const [name, props] of Object.entries({ kind: { kind: 'unknown' }, label: { label: null }, scale: { scale: .5 }, width: { width: 6 }, extent: { width: 5000, scale: 2 } }))
  test(`invalid standalone field ${name} rejects synchronously without IO`, () => assert.throws(() => field(props), error => error instanceof TypeError || error instanceof RangeError));
