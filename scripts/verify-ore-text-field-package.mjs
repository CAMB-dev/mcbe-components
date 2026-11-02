import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const typed = `import {createRef} from 'react';
import {OreTextField,OreFieldSection} from 'mcbeui';
import type {OreTextFieldSkins,OreTextFieldProps,OreFieldSectionProps} from 'mcbeui';
const skins:OreTextFieldSkins={normal:'/host/normal.png',disabled:'/host/disabled.png'};
const input:OreTextFieldProps={skins,type:'text',value:'00001x',guiScale:2,locale:'zh-CN',invalid:true,invalidMessage:<span>Host validation</span>,className:'native-input',style:{letterSpacing:'1px'},name:'raw-port',inputMode:'numeric',onChange:event=>{const node:HTMLInputElement=event.currentTarget;node.value.toUpperCase();},onSelect:event=>{const node:HTMLInputElement=event.currentTarget;void node.selectionStart;},onCompositionEnd:event=>{const node:HTMLInputElement=event.currentTarget;void node.value;},wrapperRef:createRef<HTMLDivElement>(),wrapperProps:{className:'host-wrapper',id:'host-wrapper','data-host-wrapper':true,style:{width:300},onClick:event=>{const wrapper:HTMLDivElement=event.currentTarget;void wrapper;}}};
const section:OreFieldSectionProps={label:<b>Host label</b>,description:<span>Host description</span>,guiScale:1.5,locale:'ja-JP',sectionProps:{id:'host-section',className:'host-section','data-host-section':'yes',style:{width:400},onFocus:event=>{const node:HTMLDivElement=event.currentTarget;void node; }},children:<button type="button">Arbitrary host child</button>};
export const positive=<><OreFieldSection {...section} ref={createRef<HTMLDivElement>()}/><OreFieldSection label="Nested host label"><OreTextField {...input} ref={createRef<HTMLInputElement>()}/><span>Arbitrary sibling</span></OreFieldSection><OreTextField skins={skins} defaultValue="001-2" maxLength={128} pattern=".*" autoComplete="off" key="standalone"/></>;
// @ts-expect-error Both complete caller-owned skins are required.
const noSkins:OreTextFieldProps={value:'raw'};
// @ts-expect-error Disabled source skin is independently required.
const incomplete:OreTextFieldSkins={normal:'/normal.png'};
// @ts-expect-error Literal input values are strings, not parsed port numbers.
const number:OreTextFieldProps={skins,value:19132};
// @ts-expect-error This finite component owns a text input.
const numeric:OreTextFieldProps={skins,type:'number'};
// @ts-expect-error Locale is a caller-resolved string.
const locale:OreTextFieldProps={skins,locale:1};
// @ts-expect-error Native class/style are not an extra input props bag.
const bag:OreTextFieldProps={skins,inputProps:{name:'port'}};
// @ts-expect-error A source field has no Classic port/name discriminator.
const classic:OreTextFieldProps={skins,kind:'port'};
// @ts-expect-error The forwarded ref addresses the actual input.
const badInputRef=<OreTextField skins={skins} ref={createRef<HTMLDivElement>()}/>;
// @ts-expect-error The independent wrapper ref addresses a div.
const badWrapperRef=<OreTextField skins={skins} wrapperRef={createRef<HTMLSpanElement>()}/>;
// @ts-expect-error Section forwards a real div.
const badSectionRef=<OreFieldSection {...section} ref={createRef<HTMLSpanElement>()}/>;
// @ts-expect-error The wrapper cannot inject a second children owner.
const wrapperChildren:OreTextFieldProps={skins,wrapperProps:{children:'unsafe'}};
// @ts-expect-error Section requires explicit arbitrary child content.
const noChildren:OreFieldSectionProps={label:'Host label'};
// @ts-expect-error Context remains a private implementation detail.
import {OreFieldContext} from 'mcbeui';
void[noSkins,incomplete,number,numeric,locale,bag,classic,badInputRef,badWrapperRef,badSectionRef,wrapperChildren,noChildren];
`;

async function installedWorker() {
  const assert = (await import('node:assert/strict')).default;
  const fs = await import('node:fs/promises'), path = (await import('node:path')).default;
  const { createRequire } = await import('node:module'), { pathToFileURL } = await import('node:url'), { createHash } = await import('node:crypto');
  const config = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
  const req = createRequire(path.join(config.consumer, 'package.json')), hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const React = req('react'), ssr = req('react-dom/server').renderToStaticMarkup;
  assert.equal(Number(React.version.split('.')[0]), config.major);
  assert.equal(req('react-dom/package.json').version, React.version);
  assert.equal(Number(req('@types/react/package.json').version.split('.')[0]), config.major);
  const installed = path.join(config.consumer, 'node_modules/mcbeui');
  const manifest = JSON.parse(await fs.readFile(path.join(installed, 'package.json'), 'utf8'));
  const index = await fs.readFile(path.join(installed, 'dist/index.js')), declaration = await fs.readFile(path.join(installed, 'dist/index.d.ts'));
  assert.deepEqual(index, await fs.readFile(path.join(config.root, 'dist/index.js')));
  assert.deepEqual(declaration, await fs.readFile(path.join(config.root, 'dist/index.d.ts')));
  const warnings = [], attempts = [], checks = [], saved = new Map();
  const oldError = console.error, oldWarn = console.warn;
  let callbacks = 0, refs = 0, ui;
  const callback = () => { callbacks++; throw Error('SSR callback'); }, ref = () => { refs++; throw Error('SSR ref'); };
  const skins = { normal: '/host/whole-ore-normal.png', disabled: '/host/whole-ore-disabled.png' };
  const check = (name, run) => { try { run(); checks.push(name); } catch (error) { error.message = '[' + name + '] ' + error.message; throw error; } };
  const attr = (tag, name) => new RegExp('(?:^|\\s)' + name + '="([^"]*)"(?=\\s|/?>)', 'i').exec(tag)?.[1];
  const inputTag = html => { const tag = html.match(/<input\b[^>]*>/i)?.[0]; assert(tag, 'Actual native input'); return tag; };
  const textNodeId = (html, text) => {
    const result = [...html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>([^<]*)<\//gi)]
      .find(match => match[3] === text && attr(match[2], 'id') !== undefined);
    assert(result, 'Associated visible text node: ' + text); return attr(result[2], 'id');
  };
  console.error = (...args) => warnings.push(args.map(String).join(' ')); console.warn = console.error;
  for (const name of ['fetch', 'Image', 'FontFace', 'createImageBitmap', 'OffscreenCanvas', 'XMLHttpRequest', 'requestAnimationFrame', 'setTimeout', 'setInterval']) {
    saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, value() { attempts.push(name); throw Error('SSR service ' + name); } });
  }
  try {
    // Import the installed ESM with browser services already denied: module
    // evaluation itself is included in this finite CPU-side no-I/O contract.
    ui = await import(pathToFileURL(path.join(installed, 'dist/index.js')).href);
    for (const name of ['OreTextField', 'OreFieldSection']) assert.equal(ui[name].$$typeof, Symbol.for('react.forward_ref'));
    for (const name of ['OreFieldContext', 'SectionContext', 'Section', 'appearance', 'ids', 'boolean', 'oreTextFieldSkins', 'oreTextFieldAssets', 'validateOreTextField', 'skinURL']) assert(!Object.hasOwn(ui, name), 'Private export ' + name);
    const render = (patch = {}) => ssr(React.createElement(ui.OreTextField, { key: 'installed-ore-field', ref, skins, defaultValue: '00001x', 'aria-label': 'Host text', onChange: callback, wrapperRef: ref, ...patch }));
    check('literal-native-input-with-separate-host-wrapper-and-zero-default-classic-limits', () => {
      const html = render({ id: 'native-id', className: 'native-only', style: { letterSpacing: '2px' }, wrapperProps: { id: 'wrapper-id', className: 'wrapper-only', 'data-wrapper': 'host' } });
      const tag = inputTag(html), wrapper = html.match(/^<div\b[^>]*>/)?.[0]; assert(wrapper);
      assert.equal(attr(tag, 'type'), 'text'); assert.equal(attr(tag, 'value'), '00001x'); assert.equal(attr(tag, 'id'), 'native-id');
      assert.equal(attr(wrapper, 'id'), 'wrapper-id'); assert(attr(tag, 'class').includes('native-only')); assert(!attr(wrapper, 'class').includes('native-only'));
      assert(attr(wrapper, 'class').includes('wrapper-only')); assert(!attr(tag, 'class').includes('wrapper-only'));
      assert.equal(attr(tag, 'style'), 'letter-spacing:2px'); assert.equal(attr(wrapper, 'data-wrapper'), 'host');
      for (const property of ['maxlength', 'minlength', 'min', 'max', 'pattern', 'inputmode']) assert.equal(attr(tag, property), undefined, 'No unsolicited native restriction ' + property);
      assert(!/<canvas|<iframe|<script|<img\b/.test(html));
      for (const property of ['skins', 'guiScale', 'locale', 'wrapperProps', 'wrapperRef', 'invalidMessage']) assert.equal(attr(tag, property), undefined, 'No API prop leak ' + property);
      assert(html.includes('/host/whole-ore-normal.png')); assert(html.includes('/host/whole-ore-disabled.png'));
    });
    check('native-overrides-literal-unicode-and-readonly-disabled', () => {
      const html = render({ defaultValue: '００1-2x', maxLength: 99, inputMode: 'decimal', pattern: '.*', name: 'raw-port', autoComplete: 'off', readOnly: true, disabled: true });
      const tag = inputTag(html);
      for (const [name, value] of Object.entries({ value: '００1-2x', maxlength: '99', inputmode: 'decimal', pattern: '.*', name: 'raw-port', autocomplete: 'off', readonly: '', disabled: '' })) assert.equal(attr(tag, name), value);
    });
    check('controlled-source-text-remains-a-string-without-ssr-callbacks', () => {
      const tag = inputTag(render({ defaultValue: undefined, value: '<raw & 00001x>' }));
      assert.equal(attr(tag, 'value'), '&lt;raw &amp; 00001x&gt;');
    });
    check('section-context-merges-host-identifiers-and-feedback-without-replacing-input-id', () => {
      const html = ssr(React.createElement(ui.OreFieldSection, { key: 'installed-section', ref, label: 'Section label', description: 'Section description', guiScale: 2, locale: 'zh-CN',
        sectionProps: { id: 'section-id', className: 'section-only', 'data-section': 'host' } },
      React.createElement(ui.OreTextField, { ref, wrapperRef: ref, skins, id: 'unchanged-input', defaultValue: '001x', invalid: true, invalidMessage: 'Host rejection',
        'aria-labelledby': 'host-label host-label', 'aria-describedby': 'host-description host-description', onChange: callback }),
      React.createElement('button', { type: 'button' }, 'Arbitrary host child')));
      const tag = inputTag(html), label = textNodeId(html, 'Section label'), description = textNodeId(html, 'Section description'), feedback = textNodeId(html, 'Host rejection');
      assert.equal(attr(tag, 'id'), 'unchanged-input'); assert.equal(attr(tag, 'aria-invalid'), 'true');
      const names = attr(tag, 'aria-labelledby').split(/\s+/), descriptions = attr(tag, 'aria-describedby').split(/\s+/);
      assert.deepEqual(new Set(names), new Set(['host-label', label])); assert.equal(names.length, 2);
      assert.deepEqual(new Set(descriptions), new Set(['host-description', description, feedback])); assert.equal(descriptions.length, 3);
      assert(html.includes('Arbitrary host child')); assert(html.includes('section-only')); assert(html.includes('--mc-ore-unit:10px'));
      assert(html.includes('Noto Sans SC')); assert(!html.includes('role="alert"')); assert(!html.includes('aria-live='));
    });
    check('host-validation-preserves-declared-aria-and-does-not-invent-a-default-error', () => {
      const normal = render({ 'aria-invalid': 'spelling', invalidMessage: 'Inactive host message' });
      assert.equal(attr(inputTag(normal), 'aria-invalid'), 'spelling'); assert(!normal.includes('Inactive host message'));
      assert.equal(attr(inputTag(render({ invalid: true })), 'aria-invalid'), 'true');
    });
    check('direct-host-aria-label-keeps-name-ownership-with-section-description', () => {
      const html = ssr(React.createElement(ui.OreFieldSection, { label: 'Context label', description: 'Context description' },
        React.createElement(ui.OreTextField, { skins, 'aria-label': 'Direct host label', defaultValue: 'Body', onChange: callback })));
      const tag = inputTag(html);
      assert.equal(attr(tag, 'aria-label'), 'Direct host label'); assert.equal(attr(tag, 'aria-labelledby'), undefined);
      assert.equal(attr(tag, 'aria-describedby'), textNodeId(html, 'Context description'));
    });
    check('locale-and-section-profile-inherit-and-explicit-field-profile-overrides', () => {
      const html = ssr(React.createElement(ui.OreFieldSection, { label: 'Outer', guiScale: 2, locale: 'ja-JP' },
        React.createElement(ui.OreTextField, { skins, defaultValue: 'A', onChange: callback }),
        React.createElement(ui.OreTextField, { skins, defaultValue: 'B', onChange: callback, guiScale: .5, locale: 'ko-KR' })));
      assert(html.includes('--mc-ore-unit:10px')); assert(html.includes('--mc-ore-unit:2.5px')); assert(html.includes('Noto Sans JP')); assert(html.includes('Noto Sans KR'));
    });
    const invalid = [{ skins: undefined }, { skins: null }, { skins: [] }, { skins: { normal: '/normal.png' } }, { skins: { ...skins, normal: ' ' } },
      { skins: { ...skins, disabled: 'x\u0000y' } }, { skins: { ...skins, normal: 'x'.repeat(8193) } }, { type: 'number' }, { value: 19132 }, { defaultValue: 19132 },
      { guiScale: 0 }, { guiScale: NaN }, { guiScale: 2000 }, { locale: 1 }, { invalid: 1 }, { disabled: 1 }, { readOnly: 1 }, { 'aria-labelledby': 1 }, { 'aria-describedby': 1 }];
    invalid.forEach((patch, i) => check('invalid-field-declaration-' + i, () => assert.throws(() => render(patch), error => error instanceof TypeError || error instanceof RangeError)));
    for (const patch of [{ guiScale: 0 }, { guiScale: Infinity }, { locale: 1 }]) check('invalid-section-' + Object.keys(patch)[0] + '-' + String(Object.values(patch)[0]), () =>
      assert.throws(() => ssr(React.createElement(ui.OreFieldSection, { label: 'Host label', ...patch }, 'Host child')), error => error instanceof TypeError || error instanceof RangeError));
    assert.equal(callbacks, 0); assert.equal(refs, 0); assert.deepEqual(attempts, []); assert.deepEqual(warnings, []);
  } finally {
    console.error = oldError; console.warn = oldWarn;
    for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  }

  const styles = {};
  async function css(file) {
    if (styles[file]) return;
    assert(!path.isAbsolute(file) && !file.startsWith('..'));
    const bytes = await fs.readFile(path.join(installed, 'dist', file));
    assert.deepEqual(bytes, await fs.readFile(path.join(config.root, 'src', file))); styles[file] = hash(bytes);
    for (const match of bytes.toString().matchAll(/@import\s+['"]([^'"]+[.]css)['"]/g)) await css(path.normalize(path.join(path.dirname(file), match[1])));
  }
  assert.equal(manifest.exports['./ore-text-field.css'], './dist/ore-text-field.css'); await css('ore-text-field.css');
  const sourceCSS = await fs.readFile(path.join(installed, 'dist/ore-text-field.css'), 'utf8');
  const unified = await fs.readFile(path.join(installed, 'dist/styles.css'), 'utf8');
  assert(/@import\s+['"][^'"]*ore-text-field[.]css['"]/.test(unified), 'Unified styles reach the field stylesheet');
  const clean = sourceCSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = selector => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const body = new RegExp('(?:^|[}\\s])' + escaped + '\\s*\\{([^}]*)\\}').exec(clean)?.[1];
    assert(body, 'CSS rule ' + selector); return body;
  };
  const declarationValue = (body, name) => new RegExp('(?:^|;)\\s*' + name + '\\s*:\\s*([^;}]*)').exec(body)?.[1];
  const units = value => { assert.equal(typeof value, 'string', 'Declared source-unit property'); return [...value.matchAll(/calc\(\s*([.0-9]+)\s*\*\s*var\(--mc-ore-unit\)\s*\)/g)].map(match => Number(match[1])); };
  const skin = rule('.mc-ore-text-field__skin');
  assert.equal(declarationValue(skin, 'border-image-slice')?.trim().replace(/\s+/g, ' '), '3 1 1 1 fill');
  assert.deepEqual(units(declarationValue(skin, 'border-image-width')), [.6, .2, .2, .2]);
  assert(declarationValue(skin, 'border-image-source')?.includes('--mc-ore-text-field-normal'));
  assert(clean.includes('border-image-source:var(--mc-ore-text-field-disabled)'));
  const sectionCSS = rule('.mc-ore-field-section'); assert.deepEqual(units(declarationValue(sectionCSS, 'padding')), [1.2, 2.4]);
  assert.equal(declarationValue(sectionCSS, 'height'), undefined, 'Natural content section has no invented total height');
  assert.deepEqual(units(declarationValue(rule('.mc-ore-field-section__spacer'), 'height')), [.4]);
  const media = /@media\s*\(\s*forced-colors\s*:\s*active\s*\)\s*\{/.exec(clean); assert(media, 'Forced-colors branch');
  let depth = 1, end = media.index + media[0].length;
  for (; end < clean.length && depth; end++) { if (clean[end] === '{') depth++; else if (clean[end] === '}') depth--; }
  assert.equal(depth, 0); const forced = clean.slice(media.index + media[0].length, end - 1);
  assert(/\.mc-ore-text-field__skin\s*\{[^}]*display\s*:\s*none/.test(forced));
  assert(/background\s*:\s*Field\b/.test(forced)); assert(/outline\s*:[^;}]*Highlight/.test(forced));
  assert(!/url\s*\(|data:|@font-face/i.test(clean), 'No private/default art or fonts in the field CSS');

  const knownPrivate = new Set(config.privateResourceHashes), scanned = { knownPrivateHashes: knownPrivate.size, files: 0, inlineResources: 0 };
  async function scan(directory, prefix = '') {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const relative = path.join(prefix, entry.name), absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) { await scan(absolute, relative); continue; }
      assert(entry.isFile(), 'Packed file must not redirect via symlink: ' + relative);
      const bytes = await fs.readFile(absolute); scanned.files++;
      assert(!knownPrivate.has(hash(bytes)), 'Private resource copied under packed filename ' + relative);
      assert(!/(?:^|[/\\])assets[/\\]ore-text-field(?:[/\\]|$)/.test(relative), 'Host-owned skins must not become a library asset bank');
      if (/[.](?:js|mjs|json|css|html|map|md)$/i.test(relative)) for (const match of bytes.toString().matchAll(/data:[^,\s"'()]+;base64,([A-Za-z0-9+/=]+)/g)) {
        scanned.inlineResources++; assert(!knownPrivate.has(hash(Buffer.from(match[1], 'base64'))), 'Private inline resource in ' + relative);
      }
    }
  }
  await scan(installed);
  const result = { react: React.version, peerTypes: req('@types/react/package.json').version, runtimeValues: Object.keys(ui).length, checks, callbacks, refs, warnings,
    serviceAttempts: attempts, styles, privateResourceScan: scanned, indexSHA256: hash(index), declarationSHA256: hash(declaration),
    sourceTokenContract: { sliceTRBL: [3, 1, 1, 1], fill: true, borderUnitMultipliersTRBL: [.6, .2, .2, .2], sectionPaddingUnitsVH: [1.2, 2.4], sectionSpacersUnits: .4 },
    scope: 'Actual installed peer ESM/SSR/types and source CSS bytes/tokens; host-owned skin URLs only. No browser, native GPU/geometry or pixel-perfect certification.' };
  await fs.writeFile(path.join(config.directory, 'SSR.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
}

/** Existing actual packed consumer only. Never installs, builds or starts UI. */
export async function verifyOreTextFieldPackage({ consumer, root, major, evidenceName = 'ore-text-field-contracts', privateResourceHashes = [] }) {
  assert(major === 18 || major === 19); assert(/^[a-z0-9-]{1,80}$/.test(evidenceName));
  consumer = path.resolve(consumer); root = path.resolve(root);
  const suppliedHashes = [...privateResourceHashes]; assert(suppliedHashes.every(value => typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value)));
  const knownPrivate = [...new Set(suppliedHashes.map(value => value.toLowerCase()))];
  const directory = path.join(consumer, evidenceName); await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'consumer.tsx'), typed);
  await fs.writeFile(path.join(directory, 'worker.mjs'), '(' + installedWorker.toString() + ')().catch(error=>{console.error(error);process.exitCode=1;});');
  await fs.writeFile(path.join(directory, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', lib: ['ES2022', 'DOM', 'DOM.Iterable'],
    module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: true }, include: ['consumer.tsx'] }, null, 2));
  const config = path.join(directory, 'config.json'); await fs.writeFile(config, JSON.stringify({ root, consumer, major, directory, privateResourceHashes: knownPrivate }, null, 2));
  async function run(args, file) {
    try { const output = execFileSync(process.execPath, args, { cwd: consumer, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true }); await fs.writeFile(path.join(directory, file), output); }
    catch (error) { await fs.writeFile(path.join(directory, file), String(error.stdout ?? '') + '\n' + String(error.stderr ?? error.stack)); throw error; }
  }
  await run([path.join(directory, 'worker.mjs'), config], 'SSR.txt');
  await run([path.join(root, 'node_modules/typescript/bin/tsc'), '--project', path.join(directory, 'tsconfig.json')], 'TYPECHECK.txt');
  const result = { ...JSON.parse(await fs.readFile(path.join(directory, 'SSR.json'), 'utf8')), strictTypes: true,
    negativeTypeContracts: (typed.match(/@ts-expect-error/g) ?? []).length, typedFixtureSHA256: createHash('sha256').update(typed).digest('hex'),
    status: 'PASS_INSTALLED_ORE_TEXT_FIELD_ESM_SSR_TYPES_HOST_SKINS_CSS' };
  await fs.writeFile(path.join(directory, 'RESULT.json'), JSON.stringify(result, null, 2));
  console.log(`React ${major}: installed OreTextField ${result.checks.length} SSR / strict types / host skins / source CSS bytes PASS`);
  return result;
}
