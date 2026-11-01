import { test, expect } from '@playwright/test';
import type { Locator, Page, Response, TestInfo } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Route } from '@playwright/test';
import componentCatalog from '../docs/component-catalog.json' with { type: 'json' };

/** Root runs this against the complete public demo in one desktop project.
 * Other main-page examples remain mounted. No routing interception, fake clocks,
 * source hooks, private callback counters or React internals are installed.
 */
interface PageObservation {
  pageErrors: string[];
  consoleErrors: string[];
  failedRequests: { url: string; error: string | null }[];
  responses: Response[];
  assetBodies: { url: string; status: number; bytes: number; sha256: string; resourceType: string }[];
}
const observations = new WeakMap<Page, PageObservation>();
const section = (page: Page) => page.locator('#credits');
const scene = (page: Page) => section(page).locator('.mc-credits-screen');
const roll = (page: Page) => scene(page).locator('.mc-credits-roll');
const receipt = (page: Page) => section(page).locator('p[role="status"][aria-live="polite"]');
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const expectedAssets = {
  bg32: '76842acb4488a28062ca494d9150a56db94d1555704d66340ef72cd42066d6bb',
  title: '1ab368c3719a0fa0c273a0040bd5d3e8c47a9678b8dff22a09aa1bf570781662',
  pixel: '63afb50e1a41962f939ffad9df43f0f9047ccfe9f7daedb0b64612a074161c2f',
  cjk: 'ef9a950e89f948d74a7b09f3980e21826aa68b15f80273565f2b8a5c57c5d19d'
};

async function task(page: Page) {
  await section(page).evaluate(owner => new Promise<void>(resolve => owner.ownerDocument.defaultView!.setTimeout(resolve, 0)));
}
async function twoFrames(page: Page) {
  await section(page).evaluate(owner => new Promise<void>(resolve => {
    const view = owner.ownerDocument.defaultView!;
    view.requestAnimationFrame(() => view.requestAnimationFrame(() => resolve()));
  }));
}
async function pause(page: Page) {
  const control = section(page).getByRole('button', { name: 'Pause', exact: true });
  if (await control.count()) await control.click();
  await task(page); await expect(section(page).getByRole('button', { name: 'Resume', exact: true })).toBeEnabled();
}
async function restartAndPause(page: Page) {
  await section(page).getByRole('button', { name: 'Restart', exact: true }).click(); await task(page); await pause(page);
}
async function offset(page: Page) {
  const value = Number(await roll(page).getAttribute('data-offset')); expect(Number.isFinite(value)).toBe(true); return value;
}
async function attachJSON(info: TestInfo, name: string, value: unknown) {
  await info.attach(name, { body: JSON.stringify(value, null, 2), contentType: 'application/json' });
}
async function canvasMeasurement(run: Locator) {
  return run.evaluate(node => {
    const owner = node.ownerDocument, css = owner.defaultView!.getComputedStyle(node);
    const context = owner.createElement('canvas').getContext('2d');
    if (!context) throw new Error('Actual Canvas2D text metrics unavailable');
    context.font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
    if (css.fontKerning === 'normal' || css.fontKerning === 'none' || css.fontKerning === 'auto') context.fontKerning = css.fontKerning;
    const text = node.textContent ?? '';
    const box = node.getBoundingClientRect(), viewport = node.closest('.mc-credits-roll')!.getBoundingClientRect();
    return { text, family: css.fontFamily, size: css.fontSize, weight: css.fontWeight, kerning: css.fontKerning,
      canvasFont: context.font, canvasWidth: context.measureText(text).width, DOMWidth: box.width,
      DOMCenter: box.left + box.width / 2, viewportCenter: viewport.left + viewport.width / 2,
      fontSetReady: owner.fonts.status === 'loaded', familyReady: owner.fonts.check(context.font, text) };
  });
}
async function originalBody(page: Page, url: string, baseURL = page.url()) {
  // Read the actual page response whenever HTTP was used; data URLs preserve
  // the same complete body. This does not make a shader/resampling pixel claim.
  const absolute = new URL(url, baseURL).href;
  if (absolute.startsWith('data:')) return Buffer.from(await page.evaluate(async value => Array.from(new Uint8Array(await (await fetch(value)).arrayBuffer())), absolute));
  const observed = observations.get(page)!;
  let responses = observed.responses.filter(r => r.url() === absolute);
  if (!responses.length) responses = [await page.waitForResponse(r => r.url() === absolute)];
  let original: Buffer | undefined;
  for (const response of responses) {
    expect(response.ok()).toBe(true);
    const body = await response.body();
    observed.assetBodies.push({ url: absolute, status: response.status(), bytes: body.length, sha256: sha(body), resourceType: response.request().resourceType() });
    // Concurrent CSS and GPU fetches may expose an empty coalesced/cache body.
    // Require an actual nonempty response and agreement among all available bodies.
    if (body.length) { if (original) expect(body.equals(original)).toBe(true); else original = body; }
  }
  const uploads = await page.evaluate(async url => Promise.all(((window as any).creditsUploadedBackgroundBlobs ?? [])
    .filter((record: any) => record.url === url).map(async (record: any) => ({ status: record.status, bytes: Array.from(new Uint8Array(await record.blob.arrayBuffer())) }))), absolute);
  for (const upload of uploads) {
    const body = Buffer.from(upload.bytes); expect(body.length).toBeGreaterThan(0);
    observed.assetBodies.push({ url: absolute, status: upload.status, bytes: body.length, sha256: sha(body), resourceType: 'actual-fetch-blob-fed-to-gpu' });
    if (original) expect(body.equals(original)).toBe(true); else original = body;
  }
  expect(original, `No nonempty actual page response body for ${absolute}`).toBeDefined(); return original!;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Observe standard fetch→Blob→ImageBitmap→GPU upload provenance, without source/React hooks.
    const blobRecords = new WeakMap<object, any>(), bitmapRecords = new WeakMap<object, any>(), recorded = new WeakSet<object>();
    (window as any).creditsUploadedBackgroundSources = [];
    (window as any).creditsUploadedBackgroundBlobs = [];
    const fetchOriginal = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const response = await fetchOriginal(...args), read = response.blob.bind(response);
      response.blob = async () => { const blob = await read(); blobRecords.set(blob, { blob, status: response.status, url: response.url || new URL(String(args[0]), location.href).href }); return blob; };
      return response;
    };
    const decodeOriginal = window.createImageBitmap.bind(window);
    window.createImageBitmap = (async (...args: any[]) => {
      const bitmap = await (decodeOriginal as any)(...args), record = blobRecords.get(args[0]); if (record) bitmapRecords.set(bitmap, record); return bitmap;
    }) as typeof createImageBitmap;
    const contextOriginal = HTMLCanvasElement.prototype.getContext, wrapped = new WeakSet<object>();
    (HTMLCanvasElement.prototype as any).getContext = function (kind: string, ...args: any[]) {
      const gl = (contextOriginal as any).call(this, kind, ...args);
      if (kind === 'webgl' && gl && this.matches('[data-background-renderer="gui-layer"]') && !wrapped.has(gl)) {
        wrapped.add(gl); const upload = gl.texImage2D.bind(gl);
        gl.texImage2D = (...args: any[]) => { const bitmap = args[args.length - 1], record = bitmapRecords.get(bitmap);
          if (record) {
            if (!(window as any).creditsUploadedBackgroundSources.includes(record.url)) (window as any).creditsUploadedBackgroundSources.push(record.url);
            if (!recorded.has(bitmap)) { recorded.add(bitmap); (window as any).creditsUploadedBackgroundBlobs.push(record); }
          }
          return upload(...args); };
      }
      return gl;
    };
  });
  const observed: PageObservation = { pageErrors: [], consoleErrors: [], failedRequests: [], responses: [], assetBodies: [] };
  observations.set(page, observed);
  page.on('pageerror', e => observed.pageErrors.push(e.stack ?? e.message));
  page.on('console', message => { if (message.type() === 'error') observed.consoleErrors.push(message.text()); });
  page.on('requestfailed', request => observed.failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? null }));
  page.on('response', response => observed.responses.push(response));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/#credits', { waitUntil: 'domcontentloaded' });
  await expect(scene(page)).toBeVisible();
  await section(page).scrollIntoViewIfNeeded();
});

test.afterEach(async ({ page }, info) => {
  const observed = observations.get(page)!;
  await attachJSON(info, 'full-main-page-observation', { pageErrors: observed.pageErrors, consoleErrors: observed.consoleErrors,
    failedRequests: observed.failedRequests, assetBodies: observed.assetBodies, responses: observed.responses.map(r => ({ url: r.url().startsWith('data:') ? `${r.url().split(',')[0]},[inline body omitted]` : r.url(), status: r.status() })) });
  expect(observed.pageErrors, 'All main examples render; actual global page errors are retained, never bypassed.').toEqual([]);
  expect(observed.consoleErrors).toEqual([]);
  expect(observed.failedRequests.filter(r => r.error !== 'net::ERR_ABORTED')).toEqual([]);
});

test('public Credits deep link shows the current catalog, active sidebar and the real code snippet', async ({ page }) => {
  const componentCount = Object.values(componentCatalog.groups).flat().filter(component => component.status === 'implemented').length;
  await expect(page.locator('.components-label span')).toHaveText(String(componentCount));
  await expect(page.locator('.sidebar-link[aria-current="location"]')).toHaveAttribute('href', '#credits');
  await expect(scene(page)).toHaveAttribute('data-native-certified', 'false');
  await expect(roll(page)).toHaveAttribute('data-source-renderer', 'credits_renderer');
  await section(page).getByRole('button', { name: 'Code', exact: true }).click();
  const code = section(page).locator('pre.code-example code');
  await expect(code).toContainText('CreditsScreen'); await expect(code).toContainText('layoutCredits');
  await expect(code).toContainText('yourReusableProfile'); await expect(code).toContainText('CreditsRoll, CreditsSkipButton');
  await expect(code).toContainText('onCloseRequested');
  await section(page).getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(scene(page)).toBeVisible();
});

test('public original tiled artwork preview paints both selectable repeat sizes', async ({ page }, info) => {
  const preview = section(page).locator('[data-demo-credits-tiles]'); await preview.scrollIntoViewIfNeeded();
  const canvas = preview.getByRole('img', { name: 'Original tiled artwork' }); await expect(canvas).toHaveAttribute('data-render-state', 'ready');
  const read = () => canvas.evaluate(node => {
    const canvas = node as HTMLCanvasElement, gl = canvas.getContext('webgl')!, bytes = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    return { width: canvas.width, height: canvas.height, sample: Array.from(bytes), error: gl.getError() };
  });
  const large = await read(); expect([large.width, large.height, large.error]).toEqual([320, 144, 0]);
  await preview.getByRole('combobox', { name: 'Tile size' }).click();
  await page.getByRole('option', { name: '32 × 32', exact: true }).click(); await expect(canvas).toHaveAttribute('data-render-state', 'ready');
  await expect(preview.getByRole('combobox', { name: 'Tile size' })).toHaveText('32 × 32');
  const small = await read(); expect([small.width, small.height, small.error]).toEqual([320, 144, 0]); expect(sha(Buffer.from(small.sample))).not.toBe(sha(Buffer.from(large.sample)));
  await attachJSON(info, 'public-tiled-artwork-two-repeats', { width: 320, height: 144, largeSHA256: sha(Buffer.from(large.sample)), smallSHA256: sha(Buffer.from(small.sample)) });
});

test('bounded public text uses loaded bundled OFL faces and actual matching CSS Canvas advances', async ({ page }, info) => {
  await pause(page); await page.evaluate(() => document.fonts.ready);
  const fonts = await section(page).evaluate(owner => {
    const fontRules: { family: string; src: string; baseURL: string }[] = [];
    for (const sheet of Array.from(owner.ownerDocument.styleSheets)) for (const rule of Array.from(sheet.cssRules)) {
      if (rule.type === CSSRule.FONT_FACE_RULE) {
        const face = rule as CSSFontFaceRule;
        fontRules.push({ family: face.style.fontFamily.replaceAll(/['"]/g, '').trim(), src: face.style.getPropertyValue('src'),
          baseURL: sheet.href ?? owner.ownerDocument.baseURI });
      }
    }
    return { rules: fontRules, faces: Array.from(owner.ownerDocument.fonts).map(face => ({ family: face.family.replaceAll(/['"]/g, ''), status: face.status })) };
  });
  const bodies: { family: string; hash: string }[] = [];
  for (const [family, expected] of [['MCBE Pixel', expectedAssets.pixel], ['MCBE CJK', expectedAssets.cjk]]) {
    expect(fonts.faces.some(face => face.family === family && face.status === 'loaded')).toBe(true);
    const rule = fonts.rules.find(row => row.family === family); expect(rule).toBeTruthy();
    const url = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(rule!.src)?.[1]; expect(url).toBeTruthy();
    const hash = sha(await originalBody(page, url!, rule!.baseURL)); expect(hash).toBe(expected); bodies.push({ family: family!, hash });
  }
  const measurement = await canvasMeasurement(roll(page).locator('.mc-credits-roll__css-run').first());
  expect(measurement.family.replaceAll('"', '').split(',').map(s => s.trim())).toEqual(['MCBE Pixel', 'MCBE CJK']);
  // Other gallery examples may still be loading unrelated faces; require this actual run's faces.
  expect(measurement.familyReady).toBe(true);
  expect(measurement.kerning).toBe('normal'); expect(measurement.text.length).toBeGreaterThan(0);
  expect(Math.abs(measurement.DOMWidth - measurement.canvasWidth)).toBeLessThan(.1);
  expect(Math.abs(measurement.DOMCenter - measurement.viewportCenter)).toBeLessThan(.1);
  await attachJSON(info, 'actual-ofl-font-bodies-and-measurement', { bodies, measurement,
    scope: 'Bounded authored text with independently preflighted cmap coverage; not native font-resource recovery or arbitrary OS fallback certification.' });
});

test('original whole dirt and title decode from actual public response bytes without native logo parity claims', async ({ page }, info) => {
  await restartAndPause(page);
  await expect(scene(page).locator('[data-background-renderer="gui-layer"]')).toHaveAttribute('data-render-state', 'ready');
  const actualUploaded = await page.evaluate(() => (window as any).creditsUploadedBackgroundSources as string[]);
  expect(actualUploaded).toHaveLength(1); const backgroundURL = actualUploaded[0]!;
  expect(sha(await originalBody(page, backgroundURL!))).toBe(expectedAssets.bg32);
  const title = roll(page).locator('img[data-image-provenance="whole-original-v1.26.60.5-title-png"]');
  await expect(title).toBeAttached();
  const image = await title.evaluate(async n => { if (!(n instanceof HTMLImageElement)) throw new Error('Original title must be a native image'); await n.decode(); return { width: n.naturalWidth, height: n.naturalHeight, src: n.currentSrc || n.src }; });
  expect([image.width, image.height]).toEqual([1937, 333]); expect(sha(await originalBody(page, image.src))).toBe(expectedAssets.title);
  const dirt = await page.evaluate(async url => { const image = new Image(); image.src = url; await image.decode(); return [image.naturalWidth, image.naturalHeight]; }, backgroundURL!);
  expect(dirt).toEqual([32, 32]);
  await expect(roll(page)).toHaveAttribute('data-native-certified', 'false');
  await attachJSON(info, 'whole-public-image-identity', { background: expectedAssets.bg32, title: expectedAssets.title, scope: 'Original byte transport and decode only; failed native logo draw/sampler remains unqualified.' });
});

test('Pause holds the visible offset across two real frames and Resume Faster Restart retain ordinary control semantics', async ({ page }) => {
  await pause(page); const held = await offset(page); await twoFrames(page); expect(await offset(page)).toBe(held);
  await section(page).getByRole('button', { name: 'Resume', exact: true }).click(); await task(page);
  const resumed = await offset(page); await twoFrames(page); expect(await offset(page)).toBeGreaterThan(resumed);
  const faster = section(page).getByRole('checkbox', { name: 'Faster', exact: true }); await faster.check(); await expect(faster).toBeChecked();
  const old = await scene(page).elementHandle(), key = await scene(page).getAttribute('data-run-key');
  await section(page).getByRole('button', { name: 'Restart', exact: true }).click(); await task(page);
  expect(await old!.evaluate(n => n.isConnected)).toBe(false); expect(await scene(page).getAttribute('data-run-key')).not.toBe(key); await old!.dispose();
  await expect(receipt(page)).toHaveText('A new journey begins.'); await expect(section(page).getByRole('button', { name: 'Pause', exact: true })).toBeEnabled();
});

test('Closing poem gates authored literal Builder text and published staff boxes retain measured relative constraints', async ({ page }, info) => {
  await pause(page);
  const transcript = roll(page).locator('.mc-credits-roll__transcript'), poem = transcript.locator('[data-text-role="poem"]');
  await expect(poem).toContainText('Builder / 建造者'); await expect(poem).toContainText('方块之间，灵感相连。');
  await expect(poem).not.toContainText('PLAYERNAME'); await expect(poem).not.toContainText('§3');
  const gate = section(page).getByRole('checkbox', { name: 'Closing poem', exact: true });
  await gate.uncheck(); await expect(poem).toHaveCount(0); await expect(transcript.getByText('Lantern Workshop', { exact: true })).toBeAttached();
  await gate.check(); await expect(poem).toContainText('Builder / 建造者');
  const geometry = await roll(page).evaluate(node => {
    const titles = Array.from(node.querySelectorAll<HTMLElement>('.mc-credits-roll__line[data-text-role="title"] .mc-credits-roll__css-run'));
    const names = Array.from(node.querySelectorAll<HTMLElement>('.mc-credits-roll__line[data-text-role="name"] .mc-credits-roll__css-run'));
    if (titles.length < 2 || names.length < 3) throw new Error('Authored staff lines missing');
    const rect = (n: HTMLElement) => { const b = n.getBoundingClientRect(); return { x: b.x, y: b.y }; };
    const viewport = node.getBoundingClientRect();
    return { title: rect(titles[0]!), nextTitle: rect(titles[1]!), names: names.slice(0, 3).map(rect), scale: Number.parseFloat(getComputedStyle(names[0]!).fontSize) / 10, viewportLeft: viewport.left, viewportWidth: viewport.width };
  });
  expect([1, 2]).toContain(geometry.scale);
  expect(Math.abs(geometry.title.x - geometry.viewportLeft - geometry.viewportWidth * .175)).toBeLessThan(.1);
  expect(Math.abs((geometry.names[0]!.x - geometry.title.x) / geometry.scale - 40)).toBeLessThan(.1);
  expect(Math.abs((geometry.names[0]!.y - geometry.title.y) / geometry.scale - 20)).toBeLessThan(.1);
  expect(Math.abs((geometry.names[1]!.y - geometry.names[0]!.y) / geometry.scale - 20)).toBeLessThan(.1);
  expect(Math.abs((geometry.nextTitle.y - geometry.names[2]!.y) / geometry.scale - 40)).toBeLessThan(.1);
  await attachJSON(info, 'public-measured-relative-staff-boxes', geometry);
});

test('uniform Credits font combobox owns its popup and applies a second real bundled face with Canvas metrics', async ({ page }, info) => {
  await pause(page); const trigger = section(page).getByRole('combobox', { name: 'Credits font', exact: true });
  await expect(trigger).toHaveClass(/mc-combobox-trigger/); await trigger.click();
  const id = await trigger.getAttribute('aria-controls'); expect(id).toBeTruthy();
  const list = page.locator(`[id=${JSON.stringify(id)}][role="listbox"]`); await expect(list).toBeVisible(); await expect(list).toHaveAccessibleName('Credits font');
  await list.getByRole('option', { name: 'MCBE CJK', exact: true }).click(); await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  const first = roll(page).locator('.mc-credits-roll__css-run').first(); await expect(first).toHaveCSS('font-family', /MCBE CJK.*MCBE Pixel/);
  const measurement = await canvasMeasurement(first); expect(measurement.familyReady).toBe(true);
  expect(Math.abs(measurement.DOMWidth - measurement.canvasWidth)).toBeLessThan(.1);
  expect(Math.abs(measurement.DOMCenter - measurement.viewportCenter)).toBeLessThan(.1);
  await attachJSON(info, 'second-font-actual-computed-measurement', measurement);
});

test('switching actual Credits faces does not wait for an unrelated pending document font', async ({ page }, info) => {
  await pause(page);let pending: Route | undefined;
  const fontBytes = await readFile(new URL('../src/fonts/MCBEPixel-Regular.woff2', import.meta.url));
  await page.route('**/qa-unrelated-pending.woff2', route => { pending = route; });
  await page.evaluate(() => {
    const face = new FontFace('Unrelated QA face', 'url("/qa-unrelated-pending.woff2")'); document.fonts.add(face);
    (window as any).unrelatedFaceDone = false;
    void face.load().then(() => { (window as any).unrelatedFaceDone = true; });
    const node = document.createElement('span'); node.id = 'unrelated-font-probe'; node.style.cssText = 'position:fixed;left:-10000px;font-family:"Unrelated QA face"'; node.textContent = 'X'; document.body.append(node);
  });
  await expect.poll(() => !!pending).toBe(true);expect(await page.evaluate(() => document.fonts.status)).toBe('loading');
  const trigger = section(page).getByRole('combobox', { name: 'Credits font', exact: true }); await trigger.click();
  await page.getByRole('option', { name: 'MCBE CJK', exact: true }).click();
  const first = roll(page).locator('.mc-credits-roll__css-run').first();await expect(first).toHaveCSS('font-family', /^"?MCBE CJK/);
  const measurement = await canvasMeasurement(first);expect(measurement.familyReady).toBe(true);expect(await page.evaluate(() => (window as any).unrelatedFaceDone)).toBe(false);
  await attachJSON(info, 'selected-face-ready-while-unrelated-pending', measurement);
  await pending!.fulfill({ contentType: 'font/woff2', body: fontBytes });await page.waitForFunction(() => (window as any).unrelatedFaceDone);
  await page.evaluate(() => document.getElementById('unrelated-font-probe')?.remove());
});

test('Escape reveals a real Skip which closes through host state and Play again starts a new scene', async ({ page }) => {
  await pause(page); await scene(page).focus(); await page.keyboard.press('Escape'); await task(page);
  const skip = scene(page).getByRole('button', { name: 'Skip', exact: true }); await expect(skip).toBeVisible(); await expect(receipt(page)).toHaveText('Skip is available.');
  const previous = await scene(page).getAttribute('data-run-key'); await skip.click(); await task(page);
  await expect(scene(page)).toBeHidden(); await expect(receipt(page)).toHaveText('The preview has closed.');
  await section(page).getByRole('button', { name: 'Play again', exact: true }).click(); await expect(scene(page)).toBeVisible();
  expect(await scene(page).getAttribute('data-run-key')).not.toBe(previous); await expect(receipt(page)).toHaveText('A new journey begins.');
});

test('real late DOCUMENT click veto preserves a distinct host status and positive Skip changes the actual status DOM', async ({ page }, info) => {
  await pause(page); await scene(page).focus(); await page.keyboard.press('Escape'); await task(page);
  const skip = scene(page).getByRole('button', { name: 'Skip', exact: true }); await expect(skip).toBeVisible();
  const buttonNode = await skip.elementHandle(), statusNode = await receipt(page).elementHandle(); expect(buttonNode && statusNode).toBeTruthy();
  const baseline = await receipt(page).textContent(), positive = 'The preview has closed.'; expect(baseline).toBe('Skip is available.'); expect(baseline).not.toBe(positive);
  await page.evaluate(({ button, status }) => {
    const win = button.ownerDocument.defaultView!;
    const records: { kind: string; eventId: number; [key: string]: unknown }[] = [];
    let blocked = true, eventId = 0, previous = status.textContent;
    const listener = (event: Event) => {
      if (!event.composedPath().includes(button)) return;
      eventId++; const before = event.defaultPrevented; if (blocked) event.preventDefault();
      records.push({ kind: 'document', eventId, trusted: event.isTrusted, cancelable: event.cancelable, before, after: event.defaultPrevented, blocked });
    };
    const observer = new MutationObserver(() => { const text = status.textContent; if (text !== previous) { previous = text; records.push({ kind: 'status-dom-mutation', eventId, text }); } });
    button.ownerDocument.addEventListener('click', listener); observer.observe(status, { subtree: true, childList: true, characterData: true });
    Object.assign(win, { creditsPublicDocumentProbe: { records, unblock: () => { blocked = false; }, stop: () => { button.ownerDocument.removeEventListener('click', listener); observer.disconnect(); Reflect.deleteProperty(win, 'creditsPublicDocumentProbe'); } } });
  }, { button: buttonNode!, status: statusNode! });
  const probe = () => page.evaluate(() => (window as unknown as { creditsPublicDocumentProbe: { records: { kind: string; eventId: number; [key: string]: unknown }[] } }).creditsPublicDocumentProbe.records);
  try {
    await skip.click(); await task(page); expect(await receipt(page).textContent()).toBe(baseline); await expect(scene(page)).toBeVisible();
    expect(await probe()).toEqual([{ kind: 'document', eventId: 1, trusted: true, cancelable: true, before: false, after: true, blocked: true }]);
    await page.evaluate(() => (window as unknown as { creditsPublicDocumentProbe: { unblock: () => void } }).creditsPublicDocumentProbe.unblock());
    await skip.click(); await task(page); await expect(receipt(page)).toHaveText(positive); await expect(scene(page)).toBeHidden();
    const records = await probe(), events = records.filter(r => r.kind === 'document'), mutations = records.filter(r => r.kind === 'status-dom-mutation');
    expect(events).toEqual([{ kind: 'document', eventId: 1, trusted: true, cancelable: true, before: false, after: true, blocked: true }, { kind: 'document', eventId: 2, trusted: true, cancelable: true, before: false, after: false, blocked: false }]);
    expect(mutations).toEqual([{ kind: 'status-dom-mutation', eventId: 2, text: positive }]); expect(records.indexOf(mutations[0]!)).toBeGreaterThan(records.indexOf(events[1]!));
    await attachJSON(info, 'actual-document-veto-and-positive-host-status', { baseline, positive, records, scope: 'Native input and real public status DOM only; not private callback entry/exact-count proof.' });
  } finally {
    await page.evaluate(() => (window as unknown as { creditsPublicDocumentProbe?: { stop: () => void } }).creditsPublicDocumentProbe?.stop());
    await buttonNode!.dispose(); await statusNode!.dispose();
  }
});

test('1440 390 and320 public Credits stay within local preview bounds and record actual screenshots', async ({ page }, info) => {
  await pause(page);
  const frames = [];
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 }); await twoFrames(page); await task(page);
    await expect(scene(page)).toBeVisible();
    const bounds = await scene(page).evaluate(node => { const host = node.parentElement!, own = node.getBoundingClientRect(), box = host.getBoundingClientRect(); return { sceneWidth: own.width, hostWidth: host.clientWidth, hostScrollWidth: host.scrollWidth, hostLeft: box.left, hostRight: box.right, overflowX: getComputedStyle(host).overflowX, pageWidth: document.documentElement.scrollWidth, viewport: innerWidth }; });
    expect(bounds.pageWidth).toBeLessThanOrEqual(width); expect(bounds.hostLeft).toBeGreaterThanOrEqual(-.1); expect(bounds.hostRight).toBeLessThanOrEqual(width + .1);
    expect(bounds.sceneWidth).toBeLessThanOrEqual(bounds.hostScrollWidth + .1); expect(bounds.overflowX).toBe('auto');
    await scene(page).locator('..').screenshot({ path: info.outputPath(`credits-${width}-local-host.png`) }); frames.push({ width, ...bounds });
  }
  await attachJSON(info, 'actual-responsive-public-bounds', frames);
});
