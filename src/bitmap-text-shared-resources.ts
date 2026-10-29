import type { PixelTexture } from './item-renderer-engine';
import type { BitmapGlyphRenderOptions } from './bitmap-text-webgl';

const PAGE_PIXELS = 16777216;
const BUFFER_BYTES = 8388608;
interface PageEntry { width: number; height: number; data: Uint8Array; texture: WebGLTexture }

/** Shrink each decreasing axis before expanding either axis. */
export function resizeSharedBitmapCanvas(canvas: { width: number; height: number }, width: number, height: number): void {
  if (width < canvas.width) canvas.width = width;
  if (height < canvas.height) canvas.height = height;
  if (width > canvas.width) canvas.width = width;
  if (height > canvas.height) canvas.height = height;
}

/** Private bounded storage; shader source and all draw equations stay in the renderer. */
export class SharedBitmapGpuResources {
  readonly programs = new Map<string, WebGLProgram>();
  readonly programKeys = new Map<WebGLProgram, string>();
  readonly programObjects = new Set<WebGLProgram>();
  readonly shaders = new Set<WebGLShader>();
  readonly textures = new Set<WebGLTexture>();
  readonly framebuffers = new Set<WebGLFramebuffer>();
  readonly buffers = new Map<string, WebGLBuffer>();
  readonly bufferSizes = new Map<string, number>();
  target?: { width: number; height: number; texture: WebGLTexture; framebuffer: WebGLFramebuffer };
  private pages: PageEntry[] = [];
  private pagePixels = 0;
  private disposed = false;
  get live(): boolean { return !this.disposed; }
  constructor(readonly gl: WebGLRenderingContext, readonly canvas: OffscreenCanvas) {}
  get bytes(): number {
    return this.pagePixels * 8 + [...this.bufferSizes.values()].reduce((sum, bytes) => sum + bytes, 0)
      + this.canvas.width * this.canvas.height * 4 + (this.target ? this.target.width * this.target.height * 4 : 0);
  }
  /** Conservative peak reservation, evaluated before any resizing/upload/draw. */
  estimate(options: BitmapGlyphRenderOptions): number {
    const pages = new Set(options.runs.map(run => run.page));
    const incoming = [...pages].reduce((sum, key) => { const page = options.pages.get(key)!; return sum + page.width * page.height; }, 0);
    const sizes = new Map(this.bufferSizes);
    const maximum = (key: string, bytes: number) => sizes.set(key, Math.max(sizes.get(key) ?? 0, bytes));
    for (const run of options.runs) {
      if (run.profile === 'bedrock-unicode') {
        maximum('unicode:position', run.vertices.length * 12); maximum('unicode:packedUv', run.vertices.length * 4);
        maximum('unicode:color', run.vertices.length * 4); maximum('index', run.indices.length * 2);
      } else {
        maximum('atlas:position', run.quads.length * 32); maximum('atlas:sourceUv', run.quads.length * 32);
        maximum('atlas:sourceBounds', run.quads.length * 64); maximum('atlas:color', run.quads.length * 64);
        maximum('index', run.quads.length * 12);
      }
    }
    maximum('copy:position', 32);
    const buffers = [...sizes.values()].reduce((sum, bytes) => sum + bytes, 0);
    if (sizes.size > 9 || buffers > BUFFER_BYTES) throw new RangeError('Shared bitmap buffer storage exceeds the budget.');
    const area = Math.max(this.canvas.width * this.canvas.height, this.target ? this.target.width * this.target.height : 0, options.width * options.height);
    return Math.min(PAGE_PIXELS, this.pagePixels + incoming) * 8 + buffers + area * 8
      + (options.background?.kind === 'texture' ? options.width * options.height * 4 : 0);
  }
  page(source: PixelTexture, upload: (data: Uint8Array) => WebGLTexture): WebGLTexture {
    const index = this.pages.findIndex(page => page.width === source.width && page.height === source.height
      && page.data.length === source.data.length && page.data.every((value, at) => value === source.data[at]));
    if (index >= 0) { const entry = this.pages.splice(index, 1)[0]!; this.pages.push(entry); return entry.texture; }
    const pixels = source.width * source.height;
    while (this.pages.length && (this.pages.length >= 256 || this.pagePixels + pixels > PAGE_PIXELS)) {
      const oldest = this.pages.shift()!; this.pagePixels -= oldest.width * oldest.height;
      this.gl.deleteTexture(oldest.texture); this.textures.delete(oldest.texture);
    }
    const data = new Uint8Array(source.data), texture = upload(data);
    this.pages.push({ width: source.width, height: source.height, data, texture }); this.pagePixels += pixels;
    return texture;
  }
  buffer(key: string, bytes: number): WebGLBuffer {
    const previous = this.bufferSizes.get(key) ?? 0;
    const total = [...this.bufferSizes.values()].reduce((sum, value) => sum + value, 0) - previous + bytes;
    if ((!this.buffers.has(key) && this.buffers.size >= 9) || total > BUFFER_BYTES) throw new RangeError('Shared bitmap buffer storage exceeds the budget.');
    let buffer = this.buffers.get(key);
    if (!buffer) { buffer = this.gl.createBuffer() ?? undefined; if (!buffer) throw new Error('Unable to allocate bitmap buffer.'); this.buffers.set(key, buffer); }
    this.bufferSizes.set(key, bytes); return buffer;
  }
  dispose(): void {
    if (this.disposed) return; this.disposed = true;
    for (const value of this.buffers.values()) this.gl.deleteBuffer(value);
    for (const value of this.framebuffers) this.gl.deleteFramebuffer(value);
    for (const value of this.textures) this.gl.deleteTexture(value);
    for (const value of this.programObjects) this.gl.deleteProgram(value);
    for (const value of this.shaders) this.gl.deleteShader(value);
    this.buffers.clear(); this.bufferSizes.clear(); this.framebuffers.clear(); this.textures.clear();
    this.programs.clear(); this.programKeys.clear(); this.programObjects.clear(); this.shaders.clear();
    this.pages = []; this.pagePixels = 0; this.target = undefined;
  }
}

/** Library-accounted bytes, not a driver/OS total-VRAM measurement. */
export class SharedBitmapBudget {
  private owners = new Map<object, number>();
  private sessions = new Map<object, number>();
  private pending = new Map<object, number>();
  private total(): number { return [...this.owners.values(), ...this.sessions.values(), ...this.pending.values()].reduce((sum, bytes) => sum + bytes, 0); }
  acquire(owner: object): void {
    if (this.owners.size >= 512) throw new RangeError('Shared bitmap owners exceed the 512 lease budget.');
    this.owners.set(owner, 0);
  }
  open(session: object): void {
    if (this.total() + 4 > 268435456) throw new RangeError('Shared bitmap resources exceed the 256MiB accounted byte budget.');
    this.sessions.set(session, 4);
  }
  reserve(owner: object, session: object, width: number, height: number, sessionPeak: number): object {
    if (!this.owners.has(owner)) throw new Error('The shared bitmap rendering lease was released.');
    if (!Number.isSafeInteger(width) || width < 0 || width > 8192 || !Number.isSafeInteger(height) || height < 0 || height > 8192 || width * height > 16777216) throw new RangeError('Shared bitmap target exceeds the pixel limit.');
    const bytes = width * height * 4, old = this.owners.get(owner)!;
    if ([...this.owners.values(), ...this.pending.values()].reduce((sum, value) => sum + value, 0) - old + bytes > 67108864) throw new RangeError('Shared bitmap presentations exceed the 16MP pixel budget.');
    const extra = Math.max(this.sessions.get(session) ?? 0, sessionPeak) - (this.sessions.get(session) ?? 0);
    if (this.total() + extra + bytes > 268435456) throw new RangeError('Shared bitmap resources exceed the 256MiB accounted byte budget.');
    const token = {}; this.sessions.set(session, (this.sessions.get(session) ?? 0) + extra); this.pending.set(token, bytes); return token;
  }
  settle(owner: object, session: object, token: object, actual: number, presented: boolean, cleared = false): void {
    const bytes = this.pending.get(token); this.pending.delete(token);
    if (this.sessions.has(session)) this.sessions.set(session, actual);
    if (this.owners.has(owner)) {
      if (cleared) this.owners.set(owner, 0);
      else if (presented && bytes !== undefined) this.owners.set(owner, bytes);
    }
  }
  release(owner: object): void { this.owners.delete(owner); }
  destroy(session: object): void { this.sessions.delete(session); }
}
