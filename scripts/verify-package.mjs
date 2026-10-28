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
assert(!packed.files.some(file => /ascii_sga\.png$/i.test(file.path)), 'User-owned SGA atlas must not enter the npm library.');
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
const exports = ['Alert','Badge','BlastFurnace','Button','Checkbox','Combobox','CraftingTable','Dialog','DurabilityBar','EnchantingBook','EnchantingRunes','EnchantingTable','EnchantmentOption','FuelIndicator','Furnace','Grindstone','IconButton','InventoryGrid','ItemCount','ItemImage','ItemSlot','ItemTooltip','Panel','PixelIcon','PlayerInventory','ProcessingArrow','Progress','RadioGroup','RecipeGrid','ResultSlot','Select','Separator','Slider','SlotPlaceholder','Smoker','Switch','Tabs','Text','TextArea','TextField','WorkstationFrame'];
assert.deepEqual(Object.keys(ui).sort(), exports.sort());
const element = React.createElement;
const output = renderToString(element(ui.Panel, {title:'Settings'},
  element(ui.TextField, {label:'World name', name:'worldName', defaultValue:'My world'}),
  element(ui.Checkbox, {label:'Coordinates', defaultChecked:true, name:'coordinates'}),
  element(ui.Button, {variant:'primary'}, 'Play'),
  element(ui.Text,{shadow:true},'Minecraft'),
  element(ui.InventoryGrid,{label:'Inventory',items:[{name:'Diamond',count:64}],size:9}),
  element(ui.Grindstone,{inputs:[null,null],result:null}),
  element(ui.EnchantingTable,{options:[{id:'unbreaking',label:'Unbreaking',level:3}]}),
  element(ui.EnchantingRunes,{text:'AIZ',atlasUrl:'/caller-owned-ascii_sga.png'}),
  element(ui.EnchantingBook,{}),
  element(ui.EnchantmentOption,{id:'standalone',label:'Unbreaking',level:3}),
  element(ui.ItemImage,{src:'/caller-owned-item.png'}),
  element(ui.ItemCount,{count:64}),
  element(ui.DurabilityBar,{value:3,max:4}),
  element(ui.SlotPlaceholder,{}),
  element(ui.ResultSlot,{item:null,size:'large'}),
  element(ui.ProcessingArrow,{progress:.5}),
  element(ui.FuelIndicator,{progress:.5}),
  element(ui.RecipeGrid,{label:'Recipe',items:[]}),
  element(ui.CraftingTable,{}),
  element(ui.Furnace,{}),
  element(ui.BlastFurnace,{}),
  element(ui.Smoker,{}),
  element(ui.Combobox, {label:'Difficulty',name:'difficulty',defaultValue:'normal',options:[{value:'normal',label:'Normal'}]}),
  element(ui.Tabs, {label:'Settings', items:[{value:'game',label:'Game',content:'Survival'}]}),
  element(ui.Dialog, {open:true,onOpenChange:()=>{},title:'SSR-safe dialog'})
));
assert.match(output, /mc-button--primary/);
assert.match(output, /World name/);
assert.match(output, /role="tablist"/);
const fontCss = await readFile(fileURLToPath(import.meta.resolve('mcbeui/fonts.css')), 'utf8');
assert.match(fontCss, /Monocraft-Regular.woff2/);
for (const asset of ['styles.css','textures.css','inventory.css','workstations.css','enchanting-book.css','processing.css','fonts.css','mojangles.css','fonts/MCBEPixel-Regular.woff2','fonts/MCBECJK-12px-zh-hans.woff2','fonts/Monocraft-Regular.woff2','fonts/FusionPixel-12px-zh-hans.woff2','fonts/Monocraft-OFL.txt','fonts/Fusion-Pixel-OFL.txt','fonts/fusion-notices/LICENSES/galmuri/LICENSE.txt']) {
  assert((await stat(fileURLToPath(import.meta.resolve('mcbeui/'+asset)))).size > 0);
}
assert((await stat(new URL('./node_modules/mcbeui/dist/assets/enchanting/enchanting_table_book.png',import.meta.url))).size>0);
console.log('React '+React.version+': ESM, '+exports.length+' exports, SSR, styles, fonts and licenses PASS');
`);
  console.log(execFileSync(process.execPath, ['smoke.mjs'], { cwd: consumer, encoding: 'utf8' }).trim());
  await writeFile(join(consumer, 'consumer.tsx'), `
import { createRef } from 'react';
import { BlastFurnace, Button, Checkbox, Combobox, CraftingTable, Dialog, DurabilityBar, EnchantingBook, EnchantingRunes, EnchantingTable, EnchantmentOption, FuelIndicator, Furnace, Grindstone, InventoryGrid, ItemCount, ItemImage, ItemSlot, ProcessingArrow, RadioGroup, RecipeGrid, ResultSlot, Slider, SlotPlaceholder, Smoker, Tabs, Text, TextField } from 'mcbeui';
import type { ButtonProps, TabItem, EnchantmentOption as EnchantmentData } from 'mcbeui';
const props: ButtonProps = {variant:'primary',size:'sm',type:'submit'};
const items: TabItem[] = [{value:'game',label:'Game',content:'Survival'}];
const enchantment: EnchantmentData = {id:'standalone',label:'Unbreaking',level:3};
export const demo = <>
  <Button {...props} ref={createRef<HTMLButtonElement>()}>Play</Button>
  <Text as="p" shadow ref={createRef<HTMLElement>()}>Minecraft</Text>
  <TextField label="World" name="world" ref={createRef<HTMLInputElement>()}/>
  <ItemSlot item={{name:'Diamond',count:64}} underlay={<span/>} ref={createRef<HTMLButtonElement>()}/>
  <InventoryGrid label="Inventory" items={[{name:'Diamond'}]} onSlotAction={(index,action)=>String(index)+action}/>
  <Grindstone inputs={[null,null]} onInputAction={(index,action)=>String(index)+action}/>
  <EnchantingTable options={[{id:'unbreaking',label:'Unbreaking',level:3}]} onEnchant={id=>id.toUpperCase()}/>
  <EnchantingBook pageFlip={.25} ref={createRef<HTMLCanvasElement>()}/>
  <EnchantingRunes text="AIZ" atlasUrl="/caller-atlas.png" ref={createRef<HTMLSpanElement>()}/>
  <EnchantmentOption {...enchantment} ref={createRef<HTMLButtonElement>()} onEnchant={id=>id.toUpperCase()}/>
  <ItemImage src="/caller-item.png" ref={createRef<HTMLSpanElement>()}/>
  <ItemCount count={64} ref={createRef<HTMLSpanElement>()}/>
  <DurabilityBar value={3} max={4} ref={createRef<HTMLSpanElement>()}/>
  <SlotPlaceholder ref={createRef<HTMLSpanElement>()}/>
  <ResultSlot size="large" onTake={action=>action.toUpperCase()} ref={createRef<HTMLButtonElement>()}/>
  <ProcessingArrow progress={.5} ref={createRef<HTMLDivElement>()}/>
  <FuelIndicator progress={.5} ref={createRef<HTMLDivElement>()}/>
  <RecipeGrid label="Recipe" items={[]} columns={3} rows={3} onSlotAction={(index,action)=>String(index)+action}/>
  <CraftingTable onInputAction={(index,action)=>String(index)+action} onTakeResult={action=>action.toUpperCase()}/>
  <Furnace input={null} fuel={null} progress={.5} fuelRemaining={.5} onInputAction={(slot,action)=>slot+action}/>
  <BlastFurnace title="Blast furnace"/>
  <Smoker title="Smoker"/>
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
