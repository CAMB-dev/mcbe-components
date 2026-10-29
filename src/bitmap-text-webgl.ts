import { GUI_BITMAP_CELL_VERTEX_SHADER as UNICODE_VERTEX, GUI_BITMAP_FRAGMENT_SHADER as GLYPH_FRAGMENT } from './gui-layer-kernels';
import type { PixelTexture } from './item-renderer-engine';
import { resizeSharedBitmapCanvas, SharedBitmapGpuResources } from './bitmap-text-shared-resources';

export type BitmapRgba = readonly [number, number, number, number];
/** Top-left target coordinates, in physical framebuffer pixels. */
export type BitmapTargetRect = readonly [number, number, number, number];
interface BitmapRunState {
  page: number;
  sampling: 'point' | 'bilinear';
  shader: 'bitmap' | 'bitmap-smooth';
  /** Column-major matrix. Omission uses top-left target-pixel coordinates. */
  mvp?: readonly number[] | Float32Array;
  tint?: BitmapRgba;
  hudOpacity?: number;
  viewport?: BitmapTargetRect;
  scissor?: BitmapTargetRect;
  cull?: 'none' | 'front' | 'back';
  frontFace?: 'cw' | 'ccw';
}
export interface BitmapAtlasQuad {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Source-pixel rectangle; arbitrary trimmed glyphs are supported. */
  atlasRect: readonly [number, number, number, number];
  color?: BitmapRgba;
}
export interface BitmapAtlasRun extends BitmapRunState {
  profile: 'atlas-rect';
  quads: readonly BitmapAtlasQuad[];
}
export interface BitmapUnicodeVertex {
  /** x/y and the actual corner ID, not geometric depth. */
  position: readonly [number, number, number];
  /** Actual unsigned normalized 16-bit base UV attributes. */
  uvRaw: readonly [number, number];
  /** Actual unsigned normalized 8-bit color attributes. */
  rgba: readonly [number, number, number, number];
}
export interface BitmapUnicodeRun extends BitmapRunState {
  profile: 'bedrock-unicode';
  vertices: readonly BitmapUnicodeVertex[];
  indices: readonly number[] | Uint16Array;
  /** Caller-owned uniform values. Horizontal span is the source VS constant 1/16. */
  glyphHeight: number;
  halfTexelOffset: number;
}
export type BitmapGlyphRun = BitmapAtlasRun | BitmapUnicodeRun;
export type BitmapGlyphBackground =
  | { kind: 'transparent' }
  | { kind: 'solid'; color: BitmapRgba }
  | { kind: 'texture'; texture: PixelTexture; encoding: 'framebuffer' | 'straight-alpha' };
export interface BitmapGlyphRenderOptions {
  width: number;
  height: number;
  pages: ReadonlyMap<number, PixelTexture>;
  runs: readonly BitmapGlyphRun[];
  background?: BitmapGlyphBackground;
  /** Default preserves framebuffer bytes. Straight conversion adds 8-bit unpremultiplication. */
  output?: 'framebuffer' | 'straight-alpha';
  /** Exclusive WebGL canvas. Its dimensions are set to the target; no 2D context may exist. */
  canvas?: HTMLCanvasElement | OffscreenCanvas;
}
export interface BitmapGlyphRenderResult extends PixelTexture {
  alphaMode: 'premultiplied' | 'straight';
  /** Releases this exclusive canvas context. Do not render on that canvas after disposal. */
  dispose: () => void;
}

const MAX_DIMENSION = 8192;
const MAX_PIXELS = 16777216;
const MAX_PAGE_PIXELS = 33554432;
const MAX_RUNS = 1024;
const MAX_VERTICES = 262144;
const MAX_INDICES = 786432;
const WHITE: BitmapRgba = [1, 1, 1, 1];

function finite(value: number, name: string): number {
  if (!Number.isFinite(value) || !Number.isFinite(Math.fround(value))) throw new RangeError(`${name} must be a finite float32 value.`);
  return value;
}
function integer(value: number, min: number, max: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(`${name} is out of range.`);
  return value;
}
function unit(value: number, name: string): number {
  finite(value, name);
  if (value < 0 || value > 1) throw new RangeError(`${name} must be between zero and one.`);
  return value;
}
function rgba(value: BitmapRgba, name: string): void {
  if (!value || value.length !== 4) throw new RangeError(`${name} requires four components.`);
  for (const channel of value) unit(channel, name);
}
function texture(value: PixelTexture, name: string): void {
  if (!value) throw new RangeError(`${name} is missing.`);
  integer(value.width, 1, MAX_DIMENSION, `${name}.width`);
  integer(value.height, 1, MAX_DIMENSION, `${name}.height`);
  const bytes = Object.prototype.toString.call(value.data);
  if (value.width * value.height > MAX_PIXELS || !['[object Uint8Array]', '[object Uint8ClampedArray]'].includes(bytes) || value.data.length !== value.width * value.height * 4) {
    throw new RangeError(`${name} must contain bounded RGBA8 pixels.`);
  }
}
function rect(value: BitmapTargetRect, width: number, height: number, name: string): void {
  if (!value || value.length !== 4) throw new RangeError(`${name} requires four components.`);
  integer(value[0], 0, width, name); integer(value[1], 0, height, name);
  integer(value[2], 0, width, name); integer(value[3], 0, height, name);
  if (value[0] + value[2] > width || value[1] + value[3] > height) throw new RangeError(`${name} exceeds the target.`);
}
function validate(options: BitmapGlyphRenderOptions): void {
  integer(options.width, 0, MAX_DIMENSION, 'width'); integer(options.height, 0, MAX_DIMENSION, 'height');
  if (options.width * options.height > MAX_PIXELS) throw new RangeError('Bitmap target exceeds the pixel limit.');
  if (!options.pages || typeof options.pages.get !== 'function' || !Array.isArray(options.runs) || options.runs.length > MAX_RUNS) throw new RangeError('Explicit bounded pages and runs are required.');
  if (options.canvas && typeof options.canvas.getContext !== 'function') throw new RangeError('An exclusive canvas is required.');
  if (options.output !== undefined && options.output !== 'framebuffer' && options.output !== 'straight-alpha') throw new RangeError('Unsupported bitmap output encoding.');
  const background = options.background;
  if (background?.kind === 'texture') {
    texture(background.texture, 'background');
    if (background.texture.width !== options.width || background.texture.height !== options.height) throw new RangeError('Background dimensions must exactly match the target.');
    if (background.encoding !== 'framebuffer' && background.encoding !== 'straight-alpha') throw new RangeError('Explicit background encoding is required.');
  } else if (background?.kind === 'solid') rgba(background.color, 'background.color');
  else if (background !== undefined && background.kind !== 'transparent') throw new RangeError('Unsupported bitmap background.');
  const visited = new Set<number>();
  let pagePixels = 0, vertices = 0, indices = 0;
  for (const run of options.runs) {
    if (!run) throw new RangeError('A bitmap run is missing.');
    integer(run.page, 0, 65535, 'run.page');
    const page = options.pages.get(run.page);
    if (!page) throw new RangeError('A bitmap run references a missing page.');
    if (!visited.has(run.page)) { texture(page, 'page'); pagePixels += page.width * page.height; visited.add(run.page); }
    if (visited.size > 256 || pagePixels > MAX_PAGE_PIXELS) throw new RangeError('Bitmap pages exceed the upload limit.');
    if (!['point', 'bilinear'].includes(run.sampling) || !['bitmap', 'bitmap-smooth'].includes(run.shader)) throw new RangeError('Explicit bitmap sampling and shader are required.');
    if (run.cull !== undefined && !['none', 'front', 'back'].includes(run.cull)) throw new RangeError('Unsupported cull mode.');
    if (run.frontFace !== undefined && !['cw', 'ccw'].includes(run.frontFace)) throw new RangeError('Unsupported front face.');
    if (run.mvp) { if (run.mvp.length !== 16) throw new RangeError('MVP requires sixteen column-major values.'); for (const value of run.mvp) finite(value, 'MVP'); }
    rgba(run.tint ?? WHITE, 'tint'); unit(run.hudOpacity ?? 1, 'hudOpacity');
    if (run.viewport) rect(run.viewport, options.width, options.height, 'viewport');
    if (run.scissor) rect(run.scissor, options.width, options.height, 'scissor');
    if (run.profile === 'atlas-rect') {
      if (!Array.isArray(run.quads) || run.quads.length > 16384) throw new RangeError('Atlas run exceeds the quad limit.');
      vertices += run.quads.length * 4;
      indices += run.quads.length * 6;
      for (const quad of run.quads) {
        if (!quad) throw new RangeError('An atlas quad is missing.');
        finite(quad.x, 'quad.x'); finite(quad.y, 'quad.y'); finite(quad.width, 'quad.width'); finite(quad.height, 'quad.height');
        finite(quad.x + quad.width, 'quad.right'); finite(quad.y + quad.height, 'quad.bottom');
        if (quad.width <= 0 || quad.height <= 0 || !quad.atlasRect || quad.atlasRect.length !== 4) throw new RangeError('Glyph rectangles must have positive dimensions.');
        const [x, y, width, height] = quad.atlasRect;
        integer(x, 0, page.width, 'atlas.x'); integer(y, 0, page.height, 'atlas.y');
        integer(width, 1, page.width, 'atlas.width'); integer(height, 1, page.height, 'atlas.height');
        if (x + width > page.width || y + height > page.height) throw new RangeError('Glyph rectangle exceeds its source page.');
        rgba(quad.color ?? WHITE, 'quad.color');
      }
    } else if (run.profile === 'bedrock-unicode') {
      if (page.width !== 256 || page.height !== 256) throw new RangeError('The explicit Bedrock Unicode profile requires a 256 by 256 page.');
      if (!Array.isArray(run.vertices) || run.vertices.length > 65536 || !run.indices || run.indices.length > 196608 || run.indices.length % 3) throw new RangeError('Invalid bounded Unicode vertex/index run.');
      vertices += run.vertices.length;
      indices += run.indices.length;
      unit(run.glyphHeight, 'glyphHeight'); unit(run.halfTexelOffset, 'halfTexelOffset');
      if (!run.glyphHeight || run.halfTexelOffset > Math.min(1 / 32, run.glyphHeight / 2)) throw new RangeError('Unicode clamp uniforms have inverted bounds.');
      for (const vertex of run.vertices) {
        if (!vertex) throw new RangeError('A Unicode vertex is missing.');
        if (!vertex.position || vertex.position.length !== 3 || !vertex.uvRaw || vertex.uvRaw.length !== 2 || !vertex.rgba || vertex.rgba.length !== 4) throw new RangeError('Malformed Unicode vertex.');
        finite(vertex.position[0], 'vertex.x'); finite(vertex.position[1], 'vertex.y'); integer(vertex.position[2], 0, 3, 'corner');
        for (const value of vertex.uvRaw) integer(value, 0, 65535, 'packed UV');
        for (const value of vertex.rgba) integer(value, 0, 255, 'vertex color');
      }
      for (const index of run.indices) integer(index, 0, run.vertices.length - 1, 'index');
    } else throw new RangeError('Unsupported bitmap source profile.');
    if (vertices > MAX_VERTICES) throw new RangeError('Bitmap runs exceed the total vertex limit.');
    if (indices > MAX_INDICES) throw new RangeError('Bitmap runs exceed the total index limit.');
  }
}

const ATLAS_VERTEX = `
attribute vec2 position;
attribute vec2 sourceUv;
attribute vec4 sourceBounds;
attribute vec4 color;
uniform mat4 mvp;
varying highp vec2 uv;
varying highp vec4 bounds;
varying highp vec4 ink;
void main() {
  vec4 clip = position.x * mvp[0] + position.y * mvp[1] + mvp[3];
  gl_Position = vec4(clip.xy, 0.0, clip.w);
  uv = sourceUv;
  bounds = sourceBounds;
  ink = color;
}`;


const COPY_VERTEX = `
attribute vec2 position;
varying highp vec2 uv;
void main() { gl_Position = vec4(position, 0.0, 1.0); uv = (position + 1.0) * 0.5; }
`;
const COPY_FRAGMENT = `
precision highp float;
uniform sampler2D atlas;
varying highp vec2 uv;
void main() { gl_FragColor = texture2D(atlas, uv); }
`;

/**
 * Side-effecting GPU renderer, not a pure texture operation. All I/O rows are top-first.
 * Framebuffer output preserves RGBA8 premultiplied storage. An optional exclusive
 * canvas is presented on-GPU with premultipliedAlpha:true, without a Canvas2D roundtrip.
 * Straight-alpha readback is an explicit lossy adapter and cannot certify DOM/native equality.
 */
export function renderBitmapGlyphs(options: BitmapGlyphRenderOptions): BitmapGlyphRenderResult {
  return renderBitmapGlyphsInternal(options);
}

/** Internal shared-only storage; the exclusive public renderer remains one-shot. */
export function createSharedBitmapGlyphRenderer(canvas: OffscreenCanvas, gl: WebGLRenderingContext) {
  const resources = new SharedBitmapGpuResources(gl, canvas);
  let closed = false;
  return {
    estimate(options: Omit<BitmapGlyphRenderOptions, 'canvas' | 'output'>) { if (!resources.live) throw new Error('The shared bitmap GPU resources were disposed.'); validate(options); return resources.estimate(options); },
    render(options: Omit<BitmapGlyphRenderOptions, 'canvas' | 'output'>) { if (!resources.live) throw new Error('The shared bitmap GPU resources were disposed.'); renderBitmapGlyphsInternal({ ...options, canvas }, resources); },
    get bytes() { return resources.bytes; },
    get live() { return resources.live; },
    dispose() { if (closed) return; closed = true; resources.dispose(); resizeSharedBitmapCanvas(canvas, 1, 1); if (!gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext(); },
  };
}

function renderBitmapGlyphsInternal(options: BitmapGlyphRenderOptions, resources?: SharedBitmapGpuResources): BitmapGlyphRenderResult {
  validate(options);
  const { width, height } = options;
  const alphaMode = options.output === 'straight-alpha' ? 'straight' : 'premultiplied';
  if (!width || !height) {
    if (options.canvas) { options.canvas.width = width; options.canvas.height = height; }
    return { width, height, data: new Uint8ClampedArray(0), alphaMode, dispose: () => {} };
  }
  if (!options.canvas && typeof document === 'undefined') throw new Error('WebGL bitmap rendering requires a browser canvas.');
  const canvas = options.canvas ?? document.createElement('canvas');
  if (resources) resizeSharedBitmapCanvas(canvas, width, height); else { canvas.width = width; canvas.height = height; }
  const attributes: WebGLContextAttributes = { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true };
  // Narrow the two canvas types so TypeScript selects their WebGL-specific
  // overloads, rather than the incompatible union of all rendering contexts.
  const gl = 'transferToImageBitmap' in canvas
    ? canvas.getContext('webgl', attributes)
    : canvas.getContext('webgl', attributes);
  if (!gl || gl.isContextLost()) throw new Error('WebGL bitmap rendering is unavailable.');
  if (!gl.getContextAttributes()?.premultipliedAlpha) throw new Error('The bitmap presentation canvas must use premultipliedAlpha:true.');
  const buffers: WebGLBuffer[] = [], textures: WebGLTexture[] = [], framebuffers: WebGLFramebuffer[] = [];
  const programs: WebGLProgram[] = [], shaders: WebGLShader[] = [];
  let disposed = false, successful = false;
  const dispose = () => { if (!disposed) { disposed = true; gl.getExtension('WEBGL_lose_context')?.loseContext(); } };
  const program = (vertex: string, fragment: string) => {
    const key = vertex === UNICODE_VERTEX ? 'unicode' : vertex === ATLAS_VERTEX ? 'atlas' : 'copy';
    const cached = resources?.programs.get(key); if (cached) return cached;
    const result = gl.createProgram(); if (!result) throw new Error('Unable to allocate bitmap shader program.'); programs.push(result);
    resources?.programObjects.add(result);
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
      const shader = gl.createShader(type); if (!shader) throw new Error('Unable to allocate bitmap shader.'); shaders.push(shader);
      resources?.shaders.add(shader);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`Bitmap shader compilation failed: ${gl.getShaderInfoLog(shader)}`);
      gl.attachShader(result, shader);
    }
    gl.linkProgram(result);
    if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error(`Bitmap shader link failed: ${gl.getProgramInfoLog(result)}`);
    resources?.programs.set(key, result); resources?.programKeys.set(result, key);
    return result;
  };
  const upload = (w: number, h: number, data: Uint8Array | Uint8ClampedArray | null) => {
    const result = gl.createTexture(); if (!result) throw new Error('Unable to allocate bitmap texture.'); textures.push(result);
    resources?.textures.add(result);
    gl.bindTexture(gl.TEXTURE_2D, result);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return result;
  };
  const attribute = (active: WebGLProgram, name: string, data: Float32Array | Uint16Array | Uint8Array, size: number, type: number, normalized = false) => {
    const buffer = resources ? resources.buffer(`${resources.programKeys.get(active)!}:${name}`, data.byteLength) : gl.createBuffer();
    if (!buffer) throw new Error('Unable to allocate bitmap buffer.'); if (!resources) buffers.push(buffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const location = gl.getAttribLocation(active, name); if (location < 0) throw new Error(`Missing bitmap attribute ${name}.`);
    gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, size, type, normalized, 0, 0);
  };
  try {
    const maximum = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    if (width > maximum || height > maximum || !gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision) throw new Error('The GPU cannot represent this bitmap target with high precision.');
    for (const run of options.runs) { const page = options.pages.get(run.page)!; if (page.width > maximum || page.height > maximum) throw new RangeError('Bitmap page exceeds the GPU texture limit.'); }
    gl.activeTexture(gl.TEXTURE0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    let initial: Uint8Array | null = null;
    const background = options.background;
    if (background?.kind === 'texture') {
      initial = new Uint8Array(width * height * 4);
      for (let y = 0; y < height; y++) {
        const source = background.texture.data.subarray(y * width * 4, (y + 1) * width * 4);
        initial.set(source, (height - 1 - y) * width * 4);
      }
      if (background.encoding === 'straight-alpha') for (let i = 0; i < initial.length; i += 4) {
        const alpha = initial[i + 3]! / 255;
        for (let channel = 0; channel < 3; channel++) initial[i + channel] = Math.round(initial[i + channel]! * alpha);
      }
    }
    if (resources?.target && (resources.target.width !== width || resources.target.height !== height)) {
      gl.deleteFramebuffer(resources.target.framebuffer); resources.framebuffers.delete(resources.target.framebuffer);
      gl.deleteTexture(resources.target.texture); resources.textures.delete(resources.target.texture); resources.target = undefined;
    }
    const target = resources?.target?.texture ?? upload(width, height, initial);
    if (resources?.target && initial) { gl.bindTexture(gl.TEXTURE_2D, target); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, initial); }
    const framebuffer = resources?.target?.framebuffer ?? gl.createFramebuffer(); if (!framebuffer) throw new Error('Unable to allocate bitmap framebuffer.');
    if (resources) { resources.framebuffers.add(framebuffer); resources.target = { width, height, texture: target, framebuffer }; } else framebuffers.push(framebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Bitmap RGBA8 framebuffer is incomplete.');
    gl.disable(gl.DITHER); gl.disable(gl.DEPTH_TEST); gl.disable(gl.STENCIL_TEST); gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE); gl.disable(gl.SAMPLE_COVERAGE);
    gl.depthMask(false); gl.colorMask(true, true, true, true);
    gl.disable(gl.SCISSOR_TEST);
    if (!initial) {
      const color = background?.kind === 'solid' ? background.color : [0, 0, 0, 0];
      gl.clearColor(color[0]! * color[3]!, color[1]! * color[3]!, color[2]! * color[3]!, color[3]!); gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.enable(gl.BLEND); gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const pageTextures = new Map<number, WebGLTexture>(), profilePrograms = new Map<string, WebGLProgram>();
    const defaultMvp = new Float32Array([2 / width, 0, 0, 0, 0, -2 / height, 0, 0, 0, 0, 1, 0, -1, 1, 0, 1]);
    for (const run of options.runs) {
      const page = options.pages.get(run.page)!;
      let atlas = pageTextures.get(run.page);
      if (resources && atlas && !resources.textures.has(atlas)) atlas = undefined;
      if (!atlas) { atlas = resources ? resources.page(page, data => upload(page.width, page.height, data)) : upload(page.width, page.height, page.data); pageTextures.set(run.page, atlas); }
      gl.bindTexture(gl.TEXTURE_2D, atlas);
      const filter = run.sampling === 'point' ? gl.NEAREST : gl.LINEAR;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      let active = profilePrograms.get(run.profile);
      if (!active) { active = program(run.profile === 'bedrock-unicode' ? UNICODE_VERTEX : ATLAS_VERTEX, GLYPH_FRAGMENT); profilePrograms.set(run.profile, active); }
      gl.useProgram(active);
      for (let i = 0; i < (gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number); i++) gl.disableVertexAttribArray(i);
      gl.uniformMatrix4fv(gl.getUniformLocation(active, 'mvp'), false, run.mvp ? new Float32Array(run.mvp) : defaultMvp);
      gl.uniform4fv(gl.getUniformLocation(active, 'tint'), new Float32Array(run.tint ?? WHITE));
      gl.uniform1f(gl.getUniformLocation(active, 'hudOpacity'), run.hudOpacity ?? 1);
      gl.uniform1i(gl.getUniformLocation(active, 'smoothBitmap'), run.shader === 'bitmap-smooth' ? 1 : 0);
      gl.uniform1i(gl.getUniformLocation(active, 'atlas'), 0);
      const viewport = run.viewport ?? [0, 0, width, height], scissor = run.scissor ?? [0, 0, width, height];
      gl.viewport(viewport[0]!, height - viewport[1]! - viewport[3]!, viewport[2]!, viewport[3]!);
      gl.enable(gl.SCISSOR_TEST); gl.scissor(scissor[0]!, height - scissor[1]! - scissor[3]!, scissor[2]!, scissor[3]!);
      gl.frontFace(run.frontFace === 'cw' ? gl.CW : gl.CCW);
      if (!run.cull || run.cull === 'none') gl.disable(gl.CULL_FACE);
      else { gl.enable(gl.CULL_FACE); gl.cullFace(run.cull === 'front' ? gl.FRONT : gl.BACK); }
      let indices: Uint16Array;
      if (run.profile === 'bedrock-unicode') {
        attribute(active, 'position', new Float32Array(run.vertices.flatMap(vertex => [...vertex.position])), 3, gl.FLOAT);
        attribute(active, 'packedUv', new Uint16Array(run.vertices.flatMap(vertex => [...vertex.uvRaw])), 2, gl.UNSIGNED_SHORT, true);
        attribute(active, 'color', new Uint8Array(run.vertices.flatMap(vertex => [...vertex.rgba])), 4, gl.UNSIGNED_BYTE, true);
        gl.uniform1f(gl.getUniformLocation(active, 'glyphHeight'), run.glyphHeight); gl.uniform1f(gl.getUniformLocation(active, 'halfTexel'), run.halfTexelOffset);
        indices = new Uint16Array(run.indices);
      } else {
        const positions: number[] = [], uvs: number[] = [], bounds: number[] = [], colors: number[] = [], elements: number[] = [];
        run.quads.forEach((quad, index) => {
          const [x, y, w, h] = quad.atlasRect, color = quad.color ?? WHITE;
          positions.push(quad.x, quad.y, quad.x + quad.width, quad.y, quad.x + quad.width, quad.y + quad.height, quad.x, quad.y + quad.height);
          uvs.push(x / page.width, y / page.height, (x + w) / page.width, y / page.height, (x + w) / page.width, (y + h) / page.height, x / page.width, (y + h) / page.height);
          for (let i = 0; i < 4; i++) { bounds.push((x + .5) / page.width, (y + .5) / page.height, (x + w - .5) / page.width, (y + h - .5) / page.height); colors.push(...color); }
          const start = index * 4; elements.push(start, start + 1, start + 2, start, start + 2, start + 3);
        });
        attribute(active, 'position', new Float32Array(positions), 2, gl.FLOAT); attribute(active, 'sourceUv', new Float32Array(uvs), 2, gl.FLOAT);
        attribute(active, 'sourceBounds', new Float32Array(bounds), 4, gl.FLOAT); attribute(active, 'color', new Float32Array(colors), 4, gl.FLOAT);
        indices = new Uint16Array(elements);
      }
      const buffer = resources ? resources.buffer('index', indices.byteLength) : gl.createBuffer(); if (!buffer) throw new Error('Unable to allocate bitmap index buffer.'); if (!resources) buffers.push(buffer);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
      if (gl.getError() !== gl.NO_ERROR || gl.isContextLost()) throw new Error('GPU bitmap drawing failed.');
    }
    const data = resources ? new Uint8ClampedArray(0) : new Uint8ClampedArray(width * height * 4);
    if (!resources) {
      const bottom = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, bottom);
      if (gl.getError() !== gl.NO_ERROR) throw new Error('GPU bitmap readback failed.');
      for (let y = 0; y < height; y++) data.set(bottom.subarray(y * width * 4, (y + 1) * width * 4), (height - 1 - y) * width * 4);
    }
    if (options.canvas) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, width, height);
      gl.disable(gl.SCISSOR_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
      const copy = program(COPY_VERTEX, COPY_FRAGMENT); gl.useProgram(copy);
      for (let i = 0; i < (gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number); i++) gl.disableVertexAttribArray(i);
      gl.bindTexture(gl.TEXTURE_2D, target); gl.uniform1i(gl.getUniformLocation(copy, 'atlas'), 0);
      attribute(copy, 'position', new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), 2, gl.FLOAT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (gl.getError() !== gl.NO_ERROR || gl.isContextLost()) throw new Error('GPU bitmap presentation failed.');
    }
    if (alphaMode === 'straight') for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3]!;
      for (let channel = 0; channel < 3; channel++) data[i + channel] = alpha ? Math.min(255, Math.round(data[i + channel]! * 255 / alpha)) : 0;
    }
    successful = true;
    return { width, height, data, alphaMode, dispose };
  } finally {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.useProgram(null);
    if (resources) { if (!successful) resources.dispose(); }
    else {
      for (const buffer of buffers) gl.deleteBuffer(buffer);
      for (const framebuffer of framebuffers) gl.deleteFramebuffer(framebuffer);
      for (const value of textures) gl.deleteTexture(value);
      for (const value of programs) gl.deleteProgram(value);
      for (const value of shaders) gl.deleteShader(value);
    }
    if (!options.canvas || !successful) dispose();
  }
}
