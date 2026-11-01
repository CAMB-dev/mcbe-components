import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url),module={exports:{}};
let browserIO=0;const oldFetch=globalThis.fetch,oldDecoder=globalThis.createImageBitmap;
globalThis.fetch=()=>{browserIO++;throw Error('Unexpected SSR fetch');};globalThis.createImageBitmap=()=>{browserIO++;throw Error('Unexpected SSR bitmap decode');};
after(()=>{try{assert.equal(browserIO,0);}finally{globalThis.fetch=oldFetch;if(oldDecoder===undefined)delete globalThis.createImageBitmap;else globalThis.createImageBitmap=oldDecoder;}});
const source=await build({stdin:{contents:`export {CreditsScreen} from './src/credits-screen';export {creditsGpuFixtureDefaults,creditsGpuFixtureProfile} from './demo/credits-gpu-fixture-profile';export {presentGuiLayer} from './src/gui-layer';export {presentPreparedGuiLayer} from './src/gui-layer-webgl';`,resolveDir:process.cwd()},bundle:true,format:'cjs',platform:'node',write:false,external:['react','react-dom','react-dom/*'],define:{'import.meta.url':JSON.stringify(new URL('../src/index.ts',import.meta.url).href)}});
// Same JS realm as the real React props, so plain-record validation stays meaningful.
vm.runInThisContext('(function(require,module,exports){'+source.outputFiles[0].text+'\n})',{filename:'credits-gpu-preflight-source.cjs'})(require,module,module.exports);
const {CreditsScreen,creditsGpuFixtureDefaults:defaults,creditsGpuFixtureProfile:profile,presentGuiLayer,presentPreparedGuiLayer}=module.exports;
function props(patch={},open=true){const options={...defaults,...patch};return{runKey:'SSR-preflight',profile:profile(options),content:{sections:[],endPoem:'',quote:''},
 bindings:{showEduIcon:false,showEndPoem:false,playerName:'',scrollFaster:false},scale:options.scale,skipLabel:'Skip',open,
 mode:'controlled-source',position:{offset:0,elapsedMs:0},snapshot:{introAgeMs:3000,backgroundElapsedMs:0,skipButtonVisible:false,factory:{skipPanel:null,fadeOut:null}},onCloseRequested(){throw Error('SSR callback');},onRenderError(){throw Error('SSR callback');}};}
test('active and inactive GPU declarations SSR without browser IO and preserve the old CSS default',()=>{
 const active=renderToStaticMarkup(createElement(CreditsScreen,props()));assert.match(active,/data-background-renderer="gui-layer"/);assert.match(active,/data-render-state="loading"/);assert.doesNotMatch(active,/src="\/qa-credits/);
 const inactive=renderToStaticMarkup(createElement(CreditsScreen,props({},false)));assert.match(inactive,/ hidden=""/);assert.doesNotMatch(inactive,/data-background-renderer/);
 const css=renderToStaticMarkup(createElement(CreditsScreen,props({gpu:false})));assert.doesNotMatch(css,/data-background-renderer/);assert.match(css,/background-repeat:repeat/);
});
for(const [name,patch]of Object.entries({unknownRounding:{originRounding:'nearest'},unknownRaster:{rasterOrigin:'unknown'},bilinear:{imageSampling:'bilinear'},fractionalFrame:{width:64.5},
 fractionalTexture:{naturalSize:[4.5,4]},hugeTexture:{naturalSize:[8192,8192]},emptySource:{src:'   '},tileBudget:{tileSize:[1e-8,1e-8]},fromHalfOverflow:{from:[0,70000]},toHalfOverflow:{to:[0,-70000]},ratioUnderflow:{logicalSize:[1e-300,1],tileSize:[1e30,1]}})){
 test('inactive GPU preflight rejects '+name,()=>assert.throws(()=>renderToStaticMarkup(createElement(CreditsScreen,props(patch,false)))));
}
test('private live presenters require a real explicit canvas before allocating or silently falling back',()=>{
 assert.throws(()=>presentGuiLayer({width:2,height:2,guiScale:1,commands:[]}),/explicit exclusive canvas/);
 assert.throws(()=>presentPreparedGuiLayer({width:2,height:2,commands:[]}),/explicit exclusive canvas/);
});
