import { GUI_IMAGE_VERTEX_SHADER as VERTEX, GUI_IMAGE_FRAGMENT_SHADER as FRAGMENT, GUI_COPY_VERTEX_SHADER as COPY_VERTEX, GUI_COPY_FRAGMENT_SHADER as COPY_FRAGMENT } from './gui-layer-kernels';
import type { PixelTexture } from './item-renderer-engine';
import { layoutGuiImages } from './gui-image-geometry';
import type { GuiImageGeometry, GuiImageLayout, GuiImageLayoutOptions, GuiImageRect, GuiImageRgba } from './gui-image-geometry';

/** Original straight RGBA8 pixels, or an explicitly unpremultiplied decoded bitmap. */
export type GuiImageTexture = PixelTexture | ImageBitmap;
export interface GuiImageDraw extends GuiImageGeometry { texture: GuiImageTexture }
export type GuiImageBackground =
  | { kind: 'transparent' }
  | { kind: 'solid'; color: GuiImageRgba }
  /** Background pixels cover the WHOLE framebuffer, even when outputRect selects a crop. */
  | { kind: 'texture'; texture: PixelTexture; encoding: 'framebuffer' | 'straight-alpha' };
export interface GuiImageRenderOptions extends Omit<GuiImageLayoutOptions, 'images'> {
  images: readonly GuiImageDraw[];
  background?: GuiImageBackground;
  /** Exclusive canvas; it must not already have a Canvas2D or other incompatible context. */
  canvas?: HTMLCanvasElement | OffscreenCanvas;
  /** Default returns original PMA framebuffer bytes. Straight conversion is an explicit lossy adapter. */
  output?: 'framebuffer' | 'straight-alpha';
}
export interface GuiImageRenderResult extends PixelTexture {
  alphaMode: 'premultiplied' | 'straight';
  layout: GuiImageLayout;
  /** Releases this canvas context; rendering on the same canvas after disposal is unsupported. */
  dispose: () => void;
}

function isBitmap(value: GuiImageTexture): value is ImageBitmap {
  return Object.prototype.toString.call(value) === '[object ImageBitmap]';
}
function texture(value: GuiImageTexture, name: string): void {
  if (!value || !Number.isSafeInteger(value.width) || !Number.isSafeInteger(value.height) || value.width < 1 || value.height < 1
    || value.width > 8192 || value.height > 8192 || value.width * value.height > 16777216) throw new RangeError(`${name} requires bounded positive dimensions.`);
  if (!isBitmap(value) && (!value.data || !['[object Uint8ClampedArray]', '[object Uint8Array]'].includes(Object.prototype.toString.call(value.data)) || value.data.length !== value.width * value.height * 4)) {
    throw new RangeError(`${name} requires complete straight RGBA8 pixels or an ImageBitmap.`);
  }
}
function validate(options: GuiImageRenderOptions): GuiImageLayout {
  const layout = layoutGuiImages(options);
  if (options.canvas && typeof options.canvas.getContext !== 'function') throw new RangeError('An exclusive GUI image canvas is required.');
  if (options.output !== undefined && options.output !== 'framebuffer' && options.output !== 'straight-alpha') throw new RangeError('Unsupported GUI image output encoding.');
  const visited = new Set<GuiImageTexture>(); let pixels = 0;
  for (const image of options.images) if (!visited.has(image.texture)) {
    texture(image.texture, 'image.texture'); visited.add(image.texture); pixels += image.texture.width * image.texture.height;
    if (visited.size > 256 || pixels > 33554432) throw new RangeError('GUI images exceed the texture upload budget.');
  }
  const background = options.background;
  if (background?.kind === 'texture') {
    texture(background.texture, 'background');
    if (background.texture.width !== options.width || background.texture.height !== options.height || isBitmap(background.texture)) throw new RangeError('Background RGBA8 dimensions must match the whole framebuffer.');
    if (background.encoding !== 'framebuffer' && background.encoding !== 'straight-alpha') throw new RangeError('Explicit GUI background encoding is required.');
  } else if (background?.kind === 'solid') {
    if (!background.color || background.color.length !== 4 || background.color.some(channel => !Number.isFinite(channel) || channel < 0 || channel > 1)) throw new RangeError('GUI background color requires four normalized components.');
  } else if (background !== undefined && background.kind !== 'transparent') throw new RangeError('Unsupported GUI image background.');
  return layout;
}






/**
 * UI/Blit-style straight-source/point/clamp rendering into an RGBA8 PMA target.
 * All input/readback rows are top-first. Source rectangles, not captured vertices,
 * are packed by layoutGuiImages. A live canvas receives a GPU copy with blending
 * disabled, preserving PMA without a Canvas2D/unpremultiplication roundtrip.
 */
export function renderGuiImages(options: GuiImageRenderOptions): GuiImageRenderResult {
  const layout = validate(options), [cropX, cropY, width, height] = layout.outputRect;
  if (!options.canvas && typeof document === 'undefined') throw new Error('GUI image rendering requires an explicit browser canvas.');
  const canvas = options.canvas ?? document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const attributes: WebGLContextAttributes = { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true };
  const gl = 'transferToImageBitmap' in canvas ? canvas.getContext('webgl', attributes) : canvas.getContext('webgl', attributes);
  if (!gl || gl.isContextLost()) throw new Error('WebGL GUI image rendering is unavailable.');
  const actualAttributes = gl.getContextAttributes();
  if (!actualAttributes?.alpha || !actualAttributes.premultipliedAlpha || actualAttributes.antialias || !actualAttributes.preserveDrawingBuffer) {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    throw new Error('GUI image presentation requires alpha:true, premultipliedAlpha:true, antialias:false and preserveDrawingBuffer:true.');
  }
  const buffers: WebGLBuffer[] = [], textures: WebGLTexture[] = [], programs: WebGLProgram[] = [], shaders: WebGLShader[] = [], framebuffers: WebGLFramebuffer[] = [];
  let successful = false, disposed = false;
  const dispose = () => { if (!disposed) { disposed = true; gl.getExtension('WEBGL_lose_context')?.loseContext(); } };
  const program = (vs: string, ps: string) => {
    const active = gl.createProgram(); if (!active) throw new Error('Unable to allocate a GUI image program.'); programs.push(active);
    for (const [kind, source] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, ps]] as const) {
      const shader = gl.createShader(kind); if (!shader) throw new Error('Unable to allocate a GUI image shader.'); shaders.push(shader);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`GUI image shader compilation failed: ${gl.getShaderInfoLog(shader)}`);
      gl.attachShader(active, shader);
    }
    gl.linkProgram(active); if (!gl.getProgramParameter(active, gl.LINK_STATUS)) throw new Error(`GUI image shader link failed: ${gl.getProgramInfoLog(active)}`);
    return active;
  };
  const allocateTexture = () => {
    const result = gl.createTexture(); if (!result) throw new Error('Unable to allocate a GUI image texture.'); textures.push(result); gl.bindTexture(gl.TEXTURE_2D, result);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return result;
  };
  const buffer = () => { const result = gl.createBuffer(); if (!result) throw new Error('Unable to allocate a GUI image buffer.'); buffers.push(result); return result; };
  const attribute = (active: WebGLProgram, name: string, target: WebGLBuffer, values: Float32Array | Uint16Array, type: number, normalized = false) => {
    const location = gl.getAttribLocation(active, name); if (location < 0) throw new Error(`Missing GUI image attribute ${name}.`);
    gl.bindBuffer(gl.ARRAY_BUFFER, target); gl.bufferData(gl.ARRAY_BUFFER, values, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, 2, type, normalized, 0, 0);
  };
  try {
    const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number, maxViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
    if (width > maxTexture || height > maxTexture || options.width > maxViewport[0]! || options.height > maxViewport[1]!
      || !gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision) throw new Error('The GPU cannot represent this GUI image target.');
    for (const image of options.images) if (image.texture.width > maxTexture || image.texture.height > maxTexture) throw new RangeError('GUI image exceeds the GPU texture limit.');
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
    const framebuffer = gl.createFramebuffer(); if (!framebuffer) throw new Error('Unable to allocate a GUI image framebuffer.'); framebuffers.push(framebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('GUI image RGBA8 framebuffer is incomplete.');
    gl.disable(gl.DITHER); gl.disable(gl.DEPTH_TEST); gl.disable(gl.STENCIL_TEST); gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE); gl.disable(gl.SAMPLE_COVERAGE);
    gl.depthMask(false); gl.colorMask(true, true, true, true); gl.disable(gl.SCISSOR_TEST);
    if (!initial) {
      const color = background?.kind === 'solid' ? background.color : [0, 0, 0, 0];
      gl.clearColor(color[0]! * color[3]!, color[1]! * color[3]!, color[2]! * color[3]!, color[3]!); gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.enable(gl.BLEND); gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.CULL_FACE); gl.frontFace(gl.CW); gl.cullFace(gl.FRONT);
    const blit = program(VERTEX, FRAGMENT); gl.useProgram(blit);
    gl.uniformMatrix4fv(gl.getUniformLocation(blit, 'mvp'), false, layout.mvp); gl.uniform1i(gl.getUniformLocation(blit, 'source'), 0);
    gl.viewport(-cropX, cropY + height - options.height, options.width, options.height);
    const positions = buffer(), uvs = buffer(), elements = buffer(), sources = new Map<GuiImageTexture, WebGLTexture>();
    for (const mesh of layout.meshes) {
      const scissor: GuiImageRect = mesh.scissor;
      const x = Math.max(cropX, scissor[0]), y = Math.max(cropY, scissor[1]);
      const w = Math.max(0, Math.min(cropX + width, scissor[0] + scissor[2]) - x), h = Math.max(0, Math.min(cropY + height, scissor[1] + scissor[3]) - y);
      if (!w || !h) continue;
      gl.enable(gl.SCISSOR_TEST); gl.scissor(x - cropX, height - (y - cropY) - h, w, h);
      const source = options.images[mesh.imageIndex]!.texture; let uploaded = sources.get(source);
      if (!uploaded) {
        uploaded = allocateTexture();
        if (isBitmap(source)) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, source.width, source.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, source.data);
        sources.set(source, uploaded);
      }
      gl.bindTexture(gl.TEXTURE_2D, uploaded);
      gl.uniform4fv(gl.getUniformLocation(blit, 'tint'), new Float32Array(mesh.tint)); gl.uniform1f(gl.getUniformLocation(blit, 'hudOpacity'), mesh.hudOpacity);
      attribute(blit, 'position', positions, new Float32Array(mesh.vertices.flatMap(vertex => [...vertex.position])), gl.FLOAT);
      attribute(blit, 'packedUv', uvs, new Uint16Array(mesh.vertices.flatMap(vertex => [...vertex.uvRaw])), gl.UNSIGNED_SHORT, true);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elements); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STREAM_DRAW);
      gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
      if (gl.getError() !== gl.NO_ERROR || gl.isContextLost()) throw new Error('GPU GUI image drawing failed.');
    }
    const bottom = new Uint8Array(width * height * 4), data = new Uint8ClampedArray(bottom.length);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, bottom);
    if (gl.getError() !== gl.NO_ERROR) throw new Error('GPU GUI image readback failed.');
    for (let y = 0; y < height; y++) data.set(bottom.subarray(y * width * 4, (y + 1) * width * 4), (height - 1 - y) * width * 4);
    if (options.canvas) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, width, height); gl.disable(gl.SCISSOR_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
      const copy = program(COPY_VERTEX, COPY_FRAGMENT); gl.useProgram(copy);
      for (let index = 0; index < (gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number); index++) gl.disableVertexAttribArray(index);
      gl.bindTexture(gl.TEXTURE_2D, target); gl.uniform1i(gl.getUniformLocation(copy, 'source'), 0);
      attribute(copy, 'position', positions, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.FLOAT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (gl.getError() !== gl.NO_ERROR || gl.isContextLost()) throw new Error('GPU GUI image presentation failed.');
    }
    const alphaMode = options.output === 'straight-alpha' ? 'straight' : 'premultiplied';
    if (alphaMode === 'straight') for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3]!;
      for (let channel = 0; channel < 3; channel++) data[index + channel] = alpha ? Math.min(255, Math.round(data[index + channel]! * 255 / alpha)) : 0;
    }
    successful = true; return { width, height, data, layout, alphaMode, dispose };
  } finally {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.useProgram(null);
    for (const value of buffers) gl.deleteBuffer(value); for (const value of framebuffers) gl.deleteFramebuffer(value);
    for (const value of textures) gl.deleteTexture(value); for (const value of programs) gl.deleteProgram(value); for (const value of shaders) gl.deleteShader(value);
    if (!options.canvas || !successful) dispose();
  }
}
