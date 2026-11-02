import {test,expect,chromium} from '@playwright/test';
import type {Page} from '@playwright/test';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {layoutGuiImages} from '../src';

// Private originals remain outside the package. These references were acquired
// independently from one real native draw; never regenerate them from the Web.
const reference=new URL('../.cache/resource-pack-native-gpu-20261103-01/',import.meta.url);
const files=['native-before-plus-whole.png','native-after-plus-whole.png','native-plus-whole.png','static-index-01/PLUS-DRAW-DECODED.json'];
const available=files.every(file=>existsSync(new URL(file,reference)));
const sha=(value:Uint8Array)=>createHash('sha256').update(value).digest('hex');
const beforeSHA='d0f72fcc063f9ee39375b7b8015428093be1378ac8e4306f243ee4b8bc4aefd2';
const afterSHA='532ef5ee4f8c5590b82cc73d40de3ee4d3193437a0c4993740dcfed613f5205e';
const plusSHA='965fa4c152e09cdd8d61ead15b5eb2ecefd9e1c78cd49a9b652b84b78bf55f9f';
const plusRGBA='67d85a763cd7bccd356319a6c36d4cd8a7c0a3aee2d62a2e8a3dbd085a4aeaa8';
const rects=[[442.5,153,10,10],[442.5,179,10,10]] as const;
const geometry={width:2570,height:1402,guiScale:5,images:rects.map(rect=>({rect,tint:[.3,.3,.3,1] as const,hudOpacity:1,scissor:[256,114,2056,1287] as const}))};

async function originals(){
 const [a,b,p,n]=await Promise.all(files.map(file=>readFile(new URL(file,reference))));
 expect(sha(n!)).toBe('c53222d8b36f699cde288c4824db3c660bd5910b8add64b8564514a0cbf1af96');
 const before=PNG.sync.read(a!),after=PNG.sync.read(b!),nativePlus=PNG.sync.read(p!),native=JSON.parse(n!.toString('utf8'));
 expect([before.width,before.height]).toEqual([2570,1402]);expect([after.width,after.height]).toEqual([2570,1402]);
 expect(sha(before.data)).toBe(beforeSHA);expect(sha(after.data)).toBe(afterSHA);expect(sha(nativePlus.data)).toBe(plusRGBA);
 const sourceBytes=await readFile(new URL('../src/assets/gui-icons/plus.png',import.meta.url)),source=PNG.sync.read(sourceBytes);
 expect(sha(sourceBytes)).toBe(plusSHA);expect(sha(source.data)).toBe(plusRGBA);
 return{before,after,native,sourceBytes};
}

type Audit={consumed:{bytes:number;sha256:string}[];bitmaps:{sameOriginalBlob:boolean;options:ImageBitmapOptions|undefined}[]};
declare global{interface Window{nativeHeaderAssetAudit:Audit}}
async function auditConsumedPng(page:Page){
 await page.addInitScript(()=>{
  const audit:Audit=window.nativeHeaderAssetAudit={consumed:[],bitmaps:[]},blobs=new WeakSet<Blob>();
  const originalFetch=window.fetch,originalBitmap=window.createImageBitmap;
  window.fetch=async function(...args:Parameters<typeof fetch>){
   const response:Response=await Reflect.apply(originalFetch,this,args),url=String(args[0] instanceof Request?args[0].url:args[0]);
   if(url.endsWith('/src/assets/gui-icons/plus.png')){
    const originalBlob=response.blob.bind(response);
    response.blob=async()=>{const blob=await originalBlob(),data=await blob.arrayBuffer(),hash=await crypto.subtle.digest('SHA-256',data);audit.consumed.push({bytes:data.byteLength,sha256:Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('')});blobs.add(blob);return blob;};
   }
   return response;
  };
  Object.defineProperty(window,'createImageBitmap',{configurable:true,writable:true,value:function(...args:unknown[]){
   if(args[0] instanceof Blob&&blobs.has(args[0]))audit.bitmaps.push({sameOriginalBlob:true,options:args[1] as ImageBitmapOptions|undefined});
   return Reflect.apply(originalBitmap,this,args);
  }});
 });
}

test.describe('native resource-pack plus: conditioned source renderer',()=>{
 test.describe.configure({mode:'serial'});
 test.skip(!available,'Caller-owned native capture fixtures are absent; see docs/RESOURCE_PACK_HEADER_NATIVE_QA.md.');

 test('native oracle confirms the half-pixel phase, source pixels and the effective XY projection',async()=>{
  const{before,after,native}=await originals(),layout=layoutGuiImages(geometry);
  expect(native.globalId).toBe(81);expect(native.indices).toEqual([1,2,0,0,2,3,5,6,4,4,6,7]);
  expect(native.PS32float32).toEqual([1,1,1,1,Math.fround(.3),Math.fround(.3),Math.fround(.3),1]);
  const vertices=layout.meshes.flatMap(mesh=>mesh.vertices);
  expect(vertices.map(v=>[...v.position])).toEqual(native.vertices.map((v:{position:number[]})=>v.position.slice(0,2)));
  expect(vertices.map(v=>[...v.uvRaw])).toEqual(native.vertices.map((v:{uvRaw:number[]})=>v.uvRaw));
  // Native Z projection differs. All captured vertices have z=0, so compare the
  // actual clip X/Y/W, never assert equality of all sixteen matrix scalars.
  for(const vertex of native.vertices){const[x,y,z,w]=vertex.position,m=native.VS64float32;expect(z).toBe(0);expect(w).toBe(1);
   for(const axis of [0,1,3])expect(layout.mvp[axis]!*x+layout.mvp[4+axis]!*y+layout.mvp[12+axis]!).toBe(m[axis]*x+m[4+axis]*y+m[12+axis]);
  }
  let changed=0,nonOpaque=0;const transitions=new Map<string,number>();
  for(let i=0;i<before.data.length;i+=4){if(before.data[i+3]!==255||after.data[i+3]!==255)nonOpaque++;if(before.data.subarray(i,i+4).equals(after.data.subarray(i,i+4)))continue;
   changed++;const key=[...before.data.subarray(i,i+4)].join(',')+' -> '+[...after.data.subarray(i,i+4)].join(',');transitions.set(key,(transitions.get(key)??0)+1);
  }
  expect(nonOpaque).toBe(0);expect(changed).toBe(2336);expect([...transitions]).toEqual([['198,198,198,255 -> 76,76,76,255',2336]]);
 });

 for(const backend of ['default','nvidia-d3d11'] as const)test(`${backend}: original URL through public GuiImageLayer matches the complete native after-target`,async({browser:defaultBrowser,baseURL},testInfo)=>{
  const{before,after,sourceBytes}=await originals();
  const owned=backend==='nvidia-d3d11'?await chromium.launch({args:['--enable-gpu','--use-gl=angle','--use-angle=d3d11']}):undefined;
  const browser=owned??defaultBrowser,context=await browser.newContext({baseURL,viewport:{width:2800,height:1600},deviceScaleFactor:1}),page=await context.newPage();
  const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));
  try{
   await auditConsumedPng(page);await page.goto('/demo/gui-image-layer-fixture.html');await page.waitForFunction(()=>!!window.guiImageQA);
   await page.locator('#root').evaluate(root=>{root.style.left='0';root.style.top='0';});
   await page.evaluate(options=>window.guiImageQA.mount(options),{...geometry,images:geometry.images.map(image=>({...image,texture:'/src/assets/gui-icons/plus.png'})),background:{kind:'texture',encoding:'framebuffer',texture:{width:before.width,height:before.height,rgba:before.data.toString('base64')}}});
   const canvas=page.locator('.mc-gui-image-layer');await expect(canvas).toHaveAttribute('data-render-state','ready');
   const raw=await page.evaluate(()=>window.guiImageQA.rawCanvas());if(backend==='nvidia-d3d11')expect(raw.renderer).toMatch(/NVIDIA.*(?:D3D11|Direct3D11)/);
   expect(sha(Buffer.from(raw.rgba,'base64'))).toBe(afterSHA);expect(await canvas.boundingBox()).toEqual({x:0,y:0,width:2570,height:1402});
   const shot=await canvas.screenshot({animations:'disabled'}),dom=PNG.sync.read(shot);expect([dom.width,dom.height]).toEqual([2570,1402]);expect(Buffer.from(dom.data).equals(after.data)).toBe(true);
   const audit=await page.evaluate(()=>window.nativeHeaderAssetAudit);expect(audit.consumed).toEqual([{bytes:sourceBytes.length,sha256:plusSHA}]);expect(audit.bitmaps).toEqual([{sameOriginalBlob:true,options:{premultiplyAlpha:'none',colorSpaceConversion:'none',imageOrientation:'none'}}]);
   expect(errors).toEqual([]);await page.evaluate(()=>window.guiImageQA.unmount());await page.waitForFunction(()=>window.guiImageQA.ref===null);
   await testInfo.attach('conditioned-native-render.json',{body:JSON.stringify({backend,renderer:raw.renderer,frame:[2570,1402],rgbaSHA256:afterSHA,differentPixels:0,actualChangedPixels:2336,scope:'Capture-derived host rectangles and native before-target; no independent JSON layout/font/whole-GUI reconstruction.'},null,2),contentType:'application/json'});
  }finally{await context.close();await owned?.close();}
 });
});
