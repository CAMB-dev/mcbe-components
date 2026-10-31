// Whole unchanged public v1.26.60.5 resources; private registry, not a root export.
// Physical PNG sourceSize and declared displaySize are distinct. Raw metadata is logical LTRB.
import type { GuiImageNineSlice } from './gui-image-geometry';
export interface StartMenuTextureMetadata { readonly nineslice_size?: number | readonly [number, number, number, number]; readonly base_size?: readonly [number, number]; readonly tiled?: boolean; }
export interface StartMenuAsset { readonly url: string; readonly width: number; readonly height: number; readonly sourceSize: readonly [number, number]; readonly displaySize?: readonly [number, number]; readonly metadata?: StartMenuTextureMetadata; readonly nineSlice?: GuiImageNineSlice; }
export const startMenuAssets = {
  black: { url: new URL('./assets/emote-wheel/Black.png', import.meta.url).href, width: 2, height: 2, sourceSize: [2, 2], metadata: {"nineslice_size":1,"base_size":[2,2]}, nineSlice: {"insets":1,"baseSize":[2,2]} },
  errorGlyph: { url: new URL('./assets/gui-icons/error-glyph.png', import.meta.url).href, width: 13, height: 20, sourceSize: [13, 20], displaySize: [15, 15] },
  feedback: { url: new URL('./assets/gui-icons/feedback.png', import.meta.url).href, width: 32, height: 32, sourceSize: [32, 32], displaySize: [16, 16] },
  achievements: { url: new URL('./assets/gui-icons/achievements.png', import.meta.url).href, width: 11, height: 15, sourceSize: [11, 15], displaySize: [16, 16] },
  bellRinging: { url: new URL('./assets/start-menu/bell_ringing.png', import.meta.url).href, width: 448, height: 16, sourceSize: [448, 16], displaySize: [16, 16] },
  buttonDark: { url: new URL('./assets/player-permissions/button_borderless_dark.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], metadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} },
  buttonDarkHover: { url: new URL('./assets/player-permissions/button_borderless_darkhover.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], metadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} },
  buttonDarkPressed: { url: new URL('./assets/player-permissions/button_borderless_darkpressed.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], metadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} },
  buttonLight: { url: new URL('./assets/document-viewer/button_borderless_light.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], metadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} },
  buttonLightHover: { url: new URL('./assets/document-viewer/button_borderless_lighthover.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], metadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} },
  buttonLightPressed: { url: new URL('./assets/document-viewer/button_borderless_lightpressed.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], metadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} },
  closeDefault: { url: new URL('./assets/book/close_button_default.png', import.meta.url).href, width: 15, height: 15, sourceSize: [15, 15], displaySize: [21, 21] },
  closeHover: { url: new URL('./assets/book/close_button_hover.png', import.meta.url).href, width: 15, height: 15, sourceSize: [15, 15] },
  closePressed: { url: new URL('./assets/book/close_button_pressed.png', import.meta.url).href, width: 15, height: 15, sourceSize: [15, 15] },
  dialogHollow1: { url: new URL('./assets/start-menu/dialog_background_hollow_1.png', import.meta.url).href, width: 18, height: 101, sourceSize: [18, 101], metadata: {"nineslice_size":[8,23,8,76],"base_size":[18,101]}, nineSlice: {"insets":[8,23,8,76],"baseSize":[18,101]} },
  disabledButton: { url: new URL('./assets/start-menu/disabledButton.png', import.meta.url).href, width: 3, height: 3, sourceSize: [3, 3], metadata: {"nineslice_size":2,"base_size":[3,3]} },
  buttonDisabled: { url: new URL('./assets/document-viewer/disabledButtonNoBorder.png', import.meta.url).href, width: 2, height: 2, sourceSize: [2, 2], metadata: {"nineslice_size":1,"base_size":[2,2]}, nineSlice: {"insets":1,"baseSize":[2,2]} },
  flyout: { url: new URL('./assets/start-menu/flyout.png', import.meta.url).href, width: 21, height: 15, sourceSize: [21, 15], metadata: {"nineslice_size":[12,1,1,9],"base_size":[21,15]}, nineSlice: {"insets":[12,1,1,9],"baseSize":[21,15]} },
  focusWhite: { url: new URL('./assets/document-viewer/focus_border_white.png', import.meta.url).href, width: 5, height: 5, sourceSize: [5, 5], metadata: {"nineslice_size":1,"base_size":[5,5]}, nineSlice: {"insets":1,"baseSize":[5,5]} },
  hangar: { url: new URL('./assets/start-menu/hangar.png', import.meta.url).href, width: 32, height: 16, sourceSize: [32, 16], displaySize: [32, 16] },
  alex: { url: new URL('./assets/start-menu/icon_alex.png', import.meta.url).href, width: 24, height: 24, sourceSize: [24, 24], displaySize: [16, 16] },
  bell: { url: new URL('./assets/start-menu/icon_bell.png', import.meta.url).href, width: 16, height: 16, sourceSize: [16, 16], displaySize: [16, 16] },
  mail: { url: new URL('./assets/gui-icons/icon-mail.png', import.meta.url).href, width: 16, height: 16, sourceSize: [16, 16], displaySize: [16, 16] },
  invite: { url: new URL('./assets/start-menu/invite_base.png', import.meta.url).href, width: 20, height: 20, sourceSize: [20, 20], displaySize: [20, 20] },
  inviteNumberBackground: { url: new URL('./assets/start-menu/invite_number_background.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], metadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} },
  newOffers: { url: new URL('./assets/start-menu/newOffersIcon.png', import.meta.url).href, width: 21, height: 15, sourceSize: [21, 15], metadata: {"nineslice_size":[10,1,1,5],"base_size":[21,15]}, nineSlice: {"insets":[10,1,1,5],"baseSize":[21,15]} },
  preview: { url: new URL('./assets/start-menu/previewIcon.png', import.meta.url).href, width: 21, height: 15, sourceSize: [21, 15], metadata: {"nineslice_size":[10,1,1,5],"base_size":[21,15]}, nineSlice: {"insets":[10,1,1,5],"baseSize":[21,15]} },
  profile: { url: new URL('./assets/start-menu/profile_glyph_combined.png', import.meta.url).href, width: 11, height: 12, sourceSize: [11, 12], displaySize: [11, 12] },
  realmsDefault: { url: new URL('./assets/start-menu/realms_button_borderless_default.png', import.meta.url).href, width: 3, height: 3, sourceSize: [3, 3], metadata: {"nineslice_size":1,"base_size":[3,3]}, nineSlice: {"insets":1,"baseSize":[3,3]} },
  realmsHover: { url: new URL('./assets/start-menu/realms_button_borderless_hover.png', import.meta.url).href, width: 3, height: 3, sourceSize: [3, 3], metadata: {"nineslice_size":1,"base_size":[3,3]}, nineSlice: {"insets":1,"baseSize":[3,3]} },
  realmsPressed: { url: new URL('./assets/start-menu/realms_button_borderless_hover_pressed.png', import.meta.url).href, width: 3, height: 3, sourceSize: [3, 3], metadata: {"nineslice_size":1,"base_size":[3,3]}, nineSlice: {"insets":1,"baseSize":[3,3]} },
  redDot: { url: new URL('./assets/start-menu/red_dot.png', import.meta.url).href, width: 7, height: 8, sourceSize: [7, 8], displaySize: [7, 8] },
  saleRibbon: { url: new URL('./assets/start-menu/saleribbon.png', import.meta.url).href, width: 15, height: 15, sourceSize: [15, 15], metadata: {"nineslice_size":[5,5,6,8],"base_size":[15,15]}, nineSlice: {"insets":[5,5,6,8],"baseSize":[15,15]} },
  title: { url: new URL('./assets/start-menu/title.png', import.meta.url).href, width: 1937, height: 333, sourceSize: [1937, 333] },
  underlineFocus: { url: new URL('./assets/start-menu/underline_focus.png', import.meta.url).href, width: 1, height: 1, sourceSize: [1, 1] },
  update: { url: new URL('./assets/start-menu/update.png', import.meta.url).href, width: 11, height: 21, sourceSize: [11, 21], displaySize: [11, 21] },
  xbox: { url: new URL('./assets/start-menu/xbox4.png', import.meta.url).href, width: 27, height: 27, sourceSize: [27, 27], displaySize: [27, 27] },
} as const satisfies Record<string, StartMenuAsset>;
// No substitution for resources absent from this fixed public release.
export const startMenuMissingAssets = {
  "eduGreenTile": {
    "texture": "textures/ui/edu_green_tile",
    "reason": "not present in pinned public release"
  },
  "eduFeedback": {
    "texture": "textures/ui/feedback",
    "reason": "not present in pinned public release"
  },
  "eduFeedbackHover": {
    "texture": "textures/ui/feedback_hover",
    "reason": "not present in pinned public release"
  },
  "externalLink": {
    "texture": "textures/ui/icon_external_link",
    "reason": "not present in pinned public release"
  },
  "eduTitle": {
    "texture": "textures/ui/title_edu",
    "reason": "not present in pinned public release"
  },
  "eduPreviewTitle": {
    "texture": "textures/ui/title_edu_preview",
    "reason": "not present in pinned public release"
  }
} as const;
