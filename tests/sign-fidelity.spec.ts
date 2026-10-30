import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import type { SignFixtureSettings } from '../demo/sign-fixture';

// Fixed original Mojang v1.26.60.5 ZIP SHA256
// d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf.
// Source sign_screen.json SHA256 93e8647009c4544d46ddf3453f6a5ee54274e1efdae9fbfdb0d60f3c7895bbc6.
// These whole-file identities and logical formulas are independent of the
// production registry. They do not certify native GUI/font/pixel rendering.
const originals = [
  [
    "sign.png",
    "340fdeb4a3b49ee2002a876cd2fab724d96f92b795bb24455ebd81a1d4ed3afa",
    24,
    12
  ],
  [
    "hanging_sign.png",
    "0e01fadd553227cefa81e1d3caebfd5ff85afe1f4e66cf4b932611bbb275d77c",
    16,
    16
  ],
  [
    "sign_acacia.png",
    "493f9a358c8e25ba92cc9ec0b139c53cb5d224c627118aacb96a5bdd6e21351d",
    24,
    12
  ],
  [
    "sign_birch.png",
    "6f70b64e6d4b5c2312465730988ced6a4397eda9b92d1479b09eb0f369192ca7",
    24,
    12
  ],
  [
    "sign_jungle.png",
    "6f08d20d3b66bd43dccea852c53e0bbe8e3ae249f52276dfcc9eec1e4bcc321b",
    24,
    12
  ],
  [
    "sign_darkoak.png",
    "330f3ca22f0c630eca2a76f2470df21bb2a289f7465a492a182b15b25d27be11",
    24,
    12
  ],
  [
    "sign_spruce.png",
    "e40c2291e34dd73f4856beeab2eef0fd5ede298feda0092454a3d81afa3287dd",
    24,
    12
  ],
  [
    "sign_warped.png",
    "1b6fe1b4dba2502b5dacda55eae0f7d8e92d1b0fd147ecd378b345145d4eb451",
    24,
    12
  ],
  [
    "sign_crimson.png",
    "969760cbd18c1122c000dabe05acbf7bd1d3d77a3c46572caca558fb90e396f9",
    24,
    12
  ],
  [
    "bamboo_sign.png",
    "3bb328ee96114ef2fe05bf36b975daf11d35b10a3fc3b4cae9cd80a65cb0f4dc",
    24,
    12
  ],
  [
    "mangrove_sign.png",
    "fc4e1c333d6eda2b467b95ccf0c582b0449512306d4d351a7f96627ecb76c1b3",
    24,
    12
  ],
  [
    "cherry_sign.png",
    "8ee22aff89d4c624c014989409866fd2bedb3140351ebcc395a4a203e2f28c78",
    24,
    12
  ],
  [
    "pale_oak_sign.png",
    "88737cd44cc824c80da2f3d346a81c550e88044e5862498281e7a6dcdd43c008",
    24,
    12
  ],
  [
    "poplar_sign.png",
    "aa8fc3b7862f6ec1057245ecf73415ea2f36d798e8dfe4cda676e8abbf2bbb75",
    24,
    12
  ],
  [
    "hanging_sign_birch.png",
    "176735888bd9018b584d24d4d9f7a6f9421b6921fe9127c147c4271cdddea907",
    16,
    16
  ],
  [
    "hanging_sign_cherry.png",
    "1f2b4032972b07f6983693da6961eb2b5d5d8a09df9e13e67cb92cc230b6467d",
    16,
    16
  ],
  [
    "hanging_sign_bamboo.png",
    "8f36be03167d28ad38d7e26eb0fa4d2b1c598b8507ace781b6a6bc5c032c41d3",
    16,
    16
  ],
  [
    "hanging_sign_jungle.png",
    "eb9abcd43fde8ab131b0250c99a341e2eed28e2c632f8834e469994b52794be5",
    16,
    16
  ],
  [
    "hanging_sign_darkoak.png",
    "6083bda509c0d737f16f8de9bcee55a536769d1095cb5932306eb3a19d3104be",
    16,
    16
  ],
  [
    "hanging_sign_warped.png",
    "a5ce5664938d4cf48419428d2b94bc395a8440b9ec97f2ae3ef95964d6a832a9",
    16,
    16
  ],
  [
    "hanging_sign_pale_oak.png",
    "7b30da3d8c52845aace0d657718abfabc3d9c568b342f710ac4c032e8e3bc4e8",
    16,
    16
  ],
  [
    "hanging_sign_acacia.png",
    "ac70733a909d7126ba1df161fbd82fefd15fa751923cb376ec270570fc00f566",
    16,
    16
  ],
  [
    "hanging_sign_mangrove.png",
    "6de6bd1d0be1f6fe94787611b93941d5fddfb17ab7bee552f140550945961f69",
    16,
    16
  ],
  [
    "hanging_sign_poplar.png",
    "7e63b0e77e91287f1a91a60382eab399ba0ac402d0695c677d92d2e88b6db7c7",
    16,
    16
  ],
  [
    "hanging_sign_spruce.png",
    "8423f90663445566703dbdaff2a488f7b8d051a3f87ccb40a31c9c0332b3e1d9",
    16,
    16
  ],
  [
    "hanging_sign_crimson.png",
    "432f2b542ea5779ac625462d1157e046089eb470a4230403724a858740c554a2",
    16,
    16
  ]
] as const;

type Rect = { x: number; y: number; width: number; height: number };
async function box(locator: Locator): Promise<Rect> { const result = await locator.boundingBox(); if (!result) throw new Error('Missing sign geometry region'); return result; }
async function configure(page: Page, patch: Partial<SignFixtureSettings>) {
  await page.evaluate(value => window.signQA.configure(value), patch);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
async function open(page: Page, patch: Partial<SignFixtureSettings> = {}) {
  await page.goto('/demo/sign-fixture.html'); await expect.poll(() => page.evaluate(() => window.signQA?.mounted)).toBe(true);
  await configure(page, { value: '', open: false, ...patch }); await page.evaluate(() => document.fonts.ready);
}
const surface = (page: Page) => page.locator('#sign-surface-host');
async function geometry(page: Page, expected: { editor: readonly [number, number]; offset: readonly [number, number]; background: readonly [number, number]; backgroundOffset: readonly [number, number] }, scale: number) {
  const root = surface(page), frame = await box(root), input = await box(root.locator('textarea')), image = await box(root.locator('.mc-sign-surface__background'));
  expect([frame.width, frame.height]).toEqual(expected.editor.map(size => size * scale));
  expect([input.width, input.height]).toEqual(expected.editor.map(size => size * scale));
  expect(Math.abs(input.x + input.width / 2 - frame.x - frame.width / 2 - expected.offset[0] * scale)).toBeLessThanOrEqual(.02);
  expect(Math.abs(input.y + input.height / 2 - frame.y - frame.height / 2 - expected.offset[1] * scale)).toBeLessThanOrEqual(.02);
  expect([image.width, image.height]).toEqual(expected.background.map(size => size * scale));
  expect(Math.abs(image.x + image.width / 2 - input.x - input.width / 2 - expected.backgroundOffset[0] * scale)).toBeLessThanOrEqual(.02);
  expect(Math.abs(image.y + image.height / 2 - input.y - input.height / 2 - expected.backgroundOffset[1] * scale)).toBeLessThanOrEqual(.02);
}

test('all26 original full PNG sources and license retain independent upstream SHA/dimensions', async () => {
  expect(originals).toHaveLength(26);
  for (const [file, hash, width, height] of originals) {
    const bytes = await readFile(new URL(`../src/assets/sign/${file}`, import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex'), file).toBe(hash);
    const png = PNG.sync.read(bytes); expect([png.width, png.height], file).toEqual([width, height]);
  }
  const license = await readFile(new URL('../src/assets/sign/LICENSE.md', import.meta.url));
  expect(createHash('sha256').update(license).digest('hex')).toBe('ca18c0dede68ce24ea1cd6f9df0813579b6f9f979787983a50baec99345f975d');
  const manifest = JSON.parse(await readFile(new URL('../docs/sign-assets.json', import.meta.url), 'utf8'));
  expect(manifest.archiveSha256).toBe('d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf');
  expect(manifest.resources).toHaveLength(26);
});

test('regular surface keeps source editor frame/offset and whole24x12 candidate image contain geometry', async ({ page }) => {
  await open(page, { variant: 'regular', scale: 2 });
  // Raw source box192x93 with offset[-1,-5], editor185x90 with inherited[0,5].
  // Explicit contain policy applied to the whole24x12 PNG gives186x93; this
  // generic aspect-fit math is not a native shader/layout pixel comparison.
  await geometry(page, { editor: [185, 90], offset: [0, 5], background: [24 * Math.min(192 / 24, 93 / 12), 93], backgroundOffset: [-1, -5] }, 2);
  await expect(surface(page)).toHaveAttribute('data-sign-background-fit', 'contain');
  await expect(surface(page)).toHaveAttribute('data-sign-texture-source', 'source-candidate');
  await expect(surface(page).locator('textarea')).toHaveCSS('text-align', 'center');
  await expect(surface(page).locator('textarea')).toHaveCSS('text-shadow', 'none');
  expect(await surface(page).locator('.mc-sign-surface__background').evaluate(async node => { const image = node as HTMLImageElement; await image.decode(); return [image.naturalWidth, image.naturalHeight]; })).toEqual([24, 12]);
});

test('hanging surface retains126x90 editor and source287x143 box offsets with whole square artwork', async ({ page }) => {
  await open(page, { variant: 'hanging', scale: 2 });
  // Whole16x16 fits inside source287x143 =>143x143. Do not stretch it to
  // 287x143 or silently recenter the declared backgroundOffset[0,-32].
  await geometry(page, { editor: [126, 90], offset: [0, 5], background: [143, 143], backgroundOffset: [0, -32] }, 2);
  const background = surface(page).locator('.mc-sign-surface__background');
  expect(await background.evaluate(async node => { const image = node as HTMLImageElement; await image.decode(); return [image.naturalWidth, image.naturalHeight]; })).toEqual([16, 16]);
  await expect(surface(page)).toHaveCSS('overflow', 'visible');
  await page.locator('#open-editor').click();
  const modal = page.locator('dialog.mc-sign-editor'); await expect(modal).toBeVisible();
  const frame = await box(modal.locator('.mc-sign-surface')), viewport = page.viewportSize()!;
  expect(Math.abs(frame.x + frame.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(.02);
  expect(Math.abs(frame.y + frame.height / 2 - viewport.height / 2)).toBeLessThanOrEqual(.02);
});

test('all26 whole caller textures switch without replacing the live textarea or inferring a crop', async ({ page }) => {
  await open(page, { value: 'Preserved text' });
  await surface(page).locator('textarea').evaluate(node => { (window as unknown as { signTextureNode: Node }).signTextureNode = node; });
  for (const [file, , width, height] of originals) {
    // Filename here is only the explicit fixture input. It does not establish
    // an engine wood/type/default association for the26 source-bank entries.
    const variant = file.startsWith('hanging_') ? 'hanging' : 'regular';
    await configure(page, { variant, texture: { src: `/src/assets/sign/${file}`, sourceSize: [width, height] } });
    await expect(surface(page)).toHaveAttribute('data-sign-texture-source', 'caller');
    await expect(surface(page).locator('textarea')).toHaveValue('Preserved text');
    expect(await surface(page).locator('textarea').evaluate(node => node === (window as unknown as { signTextureNode: Node }).signTextureNode)).toBe(true);
    const image = await surface(page).locator('.mc-sign-surface__background').evaluate(async node => {
      const image = node as HTMLImageElement; await image.decode();
      return { path: new URL(image.currentSrc).pathname, size: [image.naturalWidth, image.naturalHeight] };
    });
    expect(image.path.endsWith(`/sign/${file}`)).toBe(true); expect(image.size).toEqual([width, height]);
  }
});

test('explicit host geometry/stretch/color/font controls retain a chrome-free surface and clipped native scrollbar policy', async ({ page }) => {
  await open(page, { scale: 1, backgroundFit: 'stretch', geometry: { editorSize: [150, 80], backgroundOffset: [2, -7] }, textColor: '#123456', textShadow: '2px 2px 0 #000', fontMode: 'unicode' });
  await geometry(page, { editor: [150, 80], offset: [0, 5], background: [192, 93], backgroundOffset: [2, -7] }, 1);
  await expect(surface(page)).toHaveAttribute('data-sign-background-fit', 'stretch');
  await expect(surface(page)).toHaveAttribute('data-sign-font-mode', 'unicode');
  await expect(surface(page).locator('textarea')).toHaveCSS('color', 'rgb(18, 52, 86)');
  await expect(surface(page).locator('textarea')).toHaveCSS('text-shadow', 'rgb(0, 0, 0) 2px 2px 0px');
  await configure(page, { value: Array.from({ length: 200 }, () => 'Long sign content').join('\n') });
  const input = surface(page).locator('textarea');
  await expect(input).toHaveCSS('overflow-x', 'hidden'); await expect(input).toHaveCSS('overflow-y', 'hidden');
  await expect(input).toHaveCSS('resize', 'none'); await expect(input).toHaveCSS('border-top-width', '0px');
  expect(await input.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
  await expect(surface(page).locator('header,button,.mc-panel,.mc-scroll-area,.mc-dialog__header,.mc-dialog__footer')).toHaveCount(0);
  await page.locator('#open-editor').click(); const modal = page.locator('dialog.mc-sign-editor'); await expect(modal).toBeVisible();
  await expect(modal.locator('header,button,.mc-panel,.mc-scroll-area,.mc-dialog__header,.mc-dialog__footer')).toHaveCount(0);
  await expect(modal).toHaveCSS('overflow', 'hidden');
  const dim = await modal.evaluate(node => {
    const colors = [getComputedStyle(node).backgroundColor, getComputedStyle(node, '::backdrop').backgroundColor]
      .map(value => value.match(/[\d.]+/g)!.map(Number)).map(channels => ({ rgb: channels.slice(0, 3), alpha: channels[3] ?? 1 }));
    return { layers: colors, alpha: 1 - (1 - colors[0]!.alpha) * (1 - colors[1]!.alpha) };
  });
  for (const layer of dim.layers) if (layer.alpha > 0) expect(layer.rgb).toEqual([0, 0, 0]);
  expect(dim.alpha).toBeCloseTo(.4, 8);
});
