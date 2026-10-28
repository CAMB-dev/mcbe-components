import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const manifest = JSON.parse(await readFile(new URL('../docs/classic-skins.json', import.meta.url), 'utf8'));
const hudManifest = JSON.parse(await readFile(new URL('../docs/hud-geometry.json', import.meta.url), 'utf8'));
const directory = new URL('../.cache/references/', import.meta.url);
await mkdir(directory, { recursive: true });
const references = new Map();
for (const skin of [...Object.values(manifest.skins), ...Object.values(hudManifest.assets)]) {
  const name = skin.source.split('/').at(-1);
  const previous = references.get(name);
  if (previous && previous.sha256 !== skin.sha256) throw new Error(`Reference filename collision: ${name}`);
  references.set(name, skin);
}
for (const [name, skin] of references) {
  const target = new URL(name, directory);
  let cached;
  try { cached = await readFile(target); } catch { /* Download immutable reference below. */ }
  if (cached && createHash('sha256').update(cached).digest('hex') === skin.sha256) continue;
  const response = await fetch(skin.pinnedUrl ?? `https://raw.githubusercontent.com/Mojang/bedrock-samples/${manifest.referenceCommit}/${skin.source}`);
  if (!response.ok) throw new Error(`Reference download failed: ${response.status} ${name}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(bytes).digest('hex') !== skin.sha256) throw new Error(`Reference hash mismatch: ${name}`);
  await writeFile(target, bytes);
}
console.log(`Verified ${references.size} immutable reference images (${Object.keys(hudManifest.assets).length} HUD assets).`);
