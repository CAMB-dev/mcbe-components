// Complete unchanged public Storage originals; private registry, never a root export.
// CSS-only source PNG bodies are repeated verbatim for typed URLs; see docs/storage-assets.json.
import type { GuiImageNineSlice } from './gui-image-geometry';
import { workstationImageAssets } from './workstation-image-assets';
export interface StorageTextureMetadata { readonly nineslice_size?: number | readonly [number, number, number, number]; readonly base_size?: readonly [number, number]; readonly tiled?: boolean; }
export interface StorageAsset { readonly url: string; readonly width: number; readonly height: number; readonly sourceSize: readonly [number, number]; readonly displaySize?: readonly [number, number]; readonly metadata?: StorageTextureMetadata; readonly nineSlice?: GuiImageNineSlice; }
const embeddedPngUrls = {
  defaultIndent: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAAklEQVR4AewaftIAAAAxSURBVGOUlpL5z4AEXG3MGFgYgEBfQ5kBBgxMzRiYGLAAJgYsgMXVxozBwNSMARkAACqjBHzhCw3iAAAAAElFTkSuQmCC',
  progressEmpty: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAAFCAYAAACeuGYRAAAAe0lEQVQYV52PMQrCQBRE9wSiphAiiE32ZzcSXEUJMWlSe//rPJ1f2MdiGWbmDZ8NQNjstqx4wQd2T9ijJY1GWXrK1BOvnau8cvXixPuoOtccmiOXxchzZn4P7E+1q7xy9eJ+o3hLxJKxZ0P3+kJD65ek8srVi/PRP3/6AKAYWXwIltdnAAAAAElFTkSuQmCC',
  progressFull: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAAFCAYAAACeuGYRAAAALklEQVQYV2PgExRgAOL/JGAGsIaS5V5EY5B6sKZ176qIxnBNmTOcicYwTST7CQCZ4XbZ8FznjQAAAABJRU5ErkJggg==',
  progressNub: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAAFCAYAAACTphZWAAAAZ0lEQVQI12PgExT4TyxmsCjgFtOIYNAD0s7ZqyydLQt54nQNNP6DaBAfJA6VF2MAMkTMcrmMW/aFOrec8vYC0pkgxSAayncGyYPUgRUDdYE4NqHdms4hXRpgxSAaxAeJQ+VFGEhxMwB5jkDp5O6JCwAAAABJRU5ErkJggg==',
  loadingBar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAoAAAAAICAYAAABpsU6/AAAABGdBTUEAALGPC/xhBQAAAPpJREFUeNrt20EOgjAQBVCa9P5XRo0rkYUSOmln3iybSPiPoS2ibX/W9lltU6/iwoULFy5cuPBK6dIB/p2TCxcTCxcuXLjwWtqlAy/fiK7nWJdsvly4mF/0C68ELl8bwNbenz++Gf5hfD+Mt4vHCR2/Mf+S4wH5p+6L4w20St8GXP8SLhf6P5XLQvP/kOOb/6Zb/0K9Zsp/dm6jXa58A+gJRX6Vpy9m608u+la/5O9f99fJZi/6PxldA8gvPxfe03tHn6c+5MIruUtfCKb6bx3kt2GW30Jyt0tWVy6xucxPC65bvSD8Xrzx5JdffguSDfN52bjUehAvnf8Ba86fI1AtGCgAAAAASUVORK5CYII=',
} as const;
export const storageAssets = {
  lightNormal: { url: new URL('./assets/document-viewer/button_borderless_light.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], metadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} },
  lightHover: { url: new URL('./assets/document-viewer/button_borderless_lighthover.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], metadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} },
  lightPressed: { url: new URL('./assets/document-viewer/button_borderless_lightpressed.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], metadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} },
  lightDisabled: { url: new URL('./assets/document-viewer/disabledButtonNoBorder.png', import.meta.url).href, width: 2, height: 2, sourceSize: [2, 2], metadata: {"nineslice_size":1,"base_size":[2,2]}, nineSlice: {"insets":1,"baseSize":[2,2]} },
  focusWhite: { url: new URL('./assets/document-viewer/focus_border_white.png', import.meta.url).href, width: 5, height: 5, sourceSize: [5, 5], metadata: {"nineslice_size":1,"base_size":[5,5]}, nineSlice: {"insets":1,"baseSize":[5,5]} },
  categoryUnchecked: { url: new URL('./assets/document-viewer/button_borderless_light.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], metadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} },
  categoryChecked: { url: new URL('./assets/document-viewer/button_borderless_lightpressednohover.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], metadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} },
  categoryUncheckedHover: { url: new URL('./assets/document-viewer/button_borderless_lighthover.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], metadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} },
  categoryCheckedHover: { url: new URL('./assets/document-viewer/button_borderless_lightpressed.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], metadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} },
  gray: { url: workstationImageAssets.anvilCostBackground.url, width: 2, height: 2, sourceSize: [2, 2], metadata: {"nineslice_size":1,"base_size":[2,2]}, nineSlice: {"insets":1,"baseSize":[2,2]} },
  black: { url: new URL('./assets/emote-wheel/Black.png', import.meta.url).href, width: 2, height: 2, sourceSize: [2, 2], metadata: {"nineslice_size":1,"base_size":[2,2]}, nineSlice: {"insets":1,"baseSize":[2,2]} },
  worldRowDark: { url: new URL('./assets/player-permissions/button_borderless_dark.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], metadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} },
  checkboxCheck: { url: new URL('./assets/player-permissions/checkbox_check.png', import.meta.url).href, width: 10, height: 10, sourceSize: [10, 10] },
  checkboxSpace: { url: new URL('./assets/player-permissions/checkbox_space.png', import.meta.url).href, width: 10, height: 10, sourceSize: [10, 10] },
  checkboxCheckHover: { url: new URL('./assets/player-permissions/checkbox_checkHover.png', import.meta.url).href, width: 10, height: 10, sourceSize: [10, 10] },
  checkboxSpaceHover: { url: new URL('./assets/player-permissions/checkbox_spaceHover.png', import.meta.url).href, width: 10, height: 10, sourceSize: [10, 10] },
  defaultIndent: { url: embeddedPngUrls.defaultIndent, width: 5, height: 5, sourceSize: [5, 5], metadata: {"nineslice_size":1,"base_size":[5,5]}, nineSlice: {"insets":1,"baseSize":[5,5]} },
  worldScreenshotFocus: { url: new URL('./assets/document-viewer/focus_border_white.png', import.meta.url).href, width: 5, height: 5, sourceSize: [5, 5], metadata: {"nineslice_size":1,"base_size":[5,5]}, nineSlice: {"insets":1,"baseSize":[5,5]} },
  arrowDown: { url: new URL('./assets/storage-management/arrowDown.png', import.meta.url).href, width: 8, height: 8, sourceSize: [8, 8] },
  arrowRight: { url: new URL('./assets/command-block/arrowRight.png', import.meta.url).href, width: 8, height: 8, sourceSize: [8, 8] },
  multiselect: { url: new URL('./assets/storage-management/multiselection.png', import.meta.url).href, width: 26, height: 21, sourceSize: [26, 21] },
  invertedMultiselect: { url: new URL('./assets/storage-management/invertedmultiselecticon.png', import.meta.url).href, width: 26, height: 21, sourceSize: [26, 21] },
  trayBanners: { url: new URL('./assets/player-permissions/Banners.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], metadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} },
  lock: { url: new URL('./assets/gui-icons/lock.png', import.meta.url).href, width: 8, height: 8, sourceSize: [8, 8] },
  warning: { url: new URL('./assets/gui-icons/warning-glyph.png', import.meta.url).href, width: 13, height: 20, sourceSize: [13, 20] },
  error: { url: new URL('./assets/gui-icons/error-glyph.png', import.meta.url).href, width: 13, height: 20, sourceSize: [13, 20] },
  updateGlyph: { url: new URL('./assets/gui-icons/update-glyph.png', import.meta.url).href, width: 13, height: 20, sourceSize: [13, 20] },
  dialogHollow2: { url: new URL('./assets/storage-management/dialog_background_hollow_2.png', import.meta.url).href, width: 18, height: 67, sourceSize: [18, 67], metadata: {"nineslice_size":[8,23,8,42],"base_size":[18,67]}, nineSlice: {"insets":[8,23,8,42],"baseSize":[18,67]} },
  control: { url: new URL('./assets/jigsaw/control.png', import.meta.url).href, width: 2, height: 2, sourceSize: [2, 2], metadata: {"nineslice_size":1,"base_size":[2,2]}, nineSlice: {"insets":1,"baseSize":[2,2]} },
  progressEmpty: { url: embeddedPngUrls.progressEmpty, width: 13, height: 5, sourceSize: [13, 5], metadata: {"nineslice_size":[6,1,6,1],"base_size":[13,5]}, nineSlice: {"insets":[6,1,6,1],"baseSize":[13,5]} },
  progressFull: { url: embeddedPngUrls.progressFull, width: 13, height: 5, sourceSize: [13, 5], metadata: {"nineslice_size":[1,0,1,0],"base_size":[13,5]}, nineSlice: {"insets":[1,0,1,0],"baseSize":[13,5]} },
  progressNub: { url: embeddedPngUrls.progressNub, width: 11, height: 5, sourceSize: [11, 5] },
  loadingBar: { url: embeddedPngUrls.loadingBar, width: 640, height: 8, sourceSize: [640, 8], metadata: {"base_size":[640,8]} },
  dropdownBackground: { url: new URL('./assets/player-permissions/dropdown_background.png', import.meta.url).href, width: 5, height: 5, sourceSize: [5, 5], metadata: {"nineslice_size":2,"base_size":[5,5]}, nineSlice: {"insets":2,"baseSize":[5,5]} },
  dropdownChevron: { url: new URL('./assets/player-permissions/dropdown_chevron.png', import.meta.url).href, width: 11, height: 11, sourceSize: [11, 11] },
  dropdownChevronHover: { url: new URL('./assets/player-permissions/chevron_white_down.png', import.meta.url).href, width: 11, height: 11, sourceSize: [11, 11] },
  radioOff: { url: new URL('./assets/player-permissions/radio_off.png', import.meta.url).href, width: 10, height: 10, sourceSize: [10, 10] },
  radioOn: { url: new URL('./assets/player-permissions/radio_on.png', import.meta.url).href, width: 10, height: 10, sourceSize: [10, 10] },
  radioOffHover: { url: new URL('./assets/player-permissions/radio_off_hover.png', import.meta.url).href, width: 10, height: 10, sourceSize: [10, 10] },
  radioOnHover: { url: new URL('./assets/player-permissions/radio_on_hover.png', import.meta.url).href, width: 10, height: 10, sourceSize: [10, 10] },
  dropdownSelectedBackground: { url: new URL('./assets/player-permissions/dropDownSelectBG.png', import.meta.url).href, width: 1, height: 1, sourceSize: [1, 1] },
  dropdownHoverBackground: { url: new URL('./assets/player-permissions/dropDownHoverBG.png', import.meta.url).href, width: 1, height: 1, sourceSize: [1, 1] },
  deleteGlyph: { url: new URL('./assets/gui-icons/trash.png', import.meta.url).href, width: 13, height: 17, sourceSize: [13, 17], displaySize: [15, 17] },
} as const satisfies Record<string, StorageAsset>;
export const storageMissingAssets = {
  "generateUpdate": {
    "texture": "textures/gui/newgui/storage/update",
    "defaultArtwork": null
  },
  "windowsShare": {
    "texture": "textures/ui/windowsshare",
    "defaultArtwork": null
  }
} as const;
