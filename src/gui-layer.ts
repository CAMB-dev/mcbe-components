import { layoutGuiImages } from './gui-image-geometry';
import type { GuiImageGeometry, GuiImageLayout, GuiImageLayoutOptions, GuiImageMesh } from './gui-image-geometry';
import type { GuiImageBackground, GuiImageDraw, GuiImageTexture } from './gui-image-webgl';
import { layoutGuiText } from './gui-text-geometry';
import type { GuiTextGeometry, GuiTextLayout, GuiTextRgba8 } from './gui-text-geometry';
import { renderPreparedGuiLayer } from './gui-layer-webgl';
import type { GuiLayerPreparedCommand, GuiLayerPreparedResult } from './gui-layer-webgl';

/** UI/Sprite Transparent, MultiColorTint Off source geometry. Other material passes are not implied. */
export interface GuiSpriteGeometry extends GuiImageGeometry {
  /** Vertex-color bytes. Alpha selects the shader's ceil-alpha branch; it is not an opacity multiplier. */
  color?: GuiTextRgba8;
}
export type GuiLayerGeometryCommand =
  | ({ kind: 'image' } & GuiImageGeometry)
  | ({ kind: 'sprite' } & GuiSpriteGeometry)
  | ({ kind: 'text' } & GuiTextGeometry);
export interface GuiLayerLayoutOptions extends Omit<GuiImageLayoutOptions, 'images'> {
  commands: readonly GuiLayerGeometryCommand[];
}
export type GuiLayerLayoutCommand =
  | { kind: 'image'; mesh: GuiImageMesh }
  | { kind: 'sprite'; mesh: GuiImageMesh; color: GuiTextRgba8 }
  | { kind: 'text'; layout: GuiTextLayout };
export interface GuiLayerLayout extends Omit<GuiImageLayout, 'meshes'> {
  /** Ordered source commands. Each text layout owns its separate paint-origin MVP. */
  commands: readonly GuiLayerLayoutCommand[];
}
export type GuiLayerDraw =
  | ({ kind: 'image' } & GuiImageDraw)
  | ({ kind: 'sprite'; texture: GuiImageTexture } & GuiSpriteGeometry)
  | ({ kind: 'text'; pages: ReadonlyMap<number, GuiImageTexture> } & GuiTextGeometry);
export interface GuiLayerRenderOptions extends Omit<GuiLayerLayoutOptions, 'commands'> {
  commands: readonly GuiLayerDraw[];
  background?: GuiImageBackground;
  canvas?: HTMLCanvasElement | OffscreenCanvas;
  output?: 'framebuffer' | 'straight-alpha';
}
export interface GuiLayerRenderResult extends GuiLayerPreparedResult {
  layout: GuiLayerLayout;
}

/** Internal source adapter, also used for SSR/loading preparation. It performs no IO or GPU work. */
export function layoutSourceGuiLayer(options: GuiLayerLayoutOptions): GuiLayerLayout {
  if (!Array.isArray(options.commands) || options.commands.length > 4096) throw new RangeError('A bounded GUI command array is required.');
  for (const command of options.commands) if (!command || (command.kind !== 'image' && command.kind !== 'sprite' && command.kind !== 'text')) throw new RangeError('Unsupported GUI layer command.');
  const imageCommands = options.commands.filter((command): command is Extract<GuiLayerGeometryCommand, { kind: 'image' | 'sprite' }> => command.kind !== 'text');
  const { meshes, ...frame } = layoutGuiImages({ ...options, images: imageCommands });
  const commands: GuiLayerLayoutCommand[] = [];
  let imageIndex = 0, vertices = 0, indices = 0, runs = 0;
  for (const command of options.commands) {
    if (command.kind !== 'text') {
      const mesh = meshes[imageIndex++]!;
      if (command.kind === 'sprite') {
        const color: GuiTextRgba8 = command.color ?? [255, 255, 255, 255];
        if (!color || color.length !== 4 || [...color].some(channel => !Number.isSafeInteger(channel) || channel < 0 || channel > 255)) throw new RangeError('Sprite vertex color requires four RGBA8 bytes.');
        commands.push({ kind: 'sprite', mesh, color: [...color] });
      } else commands.push({ kind: 'image', mesh });
      vertices += mesh.vertices.length; indices += mesh.indices.length; runs++;
    } else {
      const layout = layoutGuiText({ ...command, width: options.width, height: options.height, guiScale: options.guiScale,
        outputRect: options.outputRect, scissor: intersect(options.scissor, command.scissor, options.width, options.height) });
      commands.push({ kind: 'text', layout });
      for (const run of layout.runs) { vertices += run.vertices.length; indices += run.indices.length; runs++; }
    }
    if (vertices > 262144 || indices > 786432 || runs > 4096) throw new RangeError('GUI source commands exceed the combined geometry budget.');
  }
  return { ...frame, commands };
}

function intersect(layer: GuiImageLayoutOptions['scissor'], local: GuiImageLayoutOptions['scissor'], width: number, height: number) {
  const a = layer ?? [0, 0, width, height] as const, b = local ?? [0, 0, width, height] as const;
  // Validate the original local rectangle before intersection can hide invalid bounds.
  if (local && (local.length !== 4 || local.some(part => !Number.isSafeInteger(part) || part < 0)
    || local[0] + local[2] > width || local[1] + local[3] > height)) throw new RangeError('Text scissor must be an integer rectangle inside the framebuffer.');
  const x = Math.max(a[0], b[0]), y = Math.max(a[1], b[1]);
  return [x, y, Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - x), Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - y)] as const;
}

/**
 * Draw original images, UI sprites and packed-cell text in source order into ONE RGBA8 target.
 * Text inputs are source strings, metrics and paint origins, never captured vertices.
 * Whole-frame projection is retained when outputRect selects a physical output window.
 */
export function renderGuiLayer(options: GuiLayerRenderOptions): GuiLayerRenderResult {
  const layout = layoutSourceGuiLayer(options), commands: GuiLayerPreparedCommand[] = [];
  options.commands.forEach((command, index) => {
    const entry = layout.commands[index]!;
    if (command.kind === 'image' && entry.kind === 'image') commands.push({ kind: 'image', mesh: entry.mesh, mvp: layout.mvp, texture: command.texture });
    else if (command.kind === 'sprite' && entry.kind === 'sprite') commands.push({ kind: 'sprite', mesh: entry.mesh, mvp: layout.mvp, texture: command.texture, color: entry.color });
    else if (command.kind === 'text' && entry.kind === 'text') {
      if (!command.pages || typeof command.pages.get !== 'function') throw new RangeError('Text requires explicit decoded font pages.');
      for (const run of entry.layout.runs) {
        const page = command.pages.get(run.page), size = command.font.pageSizes[run.page];
        if (!page || page.width !== size || page.height !== size) throw new RangeError('Decoded font page dimensions must match the declared original page.');
        commands.push({ kind: 'text', texture: page, run: { ...run, cull: 'front', frontFace: 'cw' } });
      }
    }
  });
  const result = renderPreparedGuiLayer({ width: options.width, height: options.height, commands,
    outputRect: layout.outputRect, scissor: options.scissor, background: options.background, canvas: options.canvas, output: options.output });
  return { ...result, layout };
}
