import {test,expect} from '@playwright/test';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const metadataPath=new URL('../.cache/local-fonts/classic-ten/font.json',import.meta.url);
const available=existsSync(metadataPath)&&existsSync(new URL('../.cache/local-fonts/classic-ten/Minecraft-Ten.ttf',import.meta.url));

test('local Classic Ten face is loaded from its unchanged prepared source and used by resource headers',async({page})=>{
  await page.goto('/#resource-packs');const demo=page.getByTestId('resource-packs-demo');
  await expect(demo).toHaveAttribute('data-font-ready','true',{timeout:30000});await expect(demo).toHaveAttribute('data-classic-ten-font',String(available));
  const header=demo.locator('.mc-resource-packs-section__heading').first();
  if(!available){await expect(demo.locator('[data-classic-ten-preview]')).toHaveCount(0);expect(await header.evaluate(el=>getComputedStyle(el).fontFamily)).not.toContain('MCBE Classic Ten');return;}
  const metadata=JSON.parse(readFileSync(metadataPath,'utf8')),bytes=readFileSync(new URL('../.cache/local-fonts/classic-ten/Minecraft-Ten.ttf',import.meta.url));
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(metadata.sha256);expect(metadata.sourceFamily).toBe('Minecraft Ten');
  await expect(header).toHaveCSS('font-family',/MCBE Classic Ten/);
  const actual=await page.evaluate(async()=>{
    const faces=await document.fonts.load('100px "MCBE Classic Ten"','015'),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d')!;
    ctx.font='100px "MCBE Classic Ten"';const advances=[...'015'].map(c=>ctx.measureText(c).width);
    const rules=Array.from(document.styleSheets).flatMap(sheet=>{try{return Array.from(sheet.cssRules);}catch{return[];}}).filter((rule):rule is CSSFontFaceRule=>rule instanceof CSSFontFaceRule&&rule.style.fontFamily.includes('MCBE Classic Ten'));
    return{faces:faces.map(f=>({family:f.family,status:f.status})),advances,sources:rules.map(rule=>rule.style.getPropertyValue('src'))};
  });
  expect(actual.faces).toEqual([{family:'MCBE Classic Ten',status:'loaded'}]);expect(actual.sources).toHaveLength(1);expect(actual.sources[0]).toMatch(/Minecraft-Ten/);
  const fontUrl=actual.sources[0]!.match(/url\(["']?([^"')]+)["']?\)/)?.[1];expect(fontUrl).toBeTruthy();
  const response=await page.request.get(new URL(fontUrl!,page.url()).href);expect(response.ok()).toBe(true);
  expect(createHash('sha256').update(await response.body()).digest('hex')).toBe(metadata.sha256);
  // Current pinned version2.001 hmtx:590/450/590 at UPM1000. Never use the
  // HBUI v2's595/455/595 or equate CSS metrics with native raster pixels.
  if(metadata.sha256==='fc34c190dbfae5fe2f27adb45a93425f502388191854a6a0c2ac2f7c594a688f')for(const[index,value]of [59,45,59].entries())expect(actual.advances[index]).toBeCloseTo(value,3);
  await test.info().attach('classic-ten-font-identity.json',{body:JSON.stringify({sha256:metadata.sha256,bytes:metadata.bytes,...actual,nativeRasterQualified:false}),contentType:'application/json'});
});

test('typography previews the optional original Classic Ten without replacing the open font profile',async({page})=>{
  await page.goto('/#typography');const sample=page.locator('[data-classic-ten-preview]');
  if(!available){await expect(sample).toHaveCount(0);return;}
  await expect(sample).toBeVisible();await expect(sample.locator('p').first()).toHaveCSS('font-family',/MCBE Classic Ten/);await expect(sample.locator('p').first()).toHaveText('CLASSIC TEN · 0123456789');
});
