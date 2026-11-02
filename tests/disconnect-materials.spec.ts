import {test, expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import type {} from '../demo/disconnect-fixture';
async function open(page: import('@playwright/test').Page, patch: object) {
  await page.goto('/demo/disconnect-fixture.html');
  await page.waitForFunction(() => !!window.disconnectQA?.configure);
  await page.evaluate(patch => window.disconnectQA.configure(patch), patch);
}

for (const variant of ['disconnect','realms-warning'] as const) for (const scale of [1,2]) {
  test(`${variant}: complete GPU original tile plane at GUI${scale}`, async ({page}) => {
    await open(page,{variant,scale,renderer:'gpu',backgroundOnly:true});
    const canvas = page.locator('.mc-disconnect-background canvas');
    await expect(canvas).toHaveAttribute('data-render-state','ready');
    const asset = variant === 'disconnect' ? 'bg32.png' : 'portalBg.png';
    const source = PNG.sync.read(await readFile(new URL(`../src/assets/disconnect/${asset}`,import.meta.url)));
    const shot = PNG.sync.read(await canvas.screenshot({animations:'disabled'}));
    let different = 0;
    for(let y=0;y<shot.height;y++)for(let x=0;x<shot.width;x++){
      const a=(y*shot.width+x)*4,b=((Math.floor(y/scale)%32)*32+Math.floor(x/scale)%32)*4;
      if([0,1,2,3].some(c=>shot.data[a+c]!==source.data[b+c]))different++;
    }
    expect(different).toBe(0);
  });
}
for (const [variant,asset,digest] of [
  ['disconnect','bg32.png','76842acb4488a28062ca494d9150a56db94d1555704d66340ef72cd42066d6bb'],
  ['realms-warning','portalBg.png','1d985d815a28be108c2b550e32c12df8d520dfdbd3ca6515255878917e994a90'],
] as const) {
  test(`${variant}: complete original tiled CSS background plane`, async ({page}) => {
    await open(page,{variant,backgroundOnly:true});
    const bytes = await readFile(new URL(`../src/assets/disconnect/${asset}`,import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(digest); const source = PNG.sync.read(bytes);
    const shot = PNG.sync.read(await page.locator('.mc-disconnect-screen').screenshot({animations:'disabled'}));
    let different = 0;
    for(let y=0;y<shot.height;y++)for(let x=0;x<shot.width;x++){
      const a=(y*shot.width+x)*4,b=((y%32)*32+x%32)*4;
      if([0,1,2,3].some(c=>shot.data[a+c]!==source.data[b+c]))different++;
    }
    expect(different).toBe(0);
  });
}
