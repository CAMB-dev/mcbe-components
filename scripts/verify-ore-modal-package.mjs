import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const typed = `import {createRef} from 'react';
import type {ElementRef} from 'react';
import {OreModal,OreModalHeader,OreModalContent,OreModalText,OreModalActions,OreButton} from 'mcbeui';
import type {OreModalProps,OreModalDismissDetail,OreModalHeaderProps,OreModalContentProps,OreModalTextProps,OreModalActionsProps} from 'mcbeui';
type Equal<A,B>=(<T>()=>T extends A?1:2) extends (<T>()=>T extends B?1:2)?true:false;
type Assert<T extends true>=T;
type ModalRefContract=Assert<Equal<ElementRef<typeof OreModal>,HTMLDialogElement>>;
type HeaderRefContract=Assert<Equal<ElementRef<typeof OreModalHeader>,HTMLDivElement>>;
type ContentRefContract=Assert<Equal<ElementRef<typeof OreModalContent>,HTMLDivElement>>;
type TextRefContract=Assert<Equal<ElementRef<typeof OreModalText>,HTMLDivElement>>;
type ActionsRefContract=Assert<Equal<ElementRef<typeof OreModalActions>,HTMLDivElement>>;
const modal:OreModalProps={open:true,label:'Host modal',children:'Host content',guiScale:2,locale:'zh-CN',width:300,height:'60%',onDismissRequest:detail=>{const request:OreModalDismissDetail=detail;if(detail.reason==='close'){const owner:HTMLButtonElement=detail.event.currentTarget;void owner;}else if(detail.reason==='native-close'){const closed:Extract<OreModalDismissDetail,{reason:'native-close'}>=detail;const owner:HTMLDialogElement=closed.event.currentTarget;void owner;}else{const owner:HTMLDialogElement=detail.event.currentTarget;void owner;}void request;return false;},initialFocusRef:createRef<HTMLInputElement>(),panelRef:createRef<HTMLDivElement>(),panelProps:{id:'host-panel',className:'host-panel',style:{borderColor:'#111'}},closeOnBackdrop:true,lastInputGamepad:false};
const header:OreModalHeaderProps={children:'Host header',closeLabel:'Dismiss host modal',closeIcon:<span>Host art</span>,hideCloseButton:false,onClose:event=>{const node:HTMLButtonElement=event.currentTarget;void node;},closeButtonProps:{className:'host-close',onClick:event=>{const node:HTMLButtonElement=event.currentTarget;void node;}},closeButtonRef:createRef<HTMLButtonElement>()};
const content:OreModalContentProps={scrollable:true,scrollLabel:'Host scroll content',scrollViewportRef:createRef<HTMLDivElement>(),scrollInputMode:'touch',guiScale:2,locale:'ja-JP',children:<p>Arbitrary host content</p>,className:'host-content'};
const text:OreModalTextProps={center:true,children:<span>Host message</span>,className:'host-text',style:{fontWeight:700}};
const actions:OreModalActionsProps={horizontal:true,children:<><OreButton>One</OreButton><button type="button">Arbitrary native action</button></>};
export const positive=<><OreModal {...modal} ref={createRef<HTMLDialogElement>()}/><OreModalHeader {...header} ref={createRef<HTMLDivElement>()}/><OreModalContent {...content} ref={createRef<HTMLDivElement>()}/><OreModalText {...text} ref={createRef<HTMLDivElement>()}/><OreModalActions {...actions} ref={createRef<HTMLDivElement>()}/></>;
// @ts-expect-error Visibility is a controlled boolean request boundary.
const badOpen:OreModalProps={...modal,open:'true'};
// @ts-expect-error The host must own dismiss requests.
const noHandler:OreModalProps={open:true,label:'Host',children:'Body'};
// @ts-expect-error Native ref points to the actual dialog.
const modalRef=<OreModal {...modal} ref={createRef<HTMLDivElement>()}/>;
// @ts-expect-error Panel ref is independent and addresses a div.
const panelRef:OreModalProps={...modal,panelRef:createRef<HTMLSpanElement>()};
// @ts-expect-error Scrolling belongs to the explicit content primitive.
const shellScroll:OreModalProps={...modal,scrollable:true};
// @ts-expect-error The shell exposes request ownership, not an alternate open setter.
const openChange:OreModalProps={...modal,onOpenChange:()=>{}};
// @ts-expect-error Header forwards its actual div.
const headerRef=<OreModalHeader {...header} ref={createRef<HTMLSpanElement>()}/>;
// @ts-expect-error Close ref points to a real native button.
const closeRef:OreModalHeaderProps={...header,closeButtonRef:createRef<HTMLDivElement>()};
// @ts-expect-error Close button has an owned safe button type.
const closeType:OreModalHeaderProps={...header,closeButtonProps:{type:'submit'}};
// @ts-expect-error Explicit source scroll branches are mouse/touch.
const scrollMode:OreModalContentProps={...content,scrollInputMode:'controller'};
// @ts-expect-error Viewport ref points to a real div.
const viewportRef:OreModalContentProps={...content,scrollViewportRef:createRef<HTMLSpanElement>()};
// @ts-expect-error Text forwards a div, not an SVG element.
const textRef=<OreModalText {...text} ref={createRef<SVGSVGElement>()}/>;
// @ts-expect-error Actions use an explicit boolean orientation.
const horizontal:OreModalActionsProps={...actions,horizontal:'row'};
// @ts-expect-error Appearance locale remains a string.
const locale:OreModalProps={...modal,locale:1};
// @ts-expect-error Dismiss intent is a finite event-owner union.
const reason:OreModalDismissDetail['reason']='delete';
// @ts-expect-error Provider and controller details stay private.
import {OreModalContext} from 'mcbeui';
void[badOpen,noHandler,modalRef,panelRef,shellScroll,openChange,headerRef,closeRef,closeType,scrollMode,viewportRef,textRef,horizontal,locale,reason];
`;

async function installedWorker() {
  const assert = (await import('node:assert/strict')).default;
  const fs = await import('node:fs/promises'), path = (await import('node:path')).default;
  const { createRequire } = await import('node:module'), { pathToFileURL } = await import('node:url'), { createHash } = await import('node:crypto');
  const config = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
  const req = createRequire(path.join(config.consumer, 'package.json')), hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const React = req('react'), ssr = req('react-dom/server').renderToStaticMarkup;
  assert.equal(Number(React.version.split('.')[0]), config.major); assert.equal(req('react-dom/package.json').version, React.version);
  assert.equal(Number(req('@types/react/package.json').version.split('.')[0]), config.major);
  const installed = path.join(config.consumer, 'node_modules/mcbeui'), manifest = JSON.parse(await fs.readFile(path.join(installed, 'package.json'), 'utf8'));
  const index = await fs.readFile(path.join(installed, 'dist/index.js')), declaration = await fs.readFile(path.join(installed, 'dist/index.d.ts'));
  assert.deepEqual(index, await fs.readFile(path.join(config.root, 'dist/index.js'))); assert.deepEqual(declaration, await fs.readFile(path.join(config.root, 'dist/index.d.ts')));
  const warnings = [], attempts = [], checks = [], saved = new Map(), previousError = console.error, previousWarn = console.warn;
  let callbacks = 0, refs = 0, ui;
  const callback = () => { callbacks++; throw Error('SSR host callback'); }, ref = () => { refs++; throw Error('SSR host ref'); };
  const attr = (tag, name) => new RegExp('(?:^|\\s)' + name + '="([^"]*)"(?=\\s|/?>)', 'i').exec(tag)?.[1];
  const tags = (html, tag) => [...html.matchAll(new RegExp('<' + tag + '\\b[^>]*>', 'gi'))].map(match => match[0]);
  const classTag = (html, tag, className) => tags(html, tag).find(node => attr(node, 'class')?.split(/\s+/).includes(className));
  const check = (name, run) => { try { run(); checks.push(name); } catch (error) { error.message = '[' + name + '] ' + error.message; throw error; } };
  console.error = (...args) => warnings.push(args.map(String).join(' ')); console.warn = console.error;
  for (const name of ['fetch', 'Image', 'FontFace', 'createImageBitmap', 'OffscreenCanvas', 'XMLHttpRequest', 'ResizeObserver', 'MutationObserver', 'requestAnimationFrame', 'setTimeout', 'setInterval']) {
    saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, value() { attempts.push(name); throw Error('SSR service ' + name); } });
  }
  try {
    assert.equal(typeof document, 'undefined'); assert.equal(typeof window, 'undefined');
    ui = await import(pathToFileURL(path.join(installed, 'dist/index.js')).href);
    for (const name of ['OreModal', 'OreModalHeader', 'OreModalContent', 'OreModalText', 'OreModalActions']) assert.equal(ui[name].$$typeof, Symbol.for('react.forward_ref'));
    for (const name of ['OreModalContext', 'ModalContext', 'oreModalAppearance', 'OreModalController', 'createOreModalController', 'oreModalAssets']) assert(!Object.hasOwn(ui, name), 'Private export ' + name);
    const closeIcon = React.createElement('span', { 'data-host-close-art': 'true' }, 'Host close art');
    const header = (props = {}) => React.createElement(ui.OreModalHeader, { ref, closeButtonRef: ref, closeIcon, closeLabel: 'Dismiss host modal', ...props }, 'Host heading');
    const content = (props = {}) => React.createElement(ui.OreModalContent, { ref, ...props }, React.createElement(ui.OreModalText, { ref }, 'Host message'));
    const modal = (props = {}, children = [header({ key: 'header' }), content({ key: 'content' }), React.createElement(ui.OreModalActions, { ref, key: 'actions' }, React.createElement('button', { type: 'button', onClick: callback }, 'Host action'))]) =>
      ssr(React.createElement(ui.OreModal, { key: 'actual-modal-key', ref, panelRef: ref, open: true, label: 'Host modal', onDismissRequest: callback, ...props }, children));
    for (const open of [false, true]) check('server-open-intent-has-no-native-dialog-open-or-dom-activity-' + open, () => {
      const html = modal({ open }), dialog = tags(html, 'dialog')[0]; assert(dialog); assert.equal(tags(html, 'dialog').length, 1);
      assert.equal(attr(dialog, 'open'), undefined, 'Only the client effect may enter the native top layer');
      assert.equal(attr(dialog, 'aria-label'), 'Host modal'); assert.equal(attr(dialog, 'data-modal-policy'), 'web-native-dialog');
      assert(html.includes('Host heading')); assert(html.includes('Host message')); assert(html.includes('Host action'));
      assert(!/<canvas|<iframe|<script|<img\b/.test(html));
    });
    check('native-dialog-panel-attributes-and-separate-ref-declarations-retain-caller-scope', () => {
      const html = modal({ id: 'host-dialog', 'aria-labelledby': 'external-modal-heading', 'aria-describedby': 'external-modal-description', className: 'host-dialog',
        width: 300, height: '60%', panelProps: { id: 'host-panel', className: 'host-panel', 'data-host-panel': 'true' } });
      const dialog = tags(html, 'dialog')[0], panel = tags(html, 'div').find(node => attr(node, 'id') === 'host-panel'); assert(panel);
      assert.equal(attr(dialog, 'id'), 'host-dialog'); assert.equal(attr(dialog, 'aria-labelledby'), 'external-modal-heading'); assert.equal(attr(dialog, 'aria-describedby'), 'external-modal-description');
      assert(attr(dialog, 'class').includes('host-dialog')); assert(!attr(dialog, 'class').includes('host-panel')); assert(attr(panel, 'class').includes('host-panel'));
      assert.equal(attr(panel, 'data-host-panel'), 'true'); assert(!attr(dialog, 'style')?.includes('width:300px'));
      assert(attr(panel, 'style').includes('width:300px')); assert(attr(panel, 'style').includes('height:60%'));
    });
    check('source-content-default-clips-and-scrolling-is-an-explicit-content-opt-in', () => {
      const plain = modal(); assert(!classTag(plain, 'div', 'mc-ore-scroll__viewport'));
      assert.equal(attr(classTag(plain, 'div', 'mc-ore-modal-content'), 'data-overflow-policy'), 'web-clip');
      const scrolling = modal({}, [header({ key: 'header' }), content({ key: 'content', scrollable: true, scrollLabel: 'Host modal body', scrollViewportRef: ref, scrollInputMode: 'touch' })]);
      const viewport = classTag(scrolling, 'div', 'mc-ore-scroll__viewport'); assert(viewport); assert.equal(attr(viewport, 'role'), 'region'); assert.equal(attr(viewport, 'aria-label'), 'Host modal body');
      assert.equal(attr(viewport, 'tabindex'), '0'); assert.equal(tags(scrolling, 'div').filter(node => attr(node, 'class')?.split(/\s+/).includes('mc-ore-scroll__viewport')).length, 1);
      assert.equal(attr(classTag(scrolling, 'div', 'mc-ore-modal-content'), 'data-overflow-policy'), 'web-source-scroll-opt-in');
      assert(tags(scrolling, 'button').some(node => attr(node, 'aria-label') === 'Dismiss host modal'), 'Touch scrolling alone does not hide the close control');
    });
    check('host-close-icon-stays-decorative-and-close-control-is-a-real-safe-native-button', () => {
      const html = modal(), button = tags(html, 'button').find(node => attr(node, 'aria-label') === 'Dismiss host modal'); assert(button);
      assert.equal(attr(button, 'type'), 'button'); assert(html.includes('data-host-close-art="true"'));
      assert.equal(attr(classTag(html, 'span', 'mc-ore-modal-header__icon'), 'aria-hidden'), 'true');
      assert(!/<img\b/.test(html), 'No installed close art is substituted for host content');
    });
    check('standalone-header-and-explicit-host-close-callback-do-not-request-dismissal-during-ssr', () => {
      const bare = ssr(React.createElement(ui.OreModalHeader, { ref }, 'Standalone header'));
      assert(bare.includes('Standalone header')); assert.equal(tags(bare, 'button').length, 0);
      const explicit = ssr(header({ onClose: callback, closeButtonProps: { id: 'host-close', className: 'host-close', onClick: callback } }));
      const button = tags(explicit, 'button')[0]; assert(button); assert.equal(attr(button, 'id'), 'host-close'); assert.equal(attr(button, 'type'), 'button'); assert(attr(button, 'class').includes('host-close'));
    });
    check('text-and-actions-keep-arbitrary-content-and-real-div-attributes', () => {
      const text = ssr(React.createElement(ui.OreModalText, { ref, id: 'host-text', className: 'host-text', center: true }, React.createElement('strong', null, 'Arbitrary text')));
      assert.equal(attr(tags(text, 'div')[0], 'id'), 'host-text'); assert(text.includes('<strong>Arbitrary text</strong>'));
      const actions = ssr(React.createElement(ui.OreModalActions, { ref, id: 'host-actions', horizontal: true }, React.createElement('button', { type: 'reset' }, 'Native action'), React.createElement('span', null, 'Arbitrary sibling')));
      assert.equal(attr(tags(actions, 'div')[0], 'id'), 'host-actions'); assert.equal(attr(tags(actions, 'button')[0], 'type'), 'reset'); assert(actions.includes('Arbitrary sibling'));
    });
    for (const patch of [{ lastInputGamepad: true }, { headerHidden: true }]) check('header-source-close-gate-' + Object.keys(patch)[0], () => {
      const children = [header({ key: 'header', ...(patch.headerHidden ? { hideCloseButton: true } : {}) }), content({ key: 'content' })];
      const html = modal(patch.lastInputGamepad ? { lastInputGamepad: true } : {}, children);
      assert.equal(tags(html, 'button').filter(node => attr(node, 'aria-label') === 'Dismiss host modal').length, 0);
      assert.equal(tags(html, 'div').filter(node => attr(node, 'class')?.split(/\s+/).includes('mc-ore-modal-header__slot')).length, 2, 'Close gate preserves source header slots');
    });
    check('appearance-and-action-button-context-inherit-the-host-profile', () => {
      const html = modal({ guiScale: 2, locale: 'zh-CN' }, [header({ key: 'header' }), content({ key: 'content' }),
        React.createElement(ui.OreModalActions, { ref, key: 'actions', horizontal: true }, React.createElement(ui.OreButton, { onClick: callback }, 'Inherited button'))]);
      const text = classTag(html, 'div', 'mc-ore-modal-text'), action = classTag(html, 'button', 'mc-ore-button'); assert(text); assert(action);
      assert(attr(text, 'style').includes('--mc-ore-unit:10px')); assert(attr(text, 'style').includes('Noto Sans SC'));
      assert(attr(action, 'style').includes('--mc-ore-unit:10px')); assert(attr(action, 'style').includes('Noto Sans SC'));
    });
    check('source-text-center-and-actions-orientation-remain-explicit', () => {
      const centered = ssr(React.createElement(ui.OreModalText, { center: true }, 'Centered'));
      const plain = ssr(React.createElement(ui.OreModalText, null, 'Plain'));
      assert.equal(attr(tags(centered, 'div')[0], 'data-center'), 'true'); assert.equal(attr(tags(plain, 'div')[0], 'data-center'), undefined);
      const row = ssr(React.createElement(ui.OreModalActions, { horizontal: true }, 'Row'));
      const column = ssr(React.createElement(ui.OreModalActions, null, 'Column'));
      assert.equal(attr(tags(row, 'div')[0], 'data-horizontal'), 'true'); assert.equal(attr(tags(column, 'div')[0], 'data-horizontal'), undefined);
    });
    const invalidModal = [{ open: 'true' }, { label: '' }, { onDismissRequest: undefined }, { guiScale: 0 }, { locale: 1 },
      { width: 0 }, { height: Infinity }, { width: '' }, { height: 'x'.repeat(513) }, { closeOnBackdrop: 1 }, { lastInputGamepad: 1 }, { scrollInputMode: 'controller' }];
    invalidModal.forEach((patch, i) => check('invalid-modal-' + i, () => assert.throws(() => modal(patch), error => error instanceof TypeError || error instanceof RangeError)));
    for (const [name, patch] of Object.entries({ closeIcon: { closeIcon: undefined }, closeLabel: { closeLabel: '' }, hide: { hideCloseButton: 1 }, gamepad: { lastInputGamepad: 1 } }))
      check('invalid-header-' + name, () => assert.throws(() => modal({}, [header({ key: 'header', ...patch })]), error => error instanceof TypeError || error instanceof RangeError));
    for (const [name, patch] of Object.entries({ mode: { scrollInputMode: 'controller' }, label: { scrollable: true }, flag: { scrollable: 1 }, inactiveLabel: { scrollable: false, scrollLabel: 1 } }))
      check('invalid-content-' + name, () => assert.throws(() => ssr(content(patch)), error => error instanceof TypeError || error instanceof RangeError));
    check('invalid-text-center', () => assert.throws(() => ssr(React.createElement(ui.OreModalText, { center: 1 }, 'Body')), TypeError));
    check('invalid-actions-orientation', () => assert.throws(() => ssr(React.createElement(ui.OreModalActions, { horizontal: 1 }, 'Body')), TypeError));
    assert.equal(callbacks, 0); assert.equal(refs, 0); assert.deepEqual(attempts, []); assert.deepEqual(warnings, []);
  } finally {
    console.error = previousError; console.warn = previousWarn;
    for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  }

  const styles = {};
  async function css(name) {
    if (styles[name]) return; assert(!path.isAbsolute(name) && !name.startsWith('..'));
    const bytes = await fs.readFile(path.join(installed, 'dist', name)); assert.deepEqual(bytes, await fs.readFile(path.join(config.root, 'src', name))); styles[name] = hash(bytes);
    for (const match of bytes.toString().matchAll(/@import\s+['"]([^'"]+[.]css)['"]/g)) await css(path.normalize(path.join(path.dirname(name), match[1])));
  }
  assert.equal(manifest.exports['./ore-modal.css'], './dist/ore-modal.css'); await css('ore-modal.css');
  const unified = await fs.readFile(path.join(installed, 'dist/styles.css'), 'utf8'); assert(/@import\s+['"][^'"]*ore-modal[.]css['"]/.test(unified));
  const sourceCSS = (await fs.readFile(path.join(installed, 'dist/ore-modal.css'), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = selector => { const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); const body = new RegExp('(?:^|[}\\s])' + escaped + '\\s*\\{([^}]*)\\}').exec(sourceCSS)?.[1]; assert(body, 'CSS rule ' + selector); return body; };
  const property = (body, name) => new RegExp('(?:^|;)\\s*' + name + '\\s*:\\s*([^;}]*)').exec(body)?.[1]?.trim();
  const units = value => { assert.equal(typeof value, 'string'); return [...value.matchAll(/calc\(\s*(-?[.0-9]+)\s*\*\s*var\(--mc-ore-unit\)\s*\)/g)].map(match => Number(match[1])); };
  const shell = rule('.mc-ore-modal'), panel = rule('.mc-ore-modal__panel');
  assert.equal(property(shell, 'align-items'), 'center'); assert.equal(property(shell, 'justify-content'), 'center');
  assert.deepEqual(units(property(shell, 'padding')), [1.2]); assert.equal(property(shell, 'overflow'), 'clip');
  assert.equal(property(rule('.mc-ore-modal[open]'), 'display'), 'flex'); assert.equal(property(rule('.mc-ore-modal:not([open])'), 'display'), 'none');
  assert.deepEqual(units(property(panel, 'max-width')), [47.6]); assert.equal(property(panel, 'max-height'), '100%');
  assert.deepEqual(units(property(panel, 'border')), [.2]); assert(property(panel, 'border').includes('#1e1e1f'));
  assert.equal(property(panel, 'overflow'), 'clip');
  const headerCSS = rule('.mc-ore-modal-header'), textCSS = rule('.mc-ore-modal-text'), contentCSS = rule('.mc-ore-modal-content'), actionsCSS = rule('.mc-ore-modal-actions');
  assert.equal(property(headerCSS, 'background'), '#48494a'); assert.equal(property(headerCSS, 'color'), '#fff');
  assert(property(headerCSS, 'font-family').includes('Minecraft Seven v2')); assert.deepEqual(units(property(headerCSS, 'font-size')), [1.6]);
  assert.deepEqual(units(property(headerCSS, 'line-height')), [2]); assert.deepEqual(units(property(headerCSS, 'letter-spacing')), [.04]);
  assert.equal(property(textCSS, 'font-family'), 'var(--mc-ore-fallback)', 'captionLong uses the Noto locale stack rather than Seven');
  assert.deepEqual(units(property(textCSS, 'font-size')), [1.4]); assert.deepEqual(units(property(textCSS, 'line-height')), [2]);
  assert.deepEqual(units(property(textCSS, 'letter-spacing')), [.04]); assert.deepEqual(units(property(textCSS, 'padding')), [1.6]);
  assert.equal(property(rule('.mc-ore-modal-text[data-center]'), 'text-align'), 'center');
  assert.equal(property(contentCSS, 'background'), '#313233'); assert.equal(property(contentCSS, 'color'), '#fff'); assert.equal(property(contentCSS, 'overflow'), 'clip');
  assert.equal(property(actionsCSS, 'background'), '#48494a'); assert.equal(property(actionsCSS, 'flex-direction'), 'column');
  assert.deepEqual(units(property(actionsCSS, 'padding')), [1.6]); assert.deepEqual(units(property(actionsCSS, 'gap')), [.4]);
  assert.equal(property(rule('.mc-ore-modal-actions[data-horizontal]'), 'flex-direction'), 'row');
  assert.deepEqual(units(property(rule('.mc-ore-modal-header__close'), 'width')), [4]); assert.deepEqual(units(property(rule('.mc-ore-modal-header__close'), 'height')), [4]);
  assert.deepEqual(units(property(rule('.mc-ore-modal-header__icon'), 'width')), [1.4]); assert.deepEqual(units(property(rule('.mc-ore-modal-header__icon'), 'height')), [1.4]);
  assert(!/url\s*\(|data:|@font-face/i.test(sourceCSS), 'New modal CSS must not embed installed close art or fonts');
  assert(/@media\s*\(\s*forced-colors\s*:\s*active/.test(sourceCSS), 'Forced colors remain usable');

  const privateHashes = new Set(config.privateResourceHashes), scan = { knownPrivateHashes: privateHashes.size, files: 0, inlineResources: 0 };
  async function visit(directory, prefix = '') {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const relative = path.join(prefix, entry.name), absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) { await visit(absolute, relative); continue; }
      assert(entry.isFile(), 'Packed files cannot redirect through symlinks: ' + relative); const bytes = await fs.readFile(absolute); scan.files++;
      assert(!privateHashes.has(hash(bytes)), 'Private installed resource in packed filename ' + relative);
      assert(!/(?:^|[/\\])(?:demo|[.]cache|local-ore|hbui)(?:[/\\]|$)|ore-modal-fixture/i.test(relative), 'Private examples/resources must stay outside the tarball');
      if (/[.](?:js|mjs|json|css|html|map|md)$/i.test(relative)) for (const match of bytes.toString().matchAll(/data:[^,\s"'()]+;base64,([A-Za-z0-9+/=]+)/g)) {
        scan.inlineResources++; assert(!privateHashes.has(hash(Buffer.from(match[1], 'base64'))), 'Private inline resource in ' + relative);
      }
    }
  }
  await visit(installed);
  const result = { react: React.version, peerTypes: req('@types/react/package.json').version, runtimeValues: Object.keys(ui).length, checks, callbacks, refs, warnings, serviceAttempts: attempts,
    styles, privateResourceScan: scan, indexSHA256: hash(index), declarationSHA256: hash(declaration),
    scope: 'Actual installed ESM/SSR/strict declarations, host-owned close art and exact source CSS bytes. Server rendering does not enter the native dialog top layer. No browser focus/scroll/dismiss event, native game provider or pixel-perfect certification.' };
  await fs.writeFile(path.join(config.directory, 'SSR.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
}

/** Existing actual packed consumer only; never installs, builds or starts UI. */
export async function verifyOreModalPackage({ consumer, root, major, privateResourceHashes, evidenceName = 'ore-modal-contracts' }) {
  assert(major === 18 || major === 19); assert(/^[a-z0-9-]{1,80}$/.test(evidenceName));
  assert(privateResourceHashes?.[Symbol.iterator], 'Forward the complete private-resource hash set from the root package verifier');
  const supplied = [...privateResourceHashes]; assert(supplied.length > 0 && supplied.every(value => typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value)));
  const hashes = [...new Set(supplied.map(value => value.toLowerCase()))]; consumer = path.resolve(consumer); root = path.resolve(root);
  const directory = path.join(consumer, evidenceName); await fs.mkdir(directory, { recursive: true }); await fs.writeFile(path.join(directory, 'consumer.tsx'), typed);
  await fs.writeFile(path.join(directory, 'worker.mjs'), '(' + installedWorker.toString() + ')().catch(error=>{console.error(error);process.exitCode=1;});');
  await fs.writeFile(path.join(directory, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', lib: ['ES2022', 'DOM', 'DOM.Iterable'], module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: true }, include: ['consumer.tsx'] }, null, 2));
  const config = path.join(directory, 'config.json'); await fs.writeFile(config, JSON.stringify({ root, consumer, major, directory, privateResourceHashes: hashes }, null, 2));
  async function run(args, file) {
    try { const output = execFileSync(process.execPath, args, { cwd: consumer, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true }); await fs.writeFile(path.join(directory, file), output); }
    catch (error) { await fs.writeFile(path.join(directory, file), String(error.stdout ?? '') + '\n' + String(error.stderr ?? error.stack)); throw error; }
  }
  await run([path.join(directory, 'worker.mjs'), config], 'SSR.txt'); await run([path.join(root, 'node_modules/typescript/bin/tsc'), '--project', path.join(directory, 'tsconfig.json')], 'TYPECHECK.txt');
  const result = { ...JSON.parse(await fs.readFile(path.join(directory, 'SSR.json'), 'utf8')), strictTypes: true, negativeTypeContracts: (typed.match(/@ts-expect-error/g) ?? []).length,
    typedFixtureSHA256: createHash('sha256').update(typed).digest('hex'), status: 'PASS_INSTALLED_ORE_MODAL_ESM_SSR_TYPES_HOST_ART_CSS' };
  await fs.writeFile(path.join(directory, 'RESULT.json'), JSON.stringify(result, null, 2));
  console.log(`React ${major}: installed Ore modal ${result.checks.length} SSR / ${result.negativeTypeContracts} strict-negative types / host art / source CSS PASS`); return result;
}
