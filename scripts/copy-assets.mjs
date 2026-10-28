import { cp, mkdir } from 'node:fs/promises';
await mkdir('dist/fonts', { recursive: true });
await Promise.all(['styles.css', 'textures.css', 'fonts.css', 'mojangles.css', 'fonts'].map(name => cp(`src/${name}`, `dist/${name}`, { recursive: true })));
