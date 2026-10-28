import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npmCli = process.env.npm_execpath;
assert(npmCli, 'Run with npm run verify:package so the current npm CLI can be reused.');
const npm = (args, cwd = root) => execFileSync(process.execPath, [npmCli, ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
// Build first, then test the actual packed files rather than source aliases.
npm(['run', 'build']);
const packed = JSON.parse(npm(['pack', '--ignore-scripts', '--json']))[0];
assert(!packed.files.some(file => /Mojangles[^/]*\.(ttf|otf|woff2?|ttc)$/i.test(file.path)), 'Local proprietary font must not enter the npm library.');
const tarball = packed.filename;
const tarPath = join(root, tarball);
for (const major of [18, 19]) {
  const consumer = join(root, '.cache', `consumer-react${major}`);
  await mkdir(consumer, { recursive: true });
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ name: `mcbeui-consumer-react${major}`, private: true, type: 'module' }));
  npm(['install', '--no-audit', '--no-fund', tarPath, `react@^${major}.3.0`, `react-dom@^${major}.3.0`, `@types/react@^${major}.0.0`, `@types/react-dom@^${major}.0.0`], consumer);
  await writeFile(join(consumer, 'smoke.mjs'), `
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import * as ui from 'mcbeui';
const exports = ['Alert','Badge','Button','Checkbox','Combobox','Dialog','IconButton','ItemSlot','Panel','PixelIcon','Progress','RadioGroup','Select','Separator','Slider','Switch','Tabs','Text','TextArea','TextField'];
assert.deepEqual(Object.keys(ui).sort(), exports.sort());
const element = React.createElement;
const output = renderToString(element(ui.Panel, {title:'Settings'},
  element(ui.TextField, {label:'World name', name:'worldName', defaultValue:'My world'}),
  element(ui.Checkbox, {label:'Coordinates', defaultChecked:true, name:'coordinates'}),
  element(ui.Button, {variant:'primary'}, 'Play'),
  element(ui.Text,{shadow:true},'Minecraft'),
  element(ui.Combobox, {label:'Difficulty',name:'difficulty',defaultValue:'normal',options:[{value:'normal',label:'Normal'}]}),
  element(ui.Tabs, {label:'Settings', items:[{value:'game',label:'Game',content:'Survival'}]}),
  element(ui.Dialog, {open:true,onOpenChange:()=>{},title:'SSR-safe dialog'})
));
assert.match(output, /mc-button--primary/);
assert.match(output, /World name/);
assert.match(output, /role="tablist"/);
const fontCss = await readFile(fileURLToPath(import.meta.resolve('mcbeui/fonts.css')), 'utf8');
assert.match(fontCss, /Monocraft-Regular.woff2/);
for (const asset of ['styles.css','textures.css','fonts.css','mojangles.css','fonts/MCBEPixel-Regular.woff2','fonts/MCBECJK-12px-zh-hans.woff2','fonts/Monocraft-Regular.woff2','fonts/FusionPixel-12px-zh-hans.woff2','fonts/Monocraft-OFL.txt','fonts/Fusion-Pixel-OFL.txt','fonts/fusion-notices/LICENSES/galmuri/LICENSE.txt']) {
  assert((await stat(fileURLToPath(import.meta.resolve('mcbeui/'+asset)))).size > 0);
}
console.log('React '+React.version+': ESM, 20 exports, SSR, styles, fonts and licenses PASS');
`);
  console.log(execFileSync(process.execPath, ['smoke.mjs'], { cwd: consumer, encoding: 'utf8' }).trim());
  await writeFile(join(consumer, 'consumer.tsx'), `
import { createRef } from 'react';
import { Button, Checkbox, Combobox, Dialog, RadioGroup, Slider, Tabs, Text, TextField } from 'mcbeui';
import type { ButtonProps, TabItem } from 'mcbeui';
const props: ButtonProps = {variant:'primary',size:'sm',type:'submit'};
const items: TabItem[] = [{value:'game',label:'Game',content:'Survival'}];
export const demo = <>
  <Button {...props} ref={createRef<HTMLButtonElement>()}>Play</Button>
  <Text as="p" shadow ref={createRef<HTMLElement>()}>Minecraft</Text>
  <TextField label="World" name="world" ref={createRef<HTMLInputElement>()}/>
  <Checkbox label="Enabled" indeterminate ref={createRef<HTMLInputElement>()}/>
  <Combobox label="Difficulty" name="difficulty" ref={createRef<HTMLButtonElement>()} options={[{value:'normal',label:'Normal'}]} onValueChange={value=>value.toUpperCase()}/>
  <Slider label="Distance" defaultValue={12} min={4} max={32} onValueChange={n=>n.toFixed(0)}/>
  <RadioGroup label="Mode" options={[{value:'survival',label:'Survival'}]} />
  <Tabs label="Settings" items={items}/>
  <Dialog open={false} onOpenChange={next=>Boolean(next)} title="World" />
</>;
`);
  const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  execFileSync(process.execPath, [tsc, '--noEmit', '--strict', '--skipLibCheck', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2022', '--jsx', 'react-jsx', 'consumer.tsx'], { cwd: consumer, encoding: 'utf8' });
  console.log(`React ${major}: installed package TypeScript consumer PASS`);
}
console.log(`Verified tarball: ${tarPath}`);
