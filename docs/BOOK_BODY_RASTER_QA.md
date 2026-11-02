# Book idle body raster

`BookLayoutProfile.bodyRaster` supplies an optional source-font painter for an
editable page while it is idle. The accepted text remains in the same real
textarea. Focus, selection, composition, scrolling and unsupported text layout
return rendering to that textarea. This API does not implement native caret,
selection, shaping, word wrapping, IME or reader/signing text rendering.

## Caller-owned source font

From a checkout with the original supported game installation:

```powershell
python scripts/prepare-book-label-font.py --target body
python scripts/prepare-book-label-font.py --target body --text-file ./my-pages.txt --check-only
```

The body target writes only `.cache/local-fonts/book-body`. Its default set is
95 printable ASCII characters plus `像素字体测试`: 101 glyphs, seven complete
original 256×256 PNG pages, source cell height16 and line height20. The existing
labels target remains the default and retains its previous files unchanged.
Repeated `--characters` and `--text-file` arguments add literal characters;
preparation rejects unsupported glyphs, controls and excessive inputs.
`--check-only` neither creates output directories nor changes existing files.
Restart Vite or rebuild the demo after preparation.

The script reuses the Classic archive decoder and `body-bounds-v1` metric
producer. It verifies the fixed original archive SHA, preserves complete PNG
bytes and does not crop, resize, recolor or register a font. The ignored output
and preparation script are excluded from the npm package. Package consumers
supply their own `GuiTextFont` and resolve its relative page filenames to URLs.

```tsx
import { BookEditor } from 'mcbeui';
import type { BookBodyRasterProfile, GuiTextFont } from 'mcbeui';

declare const sourceFont: GuiTextFont; // Complete caller-owned pages + metrics.
const bodyRaster: BookBodyRasterProfile = {
  frameSize: [2570, 1402],
  origin: [97, 25], // GLOBAL logical Book root within the declared framebuffer.
  mode: 'idle',
  font: sourceFont,
  fontScale: .5,
  sampling: 'bilinear',
  shader: 'bitmap-smooth',
  paintOffset: [0, 1],
  clipRounding: 'logical-stage-floor',
};

<BookEditor
  defaultPages={['Bedrock UI 0123456789 abc XYZ\n像素字体测试', '']}
  layout={{ unitScale: 5, bodyRaster }}
  onBodyRenderError={(error, pageIndex) => console.error(pageIndex, error)}
/>;
```

The example declares a finite host policy, including position, scale, font,
paint offset and clip rounding. It does not discover a game's current window,
locale, safe zone or automatic font selector. `color` defaults to black RGBA8;
`renderKey` explicitly retries a failed renderer. Omitting the profile retains
the previous CSS rendering path.

## Source geometry and raster investigation

The existing pure source layout produces all31 visible glyph quads of the
frozen mixed Book example: 124 vertices, 186 indices and seven page runs. Every
POSITION, packed UV, RGBA byte, index, all16 MVP floats and scissor edges match
the independent native ledger. The ledger is used only to compare outputs;
the renderer receives ordinary text, source font metrics, original whole PNGs
and host dimensions. The first line advances115.5 logical units within a122-unit
inner area; this particular example needs its explicit newline, without wrapping.

The native body clip is `[605,234,610,753]` in physical XYWH. This finite
`logical-stage-floor` policy scales clip edges against the ceil-rounded logical
stage; text projection continues to use the whole unrounded framebuffer extent.
`physical-floor` is a separate caller option, not a claim about the native rule.

The original Book capture contains no caret quad. The two green caret cases in
the font corpus are Sign controls and do not establish a Book caret policy.

Root-owned headless Chromium experiments used actual NVIDIA RTX3050 / ANGLE
D3D11, DPR1 and full2570×1402 RGBA comparisons:

| Stage | Empty target differences | Mixed target differences |
| --- | ---: | ---: |
| Previous current labels + pencils, CSS body | 0 | 3614 |
| Transparent source body, cropped target | 0 | 4 |
| Source paper reconstructed under body, without hover | 0 | 6129 |
| Paper + original hover reconstructed under body | 0 | 29 |
| Transparent source body, complete framebuffer | 0 | 0 |

Artifacts are retained separately in `.cache/book-body-source-01` and `-02`.
The paper experiment erased25 page-number pixels atY234 because the body and
counter clips overlap. It is not the adopted rendering path. The remaining
four cropped-target differences were identical with and without paper, and
disappeared when only the target/viewport allocation changed to the complete
framebuffer. No shader, glyph cell, UV adjustment, pixel patch or tolerance was
introduced. A CPU analysis identifies bilinear half-weight ties as a plausible
mechanism; the driver's exact interpolation implementation was not measured.

Every arm was compared across all3,603,140 pixels. The3,143,810-pixel complement
outside the declared body clip remained byte-identical to its baseline.
Seven whole font-page RGBA identities and generated source geometry were
independently checked in `.cache/book-body-independent-01`.

## Qualification boundary

The integrated public API was rerun separately in
`.cache/book-body-final-01/RESULT.json`. With the actual `BookEditor`, its
`bodyRaster` option and existing source labels/pencils, both complete target
images match native RGBA exactly. The mixed baseline still reproduces the
previous3614 differences before the option is enabled. Before/after source pins,
unscaled native image guards and the full clip complement are unchanged.

The mixed source/native RGBA SHA is
`61e3dfa8edd5c70ec0c702127d409a14f79a7ea696b8db02238e22aede5e6f7b`;
empty remains
`3eea06193c569ab42d9cca7d11e8066b990aa52fd63698515f9bde9f545105ed`.
Independent CPU redecoding and source review are recorded separately in
`.cache/book-body-independent-01/API-REVIEW-02.json`.

Mounted checks in `.cache/book-body-qa-01/browser-03.json` pass61/61 with
zero skips or flaky cases:20 new body ownership cases, the existing38 Book,
pencil and label cases, and three main-gallery demos. Real keyboard selection,
accepted/rejected controlled input, node/ref identity, IME-held mode/spread,
scrolling, forced colors, delayed reactivation, stale requests, retry,
context loss, two-instance isolation and inactive validation are covered.
The initial run60/61 is retained: direct programmatic selection immediately
followed by `fill` coalesced the selection event. The revised test drives real
keyboard selection and keeps the same backward-range and callback assertions.
The first harness startup also failed from a wrong working directory; no
product change or pixel tolerance was made for either harness correction.

The final built gallery is checked separately in
`.cache/book-body-final-01/demo-01.json`:3/3 pass. The body demo activates the
prepared source body, both source pencils and, when available, source labels
together; the local original body-font availability attachment is true. Source
body fallback, real input identity and draft retention survive signing and
return. The previous61-case batch predates this additional combined-demo
assertion; the built three-case batch covers the final demo-test bytes.

Node preflight/SSR checks pass41/41, including15 new body cases. Six persistent
font-preparation cases and eight existing Classic preparation cases pass.
`npm run verify:package` passes actual React18.3.1 and19.3.1 consumers, with
205 components/223 runtime exports unchanged. Independent installed consumers
add36 CPU/SSR groups and six strict type negatives per peer, zero IO, warnings,
callbacks or ref calls. Source closure is166 modules and680 unchanged original
asset references; no new texture or font is added to the package.

The qualified functional tar SHA is
`262b433c0c0a0b0f257cd1d425e665ff7ee0b851727ef1098a37b124ccf7301d`.
Actual installed-browser hosts import that package, its packed CSS and the
actual React peer, with no renderer source alias. Both peers reproduce both
whole native targets exactly, then verify real pencil focus, accepted input,
CSS while decoding is delayed and a fresh ready owner afterward. See
`.cache/book-body-final-01/installed-browser-01/RESULT.json`. This esbuild host
is separate from the main gallery and is not a default-Vite consumer matrix.

The API keeps a full-size transparent framebuffer for each active source page.
It adds up to two WebGL contexts, in addition to any source pencils or labels.
There is no context-pooling, memory-optimization or frame-rate guarantee.
Using a cropped target is not assumed byte-equivalent on every GPU.

These are known observed finite scenes with a declared original-font profile,
not blind validation, package-default font qualification, all Book states,
other GPUs/scales, complete game/Present rendering or native editing acceptance.
The overall component-library goal remains incomplete.

Direct Book props and native input events are covered. External ancestor
visibility/inert changes are reevaluated on the next owner update; they are not
a GPU cancellation API. ShadowRoot-specific focus allocation has not been
qualified. No Minecraft, PIX or Computer Use session was opened for this work;
the root-owned test browsers/servers close after their runs and user4173 is
left untouched.
