// Complete original Portfolio materials. Private, not a root API.
// Raw metadata is source evidence; book_spine base8x2 differs from its8x1 PNG.
import { ugcReaderAssets } from './ugc-reader-assets';

export interface PortfolioTextureMetadata {
  readonly nineslice_size: number | readonly [number, number, number, number];
  readonly base_size: readonly [number, number];
  readonly tiled?: boolean;
}
export interface PortfolioAsset {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly metadata?: PortfolioTextureMetadata;
}

export const portfolioAssets = Object.freeze({
  'book_binding': { url: new URL('./assets/portfolio/book_binding.png', import.meta.url).href, width: 5, height: 2, metadata: {"nineslice_size":[0,0,0,1],"base_size":[5,2]} },
  'book_frame': { url: new URL('./assets/portfolio/book_frame.png', import.meta.url).href, width: 42, height: 42, metadata: {"nineslice_size":21,"base_size":[42,42]} },
  'book_spine': { url: new URL('./assets/book/book_spine.png', import.meta.url).href, width: 8, height: 1, metadata: {"nineslice_size":[4,1,4,1],"base_size":[8,2]} },
  'book_trash_default': { url: new URL('./assets/book/book_trash_default.png', import.meta.url).href, width: 16, height: 16 },
  'close_button_default': { url: new URL('./assets/book/close_button_default.png', import.meta.url).href, width: 15, height: 15 },
  'close_button_hover': { url: new URL('./assets/book/close_button_hover.png', import.meta.url).href, width: 15, height: 15 },
  'close_button_pressed': { url: new URL('./assets/book/close_button_pressed.png', import.meta.url).href, width: 15, height: 15 },
  'photo_corner_bl': { url: new URL('./assets/portfolio/photo_corner_bl.png', import.meta.url).href, width: 19, height: 19 },
  'photo_corner_br': { url: new URL('./assets/portfolio/photo_corner_br.png', import.meta.url).href, width: 19, height: 19 },
  'photo_corner_tl': { url: new URL('./assets/portfolio/photo_corner_tl.png', import.meta.url).href, width: 19, height: 19 },
  'photo_corner_tr': { url: new URL('./assets/portfolio/photo_corner_tr.png', import.meta.url).href, width: 19, height: 19 },
  'trash_hover': { url: new URL('./assets/book/trash_hover.png', import.meta.url).href, width: 16, height: 16 },
  'trash_pressed': { url: new URL('./assets/book/trash_pressed.png', import.meta.url).href, width: 16, height: 16 },
  'button_borderless_light': { url: new URL('./assets/document-viewer/button_borderless_light.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },
  'button_borderless_lighthover': { url: new URL('./assets/document-viewer/button_borderless_lighthover.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },
  'button_borderless_lightpressed': { url: new URL('./assets/document-viewer/button_borderless_lightpressed.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size":1,"base_size":[4,4]} },
  'disabledButtonNoBorder': { url: new URL('./assets/document-viewer/disabledButtonNoBorder.png', import.meta.url).href, width: 2, height: 2, metadata: {"nineslice_size":1,"base_size":[2,2]} },
  'focus_border_white': { url: new URL('./assets/document-viewer/focus_border_white.png', import.meta.url).href, width: 5, height: 5, metadata: {"nineslice_size":1,"base_size":[5,5]} },
  'immersive_reader': { url: new URL('./assets/npc/immersive_reader.png', import.meta.url).href, width: 19, height: 19 },
  'edit_box_indent': { url: ugcReaderAssets.editNormal.url, width: 6, height: 6, metadata: {"nineslice_size":2,"base_size":[6,6]} },
  'ScrollRail': { url: new URL('./assets/document-viewer/ScrollRail.png', import.meta.url).href, width: 1, height: 1, metadata: {"nineslice_size":1,"base_size":[1,1]} },
  'ScrollHandle': { url: new URL('./assets/document-viewer/ScrollHandle.png', import.meta.url).href, width: 3, height: 5, metadata: {"nineslice_size":[1,2,1,2],"base_size":[3,5]} },
  'touchScrollBox': { url: new URL('./assets/document-viewer/touchScrollBox.png', import.meta.url).href, width: 1, height: 1, metadata: {"nineslice_size":1,"base_size":[1,1]} },
} as const satisfies Readonly<Record<string, PortfolioAsset>>);
