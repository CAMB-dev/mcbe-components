# External Server alpha qualification

The current qualification contains **15 complete RGBA checks and 4 source-parameter contracts**. It does not establish 19 pixel-perfect planes or native screen parity. The four partial-alpha planes have **UNQUALIFIED scalar RGBA predictions; native pixels remain pending**.

## Why the historical oracle is retained separately

The original independent suite generated 19 whole material predictions from unchanged official PNGs/metadata and an earlier finite Web scalar opacity rule. Its actual browser02 run passed 15 and failed 4: panel-normal at scales1/2 and field-disabled at scales1/2. Those four strict failures remain evidence. No production alpha, texture, geometry, expected pixel, RGB tolerance or mask was changed to remove them.

Two separately frozen experiments rendered 165 complete cells across five CSS contexts (33 predeclared color/opacity/PNG parameter sets reused across contexts: 99 cells then 66 cells). They included train, heldout and original-PNG format controls and 11 fixed scalar candidates. The old scalar rule matched whole-image cases, but did not transfer to wrapper group opacity. Per-image patch opacity also failed qualification: both contexts retained complete 2×2 corner differences despite integer 2/12/2 subdivisions. No one declared rule explained all corner cases. These results falsify treating the earlier scalar rule as a universal normative oracle for this context; they do not prove a production defect or recover native compositing.

The experiments do not establish that the most successful failing candidate is correct. No coefficient/alpha/color fitting, threshold or seam mask replaces the original oracle. Further source/native fidelity work remains part of the library goal.

## Active qualification contract

`tests/external-server-qualification.spec.ts` keeps all 19 complete production material boxes and all original whole resources. Every case checks the frozen source/material metadata bytes, actual shipped PNG/metadata bytes, fetched PNG bytes, successful whole-image decode and natural dimensions, complete BCR and actual screenshot dimensions, and absence of page/console errors.

The 15 opaque/material cases still assert every complete-plane RGBA byte exactly, with zero tolerance and no mask.

The four partial-alpha cases additionally check the visible source image path's computed opacity product (.8 for the panel fill; .5 for the disabled editor background). The disabled editor must retain a truly disabled input, its disabled state marker, the normal source material branch and hidden hover branch. This computed CSS opacity product is a source-parameter check, **not an equation for final blended RGBA**, proof of native per-quad behavior, or certification of wrapper grouping.

All 19 retain complete actual PNG/RGBA and exact historical-candidate scores. The four partial-alpha attachments explicitly report `qualification: UNQUALIFIED`, `nativePixels: PENDING` and a source-contract-only assertion. They have no RGB acceptance threshold and do not assert either equality or the existence of a difference. A future compositor/browser change that happens to match the old candidate does not silently become native certification.

Reports must say **15 strict complete RGBA + 4 source alpha contracts; 4 pixel predictions/native parity unqualified**. A test-runner summary of 19 passing test functions must not be described as 19 pixel checks passing.

## Historical reproduction and immutable identities

- Original `tests/external-server-materials.spec.ts`: SHA256 `0469edebf9de8aa3f824468b67f42d4da26f650938af54c3b01d79825b5d0140`.
- Original fixture `FINAL.json`: SHA256 `86e3f4930873f053f7f054409e40994b6af47271f58dccb46e063ae7c138ae4c`.
- Original `PROTOCOL.json`: SHA256 `54f62cd321fdbd8e1e47e145266b08dd1c4564bc4a4443818952ad1a737d3970`.

All 55 original spec/fixture pins, 19 expected PNGs, generator, original protocol and README remain unchanged. The original strict experimental candidate suite remains explicitly runnable via `playwright.external-server-candidates.config.ts`; its recorded four browser02 failures are not relabeled as successes. The separate default qualification suite does not replace those historical measurements.

Diagnostic evidence is frozen under `.cache/external-server-material-study-01`: `FINAL.json`, `calibration-01`, `calibration-02`, and `calibration-02-analysis-01`. These ignored local files are retained research records, not distributable source images or a new normative pixel profile. The active source-only contract and its first actual run must be reported separately from the original browser02 result and native targets.

## Source alpha declarations

The fixed official v1.26.60.5 archive (commit 15701fa9c13923f12662984c32c124327e40e3d3, SHA256 d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf) declares the following in `ui_common.json`:

- `dialog_background_hollow_common` has a separate `control` child of type `image` whose alpha is `$fill_alpha`, default `0.8`. This is separate from the outer frame and close button.
- `edit_box_indent` is type `image` with alpha `$alpha`; the locked text-edit state passes `$disabled_alpha`, default `0.5`, to that image child. The locked panel does not itself declare alpha.

These declarations justify checking source parameters. They do not expose the engine's internal nine-slice blend implementation or establish a native framebuffer reference for this family.
