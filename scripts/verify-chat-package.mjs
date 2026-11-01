import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fixtures = fileURLToPath(new URL('./fixtures/chat-package/', import.meta.url));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

/** Verify an already-installed consumer. No installs, network, browser or server.
 * Generated contracts stay in a child directory, preserving the main fixture. */
export async function verifyChatPackage({ consumer, root, major }) {
  assert.ok(major === 18 || major === 19, 'Chat package consumer must specify React major 18 or 19');
  consumer = path.resolve(consumer);
  root = path.resolve(root);
  await fs.access(path.join(consumer, 'package.json'));
  const directory = path.join(consumer, 'chat-contracts');
  await fs.mkdir(directory, { recursive: true });
  for (const name of ['model.ts', 'app.tsx', 'consumer.tsx']) {
    await fs.copyFile(path.join(fixtures, name), path.join(directory, name));
  }
  await fs.writeFile(path.join(directory, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022', lib: ['ES2022', 'DOM', 'DOM.Iterable'], module: 'ESNext',
      moduleResolution: 'Bundler', jsx: 'react-jsx', strict: true, noEmit: true,
      skipLibCheck: true, esModuleInterop: true,
    },
    include: ['consumer.tsx', 'app.tsx', 'model.ts'],
  }, null, 2));
  const config = path.join(directory, 'config.json');
  await fs.writeFile(config, JSON.stringify({ root, consumer, fixtureDir: directory, major, output: directory }, null, 2));
  const run = async (args, filename) => {
    try {
      const stdout = execFileSync(process.execPath, args, { cwd: consumer, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
      await fs.writeFile(path.join(directory, filename), stdout);
    } catch (error) {
      await fs.writeFile(path.join(directory, filename), String(error.stdout ?? '') + '\n' + String(error.stderr ?? error.stack));
      throw error;
    }
  };
  await run([path.join(fixtures, 'worker.mjs'), config], 'SSR.txt');
  await run([path.join(root, 'node_modules/typescript/bin/tsc'), '--project', path.join(directory, 'tsconfig.json')], 'TYPECHECK.txt');
  const ssr = JSON.parse(await fs.readFile(path.join(directory, 'SSR.json'), 'utf8'));
  const result = {
    status: 'PASS_INSTALLED_CHAT_SSR_TYPES_CSS', major, react: ssr.react,
    ssrChecks: ssr.reports.length, strictTypes: true, css: ssr.css,
    indexSHA256: ssr.indexSHA256, declarationSHA256: ssr.declarationSHA256,
    fixtureSHA256: Object.fromEntries(await Promise.all(['model.ts', 'app.tsx', 'consumer.tsx'].map(async name => [name, digest(await fs.readFile(path.join(directory, name)))]))),
    scope: 'Already installed package SSR, public/private API, CSS and strict declaration contracts; no browser or native pixel claim.',
  };
  await fs.writeFile(path.join(directory, 'RESULT.json'), JSON.stringify(result, null, 2));
  console.log(`React ${major}: installed Chat package ${ssr.reports.length} SSR / strict declarations / 3 CSS contracts PASS`);
  return result;
}
