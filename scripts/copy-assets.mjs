import { cp, mkdir } from 'node:fs/promises';
await mkdir('dist/fonts', { recursive: true });
await Promise.all(['styles.css', 'textures.css', 'inventory.css', 'workstations.css', 'enchanting-book.css', 'processing.css', 'anvil.css', 'containers.css', 'image.css', 'fonts.css', 'mojangles.css', 'fonts', 'assets'].map(name => cp(`src/${name}`, `dist/${name}`, { recursive: true })));
