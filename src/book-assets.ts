// Complete original Book images. See docs/book-assets.json and assets/book/LICENSE.md.
// Raw Classic metadata is retained; it is not a physical-PNG nine-slice contract.
export interface BookTextureMetadata {
  readonly nineslice_size: number | readonly [number, number, number, number];
  readonly base_size: readonly [number, number];
  readonly tiled?: boolean;
}
export interface BookAsset {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly metadata?: BookTextureMetadata;
}

export const bookAssets = {
  'book_addtextpage_default': { url: new URL('./assets/book/book_addtextpage_default.png', import.meta.url).href, width: 16, height: 16 },
  'book_addtextpage_hover': { url: new URL('./assets/book/book_addtextpage_hover.png', import.meta.url).href, width: 16, height: 16 },
  'book_addtextpage_pressed': { url: new URL('./assets/book/book_addtextpage_pressed.png', import.meta.url).href, width: 16, height: 16 },
  'book_back': { url: new URL('./assets/book/book_back.png', import.meta.url).href, width: 28, height: 28, metadata: {"nineslice_size": 14, "base_size": [28, 28]} },
  'book_cover': { url: new URL('./assets/book/book_cover.png', import.meta.url).href, width: 28, height: 28, metadata: {"nineslice_size": 14, "base_size": [28, 28]} },
  'book_edit_default': { url: new URL('./assets/book/book_edit_default.png', import.meta.url).href, width: 18, height: 16 },
  'book_edit_hover': { url: new URL('./assets/book/book_edit_hover.png', import.meta.url).href, width: 18, height: 16 },
  'book_edit_pressed': { url: new URL('./assets/book/book_edit_pressed.png', import.meta.url).href, width: 18, height: 16 },
  'book_pagecrease_left': { url: new URL('./assets/book/book_pagecrease_left.png', import.meta.url).href, width: 110, height: 14, metadata: {"nineslice_size": 7, "tiled": true, "base_size": [110, 14]} },
  'book_pagecrease_right': { url: new URL('./assets/book/book_pagecrease_right.png', import.meta.url).href, width: 110, height: 14, metadata: {"nineslice_size": 7, "tiled": true, "base_size": [110, 14]} },
  'book_pageedge_left': { url: new URL('./assets/book/book_pageedge_left.png', import.meta.url).href, width: 40, height: 120, metadata: {"nineslice_size": [40, 40, 0, 40], "tiled": true, "base_size": [40, 120]} },
  'book_pageedge_right': { url: new URL('./assets/book/book_pageedge_right.png', import.meta.url).href, width: 40, height: 120, metadata: {"nineslice_size": [0, 40, 40, 40], "tiled": true, "base_size": [40, 120]} },
  'book_pageleft_default': { url: new URL('./assets/book/book_pageleft_default.png', import.meta.url).href, width: 24, height: 24 },
  'book_pageleft_hover': { url: new URL('./assets/book/book_pageleft_hover.png', import.meta.url).href, width: 24, height: 24 },
  'book_pageleft_pressed': { url: new URL('./assets/book/book_pageleft_pressed.png', import.meta.url).href, width: 24, height: 24 },
  'book_pageright_default': { url: new URL('./assets/book/book_pageright_default.png', import.meta.url).href, width: 24, height: 24 },
  'book_pageright_hover': { url: new URL('./assets/book/book_pageright_hover.png', import.meta.url).href, width: 24, height: 24 },
  'book_pageright_pressed': { url: new URL('./assets/book/book_pageright_pressed.png', import.meta.url).href, width: 24, height: 24 },
  'book_shiftleft_default': { url: new URL('./assets/book/book_shiftleft_default.png', import.meta.url).href, width: 23, height: 16 },
  'book_shiftleft_hover': { url: new URL('./assets/book/book_shiftleft_hover.png', import.meta.url).href, width: 23, height: 16 },
  'book_shiftleft_pressed': { url: new URL('./assets/book/book_shiftleft_pressed.png', import.meta.url).href, width: 23, height: 16 },
  'book_shiftright_default': { url: new URL('./assets/book/book_shiftright_default.png', import.meta.url).href, width: 23, height: 16 },
  'book_shiftright_hover': { url: new URL('./assets/book/book_shiftright_hover.png', import.meta.url).href, width: 23, height: 16 },
  'book_shiftright_pressed': { url: new URL('./assets/book/book_shiftright_pressed.png', import.meta.url).href, width: 23, height: 16 },
  'book_spine': { url: new URL('./assets/book/book_spine.png', import.meta.url).href, width: 8, height: 1, metadata: {"nineslice_size": [4, 1, 4, 1], "base_size": [8, 2]} },
  'book_texteditbox_hover': { url: new URL('./assets/book/book_texteditbox_hover.png', import.meta.url).href, width: 4, height: 4, metadata: {"nineslice_size": 1, "base_size": [4, 4]} },
  'book_trash_default': { url: new URL('./assets/book/book_trash_default.png', import.meta.url).href, width: 16, height: 16 },
  'close_button_default': { url: new URL('./assets/book/close_button_default.png', import.meta.url).href, width: 15, height: 15 },
  'close_button_hover': { url: new URL('./assets/book/close_button_hover.png', import.meta.url).href, width: 15, height: 15 },
  'close_button_pressed': { url: new URL('./assets/book/close_button_pressed.png', import.meta.url).href, width: 15, height: 15 },
  'trash_hover': { url: new URL('./assets/book/trash_hover.png', import.meta.url).href, width: 16, height: 16 },
  'trash_pressed': { url: new URL('./assets/book/trash_pressed.png', import.meta.url).href, width: 16, height: 16 },
} as const satisfies Readonly<Record<string, BookAsset>>;

export type BookAssetKey = keyof typeof bookAssets;
