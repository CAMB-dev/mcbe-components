import assert from 'node:assert/strict';import{test}from'node:test';import{build}from'esbuild';
const result=await build({entryPoints:['src/gui-truetype-geometry.ts','src/gui-text-geometry.ts'],bundle:true,format:'esm',platform:'node',outdir:'memory',write:false});
const load=name=>import('data:text/javascript;base64,'+Buffer.from(result.outputFiles.find(f=>f.path.endsWith(name+'.js')).text).toString('base64'));
const {layoutGuiTrueTypeText:layout}=await load('gui-truetype-geometry'),{layoutGuiText:bitmap}=await load('gui-text-geometry');
const font=()=>({pages:['atlas.png'],pageSizes:[8],lineHeight:6,glyphs:{A:{page:0,atlasRect:[1,2,3,2],offset:[.25,.5],size:[3,2],advance:4},' ':{page:0,atlasRect:[0,0,0,0],offset:[0,0],size:[0,0],advance:1}}});
const options=()=>({width:16,height:16,guiScale:1,text:'A',font:font(),origin:[.25,.5]});

test('variable atlas rectangles produce ordinary depth-zero glyph vertices and independent projection scale',()=>{
 const r=layout({...options(),projectionScale:2}),run=r.runs[0];
 assert.deepEqual(run.vertices.map(v=>v.position),[[.25,2.5,0],[3.25,2.5,0],[3.25,.5,0],[.25,.5,0]]);
 assert.deepEqual(run.vertices.map(v=>v.uvRaw),[[8192,32768],[32768,32768],[32768,16384],[8192,16384]]);
 assert.deepEqual(run.indices,[1,2,0,0,2,3]);assert.equal(run.mvp[0],.25);assert.equal(run.mvp[5],-.25);assert.equal(run.mvp[12],-.96875);assert.equal(run.mvp[13],.9375);
 assert.equal(r.logicalWidth,8);assert.equal(r.logicalHeight,12);assert.equal(run.sampling,'point');
});
test('normal advances, CRLF, empty ink and supplementary characters retain local metrics',()=>{
 let r=layout({...options(),text:'A A\r\nAA',projectionScale:2});assert.equal(r.logicalWidth,18);assert.equal(r.logicalHeight,24);assert.equal(r.runs[0].vertices.length,16);assert.equal(r.runs[0].vertices[8].position[1],8.5);
 const f=font();f.glyphs['💎']=f.glyphs.A;r=layout({...options(),font:f,text:'💎'});assert.equal(r.runs[0].vertices.length,4);assert.equal(layout({...options(),text:''}).runs.length,0);
});
test('explicit physical-floor origin, page order, shadows and returned arrays are independent snapshots',()=>{
 const f=font();f.pages.push('second.png');f.pageSizes.push(8);f.glyphs.B={...f.glyphs.A,page:1};const tint=[1,.5,.25,1],color=[128,255,64,255];
 const r=layout({...options(),font:f,text:'BA',origin:[.75,1.75],originQuantization:'physical-floor',tint,color,shadow:{offset:[1,2],tint:[0,0,0,.5]}});
 assert.deepEqual(r.runs.map(v=>[v.pass,v.page]),[['shadow',0],['shadow',1],['main',0],['main',1]]);assert.deepEqual(r.runs[0].paintOrigin,[1,3]);assert.deepEqual(r.runs[2].paintOrigin,[0,1]);
 color[0]=0;tint[0]=0;f.glyphs.A.offset[0]=9;assert.equal(r.runs[2].vertices[0].position[0],4.25);assert.equal(r.runs[2].vertices[0].rgba[0],128);assert.equal(r.runs[2].tint[0],1);
 r.runs[0].mvp[0]=7;assert.notEqual(r.runs[1].mvp[0],7);
});
test('invalid used metrics, sparse pages and unsupported policies fail before resource access',()=>{
 for(const change of [{projectionScale:0},{projectionScale:1e-100},{origin:[Infinity,0]},{originQuantization:'matrix'},{sampling:'trilinear'},{color:[0,0,0,256]},{hudOpacity:-1}])assert.throws(()=>layout({...options(),...change}),RangeError);
 for(const patch of [{atlasRect:[7,2,3,2]},{size:[0,2]},{offset:[NaN,0]},{advance:Infinity},{page:1}]){const f=font();Object.assign(f.glyphs.A,patch);assert.throws(()=>layout({...options(),font:f}),RangeError);}
 const f=font();f.pages=Array(1);assert.throws(()=>layout({...options(),font:f}),RangeError);assert.throws(()=>layout({...options(),text:'missing'}),/Missing TrueType glyph/);assert.throws(()=>layout({...options(),text:'A'.repeat(4097)}),/budget/);
});
test('TrueType pages do not weaken packed-bitmap cell constraints',()=>{
 assert.throws(()=>bitmap({...options(),font:{...font(),cellHeight:2},fontScale:1,sampling:'point',shader:'bitmap'}),/bitmap pages|page declarations/);
 assert.throws(()=>layout({...options(),font:{...font(),pageSizes:[8192]}}),/page declarations/);
});
