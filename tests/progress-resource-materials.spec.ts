import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import type {ProgressResourcePopupId} from '../src';
import type {} from '../demo/progress-resource-material-fixture';
const directory=path.resolve('tests/fixtures/progress-resource-materials');
const hash=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
const frozen=JSON.parse(readFileSync(path.join(directory,'FROZEN.json'),'utf8')) as {protocolSHA256:string;expectedPNG:{path:string;sha256:string};wholeRGBA_SHA256:string};
const protocol=JSON.parse(readFileSync(path.join(directory,'PROTOCOL.json'),'utf8')) as {factories:ProgressResourcePopupId[];targetSelector:string;host:{pixelSize:[number,number]};windowBox:[number,number,number,number];isolation:{selectors:string[]}};
test.use({viewport:{width:800,height:600},deviceScaleFactor:1});
for(const factory of protocol.factories)test(`original resource frame above fill: ${factory}`,async({page},info)=>{
 expect(hash(readFileSync(path.join(directory,'PROTOCOL.json')))).toBe(frozen.protocolSHA256);
 const expectedBytes=readFileSync(path.join(directory,frozen.expectedPNG.path)),expected=PNG.sync.read(expectedBytes);
 expect(hash(expectedBytes)).toBe(frozen.expectedPNG.sha256);expect(hash(expected.data)).toBe(frozen.wholeRGBA_SHA256);
 await page.goto('/demo/progress-resource-material-fixture.html');await page.waitForFunction(()=>window.progressResourceMaterial?.ready);await page.evaluate(factory=>window.progressResourceMaterial.render(factory),factory);
 const target=page.locator(protocol.targetSelector),windowBox=await page.locator('.mc-progress-resource-dialog').boundingBox();
 expect([windowBox!.x,windowBox!.y,windowBox!.width,windowBox!.height]).toEqual(protocol.windowBox);
 // Preserve exact original attributes and boxes. Only the predeclared glyph
 // and complete button paint is hidden; the frame and fill remain untouched.
 const isolated=await page.locator(protocol.isolation.selectors.join(',')).elementHandles();
 expect(isolated.length).toBeGreaterThanOrEqual(4);
 const saved=await Promise.all(isolated.map(async node=>({node,style:await node.getAttribute('style'),box:await node.boundingBox()})));
 try{
  for(const {node}of saved)await node.evaluate(n=>(n as HTMLElement).style.visibility='hidden');
  for(const {node,box}of saved)expect(await node.boundingBox()).toEqual(box);
  await page.evaluate(async()=>{await Promise.all([...document.images].map(image=>image.decode()));});
  const bytes=await target.screenshot(),actual=PNG.sync.read(bytes);await info.attach(factory+'-whole.png',{body:bytes,contentType:'image/png'});
  expect([actual.width,actual.height]).toEqual(protocol.host.pixelSize);expect(hash(actual.data)).toBe(frozen.wholeRGBA_SHA256);
 }finally{
  for(const {node,style}of saved)await node.evaluate((n,style)=>{const element=n as Element;if(style===null)element.removeAttribute('style');else element.setAttribute('style',style);},style);
 }
});
