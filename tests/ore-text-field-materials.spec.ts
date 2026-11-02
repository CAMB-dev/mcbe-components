import {test,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';

// Complete material planes from whole caller-owned originals. This is a
// source-image nine-slice contract, not native input/text/full-screen parity.
for(const guiScale of[2,4,6])for(const disabled of[false,true])test(`whole Ore source material guiScale${guiScale} disabled${disabled}`,async({page},info)=>{
  const file=`.cache/local-ore-text-field/${disabled?'disabled':'normal'}.png`;
  test.skip(!existsSync(file),'Optional installed host-owned Ore skin absent; prepare local assets explicitly');
  const bytes=readFileSync(file),source=PNG.sync.read(bytes);
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(disabled?'5c3af29f159b5c9f4b85325848549b4f68f112d2cb57d134769a82149d633fb7':'4de8cfb38a90f3296237606130503c2648551e1fc9aba28c373c86293b6f910c');
  expect([source.width,source.height]).toEqual([6,7]);
  await page.goto('/demo/ore-text-field-fixture.html');expect(await page.evaluate(()=>window.oreFieldFixture.localSkins)).toBe(true);
  const field=page.getByTestId(`material-${guiScale}-${disabled}`);await expect(field).toBeVisible();
  // Verify actual decoded full image independently of the component's CSS URI.
  await page.evaluate(async()=>{await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));await document.fonts.ready;});
  const actualBytes=await field.screenshot(),actual=PNG.sync.read(actualBytes),unit=guiScale*5,width=260,height=4.8*unit;
  expect([actual.width,actual.height]).toEqual([width,height]);
  const expected=new PNG({width,height});
  const sx=(x:number)=>x<.2*unit?Math.floor(x/(.2*unit)):x>=width-.2*unit?5:1+Math.min(3,Math.floor((x-.2*unit)*4/(width-.4*unit)));
  const sy=(y:number)=>y<.6*unit?Math.min(2,Math.floor(y/(.2*unit))):y>=height-.2*unit?6:3+Math.min(2,Math.floor((y-.6*unit)*3/(height-.8*unit)));
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)source.data.copy(expected.data,(y*width+x)*4,(sy(y)*6+sx(x))*4,(sy(y)*6+sx(x))*4+4);
  await info.attach('whole-actual.png',{body:actualBytes,contentType:'image/png'});await info.attach('whole-source-expected.png',{body:PNG.sync.write(expected),contentType:'image/png'});
  let differentPixels=0,maxDifference=0;for(let i=0;i<actual.data.length;i+=4){let different=false;for(let c=0;c<4;c++){const d=Math.abs(actual.data[i+c]!-expected.data[i+c]!);maxDifference=Math.max(maxDifference,d);different ||= d!==0;}if(different)differentPixels++;}
  await info.attach('qualification.json',{body:Buffer.from(JSON.stringify({scope:'complete original material plane, source nine-slice only',nativeGuiCertified:false,guiScale,disabled,width,height,pixels:width*height,differentPixels,maxDifference})),contentType:'application/json'});
  expect({differentPixels,maxDifference}).toEqual({differentPixels:0,maxDifference:0});
});
