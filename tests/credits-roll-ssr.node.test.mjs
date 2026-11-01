import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PNG } from 'pngjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = new URL('../.cache/credits-roll-node-tests/', import.meta.url);
await mkdir(directory, { recursive: true });
const built = await build({ stdin: { contents: "export { CreditsRoll } from './src/credits-roll'; export { layoutCredits } from './src/credits-layout';", resolveDir: root, sourcefile: 'credits-roll-node-entry.ts' },
  bundle: true, platform: 'node', format: 'esm', target: 'es2022', external: ['react', 'react/jsx-runtime'], write: false });
const target = fileURLToPath(new URL(`bundle-${process.pid}.mjs`, directory));
await writeFile(target, built.outputFiles[0].contents);
const { CreditsRoll, layoutCredits } = await import(pathToFileURL(target).href);
const roles = ['section', 'discipline', 'title', 'name', 'poem', 'quote'];
const limits = { maxSections: 20, maxDisciplines: 40, maxTitles: 100, maxNames: 200, maxInputUnits: 20000, maxExpandedUnits: 20000,
  maxTokens: 10000, maxParagraphs: 1000, maxLines: 2000, maxRuns: 4000, maxStages: 20, maxFontGlyphs: 1000,
  maxMeasureCalls: 10000, maxMeasuredUnits: 100000, maxContentHeight: 100000 };
const pixel = new PNG({ width: 2, height: 6 }); pixel.data.fill(255);
const image = `data:image/png;base64,${PNG.sync.write(pixel).toString('base64')}`;
function fixture() {
  const font = { kind: 'css-face', family: 'Host test face', fontSize: 8, metricsId: 'test-four-unit-advance', measureText: value => [...value].length * 4 };
  const profile = { viewport: { size: [100, 30], contentWidth: 80, contentX: 10 },
    styles: Object.fromEntries(roles.map(role => [role, { font, lineHeight: 10, letterSpacing: 0, color: '#ffffff', shadow: null }])),
    blocks: Object.fromEntries(roles.map(role => [role, { before: 0, after: 0, insetStart: 0, insetEnd: 0 }])),
    emptyDiscipline: 'omit-and-collapse', emptyTitle: 'omit-and-collapse', paragraphs: 'hard-lines', paragraphGap: 0,
    paragraphBlankLines: 'retain', wrap: 'word', longWord: 'break-word', horizontalWhitespace: 'preserve', wrapWhitespace: 'discard-at-break',
    textAlign: Object.fromEntries(roles.map(role => [role, role === 'section' ? 'center' : 'left'])), gatedStageSpacing: 'omit',
    markup: { roles: ['poem', 'quote'], colors: { '2': '#00aa00', '3': '#00aaaa', '7': '#aaaaaa', a: '#55ff55', b: '#55ffff', f: '#ffffff' },
      obfuscated: { alphabet: 'AB', periodMs: 100, seed: 2, preserveAdvance: true }, colorResetsObfuscated: true, resetCode: 'r',
      playerNameToken: { token: 'PLAYERNAME', replacement: 'literal-all' }, unknownCode: 'literal' },
    limits: { ...limits }, provenance: 'host-resolved-web-profile', evidenceId: 'authored-test-profile' };
  return { content: { sections: [{ section: 'Host section', disciplines: [{ discipline: '', titles: [{ title: 'Host role', names: ['Host One', 'Host Two'] }] }] }],
    endPoem: '§3Hello PLAYERNAME\n§kAB', quote: 'Host quote' }, profile,
    plan: { stages: [{ id: 'brand', kind: 'brand', brand: 'primary', align: 'center', before: 0, after: 0,
      image: { src: image, naturalSize: [2, 6], displaySize: [4, 12], alt: 'Host brand', provenance: 'authored-test-pixels' } },
      { id: 'staff', kind: 'staff', before: 0, after: 0 }, { id: 'poem', kind: 'end-poem', before: 0, after: 0 }, { id: 'quote', kind: 'quote', before: 0, after: 0 }],
      initialLead: 0, completionGap: 10 },
    bindings: { showEduIcon: false, showEndPoem: true, playerName: 'Host Player' }, offset: 0, elapsedMs: 0, scale: 1,
    rasterPositioning: 'physical-floor', imageSampling: 'point' };
}
const html = props => renderToStaticMarkup(React.createElement(CreditsRoll, props));

test('real data renderer preserves stage order, semantic content and fixed viewport', () => {
  const props = fixture(); props.style = { width: 999, height: 999, overflow: 'scroll' };
  const output = html(props);
  assert.match(output, /aria-label="Credits"/);
  assert.match(output, /width:100px;height:30px;overflow:hidden/);
  assert.match(output, /<h2>Host section<\/h2>/);
  assert.match(output, /data-text-role="name">Host One/);
  const transcript = output.slice(output.indexOf('class="mc-credits-roll__transcript"'));
  assert(transcript.indexOf('Host brand') < transcript.indexOf('Host section'));
  assert(transcript.indexOf('Host section') < transcript.indexOf('Host role'));
  assert(transcript.indexOf('Host Two') < transcript.indexOf('Hello Host Player'));
});

test('formatting is consumed while inserted player text remains literal and escaped', () => {
  const props = fixture(); props.bindings.playerName = '§b<Host>';
  const output = html(props), transcript = output.slice(output.indexOf('class="mc-credits-roll__transcript"'));
  assert(transcript.includes('Hello §b&lt;Host&gt;'));
  assert(!output.includes('<Host>'));
  assert(!transcript.includes('§3Hello'));
  assert(!transcript.includes('§kAB'));
});

test('whole source image and explicit display dimensions are retained without a native claim', () => {
  const props = fixture(); props.scale = 2;
  const output = html(props);
  assert(output.includes(`src="${image}"`));
  assert.match(output, /width="8" height="24"/);
  assert.match(output, /data-image-provenance="authored-test-pixels"/);
  assert.match(output, /data-native-certified="false"/);
});

test('bitmap ink above the advance box is retained; fully offscreen runs are not mounted', () => {
  const props = fixture();
  const font = { kind: 'bitmap', font: { pages: [image], lineHeight: 6,
    glyphs: Object.fromEntries([...new Set('Host sectionrleOTwA')].map(character => [character, { page: 0, x: 0, y: 0, width: 2, height: 6, advance: 3, offsetY: -4 }])) },
    scale: 1, sampling: 'point', shader: 'bitmap', renderProfile: 'atlas-rect', missingGlyph: { kind: 'error' } };
  props.content.sections[0].disciplines[0].titles[0].names = ['A']; props.bindings.showEndPoem = false;
  props.content.quote = ''; props.plan.stages = [{ id: 'staff', kind: 'staff', before: 0, after: 0 }];
  props.profile.viewport.size = [100, 2];
  for (const role of roles) props.profile.styles[role].font = font;
  const model = layoutCredits(props), line = model.lines.find(line => line.role === 'name');
  props.offset = line.y - 3;
  assert(html(props).includes('<canvas'));
  props.offset = model.contentHeight + 100;
  assert(!html(props).includes('<canvas'));
});

test('the view uses validated presentation snapshots after an impure metrics callback', () => {
  const props = fixture(); let changed = false;
  const measure = value => {
    if (!changed) { changed = true; props.profile.markup.obfuscated.periodMs = 0;
      props.profile.markup.obfuscated.alphabet = ''; props.profile.evidenceId = 'mutated-after-validation'; }
    return [...value].length * 4;
  };
  for (const role of roles) props.profile.styles[role].font = { ...props.profile.styles[role].font, measureText: measure };
  const output = html(props);
  assert.match(output, /data-profile-evidence="authored-test-profile"/);
  assert(!output.includes('mutated-after-validation'));
});

test('obfuscation measurements obey the remaining post-layout budget', () => {
  const props = fixture(), baseline = layoutCredits(props);
  assert(baseline.usage.measureCalls > 0);
  props.profile.limits.maxMeasureCalls = baseline.usage.measureCalls;
  assert.throws(() => html(props), /remaining text-measurement budget/);
});

test('unsupported raster settings, oversized viewports and nonfinite presentation values reject', () => {
  for (const change of [{ scale: 1.5 }, { rasterPositioning: 'guess' }, { imageSampling: 'guess' }, { elapsedMs: Infinity }, { offset: Infinity }])
    assert.throws(() => html({ ...fixture(), ...change }));
  const props = fixture(); props.profile.viewport.size = [8192, 8192];
  assert.throws(() => html(props), /viewport exceeds/);
});
