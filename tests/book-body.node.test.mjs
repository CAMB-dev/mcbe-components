import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {build} from 'esbuild';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url),module={exports:{}};
const bundle=await build({stdin:{contents:"export {BookEditor,BookReader} from './src/book'; export {layoutBookBody} from './src/book-body';",resolveDir:process.cwd()},bundle:true,format:'cjs',platform:'node',write:false,external:['react','react-dom','react-dom/*'],define:{'import.meta.url':JSON.stringify(new URL('../src/index.ts',import.meta.url).href)}});
vm.runInThisContext('(function(require,module,exports){'+bundle.outputFiles[0].text+'\n})')(require,module,module.exports);
const {BookEditor,BookReader,layoutBookBody}=module.exports;
const font={pages:['/source.png'],pageSizes:[256],cellHeight:16,lineHeight:20,glyphs:Object.fromEntries(Array.from({length:95},(_,i)=>{const c=i+32;return[String.fromCharCode(c),{page:0,x:c%16*16,y:Math.floor(c/16)*16,width:c===32?0:16,height:c===32?0:16,advance:12}]}))};
const profile={frameSize:[2570,1402],origin:[97,25],mode:'idle',font,fontScale:.5,sampling:'bilinear',shader:'bitmap-smooth',paintOffset:[0,1],clipRounding:'logical-stage-floor'};
let io=0,callbacks=0;const oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap;
globalThis.fetch=()=>{io++;throw Error('SSR must not fetch');};globalThis.createImageBitmap=()=>{io++;throw Error('SSR must not decode');};
after(()=>{globalThis.fetch=oldFetch;if(oldBitmap===undefined)delete globalThis.createImageBitmap;else globalThis.createImageBitmap=oldBitmap;assert.equal(io,0);assert.equal(callbacks,0);});
const render=(bodyRaster=profile,props={},reader=false)=>renderToStaticMarkup(createElement(reader?BookReader:BookEditor,{pages:['Body',''],...props,layout:{unitScale:5,bodyRaster},onBodyRenderError(){callbacks++;}}));
test('SSR retains actual accepted textarea text without renderer readiness or resource IO',()=>{
 const html=render();assert.match(html,/<textarea/);assert.match(html,/>Body<\/textarea>/);assert.doesNotMatch(html,/<canvas|data-book-body-ready/);
 for(const props of [{mode:'signing'},{readOnly:true},{disabled:true},{hidden:true}])assert.doesNotMatch(render(profile,props),/body-owner|data-book-body-ready/);
 assert.doesNotMatch(render(profile,{},true),/body-owner|<textarea|data-book-body-ready/);
});
test('omitted source policy preserves identical default HTML',()=>{
 const a=renderToStaticMarkup(createElement(BookEditor,{pages:['Body',''],layout:{unitScale:5}}));
 const b=renderToStaticMarkup(createElement(BookEditor,{pages:['Body',''],layout:{unitScale:5,bodyRaster:undefined}}));assert.equal(a,b);
});
test('unused cyclic metadata is ignored; missing glyph and unsupported fitting keep CSS text',()=>{
 const extended={...font};extended.extra=extended;assert.match(render({...profile,font:extended}),/body-owner/);
 const glyphs={...font.glyphs};delete glyphs.B;
 assert.doesNotMatch(render({...profile,font:{...font,glyphs}}),/body-owner/);
 assert.doesNotMatch(render(profile,{pages:['B'.repeat(1000),'']}),/body-owner/);
 assert.match(render({...profile,font:{...font,glyphs}}),/>Body<\/textarea>/);
});
test('text limit is enforced before accessing or copying used glyphs',()=>{
 let reads=0;const glyphs={...font.glyphs};Object.defineProperty(glyphs,'B',{get(){reads++;throw Error('unbounded access');}});
 const html=render({...profile,font:{...font,glyphs}},{pages:['B'.repeat(4097),'']});assert.equal(reads,0);assert.doesNotMatch(html,/body-owner/);assert.match(html,/B{4097}/);
});
test('finite normal clip uses stage rounding and leaves projection frame explicit',()=>{
 const result=layoutBookBody(profile,5,'Body',[97,25],[160,207],'left');assert.deepEqual(result.command.scissor,[605,234,610,753]);assert.deepEqual(result.command.origin,[121,51]);assert.deepEqual(result.frameSize,[2570,1402]);
 assert.deepEqual(layoutBookBody({...profile,clipRounding:'physical-floor'},5,'Body',[97,25],[160,207],'left').command.scissor,[605,235,610,755]);
});
for(const [name,bad]of Object.entries({null:null,mode:{...profile,mode:'focused'},clip:{...profile,clipRounding:'round'},offset:{...profile,paintOffset:new Array(2)},frame:{...profile,frameSize:[2570.1,1402]},scale:{...profile,fontScale:0},sampling:{...profile,sampling:'unknown'},shader:{...profile,shader:'unknown'},color:{...profile,color:[0,0,0,256]},font:{...profile,font:{...font,pageSizes:[]}}}))test('inactive invalid '+name+' rejects before IO',()=>assert.throws(()=>render(bad,{mode:'signing',readOnly:true}),RangeError));
