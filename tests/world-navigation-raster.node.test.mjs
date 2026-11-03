import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync, existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

// World navigation uses the existing GuiImageLayer directly. These are CPU
// adapter/SSR contracts; there is deliberately no new pass-through component.
const repo = fileURLToPath(new URL('../', import.meta.url));
const cache = path.join(repo, '.cache/world-navigation-raster-20261103-01');
mkdirSync(cache, {recursive: true});
function sourceApi(requirePeer, activity) {
  const modules = new Map();
  const sandbox = {console, URL, AbortController, queueMicrotask,
    fetch() { activity.fetch++; throw new Error('SSR performed URL I/O'); },
    createImageBitmap() { activity.decode++; throw new Error('SSR decoded an image'); },
    requestAnimationFrame() { activity.raf++; throw new Error('SSR scheduled a browser frame'); }};
  const context = vm.createContext(sandbox);
  function load(file) {
    file = path.resolve(file); if (modules.has(file)) return modules.get(file).exports;
    const module = {exports: {}}; modules.set(file, module);
    const code = ts.transpileModule(readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX}}).outputText;
    vm.runInContext(`(function(require,module,exports){${code}\n})`, context, {filename: file})(id => {
      if (!id.startsWith('.')) return requirePeer(id);
      const base = path.resolve(path.dirname(file), id);
      return load(base + (existsSync(base + '.tsx') ? '.tsx' : '.ts'));
    }, module, module.exports);
    return module.exports;
  }
  return {GuiImageLayer: load(path.join(repo, 'src/gui-image.tsx')).GuiImageLayer,
    layoutGuiImages: load(path.join(repo, 'src/gui-image-geometry.ts')).layoutGuiImages};
}
const zeroActivity = () => ({fetch: 0, decode: 0, raf: 0});
const currentRequire = createRequire(path.join(repo, 'package.json'));
const baseApi = sourceApi(currentRequire, zeroActivity());
const image = () => ({texture: 'caller-whole-original.png', rect: [8, 263.5, 15, 15]});
for (const major of [18, 19]) {
  const peerRoot = process.env[`MCBEUI_REACT${major}_ROOT`] || path.join(repo, `.cache/consumer-react${major}`);
  const installed = existsSync(path.join(peerRoot, 'node_modules/react/package.json'));
  test(`React${major}: direct navigation image pass SSR has zero I/O, refs and state callbacks`, {skip: installed ? false : 'Actual peer installation is absent; do not substitute a different React major.'}, () => {
    const peerRequire = createRequire(path.join(peerRoot, 'package.json'));
    const React = peerRequire('react'), dom = peerRequire('react-dom/server');
    assert.equal(Number(React.version.split('.')[0]), major);
    const activity = zeroActivity(), {GuiImageLayer} = sourceApi(peerRequire, activity);
    const ref = React.createRef(); let callbacks = 0, refs = 0;
    const originalError = console.error, warnings = []; console.error = (...args) => warnings.push(args);
    try {
      for (const background of [{kind: 'solid', color: [49 / 255, 50 / 255, 51 / 255, 1]}, {kind: 'transparent'}]) {
        const props = {width: 190 * 2, height: 400 * 2, guiScale: 2, images: [image()], background, renderKey: 'host-run', ref,
          onReady() {callbacks++;}, onRenderError() {callbacks++;}, onRenderStateChange() {callbacks++;}};
        const html = dom.renderToStaticMarkup(React.createElement(GuiImageLayer, props));
        assert.match(html, /data-render-state="loading"/);
        assert.match(html, /data-framebuffer-width="380"/);
        assert.match(html, /data-framebuffer-height="800"/);
        assert.match(html, /aria-hidden="true"/);
        assert.match(html, /width:380px;height:800px/);
        assert.equal((html.match(/<canvas\b/g) || []).length, 1);
        assert.equal(ref.current, null);
        dom.renderToStaticMarkup(React.createElement(GuiImageLayer, {...props, ref() {refs++;}}));
      }
    } finally {console.error = originalError;}
    assert.deepEqual(activity, zeroActivity()); assert.equal(callbacks, 0); assert.equal(refs, 0); assert.deepEqual(warnings, []);
    // SSR cannot establish mounted ref cleanup/context loss/URL readiness.
  });
}

test('logical local geometry reaches existing packing without an additional navigation floor', () => {
  const rect = [8, 263.5, 15, 15], images = [{rect}];
  const layout = baseApi.layoutGuiImages({width: 190, height: 400, guiScale: 1, images});
  assert.equal(rect[1], 263.5, 'Caller queue is not mutated.');
  assert.equal(layout.meshes[0].drawRect[1], 263, 'Existing geometry supplies its own physical floor.');
  assert.equal(layout.meshes[0].drawRect[2], 15);
  const doubled = baseApi.layoutGuiImages({width: 380, height: 800, guiScale: 2, images});
  assert.equal(doubled.meshes[0].drawRect[1], 263.5);
});

test('one pass retains source UV frames and nine-slice commands in the caller queue order', () => {
  const layout = baseApi.layoutGuiImages({width: 380, height: 800, guiScale: 2, images: [
    {rect: [0, 25, 190, 110], nineSlice: {insets: 1, baseSize: [4, 4]}, hudOpacity: .3},
    {rect: [8, 59, 21, 14], uvRect: [.5, 0, .125, 1]},
    {rect: [8, 204, 21, 14], tint: [.5, .75, 1, 1]},
  ]});
  assert.equal(layout.meshes.length, 3);
  assert.deepEqual(Array.from(layout.meshes, x => x.imageIndex), [0, 1, 2]);
  assert.equal(layout.meshes[0].vertices.length, 36);
  assert.equal(layout.meshes[1].vertices.length, 4);
  assert.equal(layout.meshes[0].hudOpacity, .3);
  assert.equal(layout.meshes[1].vertices[0].uvRaw[0], 32768);
  assert.equal(layout.meshes[1].vertices[1].uvRaw[0], 40960);
});

test('physical frame products must satisfy existing exact integer and pixel caps, with no silent ceil', () => {
  const layout = (width, height, guiScale = 1) => baseApi.layoutGuiImages({width, height, guiScale, images: []});
  assert.equal(layout(8192, 2048).width, 8192);
  assert.equal(layout(119.5 * 2, 20 * 2, 2).width, 239);
  for (const [width, height] of [[0, 20], [8193, 1], [8192, 2049], [190.5, 100], [NaN, 100], [190, Infinity]])
    assert.throws(() => layout(width, height), /bounded positive integer dimensions/);
});

test('direct image layer types cover explicit backgrounds/object refs/state callbacks and reject malformed queues', () => {
  const entry = path.join(cache, 'direct-image-contract.tsx');
  writeFileSync(entry, `import {createRef} from 'react';\nimport {GuiImageLayer,type GuiImageLayerProps} from '../../src/gui-image';\nimport type {GuiImage} from '../../src/gui-image';\nimport type {GuiImageBackground} from '../../src/gui-image-webgl';\nconst images:readonly GuiImage[]=[{texture:'caller.png',rect:[8,263.5,15,15],uvRect:[0,0,1,1]}];\nconst background:GuiImageBackground={kind:'solid',color:[49/255,50/255,51/255,1]};\nconst props:GuiImageLayerProps={width:380,height:800,guiScale:2,images,background,renderKey:'retry',onRenderStateChange(state){const valid:'loading'|'ready'|'error'=state;void valid;}};\nconst objectRef=createRef<HTMLCanvasElement>();\nconst node=<GuiImageLayer {...props} ref={objectRef}/>;void node;\n// @ts-expect-error source rectangle needs all four coordinates\nconst badRect:GuiImage={texture:'x',rect:[1,2,3]};\n// @ts-expect-error normalized RGBA background needs four channels\nconst badBackground:GuiImageBackground={kind:'solid',color:[1,1,1]};\n// @ts-expect-error retry identity is not an object\nconst badKey:GuiImageLayerProps={...props,renderKey:{}};\n// @ts-expect-error URL images are explicit texture sources\nconst missingSource:GuiImage={rect:[0,0,1,1]};\n`);
  const options = {strict: true, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, allowSyntheticDefaultImports: true};
  const program = ts.createProgram([entry], options), diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {getCurrentDirectory: () => repo, getCanonicalFileName: f => f, getNewLine: () => '\n'}));
});
