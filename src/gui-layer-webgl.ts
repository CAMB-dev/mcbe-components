import type { PixelTexture } from './item-renderer-engine';
import type { BitmapUnicodeRun } from './bitmap-text-webgl';
import type { GuiTextRgba8 } from './gui-text-geometry';
import type { GuiImageMesh, GuiImageRect, GuiImageRgba } from './gui-image-geometry';
import type { GuiImageBackground, GuiImageTexture } from './gui-image-webgl';
import { validateGuiTextureAtlasLayout } from './gui-texture-atlas';
import type { GuiLayerTexture, GuiTextureAtlas } from './gui-texture-atlas';
import { GUI_IMAGE_VERTEX_SHADER, GUI_IMAGE_FRAGMENT_SHADER, GUI_SPRITE_VERTEX_SHADER, GUI_SPRITE_FRAGMENT_SHADER, GUI_BITMAP_CELL_VERTEX_SHADER, GUI_BITMAP_FRAGMENT_SHADER, GUI_COPY_VERTEX_SHADER, GUI_COPY_FRAGMENT_SHADER } from './gui-layer-kernels';
import { guiEntityVertexShader, GUI_ENTITY_FRAGMENT_SHADER } from './gui-entity-kernels';
import type { GuiEntityLayout } from './gui-entity-geometry';

/** Internal prepared boundary. The public adapter owns source layout and matrix construction. */
export interface GuiLayerPreparedImageCommand {
  kind: 'image';
  mesh: GuiImageMesh;
  texture: GuiLayerTexture;
  mvp: Float32Array;
}
export interface GuiLayerPreparedTextCommand {
  kind: 'text';
  /** Local packed-cell vertices; z is a corner tag, never geometric depth. */
  run: Omit<BitmapUnicodeRun, 'profile' | 'page' | 'mvp'> & { mvp: Float32Array };
  texture: GuiImageTexture;
}
export interface GuiLayerPreparedSpriteCommand extends Omit<GuiLayerPreparedImageCommand, 'kind'> {
  kind: 'sprite';
  color: GuiTextRgba8;
}
export interface GuiLayerPreparedEntityCommand {
  kind: 'entity';
  texture: GuiImageTexture;
  layout: GuiEntityLayout;
}
export type GuiLayerPreparedCommand = GuiLayerPreparedImageCommand | GuiLayerPreparedSpriteCommand | GuiLayerPreparedTextCommand | GuiLayerPreparedEntityCommand;
export interface GuiLayerPreparedOptions {
  /** Whole physical framebuffer. Crop never changes the declared projection. */
  width: number;
  height: number;
  commands: readonly GuiLayerPreparedCommand[];
  outputRect?: GuiImageRect;
  scissor?: GuiImageRect;
  background?: GuiImageBackground;
  canvas?: HTMLCanvasElement | OffscreenCanvas;
  output?: 'framebuffer' | 'straight-alpha';
}
export interface GuiLayerPreparedResult extends PixelTexture {
  alphaMode: 'premultiplied' | 'straight';
  /** Only dispose a live canvas after retiring it; this loses its exclusive context. */
  dispose: () => void;
}

const WHITE: GuiImageRgba = [1, 1, 1, 1];
function finite(value: number, name: string): void {
  if (!Number.isFinite(value) || !Number.isFinite(Math.fround(value))) throw new RangeError(`${name} must be finite float32.`);
}
function integer(value: number, minimum: number, maximum: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new RangeError(`${name} is out of range.`);
}
function unit(value: number, name: string): void { finite(value, name); if (value < 0 || value > 1) throw new RangeError(`${name} must be normalized.`); }
function color(value: GuiImageRgba, name: string): void {
  if (!value || value.length !== 4) throw new RangeError(`${name} needs four components.`);
  for (const channel of value) unit(channel, name);
}
function matrix(value: Float32Array, name: string): void {
  if (!value || Object.prototype.toString.call(value) !== '[object Float32Array]' || value.length !== 16) throw new RangeError(`${name} requires sixteen explicit float32 values.`);
  for (const part of value) finite(part, name);
}
function rectangle(value: GuiImageRect, width: number, height: number, name: string): void {
  if (!value || value.length !== 4) throw new RangeError(`${name} requires four components.`);
  integer(value[0], 0, width, name); integer(value[1], 0, height, name); integer(value[2], 0, width, name); integer(value[3], 0, height, name);
  if (value[0] + value[2] > width || value[1] + value[3] > height) throw new RangeError(`${name} exceeds the framebuffer.`);
}
function isBitmap(value: GuiLayerTexture): value is ImageBitmap { return Object.prototype.toString.call(value) === '[object ImageBitmap]'; }
function isAtlas(value: unknown): value is GuiTextureAtlas { return !!value && typeof value === 'object' && (value as { kind?: unknown }).kind === 'atlas'; }
function leafTexture(value: GuiImageTexture, name: string): void {
  if (!value) throw new RangeError(`${name} is missing.`);
  if (isAtlas(value)) throw new RangeError('Nested atlas textures are not supported.');
  integer(value.width, 1, 8192, `${name}.width`); integer(value.height, 1, 8192, `${name}.height`);
  if (value.width * value.height > 16777216 || (!isBitmap(value) && (!value.data || !['[object Uint8Array]', '[object Uint8ClampedArray]'].includes(Object.prototype.toString.call(value.data))
    || value.data.length !== value.width * value.height * 4))) throw new RangeError(`${name} requires bounded complete straight RGBA8 or an ImageBitmap.`);
}
function texture(value: GuiLayerTexture, name: string): void {
  if (!isAtlas(value)) { leafTexture(value, name); return; }
  if (!Array.isArray(value.tiles) || value.tiles.length > 256) throw new RangeError('An atlas requires bounded explicit tiles.');
  const metadata: { origin: readonly [number, number]; size: readonly [number, number] }[] = [];
  for (let index = 0; index < value.tiles.length; index++) {
    const tile = value.tiles[index];
    if (!Object.prototype.hasOwnProperty.call(value.tiles, index) || !tile) throw new RangeError('Sparse atlas tiles are not supported.');
    leafTexture(tile.texture, 'atlas.tile.texture');
    metadata.push({ origin: tile.origin, size: [tile.texture.width, tile.texture.height] });
  }
  validateGuiTextureAtlasLayout(value.width, value.height, metadata);
}
function validate(options: GuiLayerPreparedOptions): GuiImageRect {
  integer(options.width, 1, 8192, 'width'); integer(options.height, 1, 8192, 'height');
  if (options.width * options.height > 16777216) throw new RangeError('GUI layer framebuffer exceeds its pixel budget.');
  if (!Array.isArray(options.commands) || options.commands.length > 4096) throw new RangeError('A bounded prepared command array is required.');
  if (options.canvas && typeof options.canvas.getContext !== 'function') throw new RangeError('An exclusive GUI layer canvas is required.');
  if (options.output !== undefined && options.output !== 'framebuffer' && options.output !== 'straight-alpha') throw new RangeError('Unsupported GUI layer output encoding.');
  if (options.scissor) rectangle(options.scissor, options.width, options.height, 'scissor');
  const output: GuiImageRect = options.outputRect ?? [0, 0, options.width, options.height]; rectangle(output, options.width, options.height, 'outputRect');
  if (!output[2] || !output[3]) throw new RangeError('GUI output window must have positive dimensions.');
  const seen = new Set<GuiLayerTexture>(); let pixels = 0, vertexCount = 0, indexCount = 0, entityCount = 0, entityBytes = 0;
  const resource = (value: GuiLayerTexture) => {
    if (seen.has(value)) return;
    texture(value, 'command.texture'); seen.add(value); pixels += value.width * value.height;
    if (isAtlas(value)) for (const tile of value.tiles) if (!seen.has(tile.texture)) { seen.add(tile.texture); pixels += tile.texture.width * tile.texture.height; }
    if (seen.size > 256 || pixels > 33554432) throw new RangeError('GUI layer exceeds its texture upload budget.');
  };
  for (const command of options.commands as readonly GuiLayerPreparedCommand[]) {
    if (!command) throw new RangeError('A GUI command is missing.');
    resource(command.texture);
    if (command.kind === 'entity') {
      if (++entityCount > 64 || isAtlas(command.texture) || command.texture.width !== 64 || command.texture.height !== 64) throw new RangeError('NPC entities require bounded commands and one original 64 by 64 skin.');
      const { mesh, palette, model, view, projection, viewport, scissor, material } = command.layout;
      matrix(model, 'entity.model'); matrix(view, 'entity.view'); matrix(projection, 'entity.projection');
      rectangle(viewport, options.width, options.height, 'entity.viewport'); rectangle(scissor, options.width, options.height, 'entity.scissor');
      const count = mesh.positions.length / 3, bones = mesh.boneNames.length;
      if (!Number.isSafeInteger(count) || count > 65536 || !bones || bones > 32
        || !(mesh.positions instanceof Float32Array) || !(mesh.uvRaw instanceof Uint16Array) || !(mesh.normals instanceof Int8Array)
        || !(mesh.colors instanceof Uint8Array) || !(mesh.boneIndices instanceof Uint16Array) || !(mesh.indices instanceof Uint16Array)
        || mesh.uvRaw.length !== count * 2 || mesh.normals.length !== count * 4 || mesh.colors.length !== count * 4
        || mesh.boneIndices.length !== count || mesh.indices.length % 3 || mesh.indices.length > 196608
        || !(palette instanceof Float32Array) || palette.length !== bones * 16) throw new RangeError('Malformed bounded entity mesh or palette.');
      for (const value of mesh.positions) finite(value, 'entity.position');
      for (const value of palette) finite(value, 'entity.palette');
      for (const value of mesh.boneIndices) integer(value, 0, bones - 1, 'entity.bone');
      for (const value of mesh.indices) integer(value, 0, count - 1, 'entity.index');
      if (!material || material.kind !== 'npc-portrait') throw new RangeError('Only the finite NPC portrait material is supported.');
      for (const [name, values, length] of [['tileLightColor', material.tileLightColor, 4], ['fogControl', material.fogControl, 3], ['fogColor', material.fogColor, 3], ['materialColor', material.materialColor, 4], ['uvAnimation', material.uvAnimation, 4], ['subPixelOffset', material.subPixelOffset, 2]] as const) {
        if (!values || values.length !== length) throw new RangeError(`Invalid entity ${name}.`);
        for (const value of values) finite(value, `entity.${name}`);
      }
      const fogRange = Math.fround(Math.fround(material.fogControl[1]) - Math.fround(material.fogControl[0]));
      if (!Number.isFinite(fogRange) || fogRange === 0 || Math.fround(material.fogControl[2]) === 0) throw new RangeError('Entity fog divisors must be finite nonzero float32 values.');
      vertexCount += count; indexCount += mesh.indices.length;
      entityBytes += mesh.positions.byteLength + mesh.uvRaw.byteLength + mesh.normals.byteLength + mesh.colors.byteLength
        + mesh.boneIndices.byteLength + mesh.indices.byteLength + palette.byteLength + 192;
    } else if (command.kind === 'image' || command.kind === 'sprite') {
      if (command.kind === 'sprite' && (!command.color || command.color.length !== 4 || [...command.color].some(channel => !Number.isSafeInteger(channel) || channel < 0 || channel > 255))) throw new RangeError('Sprite vertex color requires four RGBA8 bytes.');
      matrix(command.mvp, 'image.mvp');
      const mesh = command.mesh;
      if (!mesh || !Array.isArray(mesh.vertices) || mesh.vertices.length > 65536 || !Array.isArray(mesh.indices) || mesh.indices.length % 3 || mesh.indices.length > 196608) throw new RangeError('Malformed bounded image mesh.');
      color(mesh.tint, 'image.tint'); unit(mesh.hudOpacity, 'image.hudOpacity'); rectangle(mesh.scissor, options.width, options.height, 'image.scissor');
      for (const vertex of mesh.vertices) {
        if (!vertex || !vertex.position || vertex.position.length !== 2 || !vertex.uvRaw || vertex.uvRaw.length !== 2) throw new RangeError('Malformed image vertex.');
        for (const value of vertex.position) finite(value, 'image.position');
        for (const value of vertex.uvRaw) integer(value, 0, 65535, 'image.uvRaw');
      }
      for (const index of mesh.indices) integer(index, 0, mesh.vertices.length - 1, 'image.index');
      vertexCount += mesh.vertices.length; indexCount += mesh.indices.length;
    } else if (command.kind === 'text') {
      if (isAtlas(command.texture)) throw new RangeError('Packed-cell text requires a leaf page, not an atlas assembly.');
      const run = command.run;
      if (!run) throw new RangeError('A prepared text run is missing.');
      matrix(run.mvp, 'text.mvp');
      if (!['point', 'bilinear'].includes(run.sampling) || !['bitmap', 'bitmap-smooth'].includes(run.shader)) throw new RangeError('Explicit packed-cell sampling and shader are required.');
      if (command.texture.width !== command.texture.height || ![128, 256].includes(command.texture.width)) throw new RangeError('Packed-cell text requires a complete 128 or 256 square page.');
      color(run.tint ?? WHITE, 'text.tint'); unit(run.hudOpacity ?? 1, 'text.hudOpacity');
      unit(run.glyphHeight, 'text.glyphHeight'); unit(run.halfTexelOffset, 'text.halfTexelOffset');
      if (!run.glyphHeight || run.halfTexelOffset > Math.min(1 / 32, run.glyphHeight / 2)) throw new RangeError('Packed-cell clamp bounds are inverted.');
      if (run.cull !== undefined && !['none', 'front', 'back'].includes(run.cull)) throw new RangeError('Unsupported text cull state.');
      if (run.frontFace !== undefined && !['cw', 'ccw'].includes(run.frontFace)) throw new RangeError('Unsupported text front face.');
      if (run.viewport && (run.viewport.length !== 4 || run.viewport[0] !== 0 || run.viewport[1] !== 0 || run.viewport[2] !== options.width || run.viewport[3] !== options.height)) throw new RangeError('Prepared text viewport must equal the declared whole framebuffer.');
      if (run.scissor) rectangle(run.scissor, options.width, options.height, 'text.scissor');
      if (!Array.isArray(run.vertices) || run.vertices.length > 65536 || !run.indices || run.indices.length > 196608 || run.indices.length % 3) throw new RangeError('Malformed bounded packed-cell text geometry.');
      for (const vertex of run.vertices) {
        if (!vertex || !vertex.position || vertex.position.length !== 3 || !vertex.uvRaw || vertex.uvRaw.length !== 2 || !vertex.rgba || vertex.rgba.length !== 4) throw new RangeError('Malformed packed-cell text vertex.');
        finite(vertex.position[0], 'text.x'); finite(vertex.position[1], 'text.y'); integer(vertex.position[2], 0, 3, 'text.corner');
        for (const value of vertex.uvRaw) integer(value, 0, 65535, 'text.uvRaw');
        for (const value of vertex.rgba) integer(value, 0, 255, 'text.rgba');
      }
      for (const index of run.indices) integer(index, 0, run.vertices.length - 1, 'text.index');
      vertexCount += run.vertices.length; indexCount += run.indices.length;
    } else throw new RangeError('Unsupported prepared GUI command kind.');
    if (vertexCount > 262144 || indexCount > 786432) throw new RangeError('GUI layer exceeds its total geometry budget.');
  }
  // Account target, D24S8, presentation and two readback arrays; texture/snapshot
  // and geometry staging estimates are per invocation, not a total VRAM claim.
  const backgroundBytes = options.background?.kind === 'texture' ? options.width * options.height * 4 + output[2] * output[3] * 4 : 0;
  if (entityCount && output[2] * output[3] * 20 + pixels * 12 + entityBytes * 3 + vertexCount * 32 + indexCount * 2 + backgroundBytes > 268435456) throw new RangeError('GUI entity resources exceed the 256 MiB library payload budget.');
  const background = options.background;
  if (background?.kind === 'texture') {
    leafTexture(background.texture, 'background.texture');
    if (isBitmap(background.texture) || background.texture.width !== options.width || background.texture.height !== options.height) throw new RangeError('Background RGBA8 must cover the whole framebuffer.');
    if (background.encoding !== 'framebuffer' && background.encoding !== 'straight-alpha') throw new RangeError('Explicit GUI background encoding is required.');
  } else if (background?.kind === 'solid') color(background.color, 'background.color');
  else if (background !== undefined && background.kind !== 'transparent') throw new RangeError('Unsupported GUI background.');
  return output;
}

/**
 * Private prepared GPU core: one RGBA8 target, ordered image/sprite/text passes, no
 * intermediate text canvas. Source layout remains the public adapter's job.
 * All pixels are top-first; live presentation is a blend-disabled PMA GPU copy.
 */
export function renderPreparedGuiLayer(options: GuiLayerPreparedOptions): GuiLayerPreparedResult {
  const [cropX, cropY, width, height] = validate(options);
  if (!options.canvas && typeof document === 'undefined') throw new Error('Prepared GUI rendering requires an explicit browser canvas.');
  const canvas = options.canvas ?? document.createElement('canvas');
  if (options.commands.some(command => command.kind === 'entity')) {
    if (canvas.width !== width || canvas.height !== height) { canvas.width = 1; canvas.height = 1; canvas.width = width; canvas.height = height; }
  } else { canvas.width = width; canvas.height = height; }
  const attributes: WebGLContextAttributes = { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true };
  const gl = 'transferToImageBitmap' in canvas ? canvas.getContext('webgl', attributes) : canvas.getContext('webgl', attributes);
  if (!gl || gl.isContextLost()) throw new Error('WebGL GUI layer rendering is unavailable.');
  const actual = gl.getContextAttributes();
  if (!actual?.alpha || !actual.premultipliedAlpha || actual.antialias || !actual.preserveDrawingBuffer) {
    gl.getExtension('WEBGL_lose_context')?.loseContext(); throw new Error('GUI layer requires alpha/PMA, no antialiasing and a preserved drawing buffer.');
  }
  const buffers: WebGLBuffer[] = [], textures: WebGLTexture[] = [], shaders: WebGLShader[] = [], programs: WebGLProgram[] = [], framebuffers: WebGLFramebuffer[] = [], renderbuffers: WebGLRenderbuffer[] = [];
  let successful = false, disposed = false;
  const dispose = () => { if (!disposed) { disposed = true; gl.getExtension('WEBGL_lose_context')?.loseContext(); } };
  const program = (vertex: string, fragment: string) => {
    const active = gl.createProgram(); if (!active) throw new Error('Unable to allocate a GUI layer program.'); programs.push(active);
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
      const shader = gl.createShader(type); if (!shader) throw new Error('Unable to allocate a GUI layer shader.'); shaders.push(shader);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`GUI layer shader compilation failed: ${gl.getShaderInfoLog(shader)}`);
      gl.attachShader(active, shader);
    }
    gl.linkProgram(active); if (!gl.getProgramParameter(active, gl.LINK_STATUS)) throw new Error(`GUI layer shader link failed: ${gl.getProgramInfoLog(active)}`);
    return active;
  };
  const allocateTexture = () => {
    const value = gl.createTexture(); if (!value) throw new Error('Unable to allocate a GUI layer texture.'); textures.push(value); gl.bindTexture(gl.TEXTURE_2D, value);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return value;
  };
  const buffer = () => { const value = gl.createBuffer(); if (!value) throw new Error('Unable to allocate a GUI layer buffer.'); buffers.push(value); return value; };
  const attribute = (active: WebGLProgram, name: string, target: WebGLBuffer, values: Float32Array | Uint16Array | Uint8Array | Int8Array, size: number, type: number, normalized = false) => {
    const location = gl.getAttribLocation(active, name); if (location < 0) throw new Error(`Missing GUI layer attribute ${name}.`);
    gl.bindBuffer(gl.ARRAY_BUFFER, target); gl.bufferData(gl.ARRAY_BUFFER, values, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, size, type, normalized, 0, 0);
  };
  try {
    const entityCommands = options.commands.filter((command): command is GuiLayerPreparedEntityCommand => command.kind === 'entity');
    const boneCapacity = Math.max(0, ...entityCommands.map(command => command.layout.mesh.boneNames.length));
    const maximum = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number, viewportLimit = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
    if (width > maximum || height > maximum || options.width > viewportLimit[0]! || options.height > viewportLimit[1]!
      || !gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision) throw new Error('GPU cannot represent the GUI layer target with high precision.');
    for (const command of options.commands) if (command.texture.width > maximum || command.texture.height > maximum) throw new RangeError('GUI page exceeds the GPU texture limit.');
    if (entityCommands.length && (width > gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || height > gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)
      || gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) < boneCapacity * 4 + 17 || gl.getParameter(gl.MAX_VERTEX_ATTRIBS) < 4
      || gl.getParameter(gl.MAX_VARYING_VECTORS) < 3 || gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) < 2)) throw new Error('GPU cannot represent the bounded NPC entity profile.');
    gl.activeTexture(gl.TEXTURE0); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    let initial: Uint8Array | null = null;
    const background = options.background;
    if (background?.kind === 'texture') {
      initial = new Uint8Array(width * height * 4);
      for (let y = 0; y < height; y++) {
        const start = ((cropY + y) * options.width + cropX) * 4;
        initial.set(background.texture.data.subarray(start, start + width * 4), (height - 1 - y) * width * 4);
      }
      if (background.encoding === 'straight-alpha') for (let index = 0; index < initial.length; index += 4) {
        const alpha = initial[index + 3]! / 255;
        for (let channel = 0; channel < 3; channel++) initial[index + channel] = Math.round(initial[index + channel]! * alpha);
      }
    }
    const target = allocateTexture(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, initial);
    const framebuffer = gl.createFramebuffer(); if (!framebuffer) throw new Error('Unable to allocate a GUI layer framebuffer.'); framebuffers.push(framebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('GUI layer RGBA8 framebuffer is incomplete.');
    if (entityCommands.length) {
      const depth = gl.createRenderbuffer(); if (!depth) throw new Error('Unable to allocate entity depth/stencil.'); renderbuffers.push(depth);
      gl.bindRenderbuffer(gl.RENDERBUFFER, depth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, width, height);
      if (gl.getRenderbufferParameter(gl.RENDERBUFFER, gl.RENDERBUFFER_DEPTH_SIZE) !== 24 || gl.getRenderbufferParameter(gl.RENDERBUFFER, gl.RENDERBUFFER_STENCIL_SIZE) !== 8) throw new Error('NPC entities require an actual 24-bit depth and 8-bit stencil attachment.');
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, depth);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('GUI entity depth/stencil framebuffer is incomplete.');
      gl.disable(gl.SCISSOR_TEST); gl.depthMask(true); gl.stencilMask(255); gl.clearDepth(1); gl.clearStencil(0); gl.clear(gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    }
    gl.disable(gl.DITHER); gl.disable(gl.DEPTH_TEST); gl.disable(gl.STENCIL_TEST); gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE); gl.disable(gl.SAMPLE_COVERAGE);
    gl.depthMask(false); gl.colorMask(true, true, true, true); gl.disable(gl.SCISSOR_TEST);
    if (!initial) {
      const clear = background?.kind === 'solid' ? background.color : [0, 0, 0, 0];
      gl.clearColor(clear[0]! * clear[3]!, clear[1]! * clear[3]!, clear[2]! * clear[3]!, clear[3]!); gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.enable(gl.BLEND); gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.viewport(-cropX, cropY + height - options.height, options.width, options.height);
    const positionBuffer = buffer(), uvBuffer = buffer(), colorBuffer = buffer(), indexBuffer = buffer();
    const normalBuffer = entityCommands.length ? buffer() : undefined, boneBuffer = entityCommands.length ? buffer() : undefined;
    const sourceTextures = new Map<GuiLayerTexture, WebGLTexture>(), shaderPrograms = new Map<'image' | 'sprite' | 'text' | 'entity', WebGLProgram>();
    const full: GuiImageRect = [0, 0, options.width, options.height], globalScissor = options.scissor ?? full;
    const maxAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number;
    let entityState = false;
    for (const command of options.commands) {
      const state = command.kind === 'entity' ? command.layout : command.kind !== 'text' ? command.mesh : command.run;
      const scissor = state.scissor ?? full;
      const x = Math.max(cropX, globalScissor[0], scissor[0]), y = Math.max(cropY, globalScissor[1], scissor[1]);
      const w = Math.max(0, Math.min(cropX + width, globalScissor[0] + globalScissor[2], scissor[0] + scissor[2]) - x);
      const h = Math.max(0, Math.min(cropY + height, globalScissor[1] + globalScissor[3], scissor[1] + scissor[3]) - y);
      if (!w || !h) continue;
      gl.enable(gl.SCISSOR_TEST); gl.scissor(x - cropX, height - (y - cropY) - h, w, h);
      let uploaded = sourceTextures.get(command.texture);
      if (!uploaded) {
        uploaded = allocateTexture();
        if (isAtlas(command.texture)) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, command.texture.width, command.texture.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
          for (const tile of command.texture.tiles) {
            if (isBitmap(tile.texture)) gl.texSubImage2D(gl.TEXTURE_2D, 0, tile.origin[0], tile.origin[1], gl.RGBA, gl.UNSIGNED_BYTE, tile.texture);
            else gl.texSubImage2D(gl.TEXTURE_2D, 0, tile.origin[0], tile.origin[1], tile.texture.width, tile.texture.height, gl.RGBA, gl.UNSIGNED_BYTE, tile.texture.data);
          }
        } else if (isBitmap(command.texture)) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, command.texture);
        else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, command.texture.width, command.texture.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, command.texture.data);
        sourceTextures.set(command.texture, uploaded);
      }
      gl.bindTexture(gl.TEXTURE_2D, uploaded);
      const filter = command.kind === 'text' && command.run.sampling === 'bilinear' ? gl.LINEAR : gl.NEAREST;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      let active = shaderPrograms.get(command.kind);
      if (!active) {
        active = command.kind === 'image' ? program(GUI_IMAGE_VERTEX_SHADER, GUI_IMAGE_FRAGMENT_SHADER)
          : command.kind === 'sprite' ? program(GUI_SPRITE_VERTEX_SHADER, GUI_SPRITE_FRAGMENT_SHADER)
            : command.kind === 'entity' ? program(guiEntityVertexShader(boneCapacity), GUI_ENTITY_FRAGMENT_SHADER) : program(GUI_BITMAP_CELL_VERTEX_SHADER, GUI_BITMAP_FRAGMENT_SHADER);
        shaderPrograms.set(command.kind, active);
      }
      gl.useProgram(active); for (let index = 0; index < maxAttributes; index++) gl.disableVertexAttribArray(index);
      if (command.kind !== 'entity') {
        if (entityState) {
          gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.STENCIL_TEST);
          gl.enable(gl.BLEND); gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          gl.viewport(-cropX, cropY + height - options.height, options.width, options.height); entityState = false;
        }
        const ordinary = command.kind === 'text' ? command.run : command.mesh;
        gl.uniform4fv(gl.getUniformLocation(active, 'tint'), new Float32Array(ordinary.tint ?? WHITE)); gl.uniform1f(gl.getUniformLocation(active, 'hudOpacity'), ordinary.hudOpacity ?? 1);
      }
      let indices: Uint16Array;
      if (command.kind === 'entity') {
        const { mesh, palette, model, view, projection, viewport, material } = command.layout;
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true); gl.disable(gl.STENCIL_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND); entityState = true;
        gl.viewport(viewport[0] - cropX, height - (viewport[1] - cropY) - viewport[3], viewport[2], viewport[3]);
        gl.uniformMatrix4fv(gl.getUniformLocation(active, 'model'), false, model); gl.uniformMatrix4fv(gl.getUniformLocation(active, 'view'), false, view);
        gl.uniformMatrix4fv(gl.getUniformLocation(active, 'projection'), false, projection); gl.uniformMatrix4fv(gl.getUniformLocation(active, 'bonePalette[0]'), false, palette);
        gl.uniform4fv(gl.getUniformLocation(active, 'tileLightColor'), new Float32Array(material.tileLightColor));
        gl.uniform3fv(gl.getUniformLocation(active, 'fogControl'), new Float32Array(material.fogControl)); gl.uniform3fv(gl.getUniformLocation(active, 'fogColor'), new Float32Array(material.fogColor));
        gl.uniform4fv(gl.getUniformLocation(active, 'uvAnimation'), new Float32Array(material.uvAnimation)); gl.uniform2fv(gl.getUniformLocation(active, 'subPixelOffset'), new Float32Array(material.subPixelOffset));
        gl.uniform4fv(gl.getUniformLocation(active, 'materialColor'), new Float32Array(material.materialColor)); gl.uniform1i(gl.getUniformLocation(active, 'source'), 0);
        attribute(active, 'position', positionBuffer, mesh.positions, 3, gl.FLOAT); attribute(active, 'packedUv', uvBuffer, mesh.uvRaw, 2, gl.UNSIGNED_SHORT, true);
        attribute(active, 'normal', normalBuffer!, mesh.normals, 4, gl.BYTE, true);
        if (boneCapacity > 1) attribute(active, 'boneIndex', boneBuffer!, mesh.boneIndices, 1, gl.UNSIGNED_SHORT);
        indices = mesh.indices;
      } else if (command.kind !== 'text') {
        const mesh = command.mesh;
        gl.enable(gl.CULL_FACE); gl.frontFace(gl.CW); gl.cullFace(gl.FRONT);
        gl.uniformMatrix4fv(gl.getUniformLocation(active, 'mvp'), false, command.mvp); gl.uniform1i(gl.getUniformLocation(active, 'source'), 0);
        attribute(active, 'position', positionBuffer, new Float32Array(mesh.vertices.flatMap(vertex => [...vertex.position])), 2, gl.FLOAT);
        attribute(active, 'packedUv', uvBuffer, new Uint16Array(mesh.vertices.flatMap(vertex => [...vertex.uvRaw])), 2, gl.UNSIGNED_SHORT, true);
        if (command.kind === 'sprite') attribute(active, 'color', colorBuffer, new Uint8Array(mesh.vertices.flatMap(() => [...command.color])), 4, gl.UNSIGNED_BYTE, true);
        indices = new Uint16Array(mesh.indices);
      } else {
        const run = command.run;
        gl.frontFace(run.frontFace === 'cw' ? gl.CW : gl.CCW);
        if (!run.cull || run.cull === 'none') gl.disable(gl.CULL_FACE); else { gl.enable(gl.CULL_FACE); gl.cullFace(run.cull === 'front' ? gl.FRONT : gl.BACK); }
        gl.uniformMatrix4fv(gl.getUniformLocation(active, 'mvp'), false, run.mvp); gl.uniform1i(gl.getUniformLocation(active, 'atlas'), 0);
        gl.uniform1i(gl.getUniformLocation(active, 'smoothBitmap'), run.shader === 'bitmap-smooth' ? 1 : 0);
        gl.uniform1f(gl.getUniformLocation(active, 'glyphHeight'), run.glyphHeight); gl.uniform1f(gl.getUniformLocation(active, 'halfTexel'), run.halfTexelOffset);
        attribute(active, 'position', positionBuffer, new Float32Array(run.vertices.flatMap(vertex => [...vertex.position])), 3, gl.FLOAT);
        attribute(active, 'packedUv', uvBuffer, new Uint16Array(run.vertices.flatMap(vertex => [...vertex.uvRaw])), 2, gl.UNSIGNED_SHORT, true);
        attribute(active, 'color', colorBuffer, new Uint8Array(run.vertices.flatMap(vertex => [...vertex.rgba])), 4, gl.UNSIGNED_BYTE, true);
        indices = new Uint16Array(run.indices);
      }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STREAM_DRAW); gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
      if (gl.getError() !== gl.NO_ERROR || gl.isContextLost()) throw new Error('GPU ordered GUI drawing failed.');
    }
    const bottom = new Uint8Array(width * height * 4), data = new Uint8ClampedArray(bottom.length);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, bottom); if (gl.getError() !== gl.NO_ERROR) throw new Error('GUI layer readback failed.');
    for (let y = 0; y < height; y++) data.set(bottom.subarray(y * width * 4, (y + 1) * width * 4), (height - 1 - y) * width * 4);
    if (options.canvas) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, width, height); gl.disable(gl.SCISSOR_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
      if (entityCommands.length) { gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.STENCIL_TEST); }
      const copy = program(GUI_COPY_VERTEX_SHADER, GUI_COPY_FRAGMENT_SHADER); gl.useProgram(copy);
      for (let index = 0; index < maxAttributes; index++) gl.disableVertexAttribArray(index);
      gl.bindTexture(gl.TEXTURE_2D, target); gl.uniform1i(gl.getUniformLocation(copy, 'source'), 0);
      attribute(copy, 'position', positionBuffer, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), 2, gl.FLOAT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (gl.getError() !== gl.NO_ERROR || gl.isContextLost()) throw new Error('GUI layer presentation failed.');
    }
    const alphaMode = options.output === 'straight-alpha' ? 'straight' : 'premultiplied';
    if (alphaMode === 'straight') for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3]!;
      for (let channel = 0; channel < 3; channel++) data[index + channel] = alpha ? Math.min(255, Math.round(data[index + channel]! * 255 / alpha)) : 0;
    }
    successful = true; return { width, height, data, alphaMode, dispose };
  } finally {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.useProgram(null);
    for (const value of buffers) gl.deleteBuffer(value); for (const value of framebuffers) gl.deleteFramebuffer(value);
    for (const value of renderbuffers) gl.deleteRenderbuffer(value);
    for (const value of textures) gl.deleteTexture(value); for (const value of programs) gl.deleteProgram(value); for (const value of shaders) gl.deleteShader(value);
    if (!options.canvas || !successful) dispose();
  }
}
