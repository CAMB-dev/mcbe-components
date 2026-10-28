import { forwardRef } from 'react';
import type { ImgHTMLAttributes } from 'react';

/** Actual Mojang textures. Provenance and hashes: docs/item-materials.json. */
export const gameItemTextures = {
  sword: { src: new URL('./assets/minecraft/diamond_sword.png', import.meta.url).href, width: 16, height: 16 },
  diamond: { src: new URL('./assets/minecraft/diamond.png', import.meta.url).href, width: 16, height: 16 },
  apple: { src: new URL('./assets/minecraft/apple.png', import.meta.url).href, width: 16, height: 16 },
  gem: { src: new URL('./assets/minecraft/emerald.png', import.meta.url).href, width: 16, height: 16 },
  lapis: { src: new URL('./assets/minecraft/dye_powder_blue.png', import.meta.url).href, width: 16, height: 16 },
  // This official GUI category image is already rendered, not a hand-built cube.
  // Preserve its 17×17 pixels at integer scale; do not squeeze it to 16×16.
  grass: { src: new URL('./assets/minecraft/icon_recipe_nature.png', import.meta.url).href, width: 17, height: 17 },
} as const;
export type GameItemName = keyof typeof gameItemTextures;
export interface GameItemIconProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height'> {
  name: GameItemName;
  scale?: 1 | 2 | 3 | 4;
}
export const GameItemIcon = forwardRef<HTMLImageElement, GameItemIconProps>(function GameItemIcon({ name, scale = 2, alt = '', style, ...props }, ref) {
  const texture = gameItemTextures[name];
  const width = texture.width * scale, height = texture.height * scale;
  return <img {...props} ref={ref} src={texture.src} alt={alt} draggable={false} width={width} height={height}
    data-game-material={name} style={{ width, height, maxWidth: 'none', maxHeight: 'none', imageRendering: 'pixelated', ...style }}/>;
});

/** Compatibility name used by the existing demo. */
export const ItemSprite = GameItemIcon;
export type ItemSpriteProps = GameItemIconProps;
