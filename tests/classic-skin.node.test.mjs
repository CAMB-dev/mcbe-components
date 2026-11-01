import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = new URL('../.cache/classic-skin-node-tests/', import.meta.url);
await mkdir(directory, { recursive: true });
const built = await build({ stdin: { contents: "export { ClassicSkin } from './src/classic-skin';", resolveDir: root, sourcefile: 'classic-skin-node-entry.ts' },
  bundle: true, platform: 'node', format: 'esm', target: 'es2022', jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'], write: false });
const target = fileURLToPath(new URL(`bundle-${process.pid}.mjs`, directory));
await writeFile(target, built.outputFiles[0].contents);
const { ClassicSkin } = await import(pathToFileURL(target).href);
const bytes = await readFile(new URL('../src/assets/start-menu/disabledButton.png', import.meta.url));
const url = `data:image/png;base64,${bytes.toString('base64')}`;
// Actual untouched source metadata has overlapping cuts: 2 + 2 > 3.
const asset = { url, width: 3, height: 3, metadata: { nineslice_size: 2, base_size: [3, 3] } };
const render = (width, height, scale, material = asset) => renderToStaticMarkup(React.createElement(ClassicSkin, { asset: material, width, height, scale }));

test('overlapping original cuts never emit negative or zero CSS background extents', () => {
  for (const scale of [1, 2, 3]) for (const [width, height] of [[10, 16], [16, 10], [10, 10], [3, 3], [1, 1]]) {
    const html = render(width, height, scale);
    const sizes = [...html.matchAll(/background-size:([^;"<]+)/g)];
    assert.ok(sizes.length, 'the complete source still paints');
    for (const [, size] of sizes) assert.ok(size.split(' ').every(value => Number.parseFloat(value) > 0), `${width}x${height}@${scale}: ${size}`);
    assert.ok(html.includes(url), 'painting references the complete original PNG');
    assert.ok(!html.includes('NaN') && !html.includes('Infinity'));
  }
});

test('overlapping centre resolves to the boundary texel without changing its destination box', () => {
  const html = render(10, 16, 2);
  assert.match(html, /left:4px;top:4px;width:12px;height:24px[^>]*><span[^>]*background-size:300% 300%;background-position:100% 100%/);
});

test('ordinary positive source centres retain their source span and nine destination patches', () => {
  const material = { url, width: 3, height: 3, metadata: { nineslice_size: 1, base_size: [3, 3] } };
  const html = render(10, 16, 2, material);
  assert.equal([...html.matchAll(/class="mc-classic-skin__clip"/g)].length, 9);
  assert.match(html, /left:2px;top:2px;width:16px;height:28px[^>]*><span[^>]*background-size:300% 300%;background-position:50% 50%/);
});
