/** Complete original GUI PNGs; --catalog imports the first selection, later runs use docs/gui-icons.json. No network. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { PNG } from 'pngjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const release = 'v1.26.60.5', commit = '15701fa9c13923f12662984c32c124327e40e3d3';
const archiveSha = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf';
const licenseSha = 'ca18c0dede68ce24ea1cd6f9df0813579b6f9f979787983a50baec99345f975d';
const flags = process.argv.slice(2);
const argument = (name, fallback) => { const index = flags.indexOf(name); if (index < 0) return fallback; if (!flags[index + 1] || flags[index + 1].startsWith('--')) throw Error(`Missing ${name} path.`); return resolve(flags[index + 1]); };
const catalogPath = argument('--catalog', resolve(root, 'docs/gui-icons.json'));
const archivePath = argument('--archive', resolve(root, '.cache/references/bedrock-samples-v1.26.60.5-full.zip'));
const check = flags.includes('--check'), sha = data => createHash('sha256').update(data).digest('hex');
const selectionBytes = readFileSync(catalogPath), selection = JSON.parse(selectionBytes), zip = readFileSync(archivePath);
if (sha(zip) !== archiveSha) throw Error('Official full archive SHA256 mismatch.');

// The immutable release uses ordinary single-volume ZIP records, not ZIP64.
let end = -1;
for (let p = zip.length - 22; p >= Math.max(0, zip.length - 65557); p--) if (zip.readUInt32LE(p) === 0x06054b50) { end = p; break; }
if (end < 0 || zip.readUInt16LE(end + 4) || zip.readUInt16LE(end + 6)) throw Error('Unsupported ZIP directory.');
const count = zip.readUInt16LE(end + 10), central = zip.readUInt32LE(end + 16), entries = new Map();
if (count === 65535 || central === 0xffffffff) throw Error('ZIP64 is not supported by this fixed-release generator.');
let cursor = central;
for (let i = 0; i < count; i++) {
  if (zip.readUInt32LE(cursor) !== 0x02014b50) throw Error('Invalid ZIP central entry.');
  const nameLength = zip.readUInt16LE(cursor + 28), extraLength = zip.readUInt16LE(cursor + 30), commentLength = zip.readUInt16LE(cursor + 32);
  const name = zip.toString('utf8', cursor + 46, cursor + 46 + nameLength);
  entries.set(name, { method: zip.readUInt16LE(cursor + 10), length: zip.readUInt32LE(cursor + 24), compressed: zip.readUInt32LE(cursor + 20), local: zip.readUInt32LE(cursor + 42) });
  cursor += 46 + nameLength + extraLength + commentLength;
}
function unzip(name) {
  const record = entries.get(name); if (!record) throw Error(`Missing original ZIP entry: ${name}`);
  const offset = record.local;
  if (zip.readUInt32LE(offset) !== 0x04034b50) throw Error('Invalid ZIP local header.');
  const begin = offset + 30 + zip.readUInt16LE(offset + 26) + zip.readUInt16LE(offset + 28), end = begin + record.compressed;
  if (end > zip.length) throw Error('ZIP entry exceeds its archive.');
  const data = record.method === 0 ? zip.subarray(begin, end) : record.method === 8 ? inflateRawSync(zip.subarray(begin, end)) : null;
  if (!data || data.length !== record.length) throw Error('Unsupported or truncated original ZIP entry.');
  return data;
}
function parseJsonc(data) {
  return JSON.parse(data.toString('utf8').replace(/^\uFEFF/, '').replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, value => value.startsWith('"') ? value : '').replace(/"(?:\\.|[^"\\])*"|,(\s*[}\]])/g, (value, ending) => value.startsWith('"') ? value : ending));
}
function installedEntries(assets) {
  const basePath = 'C:/XboxGames/Minecraft for Windows/Content/';
  const baseArchive = 'data/resource_packs/vanilla/__brarchive/textures/ui.brarchive';
  if (!existsSync(basePath + baseArchive)) return null;
  const result = new Map();
  const readArchive = (archive, prefix = '') => {
    if (!existsSync(basePath + archive)) return;
    const data = readFileSync(basePath + archive), count = data.readUInt32LE(8), version = data.readUInt32LE(12), base = 16 + count * 256;
    if (version !== 1 || !count || count > 100000) throw Error('Unsupported installed archive directory.');
    for (let i = 0; i < count; i++) {
      const entry = 16 + i * 256, name = data.toString('utf8', entry + 1, entry + 1 + data[entry]), offset = data.readUInt32LE(entry + 248), length = data.readUInt32LE(entry + 252);
      if (base + offset + length > data.length) throw Error('Installed archive entry exceeds its file.');
      result.set(prefix + name, { data: data.subarray(base + offset, base + offset + length), archive, entry: name });
    }
  };
  readArchive(baseArchive);
  const directories = new Set(assets.map(asset => asset.source.slice('resource_pack/textures/ui/'.length)).filter(name => name.includes('/')).map(name => name.slice(0, name.lastIndexOf('/'))));
  for (const directory of directories) readArchive(`data/resource_packs/vanilla/__brarchive/textures/ui/${directory}.brarchive`, `${directory}/`);
  return result;
}
const assets = Array.isArray(selection.assets) ? selection.assets : Object.entries(selection.assets).map(([name, asset]) => ({ ...asset, name }));
if (!assets.length) throw Error('An explicit original-icon selection is required.');
assets.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
const installed = installedEntries(assets), output = {}, files = new Map(), referenceHashes = new Map();
const license = unzip('LICENSE.md');
if (sha(license) !== licenseSha) throw Error('Original icon license SHA256 mismatch.');
files.set('src/assets/gui-icons/LICENSE.md', license);
for (const asset of assets) {
  const { name, source } = asset;
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name) || Object.hasOwn(output, name)) throw Error(`Invalid or duplicate canonical icon name: ${name}`);
  if (!source.startsWith('resource_pack/textures/ui/') || !source.endsWith('.png') || source.split('/').includes('..')) throw Error(`Icon is not an original UI PNG: ${source}`);
  const data = unzip(source), image = PNG.sync.read(data), dimensions = [image.width, image.height], rgbaSHA256 = sha(image.data);
  if (sha(data) !== asset.sha256 || JSON.stringify(dimensions) !== JSON.stringify(asset.dimensions ?? asset.physicalSize) || rgbaSHA256 !== asset.rgbaSHA256) throw Error(`Original PNG bytes/dimensions/RGBA mismatch: ${name}`);
  const metadataSource = source.slice(0, -4) + '.json', metadataData = entries.has(metadataSource) ? unzip(metadataSource) : null, metadata = metadataData ? parseJsonc(metadataData) : null;
  for (const reference of asset.usageReferences ?? []) {
    if (!referenceHashes.has(reference.entry)) referenceHashes.set(reference.entry, sha(unzip(reference.entry)));
    if (referenceHashes.get(reference.entry) !== reference.sha256) throw Error(`Original UI reference mismatch: ${reference.entry}`);
  }
  const assetPath = `src/assets/gui-icons/${name}.png`, installedName = source.slice('resource_pack/textures/ui/'.length), installedEntry = installed?.get(installedName);
  output[name] = {
    source, pinnedUrl: `https://raw.githubusercontent.com/Mojang/bedrock-samples/${commit}/${source}`,
    sha256: sha(data), rgbaSHA256, bytes: data.length, dimensions, assetPath, category: asset.category, state: asset.state ?? 'default',
    metadata, metadataSource: metadataData ? metadataSource : null, metadataSha256: metadataData ? sha(metadataData) : null, baseSize: metadata?.base_size ?? null,
    usageReferences: asset.usageReferences ?? [],
    installedBaseIdentity: installed ? { archive: installedEntry?.archive ?? null, entry: installedEntry?.entry ?? installedName, sha256: installedEntry ? sha(installedEntry.data) : null, matches: !!installedEntry?.data.equals(data), scope: 'Read-only installed base-pack identity; does not prove active version-overlay selection.' } : asset.installedBaseIdentity ?? null,
  };
  files.set(assetPath, data);
}
const names = Object.keys(output), manifest = {
  schemaVersion: 1, profile: 'original-whole-gui-icon-png', release, releaseCommit: commit, archiveSha256: archiveSha,
  selectionSourceSha256: selection.selectionSourceSha256 ?? sha(selectionBytes), iconCount: names.length,
  license: { source: 'LICENSE.md', sha256: licenseSha, assetPath: 'src/assets/gui-icons/LICENSE.md' },
  defaultSizing: 'Original PNG physical pixels at scale=1; integer scales preserve the complete image and aspect ratio. Metadata base_size and individual source usage sizes are not default component geometry.',
  stateScope: 'Named source files only; no automatic hover/pressed/disabled state selection.',
  licenseScope: 'Original Mojang/Minecraft artwork retains its original rights; the library MIT license does not relicense these assets.',
  assets: output,
  limitations: ['Source PNG identity is not whole native-screen pixel certification.', 'Installed base identity does not prove active resource-pack or version-overlay selection.', 'No crops, tint, generated substitutes or nonuniform asset scaling are applied.'],
};
const generated = ['// Generated by scripts/prepare-gui-icons.mjs. Original complete PNGs are not re-encoded.', 'export const guiIconAssets = {'];
for (const [name, asset] of Object.entries(output)) generated.push(`  '${name}': { width: ${asset.dimensions[0]}, height: ${asset.dimensions[1]}, url: new URL('./assets/gui-icons/${name}.png', import.meta.url).href },`);
generated.push('} as const;', 'export type GuiIconName = keyof typeof guiIconAssets;', 'export const guiIconNames: readonly GuiIconName[] = Object.freeze([', ...names.map(name => `  '${name}',`), ']);', '');
files.set('src/gui-icon-assets.ts', Buffer.from(generated.join('\n')));
files.set('docs/gui-icons.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
const demoCatalog = ['// Generated by scripts/prepare-gui-icons.mjs. Complete provenance remains in docs/gui-icons.json.', 'export const guiIconCatalog = {'];
for (const [name, asset] of Object.entries(output)) demoCatalog.push(`  '${name}': { category: '${asset.category}', dimensions: [${asset.dimensions[0]}, ${asset.dimensions[1]}] },`);
demoCatalog.push('} as const;', '');
files.set('demo/gui-icon-catalog.ts', Buffer.from(demoCatalog.join('\n')));
for (const [relative, data] of files) {
  const path = resolve(root, relative);
  if (check) { if (!existsSync(path) || !readFileSync(path).equals(data)) throw Error(`Generated output differs: ${relative}`); }
  else if (!existsSync(path) || !readFileSync(path).equals(data)) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, data); }
}
console.log(JSON.stringify({ icons: names.length, mode: check ? 'check' : 'write', originalPngBytes: Object.values(output).reduce((n, asset) => n + asset.bytes, 0), allInstalledBaseMatch: Object.values(output).every(asset => asset.installedBaseIdentity?.matches), manifest: 'docs/gui-icons.json' }));
