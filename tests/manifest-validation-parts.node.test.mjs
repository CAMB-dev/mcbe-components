import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const cache = new URL('../.cache/manifest-validation-parts-20261102-01/', import.meta.url); await mkdir(cache, { recursive: true });
const entry = fileURLToPath(new URL('../src/manifest-validation-parts.tsx', import.meta.url)), target = new URL(`source-${process.pid}.mjs`, cache);
const built = await build({ entryPoints: [entry], platform: 'node', format: 'esm', bundle: true, write: false, target: 'es2022', jsx: 'automatic', external: ['react', 'react/jsx-runtime', 'react-dom'], define: { 'import.meta.url': JSON.stringify(pathToFileURL(entry).href) } }); await writeFile(target, built.outputFiles[0].contents);
const ui = await import(target.href), { ManifestValidationButton: Button, ManifestPackSummary: Summary, ManifestValidationIssue: Issue, ManifestValidationIssues: Issues, ManifestValidationContent: Content, planManifestValidationButton: buttonPlan, planManifestPackSummary: summaryPlan, planManifestValidationIssue: issuePlan, planManifestValidationIssues: issuesPlan, planManifestValidationContent: contentPlan } = ui;
const identity = () => ({ runKey: 'host-run-1', packId: 'host-pack-id', payload: { original: 'opaque-pack' } });
const state = () => ({ isWorking: false, isDeleting: false, isDoneValidating: true });
const issueIdentity = () => ({ id: 'host-issue', index: 0, collection: 'pack_errors', payload: { original: 'opaque-issue' } });
const button = variant => ({ identity: identity(), state: state(), label: `Host ${variant} label`, scale: 2, loadingFrame: 4, variant, ...(variant === 'copy' ? { issue: issueIdentity() } : variant.endsWith('-text') ? { width: 80 } : {}) });
const summaryData = () => ({ icon: null, text: { title: 'Host pack title', size: '00123 host bytes', description: 'Host raw description', id: 'Host raw pack UUID', version: '01.002.0003', path: 'Host caller file path' }, labels: { id: 'Host ID label', version: 'Host version label', path: 'Host location label', refresh: 'Refresh host manifest', delete: 'Delete host manifest' }, visibility: { size: true, refresh: true, delete: true }, layout: { summaryHeight: 130, panelHeight: 132, metadataHeight: 72, metadataRowHeights: [20, 21, 22], metadataLabelWidths: [30, 40, 50], packSizeWidth: 45 } });
const summary = () => ({ width: 336, scale: 2, identity: identity(), state: state(), data: summaryData(), lowMemoryDevice: true, loadingFrame: 4 });
const issueData = index => ({ id: `host-issue-${index}`, index, type: `Host issue type ${index}`, content: `Host issue text ${index}`, layout: { issueHeight: 75 + index, headerHeight: 29, bodyHeight: 30 }, payload: { index } });
const issue = () => ({ width: 336, scale: 2, identity: identity(), state: state(), entry: issueData(0), hasErrorsOrWarnings: true, issueLabel: 'Host issue prefix', copyLabel: 'Copy host issue', lowMemoryDevice: true, loadingFrame: 4 });
const issues = () => { const { entry: _entry, ...shared } = issue(); return { ...shared, entries: [issueData(0), issueData(1)], capacity: 2 }; };
const content = () => ({ size: [354, 240], scale: 2, inputMode: 'mouse', scrollLabel: 'Host validation content', identity: identity(), state: state(), summary: summaryData(), entries: [issueData(0), issueData(1)], capacity: 2, hasErrorsOrWarnings: true, errorListLabel: 'Host error list', errorListHeaderHeight: 18, issueLabel: 'Host issue prefix', copyLabel: 'Copy host issue', lowMemoryDevice: true, loadingFrame: 4 });
const render = (C, props) => renderToStaticMarkup(React.createElement(C, { key: 'actual-ssr-key', ref: () => {}, ...props }));
const buttons = html => [...html.matchAll(/<button\b[^>]*>/g)].map(match => match[0]);

test('five source variants retain their real dimensions, controls and native button type', () => {
  for (const [variant, width, height, sourceControl, action] of [['copy', 25, 25, 'clipboard_button', 'copy_to_clipboard'], ['delete-icon', 30, 30, 'delete_button', 'delete_manifest'], ['refresh-icon', 30, 30, 'refresh_button', 'refresh_manifest'], ['delete-text', 80, 20, 'delete_text_button', 'delete_manifest'], ['refresh-text', 80, 20, 'refresh_text_button', 'refresh_manifest']]) {
    const p = button(variant), html = render(Button, p), native = buttons(html)[0]; assert.match(native, /type="button"/); assert.ok(native.includes(`width:${width * 2}px;height:${height * 2}px`)); assert.ok(native.includes(`manifest_validation.${sourceControl}`)); assert.ok(native.includes(`button.${action}`)); assert.equal(buttonPlan(p).width, width);
  }
});
test('working, deleting and done-validating remain independent, with loaders limited to icon variants', () => {
  for (let bits = 0; bits < 8; bits++) for (const variant of ['copy', 'delete-icon', 'refresh-icon', 'delete-text', 'refresh-text']) {
    const p = button(variant); Object.assign(p.state, { isWorking: !!(bits & 1), isDeleting: !!(bits & 2), isDoneValidating: !!(bits & 4) }); const html = render(Button, p);
    assert.equal(buttons(html)[0].includes('disabled=""'), p.state.isWorking);
    assert.equal(html.includes('class="mc-manifest-validation-button__loading"'), variant === 'delete-icon' ? p.state.isDeleting : variant === 'refresh-icon' ? !p.state.isDoneValidating : false);
    if (html.includes('data-frame=')) assert.ok(html.includes('data-frame="4"') && html.includes('width:320px;height:16px;left:-128px'));
  }
});
test('plain icon display dimensions retain physical image provenance without being replaced by glyph-color tints', () => {
  for (const [variant, width, height] of [['copy', 13, 14], ['delete-icon', 11, 12], ['refresh-icon', 18, 14]]) {
    const html = render(Button, button(variant)); assert.ok(html.includes(`width:${width * 2}px;height:${height * 2}px`)); assert.ok(html.includes('mc-manifest-validation-button__icon-wrapper'));
    assert.ok(!html.includes('opacity:0.3') && !html.includes('brightness(0.3)'));
  }
});
test('native caller attributes remain on the actual action button while source type and enabled guard are owned', () => {
  const html = render(Button, { ...button('copy'), name: 'host-copy', 'aria-describedby': 'host-description', 'data-host': 'kept', type: 'submit' }), tag = buttons(html)[0];
  assert.match(tag, /name="host-copy"/); assert.match(tag, /aria-describedby="host-description"/); assert.match(tag, /data-host="kept"/); assert.match(tag, /type="button"/);
  for (const prop of ['disabled', 'readOnly']) assert.match(buttons(render(Button, { ...button('copy'), [prop]: true }))[0], /disabled=""/);
});
test('summary respects its W−4 instance, independent panel budgets and fixed50 header without a false vertical sum', () => {
  const p = summary(); p.data.layout.summaryHeight = 55; p.data.layout.panelHeight = 200; p.data.layout.metadataHeight = 90;
  const plan = summaryPlan(p); assert.equal(plan.width, 332); assert.equal(plan.height, 55); assert.equal(plan.panelHeight, 200); assert.equal(plan.metadataY, 110);
  const html = render(Summary, p); assert.ok(html.includes('width:672px;height:110px')); assert.ok(html.includes('width:664px;height:110px')); assert.ok(html.includes('data-source-type="panel"')); assert.ok(html.includes('top:220px'));
});
test('summary default content uses only two text actions with independently supplied size/refresh/delete visibility snapshots', () => {
  for (const refresh of [false, true]) for (const remove of [false, true]) for (const size of [false, true]) {
    const p = summary(); Object.assign(p.data.visibility, { refresh, delete: remove, size }); const html = render(Summary, p), tags = buttons(html);
    assert.equal(tags.length, 2); assert.ok(tags.some(tag => tag.includes('data-manifest-variant="refresh-text"'))); assert.ok(tags.some(tag => tag.includes('data-manifest-variant="delete-text"')));
    assert.ok(!html.includes('data-manifest-variant="refresh-icon"') && !html.includes('data-manifest-variant="delete-icon"') && !html.includes('data-frame='));
    assert.ok(html.includes(`data-source-once-binding="#refresh_visible"${refresh ? '' : ''}`));
    const refreshWrapper = /<div[^>]*data-source-once-binding="#refresh_visible"[^>]*>/.exec(html)?.[0]; assert.equal(refreshWrapper?.includes('hidden=""'), !refresh);
    const deleteWrapper = /<div[^>]*data-source-once-binding="#delete_visible"[^>]*>/.exec(html)?.[0]; assert.equal(deleteWrapper?.includes('hidden=""'), !remove);
  }
});
test('summary has actual id/version/path values, caller row/label budgets and true absent pack icon', () => {
  const p = summary(), html = render(Summary, p); for (const value of Object.values(p.data.text)) assert.ok(html.includes(value));
  for (const field of ['id', 'version', 'path']) assert.ok(html.includes(`data-manifest-field="${field}"`)); assert.ok(!html.includes('<img'));
  p.data.icon = { src: 'https://host.invalid/original-pack-icon.png', sourceSize: [128, 128], alt: 'Host actual pack' }; const withIcon = render(Summary, p); assert.ok(withIcon.includes('width:88px;height:88px')); assert.ok(withIcon.includes('src="https://host.invalid/original-pack-icon.png"'));
});
test('global errors-or-warnings flag independently hides copy/divider/body while preserving each type header', () => {
  for (const hasErrorsOrWarnings of [false, true]) {
    const p = issue(); p.hasErrorsOrWarnings = hasErrorsOrWarnings; p.entry.type = 'Host provider arbitrary type, no severity enum'; const html = render(Issue, p);
    assert.ok(html.includes(p.entry.type)); assert.equal(/class="mc-manifest-validation-issue__copy" hidden=""/.test(html), !hasErrorsOrWarnings);
    assert.equal(issuePlan(p).panelHeight, 29 + (hasErrorsOrWarnings ? 31 : 0) + 8); assert.ok(!html.includes('file_label') && !html.includes('file_error'));
  }
});
test('issue copy right-middle offsets use the explicit header height, not a guessed fixed27-unit header', () => {
  const p = issue(); p.entry.layout.headerHeight = 10; const plan = issuePlan(p); assert.equal(plan.copyX, 301); assert.equal(plan.copyY, -5.5);
  const html = render(Issue, p); assert.ok(html.includes('left:602px;top:-11px')); assert.ok(html.includes('width:50px;height:50px'));
});
test('issues are a complete ordered vertical factory with explicit capacity and distinct index/ID identities', () => {
  const p = issues(), plan = issuesPlan(p), html = render(Issues, { ...p, id: 'one-native-owner', 'data-host': 'kept' }); assert.equal(plan.height, 151); assert.equal(plan.capacity, 2);
  assert.match(html, /data-source-factory="pack_error_factory"/); assert.match(html, /data-source-capacity="2"/); assert.ok(html.includes('data-collection-index="0"') && html.includes('data-collection-index="1"'));
  assert.equal((html.match(/id="one-native-owner"/g) || []).length, 1); assert.ok(!html.includes('grid-template-columns'));
});
test('content exactly preserves the mouse354→350→349→340→336 chain and touch349→345, with full-height y0 scroll', () => {
  for (const [inputMode, viewport, stack, innerSummary] of [['mouse', 340, 336, 332], ['touch', 349, 345, 341]]) {
    const p = content(); p.inputMode = inputMode; const plan = contentPlan(p); assert.deepEqual(plan.outer, { x: 2, y: 0, width: 350, height: 240 }); assert.equal(plan.paneWidth, 349); assert.equal(plan.viewportWidth, viewport); assert.equal(plan.stackWidth, stack); assert.equal(plan.summary.width, innerSummary);
    const html = render(Content, p); assert.ok(html.includes('left:4px;top:0;width:700px;height:480px')); assert.ok(html.includes(`width:${stack * 2}px`));
  }
});
test('zero factory capacity retains the declared summary/error-list header without fabricating an empty-state message or spinner', () => {
  const p = content(); p.entries = []; p.capacity = 0; p.hasErrorsOrWarnings = false; p.state.isWorking = true; const html = render(Content, p);
  assert.ok(html.includes('Host error list')); assert.ok(html.includes('data-source-capacity="0"')); assert.equal(buttons(html).length, 2); assert.ok(!html.includes('data-frame=') && !html.includes('No issues'));
});
test('finite preflight rejects missing copy identity, malformed flags and unresolved budgets even in hidden/zero-row states', () => {
  for (const patch of [{ issue: undefined }, { issue: { ...issueIdentity(), collection: 'other' } }, { loadingFrame: 10 }, { scale: 1.5 }, { state: { ...state(), isWorking: 0 } }]) assert.throws(() => buttonPlan({ ...button('copy'), ...patch }));
  assert.throws(() => buttonPlan({ ...button('delete-icon'), width: 30 }));
  for (const patch of [{ icon: undefined }, { layout: { ...summaryData().layout, metadataRowHeights: new Array(3) } }, { layout: { ...summaryData().layout, panelHeight: NaN } }]) assert.throws(() => summaryPlan({ ...summary(), data: { ...summaryData(), ...patch } }));
  const p = content(); p.entries = []; p.capacity = 0; p.hasErrorsOrWarnings = undefined; assert.throws(() => contentPlan(p), /hasErrorsOrWarnings/);
});
test('capacity validation rejects sparse, truncated, duplicate-ID and reordered provider snapshots before any render', () => {
  const p = issues(); for (const entries of [[], new Array(2), [issueData(0), issueData(0)], [issueData(1), issueData(0)]]) assert.throws(() => issuesPlan({ ...p, entries, hidden: true }));
  assert.throws(() => issuesPlan({ ...p, capacity: 1 })); assert.throws(() => contentPlan({ ...content(), size: new Array(2) }));
});
test('source typography/geometry roles keep explicit1.1/1.2 factors, prefix30×10, field offsets and source-only glyph tint', async () => {
  const css = await readFile(new URL('../src/manifest-validation-parts.css', import.meta.url), 'utf8');
  for (const source of ['* 1.1 / 2', '* 1.2 / 2', 'calc(30px * var(--mc-manifest-scale))', 'top:calc(1px * var(--mc-manifest-scale))', 'top:calc(2px * var(--mc-manifest-scale))', 'opacity:.4']) assert.ok(css.includes(source));
  const iconRule = /\.mc-manifest-validation-button__icon-wrapper>\.mc-image\{([^}]+)\}/.exec(css)?.[1]; assert.ok(iconRule?.includes('filter:none')); assert.ok(!css.includes('glyph-color') && !css.includes('linear-gradient'));
  assert.ok(css.includes('transform:translateY(calc(1px * var(--mc-manifest-scale)))'));
});
test('fixed primary source remains byte-identical with31 definitions and commented file UI absent from the live implementation', async () => {
  const source = await readFile(new URL('../.cache/manifest-validation-source-20261102-01/manifest_validation_screen.json', import.meta.url)); assert.equal(source.length, 35591); assert.equal(createHash('sha256').update(source).digest('hex'), '0bf65eb9846e9d0d7abbf38b21b84c5098e1ccf1788ce20271bd25a7c13f1ecc');
  const html = render(Content, content()); assert.ok(!html.includes('file_label') && !html.includes('file_error') && !html.includes('severity='));
});
test('actual React19 keyed SSR leaves refs/actions inert and never touches browser, network, clipboard or clock services', () => {
  const oldError = console.error, warnings = [], descriptors = new Map(); let calls = 0, refs = 0;
  for (const key of ['fetch', 'Image', 'FontFace', 'createImageBitmap', 'OffscreenCanvas', 'XMLHttpRequest', 'ResizeObserver', 'MutationObserver', 'requestAnimationFrame', 'setTimeout', 'setInterval']) { descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: () => { throw Error(`Unexpected SSR ${key}`); } }); }
  console.error = (...args) => warnings.push(args);
  try { renderToStaticMarkup(React.createElement(Content, { ...content(), key: 'actual-key19', ref: () => { refs++; return () => { refs++; }; }, viewportRef: () => { refs++; }, onAction: () => { calls++; } })); } finally { console.error = oldError; for (const [key, descriptor] of descriptors) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } }
  assert.equal(refs, 0); assert.equal(calls, 0); assert.deepEqual(warnings, []);
});
test('existing actual React18 peer renders all five real public parts with keys/refs and no warnings or side-effect callbacks', async t => {
  const peerFile = new URL('../.cache/consumer-react18/package.json', import.meta.url); let require; try { await readFile(peerFile); require = createRequire(peerFile); } catch { t.skip('Existing React18 consumer missing; peer installs belong to root package gate.'); return; }
  const R = require('react'), server = require('react-dom/server'); assert.match(R.version, /^18\./);
  const out = await build({ entryPoints: [entry], platform: 'node', format: 'cjs', bundle: true, write: false, target: 'es2022', jsx: 'automatic', define: { 'import.meta.url': JSON.stringify(pathToFileURL(entry).href) }, plugins: [{ name: 'actual-peer18', setup(b) { b.onResolve({ filter: /^(react(?:\/jsx-runtime)?|react-dom)$/ }, args => ({ path: require.resolve(args.path), external: true })); } }] }); const peerTarget = new URL(`peer18-${process.pid}.cjs`, cache); await writeFile(peerTarget, out.outputFiles[0].contents); const peer = require(fileURLToPath(peerTarget)), warnings = [], oldError = console.error; let callbacks = 0; console.error = (...args) => warnings.push(args);
  try { for (const [name, props] of [['ManifestValidationButton', button('copy')], ['ManifestPackSummary', summary()], ['ManifestValidationIssue', issue()], ['ManifestValidationIssues', issues()], ['ManifestValidationContent', content()]]) { const html = server.renderToStaticMarkup(R.createElement(peer[name], { ...props, key: 'actual-peer18-key', ref: () => { callbacks++; }, onAction: () => { callbacks++; } })); assert.ok(html.includes('manifest')); } } finally { console.error = oldError; }
  assert.equal(callbacks, 0); assert.deepEqual(warnings, []);
});
