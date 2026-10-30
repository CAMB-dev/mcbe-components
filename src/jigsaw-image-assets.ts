// Complete original v1.26.60.5 PNG bytes; no re-encoding or captured artwork.
// See docs/jigsaw-assets.json, assets/jigsaw/LICENSE.md and assets/Minecraft-Sample-LICENSE.md.
// Nine-slice insets retain source logical LTRB order and original base sizes.
import type { GuiImageNineSlice } from './gui-image-geometry';
export const jigsawImageAssets = {
  StoreTopBar: { url: new URL('./assets/jigsaw/StoreTopBar.png', import.meta.url).href, sourceSize: [3, 5], nineSlice: {"insets": [1, 0, 1, 4], "baseSize": [3, 5]} },
  chevron_left: { url: new URL('./assets/jigsaw/chevron_left.png', import.meta.url).href, sourceSize: [4, 7] },
  dialog_background_hollow_4: { url: new URL('./assets/jigsaw/dialog_background_hollow_4.png', import.meta.url).href, sourceSize: [18, 18], nineSlice: {"insets": 8, "baseSize": [18, 18]} },
  control: { url: new URL('./assets/jigsaw/control.png', import.meta.url).href, sourceSize: [2, 2], nineSlice: {"insets": 1, "baseSize": [2, 2]} },
} as const satisfies Record<string, { url: string; sourceSize: readonly [number, number]; nineSlice?: GuiImageNineSlice }>;
