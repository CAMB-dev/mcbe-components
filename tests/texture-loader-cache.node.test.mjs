// CPU-only: real source modules with mocked browser/network APIs. Run:
// node --test tests/texture-loader-cache.node.test.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const sourceUrl = path => new URL(`../src/${path}`, import.meta.url);
const asModule = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const transpile = code => ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const helperModule = asModule(transpile(await readFile(sourceUrl('texture-promise-cache.ts'), 'utf8')));
const { createTexturePromiseCache } = await import(helperModule);
const loaderSource = transpile(await readFile(sourceUrl('item-renderer-engine.ts'), 'utf8'))
  .replace("from './texture-promise-cache'", `from '${helperModule}'`);
let moduleId = 0;
const freshLoader = async () => (await import(asModule(`${loaderSource}\n// isolated instance ${++moduleId}`))).loadTexture;
const texture = bytes => ({ width: bytes / 4, height: 1, data: new Uint8ClampedArray(bytes) });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const pendingCache = () => {
  const requests = new Map();
  const get = createTexturePromiseCache(url => {
    const task = deferred();
    const list = requests.get(url) ?? []; list.push(task); requests.set(url, list);
    return task.promise;
  });
  return { get, requests, settle: () => { for (const list of requests.values()) for (const task of list) task.resolve(texture(4)); } };
};
const tick = () => Promise.resolve();

test('resident pending and successful entries dedupe the same promise and value', async () => {
  const cache = pendingCache(), a = cache.get('a');
  assert.equal(cache.get('a'), a);
  await tick(); assert.equal(cache.requests.get('a').length, 1);
  const value = texture(4); cache.requests.get('a')[0].resolve(value);
  assert.equal(await a, value); assert.equal(cache.get('a'), a);
  assert.equal(await cache.get('a'), value);
});

test('64 resident pending entries count towards LRU; eviction never cancels their owner', async () => {
  const cache = pendingCache(), first = cache.get('0');
  for (let i = 1; i < 64; i++) cache.get(String(i));
  assert.equal(cache.get('0'), first); // Hit promotes0;1 becomes the oldest.
  cache.get('64'); const secondOne = cache.get('1');
  await tick(); assert.equal(cache.requests.get('0').length, 1); assert.equal(cache.requests.get('1').length, 2);
  cache.settle(); assert.equal((await first).data.length, 4); await secondOne;
});

for (const settlement of ['resolve', 'reject']) for (const replacementState of ['pending', 'resolved']) test(`evicted pending late ${settlement} cannot alter a ${replacementState} replacement for the same URL`, async () => {
  const cache = pendingCache(), old = cache.get('same');
  // Attach a rejection handler before intentionally rejecting the displaced task.
  const observedOld = old.then(value => value, error => error);
  for (let i = 0; i < 64; i++) cache.get(`other${i}`);
  const replacement = cache.get('same'); await tick();
  const [before, after] = cache.requests.get('same'); assert.notEqual(old, replacement);
  const replacementValue = texture(12);
  if (replacementState === 'resolved') { after.resolve(replacementValue); await replacement; }
  const value = texture(8), failure = new Error('old owner failure');
  before[settlement](settlement === 'resolve' ? value : failure);
  assert.equal(await observedOld, settlement === 'resolve' ? value : failure);
  assert.equal(cache.get('same'), replacement); // Oldsettle neither reinserts nor deletes.
  if (replacementState === 'pending') after.resolve(replacementValue);
  assert.equal(await replacement, replacementValue); assert.equal(cache.get('same'), replacement);
  cache.settle();
});

test('failures are removed immediately, including a synchronous loader throw', async () => {
  let attempts = 0;
  const get = createTexturePromiseCache(() => { if (++attempts === 1) throw Error('temporary'); return Promise.resolve(texture(4)); });
  await assert.rejects(get('retry'), /temporary/);
  const second = get('retry'); assert.equal((await second).data.length, 4);
  assert.equal(get('retry'), second); assert.equal(attempts, 2);
});

test('32MiB boundary is resident; backing-store bytes and completion-time LRU are counted', async () => {
  const limit = 32 * 1024 * 1024, calls = [];
  const get = createTexturePromiseCache(async url => { calls.push(url); return texture(url === 'large' ? limit : 4); });
  const large = get('large'); await large; assert.equal(get('large'), large);
  await get('tiny'); //32MiB+4 evicts the older large entry.
  assert.notEqual(get('large'), large); await get('large');
  assert.deepEqual(calls, ['large', 'tiny', 'large']);
  let viewCalls = 0;
  const backing = new ArrayBuffer(limit + 1);
  const viewGet = createTexturePromiseCache(async () => { viewCalls++; return { width: 1, height: 1, data: new Uint8ClampedArray(backing, 0, 4) }; });
  await viewGet('view'); await viewGet('view'); assert.equal(viewCalls, 2); //Not merely4 visible bytes.
});

test('oversized results reach their caller, remain uncached and preserve useful small residents', async () => {
  const smallValue = texture(4), largeValue = texture(32 * 1024 * 1024 + 4);
  let largeCalls = 0;
  const get = createTexturePromiseCache(async url => url === 'small' ? smallValue : (largeCalls++, largeValue));
  const small = get('small'); await small;
  assert.equal(await get('large'), largeValue); assert.equal(get('small'), small);
  assert.equal(await get('large'), largeValue); assert.equal(largeCalls, 2);
});

test('pending completion enforces byte pressure in access order without aborting evicted pending owners', async () => {
  const cache = pendingCache(), pending = cache.get('old-pending'), large = cache.get('large');
  await tick(); cache.requests.get('large')[0].resolve(texture(32 * 1024 * 1024)); await large;
  const small = cache.get('small'); await tick(); cache.requests.get('small')[0].resolve(texture(4)); await small;
  const retriedPending = cache.get('old-pending'); await tick();
  assert.notEqual(retriedPending, pending); assert.equal(cache.requests.get('old-pending').length, 2);
  cache.settle(); assert.equal((await pending).data.length, 4); await retriedPending;
});

function installGlobals(t, overrides) {
  const originals = new Map(Object.keys(overrides).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(overrides)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  t.after(() => { for (const [key, descriptor] of originals) if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; });
}
const pngBytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0]).buffer;
const pngResponse = () => ({ ok: true, status: 200, arrayBuffer: async () => pngBytes });

test('actual loadTexture PNG wiring dedupes, returns the exact PixelTexture data and closes bitmap', async t => {
  const held = deferred(), pixels = Uint8ClampedArray.from([1, 2, 3, 64, 17, 29, 43, 255]);
  let fetches = 0, bitmaps = 0, closes = 0, draws = 0;
  installGlobals(t, {
    fetch: async () => { fetches++; return held.promise; },
    createImageBitmap: async blob => { assert.equal(blob.type, 'image/png'); bitmaps++; return { width: 2, height: 1, close: () => closes++ }; },
    document: { createElement: tag => { assert.equal(tag, 'canvas'); return { getContext: kind => { assert.equal(kind, '2d'); return { drawImage: () => draws++, getImageData: () => ({ data: pixels }) }; } }; } },
  });
  const load = await freshLoader(), first = load('/original.png'); assert.equal(load('/original.png'), first);
  held.resolve(pngResponse()); const result = await first;
  assert.deepEqual(result, { width: 2, height: 1, data: pixels }); assert.equal(result.data, pixels);
  assert.equal(load('/original.png'), first); assert.deepEqual([fetches, bitmaps, draws, closes], [1, 1, 1, 1]);
});

for (const stage of ['canvas-create', 'canvas-size', 'context-null', 'context-throw', 'draw', 'read']) test(`actual loader closes bitmap and retries after ${stage} failure`, async t => {
  let broken = true, closes = 0, fetches = 0;
  const failure = new Error(stage), pixels = new Uint8ClampedArray(4);
  installGlobals(t, {
    fetch: async () => { fetches++; return pngResponse(); },
    createImageBitmap: async () => ({ width: 1, height: 1, close: () => closes++ }),
    document: { createElement: () => {
      if (broken && stage === 'canvas-create') throw failure;
      return { set width(_) { if (broken && stage === 'canvas-size') throw failure; }, height: 1,
        get width() { return 1; }, getContext: () => {
          if (broken && stage === 'context-null') return null;
          if (broken && stage === 'context-throw') throw failure;
          return { drawImage: () => { if (broken && stage === 'draw') throw failure; },
            getImageData: () => { if (broken && stage === 'read') throw failure; return { data: pixels }; } };
        } };
    } },
  });
  const load = await freshLoader(); await assert.rejects(load('/retry.png'), stage === 'context-null' ? /Canvas2D unavailable/ : error => error === failure);
  assert.equal(closes, 1); broken = false;
  assert.equal((await load('/retry.png')).data, pixels); assert.equal(fetches, 2); assert.equal(closes, 2);
});

for (const stage of ['http', 'network', 'body', 'decode']) test(`actual loader ${stage} rejection is retryable without closing an uncreated bitmap`, async t => {
  let attempts = 0, bitmapCalls = 0, closes = 0;
  const failure = new Error(stage);
  installGlobals(t, {
    fetch: async () => {
      attempts++;
      if (attempts === 1 && stage === 'http') return { ok: false, status: 503 };
      if (attempts === 1 && stage === 'network') throw failure;
      if (attempts === 1 && stage === 'body') return { ok: true, arrayBuffer: async () => { throw failure; } };
      return pngResponse();
    },
    createImageBitmap: async () => { bitmapCalls++; if (attempts === 1 && stage === 'decode') throw failure; return { width: 1, height: 1, close: () => closes++ }; },
    document: { createElement: () => ({ getContext: () => ({ drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(4) }) }) }) },
  });
  const load = await freshLoader(); await assert.rejects(load('/temporary.png'), stage === 'http' ? /HTTP 503/ : error => error === failure);
  assert.equal(closes, 0); assert.equal((await load('/temporary.png')).data.length, 4);
  assert.equal(attempts, 2); assert.equal(closes, 1); assert.equal(bitmapCalls, stage === 'decode' ? 2 : 1);
});

test('actual loader keeps original TGA decoding and never creates a bitmap for TGA', async t => {
  const raw = new Uint8Array(22); raw[2] = 2; raw[12] = 1; raw[14] = 1; raw[16] = 32; raw[17] = 32;
  raw.set([43, 29, 17, 175], 18);
  installGlobals(t, { fetch: async () => ({ ok: true, arrayBuffer: async () => raw.buffer }), createImageBitmap: () => { throw Error('TGA must not use PNG bitmap'); } });
  const load = await freshLoader(), first = load('/source.tga');
  assert.deepEqual(await first, { width: 1, height: 1, data: Uint8ClampedArray.from([17, 29, 43, 175]) });
  assert.equal(load('/source.tga'), first);
});
