import { forwardRef, useEffect, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';
import { loadTexture } from './item-renderer-engine';
import type { PixelTexture } from './item-renderer-engine';

const itemGlintUrl = new URL('./assets/glint/enchanted_item_glint.png', import.meta.url).href;

export type ItemGlintSampler = 'point-repeat' | 'bilinear-repeat';
export interface ItemGlintUniforms {
  uvOffset: readonly [number, number];
  uvScale: readonly [number, number];
  /** Both angles are radians, matching the source sincos instructions. */
  uvRotation: readonly [number, number];
  /** Non-negative floating RGB; no purple or clock profile is assumed. */
  glintColor: readonly [number, number, number];
  tintColor?: readonly [number, number, number, number];
  hudOpacity?: number;
}
export interface ItemGlintBlend {
  source: 'one' | 'source-alpha' | 'source-color';
  destination: 'one' | 'one-minus-source-alpha';
}
export interface ItemGlintRenderOptions {
  uniforms: ItemGlintUniforms;
  glintSampler: ItemGlintSampler;
  blend: ItemGlintBlend;
  width?: number;
  height?: number;
}
export type ItemGlintPassColor = readonly [number, number, number, number];
interface NormalizedUniforms extends ItemGlintUniforms {
  tintColor: readonly [number, number, number, number];
  hudOpacity: number;
}

function dimension(value: number, name: string) {
  if (!Number.isInteger(value) || value < 1 || value > 1024) throw new RangeError(`${name} must be an integer from 1 to 1024.`);
  return value;
}
function tuple(value: readonly number[], length: number, name: string, nonNegative = false) {
  if (!Array.isArray(value) || value.length !== length || value.some(v => !Number.isFinite(v) || (nonNegative && v < 0))) throw new RangeError(`Invalid ${name}.`);
}
function uniformValues(value: ItemGlintUniforms): NormalizedUniforms {
  if (!value) throw new RangeError('Explicit glint uniforms are required.');
  tuple(value.uvOffset, 2, 'uvOffset'); tuple(value.uvScale, 2, 'uvScale'); tuple(value.uvRotation, 2, 'uvRotation'); tuple(value.glintColor, 3, 'glintColor', true);
  if (value.uvScale.some(v => v <= 0)) throw new RangeError('uvScale must be positive.');
  const tintColor = value.tintColor ?? [1, 1, 1, 1], hudOpacity = value.hudOpacity ?? 1;
  tuple(tintColor, 4, 'tintColor', true);
  if (tintColor[3] > 1 || !Number.isFinite(hudOpacity) || hudOpacity < 0 || hudOpacity > 1) throw new RangeError('Opacity must be from 0 to 1.');
  return { ...value, tintColor, hudOpacity };
}
function samplerValue(value: ItemGlintSampler) {
  if (!['point-repeat', 'bilinear-repeat'].includes(value)) throw new RangeError('Explicit supported glintSampler is required.');
}
function blendValue(value: ItemGlintBlend) {
  if (!value || !['one', 'source-alpha', 'source-color'].includes(value.source) || !['one', 'one-minus-source-alpha'].includes(value.destination)) throw new RangeError('Explicit supported blend factors are required.');
}
function textureValue(value: PixelTexture, name: string) {
  if (!value || !Number.isInteger(value.width) || !Number.isInteger(value.height) || value.width < 1 || value.height < 1 || value.width > 4096 || value.height > 4096 || !(value.data instanceof Uint8ClampedArray) || value.data.length !== value.width * value.height * 4) throw new RangeError(`Invalid ${name} texture.`);
}
const repeat = (value: number) => value - Math.floor(value);
const wrap = (value: number, size: number) => ((value % size) + size) % size;
function glintRgb(texture: PixelTexture, u: number, v: number, sampler: ItemGlintSampler): readonly number[] {
  u = repeat(u); v = repeat(v);
  const pixel = (x: number, y: number, channel: number) => texture.data[(wrap(y, texture.height) * texture.width + wrap(x, texture.width)) * 4 + channel]! / 255;
  if (sampler === 'point-repeat') {
    const x = Math.floor(u * texture.width), y = Math.floor(v * texture.height);
    return [pixel(x, y, 0), pixel(x, y, 1), pixel(x, y, 2)];
  }
  // Normalized texture coordinates address texel centers at (n+.5)/size.
  const x = u * texture.width - .5, y = v * texture.height - .5, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  return [0, 1, 2].map(channel => pixel(x0, y0, channel) * (1 - fx) * (1 - fy) + pixel(x0 + 1, y0, channel) * fx * (1 - fy) + pixel(x0, y0 + 1, channel) * (1 - fx) * fy + pixel(x0 + 1, y0 + 1, channel) * fx * fy);
}
function shade(uv: readonly [number, number], alpha: number, texture: PixelTexture, uniforms: NormalizedUniforms, sampler: ItemGlintSampler): ItemGlintPassColor | null {
  if (alpha <= 1 / 256) return null;
  const p = [uv[0] - .5, uv[1] - .5], colors = [0, 0, 0];
  for (let layer = 0; layer < 2; layer++) {
    const angle = uniforms.uvRotation[layer]!, cos = Math.cos(angle), sin = Math.sin(angle);
    const u = (p[0]! * cos + p[1]! * sin + uniforms.uvOffset[layer]! + .5) * uniforms.uvScale[0];
    const v = (-p[0]! * sin + p[1]! * cos + .5) * uniforms.uvScale[1];
    const sampled = glintRgb(texture, u, v, sampler);
    for (let channel = 0; channel < 3; channel++) colors[channel]! += sampled[channel]!;
  }
  const rgb = colors.map((value, channel) => (value * uniforms.glintColor[channel]! * uniforms.tintColor[channel]!) ** 2 * uniforms.tintColor[3] * uniforms.hudOpacity);
  if (rgb.some(value => !Number.isFinite(value))) throw new RangeError('Glint arithmetic overflow.');
  return [rgb[0]!, rgb[1]!, rgb[2]!, alpha * uniforms.tintColor[3] * uniforms.hudOpacity];
}

/** Raw UIGlint SM4/SM5 pass values, before blend/clamping. No native host defaults. */
export function shadeItemGlint(uv: readonly [number, number], maskAlpha: number, texture: PixelTexture, uniforms: ItemGlintUniforms, glintSampler: ItemGlintSampler): ItemGlintPassColor | null {
  tuple(uv, 2, 'uv');
  if (!Number.isFinite(maskAlpha) || maskAlpha < 0 || maskAlpha > 1) throw new RangeError('maskAlpha must be from 0 to 1.');
  textureValue(texture, 'glint'); samplerValue(glintSampler);
  return shade(uv, maskAlpha, texture, uniformValues(uniforms), glintSampler);
}

/** Nearest original-item sampling, then explicit straight-RGBA destination blend.
 * No gamma conversion; only the final normalized result is clamped/quantized.
 * This Web compositing profile does not authenticate a native draw state.
 */
export function renderItemGlint(image: PixelTexture, texture: PixelTexture, options: ItemGlintRenderOptions): PixelTexture {
  textureValue(image, 'item'); textureValue(texture, 'glint');
  if (!options) throw new RangeError('Explicit render options are required.');
  const width = dimension(options.width ?? image.width, 'width'), height = dimension(options.height ?? image.height, 'height'), uniforms = uniformValues(options.uniforms);
  samplerValue(options.glintSampler); blendValue(options.blend);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const uv: readonly [number, number] = [(x + .5) / width, (y + .5) / height];
    const source = (Math.min(image.height - 1, Math.floor(uv[1] * image.height)) * image.width + Math.min(image.width - 1, Math.floor(uv[0] * image.width))) * 4, target = (y * width + x) * 4;
    const base = [0, 1, 2, 3].map(channel => image.data[source + channel]! / 255), pass = shade(uv, base[3]!, texture, uniforms, options.glintSampler);
    for (let channel = 0; channel < 4; channel++) {
      const src = pass?.[channel] ?? 0;
      const srcFactor = !pass ? 0 : options.blend.source === 'one' ? 1 : options.blend.source === 'source-alpha' ? pass[3] : pass[channel]!;
      const dstFactor = !pass || options.blend.destination === 'one' ? 1 : 1 - pass[3];
      const value = src * srcFactor + base[channel]! * dstFactor;
      if (!Number.isFinite(value)) throw new RangeError('Glint blend overflow.');
      data[target + channel] = Math.round(Math.max(0, Math.min(1, value)) * 255);
    }
  }
  return { width, height, data };
}

export interface ItemGlintProps extends Omit<HTMLAttributes<HTMLCanvasElement>, 'children'> {
  imageSrc: string;
  uniforms: ItemGlintUniforms;
  glintSampler: ItemGlintSampler;
  blend: ItemGlintBlend;
  /** Actual original item glint by default; never the actor texture. */
  textureSrc?: string;
  width?: number;
  height?: number;
  label?: string;
  decorative?: boolean;
  onReady?: () => void;
  onRenderError?: (error: Error) => void;
}

/** Source-textured, explicitly controlled reconstruction. It owns no clock. */
export const ItemGlint = forwardRef<HTMLCanvasElement, ItemGlintProps>(function ItemGlint({
  imageSrc, textureSrc = itemGlintUrl, uniforms, glintSampler, blend, width = 32, height = 32, label = 'Item with glint', decorative = false, onReady, onRenderError, className, style, ...props
}, ref) {
  dimension(width, 'width'); dimension(height, 'height'); uniformValues(uniforms); samplerValue(glintSampler); blendValue(blend);
  if (typeof imageSrc !== 'string' || !imageSrc.trim() || typeof textureSrc !== 'string' || !textureSrc.trim()) throw new RangeError('Non-empty imageSrc and textureSrc are required.');
  const canvas = useRef<HTMLCanvasElement | null>(null), callbacks = useRef({ onReady, onRenderError }); callbacks.current = { onReady, onRenderError };
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const profile = JSON.stringify({ uniforms, glintSampler, blend });
  useEffect(() => {
    let cancelled = false; setState('loading');
    const context = canvas.current?.getContext('2d'); context?.clearRect(0, 0, width, height);
    // Snapshot controlled values; equivalent arrays do not repaint on parent state.
    const options = { ...JSON.parse(profile) as ItemGlintRenderOptions, width, height };
    void Promise.all([loadTexture(imageSrc), loadTexture(textureSrc)]).then(([image, texture]) => {
      if (cancelled || !canvas.current) return;
      const context = canvas.current.getContext('2d'); if (!context) throw new Error('Canvas2D unavailable.');
      const result = renderItemGlint(image, texture, options), pixels = context.createImageData(width, height); pixels.data.set(result.data); context.putImageData(pixels, 0, 0);
      setState('ready'); callbacks.current.onReady?.();
    }).catch(error => { if (!cancelled) { setState('error'); callbacks.current.onRenderError?.(error instanceof Error ? error : new Error(String(error))); } });
    return () => { cancelled = true; };
  }, [imageSrc, textureSrc, width, height, profile]);
  return <canvas {...props} ref={node => { canvas.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }} width={width} height={height}
    role={decorative ? undefined : props.role ?? 'img'} aria-label={decorative ? undefined : props['aria-label'] ?? label} aria-hidden={decorative || props['aria-hidden'] || undefined}
    className={['mc-item-glint', className].filter(Boolean).join(' ')} style={{ display: 'inline-block', verticalAlign: 'middle', flex: 'none', maxWidth: 'none', maxHeight: 'none', imageRendering: 'pixelated', width, height, ...style } as CSSProperties}
    data-renderer="item-glint" data-render-state={state} data-fidelity="controlled-reconstruction" data-glint-profile="uiglint-sm4-sm5-explicit" />;
});
