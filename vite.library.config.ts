import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Keep library asset handling separate from the demo's optional local resources.
// Vite library mode inlines referenced assets, including new URL(..., import.meta.url).
export default defineConfig({
  publicDir: false,
  assetsInclude: ['**/*.tga'],
  build: {
    outDir: 'dist',
    // The preceding tsup --dts-only step owns cleaning and declaration output.
    emptyOutDir: false,
    target: 'es2022',
    minify: false,
    sourcemap: true,
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: id => /^(react|react-dom)(\/|$)/.test(id),
      output: {
        banner: '"use client";',
        inlineDynamicImports: true,
      },
    },
  },
});
