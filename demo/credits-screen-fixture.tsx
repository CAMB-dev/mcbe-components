import { StrictMode, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { CreditsScreen } from '../src/credits-screen';
import type { CreditsControllerCommand, CreditsControllerHandle, CreditsPresentationProfile, CreditsScreenSnapshot } from '../src/credits-screen-types';
import type { CreditsLayoutLimits, CreditsTextRole } from '../src/credits-types';
import '../src/credits-roll.css';
import '../src/credits-skip-button.css';
import '../src/credits-screen.css';

const roles: readonly CreditsTextRole[] = ['section', 'discipline', 'title', 'name', 'poem', 'quote'];
const limits: CreditsLayoutLimits = { maxSections: 10, maxDisciplines: 20, maxTitles: 40, maxNames: 100,
  maxInputUnits: 10000, maxExpandedUnits: 10000, maxTokens: 10000, maxParagraphs: 1000, maxLines: 2000,
  maxRuns: 4000, maxStages: 20, maxFontGlyphs: 1000, maxMeasureCalls: 10000, maxMeasuredUnits: 100000, maxContentHeight: 100000 };
const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 2;
const painter = canvas.getContext('2d')!; painter.fillStyle = '#112233'; painter.fillRect(0, 0, 2, 2);
const pageSource = canvas.toDataURL();
const measure = document.createElement('canvas').getContext('2d')!; measure.font = '8px monospace';
const labelStyle = { font: { kind: 'css-face' as const, family: 'monospace', fontSize: 8, metricsId: 'screen-fixture-canvas8',
  measureText: (text: string) => measure.measureText(text).width }, lineHeight: 10, letterSpacing: 0, color: '#ffffff', shadow: null };
const profile: CreditsPresentationProfile = { id: 'authored-test', evidenceId: 'web-fixture-not-native',
  layout: { viewport: { size: [150, 60], contentWidth: 100, contentX: 25 },
    styles: Object.fromEntries(roles.map(role => [role, labelStyle])) as CreditsPresentationProfile['layout']['styles'],
    blocks: Object.fromEntries(roles.map(role => [role, { before: 0, after: 0, insetStart: 0, insetEnd: 0 }])) as CreditsPresentationProfile['layout']['blocks'],
    emptyDiscipline: 'omit-and-collapse', emptyTitle: 'omit-and-collapse', paragraphs: 'hard-lines', paragraphGap: 0, paragraphBlankLines: 'retain',
    wrap: 'word', longWord: 'break-word', horizontalWhitespace: 'preserve', wrapWhitespace: 'discard-at-break',
    textAlign: Object.fromEntries(roles.map(role => [role, 'left'])) as CreditsPresentationProfile['layout']['textAlign'], gatedStageSpacing: 'omit',
    markup: { roles: ['poem', 'quote'], colors: { '2': '#00aa00', '3': '#00aaaa', '7': '#aaaaaa', a: '#55ff55', b: '#55ffff', f: '#ffffff' },
      obfuscated: { alphabet: 'AB', periodMs: 100, seed: 2, preserveAdvance: true }, colorResetsObfuscated: true, resetCode: 'r',
      playerNameToken: { token: 'PLAYERNAME', replacement: 'literal-all' }, unknownCode: 'literal' },
    limits, provenance: 'host-resolved-web-profile', evidenceId: 'authored-screen-fixture' },
  plan: { stages: [{ id: 'staff', kind: 'staff', before: 0, after: 0 }], initialLead: 0, completionGap: 60 },
  surface: { background: { image: { src: pageSource, naturalSize: [2, 2], displaySize: [2, 2], alt: '', provenance: 'authored-test-2x2' },
    logicalSize: [150, 1200], tileSize: [4, 4], from: [0, 0], to: [0, -300], durationMs: 503000 }, edgeMask: { kind: 'none' }, coverPlacement: 'below-content' },
  logicalUnitsPerSecond: 10, fasterMultiplier: 4, skipLabelStyle: labelStyle,
  rasterPositioning: 'physical-floor', imageSampling: 'point', completion: 'web-scroll-end-then-fade',
  input: { escape: 'reveal-then-exit', enter: 'reveal-skip', repeat: 'ignore', focus: 'host' } };
const content = { sections: [{ section: 'Host section', disciplines: [{ discipline: '', titles: [{ title: '', names: ['Host One', 'Host Two'] }] }] }], endPoem: '', quote: '' };
interface Options {
  mode: 'playback' | 'controlled-source'; runKey: string; playing: boolean; initialOffset: number; offset: number;
  elapsedMs: number; faster: boolean; disabled: boolean; open: boolean; veto: boolean; modal: boolean; scale: number;
  snapshot: CreditsScreenSnapshot; longContent: boolean; detachOnAction: boolean; escapePolicy: CreditsPresentationProfile['input']['escape']; retirePolicyOnAction: boolean;
}
let options: Options = { mode: 'playback', runKey: 'first', playing: true, initialOffset: 0, offset: 0, elapsedMs: 0,
  faster: false, disabled: false, open: true, veto: false, modal: false, scale: 2, longContent: false, detachOnAction: false, escapePolicy: 'reveal-then-exit', retirePolicyOnAction: false,
  snapshot: { introAgeMs: 3000, backgroundElapsedMs: 0, skipButtonVisible: true, factory: { skipPanel: null, fadeOut: null } } };
const controllerRef = createRef<CreditsControllerHandle>(), screenRef = createRef<HTMLElement>(), viewportRef = createRef<HTMLDivElement>();
const mounted = createRoot(document.getElementById('root')!);
const render = () => {
  const shared = { content: options.longContent ? { ...content, sections: [{ section: 'Long section', disciplines: [{ discipline: '', titles: [{ title: '', names: Array.from({ length: 20 }, (_, index) => `Name ${index}`) }] }] }] } : content,
    runKey: options.runKey, profile: { ...profile, input: { ...profile.input, escape: options.escapePolicy, focus: options.modal ? 'web-modal' as const : 'host' as const } },
    bindings: { showEduIcon: false, showEndPoem: false, playerName: 'Host', scrollFaster: options.faster },
    scale: options.scale, skipLabel: 'Skip', disabled: options.disabled, open: options.open, controllerRef, viewportRef,
    onAction: (detail: { control: HTMLElement }) => {
      if (options.detachOnAction) detail.control.remove();
      if (options.retirePolicyOnAction) window.__creditsScreenQA.configure({ escapePolicy: 'none' });
      return options.veto ? false as const : undefined;
    },
    onCloseRequested: () => { document.getElementById('action-status')!.textContent = 'Close requested'; },
    onLifecycle: (detail: { kind: string }) => { const item = document.createElement('li'); item.textContent = detail.kind; document.getElementById('lifecycle-status')!.append(item); } };
  mounted.render(<StrictMode>{options.mode === 'playback'
    ? <CreditsScreen {...shared} ref={screenRef} playback={{ playing: options.playing, initialOffset: options.initialOffset, hiddenPolicy: 'pause' }} />
    : <CreditsScreen {...shared} ref={screenRef} mode="controlled-source" position={{ offset: options.offset, elapsedMs: options.elapsedMs }} snapshot={options.snapshot} />}</StrictMode>);
};
declare global { interface Window { __creditsScreenQA: {
  configure(patch: Partial<Options>): void; unmount(): void; request(command: CreditsControllerCommand): boolean;
  root(): HTMLElement | null; viewport(): HTMLDivElement | null;
} } }
window.__creditsScreenQA = { configure(patch) { options = { ...options, ...patch }; flushSync(render); }, unmount() { mounted.unmount(); },
  request: command => controllerRef.current?.request(command) ?? false, root: () => screenRef.current, viewport: () => viewportRef.current };
render();
