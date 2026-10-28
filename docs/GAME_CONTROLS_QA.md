# Game controls independent QA

## Evidence and reproducibility

QA owns `tests/game-controls-fidelity.spec.ts` and `tests/game-controls-interaction.spec.ts`; implementation and fixtures were owned by a different agent. Expectations originated from the user-owned 26.60 installation at `C:/XboxGames/Minecraft for Windows/Content`, and Mojang's full v1.26.60.5 resource release, rather than production CSS or generated manifests. Original files and full-object native/public JSON comparisons are retained locally under `.cache/game-controls-third-qa/independent-source-proof.json`. Ten complete parsed UI JSON objects matched, with independent raw PNG hashes and nineslice metadata. The public raw-art fallback is pinned to Mojang commit `46ba6ea985fb5a92d79a9419198f10dda14c199d`.

The original full ZIP SHA256 is `d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`. Native archive extraction uses the archive's own offset/length table; some original touch PNGs have identical trailing bytes after IEND in both native and public copies. Tests preserve these bytes, pin their hashes, and inspect PNG signature/IHDR instead of rewriting them to satisfy a strict decoder.

Independent Chromium runs use port 5195, DPR1, separate results under `.cache/game-controls-third-qa/results`, and a fixed Vite watcher/HMR configuration. They do not consume another agent's result directory. Final integrated execution is owned by the root agent.

## What is checked

- All seven touch actions use the entire original 22x22 idle and pressed images at GUI2, including transparent pixels. The neutral joystick compares the complete original 64x64 frame and 32x32 knob. The placement and movement/ownership policy are a declared Web renderer reconstruction; the native custom touch engine's layout, dead zones, gesture recognition and animation are not publicly specified by these assets.
- Player rows follow the full JSON inheritance chain, including the ancestral six-game-pixel content inset, then the leaf four-pixel inset. At a 300x56 CSS surface, the avatar is (16,10,36,36), the original black-tinted frame is (14,8,40,40), the name starts (54,18), and the original LAN glyph is (23,15,26,26). Rows stride54 and surfaces overlap2px. The complete 300x266 list reference includes source textures, alpha, portraits, names, disabled banner, overlap and invite text without masks.
- Pause checks 113% main bounds, 55% left region, 60% menu region, four primary actions, all three footer actions, original icon aspect ratios, and optional 300px legacy sidebar/340px host skin-renderer region. Native paper-doll rendering remains a host slot. Original button captions have no shadow as declared by `new_ui_binding_button_label`; this does not alter the shared Button font profile.
- The older JSON Classic Death remains an explicit variant. Tests cover source trailing-child spacer semantics, title/reason size percentages, both button locations, loading-label anchor, and complete 960x540 ready/loading source-profile references. Native custom `gradient_renderer` interpolation remains unverified; the reference preserves the source fractional RGB values and tests the declared vertical Web reconstruction.
- Default Death now follows the actual native HBUI implementation, independently found after real-game captures disproved the assumption that the old JSON branch was active. Tests pin the actual gameplay entrypoint and JS/CSS hashes, check 32rem width, flex spacer weights3:5:2, 4.8rem elevated buttons, 4rem/2rem title/body line boxes, source palette, caption type hierarchy and shadow rules. Complete default and hovered 960x540 references include the radial gradient, all text, both source-colored faces, borders, elevation and both specular edge layers, without masks or tolerance.
- Keyboard and pointer tests cover roving focus versus selection, disabled players, controlled host state, independent action owners, repeated keys, multi-pointer cancellation, joystick capture/clamping/normalization, blur/remove/disable/unmount cleanup, Pause callbacks and Escape, native Death ready versus loading/disabled Escape guards, and actual mobile taps.

## Active HBUI source and private font boundary

The native `gameplay.html` directly loads:

| Source | SHA256 |
| --- | --- |
| gameplay-6de8e340eddced55490b.js | 9e7efe423b6cc8a1c1fa92756bd181675cffa51a4728bce386b0081cad1bb979 |
| gameplay-2778064b6874c712adbb.css | 04fb7a7ea41955c53cf51c0e6dc9e0928b29b7a8150fdcd83d04765742528ab5 |
| Minecraft-Ten-ed29a1bbe6a620b83378.otf | 1dd0c122794d0ac5c504e853143e078bd295f24b3a0d6ddd23dba2ca70b6e815 |
| Minecraft-Seven-66398119c2c20ee73019.otf | 3ac46d75d4fe3aae7412d18e09047b70073a8e779488f72560c09f8c474fecc6 |
| animation-074ed0ba8c16bb30e36c.gif | 27d3ad3174cbe640acbed6346646ba1f8d69891dd2e8aaed63ccd8c6536270b3 |

Full native-caption references load independently named FontFace instances from independently hashed user-owned OTF bytes. Those optional checks skip when the original fonts or matching local preview bridge are unavailable. Public fallback font behavior is a separate profile. Original OTF/GIF files remain in ignored local storage and are not redistributed. The loading GIF is checked for provenance and optional20x20 slot geometry, never against an arbitrary animated frame.

Parent-captured native lossless PNGs are private under `.cache/native-system-screens/`. The Pause capture supports original footer keep-ratio and default composition. The stable Death capture uses HBUI, not the older JSON profile: at GUI5 it has an800px main column, matching32rem*25px. The source geometry predicts first-button y926 versus observed y925; native safe-area/layout quantization remains unresolved at1px and is not hidden by hand-tuning the component. Native Coherent SDF/LCD rasterization, stage transitions, transport and respawn timing are not certified by a Chromium reference.

## Findings corrected during independent QA

The producer fixed inherited player insets, disabled full-banner coverage, LAN centering, percentage rounding of visible disabled content, footer image distortion, missing Pause footer/skin actions, Classic Death percentage-spacer behavior, original caption shadow rules, and the incorrect active Death default. All fixes were supported by original JSON/PNG or active HBUI plus real-game evidence.

The oracle itself was corrected when transformed ancestor contexts changed footer captures, when overlapping full-screen reference layers changed Chromium alpha/LCD compositing, and when computedStyle's rounded RGB serialization was mistaken for source precision. Full actual roots are cloned into the same body-level comparison context, captured, then removed before reference rendering. Full content is retained; no masks, region shrinking or nonzero pixel thresholds are used. Raw full fixture screenshots and unit references are stored separately. Actual/reference source-profile comparisons use exact RGBA equality.

## Validation record

The initial61-case independent batch had53 passes, one desktop-only touch skip, and seven actionable failures. Original trailing-byte/containing-block oracles and producer geometry were corrected. A subsequent17-case targeted batch passed all world-modal source/full-region checks and all corrected original-art/player checks, while exposing the Death screenshot-composition issue. The final Death/new Escape rerun and root integration results are reported separately; do not add counts from overlapping reruns as distinct test cases.

The final focused rerun passed6/6: complete Classic ready/loading and HBUI default/hovered screens all matched exactly, and native Death Escape interactions passed desktop/mobile. Final core+demo typecheck passed. The three owned files collect72 unique cases (48 source/pixel cases and24 interaction cases); the desktop-only actual-touch case intentionally skips on desktop. These are collected case counts, not a claim of one complete72-case independent run. The root integrated run owns that final aggregate. Port5195 was stopped and absence of its listener confirmed. No production/shared configuration was changed by this QA agent; no commit was made.

### Pending native capture bounds audit

Independent edge inspection of both private native PNGs found identical full-height columns3/4/5 in RGB227/255/240, three bottom rows in RGB240/160/105, and exact red/green/blue markers at bottom-row x0/1/2. Those observations alone do not establish an operating-system frame or the original game-client origin/height. Clipboard bitmap dimensions and Paint paste/canvas origin must be independently verified before interpreting a1397px active height or subtracting an offset. The1px native Death position residual remains unverified; no border crop, artwork modification or production hardcoded offset was introduced.
