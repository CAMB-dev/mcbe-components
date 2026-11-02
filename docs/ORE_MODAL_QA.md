# Modern Ore modal primitives

`OreModal`, `OreModalHeader`, `OreModalContent`, `OreModalText` and
`OreModalActions` separate the modern `$E` modal's reusable parts. They belong
to the OreUI profile, independently of the existing Classic `Dialog`.
The gallery entry is `#ore-modals`. Import `mcbeui/ore-modal.css` or the unified
styles. Source colors and dimensions describe the inspected installed version,
not a promise of universal Bedrock or native pixel equivalence.

```tsx
import {useRef, useState} from 'react';
import {OreModal, OreModalHeader, OreModalContent, OreModalText,
  OreModalActions, OreButton} from 'mcbeui';
import 'mcbeui/ore-modal.css';

function Example({closeIcon}) {
  const [open, setOpen] = useState(false);
  const cancel = useRef<HTMLButtonElement>(null);
  return <>
    <button onClick={() => setOpen(true)}>Open</button>
    <OreModal open={open} label="Discard changes?" guiScale={2}
      width={400} height={300} initialFocusRef={cancel}
      onDismissRequest={() => setOpen(false)}>
      <OreModalHeader closeIcon={closeIcon} closeLabel="Close"
        onClose={() => {}}>Discard changes?</OreModalHeader>
      <OreModalContent>
        <OreModalText center>Continue editing or discard this draft.</OreModalText>
      </OreModalContent>
      <OreModalActions>
        <OreButton variant="primary" onClick={() => setOpen(false)}>
          Continue editing
        </OreButton>
        <OreButton ref={cancel} onClick={() => setOpen(false)}>Discard</OreButton>
      </OreModalActions>
    </OreModal>
  </>;
}
```

The example owns state and actions. A dismissal request does not change `open`.
`escape`, `close` and `backdrop` are requests the host can decline. The separate
`native-close` reason reports an already completed platform or imperative
closure; it cannot be vetoed. Repeated close requests can become non-cancelable
under the browser's [CloseWatcher rules](https://html.spec.whatwg.org/multipage/interaction.html#close-requests-and-close-watchers).
The component releases that modal's ownership and does not reopen it while the
host still passes `open=true`. To open it again, commit `open=false`, then true.
Normal prop-driven closing and unmounting do not emit a duplicate dismissal.
The native dialog ref refers to the actual `HTMLDialogElement`. `showModal`,
background inertness, explicit Tab boundary cycling, initial focus, Escape and returning
focus to the opener are explicit Web behavior. They do not reconstruct the
game's modal provider, controller focus aliases or narration services. Server
rendering retains closed dialog markup and performs no modal, focus or service
operations.

The panel uses a regular `.2rem` border and source maximum width `47.6rem`,
with no invented panel background. The source wrapper centers it and adds
`1.2rem` vertical padding. Width and height configure the panel; the Web unit
remains `5 × guiScale` CSS pixels. The top layer and backdrop are implemented
with the browser's dialog facilities. The black backdrop has source opacity
`.7`. Clicking it does not dismiss by default; `closeOnBackdrop` is an explicit
host option. No whole-screen capture or captured geometry is a renderer input.

Header slots remain `4 × 4.8rem` even when empty. The flat close button is
`4 × 4rem` with `.4rem` vertical margins and a `1.4rem` host icon. Its normal,
hover and pressed colors are `#48494a`, `#58585a` and `#313233`. It uses no
raised-button base. `lastInputGamepad` controls the source close-button gate;
touch input alone does not hide the button. The host supplies its accessible
label and complete icon node. Original private icon/font binaries are neither
redrawn nor included in the library.

Header title typography is Seven v2, `1.6rem / 2rem` with `.04rem` tracking.
The neutral header includes source specular edges and a `.2rem` shadow strip
in layout. Body content has the separate neutral80 background `#313233`.
`OreModalText` uses the source captionLong **locale-specific Noto** family,
`1.4rem / 2rem` with `.04rem` tracking and `1.6rem` padding. It does not use
Seven or Ten as its default first font. Centered body copy is an explicit
option, as in the three inspected server-form modal routes.

`OreModalActions` defaults to vertically stacked controls with `1.6rem`
padding and `.4rem` spacing. Its neutral background and only top/bottom bevels
are separate from the panel's regular border. `OreButton` supplies the actual
button states. The action region and header remain outside the content region.

Per the requested sizing behavior, `OreModalContent` defaults to **clipping**
overflow. This deliberately differs from the source's default scrollable
content. Explicit `scrollable` enables the existing shared Ore custom scroll
area; the native browser scrollbar remains hidden. Provide `scrollLabel` for
that region. Mouse/touch scrollbar handling is separate from the gamepad gate.
The shared Web scroller does not implement engine empty-focus aliases or
narration delegates. Keyboard focus indicators and forced-color adaptations
are Web accommodations.

The Add/Edit unsaved, Delete and Error routes are host compositions. Add's
unsaved primary action resumes editing; it does not save. Default secondary
focus does not reorder buttons. Persistence, validation services, deleting
records, network joins and gamepad event routing remain host responsibilities.
The gallery copy is host-written Chinese text and reports local action intents.

## Verification

The source Chromium desktop / Pixel 7 emulation projects passed 72 checks: 30 new modal project
entries (including two SSR checks), 28 existing server-form checks and 14
existing text-field checks. All 72 Node checks passed separately. The full
build, strict TypeScript and actual React 18.3.1 / 19.3.1 packed consumers
passed for all 219 components / 237 runtime exports. The new family passed
33 installed SSR groups and 16 strict negative-type contracts on each peer.
The source closure contains 176 modules and the same 692 original-byte asset
references; this family adds no original binary assets.

Fresh independent default Vite projects passed in development and production
on both peers. They verified real dialog/panel/control refs, exact configured
panel size, clipping, explicit custom scrolling, keyboard requests and focus
return, forced colors, and unchanged delivered host icon bytes. No source
aliases or filesystem allow-list overrides were used.

The original browser phase retained six failures: two missing-icon SSR fixture
cases and Tab/cancel timing issues on both profiles. The next phase fixed Tab
and late cancellation but exposed the browser's non-cancelable repeated close.
The final phase verifies the explicit `native-close` contract, owner release
and reopening boundary. Original failure logs and traces remain preserved;
no source palette, CSS geometry, pixel mask or tolerance was changed to pass.
Installed diagnostic phases also retain an HTTP-only harness failing on Vite's
inlined data URL and an assertion reading a deferred callback too early. The
final four-combination run verifies decoded transport bytes and waits for the
observed callback and committed React state.

The final built main gallery passed eight desktop/emulated-phone checks.
Six further built-gallery screenshots cover all three routes on both profiles;
the declared original Seven and Noto SC fonts loaded, and computed header/body
sizes were respectively 16/14 CSS pixels at the explicit scale-2 Web profile.
These are browser layout/appearance checks, not a native modal comparison or
a physical-phone, screen-reader or operating-system IME certification.

There is no native full-modal pixel qualification. The existing modern
server-page strict mismatch remains; see [the server-form report](ORE_EXTERNAL_SERVER_QA.md).
