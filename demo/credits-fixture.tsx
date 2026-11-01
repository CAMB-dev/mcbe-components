import { StrictMode, createRef } from 'react';
import type { RefCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { CreditsRoll } from '../src/credits-roll';
import type { CreditsRollProps } from '../src/credits-roll';
import type { CreditsFontSource, CreditsLayoutLimits, CreditsLayoutProfile, CreditsTextRole } from '../src/credits-types';
import '../src/credits-roll.css';

interface FixtureOptions {
  mode: 'bitmap' | 'css'; scale: number; offset: number; elapsedMs: number;
  shadow: boolean; brand: boolean; poem: boolean; playerName: string;
  pageSource: string; oversizeGlyph: boolean; positioning: 'physical-floor' | 'css-subpixel';
}
interface CreditsFixtureQA {
  configure(patch: Partial<FixtureOptions>): void;
  unmount(): void;
  getRoot(): HTMLDivElement | null;
  getErrors(): readonly { message: string; lineIndex: number; runIndex: number }[];
  glyphPage: string;
}
declare global { interface Window { __creditsRollQA: CreditsFixtureQA } }

const roles: readonly CreditsTextRole[] = ['section', 'discipline', 'title', 'name', 'poem', 'quote'];
const limits: CreditsLayoutLimits = { maxSections: 20, maxDisciplines: 40, maxTitles: 100, maxNames: 200,
  maxInputUnits: 20000, maxExpandedUnits: 20000, maxTokens: 10000, maxParagraphs: 1000, maxLines: 2000,
  maxRuns: 4000, maxStages: 20, maxFontGlyphs: 1000, maxMeasureCalls: 10000, maxMeasuredUnits: 100000, maxContentHeight: 100000 };
const source = document.createElement('canvas'); source.width = 2; source.height = 6;
const context = source.getContext('2d'); if (!context) throw new Error('Fixture Canvas2D unavailable.');
context.fillStyle = '#ffffff'; context.fillRect(0, 0, 2, 6);
const glyphPage = source.toDataURL('image/png');
const rootRef = createRef<HTMLDivElement>();
const errors: { message: string; lineIndex: number; runIndex: number }[] = [];
const viewportRef: RefCallback<HTMLDivElement> = node => {
  if (!node) return;
  node.dataset.consumerViewportRef = 'attached';
  document.getElementById('ref-status')!.textContent = 'Viewport attached';
  return () => { document.getElementById('ref-status')!.textContent = 'Viewport released'; };
};
let options: FixtureOptions = { mode: 'bitmap', scale: 3, offset: 0, elapsedMs: 0, shadow: false, brand: false,
  poem: false, playerName: 'Host player', pageSource: '', oversizeGlyph: false, positioning: 'physical-floor' };

function propsFor(value: FixtureOptions): CreditsRollProps {
  const cssContext = document.createElement('canvas').getContext('2d');
  if (!cssContext) throw new Error('Fixture CSS metrics unavailable.');
  cssContext.font = '8px monospace';
  const font: CreditsFontSource = value.mode === 'bitmap' ? { kind: 'bitmap',
    font: { pages: [value.pageSource || glyphPage], lineHeight: 6,
      glyphs: { A: { page: 0, x: 0, y: 0, width: value.oversizeGlyph ? 3 : 2, height: 6, advance: 3 } } },
    scale: 2, sampling: 'point', shader: 'bitmap', renderProfile: 'atlas-rect', missingGlyph: { kind: 'error' } }
    : { kind: 'css-face', family: 'monospace', fontSize: 8, metricsId: 'fixture-browser-canvas-monospace8', measureText: text => cssContext.measureText(text).width };
  const styles = Object.fromEntries(roles.map(role => [role, { font, lineHeight: 12, letterSpacing: 0, color: '#ffffff',
    shadow: value.shadow ? { x: 1, y: 1, color: '#000000' } : null }])) as CreditsLayoutProfile['styles'];
  const profile: CreditsLayoutProfile = { viewport: { size: [100, 30], contentWidth: 80, contentX: 10 }, styles,
    blocks: Object.fromEntries(roles.map(role => [role, { before: 0, after: 0, insetStart: role === 'name' ? 2 : 0, insetEnd: 0 }])) as CreditsLayoutProfile['blocks'],
    emptyDiscipline: 'omit-and-collapse', emptyTitle: 'omit-and-collapse', paragraphs: 'hard-lines', paragraphGap: 0,
    paragraphBlankLines: 'collapse', wrap: 'word', longWord: 'break-word', horizontalWhitespace: 'preserve', wrapWhitespace: 'discard-at-break',
    textAlign: Object.fromEntries(roles.map(role => [role, role === 'section' ? 'center' : 'left'])) as CreditsLayoutProfile['textAlign'],
    gatedStageSpacing: 'omit', markup: { roles: ['poem', 'quote'], colors: { '2': '#00aa00', '3': '#00aaaa', '7': '#aaaaaa', a: '#55ff55', b: '#55ffff', f: '#ffffff' },
      obfuscated: { alphabet: 'AB', periodMs: 100, seed: 2, preserveAdvance: true }, colorResetsObfuscated: true, resetCode: 'r',
      playerNameToken: { token: 'PLAYERNAME', replacement: 'literal-all' }, unknownCode: 'literal' }, limits: { ...limits },
    provenance: 'host-resolved-web-profile', evidenceId: 'authored-browser-fixture-not-minecraft-art' };
  return { content: { sections: [{ section: value.mode === 'css' ? 'Host section' : '', disciplines: [{ discipline: value.mode === 'css' ? 'Host discipline' : '',
    titles: [{ title: value.mode === 'css' ? 'Host role' : '', names: value.mode === 'css' ? ['Host One', 'Host Two'] : ['A'] }] }] }],
    endPoem: '§3Hello PLAYERNAME\n§kAB', quote: value.mode === 'css' ? 'Host quote' : '' }, profile,
    plan: { stages: [...(value.brand ? [{ id: 'brand', kind: 'brand' as const, brand: 'primary' as const, align: 'center' as const, before: 0, after: 0,
      image: { src: glyphPage, naturalSize: [2, 6] as const, displaySize: [4, 12] as const, alt: 'Host brand', provenance: 'authored-test-two-by-six-png' } }] : []),
      { id: 'staff', kind: 'staff', before: 0, after: 0 }, ...(value.poem ? [{ id: 'poem', kind: 'end-poem' as const, before: 0, after: 0 }] : []),
      ...(value.mode === 'css' ? [{ id: 'quote', kind: 'quote' as const, before: 0, after: 0 }] : [])], initialLead: 0, completionGap: 10 },
    bindings: { showEduIcon: false, showEndPoem: value.poem, playerName: value.playerName }, scale: value.scale, offset: value.offset,
    elapsedMs: value.elapsedMs, rasterPositioning: value.positioning, imageSampling: 'point', bitmapRenderer: 'cpu',
    'aria-label': 'Host credits', viewportRef,
    onLayout: layout => { document.getElementById('layout-status')!.textContent = `Layout ${layout.nodes.length} nodes / ${layout.lines.length} lines`; },
    onRenderError: (error, location) => { errors.push({ message: error.message, ...location }); document.getElementById('render-error')!.textContent = error.message; } };
}
const mounted = createRoot(document.getElementById('root')!);
const render = () => mounted.render(<StrictMode><CreditsRoll {...propsFor(options)} ref={rootRef} /></StrictMode>);
window.__creditsRollQA = { configure(patch) { options = { ...options, ...patch }; render(); }, unmount() { mounted.unmount(); },
  getRoot: () => rootRef.current, getErrors: () => [...errors], glyphPage };
render();
