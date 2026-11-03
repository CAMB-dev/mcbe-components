# Automatic-save explanation

`AutoSaveInfoScreen` implements the named Classic `auto_save_info_screen.json`
composition. `AutoSaveIcon` is its independently reusable original strip image.
Import `mcbeui/auto-save-info.css`, or the complete `mcbeui/styles.css`.

```tsx
import {AutoSaveInfoScreen, AutoSaveIcon} from 'mcbeui';
import type {AutoSaveInfoLayout} from 'mcbeui';
import 'mcbeui/auto-save-info.css';

const layout: AutoSaveInfoLayout = {
  size: [320, 200], panelOrigin: [60, 10], scale: 2,
  font: {family: 'Your prepared pixel font', size: 8, lineHeight: 10},
  titleSize: [120, 10], acceptLabelSize: [24, 10],
  messageAlignment: 'left', messageVerticalAlignment: 'top',
};
// open, frame and translated strings are host state.
<AutoSaveInfoScreen open={open} layout={layout}
  title="Auto Save" message="Your world saves automatically."
  acceptLabel="OK" messageVariant="desktop"
  icon={{visible: true, frame}} inputHint={{visible: false}}
  onAccept={() => setOpen(false)} />;
<AutoSaveIcon visible scale={2} frame={0} label="Saving" />;
```

The sample numbers are explicit Web host inputs, not recovered native label
metrics or automatic safe-zone evaluation. Each label size is its own resolved
intrinsic box. `panelOrigin` is in the whole frame's logical coordinates; the
complete fixed 200×180 panel must fit. Physical frame dimensions are `size*scale`.
Scale is an integer1..8. Dimensions, finite budgets, frame and labels are checked
before painting, including when the screen is closed.

## Original structure and materials

- Panel: 200×180. Title: top-middle, Y3% (5.4), host intrinsic dimensions.
- Message: X5%, Y10%, width85%, height85% (10,18,170,153). The source's
  `$body_text_color` is white; title and normal light-button text are30% gray.
  Message alignment is a required host policy because native label defaults
  have not been recovered. Text clips within the source box.
- Image: centered18×30, Y offset5% of the panel; top-left(91,84).
- Accept: width94%, height17%, bottom-middle offset−3%; box(6,144,188,30.6).
  Its content label is centered with the original X−2 offset; pressing shifts
  the content one logical unit down. Skin inset1 and content inset3 are retained.
- Background: complete original `dialog_background_hollow_5.png`, its unchanged
 18×61 metadata with cuts8/17/8/42, plus the existing original `control` inset4
  at alpha.8. Original light/hover/pressed/locked/focus PNGs are reused.
- No close button, divider or internal scrollbar is added. The source-bounded
  text can clip; the host must supply a sensible translation/font/size.

`docs/auto-save-info-source.json` pins whole original source and asset hashes to
Mojang Bedrock Samples commit15701fa9c13923f12662984c32c124327e40e3d3,
v1.26.60.5-full. The new frame PNG/JSON are unchanged. The nine-frame162×30
strip is the existing exact original Progress-bank resource, not a redraw.
Mojang assets retain their upstream EULA/ownership; the library code is MIT.

## State, animation and requests

`icon.visible` corresponds to `#auto_save_animation_visible`; `icon.frame` is
an explicit integer0..8. Source animation declares fps10, reversible, step18 and
disable-fast-forward. These are provenance, not a recovered native phase or
clock: components own no timer, RAF, playback, save operation or automatic
frame advancement. A host can hold a frame for reduced motion or supply its own
policy. Empty `AutoSaveIcon.label` makes the image decorative; nonempty labels
expose one named image. The screen's icon is decorative beside explanatory text.

`messageVariant` is `general|nx|xbox|desktop|berwick`, selecting the corresponding
source localization-key identity. The host supplies translated `message`, rather
than user-agent sniffing. No binding provider or one-time platform detection is
invented. For a visible platform hint, supply its resolved panel-relative `rect`
and genuine host `content`; the source helper's105% anchored offset is not solved.
Hints are decorative/inert and text does not intercept action input.

`onAccept` receives `{buttonId:'button.info_accept',
sourceControl:'auto_save_info.accept_button',source:'button'|'controller',event?}`.
The screen never closes itself, writes a save or communicates with game services.
Native Enter/Space activate the button. No Escape-to-accept mapping is invented.
The optional controller's only command is `request('button.info_accept')`.

DOM requests defer until React/native propagation completes and honor
`preventDefault`. Queue validity is checked again at dispatch. Controller `true`
means queued, not delivered; it has no DOM ancestor event to veto. Retained handles
read committed latest callbacks and remain stable during normal updates; closed,
reopened, hidden and inert sessions reject stale handles. Disabled/readOnly and
underlying modal owners cannot submit. Both root/button refs are forwarded, with
the shared React18/19 ref-cleanup bridge. A state-setter controller ref is supported.

By default the shared Classic modal lease moves/traps/restores focus and locks
background scrolling. `modal={false}` delegates modal ownership to the host.
Forced colors remove decorative skin paint and retain native named targets.

## Verification scope

Final stage: `.cache/auto-save-info-20261103-01/FINAL.json`.

- Node4/4. Final browser05:30/30, comprising14new autosave cases and16
  unchanged adjacent InBed cases. The9 original frames cover19,440 Web pixels
  with zero RGBA sampling differences over the declared opaque background.
- Source demo02 and built demo01:3/3 each, desktop/Pixel7/320px. These precede
  the final visible-hint inert/dense-box guard; their hidden-hint output is unchanged.
- Functional package04: actual React18.3.1/19.3.1 ESM/SSR/declarations/CSS,
  original assets/fonts/licenses and all existing family gates PASS. New positive
  types and two negative command/hint contracts are included.
- Installed01: actual npm-installed peers and only `auto-save-info.css`, with
  default Vite development/production and no source alias/optimizer override.
  Four cases verify state-setter controller refs, latest callbacks, stale sessions,
  native modal ownership, readonly state and ref release. Twelve640×400 screenshots
  form six dev/prod pairs:1,536,000 Web RGBA pixels, zero differences. These use
  an explicit monospace host fixture; they do not qualify original game fonts.
- Browser03 retained a test failure because it compared a focused white button
  against the normal gray title. The test now inspects the normal state. The
  separately observed original product bug (gray body text) was corrected from
  the actual global source value; its earlier screenshot remains in the stage.
- Package01 retained a stale namespace-count failure; package02 retained a
  root-vs-packed notices mismatch after documentation changed during the run.
  Package03 passed before the final hint guard. Package04 is the qualified final
  functional tar; earlier candidates are not substituted for it.

 Node tests independently check source geometry, snapshot isolation,
guard failures and original whole-resource identities. Browser cases exercise
actual requests, propagation vetoes, retained handles, native modal ownership,
focus, forced colors, dimensions and the full9-frame strip over an opaque Web
background. Source/prod demonstration tests use desktop, Pixel7 and320px.

This is a source-based Web implementation. No new native Minecraft frame was
captured. Original font routing/metrics/shadows, label defaults, safe zones,
UI-pass compositing, animation timing, platform hint providers and the complete
native scene remain unqualified. `data-native-certified="false"` is deliberate.
Web source sampling and dev/prod equality do not certify those missing parts.
