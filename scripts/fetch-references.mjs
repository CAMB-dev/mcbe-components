import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const manifest = JSON.parse(await readFile(new URL('../docs/classic-skins.json', import.meta.url), 'utf8'));
const directory = new URL('../.cache/references/', import.meta.url);
await mkdir(directory, { recursive: true });
for (const skin of Object.values(manifest.skins)) {
  const name = skin.source.split('/').at(-1);
  const target = new URL(name, directory);
  let cached;
  try { cached = await readFile(target); } catch { /* Download immutable reference below. */ }
  if (cached && createHash('sha256').update(cached).digest('hex') === skin.sha256) continue;
  const response = await fetch(`https://raw.githubusercontent.com/Mojang/bedrock-samples/${manifest.referenceCommit}/${skin.source}`);
  if (!response.ok) throw new Error(`Reference download failed: ${response.status} ${name}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(bytes).digest('hex') !== skin.sha256) throw new Error(`Reference hash mismatch: ${name}`);
  await writeFile(target, bytes);
}
console.log(`Verified ${Object.keys(manifest.skins).length} immutable reference images.`);
