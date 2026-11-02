import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import fs from 'node:fs';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url), module = { exports: {} };
const bundled = await build({ stdin: { contents: "export {PlayJoinCodeDialog,PlayHighPingDialog} from './src/play-popups';", resolveDir: process.cwd() },
  bundle: true, write: false, format: 'cjs', platform: 'node', external: ['react', 'react-dom', 'react-dom/*'],
  define: { 'import.meta.url': JSON.stringify(new URL('../src/index.ts', import.meta.url).href) } });
vm.runInThisContext('(function(require,module,exports){' + bundled.outputFiles[0].text + '\n})')(require, module, module.exports);
const { PlayJoinCodeDialog, PlayHighPingDialog } = module.exports;
const joinLabels = { title: 'Join by code', close: 'Close', code: 'Invitation code', placeholder: 'Code here', join: 'Join', help: 'Find the code from your host.' };
const pingLabels = { title: 'High ping', close: 'Close warning', join: 'Join anyway', cancel: 'Cancel', line1: 'Latency may be high.', line2: 'Your experience may vary.' };
const join = (props = {}) => renderToStaticMarkup(createElement(PlayJoinCodeDialog, { open: true, labels: joinLabels, bindings: { inputEnabled: true }, value: '', ...props }));
const ping = (props = {}) => renderToStaticMarkup(createElement(PlayHighPingDialog, { open: true, labels: pingLabels, bindings: { closeVisible: true }, ...props }));
let io = 0, requests = 0, refs = 0;
const previousFetch = globalThis.fetch, previousBitmap = globalThis.createImageBitmap;
globalThis.fetch = () => { io++; throw Error('Popup SSR must not fetch.'); };
globalThis.createImageBitmap = () => { io++; throw Error('Popup SSR must not decode.'); };
after(() => {
  globalThis.fetch = previousFetch;
  if (previousBitmap === undefined) delete globalThis.createImageBitmap; else globalThis.createImageBitmap = previousBitmap;
  assert.equal(io, 0); assert.equal(requests, 0); assert.equal(refs, 0);
});

test('two distinct source factories keep their exact outer panels and accessible native dialog roles', () => {
  const a = join(), b = ping();
  assert.match(a, /data-play-popup="join_by_code"/); assert.match(a, /width:400px;height:180px/);
  assert.match(b, /data-play-popup="high_ping_warning"/); assert.match(b, /width:500px;height:340px/);
  for (const html of [a, b]) {
    assert.equal((html.match(/role="dialog"/g) ?? []).length, 1);
    assert.match(html, /aria-modal="true"/); assert.match(html, /aria-labelledby=/); assert.match(html, /aria-describedby=/);
    assert.match(html, /data-native-certified="false"/); assert.doesNotMatch(html, /mc-dialog|<form|<iframe|<canvas|<script/);
  }
});

test('literal accepted code is controlled, untrimmed and HTML-escaped; the real input limit is15', () => {
  const html = join({ value: ' 0<中文>&01 ' });
  const input = html.match(/<input [^>]*>/)?.[0]; assert.ok(input);
  assert.match(input, /type="text"/); assert.match(input, /maxLength="15"/); assert.match(input, /value=" 0&lt;中文&gt;&amp;01 "/);
  assert.match(input, /placeholder="Code here"/); assert.match(input, /font-family:var\(--mc-font-unicode/);
  assert.doesNotMatch(input, /pattern=|inputMode="numeric"/);
  assert.match(html, /<label[^>]*for="[^"]+"[^>]*>Invitation code<\/label>/);
});

test('the source input enabled flag is independent of code contents and Join availability', () => {
  const html = join({ bindings: { inputEnabled: false }, value: '' });
  assert.match(html.match(/<input [^>]*>/)?.[0] ?? '', /disabled=""/);
  const button = html.match(/<button [^>]*data-play-popup-action="join"[^>]*>/)?.[0]; assert.ok(button); assert.doesNotMatch(button, /disabled=/);
});

test('readonly prevents code edits and joining, while preserving Close and HighPing Cancel', () => {
  const a = join({ readOnly: true }), b = ping({ readOnly: true });
  assert.match(a.match(/<input [^>]*>/)?.[0] ?? '', /readOnly=""/);
  for (const html of [a, b]) {
    assert.match(html.match(/<button [^>]*data-play-popup-action="join"[^>]*>/)?.[0] ?? '', /disabled=""/);
    assert.doesNotMatch(html.match(/<button [^>]*data-play-popup-action="close"[^>]*>/)?.[0] ?? '', /disabled=/);
  }
  assert.doesNotMatch(b.match(/<button [^>]*data-play-popup-action="cancel"[^>]*>/)?.[0] ?? '', /disabled=/);
});

test('whole disabled factory retains real focusable-control nodes but disables semantic action inputs', () => {
  for (const html of [join({ disabled: true }), ping({ disabled: true })]) {
    for (const button of html.match(/<button [^>]*>/g) ?? []) assert.match(button, /disabled=""/);
  }
});

test('controlled open/hidden/inert are finite Web visibility contracts and retain native node markup', () => {
  for (const props of [{ open: false }, { hidden: true }, { inert: true }]) for (const render of [join, ping]) {
    const html = render(props); assert.match(html, /^<div[^>]*hidden=""/); assert.doesNotMatch(html, /aria-modal="true"/);
    assert.match(html, /role="dialog"/);
  }
});

test('the HighPing close binding hides only its close button, without changing ordered Join/Cancel actions', () => {
  const html = ping({ bindings: { closeVisible: false } });
  assert.match(html.match(/<button [^>]*data-play-popup-action="close"[^>]*>/)?.[0] ?? '', /hidden=""/);
  assert.ok(html.indexOf('data-play-popup-action="join"') < html.indexOf('data-play-popup-action="cancel"'));
  assert.match(html, /Ping_Yellow_Dark\.png|data:image\/png/);
});

test('input native overrides, classes, styles and label IDs reach the actual input; refs remain dormant in SSR', () => {
  const html = join({ inputRef() { refs++; }, closeRef() { refs++; }, joinRef() { refs++; }, inputProps: { id: 'caller-code', name: 'invite', className: 'caller-input', style: { letterSpacing: '2px' }, 'aria-describedby': 'host-help', 'data-caller': 'yes' } });
  const input = html.match(/<input [^>]*>/)?.[0] ?? '';
  assert.match(input, /id="caller-code"/); assert.match(input, /class="[^"]*caller-input/); assert.match(input, /letter-spacing:2px/);
  assert.match(input, /name="invite"/); assert.match(input, /data-caller="yes"/); assert.match(input, /aria-describedby="host-help"/);
  assert.match(html, /for="caller-code"/);
  assert.doesNotThrow(() => join({ inputProps: { disabled: undefined, readOnly: undefined }, closeProps: { hidden: undefined }, joinProps: { inert: undefined } }));
});

test('source request/ref callbacks never execute in SSR, including closed, readonly and disabled branches', () => {
  const onAction = () => { requests++; }, onClose = () => { requests++; }, onValueChange = () => { requests++; };
  for (const props of [{}, { open: false }, { disabled: true }, { readOnly: true }]) { join({ ...props, onAction, onClose, onValueChange }); ping({ ...props, onAction, onClose }); }
});

test('optional gamepad helpers are a host renderer, with no invented default glyph or service frame', () => {
  assert.doesNotMatch(join(), /mc-play-popup__gamepad-helpers/);
  const html = join({ gamepadHelpers: createElement('span', { 'data-host-helper': 'true' }, 'A / B') });
  assert.match(html, /mc-play-popup__gamepad-helpers/); assert.match(html, /data-host-helper="true"/);
});

test('all known source labels are copied and checked before the first glyph callback, even while inactive', () => {
  for (const render of [join, ping]) {
    let glyphs = 0;
    assert.throws(() => render({ open: false, labels: { ...(render === join ? joinLabels : pingLabels), [render === join ? 'help' : 'line2']: null }, renderText() { glyphs++; return null; } }), TypeError);
    assert.equal(glyphs, 0);
  }
});

test('scales remain explicit and preserve fixed source panel dimensions', () => {
  assert.match(join({ scale: 1 }), /width:200px;height:90px/);
  assert.match(ping({ scale: 3 }), /width:750px;height:510px/);
  assert.match(join(), /--mc-play-popup-font-scale:1/);
  assert.match(ping({ scale: 3 }), /--mc-play-popup-font-scale:1\.5/);
});

test('invalid source declarations reject synchronously without IO or glyph callbacks', () => {
  const cases = [{ open: undefined }, { scale: 0 }, { scale: 1.5 }, { scale: Infinity }, { scale: 1000 }, { disabled: 1 }, { inert: 'true' }, { renderText: 3 }, { onClose: 'close' }, { children: 'replace' }, { dangerouslySetInnerHTML: { __html: 'replace' } }];
  for (const render of [join, ping]) for (const props of cases) assert.throws(() => render(props), error => error instanceof TypeError || error instanceof RangeError);
  for (const props of [{ value: 12 }, { bindings: {} }, { bindings: { inputEnabled: 1 } }, { inputProps: { value: 'override' } }, { inputProps: { maxLength: 30 } }, { inputProps: { dangerouslySetInnerHTML: {} } }, { fontMode: 'invented' }]) assert.throws(() => join(props), error => error instanceof TypeError || error instanceof RangeError);
  for (const props of [{ bindings: {} }, { bindings: { closeVisible: 1 } }, { onAction: 'join' }]) assert.throws(() => ping(props), TypeError);
});

test('source popup CSS keeps full planes, source percentages, no browser scrollbar and scoped generic-control resets', () => {
  const css = fs.readFileSync(new URL('../src/play-popups.css', import.meta.url), 'utf8');
  assert.match(css, /mc-play-popup\{[^}]*overflow:hidden/); assert.match(css, /mc-play-popup__panel\{[^}]*overflow:hidden/);
  assert.match(css, /join-header\{[^}]*height:21%/); assert.match(css, /join-upper\{[^}]*height:22%/);
  assert.match(css, /modal-backdrop\{[^}]*opacity:\.5/); assert.match(css, /factory-backdrop\{[^}]*opacity:\.6/);
  assert.match(css, /underfill\{[^}]*opacity:\.8/); assert.doesNotMatch(css, /overflow(?:-y)?:\s*(?:auto|scroll)/);
  assert.match(css, /font-size:calc\(var\(--mc-play-font-size,var\(--mc-font-size,18px\)\) \* var\(--mc-play-popup-font-scale,1\)\)/);
  assert.match(css, /mc-play-popup__button\.mc-button::before\{display:none;content:none/);
  assert.match(css, /mc-play-popup__button\.mc-button>\.mc-button__label\{transform:none/);
});
