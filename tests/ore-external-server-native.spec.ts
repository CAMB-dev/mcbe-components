import {test,expect} from '@playwright/test';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';

// Explicit strict experiment, kept outside the default Web contract projects.
// The native target is an oracle only: it is never sent to the renderer.
test('declared Ore Add Server profile against the complete saved native UI target',async({page},info)=>{
 const oracle='.cache/ore-external-server-native-01/draw-q0-e57-textures-01/ore-native-ui-rt.png';
 test.skip(!existsSync(oracle)||!existsSync('.cache/local-ore-text-field/provenance.json')||!existsSync('.cache/local-fonts/hbui/Minecraft-Seven-v2.otf'),'Private host-owned native baseline/fonts/images not present');
 const expectedBytes=readFileSync(oracle),hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
 expect(hash(expectedBytes)).toBe('d37be75eb6d1ccca959ce4851324ad6cc6ca714a0ff5c9d462938948b17e4a21');
 const expected=PNG.sync.read(expectedBytes);expect([expected.width,expected.height]).toEqual([2570,1402]);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto('/demo/ore-external-server-fixture.html');
 await page.evaluate(()=>{window.oreServerFixture.configure({nativeProfile:true,size:[2570,1402],viewportSize:[2570,1402],guiScale:5,safeArea:{top:0,left:0,right:0},submitAction:'source-blur',descriptions:false});window.oreServerFixture.setValue({name:'',address:'',port:'19132'});});
 await expect(page.locator('#ore-server-primary')).toBeVisible();await expect(page.getByRole('heading',{name:'添加新服务器'})).toBeVisible();
 const metadata=await page.evaluate(async()=>{
  await Promise.all([document.fonts.load('50px "Minecraft Ten v2"','Server'),document.fonts.load('40px "Minecraft Seven v2"','19132'),document.fonts.load('40px "Noto Sans SC"','服务器名称')]);await document.fonts.ready;
  const rect=(node:Element|null)=>{if(!node)return null;const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
  return {extent:[innerWidth,innerHeight],fonts:[...document.fonts].filter(f=>['Minecraft Ten v2','Minecraft Seven v2','Noto Sans SC'].includes(f.family.replaceAll('"',''))).map(f=>({family:f.family,status:f.status})),form:rect(document.querySelector('form')),header:rect(document.querySelector('.mc-ore-screen-frame__header')),row:rect(document.querySelector('.mc-ore-external-server-form__row')),section:rect(document.querySelector('.mc-ore-external-server-form__section')),footer:rect(document.querySelector('.mc-ore-external-server-form__footer')),fields:[...document.querySelectorAll('form input')].map(n=>({name:n.getAttribute('name'),rect:rect(n),font:getComputedStyle(n).fontFamily,fontSize:getComputedStyle(n).fontSize})),back:rect(document.querySelector('.mc-ore-screen-frame__back')),bodyNativeScrollbars:[...document.querySelectorAll('.mc-ore-scroll__viewport')].map(n=>getComputedStyle(n).scrollbarWidth)};
 });
 expect(metadata.fonts).toHaveLength(3);expect(metadata.fonts.every(f=>f.status==='loaded')).toBe(true);expect(errors).toEqual([]);
 await page.mouse.move(2569,1401);
 const actualBytes=await page.screenshot({omitBackground:true,animations:'disabled'}),actual=PNG.sync.read(actualBytes);
 expect([actual.width,actual.height]).toEqual([2570,1402]);
 let differentPixels=0,differentChannels=0,alphaDifferentPixels=0,maxDifference=0;const pairs=new Map<string,number>();
 for(let i=0;i<actual.data.length;i+=4){let changed=false;for(let c=0;c<4;c++){const d=Math.abs(actual.data[i+c]!-expected.data[i+c]!);if(d){differentChannels++;changed=true;maxDifference=Math.max(maxDifference,d);if(c===3)alphaDifferentPixels++;}}if(changed){differentPixels++;const pair=`${[...expected.data.subarray(i,i+4)]} -> ${[...actual.data.subarray(i,i+4)]}`;pairs.set(pair,(pairs.get(pair)??0)+1);}}
 const result={status:differentPixels===0?'COMPLETE_NATIVE_TARGET_RGBA_ZERO':'UNQUALIFIED_NONZERO_COMPLETE_NATIVE_TARGET',scope:'One explicit physical Web host profile; active native DOM viewport/DPR and engine provider values remain unknown',captureSHA256:'c431e066cb57bef4dd102dd8847ae51c6f35a29f6b5a5f9c0ace466fee661e70',nativeUiTargetSHA256:hash(expectedBytes),actualSHA256:hash(actualBytes),width:actual.width,height:actual.height,pixels:actual.width*actual.height,differentPixels,differentChannels,alphaDifferentPixels,maxDifference,profile:{size:[2570,1402],viewportSize:[2570,1402],guiScale:5,safeArea:{top:0,left:0,right:0}},metadata,largestDifferences:[...pairs].sort((a,b)=>b[1]-a[1]).slice(0,25),threshold:0,maskedPixels:0};
 await info.attach('whole-browser.png',{body:actualBytes,contentType:'image/png'});await info.attach('whole-native.png',{body:expectedBytes,contentType:'image/png'});await info.attach('native-comparison.json',{body:Buffer.from(JSON.stringify(result,null,2)),contentType:'application/json'});
 expect(differentPixels,'Strict full target RGBA comparison; preserve nonzero result as unqualified evidence').toBe(0);
});
