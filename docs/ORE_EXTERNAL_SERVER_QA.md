# Modern Ore external server composition

`OreExternalServerForm` is the modern Add/Edit route, independent of Classic
`ExternalServerForm`. It composes reusable `OreButton`, `OreActionBar`,
`OreScreenFrame`, `OreScrollArea`, `OreTextField` and `OreFieldSection` parts.
Import `mcbeui/ore-external-server-form.css` or the unified styles. Each public
primitive also has its own CSS export. The modern gallery is
`#ore-external-servers`; the separate input gallery remains `#ore-text-fields`.

```tsx
import {OreExternalServerForm} from 'mcbeui';
import 'mcbeui/ore-external-server-form.css';

<OreExternalServerForm mode="add" title="添加服务器" backLabel="返回"
  labels={labels} skins={wholeTextFieldSkins} backIcon={hostBackIcon}
  size={[900, 560]} viewportSize={[900, 560]}
  safeArea={{top: 0, left: 0, right: 0}} guiScale={2} locale="zh_CN"
  value={server} onValueChange={setServer}
  onAction={request => handleHostRequest(request)}/>
```

`labels` requires name/address/port/add/addAndPlay/delete/save strings. The
source localization namespace is `PlayScreen.serverTab.serverForm`; translated
labels are host inputs, not invented aliases of Classic localization keys.
Whole normal/disabled field skin URLs are required. Back and edit Delete/Save
icons are caller-owned React nodes. The two edit PNGs and Seven/Ten/Noto font
binaries stay outside the npm library. Optional local preparation uses
`use-local-ore-text-field-assets.py`, `use-local-ore-external-server-assets.py`
and the existing Ore permission asset preparation script; unchanged files and
identity metadata stay in ignored cache. No game screenshot, captured UI
texture, vertex buffer or native matrix is a renderer input.

The form ref is the actual `HTMLFormElement`; `fieldRefs` expose all three
native inputs. `formProps` and `fieldProps` own their stated native attributes
and events. Field name/type/value/form ownership belongs to the component;
name/address/port remain literal strings without Classic maximum lengths or
profanity filtering. Controlled refusals preserve the accepted action snapshot.
Native reset requests the initial snapshot and clears dirty if accepted; this
is an explicit Web policy. Native default prevention is observed before semantic
requests. IME composition suppresses premature submission and port correction;
synthetic event tests do not certify an operating-system IME.

Default Enter follows the source bridge: **blur the input only**. Port blur
accepts nonempty ASCII digits up to 65535, including zero and leading zeroes.
Above-max text proposes `65535`; empty or non-digit text proposes `19132` and
emits `onPortInvalid` with narration intent. There is no persistent red invalid
skin or guessed shake animation. `portValidation="host"` leaves correction
entirely to the caller. Supplying `submitAction` explicitly opts into a Web
form-submit action: add/add-and-play in Add mode, save in Edit mode. Delete can
never be an implicit submission. The default source buttons are type=button;
the opt-in action alone becomes a real submit button.

Click actions are requests. Add/Edit have different source button pairs;
Delete requests confirmation, and Back/Escape carries dirty state. Profanity,
backend errors, persistence, unsaved/delete modals, navigation, notifications
and online-play warnings remain host services. `parsedPort` is the source
`parseInt` service snapshot, not extra validation; raw `value.port` is retained.
Dirty follows accepted edit/correction requests, including equal strings,
rather than an invented comparison against the initial text. Read-only keeps
selection and Back/Escape while disabling edits and mutation actions. Disabled
blocks requests and disables the real Back button. Hidden preserves nodes.

The screen frame takes separate local `size`, source `viewportSize` and signed
source-safe margins. Its header flow is safeTop + 4.4rem navigation + .4rem
strip; the .2rem drop shadow does not consume flow. Back is a 4rem button,
with a .8×1.6rem host glyph and .2rem top offset. The body has no own background;
the form's source glass pane supplies black .5. No modal trap or global body
scroll lock is invented. The scroller hides browser scrollbars and reuses the
permissions implementation, including keyboard/drag/touch/observer cleanup.

Source breakpoints compare source-window width with 70/128rem. Grid centering,
row width=100%, row max-width=128rem and separate gutters are retained. Main
columns are 10/12 wide or 6/8 narrow. The footer stays inside the panel wide and
moves to the screen footer narrow while retaining one real form owner. Rows
grow with actual content; there is no fixed input-row height or transform fit.
The source global div reset and HTML fast-tag mappings were inspected; the
native UA input box model and active viewport/DPR remain unqualified. The Web
unit convention remains 5×guiScale CSS pixels; it is not a measurement of the
engine's currently active provider state.

Buttons preserve source Cg elevated structure: 4rem face + .4rem base + two
.2rem borders, with pressed margin/padding changes. All three variants use
Seven 1.6rem / line 2rem / tracking .04rem. Hover and pressed highlighters are
independent. ActionBar has neutral background, 1.6rem padding, .8rem spacing
and only top/bottom .2rem bevel borders: no extra regular black frame. The
enclosing Add/Edit panel supplies its own regular border. Keyboard focus and
forced colors are explicit accessible Web accommodations, not native shader
or controller-focus qualification.

## Verification scope

The additional PIX 2610.28 packaged GPU launch with **Force D3D11On12 enabled**
captured the empty Add screen again. It still contains three frame draws:
the whole UI texture, panorama, and UI composition. The selected UI texture's
14,443,400 useful RGBA bytes are identical to the earlier normal launch.
No individual glyph or box paint was exposed in this process/frame. This
method therefore supplies no new evidence for changing font rasterization,
alpha rounding, or border coverage. It does not identify the underlying
painter as CPU rendering or exclude a different process/API. Original captures,
analysis copies, SDK readbacks and their fingerprints remain private local
evidence. The existing strict full-page mismatch remains unqualified.

Source browser-03: **93 passed, one expected desktop touch skip, zero failures
or flaky results** across 94 desktop/Pixel 7 cases. This includes 28 new form/ref/button
checks, 14 existing modern-input checks and 52 existing permissions checks.
Node checks: final 52/52 passed. Full typecheck also passed within package-03. Source extraction independently
confirmed the old scroller core, remaining permissions AST statements and
unrelated CSS rules unchanged; wrapper variables now preserve parent overrides.

First diagnostic browser-01 retained 86 pass / three fail / one skip. Two fails
were an ambiguous test selector matching two Cancel buttons. The actual
read-only bug marked the whole form aria-disabled and prevented Back from
being treated as enabled; the fix applies aria-disabled only to disabled
forms and retains individual read-only input/action states. That first run
also overlapped the last extraction compatibility edits, so only the subsequent frozen batches qualify their own runtime. Browser-02
passed 89 with one skip before the later ref-cleanup correction; browser-03
covers the final binder and actual desktop/mobile unmount cleanup. The first full typecheck found a test-host arrow
returning Array.push's number; its callback now returns void.

The first strict complete native candidate is **UNQUALIFIED**: 1,419,830 pixels
of the complete 2570×1402 UI target differ, threshold=0 and mask=0. Its declared
Web profile uses physical size/window 2570×1402, guiScale=5 and zero safe margins;
it does not establish native DOM viewport/DPR or the active engine scale.
1,287,570 mismatches are black alpha127 versus128; other differences include
opaque paint-band discrepancies and unresolved border/geometry/text rendering.
Independent alpha-representation analysis cannot remove any differing pixel; no transparency, shadow, source
coordinate or expected pixel was changed to force equality. The complete
native comparison remains reproducible through
`playwright.ore-external-server-native.config.ts`, outside the default Web
contract projects. Raw actual/expected whole images and the nonzero report
are retained locally. It cannot certify the Classic four partial-alpha cases.

Actual package-03 passed the complete build, 214 components / 232 runtime
exports, all existing assets/fonts/licenses and React 18.3.1 / 19.3.1 consumers.
The new family passed 68 SSR contracts and 18 strict-negative type contracts
per peer, exact source CSS bytes and whole-file/inline private-resource scans.
Default Vite development/production × both actual peers passed all four
independently installed consumers in installed-03. They exercised real source
Enter blur, port correction, explicit submit, Add/Edit/Delete intent, read-only
Back, disabled controls, native reset, custom scrolling, callback-ref cleanup,
five caller-provided original PNG transports and forced colors. Built main
gallery desktop/mobile passed 2/2. The immutable functional tar SHA256 is
`2b032dea9e1640a7e10feb69d1e0907028f95681a09fb123378c6ecc6f6bccb5`.
Later documentation-only packaging has a separate identity.

The independent reviewer found the public scroller dropped callback-ref
cleanup functions. Only its ref binder changed: returned cleanup runs once,
ordinary callbacks get null, object refs clear, identical refs deduplicate.
Three new CPU cases first failed on the old binder, then passed. Final source
browser-03 validates actual mount/unmount in desktop/mobile; installed-03
also validates it in both React versions and build modes. The independent
follow-up rechecked 12 binder cases and preserved the original finding.

Preserved package-01 and package-02 failures were verifier assumptions:
the extracted legacy scroller permits empty string labels and signed exclusion,
and the 128rem maximum belongs to Row rather than Grid. Their workers/logs
remain saved; positive compatibility and exact Row declarations are now checked.
No production restriction or source geometry was changed to satisfy them.
Installed-01 reused dependencies above its Vite root, causing default font
serving 403; installed-02 used fresh roots but its dynamic URL string was not
statically bundled. Installed-03 uses actual local installations and static
host image URLs, with no aliases or Vite access-list changes.

The final native-comparison-02 again fails at exactly 1,419,830 pixels; its
complete browser PNG is byte-identical to candidate-01 despite the ref-only
fix. Six predeclared alpha-association models retain the same count. Alpha
differs at 1,314,630 pixels and another 105,200 discrepancies are fully opaque,
so changing RGB association cannot fix the result. PNG/raw texture
representation is distinguished according to the
[W3C PNG alpha specification](https://www.w3.org/TR/png-3/#6AlphaRepresentation)
and the captured source-over pipeline; no model is promoted as a passing
native result. Source rendering before the precomposed UI upload needs further
evidence. The four pending Classic alpha cases are unchanged.

All owned preview servers and browser contexts close after validation.
Computer Use, Minecraft and PIX were not opened this round. User 4173 was not
taken over. The full library goal remains active and incomplete.
