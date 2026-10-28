import { forwardRef } from 'react';
import type { ImgHTMLAttributes } from 'react';
import { Image } from '../src/image';

/** Actual Mojang textures. Provenance and hashes: docs/item-materials.json. */
export const gameItemTextures = {
  sword: { src: new URL('./assets/minecraft/diamond_sword.png', import.meta.url).href, width: 16, height: 16 },
  diamond: { src: new URL('./assets/minecraft/diamond.png', import.meta.url).href, width: 16, height: 16 },
  apple: { src: new URL('./assets/minecraft/apple.png', import.meta.url).href, width: 16, height: 16 },
  gem: { src: new URL('./assets/minecraft/emerald.png', import.meta.url).href, width: 16, height: 16 },
  lapis: { src: new URL('./assets/minecraft/dye_powder_blue.png', import.meta.url).href, width: 16, height: 16 },
  coal: { src: new URL('./assets/minecraft/coal.png', import.meta.url).href, width: 16, height: 16 },
  stick: { src: new URL('./assets/minecraft/stick.png', import.meta.url).href, width: 16, height: 16 },
  rawBeef: { src: new URL('./assets/minecraft/beef_raw.png', import.meta.url).href, width: 16, height: 16 },
  steak: { src: new URL('./assets/minecraft/beef_cooked.png', import.meta.url).href, width: 16, height: 16 },
  ironSword: { src: new URL('./assets/minecraft/iron_sword.png', import.meta.url).href, width: 16, height: 16 },
  ironNugget: { src: new URL('./assets/minecraft/iron_nugget.png', import.meta.url).href, width: 16, height: 16 },
  waterBottle: { src: new URL('./assets/minecraft/potion_bottle_drinkable.png', import.meta.url).href, width: 16, height: 16 },
  glassBottle: { src: new URL('./assets/minecraft/potion_bottle_empty.png', import.meta.url).href, width: 16, height: 16 },
  blazePowder: { src: new URL('./assets/minecraft/blaze_powder.png', import.meta.url).href, width: 16, height: 16 },
  netherWart: { src: new URL('./assets/minecraft/nether_wart.png', import.meta.url).href, width: 16, height: 16 },
  netheriteUpgradeTemplate: { src: new URL('./assets/minecraft/netherite_upgrade_smithing_template.png', import.meta.url).href, width: 16, height: 16 },
  netheriteIngot: { src: new URL('./assets/minecraft/netherite_ingot.png', import.meta.url).href, width: 16, height: 16 },
  netheriteSword: { src: new URL('./assets/minecraft/netherite_sword.png', import.meta.url).href, width: 16, height: 16 },
  emptyMap: { src: new URL('./assets/minecraft/map_empty.png', import.meta.url).href, width: 16, height: 16 },
  filledMap: { src: new URL('./assets/minecraft/map_filled.png', import.meta.url).href, width: 16, height: 16 },
  paper: { src: new URL('./assets/minecraft/paper.png', import.meta.url).href, width: 16, height: 16 },
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
  return <Image {...props} ref={ref} src={texture.src} alt={alt} sourceSize={[texture.width,texture.height]} scale={scale} draggable={false}
    data-game-material={name} style={{ maxWidth: 'none', maxHeight: 'none', imageRendering: 'pixelated', ...style }}/>;
});

/** Compatibility name used by the existing demo. */
export const ItemSprite = GameItemIcon;
export type ItemSpriteProps = GameItemIconProps;
