# ItemGlint validation

`ItemGlint` is a controlled renderer reconstruction. It uses the original Bedrock item glint texture and arithmetic recovered from the installed UI/Glint SM4/SM5 shader, with explicitly supplied uniforms, sampler and blend factors. Native host parameters, active backend, temporal behavior and final draw state are unverified; this is not a native pixel-perfect certification.

## Source and arithmetic evidence

- Original `enchanted_item_glint.png`:128×128,477 bytes, SHA256 `99cf0defcbe422c8b91a42886f469d89cfbaba157371d8142d01ba7e8055a631`; complete decoded RGBA SHA256 `2231bc3707de58d253a3c0a3e979ccbf9601709223270b3f8e677e7b4546955b`.
- Pinned public release v1.26.60.5 and installed vanilla misc archive contain identical bytes. The actor glint image is different and is not used. The original public asset license accompanies the texture.
- Installed private UIGlint.material.bin SHA256 `9b638364630b58556cb2ea4aec6f0d0bb956de6b345e77aa102813bb8ca169e2`; system D3DDisassemble decoded4 SM4/SM5 stages. Full compiled-material structure, footer and EOF were checked. Neither the compiled binary nor disassembled private shaders is distributed.
- Both UV layers rotate around `.5`, add their own rotated-U offset **before** shared XY scaling, then sample at `fract(UV)`. Original item alpha `<=1/256` discards the pass. Sum of glint RGB samples is tinted and squared, then scaled by tint alpha/HUD opacity. Mask alpha only contributes to output alpha; glint texture alpha is unused.
- The new shader already squares RGB. Old SourceColor/One inventory blending is not silently applied. The chosen source/destination factors are always explicit.

## Public behavior

`shadeItemGlint` returns the unquantized raw pass or null for discard. `renderItemGlint` nearest-samples the original item image as a straight-RGBA destination, then applies explicit blend factors; only the final value is clamped/rounded to8-bit. It performs no gamma conversion. These CPU/Web compositing choices, numerical precision and Canvas partial-alpha storage remain documented reconstruction boundaries.

The component has no clock, purple tint, rotation/speed preset or `enchanted` integration. Existing `ItemSlot.enchanted` remains semantic. Callers supply source image, both offsets, scale, two angles, glint color, sampler and blend. Source-declared tint/HUD defaults of1 are the only effect defaults used. Invalid dimensions, non-finite inputs, malformed textures, unsupported blend/sampler and arithmetic overflow throw explicit errors.

It renders a labeled canvas, supports decorative output and forwards its ref. SSR performs no resource I/O. Equivalent controlled values avoid repeated repainting. Changed sources clear stale pixels; cancelled asynchronous results cannot paint or report callbacks. Original image decoding reuses the existing shared texture loader/cache, which closes every temporary ImageBitmap; unmount retains the shared decoded texture cache but owns no timer, event listener or GPU resource.

## Verification status

- Core TypeScript and complete demo/tests typecheck:PASS.
- All11 source/math/SSR/browser cases in `tests/item-glint.spec.ts` have passed. They cover original bytes/complete pixels, exact alpha threshold and manually calculated raw output, rotation sign/offset-before-scale, bilinear repeating seam, explicit blend/no automatic double square, discard destination preservation, invalid boundaries, actual source icon identity at zero color, deterministic controlled update/no timer, canvas ref, resource error clear/recovery, cancellation after unmount and raw float pass preservation.
- First integrated run passed10 cases. The pending-image cancellation case initially used a250ms network delay, which could finish before Playwright's unmount click; that is a legal mounted callback. The test now holds the response behind an explicit gate until after unmount, retains ready1/errors0 assertions, and passed its targeted rerun. Production required no change.
- Independent QA re-extracted the original compiled material and built a CPU interpreter for SM4/SM5 assembly before reading this implementation.544 raw-pass oracle cases passed, maximum floating-point difference `5.55e-16`;96 complete-image cases,24,144 pixels/96,576 channels, had exact RGBA-byte equality. These cover original glint pixels plus an asymmetric diagnostic texture, signed offsets/angles, scale order, threshold boundaries, tint/HUD/HDR values, both samplers, all6 blend combinations, non-square sizes and alpha0/1/2/15/63/127/128/129/254/255 masks.
- Independent browser point/bilinear/zero profiles match the ASM-interpreter expected pixels exactly. The partial-alpha tint profile differs from *raw* expected RGB by1LSB at173 pixels/262 channels, with identical alpha. Passing the independent expected image through a separate control Canvas produces exact complete-RGBA equality with the component: this is Canvas premultiply-storage quantization, not a shader/blend correction.12 additional browser partial-mask matrices (both samplers×all6 blends at13×19) also match the independent interpreter+control Canvas exactly; page errors were empty. The production formula was not adjusted to hide this storage boundary.

The independent diagnostic interpreter and private bytecode evidence remain in ignored `.cache/glint-independent-qa`; public source/math/lifecycle regressions are in the committed test file. Runtime API and rendering code are frozen after this verification. No native host animation or final draw-state equivalence is inferred from these results.

No native frame or automatic-time equivalence is claimed by a passing unit or browser test. The fixed fixture profile is visibly labeled as explicit Web test values, not a recovered native preset. Provenance and exact API/compositing boundaries are recorded in `item-glint-geometry.json`.
