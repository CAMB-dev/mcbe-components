declare module 'virtual:mcbeui-game-font' {
  export const hasGameFont: boolean;
  export const hasClassicFonts: boolean;
  export const runeAtlasUrl: string | undefined;
  export const hasHBUITenFont: boolean;
  export const hasHBUISevenFont: boolean;
  export const hasHBUIChineseFont: boolean;
  export const hasHBUIFont: boolean;
  export const hbuiLoadingIndicatorUrl: string | undefined;
  export const orePermissionRoleImages: Record<'visitor' | 'member' | 'operator' | 'custom', string> | undefined;
  export const orePermissionAssets: Record<'avatar' | 'back' | 'backDisabled' | 'close' | 'check' | 'chevron' | 'switchOn' | 'switchOff' | 'onlineBadge', string> | undefined;
  export const nativeBitmapFont: import('../src/bitmap-text').BitmapFont | undefined;
  export const nativeGuiGrindstoneFont: import('../src/gui-text-geometry').GuiTextFont | undefined;
  export const nativeGuiAnvilLabels: import('../src/gui-text-geometry').GuiTextFont | undefined;
  export const nativeGuiAnvilUnicode: import('../src/gui-text-geometry').GuiTextFont | undefined;
  export const nativeGuiAnvilAscii: import('../src/gui-text-geometry').GuiTextFont | undefined;
  export const nativeGuiAnvilCosts: import('../src/gui-text-geometry').GuiTextFont | undefined;
  export const nativeGuiCraftingLabels: import('../src/gui-text-geometry').GuiTextFont | null;
  export const nativeWorkstationFonts: {
    labels: import('../src/bitmap-text').BitmapFont;
    costs: import('../src/bitmap-text').BitmapFont;
  } | undefined;
  export const nativeGuiWorkstationFonts: {
    labels: import('../src/gui-text-geometry').GuiTextFont;
    runes: import('../src/gui-text-geometry').GuiTextFont;
    costs: import('../src/gui-text-geometry').GuiTextFont;
  } | undefined;
}
