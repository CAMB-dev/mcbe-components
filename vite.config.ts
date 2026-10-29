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
