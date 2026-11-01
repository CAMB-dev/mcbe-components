import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = new URL('../.cache/credits-screen-model-node-tests/', import.meta.url);
await mkdir(directory, { recursive: true });
const built = await build({ stdin: { contents: "export * from './src/credits-screen-model';", resolveDir: root, sourcefile: 'credits-screen-model-node-entry.ts' },
  bundle: true, platform: 'node', format: 'esm', target: 'es2022', write: false });
const target = fileURLToPath(new URL(`bundle-${process.pid}.mjs`, directory));
await writeFile(target, built.outputFiles[0].contents);
const { copyCreditsSnapshot, copyCreditsSurface, creditsSurfaceFrame } = await import(pathToFileURL(target).href);

const snapshot = () => ({ introAgeMs: 0, backgroundElapsedMs: 0, skipButtonVisible: false,
  factory: { skipPanel: { instanceId: 'panel', button: { generation: 'child', ageMs: 0 }, exitInputActive: true }, fadeOut: null } });
const image = () => ({ src: '/self-authored-source.png', naturalSize: [2, 2], displaySize: [20, 20], alt: 'Own image', provenance: 'self-authored CPU fixture' });
const surface = () => ({ background: { image: image(), tileSize: [2, 2], logicalSize: [100, 200], from: [0, 0], to: [0, -100], durationMs: 1000 },
  edgeMask: { kind: 'none' }, coverPlacement: 'below-content' });

test('a nonnull panel requires an explicit null or child button snapshot', () => {
  const source = snapshot(); delete source.factory.skipPanel.button;
  assert.throws(() => copyCreditsSnapshot(source), TypeError);
});

test('snapshot copies retain independent parent, child and visible-binding state', () => {
  const source = snapshot(), copy = copyCreditsSnapshot(source);
  assert.equal(copy.skipButtonVisible, false); assert(copy.factory.skipPanel.button); assert.equal(copy.factory.skipPanel.exitInputActive, true);
  source.factory.skipPanel.instanceId = 'changed'; source.factory.skipPanel.button.ageMs = 999;
  assert.equal(copy.factory.skipPanel.instanceId, 'panel'); assert.equal(copy.factory.skipPanel.button.ageMs, 0);
  const childless = snapshot(); childless.factory.skipPanel.button = null;
  assert.equal(copyCreditsSnapshot(childless).factory.skipPanel.button, null);
});

test('explicit null factories stay null', () => {
  const source = snapshot(); source.factory.skipPanel = null;
  assert.deepEqual(copyCreditsSnapshot(source).factory, { skipPanel: null, fadeOut: null });
});

test('snapshot age values and visibility/input flags are validated', () => {
  for (const invalid of [-1, NaN, Infinity]) {
    let source = snapshot(); source.introAgeMs = invalid; assert.throws(() => copyCreditsSnapshot(source));
    source = snapshot(); source.factory.skipPanel.button.ageMs = invalid; assert.throws(() => copyCreditsSnapshot(source));
  }
  for (const invalid of [undefined, 0, 'false']) {
    let source = snapshot(); source.skipButtonVisible = invalid; assert.throws(() => copyCreditsSnapshot(source));
    source = snapshot(); source.factory.skipPanel.exitInputActive = invalid; assert.throws(() => copyCreditsSnapshot(source));
  }
});

test('surface copies detach source-image dimensions and animation tuples', () => {
  const source = surface(), copy = copyCreditsSurface(source);
  source.background.image.naturalSize[0] = 99; source.background.tileSize[0] = 99; source.background.from[0] = 99; source.background.to[0] = 99;
  assert.deepEqual(copy.background.image.naturalSize, [2, 2]); assert.deepEqual(copy.background.tileSize, [2, 2]);
  assert.deepEqual(copy.background.from, [0, 0]); assert.deepEqual(copy.background.to, [0, -100]);
});

test('convex background interpolation avoids subtraction overflow at opposite extremes', () => {
  const source = surface(), time = snapshot(); source.background.from = [Number.MAX_VALUE, -Number.MAX_VALUE]; source.background.to = [-Number.MAX_VALUE, Number.MAX_VALUE]; time.backgroundElapsedMs = 500;
  assert.deepEqual(creditsSurfaceFrame(copyCreditsSurface(source), time).backgroundOffset, [0, 0]);
});

test('background, intro, outro and child wait thresholds remain independent', () => {
  const time = snapshot(); time.backgroundElapsedMs = 2000; time.introAgeMs = 3000;
  time.factory.fadeOut = { instanceId: 'outro', ageMs: 1500 }; time.factory.skipPanel.button.ageMs = 5000;
  assert.deepEqual(creditsSurfaceFrame(copyCreditsSurface(surface()), time), { backgroundOffset: [0, -100], introOpacity: 0, outroOpacity: .5, childExpired: true });
});

test('invalid surface duration, tile/source sizes and cover placement are rejected', () => {
  let source = surface(); source.background.durationMs = 0; assert.throws(() => copyCreditsSurface(source));
  source = surface(); source.background.tileSize = [-1, 2]; assert.throws(() => copyCreditsSurface(source));
  source = surface(); source.background.image.naturalSize = [1.5, 2]; assert.throws(() => copyCreditsSurface(source));
  source = surface(); source.coverPlacement = undefined; assert.throws(() => copyCreditsSurface(source));
});
