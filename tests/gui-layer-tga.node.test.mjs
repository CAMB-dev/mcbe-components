// CPU-only format/ownership tests on real TS source. The renderer and React
// effect host are test doubles; these are not DOM mounting or GPU pixel tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const moduleURL = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const transpile = code => ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const source = async file => transpile(await fs.readFile(new URL('../src/' + file, import.meta.url), 'utf8'));
const replace = (text, name, value) => text.replaceAll(`'${name}'`, `'${value}'`).replaceAll(`"${name}"`, `'${value}'`);
const cacheURL = moduleURL(await source('texture-promise-cache.ts'));
const engineURL = moduleURL(replace(await source('item-renderer-engine.ts'), './texture-promise-cache', cacheURL));
const tgaURL = moduleURL(await source('gui-layer-tga.ts'));
const atlasURL = moduleURL(await source('gui-texture-atlas.ts'));
const { inspectGuiLayerTga } = await import(tgaURL);
const { decodeTga } = await import(engineURL);
const hooksURL = moduleURL(`export const createElement=(type,props)=>({type,props});export const forwardRef=f=>f; export const useCallback=f=>f;
export const useRef=v=>globalThis.__guiTgaHooks.ref(v);export const useState=v=>globalThis.__guiTgaHooks.state(v);export const useEffect=f=>globalThis.__guiTgaHooks.effects.push(f);`);
const jsxURL = moduleURL('export const jsx=(type,props)=>({type,props}); export const jsxs=jsx;');
const layerURL = moduleURL(`export const layoutSourceGuiLayer=o=>({outputRect:o.outputRect??[0,0,o.width,o.height],commands:o.commands.map(c=>({kind:c.kind}))});
export const renderGuiLayer=o=>globalThis.__guiTgaHooks.render(o);`);
let component = await source('gui-layer-component.tsx');
for (const [name, url] of [['react', hooksURL], ['react/jsx-runtime', jsxURL], ['./item-renderer-engine', engineURL], ['./gui-layer-tga', tgaURL], ['./gui-layer', layerURL], ['./gui-texture-atlas', atlasURL]]) component = replace(component, name, url);
const { GuiLayer } = await import(moduleURL(component));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const tick = () => new Promise(resolve => setImmediate(resolve));
const until = async predicate => { for (let i = 0; i < 50 && !predicate(); i++) await tick(); assert.ok(predicate(), 'isolated source effect settled'); };
const footer = Uint8Array.from([0,0,0,0,0,0,0,0,...Buffer.from('TRUEVISION-XFILE.\0', 'ascii')]);
function tga({ width = 2, height = 1, depth = 32, rle = false, signed = true, descriptor = depth === 32 ? 8 : 0, id = [] } = {}) {
  const header = new Uint8Array(18), view = new DataView(header.buffer); header[0] = id.length; header[2] = rle ? 10 : 2; header[16] = depth; header[17] = descriptor; view.setUint16(12, width, true); view.setUint16(14, height, true);
  const pixels = depth === 32 ? [30,20,10,0,60,50,40,127] : [30,20,10,60,50,40];
  return Uint8Array.from([...header, ...id, ...(rle ? [1, ...pixels] : pixels), ...(signed ? footer : [])]);
}
const inspect = (bytes, mime = 'application/octet-stream') => inspectGuiLayerTga(bytes.subarray(0, 18), bytes.subarray(Math.max(0, bytes.length - 26)), mime, bytes.length);
const bitmap = (width = 2, height = 1) => ({ width, height, closed: 0, [Symbol.toStringTag]: 'ImageBitmap', close() { this.closed++; } });
const image = texture => ({ kind: 'image', texture, rect: [0, 0, 1, 1] });
function effectHost(commands) {
  const refs = [], states = [], effects = [], renders = [], errors = [], cleanups = []; let ref = 0, state = 0, disposals = 0;
  const host = { effects, renders, errors, refs, states, ref: value => refs[ref++] ??= { current: value }, state: value => { const index = state++; if (!(index in states)) states[index] = value; return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; }, render: options => { renders.push(options); return { dispose: () => disposals++ }; } };
  globalThis.__guiTgaHooks = host;
  const vnode = GuiLayer({ width: 16, height: 16, guiScale: 1, commands, onRenderError: error => errors.push(error) }, null);
  const canvas = { width: 16, height: 16, addEventListener() {}, removeEventListener() {} }; vnode.props.ref(canvas);
  for (const setup of effects) { const cleanup = setup(); if (cleanup) cleanups.push(cleanup); }
  return { ...host, canvas, vnode, get disposals() { return disposals; }, cleanup() { vnode.props.ref(null); cleanups.forEach(cleanup => cleanup()); } };
}
async function environment(run) {
  const prior = { fetch: globalThis.fetch, createImageBitmap: globalThis.createImageBitmap, Uint8ClampedArray: globalThis.Uint8ClampedArray };
  try { await run(); } finally { Object.assign(globalThis, prior); delete globalThis.__guiTgaHooks; }
}
const response = blob => ({ ok: true, blob: async () => blob });

test('real whole uncompressed and RLE originals are identified without URL suffix and decode unchanged', async () => {
  for (const filename of ['../demo/assets/crafting-observed/blocks/stonecutter2_saw.tga', '../src/assets/item-renderers/banner_base.tga']) {
    const bytes = new Uint8Array(await fs.readFile(new URL(filename, import.meta.url))), metadata = inspect(bytes);
    const decoded = decodeTga(bytes.buffer); assert.deepEqual(metadata, { width: decoded.width, height: decoded.height }); assert.ok(decoded.data.length > 0);
  }
});

test('footerless24bit/origin/ID and footerless32bit TGA use explicit or generic MIME only', () => {
  const bytes = tga({ signed: false, depth: 24, descriptor: 48, id: [1, 2, 3] });
  for (const mime of ['', 'application/octet-stream', 'image/x-tga; charset=binary', 'IMAGE/TARGA']) assert.deepEqual(inspect(bytes, mime), { width: 2, height: 1 });
  assert.deepEqual([...decodeTga(bytes.buffer).data], [40,50,60,255,10,20,30,255]);
  assert.equal(inspect(bytes, 'image/jpeg'), undefined); assert.equal(inspect(bytes, 'text/plain'), undefined);
  assert.deepEqual(inspect(tga({ signed: false }), 'binary/octet-stream'), { width: 2, height: 1 });
});

test('PNG JPEG and WebP signatures win over misleading TGA MIME and even an appended TGA footer', () => {
  for (const magic of [[137,80,78,71,13,10,26,10], [255,216,255], [82,73,70,70,0,0,0,0,87,69,66,80]]) {
    const bytes = Uint8Array.from([...magic, ...new Array(18).fill(0), ...footer]); assert.equal(inspect(bytes, 'image/x-tga'), undefined);
  }
});

test('malformed or unsupported intended TGA rejects while unknown non-TGA remains browser fallback', () => {
  for (const mutate of [b => { b[2] = 3; }, b => { b[1] = 1; }, b => { b[16] = 8; }, b => { b[17] |= 192; }, b => { b[12] = b[13] = 0; }]) {
    const bytes = tga(); mutate(bytes); assert.throws(() => inspect(bytes), /TGA header/);
  }
  assert.throws(() => inspect(Uint8Array.from([0, 0, 2]), 'image/tga'), /TGA header/);
  const headerOnly = tga({ signed: false }).subarray(0, 18); headerOnly[0] = 255; assert.throws(() => inspect(headerOnly, 'image/tga'), /TGA header/);
  assert.equal(inspect(Uint8Array.from([1, 2, 3]), 'application/octet-stream'), undefined);
});

for (const [name, magic] of [['PNG',[137,80,78,71,13,10,26,10]], ['JPEG',[255,216,255]], ['WebP',[82,73,70,70,0,0,0,0,87,69,66,80]]]) test(`${name} actual source worker keeps original Blob identity and three none decoder options`, async () => environment(async () => {
  const blob = new Blob([Uint8Array.from(magic)], { type: 'image/x-tga' }), decoded = bitmap(), calls = [];
  globalThis.fetch = async () => response(blob); globalThis.createImageBitmap = async (...args) => { calls.push(args); return decoded; };
  const host = effectHost([image('/misleading.tga')]); await until(() => host.renders.length || host.errors.length);
  assert.equal(host.errors.length, 0); assert.equal(calls.length, 1); assert.strictEqual(calls[0][0], blob); assert.deepEqual(calls[0][1], { premultiplyAlpha: 'none', colorSpaceConversion: 'none', imageOrientation: 'none' }); assert.equal(decoded.closed, 1);
  host.cleanup(); await tick(); assert.equal(decoded.closed, 1); assert.equal(host.disposals, 1);
}));

test('actual worker dedupes a whole TGA URL across image and atlas leaves and preserves zero/partial alpha', async () => environment(async () => {
  let fetches = 0, bitmapCalls = 0;
  globalThis.fetch = async () => { fetches++; return response(new Blob([tga()], { type: 'application/octet-stream' })); }; globalThis.createImageBitmap = async () => { bitmapCalls++; throw Error('TGA must not call ImageBitmap'); };
  const atlas = { kind: 'atlas', width: 2, height: 1, tiles: [{ origin: [0,0], size: [2,1], texture: '/opaque.bin' }] };
  const host = effectHost([image('/opaque.bin'), image('/opaque.bin'), image(atlas)]); await until(() => host.renders.length || host.errors.length);
  assert.equal(host.errors.length, 0); assert.equal(fetches, 1); assert.equal(bitmapCalls, 0);
  const commands = host.renders[0].commands, value = commands[0].texture; assert.strictEqual(value, commands[1].texture); assert.strictEqual(value, commands[2].texture.tiles[0].texture); assert.deepEqual([...value.data], [10,20,30,0,40,50,60,127]);
  host.cleanup(); await tick(); assert.equal(host.disposals, 1);
}));

for (const scenario of ['axis', 'declared', 'remaining', 'decoder4MP']) test(`TGA ${scenario} rejection occurs before any RGBA output allocation`, async () => environment(async () => {
  const data = tga({ width: scenario === 'axis' ? 8193 : scenario === 'decoder4MP' ? 2049 : 2, height: scenario === 'decoder4MP' ? 2048 : 1 });
  const blob = new Blob([data], { type: 'image/tga' }); let bitmapCalls = 0, allocations = 0, wholeReads = 0;
  const full = blob.arrayBuffer.bind(blob); Object.defineProperty(blob, 'arrayBuffer', { value: () => { wholeReads++; return full(); } });
  globalThis.fetch = async () => response(blob); globalThis.createImageBitmap = async () => { bitmapCalls++; return bitmap(); };
  const Native = globalThis.Uint8ClampedArray; globalThis.Uint8ClampedArray = new Proxy(Native, { construct(target, args) { allocations++; return Reflect.construct(target, args); } });
  const blank = () => ({ kind: 'atlas', width: 4096, height: 4096, tiles: [] });
  const commands = scenario === 'remaining' ? [image(blank()), image(blank()), image('/extra')] : scenario === 'declared' ? [image({ kind: 'atlas', width: 1, height: 1, tiles: [{ origin: [0,0], size: [1,1], texture: '/wrong-size' }] })] : [image('/oversized')];
  const host = effectHost(commands); await until(() => host.errors.length);
  assert.equal(host.renders.length, 0); assert.equal(allocations, 0); assert.equal(bitmapCalls, 0);
  assert.match(host.errors[0].message, scenario === 'decoder4MP' ? /TGA dimensions/ : scenario === 'declared' ? /declared original size/ : /budget/);
  if (scenario !== 'decoder4MP') assert.equal(wholeReads, 0);
  host.cleanup();
}));

test('cancel after TGA header but before whole bytes settle skips decoder allocation and render', async () => environment(async () => {
  const bytes = tga(), body = deferred(), blob = new Blob([bytes], { type: 'image/tga' }); let wholeReads = 0, allocations = 0;
  Object.defineProperty(blob, 'arrayBuffer', { value: () => { wholeReads++; return body.promise; } });
  globalThis.fetch = async () => response(blob); globalThis.createImageBitmap = async () => bitmap();
  const Native = globalThis.Uint8ClampedArray; globalThis.Uint8ClampedArray = new Proxy(Native, { construct(target, args) { allocations++; return Reflect.construct(target, args); } });
  const host = effectHost([image('/delayed')]); await until(() => wholeReads === 1); host.cleanup(); body.resolve(bytes.buffer); await tick(); await tick();
  assert.equal(allocations, 0); assert.equal(host.renders.length, 0); assert.equal(host.errors.length, 0);
}));

test('late cancelled browser bitmap closes exactly once and cannot render or fail retired work', async () => environment(async () => {
  const pending = deferred(), decoded = bitmap(); let decoding = false;
  globalThis.fetch = async () => response(new Blob([Uint8Array.from([137,80,78,71,13,10,26,10])], { type: 'image/png' }));
  globalThis.createImageBitmap = () => { decoding = true; return pending.promise; };
  const host = effectHost([image('/late.png')]); await until(() => decoding); host.cleanup(); pending.resolve(decoded); await tick(); await tick(); assert.equal(decoded.closed, 1); assert.equal(host.renders.length, 0); assert.equal(host.errors.length, 0);
}));

test('truncated TGA aborts its request and closes already decoded bitmap sibling exactly once', async () => environment(async () => {
  const gate = deferred(), decoded = bitmap(); let bitmapDone = false;
  globalThis.fetch = async url => response(url === '/valid.png' ? new Blob([Uint8Array.from([137,80,78,71,13,10,26,10])], { type: 'image/png' }) : await gate.promise);
  globalThis.createImageBitmap = async () => { bitmapDone = true; return decoded; };
  const host = effectHost([image('/valid.png'), image('/broken.tga')]); await until(() => bitmapDone); await tick();
  gate.resolve(new Blob([tga({ signed: false }).subarray(0, 18)], { type: 'image/tga' })); await until(() => host.errors.length); assert.match(host.errors[0].message, /Truncated TGA/); assert.equal(decoded.closed, 1); assert.equal(host.renders.length, 0); host.cleanup(); assert.equal(decoded.closed, 1);
}));

test('encoded byte budget precedes sniffing, and early missing ImageBitmap guard keeps old zero-fetch behavior', async () => environment(async () => {
  let fetches = 0, reads = 0; globalThis.createImageBitmap = async () => bitmap(); globalThis.fetch = async () => { fetches++; return response({ size: 67108865, slice() { reads++; throw Error('budget must reject first'); } }); };
  const large = effectHost([image('/large')]); await until(() => large.errors.length); assert.match(large.errors[0].message, /encoded byte budget/); assert.equal(reads, 0); large.cleanup();
  globalThis.createImageBitmap = undefined; const noDecoder = effectHost([image('/no-decoder')]); await until(() => noDecoder.errors.length); assert.match(noDecoder.errors[0].message, /ImageBitmap decoding is unavailable/); assert.equal(fetches, 1); noDecoder.cleanup();
}));

test('TGA header reads retired before completion cannot reach full decode or render', async () => environment(async () => {
  const bytes = tga(), prefix = deferred(), blob = new Blob([bytes], { type: 'image/tga' }); let headerReads = 0, wholeReads = 0;
  const originalSlice = blob.slice.bind(blob);
  Object.defineProperty(blob, 'slice', { value(start, end) { if (start === 0 && end === 18) { headerReads++; return { arrayBuffer: () => prefix.promise }; } return originalSlice(start, end); } });
  Object.defineProperty(blob, 'arrayBuffer', { value: async () => { wholeReads++; return bytes.buffer; } });
  globalThis.fetch = async () => response(blob); globalThis.createImageBitmap = async () => { throw Error('retired header must not decode'); };
  const host = effectHost([image('/pending-header')]); await until(() => headerReads === 1); host.cleanup(); prefix.resolve(bytes.buffer.slice(0, 18)); await tick(); await tick();
  assert.equal(wholeReads, 0); assert.equal(host.renders.length, 0); assert.equal(host.errors.length, 0);
}));

test('immediate StrictMode-style effect cleanup starts no URL work', async () => environment(async () => {
  let fetches = 0; globalThis.fetch = async () => { fetches++; return response(new Blob([tga()])); }; globalThis.createImageBitmap = async () => bitmap();
  const host = effectHost([image('/strict.tga')]); host.cleanup(); await tick(); await tick(); assert.equal(fetches, 0); assert.equal(host.renders.length, 0); assert.equal(host.errors.length, 0);
}));

test('mixed whole TGA work retains at most four active URL workers', async () => environment(async () => {
  const pending = []; let active = 0, maxActive = 0;
  globalThis.fetch = url => { active++; maxActive = Math.max(active, maxActive); const task = deferred(); pending.push({ task, url, settled: false }); return task.promise.then(value => { active--; return value; }); };
  globalThis.createImageBitmap = async () => { throw Error('all worker inputs are TGA'); };
  const host = effectHost(Array.from({ length: 9 }, (_, index) => image(`/opaque-${index}`))); await until(() => pending.length >= 4); assert.equal(pending.length, 4);
  for (let tickCount = 0; tickCount < 50 && !host.renders.length && !host.errors.length; tickCount++) { for (const entry of pending) if (!entry.settled) { entry.settled = true; entry.task.resolve(response(new Blob([tga()], { type: 'application/octet-stream' }))); } await tick(); }
  assert.equal(host.errors.length, 0); assert.equal(host.renders.length, 1); assert.equal(pending.length, 9); assert.equal(maxActive, 4); host.cleanup();
}));

test('RLE truncation and overrun keep existing decoder errors without a browser fallback', async () => environment(async () => {
  for (const bytes of [tga({ rle: true, signed: false }).subarray(0, 18), Uint8Array.from([...tga({ rle: true, signed: false }).subarray(0, 18), 130, 0, 0, 0, 255])]) {
    let bitmapCalls = 0; globalThis.fetch = async () => response(new Blob([bytes], { type: 'image/x-tga' })); globalThis.createImageBitmap = async () => { bitmapCalls++; return bitmap(); };
    const host = effectHost([image('/rle')]); await until(() => host.errors.length); assert.match(host.errors[0].message, /TGA RLE/); assert.equal(bitmapCalls, 0); assert.equal(host.renders.length, 0); host.cleanup(); await tick();
  }
}));
