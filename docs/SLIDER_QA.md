# Slider material and native-input alignment

This stage improves the existing `Slider`. Public component/data/function counts
remain272/8/14 (294 runtime exports). No new texture or public type is added.

## Source materials

The fixed Mojang Bedrock Samples v1.26.60.5-full source, commit
`15701fa9c13923f12662984c32c124327e40e3d3`, declares the following in
`resource_pack/ui/ui_common.json`:

- The thumb is10×16 logical units. It has distinct default, hover, indent and
  locked controls, using the four complete `slider_button_*` PNGs.
- A locked thumb also has `slider_locked_transparent_fade`, alpha.5, above it.
- The bar uses `slider_border`, an inset1 sizing panel, original background and
  progress textures, plus its own locked alpha.5 fade.

All resources already exist in the public Resource Pack bank. The new indent and
locked surfaces use `ClassicSkin`; the fade references the complete original PNG.
No pixels are repainted, cropped into a new resource or recolored to fit a capture.
Raw source identities and unchanged reuse paths are in
[resource-pack-assets.json](resource-pack-assets.json). The older normal/hover CSS
skin tokens retain their existing lossless source-pixel encodings.

The old shared Slider lacked an indent surface and faded its entire wrapper to50%
when disabled. That exposed the host backdrop and also dimmed the thumb's wrong
default material. It now paints the actual locked surface and separate source
fade layers at full wrapper opacity. Source border, rail and progress colors are
unchanged. Existing normal and hover skin tokens remain supported.

The disabled material's alpha is implemented with `filter:opacity(.5)`. A separate
five-color browser experiment found that `opacity:.5` on the PNG element was one
gray level below an independent Canvas2D reference; the filter path matched that
reference without changing source RGB or alpha. Original failed outputs and both
probe reports remain under `.cache/slider-source-fidelity-20261103-01/`. This is a
finite Chromium/Web result, not evidence of native Minecraft blend rounding.

The shared paint dimensions now inherit an internal range-unit value. Server form
frames pass their existing `scale`, including to the invisible native thumb and
the indent/locked surfaces. No new public `Slider.scale` prop is introduced.

## One mounted value

`<Slider value={50} min={0} max={100} step={20}/>` previously showed50 in its label,
ARIA text and decorative thumb while its actual browser input was60. Ordinary
range step rounding follows the [HTML Range rules](https://html.spec.whatwg.org/multipage/input.html#range-state-(type=range)),
including choosing the higher allowed value for a tie. The library's default
value remains its existing minimum; this stage does not change that API default.

The private pure domain preflight supplies finite, bounded SSR paint estimates,
using decimal arithmetic to avoid obvious binary artifacts. All three numeric
props (`value`/resolved default, `min`, `max`) must be finite. As before, a maximum
below the minimum produces a constant range at the minimum. Invalid/nonpositive
steps use the ordinary HTML default-step estimate; `any` skips step rounding.

That estimate is not a cloned browser serializer. The700-case experiment found48
differences between a pure decimal estimate and Chromium, involving subnormal
step strings, binary noise and extreme domains. This original failed comparison
is retained in `RANGE-ORACLE-02.json`.

The actual input receives the bounded caller value. After commit, the shared ref
bridge reads its sanitized `valueAsNumber` before paint and reconciles the output,
ARIA text and ratio to that same value. Ordinary updates keep the node, ref and
focus. Nothing emits `onValueChange` merely because a domain is normalized, and
caller state is not rewritten. User keyboard/pointer events retain native range
behavior, callbacks and form serialization. A formatter is evaluated once for the
visible output and matching ARIA text.

SSR is import/render safe and has ordinary step-aware estimates. It does not
certify an unhydrated page's exact engine-specific serialization at extreme
precision. Readonly behavior and native controller selected/deselected mappings
are not newly implemented by this stage. External imperative DOM mutations do
not become a new observed-state API.

## Evidence and limits

- The original red01 batch was4PASS/6FAIL: two value-alignment failures and the
  indent/locked cases at two widths. Existing normal and hover source planes passed.
- green01 was8PASS/2FAIL; the remaining locked-plane gray differences were retained.
  Independent Canvas/CSS opacity probes explain the chosen filter path.
- green02 added a deliberately broad pure-normalizer oracle:10PASS/1FAIL,48/700
  numeric differences. green03 mounted input reconciliation then passed11/11.
- Final regression04:110/110, comprising20 Slider checks,61 existing pixel/font
  checks,16 ServerForms checks and13 StructureEditor checks. These are this named
  batch, not an all-repository or all-platform pass rate.
- Sixteen complete bar/rail/fill/thumb planes at Web units1/2/3 total105,696 RGBA
  pixels, exact against the independent original-PNG raster. No text/edge mask,
  tolerance or regenerated golden image is used. The locked reference includes
  the fixed raw-metadata boundary policy already documented by `ClassicSkin`.
- The mounted700-domain check covers decimal/exponent/invalid step tokens, ties,
  out-of-range values, constant ranges and extreme finite domains; it verifies
  that paint/output/ARIA follow the actual input, rather than claiming that a
  private mathematical routine reproduces every browser's internal arithmetic.
- Functional package02 passes actual React18.3.1/19.3.1 ESM/SSR/types, styles,
  original assets/fonts/licenses and existing family gates. New SSR cases cover
  stepped output, decimal ties and invalid finite inputs. The initial package01
  failed because a generated test regex lost a slash escape, not a library fault;
  its log and interim tar remain separate.
- Source demo02 passes12/12 across desktop, Pixel7 and320px:3 Slider previews and9
  adjacent WorldSettings flows. demo01's narrow failure revealed a genuine World
  preview host-width error. The gallery now resolves its100-unit pack-content
  minimum with `layoutSettingsFrame` and scales a narrower preview host. Source
  component layout validation is unchanged; this is an explicit Web gallery policy.

- Installed01: actual npm-installed React18.3.1/19.3.1, standard aggregate CSS and
  default Vite development/production, without source aliases or optimizer overrides.
  Four cases verify actual values, a stable state-setter input ref, keyboard callback
  and native FormData80, precision reconciliation and unmount release. Thirty-six
  whole-bar PNGs form18 dev/prod pairs,145,152 Web RGBA pixels with zero differences.
- Final typecheck03 and demo build01 pass. Built demo01 passes12/12 across the same
  three sizes, including the narrow World example. The built Selection screenshot
  was visually inspected. Source demo01's original2PASS/1FAIL remains untouched.

Final receipts are indexed by `.cache/slider-source-fidelity-20261103-01/FINAL.json`.
 Renderer kernels, original textures, fonts, shadows
and native references are unchanged. No new Minecraft/PIX capture or Computer Use
session was opened. Native layout/step providers, animation/state mapping,
compositing, fonts and the whole-game pixel-perfect objective remain incomplete.
