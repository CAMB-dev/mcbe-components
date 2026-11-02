import type {ClassicSkinAsset} from './classic-skin';
import {resourcePackAssets} from './resource-pack-assets';

/** Private unchanged source states for settings_common.section_toggle_base. */
export const settingsNavigationAssets = Object.freeze({
  unchecked: resourcePackAssets['textures/ui/button_borderless_light'],
  checked: resourcePackAssets['textures/ui/button_borderless_lightpressednohover'],
  uncheckedHover: resourcePackAssets['textures/ui/button_borderless_lighthover'],
  checkedHover: resourcePackAssets['textures/ui/button_borderless_lightpressed'],
  locked: resourcePackAssets['textures/ui/disabledButtonNoBorder'],
  border: resourcePackAssets['textures/ui/focus_border_white'],
  controller: {url: new URL("./assets/gui-icons/controller-glyph.png", import.meta.url).href, width: 21, height: 14},
  controllerColor: {url: new URL("./assets/gui-icons/controller-glyph-color.png", import.meta.url).href, width: 21, height: 14},
  multiplayer: {url: new URL("./assets/gui-icons/multiplayer-glyph.png", import.meta.url).href, width: 22, height: 12},
  multiplayerColor: {url: new URL("./assets/gui-icons/multiplayer-glyph-color.png", import.meta.url).href, width: 22, height: 12},
} as const satisfies Readonly<Record<string, ClassicSkinAsset>>);
