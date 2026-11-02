import type {ClassicSkinAsset} from './classic-skin';

/** Private source materials. Whole PNGs and raw metadata are reused unchanged.
 * Physical PNG dimensions and metadata base_size are deliberately not normalized. */
export const worldActionAssets = Object.freeze({
  dark: {url: new URL("./assets/player-permissions/button_borderless_dark.png", import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]}},
  darkHover: {url: new URL("./assets/player-permissions/button_borderless_darkhover.png", import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]}},
  darkPressed: {url: new URL("./assets/player-permissions/button_borderless_darkpressed.png", import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]}},
  realms: {url: new URL("./assets/play-screen/realmsContent.png", import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]}},
  realmsHover: {url: new URL("./assets/play-screen/realmsContentHover.png", import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]}},
  realmsPressed: {url: new URL("./assets/play-screen/realmsContentPressed.png", import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]}},
} as const satisfies Readonly<Record<string, ClassicSkinAsset>>);
