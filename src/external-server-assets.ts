import type { ClassicSkinAsset } from './classic-skin';
/** Private whole originals from the fixed Bedrock Samples v1.26.60.5 archive.
 * Raw PNGs and JSON metadata are retained; no screenshot or redrawn art. */
const sourceAssets = Object.freeze({
  'dialog_background_hollow_2': { url: new URL('./assets/external-server/dialog_background_hollow_2.png', import.meta.url).href, width: 18, height: 67, metadata: {"nineslice_size":[8,23,8,42],"base_size":[18,67]} },
  'edit_box_indent': { url: new URL('./assets/external-server/edit_box_indent.png', import.meta.url).href, width: 6, height: 6, metadata: {"nineslice_size":2,"base_size":[6,6]} },
  'edit_box_indent_hover': { url: new URL('./assets/external-server/edit_box_indent_hover.png', import.meta.url).href, width: 6, height: 6, metadata: {"nineslice_size":2,"base_size":[6,6]} },
  'button_borderless_light': { url: new URL('./assets/external-server/button_borderless_light.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },
  'button_borderless_lighthover': { url: new URL('./assets/external-server/button_borderless_lighthover.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },
  'button_borderless_lightpressed': { url: new URL('./assets/external-server/button_borderless_lightpressed.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },
  'disabledButtonNoBorder': { url: new URL('./assets/external-server/disabledButtonNoBorder.png', import.meta.url).href, width: 2, height: 2, metadata: {"nineslice_size":1,"base_size":[2,2]} },
  'focus_border_white': { url: new URL('./assets/external-server/focus_border_white.png', import.meta.url).href, width: 5, height: 5, metadata: {"nineslice_size":1,"base_size":[5,5]} },
  'close_button_default': { url: new URL('./assets/external-server/close_button_default.png', import.meta.url).href, width: 15, height: 15 },
  'close_button_hover': { url: new URL('./assets/external-server/close_button_hover.png', import.meta.url).href, width: 15, height: 15 },
  'close_button_pressed': { url: new URL('./assets/external-server/close_button_pressed.png', import.meta.url).href, width: 15, height: 15 },
  'control': { url: new URL('./assets/external-server/control.png', import.meta.url).href, width: 2, height: 2, metadata: {"nineslice_size":1,"base_size":[2,2]} },
} satisfies Readonly<Record<string, ClassicSkinAsset>>);
export const externalServerAssets = Object.freeze({...sourceAssets,
  close_normal:sourceAssets.close_button_default,
  close_hover:sourceAssets.close_button_hover,
  close_pressed:sourceAssets.close_button_pressed,
});
