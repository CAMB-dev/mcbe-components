import type { GuiTextFont } from '../src/gui-text-geometry';
import type { CraftingScreenImageRenderProfile } from '../src/crafting-screen';

// Test-only project-owned synthetic RGBA page, reused byte-for-byte from
// enchanting-combined-layer-fixture.tsx. No Minecraft/private glyph is copied.
// The programmatic ASCII cells and metrics exercise client contracts only;
// this is neither a gallery font nor native typography certification.
export const craftingContractPage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAACe0lEQVR4Ae3Bi40UUAwEME+0/bc8IIHE73gNJHba+q7egnoL6i2ot6DegnoLiqDegnoL6i2ot6DegnoLiqDegvrCOKuNs9o4q42z2jirjbPaOKuNs9o4q42z2jirpa2z1zirjbPaOKt9UAT1FtRbUG9BvQX1FhRBvQX1FtRbUG9BvQX1FhRBvQX1FtRfxlltnNXGWW2c1cZZbZzVxlltnNXGWW2c1cZZLW2dvcZZbZzVxlntg/ohqLeg3oJ6C+otKIJ6C+otqLeg3oJ6C+otKIJ6C+otqLegfjPOauOsNs5q46w2zmrjrDbOauOsNs5q46w2zmpp6+w1zmrjrDbOah/UL0G9BfUW1FtQBPUW1FtQb0G9BfUW1FtQBPUW1FtQb0G9BfXTOKuNs9o4q42z2jirjbPaOKuNs9o4q42z2jirpa2z1zirjbPaOKt9UH8K6i2ot6AI6i2ot6DegnoL6i2ot6AI6i2ot6DegnoL6i2o78ZZbZzVxlltnNXGWW2c1cZZbZzVxlltnNXGWS1tnb3GWW2c1cZZ7YP6V1BvQRHUW1BvQb0F9RbUW1BvQRHUW1BvQb0F9RbUW1BvQcdZbZzVxlltnNXGWW2c1cZZbZzVxlltnNXGWS1tnb3GWW2c1cZZ7YP6WlAE9RbUW1BvQb0F9RbUW1AE9RbUW1BvQb0F9RbUW1AE9R/jrDbOauOsNs5q46w2zmrjrDbOauOsNs5q46yWts5e46w2zmrjrPbxQ70F9RbUW1BvQb0F9RYUQb0F9RbUW1BvQb0F9RYUQb0F9YVxVhtntXFWG2e1cVYbZ7VxVhtntXFWG2e1cVZLW2evcVYbZ7VxVvsGk2Wh43wOjwsAAAAASUVORK5CYII=';

export function craftingContractFont(url = craftingContractPage): GuiTextFont {
  return { pages: [url], pageSizes: [128], cellHeight: 12, lineHeight: 12,
    glyphs: Object.fromEntries(Array.from({ length: 95 }, (_, index) => [String.fromCharCode(index + 32),
      { page: 0, x: index % 16 * 8, y: Math.floor(index / 16) * 16, width: 8, height: 12, advance: 6, offsetY: -3 }])) };
}

/** Explicit synthetic GUI2 fixture profile, not a recovered game preset. */
export function craftingClientProfile() {
  const label = () => ({ font: craftingContractFont(), fontScale: 1, sampling: 'point' as const, shader: 'bitmap' as const,
    metrics: { lineHeight: 10, paintOffset: [0, 1] as const } });
  const count = () => ({ ...label(), metrics: { lineHeight: 8, paintOffset: [0, 0] as const } });
  return { frame: { width: 1280, height: 720, guiScale: 2 }, origin: [32, 48] as [number, number], displayScale: 1,
    imagePhysicalPrecision: 'float32' as const, itemImages: true as boolean, itemModels: true as boolean,
    text: { crafting: label(), inventory: label(), recipeTitle: label(),
      query: { ...label(), clipQuantization: 'logical-stage-floor' as const },
      placeholder: { ...label(), clipQuantization: 'logical-stage-floor' as const },
      inventoryCount: count(), recipeCount: count() } } satisfies CraftingScreenImageRenderProfile;
}
