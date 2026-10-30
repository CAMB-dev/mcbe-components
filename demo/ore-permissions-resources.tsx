import type { CSSProperties } from 'react';
import type { PermissionLevel } from '../src/player-permissions';
import { orePermissionAssets, orePermissionRoleImages } from 'virtual:mcbeui-game-font';

// This demo-only bridge receives unchanged resources from ignored local files.
// No installed art or font is imported by any library component.
const image = (src: string | undefined) => src ? <img src={src} alt="" draggable={false} style={{ width: '100%', height: '100%', imageRendering: 'pixelated', display: 'block' }}/>: undefined;
const mask = (src: string | undefined) => src ? <span style={{ display: 'block', width: '100%', height: '100%', backgroundColor: 'currentColor', maskImage: `url(${JSON.stringify(src)})`, WebkitMaskImage: `url(${JSON.stringify(src)})`, maskSize: '100% 100%', maskPosition: 'center', maskRepeat: 'no-repeat', imageRendering: 'pixelated' } as CSSProperties}/>: undefined;
export const oreRoleIcons = Object.fromEntries((['visitor', 'member', 'operator', 'custom'] as const).map(role => [role, mask(orePermissionRoleImages?.[role])])) as Record<PermissionLevel, ReturnType<typeof mask>>;
export const oreDemoAssets = {
  avatarSrc: orePermissionAssets?.avatar,
  back: image(orePermissionAssets?.back),
  close: image(orePermissionAssets?.close),
  check: image(orePermissionAssets?.check),
  chevron: mask(orePermissionAssets?.chevron),
  switchOn: image(orePermissionAssets?.switchOn),
  switchOff: image(orePermissionAssets?.switchOff),
};
export const hasOrePermissionArt = !!orePermissionRoleImages && !!orePermissionAssets;
