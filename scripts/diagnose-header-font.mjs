// Repository-only, strict whole-frame comparison against caller-owned native
// fixtures. No source image generation, replacement golden or pixel tolerance.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {chromium} from '@playwright/test';
import {PNG} from 'pngjs';
import {createServer} from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let values, port;
try {
  ({values} = parseArgs({options: {
    backend: {type: 'string', default: 'software'},
    label: {type: 'string', default: `run-${Date.now()}`},
    port: {type: 'string', default: '5481'},
  }}));
  assert(['software', 'nvidia-d3d11'].includes(values.backend), 'Use --backend software or nvidia-d3d11.');
  assert(/^[a-zA-Z0-9-]{1,80}$/.test(values.label), 'Use a fresh alphanumeric output label.');
  port = Number(values.port);
  assert(Number.isInteger(port) && port > 1024 && port < 65536 && port !== 4173, 'Choose an unused test port; preview4173 stays running.');
} catch (error) {
  console.log(JSON.stringify({status: 'INVALID_ARGUMENTS', error: String(error), closed: true}, null, 2));
  process.exit(2);
}
const fixture = join(root, '.cache/resource-pack-header-font-study-20261103-01');
const out = join(root, '.cache/header-font-diagnostics', values.label);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
let browser, server;
let outputCreated = false;
const result = {backend: values.backend, nativeWholeFontQualified: false};

try {
  const [pageBytes, beforeBytes, afterBytes, packetBytes] = await Promise.all([
    'current-original/glyph_6D.png', 'native-before-g83-whole.png',
    'native-after-g83-whole.png', 'AMENDMENT-01/FOUR-DRAWS-DECODED.json',
  ].map(file => readFile(join(fixture, file))));
  assert.equal(sha(pageBytes), '3a389719831d9289c06e5f5f77bd7ebd728413c45d37d0232a2a5fbdd95a7f97');
  assert.equal(sha(packetBytes), '18f012c383785dd874374f40111a9ef7928fee10a5ef83cd22fbecc62b1cb4ba');
  const page = PNG.sync.read(pageBytes), before = PNG.sync.read(beforeBytes), after = PNG.sync.read(afterBytes);
  assert.equal(sha(before.data), '751cb08e072e2593625ad7c022bc4463c2de57056acba4fb3015675f89addbe6');
  assert.equal(sha(after.data), '8aed9a7c56a9407a1c123423ad6f2e2fa9e27baf8983c1dd760ac8ae5bf57728');
  assert.equal(before.width, 2570); assert.equal(before.height, 1402);
  assert.equal(after.width, before.width); assert.equal(after.height, before.height);
  assert.equal(page.width, 256); assert.equal(page.height, 256);
  const oracle = JSON.parse(packetBytes.toString('utf8')).draws.find(draw => draw.globalId === 83);
  const codePoint = 0x6d3b;
  const command = {
    kind: 'text', text: '活', origin: [59.2, 32.4], fontScale: .5,
    sampling: 'bilinear', shader: 'bitmap-smooth',
    color: [255, 255, 255, 255], tint: [1, 1, 1, 1], hudOpacity: 1,
    scissor: [256, 114, 2056, 1287],
    font: {pages: ['/caller-original.png'], pageSizes: [256], cellHeight: 16, lineHeight: 16,
      glyphs: {'活': {page: 0, x: (codePoint & 15) * 16, y: (codePoint >> 4 & 15) * 16,
        width: 16, height: 16, advance: 16}}},
  };
  const frame = {width: before.width, height: before.height, guiScale: 5};
  const options = {...frame, background: {kind: 'texture', encoding: 'framebuffer',
    texture: {width: before.width, height: before.height, rgba: before.data.toString('base64')}},
    commands: [{...command, pages: [[0, {width: page.width, height: page.height, rgba: page.data.toString('base64')}]]}]};
  await mkdir(dirname(out), {recursive: true});
  await mkdir(out); // An existing label is an error; preserve earlier evidence.
  outputCreated = true;
  server = await createServer({root, configFile: join(root, 'vite.config.ts'),
    server: {host: '127.0.0.1', port, strictPort: true}});
  await server.listen();
  browser = await chromium.launch(values.backend === 'software' ? {} : {
    args: ['--enable-gpu', '--use-gl=angle', '--use-angle=d3d11'],
  });
  const tab = await browser.newPage(), errors = [];
  tab.on('pageerror', error => errors.push(String(error)));
  await tab.goto(`http://127.0.0.1:${port}/demo/gui-layer-fixture.html`);
  await tab.waitForFunction(() => !!window.guiLayerQA);
  const layout = await tab.evaluate(input => JSON.parse(JSON.stringify(window.guiLayerQA.layout(input),
    (_key, value) => value instanceof Float32Array ? Array.from(value) : value)), {...frame, ...command});
  const run = layout.runs[0];
  assert.deepEqual(run.vertices.map(vertex => vertex.position), oracle.vertices.map(vertex => vertex.positionHalf4.slice(0, 3)));
  assert.deepEqual(run.vertices.map(vertex => vertex.uvRaw), oracle.vertices.map(vertex => vertex.uvUNORM16raw));
  assert.deepEqual(run.vertices.map(vertex => vertex.rgba), oracle.vertices.map(vertex => vertex.colorRGBA8));
  assert.deepEqual(run.mvp, oracle.VSfloat32.slice(0, 16));
  assert.equal(run.glyphHeight, oracle.VSfloat32[16]);
  assert.equal(run.halfTexelOffset, oracle.VSfloat32[20]);
  const rendered = await tab.evaluate(input => window.guiLayerQA.render(input), options);
  result.renderer = rendered.renderer; result.browserVersion = browser.version();
  assert.match(rendered.renderer, values.backend === 'software' ? /SwiftShader/ : /NVIDIA.*(?:D3D11|Direct3D11)/);
  const actual = Buffer.from(rendered.rgba, 'base64');
  assert.equal(actual.length, after.data.length);
  assert.deepEqual(actual, Buffer.from(rendered.liveRgba, 'base64'));
  assert.deepEqual(errors, []);
  const differences = [];
  let maxChannelDifference = 0;
  for (let offset = 0; offset < actual.length; offset += 4) {
    const a = [...actual.subarray(offset, offset + 4)], b = [...after.data.subarray(offset, offset + 4)];
    if (a.some((value, channel) => value !== b[channel])) {
      differences.push({x: offset / 4 % frame.width, y: Math.floor(offset / 4 / frame.width), actual: a, expected: b});
      for (let channel = 0; channel < 4; channel++) maxChannelDifference = Math.max(maxChannelDifference, Math.abs(a[channel] - b[channel]));
    }
  }
  Object.assign(result, {status: differences.length ? 'STRICT_NATIVE_DIFFERENCE' : 'PASS_CONDITIONED_NATIVE_GLYPH',
    frame, geometryAndFullMVPMatch: true, functionAndLiveCanvasIdentical: true,
    differentPixels: differences.length, maxChannelDifference, actualRGBASHA256: sha(actual),
    expectedRGBASHA256: sha(after.data), sourcePageSHA256: sha(pageBytes),
    backgroundRGBASHA256: sha(before.data), packetSHA256: sha(packetBytes),
    explicitHostOrigin: command.origin, fontScale: command.fontScale,
    usesNativeBeforeBackground: true, pageErrors: errors});
  await writeFile(join(out, 'actual.rgba'), actual, {flag: 'wx'});
  await writeFile(join(out, 'actual.png'), PNG.sync.write({width: frame.width, height: frame.height, data: actual}), {flag: 'wx'});
  await writeFile(join(out, 'differences.json'), JSON.stringify(differences, null, 2) + '\n', {flag: 'wx'});
  process.exitCode = differences.length ? 1 : 0;
} catch (error) {
  Object.assign(result, {status: 'HARNESS_OR_FIXTURE_ERROR', error: String(error)});
  process.exitCode = 2;
} finally {
  try { await browser?.close(); } finally { await server?.close(); }
  result.closed = true;
  if (outputCreated) await writeFile(join(out, 'RESULT.json'), JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({...result, output: outputCreated ? out : null}, null, 2));
}
