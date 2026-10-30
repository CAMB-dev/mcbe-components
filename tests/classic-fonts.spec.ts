import { test, expect } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { PNG } from 'pngjs';
import type {} from '../demo/classic-font-fixture';

const fixture = '/demo/classic-font-fixture.html';
const fonts = ['MCBE Classic', 'MCBE Classic Unicode', 'MCBE Classic ASCII'] as const;
const sha = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
// Explicit read-only source path; every override still requires the exact original SHA.
const archivePath = process.env.MCBE_FONT_ARCHIVE ?? 'C:/XboxGames/Minecraft for Windows/Content/data/resource_packs/vanilla/__brarchive/font.brarchive';
type UnicodeMetricPolicy = 'legacy-host' | 'body-bounds-v1';
async function metricPolicy(): Promise<UnicodeMetricPolicy> {
  const metadata = JSON.parse(await readFile('.cache/local-fonts/classic/font-metrics.json', 'utf8'));
  if (metadata.schemaVersion === 1) { expect(metadata.unicodeMetrics).toBeUndefined(); return 'legacy-host'; }
  expect(metadata.schemaVersion).toBe(2); expect(metadata.unicodeMetrics.version).toBe('body-bounds-v1'); return 'body-bounds-v1';
}
async function open(page: Page, raw = false) { await page.goto(fixture + (raw ? '?raw' : '')); await page.waitForFunction(() => window.classicFontQA?.mounted); }
async function choose(page: Page, profile: 'classic' | 'local' | 'open') { await page.evaluate(profile => window.classicFontQA.setProfile(profile), profile); await expect(page.locator('main').first()).toHaveAttribute('data-font-profile', profile); await page.evaluate(async () => { const node = document.querySelector('#qa-text-md')!; try { await document.fonts.load(getComputedStyle(node).font, 'Af 附魔'); } catch { /* The explicit missing-font case verifies real fallback. */ } await document.fonts.ready; }); }
async function configure(page: Page, settings: Parameters<Window['classicFontQA']['configure']>[0]) { await page.evaluate(settings => window.classicFontQA.configure(settings), settings); for (const [key, value] of Object.entries(settings)) await expect.poll(() => page.locator('main').first().getAttribute('data-settings').then(raw => JSON.parse(raw!)[key])).toEqual(value); }
async function privateFonts(page: Page) { test.skip(!await page.evaluate(() => window.classicFontQA.hasClassicFonts), 'Optional caller-owned prepared Classic faces are absent; public defaults, semantics and scope tests still run.'); }
async function loadFaces(page: Page) {
  return page.evaluate(async () => {
    const result = [];
    for (const family of ['MCBE Classic', 'MCBE Classic Unicode', 'MCBE Classic ASCII']) { const loaded = await document.fonts.load(`400 20px "${family}"`, family.endsWith('ASCII') ? 'Af 1' : 'Af 附魔台'); result.push({ family, faces: loaded.map(face => ({ family: face.family, status: face.status })) }); }
    await document.fonts.ready; return result;
  });
}
async function metrics(page: Page, selector: string) { return page.locator(selector).evaluate(node => { const css = getComputedStyle(node); return { family: css.fontFamily, size: css.fontSize, line: css.lineHeight, shadow: css.textShadow, color: css.color }; }); }
async function original() {
  const raw = await readFile(archivePath); expect(sha(raw)).toBe('cdb2c8dbfcea7e0967d5369ced0eb5f4a6fcded79769e4e4605c1f0b406c86bc'); expect(raw.subarray(0, 8).toString('hex')).toBe('7d2725b1a0527026');
  const count = raw.readUInt32LE(8), base = 16 + count * 256; expect(raw.readUInt32LE(12)).toBe(1); const entries = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) { const row = 16 + i * 256, name = raw.toString('utf8', row + 1, row + 1 + raw[row]!); const start = base + raw.readUInt32LE(row + 248), size = raw.readUInt32LE(row + 252); entries.set(name, raw.subarray(start, start + size)); }
  expect(JSON.parse(entries.get('default8.json')!.toString())).toEqual({ ascii_character_height: 12, ascii_character_y_offset: -3, ascii_extended: true }); return entries;
}
function glyph(source: Map<string, Buffer>, character: string, family: typeof fonts[number], policy: UnicodeMetricPolicy) {
  const code = character.codePointAt(0)!, ascii = family !== 'MCBE Classic Unicode' && code >= 32 && code < 127;
  const name = ascii ? 'default8.png' : `glyph_${(code >> 8).toString(16).toUpperCase().padStart(2, '0')}.png`, png = PNG.sync.read(source.get(name)!);
  const width = ascii ? 8 : 16, height = ascii ? 12 : 16, x = code % 16 * width, y = ascii ? Math.floor(code / 16) * 12 : Math.floor(code % 256 / 16) * 16;
  let left = width, right = 0; const ink: number[][] = [];
  for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) { const index = ((row + y) * png.width + col + x) * 4, alpha = png.data[index + 3]!; if (alpha !== 0 && alpha !== 255) throw Error('Original glyph is not a binary source cell.'); if (alpha) { expect([...png.data.subarray(index, index + 3)]).toEqual([255, 255, 255]); left = Math.min(left, col); right = Math.max(right, col + 1); ink.push([col, row]); } }
  // Explicit finite host policy. Space is a declared4game/8source candidate;
  // PNG alpha alone does not prove native pen or terminal spacing.
  const bodyBounds = !ascii && policy === 'body-bounds-v1' && code >= 33 && code <= 126;
  // Historical finite host exceptions remain only in schema1/legacy mode.
  // This separates the old colon quad-origin delta from the new bearing-aware pen model.
  const legacyAdvance = character === '+' ? 9 : character === '7' ? 8 : character === '：' ? 17 : code < 256 ? right + 2 : 18;
  const advance = character === ' ' ? 8 : ascii ? (right + 1) * 2 : bodyBounds ? right - left + 2 : policy === 'legacy-host' ? legacyAdvance : code >= 256 ? 18 : right + 2;
  const defaultMetadata = JSON.parse(source.get('default8.json')!.toString());
  return { ink, scale: ascii ? 2 : 1, left: bodyBounds ? 1 - left : 0, top: ascii ? defaultMetadata.ascii_character_y_offset * 2 : 0, advance, page: name };
}
function expectedPlane(source: Map<string, Buffer>, text: string, family: typeof fonts[number], color: readonly [number, number, number], policy: UnicodeMetricPolicy) {
  const data = Buffer.alloc(240 * 48 * 4), quadOrigins: number[] = []; let pen = 0;
  for (const character of text) { const g = glyph(source, character, family, policy); if (character !== ' ') quadOrigins.push(pen + g.left); for (const [x, y] of g.ink) for (let yy = 0; yy < g.scale; yy++) for (let xx = 0; xx < g.scale; xx++) { const px = 8 + pen + g.left + x! * g.scale + xx, py = 8 + g.top + y! * g.scale + yy; if (px < 0 || py < 0 || px >= 240 || py >= 48) throw Error('Host specimen exceeds the fixed full plane.'); data.set([...color, 255], (py * 240 + px) * 4); } pen += g.advance; }
  return { data, advance: pen, quadOrigins };
}
async function pixelProof(page: Page, info: TestInfo, source: Map<string, Buffer>, text: string, family: typeof fonts[number]) {
  const policy = await metricPolicy(), expected = expectedPlane(source, text, family, [17, 34, 51], policy);
  const actual = await page.evaluate(({ text, family }) => window.classicFontQA.paint({ text, family: `"${family}"`, color: '#112233', x: 8, baseline: 24, width: 240, height: 48 }), { text, family });
  const bytes = Buffer.from(actual.pixels, 'base64'); let changed = 0, max = 0; for (let i = 0; i < bytes.length; i += 4) { let any = false; for (let c = 0; c < 4; c++) { const delta = Math.abs(bytes[i + c]! - expected.data[i + c]!); max = Math.max(max, delta); any ||= delta !== 0; } if (any) changed++; }
  await info.attach(`host20-${family.replaceAll(' ', '-')}-${sha(Buffer.from(text)).slice(0, 8)}.json`, { contentType: 'application/json', body: JSON.stringify({ scope: 'Finite generated COLR-capable font browser host contract: original full source POINT cells at20px,explicitx8/baseline24 including8px padding. Unicode body-bounds-v1 translates whole contours and separates pen advance from quad origin; legacy-host retains historical host metrics. No nativeSmooth/AA claim or fitted offset. Base and foreground outlines are identical, so this does not identify which platform paint path was selected.', policy, text, family, pixels: 240 * 48, changed, max, actualAdvance: actual.advance, sourceCandidateAdvance: expected.advance, actual: sha(bytes), expected: sha(expected.data) }) });
  expect(actual.advance).toBe(expected.advance); expect(bytes.equals(expected.data), 'Entire240x48 RGBA source POINT host plane; no mask, fit or tolerance').toBe(true);
}

test('public defaults with no local bridge stay on bundled faces and preserve original size and line-height variables', async ({ page }) => {
  await open(page, true); expect(await page.evaluate(() => window.classicFontQA.hasClassicFonts)).toBe(false);
  const css = await metrics(page, '#qa-text-md'); expect(css.family).not.toContain('MCBE Classic'); expect(css.size).toBe('18px'); expect(css.line).toBe('24px');
  expect(await page.evaluate(() => [...document.fonts].filter(face => face.family.includes('MCBE Classic')).length)).toBe(0);
  const input = page.getByRole('textbox', { name: 'Controlled font input', exact: true }); await input.fill('Af 附魔'); await expect(input).toHaveValue('Af 附魔'); await expect(page.locator('[data-font-scope] canvas')).toHaveCount(0);
  await configure(page, { scoped: true }); await expect(input).toHaveValue('Af 附魔'); expect((await metrics(page, '#qa-text-md')).size).toBe('20px'); await configure(page, { scoped: false }); expect(await metrics(page, '#qa-text-md')).toEqual(css);
});

test('three private prepared faces match pinned bytes and load actual browser FontFace objects with source-derived ASCII f space and CJK advances', async ({ page }, info) => {
  await open(page); await privateFonts(page); test.skip(!existsSync(archivePath), 'Independent original source archive is optional.');
  const source = await original(), policy = await metricPolicy(), prepared = JSON.parse(await readFile('.cache/local-fonts/classic/font-metrics.json', 'utf8'));
  const provenance = JSON.parse(await readFile('.cache/local-fonts/classic/provenance.json', 'utf8'));
  const manifest = JSON.parse(await readFile('scripts/classic-font-characters.json', 'utf8'));
  const required = [...Array.from({ length: 95 }, (_, i) => String.fromCodePoint(i + 32)), ...manifest.unicodeCharacters] as string[];
  const declared = provenance.characters as string[];
  expect(new Set(declared).size).toBe(declared.length); for (const character of required) expect(declared).toContain(character);
  const expectedCodes = declared.map(character => character.codePointAt(0)!).sort((a, b) => a - b);
  const expectedCounts = [declared.length, declared.length, 95];
  // Read the declared normal-line model independently from actual font tables.
  // Construction baseline and fixed Canvas POINT origin remain unchanged.
  expect(prepared.glyphConstructionBaselineGame).toBe(8); expect(prepared.typographicAscenderGame).toBe(9); expect(prepared.typographicDescenderGame).toBe(1); expect(prepared.lineHeight).toBe(20);
  for (const [i, key] of (['classic', 'unicode', 'ascii'] as const).entries()) { const font = prepared.families[key], raw = await readFile(`.cache/local-fonts/classic/${font.file}`); expect(font.glyphCount).toBe(expectedCounts[i]); expect(sha(raw)).toBe(font.sha256); expect(raw.subarray(0, 4).toString()).toBe('wOF2'); }
  // Exercise the real Vite plugin in an isolated CPU child with one read-only
  // existsSync overlay. No actual font is renamed, removed or edited.
  const absentGroup = JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';import{resolve}from'node:path';const real=fs.existsSync,missing=resolve('.cache/local-fonts/classic/MCBE-Classic-Unicode.woff2');fs.existsSync=p=>resolve(String(p))===missing?false:real(p);syncBuiltinESMExports();const config=(await import('./vite.config.ts')).default,plugin=config.plugins.find(p=>p.name==='mcbeui-local-game-font'),code=await plugin.load.call({},'\\0virtual:mcbeui-game-font');console.log(JSON.stringify({flags:[...code.matchAll(/export const (hasClassic(?:Unicode|Ascii)?Font) = (true|false);/g)].map(m=>[m[1],m[2]]),registered:code.includes("font-family:'MCBE Classic")}));`], { encoding: 'utf8' }));
  expect(absentGroup.flags).toEqual([['hasClassicFont', 'false'], ['hasClassicUnicodeFont', 'false'], ['hasClassicAsciiFont', 'false']]); expect(absentGroup.registered).toBe(false);
  const cmapAudit = JSON.parse(execFileSync('python', ['-c', `import sys,pathlib,json
sys.path.insert(0,str(pathlib.Path('.cache/python').resolve()))
from fontTools.ttLib import TTFont
result=[]
for filename in ['MCBE-Classic.woff2','MCBE-Classic-Unicode.woff2','MCBE-Classic-ASCII.woff2']:
 f=TTFont(pathlib.Path('.cache/local-fonts/classic')/filename);c=f.getBestCmap();layers=f['COLR'].ColorLayers
 result.append({'family':f['name'].getDebugName(1),'cmap':len(c),'codepoints':sorted(c),'paintEntries':len(layers),'foregroundOnly':all(len(v)==1 and v[0].colorID==65535 for v in layers.values()),'vertical':{'em':f['head'].unitsPerEm,'hhea':[f['hhea'].ascent,f['hhea'].descent,f['hhea'].lineGap],'typo':[f['OS/2'].sTypoAscender,f['OS/2'].sTypoDescender,f['OS/2'].sTypoLineGap],'win':[f['OS/2'].usWinAscent,f['OS/2'].usWinDescent]},'advances':{str(k):f['hmtx'].metrics[v][0]/50 for k,v in c.items()}})
print(json.dumps(result))`], { encoding: 'utf8' }));
  expect(cmapAudit.map((font: { cmap: number }) => font.cmap)).toEqual(expectedCounts);
  expect(cmapAudit.map((font: { codepoints: number[] }) => font.codepoints)).toEqual([expectedCodes, expectedCodes, Array.from({ length: 95 }, (_, i) => i + 32)]);
  const declaredVertical = [prepared.em * prepared.typographicAscenderGame / 10, -prepared.em * prepared.typographicDescenderGame / 10, 0];
  for (const [i, audit] of cmapAudit.entries()) { expect(audit.family).toBe(fonts[i]); expect(audit.foregroundOnly).toBe(true); expect(audit.paintEntries).toBe(audit.cmap); expect(audit.vertical.em).toBe(prepared.em); expect(audit.vertical.hhea).toEqual(declaredVertical); expect(audit.vertical.typo).toEqual(declaredVertical); expect(audit.vertical.win[0]).toBeGreaterThanOrEqual(declaredVertical[0]!); expect(audit.vertical.win[1]).toBeGreaterThanOrEqual(-declaredVertical[1]!); for (const character of i === 2 ? ['A', 'f', ' '] : ['A', 'f', 'I', '1', ' ', '附', '魔', '台', '：']) expect(audit.advances[String(character.codePointAt(0))]).toBe(glyph(source, character, fonts[i]!, policy).advance); }
  const loaded = await loadFaces(page); for (const role of loaded) { expect(role.faces.length).toBeGreaterThan(0); expect(role.faces.every(face => face.family.replace(/["']/g, '') === role.family && face.status === 'loaded')).toBe(true); }
  const advances = []; for (const family of fonts) for (const text of family.endsWith('ASCII') ? ['A', 'f', ' ', 'Af f'] : ['A', 'f', ' ', '附魔台', 'Af 附魔']) {
    const expected = [...text].reduce((sum, character) => sum + glyph(source, character, family, policy).advance, 0), actual = await page.evaluate(({ text, family }) => window.classicFontQA.paint({ text, family: `"${family}"` }).advance, { text, family }); expect(actual).toBe(expected); advances.push({ family, text, actual, sourceHostCandidate: expected }); }
  await info.attach('actual-font-faces-and-finite-host-advances.json', { contentType: 'application/json', body: JSON.stringify({ policy, loaded, advances, cmapAudit, declaredVertical, glyphConstructionBaselineGame: prepared.glyphConstructionBaselineGame, scope: 'Real face loading plus independent fontTools cmap/hmtx versus original source host advances distinguish fallback. Normal-line tables match explicit9/1 metadata; glyph construction and fixed Canvas baseline remain8game. Optional requested characters are checked against declared exactcmap, not assumed189. Not recovered native width or unique line layout algorithm.' }) });
});

test('prepared COLR fonts paint complete original ASCII Unicode and mixed source POINT cells at explicit20px host baseline without fitting', async ({ page }, info) => {
  await open(page); await privateFonts(page); test.skip(!existsSync(archivePath), 'Independent original source archive is optional.'); await loadFaces(page); const source = await original();
  await pixelProof(page, info, source, 'Af f 1', 'MCBE Classic ASCII'); await pixelProof(page, info, source, '附魔台', 'MCBE Classic Unicode'); await pixelProof(page, info, source, 'Af 附魔台', 'MCBE Classic');
  const policy = await metricPolicy();
  const bodyText = 'Bedrock UI 0123456789 abc XYZ';
  if (policy === 'body-bounds-v1') {
    // Immutable finite native Book draw coordinates, converted game→CSS20 by2.
    // This is a test oracle, never a normal renderer input or arbitrary glyph-width table.
    const nativeQuadOrigins = [0, 8, 16, 24, 32, 40, 48, 64, 71, 87, 94, 102, 110, 118, 126, 134, 142, 150, 158, 174, 182, 190, 206, 214, 223];
    expect(expectedPlane(source, bodyText, 'MCBE Classic Unicode', [17, 34, 51], policy).quadOrigins).toEqual(nativeQuadOrigins);
    await info.attach('finite-native-body-quad-constraints.json', { contentType: 'application/json', body: JSON.stringify({ text: bodyText, nativeQuadOriginsCss20: nativeQuadOrigins, independentAuditSHA256: '4c8919351933e3e58843b53a057cd9537bab363c71f22fddd35bf8c2c33a18f0', scope: '25 visible glyph instances from one original Book body line; fixed pen0, not per-character fitting, not all95ASCII certification or nativeSmoothRGBA.' }) });
  }
  await pixelProof(page, info, source, policy === 'body-bounds-v1' ? bodyText : 'BI1 +7', 'MCBE Classic Unicode');
  await pixelProof(page, info, source, '+7 攻击伤害', 'MCBE Classic Unicode');
  await pixelProof(page, info, source, '魔咒花费：1', 'MCBE Classic Unicode');
  const prepared = JSON.parse(await readFile('.cache/local-fonts/classic/font-metrics.json', 'utf8'));
  const addedText = '像素字体测试', covered = [...addedText].every(c => c in prepared.families.unicode.glyphs);
  if (covered) await pixelProof(page, info, source, addedText, 'MCBE Classic Unicode');
  await info.attach('finite-body-point-scope.json', { contentType: 'application/json', body: JSON.stringify({ policy, nativeCorpusVocabulary: 'Known25ASCII across128body instances; fixed source glyph point-plane, not nativeSmoothRGBA or95ASCII certification.', optionalAddedHan: { text: addedText, covered } }) });
});

test('all available document profiles consistently theme Text native Input Select Combobox popup and body-portal Dialog', async ({ page }, info) => {
  await open(page); const availability = await page.evaluate(() => ({ classic: window.classicFontQA.hasClassicFonts, local: window.classicFontQA.hasGameFont })), profiles = ['open', ...(availability.local ? ['local'] : []), ...(availability.classic ? ['classic'] : [])] as ('classic' | 'local' | 'open')[];
  const observed = []; for (const profile of profiles) {
    await choose(page, profile); const text = await metrics(page, '#qa-text-md'), expectedSize = profile === 'open' ? '18px' : '20px'; expect(text.size).toBe(expectedSize); expect(text.line).toBe('24px');
    const tooltip = await metrics(page, '#qa-item-tooltip'); if (profile === 'classic') expect(tooltip.family).toContain('MCBE Classic Unicode'); else expect(tooltip.family).toBe(text.family);
    for (const selector of ['input[name="fontInput"]', '[role="combobox"][aria-labelledby$="-label"]']) { const values = await page.locator(selector).evaluateAll(nodes => nodes.map(node => { const css = getComputedStyle(node); return { family: css.fontFamily, size: css.fontSize }; })); for (const value of values) { expect(value.family).toBe(text.family); expect(value.size).toBe(expectedSize); } }
    const select = page.getByRole('combobox', { name: 'Font Select', exact: true }); await select.click(); const popup = page.getByRole('listbox', { name: 'Font Select', exact: true }); await expect(popup).toBeVisible(); expect(await popup.evaluate(node => getComputedStyle(node).fontFamily)).toBe(text.family); await select.press('Escape');
    const combo = page.getByRole('combobox', { name: 'Font Combobox', exact: true }); await combo.click(); const boxPopup = page.getByRole('listbox', { name: 'Font Combobox', exact: true }); expect(await boxPopup.evaluate(node => getComputedStyle(node).fontFamily)).toBe(text.family); await combo.press('Escape');
    await page.getByRole('button', { name: 'Open font dialog', exact: true }).click(); const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible(); expect(await dialog.evaluate(node => node.parentElement === document.body)).toBe(true); expect((await metrics(page, '#qa-dialog-text')).family).toBe(text.family); expect(await page.getByRole('textbox', { name: 'Dialog font input', exact: true }).evaluate(node => getComputedStyle(node).fontFamily)).toBe(text.family); await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click(); observed.push({ profile, text });
  }
  await info.attach('available-profile-controls-and-portal.json', { contentType: 'application/json', body: JSON.stringify({ availability, observed }) });
});

test('font switches retain real controlled input identity selection composition change and reset without a Canvas replacement', async ({ page }) => {
  await open(page); const input = page.getByRole('textbox', { name: 'Controlled font input', exact: true }), handle = await input.elementHandle(); await input.fill('Af12 附魔'); await input.evaluate(node => (node as HTMLInputElement).setSelectionRange(1, 4));
  const profiles = await page.evaluate(() => ['open', ...(window.classicFontQA.hasGameFont ? ['local'] : []), ...(window.classicFontQA.hasClassicFonts ? ['classic'] : [])]);
  for (const profile of profiles) { await choose(page, profile as 'classic' | 'local' | 'open'); expect(await handle!.evaluate(node => node === window.classicFontQA.input)).toBe(true); await expect(input).toBeFocused(); expect(await input.evaluate(node => [(node as HTMLInputElement).selectionStart, (node as HTMLInputElement).selectionEnd])).toEqual([1, 4]); await expect(input).toHaveValue('Af12 附魔'); }
  await input.evaluate(node => { node.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '附' })); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(node, 'Af 附'); node.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: '附', isComposing: true })); node.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '附' })); });
  await expect(input).toHaveValue('Af 附'); await expect(page.getByLabel('Font fixture events')).toContainText('composition:start'); await expect(page.getByLabel('Font fixture events')).toContainText('composition:end'); await expect(page.getByRole('textbox', { name: 'Controlled font textarea', exact: true })).toHaveValue('Af 附');
  await page.getByRole('button', { name: 'Reset controls', exact: true }).click(); await expect(input).toHaveValue('Af 附魔'); expect(await handle!.evaluate(node => node === window.classicFontQA.input)).toBe(true); await expect(page.locator('[data-font-scope] canvas')).toHaveCount(0);
});

test('Classic local scope clears cleanly and the actual profile hook restores host root classes variables and data on unmount', async ({ page }) => {
  await open(page); await choose(page, 'open'); const baseline = await metrics(page, '#qa-text-md'), outside = await metrics(page, '#qa-outside-text'); await configure(page, { scoped: true }); const local = await metrics(page, '#qa-text-md'); expect(local.family).toContain('MCBE Classic'); expect(local.size).toBe('20px'); expect(await metrics(page, '#qa-outside-text')).toEqual(outside); await configure(page, { scoped: false }); expect(await metrics(page, '#qa-text-md')).toEqual(baseline);
  await page.evaluate(() => window.classicFontQA.unmount()); await expect(page.locator('[data-theme-unmounted]')).toHaveCount(1);
  expect(await page.evaluate(() => { const css = getComputedStyle(document.documentElement); return Object.fromEntries(Object.keys(window.classicFontQA.baseline).map(key => [key, css.getPropertyValue(key)])); })).toEqual(await page.evaluate(() => window.classicFontQA.baseline));
  await expect(page.locator('html')).toHaveClass('qa-preserved'); await expect(page.locator('html')).toHaveAttribute('data-demo-font-profile', 'host-before');
});

test('missing local font network resources visibly fall back while ordinary input and controlled changes remain usable', async ({ page }) => {
  const blocked: string[] = []; await page.route('**/*', route => { const request = route.request(); if (request.resourceType() === 'font' && request.url().includes('/classic/')) { blocked.push(request.url()); return route.abort('failed'); } return route.continue(); });
  await open(page); await privateFonts(page); await choose(page, 'classic'); await page.evaluate(async () => { try { await document.fonts.load('20px "MCBE Classic"', 'Af 附魔'); } catch { /* Real failed face is the tested fallback path. */ } await document.fonts.ready; }); expect(blocked.length).toBeGreaterThan(0);
  const failed = await page.evaluate(() => [...document.fonts].filter(face => face.family.replace(/["']/g, '') === 'MCBE Classic').map(face => face.status)); expect(failed).toContain('error');
  const input = page.getByRole('textbox', { name: 'Controlled font input', exact: true }); await input.fill('Af 1 附'); await expect(input).toHaveValue('Af 1 附'); await expect(input).toBeVisible(); expect(await input.evaluate(node => getComputedStyle(node).color)).not.toBe('rgba(0, 0, 0, 0)'); await expect(page.locator('[data-font-scope] canvas')).toHaveCount(0);
});

test('Anvil and ItemTooltip use explicit Unicode roles with source pen constraints exact colors shadow host override and fallback', async ({ page }, info) => {
  await open(page); const classic = await page.evaluate(() => window.classicFontQA.hasClassicFonts); await choose(page, classic ? 'classic' : 'open'); const normal = '#qa-anvil-normal .mc-anvil__cost', override = '#qa-anvil-override .mc-anvil__cost';
  expect((await metrics(page, normal)).color).toBe('rgb(127, 255, 31)'); expect((await metrics(page, normal)).shadow).toBe('rgb(32, 64, 8) 2px 2px 0px'); if (classic) expect((await metrics(page, normal)).family).toContain('MCBE Classic Unicode');
  if (classic && existsSync(archivePath)) { await loadFaces(page); const source = await original(), policy = await metricPolicy(), families = [(await metrics(page, normal)).family, (await metrics(page, '#qa-anvil-normal .mc-workstation__title')).family]; const widths = await page.evaluate(families => families.map(family => window.classicFontQA.paint({ text: '1', family }).advance), families); expect(widths).toEqual([glyph(source, '1', 'MCBE Classic Unicode', policy).advance, glyph(source, '1', 'MCBE Classic', policy).advance]); expect(widths[0]).not.toBe(widths[1]); }
  await configure(page, { cost: 'red' }); expect((await metrics(page, normal)).color).toBe('rgb(255, 89, 89)'); expect((await metrics(page, normal)).shadow).toBe('rgb(64, 22, 22) 2px 2px 0px');
  await configure(page, { cost: 'green', overrides: true }); const changed = await metrics(page, override); expect(changed.family).toContain('MCBE Classic ASCII'); expect(changed.color).toBe('rgb(17, 34, 51)'); expect(changed.shadow).toBe('rgb(1, 2, 3) 4px 4px 0px');
  await configure(page, { cost: 'red' }); expect((await metrics(page, override)).color).toBe('rgb(51, 68, 85)'); expect((await metrics(page, override)).shadow).toBe('rgb(3, 4, 5) 4px 4px 0px');
  await configure(page, { overrides: false, roleFallback: true }); expect((await metrics(page, normal)).family).toBe((await metrics(page, '#qa-text-md')).family); await expect(page.locator(normal)).toHaveText('Af 1 附魔'); await expect(page.locator('#qa-anvil-normal canvas')).toHaveCount(0);
  await expect(page.locator('#qa-item-tooltip .mc-item-tooltip__name')).toHaveText('钻石剑'); await expect(page.locator('#qa-item-tooltip .mc-item-tooltip__lore')).toHaveText('+7 攻击伤害');
  if (classic) {
    const family = (await metrics(page, '#qa-item-tooltip')).family; expect(family).toContain('MCBE Classic Unicode');
    const widths = await page.evaluate(family => ['+', '+7', '+7 '].map(text => window.classicFontQA.paint({ text, family }).advance), family);
    const constraintPath = '.cache/classic-font-metric-constraints-01/FINAL.json';
    let sourceConstraint = { plusAdvanceCSS20Observed: 9, plusSevenSpaceTotalCSS20Observed: 25, sevenAndSpaceCombinedCSS20Observed: 16, individualSevenAndSpaceNativeProven: false };
    const canonicalEvidenceAvailable = existsSync(constraintPath);
    if (canonicalEvidenceAvailable) { const bytes = await readFile(constraintPath); expect(sha(bytes)).toBe('51dde50ab82491bc54a000642e633ab11d4552cf0a5e64d05dbb0a467cff0be2'); sourceConstraint = JSON.parse(bytes.toString()); }
    // Original Unicode adjacent'+' pen9 and joint'7 '+space16. The chosen
    // individual8/8 split is a host policy, not a unique native inference.
    expect(widths[0]).toBe(sourceConstraint.plusAdvanceCSS20Observed); expect(widths[2]! - widths[0]!).toBe(sourceConstraint.sevenAndSpaceCombinedCSS20Observed); expect(widths[2]).toBe(sourceConstraint.plusSevenSpaceTotalCSS20Observed);
    expect(widths[1]! - widths[0]!, 'Chosen host7 split, not an independently recovered native7 advance').toBe(8); expect(widths[2]! - widths[1]!, 'Chosen host space split').toBe(8);
    await info.attach('tooltip-unicode-finite-adjacent-pen.json', { contentType: 'application/json', body: JSON.stringify({ family, texts: ['+', '+7', '+7 '], widths, canonicalEvidenceAvailable, sourceConstraint, scope: 'Finite Unicode adjacent plus9 and joint7-space16, raw VB/CBV proof pinned when available; otherwise declared host policy only. Individual7/space8-8 split remains chosen host policy. Glyph pixels independently source-derived, not nativeSmoothRGBA.' }) });
    await configure(page, { tooltipOverride: true }); const custom = (await metrics(page, '#qa-item-tooltip')).family; expect(custom).toContain('MCBE Classic ASCII');
    if (existsSync(archivePath)) { const source = await original(), policy = await metricPolicy(), width = await page.evaluate(family => window.classicFontQA.paint({ text: '+', family }).advance, custom); expect(width).toBe(glyph(source, '+', 'MCBE Classic ASCII', policy).advance); expect(width).not.toBe(widths[0]); }
    await configure(page, { tooltipOverride: false }); expect((await metrics(page, '#qa-item-tooltip')).family).toContain('MCBE Classic Unicode');
  }
});

test('Classic font sizes change through20 20 40 60 while explicit existing line-height and default text shadows remain intact', async ({ page }) => {
  await open(page); await choose(page, 'classic');
  const sizes = await Promise.all(['sm', 'md', 'lg', 'xl'].map(size => metrics(page, `#qa-text-${size}`))); expect(sizes.map(value => value.size)).toEqual(['20px', '20px', '40px', '60px']); expect(sizes.map(value => value.line)).toEqual(['24px', '24px', '48px', '72px']);
  const variables = await page.evaluate(() => { const css = getComputedStyle(document.documentElement); return { title: css.getPropertyValue('--mc-title-size').trim(), line: css.getPropertyValue('--mc-line-height').trim() }; }); expect(variables).toEqual({ title: '40px', line: '24px' }); expect((await metrics(page, 'input[name="fontInput"]')).shadow).toBe('rgb(63, 63, 63) 2px 2px 0px');
});

test('real gallery profile picker changes the document theme while calibration retains its existing Mojangles profile', async ({ page }) => {
  await page.goto('/'); const picker = page.getByRole('combobox', { name: 'Font profile', exact: true }); await expect(picker).toBeVisible(); await picker.press('End'); await picker.press('Enter'); await expect(page.locator('html')).toHaveAttribute('data-demo-font-profile', 'open');
  const classic = await page.evaluate(() => [...document.fonts].some(face => face.family.includes('MCBE Classic'))); if (classic) { await picker.press('Home'); await picker.press('Enter'); await expect(page.locator('html')).toHaveAttribute('data-demo-font-profile', 'classic'); }
  await page.goto('/calibration.html'); await expect(page.locator('html')).not.toHaveClass(/mc-classic-fonts|demo-font-open|demo-font-local/); const root = await page.evaluate(() => { const css = getComputedStyle(document.documentElement); return { family: css.getPropertyValue('--mc-font'), size: css.getPropertyValue('--mc-font-size').trim() }; }); expect(root.family).toContain('Mojangles'); expect(root.family).not.toContain('MCBE Classic'); expect(root.size).toBe('20px');
});
