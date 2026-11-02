import {createHash} from 'node:crypto';
import {lstat, mkdir, readFile, realpath, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inflateRawSync} from 'node:zlib';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const archiveSHA256 = 'd93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const inside = (base, candidate) => {const relative = path.relative(base, candidate); return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);};
function safeEntry(name) {
  if (typeof name !== 'string' || !name || /[\\\u0000]/.test(name) || name.startsWith('/') || /^[a-z]:/i.test(name) || name.split('/').some(part => part === '.' || part === '..')) throw new Error('Unsafe ZIP/source entry path: ' + name);
}
function range(bytes, offset, size, label) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(size) || offset < 0 || size < 0 || offset + size > bytes.length) throw new Error('Truncated ZIP ' + label + '.');
}
function extras(bytes, offset, length) {
  const end = offset + length; range(bytes, offset, length, 'extra field');
  while (offset < end) {
    if (offset + 4 > end) throw new Error('Truncated ZIP extra-field header.');
    const id = bytes.readUInt16LE(offset), size = bytes.readUInt16LE(offset + 2); offset += 4;
    if (offset + size > end) throw new Error('Truncated ZIP extra-field body.');
    if (id === 1) throw new Error('ZIP64 is not supported by this fixed-archive extractor.');
    offset += size;
  }
}
// Deliberately limited reader for this SHA-pinned archive, not a general ZIP API.
function centralDirectory(bytes) {
  let end = -1;
  for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 65557); at--) {
    if (bytes.readUInt32LE(at) === 0x06054b50 && at + 22 + bytes.readUInt16LE(at + 20) === bytes.length) {end = at; break;}
  }
  if (end < 0) throw new Error('ZIP end-of-central-directory record is missing.');
  if (end >= 20 && bytes.readUInt32LE(end - 20) === 0x07064b50) throw new Error('ZIP64 is not supported.');
  const count = bytes.readUInt16LE(end + 10), size = bytes.readUInt32LE(end + 12), start = bytes.readUInt32LE(end + 16);
  if (bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6) || bytes.readUInt16LE(end + 8) !== count) throw new Error('Multi-disk ZIP is not supported.');
  if (count === 0xffff || size === 0xffffffff || start === 0xffffffff) throw new Error('ZIP64 is not supported.');
  if (start + size !== end) throw new Error('Unexpected ZIP central-directory bounds.');
  const entries = new Map(); let offset = start;
  for (let index = 0; index < count; index++) {
    range(bytes, offset, 46, 'central entry');
    if (bytes.readUInt32LE(offset) !== 0x02014b50) throw new Error('Invalid ZIP central-entry signature.');
    const flags = bytes.readUInt16LE(offset + 8), method = bytes.readUInt16LE(offset + 10), compressed = bytes.readUInt32LE(offset + 20), length = bytes.readUInt32LE(offset + 24), nameLength = bytes.readUInt16LE(offset + 28), extraLength = bytes.readUInt16LE(offset + 30), commentLength = bytes.readUInt16LE(offset + 32), local = bytes.readUInt32LE(offset + 42);
    if (compressed === 0xffffffff || length === 0xffffffff || local === 0xffffffff || bytes.readUInt16LE(offset + 34)) throw new Error('ZIP64/multi-disk entry is unsupported.');
    if (flags & 1 || method !== 0 && method !== 8) throw new Error('Encrypted or unknown ZIP compression is unsupported.');
    range(bytes, offset + 46, nameLength + extraLength + commentLength, 'central name');
    const name = bytes.toString('utf8', offset + 46, offset + 46 + nameLength); safeEntry(name);
    if (entries.has(name)) throw new Error('Duplicate ZIP entry: ' + name);
    extras(bytes, offset + 46 + nameLength, extraLength);
    entries.set(name, {flags, method, compressed, length, local}); offset += 46 + nameLength + extraLength + commentLength;
  }
  if (offset !== end) throw new Error('Unexpected ZIP central-directory entry count.');
  return {entries, start};
}
function extract(bytes, central, pin) {
  const entry = central.entries.get(pin.entry);
  if (!entry || entry.length !== pin.bytes) throw new Error('Missing or wrong-sized pinned ZIP entry: ' + pin.entry);
  const offset = entry.local; range(bytes, offset, 30, 'local entry');
  if (bytes.readUInt32LE(offset) !== 0x04034b50 || bytes.readUInt16LE(offset + 6) !== entry.flags || bytes.readUInt16LE(offset + 8) !== entry.method) throw new Error('Inconsistent ZIP local header: ' + pin.entry);
  const nameLength = bytes.readUInt16LE(offset + 26), extraLength = bytes.readUInt16LE(offset + 28), start = offset + 30 + nameLength + extraLength;
  range(bytes, offset + 30, nameLength + extraLength, 'local name');
  if (bytes.toString('utf8', offset + 30, offset + 30 + nameLength) !== pin.entry) throw new Error('Inconsistent ZIP local name.');
  extras(bytes, offset + 30 + nameLength, extraLength);
  range(bytes, start, entry.compressed, 'compressed entry');
  if (start + entry.compressed > central.start) throw new Error('ZIP entry overlaps its central directory.');
  const compressed = bytes.subarray(start, start + entry.compressed), value = entry.method === 0 ? compressed : inflateRawSync(compressed, {maxOutputLength: pin.bytes + 1});
  if (value.length !== pin.bytes || digest(value) !== pin.sha256) throw new Error('Pinned ZIP source hash mismatch: ' + pin.entry);
  return value;
}
async function maybeStat(file) {try {return await lstat(file);} catch (error) {if (error.code === 'ENOENT') return null; throw error;}}
async function safeDirectory(root, cache, directory) {
  if (!inside(cache, directory)) throw new Error('Reference directory must be a descendant of this project .cache directory.');
  for (let current = directory;; current = path.dirname(current)) {
    const stat = await maybeStat(current);
    if (stat) {
      const resolved = await realpath(current);
      if (current === cache ? resolved !== cache : !inside(cache, resolved)) throw new Error('Reference directory resolves outside the intended .cache scope.');
      if (!stat.isDirectory()) throw new Error('Reference directory ancestor is not a directory.');
    }
    if (current === cache) break;
  }
  if (!inside(root, cache)) throw new Error('Invalid project .cache scope.');
}
async function exactExisting(file, pin) {
  const stat = await maybeStat(file); if (!stat) return false;
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Existing reference is not a regular file; preserved: ' + file);
  const value = await readFile(file);
  if (value.length !== pin.bytes || digest(value) !== pin.sha256) throw new Error('Existing reference mismatch; preserved without overwrite: ' + file);
  return true;
}

/** Offline preparation of the fourteen unchanged whole JSON references needed
 * by the ResourcePack CPU tests. Existing mismatches are evidence, never output. */
export async function prepareResourcePackReferences({root = projectRoot, directory} = {}) {
  root = await realpath(path.resolve(root)); const cache = path.join(root, '.cache');
  directory = path.resolve(root, directory ?? '.cache/resource-packs-source-20261102-01/original');
  await safeDirectory(root, cache, directory);
  const ledger = JSON.parse(await readFile(path.join(root, 'docs/resource-packs-source.json'), 'utf8')), pins = ledger.source?.files;
  if (ledger.source?.archiveSHA256 !== archiveSHA256 || !Array.isArray(pins) || pins.length !== 14) throw new Error('Expected the fixed archive and fourteen source pins in docs/resource-packs-source.json.');
  const names = new Set();
  for (const pin of pins) {
    safeEntry(pin.entry);
    if (!pin.entry.startsWith('resource_pack/ui/') || !pin.entry.endsWith('.json') || !Number.isSafeInteger(pin.bytes) || pin.bytes < 1 || pin.bytes > 2097152 || !/^[0-9a-f]{64}$/.test(pin.sha256) || names.has(pin.entry)) throw new Error('Invalid fixed whole-source pin: ' + pin.entry);
    names.add(pin.entry);
  }
  const archive = path.join(cache, 'references/bedrock-samples-v1.26.60.5-full.zip'); let bytes;
  try {bytes = await readFile(archive);} catch (error) {if (error.code === 'ENOENT') throw new Error('Pinned full ZIP is missing. Run node scripts/fetch-references.mjs first; this offline preparer does not download files.'); throw error;}
  if (digest(bytes) !== archiveSHA256) throw new Error('Pinned full ZIP SHA256 mismatch; archive preserved.');
  const central = centralDirectory(bytes), prepared = [];
  // Validate every existing destination and every extracted byte before any write.
  for (const pin of pins) {
    const file = path.resolve(directory, pin.entry); if (!inside(directory, file)) throw new Error('Source path escapes reference directory.');
    await safeDirectory(root, cache, path.dirname(file));
    prepared.push({pin, file, value: extract(bytes, central, pin), exists: await exactExisting(file, pin)});
  }
  let written = 0, reused = 0;
  for (const item of prepared) {
    if (item.exists) {reused++; continue;}
    await mkdir(path.dirname(item.file), {recursive: true}); await safeDirectory(root, cache, path.dirname(item.file));
    try {await writeFile(item.file, item.value, {flag: 'wx'}); written++;}
    catch (error) {if (error.code !== 'EEXIST') throw error; await exactExisting(item.file, item.pin); reused++;}
  }
  return {directory, archiveSHA256, files: pins.length, written, reused};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw new Error('Usage: node scripts/prepare-resource-pack-references.mjs');
    console.log(JSON.stringify(await prepareResourcePackReferences()));
  } catch (error) {console.error(error.message); process.exitCode = 1;}
}
