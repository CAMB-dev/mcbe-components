/** Private whole-value route shared by native text surfaces. The Han trigger
 * is a bounded candidate supported by the observed mixed Book/Sign strings;
 * it is not the recovered engine selector or a glyph-advance algorithm. */
export type ClassicInputFontMode = 'auto' | 'latin' | 'unicode';
export type ClassicInputFontRole = 'latin' | 'unicode';

export function resolveClassicInputFont(mode: ClassicInputFontMode, text: string): ClassicInputFontRole {
  if (mode === 'auto') return /\p{Script=Han}/u.test(text) ? 'unicode' : 'latin';
  if (mode === 'latin' || mode === 'unicode') return mode;
  throw new RangeError('Unknown Classic input font mode.');
}

export function classicInputFontFamily(role: ClassicInputFontRole): string {
  return role === 'unicode'
    ? 'var(--mc-font-unicode,"MCBE CJK","Fusion Pixel",monospace)'
    : 'var(--mc-font,monospace)';
}
