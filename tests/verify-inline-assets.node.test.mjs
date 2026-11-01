import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { publicSourceModules, verifyInlineAssets } from '../scripts/verify-inline-assets.mjs';

async function fixture(run) {
  const directory = await mkdtemp(join(tmpdir(), 'mcbe-inline-scope-'));
  try {
    await mkdir(join(directory, 'src/assets'), { recursive: true });
    await mkdir(join(directory, 'dist'));
    // Broad include deliberately contains private work; only entry reachability
    // decides the verifier's inventory.
    await writeFile(join(directory, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler' }, include: ['src'] }));
    await writeFile(join(directory, 'src/index.ts'), '/// <reference path="./ambient.d.ts" />\nexport { asset } from "./public";');
    await writeFile(join(directory, 'src/ambient.d.ts'), 'declare const ambient: string;');
    await writeFile(join(directory, 'src/public.ts'), 'import { shared } from "./shared"; export const asset=[shared,new URL("./assets/public.bin",import.meta.url).href];');
    await writeFile(join(directory, 'src/shared.ts'), 'export const shared=new URL("./assets/shared.json",import.meta.url).href;');
    await writeFile(join(directory, 'src/private.ts'), 'export const privateAsset=new URL("./assets/private.bin",import.meta.url).href;');
    const bytes = Buffer.from([0, 1, 127, 255]);
    await writeFile(join(directory, 'src/assets/public.bin'), bytes);
    await writeFile(join(directory, 'src/assets/shared.json'), '{"original":true}\n');
    // Private literal intentionally points to a nonexistent asset. Its presence
    // cannot break a published-entry check, but importing it must make it fail.
    const bundle = 'export const asset=["data:application/octet-stream;base64,' + bytes.toString('base64') + '","data:application/json,%7B%22original%22%3Atrue%7D%0A"];';
    await writeFile(join(directory, 'dist/index.js'), bundle);
    await run({ directory, bundle, bytes, verify: () => verifyInlineAssets({ projectRoot: directory, log() {} }) });
  } finally {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()), 'Cleanup must stay in the owned temporary test directory.');
    assert.ok(basename(directory).startsWith('mcbe-inline-scope-'));
    await rm(directory, { recursive: true, force: true });
  }
}

test('entry barrel and shared imports are checked while disconnected private work and declarations are excluded', () => fixture(async ({directory,verify}) => {
  const modules = publicSourceModules(directory).map(source => relative(join(directory, 'src'), source.fileName).replaceAll('\\', '/')).sort();
  assert.deepEqual(modules, ['index.ts', 'public.ts', 'shared.ts']);
  const result = await verify();
  assert.equal(result.references, 2);
  assert.deepEqual(result.counts, { '.json': 1, '.bin': 1 });
}));

test('importing private work makes its literal asset part of the required closure', () => fixture(async ({directory,verify}) => {
  await writeFile(join(directory, 'src/index.ts'), 'export { asset } from "./public"; export { privateAsset } from "./private";');
  await assert.rejects(verify, /ENOENT.*private[.]bin/);
}));

test('one changed byte in a published data URL still fails original-byte verification', () => fixture(async ({directory,bundle,bytes,verify}) => {
  const altered = Buffer.from(bytes); altered[2] ^= 1;
  await writeFile(join(directory, 'dist/index.js'), bundle.replace(bytes.toString('base64'), altered.toString('base64')));
  await assert.rejects(verify, /Missing or altered inline asset/);
}));

test('valid inline originals cannot conceal a residual relocatable asset URL', () => fixture(async ({directory,bundle,verify}) => {
  await writeFile(join(directory, 'dist/index.js'), bundle + '\nnew URL("./assets/public.bin",import.meta.url);');
  await assert.rejects(verify, /Published JS must not retain relocatable asset URLs/);
}));

test('reachable literal traversal outside the source bank is rejected', () => fixture(async ({directory,verify}) => {
  await writeFile(join(directory, 'src/public.ts'), 'export const asset=new URL("./assets/../../outside.bin",import.meta.url).href;');
  await assert.rejects(verify, /Asset must stay in the public source bank/);
}));
