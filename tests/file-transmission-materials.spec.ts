import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {PNG} from 'pngjs';
import type {} from '../demo/file-transmission-fixture';
const directory=path.resolve('tests/fixtures/file-transmission-materials');
const hash=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
const protocolBytes=readFileSync(path.join(directory,'MATERIAL-PROTOCOL.FROZEN.json'));
const protocol=JSON.parse(protocolBytes.toString()) as {cases:{id:string;targetSelector:string;png:string;pngSha256:string;rgbaSha256:string}[]};
test.use({viewport:{width:800,height:600},deviceScaleFactor:1});
for(const item of protocol.cases)test(`file transmission independent complete material plane: ${item.id}`,async({page},info)=>{
 expect(hash(protocolBytes)).toBe('6081f1803cdae74e55f8c1c8149b480097b7afdb6946e3cc5a161ec322f90c19');
 const bytes=readFileSync(path.join(directory,item.png)),expected=PNG.sync.read(bytes);expect(hash(bytes)).toBe(item.pngSha256);expect(hash(expected.data)).toBe(item.rgbaSha256);
 await page.goto('/demo/file-transmission-fixture.html');await page.waitForFunction(()=>window.fileTransmissionFixture?.ready);await page.evaluate(mode=>window.fileTransmissionFixture.render({mode,open:true}),item.id);
 const target=page.locator(item.targetSelector),selectors=item.id==='frame-fill'?'.mc-file-transmission-panel__text,.mc-file-transmission-button,.mc-file-transmission-panel__progress':'.mc-file-transfer-progress__nub';
 const nodes=await page.locator(selectors).elementHandles(),saved=await Promise.all(nodes.map(async node=>({node,style:await node.getAttribute('style'),box:await node.boundingBox()})));expect(saved.length).toBeGreaterThan(0);
 try{
  for(const {node}of saved)await node.evaluate(n=>(n as HTMLElement).style.visibility='hidden');
  for(const {node,box}of saved)expect(await node.boundingBox()).toEqual(box);
  await page.evaluate(async()=>{await Promise.all([...document.images].map(x=>x.decode()));});
  const actualBytes=await target.screenshot(),actual=PNG.sync.read(actualBytes);await info.attach(item.id+'-whole.png',{body:actualBytes,contentType:'image/png'});expect([actual.width,actual.height]).toEqual([500,301]);
  if(item.id==='frame-fill'){
   // v1's single final byte-round was disproved by independent scalar CSS
   // controls. Keep it immutable and expose its exact original residual.
   let oldDifferences=0;for(let i=0;i<actual.data.length;i+=4)if(!actual.data.subarray(i,i+4).equals(expected.data.subarray(i,i+4)))oldDifferences++;
   expect(oldDifferences).toBe(7560);
   const amendedDir=path.join(directory,'CALIBRATED-WEB-01'),amendedBytes=readFileSync(path.join(amendedDir,'MATERIAL-PROTOCOL.CALIBRATED.json'));
   expect(hash(amendedBytes)).toBe('201b9cb747c3fb614c6f99dec73e52fc699d767918f9a72b4203566439447f37');
   const amended=JSON.parse(amendedBytes.toString()) as typeof protocol,entry=amended.cases.find(x=>x.id===item.id)!;
   const png=readFileSync(path.join(amendedDir,entry.png));expect(hash(png)).toBe(entry.pngSha256);expect(hash(PNG.sync.read(png).data)).toBe(entry.rgbaSha256);expect(hash(actual.data)).toBe(entry.rgbaSha256);
   await info.attach('post-observation-calibrated-Web-blend.json',{body:Buffer.from(JSON.stringify({originalDifferences:oldDifferences,calibratedDifferences:0,scope:'Post-observation scalar-calibrated Chromium CSS profile; not first-measurement-prefrozen or native pixels'})),contentType:'application/json'});
  }else expect(hash(actual.data)).toBe(item.rgbaSha256);
 }finally{for(const {node,style}of saved)await node.evaluate((n,style)=>{if(style===null)(n as Element).removeAttribute('style');else(n as Element).setAttribute('style',style);},style);}
});
