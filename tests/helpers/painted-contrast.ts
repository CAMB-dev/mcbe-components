import type { Page, TestInfo } from '@playwright/test';
import type { Result, NodeResult } from 'axe-core';
import { PNG } from 'pngjs';
import { createHash } from 'node:crypto';

const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
function luminance(rgb: readonly number[]) {
  return rgb.slice(0, 3).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index]!, 0);
}
function contrast(a: readonly number[], b: readonly number[]) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

/** Resolve a reported text/background pair against the actual image-backed
 * paint. No source palette, Axe rule or threshold is changed. Unsupported or
 * unstable rendering fails closed for review. This is not a WCAG conformance
 * certificate and does not qualify unreported controls or native game drawing. */
export async function verifyPaintedContrast(page: Page, node: NodeResult, info: TestInfo, name: string) {
  if (!node.target.every(part => typeof part === 'string')) throw new Error('Painted contrast requires a same-document CSS target');
  const target = page.locator((node.target as string[]).join(' '));
  if (await target.count() !== 1) throw new Error('Painted contrast target must resolve exactly once');
  const data = node.any.find(check => check.id === 'color-contrast')?.data as { expectedContrastRatio?: string } | undefined;
  const required = Number.parseFloat(data?.expectedContrastRatio ?? '');
  if (!(required === 3 || required === 4.5 || required === 7)) throw new Error('Unresolved Axe contrast requirement');
  const metadata = await target.evaluate(element => {
    const view = element.ownerDocument.defaultView!, style = view.getComputedStyle(element);
    for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
      const value = view.getComputedStyle(ancestor);
      if (value.opacity !== '1' || value.filter !== 'none' || value.mixBlendMode !== 'normal') throw new Error('Unqualified opacity/filter/blend on text ancestry');
    }
    const nativeText = element.matches('input,textarea');
    let renderedText = element.textContent;
    if (nativeText) {
      if (element.matches('input') && !['text', 'search', 'tel', 'url', 'email'].includes((element as HTMLInputElement).type)) throw new Error('Unqualified native text input type');
      renderedText = (element as HTMLInputElement | HTMLTextAreaElement).value;
      // A placeholder has its own style and is not the control's value glyphs.
      if (!renderedText.trim()) throw new Error('Unqualified empty native value or placeholder-only text');
    } else if (element.matches('select,svg,canvas,img,video,object')) throw new Error('Painted contrast requires an HTML text leaf');
    if (element.querySelector('input,textarea,select,svg,canvas,video,object')) throw new Error('Painted contrast requires an HTML text leaf without nested controls or replaced drawing');
    for (const image of element.querySelectorAll('img')) {
      if (image.getAttribute('alt') !== '' || image.hasAttribute('aria-label') || image.hasAttribute('aria-labelledby') || image.hasAttribute('role') || (image as HTMLImageElement).tabIndex >= 0) throw new Error('Unqualified nondecorative descendant image');
    }
    if (style.textShadow !== 'none') throw new Error('Unqualified text shadow');
    // A pseudo-element can draw text outside the DOM text-node inventory.
    // Empty decorative pseudos are retained, including currentColor borders.
    for (const item of [element, ...element.querySelectorAll('*')]) {
      for (const pseudo of ['::before', '::after']) {
        const content = view.getComputedStyle(item, pseudo).content;
        if (!['none', 'normal', '""', "''"].includes(content)) throw new Error('Unqualified generated text or replaced pseudo content');
      }
    }
    const text = element.ownerDocument.createTreeWalker(element, view.NodeFilter.SHOW_TEXT);
    let leaf: Node | null;
    while ((leaf = text.nextNode())) if (leaf.textContent?.trim()) {
      for (let owner = leaf.parentElement; owner; owner = owner.parentElement) {
        const value = view.getComputedStyle(owner);
        if (value.opacity !== '1' || value.filter !== 'none' || value.mixBlendMode !== 'normal') throw new Error('Unqualified opacity/filter/blend on text ancestry');
        if (value.textShadow !== 'none') throw new Error('Unqualified text shadow');
        if (owner === element) break;
      }
      const value = view.getComputedStyle(leaf.parentElement!);
      if (value.color !== style.color || value.webkitTextFillColor !== style.color || value.webkitTextStrokeWidth !== '0px'
        || value.fontSize !== style.fontSize || value.fontWeight !== style.fontWeight) throw new Error('Unqualified mixed text colors, sizes, weights or fill/stroke');
    }
    if (style.webkitTextFillColor !== style.color || style.webkitTextStrokeWidth !== '0px') throw new Error('Unqualified text fill/stroke');
    return { text: renderedText, textSource: nativeText ? 'native-value' : 'dom-text', color: style.color, fontSize: style.fontSize, fontWeight: style.fontWeight };
  });
  const parsed = /^rgba?\((\d+), (\d+), (\d+)(?:, (1))?\)$/.exec(metadata.color);
  if (!parsed) throw new Error('Only opaque computed sRGB text is qualified');
  const foreground = [Number(parsed[1]), Number(parsed[2]), Number(parsed[3]), 255];
  // A handle retains the exact native nodes and inline attributes. No React
  // update, display/visibility/layout override or background repaint is used.
  // Capture before ANY screenshot: Playwright's temporary native caret style
  // can serialize an existing compact inline attribute through CSSOM.
  const styles = await target.evaluateHandle(element => {
    const view = element.ownerDocument.defaultView!;
    const capture = (item: Element, pseudo: string | null) => {
      const computed = view.getComputedStyle(item, pseudo);
      // Fail closed if changing the inline fill attribute affects any other
      // computed property through application selectors, inheritance or paint.
      return Object.fromEntries(Array.from(computed).map(key => [key, computed.getPropertyValue(key)]));
    };
    return [element, ...element.querySelectorAll('*')].map(item => ({ element: item as HTMLElement, style: item.getAttribute('style'), computed: capture(item, null), before: capture(item, '::before'), after: capture(item, '::after') }));
  });
  let originalBox: { x: number; y: number; width: number; height: number } | null | undefined;
  const restoreRawStyles = async () => {
    await styles.evaluate(saved => { for (const { element, style } of saved) {
      if (style === null) element.removeAttribute('style'); else element.setAttribute('style', style);
    } });
  };
  const checkComputedStyles = async (allowFillOverride = false) => {
    await styles.evaluate((saved, allowFillOverride) => { for (const item of saved) {
      const view = item.element.ownerDocument.defaultView!;
      for (const [pseudo, baseline] of [[null, item.computed], ['::before', item.before], ['::after', item.after]] as const) {
        const computed = view.getComputedStyle(item.element, pseudo);
        for (const [key, value] of Object.entries(baseline)) {
          if (allowFillOverride && key === '-webkit-text-fill-color') continue;
          if (computed.getPropertyValue(key) !== value) throw new Error(`Text probe changed non-fill computed style: ${pseudo ?? 'element'} ${key}`);
        }
      }
    } }, allowFillOverride);
  };
  try {
    const originalBytes = await target.screenshot({ caret: 'hide' }), original = PNG.sync.read(originalBytes);
    await restoreRawStyles();
    await checkComputedStyles();
    originalBox = await target.boundingBox();
    let backingBytes: Buffer | undefined, blackBytes: Buffer | undefined, whiteBytes: Buffer | undefined, probeFailure: unknown;
    const probe = async (fill: string) => {
      await styles.evaluate((saved, fill) => { for (const { element } of saved) {
        // Preserve color and shadows: currentColor paints real backdrops too.
        element.style.setProperty('-webkit-text-fill-color', fill, 'important');
      } }, fill);
      await checkComputedStyles(true);
      const bytes = await target.screenshot({ caret: 'hide' });
      if (JSON.stringify(originalBox) !== JSON.stringify(await target.boundingBox())) throw new Error('Text probe changed geometry');
      return bytes;
    };
    try {
      backingBytes = await probe('transparent');
      blackBytes = await probe('rgb(0, 0, 0)');
      whiteBytes = await probe('rgb(255, 255, 255)');
    } catch (error) {
      probeFailure = error;
    } finally {
      await restoreRawStyles();
    }
    const restoredBytes = await target.screenshot({ caret: 'hide' }), restored = PNG.sync.read(restoredBytes);
    // The restored screenshot can itself normalize the native control's style.
    await restoreRawStyles();
    await checkComputedStyles();
    if (original.width !== restored.width || original.height !== restored.height || digest(original.data) !== digest(restored.data)
      || JSON.stringify(originalBox) !== JSON.stringify(await target.boundingBox())) throw new Error('Text probe did not restore the identical complete original paint');
    if (probeFailure) throw probeFailure;
    if (!backingBytes || !blackBytes || !whiteBytes) throw new Error('Missing complete text probe plane');
    const backing = PNG.sync.read(backingBytes), black = PNG.sync.read(blackBytes), white = PNG.sync.read(whiteBytes);
    if ([backing, black, white, restored].some(plane => plane.width !== original.width || plane.height !== original.height)
      || digest(original.data) !== digest(restored.data)) throw new Error('Text probe did not restore the identical complete original paint');
    let candidateGlyphPixels = 0, minimumRatio = Infinity, originalMismatchedCandidatePixels = 0, originalMaxChannelDelta = 0;
    const coverage = new PNG({ width: original.width, height: original.height });
    const colors = new Map<string, number>(), originalCandidateColors = new Map<string, number>();
    for (let offset = 0; offset < original.data.length; offset += 4) {
      const candidate = black.data[offset] === 0 && black.data[offset + 1] === 0 && black.data[offset + 2] === 0 && black.data[offset + 3] === 255
        && white.data[offset] === 255 && white.data[offset + 1] === 255 && white.data[offset + 2] === 255 && white.data[offset + 3] === 255;
      coverage.data.set(candidate ? [255, 255, 255, 255] : [0, 0, 0, 255], offset);
      if (!candidate) continue;
      // Quantized black/white endpoints identify high-coverage candidates, not
      // mathematically exact alpha1. Never filter by original raster RGB or
      // original == backing: invisible glyphs must still receive ratio 1.
      const actual = Array.from(original.data.subarray(offset, offset + 4));
      if (!foreground.every((value, channel) => actual[channel] === value)) originalMismatchedCandidatePixels++;
      for (let channel = 0; channel < 4; channel++) originalMaxChannelDelta = Math.max(originalMaxChannelDelta, Math.abs(actual[channel]! - foreground[channel]!));
      const originalKey = actual.join(','); originalCandidateColors.set(originalKey, (originalCandidateColors.get(originalKey) ?? 0) + 1);
      const background = Array.from(backing.data.subarray(offset, offset + 4));
      if (background[3] !== 255) throw new Error('Unqualified nonopaque paint backing');
      candidateGlyphPixels++; minimumRatio = Math.min(minimumRatio, contrast(foreground, background));
      const key = background.join(','); colors.set(key, (colors.get(key) ?? 0) + 1);
    }
    const result = { target: node.target, ...metadata, foreground, required, candidateGlyphPixels, minimumRatio, backingColors: Array.from(colors),
      originalMismatchedCandidatePixels, originalMaxChannelDelta, originalCandidateRGBA: Array.from(originalCandidateColors),
      size: [original.width, original.height], restoredWholeRGBA: digest(restored.data), coverageWholeRGBA: digest(coverage.data),
      scope: 'All black/white endpoint-quantized glyph candidates, including originally invisible glyphs, use the homogeneous intended CSS foreground against actual transparent-fill backing. No candidate is filtered by original raster RGB; mismatch count, maximum channel delta and full original RGBA distribution are retained. Endpoint quantization does not prove exact alpha1 or cover all antialiased edges; no pixel-perfect raster or WCAG conformance claim, and no contrast threshold tolerance.' };
    await info.attach(name + '-contrast.json', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
    await info.attach(name + '-original.png', { body: originalBytes, contentType: 'image/png' });
    await info.attach(name + '-backing.png', { body: backingBytes, contentType: 'image/png' });
    await info.attach(name + '-black-fill.png', { body: blackBytes, contentType: 'image/png' });
    await info.attach(name + '-white-fill.png', { body: whiteBytes, contentType: 'image/png' });
    await info.attach(name + '-restored.png', { body: restoredBytes, contentType: 'image/png' });
    await info.attach(name + '-endpoint-glyph-candidates.png', { body: PNG.sync.write(coverage), contentType: 'image/png' });
    if (!candidateGlyphPixels || minimumRatio < required) throw new Error(`Rendered text contrast failed: ${metadata.text} (${minimumRatio}, required ${required}, ${candidateGlyphPixels} endpoint-quantized glyph candidates)`);
    return result;
  } finally {
    // Covers successful return, screenshot/probe rejection and low-contrast
    // rejection. Exact raw attributes are restored after the LAST screenshot.
    try {
      await restoreRawStyles();
      await styles.evaluate(saved => { for (const { element, style } of saved) {
        if (element.getAttribute('style') !== style) throw new Error('Text probe did not restore exact raw inline attributes');
      } });
      await checkComputedStyles();
      if (originalBox !== undefined && JSON.stringify(originalBox) !== JSON.stringify(await target.boundingBox())) throw new Error('Text probe final restoration changed geometry');
    } finally { await styles.dispose(); }
  }
}

export async function verifyAxeWithPaintedContrast(page: Page, violations: readonly Result[], info: TestInfo, name: string) {
  await info.attach(name + '-raw-axe.json', { body: JSON.stringify(violations, null, 2), contentType: 'application/json' });
  const serious = violations.filter(result => result.impact === 'serious' || result.impact === 'critical');
  const structural = serious.filter(result => result.id !== 'color-contrast');
  if (structural.length) throw new Error('Unresolved Axe rules: ' + structural.map(result => `${result.id} (${result.nodes.length})`).join(', '));
  const results = [];
  for (const violation of serious) for (const [index, node] of violation.nodes.entries()) results.push(await verifyPaintedContrast(page, node, info, `${name}-${violation.id}-${index}`));
  return results;
}
