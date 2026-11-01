import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {PNG} from 'pngjs';
import type {} from '../demo/chat-fixture';

const directory=path.resolve('tests/fixtures/chat-materials');
const hash=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
const manifest=JSON.parse(readFileSync(path.join(directory,'PLANES.json'),'utf8')) as {protocolSHA256:string;planes:{id:string;selector:string;pixelSize:[number,number];wholeRGBA_SHA256:string;expectedPNG:{path:string;sha256:string}}[]};
test.use({deviceScaleFactor:1,viewport:{width:1440,height:900}});

for(const plane of manifest.planes)test(`complete original Chat material: ${plane.id}`,async({page},info)=>{
 expect(hash(readFileSync(path.join(directory,'PROTOCOL.json')))).toBe(manifest.protocolSHA256);
 const expectedBytes=readFileSync(path.join(directory,path.basename(plane.expectedPNG.path))),expected=PNG.sync.read(expectedBytes);
 expect(hash(expectedBytes)).toBe(plane.expectedPNG.sha256);expect(hash(expected.data)).toBe(plane.wholeRGBA_SHA256);
 await page.goto('/demo/chat-fixture.html');await page.waitForFunction(()=>window.chatHarness?.ready);
 await page.evaluate(id=>{const h=window.chatHarness,settings=id.startsWith('settings');h.reset({runKey:'material-'+id,surface:settings?'settings':'composer',emptyGlyphs:true,mode:'uncontrolled-web',defaultDraft:'',disabled:id.includes('locked')});if(settings)h.patch({settings:{...h.config.settings,popup:{instanceId:'material-popup',closeButtonVisible:true},hideChat:id.includes('toggle-on')}});h.refs.input?.blur();(document.activeElement as HTMLElement)?.blur();},plane.id);
 await page.mouse.move(1300,800);
 const isolation=plane.id.startsWith('editor')?['.mc-chat-composer__button--send']:plane.id==='settings-shell-s1'?['.mc-chat-settings__title','.mc-chat-settings__close','.mc-chat-settings__scroll']:[];
 await page.evaluate(selectors=>{for(const selector of selectors)(document.querySelector(selector) as HTMLElement).style.visibility='hidden';},isolation);
 const target=page.locator(plane.selector);
 if(plane.id.includes('hover')||plane.id.includes('pressed'))await(plane.id.includes('toggle')?target.locator('..'):target).hover();
 if(plane.id.includes('pressed'))await page.mouse.down();
 await page.evaluate(async()=>{await Promise.all([...document.images].map(image=>image.decode()));});
 const actualBytes=await target.screenshot({animations:'disabled'}),actual=PNG.sync.read(actualBytes);
 if(plane.id.includes('pressed'))await page.mouse.up();
 await info.attach('complete actual plane',{body:actualBytes,contentType:'image/png'});
 expect([actual.width,actual.height]).toEqual(plane.pixelSize);
 // Compare every channel of every pixel; PNG compression is irrelevant.
 expect(hash(actual.data)).toBe(plane.wholeRGBA_SHA256);
});
