import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import type { CanvasHTMLAttributes } from 'react';
import type { PixelTexture } from './item-renderer-engine';
import { decodeTga } from './item-renderer-engine';
import { inspectGuiLayerTga } from './gui-layer-tga';
import type { GuiImage, GuiImageLayerState } from './gui-image';
import type { GuiImageBackground, GuiImageTexture } from './gui-image-webgl';
import { layoutSourceGuiLayer, renderGuiLayer } from './gui-layer';
import type { GuiLayerDraw, GuiLayerGeometryCommand, GuiLayerLayout, GuiLayerLayoutOptions, GuiSpriteGeometry } from './gui-layer';
import type { GuiTextGeometry } from './gui-text-geometry';
import type { GuiModelGeometry } from './gui-model-geometry';
import type { GuiEntityGeometry, GuiEntitySource } from './gui-entity-geometry';
import { validateGuiTextureAtlasLayout } from './gui-texture-atlas';
import type { GuiLayerTexture, GuiLayerTextureSource, GuiTextureAtlas, GuiTextureAtlasSource } from './gui-texture-atlas';

type LeafSource = string | PixelTexture;
type Source = GuiLayerTextureSource;
export type GuiLayerCommand =
  | ({ kind: 'image'; texture: Source } & Omit<GuiImage, 'texture'>)
  | ({ kind: 'sprite'; texture: Source } & GuiSpriteGeometry)
  | ({ kind: 'model'; textures: Readonly<Record<string, Source>> } & GuiModelGeometry)
  | ({ kind: 'entity'; texture: LeafSource } & GuiEntityGeometry)
  | ({ kind: 'text'; pages?: ReadonlyMap<number, LeafSource> } & GuiTextGeometry);
export interface GuiLayerProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, 'children' | 'width' | 'height' | 'onError'>, Omit<GuiLayerLayoutOptions, 'commands'> {
  commands: readonly GuiLayerCommand[];
  background?: GuiImageBackground;
  label?: string;
  /** Changing this value explicitly retries failed/lost requests with a fresh canvas. */
  renderKey?: string | number;
  onReady?: () => void;
  onRenderError?: (error: Error) => void;
  onRenderStateChange?: (state: GuiImageLayerState) => void;
}

interface SourceUse { source: Source; size?: readonly [number, number]; upload: boolean; leafOnly?: boolean }
type Binding = { kind: 'image' | 'sprite'; source: number }
  | { kind: 'entity'; source?: number }
  | { kind: 'model'; textures: readonly (readonly [string, number])[] }
  | { kind: 'text'; pages: readonly (readonly [number, number])[] };
interface Request {
  key: number;
  descriptor: string;
  uses: readonly SourceUse[];
  commands: readonly GuiLayerCommand[];
  background?: GuiImageBackground;
  layout?: GuiLayerLayout;
  frame?: Omit<GuiLayerLayoutOptions, 'commands'>;
  /** Unique used URL resources, with declared source dimensions where applicable. */
  urls: ReadonlyMap<string, readonly [number, number] | undefined>;
  knownPixels: number;
  error?: Error;
}
function validatePixels(value: PixelTexture): void {
  if (!value || isAtlas(value) || !Number.isSafeInteger(value.width) || !Number.isSafeInteger(value.height) || value.width < 1 || value.height < 1 || value.width > 8192 || value.height > 8192
    || value.width * value.height > 16777216 || !value.data || !['[object Uint8Array]', '[object Uint8ClampedArray]'].includes(Object.prototype.toString.call(value.data))
    || value.data.length !== value.width * value.height * 4) throw new RangeError('GUI layer pixels require bounded complete RGBA8 data.');
}
function isAtlas(value: unknown): value is GuiTextureAtlasSource { return !!value && typeof value === 'object' && (value as { kind?: unknown }).kind === 'atlas'; }
function isBitmap(value: GuiImageTexture): value is ImageBitmap { return Object.prototype.toString.call(value) === '[object ImageBitmap]'; }
function sameSource(a: Source | undefined, b: Source, compared: WeakMap<object, WeakSet<object>>): boolean {
  if (typeof a === 'string' || typeof b === 'string') return a === b;
  if (!a || !b || a.width !== b.width || a.height !== b.height) return false;
  if (compared.get(a)?.has(b)) return true;
  let equal: boolean;
  if (isAtlas(a) || isAtlas(b)) {
    equal = isAtlas(a) && isAtlas(b) && Array.isArray(b.tiles) && a.tiles.length === b.tiles.length && a.tiles.every((tile, index) => {
      const other = b.tiles[index];
      return !!other && Array.isArray(other.origin) && other.origin.length === 2 && Array.isArray(other.size) && other.size.length === 2
        && tile.origin[0] === other.origin[0] && tile.origin[1] === other.origin[1] && tile.size[0] === other.size[0] && tile.size[1] === other.size[1]
        && sameSource(tile.texture, other.texture, compared);
    });
  } else equal = !!b.data && ['[object Uint8Array]', '[object Uint8ClampedArray]'].includes(Object.prototype.toString.call(b.data))
    && a.data.length === b.data.length && a.data.every((byte, index) => byte === b.data[index]);
  if (equal) { let matches = compared.get(a); if (!matches) { matches = new WeakSet(); compared.set(a, matches); } matches.add(b); }
  return equal;
}
function validateBackground(background: GuiImageBackground | undefined, width: number, height: number): void {
  if (background?.kind === 'texture') {
    validatePixels(background.texture);
    if (background.texture.width !== width || background.texture.height !== height) throw new RangeError('GUI background dimensions must match the whole framebuffer.');
    if (background.encoding !== 'framebuffer' && background.encoding !== 'straight-alpha') throw new RangeError('Explicit GUI background encoding is required.');
  } else if (background?.kind === 'solid') {
    if (!background.color || background.color.length !== 4 || background.color.some(value => !Number.isFinite(value) || value < 0 || value > 1)) throw new RangeError('GUI background color requires four normalized components.');
  } else if (background !== undefined && background.kind !== 'transparent') throw new RangeError('Unsupported GUI background.');
}
function budget(uses: readonly SourceUse[]): { urls: Map<string, readonly [number, number] | undefined>; knownPixels: number } {
  const urls = new Map<string, readonly [number, number] | undefined>(), textures = new Set<PixelTexture>(), atlases = new Set<GuiTextureAtlasSource>(); let knownPixels = 0;
  const leaf = (source: LeafSource, size: readonly [number, number] | undefined, upload: boolean) => {
    if (typeof source === 'string') {
      if (!source.trim()) throw new RangeError('A used GUI texture URL must not be empty.');
      const declared = urls.get(source);
      if (size && declared !== undefined && (declared[0] !== size[0] || declared[1] !== size[1])) throw new RangeError('One URL cannot represent incompatible declared source sizes.');
      urls.set(source, size ? [size[0], size[1]] : declared);
    } else {
      validatePixels(source);
      if (size && (source.width !== size[0] || source.height !== size[1])) throw new RangeError('Source pixels must match their declared original size.');
      if (upload && !textures.has(source)) { textures.add(source); knownPixels += source.width * source.height; }
    }
  };
  for (const { source, size, upload, leafOnly } of uses) {
    if (!isAtlas(source)) { leaf(source, size, upload); continue; }
    if (leafOnly) throw new RangeError('Packed-cell text requires leaf texture pages.');
    if (size && (source.width !== size[0] || source.height !== size[1])) throw new RangeError('Atlas dimensions must match their declared source size.');
    if (atlases.has(source)) continue;
    validateGuiTextureAtlasLayout(source.width, source.height, source.tiles);
    atlases.add(source); knownPixels += source.width * source.height;
    for (const tile of source.tiles) leaf(tile.texture, tile.size, true);
  }
  if (urls.size + textures.size + atlases.size > 256 || knownPixels + [...urls.values()].reduce<number>((total, size) => total + (size === undefined ? 0 : size[0] * size[1]), 0) > 33554432) {
    throw new RangeError('Combined GUI image/font resources exceed the upload budget.');
  }
  return { urls, knownPixels };
}
function snapshotSource(source: Source, pixels: Map<PixelTexture, PixelTexture>, atlases: Map<GuiTextureAtlasSource, GuiTextureAtlasSource>): Source {
  const leaf = (value: LeafSource): LeafSource => {
    if (typeof value === 'string') return value;
    let copy = pixels.get(value);
    if (!copy) { copy = { width: value.width, height: value.height, data: new Uint8ClampedArray(value.data) }; pixels.set(value, copy); }
    return copy;
  };
  if (!isAtlas(source)) return leaf(source);
  let copy = atlases.get(source);
  if (!copy) {
    copy = { kind: 'atlas', width: source.width, height: source.height, tiles: source.tiles.map(tile => ({ origin: [...tile.origin], size: [...tile.size], texture: leaf(tile.texture) })) };
    atlases.set(source, copy);
  }
  return copy;
}

function prepare(previous: Request | undefined, options: GuiLayerProps): Request {
  const key = (previous?.key ?? 0) + 1;
  try {
    const layout = layoutSourceGuiLayer(options);
    if (options.renderKey !== undefined && typeof options.renderKey !== 'string' && (typeof options.renderKey !== 'number' || !Number.isFinite(options.renderKey))) throw new RangeError('renderKey must be a string or finite number.');
    validateBackground(options.background, options.width, options.height);
    const uses: SourceUse[] = [], bindings: Binding[] = [], shapes: GuiLayerGeometryCommand[] = [];
    const entitySources = new Map<GuiEntitySource, GuiEntitySource>();
    for (let index = 0; index < options.commands.length; index++) {
      const command = options.commands[index]!;
      if (command.kind === 'image' || command.kind === 'sprite') {
        const { rect, uvRect, nineSlice, tint, hudOpacity, scissor, physicalPrecision } = command;
        const shape = { rect, uvRect, nineSlice, tint, hudOpacity, scissor,
          ...(physicalPrecision !== undefined ? { physicalPrecision } : {}) };
        shapes.push(command.kind === 'sprite' ? { kind: 'sprite', ...shape, color: command.color } : { kind: 'image', ...shape });
        bindings.push({ kind: command.kind, source: uses.length }); uses.push({ source: command.texture, upload: true });
      } else if (command.kind === 'entity') {
        let source = entitySources.get(command.source);
        if (!source) {
          source = { profile: command.source.profile, textureSize: [...command.source.textureSize], bones: command.source.bones.map(bone => ({
            name: bone.name, parent: bone.parent, pivot: [...bone.pivot], visible: bone.visible,
            cubes: bone.cubes.map(cube => ({ origin: [...cube.origin], size: [...cube.size], uv: [...cube.uv], inflate: cube.inflate })),
          })) };
          entitySources.set(command.source, source);
        }
        shapes.push({ kind: 'entity', source, bonePose: Object.fromEntries(Object.getOwnPropertyNames(command.bonePose).map(name => [name, new Float32Array(command.bonePose[name]!)])),
          model: new Float32Array(command.model), view: new Float32Array(command.view), projection: new Float32Array(command.projection),
          viewport: [...command.viewport], scissor: command.scissor && [...command.scissor], material: { kind: command.material.kind,
            tileLightColor: [...command.material.tileLightColor], fogControl: [...command.material.fogControl], fogColor: [...command.material.fogColor],
            materialColor: [...command.material.materialColor], uvAnimation: [...command.material.uvAnimation], subPixelOffset: [...command.material.subPixelOffset] } });
        const entry = layout.commands[index]!;
        if (entry.kind !== 'entity') throw new Error('GUI entity source order mismatch.');
        if (entry.layout.mesh.indices.length) {
          if (isAtlas(command.texture)) throw new RangeError('An NPC entity requires one original leaf skin texture.');
          bindings.push({ kind: 'entity', source: uses.length }); uses.push({ source: command.texture, size: [64, 64], upload: true, leafOnly: true });
        } else bindings.push({ kind: 'entity' });
      } else if (command.kind === 'model') {
        const { model, origin, projection, textureSizes, tint, hudOpacity, scissor } = command;
        shapes.push({ kind: 'model', model: { faces: model.faces.map(face => ({
          vertices: [[...face.vertices[0]], [...face.vertices[1]], [...face.vertices[2]], [...face.vertices[3]]],
          uv: [[...face.uv[0]], [...face.uv[1]], [...face.uv[2]], [...face.uv[3]]], texture: face.texture,
          normal: face.normal && [...face.normal], color: face.color && [...face.color],
        })) }, origin, projection: { yaw: projection.yaw, pitch: projection.pitch, scale: projection.scale,
          offset: [...projection.offset], originQuantization: projection.originQuantization },
        textureSizes: Object.fromEntries(Object.getOwnPropertyNames(textureSizes).map(key => [key, [...textureSizes[key]!]])), tint, hudOpacity, scissor });
        const entry = layout.commands[index]!;
        if (entry.kind !== 'model') throw new Error('GUI source model order mismatch.');
        if (!command.textures || typeof command.textures !== 'object' || Array.isArray(command.textures) || Object.getOwnPropertyNames(command.textures).length > 256) throw new RangeError('Model textures require a bounded source record.');
        const textures: [string, number][] = [];
        for (const key of new Set(entry.layout.runs.map(run => run.texture))) {
          const source = Object.prototype.hasOwnProperty.call(command.textures, key) ? command.textures[key]
            : Object.prototype.hasOwnProperty.call(command.textures, 'all') ? command.textures.all : undefined;
          if (source === undefined) throw new RangeError(`Missing model texture source: ${key}.`);
          textures.push([key, uses.length]); uses.push({ source, size: textureSizes[key]!, upload: true });
        }
        bindings.push({ kind: 'model', textures });
      } else {
        const { text, font, origin, fontScale, sampling, shader, color, tint, hudOpacity, shadow, scissor } = command;
        const glyphs: typeof font.glyphs = Object.fromEntries([...new Set([...text.replace(/\r\n?/g, '\n')].filter(character => character !== '\n'))].map(character => {
          const g = font.glyphs[character]!;
          return [character, { page: g.page, x: g.x, y: g.y, width: g.width, height: g.height, advance: g.advance, offsetX: g.offsetX, offsetY: g.offsetY }];
        }));
        shapes.push({ kind: 'text', text, font: { pages: [...font.pages], pageSizes: [...font.pageSizes], cellHeight: font.cellHeight, lineHeight: font.lineHeight, glyphs }, origin, fontScale, sampling, shader, color, tint, hudOpacity, shadow, scissor });
        const entry = layout.commands[index]!;
        if (entry.kind !== 'text') throw new Error('GUI source layout order mismatch.');
        if (command.pages) {
          if (typeof command.pages.get !== 'function' || typeof command.pages.has !== 'function' || typeof command.pages.entries !== 'function'
            || !Number.isSafeInteger(command.pages.size) || command.pages.size > 256) throw new RangeError('Font page overrides require a bounded ReadonlyMap.');
          let count = 0;
          for (const [page] of command.pages) {
            if (++count > 256 || !Number.isSafeInteger(page) || page < 0 || page >= font.pages.length) throw new RangeError('Font page override index is outside the declared font.');
          }
        }
        const pages: [number, number][] = [];
        for (const page of new Set(entry.layout.runs.map(run => run.page))) {
          const source = command.pages?.has(page) ? command.pages.get(page)! : font.pages[page]!;
          pages.push([page, uses.length]); uses.push({ source, size: [font.pageSizes[page]!, font.pageSizes[page]!], upload: true, leafOnly: true });
        }
        bindings.push({ kind: 'text', pages });
      }
    }
    const background = options.background;
    if (background?.kind === 'texture') uses.push({ source: background.texture, size: [options.width, options.height], upload: false });
    const hasEntity = shapes.some(shape => shape.kind === 'entity');
    const descriptor = JSON.stringify({ width: options.width, height: options.height, guiScale: options.guiScale, shapes, bindings, outputRect: options.outputRect, scissor: options.scissor,
      background: background?.kind === 'texture' ? { kind: 'texture', encoding: background.encoding } : background, renderKey: options.renderKey },
    hasEntity ? (_key, value: unknown) => typeof value === 'number' && Object.is(value, -0) ? '__gui_layer_negative_zero__' : value : undefined);
    const compared = new WeakMap<object, WeakSet<object>>();
    if (previous?.descriptor === descriptor && uses.length === previous.uses.length && uses.every((use, index) => sameSource(previous.uses[index]?.source, use.source, compared))) return previous;
    const resources = budget(uses), copied = new Map<PixelTexture, PixelTexture>(), atlasCopies = new Map<GuiTextureAtlasSource, GuiTextureAtlasSource>();
    const snapshots = uses.map((use): SourceUse => ({ ...use, source: snapshotSource(use.source, copied, atlasCopies), size: use.size && [...use.size] }));
    // Entity shapes already own deep source/Float32Array snapshots. JSON is a
    // descriptor only: reconstructing matrices from it loses type and -0 bits.
    const frozenShapes = (hasEntity ? shapes.map(shape => shape.kind === 'entity' ? shape : JSON.parse(JSON.stringify(shape)))
      : JSON.parse(JSON.stringify(shapes))) as GuiLayerGeometryCommand[];
    const commands: GuiLayerCommand[] = frozenShapes.map((shape, index) => {
      const binding = bindings[index]!;
      if ((shape.kind === 'image' || shape.kind === 'sprite') && (binding.kind === 'image' || binding.kind === 'sprite') && shape.kind === binding.kind) return { ...shape, texture: snapshots[binding.source]!.source };
      if (shape.kind === 'entity' && binding.kind === 'entity') return { ...shape, texture: binding.source === undefined
        ? (options.commands[index] as Extract<GuiLayerCommand, { kind: 'entity' }>).texture : snapshots[binding.source]!.source as LeafSource };
      if (shape.kind === 'model' && binding.kind === 'model') return { ...shape, textures: Object.fromEntries(binding.textures.map(([key, source]) => [key, snapshots[source]!.source])) };
      if (shape.kind === 'text' && binding.kind === 'text') return { ...shape, pages: new Map(binding.pages.map(([page, source]) => [page, snapshots[source]!.source as LeafSource])) };
      throw new Error('GUI snapshot order mismatch.');
    });
    const clear = background?.kind === 'texture' ? { ...background, texture: snapshots[snapshots.length - 1]!.source as PixelTexture }
      : background?.kind === 'solid' ? { ...background, color: [...background.color] as typeof background.color } : background;
    const frame = { width: options.width, height: options.height, guiScale: options.guiScale,
      scissor: options.scissor && [...options.scissor] as typeof options.scissor, outputRect: [...layout.outputRect] as typeof layout.outputRect };
    return { key, descriptor, uses: snapshots, commands, background: clear, layout: { ...layout, outputRect: frame.outputRect }, frame, ...resources };
  } catch (reason) {
    const error = reason instanceof Error ? reason : new Error(String(reason)), descriptor = `error:${error.message}:${String(options.renderKey)}`;
    return previous?.descriptor === descriptor ? previous : { key, descriptor, uses: [], commands: [], urls: new Map(), knownPixels: 0, error };
  }
}

/** A single ordered image/sprite/text framebuffer; original semantic DOM belongs to the host. */
export const GuiLayer = forwardRef<HTMLCanvasElement, GuiLayerProps>(function GuiLayer({ width, height, guiScale, commands, scissor, outputRect, background, label, renderKey,
  onReady, onRenderError, onRenderStateChange, className, style, ...props }, forwardedRef) {
  const previous = useRef<Request | undefined>(undefined);
  const request = prepare(previous.current, { width, height, guiScale, commands, scissor, outputRect, background, renderKey }); previous.current = request;
  const canvas = useRef<HTMLCanvasElement | null>(null), callbacks = useRef({ onReady, onRenderError, onRenderStateChange }); callbacks.current = { onReady, onRenderError, onRenderStateChange };
  const setCanvas = useCallback((node: HTMLCanvasElement | null) => {
    canvas.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node); else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);
  const [state, setState] = useState<{ key: number; status: GuiImageLayerState }>({ key: 0, status: 'loading' });
  const status = state.key === request.key ? state.status : 'loading', notified = useRef<{ key: number; status: GuiImageLayerState } | undefined>(undefined);
  useEffect(() => {
    const target = canvas.current, abort = new AbortController(), bitmaps = new Set<ImageBitmap>();
    let cancelled = false, failed = false, dispose: (() => void) | undefined;
    const closeBitmaps = () => { bitmaps.forEach(bitmap => bitmap.close()); bitmaps.clear(); };
    if (target) { target.width = 0; target.height = 0; }
    setState({ key: request.key, status: 'loading' });
    const fail = (reason: unknown) => {
      if (cancelled || failed) return; failed = true; abort.abort(); closeBitmaps();
      if (target) { target.width = 0; target.height = 0; }
      setState({ key: request.key, status: 'error' }); callbacks.current.onRenderError?.(reason instanceof Error ? reason : new Error(String(reason)));
    };
    const lost = (event: Event) => { event.preventDefault(); fail(new Error('The GUI layer WebGL context was lost. Change renderKey or inputs to retry.')); };
    target?.addEventListener('webglcontextlost', lost);
    void (async () => {
      if (request.error) throw request.error;
      // Let immediate StrictMode cleanup cancel the first setup before starting IO.
      await Promise.resolve(); if (cancelled || failed) return;
      const urls = [...request.urls], decoded = new Map<string, GuiImageTexture>(); let next = 0, pixels = request.knownPixels, encodedBytes = 0;
      const worker = async () => {
        while (!cancelled && !failed && next < urls.length) {
          const [url, size] = urls[next++]!;
          if (typeof createImageBitmap !== 'function') throw new Error('Straight-alpha ImageBitmap decoding is unavailable. Supply explicit RGBA8 pixels.');
          const response = await fetch(url, { signal: abort.signal }); if (!response.ok) throw new Error(`GUI layer HTTP ${response.status}: ${url}`);
          const blob = await response.blob(); encodedBytes += blob.size;
          if (blob.size > 67108864 || encodedBytes > 134217728) throw new RangeError('GUI texture responses exceed the encoded byte budget.');
          const [header, footer] = await Promise.all([blob.slice(0, 18).arrayBuffer(), blob.slice(Math.max(0, blob.size - 26)).arrayBuffer()]);
          if (cancelled || failed) return;
          const tga = inspectGuiLayerTga(new Uint8Array(header), new Uint8Array(footer), blob.type, blob.size);
          const dimensions = (w: number, h: number) => {
            if (!w || !h || w > 8192 || h > 8192 || w * h > 16777216) throw new RangeError('Decoded GUI texture exceeds its pixel budget.');
            if (size !== undefined && (w !== size[0] || h !== size[1])) throw new RangeError('Decoded GUI texture dimensions must match their declared original size.');
            if (pixels + w * h > 33554432) throw new RangeError('Combined decoded GUI image/font resources exceed the upload budget.');
          };
          let texture: GuiImageTexture;
          if (tga) {
            dimensions(tga.width, tga.height);
            const buffer = await blob.arrayBuffer();
            if (cancelled || failed) return;
            dimensions(tga.width, tga.height);
            texture = decodeTga(buffer);
          } else texture = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none', imageOrientation: 'none' });
          if (cancelled || failed) { if (isBitmap(texture)) texture.close(); return; }
          try {
            dimensions(texture.width, texture.height);
            pixels += texture.width * texture.height;
          } catch (reason) { if (isBitmap(texture)) texture.close(); throw reason; }
          if (isBitmap(texture)) bitmaps.add(texture);
          decoded.set(url, texture);
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, urls.length) }, worker));
      if (cancelled || failed || !target) return;
      const assembled = new Map<GuiTextureAtlasSource, GuiTextureAtlas>();
      const leaf = (value: LeafSource) => {
        if (typeof value !== 'string') return value;
        const bitmap = decoded.get(value); if (!bitmap) throw new Error('A used GUI texture was not decoded.'); return bitmap;
      };
      const source = (value: Source): GuiLayerTexture => {
        if (!isAtlas(value)) return leaf(value);
        let atlas = assembled.get(value);
        if (!atlas) { atlas = { kind: 'atlas', width: value.width, height: value.height, tiles: value.tiles.map(tile => ({ origin: tile.origin, texture: leaf(tile.texture) })) }; assembled.set(value, atlas); }
        return atlas;
      };
      const resolved: GuiLayerDraw[] = [];
      request.commands.forEach((command, index) => {
        if (command.kind === 'entity') {
          const entry = request.layout!.commands[index]!;
          if (entry.kind !== 'entity') throw new Error('GUI entity snapshot order mismatch.');
          if (entry.layout.mesh.indices.length) resolved.push({ ...command, texture: leaf(command.texture) });
        } else if (command.kind === 'image' || command.kind === 'sprite') resolved.push({ ...command, texture: source(command.texture) });
        else if (command.kind === 'model') resolved.push({ ...command, textures: Object.fromEntries(Object.entries(command.textures).map(([key, value]) => [key, source(value)])) });
        else resolved.push({ ...command, pages: new Map([...command.pages!].map(([page, value]) => [page, leaf(value)])) });
      });
      const result = renderGuiLayer({ ...request.frame!, commands: resolved, background: request.background, canvas: target }); dispose = result.dispose;
      closeBitmaps(); if (failed) return;
      setState({ key: request.key, status: 'ready' });
    })().catch(fail);
    return () => {
      cancelled = true; abort.abort(); closeBitmaps(); target?.removeEventListener('webglcontextlost', lost);
      // Immediate StrictMode reuse must retain its node; retired canvases release their context.
      queueMicrotask(() => { if (canvas.current !== target) dispose?.(); });
    };
  }, [request.key]);
  useEffect(() => {
    if (notified.current?.key === request.key && notified.current.status === status) return;
    notified.current = { key: request.key, status }; callbacks.current.onRenderStateChange?.(status);
    if (status === 'ready') callbacks.current.onReady?.();
  }, [status, request.key]);
  const accessibleLabel = props['aria-label'] ?? label, named = !!(accessibleLabel?.trim() || props['aria-labelledby']?.trim());
  return <canvas {...props} key={request.key} ref={setCanvas} width={0} height={0} className={['mc-gui-layer', className].filter(Boolean).join(' ')}
    role={props.role ?? (named ? 'img' : undefined)} aria-label={accessibleLabel} aria-hidden={props['aria-hidden'] ?? (named ? undefined : true)}
    data-render-state={status} data-fidelity="source-gui-layer-profile" data-framebuffer-width={width} data-framebuffer-height={height}
    style={{ display: 'block', width: request.layout?.outputRect[2] ?? 0, height: request.layout?.outputRect[3] ?? 0, imageRendering: 'pixelated', ...style }}/>
});
