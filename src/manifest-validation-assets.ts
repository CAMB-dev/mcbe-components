// Private whole originals for the fixed Classic Manifest Validation templates.
// Every image reuses an existing source asset; no new PNG or painted sprite.
import type { ClassicSkinAsset } from './classic-skin';
import { resourcePackAssets } from './resource-pack-assets';

/** Includes six authored root literals, even declared-only glyph variants.
 * This set is not a claim all twenty materials are visible in the default screen. */
export const manifestValidationAssets = Object.freeze({
  'textures/ui/copy': { url: new URL('./assets/gui-icons/copy.png', import.meta.url).href, width: 12, height: 12 },
  'textures/ui/trash_default': { url: new URL('./assets/npc/trash_default.png', import.meta.url).href, width: 16, height: 16 },
  'textures/ui/refresh': { url: new URL('./assets/gui-icons/refresh.png', import.meta.url).href, width: 18, height: 14 },
  'textures/ui/divider3': resourcePackAssets['textures/ui/divider3'],
  'textures/ui/loading_bar': resourcePackAssets['textures/ui/loading_bar'],
  'textures/ui/BannersLight': { url: new URL('./assets/play-screen/BannersLight.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },
  'textures/ui/Black': resourcePackAssets['textures/ui/Black'],
  'textures/ui/dialog_background_hollow_3': resourcePackAssets['textures/ui/dialog_background_hollow_3'],
  'textures/ui/control': resourcePackAssets['textures/ui/control'],
  'textures/ui/screen_background': resourcePackAssets['textures/ui/screen_background'],
  'textures/ui/close_button_default': resourcePackAssets['textures/ui/close_button_default'],
  'textures/ui/close_button_hover': resourcePackAssets['textures/ui/close_button_hover'],
  'textures/ui/close_button_pressed': resourcePackAssets['textures/ui/close_button_pressed'],
  'textures/ui/button_borderless_light': resourcePackAssets['textures/ui/button_borderless_light'],
  'textures/ui/button_borderless_lighthover': resourcePackAssets['textures/ui/button_borderless_lighthover'],
  'textures/ui/button_borderless_lightpressed': resourcePackAssets['textures/ui/button_borderless_lightpressed'],
  'textures/ui/disabledButtonNoBorder': resourcePackAssets['textures/ui/disabledButtonNoBorder'],
  'textures/ui/focus_border_white': resourcePackAssets['textures/ui/focus_border_white'],
  'textures/ui/ScrollRail': resourcePackAssets['textures/ui/ScrollRail'],
  'textures/ui/ScrollHandle': resourcePackAssets['textures/ui/ScrollHandle'],
} satisfies Readonly<Record<string, ClassicSkinAsset>>);
