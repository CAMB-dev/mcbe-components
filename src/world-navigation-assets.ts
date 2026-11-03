import type {ClassicSkinAsset} from './classic-skin';
import {progressAssets} from './progress-assets';

/** Private exact public originals. Missing exact-case literals are not aliases.
 * PNG physical dimensions are independent of the source control display size. */
export const worldNavigationAssets = Object.freeze({
  "textures/ui/controller_glyph": {url: new URL("./assets/gui-icons/controller-glyph.png", import.meta.url).href, width: 21, height: 14},
  "textures/ui/controller_glyph_color": {url: new URL("./assets/gui-icons/controller-glyph-color.png", import.meta.url).href, width: 21, height: 14},
  "textures/ui/controller_glyph_switch": {url: new URL("./assets/world-navigation/controller_glyph_switch.png", import.meta.url).href, width: 21, height: 14},
  "textures/ui/controller_glyph_color_switch": {url: new URL("./assets/world-navigation/controller_glyph_color_switch.png", import.meta.url).href, width: 21, height: 14},
  "textures/ui/multiplayer_glyph": {url: new URL("./assets/gui-icons/multiplayer-glyph.png", import.meta.url).href, width: 22, height: 12},
  "textures/ui/multiplayer_glyph_color": {url: new URL("./assets/gui-icons/multiplayer-glyph-color.png", import.meta.url).href, width: 22, height: 12},
  "textures/ui/bookshelf_flat_border": {url: new URL("./assets/world-navigation/bookshelf_flat_border.png", import.meta.url).href, width: 15, height: 15},
  "textures/ui/bookshelf_flat": {url: new URL("./assets/world-navigation/bookshelf_flat.png", import.meta.url).href, width: 15, height: 15},
  "textures/ui/debug_glyph": {url: new URL("./assets/world-navigation/debug_glyph.png", import.meta.url).href, width: 15, height: 15},
  "textures/ui/debug_glyph_color": {url: new URL("./assets/world-navigation/debug_glyph_color.png", import.meta.url).href, width: 15, height: 15},
  "textures/ui/BannersTransparent": {url: new URL("./assets/world-navigation/BannersTransparent.png", import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]}},
  "textures/ui/loading_bar": progressAssets["textures/ui/loading_bar"],
} as const satisfies Readonly<Record<string,ClassicSkinAsset>>);
