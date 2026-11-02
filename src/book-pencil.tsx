import { useState } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { GuiLayer } from './gui-layer-component';
import { layoutGuiImages } from './gui-image-geometry';
import type { GuiImageRect } from './gui-image-geometry';

/** Explicit host-resolved whole-target coordinates, independent of the DOM viewport. */
export interface BookPencilRasterProfile {
  frameSize: readonly [number, number];
  /** GLOBAL logical position of the Book root. Uses layout.unitScale for projection. */
  origin: readonly [number, number];
  /** Change to retry a failed/lost image request. */
  renderKey?: string | number;
}

export function validateBookPencilRaster(profile: BookPencilRasterProfile, scale: number): void {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile) || !Array.isArray(profile.frameSize) || profile.frameSize.length !== 2
    || !Array.isArray(profile.origin) || profile.origin.length !== 2
    || Array.from(profile.origin).some(n => !Number.isFinite(n) || !Number.isFinite(Math.fround(n)))
    || (profile.renderKey !== undefined && typeof profile.renderKey !== 'string' && typeof profile.renderKey !== 'number')
    || (typeof profile.renderKey === 'number' && !Number.isFinite(profile.renderKey)))
    throw new RangeError('Book pencil raster requires a whole frame and finite GLOBAL source origin.');
  layoutGuiImages({ width: profile.frameSize[0], height: profile.frameSize[1], guiScale: scale, images: [] });
}

/** Full original 18x16 image, contained in the real 19x18 source hitbox. */
export function layoutBookPencil(profile: BookPencilRasterProfile, scale: number, control: GuiImageRect) {
  validateBookPencilRaster(profile, scale);
  const f = Math.fround, height = f(16 * f(19 / 18));
  const rect: GuiImageRect = [control[0], f(f(control[1]) + f((18 - height) / 2)), 19, height];
  const image = { rect, physicalPrecision: 'float32' as const };
  const layout = layoutGuiImages({ width: profile.frameSize[0], height: profile.frameSize[1], guiScale: scale, images: [image] });
  // Crop only storage/presentation. Quantization and projection still use GLOBAL
  // coordinates and the whole target; a local canvas is never a projection input.
  const vertices = layout.meshes[0]!.vertices;
  const xs = vertices.map(v => v.position[0] * scale), ys = vertices.map(v => v.position[1] * scale);
  const left = Math.min(profile.frameSize[0] - 1, Math.max(0, Math.floor(Math.min(...xs)) - 2));
  const top = Math.min(profile.frameSize[1] - 1, Math.max(0, Math.floor(Math.min(...ys)) - 2));
  const right = Math.min(profile.frameSize[0], Math.max(left + 1, Math.ceil(Math.max(...xs)) + 2));
  const bottom = Math.min(profile.frameSize[1], Math.max(top + 1, Math.ceil(Math.max(...ys)) + 2));
  return { image, outputRect: [left, top, right - left, bottom - top] as GuiImageRect };
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  raster?: BookPencilRasterProfile;
  scale: number;
  control: GuiImageRect;
  paintOrigin: readonly [number, number];
  textures: readonly [string, string, string];
  onPaintError?: (error: Error) => void;
}

/** Preserve one real button. CSS selects the same normal/hover/pressed original
 * images; all three source painters must be ready before replacing its CSS art. */
function PencilPainters({ raster, scale, control, paintOrigin, textures, onPaintError }: Required<Pick<Props, 'raster' | 'scale' | 'control' | 'paintOrigin' | 'textures'>> & Pick<Props, 'onPaintError'>) {
  const prepared = layoutBookPencil(raster, scale, control);
  const [ready, setReady] = useState(0);
  const mark = (index: number, available: boolean) => setReady(mask => {
    const next = available ? mask | 1 << index : mask & ~(1 << index);
    return mask === next ? mask : next;
  });
  return <span aria-hidden="true" className="mc-book__pencil-painters" data-source-pencil-ready={ready === 7 || undefined}>
      {textures.map((texture, index) => <span key={index} className={`mc-book__pencil-paint mc-book__pencil-paint--${index}`}>
        <GuiLayer width={raster.frameSize[0]} height={raster.frameSize[1]} guiScale={scale}
          rasterOrigin="top-left"
          commands={[{ kind: 'image', ...prepared.image, texture }]} outputRect={prepared.outputRect} renderKey={raster.renderKey}
          onRenderStateChange={state => mark(index, state === 'ready')} onRenderError={onPaintError}
          style={{ position: 'absolute', left: prepared.outputRect[0] - paintOrigin[0] * scale,
            top: prepared.outputRect[1] - paintOrigin[1] * scale, pointerEvents: 'none' }}/>
      </span>)}
    </span>;
}

export function BookPencilButton({ raster, scale, control, paintOrigin, textures, onPaintError, ...props }: Props) {
  const key = JSON.stringify([raster?.frameSize, raster?.renderKey, scale, control, paintOrigin, textures]);
  return <><button {...props}/>{raster && <PencilPainters key={key} raster={raster} scale={scale} control={control}
    paintOrigin={paintOrigin} textures={textures} onPaintError={onPaintError}/>}</>;
}
