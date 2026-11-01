import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const runtimeExports = ['CreditsScreen', 'CreditsRoll', 'CreditsSkipButton', 'layoutCredits'];
const privateExports = ['CreditsSession', 'parseCreditsSections', 'parseCreditsContent', 'tokenizeCreditsText',
  'copyCreditsSnapshot', 'copyCreditsSurface', 'creditsSurfaceFrame', 'creditsFinite', 'createCreditsClock', 'stepCreditsClock',
  'CREDITS_COVER_MS', 'CREDITS_SKIP_WAIT_MS'];
const cssFiles = ['credits-screen.css', 'credits-roll.css', 'credits-skip-button.css'];
const roles = ['section', 'discipline', 'title', 'name', 'poem', 'quote'];
const typeNames = ['CreditsTitleGroup', 'CreditsDiscipline', 'CreditsSectionData', 'CreditsContent', 'CreditsTextRole', 'CreditsPath',
  'CreditsSourceSpan', 'CreditsBitmapFace', 'CreditsMissingGlyphPolicy', 'CreditsCssFace', 'CreditsDirectFontSource', 'CreditsFontSource',
  'CreditsTextStyle', 'CreditsBlockSpacing', 'CreditsColorCode', 'CreditsMarkupPolicy', 'CreditsLayoutLimits', 'CreditsDecoration',
  'CreditsLayoutProfile', 'CreditsWholeImage', 'CreditsStage', 'CreditsRollPlan', 'CreditsLayoutBindings', 'CreditsTextToken',
  'CreditsLayoutRun', 'CreditsLayoutLine', 'CreditsLayoutParagraph', 'CreditsLayoutNode', 'CreditsLayoutImage', 'CreditsLayoutStage',
  'CreditsLayoutUsage', 'CreditsLayout', 'CreditsLayoutRequest', 'CreditsSurfaceProfile', 'CreditsPresentationProfile',
  'CreditsFactorySnapshot', 'CreditsScreenSnapshot', 'CreditsActionDetail', 'CreditsLifecycleDetail', 'CreditsControllerCommand',
  'CreditsControllerHandle', 'CreditsPlaybackScreenProps', 'CreditsControlledScreenProps', 'CreditsScreenProps', 'CreditsRollProps',
  'CreditsSkipActionDetail', 'CreditsSkipButtonProps'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

/** Self-authored content/metrics/art URLs: independent finite Web expectations,
 * never original staff/poem/font/image bytes or a claimed native preset. */
function fixture() {
  const font = { kind: 'css-face', family: 'Authored package face', fontSize: 8, metricsId: 'package-two-units-per-codepoint', measureText: value => [...value].length * 2 };
  const style = { font, lineHeight: 10, letterSpacing: 0, color: '#ffffff', shadow: null };
  const block = { before: 0, after: 0, insetStart: 0, insetEnd: 0 };
  const image = { src: '/authored-whole-image.png', naturalSize: [2, 3], displaySize: [4, 6], alt: 'Authored brand', provenance: 'authored-package-whole-image' };
  const profile = { viewport: { size: [100, 60], contentWidth: 80, contentX: 10 },
    styles: Object.fromEntries(roles.map(role => [role, { ...style }])), blocks: Object.fromEntries(roles.map(role => [role, { ...block }])),
    emptyDiscipline: 'omit-and-collapse', emptyTitle: 'omit-and-collapse', paragraphs: 'hard-lines', paragraphGap: 0,
    paragraphBlankLines: 'retain', wrap: 'preserve-lines', longWord: 'error', horizontalWhitespace: 'preserve', wrapWhitespace: 'retain',
    textAlign: { section: 'center', discipline: 'center', title: 'left', name: 'left', poem: 'left', quote: 'left' }, gatedStageSpacing: 'omit',
    markup: { roles: ['poem', 'quote'], colors: { '2': '#00aa00', '3': '#00aaaa', '7': '#aaaaaa', a: '#55ff55', b: '#55ffff', f: '#ffffff' },
      obfuscated: { alphabet: 'AB', periodMs: 100, seed: 2, preserveAdvance: true }, colorResetsObfuscated: true, resetCode: 'r',
      playerNameToken: { token: 'PLAYERNAME', replacement: 'literal-all' }, unknownCode: 'literal' },
    limits: { maxSections: 20, maxDisciplines: 40, maxTitles: 100, maxNames: 200, maxInputUnits: 20000, maxExpandedUnits: 20000,
      maxTokens: 10000, maxParagraphs: 1000, maxLines: 2000, maxRuns: 4000, maxStages: 20, maxFontGlyphs: 1000,
      maxMeasureCalls: 10000, maxMeasuredUnits: 100000, maxContentHeight: 100000 }, provenance: 'host-resolved-web-profile', evidenceId: 'authored-package-layout' };
  const content = { sections: [{ section: 'Host section', disciplines: [{ discipline: '', titles: [{ title: 'Host role', names: ['First name', 'Second name'] }] }] }],
    endPoem: '§3Hello PLAYERNAME\n§kAB', quote: '§fAuthored quote §7suffix' };
  const plan = { stages: [
    { id: 'primary', kind: 'brand', brand: 'primary', image, align: 'center', before: 0, after: 2 },
    { id: 'staff', kind: 'staff', before: 0, after: 0 }, { id: 'poem', kind: 'end-poem', before: 3, after: 4 },
    { id: 'quote', kind: 'quote', before: 5, after: 6 }, { id: 'education', kind: 'brand', brand: 'education', image: { ...image, alt: 'Authored education' }, align: 'center', before: 7, after: 8 }
  ], initialLead: 9, completionGap: 11 };
  const bindings = { showEduIcon: true, showEndPoem: true, playerName: 'HostPlayer', scrollFaster: false };
  const presentation = { id: 'authored-package-screen', evidenceId: 'authored-package-screen-evidence', layout: profile, plan,
    surface: { background: { image, tileSize: [4, 6], logicalSize: [100, 120], from: [0, 0], to: [0, -60], durationMs: 1000 },
      edgeMask: { kind: 'none' }, coverPlacement: 'below-content' }, logicalUnitsPerSecond: 10, fasterMultiplier: 3,
    skipLabelStyle: style, rasterPositioning: 'physical-floor', imageSampling: 'point', completion: 'web-scroll-end-then-fade',
    input: { escape: 'reveal-then-exit', enter: 'reveal-skip', repeat: 'ignore', focus: 'host' } };
  const snapshot = { introAgeMs: 3000, backgroundElapsedMs: 500, skipButtonVisible: true,
    factory: { skipPanel: { instanceId: 'panel:a', button: { generation: 'child:b', ageMs: 0 }, exitInputActive: true }, fadeOut: { instanceId: 'outro', ageMs: 1500 } } };
  return { font, style, image, profile, content, plan, bindings, presentation, snapshot };
}

function fallbackFixture() {
  const data = fixture();
  const face = (name, entries, scale) => ({ kind: 'bitmap', font: { pages: [`/authored-${name}-atlas.png`], lineHeight: 8,
    glyphs: Object.fromEntries(Object.entries(entries).map(([key, advance]) => [key, { page: 0, x: 0, y: 0, width: 1, height: 1, advance }])) },
  scale, sampling: 'point', shader: 'bitmap', renderProfile: 'atlas-rect' });
  const primary = face('primary', { A: 3 }, 2), fallback = face('fallback', { '😀': 10, '好': 8, '?': 4 }, .5);
  const font = { kind: 'bitmap-fallback', faces: [primary, fallback], missingGlyph: { kind: 'replacement', character: '?' } };
  data.content = { sections: [], endPoem: 'A😀好A', quote: '' };
  data.plan = { stages: [{ id: 'staff', kind: 'staff', before: 0, after: 0 }, { id: 'poem', kind: 'end-poem', before: 0, after: 0 }], initialLead: 0, completionGap: 0 };
  data.profile.styles = Object.fromEntries(roles.map(role => [role, { ...data.style, font, letterSpacing: 1 }]));
  data.profile.markup.roles = [];
  return { ...data, primary, fallback, fallbackFont: font };
}

function opening(html, className) {
  const result = [...html.matchAll(/<[a-z][^>]*>/g)].find(match => /\bclass="([^"]*)"/.exec(match[0])?.[1].split(/\s+/).includes(className));
  assert(result, `Missing actual SSR element ${className}`); return result[0];
}

function typedFixture() {
  const data = fixture();
  const profile = JSON.stringify({ ...data.profile, styles: Object.fromEntries(roles.map(role => [role, { ...data.profile.styles[role], font: '__CREDITS_CSS_FONT__' }])) }).replaceAll('"__CREDITS_CSS_FONT__"', 'cssFont');
  const presentation = JSON.stringify({ ...data.presentation, layout: '__CREDITS_LAYOUT__', plan: '__CREDITS_PLAN__', skipLabelStyle: '__CREDITS_STYLE__' })
    .replaceAll('"__CREDITS_LAYOUT__"', 'layout').replaceAll('"__CREDITS_PLAN__"', 'plan').replaceAll('"__CREDITS_STYLE__"', 'labelStyle');
  return `import {createRef} from 'react';
import {CreditsScreen,CreditsRoll,CreditsSkipButton,layoutCredits} from 'mcbeui';
import type {${typeNames.join(',')}} from 'mcbeui';
const cssFont:CreditsCssFace={kind:'css-face',family:'Authored type face',fontSize:8,metricsId:'authored-type-metrics',measureText:text=>[...text].length*2};
const layout:CreditsLayoutProfile=${profile};
const plan:CreditsRollPlan=${JSON.stringify(data.plan)};
const labelStyle:CreditsTextStyle={font:cssFont,lineHeight:10,letterSpacing:0,color:'#fff',shadow:null};
const presentation:CreditsPresentationProfile=${presentation};
const content:CreditsContent=${JSON.stringify(data.content)};
const bindings:CreditsLayoutBindings & {scrollFaster:boolean}=${JSON.stringify(data.bindings)};
const snapshot:CreditsScreenSnapshot=${JSON.stringify(data.snapshot)};
const close=(detail:CreditsActionDetail)=>{const control:HTMLElement=detail.control;const current:HTMLElement|undefined=detail.event?.currentTarget;return control.tagName+(current?.tagName??'');};
const lifecycle=(detail:CreditsLifecycleDetail)=>{if(detail.kind==='scroll_end'){const offset:number=detail.offset;return offset;}if(detail.kind==='destroy-skip-child')return detail.buttonGeneration;return detail.fadeOutInstanceId;};
const common={runKey:'authored-types',content,profile:presentation,bindings,scale:2,skipLabel:'Skip types',onCloseRequested:close,onLifecycle:lifecycle};
const playback:CreditsPlaybackScreenProps={...common,playback:{playing:true,initialOffset:-10,hiddenPolicy:'pause'}};
const controlled:CreditsControlledScreenProps={...common,mode:'controlled-source',position:{offset:12,elapsedMs:500},snapshot};
const screenUnion:CreditsScreenProps=Math.random()>.5?playback:controlled;
const controller=createRef<CreditsControllerHandle>();
const cleanupRef=(node:HTMLElement|null)=>{if(node)node.dataset.package='typed';return()=>{};};
const rollProps:CreditsRollProps={content,profile:layout,plan,bindings,offset:0,elapsedMs:0,scale:2,rasterPositioning:'physical-floor',imageSampling:'point',onLayout:value=>{const height:number=value.contentHeight;return height;},onRenderError:(error,where)=>error.message+where.lineIndex};
const skipProps:CreditsSkipButtonProps={label:'Skip types',labelStyle,scale:2,onAction:detail=>{const control:HTMLButtonElement=detail.event.currentTarget;return control.disabled;},onClick:event=>{const control:HTMLButtonElement=event.currentTarget;return control.disabled;}};
export const nodes=<><CreditsScreen {...screenUnion} ref={cleanupRef} controllerRef={controller} viewportRef={node=>{if(node)node.dataset.viewport='actual';return()=>{};}} skipRef={createRef<HTMLButtonElement>()} onAction={detail=>detail.target==='button.show_skip'?false:undefined} onKeyDown={event=>{const control:HTMLElement=event.currentTarget;return control.tagName;}}/><CreditsScreen {...controlled} ref={createRef<HTMLElement>()}/><CreditsRoll {...rollProps} ref={createRef<HTMLDivElement>()}/><CreditsSkipButton {...skipProps} ref={node=>{if(node)node.dataset.skip='actual';return()=>{};}}/></>;
export const model:CreditsLayout=layoutCredits({content,profile:layout,plan,bindings});
export const command=()=>controller.current?.request({fromButtonId:'button.menu_cancel',destination:'skip-panel-input'});
const direct:CreditsDirectFontSource={kind:'bitmap',font:{pages:['/host.png'],lineHeight:8,glyphs:{A:{page:0,x:0,y:0,width:1,height:1,advance:3}}},scale:2,sampling:'point',shader:'bitmap',renderProfile:'atlas-rect'};
const fallback:CreditsFontSource={kind:'bitmap-fallback',faces:[direct],missingGlyph:{kind:'replacement',character:'A'}};
export const fallbackLayout:CreditsLayoutProfile={...layout,styles:{...layout.styles,name:{...labelStyle,font:fallback}}};
// @ts-expect-error A complete Screen needs an explicit presentation profile.
const missingProfile:CreditsScreenProps={runKey:'x',content,bindings,scale:1,skipLabel:'Skip',playback:{playing:true,initialOffset:0,hiddenPolicy:'pause'},onCloseRequested:close};
// @ts-expect-error Navigation/close requests require the host callback.
const missingClose:CreditsPlaybackScreenProps={runKey:'x',content,profile:presentation,bindings,scale:1,skipLabel:'Skip',playback:{playing:true,initialOffset:0,hiddenPolicy:'pause'}};
// @ts-expect-error Playback state is required in the ordinary branch.
const missingPlayback:CreditsPlaybackScreenProps={...common};
// @ts-expect-error Controlled-source mode requires the full snapshot.
const missingSnapshot:CreditsControlledScreenProps={...common,mode:'controlled-source',position:{offset:0,elapsedMs:0}};
// @ts-expect-error Controlled-source mode requires independent position/time.
const missingPosition:CreditsControlledScreenProps={...common,mode:'controlled-source',snapshot};
// @ts-expect-error Mode-specific playback fields cannot enter the controlled branch.
const mixedModes:CreditsControlledScreenProps={...controlled,playback:{playing:true,initialOffset:0,hiddenPolicy:'pause'}};
// @ts-expect-error A source panel must explicitly include null or a child snapshot.
const missingButton:CreditsFactorySnapshot={skipPanel:{instanceId:'p',exitInputActive:true},fadeOut:null};
// @ts-expect-error Original controller mappings are a bounded union.
const badCommand:CreditsControllerCommand={fromButtonId:'button.fake',destination:'whole-screen'};
// @ts-expect-error CSS metrics are synchronous numbers, not async render/measurement providers.
const asyncMetrics:CreditsCssFace={...cssFont,measureText:async text=>text.length};
// @ts-expect-error A bitmap fallback chain does not delegate to a CSS or whole renderer.
const badFace:CreditsFontSource={kind:'bitmap-fallback',faces:[cssFont],missingGlyph:{kind:'error'}};
// @ts-expect-error Output runs have resolved direct faces, never unresolved fallback chains.
const unresolvedRunFont:CreditsDirectFontSource={kind:'bitmap-fallback',faces:[direct],missingGlyph:{kind:'error'}};
// @ts-expect-error Source layout binding flags/name are complete, not inferred.
const missingBinding:CreditsLayoutBindings={showEduIcon:true,showEndPoem:false};
// @ts-expect-error Screen renders the content; it has no replacement-renderer slot.
const injectedRenderer:CreditsScreenProps={...playback,renderCredits:()=>null};
// @ts-expect-error Skip's native button type is reserved.
const badButton:CreditsSkipButtonProps={...skipProps,type:'submit'};
// @ts-expect-error Fresh public Roll props reject opaque children; JSX spread is not an excess-property gate.
const children:CreditsRollProps={...rollProps,children:<span>Opaque replacement</span>};
export type AllCreditsTypes=[${typeNames.join(',')}];
`;
}

/** Runs only after the main verifier has built/packed/installed a fresh tar.
 * It never builds or installs, and never aliases the source as a consumer. */
export async function verifyCreditsPackage({ consumer, root, major }) {
  const require = createRequire(join(consumer, 'package.json'));
  const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
  const expected = { 18: '18.3.1', 19: '19.3.1' }[major];
  assert(expected, `Unsupported Credits peer ${major}`); assert.equal(React.version, expected);
  const reactDom = require('react-dom/package.json').version;
  assert.equal(reactDom, expected);
  const peerTypes = require('@types/react/package.json').version;
  assert.equal(peerTypes.split('.')[0], String(major));
  const packageRoot = join(consumer, 'node_modules', 'mcbeui');
  const packageJSON = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  assert.equal(packageJSON.exports['.'].import, './dist/index.js');
  assert.equal(packageJSON.exports['.'].types, './dist/index.d.ts');
  const attempts = [], saved = new Map(), warnings = [], originalError = console.error;
  for (const name of ['fetch', 'Image', 'createImageBitmap', 'OffscreenCanvas', 'XMLHttpRequest', 'requestAnimationFrame', 'setTimeout', 'setInterval']) {
    saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, value: function () { attempts.push(name); throw new Error(`Credits import/SSR invoked ${name}`); } });
  }
  console.error = (...args) => warnings.push(args.map(String).join(' '));
  const effects = { semanticCallbacks: 0, refs: 0 }, ssr = [], layouts = [], invalid = [];
  const callback = () => { effects.semanticCallbacks++; throw new Error('Credits SSR invoked a semantic/layout/error callback'); };
  const ref = () => { effects.refs++; throw new Error('Credits SSR attached a ref'); };
  let ui;
  try {
    ui = await import(pathToFileURL(join(packageRoot, 'dist/index.js')).href);
    for (const name of runtimeExports) assert(ui[name], `Missing installed public export ${name}`);
    assert.equal(typeof ui.layoutCredits, 'function');
    for (const name of privateExports) assert(!Object.hasOwn(ui, name), `Private Credits helper exported: ${name}`);
    const render = (name, Component, props, inspect) => { const html = renderToStaticMarkup(React.createElement(Component, props)); inspect?.(html); ssr.push(name); return html; };
    const model = (name, request, inspect) => { const result = ui.layoutCredits({ content: request.content, profile: request.profile, plan: request.plan, bindings: request.bindings }); inspect(result); layouts.push(name); return result; };
    const rejects = (name, fn) => { assert.throws(fn, undefined, name); invalid.push(name); };
    const data = fixture(), before = JSON.stringify(data), roll = { content: data.content, profile: data.profile, plan: data.plan, bindings: data.bindings,
      offset: 0, elapsedMs: 0, scale: 2, rasterPositioning: 'physical-floor', imageSampling: 'point', ref, viewportRef: ref, onLayout: callback, onRenderError: callback };
    model('ordered-complete-authored-stages-and-geometry', roll, value => {
      assert.deepEqual(value.stages.map(stage => stage.id), ['primary', 'staff', 'poem', 'quote', 'education']);
      assert.equal(value.nodes.length, 7); assert.equal(value.lines.length, 7); assert.equal(value.contentHeight, 126); assert.equal(value.completionOffset, 137);
      assert.deepEqual(value.lines.filter(line => line.role === 'name').map(line => [line.text, line.x, line.y]), [['First name', 10, 37], ['Second name', 10, 47]]);
      assert.equal(value.lines.find(line => line.role === 'section').x, 38); assert.equal(value.trace.nativeCertified, false);
    });
    render('roll-fixed-viewport-transcript-stage-order', ui.CreditsRoll, { ...roll, style: { width: 999, height: 999, overflow: 'scroll' } }, html => {
      const tag = opening(html, 'mc-credits-roll'); assert(tag.includes('width:200px;height:120px')); assert(tag.includes('overflow:hidden')); assert(!tag.includes('999'));
      assert(html.includes('<h2>Host section</h2>')); assert(html.includes('data-text-role="name">First name')); assert(html.includes('data-native-certified="false"'));
      const transcript = html.slice(html.indexOf('class="mc-credits-roll__transcript"'));
      assert(transcript.indexOf('Authored brand') < transcript.indexOf('Host section')); assert(transcript.indexOf('Second name') < transcript.indexOf('Hello HostPlayer')); assert(transcript.indexOf('Hello HostPlayer') < transcript.indexOf('Authored quote'));
    });
    for (const showEndPoem of [false, true]) for (const showEduIcon of [false, true]) {
      const bindings = { ...data.bindings, showEndPoem, showEduIcon };
      model(`independent-stage-gates-${showEndPoem}-${showEduIcon}`, { ...roll, bindings }, value => {
        assert.equal(value.stages.find(stage => stage.id === 'poem').active, showEndPoem); assert.equal(value.stages.find(stage => stage.id === 'education').active, showEduIcon);
        assert.equal(value.stages.find(stage => stage.id === 'quote').active, true); assert.equal(value.contentHeight, 78 + (showEndPoem ? 27 : 0) + (showEduIcon ? 21 : 0));
      });
      render(`roll-stage-gates-${showEndPoem}-${showEduIcon}`, ui.CreditsRoll, { ...roll, bindings }, html => {
        const transcript = html.slice(html.indexOf('class="mc-credits-roll__transcript"'));
        assert.equal(transcript.includes('Hello HostPlayer'), showEndPoem); assert.equal(transcript.includes('Authored education'), showEduIcon); assert(transcript.includes('Authored quote'));
      });
    }
    render('literal-player-markup-remains-escaped', ui.CreditsRoll, { ...roll, bindings: { ...data.bindings, playerName: '§b<Host>PLAYERNAME😀' } }, html => {
      const transcript = html.slice(html.indexOf('class="mc-credits-roll__transcript"'));
      assert(transcript.includes('Hello §b&lt;Host&gt;PLAYERNAME😀')); assert(!html.includes('<Host>')); assert(!transcript.includes('§3Hello')); assert(!transcript.includes('§kAB'));
    });
    const common = { runKey: 'package-run', content: data.content, profile: data.presentation, bindings: data.bindings, scale: 2, skipLabel: 'Skip package',
      ref, controllerRef: ref, viewportRef: ref, skipRef: ref, onAction: callback, onLifecycle: callback, onCloseRequested: callback, onRenderError: callback };
    for (const playing of [false, true]) for (const scrollFaster of [false, true]) render(`screen-playback-${playing}-${scrollFaster}`, ui.CreditsScreen,
      { ...common, playback: { playing, initialOffset: -12, hiddenPolicy: 'pause' }, bindings: { ...data.bindings, scrollFaster } }, html => {
        assert(opening(html, 'mc-credits-screen').includes('width:200px;height:120px')); assert(html.includes('data-offset="-12"')); assert(html.includes('data-cover="intro" data-cover-opacity="1"')); assert(!html.includes('data-credits-skip-owner'));
      });
    render('screen-controlled-full-independent-factory-snapshot', ui.CreditsScreen, { ...common, mode: 'controlled-source', position: { offset: 12, elapsedMs: 500 }, snapshot: data.snapshot,
      profile: { ...data.presentation, input: { ...data.presentation.input, focus: 'web-modal' } } }, html => {
      assert(html.includes('aria-modal="true"')); assert(html.includes('role="dialog"')); assert(html.includes('data-offset="12"')); assert(html.includes('data-cover="intro" data-cover-opacity="0"')); assert(html.includes('data-cover="outro" data-cover-opacity="0.5"'));
      const button = opening(html, 'mc-credits-skip'); assert(button.includes('width:60px;height:32px')); assert(button.includes('aria-label="Skip package"')); assert(!button.includes(' hidden'));
    });
    render('screen-parent-input-retained-after-child-absence', ui.CreditsScreen, { ...common, mode: 'controlled-source', position: { offset: 0, elapsedMs: 0 },
      snapshot: { ...data.snapshot, factory: { skipPanel: { instanceId: 'parent-only', button: null, exitInputActive: true }, fadeOut: null } } }, html => assert(!html.includes('data-credits-skip-owner')));
    for (const locked of [false, true]) render(`skip-form-fit-${locked}`, ui.CreditsSkipButton,
      { label: 'Skip package', labelStyle: data.style, scale: 2, disabled: locked, ref, onAction: callback, onRenderError: callback }, html => {
        const button = opening(html, 'mc-credits-skip'); assert(button.includes('width:60px;height:32px')); assert.equal(button.includes(' disabled=""'), locked); assert(button.includes('type="button"'));
        assert(html.includes('data-source-label-shadow="false"')); assert(html.includes('data-logical-label-size="24,10"'));
      });
    const fallback = fallbackFixture();
    model('fallback-mixed-real-faces-scales-and-spacing', fallback, value => {
      assert.equal(value.lines[0].width, 24); assert.deepEqual(value.lines[0].runs.map(run => [run.text, run.font.font.pages[0], run.x, run.width]),
        [['A', '/authored-primary-atlas.png', 10, 7], ['😀好', '/authored-fallback-atlas.png', 17, 11], ['A', '/authored-primary-atlas.png', 28, 6]]);
      assert.deepEqual(value.lines[0].runs.flatMap(run => run.characters).map(character => character.advance), [7, 6, 5, 6]);
    });
    render('roll-fallback-real-font-canvas-SSR-no-decode', ui.CreditsRoll, { ...roll, content: fallback.content, profile: fallback.profile, plan: fallback.plan, bindings: fallback.bindings }, html => {
      assert(html.includes('<canvas')); assert(html.includes('data-text-role="poem">A😀好A')); assert(opening(html, 'mc-credits-roll').includes('width:200px;height:120px'));
    });
    const shape = fixture(); shape.content = { sections: [], endPoem: 'fi', quote: '' }; shape.plan = { stages: [{ id: 'staff', kind: 'staff', before: 0, after: 0 }, { id: 'poem', kind: 'end-poem', before: 0, after: 0 }], initialLead: 0, completionGap: 0 };
    shape.profile.styles = Object.fromEntries(roles.map(role => [role, { ...shape.style, font: { ...shape.font, measureText: text => text === 'fi' ? 3 : [...text].length * 2 } }]));
    model('CSS-whole-run-shaping', shape, value => { assert.equal(value.lines[0].width, 3); assert.equal(value.lines[0].runs.length, 1); assert.deepEqual(value.lines[0].runs[0].characters.map(character => character.advance), [2, 1]); });
    const rejectRender = (name, Component, props) => rejects(name, () => renderToStaticMarkup(React.createElement(Component, props)));
    rejectRender('screen-missing-explicit-profile', ui.CreditsScreen, { ...common, profile: undefined, playback: { playing: true, initialOffset: 0, hiddenPolicy: 'pause' } });
    rejectRender('screen-missing-host-close-callback', ui.CreditsScreen, { ...common, onCloseRequested: undefined, playback: { playing: true, initialOffset: 0, hiddenPolicy: 'pause' } });
    rejectRender('controlled-panel-missing-required-button', ui.CreditsScreen, { ...common, mode: 'controlled-source', position: { offset: 0, elapsedMs: 0 }, snapshot: { ...data.snapshot, factory: { skipPanel: { instanceId: 'p', exitInputActive: true }, fadeOut: null } } });
    rejectRender('controlled-negative-age', ui.CreditsScreen, { ...common, mode: 'controlled-source', position: { offset: 0, elapsedMs: 0 }, snapshot: { ...data.snapshot, introAgeMs: -1 } });
    rejectRender('screen-invalid-clock-rate', ui.CreditsScreen, { ...common, profile: { ...data.presentation, logicalUnitsPerSecond: Infinity }, playback: { playing: true, initialOffset: 0, hiddenPolicy: 'pause' } });
    for (const [name, patch] of [['nonfinite-offset', { offset: Infinity }], ['fractional-scale', { scale: 1.5 }], ['missing-raster-policy', { rasterPositioning: undefined }]]) rejectRender(`roll-${name}`, ui.CreditsRoll, { ...roll, ...patch });
    rejectRender('skip-multiline-label', ui.CreditsSkipButton, { label: 'Skip\nline', labelStyle: data.style, scale: 1 });
    rejectRender('skip-unbounded-label-box', ui.CreditsSkipButton, { label: 'Skip', labelStyle: data.style, labelSize: [20, 11], scale: 1 });
    rejects('layout-missing-one-staff-stage', () => ui.layoutCredits({ ...roll, plan: { ...data.plan, stages: data.plan.stages.filter(stage => stage.kind !== 'staff') } }));
    rejects('layout-invalid-CSS-async-metrics', () => ui.layoutCredits({ ...roll, profile: { ...data.profile, styles: { ...data.profile.styles, section: { ...data.style, font: { ...data.font, measureText: async () => 1 } } } } }));
    rejects('fallback-over-sixteen-faces', () => ui.layoutCredits({ ...fallback, profile: { ...fallback.profile, styles: { ...fallback.profile.styles, poem: { ...fallback.profile.styles.poem, font: { ...fallback.fallbackFont, faces: Array(17).fill(fallback.primary) } } } } }));
    assert.equal(JSON.stringify(data), before, 'Import/SSR/layout must not mutate caller data');
    assert.deepEqual(effects, { semanticCallbacks: 0, refs: 0 }); assert.deepEqual(attempts, []); assert.deepEqual(warnings, []);
  } finally {
    console.error = originalError;
    for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  }
  const css = [];
  for (const filename of cssFiles) {
    assert.equal(packageJSON.exports[`./${filename}`], `./dist/${filename}`);
    const actual = await readFile(require.resolve(`mcbeui/${filename}`)), source = await readFile(join(root, 'src', filename));
    assert(actual.equals(source), `Installed Credits stylesheet bytes differ: ${filename}`); css.push({ filename, bytes: actual.length, sha256: digest(actual) });
  }
  const typed = typedFixture(), negativeContracts = (typed.match(/@ts-expect-error/g) ?? []).length;
  assert.equal(negativeContracts, 15);
  await writeFile(join(consumer, 'credits-consumer.tsx'), typed);
  execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--skipLibCheck', 'false', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2022', '--jsx', 'react-jsx', 'credits-consumer.tsx'], { cwd: consumer, encoding: 'utf8' });
  const report = { status: 'PASS_ACTUAL_INSTALLED_CREDITS_CONSUMER', react: React.version, reactDom, peerTypes,
    runtimeExports, privateHelpersAbsent: privateExports, ssrGroups: ssr, layoutGroups: layouts, runtimeInvalidContracts: invalid,
    semanticCallbacks: effects.semanticCallbacks, refs: effects.refs, ioTimersDecodeAttempts: attempts, warnings,
    css, declarations: { bareInstalledPackage: true, sourceAliases: false, moduleResolution: 'NodeNext', strict: true, skipLibCheck: false, importedPublicTypes: typeNames.length, negativeContracts },
    scope: 'Actual installed tar and peers; authored finite Web fixtures. No mounted interaction, native GUI/pixel/font/timing or installed-browser qualification.' };
  await writeFile(join(consumer, 'credits-verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`React ${React.version}: installed Credits3/layout ESM, SSR ${ssr.length}, layout ${layouts.length}, invalid ${invalid.length}, CSS ${css.length}, strict installed declarations/${negativeContracts} negative contracts PASS`);
  return report;
}
