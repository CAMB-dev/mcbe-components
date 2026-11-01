import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import type {ProgressIndicatorTemplate} from '../src';
import type {} from '../demo/progress-material-fixture';

const directory=path.resolve('tests/fixtures/progress-materials');
const hash=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
const frozen=JSON.parse(readFileSync(path.join(directory,'FINAL.json'),'utf8')) as {protocolSHA256:string};
const manifest=JSON.parse(readFileSync(path.join(directory,'PLANES.json'),'utf8')) as {planes:{id:string;template:ProgressIndicatorTemplate;height:number;frame?:number;ratio?:number;pixelSize:[number,number];wholePNG:{path:string;sha256:string};wholeRGBA_SHA256:string;isolation?:{box:[number,number,number,number]}}[]};
test.use({viewport:{width:800,height:600},deviceScaleFactor:1});
for(const plane of manifest.planes)test(`complete original Progress material: ${plane.id}`,async({page},info)=>{
 expect(hash(readFileSync(path.join(directory,'PROTOCOL.json')))).toBe(frozen.protocolSHA256);
 const expectedBytes=readFileSync(path.join(directory,'EXPECTED',path.basename(plane.wholePNG.path))),expected=PNG.sync.read(expectedBytes);
 expect(hash(expectedBytes)).toBe(plane.wholePNG.sha256);expect(hash(expected.data)).toBe(plane.wholeRGBA_SHA256);
 await page.goto('/demo/progress-material-fixture.html');await page.waitForFunction(()=>window.progressMaterial?.ready);
 await page.evaluate(value=>window.progressMaterial.render(value),plane);
 if(plane.isolation){
  const nub=page.locator('[data-progress-kind="fancy"] .mc-progress-indicator__nub');
  const box=await nub.boundingBox();expect(box).not.toBeNull();expect([box!.x,box!.y,box!.width,box!.height]).toEqual(plane.isolation.box);
  // Frozen before the first browser measurement: hide nub paint only.
  await nub.evaluate(n=>(n as HTMLElement).style.visibility='hidden');
 }
 await page.evaluate(async()=>{await Promise.all([...document.images].map(image=>image.decode()));});
 const bytes=await page.locator('#root').screenshot(),actual=PNG.sync.read(bytes);
 await info.attach(plane.id+'-whole-actual.png',{body:bytes,contentType:'image/png'});
 expect([actual.width,actual.height]).toEqual(plane.pixelSize);expect(hash(actual.data)).toBe(plane.wholeRGBA_SHA256);
});
