import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import type {} from '../demo/external-server-fixture';

type MaterialKind = 'panel' | 'field' | 'button' | 'close';
type MaterialState = 'normal' | 'hover' | 'pressed' | 'locked' | 'disabled';
interface Plane {
  id: string;
  kind: MaterialKind;
  state: MaterialState;
  scale: 1 | 2;
  logicalSize: [number, number];
  pixelSize: [number, number];
  wholePixels: number;
  expected: string;
  pngSHA256: string;
  rgbaSHA256: string;
}
const directory = path.resolve('tests/fixtures/external-server-materials');
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const protocolBytes = readFileSync(path.join(directory, 'PROTOCOL.json'));
const protocol = JSON.parse(protocolBytes.toString()) as {
  originalsSHA256: string;
  planes: Plane[];
  sampling: {priorOpacityReference: {path: string; sha256: string}};
};
const originalBytes = readFileSync(path.join(directory, 'ORIGINALS.json'));
const originals = JSON.parse(originalBytes.toString()) as {files: {entry: string; bytes: number; sha256: string}[]};
// These four historical scalar predictions were falsified for the current
// group-opacity context. Keep their complete RGBA scores as unqualified
// evidence; do not turn a different rounding rule or tolerance into a golden.
const unqualifiedAlphaPlanes = new Set(['panel-normal-s1', 'panel-normal-s2', 'field-disabled-s1', 'field-disabled-s2']);

test.use({viewport: {width: 800, height: 600}, deviceScaleFactor: 1, forcedColors: 'none'});
for (const plane of protocol.planes) {
  const alphaUnqualified = unqualifiedAlphaPlanes.has(plane.id);
  const title = alphaUnqualified ? 'external server source alpha contract — scalar RGBA candidate unqualified'
    : 'external server independent complete material';
  test(`${title}: ${plane.id}`, async ({page}, info) => {
  info.annotations.push({type: 'pixel-qualification', description: alphaUnqualified ? 'UNQUALIFIED: source-parameter contract only; native pixels pending'
    : 'STRICT: complete isolated material RGBA, zero tolerance; not native screen parity'});
  expect(hash(protocolBytes)).toBe('54f62cd321fdbd8e1e47e145266b08dd1c4564bc4a4443818952ad1a737d3970');
  expect(hash(originalBytes)).toBe(protocol.originalsSHA256);
  for (const source of originals.files) {
    const bytes = readFileSync(path.join(directory, 'ORIGINALS', source.entry));
    expect(bytes.length).toBe(source.bytes);
    expect(hash(bytes)).toBe(source.sha256);
    if (source.entry.startsWith('resource_pack/textures/ui/')) {
      const shipped = readFileSync(path.join('src/assets/external-server', path.posix.basename(source.entry)));
      expect(shipped.length, source.entry).toBe(source.bytes);
      expect(hash(shipped), source.entry).toBe(source.sha256);
    }
  }
  const reference = protocol.sampling.priorOpacityReference;
  expect(hash(readFileSync(reference.path))).toBe(reference.sha256);
  const expectedBytes = readFileSync(path.join(directory, plane.expected)), expected = PNG.sync.read(expectedBytes);
  expect(hash(expectedBytes)).toBe(plane.pngSHA256);
  expect(hash(expected.data)).toBe(plane.rgbaSHA256);

  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/demo/external-server-fixture.html?materials=1');
  await page.waitForFunction(() => !!window.externalServerMaterial);
  const selection = await page.evaluate(value => window.externalServerMaterial.setMaterial(value), {
    kind: plane.kind, state: plane.state, scale: plane.scale,
  });
  const target = page.locator(selection.selector), box = await target.boundingBox();
  expect(box).not.toBeNull();
  expect([box!.width, box!.height]).toEqual(plane.pixelSize);
  expect([box!.x, box!.y, box!.width, box!.height]).toEqual(selection.rect);
  expect([box!.x, box!.y].every(Number.isInteger)).toBe(true);

  // Decode whole production CSS resources, but take expectations exclusively
  // from independent fixed-ZIP originals. Nothing is sampled from the page.
  const urls = await target.evaluate(async node => {
    const urls = new Set<string>();
    for (const element of [node, ...node.querySelectorAll('*')]) {
      const source = getComputedStyle(element).backgroundImage;
      for (const match of source.matchAll(/url\((?:"([^"]*)"|'([^']*)'|([^)]*))\)/g)) urls.add(match[1] ?? match[2] ?? match[3]!);
    }
    return await Promise.all([...urls].map(async url => {
      const image = new Image(); image.src = url; await image.decode();
      return {url, width: image.naturalWidth, height: image.naturalHeight};
    }));
  });
  expect(urls.length).toBeGreaterThan(0);
  for (const {url, width, height} of urls) {
    const filename = path.posix.basename(new URL(url).pathname);
    const source = originals.files.find(record => record.entry === `resource_pack/textures/ui/${filename}`);
    expect(source, filename).toBeDefined();
    const response = await page.request.get(url);
    expect(response.ok(), url).toBe(true);
    expect(hash(await response.body())).toBe(source!.sha256);
    const original = PNG.sync.read(readFileSync(path.join(directory, 'ORIGINALS', source!.entry)));
    expect([width, height], filename).toEqual([original.width, original.height]);
  }
  if (alphaUnqualified) {
    const alphaContract = await target.evaluate((node, kind) => {
      const branch = node.querySelector(kind === 'panel' ? '.mc-external-server-form__wash' : '.mc-external-server-field__skin--normal');
      if (!(branch instanceof HTMLElement)) throw new Error('Missing source image branch');
      const patches = [...branch.querySelectorAll<HTMLElement>('.mc-external-server-skin__patch')];
      const images = patches.length ? patches : [branch];
      const imageAlpha = images.map(image => {
        const ancestry: {className: string; opacity: number; display: string; visibility: string}[] = [];
        let effectiveAlpha = 1;
        for (let current: HTMLElement | null = image; current; current = current.parentElement) {
          const style = getComputedStyle(current), opacity = Number(style.opacity);
          ancestry.push({className: current.className, opacity, display: style.display, visibility: style.visibility});
          effectiveAlpha *= opacity;
          if (current === node) break;
        }
        return {effectiveAlpha, ancestry};
      });
      const input = node.querySelector('input');
      return {kind, sourceAlpha: kind === 'panel' ? .8 : .5, imageAlpha,
        disabledInput: input?.disabled ?? null,
        disabledEditor: node.querySelector('.mc-external-server-field__editor')?.hasAttribute('data-disabled') ?? null,
        normalDisplay: getComputedStyle(branch).display,
        hoverDisplay: kind === 'field' ? getComputedStyle(node.querySelector('.mc-external-server-field__skin--hover')!).display : null};
    }, plane.kind);
    expect(alphaContract.imageAlpha.length).toBeGreaterThan(0);
    for (const image of alphaContract.imageAlpha) {
      expect(image.effectiveAlpha).toBe(alphaContract.sourceAlpha);
      for (const ancestor of image.ancestry) {
        expect(ancestor.display).not.toBe('none');
        expect(ancestor.visibility).toBe('visible');
      }
    }
    expect(alphaContract.normalDisplay).not.toBe('none');
    if (plane.kind === 'field') {
      expect(alphaContract.disabledInput).toBe(true);
      expect(alphaContract.disabledEditor).toBe(true);
      expect(alphaContract.hoverDisplay).toBe('none');
    }
    await info.attach(`${plane.id}-source-alpha-contract.json`, {
      body: Buffer.from(JSON.stringify({qualification: 'UNQUALIFIED', nativePixels: 'PENDING',
        explanation: 'Computed CSS image-path opacity product only; not a blend/RGBA or native compositing law.', alphaContract, urls, rect: selection.rect})),
      contentType: 'application/json',
    });
  }
  const actualBytes = await target.screenshot({animations: 'disabled'}), actual = PNG.sync.read(actualBytes);
  await info.attach(`${plane.id}-whole-actual.png`, {body: actualBytes, contentType: 'image/png'});
  expect([actual.width, actual.height]).toEqual(plane.pixelSize);
  let pixels = 0, channels = 0, alpha = 0, max = 0;
  for (let i = 0; i < expected.data.length; i += 4) {
    let changed = false;
    for (let c = 0; c < 4; c++) {
      const delta = Math.abs(actual.data[i + c]! - expected.data[i + c]!);
      if (delta) { changed = true; channels++; max = Math.max(max, delta); if (c === 3) alpha++; }
    }
    if (changed) pixels++;
  }
  await info.attach(`${plane.id}-whole-score.json`, {body: Buffer.from(JSON.stringify({
    completePixels: plane.wholePixels, changedPixels: pixels, changedChannels: channels, alpha, max,
    expectedPNG: plane.pngSHA256, expectedRGBA: plane.rgbaSHA256, actualRGBA: hash(actual.data),
    qualification: alphaUnqualified ? 'UNQUALIFIED' : 'STRICT_RGBA_ZERO',
    assertion: alphaUnqualified ? 'Source alpha/whole-resource/geometry contracts only; old candidate score is diagnostic, no RGB acceptance threshold'
      : 'Complete RGBA must match exactly',
    tolerance: alphaUnqualified ? null : 0, mask: null,
    scope: alphaUnqualified ? 'Complete actual RGBA and historical scalar prediction retained; current-context scalar law and native pixels unqualified'
      : 'Complete isolated source material, not native UI/state/font parity',
  })), contentType: 'application/json'});
  if (!alphaUnqualified) expect(hash(actual.data)).toBe(plane.rgbaSHA256);
  expect(errors).toEqual([]);
});
}
