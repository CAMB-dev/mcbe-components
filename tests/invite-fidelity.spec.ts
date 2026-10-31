import { test, expect } from '@playwright/test';
import type { Locator, Page, TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { InvitePersonRow } from '../src/invite-person-row';
import type { InvitePersonRowProps } from '../src/invite-types';

test.use({ viewport: { width: 2200, height: 2000 } });

// Independent original ZIP d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf.
// Fixed RAWASSETS whole PNG pins, never derived from production Invite assets/DOM.
const original = {
  "MainBannersHover": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/MainBannersHover.png",
    "c8e899024b825e2baae02b4588e1182d3812019f621859856b045bfc50c41488"
  ],
  "ScrollHandle": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/ScrollHandle.png",
    "f5e26f4b26c2edadd36e8a8bec2018b86558525f9920168d8d2c277bd210f46a"
  ],
  "ScrollRail": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/ScrollRail.png",
    "eab268e0814cb9db1e2c8e158cea2d54a9b5f07fe0b7b74f82d5a67fa32cc6be"
  ],
  "arrow_l_default": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/arrow_l_default.png",
    "2930e3d4bff0fa83d0cf13bb3f4c0e30542e41e50b604a19e83c472a614c9369"
  ],
  "arrow_r_default": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/arrow_r_default.png",
    "6aeb95fcac2611b74fa003e8de6ac561a6d320512200f1da7d794ad41a5719d3"
  ],
  "bundle_item_background": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/bundle_item_background.png",
    "bbbfc25d4b7bc0b3536f9e402b07e80ac97311c9ee40c6cdcbcdd01aa2a7091b"
  ],
  "button_borderless_light": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/button_borderless_light.png",
    "313b607889ba3d224cf599420087876ccb3f4572b304dc1ba6c25825f7d2c376"
  ],
  "button_borderless_lighthover": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/button_borderless_lighthover.png",
    "e4cdc816ebbfae2bea1e870fbde0c59effd680cdec388ba1e66424645573aea8"
  ],
  "button_borderless_lightpressed": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/button_borderless_lightpressed.png",
    "47f6ed1760ae8e407cdbb6b7207a5ee45b8a0db861f16f0696c5cf61c9961983"
  ],
  "cell_image": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/cell_image.png",
    "296e3d0ba9640efcd2902aa9c191f544b09bdbb8f4585d39a6c030e0ae3fc023"
  ],
  "cell_image_lock": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/cell_image_lock.png",
    "3970ff5f9630bd9d805a9e997f16f4d241b73e97c1b722b8ba48167d0ab7aa79"
  ],
  "checkbox_check": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/checkbox_check.png",
    "8c96d1fccfc21f611859cfe71d04f4f98b7aea9753cfbcf2d6e3257b56700062"
  ],
  "checkbox_checkDisabled": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/checkbox_checkDisabled.png",
    "8c96d1fccfc21f611859cfe71d04f4f98b7aea9753cfbcf2d6e3257b56700062"
  ],
  "checkbox_checkHover": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/checkbox_checkHover.png",
    "29b33214de8a4621a2b882eaeb5adcce22053e97669cac459bf167a70bdec8c2"
  ],
  "checkbox_check_locked": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/checkbox_check_locked.png",
    "31e32a1cdacc7c4798341f9fc29fe24976ba96585f4d160d2a2e9c555482eae6"
  ],
  "checkbox_space": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/checkbox_space.png",
    "73cd8740b2c5deade8396c855d7c30d80a56186f0aeafd00bdc5a8d330a2e014"
  ],
  "checkbox_spaceDisabled": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/checkbox_spaceDisabled.png",
    "73cd8740b2c5deade8396c855d7c30d80a56186f0aeafd00bdc5a8d330a2e014"
  ],
  "checkbox_spaceHover": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/checkbox_spaceHover.png",
    "bd5babf3900537bda4f887be0cd22abbaea656959d32b88517d3943e5d95c0a6"
  ],
  "checkbox_space_locked": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/checkbox_space_locked.png",
    "0afd9228fe07e34a3aedc944c3ad8f09b14a05f387b64069623d693f74a9b8b9"
  ],
  "close_button_default": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/close_button_default.png",
    "5160569f357e661d38495b3f84c89f84b30cc6fdd87c796b65f457cae529054c"
  ],
  "close_button_default_compact": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/close_button_default_compact.png",
    "b7ca516ea2456c220b058c35261423da2784a582724f1a38e447d07170c74f6e"
  ],
  "close_button_default_light": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/close_button_default_light.png",
    "c0a7413ccebff8c8cf6868b6bd5310d4638ce24fa1969f7bd70cce4dce4b09e0"
  ],
  "close_button_hover": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/close_button_hover.png",
    "16c89ba672607da0c452dacc79129f8eee995555bd061f51a1cb5bbab57bb877"
  ],
  "close_button_hover_compact": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/close_button_hover_compact.png",
    "44858d92895e520b679a5848f623287dd645a4ba841862db89e82291843daefe"
  ],
  "close_button_hover_light": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/close_button_hover_light.png",
    "5bbbba3c8e947a973b8a9773a298fe674b11e7009410d5dc9ec01db02be9431d"
  ],
  "close_button_pressed": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/close_button_pressed.png",
    "9abf4fcaf21fbbfa09ee1aeb8599288d5a781b57b08b3e4b2848b54cb217aa03"
  ],
  "close_button_pressed_compact": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/close_button_pressed_compact.png",
    "117ba209b844afe932ae0319f1b3cbfbba5d37a0eda4cf7099930771f7e4f45c"
  ],
  "close_button_pressed_light": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/close_button_pressed_light.png",
    "1ca7a00fa243eec0cfcb489214ed7eab4dc88838edada5a2f9933216ac5d098b"
  ],
  "container_weight_bar_fill": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/container_weight_bar_fill.png",
    "10cfb8174fadadd84cb4ef0842ed0386cd506efce40c159b5df7665b5040d628"
  ],
  "container_weight_bar_full": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/container_weight_bar_full.png",
    "7076a7a034067d7dfff4d74f92c413251e8bbc4897cbc484c234b66b044660d4"
  ],
  "control": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/control.png",
    "7997672f3c99b3bb967ad8fb2e3c19290f16a542e49d6a3572e6fd1bc355c4ab"
  ],
  "dialog_background_hollow_1": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/dialog_background_hollow_1.png",
    "b18ab5da2bbdd12ca861962251603c555edee5479984366e836748d2e5702eb0"
  ],
  "dialog_background_hollow_2": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/dialog_background_hollow_2.png",
    "eef0d1cf13c5102332927197ff14417f015480cc76c3a18c598843925ee7479f"
  ],
  "dialog_background_hollow_4": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/dialog_background_hollow_4.png",
    "274740b9ceed9229f6a20c46e0d840ecfb5c3b36bcff6cc9c7970e304a2b1893"
  ],
  "dialog_background_opaque": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/dialog_background_opaque.png",
    "45e365955de8800424ea35bfa589ca38535df6211c10d24bcde280cae09dc69f"
  ],
  "dialog_divider": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/dialog_divider.png",
    "c9f4386d5bfcbdad6de9e74a9b297e597bece3b1529222e40cdccda164164318"
  ],
  "disabledButtonNoBorder": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/disabledButtonNoBorder.png",
    "5a04f3b69f14cd1750b6c818310964e91f4962afc38cfe7bef41ad3c0fb4b27f"
  ],
  "divider3": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/divider3.png",
    "9d3316beada658b7da2a477b9f1c63710e1246e56328ae9e145f81ab5adbb3d9"
  ],
  "effect_background": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/effect_background.png",
    "46ae567772738afaac986020724da72ca09362d4168fe949d6967baaa07f8d48"
  ],
  "empty_stack_progress_bar": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/empty_stack_progress_bar.png",
    "2bcb3f86d803335afebd62f29be11bd6e6cc3f7130bcfc4d5679a47f04610474"
  ],
  "focus_border_white": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/focus_border_white.png",
    "bbf995d02bd710bed1ffef07d128e140e57b018d37ed34e050a995f1c500a5d8"
  ],
  "highlight_slot": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/highlight_slot.png",
    "a4e5b1b1cd05ef340fcb32fdc4a763ec22fdaa085f2defa1ac9ae514a220201b"
  ],
  "item_lock_red": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/item_lock_red.png",
    "3a3b8878eb0f68ad0c18c60a17cf79521c06b0b43e35d212f527ade026c760cd"
  ],
  "item_lock_yellow": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/item_lock_yellow.png",
    "035746004bc103c155e5913e61ebe11558138293718380a3b98444a892d7a452"
  ],
  "loading_bar": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/loading_bar.png",
    "703e02f1e7013d642a81225b98bf08f1bdfc69e003b0b7d4a6132635da747aef"
  ],
  "mainbanners": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/mainbanners.png",
    "eb517774e883832c233bf2c57c7eac4d58fdbc5302c6b30b046fd84c96d94547"
  ],
  "offline": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/offline.png",
    "a05d38826a76ff5abb58f3f6c1a38fb1975cc1dcd5d6be336f7b73c359c7aec9"
  ],
  "online": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/online.png",
    "e2782521b081320bc3785780e409b64bc8cbd22799207f532bb54398f0f91094"
  ],
  "pocket_ui_highlight_selected_slot": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/pocket_ui_highlight_selected_slot.png",
    "59909e979328ea00f94225c1153a87c713d0481faa65574257332bd310007ebe"
  ],
  "pocket_ui_highlight_slot": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/pocket_ui_highlight_slot.png",
    "57e84fc08ca19e8eb4ba10e5729db6e38c27319e4fafc472fdac37fe575ed4ae"
  ],
  "purpleBorder": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/purpleBorder.png",
    "0f75fafa1e465f5dee14f26c31d046cc23d0a8a603b58d04e32f71cad2409e39"
  ],
  "recipe_book_touch_cell_selected": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/recipe_book_touch_cell_selected.png",
    "95743c4386456a219bdaaec2893cb0cee5de0810e15560a184854c797efa9267"
  ],
  "square_image_border_white": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/square_image_border_white.png",
    "bbf995d02bd710bed1ffef07d128e140e57b018d37ed34e050a995f1c500a5d8"
  ],
  "toggle_off": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/toggle_off.png",
    "e3c03f72af1d8afc7617f229e4eddb6d439a02411e464e48c1bdd1f01f873962"
  ],
  "toggle_off_hover": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/toggle_off_hover.png",
    "5083272d331669bde3e5c3ef14cbfd12d6660763bad23b7474c902b4fc82d056"
  ],
  "toggle_on": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/toggle_on.png",
    "b37762f63652856a4c735f5adf55e511e9c01744a883ec70647b97e08a1711ff"
  ],
  "toggle_on_hover": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/toggle_on_hover.png",
    "3ce38b76a06e672c95cb8fa4892456e4deaf482c7f6a67b8e991761421fe6b8b"
  ],
  "touchScrollBox": [
    ".cache/invite-source-independent-01/RAWASSETS/resource_pack/textures/ui/touchScrollBox.png",
    "86743f082bc3cdfbe4971aad9491069f4338576ec6ad9a23dddac614d5148efe"
  ]
} as const;
function source(key: keyof typeof original) { const [path,sha]=original[key],bytes=readFileSync(path); expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha); return PNG.sync.read(bytes); }
type Cuts = readonly [number, number, number, number];

// Finite Chromium Web colour contract, independently checked by the CSS-ramp
// probe below. This does not recover a Minecraft GPU shader. Filter UNORM is
// qualified only for the binary RGB texels used by these original glyphs.
function webPaint(channel: number, alpha: number, opacity: number, tint: number, background: number) {
  if (![1,.5,.7,.8].includes(opacity) || ![1,.075,.3,.7].includes(tint) || opacity !== 1 && tint !== 1) throw new Error('This opacity/filter combination has no qualified Web reference.');
  if (alpha === 0 || opacity === 0) return background;
  let filtered = channel;
  if (tint !== 1) {
    if (channel !== 0 && channel !== 255) throw new Error('Nonbinary tinted texel has no qualified Web filter oracle.');
    filtered = new Uint8ClampedArray([Math.fround(Math.fround(Math.fround(channel / 255) * Math.fround(tint)) * 255)])[0]!;
  }
  if (opacity === 1) return Math.round(filtered * alpha / 255 + background * (1 - alpha / 255));
  if (alpha !== 255) throw new Error('Partial source alpha plus CSS group opacity remains unqualified.');
  const weight = Math.min(256, Math.round(opacity * 255) + 1);
  return Math.floor((filtered * weight + background * (256 - weight)) / 256);
}

// Independent finite Web POINT oracle. Coordinates are destination pixel centres.
// Raw base dimensions are retained, including spine8x2 versus actual8x1. Empty
// source centres use the boundary texel as the explicit Web contract, not native.
function plane(src: PNG, w: number, h: number, scale: number, cuts: Cuts = [0, 0, 0, 0], base: readonly [number, number] = [src.width, src.height], fill = true, opacity = 1, tint = 1, background: readonly [number, number, number] = [0, 0, 0]) {
  const result = new PNG({ width: w, height: h });
  function axis(pixel: number, extent: number, physical: number, logical: number, first: number, last: number) {
    const size = extent / scale, compression = Math.min(1, size / Math.max(1, first + last)), a = first * compression, z = last * compression, q = (pixel + .5) / scale;
    let start: number, span: number, fraction: number;
    if (q < a) { start = 0; span = first * physical / logical; fraction = q / a; }
    else if (q >= size - z) { start = (logical - last) * physical / logical; span = last * physical / logical; fraction = (q - size + z) / z; }
    else { start = first * physical / logical; span = (logical - first - last) * physical / logical; fraction = (q - a) / (size - a - z); }
    return Math.min(physical - 1, Math.max(0, Math.floor(span > 0 ? start + fraction * span : Math.min(physical - 1, Math.floor(start)) + fraction)));
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = (y * w + x) * 4, centre = x >= cuts[0] * scale && x < w - cuts[2] * scale && y >= cuts[1] * scale && y < h - cuts[3] * scale;
    result.data[k + 3] = 255; if (!fill && centre) { for (let c = 0; c < 3; c++) result.data[k + c] = background[c]!; continue; }
    const i = (axis(y, h, src.height, base[1], cuts[1], cuts[3]) * src.width + axis(x, w, src.width, base[0], cuts[0], cuts[2])) * 4;
    for (let c = 0; c < 3; c++) result.data[k + c] = webPaint(src.data[i + c]!, src.data[i + 3]!, opacity, tint, background[c]!);
  }
  return result;
}

// Observed Chromium Web whole-IMG nearest profile, independently established
// by coordinate16x16→18x18 CSS/Canvas controls (sampling-controls-02). Exact
// source-boundary ties select the lower texel. This is not native-game POINT;
// the raw nine-grid/private PortfolioSkin oracle above remains floor-POINT.
function wholeImagePlane(src: PNG, w: number, h: number, opacity = 1, tint = 1, background: readonly [number, number, number] = [0, 0, 0]) {
  const result = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = Math.max(0, Math.min(src.width - 1, Math.ceil((x + .5) * src.width / w) - 1));
    const sy = Math.max(0, Math.min(src.height - 1, Math.ceil((y + .5) * src.height / h) - 1));
    const i = (sy * src.width + sx) * 4, k = (y * w + x) * 4;
    for (let c = 0; c < 3; c++) result.data[k + c] = webPaint(src.data[i + c]!, src.data[i + 3]!, opacity, tint, background[c]!);
    result.data[k + 3] = 255;
  }
  return result;
}
async function open(page: Page, initial: Record<string, unknown>={}) { await page.addInitScript(value=>{window.inviteInitial=value;},initial); await page.goto('/demo/invite-fixture.html'); await expect(page.locator('#invite-form')).toBeVisible(); }
async function config(page: Page, patch: Record<string, unknown>) { await page.evaluate(value=>window.inviteQA.configure(value),patch); }
async function scale(page: Page,s:number) { await page.evaluate(value=>window.inviteQA.configure({presentation:{...window.inviteQA.settings.presentation,scale:value}}),s); }
async function box(node: Locator) { const result=await node.boundingBox(); expect(result).not.toBeNull(); return result!; }
async function relative(node: Locator,parent: Locator) { const a=await box(node),b=await box(parent);return[a.x-b.x,a.y-b.y,a.width,a.height]; }
function near(actual:number[],expected:number[]) { expect(actual.length).toBe(expected.length);for(let i=0;i<actual.length;i++)expect(Math.abs(actual[i]!-expected[i]!)).toBeLessThanOrEqual(1/64); }
async function state(page: Page,control: Locator,current:'normal'|'hover'|'pressed') { await page.mouse.move(1,1);await page.locator('#invite-sink').focus();if(current!=='normal'){await page.keyboard.press('Tab');await control.focus();}if(current==='pressed')await page.keyboard.down('Space'); }
async function assay(target: Locator, w: number, h: number, expected: PNG, info: TestInfo, name: string, background = '#000', measurement = false) {
  const before = await target.evaluate(async (node, size) => {
    const target = node as HTMLElement, active = document.activeElement, owner = target.closest('button,.mc-invite-person__select-area,.mc-invite-party__toggle'), saved = new Map<HTMLElement, { style: string | null; marker: string | null }>();
    const originalRect = target.getBoundingClientRect(), originalBox = { x: originalRect.x, y: originalRect.y, width: originalRect.width, height: originalRect.height };
    const ancestorTransforms = new Map<HTMLElement, string>();
    function checkUnitTransform(css: { transform: string; perspective?: string; scale?: string; rotate?: string; zoom?: string }) {
      const transform = css.transform || 'none', match = /^matrix\(([^)]+)\)$/.exec(transform);
      if (transform !== 'none') { const values = match?.[1]?.split(',').map(Number); if (!values || values.length !== 6 || !values.every(Number.isFinite) || values[0] !== 1 || values[1] !== 0 || values[2] !== 0 || values[3] !== 1) throw new Error('Whole-plane assay supports only unit two-dimensional ancestor translations.'); }
      if (css.perspective && css.perspective !== 'none' || css.scale && css.scale !== 'none' && css.scale.split(/\s+/).some(value => Number(value) !== 1) || css.rotate && css.rotate !== 'none' && !/^0(?:deg|rad|turn)?$/.test(css.rotate) || css.zoom && css.zoom !== 'normal' && Number(css.zoom) !== 1) throw new Error('Whole-plane assay rejects perspective, scale, rotation or zoom.');
      return transform;
    }
    function normalizeAncestorTransform(node: HTMLElement, original: string) { if (original !== 'none') node.style.setProperty('transform', 'matrix(1,0,0,1,0,0)', 'important'); }
    function ancestorContextMatches(node: HTMLElement, original: string) {
      const current = getComputedStyle(node).transform; if (original === 'none') return current === 'none';
      const values = /^matrix\(([^)]+)\)$/.exec(current)?.[1]?.split(',').map(Number);
      return !!values && values.length === 6 && values.every((value, index) => value === [1, 0, 0, 1, 0, 0][index]);
    }
    const read = () => ({ sameActive: document.activeElement === active, focusWithin: owner?.matches(':focus-within') ?? null, hover: owner?.matches(':hover') ?? null, active: owner?.matches(':active') ?? null, ancestorTransformContextsPreserved: [...ancestorTransforms].every(([node, value]) => ancestorContextMatches(node, value)) });
    const old = read(), save = (n: HTMLElement) => { if (!saved.has(n)) saved.set(n, { style: n.getAttribute('style'), marker: n.getAttribute('data-qa-plane-ancestor') }); };
    const style = document.createElement('style'), qa = window as typeof window & { invitePlaneRestore: () => { ancestorTransformsRestored: boolean }; invitePlaneState: typeof read };
    qa.invitePlaneState = read; qa.invitePlaneRestore = () => { for (const [n, previous] of saved) { if (previous.style === null) n.removeAttribute('style'); else n.setAttribute('style', previous.style); if (previous.marker === null) n.removeAttribute('data-qa-plane-ancestor'); else n.setAttribute('data-qa-plane-ancestor', previous.marker); } style.remove(); const restored = [...ancestorTransforms].every(([node, value]) => getComputedStyle(node).transform === value); if (!restored) throw new Error('Whole-plane assay failed to restore exact original ancestor transforms.'); return { ancestorTransformsRestored: restored }; };
    try {
      let branch: HTMLElement | null = target;
      while (branch) { save(branch); for (const sibling of branch.parentElement?.children ?? []) if (sibling !== branch && sibling instanceof HTMLElement && !saved.has(sibling)) { save(sibling); sibling.style.setProperty('opacity', '0', 'important'); } if (branch !== target) { ancestorTransforms.set(branch, checkUnitTransform(getComputedStyle(branch))); normalizeAncestorTransform(branch, ancestorTransforms.get(branch)!); for (const [key, value] of Object.entries({ overflow: 'visible', background: 'transparent', opacity: '1', outline: '0', 'box-shadow': 'none' })) branch.style.setProperty(key, value, 'important'); branch.dataset.qaPlaneAncestor = 'true'; } branch = branch.parentElement; }
      document.body.style.background = size.background; for (const [key, value] of Object.entries({ position: 'fixed', inset: 'auto', left: '24px', top: '24px', ...(!size.measurement ? { width: size.w + 'px', height: size.h + 'px' } : {}), margin: '0', transform: 'none', visibility: 'visible', 'z-index': '2147483647' })) target.style.setProperty(key, value, 'important');
      style.textContent = '[data-qa-plane-ancestor]::before,[data-qa-plane-ancestor]::after{display:none!important}'; document.head.append(style);
      const placed = target.getBoundingClientRect();
      target.style.setProperty('left', (48 + (size.measurement ? originalBox.x - Math.floor(originalBox.x) : 0) - placed.x) + 'px', 'important'); target.style.setProperty('top', (48 + (size.measurement ? originalBox.y - Math.floor(originalBox.y) : 0) - placed.y) + 'px', 'important');
      const urls = new Set<string>(); for (const n of [target, ...target.querySelectorAll<HTMLElement>('*')]) { const css = getComputedStyle(n); for (const value of [css.backgroundImage, css.borderImageSource]) for (const m of value.matchAll(/url\(["']?(.*?)["']?\)/g)) urls.add(m[1]!); if (n instanceof HTMLImageElement) urls.add(n.currentSrc || n.src); }
      await Promise.all([...urls].map(async url => { const image = new Image(); image.src = url; await image.decode(); })); return { old, after: read(), originalBox };
    } catch (error) { qa.invitePlaneRestore(); throw error; }
  }, { w, h, background, measurement });
  try {
    near([before.originalBox.width, before.originalBox.height], [w, h]);
    expect(before.after, name + ': isolation preserves real input state').toEqual(before.old); near(await relative(target, target.page().locator('body')), [24 + (measurement ? before.originalBox.x - Math.floor(before.originalBox.x) : 0), 24 + (measurement ? before.originalBox.y - Math.floor(before.originalBox.y) : 0), w, h]);
    const bounds = await box(target), clip = { x: Math.floor(bounds.x), y: Math.floor(bounds.y), width: Math.ceil(bounds.x + bounds.width) - Math.floor(bounds.x), height: Math.ceil(bounds.y + bounds.height) - Math.floor(bounds.y) };
    // Fractional measurements retain the authored box and its entire ceil
    // boundary, including any partial edge coverage. No fractional raster oracle
    // has been qualified; this branch never makes an RGBA equivalence claim.
    const actual = PNG.sync.read(measurement ? await target.page().screenshot({ clip, caret: 'initial' }) : await target.screenshot({ caret: 'initial' }));
    const after = await target.page().evaluate(() => (window as typeof window & { invitePlaneState: () => unknown }).invitePlaneState()); expect(after, name + ': capture preserves focus/active state').toEqual(before.old);
    await info.attach(name + '-state', { body: JSON.stringify({ ...before, after }), contentType: 'application/json' }); await info.attach(name + '-actual', { body: PNG.sync.write(actual), contentType: 'image/png' });
    if (measurement) {
      expect([actual.width, actual.height]).toEqual([clip.width, clip.height]);
      await info.attach(name + '-whole-original', { body: readFileSync(original.mainbanners[0]), contentType: 'image/png' });
      await info.attach(name + '-UNQUALIFIED', { body: JSON.stringify({ qualification: 'UNQUALIFIED fractional Web raster; measurement only', expectedLogicalProfile: [20, 19.5], originalFractionalBox: before.originalBox, isolatedFractionalBox: bounds, subpixelOriginPhasePreserved: true, completeCeilClip: clip, actualPNGSize: [actual.width, actual.height], originalPNGSize: [expected.width, expected.height], originalKey: 'mainbanners', rawMetadata: { nineslice_size: 1, base_size: [3, 3] }, rgbaDifferences: null, rgbaOracleAvailable: false }), contentType: 'application/json' });
    } else {
      await info.attach(name + '-expected', { body: PNG.sync.write(expected), contentType: 'image/png' }); expect([actual.width, actual.height]).toEqual([expected.width, expected.height]); let differences = 0; for (let i = 0; i < actual.data.length; i += 4) if (!actual.data.subarray(i, i + 4).equals(expected.data.subarray(i, i + 4))) differences++; expect(differences, name + ': complete RGBA differences').toBe(0);
    }
  }
  finally { const restored = await target.page().evaluate(() => (window as typeof window & { invitePlaneRestore: () => { ancestorTransformsRestored: boolean } }).invitePlaneRestore()); expect(restored.ancestorTransformsRestored, name + ': exact original ancestor transforms restored').toBe(true); await info.attach(name + '-restore', { body: JSON.stringify(restored), contentType: 'application/json' }); }
}


const originalJSON = {
  "invite_screen": [
    ".cache/invite-source-independent-01/RAWFILES/resource_pack/ui/invite_screen.json",
    "2c7d0ef61efd0f69d8966dc1f5f10b52e0ac8ff740aaa23f4b13fac6cd33e2d0"
  ],
  "ui_common": [
    ".cache/invite-source-independent-01/RAWFILES/resource_pack/ui/ui_common.json",
    "0aae480d123b2c8667463776f8b0eabad665bc0378b287acd0babcf41d8083a6"
  ],
  "ui_template_buttons": [
    ".cache/invite-source-independent-01/RAWFILES/resource_pack/ui/ui_template_buttons.json",
    "3e250faef134965386ced074d73c998d2a363c79fed14ec928668cb7ff70ea96"
  ],
  "ui_template_dialogs": [
    ".cache/invite-source-independent-01/RAWFILES/resource_pack/ui/ui_template_dialogs.json",
    "de7b2ec43530715c797ab7ed2476965f9dc53962b88bc8c39a207582bee97264"
  ],
  "play_screen": [
    ".cache/invite-source-independent-01/RAWFILES/resource_pack/ui/play_screen.json",
    "10b1cab24aeee5cb5a875255bb6ffe266ca4056394c05f1c4d99b8cc56cf805a"
  ],
  "_global_variables": [
    ".cache/invite-source-independent-01/RAWFILES/resource_pack/ui/_global_variables.json",
    "ea39206de2c7b6f157def5cdf1662767c0ccd9560dfafb1378c3c364b236f69b"
  ]
} as const;
function jsonSource(key:keyof typeof originalJSON){const[path,sha]=originalJSON[key],bytes=readFileSync(path);expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha);const parsed=ts.parseConfigFileTextToJson(path,bytes.toString('utf8'));expect(parsed.error).toBeUndefined();return parsed.config;}
function sourceLoadingTint(){const play=jsonSource('play_screen'),globals=jsonSource('_global_variables'),color=globals[play.progress_loading_bars.color];expect(play.progress_loading_bars.texture).toBe('textures/ui/loading_bar');expect(play.progress_loading_bars.color).toBe('$dark_button_secondary_default_text_color');expect(color).toEqual([.7,.7,.7,1]);return color[0] as number;}

test('fixed original JSON and58whole PNGs retain checkbox inheritance background inset and common underfill', () => {
  expect(Object.keys(original)).toHaveLength(58); for (const key of Object.keys(original) as (keyof typeof original)[]) source(key);
  for (const key of Object.keys(originalJSON) as (keyof typeof originalJSON)[]) jsonSource(key);
  const own = jsonSource('invite_screen'), common = jsonSource('ui_common');
  expect(own['friend_background@invite.black_border'].size).toEqual(['100%-2px','100%-2px']);
  for(const identity of ['msa','platform','linked']) { const button=own[identity+'_friend_button@common.checkbox']; expect(button.$toggle_state_binding_name).toBe('#toggle_invite_state'); expect(button.controls).toHaveLength(8); }
  const fill = common['dialog_background_hollow_common@dialog_background_common']; expect(fill['$fill_alpha|default']).toBe(.8); expect(fill['$dialog_background_texture|default']).toBe('textures/ui/control'); expect(fill.controls[0].control.size).toEqual(['100% - 8px','100% - 8px']);
  const globals=jsonSource('_global_variables'),cross=own.scrolling_content_stack.controls.find((control:Record<string,unknown>)=>Object.hasOwn(control,'crossplatform_disabled_panel')).crossplatform_disabled_panel;
  expect(cross.controls[0].disable_text.color).toBe('$dark_button_default_text_color');expect(globals[cross.controls[0].disable_text.color]).toEqual([1,1,1]);
  expect(own.progress_bar_and_scrolling_content_panel.controls[0]['progress_loading_bars@play.progress_loading_bars'].$visible_binding_name).toBe('#is_loading');expect(sourceLoadingTint()).toBe(.7);
  expect([source('online').width,source('online').height]).toEqual([7,7]);
});
test('independent samplers have coordinate positive controls and detect a one-byte wrong plane', () => {
  const src=new PNG({width:16,height:16});for(let y=0;y<16;y++)for(let x=0;x<16;x++)src.data.set([x,y,x*16+y,255],(y*16+x)*4);
  const img=wholeImagePlane(src,18,18),point=plane(src,18,18,1),indices=[0,1,2,3,3,4,5,6,7,8,9,10,11,11,12,13,14,15];
  expect(indices.map((_,x)=>img.data[x*4])).toEqual(indices); expect(indices.map((_,y)=>img.data[y*18*4+1])).toEqual(indices);expect(img.data.equals(point.data)).toBe(false);
  const wrong=Buffer.from(img.data);wrong[0]=wrong[0]!^1;expect(wrong.equals(img.data)).toBe(false);
  const tile=new PNG({width:3,height:3});for(let i=0;i<9;i++)tile.data.set([i*19,i*7,255-i,255],i*4);const nine=plane(tile,13,9,1,[1,1,1,1]);for(let y=0;y<9;y++)for(let x=0;x<13;x++){const i=((y===0?0:y===8?2:1)*3+(x===0?0:x===12?2:1))*4;expect(nine.data.subarray((y*13+x)*4,(y*13+x)*4+4)).toEqual(tile.data.subarray(i,i+4));}
});
test('source finite label bounds reject negative host row extents instead of silently clamping',()=>{
  const profile={kind:'host-renderer' as const,render:()=>null};
  for(const [identity,collection,minimum] of[['platform','online_platform_friends',135],['linked-account','online_linked_account_friends',72],['xbox-live','online_xbox_live_friends',163]] as const){
    const person=identity==='platform'?{identity,id:'bound',currentGameLabel:'Game',onlineVisible:false,thirdPartyTag:'Platform',thirdPartyProfile:profile}:identity==='linked-account'?{identity,id:'bound',currentGameLabel:'Game',onlineVisible:false,thirdPartyTag:'Platform',gamertag:'Gamertag',thirdPartyProfile:profile,gamerpic:profile}:{identity,id:'bound',currentGameLabel:'Game',onlineVisible:false,gamertag:'Gamertag',gamerpic:profile};
    const props:InvitePersonRowProps={scope:{collection,itemId:'bound',collectionIndex:0},person,width:minimum,capabilities:{isInvitingToRealm:false,isPs4:false,xboxOne:true,platformIcons:{visible:false}},crossPlatformEnabled:true,labels:{profile:'Profile',friendSelection:()=> 'Select bound'}};
    expect(renderToStaticMarkup(createElement(InvitePersonRow,props))).toContain('data-identity="'+identity+'"');
    expect(()=>renderToStaticMarkup(createElement(InvitePersonRow,{...props,width:minimum-1}))).toThrow(/negative label child extent -1.*required host row width/);
  }
});
test('source desktop pocket body footer pane and bar formulas hold at scales1 2 3', async ({page}) => {
  await open(page);for(const s of[1,2,3]){await scale(page,s);for(const vertical of[false,true]){await page.evaluate(value=>window.inviteQA.configure({capabilities:{...window.inviteQA.settings.capabilities,useVerticalButtonStackPanel:value}}),vertical);const root=page.locator('#invite'),frame=root.locator('.mc-invite-screen__frame');near(await relative(frame,root),[41.5*s,5*s,317*s,590*s]);near(await relative(root.locator('.mc-invite-screen__body'),frame),[8*s,23*s,301*s,(vertical?491:525)*s]);near(await relative(root.locator('.mc-invite-screen__footer'),frame),[7*s,(vertical?521:553)*s,303*s,(vertical?62:30)*s]);near(await relative(root.locator('.mc-invite-screen__underfill'),frame),[4*s,4*s,309*s,582*s]);near(await relative(root.locator('.mc-scroll-area__viewport'),root.locator('.mc-invite-screen__body')),[s,0,299*s,(vertical?491:525)*s]);near(await relative(root.locator('.mc-scrollbar[data-orientation=vertical]'),root.locator('.mc-invite-screen__body')),[295*s,2*s,5*s,(vertical?487:521)*s]);expect(await root.locator('.mc-scroll-area__viewport').evaluate(node=>getComputedStyle(node).scrollbarWidth)).toBe('none');expect(await root.locator('.mc-invite-screen__title').evaluate(node=>getComputedStyle(node).textShadow)).toBe('none');}}
  await page.evaluate(()=>window.inviteQA.configure({presentation:{...window.inviteQA.settings.presentation,sourceProfile:'pocket',scale:1}}));const frame=page.locator('#invite .mc-invite-screen__frame'),b=await box(frame);expect(Math.abs(b.width-400*.703215)).toBeLessThanOrEqual(1/64);expect(b.height).toBe(596);
});
test('both complete original hollow frames and source control alpha underfill match whole planes', async ({page},info) => {
  await open(page);for(const s of[1,2,3]){await scale(page,s);for(const vertical of[false,true]){await page.evaluate(value=>window.inviteQA.configure({capabilities:{...window.inviteQA.settings.capabilities,useVerticalButtonStackPanel:value}}),vertical);await assay(page.locator('#invite .mc-invite-screen__skin'),317*s,590*s,plane(source(vertical?'dialog_background_hollow_1':'dialog_background_hollow_2'),317*s,590*s,s,vertical?[8,23,8,76]:[8,23,8,42],vertical?[18,101]:[18,67]),info,`frame-${vertical?'vertical':'horizontal'}-s${s}`);await assay(page.locator('#invite .mc-invite-screen__underfill'),309*s,582*s,plane(source('control'),309*s,582*s,s,[1,1,1,1],[2,2],true,.8,1,[36,73,107]),info,`underfill-${vertical}-s${s}`,'#24496b');}}
});
test('eight actual checkbox visual states use original locked and hover whole images at each scale', async ({page},info) => {
  await open(page,{scene:'row'});for(const s of[1,2,3]){await scale(page,s);for(const selected of[false,true])for(const locked of[false,true])for(const hover of[false,true]){await config(page,{rowSelected:selected,disabled:locked});await page.mouse.move(1,1);await page.locator('#invite-sink').focus();if(hover)await page.locator('.mc-invite-person__select-area').hover({force:true});const state=(selected?'checked':'unchecked')+(locked?'-locked':'')+(hover?'-hover':''),key=locked?(selected?'checkbox_check_locked':'checkbox_space_locked'):hover?(selected?'checkbox_checkHover':'checkbox_spaceHover'):(selected?'checkbox_check':'checkbox_space');const visible=page.locator('.mc-invite-person__check:visible');expect(await visible.getAttribute('data-source-check-state')).toBe(state);await assay(visible,10*s,10*s,wholeImagePlane(source(key),10*s,10*s),info,`check-${state}-s${s}`);}}
});
test('friend background keeps original normal mainbanners in checked hover and locked contexts', async ({page},info) => {
  await open(page,{scene:'row'});for(const s of[1,2,3]){await scale(page,s);for(const selected of[false,true])for(const locked of[false,true])for(const hover of[false,true]){await config(page,{rowSelected:selected,disabled:locked});await page.mouse.move(1,1);await page.locator('#invite-sink').focus();if(hover)await page.locator('.mc-invite-person__select-area').hover({force:true});near(await relative(page.locator('.mc-invite-person__background'),page.locator('.mc-invite-person__select-area')),[s,s,178*s,28*s]);await assay(page.locator('.mc-invite-person__background'),178*s,28*s,plane(source('mainbanners'),178*s,28*s,s,[1,1,1,1],[3,3]),info,`friend-background-${selected}-${locked}-${hover}-s${s}`);}}
});
test('three row identities retain source profile platform link status and separate profile button geometry', async ({page},info) => {
  await open(page,{scene:'row'});for(const s of[1,2,3]){await scale(page,s);for(const collection of['online_platform_friends','online_linked_account_friends','online_xbox_live_friends'] as const){await config(page,{collection});const row=page.locator('#invite-row'),linked=collection.includes('linked'),xbox=collection.includes('xbox');expect([(await box(row)).width,(await box(row)).height]).toEqual([233*s,(linked?56:30)*s]);const profiles=row.locator('.mc-invite-person__profile');expect(await profiles.count()).toBe(linked?2:1);if(!linked)near(await relative(profiles.first(),row),[20*s,5*s,20*s,20*s]);if(!xbox){near(await relative(row.locator('.mc-invite-person__platform>span'),row.locator('.mc-invite-person__platform')),[s,s,13*s,13*s]);expect(await row.locator('[data-host-platform]').count()).toBe(1);}const online=row.locator('.mc-invite-person__online');expect(await online.count()).toBe(linked?2:1);for(const [index,image]of(await online.all()).entries())await assay(image,8*s,8*s,wholeImagePlane(source('online'),8*s,8*s),info,`online-${collection}-${index}-s${s}`);if(linked){near(await relative(row.locator('.mc-invite-person__link'),row),[48*s,27.5*s,2*s,5*s]);await assay(row.locator('.mc-invite-person__link'),2*s,5*s,wholeImagePlane(source('control'),2*s,5*s),info,`linked-control-s${s}`);}if(xbox){near(await relative(row.locator('#invite-profile'),row),[182*s,2*s,50*s,26*s]);near(await relative(row.locator('.mc-invite-person__selection'),row),[0,0,180*s,30*s]);}}}
});
test('party original four toggle images and disabled alpha retain30x16 paint inside64x32 control', async ({page},info) => {
  await open(page);for(const s of[1,2,3]){await scale(page,s);for(const selected of[false,true])for(const locked of[false,true])for(const hover of[false,true]){await page.evaluate(value=>{const q=window.inviteQA;q.configure({value:{...q.settings.value,inviteToParty:value.selected},bindings:{...q.settings.bindings,canInviteToParty:!value.locked}});},{selected,locked});await page.mouse.move(1,1);await page.locator('#invite-sink').focus();if(hover)await page.locator('.mc-invite-party__toggle').hover({force:true});const toggle=page.locator('.mc-invite-party__toggle');expect([(await box(toggle)).width,(await box(toggle)).height]).toEqual([64*s,32*s]);const key=`toggle_${selected?'on':'off'}${hover&&!locked?'_hover':''}` as keyof typeof original,image=toggle.locator('.mc-invite-party__image:visible');near(await relative(image,toggle),[0,0,30*s,16*s]);await assay(image,30*s,16*s,wholeImagePlane(source(key),30*s,16*s,locked?.5:1),info,`party-${selected}-${locked}-${hover}-s${s}`);}}
});
test('pagination previous glyph and next content preserve deep source skin focus glyph tints and pressed inset', async ({page},info) => {
  await open(page,{scene:'pagination'});for(const s of[1,2,3]){await config(page,{disabled:false});await scale(page,s);const pageNode=page.locator('#invite-pagination');near(await relative(pageNode.locator('.mc-invite-pagination__controls'),pageNode),[0,4*s,233*s,30*s]);near(await relative(pageNode.locator('.mc-invite-pagination__divider'),pageNode),[0,38*s,233*s,s]);for(const direction of['previous','next']){const control=page.locator('#invite-'+direction);for(const [mode,key] of[['normal','button_borderless_light'],['hover','button_borderless_lighthover'],['pressed','button_borderless_lightpressed']] as const){await state(page,control,mode);try{near(await relative(control.locator('.mc-invite-light__content'),control),[3*s,(mode==='pressed'?4:3)*s,24*s,24*s]);await assay(control.locator('.mc-invite-light__skin--'+mode),28*s,28*s,plane(source(key),28*s,28*s,s,[1,1,1,1],[4,4]),info,`${direction}-${mode}-s${s}`);if(mode!=='pressed')await assay(control.locator('.mc-invite-light__border'),30*s,30*s,plane(source('focus_border_white'),30*s,30*s,s,[1,1,1,1],[5,5],true,1,mode==='normal'?.075:1),info,`${direction}-focus-${mode}-s${s}`);const glyph=control.locator(direction==='previous'?'.mc-invite-light__glyph':'.mc-invite-light__whole-content');expect(await glyph.evaluate(node=>getComputedStyle(node).filter)).toBe(direction==='previous'?(mode==='normal'?'brightness(0.3)':'brightness(1)'):'none');await assay(glyph,7*s,9*s,wholeImagePlane(source(direction==='previous'?'arrow_l_default':'arrow_r_default'),7*s,9*s,1,direction==='previous'&&mode==='normal'?.3:1),info,`${direction}-glyph-${mode}-s${s}`);}finally{if(mode==='pressed')await page.keyboard.up('Space');}}}await config(page,{disabled:true});for(const direction of['previous','next']){const control=page.locator('#invite-'+direction);await assay(control.locator('.mc-invite-light__skin--locked'),28*s,28*s,plane(source('disabledButtonNoBorder'),28*s,28*s,s,[1,1,1,1],[2,2]),info,`${direction}-locked-s${s}`);const lockedImage=control.locator(direction==='previous'?'.mc-invite-light__glyph':'.mc-invite-light__whole-content');expect(await lockedImage.evaluate(node=>getComputedStyle(node).filter)).toBe(direction==='previous'?'brightness(0.7)':'none');await assay(lockedImage,7*s,9*s,wholeImagePlane(source(direction==='previous'?'arrow_l_default':'arrow_r_default'),7*s,9*s,1,direction==='previous'?.7:1),info,`${direction}-glyph-locked-s${s}`);}await config(page,{disabled:false});}
});
test('source footer horizontal and vertical levels retain exact shared light whole material planes', async ({page},info) => {
  await open(page,{scene:'footer'});for(const s of[1,2,3]){await scale(page,s);for(const variant of['horizontal','vertical']){await config(page,{footerVariant:variant});const footer=page.locator('#invite-footer'),send=page.locator('#invite-send'),w=variant==='horizontal'?119:240;near(await relative(send,footer),[(variant==='horizontal'?121:0)*s,(variant==='horizontal'?0:32)*s,w*s,30*s]);await state(page,send,'normal');await assay(send.locator('.mc-invite-light__skin--normal'),(w-2)*s,28*s,plane(source('button_borderless_light'),(w-2)*s,28*s,s,[1,1,1,1],[4,4]),info,`footer-${variant}-normal-s${s}`);}}
});
test('all three original close states and complete640x8 loading strip preserve source whole images', async ({page},info) => {
  await open(page);for(const s of[1,2,3]){await scale(page,s);const close=page.locator('#invite-close');for(const [mode,key] of[['normal','close_button_default'],['hover','close_button_hover'],['pressed','close_button_pressed']] as const){await state(page,close,mode);try{await assay(close.locator('span'),15*s,15*s,plane(source(key),15*s,15*s,s),info,`close-${mode}-s${s}`);}finally{if(mode==='pressed')await page.keyboard.up('Space');}}await page.evaluate(()=>{const q=window.inviteQA;q.configure({bindings:{...q.settings.bindings,isLoading:true}});});expect([(await box(page.locator('.mc-invite-loading'))).width,(await box(page.locator('.mc-invite-loading'))).height]).toEqual([64*s,8*s]);await assay(page.locator('.mc-invite-loading__strip'),640*s,8*s,wholeImagePlane(source('loading_bar'),640*s,8*s,1,sourceLoadingTint()),info,`loading-whole-strip-s${s}`);await page.evaluate(()=>{const q=window.inviteQA;q.configure({bindings:{...q.settings.bindings,isLoading:false}});});}
});
test('dormant material helper variants preserve separate MainBannersHover and locked original profiles', async ({page},info) => {
  await open(page,{scene:'helpers'});for(const s of[1,2,3]){await scale(page,s);for(const variant of['black_border_hover','friend_background_hover','friend_background_borderless','grey_borderless_locked']){const inset=variant.startsWith('friend_background')?1:0,locked=variant.includes('borderless'),target=page.locator(`[data-invite-source-helper=${variant}] .mc-invite-source-helper__background`);await assay(target,(120-inset*2)*s,(30-inset*2)*s,plane(source(locked?'disabledButtonNoBorder':'MainBannersHover'),(120-inset*2)*s,(30-inset*2)*s,s,[1,1,1,1],locked?[2,2]:[3,3]),info,`dormant-${variant}-s${s}`);}await assay(page.locator('.mc-invite-source-helper__offline'),8*s,8*s,wholeImagePlane(source('offline'),8*s,8*s),info,`dormant-offline-s${s}`);}
});
test('profile frames keep original whole mainbanners with18px interiors and explicit linked fill geometry',async({page},info)=>{
  await open(page,{scene:'row'});for(const s of[1,2,3]){await scale(page,s);for(const collection of['online_platform_friends','online_xbox_live_friends'] as const){await config(page,{collection});const profile=page.locator('.mc-invite-person__profile');near(await relative(profile.locator('.mc-invite-person__profile-content'),profile),[s,s,18*s,18*s]);await assay(profile.locator('>.mc-invite-skin'),20*s,20*s,plane(source('mainbanners'),20*s,20*s,s,[1,1,1,1],[3,3]),info,`profile-frame-${collection}-s${s}`);}await config(page,{collection:'online_linked_account_friends'});const linked=page.locator('.mc-invite-person__profile');near(await relative(linked.nth(0),page.locator('#invite-row')),[59*s,8*s,20*s,19.5*s]);near(await relative(linked.nth(1),page.locator('#invite-row')),[59*s,32.5*s,20*s,19.5*s]);for(const profile of await linked.all())near(await relative(profile.locator('.mc-invite-person__profile-content'),profile),[s,s,18*s,17.5*s]);
    // The source fill produces half-unit heights. Whole-raster material proof
    // uses scale2 (39 physical pixels); scale1/3 retain exact local geometry
    // above without pretending a half pixel is an integer PNG extent.
    if(s===2)for(let i=0;i<2;i++)await assay(linked.nth(i).locator('>.mc-invite-skin'),40,39,plane(source('mainbanners'),40,39,2,[1,1,1,1],[3,3]),info,`linked-profile-frame-${i}-s2`);
  }
});
test('UNQUALIFIED fractional linked profile raster records full ceil boundaries at scales1 and3 without rounding source layout',async({page},info)=>{
  await open(page,{scene:'row',collection:'online_linked_account_friends'});for(const s of[1,3]){await scale(page,s);const profiles=page.locator('.mc-invite-person__profile');for(let i=0;i<2;i++){near(await relative(profiles.nth(i),page.locator('#invite-row')),[59*s,(i?32.5:8)*s,20*s,19.5*s]);await assay(profiles.nth(i).locator('>.mc-invite-skin'),20*s,19.5*s,source('mainbanners'),info,`UNQUALIFIED-linked-profile-${i}-s${s}`,'#000',true);}}
});


test('independent CSS probes qualify bounded Web byte compositing and binary filter endpoints', async ({ page }, info) => {
  const ramp = new PNG({width:256,height:1});
  for(let x=0;x<256;x++)ramp.data.set([x,x,x,255],x*4);
  const cases=[
    {name:'group8-contrast',opacity:.8,tint:1,bg:[36,73,107] as const,binary:false},
    {name:'group5-black',opacity:.5,tint:1,bg:[0,0,0] as const,binary:false},
    {name:'group7-black',opacity:.7,tint:1,bg:[0,0,0] as const,binary:false},
    ...[.075,.3,.7].map(tint=>({name:'binary-filter-'+tint,opacity:1,tint,bg:[0,0,0] as const,binary:true})),
  ];
  let wrongRoundDifferences=0;
  for(const entry of cases){
    const src=entry.binary?new PNG({width:256,height:1}):ramp;
    if(entry.binary)for(let x=0;x<256;x++)src.data.set([x%2?255:0,x%2?255:0,x%2?255:0,255],x*4);
    await page.setContent('<body style="margin:0"></body>');
    await page.evaluate(async({url,entry})=>{document.body.style.background='rgb('+entry.bg.join(',')+')';const image=new Image();image.src=url;await image.decode();image.id='independent-reference';image.style.cssText='display:block;width:256px;height:1px;image-rendering:pixelated;opacity:'+entry.opacity+';filter:brightness('+entry.tint+')';document.body.append(image);},{url:'data:image/png;base64,'+PNG.sync.write(src).toString('base64'),entry});
    const bytes=await page.locator('#independent-reference').screenshot(),actual=PNG.sync.read(bytes),expected=new PNG({width:256,height:1});
    for(let x=0;x<256;x++){for(let c=0;c<3;c++){const channel=src.data[x*4+c]!;expected.data[x*4+c]=webPaint(channel,255,entry.opacity,entry.tint,entry.bg[c]!);if(Math.round(channel*entry.tint*entry.opacity+entry.bg[c]!*(1-entry.opacity))!==actual.data[x*4+c])wrongRoundDifferences++;}expected.data[x*4+3]=255;}
    expect(actual.data.equals(expected.data),entry.name+' independent source-colour corpus').toBe(true);
    await info.attach('reference-'+entry.name+'-actual',{body:bytes,contentType:'image/png'});await info.attach('reference-'+entry.name+'-expected',{body:PNG.sync.write(expected),contentType:'image/png'});
  }
  expect(wrongRoundDifferences).toBeGreaterThan(0);
  expect(()=>webPaint(255,255,.5,.7,0)).toThrow();expect(()=>webPaint(127,128,.5,1,0)).toThrow();
  const own=jsonSource('invite_screen');expect(JSON.stringify(own.gamerpic_panel)).toContain('online_indication_positioner');expect(JSON.stringify(own.linked_friend_button_layout)).toContain('gamerpic_panel');expect(JSON.stringify(own.linked_friend_button_layout)).toContain('online_indicator');
});
