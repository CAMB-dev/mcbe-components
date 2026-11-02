import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const cache = new URL('../.cache/resource-pack-items-implementation-20261102-01/', import.meta.url); await mkdir(cache, { recursive: true });
const entry = fileURLToPath(new URL('../src/resource-pack-items.tsx', import.meta.url)), target = new URL(`source-${process.pid}.mjs`, cache);
const result = await build({ entryPoints: [entry], platform: 'node', format: 'esm', bundle: true, write: false, jsx: 'automatic', target: 'es2022', external: ['react', 'react/jsx-runtime', 'react-dom'], define: { 'import.meta.url': JSON.stringify(pathToFileURL(entry).href) } }); await writeFile(target, result.outputFiles[0].contents);
const ui = await import(target.href), { ResourcePackItem, ResourcePackActions, ResourcePackDiagnostics, validateResourcePackItemProps, validateResourcePackActionsProps } = ui;
const identity = () => ({ profile: 'host-source-profile', collection: 'host-current-collection', id: 'host-pack', index: 5, payload: { opaque: 'host-owned' } });
const labels = () => ({ select: 'Select host pack', readMore: 'Read host more', readLess: 'Read host less', remove: 'Remove host pack', add: 'Add host pack', store: 'Host store', options: 'Host options', up: 'Host up', down: 'Host down', report: 'Host report', loading: 'Host generating', actions: 'Host pack actions' });
const targets = () => ({ select: 'button.select_host', readToggle: 'button.read_host', moveLeft: 'button.move_left_host', store: 'button.store_host', sortUp: 'button.up_host', sortDown: 'button.down_host', reportErrors: 'button.report_host', packSettings: 'button.settings_host', deselect: 'button.deselect_host' });
const diag = () => ({ collection: 'host-selected-collection-even-for-available', hasErrors: false, hasWarnings: false, hasExpired: false, errorFree: false, reportGenerating: false, errorCount: '007', warningCount: '0002', errorsText: 'Host errors', warningsText: 'Host warnings', expiredText: 'Host expired', loadingFrame: 4 });
const bindings = () => ({ directionVisible: true, isUsingGamepad: false, isSelected: true, platformLocked: false, canMove: true, canGoToStore: true, canSortUp: true, canSortDown: true, hasPackSettings: true, reportButtonVisible: true, reportGenerating: false });
const actions = (kind = 'selected') => ({ kind, identity: identity(), width: 240, scale: 2, bindings: bindings(), labels: labels(), targets: targets(), diagnostics: diag(), lowMemoryDevice: true });
const item = (kind = 'selected') => ({ kind, identity: identity(), width: 242, scale: 2, icon: null, text: { name: 'Host pack name', size: 'Raw host size', description: 'Host description' }, bindings: { isSelected: false, isReadMore: true, isReadLess: false, usingEllipses: true, directionVisible: false }, layout: { mainHeight: 44, contentHeight: 42, expandedTextHeight: 80, fileSizeWidth: 40, readButtonHeight: 12, invalidErrorHeight: 21 }, diagnostics: diag(), labels: labels(), targets: targets(), lowMemoryDevice: true });
const render = (C, p) => renderToStaticMarkup(React.createElement(C, { key: 'actual-key', ref: () => {}, ...p }));
const buttons = html => [...html.matchAll(/<button\b[^>]*>/g)].map(match => match[0]);

test('all five source collection kinds remain distinct from row isSelected and true absent dynamic icon', () => {
  for (const kind of ['selected', 'available', 'realms', 'unowned', 'invalid']) for (const isSelected of [false, true]) {
    const p = item(kind); p.bindings.isSelected = isSelected; const html = render(ResourcePackItem, p);
    assert.ok(html.includes(`data-pack-kind="${kind}"`)); assert.ok(html.includes(`data-row-selected="${isSelected}"`));
    assert.equal((html.match(/data-pack-action="select"/g) || []).length, 1); assert.ok(!html.includes('mc-card'));
    const select = /<button\b[^>]*data-pack-action="select"[^>]*>([\s\S]*?)<\/button>/.exec(html);
    assert.ok(select, 'Actual row selection hitbox');
    assert.equal(select[1], '', 'The accessible selection name must not paint a duplicate caption over source text');
    assert.ok(select[0].includes(`aria-label="${p.labels.select}"`));
    assert.ok(!html.includes('src="host-pack')); assert.ok(!html.includes('placeholder') && !html.includes('<svg'));
    assert.equal(html.includes('mc-rp-item__active'), kind === 'selected');
  }
});
test('outer natural height uses explicit main extent plus authored pads/tray/divider, with50 only a lower bound', () => {
  const p = item(); p.layout.mainHeight = 100; p.layout.contentHeight = 96;
  assert.equal(validateResourcePackItemProps(p).outerHeight, 107);
  p.bindings.directionVisible = true; p.bindings.isSelected = true; p.actions = actions(); assert.equal(validateResourcePackItemProps(p).outerHeight, 130);
  assert.match(render(ResourcePackItem, p), /width:480px;height:260px;min-height:100px/);
  const invalid = item('invalid'); invalid.bindings.directionVisible = true; assert.equal(validateResourcePackItemProps(invalid).outerHeight, 51); assert.ok(!render(ResourcePackItem, invalid).includes('mc-resource-pack-actions'));
});
test('main and cm content extents are independent and preserve default+2 versus hover without a generic shifted press', () => {
  const p = item(); p.layout.mainHeight = 50; p.layout.contentHeight = 80; const html = render(ResourcePackItem, p);
  assert.match(html, /mc-rp-item__visual--default[^>]*height:164px;top:-32px/); assert.match(html, /mc-rp-item__visual--hover[^>]*height:160px;top:-30px/);
  assert.ok(!html.includes('box-shadow')); assert.ok(html.includes('data-intrinsic-policy="host-main-and-content-extents"'));
});
test('read-more parent flag and ellipsis view flag are conjoined, while read-less is independent', () => {
  for (const isReadMore of [false, true]) for (const isReadLess of [false, true]) for (const usingEllipses of [false, true]) {
    const p = item('available'); Object.assign(p.bindings, { isReadMore, isReadLess, usingEllipses }); const html = render(ResourcePackItem, p);
    const reads = buttons(html).filter(tag => tag.includes('data-pack-action="read-toggle"'));
    assert.equal(reads.length, +(isReadMore && usingEllipses) + +isReadLess);
    assert.equal(html.includes('aria-label="Read host more"'), isReadMore && usingEllipses); assert.equal(html.includes('aria-label="Read host less"'), isReadLess);
    assert.ok(!/<button\b[^>]*>[^]*?<button\b/.test(html.slice(html.indexOf('mc-rp-item__select'), html.indexOf('mc-rp-item__visual'))));
  }
});
test('every independent diagnostic icon combination is retained in source order and loading uses an explicit frozen UV frame', () => {
  for (let bits = 0; bits < 16; bits++) {
    const d = diag(); Object.assign(d, { hasErrors: !!(bits & 1), hasWarnings: !!(bits & 2), errorFree: !!(bits & 4), reportGenerating: !!(bits & 8) });
    const html = render(ResourcePackDiagnostics, { variant: 'icons', data: d, width: 16, scale: 3, lowMemoryDevice: true, loadingLabel: 'Generating source report' });
    assert.equal((html.match(/data-diagnostic=/g) || []).length, [1, 2, 4, 8].filter(mask => bits & mask).length);
    for (const [name, bit] of [['error', 1], ['warning', 2], ['success', 4], ['generating', 8]]) assert.equal(html.includes(`data-diagnostic="${name}"`), !!(bits & bit));
    if (bits & 8) { assert.ok(html.includes('data-frame="4"')); assert.ok(html.includes('width:480px;height:24px;left:-192px')); }
  }
});
test('warning/error/expired lines and literal string counts coexist, without normalizing a severity or the selected-wrapper collection', () => {
  const d = { ...diag(), hasErrors: true, hasWarnings: true, hasExpired: true, errorFree: true, reportGenerating: true };
  const html = render(ResourcePackDiagnostics, { variant: 'selected-lines', data: d, width: 120, scale: 2, lowMemoryDevice: false, loadingLabel: 'Loading' });
  for (const value of ['0002', '007', 'Host expired', '#has_warnings', '#has_errors', '#has_expired']) assert.ok(html.includes(value));
  assert.match(html, /width:240px;height:60px/); assert.ok(html.includes('1.39-and-y-2-if-not-low-memory'));
  const invalid = render(ResourcePackDiagnostics, { variant: 'invalid-line', data: d, width: 120, scale: 2, lowMemoryDevice: true, loadingLabel: 'Load', invalidErrorHeight: 21 });
  assert.ok(!invalid.includes('Host warnings') && !invalid.includes('Host expired')); assert.ok(invalid.includes('height:42px'));
});
test('selected source tray computes all six fixed/fill slots and next-sibling-dependent padding', () => {
  const p = actions(), plan = validateResourcePackActionsProps(p); assert.equal(plan.height, 24);
  assert.deepEqual(plan.slots.map(s => [s.slot, s.key, s.x, s.width, s.height]), [[0, 'move', 0, 82, 18], [1, 'store', 84, 70, 18], [2, 'options', 156, 18, 14], [3, 'up', 176, 18, 18], [4, 'down', 196, 18, 18], [5, 'report', 216, 16, 16]]);
  p.bindings.canMove = false; const next = validateResourcePackActionsProps(p); assert.equal(next.slots.find(s => s.key === 'store').x, 2);
  const html = render(ResourcePackActions, p); assert.equal(buttons(html).length, 5); assert.ok(html.includes('height:48px'));
});
test('available/realms keep add action distinct from remove despite sharing the original move-left target', () => {
  for (const kind of ['available', 'realms']) {
    const p = actions(kind); p.bindings.isSelected = false; p.bindings.platformLocked = false; const html = render(ResourcePackActions, p), tags = buttons(html);
    const add = tags.find(tag => tag.includes('data-pack-action="add"')), store = tags.find(tag => tag.includes('data-pack-action="store"'));
    assert.ok(add && !add.includes('disabled=""')); assert.ok(store?.includes('disabled=""')); assert.ok(add.includes('button.move_left_host'));
    assert.ok(!html.includes('data-pack-action="remove"') && !html.includes('data-pack-action="options"'));
    p.bindings.platformLocked = true; assert.ok(buttons(render(ResourcePackActions, p)).find(tag => tag.includes('data-pack-action="add"')).includes('disabled=""'));
  }
});
test('unowned retains its empty slot0 and leading next-slot padding, invalid has no source action tray', () => {
  const p = actions('unowned'), plan = validateResourcePackActionsProps(p); assert.deepEqual(plan.slots.map(s => [s.slot, s.action, s.x, s.width]), [[1, 'store', 2, 230]]);
  assert.equal(buttons(render(ResourcePackActions, p)).length, 1); const invalid = render(ResourcePackActions, actions('invalid')); assert.equal(buttons(invalid).length, 0); assert.match(invalid, /hidden=""/);
});
test('report enabled uses the current collection generating flag while glyphs keep their explicit selected-collection snapshot', () => {
  const p = actions('available'); p.diagnostics = { ...diag(), reportGenerating: true, hasWarnings: true }; p.bindings.reportGenerating = false;
  const html = render(ResourcePackActions, p), report = buttons(html).find(tag => tag.includes('data-pack-action="report"'));
  assert.ok(report && !report.includes('disabled=""')); assert.ok(html.includes('data-diagnostic="generating"')); assert.ok(html.includes('data-source-warning-binding="$selected_pack_items"')); assert.ok(html.includes('data-resolved-warning-collection="host-selected-collection-even-for-available"'));
  p.bindings.reportGenerating = true; assert.ok(buttons(render(ResourcePackActions, p)).find(tag => tag.includes('data-pack-action="report"')).includes('disabled=""'));
});
test('tray visibility and gamepad modal flag are independent; no global dialog, portal or lock is invented', () => {
  for (const directionVisible of [false, true]) for (const isUsingGamepad of [false, true]) {
    const p = actions(); Object.assign(p.bindings, { directionVisible, isUsingGamepad }); const html = render(ResourcePackActions, p);
    assert.equal(html.includes('hidden=""'), !directionVisible); assert.ok(html.includes(`data-source-modal="${isUsingGamepad}"`));
    assert.ok(!html.includes('<dialog') && !html.includes('aria-modal') && !html.includes('role="dialog"'));
  }
});
test('options hover art retains both actual originals and diagnostic display dimensions are not natural PNG dimensions', () => {
  const html = render(ResourcePackActions, actions()); assert.ok(html.includes('data-source-wrapper="resource_packs.options_wrapper"'));
  const options = /<span class="mc-rp-options"[^>]*>([\s\S]*?)<span class="mc-rp-vertical-divider"/.exec(html)?.[1]; assert.ok(options);
  assert.equal((options.match(/<img\b/g) || []).length, 2); assert.ok(options.includes('mc-rp-hover')); assert.ok(options.includes('width:28px;height:28px'));
  const d = render(ResourcePackDiagnostics, { variant: 'icons', data: { ...diag(), hasErrors: true, hasWarnings: true, errorFree: true }, width: 16, scale: 2, lowMemoryDevice: true, loadingLabel: 'Load' });
  for (const dimensions of ['width:18px;height:28px', 'width:22px;height:32px', 'width:28px;height:24px', 'width:32px;height:28px']) assert.ok(d.includes(dimensions));
});
test('native button props and refs are scoped, readonly overlays guard actions without changing source flags', () => {
  const p = actions(); p.buttonProps = { store: { name: 'native-store', 'aria-describedby': 'native-description', 'data-host': 'kept' } }; p.readOnly = true;
  const html = render(ResourcePackActions, p), tags = buttons(html); assert.ok(tags.every(tag => tag.includes('disabled=""')));
  assert.equal(tags.filter(tag => tag.includes('aria-describedby="native-description"')).length, 1); assert.ok(tags.find(tag => tag.includes('name="native-store"')).includes('data-host="kept"'));
  assert.ok(html.includes('data-source-modal="false"'));
});
test('pure preflight rejects malformed source bindings and unresolved intrinsic values, even before a hidden renderer', () => {
  for (const patch of [{ icon: undefined }, { scale: 1.5 }, { text: { name: 'n', size: 1, description: 'd' } }, { layout: { ...item().layout, expandedTextHeight: NaN } }, { diagnostics: { ...diag(), errorCount: 7 } }]) assert.throws(() => validateResourcePackItemProps({ ...item(), ...patch }));
  const p = item(); p.bindings.directionVisible = true; assert.throws(() => validateResourcePackItemProps(p), /explicit action bindings/);
  p.actions = actions(); assert.throws(() => validateResourcePackItemProps(p), /Repeated row/);
  assert.throws(() => validateResourcePackActionsProps({ ...actions(), width: 30 }), /cannot contain/);
  assert.throws(() => render(ResourcePackDiagnostics, { variant: 'invalid-line', data: diag(), width: 120, scale: 2, lowMemoryDevice: true, loadingLabel: 'Load' }), /invalidErrorHeight/);
});
test('actual React19 keyed SSR keeps cleanup refs and host intent callbacks inert with zero browser/clock services', () => {
  const oldError = console.error, warnings = [], originals = new Map(); let refs = 0, calls = 0;
  for (const key of ['fetch', 'Image', 'FontFace', 'createImageBitmap', 'OffscreenCanvas', 'XMLHttpRequest', 'ResizeObserver', 'MutationObserver', 'requestAnimationFrame', 'setTimeout', 'setInterval']) { originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: () => { throw Error(`SSR touched ${key}`); } }); }
  console.error = (...args) => warnings.push(args);
  try { const p = item(); p.bindings.directionVisible = true; p.bindings.isSelected = true; p.actions = actions(); renderToStaticMarkup(React.createElement(ResourcePackItem, { ...p, key: 'actual-key19', ref: () => { refs++; return () => { refs++; }; }, onAction: () => { calls++; } })); } finally { console.error = oldError; for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } }
  assert.equal(refs, 0); assert.equal(calls, 0); assert.deepEqual(warnings, []);
});
test('existing actual React18 peer keyed SSR renders all public parts without callback/ref activity', async t => {
  const packageFile = new URL('../.cache/consumer-react18/package.json', import.meta.url); let require; try { await readFile(packageFile, 'utf8'); require = createRequire(packageFile); } catch { t.skip('Actual peer18 consumer absent; installation is owned by package gate.'); return; }
  const R = require('react'), server = require('react-dom/server'); assert.match(R.version, /^18\./);
  const built = await build({ entryPoints: [entry], platform: 'node', format: 'cjs', bundle: true, write: false, target: 'es2022', jsx: 'automatic', define: { 'import.meta.url': JSON.stringify(pathToFileURL(entry).href) }, plugins: [{ name: 'existing-peer18', setup(b) { b.onResolve({ filter: /^(react(?:\/jsx-runtime)?|react-dom)$/ }, args => ({ path: require.resolve(args.path), external: true })); } }] });
  const output = new URL(`peer18-${process.pid}.cjs`, cache); await writeFile(output, built.outputFiles[0].contents); const peers = require(fileURLToPath(output)), oldError = console.error, warnings = []; let refs = 0; console.error = (...args) => warnings.push(args);
  try { for (const [name, props] of [['ResourcePackItem', item()], ['ResourcePackActions', actions()], ['ResourcePackDiagnostics', { variant: 'icons', data: diag(), width: 16, scale: 2, lowMemoryDevice: true, loadingLabel: 'Load' }]]) assert.ok(server.renderToStaticMarkup(R.createElement(peers[name], { ...props, key: 'actual18', ref: () => { refs++; } })).includes('resource-pack')); } finally { console.error = oldError; }
  assert.equal(refs, 0); assert.deepEqual(warnings, []);
});
test('source stylesheet contains only the finite source paint profile and no tooltip/commented popup or generic green card', async () => {
  const css = await readFile(new URL('../src/resource-pack-items.css', import.meta.url), 'utf8'); assert.ok(!css.includes('linear-gradient') && !css.includes('text-decoration:underline') && !css.includes('box-shadow:0'));
  for (const value of ['42px * var(--mc-rp-scale)', 'rgb(80% 70% 0%)', 'rgb(57% 29% 67%)', 'opacity:.4', 'opacity:.1', 'rgb(21.5% 83.9% 11.8%)']) assert.ok(css.includes(value));
  const html = render(ResourcePackItem, item()); assert.ok(!html.includes('role="tooltip"') && !html.includes('role="dialog"'));
  const sourceName = '../.cache/resource-packs-source-20261102-01/original/resource_pack/ui/ui_template_buttons.json';
  const sourceText = await readFile(new URL(sourceName, import.meta.url), 'utf8'), parsed = ts.parseConfigFileTextToJson(sourceName, sourceText); assert.equal(parsed.error, undefined);
  const content = parsed.config.new_ui_button_panel.controls.find(control => 'button_content' in control).button_content;
  assert.deepEqual(content['$button_content_size|default'], ['100% - 6px', '100% - 6px']);
  const textBox = /\.mc-rp-button__movement-text\{([^}]+)\}/.exec(css)?.[1]; assert.ok(textBox); assert.ok(textBox.includes('inset:calc(3px * var(--mc-rp-scale))'));
  const labelBox = /\.mc-rp-button__movement-label\{([^}]+)\}/.exec(css)?.[1]; assert.ok(labelBox?.includes('max-width:100%')); assert.ok(labelBox.includes('height:calc(10px * var(--mc-rp-scale))'));
  const pressed = /\.mc-rp-action--store:active:not\(:disabled\) \.mc-rp-button__movement-text\{([^}]+)\}/.exec(css)?.[1]; assert.ok(pressed?.includes('transform:translateY(calc(1px * var(--mc-rp-scale)))')); assert.ok(!/(?:^|;)(?:top|height):/.test(pressed));
  const long = actions(); long.labels.remove = 'Host localized movement label '.repeat(20); assert.ok(render(ResourcePackActions, long).includes(`<span class="mc-rp-button__movement-label">${long.labels.remove}</span>`));
});
