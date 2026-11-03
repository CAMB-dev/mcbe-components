# Content Log History

`ContentLogHistoryScreen`, `ContentLogMessages` and `ContentLogActions` compose the Classic `content_log_history_screen.json` family. Import `mcbeui/content-log.css` or the complete `mcbeui/styles.css`. The three components forward their real root refs. Public export counts are 275 components + 8 data values + 14 functions = 297 runtime values; implementation is not native pixel certification.

## Source and geometry

The source is the complete official Bedrock Samples v1.26.60.5 archive, commit `15701fa9c13923f12662984c32c124327e40e3d3`. [Original byte ledger](content-log-source.json) pins the JSONs and whole copy/crossout PNGs. Existing whole dialog, button, close and scroll textures are reused without repainting. Copy is a 12×12 original displayed at source 13×14; crossout is a 15×15 original displayed at 10×10.

The host supplies `layout.size`, `dialogRect`, integer `scale` (1–8), three font profiles, `titleWidth`, explicit `bodyShadow` (null or hex color/offset), and action label sizes/Y offsets. All dimensions are logical GUI units. No browser viewport or platform heuristic resolves game defaults. The title is at Y9 and uses the source no-shadow rule. The inherited common-panel close offset is [0,0], with a 21×21 hit box and centered original 15×15 glyph.

`supportsClipboardSet` is required. True selects the one-button dialog template, inset [8,23,W−16,H−65], and the footer [7,H−37,W−14,30]. Despite the template name, the footer has **both** copy and clear controls, each explicitly 25% wide, leaving the other half empty. False selects the no-buttons template, inset [8,23,W−16,H−31], and removes both controls. Labels, capability and close visibility are explicit host inputs.

The log retains source offset [2,−27], bottom-left/100% scroller evaluation, source collection order, `smooth` provenance, line padding 1, literal text and unconditional jump-to-bottom updates. Current Web evaluation places it at [10,−4] relative to the dialog and layers it below the hollow frame. This unusual position is source-derived, **not a recovered native anchor/scissor rule**. The exact declared outer frame clips overflow and does not scroll; the log has its dedicated original-style scrolling rail.

## Minimal composition

```tsx
import {ContentLogHistoryScreen} from 'mcbeui';
import type {ContentLogHistoryLayout} from 'mcbeui';
import 'mcbeui/content-log.css';

const font = {family: 'monospace', size: 8, lineHeight: 10};
const layout: ContentLogHistoryLayout = {
  size: [320, 240], dialogRect: [10, 10, 300, 220], scale: 2,
  titleFont: font, bodyFont: font, actionFont: font,
  titleWidth: 120, bodyShadow: null,
  actions: {copyLabelSize: [30, 10], clearLabelSize: [28, 10],
    copyIconY: 4, clearIconY: 6, copyLabelY: 6, clearLabelY: 6},
};
<ContentLogHistoryScreen open runKey="session-1" layout={layout}
  title="Content log" labels={{copy: 'Copy', clear: 'Clear',
    close: 'Close history', messages: 'Messages'}}
  messages={[{id: 'first', text: '<tag> & literal text'}]}
  heightPolicy="web-intrinsic" supportsClipboardSet closeVisible
  onRequest={detail => console.log(detail.buttonId)} />;
```

`ContentLogMessages` independently takes a logical `size`, font/shadow, label, run key and rows. `heightPolicy="web-intrinsic"` uses Web wrapping and forbids row heights. `"host-resolved"` requires a finite height per row and clips to it; this can represent caller-resolved engine metrics without claiming a native font evaluator. `renderText(text, context)` is an optional decorative paint slot, with immutable font/shadow/geometry context and a literal accessible fallback. Its content must not add interactive controls; the host owns font resources and renderer cleanup. The component does not distribute or derive proprietary game fonts. Original smooth font selection, AA, shadow defaults and native wrapping remain unqualified.

`ContentLogActions` independently takes width, scale, font, metrics, copy/clear labels and an `onRequest` callback. It keeps native button identity/ref/keyboard activation and original source widths; it does not center or equalize them. All components reject children/HTML injection at their root and validate bounded geometry/collections before renderer callbacks. Unique dense row IDs, at most 10,000 records, and a 4,194,304 UTF-16-code-unit collection budget are Web resource policies.

## Requests and ownership

Actions request `button.copy_to_clipboard`, `button.clear` or `button.menu_exit`; the host owns collection updates, clipboard access, persistence, clearing and closing. No OS clipboard access, file deletion, polling or network service is performed. The demo reports copy requests and explicitly accepts clear/close in host state; it does not copy system data.

The optional session-stable `controllerRef` accepts `button.copy_to_clipboard`, `button.clear`, `button.menu_cancel`, `button.menu_exit`, `button.menu_select` and `button.menu_ok`. Select/OK require an actually focused owned action/close ref. Escape maps cancel to menu exit; composing/repeated/modified Escape is ignored. `request` returning true means a request was queued, not that the host accepted an operation. Deferred dispatch rechecks live session, capability, disabled/readOnly, hidden/inert, native/source modal ownership and actual target identity. Leaf, ancestor React and later native default prevention cancel semantic callbacks.

Stable callback/object/React state-setter refs and StrictMode are supported. Retained handles read current committed callbacks, while close/reopen, run-key replacement, hidden/inert transitions invalidate old handles. `modal={false}` delegates page-modal management to the host. The default modal traps Tab, includes the scroll viewport/rail in keyboard traversal, and restores opener focus. Log updates continue following the bottom while input is blocked by inert/modal ownership.

## Validation boundary

See [qualification record](CONTENT_LOG_QA.md). The demo is at `/#content-log`, including independently reusable parts and the unsupported-clipboard branch. Source JSON/material and Web contracts are distinct from native screenshot/GPU certification. Original inherited anchors/scissors, font provider/metrics, blending, platform bindings and whole-screen native pixels remain open.
