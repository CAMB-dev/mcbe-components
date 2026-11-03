import assert from'node:assert/strict';import{test}from'node:test';import fs from'node:fs/promises';import{createHash}from'node:crypto';import{build}from'esbuild';import{pathToFileURL}from'node:url';import path from'node:path';
const bundle=await build({entryPoints:['src/gui-model-geometry.ts'],bundle:true,format:'esm',platform:'node',write:false}),ui=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64')),quad=[[0,0],[0,16],[16,16],[16,0]],uvs=Object.fromEntries(['up','east','south','down','west','north'].map(n=>[n,quad])),options={coordinateSpace:'model',uvs};
test('all twelve frozen pre-extension voxel mesh and packed layout controls remain exact',async()=>{
 const frozen=JSON.parse(await fs.readFile('tests/fixtures/gui-model-legacy.json','utf8'));
 for(const r of frozen.records){const model=ui.createGuiCuboidModel([0,0,0],[16,r.height,16],{textures:{up:'all',east:'all',south:'all',down:'all',west:'all',north:'all'},colors:{east:[127,127,127,0],south:[186,186,186,0]}}),layout=ui.layoutGuiModel({width:2570,height:1402,guiScale:r.scale,model,origin:[17.3,21.2],projection:{yaw:45,pitch:30,scale:.625,offset:[8,9],originQuantization:'physical-floor'},textureSizes:{all:[16,16]}});assert.equal(createHash('sha256').update(JSON.stringify({model,layout})).digest('hex'),r.sha256,JSON.stringify(r));}
});
test('model-space keeps negative and above16 coordinates, explicit material corners and canonical source face order',()=>{
 const input=structuredClone(uvs),box=ui.createGuiCuboidModel([-5,9,1],[5,21,8],{coordinateSpace:'model',faces:['south','up'],uvs:input,textures:{up:'cap',south:'body'},colors:{up:[255,255,255,0]}});
 assert.equal(box.faces.length,2);assert.deepEqual(box.faces.map(f=>f.texture),['cap','body']);assert.deepEqual(box.faces[0].vertices,[[5,21,1],[-5,21,1],[-5,21,8],[5,21,8]]);assert.deepEqual(box.faces[0].uv,quad);input.up[0][0]=12;assert.deepEqual(box.faces[0].uv,quad);assert.deepEqual(box.faces[0].color,[255,255,255,0]);
 assert.throws(()=>ui.createGuiCuboidModel([-5,9,1],[5,21,8]),/bounds/);
});
test('zero-height source planes keep their two independent sides and reject degenerate edge faces',()=>{
 const plane=ui.createGuiCuboidModel([-8,.125,-11],[8,.125,-8],{...options,faces:['down','up']});assert.deepEqual(plane.faces.map(f=>f.normal),[[0,1,0],[0,-1,0]]);assert(plane.faces.every(f=>f.vertices.every(v=>v[1]===.125)));
 assert.throws(()=>ui.createGuiCuboidModel([-8,0,-8],[8,0,8],options),/perpendicular/);assert.throws(()=>ui.createGuiCuboidModel([0,0,0],[0,0,16],{...options,faces:[]}),/two positive/);assert.deepEqual(ui.createGuiCuboidModel([-1,0,0],[1,1,1],{coordinateSpace:'model',faces:[]}),{faces:[]});
});
test('invalid and inactive optional declarations fail before projection or IO',()=>{
 for(const patch of[{coordinateSpace:'world'},{coordinateSpace:null},{faces:['up','up']},{faces:['unknown']},{faces:Array(1)},{faces:Array(7).fill('up')},{uvs:{up:[]}}, {uvs:{up:[[0,0],[0,1],[1,1],[NaN,0]]}},{uvs:{up:[[0,0],[0,1],[1,1],[-1,0]]}},{uvs:{unknown:quad}}])assert.throws(()=>ui.createGuiCuboidModel([0,0,0],[16,16,16],{...options,...patch}),RangeError);
 assert.throws(()=>ui.createGuiCuboidModel([-1,0,0],[1,1,1],{coordinateSpace:'model'}),/explicit UV/);assert.throws(()=>ui.createGuiCuboidModel([0,0,0],[16,16,16],{faces:[],uvs:{up:[]}}),/four/);
});
test('three whole-original examples preserve eight source cubes, omitted faces, UV180 and physical texture dimensions',async()=>{
 const result=await build({entryPoints:['demo/model-source-data.ts'],bundle:true,format:'esm',platform:'node',write:false,define:{'import.meta.url':JSON.stringify(pathToFileURL(path.resolve('demo/model-source-data.ts')).href)}}),{modelSourceExamples:examples}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 assert.deepEqual(examples.map(m=>[m.sourceCubeCount,m.sourceFaceCount]),[[2,12],[2,12],[4,11]]);assert.deepEqual(examples.map(m=>m.item.textureSizes.all),[[32,32],[32,32],[64,64]]);
 const foot=examples[2].item.model.faces;assert.deepEqual(foot[5].uv,[[0,48],[16,48],[16,45],[0,45]]);assert(!foot.slice(0,5).some(f=>JSON.stringify(f.normal)==='[0,0,1]'));
 const manifest=JSON.parse(await fs.readFile('docs/model-source-examples.json','utf8'));for(const r of manifest.resources){const b=await fs.readFile(r.destination);assert.equal(b.length,r.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),r.sha256);}
 for(const m of examples)assert(ui.layoutGuiModel({width:192,height:128,guiScale:4,...m.item,origin:[24,24]}).runs.length>0);
});
