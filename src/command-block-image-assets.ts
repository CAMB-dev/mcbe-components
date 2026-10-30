// Complete original v1.26.60.5 PNG bytes; private source registry.
// See docs/command-block-assets.json, assets/command-block/LICENSE.md and assets/Minecraft-Sample-LICENSE.md.
// Original logical LTRB cuts/base sizes; no re-encoding or captured artwork.
import type { GuiImageNineSlice } from './gui-image-geometry';
export const commandBlockImageAssets = {
  dialog_background_hollow_3: { url: new URL('./assets/command-block/dialog_background_hollow_3.png', import.meta.url).href, sourceSize: [18, 33], nineSlice: {"insets": [8, 23, 8, 8], "baseSize": [18, 33]} },
  dialog_divider: { url: new URL('./assets/command-block/dialog_divider.png', import.meta.url).href, sourceSize: [3, 1], nineSlice: {"insets": [1, 0, 1, 0], "baseSize": [3, 1]} },
  minimize: { url: new URL('./assets/command-block/minimize.png', import.meta.url).href, sourceSize: [16, 16] },
  minimizeHover: { url: new URL('./assets/command-block/minimizeHover.png', import.meta.url).href, sourceSize: [16, 16] },
  minimizePress: { url: new URL('./assets/command-block/minimizePress.png', import.meta.url).href, sourceSize: [16, 16] },
  arrowRight: { url: new URL('./assets/command-block/arrowRight.png', import.meta.url).href, sourceSize: [8, 8] },
} as const satisfies Record<string, { url: string; sourceSize: readonly [number, number]; nineSlice?: GuiImageNineSlice }>;
