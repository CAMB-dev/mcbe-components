import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

// The complete strict consumer is kept here so each installed React peer checks
// its actual declaration surface, independently from this repository's aliases.
const typed = `import {createRef} from 'react';
import {OreButton,OreActionBar,OreScreenFrame,OreScrollArea,OreExternalServerForm} from 'mcbeui';
import type {OreButtonProps,OreButtonVariant,OreActionBarProps,OreScreenFrameProps,OreScreenSafeArea,OreScrollAreaProps,OreExternalServerFormProps,OreExternalServerValues,OreExternalServerLabels,OreExternalServerValueChangeDetail,OreExternalServerActionDetail,OreExternalServerPortInvalidDetail,OreExternalServerFieldKind,OreExternalServerAction} from 'mcbeui';
const button:OreButtonProps={variant:'primary',horizontal:true,type:'submit',icon:<span>Host icon</span>,guiScale:2,locale:'zh-CN',disabled:false,onClick:event=>{const node:HTMLButtonElement=event.currentTarget;void node;},className:'host-button',style:{width:200},children:'Host action'};
const bar:OreActionBarProps={label:'Host actions',guiScale:2,locale:'ja-JP',className:'host-bar',children:<button type="button">Arbitrary host action</button>};
const scroll:OreScrollAreaProps={label:'Host scroll',guiScale:2,inputMode:'touch',bottomInset:5,viewportRef:createRef<HTMLDivElement>(),floating:true,children:<p>Host content</p>};
const frame:OreScreenFrameProps={title:<span>Host title</span>,backLabel:'Host back',onBack:event=>{const node:HTMLButtonElement=event.currentTarget;void node;},backDisabled:false,backButtonRef:createRef<HTMLButtonElement>(),bodyRef:createRef<HTMLDivElement>(),size:[900,600],viewportSize:[1280,720],safeArea:{top:2,left:3,right:4},scrollLabel:'Host content',inputMode:'mouse',scrollBottomInset:4,extraBottom:3,guiScale:2,locale:'zh-CN',children:<p>Body</p>,footer:<span>Host footer</span>,onKeyDown:event=>{const node:HTMLElement=event.currentTarget;void node;}};
const labels:OreExternalServerLabels={name:'Name',address:'Address',port:'Port',add:'Add',addAndPlay:'Add and play',delete:'Delete',save:'Save'};
const value:OreExternalServerValues={name:'Host',address:'例子.example',port:'00001x'};
const safeArea:OreScreenSafeArea={top:0,left:0,right:0};
const shared={title:'Server',backLabel:'Back',labels,skins:{normal:'/host/normal.png',disabled:'/host/disabled.png'},size:[900,600] as const,viewportSize:[1280,720] as const,safeArea};
const form:OreExternalServerFormProps={...shared,mode:'add',submitAction:'add-and-play',value,guiScale:2,locale:'zh-CN',portValidation:'source-blur',
 onValueChange:(next,detail)=>{const d:OreExternalServerValueChangeDetail=detail;const previous:OreExternalServerValues=d.previousValue;const field:OreExternalServerFieldKind|undefined=d.field;void[next.port,previous,field,d.origin,d.event.currentTarget];return false;},
 onAction:detail=>{const d:OreExternalServerActionDetail=detail;const action:OreExternalServerAction=d.action;const owner:HTMLFormElement=d.form;void[action,owner,d.value.port,d.parsedPort,d.dirty,d.origin,d.mode];return false;},
 onPortInvalid:detail=>{const d:OreExternalServerPortInvalidDetail=detail;void[d.value,d.suggestedValue,d.reason,d.narrationIntent,d.event.currentTarget];},
 fieldRefs:{port:createRef<HTMLInputElement>()},fieldProps:{port:{maxLength:99,inputMode:'decimal',onChange:event=>{const node:HTMLInputElement=event.currentTarget;void node.value;},onBlur:event=>{const node:HTMLInputElement=event.currentTarget;void node;}}},formProps:{id:'host-form',onSubmit:event=>{const node:HTMLFormElement=event.currentTarget;void node;}}};
const edit:OreExternalServerFormProps={...shared,mode:'edit',submitAction:'save',defaultValue:value,portValidation:'host',editIcons:{delete:<span>Host delete</span>,save:<span>Host save</span>}};
export const positive=<><OreButton {...button} ref={createRef<HTMLButtonElement>()}/><OreActionBar {...bar} ref={createRef<HTMLDivElement>()}/><OreScreenFrame {...frame} ref={createRef<HTMLElement>()}/><OreScrollArea {...scroll} ref={createRef<HTMLDivElement>()}/><OreExternalServerForm {...form} ref={createRef<HTMLFormElement>()}/><OreExternalServerForm {...edit}/></>;
// @ts-expect-error The variant is a finite source family.
const variant:OreButtonVariant='danger';
// @ts-expect-error Native button types stay finite.
const buttonType:OreButtonProps={type:'number'};
// @ts-expect-error Button forwards its real HTML button.
const buttonRef=<OreButton ref={createRef<HTMLDivElement>()}/>;
// @ts-expect-error Action bar forwards a div.
const barRef=<OreActionBar ref={createRef<HTMLSpanElement>()}/>;
// @ts-expect-error Frame ref is a real HTML element, not SVG.
const frameRef=<OreScreenFrame {...frame} ref={createRef<SVGSVGElement>()}/>;
// @ts-expect-error Source physical frame size is required.
const missingFrame:OreScreenFrameProps={title:'Host',backLabel:'Back',onBack:()=>{},viewportSize:[100,100],safeArea:{top:0,left:0,right:0},children:'Body'};
// @ts-expect-error Scroll forwards the actual div viewport.
const scrollRef=<OreScrollArea {...scroll} ref={createRef<HTMLSpanElement>()}/>;
// @ts-expect-error Source input branch is explicit mouse/touch.
const scrollMode:OreScrollAreaProps={label:'Host',children:'Body',inputMode:'controller'};
// @ts-expect-error Add/edit source mode is explicit.
const mode:OreExternalServerFormProps['mode']='new';
// @ts-expect-error Source port remains accepted string state.
const port:OreExternalServerValues['port']=19132;
// @ts-expect-error Submit cannot invoke destructive confirmation.
const destructiveSubmit:OreExternalServerFormProps={...shared,mode:'edit',submitAction:'delete-confirmation'};
// @ts-expect-error Add mode cannot submit an edit Save action.
const wrongAddSubmit:OreExternalServerFormProps={...shared,mode:'add',submitAction:'save'};
// @ts-expect-error Edit mode cannot submit an Add action.
const wrongEditSubmit:OreExternalServerFormProps={...shared,mode:'edit',submitAction:'add'};
// @ts-expect-error Forwarded form ref is the actual form element.
const formRef=<OreExternalServerForm {...form} ref={createRef<HTMLDivElement>()}/>;
// @ts-expect-error Host-owned text skins are required.
const noSkins:OreExternalServerFormProps={mode:'add',title:'Host',backLabel:'Back',labels,size:[900,600],viewportSize:[1280,720],safeArea:{top:0,left:0,right:0}};
// @ts-expect-error Independent field refs address native inputs.
const fieldRef:OreExternalServerFormProps={...shared,mode:'add',fieldRefs:{port:createRef<HTMLDivElement>()}};
// @ts-expect-error Source field type is owned by the form.
const fieldType:OreExternalServerFormProps={...shared,mode:'add',fieldProps:{port:{type:'number'}}};
// @ts-expect-error Appearance context remains private.
import {OreButtonAppearanceContext} from 'mcbeui';
void[variant,buttonType,buttonRef,barRef,frameRef,missingFrame,scrollRef,scrollMode,mode,port,destructiveSubmit,wrongAddSubmit,wrongEditSubmit,formRef,noSkins,fieldRef,fieldType];
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
  const installed = path.join(config.consumer, 'node_modules/mcbeui');
  const manifest = JSON.parse(await fs.readFile(path.join(installed, 'package.json'), 'utf8'));
  const index = await fs.readFile(path.join(installed, 'dist/index.js')), declaration = await fs.readFile(path.join(installed, 'dist/index.d.ts'));
  assert.deepEqual(index, await fs.readFile(path.join(config.root, 'dist/index.js'))); assert.deepEqual(declaration, await fs.readFile(path.join(config.root, 'dist/index.d.ts')));
  const warnings = [], attempts = [], checks = [], saved = new Map(), oldError = console.error, oldWarn = console.warn;
  let callbacks = 0, refs = 0, ui;
  const callback = () => { callbacks++; throw Error('SSR callback'); }, ref = () => { refs++; throw Error('SSR ref'); };
  const check = (name, run) => { try { run(); checks.push(name); } catch (error) { error.message = '[' + name + '] ' + error.message; throw error; } };
  const attr = (tag, name) => new RegExp('(?:^|\\s)' + name + '="([^"]*)"(?=\\s|/?>)', 'i').exec(tag)?.[1];
  const tags = (html, tag) => [...html.matchAll(new RegExp('<' + tag + '\\b[^>]*>', 'gi'))].map(match => match[0]);
  const classTag = (html, tag, className) => tags(html, tag).find(node => attr(node, 'class')?.split(/\s+/).includes(className));
  console.error = (...args) => warnings.push(args.map(String).join(' ')); console.warn = console.error;
  for (const name of ['fetch', 'Image', 'FontFace', 'createImageBitmap', 'OffscreenCanvas', 'XMLHttpRequest', 'ResizeObserver', 'MutationObserver', 'requestAnimationFrame', 'setTimeout', 'setInterval']) {
    saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, value() { attempts.push(name); throw Error('SSR service ' + name); } });
  }
  try {
    ui = await import(pathToFileURL(path.join(installed, 'dist/index.js')).href);
    for (const name of ['OreButton', 'OreActionBar', 'OreScreenFrame', 'OreScrollArea', 'OreExternalServerForm']) assert.equal(ui[name].$$typeof, Symbol.for('react.forward_ref'));
    for (const name of ['OreButtonAppearanceContext', 'oreButtonAppearance', 'OreScroll', 'OreScreenFrameCore', 'OreExternalServerFormCore', 'parseOrePort', 'inspectOreExternalServerPort', 'createOreExternalServerFormController', 'oreExternalServerAssets']) assert(!Object.hasOwn(ui, name), 'Private export ' + name);
    const button = (props = {}) => ssr(React.createElement(ui.OreButton, { key: 'real-button-key', ref, onClick: callback, children: 'Host action', ...props }));
    for (const variant of ['primary', 'secondary', 'destructive']) for (const type of ['button', 'submit', 'reset']) check('native-button-' + variant + '-' + type, () => {
      const html = button({ variant, type, name: 'host-action', value: 'literal', 'aria-label': 'Named host action' }), node = tags(html, 'button')[0];
      assert.equal(tags(html, 'button').length, 1); assert.equal(attr(node, 'type'), type); assert.equal(attr(node, 'data-variant'), variant);
      assert.equal(attr(node, 'name'), 'host-action'); assert.equal(attr(node, 'value'), 'literal'); assert.equal(attr(node, 'aria-label'), 'Named host action');
      assert(html.includes('Host action')); assert(!/<canvas|<iframe|<script/.test(html)); assert.equal(attr(node, 'variant'), undefined);
    });
    check('button-default-disabled-native-props-and-host-icon', () => {
      const html = button({ disabled: true, horizontal: true, className: 'host-button', style: { width: 200 }, icon: React.createElement('span', { 'data-host-icon': 'true' }, 'Host icon') });
      const node = tags(html, 'button')[0]; assert.equal(attr(node, 'type'), 'button'); assert.equal(attr(node, 'disabled'), '');
      assert.equal(attr(node, 'data-horizontal'), 'true'); assert(attr(node, 'class').includes('host-button')); assert(attr(node, 'style').includes('width:200px'));
      const icon = classTag(html, 'span', 'mc-ore-button__icon'); assert(icon); assert.equal(attr(icon, 'aria-hidden'), 'true'); assert(html.includes('data-host-icon="true"'));
    });
    check('icon-only-button-retains-caller-name-and-no-invented-text', () => {
      const html = button({ children: undefined, 'aria-label': 'Host icon-only action', icon: React.createElement('span', null, 'Decorative') });
      assert.equal(attr(tags(html, 'button')[0], 'aria-label'), 'Host icon-only action'); assert(!classTag(html, 'span', 'mc-ore-button__label'));
    });
    check('action-bar-arbitrary-children-real-ref-profile-and-user-aria', () => {
      const html = ssr(React.createElement(ui.OreActionBar, { ref, label: 'Fallback label', 'aria-labelledby': 'host-actions-label', className: 'host-bar', guiScale: 2, locale: 'ja-JP' },
        React.createElement(ui.OreButton, { horizontal: true, onClick: callback }, 'Inherited'), React.createElement('button', { type: 'button' }, 'Arbitrary native child')));
      const bar = classTag(html, 'div', 'mc-ore-action-bar'), child = classTag(html, 'button', 'mc-ore-button'); assert(bar); assert(child);
      assert.equal(attr(bar, 'aria-labelledby'), 'host-actions-label'); assert.equal(attr(bar, 'aria-label'), undefined); assert.equal(attr(bar, 'role'), 'group');
      assert(html.includes('Arbitrary native child')); assert(attr(bar, 'class').includes('host-bar')); assert(attr(child, 'style').includes('--mc-ore-unit:10px')); assert(attr(child, 'style').includes('Noto Sans JP'));
    });
    check('action-bar-explicit-button-appearance-overrides-inherited-profile', () => {
      const html = ssr(React.createElement(ui.OreActionBar, { guiScale: 2, locale: 'ja-JP' }, React.createElement(ui.OreButton, { guiScale: .5, locale: 'ko-KR' }, 'Override')));
      const node = classTag(html, 'button', 'mc-ore-button'); assert(attr(node, 'style').includes('--mc-ore-unit:2.5px')); assert(attr(node, 'style').includes('Noto Sans KR'));
    });
    const frameProps = { ref, title: 'Host source screen', backLabel: 'Return to host', onBack: callback, backButtonRef: ref, bodyRef: ref,
      size: [900, 600], viewportSize: [1280, 720], safeArea: { top: 2, left: 3, right: 4 }, scrollLabel: 'Host screen body', guiScale: 2, locale: 'zh-CN' };
    const frame = (props = {}) => ssr(React.createElement(ui.OreScreenFrame, { ...frameProps, ...props }, React.createElement('p', null, 'Host body')));
    const scroll = (props = {}) => ssr(React.createElement(ui.OreScrollArea, { ref, viewportRef: ref, label: 'Host scroll body', children: React.createElement('p', null, 'Native scroll content'), ...props }));
    // Frame/scroll and form contracts are finalized against their frozen source
    // interfaces below; no browser event is synthesized by this SSR worker.
    check('frame-host-title-back-body-footer-and-native-attributes', () => {
      const html = frame({ id: 'host-frame', className: 'host-frame-class', 'aria-label': 'Explicit screen name', footer: React.createElement('div', null, 'Host footer') });
      assert(html.includes('Host source screen')); assert(html.includes('Return to host')); assert(html.includes('Host body')); assert(html.includes('Host footer'));
      const node = tags(html, 'section').find(item => attr(item, 'id') === 'host-frame'); assert(node); assert.equal(attr(node, 'aria-label'), 'Explicit screen name');
      assert(attr(node, 'class').includes('host-frame-class')); assert(attr(node, 'style').includes('width:900px')); assert(attr(node, 'style').includes('height:600px'));
    });
    check('frame-arbitrary-title-own-scroller-host-back-icon-and-disabled-back', () => {
      const html = frame({ title: React.createElement('span', null, 'Rich host title'), scroll: false, scrollLabel: undefined, backDisabled: true,
        backIcon: React.createElement('span', { 'data-host-back': 'true' }, 'Host back art') });
      const back = classTag(html, 'button', 'mc-ore-screen-frame__back'); assert(back); assert.equal(attr(back, 'type'), 'button'); assert.equal(attr(back, 'disabled'), '');
      assert.equal(attr(back, 'aria-label'), 'Return to host'); assert.equal(attr(classTag(html, 'span', 'mc-ore-screen-frame__back-icon'), 'aria-hidden'), 'true');
      assert(html.includes('data-host-back="true"')); assert(!classTag(html, 'div', 'mc-ore-scroll__viewport'));
      assert.equal(attr(classTag(html, 'div', 'mc-ore-screen-frame__body'), 'data-scroll-owner'), 'children');
    });
    check('frame-user-aria-safe-area-and-explicit-extra-flow-remain-host-owned', () => {
      const html = frame({ 'aria-labelledby': 'external-title', hidden: true, safeArea: { top: -1, left: -2, right: -3 }, extraBottom: 5 });
      const node = tags(html, 'section')[0]; assert.equal(attr(node, 'aria-labelledby'), 'external-title'); assert.equal(attr(node, 'hidden'), '');
      for (const declaration of ['--mc-ore-screen-safe-top:-1px', '--mc-ore-screen-safe-left:-2px', '--mc-ore-screen-safe-right:-3px']) assert(attr(node, 'style').includes(declaration));
      assert.equal(attr(classTag(html, 'div', 'mc-ore-screen-frame__extra'), 'style'), 'height:5px');
    });
    check('frame-string-title-can-name-its-native-scroll-region', () => {
      const html = frame({ title: 'Derived scroll title', scrollLabel: undefined });
      assert.equal(attr(classTag(html, 'div', 'mc-ore-scroll__viewport'), 'aria-label'), 'Derived scroll title');
    });
    for (const inputMode of ['mouse', 'touch']) check('scroll-real-native-region-' + inputMode, () => {
      const html = scroll({ inputMode, floating: true, guiScale: 2, bottomInset: 7, className: 'host-scroll' });
      const region = tags(html, 'div').find(item => attr(item, 'role') === 'region'); assert(region); assert.equal(attr(region, 'aria-label'), 'Host scroll body');
      assert.equal(attr(region, 'tabindex'), '0'); assert(attr(region, 'id')); assert(html.includes('Native scroll content')); assert(html.includes('host-scroll'));
      const wrapperStyle = attr(classTag(html, 'div', 'mc-ore-scroll'), 'style');
      assert(wrapperStyle.includes('--mc-ore-scroll-unit:10px')); assert(!/(?:^|;)--mc-ore-unit:/.test(wrapperStyle), 'Standalone fallbacks do not shadow an existing Ore parent profile');
      assert(!/<canvas|<iframe|<script/.test(html));
    });
    const invalidFrames = [{ size: [0, 600] }, { viewportSize: [NaN, 720] }, { safeArea: undefined }, { inputMode: 'controller' },
      { title: React.createElement('span', null, 'Rich title'), scrollLabel: undefined }, { extraBottom: -1 }, { backDisabled: 1 }];
    invalidFrames.forEach((patch, i) => check('invalid-frame-' + i, () => assert.throws(() => frame(patch), error => error instanceof TypeError || error instanceof RangeError)));
    check('scroll-retains-legacy-empty-label-and-signed-exclusion', () => {
      const html = scroll({ label: '', bottomInset: -7 });
      assert.equal(attr(classTag(html, 'div', 'mc-ore-scroll__viewport'), 'aria-label'), '');
    });
    const invalidScroll = [{ label: null }, { inputMode: 'controller' }, { bottomInset: NaN }, { guiScale: 0 }, { floating: 1 }];
    invalidScroll.forEach((patch, i) => check('invalid-scroll-' + i, () => assert.throws(() => scroll(patch), error => error instanceof TypeError || error instanceof RangeError)));

    const labels = { name: 'Field name', address: 'Field address', port: 'Field port', add: 'Host Add', addAndPlay: 'Host Add and play', delete: 'Host Delete', save: 'Host Save' };
    const baseForm = { key: 'actual-keyed-form', ref, title: 'Host external server', backLabel: 'Host Back', labels,
      skins: { normal: '/host/whole-field-normal.png', disabled: '/host/whole-field-disabled.png' }, size: [900, 600], viewportSize: [1280, 720], safeArea: { top: 0, left: 0, right: 0 },
      fieldRefs: { name: ref, address: ref, port: ref }, onValueChange: callback, onAction: callback, onPortInvalid: callback };
    const form = (props = {}) => ssr(React.createElement(ui.OreExternalServerForm, { ...baseForm, mode: 'add', ...props }));
    const inputsByName = html => Object.fromEntries(tags(html, 'input').map(tag => [attr(tag, 'name'), tag]));
    for (const mode of ['add', 'edit']) for (const [windowWidth, layout] of [[320, 'narrow'], [500, 'tablet'], [1280, 'desktop']]) check('source-form-branch-' + mode + '-' + layout, () => {
      const html = form({ mode, viewportSize: [windowWidth, 720] }), native = tags(html, 'form')[0], fields = inputsByName(html);
      assert.equal(tags(html, 'form').length, 1); assert.equal(tags(html, 'input').length, 3); assert.equal(attr(native, 'data-mode'), mode);
      assert.equal(attr(native, 'data-port-validation'), 'source-blur'); assert.equal(attr(native, 'data-enter-policy'), 'source-blur');
      assert.equal(attr(native, 'data-confirmations'), 'host-owned'); assert.equal(attr(native, 'data-dirty'), 'false');
      assert.equal(attr(fields.name, 'value'), ''); assert.equal(attr(fields.address, 'value'), ''); assert.equal(attr(fields.port, 'value'), '19132');
      for (const tag of Object.values(fields)) { assert.equal(attr(tag, 'type'), 'text'); assert.equal(attr(tag, 'maxlength'), undefined); assert(attr(tag, 'aria-labelledby')); }
      assert.equal(attr(fields.port, 'inputmode'), 'numeric'); assert(classTag(html, 'div', 'mc-ore-external-server-form__grid--' + layout));
      const actions = tags(html, 'button').filter(node => attr(node, 'data-ore-server-action'));
      assert.deepEqual(actions.map(node => attr(node, 'data-ore-server-action')), mode === 'add' ? ['add', 'add-and-play'] : ['delete-confirmation', 'save']);
      for (const node of actions) {
        assert.equal(attr(node, 'disabled'), undefined, 'Default source actions are not invented validation-disabled');
        const name = attr(node, 'data-ore-server-action');
        assert.equal(attr(node, 'data-variant'), name === 'delete-confirmation' ? 'destructive' : name === 'add' ? 'secondary' : 'primary');
      }
      assert.equal(actions.filter(node => attr(node, 'type') === 'submit').length, 0, 'Source Enter defaults to blur, not an Add/Join/Save request');
      assert(actions.every(node => attr(node, 'type') === 'button'));
      assert.equal(tags(html, 'button').filter(node => attr(node, 'type') === 'submit').length, 0, 'No default hidden submit control');
      assert.equal(tags(html, 'div').filter(node => attr(node, 'class')?.split(/\s+/).includes('mc-ore-external-server-form__footer')).length, 1);
      assert(!/<canvas|<iframe|<script|<img\b/.test(html));
    });
    check('accepted-port-text-survives-ssr-without-triggering-source-blur-correction', () => {
      for (const port of ['000019', '99999', '12x', '']) {
        const html = form({ value: { name: 'Host <name>', address: '例子.example', port }, portValidation: 'source-blur' });
        const fields = inputsByName(html); assert.equal(attr(fields.port, 'value'), port); assert.equal(attr(fields.name, 'value'), 'Host &lt;name&gt;');
        assert.equal(attr(fields.address, 'value'), '例子.example'); assert.equal(attr(fields.port, 'aria-invalid'), undefined);
      }
    });
    check('accepted-value-and-default-snapshot-coexist-without-native-uncontrolled-warnings', () => {
      const fields = inputsByName(form({ value: { name: 'Accepted', address: 'accepted.example', port: '001x' }, defaultValue: { name: 'Initial', address: 'initial.example', port: '7' } }));
      assert.equal(attr(fields.name, 'value'), 'Accepted'); assert.equal(attr(fields.address, 'value'), 'accepted.example'); assert.equal(attr(fields.port, 'value'), '001x');
    });
    check('form-caller-names-native-field-props-and-independent-context-identifiers', () => {
      const html = form({ formProps: { id: 'host-form', 'aria-label': 'Direct host form', className: 'host-form', onSubmit: callback, onChange: callback, onBlur: callback },
        fieldProps: { port: { id: 'host-port', maxLength: 99, inputMode: 'decimal', 'aria-describedby': 'external-hint', onChange: callback, onBlur: callback } },
        descriptions: { port: 'Host port hint' } });
      const native = tags(html, 'form')[0], port = inputsByName(html).port;
      assert.equal(attr(native, 'id'), 'host-form'); assert.equal(attr(native, 'aria-label'), 'Direct host form'); assert.equal(attr(native, 'aria-labelledby'), undefined);
      assert(attr(native, 'class').includes('host-form')); assert.equal(attr(port, 'id'), 'host-port'); assert.equal(attr(port, 'maxlength'), '99'); assert.equal(attr(port, 'inputmode'), 'decimal');
      const description = [...html.matchAll(/<div\b([^>]*)>Host port hint<\/div>/g)].map(match => attr(match[1], 'id'))[0]; assert(description);
      assert.deepEqual(new Set(attr(port, 'aria-describedby').split(/\s+/)), new Set(['external-hint', description]));
      assert.equal(attr(port, 'aria-labelledby').split(/\s+/).length, 1);
      for (const name of ['mode', 'skins', 'size', 'viewportSize', 'safeArea', 'fieldProps', 'fieldRefs', 'submitAction']) assert.equal(attr(native, name), undefined);
    });
    check('edit-icons-remain-host-owned-decorative-content-and-safe-submit-selection', () => {
      const html = form({ mode: 'edit', submitAction: 'save', editIcons: { delete: React.createElement('span', { 'data-host-delete': 'true' }, 'Host delete art'), save: React.createElement('span', { 'data-host-save': 'true' }, 'Host save art') } });
      assert(html.includes('data-host-delete="true"')); assert(html.includes('data-host-save="true"'));
      assert.equal(tags(html, 'span').filter(node => attr(node, 'class')?.split(/\s+/).includes('mc-ore-button__icon') && attr(node, 'aria-hidden') === 'true').length, 2);
      const actions = tags(html, 'button').filter(node => attr(node, 'data-ore-server-action'));
      assert.equal(attr(actions.find(node => attr(node, 'data-ore-server-action') === 'delete-confirmation'), 'type'), 'button');
      assert.equal(attr(actions.find(node => attr(node, 'data-ore-server-action') === 'save'), 'type'), 'submit');
      const add = form({ submitAction: 'add-and-play' });
      assert.equal(attr(tags(add, 'form')[0], 'data-enter-policy'), 'explicit-web-submit-action');
      assert.equal(attr(tags(add, 'button').find(node => attr(node, 'data-ore-server-action') === 'add-and-play'), 'type'), 'submit');
    });
    for (const flag of ['disabled', 'readOnly', 'hidden']) check('form-native-state-' + flag, () => {
      const html = form({ [flag]: true }); const native = tags(html, 'form')[0];
      if (flag === 'hidden') assert.equal(attr(native, 'hidden'), '');
      else {
        assert.equal(attr(native, 'aria-disabled'), flag === 'disabled' ? 'true' : undefined);
        const back = tags(html, 'button').find(node => (attr(node, 'class') ?? '').includes('mc-ore-screen-frame__back'));
        assert.equal(attr(back, 'disabled'), flag === 'disabled' ? '' : undefined);
        for (const tag of tags(html, 'input')) assert.equal(attr(tag, flag === 'disabled' ? 'disabled' : 'readonly'), '');
        for (const tag of tags(html, 'button').filter(node => attr(node, 'data-ore-server-action'))) assert.equal(attr(tag, 'disabled'), '');
      }
    });
    const invalidForms = [{ mode: 'new' }, { mode: 'edit', submitAction: 'add' }, { mode: 'add', submitAction: 'save' }, { mode: 'edit', submitAction: 'delete-confirmation' },
      { skins: undefined }, { size: undefined }, { viewportSize: [0, 720] }, { safeArea: undefined }, { value: { name: 'Host', address: 'Host', port: 19132 } },
      { portValidation: 'parse-on-input' }, { inputMode: 'controller' }, { disabled: 1 }, { fieldProps: { port: { type: 'number' } } }];
    invalidForms.forEach((patch, i) => check('invalid-form-' + i, () => assert.throws(() => form(patch), error => error instanceof TypeError || error instanceof RangeError)));

    const invalidButtons = [{ variant: 'danger' }, { type: 'number' }, { horizontal: 1 }, { disabled: 1 }, { guiScale: 0 }, { guiScale: Infinity }, { locale: 1 }];
    invalidButtons.forEach((patch, i) => check('invalid-button-' + i, () => assert.throws(() => button(patch), error => error instanceof TypeError || error instanceof RangeError)));
    for (const patch of [{ label: 1 }, { guiScale: 0 }, { locale: 1 }]) check('invalid-bar-' + Object.keys(patch)[0], () =>
      assert.throws(() => ssr(React.createElement(ui.OreActionBar, patch, 'Host')), error => error instanceof TypeError || error instanceof RangeError));
    assert.equal(callbacks, 0); assert.equal(refs, 0); assert.deepEqual(attempts, []); assert.deepEqual(warnings, []);
  } finally {
    console.error = oldError; console.warn = oldWarn;
    for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  }

  const styles = {};
  async function css(file) {
    if (styles[file]) return; assert(!path.isAbsolute(file) && !file.startsWith('..'));
    const bytes = await fs.readFile(path.join(installed, 'dist', file)); assert.deepEqual(bytes, await fs.readFile(path.join(config.root, 'src', file))); styles[file] = hash(bytes);
    for (const match of bytes.toString().matchAll(/@import\s+['"]([^'"]+[.]css)['"]/g)) await css(path.normalize(path.join(path.dirname(file), match[1])));
  }
  for (const name of ['ore-button.css', 'ore-action-bar.css', 'ore-screen-frame.css', 'ore-scroll-area.css', 'ore-external-server-form.css']) {
    assert.equal(manifest.exports['./' + name], './dist/' + name); await css(name);
  }
  const unified = await fs.readFile(path.join(installed, 'dist/styles.css'), 'utf8');
  assert(/@import\s+['"][^'"]*ore-external-server-form[.]css['"]/.test(unified), 'Unified stylesheet reaches the composition');
  const readCSS = async name => (await fs.readFile(path.join(installed, 'dist', name), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (text, selector) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const body = new RegExp('(?:^|[}\\s])' + escaped + '\\s*\\{([^}]*)\\}').exec(text)?.[1]; assert(body, 'CSS rule ' + selector); return body;
  };
  const property = (body, name) => new RegExp('(?:^|;)\\s*' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:\\s*([^;}]*)').exec(body)?.[1]?.trim();
  const units = value => { assert.equal(typeof value, 'string', 'Declared unit property'); return [...value.matchAll(/calc\(\s*(-?[.0-9]+)\s*\*\s*var\(--mc-ore-unit(?:,\s*var\(--mc-ore-scroll-unit\))?\)\s*\)/g)].map(item => Number(item[1])); };
  const buttonCSS = await readCSS('ore-button.css'), barCSS = await readCSS('ore-action-bar.css');
  const palettes = { secondary: ['#d0d1d4', '#b1b2b5', '#b1b2b5', '#58585a'], primary: ['#3c8527', '#2a641c', '#1d4d13', '#1d4d13'], destructive: ['#ca3636', '#c02d2d', '#ad1d1d', '#ad1d1d'] };
  for (const [variant, colors] of Object.entries(palettes)) {
    const body = rule(buttonCSS, variant === 'secondary' ? '.mc-ore-button' : '.mc-ore-button[data-variant="' + variant + '"]');
    assert.deepEqual(['--mc-ore-face', '--mc-ore-face-hover', '--mc-ore-face-pressed', '--mc-ore-base'].map(name => property(body, name)?.toLowerCase()), colors);
  }
  assert.deepEqual(units(property(rule(buttonCSS, '.mc-ore-button'), 'padding')), [.4]);
  assert.deepEqual(units(property(rule(buttonCSS, '.mc-ore-button'), 'border')), [.2]);
  assert(property(rule(buttonCSS, '.mc-ore-button'), 'border').includes('#1e1e1f'));
  assert.deepEqual(units(property(rule(buttonCSS, '.mc-ore-button'), 'font-size')), [1.6]);
  assert.deepEqual(units(property(rule(buttonCSS, '.mc-ore-button'), 'line-height')), [2]);
  assert.deepEqual(units(property(rule(buttonCSS, '.mc-ore-button'), 'letter-spacing')), [.04]);
  assert(property(rule(buttonCSS, '.mc-ore-button'), 'font-family').includes('Minecraft Seven v2'));
  assert.equal(property(rule(buttonCSS, '.mc-ore-button::before'), 'background'), undefined, 'Elevated source before layer remains transparent');
  assert.deepEqual(units(property(rule(buttonCSS, '.mc-ore-button__face'), 'height')), [4]);
  assert.deepEqual(units(property(rule(buttonCSS, '.mc-ore-button:active:not(:disabled)'), 'margin-top')), [.4]);
  assert.equal(property(rule(buttonCSS, '.mc-ore-button:active:not(:disabled)'), 'padding-bottom'), '0');
  assert.equal(property(rule(buttonCSS, '.mc-ore-button:disabled'), 'background'), '#8c8d90');
  assert.equal(property(rule(buttonCSS, '.mc-ore-button:disabled'), 'border-color'), '#58585a');
  assert.equal(property(rule(buttonCSS, '.mc-ore-button:disabled>.mc-ore-button__face'), 'background'), '#b1b2b5');
  const barBody = rule(barCSS, '.mc-ore-action-bar');
  assert.equal(property(barBody, 'background'), '#48494a'); assert.deepEqual(units(property(barBody, 'gap')), [.8]); assert.deepEqual(units(property(barBody, 'padding')), [1.6]);
  assert.deepEqual(units(property(barBody, 'border-top-width')), [.2]); assert.deepEqual(units(property(barBody, 'border-bottom-width')), [.2]);
  assert.equal(property(barBody, 'border-top-color'), 'rgba(255,255,255,.1)'); assert.equal(property(barBody, 'border-bottom-color'), 'rgba(0,0,0,.3)');
  assert.equal(property(rule(barCSS, '.mc-ore-action-bar>.mc-ore-button[data-horizontal]'), 'flex'), '1 0 0');
  assert.equal(property(barBody, 'height'), undefined, 'Action bar retains natural children height');

  const formCSS = await readCSS('ore-external-server-form.css'), scrollCSS = await readCSS('ore-scroll-area.css');
  assert.equal(property(rule(formCSS, '.mc-ore-external-server-form__frame--glass'), 'background'), 'rgba(0,0,0,.5)');
  const grid = rule(formCSS, '.mc-ore-external-server-form__grid');
  assert.equal(property(grid, 'max-width'), '100%'); assert.deepEqual(units(property(grid, 'padding-inline')), [1.6]);
  assert.equal(property(grid, 'align-items'), 'center');
  const row = rule(formCSS, '.mc-ore-external-server-form__row');
  assert.equal(property(row, 'width'), '100%'); assert.deepEqual(units(property(row, 'max-width')), [128]);
  assert.equal(property(row, 'flex-wrap'), 'wrap'); assert.equal(property(row, 'flex'), '0 1 auto');
  assert.deepEqual(units(property(rule(formCSS, '.mc-ore-external-server-form__grid--desktop'), 'padding-inline')), [2.4]);
  assert.deepEqual(units(property(rule(formCSS, '.mc-ore-external-server-form__grid--narrow'), 'padding-inline')), [.8]);
  const formSection = rule(formCSS, '.mc-ore-external-server-form__section');
  assert.deepEqual(units(property(formSection, 'margin-top')), [.8]); assert.deepEqual(units(property(formSection, 'border')), [.2]);
  assert(property(formSection, 'border').includes('#1e1e1f'));
  const viewportCSS = rule(scrollCSS, '.mc-ore-scroll__viewport');
  assert.equal(property(viewportCSS, 'scrollbar-width'), 'none'); assert.equal(property(viewportCSS, 'overflow-y'), 'scroll');
  assert.equal(property(rule(scrollCSS, '.mc-ore-scroll__viewport::-webkit-scrollbar'), 'display'), 'none');
  assert.equal(property(rule(scrollCSS, '.mc-ore-scroll__track'), 'background'), '#58585a');
  assert.equal(property(rule(scrollCSS, '.mc-ore-scroll__thumb'), 'background'), '#e6e8eb');
  assert.deepEqual(units(property(rule(scrollCSS, '.mc-ore-scroll__bar'), 'width')), [1.2]);
  assert(property(rule(scrollCSS, '.mc-ore-scroll__bar'), 'width').replace(/\s+/g, '').includes('var(--mc-ore-unit,var(--mc-ore-scroll-unit))'), 'Existing inherited Ore unit retains priority over the standalone fallback');
  const legacy = await fs.readFile(path.join(installed, 'dist/ore-player-permissions.css'), 'utf8');
  assert.deepEqual(Buffer.from(legacy), await fs.readFile(path.join(config.root, 'src/ore-player-permissions.css')));
  assert(/@import\s+['"][^'"]*ore-scroll-area[.]css['"]/.test(legacy), 'Existing Ore permissions reaches the extracted shared scroller');
  for (const [name, text] of [['button', buttonCSS], ['action-bar', barCSS], ['form', formCSS], ['scroll', scrollCSS]]) {
    assert(!/url\s*\(|data:|@font-face/i.test(text), 'No private/default art or fonts in new ' + name + ' CSS');
    if (name !== 'form') assert(/@media\s*\(\s*forced-colors\s*:\s*active/.test(text), 'Accessible forced-colors branch in ' + name + ' CSS');
  }

  const frameCSS = await readCSS('ore-screen-frame.css');
  assert.equal(property(rule(frameCSS, '.mc-ore-screen-frame'), 'background'), 'transparent');
  assert.equal(property(rule(frameCSS, '.mc-ore-screen-frame__header'), 'background'), '#e6e8eb');
  assert.equal(property(rule(frameCSS, '.mc-ore-screen-frame__header'), 'color'), '#1e1e1f');
  assert.deepEqual(units(property(rule(frameCSS, '.mc-ore-screen-frame__center'), 'height')), [4.4]);
  assert.deepEqual(units(property(rule(frameCSS, '.mc-ore-screen-frame__back'), 'width')), [4]);
  assert.deepEqual(units(property(rule(frameCSS, '.mc-ore-screen-frame__back'), 'height')), [4]);
  assert.deepEqual(units(property(rule(frameCSS, '.mc-ore-screen-frame__title'), 'font-size')), [2]);
  assert.deepEqual(units(property(rule(frameCSS, '.mc-ore-screen-frame__title'), 'line-height')), [2.4]);
  assert(property(rule(frameCSS, '.mc-ore-screen-frame__title'), 'font-family').includes('Minecraft Ten v2'));
  assert.deepEqual(units(property(rule(frameCSS, '.mc-ore-screen-frame__strip'), 'height')), [.4]);
  assert.equal(property(rule(frameCSS, '.mc-ore-screen-frame__strip'), 'background'), '#b1b2b5');
  assert.deepEqual(units(property(rule(frameCSS, '.mc-ore-screen-frame__specular'), 'height')), [.2]);
  assert.equal(property(rule(frameCSS, '.mc-ore-screen-frame__specular'), 'background'), 'rgba(255,255,255,.2)');
  const shadow = rule(frameCSS, '.mc-ore-screen-frame__shadow'); assert.equal(property(shadow, 'position'), 'absolute');
  assert.deepEqual(units(property(shadow, 'height')), [.2]); assert.deepEqual(units(property(shadow, 'bottom')), [-.2]); assert.equal(property(shadow, 'background'), 'rgba(0,0,0,.3)');
  assert(!/url\s*\(|data:|@font-face/i.test(frameCSS)); assert(/@media\s*\(\s*forced-colors\s*:\s*active/.test(frameCSS));

  const knownPrivate = new Set(config.privateResourceHashes), scan = { knownPrivateHashes: knownPrivate.size, files: 0, inlineResources: 0 };
  async function visit(directory, prefix = '') {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const relative = path.join(prefix, entry.name), absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) { await visit(absolute, relative); continue; }
      assert(entry.isFile(), 'Packed file cannot redirect through a symlink: ' + relative); const bytes = await fs.readFile(absolute); scan.files++;
      assert(!knownPrivate.has(hash(bytes)), 'Private installed resource copied under a packed filename: ' + relative);
      assert(!/(?:^|[/\\])assets[/\\]ore-external-server(?:[/\\]|$)/.test(relative), 'Host private icon bank must not enter the library');
      if (/[.](?:js|mjs|json|css|html|map|md)$/i.test(relative)) for (const match of bytes.toString().matchAll(/data:[^,\s"'()]+;base64,([A-Za-z0-9+/=]+)/g)) {
        scan.inlineResources++; assert(!knownPrivate.has(hash(Buffer.from(match[1], 'base64'))), 'Private inline resource in ' + relative);
      }
    }
  }
  await visit(installed);
  const result = { react: React.version, peerTypes: req('@types/react/package.json').version, runtimeValues: Object.keys(ui).length, checks, callbacks, refs, warnings, serviceAttempts: attempts,
    styles, privateResourceScan: scan, indexSHA256: hash(index), declarationSHA256: hash(declaration), paletteContract: palettes,
    scope: 'Actual installed ESM/SSR/strict types, host-owned assets and exact source CSS contract. No browser event/port-blur execution, native GPU, service connection or pixel-perfect certification.' };
  await fs.writeFile(path.join(config.directory, 'SSR.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
}

/** Checks an existing actual packed consumer. No install, build, network or UI. */
export async function verifyOreExternalServerPackage({ consumer, root, major, privateResourceHashes, evidenceName = 'ore-external-server-contracts' }) {
  assert(major === 18 || major === 19); assert(/^[a-z0-9-]{1,80}$/.test(evidenceName));
  assert(privateResourceHashes?.[Symbol.iterator], 'Forward the complete private-resource hash set from the root package verifier');
  const supplied = [...privateResourceHashes]; assert(supplied.length > 0 && supplied.every(value => typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value)));
  const hashes = [...new Set(supplied.map(value => value.toLowerCase()))]; consumer = path.resolve(consumer); root = path.resolve(root);
  const directory = path.join(consumer, evidenceName); await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'consumer.tsx'), typed);
  await fs.writeFile(path.join(directory, 'worker.mjs'), '(' + installedWorker.toString() + ')().catch(error=>{console.error(error);process.exitCode=1;});');
  await fs.writeFile(path.join(directory, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', lib: ['ES2022', 'DOM', 'DOM.Iterable'],
    module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: true }, include: ['consumer.tsx'] }, null, 2));
  const config = path.join(directory, 'config.json'); await fs.writeFile(config, JSON.stringify({ root, consumer, major, directory, privateResourceHashes: hashes }, null, 2));
  async function run(args, file) {
    try { const output = execFileSync(process.execPath, args, { cwd: consumer, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true }); await fs.writeFile(path.join(directory, file), output); }
    catch (error) { await fs.writeFile(path.join(directory, file), String(error.stdout ?? '') + '\n' + String(error.stderr ?? error.stack)); throw error; }
  }
  await run([path.join(directory, 'worker.mjs'), config], 'SSR.txt');
  await run([path.join(root, 'node_modules/typescript/bin/tsc'), '--project', path.join(directory, 'tsconfig.json')], 'TYPECHECK.txt');
  const result = { ...JSON.parse(await fs.readFile(path.join(directory, 'SSR.json'), 'utf8')), strictTypes: true,
    negativeTypeContracts: (typed.match(/@ts-expect-error/g) ?? []).length, typedFixtureSHA256: createHash('sha256').update(typed).digest('hex'), status: 'PASS_INSTALLED_ORE_EXTERNAL_SERVER_ESM_SSR_TYPES_HOST_ASSETS_CSS' };
  await fs.writeFile(path.join(directory, 'RESULT.json'), JSON.stringify(result, null, 2));
  console.log(`React ${major}: installed Ore external server ${result.checks.length} SSR / ${result.negativeTypeContracts} strict-negative types / host assets / source CSS PASS`); return result;
}
