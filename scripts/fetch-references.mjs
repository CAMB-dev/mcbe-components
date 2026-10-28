import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const manifest = JSON.parse(await readFile(new URL('../docs/classic-skins.json', import.meta.url), 'utf8'));
const hudManifest = JSON.parse(await readFile(new URL('../docs/hud-geometry.json', import.meta.url), 'utf8'));
const hudOverlayManifest = JSON.parse(await readFile(new URL('../docs/hud-overlays-geometry.json', import.meta.url), 'utf8'));
const advancedManifest = JSON.parse(await readFile(new URL('../docs/advanced-workstation-textures.json', import.meta.url), 'utf8'));
const feedbackManifest = JSON.parse(await readFile(new URL('../docs/feedback-geometry.json', import.meta.url), 'utf8'));
const settingsManifest = JSON.parse(await readFile(new URL('../docs/settings-controls-geometry.json', import.meta.url), 'utf8'));
const gameListManifest = JSON.parse(await readFile(new URL('../docs/game-lists-geometry.json', import.meta.url), 'utf8'));
const systemManifest = JSON.parse(await readFile(new URL('../docs/system-screens-geometry.json', import.meta.url), 'utf8'));
const tradingManifest = JSON.parse(await readFile(new URL('../docs/trading-mount-textures.json', import.meta.url), 'utf8'));
const gameControlsManifest = JSON.parse(await readFile(new URL('../docs/game-controls-geometry.json', import.meta.url), 'utf8'));
const rendererManifest = JSON.parse(await readFile(new URL('../docs/item-renderers-geometry.json', import.meta.url), 'utf8'));
const inventoryScreensManifest = JSON.parse(await readFile(new URL('../docs/inventory-screens-geometry.json', import.meta.url), 'utf8'));
const directory = new URL('../.cache/references/', import.meta.url);
await mkdir(directory, { recursive: true });
const references = new Map();
// Caller-bound recipe backgrounds are exercised by QA, not default production skins.
const fixtureReferences = [
  { source: 'resource_pack/textures/ui/recipe_book_item_bg.png', sha256: 'd70b22cb99397cd6ef3902df63166e719b6982cf18f98bc95f368977c44533c4' },
  { source: 'resource_pack/textures/ui/cell_image_normal.png', sha256: 'd70b22cb99397cd6ef3902df63166e719b6982cf18f98bc95f368977c44533c4' },
  { source: 'resource_pack/textures/ui/cell_image_invert.png', sha256: 'ebe0c28b46b51f1e8e28d159b7c4b39520174c1bb7bddc7c26a36a6730d4efaf' },
  { source: 'resource_pack/textures/ui/cell_image_darkgrey.png', sha256: 'b73c7e0b923f7faa56394adf62d86b0e4883656f2c28035fde86475f97807cef' },
];
for (const skin of [...Object.values(manifest.skins), ...Object.values(hudManifest.assets), ...Object.values(hudOverlayManifest.assets), ...advancedManifest.source.textures, ...Object.values(feedbackManifest.assets), ...Object.values(settingsManifest.assets), ...Object.values(gameListManifest.assets), ...Object.values(systemManifest.assets), ...tradingManifest.source.textures, ...Object.values(gameControlsManifest.assets), ...rendererManifest.assets, ...Object.values(inventoryScreensManifest.assets), ...fixtureReferences]) {
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
console.log(`Verified ${references.size} immutable reference images (${Object.keys(hudManifest.assets).length} HUD, ${Object.keys(hudOverlayManifest.assets).length} HUD overlay, ${advancedManifest.source.textures.length} advanced workstation, ${Object.keys(feedbackManifest.assets).length} feedback, ${Object.keys(settingsManifest.assets).length} settings, ${Object.keys(gameListManifest.assets).length} game list, ${Object.keys(systemManifest.assets).length} system screen, ${tradingManifest.source.textures.length} trading/mount, ${Object.keys(gameControlsManifest.assets).length} game control, ${rendererManifest.assets.length} renderer, ${Object.keys(inventoryScreensManifest.assets).length} inventory screen assets).`);
