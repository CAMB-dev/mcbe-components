# File transmission implementation qualification

> Historical private implementation snapshot (202/220). Current public API and qualification are recorded in [FILE_TRANSMISSION_QA.md](FILE_TRANSMISSION_QA.md). The original alpha reference failure and amendment history below are retained.

Recorded 2026-11-02. **Private source implementation; public exports remain202 components/220 values.** Nothing here upgrades file_upload_screen coverage to A or certifies native pixels. Public installation, ergonomic profile/demo and remaining base-screen integration are pending.

The fixed Mojang Samples v1.26.60.5 file_upload_screen.json defines file_transmission_screen, a268x95 content window, independent single/dual titles, upload/warning content, message/size/bar branches and play/cancel/continue-pair controls. The10 visibility inputs have1024 combinations; no stage enum/exclusivity/default transaction flow is inferred. Buttons emit exact file_upload_* requests. Root cancel maps to menu_exit; left/right tab commands preserve their source identities. No uploads, redirects or automatic closing occur.

The implementation separates FileTransferProgress, FileTransmissionPanel and FileTransmissionScreen. They reuse whole original experience/control/frame/button images and ClassicSkin, text and modal/event primitives. File-upload bar width is248, not the generic Progress family's90% parent width; the first CPU check caught that inappropriate reuse and it was removed. Nub remains238x5 tiled at fixed5px inset, without percentage-driven translation. Native nub phase/alpha remains unqualified.

## Source geometry and host boundaries

Title[7,7,254,10], body[10,23,248,30], buttons[7,58,254,30]; paired buttons[7,58,126,30] and[135,58,126,30] preserve2px gap. Frame is original hollow2,18x67/cuts[8,23,8,42]. The original control fill uses alpha.8, centered[4,4,260,87] under frame in the explicitly selected finite Web namespace/default-anchor interpretation. Source common_panel overrides frame layer1 while inherited fill layer-1 stays underneath. There is no invented close button.

Native %c/hidden-row occupancy/default anchor/font evaluation cannot be derived from declarations alone. stackLayout therefore requires explicit height, three row offsets, policy and provenance. All eight message/size/bar visibility subsets retain those host measurements. Default text widths and warning height use explicit profile intrinsics. Profile fonts and colors are host choices, common label shadow is not recovered, and no Mojangles claim follows from a test monospace font. Button label shadow:false is an explicit source declaration.

Base/title providers are explicit React slots. Source ordinary logo exists; education logo assets are missing from the fixed archive. Neither an ordinary logo nor a black scrim is substituted. This reduced screen does not recover common.base_screen safezone/factories/panorama/loading bars/entrance-exit animations/platform-title layout. Root geometry centers the explicit content as a named finite Web choice. Source closed/disabled/readonly semantics and owner-window requests are implemented; actual native modal/input arbitration is not certified.

## Actual checks

- CPU/SSR10/10PASS: .cache/file-transmission-node-04.log. Includes all1024 flags,16 explicit-layout/visibility cases, fixed rectangles and targets, snapshots/latent accessor rejection/budgets, pre-glyph atomic validation, real React key/ref metadata, zero SSR service/ref callbacks, original51 frozen-file byte hashes and scalar calibration consistency.
- Browser initial8=6PASS/2FAIL: one frame-fill oracle assumption and one test that hid a source action before its deferred callback. After awaiting the source checkpoint, the next batch was7PASS/1 test timeout: Playwright refused clicking aria-disabled readonly by default. The explicit forced native click exercises the component's readonly veto; no product guard was removed. Original reports/traces retained under distinct .cache/file-transmission-browser-01/02/.
- Third browser batch8/8PASS; fourth final batch9/9PASS in .cache/file-transmission-browser-04/RESULT.json. Tests actual buttons/independent binding updates/readonly Escape/disabled rejection, document/native veto/latest callback, hide-reopen/instance/visibility/readonly/unmount expiry, fallback focus/Tab/controller mappings/scroll and opener restoration. Additional genuine bugs found in independent review were fixed and verified: stable controller handle supports controllerRef={setController} without updates looping; only actual top modal can request actions, including nested Escape bubbling and retained outer handle.
- Four full500x301 material planes,602000pixels. Three bar planes were frozen independently before product observation and have exact RGBA0 differences. Frame-fill has a separately calibrated Web reference described below. No masks/tolerance/cropped comparisons; glyphs/buttons/progress/nub are isolated only as declared and all boxes retained.
- Strict TypeScript and build results are recorded in the closing handoff/receipt. This family is absent from the public barrel, so installed React18/19 family consumers are still pending. Public202/220 functionality is not increased by private source count.

## Alpha reference correction — original failure remains

Original protocol SHA6081f1803cdae74e55f8c1c8149b480097b7afdb6946e3cc5a161ec322f90c19 was frozen before root measured the renderer. Its straight-byte final rounding assumed control9 at opacity.8 over backdrop32,48,64 gives14,17,20. Actual Chromium whole-image CSS gives13,16,20. Original complete plane differs7560pixels, exactly the252x30 transparent frame center; frame/material placement and the rest of the plane match. Source PNG, color and opacity were not tuned.

Independent scalar experiments rendered original-image opacity, CSS colors/RGBA and Canvas separately. The18 opaque-image samples inside the54-case diagnostic and four new opaque-image cases with predictions saved BEFORE those new samples support this finite image-opacity profile:

```
A = floor(sourceAlpha * opacity + .5)
out = floor(sourceRGB * (A + 1) / 256)
    + floor(backdropRGB * (256 - A) / 256)
```

Solid-color/Canvas paths differ, so the profile is not generalized to them. Skia has integer alpha scaling/source-over approximations that make such differences plausible ([scaling](https://raw.githubusercontent.com/google/skia/main/src/core/SkColorPriv.h), [source-over](https://raw.githubusercontent.com/google/skia/main/src/opts/SkBlitRow_opts.h)); this is an inference, not a trace proving which installed Chromium routine ran. The independent four-case holdout also disproved another plausible rounded-premultiplied candidate. It is evidence for the observed Web profile only, not Minecraft's GPU.

CALIBRATED-WEB-01 is explicitly a **post-observation amendment**, protocol SHA201b9cb747c3fb614c6f99dec73e52fc699d767918f9a72b4203566439447f37. Its generator reads original PNGs and the same independent geometric mapper, replacing only the declared alpha equation. Expected frame RGBA SHAb1522056a93831ada42df3e8b92dd38c89ebaaedf2fc57b81067c2d153d236e8 matches the complete browser plane exactly; original v1 and all51 original frozen files remain unchanged. Tests explicitly report original7560 differences alongside calibrated0. This amended plane must never be called an independent first-measurement blind reference.

## Pending

Public API/profile ergonomics, exports/CSS distribution, source/built public gallery, installed two-peer declarations/SSR/default Vite, physical/mobile profiles, actual fonts/AA/shadow and `%c`/safezone/native tile/clip/animation/default context, native full-page/runtime services. See the full GOAL.md; the original all-GUI objective remains active.

Final build: npm run build PASS in .cache/file-transmission-build-03.log after correcting fixture readonly assignments; earlier build-02 TypeScript failure retained. Rebuilt public ESM16eab6bf097a606125b43f0e8f3aadbfb37eaf63c710d7050e29f68e411f77cc and DTSbfd1d9119259956d0d62ad2471812ecbe87d51da04da9253b9fab0107f8ccaea are identical to the last qualified202/220 functional package. Of787 previous non-documentation package files,786 are byte-identical; only index.js.map embeds the newly added private modal ownership query. This does not qualify this private family as an installed public consumer. Receipt: .cache/file-transmission-public-identity-01.json.

Final regression after private top-owner helper: existing Progress105/105PASS (.cache/file-transmission-progress-regression-01.log) and FileTransmission10/10PASS (.cache/file-transmission-node-final-01.log). Temporary source5418 closed after exact identity verification, no listener remains; no Computer Use opened and user4173 untouched. Close receipt .cache/file-transmission-close-01/SERVICES.json.
