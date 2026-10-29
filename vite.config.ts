import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, normalizePath } from 'vite';

// An optional font from the user's own game install. Never part of the npm library.
const rawFontPath = fileURLToPath(new URL('./.cache/local-fonts/Mojangles.ttf', import.meta.url));
const pixelFontPath = fileURLToPath(new URL('./.cache/local-fonts/Mojangles-Pixel.woff2', import.meta.url));
const fontPath = existsSync(pixelFontPath) ? pixelFontPath : rawFontPath;
const virtualFont = 'virtual:mcbeui-game-font';
const runePath = fileURLToPath(new URL('./.cache/enchanting-source/font/ascii_sga.png', import.meta.url));
const localFont = (name: string) => fileURLToPath(new URL(`./.cache/local-fonts/hbui/${name}`, import.meta.url));
const hbuiTenPath = localFont('Minecraft-Ten-v2.otf');
const hbuiSevenPath = localFont('Minecraft-Seven-v2.otf');
const hbuiChinesePath = localFont('NotoSansSC-Regular.otf');
const hbuiLoadingPath = fileURLToPath(new URL('./.cache/local-hbui-assets/loading-indicator.gif', import.meta.url));
const nativeBitmapPath = fileURLToPath(new URL('./.cache/local-fonts/unicode/font.json', import.meta.url));
const nativeWorkstationPath = fileURLToPath(new URL('./.cache/local-fonts/workstation/fonts.json', import.meta.url));
const nativeGuiWorkstationPath = fileURLToPath(new URL('./.cache/local-fonts/workstation/gui-fonts.json', import.meta.url));
const nativeGuiGrindstonePath = fileURLToPath(new URL('./.cache/local-fonts/grindstone/gui-font.json', import.meta.url));

function optionalGuiFontModule(path: string, exportName: string): string {
  const unavailable = `export const ${exportName} = undefined;`;
  if (!existsSync(path)) return unavailable;
  const font = JSON.parse(readFileSync(path, 'utf8')) as {
    pages: string[]; pageSizes: (128 | 256)[]; cellHeight: number; glyphs: object; lineHeight: number;
  };
  if (!font || !Array.isArray(font.pages) || !font.pages.length || font.pages.length > 256
    || !font.glyphs || typeof font.glyphs !== 'object' || !Number.isFinite(font.lineHeight) || font.lineHeight <= 0
    || !Array.isArray(font.pageSizes) || font.pageSizes.length !== font.pages.length
    || font.pageSizes.some(size => size !== 128 && size !== 256)
    || !Number.isSafeInteger(font.cellHeight) || font.cellHeight < 1 || font.cellHeight > Math.min(...font.pageSizes)) {
    throw new Error('Invalid optional Grindstone GUI font; rerun use-local-grindstone-fonts.py.');
  }
  const directory = dirname(path);
  const pages = font.pages.map((page, index) => {
    if (typeof page !== 'string' || isAbsolute(page)) throw new Error('GUI font pages must be relative local paths.');
    const target = resolve(directory, page), within = relative(directory, target);
    if (within === '..' || within.startsWith('../') || within.startsWith('..\\') || isAbsolute(within)) {
      throw new Error('GUI font page is outside its local cache.');
    }
    if (existsSync(target)) {
      const png = readFileSync(target), size = font.pageSizes[index];
      if (png.length < 24 || !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        || png.readUInt32BE(16) !== size || png.readUInt32BE(20) !== size) throw new Error('GUI font PNG dimensions differ from pageSizes.');
    }
    return target;
  });
  if (!pages.every(page => existsSync(page))) return unavailable;
  const names = pages.map((_, index) => `optionalGrindstonePage${index}`);
  return pages.map((page, index) => `import ${names[index]} from ${JSON.stringify(normalizePath(page) + '?url')};`).join('\n')
    + `\nexport const ${exportName} = { ...${JSON.stringify(font)}, pages: [${names.join(',')}] };`;
}
export default defineConfig({
  base: './', build: { outDir: 'site', rollupOptions: { input: { main: fileURLToPath(new URL('./index.html', import.meta.url)), calibration: fileURLToPath(new URL('./calibration.html', import.meta.url)) } } },
  server: {
    port: 5173, strictPort: true,
    // Native captures and browser reports can be held open while they are saved.
    // They are test artifacts, so watching them only adds reloads and Windows locks.
    watch: { ignored: ['**/.cache/**', '**/test-results/**', '**/playwright-report/**'] },
  },
  plugins: [{
    name: 'mcbeui-local-game-font',
    resolveId(id) { if (id === virtualFont) return '\0' + virtualFont; },
    load(id) {
      if (id !== '\0' + virtualFont) return;
      const runeModule = existsSync(runePath)
        ? `import runeUrl from ${JSON.stringify(normalizePath(runePath) + '?url')}; export const runeAtlasUrl = runeUrl;`
        : 'export const runeAtlasUrl = undefined;';
      const parts = [runeModule];
      // Optional measured subset; page bytes remain in ignored local storage.
      // This does not register a global font face or invent missing glyphs.
      let bitmapModule = 'export const nativeBitmapFont = undefined;';
      if (existsSync(nativeBitmapPath)) {
        const sample = JSON.parse(readFileSync(nativeBitmapPath, 'utf8')) as { pages: string[]; glyphs: object; lineHeight: number };
        if (!Array.isArray(sample.pages) || !sample.pages.length || !sample.glyphs || !Number.isFinite(sample.lineHeight)) throw new Error('Invalid local Unicode subset; rerun use-local-unicode-sample.py.');
        const directory = dirname(nativeBitmapPath);
        const pages = sample.pages.map(page => {
          if (typeof page !== 'string' || isAbsolute(page)) throw new Error('Unicode subset pages must be relative local paths.');
          const path = resolve(directory, page), fromDirectory = relative(directory, path);
          if (fromDirectory === '..' || fromDirectory.startsWith('../') || fromDirectory.startsWith('..\\') || isAbsolute(fromDirectory)) throw new Error('Unicode subset page is outside its local cache.');
          return path;
        });
        if (pages.every(path => existsSync(path))) {
          const imports = pages.map((path, index) => `import bitmapPage${index} from ${JSON.stringify(normalizePath(path) + '?url')};`);
          bitmapModule = imports.join('\n') + `\nexport const nativeBitmapFont = { ...${JSON.stringify(sample)}, pages: [${pages.map((_, index) => `bitmapPage${index}`).join(',')}] };`;
        }
      }
      parts.push(bitmapModule);
      // Optional local-only GUI text profiles. No global font registration or package export.
      let workstationModule = 'export const nativeWorkstationFonts = undefined;';
      if (existsSync(nativeWorkstationPath)) {
        type LocalWorkstationFont = { pages: string[]; glyphs: object; lineHeight: number };
        const sample = JSON.parse(readFileSync(nativeWorkstationPath, 'utf8')) as { labels: LocalWorkstationFont; costs: LocalWorkstationFont };
        const directory = dirname(nativeWorkstationPath);
        const imports: string[] = [], fonts: string[] = [];
        let complete = true;
        for (const kind of ['labels', 'costs'] as const) {
          const font = sample[kind];
          if (!font || !Array.isArray(font.pages) || !font.pages.length || !font.glyphs || !Number.isFinite(font.lineHeight) || font.lineHeight <= 0) throw new Error('Invalid local workstation subset; rerun use-local-workstation-fonts.py.');
          const pages = font.pages.map(page => {
            if (typeof page !== 'string' || isAbsolute(page)) throw new Error('Workstation font pages must be relative local paths.');
            const path = resolve(directory, page), fromDirectory = relative(directory, path);
            if (fromDirectory === '..' || fromDirectory.startsWith('../') || fromDirectory.startsWith('..\\') || isAbsolute(fromDirectory)) throw new Error('Workstation font page is outside its local cache.');
            return path;
          });
          complete &&= pages.every(path => existsSync(path));
          const names = pages.map((path, index) => {
            const name = `workstation${kind}Page${index}`;
            imports.push(`import ${name} from ${JSON.stringify(normalizePath(path) + '?url')};`);
            return name;
          });
          fonts.push(`${kind}: { ...${JSON.stringify(font)}, pages: [${names.join(',')}] }`);
        }
        if (complete) workstationModule = imports.join('\n') + `\nexport const nativeWorkstationFonts = { ${fonts.join(',')} };`;
      }
      parts.push(workstationModule);
      // Separate optional full-cell GUI profiles. Keep the existing BitmapText
      // workstation subset and its DOM-centering metrics unchanged above.
      let guiWorkstationModule = 'export const nativeGuiWorkstationFonts = undefined;';
      if (existsSync(nativeGuiWorkstationPath)) {
        type LocalGuiFont = { pages: string[]; pageSizes: (128 | 256)[]; cellHeight: number; glyphs: object; lineHeight: number };
        const sample = JSON.parse(readFileSync(nativeGuiWorkstationPath, 'utf8')) as { labels: LocalGuiFont; runes: LocalGuiFont; costs: LocalGuiFont };
        const directory = dirname(nativeGuiWorkstationPath);
        const imports: string[] = [], fonts: string[] = [];
        let complete = true;
        for (const kind of ['labels', 'runes', 'costs'] as const) {
          const font = sample[kind];
          if (!font || !Array.isArray(font.pages) || !font.pages.length || !font.glyphs || !Number.isFinite(font.lineHeight) || font.lineHeight <= 0
            || !Array.isArray(font.pageSizes) || font.pageSizes.length !== font.pages.length || font.pageSizes.some(size => size !== 128 && size !== 256)
            || !Number.isSafeInteger(font.cellHeight) || font.cellHeight <= 0 || font.cellHeight > Math.min(...font.pageSizes)) throw new Error('Invalid local GUI workstation font; rerun use-local-workstation-fonts.py.');
          const pages = font.pages.map((page, index) => {
            if (typeof page !== 'string' || isAbsolute(page)) throw new Error('GUI workstation font pages must be relative local paths.');
            const path = resolve(directory, page), fromDirectory = relative(directory, path);
            if (fromDirectory === '..' || fromDirectory.startsWith('../') || fromDirectory.startsWith('..\\') || isAbsolute(fromDirectory)) throw new Error('GUI workstation font page is outside its local cache.');
            if (existsSync(path)) {
              const png = readFileSync(path), expectedSize = font.pageSizes[index];
              if (png.length < 24 || !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
                || png.readUInt32BE(16) !== expectedSize || png.readUInt32BE(20) !== expectedSize) throw new Error('GUI workstation PNG dimensions differ from pageSizes.');
            }
            return path;
          });
          complete &&= pages.every(path => existsSync(path));
          const names = pages.map((path, index) => {
            const name = `guiWorkstation${kind}Page${index}`;
            imports.push(`import ${name} from ${JSON.stringify(normalizePath(path) + '?url')};`);
            return name;
          });
          fonts.push(`${kind}: { ...${JSON.stringify(font)}, pages: [${names.join(',')}] }`);
        }
        if (complete) guiWorkstationModule = imports.join('\n') + `\nexport const nativeGuiWorkstationFonts = { ${fonts.join(',')} };`;
      }
      parts.push(guiWorkstationModule);
      parts.push(optionalGuiFontModule(nativeGuiGrindstonePath, 'nativeGuiGrindstoneFont'));
      parts.push(existsSync(hbuiLoadingPath)
        ? `import hbuiLoadingIndicatorUrl from ${JSON.stringify(normalizePath(hbuiLoadingPath) + '?url')}; export { hbuiLoadingIndicatorUrl };`
        : 'export const hbuiLoadingIndicatorUrl = undefined;');
      const faces: string[] = [];
      const fonts = [
        { path: fontPath, family: existsSync(pixelFontPath) ? 'Mojangles Pixel' : 'Mojangles', format: existsSync(pixelFontPath) ? 'woff2' : 'truetype', flag: 'hasGameFont' },
        { path: hbuiTenPath, family: 'Minecraft Ten v2', format: 'opentype', flag: 'hasHBUITenFont' },
        { path: hbuiSevenPath, family: 'Minecraft Seven v2', format: 'opentype', flag: 'hasHBUISevenFont' },
        { path: hbuiChinesePath, family: 'Noto Sans SC', format: 'opentype', flag: 'hasHBUIChineseFont' },
      ];
      fonts.forEach((font, index) => {
        const present = existsSync(font.path);
        parts.push(`export const ${font.flag} = ${present};`);
        if (!present) return;
        const url = `localFontUrl${index}`;
        parts.push(`import ${url} from ${JSON.stringify(normalizePath(font.path) + '?url')};`);
        faces.push(`${JSON.stringify(`@font-face{font-family:'${font.family}';font-style:normal;font-weight:400;src:url(`)} + JSON.stringify(${url}) + ${JSON.stringify(`) format('${font.format}');font-display:swap}`)}`);
      });
      if (existsSync(fontPath)) parts.push(`import ${JSON.stringify(normalizePath(fileURLToPath(new URL('./src/mojangles.css', import.meta.url))))};`);
      // The locale fallback is optional and applies only to the HBUI death view.
      // Open defaults in the public component styles remain unchanged.
      if (existsSync(hbuiChinesePath)) faces.push(JSON.stringify(":root{--mc-death-title-font:'Minecraft Ten v2','Noto Sans SC',var(--mc-font);--mc-death-body-font:'Minecraft Seven v2','Noto Sans SC',var(--mc-font)}"));
      parts.push('export const hasHBUIFont = hasHBUITenFont && hasHBUISevenFont;');
      if (faces.length) parts.push(`const style = document.createElement('style'); style.textContent = [${faces.join(',')}].join('\\n'); document.head.appendChild(style);`);
      return parts.join('\n');
    },
  }],
});
