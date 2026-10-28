import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, normalizePath } from 'vite';

// An optional font from the user's own game install. Never part of the npm library.
const rawFontPath = fileURLToPath(new URL('./.cache/local-fonts/Mojangles.ttf', import.meta.url));
const pixelFontPath = fileURLToPath(new URL('./.cache/local-fonts/Mojangles-Pixel.woff2', import.meta.url));
const fontPath = existsSync(pixelFontPath) ? pixelFontPath : rawFontPath;
const virtualFont = 'virtual:mcbeui-game-font';
export default defineConfig({
  base: './', build: { outDir: 'site', rollupOptions: { input: { main: fileURLToPath(new URL('./index.html', import.meta.url)), calibration: fileURLToPath(new URL('./calibration.html', import.meta.url)) } } }, server: { port: 5173, strictPort: true },
  plugins: [{
    name: 'mcbeui-local-game-font',
    resolveId(id) { if (id === virtualFont) return '\0' + virtualFont; },
    load(id) {
      if (id !== '\0' + virtualFont) return;
      if (!existsSync(fontPath)) return 'export const hasGameFont = false;';
      return `import fontUrl from ${JSON.stringify(normalizePath(fontPath) + '?url')};
        import ${JSON.stringify(normalizePath(fileURLToPath(new URL('./src/mojangles.css', import.meta.url))))};
        const style = document.createElement('style');
        style.textContent = ${JSON.stringify(`@font-face{font-family:'${existsSync(pixelFontPath) ? 'Mojangles Pixel' : 'Mojangles'}';src:url(`)} + JSON.stringify(fontUrl) + ${JSON.stringify(`) format('${existsSync(pixelFontPath) ? 'woff2' : 'truetype'}');font-display:swap}`)};
        document.head.appendChild(style);
        export const hasGameFont = true;`;
    },
  }],
});
