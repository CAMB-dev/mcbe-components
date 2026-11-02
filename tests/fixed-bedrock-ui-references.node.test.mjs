import assert from 'node:assert/strict';
import {after, test} from 'node:test';
import {createHash} from 'node:crypto';
import {lstat, mkdir, mkdtemp, readFile, readdir, symlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {prepareResourcePackReferences} from '../scripts/prepare-resource-pack-references.mjs';
import {prepareManifestValidationReferences} from '../scripts/prepare-manifest-validation-references.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const qa = path.join(root, '.cache/manifest-validation-reference-prep-20261102-01');
await mkdir(qa, {recursive: true});
const run = await mkdtemp(path.join(qa, 'run-'));
const sha = value => createHash('sha256').update(value).digest('hex');
const ledger = name => readFile(path.join(root, 'docs', name), 'utf8').then(JSON.parse);
const packs = await ledger('resource-packs-source.json'), manifest = await ledger('manifest-validation-source.json');
const receipts = [];
async function verify(directory, pins) {
  return Promise.all(pins.map(async pin => {
    const file = path.join(directory, pin.entry), bytes = await readFile(file);
    assert.equal(bytes.length, pin.bytes); assert.equal(sha(bytes), pin.sha256);
    return {entry: pin.entry, bytes: bytes.length, sha256: sha(bytes)};
  }));
}
async function missing(file) {await assert.rejects(lstat(file), {code: 'ENOENT'});}
async function fakeProject(name, change = value => value) {
  const directory = path.join(run, name); await mkdir(path.join(directory, 'docs'), {recursive: true});
  const value = change(structuredClone(manifest));
  await writeFile(path.join(directory, 'docs/manifest-validation-source.json'), JSON.stringify(value), {flag: 'wx'});
  return directory;
}
after(async () => {await writeFile(path.join(run, 'receipts.json'), JSON.stringify({scope: 'CPU offline whole-JSON preparation only', receipts}, null, 2) + '\n', {flag: 'wx'});});

test('old fourteen default originals are exact reuse with the unchanged wrapper result shape', async () => {
  const directory = path.join(root, '.cache/resource-packs-source-20261102-01/original');
  const first = await prepareResourcePackReferences(), before = await verify(directory, packs.source.files), result = await prepareResourcePackReferences();
  assert.deepEqual(Object.keys(result), ['directory', 'archiveSHA256', 'files', 'written', 'reused']);
  assert.deepEqual(result, {directory, archiveSHA256: packs.source.archiveSHA256, files: 14, written: 0, reused: 14});
  assert.deepEqual(await verify(directory, packs.source.files), before); receipts.push({test: 'old14 reuse', first, result, identities: before});
});
test('old fourteen fresh outputs retain every whole-source identity', async () => {
  const directory = path.join(run, 'packs-fresh'); const result = await prepareResourcePackReferences({directory});
  assert.equal(result.written, 14); assert.equal(result.reused, 0);
  receipts.push({test: 'old14 fresh', result, identities: await verify(directory, packs.source.files)});
});
test('new seven default originals are prepared then exactly reused without touching independent audit originals', async () => {
  const first = await prepareManifestValidationReferences(), result = await prepareManifestValidationReferences();
  assert.equal(first.files, 7); assert.equal(result.directory, path.join(root, '.cache/manifest-validation-source-20261102-01/original'));
  assert.notEqual(result.directory, path.join(root, '.cache/manifest-validation-independent-20261102-01/original'));
  assert.equal(result.written, 0); assert.equal(result.reused, 7);
  receipts.push({test: 'new7 default/reuse', first, result, identities: await verify(result.directory, manifest.source.files)});
});
test('new seven fresh outputs and subsequent reuse have the same fixed identities', async () => {
  const directory = path.join(run, 'manifest-fresh'), first = await prepareManifestValidationReferences({directory});
  assert.equal(first.written, 7); assert.equal(first.reused, 0);
  const result = await prepareManifestValidationReferences({directory}); assert.equal(result.written, 0); assert.equal(result.reused, 7);
  receipts.push({test: 'new7 fresh/reuse', first, result, identities: await verify(directory, manifest.source.files)});
});
test('a later existing mismatch prevents every earlier absent destination from being written', async () => {
  const directory = path.join(run, 'bad-existing'), pin = manifest.source.files.at(-1), file = path.join(directory, pin.entry);
  const bytes = Buffer.from('preserve-bad-reference-evidence\n'); await mkdir(path.dirname(file), {recursive: true}); await writeFile(file, bytes, {flag: 'wx'});
  await assert.rejects(prepareManifestValidationReferences({directory}), /Existing reference mismatch; preserved/);
  assert.deepEqual(await readFile(file), bytes);
  for (const other of manifest.source.files.slice(0, -1)) await missing(path.join(directory, other.entry));
  receipts.push({test: 'bad existing/preflight', preservedSHA256: sha(await readFile(file)), noOtherOutputs: true});
});
test('both wrappers reject destinations outside project cache before creating anything', async () => {
  const directory = path.join(root, 'reference-prep-outside-' + path.basename(run));
  for (const prepare of [prepareResourcePackReferences, prepareManifestValidationReferences]) await assert.rejects(prepare({directory}), /descendant.*\.cache/);
  await missing(directory); receipts.push({test: 'outside cache', rejected: true});
});
test('dot-segment destination aliases and source-entry aliases are rejected without outputs', async () => {
  await assert.rejects(prepareManifestValidationReferences({directory: run + '/alias/../escaped'}), /path aliases/);
  await assert.rejects(prepareManifestValidationReferences({directory: run + '//duplicate-separator'}), /path aliases/);
  await missing(path.join(run, 'alias')); await missing(path.join(run, 'escaped'));
  for (const [name, entry] of [['traversal', 'resource_pack/ui/../escape.json'], ['alias', 'resource_pack/ui//alias.json'], ['stream', 'resource_pack/ui/bad:alias.json']]) {
    const project = await fakeProject('pin-' + name, value => {value.source.files[0].entry = entry; return value;});
    await assert.rejects(prepareManifestValidationReferences({root: project}), /Unsafe ZIP\/source entry|Source path aliases/);
    await missing(path.join(project, '.cache'));
  }
  receipts.push({test: 'directory and pin aliases', rejected: 5});
});
test('an inside-cache directory symlink/junction is rejected even when its target is also inside cache', async () => {
  const target = path.join(run, 'real-directory'), alias = path.join(run, 'directory-alias'); await mkdir(target);
  await symlink(target, alias, process.platform === 'win32' ? 'junction' : 'dir');
  assert((await lstat(alias)).isSymbolicLink());
  await assert.rejects(prepareManifestValidationReferences({directory: path.join(alias, 'output')}), /symlinks\/junctions/);
  assert.deepEqual(await readdir(target), []); receipts.push({test: 'directory symlink/junction', rejected: true});
});
test('archive drift fails before output and preserves the mismatching archive', async () => {
  const project = await fakeProject('archive-drift'), archive = path.join(project, '.cache/references/bedrock-samples-v1.26.60.5-full.zip');
  const bytes = Buffer.from('not-the-fixed-official-ZIP\n'); await mkdir(path.dirname(archive), {recursive: true}); await writeFile(archive, bytes, {flag: 'wx'});
  await assert.rejects(prepareManifestValidationReferences({root: project}), /full ZIP SHA256 mismatch; archive preserved/);
  assert.deepEqual(await readFile(archive), bytes); await missing(path.join(project, '.cache/manifest-validation-source-20261102-01'));
  receipts.push({test: 'archive drift', preservedSHA256: sha(bytes)});
});
test('missing ZIP has an actionable offline error and performs no extraction', async () => {
  const project = await fakeProject('missing-archive');
  await assert.rejects(prepareManifestValidationReferences({root: project}), /Run node scripts\/fetch-references\.mjs first; this offline preparer does not download/);
  await missing(path.join(project, '.cache')); receipts.push({test: 'missing archive', rejected: true});
});
test('source-ledger archive drift is rejected before looking for its archive', async () => {
  const project = await fakeProject('ledger-drift', value => {value.source.archiveSHA256 = '0'.repeat(64); return value;});
  await assert.rejects(prepareManifestValidationReferences({root: project}), /Expected the fixed archive and 7 source pins/);
  await missing(path.join(project, '.cache')); receipts.push({test: 'ledger archive identity', rejected: true});
});
test('both CLI wrappers reject extra arguments, while their no-argument JSON results retain the bounded API', () => {
  for (const [script, files] of [['prepare-resource-pack-references.mjs', 14], ['prepare-manifest-validation-references.mjs', 7]]) {
    const file = path.join(root, 'scripts', script);
    const rejected = spawnSync(process.execPath, [file, '--directory', '.cache/ignored'], {cwd: root, encoding: 'utf8'});
    assert.equal(rejected.status, 1); assert.match(rejected.stderr, /Usage: node scripts\/prepare-/); assert.equal(rejected.stdout, '');
    const accepted = spawnSync(process.execPath, [file], {cwd: root, encoding: 'utf8'});
    assert.equal(accepted.status, 0, accepted.stderr); assert.equal(accepted.stderr, '');
    const result = JSON.parse(accepted.stdout); assert.deepEqual(Object.keys(result), ['directory', 'archiveSHA256', 'files', 'written', 'reused']);
    assert.equal(result.files, files); assert.equal(result.written, 0); assert.equal(result.reused, files);
  }
  receipts.push({test: 'two CLI reject and accept paths', rejected: 2, accepted: 2});
});
