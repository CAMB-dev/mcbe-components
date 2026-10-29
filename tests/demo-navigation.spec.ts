import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const active = (page: Page) => page.locator('.sidebar-link[aria-current="location"]');
async function loaded(page: Page, id: string) {
  await page.goto(`/#${id}`); await page.locator(`#${id}`).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await expect(active(page)).toHaveAttribute('href', `#${id}`);
}
async function jump(page: Page, id: string) {
  await page.evaluate(id => document.getElementById(id)!.scrollIntoView({ behavior: 'instant' }), id);
  await expect(active(page)).toHaveAttribute('href', `#${id}`);
}

test('Bitmap text and Source Anvil deep links highlight their visible section rather than the preceding section', async ({ page }) => {
  for (const id of ['bitmap-text', 'anvil-layer']) {
    await loaded(page, id); await expect(page).toHaveURL(new RegExp(`#${id}$`));
    const position = await page.locator(`#${id}`).boundingBox();
    expect(position!.y).toBeGreaterThan(72); expect(position!.y).toBeLessThan(500);
    expect(await active(page).count()).toBe(1);
    await page.evaluate(() => scrollBy({ top: -1, behavior: 'instant' }));
    await expect(active(page)).toHaveAttribute('href', `#${id}`); // Fractional font edges do not flip after one CSS pixel.
  }
});

test('manual scrolling through a viewport-tall section keeps it active after its heading leaves', async ({ page }) => {
  await loaded(page, 'bitmap-text');
  await page.evaluate(() => {
    const section = document.getElementById('bitmap-text')!; section.style.minHeight = `${innerHeight * 5}px`;
    scrollTo({ top: scrollY + section.getBoundingClientRect().top + innerHeight * 2, behavior: 'instant' });
  });
  await expect(active(page)).toHaveAttribute('href', '#bitmap-text');
  expect((await page.locator('#bitmap-text').boundingBox())!.y).toBeLessThan(-1000);
  await jump(page, 'workstations');
  await expect(page).toHaveURL(/#bitmap-text$/); // Reading does not rewrite browser history/hash.
});

test('content or font-metric layout shifts recompute the active section without a scroll event', async ({ page }) => {
  await loaded(page, 'bitmap-text');
  const previousY = await page.evaluate(() => scrollY);
  await page.evaluate(() => {
    document.documentElement.style.overflowAnchor = 'none';
    const earlier = document.getElementById('item-renderers')!;
    earlier.style.height = `${earlier.getBoundingClientRect().height + innerHeight * 2}px`;
  });
  await expect(active(page)).toHaveAttribute('href', '#item-renderers');
  expect(await page.evaluate(() => scrollY)).toBe(previousY);
  await page.evaluate(() => document.getElementById('item-renderers')!.style.removeProperty('height'));
  await expect(active(page)).toHaveAttribute('href', '#bitmap-text');
});

test('late initial fonts do not pull the user back to the original fragment after manual navigation', async ({ page }) => {
  let release!: () => void, held = 0;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route(/\.(?:woff2?|ttf|otf)(?:\?|$)/, async route => {
    // Vite also imports font URLs as JavaScript modules (?import). Delay only
    // actual font loads so the application can mount with fallback metrics.
    if (route.request().resourceType() !== 'font') { await route.continue(); return; }
    held++; await barrier; await route.continue();
  });
  try {
    await page.goto('/#bitmap-text', { waitUntil: 'domcontentloaded' }); await page.locator('#anvil-layer').waitFor();
    await expect.poll(() => held).toBeGreaterThan(0);
    await page.keyboard.press('PageDown'); await jump(page, 'anvil-layer');
    release(); await page.evaluate(() => document.fonts.ready);
    await expect(active(page)).toHaveAttribute('href', '#anvil-layer');
    expect(await page.evaluate(() => scrollY > document.getElementById('bitmap-text')!.offsetTop + document.getElementById('bitmap-text')!.offsetHeight)).toBe(true);
    await expect(page).toHaveURL(/#bitmap-text$/);
  } finally { release(); }
});

test('document order and the bottom of the page choose the visible final section', async ({ page }) => {
  await loaded(page, 'scrolling');
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await expect(active(page)).toHaveAttribute('href', '#gui-icons');
  await expect(page).toHaveURL(/#scrolling$/);
});

test('sidebar search preserves the reading position and keyboard anchors retain native hash/back behavior', async ({ page }) => {
  await loaded(page, 'anvil-layer'); const before = await page.evaluate(() => scrollY);
  const search = page.getByRole('searchbox', { name: 'Find a component' });
  await search.fill('bitmap'); await expect(active(page)).toHaveCount(0);
  expect(await page.evaluate(() => scrollY)).toBe(before);
  await search.press('Escape'); await expect(active(page)).toHaveAttribute('href', '#anvil-layer');
  const link = page.getByRole('navigation', { name: 'Component navigation' }).getByRole('link', { name: /Bitmap text/ });
  await link.focus(); await link.press('Enter');
  await expect(page).toHaveURL(/#bitmap-text$/); await expect(active(page)).toHaveAttribute('href', '#bitmap-text');
  await page.goBack(); await expect(page).toHaveURL(/#anvil-layer$/); await expect(active(page)).toHaveAttribute('href', '#anvil-layer');
});
