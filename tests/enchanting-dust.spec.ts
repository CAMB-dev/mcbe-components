import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';

// Original Mojang full-release PNGs used by the existing reference fetcher.
// Source files, not generated CSS/skin manifests, define the complete13x11 ROI.
const sources = [
  ['dust_selectable_1.png', '7d11095615a91dc797b4591ac85c1c35eac5172277658f7493e44d08486b952c', 1, false],
  ['dust_selectable_2.png', '9bb932cbe9d262d75c80ba871b4577b1317ab7542f922fdebcce5ea19152bbd7', 2, false],
  ['dust_selectable_3.png', 'ef2253ebad67add5e868312299778630ce3806f5190304021ba1cb74f9038611', 3, false],
  ['dust_unselectable_1.png', '0f88f72c2a4a1aa97235183c56ef1691d693f5ee26ea121a0b17555301ffa593', 1, true],
  ['dust_unselectable_2.png', '17d85a310fb8134dbb00dd9f4c05cb1b76e86c2ed618b07c09e04a929b232840', 2, true],
  ['dust_unselectable_3.png', '58b22d39de34ebba554f97602f7c75e28e0a4632173f06e2eb68ea4d74683196', 3, true],
] as const;
async function original(file: string, sha: string) {
  const bytes = await readFile(new URL(`../.cache/references/${file}`, import.meta.url));
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha);
  const image = PNG.sync.read(bytes);expect([image.width, image.height]).toEqual([13, 11]);return { bytes, image };
}

test('all six complete source RGBA textures are13x11 and preserve their distinct baked artwork', async () => {
  const shapes: string[] = [];
  for (const [file, sha] of sources) {
    const { image } = await original(file, sha);
    expect([...image.data].filter((value, index) => index % 4 === 3 && value > 0).length).toBeGreaterThan(0);
    expect([...image.data].filter((value, index) => index % 4 === 3 && value === 0).length).toBeGreaterThan(0);
    shapes.push(createHash('sha256').update(image.data).digest('hex'));
  }
  expect(new Set(shapes).size).toBe(6);
});

test('all tier and disabled dust sprites retain source aspect and every source pixel at GUI2', async ({ page }, testInfo) => {
  await page.goto('/demo/dialog-sizing-fixture.html');await page.evaluate(() => document.fonts.ready);await page.mouse.move(0, 0);
  await page.evaluate(async states => {
    const reactPath = '/@id/react', domPath = '/@id/react-dom/client', optionPath = '/src/workstations.tsx';
    const [r, d, module] = await Promise.all([import(reactPath), import(domPath), import(optionPath)]);
    const React = r.default ?? r, ReactDOM = d.default ?? d;
    const host = document.createElement('section');host.id = 'dust-source-probe';host.style.cssText = 'position:fixed;left:16px;top:16px;width:216px;background:#28292a;z-index:999;';
    document.body.appendChild(host);
    // Isolate transparent sprite pixels over a known opaque plane. The source
    // background image, box size and source positioning remain production-owned.
    const style = document.createElement('style');style.textContent = '#dust-source-probe .mc-enchanting__option::before{display:none}';document.head.appendChild(style);
    ReactDOM.createRoot(host).render(React.createElement('div', {}, states.map(([tier, disabled], index) => React.createElement(module.EnchantmentOption,
      { key: index, id: String(index), tier, disabled, label: `Dust ${index}`, level: 1,
        style: { display: 'block', height: 40, background: '#28292a' } }))));
  }, sources.map(([, , tier, disabled]) => [tier, disabled] as const));
  const buttons = page.locator('#dust-source-probe button');await expect(buttons).toHaveCount(6);
  for (let index = 0; index < sources.length; index++) {
    const [file, sha] = sources[index]!, { bytes } = await original(file, sha), button = buttons.nth(index), dust = button.locator('.mc-enchanting__dust');
    const outer = await button.boundingBox(), box = await dust.boundingBox();
    expect([box!.width, box!.height]).toEqual([26, 22]);
    expect(box!.x - outer!.x).toBe(6);expect(box!.y - outer!.y).toBe((outer!.height - 22) / 2);
    const expected = await page.evaluate(async base64 => {
      const image = new Image();image.src = 'data:image/png;base64,' + base64;await image.decode();
      const canvas = document.createElement('canvas');canvas.width = 26;canvas.height = 22;
      const context = canvas.getContext('2d')!;context.fillStyle = '#28292a';context.fillRect(0, 0, 26, 22);
      context.imageSmoothingEnabled = false;context.drawImage(image, 0, 0, 26, 22);
      return [...context.getImageData(0, 0, 26, 22).data];
    }, bytes.toString('base64'));
    const actualBytes = await dust.screenshot(), actual = PNG.sync.read(actualBytes);
    expect([actual.width, actual.height]).toEqual([26, 22]);
    expect(actual.data.equals(Buffer.from(expected)), `${file}: complete572pixel RGBA region, no mask/tolerance`).toBe(true);
    await testInfo.attach(file + '-actual-full-roi', { body: actualBytes, contentType: 'image/png' });
  }
});
