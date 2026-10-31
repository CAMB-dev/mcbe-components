import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? filesIn(join(directory, entry.name)) : [join(directory, entry.name)]))).flat();
}

// Check the emitted module itself: relative asset URLs break when a consumer's
// dependency optimizer relocates it. Every literal source asset must instead
// survive as an original-byte data URL, including fetch-based TGA and JSON.
const expected = [];
for (const file of (await filesIn(join(root, 'src'))).filter(file => /[.]tsx?$/.test(file))) {
  const source = ts.createSourceFile(file, await readFile(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const assets = [];
  function visit(node) {
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'URL' && node.arguments?.length === 2) {
      const [first, second] = node.arguments;
      if (ts.isStringLiteralLike(first) && first.text.startsWith('./assets/') && second.getText(source) === 'import.meta.url') {
        assets.push(resolve(dirname(file), first.text));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  for (const asset of assets) {
    assert(!relative(join(root, 'src', 'assets'), asset).startsWith('..'), 'Asset must stay in the public source bank.');
    expected.push({ asset, bytes: await readFile(asset) });
  }
}
assert(expected.length > 0, 'Source asset inventory must not be empty.');
const output = await readFile(join(root, 'dist', 'index.js'), 'utf8');
const bundle = ts.createSourceFile('index.js', output, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const inline = new Map();
const residual = [];
function inspect(node) {
  if (ts.isStringLiteralLike(node) && node.text.startsWith('data:')) {
    const match = /^data:([^,]*?),(.*)$/s.exec(node.text);
    assert(match, 'Emitted data URL must have a body.');
    const bytes = match[1].endsWith(';base64') ? Buffer.from(match[2], 'base64') : Buffer.from(decodeURIComponent(match[2]));
    inline.set(digest(bytes), bytes);
  }
  if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'URL' && node.arguments?.length === 2) {
    const first = node.arguments[0];
    if (ts.isStringLiteralLike(first) && first.text.includes('assets/') && !first.text.startsWith('data:')) residual.push(first.text);
  }
  ts.forEachChild(node, inspect);
}
inspect(bundle);
assert.deepEqual(residual, [], 'Published JS must not retain relocatable asset URLs.');
for (const { asset, bytes } of expected) {
  assert.deepEqual(inline.get(digest(bytes)), bytes, 'Missing or altered inline asset: ' + relative(root, asset));
}
const counts = {};
for (const { asset } of expected) counts[extname(asset)] = (counts[extname(asset)] ?? 0) + 1;
console.log('Published inline assets: ' + expected.length + ' original-byte references verified ' + JSON.stringify(counts));
