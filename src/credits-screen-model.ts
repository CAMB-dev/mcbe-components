import type { CreditsScreenSnapshot, CreditsSurfaceProfile } from './credits-screen-types';
import type { CreditsWholeImage } from './credits-types';

export const CREDITS_COVER_MS = 3000, CREDITS_SKIP_WAIT_MS = 5000;
export function creditsFinite(value: number, name: string, min?: number): number {
  if (!Number.isFinite(value) || min !== undefined && value < min) throw new RangeError(`${name} must be finite${min === undefined ? '' : ` and >= ${min}`}.`);
  return value;
}
function flag(value: boolean, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name} must be a boolean.`);
  return value;
}
function text(value: string, name: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} must be a non-empty string.`);
  return value;
}
function pair(value: readonly [number, number], name: string, positive: boolean): readonly [number, number] {
  if (!Array.isArray(value) || value.length !== 2) throw new TypeError(`${name} must contain two dimensions.`);
  const result = [creditsFinite(value[0], name), creditsFinite(value[1], name)] as const;
  if (positive && result.some(item => item <= 0)) throw new RangeError(`${name} dimensions must be positive.`);
  return result;
}
function image(value: CreditsWholeImage): CreditsWholeImage {
  const result = { src: text(value.src, 'Credits source image'), naturalSize: pair(value.naturalSize, 'Credits source size', true),
    displaySize: pair(value.displaySize, 'Credits display size', true), alt: value.alt, provenance: text(value.provenance, 'Credits image provenance') };
  if (!result.naturalSize.every(Number.isSafeInteger)) throw new RangeError('Credits image source dimensions must be integer pixels.');
  if (typeof result.alt !== 'string') throw new TypeError('Credits image alt must be a string.');
  return result;
}
/** Snapshot all surface inputs before a host text-metrics callback can run. */
export function copyCreditsSurface(value: CreditsSurfaceProfile): CreditsSurfaceProfile {
  const source = value.background;
  const selected = source.rendering;
  if (selected !== undefined && (!selected || selected.kind !== 'gui-layer'
    || !['webgl', 'top-left'].includes(selected.rasterOrigin) || !['floor', 'truncate'].includes(selected.originRounding)))
    throw new RangeError('Invalid Credits GPU background rendering policy.');
  const background = { image: image(source.image), tileSize: pair(source.tileSize, 'Credits tile size', true),
    logicalSize: pair(source.logicalSize, 'Credits background size', true), from: pair(source.from, 'Credits background origin', false),
    to: pair(source.to, 'Credits background destination', false), durationMs: creditsFinite(source.durationMs, 'Credits background duration', Number.MIN_VALUE),
    ...(selected === undefined ? {} : { rendering: { kind: 'gui-layer' as const, rasterOrigin: selected.rasterOrigin, originRounding: selected.originRounding } }) };
  const mask = value.edgeMask;
  if (mask.kind !== 'none' && mask.kind !== 'whole-image') throw new RangeError('Unsupported Credits edge mask.');
  const edgeMask = mask.kind === 'none' ? { kind: 'none' as const } : { kind: 'whole-image' as const, image: image(mask.image) };
  const coverPlacement = value.coverPlacement;
  if (coverPlacement !== 'below-content' && coverPlacement !== 'above-content') throw new RangeError('Explicit Credits cover placement is required.');
  return { background, edgeMask, coverPlacement };
}
/** Factory child presence, visible binding, and parent input eligibility stay independent. */
export function copyCreditsSnapshot(value: CreditsScreenSnapshot): CreditsScreenSnapshot {
  const panel = value.factory.skipPanel, fade = value.factory.fadeOut;
  const child = panel?.button;
  if (panel !== null && child === undefined) throw new TypeError('Credits panel button must explicitly be null or a child snapshot.');
  return { introAgeMs: creditsFinite(value.introAgeMs, 'Credits intro age', 0),
    backgroundElapsedMs: creditsFinite(value.backgroundElapsedMs, 'Credits background age', 0),
    skipButtonVisible: flag(value.skipButtonVisible, 'Credits skip binding'), factory: {
      skipPanel: panel === null ? null : { instanceId: text(panel.instanceId, 'Credits panel identity'), exitInputActive: flag(panel.exitInputActive, 'Credits parent input flag'),
        button: child === null ? null : { generation: text(child!.generation, 'Credits button generation'), ageMs: creditsFinite(child!.ageMs, 'Credits child age', 0) } },
      fadeOut: fade === null ? null : { instanceId: text(fade.instanceId, 'Credits fade identity'), ageMs: creditsFinite(fade.ageMs, 'Credits fade age', 0) },
    } };
}
export function creditsSurfaceFrame(surface: CreditsSurfaceProfile, snapshot: CreditsScreenSnapshot) {
  const progress = Math.min(snapshot.backgroundElapsedMs / surface.background.durationMs, 1);
  return { backgroundOffset: surface.background.from.map((start, index) => {
    // Convex weights avoid overflow from subtracting two finite opposite extremes.
    return creditsFinite(start * (1 - progress) + surface.background.to[index]! * progress, 'Credits background offset');
  }) as [number, number], introOpacity: 1 - Math.min(snapshot.introAgeMs / CREDITS_COVER_MS, 1),
    outroOpacity: snapshot.factory.fadeOut === null ? null : Math.min(snapshot.factory.fadeOut.ageMs / CREDITS_COVER_MS, 1),
    childExpired: snapshot.factory.skipPanel?.button !== null && snapshot.factory.skipPanel?.button !== undefined
      && snapshot.factory.skipPanel.button.ageMs >= CREDITS_SKIP_WAIT_MS };
}
