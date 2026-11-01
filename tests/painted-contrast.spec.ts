import {test,expect} from '@playwright/test';
import type {NodeResult} from 'axe-core';
import {verifyPaintedContrast} from './helpers/painted-contrast';

function node(selector:string):NodeResult{return{html:'Authored contrast checker fixture',target:[selector],any:[{id:'color-contrast',impact:'serious',message:'Authored threshold',data:{expectedContrastRatio:'4.5:1'},relatedNodes:[]}],all:[],none:[]};}

test('painted contrast samples intended foreground over real backing and records endpoint quantization',async({page},info)=>{
 await page.setContent('<style>body{background:#252627}.box{position:relative;display:inline-block;font:20px monospace}.back{position:absolute;inset:0;background:#c6c6c6}.text{position:relative;color:#4d4d4d}</style><div class="box"><i class="back"></i><span id="good" class="text" style="letter-spacing:1px"><b style="font-weight:normal">Readable</b> label</span></div>');
 const before=await page.locator('#good').evaluate(n=>n.outerHTML),result=await verifyPaintedContrast(page,node('#good'),info,'authored-good');
 expect(result.minimumRatio).toBeGreaterThanOrEqual(4.5);expect(result.candidateGlyphPixels).toBeGreaterThan(0);expect(result.backingColors).toHaveLength(1);expect(result.foreground).toEqual([77,77,77,255]);
 expect(result.originalMismatchedCandidatePixels).toBeGreaterThanOrEqual(0);expect(result.originalMismatchedCandidatePixels).toBeLessThanOrEqual(result.candidateGlyphPixels);
 expect(result.originalMaxChannelDelta).toBeGreaterThanOrEqual(0);
 expect(result.originalCandidateRGBA.reduce((sum,[,count])=>sum+count,0)).toBe(result.candidateGlyphPixels);
 expect(result.originalCandidateRGBA.filter(([rgba])=>rgba!=='77,77,77,255').reduce((sum,[,count])=>sum+count,0)).toBe(result.originalMismatchedCandidatePixels);
 expect(result.scope).toContain('endpoint-quantized');expect(result.scope).toContain('No candidate is filtered');expect(result.scope).toContain('no pixel-perfect raster or WCAG conformance claim');
 expect(result.coverageWholeRGBA).toMatch(/^[0-9a-f]{64}$/);
 expect(await page.locator('#good').evaluate(n=>n.outerHTML)).toBe(before);
});

test('painted contrast rejects actual low contrast and restores the target after failure',async({page},info)=>{
 await page.setContent('<body style="background:#252627"><span id="bad" style="font:20px monospace;color:#4d4d4d">Low contrast</span></body>');
 const before=await page.locator('#bad').evaluate(n=>n.outerHTML);
 await expect(verifyPaintedContrast(page,node('#bad'),info,'authored-bad')).rejects.toThrow(/Rendered text contrast failed/);
 expect(await page.locator('#bad').evaluate(n=>n.outerHTML)).toBe(before);
});

test('painted contrast never treats uncertain alpha or invisible text as a pass',async({page},info)=>{
 await page.setContent('<body style="background:white"><span id="alpha" style="opacity:.5;color:black;font:20px monospace">Alpha</span><span id="same" style="color:white;font:20px monospace">Invisible</span></body>');
 await expect(verifyPaintedContrast(page,node('#alpha'),info,'authored-alpha')).rejects.toThrow(/Unqualified opacity/);
 await expect(verifyPaintedContrast(page,node('#same'),info,'authored-same')).rejects.toThrow(/Rendered text contrast failed/);
});

test('painted contrast rejects mixed descendant ink and preserves currentColor backing',async({page},info)=>{
 await page.setContent('<body style="background:white"><span id="mixed" style="color:black;font:20px monospace">Readable <b style="color:#777;font-weight:normal">Failing gray</b></span><span id="current" style="color:black;background:currentColor;font:20px monospace">Invisible</span></body>');
 const before=await page.locator('#current').evaluate(n=>n.outerHTML);
 await expect(verifyPaintedContrast(page,node('#mixed'),info,'authored-mixed')).rejects.toThrow(/Unqualified mixed text/);
 await expect(verifyPaintedContrast(page,node('#current'),info,'authored-current-color')).rejects.toThrow(/Rendered text contrast failed/);
 expect(await page.locator('#current').evaluate(n=>n.outerHTML)).toBe(before);
});

test('painted contrast finds invisible same-color glyphs across white and black backing',async({page},info)=>{
 await page.setContent('<body style="background:white"><span id="split" style="display:inline-block;color:black;font:32px monospace;white-space:nowrap;background:linear-gradient(to right,white 50%,black 50%)">MMMMMMMMMMMMMMMM</span></body>');
 const before=await page.locator('#split').evaluate(n=>n.outerHTML);
 await expect(verifyPaintedContrast(page,node('#split'),info,'authored-split')).rejects.toThrow(/Rendered text contrast failed:.*\(1, required 4\.5,/);
 expect(await page.locator('#split').evaluate(n=>n.outerHTML)).toBe(before);
});

test('painted contrast rejects descendant alpha filters and different contrast text roles',async({page},info)=>{
 await page.setContent('<body style="background:white;font:20px monospace;color:black"><span id="desc-alpha">Normal <span style="opacity:.2">Faded</span></span><span id="desc-filter">Normal <span style="filter:brightness(4)">Filtered</span></span><span id="desc-size">Normal <span style="font-size:12px">Small</span></span><span id="desc-weight">Normal <b>Bold</b></span></body>');
 for(const id of['desc-alpha','desc-filter'])await expect(verifyPaintedContrast(page,node('#'+id),info,'authored-'+id)).rejects.toThrow(/Unqualified opacity\/filter\/blend/);
 for(const id of['desc-size','desc-weight'])await expect(verifyPaintedContrast(page,node('#'+id),info,'authored-'+id)).rejects.toThrow(/Unqualified mixed text/);
});

test('painted contrast retains decorative currentColor pseudo paint during text-only probes',async({page},info)=>{
 await page.setContent('<style>body{background:white}.decorated{display:inline-block;position:relative;color:black;font:24px monospace;padding:4px;border:2px solid currentColor}.decorated::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:currentColor}</style><span id="decorated" class="decorated">Readable label</span>');
 const before=await page.locator('#decorated').evaluate(n=>n.outerHTML),result=await verifyPaintedContrast(page,node('#decorated'),info,'authored-decoration');
 expect(result.minimumRatio).toBe(21);expect(result.candidateGlyphPixels).toBeGreaterThan(0);
 expect(await page.locator('#decorated').evaluate(n=>n.outerHTML)).toBe(before);
});

test('painted contrast fails closed for generated text replaced descendants and text shadows',async({page},info)=>{
 await page.setContent('<style>#generated::before{content:"Generated"}</style><body style="background:white;font:20px monospace;color:black"><span id="generated">Normal</span><span id="replaced">Normal <svg width="10" height="10"><rect width="10" height="10" fill="currentColor"/></svg></span><span id="shadow" style="text-shadow:1px 1px black">Shadow</span></body>');
 await expect(verifyPaintedContrast(page,node('#generated'),info,'authored-generated')).rejects.toThrow(/Unqualified generated text/);
 await expect(verifyPaintedContrast(page,node('#replaced'),info,'authored-replaced')).rejects.toThrow(/HTML text leaf/);
 await expect(verifyPaintedContrast(page,node('#shadow'),info,'authored-shadow')).rejects.toThrow(/Unqualified text shadow/);
});

test('painted contrast rejects probe-dependent collateral paint and restores inline data',async({page},info)=>{
 await page.setContent('<style>body{background:white;color:black;font:20px monospace}#collateral[style*="-webkit-text-fill-color"]{background:black!important}</style><span id="collateral" style="letter-spacing:1px">Readable before probe</span>');
 const before=await page.locator('#collateral').evaluate(n=>n.outerHTML);
 await expect(verifyPaintedContrast(page,node('#collateral'),info,'authored-collateral')).rejects.toThrow(/Text probe changed non-fill computed style/);
 expect(await page.locator('#collateral').evaluate(n=>n.outerHTML)).toBe(before);
});

test('painted contrast measures nonempty native text input values rather than attributes',async({page},info)=>{
 await page.setContent('<body style="background:white"><input id="native" type="text" value="Old attribute" placeholder="Unused placeholder" style="font:24px monospace;color:black;background:white;border:0;padding:4px;width:350px"></body>');
 const input=page.locator('#native');await input.evaluate(n=>{(n as HTMLInputElement).value='Current visible value';});
 for(const type of['text','search','tel','url','email']){
  await input.evaluate((n,type)=>{(n as HTMLInputElement).type=type;},type);
  const before=await input.evaluate(n=>n.outerHTML),result=await verifyPaintedContrast(page,node('#native'),info,'authored-native-input-'+type);
  expect(result.textSource).toBe('native-value');expect(result.text).toBe('Current visible value');expect(result.minimumRatio).toBe(21);expect(result.candidateGlyphPixels).toBeGreaterThan(0);
  expect(await input.inputValue()).toBe('Current visible value');expect(await input.evaluate(n=>n.outerHTML)).toBe(before);
 }
});

test('painted contrast rejects actual low contrast in a nonempty native textarea value',async({page},info)=>{
 await page.setContent('<body style="background:white"><textarea id="native-low" readonly style="font:24px monospace;color:#777;background:white;border:0;width:350px;height:80px">Old DOM text</textarea></body>');
 const area=page.locator('#native-low');await area.evaluate(n=>{(n as HTMLTextAreaElement).value='Current low contrast value';});
 const before=await area.evaluate(n=>n.outerHTML);
 await expect(verifyPaintedContrast(page,node('#native-low'),info,'authored-native-textarea-low')).rejects.toThrow(/Rendered text contrast failed: Current low contrast value/);
 expect(await area.inputValue()).toBe('Current low contrast value');expect(await area.evaluate(n=>n.outerHTML)).toBe(before);
});

test('painted contrast refuses empty placeholder-only or unsupported native values',async({page},info)=>{
 await page.setContent('<body style="background:white"><input id="empty" type="text" placeholder="Visible placeholder"><textarea id="placeholder" placeholder="Textarea placeholder"></textarea><input id="password" type="password" value="Secret"><span id="nested">Label<input type="text" value="Nested value"></span></body>');
 for(const id of['empty','placeholder'])await expect(verifyPaintedContrast(page,node('#'+id),info,'authored-native-'+id)).rejects.toThrow(/Unqualified empty native value or placeholder-only/);
 await expect(verifyPaintedContrast(page,node('#password'),info,'authored-password')).rejects.toThrow(/Unqualified native text input type/);
 await expect(verifyPaintedContrast(page,node('#nested'),info,'authored-nested-input')).rejects.toThrow(/HTML text leaf/);
});

test('painted contrast retains an explicit decorative image without treating it as text ink',async({page},info)=>{
 await page.setContent('<body style="background:white"><span id="decorative-image" style="display:inline-block;color:black;font:24px monospace"><img alt="" width="12" height="12" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22%3E%3Crect width=%2212%22 height=%2212%22 fill=%22black%22/%3E%3C/svg%3E">Readable label</span></body>');
 const target=page.locator('#decorative-image');await target.locator('img').evaluate(n=>(n as HTMLImageElement).decode());
 const before=await target.evaluate(n=>n.outerHTML),result=await verifyPaintedContrast(page,node('#decorative-image'),info,'authored-decorative-image');
 expect(result.minimumRatio).toBe(21);expect(result.candidateGlyphPixels).toBeGreaterThan(0);expect(result.textSource).toBe('dom-text');
 expect(await target.evaluate(n=>n.outerHTML)).toBe(before);
});
