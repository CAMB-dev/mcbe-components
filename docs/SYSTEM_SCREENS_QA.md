# System screen independent QA

QA owns `tests/system-screens-fidelity.spec.ts`. Expectations were independently read from installed `settings_common`, `settings_screen`, `progress_screen`, `toast_screen`, `ui_common`, `ui_art_assets_common` JSON and original PNG/nineslice resources, then checked against Mojang's full v1.26.60.5 release. The settings_common source is in `ui/settings_sections.brarchive`; relying only on the root ui.brarchive misses that source. Complete parsed JSON and raw-art comparisons are retained in `.cache/game-controls-third-qa/independent-source-proof.json`; release provenance is recorded in `GAME_CONTROLS_QA.md`.

## Verified regions

Settings checks the entire original hollow3 frame18x33, slices LTRB8/23/8/8 at GUI2, including the transparent center over the declared settings background. The complete original3x3 divider is compared across its entire adapted height. Separate full unmasked screenshots retain real host controls/text, and navigation checks ensure host drafts stay mounted across hidden sections. The reusable SettingsPanel's responsive spacing is an adapted composition rather than a claim of full native-screen positional identity.

Legacy compact Loading remains explicit and is tested for original dirt16x16/background32x32 tiling at64CSS, declared gradient endpoints, complete original7x7 spinner UV cells enlarged to28CSS, host background, progress accessibility and host-owned cancellation. The native custom progress renderer's algorithm and live loading transport are outside this check.

The default Loading was changed after actual native evidence showed a framed world modal and original fancy green progress textures. Its independent tests pin source panel width290g, content278g, bar90%*278g=250.2g, height5g, trailing14g and gap5g. All raw control/frame/empty/full/nub/title bytes match installed and official originals. Complete reusable580x200 panes at0%,50%,100% compare every RGBA pixel, including text, the original control2x2 wash at alpha.8, hollow3 frame/transparent center, fractional-width source nineslice bar, clip, and always-present tiled nub. No masks or nonzero tolerance are used.

The wash uses a stretch of the original2x2 control image: a nine-slice with a zero-size source center would incorrectly leave its center transparent. Source layering is wash, original frame, then content, then original empty/full/nub layers. The nub does not bind progress clipping in the native JSON and therefore remains present at zero progress too.

Achievement checks the original greyBorder16x16 full nine-slice with4px source cuts, and separately captures the full visible host icon/title/description. It reuses the library Toast as a semantic Classic composition; native platform popup layout, sound, third-party achievement art and notification animation are not claimed equal. Timing and dismissal behavior are additionally covered by the producer's independent interaction suite, not inferred from the PNG comparison.

## Native capture and typography limits

The parent's private `world-loading-state-native-lossless.png` is a transition capture: part of the previous WorldList remains at the top/left. Only its stable central frame/bar/logo observations are used. It is not a whole-frame baseline. The observed uninterrupted dark bar width1241px at GUI5 agrees with250.2g*5 minus two1g edges. Panorama and world scene remain host-provided, not fabricated artwork.

The original win10 title JSON uses55% width and18.85%x height, offset10% from top. Independent actual-logo measurements support the element's own cross-axis interpretation; parent-axis multiplication would be off by more than100px. The world-modal default is still a reusable composition: viewport padding/min-height, optional cancel layout and responsive branding cap are documented Web policy. No source JSON existence alone proves every platform selects that branch.

Text uses the explicit existing Mojangles preview profile. The full-pane references test that profile together with source artwork; they do not certify native engine font rasterization, CJK smoothing or arbitrary translated text wrapping. Original pixel fonts and native private HBUI fonts are distinct, and all local private fonts remain unbundled.

## Validation

The initial independent system suite passed11/11, including complete source skins and compact backgrounds. The final world-modal additions passed native/public raw-art/source checks plus all three complete0/50/100 pane comparisons with zero RGBA differences. Those four additions make15 system cases. Root owns final integrated execution. Tests run at5195 with isolated output `.cache/game-controls-third-qa`, without deleting another agent's test-results or ports.
