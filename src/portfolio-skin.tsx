import type { CSSProperties } from 'react';
import type { PortfolioAsset } from './portfolio-assets';

/** Private finite Web interpretation of Classic raw metadata. Original PNGs
 * remain whole CSS inputs; this is not a recovered native material evaluator.
 * Zero-width source centres use the boundary texel, as the Book Web profile
 * does. Physical/base-size mismatch is retained rather than rewritten. */
export function PortfolioSkin({ asset, width, height, scale, className = '' }: {
  asset: PortfolioAsset; width: number; height: number; scale: number; className?: string;
}) {
  if (![width, height, scale].every(n => Number.isFinite(n) && n > 0) || !Number.isSafeInteger(scale)
    || !Number.isFinite(width * scale) || !Number.isFinite(height * scale))
    throw new RangeError('Portfolio skin requires finite positive dimensions and an integer scale.');
  const metadata = asset.metadata;
  if (!metadata) return <span aria-hidden="true" className={`mc-portfolio-skin ${className}`} style={{ width: width * scale, height: height * scale,
    backgroundImage: `url(${JSON.stringify(asset.url)})`, backgroundSize: '100% 100%' }} />;
  const cuts = typeof metadata.nineslice_size === 'number'
    ? [metadata.nineslice_size, metadata.nineslice_size, metadata.nineslice_size, metadata.nineslice_size]
    : metadata.nineslice_size;
  const axis = (extent: number, physical: number, base: number, before: number, after: number) => {
    const compress = Math.min(1, extent / Math.max(1, before + after));
    const first = before * compress, last = after * compress;
    return [
      { at: 0, extent: first, source: 0, pixels: before * physical / base },
      { at: first, extent: Math.max(0, extent - first - last), source: before * physical / base, pixels: (base - before - after) * physical / base },
      { at: extent - last, extent: last, source: (base - after) * physical / base, pixels: after * physical / base },
    ];
  };
  let xs = axis(width, asset.width, metadata.base_size[0], cuts[0]!, cuts[2]!);
  let ys = axis(height, asset.height, metadata.base_size[1], cuts[1]!, cuts[3]!);
  let paintScale = scale;
  const fractional = (segments: typeof xs) => segments.some(segment => !Number.isInteger(segment.at * scale)
    || !Number.isInteger(segment.extent * scale) || !Number.isInteger(segment.source) || !Number.isInteger(segment.pixels));
  if (Number.isInteger(width * scale) && Number.isInteger(height * scale) && (fractional(xs) || fractional(ys))) {
    // Fractional CSS background boxes round their paint size independently of
    // clipping. On compressed raw8x2/physical8x1 spines this changes texel
    // selection. Group destination pixel centres by original source texel;
    // each run still references the complete original PNG. Bound this path so
    // explicit host dimensions cannot create unbounded DOM work.
    if (width * scale > 8192 || height * scale > 8192) throw new RangeError('Fractional Portfolio skin exceeds the finite POINT span budget.');
    const pointRuns = (segments: typeof xs, extent: number, physical: number) => {
      const runs: typeof xs = [];
      for (let i = 0; i < extent * scale; i++) {
        const centre = (i + .5) / scale;
        const segment = centre < segments[0]!.extent ? segments[0]!
          : centre >= segments[2]!.at ? segments[2]! : segments[1]!;
        const texel = Math.max(0, Math.min(physical - 1, Math.floor(segment.source
          + (segment.pixels > 0 && segment.extent > 0 ? (centre - segment.at) * segment.pixels / segment.extent : 0))));
        const last = runs.at(-1);
        if (last?.source === texel) last.extent++; else runs.push({ at: i, extent: 1, source: texel, pixels: 1 });
      }
      return runs;
    };
    xs = pointRuns(xs, width, asset.width); ys = pointRuns(ys, height, asset.height); paintScale = 1;
    if (xs.length * ys.length > 4096) throw new RangeError('Fractional Portfolio skin exceeds the finite POINT patch budget.');
  }
  const patches = [];
  for (let row = 0; row < ys.length; row++) for (let column = 0; column < xs.length; column++) {
    const x = xs[column]!, y = ys[row]!;
    if (!x.extent || !y.extent) continue;
    const sx = x.pixels > 0 ? x.source : Math.max(0, Math.min(asset.width - 1, Math.floor(x.source)));
    const sy = y.pixels > 0 ? y.source : Math.max(0, Math.min(asset.height - 1, Math.floor(y.source)));
    const sw = x.pixels || 1, sh = y.pixels || 1;
    const style: CSSProperties = { width: x.extent * paintScale, height: y.extent * paintScale, backgroundImage: `url(${JSON.stringify(asset.url)})`,
      backgroundSize: `${asset.width / sw * 100}% ${asset.height / sh * 100}%`,
      backgroundPosition: `${asset.width === sw ? 0 : sx / (asset.width - sw) * 100}% ${asset.height === sh ? 0 : sy / (asset.height - sh) * 100}%` };
    patches.push(<span key={`${row}-${column}`} className="mc-portfolio-skin__clip" style={{ left: x.at * paintScale, top: y.at * paintScale, width: x.extent * paintScale, height: y.extent * paintScale }}>
      <span className="mc-portfolio-skin__patch" style={style} />
    </span>);
  }
  return <span aria-hidden="true" className={`mc-portfolio-skin ${className}`} style={{ width: width * scale, height: height * scale }}>{patches}</span>;
}
