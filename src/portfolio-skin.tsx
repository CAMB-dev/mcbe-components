import type { PortfolioAsset } from './portfolio-assets';
import { ClassicSkin } from './classic-skin';

/** Private Portfolio compatibility wrapper; no additional DOM layer. */
export function PortfolioSkin({ asset, width, height, scale, className = '' }: {
  asset: PortfolioAsset; width: number; height: number; scale: number; className?: string;
}) {
  return <ClassicSkin asset={asset} width={width} height={height} scale={scale} className={className}
    baseClass="mc-portfolio-skin" errorName="Portfolio" />;
}
