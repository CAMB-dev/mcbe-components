# Chat qualification: finite Classic Web composition

Updated 2026-11-02 (Asia/Singapore). Public exports are `ChatScreen`,
`ChatComposer` and `ChatTranscript`: 196 components / 214 runtime values in
total. Internal controls, model validators, material bank and revision allocator
are not public exports. API and integration details are in [CHAT.md](CHAT.md).

## Source and scope

The fixed official `v1.26.60.5-full` archive is 169,569,258 bytes, SHA256
`d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`.
The Chat source freeze is `.cache/chat-screen-source-01/FINAL.json`, SHA256
`33519823c982bd8161ba9aed4ec0408a17fda7ade8eaa745b498ad84f3c77cf2`.
The screen actually composes messages, native editing, suggestions, coordinates,
settings, five independent host panes, header, new-message affordance and toast.

Whole original PNGs and raw nine-slice metadata are retained. No screenshot is
used as runtime art. The demo explicitly maps lowercase `white.png` and original
Xbox button images through host inputs; this does not recover literal uppercase
`White` or a universal controller/platform provider. Missing dynamic glyphs in
the demo remain hidden, rather than fabricating images.

The layout is an explicit finite Web resolution of source geometry. Native `%c`
evaluation, font routing/shaders, engine services and complete Pocket/platform
behavior remain unqualified. Source-profile flags are independent; the demo
implements its own plausible combinations and local state.

## Actual checks

These are separate evidence groups, not one accumulated all-green suite.

| Check | Observed result | Evidence |
| --- | --- | --- |
| TypeScript, declarations, ESM and site | `npm run build` passed; source/demo strict checks passed | `dist/index.js`, `dist/index.d.ts`, `site/` |
| Full repeatable package pipeline | `npm run verify:package` passed: both installed React peers, all 196 components / 214 exports, styles, fonts, renderer assets/licenses and Invite/Credits/Chat specialized checks | `.cache/chat-verify-package-01.log` |
| Revision allocation | 3 Node tests passed | `tests/chat-revision.node.test.mjs` |
| Persistent mounted Chat contracts | 8 passed | `tests/chat.spec.ts`; `.cache/chat-resume-chat-contracts-01.json` |
| Mobile Chromium contracts | The same 8 contracts passed with the Pixel 7 browser profile and a host-sized fixture | `.cache/chat-mobile-contracts-01.json` |
| Persistent complete material planes | 11 passed, every RGBA channel identical | `tests/chat-materials.spec.ts`; `.cache/chat-material-contracts-01.json` |
| Shared modal lifecycle, including iframe portal | 9 passed | `tests/classic-screen-lifecycle.spec.ts`; `.cache/chat-resume-regressions-02.json` |
| Root state, disclosure, lifecycle and natural geometry | 14 passed in the corrected harness | `.cache/chat-browser-01/root-state-02/RESULT.json` |
| Independent host visibility and requests | All 32 flag combinations, five collection routes and stale-payload rejection passed | `.cache/chat-browser-01/host-state-01/RESULT.json` |
| Native editor behavior | 14 passed after actual caret/reset/revision fixes | `.cache/chat-browser-01/behaviors-03/RESULT.json` |
| Actual installed package | React 18.3.1 / 19.3.1, each 15 SSR checks, strict declarations and default Vite production build passed | `.cache/chat-package-delivery-01/qualification-04/` |
| Installed default Vite browser | Both React versions, development and production: all four combinations passed, no page errors, console warnings or failed requests | `qualification-04/BROWSER-MATRIX.json` |
| Public source and production showcase | Both 1440x1000 and 390x844 passed: real font loading, controlled send, settings, menu navigation, close/return focus and independent composer | `.cache/chat-browser-01/public-demo-02-source/RESULT.json`, `public-demo-02-production/RESULT.json` |
| Scoped new Chat accessibility | Closed reusable parts, open screen and settings passed production Axe checks with no reported violations after correcting heading order | `.cache/chat-browser-01/public-a11y-04-production/RESULT.json` |

The installed functional candidate tar SHA256 is
`ffea67261d1ed81f9257919b4bc069815290c8d553fd9ebf7c5206d1b3d5dc87`.
Its ESM SHA256 is
`ffff103a619586e92df710332da37ba278f5ed433c0987acde8819ff4dbcb93b`;
declarations SHA256 is
`73fd77a076cb3a1c1c3e6bf3444f3b79801f38591c3d5672530191ad3212cb12`.
Later documentation-only tar revisions must be identified separately; these
browser results belong to this exact functional candidate and its runtime files.

`scripts/verify-chat-package.mjs` makes the installed SSR/CSS/type checks
repeatable through `npm run verify:package`. The default Vite development and
production browser matrix was additionally exercised against independently
installed consumers without aliases, deduplication or optimizer workarounds.

## Pixel comparison contract

The eleven references cover keyboard normal/hover/pressed/locked, editor
normal/hover, settings shell and toggle off/on normal/hover. They contain 66,540
complete pixels at scale 1. Expected planes were independently calculated from
original source bytes and frozen **before** browser measurement. The tests use
no masks, cropping within a target plane, color tolerance or browser-generated
goldens. See [frozen reference protocol](../tests/fixtures/chat-materials/README.md).

Declared material isolation preserves layout: editor measurement hides only the
send sibling paint, retaining its 50-unit flow box and -20-unit offset; shell
measurement hides title/close/scroller paint. Toggle measurements use the
natural source shell backing. Full natural showcase screenshots are separate.
This is not native full-GUI, font, arbitrary scale or global pixel certification.

## Corrections and retained failures

- Controlled drafts now synchronize selection even when text/revision are
  unchanged, and restore rejected edits. Programmatic collapsed selection uses
  the browser's actual normalized direction.
- Native form reset is observed in capture, respects late `preventDefault()`
  and survives `stopPropagation()` without fabricated input or send requests.
- A valid extreme host revision previously exhausted a shared counter and broke
  other sessions. Actual browser `revision-limit-01` failed both cases;
  `revision-limit-02` passed both after switching to lazy 128-bit Web Crypto
  nonces. Tokens are probabilistic opaque identities, not ordering/security
  tokens. Current accepted/live/history tokens are excluded; a repeating or
  missing provider fails explicitly without poisoning another instance.
- Iframe portal commits previously moved internal focus and failed return focus.
  `portal-01` retained two failures; the same three `portal-02` checks passed
  after owner-document realm guards. A persistent regression now covers this.
- The first material harness had two hover timeouts because it aimed at
  noninteractive artwork under a native checkbox. The corrected harness hovers
  the actual control; all eleven expected planes and hashes were unchanged.
- The first root harness issued Escape before disclosure-open commit and used
  the wrong typeface selector. The corrected harness changed observation
  timing/selectors, retaining the first report.
- Early installed consumer fixtures incorrectly spread Screen-only fields into
  Composer. Development browsers reported React warnings. The corrected typed
  consumer passes only Composer inputs; qualification-03 failures remain and
  qualification-04 includes actual consumer SSR and DOM-field leakage checks.
- The first public demo failed when a visible dynamic glyph had no supplied
  image. All 14 demo entries now hide absent glyphs. Controlled checkbox checks
  also wait for the final host commit rather than an immediate native toggle.
- The new open-screen Axe scan found the demo's visible “返回” label absent
  from its “关闭聊天” accessible name. The host label now reads “返回，关闭聊天”;
  the subsequent scoped three-state scan passes. Demo part headings now follow
  the parent section heading; the final production scan reports zero violations.

## Broad regression limits

The separate existing-component regression batch ran 93 tests: **90 passed,
1 device-condition skip, 2 failed**. The font check failed because its global
`h1` locator matched four existing headings; an exact hero locator subsequently
passed the single-case recheck. This is not a claim of a fresh 93-test green run.

The full-showcase Axe check still reports four rules / 43 targets: document tab
relationships, contrast, and visible/accessibility name mismatches. None targets
Chat, which was present in the scanned DOM. Thirty related component/demo source
files match the previous public commit after newline normalization, but the old
commit was not re-run in a browser; global cascade or resource effects have not
been excluded for contrast. The page assertion failed before that test's later
world-dialog scan ran. Full-site accessibility remains unfinished. Detailed
targets are retained in `.cache/chat-resume-review-01/phase02-axe/`.

Commands, clipboard, TTS, filtering, social/network services, physical gamepad
events and the native hurt lifecycle are host integrations. Mounted DOM
composition tests are not OS IME candidate-window acceptance. Large demo bundles
still produce Vite's chunk-size advisory. No npm registry publication is claimed.
