// Whole original fixed v1.26.60.5 images; no crops or image re-encoding.
// Private registry; metadata is logical LTRB, not CSS TRBL.
import type { GuiImageNineSlice } from './gui-image-geometry';
export const emoteWheelAssets = {
  wheelBase: { url: new URL('./assets/emote-wheel/emote_wheel_updated_base.png', import.meta.url).href, width: 143, height: 143, sourceSize: [143, 143] },
  wheelSelect0: { url: new URL('./assets/emote-wheel/emote_wheel_updated_select_0.png', import.meta.url).href, width: 143, height: 143, sourceSize: [143, 143] },
  wheelSelect1: { url: new URL('./assets/emote-wheel/emote_wheel_updated_select_1.png', import.meta.url).href, width: 143, height: 143, sourceSize: [143, 143] },
  wheelSelect2: { url: new URL('./assets/emote-wheel/emote_wheel_updated_select_2.png', import.meta.url).href, width: 143, height: 143, sourceSize: [143, 143] },
  wheelSelect3: { url: new URL('./assets/emote-wheel/emote_wheel_updated_select_3.png', import.meta.url).href, width: 143, height: 143, sourceSize: [143, 143] },
  iconNone: { url: new URL('./assets/emote-wheel/icon_none.png', import.meta.url).href, width: 14, height: 14, sourceSize: [14, 14] },
  black: { url: new URL('./assets/emote-wheel/Black.png', import.meta.url).href, width: 2, height: 2, sourceSize: [2, 2], nineSlice: {"insets": 1, "baseSize": [2, 2]} },
  keyboardTooltip: { url: new URL('./assets/emote-wheel/keyboard_tooltip_icon.png', import.meta.url).href, width: 17, height: 17, sourceSize: [17, 17], nineSlice: {"insets": [5, 3, 5, 7], "baseSize": [17, 17]} },
  gamepadPlaceholder: { url: new URL('./assets/emote-wheel/grey_gamepad_icon_button.png', import.meta.url).href, width: 15, height: 13, sourceSize: [15, 13] },
  buttonLight: { url: new URL('./assets/emote-wheel/button_borderless_light.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], nineSlice: {"insets": 1, "baseSize": [4, 4]} },
  buttonLightHover: { url: new URL('./assets/emote-wheel/button_borderless_lighthover.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], nineSlice: {"insets": 1, "baseSize": [4, 4]} },
  buttonLightPressed: { url: new URL('./assets/emote-wheel/button_borderless_lightpressed.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], nineSlice: {"insets": 1, "baseSize": [4, 4]} },
  buttonLightDisabled: { url: new URL('./assets/emote-wheel/disabledButtonNoBorder.png', import.meta.url).href, width: 2, height: 2, sourceSize: [2, 2], nineSlice: {"insets": 1, "baseSize": [2, 2]} },
  focusWhite: { url: new URL('./assets/emote-wheel/focus_border_white.png', import.meta.url).href, width: 5, height: 5, sourceSize: [5, 5], nineSlice: {"insets": 1, "baseSize": [5, 5]} },
} as const satisfies Record<string, { url: string; width: number; height: number; sourceSize: readonly [number, number]; nineSlice?: GuiImageNineSlice }>;
