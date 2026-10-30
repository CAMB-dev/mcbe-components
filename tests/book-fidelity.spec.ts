import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';

// Independent whole-file originals from Mojang v1.26.60.5 full ZIP
// d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf.
// Expected bytes and source formulas are independent of the production registry.
// Browser pixel comparisons below establish an explicit CSS/POINT host contract;
// they are not a native Minecraft full-screen rendering oracle.
const originals = [
  [
    "book_addtextpage_default.png",
    "ae808e629564cb11374c48c8d1f5cbe60641504f75e5d06b1fe4faeb18e620f5",
    16,
    16
  ],
  [
    "book_addtextpage_hover.png",
    "46dfabbfa46010976f65b76df26dc6cfc56c08e8a111d54877f8aa16450fd431",
    16,
    16
  ],
  [
    "book_addtextpage_pressed.png",
    "14e0666e2f5c13ad402a9cd3a44ba51fa4bcd7d37d040023ba6f7d12831c09c0",
    16,
    16
  ],
  [
    "book_back.png",
    "450ee4837e908ba3a9026815a185d2f35752620f9545547dee523c386552f418",
    28,
    28
  ],
  [
    "book_cover.png",
    "d819b8ab181e8ac3e3a1b268510500fcae9fbab83d4da1c0e1d0b9d2600b5d38",
    28,
    28
  ],
  [
    "book_edit_default.png",
    "1b442b1736bea77e8c514d6281a462864985f241fb7a23dd96b865391fa9288a",
    18,
    16
  ],
  [
    "book_edit_hover.png",
    "8f59b789f70226eb37e7a0018e8717d98747d0f85c11f69244a00434f3c2eca8",
    18,
    16
  ],
  [
    "book_edit_pressed.png",
    "d011e645ded169cdd8d3df36320294b5d5d635baa55f4db48f6b7d55d9aa3fbf",
    18,
    16
  ],
  [
    "book_pagecrease_left.png",
    "3970bdabeee0b40b925e2d9766db91f1aa4f927f8dd9b644e3029dc67f96ef24",
    110,
    14
  ],
  [
    "book_pagecrease_right.png",
    "20fd22ed3e4f19c95a83fd49dfa4d86104e272fc634e5a52675a4fce48c1eeaa",
    110,
    14
  ],
  [
    "book_pageedge_left.png",
    "0b1d34903671082eefe05e270b9e810eb2eacdeca9bb22bc845bb4ef673da0e7",
    40,
    120
  ],
  [
    "book_pageedge_right.png",
    "b1f2b78775d7ee788404e82566d2187ba43559e35b1ff2fa66dcf2d9c9d35671",
    40,
    120
  ],
  [
    "book_pageleft_default.png",
    "05eb7c5428b5017adb52289684ac22b22477975746d1b6ebd2249a65682f7242",
    24,
    24
  ],
  [
    "book_pageleft_hover.png",
    "d85322b62542800f687aeca2914263043d310aa85f0d16d1c2534b0992f75345",
    24,
    24
  ],
  [
    "book_pageleft_pressed.png",
    "bd0b403c54f2be0c6abe9050e4d79fdcd8a0c3d036d711015ec7146cd5a7d8d1",
    24,
    24
  ],
  [
    "book_pageright_default.png",
    "5131dd0d2bac6dc947d5a813d12dffddfa0084a2fa57c7e50f3ef52168b398af",
    24,
    24
  ],
  [
    "book_pageright_hover.png",
    "9da83307cca13d435090f5ff7d0813cacd39ba308a14db97fd2b9b87dba82090",
    24,
    24
  ],
  [
    "book_pageright_pressed.png",
    "5800fd45b04796e9ff270d74993ea2b64b93c1aec20ed3112ae8b1285319c56e",
    24,
    24
  ],
  [
    "book_shiftleft_default.png",
    "05948b670a11e4f622ea802ed4fe7d6479e4a26ac410fa0feb8bd71fe62dbbec",
    23,
    16
  ],
  [
    "book_shiftleft_hover.png",
    "0ce6625bd3f47543594f0736df1a293cdc9efcb891ebb03b9b64adc980a369fd",
    23,
    16
  ],
  [
    "book_shiftleft_pressed.png",
    "f54a6f4c28c061b0f6697cbc7310d83e3732744c466ee32f8946086081f61a68",
    23,
    16
  ],
  [
    "book_shiftright_default.png",
    "53e8c5e09b91da6c2393769fa6a4797b4a6cd6f2bc979575bd60547c6666b0bc",
    23,
    16
  ],
  [
    "book_shiftright_hover.png",
    "f9386d897d82456d2ce37e3bf5c5cfee85a3c3757a69f3c79f92913dad402df4",
    23,
    16
  ],
  [
    "book_shiftright_pressed.png",
    "a979f7f016d2e9ec2ec36accfdd392ef1cd5e2641d6b5b1f2f5d591fd2cba146",
    23,
    16
  ],
  [
    "book_spine.png",
    "574abad8bc565244e99d69a522ef8c9cd030604fc6b52d08e773c2c4fb0c50ba",
    8,
    1
  ],
  [
    "book_texteditbox_hover.png",
    "426d686b6f38c1e9d48c240848aa52e02ccb1d09506c1be0183c9c24aed80901",
    4,
    4
  ],
  [
    "book_trash_default.png",
    "ebadf8235a65ee290c18a862c538b6700f67ac65a480576d7853fda57ad19671",
    16,
    16
  ],
  [
    "close_button_default.png",
    "5160569f357e661d38495b3f84c89f84b30cc6fdd87c796b65f457cae529054c",
    15,
    15
  ],
  [
    "close_button_hover.png",
    "16c89ba672607da0c452dacc79129f8eee995555bd061f51a1cb5bbab57bb877",
    15,
    15
  ],
  [
    "close_button_pressed.png",
    "9abf4fcaf21fbbfa09ee1aeb8599288d5a781b57b08b3e4b2848b54cb217aa03",
    15,
    15
  ],
  [
    "trash_hover.png",
    "3fa17ecc575f5f0c940e6f5ec1c6be71841ab285b17f9010dac2671ee14d8547",
    16,
    16
  ],
  [
    "trash_pressed.png",
    "cd3d86db98985b34f6b0834f3e18fbcdbbbac2a0588775f26af76eb4d0f72d55",
    16,
    16
  ]
] as const;
const metadata = [
  [
    "book_back.json",
    "6f1ae4201c7a89b06931c852aaaf5ae5259bb4bd5d2ccc56dffe3cf658ab6d35",
    {
      "nineslice_size": 14,
      "base_size": [
        28,
        28
      ]
    }
  ],
  [
    "book_cover.json",
    "6f1ae4201c7a89b06931c852aaaf5ae5259bb4bd5d2ccc56dffe3cf658ab6d35",
    {
      "nineslice_size": 14,
      "base_size": [
        28,
        28
      ]
    }
  ],
  [
    "book_pagecrease_left.json",
    "3a22cddfba75886f5a4c36c420efab5506da29db00dd8a77a95c5fd14f0d19e8",
    {
      "nineslice_size": 7,
      "tiled": true,
      "base_size": [
        110,
        14
      ]
    }
  ],
  [
    "book_pagecrease_right.json",
    "3a22cddfba75886f5a4c36c420efab5506da29db00dd8a77a95c5fd14f0d19e8",
    {
      "nineslice_size": 7,
      "tiled": true,
      "base_size": [
        110,
        14
      ]
    }
  ],
  [
    "book_pageedge_left.json",
    "d52044878ae75e2873d6ca38573b9d2ee5d0521b8be3dda94b914c39f36852b2",
    {
      "nineslice_size": [
        40,
        40,
        0,
        40
      ],
      "tiled": true,
      "base_size": [
        40,
        120
      ]
    }
  ],
  [
    "book_pageedge_right.json",
    "d8532f8f3ae7badc7b58957b28c5799e10c1f2e48e8528f44a5cc0116a791548",
    {
      "nineslice_size": [
        0,
        40,
        40,
        40
      ],
      "tiled": true,
      "base_size": [
        40,
        120
      ]
    }
  ],
  [
    "book_spine.json",
    "86694989347928ead15ba47f2e912dc1cfbbd999aa963c543cb010289ae648a7",
    {
      "nineslice_size": [
        4,
        1,
        4,
        1
      ],
      "base_size": [
        8,
        2
      ]
    }
  ],
  [
    "book_texteditbox_hover.json",
    "622158df366964d9ddeac5ed9938a43522da68d02c060335b853c9730103ad65",
    {
      "nineslice_size": 1,
      "base_size": [
        4,
        4
      ]
    }
  ]
] as const;

type Rect = { x: number; y: number; width: number; height: number };
async function box(locator: Locator): Promise<Rect> {
  const result = await locator.boundingBox(); if (!result) throw new Error('Missing book comparison region'); return result;
}
async function open(page: Page) {
  await page.goto('/demo/book-fixture.html');
  await expect.poll(() => page.evaluate(() => window.bookQA?.mounted)).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
}
async function relative(locator: Locator, parent: Locator, expected: readonly [number, number, number, number], unit = 2) {
  const actual = await box(locator), origin = await box(parent);
  const coordinates = [actual.x - origin.x, actual.y - origin.y, actual.width, actual.height];
  for (let index = 0; index < 4; index++) expect(Math.abs(coordinates[index]! - expected[index]! * unit)).toBeLessThanOrEqual(.02);
}
const root = (page: Page) => page.locator('#primary .mc-book');
async function skinPixels(locator: Locator) {
  await locator.evaluate(async node => {
    const urls = new Set<string>();
    for (const child of [node, ...node.querySelectorAll('*')]) {
      const background = getComputedStyle(child).backgroundImage;
      if (background.startsWith('url(')) {
        const raw = background.slice(4, -1); urls.add(raw.startsWith('"') ? JSON.parse(raw) as string : raw);
      }
    }
    await Promise.all([...urls].map(async url => { const image = new Image(); image.src = url; await image.decode(); }));
  });
  return PNG.sync.read(await locator.screenshot({ caret: 'initial' }));
}
function rgba(image: PNG, x: number, y: number) { return [...image.data.subarray((y * image.width + x) * 4, (y * image.width + x) * 4 + 4)]; }

test('all32 whole original PNGs and8 companion metadata retain fixed upstream identities', async () => {
  expect(originals).toHaveLength(32); expect(metadata).toHaveLength(8);
  for (const [file, hash, width, height] of originals) {
    const bytes = await readFile(new URL(`../src/assets/book/${file}`, import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex'), file).toBe(hash);
    const image = PNG.sync.read(bytes); expect([image.width, image.height], file).toEqual([width, height]);
  }
  for (const [file, hash, expected] of metadata) {
    const bytes = await readFile(new URL(`../src/assets/book/${file}`, import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex'), file).toBe(hash);
    expect(JSON.parse(bytes.toString('utf8')), file).toEqual(expected);
  }
  // The1-row actual spine is intentionally different from declared base_size8x2.
  expect(originals.find(row => row[0] === 'book_spine.png')?.slice(2)).toEqual([8, 1]);
  const provenance = JSON.parse(await readFile(new URL('../docs/book-assets.json', import.meta.url), 'utf8'));
  expect(provenance.archiveSha256).toBe('d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf');
  const license = await readFile(new URL('../src/assets/book/LICENSE.md', import.meta.url));
  expect(createHash('sha256').update(license).digest('hex')).toBe('ca18c0dede68ce24ea1cd6f9df0813579b6f9f979787983a50baec99345f975d');
});

test('nominal spread/pages, spine, turn and close anchors follow independent ClassicJSON scopes', async ({ page }) => {
  await open(page);
  const book = root(page), surface = book.locator('.mc-book__surface');
  const bounds = await box(surface); expect([bounds.width, bounds.height]).toEqual([320 * 2, 207 * 2]);
  await relative(book.locator('.mc-book__page[data-side="left"]'), surface, [0, 0, 160, 207]);
  await relative(book.locator('.mc-book__page[data-side="right"]'), surface, [160, 0, 160, 207]);
  await relative(book.locator('.mc-book__spine'), surface, [(320 - 8) / 2, 1, 8, 207 - 2]);
  await relative(book.locator('.mc-book__turn[data-direction="next"]'), surface, [320 - 7 - 24, 207 - 9 - 24, 24, 24]);
  await page.evaluate(() => window.bookQA.configure({ spreadIndex: 1 }));
  await relative(book.locator('.mc-book__turn[data-direction="previous"]'), surface, [7, 207 - 9 - 24, 24, 24]);
  await relative(book.locator('[data-book-action="close"]'), surface, [320 - 14 - 14, 7, 14, 14]);
  await page.evaluate(() => window.bookQA.configure({ skinProbe: 'back-only' }));
  const isolated = page.locator('#skin-probe .mc-book__surface');
  await expect(isolated).toBeVisible();
  const original = PNG.sync.read(await readFile(new URL('../src/assets/book/book_back.png', import.meta.url)));
  const actual = await skinPixels(isolated);
  // Source28x28, slice14 => both center axes are zero. The explicit host
  // contract extends the original boundary texel14,14 over the inner area.
  for (const [x, y] of [[60, 60], [160, 100], [260, 160]] as const) expect(rgba(actual, x * 2 + 1, y * 2 + 1)).toEqual(rgba(original, 14, 14));
});

test('page decorations/text retain source anchors and captured Book crease uses nine-slice stretch', async ({ page }, testInfo) => {
  await open(page);
  for (const side of ['left', 'right'] as const) {
    const leaf = root(page).locator(`.mc-book__page[data-side="${side}"]`);
    // Raw source: page_panel 160x207; crease [100%-40,100%-14], right/left middle [0,-2].
    await relative(leaf.locator('.mc-book__page-crease'), leaf, [side === 'left' ? 40 : 0, (207 - (207 - 14)) / 2 - 2, 160 - 40, 207 - 14]);
    // Raw source: edge [100%-7,100%-16] anchored left/right middle, offsets [+/-7,-1].
    await relative(leaf.locator('.mc-book__page-edge'), leaf, [side === 'left' ? 7 : 0, (207 - (207 - 16)) / 2 - 1, 160 - 7, 207 - 16]);
    // Retire the old textarea==outer edit-box assumption. book.page_text is
    // 128x149, but common.text_edit_box contributes centering insets3/2;
    // multiline clip_offset[0,-3] expands the distinct clipping rectangle.
    const outerX = (160 - (160 - 32)) / 2 + (side === 'left' ? 5 : -5);
    await relative(leaf.locator('.mc-book__text-box'), leaf, [outerX, 23, 160 - 32, 207 - 58]);
    await relative(leaf.locator('.mc-book__text-center'), leaf, [outerX + 3, 23 + 2, 160 - 32 - 6, 207 - 58 - 4]);
    await relative(leaf.locator('.mc-book__text-clip'), leaf, [outerX + 3, 23 + 2 - 3, 160 - 32 - 6, 207 - 58 - 4 + 6]);
    await relative(leaf.locator('textarea'), leaf, [outerX + 3, 23 + 2 - 3, 160 - 32 - 6, 207 - 58 - 4 + 6]);
    const number = await box(leaf.locator('.mc-book__page-number')), parent = await box(leaf);
    expect(number.y - parent.y).toBe(13 * 2);
    expect(number.x + number.width / 2 - parent.x).toBe((80 + (side === 'left' ? 5 : -5)) * 2);
    await expect(leaf.locator('textarea')).toHaveCSS('color', 'rgb(0, 0, 0)');
    await expect(leaf.locator('textarea')).toHaveCSS('text-shadow', 'none');
  }
  await page.evaluate(() => window.bookQA.configure({ skinProbe: 'crease-only' }));
  const isolated = page.locator('#skin-probe .mc-book__surface');
  await expect(isolated).toBeVisible();
  const original = PNG.sync.read(await readFile(new URL('../src/assets/book/book_pagecrease_left.png', import.meta.url)));
  const actual = await skinPixels(isolated);
  // Native G51/52 each contain nine affine quads with POINT/CLAMP sampling.
  // The original tiled:true metadata does not produce repeats in these Book
  // draws: center96 source texels stretch over106 logical destination units.
  // The real middle row is uniform; these samples establish fill only.
  expect(rgba(actual, 137 * 2 + 1, 60 * 2 + 1)).toEqual(rgba(original, 89, 7));
  expect(rgba(actual, 147 * 2 + 1, 60 * 2 + 1)).toEqual(rgba(original, 98, 7));
  await page.evaluate(() => window.bookQA.configure({ skinProbe: 'crease-pattern' }));
  await expect(page.locator('main')).toHaveAttribute('data-skin-probe', 'crease-pattern');
  const pattern = await skinPixels(isolated);
  // Independent CSS whole-PNG reference: fixed source110x14/cuts7 and
  // destination120x193 at scale2. Absolute pixel background sizes/offsets
  // express each source window, without reading the production helper/styles.
  // This is a CSS host contract, not an ideal/native POINT raster oracle:
  // exact texel-boundary ties need not match a JavaScript floor calculation.
  const referenceSource = new PNG({ width: 110, height: 14 });
  for (let y = 0; y < 14; y++) for (let x = 0; x < 110; x++) {
    referenceSource.data.set([x, y * 9, 255 - x, 255], (y * 110 + x) * 4);
  }
  const sourceUrl = `data:image/png;base64,${PNG.sync.write(referenceSource).toString('base64')}`;
  await page.evaluate(async sourceUrl => {
    document.getElementById('crease-css-reference')?.remove();
    const image = new Image(); image.src = sourceUrl; await image.decode();
    const host = document.createElement('div'); host.id = 'crease-css-reference';
    host.style.cssText = 'position:fixed;left:8px;top:8px;width:240px;height:386px;pointer-events:none;z-index:99999';
    const sourceX = [0, 7, 103, 110], sourceY = [0, 7, 7, 14];
    const destinationX = [0, 14, 226, 240], destinationY = [0, 14, 372, 386];
    for (let row = 0; row < 3; row++) for (let column = 0; column < 3; column++) {
      const sx = sourceX[column]!, sy = sourceY[row]!;
      const sw = sourceX[column + 1]! - sx, sh = Math.max(1, sourceY[row + 1]! - sy);
      const left = destinationX[column]!, top = destinationY[row]!;
      const width = destinationX[column + 1]! - left, height = destinationY[row + 1]! - top;
      const cell = document.createElement('div');
      cell.style.cssText = `position:absolute;left:${left}px;top:${top}px;width:${width}px;height:${height}px;background-repeat:no-repeat;image-rendering:pixelated`;
      cell.style.backgroundImage = `url("${sourceUrl}")`;
      cell.style.backgroundSize = `${110 * width / sw}px ${14 * height / sh}px`;
      cell.style.backgroundPosition = `${-sx * width / sw}px ${-sy * height / sh}px`;
      host.append(cell);
    }
    document.body.append(host);
  }, sourceUrl);
  const referenceBytes = await page.locator('#crease-css-reference').screenshot({ caret: 'initial' });
  await page.locator('#crease-css-reference').evaluate(node => node.remove());
  const reference = PNG.sync.read(referenceBytes); expect([reference.width, reference.height]).toEqual([240, 386]);
  let differingPixels = 0;
  const differingColumns: Record<number, number> = {};
  for (let y = 0; y < 193 * 2; y++) for (let x = 0; x < 120 * 2; x++) {
    const expected = rgba(reference, x, y);
    if (!rgba(pattern, 40 * 2 + x, 5 * 2 + y).every((channel, index) => channel === expected[index])) {
      differingPixels++; differingColumns[x] = (differingColumns[x] ?? 0) + 1;
    }
  }
  await testInfo.attach('crease-actual-full-surface', { body: PNG.sync.write(pattern), contentType: 'image/png' });
  await testInfo.attach('crease-independent-css-whole-png-reference', { body: referenceBytes, contentType: 'image/png' });
  await testInfo.attach('crease-css-contract', { body: Buffer.from(JSON.stringify({ width: 240, height: 386, pixels: 92640, differingPixels, differingColumns,
    scope: 'Whole-PNG source-derived CSS reference; no native/ideal POINT tie claim, mask, skipped column, epsilon or tolerance.' })), contentType: 'application/json' });
  expect(differingPixels, 'complete240x386 independent CSS whole-PNG nine-slice stretch reference').toBe(0);
});

test('page content offsets shift row and pencil hit regions while whole pencil artwork uses contain', async ({ page }) => {
  await open(page);
  const original = await readFile(new URL('../src/assets/book/book_edit_default.png', import.meta.url));
  const source = PNG.sync.read(original); expect([source.width, source.height]).toEqual([18, 16]);
  for (const scale of [2, 5]) {
    await page.evaluate(scale => window.bookQA.configure({ scale, pages: ['Left', 'Right'], spreadIndex: 0, mode: 'pages', actions: true, actionView: 'row', readOnly: false, disabled: false }), scale);
    for (const side of ['left', 'right'] as const) {
      const leaf = root(page).locator(`.mc-book__leaf[data-side="${side}"]`);
      const row = await box(leaf.locator('.mc-book__page-actions')), parent = await box(leaf);
      // Source page_content_panel supplies opposite[+5,0]/[-5,0] offsets.
      expect(Math.abs(row.x + row.width / 2 - parent.x - (80 + (side === 'left' ? 5 : -5)) * scale)).toBeLessThanOrEqual(.02);
    }
    await page.evaluate(() => window.bookQA.configure({ actionView: 'edit' }));
    await page.mouse.move(0, 0);
    for (const side of ['left', 'right'] as const) {
      const leaf = root(page).locator(`.mc-book__leaf[data-side="${side}"]`), pencil = leaf.locator('[data-book-action="edit"]');
      // Source edit_page19x18, bottom_middle offset[0,-16], inside the
      // shifted content panel. Preserve the hitbox independently of its art.
      await relative(pencil, leaf, [(160 - 19) / 2 + (side === 'left' ? 5 : -5), 207 - 16 - 18, 19, 18], scale);
      await expect(pencil).toHaveCSS('background-size', 'contain');
      await expect(pencil).toHaveCSS('background-position', '50% 50%');
      await expect(pencil).toHaveCSS('background-repeat', 'no-repeat');
      await expect(pencil).toHaveCSS('image-rendering', 'pixelated');
      const background = await pencil.evaluate(node => getComputedStyle(node).backgroundImage);
      const rawUrl = background.slice(4, -1), url = rawUrl.startsWith('"') ? JSON.parse(rawUrl) as string : rawUrl;
      if (url.startsWith('data:')) expect(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')).toEqual(original);
      else { const response = await page.request.get(url); expect(response.ok()).toBe(true); expect(await response.body()).toEqual(original); }
      // Ordinary contain yields19x(19*16/18) artwork centered in19x18.
      // Native float/floor/half endpoint quantization is deliberately absent.
      const fit = Math.min(19 / source.width, 18 / source.height);
      expect(fit * source.width).toBe(19);
      expect(fit * source.height).toBeCloseTo(16.88888888888889, 10);
    }
  }
});

test('both24-square turn buttons use whole original default/hover/pressed pixels with no press displacement', async ({ page }, testInfo) => {
  await open(page);
  await page.addStyleTag({ content: '#standalone .mc-book__turn{background-color:rgb(25,50,71)}#standalone .mc-book__turn:focus-visible{outline:none;box-shadow:none}' });
  const results: { direction: string; state: string; pixels: number; differingPixels: number }[] = [];
  for (const direction of ['previous', 'next'] as const) {
    const button = page.locator(`#standalone .mc-book__turn[data-direction="${direction}"]`);
    await button.scrollIntoViewIfNeeded(); await page.mouse.move(0, 0); await button.blur();
    const initial = await box(button);
    for (const state of ['default', 'hover', 'pressed'] as const) {
      if (state === 'hover') await button.hover();
      if (state === 'pressed') await page.mouse.down();
      const imageName = `book_page${direction === 'previous' ? 'left' : 'right'}_${state}.png`;
      const bytes = await readFile(new URL(`../src/assets/book/${imageName}`, import.meta.url));
      const uri = `data:image/png;base64,${bytes.toString('base64')}`;
      await page.evaluate(async source => {
        document.getElementById('reference-plane')?.remove();
        const image = new Image(); image.src = source; await image.decode();
        image.id = 'reference-plane'; image.style.cssText = 'position:fixed;left:8px;top:8px;width:48px;height:48px;image-rendering:pixelated;background:rgb(25,50,71);pointer-events:none;z-index:99999'; document.body.append(image);
      }, uri);
      const actual = PNG.sync.read(await button.screenshot({ caret: 'initial' }));
      const expected = PNG.sync.read(await page.locator('#reference-plane').screenshot({ caret: 'initial' }));
      expect([actual.width, actual.height]).toEqual([48, 48]);
      expect([expected.width, expected.height]).toEqual([48, 48]);
      let differences = 0;
      for (let offset = 0; offset < actual.data.length; offset += 4) {
        if (actual.data[offset] !== expected.data[offset] || actual.data[offset + 1] !== expected.data[offset + 1] || actual.data[offset + 2] !== expected.data[offset + 2] || actual.data[offset + 3] !== expected.data[offset + 3]) differences++;
      }
      results.push({ direction, state, pixels: actual.width * actual.height, differingPixels: differences });
      expect(differences, `${direction} ${state} whole RGBA`).toBe(0);
      expect(await box(button)).toEqual(initial);
      if (state === 'pressed') await page.mouse.up();
    }
    await page.locator('#reference-plane').evaluate(node => node.remove());
  }
  await testInfo.attach('whole-original-point-browser-contract', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });
});

test('signing cover preserves source title/author/warning/close geometry and colors', async ({ page }) => {
  await open(page); await root(page).locator('[data-book-action="sign-open"]').click();
  const cover = root(page).locator('.mc-book__cover');
  const bounds = await box(cover); expect([bounds.width, bounds.height]).toEqual([160 * 2, 207 * 2]);
  await relative(cover.locator('.mc-book__title-input'), cover, [10, 46, 160 - 20, 14]);
  await relative(cover.locator('.mc-book__author'), cover, [13, 62, 160 - 26, 18]);
  await relative(root(page).locator('[data-book-action="close"]'), cover, [160 - 5 - 14, 5, 14, 14]);
  const label = await box(cover.locator('.mc-book__title-label')), warning = await box(cover.locator('.mc-book__warning'));
  expect(label.y - bounds.y).toBe(30 * 2); expect(warning.x - bounds.x).toBe(15 * 2); expect(warning.y - bounds.y).toBe(86 * 2); expect(warning.width).toBe((160 - 30) * 2);
  await expect(cover.locator('.mc-book__title-input input')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(cover.locator('.mc-book__author label')).toHaveCSS('color', 'rgb(170, 170, 170)');
  await expect(cover.locator('.mc-book__warning')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await page.evaluate(() => window.bookQA.configure({ skinProbe: 'cover-only', readOnly: true }));
  await expect(page.locator('main')).toHaveAttribute('data-skin-probe', 'cover-only');
  const original = PNG.sync.read(await readFile(new URL('../src/assets/book/book_cover.png', import.meta.url)));
  const actual = await skinPixels(cover);
  expect(rgba(actual, 80 * 2 + 1, 170 * 2 + 1)).toEqual(rgba(original, 14, 14));
});

test('explicit unitScale and narrow host retain nominal geometry and inert boundary placement', async ({ page }) => {
  await open(page); await page.setViewportSize({ width: 360, height: 900 });
  const book = root(page), surface = book.locator('.mc-book__surface');
  expect((await box(surface)).width).toBe(640);
  await page.evaluate(() => window.bookQA.configure({ scale: 1 }));
  await expect.poll(async () => (await box(surface)).width).toBe(320);
  await relative(book.locator('.mc-book__page[data-side="left"]'), surface, [0, 0, 160, 207], 1);
  const previous = book.locator('.mc-book__turn[data-direction="previous"]');
  await expect(previous).toHaveCSS('visibility', 'hidden'); await expect(previous).toBeDisabled();
  await expect(previous).toHaveAttribute('tabindex', '-1'); await expect(previous).toHaveAttribute('aria-hidden', 'true');
  // Hidden/inert keeps24x24 source allocation; no invented disabled texture/translation.
  expect(await previous.evaluate(node => [getComputedStyle(node).width, getComputedStyle(node).height, getComputedStyle(node).transform])).toEqual(['24px', '24px', 'none']);
});

test('book font role: standalone editable Page routes the whole value while explicit input family wins and static text stays unchanged', async ({ page }) => {
  await open(page);
  await page.evaluate(() => window.bookQA.configure({ fontProbe: true, standaloneText: 'Only Latin', standaloneFontMode: 'auto' }));
  const leaf = page.locator('#standalone .mc-book__page'), input = leaf.locator('textarea');
  await expect(input).toHaveCSS('font-family', 'monospace');
  const localGeometry = async () => {
    const parent = await box(leaf), field = await box(input);
    return [field.x - parent.x, field.y - parent.y, field.width, field.height, parent.width, parent.height];
  };
  const original = await localGeometry();
  await input.evaluate(node => { (window as unknown as { standaloneFontNode: Node }).standaloneFontNode = node; });
  await input.fill('A中B'); await expect(input).toHaveCSS('font-family', 'serif'); await expect(input).toHaveValue('A中B');
  await expect(input).toHaveAttribute('data-book-font-mode', 'unicode');
  await page.evaluate(() => window.bookQA.configure({ standaloneFontMode: 'latin' })); await expect(input).toHaveCSS('font-family', 'monospace');
  await page.evaluate(() => window.bookQA.configure({ standaloneText: 'ASCII', standaloneFontMode: 'unicode' })); await expect(input).toHaveCSS('font-family', 'serif');
  await page.evaluate(() => window.bookQA.configure({ standaloneInputFamily: 'cursive' })); await expect(input).toHaveCSS('font-family', 'cursive');
  expect(await localGeometry()).toEqual(original);
  expect(await input.evaluate(node => ({ same: node === (window as unknown as { standaloneFontNode: Node }).standaloneFontNode, ref: node === window.bookQA.refs.standaloneTextarea }))).toEqual({ same: true, ref: true });
  await page.evaluate(() => window.bookQA.configure({ standaloneReadOnly: true }));
  await expect(leaf.locator('textarea')).toHaveCount(0);
  await expect(leaf.locator('.mc-book__page-text')).toHaveCSS('font-family', 'monospace');
  await expect(leaf.locator('.mc-book__page-number')).toHaveCSS('font-family', 'monospace');
  expect(await page.evaluate(() => window.bookQA.refs.standaloneTextarea)).toBeNull();
});

test('book font role: editable Han family never spills into the other page, static Reader, page numbers or signing title/author', async ({ page }) => {
  await open(page);
  await page.evaluate(() => window.bookQA.configure({ fontProbe: true, pages: ['Latin left', 'Latin right'], readerPages: ['Reader 汉', 'Reader Latin'], title: 'Title 汉', author: '作者' }));
  const book = root(page), left = book.getByRole('textbox', { name: 'Leaf 1', exact: true }), right = book.getByRole('textbox', { name: 'Leaf 2', exact: true });
  await expect(left).toHaveCSS('font-family', 'monospace'); await expect(right).toHaveCSS('font-family', 'monospace');
  const unaffected = async () => page.evaluate(() => {
    const selectors = ['#primary .mc-book__page-number', '#secondary .mc-book__page-text', '#secondary .mc-book__page-number', '#primary .mc-book__title-input input', '#primary .mc-book__author input', '#primary .mc-book__turn'];
    return selectors.map(selector => ({ selector, styles: [...document.querySelectorAll(selector)].map(node => { const style = getComputedStyle(node); return { family: style.fontFamily, size: style.fontSize, lineHeight: style.lineHeight, shadow: style.textShadow, weight: style.fontWeight }; }) }));
  });
  const before = await unaffected();
  await left.fill('Mixed 汉 text'); await expect(left).toHaveCSS('font-family', 'serif');
  await expect(left).toHaveValue('Mixed 汉 text'); await expect(right).toHaveValue('Latin right'); await expect(right).toHaveCSS('font-family', 'monospace');
  expect(await unaffected()).toEqual(before);
  for (const readerText of await page.locator('#secondary .mc-book__page-text').all()) await expect(readerText).toHaveCSS('font-family', 'monospace');
  await page.evaluate(() => window.bookQA.configure({ mode: 'signing' }));
  await expect(book.locator('.mc-book__title-input input')).toBeVisible();
  await expect(book.locator('.mc-book__title-input input')).toHaveCSS('font-family', 'monospace');
  await expect(book.locator('.mc-book__author input')).toHaveCSS('font-family', 'monospace');
  // The same explicitly supplied host families prove CSS role isolation only.
  // This makes no claim about native advances, glyph shader or pixel equality.
  expect(await unaffected()).toEqual(before);
});

test('book common multiline layout: inner centering, expanded clip and normal line advance scale independently of static Reader text', async ({ page }) => {
  await open(page);
  for (const scale of [1, 2]) {
    await page.evaluate(scale => window.bookQA.configure({ scale, fontProbe: true, pages: ['Line one\nLine two', '另一页'], readerPages: ['Reader text', '静态页面'] }), scale);
    const leaf = root(page).locator('.mc-book__page[data-side="left"]');
    const outer = leaf.locator('.mc-book__text-box'), center = leaf.locator('.mc-book__text-center'), clip = leaf.locator('.mc-book__text-clip'), input = leaf.locator('textarea');
    await relative(outer, leaf, [5 + 16, 23, 128, 149], scale);
    await relative(center, outer, [3, 2, 128 - 6, 149 - 4], scale);
    await relative(clip, center, [0, -3, 128 - 6, 149 - 4 + 6], scale);
    await relative(input, clip, [0, 0, 128 - 6, 149 - 4 + 6], scale);
    await expect(clip).toHaveCSS('overflow', 'hidden');
    await expect(input).toHaveCSS('padding-top', `${3 * scale}px`); await expect(input).toHaveCSS('padding-bottom', `${3 * scale}px`);
    await expect(input).toHaveCSS('padding-left', '0px'); await expect(input).toHaveCSS('padding-right', '0px');
    await expect(input).toHaveCSS('font-size', `${10 * scale}px`); await expect(input).toHaveCSS('line-height', `${10 * scale}px`);
    expect(await input.evaluate(node => { const style = getComputedStyle(node); return node.clientHeight - Number.parseFloat(style.paddingTop) - Number.parseFloat(style.paddingBottom); })).toBe((149 - 4) * scale);
    // Native Book's selected clip width610/GUI5 corroborates122logical.
    // No captured root origin, bottom raster rule or glyph ink fit is used.
    expect((await box(clip)).width / scale).toBe(610 / 5);
  }
  const readerLeaf = page.locator('#secondary .mc-book__page[data-side="left"]');
  await relative(readerLeaf.locator('.mc-book__page-text'), readerLeaf, [5 + 16, 23, 128, 149], 2);
  await expect(readerLeaf.locator('.mc-book__text-box,.mc-book__text-clip,textarea')).toHaveCount(0);
});

// Book source min[100,0] applies to the inner image, not the outer control.
// common_buttons label10 + content6 + image2 + focus2 =>102x20 outer minimum.
// book_buttons_panel anchors to the bottom of the nominal231-unit parent.
test('source form-fitting footer scales its outer frame and bottom anchor independently of generic Button', async ({ page }) => {
  await open(page);
  for (const scale of [2, 5]) {
    await page.evaluate(scale => window.bookQA.configure({ scale, pages: ['Left', 'Right'], mode: 'pages', readOnly: false, disabled: false }), scale);
    const book = root(page), button = book.locator('[data-book-action="sign-open"]');
    await relative(button, book, [(320 - 102) / 2, 231 - 20, 102, 20], scale);
    const styles = await button.evaluate(node => {
      const style = getComputedStyle(node), image = getComputedStyle(node, '::before');
      return { border: style.borderLeftWidth, skinBorder: image.borderLeftWidth, skinWidth: image.borderImageWidth, shadow: style.textShadow };
    });
    expect(styles).toEqual({ border: `${scale}px`, skinBorder: `${scale}px`, skinWidth: `${scale}px`, shadow: 'none' });
    await page.evaluate(() => window.bookQA.configure({ mode: 'signing' }));
    // Source102 is a minimum, not a fixed width for arbitrary localized text.
    // Predict each intrinsic width from the active host font plus the source
    // content6/image2/focus2 insets, without measuring its rendered box.
    const fittedWidth = async (button: Locator) => button.evaluate((node, scale) => {
      const canvas = document.createElement('canvas'), context = canvas.getContext('2d')!;
      context.font = getComputedStyle(node).font;
      return Math.max(102 * scale, context.measureText(node.textContent ?? '').width + 10 * scale) / scale;
    }, scale);
    const finalize = book.locator('[data-book-action="finalize"]'), cancel = book.locator('[data-book-action="sign-cancel"]');
    const finalizeWidth = await fittedWidth(finalize), cancelWidth = await fittedWidth(cancel);
    const pairWidth = finalizeWidth + 10 + cancelWidth;
    await relative(finalize, book, [(320 - pairWidth) / 2, 231 - 20, finalizeWidth, 20], scale);
    await relative(cancel, book, [(320 - pairWidth) / 2 + finalizeWidth + 10, 231 - 20, cancelWidth, 20], scale);
  }
});

test('page-number color retains packed bca387ff on Page and Editor at both scales and CanvasText in forced colors', async ({ page }) => {
  // Saved Classic GUI5 G61–68: all48 used vertices end in bca387ff.
  // Provenance: book-font-initial-vb-source-01/all-used-RESULT.json.
  // This is the source foreground-color contract, not whole-UI/native-AA
  // equality. The separately measured footer4c4c4cff is unchanged here.
  await open(page);
  const standalone = page.locator('#standalone .mc-book__page');
  const pageNumber = standalone.locator('.mc-book__page-number');
  const editorNumbers = root(page).locator('.mc-book__page-number');
  for (const scale of [2, 5]) {
    await page.emulateMedia({ forcedColors: 'none' });
    await page.evaluate(scale => window.bookQA.configure({ scale, pages: ['Left', 'Right'], spreadIndex: 0, mode: 'pages' }), scale);
    // Standalone Page accepts caller HTML/CSS styling; the compound Editor
    // receives the same unit through its actual layout.unitScale prop.
    await standalone.evaluate((node, scale) => {
      if (!(node instanceof HTMLElement)) throw new Error('Expected standalone Page element');
      node.style.setProperty('--mc-book-u', `${scale}px`);
    }, scale);
    await expect(pageNumber).toBeVisible(); await expect(editorNumbers).toHaveCount(2);
    const counters = [pageNumber, editorNumbers.nth(0), editorNumbers.nth(1)];
    for (const counter of counters) {
      await expect(counter).toHaveCSS('font-size', `${10 * scale}px`);
      await expect(counter).toHaveCSS('color', 'rgb(188, 163, 135)');
      await expect(counter).toHaveCSS('-webkit-text-fill-color', 'rgb(188, 163, 135)');
      await expect(counter).toHaveCSS('opacity', '1');
    }
    await page.emulateMedia({ forcedColors: 'active' });
    const system = await page.evaluate(() => {
      const probe = document.createElement('span'); probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText = 'position:fixed;left:-10000px;top:-10000px;color:CanvasText;-webkit-text-fill-color:CanvasText;forced-color-adjust:none';
      document.body.append(probe);
      const style = getComputedStyle(probe), values = { color: style.color, fill: style.webkitTextFillColor };
      probe.remove(); return values;
    });
    for (const counter of counters) {
      await expect(counter).toHaveCSS('color', system.color);
      await expect(counter).toHaveCSS('-webkit-text-fill-color', system.fill);
    }
  }
  await page.emulateMedia({ forcedColors: 'none' });
});

test('page-number font selection is independent across Editor Reader and Page without replacing input nodes or changing caret selection', async ({ page }) => {
  // Native counter digits use the Unicode glyph00 page, independently of the
  // body input. Han-auto here is an explicit Web policy, not a recovered
  // engine locale predicate. The widths below are finite prepared-host hmtx
  // checks, not native counter advance, rasterization or whole-UI equality.
  await open(page);
  await page.evaluate(() => window.bookQA.configure({ pages: ['Body one', 'Body two'], readerPages: ['Read only', 'Second'],
    standaloneText: 'Standalone body', scale: 2, fontProbe: true, counterParentFamily: 'cursive',
    editorFontMode: 'latin', standaloneFontMode: 'latin', fontModeInput: 'scalar' }));
  const input = root(page).locator('textarea').first(), standaloneInput = page.locator('#standalone textarea');
  const editorCounters = root(page).locator('.mc-book__page-number');
  const readerCounter = page.locator('#secondary .mc-book__page-number').first();
  const standaloneCounter = page.locator('#standalone .mc-book__page-number');
  const readerBody = page.locator('#secondary .mc-book__page-text').first();
  await expect(input).toHaveValue('Body one');
  await expect(input).toHaveCSS('font-family', 'monospace');
  await expect(readerBody).toHaveCSS('font-family', 'cursive');
  for (const counter of [editorCounters.nth(0), readerCounter, standaloneCounter]) await expect(counter).toHaveCSS('font-family', 'cursive');
  await input.focus();
  const nodes = await page.evaluateHandle(() => {
    const input = window.bookQA.refs.textareas.get(0)!, standalone = window.bookQA.refs.standaloneTextarea!;
    input.setSelectionRange(2, 6, 'backward'); standalone.setSelectionRange(1, 4, 'forward');
    return { input, standalone, editor: window.bookQA.refs.editor, reader: window.bookQA.refs.reader, page: window.bookQA.refs.page,
      counters: [...document.querySelectorAll('#primary .mc-book__page-number,#secondary .mc-book__page-number,#standalone .mc-book__page-number')] };
  });
  const stable = async () => expect(await page.evaluate(saved => ({
    input: saved.input === window.bookQA.refs.textareas.get(0), standalone: saved.standalone === window.bookQA.refs.standaloneTextarea,
    editor: saved.editor === window.bookQA.refs.editor, reader: saved.reader === window.bookQA.refs.reader, page: saved.page === window.bookQA.refs.page,
    counters: saved.counters.every((node, index) => node === document.querySelectorAll('#primary .mc-book__page-number,#secondary .mc-book__page-number,#standalone .mc-book__page-number')[index]),
    focus: document.activeElement === saved.input,
    inputSelection: [saved.input.selectionStart, saved.input.selectionEnd, saved.input.selectionDirection],
    standaloneSelection: [saved.standalone.selectionStart, saved.standalone.selectionEnd, saved.standalone.selectionDirection],
    values: [saved.input.value, saved.standalone.value],
  }), nodes)).toEqual({ input: true, standalone: true, editor: true, reader: true, page: true, counters: true, focus: true,
    inputSelection: [2, 6, 'backward'], standaloneSelection: [1, 4, 'forward'], values: ['Body one', 'Standalone body'] });
  await page.evaluate(() => window.bookQA.configure({ pageNumberHan: true, standalonePageNumberHan: true }));
  await expect(editorCounters.nth(0)).toHaveText('第1页'); await expect(editorCounters.nth(1)).toHaveText('第2页');
  for (const counter of [editorCounters.nth(0), editorCounters.nth(1), standaloneCounter]) await expect(counter).toHaveCSS('font-family', 'serif');
  await expect(readerCounter).toHaveCSS('font-family', 'cursive');
  await expect(input).toHaveCSS('font-family', 'monospace'); await expect(readerBody).toHaveCSS('font-family', 'cursive');
  await stable();
  await page.evaluate(() => window.bookQA.configure({ pageNumberFontMode: 'inherit', readerPageNumberFontMode: 'unicode', standalonePageNumberFontMode: 'latin' }));
  await expect(editorCounters.nth(0)).toHaveCSS('font-family', 'cursive');
  await expect(readerCounter).toHaveCSS('font-family', 'serif'); await expect(standaloneCounter).toHaveCSS('font-family', 'monospace');
  await stable();
  await page.evaluate(() => {
    window.bookQA.refs.textareas.get(0)!.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '中' }));
    window.bookQA.configure({ pageNumberFontMode: 'latin', readerPageNumberFontMode: 'inherit', standalonePageNumberFontMode: 'unicode',
      editorFontMode: 'unicode', standaloneFontMode: 'unicode' });
  });
  await expect(editorCounters.nth(0)).toHaveCSS('font-family', 'monospace');
  await expect(readerCounter).toHaveCSS('font-family', 'cursive'); await expect(standaloneCounter).toHaveCSS('font-family', 'serif');
  await expect(input).toHaveCSS('font-family', 'serif'); await expect(standaloneInput).toHaveCSS('font-family', 'serif');
  await expect(readerBody).toHaveCSS('font-family', 'cursive'); await stable();
  await page.evaluate(() => window.bookQA.refs.textareas.get(0)!.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '' })));

  expect(await page.evaluate(() => window.bookQA.loadCounterClassicFonts())).toBe(true);
  await page.evaluate(() => window.bookQA.configure({ counterFontProfile: 'classic', counterParentFamily: undefined,
    pageNumberFontMode: 'auto', readerPageNumberFontMode: 'auto', standalonePageNumberFontMode: 'auto',
    readerPageNumberHan: true, editorFontMode: 'latin', standaloneFontMode: 'latin' }));
  for (const counter of [editorCounters.nth(0), readerCounter, standaloneCounter]) await expect(counter).toHaveCSS('font-family', '"MCBE Classic Unicode"');
  await expect(input).toHaveCSS('font-family', '"MCBE Classic"'); await expect(readerBody).toHaveCSS('font-family', '"MCBE Classic"');
  const textWidth = (counter: Locator) => counter.evaluate(node => { const range = document.createRange(); range.selectNodeContents(node); return range.getBoundingClientRect().width; });
  // Whole-source advances at20px: 第18+1(7/12)+页18, 第18+2(8/12)+页18.
  for (const [counter, expected] of [[editorCounters.nth(0), 43], [editorCounters.nth(1), 44], [standaloneCounter, 43]] as const) {
    await expect(counter).toHaveCSS('font-size', '20px'); expect(Math.abs(await textWidth(counter) - expected)).toBeLessThanOrEqual(.02);
  }
  await stable();
  await page.evaluate(() => window.bookQA.configure({ pageNumberFontMode: 'inherit', readerPageNumberFontMode: 'latin', standalonePageNumberFontMode: 'inherit' }));
  for (const counter of [editorCounters.nth(0), editorCounters.nth(1), readerCounter, standaloneCounter]) {
    await expect(counter).toHaveCSS('font-family', '"MCBE Classic"'); expect(Math.abs(await textWidth(counter) - 48)).toBeLessThanOrEqual(.02);
  }
  await expect(input).toHaveCSS('font-family', '"MCBE Classic"'); await expect(readerBody).toHaveCSS('font-family', '"MCBE Classic"');
  await stable();
  expect(await page.evaluate(() => window.bookQA.events.filter(event => event.kind === 'pages' || event.kind === 'standalone'))).toEqual([]);
  await nodes.dispose();
});
