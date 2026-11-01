import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function within(directory, file) {
  const name = relative(directory, file);
  return name !== '..' && !name.startsWith('..' + sep) && !isAbsolute(name);
}

/** A fresh program rooted only at the published entry follows TypeScript's
 * module resolution, including barrels and shared imports. Do not pass the
 * tsconfig include list: private disconnected work is not published input. */
export function publicSourceModules(projectRoot) {
  const root = resolve(projectRoot), configPath = join(root, 'tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  assert(!config.error, config.error && ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  assert.equal(parsed.errors.length, 0, 'Public asset scope requires valid TypeScript configuration.');
  const entry = join(root, 'src', 'index.ts');
  assert(ts.sys.fileExists(entry), 'Public source entry src/index.ts must exist.');
  const program = ts.createProgram({ rootNames: [entry], options: parsed.options });
  return program.getSourceFiles().filter(source => !source.isDeclarationFile && within(join(root, 'src'), resolve(source.fileName)));
}

export async function verifyInlineAssets({ projectRoot = repositoryRoot, bundlePath, log = console.log } = {}) {
const root = resolve(projectRoot);
// Check the emitted module itself: relative asset URLs break when a consumer's
// dependency optimizer relocates it. Every literal source asset must instead
// survive as an original-byte data URL, including fetch-based TGA and JSON.
// Inventory only the public entry's resolved source-module dependency closure.
const expected = [];
const modules = publicSourceModules(root);
for (const source of modules) {
  const file = resolve(source.fileName);
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
    assert(within(join(root, 'src', 'assets'), asset), 'Asset must stay in the public source bank.');
    expected.push({ asset, bytes: await readFile(asset) });
  }
}
assert(expected.length > 0, 'Source asset inventory must not be empty.');
const output = await readFile(bundlePath ?? join(root, 'dist', 'index.js'), 'utf8');
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
log('Published inline assets: ' + expected.length + ' original-byte references verified ' + JSON.stringify(counts)
  + '; scope src/index.ts dependency closure: ' + modules.length + ' non-declaration source modules.');
return Object.freeze({ references: expected.length, counts: Object.freeze(counts), modules: Object.freeze(modules.map(source => relative(root, source.fileName))) });
}

if (process.argv[1] && await realpath(resolve(process.argv[1])) === await realpath(fileURLToPath(import.meta.url))) await verifyInlineAssets();
