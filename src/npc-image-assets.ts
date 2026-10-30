// Complete original images for reachable NPC interaction/editor branches.
// See docs/npc-assets.json and assets/npc/LICENSE.md. Portraits remain host3D slots.
import type { GuiImageNineSlice } from './gui-image-geometry';
export const npcImageAssets = {
  back_button_default: { url: new URL('./assets/npc/back_button_default.png', import.meta.url).href, sourceSize: [15, 15] },
  back_button_hover: { url: new URL('./assets/npc/back_button_hover.png', import.meta.url).href, sourceSize: [15, 15] },
  back_button_pressed: { url: new URL('./assets/npc/back_button_pressed.png', import.meta.url).href, sourceSize: [15, 15] },
  dialog_bubble: { url: new URL('./assets/npc/dialog_bubble.png', import.meta.url).href, sourceSize: [17, 18], nineSlice: {"insets": [8, 7, 6, 6], "baseSize": [17, 18]} },
  dialog_bubble_point: { url: new URL('./assets/npc/dialog_bubble_point.png', import.meta.url).href, sourceSize: [16, 18] },
  trash_default: { url: new URL('./assets/npc/trash_default.png', import.meta.url).href, sourceSize: [16, 16] },
  background_indent_no_top: { url: new URL('./assets/npc/background_indent_no_top.png', import.meta.url).href, sourceSize: [3, 2], nineSlice: {"insets": [1, 0, 1, 1], "baseSize": [3, 2]} },
  immersive_reader: { url: new URL('./assets/npc/immersive_reader.png', import.meta.url).href, sourceSize: [19, 19] },
  toggle_on: { url: new URL('./assets/npc/toggle_on.png', import.meta.url).href, sourceSize: [30, 16] },
  toggle_on_hover: { url: new URL('./assets/npc/toggle_on_hover.png', import.meta.url).href, sourceSize: [30, 16] },
} as const satisfies Record<string, { url: string; sourceSize: readonly [number, number]; nineSlice?: GuiImageNineSlice }>;
