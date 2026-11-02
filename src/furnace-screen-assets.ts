import type { ClassicSkinAsset } from './classic-skin';
/** Private complete originals from Bedrock Samples v1.26.60.5.
 * Archive SHA256 d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf.
 * No companion JSON/nineslice metadata exists for these seven exact stems.
 * Installed vanilla texture archives were independently compared byte for byte. */
export const furnaceScreenAssets = Object.freeze({
  'furnace_toggle_off': { url: new URL('./assets/furnace-screen/furnace_toggle_off.png', import.meta.url).href, width: 27, height: 15 },
  'furnace_toggle_on': { url: new URL('./assets/furnace-screen/furnace_toggle_on.png', import.meta.url).href, width: 27, height: 15 },
  'furnace_toggle_off_hover': { url: new URL('./assets/furnace-screen/furnace_toggle_off_hover.png', import.meta.url).href, width: 27, height: 15 },
  'furnace_toggle_on_hover': { url: new URL('./assets/furnace-screen/furnace_toggle_on_hover.png', import.meta.url).href, width: 27, height: 15 },
  'category_icon_food': { url: new URL('./assets/furnace-screen/category_icon_food.png', import.meta.url).href, width: 13, height: 14 },
  'category_icon_items': { url: new URL('./assets/furnace-screen/category_icon_items.png', import.meta.url).href, width: 16, height: 12 },
  'category_icon_blocks': { url: new URL('./assets/furnace-screen/category_icon_blocks.png', import.meta.url).href, width: 16, height: 17 },
} satisfies Readonly<Record<string, ClassicSkinAsset>>);
