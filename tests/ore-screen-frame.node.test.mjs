import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import postcss from 'postcss';

const root=process.cwd(),rootRequire=createRequire(import.meta.url);
const built=await build({entryPoints:[path.join(root,'src/ore-screen-frame.tsx')],bundle:true,platform:'node',format:'cjs',jsx:'automatic',write:false,external:['react','react/*']});
function load(require){const module={exports:{}};vm.runInThisContext('(function(require,module,exports){'+built.outputFiles[0].text+'\n})')(require,module,module.exports);return module.exports;}
const peers=[rootRequire];for(const major of[18,19]){try{const require=createRequire(path.join(root,`.cache/consumer-react${major}/package.json`));if(!peers.some(r=>r('react').version===require('react').version))peers.push(require);}catch{}}
for(const require of peers){const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{OreScreenFrame}=load(require);const base={title:'Host screen',backLabel:'Back',onBack(){throw Error('SSR event');},size:[400,300],viewportSize:[1200,800],safeArea:{top:0,left:0,right:0},children:React.createElement('input',{defaultValue:'Host accepted value'})};const render=patch=>renderToStaticMarkup(React.createElement(OreScreenFrame,{...base,...patch}));
 test(`OreScreenFrame SSR has real section/back/body with stable accessible names React${React.version}`,()=>{
  let refs=0;const html=render({ref:()=>refs++,backButtonRef:()=>refs++,bodyRef:()=>refs++});assert.equal(refs,0);assert(html.startsWith('<section'));assert.match(html,/type="button" class="mc-ore-screen-frame__back" aria-label="Back"/);assert.match(html,/value="Host accepted value"/);
  const title=html.match(/<h2 id="([^"]+)"/)[1];assert(html.includes(`aria-labelledby="${title}"`));assert.match(html,/role="region" aria-label="Host screen"/);assert(html.includes('data-native-certified="false"'));assert(!html.includes('<img'));assert(!html.includes('role="dialog"'));
 });
 test(`OreScreenFrame explicit source window differs from local size and keeps signed margins React${React.version}`,()=>{
  const html=render({size:[200,160],viewportSize:[700,400],guiScale:1,safeArea:{top:3,left:5,right:-5},scroll:false,locale:'zh_CN',id:'host-frame',className:'host-class',style:{position:'absolute'}});
  assert.match(html,/data-ore-screen-breakpoint="desktop"/);assert.match(html,/--mc-ore-screen-safe-right:-5px/);assert.match(html,/width:200px;height:160px/);assert.match(html,/Noto Sans SC/);assert(!html.includes('mc-ore-scroll__viewport'));assert.match(html,/data-scroll-owner="children"/);assert.match(html,/id="host-frame"/);assert.match(html,/host-class/);assert.match(html,/position:absolute/);
  assert.match(render({viewportSize:[349,300]}),/data-ore-screen-breakpoint="narrow"/);assert.match(render({viewportSize:[350,300]}),/data-ore-screen-breakpoint="tablet"/);assert.match(render({viewportSize:[640,300]}),/data-ore-screen-breakpoint="desktop"/);
 });
 test(`OreScreenFrame disabled back and caller footer/art do not fabricate navigation React${React.version}`,()=>{
  const html=render({backDisabled:true,backIcon:React.createElement('img',{src:'/caller/whole-arrow.png',alt:''}),footer:React.createElement('button',{type:'button'},'Host submit'),extraBottom:12,'aria-label':'Host section','aria-labelledby':'host-heading'});
  assert.match(html,/aria-labelledby="host-heading"/);assert.match(html,/class="mc-ore-screen-frame__back" disabled=""/);assert.match(html,/src="\/caller\/whole-arrow.png"/);assert.match(html,/class="mc-ore-screen-frame__footer"/);assert.match(html,/height:12px/);assert(!html.includes('aria-modal'));assert(!html.includes('tabindex="-1"'));
 });
 test(`OreScreenFrame explicit profile guards cover inactive and rich-title paths React${React.version}`,()=>{
  for(const patch of[{size:[0,30]},{size:[8192,8192]},{viewportSize:[0,1]},{safeArea:{top:0,left:0}},{guiScale:0},{guiScale:Infinity},{locale:42},{backLabel:''},{onBack:null},{scroll:'yes'},{backDisabled:1},{inputMode:'gamepad'},{scrollBottomInset:NaN},{extraBottom:-1},{title:React.createElement('span',{},'Rich title')}])assert.throws(()=>render({...patch,hidden:true}),e=>e instanceof TypeError||e instanceof RangeError);
  assert.doesNotThrow(()=>render({scrollBottomInset:-12}));
  assert.doesNotThrow(()=>render({title:React.createElement('span',{},'Rich title'),scrollLabel:'Rich body'}));assert.doesNotThrow(()=>render({title:React.createElement('span',{},'Rich title'),scroll:false}));
 });
}
test('Ore frame source header flow and Web/source boundaries remain explicit',async()=>{
 const css=await readFile(path.join(root,'src/ore-screen-frame.css'),'utf8');postcss.parse(css);assert(css.includes("@import './ore-scroll-area.css'"));assert(css.includes('height:calc(4.4 * var(--mc-ore-unit))'));assert(css.includes('height:calc(.4 * var(--mc-ore-unit))'));assert(css.includes('bottom:calc(-.2 * var(--mc-ore-unit))'));assert(css.includes('height:calc(4 * var(--mc-ore-unit))'));assert(css.includes('font-size:calc(2 * var(--mc-ore-unit))'));assert(css.includes('line-height:calc(2.4 * var(--mc-ore-unit))'));assert(css.includes('background:transparent'));assert(css.includes('[hidden]{display:none}'));assert(css.includes('@media(forced-colors:active)'));
});
