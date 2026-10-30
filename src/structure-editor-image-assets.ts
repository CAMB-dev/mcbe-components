// Complete original Rotate PNG; tint and display geometry remain separate.
// See docs/structure-editor-assets.json, assets/structure-editor/LICENSE.md
// and assets/Minecraft-Sample-LICENSE.md. No original companion metadata exists.
import type { GuiImageNineSlice } from './gui-image-geometry';
export const structureEditorImageAssets = {
  Rotate: { url: new URL('./assets/structure-editor/Rotate.png', import.meta.url).href, sourceSize: [45, 7] },
} as const satisfies Record<string, { url: string; sourceSize: readonly [number, number]; nineSlice?: GuiImageNineSlice }>;
