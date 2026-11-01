import type { CreditsPresentationProfile } from '../src/credits-screen-types';
import type { CreditsLayoutLimits, CreditsTextRole } from '../src/credits-types';

const roles: readonly CreditsTextRole[] = ['section', 'discipline', 'title', 'name', 'poem', 'quote'];
const limits: CreditsLayoutLimits = { maxSections: 10, maxDisciplines: 20, maxTitles: 40, maxNames: 100,
  maxInputUnits: 10000, maxExpandedUnits: 10000, maxTokens: 10000, maxParagraphs: 1000, maxLines: 2000,
  maxRuns: 4000, maxStages: 20, maxFontGlyphs: 1000, maxMeasureCalls: 10000, maxMeasuredUnits: 100000, maxContentHeight: 100000 };
const style = { font: { kind: 'css-face' as const, family: 'monospace', fontSize: 8, metricsId: 'empty-authored-gpu-fixture', measureText: (text: string) => text.length * 4 },
  lineHeight: 10, letterSpacing: 0, color: '#ffffff', shadow: null };
export const creditsGpuFixtureDefaults: any = { width: 64, height: 48, scale: 1, src: '/qa-credits-background.png', naturalSize: [4, 4],
  logicalSize: [64, 96], tileSize: [16, 16], from: [0, -24], to: [0, -40], durationMs: 1000,
  rasterOrigin: 'top-left', originRounding: 'truncate', imageSampling: 'point', elapsedMs: 0, introAgeMs: 3000,
  open: true, hidden: false, strict: true, gpu: true, tag: 'initial', controlled: true, playing: false };
export function creditsGpuFixtureProfile(options: any): CreditsPresentationProfile {
  return { id: 'owned-gpu-background-fixture', evidenceId: 'authored-empty-content-not-native-player',
    layout: { viewport: { size: [options.width / options.scale, options.height / options.scale], contentWidth: options.width / options.scale, contentX: 0 },
      styles: Object.fromEntries(roles.map(role => [role, style])) as CreditsPresentationProfile['layout']['styles'],
      blocks: Object.fromEntries(roles.map(role => [role, { before: 0, after: 0, insetStart: 0, insetEnd: 0 }])) as CreditsPresentationProfile['layout']['blocks'],
      emptyDiscipline: 'omit-and-collapse', emptyTitle: 'omit-and-collapse', paragraphs: 'hard-lines', paragraphGap: 0, paragraphBlankLines: 'retain',
      wrap: 'word', longWord: 'break-word', horizontalWhitespace: 'preserve', wrapWhitespace: 'discard-at-break',
      textAlign: Object.fromEntries(roles.map(role => [role, 'left'])) as CreditsPresentationProfile['layout']['textAlign'], gatedStageSpacing: 'omit',
      markup: { roles: ['poem', 'quote'], colors: { '2': '#00aa00', '3': '#00aaaa', '7': '#aaaaaa', a: '#55ff55', b: '#55ffff', f: '#ffffff' }, obfuscated: { alphabet: 'AB', periodMs: 100, seed: 2, preserveAdvance: true },
        colorResetsObfuscated: true, resetCode: 'r', playerNameToken: { token: 'PLAYERNAME', replacement: 'literal-all' }, unknownCode: 'literal' },
      limits, provenance: 'host-resolved-web-profile', evidenceId: 'authored-empty-layout' },
    plan: { stages: [{ id: 'staff', kind: 'staff', before: 0, after: 0 }], initialLead: 0, completionGap: 100000 },
    surface: { background: { image: { src: options.src, naturalSize: options.naturalSize, displaySize: options.naturalSize, alt: '', provenance: 'host-background' },
      tileSize: options.tileSize, logicalSize: options.logicalSize, from: options.from, to: options.to, durationMs: options.durationMs,
      ...(options.gpu ? { rendering: { kind: 'gui-layer', rasterOrigin: options.rasterOrigin, originRounding: options.originRounding } } : {}) },
      edgeMask: { kind: 'none' }, coverPlacement: 'above-content' }, logicalUnitsPerSecond: 1, fasterMultiplier: 4, skipLabelStyle: style,
    rasterPositioning: 'physical-floor', imageSampling: options.imageSampling, completion: 'web-scroll-end-then-fade',
    input: { escape: 'none', enter: 'none', repeat: 'ignore', focus: 'host' } };
}
