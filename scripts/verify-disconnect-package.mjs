import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import {transform} from 'esbuild';

const names = ['DisconnectMessage', 'DisconnectActions', 'DisconnectScreen'];
const variants = ['disconnect', 'realms-disconnect', 'realms-warning'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
// Independent whole fixed-ZIP source identities, not product-generated expected bytes.
const materials = [
  {name: 'bg32.png', bytes: 324, sha256: '76842acb4488a28062ca494d9150a56db94d1555704d66340ef72cd42066d6bb'},
  {name: 'portalBg.png', bytes: 993, sha256: '1d985d815a28be108c2b550e32c12df8d520dfdbd3ca6515255878917e994a90'},
  {name: 'LICENSE.md', bytes: 222, sha256: 'ca18c0dede68ce24ea1cd6f9df0813579b6f9f979787983a50baec99345f975d'},
];
async function dataset(root) {
  const file = 'demo/disconnect-data.ts', raw = await fs.readFile(path.join(root, file));
  const {code} = await transform(raw.toString(), {loader: 'ts', format: 'esm', target: 'es2022'});
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0);
  const functions = new Set(ast.statements.filter(ts.isFunctionDeclaration).map(n => n.name?.text));
  function pure(node) {
    assert(!ts.isImportDeclaration(node) && !(ts.isExportDeclaration(node) && node.moduleSpecifier), 'No runtime dataset imports');
    assert(!ts.isAwaitExpression(node), 'No asynchronous dataset');
    if (ts.isIdentifier(node)) assert(!['window', 'document', 'globalThis', 'fetch', 'process', 'require', 'eval', 'Function', 'Date'].includes(node.text), 'Dataset capability ' + node.text);
    if (ts.isNewExpression(node)) assert(ts.isIdentifier(node.expression) && node.expression.text === 'TypeError', 'Only a pure invalid-variant error');
    if (ts.isCallExpression(node)) assert(ts.isIdentifier(node.expression) && functions.has(node.expression.text), 'Only local pure data functions');
    ts.forEachChild(node, pure);
  }
  pure(ast);
  const factory = (await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))).createDisconnectDemoProps;
  function plain(value) {
    if (value === null || ['string', 'boolean'].includes(typeof value)) return;
    if (typeof value === 'number') {assert(Number.isFinite(value)); return;}
    assert(value && typeof value === 'object' && (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype), 'Plain snapshots only');
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {assert('value' in descriptor, 'No accessors'); plain(descriptor.value);}
  }
  const props = Object.fromEntries(variants.map(variant => [variant, factory(variant)])); plain(props);
  assert.deepEqual(factory(), props.disconnect); assert.notStrictEqual(factory().layout, factory().layout);
  return {props, source: {file, bytes: raw.length, sha256: hash(raw)}};
}
async function publicNames(root) {
  const raw = await fs.readFile(path.join(root, 'src/index.ts')), ast = ts.createSourceFile('index.ts', raw.toString(), ts.ScriptTarget.Latest, true), values = [];
  for (const node of ast.statements) if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.exportClause && ts.isNamedExports(node.exportClause)) for (const item of node.exportClause.elements) if (!item.isTypeOnly) values.push(item.name.text);
  assert.equal(values.length, new Set(values).size); for (const name of names) assert(values.includes(name));
  return values;
}
function typedConsumer(data) {return `import {createRef} from 'react';
import type {ElementRef} from 'react';
import {DisconnectMessage,DisconnectActions,DisconnectScreen} from 'mcbeui';
import type {DisconnectScreenProps,DisconnectLayout,DisconnectActionsModel,DisconnectBackgroundProfile,DisconnectActionDetail,DisconnectControllerHandle,DisconnectButtonId} from 'mcbeui';
const p:DisconnectScreenProps=${JSON.stringify(data.props.disconnect)};
const realm:DisconnectScreenProps=${JSON.stringify(data.props['realms-disconnect'])};
const warning:DisconnectScreenProps=${JSON.stringify(data.props['realms-warning'])};
const controller=createRef<DisconnectControllerHandle>(),div=createRef<HTMLDivElement>(),section=createRef<HTMLElement>(),button=createRef<HTMLButtonElement>();
const action=(detail:DisconnectActionDetail)=>{const id:DisconnectButtonId=detail.buttonId;const uri:'https://aka.ms/MCMultiplayerHelp'|undefined=detail.uri;void [id,uri,detail.variant,detail.source,detail.button,detail.event];};
type Equal<A,B>=(<T>()=>T extends A?1:2)extends(<T>()=>T extends B?1:2)?true:false;type Assert<T extends true>=T;
type MessageRef=Assert<Equal<ElementRef<typeof DisconnectMessage>,HTMLDivElement>>;
type ActionsRef=Assert<Equal<ElementRef<typeof DisconnectActions>,HTMLDivElement>>;
type ScreenRef=Assert<Equal<ElementRef<typeof DisconnectScreen>,HTMLElement>>;
const rendered=<><DisconnectMessage layout={p.layout} title={p.title} body={p.body} ref={div} inert/><DisconnectActions layout={realm.layout} model={realm.actions} ref={div} buttonRefs={{back:button}} onAction={action} inert/><DisconnectScreen {...p} ref={section} controllerRef={controller} onAction={action} inert/><DisconnectScreen {...realm}/><DisconnectScreen {...warning}/></>;
controller.current?.request('button.menu_cancel');
const {contentRect: omittedContentRect, ...withoutContentRect}=p;
// @ts-expect-error source no-safezone background and content rectangle are independent required inputs
const missingContentRect:DisconnectScreenProps=withoutContentRect;
// @ts-expect-error warning requires its actual cancel control
const missingCancel:DisconnectActionsModel={variant:'realms-warning',continue:{label:'Continue',visible:true,enabled:true},store:{label:'Store',visible:true,enabled:true},storeIgnored:false};
// @ts-expect-error ordinary model does not become a realm Back model
const wrongVariant:DisconnectActionsModel={variant:'disconnect',back:{label:'Back',visible:true,enabled:true},openAccount:{label:'Help',visible:false,enabled:true}};
// @ts-expect-error all explicit unresolved-layout Web policies are required
const missingLayout:DisconnectLayout={size:[320,240],scale:1,font:{family:'monospace',size:10,lineHeight:10}};
// @ts-expect-error no implicit/native-certified hidden-slot mode
const wrongPolicy:DisconnectLayout={...p.layout,hiddenSlots:'native'};
// @ts-expect-error background needs its explicit tile phase and rounding
const missingBackground:DisconnectBackgroundProfile={renderer:'css',sampling:'point'};
// @ts-expect-error there is no invented Retry target
const retry:DisconnectButtonId='button.menu_retry';
// @ts-expect-error no physical/backend command beyond the source menu-cancel seam
controller.current?.request('button.menu_continue');
// @ts-expect-error controller ref is not a DOM button ref
const wrongController=<DisconnectScreen {...p} controllerRef={button}/>;
// @ts-expect-error Message forwards a real div
const wrongMessage=<DisconnectMessage layout={p.layout} title={p.title} body={p.body} ref={button}/>;
// @ts-expect-error per-button ref is a real button, not a div
const wrongButton=<DisconnectActions layout={p.layout} model={p.actions} buttonRefs={{ok:div}}/>;
// @ts-expect-error internal geometry/planner is not a public runtime API
import {planDisconnectActions} from 'mcbeui';
void [rendered,omittedContentRect,missingContentRect,missingCancel,wrongVariant,missingLayout,wrongPolicy,missingBackground,retry,wrongController,wrongMessage,wrongButton,planDisconnectActions];
`;}

async function installedWorker() {
  const assert = (await import('node:assert/strict')).default, fs = await import('node:fs/promises'), path = (await import('node:path')).default;
  const {createRequire} = await import('node:module'), {pathToFileURL, fileURLToPath} = await import('node:url'), {createHash} = await import('node:crypto');
  const cfg = JSON.parse(await fs.readFile(process.argv[2], 'utf8')), req = createRequire(path.join(cfg.consumer, 'package.json'));
  const React = req('react'), render = req('react-dom/server').renderToStaticMarkup, digest = value => createHash('sha256').update(value).digest('hex');
  assert.equal(Number(React.version.split('.')[0]), cfg.major); assert.equal(req('react-dom/package.json').version, React.version); assert.equal(Number(req('@types/react/package.json').version.split('.')[0]), cfg.major);
  const installed = path.join(cfg.consumer, 'node_modules/mcbeui'), manifest = JSON.parse(await fs.readFile(path.join(installed, 'package.json'), 'utf8'));
  const index = await fs.readFile(path.join(installed, 'dist/index.js')), declaration = await fs.readFile(path.join(installed, 'dist/index.d.ts'));
  assert.deepEqual(index, await fs.readFile(path.join(cfg.root, 'dist/index.js'))); assert.deepEqual(declaration, await fs.readFile(path.join(cfg.root, 'dist/index.d.ts')));
  assert(!/(?:from|import\s*\()\s*['"](?:node:)?fs(?:\/promises)?['"]/.test(index.toString()), 'No library filesystem import');
  const data = JSON.parse(await fs.readFile(path.join(cfg.directory, 'datasets.json'), 'utf8')), checks = [], warnings = [], attempts = [], saved = new Map(), objectRefs = [];
  let refCalls = 0, callbackCalls = 0, ui; const callback = () => {callbackCalls++; throw Error('Unexpected SSR host callback');};
  const ref = () => {refCalls++; throw Error('Unexpected SSR ref callback');};
  const check = (name, run) => {try {run(); checks.push(name);} catch (error) {error.message = '[' + name + '] ' + error.message; throw error;}};
  const errors = console.error, warns = console.warn; console.error = (...args) => warnings.push(args.map(String).join(' ')); console.warn = console.error;
  for (const name of ['fetch', 'Image', 'FontFace', 'createImageBitmap', 'OffscreenCanvas', 'XMLHttpRequest', 'ResizeObserver', 'MutationObserver', 'requestAnimationFrame', 'setTimeout', 'setInterval']) {
    saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, {configurable: true, value() {attempts.push(name); throw Error('Import/SSR capability ' + name);}});
  }
  const screens = {};
  try {
    ui = await import(pathToFileURL(path.join(installed, 'dist/index.js')).href);
    check('installed-public-namespace-and-private-source-closure', () => {
      assert.deepEqual(Object.keys(ui).sort(), [...cfg.publicNames].sort());
      for (const name of cfg.names) assert.equal(ui[name].$$typeof, Symbol.for('react.forward_ref'));
      for (const name of ['disconnectBackgroundAssets', 'disconnectIntent', 'planDisconnectActions', 'snapshotDisconnectLayout', 'snapshotDisconnectModel', 'validateDisconnectBackground']) assert(!(name in ui), 'Private export ' + name);
    });
    for (const [variant, p] of Object.entries(data.props)) {
      const controller = React.createRef(), screenRef = React.createRef(), messageRef = React.createRef(), actionsRef = React.createRef(); objectRefs.push(controller, screenRef, messageRef, actionsRef);
      const buttonRefs = Object.fromEntries(['ok', 'back', 'continue', 'store', 'open-account', 'cancel'].map(key => {const value = React.createRef(); objectRefs.push(value); return [key, value];}));
      check('message-' + variant, () => {const html = render(React.createElement(ui.DisconnectMessage, {layout: p.layout, title: p.title, body: p.body, ref: messageRef})); assert(html.includes(p.title)); assert(html.includes(p.body)); assert(html.includes('data-source-control="disconnect.disconnect_text"')); assert(html.includes('data-source-control="disconnect.disconnect_title_text"'));});
      check('actions-' + variant, () => {const html = render(React.createElement(ui.DisconnectActions, {layout: p.layout, model: p.actions, ref: actionsRef, buttonRefs, onAction: callback})); assert(html.includes('data-source-variant="' + variant + '"')); assert(!html.includes('href=')); assert.equal((html.match(/data-disconnect-button=/g) ?? []).length, variant === 'disconnect' ? 2 : 3);});
      check('screen-' + variant, () => {const html = render(React.createElement(ui.DisconnectScreen, {...p, ref: screenRef, controllerRef: controller, buttonRefs, onAction: callback})); screens[variant] = html; assert(html.includes('aria-label="' + p.label + '"')); assert(html.includes('data-native-certified="false"')); assert(html.includes('data-background="' + (variant === 'disconnect' ? 'dirt' : 'portal') + '"')); assert(!/<a\b|<iframe\b|<script\b/.test(html));});
      check('callback-refs-and-modal-SSR-' + variant, () => {render(React.createElement(ui.DisconnectScreen, {...p, modal: true, ref, controllerRef: ref, buttonRefs: {ok: ref, back: ref, store: ref, continue: ref, cancel: ref, 'open-account': ref}, onAction: callback}));});
      check('native-inert-attribute-and-visible-background-' + variant, () => {
        const attributes = [
          [ui.DisconnectMessage, {layout:p.layout,title:p.title,body:p.body}],
          [ui.DisconnectActions, {layout:p.layout,model:p.actions}],
          [ui.DisconnectScreen, p],
        ];
        for (const [Component, props] of attributes) {
          const html = render(React.createElement(Component, {...props,inert:true}));
          assert(/\sinert=""/.test(html), 'Both React peers emit the standard inert attribute');
          if (Component === ui.DisconnectScreen) assert(html.includes('data-background='), 'Inert preserves visual background');
        }
      });
    }
    check('GPU-background-SSR-does-not-create-or-decode-a-context', () => {const p = data.props.disconnect; render(React.createElement(ui.DisconnectScreen, {...p, background: {...p.background, renderer: 'gpu'}, ref, controllerRef: ref, onAction: callback}));});
    check('zero-import-SSR-services-callbacks-refs-warnings', () => {for (const ref of objectRefs) assert.equal(ref.current, null); assert.equal(callbackCalls, 0); assert.equal(refCalls, 0); assert.deepEqual(attempts, []); assert.deepEqual(warnings, []);});
  } finally {console.error = errors; console.warn = warns; for (const [name, descriptor] of saved) {if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];}}
  const verifiedMaterials = [];
  for (const expected of cfg.materials) {
    const relative = 'dist/assets/disconnect/' + expected.name, body = await fs.readFile(path.join(installed, relative));
    assert.equal(body.length, expected.bytes); assert.equal(digest(body), expected.sha256); assert.deepEqual(body, await fs.readFile(path.join(cfg.root, 'src/assets/disconnect', expected.name)));
    if (expected.name.endsWith('.png')) {
      assert.equal(body.readUInt32BE(16), 32); assert.equal(body.readUInt32BE(20), 32);
      const variant = expected.name === 'bg32.png' ? 'disconnect' : 'realms-disconnect';
      const decoded = screens[variant].replaceAll('&quot;', '"').replaceAll('&amp;', '&'), match = /background-image:url\("([^"]+)"\)/.exec(decoded);
      assert(match, 'Actual installed component background URL');
      if (match[1].startsWith('data:image/png;base64,')) {
        assert.deepEqual(Buffer.from(match[1].slice('data:image/png;base64,'.length), 'base64'), body, 'Actual installed inline whole original PNG');
      } else {
        assert.equal(fileURLToPath(match[1]), path.join(installed, relative));
      }
    }
    verifiedMaterials.push({...expected, relative});
  }
  assert.equal(manifest.exports['./disconnect.css'], './dist/disconnect.css');
  const css = await fs.readFile(path.join(installed, 'dist/disconnect.css')); assert.deepEqual(css, await fs.readFile(path.join(cfg.root, 'src/disconnect.css')));
  assert(/@import\s+['"]\.\/disconnect\.css['"]/.test(await fs.readFile(path.join(installed, 'dist/styles.css'), 'utf8')), 'Aggregate CSS includes Disconnect');
  for (const match of css.toString().matchAll(/@import\s+['"]([^'"]+)['"]/g)) {assert(!path.isAbsolute(match[1]) && !match[1].includes('..')); assert.deepEqual(await fs.readFile(path.join(installed, 'dist', match[1])), await fs.readFile(path.join(cfg.root, 'src', match[1])));}
  const result = {status: 'PASS_INSTALLED_DISCONNECT_SSR_ASSETS_CSS', react: React.version, peerTypes: req('@types/react/package.json').version,
    runtimeValues: Object.keys(ui).length, checks, callbackCalls, refCalls, nullObjectRefs: objectRefs.length, warnings, attempts,
    materials: verifiedMaterials, cssSHA256: digest(css), indexSHA256: digest(index), declarationSHA256: digest(declaration), datasetSource: data.source,
    scope: 'Actual installed ESM namespace/types/SSR/whole PNGs/LICENSE/CSS. Mounted ref cleanup, native events, GPU rendering and native pixels require separate qualification.'};
  await fs.writeFile(path.join(cfg.directory, 'SSR.json'), JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
}

/** Root first builds and installs a fresh tarball. This helper never installs,
 * builds, starts a browser or substitutes a source alias for the installed API. */
export async function verifyDisconnectPackage({consumer, root, major, evidenceName = 'disconnect-contracts'}) {
  assert(major === 18 || major === 19); assert(/^[a-z0-9-]{1,80}$/.test(evidenceName));
  consumer = path.resolve(consumer); root = path.resolve(root);
  const directory = path.join(consumer, evidenceName); await fs.mkdir(directory, {recursive: false});
  const data = await dataset(root), fixture = typedConsumer(data), values = await publicNames(root);
  const write = (name, value) => fs.writeFile(path.join(directory, name), value, {flag: 'wx'});
  await write('datasets.json', JSON.stringify(data, null, 2) + '\n'); await write('consumer.tsx', fixture);
  await write('tsconfig.json', JSON.stringify({compilerOptions: {target: 'ES2022', lib: ['ES2022', 'DOM', 'DOM.Iterable'], module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: true}, include: ['consumer.tsx']}, null, 2));
  await write('config.json', JSON.stringify({root, consumer, directory, major, names, materials, publicNames: values}));
  await write('worker.mjs', '(' + installedWorker.toString() + ')().catch(error=>{console.error(error);process.exitCode=1;});');
  async function run(args, name) {try {await write(name, execFileSync(process.execPath, args, {cwd: consumer, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, windowsHide: true}));} catch (error) {await write(name, String(error.stdout ?? '') + '\n' + String(error.stderr ?? error.stack)); throw error;}}
  await run([path.join(directory, 'worker.mjs'), path.join(directory, 'config.json')], 'SSR.txt');
  await run([path.join(root, 'node_modules/typescript/bin/tsc'), '--project', path.join(directory, 'tsconfig.json')], 'TYPECHECK.txt');
  const result = {...JSON.parse(await fs.readFile(path.join(directory, 'SSR.json'), 'utf8')), strictTypes: true, negativeTypeContracts: (fixture.match(/@ts-expect-error/g) ?? []).length, typedFixtureSHA256: hash(Buffer.from(fixture)), status: 'PASS_INSTALLED_DISCONNECT_TYPES_SSR_2PNGS_LICENSE_CSS'};
  await write('RESULT.json', JSON.stringify(result, null, 2) + '\n'); return result;
}
