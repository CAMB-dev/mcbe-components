// Complete original divider and above/below tooltip chevrons; conditional branches only.
// Raw nineslice1/base1x1 exceeds physical dimensions: stretch the whole pixel,
// do not interpret metadata as a physical2px border. No image re-encoding.
// See docs/server-form-assets.json and assets/server-forms/LICENSE.md.
export const serverFormImageAssets = {
  list_item_divider_line_light: { url: new URL('./assets/server-forms/list_item_divider_line_light.png', import.meta.url).href, sourceSize: [1, 1], metadata: {"nineslice_size": 1, "base_size": [1, 1]} },
  tooltip_default_chevron: { url: new URL('./assets/server-forms/tooltip_default_chevron.png', import.meta.url).href, sourceSize: [19, 13] },
  tooltip_inverted_chevron: { url: new URL('./assets/server-forms/tooltip_inverted_chevron.png', import.meta.url).href, sourceSize: [19, 13] },
} as const;
