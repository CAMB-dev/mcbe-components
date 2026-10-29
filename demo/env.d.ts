declare module 'virtual:mcbeui-game-font' {
  export const hasGameFont: boolean;
  export const runeAtlasUrl: string | undefined;
  export const hasHBUITenFont: boolean;
  export const hasHBUISevenFont: boolean;
  export const hasHBUIChineseFont: boolean;
  export const hasHBUIFont: boolean;
  export const hbuiLoadingIndicatorUrl: string | undefined;
  export const nativeBitmapFont: import('../src/bitmap-text').BitmapFont | undefined;
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
