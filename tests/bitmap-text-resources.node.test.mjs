// CPU-only resource/accounting tests. GL doubles do not prove rendered pixels.
// node --test tests/bitmap-text-resources.node.test.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = path => readFile(new URL(`../src/${path}`, import.meta.url), 'utf8');
const moduleUrl = text => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
const transpile = text => ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const resourceUrl = moduleUrl(transpile(await source('bitmap-text-shared-resources.ts')));
const kernelUrl = moduleUrl(transpile(await source('gui-layer-kernels.ts')));
const rendererUrl = moduleUrl(transpile(await source('bitmap-text-webgl.ts'))
  .replace("from './bitmap-text-shared-resources'", `from '${resourceUrl}'`).replace("from './gui-layer-kernels'", `from '${kernelUrl}'`));
const sharedSource = transpile(await source('bitmap-text-shared.ts')).replace("from './bitmap-text-webgl'", `from '${rendererUrl}'`)
  .replace("from './bitmap-text-shared-resources'", `from '${resourceUrl}'`);
const { resizeSharedBitmapCanvas, SharedBitmapBudget } = await import(resourceUrl);
const { createSharedBitmapGlyphRenderer, renderBitmapGlyphs } = await import(rendererUrl);
let moduleId = 0;
const freshShared = async () => import(moduleUrl(sharedSource + `\n// isolated session ledger ${++moduleId}`));
const pixel = (red = 255) => ({ width: 1, height: 1, data: new Uint8ClampedArray([red, 64, 32, 255]) });
const run = page => ({ profile: 'atlas-rect', page, sampling: 'point', shader: 'bitmap', quads: [{ x: 0, y: 0, width: 2, height: 2, atlasRect: [0, 0, 1, 1] }] });
const options = (page = pixel()) => ({ width: 4, height: 2, pages: new Map([[0, page]]), runs: [run(0)] });

class Dimensions {
  constructor(width = 1, height = 1) { this.w = width; this.h = height; this.sizes = []; }
  get width() { return this.w; }
  set width(value) { this.w = value; this.sizes.push([this.w, this.h]); }
  get height() { return this.h; }
  set height(value) { this.h = value; this.sizes.push([this.w, this.h]); }
}
function fakeGl(canvas) {
  let next = 0, lost = false, boundTexture;
  const live = new Map(), counts = {}, uploads = [], sources = [];
  const create = kind => { const value = { kind, id: ++next }; live.set(value, kind); counts[kind] = (counts[kind] ?? 0) + 1; return value; };
  const remove = value => { if (!value) return; assert.ok(live.delete(value), `double deletion of ${value.kind}`); };
  const gl = new Proxy({
    counts, live, uploads, sources, reads: 0,
    isContextLost: () => lost,
    getExtension: name => name === 'WEBGL_lose_context' ? { loseContext() { if (lost) return; lost = true; canvas.emit?.('webglcontextlost'); } } : null,
    getContextAttributes: () => ({ premultipliedAlpha: true }),
    getParameter: name => name === 'MAX_TEXTURE_SIZE' ? 8192 : name === 'MAX_VERTEX_ATTRIBS' ? 8 : 0,
    getShaderPrecisionFormat: () => ({ precision: 23 }),
    createProgram: () => create('program'), createShader: () => create('shader'), createBuffer: () => create('buffer'),
    createTexture: () => create('texture'), createFramebuffer: () => create('framebuffer'),
    deleteProgram: remove, deleteShader: remove, deleteBuffer: remove, deleteTexture: remove, deleteFramebuffer: remove,
    getShaderParameter: () => true, getProgramParameter: () => true,
    getAttribLocation: (_program, name) => ({ position: 0, sourceUv: 1, sourceBounds: 2, color: 3, packedUv: 1 })[name],
    getUniformLocation: (_program, name) => ({ name }),
    getError: () => 'NO_ERROR', checkFramebufferStatus: () => 'FRAMEBUFFER_COMPLETE',
    shaderSource: (_shader, text) => sources.push(text),
    bindTexture: (_type, texture) => { if (texture) assert.ok(live.has(texture), 'binding a deleted texture'); boundTexture = texture; },
    texImage2D: (...args) => { uploads.push({ texture: boundTexture, width: args[3], height: args[4], first: args[8]?.[0] }); },
    readPixels(_x, _y, _width, _height, _format, _type, data) { gl.reads++; data.fill(37); },
  }, { get(target, key) { if (key in target) return target[key]; if (String(key).toUpperCase() === key) return key; return () => {}; } });
  return gl;
}
function environment() {
  const canvases = [], bitmaps = [];
  class Offscreen extends Dimensions {
    constructor(width, height) { super(width, height); this.listeners = new Map(); this.gl = fakeGl(this); canvases.push(this); }
    getContext() { return this.gl; }
    addEventListener(name, callback) { this.listeners.set(name, callback); }
    removeEventListener(name) { this.listeners.delete(name); }
    emit(name) { this.listeners.get(name)?.({ preventDefault() {} }); }
    transferToImageBitmap() { const bitmap = { closed: false, consumed: false, close() { this.closed = true; } }; bitmaps.push(bitmap); return bitmap; }
  }
  const ownerDocument = { defaultView: { OffscreenCanvas: Offscreen } };
  const target = (owner = ownerDocument) => {
    const value = new Dimensions(0, 0); value.ownerDocument = owner;
    value.getContext = () => ({ transferFromImageBitmap(bitmap) { if (value.fail) throw Error('presentation failed'); value.bitmap = bitmap; bitmap.consumed = true; } });
    return value;
  };
  return { target, ownerDocument, Offscreen, canvases, bitmaps };
}

test('opposite aspect resizes never exceed the old/new physical area, and unchanged sizes do no work', () => {
  const canvas = new Dimensions(512, 8192);
  resizeSharedBitmapCanvas(canvas, 8192, 512);
  resizeSharedBitmapCanvas(canvas, 512, 8192);
  assert.ok(canvas.sizes.every(([width, height]) => width * height <= 4194304));
  const count = canvas.sizes.length; resizeSharedBitmapCanvas(canvas, 512, 8192); assert.equal(canvas.sizes.length, count);
  resizeSharedBitmapCanvas(canvas, 0, 0); assert.deepEqual([canvas.width, canvas.height], [0, 0]);
});

test('global output16MP and512 owners reject before reservation, rollback and release permit recovery', () => {
  const budget = new SharedBitmapBudget(), session = {}, anchor = {}, candidate = {};
  budget.open(session); budget.acquire(anchor); budget.acquire(candidate);
  let token = budget.reserve(anchor, session, 4, 2, 128); budget.settle(anchor, session, token, 128, true);
  assert.throws(() => budget.reserve(candidate, session, 8192, 2048, 128), /16MP/);
  token = budget.reserve(candidate, session, 4, 2, 128); budget.settle(candidate, session, token, 128, false);
  budget.release(anchor);
  token = budget.reserve(candidate, session, 8192, 2048, 128); budget.settle(candidate, session, token, 128, false);
  const owners = Array.from({ length: 511 }, () => ({})); owners.forEach(owner => budget.acquire(owner));
  assert.throws(() => budget.acquire({}), /512/); budget.release(owners.pop()); budget.acquire({});
});

test('module256MiB accounts distinct documents, pending bitmaps and failed transfers without poisoning a session', () => {
  const budget = new SharedBitmapBudget(), a = {}, b = {}, ownerA = {}, ownerB = {};
  budget.open(a); budget.open(b); budget.acquire(ownerA); budget.acquire(ownerB);
  let token = budget.reserve(ownerA, a, 1, 1, 200 * 1048576); budget.settle(ownerA, a, token, 200 * 1048576, true);
  assert.throws(() => budget.reserve(ownerB, b, 1, 1, 60 * 1048576), /256MiB/);
  token = budget.reserve(ownerB, b, 1, 1, 50 * 1048576); budget.settle(ownerB, b, token, 50 * 1048576, false);
  budget.destroy(a); budget.release(ownerA);
  token = budget.reserve(ownerB, b, 1, 1, 200 * 1048576); budget.settle(ownerB, b, token, 0, false);
  token = budget.reserve(ownerB, b, 1, 1, 250 * 1048576); budget.settle(ownerB, b, token, 0, false);
});

test('48 same-content draws retain programs/pages/buffers/FBO and detect mutable page bytes', () => {
  const canvas = new Dimensions(4, 2), gl = fakeGl(canvas), renderer = createSharedBitmapGlyphRenderer(canvas, gl);
  canvas.getContext = () => gl;
  for (let i = 0; i < 48; i++) renderer.render(options(pixel()));
  assert.deepEqual(gl.counts, { texture: 2, framebuffer: 1, program: 2, shader: 4, buffer: 6 });
  assert.equal(gl.reads, 0); assert.equal(gl.uploads.length, 2);
  const page = pixel(); renderer.render(options(page)); page.data[0] = 11; renderer.render(options(page));
  assert.equal(gl.uploads.length, 3); assert.equal(gl.uploads.at(-1).first, 11);
  renderer.dispose(); assert.equal(gl.live.size, 0); assert.deepEqual([canvas.width, canvas.height], [1, 1]);
});

test('interleaved atlas/Unicode/copy programs retain no more than nine typed buffer slots', () => {
  const canvas = new Dimensions(4, 2), gl = fakeGl(canvas); canvas.getContext = () => gl;
  const renderer = createSharedBitmapGlyphRenderer(canvas, gl), page = { width: 256, height: 256, data: new Uint8Array(262144) };
  const unicode = { width: 4, height: 2, pages: new Map([[0, page]]), runs: [{
    profile: 'bedrock-unicode', page: 0, sampling: 'bilinear', shader: 'bitmap-smooth', glyphHeight: 1 / 16, halfTexelOffset: 1 / 512,
    vertices: [[0, 0, 0], [0, 2, 1], [2, 2, 2], [2, 0, 3]].map(position => ({ position, uvRaw: [0, 0], rgba: [255, 255, 255, 255] })), indices: [0, 1, 2, 0, 2, 3],
  }] };
  for (let i = 0; i < 12; i++) { renderer.estimate(options()); renderer.render(options()); renderer.estimate(unicode); renderer.render(unicode); }
  assert.equal(gl.counts.program, 3); assert.equal(gl.counts.shader, 6); assert.equal(gl.counts.buffer, 9); assert.equal(gl.reads, 0);
  renderer.dispose(); assert.equal(gl.live.size, 0);
});

test('A→B→A within one draw reuploads an evicted16MP page instead of binding its deleted handle', () => {
  const canvas = new Dimensions(4, 2), gl = fakeGl(canvas); canvas.getContext = () => gl;
  const renderer = createSharedBitmapGlyphRenderer(canvas, gl);
  const a = { width: 4096, height: 4096, data: new Uint8Array(67108864) }, b = { ...a, data: new Uint8Array(67108864) };
  a.data[0] = 1; b.data[0] = 2;
  const draw = { width: 4, height: 2, pages: new Map([[0, a], [1, b]]), runs: [run(0), run(1), run(0)] };
  renderer.estimate(draw); renderer.render(draw);
  assert.deepEqual(gl.uploads.map(upload => upload.first), [undefined, 1, 2, 1]);
  assert.equal([...gl.live.values()].filter(kind => kind === 'texture').length, 2);
  renderer.dispose(); assert.equal(gl.live.size, 0);
});

test('shared lease preflight protects a ready sibling, cancellation returns accounting, and final release deletes objects', async () => {
  const { acquireSharedBitmapRenderer } = await freshShared(), env = environment(), errors = [];
  const target = env.target(), anchor = acquireSharedBitmapRenderer(target, error => errors.push(error)); anchor.render(options());
  const previous = target.bitmap, initialCounts = { ...env.canvases[0].gl.counts };
  const other = env.target(), lease = acquireSharedBitmapRenderer(other, error => errors.push(error));
  assert.throws(() => lease.render({ width: 8192, height: 2048, pages: new Map(), runs: [] }), /16MP/);
  assert.equal(target.bitmap, previous); assert.deepEqual([other.width, other.height], [0, 0]); assert.deepEqual(env.canvases[0].gl.counts, initialCounts);
  let checks = 0; assert.equal(lease.render(options(), () => ++checks < 3), false); assert.equal(env.bitmaps.at(-1).closed, true);
  assert.equal(lease.render(options()), true); other.fail = true;
  assert.throws(() => lease.render(options()), /presentation failed/); assert.equal(env.bitmaps.at(-1).closed, true);
  assert.deepEqual([other.width, other.height], [0, 0]);
  other.fail = false; assert.equal(lease.render(options()), true); assert.equal(target.bitmap, previous); assert.deepEqual(errors, []);
  lease.release(); anchor.release(); await Promise.resolve(); assert.equal(env.canvases[0].gl.live.size, 0);
  assert.deepEqual([target.width, target.height, other.width, other.height], [0, 0, 0, 0]);
});

test('failed larger presentation clears its backing and output charge even when a direct lease stays mounted', async () => {
  const { acquireSharedBitmapRenderer } = await freshShared(), env = environment(), failed = env.target();
  const first = acquireSharedBitmapRenderer(failed, () => {}); first.render(options());
  const large = { width: 8192, height: 2048, pages: new Map(), runs: [] };
  failed.fail = true; assert.throws(() => first.render(large), /presentation failed/);
  assert.deepEqual([failed.width, failed.height], [0, 0]);
  const next = env.target(), second = acquireSharedBitmapRenderer(next, () => {});
  // Exactly16MP must now fit: neither old8px nor failed16MP are retained outputs.
  assert.equal(second.render(large), true);
  first.release(); second.release(); await Promise.resolve(); assert.equal(env.canvases[0].gl.live.size, 0);
});

test('actual shared draw and presenter resize both shrink before an opposite-aspect expansion', async () => {
  const { acquireSharedBitmapRenderer } = await freshShared(), env = environment(), target = env.target();
  const lease = acquireSharedBitmapRenderer(target, () => {});
  for (const [width, height] of [[512, 8192], [8192, 512], [512, 8192]]) lease.render({ width, height, pages: new Map(), runs: [] });
  assert.ok(target.sizes.every(([width, height]) => width * height <= 4194304));
  assert.ok(env.canvases[0].sizes.every(([width, height]) => width * height <= 4194304));
  lease.release(); await Promise.resolve(); assert.equal(env.canvases[0].gl.live.size, 0);
});

test('a lost shared context notifies each owner once and fresh acquisition starts a new bounded session', async () => {
  const { acquireSharedBitmapRenderer } = await freshShared(), env = environment(), errors = [];
  const a = acquireSharedBitmapRenderer(env.target(), () => errors.push('a')), b = acquireSharedBitmapRenderer(env.target(), () => errors.push('b'));
  a.render(options()); b.render(options()); env.canvases[0].gl.getExtension('WEBGL_lose_context').loseContext();
  assert.deepEqual(errors, ['a', 'b']); assert.equal(env.canvases[0].gl.live.size, 0); assert.throws(() => a.render(options()), /context was lost/);
  a.release(); b.release(); const c = acquireSharedBitmapRenderer(env.target(), () => {}); c.render(options());
  assert.equal(env.canvases.length, 2); c.release(); await Promise.resolve(); assert.equal(env.canvases[1].gl.live.size, 0);
});

test('exclusive public renderer retains mock readback output and one-shot deletion semantics', () => {
  const canvas = new Dimensions(4, 2), gl = fakeGl(canvas); canvas.transferToImageBitmap = () => {}; canvas.getContext = () => gl;
  const result = renderBitmapGlyphs({ ...options(), canvas });
  assert.equal(gl.reads, 1); assert.equal(result.data.length, 32); assert.ok(result.data.every(byte => byte === 37));
  assert.equal(gl.live.size, 0); assert.equal(gl.isContextLost(), false); result.dispose(); assert.equal(gl.isContextLost(), true);
});
