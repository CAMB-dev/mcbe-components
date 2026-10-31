// Whole original public sample PNGs reused from existing banks; private, not a root API.
import type { GuiImageNineSlice } from './gui-image-geometry';
import { workstationImageAssets } from './workstation-image-assets';

export interface UgcReaderTextureMetadata {
  readonly nineslice_size?: number | readonly [number, number, number, number];
  readonly base_size?: readonly [number, number];
  readonly tiled?: boolean;
}
export interface UgcReaderAsset {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly sourceSize: readonly [number, number];
  readonly rawMetadata?: UgcReaderTextureMetadata;
  readonly nineSlice?: GuiImageNineSlice;
}

export const ugcReaderAssets = Object.freeze({
  dialogHollow3: Object.freeze({ url: new URL('./assets/command-block/dialog_background_hollow_3.png', import.meta.url).href, width: 18, height: 33, sourceSize: [18, 33], rawMetadata: {"nineslice_size":[8,23,8,8],"base_size":[18,33]}, nineSlice: {"insets":[8,23,8,8],"baseSize":[18,33]} } as const),
  control: Object.freeze({ url: new URL('./assets/jigsaw/control.png', import.meta.url).href, width: 2, height: 2, sourceSize: [2, 2], rawMetadata: {"nineslice_size":1,"base_size":[2,2]}, nineSlice: {"insets":1,"baseSize":[2,2]} } as const),
  closeNormal: Object.freeze({ url: new URL('./assets/book/close_button_default.png', import.meta.url).href, width: 15, height: 15, sourceSize: [15, 15] } as const),
  closeHover: Object.freeze({ url: new URL('./assets/book/close_button_hover.png', import.meta.url).href, width: 15, height: 15, sourceSize: [15, 15] } as const),
  closePressed: Object.freeze({ url: new URL('./assets/book/close_button_pressed.png', import.meta.url).href, width: 15, height: 15, sourceSize: [15, 15] } as const),
  darkNormal: Object.freeze({ url: new URL('./assets/player-permissions/button_borderless_dark.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], rawMetadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} } as const),
  darkHover: Object.freeze({ url: new URL('./assets/player-permissions/button_borderless_darkhover.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], rawMetadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} } as const),
  darkPressed: Object.freeze({ url: new URL('./assets/player-permissions/button_borderless_darkpressed.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], rawMetadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} } as const),
  buttonDisabled: Object.freeze({ url: new URL('./assets/document-viewer/disabledButtonNoBorder.png', import.meta.url).href, width: 2, height: 2, sourceSize: [2, 2], rawMetadata: {"nineslice_size":1,"base_size":[2,2]}, nineSlice: {"insets":1,"baseSize":[2,2]} } as const),
  focusWhite: Object.freeze({ url: new URL('./assets/document-viewer/focus_border_white.png', import.meta.url).href, width: 5, height: 5, sourceSize: [5, 5], rawMetadata: {"nineslice_size":1,"base_size":[5,5]}, nineSlice: {"insets":1,"baseSize":[5,5]} } as const),
  editNormal: Object.freeze({ url: workstationImageAssets.editBox.url, width: 6, height: 6, sourceSize: [6, 6], rawMetadata: {"nineslice_size":2,"base_size":[6,6]}, nineSlice: {"insets":2,"baseSize":[6,6]} } as const),
  editHover: Object.freeze({ url: workstationImageAssets.editBoxHover.url, width: 6, height: 6, sourceSize: [6, 6], rawMetadata: {"nineslice_size":2,"base_size":[6,6]}, nineSlice: {"insets":2,"baseSize":[6,6]} } as const),
  search: Object.freeze({ url: new URL('./assets/gui-icons/search.png', import.meta.url).href, width: 16, height: 16, sourceSize: [16, 16] } as const),
  scrollTrack: Object.freeze({ url: new URL('./assets/document-viewer/ScrollRail.png', import.meta.url).href, width: 1, height: 1, sourceSize: [1, 1], rawMetadata: {"nineslice_size":1,"base_size":[1,1]} } as const),
  scrollThumb: Object.freeze({ url: new URL('./assets/document-viewer/ScrollHandle.png', import.meta.url).href, width: 3, height: 5, sourceSize: [3, 5], rawMetadata: {"nineslice_size":[1,2,1,2],"base_size":[3,5]}, nineSlice: {"insets":[1,2,1,2],"baseSize":[3,5]} } as const),
  touchScrollThumb: Object.freeze({ url: new URL('./assets/document-viewer/touchScrollBox.png', import.meta.url).href, width: 1, height: 1, sourceSize: [1, 1], rawMetadata: {"nineslice_size":1,"base_size":[1,1]} } as const),
  reader: Object.freeze({ url: new URL('./assets/npc/immersive_reader.png', import.meta.url).href, width: 19, height: 19, sourceSize: [19, 19] } as const),
  screenBackground: Object.freeze({ url: new URL('./assets/player-permissions/screen_background.png', import.meta.url).href, width: 1, height: 1, sourceSize: [1, 1], rawMetadata: {"nineslice_size":0,"base_size":[1,1]}, nineSlice: {"insets":0,"baseSize":[1,1]} } as const),
  lightNormal: Object.freeze({ url: new URL('./assets/document-viewer/button_borderless_light.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], rawMetadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} } as const),
  lightHover: Object.freeze({ url: new URL('./assets/document-viewer/button_borderless_lighthover.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], rawMetadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} } as const),
  lightPressed: Object.freeze({ url: new URL('./assets/document-viewer/button_borderless_lightpressed.png', import.meta.url).href, width: 4, height: 4, sourceSize: [4, 4], rawMetadata: {"nineslice_size":1,"base_size":[4,4]}, nineSlice: {"insets":1,"baseSize":[4,4]} } as const),
} as const satisfies Readonly<Record<string, UgcReaderAsset>>);

export const ugcAssets = Object.freeze({
  dialogHollow3: ugcReaderAssets.dialogHollow3,
  control: ugcReaderAssets.control,
  closeNormal: ugcReaderAssets.closeNormal,
  closeHover: ugcReaderAssets.closeHover,
  closePressed: ugcReaderAssets.closePressed,
  darkNormal: ugcReaderAssets.darkNormal,
  darkHover: ugcReaderAssets.darkHover,
  darkPressed: ugcReaderAssets.darkPressed,
  buttonDisabled: ugcReaderAssets.buttonDisabled,
  focusWhite: ugcReaderAssets.focusWhite,
  editNormal: ugcReaderAssets.editNormal,
  editHover: ugcReaderAssets.editHover,
  search: ugcReaderAssets.search,
  scrollTrack: ugcReaderAssets.scrollTrack,
  scrollThumb: ugcReaderAssets.scrollThumb,
  touchScrollThumb: ugcReaderAssets.touchScrollThumb,
  screenBackground: ugcReaderAssets.screenBackground,
});

export const immersiveReaderAssets = Object.freeze({
  dialogHollow3: ugcReaderAssets.dialogHollow3,
  control: ugcReaderAssets.control,
  buttonDisabled: ugcReaderAssets.buttonDisabled,
  focusWhite: ugcReaderAssets.focusWhite,
  reader: ugcReaderAssets.reader,
  screenBackground: ugcReaderAssets.screenBackground,
  lightNormal: ugcReaderAssets.lightNormal,
  lightHover: ugcReaderAssets.lightHover,
  lightPressed: ugcReaderAssets.lightPressed,
});
