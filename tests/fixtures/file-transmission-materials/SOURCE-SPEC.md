# Fixed original source study: file_upload / file_transmission_screen

This is independent source research, not browser acceptance. All writes are confined to this cache. Product geometry/CSS/helpers were not used to generate expected pixels. `audit.mjs` reads the production material bank's literal URL/metadata AST only to compare bytes. A later requested read-only model review does not inform the frozen references.

## Provenance and scope

Fixed archive: `.cache/references/bedrock-samples-v1.26.60.5-full.zip`, 169569258 bytes, SHA256 `d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`. Original file `resource_pack/ui/file_upload_screen.json` is10969 bytes, SHA256 `45c024070ed1ffba06bbdce2111d3c00c5b1e9190faa44cc4ab2f2b3ae845075`. Complete originals, comments, metadata and LICENSE are retained under ORIGINALS. RAW-SOURCE-PINS, ADDITIONAL-SOURCE-PINS and MATERIAL-RAW-PINS hash those bytes. SOURCE-AUDIT contains parsed clauses with exact original declaration names; MATERIAL-AUDIT records PNG-byte comparison and decoded alpha counts.

Immediate family references all resolve in the retained original namespace catalog, including common_art.title_panel_content, common.common_panel, common_buttons.light_text_button and common.base_screen. No replacement for a missing immediate template is needed. `dialog_background_hollow_2` is a literal unqualified parameter passed into common.common_panel, whose bg_image inherits via `$dialog_background`; resolving this as common.dialog_background_hollow_2 is an explicit namespace-resolution policy, rather than a new file_upload alias definition.

The common_art platform branch refers to unavailable raw textures `textures/ui/title_edu`, `title_edu_preview`, and `edu_green_tile` (the latter is inside an ignored:true banner). Ordinary `textures/ui/title.png` exists,1937×333, metadata absent, and is retained; it is absent from progressAssets. Do not substitute ordinary title for education title. Source has no `$title_panel|default` outside the platform variables; absent/unmatched platform context cannot be filled by a guessed default. File upload sets splash text visible:false, not the entire logo panel invisible.

## Exact fixed layout

Rectangles here are local to the268×95 content. Coordinates are exact arithmetic from explicit source anchors and sizes. Parent/content default anchors are not recovered.

| Node | x,y,w,h | Original clauses |
|---|---|---|
| content | unspecified origin,268,95 | file_upload_content/content size[268,95] |
| title |7,7,254,10| size[100%-14,10],top_left,offset[7,7] |
| body |10,23,248,30| size[100%-20,100%-65],top_left,offset[10,23] |
| button area |7,58,254,30| bottom_left,offset[7,-7] |
| play / standalone cancel |7,58,254,30| button_common size100%×100% |
| continue |7,58,126,30| top_left,size[50%-1,100%] |
| paired cancel |135,58,126,30| top_right,same size;2px gap |

Stack is vertical, size[100%,100%c], with children in declaration order: message10px, progress-size labels10px, bar5px. Their all-declared sum is25, but **source does not establish hidden-child participation in%c, native omitted size/anchor behavior, or whether invisible rows collapse**. A host must explicitly choose stack extent/hidden-row and default-anchor policies or supply resolved intrinsic boxes. Centering25 inside30 to derive rows at25.5/35.5/45.5 is a finite Web choice, not proven native geometry. Warning is100% width and default height; intrinsic height/line wrapping needs explicit host evidence. The single-title child's name `center` does not itself declare its anchors; dual-title children explicitly use top_left/top_right. Message explicitly centers. Progress-size text explicitly top_left/top_right. Common_label size[default,100%]; no font, shadow, linebox or default width evaluator is specified there.

## Bindings: independent flags, not inferred workflow

Ten unique visibility bindings produce1024 raw boolean combinations. SOURCE-AUDIT mechanically enumerates them. No boolean defaults or exclusivity are declared in this file.

| Flag | Independent branch |
|---|---|
|#single_label_visible| single title |
|#dual_label_visible| dual title; may coexist with single |
|#upload_content_visible| vertical upload stack |
|#warning_content_visible| warning label; may coexist with upload |
|#message_text_visible| first stack row, gated by upload parent |
|#progress_text_visible| second row; gates both size labels |
|#progress_visible| independently gates empty and full/nub branches |
|#play_button_visible| full-width play |
|#cancel_button_visible| full-width cancel |
|#warning_button2_visible| pair; may overlap either full-width button |

Six text inputs are #single_title_label, #dual_title_left_label, #dual_title_right_label, #message_text, #progress_size_label and #total_size_label. #message_text also has a binding on the message panel. Warning text is localization `progressScreen.noWifi.mobileDataWarning`; button localizations are `progressScreen.message.letsGo`, `gui.cancel`, and case-sensitive `permissions.Continue`. Do not infer translated literals, upload byte counts, network behavior, progress stages or completion.

## Progress material semantics

Empty image texture experiencebarempty. Full image experiencebarfull has clip_direction:left, clip_pixelperfect:false; a global #progress_percentage binding feeds #clip_ratio. No range, clamping, parsing, easing or exact clip algorithm is supplied. A0..1 visible-fraction-web or left-removal-web implementation must identify that as Web policy.

Progress parent width248,height5. Empty uses layer1, full/nub parent layer2, full child layer2, nub child layer3. Nub is tiled:true,size[100%-10px,5]→238×5; it has **no percentage binding, no percentage-dependent offset, and no explicit tile origin**. Centered x5 within the bar is a host default-anchor policy. Nub should not be invented as a moving percentage thumb.

| Texture | Original dimensions | Raw slice metadata | Alpha pixels(0/partial/255) |
|---|---|---|---|
|experiencebarempty|13×5|[6,1,6,1]|4/0/61|
|experiencebarfull|13×5|[1,0,1,0]|4/0/61|
|experiencenub|11×5|metadata absent|0/30/25|

## Frame/fill and inherited source buttons

common_panel has bg_image layer1, overriding inherited hollow_common layer2. It selects original dialog_background_hollow_2,18×67, raw cuts[8,23,8,42], base_size[18,67]. Hollow common child `control` uses textures/ui/control, layer−1,size[100%-8,100%-8], alpha$fill_alpha(default.8). Its omitted anchors require explicit host policy; centered gives local[4,4,260,87]. Control original2×2 is allRGBA[9,9,9,255], metadata slice1/base2. Draw fill before frame, not on top of the frame's title/button regions. File upload default show-close-button:false; common_panel ignored close holder uses not$show_close_button. Source does not say all base-screen popups/factories are impossible.

Button chain: file_upload.button_common→common_buttons.light_text_button→light_button_assets→common.button. common.button defines default/hover/pressed controls; light assets supplies locked control. State panels and texture bindings are supplied by light_text_button itself, so missing `common.button_state_default` aliases are irrelevant to this chain.

| State | Texture | Text RGB | Border RGB | State panel/border layer |
|---|---|---|---|---|
|default|button_borderless_light|.3,.3,.3|.075,.075,.075|1/2|
|hover|button_borderless_lighthover|1,1,1|1,1,1|4/4|
|pressed|button_borderless_lightpressed|1,1,1|1,1,1|5/5|
|locked|disabledButtonNoBorder|.3,.3,.3|.075,.075,.075|1/1|

All button/content alphas default1. State panel is100%×100%; image is[W−2,H−2] centered; button_content is[W−6,H−6] centered; focus_border_white spans full state panel. Button_image layer1, text-type child layer3; label itself layer2. Binding button label explicitly font_type:default,font_size:normal,font_scale_factor1,**shadow:false**, center text/anchors, default offset[0,0], pressed offset default[0,1], default text size, max_size[100%,10] (single line). Native focus vs hover/pressed arbitration, default font raster and .075/.3 float quantization are not implied by these clauses. They require explicit host policy or actual native evidence.

Buttons map menu_select→their pressed target(type pressed), menu_ok→same target(type focused). Actual targets: button.file_upload_play / button.file_upload_cancel / button.file_upload_wifi_warning_continue. Root global menu_cancel→button.menu_exit. Global view menu_tab_left/right map to themselves. Callbacks express source action requests; no backend upload, automatic navigation, close-on-action, reset-once or current file-upload transaction semantics are defined here.

base_screen retains its generic entrance/exit offset/fade defaults, loading bars, safezone matrix and generic screen_panel factories. It defaults is_full_screen_layout:false; common_dialogs.full_screen_background chooses common.empty_panel in that branch, so do not add a .75 black screen scrim based on unrelated common.screen_background. Fullscreen layout chooses control texture alpha.8. A reduced private finite Web screen should name which base-screen features remain out of scope.

## Independently frozen material protocol

MATERIAL-PROTOCOL.FROZEN.json specifies four full500×301 RGBA planes,scale1,backdrop#203040,zero tolerance,no mask. frame-fill uses fixed explicit centered268×95 at[116,103], centered fill[120,107,260,87], fill before frame. Three isolated248×5 empty/fullbar cases use fractions0,.5,1 with explicit visible-fraction-web and left widths0/124/248. Expected PNG+RGBA generated using a separate piecewise point mapper from ORIGINALS only. Nub paint is hidden while geometry retained; platform/title/description/warning/button paint isolation is prescribed. No product code/helpers or browser measurements generate references.

These planes certify only the finite declared original-material mapping and layering. They do not certify full native screen geometry, hidden-row stack behavior, native font/shadow, source default anchors, tile phase/alpha, native clip semantics, animations, lifecycle or original-game input behavior. Partial-alpha nub has no qualified oracle here. The ten core original PNG bytes and all available metadata are exact matches to progressAssets; MATERIAL-AUDIT includes per-file hashes. Black also matches. Ordinary title is absent from bank; missing education title/green-tile raw assets remain unresolved.

## CPU contract / later mounted acceptance matrix

- Enumerate1024 flag combinations without enforcing exclusivity; assert effective child gates only from their named parent and own flag.
- Preserve all three button branches for combinations000..111, including pair+two full-width overlap; distinct cancel controls may send same source target but keep separate source paths.
- Verify exact268×95/title/body/buttons arithmetic; require explicit resolved stack/default-anchor policy rather than claiming hidden-row extents are native.
- Verify six text bindings and all three case-sensitive localizations; reject missing host intrinsic data where actually needed without executing text renderer before full preflight succeeds.
- Test clip0/.5/1 using named Web policy, fixed238×5 nub, correct source raw slice metadata; reject pretending native clip numeric semantics were recovered.
- Inspect default/hover/pressed/locked paint and text-offset policy. Do not add generic dark shadows to source button labels.
- Global cancel and tab requests must preserve original source targets and event ownership; mounted top-modal/stale callbacks/final defaultPrevented checks belong to implementation QA, not source proof.
- Root may measure only after frozen protocol/hash; retain failures and do not fit expected images after browser output.
